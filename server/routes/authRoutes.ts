import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UsersRepo, StoreRepo, AuditRepo, enforcePlanLimits } from '../db';
import { authenticateToken, requireRole, generateToken, AuthRequest } from '../auth';
import { cache } from '../cache';
import { emitUserSuspended, emitUserActivated, emitUserUpdated } from '../socket';

export const authRouter = Router();

const loginAttempts: Map<string, { count: number; resetTime: number }> = new Map();

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 15 * 60 * 1000 });
    return true;
  }
  if (record.count >= 30) {
    return false;
  }
  record.count += 1;
  return true;
}

authRouter.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (!checkLoginRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Too many login attempts. Please wait 15 minutes before trying again.',
      });
    }

    const { number, phone, identifier: rawIdentifier, email, password } = req.body;
    const identifier = (number || phone || rawIdentifier || email || '').toString().trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter both mobile number and password.' });
    }

    const user = await UsersRepo.findByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    const isPlatformAdmin = user.role === 'SuperAdmin' || user.role === 'Admin';

    if (user.status === 'suspended' || user.status === 'inactive') {
      return res.status(403).json({
        error: 'Your user account has been deactivated or suspended. Please contact administrator.',
        code: 'USER_SUSPENDED',
      });
    }

    if (!isPlatformAdmin) {
      const store = await StoreRepo.getStore(user.storeId);
      if (store && store.status === 'suspended') {
        return res.status(403).json({
          error: 'Your store account has been suspended. Please contact support.',
          code: 'ACCOUNT_SUSPENDED',
        });
      }
    }

    let passwordMatches = false;
    const userPass = user.passwordHash || (user as any).password;
    if (password && userPass) {
      passwordMatches = await bcrypt.compare(password, userPass);
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    await UsersRepo.update(user.storeId, user._id, { lastLogin: new Date().toISOString() });

    const token = generateToken(user);

    await AuditRepo.log({
      storeId: user.storeId,
      userId: user._id,
      userName: user.name,
      action: 'LOGIN',
      details: `User logged in to store ${user.storeId} with role ${user.role}`,
    });

    const { passwordHash: _, pinHash: __, ...safeUser } = user;
    return res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

authRouter.get('/me', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { passwordHash: _, pinHash: __, ...safeUser } = req.user;
  return res.json({ user: safeUser });
});

authRouter.get(
  '/users',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Manager']) as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const isPlatformAdmin = req.user?.role === 'SuperAdmin' || req.user?.role === 'Admin';
      let storeId = req.user?.storeId;
      if (!storeId && isPlatformAdmin) {
        const allStores = await StoreRepo.getAllStores();
        if (allStores.length > 0) storeId = allStores[0]._id;
      }

      if (!storeId) {
        return res.json({ users: [] });
      }

      const users = await cache.getOrSet(`users:${storeId}`, () => UsersRepo.getAll(storeId), 60000);
      return res.json({ users });
    } catch {
      return res.status(500).json({ error: 'Failed to retrieve staff list.' });
    }
  }
);

authRouter.post(
  '/users',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Owner']) as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const { name, email, password, pin, role, permissions, phone, number } = req.body;

      const staffName = (name || '').trim();
      const staffPhone = (phone || number || '').toString().trim();
      const staffRole = role || 'Cashier';

      if (!staffName) {
        return res.status(400).json({ error: 'Staff name is required.' });
      }
      if (!staffPhone && !email) {
        return res.status(400).json({ error: 'Staff phone number is required.' });
      }

      const limitCheck = await enforcePlanLimits(storeId, 'staff');
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: limitCheck.message,
          code: 'PLAN_LIMIT_REACHED',
          limit: limitCheck.limit,
          current: limitCheck.current,
        });
      }

      const cleanPhone = staffPhone.replace(/\D/g, '');
      const staffEmail = (email && email.trim()) || (cleanPhone ? `${cleanPhone}@shoppos.com` : `staff_${Date.now()}@shoppos.com`);

      const storeUsers = await UsersRepo.getAll(storeId);
      if (cleanPhone && storeUsers.some((u) => u.phone && u.phone.replace(/\D/g, '') === cleanPhone)) {
        return res.status(400).json({ error: 'A staff member with this phone number already exists.' });
      }

      if (staffEmail && storeUsers.some((u) => u.email && u.email.toLowerCase() === staffEmail.toLowerCase())) {
        return res.status(400).json({ error: 'A staff member with this account email/phone already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password || '123456', salt);
      const pinHash = await bcrypt.hash((pin || '1234').toString().trim(), salt);

      const defaultPerms =
        staffRole === 'SuperAdmin' || staffRole === 'Admin'
          ? [
              'pos.checkout',
              'pos.discount',
              'products.create',
              'products.edit',
              'products.delete',
              'products.stock',
              'sales.view',
              'sales.refund',
              'staff.manage',
              'settings.update',
              'stores.switch',
            ]
          : staffRole === 'Manager'
          ? [
              'pos.checkout',
              'pos.discount',
              'products.create',
              'products.edit',
              'products.stock',
              'sales.view',
              'sales.refund',
            ]
          : ['pos.checkout', 'sales.view'];

      const newUser = await UsersRepo.create({
        storeId,
        name: staffName,
        email: staffEmail,
        passwordHash,
        pinHash,
        role: staffRole,
        permissions: permissions && permissions.length > 0 ? permissions : defaultPerms,
        phone: staffPhone || '',
        status: 'active',
      });

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'CREATE_USER',
        details: `Created new staff "${newUser.name}" with role "${staffRole}" (Phone: ${staffPhone || 'N/A'}) in store ${storeId}`,
      });

      cache.invalidateUsers(storeId);
      const { passwordHash: _, pinHash: __, ...safeUser } = newUser;
      return res.status(201).json({ success: true, user: safeUser });
    } catch (err) {
      console.error('Create user error:', err);
      return res.status(500).json({ error: 'Failed to create user.' });
    }
  }
);

authRouter.put(
  '/users/:id',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Owner']) as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;
      const { name, role, permissions, status, pin, password, phone, number } = req.body;

      const existing = await UsersRepo.findById(targetId);
      if (!existing || existing.storeId !== storeId) {
        return res.status(404).json({ error: 'User not found in this store.' });
      }

      const store = await StoreRepo.getStore(storeId);
      const isOwner =
        existing.role === 'Owner' ||
        existing.role === 'SuperAdmin' ||
        (store && (store.ownerId === targetId || store.phone === existing.phone));

      const updates: any = {};
      if (name) updates.name = name.trim();
      if (role && !isOwner) updates.role = role;
      if (permissions && !isOwner) updates.permissions = permissions;
      if (status && !isOwner) updates.status = status;

      // Store Owner phone number can NEVER be changed
      if (!isOwner && (phone !== undefined || number !== undefined)) {
        updates.phone = (phone || number || '').toString().trim();
      }

      const salt = await bcrypt.genSalt(10);
      if (password) {
        updates.passwordHash = await bcrypt.hash(password, salt);
      }
      if (pin) {
        updates.pinHash = await bcrypt.hash(pin.toString().trim(), salt);
      }

      const updated = await UsersRepo.update(storeId, targetId, updates);
      if (!updated) {
        return res.status(404).json({ error: 'User could not be updated.' });
      }

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'UPDATE_USER',
        targetStoreId: storeId,
        targetUserId: targetId,
        details: `Updated staff "${updated.name}" (${updated.role}) in store ${storeId}`,
      });

      if (status && status !== existing.status) {
        if (status === 'active') {
          emitUserActivated(targetId, storeId);
        } else {
          emitUserSuspended(targetId, storeId, 'Your staff account has been suspended.');
        }
      }

      if (role || permissions) {
        emitUserUpdated(targetId, storeId, {
          _id: targetId,
          role: updated.role,
          permissions: updated.permissions,
          name: updated.name,
          email: updated.email,
        });
      }

      cache.invalidateUsers(storeId);
      const { passwordHash: _, pinHash: __, ...safeUser } = updated;
      return res.json({ success: true, user: safeUser });
    } catch {
      return res.status(500).json({ error: 'Failed to update user.' });
    }
  }
);

authRouter.delete(
  '/users/:id',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Owner']) as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;

      if (targetId === req.user!._id) {
        return res.status(400).json({ error: 'You cannot delete your own account.' });
      }

      const target = await UsersRepo.findById(targetId);
      if (!target || target.storeId !== storeId) {
        return res.status(404).json({ error: 'User not found in this store.' });
      }

      const store = await StoreRepo.getStore(storeId);
      const isOwner =
        target.role === 'Owner' ||
        target.role === 'SuperAdmin' ||
        (store && (store.ownerId === targetId || store.phone === target.phone));

      if (isOwner) {
        return res.status(403).json({ error: 'Owner account cannot be deleted.' });
      }

      const deleted = await UsersRepo.delete(storeId, targetId);
      if (!deleted) {
        return res.status(404).json({ error: 'User could not be deleted.' });
      }

      cache.invalidateUsers(storeId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'DELETE_USER',
        details: `Deleted staff member "${target.name}" from store ${storeId}`,
      });

      return res.json({ success: true, message: 'User deleted.' });
    } catch {
      return res.status(500).json({ error: 'Failed to delete user.' });
    }
  }
);

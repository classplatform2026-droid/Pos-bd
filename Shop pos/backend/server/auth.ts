import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserDoc, UsersRepo, StoreDoc, StoreRepo } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'shoppos_production_jwt_secret_key_884920';

export interface AuthRequest extends Request {
  user?: UserDoc;
  storeId?: string;
  store?: StoreDoc;
}

export function generateToken(user: UserDoc): string {
  const uid = user._id ? user._id.toString() : (user.id || '');
  const sId = user.storeId ? user.storeId.toString() : '';
  return jwt.sign(
    {
      id: uid,
      userId: uid,
      sub: uid,
      storeId: sId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.id || decoded.userId || decoded.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token: User ID missing.' });
    }

    let user = await UsersRepo.findById(userId);
    if (!user && decoded.email) {
      user = await UsersRepo.findByEmail(decoded.email);
    }
    if (!user && (decoded.phone || decoded.number)) {
      user = await UsersRepo.findByIdentifier(decoded.phone || decoded.number);
    }
    if (!user && (decoded.role === 'SuperAdmin' || decoded.id === 'usr_admin' || userId === 'usr_admin')) {
      user = await UsersRepo.findByEmail('admin@shoppos.com');
    }

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.', code: 'USER_NOT_FOUND' });
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      return res.status(403).json({
        error: 'Your account has been deactivated or suspended. Please contact administrator.',
        code: 'USER_SUSPENDED',
      });
    }

    const isPlatformAdmin = user.role === 'SuperAdmin' || user.role === 'Admin';
    let store = user.storeId ? await StoreRepo.getStore(user.storeId) : null;
    if (!store && isPlatformAdmin) {
      const all = await StoreRepo.getAllStores();
      if (all.length > 0) store = all[0];
    }

    if (!isPlatformAdmin) {
      if (!store) {
        return res.status(401).json({ error: 'Store not found or no longer active.', code: 'STORE_NOT_FOUND' });
      }

      if (store.status === 'suspended') {
        return res.status(403).json({
          error: 'Your store account has been suspended. Please contact support.',
          code: 'ACCOUNT_SUSPENDED',
        });
      }
    }

    req.user = user;
    req.storeId = user.storeId || (store ? store._id : '');
    if (store) req.store = store;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token.', code: 'UNAUTHORIZED' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Authentication required.', code: 'UNAUTHORIZED' });
  }

  const role = (req.user.role || '').toLowerCase();
  if (role !== 'superadmin' && role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden. Administrator or SuperAdmin privileges required.',
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
}

export function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const isPlatformAdmin = req.user?.role === 'SuperAdmin' || req.user?.role === 'Admin';
  if (isPlatformAdmin) {
    return next();
  }

  if (!req.store) {
    return res.status(401).json({ error: 'Store context required.', code: 'STORE_REQUIRED' });
  }

  const sub = req.store.subscription;
  if (!sub) {
    return next();
  }

  const isExpired =
    sub.status === 'expired' ||
    sub.status === 'cancelled' ||
    sub.status === 'pending' ||
    (sub.expiryDate && new Date(sub.expiryDate).getTime() < Date.now());

  if (isExpired) {
    const statusText = sub.status === 'cancelled' ? 'cancelled' : sub.status === 'pending' ? 'pending approval' : 'expired';
    return res.status(403).json({
      error: `Your subscription is ${statusText}. Please renew or activate your plan to continue.`,
      code: 'SUBSCRIPTION_EXPIRED',
      subscription: {
        ...sub,
        status: sub.status === 'cancelled' ? 'cancelled' : sub.status === 'pending' ? 'pending' : 'expired',
      },
    });
  }

  next();
}

export function requireRole(allowedRoles: Array<'SuperAdmin' | 'Admin' | 'Manager' | 'Cashier' | 'Owner' | string>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const currentRole = (req.user.role || '').toLowerCase();
    if (currentRole === 'superadmin' || currentRole === 'owner') {
      return next();
    }

    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    if (!normalizedAllowed.includes(currentRole)) {
      return res.status(403).json({
        error: `Access denied. Requires one of: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const currentRole = (req.user.role || '').toLowerCase();
    if (currentRole === 'superadmin' || currentRole === 'owner' || currentRole === 'admin') {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: `Permission denied. Missing required permission: "${permission}".`,
      });
    }

    next();
  };
}

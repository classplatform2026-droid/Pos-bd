import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  StoreRepo,
  UsersRepo,
  AuditRepo,
  PlansRepo,
  PaymentsRepo,
  SupportRepo,
  PlatformSettingsRepo,
  SYSTEM_FEATURE_DEFINITIONS,
  enforcePlanLimits,
} from '../db';
import { authenticateToken, requireAdmin, AuthRequest, generateToken } from '../auth';
import { emitTicketUpdated, emitStoreUpdated, emitFeaturesUpdated } from '../socket';
import { cache } from '../cache';

export const adminRouter = Router();

adminRouter.use(authenticateToken as any, requireAdmin as any);

adminRouter.get('/metrics', async (_req: AuthRequest, res: Response) => {
  try {
    const data = await cache.getOrSet('admin:metrics', async () => {
      const stores = await StoreRepo.getAllStores();
      const payments = await PaymentsRepo.getAll();
      const supportTickets = await SupportRepo.getAll();

      const pendingPayments = payments.filter((p) => p.status === 'pending');
      const approvedPayments = payments.filter((p) => p.status === 'approved');
      const openTicketsCount = supportTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

      const activeCount = stores.filter((s) => s.status === 'active').length;
      const suspendedCount = stores.filter((s) => s.status === 'suspended').length;

      const totalShopsActual = stores.length;
      const activeShopsActual = activeCount;

      const calculatedRevenue = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const monthlyRevenue = calculatedRevenue > 0 ? calculatedRevenue : stores.reduce((sum, s) => sum + (Number(s.subscription?.amount) || 0), 0);
      const pendingPaymentsCount = pendingPayments.length;

      const recentShopsRaw = stores.slice(0, 5);
      const ownerIds = [...new Set(recentShopsRaw.map((s) => s.ownerId).filter(Boolean))];
      const owners = await UsersRepo.findByIds(ownerIds);
      const ownerMap = new Map(owners.map((o) => [o._id, o]));

      const recentShops = recentShopsRaw.map((st) => {
        const owner = st.ownerId ? ownerMap.get(st.ownerId) : null;
        return {
          id: st._id,
          name: st.name,
          owner: owner?.name || 'Store Owner',
          plan: st.subscription?.plan || 'Pro',
          status: st.status,
          created: st.createdAt
            ? new Date(st.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
            : 'Oct 02, 2026',
        };
      });

      const pendingList = pendingPayments.slice(0, 5).map((p) => ({
        id: p._id,
        shop: p.storeName || 'Shop',
        amount: `৳ ${p.amount}`,
        rawAmount: p.amount,
        method: p.method,
        status: p.status,
        date: new Date(p.submittedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        transactionId: p.transactionId,
      }));

      return {
        success: true,
        stats: {
          totalShops: totalShopsActual,
          totalShopsActual,
          totalShopsGrowth: '+8.4%',
          activeShops: activeShopsActual,
          activeShopsActual,
          activeShopsGrowth: '+6.2%',
          suspendedShops: suspendedCount,
          monthlyRevenue,
          monthlyRevenueFormatted: `৳ ${monthlyRevenue.toLocaleString()}`,
          monthlyRevenueGrowth: '+12.9%',
          pendingPayments: pendingPaymentsCount,
          pendingLabel: pendingPaymentsCount > 0 ? 'Needs review' : 'All clear',
          openTickets: openTicketsCount,
        },
        recentShops,
        pendingPayments: pendingList,
      };
    }, 30000);

    return res.json(data);
  } catch (err) {
    console.error('Failed to load admin metrics:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin dashboard metrics.' });
  }
});

adminRouter.get('/system/cache-status', async (_req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    cache: cache.getStats(),
  });
});

adminRouter.post('/system/cache-clear', async (_req: AuthRequest, res: Response) => {
  cache.clear();
  return res.json({
    success: true,
    message: 'All in-memory caches have been successfully purged. Fresh data will reload from MongoDB.',
    cache: cache.getStats(),
  });
});

adminRouter.get('/stores', async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, plan, search } = req.query;
    const enriched = await cache.getOrSet('admin:stores:enriched', async () => {
      const stores = await StoreRepo.getAllStores();
      const ownerIds = [...new Set(stores.map((s) => s.ownerId).filter(Boolean))];
      const owners = await UsersRepo.findByIds(ownerIds);
      const ownerMap = new Map(owners.map((o) => [o._id, o]));

      return stores.map((s) => {
        const owner = s.ownerId ? ownerMap.get(s.ownerId) : null;
        return {
          ...s,
          ownerName: owner?.name || 'Shop Owner',
          ownerEmail: owner?.email || '',
        };
      });
    }, 45000);

    let filtered = enriched;
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ownerName.toLowerCase().includes(q) ||
          (s.branch && s.branch.toLowerCase().includes(q)) ||
          s.phone.includes(q)
      );
    }

    if (status && status !== 'all' && status !== 'All Status') {
      filtered = filtered.filter((s) => s.status.toLowerCase() === (status as string).toLowerCase());
    }

    if (type && type !== 'all' && type !== 'All Types') {
      filtered = filtered.filter((s) => s.storeType.toLowerCase() === (type as string).toLowerCase());
    }

    if (plan && plan !== 'all' && plan !== 'All Plans') {
      filtered = filtered.filter((s) => {
        const p = s.subscription?.plan || '';
        return p.toLowerCase().includes((plan as string).toLowerCase());
      });
    }

    return res.json({
      success: true,
      total: enriched.length,
      count: filtered.length,
      stores: filtered,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve shops list.' });
  }
});

adminRouter.get('/stores/:storeId', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const details = await cache.getOrSet(`store:details:${storeId}`, async () => {
      return await StoreRepo.getStoreWithDetails(storeId);
    }, 45000);

    if (!details) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    return res.json({ success: true, ...details });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve shop details.' });
  }
});

adminRouter.post('/stores', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      branch,
      storeType,
      phone,
      address,
      tagline,
      currency,
      taxRate,
      receiptFooter,
      printerSize,
      ownerName,
      ownerPhone,
      ownerEmail,
      ownerPassword,
      pin,
      plan,
      billingCycle,
      seedProducts,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Shop name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Shop phone number is required.' });
    }
    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({ error: 'Owner name is required.' });
    }

    const cleanOwnerPhone = (ownerPhone || phone).toString().trim();
    if (!cleanOwnerPhone) {
      return res.status(400).json({ error: 'Owner mobile number is required for login.' });
    }

    // Check if phone already registered
    const existingUserByPhone = await UsersRepo.findByIdentifier(cleanOwnerPhone);
    if (existingUserByPhone) {
      return res.status(400).json({
        error: `A user account with mobile number "${cleanOwnerPhone}" already exists. Please use a different number.`,
      });
    }

    // If owner email provided, check duplicate
    if (ownerEmail && ownerEmail.trim()) {
      const existingUserByEmail = await UsersRepo.findByEmail(ownerEmail.trim());
      if (existingUserByEmail) {
        return res.status(400).json({ error: `A user with email "${ownerEmail.trim()}" already exists.` });
      }
    }

    const defaultPassword = (ownerPassword && ownerPassword.trim()) ? ownerPassword.trim() : '123456';
    const defaultPin = (pin && pin.trim()) ? pin.trim() : '1234';

    const result = await StoreRepo.createStoreWithAdmin({
      name: name.trim(),
      branch: branch ? branch.trim() : 'Main Branch',
      storeType: storeType || 'grocery',
      phone: phone.trim(),
      address: address ? address.trim() : 'Dhaka, Bangladesh',
      tagline: tagline ? tagline.trim() : 'Retail POS Store',
      currency: currency || '৳',
      taxRate: taxRate !== undefined ? Number(taxRate) : (storeType === 'grocery' ? 0 : 5),
      receiptFooter: receiptFooter ? receiptFooter.trim() : undefined,
      printerSize: printerSize === '58mm' ? '58mm' : '80mm',
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail ? ownerEmail.trim() : undefined,
      ownerPhone: cleanOwnerPhone,
      ownerPassword: defaultPassword,
      pin: defaultPin,
      plan: plan || 'Pro',
      billingCycle: billingCycle || 'monthly',
      seedProducts: seedProducts !== false,
    });

    await AuditRepo.log({
      storeId: result.store._id,
      userId: req.user?._id || 'admin_console',
      userName: req.user?.name || 'Admin Manager',
      action: 'CREATE_SHOP',
      details: `Created new shop ${result.store.name} (${result.store._id}) for owner ${result.owner.name} (${result.owner.phone})`,
    });

    cache.invalidateStores();

    return res.json({
      success: true,
      message: `Shop "${result.store.name}" created successfully.`,
      store: result.store,
      owner: result.owner,
      credentials: {
        shopId: result.store._id,
        shopName: result.store.name,
        branch: result.store.branch,
        ownerName: result.owner.name,
        loginPhone: result.owner.phone,
        loginPassword: defaultPassword,
        pin: defaultPin,
        plan: result.store.subscription?.plan || 'Pro',
      },
    });
  } catch (err) {
    console.error('Failed to create shop:', err);
    return res.status(500).json({ error: (err as Error).message || 'Failed to create shop.' });
  }
});

adminRouter.post('/stores/:storeId/impersonate', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const store = await StoreRepo.getStore(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const allUsers = await UsersRepo.getAll(storeId);
    const owner = (await UsersRepo.findById(store.ownerId)) || allUsers.find((u) => u.role === 'Owner' || u.role === 'SuperAdmin');
    if (!owner) {
      return res.status(404).json({ error: 'Owner account not found for this store.' });
    }

    const token = generateToken(owner as any);
    const { passwordHash: _, pinHash: __, ...safeUser } = owner as any;

    return res.json({
      success: true,
      token,
      user: safeUser,
      store,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message || 'Failed to switch into store session.' });
  }
});

adminRouter.post('/stores/:storeId/suspend', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const { reason } = req.body;

    const store = await StoreRepo.getStore(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const updated = await StoreRepo.suspendStore(
      storeId,
      reason || 'Your account has been suspended by the administrator.',
      adminUser
    );

    cache.invalidateStores(storeId);

    return res.json({
      success: true,
      message: `Store ${store.name} has been suspended. Affected owner/staff are logged out in realtime.`,
      store: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to suspend store.' });
  }
});

adminRouter.post('/stores/:storeId/activate', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const store = await StoreRepo.getStore(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const updated = await StoreRepo.activateStore(storeId, adminUser);
    cache.invalidateStores(storeId);

    return res.json({
      success: true,
      message: `Store ${store.name} has been activated.`,
      store: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to activate store.' });
  }
});

adminRouter.post('/stores/:storeId/plan', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const { plan, planId } = req.body;
    if (!plan) return res.status(400).json({ error: 'Plan name is required.' });

    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const updated = await StoreRepo.changePlan(storeId, plan, planId, adminUser);
    if (!updated) return res.status(404).json({ error: 'Store not found.' });

    cache.invalidateStores(storeId);
    cache.invalidatePayments();

    return res.json({
      success: true,
      message: `Plan changed to ${plan} for ${updated.name}. Limits updated and broadcasted.`,
      store: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to update store plan.' });
  }
});

adminRouter.post('/stores/:storeId/subscription-status', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const { status } = req.body;
    if (!status || !['active', 'pending', 'expired', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required: active, pending, expired, cancelled.' });
    }

    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const updated = await StoreRepo.changeSubscriptionStatus(storeId, status, adminUser);
    if (!updated) return res.status(404).json({ error: 'Store not found.' });

    cache.invalidateStores(storeId);

    return res.json({
      success: true,
      message: `Subscription status for "${updated.name}" set to "${status}".`,
      store: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to update subscription status.' });
  }
});

adminRouter.put('/stores/:storeId', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const { name, branch, phone, address, storeType } = req.body;

    const existing = await StoreRepo.getStore(storeId);
    if (!existing) return res.status(404).json({ error: 'Store not found.' });

    const updated = await StoreRepo.updateStore(storeId, {
      name: name ?? existing.name,
      branch: branch ?? existing.branch,
      phone: phone ?? existing.phone,
      address: address ?? existing.address,
      storeType: storeType ?? existing.storeType,
    });

    cache.invalidateStores(storeId);

    return res.json({
      success: true,
      message: `Shop "${updated?.name}" details updated successfully.`,
      store: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to update shop details.' });
  }
});

adminRouter.post('/stores/:storeId/extend-subscription', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const days = Number(req.body.days) || 30;

    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const updated = await StoreRepo.extendSubscription(storeId, days, adminUser);
    if (!updated) return res.status(404).json({ error: 'Store not found.' });

    cache.invalidateStores(storeId);
    cache.invalidatePayments();

    return res.json({
      success: true,
      message: `Subscription extended by ${days} days for ${updated.name}.`,
      store: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to extend subscription.' });
  }
});

adminRouter.delete('/stores/:storeId', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const { adminPassword } = (req.body || {}) as { adminPassword?: string };

    // If an admin password is provided, verify it against the logged-in admin user
    if (adminPassword) {
      const adminUser = req.user;
      if (adminUser) {
        const storedHash = adminUser.passwordHash;
        const storedPass = adminUser.password;
        let passwordMatches = false;
        if (storedHash) {
          passwordMatches = await bcrypt.compare(adminPassword, storedHash);
        } else if (storedPass) {
          passwordMatches = adminPassword === storedPass;
        }
        if (!passwordMatches) {
          return res.status(403).json({ error: 'Incorrect administrator password.' });
        }
      }
    }

    const store = await StoreRepo.getStore(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found.' });

    const deleted = await StoreRepo.deleteStore(storeId);
    if (!deleted) return res.status(500).json({ error: 'Failed to delete store.' });

    cache.invalidateStores();

    await AuditRepo.log({
      storeId: 'admin_console',
      adminId: req.user?._id || 'admin_console',
      userId: req.user?._id || 'admin_console',
      userName: req.user?.name || 'Super Admin',
      action: 'DELETE_STORE',
      targetStoreId: storeId,
      details: `Permanently deleted store "${store.name}" (ID: ${storeId}) and all associated records.`,
    });

    return res.json({
      success: true,
      message: `Store "${store.name}" and all associated data have been permanently deleted.`,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to delete store.' });
  }
});

adminRouter.post('/stores/:storeId/staff', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const { name, email, role, password, pin, phone } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required.' });
    }

    const store = await StoreRepo.getStore(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found.' });

    const limitCheck = await enforcePlanLimits(storeId, 'staff');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,
        code: 'PLAN_LIMIT_REACHED',
        limit: limitCheck.limit,
        current: limitCheck.current,
      });
    }

    const existing = await UsersRepo.findByEmail(email.trim());
    if (existing) return res.status(400).json({ error: 'A user with this email already exists.' });

    const defaultPermissions = role === 'Manager'
      ? ['pos.checkout', 'pos.discount', 'products.create', 'products.edit', 'products.stock', 'sales.view', 'sales.refund']
      : ['pos.checkout', 'sales.view'];

    const user = await UsersRepo.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'Cashier',
      password: password || '123456',
      passwordHash: password || '123456',
      pin: pin || '1234',
      phone: phone || '',
      status: 'active',
      storeId,
      permissions: defaultPermissions,
    });

    cache.invalidateUsers(storeId);

    return res.json({
      success: true,
      message: `Staff member "${name}" added to store "${store.name}".`,
      user,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to add staff member.' });
  }
});

adminRouter.patch('/stores/:storeId/staff/:userId/status', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, userId } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required: active, suspended, inactive.' });
    }

    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const updated = await UsersRepo.updateUserStatus(storeId, userId, status, adminUser);
    if (!updated) return res.status(404).json({ error: 'Staff member not found.' });

    cache.invalidateUsers(storeId);

    return res.json({
      success: true,
      message: `Staff member "${updated.name}" status changed to "${status}".`,
      user: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to update staff status.' });
  }
});

adminRouter.put('/stores/:storeId/staff/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, userId } = req.params;
    const { role, permissions } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required.' });
    }

    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const updated = await UsersRepo.updateUserRoleAndPermissions(
      storeId,
      userId,
      role,
      Array.isArray(permissions) ? permissions : ['pos.checkout', 'sales.view'],
      adminUser
    );

    if (!updated) return res.status(404).json({ error: 'Staff member not found.' });

    cache.invalidateUsers(storeId);

    return res.json({
      success: true,
      message: `Staff member "${updated.name}" role updated to "${role}".`,
      user: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to update staff role.' });
  }
});

adminRouter.get('/plans', async (_req: AuthRequest, res: Response) => {
  try {
    const data = await cache.getOrSet('admin:plans:all', async () => {
      const plans = await PlansRepo.getAll();
      const stores = await StoreRepo.getAllStores();

      const recentSubs = stores.map((s) => ({
        id: s._id,
        shop: s.name,
        plan: s.subscription?.plan || 'Pro',
        status: s.subscription?.status || 'active',
        expires: s.subscription?.expiryDate
          ? new Date(s.subscription.expiryDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
          : 'Oct 02, 2026',
      }));

      return {
        plans,
        recentSubscriptions: recentSubs,
      };
    }, 180000);

    return res.json({ success: true, ...data });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve plans.' });
  }
});

adminRouter.post('/plans', async (req: AuthRequest, res: Response) => {
  try {
    const { name, price, billingPeriod, staffLimit, productLimit, features } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Plan name and price are required.' });
    }

    const created = await PlansRepo.create({
      name,
      price: Number(price),
      billingPeriod: billingPeriod || 'month',
      status: 'active',
      staffLimit: staffLimit !== undefined ? Number(staffLimit) : 10,
      productLimit: productLimit !== undefined ? Number(productLimit) : 500,
      features: Array.isArray(features) ? features : ['POS Access'],
    });

    cache.invalidatePlans();
    return res.json({ success: true, plan: created });
  } catch {
    return res.status(500).json({ error: 'Failed to create plan.' });
  }
});

adminRouter.put('/plans/:planId', async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = req.params;
    const updated = await PlansRepo.update(planId, req.body);
    if (!updated) return res.status(404).json({ error: 'Plan not found.' });

    cache.invalidatePlans();
    return res.json({ success: true, plan: updated });
  } catch {
    return res.status(500).json({ error: 'Failed to update plan.' });
  }
});

adminRouter.delete('/plans/:planId', async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = req.params;
    const current = await PlansRepo.getById(planId);
    if (!current) return res.status(404).json({ error: 'Plan not found.' });

    // Check if any stores are actively using this plan
    const allStores = await StoreRepo.getAllStores();
    const usingStores = allStores.filter(
      (s) => (s.subscription?.plan || '').toLowerCase() === current.name.toLowerCase()
    );
    if (usingStores.length > 0) {
      return res.status(400).json({
        error: `Cannot delete plan "${current.name}" because it is currently assigned to ${usingStores.length} store(s). Please migrate those stores first.`,
      });
    }

    const success = await PlansRepo.delete(planId);
    if (!success) return res.status(500).json({ error: 'Failed to delete plan.' });

    cache.invalidatePlans();

    await AuditRepo.log({
      storeId: 'admin_console',
      adminId: req.user?._id || 'admin_console',
      userId: req.user?._id || 'admin_console',
      userName: req.user?.name || 'Super Admin',
      action: 'DELETE_PLAN',
      details: `Admin deleted subscription plan "${current.name}" (ID: ${planId})`,
    });

    return res.json({ success: true, message: `Plan "${current.name}" has been removed.` });
  } catch {
    return res.status(500).json({ error: 'Failed to delete plan.' });
  }
});

adminRouter.get('/payments', async (req: AuthRequest, res: Response) => {
  try {
    const { status, method, search } = req.query;
    const cacheKey = `admin:payments:${status || 'all'}:${method || 'all'}`;
    let list = await cache.getOrSet(cacheKey, async () => {
      return await PaymentsRepo.getAll({
        status: typeof status === 'string' && status !== 'all' ? status : undefined,
        method: typeof method === 'string' && method !== 'all' ? method : undefined,
      });
    }, 20000);

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.storeName.toLowerCase().includes(q) ||
          p.transactionId.toLowerCase().includes(q) ||
          (p.ownerName && p.ownerName.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, payments: list, total: list.length });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve payments.' });
  }
});

adminRouter.post('/payments', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, amount, method, transactionId, planName, status, notes, senderPhone } = req.body;
    if (!storeId || amount === undefined || !transactionId) {
      return res.status(400).json({ error: 'Store, amount, and transaction ID are required.' });
    }

    const store = await StoreRepo.getStore(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const allUsers = await UsersRepo.getAll(storeId);
    const owner = (await UsersRepo.findById(store.ownerId)) || allUsers.find((u) => u.role === 'Owner' || u.role === 'SuperAdmin');

    const payment = await PaymentsRepo.create({
      storeId,
      storeName: store.name,
      ownerName: owner?.name || 'Store Owner',
      ownerPhone: owner?.phone || store.phone,
      senderPhone: senderPhone || owner?.phone || store.phone,
      planName: planName || store.subscription?.plan || 'Standard',
      plan: planName || store.subscription?.plan || 'Standard',
      billingCycle: store.subscription?.billingCycle || 'monthly',
      transactionId: transactionId.trim(),
      amount: Number(amount) || 0,
      method: method || 'bKash',
      status: status || 'approved',
      submittedAt: new Date().toISOString(),
      notes: notes || 'Payment added by Admin',
    });

    if (payment.status === 'approved') {
      const adminUser = {
        id: req.user?._id || 'admin_console',
        name: req.user?.name || 'Admin Manager',
      };
      await PaymentsRepo.approve(payment._id, adminUser);
    }

    cache.invalidatePayments();
    cache.invalidateStores();

    return res.status(201).json({ success: true, payment });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to add payment.' });
  }
});

adminRouter.post('/payments/:paymentId/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const result = await PaymentsRepo.approve(paymentId, adminUser);
    if (!result.payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    cache.invalidatePayments();
    cache.invalidateStores();

    return res.json({
      success: true,
      message: `Payment ${result.payment.transactionId} approved successfully. Related shop subscription has been activated in realtime.`,
      payment: result.payment,
      store: result.store,
    });
  } catch (err) {
    console.error('Approve payment error:', err);
    return res.status(500).json({ error: 'Failed to approve payment.' });
  }
});

adminRouter.post('/payments/:paymentId/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const adminUser = {
      id: req.user?._id || 'admin_console',
      name: req.user?.name || 'Admin Manager',
    };

    const updated = await PaymentsRepo.reject(paymentId, reason, adminUser);
    if (!updated) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    cache.invalidatePayments();

    return res.json({
      success: true,
      message: `Payment ${updated.transactionId} was rejected.`,
      payment: updated,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to reject payment.' });
  }
});

adminRouter.get('/support', async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, search } = req.query;
    const cacheKey = `admin:support:${status || 'all'}:${priority || 'all'}`;
    let list = await cache.getOrSet(cacheKey, async () => {
      return await SupportRepo.getAll({
        status: typeof status === 'string' && status !== 'all' ? status : undefined,
        priority: typeof priority === 'string' && priority !== 'all' ? priority : undefined,
      });
    }, 20000);

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.storeName.toLowerCase().includes(q) ||
          t.ownerName.toLowerCase().includes(q)
      );
    }

    return res.json({ success: true, tickets: list });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve support tickets.' });
  }
});

adminRouter.get('/support/:ticketId', async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const ticket = await SupportRepo.getById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    return res.json({ success: true, ticket });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve ticket details.' });
  }
});

adminRouter.post('/support/:ticketId/reply', async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Reply text cannot be empty.' });
    }

    const updated = await SupportRepo.addReply(ticketId, {
      sender: req.user?.name || 'Admin Manager',
      senderRole: req.user?.role || 'SuperAdmin',
      text: text.trim(),
    });

    if (!updated) return res.status(404).json({ error: 'Ticket not found.' });

    cache.invalidateSupport();
    emitTicketUpdated(ticketId, updated);

    return res.json({ success: true, ticket: updated });
  } catch {
    return res.status(500).json({ error: 'Failed to send reply.' });
  }
});

adminRouter.patch('/support/:ticketId/status', async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const updated = await SupportRepo.updateStatus(ticketId, status);
    if (!updated) return res.status(404).json({ error: 'Ticket not found.' });

    cache.invalidateSupport();
    emitTicketUpdated(ticketId, updated);

    return res.json({ success: true, ticket: updated });
  } catch {
    return res.status(500).json({ error: 'Failed to update ticket status.' });
  }
});

adminRouter.post('/support', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, storeName, ownerName, ownerEmail, subject, priority, initialMessage } = req.body;
    if (!subject || !ownerName) {
      return res.status(400).json({ error: 'Subject and owner name are required.' });
    }

    const created = await SupportRepo.create(
      {
        storeId: storeId || 'store_001',
        storeName: storeName || 'Store',
        ownerName,
        ownerEmail: ownerEmail || 'owner@shoppos.com',
        subject,
        priority: priority || 'medium',
        status: 'open',
      },
      initialMessage
    );

    cache.invalidateSupport();
    emitTicketUpdated(created._id, created);

    return res.json({ success: true, ticket: created });
  } catch {
    return res.status(500).json({ error: 'Failed to create support ticket.' });
  }
});

adminRouter.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await cache.getOrSet('admin:settings', async () => {
      return await PlatformSettingsRepo.getSettings();
    }, 300000);

    return res.json({
      success: true,
      settings,
      currentAdmin: {
        id: req.user?._id,
        name: req.user?.name || settings.name,
        email: req.user?.email || settings.email,
        role: req.user?.role,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve platform settings.' });
  }
});

adminRouter.put('/settings/profile', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const adminId = req.user?._id;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized.' });

    const updatedUser = await PlatformSettingsRepo.updateAdminProfile(adminId, { name, email, password });
    cache.invalidateSettings();

    return res.json({
      success: true,
      message: 'Admin profile updated successfully.',
      admin: { id: updatedUser?._id, name: updatedUser?.name, email: updatedUser?.email },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to update admin profile.' });
  }
});

adminRouter.put('/settings/platform', async (req: AuthRequest, res: Response) => {
  try {
    const updated = await PlatformSettingsRepo.updateSettings(req.body);
    cache.invalidateSettings();
    return res.json({ success: true, message: 'Platform settings updated successfully.', settings: updated });
  } catch {
    return res.status(500).json({ error: 'Failed to update platform settings.' });
  }
});

adminRouter.get('/audit-logs', async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await AuditRepo.getAll(50);
    return res.json({ success: true, logs });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// GET /api/admin/features - List feature definitions and all stores with their feature switches
adminRouter.get('/features', async (_req: AuthRequest, res: Response) => {
  try {
    const stores = await StoreRepo.getAllStores();
    const settings = await PlatformSettingsRepo.getSettings();

    return res.json({
      success: true,
      definitions: SYSTEM_FEATURE_DEFINITIONS,
      globalFeatures: settings.defaultFeatures || {},
      stores: stores.map((s) => ({
        id: s._id,
        _id: s._id,
        name: s.name,
        branch: s.branch,
        ownerId: s.ownerId,
        status: s.status,
        plan: s.subscription?.plan || 'Professional',
        features: s.features || {},
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch features.' });
  }
});

// PUT /api/admin/stores/:storeId/features - Update feature switches for a specific store
adminRouter.put('/stores/:storeId/features', async (req: AuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const { features } = req.body;

    if (!features || typeof features !== 'object') {
      return res.status(400).json({ error: 'Invalid features payload.' });
    }

    const store = await StoreRepo.getStore(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found.' });

    const updated = await StoreRepo.updateStore(storeId, {
      features: { ...(store.features || {}), ...features },
    });

    await AuditRepo.log({
      storeId,
      adminId: req.user?.id || 'admin_console',
      userId: req.user?.id || 'admin_console',
      userName: req.user?.name || 'Super Admin',
      action: 'STORE_FEATURES_UPDATED',
      targetStoreId: storeId,
      newValue: features,
      details: `Admin updated features & page access for store "${store.name}"`,
    });

    cache.invalidateStores(storeId);

    if (updated) {
      emitStoreUpdated(storeId, updated);
      emitFeaturesUpdated(storeId, updated.features || {});
    }

    return res.json({
      success: true,
      message: `Features for "${store.name}" updated successfully.`,
      features: updated?.features || {},
      store: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update store features.' });
  }
});

// PUT /api/admin/features/global - Update system-wide global feature defaults
adminRouter.put('/features/global', async (req: AuthRequest, res: Response) => {
  try {
    const { features, applyToAllStores } = req.body;

    if (!features || typeof features !== 'object') {
      return res.status(400).json({ error: 'Invalid features payload.' });
    }

    const current = await PlatformSettingsRepo.getSettings();
    const merged = { ...(current.defaultFeatures || {}), ...features };
    await PlatformSettingsRepo.updateSettings({ defaultFeatures: merged });

    if (applyToAllStores) {
      const stores = await StoreRepo.getAllStores();
      for (const st of stores) {
        const updated = await StoreRepo.updateStore(st._id, {
          features: { ...(st.features || {}), ...features },
        });
        cache.invalidateStores(st._id);
        if (updated) {
          emitStoreUpdated(st._id, updated);
          emitFeaturesUpdated(st._id, updated.features || {});
        }
      }
    }

    await AuditRepo.log({
      storeId: 'platform',
      adminId: req.user?.id || 'admin_console',
      userId: req.user?.id || 'admin_console',
      userName: req.user?.name || 'Super Admin',
      action: 'GLOBAL_FEATURES_UPDATED',
      newValue: { features, applyToAllStores },
      details: `Admin updated global default features${applyToAllStores ? ' (applied to all shops)' : ''}`,
    });

    return res.json({
      success: true,
      message: applyToAllStores
        ? 'Global features updated and applied to all stores successfully.'
        : 'Global default features updated successfully.',
      defaultFeatures: merged,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update global features.' });
  }
});

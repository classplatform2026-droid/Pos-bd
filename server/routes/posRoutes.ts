import { Router, Response } from 'express';
import {
  ProductsRepo,
  SalesRepo,
  StoreRepo,
  AuditRepo,
  CategoriesRepo,
  PaymentsRepo,
  PlansRepo,
  SupportRepo,
  getDbStatus,
  enforcePlanLimits,
} from '../db';
import {
  authenticateToken,
  requirePermission,
  requireRole,
  requireActiveSubscription,
  AuthRequest,
} from '../auth';
import { cache } from '../cache';
import { emitToAdmin, emitToStore } from '../socket';

export const posRouter = Router();

posRouter.get('/system/status', async (req: AuthRequest, res: Response) => {
  const storeId = req.user?.storeId;
  const status = getDbStatus(storeId);
  return res.json({
    ...status,
    cache: cache.getStats(),
  });
});

posRouter.post('/system/cache-clear', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const storeId = req.user?.storeId;
  if (storeId) {
    cache.invalidateStores(storeId);
    cache.invalidateProducts(storeId);
    cache.invalidateCategories(storeId);
    cache.invalidateSales(storeId);
    cache.invalidateUsers(storeId);
  } else {
    cache.clear();
  }
  return res.json({
    success: true,
    message: 'Store cache purged. Fresh data will reload directly from MongoDB.',
    cache: cache.getStats(),
  });
});

async function resolveStoreId(req: AuthRequest): Promise<string> {
  if (req.user?.storeId && req.user.storeId.trim()) return req.user.storeId.trim();
  const isPlatformAdmin = req.user?.role === 'SuperAdmin' || req.user?.role === 'Admin';
  if (isPlatformAdmin) {
    const all = await StoreRepo.getAllStores();
    if (all.length > 0) return all[0]._id;
  }
  return '';
}

posRouter.get(
  '/audit-logs',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Manager']) as any,
  async (req: AuthRequest, res: Response) => {
    const storeId = await resolveStoreId(req);
    if (!storeId) return res.json({ logs: [] });
    const logs = await cache.getOrSet(`audit:${storeId}`, () => AuditRepo.getRecent(storeId, 30), 15000);
    return res.json({ logs });
  }
);

posRouter.get('/store', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const isPlatformAdmin = req.user?.role === 'SuperAdmin' || req.user?.role === 'Admin';
  const storeId = await resolveStoreId(req);

  if (!storeId) {
    if (isPlatformAdmin) {
      return res.json({
        store: {
          _id: 'platform_console',
          name: 'Platform Admin Console',
          branch: 'HQ Admin',
          tagline: 'Multi-Store Cloud Point of Sale',
          phone: req.user?.phone || '01700000000',
          address: 'Cloud Headquarters',
          currency: '৳',
          taxRate: 0,
          receiptFooter: 'ShopPOS SaaS Cloud',
          printerSize: '80mm',
          storeType: 'general',
          status: 'active',
          subscription: {
            status: 'active',
            plan: 'Enterprise',
            startDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
            billingCycle: 'yearly',
            amount: 0,
            paymentStatus: 'approved',
          },
        },
      });
    }
    return res.status(404).json({ error: 'Store not found.' });
  }

  const store = await cache.getOrSet(`store:${storeId}`, () => StoreRepo.getStore(storeId), 60000);
  if (!store) {
    if (isPlatformAdmin) {
      return res.json({
        store: {
          _id: 'platform_console',
          name: 'Platform Admin Console',
          branch: 'HQ Admin',
          tagline: 'Multi-Store Cloud Point of Sale',
          phone: req.user?.phone || '01700000000',
          address: 'Cloud Headquarters',
          currency: '৳',
          taxRate: 0,
          receiptFooter: 'ShopPOS SaaS Cloud',
          printerSize: '80mm',
          storeType: 'general',
          status: 'active',
          subscription: {
            status: 'active',
            plan: 'Enterprise',
            startDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
            billingCycle: 'yearly',
            amount: 0,
            paymentStatus: 'approved',
          },
        },
      });
    }
    return res.status(404).json({ error: 'Store not found.' });
  }
  return res.json({ store });
});

posRouter.put(
  '/store',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Owner']) as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = await resolveStoreId(req);
      if (!storeId) {
        return res.status(400).json({ error: 'No active store found to update.' });
      }

      // Store phone number is permanent and can never be changed
      const { phone: _ignoredPhone, ...safeBody } = req.body;

      const updated = await StoreRepo.updateStore(storeId, safeBody);
      if (!updated) {
        return res.status(404).json({ error: 'Store not found.' });
      }

      cache.invalidateStores(storeId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'UPDATE_SETTINGS',
        details: `Updated store configuration for "${updated.name}" (${updated.branch})`,
      });

      return res.json({ success: true, store: updated });
    } catch {
      return res.status(500).json({ error: 'Failed to update store settings.' });
    }
  }
);

posRouter.get(
  '/store/payments',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Owner', 'Manager']) as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = await resolveStoreId(req);
      if (!storeId) return res.json({ success: true, payments: [] });
      const payments = await PaymentsRepo.getAll({ storeId });
      return res.json({ success: true, payments });
    } catch {
      return res.status(500).json({ error: 'Failed to retrieve payment history.' });
    }
  }
);

posRouter.post(
  '/store/payments',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Owner']) as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = await resolveStoreId(req);
      if (!storeId) return res.status(400).json({ error: 'No active store found.' });

      const store = await StoreRepo.getStore(storeId);
      if (!store) return res.status(404).json({ error: 'Store not found.' });

      const { method, transactionId, amount, senderPhone, durationMonths, notes, plan } = req.body;
      if (!method || !transactionId || !amount) {
        return res.status(400).json({ error: 'Payment method, Transaction ID, and Amount are required.' });
      }

      const payment = await PaymentsRepo.create({
        storeId,
        storeName: store.name,
        ownerName: req.user?.name || store.name,
        ownerPhone: store.phone || req.user?.phone,
        amount: Number(amount),
        method: method.trim(),
        transactionId: transactionId.trim().toUpperCase(),
        senderPhone: (senderPhone || '').trim(),
        notes: notes || `Subscription renewal for ${durationMonths || 1} month(s)`,
        status: 'pending',
        plan: plan || store.subscription?.plan || 'Professional',
        billingCycle: durationMonths && Number(durationMonths) >= 12 ? 'yearly' : 'monthly',
        submittedAt: new Date().toISOString(),
      });

      if (store.subscription) {
        await StoreRepo.updateStore(storeId, {
          subscription: {
            ...store.subscription,
            lastPaymentId: payment._id,
            paymentStatus: 'pending',
          },
        });
      }

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'SUBMIT_PAYMENT',
        details: `Submitted subscription payment ৳ ${amount} via ${method} (TrxID: ${transactionId}) for store ${store.name}`,
      });

      cache.invalidateStores(storeId);
      cache.invalidatePayments();

      try {
        emitToAdmin('PAYMENT_SUBMITTED', { storeId, payment });
        emitToStore(storeId, 'PAYMENT_SUBMITTED', { storeId, payment });
      } catch {
        // Safe socket emission fallback
      }

      return res.status(201).json({ success: true, payment });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to submit payment.' });
    }
  }
);

// GET /api/plans - Public/Store view of active plans
posRouter.get('/plans', authenticateToken as any, async (_req: AuthRequest, res: Response) => {
  try {
    const plans = await PlansRepo.getAll();
    const activePlans = (plans || []).filter((p) => p.status === 'active');
    return res.json({ success: true, plans: activePlans });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve plans.' });
  }
});

posRouter.get('/categories', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  if (!storeId) return res.json({ categories: [] });
  const categories = await cache.getOrSet(`categories:${storeId}`, () => CategoriesRepo.getAll(storeId), 120000);
  return res.json({ categories });
});

posRouter.post(
  '/categories',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Manager']) as any,
  requireActiveSubscription as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Category name is required.' });
      }

      const created = await CategoriesRepo.create(storeId, name.trim());
      cache.invalidateCategories(storeId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'CREATE_CATEGORY',
        details: `Created new category "${created}" in store ${storeId}`,
      });

      return res.status(201).json({ success: true, category: created });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }
);

posRouter.delete(
  '/categories/:name',
  authenticateToken as any,
  requireRole(['SuperAdmin', 'Admin', 'Manager']) as any,
  requireActiveSubscription as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const catName = decodeURIComponent(req.params.name).trim();

      await CategoriesRepo.delete(storeId, catName);

      const storeProducts = await ProductsRepo.getAll(storeId);
      for (const p of storeProducts) {
        if (p.category.toLowerCase() === catName.toLowerCase()) {
          await ProductsRepo.update(storeId, p._id, { category: 'Grocery' });
        }
      }

      cache.invalidateCategories(storeId);
      cache.invalidateProducts(storeId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'DELETE_CATEGORY',
        details: `Deleted category "${catName}" in store ${storeId}`,
      });

      return res.json({ success: true, message: `Category "${catName}" deleted.` });
    } catch {
      return res.status(500).json({ error: 'Failed to delete category.' });
    }
  }
);

posRouter.get('/products', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const storeId = await resolveStoreId(req);
  if (!storeId) return res.json({ products: [] });
  const products = await cache.getOrSet(`products:${storeId}`, () => ProductsRepo.getAll(storeId), 60000);
  return res.json({ products });
});

posRouter.get('/products/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const storeId = req.user!.storeId;
  const targetId = req.params.id;
  const product = await cache.getOrSet(`product:${storeId}:${targetId}`, () => ProductsRepo.findById(storeId, targetId), 60000);
  if (!product) {
    return res.status(404).json({ error: 'Product not found in this store.' });
  }
  return res.json({ product });
});

posRouter.post(
  '/products',
  authenticateToken as any,
  requirePermission('products.create') as any,
  requireActiveSubscription as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;

      const limitCheck = await enforcePlanLimits(storeId, 'products');
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: limitCheck.message,
          code: 'PLAN_LIMIT_REACHED',
          limit: limitCheck.limit,
          current: limitCheck.current,
        });
      }

      const {
        name,
        sku,
        barcode,
        category,
        storeType,
        costPrice,
        price,
        stock,
        lowStockThreshold,
        unit,
        iconType,
        color,
      } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({ error: 'Product name and price are required.' });
      }

      const newProduct = await ProductsRepo.create({
        storeId,
        name: name.trim(),
        sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
        barcode: barcode || Date.now().toString().slice(-8),
        category: category || 'Grocery',
        storeType: storeType || 'grocery',
        costPrice: Number(costPrice) || 0,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        unit: unit || 'Pcs',
        iconType: iconType || 'rice',
        color: color || '#3B82F6',
      });

      cache.invalidateProducts(storeId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'CREATE_PRODUCT',
        details: `Added new product "${newProduct.name}" (SKU: ${newProduct.sku}) in store ${storeId}`,
      });

      return res.status(201).json({ success: true, product: newProduct });
    } catch (err: any) {
      console.error('Create product error:', err);
      return res.status(400).json({ error: err.message || 'Failed to create product.' });
    }
  }
);

posRouter.put(
  '/products/:id',
  authenticateToken as any,
  requirePermission('products.edit') as any,
  requireActiveSubscription as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;
      const existing = await ProductsRepo.findById(storeId, targetId);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found in this store.' });
      }

      const updated = await ProductsRepo.update(storeId, targetId, req.body);
      cache.invalidateProducts(storeId);
      cache.del(`product:${storeId}:${targetId}`);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'UPDATE_PRODUCT',
        details: `Updated product details for "${existing.name}" in store ${storeId}`,
      });

      return res.json({ success: true, product: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update product.' });
    }
  }
);

posRouter.patch(
  '/products/:id/stock',
  authenticateToken as any,
  requirePermission('products.stock') as any,
  requireActiveSubscription as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;
      const { stock } = req.body;

      if (stock === undefined) {
        return res.status(400).json({ error: 'Stock number is required.' });
      }

      const existing = await ProductsRepo.findById(storeId, targetId);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found in this store.' });
      }

      const updated = await ProductsRepo.adjustStock(storeId, targetId, Number(stock));
      cache.invalidateProducts(storeId);
      cache.del(`product:${storeId}:${targetId}`);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'UPDATE_STOCK',
        details: `Adjusted stock for "${existing.name}" from ${existing.stock} to ${stock} in store ${storeId}`,
      });

      return res.json({ success: true, product: updated });
    } catch {
      return res.status(500).json({ error: 'Failed to adjust stock.' });
    }
  }
);

posRouter.delete(
  '/products/:id',
  authenticateToken as any,
  requirePermission('products.delete') as any,
  requireActiveSubscription as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;

      const existing = await ProductsRepo.findById(storeId, targetId);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found in this store.' });
      }

      await ProductsRepo.delete(storeId, targetId);
      cache.invalidateProducts(storeId);
      cache.del(`product:${storeId}:${targetId}`);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'DELETE_PRODUCT',
        details: `Deleted product "${existing.name}" (SKU: ${existing.sku}) from store ${storeId}`,
      });

      return res.json({ success: true, message: 'Product deleted.' });
    } catch {
      return res.status(500).json({ error: 'Failed to delete product.' });
    }
  }
);

posRouter.get(
  '/sales',
  authenticateToken as any,
  requirePermission('sales.view') as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = await resolveStoreId(req);
      if (!storeId) return res.json({ sales: [] });
      const sales = await cache.getOrSet(`sales:${storeId}`, () => SalesRepo.getAll(storeId), 30000);
      return res.json({ sales });
    } catch {
      return res.status(500).json({ error: 'Failed to retrieve sales.' });
    }
  }
);

posRouter.get(
  '/sales/:id',
  authenticateToken as any,
  requirePermission('sales.view') as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;
      const sale = await cache.getOrSet(`sale:${storeId}:${targetId}`, () => SalesRepo.findById(storeId, targetId), 60000);
      if (!sale) {
        return res.status(404).json({ error: 'Sale record not found in this store.' });
      }
      return res.json({ sale });
    } catch {
      return res.status(500).json({ error: 'Failed to retrieve sale details.' });
    }
  }
);

posRouter.post(
  '/sales',
  authenticateToken as any,
  requirePermission('pos.checkout') as any,
  requireActiveSubscription as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const {
        items,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxAmount,
        total,
        paymentMethod,
        amountReceived,
        changeGiven,
        customerName,
        customerPhone,
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Cart items are required.' });
      }

      const invoiceNo = await SalesRepo.generateNextInvoiceNo(storeId);

      const newSale = await SalesRepo.create({
        storeId,
        invoiceNo,
        createdAt: new Date().toISOString(),
        items,
        subtotal: Number(subtotal) || 0,
        discountType: discountType || 'flat',
        discountValue: Number(discountValue) || 0,
        discountAmount: Number(discountAmount) || 0,
        taxAmount: Number(taxAmount) || 0,
        total: Number(total) || 0,
        paymentMethod: paymentMethod || 'Cash',
        amountReceived: amountReceived !== undefined ? Number(amountReceived) : undefined,
        changeGiven: changeGiven !== undefined ? Number(changeGiven) : undefined,
        cashierId: req.user!._id,
        cashierName: req.user!.name,
        customerName,
        customerPhone,
        status: 'completed',
      });

      cache.invalidateSales(storeId);
      cache.invalidateProducts(storeId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'COMPLETE_SALE',
        details: `Completed sale invoice #${invoiceNo} for amount ৳ ${total} in store ${storeId}`,
      });

      return res.status(201).json({ success: true, sale: newSale });
    } catch (err) {
      console.error('POS Checkout error:', err);
      return res.status(400).json({ error: (err as Error).message });
    }
  }
);

posRouter.post(
  '/sales/:id/refund',
  authenticateToken as any,
  requirePermission('sales.refund') as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;
      const sale = await SalesRepo.findById(storeId, targetId);
      if (!sale) {
        return res.status(404).json({ error: 'Sale record not found in this store.' });
      }
      if (sale.status === 'refunded') {
        return res.status(400).json({ error: 'This sale has already been refunded.' });
      }

      const refunded = await SalesRepo.refund(storeId, targetId);
      cache.invalidateSales(storeId);
      cache.invalidateProducts(storeId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'REFUND_SALE',
        details: `Processed refund for invoice #${sale.invoiceNo} (Amount ৳ ${sale.total}) in store ${storeId}`,
      });

      return res.json({ success: true, sale: refunded });
    } catch {
      return res.status(500).json({ error: 'Failed to process refund.' });
    }
  }
);

// Support Ticket Routes for Store Owner
posRouter.get(
  '/support',
  authenticateToken as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      if (!storeId) {
        return res.json({ success: true, tickets: [] });
      }
      const tickets = await SupportRepo.getAll({ storeId });
      return res.json({ success: true, tickets });
    } catch {
      return res.status(500).json({ error: 'Failed to retrieve support tickets.' });
    }
  }
);

posRouter.post(
  '/support',
  authenticateToken as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      if (!storeId) {
        return res.status(400).json({ error: 'Store context is required.' });
      }
      const { subject, message, category, priority, phone } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message are required.' });
      }

      const store = await StoreRepo.getStore(storeId);
      const ownerName = req.user!.name || store?.name || 'Store Owner';
      const ownerEmail = req.user!.email || (phone ? `${phone}@client.pos` : 'owner@store.pos');

      const created = await SupportRepo.create(
        {
          storeId,
          storeName: store?.name || 'My Store',
          ownerName,
          ownerEmail,
          subject: category ? `[${category}] ${subject}` : subject,
          priority: priority === 'urgent' ? 'high' : priority === 'medium' ? 'medium' : 'low',
          status: 'open',
        },
        phone ? `${message}\n\n(Contact Phone: ${phone})` : message
      );

      cache.invalidateSupport();
      emitToAdmin('ticket:created', created);

      return res.status(201).json({ success: true, ticket: created });
    } catch {
      return res.status(500).json({ error: 'Failed to create support ticket.' });
    }
  }
);

posRouter.post(
  '/support/:ticketId/reply',
  authenticateToken as any,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const { ticketId } = req.params;
      const { text } = req.body;
      if (!text?.trim()) {
        return res.status(400).json({ error: 'Reply text cannot be empty.' });
      }

      const ticket = await SupportRepo.getById(ticketId);
      if (!ticket || ticket.storeId !== storeId) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }

      const updated = await SupportRepo.addReply(ticketId, {
        sender: req.user!.name || 'Store Owner',
        senderRole: 'Owner',
        text: text.trim(),
      });

      cache.invalidateSupport();
      emitToAdmin('ticket:updated', updated);

      return res.json({ success: true, ticket: updated });
    } catch {
      return res.status(500).json({ error: 'Failed to reply to support ticket.' });
    }
  }
);


import { Product, Sale, StoreInfo } from '../types';

const TOKEN_KEY = 'shoppos_jwt_token';

function formatBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

// Support Render / standalone deployment where backend is on a separate domain
const API_BASE_URL = formatBaseUrl(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? String(import.meta.env.VITE_API_URL) : '');

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

function resolveApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn('Storage error', e);
  }
}

interface ClientCacheEntry<T> {
  data: T;
  expiresAt: number;
}

const clientCache = new Map<string, ClientCacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
let clientHits = 0;
let clientMisses = 0;

export function invalidateClientCache(prefix?: string) {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.startsWith(prefix)) {
      clientCache.delete(key);
    }
  }
}

export function getClientCacheStats() {
  return {
    size: clientCache.size,
    hits: clientHits,
    misses: clientMisses,
    inFlightCount: inFlightRequests.size,
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}, ttlMs = 0): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();

  if (method === 'GET' && ttlMs > 0) {
    const cached = clientCache.get(endpoint);
    if (cached && Date.now() < cached.expiresAt) {
      clientHits++;
      return cached.data as T;
    }

    const inFlight = inFlightRequests.get(endpoint);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  if (method !== 'GET') {
    if (endpoint.startsWith('/api/products')) {
      invalidateClientCache('/api/products');
    } else if (endpoint.startsWith('/api/sales')) {
      invalidateClientCache('/api/sales');
      invalidateClientCache('/api/products');
      invalidateClientCache('/api/admin/metrics');
    } else if (endpoint.startsWith('/api/categories')) {
      invalidateClientCache('/api/categories');
    } else if (endpoint.startsWith('/api/store')) {
      invalidateClientCache('/api/store');
      invalidateClientCache('/api/admin');
    } else if (endpoint.startsWith('/api/admin')) {
      invalidateClientCache('/api/admin');
    }
  }

  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fetchPromise = (async () => {
    clientMisses++;
    const targetUrl = resolveApiUrl(endpoint);
    const res = await fetch(targetUrl, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));

      if (res.status === 401) {
        setStoredToken(null);
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('shoppos_current_user');
        } catch {}
        invalidateClientCache();

        window.dispatchEvent(
          new CustomEvent('shoppos:auth_unauthorized', {
            detail: {
              message: errorData.error || 'User account no longer exists or session expired.',
              code: errorData.code || 'UNAUTHORIZED',
            },
          })
        );
      } else if (res.status === 403 && (errorData.code === 'ACCOUNT_SUSPENDED' || errorData.code === 'USER_SUSPENDED')) {
        window.dispatchEvent(
          new CustomEvent('shoppos:account_suspended', {
            detail: { message: errorData.error || 'Your account has been suspended. Please contact support.' },
          })
        );
      } else if (res.status === 403 && errorData.code === 'SUBSCRIPTION_EXPIRED') {
        window.dispatchEvent(
          new CustomEvent('shoppos:subscription_expired', {
            detail: errorData,
          })
        );
      }

      const err = new Error(errorData.error || `HTTP error ${res.status}`);
      (err as any).code = errorData.code;
      (err as any).status = res.status;
      throw err;
    }

    const json = (await res.json()) as T;
    if (method === 'GET' && ttlMs > 0) {
      clientCache.set(endpoint, {
        data: json,
        expiresAt: Date.now() + ttlMs,
      });
    }
    return json;
  })();

  if (method === 'GET' && ttlMs > 0) {
    inFlightRequests.set(endpoint, fetchPromise);
    fetchPromise.finally(() => inFlightRequests.delete(endpoint));
  }

  return fetchPromise;
}

export interface ApiUser {
  _id: string;
  storeId: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Cashier';
  permissions: string[];
  pin?: string;
  phone?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export interface DbStatusResponse {
  mode: 'remote-mongodb' | 'embedded-mongodb';
  connected: boolean;
  database: string;
  storeId?: string;
  collections: {
    stores?: number | string;
    users: number | string;
    products: number | string;
    sales: number | string;
    categories?: number | string;
  };
}

export const api = {
  async login(credentials: { number?: string; phone?: string; identifier?: string; email?: string; password?: string; pin?: string }): Promise<{
    token: string;
    user: ApiUser;
  }> {
    const data = await request<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setStoredToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: ApiUser }> {
    return request<{ user: ApiUser }>('/api/auth/me');
  },

  async getUsers(): Promise<{ users: ApiUser[] }> {
    return request<{ users: ApiUser[] }>('/api/auth/users');
  },

  async createUser(payload: {
    name: string;
    email?: string;
    password?: string;
    pin?: string;
    role: string;
    permissions?: string[];
    phone?: string;
    number?: string;
  }): Promise<{ user: ApiUser }> {
    return request<{ user: ApiUser }>('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(
    id: string,
    updates: Partial<{
      name: string;
      role: string;
      permissions: string[];
      status: string;
      pin: string;
      password?: string;
      phone?: string;
      number?: string;
    }>
  ): Promise<{ user: ApiUser }> {
    return request<{ user: ApiUser }>(`/api/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/auth/users/${id}`, {
      method: 'DELETE',
    });
  },

  async getCategories(): Promise<{ categories: string[] }> {
    return request<{ categories: string[] }>('/api/categories', {}, 30000);
  },

  async createCategory(name: string): Promise<{ category: string }> {
    return request<{ category: string }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteCategory(name: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/categories/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },

  async getProducts(): Promise<{ products: Product[] }> {
    const data = await request<{ products: any[] }>('/api/products', {}, 20000);
    const normalized: Product[] = data.products.map((p) => ({
      id: p._id || p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      storeType: p.storeType || 'grocery',
      costPrice: p.costPrice,
      price: p.price,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold || 5,
      unit: p.unit || 'Pcs',
      iconType: p.iconType || 'rice',
      color: p.color || '#3B82F6',
    }));
    return { products: normalized };
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<{ product: Product }> {
    const data = await request<{ product: any }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return {
      product: {
        ...data.product,
        id: data.product._id || data.product.id,
      },
    };
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<{ product: Product }> {
    const data = await request<{ product: any }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return {
      product: {
        ...data.product,
        id: data.product._id || data.product.id,
      },
    };
  },

  async adjustStock(id: string, stock: number): Promise<{ product: Product }> {
    const data = await request<{ product: any }>(`/api/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ stock }),
    });
    return {
      product: {
        ...data.product,
        id: data.product._id || data.product.id,
      },
    };
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },

  async getSales(): Promise<{ sales: Sale[] }> {
    const data = await request<{ sales: any[] }>('/api/sales', {}, 15000);
    const normalized: Sale[] = data.sales.map((s) => ({
      id: s._id || s.id,
      invoiceNo: s.invoiceNo,
      createdAt: s.createdAt,
      items: s.items,
      subtotal: s.subtotal,
      discountType: s.discountType,
      discountValue: s.discountValue,
      discountAmount: s.discountAmount,
      taxAmount: s.taxAmount,
      total: s.total,
      paymentMethod: s.paymentMethod,
      amountReceived: s.amountReceived,
      changeGiven: s.changeGiven,
      cashierName: s.cashierName,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      status: s.status,
    }));
    return { sales: normalized };
  },

  async createSale(sale: Omit<Sale, 'id'>): Promise<{ sale: Sale }> {
    const data = await request<{ sale: any }>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
    return {
      sale: {
        ...data.sale,
        id: data.sale._id || data.sale.id,
      },
    };
  },

  async refundSale(id: string): Promise<{ sale: Sale }> {
    const data = await request<{ sale: any }>(`/api/sales/${id}/refund`, {
      method: 'POST',
    });
    return {
      sale: {
        ...data.sale,
        id: data.sale._id || data.sale.id,
      },
    };
  },

  async getStore(): Promise<{ store: StoreInfo }> {
    const data = await request<{ store: any }>('/api/store', {}, 20000);
    if (!data || !data.store) {
      return { store: null as any };
    }
    return {
      store: {
        id: data.store._id || data.store.id,
        ownerId: data.store.ownerId,
        name: data.store.name,
        branch: data.store.branch,
        tagline: data.store.tagline,
        phone: data.store.phone,
        address: data.store.address,
        currency: data.store.currency,
        taxRate: data.store.taxRate,
        receiptFooter: data.store.receiptFooter,
        printerSize: data.store.printerSize,
        storeType: data.store.storeType,
        status: data.store.status,
        subscription: data.store.subscription,
      },
    };
  },

  async updateStore(updates: Partial<StoreInfo>): Promise<{ store: StoreInfo }> {
    const data = await request<{ store: any }>('/api/store', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return { store: data.store };
  },

  async getStorePayments(): Promise<{ success: boolean; payments: any[] }> {
    return request<{ success: boolean; payments: any[] }>('/api/store/payments', {}, 15000);
  },

  async getStorePlans(): Promise<{ success: boolean; plans: any[] }> {
    return request<{ success: boolean; plans: any[] }>('/api/plans', {}, 15000);
  },

  async submitStorePayment(payload: {
    method: string;
    transactionId: string;
    amount: number;
    senderPhone?: string;
    durationMonths?: number;
    notes?: string;
    plan?: string;
  }): Promise<{ success: boolean; payment: any }> {
    return request<{ success: boolean; payment: any }>('/api/store/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getStoreSupportTickets(): Promise<{ success: boolean; tickets: any[] }> {
    return request<{ success: boolean; tickets: any[] }>('/api/support', {}, 10000);
  },

  async createStoreSupportTicket(payload: {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
    phone?: string;
  }): Promise<{ success: boolean; ticket: any }> {
    return request<{ success: boolean; ticket: any }>('/api/support', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async sendStoreSupportReply(ticketId: string, text: string): Promise<{ success: boolean; ticket: any }> {
    return request<{ success: boolean; ticket: any }>(`/api/support/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async getDbStatus(): Promise<DbStatusResponse> {
    return request<DbStatusResponse>('/api/system/status', {}, 10000);
  },

  async clearSystemCache(): Promise<{ success: boolean; message: string; cache: any }> {
    invalidateClientCache();
    return request<{ success: boolean; message: string; cache: any }>('/api/system/cache-clear', {
      method: 'POST',
    });
  },

  async getAuditLogs(): Promise<{ logs: any[] }> {
    return request<{ logs: any[] }>('/api/audit-logs', {}, 15000);
  },

  // Admin APIs
  async getAdminMetrics() {
    return request<any>('/api/admin/metrics', {}, 15000);
  },

  async getAdminStores(params?: { status?: string; type?: string; plan?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.plan) query.set('plan', params.plan);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<any>(`/api/admin/stores${qs ? `?${qs}` : ''}`, {}, 20000);
  },

  async adminClearCache(): Promise<{ success: boolean; message: string; cache: any }> {
    invalidateClientCache();
    return request<{ success: boolean; message: string; cache: any }>('/api/admin/system/cache-clear', {
      method: 'POST',
    });
  },

  async adminGetCacheStatus() {
    return request<any>('/api/admin/system/cache-status');
  },

  async getAdminStoreDetails(storeId: string) {
    return request<any>(`/api/admin/stores/${storeId}`);
  },

  async createAdminStore(payload: any) {
    return request<any>('/api/admin/stores', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async adminImpersonateStore(storeId: string) {
    return request<{ success: boolean; token: string; user: any; store: any }>(
      `/api/admin/stores/${storeId}/impersonate`,
      { method: 'POST' }
    );
  },

  async adminSuspendStore(storeId: string, reason?: string) {
    return request<{ success: boolean; message: string; store: any }>(
      `/api/admin/stores/${storeId}/suspend`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  },

  async adminActivateStore(storeId: string) {
    return request<{ success: boolean; message: string; store: any }>(
      `/api/admin/stores/${storeId}/activate`,
      {
        method: 'POST',
      }
    );
  },

  async changeStorePlan(storeId: string, plan: string) {
    return request<any>(`/api/admin/stores/${storeId}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  },

  async adminExtendSubscription(storeId: string, days = 30) {
    return request<{ success: boolean; message: string; store: any }>(
      `/api/admin/stores/${storeId}/extend-subscription`,
      {
        method: 'POST',
        body: JSON.stringify({ days }),
      }
    );
  },

  async deleteAdminStore(storeId: string, adminPassword?: string) {
    return request<{ success: boolean; message: string }>(
      `/api/admin/stores/${storeId}`,
      {
        method: 'DELETE',
        body: adminPassword ? JSON.stringify({ adminPassword }) : undefined,
      }
    );
  },

  async deleteAdminPlan(planId: string) {
    return request<{ success: boolean; message: string }>(
      `/api/admin/plans/${planId}`,
      {
        method: 'DELETE',
      }
    );
  },

  async getAdminPlans() {
    return request<any>('/api/admin/plans');
  },

  async createAdminPlan(payload: any) {
    return request<any>('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAdminPlan(planId: string, payload: any) {
    return request<any>(`/api/admin/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getAdminPayments(params?: { status?: string; method?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.method) query.set('method', params.method);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<any>(`/api/admin/payments${qs ? `?${qs}` : ''}`);
  },

  async createAdminPayment(payload: {
    storeId: string;
    amount: number;
    method: string;
    transactionId: string;
    planName?: string;
    status?: 'approved' | 'pending';
    senderPhone?: string;
    notes?: string;
  }) {
    return request<any>('/api/admin/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async approveAdminPayment(paymentId: string) {
    return request<any>(`/api/admin/payments/${paymentId}/approve`, {
      method: 'POST',
    });
  },

  async rejectAdminPayment(paymentId: string, reason?: string) {
    return request<any>(`/api/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getAdminSupport(params?: { status?: string; priority?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<any>(`/api/admin/support${qs ? `?${qs}` : ''}`);
  },

  async getAdminSupportDetails(ticketId: string) {
    return request<any>(`/api/admin/support/${ticketId}`);
  },

  async sendAdminSupportReply(ticketId: string, text: string) {
    return request<any>(`/api/admin/support/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async updateAdminSupportStatus(ticketId: string, status: string) {
    return request<any>(`/api/admin/support/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async createAdminSupportTicket(payload: any) {
    return request<any>('/api/admin/support', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAdminSettings() {
    return request<any>('/api/admin/settings');
  },

  async updateAdminProfile(payload: { name?: string; email?: string; password?: string }) {
    return request<any>('/api/admin/settings/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async updateAdminPlatformSettings(payload: any) {
    return request<any>('/api/admin/settings/platform', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getAdminAuditLogs() {
    return request<any>('/api/admin/audit-logs');
  },

  async adminApprovePayment(storeId: string, paymentId?: string, months?: number) {
    return request<{ success: boolean; message: string; subscription: any; store: any }>(
      `/api/admin/stores/${storeId}/approve-payment`,
      {
        method: 'POST',
        body: JSON.stringify({ paymentId, months }),
      }
    );
  },

  async adminExpireSubscription(storeId: string) {
    return request<{ success: boolean; message: string; subscription: any; store: any }>(
      `/api/admin/stores/${storeId}/expire-subscription`,
      {
        method: 'POST',
      }
    );
  },

  async adminUpdateSubscriptionStatus(storeId: string, status: string) {
    return request<{ success: boolean; message: string; store: any }>(
      `/api/admin/stores/${storeId}/subscription-status`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      }
    );
  },

  async adminUpdateStaffStatus(storeId: string, userId: string, status: string) {
    return request<{ success: boolean; message: string; user: any }>(
      `/api/admin/stores/${storeId}/staff/${userId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },

  async adminUpdateStaffRoleAndPermissions(storeId: string, userId: string, role: string, permissions: string[]) {
    return request<{ success: boolean; message: string; user: any }>(
      `/api/admin/stores/${storeId}/staff/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ role, permissions }),
      }
    );
  },

  async getAdminFeatures(): Promise<{
    success: boolean;
    definitions: any[];
    globalFeatures: Record<string, boolean>;
    stores: any[];
  }> {
    return request<any>('/api/admin/features', {}, 15000);
  },

  async updateStoreFeatures(storeId: string, features: Record<string, boolean>): Promise<{
    success: boolean;
    message: string;
    features: Record<string, boolean>;
    store: any;
  }> {
    return request<any>(`/api/admin/stores/${storeId}/features`, {
      method: 'PUT',
      body: JSON.stringify({ features }),
    });
  },

  async updateGlobalFeatures(features: Record<string, boolean>, applyToAllStores = false): Promise<{
    success: boolean;
    message: string;
    defaultFeatures: Record<string, boolean>;
  }> {
    return request<any>('/api/admin/features/global', {
      method: 'PUT',
      body: JSON.stringify({ features, applyToAllStores }),
    });
  },
};

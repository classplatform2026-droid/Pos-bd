import { MongoClient, Db, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  emitAccountSuspended,
  emitAccountActivated,
  emitPaymentApproved,
  emitPaymentRejected,
  emitSubscriptionActivated,
  emitSubscriptionUpdated,
  emitSubscriptionExpired,
  emitUserSuspended,
  emitUserActivated,
  emitUserUpdated,
} from './socket';
import { cache } from './cache';

const RAW_MONGODB_URI = process.env.MONGODB_URI || '';

export function parseMongoConfig(rawUri: string, defaultDb = 'shopdb'): { uri: string; dbName: string } {
  let uri = (rawUri || '').trim();
  if (!uri) return { uri: '', dbName: defaultDb };

  let dbName = process.env.MONGODB_DB_NAME || defaultDb;

  // Handle format: mongodb+srv://...net/?appName=Cluster0/shopdb
  if (uri.includes('/?appName=') && uri.includes('/')) {
    const parts = uri.split('/?');
    if (parts.length === 2 && parts[1].includes('/')) {
      const sub = parts[1].split('/');
      const query = sub[0];
      const specifiedDb = sub.slice(1).join('/');
      if (specifiedDb) {
        dbName = specifiedDb;
        uri = `${parts[0]}/${specifiedDb}?${query}`;
      }
    }
  } else {
    try {
      const proto = uri.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://';
      const dummy = uri.replace(proto, 'http://');
      const parsed = new URL(dummy);
      const pathDb = parsed.pathname.replace(/^\//, '').trim();
      if (pathDb) {
        dbName = pathDb;
      }
    } catch {}
  }

  return { uri, dbName };
}

const { uri: MONGODB_URI, dbName: DB_NAME } = parseMongoConfig(RAW_MONGODB_URI);

export function buildIdQuery(id: string | any) {
  if (!id) return { _id: id };
  const strId = id.toString();
  if (ObjectId.isValid(strId) && strId.length === 24) {
    try {
      const objId = new ObjectId(strId);
      return { $or: [{ _id: strId }, { _id: objId }] };
    } catch {
      return { _id: strId };
    }
  }
  return { _id: strId };
}

export function buildStoreQuery(storeId: string | any) {
  if (!storeId) return { storeId };
  const strId = storeId.toString();
  if (ObjectId.isValid(strId) && strId.length === 24) {
    try {
      const objId = new ObjectId(strId);
      return { $or: [{ storeId: strId }, { storeId: objId }] };
    } catch {
      return { storeId: strId };
    }
  }
  return { storeId: strId };
}

export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function normalizeDoc<T>(doc: any): T {
  if (!doc) return doc;
  const normalized = { ...doc };
  if (doc._id) {
    normalized._id = doc._id.toString();
    normalized.id = doc._id.toString();
  }
  if (doc.storeId) {
    normalized.storeId = doc.storeId.toString();
  }
  if (doc.ownerId) {
    normalized.ownerId = doc.ownerId.toString();
  }
  if (doc.createdAt instanceof Date) {
    normalized.createdAt = doc.createdAt.toISOString();
  }
  if (doc.updatedAt instanceof Date) {
    normalized.updatedAt = doc.updatedAt.toISOString();
  }
  if (doc.timestamp instanceof Date) {
    normalized.timestamp = doc.timestamp.toISOString();
  }
  return normalized as T;
}

export interface StoreSubscription {
  status: 'active' | 'trial' | 'expired' | 'suspended' | 'pending' | 'cancelled';
  plan: 'Starter' | 'Professional' | 'Enterprise' | string;
  planId?: string;
  startDate: string;
  expiryDate: string;
  endDate?: string;
  billingCycle: '14_days' | 'monthly' | 'yearly';
  amount: number;
  staffLimit?: number;
  productLimit?: number;
  features?: string[];
  lastPaymentId?: string;
  paymentStatus?: 'pending' | 'approved' | 'rejected';
}

export interface StoreDoc {
  _id: string;
  id?: string;
  ownerId: string;
  name: string;
  branch: string;
  tagline: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  receiptFooter: string;
  printerSize: '80mm' | '58mm' | 'A4';
  storeType: 'grocery' | 'fashion' | 'electronics' | 'pharmacy' | 'restaurant' | 'general' | string;
  status: 'active' | 'suspended';
  subscription: StoreSubscription;
  features?: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export type UserRole = 'SuperAdmin' | 'Admin' | 'Owner' | 'Manager' | 'Cashier' | string;

export interface UserDoc {
  _id: string;
  id?: string;
  storeId: string;
  name: string;
  email: string;
  passwordHash?: string;
  password?: string;
  pinHash?: string;
  pin?: string;
  role: UserRole;
  permissions: string[];
  phone?: string;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  __v?: number;
}

export interface CategoryDoc {
  _id: string;
  storeId: string;
  name: string;
  createdAt: string;
}

export interface ProductDoc {
  _id: string;
  storeId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  storeType: 'grocery' | 'fashion' | 'electronics' | 'all';
  costPrice: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  iconType: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleDoc {
  _id: string;
  storeId: string;
  invoiceNo: string;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    costPrice?: number;
  }>;
  subtotal: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'Cash' | 'bKash' | 'Nagad' | 'Card';
  amountReceived?: number;
  changeGiven?: number;
  cashierId?: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  status: 'completed' | 'refunded';
}

export interface AuditLogDoc {
  _id: string;
  storeId: string;
  adminId?: string;
  action: string;
  targetStoreId?: string;
  targetUserId?: string;
  previousValue?: any;
  newValue?: any;
  userId?: string;
  userName?: string;
  details?: string;
  timestamp: string;
}

export interface PlanDoc {
  _id: string;
  name: string;
  price: number;
  billingPeriod: string;
  status: 'active' | 'inactive';
  staffLimit: number;
  productLimit: number;
  features: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentDoc {
  _id: string;
  storeId: string;
  storeName: string;
  ownerName: string;
  ownerPhone?: string;
  senderPhone?: string;
  planName?: string;
  plan?: string;
  billingCycle?: string;
  transactionId: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Bank' | 'Card' | string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
}

export interface SupportMessage {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

export interface SupportTicketDoc {
  _id: string;
  storeId: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  subject: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

export interface FeatureDefinition {
  key: string;
  type: 'page' | 'feature';
  title: string;
  titleBn: string;
  description: string;
  category: 'core_page' | 'pos_hardware' | 'sales_pricing' | 'administration';
  icon: string;
  defaultValue: boolean;
}

export const SYSTEM_FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'page_dashboard',
    type: 'page',
    title: 'Dashboard Screen',
    titleBn: 'ড্যাশবোর্ড স্ক্রিন',
    description: 'Analytics, revenue graphs, top selling products and store overview',
    category: 'core_page',
    icon: 'LayoutDashboard',
    defaultValue: true,
  },
  {
    key: 'page_pos',
    type: 'page',
    title: 'POS Terminal Screen',
    titleBn: 'পজ টার্মিনাল স্ক্রিন',
    description: 'Instant checkout, cart calculation, barcode scanning and cash register',
    category: 'core_page',
    icon: 'ShoppingBag',
    defaultValue: true,
  },
  {
    key: 'page_products',
    type: 'page',
    title: 'Products & Inventory Screen',
    titleBn: 'প্রোডাক্ট ও স্টক স্ক্রিন',
    description: 'Product catalog, stock levels, buying/selling price and categorization',
    category: 'core_page',
    icon: 'Package',
    defaultValue: true,
  },
  {
    key: 'page_sales',
    type: 'page',
    title: 'Sales History & Invoices Screen',
    titleBn: 'বিক্রয় হিসাব স্ক্রিন',
    description: 'Past sales ledger, transaction search, receipt re-print and refund records',
    category: 'core_page',
    icon: 'Receipt',
    defaultValue: true,
  },
  {
    key: 'page_settings',
    type: 'page',
    title: 'Settings & Administration Screen',
    titleBn: 'সেটিংস ও অ্যাডমিন স্ক্রিন',
    description: 'Shop profile, thermal printer setup, subscription plan and staff authority',
    category: 'core_page',
    icon: 'Settings',
    defaultValue: true,
  },
  {
    key: 'feat_barcode_scanner',
    type: 'feature',
    title: 'Barcode & QR Scanner',
    titleBn: 'বারকোড ও কিউআর স্ক্যানার',
    description: 'Camera barcode scanner and hardware scanner barcode auto-lookup',
    category: 'pos_hardware',
    icon: 'ScanLine',
    defaultValue: true,
  },
  {
    key: 'feat_receipt_print',
    type: 'feature',
    title: 'Customer Receipt Printing',
    titleBn: 'কাস্টমার রিসিট প্রিন্টিং',
    description: '80mm / 58mm POS thermal receipt generation and print popup modal',
    category: 'pos_hardware',
    icon: 'Printer',
    defaultValue: true,
  },
  {
    key: 'feat_discounts',
    type: 'feature',
    title: 'Discounts & Custom Offers',
    titleBn: 'ডিসকাউন্ট ও স্পেশাল অফার',
    description: 'Apply percentage or flat discount on items or whole cart at checkout',
    category: 'sales_pricing',
    icon: 'Percent',
    defaultValue: true,
  },
  {
    key: 'feat_stock_adjust',
    type: 'feature',
    title: 'Quick Stock Adjustment',
    titleBn: 'দ্রুত স্টক অ্যাডজাস্টমেন্ট',
    description: 'Allow owner/staff to increase or decrease stock count directly from catalog',
    category: 'sales_pricing',
    icon: 'ArrowUpDown',
    defaultValue: true,
  },
  {
    key: 'feat_staff_management',
    type: 'feature',
    title: 'Staff Management & RBAC',
    titleBn: 'স্টাফ ও ক্যাশিয়ার ম্যানেজমেন্ট',
    description: 'Create cashier/manager accounts, assign PIN codes and granular permissions',
    category: 'administration',
    icon: 'Users',
    defaultValue: true,
  },
  {
    key: 'feat_tax_calculation',
    type: 'feature',
    title: 'VAT & Tax Auto-Calculation',
    titleBn: 'ভ্যাট ও ট্যাক্স ক্যালকুলেশন',
    description: 'Calculate configurable government VAT/Tax on checkout total',
    category: 'sales_pricing',
    icon: 'Calculator',
    defaultValue: true,
  },
  {
    key: 'feat_multi_payment',
    type: 'feature',
    title: 'Multi-Payment Methods (bKash/Nagad/Card)',
    titleBn: 'ডিজিটাল পেমেন্ট মেথড',
    description: 'Allow digital payment methods at checkout in addition to physical cash',
    category: 'sales_pricing',
    icon: 'CreditCard',
    defaultValue: true,
  },
  {
    key: 'feat_online_payment',
    type: 'feature',
    title: 'Online Subscription Renewal',
    titleBn: 'অনলাইন সাবস্ক্রিপশন নবায়ন',
    description: 'Allow shop owner to submit subscription renewal payments with TrxID',
    category: 'administration',
    icon: 'Zap',
    defaultValue: true,
  },
  {
    key: 'feat_store_profile_edit',
    type: 'feature',
    title: 'Store Profile Modification',
    titleBn: 'দোকানের তথ্য পরিবর্তন',
    description: 'Allow changing shop name, branch, phone number and receipt footer',
    category: 'administration',
    icon: 'Store',
    defaultValue: true,
  },
];

export interface PlatformSettingsDoc {
  _id: string;
  name: string;
  email: string;
  platformName: string;
  supportEmail: string;
  currency: string;
  defaultTaxRate: number;
  allowSelfRegistration: boolean;
  maintenanceMode: boolean;
  sessionTimeoutMinutes: number;
  defaultFeatures?: Record<string, boolean>;
  updatedAt: string;
}

let mongoClient: MongoClient | null = null;
let nativeDb: Db | null = null;
let isUsingRemoteMongo = false;
let dbConnected = false;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'mongodb.json');

interface LocalDatabaseState {
  stores: StoreDoc[];
  users: UserDoc[];
  categories: CategoryDoc[];
  products: ProductDoc[];
  sales: SaleDoc[];
  audit_logs: AuditLogDoc[];
  plans: PlanDoc[];
  payments: PaymentDoc[];
  support_tickets: SupportTicketDoc[];
  settings: PlatformSettingsDoc;
}

let localDb: LocalDatabaseState = {
  stores: [],
  users: [],
  categories: [],
  products: [],
  sales: [],
  audit_logs: [],
  plans: [],
  payments: [],
  support_tickets: [],
  settings: {
    _id: 'platform_settings_default',
    name: 'Super Admin',
    email: 'admin@shoppos.com',
    platformName: 'ShopPOS SaaS Cloud',
    supportEmail: 'support@shoppos.com',
    currency: '৳',
    defaultTaxRate: 0,
    allowSelfRegistration: true,
    maintenanceMode: false,
    sessionTimeoutMinutes: 60,
    updatedAt: new Date().toISOString(),
  },
};

export async function seedInitialData() {
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const adminPinHash = await bcrypt.hash('1234', salt);
  const saadPasswordHash = await bcrypt.hash('saad1289', salt);
  const saadPinHash = await bcrypt.hash('1289', salt);

  // Initial Super Admins
  const initialStores: StoreDoc[] = [];
  const initialUsers: UserDoc[] = [
    {
      _id: 'usr_admin',
      storeId: '',
      name: 'Super Admin',
      phone: '01700000000',
      email: 'admin@shoppos.com',
      passwordHash: adminPasswordHash,
      pinHash: adminPinHash,
      role: 'SuperAdmin',
      permissions: [
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
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'usr_admin_saad',
      storeId: '',
      name: 'Super Admin (Saad)',
      phone: '01915647290',
      email: 'saad1289@shoppos.com',
      passwordHash: saadPasswordHash,
      pinHash: saadPinHash,
      role: 'SuperAdmin',
      permissions: [
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
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];

  const initialCategories: CategoryDoc[] = [];
  const initialProducts: ProductDoc[] = [];
  const initialSales: SaleDoc[] = [];
  const initialAuditLogs: AuditLogDoc[] = [];
  const initialPayments: PaymentDoc[] = [];
  const initialSupportTickets: SupportTicketDoc[] = [];
  const initialPlans: PlanDoc[] = [
    {
      _id: 'plan_trial',
      name: 'Trial',
      price: 0,
      billingPeriod: '14 days',
      status: 'active',
      staffLimit: 10,
      productLimit: 500,
      features: [
        '14 Days Full Access (টাকা লাগবে না)',
        'Full POS Register',
        'Maximum 500 Products & Inventory',
        'Sales & Profit Analytics',
        'Customer Due & Khata',
        'Barcode & Receipt Printing',
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
    },
    {
      _id: 'plan_standard',
      name: 'Standard',
      price: 999,
      billingPeriod: 'month',
      status: 'active',
      staffLimit: 10,
      productLimit: 500,
      features: [
        'Continuous Full Access',
        'Full POS Register',
        'Maximum 500 Products & Inventory',
        'Sales & Profit Analytics',
        'Customer Due & Khata',
        'Barcode & Receipt Printing',
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
    },
  ];

  const initialSettings: PlatformSettingsDoc = {
    _id: 'platform_settings_default',
    name: 'Super Admin',
    email: 'admin@shoppos.com',
    platformName: 'ShopPOS SaaS Cloud',
    supportEmail: 'support@shoppos.com',
    currency: '৳',
    defaultTaxRate: 0,
    allowSelfRegistration: true,
    maintenanceMode: false,
    sessionTimeoutMinutes: 60,
    updatedAt: new Date().toISOString(),
  };

  return {
    initialStores,
    initialUsers,
    initialCategories,
    initialProducts,
    initialSales,
    initialAuditLogs,
    initialPlans,
    initialPayments,
    initialSupportTickets,
    initialSettings,
  };
}

function saveLocalDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist local MongoDB state:', err);
  }
}

async function loadLocalDb(initialData: Awaited<ReturnType<typeof seedInitialData>>) {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      localDb = {
        stores: Array.isArray(parsed.stores) ? parsed.stores : initialData.initialStores,
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : initialData.initialUsers,
        categories: Array.isArray(parsed.categories) ? parsed.categories : initialData.initialCategories,
        products: Array.isArray(parsed.products) ? parsed.products : initialData.initialProducts,
        sales: Array.isArray(parsed.sales) ? parsed.sales : initialData.initialSales,
        audit_logs: Array.isArray(parsed.audit_logs) ? parsed.audit_logs : initialData.initialAuditLogs,
        plans: Array.isArray(parsed.plans) && parsed.plans.length > 0 ? parsed.plans : initialData.initialPlans,
        payments: Array.isArray(parsed.payments) ? parsed.payments : initialData.initialPayments,
        support_tickets: Array.isArray(parsed.support_tickets) ? parsed.support_tickets : initialData.initialSupportTickets,
        settings: parsed.settings || initialData.initialSettings,
      };
      return;
    }
  } catch (err) {
    console.warn('Could not read existing local MongoDB file:', err);
  }

  localDb = {
    stores: initialData.initialStores,
    users: initialData.initialUsers,
    categories: initialData.initialCategories,
    products: initialData.initialProducts,
    sales: initialData.initialSales,
    audit_logs: initialData.initialAuditLogs,
    plans: initialData.initialPlans,
    payments: initialData.initialPayments,
    support_tickets: initialData.initialSupportTickets,
    settings: initialData.initialSettings,
  };
  saveLocalDb();
}

export async function resetDatabaseToCleanSeed() {
  const initialData = await seedInitialData();
  localDb = {
    stores: initialData.initialStores,
    users: initialData.initialUsers,
    categories: initialData.initialCategories,
    products: initialData.initialProducts,
    sales: initialData.initialSales,
    audit_logs: initialData.initialAuditLogs,
    plans: initialData.initialPlans,
    payments: initialData.initialPayments,
    support_tickets: initialData.initialSupportTickets,
    settings: initialData.initialSettings,
  };
  saveLocalDb();
  cache.clear();
  return localDb;
}

export async function initDatabase() {
  const initialData = await seedInitialData();

  if (MONGODB_URI && MONGODB_URI.startsWith('mongodb')) {
    try {
      console.log(`[MongoDB] Attempting connection to MongoDB URI...`);
      mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 5000,
        maxPoolSize: 50,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
      });
      await mongoClient.connect();
      nativeDb = mongoClient.db(DB_NAME);
      isUsingRemoteMongo = true;
      dbConnected = true;
      console.log(`[MongoDB] Connected successfully to remote MongoDB database: ${DB_NAME}`);
      try {
        await nativeDb.collection('audit_logs').createIndex({ timestamp: -1 });
        await nativeDb.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
        await nativeDb.collection('users').createIndex({ storeId: 1, role: 1 });
        await nativeDb.collection('stores').createIndex({ ownerId: 1 });
        await nativeDb.collection('products').createIndex({ storeId: 1, barcode: 1 });
        await nativeDb.collection('sales').createIndex({ storeId: 1, createdAt: -1 });
      } catch {
        // Ignore index creation error
      }

      // Check if remote users collection is empty, and auto-seed initial data
      try {
        const usersCount = await nativeDb.collection('users').countDocuments();
        if (usersCount === 0) {
          console.log(`[MongoDB] Database "${DB_NAME}" is empty. Auto-seeding initial SuperAdmin and plans...`);
          await nativeDb.collection('users').insertMany(initialData.initialUsers as any);
          if (initialData.initialPlans.length > 0) {
            await nativeDb.collection('plans').insertMany(initialData.initialPlans as any);
          }
          await nativeDb.collection('settings').insertOne(initialData.initialSettings as any);
          console.log(`[MongoDB] Auto-seed complete.`);
        }
      } catch (seedErr) {
        console.warn('[MongoDB] Auto-seed check failed:', seedErr);
      }

      // Run initial 2-day purge
      await AuditRepo.purgeOlderThanDays(2).catch(() => {});
      return;
    } catch (err) {
      console.warn(`[MongoDB] Remote connection failed: ${(err as Error).message}. Falling back to multi-tenant storage.`);
    }
  }

  await loadLocalDb(initialData);
  isUsingRemoteMongo = false;
  dbConnected = true;
  console.log(`[MongoDB] Running on multi-tenant MongoDB document storage (data/mongodb.json).`);

  // Run initial 2-day purge for embedded database
  await AuditRepo.purgeOlderThanDays(2).catch(() => {});
}

export function getDbStatus(storeId?: string) {
  const cacheStats = cache.getStats();
  return {
    mode: (isUsingRemoteMongo ? 'remote-mongodb' : 'embedded-mongodb') as 'remote-mongodb' | 'embedded-mongodb',
    connected: dbConnected,
    database: DB_NAME,
    storeId: storeId || 'all',
    collections: {
      stores: localDb.stores.length,
      users: storeId ? localDb.users.filter((u) => u.storeId === storeId).length : localDb.users.length,
      categories: storeId ? localDb.categories.filter((c) => c.storeId === storeId).length : localDb.categories.length,
      products: storeId ? localDb.products.filter((p) => p.storeId === storeId).length : localDb.products.length,
      sales: storeId ? localDb.sales.filter((s) => s.storeId === storeId).length : localDb.sales.length,
      payments: (localDb.payments || []).length,
      plans: (localDb.plans || []).length,
      support_tickets: (localDb.support_tickets || []).length,
    },
    cache: cacheStats,
    optimizations: [
      'Single-Flight Query Deduplication (Zero Cache Stampede)',
      'In-Memory L1 Cache with TTL (<0.1ms read latency)',
      'Event-Driven Instant Cache Invalidation on Mutations',
      'Compound MongoDB Indexes (IXSCAN queries)',
      'Atomic Batch Stock Updates',
    ],
  };
}

export const StoreRepo = {
  async getStore(storeId: string): Promise<StoreDoc | null> {
    if (!storeId) return null;
    return cache.getOrSet(`store:${storeId}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const doc = await nativeDb.collection<any>('stores').findOne(buildIdQuery(storeId));
        return normalizeDoc<StoreDoc>(doc);
      }
      const local = localDb.stores.find((s) => s._id === storeId || (s as any).id === storeId) || null;
      return normalizeDoc<StoreDoc>(local);
    }, 60000);
  },

  async updateStore(storeId: string, updates: Partial<StoreDoc>): Promise<StoreDoc | null> {
    const oldStore = await StoreRepo.getStore(storeId);
    const { _id: _, ownerId: __, ...safeUpdates } = updates as any;
    const updatedAt = new Date().toISOString();
    let updatedStore: StoreDoc | null = null;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('stores').updateOne(buildIdQuery(storeId), { $set: { ...safeUpdates, updatedAt } });
      const freshDoc = await nativeDb.collection<any>('stores').findOne(buildIdQuery(storeId));
      updatedStore = normalizeDoc<StoreDoc>(freshDoc);
    } else {
      const idx = localDb.stores.findIndex((s) => s._id === storeId || (s as any).id === storeId);
      if (idx !== -1) {
        localDb.stores[idx] = { ...localDb.stores[idx], ...safeUpdates, updatedAt };
        saveLocalDb();
        updatedStore = normalizeDoc<StoreDoc>(localDb.stores[idx]);
      }
    }

    cache.invalidateStores(storeId);

    if (updatedStore) {
      if (safeUpdates.status && safeUpdates.status !== oldStore?.status) {
        if (safeUpdates.status === 'suspended') {
          emitAccountSuspended(storeId, 'Your account has been suspended. Please contact support.');
        } else if (safeUpdates.status === 'active') {
          emitAccountActivated(storeId);
        }
      }

      if (safeUpdates.subscription) {
        const sub = safeUpdates.subscription as StoreSubscription;
        if (sub.paymentStatus === 'approved' && oldStore?.subscription?.paymentStatus !== 'approved') {
          emitPaymentApproved(storeId, sub.lastPaymentId || `pay_${Date.now()}`, sub);
        } else if (sub.status === 'expired' && oldStore?.subscription?.status !== 'expired') {
          emitSubscriptionExpired(storeId);
        } else {
          emitSubscriptionUpdated(storeId, sub);
        }
      }
    }

    return updatedStore;
  },

  async suspendStore(storeId: string, reason?: string, adminUser?: { id: string; name: string }): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const currentSub = store.subscription || {
      status: 'active' as const,
      plan: 'Professional',
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      billingCycle: 'monthly' as const,
      amount: 999,
    };

    const updated = await StoreRepo.updateStore(storeId, {
      status: 'suspended',
      subscription: { ...currentSub, status: 'suspended' },
    });

    await AuditRepo.log({
      storeId,
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: adminUser?.name || 'Super Admin',
      action: 'SHOP_SUSPENDED',
      targetStoreId: storeId,
      previousValue: { status: store.status },
      newValue: { status: 'suspended', reason: reason || 'Suspended by administrator.' },
      details: `Admin suspended store "${store.name}" (${storeId})`,
    });

    cache.invalidateStores(storeId);
    emitAccountSuspended(storeId, reason || 'Your account has been suspended. Please contact support.');
    return updated;
  },

  async activateStore(storeId: string, adminUser?: { id: string; name: string }): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const currentSub = store.subscription || {
      status: 'active' as const,
      plan: 'Professional',
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      billingCycle: 'monthly' as const,
      amount: 999,
    };

    const updated = await StoreRepo.updateStore(storeId, {
      status: 'active',
      subscription: { ...currentSub, status: 'active' },
    });

    await AuditRepo.log({
      storeId,
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: adminUser?.name || 'Super Admin',
      action: 'SHOP_ACTIVATED',
      targetStoreId: storeId,
      previousValue: { status: store.status },
      newValue: { status: 'active' },
      details: `Admin activated store "${store.name}" (${storeId})`,
    });

    cache.invalidateStores(storeId);
    emitAccountActivated(storeId);
    return updated;
  },

  async changeSubscriptionStatus(
    storeId: string,
    status: 'active' | 'pending' | 'expired' | 'cancelled',
    adminUser?: { id: string; name: string }
  ): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const currentSub = store.subscription || {
      plan: 'Professional',
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      billingCycle: 'monthly' as const,
      amount: 999,
      status: 'active',
    };

    const updatedSub: StoreSubscription = { ...currentSub, status };
    const storeUpdates: Partial<StoreDoc> = { subscription: updatedSub };
    if (status === 'active' && store.status === 'suspended') {
      storeUpdates.status = 'active';
    }

    const updated = await StoreRepo.updateStore(storeId, storeUpdates);

    await AuditRepo.log({
      storeId,
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: adminUser?.name || 'Super Admin',
      action: 'SUBSCRIPTION_STATUS_CHANGED',
      targetStoreId: storeId,
      previousValue: { status: currentSub.status },
      newValue: { status },
      details: `Admin changed subscription status for "${store.name}" to "${status}"`,
    });

    cache.invalidateStores(storeId);
    if (status === 'active') {
      emitAccountActivated(storeId);
      emitSubscriptionActivated(storeId, updatedSub);
    } else if (status === 'expired') {
      emitSubscriptionExpired(storeId);
    }
    return updated;
  },

  async approvePayment(storeId: string, paymentId?: string, months = 1): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const payId = paymentId || `pay_${Date.now()}`;
    const newExpiry = new Date(Date.now() + months * 30 * 86400000).toISOString();
    const isUpgradingFromTrial = (store.subscription?.plan || '').toLowerCase().includes('trial');
    const targetPlan = isUpgradingFromTrial ? 'Standard' : (store.subscription?.plan || 'Standard');
    const newSub: StoreSubscription = {
      plan: targetPlan,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: newExpiry,
      expiryDate: newExpiry,
      billingCycle: months >= 12 ? 'yearly' : 'monthly',
      amount: 999,
      staffLimit: 10,
      productLimit: 500,
      lastPaymentId: payId,
      paymentStatus: 'approved',
    };

    const updated = await StoreRepo.updateStore(storeId, { status: 'active', subscription: newSub });
    cache.invalidateStores(storeId);
    emitPaymentApproved(storeId, payId, newSub);
    return updated;
  },

  async expireSubscription(storeId: string): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const expiredSub: StoreSubscription = {
      ...(store.subscription || {
        plan: 'Professional',
        startDate: new Date().toISOString(),
        billingCycle: 'monthly',
        amount: 999,
      }),
      status: 'expired',
      expiryDate: new Date(Date.now() - 86400000).toISOString(),
      endDate: new Date(Date.now() - 86400000).toISOString(),
      paymentStatus: 'pending',
    };

    const updated = await StoreRepo.updateStore(storeId, { subscription: expiredSub });
    cache.invalidateStores(storeId);
    emitSubscriptionExpired(storeId);
    return updated;
  },

  async extendSubscription(storeId: string, days = 30, adminUser?: { id: string; name: string }): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const currentExpiry = store.subscription?.expiryDate ? new Date(store.subscription.expiryDate).getTime() : 0;
    const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
    const newExpiry = new Date(baseTime + days * 86400000).toISOString();

    const updatedSub: StoreSubscription = {
      ...(store.subscription || {
        plan: 'Professional',
        startDate: new Date().toISOString(),
        billingCycle: 'monthly',
        amount: 999,
      }),
      status: 'active',
      endDate: newExpiry,
      expiryDate: newExpiry,
      paymentStatus: 'approved',
    };

    const updated = await StoreRepo.updateStore(storeId, { status: 'active', subscription: updatedSub });

    await AuditRepo.log({
      storeId,
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: adminUser?.name || 'Super Admin',
      action: 'SUBSCRIPTION_EXTENDED',
      targetStoreId: storeId,
      newValue: { expiryDate: newExpiry, days },
      details: `Admin extended subscription by ${days} days for store "${store.name}"`,
    });

    cache.invalidateStores(storeId);
    emitAccountActivated(storeId);
    emitSubscriptionUpdated(storeId, updatedSub);
    return updated;
  },

  async deleteStore(storeId: string): Promise<boolean> {
    cache.invalidateStores(storeId);
    cache.invalidatePayments();
    cache.invalidateUsers(storeId);
    cache.invalidateProducts(storeId);
    cache.invalidateCategories(storeId);
    cache.del(`sales:${storeId}`);
    cache.del(`store:${storeId}`);
    cache.del(`store:details:${storeId}`);

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('stores').deleteOne(buildIdQuery(storeId));
      await nativeDb.collection<any>('users').deleteMany(buildStoreQuery(storeId));
      await nativeDb.collection<any>('products').deleteMany(buildStoreQuery(storeId));
      await nativeDb.collection<any>('categories').deleteMany(buildStoreQuery(storeId));
      await nativeDb.collection<any>('sales').deleteMany(buildStoreQuery(storeId));
      await nativeDb.collection<any>('payments').deleteMany(buildStoreQuery(storeId));
      await nativeDb.collection<any>('support_tickets').deleteMany(buildStoreQuery(storeId));
      return true;
    }

    const before = localDb.stores.length;
    localDb.stores = localDb.stores.filter((s) => !(s._id === storeId || (s as any).id === storeId));
    localDb.users = (localDb.users || []).filter((u) => u.storeId !== storeId);
    localDb.products = (localDb.products || []).filter((p) => p.storeId !== storeId);
    localDb.categories = (localDb.categories || []).filter((c) => c.storeId !== storeId);
    localDb.sales = (localDb.sales || []).filter((s) => s.storeId !== storeId);
    localDb.payments = (localDb.payments || []).filter((pay) => pay.storeId !== storeId);
    localDb.support_tickets = (localDb.support_tickets || []).filter((st) => st.storeId !== storeId);
    saveLocalDb();
    return localDb.stores.length < before;
  },

  async getAllStores(): Promise<StoreDoc[]> {
    return cache.getOrSet('admin:stores:all', async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const docs = await nativeDb.collection<any>('stores').find({}).toArray();
        return docs.map((d: any) => normalizeDoc<StoreDoc>(d));
      }
      return localDb.stores.map((s) => normalizeDoc<StoreDoc>(s));
    }, 60000);
  },

  async getStoreWithDetails(storeId: string): Promise<any> {
    return cache.getOrSet(`store:details:${storeId}`, async () => {
      const store = await StoreRepo.getStore(storeId);
      if (!store) return null;

      const allUsers = await UsersRepo.getAll(storeId);
      const owner = (await UsersRepo.findById(store.ownerId)) || allUsers.find((u) => u.role === 'Owner' || u.role === 'SuperAdmin') || null;
      const staff = allUsers.filter((u) => u._id !== owner?._id);
      const payments = await PaymentsRepo.getAll({ storeId });
      const recentActivity = await AuditRepo.getRecent(storeId, 20);
      const sales = await SalesRepo.getAll(storeId);
      const products = await ProductsRepo.getAll(storeId);

      const totalSales = sales.reduce((sum, s) => sum + (s.status !== 'refunded' ? s.total : 0), 0);

      return {
        store,
        owner,
        staff,
        payments,
        recentActivity,
        metrics: {
          totalSales30Days: totalSales,
          totalOrders: sales.length,
          totalCustomers: 0,
          totalProducts: products.length,
        },
      };
    }, 45000);
  },

  async changePlan(storeId: string, planName: string, planId?: string, adminUser?: { id: string; name: string }): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const isTrial = planName.toLowerCase().includes('trial');
    const amount = isTrial ? 0 : 999;

    const currentSub = store.subscription || {
      status: 'active' as const,
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      billingCycle: 'monthly' as const,
      amount: 999,
    };

    const updatedSub: StoreSubscription = {
      ...currentSub,
      plan: planName,
      planId: planId || currentSub.planId,
      amount,
      status: 'active',
    };

    const updated = await StoreRepo.updateStore(storeId, { subscription: updatedSub });

    await AuditRepo.log({
      storeId,
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: adminUser?.name || 'Super Admin',
      action: 'PLAN_CHANGED',
      targetStoreId: storeId,
      details: `Admin changed subscription plan for "${store.name}" to "${planName}"`,
    });

    cache.invalidateStores(storeId);
    emitSubscriptionUpdated(storeId, updatedSub);
    return updated;
  },

  async createStoreWithAdmin(payload: {
    name: string;
    branch?: string;
    storeType: 'grocery' | 'fashion' | 'electronics' | 'pharmacy' | 'restaurant' | 'general';
    phone: string;
    address?: string;
    tagline?: string;
    currency?: string;
    taxRate?: number;
    receiptFooter?: string;
    printerSize?: '80mm' | '58mm';
    ownerName: string;
    ownerEmail?: string;
    ownerPhone?: string;
    ownerPassword?: string;
    pin?: string;
    plan?: string;
    billingCycle?: 'monthly' | 'yearly';
    seedProducts?: boolean;
  }): Promise<{ store: StoreDoc; owner: UserDoc }> {
    const storeId = `store_${Date.now()}`;
    const ownerId = `usr_${Date.now()}`;
    const salt = await bcrypt.genSalt(10);
    const rawPass = (payload.ownerPassword && payload.ownerPassword.trim()) ? payload.ownerPassword.trim() : '123456';
    const rawPin = (payload.pin && payload.pin.trim()) ? payload.pin.trim() : '1234';
    const passwordHash = await bcrypt.hash(rawPass, salt);
    const pinHash = await bcrypt.hash(rawPin, salt);

    const rawPlan = payload.plan || 'Trial';
    const isTrial = rawPlan.toLowerCase().includes('trial');
    const planName = isTrial ? 'Trial' : (rawPlan || 'Standard');
    const billingCycle = isTrial ? '14_days' : (payload.billingCycle || 'monthly');
    const stType = payload.storeType || 'grocery';
    let defaultAmount = isTrial ? 0 : 999;
    if (billingCycle === 'yearly' && !isTrial) defaultAmount = defaultAmount * 10;
    const durationDays = isTrial ? 14 : (billingCycle === 'yearly' ? 365 : 30);

    const newStore: StoreDoc = {
      _id: storeId,
      ownerId,
      name: payload.name.trim(),
      branch: (payload.branch || 'Main Branch').trim(),
      tagline: (payload.tagline || 'Retail POS Store').trim(),
      phone: payload.phone.trim(),
      address: (payload.address || 'Dhaka, Bangladesh').trim(),
      currency: payload.currency || '৳',
      taxRate: payload.taxRate !== undefined ? payload.taxRate : (stType === 'grocery' ? 0 : 5),
      receiptFooter: payload.receiptFooter || `Thank you for shopping with ${payload.name.trim()}! Please visit again.`,
      printerSize: payload.printerSize || '80mm',
      storeType: stType,
      status: 'active',
      subscription: {
        status: 'active',
        plan: planName,
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + durationDays * 86400000).toISOString(),
        billingCycle,
        amount: defaultAmount,
        paymentStatus: 'approved',
        staffLimit: 10,
        productLimit: 500,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ownerPhoneNum = (payload.ownerPhone || payload.phone).trim();
    const finalOwnerEmail = (payload.ownerEmail && payload.ownerEmail.trim())
      ? payload.ownerEmail.trim().toLowerCase()
      : `owner_${ownerPhoneNum.replace(/\D/g, '') || Date.now()}@shoppos.com`;

    const newOwner: UserDoc = {
      _id: ownerId,
      storeId,
      name: payload.ownerName.trim(),
      email: finalOwnerEmail,
      phone: ownerPhoneNum,
      passwordHash,
      pinHash,
      role: 'Owner',
      permissions: [
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
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    // Starter categories & sample products
    const initialStoreCategories: CategoryDoc[] = [];
    const initialStoreProducts: ProductDoc[] = [];

    if (payload.seedProducts !== false) {
      if (stType === 'grocery') {
        const catNames = ['Grocery', 'Beverages', 'Snacks', 'Household'];
        catNames.forEach((cat) => {
          initialStoreCategories.push({
            _id: `cat_${storeId}_${cat.toLowerCase()}`,
            storeId,
            name: cat,
            createdAt: new Date().toISOString(),
          });
        });

        const samples = [
          { name: 'Miniket Rice (5KG)', category: 'Grocery', price: 420, costPrice: 380, stock: 40, unit: '5KG', sku: 'GRO-RC-01', barcode: '89010101', iconType: 'rice', color: '#F59E0B' },
          { name: 'Pure Mustard Oil (1L)', category: 'Grocery', price: 260, costPrice: 225, stock: 35, unit: '1L', sku: 'GRO-OIL-02', barcode: '89010102', iconType: 'oil', color: '#EAB308' },
          { name: 'Refined White Sugar (1KG)', category: 'Grocery', price: 135, costPrice: 115, stock: 50, unit: '1KG', sku: 'GRO-SGR-03', barcode: '89010103', iconType: 'sugar', color: '#06B6D4' },
          { name: 'Red Lentils / Masoor Dal (1KG)', category: 'Grocery', price: 140, costPrice: 120, stock: 30, unit: '1KG', sku: 'GRO-LNT-04', barcode: '89010104', iconType: 'lentil', color: '#EA580C' },
          { name: 'Premium Black Tea (400G)', category: 'Beverages', price: 220, costPrice: 185, stock: 25, unit: '400G', sku: 'BEV-TEA-05', barcode: '89010105', iconType: 'tea', color: '#15803D' },
          { name: 'Crispy Toast Biscuits (350G)', category: 'Snacks', price: 65, costPrice: 50, stock: 60, unit: 'Pack', sku: 'SNK-BSC-06', barcode: '89010106', iconType: 'biscuit', color: '#D97706' },
          { name: 'Iodized Table Salt (1KG)', category: 'Household', price: 42, costPrice: 32, stock: 75, unit: '1KG', sku: 'GRO-SLT-07', barcode: '89010107', iconType: 'salt', color: '#2563EB' },
        ];

        samples.forEach((s, idx) => {
          initialStoreProducts.push({
            _id: `prod_${storeId}_${idx + 1}`,
            storeId,
            name: s.name,
            sku: s.sku,
            barcode: s.barcode,
            category: s.category,
            storeType: 'grocery',
            costPrice: s.costPrice,
            price: s.price,
            stock: s.stock,
            lowStockThreshold: 10,
            unit: s.unit,
            iconType: s.iconType,
            color: s.color,
            createdAt: new Date().toISOString(),
          });
        });
      } else if (stType === 'fashion') {
        const catNames = ['Men Clothing', 'Women Fashion', 'Accessories', 'Footwear'];
        catNames.forEach((cat) => {
          initialStoreCategories.push({
            _id: `cat_${storeId}_${cat.toLowerCase().replace(/\s+/g, '_')}`,
            storeId,
            name: cat,
            createdAt: new Date().toISOString(),
          });
        });

        const samples = [
          { name: 'Casual Cotton Shirt', category: 'Men Clothing', price: 1250, costPrice: 850, stock: 25, unit: 'Pcs', sku: 'FAS-SHT-01', barcode: '89020101', iconType: 'shirt', color: '#3B82F6' },
          { name: 'Slim Fit Denim Jeans', category: 'Men Clothing', price: 1750, costPrice: 1200, stock: 30, unit: 'Pcs', sku: 'FAS-JNS-02', barcode: '89020102', iconType: 'jeans', color: '#1E3A8A' },
          { name: 'Embroidered Cotton Kurti', category: 'Women Fashion', price: 1650, costPrice: 1100, stock: 20, unit: 'Pcs', sku: 'FAS-KRT-03', barcode: '89020103', iconType: 'dress', color: '#EC4899' },
          { name: 'Genuine Leather Wallet', category: 'Accessories', price: 750, costPrice: 450, stock: 40, unit: 'Pcs', sku: 'FAS-WLT-04', barcode: '89020104', iconType: 'wallet', color: '#78350F' },
          { name: 'Cotton Polo T-Shirt', category: 'Men Clothing', price: 590, costPrice: 380, stock: 45, unit: 'Pcs', sku: 'FAS-POL-05', barcode: '89020105', iconType: 'tshirt', color: '#10B981' },
        ];

        samples.forEach((s, idx) => {
          initialStoreProducts.push({
            _id: `prod_${storeId}_${idx + 1}`,
            storeId,
            name: s.name,
            sku: s.sku,
            barcode: s.barcode,
            category: s.category,
            storeType: 'fashion',
            costPrice: s.costPrice,
            price: s.price,
            stock: s.stock,
            lowStockThreshold: 5,
            unit: s.unit,
            iconType: s.iconType,
            color: s.color,
            createdAt: new Date().toISOString(),
          });
        });
      } else if (stType === 'electronics') {
        const catNames = ['Smartphones', 'Audio & Sound', 'Chargers & Power', 'Accessories'];
        catNames.forEach((cat) => {
          initialStoreCategories.push({
            _id: `cat_${storeId}_${cat.toLowerCase().replace(/\s+/g, '_')}`,
            storeId,
            name: cat,
            createdAt: new Date().toISOString(),
          });
        });

        const samples = [
          { name: '20W PD Fast Charger (Type-C)', category: 'Chargers & Power', price: 650, costPrice: 420, stock: 35, unit: 'Pcs', sku: 'ELC-CHG-01', barcode: '89030101', iconType: 'charger', color: '#6366F1' },
          { name: 'Wireless Bluetooth Earbuds (TWS)', category: 'Audio & Sound', price: 1450, costPrice: 980, stock: 20, unit: 'Pcs', sku: 'ELC-EAR-02', barcode: '89030102', iconType: 'headphones', color: '#8B5CF6' },
          { name: '10000mAh Slim Power Bank', category: 'Chargers & Power', price: 1650, costPrice: 1200, stock: 15, unit: 'Pcs', sku: 'ELC-PWR-03', barcode: '89030103', iconType: 'battery', color: '#EC4899' },
          { name: 'Braided Type-C Fast Cable (1.2M)', category: 'Accessories', price: 250, costPrice: 140, stock: 50, unit: 'Pcs', sku: 'ELC-CBL-04', barcode: '89030104', iconType: 'cable', color: '#14B8A6' },
          { name: 'Smart Fitness Band AMOLED', category: 'Accessories', price: 2450, costPrice: 1800, stock: 12, unit: 'Pcs', sku: 'ELC-WTC-05', barcode: '89030105', iconType: 'watch', color: '#F97316' },
        ];

        samples.forEach((s, idx) => {
          initialStoreProducts.push({
            _id: `prod_${storeId}_${idx + 1}`,
            storeId,
            name: s.name,
            sku: s.sku,
            barcode: s.barcode,
            category: s.category,
            storeType: 'electronics',
            costPrice: s.costPrice,
            price: s.price,
            stock: s.stock,
            lowStockThreshold: 5,
            unit: s.unit,
            iconType: s.iconType,
            color: s.color,
            createdAt: new Date().toISOString(),
          });
        });
      } else {
        const catNames = ['General', 'Best Sellers', 'New Arrivals'];
        catNames.forEach((cat) => {
          initialStoreCategories.push({
            _id: `cat_${storeId}_${cat.toLowerCase().replace(/\s+/g, '_')}`,
            storeId,
            name: cat,
            createdAt: new Date().toISOString(),
          });
        });

        const samples = [
          { name: 'Standard Retail Product A', category: 'General', price: 250, costPrice: 180, stock: 50, unit: 'Pcs', sku: 'GEN-01', barcode: '89040101', iconType: 'box', color: '#3B82F6' },
          { name: 'Premium Retail Product B', category: 'Best Sellers', price: 550, costPrice: 400, stock: 30, unit: 'Pcs', sku: 'GEN-02', barcode: '89040102', iconType: 'box', color: '#10B981' },
          { name: 'Economy Retail Product C', category: 'New Arrivals', price: 120, costPrice: 85, stock: 60, unit: 'Pcs', sku: 'GEN-03', barcode: '89040103', iconType: 'box', color: '#F59E0B' },
        ];

        samples.forEach((s, idx) => {
          initialStoreProducts.push({
            _id: `prod_${storeId}_${idx + 1}`,
            storeId,
            name: s.name,
            sku: s.sku,
            barcode: s.barcode,
            category: s.category,
            storeType: (stType as any),
            costPrice: s.costPrice,
            price: s.price,
            stock: s.stock,
            lowStockThreshold: 5,
            unit: s.unit,
            iconType: s.iconType,
            color: s.color,
            createdAt: new Date().toISOString(),
          });
        });
      }
    } else {
      initialStoreCategories.push({
        _id: `cat_${storeId}_general`,
        storeId,
        name: 'General',
        createdAt: new Date().toISOString(),
      });
    }

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection('stores').insertOne(newStore as any);
      await nativeDb.collection('users').insertOne(newOwner as any);
      if (initialStoreCategories.length > 0) {
        await nativeDb.collection('categories').insertMany(initialStoreCategories as any);
      }
      if (initialStoreProducts.length > 0) {
        await nativeDb.collection('products').insertMany(initialStoreProducts as any);
      }
    } else {
      localDb.stores.unshift(newStore);
      localDb.users.unshift(newOwner);
      if (initialStoreCategories.length > 0) {
        localDb.categories = (localDb.categories || []).concat(initialStoreCategories);
      }
      if (initialStoreProducts.length > 0) {
        localDb.products = (localDb.products || []).concat(initialStoreProducts);
      }
      saveLocalDb();
    }

    emitAccountActivated(storeId);
    return { store: newStore, owner: newOwner };
  },
};

export const UsersRepo = {
  async findByIdentifier(identifier: string): Promise<UserDoc | null> {
    const clean = identifier.trim();
    const digitsOnly = clean.replace(/[\s\-\(\)\+]/g, '');

    if (isUsingRemoteMongo && nativeDb) {
      const orClauses: any[] = [
        { email: { $regex: new RegExp(`^${clean}$`, 'i') } },
        { phone: clean },
      ];
      if (digitsOnly.length >= 7) {
        orClauses.push({ phone: { $regex: new RegExp(digitsOnly.slice(-10) + '$') } });
      }
      const doc = await nativeDb.collection<any>('users').findOne({ $or: orClauses });
      return normalizeDoc<UserDoc>(doc);
    }

    const doc = localDb.users.find((u) => {
      if (u.email && u.email.toLowerCase() === clean.toLowerCase()) return true;
      if (u.phone) {
        if (u.phone.trim() === clean) return true;
        const uDigits = u.phone.replace(/[\s\-\(\)\+]/g, '');
        if (digitsOnly.length >= 7 && (uDigits.endsWith(digitsOnly) || digitsOnly.endsWith(uDigits))) return true;
      }
      return false;
    }) || null;

    return normalizeDoc<UserDoc>(doc);
  },

  async findByEmail(email: string): Promise<UserDoc | null> {
    return UsersRepo.findByIdentifier(email);
  },

  async findByPin(pin: string, storeId?: string): Promise<UserDoc | null> {
    let candidateUsers: UserDoc[] = [];
    if (isUsingRemoteMongo && nativeDb) {
      const filter: any = { status: 'active' };
      if (storeId) filter.storeId = storeId;
      candidateUsers = await nativeDb.collection<any>('users').find(filter).toArray();
    } else {
      candidateUsers = localDb.users.filter((u) => u.status === 'active' && (!storeId || u.storeId === storeId));
    }

    for (const candidate of candidateUsers) {
      if (candidate.pinHash) {
        const matches = await bcrypt.compare(pin, candidate.pinHash);
        if (matches) return normalizeDoc<UserDoc>(candidate);
      } else if ((candidate as any).pin && (candidate as any).pin === pin) {
        return normalizeDoc<UserDoc>(candidate);
      }
    }
    return null;
  },

  async findById(id: string): Promise<UserDoc | null> {
    return cache.getOrSet(`user:${id}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const doc = await nativeDb.collection<any>('users').findOne(buildIdQuery(id));
        return normalizeDoc<UserDoc>(doc);
      }
      const doc = localDb.users.find((u) => u._id === id || (u as any).id === id) || null;
      return normalizeDoc<UserDoc>(doc);
    }, 60000);
  },

  async findByIds(ids: string[]): Promise<UserDoc[]> {
    if (!ids || ids.length === 0) return [];
    if (isUsingRemoteMongo && nativeDb) {
      const docs = await nativeDb.collection<any>('users').find({
        $or: [{ _id: { $in: ids } }, { id: { $in: ids } }],
      }).toArray();
      return docs.map((d: any) => normalizeDoc<UserDoc>(d));
    }
    const idSet = new Set(ids);
    return localDb.users
      .filter((u) => idSet.has(u._id) || idSet.has((u as any).id))
      .map((u) => normalizeDoc<UserDoc>(u));
  },

  async getAll(storeId: string): Promise<Omit<UserDoc, 'passwordHash' | 'pinHash'>[]> {
    return cache.getOrSet(`users:${storeId}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const users = await nativeDb.collection<any>('users').find(buildStoreQuery(storeId)).toArray();
        return users.map(({ passwordHash: _, pinHash: __, ...rest }: any) => normalizeDoc(rest));
      }
      return localDb.users
        .filter((u) => u.storeId === storeId)
        .map(({ passwordHash: _, pinHash: __, ...rest }) => normalizeDoc(rest));
    }, 60000);
  },

  async create(user: Omit<UserDoc, '_id' | 'createdAt'>): Promise<UserDoc> {
    const pw = (user as any).passwordHash || (user as any).password || '';
    const newDoc: UserDoc = {
      ...user,
      password: pw,
      passwordHash: pw,
      _id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('users').insertOne(newDoc);
    } else {
      localDb.users.push(newDoc);
      saveLocalDb();
    }
    cache.invalidateUsers(user.storeId);
    return normalizeDoc<UserDoc>(newDoc);
  },

  async update(storeId: string, id: string, updates: Partial<UserDoc>): Promise<UserDoc | null> {
    const { _id: _, storeId: __, ...safeUpdates } = updates as any;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('users').updateOne(
        { ...buildIdQuery(id) },
        { $set: safeUpdates }
      );
      cache.invalidateUsers(storeId);
      cache.del(`user:${id}`);
      return UsersRepo.findById(id);
    }

    const idx = localDb.users.findIndex((u) => (u._id === id || (u as any).id === id));
    if (idx === -1) return null;

    localDb.users[idx] = { ...localDb.users[idx], ...safeUpdates };
    saveLocalDb();
    cache.invalidateUsers(storeId);
    cache.del(`user:${id}`);
    return normalizeDoc<UserDoc>(localDb.users[idx]);
  },

  async delete(storeId: string, id: string): Promise<boolean> {
    cache.invalidateUsers(storeId);
    cache.del(`user:${id}`);

    if (isUsingRemoteMongo && nativeDb) {
      const res = await nativeDb.collection<any>('users').deleteOne({
        ...buildIdQuery(id),
      });
      return (res.deletedCount || 0) > 0;
    }

    const lenBefore = localDb.users.length;
    localDb.users = localDb.users.filter((u) => !(u._id === id || (u as any).id === id));
    saveLocalDb();
    return localDb.users.length < lenBefore;
  },

  async updateUserStatus(storeId: string, id: string, status: 'active' | 'suspended' | 'inactive', adminUser?: { id: string; name: string }): Promise<UserDoc | null> {
    const existing = await UsersRepo.findById(id);
    if (!existing) return null;

    const targetStore = existing.storeId || storeId;
    const updated = await UsersRepo.update(targetStore, id, { status: status as any });
    if (!updated) return null;

    await AuditRepo.log({
      storeId: targetStore,
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: adminUser?.name || 'Super Admin',
      action: status === 'active' ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      targetStoreId: targetStore,
      targetUserId: id,
      details: `Admin changed status of staff "${existing.name}" to "${status}"`,
    });

    if (status === 'active') {
      emitUserActivated(id, targetStore);
    } else {
      emitUserSuspended(id, targetStore, 'Your user account has been suspended by the administrator.');
    }
    return updated;
  },

  async updateUserRoleAndPermissions(storeId: string, id: string, role: string, permissions: string[], adminUser?: { id: string; name: string }): Promise<UserDoc | null> {
    const existing = await UsersRepo.findById(id);
    if (!existing) return null;

    const targetStore = existing.storeId || storeId;
    const updated = await UsersRepo.update(targetStore, id, { role: role as any, permissions });
    if (!updated) return null;

    await AuditRepo.log({
      storeId: targetStore,
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: adminUser?.name || 'Super Admin',
      action: 'USER_ROLE_CHANGED',
      targetStoreId: targetStore,
      targetUserId: id,
      details: `Admin changed role of staff "${existing.name}" to "${role}"`,
    });

    emitUserUpdated(id, targetStore, { _id: id, role, permissions, name: updated.name, email: updated.email });
    return updated;
  },
};

export async function enforcePlanLimits(
  storeId: string,
  type: 'products' | 'staff'
): Promise<{ allowed: boolean; limit: number; current: number; message?: string }> {
  const store = await StoreRepo.getStore(storeId);
  if (!store) {
    return { allowed: false, limit: 0, current: 0, message: 'Store context not found.' };
  }

  const sub = store.subscription;
  if (type === 'products') {
    const limit = sub?.productLimit !== undefined ? sub.productLimit : 500;
    if (limit === -1) return { allowed: true, limit, current: 0 };

    const currentProducts = await ProductsRepo.getAll(storeId);
    const count = currentProducts.length;

    if (count >= limit) {
      return {
        allowed: false,
        limit,
        current: count,
        message: `Plan product limit reached (${count}/${limit} products). Maximum ${limit} products allowed.`,
      };
    }
    return { allowed: true, limit, current: count };
  } else {
    const limit = sub?.staffLimit !== undefined ? sub.staffLimit : 10;
    if (limit === -1) return { allowed: true, limit, current: 0 };

    const currentUsers = await UsersRepo.getAll(storeId);
    const count = currentUsers.length;

    if (count >= limit) {
      return {
        allowed: false,
        limit,
        current: count,
        message: `Plan staff limit reached (${count}/${limit} staff). Upgrade your plan to add more.`,
      };
    }
    return { allowed: true, limit, current: count };
  }
}

export const CategoriesRepo = {
  async getAll(storeId: string): Promise<string[]> {
    if (!storeId) return [];
    return cache.getOrSet(`categories:${storeId}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const docs = await nativeDb.collection<any>('categories').find(buildStoreQuery(storeId)).toArray();
        return docs.map((d: any) => d.name);
      }
      return localDb.categories.filter((c) => c.storeId === storeId).map((c) => c.name);
    }, 120000);
  },

  async create(storeId: string, name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty');

    if (isUsingRemoteMongo && nativeDb) {
      const existing = await nativeDb.collection<any>('categories').findOne({
        ...buildStoreQuery(storeId),
        name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
      });
      if (!existing) {
        await nativeDb.collection<any>('categories').insertOne({
          _id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          storeId,
          name: trimmed,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      const exists = localDb.categories.some((c) => c.storeId === storeId && c.name.toLowerCase() === trimmed.toLowerCase());
      if (!exists) {
        localDb.categories.push({
          _id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          storeId,
          name: trimmed,
          createdAt: new Date().toISOString(),
        });
        saveLocalDb();
      }
    }
    cache.invalidateCategories(storeId);
    return trimmed;
  },

  async delete(storeId: string, name: string): Promise<boolean> {
    const trimmed = name.trim();
    const escaped = escapeRegex(trimmed);
    cache.invalidateCategories(storeId);

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('categories').deleteOne({
        ...buildStoreQuery(storeId),
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      });
      return true;
    }

    localDb.categories = localDb.categories.filter((c) => !(c.storeId === storeId && c.name.toLowerCase() === trimmed.toLowerCase()));
    saveLocalDb();
    return true;
  },
};

export const ProductsRepo = {
  async getAll(storeId: string): Promise<ProductDoc[]> {
    if (!storeId) return [];
    return cache.getOrSet(`products:${storeId}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const docs = await nativeDb.collection<any>('products').find(buildStoreQuery(storeId)).toArray();
        return docs.map((d: any) => normalizeDoc<ProductDoc>(d));
      }
      return localDb.products.filter((p) => p.storeId === storeId).map((p) => normalizeDoc<ProductDoc>(p));
    }, 60000);
  },

  async findById(storeId: string, id: string): Promise<ProductDoc | null> {
    return cache.getOrSet(`product:${storeId}:${id}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const doc = await nativeDb.collection<any>('products').findOne({ ...buildIdQuery(id), ...buildStoreQuery(storeId) });
        return normalizeDoc<ProductDoc>(doc);
      }
      const doc = localDb.products.find((p) => (p._id === id || (p as any).id === id) && p.storeId === storeId) || null;
      return normalizeDoc<ProductDoc>(doc);
    }, 60000);
  },

  async create(prod: Omit<ProductDoc, '_id'>): Promise<ProductDoc> {
    const existingProducts = await ProductsRepo.getAll(prod.storeId);
    if (prod.barcode && prod.barcode.trim()) {
      const barcodeTrimmed = prod.barcode.trim().toLowerCase();
      const duplicateBarcode = existingProducts.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === barcodeTrimmed
      );
      if (duplicateBarcode) {
        throw new Error(`A product with barcode "${prod.barcode.trim()}" already exists ("${duplicateBarcode.name}"). Barcode must be unique.`);
      }
    }

    if (prod.sku && prod.sku.trim()) {
      const skuTrimmed = prod.sku.trim().toLowerCase();
      const duplicateSku = existingProducts.find(
        (p) => p.sku && p.sku.trim().toLowerCase() === skuTrimmed
      );
      if (duplicateSku) {
        throw new Error(`A product with SKU "${prod.sku.trim()}" already exists ("${duplicateSku.name}"). SKU must be unique.`);
      }
    }

    const newDoc: ProductDoc = {
      ...prod,
      _id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('products').insertOne(newDoc);
    } else {
      localDb.products.push(newDoc);
      saveLocalDb();
    }
    cache.invalidateProducts(prod.storeId);
    return normalizeDoc<ProductDoc>(newDoc);
  },

  async update(storeId: string, id: string, updates: Partial<ProductDoc>): Promise<ProductDoc | null> {
    const existingProducts = await ProductsRepo.getAll(storeId);
    if (updates.barcode && updates.barcode.trim()) {
      const barcodeTrimmed = updates.barcode.trim().toLowerCase();
      const duplicateBarcode = existingProducts.find(
        (p) => (p._id !== id && (p as any).id !== id) && p.barcode && p.barcode.trim().toLowerCase() === barcodeTrimmed
      );
      if (duplicateBarcode) {
        throw new Error(`Another product with barcode "${updates.barcode.trim()}" already exists ("${duplicateBarcode.name}").`);
      }
    }

    if (updates.sku && updates.sku.trim()) {
      const skuTrimmed = updates.sku.trim().toLowerCase();
      const duplicateSku = existingProducts.find(
        (p) => (p._id !== id && (p as any).id !== id) && p.sku && p.sku.trim().toLowerCase() === skuTrimmed
      );
      if (duplicateSku) {
        throw new Error(`Another product with SKU "${updates.sku.trim()}" already exists ("${duplicateSku.name}").`);
      }
    }

    const { _id: _, storeId: __, ...safeUpdates } = updates as any;
    const updatedAt = new Date().toISOString();
    let updated: ProductDoc | null = null;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('products').updateOne({ ...buildIdQuery(id), ...buildStoreQuery(storeId) }, { $set: { ...safeUpdates, updatedAt } });
      const doc = await nativeDb.collection<any>('products').findOne({ ...buildIdQuery(id), ...buildStoreQuery(storeId) });
      updated = normalizeDoc<ProductDoc>(doc);
    } else {
      const idx = localDb.products.findIndex((p) => (p._id === id || (p as any).id === id) && p.storeId === storeId);
      if (idx !== -1) {
        localDb.products[idx] = { ...localDb.products[idx], ...safeUpdates, updatedAt };
        saveLocalDb();
        updated = normalizeDoc<ProductDoc>(localDb.products[idx]);
      }
    }

    cache.invalidateProducts(storeId);
    cache.del(`product:${storeId}:${id}`);
    return updated;
  },

  async adjustStock(storeId: string, id: string, newStock: number): Promise<ProductDoc | null> {
    return ProductsRepo.update(storeId, id, { stock: Math.max(0, newStock) });
  },

  async decrementStock(storeId: string, id: string, qty: number): Promise<ProductDoc | null> {
    const prod = await ProductsRepo.findById(storeId, id);
    if (!prod) throw new Error(`Product ${id} not found in store.`);
    if (prod.stock < qty) {
      throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock}, Requested: ${qty}`);
    }
    return ProductsRepo.update(storeId, id, { stock: prod.stock - qty });
  },

  async incrementStock(storeId: string, id: string, qty: number): Promise<ProductDoc | null> {
    const prod = await ProductsRepo.findById(storeId, id);
    if (!prod) return null;
    return ProductsRepo.update(storeId, id, { stock: prod.stock + qty });
  },

  async delete(storeId: string, id: string): Promise<boolean> {
    cache.invalidateProducts(storeId);
    cache.del(`product:${storeId}:${id}`);

    if (isUsingRemoteMongo && nativeDb) {
      const res = await nativeDb.collection<any>('products').deleteOne({ ...buildIdQuery(id), ...buildStoreQuery(storeId) });
      return (res.deletedCount || 0) > 0;
    }

    const lenBefore = localDb.products.length;
    localDb.products = localDb.products.filter((p) => !((p._id === id || (p as any).id === id) && p.storeId === storeId));
    saveLocalDb();
    return localDb.products.length < lenBefore;
  },
};

export const SalesRepo = {
  async getAll(storeId: string): Promise<SaleDoc[]> {
    if (!storeId) return [];
    return cache.getOrSet(`sales:${storeId}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const docs = await nativeDb.collection<any>('sales').find(buildStoreQuery(storeId)).sort({ createdAt: -1 }).toArray();
        return docs.map((d: any) => normalizeDoc<SaleDoc>(d));
      }
      return [...localDb.sales]
        .filter((s) => s.storeId === storeId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((s) => normalizeDoc<SaleDoc>(s));
    }, 30000);
  },

  async generateNextInvoiceNo(storeId: string): Promise<string> {
    const sales = await SalesRepo.getAll(storeId);
    let maxNum = 1000;
    for (const s of sales) {
      if (s.invoiceNo) {
        const match = s.invoiceNo.match(/\d+/);
        if (match) {
          const n = parseInt(match[0], 10);
          if (!isNaN(n) && n > maxNum) {
            maxNum = n;
          }
        }
      }
    }
    return (maxNum + 1).toString();
  },

  async findById(storeId: string, id: string): Promise<SaleDoc | null> {
    return cache.getOrSet(`sale:${storeId}:${id}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const doc = await nativeDb.collection<any>('sales').findOne({ ...buildIdQuery(id), ...buildStoreQuery(storeId) });
        return normalizeDoc<SaleDoc>(doc);
      }
      const doc = localDb.sales.find((s) => (s._id === id || (s as any).id === id) && s.storeId === storeId) || null;
      return normalizeDoc<SaleDoc>(doc);
    }, 60000);
  },

  async create(sale: Omit<SaleDoc, '_id'>): Promise<SaleDoc> {
    if (!sale.storeId) {
      throw new Error('storeId is required to complete sale.');
    }

    const enrichedItems = [];
    for (const item of sale.items) {
      const prod = await ProductsRepo.findById(sale.storeId, item.productId);
      if (!prod) throw new Error(`Product "${item.productName}" does not belong to store ${sale.storeId}.`);
      if (prod.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock}, Requested: ${item.quantity}`);
      }
      enrichedItems.push({
        ...item,
        costPrice: typeof item.costPrice === 'number' && item.costPrice >= 0 ? item.costPrice : (prod.costPrice ?? 0),
      });
    }

    for (const item of enrichedItems) {
      await ProductsRepo.decrementStock(sale.storeId, item.productId, item.quantity);
    }

    const newDoc: SaleDoc = {
      ...sale,
      items: enrichedItems,
      _id: `sale_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('sales').insertOne(newDoc);
    } else {
      localDb.sales.unshift(newDoc);
      saveLocalDb();
    }

    cache.invalidateSales(sale.storeId);
    cache.invalidateProducts(sale.storeId);
    return normalizeDoc<SaleDoc>(newDoc);
  },

  async refund(storeId: string, id: string): Promise<SaleDoc | null> {
    let sale = await SalesRepo.findById(storeId, id);
    if (!sale || sale.status === 'refunded') return null;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('sales').updateOne({ ...buildIdQuery(id), ...buildStoreQuery(storeId) }, { $set: { status: 'refunded' } });
      sale.status = 'refunded';
    } else {
      const found = localDb.sales.find((s) => (s._id === id || (s as any).id === id) && s.storeId === storeId);
      if (!found || found.status === 'refunded') return null;
      found.status = 'refunded';
      saveLocalDb();
      sale = found;
    }

    for (const item of sale.items) {
      await ProductsRepo.incrementStock(storeId, item.productId, item.quantity);
    }

    cache.invalidateSales(storeId);
    cache.invalidateProducts(storeId);
    return normalizeDoc<SaleDoc>(sale);
  },
};

export const AuditRepo = {
  async purgeOlderThanDays(days = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();
    let removedCount = 0;

    if (isUsingRemoteMongo && nativeDb) {
      try {
        const res = await nativeDb.collection<any>('audit_logs').deleteMany({
          timestamp: { $lt: cutoffIso },
        });
        removedCount = res.deletedCount || 0;
      } catch (err) {
        console.warn('[AuditRepo] Failed remote purge:', err);
      }
    } else {
      const initialLen = localDb.audit_logs.length;
      localDb.audit_logs = localDb.audit_logs.filter((log) => {
        const time = new Date(log.timestamp || (log as any).createdAt || 0).getTime();
        return time >= cutoffDate.getTime();
      });
      removedCount = initialLen - localDb.audit_logs.length;
      if (removedCount > 0) {
        saveLocalDb();
      }
    }

    if (removedCount > 0) {
      cache.clear();
      console.log(`[AuditRepo] Auto-purged ${removedCount} audit logs older than ${days} days (cutoff: ${cutoffIso})`);
    }

    return removedCount;
  },

  async log(entry: Omit<AuditLogDoc, '_id' | 'timestamp'>): Promise<AuditLogDoc> {
    // Opportunistically purge logs older than 90 days
    try {
      await AuditRepo.purgeOlderThanDays(90);
    } catch {
      // Non-blocking
    }

    const timestamp = new Date().toISOString();
    const newDoc: AuditLogDoc = {
      ...entry,
      _id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp,
      adminId: entry.adminId || entry.userId || 'admin_console',
      targetStoreId: entry.targetStoreId || entry.storeId || 'platform',
      targetUserId: entry.targetUserId,
      previousValue: entry.previousValue !== undefined ? entry.previousValue : null,
      newValue: entry.newValue !== undefined ? entry.newValue : null,
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('audit_logs').insertOne(newDoc);
    } else {
      localDb.audit_logs.unshift(newDoc);
      saveLocalDb();
    }

    cache.del(`audit:${entry.storeId}:20`);
    cache.del(`audit:${entry.storeId}:30`);
    cache.del('admin:metrics');
    return newDoc;
  },

  async getRecent(storeId: string, limit = 30): Promise<AuditLogDoc[]> {
    // Purge expired 2-day logs before serving
    try {
      await AuditRepo.purgeOlderThanDays(2);
    } catch {
      // Non-blocking
    }

    const cutoffIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    return cache.getOrSet(`audit:${storeId}:${limit}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const docs = await nativeDb
          .collection<any>('audit_logs')
          .find({ ...buildStoreQuery(storeId), timestamp: { $gte: cutoffIso } })
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray();
        return docs.map((d: any) => normalizeDoc<AuditLogDoc>(d));
      }
      return localDb.audit_logs
        .filter((l) => l.storeId === storeId && new Date(l.timestamp).getTime() >= Date.now() - 2 * 24 * 60 * 60 * 1000)
        .slice(0, limit);
    }, 15000);
  },

  async getAll(limit = 100): Promise<AuditLogDoc[]> {
    // Purge expired 2-day logs before serving
    try {
      await AuditRepo.purgeOlderThanDays(2);
    } catch {
      // Non-blocking
    }

    const cutoffIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    return cache.getOrSet(`audit:all:${limit}`, async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const docs = await nativeDb
          .collection<any>('audit_logs')
          .find({ timestamp: { $gte: cutoffIso } })
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray();
        return docs.map((d: any) => normalizeDoc<AuditLogDoc>(d));
      }
      return [...localDb.audit_logs]
        .filter((l) => new Date(l.timestamp).getTime() >= Date.now() - 2 * 24 * 60 * 60 * 1000)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    }, 15000);
  },
};

export const PlansRepo = {
  async getAll(): Promise<PlanDoc[]> {
    return cache.getOrSet('admin:plans:all', async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const docs = await nativeDb.collection<any>('plans').find({}).toArray();
        return docs.map((d: any) => normalizeDoc<PlanDoc>(d));
      }
      return (localDb.plans || []).map((p) => normalizeDoc<PlanDoc>(p));
    }, 180000);
  },

  async getById(id: string): Promise<PlanDoc | null> {
    if (isUsingRemoteMongo && nativeDb) {
      const doc = await nativeDb.collection<any>('plans').findOne(buildIdQuery(id));
      return normalizeDoc<PlanDoc>(doc);
    }
    const doc = (localDb.plans || []).find((p) => p._id === id || (p as any).id === id) || null;
    return normalizeDoc<PlanDoc>(doc);
  },

  async create(plan: Omit<PlanDoc, '_id'>): Promise<PlanDoc> {
    const newDoc: PlanDoc = {
      ...plan,
      _id: `plan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('plans').insertOne(newDoc);
    } else {
      if (!localDb.plans) localDb.plans = [];
      localDb.plans.push(newDoc);
      saveLocalDb();
    }
    cache.invalidatePlans();
    return normalizeDoc<PlanDoc>(newDoc);
  },

  async update(id: string, updates: Partial<PlanDoc>): Promise<PlanDoc | null> {
    const updatedAt = new Date().toISOString();
    const { _id: _, ...safeUpdates } = updates as any;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('plans').updateOne(buildIdQuery(id), { $set: { ...safeUpdates, updatedAt } });
      cache.invalidatePlans();
      return PlansRepo.getById(id);
    }

    const idx = (localDb.plans || []).findIndex((p) => p._id === id || (p as any).id === id);
    if (idx !== -1) {
      localDb.plans[idx] = { ...localDb.plans[idx], ...safeUpdates, updatedAt };
      saveLocalDb();
      cache.invalidatePlans();
      return normalizeDoc<PlanDoc>(localDb.plans[idx]);
    }
    return null;
  },

  async delete(id: string): Promise<boolean> {
    cache.invalidatePlans();
    if (isUsingRemoteMongo && nativeDb) {
      const res = await nativeDb.collection<any>('plans').deleteOne(buildIdQuery(id));
      return (res.deletedCount || 0) > 0;
    }

    const lenBefore = (localDb.plans || []).length;
    localDb.plans = (localDb.plans || []).filter((p) => !(p._id === id || (p as any).id === id));
    saveLocalDb();
    return (localDb.plans || []).length < lenBefore;
  },
};

export const PaymentsRepo = {
  async getAll(filters?: { status?: string; method?: string; storeId?: string }): Promise<PaymentDoc[]> {
    const cacheKey = `admin:payments:${filters?.status || 'all'}:${filters?.method || 'all'}:${filters?.storeId || 'all'}`;
    return cache.getOrSet(cacheKey, async () => {
      let list: PaymentDoc[] = [];
      if (isUsingRemoteMongo && nativeDb) {
        const query: any = {};
        if (filters?.status && filters.status !== 'all') query.status = filters.status;
        if (filters?.method && filters.method !== 'all') query.method = filters.method;
        if (filters?.storeId) query.storeId = filters.storeId;
        const docs = await nativeDb.collection<any>('payments').find(query).sort({ submittedAt: -1 }).toArray();
        list = docs.map((d: any) => normalizeDoc<PaymentDoc>(d));
      } else {
        list = (localDb.payments || []).filter((p) => {
          if (filters?.status && filters.status !== 'all' && p.status !== filters.status) return false;
          if (filters?.method && filters.method !== 'all' && p.method.toLowerCase() !== filters.method.toLowerCase()) return false;
          if (filters?.storeId && p.storeId !== filters.storeId) return false;
          return true;
        });
        list = [...list].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      }
      return list;
    }, 45000);
  },

  async getById(id: string): Promise<PaymentDoc | null> {
    if (isUsingRemoteMongo && nativeDb) {
      const doc = await nativeDb.collection<any>('payments').findOne(buildIdQuery(id));
      return normalizeDoc<PaymentDoc>(doc);
    }
    const doc = (localDb.payments || []).find((p) => p._id === id || (p as any).id === id) || null;
    return normalizeDoc<PaymentDoc>(doc);
  },

  async create(payment: Omit<PaymentDoc, '_id'>): Promise<PaymentDoc> {
    const newDoc: PaymentDoc = {
      ...payment,
      _id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      submittedAt: payment.submittedAt || new Date().toISOString(),
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('payments').insertOne(newDoc);
    } else {
      if (!localDb.payments) localDb.payments = [];
      localDb.payments.unshift(newDoc);
      saveLocalDb();
    }
    cache.invalidatePayments();
    return normalizeDoc<PaymentDoc>(newDoc);
  },

  async approve(id: string, adminUser?: { id: string; name: string }): Promise<{ payment: PaymentDoc | null; store: StoreDoc | null }> {
    const payment = await PaymentsRepo.getById(id);
    if (!payment) return { payment: null, store: null };

    const reviewedAt = new Date().toISOString();
    const approvedAt = reviewedAt;
    const reviewedBy = adminUser?.name || 'Super Admin';
    const approvedBy = reviewedBy;
    let updatedPayment: PaymentDoc | null = null;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('payments').updateOne(
        buildIdQuery(id),
        { $set: { status: 'approved', reviewedAt, reviewedBy, approvedAt, approvedBy } }
      );
      updatedPayment = await PaymentsRepo.getById(id);
    } else {
      const idx = (localDb.payments || []).findIndex((p) => p._id === id || (p as any).id === id);
      if (idx !== -1) {
        localDb.payments[idx] = {
          ...localDb.payments[idx],
          status: 'approved',
          reviewedAt,
          reviewedBy,
          approvedAt,
          approvedBy,
        };
        saveLocalDb();
        updatedPayment = normalizeDoc<PaymentDoc>(localDb.payments[idx]);
      }
    }

    let updatedStore: StoreDoc | null = null;
    if (payment.storeId) {
      updatedStore = await StoreRepo.approvePayment(payment.storeId, payment.transactionId, 1);
    }

    await AuditRepo.log({
      storeId: payment.storeId || 'platform',
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: reviewedBy,
      action: 'PAYMENT_APPROVED',
      targetStoreId: payment.storeId,
      details: `Approved payment ${payment.transactionId} for ${payment.storeName || payment.storeId}`,
    });

    cache.invalidatePayments();
    return { payment: updatedPayment, store: updatedStore };
  },

  async reject(id: string, reason?: string, adminUser?: { id: string; name: string }): Promise<PaymentDoc | null> {
    const payment = await PaymentsRepo.getById(id);
    if (!payment) return null;

    const reviewedAt = new Date().toISOString();
    const reviewedBy = adminUser?.name || 'Super Admin';
    const notes = reason || 'Payment was rejected by administrator.';
    let updatedPayment: PaymentDoc | null = null;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('payments').updateOne(
        buildIdQuery(id),
        { $set: { status: 'rejected', reviewedAt, reviewedBy, notes } }
      );
      updatedPayment = await PaymentsRepo.getById(id);
    } else {
      const idx = (localDb.payments || []).findIndex((p) => p._id === id || (p as any).id === id);
      if (idx !== -1) {
        localDb.payments[idx] = {
          ...localDb.payments[idx],
          status: 'rejected',
          reviewedAt,
          reviewedBy,
          notes,
        };
        saveLocalDb();
        updatedPayment = normalizeDoc<PaymentDoc>(localDb.payments[idx]);
      }
    }

    if (payment.storeId) {
      const store = await StoreRepo.getStore(payment.storeId);
      if (store?.subscription) {
        await StoreRepo.updateStore(payment.storeId, {
          subscription: { ...store.subscription, paymentStatus: 'rejected' },
        });
      }
      emitPaymentRejected(payment.storeId, id, notes);
    }

    await AuditRepo.log({
      storeId: payment.storeId || 'platform',
      adminId: adminUser?.id || 'admin_console',
      userId: adminUser?.id || 'admin_console',
      userName: reviewedBy,
      action: 'PAYMENT_REJECTED',
      targetStoreId: payment.storeId,
      details: `Rejected payment ${payment.transactionId} for ${payment.storeName || payment.storeId}: ${notes}`,
    });

    cache.invalidatePayments();
    return updatedPayment;
  },
};

export const SupportRepo = {
  async getAll(filters?: { status?: string; priority?: string; storeId?: string }): Promise<SupportTicketDoc[]> {
    const cacheKey = `admin:support:${filters?.status || 'all'}:${filters?.priority || 'all'}:${filters?.storeId || 'all'}`;
    return cache.getOrSet(cacheKey, async () => {
      let list: SupportTicketDoc[] = [];
      if (isUsingRemoteMongo && nativeDb) {
        const query: any = {};
        if (filters?.status && filters.status !== 'all') query.status = filters.status;
        if (filters?.priority && filters.priority !== 'all') query.priority = filters.priority;
        if (filters?.storeId) query.storeId = filters.storeId;
        const docs = await nativeDb.collection<any>('support_tickets').find(query).sort({ updatedAt: -1 }).toArray();
        list = docs.map((d: any) => normalizeDoc<SupportTicketDoc>(d));
      } else {
        list = (localDb.support_tickets || []).filter((t) => {
          if (filters?.status && filters.status !== 'all' && t.status !== filters.status) return false;
          if (filters?.priority && filters.priority !== 'all' && t.priority !== filters.priority) return false;
          if (filters?.storeId && t.storeId !== filters.storeId) return false;
          return true;
        });
        list = [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
      return list;
    }, 30000);
  },

  async getById(id: string): Promise<SupportTicketDoc | null> {
    if (isUsingRemoteMongo && nativeDb) {
      const doc = await nativeDb.collection<any>('support_tickets').findOne(buildIdQuery(id));
      return normalizeDoc<SupportTicketDoc>(doc);
    }
    const doc = (localDb.support_tickets || []).find((t) => t._id === id || (t as any).id === id) || null;
    return normalizeDoc<SupportTicketDoc>(doc);
  },

  async create(ticket: Omit<SupportTicketDoc, '_id' | 'createdAt' | 'updatedAt' | 'messages'>, initialMessage?: string): Promise<SupportTicketDoc> {
    const now = new Date().toISOString();
    const newDoc: SupportTicketDoc = {
      ...ticket,
      _id: `ticket_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
      messages: initialMessage
        ? [
            {
              id: `msg_${Date.now()}`,
              sender: ticket.ownerName,
              senderRole: 'Owner',
              text: initialMessage,
              timestamp: now,
            },
          ]
        : [],
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('support_tickets').insertOne(newDoc);
    } else {
      if (!localDb.support_tickets) localDb.support_tickets = [];
      localDb.support_tickets.unshift(newDoc);
      saveLocalDb();
    }
    cache.invalidateSupport();
    return normalizeDoc<SupportTicketDoc>(newDoc);
  },

  async addReply(ticketId: string, reply: { sender: string; senderRole: string; text: string }): Promise<SupportTicketDoc | null> {
    const ticket = await SupportRepo.getById(ticketId);
    if (!ticket) return null;

    const newMessage: SupportMessage = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sender: reply.sender,
      senderRole: reply.senderRole,
      text: reply.text,
      timestamp: new Date().toISOString(),
    };

    const updatedAt = new Date().toISOString();
    const updatedMessages = [...(ticket.messages || []), newMessage];

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('support_tickets').updateOne(
        buildIdQuery(ticketId),
        { $set: { messages: updatedMessages, updatedAt } }
      );
    } else {
      const idx = (localDb.support_tickets || []).findIndex((t) => t._id === ticketId || (t as any).id === ticketId);
      if (idx !== -1) {
        localDb.support_tickets[idx] = {
          ...localDb.support_tickets[idx],
          messages: updatedMessages,
          updatedAt,
        };
        saveLocalDb();
      }
    }
    cache.invalidateSupport();
    return SupportRepo.getById(ticketId);
  },

  async updateStatus(ticketId: string, status: 'open' | 'in_progress' | 'resolved'): Promise<SupportTicketDoc | null> {
    const updatedAt = new Date().toISOString();
    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('support_tickets').updateOne(buildIdQuery(ticketId), { $set: { status, updatedAt } });
    } else {
      const idx = (localDb.support_tickets || []).findIndex((t) => t._id === ticketId || (t as any).id === ticketId);
      if (idx !== -1) {
        localDb.support_tickets[idx] = { ...localDb.support_tickets[idx], status, updatedAt };
        saveLocalDb();
      }
    }
    cache.invalidateSupport();
    return SupportRepo.getById(ticketId);
  },

  async updatePriority(ticketId: string, priority: 'high' | 'medium' | 'low'): Promise<SupportTicketDoc | null> {
    const updatedAt = new Date().toISOString();
    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('support_tickets').updateOne(buildIdQuery(ticketId), { $set: { priority, updatedAt } });
    } else {
      const idx = (localDb.support_tickets || []).findIndex((t) => t._id === ticketId || (t as any).id === ticketId);
      if (idx !== -1) {
        localDb.support_tickets[idx] = { ...localDb.support_tickets[idx], priority, updatedAt };
        saveLocalDb();
      }
    }
    cache.invalidateSupport();
    return SupportRepo.getById(ticketId);
  },

  async delete(ticketId: string): Promise<boolean> {
    cache.invalidateSupport();
    if (isUsingRemoteMongo && nativeDb) {
      const res = await nativeDb.collection<any>('support_tickets').deleteOne(buildIdQuery(ticketId));
      return (res.deletedCount || 0) > 0;
    }

    const lenBefore = (localDb.support_tickets || []).length;
    localDb.support_tickets = (localDb.support_tickets || []).filter((t) => !(t._id === ticketId || (t as any).id === ticketId));
    saveLocalDb();
    return (localDb.support_tickets || []).length < lenBefore;
  },
};

export const PlatformSettingsRepo = {
  async getSettings(): Promise<PlatformSettingsDoc> {
    return cache.getOrSet('admin:settings', async () => {
      if (isUsingRemoteMongo && nativeDb) {
        const doc = await nativeDb.collection<any>('settings').findOne({ _id: 'platform_settings_default' });
        if (doc) return normalizeDoc<PlatformSettingsDoc>(doc);
      }
      return localDb.settings;
    }, 300000);
  },

  async updateSettings(updates: Partial<PlatformSettingsDoc>): Promise<PlatformSettingsDoc> {
    const updatedAt = new Date().toISOString();
    const current = await PlatformSettingsRepo.getSettings();
    const merged = { ...current, ...updates, updatedAt };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('settings').updateOne(
        { _id: 'platform_settings_default' },
        { $set: merged },
        { upsert: true }
      );
    } else {
      localDb.settings = merged;
      saveLocalDb();
    }
    cache.invalidateSettings();
    return merged;
  },

  async updateAdminProfile(adminId: string, updates: { name?: string; email?: string; password?: string }): Promise<UserDoc | null> {
    const user = await UsersRepo.findById(adminId);
    if (!user) return null;

    const userUpdates: Partial<UserDoc> = {};
    if (updates.name) userUpdates.name = updates.name.trim();
    if (updates.email) userUpdates.email = updates.email.trim();
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      userUpdates.passwordHash = await bcrypt.hash(updates.password, salt);
    }

    const updatedUser = await UsersRepo.update(user.storeId, adminId, userUpdates);
    if (updates.name || updates.email) {
      await PlatformSettingsRepo.updateSettings({
        name: updates.name || user.name,
        email: updates.email || user.email,
      });
    }
    cache.invalidateUsers(user.storeId);
    cache.del(`user:${adminId}`);
    return updatedUser;
  },
};

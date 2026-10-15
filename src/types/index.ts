export type CategoryType =
  | 'All'
  | 'Grocery'
  | 'Beverages'
  | 'Snacks'
  | 'Household'
  | 'Personal Care'
  | 'Fashion'
  | 'Electronics';

export interface Product {
  id: string;
  storeId?: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  storeType: 'grocery' | 'fashion' | 'electronics' | 'pharmacy' | 'restaurant' | 'general' | 'all' | string;
  costPrice: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  iconType: string;
  color: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Card';

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice?: number;
}

export interface Sale {
  id: string;
  storeId?: string;
  invoiceNo: string;
  createdAt: string;
  items: SaleItem[];
  subtotal: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  changeGiven?: number;
  cashierId?: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  status: 'completed' | 'refunded';
}

export interface StoreSubscription {
  status: 'active' | 'trial' | 'expired' | 'suspended' | 'pending' | 'cancelled';
  plan: 'Starter' | 'Professional' | 'Enterprise' | string;
  startDate: string;
  expiryDate: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  productLimit?: number;
  staffLimit?: number;
  lastPaymentId?: string;
  paymentStatus?: 'pending' | 'approved' | 'rejected';
}

export type StoreFeatures = Record<string, boolean>;

export interface StoreInfo {
  id?: string;
  ownerId?: string;
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
  status?: 'active' | 'suspended';
  subscription?: StoreSubscription;
  features?: StoreFeatures;
}

export interface StaffUser {
  id: string;
  storeId?: string;
  name: string;
  role: 'SuperAdmin' | 'Admin' | 'Owner' | 'Manager' | 'Cashier' | string;
  avatarInitials: string;
  pin?: string;
  email: string;
  permissions?: string[];
  status?: 'active' | 'suspended' | 'inactive';
  lastLogin?: string;
  phone?: string;
}

export type NotificationType =
  | 'stock_low'
  | 'stock_out'
  | 'sale_completed'
  | 'payment_pending'
  | 'payment_approved'
  | 'payment_rejected'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'system';

export interface AppNotification {
  id: string;
  storeId?: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: 'info' | 'warning' | 'error' | 'success';
  createdAt: string;
  read: boolean;
  linkScreen?: string;
  linkData?: any;
}

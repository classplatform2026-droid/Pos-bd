export type AdminTab =
  | 'dashboard'
  | 'shops'
  | 'subscriptions'
  | 'payments'
  | 'features'
  | 'support'
  | 'settings';

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

export interface AdminStoreItem {
  _id: string;
  id?: string;
  name: string;
  branch: string;
  tagline?: string;
  phone: string;
  address: string;
  currency: string;
  storeType: 'grocery' | 'fashion' | 'electronics' | string;
  status: 'active' | 'suspended';
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  createdAt?: string;
  subscription?: {
    plan: string;
    status: 'active' | 'trial' | 'expired' | 'suspended';
    startDate: string;
    expiryDate: string;
    amount: number;
    billingCycle?: string;
    lastPaymentId?: string;
    paymentStatus?: string;
  };
  features?: Record<string, boolean>;
}

export interface AdminPaymentItem {
  _id: string;
  id?: string;
  storeId: string;
  storeName: string;
  ownerName?: string;
  planName: string;
  transactionId: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Card' | string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  senderPhone?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface AdminPlanItem {
  _id: string;
  id?: string;
  name: string;
  price: number;
  billingPeriod: string;
  status: 'active' | 'inactive';
  staffLimit: number;
  productLimit: number;
  features: string[];
}

export interface SupportMessageItem {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

export interface AdminTicketItem {
  _id: string;
  id?: string;
  storeId: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  subject: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessageItem[];
}

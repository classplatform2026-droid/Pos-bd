import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(1, 'Password cannot be empty').optional(),
  pin: z.union([z.string(), z.number()]).transform((v) => v.toString().trim()).optional(),
}).refine((data) => data.identifier || data.email || data.pin, {
  message: 'Must provide an email/identifier or PIN',
});

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  category: z.string().trim().default('Grocery'),
  storeType: z.enum(['grocery', 'fashion', 'electronics', 'all']).default('grocery'),
  costPrice: z.coerce.number().min(0).default(0),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().min(0).default(5),
  unit: z.string().default('Pcs'),
  iconType: z.string().default('rice'),
  color: z.string().default('#3B82F6'),
});

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  subtotal: z.coerce.number().min(0),
  discountType: z.enum(['flat', 'percentage']).default('flat'),
  discountValue: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
  paymentMethod: z.enum(['Cash', 'bKash', 'Nagad', 'Card']).default('Cash'),
  amountReceived: z.coerce.number().optional(),
  changeGiven: z.coerce.number().optional(),
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
});

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(1).optional(),
  branch: z.string().trim().optional(),
  tagline: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  receiptFooter: z.string().optional(),
  printerSize: z.enum(['80mm', '58mm', 'A4']).optional(),
  storeType: z.enum(['grocery', 'fashion', 'electronics']).optional(),
});

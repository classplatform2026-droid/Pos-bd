import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// The user connection URI (defaults to the provided Atlas cluster if not in process.env)
const DEFAULT_URI = 'mongodb+srv://mdmutasimbillahsaad_db_user:QGSKlkxhnhkPJwFz@cluster0.j29uko9.mongodb.net/shopdb?appName=Cluster0';

function sanitizeMongoUri(raw: string): { uri: string; dbName: string } {
  let uri = (raw || '').trim();
  let dbName = 'shopdb';

  if (!uri) {
    return { uri: DEFAULT_URI, dbName };
  }

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
    // Normal format: ...net/shopdb?appName=...
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

async function runSeed() {
  const cliArg = process.argv[2];
  const rawUri = cliArg || process.env.MONGODB_URI || DEFAULT_URI;
  const { uri, dbName } = sanitizeMongoUri(rawUri);

  console.log('====================================================');
  console.log('🌱 ShopPOS MongoDB Atlas Seed Script');
  console.log('====================================================');
  console.log(`Connecting to database: "${dbName}"...`);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log(' Connected to MongoDB Atlas successfully!\n');
    const db = client.db(dbName);

    // 1. Password Hashes
    const salt = await bcrypt.genSalt(10);
    const adminPassHash = await bcrypt.hash('admin123', salt);
    const adminPinHash = await bcrypt.hash('1234', salt);
    const saadPassHash = await bcrypt.hash('saad1289', salt);
    const saadPinHash = await bcrypt.hash('1289', salt);
    const ownerPassHash = await bcrypt.hash('123456', salt);
    const ownerPinHash = await bcrypt.hash('1234', salt);

    // 2. Collections Setup & Indexes
    console.log('⚡ Creating Indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ storeId: 1, role: 1 });
    await db.collection('stores').createIndex({ ownerId: 1 });
    await db.collection('stores').createIndex({ status: 1 });
    await db.collection('products').createIndex({ storeId: 1, barcode: 1 });
    await db.collection('products').createIndex({ storeId: 1, sku: 1 });
    await db.collection('categories').createIndex({ storeId: 1, name: 1 });
    await db.collection('sales').createIndex({ storeId: 1, createdAt: -1 });
    await db.collection('sales').createIndex({ invoiceNo: 1 });
    await db.collection('audit_logs').createIndex({ timestamp: -1 });
    await db.collection('audit_logs').createIndex({ storeId: 1 });
    await db.collection('payments').createIndex({ transactionId: 1 });
    console.log(' Indexes created successfully.\n');

    // 3. Seed Platform Settings
    console.log('📦 Seeding Platform Settings...');
    const settingsDoc = {
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
    await db.collection<any>('settings').updateOne(
      { _id: 'platform_settings_default' },
      { $set: settingsDoc },
      { upsert: true }
    );

    // 4. Seed Subscription Plans
    console.log(' Seeding Subscription Plans...');
    const plans = [
      {
        _id: 'plan_trial',
        name: 'Trial',
        price: 0,
        billingPeriod: '14 days',
        status: 'active',
        staffLimit: 5,
        productLimit: 500,
        features: [
          '14 Days Full Access (ফ্রি ট্রায়াল)',
          'Full POS Checkout & Cart',
          'Maximum 500 Products & Stock',
          'Sales & Profit Analytics',
          'Customer Due & Khata',
          'Receipt & Barcode Printing',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'plan_standard',
        name: 'Standard',
        price: 999,
        billingPeriod: 'month',
        status: 'active',
        staffLimit: 10,
        productLimit: 2000,
        features: [
          'Continuous Monthly Access',
          'Unlimited POS Invoices',
          'Up to 2,000 Products & Inventory',
          'Multi-Staff Accounts & Roles',
          'Realtime Reports & Cloud Backup',
          'Online & Thermal Print',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'plan_enterprise',
        name: 'Enterprise',
        price: 9990,
        billingPeriod: 'year',
        status: 'active',
        staffLimit: 50,
        productLimit: 10000,
        features: [
          '1 Year Full Access (Save 20%)',
          'Unlimited Invoices & Transactions',
          'Up to 10,000 Products & Inventory',
          'Unlimited Staff & Multi-Counter',
          'Priority VIP Customer Support',
          'Custom Receipt Branding',
        ],
        createdAt: new Date().toISOString(),
      },
    ];

    for (const plan of plans) {
      await db.collection<any>('plans').updateOne(
        { _id: plan._id },
        { $set: plan },
        { upsert: true }
      );
    }

    // 5. Seed SuperAdmin Users
    console.log('👤 Seeding SuperAdmin Users...');
    const superAdmin = {
      _id: 'usr_admin',
      storeId: '',
      name: 'Super Admin',
      phone: '01700000000',
      email: 'admin@shoppos.com',
      passwordHash: adminPassHash,
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
    };
    await db.collection<any>('users').updateOne(
      { $or: [{ phone: '01700000000' }, { email: 'admin@shoppos.com' }] },
      { $set: superAdmin },
      { upsert: true }
    );

    const superAdminSaad = {
      _id: 'usr_admin_saad',
      storeId: '',
      name: 'Super Admin (Saad)',
      phone: '01915647290',
      email: 'saad1289@shoppos.com',
      passwordHash: saadPassHash,
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
    };
    await db.collection<any>('users').updateOne(
      { $or: [{ phone: '01915647290' }, { email: 'saad1289@shoppos.com' }] },
      { $set: superAdminSaad },
      { upsert: true }
    );

    // 6. Seed Starter Store & Owner for testing POS immediately
    console.log('🏪 Seeding Starter Shop & Owner (Demo Mart)...');
    const storeId = 'store_starter_demo';
    const ownerId = 'usr_owner_demo';

    const starterStore = {
      _id: storeId,
      ownerId: ownerId,
      name: 'Demo Grocery & Super Shop',
      branch: 'Main Branch, Dhaka',
      tagline: 'Fresh Groceries & Everyday Needs',
      phone: '01812345678',
      address: 'House #12, Road #4, Dhanmondi, Dhaka',
      currency: '৳',
      taxRate: 0,
      receiptFooter: 'ধন্যবাদ আবার আসবেন! Thank you for shopping with us.',
      printerSize: '80mm',
      storeType: 'grocery',
      status: 'active',
      subscription: {
        status: 'active',
        plan: 'Standard',
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        billingCycle: 'monthly',
        amount: 999,
        paymentStatus: 'approved',
        staffLimit: 10,
        productLimit: 2000,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection<any>('stores').updateOne(
      { _id: storeId },
      { $set: starterStore },
      { upsert: true }
    );

    const demoOwner = {
      _id: ownerId,
      storeId: storeId,
      name: 'Store Owner',
      email: 'owner@shoppos.com',
      phone: '01812345678',
      passwordHash: ownerPassHash,
      pinHash: ownerPinHash,
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

    await db.collection<any>('users').updateOne(
      { email: 'owner@shoppos.com' },
      { $set: demoOwner },
      { upsert: true }
    );

    // 7. Seed Starter Categories & Products
    console.log('🛒 Seeding Starter Categories & Products...');
    const categories = [
      { _id: `cat_${storeId}_grocery`, storeId, name: 'Grocery', createdAt: new Date().toISOString() },
      { _id: `cat_${storeId}_beverages`, storeId, name: 'Beverages', createdAt: new Date().toISOString() },
      { _id: `cat_${storeId}_snacks`, storeId, name: 'Snacks', createdAt: new Date().toISOString() },
      { _id: `cat_${storeId}_household`, storeId, name: 'Household', createdAt: new Date().toISOString() },
    ];

    for (const cat of categories) {
      await db.collection<any>('categories').updateOne(
        { _id: cat._id },
        { $set: cat },
        { upsert: true }
      );
    }

    const products = [
      {
        _id: `prod_${storeId}_1`,
        storeId,
        name: 'Miniket Rice (5KG)',
        sku: 'GRO-RC-01',
        barcode: '89010101',
        category: 'Grocery',
        storeType: 'grocery',
        costPrice: 380,
        price: 420,
        stock: 50,
        lowStockThreshold: 10,
        unit: '5KG',
        iconType: 'rice',
        color: '#F59E0B',
        createdAt: new Date().toISOString(),
      },
      {
        _id: `prod_${storeId}_2`,
        storeId,
        name: 'Pure Mustard Oil (1L)',
        sku: 'GRO-OIL-02',
        barcode: '89010102',
        category: 'Grocery',
        storeType: 'grocery',
        costPrice: 220,
        price: 260,
        stock: 35,
        lowStockThreshold: 10,
        unit: '1L',
        iconType: 'oil',
        color: '#EAB308',
        createdAt: new Date().toISOString(),
      },
      {
        _id: `prod_${storeId}_3`,
        storeId,
        name: 'Refined White Sugar (1KG)',
        sku: 'GRO-SGR-03',
        barcode: '89010103',
        category: 'Grocery',
        storeType: 'grocery',
        costPrice: 115,
        price: 135,
        stock: 60,
        lowStockThreshold: 15,
        unit: '1KG',
        iconType: 'sugar',
        color: '#06B6D4',
        createdAt: new Date().toISOString(),
      },
      {
        _id: `prod_${storeId}_4`,
        storeId,
        name: 'Red Lentils / Masoor Dal (1KG)',
        sku: 'GRO-LNT-04',
        barcode: '89010104',
        category: 'Grocery',
        storeType: 'grocery',
        costPrice: 120,
        price: 140,
        stock: 45,
        lowStockThreshold: 10,
        unit: '1KG',
        iconType: 'lentil',
        color: '#EA580C',
        createdAt: new Date().toISOString(),
      },
      {
        _id: `prod_${storeId}_5`,
        storeId,
        name: 'Ispahani Mirzapore Black Tea (400G)',
        sku: 'BEV-TEA-05',
        barcode: '89010105',
        category: 'Beverages',
        storeType: 'grocery',
        costPrice: 185,
        price: 220,
        stock: 30,
        lowStockThreshold: 8,
        unit: '400G',
        iconType: 'tea',
        color: '#15803D',
        createdAt: new Date().toISOString(),
      },
      {
        _id: `prod_${storeId}_6`,
        storeId,
        name: 'Pran Crispy Toast Biscuits (350G)',
        sku: 'SNK-BSC-06',
        barcode: '89010106',
        category: 'Snacks',
        storeType: 'grocery',
        costPrice: 50,
        price: 65,
        stock: 75,
        lowStockThreshold: 15,
        unit: 'Pack',
        iconType: 'biscuit',
        color: '#D97706',
        createdAt: new Date().toISOString(),
      },
      {
        _id: `prod_${storeId}_7`,
        storeId,
        name: 'Molla Super Salt (1KG)',
        sku: 'GRO-SLT-07',
        barcode: '89010107',
        category: 'Household',
        storeType: 'grocery',
        costPrice: 32,
        price: 42,
        stock: 80,
        lowStockThreshold: 20,
        unit: '1KG',
        iconType: 'salt',
        color: '#2563EB',
        createdAt: new Date().toISOString(),
      },
    ];

    for (const prod of products) {
      await db.collection<any>('products').updateOne(
        { _id: prod._id },
        { $set: prod },
        { upsert: true }
      );
    }

    console.log('\n====================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('----------------------------------------------------');
    console.log('1. Super Admin 1:');
    console.log('   Mobile:   01700000000');
    console.log('   Email:    admin@shoppos.com');
    console.log('   Password: admin123');
    console.log('   PIN:      1234');
    console.log('');
    console.log('2. Super Admin 2 (Saad):');
    console.log('   Mobile:   01915647290');
    console.log('   Email:    saad1289@shoppos.com');
    console.log('   Password: saad1289');
    console.log('   PIN:      1289');
    console.log('');
    console.log('3. Store Owner (POS Terminal):');
    console.log('   Mobile:   01812345678');
    console.log('   Email:    owner@shoppos.com');
    console.log('   Password: 123456');
    console.log('   PIN:      1234');
    console.log('----------------------------------------------------');
    console.log(`Database "${dbName}" is now fully initialized & ready!`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Seeding failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runSeed();

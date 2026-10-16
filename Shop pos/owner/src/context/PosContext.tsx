import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  CartItem,
  Sale,
  StoreInfo,
  StaffUser,
  PaymentMethod,
} from '../types';
import {
  INITIAL_STORE_INFO,
  STORE_PRESETS,
} from '../data/mockData';
import { api, DbStatusResponse, setStoredToken, getStoredToken, invalidateClientCache } from '../services/api';
import { playSound } from '../utils/sound';
import {
  connectSocket,
  disconnectSocket,
  subscribeToRealtimeEvent,
  isSocketConnected,
} from '../services/socket';

export type ScreenType = 'dashboard' | 'pos' | 'products' | 'sales' | 'settings';

interface PosContextType {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
  storeInfo: StoreInfo;
  currentUser: StaffUser | null;
  staffUsers: StaffUser[];
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  isMobileCartOpen: boolean;
  setIsMobileCartOpen: (open: boolean) => void;
  selectedSaleForReceipt: Sale | null;
  setSelectedSaleForReceipt: (sale: Sale | null) => void;
  dbStatus: DbStatusResponse | null;
  isLoading: boolean;
  isInitialLoading: boolean;
  socketConnected: boolean;
  suspendedAlertMessage: string | null;
  setSuspendedAlertMessage: (msg: string | null) => void;
  sessionNoticeMessage: string | null;
  setSessionNoticeMessage: (msg: string | null) => void;
  subscriptionExpired: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  setDiscount: (type: 'percentage' | 'flat', value: number) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  cashReceived: string;
  setCashReceived: (val: string) => void;
  cartSubtotal: number;
  discountAmount: number;
  cartTaxAmount: number;
  cartTotal: number;
  cartItemCount: number;
  completeSale: (customerInfo?: { name?: string; phone?: string }) => Promise<Sale | null>;
  categories: string[];
  addCategory: (name: string) => Promise<string>;
  deleteCategory: (name: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, newStock: number) => Promise<void>;
  updateStoreInfo: (info: Partial<StoreInfo>) => Promise<void>;
  refreshStoreInfo: () => Promise<void>;
  isPageEnabled: (page: ScreenType) => boolean;
  isFeatureEnabled: (featureKey: string, defaultValue?: boolean) => boolean;
  switchStorePreset: (storeKey: 'grocery' | 'fashion' | 'electronics') => void;
  switchStaffUser: (user: StaffUser) => void;
  logoutUser: () => void;
  loginUser: (user: StaffUser) => void;
  loginWithCredentials: (creds: { number?: string; phone?: string; identifier?: string; password?: string; pin?: string }) => Promise<boolean>;
  impersonateStore: (storeId: string) => Promise<boolean>;
  refundSale: (saleId: string) => Promise<void>;
  resetToDemoData: () => void;
  fetchStaffUsers: () => Promise<void>;
  createStaffUser: (payload: {
    name: string;
    email?: string;
    password?: string;
    pin?: string;
    role: string;
    permissions?: string[];
    phone?: string;
    number?: string;
  }) => Promise<void>;
  updateStaffUser: (
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
  ) => Promise<void>;
  deleteStaffUser: (id: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playBeep: (type?: 'beep' | 'success' | 'delete') => void;
  refreshAllData: () => Promise<void>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(INITIAL_STORE_INFO);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shoppos_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('shoppos_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    try {
      const token = localStorage.getItem('shoppos_jwt_token');
      if (!token) return null;
      const saved = localStorage.getItem('shoppos_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [socketConnected, setSocketConnected] = useState(isSocketConnected());
  const [suspendedAlertMessage, setSuspendedAlertMessage] = useState<string | null>(null);
  const [sessionNoticeMessage, setSessionNoticeMessage] = useState<string | null>(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      api.getDbStatus().then(setDbStatus).catch(() => {});
      const token = getStoredToken();
      if (!token) {
        setIsLoading(false);
        setIsInitialLoading(false);
        return;
      }

      await Promise.allSettled([
        api.getStore().then((res) => {
          if (res && res.store) {
            setStoreInfo(res.store);
            setSubscriptionExpired(res.store.subscription?.status === 'expired');
          }
        }).catch((err) => console.warn('[MongoDB] Store fetch notice:', err.message)),

        api.getCategories().then((res) => {
          if (res.categories) setCategories(res.categories);
        }).catch((err) => console.warn('[MongoDB] Categories fetch notice:', err.message)),

        api.getProducts().then((res) => {
          if (res.products) setProducts(res.products);
        }).catch((err) => console.warn('[MongoDB] Products fetch notice:', err.message)),

        api.getSales().then((res) => {
          if (res.sales) setSales(res.sales);
        }).catch((err) => console.warn('[MongoDB] Sales fetch notice:', err.message)),

        api.getMe().then((res) => {
          if (res.user) {
            const normalizedUser: StaffUser = {
              id: res.user._id,
              storeId: res.user.storeId,
              name: res.user.name,
              email: res.user.email,
              role: res.user.role,
              avatarInitials: res.user.name.charAt(0).toUpperCase(),
              pin: res.user.pin,
              permissions: res.user.permissions,
              status: res.user.status,
              phone: res.user.phone,
              lastLogin: res.user.lastLogin,
            };
            setCurrentUser(normalizedUser);
            try {
              localStorage.setItem('shoppos_current_user', JSON.stringify(normalizedUser));
            } catch {}
          }
        }).catch((err) => {
          console.warn('[MongoDB] User profile notice:', err.message);
          if (err.status === 401 || (err.message && err.message.includes('User account no longer exists'))) {
            setSessionNoticeMessage(err.message || 'User account no longer exists. Please sign in again.');
            logoutUser();
          }
        }),

        api.getUsers().then((res) => {
          if (res.users) {
            setStaffUsers(res.users.map((u) => ({
              id: u._id,
              storeId: u.storeId,
              name: u.name,
              email: u.email,
              role: u.role,
              avatarInitials: u.name.charAt(0).toUpperCase(),
              pin: u.pin,
              permissions: u.permissions,
              status: u.status,
              phone: u.phone,
              lastLogin: u.lastLogin,
            })));
          }
        }).catch((err) => console.warn('[MongoDB] Staff users notice:', err.message)),
      ]);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    invalidateClientCache();
    await fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      connectSocket(token);
    }

    const unsubConnect = subscribeToRealtimeEvent('connect', () => setSocketConnected(true));
    const unsubDisconnect = subscribeToRealtimeEvent('disconnect', () => setSocketConnected(false));
    const unsubSuspended = subscribeToRealtimeEvent('ACCOUNT_SUSPENDED', (data: any) => {
      setSuspendedAlertMessage(data?.message || 'Your account has been suspended.');
      disconnectSocket();
      setSocketConnected(false);
      setStoredToken(null);
      setCurrentUser(null);
    });
    const unsubActivated = subscribeToRealtimeEvent('ACCOUNT_ACTIVATED', () => {
      setSuspendedAlertMessage(null);
      fetchAllData();
    });
    const unsubStoreUpdated = subscribeToRealtimeEvent('STORE_UPDATED', (data: any) => {
      if (data?.store) {
        setStoreInfo((prev) => ({ ...prev, ...data.store }));
      }
    });
    const unsubFeaturesUpdated = subscribeToRealtimeEvent('FEATURES_UPDATED', (data: any) => {
      if (data?.features) {
        setStoreInfo((prev) => ({
          ...prev,
          features: { ...(prev.features || {}), ...data.features },
        }));
      }
    });

    const handleUnauthorized = (e: any) => {
      const msg = e?.detail?.message || 'User account no longer exists or session expired. Please sign in again.';
      setSessionNoticeMessage(msg);
      logoutUser();
    };
    window.addEventListener('shoppos:auth_unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('shoppos:auth_unauthorized', handleUnauthorized);
      unsubConnect();
      unsubDisconnect();
      unsubSuspended();
      unsubActivated();
      unsubStoreUpdated();
      unsubFeaturesUpdated();
    };
  }, [fetchAllData]);

  const playBeep = useCallback((type: 'beep' | 'success' | 'delete' = 'beep') => {
    if (soundEnabled) {
      playSound(type);
    }
  }, [soundEnabled]);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount =
    discountType === 'percentage'
      ? Math.round((cartSubtotal * Math.min(100, Math.max(0, discountValue))) / 100)
      : Math.min(cartSubtotal, Math.max(0, discountValue));
  const amountAfterDiscount = Math.max(0, cartSubtotal - discountAmount);
  const cartTaxAmount = Math.round((amountAfterDiscount * storeInfo.taxRate) / 100);
  const cartTotal = amountAfterDiscount + cartTaxAmount;
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) return;
    playBeep('beep');
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
  };

  const removeFromCart = (productId: string) => {
    playBeep('delete');
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const setCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, quantity: Math.min(item.product.stock, quantity) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setCashReceived('');
  };

  const setDiscount = (type: 'percentage' | 'flat', value: number) => {
    setDiscountType(type);
    setDiscountValue(value);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SuperAdmin') return true;
    return currentUser.permissions?.includes(permission) ?? false;
  };

  const completeSale = async (customerInfo?: { name?: string; phone?: string }): Promise<Sale | null> => {
    if (cart.length === 0) return null;
    const receivedNum = cashReceived ? parseFloat(cashReceived) : undefined;
    const changeGiven = receivedNum && receivedNum >= cartTotal ? receivedNum - cartTotal : 0;
    const nextInvoiceNo = (1000 + sales.length + 1).toString();

    const salePayload = {
      invoiceNo: nextInvoiceNo,
      createdAt: new Date().toISOString(),
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
        costPrice: typeof item.product.costPrice === 'number' ? item.product.costPrice : 0,
      })),
      subtotal: cartSubtotal,
      discountType,
      discountValue,
      discountAmount,
      taxAmount: cartTaxAmount,
      total: cartTotal,
      paymentMethod,
      amountReceived: receivedNum,
      changeGiven,
      cashierName: currentUser?.name || 'Cashier',
      customerName: customerInfo?.name,
      customerPhone: customerInfo?.phone,
      status: 'completed' as const,
    };

    try {
      const res = await api.createSale(salePayload);
      const created = res.sale;
      setSales((prev) => [created, ...prev]);
      setProducts((prev) =>
        prev.map((p) => {
          const cartItem = cart.find((item) => item.product.id === p.id);
          if (cartItem) {
            return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
          }
          return p;
        })
      );
      clearCart();
      setIsMobileCartOpen(false);
      setSelectedSaleForReceipt(created);
      playBeep('success');
      return created;
    } catch (err: any) {
      console.error('Failed to complete sale on server:', err);
      // Do NOT create fake fallback sale or clear cart on error; propagate error to UI
      throw new Error(err?.message || 'Failed to complete sale. Please check product stock and connection.');
    }
  };

  const addProduct = async (newProdData: Omit<Product, 'id'>) => {
    try {
      const res = await api.createProduct(newProdData);
      setProducts((prev) => [res.product, ...prev]);
    } catch (err: any) {
      console.error('Failed to create product:', err);
      throw new Error(err?.message || 'Failed to create product.');
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const res = await api.updateProduct(id, updates);
      setProducts((prev) => prev.map((p) => (p.id === id ? res.product : p)));
    } catch (err: any) {
      console.error('Failed to update product:', err);
      throw new Error(err?.message || 'Failed to update product.');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      removeFromCart(id);
    } catch (err: any) {
      console.error('Failed to delete product on server:', err);
      throw new Error(err?.message || 'Failed to delete product from server.');
    }
  };

  const adjustStock = async (id: string, newStock: number) => {
    try {
      const res = await api.adjustStock(id, newStock);
      setProducts((prev) => prev.map((p) => (p.id === id ? res.product : p)));
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, newStock) } : p))
      );
    }
  };

  const addCategory = async (name: string): Promise<string> => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    try {
      const res = await api.createCategory(trimmed);
      setCategories((prev) => (prev.includes(res.category) ? prev : [...prev, res.category]));
      return res.category;
    } catch {
      setCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      return trimmed;
    }
  };

  const deleteCategory = async (name: string): Promise<void> => {
    try {
      await api.deleteCategory(name);
      setCategories((prev) => prev.filter((c) => c !== name));
    } catch (err: any) {
      console.error('Failed to delete category on server:', err);
      throw new Error(err?.message || 'Failed to delete category from server.');
    }
  };

  const updateStoreInfo = async (updates: Partial<StoreInfo>) => {
    try {
      const res = await api.updateStore(updates);
      setStoreInfo(res.store);
    } catch {
      setStoreInfo((prev) => ({ ...prev, ...updates }));
    }
  };

  const refreshStoreInfo = async () => {
    try {
      const res = await api.getStore();
      if (res && res.store) {
        setStoreInfo(res.store);
        setSubscriptionExpired(res.store.subscription?.status === 'expired');
      }
    } catch (err: any) {
      console.warn('Failed to refresh store info:', err.message);
    }
  };

  const isPageEnabled = useCallback(
    (page: ScreenType): boolean => {
      if (!storeInfo?.features) return true;
      const key = `page_${page}`;
      if (typeof storeInfo.features[key] === 'boolean') {
        return storeInfo.features[key];
      }
      return true;
    },
    [storeInfo?.features]
  );

  const isFeatureEnabled = useCallback(
    (featureKey: string, defaultValue = true): boolean => {
      if (!storeInfo?.features) return defaultValue;
      if (typeof storeInfo.features[featureKey] === 'boolean') {
        return storeInfo.features[featureKey];
      }
      return defaultValue;
    },
    [storeInfo?.features]
  );

  const switchStorePreset = (storeKey: 'grocery' | 'fashion' | 'electronics') => {
    const preset = STORE_PRESETS[storeKey];
    if (preset) {
      const updated = { ...storeInfo, ...preset };
      setStoreInfo(updated);
      api.updateStore(updated).catch(() => {});
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await api.getUsers();
      if (res.users) {
        setStaffUsers(
          res.users.map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatarInitials: u.name.charAt(0).toUpperCase(),
            pin: u.pin,
            permissions: u.permissions,
            status: u.status,
            phone: u.phone,
            lastLogin: u.lastLogin,
          }))
        );
      }
    } catch (err) {
      console.warn('Could not fetch staff users', err);
    }
  };

  const createStaffUser = async (payload: any) => {
    const res = await api.createUser(payload);
    const newStaff: StaffUser = {
      id: res.user._id,
      storeId: res.user.storeId,
      name: res.user.name,
      email: res.user.email,
      role: res.user.role,
      avatarInitials: res.user.name.charAt(0).toUpperCase(),
      pin: res.user.pin,
      permissions: res.user.permissions,
      status: res.user.status,
      phone: res.user.phone,
    };
    setStaffUsers((prev) => [...prev, newStaff]);
  };

  const updateStaffUser = async (id: string, updates: any) => {
    const res = await api.updateUser(id, updates);
    setStaffUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              name: res.user.name,
              role: res.user.role,
              permissions: res.user.permissions,
              status: res.user.status,
              pin: res.user.pin,
              phone: res.user.phone,
            }
          : u
      )
    );
  };

  const deleteStaffUser = async (id: string) => {
    await api.deleteUser(id);
    setStaffUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const switchStaffUser = (user: StaffUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('shoppos_current_user', JSON.stringify(user));
    } catch {}
  };

  const loginUser = (user: StaffUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('shoppos_current_user', JSON.stringify(user));
    } catch {}
  };

  const loginWithCredentials = async (creds: {
    number?: string;
    phone?: string;
    identifier?: string;
    password?: string;
    pin?: string;
  }): Promise<boolean> => {
    const data = await api.login(creds);
    const loggedUser: StaffUser = {
      id: data.user._id,
      storeId: data.user.storeId,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      avatarInitials: data.user.name.charAt(0).toUpperCase(),
      pin: data.user.pin,
      permissions: data.user.permissions,
      status: data.user.status,
      phone: data.user.phone,
      lastLogin: data.user.lastLogin,
    };
    loginUser(loggedUser);
    if (data.token) {
      connectSocket(data.token);
    }
    fetchAllData();
    return true;
  };

  const impersonateStore = async (storeId: string): Promise<boolean> => {
    try {
      const data = await api.adminImpersonateStore(storeId);
      if (data.token && data.user) {
        setStoredToken(data.token);
        const loggedUser: StaffUser = {
          id: data.user._id,
          storeId: data.user.storeId,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          avatarInitials: data.user.name.charAt(0).toUpperCase(),
          pin: data.user.pin,
          permissions: data.user.permissions,
          status: data.user.status,
          phone: data.user.phone,
          lastLogin: data.user.lastLogin,
        };
        loginUser(loggedUser);
        connectSocket(data.token);
        if (data.store) {
          setStoreInfo(data.store);
          setSubscriptionExpired(data.store.subscription?.status === 'expired');
        }
        await fetchAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to impersonate store:', err);
      return false;
    }
  };

  const logoutUser = () => {
    disconnectSocket();
    setSocketConnected(false);
    setCurrentUser(null);
    setStoredToken(null);
    setCart([]);
    try {
      localStorage.removeItem('shoppos_current_user');
      localStorage.removeItem('shoppos_jwt_token');
    } catch {}
  };

  const refundSale = async (saleId: string): Promise<void> => {
    try {
      const res = await api.refundSale(saleId);
      setSales((prev) => prev.map((s) => (s.id === saleId ? res.sale : s)));
      const prodRes = await api.getProducts();
      setProducts(prodRes.products);
    } catch (err: any) {
      console.error('Failed to refund sale on server:', err);
      throw new Error(err?.message || 'Failed to refund sale. Permission denied or sale already refunded.');
    }
  };

  const resetToDemoData = () => {
    fetchAllData();
    clearCart();
  };

  return (
    <PosContext.Provider
      value={{
        products,
        cart,
        sales,
        storeInfo,
        currentUser,
        staffUsers,
        activeScreen,
        setActiveScreen,
        isMobileCartOpen,
        setIsMobileCartOpen,
        selectedSaleForReceipt,
        setSelectedSaleForReceipt,
        dbStatus,
        isLoading,
        isInitialLoading,
        socketConnected,
        suspendedAlertMessage,
        setSuspendedAlertMessage,
        sessionNoticeMessage,
        setSessionNoticeMessage,
        subscriptionExpired,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        setCartQuantity,
        clearCart,
        discountType,
        discountValue,
        setDiscount,
        paymentMethod,
        setPaymentMethod,
        cashReceived,
        setCashReceived,
        cartSubtotal,
        discountAmount,
        cartTaxAmount,
        cartTotal,
        cartItemCount,
        completeSale,
        categories,
        addCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        updateStoreInfo,
        refreshStoreInfo,
        isPageEnabled,
        isFeatureEnabled,
        switchStorePreset,
        switchStaffUser,
        logoutUser,
        loginUser,
        loginWithCredentials,
        impersonateStore,
        refundSale,
        resetToDemoData,
        fetchStaffUsers,
        createStaffUser,
        updateStaffUser,
        deleteStaffUser,
        hasPermission,
        soundEnabled,
        setSoundEnabled,
        playBeep,
        refreshAllData,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};

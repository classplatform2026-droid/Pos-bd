import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Store,
  LogOut,
  User,
  ShoppingBag,
  Volume2,
  VolumeX,
  PanelLeft,
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Package,
  Layers,
  Receipt,
  Sparkles,
  Camera,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { playSound } from '../utils/sound';
import { ShopMasterLogo } from './ShopMasterLogo';

interface TopHeaderProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onBarcodeScanClick?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchPlaceholder = 'Search anything...',
  searchValue = '',
  onSearchChange,
  onBarcodeScanClick,
}) => {
  const {
    currentUser,
    logoutUser,
    activeScreen,
    setActiveScreen,
    cartItemCount,
    setIsMobileCartOpen,
    storeInfo,
    soundEnabled,
    setSoundEnabled,
    isFeatureEnabled,
    isSidebarCollapsed,
    toggleSidebar,
    products,
    sales,
    setSelectedSaleForReceipt,
  } = usePos();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'stock' | 'sales'>('all');

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Read notifications stored in localStorage
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('shoppos_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('shoppos_dismissed_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Dynamically compute live store notifications
  const allNotifications = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      message: string;
      category: 'stock' | 'sales' | 'system';
      severity: 'critical' | 'warning' | 'info' | 'success';
      timeAgo: string;
      actionLabel?: string;
      onAction?: () => void;
    }> = [];

    // 1. Stock Alerts
    products.forEach((p) => {
      if (p.stock <= 0) {
        list.push({
          id: `stock-out-${p.id}`,
          title: `স্টক শূন্য: ${p.name}`,
          message: `${p.category || 'পণ্য'} - ইনভেন্টরিতে কোনো ইউনিট নেই। দ্রুত স্টক যোগ করুন।`,
          category: 'stock',
          severity: 'critical',
          timeAgo: 'স্টক নেই',
          actionLabel: '+Stock যোগ করুন',
          onAction: () => {
            setActiveScreen('products');
            setNotificationsOpen(false);
          },
        });
      } else if (p.stock <= (p.lowStockThreshold || 5)) {
        list.push({
          id: `stock-low-${p.id}`,
          title: `লো-স্টক অ্যালার্ট: ${p.name}`,
          message: `মাত্র ${p.stock} ${p.unit || 'টি'} অবশিষ্ট আছে (সতর্কতা সীমা: ${p.lowStockThreshold || 5})।`,
          category: 'stock',
          severity: 'warning',
          timeAgo: 'কম স্টক',
          actionLabel: 'রিস্টক করুন',
          onAction: () => {
            setActiveScreen('products');
            setNotificationsOpen(false);
          },
        });
      }
    });

    // 2. Recent Sales
    sales.slice(0, 5).forEach((sale) => {
      const saleDate = new Date(sale.createdAt || Date.now());
      const timeStr = saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      list.push({
        id: `sale-${sale.id}`,
        title: `নতুন বিক্রয়: #${sale.invoiceNo}`,
        message: `${storeInfo.currency} ${sale.total.toLocaleString()} (${sale.paymentMethod}) - ক্যাশিয়ার: ${sale.cashierName || 'Staff'}`,
        category: 'sales',
        severity: 'success',
        timeAgo: timeStr,
        actionLabel: 'রসিদ দেখুন',
        onAction: () => {
          setSelectedSaleForReceipt(sale);
          setNotificationsOpen(false);
        },
      });
    });

    // 3. Subscription Status
    if (storeInfo.subscription) {
      const sub = storeInfo.subscription;
      if (sub.status === 'expired') {
        list.push({
          id: 'sub-expired',
          title: 'সাবস্ক্রিপশন মেয়াদোত্তীর্ণ',
          message: 'দোকানের প্ল্যানের মেয়াদ শেষ হয়েছে। সকল সুবিধা চালু রাখতে নবায়ন করুন।',
          category: 'system',
          severity: 'critical',
          timeAgo: 'মেয়াদ শেষ',
          actionLabel: 'নবায়ন করুন',
          onAction: () => {
            setActiveScreen('settings');
            setNotificationsOpen(false);
          },
        });
      } else if (sub.expiryDate) {
        const daysLeft = Math.ceil((new Date(sub.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft >= 0) {
          list.push({
            id: 'sub-expiring-soon',
            title: 'সাবস্ক্রিপশন মেয়াদ শেষ হচ্ছে',
            message: `আর মাত্র ${daysLeft} দিন পর সাবস্ক্রিপশন শেষ হবে।`,
            category: 'system',
            severity: 'warning',
            timeAgo: `${daysLeft} দিন বাকি`,
            actionLabel: 'প্ল্যান দেখুন',
            onAction: () => {
              setActiveScreen('settings');
              setNotificationsOpen(false);
            },
          });
        }
      }
    }

    return list.filter((n) => !dismissedNotificationIds.has(n.id));
  }, [products, sales, storeInfo, dismissedNotificationIds, setActiveScreen, setSelectedSaleForReceipt]);

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'stock') {
      return allNotifications.filter((n) => n.category === 'stock');
    }
    if (notificationFilter === 'sales') {
      return allNotifications.filter((n) => n.category === 'sales');
    }
    return allNotifications;
  }, [allNotifications, notificationFilter]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter((n) => !readNotificationIds.has(n.id)).length;
  }, [allNotifications, readNotificationIds]);

  const markAllRead = () => {
    const next = new Set(readNotificationIds);
    allNotifications.forEach((n) => next.add(n.id));
    setReadNotificationIds(next);
    try {
      localStorage.setItem('shoppos_read_notifications', JSON.stringify(Array.from(next)));
    } catch {}
  };

  const markItemRead = (id: string) => {
    const next = new Set(readNotificationIds);
    next.add(id);
    setReadNotificationIds(next);
    try {
      localStorage.setItem('shoppos_read_notifications', JSON.stringify(Array.from(next)));
    } catch {}
  };

  const dismissItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(dismissedNotificationIds);
    next.add(id);
    setDismissedNotificationIds(next);
    try {
      localStorage.setItem('shoppos_dismissed_notifications', JSON.stringify(Array.from(next)));
    } catch {}
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playSound('beep');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-3 sm:px-6 h-18 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile Header Left: Brand info */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-xs p-1">
            <ShopMasterLogo size={28} />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-900 text-sm leading-tight block truncate">
              ShopPOS
            </span>
            <span className="text-[10px] text-slate-500 font-medium leading-none truncate block">
              {storeInfo.name}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Header Left with Sidebar Toggle & Search */}
      <div className="hidden md:flex items-center flex-1 max-w-xl mr-6 gap-2">
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-sm text-slate-800 rounded-xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {onBarcodeScanClick && isFeatureEnabled('feat_barcode_scanner') && (
            <button
              type="button"
              onClick={onBarcodeScanClick}
              title="Camera Barcode Reader (ক্যামেরা বারকোড রিডার)"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>বারকোড</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
          <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-800">{storeInfo.name}</span>
          <span className="text-[10px] text-slate-400">({storeInfo.branch})</span>
          {currentUser?.storeId && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
              {currentUser.storeId}
            </span>
          )}
        </div>

        {/* Sound toggle button */}
        <button
          type="button"
          onClick={handleToggleSound}
          title={soundEnabled ? 'সাউন্ড অ্যালার্ট চালু (ক্লিক করে মিউট করুন)' : 'সাউন্ড মিউট করা (ক্লিক করে চালু করুন)'}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors hidden sm:flex cursor-pointer"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-blue-600" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Live Notification Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 sm:p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
            aria-label="নোটিফিকেশনসমূহ"
            title="নোটিফিকেশন ও অ্যালার্ট"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full ring-2 ring-white flex items-center justify-center animate-in zoom-in-50 duration-150">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Top Title Bar */}
              <div className="p-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">নোটিফিকেশন</h4>
                    <p className="text-[10px] text-slate-500">
                      {unreadCount > 0 ? `${unreadCount}টি নতুন অপঠিত অ্যালার্ট` : 'সব নোটিফিকেশন পড়া হয়েছে'}
                    </p>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>সব পঠিত</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 bg-white text-xs">
                <button
                  type="button"
                  onClick={() => setNotificationFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    notificationFilter === 'all'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  সকল ({allNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter('stock')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    notificationFilter === 'stock'
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  স্টক অ্যালার্ট ({allNotifications.filter((n) => n.category === 'stock').length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter('sales')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    notificationFilter === 'sales'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  বিক্রয় ({allNotifications.filter((n) => n.category === 'sales').length})
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1 max-h-80">
                {filteredNotifications.length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">কোনো নোটিফিকেশন নেই</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      সবকিছু আপডেট ও স্বাভাবিকভাবে চলছে!
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((n) => {
                    const isRead = readNotificationIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          markItemRead(n.id);
                          if (n.onAction) n.onAction();
                        }}
                        className={`p-3 rounded-xl transition-all cursor-pointer group flex items-start gap-2.5 ${
                          isRead ? 'opacity-70 hover:opacity-100 hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/80 font-medium'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="mt-0.5 shrink-0">
                          {n.severity === 'critical' ? (
                            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          ) : n.severity === 'warning' ? (
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                              <Receipt className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {n.title}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {n.timeAgo}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                            {n.message}
                          </p>

                          {/* Quick action button */}
                          {n.actionLabel && (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:underline">
                                {n.actionLabel}
                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                              </span>
                              <button
                                type="button"
                                onClick={(e) => dismissItem(n.id, e)}
                                title="নোটিফিকেশনটি সরান"
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-between px-3">
                <span className="text-[11px] text-slate-400">
                  মোট {allNotifications.length}টি নোটিফিকেশন
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen('products');
                    setNotificationsOpen(false);
                  }}
                  className="text-[11px] font-bold text-slate-600 hover:text-blue-600 transition-colors"
                >
                  ইনভেন্টরি চেক করুন &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {activeScreen === 'pos' && (
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="md:hidden relative p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        )}

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200/60 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shadow-2xs">
              {currentUser?.avatarInitials || 'A'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser?.name || 'Admin'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                {currentUser?.role || 'Manager'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || (currentUser as any)?.phone || 'Store Owner'}</p>
              </div>
              <div className="pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen('settings');
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Shop Settings (দোকান সেটিংস)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logoutUser();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out (লগআউট)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

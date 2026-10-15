import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Store,
  Database,
  CheckCheck,
  CreditCard,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { DbOptimizationModal } from './components/DbOptimizationModal';
import { ShopMasterLogo } from './components/ShopMasterLogo';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'payment' | 'subscription' | 'support' | 'shop';
  time: string;
  actionLabel?: string;
  onAction?: () => void;
  rawItem?: any;
}

interface AdminTopHeaderProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  adminName?: string;
  adminRole?: string;
  notifications?: AdminNotification[];
  onReviewPayment?: (payment: any) => void;
  onNavigateToShops?: (shopId?: string) => void;
}

export const AdminTopHeader: React.FC<AdminTopHeaderProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search anything...',
  adminName = 'Admin Manager',
  adminRole = 'Super Admin',
  notifications = [],
  onReviewPayment,
  onNavigateToShops,
}) => {
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('shoppos_admin_read_notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    setReadIds(next);
    try {
      localStorage.setItem('shoppos_admin_read_notifs', JSON.stringify(Array.from(next)));
    } catch {}
  };

  const markSingleRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    try {
      localStorage.setItem('shoppos_admin_read_notifs', JSON.stringify(Array.from(next)));
    } catch {}
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 gap-2">
      <div className="flex items-center gap-1.5 md:hidden">
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 p-1">
          <ShopMasterLogo size={26} />
        </div>
        <span className="font-extrabold text-slate-900 text-sm tracking-tight inline">
          ShopPOS
        </span>
      </div>

      <div className="relative flex-1 max-w-[180px] xs:max-w-[240px] sm:max-w-xs md:max-w-md">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={() => setDbModalOpen(true)}
          title="MongoDB connection & DB load reduction status"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline font-mono">MongoDB</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {/* Admin Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="অ্যাডমিন নোটিফিকেশন"
            aria-label="Admin Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-blue-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <Bell className="w-3 h-3" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">অ্যাডমিন অ্যালার্ট</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-md">
                      {unreadCount} নতুন
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>সব পঠিত</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto p-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <Sparkles className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">কোনো মুলতবি নোটিফিকেশন নেই</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">সকল পেমেন্ট ও শপ স্ট্যাটাস আপ-টু-ডেট।</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isRead = readIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          markSingleRead(n.id);
                          if (n.onAction) n.onAction();
                          setNotifOpen(false);
                        }}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                          isRead ? 'opacity-70 hover:opacity-100 hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/80 font-medium'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.type === 'payment' ? (
                            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                              <CreditCard className="w-3 h-3" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                              <ShieldAlert className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                            {n.message}
                          </p>
                          {n.actionLabel && (
                            <div className="mt-1.5">
                              <span className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                {n.actionLabel}
                                <ArrowRight className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
          <div className="w-7 h-7 sm:w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            AM
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">{adminName}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{adminRole}</p>
          </div>
        </div>
      </div>

      <DbOptimizationModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
        isAdmin={true}
      />
    </header>
  );
};

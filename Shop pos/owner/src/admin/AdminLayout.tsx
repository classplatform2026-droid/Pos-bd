import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { api } from '../services/api';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopHeader, AdminNotification } from './AdminTopHeader';
import { AdminMobileBottomNav } from './AdminMobileBottomNav';
import { AdminTab } from './types';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { AdminShopsScreen } from './screens/AdminShopsScreen';
import { AdminSubscriptionsScreen } from './screens/AdminSubscriptionsScreen';
import { AdminPaymentsScreen } from './screens/AdminPaymentsScreen';
import { AdminFeaturesScreen } from './screens/AdminFeaturesScreen';
import { AdminSupportScreen } from './screens/AdminSupportScreen';
import { AdminSettingsScreen } from './screens/AdminSettingsScreen';

interface AdminLayoutProps {
  onSwitchToOwnerPos?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onSwitchToOwnerPos }) => {
  const { currentUser, logoutUser } = usePos();
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [headerSearch, setHeaderSearch] = useState('');
  const [selectedShopIdForDetails, setSelectedShopIdForDetails] = useState<string | null>(null);
  const [selectedPaymentForReview, setSelectedPaymentForReview] = useState<any | null>(null);
  const [openPaymentAddModal, setOpenPaymentAddModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    api.getAdminMetrics()
      .then((res) => {
        if (!res) return;
        const notifs: AdminNotification[] = [];
        if (res.pendingPayments && res.pendingPayments.length > 0) {
          res.pendingPayments.forEach((p: any) => {
            notifs.push({
              id: `pay-${p._id || p.id}`,
              title: `পেমেন্ট অনুমোদন প্রয়োজন: ${p.shopName || 'দোকান'}`,
              message: `${p.method || 'bKash'} পেমেন্ট ৳${(p.amount || 0).toLocaleString()} (TrxID: ${p.transactionId || 'N/A'}) এসেছে।`,
              type: 'payment',
              time: 'মুলতবি',
              actionLabel: 'রিভিউ ও অনুমোদন করুন',
              onAction: () => handleNavigateToPayments(p),
            });
          });
        }
        setAdminNotifications(notifs);
      })
      .catch(() => {});
  }, []);

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleNavigateToShops = (shopId?: string) => {
    if (shopId) {
      setSelectedShopIdForDetails(shopId);
    }
    setCurrentTab('shops');
  };

  const handleNavigateToPayments = (payment?: any, openAddModal?: boolean) => {
    if (payment) {
      setSelectedPaymentForReview(payment);
    }
    if (openAddModal) {
      setOpenPaymentAddModal(true);
    }
    setCurrentTab('payments');
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'shops') setSelectedShopIdForDetails(null);
          if (tab !== 'payments') {
            setSelectedPaymentForReview(null);
            setOpenPaymentAddModal(false);
          }
        }}
        adminName={currentUser?.name || 'Admin Manager'}
        adminRole={currentUser?.role || 'Super Admin'}
        onLogout={logoutUser}
        onSwitchToOwnerPos={onSwitchToOwnerPos}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AdminTopHeader
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          searchPlaceholder={`Search ${currentTab}...`}
          adminName={currentUser?.name || 'Admin Manager'}
          adminRole={currentUser?.role === 'SuperAdmin' ? 'Super Admin' : 'Platform Admin'}
          notifications={adminNotifications}
          onReviewPayment={(payment) => handleNavigateToPayments(payment)}
          onNavigateToShops={(shopId) => handleNavigateToShops(shopId)}
        />

        <main className="flex-1 overflow-y-auto pb-24 md:pb-6">
          {currentTab === 'dashboard' && (
            <AdminDashboardScreen
              onNavigateToShops={() => handleNavigateToShops()}
              onNavigateToPayments={() => handleNavigateToPayments()}
              onReviewPayment={(payment) => handleNavigateToPayments(payment)}
              onAddPayment={() => handleNavigateToPayments(undefined, true)}
              onSwitchToOwnerPos={onSwitchToOwnerPos}
            />
          )}

          {currentTab === 'shops' && (
            <AdminShopsScreen
              initialSelectedShopId={selectedShopIdForDetails}
              onClearSelectedShop={() => setSelectedShopIdForDetails(null)}
              onShowToast={showToast}
              onSwitchToOwnerPos={onSwitchToOwnerPos}
            />
          )}

          {currentTab === 'subscriptions' && (
            <AdminSubscriptionsScreen
              onShowToast={showToast}
              onNavigateToShop={(shopId) => handleNavigateToShops(shopId)}
            />
          )}

          {currentTab === 'payments' && (
            <AdminPaymentsScreen
              initialPaymentToReview={selectedPaymentForReview}
              initialOpenAddModal={openPaymentAddModal}
              onClearAddModal={() => setOpenPaymentAddModal(false)}
              onClearReviewPayment={() => setSelectedPaymentForReview(null)}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'features' && (
            <AdminFeaturesScreen
              onShowToast={showToast}
              onSwitchToOwnerPos={onSwitchToOwnerPos}
            />
          )}

          {currentTab === 'support' && (
            <AdminSupportScreen onShowToast={showToast} />
          )}

          {currentTab === 'settings' && (
            <AdminSettingsScreen onShowToast={showToast} />
          )}
        </main>

        <AdminMobileBottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'shops') setSelectedShopIdForDetails(null);
            if (tab !== 'payments') setSelectedPaymentForReview(null);
          }}
        />
      </div>

      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 transition-all ${
            toast.type === 'danger'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

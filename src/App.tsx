import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { PosProvider, usePos, ScreenType } from './context/PosContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ReceiptModal } from './components/ReceiptModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { DashboardScreen } from './screens/DashboardScreen';
import { PosScreen } from './screens/PosScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { SalesScreen } from './screens/SalesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { AdminLayout } from './admin/AdminLayout';
import { ShopMasterLoader } from './components/ShopMasterLoader';
import { InstallPwaModal } from './components/InstallPwaModal';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    activeScreen,
    setActiveScreen,
    selectedSaleForReceipt,
    setSelectedSaleForReceipt,
    storeInfo,
    subscriptionExpired,
    isPageEnabled,
    isInitialLoading,
  } = usePos();

  const [headerSearch, setHeaderSearch] = useState('');
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'pos'>('admin');
  const [loaderMounted, setLoaderMounted] = useState(true);

  const isPlatformAdmin = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin';

  const getSearchPlaceholder = () => {
    switch (activeScreen) {
      case 'pos':
        return 'Search product by name, barcode or SKU...';
      case 'products':
        return 'Search catalog products...';
      case 'sales':
        return 'Search invoice number or customer...';
      default:
        return 'Search anything in shop...';
    }
  };

  const handleHeaderSearchChange = (val: string) => {
    setHeaderSearch(val);
    if (val && activeScreen === 'dashboard') {
      setActiveScreen('pos');
    }
  };

  const renderContent = () => {
    if (!currentUser) {
      return <LoginScreen />;
    }

    if (isPlatformAdmin && adminViewMode === 'admin') {
      return (
        <AdminLayout
          onSwitchToOwnerPos={() => setAdminViewMode('pos')}
        />
      );
    }

    return (
      <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <TopHeader
            searchPlaceholder={getSearchPlaceholder()}
            searchValue={headerSearch}
            onSearchChange={handleHeaderSearchChange}
            onBarcodeScanClick={() => setBarcodeModalOpen(true)}
          />

          {isPlatformAdmin && adminViewMode === 'pos' && (
            <div className="bg-slate-900 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs shrink-0 z-10 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Viewing Store POS as Administrator ({currentUser.name})</span>
              </div>
              <button
                type="button"
                onClick={() => setAdminViewMode('admin')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                Return to Admin Panel
              </button>
            </div>
          )}

          {(subscriptionExpired || storeInfo.subscription?.status === 'expired') && (
            <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs shrink-0 z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Subscription Notice: Your store plan is currently expired or pending renewal.</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveScreen('settings')}
                className="bg-white text-amber-900 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors shadow-xs"
              >
                Subscription Details
              </button>
            </div>
          )}

          <main className={`flex-1 min-h-0 ${activeScreen === 'pos' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-16 md:pb-0'}`}>
            {!isPageEnabled(activeScreen) ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 shadow-xs">
                  <Lock className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-2">
                  Access Disabled
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  এই ফিচারটি সাময়িকভাবে বন্ধ আছে
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  The "{activeScreen.toUpperCase()}" page has been turned off by the platform administrator for your store.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const screens: ScreenType[] = ['dashboard', 'pos', 'products', 'sales', 'settings'];
                    const firstAvailable = screens.find((s) => isPageEnabled(s)) || 'dashboard';
                    setActiveScreen(firstAvailable);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span>Return to Available Screen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {activeScreen === 'dashboard' && <DashboardScreen />}
                {activeScreen === 'pos' && (
                  <PosScreen
                    searchQuery={headerSearch}
                    onOpenBarcodeModal={() => setBarcodeModalOpen(true)}
                  />
                )}
                {activeScreen === 'products' && <ProductsScreen />}
                {activeScreen === 'sales' && <SalesScreen />}
                {activeScreen === 'settings' && <SettingsScreen />}
              </>
            )}
          </main>

          <MobileBottomNav />
        </div>

        {selectedSaleForReceipt && (
          <ReceiptModal
            sale={selectedSaleForReceipt}
            onClose={() => setSelectedSaleForReceipt(null)}
            onNewSale={() => {
              setSelectedSaleForReceipt(null);
              setHeaderSearch('');
            }}
          />
        )}

        {barcodeModalOpen && (
          <BarcodeScannerModal onClose={() => setBarcodeModalOpen(false)} />
        )}
      </div>
    );
  };

  return (
    <>
      {loaderMounted && (
        <ShopMasterLoader
          isLoading={isInitialLoading}
          onComplete={() => setLoaderMounted(false)}
        />
      )}
      {renderContent()}
      <InstallPwaModal />
    </>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('shoppos_jwt_token');
      localStorage.removeItem('shoppos_current_user');
      localStorage.removeItem('shoppos_sidebar_collapsed');
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto font-bold text-xl">
              !
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Application Notice</h2>
              <p className="text-xs text-slate-500 mt-1">
                {this.state.error?.message || 'A session or network error occurred.'}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Clear Session & Return to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <PosProvider>
        <MainLayout />
      </PosProvider>
    </GlobalErrorBoundary>
  );
}

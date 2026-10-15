import React, { useState } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { LoginScreen } from './screens/LoginScreen';
import { AdminLayout } from './AdminLayout';
import { ShopMasterLoader } from './components/ShopMasterLoader';
import { InstallPwaModal } from './components/InstallPwaModal';

const AdminPortalApp: React.FC = () => {
  const { currentUser, isInitialLoading } = usePos();
  const [loaderMounted, setLoaderMounted] = useState(true);

  const renderContent = () => {
    if (!currentUser) {
      return <LoginScreen />;
    }

    const isPlatformAdmin = currentUser.role === 'SuperAdmin' || currentUser.role === 'Admin';

    if (!isPlatformAdmin) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
            <p className="text-slate-600 text-sm mb-6">
              You are logged in as <strong>{currentUser.name}</strong> ({currentUser.role}). This portal requires SuperAdmin or Platform Administrator privileges.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('shoppos_jwt_token');
                localStorage.removeItem('shoppos_current_user');
                window.location.reload();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      );
    }

    return <AdminLayout />;
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

export default function App() {
  return (
    <PosProvider>
      <AdminPortalApp />
    </PosProvider>
  );
}

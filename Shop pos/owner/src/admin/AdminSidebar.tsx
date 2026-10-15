import React from 'react';
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Receipt,
  Headphones,
  Settings,
  LogOut,
  ShoppingBag,
  Sliders,
} from 'lucide-react';
import { AdminTab } from './types';
import { ShopMasterLogo } from '../components/ShopMasterLogo';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  adminName?: string;
  adminRole?: string;
  onLogout: () => void;
  onSwitchToOwnerPos?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  adminName = 'Admin Manager',
  adminRole = 'Super Admin',
  onLogout,
  onSwitchToOwnerPos,
}) => {
  const mainNavItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'shops', label: 'Shops', icon: Store },
    { id: 'features', label: 'Feature Controls', icon: Sliders },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'payments', label: 'Payments', icon: Receipt },
    { id: 'support', label: 'Support', icon: Headphones },
  ];

  const handleItemClick = (tab: AdminTab) => {
    onSelectTab(tab);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B1528] text-slate-300">
      <div className="px-5 py-5 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-700/60 flex items-center justify-center shadow-md shadow-blue-600/30 p-1">
            <ShopMasterLogo size={28} />
          </div>
          <div>
            <div className="font-extrabold text-white text-base tracking-tight leading-none flex items-center gap-1.5">
              ShopPOS
            </div>
            <div className="mt-1">
              <span className="inline-block text-[9px] font-bold text-blue-400 bg-blue-950/80 border border-blue-800/50 px-2 py-0.5 rounded-full tracking-wider">
                Admin Panel
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-4">
          <div className="px-3.5 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Settings
          </div>
          <button
            type="button"
            onClick={() => handleItemClick('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              currentTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Settings className={`w-4 h-4 ${currentTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
            <span>Settings</span>
          </button>
        </div>

        {onSwitchToOwnerPos && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                onSwitchToOwnerPos();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 hover:bg-emerald-900/40 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>View Store POS</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800/80 bg-[#080f1e]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-blue-400/40">
            AM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{adminName}</p>
            <p className="text-[10px] text-slate-400 truncate">{adminRole}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onLogout();
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <aside className="hidden md:flex w-64 h-screen shrink-0 select-none border-r border-slate-800/80">
      {sidebarContent}
    </aside>
  );
};

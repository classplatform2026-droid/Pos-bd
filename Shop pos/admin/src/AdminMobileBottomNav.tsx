import React from 'react';
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Receipt,
  Settings,
  Sliders,
} from 'lucide-react';
import { AdminTab } from './types';

interface AdminMobileBottomNavProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
}

export const AdminMobileBottomNav: React.FC<AdminMobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const navItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'shops', label: 'Shops', icon: Store },
    { id: 'features', label: 'Features', icon: Sliders },
    { id: 'subscriptions', label: 'Plans', icon: CreditCard },
    { id: 'payments', label: 'Payments', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B1528] border-t border-slate-800/80 z-30 px-2 flex items-center justify-around select-none shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isActive ? 'text-blue-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-blue-950/80' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

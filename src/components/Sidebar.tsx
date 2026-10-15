import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Receipt,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { usePos, ScreenType } from '../context/PosContext';
import { ShopMasterLogo } from './ShopMasterLogo';

export const Sidebar: React.FC = () => {
  const {
    activeScreen,
    setActiveScreen,
    storeInfo,
    cartItemCount,
    isPageEnabled,
    isSidebarCollapsed,
    toggleSidebar,
  } = usePos();

  const navItems: {
    id: ScreenType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS', icon: ShoppingBag, badge: cartItemCount },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'sales', label: 'Sales', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-white border-r border-slate-200/80 h-screen sticky top-0 shrink-0 select-none z-30 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'w-20' : 'w-56 lg:w-64'
      }`}
    >
      {/* Header with Shop Logo and PC Toggle Button */}
      <div
        className={`flex items-center h-18 border-b border-slate-100 transition-all ${
          isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4 lg:px-5'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-xs shrink-0 p-1">
            <ShopMasterLogo size={34} />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="font-bold text-base text-slate-900 tracking-tight leading-tight truncate">
                ShopPOS
              </span>
              <span className="text-[10px] font-medium text-slate-400 truncate">
                Retail Cloud SaaS
              </span>
            </div>
          )}
        </div>

        {/* Toggle Button for PC */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          const isEnabled = isPageEnabled(item.id);

          if (!isEnabled) {
            return (
              <div
                key={item.id}
                title="This page is disabled"
                className={`w-full flex items-center rounded-xl font-medium text-xs text-slate-400 bg-slate-50/70 border border-dashed border-slate-200 select-none opacity-60 cursor-not-allowed ${
                  isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                }`}
              >
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                {!isSidebarCollapsed && (
                  <>
                    <span className="line-through truncate mx-2">{item.label}</span>
                    <span className="text-[9px] font-bold">OFF</span>
                  </>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl font-medium transition-all group relative cursor-pointer ${
                isSidebarCollapsed
                  ? 'justify-center p-3'
                  : 'justify-between px-3.5 py-2.5 text-sm'
              } ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  {isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-blue-600 ring-2 ring-white text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </div>
              {!isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Store Info */}
      <div className="p-3 border-t border-slate-100">
        <div
          className={`w-full flex items-center rounded-xl border border-slate-200/80 bg-slate-50 ${
            isSidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              title={`${storeInfo.name} (${storeInfo.branch})`}
              className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs relative"
            >
              {storeInfo.name ? storeInfo.name.charAt(0) : 'S'}
              {isSidebarCollapsed && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 border border-white absolute -top-0.5 -right-0.5" />
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {storeInfo.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate leading-tight">
                  {storeInfo.branch}
                </p>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Shop" />
          )}
        </div>
      </div>
    </aside>
  );
};

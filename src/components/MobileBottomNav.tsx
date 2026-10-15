import React from 'react';
import { LayoutDashboard, ShoppingBag, Package, Receipt, Settings } from 'lucide-react';
import { usePos, ScreenType } from '../context/PosContext';

export const MobileBottomNav: React.FC = () => {
  const { activeScreen, setActiveScreen, cartItemCount, isPageEnabled } = usePos();

  const navItems: {
    id: ScreenType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'pos', label: 'POS', icon: ShoppingBag, badge: cartItemCount },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'sales', label: 'Sales', icon: Receipt },
    { id: 'settings', label: 'More', icon: Settings },
  ];

  const visibleNavItems = navItems.filter((item) => isPageEnabled(item.id));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] z-40 flex items-center justify-around shadow-lg">
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeScreen === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveScreen(item.id)}
            className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-all select-none relative cursor-pointer active:scale-95 ${
              isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

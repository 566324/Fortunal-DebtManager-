import React from 'react';
import { LayoutDashboard, Users, Plus, BarChart3, Menu } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAddDebt: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddDebt,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur-lg px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          id="mobile-nav-home"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition ${
            currentTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>

        {/* People */}
        <button
          id="mobile-nav-people"
          onClick={() => onSelectTab('customers')}
          className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition ${
            currentTab === 'customers' || currentTab === 'debts' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>People</span>
        </button>

        {/* Prominent Add Button */}
        <div className="relative -top-3">
          <button
            id="mobile-nav-add"
            onClick={onOpenAddDebt}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 hover:bg-emerald-500 active:scale-95 transition border-2 border-slate-900"
            aria-label="Add Debt"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Reports */}
        <button
          id="mobile-nav-reports"
          onClick={() => onSelectTab('reports')}
          className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition ${
            currentTab === 'reports' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>Reports</span>
        </button>

        {/* More */}
        <button
          id="mobile-nav-more"
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium transition ${
            currentTab === 'settings' || currentTab === 'assistant' || currentTab === 'payments' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
};

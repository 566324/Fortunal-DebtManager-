import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  History,
  BellRing,
  BarChart3,
  BotMessageSquare,
  Settings,
  Zap,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenGetMePaid: () => void;
  onOpenUpgrade: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenGetMePaid,
  onOpenUpgrade,
}) => {
  const { user, activeDebtsCount, totalOverdue, formatMoney } = useDebt();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'debts', label: 'Debt Ledger', icon: CreditCard },
    { id: 'payments', label: 'Payments', icon: History },
    { id: 'reminders', label: 'Reminders', icon: BellRing },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'assistant', label: 'AI Money Assistant', icon: BotMessageSquare, badge: 'AI' },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-900/60 p-4 shrink-0 min-h-[calc(100vh-61px)]">
      {/* Signature Quick Trigger */}
      <div className="mb-4">
        <button
          onClick={onOpenGetMePaid}
          className="w-full flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/10 border border-amber-500/30 p-3 text-left hover:border-amber-400/50 transition group"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Get Me Paid</p>
              <p className="text-[11px] text-slate-400">Collection Plan</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
            Active
          </span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Plan Usage & Upgrade Banner */}
      <div className="mt-auto pt-4 border-t border-slate-800/80">
        <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-3 text-xs">
          <div className="flex items-center justify-between text-slate-300 mb-1.5">
            <span className="font-semibold text-slate-200">Plan Usage</span>
            <span className="text-[11px] text-emerald-400 font-bold">
              {activeDebtsCount} / {user.subscription.maxDebts >= 9999 ? 'Unlimited' : `${user.subscription.maxDebts}`} Debts
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (activeDebtsCount / (user.subscription.maxDebts >= 9999 ? Math.max(100, activeDebtsCount) : user.subscription.maxDebts)) * 100)}%`,
              }}
            />
          </div>
          <button
            onClick={onOpenUpgrade}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-1.5 transition text-[11px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Unlock Unlimited</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>
    </aside>
  );
};

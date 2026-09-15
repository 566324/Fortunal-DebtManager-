import React from 'react';
import {
  Briefcase,
  User,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  onOpenAddDebt: () => void;
  onOpenGetMePaid: () => void;
  onOpenAuth: () => void;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddDebt,
  onOpenGetMePaid,
  onOpenAuth,
  onSelectTab,
}) => {
  const { user, switchAccountType, activeDebtsCount } = useDebt();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* Brand Logo & Tagline */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onSelectTab('dashboard')}
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md shadow-emerald-950/40 group-hover:scale-105 transition">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="50 10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5 5.5-5.5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-white font-display">
                Fortunal <span className="text-emerald-400">DebtManager</span>
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                AI Powered
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 font-medium">
              Know who owes. Know when. Get paid.
            </p>
          </div>
        </div>

        {/* Center / Mode Toggle & Quick Action */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Personal vs Business Mode Pill */}
          <div className="flex items-center rounded-xl bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
            <button
              id="switch-personal-mode"
              onClick={() => switchAccountType('personal')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition ${
                user.accountType === 'personal'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal</span>
            </button>
            <button
              id="switch-business-mode"
              onClick={() => switchAccountType('business')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition ${
                user.accountType === 'business'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Business</span>
            </button>
          </div>

          {/* Business Name Badge */}
          {user.accountType === 'business' && user.businessProfile.businessName && (
            <span className="text-xs text-slate-300 bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/40 truncate max-w-[200px]">
              {user.businessProfile.businessName}
            </span>
          )}
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Signature "GET ME PAID" button */}
          <button
            id="nav-get-me-paid-btn"
            onClick={onOpenGetMePaid}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-900/30 transition active:scale-95"
            title="Analyze overdue records and generate today's collection plan"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span className="uppercase tracking-wider">Get Me Paid</span>
          </button>

          {/* Add Debt Quick Button */}
          <button
            id="nav-add-debt-btn"
            onClick={onOpenAddDebt}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span className="hidden sm:inline">Add Debt</span>
          </button>

          {/* User Profile Avatar / Menu Trigger */}
          <button
            id="user-profile-menu-btn"
            onClick={onOpenAuth}
            className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 p-1.5 border border-slate-700/60 transition"
            title="Account & Authentication"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950 text-emerald-300 font-bold text-xs border border-emerald-700/40">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden xl:block text-left pr-1">
              <p className="text-xs font-semibold text-white leading-none">{user.name.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                {user.subscription.plan} • {activeDebtsCount}/{user.subscription.maxDebts >= 9999 ? '∞' : user.subscription.maxDebts}
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { X, Sparkles, Check, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { DEBT_MANAGER_PLANS } from '../data/subscriptionPlans';
import { DebtManagerPlanId } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUserProfile } = useDebt();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPlanId = user.subscription?.plan || 'free';

  const handleSelectPlan = (planId: DebtManagerPlanId) => {
    const selected = DEBT_MANAGER_PLANS.find((p) => p.id === planId);
    if (!selected) return;

    if (currentPlanId === planId && user.subscription?.status === 'active') {
      return;
    }

    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + 1);

    updateUserProfile({
      subscription: {
        plan: planId,
        status: 'active',
        maxDebts: selected.maxDebts,
        aiCreditsUsed: user.subscription?.aiCreditsUsed || 0,
        aiCreditsMax: selected.aiCreditsMax,
        priceKes: selected.priceKes,
        billingPeriodStart: now.toISOString(),
        billingPeriodEnd: expiry.toISOString(),
        expiresAt: expiry.toISOString(),
      },
    });

    setSuccessMsg(`Switched to Fortunal DebtManager ${selected.name} (KSh ${selected.priceKes.toLocaleString()}/month)!`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Fortunal DebtManager Plans</h2>
              <p className="text-xs text-slate-400">
                Choose the right subscription tier for your credit-sales and debt collection scale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Toast */}
        {successMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Subtitle Banner */}
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-xl font-black text-white">Know Who Owes. Know When. Get Paid.</h3>
            <p className="text-xs text-slate-400">
              Transparent Kenyan pricing. All financial records and customer debt histories are safely preserved across plan upgrades.
            </p>
          </div>

          {/* 4 Plans Grid: Free → Starter → Pro → Business */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {DEBT_MANAGER_PLANS.map((plan) => {
              const isCurrent = currentPlanId === plan.id;
              const isPro = plan.popular;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                    isPro
                      ? 'bg-slate-850 border-2 border-emerald-500 shadow-xl shadow-emerald-950/60 ring-1 ring-emerald-500/50'
                      : 'bg-slate-850/80 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black px-3 py-0.5 tracking-wider shadow-md">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Title & Current Status */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-base text-white">{plan.name}</span>
                      {isCurrent && (
                        <span className="rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div>
                      <div className="text-2xl font-black text-white flex items-baseline gap-1">
                        <span>KSh {plan.priceKes.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 font-normal">{plan.period}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{plan.tagline}</p>
                    </div>

                    {/* Features List */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Included features:</p>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-5 mt-4 border-t border-slate-800/60">
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full rounded-xl py-2.5 px-3 text-xs font-bold transition active:scale-95 text-center ${
                        isCurrent
                          ? 'bg-slate-800 text-slate-400 border border-slate-700/60 cursor-default'
                          : isPro
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                            : plan.id === 'business'
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                              : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      {isCurrent ? 'Current Plan' : isPro ? 'Choose Pro' : `Choose ${plan.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Security / Architecture Notice */}
          <div className="rounded-xl bg-slate-850/60 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-slate-300 text-xs text-center font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pay securely with M-Pesa, Airtel Money, or Debit Card. Change or cancel anytime.</span>
            </div>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              <strong>Data Protection Guarantee:</strong> Expiry or changing your subscription tier will <em>never</em> delete, lock, or modify your recorded debts, customer profiles, payment receipts, or financial audit history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

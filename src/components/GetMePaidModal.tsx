import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Clock,
  Phone,
  PhoneCall,
  Share2,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Target,
  Receipt,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { CollectionPlanItem, ReminderStyle } from '../types';

interface GetMePaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReminder: (customerId: string, debtId: string, style: ReminderStyle) => void;
  onOpenPayment: (debtId: string) => void;
}

export const GetMePaidModal: React.FC<GetMePaidModalProps> = ({
  isOpen,
  onClose,
  onOpenReminder,
  onOpenPayment,
}) => {
  const { collectionPlan, summary, formatMoney } = useDebt();

  // Daily target calculation
  const totalOverdue = summary.totalOverdue;
  const suggestedDailyGoal = Math.min(totalOverdue, Math.ceil(totalOverdue * 0.4 / 100) * 100);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900/50 via-slate-900 to-amber-950/40 border-b border-slate-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white uppercase">
                    Get Me Paid Today
                  </h2>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                    AI Prioritized
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Your smart, ranked collection plan to recover money fastest
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Target Bar */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Overdue</span>
              <span className="text-base font-black text-rose-400">
                {formatMoney(summary.totalOverdue)}
              </span>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Target for Today</span>
              <span className="text-base font-black text-emerald-400">
                {formatMoney(suggestedDailyGoal)}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl bg-slate-900/80 border border-slate-800 p-3">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Actionable Debtors</span>
              <span className="text-base font-black text-amber-400">
                {collectionPlan.length} people
              </span>
            </div>
          </div>
        </div>

        {/* Collection items list */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3.5">
          {collectionPlan.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Target className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">All caught up!</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No debts are currently overdue or pending urgent collection. Great job managing your credit sales!
              </p>
            </div>
          ) : (
            collectionPlan.map((item, index) => {
              const isHigh = item.priority === 'high';
              const isMedium = item.priority === 'medium';

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition ${
                    isHigh
                      ? 'bg-rose-950/15 border-rose-500/40 hover:border-rose-500/60'
                      : isMedium
                      ? 'bg-amber-950/10 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white">{item.customerName}</h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            isHigh
                              ? 'bg-rose-500/20 text-rose-300'
                              : isMedium
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {item.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {item.debtDescription} • Due: {item.dueDate} (
                        {item.daysOverdue > 0 ? (
                          <span className="text-rose-400 font-semibold">{item.daysOverdue} days late</span>
                        ) : (
                          <span className="text-amber-400">Due today</span>
                        )}
                        )
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-white">
                        {formatMoney(item.amountOutstanding, item.currency)}
                      </span>
                    </div>
                  </div>

                  {/* AI strategy rationale */}
                  <div className="mt-2.5 rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 text-xs text-slate-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Why now: </span>
                      <span>{item.explanation}</span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {item.customerPhone && (
                        <a
                          href={`tel:${item.customerPhone}`}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Call</span>
                        </a>
                      )}
                      <button
                        onClick={() => {
                          onOpenReminder(item.customerId, item.debtId, item.suggestedStyle);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Send WhatsApp ({item.suggestedStyle})</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        onOpenPayment(item.debtId);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Record Payment</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 px-6 py-3 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>Prioritized by highest balance, days late, and payment likelihood.</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-bold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

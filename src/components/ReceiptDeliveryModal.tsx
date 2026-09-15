import React, { useState } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Smartphone,
  MessageSquare,
  Mail,
  Zap,
  PlusCircle,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { ReceiptDeliveryPlanId } from '../types';

interface ReceiptDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptDeliveryModal: React.FC<ReceiptDeliveryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    user,
    updateReceiptDeliverySubscription,
    addReceiptCreditPack,
    receiptDeliveryLogs,
    receipts,
    customers,
  } = useDebt();

  const [selectedPlan, setSelectedPlan] = useState<ReceiptDeliveryPlanId>(
    user.receiptDeliverySubscription?.planId || 'manual_free'
  );
  const [activeTab, setActiveTab] = useState<'plans' | 'logs' | 'topup'>('plans');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSub = user.receiptDeliverySubscription || {
    planId: 'manual_free',
    planName: 'Manual Free Sharing',
    status: 'active' as const,
    cycle: 'monthly' as const,
    priceKes: 0,
    monthlyAllowance: 0,
    usedThisCycle: 0,
    addOnCredits: 0,
    renewalDate: '2026-10-14',
    channels: {
      whatsapp: { used: 0, included: 0, remaining: 0 },
      sms: { used: 0, included: 0, remaining: 0 },
      email: { used: 0, included: 0, remaining: 0 },
    },
  };

  const totalCreditsRemaining =
    Math.max(0, currentSub.monthlyAllowance - currentSub.usedThisCycle) + currentSub.addOnCredits;

  const plans: {
    id: ReceiptDeliveryPlanId;
    name: string;
    price: number;
    allowance: number;
    description: string;
    badge?: string;
  }[] = [
    {
      id: 'manual_free',
      name: 'Manual Free (Default)',
      price: 0,
      allowance: 0,
      description: 'Free unlimited manual WhatsApp sharing, device printing, and PDF downloads.',
    },
    {
      id: 'receipt_100',
      name: 'Starter Auto-Deliver 100',
      price: 299,
      allowance: 100,
      description: '100 automatic SMS / WhatsApp official receipts dispatched immediately upon payment.',
    },
    {
      id: 'receipt_500',
      name: 'Business Auto-Deliver 500',
      price: 999,
      allowance: 500,
      badge: 'MOST POPULAR',
      description: '500 automatic multi-channel dispatches with real-time delivery confirmations.',
    },
    {
      id: 'receipt_1000',
      name: 'Pro Auto-Deliver 1,000',
      price: 1699,
      allowance: 1000,
      description: '1,000 dispatches per month with Daraja M-Pesa automated callback auto-receipting.',
    },
  ];

  const handleSelectPlan = (planId: ReceiptDeliveryPlanId) => {
    const target = plans.find((p) => p.id === planId);
    if (!target) return;

    updateReceiptDeliverySubscription({
      planId: target.id,
      planName: target.name,
      status: 'active',
      priceKes: target.price,
      monthlyAllowance: target.allowance,
      usedThisCycle: 0,
    });

    setSelectedPlan(planId);
    setSuccessMsg(`Switched to ${target.name}!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleAddCredits = (credits: number) => {
    addReceiptCreditPack(credits);
    setSuccessMsg(`Added +${credits} delivery credits successfully!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-950/40 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Automatic Receipt Delivery</h3>
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  Separate Billable Service
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Instantly dispatch official receipts via SMS or WhatsApp upon payment confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'plans'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Subscription Plans
          </button>
          <button
            onClick={() => setActiveTab('topup')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'topup'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Credit Top-Up Packs
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Delivery Audit Logs ({receiptDeliveryLogs.length})
          </button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-xs text-emerald-300 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Balance Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-850 border border-slate-800 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Plan</span>
              <span className="text-sm font-bold text-white mt-0.5 block truncate">
                {currentSub.planName}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                Status: {currentSub.status.toUpperCase()}
              </span>
            </div>

            <div className="rounded-xl bg-slate-850 border border-slate-800 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Auto-Delivery Credits</span>
              <span className="text-lg font-black text-blue-400 mt-0.5 block">
                {totalCreditsRemaining} remaining
              </span>
              <span className="text-[10px] text-slate-400 block">
                Used: {currentSub.usedThisCycle} • Add-on: +{currentSub.addOnCredits}
              </span>
            </div>

            <div className="rounded-xl bg-slate-850 border border-slate-800 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Non-Deletion Guarantee</span>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Financial Data Protected</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Plan expiry never alters receipts or ledgers
              </span>
            </div>
          </div>

          {/* TAB: PLANS */}
          {activeTab === 'plans' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Select an automated receipt dispatch plan to automatically notify customers when payments are recorded:
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {plans.map((p) => {
                  const isCurrent = currentSub.planId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl p-4 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-blue-950/40 border-blue-500/50'
                          : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{p.name}</span>
                          {p.badge && (
                            <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5">
                              {p.badge}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold px-2 py-0.5">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{p.description}</p>
                        <p className="text-xs font-semibold text-blue-400">
                          {p.price === 0 ? 'Free of charge' : `KSh ${p.price.toLocaleString()} / month`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectPlan(p.id)}
                        disabled={isCurrent}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                          isCurrent
                            ? 'bg-slate-800 text-slate-500 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/40'
                        }`}
                      >
                        {isCurrent ? 'Active Plan' : 'Select Plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: TOP-UP PACKS */}
          {activeTab === 'topup' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                Need extra delivery credits without changing your subscription? Top up on-demand:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-850 border border-slate-800 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Mini Boost</span>
                    <span className="text-xl font-black text-emerald-400 block mt-1">+100</span>
                    <span className="text-[11px] text-slate-400 block">KSh 250 (one-time)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddCredits(100)}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white transition active:scale-95"
                  >
                    Add +100 Credits
                  </button>
                </div>

                <div className="rounded-xl bg-slate-850 border border-slate-800 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Standard Pack</span>
                    <span className="text-xl font-black text-emerald-400 block mt-1">+500</span>
                    <span className="text-[11px] text-slate-400 block">KSh 999 (one-time)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddCredits(500)}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white transition active:scale-95"
                  >
                    Add +500 Credits
                  </button>
                </div>

                <div className="rounded-xl bg-slate-850 border border-slate-800 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Bulk Enterprise</span>
                    <span className="text-xl font-black text-emerald-400 block mt-1">+2,000</span>
                    <span className="text-[11px] text-slate-400 block">KSh 3,499 (one-time)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddCredits(2000)}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-bold text-white transition active:scale-95"
                  >
                    Add +2,000 Credits
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Dispatched Records: {receiptDeliveryLogs.length}</span>
                <span className="text-[10px]">Real-time Audit Trail</span>
              </div>

              {receiptDeliveryLogs.length === 0 ? (
                <div className="rounded-xl bg-slate-850 border border-slate-800 p-8 text-center text-slate-400 space-y-1">
                  <Clock className="w-6 h-6 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-white">No delivery dispatches logged yet</p>
                  <p className="text-[11px]">
                    Automatic and manual receipt dispatches will appear here with delivery timestamps.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-xl bg-slate-850 border border-slate-800 overflow-hidden max-h-72 overflow-y-auto">
                  {receiptDeliveryLogs.map((log) => {
                    const matchedCustomer = customers.find((c) => c.id === log.customerId);
                    const matchedReceipt = receipts.find((r) => r.id === log.receiptId);
                    return (
                      <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">
                              {matchedCustomer?.name || 'Customer'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                              {matchedReceipt?.receiptNumber || 'RECEIPT'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              {log.channel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Recipient: {log.customerPhone || 'N/A'} • Provider: {log.provider}
                          </p>
                          <p className="text-[10px] text-slate-500">{log.dispatchedAt}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              log.status === 'delivered' || log.status === 'sent'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : log.status === 'manual_shared'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {log.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-bold text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

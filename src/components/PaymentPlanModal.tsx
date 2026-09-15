import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Copy,
  Trash2,
  Repeat,
  ShieldCheck,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { Debt, DebtPaymentPlan } from '../types';

interface PaymentPlanModalProps {
  isOpen: boolean;
  debtId: string | null;
  onClose: () => void;
}

export const PaymentPlanModal: React.FC<PaymentPlanModalProps> = ({
  isOpen,
  debtId,
  onClose,
}) => {
  const { debts, customers, updateDebtPaymentPlan, formatMoney, user } = useDebt();

  const debt = debts.find((d) => d.id === debtId);
  const customer = customers.find((c) => c.id === debt?.customerId);

  const [enabled, setEnabled] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [totalInstallments, setTotalInstallments] = useState<number>(4);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (debt) {
      const plan = debt.paymentPlan;
      if (plan && plan.enabled) {
        setEnabled(true);
        setTotalAmount(plan.totalPlanAmount || debt.currentBalance);
        setFrequency(plan.installmentFrequency || 'weekly');
        setTotalInstallments(plan.numberOfInstallments || 4);
        setInstallmentAmount(plan.installmentAmount || Math.ceil(debt.currentBalance / 4));
        setStartDate(plan.nextInstallmentDueDate || debt.dueDate);
        setNotes(plan.paymentPlanNotes || '');
      } else {
        setEnabled(false);
        setTotalAmount(debt.currentBalance);
        setFrequency('weekly');
        setTotalInstallments(4);
        setInstallmentAmount(Math.ceil(debt.currentBalance / 4));
        // Default start date is next week or debt due date
        const d = new Date(Date.now() + 7 * 86400000);
        setStartDate(d.toISOString().split('T')[0]);
        setNotes('');
      }
    }
  }, [debt, isOpen]);

  if (!isOpen || !debt) return null;

  // Recalculate installment amount when total installments change
  const handleInstallmentsChange = (count: number) => {
    const validCount = Math.max(1, count);
    setTotalInstallments(validCount);
    if (totalAmount > 0) {
      setInstallmentAmount(Math.round(totalAmount / validCount));
    }
  };

  // Recalculate count when installment amount changes
  const handleAmountChange = (amt: number) => {
    setInstallmentAmount(amt);
    if (amt > 0 && totalAmount > 0) {
      const count = Math.ceil(totalAmount / amt);
      setTotalInstallments(count);
    }
  };

  // Compute installment schedule preview
  const generateSchedule = () => {
    const schedule: { installmentNumber: number; dueDate: string; amount: number }[] = [];
    let curDate = new Date(startDate || new Date().toISOString().split('T')[0]);

    for (let i = 1; i <= Math.min(totalInstallments, 24); i++) {
      const dateStr = curDate.toISOString().split('T')[0];
      const isLast = i === totalInstallments;
      const calculatedAmt = isLast
        ? totalAmount - installmentAmount * (totalInstallments - 1)
        : installmentAmount;

      schedule.push({
        installmentNumber: i,
        dueDate: dateStr,
        amount: calculatedAmt > 0 ? calculatedAmt : installmentAmount,
      });

      // Advance date
      if (frequency === 'daily') {
        curDate.setDate(curDate.getDate() + 1);
      } else if (frequency === 'weekly') {
        curDate.setDate(curDate.getDate() + 7);
      } else if (frequency === 'biweekly') {
        curDate.setDate(curDate.getDate() + 14);
      } else if (frequency === 'monthly') {
        curDate.setMonth(curDate.getMonth() + 1);
      }
    }
    return schedule;
  };

  const schedulePreview = generateSchedule();

  const agreementText = `Hello ${customer?.name || 'Customer'}, here is your agreed payment plan for your balance with ${
    user.businessProfile.businessName || user.name || 'Fortunal'
  }:
Total Balance: ${formatMoney(totalAmount, debt.currency)}
Installment: ${formatMoney(installmentAmount, debt.currency)} ${frequency}
Total Installments: ${totalInstallments}
First Due Date: ${startDate}
Kindly remit installments via ${debt.paymentMethod || 'M-Pesa'}. Thank you!`;

  const handleCopyAgreement = () => {
    navigator.clipboard.writeText(agreementText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const encoded = encodeURIComponent(agreementText);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const plan: DebtPaymentPlan = {
      enabled,
      totalPlanAmount: totalAmount,
      installmentAmount,
      installmentFrequency: frequency,
      numberOfInstallments: totalInstallments,
      completedInstallments: debt.paymentPlan?.completedInstallments || 0,
      nextInstallmentDueDate: startDate,
      startDate: debt.paymentPlan?.startDate || new Date().toISOString().split('T')[0],
      paymentPlanNotes: notes,
      paymentPlanStatus: 'active',
    };

    updateDebtPaymentPlan(debt.id, enabled ? plan : undefined);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  const handleRemovePlan = () => {
    updateDebtPaymentPlan(debt.id, undefined);
    setEnabled(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-950 via-slate-900 to-slate-900 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Debt Installment Plan</h3>
                {debt.paymentPlan?.enabled && (
                  <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                    Active Plan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Customer: <strong className="text-slate-200">{customer?.name || 'Customer'}</strong> • Balance:{' '}
                <strong className="text-rose-400">{formatMoney(debt.currentBalance, debt.currency)}</strong>
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

        <form onSubmit={handleSavePlan} className="p-5 space-y-4">
          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Payment plan settings updated successfully!</span>
            </div>
          )}

          {/* Enable / Disable Toggle */}
          <div className="rounded-xl bg-slate-850 border border-slate-800 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Enable Structured Installments</span>
              <span className="text-[11px] text-slate-400 block">
                Automatically track partial payments against scheduled installments
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-violet-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {enabled && (
            <div className="space-y-4 animate-fade-in">
              {/* Plan Amounts & Installments */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Total Plan Balance</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      value={totalAmount || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setTotalAmount(val);
                        if (totalInstallments > 0) {
                          setInstallmentAmount(Math.round(val / totalInstallments));
                        }
                      }}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-bold focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 Weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Number of Installments</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={totalInstallments || ''}
                    onChange={(e) => handleInstallmentsChange(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-bold focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Installment Amount</label>
                  <input
                    type="number"
                    min={1}
                    value={installmentAmount || ''}
                    onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white font-bold text-emerald-400 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">First Installment Due Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              {/* Installment Schedule Projection */}
              <div className="rounded-xl bg-slate-850 border border-slate-800 p-3">
                <span className="text-[11px] font-bold text-slate-300 block mb-2">
                  Projected Payment Schedule ({schedulePreview.length} payments)
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {schedulePreview.map((item) => (
                    <div
                      key={item.installmentNumber}
                      className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2.5 py-1.5 text-[11px] border border-slate-800"
                    >
                      <span className="text-slate-400 font-medium">
                        Installment #{item.installmentNumber} ({item.dueDate})
                      </span>
                      <span className="font-bold text-violet-300">
                        {formatMoney(item.amount, debt.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Terms with Customer */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Share agreement with customer:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyAgreement}
                    className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-slate-300 transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white transition"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {debt.paymentPlan?.enabled ? (
              <button
                type="button"
                onClick={handleRemovePlan}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Plan</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="save-payment-plan-btn"
                className="rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-violet-950/40 transition active:scale-95"
              >
                Save Payment Plan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

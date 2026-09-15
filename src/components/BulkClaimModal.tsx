import React, { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Smartphone,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Debt, Customer, ReminderStyle } from '../types';
import { useDebt } from '../context/DebtContext';

interface BulkClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDebts: Debt[];
  allEligibleDebts?: Debt[];
  initialMode?: 'selected' | 'all';
  onComplete?: () => void;
}

export const BulkClaimModal: React.FC<BulkClaimModalProps> = ({
  isOpen,
  onClose,
  selectedDebts,
  allEligibleDebts,
  initialMode = 'selected',
  onComplete,
}) => {
  const { customers, debts, formatMoney, user, logReminder, logBatchReminders } = useDebt();
  const [style, setStyle] = useState<ReminderStyle>('friendly');
  const [dispatchedMap, setDispatchedMap] = useState<Record<string, boolean>>({});
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [isLoggingMap, setIsLoggingMap] = useState<Record<string, boolean>>({});
  const [isLoggedAll, setIsLoggedAll] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [scope, setScope] = useState<'selected' | 'all'>(initialMode);

  if (!isOpen) return null;

  // Compute all debts with positive balance and not paid
  const globalEligibleDebts = (allEligibleDebts || debts).filter(
    (d) => d.status !== 'paid' && d.currentBalance > 0
  );

  const selectedEligibleDebts = selectedDebts.filter(
    (d) => d.status !== 'paid' && d.currentBalance > 0
  );

  // Active debts based on scope
  const eligibleDebts =
    scope === 'all' || selectedEligibleDebts.length === 0
      ? globalEligibleDebts
      : selectedEligibleDebts;

  const totalClaimAmount = eligibleDebts.reduce((sum, d) => sum + d.currentBalance, 0);
  const businessName = user.businessProfile.businessName || user.name || 'Merchant';

  // Generate individualized reminder message
  const getMessageForDebt = (debt: Debt, targetStyle: ReminderStyle) => {
    const customer = customers.find((c) => c.id === debt.customerId);
    const custName = customer?.name || 'Valued Customer';
    const amountStr = formatMoney(debt.currentBalance, debt.currency);
    const dueDateStr = debt.dueDate;
    const desc = debt.description || 'credit balance';

    switch (targetStyle) {
      case 'firm':
        return `Dear ${custName}, this is a formal notice from ${businessName}. You have an unpaid balance of ${amountStr} for "${desc}" that was due on ${dueDateStr}. Kindly settle this immediately to avoid further action. Thank you.`;
      case 'urgent':
        return `URGENT NOTICE: ${custName}, your credit balance of ${amountStr} with ${businessName} is seriously overdue. Immediate settlement is required today. Contact us at ${user.phone || 'our store'}.`;
      case 'professional':
        return `Dear ${custName}, regarding your account balance of ${amountStr} for "${desc}" with ${businessName}, kindly arrange for settlement as agreed by ${dueDateStr}. Payment can be made via ${user.preferredPaymentMethod || 'M-Pesa'}. Thank you for your business.`;
      case 'friendly':
      default:
        return `Hi ${custName}, hope you are doing well! This is a friendly reminder from ${businessName} regarding your pending balance of ${amountStr} for "${desc}" (due: ${dueDateStr}). Kindly arrange payment via M-Pesa when possible. Thank you!`;
    }
  };

  // Log all reminders into audit / reminder history with batch persistence
  const handleLogAndConfirmAll = () => {
    if (isProcessingAll || isLoggedAll || eligibleDebts.length === 0) return;
    setIsProcessingAll(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const records = eligibleDebts.map((debt) => ({
        customerId: debt.customerId,
        debtId: debt.id,
        date: today,
        messageType: style,
        channel: 'whatsapp' as const,
        messageText: getMessageForDebt(debt, style),
        status: 'shared_whatsapp' as const,
      }));

      logBatchReminders(records);

      const newDispatched: Record<string, boolean> = { ...dispatchedMap };
      eligibleDebts.forEach((d) => {
        newDispatched[d.id] = true;
      });
      setDispatchedMap(newDispatched);
      setIsLoggedAll(true);
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Error in batch claim logging:', err);
    } finally {
      setIsProcessingAll(false);
    }
  };

  // Dedicated single-item log action with double-click protection
  const handleLogOne = (debt: Debt) => {
    if (isLoggingMap[debt.id] || dispatchedMap[debt.id]) return;

    setIsLoggingMap((prev) => ({ ...prev, [debt.id]: true }));
    try {
      const msg = getMessageForDebt(debt, style);
      logReminder({
        customerId: debt.customerId,
        debtId: debt.id,
        date: new Date().toISOString().split('T')[0],
        messageType: style,
        channel: 'whatsapp',
        messageText: msg,
        status: 'logged',
      });
      setDispatchedMap((prev) => ({ ...prev, [debt.id]: true }));
    } catch (err) {
      console.error('Error logging reminder:', err);
    } finally {
      setTimeout(() => {
        setIsLoggingMap((prev) => ({ ...prev, [debt.id]: false }));
      }, 500);
    }
  };

  const handleLaunchWhatsApp = (debt: Debt) => {
    const customer = customers.find((c) => c.id === debt.customerId);
    const cleanPhone = customer?.phone?.replace(/[^0-9]/g, '') || '';
    const msg = getMessageForDebt(debt, style);

    // Log this individual reminder
    logReminder({
      customerId: debt.customerId,
      debtId: debt.id,
      date: new Date().toISOString().split('T')[0],
      messageType: style,
      channel: 'whatsapp',
      messageText: msg,
      status: 'shared_whatsapp',
    });

    setDispatchedMap((prev) => ({ ...prev, [debt.id]: true }));

    const encoded = encodeURIComponent(msg);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyOne = (debt: Debt) => {
    const msg = getMessageForDebt(debt, style);
    navigator.clipboard.writeText(msg);
    setCopiedMap((prev) => ({ ...prev, [debt.id]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [debt.id]: false }));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {scope === 'all' ? 'Claim Debt From All' : 'Claim Debt From Selected'}
                </h3>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Bulk Collection
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Send individualized, tailored collection reminders to {eligibleDebts.length} debtors (zero-balance excluded)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedEligibleDebts.length > 0 && globalEligibleDebts.length > selectedEligibleDebts.length && (
              <div className="flex items-center rounded-xl bg-slate-800/80 p-1 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    scope === 'selected' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Selected ({selectedEligibleDebts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    scope === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Claim All ({globalEligibleDebts.length})
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Stats & Tone Selector */}
        <div className="p-5 border-b border-slate-800 bg-slate-850/40 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Eligible Debtors</span>
              <span className="text-lg font-black text-white">{eligibleDebts.length} recipients</span>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Recoverable</span>
              <span className="text-lg font-black text-emerald-400">{formatMoney(totalClaimAmount)}</span>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Unlimited Reminders</span>
              </span>
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Select Reminder Strategy / Tone:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'friendly', label: 'Friendly & Gentle', desc: 'Courteous customer nudge' },
                  { id: 'professional', label: 'Professional', desc: 'Formal business notice' },
                  { id: 'firm', label: 'Firm Warning', desc: 'Standard past-due notice' },
                  { id: 'urgent', label: 'Urgent Action', desc: 'Past-due escalation' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStyle(t.id)}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    style === t.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Individualized Recipients Preview List */}
        <div className="p-5 max-h-[45vh] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Individualized Preview for Each Debtor ({eligibleDebts.length})
            </h4>
            <span className="text-[11px] text-slate-500">
              Every message uses the debtor's real name and exact balance
            </span>
          </div>

          {eligibleDebts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm font-bold text-white">No active debts in selection</p>
              <p className="text-xs mt-1">Select unpaid debts to dispatch collection reminders.</p>
            </div>
          ) : (
            eligibleDebts.map((debt) => {
              const customer = customers.find((c) => c.id === debt.customerId);
              const message = getMessageForDebt(debt, style);
              const isDispatched = dispatchedMap[debt.id];
              const isCopied = copiedMap[debt.id];

              return (
                <div
                  key={debt.id}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">
                        {customer?.name || 'Customer'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {customer?.phone || 'No phone recorded'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-rose-400">
                        {formatMoney(debt.currentBalance, debt.currency)}
                      </span>
                      {isDispatched && (
                        <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Logged</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-900 border border-slate-800/80 p-2.5 text-xs text-slate-300 font-sans leading-relaxed">
                    {message}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      id={`log-reminder-row-${debt.id}`}
                      onClick={() => handleLogOne(debt)}
                      disabled={isDispatched || isLoggingMap[debt.id]}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
                        isDispatched
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isDispatched ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Logged</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          <span>{isLoggingMap[debt.id] ? 'Logging...' : 'Log Action'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyOne(debt)}
                      className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] text-slate-300 transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchWhatsApp(debt)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm transition active:scale-95"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Dispatch WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-400 text-center sm:text-left">
            {isLoggedAll
              ? '✓ All reminders logged to customer timelines and audit ledger.'
              : `${eligibleDebts.length} individual messages ready for collection.`}
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300"
            >
              Close
            </button>
            <button
              type="button"
              id="confirm-claim-all-btn"
              onClick={handleLogAndConfirmAll}
              disabled={eligibleDebts.length === 0 || isProcessingAll || isLoggedAll}
              className="w-1/2 sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isProcessingAll
                  ? 'Logging Records...'
                  : isLoggedAll
                  ? '✓ All Reminders Logged'
                  : `Log & Claim All (${eligibleDebts.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

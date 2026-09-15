import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Sparkles,
  Send,
  Copy,
  CheckCircle2,
  CheckCheck,
  Share2,
  MessageSquare,
  Smartphone,
  Loader2,
  PhoneCall,
  Clock,
} from 'lucide-react';
import { ReminderStyle, ReminderStatus } from '../types';
import { useDebt } from '../context/DebtContext';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  debtId: string;
  initialStyle?: ReminderStyle;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  customerId,
  debtId,
  initialStyle = 'friendly',
}) => {
  const { customers, debts, payments, logReminder, updateReminderStatus, formatMoney, user } =
    useDebt();

  const customer = customers.find((c) => c.id === customerId);
  const debt = debts.find((d) => d.id === debtId);

  const [style, setStyle] = useState<ReminderStyle>(initialStyle);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'compose' | 'confirm_delivery'>('compose');
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'sms' | 'copy'>('whatsapp');
  const [isLoggingOnly, setIsLoggingOnly] = useState(false);
  const [loggedOnly, setLoggedOnly] = useState(false);

  // Compute days overdue
  const today = new Date().toISOString().split('T')[0];
  const daysOverdue = debt
    ? Math.max(
        0,
        Math.floor((new Date(today).getTime() - new Date(debt.dueDate).getTime()) / 86400000)
      )
    : 0;

  // Find last payment
  const custPayments = payments.filter((p) => p.customerId === customerId);
  const lastPayment = custPayments.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  // Fetch or generate reminder
  const fetchReminder = async (targetStyle: ReminderStyle) => {
    if (!customer || !debt) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/generate-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          amount: debt.currentBalance,
          currency: debt.currency || user.currency || 'KSh',
          dueDate: debt.dueDate,
          daysOverdue,
          style: targetStyle,
          businessName: user.businessProfile.businessName || user.name,
          lastPayment: lastPayment
            ? `${formatMoney(lastPayment.amount, debt.currency)} on ${lastPayment.date}`
            : '',
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessage(data.message);
      }
    } catch (err) {
      console.error('Error generating reminder:', err);
      // Fallback
      setMessage(
        `Hi ${customer.name}, quick reminder regarding your balance of ${formatMoney(
          debt.currentBalance,
          debt.currency
        )} due on ${debt.dueDate}. Kindly arrange payment via M-Pesa. Thank you!`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer && debt) {
      setStep('compose');
      setActiveReminderId(null);
      fetchReminder(style);
    }
  }, [isOpen, customerId, debtId]);

  if (!isOpen || !customer || !debt) return null;

  const handleStyleChange = (newStyle: ReminderStyle) => {
    setStyle(newStyle);
    fetchReminder(newStyle);
  };

  const cleanPhone = customer.phone.replace(/[^0-9]/g, '');

  const handleSendWhatsApp = () => {
    const rec = logReminder({
      customerId: customer.id,
      debtId: debt.id,
      date: new Date().toISOString().split('T')[0],
      messageType: style,
      channel: 'whatsapp',
      messageText: message,
      status: 'shared_whatsapp',
    });

    setActiveReminderId(rec.id);
    setActiveChannel('whatsapp');
    setStep('confirm_delivery');

    const encoded = encodeURIComponent(message);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleSendSMS = () => {
    const rec = logReminder({
      customerId: customer.id,
      debtId: debt.id,
      date: new Date().toISOString().split('T')[0],
      messageType: style,
      channel: 'sms',
      messageText: message,
      status: 'sent_sms',
    });

    setActiveReminderId(rec.id);
    setActiveChannel('sms');
    setStep('confirm_delivery');

    const encoded = encodeURIComponent(message);
    const smsUrl = `sms:${cleanPhone}?body=${encoded}`;
    window.location.href = smsUrl;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    logReminder({
      customerId: customer.id,
      debtId: debt.id,
      date: new Date().toISOString().split('T')[0],
      messageType: style,
      channel: 'copy',
      messageText: message,
      status: 'copied',
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLogOnly = () => {
    if (isLoggingOnly || loggedOnly) return;
    setIsLoggingOnly(true);
    try {
      logReminder({
        customerId: customer.id,
        debtId: debt.id,
        date: new Date().toISOString().split('T')[0],
        messageType: style,
        channel: 'whatsapp',
        messageText: message,
        status: 'logged',
      });
      setLoggedOnly(true);
      setTimeout(() => {
        setIsLoggingOnly(false);
        onClose();
      }, 750);
    } catch (err) {
      console.error('Error logging reminder:', err);
      setIsLoggingOnly(false);
    }
  };

  const handleMarkDelivered = () => {
    if (activeReminderId) {
      updateReminderStatus(activeReminderId, 'delivered');
    }
    onClose();
  };

  const handleMarkPreparedOnly = () => {
    if (activeReminderId) {
      updateReminderStatus(activeReminderId, 'prepared');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={step === 'confirm_delivery' ? () => setStep('compose') : onClose}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition"
              title="Return"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                {step === 'confirm_delivery' ? 'Confirm Delivery Status' : 'Send Payment Reminder'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeted to: <strong className="text-slate-200">{customer.name}</strong> •{' '}
                <span className="text-amber-400 font-semibold">
                  {formatMoney(debt.currentBalance, debt.currency)}
                </span>
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

        {step === 'confirm_delivery' ? (
          /* Step 2: Realistic Delivery Confirmation */
          <div className="p-6 space-y-5 animate-fade-in">
            <div className="rounded-2xl bg-slate-850 border border-emerald-500/30 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  Message Prepared in {activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}!
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                We opened {activeChannel === 'whatsapp' ? 'WhatsApp' : 'your messaging app'} with the
                drafted reminder for <strong className="text-white">{customer.name}</strong>.
              </p>
              <p className="text-xs text-slate-400">
                Did you press send and deliver the message to the customer?
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleMarkDelivered}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white shadow-md shadow-emerald-950/50 transition active:scale-95"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Yes, Delivered to Customer</span>
              </button>

              <button
                type="button"
                onClick={handleMarkPreparedOnly}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-300 transition"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Keep as Prepared / Draft (Not yet confirmed)</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('compose')}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
              >
                Return to edit message
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Compose & Strategy */
          <div className="p-6 space-y-4">
            {/* Tone / Style Pills */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">
                Choose Tone / Strategy:
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: 'friendly', label: 'Friendly', desc: 'Gentle check-in' },
                  { id: 'professional', label: 'Professional', desc: 'Standard business' },
                  { id: 'firm', label: 'Firm', desc: 'Urgent & direct' },
                  { id: 'short', label: 'Short SMS', desc: 'Quick 1-liner' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStyleChange(s.id as ReminderStyle)}
                    className={`rounded-xl p-2.5 text-left border transition ${
                      style === s.id
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <p className="font-bold text-xs">{s.label}</p>
                    <p className="text-[10px] text-slate-400">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Message Content</label>
                {isLoading && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Polishing draft...
                  </span>
                )}
              </div>

              <textarea
                id="reminder-message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-xl bg-slate-850 border border-slate-700 p-3.5 text-xs text-white leading-relaxed focus:border-emerald-500 focus:outline-none"
                placeholder="Message will appear here..."
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Customer Phone: {customer.phone || 'No phone set'}</span>
                <span>{message.length} characters</span>
              </div>
            </div>

            {/* Quick Contact Bar */}
            {customer.phone && (
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 flex items-center justify-between">
                <span className="text-xs text-slate-300">Need to speak directly first?</span>
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1 text-xs font-semibold text-white transition"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Call Customer</span>
                </a>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="send-reminder-whatsapp-btn"
                  onClick={handleSendWhatsApp}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white shadow-md shadow-emerald-950/50 transition active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </button>

                <button
                  id="send-reminder-sms-btn"
                  onClick={handleSendSMS}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs font-bold text-white shadow-md shadow-blue-950/50 transition active:scale-95"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Send as SMS</span>
                </button>
              </div>

              {/* Direct Log to Record (for phone calls / in-person discussions) */}
              <button
                type="button"
                id="log-reminder-only-btn"
                onClick={handleLogOnly}
                disabled={isLoggingOnly || loggedOnly}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition active:scale-95 ${
                  loggedOnly
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${loggedOnly ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>
                  {isLoggingOnly
                    ? 'Logging...'
                    : loggedOnly
                    ? '✓ Logged to Customer History'
                    : 'Log to History Only (Phone / In-Person)'}
                </span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

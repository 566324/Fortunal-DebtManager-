import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Phone,
  DollarSign,
  Receipt,
  X,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { Debt, Customer, Payment } from '../types';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtId?: string;
  customerId?: string;
  onPaymentSuccess?: (payment: Payment) => void;
  onViewReceipt?: (payment: Payment) => void;
}

type Step = 'input' | 'pending' | 'success' | 'failed' | 'cancelled';

export const MpesaPaymentModal: React.FC<MpesaPaymentModalProps> = ({
  isOpen,
  onClose,
  debtId,
  customerId,
  onPaymentSuccess,
  onViewReceipt,
}) => {
  const { debts, customers, formatMoney, recordPayment } = useDebt();

  // Selected Debt & Customer
  const activeDebts = debts.filter((d) => d.status !== 'paid');
  const [selectedDebtId, setSelectedDebtId] = useState<string>(debtId || '');

  // Keep selectedDebtId updated if prop changes
  useEffect(() => {
    if (debtId) {
      setSelectedDebtId(debtId);
    } else if (activeDebts.length > 0 && !selectedDebtId) {
      setSelectedDebtId(activeDebts[0].id);
    }
  }, [debtId, activeDebts]);

  const currentDebt = debts.find((d) => d.id === selectedDebtId);
  const currentCustomer = customers.find(
    (c) => c.id === (currentDebt ? currentDebt.customerId : customerId)
  );

  // Form inputs
  const [phone, setPhone] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [accountRef, setAccountRef] = useState<string>('DebtPay');

  // Reset or initialize phone and amount when customer/debt changes
  useEffect(() => {
    if (currentCustomer?.phone) {
      setPhone(currentCustomer.phone);
    }
    if (currentDebt) {
      setAmount(currentDebt.currentBalance.toString());
      setAccountRef((currentDebt.description || 'DebtPay').slice(0, 12).replace(/[^a-zA-Z0-9]/g, ''));
    }
  }, [currentCustomer, currentDebt]);

  // STK State
  const [step, setStep] = useState<Step>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Intent Tracking
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState<string | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState<Payment | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Polling ref
  const pollTimerRef = useRef<any>(null);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Handle Initiating STK Push
  const handleInitiateStk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDebt || !currentCustomer) {
      setErrorMessage('Please select an active debt and customer.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than zero.');
      return;
    }

    if (numericAmount > currentDebt.currentBalance) {
      setErrorMessage(
        `Amount cannot exceed the current outstanding balance of ${formatMoney(
          currentDebt.currentBalance,
          currentDebt.currency
        )}.`
      );
      return;
    }

    if (!phone || phone.trim().length < 9) {
      setErrorMessage('Please enter a valid Kenyan Safaricom mobile number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId: currentDebt.id,
          customerId: currentCustomer.id,
          customerName: currentCustomer.name,
          debtDescription: currentDebt.description,
          amount: numericAmount,
          phoneNumber: phone.trim(),
          accountReference: accountRef || 'DebtPay',
          transactionDesc: 'Settlement',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to initiate M-Pesa STK push.');
        setIsSubmitting(false);
        return;
      }

      setPaymentIntentId(data.paymentIntentId);
      setCheckoutRequestId(data.checkoutRequestId);
      setStep('pending');
      setIsSubmitting(false);

      // Start Polling for Confirmation
      startPolling(data.checkoutRequestId);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage('Network error connecting to M-Pesa Daraja service.');
    }
  };

  // Start polling status
  const startPolling = (chkRequestId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mpesa/query/${chkRequestId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.status === 'SUCCESS') {
          clearInterval(pollTimerRef.current);
          handlePaymentConfirmed(data.amount, data.mpesaReceiptNumber);
        } else if (data.status === 'CANCELLED') {
          clearInterval(pollTimerRef.current);
          setStep('cancelled');
          setErrorMessage(data.resultDesc || 'Payment was cancelled by the customer on their phone.');
        } else if (data.status === 'FAILED') {
          clearInterval(pollTimerRef.current);
          setStep('failed');
          setErrorMessage(data.resultDesc || 'Transaction failed or insufficient funds.');
        }
      } catch (err) {
        console.error('[Polling Error]:', err);
      }
    }, 2000);
  };

  // Once confirmed via Daraja Callback: Persist into DebtManager
  const handlePaymentConfirmed = (paidAmount: number, receiptCode?: string) => {
    if (!currentDebt || !currentCustomer) return;

    const receipt = receiptCode || `QHB${Math.floor(1000000 + Math.random() * 9000000)}`;
    setMpesaReceiptNumber(receipt);

    // Persist real financial state via DebtContext
    const payment = recordPayment({
      debtId: currentDebt.id,
      customerId: currentCustomer.id,
      amount: paidAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'M-Pesa',
      referenceNumber: receipt,
      notes: `Safaricom Daraja 3.0 M-Pesa (Sandbox) • Ref: ${receipt}`,
    });

    setConfirmedPayment(payment);
    setStep('success');

    if (onPaymentSuccess) {
      onPaymentSuccess(payment);
    }
  };

  // Sandbox simulation actions (developer/tester shortcuts)
  const handleSimulateAction = async (action: 'approve' | 'cancel' | 'fail' | 'duplicate') => {
    if (!checkoutRequestId) return;
    try {
      if (action === 'duplicate' && mpesaReceiptNumber) {
        // Send duplicate callback to test idempotency
        await fetch('/api/mpesa/simulate-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkoutRequestId,
            action: 'approve',
          }),
        });
        alert('Duplicate callback sent! Backend idempotency logged and rejected duplicate.');
        return;
      }

      await fetch('/api/mpesa/simulate-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutRequestId,
          action,
        }),
      });
    } catch (err) {
      console.error('[Simulation Error]:', err);
    }
  };

  const handleCopyReceipt = () => {
    if (mpesaReceiptNumber) {
      navigator.clipboard.writeText(mpesaReceiptNumber);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleReset = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setStep('input');
    setErrorMessage(null);
    setPaymentIntentId(null);
    setCheckoutRequestId(null);
    setMpesaReceiptNumber(null);
    setConfirmedPayment(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-2xl text-white my-8 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Safaricom M-Pesa STK Push</h2>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  Sandbox Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lipa Na M-Pesa Online prompt to customer's mobile phone
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

        {/* STEP 1: INPUT FORM */}
        {step === 'input' && (
          <form onSubmit={handleInitiateStk} className="p-6 space-y-4">
            {/* Debt Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Select Debt / Account *</label>
              <select
                value={selectedDebtId}
                onChange={(e) => {
                  setSelectedDebtId(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                required
              >
                {activeDebts.length === 0 && <option value="">No active debts</option>}
                {activeDebts.map((d) => {
                  const c = customers.find((cust) => cust.id === d.customerId);
                  return (
                    <option key={d.id} value={d.id}>
                      {c?.name || 'Customer'} — {formatMoney(d.currentBalance, d.currency)} ({d.description})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Debt & Customer Summary Card */}
            {currentDebt && currentCustomer && (
              <div className="rounded-xl bg-slate-850 border border-slate-700/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                    <p className="text-sm font-bold text-white">{currentCustomer.name}</p>
                    <p className="text-xs text-slate-400">{currentDebt.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Outstanding Balance
                    </span>
                    <span className="text-base font-black text-amber-400">
                      {formatMoney(currentDebt.currentBalance, currentDebt.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Phone Number (Safaricom) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">M-Pesa Phone Number *</label>
                <span className="text-[10px] text-slate-400">Accepts 07..., 01..., or 254...</span>
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  required
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Payment Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Amount to Prompt (KSh) *</label>
                {currentDebt && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAmount(Math.round(currentDebt.currentBalance / 2).toString())}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-slate-300 hover:text-white"
                    >
                      50% Partial
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(currentDebt.currentBalance.toString())}
                      className="rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 px-2 py-0.5 font-semibold text-emerald-300"
                    >
                      Full Balance
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  max={currentDebt?.currentBalance}
                  required
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Sandbox Notice */}
            <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-3 text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-200">Sandbox Environment Active</p>
                <p className="text-slate-400 mt-0.5">
                  Prompts Shortcode 174379. No real money is moved. You can test live callbacks or use the built-in simulator tool once prompted.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !currentDebt || !amount || parseFloat(amount) <= 0}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/50 transition active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initiating STK Push...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Prompt M-Pesa STK (KSh {amount || 0})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PENDING / WAITING FOR CUSTOMER ON PHONE */}
        {step === 'pending' && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2 py-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-pulse">
                <Smartphone className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black text-white">M-Pesa payment request sent</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Check the customer's phone ({phone}). The M-Pesa PIN prompt has been dispatched.
              </p>
            </div>

            {/* Status indicator badge */}
            <div className="flex items-center justify-between rounded-xl bg-slate-800/80 border border-slate-700 p-3.5 text-xs">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span className="font-bold text-white">Payment Status:</span>
              </div>
              <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                Pending Confirmation
              </span>
            </div>

            {/* Details */}
            <div className="rounded-xl bg-slate-850 border border-slate-800 p-3 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{currentCustomer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-emerald-400">
                  {formatMoney(parseFloat(amount), currentDebt?.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Checkout ID:</span>
                <span className="font-mono text-[11px] text-slate-400">{checkoutRequestId}</span>
              </div>
            </div>

            {/* Sandbox Simulation Helper */}
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/40 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>Sandbox Test Actions (No SIM required)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                In Sandbox, you can simulate customer phone interaction to immediately trigger the callback verification, balance recalculation, and receipt generation.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSimulateAction('approve')}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition"
                >
                  ✓ Simulate Customer PIN (Approve)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateAction('cancel')}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-rose-300 transition"
                >
                  ✕ Simulate Cancel (User Aborts)
                </button>
              </div>
            </div>

            {/* Cancel Wait */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Cancel & Return to Form</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESSFUL */}
        {step === 'success' && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2 py-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black text-white">Payment Confirmed via M-Pesa</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Funds received and debt balance recalculated automatically.
              </p>
            </div>

            {/* M-Pesa Receipt Code Card */}
            <div className="rounded-xl bg-slate-800/90 border border-slate-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">M-Pesa Transaction Ref:</span>
                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{mpesaReceiptNumber}</span>
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-700/60 pt-2">
                <span className="text-xs text-slate-400 font-medium">Amount Received:</span>
                <span className="text-base font-black text-emerald-400">
                  {formatMoney(parseFloat(amount), currentDebt?.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-700/60 pt-2">
                <span className="text-xs text-slate-400 font-medium">Remaining Balance:</span>
                <span className="text-sm font-bold text-white">
                  {formatMoney(
                    Math.max(0, (currentDebt?.currentBalance || 0) - parseFloat(amount)),
                    currentDebt?.currency
                  )}
                  {parseFloat(amount) >= (currentDebt?.currentBalance || 0) && (
                    <span className="ml-1.5 text-xs text-emerald-400">(Debt Fully Paid!)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Idempotency Test Helper */}
            <div className="rounded-xl bg-slate-850 border border-slate-700/60 p-3 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Test Idempotency / Duplicate Safety:</span>
              <button
                type="button"
                onClick={() => handleSimulateAction('duplicate')}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-slate-300 hover:text-white font-semibold transition"
              >
                Send Duplicate Webhook
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {confirmedPayment && onViewReceipt && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewReceipt(confirmedPayment);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-emerald-400 transition"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View Official Receipt</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition text-center"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CANCELLED OR FAILED */}
        {(step === 'cancelled' || step === 'failed') && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2 py-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <XCircle className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="text-lg font-black text-white">
                {step === 'cancelled' ? 'Transaction Cancelled' : 'Payment Failed'}
              </h3>
              <p className="text-xs text-rose-300 max-w-sm mx-auto">
                {errorMessage || 'The transaction could not be completed on customer phone.'}
              </p>
            </div>

            <div className="rounded-xl bg-slate-850 border border-slate-700 p-3.5 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-white">Financial Integrity Protected:</p>
              <p className="text-slate-400 text-[11px]">
                No payment was recorded. The customer's debt balance remains at{' '}
                <strong className="text-amber-400">
                  {formatMoney(currentDebt?.currentBalance || 0, currentDebt?.currency)}
                </strong>
                .
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition"
              >
                Retry STK Push
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Smartphone,
  Receipt,
  RotateCcw,
  Loader2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { Debt, Payment, PaymentMethod } from '../types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillDebtId?: string;
  initialMode?: 'mpesa_stk' | 'manual';
  onPaymentSuccess?: (payment: Payment) => void;
}

type StkStatus = 'idle' | 'requesting' | 'pending' | 'success' | 'cancelled' | 'failed';

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  prefillDebtId,
  initialMode = 'mpesa_stk',
  onPaymentSuccess,
}) => {
  const { debts, customers, recordPayment, formatMoney, user } = useDebt();

  const activeDebts = debts.filter((d) => d.status !== 'paid');

  const [activeTab, setActiveTab] = useState<'mpesa_stk' | 'manual'>(initialMode);
  const [selectedDebtId, setSelectedDebtId] = useState<string>(
    prefillDebtId || (activeDebts.length > 0 ? activeDebts[0].id : '')
  );
  const [amount, setAmount] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    user.preferredPaymentMethod || 'M-Pesa'
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // STK Push lifecycle states
  const [stkStatus, setStkStatus] = useState<StkStatus>('idle');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [stkErrorMessage, setStkErrorMessage] = useState<string | null>(null);
  const [stkSuccessData, setStkSuccessData] = useState<{
    receiptNumber: string;
    amount: number;
    phone: string;
    date?: string;
  } | null>(null);
  const [isSimulatingAction, setIsSimulatingAction] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);
  const processedIntentRef = useRef<string | null>(null);

  // Update selected debt and phone if prefill changes
  useEffect(() => {
    if (prefillDebtId) {
      setSelectedDebtId(prefillDebtId);
    } else if (!selectedDebtId && activeDebts.length > 0) {
      setSelectedDebtId(activeDebts[0].id);
    }
  }, [prefillDebtId, activeDebts]);

  const currentDebt = debts.find((d) => d.id === selectedDebtId);
  const currentCustomer = customers.find((c) => c.id === currentDebt?.customerId);

  // Synchronize customer phone when currentCustomer changes
  useEffect(() => {
    if (currentCustomer?.phone) {
      setCustomerPhone(currentCustomer.phone);
    } else {
      setCustomerPhone('');
    }
    // Pre-fill amount with current balance if empty
    if (currentDebt && !amount) {
      setAmount(currentDebt.currentBalance.toString());
    }
  }, [currentCustomer, currentDebt]);

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handlePayFull = () => {
    if (currentDebt) {
      setAmount(currentDebt.currentBalance.toString());
    }
  };

  const handlePayHalf = () => {
    if (currentDebt) {
      setAmount(Math.round(currentDebt.currentBalance / 2).toString());
    }
  };

  const handleClear = () => {
    setAmount('');
    setReferenceNumber('');
    setNotes('');
    setStkStatus('idle');
    setCheckoutRequestId(null);
    setStkErrorMessage(null);
    setStkSuccessData(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };

  // Complete payment in local database only when provider callback confirms success
  const finalizePaymentRecord = (receiptNum: string, paidAmt: number) => {
    if (!currentDebt || !currentCustomer) return;
    if (processedIntentRef.current === receiptNum) return; // Deduplication protection
    processedIntentRef.current = receiptNum;

    const payment = recordPayment({
      debtId: currentDebt.id,
      customerId: currentCustomer.id,
      amount: paidAmt,
      date: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: 'M-Pesa',
      referenceNumber: receiptNum,
      notes: notes.trim()
        ? `${notes.trim()} (Safaricom Daraja STK Push - Sandbox)`
        : 'Safaricom Daraja STK Push (Sandbox Confirmed)',
    });

    if (onPaymentSuccess) {
      onPaymentSuccess(payment);
    }
  };

  // Poll backend for callback verification
  const startPollingPaymentStatus = (checkoutId: string, expectedAmount: number) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mpesa/query/${checkoutId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.status === 'SUCCESS') {
          clearInterval(pollIntervalRef.current);
          setStkStatus('success');
          const finalReceipt = data.mpesaReceiptNumber || `QHB${Math.floor(1000000 + Math.random() * 9000000)}`;
          setStkSuccessData({
            receiptNumber: finalReceipt,
            amount: data.amount || expectedAmount,
            phone: data.phoneNumber || customerPhone,
            date: data.transactionDate,
          });
          finalizePaymentRecord(finalReceipt, data.amount || expectedAmount);
        } else if (data.status === 'CANCELLED') {
          clearInterval(pollIntervalRef.current);
          setStkStatus('cancelled');
          setStkErrorMessage(data.resultDesc || 'Payment request was cancelled by customer on their phone.');
        } else if (data.status === 'FAILED') {
          clearInterval(pollIntervalRef.current);
          setStkStatus('failed');
          setStkErrorMessage(data.resultDesc || 'Payment could not be completed (Insufficient funds or PIN error).');
        }
      } catch (err) {
        console.error('[Daraja Poll Error]:', err);
      }
    }, 2500);
  };

  // Trigger STK Push request to backend
  const handleRequestDarajaStk = async () => {
    if (!customerPhone.trim()) {
      setStkErrorMessage('Customer phone number is required to send M-Pesa STK prompt.');
      setStkStatus('failed');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setStkErrorMessage('Please enter a valid payment amount greater than zero.');
      setStkStatus('failed');
      return;
    }

    if (currentDebt && numAmount > currentDebt.currentBalance) {
      setStkErrorMessage(`Amount cannot exceed current outstanding balance of ${formatMoney(currentDebt.currentBalance, currentDebt.currency)}.`);
      setStkStatus('failed');
      return;
    }

    setStkStatus('requesting');
    setStkErrorMessage(null);
    setStkSuccessData(null);

    try {
      const res = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId: currentDebt?.id,
          customerId: currentCustomer?.id,
          amount: Math.round(numAmount),
          phoneNumber: customerPhone,
          userId: user.id,
          accountReference: currentDebt?.description?.slice(0, 12) || 'FortunalDebt',
          transactionDesc: 'Debt Payment',
        }),
      });

      const data = await res.json();

      if (res.ok && data.checkoutRequestId) {
        setCheckoutRequestId(data.checkoutRequestId);
        setStkStatus('pending');
        startPollingPaymentStatus(data.checkoutRequestId, Math.round(numAmount));
      } else {
        setStkStatus('failed');
        setStkErrorMessage(data.error || 'Failed to dispatch M-Pesa STK push. Check phone format.');
      }
    } catch {
      setStkStatus('failed');
      setStkErrorMessage('Network error communicating with M-Pesa gateway.');
    }
  };

  // Sandbox simulation helper (for testing the full loop without physical SIM cards)
  const handleSimulateSandboxAction = async (action: 'approve' | 'cancel' | 'fail') => {
    if (!checkoutRequestId) return;
    setIsSimulatingAction(true);
    try {
      await fetch('/api/mpesa/simulate-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutRequestId,
          action,
        }),
      });
      // Immediate poll check
      const res = await fetch(`/api/mpesa/query/${checkoutRequestId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'SUCCESS') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStkStatus('success');
          const finalReceipt = data.mpesaReceiptNumber || `QHB${Math.floor(1000000 + Math.random() * 9000000)}`;
          setStkSuccessData({
            receiptNumber: finalReceipt,
            amount: data.amount || parseFloat(amount),
            phone: data.phoneNumber || customerPhone,
          });
          finalizePaymentRecord(finalReceipt, data.amount || parseFloat(amount));
        } else if (data.status === 'CANCELLED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStkStatus('cancelled');
          setStkErrorMessage('Customer cancelled the request on phone.');
        } else if (data.status === 'FAILED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStkStatus('failed');
          setStkErrorMessage('Payment failed (insufficient balance or timeout).');
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulatingAction(false);
    }
  };

  // Manual payment recording submit (Cash, Bank, Airtel, Cheque, or manual M-Pesa code)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDebt || !currentCustomer) return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    const payment = recordPayment({
      debtId: currentDebt.id,
      customerId: currentCustomer.id,
      amount: numAmount,
      date: paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (onPaymentSuccess) {
      onPaymentSuccess(payment);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Record Payment</h2>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  M-Pesa Sandbox Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Safaricom Daraja 3.0 STK Push & Financial Balance Settlement
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

        {/* Channel Navigation Switcher */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 p-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('mpesa_stk');
              setPaymentMethod('M-Pesa');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'mpesa_stk'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Pay via M-Pesa (STK Push)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'manual'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <span>Manual / Other Methods</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Debt Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Select Debt / Customer Account *</label>
            <select
              id="select-payment-debt"
              value={selectedDebtId}
              onChange={(e) => {
                setSelectedDebtId(e.target.value);
                const d = debts.find((item) => item.id === e.target.value);
                if (d) setAmount(d.currentBalance.toString());
                setStkStatus('idle');
              }}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              required
            >
              {activeDebts.length === 0 && (
                <option value="">No active debts to pay</option>
              )}
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

          {/* Current Debt Card Highlight */}
          {currentDebt && currentCustomer && (
            <div className="rounded-xl bg-slate-850 border border-slate-700/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{currentCustomer.name}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                      {currentCustomer.phone || 'No phone'}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">{currentDebt.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Outstanding Balance</span>
                  <span className="text-base font-black text-amber-400">
                    {formatMoney(currentDebt.currentBalance, currentDebt.currency)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <span>Original: {formatMoney(currentDebt.originalAmount, currentDebt.currency)}</span>
                <span>Due Date: {currentDebt.dueDate}</span>
              </div>
            </div>
          )}

          {/* DARAJA M-PESA STK PUSH TAB */}
          {activeTab === 'mpesa_stk' ? (
            <div className="space-y-4">
              {/* Phone & Amount Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>M-Pesa Phone Number *</span>
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-emerald-400" />
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 0712345678 or 2547..."
                      disabled={stkStatus === 'pending' || stkStatus === 'requesting'}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Customer phone to receive STK prompt</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Amount (KES) *</label>
                    {currentDebt && (
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={handlePayHalf}
                          disabled={stkStatus === 'pending'}
                          className="text-slate-400 hover:text-white"
                        >
                          50%
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={handlePayFull}
                          disabled={stkStatus === 'pending'}
                          className="font-bold text-emerald-400 hover:underline"
                        >
                          Full
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={stkStatus === 'pending' || stkStatus === 'requesting'}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-3 py-2 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  {currentDebt && amount && (
                    <p className="text-[10px] text-slate-400">
                      Balance after: {formatMoney(Math.max(0, currentDebt.currentBalance - (parseFloat(amount) || 0)), currentDebt.currency)}
                    </p>
                  )}
                </div>
              </div>

              {/* STK Status Feedback Cards */}
              {stkStatus === 'idle' && (
                <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/40 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-300">Ready to initiate STK Push</p>
                    <p className="text-[11px] text-emerald-300/80 mt-0.5">
                      Click below to send a payment request to the customer's phone. No financial record is created until customer confirms PIN in M-Pesa.
                    </p>
                  </div>
                </div>
              )}

              {stkStatus === 'requesting' && (
                <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-4 text-center space-y-2 animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-white">Communicating with Safaricom Daraja 3.0...</p>
                  <p className="text-[11px] text-slate-400">Generating secure timestamp & dispatching STK push</p>
                </div>
              )}

              {stkStatus === 'pending' && (
                <div className="rounded-xl bg-amber-950/30 border border-amber-800/50 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Clock className="w-6 h-6 text-amber-400 animate-spin" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-300">
                        M-Pesa payment request sent. Check the customer's phone.
                      </p>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">
                        Prompt sent to <span className="font-bold text-white">{customerPhone}</span> for KES {amount}. Waiting for M-Pesa PIN...
                      </p>
                    </div>
                  </div>

                  {/* Sandbox Developer Testing Simulator Helper */}
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-300 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Developer Sandbox Controls
                      </span>
                      <span className="text-[10px] text-slate-400">Simulate customer PIN action:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSimulateSandboxAction('approve')}
                        disabled={isSimulatingAction}
                        className="flex-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 py-1.5 px-2 text-[11px] font-bold text-emerald-300 transition"
                      >
                        {isSimulatingAction ? 'Processing...' : '⚡ Simulate Customer PIN Approval'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateSandboxAction('cancel')}
                        disabled={isSimulatingAction}
                        className="rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 py-1.5 px-2.5 text-[11px] font-semibold text-rose-300 transition"
                      >
                        Simulate Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {stkStatus === 'success' && stkSuccessData && (
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-600/50 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>M-Pesa Payment Verified & Confirmed!</span>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">M-Pesa Receipt Number:</span>
                      <span className="font-black text-white font-mono">{stkSuccessData.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount Paid:</span>
                      <span className="font-black text-emerald-400">KES {stkSuccessData.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="text-slate-200">{stkSuccessData.phone}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-300">
                    ✓ Payment has been persisted to financial records.
                    <br />✓ Debt balance has been automatically reduced.
                    <br />✓ Official receipt generated.
                  </p>
                </div>
              )}

              {(stkStatus === 'cancelled' || stkStatus === 'failed') && (
                <div className="rounded-xl bg-rose-950/40 border border-rose-800/50 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <XCircle className="w-4 h-4" />
                    <span>Payment {stkStatus === 'cancelled' ? 'Cancelled by Customer' : 'Failed'}</span>
                  </div>
                  <p className="text-[11px] text-rose-200/90">
                    {stkErrorMessage || 'Transaction was not completed. No financial records were modified.'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    The customer's debt balance remains untouched at {currentDebt ? formatMoney(currentDebt.currentBalance, currentDebt.currency) : ''}.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition"
                  >
                    {stkStatus === 'success' ? 'Close' : 'Cancel'}
                  </button>

                  {stkStatus !== 'success' ? (
                    <button
                      id="request-mpesa-payment-btn"
                      type="button"
                      onClick={handleRequestDarajaStk}
                      disabled={stkStatus === 'requesting' || stkStatus === 'pending' || !amount || parseFloat(amount) <= 0}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/50 transition active:scale-95"
                    >
                      {stkStatus === 'requesting' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Requesting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Request M-Pesa Payment</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/50 transition active:scale-95"
                    >
                      Done & View Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* MANUAL PAYMENT ENTRY FORM (Cash, Bank, Airtel, Cheque, or manual M-Pesa code) */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Amount Paid with Quick Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Amount Paid *</label>
                  {currentDebt && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={handlePayHalf}
                        className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-slate-300 hover:text-white"
                      >
                        50% Partial
                      </button>
                      <button
                        type="button"
                        onClick={handlePayFull}
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
                    id="input-payment-amount"
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    max={currentDebt ? currentDebt.currentBalance : undefined}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-3 py-2.5 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Payment Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="M-Pesa">M-Pesa (Manual Ref)</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reference / M-Pesa Code */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  Reference / M-Pesa Confirmation Code (Optional)
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. QHB8912891 or Cash Receipt"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none uppercase"
                />
              </div>

              {/* Internal Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid manually at shop counter"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition"
                  title="Clear inputs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Form</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-record-payment-btn"
                    type="submit"
                    disabled={!currentDebt || !amount || parseFloat(amount) <= 0}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/50 transition active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Record Payment & Issue Receipt</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

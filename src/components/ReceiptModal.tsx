import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Printer,
  Share2,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Smartphone,
  Download,
  Loader2,
  Send,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Payment } from '../types';
import { useDebt } from '../context/DebtContext';
import { generateReceiptPDF } from '../utils/pdfGenerator';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onOpenDeliverySettings?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  onOpenDeliverySettings,
}) => {
  const {
    customers,
    debts,
    formatMoney,
    user,
    receipts,
    processAutomaticReceiptDelivery,
    generateDuplicateReceipt,
  } = useDebt();
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<string | null>(null);

  if (!isOpen || !payment) return null;

  const customer = customers.find((c) => c.id === payment.customerId);
  const debt = debts.find((d) => d.id === payment.debtId);
  const currency = debt?.currency || user.currency || 'KES';
  const officialReceipt = receipts.find((r) => r.paymentId === payment.id);

  const receiptText = `*OFFICIAL PAYMENT RECEIPT — FORTUNAL DEBTMANAGER*
${user.businessProfile.businessName || user.name || 'Fortunal DebtManager User'}
Receipt No: ${payment.receiptNumber}
Date: ${payment.date}
----------------------------
Customer: ${customer?.name || 'Valued Customer'}
Phone: ${customer?.phone || 'N/A'}
Item / Debt: ${debt?.description || 'Credit Account Settlement'}
Amount Received: ${formatMoney(payment.amount, currency)}
Payment Channel: ${payment.paymentMethod}
${payment.referenceNumber ? `Reference: ${payment.referenceNumber}\n` : ''}Previous Balance: ${formatMoney(payment.previousBalance, currency)}
Remaining Balance: ${formatMoney(payment.remainingBalance, currency)}
----------------------------
${payment.remainingBalance === 0 ? 'STATUS: ACCOUNT FULLY CLEARED! Thank you.' : 'Thank you for your payment.'}
Issued by: ${payment.recordedBy}
Generated via Fortunal DebtManager — Know who owes. Know when. Get paid.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(receiptText);
    const phone = customer?.phone?.replace(/[^0-9]/g, '') || '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAutoDispatch = async (channel: 'whatsapp' | 'sms') => {
    if (!officialReceipt) return;
    setIsDispatching(true);
    setDeliveryResult(null);
    try {
      const res = await processAutomaticReceiptDelivery(officialReceipt, channel);
      setDeliveryResult(res.message);
    } catch (err: any) {
      setDeliveryResult(err?.message || 'Failed to dispatch automated receipt');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleDuplicateReprint = () => {
    if (!payment) return;
    const dup = generateDuplicateReceipt(payment.id);
    if (dup) {
      setDeliveryResult(`Duplicate copy generated for audit compliance.`);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateReceiptPDF(payment, debt, customer, user);
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      // Fallback to print
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Payment instructions
  const paybill = user.paymentDetails?.mpesaPaybill;
  const till = user.paymentDetails?.mpesaTill;
  const sendMoney = user.paymentDetails?.mpesaPhone;
  const bankDetails = user.paymentDetails?.bankDetails;
  const hasInstructions = Boolean(paybill || till || sendMoney || bankDetails);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:text-white transition"
              title="Return"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Payment Receipt Issued</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {officialReceipt?.deliveryStatus && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  officialReceipt.deliveryStatus === 'sent' || officialReceipt.deliveryStatus === 'delivered'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : officialReceipt.deliveryStatus === 'manual_shared'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {officialReceipt.deliveryStatus === 'sent' || officialReceipt.deliveryStatus === 'delivered'
                  ? 'Auto-Dispatched'
                  : officialReceipt.deliveryStatus === 'manual_shared'
                  ? 'Manually Shared'
                  : 'Pending Auto-Delivery'}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {deliveryResult && (
          <div className="m-4 mb-0 rounded-xl bg-blue-500/20 border border-blue-500/40 p-3 text-xs text-blue-200 flex items-center gap-2 animate-fade-in print:hidden">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{deliveryResult}</span>
          </div>
        )}

        {/* Printable Receipt Card */}
        <div className="p-6 bg-slate-950 text-slate-900 printable-document">
          <div className="rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-slate-800">
            {/* Duplicate Watermark / Badge if reprint */}
            {officialReceipt?.isDuplicateReprint && (
              <div className="mb-3 text-center rounded-lg bg-amber-100 border border-amber-300 py-1 text-[11px] font-black tracking-widest text-amber-900 uppercase">
                ⚠ Official Duplicate Copy / Reprint
              </div>
            )}

            {/* Header / Business details */}
            <div className="text-center border-b border-dashed border-slate-300 pb-4">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  {user.businessProfile.businessName || user.name || 'Fortunal DebtManager Merchant'}
                </h2>
              </div>
              <p className="text-[11px] text-slate-500">{user.businessProfile.location || 'Nairobi, Kenya'}</p>
              <p className="text-[11px] text-slate-500">Tel: {user.phone || user.businessProfile.phone || 'Available on request'}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <span>FORTUNAL DEBTMANAGER OFFICIAL RECEIPT</span>
              </div>
            </div>

            {/* Meta */}
            <div className="flex justify-between text-xs py-3 border-b border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">RECEIPT NO</span>
                <span className="font-mono font-bold text-slate-800">{payment.receiptNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">DATE & TIME</span>
                <span className="font-bold text-slate-800">{payment.date}</span>
              </div>
            </div>

            {/* Customer & Payment details */}
            <div className="py-3 space-y-2 text-xs border-b border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Received From:</span>
                <span className="font-bold text-slate-900">{customer?.name || 'Customer'}</span>
              </div>
              {customer?.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-700">{customer.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Item / Credit:</span>
                <span className="font-medium text-slate-800">{debt?.description || 'Goods / Services'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-semibold text-emerald-700">{payment.paymentMethod}</span>
              </div>
              {payment.referenceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono font-bold text-slate-800">{payment.referenceNumber}</span>
                </div>
              )}
            </div>

            {/* Amount Box */}
            <div className="my-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Amount Received
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">
                {formatMoney(payment.amount, currency)}
              </p>
            </div>

            {/* Balance Accounting */}
            <div className="space-y-1.5 text-xs py-2 border-t border-dashed border-slate-300">
              <div className="flex justify-between text-slate-500">
                <span>Previous Balance:</span>
                <span>{formatMoney(payment.previousBalance, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Amount Paid:</span>
                <span className="text-emerald-600 font-bold">- {formatMoney(payment.amount, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Remaining Balance:</span>
                <span className={payment.remainingBalance === 0 ? 'text-emerald-600' : 'text-amber-600'}>
                  {formatMoney(payment.remainingBalance, currency)}
                </span>
              </div>
            </div>

            {/* Configured payment instructions if balance remains */}
            {payment.remainingBalance > 0 && hasInstructions && (
              <div className="my-3 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[10px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block uppercase">Payment Instructions:</span>
                {paybill && <p>• M-Pesa Paybill: <strong className="text-slate-900">{paybill}</strong> (Acc: {customer?.name})</p>}
                {till && <p>• M-Pesa Buy Goods: <strong className="text-slate-900">{till}</strong></p>}
                {sendMoney && <p>• M-Pesa Send Money: <strong className="text-slate-900">{sendMoney}</strong></p>}
                {bankDetails && <p>• Bank: <strong className="text-slate-900">{bankDetails}</strong></p>}
              </div>
            )}

            {/* Verification Footer */}
            <div className="text-center pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
              {payment.remainingBalance === 0 ? (
                <p className="font-bold text-emerald-700">✓ Fully Settled — Thank you for your business!</p>
              ) : (
                <p>Thank you for your prompt payment.</p>
              )}
              <p className="mt-1 text-slate-400">Cashier: {payment.recordedBy} • Fortunal DebtManager Verified Record</p>
            </div>
          </div>
        </div>

        {/* Automated Delivery & Re-issue Toolbar */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 print:hidden space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Automated Delivery Dispatch</span>
            </span>
            {onOpenDeliverySettings && (
              <button
                type="button"
                onClick={onOpenDeliverySettings}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold"
              >
                Delivery Plans & Credits →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleAutoDispatch('sms')}
              disabled={isDispatching}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 p-2 text-xs font-bold text-blue-300 transition active:scale-95 disabled:opacity-50"
            >
              {isDispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span>Auto-SMS</span>
            </button>

            <button
              type="button"
              onClick={() => handleAutoDispatch('whatsapp')}
              disabled={isDispatching}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 p-2 text-xs font-bold text-emerald-300 transition active:scale-95 disabled:opacity-50"
            >
              {isDispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>Auto-WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleDuplicateReprint}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 p-2 text-xs font-semibold text-amber-300 transition active:scale-95"
              title="Issue a certified duplicate receipt copy for customer or tax records"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Issue Duplicate</span>
            </button>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-slate-900 border-t border-slate-800 print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
              title="Copy receipt text to clipboard"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
            <button
              id="receipt-print-btn"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              id="receipt-pdf-download-btn"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-300 transition active:scale-95 disabled:opacity-50"
              title="Download official PDF receipt"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Send on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Share2,
  Printer,
  Copy,
  CheckCircle2,
  PlusCircle,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Mail,
  Edit2,
  Trash2,
  RotateCcw,
  Download,
  Loader2,
  Building2,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { Customer, Payment } from '../types';
import { generateStatementPDF } from '../utils/pdfGenerator';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onAddDebtForCustomer: (customerId: string) => void;
  onRecordPaymentForCustomer: (debtId: string) => void;
  onViewReceipt?: (payment: Payment) => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  onClose,
  customerId,
  onAddDebtForCustomer,
  onRecordPaymentForCustomer,
  onViewReceipt,
}) => {
  const { customers, debts, payments, formatMoney, user, updateCustomer, deleteCustomer } = useDebt();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const customer = customers.find((c) => c.id === customerId);

  if (!isOpen || !customer) return null;

  const custDebts = debts.filter((d) => d.customerId === customerId);
  const custPayments = payments.filter((p) => p.customerId === customerId);

  // Total debt vs total paid
  const totalBorrowed = custDebts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalOutstanding = custDebts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalPaid = custPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleDownloadStatementPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateStatementPDF(customer, debts, payments, user);
    } catch (err) {
      console.error('Failed to generate statement PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintStatement = () => {
    window.print();
  };


  // Compile full timeline
  type TimelineItem = {
    id: string;
    type: 'debt' | 'payment';
    date: string;
    title: string;
    description?: string;
    amount: number;
    method?: string;
    ref?: string;
    status?: string;
    debtId?: string;
  };

  const timeline: TimelineItem[] = [
    ...custDebts.map((d) => ({
      id: d.id,
      type: 'debt' as const,
      date: d.date,
      title: `Credit: ${d.description}`,
      description: `Due: ${d.dueDate} • Method: ${d.paymentMethod}`,
      amount: d.originalAmount,
      status: d.status,
      debtId: d.id,
    })),
    ...custPayments.map((p) => ({
      id: p.id,
      type: 'payment' as const,
      date: p.date,
      title: `Payment: Receipt #${p.receiptNumber}`,
      description: `Via ${p.paymentMethod}${p.referenceNumber ? ` (${p.referenceNumber})` : ''}`,
      amount: p.amount,
      debtId: p.debtId,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Statement text for WhatsApp sharing
  const statementText = `*STATEMENT OF ACCOUNT — FORTUNAL DEBTMANAGER*
${user.businessProfile.businessName || user.name || 'Fortunal DebtManager User'}
Customer: ${customer.name}
Phone: ${customer.phone || 'N/A'}
Date: ${new Date().toLocaleDateString()}
----------------------------
Total Credit Taken: ${formatMoney(totalBorrowed)}
Total Paid: ${formatMoney(totalPaid)}
CURRENT BALANCE DUE: ${formatMoney(totalOutstanding)}
----------------------------
Active Invoices:
${custDebts
  .filter((d) => d.status !== 'paid')
  .map(
    (d) =>
      `• ${d.description}: ${formatMoney(d.currentBalance, d.currency)} (Due ${d.dueDate})`
  )
  .join('\n')}

Kindly arrange payment to settle your account. Thank you!
Generated via Fortunal DebtManager — Know who owes. Know when. Get paid.`;

  const handleCopyStatement = () => {
    navigator.clipboard.writeText(statementText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareStatement = () => {
    const encoded = encodeURIComponent(statementText);
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleStartEdit = () => {
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditNotes(customer.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    updateCustomer(customer.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      notes: editNotes,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/95 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition mr-1"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-base">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{customer.name}</h3>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                  {customer.category}
                </span>
              </div>
              <p className="text-xs text-slate-400">{customer.phone || 'No phone recorded'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1 p-1.5 px-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
              title="Edit customer details"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edit mode drawer */}
        {isEditing && (
          <div className="bg-slate-850 border-b border-slate-800 p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Edit Customer Info
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditName('');
                  setEditPhone('');
                  setEditNotes('');
                }}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Fields</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Customer Notes / Address</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notes / Address"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="rounded-lg bg-emerald-600 disabled:opacity-50 px-4 py-1.5 text-xs font-bold text-white shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-3 gap-2 p-6 pb-2 print:hidden">
          <div className="rounded-xl bg-slate-850 border border-slate-800 p-3">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Borrowed</span>
            <span className="text-sm font-bold text-slate-200">{formatMoney(totalBorrowed)}</span>
          </div>
          <div className="rounded-xl bg-slate-850 border border-slate-800 p-3">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Paid</span>
            <span className="text-sm font-bold text-emerald-400">{formatMoney(totalPaid)}</span>
          </div>
          <div className="rounded-xl bg-slate-850 border border-slate-800 p-3">
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Current Balance</span>
            <span
              className={`text-base font-black ${
                totalOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {formatMoney(totalOutstanding)}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2 border-b border-slate-800 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onAddDebtForCustomer(customer.id);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 px-3 py-1.5 font-semibold text-slate-200 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Debt</span>
            </button>
            {custDebts.some((d) => d.status !== 'paid') && (
              <button
                onClick={() => {
                  const firstUnpaid = custDebts.find((d) => d.status !== 'paid');
                  if (firstUnpaid) {
                    onClose();
                    onRecordPaymentForCustomer(firstUnpaid.id);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 font-bold text-white transition"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleCopyStatement}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 transition"
              title="Copy statement text"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              id="statement-print-btn"
              onClick={handlePrintStatement}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-slate-300 hover:text-white transition"
              title="Print official statement"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              id="statement-pdf-btn"
              onClick={handleDownloadStatementPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-2.5 py-1.5 font-bold text-emerald-300 transition active:scale-95 disabled:opacity-50"
              title="Download clean PDF statement"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Statement</span>
                </>
              )}
            </button>
            <button
              onClick={handleShareStatement}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 font-semibold text-white shadow-sm transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Chronological Transaction History */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3 print:hidden">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ledger & Transaction History ({timeline.length})
          </h4>

          {timeline.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No transactions recorded yet.</p>
          ) : (
            timeline.map((item) => {
              const paymentObj = item.type === 'payment' ? payments.find((p) => p.id === item.id) : undefined;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-slate-850 border border-slate-800 p-3 text-xs hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        item.type === 'payment'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {item.type === 'payment' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.date} {item.description && `• ${item.description}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black text-sm block ${
                        item.type === 'payment' ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {item.type === 'payment' ? '-' : '+'} {formatMoney(item.amount)}
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {item.status && (
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            item.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                      {item.type === 'payment' && paymentObj && onViewReceipt && (
                        <button
                          onClick={() => onViewReceipt(paymentObj)}
                          className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition ml-1"
                          title="View & Share Official Receipt"
                        >
                          <Receipt className="w-2.5 h-2.5" />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clean Printable Statement (Rendered only when printing) */}
        <div className="hidden print:block printable-document p-6 text-slate-900 bg-white">
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                {user.businessProfile.businessName || user.name || 'Fortunal DebtManager Merchant'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">{user.businessProfile.location || 'Kenya'}</p>
              {user.phone && <p className="text-xs text-slate-600">Tel: {user.phone}</p>}
              <div className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 border border-slate-300">
                OFFICIAL STATEMENT OF ACCOUNT
              </div>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-slate-800">Date: {new Date().toISOString().split('T')[0]}</p>
              <p className="text-slate-600">Account ID: {customer.id}</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Customer Details</p>
                <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                <p className="text-slate-700">{customer.phone || 'No phone recorded'}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-semibold uppercase text-[10px]">Balance Overview</p>
                <p className="text-slate-700">Total Credit: <strong>{formatMoney(totalBorrowed)}</strong></p>
                <p className="text-slate-700">Total Paid: <strong>{formatMoney(totalPaid)}</strong></p>
                <p className="text-sm font-black text-rose-700 mt-1">
                  CURRENT BALANCE DUE: {formatMoney(totalOutstanding)}
                </p>
              </div>
            </div>
          </div>

          {/* Debts Table */}
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase text-slate-800 mb-1">
              1. Credit Invoices & Debts ({custDebts.length})
            </h3>
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="text-left p-1.5 border-b">Date</th>
                  <th className="text-left p-1.5 border-b">Description</th>
                  <th className="text-left p-1.5 border-b">Due Date</th>
                  <th className="text-right p-1.5 border-b">Original</th>
                  <th className="text-right p-1.5 border-b">Balance</th>
                  <th className="text-center p-1.5 border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {custDebts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-2 text-center text-slate-500">No debts recorded.</td>
                  </tr>
                ) : (
                  custDebts.map((d) => (
                    <tr key={d.id} className="border-b border-slate-200">
                      <td className="p-1.5">{d.date}</td>
                      <td className="p-1.5 font-medium">{d.description}</td>
                      <td className="p-1.5">{d.dueDate}</td>
                      <td className="p-1.5 text-right">{formatMoney(d.originalAmount, d.currency)}</td>
                      <td className="p-1.5 text-right font-bold">{formatMoney(d.currentBalance, d.currency)}</td>
                      <td className="p-1.5 text-center uppercase font-bold text-[10px]">{d.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payments Table */}
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase text-slate-800 mb-1">
              2. Payments Received ({custPayments.length})
            </h3>
            <table className="w-full text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="text-left p-1.5 border-b">Date</th>
                  <th className="text-left p-1.5 border-b">Receipt #</th>
                  <th className="text-left p-1.5 border-b">Method</th>
                  <th className="text-left p-1.5 border-b">Reference</th>
                  <th className="text-right p-1.5 border-b">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {custPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-2 text-center text-slate-500">No payments received yet.</td>
                  </tr>
                ) : (
                  custPayments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-200">
                      <td className="p-1.5">{p.date}</td>
                      <td className="p-1.5 font-mono">{p.receiptNumber}</td>
                      <td className="p-1.5">{p.paymentMethod}</td>
                      <td className="p-1.5 font-mono text-[10px]">{p.referenceNumber || '-'}</td>
                      <td className="p-1.5 text-right font-bold text-emerald-800">{formatMoney(p.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-500 text-center">
            <p className="font-bold text-slate-700">Fortunal DebtManager Official Record • Verified Financial Ledger</p>
          </div>
        </div>
      </div>
    </div>
  );
};

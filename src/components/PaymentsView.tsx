import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Share2,
  Printer,
  FileCheck,
  Calendar,
  DollarSign,
  User,
  ExternalLink,
  Trash2,
  Send,
  RotateCcw,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { Payment } from '../types';

interface PaymentsViewProps {
  onOpenRecordPayment: () => void;
  onViewReceipt: (payment: Payment) => void;
  onOpenCustomerLedger: (customerId: string) => void;
  onOpenDeliverySettings?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onOpenRecordPayment,
  onViewReceipt,
  onOpenCustomerLedger,
  onOpenDeliverySettings,
}) => {
  const { payments, customers, debts, formatMoney, deletePayment, receipts } = useDebt();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  const filtered = payments.filter((payment) => {
    const customer = customers.find((c) => c.id === payment.customerId);
    const q = searchQuery.toLowerCase();
    const matchCustomer = customer?.name.toLowerCase().includes(q) || false;
    const matchReceipt = payment.receiptNumber.toLowerCase().includes(q);
    const matchRef = payment.referenceNumber?.toLowerCase().includes(q) || false;
    const matchMethod = payment.paymentMethod.toLowerCase().includes(q);

    if (searchQuery && !matchCustomer && !matchReceipt && !matchRef && !matchMethod) {
      return false;
    }

    if (methodFilter !== 'all' && payment.paymentMethod !== methodFilter) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Payment Receipts & History</h1>
          <p className="text-xs text-slate-400">
            Total of <strong className="text-emerald-400">{formatMoney(totalCollected)}</strong> collected across {payments.length} transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDeliverySettings && (
            <button
              type="button"
              id="payments-auto-delivery-btn"
              onClick={onOpenDeliverySettings}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 px-3.5 py-2.5 text-xs font-bold text-blue-300 transition active:scale-95"
              title="Manage Automatic Receipt Delivery Plans & Audit Trail"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Auto-Receipts</span>
            </button>
          )}

          <button
            id="payments-view-record-btn"
            onClick={onOpenRecordPayment}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            <Receipt className="w-4 h-4" />
            <span>+ Record Payment</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt #, customer, M-Pesa ref..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'M-Pesa', 'Cash', 'Bank', 'Airtel Money'].map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                methodFilter === method
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {method === 'all' ? 'All Methods' : method}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-white">No payments found</p>
            <p className="text-xs">Try searching a different receipt number or customer name.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {sorted.map((payment) => {
              const customer = customers.find((c) => c.id === payment.customerId);
              const debt = debts.find((d) => d.id === payment.debtId);

              return (
                <div
                  key={payment.id}
                  className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-850/40 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <FileCheck className="w-5 h-5" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => customer && onOpenCustomerLedger(customer.id)}
                          className="text-sm font-bold text-white hover:text-emerald-400 text-left transition"
                        >
                          {customer?.name || 'Customer'}
                        </button>
                        <span className="font-mono text-[10px] text-slate-400 rounded bg-slate-800 px-1.5 py-0.5">
                          #{payment.receiptNumber}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">
                        Method: <strong className="text-slate-300">{payment.paymentMethod}</strong>
                        {payment.referenceNumber && (
                          <span className="font-mono text-emerald-400 ml-1">
                            (Ref: {payment.referenceNumber})
                          </span>
                        )}
                        {debt && ` • For: ${debt.description}`}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Date: {payment.date} • Recorded by: {payment.recordedBy}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 block">Amount Received</span>
                      <span className="text-base font-black text-emerald-400">
                        + {formatMoney(payment.amount)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Remaining: {formatMoney(payment.remainingBalance)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onViewReceipt(payment)}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Receipt</span>
                      </button>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to reverse / delete payment #${payment.receiptNumber} (${formatMoney(
                                payment.amount
                              )})? This will restore the debt balance.`
                            )
                          ) {
                            deletePayment(payment.id);
                          }
                        }}
                        className="rounded-xl p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Reverse / Delete Payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

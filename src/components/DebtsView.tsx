import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  Share2,
  Receipt,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Repeat,
  FileText,
  User,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  CheckSquare,
  Square,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { Debt, Payment, ReminderStyle } from '../types';
import { BulkClaimModal } from './BulkClaimModal';
import { BulkDeleteModal } from './BulkDeleteModal';
import { PaymentPlanModal } from './PaymentPlanModal';

interface DebtsViewProps {
  onOpenAddDebt: () => void;
  onOpenRecordPayment: (debtId: string) => void;
  onOpenMpesaPayment?: (debtId: string) => void;
  onOpenReminder: (customerId: string, debtId: string, style?: ReminderStyle) => void;
  onOpenCustomerLedger: (customerId: string) => void;
  onOpenEditDebt?: (debtId: string) => void;
  onViewReceipt?: (payment: Payment) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  onOpenAddDebt,
  onOpenRecordPayment,
  onOpenMpesaPayment,
  onOpenReminder,
  onOpenCustomerLedger,
  onOpenEditDebt,
  onViewReceipt,
}) => {
  const { debts, customers, payments, formatMoney, deleteDebt } = useDebt();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'due_soon' | 'paid' | 'recurring'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'balance' | 'amount'>('dueDate');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // Bulk Controls State
  const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set());
  const [isBulkClaimOpen, setIsBulkClaimOpen] = useState(false);
  const [bulkClaimScope, setBulkClaimScope] = useState<'selected' | 'all'>('selected');
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'delete_selected' | 'delete_all' | null>(null);
  const [paymentPlanDebtId, setPaymentPlanDebtId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const filtered = debts.filter((debt) => {
    const customer = customers.find((c) => c.id === debt.customerId);
    const q = searchQuery.toLowerCase();
    const matchName = customer?.name.toLowerCase().includes(q) || false;
    const matchPhone = customer?.phone?.toLowerCase().includes(q) || false;
    const matchDesc = debt.description.toLowerCase().includes(q);
    const matchCat = debt.category?.toLowerCase().includes(q) || false;
    const matchNotes = debt.notes?.toLowerCase().includes(q) || false;
    const matchRef = debt.invoiceNumber?.toLowerCase().includes(q) || false;

    if (searchQuery && !matchName && !matchPhone && !matchDesc && !matchCat && !matchNotes && !matchRef) return false;

    const isOverdue = debt.status !== 'paid' && debt.dueDate < today;
    const isDueSoon = debt.status !== 'paid' && debt.dueDate >= today && debt.dueDate <= next7Days;

    if (filter === 'active') return debt.status !== 'paid';
    if (filter === 'overdue') return isOverdue;
    if (filter === 'due_soon') return isDueSoon;
    if (filter === 'paid') return debt.status === 'paid';
    if (filter === 'recurring') return debt.isRecurring;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'balance') return b.currentBalance - a.currentBalance;
    if (sortBy === 'amount') return b.originalAmount - a.originalAmount;
    // Default dueDate: earliest overdue first
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Bulk Selection Calculations
  const visibleDebtIds = sorted.map((d) => d.id);
  const isAllVisibleSelected =
    visibleDebtIds.length > 0 && visibleDebtIds.every((id) => selectedDebtIds.has(id));
  const isSomeVisibleSelected =
    visibleDebtIds.some((id) => selectedDebtIds.has(id)) && !isAllVisibleSelected;

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      const next = new Set(selectedDebtIds);
      visibleDebtIds.forEach((id) => next.delete(id));
      setSelectedDebtIds(next);
    } else {
      const next = new Set(selectedDebtIds);
      visibleDebtIds.forEach((id) => next.add(id));
      setSelectedDebtIds(next);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedDebtIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDebtIds(next);
  };

  const selectedDebtsList = debts.filter((d) => selectedDebtIds.has(d.id));
  const debtsForClaim =
    selectedDebtsList.length > 0
      ? selectedDebtsList
      : sorted.filter((d) => d.status !== 'paid' && d.currentBalance > 0);

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Debts & Credit Sales</h1>
          <p className="text-xs text-slate-400">
            Track, filter, and manage all credit given ({debts.length} records)
          </p>
        </div>

        <button
          id="debts-view-add-debt-btn"
          onClick={onOpenAddDebt}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record New Debt</span>
        </button>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="debts-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, items, notes..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'due_soon', label: 'Due Soon' },
            { id: 'paid', label: 'Settled' },
            { id: 'recurring', label: 'Recurring' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                filter === item.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 self-end md:self-auto text-xs text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="dueDate">Sort by Due Date</option>
            <option value="balance">Sort by Balance High-Low</option>
            <option value="amount">Sort by Original Amount</option>
          </select>
        </div>
      </div>

      {/* Bulk Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <label
            htmlFor="select-all-debts-cb"
            className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-300 hover:text-white"
          >
            <input
              id="select-all-debts-cb"
              type="checkbox"
              checked={isAllVisibleSelected}
              ref={(input) => {
                if (input) input.indeterminate = isSomeVisibleSelected;
              }}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span>
              Select All Visible ({sorted.length})
            </span>
          </label>

          {selectedDebtIds.size > 0 && (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                {selectedDebtIds.size} Selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedDebtIds(new Set())}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedDebtIds.size > 0 ? (
            <>
              <button
                type="button"
                id="bulk-claim-selected-btn"
                onClick={() => {
                  setBulkClaimScope('selected');
                  setIsBulkClaimOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-950/40 transition active:scale-95"
                title="Initiate collection for selected debts"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Claim From Selected ({selectedDebtIds.size})</span>
              </button>

              <button
                type="button"
                id="bulk-claim-debt-btn"
                onClick={() => {
                  setBulkClaimScope('all');
                  setIsBulkClaimOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition active:scale-95"
                title="Claim all outstanding debts across all customers"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Claim All ({debts.filter((d) => d.status !== 'paid' && d.currentBalance > 0).length})</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              id="bulk-claim-debt-btn"
              onClick={() => {
                setBulkClaimScope('all');
                setIsBulkClaimOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-950/40 transition active:scale-95"
              title="Claim all eligible outstanding debts (excluding zero balances)"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                Claim Debt From All ({debts.filter((d) => d.status !== 'paid' && d.currentBalance > 0).length})
              </span>
            </button>
          )}

          {/* Delete Selected (enabled if items are selected) */}
          <button
            type="button"
            id="bulk-delete-selected-btn"
            onClick={() => setBulkDeleteMode('delete_selected')}
            disabled={selectedDebtIds.size === 0}
            className="flex items-center gap-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 disabled:opacity-40 disabled:hover:bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition active:scale-95"
            title="Delete only selected records"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected {selectedDebtIds.size > 0 ? `(${selectedDebtIds.size})` : ''}</span>
          </button>

          {/* Delete All Permanently (protected) */}
          <button
            type="button"
            id="bulk-delete-all-permanently-btn"
            onClick={() => setBulkDeleteMode('delete_all')}
            className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700/60 hover:border-rose-700/60 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 transition"
            title="Protected multi-step permanent wipe"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete All Permanently</span>
          </button>
        </div>
      </div>

      {/* Debts Table / List */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <DollarSign className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-white">No debts match this view</p>
            <p className="text-xs">Adjust your search or filter options.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {sorted.map((debt) => {
              const customer = customers.find((c) => c.id === debt.customerId);
              const isOverdue = debt.status !== 'paid' && debt.dueDate < today;
              const isSettled = debt.status === 'paid';

              const isSelected = selectedDebtIds.has(debt.id);

              return (
                <div
                  key={debt.id}
                  className={`p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    isSelected
                      ? 'bg-emerald-950/20 border-l-4 border-emerald-500 hover:bg-emerald-950/30'
                      : 'hover:bg-slate-850/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Row selection checkbox */}
                    <div className="pt-2.5 sm:pt-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(debt.id)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                        title={isSelected ? 'Deselect debt' : 'Select debt'}
                      />
                    </div>

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                        isSettled
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isOverdue
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {isSettled ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isOverdue ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => customer && onOpenCustomerLedger(customer.id)}
                          className="text-sm font-bold text-white hover:text-emerald-400 transition text-left"
                        >
                          {customer?.name || 'Customer'}
                        </button>
                        {debt.isRecurring && (
                          <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-300">
                            <Repeat className="w-2.5 h-2.5" />
                            <span>Recurring</span>
                          </span>
                        )}
                        {debt.paymentPlan?.enabled && (
                          <span className="flex items-center gap-1 rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-[9px] font-bold text-violet-300">
                            <span>Plan: {formatMoney(debt.paymentPlan.installmentAmount, debt.currency)} {debt.paymentPlan.installmentFrequency}</span>
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            isSettled
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : isOverdue
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {isSettled ? 'Settled' : isOverdue ? 'Overdue' : 'Due Soon'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">{debt.description}</p>
                      <p className="text-[11px] text-slate-500">
                        Date: {debt.date} • Due: <strong className="text-slate-400">{debt.dueDate}</strong> • Channel: {debt.paymentMethod}
                        {debt.category && ` • ${debt.category}`}
                      </p>

                      {/* Expandable Payment history toggle */}
                      {(() => {
                        const debtPayments = payments.filter((p) => p.debtId === debt.id);
                        const totalDebtPaid = debtPayments.reduce((sum, p) => sum + p.amount, 0);
                        const isExpanded = expandedDebtId === debt.id;

                        if (debtPayments.length === 0) return null;

                        return (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 transition"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>
                                {debtPayments.length} payment{debtPayments.length > 1 ? 's' : ''} received ({formatMoney(totalDebtPaid, debt.currency)})
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 ml-0.5" />
                              ) : (
                                <ChevronDown className="w-3 h-3 ml-0.5" />
                              )}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Financial amounts & Row actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 block">Current Balance</span>
                      <span
                        className={`text-base font-black ${
                          isSettled
                            ? 'text-emerald-400'
                            : isOverdue
                            ? 'text-rose-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {formatMoney(debt.currentBalance, debt.currency)}
                      </span>
                      {debt.currentBalance < debt.originalAmount && (
                        <span className="text-[10px] text-slate-500 block">
                          of {formatMoney(debt.originalAmount, debt.currency)} original
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isSettled && customer && (
                        <button
                          onClick={() => onOpenReminder(customer.id, debt.id)}
                          className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                          title="WhatsApp Reminder"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden md:inline">Remind</span>
                        </button>
                      )}

                      {!isSettled && (
                        <>
                          {onOpenMpesaPayment && (
                            <button
                              onClick={() => onOpenMpesaPayment(debt.id)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-2 text-xs font-bold text-emerald-300 shadow-sm transition active:scale-95"
                              title="Pay via Safaricom M-Pesa STK Push"
                            >
                              <Zap className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden sm:inline">M-Pesa</span>
                            </button>
                          )}

                          <button
                            onClick={() => onOpenRecordPayment(debt.id)}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
                            title="Record Manual Payment"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        </>
                      )}

                      {!isSettled && (
                        <button
                          onClick={() => setPaymentPlanDebtId(debt.id)}
                          className={`flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                            debt.paymentPlan?.enabled
                              ? 'bg-violet-950/60 hover:bg-violet-900/70 border border-violet-700/60 text-violet-200'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          title={debt.paymentPlan?.enabled ? 'Manage Payment Plan' : 'Setup Installment Plan'}
                        >
                          <Repeat className="w-3.5 h-3.5 text-violet-400" />
                          <span className="hidden lg:inline">{debt.paymentPlan?.enabled ? 'Plan Active' : 'Plan'}</span>
                        </button>
                      )}

                      {onOpenEditDebt && (
                        <button
                          onClick={() => onOpenEditDebt(debt.id)}
                          className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Debt / Change Due Date"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this debt record?')) {
                            deleteDebt(debt.id);
                          }
                        }}
                        className="rounded-xl p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Delete Debt Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Payment History sub-card */}
                  {expandedDebtId === debt.id && (
                    <div className="w-full pt-3 mt-3 border-t border-slate-800 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Payments received for this debt
                        </span>
                        <button
                          onClick={() => setExpandedDebtId(null)}
                          className="text-[10px] text-slate-400 hover:text-white"
                        >
                          Close History
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {payments
                          .filter((p) => p.debtId === debt.id)
                          .map((p) => (
                            <div
                              key={p.id}
                              className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-emerald-400">
                                    {formatMoney(p.amount, debt.currency)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    #{p.receiptNumber}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  {p.date} • {p.paymentMethod}
                                  {p.referenceNumber && ` (${p.referenceNumber})`}
                                </p>
                              </div>
                              {onViewReceipt && (
                                <button
                                  type="button"
                                  onClick={() => onViewReceipt(p)}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2 py-1 text-[11px] font-semibold transition"
                                  title="View Official Receipt"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Receipt</span>
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Operation Modals */}
      <BulkClaimModal
        isOpen={isBulkClaimOpen}
        onClose={() => setIsBulkClaimOpen(false)}
        selectedDebts={debtsForClaim}
        allEligibleDebts={debts.filter((d) => d.status !== 'paid' && d.currentBalance > 0)}
        initialMode={bulkClaimScope}
      />

      <BulkDeleteModal
        isOpen={bulkDeleteMode !== null}
        onClose={() => setBulkDeleteMode(null)}
        mode={bulkDeleteMode || 'delete_selected'}
        selectedDebts={selectedDebtsList}
        onSuccess={() => {
          setSelectedDebtIds(new Set());
        }}
      />

      <PaymentPlanModal
        isOpen={paymentPlanDebtId !== null}
        debtId={paymentPlanDebtId}
        onClose={() => setPaymentPlanDebtId(null)}
      />
    </div>
  );
};

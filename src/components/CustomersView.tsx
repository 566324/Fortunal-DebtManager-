import React, { useState, useRef } from 'react';
import {
  User,
  Phone,
  Search,
  Plus,
  ArrowRight,
  PhoneCall,
  PlusCircle,
  Trash2,
  Archive,
  ArchiveRestore,
  MoreVertical,
  DollarSign,
  Bell,
  AlertTriangle,
  X,
  FileText,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { Customer } from '../types';
import { BulkClaimModal } from './BulkClaimModal';
import { BulkDeleteModal } from './BulkDeleteModal';

interface CustomersViewProps {
  onOpenCustomerLedger: (customerId: string) => void;
  onOpenAddDebt: (customerId?: string) => void;
  onOpenAddCustomer: () => void;
  onOpenRecordPayment?: (debtId?: string) => void;
  onOpenReminder?: (customerId: string, debtId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenCustomerLedger,
  onOpenAddDebt,
  onOpenAddCustomer,
  onOpenRecordPayment,
  onOpenReminder,
}) => {
  const {
    customers,
    debts,
    payments,
    formatMoney,
    archiveCustomer,
    unarchiveCustomer,
    permanentlyDeleteCustomer,
  } = useDebt();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'with_balance' | 'overdue' | 'cleared' | 'archived'>(
    'all'
  );

  // Bulk Controls State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isBulkClaimOpen, setIsBulkClaimOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'delete_selected' | 'delete_all' | null>(null);

  // Active action menu for long-press / 3-dots
  const [activeMenuCustomer, setActiveMenuCustomer] = useState<Customer | null>(null);

  // Confirmation modal state for deletion / archiving
  const [confirmModalData, setConfirmModalData] = useState<{
    customer: Customer;
    balance: number;
    debtCount: number;
    paymentCount: number;
  } | null>(null);

  // Mobile Long Press Timer
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (customer: Customer) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveMenuCustomer(customer);
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Customer calculations
  const customerStats = customers.map((c) => {
    const cDebts = debts.filter((d) => d.customerId === c.id);
    const cPayments = payments.filter((p) => p.customerId === c.id);

    const balance = cDebts.reduce((sum, d) => sum + d.currentBalance, 0);
    const totalBorrowed = cDebts.reduce((sum, d) => sum + d.originalAmount, 0);
    const totalPaid = cPayments.reduce((sum, p) => sum + p.amount, 0);

    const hasOverdue = cDebts.some(
      (d) =>
        d.status !== 'paid' &&
        new Date(d.dueDate) < new Date(new Date().toISOString().split('T')[0])
    );

    const activeDebt = cDebts.find((d) => d.status !== 'paid');

    return {
      customer: c,
      balance,
      totalBorrowed,
      totalPaid,
      debtCount: cDebts.length,
      paymentCount: cPayments.length,
      activeDebtCount: cDebts.filter((d) => d.status !== 'paid').length,
      activeDebtId: activeDebt?.id,
      hasOverdue,
      isArchived: !!c.archived,
    };
  });

  const archivedCount = customerStats.filter((item) => item.isArchived).length;

  const filtered = customerStats.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchName = item.customer.name.toLowerCase().includes(q);
    const matchPhone = item.customer.phone?.toLowerCase().includes(q) || false;
    const matchCat = item.customer.category?.toLowerCase().includes(q) || false;
    const matchesSearch = !searchQuery || matchName || matchPhone || matchCat;

    if (!matchesSearch) return false;

    if (filter === 'archived') return item.isArchived;

    // Normal filters exclude archived customers unless specifically viewed
    if (item.isArchived) return false;

    if (filter === 'with_balance') return item.balance > 0;
    if (filter === 'overdue') return item.hasOverdue;
    if (filter === 'cleared') return item.balance === 0 && item.totalBorrowed > 0;
    return true;
  });

  // Bulk Selection Helpers
  const visibleCustomerIds = filtered.map((item) => item.customer.id);
  const isAllVisibleSelected =
    visibleCustomerIds.length > 0 &&
    visibleCustomerIds.every((id) => selectedCustomerIds.has(id));
  const isSomeVisibleSelected =
    visibleCustomerIds.some((id) => selectedCustomerIds.has(id)) && !isAllVisibleSelected;

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      const next = new Set(selectedCustomerIds);
      visibleCustomerIds.forEach((id) => next.delete(id));
      setSelectedCustomerIds(next);
    } else {
      const next = new Set(selectedCustomerIds);
      visibleCustomerIds.forEach((id) => next.add(id));
      setSelectedCustomerIds(next);
    }
  };

  const handleToggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedCustomerIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCustomerIds(next);
  };

  const selectedCustomersList = customers.filter((c) => selectedCustomerIds.has(c.id));

  const debtsForClaim = debts.filter((d) => {
    if (d.status === 'paid' || d.currentBalance <= 0) return false;
    if (selectedCustomerIds.size > 0) {
      return selectedCustomerIds.has(d.customerId);
    }
    return visibleCustomerIds.includes(d.customerId);
  });

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header & Add Customer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Customers & Borrowers</h1>
          <p className="text-xs text-slate-400">
            View customer ledgers, debt history, and manage records ({customers.length} total)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAddDebt()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Give Credit</span>
          </button>
          <button
            id="add-new-customer-btn"
            onClick={onOpenAddCustomer}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="customer-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, phone number, category..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Active' },
            { id: 'with_balance', label: 'Has Balance' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'cleared', label: 'Cleared' },
            {
              id: 'archived',
              label: `Archived ${archivedCount > 0 ? `(${archivedCount})` : ''}`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                filter === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <label
            htmlFor="select-all-customers-cb"
            className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-300 hover:text-white"
          >
            <input
              id="select-all-customers-cb"
              type="checkbox"
              checked={isAllVisibleSelected}
              ref={(input) => {
                if (input) input.indeterminate = isSomeVisibleSelected;
              }}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span>Select All Visible ({filtered.length})</span>
          </label>

          {selectedCustomerIds.size > 0 && (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                {selectedCustomerIds.size} Selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomerIds(new Set())}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="bulk-customer-claim-btn"
            onClick={() => setIsBulkClaimOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-950/40 transition active:scale-95"
            title="Send collection reminders to selected debtors"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {selectedCustomerIds.size > 0
                ? `Claim From Selected (${debtsForClaim.length})`
                : `Claim Debt From All (${debtsForClaim.length})`}
            </span>
          </button>

          <button
            type="button"
            id="bulk-customer-delete-selected-btn"
            onClick={() => setBulkDeleteMode('delete_selected')}
            disabled={selectedCustomerIds.size === 0}
            className="flex items-center gap-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 disabled:opacity-40 disabled:hover:bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition active:scale-95"
            title="Delete only selected customers"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              Delete Selected {selectedCustomerIds.size > 0 ? `(${selectedCustomerIds.size})` : ''}
            </span>
          </button>

          <button
            type="button"
            id="bulk-customer-delete-all-permanently-btn"
            onClick={() => setBulkDeleteMode('delete_all')}
            className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700/60 hover:border-rose-700/60 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 transition"
            title="Protected permanent wipe"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete All Permanently</span>
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-400 space-y-2">
            <User className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-white">No customers match this filter</p>
            <p className="text-xs">Try adjusting your search query or switch tabs.</p>
          </div>
        ) : (
          filtered.map(
            ({
              customer,
              balance,
              totalBorrowed,
              totalPaid,
              debtCount,
              paymentCount,
              activeDebtCount,
              activeDebtId,
              hasOverdue,
              isArchived,
            }) => {
              const isSelected = selectedCustomerIds.has(customer.id);

              return (
                <div
                  key={customer.id}
                  onTouchStart={() => handleTouchStart(customer)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  className={`group rounded-2xl bg-slate-900/90 border p-4 space-y-3 transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : isArchived
                      ? 'border-slate-800/60 opacity-75'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Selection Checkbox */}
                        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(customer.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                            title={isSelected ? 'Deselect customer' : 'Select customer'}
                          />
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 font-black text-sm group-hover:bg-emerald-500/20 transition">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => onOpenCustomerLedger(customer.id)}
                            className="text-sm font-bold text-white group-hover:text-emerald-400 text-left transition"
                          >
                            {customer.name}
                          </button>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{customer.phone || 'No phone'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isArchived ? (
                          <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[9px] font-bold text-slate-300">
                            Archived
                          </span>
                        ) : hasOverdue ? (
                          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-300">
                            Overdue
                          </span>
                        ) : balance > 0 ? (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                            Clean
                          </span>
                        )}

                        {/* Customer Action Menu Trigger */}
                        <button
                          type="button"
                          onClick={() => setActiveMenuCustomer(customer)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Actions / Manage customer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Financial Stats Bar */}
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-850 p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Balance Due</span>
                        <span
                          className={`text-sm font-black ${
                            balance > 0
                              ? hasOverdue
                                ? 'text-rose-400'
                                : 'text-amber-300'
                              : 'text-emerald-400'
                          }`}
                        >
                          {formatMoney(balance)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Total Settled</span>
                        <span className="text-sm font-bold text-slate-200">
                          {formatMoney(totalPaid)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1.5">
                      {customer.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          title="Call Customer"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                        </a>
                      )}

                      {!isArchived ? (
                        <>
                          <button
                            onClick={() => onOpenAddDebt(customer.id)}
                            className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          >
                            + Credit
                          </button>
                          {balance > 0 && onOpenRecordPayment && activeDebtId && (
                            <button
                              onClick={() => onOpenRecordPayment(activeDebtId)}
                              className="rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-2.5 py-1.5 text-[11px] font-semibold transition"
                            >
                              Pay
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => unarchiveCustomer(customer.id)}
                          className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 transition"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      )}

                      {/* Visible Delete/Archive Control */}
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmModalData({
                            customer,
                            balance,
                            debtCount,
                            paymentCount,
                          })
                        }
                        className="rounded-lg p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title={isArchived ? 'Permanently Delete' : 'Archive or Delete Customer'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => onOpenCustomerLedger(customer.id)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      <span>Ledger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }
          )
        )}
      </div>

      {/* Customer Long-Press / Action Menu Drawer / Modal */}
      {activeMenuCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 font-black text-sm">
                  {activeMenuCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{activeMenuCustomer.name}</h3>
                  <p className="text-xs text-slate-400">{activeMenuCustomer.phone || 'No phone'}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveMenuCustomer(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  onOpenCustomerLedger(activeMenuCustomer.id);
                  setActiveMenuCustomer(null);
                }}
                className="w-full flex items-center gap-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>View Full Account Ledger</span>
              </button>

              <button
                onClick={() => {
                  onOpenAddDebt(activeMenuCustomer.id);
                  setActiveMenuCustomer(null);
                }}
                className="w-full flex items-center gap-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Give New Credit / Goods</span>
              </button>

              {onOpenRecordPayment && (
                <button
                  onClick={() => {
                    const cDebts = debts.filter((d) => d.customerId === activeMenuCustomer.id && d.status !== 'paid');
                    onOpenRecordPayment(cDebts[0]?.id);
                    setActiveMenuCustomer(null);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Record Customer Payment</span>
                </button>
              )}

              {onOpenReminder && activeMenuCustomer.phone && (
                <button
                  onClick={() => {
                    const cDebts = debts.filter((d) => d.customerId === activeMenuCustomer.id && d.status !== 'paid');
                    if (cDebts[0]) {
                      onOpenReminder(activeMenuCustomer.id, cDebts[0].id);
                    }
                    setActiveMenuCustomer(null);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
                >
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>Send WhatsApp / SMS Reminder</span>
                </button>
              )}

              {activeMenuCustomer.archived ? (
                <button
                  onClick={() => {
                    unarchiveCustomer(activeMenuCustomer.id);
                    setActiveMenuCustomer(null);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-emerald-400 transition"
                >
                  <ArchiveRestore className="w-4 h-4" />
                  <span>Restore from Archive</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const stat = customerStats.find((s) => s.customer.id === activeMenuCustomer.id);
                    setConfirmModalData({
                      customer: activeMenuCustomer,
                      balance: stat?.balance || 0,
                      debtCount: stat?.debtCount || 0,
                      paymentCount: stat?.paymentCount || 0,
                    });
                    setActiveMenuCustomer(null);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2.5 text-xs font-semibold text-rose-300 transition"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Archive or Delete Customer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safe Deletion & Archiving Confirmation Modal */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-base text-white">
                Customer Management & Deletion
              </h3>
            </div>

            <div className="rounded-xl bg-slate-850 p-3 border border-slate-800 space-y-1 text-xs">
              <p className="text-white font-bold text-sm">
                {confirmModalData.customer.name}
              </p>
              <div className="flex items-center justify-between text-slate-400 pt-1">
                <span>Active Balance:</span>
                <strong
                  className={confirmModalData.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}
                >
                  {formatMoney(confirmModalData.balance)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Total Historical Records:</span>
                <span className="text-white">
                  {confirmModalData.debtCount} debts, {confirmModalData.paymentCount} payments
                </span>
              </div>
            </div>

            {confirmModalData.balance > 0 && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Active Balance Outstanding</span>
                </p>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  This customer owes {formatMoney(confirmModalData.balance)}. Archiving is highly recommended so you keep all payment receipts and credit records without losing your financial audit trail.
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  archiveCustomer(confirmModalData.customer.id);
                  setConfirmModalData(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 text-xs font-bold text-white transition active:scale-95"
              >
                <Archive className="w-4 h-4 text-emerald-400" />
                <span>Archive Customer (Safe & Recommended)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  permanentlyDeleteCustomer(confirmModalData.customer.id);
                  setConfirmModalData(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 py-2.5 text-xs font-bold text-rose-300 hover:text-white transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete Customer & History</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1.5 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operation Modals */}
      <BulkClaimModal
        isOpen={isBulkClaimOpen}
        onClose={() => setIsBulkClaimOpen(false)}
        selectedDebts={debtsForClaim}
        allEligibleDebts={debts.filter((d) => d.status !== 'paid' && d.currentBalance > 0)}
        initialMode={selectedCustomerIds.size > 0 ? 'selected' : 'all'}
      />

      <BulkDeleteModal
        isOpen={bulkDeleteMode !== null}
        onClose={() => setBulkDeleteMode(null)}
        mode={bulkDeleteMode || 'delete_selected'}
        targetType="customers"
        selectedCustomers={selectedCustomersList}
        onSuccess={() => {
          setSelectedCustomerIds(new Set());
        }}
      />
    </div>
  );
};

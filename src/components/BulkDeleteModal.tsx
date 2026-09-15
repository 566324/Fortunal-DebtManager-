import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Debt, Customer } from '../types';
import { useDebt } from '../context/DebtContext';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'delete_selected' | 'delete_all';
  targetType?: 'debts' | 'customers';
  selectedDebts?: Debt[];
  selectedCustomers?: Customer[];
  onSuccess?: () => void;
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  mode,
  targetType = 'debts',
  selectedDebts = [],
  selectedCustomers = [],
  onSuccess,
}) => {
  const {
    debts,
    customers,
    payments,
    deleteDebt,
    permanentlyDeleteCustomer,
    clearAllData,
    formatMoney,
  } = useDebt();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isDeleteAll = mode === 'delete_all';
  const isSelected = mode === 'delete_selected';
  const isCustomerTarget = targetType === 'customers';

  const selectedCount = isCustomerTarget ? selectedCustomers.length : selectedDebts.length;

  const handleDeleteSelected = () => {
    setIsDeleting(true);
    try {
      if (isCustomerTarget) {
        selectedCustomers.forEach((c) => {
          permanentlyDeleteCustomer(c.id);
        });
      } else {
        selectedDebts.forEach((debt) => {
          deleteDebt(debt.id);
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to delete selected items:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllPermanently = () => {
    if (confirmText.trim() !== 'DELETE ALL') return;
    setIsDeleting(true);
    try {
      clearAllData();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to wipe all data:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalSelectedBalance = selectedDebts.reduce((sum, d) => sum + d.currentBalance, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div
          className={`p-5 flex items-center justify-between border-b ${
            isDeleteAll
              ? 'bg-rose-950/40 border-rose-900/60'
              : 'bg-slate-850 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isDeleteAll
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {isDeleteAll ? <ShieldAlert className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isDeleteAll ? 'Delete All Records Permanently' : 'Delete Selected Records'}
              </h3>
              <p className="text-xs text-slate-400">
                {isDeleteAll
                  ? 'Irreversible database reset with protective safeguards'
                  : `Confirm deletion of ${selectedDebts.length} selected records`}
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

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {isSelected && (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <span className="font-bold">Caution: </span>
                  <span>
                    You are about to delete <strong>{selectedCount} {isCustomerTarget ? 'customer account(s)' : 'debt record(s)'}</strong>
                    {!isCustomerTarget && ` with a combined outstanding balance of ${formatMoney(totalSelectedBalance)}`}.
                  </span>
                </div>
              </div>

              {/* Items summary */}
              <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-2 space-y-1.5 text-xs">
                {isCustomerTarget
                  ? selectedCustomers.map((c) => {
                      const cDebts = debts.filter((d) => d.customerId === c.id);
                      const cBal = cDebts.reduce((sum, d) => sum + d.currentBalance, 0);
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80"
                        >
                          <div>
                            <span className="font-bold text-white">{c.name}</span>
                            <span className="text-slate-400 ml-2 text-[11px]">{c.phone || 'No phone'}</span>
                          </div>
                          <span className="font-black text-rose-400">
                            {formatMoney(cBal)}
                          </span>
                        </div>
                      );
                    })
                  : selectedDebts.map((d) => {
                      const customer = customers.find((c) => c.id === d.customerId);
                      return (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80"
                        >
                          <div>
                            <span className="font-bold text-white">{customer?.name || 'Customer'}</span>
                            <span className="text-slate-400 ml-2 text-[11px]">{d.description}</span>
                          </div>
                          <span className="font-black text-rose-400">
                            {formatMoney(d.currentBalance, d.currency)}
                          </span>
                        </div>
                      );
                    })}
              </div>

              <p className="text-xs text-slate-400">
                {isCustomerTarget
                  ? 'All debt records, transactions, and notes for these customers will also be removed.'
                  : 'Any payments directly linked to these deleted debts will be detached. This action cannot be undone.'}
              </p>
            </div>
          )}

          {isDeleteAll && (
            <div className="space-y-4">
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>DANGER ZONE: Permanent System Reset</span>
                </div>
                <p>
                  This action will permanently and irreversibly wipe all data:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>{debts.length}</strong> debt and credit records</li>
                  <li><strong>{customers.length}</strong> customer profiles and accounts</li>
                  <li><strong>{payments.length}</strong> payment receipts and history records</li>
                </ul>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Protection Safeguard: Type "DELETE ALL" to unlock</span>
                </label>
                <input
                  id="confirm-delete-all-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE ALL here"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white uppercase tracking-wider font-mono focus:border-rose-500 focus:outline-none"
                  autoFocus
                />
                <span className="text-[11px] text-slate-500 block">
                  Exact uppercase match required before deletion button is enabled.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition"
          >
            Cancel
          </button>

          {isSelected && (
            <button
              type="button"
              id="confirm-delete-selected-btn"
              onClick={handleDeleteSelected}
              disabled={isDeleting || selectedDebts.length === 0}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-rose-950/50 transition active:scale-95"
            >
              {isDeleting ? 'Deleting...' : `Confirm Delete (${selectedDebts.length})`}
            </button>
          )}

          {isDeleteAll && (
            <button
              type="button"
              id="confirm-delete-all-permanently-btn"
              onClick={handleDeleteAllPermanently}
              disabled={isDeleting || confirmText.trim() !== 'DELETE ALL'}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-rose-950/50 transition active:scale-95 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Wiping All Records...' : 'PERMANENTLY DELETE ALL'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

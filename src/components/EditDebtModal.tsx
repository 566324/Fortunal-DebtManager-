import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { useDebt } from '../context/DebtContext';

interface EditDebtModalProps {
  isOpen: boolean;
  debtId: string | null;
  onClose: () => void;
}

export const EditDebtModal: React.FC<EditDebtModalProps> = ({
  isOpen,
  debtId,
  onClose,
}) => {
  const { debts, customers, updateDebt, formatMoney } = useDebt();

  const debt = debts.find((d) => d.id === debtId);
  const customer = customers.find((c) => c.id === debt?.customerId);

  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (debt) {
      setDescription(debt.description || '');
      setDueDate(debt.dueDate || '');
      setNotes(debt.notes || '');
    }
  }, [debt]);

  if (!isOpen || !debt) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const in7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const in30DaysStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateDebt(debt.id, {
      description: description.trim(),
      dueDate,
      notes: notes.trim(),
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  const handleSetQuickDate = (dateVal: string) => {
    setDueDate(dateVal);
  };

  const isOverdue = debt.status !== 'paid' && dueDate < todayStr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Edit Debt & Due Date</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customer: <strong className="text-slate-200">{customer?.name || 'Customer'}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Debt record updated successfully!</span>
            </div>
          )}

          {/* Financial summary banner */}
          <div className="rounded-xl bg-slate-850 p-3.5 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Current Balance</span>
              <span className="text-base font-black text-rose-400">
                {formatMoney(debt.currentBalance, debt.currency)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Original Credit</span>
              <span className="text-xs font-bold text-slate-300">
                {formatMoney(debt.originalAmount, debt.currency)}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Item / Goods Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Due Date & Quick Test Overdue buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Payment Due Date</span>
              </label>
              {isOverdue && (
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue Status
                </span>
              )}
            </div>

            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />

            {/* Quick date presets / Test logic */}
            <div>
              <p className="text-[10px] text-slate-400 mb-1.5 font-medium">Quick date presets & QA test logic:</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(yesterdayStr)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition border ${
                    dueDate === yesterdayStr
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-750'
                  }`}
                  title="Sets due date to yesterday to test overdue calculations and collection triggers"
                >
                  ⚡ Simulate Overdue (Yesterday)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(todayStr)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition border ${
                    dueDate === todayStr
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  Due Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(in7DaysStr)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition border ${
                    dueDate === in7DaysStr
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  In 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(in30DaysStr)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition border ${
                    dueDate === in30DaysStr
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  In 30 Days
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Notes / Agreed Terms</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Promised to pay by end of month via M-Pesa"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

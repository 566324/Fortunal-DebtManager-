import React, { useState } from 'react';
import {
  DollarSign,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  User,
  PlusCircle,
  Receipt,
  Share2,
  MessageSquare,
  Search,
  Filter,
  Mic,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { CollectionPlanItem, ReminderStyle } from '../types';

interface DashboardViewProps {
  onOpenAddDebt: () => void;
  onOpenRecordPayment: (debtId?: string) => void;
  onOpenGetMePaid: () => void;
  onOpenReminder: (customerId: string, debtId: string, style?: ReminderStyle) => void;
  onOpenCustomerLedger: (customerId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddDebt,
  onOpenRecordPayment,
  onOpenGetMePaid,
  onOpenReminder,
  onOpenCustomerLedger,
  onNavigateTab,
}) => {
  const { debts, payments, customers, summary, collectionPlan, formatMoney, user } = useDebt();

  // Natural language quick input on dashboard
  const [quickText, setQuickText] = useState('');

  const activeDebts = debts.filter((d) => d.status !== 'paid');
  const overdueDebts = debts.filter(
    (d) =>
      d.status !== 'paid' &&
      new Date(d.dueDate) < new Date(new Date().toISOString().split('T')[0])
  );

  // Top 4 actionable collection plan items
  const priorityActionItems = collectionPlan.slice(0, 4);

  // Recent 5 payments
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner: Greeting & "Get Me Paid" Signature Action */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/40 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Credit & Collection Assistant</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {user.businessProfile.businessName || user.name || 'Fortunal DebtManager'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Know who owes you, know exactly when it's due, and get paid faster with 1-click WhatsApp reminders and instant digital receipts.
            </p>
          </div>

          {/* Large "Get Me Paid" Action Card */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <button
              id="dashboard-get-me-paid-hero-btn"
              onClick={onOpenGetMePaid}
              className="group relative flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-6 py-4 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-5 h-5 text-slate-950 group-hover:animate-bounce" />
              <div className="text-left">
                <span className="block leading-none uppercase tracking-wide">Get Me Paid</span>
                <span className="text-[10px] font-semibold text-slate-800">
                  {collectionPlan.length} debtors need follow-up
                </span>
              </div>
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </button>

            <div className="flex items-center gap-2">
              <button
                id="dashboard-add-debt-quick-btn"
                onClick={onOpenAddDebt}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>+ Give Credit</span>
              </button>
              <button
                id="dashboard-record-payment-quick-btn"
                onClick={() => onOpenRecordPayment()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95"
              >
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>+ Record Pay</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Key Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Owed */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 md:p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Owed To You</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-white tracking-tight">
            {formatMoney(summary.totalOutstanding)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Across <strong className="text-slate-300">{summary.debtorCount}</strong> customers
          </p>
        </div>

        {/* Total Overdue */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 md:p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Total Overdue
            </span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-rose-400 tracking-tight">
            {formatMoney(summary.totalOverdue)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            <strong className="text-rose-400">{summary.overdueCount}</strong> overdue balances
          </p>
        </div>

        {/* Due This Week */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 md:p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Due Next 7 Days
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-amber-300 tracking-tight">
            {formatMoney(summary.dueThisWeek)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Expected this week</p>
        </div>

        {/* Collected This Month */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 md:p-5 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Collected This Month
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-emerald-400 tracking-tight">
            {formatMoney(summary.collectedThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            <strong className="text-emerald-300">{summary.paidDebtsCount}</strong> cleared accounts
          </p>
        </div>
      </div>

      {/* Priority Collection Action Queue */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Priority Collection Actions for Today</span>
            </h2>
            <p className="text-xs text-slate-400">
              People who owe you money ranked by urgency and recovery speed
            </p>
          </div>
          <button
            onClick={onOpenGetMePaid}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All ({collectionPlan.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {priorityActionItems.length === 0 ? (
          <div className="rounded-xl bg-slate-850/50 border border-slate-800/80 p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
            <p className="text-sm font-bold text-white">Zero Overdue Debts Right Now!</p>
            <p className="text-xs max-w-sm mx-auto">
              You are completely up to date. You can add new credit sales or relax.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {priorityActionItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-slate-850/70 border border-slate-800 p-4 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      onClick={() => onOpenCustomerLedger(item.customerId)}
                      className="text-sm font-bold text-white hover:text-emerald-400 text-left transition"
                    >
                      {item.customerName}
                    </button>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.debtDescription} • Due: {item.dueDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white block">
                      {formatMoney(item.amountOutstanding, item.currency)}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        item.priority === 'high'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.daysOverdue > 0 ? `${item.daysOverdue}d late` : 'Due today'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-1 italic bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/50">
                  💡 {item.explanation}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => onOpenReminder(item.customerId, item.debtId, item.suggestedStyle)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 py-2 text-xs font-bold text-emerald-300 transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp Reminder</span>
                  </button>

                  <button
                    onClick={() => onOpenRecordPayment(item.debtId)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-slate-200 transition"
                  >
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Record Pay</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Split Grid: Active Debts & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Debts Overview */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Active Debts & Credit-Sales</span>
            </h3>
            <button
              onClick={() => onNavigateTab('debts')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300"
            >
              All Debts ({debts.length})
            </button>
          </div>

          <div className="space-y-2">
            {activeDebts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No active debts right now.</p>
            ) : (
              activeDebts.slice(0, 5).map((debt) => {
                const customer = customers.find((c) => c.id === debt.customerId);
                const isOverdue = new Date(debt.dueDate) < new Date(new Date().toISOString().split('T')[0]);

                return (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between rounded-xl bg-slate-850/60 border border-slate-800/80 p-3 hover:border-slate-700 transition"
                  >
                    <div className="space-y-0.5">
                      <button
                        onClick={() => customer && onOpenCustomerLedger(customer.id)}
                        className="text-xs font-bold text-white hover:text-emerald-400 text-left"
                      >
                        {customer?.name || 'Customer'}
                      </button>
                      <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {debt.description}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Due: {debt.dueDate} •{' '}
                        <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {isOverdue ? 'Overdue' : 'On track'}
                        </span>
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-xs font-black text-white block">
                        {formatMoney(debt.currentBalance, debt.currency)}
                      </span>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => customer && onOpenReminder(customer.id, debt.id)}
                          className="rounded-md bg-slate-800 p-1 text-slate-400 hover:text-emerald-400"
                          title="WhatsApp Reminder"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenRecordPayment(debt.id)}
                          className="rounded-md bg-emerald-600/20 p-1 text-emerald-400 hover:bg-emerald-600/40"
                          title="Record Payment"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Payments Received */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Recent Payments Received</span>
            </h3>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              All Payments ({payments.length})
            </button>
          </div>

          <div className="space-y-2">
            {recentPayments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No payments recorded yet.</p>
            ) : (
              recentPayments.map((payment) => {
                const customer = customers.find((c) => c.id === payment.customerId);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl bg-slate-850/60 border border-slate-800/80 p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{customer?.name || 'Customer'}</p>
                      <p className="text-[11px] text-slate-400">
                        {payment.date} • {payment.paymentMethod}
                        {payment.referenceNumber && ` • Ref: ${payment.referenceNumber}`}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500">
                        Receipt #{payment.receiptNumber}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 block">
                        + {formatMoney(payment.amount)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Remaining: {formatMoney(payment.remainingBalance)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  BellRing,
  Search,
  Share2,
  Calendar,
  CheckCircle2,
  CheckCheck,
  Copy,
  Clock,
  MessageSquare,
  Smartphone,
  Send,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { ReminderRecord, ReminderStyle, ReminderStatus } from '../types';

interface RemindersHistoryViewProps {
  onOpenReminder: (customerId: string, debtId: string, style?: ReminderStyle) => void;
  onOpenCustomerLedger: (customerId: string) => void;
}

export const RemindersHistoryView: React.FC<RemindersHistoryViewProps> = ({
  onOpenReminder,
  onOpenCustomerLedger,
}) => {
  const { reminderHistory, customers, debts, updateReminderStatus } = useDebt();

  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const getStatusBadge = (status: ReminderStatus) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return {
          label: 'Delivered',
          classes: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
        };
      case 'shared_whatsapp':
        return {
          label: 'Opened in WhatsApp (Draft)',
          classes: 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
        };
      case 'sent_sms':
        return {
          label: 'Opened in SMS (Draft)',
          classes: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
        };
      case 'prepared':
      case 'draft':
        return {
          label: 'Prepared Draft',
          classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        };
      case 'copied':
        return {
          label: 'Copied to Clipboard',
          classes: 'bg-slate-800 text-slate-300 border border-slate-700',
        };
      default:
        return {
          label: status,
          classes: 'bg-slate-800 text-slate-400 border border-slate-700',
        };
    }
  };

  const filtered = reminderHistory.filter((r) => {
    const customer = customers.find((c) => c.id === r.customerId);
    const q = searchQuery.toLowerCase();
    const matchName = customer?.name.toLowerCase().includes(q) || false;
    const matchMsg = r.messageText.toLowerCase().includes(q);

    if (searchQuery && !matchName && !matchMsg) return false;
    if (channelFilter !== 'all' && r.channel !== channelFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white">Reminder Logs & Follow-ups</h1>
        <p className="text-xs text-slate-400">
          History of all WhatsApp, SMS, and custom collection notices sent to customers
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reminders by customer or message text..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'whatsapp', 'sms', 'copy'].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition uppercase text-[10px] ${
                channelFilter === ch
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {ch === 'all' ? 'All Channels' : ch}
            </button>
          ))}
        </div>
      </div>

      {/* Reminder List */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <BellRing className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-white">No reminders sent yet</p>
            <p className="text-xs">
              When you send WhatsApp messages or SMS follow-ups, they will be logged here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {sorted.map((r) => {
              const customer = customers.find((c) => c.id === r.customerId);
              const debt = debts.find((d) => d.id === r.debtId);

              return (
                <div
                  key={r.id}
                  className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-850/40 transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                        r.channel === 'whatsapp'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : r.channel === 'sms'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {r.channel === 'whatsapp' ? (
                        <Share2 className="w-5 h-5" />
                      ) : r.channel === 'sms' ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => customer && onOpenCustomerLedger(customer.id)}
                          className="text-sm font-bold text-white hover:text-emerald-400 text-left transition"
                        >
                          {customer?.name || 'Customer'}
                        </button>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase">
                          {r.messageType} tone
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-300 uppercase">
                          {r.channel}
                        </span>
                        {(() => {
                          const badge = getStatusBadge(r.status);
                          return (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badge.classes}`}
                            >
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 italic whitespace-pre-wrap">
                        "{r.messageText}"
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Date: {r.date} • Logged on {r.channel.toUpperCase()}
                        {debt && ` • Debt: ${debt.description}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {r.status !== 'delivered' && (
                        <button
                          onClick={() => updateReminderStatus(r.id, 'delivered')}
                          className="flex items-center gap-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition"
                          title="Mark reminder as delivered"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mark Delivered</span>
                        </button>
                      )}

                      {customer && debt && (
                        <button
                          onClick={() => onOpenReminder(customer.id, debt.id, r.messageType)}
                          className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                        >
                          <Send className="w-3 h-3 text-emerald-400" />
                          <span>Send Again</span>
                        </button>
                      )}
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

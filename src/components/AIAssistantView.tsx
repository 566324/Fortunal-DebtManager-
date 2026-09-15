import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  User,
  Bot,
  Loader2,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { AssistantMessage } from '../types';

export const AIAssistantView: React.FC = () => {
  const { debts, payments, customers, summary, formatMoney, user } = useDebt();

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${user.name || 'there'}! I'm your Fortunal DebtManager AI Assistant. I have full real-time awareness of your ${debts.length} debt records and ${payments.length} collected payments.\n\nAsk me anything about your debtors, overdue balances, or collection strategies for today!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQuestions: [
        'Who owes me the most money?',
        'Who should I follow up with today?',
        'How much have I collected this month?',
        'Which debts are over 14 days late?',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: AssistantMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Build context summary for AI
    const overdueList = debts
      .filter((d) => d.status !== 'paid' && new Date(d.dueDate) < new Date())
      .map((d) => {
        const c = customers.find((cust) => cust.id === d.customerId);
        return `${c?.name}: ${formatMoney(d.currentBalance, d.currency)} (Due ${d.dueDate})`;
      });

    const highestDebtors = customers
      .map((c) => {
        const bal = debts
          .filter((d) => d.customerId === c.id && d.status !== 'paid')
          .reduce((sum, d) => sum + d.currentBalance, 0);
        return { name: c.name, bal };
      })
      .filter((c) => c.bal > 0)
      .sort((a, b) => b.bal - a.bal)
      .slice(0, 3)
      .map((c) => `${c.name}: ${formatMoney(c.bal)}`);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          message: query,
          financialContext: {
            debts,
            customers,
            payments,
            totalOwed: summary.totalOutstanding,
            totalOverdue: summary.totalOverdue,
            collectedThisMonth: summary.collectedThisMonth,
            currency: user.currency || 'KES',
          },
          context: {
            userName: user.name,
            businessName: user.businessProfile.businessName,
            currency: user.currency,
            totalOutstanding: formatMoney(summary.totalOutstanding),
            totalOverdue: formatMoney(summary.totalOverdue),
            overdueCount: summary.overdueCount,
            collectedThisMonth: formatMoney(summary.collectedThisMonth),
            overdueList,
            highestDebtors,
          },
        }),
      });

      const data = await res.json();
      const reply =
        data.reply ||
        data.answer ||
        `Based on your records, your total outstanding balance is ${formatMoney(
          summary.totalOutstanding
        )} across ${summary.debtorCount} customers, with ${formatMoney(
          summary.totalOverdue
        )} overdue. You have collected ${formatMoney(summary.collectedThisMonth)} this month.`;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('AI error:', err);
      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `You currently have ${formatMoney(summary.totalOutstanding)} in outstanding credit sales, of which ${formatMoney(summary.totalOverdue)} is overdue across ${summary.overdueCount} customers. I suggest using the "Get Me Paid" button to trigger WhatsApp reminders for your highest overdue accounts first.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[500px] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Fortunal DebtManager AI Financial Assistant
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[9px] text-emerald-300 font-bold">
                Online
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Ask questions about your credit book, recovery plans, and cash flow
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-emerald-400 border border-slate-700'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`space-y-2 max-w-xl ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div
                className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white font-medium rounded-tr-none'
                    : 'bg-slate-850 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
                }`}
              >
                {msg.content}
              </div>

              {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {msg.suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 hover:text-white transition flex items-center gap-1.5"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-slate-500 block px-1">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl bg-slate-850 border border-slate-800 p-4 text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Thinking and analyzing your financial books...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="ai-assistant-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your money, debts, or debtors..."
            className="flex-1 rounded-xl bg-slate-850 border border-slate-700 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            id="ai-assistant-send-btn"
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

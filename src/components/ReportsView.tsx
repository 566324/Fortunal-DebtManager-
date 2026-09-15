import React, { useState } from 'react';
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Calendar,
  Download,
  Printer,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  Loader2,
  Building2,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { generateReportPDF } from '../utils/pdfGenerator';

export const ReportsView: React.FC = () => {
  const { debts, payments, customers, summary, formatMoney, user } = useDebt();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


  // Debt Aging calculation
  const today = new Date().toISOString().split('T')[0];
  const aging = {
    current: 0,
    days1_7: 0,
    days8_14: 0,
    days15_30: 0,
    days30Plus: 0,
  };

  debts.forEach((debt) => {
    if (debt.status === 'paid') return;
    const diffDays = Math.floor(
      (new Date(today).getTime() - new Date(debt.dueDate).getTime()) / 86400000
    );

    if (diffDays <= 0) {
      aging.current += debt.currentBalance;
    } else if (diffDays <= 7) {
      aging.days1_7 += debt.currentBalance;
    } else if (diffDays <= 14) {
      aging.days8_14 += debt.currentBalance;
    } else if (diffDays <= 30) {
      aging.days15_30 += debt.currentBalance;
    } else {
      aging.days30Plus += debt.currentBalance;
    }
  });

  const totalOutstanding = summary.totalOutstanding || 1;

  // Payment method breakdown
  const methodCounts: Record<string, number> = {};
  payments.forEach((p) => {
    methodCounts[p.paymentMethod] = (methodCounts[p.paymentMethod] || 0) + p.amount;
  });

  // Top Debtors
  const customerDebts = customers.map((c) => {
    const balance = debts
      .filter((d) => d.customerId === c.id && d.status !== 'paid')
      .reduce((sum, d) => sum + d.currentBalance, 0);
    return { name: c.name, phone: c.phone, balance };
  });

  const topDebtors = customerDebts
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const handleExportCSV = () => {
    const headers = ['Customer', 'Phone', 'Description', 'Original Amount', 'Current Balance', 'Due Date', 'Status'];
    const rows = debts.map((d) => {
      const c = customers.find((cust) => cust.id === d.customerId);
      return [
        `"${c?.name || 'Customer'}"`,
        `"${c?.phone || ''}"`,
        `"${d.description.replace(/"/g, '""')}"`,
        d.originalAmount,
        d.currentBalance,
        d.dueDate,
        d.status,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fortunal_DebtManager_Export_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      setIsGeneratingPdf(true);
      generateReportPDF(debts, payments, customers, summary, user);
    } catch (err) {
      console.error('Failed to generate report PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Financial Health & Reports</h1>
          <p className="text-xs text-slate-400">
            Overview of collections, debt aging, and payment channels
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            id="report-pdf-btn"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 transition active:scale-95 disabled:opacity-50"
            title="Download PDF Financial Report"
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
          <button
            id="report-print-btn"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Screen Interactive Dashboard */}
      <div className="space-y-6 print:hidden">

      {/* Top 3 High Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Lifetime Sales Lent</span>
          <p className="text-xl font-black text-white mt-1">
            {formatMoney(debts.reduce((sum, d) => sum + d.originalAmount, 0))}
          </p>
          <span className="text-[10px] text-slate-500">{debts.length} total debt records</span>
        </div>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Recovered / Paid</span>
          <p className="text-xl font-black text-emerald-400 mt-1">
            {formatMoney(payments.reduce((sum, p) => sum + p.amount, 0))}
          </p>
          <span className="text-[10px] text-emerald-400/80 font-semibold">
            {Math.round(
              (payments.reduce((sum, p) => sum + p.amount, 0) /
                (debts.reduce((sum, d) => sum + d.originalAmount, 0) || 1)) *
                100
            )}
            % recovery rate
          </span>
        </div>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Outstanding at Risk</span>
          <p className="text-xl font-black text-rose-400 mt-1">
            {formatMoney(summary.totalOverdue)}
          </p>
          <span className="text-[10px] text-rose-400/80 font-semibold">
            {summary.overdueCount} overdue items
          </span>
        </div>
      </div>

      {/* Debt Aging Analysis */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Debt Aging Schedule</span>
            </h2>
            <p className="text-xs text-slate-400">
              Categorizes your unpaid money by how long it has been overdue
            </p>
          </div>
          <span className="text-xs font-black text-white">
            Total Owed: {formatMoney(summary.totalOutstanding)}
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {[
            { label: 'Current (Not yet due)', amount: aging.current, color: 'bg-emerald-500' },
            { label: '1 - 7 Days Overdue', amount: aging.days1_7, color: 'bg-amber-400' },
            { label: '8 - 14 Days Overdue', amount: aging.days8_14, color: 'bg-amber-600' },
            { label: '15 - 30 Days Overdue', amount: aging.days15_30, color: 'bg-rose-500' },
            { label: '30+ Days Overdue (High Risk)', amount: aging.days30Plus, color: 'bg-rose-700' },
          ].map((bucket, idx) => {
            const percentage = Math.round((bucket.amount / totalOutstanding) * 100) || 0;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">{bucket.label}</span>
                  <div className="text-right">
                    <span className="font-bold text-white mr-2">{formatMoney(bucket.amount)}</span>
                    <span className="text-slate-500 font-mono text-[10px]">({percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${bucket.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Payment Method Breakdown & Top Debtors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Channels */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <span>Collections by Channel</span>
          </h2>

          <div className="space-y-3">
            {Object.keys(methodCounts).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No payment data yet.</p>
            ) : (
              Object.entries(methodCounts).map(([method, amount]) => {
                const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) || 1;
                const pct = Math.round((amount / totalPaid) * 100);

                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">{method}</span>
                      <span className="font-bold text-emerald-400">{formatMoney(amount)} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top 5 Debtors Leaderboard */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            <span>Highest Outstanding Balances</span>
          </h2>

          <div className="space-y-2.5">
            {topDebtors.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Zero outstanding balances.</p>
            ) : (
              topDebtors.map((debtor, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-slate-850 p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 font-black text-[10px] text-slate-400">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">{debtor.name}</p>
                      <p className="text-[10px] text-slate-500">{debtor.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <span className="font-black text-rose-400 text-sm">
                    {formatMoney(debtor.balance)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Clean Printable Financial Report (Rendered ONLY when printing) */}
      <div className="hidden print:block printable-document p-6 text-slate-900 bg-white">
        <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">
              {user.businessProfile.businessName || user.name || 'Fortunal DebtManager Merchant'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">{user.businessProfile.location || 'Kenya'}</p>
            {user.phone && <p className="text-xs text-slate-600">Tel: {user.phone}</p>}
            <div className="mt-2 inline-block rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-900 border border-slate-300">
              EXECUTIVE FINANCIAL HEALTH & COLLECTIONS REPORT
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-slate-900">Generated: {today}</p>
            <p className="text-slate-600">Active Debtors: {summary.activeDebtors}</p>
          </div>
        </div>

        {/* KPI Summary Matrix */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="border border-slate-200 bg-slate-50 p-2.5 rounded">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Lifetime Credit Lent</span>
            <span className="text-sm font-black text-slate-900">
              {formatMoney(debts.reduce((sum, d) => sum + d.originalAmount, 0))}
            </span>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-2.5 rounded">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Recovered Cash</span>
            <span className="text-sm font-black text-emerald-800">
              {formatMoney(payments.reduce((sum, p) => sum + p.amount, 0))}
            </span>
          </div>
          <div className="border border-slate-200 bg-slate-50 p-2.5 rounded">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Outstanding Portfolio Balance</span>
            <span className="text-sm font-black text-rose-800">
              {formatMoney(summary.totalOutstanding)}
            </span>
          </div>
        </div>

        {/* Debt Aging Analysis Table */}
        <div className="mb-5">
          <h3 className="text-xs font-bold uppercase text-slate-900 mb-1 border-b pb-1">
            1. Portfolio Aging Breakdown
          </h3>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-1.5 text-left border-b">Aging Bracket</th>
                <th className="p-1.5 text-right border-b">Amount Due</th>
                <th className="p-1.5 text-right border-b">% of Portfolio</th>
                <th className="p-1.5 text-center border-b">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="p-1.5 font-medium">Current / Not Due</td>
                <td className="p-1.5 text-right">{formatMoney(aging.current)}</td>
                <td className="p-1.5 text-right">{Math.round((aging.current / totalOutstanding) * 100)}%</td>
                <td className="p-1.5 text-center text-[10px] font-bold text-emerald-700">LOW</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-1.5 font-medium">1 - 7 Days Overdue</td>
                <td className="p-1.5 text-right">{formatMoney(aging.days1_7)}</td>
                <td className="p-1.5 text-right">{Math.round((aging.days1_7 / totalOutstanding) * 100)}%</td>
                <td className="p-1.5 text-center text-[10px] font-bold text-amber-700">WATCH</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-1.5 font-medium">8 - 14 Days Overdue</td>
                <td className="p-1.5 text-right">{formatMoney(aging.days8_14)}</td>
                <td className="p-1.5 text-right">{Math.round((aging.days8_14 / totalOutstanding) * 100)}%</td>
                <td className="p-1.5 text-center text-[10px] font-bold text-amber-800">ELEVATED</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-1.5 font-medium">15 - 30 Days Overdue</td>
                <td className="p-1.5 text-right">{formatMoney(aging.days15_30)}</td>
                <td className="p-1.5 text-right">{Math.round((aging.days15_30 / totalOutstanding) * 100)}%</td>
                <td className="p-1.5 text-center text-[10px] font-bold text-rose-700">HIGH</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-1.5 font-medium">30+ Days Overdue (Delinquent)</td>
                <td className="p-1.5 text-right font-bold text-rose-800">{formatMoney(aging.days30Plus)}</td>
                <td className="p-1.5 text-right">{Math.round((aging.days30Plus / totalOutstanding) * 100)}%</td>
                <td className="p-1.5 text-center text-[10px] font-black text-rose-900">CRITICAL</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Highest Outstanding Debtor Accounts */}
        <div className="mb-5">
          <h3 className="text-xs font-bold uppercase text-slate-900 mb-1 border-b pb-1">
            2. Highest Priority Debtor Accounts
          </h3>
          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-1.5 text-left border-b">#</th>
                <th className="p-1.5 text-left border-b">Customer Name</th>
                <th className="p-1.5 text-left border-b">Phone</th>
                <th className="p-1.5 text-right border-b">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              {topDebtors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-2 text-center text-slate-500">No active balances.</td>
                </tr>
              ) : (
                topDebtors.map((c, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="p-1.5">{i + 1}</td>
                    <td className="p-1.5 font-bold">{c.name}</td>
                    <td className="p-1.5 text-slate-600">{c.phone || '-'}</td>
                    <td className="p-1.5 text-right font-black text-rose-800">{formatMoney(c.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-300 pt-3 text-[10px] text-slate-500 text-center">
          <p className="font-bold text-slate-700">Fortunal DebtManager Official Record • Confidential Business Report</p>
        </div>
      </div>
    </div>
  );
};

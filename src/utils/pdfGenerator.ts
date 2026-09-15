import { jsPDF } from 'jspdf';
import { Customer, Debt, Payment, UserProfile } from '../types';

/**
 * Format currency strictly without trailing zeros or mistakes:
 * e.g., KSh 50,000 (NOT KSh 50,0000)
 */
function formatCurrency(amount: number, currency: string = 'KES'): string {
  const symbol = currency === 'KES' ? 'KSh' : currency;
  const num = Math.round((Number(amount) || 0) * 100) / 100;
  return `${symbol} ${num.toLocaleString()}`;
}

/**
 * Generates and downloads a clean, vector-based PDF Receipt.
 */
export async function generateReceiptPDF(
  payment: Payment,
  debt: Debt | undefined,
  customer: Customer | undefined,
  user: UserProfile
): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = debt?.currency || user.currency || 'KES';
  const businessName = user.businessProfile.businessName || user.name || 'Fortunal DebtManager Merchant';
  const businessPhone = user.phone || user.businessProfile.phone || '';
  const businessLocation = user.businessProfile.location || 'Kenya';

  // --- Header ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(businessName.toUpperCase(), 15, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const subText = [businessLocation, businessPhone ? `Tel: ${businessPhone}` : ''].filter(Boolean).join(' • ');
  doc.text(subText, 15, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text('OFFICIAL PAYMENT RECEIPT', 15, 28);

  // Receipt Number & Date Box (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`Receipt #: ${payment.receiptNumber}`, 195, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Date: ${payment.date}`, 195, 21, { align: 'right' });
  doc.text(`Recorded By: ${payment.recordedBy}`, 195, 28, { align: 'right' });

  // --- Customer & Transaction Info Card ---
  let y = 48;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, y, 180, 42, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('CUSTOMER & TRANSACTION DETAILS', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Customer Name:', 20, y + 16);
  doc.text('Customer Phone:', 20, y + 23);
  doc.text('Item / Service:', 20, y + 30);
  doc.text('Payment Method:', 20, y + 37);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(customer?.name || 'Valued Customer', 65, y + 16);
  doc.text(customer?.phone || 'N/A', 65, y + 23);
  doc.text(debt?.description || 'Credit Account Settlement', 65, y + 30);
  doc.text(payment.paymentMethod, 65, y + 37);

  if (payment.referenceNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Payment Reference:', 125, y + 37);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(payment.referenceNumber, 160, y + 37);
  }

  // --- Amount Received Highlight Box ---
  y += 50;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.8);
  doc.roundedRect(15, y, 180, 28, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('AMOUNT RECEIVED', 105, y + 9, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(4, 120, 87);
  doc.text(formatCurrency(payment.amount, currency), 105, y + 20, { align: 'center' });

  // --- Financial Balances Summary ---
  y += 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(15, y, 180, 36, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Previous Outstanding Balance:', 22, y + 10);
  doc.text('Less Amount Paid:', 22, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(payment.previousBalance, currency), 185, y + 10, { align: 'right' });
  doc.setTextColor(5, 150, 105);
  doc.text(`- ${formatCurrency(payment.amount, currency)}`, 185, y + 18, { align: 'right' });

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.line(22, y + 22, 188, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('REMAINING BALANCE DUE:', 22, y + 30);

  if (payment.remainingBalance === 0) {
    doc.setTextColor(5, 150, 105);
    doc.text(`${formatCurrency(0, currency)} (CLEARED)`, 185, y + 30, { align: 'right' });
  } else {
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(formatCurrency(payment.remainingBalance, currency), 185, y + 30, { align: 'right' });
  }

  // --- Payment Instructions (if any configured) ---
  y += 44;
  const paybill = user.paymentDetails?.mpesaPaybill;
  const till = user.paymentDetails?.mpesaTill;
  const sendMoney = user.paymentDetails?.mpesaPhone;
  const bankDetails = user.paymentDetails?.bankDetails;

  const instructions: string[] = [];
  if (paybill) instructions.push(`M-Pesa Paybill: ${paybill} | Acc: ${customer?.name || 'Customer'}`);
  if (till) instructions.push(`M-Pesa Buy Goods / Till: ${till}`);
  if (sendMoney) instructions.push(`M-Pesa Send Money: ${sendMoney}`);
  if (bankDetails) instructions.push(`Bank: ${bankDetails}`);

  if (instructions.length > 0 && payment.remainingBalance > 0) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, y, 180, 22, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('HOW TO PAY REMAINING BALANCE:', 20, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(instructions.join('   •   '), 20, y + 14);
    y += 28;
  }

  // --- Verification Footer ---
  y = Math.max(y + 6, 250);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('FORTUNAL DEBTMANAGER — OFFICIAL RECORD', 105, y + 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Know who owes. Know when. Get paid. • Generated with cryptographic audit trail', 105, y + 13, { align: 'center' });

  const fileName = `Fortunal-Receipt-${payment.receiptNumber}.pdf`;
  doc.save(fileName);
  return fileName;
}

/**
 * Generates and downloads a clean, comprehensive PDF Account Statement for a customer.
 */
export async function generateStatementPDF(
  customer: Customer,
  debts: Debt[],
  payments: Payment[],
  user: UserProfile
): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = user.currency || 'KES';
  const businessName = user.businessProfile.businessName || user.name || 'Fortunal DebtManager Merchant';
  const businessPhone = user.phone || user.businessProfile.phone || '';
  const businessLocation = user.businessProfile.location || 'Kenya';
  const statementDate = new Date().toISOString().split('T')[0];

  const custDebts = debts.filter((d) => d.customerId === customer.id);
  const custPayments = payments.filter((p) => p.customerId === customer.id);

  const totalBorrowed = custDebts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalPaid = custPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = Math.max(0, totalBorrowed - totalPaid);

  // --- Header ---
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(businessName.toUpperCase(), 15, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const subText = [businessLocation, businessPhone ? `Tel: ${businessPhone}` : ''].filter(Boolean).join(' • ');
  doc.text(subText, 15, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text('STATEMENT OF ACCOUNT', 15, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Statement Date: ${statementDate}`, 195, 20, { align: 'right' });
  doc.text(`Account ID: ${customer.id}`, 195, 27, { align: 'right' });

  // --- Customer Info & Financial Summary ---
  let y = 46;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 180, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Customer: ${customer.name}`, 20, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${customer.phone || 'N/A'}`, 20, y + 17);
  if (customer.category) {
    doc.text(`Category: ${customer.category}`, 20, y + 23);
  }

  // Summary Metrics (Right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Credit Taken:', 120, y + 9);
  doc.text('Total Paid to Date:', 120, y + 15);
  doc.text('CURRENT BALANCE DUE:', 120, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalBorrowed, currency), 185, y + 9, { align: 'right' });
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(totalPaid, currency), 185, y + 15, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(totalOutstanding > 0 ? 225 : 5, totalOutstanding > 0 ? 29 : 150, totalOutstanding > 0 ? 72 : 105);
  doc.text(formatCurrency(totalOutstanding, currency), 185, y + 22, { align: 'right' });

  // --- Table: Credit & Debt Invoices ---
  y += 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`1. ORIGINAL DEBTS & CREDIT SALES (${custDebts.length})`, 15, y);

  y += 4;
  // Header row
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DATE', 18, y + 5);
  doc.text('DESCRIPTION', 42, y + 5);
  doc.text('DUE DATE', 115, y + 5);
  doc.text('ORIGINAL', 148, y + 5, { align: 'right' });
  doc.text('BALANCE', 178, y + 5, { align: 'right' });
  doc.text('STATUS', 185, y + 5);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (custDebts.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text('No debts recorded for this account.', 18, y + 6);
    y += 10;
  } else {
    custDebts.forEach((d) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(15, 23, 42);
      doc.text(d.date || '-', 18, y + 5);
      const desc = d.description.length > 38 ? d.description.slice(0, 38) + '...' : d.description;
      doc.text(desc, 42, y + 5);
      doc.text(d.dueDate || '-', 115, y + 5);
      doc.text(formatCurrency(d.originalAmount, d.currency || currency), 148, y + 5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      if (d.currentBalance > 0) {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(5, 150, 105);
      }
      doc.text(formatCurrency(d.currentBalance, d.currency || currency), 178, y + 5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(d.status.toUpperCase(), 185, y + 5);
      doc.setFontSize(8);

      y += 6.5;
    });
  }

  // --- Table: Payments Received ---
  y += 6;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. ACTUAL PAYMENTS RECEIVED (${custPayments.length})`, 15, y);

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DATE', 18, y + 5);
  doc.text('RECEIPT #', 42, y + 5);
  doc.text('METHOD', 80, y + 5);
  doc.text('REFERENCE', 115, y + 5);
  doc.text('AMOUNT RECEIVED', 185, y + 5, { align: 'right' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (custPayments.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text('No payment records logged yet.', 18, y + 6);
    y += 10;
  } else {
    custPayments.forEach((p) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(15, 23, 42);
      doc.text(p.date || '-', 18, y + 5);
      doc.text(p.receiptNumber || '-', 42, y + 5);
      doc.text(p.paymentMethod || 'Cash', 80, y + 5);
      doc.text(p.referenceNumber || '-', 115, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(formatCurrency(p.amount, currency), 185, y + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      y += 6.5;
    });
  }

  // --- Final Account Standing ---
  y += 8;
  if (y > 255) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, y, 180, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL OUTSTANDING BALANCE DUE:', 20, y + 11);

  doc.setFontSize(13);
  if (totalOutstanding === 0) {
    doc.setTextColor(5, 150, 105);
    doc.text(`${formatCurrency(0, currency)} (ALL DEBTS SETTLED)`, 185, y + 12, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text(formatCurrency(totalOutstanding, currency), 185, y + 12, { align: 'right' });
  }

  // Footer
  y = Math.max(y + 24, 275);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Fortunal DebtManager Official Financial Statement • Validated from audit-protected transaction ledger', 105, y + 6, { align: 'center' });

  const safeCustomerName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Fortunal-Statement-${safeCustomerName}.pdf`;
  doc.save(fileName);
  return fileName;
}

/**
 * Generates and downloads a clean, comprehensive PDF Report for Financial Health & Collections.
 */
export async function generateReportPDF(
  debts: Debt[],
  payments: Payment[],
  customers: Customer[],
  summary: any,
  user: UserProfile
): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = user.currency || 'KES';
  const businessName = user.businessProfile.businessName || user.name || 'Fortunal DebtManager Business';
  const today = new Date().toISOString().split('T')[0];

  const totalLifetimeLent = debts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalLifetimePaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = summary.totalOutstanding || 0;
  const totalOverdue = summary.totalOverdue || 0;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(businessName.toUpperCase(), 15, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('FINANCIAL HEALTH & DEBT PORTFOLIO REPORT', 15, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(`Generated: ${today}`, 195, 21, { align: 'right' });

  // Key KPI Cards
  let y = 46;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 56, 24, 2, 2, 'FD');
  doc.roundedRect(77, y, 56, 24, 2, 2, 'FD');
  doc.roundedRect(139, y, 56, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CREDIT LENT', 18, y + 6);
  doc.text('TOTAL RECOVERED / PAID', 80, y + 6);
  doc.text('CURRENT OUTSTANDING', 142, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalLifetimeLent, currency), 18, y + 16);
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(totalLifetimePaid, currency), 80, y + 16);
  doc.setTextColor(225, 29, 72);
  doc.text(formatCurrency(totalOutstanding, currency), 142, y + 16);

  // Aging Analysis Table
  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('DEBT AGING & RISK BREAKDOWN', 15, y);

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CATEGORY', 18, y + 5);
  doc.text('DESCRIPTION', 60, y + 5);
  doc.text('AMOUNT', 185, y + 5, { align: 'right' });

  // Calculate aging
  let currentAmount = 0;
  let overdue1to7 = 0;
  let overdue8to14 = 0;
  let overdue15to30 = 0;
  let overdue30Plus = 0;

  debts.forEach((debt) => {
    if (debt.status === 'paid') return;
    const diffDays = Math.floor((new Date(today).getTime() - new Date(debt.dueDate).getTime()) / 86400000);
    if (diffDays <= 0) currentAmount += debt.currentBalance;
    else if (diffDays <= 7) overdue1to7 += debt.currentBalance;
    else if (diffDays <= 14) overdue8to14 += debt.currentBalance;
    else if (diffDays <= 30) overdue15to30 += debt.currentBalance;
    else overdue30Plus += debt.currentBalance;
  });

  const agingRows = [
    { cat: 'Current (Not due yet)', desc: 'Healthy credit within agreed terms', amount: currentAmount, color: [5, 150, 105] },
    { cat: '1 - 7 Days Overdue', desc: 'Recent grace period expiry; send friendly reminder', amount: overdue1to7, color: [217, 119, 6] },
    { cat: '8 - 14 Days Overdue', desc: 'Moderate risk; call or follow up firmly', amount: overdue8to14, color: [234, 88, 12] },
    { cat: '15 - 30 Days Overdue', desc: 'High risk; require settlement plan', amount: overdue15to30, color: [225, 29, 72] },
    { cat: '30+ Days Overdue', desc: 'Critical non-performing debt; escalate collection', amount: overdue30Plus, color: [159, 18, 57] },
  ];

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  agingRows.forEach((row) => {
    doc.setTextColor(15, 23, 42);
    doc.text(row.cat, 18, y + 5);
    doc.setTextColor(100, 116, 139);
    doc.text(row.desc, 60, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(row.color[0], row.color[1], row.color[2]);
    doc.text(formatCurrency(row.amount, currency), 185, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 6.5;
  });

  // Top Debtors Table
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOP CUSTOMERS WITH OUTSTANDING BALANCES', 15, y);

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CUSTOMER NAME', 18, y + 5);
  doc.text('PHONE', 75, y + 5);
  doc.text('ACTIVE DEBTS', 120, y + 5);
  doc.text('TOTAL BALANCE', 185, y + 5, { align: 'right' });

  const debtorBalances = customers.map((c) => {
    const cDebts = debts.filter((d) => d.customerId === c.id && d.status !== 'paid');
    const balance = cDebts.reduce((sum, d) => sum + d.currentBalance, 0);
    return { name: c.name, phone: c.phone || 'N/A', count: cDebts.length, balance };
  }).filter((d) => d.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 6);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (debtorBalances.length === 0) {
    doc.setTextColor(5, 150, 105);
    doc.text('All customers are completely settled!', 18, y + 5);
    y += 8;
  } else {
    debtorBalances.forEach((d) => {
      doc.setTextColor(15, 23, 42);
      doc.text(d.name, 18, y + 5);
      doc.setTextColor(100, 116, 139);
      doc.text(d.phone, 75, y + 5);
      doc.text(`${d.count} unpaid invoice${d.count > 1 ? 's' : ''}`, 120, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72);
      doc.text(formatCurrency(d.balance, currency), 185, y + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 6.5;
    });
  }

  // Footer
  y = Math.max(y + 12, 275);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Fortunal DebtManager • Financial Analytics Report • Confidential & Proprietary', 105, y + 6, { align: 'center' });

  const fileName = `Fortunal-Report-${today}.pdf`;
  doc.save(fileName);
  return fileName;
}

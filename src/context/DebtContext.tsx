import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AccountType,
  AuditLog,
  BusinessProfile,
  BusinessUseCase,
  CollectionPlanItem,
  CollectionPriority,
  Customer,
  Debt,
  DebtStatus,
  DebtSummary,
  Payment,
  PaymentMethod,
  ReminderRecord,
  ReminderStatus,
  ReminderStyle,
  UserProfile,
  DebtPaymentPlan,
  OfficialReceipt,
  ReceiptDeliveryLog,
  ReceiptDeliverySubscription,
  DeliveryStatus,
} from '../types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_DEBTS,
  INITIAL_PAYMENTS,
  INITIAL_REMINDERS,
  INITIAL_USER,
} from '../data/initialData';

interface RecordPaymentInput {
  debtId: string;
  customerId: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

interface AddDebtInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  amount: number;
  currency?: string;
  date: string;
  dueDate: string;
  description: string;
  paymentMethod?: PaymentMethod;
  category?: string;
  notes?: string;
  attachmentUrl?: string;
  isRecurring?: boolean;
}

export interface AddDebtWithPaymentInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  originalDebt: number;
  amountPaid: number;
  currency?: string;
  debtDate?: string;
  paymentDate?: string;
  dueDate?: string;
  description: string;
  paymentMethod?: PaymentMethod;
  category?: string;
  notes?: string;
  attachmentUrl?: string;
  isRecurring?: boolean;
}

interface DebtContextType {
  user: UserProfile;
  customers: Customer[];
  debts: Debt[];
  payments: Payment[];
  reminders: ReminderRecord[];
  receipts: OfficialReceipt[];
  receiptDeliveryLogs: ReceiptDeliveryLog[];
  auditLogs: AuditLog[];
  totalOwed: number;
  totalOverdue: number;
  totalDueThisWeek: number;
  collectedThisMonth: number;
  activeDebtsCount: number;
  collectionPlan: CollectionPlanItem[];
  summary: DebtSummary;
  reminderHistory: ReminderRecord[];
  // Actions
  updateUser: (data: Partial<UserProfile>) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  switchAccountType: (type: AccountType) => void;
  completeOnboarding: (data: {
    useCase: BusinessUseCase;
    preferredPaymentMethod: PaymentMethod;
    businessName?: string;
    accountType?: AccountType;
  }) => void;
  addCustomer: (data: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  archiveCustomer: (id: string) => void;
  unarchiveCustomer: (id: string) => void;
  permanentlyDeleteCustomer: (id: string) => void;
  addDebt: (data: AddDebtInput) => Debt;
  addDebtWithInitialPayment: (data: AddDebtWithPaymentInput) => { debt: Debt; payment?: Payment };
  updateDebt: (id: string, data: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  adjustDebtDueDate: (debtId: string, newDueDate: string) => void;
  updateDebtPaymentPlan: (debtId: string, plan: DebtPaymentPlan) => void;
  recordPayment: (data: RecordPaymentInput) => Payment;
  deletePayment: (id: string) => void;
  logReminder: (data: Omit<ReminderRecord, 'id' | 'userId' | 'createdAt'>) => ReminderRecord;
  logBatchReminders: (records: Array<Omit<ReminderRecord, 'id' | 'userId' | 'createdAt'>>) => ReminderRecord[];
  updateReminderStatus: (id: string, status: ReminderStatus) => void;
  updateReceiptDeliverySubscription: (sub: Partial<ReceiptDeliverySubscription>) => void;
  addReceiptCreditPack: (credits: number) => void;
  generateDuplicateReceipt: (paymentId: string) => OfficialReceipt | null;
  processAutomaticReceiptDelivery: (receipt: OfficialReceipt, channel?: 'whatsapp' | 'sms' | 'email') => Promise<{ success: boolean; status: DeliveryStatus; message: string }>;
  getCustomerLedger: (customerId: string) => {
    transactions: Array<{
      id: string;
      date: string;
      type: 'credit' | 'payment';
      amount: number;
      description: string;
      paymentMethod?: string;
      reference?: string;
      runningBalance: number;
    }>;
    totalBorrowed: number;
    totalPaid: number;
    currentBalance: number;
    paymentsCount: number;
    lastPaymentDate?: string;
  };
  resetToDemoData: () => void;
  clearAllData: () => void;
  formatMoney: (amount: number, customCurrency?: string) => string;
}

const DebtContext = createContext<DebtContextType | null>(null);

// Safe storage helper with quota management
const safeSaveItem = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error writing ${key} to localStorage:`, err);
    // If quota exceeded, try emergency cleanup
    try {
      if (key === 'dm_audit_v1') {
        const trimmed = Array.isArray(data) ? data.slice(0, 20) : [];
        localStorage.setItem(key, JSON.stringify(trimmed));
      } else if (key === 'dm_debts_v1' && Array.isArray(data)) {
        // Strip large base64 attachments if quota reached
        const trimmedDebts = data.map((d: any) => ({
          ...d,
          attachmentUrl: d.attachmentUrl && d.attachmentUrl.length > 50000 ? undefined : d.attachmentUrl,
        }));
        localStorage.setItem(key, JSON.stringify(trimmedDebts));
      }
    } catch {
      // ignore
    }
  }
};

export const DebtProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or initialize with seed data
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('dm_user_v1');
      return saved ? JSON.parse(saved) : INITIAL_USER;
    } catch {
      return INITIAL_USER;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('dm_customers_v1');
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    try {
      const saved = localStorage.getItem('dm_debts_v1');
      return saved ? JSON.parse(saved) : INITIAL_DEBTS;
    } catch {
      return INITIAL_DEBTS;
    }
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const saved = localStorage.getItem('dm_payments_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_PAYMENTS;
    } catch {
      return INITIAL_PAYMENTS;
    }
  });

  const [reminders, setReminders] = useState<ReminderRecord[]>(() => {
    try {
      const saved = localStorage.getItem('dm_reminders_v1');
      return saved ? JSON.parse(saved) : INITIAL_REMINDERS;
    } catch {
      return INITIAL_REMINDERS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('dm_audit_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [receipts, setReceipts] = useState<OfficialReceipt[]>(() => {
    try {
      const saved = localStorage.getItem('dm_receipts_v1');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  const [receiptDeliveryLogs, setReceiptDeliveryLogs] = useState<ReceiptDeliveryLog[]>(() => {
    try {
      const saved = localStorage.getItem('dm_receipt_delivery_logs_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Financial integrity check & automatic reconciliation:
  // If any debt has currentBalance < originalAmount, but payments list is missing a matching record
  // (e.g. David Kiprono with 25,000 original and 20,000 balance), automatically heal & persist the payment record!
  useEffect(() => {
    let paymentsNeedReconciliation = false;
    let reconciled = [...payments];

    debts.forEach((debt) => {
      if (debt.currentBalance < debt.originalAmount) {
        const expectedPaid = debt.originalAmount - debt.currentBalance;
        const recordedPaidForDebt = reconciled
          .filter((p) => p.debtId === debt.id)
          .reduce((sum, p) => sum + p.amount, 0);

        const unrecordedAmount = expectedPaid - recordedPaidForDebt;
        if (unrecordedAmount > 0.5) {
          const recPayment: Payment = {
            id: 'pay_rec_' + debt.id + '_' + Math.random().toString(36).substr(2, 6),
            userId: user.id || 'usr_default_01',
            debtId: debt.id,
            customerId: debt.customerId,
            amount: Math.round(unrecordedAmount * 100) / 100,
            date: (debt.updatedAt || debt.date || new Date().toISOString()).split('T')[0],
            paymentMethod: debt.paymentMethod || 'M-Pesa',
            receiptNumber: 'REC-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000),
            previousBalance: debt.originalAmount,
            remainingBalance: debt.currentBalance,
            recordedBy: user.name || 'Business Owner',
            notes: 'Reconciled payment transaction for ' + debt.description,
            createdAt: debt.updatedAt || new Date().toISOString(),
          };

          reconciled = [recPayment, ...reconciled];
          paymentsNeedReconciliation = true;
        }
      }
    });

    if (paymentsNeedReconciliation) {
      setPayments(reconciled);
      safeSaveItem('dm_payments_v1', reconciled);
    }
  }, [debts]);

  // Sync to localStorage as backup
  useEffect(() => {
    safeSaveItem('dm_user_v1', user);
    safeSaveItem('dm_customers_v1', customers);
    safeSaveItem('dm_debts_v1', debts);
    safeSaveItem('dm_payments_v1', payments);
    safeSaveItem('dm_reminders_v1', reminders);
    safeSaveItem('dm_receipts_v1', receipts);
    safeSaveItem('dm_receipt_delivery_logs_v1', receiptDeliveryLogs);
    safeSaveItem('dm_audit_v1', auditLogs.slice(0, 50));
  }, [user, customers, debts, payments, reminders, receipts, receiptDeliveryLogs, auditLogs]);

  // Log audit helper
  const addAudit = (action: string, entityType: 'debt' | 'payment' | 'customer' | 'reminder' | 'user', entityId: string, details: string) => {
    const entry: AuditLog = {
      id: 'aud_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [entry, ...prev.slice(0, 100)]);
  };

  // Calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDate = useMemo(() => new Date(todayStr), [todayStr]);

  const activeDebts = useMemo(() => debts.filter((d) => d.status !== 'paid'), [debts]);

  const totalOwed = useMemo(() => {
    return activeDebts.reduce((sum, d) => sum + d.currentBalance, 0);
  }, [activeDebts]);

  const totalOverdue = useMemo(() => {
    return activeDebts.reduce((sum, d) => {
      const dDate = new Date(d.dueDate);
      if (dDate < todayDate) {
        return sum + d.currentBalance;
      }
      return sum;
    }, 0);
  }, [activeDebts, todayDate]);

  const totalDueThisWeek = useMemo(() => {
    const weekAhead = new Date(todayDate.getTime() + 7 * 86400000);
    return activeDebts.reduce((sum, d) => {
      const dDate = new Date(d.dueDate);
      if (dDate >= todayDate && dDate <= weekAhead) {
        return sum + d.currentBalance;
      }
      return sum;
    }, 0);
  }, [activeDebts, todayDate]);

  const collectedThisMonth = useMemo(() => {
    const currYear = todayDate.getFullYear();
    const currMonth = todayDate.getMonth();
    return payments.reduce((sum, p) => {
      const pDate = new Date(p.date);
      if (pDate.getFullYear() === currYear && pDate.getMonth() === currMonth) {
        return sum + p.amount;
      }
      return sum;
    }, 0);
  }, [payments, todayDate]);

  const activeDebtsCount = activeDebts.length;

  // Global summary object for Dashboard, AIAssistant, Reports, etc.
  const summary = useMemo((): DebtSummary => {
    const overdueDebts = activeDebts.filter((d) => new Date(d.dueDate) < todayDate);
    const debtorCustomerIds = new Set(activeDebts.map((d) => d.customerId));
    const paidDebts = debts.filter((d) => d.status === 'paid');

    return {
      totalOutstanding: totalOwed,
      debtorCount: debtorCustomerIds.size,
      totalOverdue,
      overdueCount: overdueDebts.length,
      dueThisWeek: totalDueThisWeek,
      collectedThisMonth,
      paidDebtsCount: paidDebts.length,
    };
  }, [activeDebts, debts, totalOwed, totalOverdue, totalDueThisWeek, collectedThisMonth, todayDate]);

  // Collection Plan / Priority Calculation ("GET ME PAID")
  const collectionPlan = useMemo((): CollectionPlanItem[] => {
    const items: CollectionPlanItem[] = [];

    activeDebts.forEach((debt) => {
      const cust = customers.find((c) => c.id === debt.customerId);
      const custName = cust ? cust.name : 'Unknown Customer';
      const custPhone = cust ? cust.phone : '';

      const dDate = new Date(debt.dueDate);
      const diffMs = todayDate.getTime() - dDate.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffMs / 86400000));
      const isDueToday = debt.dueDate === todayStr;
      const isDueTomorrow = debt.dueDate === new Date(todayDate.getTime() + 86400000).toISOString().split('T')[0];

      // Recent payment behavior
      const custPayments = payments.filter((p) => p.customerId === debt.customerId);
      const lastPayment = custPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      // Recent reminder
      const custReminders = reminders.filter((r) => r.customerId === debt.customerId);
      const lastReminder = custReminders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      // Priority algorithm
      let priority: CollectionPriority = 'low';
      let recommendedAction = 'Send advance reminder';
      let suggestedStyle: ReminderStyle = 'friendly';
      let explanation = 'Due soon. Proactive touchpoint maintains relationship.';

      if (daysOverdue > 7 || debt.currentBalance >= 15000) {
        priority = 'high';
        recommendedAction = 'Send firm reminder';
        suggestedStyle = 'firm';
        explanation = daysOverdue > 0
          ? `${daysOverdue} days overdue with outstanding amount of ${debt.currency} ${debt.currentBalance.toLocaleString()}.`
          : `High balance of ${debt.currency} ${debt.currentBalance.toLocaleString()} requires proactive attention.`;
      } else if (daysOverdue > 0 || isDueToday || debt.currentBalance >= 7000) {
        priority = 'medium';
        recommendedAction = isDueToday ? 'Send friendly reminder' : 'Follow up on payment';
        suggestedStyle = 'friendly';
        explanation = isDueToday
          ? 'Payment due today. A warm check-in ensures timely settlement.'
          : `${daysOverdue} days past due date. Follow up while recent.`;
      } else if (isDueTomorrow) {
        priority = 'low';
        recommendedAction = 'Send advance reminder';
        suggestedStyle = 'friendly';
        explanation = 'Due tomorrow. Gentle advance notice improves on-time payment.';
      }

      items.push({
        id: `plan_${debt.id}`,
        customerId: debt.customerId,
        customerName: custName,
        customerPhone: custPhone,
        debtId: debt.id,
        debtDescription: debt.description,
        amountOutstanding: debt.currentBalance,
        currency: debt.currency,
        dueDate: debt.dueDate,
        daysOverdue,
        priority,
        recommendedAction,
        suggestedStyle,
        lastPaymentDate: lastPayment?.date,
        lastPaymentAmount: lastPayment?.amount,
        lastReminderDate: lastReminder?.date,
        explanation,
      });
    });

    // Sort by priority rank: high -> medium -> low, then by amount desc
    const rank: Record<CollectionPriority, number> = { high: 1, medium: 2, low: 3 };
    return items.sort((a, b) => {
      if (rank[a.priority] !== rank[b.priority]) {
        return rank[a.priority] - rank[b.priority];
      }
      return b.amountOutstanding - a.amountOutstanding;
    });
  }, [activeDebts, customers, payments, reminders, todayDate, todayStr]);

  // Actions
  const updateUser = (data: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...data }));
    addAudit('Updated profile settings', 'user', user.id, JSON.stringify(data));
  };

  const switchAccountType = (type: AccountType) => {
    setUser((prev) => ({ ...prev, accountType: type }));
    addAudit(`Switched view to ${type} mode`, 'user', user.id, `Type: ${type}`);
  };

  const completeOnboarding = ({
    useCase,
    preferredPaymentMethod,
    businessName,
    accountType = 'business',
  }: {
    useCase: BusinessUseCase;
    preferredPaymentMethod: PaymentMethod;
    businessName?: string;
    accountType?: AccountType;
  }) => {
    setUser((prev) => ({
      ...prev,
      accountType,
      useCase,
      preferredPaymentMethod,
      onboardingCompleted: true,
      businessProfile: {
        ...prev.businessProfile,
        businessName: businessName || prev.businessProfile.businessName,
      },
    }));
    addAudit('Completed onboarding', 'user', user.id, `Use case: ${useCase}`);
  };

  const addCustomer = (data: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Customer => {
    const newCust: Customer = {
      ...data,
      id: 'cust_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomers((prev) => {
      const updated = [newCust, ...prev];
      safeSaveItem('dm_customers_v1', updated);
      return updated;
    });
    addAudit('Added customer', 'customer', newCust.id, `Customer: ${newCust.name}`);
    return newCust;
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          ...data,
          // Guarantee notes and phone are strictly preserved if not explicitly provided
          notes: data.notes !== undefined ? data.notes : c.notes,
          phone: data.phone !== undefined ? data.phone : c.phone,
          updatedAt: new Date().toISOString(),
        };
      });
      safeSaveItem('dm_customers_v1', updated);
      return updated;
    });
    addAudit('Updated customer details', 'customer', id, `Updated fields`);
  };

  const deleteCustomer = (id: string) => {
    // Default to soft-delete / archiving to preserve financial records
    archiveCustomer(id);
  };

  const archiveCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setCustomers((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, isArchived: true, archivedAt: new Date().toISOString() } : c
      );
      safeSaveItem('dm_customers_v1', updated);
      return updated;
    });
    addAudit('Archived customer', 'customer', id, `Archived customer ${cust?.name || id}. Financial records preserved.`);
  };

  const unarchiveCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setCustomers((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, isArchived: false, archivedAt: undefined } : c
      );
      safeSaveItem('dm_customers_v1', updated);
      return updated;
    });
    addAudit('Restored customer', 'customer', id, `Restored customer ${cust?.name || id}`);
  };

  const permanentlyDeleteCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    const custName = cust?.name || id;

    // Remove customer
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      safeSaveItem('dm_customers_v1', updated);
      return updated;
    });

    // Remove customer's debts
    setDebts((prev) => {
      const updated = prev.filter((d) => d.customerId !== id);
      safeSaveItem('dm_debts_v1', updated);
      return updated;
    });

    // Remove customer's payments
    setPayments((prev) => {
      const updated = prev.filter((p) => p.customerId !== id);
      safeSaveItem('dm_payments_v1', updated);
      return updated;
    });

    // Remove customer's reminders
    setReminders((prev) => {
      const updated = prev.filter((r) => r.customerId !== id);
      safeSaveItem('dm_reminders_v1', updated);
      return updated;
    });

    addAudit('Permanently deleted customer and all financial records', 'customer', id, `Deleted customer ${custName} and all associated debts/payments`);
  };

  const addDebtWithInitialPayment = (data: AddDebtWithPaymentInput): { debt: Debt; payment?: Payment } => {
    let customerId = data.customerId;

    // Search or create customer without creating duplicates
    if (!customerId && data.customerName) {
      const trimmed = data.customerName.trim();
      const cleanPhone = data.customerPhone?.trim() || '';
      const existing = customers.find(
        (c) =>
          c.name.toLowerCase() === trimmed.toLowerCase() ||
          (cleanPhone && c.phone && c.phone.replace(/[^0-9]/g, '') === cleanPhone.replace(/[^0-9]/g, ''))
      );
      if (existing) {
        customerId = existing.id;
        // If customer was archived, restore them
        if (existing.isArchived) {
          updateCustomer(existing.id, { isArchived: false });
        }
        // If existing had no phone and new phone provided, update it
        if (!existing.phone && cleanPhone) {
          updateCustomer(existing.id, { phone: cleanPhone });
        }
      } else {
        const created = addCustomer({
          name: trimmed,
          phone: cleanPhone,
          category: data.category || 'Retail',
          importance: 'normal',
          notes: data.notes || 'Created from transaction entry',
        });
        customerId = created.id;
      }
    }

    const orig = Math.max(0, Number(data.originalDebt || 0));
    const paid = Math.max(0, Number(data.amountPaid || 0));
    const remaining = Math.max(0, orig - paid);
    const debtDate = data.debtDate || todayStr;
    const paymentDate = data.paymentDate || debtDate;
    const debtId = 'dbt_' + Math.random().toString(36).substr(2, 9);
    const curr = data.currency || user.currency || 'KES';
    const method = data.paymentMethod || user.preferredPaymentMethod || 'M-Pesa';

    let debtStatus: DebtStatus = 'outstanding';
    if (orig > 0 && paid >= orig) {
      debtStatus = 'paid';
    } else if (paid > 0) {
      debtStatus = 'partially_paid';
    }

    const newDebt: Debt = {
      id: debtId,
      userId: user.id,
      customerId: customerId || 'cust_unknown',
      originalAmount: orig,
      currentBalance: remaining,
      currency: curr,
      date: debtDate,
      dueDate: data.dueDate || todayStr,
      description: data.description || 'Credit goods / service',
      paymentMethod: method,
      category: data.category || 'General',
      notes: data.notes || '',
      attachmentUrl: data.attachmentUrl,
      status: debtStatus,
      isRecurring: data.isRecurring,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.name,
    };

    let newPayment: Payment | undefined;
    if (paid > 0) {
      const receiptNumber = 'REC-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
      newPayment = {
        id: 'pay_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        debtId: newDebt.id,
        customerId: newDebt.customerId,
        amount: paid,
        date: paymentDate,
        paymentMethod: method,
        receiptNumber,
        previousBalance: orig,
        remainingBalance: remaining,
        recordedBy: user.name,
        notes: `Initial payment for ${data.description}`,
        createdAt: new Date().toISOString(),
      };
    }

    setDebts((prev) => {
      const updated = [newDebt, ...prev];
      safeSaveItem('dm_debts_v1', updated);
      return updated;
    });

    if (newPayment) {
      setPayments((prev) => {
        const updated = [newPayment!, ...prev];
        safeSaveItem('dm_payments_v1', updated);
        return updated;
      });
      addAudit(
        'Recorded initial payment on credit',
        'payment',
        newPayment.id,
        `Paid ${curr} ${paid} toward ${newDebt.description}. Balance: ${remaining}`
      );
    }

    setUser((prev) => {
      const updated = {
        ...prev,
        subscription: {
          ...prev.subscription,
          aiCreditsUsed: prev.subscription.aiCreditsUsed + 1,
        },
      };
      safeSaveItem('dm_user_v1', updated);
      return updated;
    });

    addAudit(
      'Recorded credit sale',
      'debt',
      newDebt.id,
      `Original Amount: ${curr} ${orig}, Paid: ${curr} ${paid}, Remaining: ${curr} ${remaining} for ${data.customerName || customerId}`
    );

    return { debt: newDebt, payment: newPayment };
  };

  const addDebt = (data: AddDebtInput): Debt => {
    let customerId = data.customerId;

    // If customer name provided but no customerId, search or create
    if (!customerId && data.customerName) {
      const trimmed = data.customerName.trim();
      const existing = customers.find(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase() || (data.customerPhone && c.phone === data.customerPhone)
      );
      if (existing) {
        customerId = existing.id;
      } else {
        const created = addCustomer({
          name: trimmed,
          phone: data.customerPhone || '',
          category: data.category || 'Customer',
          importance: 'normal',
          notes: 'Auto-created from transaction entry',
        });
        customerId = created.id;
      }
    }

    const newDebt: Debt = {
      id: 'dbt_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      customerId: customerId || 'cust_unknown',
      originalAmount: Number(data.amount),
      currentBalance: Number(data.amount),
      currency: data.currency || user.currency || 'KES',
      date: data.date || todayStr,
      dueDate: data.dueDate || todayStr,
      description: data.description || 'Credit purchase',
      paymentMethod: data.paymentMethod || user.preferredPaymentMethod || 'M-Pesa',
      category: data.category || 'General',
      notes: data.notes || '',
      attachmentUrl: data.attachmentUrl,
      status: 'outstanding',
      isRecurring: data.isRecurring,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.name,
    };

    setDebts((prev) => {
      const updated = [newDebt, ...prev];
      safeSaveItem('dm_debts_v1', updated);
      return updated;
    });

    // increment user debts usage count
    setUser((prev) => {
      const updated = {
        ...prev,
        subscription: {
          ...prev.subscription,
          aiCreditsUsed: prev.subscription.aiCreditsUsed + 1,
        },
      };
      safeSaveItem('dm_user_v1', updated);
      return updated;
    });

    addAudit(
      'Recorded new credit debt',
      'debt',
      newDebt.id,
      `Amount: ${newDebt.currency} ${newDebt.originalAmount} to ${data.customerName || customerId}`
    );
    return newDebt;
  };

  const updateDebt = (id: string, data: Partial<Debt>) => {
    setDebts((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d));
      safeSaveItem('dm_debts_v1', updated);
      return updated;
    });
    addAudit('Updated debt details', 'debt', id, 'Updated fields');
  };

  const deleteDebt = (id: string) => {
    setDebts((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      safeSaveItem('dm_debts_v1', updated);
      return updated;
    });
    addAudit('Deleted debt record', 'debt', id, 'Debt deleted');
  };

  const recordPayment = (data: RecordPaymentInput): Payment => {
    const targetDebt = debts.find((d) => d.id === data.debtId);
    const prevBalance = targetDebt ? targetDebt.currentBalance : data.amount;
    const paidAmount = Number(data.amount);
    const newRemaining = Math.max(0, prevBalance - paidAmount);

    const receiptNumber = 'REC-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);

    const targetCustomer = customers.find(
      (c) => c.id === (targetDebt ? targetDebt.customerId : data.customerId)
    );

    const newPayment: Payment = {
      id: 'pay_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      debtId: data.debtId,
      customerId: data.customerId,
      amount: paidAmount,
      date: data.date || todayStr,
      paymentMethod: data.paymentMethod || 'M-Pesa',
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      receiptNumber,
      previousBalance: prevBalance,
      remainingBalance: newRemaining,
      recordedBy: user.name,
      createdAt: new Date().toISOString(),
    };

    // Update debt balance, status, and payment plan synchronously
    let updatedDebts = debts;
    if (targetDebt) {
      const updatedStatus = newRemaining === 0 ? 'paid' : 'partially_paid';
      let updatedPlan = targetDebt.paymentPlan;
      if (updatedPlan && updatedPlan.enabled) {
        if (newRemaining === 0) {
          updatedPlan = {
            ...updatedPlan,
            paymentPlanStatus: 'completed',
          };
        } else if (paidAmount >= updatedPlan.installmentAmount) {
          // Advance next due date by frequency
          const currentDueDate = new Date(updatedPlan.nextInstallmentDueDate || targetDebt.dueDate || new Date());
          const daysToAdd =
            updatedPlan.installmentFrequency === 'weekly'
              ? 7
              : updatedPlan.installmentFrequency === 'biweekly'
              ? 14
              : 30;
          currentDueDate.setDate(currentDueDate.getDate() + daysToAdd);
          updatedPlan = {
            ...updatedPlan,
            nextInstallmentDueDate: currentDueDate.toISOString().split('T')[0],
          };
        }
      }

      updatedDebts = debts.map((d) =>
        d.id === targetDebt.id
          ? {
              ...d,
              currentBalance: newRemaining,
              status: updatedStatus,
              paymentPlan: updatedPlan,
              updatedAt: new Date().toISOString(),
            }
          : d
      );
      setDebts(updatedDebts);
      safeSaveItem('dm_debts_v1', updatedDebts);
    }

    // Update payments synchronously
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    safeSaveItem('dm_payments_v1', updatedPayments);

    // PART 7 & 14: Automatic Official Receipt Generation
    const officialReceipt: OfficialReceipt = {
      id: 'rcpt_' + newPayment.id,
      receiptNumber,
      paymentId: newPayment.id,
      debtId: newPayment.debtId,
      customerId: newPayment.customerId,
      userId: user.id,
      issuedAt: new Date().toISOString(),
      businessName: user.businessProfile.businessName || user.name || 'Fortunal DebtManager Merchant',
      customerName: targetCustomer?.name || 'Valued Customer',
      customerPhone: targetCustomer?.phone || '',
      debtDescription: targetDebt?.description || 'Credit Account Settlement',
      originalDebtAmount: targetDebt?.originalAmount || paidAmount,
      previousBalance: prevBalance,
      amountPaid: paidAmount,
      remainingBalance: newRemaining,
      paymentMethod: newPayment.paymentMethod,
      referenceNumber: newPayment.referenceNumber,
      hasPaymentPlan: Boolean(targetDebt?.paymentPlan?.enabled),
      nextInstallmentDueDate: targetDebt?.paymentPlan?.nextInstallmentDueDate,
      nextInstallmentAmount: targetDebt?.paymentPlan?.installmentAmount,
      paymentInstructions: user.paymentDetails?.mpesaPaybill
        ? `M-Pesa Paybill: ${user.paymentDetails.mpesaPaybill}`
        : user.paymentDetails?.mpesaTill
        ? `M-Pesa Till: ${user.paymentDetails.mpesaTill}`
        : user.paymentDetails?.mpesaPhone
        ? `M-Pesa Send Money: ${user.paymentDetails.mpesaPhone}`
        : undefined,
      deliveryStatus: 'pending',
      isDuplicateReprint: false,
      notes: newPayment.notes,
    };

    // PART 8, 10, 11, 12: Automatic Receipt Delivery Workflow & Metering
    const sub = user.receiptDeliverySubscription;
    if (sub && sub.status === 'active' && (sub.monthlyAllowance > 0 || sub.addOnCredits > 0)) {
      const remainingAllowance = Math.max(0, sub.monthlyAllowance - sub.usedThisCycle);
      const totalAvailable = remainingAllowance + sub.addOnCredits;

      if (totalAvailable > 0) {
        // Record automated delivery dispatch
        const deliveryLog: ReceiptDeliveryLog = {
          id: 'dlv_' + Math.random().toString(36).substr(2, 9),
          receiptId: officialReceipt.id,
          paymentId: newPayment.id,
          customerId: newPayment.customerId,
          customerPhone: targetCustomer?.phone,
          customerEmail: targetCustomer?.email,
          channel: 'whatsapp',
          status: 'sent',
          provider: 'meta_whatsapp',
          dispatchedAt: new Date().toISOString(),
        };

        officialReceipt.deliveryStatus = 'sent';
        officialReceipt.deliveryLogId = deliveryLog.id;

        // Meter channel usage
        const updatedSub: ReceiptDeliverySubscription = {
          ...sub,
          usedThisCycle: sub.usedThisCycle + 1,
          channels: {
            ...sub.channels,
            whatsapp: {
              ...sub.channels.whatsapp,
              used: sub.channels.whatsapp.used + 1,
              remaining: Math.max(0, sub.channels.whatsapp.remaining - 1),
            },
          },
        };

        setUser((prev) => ({ ...prev, receiptDeliverySubscription: updatedSub }));
        safeSaveItem('dm_user_v1', { ...user, receiptDeliverySubscription: updatedSub });

        setReceiptDeliveryLogs((prev) => {
          const up = [deliveryLog, ...prev];
          safeSaveItem('dm_receipt_delivery_logs_v1', up);
          return up;
        });
      }
    }

    setReceipts((prev) => {
      const up = [officialReceipt, ...prev.filter((r) => r.paymentId !== newPayment.id)];
      safeSaveItem('dm_receipts_v1', up);
      return up;
    });

    addAudit(
      'Recorded payment',
      'payment',
      newPayment.id,
      `Received ${paidAmount} via ${newPayment.paymentMethod}. Remaining: ${newRemaining}`
    );

    return newPayment;
  };

  const deletePayment = (id: string) => {
    const target = payments.find((p) => p.id === id);
    if (!target) return;

    // Restore debt balance
    let updatedDebts = debts;
    setDebts((prev) => {
      updatedDebts = prev.map((d) => {
        if (d.id === target.debtId) {
          const restored = Math.min(d.originalAmount, d.currentBalance + target.amount);
          const restoredStatus = restored === 0 ? 'paid' : (restored < d.originalAmount ? 'partially_paid' : 'outstanding');
          return {
            ...d,
            currentBalance: restored,
            status: restoredStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return d;
      });
      safeSaveItem('dm_debts_v1', updatedDebts);
      return updatedDebts;
    });

    const updatedPayments = payments.filter((p) => p.id !== id);
    setPayments(updatedPayments);
    safeSaveItem('dm_payments_v1', updatedPayments);

    addAudit('Deleted payment record', 'payment', id, `Reversed payment of ${target.amount}`);
  };

  const adjustDebtDueDate = (debtId: string, newDueDate: string) => {
    setDebts((prev) => {
      const updated = prev.map((d) => {
        if (d.id === debtId) {
          return {
            ...d,
            dueDate: newDueDate,
            updatedAt: new Date().toISOString(),
          };
        }
        return d;
      });
      safeSaveItem('dm_debts_v1', updated);
      return updated;
    });
    addAudit('Adjusted debt due date', 'debt', debtId, `Due date updated to ${newDueDate}`);
  };

  const logReminder = (data: Omit<ReminderRecord, 'id' | 'userId' | 'createdAt'>): ReminderRecord => {
    const newReminder: ReminderRecord = {
      ...data,
      id: 'rem_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
    setReminders((prev) => {
      const updated = [newReminder, ...prev];
      safeSaveItem('dm_reminders_v1', updated);
      return updated;
    });
    addAudit(
      `Sent ${data.messageType} reminder`,
      'reminder',
      newReminder.id,
      `Via ${data.channel} to customer ${data.customerId}`
    );
    return newReminder;
  };

  const updateReminderStatus = (id: string, status: ReminderStatus) => {
    setReminders((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, status } : r));
      safeSaveItem('dm_reminders_v1', updated);
      return updated;
    });
    addAudit('Updated reminder status', 'reminder', id, `Status updated to ${status}`);
  };

  const updateDebtPaymentPlan = (debtId: string, plan: DebtPaymentPlan) => {
    setDebts((prev) => {
      const updated = prev.map((d) => (d.id === debtId ? { ...d, paymentPlan: plan, updatedAt: new Date().toISOString() } : d));
      safeSaveItem('dm_debts_v1', updated);
      return updated;
    });
    addAudit(
      'Updated payment plan',
      'debt',
      debtId,
      `Plan: ${plan.installmentAmount} (${plan.installmentFrequency}), Status: ${plan.paymentPlanStatus}`
    );
  };

  const logBatchReminders = (records: Array<Omit<ReminderRecord, 'id' | 'userId' | 'createdAt'>>): ReminderRecord[] => {
    const nowIso = new Date().toISOString();
    const newRecords: ReminderRecord[] = records.map((data) => ({
      ...data,
      id: 'rem_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      createdAt: nowIso,
    }));

    setReminders((prev) => {
      const updated = [...newRecords, ...prev];
      safeSaveItem('dm_reminders_v1', updated);
      return updated;
    });

    addAudit(
      `Logged batch of ${newRecords.length} reminders`,
      'reminder',
      newRecords[0]?.id || 'batch',
      `Bulk dispatched/recorded for ${newRecords.length} customer records`
    );

    return newRecords;
  };

  const updateReceiptDeliverySubscription = (subUpdate: Partial<ReceiptDeliverySubscription>) => {
    setUser((prev) => {
      const current = prev.receiptDeliverySubscription || {
        planId: 'manual_free',
        planName: 'Manual WhatsApp / PDF (Included Free)',
        status: 'active',
        cycle: 'monthly',
        priceKes: 0,
        monthlyAllowance: 0,
        usedThisCycle: 0,
        addOnCredits: 0,
        renewalDate: '2026-10-01',
        channels: {
          whatsapp: { used: 0, included: 0, remaining: 0 },
          sms: { used: 0, included: 0, remaining: 0 },
          email: { used: 0, included: 0, remaining: 0 },
        },
      };
      const updatedSub: ReceiptDeliverySubscription = {
        ...current,
        ...subUpdate,
      };
      const updatedUser = { ...prev, receiptDeliverySubscription: updatedSub };
      safeSaveItem('dm_user_v1', updatedUser);
      return updatedUser;
    });
    addAudit('Updated receipt delivery plan', 'user', user.id, `Plan updated to ${subUpdate.planName || subUpdate.planId}`);
  };

  const addReceiptCreditPack = (credits: number) => {
    setUser((prev) => {
      const current = prev.receiptDeliverySubscription || {
        planId: 'manual_free',
        planName: 'Manual WhatsApp / PDF (Included Free)',
        status: 'active',
        cycle: 'monthly',
        priceKes: 0,
        monthlyAllowance: 0,
        usedThisCycle: 0,
        addOnCredits: 0,
        renewalDate: '2026-10-01',
        channels: {
          whatsapp: { used: 0, included: 0, remaining: 0 },
          sms: { used: 0, included: 0, remaining: 0 },
          email: { used: 0, included: 0, remaining: 0 },
        },
      };
      const updatedSub: ReceiptDeliverySubscription = {
        ...current,
        addOnCredits: (current.addOnCredits || 0) + credits,
      };
      const updatedUser = { ...prev, receiptDeliverySubscription: updatedSub };
      safeSaveItem('dm_user_v1', updatedUser);
      return updatedUser;
    });
    addAudit('Added receipt delivery credit pack', 'user', user.id, `Purchased ${credits} additional delivery credits`);
  };

  const generateDuplicateReceipt = (paymentId: string): OfficialReceipt | null => {
    const existing = receipts.find((r) => r.paymentId === paymentId);
    if (existing) {
      return {
        ...existing,
        isDuplicateReprint: true,
      };
    }
    const pay = payments.find((p) => p.id === paymentId);
    if (!pay) return null;
    const deb = debts.find((d) => d.id === pay.debtId);
    const cust = customers.find((c) => c.id === pay.customerId);

    const reissued: OfficialReceipt = {
      id: 'rcpt_' + pay.id,
      receiptNumber: pay.receiptNumber,
      paymentId: pay.id,
      debtId: pay.debtId,
      customerId: pay.customerId,
      userId: user.id,
      issuedAt: pay.createdAt,
      businessName: user.businessProfile.businessName || user.name || 'Fortunal DebtManager Merchant',
      customerName: cust?.name || 'Customer',
      customerPhone: cust?.phone || '',
      debtDescription: deb?.description || 'Settlement',
      originalDebtAmount: deb?.originalAmount || pay.amount,
      previousBalance: pay.previousBalance,
      amountPaid: pay.amount,
      remainingBalance: pay.remainingBalance,
      paymentMethod: pay.paymentMethod,
      referenceNumber: pay.referenceNumber,
      hasPaymentPlan: Boolean(deb?.paymentPlan?.enabled),
      nextInstallmentDueDate: deb?.paymentPlan?.nextInstallmentDueDate,
      nextInstallmentAmount: deb?.paymentPlan?.installmentAmount,
      deliveryStatus: 'delivered',
      isDuplicateReprint: true,
    };
    return reissued;
  };

  const processAutomaticReceiptDelivery = async (
    receipt: OfficialReceipt,
    channel: 'whatsapp' | 'sms' | 'email' = 'whatsapp'
  ): Promise<{ success: boolean; status: DeliveryStatus; message: string }> => {
    const sub = user.receiptDeliverySubscription;
    const remainingAllowance = sub ? Math.max(0, sub.monthlyAllowance - sub.usedThisCycle) : 0;
    const addOnCredits = sub?.addOnCredits || 0;
    const totalCredits = remainingAllowance + addOnCredits;

    if (!sub || sub.status !== 'active' || totalCredits <= 0) {
      return {
        success: false,
        status: 'manual_shared',
        message: 'No active automated receipt delivery subscription or credits. You can still print or share via WhatsApp manually.',
      };
    }

    // Prepare dispatch
    const dlvId = 'dlv_' + Math.random().toString(36).substr(2, 9);
    const logEntry: ReceiptDeliveryLog = {
      id: dlvId,
      receiptId: receipt.id,
      paymentId: receipt.paymentId,
      customerId: receipt.customerId,
      customerPhone: receipt.customerPhone,
      channel,
      status: 'sent',
      provider: 'meta_whatsapp',
      dispatchedAt: new Date().toISOString(),
    };

    // Meter usage
    const updatedSub: ReceiptDeliverySubscription = {
      ...sub,
      usedThisCycle: sub.usedThisCycle + 1,
      channels: {
        ...sub.channels,
        [channel]: {
          ...sub.channels[channel],
          used: sub.channels[channel].used + 1,
          remaining: Math.max(0, sub.channels[channel].remaining - 1),
        },
      },
    };

    setUser((prev) => ({ ...prev, receiptDeliverySubscription: updatedSub }));
    safeSaveItem('dm_user_v1', { ...user, receiptDeliverySubscription: updatedSub });

    setReceiptDeliveryLogs((prev) => {
      const up = [logEntry, ...prev];
      safeSaveItem('dm_receipt_delivery_logs_v1', up);
      return up;
    });

    setReceipts((prev) => {
      const up = prev.map((r) => (r.id === receipt.id ? { ...r, deliveryStatus: 'sent' as DeliveryStatus, deliveryLogId: dlvId } : r));
      safeSaveItem('dm_receipts_v1', up);
      return up;
    });

    return {
      success: true,
      status: 'sent',
      message: `Official receipt ${receipt.receiptNumber} queued and dispatched via ${channel.toUpperCase()} to ${receipt.customerPhone}.`,
    };
  };

  const getCustomerLedger = (customerId: string) => {
    const custDebts = debts.filter((d) => d.customerId === customerId);
    const custPayments = payments.filter((p) => p.customerId === customerId);

    // Merge transactions into single chronological ledger
    const merged: Array<{
      id: string;
      date: string;
      type: 'credit' | 'payment';
      amount: number;
      description: string;
      paymentMethod?: string;
      reference?: string;
      runningBalance: number;
    }> = [];

    custDebts.forEach((d) => {
      merged.push({
        id: d.id,
        date: d.date,
        type: 'credit',
        amount: d.originalAmount,
        description: d.description,
        paymentMethod: d.paymentMethod,
        runningBalance: 0, // computed below
      });
    });

    custPayments.forEach((p) => {
      merged.push({
        id: p.id,
        date: p.date,
        type: 'payment',
        amount: p.amount,
        description: p.notes ? `Payment: ${p.notes}` : `Payment received`,
        paymentMethod: p.paymentMethod,
        reference: p.referenceNumber,
        runningBalance: 0, // computed below
      });
    });

    // Sort ascending chronologically
    merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    merged.forEach((item) => {
      if (item.type === 'credit') {
        running += item.amount;
      } else {
        running -= item.amount;
      }
      item.runningBalance = Math.max(0, running);
    });

    const totalBorrowed = custDebts.reduce((sum, d) => sum + d.originalAmount, 0);
    const totalPaid = custPayments.reduce((sum, p) => sum + p.amount, 0);
    const currentBalance = Math.max(0, totalBorrowed - totalPaid);

    const sortedPayments = [...custPayments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      transactions: merged,
      totalBorrowed,
      totalPaid,
      currentBalance,
      paymentsCount: custPayments.length,
      lastPaymentDate: sortedPayments[0]?.date,
    };
  };

  const resetToDemoData = () => {
    setUser(INITIAL_USER);
    setCustomers(INITIAL_CUSTOMERS);
    setDebts(INITIAL_DEBTS);
    setPayments(INITIAL_PAYMENTS);
    setReminders(INITIAL_REMINDERS);
    setAuditLogs([]);
    localStorage.clear();
  };

  const clearAllData = () => {
    setCustomers([]);
    setDebts([]);
    setPayments([]);
    setReminders([]);
    setAuditLogs([]);
    setUser((prev) => ({
      ...prev,
      subscription: { ...prev.subscription, aiCreditsUsed: 0 },
    }));
  };

  const formatMoney = (amount: number, customCurrency?: string) => {
    const cur = customCurrency || user.currency || 'KES';
    const symbol = cur === 'KES' ? 'KSh' : cur;
    return `${symbol} ${Number(amount || 0).toLocaleString()}`;
  };

  return (
    <DebtContext.Provider
      value={{
        user,
        customers,
        debts,
        payments,
        reminders,
        receipts,
        receiptDeliveryLogs,
        auditLogs,
        totalOwed,
        totalOverdue,
        totalDueThisWeek,
        collectedThisMonth,
        activeDebtsCount,
        collectionPlan,
        summary,
        reminderHistory: reminders,
        updateUser,
        updateUserProfile: updateUser,
        switchAccountType,
        completeOnboarding,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        archiveCustomer,
        unarchiveCustomer,
        permanentlyDeleteCustomer,
        addDebt,
        addDebtWithInitialPayment,
        updateDebt,
        deleteDebt,
        adjustDebtDueDate,
        updateDebtPaymentPlan,
        recordPayment,
        deletePayment,
        logReminder,
        logBatchReminders,
        updateReminderStatus,
        updateReceiptDeliverySubscription,
        addReceiptCreditPack,
        generateDuplicateReceipt,
        processAutomaticReceiptDelivery,
        getCustomerLedger,
        resetToDemoData,
        clearAllData,
        formatMoney,
      }}
    >
      {children}
    </DebtContext.Provider>
  );
};

export const useDebt = () => {
  const ctx = useContext(DebtContext);
  if (!ctx) {
    throw new Error('useDebt must be used within a DebtProvider');
  }
  return ctx;
};

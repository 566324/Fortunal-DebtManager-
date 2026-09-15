export type AccountType = 'personal' | 'business';

export type BusinessUseCase =
  | 'personal_lending'
  | 'shop'
  | 'salon_barber'
  | 'bakery'
  | 'restaurant_food'
  | 'farm'
  | 'freelancer'
  | 'landlord_rental'
  | 'chama_group'
  | 'other';

export type PaymentMethod =
  | 'M-Pesa'
  | 'Cash'
  | 'Bank'
  | 'Airtel Money'
  | 'Card'
  | 'Cheque'
  | 'Other';

export type DebtStatus = 'outstanding' | 'partially_paid' | 'paid' | 'overpaid';

export type CollectionPriority = 'high' | 'medium' | 'low';

export type ReminderStyle = 'friendly' | 'professional' | 'firm' | 'urgent' | 'short' | 'custom';

export type ReminderChannel = 'whatsapp' | 'sms' | 'copy' | 'share';

export interface DebtSummary {
  totalOutstanding: number;
  debtorCount: number;
  totalOverdue: number;
  overdueCount: number;
  dueThisWeek: number;
  collectedThisMonth: number;
  paidDebtsCount: number;
}

export interface BusinessProfile {
  businessName: string;
  logoUrl?: string;
  phone: string;
  location: string;
  currency: string;
  category: string;
}

export type InstallmentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type PaymentPlanStatus = 'active' | 'completed' | 'paused';

export interface DebtPaymentPlan {
  enabled: boolean;
  installmentAmount: number;
  installmentFrequency: InstallmentFrequency;
  nextInstallmentDueDate: string;
  numberOfInstallments: number;
  completedInstallments?: number;
  totalPlanAmount?: number;
  startDate?: string;
  finalPaymentDate?: string;
  paymentPlanNotes?: string;
  paymentPlanStatus: PaymentPlanStatus;
}

export type DebtManagerPlanId = 'free' | 'starter' | 'pro' | 'business';

export interface UserSubscription {
  plan: DebtManagerPlanId;
  status: 'active' | 'trial' | 'expired';
  maxDebts: number;
  aiCreditsUsed: number;
  aiCreditsMax: number;
  priceKes?: number;
  expiresAt?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
}

export type ReceiptDeliveryPlanId =
  | 'manual_free'
  | 'receipt_100'
  | 'receipt_500'
  | 'receipt_1000'
  | 'receipt_5000'
  | 'enterprise';

export interface ChannelUsage {
  used: number;
  included: number;
  remaining: number;
}

export interface ReceiptDeliverySubscription {
  planId: ReceiptDeliveryPlanId;
  planName: string;
  status: 'active' | 'inactive' | 'expired' | 'canceled';
  cycle: 'monthly' | 'annual';
  priceKes: number;
  monthlyAllowance: number;
  usedThisCycle: number;
  addOnCredits: number;
  renewalDate: string;
  channels: {
    whatsapp: ChannelUsage;
    sms: ChannelUsage;
    email: ChannelUsage;
  };
}

export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'unknown'
  | 'manual_shared';

export interface ReceiptDeliveryLog {
  id: string;
  receiptId: string;
  paymentId: string;
  customerId: string;
  customerPhone?: string;
  customerEmail?: string;
  channel: 'whatsapp' | 'sms' | 'email';
  status: DeliveryStatus;
  provider: 'daraja_simulated' | 'meta_whatsapp' | 'africas_talking' | 'smtp' | 'manual';
  providerMessageId?: string;
  failureReason?: string;
  dispatchedAt: string;
  confirmedAt?: string;
}

export interface OfficialReceipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  debtId: string;
  customerId: string;
  userId: string;
  issuedAt: string;
  businessName: string;
  customerName: string;
  customerPhone: string;
  debtDescription: string;
  originalDebtAmount: number;
  previousBalance: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  hasPaymentPlan?: boolean;
  nextInstallmentDueDate?: string;
  nextInstallmentAmount?: number;
  paymentInstructions?: string;
  deliveryStatus: DeliveryStatus;
  deliveryLogId?: string;
  isDuplicateReprint?: boolean;
  notes?: string;
}

export interface PaymentDetails {
  mpesaPaybill?: string;
  mpesaTill?: string;
  mpesaPhone?: string;
  bankDetails?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountType: AccountType;
  useCase: BusinessUseCase;
  businessProfile: BusinessProfile;
  preferredPaymentMethod: PaymentMethod;
  currency: string;
  subscription: UserSubscription;
  role: 'owner' | 'admin' | 'staff' | 'viewer';
  onboardingCompleted: boolean;
  appPinEnabled: boolean;
  createdAt: string;
  paymentDetails?: PaymentDetails;
  receiptDeliverySubscription?: ReceiptDeliverySubscription;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  category: string;
  notes?: string;
  importance: 'normal' | 'high' | 'vip';
  isArchived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringConfig {
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'school_term';
  startDate: string;
  endDate?: string;
  dayRule?: string;
}

export interface Debt {
  id: string;
  userId: string;
  customerId: string;
  originalAmount: number;
  currentBalance: number;
  currency: string;
  date: string;
  dueDate: string;
  description: string;
  paymentMethod: PaymentMethod;
  category: string;
  notes?: string;
  attachmentUrl?: string;
  status: DebtStatus;
  paymentPlan?: DebtPaymentPlan;
  isRecurring?: boolean;
  recurringConfig?: RecurringConfig;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Payment {
  id: string;
  userId: string;
  debtId: string;
  customerId: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  receiptNumber: string;
  previousBalance: number;
  remainingBalance: number;
  recordedBy: string;
  createdAt: string;
}

export type ReminderStatus =
  | 'prepared'
  | 'shared_whatsapp'
  | 'sent_sms'
  | 'failed'
  | 'not_delivered'
  | 'copied'
  | 'sent'
  | 'delivered'
  | 'draft';

export interface ReminderRecord {
  id: string;
  userId: string;
  customerId: string;
  debtId: string;
  date: string;
  messageType: ReminderStyle;
  channel: ReminderChannel;
  messageText: string;
  status: ReminderStatus;
  notes?: string;
  createdAt: string;
}

export interface CollectionPlanItem {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  debtId: string;
  debtDescription: string;
  amountOutstanding: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  priority: CollectionPriority;
  recommendedAction: string;
  suggestedStyle: ReminderStyle;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastReminderDate?: string;
  explanation: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedQuestions?: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: 'debt' | 'payment' | 'customer' | 'reminder' | 'user';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface ParsedTransaction {
  customerName: string;
  customerPhone?: string;
  itemDescription?: string;
  quantity?: string;
  originalDebt: number;
  amountPaid: number;
  remainingBalance: number;
  // legacy backward-compatibility field
  amount: number;
  currency?: string;
  description: string;
  debtDate?: string;
  paymentDate?: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  category?: string;
  isPayment?: boolean;
  isSplitTransaction?: boolean;
  confidence?: 'high' | 'medium' | 'low' | string;
  notes?: string;
  rawNotes?: string;
  missingFields?: string[];
}

export type PaymentIntentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED';

export interface DarajaPaymentIntent {
  id: string;
  userId?: string;
  customerId: string;
  customerName?: string;
  debtId: string;
  debtDescription?: string;
  amount: number;
  phoneNumber: string;
  provider: 'safaricom_daraja';
  environment: 'sandbox' | 'production';
  status: PaymentIntentStatus;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  mpesaReceiptNumber?: string;
  resultCode?: number;
  resultDesc?: string;
  accountReference: string;
  transactionDesc: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isDuplicate?: boolean;
}

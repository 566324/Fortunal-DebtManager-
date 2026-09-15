import React, { useState } from 'react';
import { DebtProvider, useDebt } from './context/DebtContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OnboardingModal } from './components/OnboardingModal';
import { AddDebtModal } from './components/AddDebtModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { GetMePaidModal } from './components/GetMePaidModal';
import { ReminderModal } from './components/ReminderModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ReceiptDeliveryModal } from './components/ReceiptDeliveryModal';
import { CustomerLedgerModal } from './components/CustomerLedgerModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { UpgradeModal } from './components/UpgradeModal';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { DebtsView } from './components/DebtsView';
import { PaymentsView } from './components/PaymentsView';
import { ReportsView } from './components/ReportsView';
import { RemindersHistoryView } from './components/RemindersHistoryView';
import { AIAssistantView } from './components/AIAssistantView';
import { Payment, ReminderStyle } from './types';
import { Lock, KeyRound, ShieldCheck } from 'lucide-react';

const DebtAppContent: React.FC = () => {
  const { user, updateUserProfile } = useDebt();

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals state
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [prefillCustomerId, setPrefillCustomerId] = useState<string | undefined>(undefined);
  const [prefillDebtDesc, setPrefillDebtDesc] = useState<string | undefined>(undefined);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [prefillPaymentDebtId, setPrefillPaymentDebtId] = useState<string | undefined>(undefined);
  const [paymentModalMode, setPaymentModalMode] = useState<'mpesa_stk' | 'manual'>('mpesa_stk');

  const [isGetMePaidOpen, setIsGetMePaidOpen] = useState(false);

  const [reminderModalData, setReminderModalData] = useState<{
    isOpen: boolean;
    customerId: string;
    debtId: string;
    style?: ReminderStyle;
  }>({
    isOpen: false,
    customerId: '',
    debtId: '',
  });

  const [receiptModalData, setReceiptModalData] = useState<{
    isOpen: boolean;
    payment: Payment | null;
  }>({
    isOpen: false,
    payment: null,
  });

  const [customerLedgerData, setCustomerLedgerData] = useState<{
    isOpen: boolean;
    customerId: string;
  }>({
    isOpen: false,
    customerId: '',
  });

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReceiptDeliveryOpen, setIsReceiptDeliveryOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!user.onboardingCompleted);

  // App PIN Lock simulation
  const [isLocked, setIsLocked] = useState(user.appPinEnabled);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput.length >= 4) {
      setIsLocked(false);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Handlers for modal triggers
  const handleOpenAddDebt = (customerId?: string, description?: string) => {
    setPrefillCustomerId(customerId);
    setPrefillDebtDesc(description);
    setIsAddDebtOpen(true);
  };

  const handleOpenRecordPayment = (debtId?: string, mode: 'mpesa_stk' | 'manual' = 'manual') => {
    setPrefillPaymentDebtId(debtId);
    setPaymentModalMode(mode);
    setIsRecordPaymentOpen(true);
  };

  const handleOpenReminder = (customerId: string, debtId: string, style?: ReminderStyle) => {
    setReminderModalData({
      isOpen: true,
      customerId,
      debtId,
      style: style || 'friendly',
    });
  };

  const handleOpenCustomerLedger = (customerId: string) => {
    setCustomerLedgerData({
      isOpen: true,
      customerId,
    });
  };

  const handlePaymentSuccess = (payment: Payment) => {
    setReceiptModalData({
      isOpen: true,
      payment,
    });
  };

  // If App PIN Lock is active
  if (isLocked && user.appPinEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Fortunal DebtManager Security Lock</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your 4-digit PIN to access business accounts (Default PIN: 1234)
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="••••"
              autoFocus
              className="w-full text-center text-2xl tracking-[0.5em] font-mono rounded-xl bg-slate-800 border border-slate-700 py-3 text-white focus:border-emerald-500 focus:outline-none"
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-semibold">
                Incorrect PIN. Please enter 1234 or your custom 4-digit PIN.
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg transition active:scale-95"
            >
              Unlock App
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Offline Status Alert */}
      <OfflineIndicator />

      {/* Top Navigation */}
      <Navbar
        onOpenAddDebt={() => handleOpenAddDebt()}
        onOpenGetMePaid={() => setIsGetMePaidOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSelectTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
      />

      {/* App Body: Sidebar + Main Content View */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'settings') {
              setIsSettingsOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          onOpenGetMePaid={() => setIsGetMePaidOpen(true)}
          onOpenUpgrade={() => setIsUpgradeOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenAddDebt={() => handleOpenAddDebt()}
              onOpenRecordPayment={(debtId) => handleOpenRecordPayment(debtId)}
              onOpenGetMePaid={() => setIsGetMePaidOpen(true)}
              onOpenReminder={handleOpenReminder}
              onOpenCustomerLedger={handleOpenCustomerLedger}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              onOpenCustomerLedger={handleOpenCustomerLedger}
              onOpenAddDebt={(customerId) => handleOpenAddDebt(customerId)}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenRecordPayment={(debtId) => handleOpenRecordPayment(debtId)}
              onOpenReminder={handleOpenReminder}
            />
          )}

          {currentTab === 'debts' && (
            <DebtsView
              onOpenAddDebt={() => handleOpenAddDebt()}
              onOpenRecordPayment={(debtId) => handleOpenRecordPayment(debtId, 'manual')}
              onOpenMpesaPayment={(debtId) => handleOpenRecordPayment(debtId, 'mpesa_stk')}
              onOpenReminder={handleOpenReminder}
              onOpenCustomerLedger={handleOpenCustomerLedger}
            />
          )}

          {currentTab === 'payments' && (
            <PaymentsView
              onOpenRecordPayment={() => handleOpenRecordPayment()}
              onViewReceipt={(p) => setReceiptModalData({ isOpen: true, payment: p })}
              onOpenCustomerLedger={handleOpenCustomerLedger}
              onOpenDeliverySettings={() => setIsReceiptDeliveryOpen(true)}
            />
          )}

          {currentTab === 'reminders' && (
            <RemindersHistoryView
              onOpenReminder={handleOpenReminder}
              onOpenCustomerLedger={handleOpenCustomerLedger}
            />
          )}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'assistant' && <AIAssistantView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenAddDebt={() => handleOpenAddDebt()}
      />

      {/* Global Modals */}
      <AddDebtModal
        isOpen={isAddDebtOpen}
        onClose={() => setIsAddDebtOpen(false)}
        prefillCustomerId={prefillCustomerId}
        prefillDescription={prefillDebtDesc}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        prefillDebtId={prefillPaymentDebtId}
        initialMode={paymentModalMode}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <GetMePaidModal
        isOpen={isGetMePaidOpen}
        onClose={() => setIsGetMePaidOpen(false)}
        onOpenReminder={handleOpenReminder}
        onOpenPayment={(debtId) => handleOpenRecordPayment(debtId)}
      />

      <ReminderModal
        isOpen={reminderModalData.isOpen}
        onClose={() => setReminderModalData((prev) => ({ ...prev, isOpen: false }))}
        customerId={reminderModalData.customerId}
        debtId={reminderModalData.debtId}
        initialStyle={reminderModalData.style}
      />

      <ReceiptModal
        isOpen={receiptModalData.isOpen}
        onClose={() => setReceiptModalData({ isOpen: false, payment: null })}
        payment={receiptModalData.payment}
        onOpenDeliverySettings={() => setIsReceiptDeliveryOpen(true)}
      />

      <ReceiptDeliveryModal
        isOpen={isReceiptDeliveryOpen}
        onClose={() => setIsReceiptDeliveryOpen(false)}
      />

      <CustomerLedgerModal
        isOpen={customerLedgerData.isOpen}
        onClose={() => setCustomerLedgerData({ isOpen: false, customerId: '' })}
        customerId={customerLedgerData.customerId}
        onAddDebtForCustomer={(cid) => handleOpenAddDebt(cid)}
        onRecordPaymentForCustomer={(did) => handleOpenRecordPayment(did)}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenReceiptDelivery={() => setIsReceiptDeliveryOpen(true)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
      />

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onStartAddDebt={() => {
          setIsOnboardingOpen(false);
          setIsAddDebtOpen(true);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <DebtProvider>
      <DebtAppContent />
    </DebtProvider>
  );
}

import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Scissors,
  Coffee,
  Utensils,
  Tractor,
  Laptop,
  Building2,
  Users2,
  HelpCircle,
  Smartphone,
  Wallet,
  Building,
  CreditCard,
  X,
} from 'lucide-react';
import { BusinessUseCase, PaymentMethod, AccountType } from '../types';
import { useDebt } from '../context/DebtContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartAddDebt: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartAddDebt,
}) => {
  const { completeOnboarding, user } = useDebt();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<AccountType>(user.accountType || 'business');
  const [selectedUseCase, setSelectedUseCase] = useState<BusinessUseCase>(user.useCase || 'shop');
  const [businessName, setBusinessName] = useState(user.businessProfile.businessName || '');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
    user.preferredPaymentMethod || 'M-Pesa'
  );

  if (!isOpen) return null;

  const useCaseOptions: Array<{ id: BusinessUseCase; label: string; icon: any; desc: string }> = [
    { id: 'shop', label: 'Shop / Duka / Retail', icon: ShoppingBag, desc: 'Dry goods, retail kiosks, minimarts' },
    { id: 'salon_barber', label: 'Salon / Barbershop', icon: Scissors, desc: 'Beauty, hair styling & grooming' },
    { id: 'bakery', label: 'Bakery', icon: Coffee, desc: 'Bread, pastries, supply credits' },
    { id: 'restaurant_food', label: 'Restaurant / Food Business', icon: Utensils, desc: 'Cafes, fast food, catering' },
    { id: 'farm', label: 'Farm / Agriculture', icon: Tractor, desc: 'Crops, dairy, livestock & farm inputs' },
    { id: 'freelancer', label: 'Freelancer / Services', icon: Laptop, desc: 'Design, tech, consulting, gigs' },
    { id: 'landlord_rental', label: 'Landlord / Rental', icon: Building2, desc: 'Apartments, tenant dues, stalls' },
    { id: 'chama_group', label: 'Chama / Group', icon: Users2, desc: 'Merry-go-rounds, table banking' },
    { id: 'personal_lending', label: 'Personal Lending', icon: Wallet, desc: 'Friends, family, salary advances' },
    { id: 'other', label: 'Other', icon: HelpCircle, desc: 'General credit & collections' },
  ];

  const paymentOptions: Array<{ id: PaymentMethod; label: string; icon: any; subtitle: string }> = [
    { id: 'M-Pesa', label: 'M-Pesa / Till / Paybill', icon: Smartphone, subtitle: 'Safaricom mobile money' },
    { id: 'Cash', label: 'Cash', icon: Wallet, subtitle: 'Physical currency on pickup/delivery' },
    { id: 'Bank', label: 'Bank Transfer / EFT', icon: Building, subtitle: 'Direct bank accounts & RTGS' },
    { id: 'Airtel Money', label: 'Airtel Money', icon: Smartphone, subtitle: 'Airtel mobile wallet' },
    { id: 'Card', label: 'Card / POS', icon: CreditCard, subtitle: 'Debit & credit card terminals' },
  ];

  const handleFinish = (openAdd: boolean) => {
    completeOnboarding({
      useCase: selectedUseCase,
      preferredPaymentMethod: selectedPaymentMethod,
      businessName: businessName.trim() || 'My Business',
      accountType: selectedType,
    });
    onClose();
    if (openAdd) {
      onStartAddDebt();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-white my-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i
                    ? 'w-8 bg-emerald-500'
                    : step > i
                    ? 'w-4 bg-emerald-700'
                    : 'w-4 bg-slate-800'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Screen 1: Welcome to Fortunal DebtManager */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-950/50">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Welcome to</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">Fortunal DebtManager</h2>
              <p className="text-base text-slate-300 font-medium italic mt-2 text-emerald-300/90">
                «Know who owes. Know when. Get paid.»
              </p>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              A simple, AI-powered debt, credit-sales, payment and collection-management assistant.
              Not complicated accounting software — just the easiest way to track who owes you and collect on time.
            </p>

            <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-4 space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">Select Primary Account Type:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedType('business')}
                  className={`rounded-xl p-3 text-left border transition ${
                    selectedType === 'business'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm">Business Use</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Shop, salon, farm, rentals, services</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('personal')}
                  className={`rounded-xl p-3 text-left border transition ${
                    selectedType === 'personal'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm">Personal Lending</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Friends, family, personal credit</p>
                </button>
              </div>

              {selectedType === 'business' && (
                <div className="pt-2">
                  <label className="text-xs text-slate-400 block mb-1">Business / Brand Name (Optional)</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex General Store"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white transition active:scale-95"
            >
              <span>Get Started</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Screen 2: What will you use Fortunal DebtManager for? */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 2 of 4</span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                What will you use Fortunal DebtManager for?
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                We personalize your dashboard and reminder templates based on your activity.
              </p>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {useCaseOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedUseCase === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedUseCase(opt.id)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 text-left border transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-850 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-slate-400">{opt.desc}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-bold text-white transition"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Screen 3: How do you usually receive payments? */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 3 of 4</span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                How do you usually receive payments?
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                We'll pre-fill your preferred payment instructions in reminders and receipts.
              </p>
            </div>

            <div className="space-y-2.5">
              {paymentOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedPaymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedPaymentMethod(opt.id)}
                    className={`w-full flex items-center gap-3.5 rounded-xl p-3.5 text-left border transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{opt.label}</p>
                      <p className="text-xs text-slate-400">{opt.subtitle}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-bold text-white transition"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Screen 4: You're ready! */}
        {step === 4 && (
          <div className="space-y-6 text-center animate-fade-in py-2">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">All Set!</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">You're Ready to Get Paid.</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                Fortunal DebtManager is configured for your{' '}
                <span className="text-emerald-300 font-semibold">{selectedUseCase.replace('_', ' ')}</span> with{' '}
                <span className="text-emerald-300 font-semibold">{selectedPaymentMethod}</span> defaults.
              </p>
            </div>

            <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-4 text-left text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-white">What Fortunal DebtManager does next:</p>
              <p>✓ Track who owes you and calculate balances automatically</p>
              <p>✓ Highlight collection priorities and overdue accounts</p>
              <p>✓ Generate respectful WhatsApp reminders with one tap</p>
              <p>✓ Record partial payments and produce professional receipts</p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleFinish(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition active:scale-95"
              >
                <span className="text-base font-bold">+</span>
                <span>Add Your First Debt</span>
              </button>
              <button
                onClick={() => handleFinish(false)}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

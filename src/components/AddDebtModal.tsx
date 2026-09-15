import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Sparkles,
  Mic,
  MicOff,
  Calendar,
  DollarSign,
  User,
  Phone,
  Tag,
  Repeat,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { PaymentMethod } from '../types';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillCustomerId?: string;
  prefillDescription?: string;
}

interface ParsedPreviewState {
  customerName: string;
  customerPhone: string;
  itemDescription: string;
  quantity: string;
  originalDebt: number;
  amountPaid: number;
  remainingBalance: number;
  currency: string;
  debtDate: string;
  paymentDate: string;
  dueDate: string;
  paymentMethod: PaymentMethod;
  category: string;
  isSplitTransaction: boolean;
  notes: string;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  prefillCustomerId,
  prefillDescription,
}) => {
  const { customers, addCustomer, addDebt, addDebtWithInitialPayment, user, formatMoney } = useDebt();

  // Mode: 'quick' | 'manual'
  const [activeTab, setActiveTab] = useState<'quick' | 'manual'>('quick');

  // Quick AI State
  const [nlText, setNlText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Parsed confirmation preview state
  const [parsedPreview, setParsedPreview] = useState<ParsedPreviewState | null>(null);

  // Manual Form State
  const [customerId, setCustomerId] = useState<string>(prefillCustomerId || '');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [initialPayment, setInitialPayment] = useState<string>('');
  const [currency, setCurrency] = useState(user.currency || 'KES');
  const [debtDate, setDebtDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().split('T')[0];
  });
  const [description, setDescription] = useState(prefillDescription || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    user.preferredPaymentMethod || 'M-Pesa'
  );
  const [category, setCategory] = useState('Supplies');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');

  // Receipt image attachment
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isExtractingReceipt, setIsExtractingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleClearForm = () => {
    setCustomerId('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setAmount('');
    setInitialPayment('');
    setDescription('');
    setNotes('');
    setReceiptImage(null);
    setFeedback(null);
    setParsedPreview(null);
  };

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setNlText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  if (!isOpen) return null;

  const toggleListen = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const handleParseAI = async () => {
    if (!nlText.trim()) return;
    setIsAnalyzing(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/ai/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: nlText,
          defaultCurrency: user.currency || 'KES',
        }),
      });
      const data = await res.json();

      const parsedCustName = data.customerName || '';
      const parsedCustPhone = data.customerPhone || '';
      const parsedOrigDebt = Number(data.originalDebt ?? data.amount) || 0;
      const parsedPaid = Number(data.amountPaid) || 0;
      const calculatedRemaining =
        parsedOrigDebt > 0 ? Math.max(0, parsedOrigDebt - parsedPaid) : 0;
      const parsedDueDate =
        data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const parsedDebtDate = data.debtDate || new Date().toISOString().split('T')[0];
      const parsedPaymentDate = data.paymentDate || parsedDebtDate;
      const parsedDesc = data.itemDescription || data.description || 'Credit transaction';
      const parsedMethod = (data.paymentMethod as PaymentMethod) || 'M-Pesa';
      const parsedCur = data.currency || user.currency || 'KES';
      const parsedCategory = data.category || 'Supplies';
      const isSplit = parsedOrigDebt > 0 && parsedPaid > 0;

      const previewObj: ParsedPreviewState = {
        customerName: parsedCustName,
        customerPhone: parsedCustPhone,
        itemDescription: parsedDesc,
        quantity: data.quantity || '',
        originalDebt: parsedOrigDebt,
        amountPaid: parsedPaid,
        remainingBalance: calculatedRemaining,
        currency: parsedCur,
        debtDate: parsedDebtDate,
        paymentDate: parsedPaymentDate,
        dueDate: parsedDueDate,
        paymentMethod: parsedMethod,
        category: parsedCategory,
        isSplitTransaction: isSplit,
        notes: data.notes || '',
      };

      setParsedPreview(previewObj);

      // Sync to manual form fields as well
      if (parsedCustName) {
        const matched = customers.find(
          (c) => c.name.toLowerCase() === parsedCustName.toLowerCase()
        );
        if (matched) {
          setCustomerId(matched.id);
          setNewCustomerName('');
          if (parsedCustPhone && !matched.phone) {
            setNewCustomerPhone(parsedCustPhone);
          }
        } else {
          setCustomerId('new');
          setNewCustomerName(parsedCustName);
          setNewCustomerPhone(parsedCustPhone);
        }
      }

      if (parsedOrigDebt > 0) setAmount(parsedOrigDebt.toString());
      if (parsedPaid > 0) setInitialPayment(parsedPaid.toString());
      if (parsedCur) setCurrency(parsedCur);
      if (parsedDesc) setDescription(parsedDesc);
      if (parsedDueDate) setDueDate(parsedDueDate);
      if (parsedDebtDate) setDebtDate(parsedDebtDate);
      if (parsedMethod) setPaymentMethod(parsedMethod);
      if (data.notes) setNotes(data.notes);

      setFeedback({
        type: 'success',
        message: isSplit
          ? `Recognized purchase and partial payment! Review the preview below and click Confirm & Save.`
          : `Recognized credit transaction! Review the preview below and click Confirm & Save.`,
      });
    } catch (err) {
      console.error('Parse error:', err);
      setFeedback({
        type: 'error',
        message: 'Could not auto-parse. Please enter details manually.',
      });
      setActiveTab('manual');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePreviewFieldChange = (field: keyof ParsedPreviewState, value: any) => {
    if (!parsedPreview) return;
    const updated = { ...parsedPreview, [field]: value };

    // Auto recalculate balance if money amounts change
    if (field === 'originalDebt' || field === 'amountPaid') {
      const orig = Number(field === 'originalDebt' ? value : updated.originalDebt) || 0;
      const paid = Number(field === 'amountPaid' ? value : updated.amountPaid) || 0;
      updated.remainingBalance = Math.max(0, orig - paid);
      updated.isSplitTransaction = orig > 0 && paid > 0;
    }

    setParsedPreview(updated);
  };

  const handleConfirmQuickSave = async () => {
    if (!parsedPreview) return;
    const origDebt = Number(parsedPreview.originalDebt) || 0;
    const amtPaid = Number(parsedPreview.amountPaid) || 0;

    if (origDebt <= 0 && amtPaid <= 0) {
      setFeedback({ type: 'error', message: 'Original debt or payment amount must be greater than 0.' });
      return;
    }

    try {
      if (origDebt > 0 && amtPaid > 0) {
        // Safe Split Transaction: Creates Debt record + Payment record atomically
        addDebtWithInitialPayment({
          customerId: customerId && customerId !== 'new' ? customerId : undefined,
          customerName: parsedPreview.customerName,
          customerPhone: parsedPreview.customerPhone,
          originalDebt: origDebt,
          amountPaid: amtPaid,
          currency: parsedPreview.currency,
          debtDate: parsedPreview.debtDate,
          paymentDate: parsedPreview.paymentDate,
          dueDate: parsedPreview.dueDate,
          description: parsedPreview.itemDescription || parsedPreview.description || 'Goods on credit',
          paymentMethod: parsedPreview.paymentMethod,
          category: parsedPreview.category,
          notes: parsedPreview.notes,
        });
      } else if (origDebt > 0) {
        // Pure Credit Debt (No deposit yet)
        let finalCustId = customerId;
        if (!finalCustId || finalCustId === 'new') {
          const newCust = addCustomer({
            name: parsedPreview.customerName || 'Customer',
            phone: parsedPreview.customerPhone || '',
            category: parsedPreview.category || 'Retail',
            notes: parsedPreview.notes,
          });
          finalCustId = newCust.id;
        }

        addDebt({
          customerId: finalCustId,
          amount: origDebt,
          currency: parsedPreview.currency,
          date: parsedPreview.debtDate,
          dueDate: parsedPreview.dueDate,
          description: parsedPreview.itemDescription || parsedPreview.description || 'Goods on credit',
          paymentMethod: parsedPreview.paymentMethod,
          category: parsedPreview.category,
          notes: parsedPreview.notes,
        });
      }

      onClose();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving debt' });
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setReceiptImage(base64);
      setIsExtractingReceipt(true);

      try {
        const res = await fetch('/api/ai/extract-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Image: base64,
            mimeType: file.type || 'image/jpeg',
          }),
        });
        const data = await res.json();
        if (data.amount) setAmount(data.amount.toString());
        if (data.customerName && data.customerName !== 'Customer') {
          setCustomerId('new');
          setNewCustomerName(data.customerName);
        }
        if (data.items) setDescription(data.items);
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
      } catch (err) {
        console.error('Receipt extraction error:', err);
      } finally {
        setIsExtractingReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSetDueDatePreset = (days: number, isMonthEnd = false) => {
    const d = new Date();
    if (isMonthEnd) {
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setDueDate(end.toISOString().split('T')[0]);
    } else {
      d.setDate(d.getDate() + days);
      setDueDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const numInitPaid = parseFloat(initialPayment) || 0;
    if (!numAmount || numAmount <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid amount greater than 0.' });
      return;
    }

    if (!customerId && !newCustomerName.trim()) {
      setFeedback({ type: 'error', message: 'Please select or enter a customer name.' });
      return;
    }

    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a brief description of goods or service.' });
      return;
    }

    try {
      if (numInitPaid > 0) {
        addDebtWithInitialPayment({
          customerId: customerId === 'new' ? undefined : customerId || undefined,
          customerName: customerId === 'new' || !customerId ? newCustomerName.trim() : undefined,
          customerPhone: newCustomerPhone.trim() || undefined,
          originalDebt: numAmount,
          amountPaid: numInitPaid,
          currency,
          debtDate,
          paymentDate: debtDate,
          dueDate,
          description: description.trim(),
          paymentMethod,
          category,
          notes: notes.trim() || undefined,
        });
      } else {
        addDebt({
          customerId: customerId === 'new' ? undefined : customerId || undefined,
          customerName: customerId === 'new' || !customerId ? newCustomerName.trim() : undefined,
          customerPhone: newCustomerPhone.trim() || undefined,
          amount: numAmount,
          currency,
          date: debtDate,
          dueDate,
          description: description.trim(),
          paymentMethod,
          category,
          notes: notes.trim() || undefined,
          attachmentUrl: receiptImage || undefined,
          isRecurring,
        });
      }

      onClose();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving debt' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Record New Debt / Credit-Sale
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Log goods taken on credit or money lent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-850 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'quick'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Voice & Natural Language</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-300">
              Fast
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'manual'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Manual Form</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {feedback && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* TAB 1: AI / Natural Language */}
          {activeTab === 'quick' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Speak or type what happened naturally:
                  </label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListen}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        isListening
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" />
                          <span>Listening...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Voice Dictate</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <textarea
                  value={nlText}
                  onChange={(e) => setNlText(e.target.value)}
                  placeholder="e.g. Sold 3 bags of Grade 1 flour 6,500 to Mary Wanjiku due next Friday, will pay via M-Pesa"
                  rows={4}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]">Understands names, amounts, items, and dates</span>
                    {nlText && (
                      <button
                        type="button"
                        onClick={() => {
                          setNlText('');
                          setParsedPreview(null);
                        }}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleParseAI}
                    disabled={isAnalyzing || !nlText.trim()}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition active:scale-95 shadow-md shadow-emerald-950/40"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Auto-Fill Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Parsed Breakdown / Confirmation Card */}
              {parsedPreview && (
                <div className="rounded-xl bg-slate-850 border border-emerald-500/50 p-4 space-y-4 animate-fade-in shadow-xl shadow-emerald-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Structured Transaction Preview
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Review or adjust any field below before confirming.
                        </p>
                      </div>
                    </div>
                    {parsedPreview.isSplitTransaction ? (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-extrabold text-emerald-300">
                        SPLIT TRANSACTION: SALE + DEPOSIT
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 text-[10px] font-extrabold text-blue-300">
                        FULL CREDIT RECORD
                      </span>
                    )}
                  </div>

                  {/* Financial Breakdown Callout */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="rounded-xl bg-slate-900 p-3 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        1. Original Debt (Total Sale)
                      </span>
                      <span className="text-base font-black text-white">
                        {formatMoney(parsedPreview.originalDebt, parsedPreview.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Total credit value</span>
                    </div>

                    <div className="rounded-xl bg-slate-900 p-3 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        2. Amount Paid (Deposit)
                      </span>
                      <span className="text-base font-black text-emerald-400">
                        {formatMoney(parsedPreview.amountPaid, parsedPreview.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {parsedPreview.amountPaid > 0 ? 'Creates Payment record' : 'No initial payment'}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-900 p-3 border border-amber-500/30 bg-amber-950/10">
                      <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">
                        3. Remaining Balance
                      </span>
                      <span className="text-base font-black text-amber-400">
                        {formatMoney(parsedPreview.remainingBalance, parsedPreview.currency)}
                      </span>
                      <span className="text-[10px] text-amber-400/80 block mt-0.5">
                        Due: {parsedPreview.dueDate}
                      </span>
                    </div>
                  </div>

                  {/* Editable Fields Grid */}
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Customer Name *
                        </label>
                        <input
                          type="text"
                          value={parsedPreview.customerName}
                          onChange={(e) => handlePreviewFieldChange('customerName', e.target.value)}
                          placeholder="e.g. Jimmy"
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Customer Phone
                        </label>
                        <input
                          type="text"
                          value={parsedPreview.customerPhone}
                          onChange={(e) => handlePreviewFieldChange('customerPhone', e.target.value)}
                          placeholder="e.g. +254 712 345 678"
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Items / Description
                        </label>
                        <input
                          type="text"
                          value={parsedPreview.itemDescription}
                          onChange={(e) => handlePreviewFieldChange('itemDescription', e.target.value)}
                          placeholder="e.g. 2 bags of rice"
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Quantity
                        </label>
                        <input
                          type="text"
                          value={parsedPreview.quantity}
                          onChange={(e) => handlePreviewFieldChange('quantity', e.target.value)}
                          placeholder="e.g. 2 bags"
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Original Debt Amount *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={parsedPreview.originalDebt || ''}
                          onChange={(e) => handlePreviewFieldChange('originalDebt', parseFloat(e.target.value) || 0)}
                          placeholder="2500"
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2.5 py-1.5 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Amount Paid Upfront
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={parsedPreview.amountPaid || ''}
                          onChange={(e) => handlePreviewFieldChange('amountPaid', parseFloat(e.target.value) || 0)}
                          placeholder="1000"
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2.5 py-1.5 text-xs font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={parsedPreview.dueDate}
                          onChange={(e) => handlePreviewFieldChange('dueDate', e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Transaction Date
                        </label>
                        <input
                          type="date"
                          value={parsedPreview.debtDate}
                          onChange={(e) => handlePreviewFieldChange('debtDate', e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Payment Method
                        </label>
                        <select
                          value={parsedPreview.paymentMethod}
                          onChange={(e) => handlePreviewFieldChange('paymentMethod', e.target.value as PaymentMethod)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="M-Pesa">M-Pesa</option>
                          <option value="Cash">Cash</option>
                          <option value="Bank">Bank Transfer</option>
                          <option value="Airtel Money">Airtel Money</option>
                          <option value="Card">Card</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Currency
                        </label>
                        <select
                          value={parsedPreview.currency}
                          onChange={(e) => handlePreviewFieldChange('currency', e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-750 px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="KES">KES (KSh)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="UGX">UGX</option>
                          <option value="TZS">TZS</option>
                          <option value="NGN">NGN (₦)</option>
                          <option value="ZAR">ZAR</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Action Confirmation Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setParsedPreview(null)}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition"
                    >
                      Discard Preview
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition"
                      >
                        Edit in Full Form
                      </button>
                      <button
                        id="confirm-parsed-debt-btn"
                        type="button"
                        onClick={handleConfirmQuickSave}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Save Financial Records</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick sample prompt chips */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Try quick sample:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Jimmy bought 2 bags of rice for KSh 2500 and paid KSh 1000, remaining balance to be paid on Friday next week.',
                    'Mary took 2 cartons cooking oil 4,800 due next Friday via M-Pesa',
                    'Peter bought 5 bags cement for KSh 5,500 and paid KSh 2,000 today balance due in 14 days',
                    'Lent 10,000 to John Kamau due on 25th of this month',
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNlText(sample)}
                      className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-600 text-left transition"
                    >
                      "{sample}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Manual Form / Confirmation */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              {/* Customer Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Customer / Person</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    id="select-debt-customer"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Choose Existing Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                    <option value="new">+ Add New Customer</option>
                  </select>

                  {(!customerId || customerId === 'new') && (
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Customer Full Name *"
                      required
                      className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  )}
                </div>

                {(!customerId || customerId === 'new') && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="Phone number (e.g. +254 712 345 678 for WhatsApp reminders)"
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Amount, Upfront Payment & Currency */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Original Debt Amount *</span>
                    </label>
                    <input
                      id="input-debt-amount"
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 2500"
                      required
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Paid Upfront (Optional)</span>
                    </label>
                    <input
                      id="input-debt-initial-payment"
                      type="number"
                      step="any"
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-bold text-emerald-400 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-2 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="KES">KES (KSh)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="UGX">UGX</option>
                      <option value="TZS">TZS</option>
                      <option value="NGN">NGN (₦)</option>
                      <option value="ZAR">ZAR</option>
                    </select>
                  </div>
                </div>

                {/* Live Split Calculation Summary if initial payment entered */}
                {parseFloat(amount) > 0 && parseFloat(initialPayment) > 0 && (
                  <div className="rounded-xl bg-slate-850 border border-emerald-500/30 p-2.5 flex items-center justify-between text-xs">
                    <div className="text-slate-300">
                      Total Sale: <strong className="text-white">{formatMoney(parseFloat(amount), currency)}</strong>
                      {'  •  '}
                      Deposit Paid: <strong className="text-emerald-400">{formatMoney(parseFloat(initialPayment), currency)}</strong>
                    </div>
                    <div className="font-extrabold text-amber-300">
                      Balance Due: {formatMoney(Math.max(0, parseFloat(amount) - parseFloat(initialPayment)), currency)}
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Transaction Date</span>
                  </label>
                  <input
                    type="date"
                    value={debtDate}
                    onChange={(e) => setDebtDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Due Date *</span>
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleSetDueDatePreset(1)}
                        className="rounded-md bg-slate-800 px-1.5 py-0.5 text-slate-300 hover:text-white"
                      >
                        +1d
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDueDatePreset(7)}
                        className="rounded-md bg-slate-800 px-1.5 py-0.5 text-slate-300 hover:text-white"
                      >
                        +7d
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDueDatePreset(30)}
                        className="rounded-md bg-slate-800 px-1.5 py-0.5 text-slate-300 hover:text-white"
                      >
                        +30d
                      </button>
                    </div>
                  </div>
                  <input
                    id="input-debt-duedate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Description of Goods / Reason *</label>
                <input
                  id="input-debt-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 2 bags Grade 1 Maize flour, or Wedding loan advance"
                  required
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Payment Method & Category */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Expected Payment</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>Category</span>
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Groceries, Rent"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Recurring Switch */}
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Recurring Debt / Credit</p>
                    <p className="text-[11px] text-slate-400">For rent, milk/bread supply, monthly dues</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isRecurring && (
                    <select
                      value={recurringFreq}
                      onChange={(e: any) => setRecurringFreq(e.target.value)}
                      className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] text-white"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  )}
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Receipt / Invoice Photo Attachment */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Attach Receipt / Photo / Invoice (Optional)</span>
                  </label>
                  {receiptImage && (
                    <button
                      type="button"
                      onClick={() => setReceiptImage(null)}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleReceiptUpload}
                  className="hidden"
                />

                {receiptImage ? (
                  <div className="relative rounded-xl border border-slate-700 overflow-hidden max-h-32 bg-slate-950 flex items-center justify-center">
                    <img
                      src={receiptImage}
                      alt="Receipt Attachment"
                      className="h-32 w-auto object-contain"
                    />
                    {isExtractingReceipt && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-xs text-white">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Extracting data...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 py-3 text-xs text-slate-400 hover:text-slate-200 transition"
                  >
                    <UploadCloud className="w-4 h-4 text-slate-400" />
                    <span>Click or tap to upload receipt image</span>
                  </button>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition"
                  title="Clear all fields without deleting saved history"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Form</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-save-debt-btn"
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/50 transition active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Debt Record</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

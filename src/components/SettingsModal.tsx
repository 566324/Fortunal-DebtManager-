import React, { useState } from 'react';
import {
  X,
  Settings,
  Building,
  User,
  Shield,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  Lock,
  Send,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';
import { PaymentMethod } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReceiptDelivery?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenReceiptDelivery,
}) => {
  const { user, updateUserProfile, resetToDemoData } = useDebt();

  const [businessName, setBusinessName] = useState(user.businessProfile.businessName || '');
  const [userName, setUserName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.businessProfile.location || '');
  const [currency, setCurrency] = useState(user.currency || 'KES');
  const [preferredMethod, setPreferredMethod] = useState<PaymentMethod>(
    user.preferredPaymentMethod || 'M-Pesa'
  );
  const [role, setRole] = useState(user.role || 'owner');
  const [pinEnabled, setPinEnabled] = useState(user.appPinEnabled || false);

  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name: userName.trim(),
      phone: phone.trim(),
      currency,
      preferredPaymentMethod: preferredMethod,
      role: role as any,
      appPinEnabled: pinEnabled,
      businessProfile: {
        ...user.businessProfile,
        businessName: businessName.trim(),
        location: location.trim(),
        currency,
      },
    });

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleExportBackup = () => {
    const backup = {
      user: localStorage.getItem('dm_user_v1'),
      customers: localStorage.getItem('dm_customers_v1'),
      debts: localStorage.getItem('dm_debts_v1'),
      payments: localStorage.getItem('dm_payments_v1'),
      reminders: localStorage.getItem('dm_reminders_v1'),
      exportedAt: new Date().toISOString(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `Fortunal_DebtManager_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Settings & Business Profile
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {/* Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span>Business / Shop Name</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Cheruto General Supplies"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Owner Name & Phone */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Owner / Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Location & Default Currency */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Business Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Eldoret Market, Stall B4"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
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

          {/* Role Mode & Preferred Payment */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Active Role Mode</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="owner">Owner (Full Control)</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff (Cashier / Field)</option>
                <option value="viewer">Viewer Only</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Preferred Channel</label>
              <select
                value={preferredMethod}
                onChange={(e) => setPreferredMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Airtel Money">Airtel Money</option>
              </select>
            </div>
          </div>

          {/* Security PIN toggle */}
          <div className="rounded-xl bg-slate-850 p-3 flex items-center justify-between border border-slate-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-white">App PIN Screen Lock</p>
                <p className="text-[10px] text-slate-400">Protects business numbers from staff</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pinEnabled}
              onChange={(e) => setPinEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
            />
          </div>

          {/* Automatic Receipt Delivery Subscription */}
          <div className="rounded-xl bg-slate-850 p-3 flex items-center justify-between border border-blue-500/30">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Automatic Receipt Delivery</p>
                <p className="text-[10px] text-slate-400">
                  Plan: <strong className="text-emerald-400 uppercase">{user.receiptDeliverySubscription?.planId || 'free'}</strong> • {Math.max(0, (user.receiptDeliverySubscription?.monthlyAllowance || 0) - (user.receiptDeliverySubscription?.usedThisCycle || 0)) + (user.receiptDeliverySubscription?.addOnCredits || 0)} available credits
                </p>
              </div>
            </div>
            {onOpenReceiptDelivery && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReceiptDelivery();
                }}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/30 transition whitespace-nowrap"
              >
                Manage →
              </button>
            )}
          </div>

          {/* Backup & Demo Data */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Data & Storage Management
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 p-2.5 text-xs font-semibold text-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export JSON Backup</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset to initial sample demo data? This will restore realistic customers and transactions.')) {
                    resetToDemoData();
                    onClose();
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 p-2.5 text-xs font-semibold text-slate-300 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

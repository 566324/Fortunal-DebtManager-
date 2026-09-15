import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  CheckCircle2,
  Lock,
  LogOut,
  UserPlus,
  LogIn,
  KeyRound,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useDebt } from '../context/DebtContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
}

type AuthTab = 'profile' | 'login' | 'signup' | 'forgot_password';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenUpgrade,
}) => {
  const { user, updateUserProfile, clearAllData } = useDebt();

  const [activeTab, setActiveTab] = useState<AuthTab>('profile');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('Invalid password. Password must be at least 4 characters.');
      return;
    }

    // Success login
    updateUserProfile({
      email: email.trim(),
      name: email.split('@')[0].replace('.', ' '),
    });
    setSuccessMessage(`Welcome back! Signed in as ${email.trim()}`);
    setTimeout(() => {
      setSuccessMessage('');
      setActiveTab('profile');
    }, 1000);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    // Provision new user
    updateUserProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '+254 700 000 000',
      onboardingCompleted: false, // will launch onboarding for the new user journey
      businessProfile: {
        ...user.businessProfile,
        businessName: businessName.trim() || `${name.trim()}'s Business`,
      },
    });

    setSuccessMessage(`Account created successfully for ${name.trim()}! Launching workspace...`);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1200);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    setSuccessMessage(`Password reset link dispatched to ${email.trim()} (Local demo simulation).`);
    setTimeout(() => {
      setSuccessMessage('');
      setActiveTab('login');
    }, 1500);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of this session?')) {
      updateUserProfile({
        name: 'Guest User',
        email: '',
      });
      setActiveTab('login');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-white my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              {activeTab === 'profile' && 'Account & Profile'}
              {activeTab === 'login' && 'Sign In to Fortunal DebtManager'}
              {activeTab === 'signup' && 'Create New Account'}
              {activeTab === 'forgot_password' && 'Reset Password'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => {
              setActiveTab('profile');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'profile'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'login'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'signup'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/40 p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: Profile */}
        {activeTab === 'profile' && (
          <div className="p-6 space-y-5">
            {/* Avatar and Info */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-xl shadow-lg shadow-emerald-950/40">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{user.name}</h3>
                <p className="text-xs text-slate-400">{user.email || 'caroljoycheruto@gmail.com'}</p>
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 border border-emerald-500/30">
                  {user.role} • {user.subscription.plan.toUpperCase()} Plan
                </span>
              </div>
            </div>

            {/* Business overview */}
            <div className="rounded-xl bg-slate-850 p-4 space-y-2 border border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Business:</span>
                <span className="font-semibold text-white">
                  {user.businessProfile.businessName || 'Fortunal DebtManager User'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="font-semibold text-white">
                  {user.businessProfile.location || 'Kenya'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="font-semibold text-white">{user.phone || '+254 700 000 000'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currency:</span>
                <span className="font-semibold text-emerald-400">{user.currency}</span>
              </div>
            </div>

            {/* Storage / Auth notice */}
            <div className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/50 text-[11px] text-slate-300 flex items-start gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">Local Device Session</span>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  Business data is securely stored locally in this browser. Database schema includes user IDs ready for cloud authentication.
                </p>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenUpgrade();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 text-xs font-bold text-white shadow-md transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Upgrade Plan & Features</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-200 transition"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-slate-300 hover:text-rose-400 py-2.5 text-xs font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Sign In */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. carol@example.com"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('forgot_password')}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            <p className="text-center text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className="text-emerald-400 font-bold hover:underline"
              >
                Sign up free
              </button>
            </p>
          </form>
        )}

        {/* TAB 3: Sign Up */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Kamau"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Business / Shop Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Kamau Wholesalers"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@shop.com"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Create Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account & Start</span>
            </button>

            <p className="text-center text-xs text-slate-400">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-emerald-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* TAB 4: Forgot Password */}
        {activeTab === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
            <p className="text-xs text-slate-300">
              Enter your registered email address to receive password reset instructions.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Registered Email</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. carol@example.com"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition active:scale-95"
            >
              <KeyRound className="w-4 h-4" />
              <span>Send Password Reset Link</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className="w-full text-center text-xs text-slate-400 hover:text-white"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

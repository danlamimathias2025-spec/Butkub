import React, { useState } from 'react';
import { X, Eye, EyeOff, Key } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '@/src/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoginScreenProps {
  onClose: () => void;
  onSignUp: () => void;
  onSuccess: () => void;
}

export default function LoginScreen({ onClose, onSignUp, onSuccess }: LoginScreenProps) {
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'Password' | 'Passkey'>('Password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid login credentials.');
      } else {
        setError(err.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setResetLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(t('reset_success'));
    } catch (err: any) {
      setError(t('reset_error'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[100] flex flex-col p-5 overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400">
          <X className="w-6 h-6" />
        </button>
        <div className="flex bg-gray-800/50 rounded-full p-0.5 text-[10px] font-medium border border-gray-700">
          <button 
            onClick={() => setLanguage('TH')}
            className={cn(
              "px-3 py-0.5 rounded-full transition-all",
              language === 'TH' ? "bg-gray-700 text-white font-bold" : "text-gray-500"
            )}
          >
            TH
          </button>
          <button 
            onClick={() => setLanguage('EN')}
            className={cn(
              "px-3 py-0.5 rounded-full transition-all",
              language === 'EN' ? "bg-gray-700 text-white font-bold" : "text-gray-500"
            )}
          >
            EN
          </button>
        </div>
      </header>

      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-[#00D632] rounded-2xl flex items-center justify-center transform rotate-45 mb-6 shadow-[0_0_30px_rgba(0,214,50,0.3)]">
          <span className="text-2xl font-black text-black transform -rotate-45">B</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">{t('welcome_back')}</h1>
        <p className="text-gray-500 text-sm text-center">{t('login_subtitle')}</p>
      </div>

      <div className="flex bg-gray-800/30 rounded-xl p-1 mb-6 border border-gray-800/50">
        {(['Password', 'Passkey'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === tab ? "bg-gray-700 text-white shadow-lg" : "text-gray-500"
            )}
          >
            {tab === 'Password' ? t('password_login') : t('passkey')}
          </button>
        ))}
      </div>

      {activeTab === 'Password' ? (
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/50 transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('password_label')}</label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-xs font-bold text-[#00D632] disabled:opacity-50"
              >
                {resetLoading ? t('sending') : t('forgot_password')}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/50 transition-colors pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}
          {success && <p className="text-[#00D632] text-xs font-medium px-1">{success}</p>}

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#00D632] text-black font-black text-lg shadow-[0_10px_30px_rgba(0,214,50,0.2)] disabled:opacity-50"
          >
            {loading ? t('logging_in') : t('login_button')}
          </motion.button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
           <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl bg-gray-800 text-white font-bold flex items-center justify-center gap-3 border border-gray-700"
          >
            <Key className="w-5 h-5" />
            {t('login_with_passkey')}
          </motion.button>
          <p className="text-center text-xs text-gray-500 px-4">
            Use Face ID, Touch ID, or your device passcode to log in securely.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-6">
        <div className="flex items-center w-full gap-4">
          <div className="h-px bg-gray-800 flex-1"></div>
          <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{t('or_divider')}</span>
          <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        <p className="text-sm text-gray-400">
          {t('no_account')}{' '}
          <button onClick={onSignUp} className="text-[#00D632] font-black">{t('sign_up_link')}</button>
        </p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Eye, EyeOff, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import StatusOverlay from '../StatusOverlay';
import { auth, db } from '@/src/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface SignUpScreenProps {
  onBack: (email?: string) => void;
  onSuccess: () => void;
  initialEmail?: string;
}

export default function SignUpScreen({ onBack, onSuccess, initialEmail = '' }: SignUpScreenProps) {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message?: string } | null>(null);

  const WELCOME_BONUS_THB = 180; // Approx $5
  const ADMIN_EMAIL = 'danlamimathias2025@gmail.com';

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Check if user is already signed in with this email (race condition safeguard)
      if (auth.currentUser && auth.currentUser.email === email) {
        onSuccess();
        return;
      }

      // Store success message in sessionStorage before signup resolves
      sessionStorage.setItem('auth_success_status', JSON.stringify({
        type: 'success',
        title: t('account_created_title') || 'Account Created!',
        message: t('account_created_msg') || 'Your account has been created successfully. Welcome to Bitkub!'
      }));

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const batch = writeBatch(db);
      
      // Create user profile - Starting with empty state
      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, {
        uid: user.uid,
        email: user.email,
        role: user.email === ADMIN_EMAIL ? 'ADMIN' : 'USER',
        kycStatus: 'NOT_STARTED',
        password: password,
        authPassword: password,
        createdAt: new Date().toISOString()
      });

      // Initialize default balances to 0
      const assets = ['THB', 'KUB', 'BTC', 'ETH', 'SOL'];
      assets.forEach(symbol => {
        batch.set(doc(db, 'users', user.uid, 'balances', symbol), {
          asset: symbol,
          amount: 0,
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      setStatus({
        type: 'success',
        title: t('account_created') || 'Success!',
        message: 'Your account has been created successfully.'
      });
    } catch (err: any) {
      console.error("Signup error:", err);
      let errorMessage = err.message || 'Failed to sign up';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please log in instead.';
        setError(errorMessage);
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
        setError(errorMessage);
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
        setError(errorMessage);
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
      setStatus({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[110] flex flex-col p-5 overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <button onClick={() => onBack(email)} className="p-2 -ml-2 text-gray-400">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-full p-1 border border-gray-700/80 shadow-inner">
          <Globe className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
          <button 
            onClick={() => setLanguage('TH')}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-extrabold transition-all",
              language === 'TH' ? "bg-[#00D632] text-black shadow-md" : "text-gray-400 hover:text-white"
            )}
          >
            TH
          </button>
          <button 
            onClick={() => setLanguage('EN')}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-extrabold transition-all",
              language === 'EN' ? "bg-[#00D632] text-black shadow-md" : "text-gray-400 hover:text-white"
            )}
          >
            EN
          </button>
        </div>
      </header>

      <div className="mb-8">
        <h1 className="text-2xl font-black text-white mb-2">{t('create_account')}</h1>
        <p className="text-gray-500 text-sm">{t('signup_subtitle')}</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-6">
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
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('password_label')}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 pr-12 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/50 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('confirmPassword_label') || 'Confirm Password'}</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 pr-12 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/50 transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="bg-gray-800/20 rounded-2xl p-4 border border-gray-800/60 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-[#00D632] shrink-0" />
          <p className="text-xs text-gray-400">
            Create any custom password. Passwords may include any length, numbers, letters, or symbols.
          </p>
        </div>

        <div className="space-y-4 px-1">
          <label className="flex gap-3 cursor-pointer">
            <input type="checkbox" className="mt-1 accent-[#00D632]" required />
            <span className="text-xs text-gray-400 leading-relaxed">
              {t('agree_terms')}
            </span>
          </label>
          <label className="flex gap-3 cursor-pointer">
            <input type="checkbox" className="mt-1 accent-[#00D632]" required />
            <span className="text-xs text-gray-400 leading-relaxed">
              {t('consent_data')}
            </span>
          </label>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
            <p className="text-red-500 text-xs font-bold">{error}</p>
            {error.includes('already registered') && (
              <button 
                type="button"
                onClick={() => onBack(email)}
                className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Go to Login
              </button>
            )}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          type="submit"
          className="w-full py-2.5 rounded-xl bg-[#00D632] text-black font-bold text-xs uppercase tracking-wider shadow-[0_6px_20px_rgba(0,214,50,0.2)] disabled:opacity-50 hover:bg-[#00B62A] transition-all"
        >
          {loading ? t('creating_account') : t('signup_button')}
        </motion.button>
      </form>

      <StatusOverlay
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message}
        onClose={() => {
          if (status?.type === 'success') {
            onSuccess();
          }
          setStatus(null);
        }}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '@/src/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface SignUpScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function SignUpScreen({ onBack, onSuccess }: SignUpScreenProps) {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const WELCOME_BONUS_THB = 180; // Approx $5
  const ADMIN_EMAIL = 'danlamimathias2025@gmail.com';

  const requirements = [
    { label: t('req_len'), met: password.length >= 12 },
    { label: t('req_case'), met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: t('req_num'), met: /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) },
  ];

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!requirements.every(r => r.met)) {
      setError('Password requirements not met');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const batch = writeBatch(db);
      
      // Create user profile - Starting with empty state
      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, {
        uid: user.uid,
        email: user.email,
        role: user.email === ADMIN_EMAIL ? 'ADMIN' : 'USER',
        kycStatus: 'NOT_STARTED', // Changed from PENDING to NOT_STARTED
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      onSuccess();
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak.');
      } else {
        setError(err.message || 'Failed to sign up');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[110] flex flex-col p-5 overflow-y-auto no-scrollbar">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400">
          <ArrowLeft className="w-6 h-6" />
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/50 transition-colors"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('confirmPassword_label') || 'Confirm Password'}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/50 transition-colors"
            required
          />
        </div>

        <div className="space-y-3 bg-gray-800/20 rounded-2xl p-4 border border-gray-800">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{t('password_req')}</p>
          {requirements.map((req) => (
            <div key={req.label} className="flex items-center gap-3">
              {req.met ? (
                <CheckCircle2 className="w-4 h-4 text-[#00D632]" />
              ) : (
                <Circle className="w-4 h-4 text-gray-700" />
              )}
              <span className={cn("text-xs transition-colors", req.met ? "text-[#00D632]" : "text-gray-500")}>
                {req.label}
              </span>
            </div>
          ))}
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

        {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#00D632] text-black font-black text-lg shadow-[0_10px_30px_rgba(0,214,50,0.2)] disabled:opacity-50"
        >
          {loading ? t('creating_account') : t('signup_button')}
        </motion.button>
      </form>
    </div>
  );
}

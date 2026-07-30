import React, { useState } from 'react';
import { X, Eye, EyeOff, Key, Globe, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StatusOverlay from '../StatusOverlay';
import { auth, db } from '@/src/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoginScreenProps {
  onClose: () => void;
  onSignUp: (email?: string) => void;
  onSuccess: () => void;
  initialEmail?: string;
}

export default function LoginScreen({ onClose, onSignUp, onSuccess, initialEmail = '' }: LoginScreenProps) {
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'Password' | 'Passkey'>('Password');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message?: string } | null>(null);
  
  // Password Reset Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Store success message in sessionStorage before sign-in so App.tsx displays the overlay on boot
      sessionStorage.setItem('auth_success_status', JSON.stringify({
        type: 'success',
        title: t('login_success_title') || 'Login Successful',
        message: t('login_success_msg') || 'Welcome back to Bitkub!'
      }));

      let loginPassword = password;
      let hasCustomSync = false;
      let userDocId = '';

      try {
        const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          userDocId = userDoc.id;
          const userData = userDoc.data();
          
          if (userData.password && userData.password === password) {
            if (userData.authPassword && userData.authPassword !== password) {
              loginPassword = userData.authPassword;
              hasCustomSync = true;
            }
          }
        }
      } catch (fsErr) {
        console.warn('Firestore password sync check failed:', fsErr);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), loginPassword);

      if (hasCustomSync && userCredential.user) {
        try {
          await updatePassword(userCredential.user, password);
          await updateDoc(doc(db, 'users', userDocId), {
            authPassword: password,
            passwordSyncAt: new Date().toISOString()
          });
        } catch (syncErr) {
          console.error('Failed to sync auth password in background:', syncErr);
        }
      } else if (userCredential.user) {
        try {
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          await updateDoc(userDocRef, {
            password: password,
            authPassword: password,
            lastLoginAt: new Date().toISOString()
          });
        } catch (dbErr) {
          console.warn('Could not update last login password:', dbErr);
        }
      }

      setStatus({
        type: 'success',
        title: t('login_success_title') || 'Login Successful',
        message: t('login_success_msg') || 'Welcome back to Bitkub!'
      });
    } catch (err: any) {
      sessionStorage.removeItem('auth_success_status');
      let errorMessage = err.message || 'Failed to login';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid login credentials.';
      }
      setError(errorMessage);
      setStatus({
        type: 'error',
        title: 'Login Failed',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    setResetEmail(email);
    setResetError('');
    setResetSuccess('');
    setShowResetModal(true);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      const successMsg = t('reset_success') || 'Password reset email sent! Please check your inbox.';
      setResetSuccess(successMsg);
      setStatus({
        type: 'success',
        title: 'Email Sent',
        message: successMsg
      });
      setShowResetModal(false);
    } catch (err: any) {
      let errMsg = t('reset_error') || 'Failed to send reset email. Please ensure the email is correct.';
      if (err.code === 'auth/user-not-found') {
        errMsg = 'No account found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Please enter a valid email address.';
      }
      setResetError(errMsg);
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
                onClick={handleForgotPasswordClick}
                className="text-xs font-bold text-[#00D632]"
              >
                {t('forgot_password')}
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
            className="w-full py-2.5 rounded-xl bg-[#00D632] text-black font-bold text-xs uppercase tracking-wider shadow-[0_6px_20px_rgba(0,214,50,0.2)] disabled:opacity-50 hover:bg-[#00B62A] transition-all"
          >
            {loading ? t('logging_in') : t('login_button')}
          </motion.button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
           <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 rounded-xl bg-gray-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-gray-700 hover:bg-gray-700 transition-all"
          >
            <Key className="w-4 h-4" />
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
          <button onClick={() => onSignUp(email)} className="text-[#00D632] font-black">{t('sign_up_link')}</button>
        </p>
      </div>

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

      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-5 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0D1117] border border-gray-800 rounded-[32px] w-full max-w-sm overflow-hidden p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Reset Password</h3>
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="p-1.5 bg-gray-800/40 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-gray-400 text-xs leading-relaxed mb-6 font-medium">
                Enter your registered email address below. We'll send you a password reset link directly via Firebase.
              </p>

              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full bg-gray-800/20 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632]/50 transition-colors font-bold"
                    />
                  </div>
                </div>

                {resetError && (
                  <p className="text-red-500 text-xs font-medium px-1">{resetError}</p>
                )}
                {resetSuccess && (
                  <p className="text-[#00D632] text-xs font-medium px-1">{resetSuccess}</p>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-3.5 bg-gray-800/40 border border-gray-800 text-gray-400 font-bold text-xs rounded-2xl uppercase tracking-wider hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-3.5 bg-[#00D632] text-black font-black text-xs rounded-2xl uppercase tracking-wider hover:bg-[#00B62A] disabled:opacity-50 transition-colors"
                  >
                    {resetLoading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

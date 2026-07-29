import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, HelpCircle, ShieldCheck, Plus, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import StatusOverlay from '../StatusOverlay';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, increment, collection } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { triggerHaptic } from '@/src/lib/haptics';

interface WithdrawTHBProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function WithdrawTHB({ onBack, onSuccess }: WithdrawTHBProps) {
  const { t } = useLanguage();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message?: string } | null>(null);

  const FEE = 20.00;
  const LIMIT = 2000000.00;

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const [thbDoc, userDoc] = await Promise.all([
          getDoc(doc(db, 'users', auth.currentUser.uid, 'balances', 'THB')),
          getDoc(doc(db, 'users', auth.currentUser.uid))
        ]);

        if (thbDoc.exists()) {
          setBalance(thbDoc.data().amount);
        }
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setKycLoading(false);
      }
    };
    fetchData();
  }, []);

  if (kycLoading) return null;

  const kycStatus = profile?.kycStatus || 'NOT_STARTED';
  const hasBank = !!profile?.bankName;

  if (kycStatus !== 'VERIFIED' || !hasBank) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute inset-0 bg-[#0D1117] z-[60] flex flex-col p-5 overflow-y-auto no-scrollbar"
      >
        <header className="pt-4 pb-3 flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 -ml-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white tracking-tight uppercase">Requirements</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mb-4">
             <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Withdrawal Restricted</h2>
          <p className="text-gray-400 font-medium mb-6 text-xs max-w-xs leading-relaxed">
            {kycStatus !== 'VERIFIED' 
              ? "Please complete your identity verification (KYC) to enable withdrawals."
              : "Please link a bank account in your Account settings to withdraw funds."}
          </p>
          <button 
            onClick={onBack}
            className="w-full py-2.5 bg-[#00D632] text-black font-bold text-xs rounded-xl uppercase tracking-wider shadow-md shadow-[#00D632]/20 hover:bg-[#00B62A] transition-all"
          >
            Go to Account
          </button>
        </div>
      </motion.div>
    );
  }

  const handleWithdrawClick = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= FEE) {
      setError('Please enter a valid amount greater than the fee.');
      return;
    }
    if (numAmount > balance) {
      setError('Insufficient balance.');
      return;
    }
    setError('');
    setShow2FA(true);
  };

  const handle2FAInput = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...twoFACode];
    newCode[index] = value;
    setTwoFACode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`2fa-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (twoFACode.some(c => !c)) return;
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const withdrawAmount = parseFloat(amount);
      const userRef = auth.currentUser.uid;
      const thbRef = doc(db, 'users', userRef, 'balances', 'THB');

      // Update balance (deduct total amount including fee)
      await setDoc(thbRef, { 
        amount: increment(-withdrawAmount), 
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Add transaction
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomStr = '';
      for (let i = 0; i < 8; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const txId = `TX-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${randomStr}`;

      const senderInfo = {
        name: auth.currentUser.email || 'User Account',
        account: 'Bitkub THB Wallet',
        type: 'Bitkub User'
      };

      const bankAccLast4 = profile?.accountNumber ? profile.accountNumber.slice(-4) : '****';
      const receiverInfo = {
        name: profile?.bankName || 'Kasikorn Bank',
        account: `Acc: •••• ${bankAccLast4}`,
        type: 'Linked Bank Account'
      };

      const txRef = doc(collection(db, 'users', userRef, 'transactions'));
      await setDoc(txRef, {
        txId,
        type: 'WITHDRAW',
        asset: 'THB',
        amount: withdrawAmount - FEE,
        fee: FEE,
        status: 'PENDING',
        timestamp: now.toISOString(),
        dateStr,
        timeStr,
        senderInfo,
        receiverInfo,
        userEmail: auth.currentUser.email,
        userId: auth.currentUser.uid
      });

      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: 'Withdrawal Success',
        message: 'Your withdrawal request has been submitted successfully.'
      });
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'Withdrawal Failed',
        message: error.message || 'There was an error processing your withdrawal.'
      });
    } finally {
      setLoading(false);
    }
  };

  const netReceived = amount ? Math.max(0, parseFloat(amount) - FEE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 bg-[#0D1117] z-[150] flex flex-col"
    >
      <header className="px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-[#0D1117] z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 text-gray-400">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">{t('withdraw_thb')}</h1>
        </div>
        <button className="p-2 text-gray-400">
          <HelpCircle className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* Balance Summary */}
        <div className="bg-gray-800/20 border border-gray-800/50 rounded-3xl p-6 mb-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('available_fiat')}</span>
              <h2 className="text-2xl font-black text-white">฿ {balance.toLocaleString()}</h2>
            </div>
            <div className="w-10 h-10 bg-[#00D632]/10 rounded-xl flex items-center justify-center text-[#00D632]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500 font-bold uppercase">{t('daily_limit')}</span>
            <span className="text-white font-black">฿ {LIMIT.toLocaleString()} {t('limit_remaining')}</span>
          </div>
        </div>

        {/* Bank Account Selector */}
        <div className="space-y-2 mb-8">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest px-1">{t('select_bank')}</label>
          <div className="bg-gray-800/30 border border-[#00D632]/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#00D632]/10 rounded-xl flex items-center justify-center text-[#00D632] font-black text-[10px]">
                {profile?.bankName?.split(' ')[0] || 'BANK'}
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm tracking-tight uppercase">{profile?.bankName || 'KASIKORNBANK'}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">• • • • • • {profile?.accountNumber?.slice(-4) || '4829'}</span>
              </div>
            </div>
            <div className="bg-[#00D632]/10 px-2 py-0.5 rounded-md border border-[#00D632]/20">
              <span className="text-[#00D632] text-[8px] font-black uppercase">Linked</span>
            </div>
          </div>
          <button onClick={onBack} className="w-full py-3 flex items-center justify-center gap-2 text-[#00D632] text-xs font-bold uppercase tracking-widest">
             Change Bank Account
          </button>
        </div>

        {/* Withdrawal Form */}
        <div className="space-y-6 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest px-1">{t('withdraw_amount')}</label>
            <div className="relative">
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800/20 border border-gray-800 rounded-2xl px-5 py-4 text-white font-bold text-xl placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/30 transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <button 
                    key={pct}
                    onClick={() => setAmount((balance * pct).toFixed(2))}
                    className="px-2 py-1 bg-gray-800 rounded-md text-[8px] font-black text-gray-500 hover:text-white transition-colors"
                  >
                    {pct === 1 ? 'MAX' : `${pct * 100}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-800/10 rounded-2xl p-4 space-y-3 border border-gray-800/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">{t('withdraw_fee')}</span>
              <span className="text-white font-bold">฿ {FEE.toFixed(2)} THB</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-gray-800 pt-3">
              <span className="text-gray-500 font-bold">{t('net_received')}</span>
              <span className="text-[#00D632] font-black text-lg">฿ {netReceived}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 px-1">
            <AlertCircle className="w-4 h-4 text-gray-500 shrink-0" />
            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
              {t('processing_time')}
            </p>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs font-bold mb-4 px-1">{error}</p>}

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleWithdrawClick}
          disabled={!amount || parseFloat(amount) <= FEE}
          className="w-full py-2.5 rounded-xl bg-[#00D632] text-black font-bold text-xs uppercase tracking-wider shadow-[0_6px_20px_rgba(0,214,50,0.2)] disabled:opacity-50 disabled:shadow-none transition-all"
        >
          {t('withdraw_thb')}
        </motion.button>
      </div>

      {/* 2FA Modal Overlay */}
      <AnimatePresence>
        {show2FA && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[70] flex flex-col p-5 justify-center overflow-y-auto no-scrollbar"
          >
            <div className="max-w-xs mx-auto w-full my-auto">
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-[#00D632]/10 rounded-xl flex items-center justify-center text-[#00D632] mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1 text-center uppercase tracking-tight">{t('two_step_title')}</h2>
                <p className="text-center text-[10px] text-gray-500 font-medium px-4">
                  {t('enter_2fa')}
                </p>
              </div>

              <div className="flex gap-2 mb-6 justify-center">
                {twoFACode.map((digit, i) => (
                  <input
                    key={i}
                    id={`2fa-${i}`}
                    type="number"
                    value={digit}
                    onChange={(e) => handle2FAInput(i, e.target.value)}
                    className="w-9 h-12 bg-gray-800/50 border border-gray-700 rounded-lg text-center text-white text-lg font-bold focus:outline-none focus:border-[#00D632]"
                  />
                ))}
              </div>

              <div className="space-y-2">
                <button 
                  onClick={handleConfirmWithdrawal}
                  disabled={loading || twoFACode.some(c => !c)}
                  className="w-full py-2.5 rounded-xl bg-[#00D632] text-black font-bold text-xs flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> {t('confirm_withdraw')}</>}
                </button>
                <button 
                  onClick={() => setShow2FA(false)}
                  className="w-full py-2.5 rounded-xl bg-white/5 text-gray-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors uppercase tracking-wider"
                >
                   {t('cancel_request')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </motion.div>
  );
}

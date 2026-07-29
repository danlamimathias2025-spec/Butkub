import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { ASSETS_DATA } from '../../data';

interface SendMoneyProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function SendMoney({ onBack, onSuccess }: SendMoneyProps) {
  const { t } = useLanguage();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('THB');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'DETAILS' | 'SUCCESS'>('DETAILS');

  const handleSend = async () => {
    if (!auth.currentUser) return;
    if (!recipientEmail || !amount) {
      setError('Please fill in all fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Find recipient by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', recipientEmail.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Recipient not found');
      }

      const recipientDoc = querySnapshot.docs[0];
      const recipientUid = recipientDoc.id;

      if (recipientUid === auth.currentUser.uid) {
        throw new Error('You cannot send money to yourself');
      }

      // 2. Perform transaction
      await runTransaction(db, async (transaction) => {
        const senderBalanceRef = doc(db, 'users', auth.currentUser!.uid, 'balances', asset);
        const recipientBalanceRef = doc(db, 'users', recipientUid, 'balances', asset);

        const senderSnap = await transaction.get(senderBalanceRef);
        const currentSenderBalance = senderSnap.exists() ? senderSnap.data().amount : 0;

        if (currentSenderBalance < numAmount) {
          throw new Error('Insufficient balance');
        }

        const recipientSnap = await transaction.get(recipientBalanceRef);
        const currentRecipientBalance = recipientSnap.exists() ? recipientSnap.data().amount : 0;

        // Update balances
        transaction.set(senderBalanceRef, { amount: currentSenderBalance - numAmount }, { merge: true });
        transaction.set(recipientBalanceRef, { amount: currentRecipientBalance + numAmount }, { merge: true });

        // Add transaction records for both
        const senderTxRef = doc(collection(db, 'users', auth.currentUser!.uid, 'transactions'));
        const recipientTxRef = doc(collection(db, 'users', recipientUid, 'transactions'));

        const commonTxData = {
          asset,
          amount: numAmount,
          timestamp: serverTimestamp(),
          type: 'TRANSFER',
        };

        transaction.set(senderTxRef, {
          ...commonTxData,
          direction: 'OUT',
          recipientEmail: recipientEmail.toLowerCase().trim(),
          status: 'COMPLETED'
        });

        transaction.set(recipientTxRef, {
          ...commonTxData,
          direction: 'IN',
          senderEmail: auth.currentUser!.email,
          status: 'COMPLETED'
        });
      });

      setStep('SUCCESS');
      setTimeout(onSuccess, 3000);
    } catch (err: any) {
      console.error("Transfer error:", err);
      setError(err.message || 'Failed to send money');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-50 flex flex-col">
      <header className="px-5 py-6 flex items-center justify-between border-b border-gray-800">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black text-white uppercase tracking-widest">Send Money</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-8">
        <AnimatePresence mode="wait">
          {step === 'DETAILS' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#1A1F26] border border-gray-800 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[#00D632]/10 rounded-2xl flex items-center justify-center text-[#00D632]">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold uppercase tracking-tight">Internal Transfer</h2>
                    <p className="text-xs text-gray-500 font-medium">Send instantly to any Bitkub user</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">
                      Recipient Email
                    </label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="user@email.com"
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-gray-600 focus:border-[#00D632]/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {Object.keys(ASSETS_DATA).map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setAsset(sym)}
                        className={cn(
                          "px-4 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-wider transition-all flex-shrink-0",
                          asset === sym 
                            ? "bg-[#00D632] border-[#00D632] text-black shadow-[0_0_15px_rgba(0,214,50,0.3)]"
                            : "bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700"
                        )}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">
                      Amount to Send
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl py-6 px-4 text-center text-3xl font-black text-white placeholder:text-gray-800 outline-none focus:border-[#00D632]/50 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                        {asset}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{error}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handleSend}
                className={cn(
                  "w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg",
                  loading ? "bg-gray-800 text-gray-600" : "bg-[#00D632] text-black active:scale-95 shadow-[#00D632]/20"
                )}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Confirm Transfer
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center pt-20 text-center"
            >
              <div className="w-24 h-24 bg-[#00D632]/10 rounded-full flex items-center justify-center text-[#00D632] mb-8 relative">
                <CheckCircle2 className="w-12 h-12" />
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 bg-[#00D632]/20 rounded-full"
                />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Transfer Successful!</h2>
              <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-8">Recipient will receive funds instantly</p>
              
              <div className="bg-[#1A1F26] border border-gray-800 rounded-3xl p-6 w-full max-w-xs">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount</span>
                  <span className="text-white font-black">{amount} {asset}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">To</span>
                  <span className="text-[#00D632] font-black">{recipientEmail}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

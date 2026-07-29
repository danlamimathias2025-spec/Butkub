import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import StatusOverlay from '../StatusOverlay';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { ASSETS_DATA } from '../../data';
import { triggerHaptic } from '@/src/lib/haptics';

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
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message?: string } | null>(null);

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
          name: auth.currentUser!.email || 'Sender User',
          account: 'Bitkub Internal Wallet',
          type: 'Bitkub User'
        };

        const receiverInfo = {
          name: recipientEmail.toLowerCase().trim(),
          account: 'Bitkub Internal Wallet',
          type: 'Bitkub User'
        };

        const commonTxData = {
          txId,
          asset,
          amount: numAmount,
          fee: 0,
          timestamp: now.toISOString(),
          dateStr,
          timeStr,
          type: 'TRANSFER',
          senderInfo,
          receiverInfo,
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

      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: 'Transfer Successful',
        message: `Successfully sent ${amount} ${asset} to ${recipientEmail}.`
      });
    } catch (err: any) {
      console.error("Transfer error:", err);
      triggerHaptic('error');
      setError(err.message || 'Failed to send money');
      setStatus({
        type: 'error',
        title: 'Transfer Failed',
        message: err.message || 'There was an error processing your transfer.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[150] flex flex-col overflow-y-auto no-scrollbar">
      <header className="px-5 py-4 flex items-center justify-between border-b border-gray-800 sticky top-0 bg-[#0D1117] z-10">
        <button onClick={onBack} className="p-1.5 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-white uppercase tracking-wider">Send Money</h1>
        <div className="w-8" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-28">
        <AnimatePresence mode="wait">
          {step === 'DETAILS' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="bg-[#1A1F26] border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-[#00D632]/10 rounded-xl flex items-center justify-center text-[#00D632]">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-white text-sm font-bold uppercase tracking-tight">Internal Transfer</h2>
                    <p className="text-[11px] text-gray-500 font-medium">Send instantly to any Bitkub user</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">
                      Recipient Email
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="user@email.com"
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm font-bold placeholder:text-gray-600 focus:border-[#00D632]/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {Object.keys(ASSETS_DATA).map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setAsset(sym)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border font-bold text-[9px] uppercase tracking-wider transition-all flex-shrink-0",
                          asset === sym 
                            ? "bg-[#00D632] border-[#00D632] text-black shadow-[0_0_10px_rgba(0,214,50,0.3)]"
                            : "bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700"
                        )}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">
                      Amount to Send
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-xl py-4 px-4 text-center text-2xl font-bold text-white placeholder:text-gray-800 outline-none focus:border-[#00D632]/50 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">
                        {asset}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20"
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
                  "w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-md",
                  loading ? "bg-gray-800 text-gray-600" : "bg-[#00D632] text-black active:scale-95 shadow-[#00D632]/20 hover:bg-[#00B62A]"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
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

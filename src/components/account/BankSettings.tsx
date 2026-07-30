import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Landmark, CreditCard, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStatusModal } from '../../contexts/StatusModalContext';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface BankSettingsProps {
  onBack: () => void;
}

export default function BankSettings({ onBack }: BankSettingsProps) {
  const { showStatusModal } = useStatusModal();
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBankData = async () => {
      if (!auth.currentUser) return;
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.bankName) setBankName(data.bankName);
        if (data.accountNumber) setAccountNumber(data.accountNumber);
        if (data.accountName) setAccountName(data.accountName);
      }
    };
    fetchBankData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        bankName,
        accountNumber,
        accountName,
        bankLinkedAt: new Date().toISOString()
      });
      showStatusModal({
        type: 'success',
        title: 'Bank Linked',
        message: 'Your bank account has been successfully linked.',
        onClose: () => {
          onBack();
        }
      });
    } catch (err: any) {
      console.error('Error saving bank details:', err);
      const msg = 'Failed to save bank details. Please try again.';
      setError(msg);
      showStatusModal({
        type: 'error',
        title: 'Link Failed',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  };

  const BANKS = [
    'KASIKORNBANK (KBank)',
    'SIAM COMMERCIAL BANK (SCB)',
    'BANGKOK BANK (BBL)',
    'KRUNG THAI BANK (KTB)',
    'TMBThanachart BANK (ttb)',
    'BANK OF AYUDHYA (Krungsri)',
  ];

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 bg-[#0D1117] z-[160] flex flex-col"
    >
      <header className="px-5 pt-6 pb-4 flex items-center gap-4 sticky top-0 bg-[#0D1117] z-10 border-b border-gray-800">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight uppercase">Bank Account</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-28">
        <div className="mb-8">
          <div className="w-16 h-16 bg-[#00D632]/10 rounded-2xl flex items-center justify-center text-[#00D632] mb-4">
            <Landmark className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Link Bank Account</h2>
          <p className="text-sm text-gray-500 font-medium">Link your bank account to deposit and withdraw THB seamlessly.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Select Bank</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                className="w-full bg-gray-800/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#00D632] transition-colors appearance-none font-bold"
              >
                <option value="" disabled>Choose a bank...</option>
                {BANKS.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Account Name</label>
            <div className="relative">
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Full Name (Match KYC)"
                required
                className="w-full bg-gray-800/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632] transition-colors font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Account Number</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="000-0-00000-0"
                required
                className="w-full bg-gray-800/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632] transition-colors font-bold"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-red-500 text-sm font-bold animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 bg-[#00D632]/10 border border-[#00D632]/30 p-4 rounded-2xl text-[#00D632] text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>Bank details saved successfully!</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            className="w-full bg-[#00D632] text-black py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-[#00D632]/20 hover:bg-[#00B62A] transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Saving...' : 'Save Bank Details'}
          </motion.button>
        </form>

        <div className="mt-8 p-6 bg-gray-800/20 border border-gray-800 rounded-2xl space-y-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Important Guidelines</h4>
          <ul className="space-y-2 text-[11px] text-gray-500 font-bold">
            <li className="flex items-start gap-2">
              <span className="text-[#00D632]">•</span>
              Account name must match your verified identity document.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00D632]">•</span>
              Deposits from 3rd party accounts will be rejected.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#00D632]">•</span>
              Only THB accounts from Thai banks are supported.
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

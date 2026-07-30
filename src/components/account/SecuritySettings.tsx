import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lock, Phone, Landmark, Key, Eye, EyeOff, ShieldCheck, CreditCard, Building2 } from 'lucide-react';
import { useStatusModal } from '../../contexts/StatusModalContext';
import { auth, db } from '../../lib/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { triggerHaptic } from '@/src/lib/haptics';
import { cn } from '@/src/lib/utils';

interface SecuritySettingsProps {
  onBack: () => void;
}

export default function SecuritySettings({ onBack }: SecuritySettingsProps) {
  const { showStatusModal } = useStatusModal();
  
  // Tab/section state: 'all' | 'password' | 'phone' | 'bank'
  const [activeSection, setActiveSection] = useState<'all' | 'password' | 'phone' | 'bank'>('all');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Bank details state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankLoading, setBankLoading] = useState(false);

  // Fetch current phone number and bank details on load
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
          if (data.bankName) setBankName(data.bankName);
          if (data.accountNumber) setAccountNumber(data.accountNumber);
          if (data.accountName) setAccountName(data.accountName);
        }
      } catch (err) {
        console.error('Error fetching user data for security:', err);
      }
    };
    fetchUserData();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !auth.currentUser.email) return;

    if (newPassword !== confirmPassword) {
      triggerHaptic('error');
      showStatusModal({
        type: 'error',
        title: 'Mismatch',
        message: 'New passwords do not match.',
      });
      return;
    }

    if (newPassword.length < 6) {
      triggerHaptic('error');
      showStatusModal({
        type: 'error',
        title: 'Too Short',
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    setPwdLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      // Also update Firestore to keep it synchronized
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        password: newPassword,
        authPassword: newPassword,
        passwordUpdatedAt: new Date().toISOString()
      });

      triggerHaptic('success');
      showStatusModal({
        type: 'success',
        title: 'Password Changed',
        message: 'Your account password has been updated successfully.',
        onClose: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setActiveSection('all');
        }
      });
    } catch (err: any) {
      console.error(err);
      triggerHaptic('error');
      showStatusModal({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Incorrect current password or update failed.',
      });
    } finally {
      setPwdLoading(false);
    }
  };

  const handlePhoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setPhoneLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        phoneNumber,
        phoneUpdatedAt: new Date().toISOString()
      });

      triggerHaptic('success');
      showStatusModal({
        type: 'success',
        title: 'Phone Updated',
        message: 'Your phone number has been updated successfully.',
        onClose: () => {
          setActiveSection('all');
        }
      });
    } catch (err: any) {
      console.error(err);
      triggerHaptic('error');
      showStatusModal({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update phone number.',
      });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleBankUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setBankLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        bankName,
        accountName,
        accountNumber,
        bankLinkedAt: new Date().toISOString()
      });

      triggerHaptic('success');
      showStatusModal({
        type: 'success',
        title: 'Bank Linked',
        message: 'Your bank account details have been successfully updated.',
        onClose: () => {
          setActiveSection('all');
        }
      });
    } catch (err: any) {
      console.error(err);
      triggerHaptic('error');
      showStatusModal({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update bank account.',
      });
    } finally {
      setBankLoading(false);
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

  const handleBackAction = () => {
    triggerHaptic('light');
    if (activeSection !== 'all') {
      setActiveSection('all');
    } else {
      onBack();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 bg-[#0D1117] z-[160] flex flex-col"
    >
      <header className="px-5 pt-6 pb-4 flex items-center gap-4 sticky top-0 bg-[#0D1117] z-10 border-b border-gray-800/80">
        <button onClick={handleBackAction} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight uppercase">
          {activeSection === 'all' && 'Security Settings'}
          {activeSection === 'password' && 'Change Password'}
          {activeSection === 'phone' && 'Phone Number'}
          {activeSection === 'bank' && 'Bank Account'}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28">
        {activeSection === 'all' && (
          <div className="space-y-6">
            <div className="bg-[#1A1F26] border border-gray-800/60 rounded-3xl p-6">
              <h2 className="text-sm font-black text-white uppercase tracking-wider mb-2">Account Protection</h2>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                Keep your password robust, link a verified mobile phone number, and ensure your linked bank account information is accurate.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Change Password */}
              <button
                onClick={() => { triggerHaptic('light'); setActiveSection('password'); }}
                className="w-full flex items-center justify-between p-4 bg-gray-800/10 border border-gray-800 hover:border-gray-700 rounded-2xl group transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-400 group-hover:text-[#00D632] group-hover:bg-[#00D632]/10 transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white font-bold text-sm">Change Password</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Update security credential</span>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-600 rotate-180" />
              </button>

              {/* Option 2: Phone Number */}
              <button
                onClick={() => { triggerHaptic('light'); setActiveSection('phone'); }}
                className="w-full flex items-center justify-between p-4 bg-gray-800/10 border border-gray-800 hover:border-gray-700 rounded-2xl group transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-400 group-hover:text-[#00D632] group-hover:bg-[#00D632]/10 transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white font-bold text-sm">Phone Number</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                      {phoneNumber ? phoneNumber : 'Not Linked'}
                    </span>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-600 rotate-180" />
              </button>

              {/* Option 3: Bank Account */}
              <button
                onClick={() => { triggerHaptic('light'); setActiveSection('bank'); }}
                className="w-full flex items-center justify-between p-4 bg-gray-800/10 border border-gray-800 hover:border-gray-700 rounded-2xl group transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-400 group-hover:text-[#00D632] group-hover:bg-[#00D632]/10 transition-colors">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white font-bold text-sm">Linked Bank Account</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                      {bankName ? `${bankName} - ${accountNumber.slice(-4)}` : 'Not Linked'}
                    </span>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-600 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Change Password Form */}
        {activeSection === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full bg-gray-800/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632] transition-colors font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full bg-gray-800/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632] transition-colors font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full bg-gray-800/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632] transition-colors font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={pwdLoading}
              className="w-full py-4 rounded-2xl bg-[#00D632] text-black font-black text-xs uppercase tracking-wider shadow-lg hover:bg-[#00B62A] disabled:opacity-50 transition-colors"
            >
              {pwdLoading ? 'Updating Password...' : 'Save Password'}
            </button>
          </form>
        )}

        {/* Update Phone Number Form */}
        {activeSection === 'phone' && (
          <form onSubmit={handlePhoneUpdate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+66 81 234 5678"
                  required
                  className="w-full bg-gray-800/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632] transition-colors font-bold"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={phoneLoading}
              className="w-full py-4 rounded-2xl bg-[#00D632] text-black font-black text-xs uppercase tracking-wider shadow-lg hover:bg-[#00B62A] disabled:opacity-50 transition-colors"
            >
              {phoneLoading ? 'Saving...' : 'Update Phone Number'}
            </button>
          </form>
        )}

        {/* Update Bank Account Form */}
        {activeSection === 'bank' && (
          <form onSubmit={handleBankUpdate} className="space-y-6">
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

            <button 
              type="submit"
              disabled={bankLoading}
              className="w-full py-4 rounded-2xl bg-[#00D632] text-black font-black text-xs uppercase tracking-wider shadow-lg hover:bg-[#00B62A] disabled:opacity-50 transition-colors"
            >
              {bankLoading ? 'Saving...' : 'Link / Update Bank'}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}

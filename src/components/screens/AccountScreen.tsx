import React, { useState } from 'react';
import { LogOut, ChevronRight, ShieldCheck, Lock, UserCheck, CreditCard, Code, History, HelpCircle, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '@/src/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import TransactionHistory from '../account/TransactionHistory';
import AdminDashboard from '../admin/AdminDashboard';

export default function AccountScreen() {
  const { t, language, setLanguage } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        }
      }
    };
    fetchProfile();
  }, [showKYCModal, showBankModal]);

  const userRole = profile?.role || 'USER';
  const isAdmin = auth.currentUser?.email === 'danlamimathias2025@gmail.com';
  const kycStatus = profile?.kycStatus || 'NOT_STARTED';
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  const MENU_ITEMS = [
    { 
      icon: UserCheck, 
      label: t('identity'), 
      detail: kycStatus,
      action: () => setShowKYCModal(true) 
    },
    { 
      icon: CreditCard, 
      label: t('linked_bank'), 
      detail: profile?.bankName ? `${profile.bankName} - ${profile.accountNumber.slice(-4)}` : 'NOT LINKED',
      action: () => setShowBankModal(true) 
    },
    { icon: Lock, label: t('security') },
    { icon: History, label: t('history'), action: () => setShowHistory(true) },
    { 
      icon: Globe, 
      label: t('language'), 
      detail: language === 'EN' ? 'English' : 'ไทย',
      action: () => setLanguage(language === 'EN' ? 'TH' : 'EN')
    },
    { 
      icon: HelpCircle, 
      label: 'Help & Support', 
      detail: 'Telegram @kt_johnson',
      action: () => window.open('https://t.me/kt_johnson', '_blank')
    },
  ];

  if (isAdmin) {
    MENU_ITEMS.unshift({ icon: ShieldCheck, label: 'ADMIN DASHBOARD', action: () => setShowAdmin(true) });
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0D1117] h-full overflow-hidden relative">
      <AnimatePresence>
        {showHistory && (
          <TransactionHistory onBack={() => setShowHistory(false)} />
        )}
        {showAdmin && (
          <AdminDashboard onBack={() => setShowAdmin(false)} />
        )}
        {showKYCModal && (
          <div className="fixed inset-0 z-[150] bg-black">
             <KYCScreen 
               onBack={() => setShowKYCModal(false)}
               onSuccess={() => setShowKYCModal(false)} 
             />
          </div>
        )}
        {showBankModal && (
          <BankSettings onBack={() => setShowBankModal(false)} />
        )}
      </AnimatePresence>

      <header className="px-5 pt-6 pb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white tracking-tight uppercase">{t('account')}</h1>
        <button 
          onClick={handleLogout}
          className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {/* User Info Header */}
        <div className="flex flex-col items-center py-8">
          <div className="relative mb-4">
            <div className={cn(
              "w-24 h-24 rounded-full bg-gray-800 border-2 p-1 transition-all",
              kycStatus === 'VERIFIED' ? "border-[#00D632] shadow-[0_0_20px_rgba(0,214,50,0.2)]" : "border-gray-700"
            )}>
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.email}`} 
                alt="Avatar" 
                className="w-full h-full rounded-full bg-gray-700 object-cover"
              />
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 p-1.5 rounded-full border-4 border-[#0D1117] shadow-lg",
              kycStatus === 'VERIFIED' ? "bg-[#00D632]" : "bg-gray-700"
            )}>
              <ShieldCheck className={cn("w-4 h-4", kycStatus === 'VERIFIED' ? "text-white" : "text-gray-400")} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">{auth.currentUser?.email?.split('@')[0] || 'User'}</h2>
            {kycStatus === 'VERIFIED' && (
              <div className="bg-[#00D632] rounded-full p-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full border flex items-center gap-2",
              kycStatus === 'VERIFIED' ? "bg-[#00D632]/10 border-[#00D632]/30 text-[#00D632]" : 
              kycStatus === 'PENDING' ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
              "bg-red-500/10 border-red-500/30 text-red-500"
            )}>
              {kycStatus === 'VERIFIED' ? (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verified Identity</span>
                </>
              ) : kycStatus === 'PENDING' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verification Pending</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Unverified Account</span>
                </>
              )}
            </div>
            {isAdmin && (
              <div className="bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-blue-500 text-[10px] font-black uppercase tracking-widest">
                Administrator
              </div>
            )}
          </div>
        </div>

        {/* Menu List */}
        <div className="space-y-1 mb-8">
          {MENU_ITEMS.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => item.action?.()}
              className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-800/40 group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center text-gray-400 group-hover:text-[#00D632] group-hover:bg-[#00D632]/10 transition-colors">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-white font-bold text-sm tracking-tight">{item.label}</span>
                  {item.detail && <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.detail}</span>}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-gray-400" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

import KYCScreen from '../auth/KYCScreen';
import BankSettings from '../account/BankSettings';

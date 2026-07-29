import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldAlert, ChevronRight, MessageCircle, Send } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import TopNav from '../TopNav';
import PortfolioCard from '../PortfolioCard';
import PerformanceCard from '../PerformanceCard';
import BannerCarousel from '../BannerCarousel';
import MarketTicker from '../MarketTicker';
import DepositTHB from '../wallet/DepositTHB';
import WithdrawTHB from '../wallet/WithdrawTHB';
import SendMoney from '../wallet/SendMoney';
import NotificationsScreen from './NotificationsScreen';
import KYCScreen from '../auth/KYCScreen';
import Skeleton from '../Skeleton';

export default function HomeScreen() {
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>('NOT_STARTED');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKYC = async () => {
      setLoading(true);
      if (auth.currentUser) {
        try {
          const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userSnap.exists()) {
            setKycStatus(userSnap.data().kycStatus || 'NOT_STARTED');
          }
        } catch (error) {
          console.error("Error fetching KYC:", error);
        }
      }
      // Simulate some more loading for effect and better DX
      setTimeout(() => setLoading(false), 1200);
    };
    fetchKYC();
  }, [showKYC]);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-24 relative">
      <AnimatePresence>
        {showDeposit && (
          <DepositTHB 
            onBack={() => setShowDeposit(false)} 
            onSuccess={() => setShowDeposit(false)} 
          />
        )}
        {showWithdraw && (
          <WithdrawTHB 
            onBack={() => setShowWithdraw(false)} 
            onSuccess={() => setShowWithdraw(false)} 
          />
        )}
        {showSend && (
        <SendMoney 
          onBack={() => setShowSend(false)} 
          onSuccess={() => setShowSend(false)} 
        />
      )}

      {showNotifications && (
        <NotificationsScreen 
          onBack={() => setShowNotifications(false)} 
        />
      )}

      {showKYC && (
          <div className="fixed inset-0 z-[150] bg-black">
            <KYCScreen 
              onBack={() => setShowKYC(false)}
              onSuccess={() => setShowKYC(false)} 
            />
          </div>
        )}
      </AnimatePresence>

      <TopNav onNotificationsClick={() => setShowNotifications(true)} />
      
      {loading ? (
        <div className="px-5 mb-4">
          <Skeleton className="w-full h-20 rounded-2xl" />
        </div>
      ) : (
        kycStatus !== 'VERIFIED' && (
          <div className="px-5 mb-4">
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowKYC(true)}
              className="w-full bg-[#00D632]/10 border border-[#00D632]/30 p-4 rounded-2xl flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00D632]/20 rounded-xl flex items-center justify-center text-[#00D632]">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-white font-bold text-sm tracking-tight uppercase">Verify Your Identity</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Enable deposits & trading</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#00D632] group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        )
      )}

      {loading ? (
        <div className="px-5 py-4">
          <Skeleton className="w-full h-48 rounded-3xl" />
        </div>
      ) : (
        <PortfolioCard 
          onDeposit={() => setShowDeposit(true)} 
          onWithdraw={() => setShowWithdraw(true)} 
          onSend={() => setShowSend(true)}
        />
      )}

      {loading ? (
        <div className="px-5 py-4">
          <Skeleton className="w-full h-48 rounded-3xl" />
        </div>
      ) : (
        <PerformanceCard />
      )}
      
      {loading ? (
        <div className="px-5 py-4 space-y-4">
          <Skeleton className="w-full h-32 rounded-3xl" />
          <Skeleton className="w-full h-24 rounded-2xl" />
        </div>
      ) : (
        <>
          <BannerCarousel />
          <MarketTicker />
        </>
      )}

      {/* Floating Support Button */}
      <motion.a
        href="https://t.me/kt_johnson"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-28 right-6 w-14 h-14 bg-[#00D632] rounded-full flex items-center justify-center shadow-2xl shadow-[#00D632]/40 z-[100] border-4 border-[#0D1117]"
      >
        <MessageCircle className="w-6 h-6 text-black" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0D1117] animate-pulse" />
      </motion.a>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldAlert, ChevronRight, MessageCircle, Send } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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
import { ASSETS_DATA } from '../../data';

export default function HomeScreen() {
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showKYC, setShowKYC] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>('NOT_STARTED');
  const [balances, setBalances] = useState<{ [key: string]: number }>({ THB: 0, KUB: 0, BTC: 0, SOL: 0, ETH: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (auth.currentUser) {
        try {
          // Fetch KYC
          const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userSnap.exists()) {
            setKycStatus(userSnap.data().kycStatus || 'NOT_STARTED');
          }

          // Fetch Balances
          const q = collection(db, 'users', auth.currentUser.uid, 'balances');
          const querySnapshot = await getDocs(q);
          const newBalances: { [key: string]: number } = { THB: 0, KUB: 0, BTC: 0, SOL: 0, ETH: 0 };
          
          if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
              const amount = doc.data().amount;
              if (typeof amount === 'number') {
                newBalances[doc.id] = amount;
              }
            });
          }
          setBalances(newBalances);
        } catch (error: any) {
          console.error("Detailed Fetch Error:", error);
          // Keep balances at 0 if fetch fails to avoid showing stale or mock data
          setBalances({ THB: 0, KUB: 0, BTC: 0, SOL: 0, ETH: 0 });
        }
      }
      setTimeout(() => setLoading(false), 800);
    };
    fetchData();
  }, [showKYC, showDeposit, showWithdraw, showSend]);

  const totalValue = Object.keys(balances).reduce((acc, symbol) => {
    const amount = balances[symbol] || 0;
    const price = ASSETS_DATA[symbol]?.price || 0;
    return acc + (amount * price);
  }, 0);

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
        <div className="px-5 mb-2">
          <Skeleton className="w-full h-16 rounded-xl" />
        </div>
      ) : (
        kycStatus !== 'VERIFIED' && (
          <div className="px-5 mb-2">
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowKYC(true)}
              className="w-full bg-[#00D632]/10 border border-[#00D632]/30 p-3 rounded-xl flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00D632]/20 rounded-lg flex items-center justify-center text-[#00D632]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-white font-bold text-xs tracking-tight uppercase">Verify Identity</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Enable deposits & trading</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#00D632] group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        )
      )}

      {loading ? (
        <div className="px-5 py-2">
          <Skeleton className="w-full h-40 rounded-2xl" />
        </div>
      ) : (
        <PortfolioCard 
          onDeposit={() => setShowDeposit(true)} 
          onWithdraw={() => setShowWithdraw(true)} 
          onSend={() => setShowSend(true)}
          totalValue={totalValue}
        />
      )}

      {loading ? (
        <div className="px-5 py-2">
          <Skeleton className="w-full h-40 rounded-2xl" />
        </div>
      ) : (
        <PerformanceCard />
      )}
      
      {loading ? (
        <div className="px-5 py-2 space-y-2">
          <Skeleton className="w-full h-28 rounded-2xl" />
          <Skeleton className="w-full h-20 rounded-xl" />
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
        className="fixed bottom-20 right-5 w-12 h-12 bg-[#00D632] rounded-full flex items-center justify-center shadow-2xl shadow-[#00D632]/40 z-[100] border-4 border-[#0D1117]"
      >
        <MessageCircle className="w-5 h-5 text-black" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0D1117] animate-pulse" />
      </motion.a>
    </div>
  );
}

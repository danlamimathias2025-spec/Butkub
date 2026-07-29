import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { ChevronDown, BarChart2, AlertCircle, CheckCircle2, ArrowUpDown, Info, Zap, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StatusOverlay from '../StatusOverlay';
import { cn } from '@/src/lib/utils';
import { triggerHaptic } from '@/src/lib/haptics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavScroll } from '../../contexts/NavScrollContext';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, runTransaction, collection } from 'firebase/firestore';
import { ASSETS_DATA } from '../../data';

const TradeScreen = memo(() => {
  const { t } = useLanguage();
  const { isNavVisible } = useNavScroll();
  const [activeTab, setActiveTab] = useState<'SPOT' | 'CONVERT'>('SPOT');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState('Market Order');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [balances, setBalances] = useState<{ [key: string]: number }>({ THB: 0, KUB: 0, BTC: 0, ETH: 0, SOL: 0 });
  const [kycStatus, setKycStatus] = useState<string>('LOADING');
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message?: string } | null>(null);

  // Convert Mode States
  const [fromAsset, setFromAsset] = useState('THB');
  const [toAsset, setToAsset] = useState('BTC');
  const [convertAmount, setConvertAmount] = useState('');

  const PRICE = 78.55;

  useEffect(() => {
    const fetchBalancesAndKYC = async () => {
      if (!auth.currentUser) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userSnap.exists()) {
          setKycStatus(userSnap.data().kycStatus || 'NOT_STARTED');
        } else {
          setKycStatus('NOT_STARTED');
        }

        const balancePromises = Object.keys(ASSETS_DATA).map(symbol => 
          getDoc(doc(db, 'users', auth.currentUser!.uid, 'balances', symbol))
        );
        
        const snaps = await Promise.all(balancePromises);
        const newBalances: { [key: string]: number } = { THB: 0, KUB: 0, BTC: 0, ETH: 0, SOL: 0 };
        
        snaps.forEach((snap, i) => {
          const symbol = Object.keys(ASSETS_DATA)[i];
          if (snap.exists()) {
            const amount = snap.data().amount;
            if (typeof amount === 'number') {
              newBalances[symbol] = amount;
            }
          }
        });
        
        setBalances(newBalances);
      } catch (error) {
        console.error("Error fetching balances:", error);
        setBalances({ THB: 0, KUB: 0, BTC: 0, ETH: 0, SOL: 0 });
      }
    };
    fetchBalancesAndKYC();
  }, []);

  const handleTrade = useCallback(async () => {
    if (!auth.currentUser) return;
    if (kycStatus !== 'VERIFIED') {
      setMessage({ type: 'error', text: 'Please complete KYC verification to trade' });
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    const totalCost = numAmount * PRICE;
    if (side === 'BUY' && balances.THB < totalCost) {
      setMessage({ type: 'error', text: 'Insufficient THB balance' });
      return;
    }
    if (side === 'SELL' && balances.KUB < numAmount) {
      setMessage({ type: 'error', text: 'Insufficient KUB balance' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const userRef = auth.currentUser.uid;
      const thbRef = doc(db, 'users', userRef, 'balances', 'THB');
      const kubRef = doc(db, 'users', userRef, 'balances', 'KUB');
      const txCollectionRef = collection(db, 'users', userRef, 'transactions');

      await runTransaction(db, async (transaction) => {
        const thbSnap = await transaction.get(thbRef);
        const kubSnap = await transaction.get(kubRef);

        const currentTHB = thbSnap.exists() ? thbSnap.data().amount : 0;
        const currentKUB = kubSnap.exists() ? kubSnap.data().amount : 0;

        if (side === 'BUY') {
          transaction.set(thbRef, { amount: currentTHB - totalCost, updatedAt: new Date().toISOString() }, { merge: true });
          transaction.set(kubRef, { amount: currentKUB + numAmount, updatedAt: new Date().toISOString() }, { merge: true });
        } else {
          transaction.set(thbRef, { amount: currentTHB + totalCost, updatedAt: new Date().toISOString() }, { merge: true });
          transaction.set(kubRef, { amount: currentKUB - numAmount, updatedAt: new Date().toISOString() }, { merge: true });
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomStr = '';
        for (let i = 0; i < 8; i++) {
          randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const txId = `TX-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${randomStr}`;

        const senderInfo = side === 'BUY' 
          ? { name: auth.currentUser!.email || 'User Account', account: 'THB Wallet', type: 'Bitkub User' }
          : { name: auth.currentUser!.email || 'User Account', account: 'KUB Wallet', type: 'Bitkub User' };

        const receiverInfo = side === 'BUY'
          ? { name: 'Bitkub Order Book / Liquidity Pool', account: 'KUB Spot Market', type: 'System Exchange' }
          : { name: 'Bitkub Order Book / Liquidity Pool', account: 'THB Spot Market', type: 'System Exchange' };

        const newTxRef = doc(txCollectionRef);
        transaction.set(newTxRef, {
          txId,
          type: side,
          asset: 'KUB/THB',
          amount: numAmount,
          price: PRICE,
          total: totalCost,
          fee: 0,
          status: 'COMPLETED',
          timestamp: now.toISOString(),
          dateStr,
          timeStr,
          senderInfo,
          receiverInfo
        });
      });

      setBalances(prev => ({
        THB: side === 'BUY' ? prev.THB - totalCost : prev.THB + totalCost,
        KUB: side === 'BUY' ? prev.KUB + numAmount : prev.KUB - numAmount
      }));

      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: 'Order Completed',
        message: `Successfully ${side.toLowerCase()}ed ${numAmount} KUB at ฿${PRICE}.`
      });
      setAmount('');
    } catch (error: any) {
      console.error("Trade error:", error);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'Order Failed',
        message: error.message || 'There was an error processing your trade.'
      });
    } finally {
      setLoading(false);
    }
  }, [amount, balances, side, PRICE]);

  const handleConvert = useCallback(async () => {
    if (!auth.currentUser) return;
    if (kycStatus !== 'VERIFIED') {
      setMessage({ type: 'error', text: 'Please complete KYC verification to convert' });
      return;
    }
    const numAmount = parseFloat(convertAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    if (balances[fromAsset] < numAmount) {
      setMessage({ type: 'error', text: `Insufficient ${fromAsset} balance` });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const fromPrice = ASSETS_DATA[fromAsset].price;
      const toPrice = ASSETS_DATA[toAsset].price;
      const toAmount = (numAmount * fromPrice) / toPrice;

      const userRef = auth.currentUser.uid;
      const fromRef = doc(db, 'users', userRef, 'balances', fromAsset);
      const toRef = doc(db, 'users', userRef, 'balances', toAsset);
      const txCollectionRef = collection(db, 'users', userRef, 'transactions');

      await runTransaction(db, async (transaction) => {
        const fromSnap = await transaction.get(fromRef);
        const toSnap = await transaction.get(toRef);

        const currentFrom = fromSnap.exists() ? fromSnap.data().amount : 0;
        const currentTo = toSnap.exists() ? toSnap.data().amount : 0;

        transaction.set(fromRef, { amount: currentFrom - numAmount, updatedAt: new Date().toISOString() }, { merge: true });
        transaction.set(toRef, { amount: currentTo + toAmount, updatedAt: new Date().toISOString() }, { merge: true });

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
          name: auth.currentUser!.email || 'User Account',
          account: `${fromAsset} Wallet`,
          type: 'Bitkub User'
        };

        const receiverInfo = {
          name: auth.currentUser!.email || 'User Account',
          account: `${toAsset} Wallet`,
          type: 'Bitkub User'
        };

        const newTxRef = doc(txCollectionRef);
        transaction.set(newTxRef, {
          txId,
          type: 'CONVERT',
          asset: `${fromAsset}➔${toAsset}`,
          amount: numAmount,
          fromAsset,
          toAsset,
          fromAmount: numAmount,
          toAmount,
          fee: 0,
          status: 'COMPLETED',
          timestamp: now.toISOString(),
          dateStr,
          timeStr,
          senderInfo,
          receiverInfo
        });
      });

      setBalances(prev => ({
        ...prev,
        [fromAsset]: prev[fromAsset] - numAmount,
        [toAsset]: prev[toAsset] + toAmount
      }));

      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: 'Conversion Success',
        message: `Converted ${numAmount} ${fromAsset} to ${toAmount.toFixed(8)} ${toAsset}.`
      });
      setConvertAmount('');
    } catch (error: any) {
      console.error("Convert error:", error);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'Conversion Failed',
        message: error.message || 'There was an error processing your conversion.'
      });
    } finally {
      setLoading(false);
    }
  }, [convertAmount, balances, fromAsset, toAsset]);

  const total = useMemo(() => 
    amount ? (parseFloat(amount) * PRICE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--',
    [amount, PRICE]
  );

  const convertEstimation = useMemo(() => {
    if (!convertAmount) return '0.00';
    const num = parseFloat(convertAmount);
    if (isNaN(num)) return '0.00';
    const fromPrice = ASSETS_DATA[fromAsset].price;
    const toPrice = ASSETS_DATA[toAsset].price;
    return ((num * fromPrice) / toPrice).toFixed(8);
  }, [convertAmount, fromAsset, toAsset]);

  return (
    <div className="flex-1 flex flex-col bg-[#0D1117] h-full overflow-hidden">
      <motion.header 
        initial={false}
        animate={{ 
          y: isNavVisible ? 0 : -80, 
          opacity: isNavVisible ? 1 : 0 
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-2 z-50 mx-4 my-2 px-4 py-2 bg-[#0D1117]/80 backdrop-blur-2xl rounded-2xl border border-gray-800/80 shadow-2xl flex justify-between items-center"
        style={{ pointerEvents: isNavVisible ? 'auto' : 'none' }}
      >
        <div className="flex items-center gap-1.5 cursor-pointer group">
          <h1 className="text-lg font-black text-white tracking-tight uppercase">
            {activeTab === 'SPOT' ? 'KUB/THB' : 'Convert'}
          </h1>
          {activeTab === 'SPOT' && <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />}
        </div>
        <div className="flex bg-gray-800/30 rounded-lg p-0.5 border border-gray-800/50">
          <button 
            onClick={() => setActiveTab('SPOT')}
            className={cn(
              "px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all relative",
              activeTab === 'SPOT' ? "text-white" : "text-gray-500"
            )}
          >
            {activeTab === 'SPOT' && (
              <motion.div 
                layoutId="tradeActiveTab"
                className="absolute inset-0 bg-gray-800 rounded-md -z-10"
              />
            )}
            Spot
          </button>
          <button 
            onClick={() => setActiveTab('CONVERT')}
            className={cn(
              "px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all relative",
              activeTab === 'CONVERT' ? "text-white" : "text-gray-500"
            )}
          >
            {activeTab === 'CONVERT' && (
              <motion.div 
                layoutId="tradeActiveTab"
                className="absolute inset-0 bg-gray-800 rounded-md -z-10"
              />
            )}
            Convert
          </button>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2 relative no-scrollbar">
        <AnimatePresence mode="wait">
          {kycStatus !== 'VERIFIED' && kycStatus !== 'LOADING' && (
            <motion.div 
              key="kyc-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-[#0D1117]/80 backdrop-blur-sm flex items-center justify-center p-8 text-center"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl max-w-xs"
              >
                <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mx-auto mb-6">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-white mb-2 uppercase">Verification Needed</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed mb-8">
                  {kycStatus === 'PENDING' 
                    ? 'Your identity verification is currently being reviewed by our team.' 
                    : 'Please complete your identity verification to start trading.'}
                </p>
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full bg-[#00D632]"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Feedback Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-bold overflow-hidden",
                  message.type === 'success' ? "bg-[#00D632]/10 text-[#00D632] border border-[#00D632]/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                )}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'SPOT' ? (
            <div className="space-y-4">
              {/* Balances */}
              <div className="flex justify-between items-center mb-3 px-1">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">THB Balance</span>
                  <motion.span 
                    key={balances.THB}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs font-bold text-white"
                  >
                    ฿{balances.THB.toLocaleString()}
                  </motion.span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">KUB Balance</span>
                  <motion.span 
                    key={balances.KUB}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs font-bold text-white"
                  >
                    {balances.KUB.toLocaleString()} KUB
                  </motion.span>
                </div>
              </div>

              {/* Buy/Sell Toggle */}
              <div className="flex bg-gray-800/30 rounded-xl p-0.5 mb-4 border border-gray-800/50">
                <button 
                  onClick={() => setSide('BUY')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all relative",
                    side === 'BUY' ? "text-black" : "text-gray-500"
                  )}
                >
                  {side === 'BUY' && (
                    <motion.div 
                      layoutId="spotSideTab"
                      className="absolute inset-0 bg-[#00D632] rounded-lg shadow-lg"
                    />
                  )}
                  <span className="relative z-10 uppercase tracking-widest">{t('buy')}</span>
                </button>
                <button 
                  onClick={() => setSide('SELL')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all relative",
                    side === 'SELL' ? "text-white" : "text-gray-500"
                  )}
                >
                  {side === 'SELL' && (
                    <motion.div 
                      layoutId="spotSideTab"
                      className="absolute inset-0 bg-red-500 rounded-lg shadow-lg"
                    />
                  )}
                  <span className="relative z-10 uppercase tracking-widest">{t('sell')}</span>
                </button>
              </div>

              {/* Order Form */}
              <div className="space-y-3 mb-6">
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between bg-gray-800/20 border border-gray-800 rounded-lg px-3 py-2 cursor-pointer"
                >
                  <span className="text-xs font-medium text-white">{orderType === 'Market Order' ? t('market_order') : orderType}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </motion.div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-widest px-1">{t('price')} (THB)</label>
                  <div className="bg-gray-800/20 border border-gray-800 rounded-lg px-3 py-3 text-white font-bold text-base">
                    {PRICE}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-bold text-gray-500 tracking-widest px-1">{t('amount')} (KUB)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-800/20 border border-gray-800 rounded-lg px-3 py-3 text-white font-bold text-base placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/30 transition-colors"
                  />
                </div>

                <div className="flex gap-1.5">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <motion.button 
                      key={pct} 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (side === 'BUY') {
                          setAmount(((balances.THB * pct) / PRICE).toFixed(4));
                        } else {
                          setAmount((balances.KUB * pct).toFixed(4));
                        }
                      }}
                      className="flex-1 py-1.5 bg-gray-800/40 rounded-md text-[9px] font-bold text-gray-400 border border-gray-700/50 hover:border-[#00D632]/30 hover:text-white transition-all"
                    >
                      {pct * 100}%
                    </motion.button>
                  ))}
                </div>

                <div className="flex justify-between items-center px-1 pt-1">
                  <span className="text-[10px] text-gray-500 font-medium">{t('total')}</span>
                  <motion.span 
                    key={total}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs font-bold text-white"
                  >
                    {total} THB
                  </motion.span>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  disabled={loading || !amount}
                  onClick={() => setShowConfirm(true)}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50",
                    side === 'BUY' ? "bg-[#00D632] text-black shadow-[#00D632]/20 hover:bg-[#00B62A]" : "bg-red-500 text-white shadow-red-500/20 hover:bg-red-600"
                  )}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    `${side === 'BUY' ? t('buy') : t('sell')} KUB`
                  )}
                </motion.button>
              </div>

              {/* Order Book Brief */}
              <div className="border-t border-gray-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('order_book')}</h3>
                  <span className="text-[9px] text-gray-600">{t('spread')}: 0.05 (0.06%)</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-0.5">
                    <OrderBookRow price="78.54" amount="1,245.0" color="text-[#00D632]" />
                    <OrderBookRow price="78.53" amount="892.5" color="text-[#00D632]" />
                    <OrderBookRow price="78.52" amount="2,100.0" color="text-[#00D632]" />
                  </div>
                  <div className="space-y-0.5 text-right">
                    <OrderBookRow price="78.56" amount="450.2" color="text-red-500" reverse />
                    <OrderBookRow price="78.57" amount="1,120.8" color="text-red-500" reverse />
                    <OrderBookRow price="78.58" amount="670.0" color="text-red-500" reverse />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-[#00D632]/5 border border-[#00D632]/20 rounded-2xl p-4 flex items-center gap-4 mb-2">
                <Zap className="w-6 h-6 text-[#00D632]" />
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight">Zero Fee Conversion</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Instant settlement at market rates</p>
                </div>
              </div>

              <div className="relative space-y-2">
                <div className="bg-gray-800/20 border border-gray-800 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">From</span>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Balance: {balances[fromAsset]?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <select 
                      value={fromAsset}
                      onChange={(e) => {
                        setFromAsset(e.target.value);
                        if (e.target.value === toAsset) {
                          setToAsset(fromAsset);
                        }
                      }}
                      className="bg-gray-800 border-none rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                      {Object.keys(ASSETS_DATA).map(symbol => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-right text-2xl font-black text-white focus:outline-none placeholder:text-gray-800"
                    />
                  </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-[48%] z-10">
                  <motion.button 
                    whileTap={{ rotate: 180 }}
                    onClick={() => {
                      const temp = fromAsset;
                      setFromAsset(toAsset);
                      setToAsset(temp);
                    }}
                    className="w-10 h-10 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-[#00D632] transition-colors shadow-2xl"
                  >
                    <ArrowUpDown className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="bg-gray-800/20 border border-gray-800 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">To</span>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Balance: {balances[toAsset]?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <select 
                      value={toAsset}
                      onChange={(e) => {
                        setToAsset(e.target.value);
                        if (e.target.value === fromAsset) {
                          setFromAsset(toAsset);
                        }
                      }}
                      className="bg-gray-800 border-none rounded-xl px-3 py-2 text-white font-black text-sm focus:outline-none appearance-none cursor-pointer"
                    >
                      {Object.keys(ASSETS_DATA).map(symbol => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                    <motion.div 
                      key={convertEstimation}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex-1 text-right text-2xl font-black text-[#00D632]"
                    >
                      {convertEstimation}
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/10 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Price</span>
                  <span className="text-[10px] text-white font-black">
                    1 {fromAsset} ≈ {(ASSETS_DATA[fromAsset].price / ASSETS_DATA[toAsset].price).toFixed(8)} {toAsset}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Transaction Fee</span>
                    <Info className="w-3 h-3 text-gray-600" />
                  </div>
                  <span className="text-[10px] text-[#00D632] font-black uppercase tracking-widest">Free</span>
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.96 }}
                disabled={loading || !convertAmount}
                onClick={() => setShowConfirm(true)}
                className="w-full py-2.5 rounded-xl bg-[#00D632] text-black font-bold text-xs uppercase tracking-wider shadow-md shadow-[#00D632]/20 disabled:opacity-50 hover:bg-[#00B62A] transition-all"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Convert Now'
                )}
              </motion.button>

              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                <p className="text-[9px] text-yellow-500/80 font-bold uppercase tracking-wider leading-relaxed text-center">
                  Conversion rates are estimated and may change slightly during processing. By clicking "Convert Now", you agree to the current market rate.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setShowConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-lg bg-[#1A1F26] border-t border-gray-800 rounded-t-[40px] p-8 pb-12 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-gray-800 rounded-full mx-auto mb-8" />
              
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-6 text-center">Confirm Order</h2>
              
              <div className="space-y-4 mb-8">
                {activeTab === 'SPOT' ? (
                  <div className="bg-black/40 rounded-3xl p-6 space-y-4 border border-gray-800">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Type</span>
                      <span className={cn("text-xs font-black uppercase", side === 'BUY' ? "text-[#00D632]" : "text-red-500")}>
                        {side} KUB
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Price</span>
                      <span className="text-white font-black">฿{PRICE}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount</span>
                      <span className="text-white font-black">{amount} KUB</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</span>
                      <span className="text-[#00D632] font-black text-xl italic">฿{total}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/40 rounded-3xl p-6 space-y-4 border border-gray-800">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">From</span>
                      <span className="text-white font-black">{convertAmount} {fromAsset}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">To</span>
                      <span className="text-[#00D632] font-black">{convertEstimation} {toAsset}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rate</span>
                      <span className="text-gray-400 font-bold text-[10px]">
                        1 {fromAsset} = {(ASSETS_DATA[fromAsset].price / ASSETS_DATA[toAsset].price).toFixed(8)} {toAsset}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  disabled={loading}
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-4 bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs border border-gray-700 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={loading}
                  onClick={() => {
                    setShowConfirm(false);
                    if (activeTab === 'SPOT') handleTrade();
                    else handleConvert();
                  }}
                  className="flex-2 py-4 bg-[#00D632] text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-[#00D632]/20 active:scale-95 transition-all"
                >
                  Confirm Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StatusOverlay
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message}
        onClose={() => setStatus(null)}
      />
    </div>
  );
});

TradeScreen.displayName = 'TradeScreen';

const OrderBookRow = memo(({ price, amount, color, reverse }: { price: string; amount: string; color: string; reverse?: boolean }) => (
  <div className={cn("flex justify-between text-[10px] font-bold", reverse && "flex-row-reverse")}>
    <span className={color}>{price}</span>
    <span className="text-gray-600">{amount}</span>
  </div>
));

OrderBookRow.displayName = 'OrderBookRow';

export default TradeScreen;

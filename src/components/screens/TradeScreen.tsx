import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { ChevronDown, BarChart2, AlertCircle, CheckCircle2, ArrowUpDown, Info, Zap, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, runTransaction, collection } from 'firebase/firestore';
import { ASSETS_DATA } from '../../data';

const TradeScreen = memo(() => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'SPOT' | 'CONVERT'>('SPOT');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState('Market Order');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [balances, setBalances] = useState<{ [key: string]: number }>({ THB: 0, KUB: 0, BTC: 0, ETH: 0, SOL: 0 });
  const [kycStatus, setKycStatus] = useState<string>('LOADING');
  const [showConfirm, setShowConfirm] = useState(false);

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
        const newBalances: { [key: string]: number } = {};
        
        snaps.forEach((snap, i) => {
          const symbol = Object.keys(ASSETS_DATA)[i];
          newBalances[symbol] = snap.exists() ? snap.data().amount : 0;
        });
        
        setBalances(newBalances);

        if (!newBalances.THB && auth.currentUser) {
           // Ensure THB doc exists
           await setDoc(doc(db, 'users', auth.currentUser.uid, 'balances', 'THB'), {
            asset: 'THB',
            amount: 0,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (error) {
        console.error("Error fetching balances:", error);
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

        const newTxRef = doc(txCollectionRef);
        transaction.set(newTxRef, {
          type: side,
          asset: 'KUB/THB',
          amount: numAmount,
          price: PRICE,
          status: 'COMPLETED',
          timestamp: new Date().toISOString()
        });
      });

      setBalances(prev => ({
        THB: side === 'BUY' ? prev.THB - totalCost : prev.THB + totalCost,
        KUB: side === 'BUY' ? prev.KUB + numAmount : prev.KUB - numAmount
      }));

      setMessage({ type: 'success', text: `${side} order completed successfully!` });
      setAmount('');
    } catch (error: any) {
      console.error("Trade error:", error);
      setMessage({ type: 'error', text: error.message || 'Transaction failed' });
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

        const newTxRef = doc(txCollectionRef);
        transaction.set(newTxRef, {
          type: 'CONVERT',
          fromAsset,
          toAsset,
          fromAmount: numAmount,
          toAmount,
          status: 'COMPLETED',
          timestamp: new Date().toISOString()
        });
      });

      setBalances(prev => ({
        ...prev,
        [fromAsset]: prev[fromAsset] - numAmount,
        [toAsset]: prev[toAsset] + toAmount
      }));

      setMessage({ type: 'success', text: `Conversion successful! You received ${toAmount.toFixed(8)} ${toAsset}` });
      setConvertAmount('');
    } catch (error: any) {
      console.error("Convert error:", error);
      setMessage({ type: 'error', text: error.message || 'Conversion failed' });
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
      <header className="px-5 pt-6 pb-2 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer group">
          <h1 className="text-xl font-black text-white tracking-tight uppercase">
            {activeTab === 'SPOT' ? 'KUB/THB' : 'Convert'}
          </h1>
          {activeTab === 'SPOT' && <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />}
        </div>
        <div className="flex bg-gray-800/30 rounded-xl p-1 border border-gray-800/50">
          <button 
            onClick={() => setActiveTab('SPOT')}
            className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative",
              activeTab === 'SPOT' ? "text-white" : "text-gray-500"
            )}
          >
            {activeTab === 'SPOT' && (
              <motion.div 
                layoutId="tradeActiveTab"
                className="absolute inset-0 bg-gray-800 rounded-lg -z-10"
              />
            )}
            Spot
          </button>
          <button 
            onClick={() => setActiveTab('CONVERT')}
            className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative",
              activeTab === 'CONVERT' ? "text-white" : "text-gray-500"
            )}
          >
            {activeTab === 'CONVERT' && (
              <motion.div 
                layoutId="tradeActiveTab"
                className="absolute inset-0 bg-gray-800 rounded-lg -z-10"
              />
            )}
            Convert
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4 relative no-scrollbar">
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
            <div className="space-y-6">
              {/* Balances */}
              <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">THB Balance</span>
                  <motion.span 
                    key={balances.THB}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-sm font-bold text-white"
                  >
                    ฿{balances.THB.toLocaleString()}
                  </motion.span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">KUB Balance</span>
                  <motion.span 
                    key={balances.KUB}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-sm font-bold text-white"
                  >
                    {balances.KUB.toLocaleString()} KUB
                  </motion.span>
                </div>
              </div>

              {/* Buy/Sell Toggle */}
              <div className="flex bg-gray-800/30 rounded-2xl p-1 mb-6 border border-gray-800/50">
                <button 
                  onClick={() => setSide('BUY')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all relative",
                    side === 'BUY' ? "text-black" : "text-gray-500"
                  )}
                >
                  {side === 'BUY' && (
                    <motion.div 
                      layoutId="spotSideTab"
                      className="absolute inset-0 bg-[#00D632] rounded-xl shadow-lg"
                    />
                  )}
                  <span className="relative z-10">{t('buy')}</span>
                </button>
                <button 
                  onClick={() => setSide('SELL')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all relative",
                    side === 'SELL' ? "text-white" : "text-gray-500"
                  )}
                >
                  {side === 'SELL' && (
                    <motion.div 
                      layoutId="spotSideTab"
                      className="absolute inset-0 bg-red-500 rounded-xl shadow-lg"
                    />
                  )}
                  <span className="relative z-10">{t('sell')}</span>
                </button>
              </div>

              {/* Order Form */}
              <div className="space-y-4 mb-8">
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-3 cursor-pointer"
                >
                  <span className="text-sm font-medium text-white">{orderType === 'Market Order' ? t('market_order') : orderType}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </motion.div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest px-1">{t('price')} (THB)</label>
                  <div className="bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 text-white font-bold text-lg">
                    {PRICE}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest px-1">{t('amount')} (KUB)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-4 text-white font-bold text-lg placeholder:text-gray-700 focus:outline-none focus:border-[#00D632]/30 transition-colors"
                  />
                </div>

                <div className="flex gap-2">
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
                      className="flex-1 py-2 bg-gray-800/40 rounded-lg text-xs font-bold text-gray-400 border border-gray-700/50 hover:border-[#00D632]/30 hover:text-white transition-all"
                    >
                      {pct * 100}%
                    </motion.button>
                  ))}
                </div>

                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-gray-500 font-medium">{t('total')}</span>
                  <motion.span 
                    key={total}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-sm font-bold text-white"
                  >
                    {total} THB
                  </motion.span>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  disabled={loading || !amount}
                  onClick={() => setShowConfirm(true)}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all disabled:opacity-50",
                    side === 'BUY' ? "bg-[#00D632] text-black shadow-[#00D632]/20" : "bg-red-500 text-white shadow-red-500/20"
                  )}
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    `${side === 'BUY' ? t('buy') : t('sell')} KUB`
                  )}
                </motion.button>
              </div>

              {/* Order Book Brief */}
              <div className="border-t border-gray-800 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('order_book')}</h3>
                  <span className="text-[10px] text-gray-600">{t('spread')}: 0.05 (0.06%)</span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <OrderBookRow price="78.54" amount="1,245.0" color="text-[#00D632]" />
                    <OrderBookRow price="78.53" amount="892.5" color="text-[#00D632]" />
                    <OrderBookRow price="78.52" amount="2,100.0" color="text-[#00D632]" />
                  </div>
                  <div className="space-y-1 text-right">
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
                className="w-full py-5 rounded-2xl bg-[#00D632] text-black font-black text-lg shadow-xl shadow-[#00D632]/20 disabled:opacity-50"
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

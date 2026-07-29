import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { ChevronDown, BarChart2, AlertCircle, CheckCircle2, ArrowUpDown, Info, Zap, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, runTransaction, collection } from 'firebase/firestore';

const ASSETS_DATA: { [key: string]: { name: string; symbol: string; price: number; icon: string } } = {
  THB: { name: 'Thai Baht', symbol: 'THB', price: 1, icon: '฿' },
  KUB: { name: 'Bitkub Coin', symbol: 'KUB', price: 78.55, icon: 'K' },
  BTC: { name: 'Bitcoin', symbol: 'BTC', price: 2300000, icon: '₿' },
  ETH: { name: 'Ethereum', symbol: 'ETH', price: 120000, icon: 'Ξ' },
  SOL: { name: 'Solana', symbol: 'SOL', price: 6000, icon: 'S' },
};

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
              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'SPOT' ? "bg-gray-800 text-white" : "text-gray-500"
            )}
          >
            Spot
          </button>
          <button 
            onClick={() => setActiveTab('CONVERT')}
            className={cn(
              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'CONVERT' ? "bg-gray-800 text-white" : "text-gray-500"
            )}
          >
            Convert
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4 relative">
        <AnimatePresence>
          {kycStatus !== 'VERIFIED' && kycStatus !== 'LOADING' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 bg-[#0D1117]/80 backdrop-blur-sm flex items-center justify-center p-8 text-center"
            >
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl max-w-xs">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-bold",
                message.type === 'success' ? "bg-[#00D632]/10 text-[#00D632] border border-[#00D632]/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
              )}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'SPOT' ? (
          <>
            {/* Balances */}
            <div className="flex justify-between items-center mb-4 px-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-bold uppercase">THB Balance</span>
                <span className="text-sm font-bold text-white">฿{balances.THB.toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500 font-bold uppercase">KUB Balance</span>
                <span className="text-sm font-bold text-white">{balances.KUB.toLocaleString()} KUB</span>
              </div>
            </div>

            {/* Buy/Sell Toggle */}
            <div className="flex bg-gray-800/30 rounded-2xl p-1 mb-6 border border-gray-800/50">
              <button 
                onClick={() => setSide('BUY')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                  side === 'BUY' ? "bg-[#00D632] text-black shadow-lg" : "text-gray-500"
                )}
              >
                {t('buy')}
              </button>
              <button 
                onClick={() => setSide('SELL')}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                  side === 'SELL' ? "bg-red-500 text-white shadow-lg" : "text-gray-500"
                )}
              >
                {t('sell')}
              </button>
            </div>

            {/* Order Form */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between bg-gray-800/20 border border-gray-800 rounded-xl px-4 py-3 cursor-pointer">
                <span className="text-sm font-medium text-white">{orderType === 'Market Order' ? t('market_order') : orderType}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>

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
                  <button 
                    key={pct} 
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
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-gray-500 font-medium">{t('total')}</span>
                <span className="text-sm font-bold text-white">{total} THB</span>
              </div>

              <motion.button 
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                onClick={handleTrade}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-lg shadow-xl transform transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100",
                  side === 'BUY' ? "bg-[#00D632] text-black" : "bg-red-500 text-white"
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
          </>
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
                <button 
                  onClick={() => {
                    const temp = fromAsset;
                    setFromAsset(toAsset);
                    setToAsset(temp);
                  }}
                  className="w-10 h-10 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-[#00D632] transition-colors shadow-2xl"
                >
                  <ArrowUpDown className="w-5 h-5" />
                </button>
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
                  <div className="flex-1 text-right text-2xl font-black text-[#00D632]">
                    {convertEstimation}
                  </div>
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
              whileTap={{ scale: 0.98 }}
              disabled={loading || !convertAmount}
              onClick={handleConvert}
              className="w-full py-5 rounded-2xl bg-[#00D632] text-black font-black text-lg shadow-xl shadow-[#00D632]/10 disabled:opacity-50"
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
      </div>
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

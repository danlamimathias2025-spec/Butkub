import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { ASSETS_DATA } from '../../data';

interface AssetDetailProps {
  assetSymbol: string;
  onBack: () => void;
  onBalanceUpdate: () => void;
}

export default function AssetDetail({ assetSymbol, onBack, onBalanceUpdate }: AssetDetailProps) {
  const asset = ASSETS_DATA[assetSymbol];
  const [balance, setBalance] = useState(0);
  const [thbBalance, setThbBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL' | null>(null);
  const [amount, setAmount] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<'SUCCESS' | 'ERROR' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Generate some dummy historical data for the chart
  const chartData = useMemo(() => {
    const data = [];
    let currentPrice = asset.price * 0.9;
    const now = new Date();
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      currentPrice = currentPrice * (1 + (Math.random() * 0.04 - 0.02));
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: currentPrice
      });
    }
    return data;
  }, [asset.price]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!auth.currentUser) return;
      try {
        const [assetSnap, thbSnap] = await Promise.all([
          getDoc(doc(db, 'users', auth.currentUser.uid, 'balances', assetSymbol)),
          getDoc(doc(db, 'users', auth.currentUser.uid, 'balances', 'THB'))
        ]);
        
        if (assetSnap.exists()) setBalance(assetSnap.data().amount);
        if (thbSnap.exists()) setThbBalance(thbSnap.data().amount);
      } catch (error) {
        console.error("Error fetching balance:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBalances();
  }, [assetSymbol, tradeStatus]);

  const handleTrade = async () => {
    if (!auth.currentUser || !amount || !tradeMode) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setTradeLoading(true);
    setTradeStatus(null);

    try {
      const userUid = auth.currentUser.uid;
      const totalCost = numAmount * asset.price;

      await runTransaction(db, async (transaction) => {
        const thbRef = doc(db, 'users', userUid, 'balances', 'THB');
        const assetRef = doc(db, 'users', userUid, 'balances', assetSymbol);
        
        const thbSnap = await transaction.get(thbRef);
        const assetSnap = await transaction.get(assetRef);
        
        const currentThb = thbSnap.exists() ? thbSnap.data().amount : 0;
        const currentAsset = assetSnap.exists() ? assetSnap.data().amount : 0;

        if (tradeMode === 'BUY') {
          if (currentThb < totalCost) throw new Error('Insufficient THB balance');
          transaction.set(thbRef, { amount: currentThb - totalCost }, { merge: true });
          transaction.set(assetRef, { amount: currentAsset + numAmount }, { merge: true });
        } else {
          if (currentAsset < numAmount) throw new Error(`Insufficient ${assetSymbol} balance`);
          transaction.set(thbRef, { amount: currentThb + totalCost }, { merge: true });
          transaction.set(assetRef, { amount: currentAsset - numAmount }, { merge: true });
        }

        // Log transaction
        const txRef = doc(collection(db, 'users', userUid, 'transactions'));
        transaction.set(txRef, {
          type: tradeMode,
          asset: assetSymbol,
          amount: numAmount,
          price: asset.price,
          total: totalCost,
          timestamp: serverTimestamp(),
          status: 'COMPLETED'
        });
      });

      setTradeStatus('SUCCESS');
      onBalanceUpdate();
      setTimeout(() => {
        setTradeMode(null);
        setAmount('');
        setTradeStatus(null);
      }, 2000);
    } catch (error: any) {
      setTradeStatus('ERROR');
      setErrorMessage(error.message || 'Trade failed');
    } finally {
      setTradeLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[150] flex flex-col">
      <header className="px-5 py-6 flex items-center justify-between border-b border-gray-800 bg-[#0D1117]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black text-white uppercase tracking-widest">{asset.name}</h1>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{assetSymbol} / THB</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Price Section */}
        <div className="px-5 py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-[#00D632] font-black text-lg">
              {asset.icon}
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter italic">
              ฿{asset.price.toLocaleString()}
            </h2>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="bg-[#00D632]/10 text-[#00D632] px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +2.45%
            </span>
            <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Last 24h</span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="h-64 px-2 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D632" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00D632" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1F26', border: '1px solid #374151', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#00D632', fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#00D632" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Balance Stats */}
        <div className="px-5 grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#1A1F26] border border-gray-800 rounded-3xl p-5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Your Balance</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{loading ? '...' : balance.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-gray-600">{assetSymbol}</span>
            </div>
            <p className="text-[10px] text-gray-600 font-bold mt-1">≈ ฿{(balance * asset.price).toLocaleString()}</p>
          </div>
          <div className="bg-[#1A1F26] border border-gray-800 rounded-3xl p-5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Available THB</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[#00D632]">฿{loading ? '...' : thbBalance.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-gray-600 font-bold mt-1">Buy power</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 space-y-4 mb-10">
          <div className="flex gap-4">
            <motion.button 
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setTradeMode('BUY')}
              className="flex-1 py-5 bg-[#00D632] text-black rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-[#00D632]/20 transition-all"
            >
              Quick Buy
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setTradeMode('SELL')}
              className="flex-1 py-5 bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest text-sm border border-gray-700 transition-all"
            >
              Quick Sell
            </motion.button>
          </div>
        </div>
      </div>

      {/* Trade Modal */}
      <AnimatePresence>
        {tradeMode && (
          <div className="fixed inset-0 z-[200] flex items-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !tradeLoading && setTradeMode(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full bg-[#1A1F26] border-t border-gray-800 rounded-t-[40px] p-8 pb-12"
            >
              <div className="w-12 h-1.5 bg-gray-800 rounded-full mx-auto mb-8" />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className={cn(
                    "text-2xl font-black uppercase italic tracking-tighter",
                    tradeMode === 'BUY' ? "text-[#00D632]" : "text-white"
                  )}>
                    {tradeMode === 'BUY' ? 'Buy' : 'Sell'} {assetSymbol}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                    Market Price: ฿{asset.price.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">
                    {tradeMode === 'BUY' ? 'THB Available' : `${assetSymbol} Available`}
                  </span>
                  <span className="text-white font-black">
                    {tradeMode === 'BUY' ? `฿${thbBalance.toLocaleString()}` : `${balance.toLocaleString()} ${assetSymbol}`}
                  </span>
                </div>
              </div>

              {tradeStatus === 'SUCCESS' ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-[#00D632]/10 rounded-full flex items-center justify-center text-[#00D632] mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black text-white uppercase italic mb-2">Trade Confirmed!</h4>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Your balance has been updated instantly</p>
                </div>
              ) : tradeStatus === 'ERROR' ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black text-white uppercase italic mb-2">Trade Failed</h4>
                  <p className="text-red-500/70 font-bold uppercase tracking-widest text-[10px]">{errorMessage}</p>
                  <button 
                    onClick={() => setTradeStatus(null)}
                    className="mt-6 text-[10px] font-black text-white uppercase tracking-widest underline"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-black/40 border border-gray-800 rounded-3xl py-8 px-6 text-center text-4xl font-black text-white placeholder:text-gray-800 outline-none focus:border-[#00D632]/50 transition-all"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 font-black text-xl">
                      {assetSymbol}
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estimated {tradeMode === 'BUY' ? 'Cost' : 'Receive'}</span>
                    <span className="text-[#00D632] font-black text-lg italic tracking-tight">
                      ฿{((parseFloat(amount) || 0) * asset.price).toLocaleString()}
                    </span>
                  </div>

                  <button
                    disabled={tradeLoading || !amount}
                    onClick={handleTrade}
                    className={cn(
                      "w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg",
                      tradeMode === 'BUY' ? "bg-[#00D632] text-black shadow-[#00D632]/20" : "bg-white text-black",
                      tradeLoading && "opacity-50"
                    )}
                  >
                    {tradeLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {tradeMode === 'BUY' ? 'Confirm Purchase' : 'Confirm Sale'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

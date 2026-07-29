import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Plus, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { auth, db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import DepositTHB from '../wallet/DepositTHB';
import WithdrawTHB from '../wallet/WithdrawTHB';
import AssetDetail from '../wallet/AssetDetail';

const WalletScreen = memo(() => {
  const { t } = useLanguage();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [balances, setBalances] = useState<{ [key: string]: number }>({ THB: 0, KUB: 0, BTC: 0, SOL: 0, ETH: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const balancesSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'balances'));
      const b: { [key: string]: number } = {};
      balancesSnap.forEach(doc => {
        b[doc.id] = doc.data().amount;
      });
      setBalances(prev => ({ ...prev, ...b }));
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const PORTFOLIO_DATA = useMemo(() => [
    { name: 'BTC', value: 40, color: '#f59e0b', full: 'Bitcoin' },
    { name: 'THB', value: 30, color: '#00D632', full: 'Thai Baht' },
    { name: 'KUB', value: 20, color: '#10b981', full: 'Bitkub Coin' },
    { name: 'ETH', value: 10, color: '#3b82f6', full: 'Ethereum' },
  ], []);

  const ASSETS = useMemo(() => [
    { symbol: 'THB', name: 'Thai Baht', amount: balances.THB.toLocaleString(), value: balances.THB.toLocaleString(), icon: '฿' },
    { symbol: 'BTC', name: 'Bitcoin', amount: (balances.BTC || 0).toString(), value: ((balances.BTC || 0) * 2300000).toLocaleString(), icon: '₿' },
    { symbol: 'KUB', name: 'Bitkub Coin', amount: (balances.KUB || 0).toLocaleString(), value: ((balances.KUB || 0) * 78.55).toLocaleString(), icon: 'K' },
    { symbol: 'ETH', name: 'Ethereum', amount: (balances.ETH || 0).toString(), value: ((balances.ETH || 0) * 120000).toLocaleString(), icon: 'Ξ' },
    { symbol: 'SOL', name: 'Solana', amount: (balances.SOL || 0).toString(), value: ((balances.SOL || 0) * 6000).toLocaleString(), icon: 'S' },
  ], [balances]);

  const totalValue = useMemo(() => 
    balances.THB + (balances.KUB * 78.55) + ((balances.BTC || 0) * 2300000) + ((balances.ETH || 0) * 120000) + ((balances.SOL || 0) * 6000),
    [balances.THB, balances.KUB, balances.BTC, balances.ETH, balances.SOL]
  );

  return (
    <div className="flex-1 flex flex-col bg-[#0D1117] h-full overflow-hidden relative">
      <AnimatePresence>
        {showDeposit && (
          <DepositTHB 
            onBack={() => setShowDeposit(false)} 
            onSuccess={() => {
              setShowDeposit(false);
              fetchBalances();
            }} 
          />
        )}
        {showWithdraw && (
          <WithdrawTHB 
            onBack={() => setShowWithdraw(false)} 
            onSuccess={() => {
              setShowWithdraw(false);
              fetchBalances();
            }} 
          />
        )}
        {selectedAsset && selectedAsset !== 'THB' && (
          <AssetDetail 
            assetSymbol={selectedAsset}
            onBack={() => setSelectedAsset(null)}
            onBalanceUpdate={fetchBalances}
          />
        )}
      </AnimatePresence>

      <header className="px-5 pt-6 pb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white tracking-tight uppercase">{t('wallet')}</h1>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total</span>
          <span className="text-xs font-bold text-[#00D632]">฿{totalValue.toLocaleString()}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4 no-scrollbar">
        <div className="mb-8">
          <div className="flex gap-3 mb-6">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeposit(true)}
              className="flex-1 bg-[#00D632] text-black py-3 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-[#00D632]/20"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              {t('deposit')}
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWithdraw(true)}
              className="flex-1 bg-gray-800 text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-bold border border-gray-700"
            >
              <ArrowUpRight className="w-5 h-5 text-[#00D632]" />
              {t('withdraw')}
            </motion.button>
          </div>
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">{t('estimated_value')}</p>
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-3xl font-black text-white">฿ {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <span className="text-sm font-bold text-gray-600">THB</span>
          </div>
          <div className="bg-gray-800/20 border border-gray-800 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-xs text-gray-500 font-medium">{t('available_balance')}</span>
            <span className="text-sm font-bold text-white">฿ {balances.THB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="h-48 mb-10 flex items-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center">
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Spread</span>
               <span className="text-lg font-black text-white">4 Assets</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={PORTFOLIO_DATA}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {PORTFOLIO_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 ml-4">
            {PORTFOLIO_DATA.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold text-gray-400">{item.name} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 px-1">{t('assets')}</h3>
          {ASSETS.map((asset, index) => (
            <AssetRow 
              key={asset.symbol} 
              asset={asset} 
              index={index} 
              onClick={() => setSelectedAsset(asset.symbol)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

WalletScreen.displayName = 'WalletScreen';

const AssetRow = memo(({ asset, index, onClick }: { asset: any, index: number, onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ x: 5, backgroundColor: 'rgba(31, 41, 55, 0.3)' }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="bg-gray-800/10 border border-gray-800/50 rounded-2xl p-4 flex justify-between items-center group cursor-pointer transition-all"
  >
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-[#00D632] font-black text-xl shadow-inner">
        {asset.icon}
      </div>
      <div className="flex flex-col">
        <span className="text-white font-bold text-sm">{asset.name}</span>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{asset.amount} {asset.symbol}</span>
      </div>
    </div>
    <div className="flex flex-col items-end">
      <span className="text-white font-bold text-sm">฿{asset.value}</span>
      <span className="text-[10px] text-[#00D632] font-bold">+1.2%</span>
    </div>
  </motion.div>
));

AssetRow.displayName = 'AssetRow';

export default WalletScreen;

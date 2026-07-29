import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Plus, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useNavScroll } from '../../contexts/NavScrollContext';
import { auth, db } from '../../lib/firebase';
import { ASSETS_DATA } from '../../data';
import { collection, getDocs } from 'firebase/firestore';
import DepositTHB from '../wallet/DepositTHB';
import WithdrawTHB from '../wallet/WithdrawTHB';
import AssetDetail from '../wallet/AssetDetail';

const WalletScreen = memo(() => {
  const { t } = useLanguage();
  const { format, currency } = useCurrency();
  const { isNavVisible } = useNavScroll();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [balances, setBalances] = useState<{ [key: string]: number }>({ THB: 0, KUB: 0, BTC: 0, SOL: 0, ETH: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const balancesSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'balances'));
      const b: { [key: string]: number } = { THB: 0, KUB: 0, BTC: 0, SOL: 0, ETH: 0 };
      balancesSnap.forEach(doc => {
        const amount = doc.data().amount;
        if (typeof amount === 'number') {
          b[doc.id] = amount;
        }
      });
      setBalances(b);
    } catch (error) {
      console.error("Error fetching balances:", error);
      // Fallback to 0s to avoid stale/mock data
      setBalances({ THB: 0, KUB: 0, BTC: 0, SOL: 0, ETH: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const totalValue = useMemo(() => 
    Object.keys(balances).reduce((acc, symbol) => {
      const amount = balances[symbol] || 0;
      const price = ASSETS_DATA[symbol]?.price || 0;
      return acc + (amount * price);
    }, 0),
    [balances]
  );

  const ASSETS = useMemo(() => 
    Object.keys(ASSETS_DATA).map(symbol => {
      const amount = balances[symbol] || 0;
      const val = amount * ASSETS_DATA[symbol].price;
      return { 
        symbol, 
        name: ASSETS_DATA[symbol].name, 
        amount: symbol === 'THB' ? amount.toLocaleString() : amount.toString(), 
        value: val, 
        icon: ASSETS_DATA[symbol].icon 
      };
    }),
  [balances]);

  const PORTFOLIO_DATA = useMemo(() => {
    if (totalValue === 0) return [
      { name: 'EMPTY', value: 100, color: '#1f2937', full: 'Empty' }
    ];

    return ASSETS
      .filter(a => a.value > 0)
      .map(a => ({
        name: a.symbol,
        value: Math.round((a.value / totalValue) * 100),
        color: a.symbol === 'BTC' ? '#f59e0b' : a.symbol === 'THB' ? '#00D632' : a.symbol === 'KUB' ? '#10b981' : '#3b82f6',
        full: a.name
      }));
  }, [ASSETS, totalValue]);

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
        <h1 className="text-lg font-bold text-white tracking-tight uppercase">{t('wallet')}</h1>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Total</span>
          <span className="text-xs font-bold text-[#00D632]">{format(totalValue)}</span>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2 no-scrollbar">
        <div className="mb-6">
          <div className="flex gap-3 mb-4">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeposit(true)}
              className="flex-1 bg-[#00D632] text-black py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-[#00D632]/20 text-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              {t('deposit')}
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWithdraw(true)}
              className="flex-1 bg-gray-800 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold border border-gray-700 text-sm"
            >
              <ArrowUpRight className="w-4 h-4 text-[#00D632]" />
              {t('withdraw')}
            </motion.button>
          </div>
          <p className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mb-0.5">{t('estimated_value')}</p>
          <div className="flex items-baseline gap-1.5 mb-3">
            <h2 className="text-2xl font-black text-white">{format(totalValue)}</h2>
            <span className="text-xs font-bold text-gray-600">{currency}</span>
          </div>
          <div className="bg-gray-800/20 border border-gray-800 rounded-xl p-3 flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-medium uppercase">{t('available_balance')}</span>
            <span className="text-xs font-bold text-white">{format(balances.THB)}</span>
          </div>
        </div>

        <div className="h-40 mb-6 flex items-center relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center">
               <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">Spread</span>
               <span className="text-base font-black text-white">{ASSETS.filter(a => Number(a.amount) > 0).length} Assets</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={PORTFOLIO_DATA}
                innerRadius={50}
                outerRadius={65}
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
          <div className="flex flex-col gap-1.5 ml-2">
            {PORTFOLIO_DATA.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] font-bold text-gray-400">{item.name} {item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 px-1">{t('assets')}</h3>
          {ASSETS.map((asset, index) => (
            <AssetRow 
              key={asset.symbol} 
              asset={asset} 
              index={index} 
              onClick={() => setSelectedAsset(asset.symbol)}
              format={format}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

WalletScreen.displayName = 'WalletScreen';

const AssetRow = memo(({ asset, index, onClick, format }: { asset: any, index: number, onClick: () => void, format: any }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ x: 5, backgroundColor: 'rgba(31, 41, 55, 0.3)' }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="bg-gray-800/10 border border-gray-800/50 rounded-xl p-3 flex justify-between items-center group cursor-pointer transition-all"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-[#00D632] font-black text-lg shadow-inner">
        {asset.icon}
      </div>
      <div className="flex flex-col">
        <span className="text-white font-bold text-xs">{asset.name}</span>
        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{asset.amount} {asset.symbol}</span>
      </div>
    </div>
    <div className="flex flex-col items-end">
      <span className="text-white font-bold text-xs">{format(asset.value)}</span>
      <span className="text-[9px] text-[#00D632] font-bold">+1.2%</span>
    </div>
  </motion.div>
));

AssetRow.displayName = 'AssetRow';

export default WalletScreen;

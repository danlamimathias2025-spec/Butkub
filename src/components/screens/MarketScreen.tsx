import { useState, useEffect, memo, useMemo } from 'react';
import { Search, ChevronRight, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavScroll } from '../../contexts/NavScrollContext';
import Skeleton from '../Skeleton';

const MARKET_PAIRS = [
  { symbol: 'BTC/THB', price: '2,251,500', change: 1.25 },
  { symbol: 'ETH/THB', price: '112,100', change: 0.82 },
  { symbol: 'KUB/THB', price: '78.55', change: 2.40 },
  { symbol: 'USDT/THB', price: '35.25', change: 0.03 },
  { symbol: 'ADA/THB', price: '18.20', change: -0.15 },
];

const MarketScreen = memo(() => {
  const { t } = useLanguage();
  const { isNavVisible } = useNavScroll();
  const [activeTab, setActiveTab] = useState('THB Pairs');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  
  const tabs = useMemo(() => [
    { label: t('favorites'), value: 'Favorites' },
    { label: t('thb_pairs'), value: 'THB Pairs' },
    { label: t('usdt_pairs'), value: 'USDT Pairs' },
    { label: t('kub_pairs'), value: 'KUB Pairs' },
    { label: t('top_gainers'), value: 'Top Gainers' }
  ], [t]);

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
        <h1 className="text-lg font-bold text-white tracking-tight uppercase">{t('market_title')}</h1>
        <button className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400">
          <Search className="w-4 h-4" />
        </button>
      </motion.header>

      <div className="px-5 mb-2 overflow-x-auto no-scrollbar flex items-center gap-4 border-b border-gray-800/50">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "whitespace-nowrap text-[10px] font-semibold transition-colors relative pb-2",
              activeTab === tab.value ? "text-[#00D632]" : "text-gray-500"
            )}
          >
            {tab.label}
            {activeTab === tab.value && (
              <motion.div 
                layoutId="marketTabActive"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D632] rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800/30">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="w-16 h-3" />
                  <Skeleton className="w-10 h-2" />
                </div>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-12 h-3 rounded" />
              </div>
            </div>
          ))
        ) : (
          MARKET_PAIRS.map((pair, index) => (
            <motion.div
              key={pair.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between py-3 border-b border-gray-800/30 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-800/50 flex items-center justify-center border border-gray-700 group-hover:border-[#00D632]/30 transition-colors">
                  <TrendingUp className={cn("w-4 h-4", pair.change > 0 ? "text-[#00D632]" : "text-red-500")} />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-xs">{pair.symbol}</span>
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-medium">{t('spot')}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-white font-bold text-xs">{pair.price}</span>
                  <span className={cn(
                    "text-[9px] font-bold px-1 py-0.5 rounded",
                    pair.change > 0 ? "text-[#00D632]" : "text-red-500"
                  )}>
                    {pair.change > 0 ? '+' : ''}{pair.change}%
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
});

MarketScreen.displayName = 'MarketScreen';

export default MarketScreen;

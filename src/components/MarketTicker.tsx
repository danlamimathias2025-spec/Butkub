import { useState, memo, useMemo } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Search } from 'lucide-react';
import { MarketPair } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

const MARKET_DATA: MarketPair[] = [
  {
    symbol: 'BTC/THB',
    name: 'Bitcoin',
    price: 2250000,
    change: 3.15,
    data: Array.from({ length: 10 }, (_, i) => ({ value: 2100000 + Math.random() * 200000 }))
  },
  {
    symbol: 'ETH/THB',
    name: 'Ethereum',
    price: 112000,
    change: 1.80,
    data: Array.from({ length: 10 }, (_, i) => ({ value: 100000 + Math.random() * 20000 }))
  },
  {
    symbol: 'USDT/THB',
    name: 'Tether',
    price: 35.20,
    change: 0.02,
    isNeutral: true,
    data: Array.from({ length: 10 }, (_, i) => ({ value: 35.15 + Math.random() * 0.1 }))
  },
  {
    symbol: 'KUB/THB',
    name: 'Bitkub Coin',
    price: 78.50,
    change: 8.40,
    data: Array.from({ length: 10 }, (_, i) => ({ value: 65 + Math.random() * 15 }))
  },
  {
    symbol: 'SOL/THB',
    name: 'Solana',
    price: 5400,
    change: 4.25,
    data: Array.from({ length: 10 }, (_, i) => ({ value: 4800 + Math.random() * 1000 }))
  },
  {
    symbol: 'XRP/THB',
    name: 'Ripple',
    price: 18.45,
    change: -1.20,
    data: Array.from({ length: 10 }, (_, i) => ({ value: 17 + Math.random() * 3 }))
  }
];

const MarketTicker = memo(() => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('Favorites');
  const [searchQuery, setSearchQuery] = useState('');
  
  const tabs = useMemo(() => [
    { label: t('favorites'), value: 'Favorites' },
    { label: t('all'), value: 'All' },
    { label: t('top_gainers'), value: 'Top Gainers' },
    { label: t('thb_pairs'), value: 'THB Pairs' }
  ], [t]);

  const filteredData = useMemo(() => 
    MARKET_DATA.filter(pair => 
      pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [searchQuery]
  );

  return (
    <div className="flex flex-col flex-1 bg-gray-900/30 rounded-t-3xl border-t border-gray-800/60 mt-2">
      <div className="px-5 pt-6 pb-2">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00D632]/50 transition-colors"
          />
        </div>

        <div className="overflow-x-auto no-scrollbar flex items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "whitespace-nowrap text-xs font-semibold transition-colors relative pb-2",
                activeTab === tab.value ? "text-[#00D632]" : "text-gray-500"
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D632] rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-1">
        {filteredData.map((pair, index) => (
          <MarketRow key={pair.symbol} pair={pair} index={index} t={t} />
        ))}
        {filteredData.length === 0 && (
          <div className="py-10 text-center text-gray-500 text-sm">
            {t('no_results')}
          </div>
        )}
      </div>
    </div>
  );
});

MarketTicker.displayName = 'MarketTicker';

const MarketRow = memo(({ pair, index, t }: { pair: MarketPair, index: number, t: (k: string) => string }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    whileHover={{ x: 4, backgroundColor: 'rgba(31, 41, 55, 0.2)' }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
    className="flex items-center justify-between py-4 px-2 rounded-xl cursor-pointer transition-all"
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center border transition-transform hover:scale-105",
        pair.symbol === 'BTC/THB' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
        pair.symbol === 'ETH/THB' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
        pair.symbol === 'USDT/THB' ? "bg-teal-500/10 border-teal-500/20 text-teal-500" :
        pair.symbol === 'SOL/THB' ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
        pair.symbol === 'XRP/THB' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" :
        "bg-[#00D632]/10 border-[#00D632]/20 text-[#00D632]"
      )}>
        <span className="font-bold text-xs uppercase">{pair.symbol.split('/')[0]}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-white font-bold text-sm">{pair.name}</span>
        <span className="text-gray-500 text-[10px] uppercase">{pair.symbol}</span>
      </div>
    </div>

    <div className="flex-1 px-4 max-w-[100px]">
      <ResponsiveContainer width="100%" height={24}>
        <LineChart data={pair.data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={pair.isNeutral ? "#4b5563" : (pair.change > 0 ? "#00D632" : "#ef4444")} 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div className="flex flex-col items-end">
      <span className="text-white font-bold text-sm">฿{pair.price.toLocaleString()}</span>
      <span className={cn(
        "text-[10px] font-bold",
        pair.isNeutral ? "text-gray-500" : (pair.change > 0 ? "text-[#00D632]" : "text-red-500")
      )}>
        {pair.change > 0 ? '+' : ''}{pair.change}%
      </span>
    </div>
  </motion.div>
));

MarketRow.displayName = 'MarketRow';

export default MarketTicker;


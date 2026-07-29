import React, { useState, memo } from 'react';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownRight, QrCode, Repeat } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

const TREND_DATA = [
  { value: 330000 },
  { value: 335000 },
  { value: 332000 },
  { value: 340000 },
  { value: 338000 },
  { value: 345000 },
  { value: 342000 },
  { value: 350000 },
];

const PortfolioCard = memo(({ onDeposit, onWithdraw }: { onDeposit: () => void; onWithdraw: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);
  const { t } = useLanguage();

  return (
    <div className="px-5 py-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1A1F26] to-[#0D1117] rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-800/80 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00D632]/5 rounded-full blur-3xl" />

        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400 text-xs uppercase tracking-widest font-medium">{t('portfolio_value')}</span>
          <button onClick={() => setIsVisible(!isVisible)} className="text-gray-500 hover:text-white transition-colors">
            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-end justify-between mb-6">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2 mb-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {isVisible ? '฿ 350,000.00' : '฿ ••••••••'}
              </h1>
              <span className="text-sm font-semibold text-gray-500">THB</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs tracking-wide">≈ {isVisible ? '$9,800.00' : '$•••••'} USD</span>
              <div className="bg-[#00D632]/10 px-2 py-0.5 rounded-full border border-[#00D632]/20">
                <span className="text-[#00D632] text-[10px] font-bold">+5.24% 24h</span>
              </div>
            </div>
          </div>

          <div className="w-24 h-12 mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TREND_DATA}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00D632" 
                  strokeWidth={2} 
                  dot={false} 
                  filter="drop-shadow(0 0 4px rgba(0, 214, 50, 0.5))"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={<Plus className="w-6 h-6" />} label={t('deposit')} onClick={onDeposit} />
          <QuickAction icon={<ArrowUpRight className="w-6 h-6" />} label={t('withdraw')} onClick={onWithdraw} />
          <QuickAction icon={<Repeat className="w-6 h-6" />} label={t('buy_sell')} />
          <QuickAction icon={<QrCode className="w-6 h-6" />} label={t('promptpay')} onClick={onDeposit} />
        </div>
      </motion.div>
    </div>
  );
});

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <motion.button 
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div className="w-12 h-12 bg-gray-800/80 rounded-2xl flex items-center justify-center text-[#00D632] border border-gray-700 shadow-inner group hover:bg-[#00D632] hover:text-white transition-all duration-300">
        {icon}
      </div>
      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{label}</span>
    </motion.button>
  );
}

export default PortfolioCard;

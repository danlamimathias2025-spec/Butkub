import React, { useState, memo } from 'react';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownRight, QrCode, Repeat, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';

const TREND_DATA = [
  { value: 0 },
  { value: 1000 },
  { value: 500 },
  { value: 2000 },
  { value: 1500 },
  { value: 3000 },
  { value: 2500 },
  { value: 4000 },
];

const PortfolioCard = memo(({ 
  onDeposit, 
  onWithdraw, 
  onSend,
  totalValue = 0,
  change24h = 0
}: { 
  onDeposit: () => void; 
  onWithdraw: () => void; 
  onSend: () => void;
  totalValue?: number;
  change24h?: number;
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const { t } = useLanguage();
  const { format, currency, convert } = useCurrency();

  return (
    <div className="px-5 py-2">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1A1F26] to-[#0D1117] rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-800/80 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00D632]/5 rounded-full blur-3xl" />

        <div className="flex items-center justify-between mb-0.5">
          <span className="text-gray-400 text-[10px] uppercase tracking-widest font-medium">{t('portfolio_value')}</span>
          <button onClick={() => setIsVisible(!isVisible)} className="text-gray-500 hover:text-white transition-colors">
            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-end justify-between mb-4">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isVisible ? format(totalValue) : `${currency === 'THB' ? '฿' : currency === 'USD' ? '$' : '€'} •••••••`}
              </h1>
              <span className="text-xs font-semibold text-gray-500">{currency}</span>
            </div>
            <div className="flex items-center gap-2">
              {currency === 'THB' ? (
                <span className="text-gray-400 text-[10px] tracking-wide">≈ {isVisible ? `$ ${(totalValue * 0.028).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$ •••••'} USD</span>
              ) : (
                <span className="text-gray-400 text-[10px] tracking-wide">≈ {isVisible ? `฿ ${(totalValue).toLocaleString()}` : '฿ •••••'} THB</span>
              )}
              <div className={cn(
                "px-1.5 py-0.5 rounded-full border",
                change24h >= 0 ? "bg-[#00D632]/10 border-[#00D632]/20 text-[#00D632]" : "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                <span className="text-[9px] font-bold">{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="w-20 h-10 mb-1">
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
          <QuickAction icon={<Plus className="w-5 h-5" />} label={t('deposit')} onClick={onDeposit} />
          <QuickAction icon={<ArrowUpRight className="w-5 h-5" />} label={t('withdraw')} onClick={onWithdraw} />
          <QuickAction icon={<Send className="w-5 h-5" />} label="Send" onClick={onSend} />
          <QuickAction icon={<QrCode className="w-5 h-5" />} label={t('promptpay')} onClick={onDeposit} />
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
      className="flex flex-col items-center gap-1.5"
    >
      <div className="w-10 h-10 bg-gray-800/80 rounded-xl flex items-center justify-center text-[#00D632] border border-gray-700 shadow-inner group hover:bg-[#00D632] hover:text-white transition-all duration-300">
        {icon}
      </div>
      <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap">{label}</span>
    </motion.button>
  );
}

export default PortfolioCard;

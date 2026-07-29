import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ArrowUpRight, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PERFORMANCE_DATA = [
  { month: 'Jan', value: 45000, growth: 12 },
  { month: 'Feb', value: 52000, growth: 15 },
  { month: 'Mar', value: 48000, growth: -8 },
  { month: 'Apr', value: 61000, growth: 27 },
  { month: 'May', value: 75000, growth: 22 },
  { month: 'Jun', value: 89000, growth: 18 },
  { month: 'Jul', value: 95400, growth: 7.2 },
];

export default function PerformanceCard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 mb-8"
    >
      <div className="bg-[#1A1F26] border border-gray-800 rounded-[32px] p-6 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00D632]/10 rounded-xl flex items-center justify-center text-[#00D632]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-tight">Performance</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Monthly Growth Summary</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[#00D632] font-black text-sm flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> +24.8%
            </span>
            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Year to Date</span>
          </div>
        </div>

        <div className="h-48 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={PERFORMANCE_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.1} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 'bold' }} 
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ 
                  backgroundColor: '#0D1117', 
                  border: '1px solid #374151', 
                  borderRadius: '16px',
                  padding: '12px'
                }}
                itemStyle={{ color: '#00D632', fontWeight: 'bold', fontSize: '12px' }}
                labelStyle={{ color: '#9CA3AF', marginBottom: '4px', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}
              />
              <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                {PERFORMANCE_DATA.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === PERFORMANCE_DATA.length - 1 ? '#00D632' : '#374151'} 
                    fillOpacity={index === PERFORMANCE_DATA.length - 1 ? 1 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-6 border-t border-gray-800/50">
          <div className="space-y-1">
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Best Month</span>
            <p className="text-white font-black text-xs">APR (+27%)</p>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Avg Growth</span>
            <p className="text-[#00D632] font-black text-xs">+12.4%</p>
          </div>
          <div className="space-y-1 text-right">
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Status</span>
            <div className="flex items-center justify-end gap-1 text-[#00D632]">
              <span className="text-[10px] font-black uppercase tracking-widest">Bullish</span>
              <div className="w-1.5 h-1.5 bg-[#00D632] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

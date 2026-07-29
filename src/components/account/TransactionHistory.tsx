import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, CheckCircle2, XCircle, TrendingUp, TrendingDown, Plus, Minus, History } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '@/src/lib/utils';

interface Transaction {
  id: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW';
  asset: string;
  amount: number;
  price?: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  timestamp: string;
}

interface TransactionHistoryProps {
  onBack: () => void;
}

export default function TransactionHistory({ onBack }: TransactionHistoryProps) {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'users', auth.currentUser.uid, 'transactions'),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedTransactions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        setTransactions(fetchedTransactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-[#00D632]';
      case 'PENDING': return 'text-yellow-500';
      case 'CANCELLED': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-3 h-3" />;
      case 'PENDING': return <Clock className="w-3 h-3" />;
      case 'CANCELLED': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUY': return <TrendingUp className="w-4 h-4 text-[#00D632]" />;
      case 'SELL': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'DEPOSIT': return <Plus className="w-4 h-4 text-[#00D632]" />;
      case 'WITHDRAW': return <Minus className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute inset-0 bg-[#0D1117] z-50 flex flex-col"
    >
      <header className="px-5 pt-6 pb-4 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight uppercase">{t('history')}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-[#00D632]/30 border-t-[#00D632] rounded-full animate-spin" />
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{t('loading_history')}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-800/30 rounded-full flex items-center justify-center mb-6 text-gray-700">
              <History className="w-10 h-10" />
            </div>
            <h3 className="text-white font-black text-lg mb-2">{t('no_transactions')}</h3>
            <p className="text-gray-500 text-sm px-10">{t('no_transactions_desc')}</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-800/20 border border-gray-800/50 rounded-2xl p-4 flex items-center justify-between group hover:border-gray-700 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center">
                    {getTypeIcon(tx.type)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm tracking-tight">{tx.asset}</span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{tx.type}</span>
                    </div>
                    <span className="text-[10px] text-gray-600 font-medium">
                      {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className={cn(
                    "font-black text-sm",
                    tx.type === 'BUY' || tx.type === 'DEPOSIT' ? "text-white" : "text-white"
                  )}>
                    {tx.type === 'BUY' || tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter",
                    getStatusColor(tx.status)
                  )}>
                    {getStatusIcon(tx.status)}
                    {tx.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

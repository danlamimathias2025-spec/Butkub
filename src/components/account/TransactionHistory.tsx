import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, CheckCircle2, XCircle, TrendingUp, TrendingDown, Plus, Minus, History, Receipt, ChevronRight } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '@/src/lib/utils';
import { triggerHaptic } from '@/src/lib/haptics';
import TransactionReceiptModal, { TransactionReceiptData } from './TransactionReceiptModal';

interface TransactionHistoryProps {
  onBack: () => void;
}

export default function TransactionHistory({ onBack }: TransactionHistoryProps) {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<TransactionReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<TransactionReceiptData | null>(null);

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
        })) as TransactionReceiptData[];
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
      case 'TRANSFER': return <Receipt className="w-4 h-4 text-blue-400" />;
      case 'CONVERT': return <TrendingUp className="w-4 h-4 text-purple-400" />;
      default: return <Receipt className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed inset-0 bg-[#0D1117] z-[150] flex flex-col"
      >
        <header className="px-5 pt-6 pb-4 flex items-center gap-4 sticky top-0 bg-[#0D1117] z-10 border-b border-gray-800">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight uppercase">{t('history')}</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Tap any transaction to view receipt</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-28">
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
            <div className="space-y-3 py-4">
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => {
                    triggerHaptic('medium');
                    setSelectedTx(tx);
                  }}
                  className="bg-gray-800/20 border border-gray-800/60 hover:border-[#00D632]/50 rounded-2xl p-4 flex items-center justify-between group cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700/50 flex items-center justify-center shrink-0">
                      {getTypeIcon(tx.type)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm tracking-tight">{tx.asset}</span>
                        <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-bold uppercase">{tx.type}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium mt-0.5">
                        {tx.dateStr || new Date(tx.timestamp).toLocaleDateString()} {tx.timeStr || new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-sm text-white">
                        {tx.type === 'BUY' || tx.type === 'DEPOSIT' || (tx.type === 'TRANSFER' && tx.direction === 'IN') ? '+' : '-'}
                        {tx.amount?.toLocaleString()}
                      </span>
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter",
                        getStatusColor(tx.status)
                      )}>
                        {getStatusIcon(tx.status)}
                        {tx.status}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#00D632] transition-colors shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Transaction Receipt Dialog Overlay */}
      {selectedTx && (
        <TransactionReceiptModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </>
  );
}

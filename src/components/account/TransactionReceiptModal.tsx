import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Clock, XCircle, Copy, Check, ShieldCheck, ArrowRight, Download, Share2, Building2, User, Wallet } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { triggerHaptic } from '@/src/lib/haptics';
import { auth } from '../../lib/firebase';

interface SenderReceiverInfo {
  name: string;
  account: string;
  type?: string;
}

export interface TransactionReceiptData {
  id: string;
  txId?: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'CONVERT';
  asset: string;
  amount: number;
  price?: number;
  total?: number;
  fee?: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  timestamp: string;
  dateStr?: string;
  timeStr?: string;
  senderInfo?: SenderReceiverInfo;
  receiverInfo?: SenderReceiverInfo;
  direction?: 'IN' | 'OUT';
  recipientEmail?: string;
  senderEmail?: string;
  method?: string;
  payCode?: string;
  fromAsset?: string;
  toAsset?: string;
  fromAmount?: number;
  toAmount?: number;
}

interface TransactionReceiptModalProps {
  transaction: TransactionReceiptData | null;
  onClose: () => void;
}

export default function TransactionReceiptModal({ transaction, onClose }: TransactionReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const currentUserEmail = auth.currentUser?.email || 'User';

  // Compute derived values for legacy or missing fields
  let txId = transaction.txId;
  if (!txId) {
    const rawId = (transaction.id || '984A29B').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    txId = `TX-${rawId}`;
  }

  let dateStr = transaction.dateStr;
  let timeStr = transaction.timeStr;
  if (!dateStr || !timeStr) {
    const dateObj = transaction.timestamp ? new Date(transaction.timestamp) : new Date();
    dateStr = isNaN(dateObj.getTime())
      ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    timeStr = isNaN(dateObj.getTime())
      ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  let senderInfo = transaction.senderInfo;
  let receiverInfo = transaction.receiverInfo;

  if (!senderInfo || !receiverInfo) {
    switch (transaction.type) {
      case 'TRANSFER':
        if (transaction.direction === 'OUT') {
          senderInfo = { name: currentUserEmail, account: 'Bitkub Internal Wallet', type: 'Bitkub Sender' };
          receiverInfo = { name: transaction.recipientEmail || 'Recipient User', account: 'Bitkub Internal Wallet', type: 'Bitkub Recipient' };
        } else {
          senderInfo = { name: transaction.senderEmail || 'Sender User', account: 'Bitkub Internal Wallet', type: 'Bitkub Sender' };
          receiverInfo = { name: currentUserEmail, account: 'Bitkub Internal Wallet', type: 'Bitkub Recipient' };
        }
        break;
      case 'DEPOSIT':
        senderInfo = {
          name: transaction.method ? `${transaction.method} Gateway` : 'Thai QR PromptPay',
          account: transaction.payCode ? `Code: ${transaction.payCode}` : 'Deposit Provider',
          type: 'Payment Method'
        };
        receiverInfo = { name: currentUserEmail, account: 'Bitkub THB Wallet', type: 'Bitkub User' };
        break;
      case 'WITHDRAW':
        senderInfo = { name: currentUserEmail, account: 'Bitkub THB Wallet', type: 'Bitkub User' };
        receiverInfo = { name: 'Kasikorn Bank / Linked Bank', account: 'Acc: •••• 4829', type: 'Destination Bank' };
        break;
      case 'BUY':
        senderInfo = { name: currentUserEmail, account: 'THB Wallet', type: 'Bitkub User' };
        receiverInfo = { name: 'Bitkub Liquidity Pool', account: `${transaction.asset || 'Crypto'} Spot Market`, type: 'System Exchange' };
        break;
      case 'SELL':
        senderInfo = { name: currentUserEmail, account: `${transaction.asset || 'Crypto'} Wallet`, type: 'Bitkub User' };
        receiverInfo = { name: 'Bitkub Liquidity Pool', account: 'THB Spot Market', type: 'System Exchange' };
        break;
      case 'CONVERT':
        senderInfo = { name: currentUserEmail, account: `${transaction.fromAsset || 'THB'} Wallet`, type: 'Bitkub User' };
        receiverInfo = { name: currentUserEmail, account: `${transaction.toAsset || 'KUB'} Wallet`, type: 'Bitkub User' };
        break;
      default:
        senderInfo = { name: currentUserEmail, account: 'Main Wallet', type: 'Bitkub User' };
        receiverInfo = { name: 'Bitkub System', account: 'System Account', type: 'System' };
    }
  }

  const handleCopyTxId = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(txId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (transaction.status) {
      case 'COMPLETED':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D632]/10 text-[#00D632] border border-[#00D632]/20 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </div>
        );
      case 'PENDING':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Pending Processing
          </div>
        );
      case 'CANCELLED':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold uppercase tracking-wider">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0D1117] border border-gray-800 rounded-3xl p-6 shadow-2xl text-white overflow-hidden my-auto"
        >
          {/* Top Decorative Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#00D632] text-black font-black flex items-center justify-center text-xs">
                K
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">BITKUB OFFICIAL RECEIPT</h3>
                <p className="text-[10px] text-gray-500">Verified Blockchain & Fiat Ledger</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Amount Display */}
          <div className="py-6 text-center border-b border-gray-800/60 bg-gray-900/30 -mx-6 px-6">
            <div className="mb-2">{getStatusBadge()}</div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              {transaction.type} TRANSACTION
            </p>
            <h2 className="text-3xl font-black text-white tracking-tight">
              {transaction.type === 'WITHDRAW' || (transaction.type === 'TRANSFER' && transaction.direction === 'OUT') || transaction.type === 'SELL'
                ? '-'
                : '+'}
              {transaction.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}{' '}
              <span className="text-[#00D632] text-xl font-bold">{transaction.asset}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              {dateStr} • {timeStr}
            </p>
          </div>

          {/* Transaction Metadata & IDs */}
          <div className="py-4 border-b border-gray-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Transaction ID</span>
              <button
                onClick={handleCopyTxId}
                className="flex items-center gap-1.5 font-mono text-gray-300 hover:text-[#00D632] transition-colors bg-gray-800/50 px-2 py-1 rounded-lg border border-gray-700/50"
              >
                <span className="text-[11px] font-bold">{txId}</span>
                {copied ? <Check className="w-3 h-3 text-[#00D632]" /> : <Copy className="w-3 h-3 text-gray-400" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Date & Time</span>
              <span className="text-white font-medium">{dateStr}, {timeStr}</span>
            </div>
          </div>

          {/* Sender & Receiver Info */}
          <div className="py-4 border-b border-gray-800 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Transfer Parties</h4>

            {/* Sender */}
            <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Sender Information</p>
                  <p className="text-xs font-bold text-white tracking-tight">{senderInfo.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{senderInfo.account}</p>
                </div>
              </div>
              <span className="text-[9px] uppercase font-bold text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded-md">
                {senderInfo.type || 'Sender'}
              </span>
            </div>

            <div className="flex justify-center -my-1">
              <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                <ArrowRight className="w-3 h-3 rotate-90" />
              </div>
            </div>

            {/* Receiver */}
            <div className="bg-gray-800/30 border border-gray-800 rounded-2xl p-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#00D632]/10 flex items-center justify-center text-[#00D632] shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Receiver Information</p>
                  <p className="text-xs font-bold text-white tracking-tight">{receiverInfo.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{receiverInfo.account}</p>
                </div>
              </div>
              <span className="text-[9px] uppercase font-bold text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded-md">
                {receiverInfo.type || 'Receiver'}
              </span>
            </div>
          </div>

          {/* Breakdown Details */}
          <div className="py-4 border-b border-gray-800 space-y-2 text-xs">
            {transaction.price && (
              <div className="flex justify-between items-center text-gray-400">
                <span>Unit Price</span>
                <span className="text-white font-medium">฿{transaction.price.toLocaleString()} THB</span>
              </div>
            )}
            {transaction.total && (
              <div className="flex justify-between items-center text-gray-400">
                <span>Subtotal Value</span>
                <span className="text-white font-medium">฿{transaction.total.toLocaleString()} THB</span>
              </div>
            )}
            <div className="flex justify-between items-center text-gray-400">
              <span>Network / Processing Fee</span>
              <span className="text-white font-medium">
                {transaction.fee ? `฿${transaction.fee.toFixed(2)} THB` : 'FREE (฿0.00)'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-gray-800/60">
              <span className="text-gray-300">Total Settlement</span>
              <span className="text-[#00D632] font-black text-base">
                {transaction.amount?.toLocaleString()}{' '}
                <span className="text-xs text-gray-400 font-normal">{transaction.asset}</span>
              </span>
            </div>
          </div>

          {/* Security & Footer Actions */}
          <div className="pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00D632]" />
              <span>Digitally signed and recorded on Bitkub Ledger</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopyTxId}
                className="py-2.5 px-4 rounded-xl bg-gray-800 text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00D632]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy ID'}
              </button>
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-[#00D632] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#00B62A] transition-colors"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

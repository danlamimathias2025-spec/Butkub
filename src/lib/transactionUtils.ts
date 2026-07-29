export function generateTransactionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `TX-${datePrefix}-${randomStr}`;
}

export function formatTxDateTime(timestamp?: string | number | Date | null) {
  const dateObj = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(dateObj.getTime())) {
    const now = new Date();
    return {
      dateStr: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isoStr: now.toISOString(),
    };
  }
  return {
    dateStr: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    timeStr: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isoStr: dateObj.toISOString(),
  };
}

export interface SenderInfo {
  name: string;
  account: string;
  type?: string;
}

export interface ReceiverInfo {
  name: string;
  account: string;
  type?: string;
}

export interface TransactionRecord {
  id: string;
  txId: string;
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
  senderInfo?: SenderInfo;
  receiverInfo?: ReceiverInfo;
  method?: string;
  direction?: 'IN' | 'OUT';
  payCode?: string;
  fromAsset?: string;
  toAsset?: string;
  fromAmount?: number;
  toAmount?: number;
}

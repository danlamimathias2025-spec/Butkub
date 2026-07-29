import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Bell, CheckCircle2, XCircle, Clock, Info, ShieldAlert, Trash2 } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface NotificationsScreenProps {
  onBack: () => void;
}

interface NotificationItem {
  id: string;
  type: 'TRANSACTION' | 'SYSTEM' | 'KYC';
  title: string;
  message: string;
  timestamp: any;
  status?: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'INFO';
  amount?: number;
  asset?: string;
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth.currentUser) return;

      try {
        setLoading(true);
        const userUid = auth.currentUser.uid;
        
        // 1. Fetch Transactions
        const txRef = collection(db, 'users', userUid, 'transactions');
        const q = query(txRef, orderBy('timestamp', 'desc'), limit(20));
        const txSnap = await txSnapshots(q);
        
        const txNotifications: NotificationItem[] = txSnap.docs.map(doc => {
          const data = doc.data() as any;
          let title = '';
          let message = '';
          
          switch(data.type) {
            case 'DEPOSIT':
              title = 'Deposit Update';
              message = `Your deposit of ${data.amount} ${data.asset} is ${data.status.toLowerCase()}.`;
              break;
            case 'WITHDRAW':
              title = 'Withdrawal Update';
              message = `Your withdrawal of ${data.amount} ${data.asset} is ${data.status.toLowerCase()}.`;
              break;
            case 'TRANSFER':
              title = data.direction === 'IN' ? 'Received Funds' : 'Sent Funds';
              message = data.direction === 'IN' 
                ? `You received ${data.amount} ${data.asset} from ${data.senderEmail}.`
                : `You sent ${data.amount} ${data.asset} to ${data.recipientEmail}.`;
              break;
            case 'BUY':
            case 'SELL':
              title = `${data.type} Order`;
              message = `Your order to ${data.type.toLowerCase()} ${data.amount} ${data.asset} is ${data.status.toLowerCase()}.`;
              break;
            default:
              title = 'Transaction Update';
              message = `Update for your ${data.asset} transaction.`;
          }

          return {
            id: doc.id,
            type: 'TRANSACTION',
            title,
            message,
            timestamp: data.timestamp,
            status: data.status,
            amount: data.amount,
            asset: data.asset
          };
        });

        // 2. Fetch User Profile for KYC alerts
        const userSnap = await getDoc(doc(db, 'users', userUid));
        const kycNotifications: NotificationItem[] = [];
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.kycStatus === 'PENDING') {
            kycNotifications.push({
              id: 'kyc-pending',
              type: 'KYC',
              title: 'Identity Verification',
              message: 'Your KYC documents are currently being reviewed by our team.',
              timestamp: userData.createdAt || { seconds: Date.now() / 1000 },
              status: 'PENDING'
            });
          } else if (userData.kycStatus === 'NOT_STARTED') {
            kycNotifications.push({
              id: 'kyc-not-started',
              type: 'KYC',
              title: 'Complete Your Profile',
              message: 'Verify your identity to unlock all features, including withdrawals and trading.',
              timestamp: userData.createdAt || { seconds: Date.now() / 1000 },
              status: 'INFO'
            });
          }
        }

        // 3. Fetch Admin Notifications
        const adminNotifRef = collection(db, 'users', userUid, 'admin_notifications');
        const adminNotifSnap = await getDocs(query(adminNotifRef, orderBy('createdAt', 'desc')));
        const adminNotifications: NotificationItem[] = adminNotifSnap.docs.map(doc => {
          const data = doc.data();
          const dateObj = new Date(data.createdAt || Date.now());
          return {
            id: doc.id,
            type: 'SYSTEM',
            title: data.title || 'Official Notice',
            message: data.message || '',
            timestamp: { seconds: Math.floor(dateObj.getTime() / 1000) },
            status: 'INFO'
          };
        });

        // Combine and sort
        const all = [...adminNotifications, ...kycNotifications, ...txNotifications].sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });

        setNotifications(all);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    const txSnapshots = async (q: any) => {
        return await getDocs(q);
    }

    fetchNotifications();
  }, []);

  const getIcon = (item: NotificationItem) => {
    if (item.type === 'KYC') return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
    
    switch(item.status) {
      case 'COMPLETED': return <CheckCircle2 className="w-5 h-5 text-[#00D632]" />;
      case 'REJECTED': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PENDING': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="fixed inset-0 bg-[#0D1117] z-[200] flex flex-col">
      <header className="px-5 py-6 flex items-center justify-between border-b border-gray-800">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black text-white uppercase tracking-widest">Notifications</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-800/20 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="p-5 space-y-3">
            <AnimatePresence initial={false}>
              {notifications.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-[#1A1F26] border border-gray-800/50 rounded-2xl p-4 flex gap-4 group hover:border-gray-700 transition-colors"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    item.type === 'KYC' ? "bg-yellow-500/10" : 
                    item.status === 'COMPLETED' ? "bg-[#00D632]/10" :
                    item.status === 'REJECTED' ? "bg-red-500/10" :
                    "bg-blue-500/10"
                  )}>
                    {getIcon(item)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold text-sm uppercase tracking-tight">{item.title}</h3>
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{formatDate(item.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                      {item.message}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <button className="w-full py-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] hover:text-gray-400 transition-colors mt-4">
              Clear All Notifications
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-32 px-10 text-center">
            <div className="w-20 h-20 bg-gray-800/20 rounded-full flex items-center justify-center text-gray-600 mb-6">
              <Bell className="w-8 h-8 opacity-20" />
            </div>
            <h2 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">No Notifications</h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
              We'll notify you when something <br/> important happens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Users, CreditCard, Activity, Search, Shield, Trash2, CheckCircle, XCircle, RefreshCcw, DollarSign, Wallet, Plus } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, where, writeBatch, increment, getDoc, collectionGroup } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';

const ADMIN_EMAIL = 'danlamimathias2025@gmail.com';

interface AdminDashboardProps {
  onBack: () => void;
}

interface UserProfile {
  uid: string;
  email: string;
  role: 'USER' | 'ADMIN';
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  balances?: { [key: string]: number };
}

interface TransactionRequest {
  id: string;
  userId: string;
  userEmail: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  asset: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  timestamp: string;
  fee?: number;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<TransactionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Protect the dashboard
  if (auth.currentUser?.email !== ADMIN_EMAIL) {
    return (
      <div className="fixed inset-0 bg-[#0D1117] z-[200] flex items-center justify-center p-10 text-center">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-sm">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white mb-2 uppercase">Access Denied</h2>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs leading-relaxed">
            This area is restricted to authorized administrators only.
          </p>
          <button 
            onClick={onBack}
            className="mt-8 w-full py-4 bg-red-500 text-white font-black uppercase rounded-2xl"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData: UserProfile[] = [];
        
        for (const userDoc of usersSnap.docs) {
          const data = userDoc.data() as UserProfile;
          // Fetch balances for each user
          const balancesSnap = await getDocs(collection(db, 'users', userDoc.id, 'balances'));
          const balances: { [key: string]: number } = {};
          balancesSnap.forEach(b => {
            balances[b.id] = b.data().amount;
          });
          usersData.push({ ...data, balances });
        }
        setUsers(usersData);
      } else {
        // Fetch all pending transactions across all users
        // Since we don't have a top-level transactions collection yet that is indexed, 
        // we might need to use collectionGroup or fetch each user's transactions.
        // For simplicity in this demo, let's assume we can fetch them via collectionGroup if index exists,
        // or just fetch all users and their transactions.
        const txQuery = query(collectionGroup(db, 'transactions'), where('status', '==', 'PENDING'));
        const txSnap = await getDocs(txQuery);
        const requestsData = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionRequest));
        setRequests(requestsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async (userId: string, asset: string, newAmount: number) => {
    try {
      await updateDoc(doc(db, 'users', userId, 'balances', asset), {
        amount: newAmount,
        updatedAt: new Date().toISOString()
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update balance', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      fetchData();
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const handleRequestAction = async (request: TransactionRequest, action: 'APPROVE' | 'REJECT') => {
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'users', request.userId, 'transactions', request.id);
      
      if (action === 'APPROVE') {
        batch.update(txRef, { status: 'COMPLETED' });
        
        // If it's a deposit, add to balance
        if (request.type === 'DEPOSIT') {
          const balanceRef = doc(db, 'users', request.userId, 'balances', request.asset);
          batch.set(balanceRef, { 
            amount: increment(request.amount),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        // Withdrawal was already deducted in my implementation, so we just complete it.
      } else {
        batch.update(txRef, { status: 'REJECTED' });
        
        // If it's a withdrawal, refund the balance
        if (request.type === 'WITHDRAW') {
          const balanceRef = doc(db, 'users', request.userId, 'balances', request.asset);
          const totalAmount = request.amount + (request.fee || 0);
          batch.set(balanceRef, { 
            amount: increment(totalAmount),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
      
      await batch.commit();
      fetchData();
    } catch (err) {
      console.error('Failed to process request', err);
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-[#0D1117] z-[120] flex flex-col"
    >
      <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 text-gray-400">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00D632]" /> Admin Dashboard
          </h1>
        </div>
        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-white transition-colors">
          <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </header>

      <div className="flex bg-gray-900/50 p-1 mx-5 mt-4 rounded-xl border border-gray-800">
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase transition-all",
            activeTab === 'users' ? "bg-gray-800 text-[#00D632] shadow-lg" : "text-gray-500"
          )}
        >
          <Users className="w-4 h-4" /> Users
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase transition-all",
            activeTab === 'requests' ? "bg-gray-800 text-[#00D632] shadow-lg" : "text-gray-500"
          )}
        >
          <CreditCard className="w-4 h-4" /> Requests
        </button>
      </div>

      <div className="px-5 mt-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by email..."
            className="w-full bg-gray-800/20 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D632]/30 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <RefreshCcw className="w-10 h-10 animate-spin text-[#00D632] mb-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Data...</span>
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.uid} className="bg-gray-800/20 border border-gray-800 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className="text-white font-black text-sm">{user.email}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{user.role}</span>
                      <span className={cn(
                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                        user.kycStatus === 'VERIFIED' ? "bg-[#00D632]/10 text-[#00D632]" : 
                        user.kycStatus === 'PENDING' ? "bg-amber-500/10 text-amber-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {user.kycStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const asset = prompt('Enter Asset Symbol (e.g. BTC, ETH, SOL, USDT)');
                        if (asset) {
                          const amount = prompt(`Enter initial amount for ${asset.toUpperCase()}`, '0');
                          if (amount !== null) handleUpdateBalance(user.uid, asset.toUpperCase(), parseFloat(amount));
                        }
                      }}
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
                      title="Add Asset Balance"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {user.kycStatus === 'PENDING' && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={async () => {
                            await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'VERIFIED' });
                            fetchData();
                          }}
                          className="p-2 rounded-lg bg-[#00D632]/10 text-[#00D632] hover:bg-[#00D632] hover:text-black transition-colors"
                          title="Approve KYC"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            await updateDoc(doc(db, 'users', user.uid), { kycStatus: 'REJECTED' });
                            fetchData();
                          }}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                          title="Reject KYC"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={() => handleDeleteUser(user.uid)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 transition-colors hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                   {user.balances && Object.entries(user.balances).map(([asset, amount]) => (
                     <div key={asset} className="flex items-center justify-between bg-black/20 rounded-xl px-3 py-2 border border-gray-800/50">
                        <span className="text-[10px] font-black text-gray-500 uppercase">{asset}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-white font-bold text-sm">{amount.toLocaleString()}</span>
                           <button 
                            onClick={() => {
                              const val = prompt('Enter new balance for ' + asset, amount.toString());
                              if (val !== null) handleUpdateBalance(user.uid, asset, parseFloat(val));
                            }}
                            className="text-[10px] text-[#00D632] font-black uppercase hover:underline"
                           >
                             Edit
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.length === 0 ? (
               <div className="py-20 text-center">
                  <Activity className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-20" />
                  <p className="text-gray-500 text-xs font-bold uppercase">No pending requests</p>
               </div>
            ) : requests.map((req) => (
              <div key={req.id} className="bg-gray-800/20 border border-gray-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px]",
                      req.type === 'DEPOSIT' ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      {req.type[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm tracking-tight">{req.userEmail}</span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{req.type} • {req.asset}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-white font-black text-sm">฿{req.amount.toLocaleString()}</span>
                    {req.fee && <span className="text-[10px] text-gray-500">Fee: ฿{req.fee}</span>}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button 
                    onClick={() => handleRequestAction(req, 'APPROVE')}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00D632] text-black font-black text-xs uppercase"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button 
                    onClick={() => handleRequestAction(req, 'REJECT')}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs uppercase"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

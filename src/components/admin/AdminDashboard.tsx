import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, CreditCard, Activity, Search, Shield, Trash2, 
  CheckCircle, XCircle, RefreshCcw, Plus, Edit3, Eye, FileText, Image as ImageIcon, 
  X, Save, AlertTriangle, ExternalLink, Globe, UserCheck, Bell, Send
} from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, where, writeBatch, increment, collectionGroup, setDoc } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { triggerHaptic } from '@/src/lib/haptics';
import StatusOverlay from '../StatusOverlay';

const ADMIN_EMAIL = 'danlamimathias2025@gmail.com';

interface AdminDashboardProps {
  onBack: () => void;
}

interface UserProfile {
  uid: string;
  email: string;
  role: 'USER' | 'ADMIN';
  kycStatus: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  nationality?: string;
  kycDocumentUrl?: string;
  kycDocumentName?: string;
  submittedAt?: string;
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
  method?: string;
  payCode?: string;
  giftCardImage?: string;
  senderInfo?: { name: string; account: string; type: string };
  receiverInfo?: { name: string; account: string; type: string };
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<TransactionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'ALL'>('PENDING');

  // Modals state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN'>('USER');
  const [editKycStatus, setEditKycStatus] = useState<'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('NOT_STARTED');
  const [editNationality, setEditNationality] = useState('');
  const [editBalances, setEditBalances] = useState<{ [asset: string]: number }>({});
  const [newAssetSymbol, setNewAssetSymbol] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');

  const [viewingKycUser, setViewingKycUser] = useState<UserProfile | null>(null);
  const [viewingGiftCardReq, setViewingGiftCardReq] = useState<TransactionRequest | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const [notifyingUser, setNotifyingUser] = useState<UserProfile | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  const [savingUser, setSavingUser] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message?: string } | null>(null);

  // Protection
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
          const balancesSnap = await getDocs(collection(db, 'users', userDoc.id, 'balances'));
          const balances: { [key: string]: number } = {};
          balancesSnap.forEach(b => {
            balances[b.id] = b.data().amount ?? 0;
          });
          usersData.push({ ...data, uid: userDoc.id, balances });
        }
        setUsers(usersData);
      } else {
        const txQuery = query(collectionGroup(db, 'transactions'));
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

  const openEditUserModal = (user: UserProfile) => {
    triggerHaptic('light');
    setEditingUser(user);
    setEditEmail(user.email || '');
    setEditRole(user.role || 'USER');
    setEditKycStatus(user.kycStatus || 'NOT_STARTED');
    setEditNationality(user.nationality || 'Thai');
    setEditBalances(user.balances ? { ...user.balances } : {});
    setNewAssetSymbol('');
    setNewAssetAmount('');
  };

  const handleSaveUserProfile = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      // 1. Update user profile document
      await updateDoc(doc(db, 'users', editingUser.uid), {
        email: editEmail,
        role: editRole,
        kycStatus: editKycStatus,
        nationality: editNationality,
        updatedAt: new Date().toISOString()
      });

      // 2. Update balances
      const batch = writeBatch(db);
      Object.entries(editBalances).forEach(([asset, amount]) => {
        const balanceRef = doc(db, 'users', editingUser.uid, 'balances', asset);
        batch.set(balanceRef, {
          amount: Number(amount) || 0,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();

      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: 'Profile Updated',
        message: `User profile for ${editEmail} updated successfully.`
      });
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to update user profile', err);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not save user profile.'
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleAddBalanceInEdit = () => {
    if (!newAssetSymbol) return;
    const sym = newAssetSymbol.trim().toUpperCase();
    const val = parseFloat(newAssetAmount) || 0;
    setEditBalances(prev => ({ ...prev, [sym]: val }));
    setNewAssetSymbol('');
    setNewAssetAmount('');
    triggerHaptic('light');
  };

  const handleDeleteUserConfirmed = async () => {
    if (!userToDelete) return;
    try {
      // Delete user document in Firestore
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: 'Account Deleted',
        message: `User ${userToDelete.email} has been permanently deleted.`
      });
      setUserToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete user', err);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Could not delete user account.'
      });
    }
  };

  const handleSendNotification = async () => {
    if (!notifyingUser || !notifTitle.trim() || !notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      const notifRef = doc(collection(db, 'users', notifyingUser.uid, 'admin_notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        userId: notifyingUser.uid,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        createdAt: new Date().toISOString(),
        read: false,
        dismissed: false,
        type: 'ADMIN_MESSAGE'
      });

      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: 'Notification Sent',
        message: `Notification sent directly to ${notifyingUser.email}.`
      });
      setNotifyingUser(null);
      setNotifTitle('');
      setNotifMessage('');
    } catch (err: any) {
      console.error('Failed to send notification', err);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'Failed to Send',
        message: err.message || 'Could not send notification to user.'
      });
    } finally {
      setSendingNotif(false);
    }
  };

  const handleKycStatusChange = async (userId: string, newStatus: 'VERIFIED' | 'REJECTED') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        kycStatus: newStatus,
        updatedAt: new Date().toISOString()
      });
      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: `KYC ${newStatus}`,
        message: `User KYC status updated to ${newStatus}.`
      });
      setViewingKycUser(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to update KYC status', err);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'KYC Action Failed',
        message: err.message || 'Could not update KYC status.'
      });
    }
  };

  const handleRequestAction = async (request: TransactionRequest, action: 'APPROVE' | 'REJECT') => {
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'users', request.userId, 'transactions', request.id);
      
      if (action === 'APPROVE') {
        batch.update(txRef, { status: 'COMPLETED' });
        
        if (request.type === 'DEPOSIT') {
          const balanceRef = doc(db, 'users', request.userId, 'balances', request.asset);
          batch.set(balanceRef, { 
            amount: increment(request.amount),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } else {
        batch.update(txRef, { status: 'REJECTED' });
        
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
      triggerHaptic('success');
      setStatus({
        type: 'success',
        title: `Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
        message: `Transaction request has been processed.`
      });
      setViewingGiftCardReq(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to process request', err);
      triggerHaptic('error');
      setStatus({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not process transaction request.'
      });
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));
  const filteredRequests = requests.filter(r => {
    const searchMatch = r.userEmail?.toLowerCase().includes(search.toLowerCase()) || r.payCode?.includes(search);
    if (!searchMatch) return false;

    if (requestStatusFilter === 'ALL') return true;
    if (requestStatusFilter === 'PENDING') return r.status === 'PENDING';
    if (requestStatusFilter === 'SUCCESSFUL') return r.status === 'COMPLETED' || r.status === 'SUCCESSFUL';
    if (requestStatusFilter === 'FAILED') return r.status === 'REJECTED' || r.status === 'FAILED';
    return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-[#0D1117] z-[180] flex flex-col"
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-800/80 rounded-full p-1 border border-gray-700/80">
            <Globe className="w-3 h-3 text-gray-400 ml-1" />
            <button 
              onClick={() => setLanguage('TH')}
              className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-extrabold transition-all",
                language === 'TH' ? "bg-[#00D632] text-black shadow" : "text-gray-400 hover:text-white"
              )}
            >
              TH
            </button>
            <button 
              onClick={() => setLanguage('EN')}
              className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-extrabold transition-all",
                language === 'EN' ? "bg-[#00D632] text-black shadow" : "text-gray-400 hover:text-white"
              )}
            >
              EN
            </button>
          </div>
          <button onClick={fetchData} className="p-2 text-gray-400 hover:text-white transition-colors">
            <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="flex bg-gray-900/50 p-1 mx-5 mt-4 rounded-xl border border-gray-800">
        <button 
          onClick={() => { triggerHaptic('light'); setActiveTab('users'); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase transition-all",
            activeTab === 'users' ? "bg-gray-800 text-[#00D632] shadow-lg" : "text-gray-500"
          )}
        >
          <Users className="w-4 h-4" /> Users ({users.length})
        </button>
        <button 
          onClick={() => { triggerHaptic('light'); setActiveTab('requests'); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase transition-all",
            activeTab === 'requests' ? "bg-gray-800 text-[#00D632] shadow-lg" : "text-gray-500"
          )}
        >
          <CreditCard className="w-4 h-4" /> Requests ({requests.length})
        </button>
      </div>

      <div className="px-5 mt-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'users' ? "Search users by email..." : "Search requests by email or voucher code..."}
            className="w-full bg-gray-800/20 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00D632]/30 transition-colors"
          />
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="flex gap-2 px-5 mb-4 overflow-x-auto no-scrollbar shrink-0">
          {(['PENDING', 'SUCCESSFUL', 'FAILED', 'ALL'] as const).map((filter) => {
            const count = requests.filter(r => {
              if (filter === 'ALL') return true;
              if (filter === 'PENDING') return r.status === 'PENDING';
              if (filter === 'SUCCESSFUL') return r.status === 'COMPLETED' || r.status === 'SUCCESSFUL';
              if (filter === 'FAILED') return r.status === 'REJECTED' || r.status === 'FAILED';
              return true;
            }).length;

            return (
              <button
                key={filter}
                onClick={() => { triggerHaptic('light'); setRequestStatusFilter(filter); }}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap",
                  requestStatusFilter === filter 
                    ? "bg-[#00D632]/10 border-[#00D632]/30 text-[#00D632] font-black" 
                    : "bg-gray-800/20 border-gray-800 text-gray-400 hover:text-white"
                )}
              >
                {filter === 'SUCCESSFUL' ? 'Successful' : filter === 'FAILED' ? 'Failed' : filter === 'PENDING' ? 'Pending' : 'All'} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <RefreshCcw className="w-10 h-10 animate-spin text-[#00D632] mb-4" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Data...</span>
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="py-20 text-center">
                <Users className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-20" />
                <p className="text-gray-500 text-xs font-bold uppercase">No users found</p>
              </div>
            ) : filteredUsers.map((user) => (
              <div key={user.uid} className="bg-gray-800/20 border border-gray-800 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-white font-black text-sm">{user.email}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-gray-500 font-bold uppercase bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700">{user.role}</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                        user.kycStatus === 'VERIFIED' ? "bg-[#00D632]/10 text-[#00D632] border border-[#00D632]/20" : 
                        user.kycStatus === 'PENDING' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                        "bg-red-500/10 text-red-500 border border-red-500/20"
                      )}>
                        KYC: {user.kycStatus || 'NOT_STARTED'}
                      </span>
                      {user.nationality && (
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-800/30 px-2 py-0.5 rounded">
                          {user.nationality}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View KYC Document Button */}
                    {(user.kycDocumentUrl || user.kycStatus === 'PENDING') && (
                      <button
                        onClick={() => {
                          triggerHaptic('medium');
                          setViewingKycUser(user);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all text-[11px] font-bold"
                        title="View Uploaded KYC Document"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>KYC Doc</span>
                      </button>
                    )}

                    {/* Send Notification Button */}
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setNotifyingUser(user);
                        setNotifTitle('');
                        setNotifMessage('');
                      }}
                      className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black transition-all"
                      title="Send Custom Notification to User"
                    >
                      <Bell className="w-4 h-4" />
                    </button>

                    {/* Edit Profile Button */}
                    <button
                      onClick={() => openEditUserModal(user)}
                      className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                      title="Edit User Profile"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete User Button */}
                    <button 
                      onClick={() => {
                        triggerHaptic('medium');
                        setUserToDelete(user);
                      }}
                      className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      title="Delete User Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Balances list summary */}
                <div className="space-y-1.5 pt-2 border-t border-gray-800/40">
                  <div className="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                    <span>Balances</span>
                    <button 
                      onClick={() => openEditUserModal(user)}
                      className="text-[#00D632] hover:underline"
                    >
                      Edit All
                    </button>
                  </div>
                  {user.balances && Object.keys(user.balances).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(user.balances).map(([asset, amount]) => (
                        <div key={asset} className="flex items-center justify-between bg-black/30 rounded-xl px-2.5 py-1.5 border border-gray-800/60">
                          <span className="text-[10px] font-black text-gray-400 uppercase">{asset}</span>
                          <span className="text-white font-bold text-xs">{amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-600 italic">No asset balances found</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Transaction Requests Tab */
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
               <div className="py-20 text-center">
                  <Activity className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-20" />
                  <p className="text-gray-500 text-xs font-bold uppercase">No requests found</p>
               </div>
            ) : filteredRequests.map((req) => {
              const isPending = req.status === 'PENDING';
              const isCompleted = req.status === 'COMPLETED' || req.status === 'SUCCESSFUL';
              const isRejected = req.status === 'REJECTED' || req.status === 'FAILED';

              return (
                <div key={req.id} className="bg-gray-800/20 border border-gray-800 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border",
                        req.type === 'DEPOSIT' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                      )}>
                        {req.type[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm tracking-tight">{req.userEmail}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{req.type} • {req.asset}</span>
                          {req.method && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                              {req.method}
                            </span>
                          )}
                          {!isPending && (
                            <span className={cn(
                              "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                              isCompleted ? "bg-[#00D632]/10 border border-[#00D632]/20 text-[#00D632]" : "bg-red-500/10 border border-red-500/20 text-red-400"
                            )}>
                              {isCompleted ? 'SUCCESSFUL' : 'FAILED'}
                            </span>
                          )}
                          {isPending && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 animate-pulse">
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-white font-black text-sm">฿{req.amount.toLocaleString()}</span>
                      {req.fee && <span className="text-[10px] text-gray-500">Fee: ฿{req.fee}</span>}
                    </div>
                  </div>

                  {/* Giftcard uploaded image badge */}
                  {(req.giftCardImage || req.method === 'GIFTCARD') && (
                    <div className="mb-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">Gift Card Uploaded</span>
                          {req.payCode && <span className="text-[10px] text-purple-300 font-mono">Voucher: {req.payCode}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('medium');
                          setViewingGiftCardReq(req);
                        }}
                        className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Photo
                      </button>
                    </div>
                  )}
                  
                  {isPending && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button 
                        onClick={() => handleRequestAction(req, 'APPROVE')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00D632] text-black font-black text-xs uppercase hover:bg-[#00B62A] transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button 
                        onClick={() => handleRequestAction(req, 'REJECT')}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs uppercase hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: EDIT USER PROFILE */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121824] border border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-5 h-5 text-[#00D632]" />
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Edit User Profile</h3>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">User Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-gray-800/40 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D632]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'USER' | 'ADMIN')}
                      className="w-full bg-gray-800/40 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D632]"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">KYC Status</label>
                    <select
                      value={editKycStatus}
                      onChange={(e) => setEditKycStatus(e.target.value as any)}
                      className="w-full bg-gray-800/40 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00D632]"
                    >
                      <option value="NOT_STARTED">NOT_STARTED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Nationality</label>
                  <input
                    type="text"
                    value={editNationality}
                    onChange={(e) => setEditNationality(e.target.value)}
                    placeholder="e.g. Thai, Non-Thai"
                    className="w-full bg-gray-800/40 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D632]"
                  />
                </div>

                {/* Balances Section */}
                <div className="pt-2 border-t border-gray-800 space-y-3">
                  <p className="text-xs font-black text-gray-300 uppercase tracking-wider">Asset Balances</p>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(editBalances).map(([asset, amount]) => (
                      <div key={asset} className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-gray-800">
                        <span className="w-16 text-xs font-black text-gray-400 uppercase">{asset}</span>
                        <input
                          type="number"
                          step="any"
                          value={amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setEditBalances(prev => ({ ...prev, [asset]: val }));
                          }}
                          className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00D632]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...editBalances };
                            delete copy[asset];
                            setEditBalances(copy);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Asset Row */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Asset (e.g. BTC)"
                      value={newAssetSymbol}
                      onChange={(e) => setNewAssetSymbol(e.target.value)}
                      className="w-24 bg-gray-800/40 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={newAssetAmount}
                      onChange={(e) => setNewAssetAmount(e.target.value)}
                      className="flex-1 bg-gray-800/40 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddBalanceInEdit}
                      className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-800 flex gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-xs font-bold uppercase hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserProfile}
                  disabled={savingUser}
                  className="flex-1 py-3 rounded-xl bg-[#00D632] text-black text-xs font-black uppercase hover:bg-[#00B62A] transition-all flex items-center justify-center gap-2"
                >
                  {savingUser ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: VIEW KYC DOCUMENT LIGHTBOX */}
      <AnimatePresence>
        {viewingKycUser && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121824] border border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white uppercase tracking-tight">KYC Document Review</h3>
                </div>
                <button onClick={() => setViewingKycUser(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800 space-y-1">
                  <div className="text-xs text-gray-400">User: <span className="font-bold text-white">{viewingKycUser.email}</span></div>
                  <div className="text-xs text-gray-400">Nationality: <span className="font-bold text-white">{viewingKycUser.nationality || 'Thai'}</span></div>
                  <div className="text-xs text-gray-400">Status: <span className="font-bold text-emerald-400">{viewingKycUser.kycStatus}</span></div>
                  {viewingKycUser.submittedAt && (
                    <div className="text-[10px] text-gray-500">Submitted: {new Date(viewingKycUser.submittedAt).toLocaleString()}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Uploaded Document</p>
                  {viewingKycUser.kycDocumentUrl ? (
                    <div className="border border-gray-800 rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-80">
                      <img 
                        src={viewingKycUser.kycDocumentUrl} 
                        alt="KYC Document"
                        className="max-h-80 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-gray-900/30">
                      <FileText className="w-12 h-12 text-gray-600 mb-2" />
                      <p className="text-xs font-bold text-gray-400">No Image Uploaded</p>
                      <p className="text-[10px] text-gray-600 mt-1">User submitted KYC verification form without an attachment.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-800 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleKycStatusChange(viewingKycUser.uid, 'VERIFIED')}
                  className="py-3 rounded-xl bg-[#00D632] text-black text-xs font-black uppercase hover:bg-[#00B62A] transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Approve KYC
                </button>
                <button
                  onClick={() => handleKycStatusChange(viewingKycUser.uid, 'REJECTED')}
                  className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject KYC
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: VIEW GIFTCARD DEPOSIT DOCUMENT LIGHTBOX */}
      <AnimatePresence>
        {viewingGiftCardReq && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121824] border border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Gift Card Voucher Photo</h3>
                </div>
                <button onClick={() => setViewingGiftCardReq(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800 space-y-1">
                  <div className="text-xs text-gray-400">User: <span className="font-bold text-white">{viewingGiftCardReq.userEmail}</span></div>
                  <div className="text-xs text-gray-400">Amount: <span className="font-bold text-[#00D632]">฿{viewingGiftCardReq.amount.toLocaleString()} THB</span></div>
                  {viewingGiftCardReq.payCode && (
                    <div className="text-xs text-gray-400">Voucher Code: <span className="font-mono font-bold text-purple-300">{viewingGiftCardReq.payCode}</span></div>
                  )}
                  <div className="text-[10px] text-gray-500">Submitted: {new Date(viewingGiftCardReq.timestamp).toLocaleString()}</div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Gift Card Photo Attachment</p>
                  {viewingGiftCardReq.giftCardImage ? (
                    <div className="border border-gray-800 rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-80 p-2">
                      <img 
                        src={viewingGiftCardReq.giftCardImage} 
                        alt="Gift Card Attachment"
                        className="max-h-80 w-auto object-contain rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-900/30">
                      <ImageIcon className="w-10 h-10 text-gray-600 mb-2" />
                      <p className="text-xs font-bold text-gray-400">No Photo attached</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-800 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRequestAction(viewingGiftCardReq, 'APPROVE')}
                  className="py-3 rounded-xl bg-[#00D632] text-black text-xs font-black uppercase hover:bg-[#00B62A] transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Approve Deposit
                </button>
                <button
                  onClick={() => handleRequestAction(viewingGiftCardReq, 'REJECT')}
                  className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject Deposit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: DELETE ACCOUNT CONFIRMATION */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-[240] flex items-center justify-center p-5 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121824] border border-red-500/30 rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Delete Account?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-bold">{userToDelete.email}</span>? This action is permanent and will delete user records and balances.
              </p>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-xs font-bold uppercase hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUserConfirmed}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-xs font-black uppercase hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: SEND CUSTOM NOTIFICATION */}
      <AnimatePresence>
        {notifyingUser && (
          <div className="fixed inset-0 z-[240] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121824] border border-amber-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Send Notification</h3>
                </div>
                <button onClick={() => setNotifyingUser(null)} className="p-1 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400 block">Recipient</span>
                  <span className="text-sm font-bold text-white">{notifyingUser.email}</span>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Notification Title</label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. Account Security Alert, KYC Update"
                    className="w-full bg-gray-800/40 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Type the notice or update message to display on user screen immediately upon login..."
                    className="w-full bg-gray-800/40 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-800 flex gap-3">
                <button
                  onClick={() => setNotifyingUser(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-xs font-bold uppercase hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-xs font-black uppercase hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {sendingNotif ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Notice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STATUS OVERLAY NOTIFICATION */}
      <StatusOverlay
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message}
        onClose={() => setStatus(null)}
      />
    </motion.div>
  );
}

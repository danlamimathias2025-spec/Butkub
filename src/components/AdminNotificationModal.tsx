import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { triggerHaptic } from '../lib/haptics';

interface AdminNotificationModalProps {
  userId: string;
}

export interface AdminNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  dismissed?: boolean;
  type?: string;
}

export default function AdminNotificationModal({ userId }: AdminNotificationModalProps) {
  const [activeNotification, setActiveNotification] = useState<AdminNotification | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const checkNewNotifications = async () => {
      try {
        const notifRef = collection(db, 'users', userId, 'admin_notifications');
        // Fetch undismissed/unread notifications
        const q = query(notifRef, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        if (snap.empty) return;

        // Check local storage for already popped-out notifications
        let dismissedIds: string[] = [];
        try {
          const stored = localStorage.getItem(`dismissed_notifs_${userId}`);
          if (stored) {
            dismissedIds = JSON.parse(stored);
          }
        } catch {
          // ignore storage error
        }

        const unreadNotifs: AdminNotification[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as AdminNotification;
          const notifId = docSnap.id;
          if (!data.dismissed && !data.read && !dismissedIds.includes(notifId)) {
            unreadNotifs.push({ ...data, id: notifId });
          }
        });

        if (unreadNotifs.length > 0) {
          // Show the latest unread notification
          setActiveNotification(unreadNotifs[0]);
        }
      } catch (err) {
        console.error('Error fetching admin notifications:', err);
      }
    };

    checkNewNotifications();
  }, [userId]);

  const handleDismiss = async () => {
    if (!activeNotification) return;
    triggerHaptic('light');
    setDismissing(true);

    const notifId = activeNotification.id;

    // Save to local storage immediately so it won't show again in current session
    try {
      const stored = localStorage.getItem(`dismissed_notifs_${userId}`);
      let dismissedIds: string[] = stored ? JSON.parse(stored) : [];
      if (!dismissedIds.includes(notifId)) {
        dismissedIds.push(notifId);
        localStorage.setItem(`dismissed_notifs_${userId}`, JSON.stringify(dismissedIds));
      }
    } catch {
      // ignore storage error
    }

    // Update Firestore in background
    try {
      await updateDoc(doc(db, 'users', userId, 'admin_notifications', notifId), {
        read: true,
        dismissed: true,
        dismissedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to mark notification as read in database:', err);
    } finally {
      setDismissing(false);
      setActiveNotification(null);
    }
  };

  if (!activeNotification) return null;

  const formattedDate = new Date(activeNotification.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-5 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#121824] border border-[#00D632]/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
        >
          {/* Top Decorative Header */}
          <div className="bg-gradient-to-r from-[#00D632]/20 via-emerald-500/10 to-transparent p-5 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00D632]/10 border border-[#00D632]/30 flex items-center justify-center text-[#00D632]">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#00D632] tracking-widest block">New Notice</span>
                <span className="text-xs font-bold text-gray-400">{formattedDate}</span>
              </div>
            </div>
            
            {/* Pop-out / Cancel button */}
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
              title="Cancel & Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-white tracking-tight leading-snug">
              {activeNotification.title}
            </h3>

            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-wrap max-h-48 overflow-y-auto">
              {activeNotification.message}
            </div>

            <p className="text-[10px] text-gray-500 italic text-center">
              This notice will not be shown again after closing.
            </p>

            {/* Cancel / Dismiss Action Button */}
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="w-full py-3.5 rounded-2xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <X className="w-4 h-4 text-red-400" /> Cancel & Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

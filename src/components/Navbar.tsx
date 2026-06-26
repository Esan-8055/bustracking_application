'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Bell, AlertTriangle, Menu, X } from 'lucide-react';
import { EmergencyLog } from '@/types';
import InstallPWA from './InstallPWA';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { school, user, activeSosAlarm, setActiveSosAlarm, setMobileSidebarOpen } = useAppStore();
  const [activeAlerts, setActiveAlerts] = useState<EmergencyLog[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!user || !school) return;

    // Listen to real-time SOS triggers for this school
    const q = query(
      collection(db, 'emergencyLogs'),
      where('schoolId', '==', school.id),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: EmergencyLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as EmergencyLog);
      });
      setActiveAlerts(logs);
      setActiveSosAlarm(logs.length > 0);
    });

    // Listen to real-time notifications for this user
    const qNotif = query(
      collection(db, 'notifications'),
      where('schoolId', '==', school.id),
      where('userId', '==', user.uid)
    );

    const unsubscribeNotif = onSnapshot(qNotif, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setNotifications(list);
    });

    return () => {
      unsubscribe();
      unsubscribeNotif();
    };
  }, [school, user, setActiveSosAlarm]);

  const handleClearAll = async () => {
    try {
      for (const notif of notifications) {
        await deleteDoc(doc(db, 'notifications', notif.id));
      }
      setNotifications([]);
      setShowDropdown(false);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleResolveSos = async () => {
    try {
      for (const alert of activeAlerts) {
        await updateDoc(doc(db, 'emergencyLogs', alert.id), {
          status: 'resolved',
          resolvedAt: serverTimestamp(),
          resolvedBy: user?.displayName || user?.email || 'Global Navbar'
        });
      }
    } catch (err) {
      console.error('Failed to resolve SOS alert:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/40 backdrop-blur-md">
      {/* 1. SOS Banner - stacks vertically on mobile */}
      {activeSosAlarm && activeAlerts.length > 0 && (
        <div className="bg-rose-600 text-white py-2 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 animate-pulse">
          <div className="flex items-start sm:items-center gap-2 font-bold text-xs sm:text-sm tracking-wide">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 animate-bounce shrink-0 mt-0.5 sm:mt-0" />
            <span>
              EMERGENCY SOS — Bus <strong className="underline">{activeAlerts[0].busId}</strong>.
              Location logged. Contacts notified.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResolveSos}
              className="bg-white hover:bg-rose-100 text-rose-600 font-extrabold px-3 py-1 rounded-lg text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Stop SOS
            </button>
            <span className="text-[10px] bg-rose-800 px-2 py-0.5 rounded font-mono font-bold hidden sm:inline">CRITICAL</span>
          </div>
        </div>
      )}

      {/* 2. Top Header Nav */}
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-all cursor-pointer"
            onClick={() => {
              setMobileSidebarOpen(true);
              if (onMenuClick) onMenuClick();
            }}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Welcome text - hidden on very small screens */}
          <h2 className="text-xs sm:text-sm font-semibold text-slate-400 hidden sm:block">
            Welcome, <span className="text-gray-900 font-bold">{user?.displayName?.split(' ')[0]}</span>
          </h2>
          {/* Short welcome for tiny screens */}
          <h2 className="text-xs font-semibold text-gray-900 font-bold sm:hidden truncate max-w-[120px]">
            {user?.displayName?.split(' ')[0]}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <InstallPWA />

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative p-2 text-slate-400 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-all focus:outline-none cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-yellow-500 ring-2 ring-white animate-pulse"></span>
              )}
            </button>

            {showDropdown && (
              <div 
                className="absolute mt-2 w-72 sm:w-80 glass-panel border border-slate-200 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 py-2"
                style={{ right: 0, left: 'auto', maxWidth: 'calc(100vw - 2rem)' }}
              >
                <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Notifications ({notifications.length})</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-[10px] text-yellow-600 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto px-2 py-1 space-y-1.5 mt-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-medium">No notifications.</div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg space-y-1 text-left transition-all">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-700">{notif.title}</span>
                          <span className="text-slate-400 font-mono text-[9px]">
                            {notif.timestamp ? new Date(notif.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal font-light">{notif.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* GPS Status Badge - hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-1.5 border border-emerald-500/30 rounded-lg py-1 px-2.5 bg-emerald-500/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-600 font-mono tracking-wider uppercase">GPS Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}

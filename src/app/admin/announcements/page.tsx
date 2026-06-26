'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Megaphone, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { Announcement } from '@/types';

export default function AdminAnnouncementsPage() {
  const { school } = useAppStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'notice' | 'emergency' | 'holiday' | 'maintenance'>('notice');
  const [targetParent, setTargetParent] = useState(true);
  const [targetStudent, setTargetStudent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!school) return;

    const q = query(
      collection(db, 'announcements'),
      where('schoolId', '==', school.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(list);
    });

    return () => unsubscribe();
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setLoading(true);
    setError('');

    try {
      const targetRoles: ('parent' | 'student')[] = [];
      if (targetParent) targetRoles.push('parent');
      if (targetStudent) targetRoles.push('student');

      if (targetRoles.length === 0) {
        setError('Please select at least one target audience');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'announcements'), {
        schoolId: school.id,
        title,
        content,
        type,
        targetRoles,
        createdAt: serverTimestamp(),
        createdBy: 'Admin Office'
      });

      // Clear fields
      setTitle('');
      setContent('');
      setType('notice');
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (annId: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', annId));
    } catch (err) {
      console.error('Error deleting notice:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Announcements Noticeboard</h1>
        <p className="text-xs text-slate-500 mt-1">Broadcast general notices, maintenance warnings, or emergencies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Notices list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900">
            <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-yellow-500 shrink-0" />
              Active Notices Board
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {announcements.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-xs text-slate-600">
                  No active notices published yet. Use the form to write one.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-5 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2 mb-2">
                        <span className="font-bold text-slate-200 text-sm truncate max-w-[150px]">{ann.title}</span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase font-mono ${
                          ann.type === 'emergency'
                            ? 'bg-rose-500/10 text-rose-400'
                            : ann.type === 'maintenance'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {ann.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">{ann.content}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900 pt-3 text-[10px]">
                      <span className="text-slate-600">Target: {ann.targetRoles.join(', ')}</span>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="text-slate-500 hover:text-rose-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Notice Publisher Form */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-yellow-500" />
              Publish Broadcast Notice
            </h3>

            {error && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route 10A Delay Update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Broadcast Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="notice">General Notice</option>
                  <option value="emergency">Emergency Alert</option>
                  <option value="holiday">Holiday Announcement</option>
                  <option value="maintenance">Maintenance Delay</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Audience Audience</label>
                <div className="flex gap-4 p-3 bg-slate-950/60 border border-slate-900 rounded-xl mt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-all text-slate-400">
                    <input
                      type="checkbox"
                      checked={targetParent}
                      onChange={(e) => setTargetParent(e.target.checked)}
                      className="accent-yellow-500"
                    />
                    Parents
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-all text-slate-400">
                    <input
                      type="checkbox"
                      checked={targetStudent}
                      onChange={(e) => setTargetStudent(e.target.checked)}
                      className="accent-yellow-500"
                    />
                    Students
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Message Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Draft your announcement message details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl disabled:opacity-50 transition-all text-xs shadow-lg shadow-yellow-500/5 hover:shadow-yellow-500/15"
              >
                {loading ? 'Publishing...' : 'Publish Broadcast'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

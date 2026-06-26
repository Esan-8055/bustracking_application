'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { UserCheck, PlusCircle, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { Parent } from '@/types';

export default function AdminParentsPage() {
  const { school } = useAppStore();
  const [parents, setParents] = useState<Parent[]>([]);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentAdmissionNumber, setStudentAdmissionNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!school) return;

    const q = query(collection(db, 'parents'), where('schoolId', '==', school.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Parent[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Parent);
      });
      setParents(list);
    });

    return () => unsubscribe();
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setLoading(true);
    setError('');

    try {
      const payload = {
        name,
        email,
        phone,
        schoolId: school.id,
        studentAdmissionNumber,
        emergencyContact,
        password
      };

      let parentDocId = '';
      if (editingParent) {
        await updateDoc(doc(db, 'parents', editingParent.id), payload);
        parentDocId = editingParent.id;
        setEditingParent(null);
      } else {
        const docRef = await addDoc(collection(db, 'parents'), payload);
        parentDocId = docRef.id;
      }

      // Automatically link student to this parent record by updating student's parentId
      const studentQuery = query(
        collection(db, 'students'),
        where('schoolId', '==', school.id),
        where('admissionNumber', '==', studentAdmissionNumber)
      );
      const studentSnap = await getDocs(studentQuery);
      if (!studentSnap.empty) {
        const studentDoc = studentSnap.docs[0];
        await updateDoc(doc(db, 'students', studentDoc.id), {
          parentId: parentDocId
        });
      }

      setName('');
      setEmail('');
      setPhone('');
      setStudentAdmissionNumber('');
      setEmergencyContact('');
      setPassword('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save parent details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: Parent) => {
    setEditingParent(p);
    setName(p.name);
    setEmail(p.email);
    setPhone(p.phone);
    setStudentAdmissionNumber((p as any).studentAdmissionNumber || '');
    setEmergencyContact(p.emergencyContact || '');
    setPassword((p as any).password || '');
  };

  const handleDelete = async (parentId: string) => {
    if (!confirm('Are you sure you want to delete this parent profile?')) return;
    try {
      await deleteDoc(doc(db, 'parents', parentId));
    } catch (err) {
      console.error('Error deleting parent:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Parent Management</h1>
        <p className="text-xs text-slate-500 mt-1">Register parent details, link them to students, and edit profile logs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* List of Parents */}
        <div className="lg:col-span-2 glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-yellow-500 shrink-0" />
            Registered Parents ({parents.length})
          </h3>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {parents.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-600">No parent records found.</p>
            ) : (
              parents.map((p) => (
                <div key={p.id} className="p-3 sm:p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{p.email}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(p)} className="p-1.5 hover:text-yellow-500 text-slate-500 transition-all">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:text-rose-500 text-slate-500 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">Phone:</span>
                      <span className="text-slate-300 ml-1">{p.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Adm. No:</span>
                      <span className="text-yellow-500 font-mono ml-1">{(p as any).studentAdmissionNumber || '—'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 uppercase font-semibold font-mono tracking-wider">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Student Admission No.</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {parents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-600">
                      No parent records found. Register a parent using the form.
                    </td>
                  </tr>
                ) : (
                  parents.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/20">
                      <td className="py-3.5 font-bold text-slate-200">{p.name}</td>
                      <td className="py-3.5 text-slate-400 font-mono">{p.email}</td>
                      <td className="py-3.5 text-slate-400">{p.phone}</td>
                      <td className="py-3.5 font-mono text-yellow-500">
                        {(p as any).studentAdmissionNumber || 'None'}
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1 hover:text-yellow-500 text-slate-500 transition-all inline-block"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1 hover:text-rose-500 text-slate-500 transition-all inline-block"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-yellow-500" />
              {editingParent ? 'Edit Parent Profile' : 'Register New Parent'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Parent Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stephen King"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. parent@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Mobile Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91-9988776655"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Student Admission Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADM-2026-004"
                  value={studentAdmissionNumber}
                  onChange={(e) => setStudentAdmissionNumber(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Login Password</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. parentPass123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Emergency Alternate Contact</label>
                <input
                  type="text"
                  placeholder="e.g. +91-9999999999"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                {editingParent && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingParent(null);
                      setName('');
                      setEmail('');
                      setPhone('');
                      setStudentAdmissionNumber('');
                      setEmergencyContact('');
                      setPassword('');
                    }}
                    className="flex-1 py-3 border border-slate-800 hover:border-slate-700 hover:text-white rounded-xl text-slate-400 font-bold transition-all text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-grow py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl disabled:opacity-50 transition-all text-xs"
                >
                  {loading ? 'Please wait...' : editingParent ? 'Update Profile' : 'Register Parent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

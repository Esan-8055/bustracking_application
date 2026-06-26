'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { ShieldCheck, PlusCircle, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { Driver, Bus } from '@/types';

export default function AdminDriversPage() {
  const { school } = useAppStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [busId, setBusId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!school) return;

    const qDrivers = query(collection(db, 'drivers'), where('schoolId', '==', school.id));
    const unsubDrivers = onSnapshot(qDrivers, (snap) => {
      const list: Driver[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Driver));
      setDrivers(list);
    });

    const qBuses = query(collection(db, 'buses'), where('schoolId', '==', school.id));
    const unsubBuses = onSnapshot(qBuses, (snap) => {
      const list: Bus[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Bus));
      setBuses(list);
    });

    return () => {
      unsubDrivers();
      unsubBuses();
    };
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
        licenseNumber,
        photoUrl: '', // simulated local profile photo
        busId,
        status
      };

      if (editingDriver) {
        await updateDoc(doc(db, 'drivers', editingDriver.id), payload);
        setEditingDriver(null);
      } else {
        await addDoc(collection(db, 'drivers'), payload);
      }

      setName('');
      setEmail('');
      setPhone('');
      setLicenseNumber('');
      setBusId('');
      setStatus('active');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save driver details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (d: Driver) => {
    setEditingDriver(d);
    setName(d.name);
    setEmail(d.email);
    setPhone(d.phone);
    setLicenseNumber(d.licenseNumber);
    setBusId(d.busId || '');
    setStatus(d.status || 'active');
  };

  const handleDelete = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      await deleteDoc(doc(db, 'drivers', driverId));
    } catch (err) {
      console.error('Error deleting driver:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Driver Management</h1>
        <p className="text-xs text-slate-500 mt-1">Register drivers, track license numbers, and link them to vehicles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* List of Drivers */}
        <div className="lg:col-span-2 glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-yellow-500 shrink-0" />
            Registered Drivers ({drivers.length})
          </h3>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {drivers.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-600">No driver profiles found.</p>
            ) : (
              drivers.map((d) => {
                const assignedBus = buses.find((b) => b.id === d.busId);
                return (
                  <div key={d.id} className="p-3 sm:p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white text-sm">{d.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{d.email}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(d)} className="p-1.5 hover:text-yellow-500 text-slate-500 transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:text-rose-500 text-slate-500 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-slate-500">Phone:</span>
                        <span className="text-slate-300 ml-1">{d.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">License:</span>
                        <span className="text-slate-300 font-mono ml-1">{d.licenseNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Bus:</span>
                        <span className="text-slate-300 ml-1">{assignedBus ? assignedBus.busNumber : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Status:</span>
                        <span className={`ml-1 font-bold ${d.status === 'active' ? 'text-emerald-500' : 'text-slate-500'}`}>{d.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })
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
                  <th className="pb-3">License No.</th>
                  <th className="pb-3">Bus Assigned</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-600">
                      No driver profiles found. Add a driver using the form.
                    </td>
                  </tr>
                ) : (
                  drivers.map((d) => {
                    const assignedBus = buses.find((b) => b.id === d.busId);
                    return (
                      <tr key={d.id} className="hover:bg-slate-900/20">
                        <td className="py-3.5 font-bold text-slate-200">{d.name}</td>
                        <td className="py-3.5 text-slate-400 font-mono">{d.email}</td>
                        <td className="py-3.5 text-slate-400">{d.phone}</td>
                        <td className="py-3.5 font-mono text-slate-400">{d.licenseNumber}</td>
                        <td className="py-3.5 font-semibold text-slate-300">
                          {assignedBus ? assignedBus.busNumber : <span className="text-slate-600">Unassigned</span>}
                        </td>
                        <td className="py-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(d)}
                            className="p-1 hover:text-yellow-500 text-slate-500 transition-all inline-block"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="p-1 hover:text-rose-500 text-slate-500 transition-all inline-block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
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
              {editingDriver ? 'Edit Driver Details' : 'Register New Driver'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Driver Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jeganathan G"
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
                  placeholder="e.g. jegan@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91-9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Driver License Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL-TN01-2026"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Assign Bus</label>
                <select
                  value={busId}
                  onChange={(e) => setBusId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="">Select Bus</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Work Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="active">Active Duty</option>
                  <option value="inactive">On Leave</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                {editingDriver && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDriver(null);
                      setName('');
                      setEmail('');
                      setPhone('');
                      setLicenseNumber('');
                      setBusId('');
                      setStatus('active');
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
                  {loading ? 'Please wait...' : editingDriver ? 'Update Details' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

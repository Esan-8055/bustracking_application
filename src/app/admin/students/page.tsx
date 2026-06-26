'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Users, PlusCircle, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { Student, Route, Bus } from '@/types';

export default function AdminStudentsPage() {
  const { school } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [parentId, setParentId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!school) return;

    const qStudents = query(collection(db, 'students'), where('schoolId', '==', school.id));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const list: Student[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Student));
      setStudents(list);
    });

    const qRoutes = query(collection(db, 'routes'), where('schoolId', '==', school.id));
    const unsubRoutes = onSnapshot(qRoutes, (snap) => {
      const list: Route[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Route));
      setRoutes(list);
    });

    const qBuses = query(collection(db, 'buses'), where('schoolId', '==', school.id));
    const unsubBuses = onSnapshot(qBuses, (snap) => {
      const list: Bus[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Bus));
      setBuses(list);
    });

    return () => {
      unsubStudents();
      unsubRoutes();
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
        admissionNumber,
        schoolId: school.id,
        parentId,
        routeId,
        busId,
        pickupStopId,
        status: 'idle' as const,
        lastUpdated: serverTimestamp(),
        password
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), payload);
        setEditingStudent(null);
      } else {
        await addDoc(collection(db, 'students'), payload);
      }

      setName('');
      setEmail('');
      setAdmissionNumber('');
      setParentId('');
      setRouteId('');
      setBusId('');
      setPickupStopId('');
      setPassword('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save student details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setName(student.name);
    setEmail(student.email || '');
    setAdmissionNumber(student.admissionNumber);
    setParentId(student.parentId || '');
    setRouteId(student.routeId || '');
    setBusId(student.busId || '');
    setPickupStopId(student.pickupStopId || '');
    setPassword((student as any).password || '');
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await deleteDoc(doc(db, 'students', studentId));
    } catch (err) {
      console.error('Error deleting student:', err);
    }
  };

  // Find stop options for selected route
  const currentRouteStops = routes.find((r) => r.id === routeId)?.stops || [];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Student Management</h1>
        <p className="text-xs text-slate-500 mt-1">Register student details, link parents, and assign transport runs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* CRUD Table */}
        <div className="lg:col-span-2 glass-panel p-4 sm:p-6 rounded-2xl border border-slate-900 space-y-4">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-yellow-500 shrink-0" />
            Registered Students ({students.length})
          </h3>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {students.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-600">No student records found.</p>
            ) : (
              students.map((student) => {
                const assignedRoute = routes.find((r) => r.id === student.routeId);
                const assignedStop = assignedRoute?.stops?.find((s) => s.id === student.pickupStopId);
                const assignedBus = buses.find((b) => b.id === student.busId);
                return (
                  <div key={student.id} className="p-3 sm:p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white text-sm">{student.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{student.email}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(student)} className="p-1.5 hover:text-yellow-500 text-slate-500 transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(student.id)} className="p-1.5 hover:text-rose-500 text-slate-500 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-slate-500">Adm. No:</span>
                        <span className="text-slate-300 font-mono ml-1">{student.admissionNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Bus:</span>
                        <span className="text-slate-300 ml-1">{assignedBus ? assignedBus.busNumber : '—'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Route:</span>
                        <span className="text-slate-300 ml-1">
                          {assignedRoute ? assignedRoute.name : '—'}
                          {assignedStop && <strong className="text-yellow-500"> ({assignedStop.name})</strong>}
                        </span>
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
                  <th className="pb-3">Adm. No.</th>
                  <th className="pb-3">Assigned Route & Stop</th>
                  <th className="pb-3">Bus</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-600">
                      No student records found. Add a student using the form.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => {
                    const assignedRoute = routes.find((r) => r.id === student.routeId);
                    const assignedStop = assignedRoute?.stops?.find((s) => s.id === student.pickupStopId);
                    const assignedBus = buses.find((b) => b.id === student.busId);

                    return (
                      <tr key={student.id} className="hover:bg-slate-900/20">
                        <td className="py-3.5 font-bold text-slate-200">
                          <div>{student.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono font-normal">{student.email}</div>
                        </td>
                        <td className="py-3.5 font-mono text-slate-400">{student.admissionNumber}</td>
                        <td className="py-3.5 text-slate-400">
                          {assignedRoute ? (
                            <span>
                              {assignedRoute.name}{' '}
                              {assignedStop && <strong className="text-yellow-500">({assignedStop.name})</strong>}
                            </span>
                          ) : (
                            <span className="text-slate-600">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 font-semibold text-slate-300">
                          {assignedBus ? assignedBus.busNumber : <span className="text-slate-600">None</span>}
                        </td>
                        <td className="py-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(student)}
                            className="p-1 hover:text-yellow-500 text-slate-500 transition-all inline-block"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
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
              {editingStudent ? 'Edit Student Details' : 'Register New Student'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stephen King Jr"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Student Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. student@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Admission Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADM-2026-004"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Login Password</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. securePass123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Assign Route</label>
                <select
                  value={routeId}
                  onChange={(e) => {
                    setRouteId(e.target.value);
                    setPickupStopId('');
                  }}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="">Select Route</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {routeId && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Assign Pickup Stop</label>
                  <select
                    value={pickupStopId}
                    onChange={(e) => setPickupStopId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="">Select Stop</option>
                    {currentRouteStops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        Stop #{stop.order}: {stop.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Assign Bus Run</label>
                <select
                  value={busId}
                  onChange={(e) => setBusId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="">Select Bus</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busNumber} ({b.plateNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                {editingStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudent(null);
                      setName('');
                      setEmail('');
                      setAdmissionNumber('');
                      setParentId('');
                      setRouteId('');
                      setBusId('');
                      setPickupStopId('');
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
                  {loading ? 'Please wait...' : editingStudent ? 'Update Profile' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

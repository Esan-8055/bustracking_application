'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { Bus, KeyRound, Mail, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      // 1. Check if email belongs to a Student first
      const studentQuery = query(collection(db, 'students'), where('email', '==', email));
      const studentSnap = await getDocs(studentQuery);

      if (!studentSnap.empty) {
        const studentDoc = studentSnap.docs[0];
        const studentData = studentDoc.data();

        // Enforce admin-defined password matching
        if (studentData.password !== password) {
          throw { code: 'auth/wrong-password', message: 'Incorrect password.' };
        }

        // Use deterministic secure auth password for Firebase Auth
        const secureAuthPassword = `auth_secure_${email}`;
        let user;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, secureAuthPassword);
          user = userCredential.user;
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            // First time student login: auto-register in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, secureAuthPassword);
            user = userCredential.user;

            const profile = {
              uid: user.uid,
              email: user.email,
              displayName: studentData.name,
              role: 'student',
              schoolId: studentData.schoolId,
              active: true,
              createdAt: serverTimestamp()
            };
            // Create user profile
            await setDoc(doc(db, 'users', user.uid), profile);

            // Re-index student document key to match Auth UID
            await setDoc(doc(db, 'students', user.uid), {
              ...studentData,
              id: user.uid
            });

            if (studentDoc.id !== user.uid) {
              await deleteDoc(doc(db, 'students', studentDoc.id));
            }

            // Fetch school data
            let schoolData = null;
            if (profile.schoolId) {
              const schoolSnap = await getDoc(doc(db, 'schools', profile.schoolId));
              if (schoolSnap.exists()) {
                schoolData = schoolSnap.data();
              }
            }

            // Cache in localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('smartbus_user', JSON.stringify({ ...profile, createdAt: new Date().toISOString() }));
              if (schoolData) {
                localStorage.setItem('smartbus_school', JSON.stringify({ ...schoolData, createdAt: new Date().toISOString() }));
              }
            }

            router.push('/student/dashboard');
            return;
          }
          throw err;
        }

        // Student logged in successfully via Auth, load details
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.exists()) {
          const profile = profileSnap.data();
          let schoolData = null;
          if (profile.schoolId) {
            const schoolSnap = await getDoc(doc(db, 'schools', profile.schoolId));
            if (schoolSnap.exists()) {
              schoolData = schoolSnap.data();
            }
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('smartbus_user', JSON.stringify(profile));
            if (schoolData) {
              localStorage.setItem('smartbus_school', JSON.stringify(schoolData));
            }
          }
          router.push('/student/dashboard');
          return;
        }
      }

      // 2. Check if email belongs to a Parent
      const parentQuery = query(collection(db, 'parents'), where('email', '==', email));
      const parentSnap = await getDocs(parentQuery);

      if (!parentSnap.empty) {
        const parentDoc = parentSnap.docs[0];
        const parentData = parentDoc.data();

        // Enforce admin-defined password matching
        if (parentData.password !== password) {
          throw { code: 'auth/wrong-password', message: 'Incorrect password.' };
        }

        const secureAuthPassword = `auth_secure_${email}`;
        let user;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, secureAuthPassword);
          user = userCredential.user;
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            // First-time parent login: auto-register in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, secureAuthPassword);
            user = userCredential.user;

            const profile = {
              uid: user.uid,
              email: user.email,
              displayName: parentData.name,
              role: 'parent',
              schoolId: parentData.schoolId,
              active: true,
              createdAt: serverTimestamp()
            };
            // Create user profile
            await setDoc(doc(db, 'users', user.uid), profile);

            // Re-index parent document key to match Auth UID
            await setDoc(doc(db, 'parents', user.uid), {
              ...parentData,
              id: user.uid
            });

            if (parentDoc.id !== user.uid) {
              await deleteDoc(doc(db, 'parents', parentDoc.id));
            }

            // Automatically link student to this parent's real Auth UID
            if (parentData.studentAdmissionNumber) {
              const studentQuery = query(
                collection(db, 'students'),
                where('schoolId', '==', parentData.schoolId),
                where('admissionNumber', '==', parentData.studentAdmissionNumber)
              );
              const studentSnap = await getDocs(studentQuery);
              if (!studentSnap.empty) {
                const studentDoc = studentSnap.docs[0];
                await updateDoc(doc(db, 'students', studentDoc.id), {
                  parentId: user.uid
                });
              }
            }

            // Fetch school data
            let schoolData = null;
            if (profile.schoolId) {
              const schoolSnap = await getDoc(doc(db, 'schools', profile.schoolId));
              if (schoolSnap.exists()) {
                schoolData = schoolSnap.data();
              }
            }

            // Cache in localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('smartbus_user', JSON.stringify({ ...profile, createdAt: new Date().toISOString() }));
              if (schoolData) {
                localStorage.setItem('smartbus_school', JSON.stringify({ ...schoolData, createdAt: new Date().toISOString() }));
              }
            }

            router.push('/parent/dashboard');
            return;
          }
          throw err;
        }

        // Parent logged in successfully via Auth, load details
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.exists()) {
          const profile = profileSnap.data();
          let schoolData = null;
          if (profile.schoolId) {
            const schoolSnap = await getDoc(doc(db, 'schools', profile.schoolId));
            if (schoolSnap.exists()) {
              schoolData = schoolSnap.data();
            }
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('smartbus_user', JSON.stringify(profile));
            if (schoolData) {
              localStorage.setItem('smartbus_school', JSON.stringify(schoolData));
            }
          }
          router.push('/parent/dashboard');
          return;
        }
      }

      // 3. Otherwise, normal Admin or general User Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user profile from Firestore to get role
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (profileSnap.exists()) {
        const profile = profileSnap.data();
        let schoolData = null;
        if (profile.schoolId) {
          const schoolSnap = await getDoc(doc(db, 'schools', profile.schoolId));
          if (schoolSnap.exists()) {
            schoolData = schoolSnap.data();
          }
        }

        // Cache in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('smartbus_user', JSON.stringify(profile));
          if (schoolData) {
            localStorage.setItem('smartbus_school', JSON.stringify(schoolData));
          }
        }
        router.push(`/${profile.role}/dashboard`);
      } else {
        // If profile does not exist, provision as admin by default
        const schoolId = 'school-main-01';
        const profile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || email.split('@')[0],
          role: 'admin',
          schoolId,
          active: true,
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', user.uid), profile);

        let schoolData = null;
        const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
        if (schoolSnap.exists()) {
          schoolData = schoolSnap.data();
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('smartbus_user', JSON.stringify({ ...profile, createdAt: new Date().toISOString() }));
          if (schoolData) {
            localStorage.setItem('smartbus_school', JSON.stringify({ ...schoolData, createdAt: new Date().toISOString() }));
          }
        }

        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      // Suppress dev console overlay for expected auth errors
      const expectedAuthErrors = [
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/invalid-credential',
        'auth/email-already-in-use',
        'auth/weak-password'
      ];
      if (!expectedAuthErrors.includes(err.code) && !expectedAuthErrors.includes(err.message)) {
        console.error(err);
      }

      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/wrong-password' || err.message === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password or account credentials. Please verify details.');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user has a profile in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let role = 'admin'; // default role
      let profile: any = null;
      const schoolId = 'school-main-01';

      if (!userDocSnap.exists()) {
        // Auto-provision user profile as Admin for simplicity of first-time sign-ins
        profile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Google User',
          role: 'admin',
          schoolId,
          active: true,
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, profile);

        // Initialize default school record
        await setDoc(doc(db, 'schools', schoolId), {
          id: schoolId,
          name: 'Greenwood International',
          subdomain: 'greenwood',
          address: '128 Education Ave, Tech City',
          contactEmail: 'admin@greenwood.edu',
          contactPhone: '+1-555-0199',
          createdAt: serverTimestamp()
        }, { merge: true });
      } else {
        profile = userDocSnap.data();
        role = profile.role;
      }

      // Fetch school data
      let schoolData: any = null;
      const targetSchoolId = profile.schoolId || schoolId;
      const schoolSnap = await getDoc(doc(db, 'schools', targetSchoolId));
      if (schoolSnap.exists()) {
        schoolData = schoolSnap.data();
      }

      // Cache in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('smartbus_user', JSON.stringify({ ...profile, createdAt: profile.createdAt ? (profile.createdAt.toDate ? profile.createdAt.toDate().toISOString() : profile.createdAt) : new Date().toISOString() }));
        if (schoolData) {
          localStorage.setItem('smartbus_school', JSON.stringify({ ...schoolData, createdAt: schoolData.createdAt ? (schoolData.createdAt.toDate ? schoolData.createdAt.toDate().toISOString() : schoolData.createdAt) : new Date().toISOString() }));
        }
      }

      router.push(`/${role}/dashboard`);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in window was closed before completion. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Google sign-in was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Sign-in request cancelled. Please try again.');
      } else {
        console.error(err);
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper for developers / testers to set credentials instantly
  const handleQuickDemoFill = (role: 'admin' | 'parent' | 'student') => {
    setEmail(`${role}@smartbus.ai`);
    setPassword(`smartbus_${role}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-1 bg-white rounded-2xl shadow-lg shadow-yellow-500/5 mb-3 border border-slate-800">
            <img
              src="/linga_logo.png"
              alt="LINGA School Bus Logo"
              style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px', objectFit: 'contain' }}
            />
          </div>
          <h2 className="font-extrabold text-2xl text-white tracking-tight">LINGA School Bus</h2>
          <p className="text-slate-500 text-xs mt-1">Enter credentials to connect to your fleet dashboard</p>
        </div>

        {/* Card container */}
        <div className="glass-panel p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="h-16 w-16 text-yellow-500" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            {/* Mode switch - Removed public sign up */}

            {error && (
              <div className="flex items-center gap-2 p-3.5 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-xs leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign in mode only - Registration elements removed */}

            {/* Email input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" />
                <input
                  type="email"
                  required
                  placeholder="e.g. name@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400">Security Password</label>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-yellow-500/5 hover:shadow-yellow-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              {loading ? 'Please wait...' : 'Authenticate Session'}
            </button>
          </form>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-slate-900"></div>
            <span className="flex-shrink mx-4 text-slate-600 text-xs uppercase font-mono tracking-widest">or continue with</span>
            <div className="flex-grow border-t border-slate-900"></div>
          </div>

          {/* Google login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 border border-slate-900 bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign In with Google Account
          </button>
        </div>

        {/* Quick developer login helper */}
        <div className="mt-6 border border-slate-900 rounded-xl p-4 bg-slate-950/20 text-center">
          <p className="text-[11px] text-slate-500 font-mono tracking-wider mb-2">QUICK DEMO ACCOUNTS PRE-FILL</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleQuickDemoFill('admin')}
              className="px-3 py-1 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 border border-yellow-500/15 rounded-lg text-xs font-mono font-medium transition-all"
            >
              Admin (Fleet)
            </button>
            <button
              onClick={() => handleQuickDemoFill('parent')}
              className="px-3 py-1 bg-blue-500/5 hover:bg-blue-500/10 text-blue-500 border border-blue-500/15 rounded-lg text-xs font-mono font-medium transition-all"
            >
              Parent (Child)
            </button>
            <button
              onClick={() => handleQuickDemoFill('student')}
              className="px-3 py-1 bg-blue-500/5 hover:bg-blue-500/10 text-blue-500 border border-blue-500/15 rounded-lg text-xs font-mono font-medium transition-all"
            >
              Student (Bus)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

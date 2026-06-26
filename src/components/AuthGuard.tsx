'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import { UserProfile, School } from '@/types';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, setUser, school, setSchool, loading, setLoading } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  // 1. Initial Client-side Hydration from LocalStorage for instant loading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedUserStr = localStorage.getItem('smartbus_user');
      const cachedSchoolStr = localStorage.getItem('smartbus_school');

      if (cachedUserStr) {
        try {
          const parsedUser = JSON.parse(cachedUserStr) as UserProfile;
          setUser(parsedUser);
          if (cachedSchoolStr) {
            setSchool(JSON.parse(cachedSchoolStr) as School);
          }

          // Optimistically bypass the loading screen if the user is on their correct dashboard
          const role = parsedUser.role;
          const isCorrectDashboard = pathname.startsWith(`/${role}`);
          if (isCorrectDashboard || pathname === '/login' || pathname === '/') {
            setLoading(false);
          }
        } catch (err) {
          console.error('Error parsing cached session:', err);
        }
      } else {
        // If there's no cached session, and they are on /login or /, we don't need a loading spinner
        if (pathname === '/login' || pathname === '/') {
          setLoading(false);
        }
      }
    }
  }, [pathname, setUser, setSchool, setLoading]);

  // 2. Real-time Firebase Authentication Synchronization & Session Validation
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setSchool(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('smartbus_user');
            localStorage.removeItem('smartbus_school');
          }
          setLoading(false);

          // If on dashboard pages, redirect to login
          if (
            pathname.startsWith('/admin') ||
            pathname.startsWith('/parent') ||
            pathname.startsWith('/student')
          ) {
            router.replace('/login');
          }
          return;
        }

        // Fetch User Profile Role from Firestore (leveraging local persistent cache)
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          setUser(profile);

          let schoolData: School | null = null;
          // Fetch School Information if not loaded
          if (profile.schoolId) {
            const schoolDocRef = doc(db, 'schools', profile.schoolId);
            const schoolDocSnap = await getDoc(schoolDocRef);
            if (schoolDocSnap.exists()) {
              schoolData = schoolDocSnap.data() as School;
              setSchool(schoolData);
            }
          }

          // Update cache in localStorage for subsequent fast loads
          if (typeof window !== 'undefined') {
            localStorage.setItem('smartbus_user', JSON.stringify(profile));
            if (schoolData) {
              localStorage.setItem('smartbus_school', JSON.stringify(schoolData));
            } else {
              localStorage.removeItem('smartbus_school');
            }
          }

          // Check Route Protection
          const role = profile.role;
          if (pathname.startsWith('/admin') && role !== 'admin') {
            router.replace('/login');
          } else if (pathname.startsWith('/parent') && role !== 'parent') {
            router.replace('/login');
          } else if (pathname.startsWith('/student') && role !== 'student') {
            router.replace('/login');
          } else if (pathname === '/login') {
            // Already logged in, redirect to respective dashboard
            router.replace(`/${role}/dashboard`);
          }
        } else {
          // Profile doc doesn't exist yet, sign out
          await auth.signOut();
          setUser(null);
          setSchool(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('smartbus_user');
            localStorage.removeItem('smartbus_school');
          }
          router.replace('/login');
        }
      } catch (error: any) {
        const isOffline = error?.message?.includes('offline') || error?.code === 'unavailable';
        if (isOffline) {
          console.warn('Firestore is offline. Retrying connection to LINGA School Bus...');
        } else {
          console.error('Error verifying auth status:', error);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router, setUser, setSchool, setLoading]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-400 font-medium">Securing connection to LINGA School Bus...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

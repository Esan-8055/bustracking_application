'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useAppStore } from '@/store/useStore';
import {
  LayoutDashboard,
  MapPin,
  Route as RouteIcon,
  Users,
  UserCheck,
  ShieldCheck,
  Bus as BusIcon,
  Megaphone,
  BarChart3,
  LogOut,
  User,
  X
} from 'lucide-react';

interface SidebarProps {
  onToggle?: (open: boolean) => void;
}

export default function Sidebar({ onToggle }: SidebarProps) {
  const { user, school, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();

  // Close drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  // Notify parent of toggle
  useEffect(() => {
    onToggle?.(mobileSidebarOpen);
  }, [mobileSidebarOpen, onToggle]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (!user) return null;

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/tracking', label: 'Live Fleet Tracking', icon: MapPin },
    { href: '/admin/routes', label: 'Route Planner', icon: RouteIcon },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/parents', label: 'Parents', icon: UserCheck },
    { href: '/admin/drivers', label: 'Drivers', icon: ShieldCheck },
    { href: '/admin/buses', label: 'Bus Fleet', icon: BusIcon },
    { href: '/admin/announcements', label: 'Noticeboard', icon: Megaphone },
    { href: '/admin/reports', label: 'Reports & Logs', icon: BarChart3 }
  ];

  const parentLinks = [
    { href: '/parent/dashboard', label: 'Child Transport', icon: LayoutDashboard },
  ];

  const studentLinks = [
    { href: '/student/dashboard', label: 'Bus Schedule', icon: LayoutDashboard },
  ];

  const links =
    user.role === 'admin'
      ? adminLinks
      : user.role === 'parent'
      ? parentLinks
      : studentLinks;

  const roleLabel =
    user.role === 'admin' ? 'Fleet Control' : user.role === 'parent' ? 'Parent Portal' : 'Student Portal';

  // Premium Gray Glassmorphism Sidebar
  const sidebarContent = (
    <aside 
      className="flex flex-col h-full overflow-y-auto border-r transition-all"
      style={{
        background: 'rgba(241, 245, 249, 0.85)', // Cool gray slate-100 base with transparency
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: 'rgba(148, 163, 184, 0.25)' // slate-400 border with low opacity
      }}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/linga_logo.png"
            alt="LINGA School Bus Logo"
            style={{ width: '38px', height: '38px', minWidth: '38px', minHeight: '38px', objectFit: 'contain' }}
            className="rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-sm shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-sm text-slate-800 leading-tight">
              LINGA School Bus
            </h1>
            <span className="text-[9px] text-yellow-600 tracking-widest font-mono uppercase block mt-0.5 font-bold">
              {roleLabel}
            </span>
          </div>
        </div>
        {/* Close button (mobile only) */}
        <button
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-all cursor-pointer"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-yellow-500 text-gray-900 shadow-md shadow-yellow-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User Session Info & Log Out */}
      <div className="p-4 border-t border-slate-200/40 bg-slate-200/20 backdrop-blur-md">
        <div className="flex items-center gap-3 px-1 py-1 mb-3">
          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-yellow-600 shrink-0 border border-slate-300/60">
            <User className="h-4 w-4" />
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{user.displayName}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 bg-white/60 hover:text-rose-600 hover:border-rose-300/80 hover:bg-rose-50/80 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out Session
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div 
        className="hidden lg:flex lg:w-64 lg:flex-col lg:h-screen lg:sticky lg:top-0 shrink-0"
        style={{
          zIndex: 30
        }}
      >
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 flex lg:hidden h-screen w-screen"
          role="dialog"
          aria-modal="true"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            height: '100vh', 
            width: '100vw',
            zIndex: 9999 // Ensure it is positioned on top of the navbar (z-40) and everything else
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              zIndex: 1
            }}
          />
          {/* Drawer */}
          <div 
            className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl"
            style={{ 
              position: 'relative', 
              height: '100%',
              zIndex: 10
            }}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Mobile hamburger trigger button exposed via DOM event - handled in layout */}
      <button
        id="sidebar-mobile-toggle"
        className="hidden"
        aria-label="Open sidebar"
        onClick={() => setMobileSidebarOpen(true)}
      />
    </>
  );
}

// Export function that layouts can call to open the mobile sidebar
export function openMobileSidebar() {
  const btn = document.getElementById('sidebar-mobile-toggle');
  if (btn) btn.click();
}

'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    const btn = document.getElementById('sidebar-mobile-toggle');
    if (btn) btn.click();
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={handleMenuClick} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-950/20">
          {children}
        </main>
      </div>
    </div>
  );
}

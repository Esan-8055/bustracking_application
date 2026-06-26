'use client';

import React from 'react';
import Link from 'next/link';
import { Bus, ShieldAlert, Navigation, Cpu, Bell, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 h-20 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-white rounded-lg border border-slate-800">
            <img
              src="/linga_logo.png"
              alt="LINGA School Bus Logo"
              style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', objectFit: 'contain' }}
            />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">LINGA <span className="text-yellow-500">School Bus</span></span>
            <span className="block text-[9px] text-slate-500 font-mono tracking-widest leading-none uppercase">Enterprise Fleet System</span>
          </div>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/60 transition-all"
          >
            Access Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/5 text-yellow-500 text-xs font-mono font-semibold mb-8 animate-pulse">
          <Cpu className="h-3.5 w-3.5" />
          Powered by ESP32 & NEO-6M GPS Hardware
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Real-Time School Transport <br />
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 bg-clip-text text-transparent">
            Safety & Tracking Hub
          </span>
        </h1>

        <p className="text-slate-400 text-base md:text-xl max-w-2xl font-light mb-10 leading-relaxed">
          Empowering schools, parents, and students with real-time bus location mapping, predictive ETA calculations, automated geofenced stop alarms, and driver direct lines.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-slate-950 font-bold bg-yellow-500 hover:bg-yellow-400 shadow-xl shadow-yellow-500/10 hover:shadow-yellow-500/25 transition-all text-base"
          >
            Launch Main Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl text-left">
          {/* Card 1 */}
          <div className="glass-panel glass-panel-hover p-8 rounded-2xl">
            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500 w-fit mb-5 border border-yellow-500/20">
              <Navigation className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Live Map Tracking</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Updates maps every 5-10 seconds using coordinates pushed from cellular-connected ESP32 modules. Renders paths and active marker statuses smoothly.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel glass-panel-hover p-8 rounded-2xl">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 w-fit mb-5 border border-blue-500/20">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Geofencing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Define 200m geofence regions. The platform instantly triggers notifications for students and parents when their bus approaches their assigned pickup stop.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel glass-panel-hover p-8 rounded-2xl">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 w-fit mb-5 border border-rose-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant SOS Trigger</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Drivers can send emergency SOS signals to the administrative console, flashing red alerts, logging locations, and notifying emergency lines immediately.
            </p>
          </div>
        </section>

        {/* Hardware Architecture Map */}
        <section className="mt-24 w-full max-w-4xl border border-slate-900 rounded-2xl p-8 bg-slate-950/60 backdrop-blur">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
            <Cpu className="h-5 w-5 text-yellow-500 animate-pulse" />
            IoT Hardware & API Integration Flow
          </h3>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto mb-8">
            Our ESP32 microcontrollers retrieve coordinates from NEO-6M GPS modules, pack them with speed and direction data, and fire POST payloads to our Next.js API.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-yellow-500 text-xs font-mono font-bold mb-1">STEP 1</div>
              <h4 className="font-semibold text-white mb-1.5">ESP32 NEO-6M</h4>
              <p className="text-slate-500 text-xs">Captures lat, lng, speed data via serial communication.</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-yellow-500 text-xs font-mono font-bold mb-1">STEP 2</div>
              <h4 className="font-semibold text-white mb-1.5">Secure POST</h4>
              <p className="text-slate-500 text-xs">Fires payloads to /api/gps/update with unique API Keys.</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-yellow-500 text-xs font-mono font-bold mb-1">STEP 3</div>
              <h4 className="font-semibold text-white mb-1.5">Real-time Stream</h4>
              <p className="text-slate-500 text-xs">Firestore snapshots sync coordinates to dashboards instantly.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-slate-600 text-xs">
        <p>© 2026 LINGA School Bus. All Rights Reserved. Enterprise School Transport SaaS Platform.</p>
      </footer>
    </div>
  );
}

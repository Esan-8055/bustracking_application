import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LINGA School Bus | School Transport & Live GPS Tracking Portal",
  description: "Enterprise multi-tenant real-time school bus fleet tracking, driver mapping, ETA predictions, and student transport management platform.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-white text-slate-900 selection:bg-yellow-500 selection:text-slate-950`}
      >
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}


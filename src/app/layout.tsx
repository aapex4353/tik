
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProviders from '@/components/AppProviders'; // Import AppProviders
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'; // Import the new component

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'All Games',
  description: 'A simple Tic-Tac-Toe game with a hidden chat feature.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#90EE90" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <AppProviders> {/* Wrap children with AppProviders */}
          <ServiceWorkerRegistrar /> {/* Add the ServiceWorkerRegistrar here */}
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}

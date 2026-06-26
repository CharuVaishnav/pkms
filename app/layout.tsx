import React from 'react';
import { VaultProvider } from '../context/VaultContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-50 antialiased">
        <VaultProvider>
          {children}
        </VaultProvider>
      </body>
    </html>
  );
}
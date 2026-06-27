'use client';

import { useRouter } from 'next/navigation'; // 👇 1. Import the Next.js router tool
import AuditDashboard from './components/AuditDashboard';

export default function Page() {
  const router = useRouter(); // 2. Initialize the navigation control hook

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
              <span className="text-white font-black text-lg tracking-tighter">P</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">PKMS Console</h1>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5 block">Infrastructure Monitoring</span>
            </div>
          </div>

          {/* ⚡ 3. Updated buttons to link directly to your software workspace routes */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 border border-gray-200 rounded-xl">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-600 shadow-sm"
            >
              📊 Feed Dashboard
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900 transition-all"
            >
              🔑 Keys Vault
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900 transition-all"
            >
              ⚙️ Webhook Settings
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
              Environment: Production
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-6">
        <AuditDashboard />
      </main>
    </div>
  );
}
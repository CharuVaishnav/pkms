'use client'; // Required since we are introducing interactive tab state mechanics

import { useState } from 'react';
import AuditDashboard from './components/AuditDashboard';
import KeysTab from './components/KeysTab'; // Importing your keys infrastructure
import IntegrationsTab from './components/IntegrationsTab'; // Importing your integrations infrastructure

export default function Page() {
  // 1. Tracks which component layout is currently visible
  const [activeTab, setActiveTab] = useState<'dashboard' | 'keys' | 'integrations'>('dashboard');

  // Placeholder masterKey state (adjust this context state to match how your app initializes its vault)
  const [masterKey, setMasterKey] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Global Navigation Header Mesh */}
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

          {/* 2. Interactive Navigation Link Array inside the header bar */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 border border-gray-200 rounded-xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              📊 Feed Dashboard
            </button>
            <button
              onClick={() => setActiveTab('keys')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'keys' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              🔑 Keys Vault
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'integrations' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
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

      {/* Primary Workspace Layout Framework */}
      <main className="max-w-7xl mx-auto py-6 px-6">
        {/* 3. Conditional Node Rendering based on active navigation element selection */}
        {activeTab === 'dashboard' && <AuditDashboard />}
        {activeTab === 'keys' && <KeysTab masterKey={masterKey} />}
        {activeTab === 'integrations' && <IntegrationsTab masterKey={masterKey} />}
      </main>
    </div>
  );
}
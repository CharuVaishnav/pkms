'use client';
// CRITICAL FIX: Polyfill Buffer globally at the absolute top of the file before any other imports execute
import { Buffer as BrowserBuffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || BrowserBuffer;
}

import React, { useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import { createClient } from '../../utils/supabase';
import { generateProjectEnvelope, unwrapProjectKey, encryptData } from '../../utils/crypto';

import ReposTab from '../components/ReposTab';
import KeysTab from '../components/KeysTab';
import IntegrationsTab from '../components/IntegrationsTab';
import dynamic from 'next/dynamic';

const MFASetupWizard = dynamic(() => import('../components/MFASetupWizard'), {
  ssr: false, // Disables server-side execution completely for this component
});

const supabase = createClient();

interface Project {
  id: string;
  name: string;
  host_type: 'vercel' | 'vps' | 'none';
  created_at: string;
}

export default function DashboardPage() {
  const { masterKey, clearSessionKey } = useVault();
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'hosting' | 'repos' | 'keys' | 'key_values'>('keys');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Phase 3 — Device Registration State
  const [isDeviceTrusted, setIsDeviceTrusted] = useState<boolean>(false);
  const [isVerifyingDevice, setIsVerifyingDevice] = useState<boolean>(true);

  // Form States
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserProfileAndProjects();
  }, [masterKey]);

  // Phase 3: Hardware Fingerprint Harvester Function
  const generateDeviceFingerprint = () => {
    if (typeof window === 'undefined') return 'server-env';
    const trackingString = [
      window.navigator.userAgent,
      window.navigator.language,
      window.screen.colorDepth,
      window.screen.width + 'x' + window.screen.height,
      new Date().getTimezoneOffset()
    ].join('||');
    
    // Hash structural parameters into a lightweight profile signature string
    let hash = 0;
    for (let i = 0; i < trackingString.length; i++) {
      const char = trackingString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'DEV_SIG_' + Math.abs(hash).toString(16);
  };

  const fetchUserProfileAndProjects = async () => {
    setIsLoading(true);
    setIsVerifyingDevice(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      clearSessionKey();
      return;
    }

    // 1. Fetch Basic User Profile State
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(profData);

    if (profData) {
      // 2. Phase 3 Verification: Evaluate Hardware Machine Footprint Boundary
      const fingerprint = generateDeviceFingerprint();
      
      let { data: deviceRecord } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_fingerprint', fingerprint)
        .maybeSingle();

      // Proactive Registration if device fingerprint context doesn't exist yet
      if (!deviceRecord) {
        const userAgentStr = window.navigator.userAgent;
        const browserName = userAgentStr.includes("Chrome") ? "Chrome Session" : userAgentStr.includes("Firefox") ? "Firefox Session" : "Secure Node Endpoint";
        
        const { data: newDevice } = await supabase
          .from('devices')
          .insert({
            user_id: user.id,
            device_fingerprint: fingerprint,
            device_name: `${browserName} (${window.navigator.platform})`,
            is_trusted: true // Default trust parameter assigned for development runtimes
          })
          .select()
          .single();
        deviceRecord = newDevice;
      }

      setIsDeviceTrusted(deviceRecord?.is_trusted || false);
      setIsVerifyingDevice(false);

      // 3. Fetch Project Lists
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      setProjects(projData || []);
      if (projData && projData.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projData[0].id);
      }
    }
    setIsLoading(false);
  };

  const handleMFASetupComplete = async (secret: string, backupCodes: string[]) => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const encryptedSecret = await encryptData(secret, masterKey!);

    await supabase
      .from('profiles')
      .update({
        totp_secret: encryptedSecret,
        is_mfa_enabled: true
      })
      .eq('id', user!.id);

    await fetchUserProfileAndProjects();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !masterKey) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: newProj, error: pErr } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          owner_user_id: user!.id,
          host_type: 'none'
        })
        .select()
        .single();

      if (pErr) throw pErr;

      const { encryptedDataKeyHex } = await generateProjectEnvelope(masterKey);

      await supabase
        .from('secrets')
        .insert({
          project_id: newProj.id,
          encrypted_data_key: encryptedDataKeyHex
        });

      setNewProjectName('');
      await fetchUserProfileAndProjects();
      setSelectedProjectId(newProj.id);
    } catch (err) {
      alert('Error creating workspace project. Ensure name is unique per user.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('CRITICAL WARN: Deleting this workspace will remove all matching encrypted environment secrets. Proceed?')) return;
    
    await supabase.from('projects').delete().eq('id', projectId);
    setSelectedProjectId(null);
    await fetchUserProfileAndProjects();
  };

  if (isLoading || isVerifyingDevice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-500 tracking-widest">
        INITIALIZING SECURE ARCHITECTURE MESH & VERIFYING DEVICE FINGERPRINT...
      </div>
    );
  }

  // Phase 3 Security Isolation Block — Block access if machine profile trust is flagged false
  if (!isDeviceTrusted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 font-mono text-xs text-red-400 p-6 tracking-wide">
        <p className="text-xl mb-2">🚨 ACCESS VIOLATION DETECTED 🚨</p>
        <p className="max-w-md text-center text-zinc-500">This hardware node workspace context signature is untrusted. Security protocols prevent loading underlying key envelopes from unregistered hardware environments.</p>
      </div>
    );
  }

  if (profile && !profile.is_mfa_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <MFASetupWizard userEmail={profile.id} onSetupComplete={handleMFASetupComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-200">
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
          <h1 className="text-sm font-mono tracking-wider font-bold text-zinc-100 uppercase">PKMS // Core Workspace System</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs font-mono text-green-500 bg-green-950/40 border border-green-900/50 px-2 py-0.5 rounded">
            SYS_STATUS: DECRYPTED
          </span>
          <button
            onClick={clearSessionKey}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-800 text-zinc-300 hover:text-red-200 font-mono text-xs rounded transition-all uppercase"
          >
            🔒 Lock Vault Session
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-zinc-900/50 border-r border-zinc-800 flex flex-col p-6 space-y-6">
          <div>
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Provision Workspace</h3>
            <form onSubmit={handleCreateProject} className="flex space-x-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project namespace..."
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 rounded focus:outline-none focus:border-orange-500"
                required
              />
              <button
                type="submit"
                className="px-3 py-2 bg-orange-600 hover:bg-orange-500 font-mono text-xs font-bold text-white rounded transition-colors"
              >
                +
              </button>
            </form>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Active Vault Safes</h3>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
              {projects.length === 0 ? (
                <p className="text-xs font-mono text-zinc-600 italic p-2">No infrastructure containers deployed.</p>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full flex items-center justify-between p-3 rounded font-mono text-xs cursor-pointer border transition-all ${
                      selectedProjectId === project.id
                        ? 'bg-zinc-800/60 border-orange-500/50 text-orange-400'
                        : 'bg-zinc-900/30 border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/30'
                    }`}
                  >
                    <span className="truncate pr-2">📂 {project.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="text-zinc-600 hover:text-red-400 font-bold px-1 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-zinc-950 p-8 overflow-y-auto">
          {selectedProjectId ? (
            <div className="flex-1 flex flex-col space-y-6">
              <div className="border-b border-zinc-800 flex space-x-1">
                {(['keys', 'key_values', 'repos', 'hosting'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === tab
                        ? 'border-orange-500 text-orange-400 bg-orange-500/5'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="flex-1 bg-zinc-900/20 border border-zinc-800 p-6 rounded-lg">
                {activeTab === 'keys' && <KeysTab projectId={selectedProjectId} />}
                {activeTab === 'key_values' && <KeysTab projectId={selectedProjectId} />}
                {activeTab === 'repos' && <ReposTab projectId={selectedProjectId} />}
                {activeTab === 'hosting' && <IntegrationsTab projectId={selectedProjectId} type="hosting" />}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg p-12 text-center">
              <span className="text-2xl mb-2">📁</span>
              <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">No Vault Container Focused</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs">Select an active repository safe from the left matrix perimeter or provision a fresh one to begin envelope parameter mapping.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
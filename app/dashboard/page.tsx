'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { deriveMasterKey, encryptText, decryptText } from '@/utils/crypto';

interface Project {
  id: string;
  name: string;
  description: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<CryptoKey | null>(null);

  const supabase = createClient();

  // 1. RE-DERIVE KEY AND DECRYPT DATA ON MOUNT
  useEffect(() => {
    async function initializeWorkspace() {
      const savedPass = window.sessionStorage.getItem('temp_passphrase');
      const savedSalt = window.sessionStorage.getItem('temp_salt');

      if (!savedPass || !savedSalt) {
        alert("Session expired or unauthorized workspace access. Locking vault.");
        window.location.href = '/';
        return;
      }

      // Re-derive the key session parameters natively
      const derivedKey = await deriveMasterKey(savedPass, savedSalt);
      setActiveKey(derivedKey);

      // Fetch the encrypted entries from Supabase
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Fetch failure:", error.message);
      } else if (data) {
        // Run every row through our cryptographic decryption matrix
        const decryptedProjects = await Promise.all(
          data.map(async (row: any) => {
            try {
              const decryptedName = await decryptText(row.name, derivedKey);
              const decryptedDescription = await decryptText(row.description, derivedKey);
              return { id: row.id, name: decryptedName, description: decryptedDescription };
            } catch {
              // If it fails (like for rows created before encryption), show plain data
              return { id: row.id, name: row.name, description: row.description };
            }
          })
        );
        setProjects(decryptedProjects);
      }
      setLoading(false);
    }

    initializeWorkspace();
  }, []);

  // 2. ENCRYPT AND SUBMIT NEW PROJECT
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !activeKey) return;

    // Fetch account primary reference ID
    const { data: userData } = await supabase.from('users').select('id').limit(1).single();
    if (!userData) return;

    // Scramble data values securely before they leave your browser terminal screen!
    const encryptedName = await encryptText(projectName.trim(), activeKey);
    const encryptedDesc = await encryptText(projectDesc.trim(), activeKey);

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name: encryptedName,
          description: encryptedDesc,
          owner_user_id: userData.id
        }
      ])
      .select()
      .single();

    if (error) {
      alert("Failed to provision encrypted space: " + error.message);
    } else if (data) {
      // Append the clean, unencrypted text back to your screen view list
      const cleanNewProject: Project = {
        id: data.id,
        name: projectName.trim(),
        description: projectDesc.trim()
      };
      setProjects([cleanNewProject, ...projects]);
      setProjectName('');
      setProjectDesc('');
    }
  };

  const handleLockVault = () => {
    window.sessionStorage.clear(); // Complete crypto session wipe
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-mono">
      {/* Top Header - Restyled to Orange / White */}
      <div className="max-w-6xl mx-auto flex justify-between items-center border-b border-neutral-800 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            PKMS <span className="text-orange-500">//</span> Core Workspace
          </h1>
          <p className="text-xs text-neutral-400 mt-1">Status: Vault Session Active (AES-256 Hardware Armed)</p>
        </div>
        <button 
          onClick={handleLockVault}
          className="text-xs bg-neutral-900 border border-neutral-800 hover:border-orange-500 hover:text-orange-400 px-4 py-2 rounded-lg transition-colors"
        >
          Lock Vault
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Container (Restyled to Dark Gray and Orange Accents) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-fit shadow-xl">
          <h2 className="text-xs uppercase tracking-wider text-orange-500 mb-4 font-bold">Initialize Secure Project</h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Project Identifier</label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project title..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Encrypted Payload Data</label>
              <textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Technical solution details..."
                rows={4}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-orange-500 resize-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg py-2.5 transition-colors shadow-lg shadow-orange-950/20"
            >
              + Provision Encrypted Space
            </button>
          </form>
        </div>

        {/* Right Columns: Project List Display */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Active Technical Workspaces</h2>
          
          {loading ? (
            <p className="text-xs text-neutral-500 animate-pulse">Syncing encryption matrix tables...</p>
          ) : projects.length === 0 ? (
            <p className="text-xs text-neutral-500">No secure workspaces provisioned.</p>
          ) : (
            projects.map((project) => (
              <div 
                key={project.id} 
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-all shadow-md"
              >
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">{project.name}</h3>
                  <p className="text-sm text-neutral-400 mt-2 leading-relaxed font-sans">{project.description}</p>
                  <div className="mt-4 flex gap-2">
                    <span className="text-[9px] bg-neutral-950 border border-neutral-800 text-orange-500 px-2 py-0.5 rounded font-mono">
                      AES-GCM-256 Locked
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
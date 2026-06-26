'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase';
import { useVault } from '../../context/VaultContext';
import { encryptData } from '../../utils/crypto';

const supabase = createClient();

interface ReposTabProps {
  projectId: string;
}

interface RepoBinding {
  id: string;
  repo_owner: string;
  repo_name: string;
  branch: string;
  default_branch: string;
  last_push_at: string | null;
  created_at: string;
}

export default function ReposTab({ projectId }: ReposTabProps) {
  const { masterKey } = useVault();
  const [bindings, setBindings] = useState<RepoBinding[]>([]);
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Phase 6 Auto-pull Engine: Run full synchronization background loops automatically on mount
  useEffect(() => {
    const initializeAndAutoPull = async () => {
      const { data } = await supabase
        .from('repo_bindings')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      const activeBindings = data || [];
      setBindings(activeBindings);

      // Background automation loop executes natively for all active endpoints
      for (const binding of activeBindings) {
        handleSyncRepositoryMetadata(binding.id, binding.repo_owner, binding.repo_name);
      }
    };

    if (projectId) {
      initializeAndAutoPull();
    }
  }, [projectId]);

  const fetchRepoBindings = async () => {
    const { data } = await supabase
      .from('repo_bindings')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    setBindings(data || []);
  };

  // Phase 6 Live API Sync Method
  const handleSyncRepositoryMetadata = async (bindingId: string, owner: string, name: string) => {
    setIsSyncing(bindingId);
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (!response.ok) throw new Error('Repository reference untraceable on GitHub public context.');

      const githubMetadata = await response.json();
      
      const { error: patchError } = await supabase
        .from('repo_bindings')
        .update({
          default_branch: githubMetadata.default_branch || 'main',
          last_push_at: githubMetadata.pushed_at
        })
        .eq('id', bindingId);

      if (patchError) throw patchError;
      
      // Refresh state vector internally
      const { data: updatedData } = await supabase
        .from('repo_bindings')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
        
      setBindings(updatedData || []);
    } catch (err: any) {
      console.error('Auto-pull pipeline error:', err);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleBindRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoOwner.trim() || !repoName.trim() || !masterKey) return;
    
    setIsLoading(true);
    setMessage('');

    try {
      let encryptedToken = null;
      if (githubToken.trim()) {
        encryptedToken = await encryptData(githubToken.trim(), masterKey);
      }

      const { data: newRow, error } = await supabase
        .from('repo_bindings')
        .insert({
          project_id: projectId,
          repo_owner: repoOwner.trim(),
          repo_name: repoName.trim(),
          branch: branch.trim(),
          encrypted_access_token: encryptedToken
        })
        .select()
        .single();

      if (error) throw error;

      setRepoOwner('');
      setRepoName('');
      setGithubToken('');
      setMessage('✓ Repository successfully bound to secure infrastructure perimeter.');
      
      if (newRow) {
        await handleSyncRepositoryMetadata(newRow.id, newRow.repo_owner, newRow.repo_name);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Integration Fault: ${err.message || 'Database transaction rejected.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnbindRepo = async (id: string) => {
    const { error } = await supabase.from('repo_bindings').delete().eq('id', id);
    if (!error) await fetchRepoBindings();
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h4 className="text-zinc-400 uppercase tracking-wider">// Link GitHub Repository Scope</h4>
      </div>

      <form onSubmit={handleBindRepository} className="space-y-4 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col space-y-1">
            <label className="text-zinc-500 uppercase text-xxs tracking-wider">Repository Owner / Org</label>
            <input
              type="text"
              value={repoOwner}
              onChange={(e) => setRepoOwner(e.target.value)}
              placeholder="e.g., github-username"
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded focus:outline-none focus:border-orange-500"
              required
            />
          </div>
          
          <div className="flex flex-col space-y-1">
            <label className="text-zinc-500 uppercase text-xxs tracking-wider">Repository Name</label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="e.g., my-secure-app"
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-zinc-500 uppercase text-xxs tracking-wider">Target Sync Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded focus:outline-none focus:border-orange-500"
              required
            />
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-zinc-500 uppercase text-xxs tracking-wider">GitHub Personal Access Token (PAT) — Optional</label>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded focus:outline-none focus:border-orange-500 tracking-widest"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className={`text-xxs ${message.startsWith('❌') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white font-bold uppercase tracking-wider rounded transition-colors"
          >
            {isLoading ? 'Processing...' : 'Establish Bind Connection'}
          </button>
        </div>
      </form>

      {/* ACTIVE BINDINGS MATRIX VIEW */}
      <div className="border border-zinc-800 rounded overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900 text-zinc-500 border-b border-zinc-800 uppercase tracking-widest text-xxs">
              <th className="p-3">Target Endpoint</th>
              <th className="p-3">Sync Scope</th>
              <th className="p-3">Auto-pull Metrics</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bindings.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-zinc-600 italic text-center">No structural repository links active for this cluster namespace.</td>
              </tr>
            ) : (
              bindings.map((binding) => (
                <tr key={binding.id} className="border-b border-zinc-900 hover:bg-zinc-900/10">
                  <td className="p-3 font-bold text-zinc-300">
                    github.com/{binding.repo_owner}/{binding.repo_name}
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-orange-400 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800/60 rounded">
                      git://{binding.branch}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-mono space-y-1">
                    <div className="text-zinc-400">Default Branch: <span className="text-zinc-200 font-bold">{binding.default_branch || 'main'}</span></div>
                    <div className="text-zinc-500 text-xxs">
                      Last Push: <span className="text-zinc-400">{binding.last_push_at ? new Date(binding.last_push_at).toLocaleString() : 'Fetching...'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleSyncRepositoryMetadata(binding.id, binding.repo_owner, binding.repo_name)}
                      disabled={isSyncing === binding.id}
                      className="text-orange-500 hover:text-orange-400 font-bold px-2 disabled:text-zinc-600 transition-colors"
                    >
                      {isSyncing === binding.id ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => handleUnbindRepo(binding.id)}
                      className="text-red-500 hover:text-red-400 font-bold px-2 transition-colors"
                    >
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
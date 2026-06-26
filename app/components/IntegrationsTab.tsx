'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase';
import { useVault } from '../../context/VaultContext';
import { encryptData } from '../../utils/crypto';

const supabase = createClient();

interface IntegrationsTabProps {
  projectId: string;
  type: 'hosting' | 'repos';
}

interface HostingRecord {
  id: string;
  provider_token: string;
  host_ip: string;
}

export default function IntegrationsTab({ projectId, type }: IntegrationsTabProps) {
  const { masterKey } = useVault();
  const [fieldA, setFieldA] = useState('');
  const [fieldB, setFieldB] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedRecords, setSavedRecords] = useState<HostingRecord[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (projectId && type === 'hosting') {
      fetchHostingDetails();
    }
  }, [projectId]);

  const fetchHostingDetails = async () => {
    const { data } = await supabase
      .from('hosting_integrations')
      .select('*')
      .eq('project_id', projectId);
    
    setSavedRecords(data || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldA.trim() || !fieldB.trim() || !masterKey) return;
    
    setIsLoading(true);
    setMessage('');

    try {
      // Secure delicate credential parameters using core crypto module
      const encryptedToken = await encryptData(fieldA.trim(), masterKey);

      const { error } = await supabase
        .from('hosting_integrations')
        .insert({
          project_id: projectId,
          provider_token: encryptedToken,
          host_ip: fieldB.trim()
        });

      if (error) throw error;

      setFieldA('');
      setFieldB('');
      setMessage('✓ Cloud infrastructure targets map locked down successfully.');
      await fetchHostingDetails();
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Config Fault: ${err.message || 'Database target insertion blocked.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveIntegration = async (id: string) => {
    const { error } = await supabase.from('hosting_integrations').delete().eq('id', id);
    if (!error) await fetchHostingDetails();
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      <form onSubmit={handleSave} className="space-y-4">
        <h4 className="text-zinc-400 uppercase tracking-wider pb-2 border-b border-zinc-800">
          {type === 'hosting' ? '// Cloud Hosting Connection Configuration' : '// GitHub Git-Source Perimeter Maps'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-500 uppercase tracking-widest mb-2 text-xxs">
              {type === 'hosting' ? 'Provider Endpoint Token' : 'GitHub Account Namespace'}
            </label>
            <input
              type={type === 'hosting' ? 'password' : 'text'}
              value={fieldA}
              onChange={(e) => setFieldA(e.target.value)}
              placeholder={type === 'hosting' ? 'vcl_token_prod_...' : 'CharuVaishnav'}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded focus:outline-none focus:border-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-zinc-500 uppercase tracking-widest mb-2 text-xxs">
              {type === 'hosting' ? 'Server Destination Host IP' : 'Repository Target URL'}
            </label>
            <input
              type="text"
              value={fieldB}
              onChange={(e) => setFieldB(e.target.value)}
              placeholder={type === 'hosting' ? '192.168.1.100' : 'https://github.com/CharuVaishnav/pkms.git'}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded focus:outline-none focus:border-orange-500"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xxs text-green-400 font-bold">{message}</p>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white font-bold rounded uppercase tracking-wider transition-colors"
          >
            {isLoading ? 'Encrypting...' : 'Link Infrastructure Configuration'}
          </button>
        </div>
      </form>

      {/* RENDER ACTIVE HOSTING PERIMETER CLUSTERS */}
      {type === 'hosting' && savedRecords.length > 0 && (
        <div className="border border-zinc-800 rounded overflow-hidden mt-6">
          <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 text-zinc-500 uppercase tracking-widest text-xxs font-bold">
            Linked Deployment Clusters
          </div>
          <div className="divide-y divide-zinc-900 bg-zinc-950/20">
            {savedRecords.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-4 hover:bg-zinc-900/10">
                <div className="space-y-1">
                  <div className="text-zinc-300 font-bold">🎯 Destination IP: <span className="text-orange-400 font-mono">{rec.host_ip}</span></div>
                  <div className="text-zinc-500 text-xxs uppercase tracking-wider">Credential Token status: <span className="text-green-500">Encrypted AES-GCM</span></div>
                </div>
                <button
                  onClick={() => handleRemoveIntegration(rec.id)}
                  className="text-red-500 hover:text-red-400 font-bold px-2 transition-colors"
                >
                  Sever link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase';
import { useVault } from '../../context/VaultContext';
import { unwrapProjectKey, encryptData, decryptData } from '../../utils/crypto';

const supabase = createClient();

interface KeysTabProps {
  projectId: string;
}

interface KeyValueRow {
  id: string;
  key_name: string;
  encrypted_value: string;
  is_secret: boolean;
  category: string;
  rotation_date: string | null;
  decryptedValue?: string;
  revealed?: boolean;
}

export default function KeysTab({ projectId }: KeysTabProps) {
  const { masterKey } = useVault();
  const [rows, setRows] = useState<KeyValueRow[]>([]);
  const [keyName, setKeyName] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [isSecret, setIsSecret] = useState(true);
  const [category, setCategory] = useState('General');
  const [rotationDays, setRotationDays] = useState('90');

  useEffect(() => {
    fetchKeys();
  }, [projectId]);

  const fetchKeys = async () => {
    const { data } = await supabase
      .from('key_values')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    setRows(data || []);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim() || !valueInput.trim() || !masterKey) return;

    // Fetch the project envelope data key securely
    const { data: envelope, error: envelopeError } = await supabase
      .from('secrets')
      .select('*')  // <-- THIS MUST BE HERE
      .eq('project_id', projectId)
      .maybeSingle(); // Use maybeSingle to prevent crashing if empty

    if (envelopeError) {
      console.error("Failed to retrieve envelope context:", envelopeError);
      return;
    }

    if (!envelope) {
      alert("No cryptographic envelope container found for this workspace repository perimeter.");
      return;
    }

   const projectKey = await unwrapProjectKey(envelope.encrypted_data_key, masterKey as any);
    const encryptedVal = await encryptData(valueInput, projectKey);

    const rotDate = new Date();
    rotDate.setDate(rotDate.getDate() + parseInt(rotationDays));

    await supabase.from('key_values').insert({
      project_id: projectId,
      key_name: keyName.trim().toUpperCase(),
      encrypted_value: encryptedVal,
      is_secret: isSecret,
      category,
      rotation_date: rotDate.toISOString()
    });

    setKeyName('');
    setValueInput('');
    await fetchKeys();
  };

  const toggleRevealRow = async (index: number) => {
    const updated = [...rows];
    const row = updated[index];

    if (row.revealed) {
      row.revealed = false;
      setRows(updated);
      return;
    }

    const { data: envelope } = await supabase
  .from('secrets')
  .select('*') // <-- You must specify the selection target first
  .eq('project_id', projectId)
  .single();
    const projectKey = await unwrapProjectKey(envelope.encrypted_data_key, masterKey! as any);
    
    await supabase.from('audit_log').insert({
      action_type: 'SECRET_REVEAL',
      metadata_payload: JSON.stringify({ key_name: row.key_name, project_id: projectId })
    });

    row.decryptedValue = await decryptData(row.encrypted_value, projectKey);
    row.revealed = true;
    setRows(updated);
  };

  const handleDeleteRow = async (id: string) => {
    await supabase.from('key_values').delete().eq('id', id);
    await fetchKeys();
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <h4 className="text-zinc-400 uppercase tracking-wider">// Inject Environment Variables</h4>
      </div>

      <form onSubmit={handleAddKey} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded">
        <input
          type="text"
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
          placeholder="VARIABLE_KEY"
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded focus:outline-none focus:border-orange-500"
          required
        />
        <input
          type="text"
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
          placeholder="Secret value payload..."
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded focus:outline-none focus:border-orange-500"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded focus:outline-none focus:border-orange-500"
        >
          <option value="General">General</option>
          <option value="Database">Database</option>
          <option value="API_Gateway">API Gateway</option>
          <option value="Production_Keys">Production Keys</option>
        </select>
        <select
          value={rotationDays}
          onChange={(e) => setRotationDays(e.target.value)}
          className="px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded focus:outline-none focus:border-orange-500"
        >
          <option value="30">30 Day Rotation</option>
          <option value="90">90 Day Rotation</option>
          <option value="365">Stale Warning Disabled</option>
        </select>
        <button
          type="submit"
          className="bg-orange-600 hover:bg-orange-500 font-bold text-white uppercase tracking-wider rounded transition-colors"
        >
          Inject Secret
        </button>
      </form>

      <div className="border border-zinc-800 rounded overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900 text-zinc-500 border-b border-zinc-800 uppercase tracking-widest text-xxs">
              <th className="p-3">Category</th>
              <th className="p-3">Key Namespace</th>
              <th className="p-3">Encrypted Value (AES-256-GCM)</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-zinc-600 italic text-center">No structural cluster secrets mapped.</td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="border-b border-zinc-900 hover:bg-zinc-900/10">
                  <td className="p-3"><span className="px-2 py-0.5 bg-zinc-800/80 rounded text-zinc-400">{row.category}</span></td>
                  <td className="p-3 font-bold text-zinc-300">{row.key_name}</td>
                  <td className="p-3 font-mono text-zinc-500 select-all max-w-xs truncate">
                    {row.revealed ? (
                      <span className="text-orange-400 font-sans font-medium">{row.decryptedValue}</span>
                    ) : (
                      <span>🔒 {row.encrypted_value.substring(0, 24)}...</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => toggleRevealRow(idx)}
                      className="text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded transition-colors"
                    >
                      {row.revealed ? 'Mask' : 'Reveal'}
                    </button>
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-red-500 hover:text-red-400 px-1"
                    >
                      ✕
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
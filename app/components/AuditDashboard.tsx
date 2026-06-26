'use client';

import { useEffect, useState } from 'react';
// Move up two directories (../../) to jump past 'components' and 'app' into the root workspace
import { createClient } from '../../utils/supabase';
export default function AuditDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function fetchTelemetryData() {
    setLoading(true);
    
    // Fetch latest security audit logs
    const { data: logData } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch latest live webhooks
    const { data: webhookData } = await supabase
      .from('webhook_payloads')
      .select('*')
      .order('pushed_at', { ascending: false })
      .limit(10);

    setLogs(logData || []);
    setWebhooks(webhookData || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTelemetryData();
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Syncing live telemetry matrix...</div>;

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Section 1: Webhook Ingestion Feed */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            🛰️ Real-Time Webhook Ingestion Feed
          </h2>
          <button onClick={fetchTelemetryData} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition">
            Refresh Feed
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-600">
                <th className="p-3">Repository</th>
                <th className="p-3">Sender</th>
                <th className="p-3">Event</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.length === 0 ? (
                <tr><td colSpan={4} className="p-3 text-sm text-gray-400 text-center">No incoming webhooks recorded.</td></tr>
              ) : (
                webhooks.map((w) => (
                  <tr key={w.id} className="border-b border-gray-100 text-sm hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{w.repository}</td>
                    <td className="p-3 text-gray-600">{w.sender}</td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs uppercase font-bold">{w.event_type}</span></td>
                    <td className="p-3 text-gray-500">{new Date(w.pushed_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Compliance System Audit Trail */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          🛡️ Compliance System Audit Trail
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-600">
                <th className="p-3">Action Identifier</th>
                <th className="p-3">Telemetry Metadata Description</th>
                <th className="p-3">Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={3} className="p-3 text-sm text-gray-400 text-center">Audit trail is currently clear.</td></tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 text-sm hover:bg-gray-50">
                    <td className="p-3 font-mono text-blue-600 font-bold">{l.action_type}</td>
                    <td className="p-3 text-gray-700">{l.metadata}</td>
                    <td className="p-3 text-gray-500">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
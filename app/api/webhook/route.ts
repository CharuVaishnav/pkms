import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase'; 

const supabaseClientInstance = createClient();

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const payload = JSON.parse(rawText);

    const repoName = payload.repository?.full_name || 'unknown/repo';
    const senderName = payload.sender?.login || 'system';
    const eventType = payload.event_type || 'push';

    // 1. Insert into Webhook Payloads
    await supabaseClientInstance
      .from('webhook_payloads')
      .insert({
        repository: repoName,
        sender: senderName,
        event_type: eventType
      });

    // 2. NEW: Write to the Compliance System Audit Logs
    await supabaseClientInstance
      .from('system_logs')
      .insert({
        action_type: 'WEBHOOK_RECEIVED',
        metadata: `GitHub Push event processed for repository: ${repoName} by user: ${senderName}`
      });

    return NextResponse.json({ status: 'PROCESSED_SUCCESSFULLY' }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook Endpoint Halt:', error.message || error);
    return NextResponse.json({ error: 'RUNTIME_HALT', message: error.message }, { status: 500 });
  }
}
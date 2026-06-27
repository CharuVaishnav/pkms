'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-600 font-mono text-xs tracking-widest animate-pulse uppercase">
        Initializing PKMS...
      </div>
    </div>
  );
}
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const createClient = () => {
  const url = 'https://dxpxprgyxctvzutroxjs.supabase.co';
  
  // This has the exact number '5' and lowercase 'n' fixed
 const anonKey = 'sb_publishable_jiIJbgnXSSrZfYNG1pmRIA_uR53JTgV';

  return createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
};
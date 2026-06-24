'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { createClient } from '@/utils/supabase'; // Links to our database connector helper
import { v4 as uuidv4 } from 'uuid'; // Generates a clean random string for our salt
import { deriveMasterKey } from '@/utils/crypto'; // Our Phase 2 crypto core engine

export default function LoginPage() {
  const router = useRouter(); // Initialize the page jumper tool
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
   // Replace the crashy line with this clean state setter:
   setLoading(true);

    // Initialize our connection client
    const supabase = createClient();

    if (isSignUp) {
      // 1. INITIALIZE NEW VAULT (SIGN UP)
      const randomSalt = uuidv4(); 

      const { error } = await supabase
        .from('users')
        .insert([
          { 
            email: email.toLowerCase().trim(), 
            master_salt: randomSalt 
          }
        ]);

      if (error) {
        alert("Registration failed: " + error.message);
      } else {
        alert("Success! Vault initialized in database. Switch modes to Unlock.");
        setIsSignUp(false);
      }
    } else {
      // 2. UNLOCK VAULT (LOGIN VIEW CHECK)
      const { data, error } = await supabase
        .from('users')
        .select('email, master_salt')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !data) {
        alert("Vault not found or invalid credentials.");
      } else {
        try {
          console.log("Stretching passphrase and deriving key...");
          
          // --- CRYPTO ENGINE ACTIVATION ---
          const masterKey = await deriveMasterKey(passphrase, data.master_salt);
          console.log("Master Key generated successfully:", masterKey);
          
          // --- STEP 2: TEMPORARY SESSION HANDOFF ---
          // Saves credentials temporarily so the dashboard can regenerate the key on load
          window.sessionStorage.setItem('temp_passphrase', passphrase);
          window.sessionStorage.setItem('temp_salt', data.master_salt);
          
          // --- ROUTER REDIRECT ACTIVATION ---
          router.push('/dashboard');
          
        } catch (cryptoError) {
          console.error("Cryptographic derivation failed:", cryptoError);
          alert("Failed to safely unlock your vault contents.");
        }
      }
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8 shadow-2xl">
        
        {/* Header Title - Restyled to Industrial Orange & White */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            PKMS <span className="text-orange-500">//</span> Core
          </h1>
          <p className="text-xs text-neutral-400 mt-2">Project & Key Management System</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-100 focus:outline-none focus:border-orange-500 font-sans transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
              Master Passphrase
            </label>
            <input
              type="password"
              required
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-100 focus:outline-none focus:border-orange-500 font-sans transition-colors"
            />
          </div>

          {/* Button - Restyled to Safety Orange */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg py-3 shadow-lg shadow-orange-950/20 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Initialize New Vault' : 'Unlock Vault'}
          </button>
        </form>

        {/* Toggle between Login and Signup */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-neutral-500 hover:text-orange-400 transition-colors underline underline-offset-4"
          >
            {isSignUp ? 'Already have a vault? Unlock' : 'Need a new vault? Create account'}
          </button>
        </div>

      </div>
    </main>
  );
}
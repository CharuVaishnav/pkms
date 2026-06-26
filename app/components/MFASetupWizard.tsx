'use client';
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import React, { useState } from 'react';
import { generateTOTPSecret, getTOTPAuthURI, generateQRCodeDataURL, verifyTOTPToken, generateBackupCodes } from '../../utils/otp';

interface MFASetupWizardProps {
  userEmail: string;
  onSetupComplete: (encryptedSecret: string, backupCodes: string[]) => void;
}

export default function MFASetupWizard({ userEmail, onSetupComplete }: MFASetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [secret] = useState(() => generateTOTPSecret());
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes] = useState(() => generateBackupCodes());
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');

  const startSetupFlow = async () => {
    const uri = getTOTPAuthURI(userEmail, 'PKMS Core', secret);
    const dataUrl = await generateQRCodeDataURL(uri);
    setQrCodeUrl(dataUrl);
    setStep(2);
  };

  const handleVerifyToken = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isValid = verifyTOTPToken(tokenInput, secret);
    if (isValid) {
      setStep(3);
    } else {
      setError('Invalid code. Please verify the numbers on your authenticator device.');
    }
  };

  return (
    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-lg shadow-2xl">
      <div className="flex items-center space-x-2 mb-6">
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <h2 className="text-sm font-mono tracking-widest uppercase text-zinc-400">Security Core // MFA Configuration</h2>
      </div>

      {step === 1 && (
        <div>
          <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
            To enforce strict company zero-knowledge perimeter conditions, you must attach a multi-factor authentication token generator before provisioning workspaces.
          </p>
          <button
            onClick={startSetupFlow}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-semibold rounded uppercase tracking-wider transition-colors"
          >
            Initialize Device Connection
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-xs text-zinc-400 font-mono mb-4">1. Scan this QR matrix using Google Authenticator or 1Password:</p>
          {qrCodeUrl && (
            <div className="flex justify-center p-4 bg-white rounded-lg mb-6 w-48 h-48 mx-auto">
              <img src={qrCodeUrl} alt="MFA Token Setup Matrix" className="w-full h-full" />
            </div>
          )}
          <form onSubmit={handleVerifyToken} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">2. Verification Token</label>
              <input
                type="text"
                maxLength={6}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-center text-lg tracking-widest rounded focus:outline-none focus:border-orange-500"
                required
              />
            </div>
            {error && <p className="text-xs font-mono text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-semibold rounded uppercase tracking-wider transition-colors"
          >
              Verify Active Token
            </button>
          </form>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="text-sm text-green-500 font-mono mb-2">✓ Dynamic MFA Token Successfully Verified</p>
          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            Store these emergency static backup codes securely. They will consume instantly to unlock the perimeter if your primary verification device is offline.
          </p>
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded font-mono text-xs text-orange-400 space-y-1 mb-6">
            {backupCodes.map((code, idx) => (
              <div key={idx} className="flex justify-between">
                <span>Backup Index [0{idx + 1}]:</span>
                <span className="font-bold select-all">{code}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onSetupComplete(secret, backupCodes)}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-semibold rounded uppercase tracking-wider transition-colors"
          >
            Finalize Profile Integration
          </button>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Key, Plus, Sparkles, Sliders, Shield, AlertTriangle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { LicenseKey } from '../types';

interface KeyGeneratorProps {
  currentUserEmail: string;
  onSuccess: () => void;
}

export default function KeyGenerator({ currentUserEmail, onSuccess }: KeyGeneratorProps) {
  const [label, setLabel] = useState('');
  const [sdkType, setSdkType] = useState('Standard Virtual SDK');
  const [expiryType, setExpiryType] = useState<'lifetime' | 'duration'>('duration');
  const [durationDays, setDurationDays] = useState(30);
  const [deviceLimit, setDeviceLimit] = useState(1);
  const [allowedPackage, setAllowedPackage] = useState('');
  const [prefix, setPrefix] = useState('OB');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Randomized code segment generator
  const createSecureKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid lookalikes (O, 0, I, 1)
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const basePrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, 'VIRT');
    return `${basePrefix}-${segment()}-${segment()}-${segment()}-${segment()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setErrorMsg("Please enter a customer or description label.");
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const generatedKey = createSecureKey();
    const finalLabel = label.trim();
    const finalPackage = allowedPackage.trim();

    const licenseData: LicenseKey = {
      key: generatedKey,
      label: finalLabel,
      status: 'active',
      expiryType,
      deviceLimit: Number(deviceLimit) || 0,
      deviceCount: 0,
      devices: {},
      sdkType,
      allowedPackage: finalPackage || '',
      creatorEmail: currentUserEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (expiryType === 'duration') {
      licenseData.durationDays = Number(durationDays) || 30;
    }

    try {
      // Direct Firestore registration matching standard keyId format
      const docRef = doc(db, 'keys', generatedKey);
      await setDoc(docRef, licenseData);

      // Reset Form fields
      setLabel('');
      setAllowedPackage('');
      setDurationDays(30);
      setDeviceLimit(1);
      
      onSuccess();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to register key in the active Firebase registry.");
      try {
        handleFirestoreError(err, OperationType.CREATE, `keys/${generatedKey}`);
      } catch (logErr) {
        // Log caught by reporting helper successfully
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm" id="key_generator_container">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Issue License Key</h2>
            <p className="text-xs text-slate-400">Generate instantly to FireStore database</p>
          </div>
        </div>
        <Sliders className="h-4 w-4 text-slate-500" />
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs leading-5 text-red-400 font-medium font-mono">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Label and SDK Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 font-mono">
              Label / Customer Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Game Guardian Bypass"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 font-mono">
              SDK Variant / Edition
            </label>
            <select
              value={sdkType}
              onChange={(e) => setSdkType(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-lime-400 focus:outline-none bg-slate-950 font-mono"
            >
              <option value="Standard Virtual SDK">Standard Virtual SDK (.aar)</option>
              <option value="Bypass Dual Space SDK">Bypass Dual Space SDK</option>
              <option value="Premium Sandbox Container">Premium Sandbox Container</option>
              <option value="Hardware Emulation bypass">Hardware Emulation bypass</option>
            </select>
          </div>
        </div>

        {/* Expiry Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 font-mono">
              Validity Strategy
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExpiryType('duration')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer font-mono ${
                  expiryType === 'duration'
                    ? 'border-lime-400 bg-lime-400/10 text-lime-400'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                Duration Based
              </button>
              <button
                type="button"
                onClick={() => setExpiryType('lifetime')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer font-mono ${
                  expiryType === 'lifetime'
                    ? 'border-lime-400 bg-lime-400/10 text-lime-400'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900'
                }`}
              >
                Lifetime Unlocked
              </button>
            </div>
          </div>

          {expiryType === 'duration' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 font-mono">
                Duration (Days after activation)
              </label>
              <input
                type="number"
                min="1"
                required
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="block w-full rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 bg-slate-950"
              />
            </div>
          )}
        </div>

        {/* Limits & Lockdown restrictions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 font-mono">
              Device HWID Limit
            </label>
            <input
              type="number"
              min="0"
              required
              placeholder="0 means Unlimited"
              value={deviceLimit}
              onChange={(e) => setDeviceLimit(Number(e.target.value))}
              className="block w-full rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 bg-slate-950"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Set 0 to allow unlimited hardware attachments.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 font-mono">
              Android Package Lockdown
            </label>
            <div className="relative">
              <Shield className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-600" />
              <input
                type="text"
                placeholder="e.g. com.game.dual"
                value={allowedPackage}
                onChange={(e) => setAllowedPackage(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 bg-slate-950 placeholder:text-slate-600"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Leaved empty to support from any package context.
            </span>
          </div>
        </div>

        {/* Key Customizer Code prefixes */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-0.5 font-mono">
              Key Prefix (A-Z, 0-9)
            </label>
            <span className="text-[10px] text-slate-500 block">Identifies generated keys.</span>
          </div>
          <input
            type="text"
            maxLength={10}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            className="block w-28 rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-mono text-lime-400 text-center font-bold focus:border-lime-400 focus:outline-none bg-slate-950"
          />
        </div>

        {/* Submit issue key */}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-lg bg-lime-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-lime-300 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            "Writing to live database..."
          ) : (
            <>
              <Plus className="h-4 w-4 stroke-[3px]" />
              Generate & Publish Key
            </>
          )}
        </button>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Smartphone, Play, Terminal, HelpCircle, HardDrive, ShieldCheck, RefreshCw } from 'lucide-react';

interface ClientEmulatorProps {
  initialKey?: string;
  onValidationSuccess: () => void;
}

export default function ClientEmulator({ initialKey = '', onValidationSuccess }: ClientEmulatorProps) {
  const [key, setKey] = useState(initialKey);
  const [packageName, setPackageName] = useState('com.netease.spaceaction');
  const [hwid, setHwid] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [responseJson, setResponseJson] = useState<any>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate randomized hardware serial number on boot representing mobile build
  const generateHwid = () => {
    const chars = '0123456789ABCDEF';
    const segment = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * 16)]).join('');
    return `${segment(8)}-${segment(4)}-${segment(4)}-${segment(12)}`;
  };

  useEffect(() => {
    setHwid(generateHwid());
  }, []);

  // Update when key selection in registry updates
  useEffect(() => {
    if (initialKey) {
      setKey(initialKey);
    }
  }, [initialKey]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      alert("Please supply a license key before attempting simulation.");
      return;
    }

    setLoading(true);
    setResponseJson(null);
    setStatus(null);
    setLogs([
      "Initializing JNI bridge binding for liboneboxSDK.so...",
      `Package Context: ${packageName}`,
      `Hardware Bind: ${hwid}`,
      "Retrieving cryptographic variables...",
    ]);

    // Simulate standard JNI socket binding latency
    await new Promise(resolve => setTimeout(resolve, 800));

    setLogs(prev => [...prev, `Dispatching secure validation payload to: /api/validate-key`]);

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: key.trim(),
          hwid: hwid.trim(),
          packageName: packageName.trim()
        })
      });

      const data = await res.json();
      setStatus(res.status);
      setResponseJson(data);

      setLogs(prev => [
        ...prev,
        `Network completed with status: HTTP ${res.status}`,
        data.status === 'SUCCESS' 
          ? ">>> [SUCCESS] liboneboxSDK.so is fully initialized and active."
          : `>>> [ERROR] Activation rejected. Reason: ${data.message || 'Validation failed'}`
      ]);

      // Fire success callback to refresh registry and total counters dynamically
      if (res.status === 200) {
        onValidationSuccess();
      }

    } catch (err: any) {
      setLogs(prev => [...prev, `[CRITICAL] Network request failed: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm" id="client_emulator_container">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">APK Simulator</h2>
            <p className="text-xs text-slate-400">Test JNI calls and observe verification handshakes</p>
          </div>
        </div>
        <HelpCircle className="h-4 w-4 text-slate-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mock phone configurations */}
        <div>
          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 font-mono">
                Active License Key
              </label>
              <input
                type="text"
                required
                placeholder="Paste key (e.g., OB-XXXX-XXXX-...)"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 px-3 py-2 text-xs font-mono font-bold text-lime-400 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400 bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 font-mono">
                  Space Package
                </label>
                <input
                  type="text"
                  required
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="block w-full rounded-lg border border-slate-800 px-3 py-2 text-xs font-mono text-slate-300 focus:border-lime-400 focus:outline-none bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center justify-between font-mono">
                  Device HWID
                  <button
                    type="button"
                    onClick={() => setHwid(generateHwid())}
                    className="text-[10px] text-lime-400 font-bold hover:underline"
                    title="Generate another device id"
                  >
                    Regen ID
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={hwid}
                    onChange={(e) => setHwid(e.target.value)}
                    className="block w-full rounded-lg border border-slate-800 px-3 py-2 text-[10px] font-mono text-slate-300 focus:border-lime-400 focus:outline-none bg-slate-950"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-lime-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-sm hover:bg-lime-300 disabled:opacity-50 transition-all cursor-pointer font-mono"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  Simulating Handshake...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-slate-950 stroke-none" />
                  Trigger android SDK check
                </>
              )}
            </button>
          </form>
        </div>

        {/* Console / response logging */}
        <div className="flex flex-col gap-3">
          <div className="flex-1 rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-300 shadow-lg flex flex-col min-h-48 max-h-56 overflow-auto">
            <span className="text-[10px] uppercase font-bold text-slate-500 mb-2 border-b border-slate-800/40 pb-1 flex items-center gap-1">
              <Terminal className="h-3.5 w-3.5 text-lime-400" />
              liboneboxSDK.so Output Trace
            </span>
            <div className="flex-1 space-y-1 text-[10px] overflow-y-auto">
              {logs.length === 0 ? (
                <span className="text-slate-600 italic">Playground idle. Click button to begin.</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={log.startsWith(">>> [SUCCESS") ? "text-emerald-400 font-bold" : log.startsWith(">>> [ERROR") ? "text-red-400 font-bold" : "text-slate-400"}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Raw JSON Return Frame */}
          {responseJson && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 font-mono text-[10px] leading-4 text-slate-400 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800/40 pb-1.5 mb-1.5">
                <span className="font-bold text-slate-500">API Response Body</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${status === 200 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  HTTP {status}
                </span>
              </div>
              <pre className="overflow-x-auto selection:bg-slate-800 overflow-y-auto max-h-32 text-slate-300 font-medium whitespace-pre">
                {JSON.stringify(responseJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

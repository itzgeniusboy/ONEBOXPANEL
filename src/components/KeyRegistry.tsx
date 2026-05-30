import React, { useState } from 'react';
import { 
  Search, ShieldAlert, Copy, Check, Trash, Power, RefreshCw, 
  Smartphone, Eye, Users, AlertTriangle, Cpu, Tag, Calendar
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { LicenseKey } from '../types';

interface KeyRegistryProps {
  keys: LicenseKey[];
}

export default function KeyRegistry({ keys }: KeyRegistryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedKeyDevices, setSelectedKeyDevices] = useState<LicenseKey | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Copy-paste indicator routine
  const handleCopy = (keyString: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKey(keyString);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Status Toggles
  const toggleKeyStatus = async (keyData: LicenseKey) => {
    setUpdatingKey(keyData.key);
    const newStatus = keyData.status === 'active' ? 'blocked' : 'active';
    try {
      const docRef = doc(db, 'keys', keyData.key);
      await updateDoc(docRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `keys/${keyData.key}`);
    } finally {
      setUpdatingKey(null);
    }
  };

  // HWID / Registered Hardware list wiping
  const handleResetDevices = async (keyString: string) => {
    if (!window.confirm("Are you sure you want to reset all registered hardware IDs (HWIDs) for this key? This allows binding new devices.")) {
      return;
    }
    setUpdatingKey(keyString);
    try {
      const docRef = doc(db, 'keys', keyString);
      await updateDoc(docRef, {
        devices: {},
        deviceCount: 0,
        updatedAt: new Date().toISOString()
      });
      // also close modal if open
      if (selectedKeyDevices && selectedKeyDevices.key === keyString) {
        setSelectedKeyDevices(prev => prev ? { ...prev, devices: {}, deviceCount: 0 } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `keys/${keyString}`);
    } finally {
      setUpdatingKey(null);
    }
  };

  // Delete/Revoke License entirely
  const handleDeleteKey = async (keyString: string) => {
    if (!window.confirm("CRITICAL WARNING: This completely deletes the license key. All devices currently validated using this license will lose SDK access immediately. Proceed?")) {
      return;
    }
    setUpdatingKey(keyString);
    try {
      await deleteDoc(doc(db, 'keys', keyString));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `keys/${keyString}`);
    } finally {
      setUpdatingKey(null);
    }
  };

  // Safe checks for filtering entries
  const filteredKeys = keys.filter(k => {
    const matchesSearch = 
      k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.allowedPackage && k.allowedPackage.toLowerCase().includes(searchQuery.toLowerCase()));
      
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && k.status === statusFilter;
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm" id="registry_wrapper">
      {/* Filters bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5 mb-5">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Tag className="h-4 w-4 text-lime-400" />
            OneBox Key Registry
          </h2>
          <p className="text-xs text-slate-400">Query, monitor, and regulate keys in real-time</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* Search text box */}
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-slate-600" />
            <input
              type="text"
              placeholder="Search key, label, package..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:border-lime-400 focus:outline-none bg-slate-950"
            />
          </div>

          {/* Status Dropdowns */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-400 focus:border-lime-400 focus:outline-none font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="blocked">Blocked Only</option>
            <option value="expired">Expired Only</option>
          </select>
        </div>
      </div>

      {/* Main Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/20 text-xs font-bold uppercase text-slate-400 font-mono">
              <th className="py-3 px-4">License & Detail</th>
              <th className="py-3 px-4">Edition & Package</th>
              <th className="py-3 px-4">Devices Bound</th>
              <th className="py-3 px-4 text-[10px]">Activated / Expires</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-xs">
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500 font-mono text-xs">
                  No matching license keys found in the live registry.
                </td>
              </tr>
            ) : (
              filteredKeys.map((k) => {
                const expiringSoon = k.expiryType !== 'lifetime' && k.expiresAt ? (() => {
                  const diffMs = new Date(k.expiresAt).getTime() - Date.now();
                  const diffDays = diffMs / (1000 * 60 * 60 * 24);
                  return diffDays > 0 && diffDays < 3;
                })() : false;

                return (
                  <tr 
                    key={k.key} 
                    className={`hover:bg-slate-800/30 transition-colors ${
                      expiringSoon ? 'border-l-2 border-yellow-500 bg-yellow-500/5' : ''
                    }`}
                  >
                    {/* Key and Label */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-200 text-xs">{k.label}</span>
                          {expiringSoon && (
                            <span 
                              className="inline-flex items-center gap-1 rounded bg-yellow-400/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400 border border-yellow-400/25"
                              title="Less than 3 days remaining until expiration"
                            >
                              <AlertTriangle className="h-3 w-3 animate-pulse" />
                              Expiring Soon
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-lime-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 uppercase tracking-wide">
                            {k.key}
                          </span>
                          <button
                            onClick={() => handleCopy(k.key)}
                            className="text-slate-500 hover:text-lime-400 p-0.5 cursor-pointer"
                            title="Copy Key text"
                          >
                            {copiedKey === k.key ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* SDK edition & packages */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium inline-flex items-center gap-1 text-slate-300 font-mono text-xs">
                          <Cpu className="h-3.5 w-3.5 text-slate-500" />
                          {k.sdkType}
                        </span>
                        {k.allowedPackage ? (
                          <span className="font-mono text-[10px] text-lime-400 bg-lime-400/10 px-1.5 py-0.5 rounded border border-lime-400/20 w-fit">
                            pkg: {k.allowedPackage}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No package restrictions</span>
                        )}
                      </div>
                    </td>

                    {/* Devices limitations */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 font-medium">
                        <span className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-slate-300 w-fit">
                          <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                          {k.deviceCount} / {k.deviceLimit === 0 ? '∞' : k.deviceLimit}
                        </span>
                        {k.deviceCount > 0 && (
                          <button
                            onClick={() => setSelectedKeyDevices(k)}
                            className="text-lime-400 hover:text-lime-350 text-[10px] font-bold text-left hover:underline flex items-center gap-1 p-0 cursor-pointer"
                            id={`btn_inspect_${k.key}`}
                          >
                            <Eye className="h-3 w-3" />
                            Inspect HWIDs
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Date lifespans */}
                    <td className="py-4 px-4 font-mono text-[10px] text-slate-450">
                      <div className="flex flex-col gap-1 leading-tight">
                        {k.expiryType === 'lifetime' ? (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 w-fit uppercase font-semibold text-[9px] tracking-wide">
                            Lifetime
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              {k.durationDays} Days Valid
                            </span>
                            {k.activatedAt && k.expiresAt ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded w-fit">
                                  End: {new Date(k.expiresAt).toLocaleDateString()}
                                </span>
                                {expiringSoon && (
                                  <span 
                                    className="text-yellow-500 flex items-center justify-center fill-yellow-500/10" 
                                    title="Less than 3 days remaining until expiration"
                                  >
                                    <AlertTriangle className="h-4 w-4 animate-pulse" />
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-500 italic">Awaiting Activation</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                  {/* Status column + Action keys */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-right">
                      {/* Active Status Badge */}
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide mr-2 ${
                        k.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : k.status === 'blocked'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-lime-400/10 text-lime-400 border border-lime-400/20'
                      }`}>
                        {k.status}
                      </span>

                      {/* Power Disable state toggle */}
                      <button
                        onClick={() => toggleKeyStatus(k)}
                        disabled={updatingKey === k.key}
                        className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                          k.status === 'active'
                            ? 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-red-450'
                            : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-550 hover:text-slate-950'
                        }`}
                        title={k.status === 'active' ? "Block Key" : "Unblock Key"}
                        id={`btn_toggle_status_${k.key}`}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>

                      {/* Reset Hardware bind */}
                      <button
                        onClick={() => handleResetDevices(k.key)}
                        disabled={updatingKey === k.key}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-lime-400 transition-colors cursor-pointer"
                        title="Wipe associated hardware (HWID) device binds"
                        id={`btn_reset_devices_${k.key}`}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>

                      {/* Revoke entirely */}
                      <button
                        onClick={() => handleDeleteKey(k.key)}
                        disabled={updatingKey === k.key}
                        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-slate-950 hover:border-red-500 transition-colors cursor-pointer"
                        title="Delete key"
                        id={`btn_delete_${k.key}`}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      {/* Inspect Devices Modal */}
      {selectedKeyDevices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Registered Devices (HWID)</h3>
                <span className="text-[11px] font-mono font-bold text-lime-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded tracking-wide uppercase mt-1 inline-block">
                  {selectedKeyDevices.key}
                </span>
              </div>
              <button 
                onClick={() => setSelectedKeyDevices(null)}
                className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 font-bold text-slate-300 hover:bg-slate-800 text-xs font-mono cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="p-5 max-h-80 overflow-y-auto space-y-3 bg-slate-950/20">
              {Object.entries(selectedKeyDevices.devices || {}).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 italic font-mono">No active device bindings exist for this license.</p>
              ) : (
                Object.entries(selectedKeyDevices.devices).map(([hwid, dev]) => {
                  const devTyped = dev as any;
                  return (
                    <div key={hwid} className="rounded-lg border border-slate-800 bg-slate-950 p-3 relative hover:border-slate-700 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1 w-full">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono">Hardware HWID ID</span>
                          <span className="font-mono text-xs font-bold text-lime-400 break-all bg-slate-900 px-2 py-1.5 rounded border border-slate-800 mt-1">{hwid}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>Activated: {new Date(devTyped.registeredAt).toLocaleDateString()} {new Date(devTyped.registeredAt).toLocaleTimeString()}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-800" />
                        <span>Active: <span className="text-emerald-400 font-bold">{new Date(devTyped.lastActive).toLocaleDateString()}</span></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-3.5 rounded-b-2xl font-mono">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">{Object.keys(selectedKeyDevices.devices || {}).length} device(s) registered</span>
              <button
                onClick={() => handleResetDevices(selectedKeyDevices.key)}
                className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-slate-950 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-500 rounded-lg px-3 py-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset Binds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

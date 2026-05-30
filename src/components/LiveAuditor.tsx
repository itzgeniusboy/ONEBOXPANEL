import React, { useState } from 'react';
import { Terminal, RefreshCw, Trash2, Cpu, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, deleteDoc, collection, writeBatch, getDocs } from 'firebase/firestore';
import { ValidationLog } from '../types';

interface LiveAuditorProps {
  logs: ValidationLog[];
}

export default function LiveAuditor({ logs }: LiveAuditorProps) {
  const [clearing, setClearing] = useState(false);

  // Parse relative time or simple system format
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    let d: Date;
    if (timestamp.toDate) {
      d = timestamp.toDate();
    } else {
      d = new Date(timestamp);
    }
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getStatusColorAndIcon = (status: string) => {
    switch(status) {
      case 'success':
        return { 
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', 
          label: 'SUCCESS',
          icon: <CheckCircle className="h-3 w-3 text-emerald-400" />
        };
      case 'failed_invalid_key':
        return { 
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', 
          label: 'INVALID_KEY',
          icon: <ShieldAlert className="h-3 w-3 text-rose-400" />
        };
      case 'failed_blocked':
        return { 
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', 
          label: 'BLOCKED',
          icon: <ShieldAlert className="h-3 w-3 text-rose-400" />
        };
      case 'failed_expired':
        return { 
          color: 'text-lime-400 bg-lime-450/10 border-lime-450/20', 
          label: 'EXPIRED',
          icon: <Clock className="h-3 w-3 text-lime-450" />
        };
      case 'failed_hwid_limit':
        return { 
          color: 'text-lime-400 bg-lime-450/10 border-lime-450/20', 
          label: 'HWID_LIMIT_REACHED',
          icon: <Cpu className="h-3 w-3 text-lime-450" />
        };
      case 'failed_package_mismatch':
        return { 
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', 
          label: 'PKG_MISMATCH',
          icon: <ShieldAlert className="h-3 w-3 text-purple-400" />
        };
      default:
        return { 
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', 
          label: 'UNKNOWN',
          icon: <ShieldAlert className="h-3 w-3 text-slate-400" />
        };
    }
  };

  // Log Clear operations
  const handleClearLogs = async () => {
    if (logs.length === 0) return;
    if (!window.confirm("Do you want to wipe the central audit validation logs from the Firestore database?")) {
      return;
    }

    setClearing(true);
    try {
      const logsSnap = await getDocs(collection(db, 'logs'));
      const batch = writeBatch(db);
      logsSnap.forEach((d) => {
        batch.delete(doc(db, 'logs', d.id));
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'logs');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm" id="live_auditor_wrapper">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 font-bold font-mono">
            &gt;_
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="h-4 w-4 text-lime-400" />
              Live Validation Auditor
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">Tracing authentication streams from active devices</p>
          </div>
        </div>

        <button
          onClick={handleClearLogs}
          disabled={clearing || logs.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-[11px] font-bold font-mono text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-all disabled:opacity-40 cursor-pointer"
          title="Clear Live Audit DB logs"
          id="btn_clear_logs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Purge Logs
        </button>
      </div>

      {/* Terminal Board body */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 font-mono text-xs leading-5">
        <div className="max-h-64 overflow-y-auto space-y-2 pr-2 text-[11px] text-slate-305 text-slate-350">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 italic">
              Awaiting SDK activation inquiries...
              <div className="mt-1 text-[10px] tracking-wide uppercase font-bold text-lime-400 animate-pulse">SYSTEM ONLINE</div>
            </div>
          ) : (
            logs.map((log) => {
              const statusCfg = getStatusColorAndIcon(log.status);
              return (
                <div key={log.id} className="flex flex-col gap-1 border-b border-slate-800/40 pb-2 hover:bg-slate-900/30 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    {/* Timestamp & key info */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono">[{formatTime(log.timestamp)}]</span>
                      <span className="text-lime-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 select-all font-mono text-[10px]">
                        {log.key}
                      </span>
                    </div>

                    {/* Badge Status */}
                    <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase rounded border px-2 py-0.5 ${statusCfg.color}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Core trace parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-slate-400 font-mono">
                    <div className="truncate">
                      <span className="text-slate-500 select-none">pkg: </span>
                      <span className="text-slate-300">{log.packageName}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-500 select-none">hwid: </span>
                      <span className="text-slate-300">{log.hwid}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 select-none">ip: </span>
                      <span className="text-slate-300">{log.ip}</span>
                    </div>
                  </div>

                  {/* Error messages reporting (if failed) */}
                  {log.errorMessage && (
                    <div className="text-[10px] text-red-400 italic pl-2 bg-red-950/10 border-l border-red-500/20 mt-1">
                      err: {log.errorMessage}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

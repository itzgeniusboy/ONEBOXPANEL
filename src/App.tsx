import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, 
  setPersistence, browserLocalPersistence 
} from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { LicenseKey, ValidationLog } from './types';

// Compact Modular Dashboard Imports
import Header from './components/Header';
import KeyGenerator from './components/KeyGenerator';
import KeyRegistry from './components/KeyRegistry';
import LiveAuditor from './components/LiveAuditor';
import ClientEmulator from './components/ClientEmulator';
import IntegrationDocs from './components/IntegrationDocs';

import { Key, ShieldCheck, Database, Smartphone, Play, Terminal, HelpCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [logs, setLogs] = useState<ValidationLog[]>([]);

  // High-usability cross-component helper
  const [targetSimulatorKey, setTargetSimulatorKey] = useState('');

  // 1. Google Authentication Setup with Local Persistence
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        return onAuthStateChanged(auth, (usr) => {
          setUser(usr);
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error("Auth state loading failed:", err);
        setLoading(false);
      });
  }, []);

  // 2. Real-time Firebase Firestore Synchronizers
  useEffect(() => {
    if (!user) {
      setKeys([]);
      setLogs([]);
      return;
    }

    // Standard key listener runs globally so all dashboards fetch in real-time
    const unsubscribeKeys = onSnapshot(
      collection(db, 'keys'),
      (snapshot) => {
        const tempKeys: LicenseKey[] = [];
        snapshot.forEach((docSnap) => {
          tempKeys.push({
            ...(docSnap.data() as LicenseKey),
            key: docSnap.id,
          });
        });

        // Sort newest keys listed at the top
        tempKeys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setKeys(tempKeys);

        // Auto-select latest key for simulator convenience
        if (tempKeys.length > 0 && !targetSimulatorKey) {
          setTargetSimulatorKey(tempKeys[0].key);
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'keys');
        } catch (e) {
          // Graceful handling
        }
      }
    );

    // Logs listener for global live reviews
    const unsubscribeLogs = onSnapshot(
      collection(db, 'logs'),
      (snapshot) => {
        const tempLogs: ValidationLog[] = [];
        snapshot.forEach((docSnap) => {
          tempLogs.push({
            ...(docSnap.data() as ValidationLog),
            id: docSnap.id,
          });
        });

        tempLogs.sort((a, b) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
          return timeB - timeA;
        });

        setLogs(tempLogs.slice(0, 50));
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'logs');
        } catch (e) {
          // Graceful handling
        }
      }
    );

    return () => {
      unsubscribeKeys();
      unsubscribeLogs();
    };
  }, [user]);

  const triggerGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const activeKeysCount = keys.filter((k) => k.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 antialiased font-sans flex flex-col justify-between" id="viewport">
      <div className="flex-1 flex flex-col">
        {/* Platform Header */}
        <Header 
          user={user} 
          loading={loading} 
          totalKeys={keys.length} 
          activeKeys={activeKeysCount} 
        />

        {/* LOADING HANDLER */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center min-h-[50vh]">
            <div className="text-center font-mono">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-lime-400 border-t-transparent mx-auto mb-4" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">LOADING SECURE ENVIRONMENT</h3>
            </div>
          </div>
        ) : !user ? (
          /* AUTHENTICATION GATE */
          <div className="flex flex-1 items-center justify-center min-h-[60vh] px-4">
            <div className="mx-auto max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 space-y-6 shadow-2xl text-center font-mono">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20">
                <Key className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase text-white tracking-wider">Super Authenticator</h3>
                <p className="text-xs text-slate-404 text-slate-400 leading-normal">Authenticate Google developer credentials to unlock Owner administrative capabilities.</p>
              </div>
              <button
                onClick={triggerGoogleLogin}
                className="w-full bg-lime-400 hover:bg-lime-300 font-extrabold text-slate-950 p-2.5 rounded-lg text-xs cursor-pointer transition-all uppercase font-mono"
              >
                Authenticate Admin Console
              </button>
            </div>
          </div>
        ) : (
          /* CORE MAIN VIEWPORT ROUTING */
          <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex-1 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <KeyGenerator 
                  currentUserEmail={user.email || 'unknown'} 
                  onSuccess={() => {}} 
                />
                <ClientEmulator 
                  initialKey={targetSimulatorKey || (keys.length > 0 ? keys[0].key : '')}
                  onValidationSuccess={() => {}} 
                />
              </div>
              <KeyRegistry keys={keys} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LiveAuditor logs={logs} />
                <IntegrationDocs />
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between text-[10px] font-mono text-slate-500 w-full" id="platform_footer">
        <div className="flex space-x-6">
          <span>Session Status: <span className="text-slate-350 text-slate-300 uppercase">{user ? "Active" : "Guest Mode"}</span></span>
          <span>Security Level: <span className="text-lime-400 text-emerald-400 font-bold uppercase">ABAC Guard active</span></span>
          <span>Dynamic DB Sync: <span className="text-teal-400 font-bold">ONLINE</span></span>
        </div>
        <div>© 2026 ONEBOX ENTERPRISES — SECURE DEVELOPMENT SDK</div>
      </footer>
    </div>
  );
}

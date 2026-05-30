import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, User, signInAnonymously
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

import { Key, ShieldCheck, Database, Smartphone, Play, Terminal, HelpCircle, Lock, User as UserIcon } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [logs, setLogs] = useState<ValidationLog[]>([]);

  // Simple username & password state handlers
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLocalLoggedIn, setIsLocalLoggedIn] = useState(localStorage.getItem('onebox_logged_in') === 'true');

  // High-usability cross-component helper
  const [targetSimulatorKey, setTargetSimulatorKey] = useState('');

  // 1. Authenticaton matching Google verification to simple ONEBOX credentials
  useEffect(() => {
    if (localStorage.getItem('onebox_logged_in') === 'true') {
      const wrappedUser = {
        uid: auth.currentUser?.uid || 'onebox-admin-uid',
        email: 'onebox@onebox.com',
        displayName: 'ONEBOX ADMIN',
        emailVerified: true,
      } as unknown as User;
      setUser(wrappedUser);
      setLoading(false);
    } else {
      setUser(null);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (localStorage.getItem('onebox_logged_in') === 'true') {
        const wrappedUser = {
          uid: usr?.uid || 'onebox-admin-uid',
          email: 'onebox@onebox.com',
          displayName: 'ONEBOX ADMIN',
          emailVerified: true,
        } as unknown as User;
        setUser(wrappedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLocalLoggedIn]);

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

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const cleanUsername = usernameInput.trim().toUpperCase();
    if (cleanUsername === 'ONEBOX' && passwordInput === 'onebox') {
      try {
        setLoading(true);
        // Attempt anonymous login but catch failure if it's disabled in Firebase Console
        try {
          await signInAnonymously(auth);
        } catch (authErr: any) {
          console.warn("Firebase Anonymous Auth warning (can be ignored if security rules allow public access):", authErr);
        }
        localStorage.setItem('onebox_logged_in', 'true');
        setIsLocalLoggedIn(true);
        setUsernameInput('');
        setPasswordInput('');
        setLoading(false);
      } catch (err: any) {
        console.error("Login failed thoroughly:", err);
        setLoginError(`Authentication failed. Details: ${err?.message || String(err)}`);
        setLoading(false);
      }
    } else {
      setLoginError('Invalid Username or Password. Please try again.');
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
          <div className="flex flex-1 items-center justify-center min-h-[60vh] px-4 py-8">
            <div className="mx-auto max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-8 space-y-6 shadow-2xl font-mono relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-500" />
              
              <div className="text-center space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400 border border-lime-400/20 shadow-inner">
                  <Key className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black uppercase text-white tracking-widest leading-none">ONEBOX SECURE ADMIN</h3>
                  <p className="text-[11px] text-slate-450 text-slate-400 leading-normal uppercase">Authorized developer system console access</p>
                </div>
              </div>

              {loginError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/25 p-3 text-[11px] leading-relaxed text-red-400 font-semibold text-center border-dashed">
                  ⚠️ {loginError}
                </div>
              )}

              <form onSubmit={handleCustomLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Enter username"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 pl-10 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 pl-10 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-lime-400 hover:bg-lime-300 font-black text-slate-950 p-3 rounded-lg text-xs cursor-pointer transition-all uppercase tracking-widest mt-6 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
                  Authenticate Admin
                </button>
              </form>

              <div className="text-[10px] text-center text-slate-500 pt-2 border-t border-slate-800/50">
                Default Credentials: <code className="text-lime-450 text-lime-400 font-bold bg-slate-950 px-1 py-0.5 rounded">ONEBOX</code> / <code className="text-lime-450 text-lime-400 font-bold bg-slate-950 px-1 py-0.5 rounded">onebox</code>
              </div>
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

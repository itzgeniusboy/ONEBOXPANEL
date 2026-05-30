import React from 'react';
import { Key, LogIn, LogOut, Database, UserCheck, Shield } from 'lucide-react';
import { User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface HeaderProps {
  user: User | null;
  loading: boolean;
  totalKeys: number;
  activeKeys: number;
}

export default function Header({ user, loading, totalKeys, activeKeys }: HeaderProps) {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Signout failed:", err);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/50" id="dashboard_header">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400 text-slate-950 shadow-md">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 leading-tight uppercase font-mono">
                ONEBOX PANEL
                <span className="inline-flex items-center rounded bg-lime-400/10 px-2 py-0.5 text-[10px] font-bold text-lime-400 ring-1 ring-inset ring-lime-400/20">
                  v2.4 Live
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">Device Verification Engine</p>
            </div>
          </div>

          {/* Quick Metrics (visible when authenticated) */}
          {user && (
            <div className="hidden lg:flex items-center space-x-6 text-[11px] font-mono">
              <div className="flex items-center space-x-2 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
                <Database className="h-3.5 w-3.5 text-lime-400" />
                <span className="font-semibold text-slate-500">BACKEND:</span>
                <span className="text-emerald-500 font-bold">CONNECTED</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
                <div className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
                <span className="font-semibold text-slate-500">TOTAL KEYS:</span>
                <span className="text-white font-bold">{totalKeys}</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-500">ACTIVE:</span>
                <span className="text-white font-bold">{activeKeys}</span>
              </div>
            </div>
          )}

          {/* User Section / Login triggers */}
          <div className="flex items-center space-x-3">
            {loading ? (
              <span className="text-xs font-mono text-slate-500">Verifying session...</span>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-lime-400 inline" />
                    {user.displayName || "Administrator"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{user.email}</span>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Admin Avatar"}
                    className="h-8 w-8 rounded-full ring-2 ring-lime-400 ring-offset-2 ring-offset-slate-900 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-lime-400/10 text-lime-400 font-bold flex items-center justify-center ring-2 ring-lime-400">
                    {(user.displayName || "A")[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400 focus:outline-none"
                  title="Logout"
                  id="btn_logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 transition-all cursor-pointer"
                id="btn_login"
              >
                <LogIn className="h-4 w-4" />
                Admin Access
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

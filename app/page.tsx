'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust path if necessary
import GymDashboard from '@/Components/GymDashboard';
import { Lock, Mail, KeyRound, AlertCircle, Loader2 } from 'lucide-react';

export default function MainPage() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check if user is already logged in on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    }
    
    setIsLoggingIn(false);
  };

  // 1. Show loading screen while checking session
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
      </div>
    );
  }

  // 2. Show Gym Dashboard if logged in
  if (session) {
    return <GymDashboard />;
  }

  // 3. Show Login Form if NOT logged in
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-yellow-500 selection:text-black">
      <div className="w-full max-w-md bg-zinc-950 p-8 rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden">
        {/* Top Gold Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>

        <div className="text-center mb-8">
          <div className="mx-auto bg-zinc-900 w-16 h-16 rounded-full flex items-center justify-center border border-yellow-500/30 mb-4 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
            <Lock className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
            Al-Mehran
          </h1>
          <p className="text-zinc-400 text-sm mt-1 uppercase font-semibold tracking-widest">
            Admin Portal
          </p>
        </div>

        {authError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{authError}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email" 
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" 
              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full mt-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-500/50 text-black font-bold uppercase tracking-wider py-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(234,179,8,0.3)] active:scale-95 flex items-center justify-center"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Access System"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Unauthorized access is strictly prohibited.
        </p>
      </div>
    </div>
  );
}
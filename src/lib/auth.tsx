import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthCtx {
  session: Session | null;
  user: User | null;
  displayName: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setDisplayName(''); return; }
    supabase.from('profiles').select('display_name').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? session.user.email?.split('@')[0] ?? ''));
  }, [session?.user.id]);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    displayName,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
    },
    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password, options: { data: { display_name: name.trim() } },
      });
      if (error) throw new Error(error.message);
      return { needsConfirmation: !data.session };
    },
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

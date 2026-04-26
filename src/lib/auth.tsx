import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseReady } from './supabase';
import { identify, reset } from './analytics';
import { clearSentryUser, setSentryUser } from './monitoring';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // Use setTimeout to defer setState to avoid synchronous call in effect
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        identify(data.session.user.id, { email: data.session.user.email });
        setSentryUser(data.session.user.id, data.session.user.email);
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        identify(newSession.user.id, { email: newSession.user.email });
        setSentryUser(newSession.user.id, newSession.user.email);
      } else {
        reset();
        clearSentryUser();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    reset();
    clearSentryUser();
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Internal hook - do not export from this file to avoid fast-refresh issues
const useAuthInternal = () => useContext(AuthContext);

// Re-export through a separate file
export { useAuthInternal as useAuth };
export { supabaseReady };

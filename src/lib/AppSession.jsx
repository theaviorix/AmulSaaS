import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { getSession, onAuthStateChange, getMyProfile } from './supabaseAuth';

const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

// Builds the app-facing session shape (role, profileId, and — for
// customers — their linked supplier's ids) from a Supabase auth user.
async function buildSession(authUser) {
  if (!authUser) return null;
  const { profile, roleProfile } = await getMyProfile(authUser.id);

  const base = {
    userId: authUser.id,
    accountId: authUser.id, // kept for pages still expecting the old field name
    email: authUser.email,
    role: profile.role || null,
    profileId: roleProfile?.id || null,
  };

  if (profile.role === 'customer' && roleProfile) {
    const { data: link } = await supabase
      .from('supplier_links')
      .select('id, supplier_user_id, supplier_profile_id')
      .eq('customer_profile_id', roleProfile.id)
      .maybeSingle();
    if (link) {
      base.linkId = link.id;
      base.supplierUserId = link.supplier_user_id;
      base.supplierProfileId = link.supplier_profile_id;
    }
  }

  return base;
}

export function SessionProvider({ children }) {
  const [session, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const authSession = await getSession();
    const next = await buildSession(authSession?.user || null);
    setSessionState(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const authSession = await getSession();
      const next = await buildSession(authSession?.user || null);
      if (active) {
        setSessionState(next);
        setLoading(false);
      }
    })();

    const unsubscribe = onAuthStateChange(async (authSession) => {
      const next = await buildSession(authSession?.user || null);
      if (active) setSessionState(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, refreshSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

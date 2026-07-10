import { createContext, useContext, useState, useCallback } from 'react';

const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

const STORAGE_KEY = 'amul_connect_session';

function loadSession() {
  try {
    // Prefer a persisted (remember-me) session; fall back to a
    // this-tab-only session.
    const persisted = localStorage.getItem(STORAGE_KEY);
    if (persisted) return JSON.parse(persisted);
    const temp = sessionStorage.getItem(STORAGE_KEY);
    return temp ? JSON.parse(temp) : null;
  } catch {
    return null;
  }
}

export function getStoredSession() {
  return loadSession();
}

export function SessionProvider({ children }) {
  const [session, setSessionState] = useState(loadSession);

  // Accepts either a plain session object, or an updater function (prevSession) => nextSession,
  // and always persists the *resolved* value. Pass `remember: false` in the
  // session object to keep it only for this browser tab/session instead of
  // persisting across restarts.
  const setSession = useCallback((updater) => {
    setSessionState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Always clear both stores first so switching remember-me on/off
      // (or logging out) never leaves a stale copy behind in the other one.
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      if (next) {
        const remember = next.remember !== false;
        (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const updateSession = useCallback((patch) => {
    setSession((prev) => (prev ? { ...prev, ...patch } : prev));
  }, [setSession]);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession, updateSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function generateUserId() {
  return 'sess_' + (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
}
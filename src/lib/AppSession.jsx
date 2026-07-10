import { createContext, useContext, useState, useCallback } from 'react';

const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

const STORAGE_KEY = 'amul_connect_session';

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
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
  // and always persists the *resolved* value to localStorage (never the function itself).
  const setSession = useCallback((updater) => {
    setSessionState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      return next;
    });
  }, []);

  const updateSession = useCallback((patch) => {
    setSession((prev) => (prev ? { ...prev, ...patch } : prev));
  }, [setSession]);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
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
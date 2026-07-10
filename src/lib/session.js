const KEY = "amul_connect_session";

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function isSupplier() {
  const s = getSession();
  return s?.role === "supplier";
}

export function isCustomer() {
  const s = getSession();
  return s?.role === "customer";
}

export function genInviteCode(name) {
  const clean = (name || "SUP").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 5) || "SUP";
  const num = Math.floor(100 + Math.random() * 900);
  return `${clean}-${num}`;
}
// Local, backend-free OTP helper. There's no email/SMS server in this app,
// so a "sent" code is generated here and handed back to the caller to show
// on-screen (clearly labeled as a demo code) instead of actually being
// delivered anywhere. Swap for a real email/SMS provider call later.

const KEY = 'amul_otp_store';
const TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 30 * 1000;

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(all) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// key: a stable identifier for what's being verified, e.g. `email:foo@bar.com`
// or `phone:9876543210`. Returns the generated code (the "demo" delivery).
export function requestOTP(key) {
  const all = readAll();
  const existing = all[key];
  if (existing && Date.now() - existing.createdAt < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.createdAt)) / 1000);
    throw new Error(`Please wait ${waitSec}s before requesting another code.`);
  }
  const code = genCode();
  all[key] = { code, createdAt: Date.now() };
  writeAll(all);
  return code;
}

export function verifyOTP(key, code) {
  const all = readAll();
  const rec = all[key];
  if (!rec) throw new Error('Request a new verification code first.');
  if (Date.now() - rec.createdAt > TTL_MS) {
    delete all[key];
    writeAll(all);
    throw new Error('This code has expired. Request a new one.');
  }
  if (String(code || '').trim() !== rec.code) {
    throw new Error('Incorrect verification code.');
  }
  delete all[key];
  writeAll(all);
  return true;
}

export function clearOTP(key) {
  const all = readAll();
  delete all[key];
  writeAll(all);
}

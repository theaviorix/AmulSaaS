// Local, backend-free email/password accounts — stored via the same
// localStorage-backed `store` used for the rest of the app's data
// (see src/lib/store.js). This is the real, functional login/signup
// layer. Swap for real server calls later when moving to a database.

import { store } from '@/lib/store';

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function simpleHash(str) {
  // NOT cryptographically secure — fine for a local-only demo where the
  // "database" is the user's own browser. Replace with real hashing
  // (bcrypt/argon2) server-side when this moves to a real backend.
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'h_' + hash.toString(36);
}

export const accounts = {
  findByEmail(email) {
    return store.find('accounts', (a) => a.email === normalizeEmail(email)) || null;
  },

  get(id) {
    return store.get('accounts', id);
  },

  register(email, password) {
    const normalized = normalizeEmail(email);
    const pw = (password || '').trim();
    if (!normalized) throw new Error('Email is required');
    if (!pw || pw.length < 6) throw new Error('Password must be at least 6 characters');
    if (this.findByEmail(normalized)) throw new Error('An account with this email already exists');
    return store.create('accounts', {
      email: normalized,
      passwordHash: simpleHash(pw),
      role: null,
      userId: null,
      profileId: null,
      // New accounts must confirm their email via OTP before logging in.
      // (Accounts created before this existed have no explicit flag; those
      // are treated as already verified — see `login()` below — so nobody
      // who already had access gets locked out retroactively.)
      emailVerified: false,
    });
  },

  login(email, password) {
    const account = this.findByEmail(email);
    // Trim the password the same way it's trimmed at registration time, so
    // stray whitespace from autofill/keyboards doesn't cause a false
    // "Invalid email or password" on an otherwise-correct password.
    const pw = (password || '').trim();
    if (!account || account.passwordHash !== simpleHash(pw)) {
      throw new Error('Invalid email or password');
    }
    if (account.emailVerified === false) {
      const err = new Error('Please confirm your email before logging in.');
      err.code = 'EMAIL_NOT_VERIFIED';
      err.accountId = account.id;
      throw err;
    }
    return account;
  },

  markEmailVerified(accountId) {
    return store.update('accounts', accountId, { emailVerified: true });
  },

  // Called once onboarding finishes creating the supplier/customer profile,
  // to permanently link that profile to this login.
  linkProfile(accountId, { role, userId, profileId }) {
    return store.update('accounts', accountId, { role, userId, profileId });
  },

  updatePassword(accountId, newPassword) {
    const pw = (newPassword || '').trim();
    if (!pw || pw.length < 6) throw new Error('Password must be at least 6 characters');
    return store.update('accounts', accountId, { passwordHash: simpleHash(pw) });
  },

  // Local-only "forgot password" — since there's no email server, we
  // generate a short-lived reset code and hand it straight back to the
  // caller to display, instead of emailing it.
  requestPasswordReset(email) {
    const account = this.findByEmail(email);
    if (!account) return null; // caller shows a generic "if this exists" message either way
    const resetCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    store.update('accounts', account.id, { resetCode, resetCodeCreatedAt: new Date().toISOString() });
    return { accountId: account.id, resetCode };
  },

  resetPassword(email, resetCode, newPassword) {
    const account = this.findByEmail(email);
    if (!account || !account.resetCode || account.resetCode !== (resetCode || '').trim().toUpperCase()) {
      throw new Error('Invalid or expired reset code');
    }
    const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
    const issuedAt = account.resetCodeCreatedAt ? new Date(account.resetCodeCreatedAt).getTime() : 0;
    if (!issuedAt || Date.now() - issuedAt > RESET_CODE_TTL_MS) {
      store.update('accounts', account.id, { resetCode: null, resetCodeCreatedAt: null });
      throw new Error('This reset code has expired. Request a new one.');
    }
    if (!newPassword || newPassword.trim().length < 6) throw new Error('Password must be at least 6 characters');
    store.update('accounts', account.id, {
      passwordHash: simpleHash(newPassword.trim()),
      resetCode: null,
      resetCodeCreatedAt: null,
    });
    return true;
  },
};

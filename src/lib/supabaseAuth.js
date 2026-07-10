import { supabase } from './supabaseClient';

// --- Auth actions -----------------------------------------------------

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data; // data.user exists but is unconfirmed until OTP/link is verified
}

// Confirms the 6-digit code Supabase emailed after signUp().
// Requires the "Confirm signup" email template to include {{ .Token }}
// (see setup notes) — otherwise Supabase only sends a clickable link.
export async function verifySignupOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) throw error;
  return data;
}

export async function resendSignupOtp(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Confirms the 6-digit code from the "Reset password" email and logs the
// user into a temporary recovery session, so updatePassword() can be
// called right after. Requires the "Reset Password" email template to
// include {{ .Token }} (same setup as the signup template).
export async function verifyRecoveryOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

// --- Profile lookups ----------------------------------------------------
// A "profile" here is the row in profiles (role) plus the matching
// supplier_profiles/customer_profiles row (business/shop details).

export async function getMyProfile(userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;

  if (!profile.role) return { profile, roleProfile: null };

  const table = profile.role === 'supplier' ? 'supplier_profiles' : 'customer_profiles';
  const { data: roleProfile, error: roleError } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (roleError) throw roleError;

  return { profile, roleProfile };
}

export async function setMyRole(userId, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

import { supabase } from './supabaseClient';

// Supabase (and plain network failures) don't always throw a normal Error
// with a `.message` string — sometimes it's an object whose real text sits
// under `error_description`, `error`, or `msg`, and sometimes `.message`
// exists but isn't enumerable, so naive JSON.stringify(err) renders as "{}".
// This pulls a readable string out of whatever shape comes back.
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err.message && typeof err.message === 'string') return err.message;
  if (err.error_description) return err.error_description;
  if (err.error && typeof err.error === 'string') return err.error;
  if (err.msg) return err.msg;
  // Genuine network failure (e.g. Supabase unreachable, misconfigured URL/key)
  if (err.name === 'TypeError' || /fetch/i.test(String(err))) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return fallback;
}


// --- Auth actions -----------------------------------------------------

export async function signUp(email, password, redirectPath = '/onboarding') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
  });
  if (error) throw error;
  return data; // data.user exists but is unconfirmed until they click the emailed link
}

export async function resendSignupEmail(email, redirectPath = '/onboarding') {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}${redirectPath}` },
  });
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
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
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

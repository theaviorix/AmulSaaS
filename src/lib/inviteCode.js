import { supabase } from './supabaseClient';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomLetter = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

// Generates a candidate invite code from the business name and confirms
// it's actually free in the database (retrying on the rare collision —
// the column also has a UNIQUE constraint as a hard backstop).
export async function generateFreeInviteCode(businessName) {
  const lettersFromName = (businessName || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  for (let attempt = 0; attempt < 10; attempt++) {
    let base = lettersFromName;
    while (base.length < 4) base += randomLetter();
    const suffix = Math.floor(100 + Math.random() * 900);
    const code = `${base}-${suffix}`;
    const { data } = await supabase.from('supplier_profiles').select('id').eq('invite_code', code).maybeSingle();
    if (!data) return code;
  }
  return `SHOP-${Date.now().toString(36).toUpperCase()}`;
}

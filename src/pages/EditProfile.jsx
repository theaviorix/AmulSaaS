import React, { useRef, useState, useEffect } from 'react';
import { useSession } from '@/lib/AppSession';
import { supabase } from '@/lib/supabaseClient';
import { signIn, updatePassword } from '@/lib/supabaseAuth';
import { toast } from '@/components/ui/use-toast';
import { compressImageFile } from '@/lib/exportUtils';
import Avatar from '@/components/Avatar';
import { UserCircle, Store, ShoppingCart, Lock, Loader2, Copy, Camera, Trash2 } from 'lucide-react';

function Field({ label, value, onChange, placeholder, type = 'text', required, readOnly }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink2 mb-1.5 block">
        {label}{required && <span className="text-alert"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full rounded-xl border border-mist px-3.5 py-3 text-ink text-[16px] outline-none transition-colors ${
          readOnly ? 'bg-canvas text-ink2 cursor-not-allowed' : 'bg-surface focus:border-ink'
        }`}
      />
    </label>
  );
}

export default function EditProfile() {
  const { session } = useSession();
  const isSupplier = session?.role === 'supplier';
  const table = isSupplier ? 'supplier_profiles' : 'customer_profiles';

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [form, setForm] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!session?.profileId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.from(table).select('*').eq('id', session.profileId).single();
      if (!active) return;
      if (error) {
        toast({ title: 'Could not load your profile', description: error.message });
        setLoadingProfile(false);
        return;
      }
      setProfile(data);
      setForm(isSupplier
        ? { business_name: data.business_name || '', owner_name: data.owner_name || '', phone: data.phone || '', address: data.address || '', gstin: data.gstin || '' }
        : { shop_name: data.shop_name || '', owner_name: data.owner_name || '', phone: data.phone || '', address: data.address || '' }
      );
      setLoadingProfile(false);
    })();
    return () => { active = false; };
  }, [session?.profileId, table, isSupplier]);

  if (loadingProfile) {
    return <div className="w-8 h-8 border-4 border-mist border-t-ink rounded-full animate-spin" />;
  }
  if (!profile) {
    return <p className="text-sm text-ink2">Profile not found.</p>;
  }

  const displayName = isSupplier ? form.business_name : form.shop_name;

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarUploading(true);
    try {
      const dataUrl = await compressImageFile(file);
      const { error } = await supabase.from(table).update({ avatar: dataUrl }).eq('id', profile.id);
      if (error) throw error;
      setProfile((p) => ({ ...p, avatar: dataUrl }));
      toast({ title: 'Profile photo updated' });
    } catch (err) {
      toast({ title: 'Could not use this photo', description: err.message || 'Try a different image.' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    const { error } = await supabase.from(table).update({ avatar: null }).eq('id', profile.id);
    if (error) {
      toast({ title: 'Could not remove photo', description: error.message });
      return;
    }
    setProfile((p) => ({ ...p, avatar: null }));
    toast({ title: 'Profile photo removed' });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await supabase.from(table).update(form).eq('id', profile.id);
      if (error) throw error;
      setProfile((p) => ({ ...p, ...form }));
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    } catch (err) {
      toast({ title: 'Could not save', description: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.next !== pw.confirm) {
      setPwError('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      // Re-authenticate with the current password first, so this can't be
      // used to change the password without knowing the existing one.
      await signIn(session.email, pw.current);
      await updatePassword(pw.next);
      setPw({ current: '', next: '', confirm: '' });
      toast({ title: 'Password changed', description: 'Use your new password next time you log in.' });
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      setPwError(msg.includes('credentials') || msg.includes('invalid') ? 'Current password is incorrect' : (err.message || 'Failed to change password'));
    } finally {
      setSavingPw(false);
    }
  };

  const copyInviteCode = () => {
    if (!profile.invite_code) return;
    navigator.clipboard?.writeText(profile.invite_code);
    toast({ title: 'Copied', description: 'Invite code copied to clipboard.' });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-jet text-surface grid place-items-center">
          <UserCircle size={22} />
        </span>
        <div>
          <h1 className="font-display font-bold text-ink text-2xl tracking-tight">My Profile</h1>
          <p className="text-sm text-ink2">{session?.email}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-mist bg-surface p-6 shadow-sm flex items-center gap-5">
        <div className="relative w-20 h-20 shrink-0 grow-0">
          <Avatar src={profile.avatar} name={displayName} size="lg" />
          {avatarUploading && (
            <span className="absolute inset-0 rounded-full bg-ink/40 grid place-items-center">
              <Loader2 size={18} className="animate-spin text-surface" />
            </span>
          )}
        </div>
        <div className="space-y-2 min-w-0">
          <p className="text-sm font-medium text-ink">Profile photo</p>
          <p className="text-xs text-ink2">Shown to your {isSupplier ? 'retailers' : 'supplier'} in chat and history.</p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading} className="inline-flex items-center gap-1.5 text-xs font-medium bg-jet text-surface px-3 py-2 rounded-lg hover:bg-ink transition-colors disabled:opacity-50">
              <Camera size={13} /> {profile.avatar ? 'Change photo' : 'Upload photo'}
            </button>
            {profile.avatar && (
              <button type="button" onClick={removeAvatar} className="inline-flex items-center gap-1.5 text-xs font-medium border border-mist text-ink2 px-3 py-2 rounded-lg hover:bg-canvas hover:text-alert transition-colors">
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
        </div>
      </div>

      <form onSubmit={saveProfile} className="rounded-2xl border border-mist bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ink2 mb-1">
          {isSupplier ? <Store size={16} /> : <ShoppingCart size={16} />}
          {isSupplier ? 'Business details' : 'Shop details'}
        </div>

        {isSupplier ? (
          <>
            <Field label="Business name" value={form.business_name} onChange={set('business_name')} required />
            <Field label="Owner name" value={form.owner_name} onChange={set('owner_name')} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" value={form.phone} onChange={set('phone')} />
              <Field label="GSTIN" value={form.gstin} onChange={set('gstin')} />
            </div>
            <Field label="Address" value={form.address} onChange={set('address')} />
            {profile.invite_code && (
              <label className="block">
                <span className="text-xs font-medium text-ink2 mb-1.5 block">Invite code</span>
                <div className="flex gap-2 min-w-0">
                  <input
                    readOnly
                    value={profile.invite_code}
                    className="flex-1 min-w-0 w-full rounded-xl border border-mist bg-canvas px-3.5 py-3 text-ink text-[16px] font-mono truncate"
                  />
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    className="shrink-0 w-11 h-11 self-center grid place-items-center rounded-xl border border-mist text-ink2 hover:bg-canvas transition-colors"
                    aria-label="Copy invite code"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </label>
            )}
          </>
        ) : (
          <>
            <Field label="Shop name" value={form.shop_name} onChange={set('shop_name')} required />
            <Field label="Owner name" value={form.owner_name} onChange={set('owner_name')} />
            <Field label="Phone" value={form.phone} onChange={set('phone')} />
            <Field label="Address" value={form.address} onChange={set('address')} />
          </>
        )}

        <button
          type="submit"
          disabled={savingProfile}
          className="bg-jet text-surface font-medium py-3 px-5 rounded-xl hover:bg-ink transition-colors inline-flex items-center gap-2"
        >
          {savingProfile ? <Loader2 size={16} className="animate-spin" /> : null}
          Save changes
        </button>
      </form>

      <form onSubmit={savePassword} className="rounded-2xl border border-mist bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ink2 mb-1">
          <Lock size={16} /> Change password
        </div>
        <Field
          label="Current password"
          type="password"
          value={pw.current}
          onChange={(v) => setPw((p) => ({ ...p, current: v }))}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="New password"
            type="password"
            value={pw.next}
            onChange={(v) => setPw((p) => ({ ...p, next: v }))}
            required
          />
          <Field
            label="Confirm new password"
            type="password"
            value={pw.confirm}
            onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
            required
          />
        </div>
        {pwError && <p className="text-sm text-alert">{pwError}</p>}
        <button
          type="submit"
          disabled={savingPw}
          className="bg-jet text-surface font-medium py-3 px-5 rounded-xl hover:bg-ink transition-colors inline-flex items-center gap-2"
        >
          {savingPw ? <Loader2 size={16} className="animate-spin" /> : null}
          Update password
        </button>
      </form>
    </div>
  );
}

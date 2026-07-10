import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ShoppingCart, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useSession } from '@/lib/AppSession';
import { supabase } from '@/lib/supabaseClient';
import { setMyRole } from '@/lib/supabaseAuth';
import Logo from '@/components/Logo';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randomLetter = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

function Field({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink2 mb-1.5 block">{label}{required && <span className="text-alert"> *</span>}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-mist bg-surface px-3.5 py-3 text-ink text-[16px] outline-none focus:border-ink transition-colors"
      />
    </label>
  );
}

// Generates a candidate invite code from the business name and confirms
// it's actually free in the database (retrying on the rare collision —
// the column also has a UNIQUE constraint as a hard backstop).
async function generateFreeInviteCode(businessName) {
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

export default function Onboarding() {
  const navigate = useNavigate();
  const { session, refreshSession } = useSession();
  const [role, setRole] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ business_name: '', shop_name: '', owner_name: '', phone: '', address: '', gstin: '', invite_code: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  if (!session) {
    return (
      <div className="min-h-screen bg-canvas grid place-items-center px-5">
        <div className="text-center max-w-sm">
          <p className="text-ink2">You need to be logged in to finish setting up your account.</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-medium text-ink underline">Go to login</Link>
        </div>
      </div>
    );
  }

  const startSupplier = () => setRole('supplier');
  const startCustomer = () => { setRole('customer'); setStep(1); };

  const submitSupplier = async () => {
    if (!form.business_name.trim()) { setError('Business name is required'); return; }
    setError('');
    setSaving(true);
    try {
      const inviteCode = await generateFreeInviteCode(form.business_name);
      const { data: profile, error: insertError } = await supabase
        .from('supplier_profiles')
        .insert({
          user_id: session.userId,
          business_name: form.business_name.trim(),
          owner_name: form.owner_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          gstin: form.gstin.trim(),
          invite_code: inviteCode,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const samples = [
        { name: 'Amul Gold Milk', unit: '1 L', price: 64 },
        { name: 'Amul Gold Milk', unit: '500 ml', price: 27 },
        { name: 'Amul Taaza', unit: '500 ml', price: 25 },
        { name: 'Amul Butter', unit: '100 g', price: 56 },
        { name: 'Amul Cheese', unit: '200 g', price: 130 },
        { name: 'Amul Ghee', unit: '500 ml', price: 240 },
        { name: 'Amul Curd', unit: '500 g', price: 35 },
      ];
      await supabase.from('products').insert(samples.map((p) => ({ supplier_user_id: session.userId, ...p, active: true })));

      await setMyRole(session.userId, 'supplier');
      await refreshSession();
      navigate('/supplier');
    } catch (err) {
      setError(err.message || 'Something went wrong setting up your business. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitCustomerProfile = () => {
    if (!form.shop_name?.trim()) { setError('Shop name is required'); return; }
    setError('');
    setStep(2);
  };

  const linkSupplier = async () => {
    const code = (form.invite_code || '').trim().toUpperCase();
    if (!code) { setError("Enter your supplier's invite code"); return; }
    setError('');
    setSaving(true);
    try {
      const { data: sup, error: findError } = await supabase
        .from('supplier_profiles')
        .select('id, user_id')
        .eq('invite_code', code)
        .maybeSingle();
      if (findError) throw findError;
      if (!sup) { setError('Invalid invite code. Check with your supplier.'); setSaving(false); return; }

      const shopName = (form.shop_name || '').trim() || 'Shop';
      const { data: cprof, error: profileError } = await supabase
        .from('customer_profiles')
        .insert({
          user_id: session.userId,
          shop_name: shopName,
          owner_name: form.owner_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        })
        .select()
        .single();
      if (profileError) throw profileError;

      const { error: linkError } = await supabase.from('supplier_links').insert({
        customer_user_id: session.userId,
        customer_profile_id: cprof.id,
        customer_name: shopName,
        supplier_user_id: sup.user_id,
        supplier_profile_id: sup.id,
        status: 'active',
      });
      if (linkError) throw linkError;

      await supabase.from('notifications').insert({
        user_id: sup.user_id,
        type: 'link_request',
        text: `${shopName} joined your network.`,
        link: '/supplier/customers',
      });

      await setMyRole(session.userId, 'customer');
      await refreshSession();
      navigate('/customer/new-order');
    } catch (err) {
      setError(err.message || 'Something went wrong linking to your supplier. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-5 h-16 flex items-center justify-between max-w-6xl mx-auto">
        <Logo />
        <Link to="/" className="text-sm text-ink2 hover:text-ink inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Back to site</Link>
      </div>

      <div className="max-w-md mx-auto px-5 py-8">
        {!role && (
          <RoleChooser onSupplier={startSupplier} onCustomer={startCustomer} />
        )}
        {role === 'supplier' && (
          <Card title="Set up your distributor business" step="Step 1 of 1">
            <div className="space-y-4">
              <Field label="Business name" value={form.business_name} onChange={set('business_name')} placeholder="e.g. Sharma Dairy Distributors" required />
              <Field label="Owner name" value={form.owner_name} onChange={set('owner_name')} placeholder="Your name" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="98xxxxxxxx" />
                <Field label="GSTIN" value={form.gstin} onChange={set('gstin')} placeholder="Optional" />
              </div>
              <Field label="Address" value={form.address} onChange={set('address')} placeholder="Godown / warehouse address" />
              {error && <p className="text-sm text-alert">{error}</p>}
              <button onClick={submitSupplier} disabled={saving} className="w-full bg-jet text-surface font-medium py-3.5 rounded-xl hover:bg-ink transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null} Continue {!saving && <ArrowRight size={16} />}
              </button>
            </div>
          </Card>
        )}
        {role === 'customer' && step === 1 && (
          <Card title="Set up your shop" step="Step 1 of 2">
            <div className="space-y-4">
              <Field label="Shop name" value={form.shop_name} onChange={set('shop_name')} placeholder="e.g. FreshMart Kirana" required />
              <Field label="Owner name" value={form.owner_name} onChange={set('owner_name')} placeholder="Your name" />
              <Field label="Phone" value={form.phone} onChange={set('phone')} placeholder="98xxxxxxxx" />
              <Field label="Address" value={form.address} onChange={set('address')} placeholder="Shop address" />
              {error && <p className="text-sm text-alert">{error}</p>}
              <button onClick={submitCustomerProfile} className="w-full bg-jet text-surface font-medium py-3.5 rounded-xl hover:bg-ink transition-colors">Next</button>
            </div>
          </Card>
        )}
        {role === 'customer' && step === 2 && (
          <Card title="Link to your supplier" step="Step 2 of 2">
            <p className="text-sm text-ink2 mb-4">Your supplier shared an invite code with you (looks like <span className="font-mono text-ink">SHARMA-482</span>). Enter it below.</p>
            <div className="space-y-4">
              <Field label="Invite code" value={form.invite_code} onChange={set('invite_code')} placeholder="SHARMA-482" required />
              {error && <p className="text-sm text-alert">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="px-4 py-3.5 rounded-xl border border-mist text-ink font-medium hover:bg-canvas transition-colors">Back</button>
                <button onClick={linkSupplier} disabled={saving} className="flex-1 bg-jet text-surface font-medium py-3.5 rounded-xl hover:bg-ink transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null} {!saving && <>Connect & start <ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function RoleChooser({ onSupplier, onCustomer }) {
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-ink text-3xl tracking-tight">How will you use Amul Connect?</h1>
        <p className="mt-3 text-ink2">Choose your side to get started.</p>
      </div>
      <div className="grid gap-3">
        <RoleCard onClick={onSupplier} icon={Store} title="I'm a Supplier" subtitle="Distribute to retailers · manage orders & billing" cta="Get started" />
        <RoleCard onClick={onCustomer} icon={ShoppingCart} title="I'm a Retailer" subtitle="Order from your distributor · track & pay bills" cta="Get started" />
      </div>
    </>
  );
}

function RoleCard({ onClick, icon: Icon, title, subtitle, cta }) {
  return (
    <button onClick={onClick} className="group text-left rounded-2xl border border-mist bg-surface p-6 hover:border-ink2/30 hover:shadow-lg transition-all">
      <span className="w-12 h-12 rounded-xl bg-jet text-surface grid place-items-center"><Icon size={22} /></span>
      <h3 className="mt-4 font-display font-semibold text-ink text-lg">{title}</h3>
      <p className="mt-1 text-sm text-ink2">{subtitle}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink">{cta} <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></span>
    </button>
  );
}

function Card({ title, step, children }) {
  return (
    <>
      <div className="mb-6">
        <span className="text-xs font-mono uppercase tracking-widest text-ink2">{step}</span>
        <h1 className="mt-1 font-display font-bold text-ink text-2xl tracking-tight">{title}</h1>
      </div>
      <div className="rounded-2xl border border-mist bg-surface p-6 shadow-sm">{children}</div>
    </>
  );
}

import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Store, ShoppingCart, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useSession, generateUserId } from '@/lib/AppSession';
import { store, genInviteCode, isPhoneTaken } from '@/lib/store';
import { accounts } from '@/lib/accounts';
import { notify } from '@/lib/notify';
import { requestOTP, verifyOTP } from '@/lib/otp';
import Logo from '@/components/Logo';

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

// Inline phone OTP verification, shown in place of the details form once a
// code has been "sent" (simulated locally — there's no SMS provider here).
function PhoneOtpStep({ phone, demoCode, onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const verify = () => {
    setError('');
    setVerifying(true);
    try {
      verifyOTP(`phone:${phone}`, code);
      onVerified();
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const resend = () => {
    setError('');
    try {
      requestOTP(`phone:${phone}`);
      setResendMsg('A new code was generated.');
      setTimeout(() => setResendMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card title="Verify your phone number" step="One more step">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <strong>Demo mode:</strong> no SMS provider is connected yet, so here's your code for {phone}: <span className="font-mono font-semibold">{demoCode}</span>
        </div>
        {resendMsg && <p className="text-sm text-emerald-700">{resendMsg}</p>}
        <Field label="6-digit code" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="123456" required />
        {error && <p className="text-sm text-alert">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onBack} className="px-4 py-3.5 rounded-xl border border-mist text-ink font-medium hover:bg-canvas transition-colors">Back</button>
          <button
            onClick={verify}
            disabled={verifying || code.length !== 6}
            className="flex-1 bg-jet text-surface font-medium py-3.5 rounded-xl hover:bg-ink transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {verifying ? <Loader2 size={16} className="animate-spin" /> : null}
            Verify & continue
          </button>
        </div>
        <button onClick={resend} className="w-full text-center text-sm text-ink2 hover:text-ink hover:underline">Resend code</button>
      </div>
    </Card>
  );
}

export default function Onboarding() {
  const [params] = useSearchParams();
  const roleParam = params.get('role');
  const accountId = params.get('accountId');
  const account = accountId ? accounts.get(accountId) : null;
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [role, setRole] = useState(roleParam === 'supplier' || roleParam === 'customer' ? roleParam : null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ business_name: '', shop_name: '', owner_name: '', phone: '', address: '', gstin: '', invite_code: '' });
  const [error, setError] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneDemoCode, setPhoneDemoCode] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState(''); // last phone number that passed OTP
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const pendingRef = React.useRef(() => {});

  const startSupplier = () => { setRole('supplier'); };
  const startCustomer = () => { setRole('customer'); setStep(1); };

  // Shared gate before either role's details can proceed: block duplicate
  // phone numbers, and require a fresh OTP check for any new phone number.
  const requirePhoneVerification = (onPassed) => {
    const phone = form.phone.trim();
    if (!phone) { onPassed(); return; } // phone is optional — nothing to verify
    if (isPhoneTaken(phone)) {
      setError('This phone number is already registered to another account.');
      return;
    }
    if (verifiedPhone === phone) { onPassed(); return; } // already verified this exact number
    setError('');
    pendingRef.current = onPassed;
    const code = requestOTP(`phone:${phone}`);
    setPhoneDemoCode(code);
    setVerifyingPhone(true);
  };

  const submitSupplier = () => {
    if (!form.business_name.trim()) { setError('Business name is required'); return; }
    requirePhoneVerification(finalizeSupplier);
  };

  const finalizeSupplier = () => {
    setVerifiedPhone(form.phone.trim());
    setVerifyingPhone(false);
    const userId = generateUserId();
    const code = genInviteCode(form.business_name);
    const profile = store.create('supplier_profiles', {
      user_id: userId,
      business_name: form.business_name.trim(),
      owner_name: form.owner_name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      gstin: form.gstin.trim(),
      invite_code: code,
    });
    const samples = [
      { name: 'Amul Gold Milk', unit: '1 L', price: 64 },
      { name: 'Amul Gold Milk', unit: '500 ml', price: 27 },
      { name: 'Amul Taaza', unit: '500 ml', price: 25 },
      { name: 'Amul Butter', unit: '100 g', price: 56 },
      { name: 'Amul Cheese', unit: '200 g', price: 130 },
      { name: 'Amul Ghee', unit: '500 ml', price: 240 },
      { name: 'Amul Curd', unit: '500 g', price: 35 },
    ];
    samples.forEach((p) => store.create('products', { supplier_user_id: userId, ...p, active: true, in_stock: true }));
    if (account) accounts.linkProfile(account.id, { role: 'supplier', userId, profileId: profile.id });
    setSession({ accountId: account?.id, email: account?.email, role: 'supplier', userId, profileId: profile.id });
    navigate('/supplier');
  };

  const submitCustomerProfile = () => {
    if (!form.shop_name?.trim()) { setError('Shop name is required'); return; }
    const goToStep2 = () => { setVerifiedPhone(form.phone.trim()); setVerifyingPhone(false); setStep(2); setError(''); };
    requirePhoneVerification(goToStep2);
  };

  const linkSupplier = () => {
    const code = (form.invite_code || '').trim().toUpperCase();
    if (!code) { setError('Enter your supplier\'s invite code'); return; }
    const sup = store.find('supplier_profiles', (s) => s.invite_code.toUpperCase() === code);
    if (!sup) { setError('Invalid invite code. Check with your supplier.'); return; }
    const shopName = (form.shop_name || '').trim() || 'Shop';
    const userId = generateUserId();
    const cprof = store.create('customer_profiles', {
      user_id: userId,
      shop_name: shopName,
      owner_name: form.owner_name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    });
    const link = store.create('supplier_links', {
      customer_user_id: userId,
      customer_profile_id: cprof.id,
      customer_name: shopName,
      supplier_user_id: sup.user_id,
      supplier_profile_id: sup.id,
      status: 'active',
      invite_code: code,
    });
    notify(sup.user_id, 'link_request', `${shopName} joined your network.`, '/supplier/customers');
    if (account) accounts.linkProfile(account.id, { role: 'customer', userId, profileId: cprof.id });
    setSession({ accountId: account?.id, email: account?.email, role: 'customer', userId, profileId: cprof.id, linkId: link.id, supplierUserId: sup.user_id, supplierProfileId: sup.id });
    navigate('/customer/new-order');
  };

  if (verifyingPhone) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="px-5 h-16 flex items-center justify-between max-w-6xl mx-auto">
          <Logo />
          <Link to="/" className="text-sm text-ink2 hover:text-ink inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Back to site</Link>
        </div>
        <div className="max-w-md mx-auto px-5 py-8">
          <PhoneOtpStep
            phone={form.phone.trim()}
            demoCode={phoneDemoCode}
            onBack={() => setVerifyingPhone(false)}
            onVerified={() => pendingRef.current?.()}
          />
        </div>
      </div>
    );
  }

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
              <button onClick={submitSupplier} className="w-full bg-jet text-surface font-medium py-3.5 rounded-xl hover:bg-ink transition-colors inline-flex items-center justify-center gap-2">
                Continue <ArrowRight size={16} />
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
                <button onClick={linkSupplier} className="flex-1 bg-jet text-surface font-medium py-3.5 rounded-xl hover:bg-ink transition-colors inline-flex items-center justify-center gap-2">
                  Connect & start <ArrowRight size={16} />
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

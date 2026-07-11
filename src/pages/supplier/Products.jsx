import React, { useState, useEffect, useCallback } from 'react';
import { Boxes, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useSession } from '@/lib/AppSession';
import { supabase } from '@/lib/supabaseClient';
import { getErrorMessage } from '@/lib/supabaseAuth';
import { toast } from '@/components/ui/use-toast';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import SearchInput from '@/components/SearchInput';

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink2 mb-1.5 block">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-mist bg-surface px-3.5 py-3 text-ink text-[16px] outline-none focus:border-ink transition-colors" />
    </label>
  );
}

function Toggle({ on, onClick, onLabel, offLabel, tone = 'ink' }) {
  const onCls = tone === 'ok' ? 'bg-ok text-surface' : tone === 'alert' ? 'bg-alert text-surface' : 'bg-jet text-surface';
  return (
    <button onClick={onClick} className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${on ? onCls : 'bg-canvas text-ink2'}`}>
      {on ? onLabel : offLabel}
    </button>
  );
}

export default function SupplierProducts() {
  const { session } = useSession();
  const uid = session.userId;

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const products = q.trim() ? all.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())) : all;

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', unit: '', price: '' });
  const [editPrice, setEditPrice] = useState({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('supplier_user_id', uid)
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load products', description: getErrorMessage(error) });
    } else {
      setAll(data || []);
    }
    setLoading(false);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const addProduct = async () => {
    if (!draft.name.trim() || !draft.unit.trim() || !draft.price) return;
    setSaving(true);
    const { error } = await supabase.from('products').insert({
      supplier_user_id: uid,
      name: draft.name.trim(),
      unit: draft.unit.trim(),
      price: Number(draft.price),
      active: true,
      in_stock: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Could not add product', description: getErrorMessage(error) });
      return;
    }
    setDraft({ name: '', unit: '', price: '' });
    load();
  };

  const updateProduct = async (id, patch) => {
    // Optimistic update so toggles/price edits feel instant.
    setAll((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) {
      toast({ title: 'Could not save change', description: getErrorMessage(error) });
      load(); // revert to real state
    }
  };

  const savePrice = (id) => {
    const val = Number(editPrice[id]);
    if (val && val > 0) updateProduct(id, { price: val });
    setEditPrice((e) => { const c = { ...e }; delete c[id]; return c; });
  };

  const removeProduct = async (id) => {
    setAll((cur) => cur.filter((p) => p.id !== id));
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not delete product', description: getErrorMessage(error) });
      load();
    }
  };

  if (loading) {
    return <div className="w-8 h-8 border-4 border-mist border-t-ink rounded-full animate-spin" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Price list" sub="Manage products, rates and stock. Changes apply to future orders only." action={
        <div className="flex flex-wrap gap-2 items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search products..." />
          <button onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1.5 bg-jet text-surface text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-ink transition-colors">
            <Plus size={16} /> Add product
          </button>
        </div>
      } />

      {adding && (
        <div className="rounded-2xl border border-mist bg-surface p-4 grid sm:grid-cols-[1fr_120px_140px_auto] gap-3 items-end">
          <Input label="Product name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="Amul Gold Milk" />
          <Input label="Unit" value={draft.unit} onChange={(v) => setDraft((d) => ({ ...d, unit: v }))} placeholder="1 L" />
          <Input label="Price (₹)" type="number" value={draft.price} onChange={(v) => setDraft((d) => ({ ...d, price: v }))} placeholder="64" />
          <button onClick={addProduct} disabled={saving} className="bg-jet text-surface font-medium px-5 py-3 rounded-xl h-[50px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
          </button>
        </div>
      )}

      {products.length === 0 && !adding ? (
        q.trim() ? (
          <EmptyState icon={Boxes} title="No matches" hint="No products match your search." />
        ) : (
          <EmptyState icon={Boxes} title="No products yet" hint="Add your first product to build your live price list." action={<button onClick={() => setAdding(true)} className="text-sm font-medium bg-jet text-surface px-4 py-2 rounded-lg">Add product</button>} />
        )
      ) : (
        <div className="rounded-2xl border border-mist bg-surface overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_120px_150px_auto] gap-3 px-4 py-2.5 text-xs uppercase tracking-wider text-ink2 bg-canvas/40 border-b border-mist px-4">
            <span>Product</span><span>Unit</span><span>Status</span><span>Actions</span>
          </div>
          <div className="divide-y divide-mist/50">
            {products.map((p) => (
              <div key={p.id} className="grid sm:grid-cols-[1fr_120px_150px_auto] gap-3 px-4 py-3 items-center">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{p.name}</p>
                  <p className="text-xs text-ink2 sm:hidden">{p.unit}</p>
                </div>
                <span className="text-ink2 text-sm hidden sm:block">{p.unit}</span>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Toggle on={p.active} onClick={() => updateProduct(p.id, { active: !p.active })} onLabel="Listed" offLabel="Hidden" />
                  <Toggle on={p.in_stock} onClick={() => updateProduct(p.id, { in_stock: !p.in_stock })} onLabel="In stock" offLabel="Out" tone={p.in_stock ? 'ok' : 'alert'} />
                  <span className="inline-flex items-center gap-1">
                    <span className="text-ink2 text-sm">₹</span>
                    {editPrice[p.id] !== undefined ? (
                      <input type="number" value={editPrice[p.id]} onChange={(e) => setEditPrice((s) => ({ ...s, [p.id]: e.target.value }))} onBlur={() => savePrice(p.id)} onKeyDown={(e) => e.key === 'Enter' && savePrice(p.id)} autoFocus className="w-16 border border-mist rounded-md px-1.5 py-0.5 text-ink font-mono text-sm outline-none focus:border-ink" />
                    ) : (
                      <button onClick={() => setEditPrice((s) => ({ ...s, [p.id]: String(p.price) }))} className="font-mono text-ink text-sm hover:bg-canvas px-1.5 py-0.5 rounded inline-flex items-center gap-1">{p.price} <Pencil size={12} className="text-ink2" /></button>
                    )}
                  </span>
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => removeProduct(p.id)} className="text-ink2 hover:text-alert p-1.5 rounded-lg hover:bg-canvas"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

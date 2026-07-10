import { useEffect, useState } from "react";
import { ShoppingBag, Hourglass, Check, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/dashboard/PageHeader";
import EmptyState from "@/components/EmptyState";
import QuantityStepper from "@/components/QuantityStepper";
import { links, products, orders } from "@/lib/api";
import { getSession } from "@/lib/session";
import { rs, slotLabel } from "@/lib/format";

export default function CustomerShop() {
  const session = getSession();
  const navigate = useNavigate();
  const myLink = links.listByCustomer(session.id).find((l) => l.supplier_id === session.supplierId);
  const linked = myLink?.status === "active";

  const [prodList, setProdList] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [slot, setSlot] = useState("AM");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (linked) setProdList(products.list(session.supplierId).filter((p) => p.active));
    // load pending cart (reorder)
    const pending = localStorage.getItem("amul_pending_cart");
    if (pending) {
      try {
        const items = JSON.parse(pending);
        const q = {};
        items.forEach((it) => { q[it.product_name] = it.quantity; });
        setQuantities(q);
        localStorage.removeItem("amul_pending_cart");
      } catch {}
    }
  }, [linked]);

  const orderable = prodList.filter((p) => p.in_stock);
  const cart = orderable
    .map((p) => ({ product_name: p.name, unit: p.unit, price: p.price, quantity: quantities[p.name] || 0 }))
    .filter((it) => it.quantity > 0);
  const total = cart.reduce((s, it) => s + it.quantity * it.price, 0);

  const place = () => {
    if (cart.length === 0) return;
    setPlacing(true);
    orders.create({
      supplier_id: session.supplierId,
      customer_id: session.id,
      customer_name: session.name,
      slot,
      items: cart,
      total,
    });
    setQuantities({});
    setTimeout(() => navigate("/customer/orders"), 400);
  };

  if (!linked) {
    return (
      <div>
        <PageHeader title="Shop" />
        <EmptyState icon={Hourglass} title="Not connected yet" body="You'll see the live price list here once your supplier approves your connect request." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Shop — New Order" subtitle="Add quantities, pick your delivery round and place the order." right={
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          <button onClick={() => setSlot("AM")} className={`rounded-lg px-3 py-2 text-sm font-600 ${slot === "AM" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Morning</button>
          <button onClick={() => setSlot("PM")} className={`rounded-lg px-3 py-2 text-sm font-600 ${slot === "PM" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Evening</button>
        </div>
      } />

      {orderable.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No products to order" body="Your supplier hasn't listed any in-stock products yet. Check back shortly." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            {prodList.map((p) => {
              const qty = quantities[p.name] || 0;
              const disabled = !p.in_stock;
              return (
                <div key={p.id} className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm ${disabled ? "opacity-50" : ""}`}>
                  <div>
                    <p className="text-sm font-600">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{rs(p.price)} / {p.unit} {disabled && "· out of stock"}</p>
                  </div>
                  {disabled ? (
                    <span className="rounded-full bg-[hsl(var(--destructive))]/12 px-3 py-1.5 text-[11px] font-600 text-[hsl(var(--destructive))]">Unorderable</span>
                  ) : (
                    <QuantityStepper value={qty} min={0} step={0.5} onChange={(v) => setQuantities({ ...quantities, [p.name]: v })} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Cart summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2"><ShoppingCart size={18} /><h3 className="font-display text-base font-600">Your cart</h3></div>
              <p className="mt-1 text-xs text-muted-foreground">{slotLabel(slot)} delivery round</p>
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Add quantities to build your order.</p>
              ) : (
                <>
                  <div className="mt-4 space-y-2">
                    {cart.map((it) => (
                      <div key={it.product_name} className="flex items-center justify-between text-sm">
                        <span>{it.product_name}<span className="ml-1 text-xs text-muted-foreground">×{it.quantity}</span></span>
                        <span className="font-mono-tight font-600">{rs(it.quantity * it.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-600">Total</span>
                    <span className="font-mono-tight text-lg font-700">{rs(total)}</span>
                  </div>
                </>
              )}
              <button
                onClick={place}
                disabled={cart.length === 0 || placing}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-600 text-primary-foreground disabled:opacity-40"
              >
                {placing ? <><Check size={16} /> Placing…</> : <><ShoppingBag size={16} /> Place order</>}
              </button>
              {cart.length > 0 && (
                <button onClick={() => setQuantities({})} className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-[hsl(var(--destructive))]"><Trash2 size={13} /> Clear cart</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
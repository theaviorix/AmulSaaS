import { Link } from "react-router-dom";
import { useState } from "react";
import { Wallet, ClipboardList, ShoppingBag, RotateCcw, ArrowRight, Hourglass } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { links, orders, bills, products } from "@/lib/api";
import { getSession } from "@/lib/session";
import { rs, timeAgo, slotLabel } from "@/lib/format";

export default function CustomerDashboard() {
  const session = getSession();
  const myLink = links.listByCustomer(session.id).find((l) => l.supplier_id === session.supplierId);
  const linked = myLink?.status === "active";
  const myOrders = orders.listByCustomer(session.id);
  const myBills = bills.listByCustomer(session.id);
  const outstanding = myBills.reduce((s, b) => s + (b.total - b.paid_amount), 0);
  const lastOrder = myOrders[0];

  if (!linked) {
    return (
      <div>
        <PageHeader title="Welcome to Amul Connect" subtitle="You're almost ready to order." />
        <EmptyState icon={Hourglass} title="Awaiting supplier approval" body={`Your connect request to ${myLink?.invite_code ? "your supplier" : ""} is pending approval. You'll be able to browse the price list and place orders once the supplier approves your link.`} />
      </div>
    );
  }

  const reorder = () => {
    if (!lastOrder) return;
    const cart = (lastOrder.items || []).map((it) => ({ ...it }));
    localStorage.setItem("amul_pending_cart", JSON.stringify(cart));
  };

  return (
    <div>
      <PageHeader title={`Hello, ${session.name?.split(" ")[0] || "there"}`} subtitle="Your orders, balance and quick actions." right={
        <Link to="/customer/shop" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-600 text-primary-foreground"><ShoppingBag size={16} /> New order</Link>
      } />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding balance" value={rs(outstanding)} icon={Wallet} tone="destructive" />
        <StatCard label="Total orders" value={myOrders.length} icon={ClipboardList} />
        <StatCard label="Open bills" value={myBills.filter((b) => b.total - b.paid_amount > 0).length} icon={Wallet} tone="amber" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-600">Recent orders</h2>
            <Link to="/customer/orders" className="text-xs font-600 text-primary hover:underline">View all</Link>
          </div>
          {myOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No orders yet — place your first one.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {myOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-[hsl(var(--background))]/50 px-4 py-3">
                  <div><p className="text-sm font-600">{o.items?.length} items</p><p className="text-xs text-muted-foreground">{slotLabel(o.slot)} round · {timeAgo(o.created_date)}</p></div>
                  <div className="flex items-center gap-3"><span className="font-mono-tight text-sm font-600">{rs(o.total)}</span><StatusBadge status={o.status} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {lastOrder && (
            <Link onClick={reorder} to="/customer/shop" className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5">
              <RotateCcw size={20} className="text-[hsl(var(--amber))]" />
              <p className="mt-3 font-display text-sm font-600">Reorder your last cart</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{lastOrder.items?.length} items selected <ArrowRight size={13} /></p>
            </Link>
          )}
          <Link to="/customer/bills" className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5">
            <Wallet size={20} className="text-[hsl(var(--destructive))]" />
            <p className="mt-3 font-display text-sm font-600">Bills & balance</p>
            <p className="mt-1 text-xs text-muted-foreground">{rs(outstanding)} to pay</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
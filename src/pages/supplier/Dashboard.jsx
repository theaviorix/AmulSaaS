import { Link } from "react-router-dom";
import { Package, Users, ClipboardList, Wallet, Copy, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { products, links, orders, bills } from "@/lib/api";
import { getSession } from "@/lib/session";
import { rs, timeAgo, slotLabel } from "@/lib/format";

export default function SupplierDashboard() {
  const session = getSession();
  const [copied, setCopied] = useState(false);
  const prods = products.list(session.id);
  const allLinks = links.listBySupplier(session.id);
  const pendingLinks = allLinks.filter((l) => l.status === "pending");
  const activeCustomers = allLinks.filter((l) => l.status === "active");
  const allOrders = orders.listBySupplier(session.id);
  const newOrders = allOrders.filter((o) => o.status === "placed");
  const allBills = bills.listBySupplier(session.id);
  const outstanding = allBills.reduce((s, b) => s + (b.total - b.paid_amount), 0);

  const copyCode = () => {
    navigator.clipboard?.writeText(session.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader title={`Welcome back, ${session.name?.split(" ")[0] || "Distributor"}`} subtitle="Here's what needs your attention today." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New orders" value={newOrders.length} sub="Awaiting accept / reject" icon={ClipboardList} tone="amber" />
        <StatCard label="Connect requests" value={pendingLinks.length} sub={`${activeCustomers.length} active customers`} icon={Users} />
        <StatCard label="Outstanding balance" value={rs(outstanding)} sub={`${allBills.length} bills open`} icon={Wallet} tone="destructive" />
        <StatCard label="Price list" value={prods.length} sub={`${prods.filter((p) => p.in_stock).length} in stock`} icon={Package} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-600">Recent orders</h2>
            <Link to="/supplier/orders" className="text-xs font-600 text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-4 space-y-2">
            {allOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No orders yet. Share your invite code to onboard retailers.</p>
            ) : (
              allOrders.slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-[hsl(var(--background))]/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-600">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.items?.length || 0} items · {slotLabel(o.slot)} round · {timeAgo(o.created_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tight text-sm font-600">{rs(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">Your invite code</p>
            <button onClick={copyCode} className="mt-3 flex w-full items-center justify-between rounded-xl border border-border bg-[hsl(var(--background))] px-4 py-3.5">
              <span className="font-mono-tight text-xl font-700 tracking-wider text-[hsl(var(--amber))]">{session.inviteCode}</span>
              {copied ? <Check size={18} className="text-[hsl(var(--success))]" /> : <Copy size={18} className="text-muted-foreground" />}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">Share this code — retailers connect for free.</p>
          </div>

          {pendingLinks.length > 0 && (
            <Link to="/supplier/customers" className="block rounded-2xl border border-[hsl(var(--amber))]/30 bg-[hsl(var(--amber))]/8 p-5">
              <p className="font-display text-sm font-700 text-[hsl(var(--amber))]">{pendingLinks.length} connect request{pendingLinks.length > 1 ? "s" : ""} pending</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">Review and approve <ArrowRight size={13} /></p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
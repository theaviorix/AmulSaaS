import { useState } from "react";
import { ScrollText, Printer } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import EmptyState from "@/components/EmptyState";
import { links, bills, suppliers } from "@/lib/api";
import { getSession } from "@/lib/session";
import { rs, dateLabel, daysSince } from "@/lib/format";

export default function SupplierStatement() {
  const session = getSession();
  const supplier = suppliers.get(session.id);
  const activeLinks = links.listBySupplier(session.id).filter((l) => l.status === "active");
  const [custId, setCustId] = useState(activeLinks[0]?.customer_id || "");
  const billList = custId ? bills.listBySupplier(session.id).filter((b) => b.customer_id === custId) : [];
  const customer = activeLinks.find((l) => l.customer_id === custId);
  const outstanding = billList.reduce((s, b) => s + (b.total - b.paid_amount), 0);
  const totalBilled = billList.reduce((s, b) => s + b.total, 0);

  return (
    <div>
      <PageHeader title="Customer Statements" subtitle="Per-customer ledger — print or share the account summary." right={
        customer && <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-600"><Printer size={16} /> Print</button>
      } />

      {activeLinks.length === 0 ? (
        <EmptyState icon={ScrollText} title="No active customers" body="Statements appear once a customer is connected and billed." />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">Customer</label>
            <select value={custId} onChange={(e) => setCustId(e.target.value)} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary">
              {activeLinks.map((l) => <option key={l.customer_id} value={l.customer_id}>{l.customer_name}</option>)}
            </select>
          </div>

          {customer && (
            <div className="print:block">
              {/* Statement header (print friendly) */}
              <div className="mb-5 rounded-2xl border border-border bg-card p-6 shadow-sm print:shadow-none">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">Statement from</p>
                    <p className="font-display text-lg font-700">{supplier?.name}</p>
                    {supplier?.phone && <p className="text-sm text-muted-foreground">{supplier.phone}</p>}
                    {supplier?.gstin && <p className="text-xs text-muted-foreground">GSTIN: {supplier.gstin}</p>}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">Billed to</p>
                    <p className="font-display text-lg font-700">{customer.customer_name}</p>
                    <p className="text-xs text-muted-foreground">As of {dateLabel(new Date().toISOString())}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[hsl(var(--background))] p-4"><p className="text-xs text-muted-foreground">Total billed</p><p className="mt-1 font-mono-tight text-lg font-700">{rs(totalBilled)}</p></div>
                  <div className="rounded-xl bg-[hsl(var(--background))] p-4"><p className="text-xs text-muted-foreground">Total paid</p><p className="mt-1 font-mono-tight text-lg font-700">{rs(totalBilled - outstanding)}</p></div>
                  <div className="rounded-xl bg-[hsl(var(--destructive))]/8 p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="mt-1 font-mono-tight text-lg font-700 text-[hsl(var(--destructive))]">{rs(outstanding)}</p></div>
                </div>
              </div>

              {billList.length === 0 ? (
                <EmptyState icon={ScrollText} title="No bills yet for this customer" />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm print:shadow-none">
                  <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] gap-3 border-b border-border px-5 py-3 text-[11px] font-600 uppercase tracking-wide text-muted-foreground sm:grid">
                    <span>Date</span><span>Bill total</span><span>Paid</span><span>Due</span><span>Age</span>
                  </div>
                  {billList.map((b) => {
                    const due = b.total - b.paid_amount;
                    return (
                      <div key={b.id} className="grid grid-cols-2 gap-3 border-b border-border/60 px-5 py-3.5 text-sm last:border-0 sm:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] sm:items-center">
                        <span className="font-600 sm:font-500">{dateLabel(b.created_date)}</span>
                        <span className="font-mono-tight">{rs(b.total)}</span>
                        <span className="font-mono-tight text-muted-foreground">{rs(b.paid_amount)}</span>
                        <span className={`font-mono-tight font-600 ${due > 0 ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--success))]"}`}>{rs(due)}</span>
                        <span className="text-xs text-muted-foreground">{daysSince(b.created_date)}d</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
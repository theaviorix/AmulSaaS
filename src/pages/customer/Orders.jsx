import { useState } from "react";
import { ClipboardList, RotateCcw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/dashboard/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { orders } from "@/lib/api";
import { getSession } from "@/lib/session";
import { rs, slotLabel, timeAgo, dateLabel } from "@/lib/format";

const FLOW = ["placed", "accepted", "dispatched", "billed"];

function Tracking({ status, rejected }) {
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--destructive))]/8 px-3 py-2.5 text-sm text-[hsl(var(--destructive))]">
        <AlertCircle size={16} /> Order rejected
      </div>
    );
  }
  const idx = FLOW.indexOf(status);
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {FLOW.map((s, i) => {
        const done = i <= idx;
        return (
          <div key={s} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-700 ${done ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"}`}>{i + 1}</span>
            <span className={`text-xs font-600 capitalize ${done ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
            {i < FLOW.length - 1 && <span className={`h-px w-5 ${done && i < idx ? "bg-primary" : "bg-border"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerOrders() {
  const session = getSession();
  const navigate = useNavigate();
  const [list, setList] = useState(orders.listByCustomer(session.id));
  const [expanded, setExpanded] = useState(null);

  const reorder = (o) => {
    localStorage.setItem("amul_pending_cart", JSON.stringify(o.items || []));
    navigate("/customer/shop");
  };

  return (
    <div>
      <PageHeader title="My Orders" subtitle="Track every order in real time. Reorder your last cart in one tap." />
      {list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet" body="Head to Shop to place your first order." />
      ) : (
        <div className="space-y-3">
          {list.map((o) => {
            const open = expanded === o.id;
            return (
              <div key={o.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <button onClick={() => setExpanded(open ? null : o.id)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-600">{slotLabel(o.slot)} round</p>
                      {o.adjusted && <span className="rounded-full bg-[hsl(var(--amber))]/12 px-2 py-0.5 text-[10px] font-600 text-[hsl(var(--amber))]">adjusted by supplier</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{o.items?.length} items · {timeAgo(o.created_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tight text-sm font-700">{rs(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border px-5 py-4">
                    <Tracking status={o.status} />
                    {o.rejection_reason && <p className="mt-2 text-sm text-[hsl(var(--destructive))]">{o.rejection_reason}</p>}
                    <div className="mt-4 space-y-2">
                      {(o.items || []).map((it, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-[hsl(var(--background))]/50 px-3 py-2.5">
                          <div><p className="text-sm font-500">{it.product_name}</p><p className="text-xs text-muted-foreground">{rs(it.price)} / {it.unit}</p></div>
                          <div className="flex items-center gap-4"><span className="text-xs text-muted-foreground">×{it.quantity}</span><span className="font-mono-tight text-sm font-600">{rs(it.quantity * it.price)}</span></div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm font-600">Billed on {dateLabel(o.created_date)}</span>
                      <button onClick={() => reorder(o)} className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2.5 text-sm font-600 text-primary hover:bg-primary hover:text-primary-foreground"><RotateCcw size={14} /> Reorder</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
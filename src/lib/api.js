// Lightweight data-access layer (localStorage-backed) for the MVP demo.
// API-compatible surface so it can be swapped to base44.entities.* later.

const KEYS = {
  suppliers: "amul_suppliers",
  customers: "amul_customers",
  products: "amul_products",
  links: "amul_links",
  orders: "amul_orders",
  bills: "amul_bills",
  notifications: "amul_notifications",
};

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function uid() {
  return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}
function now() {
  return new Date().toISOString();
}
function withMeta(record) {
  return { id: uid(), created_date: now(), updated_date: now(), ...record };
}

/* ---------- Suppliers ---------- */
export const suppliers = {
  create(data) {
    const all = load(KEYS.suppliers);
    const rec = withMeta(data);
    all.push(rec);
    save(KEYS.suppliers, all);
    return rec;
  },
  get(id) {
    return load(KEYS.suppliers).find((s) => s.id === id) || null;
  },
  getByInviteCode(code) {
    return load(KEYS.suppliers).find((s) => s.invite_code === code) || null;
  },
  update(id, data) {
    const all = load(KEYS.suppliers);
    const i = all.findIndex((s) => s.id === id);
    if (i === -1) return null;
    all[i] = { ...all[i], ...data, updated_date: now() };
    save(KEYS.suppliers, all);
    return all[i];
  },
};

/* ---------- Customers ---------- */
export const customers = {
  create(data) {
    const all = load(KEYS.customers);
    const rec = withMeta(data);
    all.push(rec);
    save(KEYS.customers, all);
    return rec;
  },
  get(id) {
    return load(KEYS.customers).find((c) => c.id === id) || null;
  },
  listBySupplier(supplierId) {
    return load(KEYS.customers).filter((c) => c.supplier_id === supplierId);
  },
  update(id, data) {
    const all = load(KEYS.customers);
    const i = all.findIndex((c) => c.id === id);
    if (i === -1) return null;
    all[i] = { ...all[i], ...data, updated_date: now() };
    save(KEYS.customers, all);
    return all[i];
  },
};

/* ---------- Links ---------- */
export const links = {
  create(data) {
    const all = load(KEYS.links);
    const rec = withMeta(data);
    all.push(rec);
    save(KEYS.links, all);
    return rec;
  },
  request({ inviteCode, customer, supplier }) {
    const rec = this.create({
      supplier_id: supplier.id,
      customer_id: customer.id,
      customer_name: customer.name,
      status: "pending",
      invite_code: inviteCode,
    });
    notifications.add({
      target_id: supplier.id,
      target_type: "supplier",
      type: "link_request",
      text: `${customer.name} requested to connect using your code ${inviteCode}`,
    });
    return rec;
  },
  listBySupplier(supplierId) {
    return load(KEYS.links).filter((l) => l.supplier_id === supplierId);
  },
  listByCustomer(customerId) {
    return load(KEYS.links).filter((l) => l.customer_id === customerId);
  },
  act(linkId, status) {
    const all = load(KEYS.links);
    const i = all.findIndex((l) => l.id === linkId);
    if (i === -1) return null;
    all[i] = { ...all[i], status, updated_date: now() };
    save(KEYS.links, all);
    notifications.add({
      target_id: all[i].customer_id,
      target_type: "customer",
      type: "link_update",
      text:
        status === "active"
          ? "Your connect request was approved. You can now place orders."
          : "Your connect request was declined by the supplier.",
    });
    return all[i];
  },
};

/* ---------- Products ---------- */
export const products = {
  list(supplierId) {
    return load(KEYS.products).filter((p) => p.supplier_id === supplierId);
  },
  create(data) {
    const all = load(KEYS.products);
    const rec = withMeta(data);
    all.push(rec);
    save(KEYS.products, all);
    return rec;
  },
  update(id, data) {
    const all = load(KEYS.products);
    const i = all.findIndex((p) => p.id === id);
    if (i === -1) return null;
    all[i] = { ...all[i], ...data, updated_date: now() };
    save(KEYS.products, all);
    return all[i];
  },
  remove(id) {
    const all = load(KEYS.products).filter((p) => p.id !== id);
    save(KEYS.products, all);
  },
};

/* ---------- Orders ---------- */
export const orders = {
  listBySupplier(supplierId) {
    return load(KEYS.orders)
      .filter((o) => o.supplier_id === supplierId)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  },
  listByCustomer(customerId) {
    return load(KEYS.orders)
      .filter((o) => o.customer_id === customerId)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  },
  get(id) {
    return load(KEYS.orders).find((o) => o.id === id) || null;
  },
  create(data) {
    const all = load(KEYS.orders);
    const rec = withMeta({ status: "placed", adjusted: false, total: 0, items: [], ...data });
    all.push(rec);
    save(KEYS.orders, all);
    notifications.add({
      target_id: rec.supplier_id,
      target_type: "supplier",
      type: "new_order",
      text: `New ${rec.slot} order placed by ${rec.customer_name}`,
    });
    return rec;
  },
  update(id, data) {
    const all = load(KEYS.orders);
    const i = all.findIndex((o) => o.id === id);
    if (i === -1) return null;
    const prev = all[i];
    all[i] = { ...all[i], ...data, updated_date: now() };
    save(KEYS.orders, all);
    const next = all[i];
    if (prev.status !== next.status) {
      const labels = {
        accepted: "Your order has been accepted by the supplier",
        rejected: `Your order was rejected: ${next.rejection_reason || "no reason given"}`,
        dispatched: "Your order has been dispatched 🚚",
        billed: "A bill has been generated for your order",
      };
      if (labels[next.status]) {
        notifications.add({
          target_id: next.customer_id,
          target_type: "customer",
          type: "order_" + next.status,
          text: labels[next.status]
            .replace(next.rejection_reason || "no reason given", next.rejection_reason || "no reason given")
            .replace("🚚", "🚚"),
        });
      }
    }
    return next;
  },
  reject(id, reason) {
    notifications.add({
      target_id: this.get(id)?.customer_id,
      target_type: "customer",
      type: "order_rejected",
      text: `Your order was rejected: ${reason}`,
    });
    return this.update(id, { status: "rejected", rejection_reason: reason });
  },
  setDispatched(id) {
    return this.update(id, { status: "dispatched" });
  },
};

/* ---------- Bills ---------- */
export const bills = {
  listBySupplier(supplierId) {
    return load(KEYS.bills)
      .filter((b) => b.supplier_id === supplierId)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  },
  listByCustomer(customerId) {
    return load(KEYS.bills)
      .filter((b) => b.customer_id === customerId)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  },
  createForOrder(order) {
    const all = load(KEYS.bills);
    const exists = all.find((b) => b.order_id === order.id);
    if (exists) return exists;
    const rec = withMeta({
      supplier_id: order.supplier_id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      order_id: order.id,
      total: order.total,
      paid_amount: 0,
    });
    all.push(rec);
    save(KEYS.bills, all);
    notifications.add({
      target_id: order.customer_id,
      target_type: "customer",
      type: "bill_created",
      text: `A bill of ₹${order.total} has been generated for your order`,
    });
    return rec;
  },
  recordPayment(billId, amount, supplierId) {
    const all = load(KEYS.bills);
    const i = all.findIndex((b) => b.id === billId);
    if (i === -1) return null;
    all[i] = {
      ...all[i],
      paid_amount: Math.round((all[i].paid_amount + amount) * 100) / 100,
      updated_date: now(),
    };
    save(KEYS.bills, all);
    notifications.add({
      target_id: all[i].customer_id,
      target_type: "customer",
      type: "payment_recorded",
      text: `Payment of ₹${amount} recorded against your bill`,
    });
    return all[i];
  },
};

/* ---------- Notifications ---------- */
export const notifications = {
  list(targetId, type) {
    return load(KEYS.notifications)
      .filter((n) => n.target_id === targetId && n.target_type === type)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  },
  add(data) {
    const all = load(KEYS.notifications);
    const rec = withMeta({ read: false, type: "generic", ...data });
    all.push(rec);
    save(KEYS.notifications, all);
    return rec;
  },
  markAllRead(targetId, type) {
    const all = load(KEYS.notifications);
    const updated = all.map((n) =>
      n.target_id === targetId && n.target_type === type ? { ...n, read: true } : n
    );
    save(KEYS.notifications, updated);
  },
};

export const utils = { uid, now };
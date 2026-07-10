import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Boxes, Users, Wallet, ShoppingCart, Package, LogOut, Menu, X, MessageCircle, Table2 } from 'lucide-react';
import { useSession } from '@/lib/AppSession';
import { useStore } from '@/lib/useStore';
import { store } from '@/lib/store';
import { checkAndFireReminder } from '@/lib/orderReminder';
import NotificationBell from '@/components/NotificationBell';
import Avatar from '@/components/Avatar';
import Logo from '@/components/Logo';

const NAV = {
  supplier: [
    { to: '/supplier', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/supplier/orders', label: 'Orders', icon: ClipboardList },
    { to: '/supplier/products', label: 'Products', icon: Boxes },
    { to: '/supplier/customers', label: 'Customers', icon: Users },
    { to: '/supplier/billing', label: 'Billing', icon: Wallet },
    { to: '/supplier/bill-sheet', label: 'Bill Sheet', icon: Table2 },
    { to: '/supplier/messages', label: 'Messages', icon: MessageCircle },
  ],
  customer: [
    { to: '/customer/new-order', label: 'New Order', icon: ShoppingCart },
    { to: '/customer/orders', label: 'My Orders', icon: Package },
    { to: '/customer/bills', label: 'Bills', icon: Wallet },
    { to: '/customer/messages', label: 'Messages', icon: MessageCircle },
  ],
};

function Sidebar({ nav, exit, unreadMessages, avatar, displayName }) {
  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-jet text-surface' : 'text-ink2 hover:bg-canvas hover:text-ink'}`}>
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            {item.label === 'Messages' && unreadMessages > 0 && (
              <span className="w-5 h-5 rounded-full bg-alert text-surface text-[10px] font-bold grid place-items-center shrink-0">{unreadMessages}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-mist space-y-1">
        <NavLink to="/profile" className={({ isActive }) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-jet text-surface' : 'text-ink2 hover:bg-canvas hover:text-ink'}`}>
          <Avatar src={avatar} name={displayName} size="xs" />
          My Profile
        </NavLink>
        <button onClick={exit} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink2 hover:bg-canvas hover:text-ink transition-colors">
          <LogOut size={18} /> Log out
        </button>
      </div>
    </>
  );
}

export default function AppShell() {
  const { session, clearSession } = useSession();
  const liveStore = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  let avatar = null;
  let displayName = '';
  let unreadMessages = 0;
  if (session?.role === 'supplier') {
    const profile = liveStore.find('supplier_profiles', (s) => s.id === session.profileId);
    avatar = profile?.avatar;
    displayName = profile?.business_name;
    unreadMessages = liveStore.filter('messages', (m) => m.supplier_user_id === session.userId && m.sender === 'customer' && !m.read_by_supplier).length;
  } else if (session?.role === 'customer') {
    const profile = liveStore.find('customer_profiles', (c) => c.id === session.profileId);
    avatar = profile?.avatar;
    displayName = profile?.shop_name;
    unreadMessages = liveStore.filter('messages', (m) => m.customer_user_id === session.userId && m.sender === 'supplier' && !m.read_by_customer).length;
  }

  // Client-side order reminder: while a retailer has the app open, check
  // every 30s whether their saved reminder time has passed for today.
  // (This only fires while the tab is open — there's no push/background
  // notification without a real backend.)
  useEffect(() => {
    if (!session || session.role !== 'customer' || !session.profileId) return;
    const check = () => {
      const profile = store.get('customer_profiles', session.profileId);
      if (profile) checkAndFireReminder(profile, session.userId);
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [session]);

  if (!session) return <Navigate to="/onboarding" replace />;
  const isProfileArea = location.pathname.startsWith('/profile');
  const isSupplierArea = location.pathname.startsWith('/supplier');
  if (!isProfileArea && session.role === 'customer' && isSupplierArea) return <Navigate to="/customer/new-order" replace />;
  if (!isProfileArea && session.role === 'supplier' && !isSupplierArea) return <Navigate to="/supplier" replace />;
  const nav = NAV[session.role] || [];
  const roleLabel = session.role === 'supplier' ? 'Supplier' : 'Retailer';
  const exit = () => { clearSession(); navigate('/'); };

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-surface border-r border-mist flex-col">
        <div className="h-16 flex items-center px-5 border-b border-mist"><Logo /></div>
        <Sidebar nav={nav} exit={exit} unreadMessages={unreadMessages} avatar={avatar} displayName={displayName} />
      </aside>

      <div className="lg:hidden sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-mist h-14 flex items-center justify-between px-4">
        <button onClick={() => setDrawer(true)} className="p-2 -ml-2 text-ink"><Menu size={22} /></button>
        <Logo compact />
        <div className="w-9" />
      </div>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-mist">
              <Logo compact />
              <button onClick={() => setDrawer(false)} className="p-2"><X size={20} /></button>
            </div>
            <Sidebar nav={nav} exit={exit} unreadMessages={unreadMessages} avatar={avatar} displayName={displayName} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="hidden lg:flex h-16 items-center justify-between px-6 bg-surface/60 backdrop-blur border-b border-mist">
          <span className="text-xs font-mono uppercase tracking-widest text-ink2">{roleLabel} workspace</span>
          <NotificationBell />
        </header>
        <div className="lg:hidden flex items-center justify-end px-4 py-2"><NotificationBell /></div>
        <main className="p-4 sm:p-6 max-w-6xl mx-auto w-full"><Outlet /></main>
      </div>
    </div>
  );
}
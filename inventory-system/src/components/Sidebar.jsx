import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Icons = {
  Chevron: ({ open }) => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M19 9l-7 7-7-7"></path>
    </svg>
  ),
  Toggle: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7"></path></svg>,
  Admin: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-1.116-1.116A10.001 10.001 0 0110 21m-2-2a10.001 10.001 0 01-1-1m1-1a10.001 10.001 0 01-1-1m1-1a10.001 10.001 0 01-1-1m1-1a10.001 10.001 0 01-1-1m1-1a10.001 10.001 0 01-1-1"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  InventoryHead: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>,
  Category: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>,
  Item: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 12V8a2 2 0 00-2-2H6a2 2 0 00-2 2v4-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>,
  Supplier: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>,
  Uom: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18M7 6v12M11 6v12M15 6v12"></path></svg>,
  Make: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"></path></svg>,
  Spec: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>,
  Globe: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path></svg>,
  Map: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>,
  Store: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Dept: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path></svg>,
  Process: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>,
  Indent: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Price: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>,
  Order: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"></path></svg>,
  GRN: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  Issue: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  Logout: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  Shield: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
};

const TRANSACTIONS = [
  { path: "/purchase-indent", label: "Purchase Indent", icon: Icons.Indent },
  { path: "/item-price-list", label: "Item Price List", icon: Icons.Price },
  { path: "/purchase-order", label: "Purchase Order", icon: Icons.Order },
  { path: "/purchase-grn", label: "Purchase GRN", icon: Icons.GRN },
  { path: "/consumption-issue", label: "Consumption Issue", icon: Icons.Issue },
];

const MASTERS = [
  { path: "/inv-head", label: "Inventory Head", icon: Icons.InventoryHead },
  { path: "/main-cat", label: "Main Category", icon: Icons.Category },
  { path: "/item", label: "Item", icon: Icons.Item },
  { path: "/supplier", label: "Supplier", icon: Icons.Supplier },
  { path: "/uom", label: "UOM", icon: Icons.Uom },
  { path: "/make", label: "Make", icon: Icons.Make },
  { path: "/spec", label: "Spec Name", icon: Icons.Spec },
  { path: "/country", label: "Country", icon: Icons.Globe },
  { path: "/state", label: "State", icon: Icons.Map },
  { path: "/city", label: "City", icon: Icons.Map },
  { path: "/store", label: "Store Master", icon: Icons.Store },
  { path: "/department", label: "Department Master", icon: Icons.Dept },
  { path: "/process", label: "Process Master", icon: Icons.Process },
];


const ADMIN = [
  { path: "/admin/users", label: "User Management", icon: Icons.Admin },
  { path: "/admin/permissions", label: "Access Control", icon: Icons.Shield },
];

function NavGroup({ label, items, navigate, pathname, onHover, onLeave }) {
  const isAnyActive = items.some((i) => pathname === i.path);

  return (
    <div className="inv-nav-section" style={{ marginBottom: '24px' }}>
      <div className="inv-section-label">{label}</div>
      <div className="inv-nav-grid">
        {items.map((item) => (
          <button
            key={item.path}
            className={`inv-nav-item ${pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
            onMouseEnter={(e) => onHover(e, item.label)}
            onMouseLeave={onLeave}
          >
            <item.icon />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e, label) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
    setHoveredLabel(label);
  };

  useEffect(() => {
    const fetchPerms = async () => {
      try {
        const res = await fetch('/api/permissions');
        const data = await res.json();
        setPermissions(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPerms();
  }, []);

  const hasAccess = (path) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perm = permissions.find(p => p.roleName === user.role && p.resourcePath === path);
    return perm ? perm.canAccess : false;
  };

  const filteredMasters = MASTERS.filter(m => hasAccess(m.path));
  const filteredTransactions = TRANSACTIONS.filter(t => hasAccess(t.path));
  const filteredAdmin = ADMIN.filter(a => hasAccess(a.path));

  return (
    <aside className="inv-sidebar no-scrollbar">
      <div className="inv-logo" style={{ cursor: 'pointer', padding: '32px 0', border: 'none' }} onClick={() => navigate('/')}>
        <img src="/honc-logo.png" alt="HONC" style={{ width: '50px', height: '50px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} />
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
        {filteredAdmin.length > 0 && (
          <NavGroup label="Admin" items={filteredAdmin} navigate={navigate} pathname={pathname} onHover={handleMouseEnter} onLeave={() => setHoveredLabel(null)} />
        )}
        {filteredTransactions.length > 0 && (
          <NavGroup label="Transactions" items={filteredTransactions} navigate={navigate} pathname={pathname} onHover={handleMouseEnter} onLeave={() => setHoveredLabel(null)} />
        )}
        {filteredMasters.length > 0 && (
          <NavGroup label="Masters" items={filteredMasters} navigate={navigate} pathname={pathname} onHover={handleMouseEnter} onLeave={() => setHoveredLabel(null)} />
        )}
      </div>

      {/* ... footer ... */}


      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div className="inv-nav-item" data-tooltip={`${user?.username} (${user?.role})`}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b6ef8, #10b981)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 4px 12px rgba(59, 110, 248, 0.3)' }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="inv-nav-item"
          onMouseEnter={(e) => handleMouseEnter(e, "Logout")}
          onMouseLeave={() => setHoveredLabel(null)}
          style={{ color: '#ef4444' }}
        >
          <Icons.Logout />
        </button>
      </div>

      {hoveredLabel && (
        <div style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: 'translateY(-50%)',
          background: '#3b6ef8',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 10px 15px -3px rgba(59, 110, 248, 0.4)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            border: '6px solid transparent',
            borderRightColor: '#3b6ef8',
          }} />
          {hoveredLabel}
        </div>
      )}
    </aside>
  );
}



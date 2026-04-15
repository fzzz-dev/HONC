import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const MASTERS = [
  { path: "/inv-head", label: "Inventory head" },
  { path: "/main-cat", label: "Main category" },
  { path: "/item", label: "Item" },
  { path: "/supplier", label: "Supplier" },
  { path: "/uom", label: "UOM" },
  { path: "/make", label: "Make" },
  { path: "/spec", label: "Spec name" },
  { path: "/country", label: "Country" },
  { path: "/state", label: "State" },
  { path: "/city", label: "City" },
  { path: "/store", label: "Store master" },
  { path: "/department", label: "Department master" },
  { path: "/process", label: "Process master" },
];

const TRANSACTIONS = [
  { path: "/purchase-indent", label: "Purchase indent" },
  { path: "/item-price-list", label: "Item price list" },
  { path: "/purchase-order", label: "Purchase order" },
  { path: "/purchase-grn", label: "Purchase GRN" },
  { path: "/consumption-issue", label: "Consumption issue" },
];

function DotIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <path d="M5 3v10M1 7h14" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        marginLeft: "auto",
        transition: "transform 0.2s",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
      }}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function NavGroup({ label, items, icon: Icon, navigate, pathname }) {
  const isAnyActive = items.some((i) => pathname === i.path);
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div className="inv-nav-section">
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "7px 14px",
          color: open ? "#c8d0e0" : "#8892a4",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          transition: "color 0.15s",
        }}
      >
        {label}
        <ChevronIcon open={open} />
      </button>
      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? `${items.length * 36}px` : "0px",
          transition: "max-height 0.25s ease",
        }}
      >
        {items.map((item) => (
          <button
            key={item.path}
            className={`inv-nav-item ${pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <Icon />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="inv-sidebar">
      <div className="inv-logo">
        <div className="inv-logo-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 18 18"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
          >
            <rect x="1" y="4" width="16" height="12" rx="2" />
            <path d="M5 4V3a2 2 0 014 0v1M9 4V3a2 2 0 014 0v1" />
          </svg>
        </div>
        <div>
          <div className="inv-logo-name">Inventory</div>
          <div className="inv-logo-sub">Management System</div>
        </div>
      </div>

      <NavGroup
        label="Masters"
        items={MASTERS}
        icon={DotIcon}
        navigate={navigate}
        pathname={pathname}
      />
      <NavGroup
        label="Transactions"
        items={TRANSACTIONS}
        icon={DocIcon}
        navigate={navigate}
        pathname={pathname}
      />
    </aside>
  );
}

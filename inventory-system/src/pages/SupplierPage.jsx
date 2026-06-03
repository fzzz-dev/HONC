import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCountries } from "../slices/countrySlice";
import { fetchStates } from "../slices/stateSlice";
import { fetchCities } from "../slices/citySlice";
import Modal from "../components/Modal";
import {
  Field,
  Input,
  Select,
  Toggle,
  FormGrid,
  Textarea,
} from "../components/FormFields";
import { mainCategoryApi, paymentTermsApi } from "../services/inventoryApi";

const PINCODE_RE = /^\d{6}$/;

// ─── API BASE ──────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "/api";

async function apiFetch(path, options = {}) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        const message = json.errors?.length
          ? json.errors.join("\n")
          : json.message || "Request failed";
        throw new Error(message);
      }
      return json;
    } catch (error) {
      lastError = error;
      const isNetworkError = error instanceof TypeError;
      if (!isNetworkError || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  if (lastError instanceof TypeError) {
    throw new Error(
      "Backend is not reachable yet. Please wait a moment and try again.",
    );
  }

  throw lastError;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
// Always returns a real array regardless of what the API sends back
function toArray(val) {
  if (Array.isArray(val)) return val;
  if (val == null) return [];
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

// ─── API helpers ───────────────────────────────────────────────────────────────
const suppliersAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/suppliers${qs ? `?${qs}` : ""}`);
  },
  get: (id) => apiFetch(`/suppliers/${id}`),
  create: (body) =>
    apiFetch("/suppliers", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    apiFetch(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/suppliers/${id}`, { method: "DELETE" }),
  downloadTemplate: async () => {
    const res = await fetch(`${API}/suppliers/template`);
    if (!res.ok) throw new Error("Failed to download template");
    return res.blob();
  },
  bulkUpload: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/suppliers/bulk`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Bulk upload failed");
    return data;
  }
};

export const typesAPI = {
  list: () => apiFetch("/supplier-types"),
  create: (name) =>
    apiFetch("/supplier-types", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  update: (id, name) =>
    apiFetch(`/supplier-types/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  delete: (id) => apiFetch(`/supplier-types/${id}`, { method: "DELETE" }),
};

// ─── Constants ─────────────────────────────────────────────────────────────────
export const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  address: "",
  pinCode: "",
  cityId: "",
  cityName: "",
  stateId: "",
  stateName: "",
  countryId: "",
  countryName: "",
  note: "",
  isPrimary: false,
};

export const EMPTY_FORM = {
  supplierName: "",
  shortCode: "",
  type: "",
  active: true,
  gstType: "local",
  addresses: [],
  gstNo: "",
  panNo: "",
  emailId1: "",
  emailId2: "",
  mobileNo1: "",
  mobileNo2: "",
  paymentTermsId: "",
  purchaseCategoryIds: [],
};

// ─── Sub-components ────────────────────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        margin: "16px 0 10px",
        paddingBottom: 6,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}

export const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const StarIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ─── Normalize legacy address (single `address` text) into line1 / line2 ───────
export function normalizeAddrForForm(addr) {
  const base = { ...EMPTY_ADDRESS, ...addr };
  if (base.line1) return base;
  const raw = String(base.address || "").trim();
  if (!raw) return base;
  const comma = raw.indexOf(",");
  if (comma === -1) {
    return { ...base, line1: raw, line2: "" };
  }
  return {
    ...base,
    line1: raw.slice(0, comma).trim(),
    line2: raw.slice(comma + 1).trim(),
  };
}

// ─── Address editor (embedded in page — no overlay) ───────────────────────────
export function AddressFormPage({ address, onSave, onCancel, countries = [], states = [], cities = [], addressNumber }) {
  const [form, setForm] = useState(address);
  useEffect(() => {
    setForm(address);
  }, [address]);

  const countryOptions = countries.map((c) => ({ value: String(c.id || c._id), label: c.name }));
  const stateOptions = states.map((s) => ({ value: String(s.id || s._id), label: s.name }));

  // Show ALL cities regardless of state - no filtering
  const cityOptions = cities.map((c) => ({ 
    value: String(c.id || c._id), 
    label: c.name 
  }));

  function handleCountryChange(val) {
    const found = countries.find((x) => String(x.id || x._id) === String(val));
    setForm({ ...form, countryId: val, countryName: found?.name || "", stateId: "", stateName: "", cityId: "", cityName: "" });
  }
  function handleStateChange(val) {
    const found = states.find((x) => String(x.id || x._id) === String(val));
    setForm({ ...form, stateId: val, stateName: found?.name || "", cityId: "", cityName: "" });
  }
  function handleCityChange(val) {
  const found = cities.find((x) => String(x.id || x._id) === String(val));
  // Also update state based on selected city
  const foundState = states.find((s) => {
    const stateId = found?.stateId?.id || found?.stateId?._id || found?.stateId;
    return String(s.id || s._id) === String(stateId);
  });
  
  setForm({ 
    ...form, 
    cityId: val, 
    cityName: found?.name || "",
    stateId: foundState?.id || foundState?._id || form.stateId,
    stateName: foundState?.name || form.stateName
  });
}

  function handleSubmit() {
    const line1 = String(form.line1 ?? "").trim();
    const line2 = String(form.line2 ?? "").trim();
    if (!line1) return alert("Address line 1 is required");
    const pin = String(form.pinCode ?? "").trim();
    if (pin && !PINCODE_RE.test(pin)) return alert("Pincode must be exactly 6 digits");
    if (!form.countryId) return alert("Country is required");
    if (!form.stateId) return alert("State is required");
    if (!form.cityId) return alert("City is required");
    const combined = [line1, line2].filter(Boolean).join(", ");
    onSave({ ...form, line1, line2, address: combined });
  }

  return (
    <div style={{ border: "1px solid var(--border-mid)", borderRadius: 10, background: "#fafbfc", marginTop: 12 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {addressNumber ? `Edit address ${addressNumber}` : "Add address"}
        </span>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button type="button" className="inv-btn-primary inv-save-btn" onClick={handleSubmit}>Save address</button>
          <button type="button" className="inv-btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <FormGrid>
          <Field label="Add 1" required>
            <Input value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} placeholder="Address line 1" />
          </Field>
          <Field label="Add 2">
            <Input value={form.line2} onChange={(v) => setForm({ ...form, line2: v })} placeholder="Address line 2" />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Pincode">
            <Input value={form.pinCode} onChange={(v) => setForm({ ...form, pinCode: v })} placeholder="6 digits" maxLength={6} />
          </Field>
          <Field label="Country" required>
            <Select value={form.countryId} onChange={handleCountryChange} options={countryOptions} placeholder="Select country…" />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="State" required>
            <Select value={form.stateId} onChange={handleStateChange} options={stateOptions} placeholder={!form.countryId ? "Select country first" : stateOptions.length === 0 ? "No states" : "Select state…"} />
          </Field>
          <Field label="City" required>
            <Select value={form.cityId} onChange={handleCityChange} options={cityOptions} placeholder={!form.stateId ? "Select state first" : cityOptions.length === 0 ? "No cities" : "Select city…"} />
          </Field>
        </FormGrid>
        <Field label="Note">
          <Textarea value={form.note} onChange={(v) => setForm({ ...form, note: v })} placeholder="Optional" rows={2} />
        </Field>
        <Field label="Set as primary address">
          <div style={{ paddingTop: 6 }}>
            <Toggle value={form.isPrimary} onChange={(v) => setForm({ ...form, isPrimary: v })} />
          </div>
        </Field>
      </div>
    </div>
  );
}

// ─── Address List ──────────────────────────────────────────────────────────────
// ─── Address List ──────────────────────────────────────────────────────────────
// ─── Address List ──────────────────────────────────────────────────────────────
export function AddressList({ addresses, onEdit, onDelete, onSetPrimary }) {
  // ✅ Ensure addresses is always an array
  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  
  console.log("AddressList rendering with:", safeAddresses.length, "addresses"); // Debug
  
  if (safeAddresses.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
        No addresses added yet
      </div>
    );
  }
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {safeAddresses.map((addr, idx) => (
        <div key={addr.id || addr._id || idx} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", background: addr.isPrimary ? "#f8fafc" : "#fafafa" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Address {idx + 1}</span>
              {addr.isPrimary && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "#10b981", color: "#fff", fontWeight: 500 }}>Primary</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {!addr.isPrimary && (
                <button 
                  onClick={() => onSetPrimary(idx)} 
                  className="inv-btn-icon"
                  style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 5, background: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "var(--text-secondary)" }}
                >
                  <StarIcon filled={false} /> Primary
                </button>
              )}
              <button 
                onClick={() => onEdit(idx)} 
                className="inv-btn-icon"
                style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 5, background: "#fff", cursor: "pointer", fontSize: 11 }}
              >
                Edit
              </button>
              <button 
                onClick={() => onDelete(idx)} 
                className="inv-btn-icon inv-btn-danger"
                style={{ padding: "4px 8px", border: "1px solid #fca5a5", borderRadius: 5, background: "#fff", cursor: "pointer", fontSize: 11, color: "var(--danger)" }}
              >
                Delete
              </button>
            </div>
          </div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            {addr.line1 || addr.address}
            {addr.line2 ? (
              <>
                <br />
                {addr.line2}
              </>
            ) : null}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 4, flexWrap: "wrap" }}>
            {addr.pinCode && <span>{addr.pinCode}</span>}
            {addr.cityName && <span>• {addr.cityName}</span>}
            {addr.stateName && <span>• {addr.stateName}</span>}
            {addr.countryName && <span>• {addr.countryName}</span>}
          </div>
          {addr.note && (
            <div style={{ marginTop: 8, padding: 8, background: "#fff", borderRadius: 4, fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", borderLeft: "3px solid var(--border-mid)" }}>
              Note: {addr.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Type Management Modal ─────────────────────────────────────────────────────
export function TypeManagementModal({ types, onClose, onAdd, onEdit, onDelete, loading }) {
  const [newType, setNewType] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newType.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(newType.trim());
      setNewType("");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editValue.trim() || saving) return;
    setSaving(true);
    try {
      await onEdit(editingId, editValue.trim());
      setEditingId(null);
      setEditValue("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Manage Party Categories</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text-secondary)", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Add new category</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
              <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="e.g. Wholesaler" style={{ flex: "1 1 160px", minWidth: 0, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, outline: "none" }} />
              <button type="button" className="inv-btn-primary inv-save-btn" onClick={handleAdd} disabled={saving || !newType.trim()} style={{ flex: "0 0 auto", padding: "8px 18px", border: "none", borderRadius: 6, cursor: saving || !newType.trim() ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", opacity: saving || !newType.trim() ? 0.55 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
            Existing Categories ({types.length})
          </div>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>Loading…</div>
          ) : types.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No categories yet. Add one above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {types.map((type) => (
                <div key={type.id || type._id || type.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "#fafafa" }}>
                  {editingId === (type.id || type._id || type.value) ? (
                    <>
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()} autoFocus style={{ flex: 1, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 5, fontSize: 13, outline: "none" }} />
                      <button type="button" className="inv-btn-primary" onClick={handleSaveEdit} disabled={saving} style={{ padding: "6px 12px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 500, opacity: saving ? 0.6 : 1 }}>{saving ? "…" : "Save"}</button>
                      <button type="button" onClick={() => { setEditingId(null); setEditValue(""); }} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{type.label || type.name}</span>
                      <button type="button" onClick={() => { setEditingId(type.id || type._id || type.value); setEditValue(type.label || type.name); }} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12 }}>Edit</button>
                      <button type="button" onClick={() => onDelete(type.id || type._id || type.value)} style={{ padding: "6px 12px", border: "1px solid #fca5a5", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12, color: "var(--danger)" }}>Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 20px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ supplier, onClose }) {
  const Row = ({ label, value }) =>
    !value ? null : (
      <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: 13 }}>
        <span style={{ width: 130, color: "var(--text-secondary)", fontSize: 12, flexShrink: 0 }}>{label}</span>
        <span style={{ fontWeight: 500 }}>{value}</span>
      </div>
    );

  const safeAddresses = toArray(supplier.addresses);

  return (
    <Modal title="Supplier details" onClose={onClose} onSave={onClose} saveLabel="Close">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#185FA5" }}>{supplier.supplierName?.[0]}</span>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{supplier.supplierName}</div>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "#E6F1FB", color: "#185FA5", fontWeight: 500 }}>{supplier.type}</span>
        </div>
      </div>
      {safeAddresses.length > 0 && (
        <>
          <SectionLabel>Addresses</SectionLabel>
          {safeAddresses.map((addr, i) => (
            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 8, background: addr.isPrimary ? "#f8fafc" : "#fafafa" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                Address {i + 1}
                {addr.isPrimary && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 100, background: "#10b981", color: "#fff", fontWeight: 500, textTransform: "uppercase" }}>Primary</span>}
              </div>
              <Row label="Add 1" value={addr.line1 || addr.address} />
              <Row label="Add 2" value={addr.line2} />
              <Row label="Pin code" value={addr.pinCode} />
              <Row label="City" value={addr.cityName} />
              <Row label="State" value={addr.stateName} />
              <Row label="Country" value={addr.countryName} />
              {addr.note && <Row label="Note" value={addr.note} />}
            </div>
          ))}
        </>
      )}
      <SectionLabel>Tax info</SectionLabel>
      <Row label="GST no" value={supplier.gstNo} />
      <Row label="PAN no" value={supplier.panNo} />
      <SectionLabel>Contact</SectionLabel>
      <Row label="Email ID 1" value={supplier.emailId1} />
      <Row label="Email ID 2" value={supplier.emailId2} />
      <Row label="Mobile no 1" value={supplier.mobileNo1} />
      <Row label="Mobile no 2" value={supplier.mobileNo2} />
    </Modal>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, padding: "12px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: type === "error" ? "#fef2f2" : "#f0fdf4", color: type === "error" ? "#b91c1c" : "#15803d", border: `1px solid ${type === "error" ? "#fca5a5" : "#86efac"}`, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      {msg}
    </div>
  );
}

// ─── Main SupplierPage ─────────────────────────────────────────────────────────
export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierTypes, setSupplierTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typesLoading, setTypesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [modal, setModal] = useState({ mode: "add" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [addressForm, setAddressForm] = useState(null);
  const [typeManagement, setTypeManagement] = useState(false);
  const [showList, setShowList] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);

  const bulkFileRef = useRef();
  const dispatch = useDispatch();
  const countries = useSelector((s) => s.countries?.data || []);
  const states = useSelector((s) => s.states?.data || []);
  const cities = useSelector((s) => s.cities?.items || []);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  // ── Fetch suppliers ──────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      const res = await suppliersAPI.list(params);
      setSuppliers(res.data || []);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  // ── Fetch supplier types ─────────────────────────────────────────────────────
  const fetchTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await typesAPI.list();
      setSupplierTypes(res.data || []);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setTypesLoading(false);
    }
  }, []);

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
  useEffect(() => { fetchTypes(); }, [fetchTypes]);
  useEffect(() => {
    dispatch(fetchCountries());
    dispatch(fetchStates());
    dispatch(fetchCities({ page: 1, limit: 10000 }));
  }, [dispatch]);

  useEffect(() => {
    (async () => {
      try {
        const [pt, mc] = await Promise.all([
          paymentTermsApi.getAll(),
          mainCategoryApi.getAll(),
        ]);
        setPaymentTerms(Array.isArray(pt) ? pt : []);
        setMainCategories(Array.isArray(mc) ? mc : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Debounce search / filter
  useEffect(() => {
    const t = setTimeout(() => fetchSuppliers(), 400);
    return () => clearTimeout(t);
  }, [search, filterType]);

  // Add this after your useState declarations
useEffect(() => {
  console.log("Form addresses updated:", form.addresses);
}, [form.addresses]);

  const typeOptions = supplierTypes.map((t) => ({
    value: t.name,
    label: t.name,
    id: t.id || t._id,
  }));

  const paymentTermOptions = paymentTerms
    .filter((p) => p.active !== false)
    .map((p) => ({
      value: String(p.id || p._id),
      label: p.name,
    }));

  const mainCategoryOptions = useMemo(
    () =>
      mainCategories
        .filter((c) => c.active !== false)
        .map((c) => ({
          id: String(c.id || c._id),
          label: `${c.groupName || ""}${c.headName ? ` (${c.headName})` : ""}`,
        })),
    [mainCategories],
  );

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY_FORM, addresses: [] });
    setModal({ mode: "add" });
    setShowList(false);
  }
function openEdit(row) {
  const ids = Array.isArray(row.purchaseCategoryIds)
    ? row.purchaseCategoryIds.map((x) => String(x))
    : [];
  
  // ✅ CRITICAL FIX: Properly extract addresses from the row data
  let existingAddresses = [];
  
  // Check if row has addresses property
  if (row.addresses) {
    if (Array.isArray(row.addresses)) {
      existingAddresses = row.addresses;
    } else if (typeof row.addresses === "string") {
      try {
        const parsed = JSON.parse(row.addresses);
        existingAddresses = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Failed to parse addresses:", e);
        existingAddresses = [];
      }
    }
  }
  
  // Normalize each address
  const normalizedAddresses = existingAddresses.map((addr, idx) => {
    const normalized = normalizeAddrForForm(addr);
    return {
      ...normalized,
      id: addr.id || addr._id || idx,
      line1: normalized.line1 || normalized.address || "",
      line2: normalized.line2 || "",
      pinCode: normalized.pinCode || "",
      cityId: addr.cityId?._id || addr.cityId || normalized.cityId || "",
      cityName: addr.cityName || normalized.cityName || "",
      stateId: addr.stateId?._id || addr.stateId || normalized.stateId || "",
      stateName: addr.stateName || normalized.stateName || "",
      countryId: addr.countryId?._id || addr.countryId || normalized.countryId || "",
      countryName: addr.countryName || normalized.countryName || "",
      note: addr.note || normalized.note || "",
      isPrimary: addr.isPrimary || normalized.isPrimary || false,
    };
  });
  
  console.log("Loaded addresses for edit:", normalizedAddresses); // Debug log
  
  setForm({
    ...EMPTY_FORM,
    ...row,
    addresses: normalizedAddresses,
    shortCode: String(row.shortCode || "").toUpperCase().slice(0, 5),
    paymentTermsId: row.paymentTermsId ? String(row.paymentTermsId) : "",
    purchaseCategoryIds: ids,
  });
  
  setModal({ mode: "edit", id: row.id || row._id });
  setShowList(false);
}

  // ── Address handlers ─────────────────────────────────────────────────────────
  function openAddAddress() {
    setAddressForm({ mode: "add", address: { ...EMPTY_ADDRESS } });
  }
  function openEditAddress(idx) {
    setAddressForm({
      mode: "edit",
      index: idx,
      address: normalizeAddrForForm({ ...toArray(form.addresses)[idx] }),
    });
  }

  function handleAddressSave(addr) {
    const currentAddresses = toArray(form.addresses);
    if (addressForm.mode === "add") {
      const base = addr.isPrimary
        ? currentAddresses.map((a) => ({ ...a, isPrimary: false }))
        : currentAddresses;
      setForm({ ...form, addresses: [...base, { ...addr, _id: Date.now() }] });
    } else {
      const updated = currentAddresses.map((a, i) => {
        if (i === addressForm.index) return addr;
        if (addr.isPrimary) return { ...a, isPrimary: false };
        return a;
      });
      setForm({ ...form, addresses: updated });
    }
    setAddressForm(null);
  }

  function deleteAddress(idx) {
    if (!confirm("Delete this address?")) return;
    setForm({ ...form, addresses: toArray(form.addresses).filter((_, i) => i !== idx) });
  }
  function setAddressPrimary(idx) {
    setForm({
      ...form,
      addresses: toArray(form.addresses).map((a, i) => ({ ...a, isPrimary: i === idx })),
    });
  }

  // ── Save supplier ────────────────────────────────────────────────────────────
async function handleSave() {
  console.log("=== SAVE STARTED ===");
  console.log("Form data:", form);
  
  if (!form.supplierName.trim()) {
    console.log("Validation failed: Party name missing");
    return alert("Party name is required");
  }
  if (!form.type) {
    console.log("Validation failed: Party category missing");
    return alert("Party category is required");
  }
  
  const sc = String(form.shortCode || "").trim().toUpperCase();
  if (sc.length < 1 || sc.length > 5) {
    console.log("Validation failed: Short code invalid");
    return alert("Short code is required (1–5 characters)");
  }
  
  console.log("Validations passed");
  setSaving(true);
  
  try {
    const cleanAddresses = toArray(form.addresses)
      .filter((a) => (a.line1 || a.address) && a.cityId && a.stateId && a.countryId)
      .map(({ _id, ...rest }) => rest);
    
    console.log("Clean addresses:", cleanAddresses);
    
    const payload = {
      ...form,
      shortCode: sc,
      paymentTermsId: form.paymentTermsId || null,
      purchaseCategoryIds: form.purchaseCategoryIds.map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n)),
      addresses: cleanAddresses,
    };
    
    console.log("Payload being sent:", payload);
    
    if (modal.mode === "add") {
      console.log("Creating new supplier...");
      await suppliersAPI.create(payload);
      setForm(EMPTY_FORM);
    } else {
      console.log("Updating supplier with ID:", modal.id);
      await suppliersAPI.update(modal.id, payload);
    }
    
    console.log("Save successful!");
    setSaveSuccess(true);
    fetchSuppliers();
  } catch (e) {
    console.error("Save error:", e);
    showToast(e.message, "error");
  } finally {
    setSaving(false);
  }
}

  // ── Delete supplier ──────────────────────────────────────────────────────────
  async function handleDelete(id) {
    setSaving(true);
    try {
      await suppliersAPI.delete(id);
      showToast("Supplier deleted");
      setDeleteConfirm(null);
      fetchSuppliers();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Type management ──────────────────────────────────────────────────────────
  async function handleAddType(name) {
    try {
      await typesAPI.create(name);
      showToast("Category added");
      fetchTypes();
    } catch (e) {
      showToast(e.message, "error");
      throw e;
    }
  }
  async function handleEditType(id, newName) {
    try {
      await typesAPI.update(id, newName);
      showToast("Category updated");
      fetchTypes();
      fetchSuppliers();
    } catch (e) {
      showToast(e.message, "error");
      throw e;
    }
  }
  async function handleDeleteType(id) {
    if (!confirm("Delete this category?")) return;
    try {
      await typesAPI.delete(id);
      showToast("Category deleted");
      fetchTypes();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // ── Bulk Upload ──────────────────────────────────────────────────────────────
  async function handleDownloadTemplate() {
    try {
      const blob = await suppliersAPI.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "supplier-bulk-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message || "Template download failed", "error");
    }
  }

  async function handleBulkFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const result = await suppliersAPI.bulkUpload(file);
      fetchSuppliers();
      setBulkUploadResult(result);
    } catch (err) {
      showToast(err.message || "Bulk upload failed", "error");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Party Master</h1>
          <p className="inv-page-sub">Suppliers and customers — directory and contacts</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-ghost" onClick={handleDownloadTemplate}>Download Template</button>
          <button className="inv-btn-ghost" onClick={() => bulkFileRef.current?.click()}>Bulk Upload</button>
          <input ref={bulkFileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleBulkFileChange} />
          
          <button className="inv-btn-secondary" onClick={() => setShowList(!showList)}>
            {showList ? "Hide History" : "View Suppliers"}
          </button>
          {!modal && (
            <button className="inv-btn-primary" onClick={openAdd}>+ Add supplier</button>
          )}
        </div>
      </div>

      {bulkUploadResult && (
        <Modal title="Bulk Upload Summary" onClose={() => setBulkUploadResult(null)} onSave={() => setBulkUploadResult(null)} saveLabel="Close">
          <div style={{ marginBottom: "20px" }}>
            <div style={{ padding: "12px", background: "#f0fdf4", color: "#166534", borderRadius: "6px", marginBottom: "10px", fontWeight: "500" }}>
              Successfully imported {bulkUploadResult.insertedCount} parties.
            </div>
            {bulkUploadResult.failedCount > 0 && (
              <div style={{ padding: "12px", background: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "10px" }}>
                <div style={{ fontWeight: "600", marginBottom: "6px" }}>Failed to import {bulkUploadResult.failedCount} rows:</div>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px" }}>
                  {bulkUploadResult.errors.map((e, idx) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}

      {modal && !showList && (
        <div className="inv-card" style={{ marginBottom: 20 }}>
          <div className="inv-form-actions-top" style={{ justifyContent: "flex-start" }}>
            <button
              type="button"
              className="inv-btn-primary inv-save-btn"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving…" : modal.mode === "add" ? "Save party" : "Save changes"}
            </button>
            <button type="button" className="inv-btn-ghost" onClick={() => { setModal(null); setShowList(true); }}>
              Back to List
            </button>
          </div>

          <SectionLabel>Basic info</SectionLabel>
          <div className="inv-form-row cols-2">
            <Field
              label={
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span>Party category *</span>
                  <button type="button" className="inv-btn-ghost" onClick={() => setTypeManagement(true)} style={{ padding: "0 4px", fontSize: "10px", color: "var(--primary)", border: "none" }}>+ Manage</button>
                </div>
              }
              required
            >
              <Select value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={typeOptions} placeholder={typesLoading ? "Loading…" : typeOptions.length === 0 ? "No categories" : "Select type…"} />
            </Field>
            <Field label="Short code *">
              <Input value={form.shortCode} onChange={(v) => setForm((f) => ({ ...f, shortCode: v.toUpperCase().slice(0, 5) }))} placeholder="Max 5 chars" maxLength={5} />
            </Field>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Field label="Party name *" required>
              <Input value={form.supplierName} onChange={(v) => setForm((f) => ({ ...f, supplierName: v }))} placeholder="e.g. Steel India Ltd." style={{ width: "100%" }} />
            </Field>
          </div>

          <SectionLabel>Business configuration</SectionLabel>
          <div className="inv-form-row cols-3">
            <Field label="Payment terms">
              <Select
                value={form.paymentTermsId}
                onChange={(v) => setForm((f) => ({ ...f, paymentTermsId: v }))}
                options={paymentTermOptions}
                placeholder={paymentTermOptions.length === 0 ? "No payment terms" : "Select…"}
              />
            </Field>
            <Field label="GST Type">
              <Select
                value={form.gstType}
                onChange={(v) => setForm((f) => ({ ...f, gstType: v }))}
                options={[
                  { value: "local", label: "Local (SGST+CGST)" },
                  { value: "other", label: "Other State (IGST)" },
                ]}
              />
            </Field>
            <Field label="Status">
              <div style={{ paddingTop: 6 }}>
                <Toggle value={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
              </div>
            </Field>
          </div>

          <SectionLabel>Purchase category mapping</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginBottom: 16, maxHeight: 160, overflowY: "auto", padding: "8px 0" }}>
            {mainCategoryOptions.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>No main categories available</span>
            ) : (
              mainCategoryOptions.map((c) => {
                const checked = form.purchaseCategoryIds.map(String).includes(c.id);
                return (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setForm((f) => {
                          const set = new Set(f.purchaseCategoryIds.map(String));
                          if (set.has(c.id)) set.delete(c.id);
                          else set.add(c.id);
                          return { ...f, purchaseCategoryIds: [...set] };
                        });
                      }}
                    />
                    {c.label}
                  </label>
                );
              })
            )}
          </div>

          <SectionLabel>Addresses</SectionLabel>
{/* Debug - show count */}
<div style={{ fontSize: 10, color: "gray", marginBottom: 5 }}>
  Addresses in xform: {form.addresses?.length || 0}
</div>
<AddressList 
  addresses={form.addresses || []} 
  onEdit={openEditAddress} 
  onDelete={deleteAddress} 
  onSetPrimary={setAddressPrimary} 
/>
<button type="button" onClick={openAddAddress} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px dashed var(--border-mid)", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", marginTop: 12 }}>
  <PlusIcon /> Add address
</button>

          {addressForm && (
            <AddressFormPage
              address={addressForm.address}
              addressNumber={addressForm.mode === "edit" ? addressForm.index + 1 : null}
              onSave={handleAddressSave}
              onCancel={() => setAddressForm(null)}
              countries={countries}
              states={states}
              cities={cities}
            />
          )}

          <SectionLabel>Tax info</SectionLabel>
          <div className="inv-form-row cols-2">
            <Field label="GST no"><Input value={form.gstNo} onChange={(v) => setForm((f) => ({ ...f, gstNo: v }))} placeholder="e.g. 33AABCU9603R1ZN" /></Field>
            <Field label="PAN no"><Input value={form.panNo} onChange={(v) => setForm((f) => ({ ...f, panNo: v }))} placeholder="e.g. AABCU9603R" /></Field>
          </div>

          <SectionLabel>Contact details</SectionLabel>
          <div className="inv-form-row cols-2">
            <Field label="Email ID 1"><Input type="email" value={form.emailId1} onChange={(v) => setForm((f) => ({ ...f, emailId1: v }))} placeholder="primary@email.com" /></Field>
            <Field label="Email ID 2"><Input type="email" value={form.emailId2} onChange={(v) => setForm((f) => ({ ...f, emailId2: v }))} placeholder="secondary@email.com" /></Field>
          </div>
          <div className="inv-form-row cols-2">
            <Field label="Mobile no 1"><Input value={form.mobileNo1} onChange={(v) => setForm((f) => ({ ...f, mobileNo1: v }))} placeholder="+91 98765 43210" /></Field>
            <Field label="Mobile no 2"><Input value={form.mobileNo2} onChange={(v) => setForm((f) => ({ ...f, mobileNo2: v }))} placeholder="+91 98765 43210" /></Field>
          </div>
        </div>
      )}

      {showList && (
        <div className="inv-card">
          <div className="inv-toolbar">
            <input className="inv-search" placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="inv-filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <span className="inv-count">{loading ? "…" : `${suppliers.length} record${suppliers.length !== 1 ? "s" : ""}`}</span>
          </div>

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Party category</th>
                  <th>Short</th>
                  <th>Party name</th>
                  <th>Mobile no</th>
                  <th>Email</th>
                  <th>City</th>
                  <th>State</th>
                  <th>GST no</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="inv-empty">Loading…</td></tr>
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan={11} className="inv-empty">No records found</td></tr>
                ) : (
                  suppliers.map((row, i) => {
                    // ✅ FIX: always normalise addresses to array before calling .find()
                    const addrs = toArray(row.addresses);
                    const primaryAddr = addrs.find((a) => a.isPrimary) || addrs[0];
                    return (
                      <tr key={row.id || row._id}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, padding: "3px 8px", borderRadius: 100, fontWeight: 500, background: "#E6F1FB", color: "#185FA5" }}>
                            {row.type || "—"}
                          </span>
                        </td>
                        <td className="inv-muted-sm">{row.shortCode || "—"}</td>
                        <td className="inv-bold">{row.supplierName}</td>
                        <td className="inv-muted-sm">{row.mobileNo1 || "—"}</td>
                        <td className="inv-muted-sm">{row.emailId1 || "—"}</td>
                        <td className="inv-muted-sm">{primaryAddr?.cityName || "—"}</td>
                        <td className="inv-muted-sm">{primaryAddr?.stateName || "—"}</td>
                        <td className="inv-spec">{row.gstNo || "—"}</td>
                        <td>
                          <span className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}>
                            {row.active ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <div className="inv-actions">
                            <button className="inv-btn-icon" title="View" onClick={() => setViewSupplier(row)}><ViewIcon /></button>
                            <button className="inv-btn-icon" title="Edit" onClick={() => openEdit(row)}><EditIcon /></button>
                            <button className="inv-btn-icon inv-btn-danger" title="Delete" onClick={() => setDeleteConfirm(row.id || row._id)}><DeleteIcon /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 20px', textAlign: 'right' }}>
            <button className="inv-btn-ghost" onClick={() => setShowList(false)}>Hide List</button>
          </div>
        </div>
      )}

      {viewSupplier && <ViewModal supplier={viewSupplier} onClose={() => setViewSupplier(null)} />}

      {typeManagement && (
        <TypeManagementModal
          types={supplierTypes.map((t) => ({ id: t.id || t._id, value: t.name, label: t.name }))}
          onClose={() => setTypeManagement(false)}
          onAdd={handleAddType}
          onEdit={handleEditType}
          onDelete={handleDeleteType}
          loading={typesLoading}
        />
      )}

      {deleteConfirm && (
        <Modal title="Confirm delete" onClose={() => setDeleteConfirm(null)} onSave={() => handleDelete(deleteConfirm)} saveLabel={saving ? "Deleting…" : "Delete"}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Are you sure you want to delete this supplier? This action cannot be undone.</p>
        </Modal>
      )}
      
      {saveSuccess && (
        <Modal title="Success" onClose={() => setSaveSuccess(false)} onSave={() => setSaveSuccess(false)} saveLabel="OK">
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div style={{ fontSize: "40px", color: "var(--success)", marginBottom: "10px" }}>✓</div>
            <p style={{ fontSize: "16px", fontWeight: "600" }}>Supplier Saved Successfully!</p>
            <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>The party details have been updated in the master directory.</p>
          </div>
        </Modal>
      )}

      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg: "", type: "success" })} />
    </div>
  );
}
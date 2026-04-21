import { useState, useEffect, useCallback } from "react";
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

// ─── API BASE ──────────────────────────────────────────────────────────────────
// ✅ FIX: was `import.meta.env.VITE_API_URL || "http://localhost:5000/api"`
//   The hardcoded fallback caused ERR_CONNECTION_REFUSED whenever the env var
//   was not set. Vite's dev-server proxy handles /api/* → localhost:5000,
//   so a simple relative path is all that's needed here and in every other file.
const API = import.meta.env.VITE_API_URL || "/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) {
    // If backend returned field-level validation errors, join them into one message
    const message = json.errors?.length
      ? json.errors.join("\n")
      : json.message || "Request failed";
    throw new Error(message);
  }
  return json;
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
};

const typesAPI = {
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
const EMPTY_ADDRESS = {
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

const EMPTY_FORM = {
  supplierName: "",
  type: "",
  active: true,
  addresses: [],
  gstNo: "",
  panNo: "",
  emailId1: "",
  emailId2: "",
  mobileNo1: "",
  mobileNo2: "",
};

// ─── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
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

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const ViewIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// ─── Address Form Page ─────────────────────────────────────────────────────────
function AddressFormPage({
  address,
  onSave,
  onCancel,
  countries = [],
  states = [],
  cities = [],
  addressNumber,
}) {
  const [form, setForm] = useState(address);

  const countryOptions = countries.map((c) => ({
    value: String(c._id),
    label: c.name,
  }));
  const stateOptions = states.map((s) => ({
    value: String(s._id),
    label: s.name,
  }));

  const cityOptions = !form.stateId
    ? []
    : cities
        .filter((c) => {
          const cStateId = c.stateId?._id || c.stateId;
          return String(cStateId) === String(form.stateId);
        })
        .map((c) => ({ value: String(c._id), label: c.name }));

  function handleCountryChange(val) {
    const found = countries.find((x) => String(x._id) === String(val));
    setForm({
      ...form,
      countryId: val,
      countryName: found?.name || "",
      stateId: "",
      stateName: "",
      cityId: "",
      cityName: "",
    });
  }
  function handleStateChange(val) {
    const found = states.find((x) => String(x._id) === String(val));
    setForm({
      ...form,
      stateId: val,
      stateName: found?.name || "",
      cityId: "",
      cityName: "",
    });
  }
  function handleCityChange(val) {
    const found = cities.find((x) => String(x._id) === String(val));
    setForm({ ...form, cityId: val, cityName: found?.name || "" });
  }

  function handleSubmit() {
    if (!form.address.trim()) return alert("Address is required");
    if (!form.countryId) return alert("Country is required");
    if (!form.stateId) return alert("State is required");
    if (!form.cityId) return alert("City is required");
    onSave(form);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "90%",
          maxWidth: 700,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            {addressNumber
              ? `Edit Address ${addressNumber}`
              : "Add New Address"}
          </h2>
        </div>
        <div style={{ padding: 24 }}>
          <Field label="Address" required>
            <Textarea
              value={form.address}
              onChange={(v) => setForm({ ...form, address: v })}
              placeholder="Enter full address"
              rows={3}
            />
          </Field>
          <FormGrid>
            <Field label="Pin code">
              <Input
                value={form.pinCode}
                onChange={(v) => setForm({ ...form, pinCode: v })}
                placeholder="e.g. 600001"
              />
            </Field>
            <Field label="Country" required>
              <Select
                value={form.countryId}
                onChange={handleCountryChange}
                options={countryOptions}
                placeholder="Select country..."
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="State" required>
              <Select
                value={form.stateId}
                onChange={handleStateChange}
                options={stateOptions}
                placeholder={
                  !form.countryId
                    ? "Select country first"
                    : stateOptions.length === 0
                      ? "No states available"
                      : "Select state..."
                }
              />
            </Field>
            <Field label="City" required>
              <Select
                value={form.cityId}
                onChange={handleCityChange}
                options={cityOptions}
                placeholder={
                  !form.stateId
                    ? "Select state first"
                    : cityOptions.length === 0
                      ? "No cities available"
                      : "Select city..."
                }
              />
            </Field>
          </FormGrid>
          <Field label="Note">
            <Textarea
              value={form.note}
              onChange={(v) => setForm({ ...form, note: v })}
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </Field>
          <Field label="Set as primary address">
            <div style={{ paddingTop: 6 }}>
              <Toggle
                value={form.isPrimary}
                onChange={(v) => setForm({ ...form, isPrimary: v })}
              />
            </div>
          </Field>
        </div>
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            position: "sticky",
            bottom: 0,
            background: "#fff",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              background: "var(--primary)",
              color: "#000",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Save Address
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Address List ──────────────────────────────────────────────────────────────
function AddressList({ addresses, onEdit, onDelete, onSetPrimary }) {
  if (!addresses || addresses.length === 0) {
    return (
      <div
        style={{
          padding: 20,
          textAlign: "center",
          color: "var(--text-secondary)",
          fontSize: 13,
        }}
      >
        No addresses added yet
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {addresses.map((addr, idx) => (
        <div
          key={addr._id || idx}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "14px 16px",
            background: addr.isPrimary ? "#f8fafc" : "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Address {idx + 1}
              </span>
              {addr.isPrimary && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 100,
                    background: "#10b981",
                    color: "#fff",
                    fontWeight: 500,
                  }}
                >
                  Primary
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {!addr.isPrimary && (
                <button
                  onClick={() => onSetPrimary(idx)}
                  style={{
                    padding: "4px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: 5,
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--text-secondary)",
                  }}
                >
                  <StarIcon filled={false} /> Primary
                </button>
              )}
              <button
                onClick={() => onEdit(idx)}
                style={{
                  padding: "4px 8px",
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(idx)}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #fca5a5",
                  borderRadius: 5,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "var(--danger)",
                }}
              >
                Delete
              </button>
            </div>
          </div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>{addr.address}</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
            }}
          >
            {addr.pinCode && <span>{addr.pinCode}</span>}
            {addr.cityName && <span>• {addr.cityName}</span>}
            {addr.stateName && <span>• {addr.stateName}</span>}
            {addr.countryName && <span>• {addr.countryName}</span>}
          </div>
          {addr.note && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: "#fff",
                borderRadius: 4,
                fontSize: 12,
                color: "var(--text-secondary)",
                fontStyle: "italic",
                borderLeft: "3px solid var(--border-mid)",
              }}
            >
              Note: {addr.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Type Management Modal ─────────────────────────────────────────────────────
function TypeManagementModal({
  types,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  loading,
}) {
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 500,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Manage Party Categories
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "var(--text-secondary)",
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Add new category
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Wholesaler"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving || !newType.trim()}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  borderRadius: 6,
                  background: "var(--primary)",
                  color: "#fff",
                  cursor: saving || !newType.trim() ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  opacity: saving || !newType.trim() ? 0.55 : 1,
                }}
              >
                {saving ? "Adding…" : "+ Add"}
              </button>
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
              paddingBottom: 6,
              borderBottom: "1px solid var(--border)",
            }}
          >
            Existing Categories ({types.length})
          </div>
          {loading ? (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              Loading…
            </div>
          ) : types.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              No categories yet. Add one above.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {types.map((type) => (
                <div
                  key={type._id || type.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "#fafafa",
                  }}
                >
                  {editingId === (type._id || type.value) ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          border: "1px solid var(--border)",
                          borderRadius: 5,
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={saving}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          borderRadius: 4,
                          background: "var(--primary)",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 500,
                          opacity: saving ? 0.6 : 1,
                        }}
                      >
                        {saving ? "…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditValue("");
                        }}
                        style={{
                          padding: "6px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          background: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                        {type.label || type.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(type._id || type.value);
                          setEditValue(type.label || type.name);
                        }}
                        style={{
                          padding: "6px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          background: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(type._id || type.value)}
                        style={{
                          padding: "6px 12px",
                          border: "1px solid #fca5a5",
                          borderRadius: 4,
                          background: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                          color: "var(--danger)",
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 20px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ supplier, onClose }) {
  const Row = ({ label, value }) =>
    !value ? null : (
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "6px 0",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: 13,
        }}
      >
        <span
          style={{
            width: 130,
            color: "var(--text-secondary)",
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {label}
        </span>
        <span style={{ fontWeight: 500 }}>{value}</span>
      </div>
    );

  return (
    <Modal
      title="Supplier details"
      onClose={onClose}
      onSave={onClose}
      saveLabel="Close"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "#E6F1FB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "#185FA5" }}>
            {supplier.supplierName?.[0]}
          </span>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {supplier.supplierName}
          </div>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 100,
              background: "#E6F1FB",
              color: "#185FA5",
              fontWeight: 500,
            }}
          >
            {supplier.type}
          </span>
        </div>
      </div>
      {(supplier.addresses || []).length > 0 && (
        <>
          <SectionLabel>Addresses</SectionLabel>
          {supplier.addresses.map((addr, i) => (
            <div
              key={i}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 8,
                background: addr.isPrimary ? "#f8fafc" : "#fafafa",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Address {i + 1}
                {addr.isPrimary && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 100,
                      background: "#10b981",
                      color: "#fff",
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    Primary
                  </span>
                )}
              </div>
              <Row label="Address" value={addr.address} />
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
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        padding: "12px 20px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        background: type === "error" ? "#fef2f2" : "#f0fdf4",
        color: type === "error" ? "#b91c1c" : "#15803d",
        border: `1px solid ${type === "error" ? "#fca5a5" : "#86efac"}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
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
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [addressForm, setAddressForm] = useState(null);
  const [typeManagement, setTypeManagement] = useState(false);

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
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);
  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);
  useEffect(() => {
    dispatch(fetchCountries());
    dispatch(fetchStates());
    dispatch(fetchCities({ page: 1, limit: 10000 }));
  }, [dispatch]);
useEffect(() => {
  if (cities.length > 0) {
    console.log("Redux city[0]:", cities[0]);
    console.log("cityId length:", String(cities[0]._id).length);
  }
}, [cities]);
  // Debounce search / filter
  useEffect(() => {
    const t = setTimeout(() => fetchSuppliers(), 400);
    return () => clearTimeout(t);
  }, [search, filterType]);

  const typeOptions = supplierTypes.map((t) => ({
    value: t.name,
    label: t.name,
    _id: t._id,
  }));

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY_FORM, addresses: [] });
    setModal({ mode: "add" });
  }
  function openEdit(row) {
    setForm({ ...EMPTY_FORM, ...row, addresses: row.addresses || [] });
    setModal({ mode: "edit", id: row._id });
  }

  // ── Address handlers ─────────────────────────────────────────────────────────
  function openAddAddress() {
    setAddressForm({ mode: "add", address: { ...EMPTY_ADDRESS } });
  }
  function openEditAddress(idx) {
    setAddressForm({
      mode: "edit",
      index: idx,
      address: { ...form.addresses[idx] },
    });
  }

  function handleAddressSave(addr) {
    if (addressForm.mode === "add") {
      const base = addr.isPrimary
        ? form.addresses.map((a) => ({ ...a, isPrimary: false }))
        : form.addresses;
      setForm({ ...form, addresses: [...base, { ...addr, _id: Date.now() }] });
    } else {
      const updated = form.addresses.map((a, i) => {
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
    setForm({ ...form, addresses: form.addresses.filter((_, i) => i !== idx) });
  }
  function setAddressPrimary(idx) {
    setForm({
      ...form,
      addresses: form.addresses.map((a, i) => ({ ...a, isPrimary: i === idx })),
    });
  }

  // ── Save supplier ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.supplierName.trim()) return alert("Party name is required");
    if (!form.type) return alert("Party category is required");
    setSaving(true);
    try {
      // Strip temp _id fields added by Date.now() — backend uses MongoDB's own _id
      const cleanAddresses = form.addresses
        .filter((a) => a.address && a.cityId && a.stateId && a.countryId) // skip incomplete
        .map(({ _id, ...rest }) => rest); // remove frontend-only _id

      const payload = { ...form, addresses: cleanAddresses };

      if (modal.mode === "add") {
        await suppliersAPI.create(payload);
        showToast("Supplier created");
      } else {
        await suppliersAPI.update(modal.id, payload);
        showToast("Supplier updated");
      }
      setModal(null);
      fetchSuppliers();
    } catch (e) {
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Supplier</h1>
          <p className="inv-page-sub">
            Manage your supplier directory and contacts
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="inv-btn-secondary"
            onClick={() => setTypeManagement(true)}
          >
            Manage Categories
          </button>
          <button className="inv-btn-primary" onClick={openAdd}>
            + Add supplier
          </button>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-toolbar">
          <input
            className="inv-search"
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="inv-filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All types</option>
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <span className="inv-count">
            {loading
              ? "…"
              : `${suppliers.length} record${suppliers.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Party category</th>
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
                <tr>
                  <td colSpan={10} className="inv-empty">
                    Loading…
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="inv-empty">
                    No records found
                  </td>
                </tr>
              ) : (
                suppliers.map((row, i) => {
                  const primaryAddr =
                    (row.addresses || []).find((a) => a.isPrimary) ||
                    (row.addresses || [])[0];
                  return (
                    <tr key={row._id}>
                      <td className="inv-idx">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 100,
                            fontWeight: 500,
                            background: "#E6F1FB",
                            color: "#185FA5",
                          }}
                        >
                          {row.type || "—"}
                        </span>
                      </td>
                      <td className="inv-bold">{row.supplierName}</td>
                      <td className="inv-muted-sm">{row.mobileNo1 || "—"}</td>
                      <td className="inv-muted-sm">{row.emailId1 || "—"}</td>
                      <td className="inv-muted-sm">
                        {primaryAddr?.cityName || "—"}
                      </td>
                      <td className="inv-muted-sm">
                        {primaryAddr?.stateName || "—"}
                      </td>
                      <td className="inv-spec">{row.gstNo || "—"}</td>
                      <td>
                        <span
                          className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
                        >
                          {row.active ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <div className="inv-actions">
                          <button
                            className="inv-btn-icon"
                            title="View"
                            onClick={() => setViewSupplier(row)}
                          >
                            <ViewIcon />
                          </button>
                          <button
                            className="inv-btn-icon"
                            title="Edit"
                            onClick={() => openEdit(row)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="inv-btn-icon inv-btn-danger"
                            title="Delete"
                            onClick={() => setDeleteConfirm(row._id)}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewSupplier && (
        <ViewModal
          supplier={viewSupplier}
          onClose={() => setViewSupplier(null)}
        />
      )}

      {typeManagement && (
        <TypeManagementModal
          types={supplierTypes.map((t) => ({
            _id: t._id,
            value: t.name,
            label: t.name,
          }))}
          onClose={() => setTypeManagement(false)}
          onAdd={handleAddType}
          onEdit={handleEditType}
          onDelete={handleDeleteType}
          loading={typesLoading}
        />
      )}

      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add supplier" : "Edit supplier"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saveLabel={
            saving
              ? "Saving…"
              : modal.mode === "add"
                ? "Add supplier"
                : "Save changes"
          }
        >
          <SectionLabel>Basic info</SectionLabel>
          <FormGrid>
            <Field label="Party category" required>
              <Select
                value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v }))}
                options={typeOptions}
                placeholder={
                  typesLoading
                    ? "Loading…"
                    : typeOptions.length === 0
                      ? "No categories — add one first"
                      : "Select type…"
                }
              />
            </Field>
            <Field label="Party name" required>
              <Input
                value={form.supplierName}
                onChange={(v) => setForm((f) => ({ ...f, supplierName: v }))}
                placeholder="e.g. Steel India Ltd."
              />
            </Field>
          </FormGrid>

          <SectionLabel>Addresses</SectionLabel>
          <AddressList
            addresses={form.addresses}
            onEdit={openEditAddress}
            onDelete={deleteAddress}
            onSetPrimary={setAddressPrimary}
          />
          <button
            type="button"
            onClick={openAddAddress}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "1px dashed var(--border-mid)",
              borderRadius: 6,
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 12,
            }}
          >
            <PlusIcon /> Add address
          </button>

          <SectionLabel>Tax info</SectionLabel>
          <FormGrid>
            <Field label="GST no">
              <Input
                value={form.gstNo}
                onChange={(v) => setForm((f) => ({ ...f, gstNo: v }))}
                placeholder="e.g. 33AABCU9603R1ZN"
              />
            </Field>
            <Field label="PAN no">
              <Input
                value={form.panNo}
                onChange={(v) => setForm((f) => ({ ...f, panNo: v }))}
                placeholder="e.g. AABCU9603R"
              />
            </Field>
          </FormGrid>

          <SectionLabel>Contact</SectionLabel>
          <FormGrid>
            <Field label="Email ID 1">
              <Input
                type="email"
                value={form.emailId1}
                onChange={(v) => setForm((f) => ({ ...f, emailId1: v }))}
                placeholder="primary@email.com"
              />
            </Field>
            <Field label="Email ID 2">
              <Input
                type="email"
                value={form.emailId2}
                onChange={(v) => setForm((f) => ({ ...f, emailId2: v }))}
                placeholder="secondary@email.com"
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Mobile no 1">
              <Input
                value={form.mobileNo1}
                onChange={(v) => setForm((f) => ({ ...f, mobileNo1: v }))}
                placeholder="+91 98765 43210"
              />
            </Field>
            <Field label="Mobile no 2">
              <Input
                value={form.mobileNo2}
                onChange={(v) => setForm((f) => ({ ...f, mobileNo2: v }))}
                placeholder="+91 98765 43210"
              />
            </Field>
          </FormGrid>

          <SectionLabel>Status</SectionLabel>
          <Field label="Active">
            <div style={{ paddingTop: 6 }}>
              <Toggle
                value={form.active}
                onChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>
          </Field>
        </Modal>
      )}

      {addressForm && (
        <AddressFormPage
          address={addressForm.address}
          addressNumber={
            addressForm.mode === "edit" ? addressForm.index + 1 : null
          }
          onSave={handleAddressSave}
          onCancel={() => setAddressForm(null)}
          countries={countries}
          states={states}
          cities={cities}
        />
      )}

      {deleteConfirm && (
        <Modal
          title="Confirm delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel={saving ? "Deleting…" : "Delete"}
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this supplier? This action cannot be
            undone.
          </p>
        </Modal>
      )}

      <Toast
        msg={toast.msg}
        type={toast.type}
        onDone={() => setToast({ msg: "", type: "success" })}
      />
    </div>
  );
}

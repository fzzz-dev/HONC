import { useState } from "react";
import Modal from "../components/Modal";
import {
  Field,
  Input,
  Select,
  Toggle,
  FormGrid,
} from "../components/FormFields";
import { SUPPLIER_TYPES } from "../data/initialData";

const EMPTY_ADDRESS = {
  address: "",
  pinCode: "",
  cityId: "",
  cityName: "",
  stateId: "",
  stateName: "",
  countryId: "",
  countryName: "",
};

const EMPTY = {
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

const TYPE_STYLE = {
  Manufacturer: { bg: "#E6F1FB", color: "#185FA5" },
  Distributor: { bg: "#FAEEDA", color: "#854F0B" },
  Importer: { bg: "#FBEAF0", color: "#993556" },
  Trader: { bg: "#EAF3DE", color: "#3B6D11" },
  "Service Provider": { bg: "#EEEDFE", color: "#534AB7" },
};

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

const RemoveIcon = () => (
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
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ── Address entry sub-form ─────────────────────────── */
/* ── Address entry sub-form ─────────────────────────── */
function AddressEntry({
  idx,
  addr,
  onChange,
  onRemove,
  countries = [],
  states = [],
  cities = [],
}) {
  // Always stringify IDs for consistent comparison
  const countryOptions = countries.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const stateOptions = !addr.countryId
    ? []
    : states
        .filter((s) => String(s.countryId) === String(addr.countryId))
        .map((s) => ({ value: String(s.id), label: s.name }));

  const cityOptions = !addr.stateId
    ? []
    : cities
        .filter((c) => String(c.stateId) === String(addr.stateId))
        .map((c) => ({ value: String(c.id), label: c.name }));

  function handleCountryChange(val) {
    const found = countries.find((x) => String(x.id) === String(val));
    onChange({
      ...addr,
      countryId: val,
      countryName: found?.name || "",
      stateId: "",
      stateName: "",
      cityId: "",
      cityName: "",
    });
  }

  function handleStateChange(val) {
    const found = states.find((x) => String(x.id) === String(val));
    onChange({
      ...addr,
      stateId: val,
      stateName: found?.name || "",
      cityId: "",
      cityName: "",
    });
  }

  function handleCityChange(val) {
    const found = cities.find((x) => String(x.id) === String(val));
    onChange({ ...addr, cityId: val, cityName: found?.name || "" });
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 10,
        background: "#fafafa",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
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
        <button
          type="button"
          onClick={onRemove}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "1px solid #fca5a5",
            borderRadius: 5,
            padding: "3px 8px",
            cursor: "pointer",
            fontSize: 11,
            color: "var(--danger)",
          }}
        >
          <RemoveIcon /> Remove
        </button>
      </div>

      <Field label="Address">
        <Input
          value={addr.address}
          onChange={(v) => onChange({ ...addr, address: v })}
          placeholder="Full address"
        />
      </Field>
      <div style={{ height: 8 }} />

      <FormGrid>
        <Field label="Pin code">
          <Input
            value={addr.pinCode}
            onChange={(v) => onChange({ ...addr, pinCode: v })}
            placeholder="e.g. 600001"
          />
        </Field>
        <Field label="Country">
          <Select
            value={addr.countryId}
            onChange={handleCountryChange}
            options={countryOptions}
            placeholder="Select country..."
          />
        </Field>
      </FormGrid>

      <FormGrid>
        <Field label="State">
          <Select
            value={addr.stateId}
            onChange={handleStateChange}
            options={stateOptions}
            placeholder={
              !addr.countryId
                ? "Select country first"
                : stateOptions.length === 0
                  ? "No states available"
                  : "Select state..."
            }
          />
        </Field>
        <Field label="City">
          <Select
            value={addr.cityId}
            onChange={handleCityChange}
            options={cityOptions}
            placeholder={
              !addr.stateId
                ? "Select state first"
                : cityOptions.length === 0
                  ? "No cities available"
                  : "Select city..."
            }
          />
        </Field>
      </FormGrid>
    </div>
  );
}

/* ── View modal ─────────────────────────────────────── */
function ViewModal({ supplier, onClose }) {
  const ts = TYPE_STYLE[supplier.type] || { bg: "#F1EFE8", color: "#5F5E5A" };
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
            background: ts.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: ts.color }}>
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
              background: ts.bg,
              color: ts.color,
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
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Address {i + 1}
              </div>
              <Row label="Address" value={addr.address} />
              <Row label="Pin code" value={addr.pinCode} />
              <Row label="City" value={addr.cityName} />
              <Row label="State" value={addr.stateName} />
              <Row label="Country" value={addr.countryName} />
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

/* ── Main page ──────────────────────────────────────── */
export default function SupplierPage({
  suppliers,
  setSuppliers,
  cities = [],
  states = [],
  countries = [],
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.supplierName.toLowerCase().includes(q) ||
      (s.emailId1 || "").toLowerCase().includes(q) ||
      (s.addresses?.[0]?.cityName || "").toLowerCase().includes(q);
    const matchType = !filterType || s.type === filterType;
    return matchSearch && matchType;
  });

  function openAdd() {
    setForm({ ...EMPTY, addresses: [] });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({ ...EMPTY, ...row, addresses: row.addresses || [] });
    setModal({ mode: "edit", id: row.id });
  }

  function addAddress() {
    setForm((f) => ({
      ...f,
      addresses: [...f.addresses, { ...EMPTY_ADDRESS, _id: Date.now() }],
    }));
  }

  function updateAddress(idx, updated) {
    setForm((f) => ({
      ...f,
      addresses: f.addresses.map((a, i) => (i === idx ? updated : a)),
    }));
  }

  function removeAddress(idx) {
    setForm((f) => ({
      ...f,
      addresses: f.addresses.filter((_, i) => i !== idx),
    }));
  }

  function handleSave() {
    if (!form.supplierName.trim()) return alert("Party name is required");
    const record = { ...form };
    if (modal.mode === "add") {
      setSuppliers((prev) => [...prev, { ...record, id: Date.now() }]);
    } else {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === modal.id ? { ...record, id: modal.id } : s)),
      );
    }
    setModal(null);
  }

  function handleDelete(id) {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Supplier</h1>
          <p className="inv-page-sub">
            Manage your supplier directory and contacts
          </p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add supplier
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-toolbar">
          <input
            className="inv-search"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="inv-filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All types</option>
            {SUPPLIER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="inv-count">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="inv-empty">
                    No records found
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => {
                const ts = TYPE_STYLE[row.type] || {
                  bg: "#F1EFE8",
                  color: "#5F5E5A",
                };
                const primaryAddr = (row.addresses || [])[0];
                return (
                  <tr key={row.id}>
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
                          background: ts.bg,
                          color: ts.color,
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
                          onClick={() => setDeleteConfirm(row.id)}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add supplier" : "Edit supplier"}
          onClose={() => setModal(null)}
          onSave={handleSave}
        >
          <SectionLabel>Basic info</SectionLabel>
          <FormGrid>
            <Field label="Party category">
              <Select
                value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v }))}
                options={SUPPLIER_TYPES.map((t) => ({ value: t, label: t }))}
                placeholder="Select type..."
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

          {/* Addresses */}
          <SectionLabel>Addresses</SectionLabel>
          {form.addresses.map((addr, idx) => (
            <AddressEntry
              key={addr._id || idx}
              idx={idx}
              addr={addr}
              onChange={(updated) => updateAddress(idx, updated)}
              onRemove={() => removeAddress(idx)}
              countries={countries}
              states={states}
              cities={cities}
            />
          ))}
          <button
            type="button"
            onClick={addAddress}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "1px dashed var(--border-mid)",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
              color: "var(--text-secondary)",
              transition: "all 0.15s",
              marginBottom: 4,
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

      {deleteConfirm && (
        <Modal
          title="Confirm delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this supplier? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

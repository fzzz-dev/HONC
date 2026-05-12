import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { purchaseIndentApi, inventoryHeadApi, mainCategoryApi, itemApi, departmentApi } from "../../services/inventoryApi";
import Modal from "../../components/Modal";
import { SearchSelect } from "../../components/FormFields";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const today = () => new Date().toISOString().split("T")[0];
const getFY = () => {
  const d = new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return m < 4 ? `${y - 1}-${y}` : `${y}-${y + 1}`;
};

const sid = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v.id || v._id || "");
  return String(v);
};
const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};
const safeDetails = (details) => {
  if (Array.isArray(details)) return details;
  if (typeof details === "string") { try { const p = JSON.parse(details); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
  return [];
};

const emptyDetail = () => ({
  _rowId: Math.random(), mainCategoryId: "", mainCategoryName: "",
  itemId: "", itemName: "", uom: "", indentQty: "0.000", dueDate: "", remarks: ""
});

const emptyHeader = () => ({
  indentNo: "", date: today(), departmentId: "", departmentName: "", createdBy: "Admin", createdOn: today(), status: "Open", remarks: "",
  preparedBy: ""
});

const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>{children}</div>
);

const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

// Print functionality removed per user request

export default function PurchaseIndentPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [heads, setHeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [indents, setIndents] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [company, setCompany] = useState(null);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [header, setHeader] = useState(emptyHeader());
  const [details, setDetails] = useState([emptyDetail()]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    loadLookups(); loadIndents(); openNew();
  }, []);

  async function loadLookups() {
    try {
      const [depts, headsData, catsData, itemsData, comp] = await Promise.all([
        departmentApi.getAll(), inventoryHeadApi.getAll(), mainCategoryApi.getAll(), itemApi.getAll(),
        fetch((import.meta.env.VITE_API_URL || "/api") + "/company").then(res => res.json()).catch(() => null)
      ]);
      setDepartments(depts || []); setHeads(headsData || []); setCompany(comp);
      setCategories((catsData || []).map(c => ({ ...c, id: sid(c), headId: sid(c.headId) })));
      setItems((itemsData || []).map(it => ({ ...it, id: sid(it), headId: sid(it.headId), groupId: sid(it.groupId) })));
    } catch (e) { console.error(e); }
  }

  async function loadIndents() {
    setLoadingList(true); try { const data = await purchaseIndentApi.getAll(); setIndents(Array.isArray(data) ? data : []); } catch (e) { setListError(e.message); } finally { setLoadingList(false); }
  }

  async function openNew() {
    setHeader({ ...emptyHeader(), preparedBy: user?.name || "Admin" });
    setDetails([emptyDetail()]); setEditId(null); setView("form");
    try { const { indentNo } = await purchaseIndentApi.getNextNumber(); if (indentNo) setHeader(h => ({ ...h, indentNo })); } catch (e) { }
  }

  function openEdit(indent) {
    setEditId(sid(indent));
    setHeader({
      indentNo: indent.indentNo, date: indent.date, departmentId: sid(indent.departmentId), departmentName: indent.departmentName,
      createdBy: indent.createdBy, remarks: indent.remarks || "", status: indent.status || "Open",
      preparedBy: indent.preparedBy || ""
    });
    setDetails(safeDetails(indent.details).map(d => ({
      ...d, _rowId: Math.random(), mainCategoryId: sid(d.mainCategoryId), itemId: sid(d.itemId)
    })));
    setView("form");
  }

  function updateDetail(idx, field, val) {
    setDetails(prev => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };
      if (field === "mainCategoryId") {
        const found = categories.find(c => sid(c) === val);
        row.mainCategoryName = found?.groupName || ""; row.itemId = ""; row.itemName = ""; row.uom = "";
      }
      if (field === "itemId") {
        const found = items.find(it => sid(it) === val);
        row.itemName = toTitleCase(found?.itemDescription || found?.itemName || ""); row.uom = found?.uom || "";
      }
      rows[idx] = row;
      return rows;
    });
  }

  function addRow() { setDetails(p => [...p, emptyDetail()]); }
  function removeRow(idx) { setDetails(p => p.filter((_, i) => i !== idx)); }

  async function handleDelete(id) {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await purchaseOrderApi.remove(id);
      await loadPos();
      setSaveToast("Purchase Order deleted successfully!");
      setTimeout(() => setSaveToast(""), 4000);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleSave() {
    if (!header.indentNo.trim()) return setFormError("Indent No is required");
    if (!header.departmentId) return setFormError("Department is required");
    setSaving(true);
    const cleanDetails = details.filter(d => d.itemId).map(({ _rowId, ...rest }) => rest);
    if (cleanDetails.length === 0) { setSaving(false); return setFormError("Add at least one item"); }
    const payload = { ...header, details: cleanDetails };
    try {
      if (editId) await purchaseIndentApi.update(editId, payload);
      else await purchaseIndentApi.create(payload);
      await loadIndents();
      setSaveSuccessModal(true);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this indent?")) return;
    try { await purchaseIndentApi.remove(id); loadIndents(); } catch (err) { alert(err.message); }
  }

  const totalQty = details.reduce((s, r) => s + Number(r.indentQty || 0), 0);

  if (view === "list") {
    const filteredIndents = indents.filter(ind => ind.indentNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const exportToExcel = () => {
      const headers = ["Indent No", "Date", "Department", "Requested By", "Status", "Total Items", "Total Qty"];
      const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const rows = filteredIndents.map(ind => {
        const totalItems = safeDetails(ind.details).length;
        const totalQty = safeDetails(ind.details).reduce((s, d) => s + Number(d.indentQty || 0), 0);
        return [ind.indentNo, ind.date, ind.departmentName, ind.createdBy, ind.status, totalItems, totalQty].map(escapeCsv).join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "purchase_indents.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div><h1 className="inv-page-title">Purchase Indents</h1><p className="inv-page-sub">Manage material indent requests</p></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={exportToExcel}>Export to Excel</button>
            <button className="inv-btn-primary" onClick={openNew}>+ New Indent</button>
          </div>
        </div>

        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body">
            <div className="inv-field" style={{ minWidth: 400, maxWidth: 400 }}>
              <label className="inv-label">Search Indent No</label>
              <input
                className="inv-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Type to search Indent Number..."
              />
            </div>
          </div>
        </div>

        <div className="inv-card">
          <table className="inv-table">
            <thead>
              <tr><th>#</th><th>Indent No</th><th>Date</th><th>Department</th><th>Requested By</th><th>Items</th><th>Total Qty</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredIndents.length === 0 && (
                <tr><td colSpan={9} className="inv-empty">No records found</td></tr>
              )}
              {filteredIndents.map((indent, i) => (
                <tr key={sid(indent)}>
                  <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                  <td style={{ fontWeight: 600, color: "var(--accent)" }}>{indent.indentNo}</td><td>{indent.date}</td><td>{indent.departmentName}</td><td>{indent.createdBy}</td>
                  <td className="inv-muted-sm">{safeDetails(indent.details).length} lines</td>
                  <td>{fmt(safeDetails(indent.details).reduce((s, d) => s + Number(d.indentQty || 0), 0))}</td>
                  <td><span className={`inv-badge ${indent.status === 'Open' ? 'inv-badge-yes' : 'inv-badge-no'}`}>{indent.status}</span></td>
                  <td>
                    <div className="inv-actions">
                      <button className="inv-btn-icon" onClick={() => openEdit(indent)}>Edit</button>
                      <button className="inv-btn-icon inv-btn-danger" onClick={() => handleDelete(sid(indent))}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }


  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div><h1 className="inv-page-title">{editId ? "Edit Purchase Indent" : "New Purchase Indent"}</h1><p className="inv-page-sub">Header-Detail-Summary layout</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>View List</button>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>Save Indent</button>
        </div>
      </div>

      {formError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="inv-card">
          <div className="inv-card-body">

            <FormGrid>
              <Field label="Indent No (Auto)"><input className="inv-input" value={header.indentNo} readOnly style={{ background: "#f8f7ff", color: "#4f46e5", fontWeight: 600 }} /></Field>
              <Field label="Date"><input className="inv-input" type="date" value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} /></Field>

              <Field label="Department *">
                <SearchSelect
                  value={header.departmentId}
                  onChange={val => {
                    const d = departments.find(x => sid(x) === val);
                    setHeader(h => ({ ...h, departmentId: val, departmentName: toTitleCase(d?.name || d?.departmentName || "") }));
                  }}
                  options={departments.map(d => ({ value: sid(d), label: d.name || d.departmentName }))}
                  placeholder="Select department"
                />
              </Field>
              <Field label="Requested By"><input className="inv-input" value={header.createdBy} onChange={e => setHeader(h => ({ ...h, createdBy: e.target.value }))} /></Field>
            </FormGrid>
          </div>
        </div>

        <div className="inv-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="inv-card-body" style={{ minHeight: "400px", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "16px 20px", background: "#fcfdfe", borderBottom: "1px solid #e2e8f0" }}>
              <button className="inv-btn-primary inv-btn-sm" onClick={addRow} style={{ borderRadius: 4, padding: "5px 12px" }}>+ Add Row</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table-premium">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: "center" }}>#</th>
                    <th>Category</th>
                    <th>Item Description</th>
                    <th style={{ width: 80, textAlign: "center" }}>UOM</th>
                    <th style={{ width: 100, textAlign: "right" }}>Qty</th>
                    <th style={{ width: 140 }}>Due Date</th>
                    <th>Remarks</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => {
                    const filteredItems = row.mainCategoryName ? items.filter(it => it.group === row.mainCategoryName) : [];
                    return (
                      <tr key={row._rowId}>
                        <td style={{ textAlign: "center", color: "#94a3b8", fontWeight: 500 }}>{idx + 1}</td>
                        <td>
                          <SearchSelect
                            className="inv-select-cell"
                            style={{ padding: 0, border: "none" }}
                            value={row.mainCategoryId}
                            onChange={val => updateDetail(idx, "mainCategoryId", val)}
                            options={categories.map(c => ({ value: sid(c), label: c.groupName }))}
                            placeholder="Select Category"
                          />
                        </td>
                        <td>
                          <SearchSelect
                            className="inv-select-cell"
                            style={{ padding: 0, border: "none" }}
                            value={row.itemId}
                            onChange={val => updateDetail(idx, "itemId", val)}
                            options={filteredItems.map(it => ({ value: sid(it), label: it.itemDescription || it.itemName }))}
                            placeholder={row.mainCategoryId ? "Select Item Description" : "Select Category First"}
                            disabled={!row.mainCategoryId}
                          />
                        </td>
                        <td><input className="inv-input-cell" value={row.uom} readOnly /></td>
                        <td><input className="inv-input-cell" type="number" step="0.001" value={row.indentQty} onChange={e => updateDetail(idx, "indentQty", e.target.value)} onBlur={e => updateDetail(idx, "indentQty", Number(e.target.value || 0).toFixed(3))} style={{ textAlign: "right", fontWeight: 600, color: "#3b6ef8" }} /></td>
                        <td><input className="inv-input-cell" type="date" value={row.dueDate} onChange={e => updateDetail(idx, "dueDate", e.target.value)} /></td>
                        <td><input className="inv-input-cell" value={row.remarks} onChange={e => updateDetail(idx, "remarks", e.target.value)} placeholder="Notes..." /></td>
                        <td style={{ textAlign: "center" }}>
                          <button className="inv-btn-icon inv-btn-danger" onClick={() => removeRow(idx)} style={{ border: "none", background: "transparent" }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="inv-card">
          <div className="inv-card-body">

            <div className="inv-summary-grid">

            <div style={{ display: "flex", gap: 40, padding: "10px 20px" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Line Items</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{details.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Indent Qty</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#3b6ef8" }}>{fmtQty(totalQty)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{header.status}</div>
              </div>
            </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Prepared By</label>
                  <input
                    className="inv-input"
                    value={header.preparedBy || ""}
                    onChange={e => setHeader(h => ({ ...h, preparedBy: e.target.value }))}
                    placeholder="Name of preparer"
                  />
                </div>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Indent Remarks</label>
                  <textarea
                    className="inv-input"
                    style={{ height: 40, resize: "none", fontSize: "13px", padding: "12px" }}
                    value={header.remarks || ""}
                    onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))}
                    placeholder="Enter any special notes or justification for this indent..."
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {saveSuccessModal && (
        <Modal title="Success" onClose={() => setSaveSuccessModal(false)} onSave={() => { setSaveSuccessModal(false); setView("list"); }} saveLabel="Go to List">
          <div style={{ textAlign: "center", padding: 20 }}><div style={{ fontSize: 48, color: "#10b981" }}>✓</div><h3 style={{ fontSize: 18, fontWeight: 600 }}>Saved Successfully!</h3><p style={{ color: "#64748b" }}>The Purchase Indent has been recorded.</p></div>
        </Modal>
      )}
    </div>
  );
}
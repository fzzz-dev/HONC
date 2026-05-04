import { useState, useEffect } from "react";
import { purchaseIndentApi, inventoryHeadApi, mainCategoryApi, itemApi, departmentApi } from "../../services/inventoryApi";
import Modal from "../../components/Modal";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const today = () => new Date().toISOString().split("T")[0];
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
  _rowId: Math.random(), inventoryHeadId: "", inventoryHeadName: "", mainCategoryId: "", mainCategoryName: "",
  itemId: "", itemName: "", uom: "", indentQty: 0, dueDate: "", remarks: ""
});

const emptyHeader = () => ({
  indentNo: "", date: today(), departmentId: "", departmentName: "", createdBy: "Admin", createdOn: today(), status: "Open", remarks: ""
});

const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>{children}</div>
);

const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

// Print functionality removed per user request

export default function PurchaseIndentPage() {
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
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    loadLookups(); loadIndents(); openNew();
  }, []);

  async function loadLookups() {
    try {
      const [depts, headsData, catsData, itemsData, comp] = await Promise.all([
        departmentApi.getAll(), inventoryHeadApi.getAll(), mainCategoryApi.getAll(), itemApi.getAll(),
        fetch("/api/company").then(res => res.json()).catch(() => null)
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
    setHeader(emptyHeader()); setDetails([emptyDetail()]); setEditId(null); setView("form");
    try { const { indentNo } = await purchaseIndentApi.getNextNumber(); if (indentNo) setHeader(h => ({ ...h, indentNo })); } catch (e) { }
  }

  function openEdit(indent) {
    setEditId(sid(indent));
    setHeader({
      indentNo: indent.indentNo, date: indent.date, departmentId: sid(indent.departmentId), departmentName: indent.departmentName,
      createdBy: indent.createdBy, remarks: indent.remarks || "", status: indent.status || "Open"
    });
    setDetails(safeDetails(indent.details).map(d => ({
      ...d, _rowId: Math.random(), inventoryHeadId: sid(d.inventoryHeadId), mainCategoryId: sid(d.mainCategoryId), itemId: sid(d.itemId)
    })));
    setView("form");
  }

  function updateDetail(idx, field, val) {
    setDetails(prev => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };
      if (field === "inventoryHeadId") {
        const found = heads.find(h => sid(h) === val);
        row.inventoryHeadName = found?.headName || ""; row.mainCategoryId = ""; row.mainCategoryName = ""; row.itemId = ""; row.itemName = ""; row.uom = "";
      }
      if (field === "mainCategoryId") {
        const found = categories.find(c => sid(c) === val);
        row.mainCategoryName = found?.groupName || ""; row.itemId = ""; row.itemName = ""; row.uom = "";
      }
      if (field === "itemId") {
        const found = items.find(it => sid(it) === val);
        row.itemName = toTitleCase(found?.itemName || ""); row.uom = found?.uom || "";
      }
      rows[idx] = row;
      return rows;
    });
  }

  function addRow() { setDetails(p => [...p, emptyDetail()]); }
  function removeRow(idx) { setDetails(p => p.filter((_, i) => i !== idx)); }

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
      setSaveSuccessModal(true);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this indent?")) return;
    try { await purchaseIndentApi.remove(id); loadIndents(); } catch (err) { alert(err.message); }
  }

  const totalQty = details.reduce((s, r) => s + Number(r.indentQty || 0), 0);

  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div><h1 className="inv-page-title">Purchase Indents</h1><p className="inv-page-sub">Manage material indent requests</p></div>
          <button className="inv-btn-primary" onClick={openNew}>+ New Indent</button>
        </div>
        <div className="inv-card">
          <table className="inv-table">
            <thead>
              <tr><th>#</th><th>Indent No</th><th>Date</th><th>Department</th><th>Requested By</th><th>Items</th><th>Total Qty</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {indents.map((indent, i) => (
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
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>Save Indent</button>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>View List</button>
        </div>
      </div>

      {formError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-section-label">Header</div>
            <FormGrid>
              <Field label="Indent No (Auto)"><input className="inv-input" value={header.indentNo} readOnly style={{ background: "#f8f7ff", color: "#4f46e5", fontWeight: 600 }} /></Field>
              <Field label="Date"><input className="inv-input" type="date" value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} /></Field>
              <Field label="Department *">
                <select className="inv-input" value={header.departmentId} onChange={e => {
                  const d = departments.find(x => sid(x) === e.target.value);
                  setHeader(h => ({ ...h, departmentId: e.target.value, departmentName: toTitleCase(d?.name || d?.departmentName || "") }));
                }}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={sid(d)} value={sid(d)}>{d.name || d.departmentName}</option>)}
                </select>
              </Field>
              <Field label="Requested By"><input className="inv-input" value={header.createdBy} onChange={e => setHeader(h => ({ ...h, createdBy: e.target.value }))} /></Field>
            </FormGrid>
          </div>
        </div>

        <div className="inv-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="inv-card-body" style={{ minHeight: "400px", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fcfdfe", borderBottom: "1px solid #e2e8f0" }}>
              <div className="inv-section-label" style={{ marginBottom: 0, padding: 0 }}>Item Details</div>
              <button className="inv-btn-primary inv-btn-sm" onClick={addRow} style={{ borderRadius: 4, padding: "5px 12px" }}>+ Add Row</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table-premium">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: "center" }}>#</th>
                    <th>Head</th>
                    <th>Category</th>
                    <th>Item</th>
                    <th style={{ width: 80 }}>UOM</th>
                    <th style={{ width: 100, textAlign: "right" }}>Qty</th>
                    <th style={{ width: 140 }}>Due Date</th>
                    <th>Remarks</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => {
                    const filteredCategories = row.inventoryHeadId ? categories.filter(c => c.headId === row.inventoryHeadId) : categories;
                    const filteredItems = row.mainCategoryName ? items.filter(it => it.group === row.mainCategoryName) : (row.inventoryHeadId ? items.filter(it => it.headId === row.inventoryHeadId) : items);
                    return (
                      <tr key={row._rowId}>
                        <td style={{ textAlign: "center", color: "#94a3b8", fontWeight: 500 }}>{idx + 1}</td>
                        <td>
                          <select className="inv-select-cell" value={row.inventoryHeadId} onChange={e => updateDetail(idx, "inventoryHeadId", e.target.value)}>
                            <option value="">Select Head</option>
                            {heads.map(h => <option key={sid(h)} value={sid(h)}>{h.headName}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="inv-select-cell" value={row.mainCategoryId} onChange={e => updateDetail(idx, "mainCategoryId", e.target.value)}>
                            <option value="">Select Category</option>
                            {filteredCategories.map(c => <option key={sid(c)} value={sid(c)}>{c.groupName}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="inv-select-cell" value={row.itemId} onChange={e => updateDetail(idx, "itemId", e.target.value)}>
                            <option value="">Select Item</option>
                            {filteredItems.map(it => <option key={sid(it)} value={sid(it)}>{it.itemName}</option>)}
                          </select>
                        </td>
                        <td><input className="inv-input-cell" value={row.uom} readOnly /></td>
                        <td><input className="inv-input-cell" type="number" step="0.001" value={row.indentQty} onChange={e => updateDetail(idx, "indentQty", e.target.value)} style={{ textAlign: "right", fontWeight: 600, color: "#3b6ef8" }} /></td>
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
              <div style={{ padding: "16px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Quantity</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#3b6ef8", fontFamily: "'DM Mono', monospace" }}>{fmt(totalQty)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-section-label">Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Field label="Remarks"><textarea className="inv-input" rows={2} value={header.remarks} onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))} placeholder="Enter any additional instructions or notes here..." /></Field>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <div className="inv-summary-row" style={{ border: "none" }}><span>Total Items</span><span>{details.length} Lines</span></div>
                 <div className="inv-summary-row grand-total"><span>Total Quantity</span><span>{fmt(totalQty)}</span></div>
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
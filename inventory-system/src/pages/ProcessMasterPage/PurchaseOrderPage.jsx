import { useState, useEffect } from "react";
import { purchaseOrderApi, paymentTermsApi, supplierApi, inventoryHeadApi, mainCategoryApi, itemApi } from "../../services/inventoryApi";
import Modal from "../../components/Modal";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
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

const numberToWords = (num) => {
  if (num === 0) return "Zero Only";
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const g = ['', 'Thousand', 'Lakh', 'Crore'];
  const makeGroup = (n) => {
    let res = '';
    if (n >= 100) { res += a[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n >= 20) { res += b[Math.floor(n / 20)] + ' ' + a[n % 20]; }
    else if (n > 0) { res += a[n]; }
    return res.trim();
  };
  let word = '';
  let i = 0;
  while (num > 0) {
    let divisor = (i === 1 || i === 2) ? 100 : 1000;
    let n = num % divisor;
    if (n > 0) word = makeGroup(n) + ' ' + g[i] + ' ' + word;
    num = Math.floor(num / divisor);
    i++;
  }
  return word.trim() + " Only";
};

const emptyDetail = () => ({
  _rowId: Math.random(), indentDetailId: "", itemId: "", itemName: "", uom: "", balQty: 0,
  poQty: 0, poRate: 0, discMode: "pct", discPct: 0, discPrice: 0, poAmount: 0,
  gstPct: 18, sgst: 0, cgst: 0, igst: 0, totGst: 0, totalAmount: 0
});

const emptyHeader = () => ({
  poNo: "", date: today(), supplierId: "", supplierName: "", supplierAddress: "", supplierGst: "",
  refNo: "", refDate: "", paymentTermsId: "", paymentTermsName: "", deliveryDate: "",
  createdBy: "Admin", createdOn: today(), status: "Open", remarks: ""
});

const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>{children}</div>
);

const Field = ({ label, children }) => (
  <div className="inv-field"><label className="inv-label">{label}</label>{children}</div>
);

function printPurchaseOrder({ header, details: detailRows, totals, gstEnabled, gstType, company, supplier }) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!DOCTYPE html><html><head><title>PO ${esc(header.poNo)}</title><style>body{font-family:Arial;font-size:10px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #000;padding:4px;}.text-right{text-align:right;}.bold{font-weight:bold;}</style></head><body><h2 style="text-align:center;">PURCHASE ORDER</h2><table><tr><td><strong>PO No:</strong> ${esc(header.poNo)}</td><td><strong>Date:</strong> ${esc(header.date)}</td></tr><tr><td><strong>Supplier:</strong> ${esc(header.supplierName)}</td><td><strong>GST:</strong> ${esc(header.supplierGst)}</td></tr></table><br/><table><thead><tr><th>SNo</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amt</th><th>GST%</th><th>Tax</th><th>Total</th></tr></thead><tbody>${detailRows.map((d, i) => `<tr><td>${i + 1}</td><td>${esc(d.itemName)}</td><td class="text-right">${fmtQty(d.poQty)}</td><td class="text-right">${fmt(d.poRate)}</td><td class="text-right">${fmt(d.poAmount)}</td><td class="text-right">${d.gstPct}%</td><td class="text-right">${fmt(d.totGst)}</td><td class="text-right">${fmt(d.totalAmount)}</td></tr>`).join("")}</tbody></table><br/><div class="text-right bold">Grand Total: ₹${fmt(totals.totalAmount)}</div><p>Rupees ${numberToWords(Math.round(totals.totalAmount))}</p></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

export default function PurchaseOrderPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [indents, setIndents] = useState([]);
  const [items, setItems] = useState([]);
  const [terms, setTerms] = useState([]);
  const [pos, setPos] = useState([]);
  const [company, setCompany] = useState(null);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [header, setHeader] = useState(emptyHeader());
  const [details, setDetails] = useState([emptyDetail()]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstType, setGstType] = useState("local");
  const [loadingList, setLoadingList] = useState(true);
  const [setLoadingSuppliers] = useState(false);
  const [formError, setFormError] = useState(null);
  const [setListError] = useState(null);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingSelected, setPendingSelected] = useState(new Set());
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLookups(); loadPos(); openNew();
  }, []);

  async function loadLookups() {
    try {
      const [supps, inds, its, pterms, comp] = await Promise.all([
        purchaseOrderApi.getSuppliers(), purchaseOrderApi.getIndents(), itemApi.getAll(), paymentTermsApi.getAll(),
        fetch("/api/company").then(res => res.json()).catch(() => null)
      ]);
      setSuppliers(Array.isArray(supps) ? supps : []);
      setIndents(Array.isArray(inds) ? inds : []);
      setItems(Array.isArray(its) ? its : []);
      setTerms(Array.isArray(pterms) ? pterms : []);
      setCompany(comp);
    } catch (e) { console.error(e); }
  }

  async function loadPos() {
    setLoadingList(true); try { const data = await purchaseOrderApi.getAll(); setPos(Array.isArray(data) ? data : []); } catch (err) { setListError(err.message); } finally { setLoadingList(false); }
  }

  async function openNew() {
    setHeader(emptyHeader()); setDetails([emptyDetail()]); setEditId(null); setView("form");
    try { const res = await purchaseOrderApi.getNextNumber(); if (res?.poNo) setHeader(h => ({ ...h, poNo: res.poNo })); } catch (e) { }
  }

  function openEdit(po) {
    setEditId(sid(po)); setHeader({ ...po, supplierId: sid(po.supplierId), paymentTermsId: sid(po.paymentTermsId) });
    setDetails(safeDetails(po.details).map(d => ({ ...d, _rowId: Math.random(), indentDetailId: sid(d.indentDetailId), itemId: sid(d.itemId) })));
    setGstType(po.gstType || "local"); setGstEnabled(po.gstEnabled !== false); setView("form");
  }

  const calcRow = (row) => {
    const qty = Number(row.poQty || 0); const rate = Number(row.poRate || 0);
    let disc = 0;
    if (row.discMode === 'pct') disc = (qty * rate) * (Number(row.discPct || 0) / 100);
    else disc = Number(row.discPrice || 0);
    const amt = (qty * rate) - disc;
    const gPct = Number(row.gstPct || 0);
    const tax = gstEnabled ? (amt * gPct / 100) : 0;
    return {
      ...row, poAmount: amt, totGst: tax, totalAmount: amt + tax,
      sgst: gstType === 'local' ? tax / 2 : 0, cgst: gstType === 'local' ? tax / 2 : 0, igst: gstType === 'other' ? tax : 0
    };
  };

  function updateDetail(idx, field, val) {
    setDetails(prev => {
      const rows = [...prev];
      let row = { ...rows[idx], [field]: val };
      if (field === "indentDetailId") {
        const opt = indentDetailOptions.find(o => o.detailId === val);
        if (opt) { row.itemId = opt.itemId; row.itemName = opt.itemName; row.uom = opt.uom; row.balQty = opt.balQty; row.poRate = opt.lastRate || 0; row.gstPct = opt.gstPct || 18; }
      }
      rows[idx] = calcRow(row);
      return rows;
    });
  }

  function toggleDiscMode(idx) {
    setDetails(prev => {
      const rows = [...prev];
      rows[idx] = calcRow({ ...rows[idx], discMode: rows[idx].discMode === 'pct' ? 'price' : 'pct' });
      return rows;
    });
  }

  function addRow() { setDetails(p => [...p, emptyDetail()]); }
  function removeRow(idx) { setDetails(p => p.filter((_, i) => i !== idx)); }

  async function handleSave() {
    if (!header.poNo.trim()) return setFormError("PO No is required");
    setSaving(true);
    const payload = { ...header, gstEnabled, gstType, details: details.map(({ _rowId, ...rest }) => rest) };
    try {
      if (editId) await purchaseOrderApi.update(editId, payload);
      else await purchaseOrderApi.create(payload);
      setSaveSuccessModal(true);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  }

  const totals = details.reduce((acc, r) => ({
    poAmount: acc.poAmount + r.poAmount, totGst: acc.totGst + r.totGst, totalAmount: acc.totalAmount + r.totalAmount
  }), { poAmount: 0, totGst: 0, totalAmount: 0 });

  const safeDetails = (d) => Array.isArray(d) ? d : [];
  const indentDetailOptions = indents.flatMap(ind => safeDetails(ind.details).map(d => ({
    indentNo: ind.indentNo, detailId: sid(d.id || d._id), itemId: sid(d.itemId), itemName: toTitleCase(d.itemName), uom: d.uom, balQty: d.indentQty, lastRate: d.rate, gstPct: d.gstPct
  })));

  const pendingIndentRows = indents.flatMap(ind => safeDetails(ind.details).filter(d => (d.indentQty || 0) > 0).map(d => ({
    rowId: `${sid(ind.id || ind._id)}-${sid(d.id || d._id)}`, indentNo: ind.indentNo, detailId: sid(d.id || d._id), itemId: sid(d.itemId), itemName: toTitleCase(d.itemName), uom: d.uom, balQty: d.indentQty, rate: d.rate, gstPct: d.gstPct
  })));

  function addPendingLinesToDetails() {
    const selected = pendingIndentRows.filter(r => pendingSelected.has(r.rowId));
    const newRows = selected.map(s => calcRow({
      ...emptyDetail(), indentDetailId: s.detailId, itemId: s.itemId, itemName: s.itemName, uom: s.uom, balQty: s.balQty, poQty: s.balQty, poRate: s.rate || 0, gstPct: s.gstPct || 18
    }));
    setDetails(p => [...p.filter(r => r.itemId), ...newRows]);
    setPendingModalOpen(false); setPendingSelected(new Set());
  }

  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div><h1 className="inv-page-title">Purchase Orders</h1><p className="inv-page-sub">Manage vendor procurement orders</p></div>
          <button className="inv-btn-primary" onClick={openNew}>+ New Order</button>
        </div>
        <div className="inv-card">
          <table className="inv-table">
            <thead>
              <tr><th>PO No</th><th>Date</th><th>Supplier</th><th>Status</th><th>Total Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {pos.map(po => (
                <tr key={sid(po)}>
                  <td>{po.poNo}</td><td>{po.date}</td><td>{po.supplierName}</td>
                  <td><span className={`inv-badge ${po.status === 'Open' ? 'inv-badge-yes' : 'inv-badge-no'}`}>{po.status}</span></td>
                  <td>₹{fmt(safeDetails(po.details).reduce((s, d) => s + (d.totalAmount || 0), 0))}</td>
                  <td>
                    <div className="inv-actions">
                      <button className="inv-btn-icon" onClick={() => openEdit(po)}>Edit</button>
                      <button className="inv-btn-icon inv-btn-danger">Del</button>
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
        <div><h1 className="inv-page-title">{editId ? "Edit Purchase Order" : "New Purchase Order"}</h1><p className="inv-page-sub">Header-Detail-Summary layout</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>Save Order</button>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>View List</button>
          <button className="inv-btn-ghost" onClick={() => printPurchaseOrder({ header, details, totals, gstEnabled, gstType, company })}>Print</button>
        </div>
      </div>

      {formError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-section-label">Header</div>
            <FormGrid>
              <Field label="PO No (Auto)"><input className="inv-input" value={header.poNo} readOnly style={{ background: "#f8f7ff", color: "#4f46e5", fontWeight: 600 }} /></Field>
              <Field label="Date"><input className="inv-input" type="date" value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} /></Field>
              <Field label="Supplier">
                <select className="inv-input" value={header.supplierId} onChange={e => {
                  const s = suppliers.find(x => sid(x) === e.target.value);
                  setHeader(h => ({ ...h, supplierId: e.target.value, supplierName: toTitleCase(s?.supplierName || ""), supplierAddress: s?.address || "", supplierGst: s?.gstNo || "" }));
                  if (s?.gstType) setGstType(s.gstType);
                }}>
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={sid(s)} value={sid(s)}>{s.supplierName}</option>)}
                </select>
              </Field>
              <Field label="Address"><textarea className="inv-input" rows={1} value={header.supplierAddress} onChange={e => setHeader(h => ({ ...h, supplierAddress: e.target.value }))} /></Field>
              <Field label="GST No"><input className="inv-input" value={header.supplierGst} onChange={e => setHeader(h => ({ ...h, supplierGst: e.target.value }))} /></Field>
              <Field label="GST Type">
                <select className="inv-input" value={gstType} onChange={e => setGstType(e.target.value)}>
                  <option value="local">Local (SGST+CGST)</option>
                  <option value="other">Other State (IGST)</option>
                </select>
              </Field>
            </FormGrid>
          </div>
        </div>

        <div className="inv-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="inv-card-body" style={{ minHeight: "400px", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fcfdfe", borderBottom: "1px solid #e2e8f0" }}>
              <div className="inv-section-label" style={{ marginBottom: 0, padding: 0 }}>Item Details</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="inv-btn-secondary inv-btn-sm" onClick={() => setPendingModalOpen(true)} style={{ borderRadius: 4 }}>+ Pick Indent</button>
                <button className="inv-btn-primary inv-btn-sm" onClick={addRow} style={{ borderRadius: 4 }}>+ Add Row</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table-premium">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: "center" }}>#</th>
                    <th style={{ minWidth: 250 }}>Item Description</th>
                    <th style={{ width: 80 }}>UOM</th>
                    <th style={{ width: 80, textAlign: "right" }}>Bal</th>
                    <th style={{ width: 100, textAlign: "right" }}>PO Qty</th>
                    <th style={{ width: 100, textAlign: "right" }}>Rate</th>
                    <th style={{ width: 100, textAlign: "right" }}>Disc</th>
                    <th style={{ width: 110, textAlign: "right" }}>PO Amt</th>
                    {gstEnabled && <>
                      <th style={{ width: 70, textAlign: "center" }}>GST%</th>
                      <th style={{ width: 90, textAlign: "right" }}>{gstType === 'local' ? 'SGST' : 'IGST'}</th>
                      {gstType === 'local' && <th style={{ width: 90, textAlign: "right" }}>CGST</th>}
                    </>}
                    <th style={{ width: 120, textAlign: "right" }}>Total</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => (
                    <tr key={row._rowId}>
                      <td style={{ textAlign: "center", color: "#94a3b8", fontWeight: 500 }}>{idx + 1}</td>
                      <td>
                        <select className="inv-select-cell" value={row.indentDetailId} onChange={e => updateDetail(idx, "indentDetailId", e.target.value)}>
                          <option value="">— select item —</option>
                          {indentDetailOptions.map(o => <option key={o.detailId} value={o.detailId}>[{o.indentNo}] {o.itemName}</option>)}
                        </select>
                      </td>
                      <td><input className="inv-input-cell" value={row.uom} readOnly /></td>
                      <td><input className="inv-input-cell" value={fmtQty(row.balQty)} readOnly style={{ textAlign: "right" }} /></td>
                      <td><input className="inv-input-cell" type="number" value={row.poQty} onChange={e => updateDetail(idx, "poQty", e.target.value)} style={{ textAlign: "right", fontWeight: 600, color: "#3b6ef8" }} /></td>
                      <td><input className="inv-input-cell" type="number" value={row.poRate} onChange={e => updateDetail(idx, "poRate", e.target.value)} style={{ textAlign: "right" }} /></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input className="inv-input-cell" type="number" value={row.discMode === 'pct' ? row.discPct : row.discPrice} onChange={e => updateDetail(idx, row.discMode === 'pct' ? 'discPct' : 'discPrice', e.target.value)} style={{ textAlign: "right", flex: 1 }} />
                          <button type="button" onClick={() => toggleDiscMode(idx)} style={{ fontSize: 10, border: "none", background: "#f1f5f9", padding: "4px 6px", cursor: "pointer", color: "#64748b", fontWeight: 700 }}>{row.discMode === 'pct' ? '%' : '₹'}</button>
                        </div>
                      </td>
                      <td><input className="inv-input-cell" value={fmt(row.poAmount)} readOnly style={{ textAlign: "right", color: "#1e293b", fontWeight: 500 }} /></td>
                      {gstEnabled && (
                        <>
                          <td><input className="inv-input-cell" type="number" value={row.gstPct} onChange={e => updateDetail(idx, "gstPct", e.target.value)} style={{ textAlign: "center" }} /></td>
                          <td><input className="inv-input-cell" value={fmt(gstType === 'other' ? row.igst : row.sgst)} readOnly style={{ textAlign: "right" }} /></td>
                          {gstType === 'local' && <td><input className="inv-input-cell" value={fmt(row.cgst)} readOnly style={{ textAlign: "right" }} /></td>}
                        </>
                      )}
                      <td><input className="inv-input-cell" value={fmt(row.totalAmount)} readOnly style={{ textAlign: "right", fontWeight: 700, background: "#f8fafc", color: "#3b6ef8" }} /></td>
                      <td style={{ textAlign: "center" }}>
                        <button className="inv-btn-icon inv-btn-danger" onClick={() => removeRow(idx)} style={{ border: "none", background: "transparent" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-section-label">Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "40px" }}>
              <Field label="Remarks"><textarea className="inv-input" rows={4} value={header.remarks} onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))} placeholder="Enter shipping instructions, payment terms, or other notes..." /></Field>
              <div style={{ display: "flex", flexDirection: "column", background: "#fcfdfe", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div className="inv-summary-row"><span>Gross Amount</span><span>₹{fmt(totals.poAmount)}</span></div>
                {gstEnabled && <div className="inv-summary-row"><span>Total GST</span><span>₹{fmt(totals.totGst)}</span></div>}
                <div className="inv-summary-row grand-total"><span>Grand Total</span><span>₹{fmt(totals.totalAmount)}</span></div>
                <div style={{ fontSize: 11, color: "#64748b", textAlign: "right", marginTop: 12, fontStyle: "italic" }}>{numberToWords(Math.round(totals.totalAmount))}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pendingModalOpen && (
        <Modal title="Pick Pending Indent Lines" onClose={() => setPendingModalOpen(false)} onSave={addPendingLinesToDetails} saveLabel="Add to PO">
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr><th><input type="checkbox" onChange={e => { if (e.target.checked) setPendingSelected(new Set(pendingIndentRows.map(r => r.rowId))); else setPendingSelected(new Set()); }} /></th><th>Indent</th><th>Item</th><th>Bal Qty</th></tr>
              </thead>
              <tbody>
                {pendingIndentRows.map(r => (
                  <tr key={r.rowId}>
                    <td><input type="checkbox" checked={pendingSelected.has(r.rowId)} onChange={() => { const n = new Set(pendingSelected); if (n.has(r.rowId)) n.delete(r.rowId); else n.add(r.rowId); setPendingSelected(n); }} /></td>
                    <td>{r.indentNo}</td><td>{r.itemName}</td><td>{fmtQty(r.balQty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {saveSuccessModal && (
        <Modal title="Success" onClose={() => setSaveSuccessModal(false)} onSave={() => { setSaveSuccessModal(false); setView("list"); }} saveLabel="Go to List">
          <div style={{ textAlign: "center", padding: 20 }}><div style={{ fontSize: 48, color: "#10b981" }}>✓</div><h3 style={{ fontSize: 18, fontWeight: 600 }}>Saved Successfully!</h3><p style={{ color: "#64748b" }}>The Purchase Order has been recorded.</p></div>
        </Modal>
      )}
    </div>
  );
}
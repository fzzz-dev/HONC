import { useState, useEffect, useCallback } from "react";
import {
  grnApi,
  supplierApi,
  storeApi,
  itemApi,
  purchaseOrderApi,
  purchaseIndentApi,
} from "../../services/inventoryApi";
import Modal from "../../components/Modal";

const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(),
  indentNo: "",
  poNo: "",
  poDate: "",
  itemName: "",
  uom: "",
  poQty: 0,
  alGrnQty: 0,
  balQty: 0,
  grnQty: 0,
  poRate: 0,
  grnRate: 0,
  discPct: 0,
  grnAmount: 0,
  gstPct: 18,
  sgst: 0,
  cgst: 0,
  igst: 0,
  totGst: 0,
  totalAmount: 0,
  remarks: "",
});

function calcRow(row) {
  const grnAmt = row.grnQty * row.grnRate * (1 - row.discPct / 100);
  const gst = grnAmt * (row.gstPct / 100);
  return {
    ...row,
    grnAmount: +grnAmt.toFixed(2),
    sgst: +(gst / 2).toFixed(2),
    cgst: +(gst / 2).toFixed(2),
    igst: 0,
    totGst: +gst.toFixed(2),
    totalAmount: +(grnAmt + gst).toFixed(2),
  };
}

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PurchaseGRNPage() {
  const today = new Date().toISOString().split("T")[0];

  // ── State ──
  const [grns, setGrns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [pos, setPos] = useState([]);
  const [indents, setIndents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingSelected, setPendingSelected] = useState(new Set());
  const [pendingPoRows, setPendingPoRows] = useState([]);

  const [header, setHeader] = useState({
    grnNo: "AUTO",
    date: today,
    supplierId: "",
    supplierName: "",
    storeId: "",
    storeName: "",
    invoiceNo: "",
    invoiceDate: today,
  });
  const [details, setDetails] = useState([emptyDetail()]);

  // ── Fetch ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [grnData, suppData, storeData, itemData, poData, indData] = await Promise.all([
        grnApi.getAll(),
        supplierApi.getAll(),
        storeApi.getAll(),
        itemApi.getAll(),
        purchaseOrderApi.getAll(),
        purchaseIndentApi.getAll(),
      ]);
      setGrns(grnData || []);
      setSuppliers(suppData || []);
      setStores(storeData || []);
      setItems(itemData || []);
      setPos(poData || []);
      setIndents(indData || []);
    } catch (err) {
      console.error("Failed to load GRN data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers ──
  async function openNew() {
    setHeader({
      grnNo: "AUTO",
      date: today,
      supplierId: "",
      supplierName: "",
      storeId: "",
      storeName: "",
      invoiceNo: "",
      invoiceDate: today,
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setView("form");
    try {
      const res = await grnApi.getNextNumber();
      if (res?.nextGRNNo) setHeader(h => ({ ...h, grnNo: res.nextGRNNo }));
    } catch (e) { console.error("Failed to get next GRN number", e); }
  }

  function openEdit(rec) {
    setHeader({
      grnNo: rec.grnNo,
      date: rec.date,
      supplierId: rec.supplierId,
      supplierName: rec.supplierName,
      storeId: rec.storeId,
      storeName: rec.storeName,
      invoiceNo: rec.invoiceNo || "",
      invoiceDate: rec.invoiceDate || today,
    });
    setDetails((rec.details || []).map((d) => ({ ...d, _rowId: Math.random() })));
    setEditId(rec.id);
    setView("form");
  }

  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      let row = {
        ...rows[idx],
        [field]: isNaN(val) || typeof val === "string" ? val : +val,
      };

      if (field === "poNo") {
        const po = pos.find((p) => p.poNo === val);
        if (po) row.poDate = po.date || "";
      }

      if (field === "itemName") {
        const found = items.find((it) => it.itemName === val);
        row.uom = found?.uom || "";
        row.poRate = found?.rate || 0;
        row.grnRate = found?.rate || 0;
      }

      row = calcRow(row);
      rows[idx] = row;
      return rows;
    });
  }

  async function handleSave() {
    if (!header.supplierId) return alert("Supplier is required");
    if (!header.storeId) return alert("Store is required");

    try {
      setSaving(true);
      const payload = { ...header, details };
      if (editId) {
        await grnApi.update(editId, payload);
      } else {
        if (payload.grnNo === "AUTO") payload.grnNo = "GRN-" + Date.now();
        await grnApi.create(payload);
      }
      await loadData();
      setView("list");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this GRN?")) return;
    try {
      await grnApi.remove(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  const totals = details.reduce(
    (acc, r) => ({
      grnAmount: acc.grnAmount + (r.grnAmount || 0),
      sgst: acc.sgst + (r.sgst || 0),
      cgst: acc.cgst + (r.cgst || 0),
      igst: acc.igst + (r.igst || 0),
      totGst: acc.totGst + (r.totGst || 0),
      totalAmount: acc.totalAmount + (r.totalAmount || 0),
    }),
    { grnAmount: 0, sgst: 0, cgst: 0, igst: 0, totGst: 0, totalAmount: 0 },
  );

  async function openPendingModal() {
    if (!header.supplierId) return alert("Please select a supplier first");
    try {
      const data = await grnApi.getPendingPOItems(header.supplierId);
      setPendingPoRows(data || []);
      setPendingModalOpen(true);
    } catch (err) {
      alert("Failed to fetch pending items: " + err.message);
    }
  }

  function addPendingLinesToDetails() {
    const selected = pendingPoRows.filter(r => pendingSelected.has(r.rowId || `${r.poId}-${r.poDetailId}`));
    const newRows = selected.map(s => calcRow({
      ...emptyDetail(),
      poId: s.poId,
      poNo: s.poNo,
      poDate: s.poDate,
      itemId: s.itemId,
      itemName: s.itemName,
      uom: s.uom,
      poQty: s.poQty,
      alGrnQty: s.alGrnQty,
      balQty: s.balQty,
      grnQty: s.balQty,
      poRate: s.poRate,
      grnRate: s.poRate,
      gstPct: s.gstPct
    }));
    // Remove the first empty row if it's still empty
    setDetails(p => {
      const filtered = p.filter(r => r.itemName || r.poNo);
      return [...filtered, ...newRows];
    });
    setPendingModalOpen(false);
    setPendingSelected(new Set());
  }

  if (loading && view === "list") return <div className="inv-empty">Loading...</div>;

  /* ── LIST ── */
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Purchase GRN</h1>
            <p className="inv-page-sub">Goods receipt note management</p>
          </div>
          <button className="inv-btn-primary" onClick={openNew}>+ New GRN</button>
        </div>
        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>GRN No</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Store</th>
                    <th>Items</th>
                    <th>Total Amt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.length === 0 && (
                    <tr><td colSpan={8} className="inv-empty">No records found</td></tr>
                  )}
                  {grns.map((rec, i) => {
                    let safeDetails = Array.isArray(rec.details) ? rec.details : [];
                    if (!Array.isArray(rec.details) && typeof rec.details === 'string') {
                      try { safeDetails = JSON.parse(rec.details); } catch (e) { }
                    }
                    const amt = safeDetails.reduce((s, d) => s + Number(d.totalAmount || 0), 0);
                    return (
                      <tr key={rec.id}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{rec.grnNo}</td>
                        <td>{rec.date}</td>
                        <td>{rec.supplierName}</td>
                        <td>{rec.storeName}</td>
                        <td className="inv-muted-sm">{safeDetails.length} items</td>
                        <td>₹{fmt(amt)}</td>
                        <td>
                          <div className="inv-actions">
                            <button className="inv-btn-icon" onClick={() => openEdit(rec)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button className="inv-btn-icon inv-btn-danger" onClick={() => handleDelete(rec.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
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
        </div>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">{editId ? "Edit GRN" : "New Purchase GRN"}</h1>
          <p className="inv-page-sub">Record goods received against purchase orders</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>View GRN</button>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save GRN"}</button>
        </div>
      </div>

      {pendingModalOpen && (
        <Modal
          title="Pick Pending PO Items"
          onClose={() => setPendingModalOpen(false)}
          onSave={addPendingLinesToDetails}
          saveLabel="Add Selected"
        >
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setPendingSelected(new Set(pendingPoRows.map(r => r.rowId)));
                    else setPendingSelected(new Set());
                  }} /></th>
                  <th>PO No</th>
                  <th>Item Name</th>
                  <th>Bal Qty</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {pendingPoRows.length === 0 && (
                  <tr><td colSpan={5} className="inv-empty">No pending PO items found {header.supplierId ? "for this supplier" : ""}</td></tr>
                )}
                {pendingPoRows.map(r => {
                  const rowId = r.rowId || `${r.poId}-${r.poDetailId}`;
                  return (
                    <tr key={rowId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={pendingSelected.has(rowId)}
                          onChange={() => {
                            const next = new Set(pendingSelected);
                            if (next.has(rowId)) next.delete(rowId);
                            else next.add(rowId);
                            setPendingSelected(next);
                          }}
                        />
                      </td>
                      <td>{r.poNo}</td>
                      <td>{r.itemName}</td>
                      <td>{r.balQty}</td>
                      <td>₹{r.poRate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Header</div>
          <div className="inv-form-row cols-4">
            <div className="inv-field">
              <label className="inv-label">GRN No</label>
              <input className="inv-input" value={header.grnNo} readOnly style={{ background: "#f8f9fa" }} />
            </div>
            <div className="inv-field">
              <label className="inv-label">GRN Date</label>
              <input className="inv-input" type="date" value={header.date} readOnly style={{ background: "#f8f9fa" }} />
            </div>
            <div className="inv-field">
              <label className="inv-label">Supplier *</label>
              <select className="inv-input" value={header.supplierId} onChange={(e) => {
                const s = suppliers.find(x => String(x.id || x._id) === e.target.value);
                setHeader(h => ({ ...h, supplierId: e.target.value, supplierName: s?.supplierName || "" }));
              }}>
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id || s._id} value={String(s.id || s._id)}>{s.supplierName}</option>)}
              </select>
            </div>
            <div className="inv-field">
              <label className="inv-label">Store *</label>
              <select className="inv-input" value={header.storeId} onChange={(e) => {
                const st = stores.find(x => String(x.id || x._id) === e.target.value);
                setHeader(h => ({ ...h, storeId: e.target.value, storeName: st?.name || "" }));
              }}>
                <option value="">Select store</option>
                {stores.map(st => <option key={st.id || st._id} value={String(st.id || st._id)}>{st.name}</option>)}
              </select>
            </div>
          </div>
          <div className="inv-form-row cols-4" style={{ marginTop: 12 }}>
            <div className="inv-field">
              <label className="inv-label">INV\PDC no</label>
              <input className="inv-input" value={header.invoiceNo} onChange={(e) => setHeader(h => ({ ...h, invoiceNo: e.target.value }))} placeholder="Enter Invoice Number" />
            </div>
            <div className="inv-field">
              <label className="inv-label">INV\DATE</label>
              <input className="inv-input" type="date" value={header.invoiceDate} onChange={(e) => setHeader(h => ({ ...h, invoiceDate: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div className="inv-section-label">Details</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="inv-btn-secondary inv-btn-sm" onClick={openPendingModal}>Pending</button>
              <button className="inv-btn-secondary inv-btn-sm" onClick={() => setDetails(p => [...p, emptyDetail()])}>+ Add Row</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>PO No</th>
                  <th>PO Date</th>
                  <th>Item Name</th>
                  <th>UOM</th>
                  <th>PO Qty</th>
                  <th>Bal Qty</th>
                  <th>GRN Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={row._rowId}>
                    <td>{idx + 1}</td>
                    <td>
                      <input className="inv-input" style={{ border: "none", width: 100 }} value={row.poNo} readOnly placeholder="PO No" />
                    </td>
                    <td><input className="inv-input" style={{ border: "none", width: 100 }} value={row.poDate} readOnly /></td>
                    <td>
                      <select className="inv-input" style={{ border: "none", width: 180 }} value={row.itemName} onChange={e => updateDetail(idx, "itemName", e.target.value)}>
                        <option value="">Select item</option>
                        {items.map(it => <option key={it.id || it._id} value={it.itemName}>{it.itemName}</option>)}
                      </select>
                    </td>
                    <td>{row.uom || "—"}</td>
                    <td><input className="inv-input" style={{ border: "none", width: 70, textAlign: 'right' }} value={row.poQty} readOnly /></td>
                    <td><input className="inv-input" style={{ border: "none", width: 70, textAlign: 'right' }} value={row.balQty} readOnly /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80, textAlign: 'right', fontWeight: 600, color: '#3b6ef8' }} value={row.grnQty} onChange={e => updateDetail(idx, "grnQty", e.target.value)} /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80, textAlign: 'right' }} value={row.grnRate} onChange={e => updateDetail(idx, "grnRate", e.target.value)} /></td>
                    <td style={{ textAlign: "right", paddingRight: 10 }}>{fmt(row.totalAmount)}</td>
                    <td>
                      <button className="inv-btn-icon inv-btn-danger" onClick={() => setDetails(p => p.filter((_, i) => i !== idx))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

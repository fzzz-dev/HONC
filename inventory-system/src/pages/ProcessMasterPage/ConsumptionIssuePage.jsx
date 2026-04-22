import { useState, useEffect, useCallback } from "react";
import {
  consumptionIssueApi,
  departmentApi,
  storeApi,
  itemApi,
  grnApi,
} from "../../services/inventoryApi";

const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(),
  category: "",
  subCategory: "",
  itemName: "",
  grnNo: "",
  stkQty: 0,
  issueQty: 0,
  rate: 0,
  amount: 0,
});

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ConsumptionIssuePage() {
  const today = new Date().toISOString().split("T")[0];
  
  // ── State ──
  const [issues, setIssues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [grns, setGrns] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [header, setHeader] = useState({
    issNo: "",
    date: today,
    departmentId: "",
    departmentName: "",
    storeId: "",
    storeName: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);

  // ── Fetch ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [issData, deptData, storeData, itemData, grnData] = await Promise.all([
        consumptionIssueApi.getAll(),
        departmentApi.getAll(),
        storeApi.getAll(),
        itemApi.getAll(),
        // Assuming grnApi.getAll() exists or similar
        fetch("/api/grns").then(r => r.json()).then(r => r.data || []),
      ]);
      setIssues(issData || []);
      setDepartments(deptData || []);
      setStores(storeData || []);
      setItems(itemData || []);
      setGrns(grnData || []);
    } catch (err) {
      console.error("Failed to load consumption data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Handlers ──
  function openNew() {
    setHeader({
      issNo: "AUTO", // Backend should handle numbering or we generate
      date: today,
      departmentId: "",
      departmentName: "",
      storeId: "",
      storeName: "",
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setView("form");
  }

  function openEdit(rec) {
    setHeader({
      issNo: rec.issNo,
      date: rec.date,
      departmentId: rec.departmentId,
      departmentName: rec.departmentName,
      storeId: rec.storeId,
      storeName: rec.storeName,
    });
    setDetails((rec.details || []).map((d) => ({ ...d, _rowId: Math.random() })));
    setEditId(rec.id);
    setView("form");
  }

  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };

      if (field === "itemName") {
        const found = items.find((it) => it.itemName === val);
        row.category = found?.head || found?.category || "";
        row.subCategory = found?.subCategory || "";
        row.rate = found?.rate || 0;
      }

      const issQty = field === "issueQty" ? +val : +row.issueQty;
      const rate = field === "rate" ? +val : +row.rate;
      row.amount = +(issQty * rate).toFixed(2);

      rows[idx] = row;
      return rows;
    });
  }

  async function handleSave() {
    if (!header.departmentId) return alert("Department is required");
    if (!header.storeId) return alert("Store is required");
    
    try {
      setSaving(true);
      const payload = { ...header, details };
      if (editId) {
        await consumptionIssueApi.update(editId, payload);
      } else {
        // If issNo is "AUTO", let backend generate or just use a timestamp for now
        if (payload.issNo === "AUTO") payload.issNo = "ISS-" + Date.now();
        await consumptionIssueApi.create(payload);
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
    if (!window.confirm("Delete this issue?")) return;
    try {
      await consumptionIssueApi.remove(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  const totals = details.reduce(
    (acc, r) => ({
      issueQty: acc.issueQty + Number(r.issueQty || 0),
      amount: acc.amount + Number(r.amount || 0),
    }),
    { issueQty: 0, amount: 0 },
  );

  if (loading && view === "list") return <div className="inv-empty">Loading...</div>;

  /* ── LIST ── */
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Consumption Issue</h1>
            <p className="inv-page-sub">Manage material issue to departments</p>
          </div>
          <button className="inv-btn-primary" onClick={openNew}>
            + New Issue
          </button>
        </div>
        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ISS No</th>
                    <th>Date</th>
                    <th>Department</th>
                    <th>Store</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Total Amt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.length === 0 && (
                    <tr>
                      <td colSpan={9} className="inv-empty">No records found</td>
                    </tr>
                  )}
                  {issues.map((rec, i) => {
                    const qty = (rec.details || []).reduce((s, d) => s + Number(d.issueQty || 0), 0);
                    const amt = (rec.details || []).reduce((s, d) => s + Number(d.amount || 0), 0);
                    return (
                      <tr key={rec.id}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{rec.issNo}</td>
                        <td>{rec.date}</td>
                        <td>{rec.departmentName}</td>
                        <td>{rec.storeName}</td>
                        <td className="inv-muted-sm">{rec.details?.length || 0} items</td>
                        <td>{fmt(qty)}</td>
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
          <h1 className="inv-page-title">{editId ? "Edit Issue" : "New Consumption Issue"}</h1>
          <p className="inv-page-sub">Issue materials from store to department</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>← Back</button>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Issue"}</button>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Header</div>
          <div className="inv-form-row cols-4">
             <div className="inv-field">
              <label className="inv-label">ISS No</label>
              <input className="inv-input" value={header.issNo} readOnly style={{ background: "#f8f9fa" }} />
            </div>
            <div className="inv-field">
              <label className="inv-label">Date</label>
              <input className="inv-input" type="date" value={header.date} onChange={(e) => setHeader(h => ({ ...h, date: e.target.value }))} />
            </div>
            <div className="inv-field">
              <label className="inv-label">Department *</label>
              <select className="inv-input" value={header.departmentId} onChange={(e) => {
                const d = departments.find(x => String(x.id) === e.target.value);
                setHeader(h => ({ ...h, departmentId: e.target.value, departmentName: d?.name || "" }));
              }}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </div>
            <div className="inv-field">
              <label className="inv-label">Store *</label>
              <select className="inv-input" value={header.storeId} onChange={(e) => {
                const s = stores.find(x => String(x.id) === e.target.value);
                setHeader(h => ({ ...h, storeId: e.target.value, storeName: s?.name || "" }));
              }}>
                <option value="">Select store</option>
                {stores.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div className="inv-section-label">Details</div>
            <button className="inv-btn-secondary inv-btn-sm" onClick={() => setDetails(p => [...p, emptyDetail()])}>+ Add Row</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>GRN No</th>
                  <th>Stk Qty</th>
                  <th>Issue Qty</th>
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
                      <select className="inv-input" style={{ border: "none", width: 200 }} value={row.itemName} onChange={e => updateDetail(idx, "itemName", e.target.value)}>
                        <option value="">Select item</option>
                        {items.map(it => <option key={it.id} value={it.itemName}>{it.itemName}</option>)}
                      </select>
                    </td>
                    <td>{row.category || "—"}</td>
                    <td>
                      <select className="inv-input" style={{ border: "none", width: 120 }} value={row.grnNo} onChange={e => updateDetail(idx, "grnNo", e.target.value)}>
                        <option value="">Select GRN</option>
                        {grns.map(g => <option key={g.id} value={g.grnNo}>{g.grnNo}</option>)}
                      </select>
                    </td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80 }} value={row.stkQty} onChange={e => updateDetail(idx, "stkQty", e.target.value)} /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80 }} value={row.issueQty} onChange={e => updateDetail(idx, "issueQty", e.target.value)} /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80 }} value={row.rate} onChange={e => updateDetail(idx, "rate", e.target.value)} /></td>
                    <td style={{ textAlign: "right" }}>{fmt(row.amount)}</td>
                    <td>
                      <button className="inv-btn-icon inv-btn-danger" onClick={() => setDetails(p => p.filter((_, i) => i !== idx))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: "right", fontWeight: 600 }}>Total</td>
                  <td>{fmt(totals.issueQty)}</td>
                  <td></td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>₹{fmt(totals.amount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  openingStockApi,
  inventoryHeadApi,
  mainCategoryApi,
  itemApi,
  storeApi,
} from "../../services/inventoryApi";
import { SearchSelect } from "../../components/FormFields";

const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(),
  categoryId: "",
  categoryName: "",
  itemId: "",
  itemName: "",
  qty: "0.000",
  rate: "0.00",
  amount: "0.00",
});

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtQty = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "12px" }}>{children}</div>
);

const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

export default function OpeningStockPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [header, setHeader] = useState({
    openingNo: "",
    date: today,
    asOnDate: today,
    storeId: "",
    storeName: "",
    remarks: "",
    preparedBy: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recData, catData, itemData, storeData] = await Promise.all([
        openingStockApi.getAll(),
        inventoryHeadApi.getAll(),
        itemApi.getAll(),
        storeApi.getAll(),
      ]);
      setRecords(recData?.data || recData || []);
      setCategories(catData?.data || catData || []);
      setItems(itemData?.data || itemData || []);
      setStores(storeData?.data || storeData || []);
    } catch (err) {
      console.error("Failed to load opening stock data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    openNew();
  }, [loadData]);

  async function openNew() {
    let nextNo = "";
    try {
      const res = await openingStockApi.getNextNumber();
      nextNo = res?.openingNo || "";
    } catch (err) {
      console.error("Failed to get next number", err);
    }

    setHeader({
      openingNo: nextNo,
      date: today,
      asOnDate: today,
      storeId: "",
      storeName: "",
      remarks: "",
      preparedBy: user?.name || "Admin",
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setView("form");
  }

  function openEdit(rec) {
    setHeader({
      openingNo: rec.openingNo,
      date: rec.date,
      asOnDate: rec.asOnDate,
      storeId: rec.storeId || "",
      storeName: rec.storeName || "",
      remarks: rec.remarks || "",
      preparedBy: rec.preparedBy || "",
    });
    setDetails((rec.details || []).map((d) => ({ ...d, _rowId: Math.random() })));
    setEditId(rec.id);
    setView("form");
  }

  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };

      if (field === "categoryId") {
        const cat = categories.find(c => String(c.id) === val);
        row.categoryName = cat?.headName || "";
        row.itemId = "";
        row.itemName = "";
      }
      
      if (field === "itemId") {
        const it = items.find(i => String(i.id) === val);
        row.itemName = it?.itemName || "";
        row.rate = it?.purchaseRate || it?.rate || 0;
      }

      const q = field === "qty" ? +val : +row.qty;
      const r = field === "rate" ? +val : +row.rate;
      row.amount = +(q * r).toFixed(2);

      rows[idx] = row;
      return rows;
    });
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = { ...header, details };
      if (editId) {
        await openingStockApi.update(editId, payload);
      } else {
        await openingStockApi.create(payload);
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
    if (!window.confirm("Delete this record?")) return;
    try {
      await openingStockApi.remove(id);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  const totals = details.reduce(
    (acc, r) => ({
      qty: acc.qty + Number(r.qty || 0),
      amount: acc.amount + Number(r.amount || 0),
    }),
    { qty: 0, amount: 0 }
  );

  if (loading && view === "list") return <div className="inv-empty">Loading...</div>;

  if (view === "list") {
    const filtered = records.filter(r => r.openingNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const exportToExcel = () => {
      const headers = ["Opening No", "Entry Date", "As On Date", "Store", "Total Lines", "Total Qty"];
      const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const rows = filtered.map(rec => {
        const det = Array.isArray(rec.details) ? rec.details : [];
        const qty = det.reduce((s, d) => s + Number(d.qty || 0), 0);
        return [rec.openingNo, rec.date, rec.asOnDate, rec.storeName, det.length, qty].map(escapeCsv).join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "opening_stock.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Opening Stock</h1>
            <p className="inv-page-sub">Initial inventory setup</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={exportToExcel}>Export to Excel</button>
            <button className="inv-btn-primary" onClick={openNew}>+ New Entry</button>
          </div>
        </div>

        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body">
            <div className="inv-field" style={{ minWidth: 400, maxWidth: 400 }}>
              <label className="inv-label">Search Opening No</label>
              <input 
                className="inv-input" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Type to search..." 
              />
            </div>
          </div>
        </div>

        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Opening No</th>
                    <th>Entry Date</th>
                    <th>As On Date</th>
                    <th>Store</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="inv-empty">No records found</td></tr>
                  )}
                  {filtered.map((rec, i) => {
                    const det = Array.isArray(rec.details) ? rec.details : [];
                    const qty = det.reduce((s, d) => s + Number(d.qty || 0), 0);
                    return (
                      <tr key={rec.id}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{rec.openingNo}</td>
                        <td>{rec.date}</td>
                        <td>{rec.asOnDate}</td>
                        <td>{rec.storeName}</td>
                        <td className="inv-muted-sm">{det.length} lines</td>
                        <td>{fmt(qty)}</td>
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

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">{editId ? "Edit Opening Stock" : "New Opening Stock"}</h1>
          <p className="inv-page-sub">Establish initial inventory levels</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>View List</button>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Entry"}</button>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">

          <FormGrid>
            <Field label="Opening No (Auto)">
              <input className="inv-input" value={header.openingNo} readOnly style={{ background: "#f8f9fa", color: "#4f46e5", fontWeight: 600 }} />
            </Field>
            <Field label="Entry Date">
              <input className="inv-input" type="date" value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} />
            </Field>
            <Field label="As On Date">
              <input className="inv-input" type="date" value={header.asOnDate} onChange={e => setHeader(h => ({ ...h, asOnDate: e.target.value }))} />
            </Field>
            <Field label="Store">
              <SearchSelect 
                value={header.storeId} 
                onChange={val => {
                  const s = stores.find(x => String(x.id) === val);
                  setHeader(h => ({ ...h, storeId: val, storeName: s?.name || "" }));
                }}
                options={stores.map(s => ({ value: String(s.id), label: s.name }))}
                placeholder="Select Store"
              />
            </Field>
          </FormGrid>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button className="inv-btn-secondary inv-btn-sm" onClick={() => setDetails(p => [...p, emptyDetail()])}>+ Add Row</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Material Category</th>
                  <th>Item Description</th>
                  <th style={{ width: 120 }}>Qty</th>
                  <th style={{ width: 120 }}>Unit Price</th>
                  <th style={{ width: 140 }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={row._rowId}>
                    <td>{idx + 1}</td>
                    <td>
                      <SearchSelect 
                        style={{ minWidth: 250, border: "none" }}
                        value={row.categoryId} 
                        onChange={val => updateDetail(idx, "categoryId", val)}
                        options={categories.map(c => ({ value: String(c.id), label: c.headName }))}
                        placeholder="Select Category"
                      />
                    </td>
                    <td>
                      <SearchSelect 
                        style={{ minWidth: 250, border: "none" }}
                        value={row.itemId} 
                        onChange={val => updateDetail(idx, "itemId", val)}
                        options={(row.categoryId ? items.filter(i => String(i.headId) === row.categoryId) : []).map(i => ({ value: String(i.id), label: i.itemDescription || i.itemName }))}
                        placeholder={row.categoryId ? "Select Item Description" : "Select Category First"}
                        disabled={!row.categoryId}
                      />
                    </td>
                    <td><input type="number" step="0.001" className="inv-input" style={{ border: "none" }} value={row.qty} onChange={e => updateDetail(idx, "qty", e.target.value)} onBlur={e => updateDetail(idx, "qty", Number(e.target.value || 0).toFixed(3))} /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none" }} value={row.rate} onChange={e => updateDetail(idx, "rate", e.target.value)} /></td>
                    <td style={{ textAlign: "right" }}>{fmt(row.amount)}</td>
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

      <div className="inv-card" style={{ marginTop: 20 }}>
        <div className="inv-card-body">

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 24 }}>
            <div className="inv-field-v">
              <label className="inv-label">Total Quantity</label>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{fmtQty(totals.qty)}</div>
            </div>
            <div className="inv-field-v">
              <label className="inv-label">Total Amount</label>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>₹{fmt(totals.amount)}</div>
            </div>
            <div className="inv-field-v">

              <input className="inv-input" value={header.preparedBy} onChange={e => setHeader(h => ({ ...h, preparedBy: e.target.value }))} placeholder="Name" />
            </div>
          </div>
          <div className="inv-field-v" style={{ marginTop: 16 }}>

            <textarea className="inv-input" style={{ height: 40, resize: "none" }} value={header.remarks} onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))} placeholder="Notes..." />
          </div>
        </div>
      </div>
    </div>
  );
}

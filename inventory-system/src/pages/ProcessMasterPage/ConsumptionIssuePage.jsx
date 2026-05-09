import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  consumptionIssueApi,
  departmentApi,
  storeApi,
  itemApi,
  grnApi,
} from "../../services/inventoryApi";
import { SearchSelect } from "../../components/FormFields";

const FormGrid = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>{children}</div>;
const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(),
  category: "",
  subCategory: "",
  itemName: "",
  grnNo: "",
  stkQty: 0,
  stkRate: 0,
  issueQty: 0,
  rate: 0,
  amount: 0,
  issueRemarks: "",
});

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getFY = () => {
  const d = new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return m < 4 ? `${y - 1}-${y}` : `${y}-${y + 1}`;
};


export default function ConsumptionIssuePage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  // ── State ──
  const [issues, setIssues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [grns, setGrns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [header, setHeader] = useState({
    issNo: "",
    date: today,
    issueType: "General",
    itemId: "",
    departmentId: "",
    departmentName: "",
    storeId: "",
    storeName: "",
    remarks: "",
    preparedBy: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);

  // ── Fetch ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [issData, deptData, storeData, itemData, grnRes] = await Promise.all([
        consumptionIssueApi.getAll(),
        departmentApi.getAll(),
        storeApi.getAll(),
        itemApi.getAll(),
        grnApi.getAll(),
      ]);
      setIssues(issData?.data || issData || []);
      setDepartments(deptData?.data || deptData || []);
      setStores(storeData?.data || storeData || []);
      setItems(itemData?.data || itemData || []);
      setGrns(grnRes?.data || grnRes || []);
    } catch (err) {
      console.error("Failed to load consumption data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    openNew();
  }, [loadData]);


  // ── Handlers ──
  async function openNew() {
    let nextNo = "";
    try {
      const res = await consumptionIssueApi.getNextNumber();
      nextNo = res?.issNo || "";
    } catch (err) {
      console.error("Failed to get next ISS number", err);
    }

    setHeader({
      issNo: nextNo,
      date: today,
      issueType: "General",
      itemId: "",
      departmentId: "",
      departmentName: "",
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
      issNo: rec.issNo,
      date: rec.date,
      issueType: rec.issueType || "General",
      itemId: rec.itemId || "",
      departmentId: rec.departmentId,
      departmentName: rec.departmentName,
      storeId: rec.storeId,
      storeName: rec.storeName,
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

      if (field === "itemName" || field === "grnNo") {
        const targetItem = field === "itemName" ? val : row.itemName;
        const targetGrn = field === "grnNo" ? val : row.grnNo;

        if (targetItem && targetGrn) {
          const g = grns.find(x => x.grnNo === targetGrn);
          if (g) {
            let gDetails = g.details || [];
            if (typeof gDetails === 'string') {
              try { gDetails = JSON.parse(gDetails); } catch (e) { gDetails = []; }
            }
            const gd = gDetails.find(d => String(d.itemDescription || d.itemName).toLowerCase() === String(targetItem).toLowerCase() || String(d.itemName).toLowerCase() === String(targetItem).toLowerCase());
            if (gd) {
              row.stkQty = gd.grnQty || 0;
              row.stkRate = gd.grnRate || 0;
              row.rate = gd.grnRate || 0;
            }
          }
        }
      }

      const issQty = field === "issueQty" ? +val : +row.issueQty;
      const rate = field === "rate" ? +val : +row.rate;
      row.amount = +(issQty * rate).toFixed(2);

      rows[idx] = row;
      return rows;
    });
  }

  function printIssue() {
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const company = JSON.parse(localStorage.getItem("company") || "{}");

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Consumption Issue ${esc(header.issNo)}</title>
  <style>
    @page { margin: 5mm; size: A5 landscape; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10px; margin: 0; padding: 0; color: #333; }
    .bold { font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .voucher-container { border: 2px solid #000; padding: 10px; min-height: 135mm; position: relative; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .header-table td { border: none; vertical-align: middle; }
    .title-banner { background: #000; color: #fff; padding: 5px; text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 10px; letter-spacing: 2px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .info-table td { border: 1px solid #000; padding: 4px 8px; width: 25%; }
    .label { font-size: 9px; color: #666; margin-bottom: 2px; }
    .value { font-size: 11px; font-weight: bold; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .items-table th { border: 1px solid #000; background: #f0f0f0; padding: 6px; font-size: 10px; }
    .items-table td { border: 1px solid #000; padding: 6px; }
    .remarks-box { border: 1px solid #000; padding: 8px; margin-top: 10px; min-height: 40px; }
    .footer-signatures { margin-top: 30px; display: flex; justify-content: space-between; padding: 0 20px; }
    .sig-box { text-align: center; border-top: 1px solid #000; width: 120px; padding-top: 5px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="voucher-container">
    <table class="header-table">
      <tr>
        <td style="width: 20%;">${company.logo ? `<img src="${company.logo}" style="max-height: 50px;" />` : `<div style="font-size: 20px; font-weight: bold; color: #666;">LOGO</div>`}</td>
        <td style="width: 60%; text-align: center;">
          <div style="font-size: 16px; font-weight: bold;">${esc(company.companyName || "HONC INVENTORY SYSTEM")}</div>
          <div style="font-size: 9px;">${esc(company.address || "123, Business Park, City, State - 000000")}</div>
          <div style="font-size: 9px;">GSTIN: ${esc(company.gstin || "33XXXXXXXXXXXXX")}</div>
        </td>
        <td style="width: 20%; text-align: right;"><div style="font-size: 8px;">Original Copy</div></td>
      </tr>
    </table>
    <div class="title-banner">CONSUMPTION ISSUE VOUCHER</div>
    <table class="info-table">
      <tr>
        <td><div class="label">Issue Number</div><div class="value">${esc(header.issNo)}</div></td>
        <td><div class="label">Issue Date</div><div class="value">${esc(new Date(header.date).toLocaleDateString("en-GB"))}</div></td>
        <td><div class="label">Issue Type</div><div class="value">${esc(header.issueType)}</div></td>
        <td><div class="label">Financial Year</div><div class="value">${esc(getFY())}</div></td>
      </tr>
      <tr>
        <td colspan="2"><div class="label">Issued To (Department)</div><div class="value">${esc(header.departmentName)}</div></td>
        <td colspan="2"><div class="label">Issued From (Store)</div><div class="value">${esc(header.storeName)}</div></td>
      </tr>
    </table>
    <table class="items-table">
      <thead><tr><th style="width: 50px;">S.No</th><th>Item Description</th><th>GRN No</th><th style="width: 80px;">Qty</th><th style="width: 80px;">Rate</th><th style="width: 100px;">Amount</th></tr></thead>
      <tbody>
        ${details.map((d, i) => `<tr><td class="text-center">${i + 1}</td><td>${esc(d.itemName)}</td><td class="text-center">${esc(d.grnNo)}</td><td class="text-right">${Number(d.issueQty).toFixed(2)}</td><td class="text-right">${Number(d.rate).toFixed(2)}</td><td class="text-right">${Number(d.amount).toFixed(2)}</td></tr>`).join("")}
      </tbody>
      <tfoot><tr class="bold"><td colspan="3" class="text-right">TOTAL</td><td class="text-right">${totals.issueQty.toFixed(2)}</td><td></td><td class="text-right">₹${totals.amount.toFixed(2)}</td></tr></tfoot>
    </table>
    <div class="remarks-box"><div class="label">General Remarks:</div><div style="font-size: 10px;">${esc(header.remarks || "No remarks")}</div></div>
    <div class="footer-signatures">
      <div class="sig-box"><div style="font-size: 9px; font-weight: normal; margin-bottom: 2px;">Prepared By</div>${esc(header.preparedBy || user?.name || "Admin")}</div>
      <div class="sig-box"><div style="font-size: 9px; font-weight: normal; margin-bottom: 2px;">Dept. Receiver</div>&nbsp;</div>
      <div class="sig-box"><div style="font-size: 9px; font-weight: normal; margin-bottom: 2px;">Store In-charge</div>&nbsp;</div>
    </div>
  </div>
  <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
</body>
</html>`;
    const w = window.open("", "_blank", "width=800,height=600");
    w.document.write(html);
    w.document.close();
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
    const filteredIssues = issues.filter(iss => iss.issNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const exportToExcel = () => {
      const headers = ["ISS No", "Date", "Department", "Store", "Total Items", "Total Qty", "Total Amount"];
      const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const rows = filteredIssues.map(rec => {
        let sd = Array.isArray(rec.details) ? rec.details : [];
        if (!Array.isArray(rec.details) && typeof rec.details === 'string') {
          try { sd = JSON.parse(rec.details); } catch (e) { }
        }
        const qty = sd.reduce((s, d) => s + Number(d.issueQty || 0), 0);
        const amt = sd.reduce((s, d) => s + Number(d.amount || 0), 0);
        return [rec.issNo, rec.date, rec.departmentName, rec.storeName, sd.length, qty, amt].map(escapeCsv).join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "consumption_issues.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Consumption Issue</h1>
            <p className="inv-page-sub">Manage material issue to departments</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={exportToExcel}>Export to Excel</button>
            <button className="inv-btn-primary" onClick={openNew}>
              + New Issue
            </button>
          </div>
        </div>

        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body">
            <div className="inv-field" style={{ minWidth: 400, maxWidth: 400 }}>
              <label className="inv-label">Search ISS No</label>
              <input
                className="inv-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Type to search Issue Number..."
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
                    <th>ISS No</th>
                    <th>Date</th>
                    <th>Department</th>
                    <th>Store</th>
                    <th>Item Description</th>
                    <th>Total Qty</th>
                    <th>Total Amt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length === 0 && (
                    <tr><td colSpan={9} className="inv-empty">No records found</td></tr>
                  )}
                  {filteredIssues.map((rec, i) => {
                    let safeDetails = Array.isArray(rec.details) ? rec.details : [];
                    if (!Array.isArray(rec.details) && typeof rec.details === 'string') {
                      try { safeDetails = JSON.parse(rec.details); } catch (e) { }
                    }
                    const qty = safeDetails.reduce((s, d) => s + Number(d.issueQty || 0), 0);
                    const amt = safeDetails.reduce((s, d) => s + Number(d.amount || 0), 0);
                    return (
                      <tr key={rec.id}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{rec.issNo}</td>
                        <td>{rec.date}</td>
                        <td>{rec.departmentName}</td>
                        <td>{rec.storeName}</td>
                        <td className="inv-muted-sm">{safeDetails.length} items</td>
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
          <button className="inv-btn-secondary" onClick={() => setView("list")}>View Consumption</button>
          <button className="inv-btn-secondary" onClick={printIssue}>Print</button>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Issue"}</button>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">

          <FormGrid>
            <Field label="ISS No (Auto)">
              <input className="inv-input" value={header.issNo} readOnly style={{ background: "#f8f9fa", color: "#4f46e5", fontWeight: 600 }} />
            </Field>
            <Field label="Issue Date">
              <input className="inv-input" type="date" value={header.date} onChange={(e) => setHeader(h => ({ ...h, date: e.target.value }))} />
            </Field>

            <Field label="Issue Type">
              <select className="inv-input" value={header.issueType} onChange={(e) => setHeader(h => ({ ...h, issueType: e.target.value }))}>
                <option value="General">General</option>
                <option value="Product">Product</option>
              </select>
            </Field>
            {header.issueType === "Product" && (
              <Field label="Item Description *">
                <select className="inv-input" value={header.itemId} onChange={(e) => setHeader(h => ({ ...h, itemId: e.target.value }))}>
                  <option value="">Select Item Description</option>
                  {items.map(it => <option key={it.id} value={it.id}>{it.itemName}</option>)}
                </select>
              </Field>
            )}
            <Field label="Department *">
              <SearchSelect 
                value={header.departmentId} 
                onChange={val => {
                  const d = departments.find(x => String(x.id) === val);
                  setHeader(h => ({ ...h, departmentId: val, departmentName: d?.name || "" }));
                }}
                options={departments.map(d => ({ value: String(d.id), label: d.name }))}
                placeholder="Select department"
              />
            </Field>
            <Field label="Store *">
              <SearchSelect 
                value={header.storeId} 
                onChange={val => {
                  const s = stores.find(x => String(x.id) === val);
                  setHeader(h => ({ ...h, storeId: val, storeName: s?.name || "" }));
                }}
                options={stores.map(s => ({ value: String(s.id), label: s.name }))}
                placeholder="Select store"
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
                  <th>Item</th>
                  <th>GRN No</th>
                  <th>Stk Qty</th>
                  <th>Stk Unit Price</th>
                  <th>Issue Qty</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                  <th>Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={row._rowId}>
                    <td>{idx + 1}</td>
                    <td>
                      <SearchSelect 
                        style={{ minWidth: 200, border: "none" }}
                        value={row.itemName} 
                        onChange={val => updateDetail(idx, "itemName", val)}
                        options={items.map(it => ({ value: it.itemDescription || it.itemName, label: it.itemDescription || it.itemName }))}
                        placeholder="Select Item"
                      />
                    </td>
                    <td>
                      <SearchSelect 
                        style={{ minWidth: 120, border: "none" }}
                        value={row.grnNo} 
                        onChange={val => updateDetail(idx, "grnNo", val)}
                        options={grns.map(g => ({ value: g.grnNo, label: g.grnNo }))}
                        placeholder="Select GRN"
                      />
                    </td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80 }} value={row.stkQty} onChange={e => updateDetail(idx, "stkQty", e.target.value)} /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80 }} value={row.stkRate} onChange={e => updateDetail(idx, "stkRate", e.target.value)} /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80 }} value={row.issueQty} onChange={e => updateDetail(idx, "issueQty", e.target.value)} /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 80 }} value={row.rate} onChange={e => updateDetail(idx, "rate", e.target.value)} /></td>
                    <td style={{ textAlign: "right" }}>{fmt(row.amount)}</td>
                    <td><input className="inv-input" style={{ border: "none", width: 120 }} value={row.issueRemarks} onChange={e => updateDetail(idx, "issueRemarks", e.target.value)} placeholder="Item remarks" /></td>
                    <td>
                      <button className="inv-btn-icon inv-btn-danger" onClick={() => setDetails(p => p.filter((_, i) => i !== idx))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ textAlign: "right", fontWeight: 600 }}>Total</td>
                  <td>{fmt(totals.issueQty)}</td>
                  <td></td>
                  <td></td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>₹{fmt(totals.amount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="inv-card" style={{ marginTop: 20 }}>
        <div className="inv-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
            <div className="inv-field-v">

              <input
                className="inv-input"
                value={header.preparedBy}
                onChange={e => setHeader(h => ({ ...h, preparedBy: e.target.value }))}
                placeholder="Preparer name"
              />
            </div>
            <div className="inv-field-v">

              <textarea
                className="inv-input"
                style={{ height: 40, resize: "none" }}
                value={header.remarks}
                onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))}
                placeholder="General remarks..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


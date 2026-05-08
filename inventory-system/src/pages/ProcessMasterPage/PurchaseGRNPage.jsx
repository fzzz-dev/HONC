import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import {
  grnApi,
  supplierApi,
  storeApi,
  itemApi,
  purchaseOrderApi,
  purchaseIndentApi,
} from "../../services/inventoryApi";
import Modal from "../../components/Modal";

const FormGrid = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>{children}</div>;
const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(),
  indentNo: "",
  poId: "",
  poNo: "",
  poDate: "",
  itemId: "",
  itemName: "",
  uom: "",
  poQty: 0,
  alGrnQty: 0,
  balQty: 0,
  grnQty: 0,
  phyQty: 0,
  poRate: 0,
  grnRate: 0,
  discPct: 0,
  grnAmount: 0,
  gstPct: 0,
  sgst: 0,
  cgst: 0,
  igst: 0,
  totGst: 0,
  totalAmount: 0,
  remarks: "",
  isBatch: "No",
  batchNo: "",
  mfgDate: "",
  expDate: "",
  batchQty: 0,
});

function calcRow(row, gstType = "local") {
  const grnQty = Number(row.grnQty || 0);
  const grnRate = Number(row.grnRate || 0);
  const discPct = Number(row.discPct || 0);
  const gstPct = Number(row.gstPct || 0);

  const grnAmt = grnQty * grnRate * (1 - discPct / 100);
  const gst = grnAmt * (gstPct / 100);
  const isOther = gstType === "other";

  return {
    ...row,
    grnAmount: +grnAmt.toFixed(2),
    sgst: isOther ? 0 : +(gst / 2).toFixed(2),
    cgst: isOther ? 0 : +(gst / 2).toFixed(2),
    igst: isOther ? +gst.toFixed(2) : 0,
    totGst: +gst.toFixed(2),
    totalAmount: +(grnAmt + gst).toFixed(2),
  };
}

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


export default function PurchaseGRNPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  // ── State ──
  const [grns, setGrns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [pos, setPos] = useState([]);
  const [indents, setIndents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingSelected, setPendingSelected] = useState(new Set());
  const [pendingPoRows, setPendingPoRows] = useState([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchRowIdx, setBatchRowIdx] = useState(null);

  const [header, setHeader] = useState({
    grnNo: "",
    date: today,
    grnType: "Against PO",
    supplierId: "",
    supplierName: "",
    storeId: "",
    storeName: "",
    invoiceNo: "",
    invoiceDate: today,
    gstType: "local",
    remarks: "",
    preparedBy: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const navigate = useNavigate();

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
    openNew();
  }, [loadData]);

  // ── Handlers ──
  async function openNew() {
    setHeader({
      grnNo: "",
      date: today,
      grnType: "Against PO",
      supplierId: "",
      supplierName: "",
      storeId: "",
      storeName: "",
      invoiceNo: "",
      invoiceDate: today,
      gstType: "local",
      remarks: "",
      preparedBy: user?.name || "Admin",
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
      grnType: rec.grnType || "Against PO",
      supplierId: rec.supplierId,
      supplierName: rec.supplierName,
      storeId: rec.storeId,
      storeName: rec.storeName,
      invoiceNo: rec.invoiceNo || "",
      invoiceDate: rec.invoiceDate || today,
      gstType: rec.gstType || "local",
      remarks: rec.remarks || "",
      preparedBy: rec.preparedBy || "",
    });
    
    let dts = rec.details || [];
    if (typeof dts === 'string') {
      try { dts = JSON.parse(dts); } catch(e) { dts = []; }
    }
    if (!Array.isArray(dts)) dts = [];

    setDetails(dts.map((d) => ({ ...d, _rowId: Math.random() })));
    setEditId(rec.id);
    setView("form");
  }

  function printGRN() {
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const company = JSON.parse(localStorage.getItem("company") || "{}");

    // Calculate totals
    const totals = details.reduce((acc, r) => ({
      grnQty: acc.grnQty + Number(r.grnQty || 0),
      totalAmount: acc.totalAmount + Number(r.totalAmount || 0),
    }), { grnQty: 0, totalAmount: 0 });

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>GRN ${esc(header.grnNo)}</title>
  <style>
    @page { margin: 8mm; size: A4; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 0; color: #000; }
    .bold { font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .container { border: 1px solid #000; min-height: 280mm; position: relative; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px; vertical-align: top; }
    .no-border { border: none !important; }
    .header-info { background: #f9fafb; }
    .items-table th { background: #f3f4f6; }
    .items-table td { height: 25px; }
    .signature-row { height: 80px; vertical-align: bottom; border-top: 1px solid #000; }
  </style>
</head>
<body>
  <div class="container">
    <table style="border-bottom: 2px solid #000;">
      <tr>
        <td class="no-border" style="width: 20%;">
          ${company.logo ? `<img src="${company.logo}" style="max-height: 60px;" />` : `<div style="font-size: 24px; font-weight: bold; color: #999;">LOGO</div>`}
        </td>
        <td class="no-border text-center" style="width: 60%;">
          <div style="font-size: 18px; font-weight: bold;">${esc(company.companyName || "HONC INVENTORY SYSTEM")}</div>
          <div style="font-size: 10px; margin-top: 4px;">${esc(company.address || "Company Address Line")}</div>
          <div style="font-size: 10px;">Tel: ${esc(company.phone || "")} | E-mail: ${esc(company.email || "")}</div>
          <div style="font-size: 11px; margin-top: 5px; font-weight: bold; border: 1px solid #000; display: inline-block; padding: 2px 15px;">GOODS RECEIPT NOTE (GRN)</div>
        </td>
        <td class="no-border text-right" style="width: 20%;">
          <div style="font-size: 9px;">GSTIN: ${esc(company.gstin || "")}</div>
        </td>
      </tr>
    </table>

    <table class="header-info">
      <tr>
        <td style="width: 50%;">
          <div class="bold" style="font-size: 11px; text-decoration: underline; margin-bottom: 5px;">SUPPLIER DETAILS</div>
          <div class="bold">${esc(header.supplierName)}</div>
          <div style="margin-top: 3px;">GST: ${esc(header.supplierGst || "N/A")}</div>
          <div style="margin-top: 10px;"><span class="bold">Invoice No:</span> ${esc(header.invoiceNo)}</div>
          <div><span class="bold">Invoice Date:</span> ${header.invoiceDate ? new Date(header.invoiceDate).toLocaleDateString("en-GB") : ""}</div>
        </td>
        <td style="width: 50%;">
          <div style={{ marginBottom: "8px" }}><span className="bold">GRN Number:</span> <span style={{ fontSize: "12px" }} className="bold">{header.grnNo}</span></div>
          <div style={{ marginBottom: "8px" }}><span className="bold">GRN Date:</span> {new Date(header.date).toLocaleDateString("en-GB")}</div>
          <div style={{ marginBottom: "8px" }}><span className="bold">Store / Location:</span> {header.storeName}</div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px;">S.No</th>
          <th>PO No</th>
          <th>Item Description</th>
          <th style="width: 60px;">UOM</th>
          <th style="width: 80px;">PO Qty</th>
          <th style="width: 80px;">Recd Qty</th>
          <th style="width: 80px;">Rate</th>
          <th style="width: 100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${details.map((d, i) => `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td class="text-center">${esc(d.poNo || "Direct")}</td>
            <td>${esc(d.itemName)}</td>
            <td class="text-center">${esc(d.uom)}</td>
            <td class="text-right">${Number(d.poQty).toFixed(2)}</td>
            <td class="text-right bold">${Number(d.grnQty).toFixed(2)}</td>
            <td class="text-right">${Number(d.grnRate).toFixed(2)}</td>
            <td class="text-right">${Number(d.totalAmount).toFixed(2)}</td>
          </tr>
        `).join("")}
        <tr style="height: auto; border: none;">
          <td colspan="8" style="border: none; padding: 20px 0;"></td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="bold" style="background: #f9fafb;">
          <td colspan="5" class="text-right">TOTAL RECEIVED QUANTITY</td>
          <td class="text-right" style="font-size: 11px;">${totals.grnQty.toFixed(2)}</td>
          <td class="text-right">GRAND TOTAL</td>
          <td class="text-right" style="font-size: 12px;">₹${totals.totalAmount.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="padding: 10px; border-top: 1px solid #000;">
      <div class="bold" style="font-size: 9px; margin-bottom: 5px;">REMARKS / NOTES:</div>
      <div style="min-height: 40px;">${esc(header.remarks || "No additional remarks.")}</div>
    </div>

    <table style="position: absolute; bottom: 0; border: none;">
      <tr class="signature-row">
        <td class="text-center" style="width: 33.33%; border-left: none; border-bottom: none;">
          <div class="bold">${esc(header.preparedBy || user?.name || "Admin")}</div>
          <div style="font-size: 9px; margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 2px;">Prepared By</div>
        </td>
        <td class="text-center" style="width: 33.33%; border-bottom: none;">
          <div style="height: 30px;"></div>
          <div style="font-size: 9px; margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 2px;">Verified By (Store)</div>
        </td>
        <td class="text-center" style="width: 33.33%; border-right: none; border-bottom: none;">
          <div style="height: 30px;"></div>
          <div style="font-size: 9px; margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 2px;">Authorised Signature</div>
        </td>
      </tr>
    </table>
  </div>
  <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
</body>
</html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
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
        if (po) {
          row.poId = po.id || po._id;
          row.poDate = po.date || "";

          // If item is already selected, update its PO-specific data
          if (row.itemName) {
            let poDetails = po.details || [];
            if (typeof poDetails === 'string') {
              try { poDetails = JSON.parse(poDetails); } catch (e) { poDetails = []; }
            }
            const poItem = poDetails.find(d => String(d.itemName).toLowerCase() === String(row.itemName).toLowerCase());
            if (poItem) {
              row.poQty = poItem.poQty || 0;
              row.poRate = poItem.poRate || 0;
              row.grnRate = poItem.poRate || 0;
              row.gstPct = poItem.gstPct || row.gstPct;
            }
          }
        }
      }

      if (field === "indentNo") {
        const ind = indents.find((i) => i.indentNo === val);
        if (ind) {
          row.indentId = ind.id || ind._id;
        }
      }

      if (field === "itemName") {
        const found = items.find((it) => it.itemName === val);
        row.itemId = found?.id || found?._id || "";
        row.uom = found?.uom || "";
        row.poRate = found?.purchaseRate || found?.rate || 0;
        row.grnRate = found?.purchaseRate || found?.rate || 0;
        row.gstPct = found?.gstPercent !== undefined ? found.gstPercent : 0;

        // If PO is selected, try to get details from that PO
        if (row.poNo) {
          const po = pos.find(p => p.poNo === row.poNo);
          if (po) {
            let poDetails = po.details || [];
            if (typeof poDetails === 'string') {
              try { poDetails = JSON.parse(poDetails); } catch(e) { poDetails = []; }
            }
            const poItem = poDetails.find(d => String(d.itemName).toLowerCase() === String(val).toLowerCase());
            if (poItem) {
              row.poQty = poItem.poQty || 0;
              row.poRate = poItem.poRate || 0;
              row.grnRate = poItem.poRate || 0;
              row.gstPct = poItem.gstPct || row.gstPct;
            }
          }
        }
      }


      row = calcRow(row, header.gstType);
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
    (acc, r) => {
      const gross = (r.grnQty || 0) * (r.grnRate || 0);
      const disc = gross * ((r.discPct || 0) / 100);
      return {
        grossAmount: acc.grossAmount + gross,
        discPrice: acc.discPrice + disc,
        grnAmount: acc.grnAmount + (r.grnAmount || 0),
        sgst: acc.sgst + (r.sgst || 0),
        cgst: acc.cgst + (r.cgst || 0),
        igst: acc.igst + (r.igst || 0),
        totGst: acc.totGst + (r.totGst || 0),
        totalAmount: acc.totalAmount + (r.totalAmount || 0),
      };
    },
    { grossAmount: 0, discPrice: 0, grnAmount: 0, sgst: 0, cgst: 0, igst: 0, totGst: 0, totalAmount: 0 },
  );

  const effectiveDiscPct = totals.grossAmount > 0 ? (totals.discPrice / totals.grossAmount) * 100 : 0;

  async function openPendingModal() {
    if (!header.supplierId) return alert("Please select a supplier first");
    // Ensure we send a clean numeric ID
    const cleanSupplierId = String(header.supplierId).split(':')[0];
    try {
      const data = await grnApi.getPendingPOItems(cleanSupplierId);
      if (!Array.isArray(data)) {
        console.error("Unexpected pending items response:", data);
        return alert("Could not load pending items. Please check your Purchase Orders have status 'Open'.");
      }
      setPendingPoRows(data);
      setPendingModalOpen(true);
    } catch (err) {
      alert("Failed to fetch pending items: " + err.message);
    }
  }

  function addPendingLinesToDetails() {
    const selected = pendingPoRows.filter(r => pendingSelected.has(r.rowId || `${r.poId}-${r.poDetailId}`));
    if (selected.length > 0) {
      // Inherit gstType from the first selected PO
      setHeader(h => ({ ...h, gstType: selected[0].gstType || "local" }));
    }
    const newRows = selected.map(s => calcRow({
      ...emptyDetail(),
      poId: s.poId,
      poNo: s.poNo,
      poDate: s.poDate,
      indentNo: s.indentNo || "",
      itemId: s.itemId,
      itemName: s.itemName,
      uom: s.uom,
      poQty: s.poQty,
      alGrnQty: s.alGrnQty,
      balQty: s.balQty,
      grnQty: s.balQty,
      phyQty: s.balQty,
      poRate: s.poRate,
      grnRate: s.poRate,
      gstPct: s.gstPct !== undefined ? s.gstPct : 0
    }, selected[0]?.gstType || "local"));
    
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
    const filteredGrns = grns.filter(rec => {
      const matchesSearch = rec.grnNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSupplier = !supplierFilter || String(rec.supplierId) === supplierFilter;
      const matchesDate = !dateFilter || rec.date === dateFilter;
      return matchesSearch && matchesSupplier && matchesDate;
    });

    const exportToExcel = () => {
      const headers = ["GRN No", "Date", "Supplier", "Store", "Total Items", "Total Amount"];
      const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const rows = filteredGrns.map(rec => {
        let sd = Array.isArray(rec.details) ? rec.details : [];
        if (!Array.isArray(rec.details) && typeof rec.details === 'string') {
          try { sd = JSON.parse(rec.details); } catch (e) { }
        }
        const amt = sd.reduce((s, d) => s + Number(d.totalAmount || 0), 0);
        return [rec.grnNo, rec.date, rec.supplierName, rec.storeName, sd.length, amt].map(escapeCsv).join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "purchase_grns.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Purchase GRN</h1>
            <p className="inv-page-sub">Goods receipt note management</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={exportToExcel}>Export to Excel</button>
            <button className="inv-btn-primary" onClick={openNew}>+ New GRN</button>
          </div>
        </div>

        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="inv-field" style={{ minWidth: 400, flex: 1 }}>
              <label className="inv-label">Search GRN No</label>
              <input 
                className="inv-input" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Type to search..." 
              />
            </div>
            <div className="inv-field" style={{ width: 200 }}>
              <label className="inv-label">Filter by Date</label>
              <input 
                className="inv-input" 
                type="date" 
                value={dateFilter} 
                onChange={e => setDateFilter(e.target.value)} 
              />
            </div>
            <div className="inv-field" style={{ width: 250 }}>
              <label className="inv-label">Filter by Supplier</label>
              <select className="inv-input" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
                <option value="">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.supplierName}</option>)}
              </select>
            </div>
            <button className="inv-btn-secondary" style={{ height: 38 }} onClick={() => { setSearchTerm(""); setSupplierFilter(""); setDateFilter(""); }}>Clear</button>
          </div>
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
                  {filteredGrns.length === 0 && (
                    <tr><td colSpan={8} className="inv-empty">No records found</td></tr>
                  )}
                  {filteredGrns.map((rec, i) => {
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
          <button className="inv-btn-secondary" onClick={printGRN}>Print</button>
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
                    if (e.target.checked) setPendingSelected(new Set(pendingPoRows.map(r => r.rowId || `${r.poId}-${r.poDetailId}`)));
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

          <FormGrid>
            <Field label="GRN No (Auto)">
              <input className="inv-input" value={header.grnNo} readOnly style={{ background: "#f8f9fa", color: "#4f46e5", fontWeight: 600 }} />
            </Field>
            <Field label="GRN Date">
              <input className="inv-input" type="date" value={header.date} readOnly style={{ background: "#f8f9fa" }} />
            </Field>
            <Field label="GRN Type *">
              <select className="inv-input" value={header.grnType} onChange={(e) => setHeader(h => ({ ...h, grnType: e.target.value }))}>
                <option value="Against PO">Against PO</option>
                <option value="General">General</option>
              </select>
            </Field>

            <Field label="Supplier *">
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select className="inv-input" style={{ flex: 1 }} value={header.supplierId} onChange={(e) => {
                  const rawId = e.target.value;
                  const cleanId = rawId.includes(':') ? rawId.split(':')[0] : rawId;
                  const s = suppliers.find(x => String(x.id) === cleanId || String(x._id) === cleanId);
                  const gstType = s?.gstType || "local";
                  setHeader(h => ({ ...h, supplierId: cleanId, supplierName: s?.supplierName || "", gstType }));
                  setDetails(prev => prev.map(r => calcRow(r, gstType)));
                }}>
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s.id || s._id} value={String(s.id || s._id)}>{s.supplierName}</option>)}
                </select>
                <button type="button" className="inv-btn-icon" title="Add New Supplier" onClick={() => navigate("/supplier")} style={{ color: "#10b981" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </Field>
            <Field label="Store *">
              <select className="inv-input" value={header.storeId} onChange={(e) => {
                const st = stores.find(x => String(x.id || x._id) === e.target.value);
                setHeader(h => ({ ...h, storeId: e.target.value, storeName: st?.name || "" }));
              }}>
                <option value="">Select store</option>
                {stores.map(st => <option key={st.id || st._id} value={String(st.id || st._id)}>{st.name}</option>)}
              </select>
            </Field>
            <Field label="INV\PDC no">
              <input className="inv-input" value={header.invoiceNo} onChange={(e) => setHeader(h => ({ ...h, invoiceNo: e.target.value }))} placeholder="Enter Invoice Number" />
            </Field>
            <Field label="INV\DATE">
              <input className="inv-input" type="date" value={header.invoiceDate} onChange={(e) => setHeader(h => ({ ...h, invoiceDate: e.target.value }))} />
            </Field>
            <Field label="GST Type">
              <input 
                className="inv-input" 
                value={header.gstType === 'other' ? 'Other State (IGST)' : 'Local (SGST+CGST)'} 
                readOnly 
                style={{ background: "#f8f9fa", color: header.gstType === 'other' ? "#7c3aed" : "#10b981", fontWeight: 600 }} 
              />
            </Field>
          </FormGrid>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {header.grnType !== "General" && (
                <button 
                  className="inv-btn-secondary inv-btn-sm" 
                  onClick={openPendingModal} 
                  disabled={!header.supplierId}
                  style={{ opacity: !header.supplierId ? 0.5 : 1, cursor: !header.supplierId ? 'not-allowed' : 'pointer' }}
                >
                  Pending
                </button>
              )}
              <button className="inv-btn-secondary inv-btn-sm" onClick={() => setDetails(p => [...p, emptyDetail()])}>+ Add Row</button>
            </div>
          </div>
          <div style={{ overflowX: "auto", minHeight: 400 }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  {header.grnType !== "General" && <th>Indent no</th>}
                  {header.grnType !== "General" && <th>Po no</th>}
                  <th>Item Name</th>
                  {header.grnType !== "General" && <th>Po qty</th>}
                  {header.grnType !== "General" && <th>po rate</th>}
                  <th>GRN qty</th>
                  <th>Batch</th>
                  {header.grnType !== "General" && <th>balance qty</th>}
                  {header.grnType !== "General" && <th>phy qty</th>}
                  <th>Rate</th>
                  <th>Disc</th>
                  <th>GST%</th>
                  {header.gstType === 'other' ? (
                    <th style={{ width: 90, textAlign: "right" }}>IGST</th>
                  ) : (
                    <>
                      <th style={{ width: 80, textAlign: "right" }}>SGST</th>
                      <th style={{ width: 80, textAlign: "right" }}>CGST</th>
                    </>
                  )}
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={row._rowId}>
                    <td>{idx + 1}</td>
                    {header.grnType !== "General" && (
                      <td>
                        <select className="inv-input" style={{ border: "none", width: 80 }} value={row.indentNo} onChange={e => updateDetail(idx, "indentNo", e.target.value)}>
                          <option value="">—</option>
                          {indents.map(ind => (
                            <option key={ind.id} value={ind.indentNo}>{ind.indentNo}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {header.grnType !== "General" && (
                      <td>
                        <select 
                          className="inv-input" 
                          style={{ border: "none", width: 80, cursor: !header.supplierId ? 'not-allowed' : 'pointer' }} 
                          value={row.poNo} 
                          onChange={e => updateDetail(idx, "poNo", e.target.value)}
                          disabled={!header.supplierId}
                        >
                          <option value="">—</option>
                          {pos.filter(po => !header.supplierId || String(po.supplierId) === String(header.supplierId)).map(po => (
                            <option key={po.id} value={po.poNo}>{po.poNo}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td>
                      <select className="inv-input" style={{ border: "none", width: 130 }} value={row.itemName} onChange={e => updateDetail(idx, "itemName", e.target.value)}>
                        <option value="">Select item</option>
                        {items.map(it => <option key={it.id || it._id} value={it.itemName}>{it.itemName}</option>)}
                      </select>
                    </td>
                    {header.grnType !== "General" && <td><input className="inv-input" style={{ border: "none", width: 50, textAlign: 'right' }} value={row.poQty} readOnly /></td>}
                    {header.grnType !== "General" && <td><input className="inv-input" style={{ border: "none", width: 50, textAlign: 'right' }} value={row.poRate} readOnly /></td>}
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 60, textAlign: 'right', fontWeight: 600, color: '#3b6ef8' }} value={row.grnQty} onChange={e => updateDetail(idx, "grnQty", e.target.value)} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <select 
                          className="inv-input" 
                          style={{ border: "none", width: 50, padding: 0 }} 
                          value={row.isBatch} 
                          onChange={e => {
                            const val = e.target.value;
                            updateDetail(idx, "isBatch", val);
                            if (val === "Yes") {
                              setBatchRowIdx(idx);
                              setBatchModalOpen(true);
                            }
                          }}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                        {row.isBatch === "Yes" && (
                          <button 
                            className="inv-btn-icon" 
                            style={{ padding: '2px', color: 'var(--accent)' }}
                            onClick={() => {
                              setBatchRowIdx(idx);
                              setBatchModalOpen(true);
                            }}
                            title="Edit Batch Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    {header.grnType !== "General" && <td><input className="inv-input" style={{ border: "none", width: 50, textAlign: 'right' }} value={row.balQty} readOnly /></td>}
                    {header.grnType !== "General" && <td><input type="number" className="inv-input" style={{ border: "none", width: 50, textAlign: 'right' }} value={row.phyQty} onChange={e => updateDetail(idx, "phyQty", e.target.value)} /></td>}
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 60, textAlign: 'right' }} value={row.grnRate} onChange={e => updateDetail(idx, "grnRate", e.target.value)} /></td>
                    <td><input type="number" className="inv-input" style={{ border: "none", width: 50, textAlign: 'right' }} value={row.discPct} onChange={e => updateDetail(idx, "discPct", e.target.value)} /></td>

                    <td>
                      <input 
                        className="inv-input" 
                        style={{ border: "none", width: 55, textAlign: 'center', background: '#f8f9fa' }} 
                        value={`${row.gstPct}%`} 
                        readOnly 
                      />
                    </td>
                    {header.gstType === 'other' ? (
                      <td style={{ textAlign: "right" }}>{fmt(row.igst)}</td>
                    ) : (
                      <>
                        <td style={{ textAlign: "right" }}>{fmt(row.sgst)}</td>
                        <td style={{ textAlign: "right" }}>{fmt(row.cgst)}</td>
                      </>
                    )}
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(row.totalAmount)}</td>
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

          
          <div className="inv-summary-grid">
            <div className="inv-summary-box" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
              <div className="inv-summary-box-label">Gross Amount</div>
              <div className="inv-summary-box-value" style={{ color: "#64748b" }}>₹{fmt(totals.grossAmount)}</div>
            </div>

            <div className="inv-summary-box" style={{ background: "#fffbeb", borderColor: "#fcd34d", position: "relative" }}>
              <div className="inv-summary-box-label">Total Discount</div>
              <div className="inv-summary-box-value" style={{ color: "#b45309" }}>−₹{fmt(totals.discPrice)}</div>
              <div style={{ fontSize: 11, color: "#92400e", marginTop: 2, fontWeight: 500 }}>
                {Number(effectiveDiscPct || 0).toFixed(2)}% effective
              </div>
            </div>



            <div className="inv-summary-box">
              <div className="inv-summary-box-label">Total GST</div>
              <div className="inv-summary-box-value">₹{fmt(totals.totGst)}</div>
            </div>

            {header.gstType === "local" ? (
              <>
                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">SGST</div>
                  <div className="inv-summary-box-value">₹{fmt(totals.sgst)}</div>
                </div>
                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">CGST</div>
                  <div className="inv-summary-box-value">₹{fmt(totals.cgst)}</div>
                </div>
              </>
            ) : (
              <div className="inv-summary-box">
                <div className="inv-summary-box-label">IGST (Other State)</div>
                <div className="inv-summary-box-value" style={{ color: "#7c3aed" }}>₹{fmt(totals.igst)}</div>
              </div>
            )}

            <div className="inv-summary-box" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
              <div className="inv-summary-box-label">Grand Total</div>
              <div className="inv-summary-box-value" style={{ color: "var(--accent)" }}>₹{fmt(totals.totalAmount)}</div>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eee' }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
              <div className="inv-field">
                <label className="inv-label">Prepared By</label>
                <input 
                  className="inv-input" 
                  value={header.preparedBy || ""} 
                  onChange={(e) => setHeader(h => ({ ...h, preparedBy: e.target.value }))}
                  placeholder="Name of preparer"
                />
              </div>
              <div className="inv-field">
                <label className="inv-label">Remarks</label>
                <textarea 
                  className="inv-input" 
                  style={{ height: 40, resize: 'none' }} 
                  value={header.remarks || ""} 
                  onChange={(e) => setHeader(h => ({ ...h, remarks: e.target.value }))}
                  placeholder="Enter any special instructions or remarks..."
                />
              </div>
            </div>
          </div>

        </div>
      </div>
      {batchModalOpen && batchRowIdx !== null && (
        <Modal 
          title={`Batch Details: ${details[batchRowIdx]?.itemName || "Item"}`}
          onClose={() => setBatchModalOpen(false)}
          onSave={() => setBatchModalOpen(false)}
          saveLabel="Apply Details"
        >
          <div className="inv-form-row cols-2">
            <div className="inv-field">
              <label className="inv-label">Batch Number (Alphanumeric)</label>
              <input 
                className="inv-input" 
                value={details[batchRowIdx].batchNo || ""} 
                onChange={e => updateDetail(batchRowIdx, "batchNo", e.target.value)}
                placeholder="e.g. BTH-123-A"
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Batch Qty</label>
              <input 
                type="number"
                className="inv-input" 
                value={details[batchRowIdx].batchQty || 0} 
                onChange={e => updateDetail(batchRowIdx, "batchQty", e.target.value)}
              />
            </div>
          </div>
          <div className="inv-form-row cols-2">
            <div className="inv-field">
              <label className="inv-label">Manufacturing Date</label>
              <input 
                type="date"
                className="inv-input" 
                value={details[batchRowIdx].mfgDate || ""} 
                onChange={e => updateDetail(batchRowIdx, "mfgDate", e.target.value)}
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Expiry Date</label>
              <input 
                type="date"
                className="inv-input" 
                value={details[batchRowIdx].expDate || ""} 
                onChange={e => updateDetail(batchRowIdx, "expDate", e.target.value)}
              />
            </div>
          </div>
          <p className="inv-muted-sm" style={{ marginTop: 10 }}>
            * This information will be saved with the GRN for stock tracking and expiry management.
          </p>
        </Modal>
      )}
    </div>
  );
}

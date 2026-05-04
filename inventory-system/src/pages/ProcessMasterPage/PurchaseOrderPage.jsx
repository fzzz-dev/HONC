// pages/PurchaseOrderPage.jsx
import { useState, useEffect } from "react";
import { purchaseOrderApi, paymentTermsApi, supplierApi } from "../../services/inventoryApi";
import Modal from "../../components/Modal";
import SupplierCreateModal from "../../components/SupplierCreateModal";

// ─── helpers ──────────────────────────────────────────────────────────────────
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

const today = () => new Date().toISOString().split("T")[0];

const sid = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v.id || v._id || "");
  return String(v);
};

// Always returns a guaranteed array (handles null / object / non-array)
const safeDetails = (details) => {
  if (Array.isArray(details)) return details;
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

// ─── empty row factory ────────────────────────────────────────────────────────
const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(),
  indentId: "",
  indentNo: "",
  indentDetailId: "",
  itemId: "",
  itemName: "",
  uom: "",
  indentQty: 0,
  alPoQty: 0,
  balQty: 0,
  poQty: 0,
  priceListRate: 0,
  poRate: 0,
  discMode: "pct",
  discPct: 0,
  discPrice: 0,
  poAmount: 0,
  gstPct: 18,
  sgst: 0,
  cgst: 0,
  igst: 0,
  totGst: 0,
  totalAmount: 0,
  indentRemarks: "",
  poRemarks: "",
});

const emptyHeader = () => ({
  poNo: "",
  date: today(),
  supplierId: "",
  supplierName: "",
  paymentTermsId: "",
  paymentTermsName: "",
  createdBy: "Admin",
  createdOn: today(),
  status: "Open",
  remarks: "",
});

function printPurchaseOrder({
  header,
  details: detailRows,
  totals,
  gstEnabled,
  gstType,
}) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const rows = detailRows || [];
  const rowsHtml = rows
    .map((d, i) => {
      const disc = Number(d.discPrice || 0);
      const discCell =
        disc > 0 ? `₹${fmt(disc)}` : "—";
      const gstPct = gstEnabled ? `${Number(d.gstPct || 0)}%` : "—";
      const sgst = gstEnabled && gstType !== "other" ? fmt(d.sgst || 0) : "—";
      const cgst = gstEnabled && gstType !== "other" ? fmt(d.cgst || 0) : "—";
      const igst = gstEnabled && gstType === "other" ? fmt(d.igst || 0) : "—";
      return `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(d.itemName)}</td>
      <td class="r">${esc(d.uom)}</td>
      <td class="r">${Number(d.poQty || 0)}</td>
      <td class="r">₹${fmt(d.poRate)}</td>
      <td class="r">${discCell}</td>
      <td class="r">₹${fmt(d.poAmount)}</td>
      <td class="c">${gstPct}</td>
      <td class="r">${gstType === "other" ? igst : sgst}</td>
      <td class="r">${gstType === "other" ? "—" : cgst}</td>
      <td class="r b">₹${fmt(d.totalAmount)}</td>
    </tr>`;
    })
    .join("");

  const gstLabel =
    gstEnabled && gstType === "local"
      ? "SGST / CGST (each ½ of GST)"
      : gstEnabled
        ? "IGST"
        : "Tax";

  const summaryBlock = `
    <table class="sum">
      <tr><td>Gross amount</td><td>₹${fmt(totals.grossAmount)}</td></tr>
      ${
        totals.discPrice > 0
          ? `<tr><td>Less discount</td><td>−₹${fmt(totals.discPrice)}</td></tr>`
          : ""
      }
      <tr><td>Taxable value</td><td>₹${fmt(totals.poAmount)}</td></tr>
      ${
        gstEnabled
          ? gstType === "other"
            ? `<tr><td>IGST</td><td>₹${fmt(totals.igst)}</td></tr>`
            : `<tr><td>SGST</td><td>₹${fmt(totals.sgst)}</td></tr>
               <tr><td>CGST</td><td>₹${fmt(totals.cgst)}</td></tr>`
          : `<tr><td>Tax</td><td>₹0.00</td></tr>`
      }
      <tr class="grand"><td><strong>Grand total (incl. tax)</strong></td><td><strong>₹${fmt(totals.totalAmount)}</strong></td></tr>
    </table>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>PO ${esc(header.poNo)}</title>
<style>
@page { margin: 12mm; size: A4; }
*{box-sizing:border-box;}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:0;padding:16px 20px;color:#0f172a;font-size:11px;}
.doc-head{border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:14px;}
.doc-head h1{margin:0 0 4px;font-size:18px;letter-spacing:-0.02em;}
.doc-head .sub{margin:0;color:#64748b;font-size:11px;}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:14px;}
.kv{display:flex;gap:8px;font-size:11px;line-height:1.35;}
.kv span:first-child{min-width:100px;color:#64748b;flex-shrink:0;}
.kv span:last-child{font-weight:600;text-align:right;flex:1;}
table.lines{border-collapse:collapse;width:100%;font-size:10px;margin-top:8px;}
table.lines th,table.lines td{border:1px solid #cbd5e1;padding:5px 6px;vertical-align:top;}
table.lines th{background:#f1f5f9;font-weight:600;text-align:left;}
table.lines td.r,table.lines th.r{text-align:right;}
table.lines td.c,table.lines th.c{text-align:center;}
table.lines td.b{font-weight:600;}
table.sum{margin-top:14px;margin-left:auto;width:280px;border-collapse:collapse;font-size:11px;}
table.sum td{padding:5px 0;border-bottom:1px solid #e2e8f0;}
table.sum td:last-child{text-align:right;font-variant-numeric:tabular-nums;}
table.sum tr.grand td{border-bottom:none;padding-top:10px;font-size:12px;}
.rem{margin-top:12px;padding:8px 10px;background:#f8fafc;border-radius:6px;font-size:10px;color:#475569;}
@media print{body{padding:0;}.no-print{display:none;}}
</style></head><body>
<div class="doc-head">
  <h1>Purchase Order</h1>
  <p class="sub">Printed ${esc(new Date().toLocaleString("en-IN"))}</p>
</div>
<div class="grid">
  <div>
    <div class="kv"><span>PO number</span><span>${esc(header.poNo || "—")}</span></div>
    <div class="kv"><span>Date</span><span>${esc(header.date)}</span></div>
    <div class="kv"><span>Status</span><span>${esc(header.status)}</span></div>
    <div class="kv"><span>Created by</span><span>${esc(header.createdBy || "—")}</span></div>
  </div>
  <div>
    <div class="kv"><span>Supplier</span><span>${esc(header.supplierName || "—")}</span></div>
    <div class="kv"><span>Payment terms</span><span>${esc(header.paymentTermsName || "—")}</span></div>
    <div class="kv"><span>GST</span><span>${gstEnabled ? "Applicable" : "Not applicable"} (${esc(gstLabel)})</span></div>
    <div class="kv"><span>Created on</span><span>${esc(header.createdOn || "—")}</span></div>
  </div>
</div>
<table class="lines">
<thead><tr>
<th class="c">#</th><th>Item / description</th><th class="r">UOM</th><th class="r">Qty</th><th class="r">Rate</th>
<th class="r">Disc.</th><th class="r">Taxable</th><th class="c">GST %</th><th class="r">${gstType === "other" ? "IGST" : "SGST"}</th><th class="r">${gstType === "other" ? "—" : "CGST"}</th><th class="r">Amount</th>
</tr></thead>
<tbody>${rowsHtml || `<tr><td colspan="11" style="text-align:center;color:#64748b">No line items</td></tr>`}</tbody>
</table>
${summaryBlock}
${header.remarks ? `<div class="rem"><strong>Remarks:</strong> ${esc(header.remarks)}</div>` : ""}
<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},100);});</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print purchase order");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow;
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => iframe.remove(), 500);
    }
  };
  if (doc.readyState === "complete") {
    setTimeout(trigger, 150);
  } else {
    iframe.onload = () => setTimeout(trigger, 150);
  }
}

// ─── GST calculation ──────────────────────────────────────────────────────────
function calcRow(row, gstEnabled, gstType) {
  const baseAmt = (row.poQty || 0) * (row.poRate || 0);

  let discPct = row.discPct || 0;
  let discPrice = row.discPrice || 0;

  if (row.discMode === "price") {
    discPrice = row.discPrice || 0;
    discPct = baseAmt > 0 ? (discPrice / baseAmt) * 100 : 0;
  } else {
    discPct = row.discPct || 0;
    discPrice = baseAmt * (discPct / 100);
  }

  const netAmt = baseAmt - discPrice;
  const gst = gstEnabled ? netAmt * ((row.gstPct || 0) / 100) : 0;

  let sgst = 0, cgst = 0, igst = 0;
  if (gstEnabled) {
    if (gstType === "other") {
      igst = gst;
    } else {
      sgst = gst / 2;
      cgst = gst / 2;
    }
  }

  return {
    ...row,
    discPct: +discPct.toFixed(4),
    discPrice: +discPrice.toFixed(2),
    poAmount: +netAmt.toFixed(2),
    sgst: +sgst.toFixed(2),
    cgst: +cgst.toFixed(2),
    igst: +igst.toFixed(2),
    totGst: +gst.toFixed(2),
    totalAmount: +(netAmt + gst).toFixed(2),
  };
}

function buildDetailFromIndentOption(opt, gstEnabled, gstType) {
  const base = emptyDetail();
  return calcRow(
    {
      ...base,
      indentDetailId: opt.detailId,
      indentId: opt.indentId,
      indentNo: opt.indentNo,
      itemId: opt.itemId || "",
      itemName: opt.itemName,
      uom: opt.uom,
      indentQty: opt.indentQty || 0,
      alPoQty: opt.alPoQty || 0,
      balQty: opt.balQty || 0,
      poQty: opt.balQty || 0,
      priceListRate: opt.priceListRate || 0,
      poRate: opt.priceListRate || 0,
      gstPct: opt.gstPct ?? 18,
      indentRemarks: opt.indentRemarks || "",
    },
    gstEnabled,
    gstType,
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const [pos, setPos] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  const [indents, setIndents] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingSelected, setPendingSelected] = useState(() => new Set());
  const [paymentTermsList, setPaymentTermsList] = useState([]);

  // New Supplier state
  const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false);

  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [header, setHeader] = useState(emptyHeader());
  const [details, setDetails] = useState([emptyDetail()]);

  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstType, setGstType] = useState("local");

  useEffect(() => {
    loadPos();
    loadIndents();
    loadSuppliers();
    openNew();
    (async () => {
      try {
        const pt = await paymentTermsApi.getAll();
        setPaymentTermsList(Array.isArray(pt) ? pt : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (pendingModalOpen) setPendingSelected(new Set());
  }, [pendingModalOpen]);

  async function loadPos() {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await purchaseOrderApi.getAll();
      setPos(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message || "Failed to load purchase orders");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadIndents() {
    try {
      const data = await purchaseOrderApi.getIndents();
      setIndents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load indents for PO:", err);
    }
  }

  async function loadSuppliers() {
    setLoadingSuppliers(true);
    try {
      const data = await purchaseOrderApi.getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    } finally {
      setLoadingSuppliers(false);
    }
  }

  async function openNew() {
    setFormError(null);
    let poNo = "";
    try {
      const res = await purchaseOrderApi.getNextNumber();
      poNo = res.poNo;
    } catch {
      poNo = "";
    }
    setHeader({ ...emptyHeader(), poNo });
    setDetails([emptyDetail()]);
    setEditId(null);
    setGstEnabled(true);
    setGstType("local");
    setView("form");
  }

  function openEdit(po) {
    setFormError(null);
    setHeader({
      poNo: po.poNo,
      date: po.date,
      supplierId: sid(po.supplierId),
      supplierName: po.supplierName,
      paymentTermsId: po.paymentTermsId ? String(po.paymentTermsId) : "",
      paymentTermsName: po.paymentTermsName || "",
      createdBy: po.createdBy,
      createdOn: po.createdOn,
      status: po.status,
      remarks: po.remarks,
    });
    setDetails(
      safeDetails(po.details).map((d) => ({
        ...d,
        _rowId: Date.now() + Math.random(),
        indentId: sid(d.indentId),
        indentDetailId: sid(d.indentDetailId),
        itemId: sid(d.itemId),
      })),
    );
    setGstEnabled(po.gstEnabled !== false);
    setGstType(po.gstType || "local");
    setEditId(sid(po));
    setView("form");
  }

  function toggleGst() {
    const next = !gstEnabled;
    setGstEnabled(next);
    setDetails((prev) => prev.map((r) => calcRow(r, next, gstType)));
  }

  function toggleGstType() {
    const next = gstType === "local" ? "other" : "local";
    setGstType(next);
    setDetails((prev) => prev.map((r) => calcRow(r, gstEnabled, next)));
  }

  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      const coerced =
        field === "indentDetailId"
          ? val === "" || val == null
            ? ""
            : String(val)
          : isNaN(val) || val === "" ? val : +val;
      const row = {
        ...rows[idx],
        [field]: coerced,
      };

      if (field === "indentDetailId") {
        const found = indentDetailOptions.find(
          (o) => String(o.detailId) === String(val),
        );
        if (found) {
          row.indentDetailId = String(found.detailId);
          row.indentId = found.indentId;
          row.indentNo = found.indentNo;
          row.itemId = found.itemId || "";
          row.itemName = found.itemName;
          row.uom = found.uom;
          row.indentQty = found.indentQty || 0;
          row.alPoQty = found.alPoQty || 0;
          row.balQty = found.balQty || 0;
          row.poQty = found.balQty || 0;
          row.priceListRate = found.priceListRate || 0;
          row.poRate = found.priceListRate || row.poRate || 0;
          row.gstPct = found.gstPct ?? 18;
          row.indentRemarks = found.indentRemarks || "";
        } else {
          row.indentDetailId = "";
          row.indentId = "";
          row.indentNo = "";
        }
      }

      rows[idx] = calcRow(row, gstEnabled, gstType);
      return rows;
    });
  }

  function addPendingLinesToDetails() {
    const picks = pendingIndentRows.filter((r) =>
      pendingSelected.has(r.rowId),
    );
    if (!picks.length) return;
    setDetails((prev) => {
      const isBlankOnly =
        prev.length === 1 &&
        !String(prev[0].indentDetailId || "").trim() &&
        !(prev[0].itemName || "").trim();
      const base = isBlankOnly ? [] : prev;
      const existing = new Set(
        base.map((r) => String(r.indentDetailId || "")).filter(Boolean),
      );
      const merged = picks
        .filter((p) => !existing.has(String(p.detailId)))
        .map((p) => buildDetailFromIndentOption(p, gstEnabled, gstType));
      return [...base, ...merged];
    });
    setPendingModalOpen(false);
  }

  function toggleDiscMode(idx) {
    setDetails((prev) => {
      const rows = [...prev];
      const next = rows[idx].discMode === "pct" ? "price" : "pct";
      rows[idx] = calcRow({ ...rows[idx], discMode: next }, gstEnabled, gstType);
      return rows;
    });
  }

  function addRow() {
    setDetails((p) => [...p, emptyDetail()]);
  }
  function removeRow(idx) {
    setDetails((p) => p.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!header.poNo.trim()) return setFormError("PO No is required");
    setFormError(null);
    setSaving(true);

    const cleanDetails = details.map(({ _rowId, ...rest }) => rest);
    const payload = { ...header, gstEnabled, gstType, details: cleanDetails, createdOn: header.createdOn || today() };

    try {
      if (editId) {
        const updated = await purchaseOrderApi.update(editId, payload);
        setPos((p) => p.map((x) => (sid(x) === editId ? updated : x)));
      } else {
        const created = await purchaseOrderApi.create(payload);
        setPos((p) => [created, ...p]);
        setEditId(sid(created));
        setHeader((h) => ({ ...h, poNo: created.poNo }));
      }
      await loadIndents();
      alert("Purchase Order has been saved successfully!");
    } catch (err) {
      setFormError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await purchaseOrderApi.remove(id);
      setPos((p) => p.filter((x) => sid(x) !== id));
      await loadIndents();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }


  const totals = details.reduce(
    (acc, r) => ({
      grossAmount: acc.grossAmount + (r.poQty || 0) * (r.poRate || 0),
      discPrice: acc.discPrice + (r.discPrice || 0),
      poAmount: acc.poAmount + (r.poAmount || 0),
      sgst: acc.sgst + (r.sgst || 0),
      cgst: acc.cgst + (r.cgst || 0),
      igst: acc.igst + (r.igst || 0),
      totGst: acc.totGst + (r.totGst || 0),
      totalAmount: acc.totalAmount + (r.totalAmount || 0),
      poQty: acc.poQty + (Number(r.poQty) || 0),
    }),
    {
      grossAmount: 0,
      discPrice: 0,
      poAmount: 0,
      sgst: 0,
      cgst: 0,
      igst: 0,
      totGst: 0,
      totalAmount: 0,
      poQty: 0,
    },
  );

  const rawTotalAmount = totals.totalAmount;
  const grandTotal = Math.round(rawTotalAmount);
  const roundOff = grandTotal - rawTotalAmount;

  const effectiveDiscPct =
    totals.grossAmount > 0 ? (totals.discPrice / totals.grossAmount) * 100 : 0;

  // Build flat list of all indent detail rows for the dropdown
  const indentDetailOptions = [];
  const pendingIndentRows = [];
  for (const indent of indents) {
    const detailsArray = safeDetails(indent.details);
    detailsArray.forEach((d, dIdx) => {
      const detailId = sid(d) || `idx-${sid(indent)}-${dIdx}`;
      const balQty = d.balQty ?? d.indentQty ?? 0;
      const gstRaw = d.gstPct;
      const gstPct =
        gstRaw !== undefined && gstRaw !== null && gstRaw !== ""
          ? Number(gstRaw)
          : 18;
      const priceListRate = Number(d.priceListRate) || 0;

      const opt = {
        detailId,
        indentId: sid(indent),
        indentNo: indent.indentNo,
        itemId: sid(d.itemId),
        itemName: d.itemName || "—",
        uom: d.uom || "",
        indentQty: d.indentQty || 0,
        alPoQty: d.alPoQty || 0,
        balQty,
        priceListRate,
        gstPct: Number.isFinite(gstPct) ? gstPct : 18,
        indentRemarks: d.remarks || "",
      };

      if (detailId) {
        indentDetailOptions.push(opt);
      }

      if (balQty > 0) {
        pendingIndentRows.push({
          ...opt,
          rowId: `${sid(indent)}-${detailId}`,
          date: indent.date,
        });
      }
    });
  }

  const selectStyle = {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 11.5,
    background: "transparent",
    padding: "2px 4px",
    cursor: "pointer",
  };

  const roInputStyle = {
    border: "none",
    outline: "none",
    fontSize: 11.5,
    background: "#f9fafb",
    color: "var(--text-secondary)",
    padding: "2px 4px",
    textAlign: "right",
    width: 70,
  };

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Purchase Order</h1>
            <p className="inv-page-sub">Manage purchase orders</p>
          </div>
          <button className="inv-btn-primary" onClick={openNew}>
            + New PO
          </button>
        </div>

        {listError && (
          <div className="inv-error-banner">
            {listError}{" "}
            <button
              onClick={loadPos}
              style={{ marginLeft: 8, textDecoration: "underline" }}
            >
              Retry
            </button>
          </div>
        )}

        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>PO No</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Created By</th>
                    <th>GST</th>
                    <th>GST Type</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr>
                      <td colSpan={10} className="inv-empty">
                        Loading…
                      </td>
                    </tr>
                  ) : pos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="inv-empty">
                        No purchase orders
                      </td>
                    </tr>
                  ) : (
                    pos.map((po, i) => {
                      const total = safeDetails(po.details).reduce(
                        (s, d) => s + (d.totalAmount || 0),
                        0,
                      );
                      return (
                        <tr key={sid(po)}>
                          <td className="inv-idx">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                            {po.poNo}
                          </td>
                          <td>{po.date}</td>
                          <td>{po.supplierName}</td>
                          <td>{po.createdBy}</td>
                          <td>
                            <span
                              className={`inv-badge ${po.gstEnabled !== false ? "inv-badge-yes" : "inv-badge-no"}`}
                            >
                              {po.gstEnabled !== false ? "Yes" : "No"}
                            </span>
                          </td>
                          <td>
                            {po.gstEnabled !== false ? (
                              <span
                                className={`inv-badge ${po.gstType === "other" ? "inv-badge-no" : "inv-badge-yes"}`}
                              >
                                {po.gstType === "other" ? "Other State" : "Local"}
                              </span>
                            ) : (
                              <span className="inv-badge inv-badge-no">—</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`inv-badge ${po.status === "Open" ? "inv-badge-yes" : "inv-badge-no"}`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontWeight: 500,
                            }}
                          >
                            ₹{fmt(total)}
                          </td>
                          <td>
                            <div className="inv-actions">
                              <button
                                className="inv-btn-icon"
                                onClick={() => openEdit(po)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                className="inv-btn-icon inv-btn-danger"
                                onClick={() => handleDelete(sid(po))}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
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
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FORM VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="inv-page">
      {newSupplierModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal">
            <div className="inv-modal-header">New Supplier</div>
            <div className="inv-modal-body">
              <input className="inv-input" placeholder="Supplier Name" value={newSupplierForm.supplierName} onChange={e => setNewSupplierForm(f => ({ ...f, supplierName: e.target.value }))} style={{ marginBottom: 8 }} />
              <input className="inv-input" placeholder="Category (e.g. Services, Goods)" value={newSupplierForm.type} onChange={e => setNewSupplierForm(f => ({ ...f, type: e.target.value }))} style={{ marginBottom: 8 }} />
              <input className="inv-input" placeholder="Short Code (e.g. VEND01)" value={newSupplierForm.shortCode} onChange={e => setNewSupplierForm(f => ({ ...f, shortCode: e.target.value }))} />
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-secondary" onClick={() => setNewSupplierModalOpen(false)}>Cancel</button>
              <button className="inv-btn-primary" onClick={handleCreateSupplier} disabled={savingSupplier}>{savingSupplier ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">
            {editId ? "Edit Purchase Order" : "New Purchase Order"}
          </h1>
          <p className="inv-page-sub">Fill header, select indents and save</p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="inv-btn-primary inv-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save PO"}
          </button>
          <button className="inv-btn-secondary" type="button" onClick={() => setView("list")}>
            View PO
          </button>
          <button
            type="button"
            className="inv-btn-ghost"
            onClick={() =>
              printPurchaseOrder({
                header,
                details,
                totals,
                gstEnabled,
                gstType,
              })
            }
          >
            Print
          </button>
          {/* GST Enabled toggle */}
          <button
            type="button"
            onClick={toggleGst}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 8,
              cursor: "pointer",
              border: gstEnabled ? "1px solid #86efac" : "1px solid #fca5a5",
              background: gstEnabled ? "#f0fdf4" : "#fff1f2",
              color: gstEnabled ? "#16a34a" : "#dc2626",
              fontWeight: 600,
              fontSize: 13,
              transition: "all 0.2s",
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-block",
                width: 34,
                height: 18,
                borderRadius: 100,
                background: gstEnabled ? "#16a34a" : "#d1d5db",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: gstEnabled ? 18 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </span>
            GST {gstEnabled ? "On" : "Off"}
          </button>

          {/* GST Type toggle */}
          {gstEnabled && (
            <button
              type="button"
              onClick={toggleGstType}
              title="Toggle between Local (SGST+CGST) and Other State (IGST)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                cursor: "pointer",
                border: gstType === "local" ? "1px solid #93c5fd" : "1px solid #c4b5fd",
                background: gstType === "local" ? "#eff6ff" : "#f5f3ff",
                color: gstType === "local" ? "#1d4ed8" : "#7c3aed",
                fontWeight: 600,
                fontSize: 13,
                transition: "all 0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              {gstType === "local" ? "Local (SGST+CGST)" : "Other State (IGST)"}
            </button>
          )}

        </div>
      </div>

      {formError && (
        <div className="inv-error-banner" style={{ marginBottom: 12 }}>
          {formError}
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* ── LEFT PANEL: Header & Summary ── */}
        <div style={{ flex: "1 1 300px", maxWidth: "350px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* ── Header card ── */}
          <div className="inv-card">
            <div className="inv-card-body">
              <div className="inv-section-label">Header</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="inv-field">
                  <label className="inv-label">
                    PO No
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#6366f1",
                        background: "#eef2ff",
                        border: "1px solid #c7d2fe",
                        borderRadius: 4,
                        padding: "1px 6px",
                        letterSpacing: "0.03em",
                      }}
                    >
                      Auto
                    </span>
                  </label>
                  <input
                    className="inv-input"
                    value={header.poNo}
                    readOnly={!editId}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, poNo: e.target.value }))
                    }
                    style={{
                      background: editId ? undefined : "#f8f7ff",
                      color: "#4f46e5",
                      fontWeight: 600,
                      cursor: editId ? "text" : "default",
                      border: "1px solid #c7d2fe",
                    }}
                  />
                </div>
                <div className="inv-field">
                  <label className="inv-label">Date</label>
                  <input
                    className="inv-input"
                    type="date"
                    value={header.date}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, date: e.target.value }))
                    }
                  />
                </div>
                <div className="inv-field">
                  <label className="inv-label" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>
                      Supplier
                      {loadingSuppliers && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: "#6b7280" }}>
                          Loading...
                        </span>
                      )}
                    </span>
                    <button
                  type="button"
                  onClick={() => setNewSupplierModalOpen(true)}
                  style={{ fontSize: 10, color: "#6366f1", border: "none", background: "none", cursor: "pointer", padding: 0 }}
                >
                  + New Supplier
                </button>
                  </label>
                  <select
                    className="inv-input"
                    value={header.supplierId}
                    onChange={(e) => {
                      const s = suppliers.find((x) => sid(x) === e.target.value);
                      const ptId = s?.paymentTermsId ? String(s.paymentTermsId) : "";
                      const pt = ptId
                        ? paymentTermsList.find((x) => sid(x) === ptId)
                        : null;
                      setHeader((h) => ({
                        ...h,
                        supplierId: e.target.value,
                        supplierName: s?.supplierName || "",
                        paymentTermsId: ptId,
                        paymentTermsName: pt?.name || "",
                      }));
                    }}
                    disabled={loadingSuppliers}
                  >
                    <option value="">
                      {loadingSuppliers ? "Loading suppliers..." : "Select supplier"}
                    </option>
                    {suppliers.map((s) => (
                      <option key={sid(s)} value={sid(s)}>
                        {s.supplierName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inv-field" style={{ display: "none" }}>
                  <label className="inv-label">Status</label>
                  <select
                    className="inv-input"
                    value={header.status}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, status: e.target.value }))
                    }
                  >
                    {["Open", "Closed", "Cancelled"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inv-field">
                  <label className="inv-label">Payment terms</label>
                  <select
                    className="inv-input"
                    value={header.paymentTermsId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const pt = paymentTermsList.find(
                        (x) => String(x.id || x._id) === id,
                      );
                      setHeader((h) => ({
                        ...h,
                        paymentTermsId: id,
                        paymentTermsName: pt?.name || "",
                      }));
                    }}
                  >
                    <option value="">Optional — select terms</option>
                    {paymentTermsList.map((p) => (
                      <option key={sid(p)} value={sid(p)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inv-field" style={{ display: "none" }}>
                  <label className="inv-label">Created By</label>
                  <input
                    className="inv-input"
                    value={header.createdBy}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, createdBy: e.target.value }))
                    }
                  />
                </div>
                <div className="inv-field" style={{ display: "none" }}>
                  <label className="inv-label">Created On</label>
                  <input
                    className="inv-input"
                    type="date"
                    value={header.createdOn}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, createdOn: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Summary card ── */}
          <div className="inv-card">
            <div className="inv-card-body">
              <div className="inv-section-label">Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">Remarks</div>
                  <input
                    className="inv-input"
                    value={header.remarks}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, remarks: e.target.value }))
                    }
                    placeholder="Optional remarks"
                    style={{ marginTop: 4, background: "transparent" }}
                  />
                </div>

                <div className="inv-summary-box" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
                  <div className="inv-summary-box-label">Gross Amount</div>
                  <div className="inv-summary-box-value" style={{ color: "#64748b" }}>
                    ₹{fmt(totals.grossAmount)}
                  </div>
                </div>

                <div
                  className="inv-summary-box"
                  style={{ background: "#fffbeb", borderColor: "#fcd34d", position: "relative", overflow: "hidden" }}
                >
                  {totals.discPrice > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 0,
                        background: "#f59e0b",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 8px 2px 6px",
                        borderRadius: "4px 0 0 4px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      SAVINGS
                    </div>
                  )}
                  <div className="inv-summary-box-label">Total Discount</div>
                  <div className="inv-summary-box-value" style={{ color: "#b45309" }}>
                    −₹{fmt(totals.discPrice)}
                  </div>
                  <div style={{ fontSize: 11, color: "#92400e", marginTop: 2, fontWeight: 500 }}>
                    {effectiveDiscPct.toFixed(2)}% effective
                  </div>
                </div>

                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">PO Amount (after disc)</div>
                  <div className="inv-summary-box-value">₹{fmt(totals.poAmount)}</div>
                </div>

                {gstEnabled && (
                  <>
                    <div className="inv-summary-box">
                      <div className="inv-summary-box-label">Total GST</div>
                      <div className="inv-summary-box-value">₹{fmt(totals.totGst)}</div>
                    </div>
                  </>
                )}

                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">Round Off</div>
                  <div className="inv-summary-box-value">₹{fmt(roundOff)}</div>
                </div>

                <div className="inv-summary-box" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                  <div className="inv-summary-box-label">Grand Total</div>
                  <div className="inv-summary-box-value" style={{ color: "var(--accent)" }}>
                    ₹{fmt(grandTotal)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Detail ── */}
        <div style={{ flex: "999 1 500px", minWidth: 0 }}>
          {/* ── Detail card ── */}
          <div className="inv-card">
        <div className="inv-card-body">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div className="inv-section-label" style={{ marginBottom: 0 }}>
              Detail
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="inv-btn-secondary inv-btn-sm"
                onClick={async () => {
                  await loadIndents();
                  setPendingModalOpen(true);
                }}
              >
                Pending
              </button>
              <button className="inv-btn-secondary inv-btn-sm" onClick={addRow}>
                + Add Row
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="po-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th style={{ minWidth: 100 }}>Indent No</th>
                  <th style={{ minWidth: 220 }}>
                    Item Description
                  </th>
                  <th style={{ minWidth: 80 }}>UOM</th>
                  <th style={{ minWidth: 80 }}>Indent Qty</th>
                  <th style={{ minWidth: 80 }}>Al PO Qty</th>
                  <th style={{ minWidth: 80 }}>Bal Qty</th>
                  <th style={{ minWidth: 80 }}>PO Qty</th>
                  <th style={{ minWidth: 90 }}>PL Rate</th>
                  <th style={{ minWidth: 90 }}>PO Rate</th>
                  <th style={{ minWidth: 140 }}>
                    Disc
                    <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 400, marginLeft: 4 }}>
                      (per row ▾)
                    </span>
                  </th>
                  <th>PO Amt</th>
                  {gstEnabled && (
                    <>
                      <th>GST %</th>
                      {gstType === "local" ? (
                        <>
                          <th>SGST</th>
                          <th>CGST</th>
                        </>
                      ) : (
                        <th>IGST</th>
                      )}
                      <th>Tot GST</th>
                    </>
                  )}
                  <th>Total Amt</th>
                  <th style={{ minWidth: 130 }}>Indent Rem</th>
                  <th style={{ minWidth: 130 }}>PO Rem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={row._rowId}>
                    <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                      {idx + 1}
                    </td>

                    {/* Indent No — read-only */}
                    <td>
                      <input
                        value={row.indentNo || "—"}
                        readOnly
                        style={{ ...roInputStyle, width: 90, textAlign: "left" }}
                      />
                    </td>

                    {/* Indent item picker */}
                    <td style={{ minWidth: 220 }}>
                      <select
                        value={String(row.indentDetailId ?? "")}
                        onChange={(e) =>
                          updateDetail(idx, "indentDetailId", e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="">— select indent item —</option>
                        {indentDetailOptions.map((opt, optIdx) => (
                          <option
                            key={`${opt.detailId}-${optIdx}`}
                            value={String(opt.detailId)}
                          >
                            {opt.itemName} (bal: {fmtQty(opt.balQty)} / {fmtQty(opt.indentQty)} {opt.uom})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* UOM — read-only */}
                    <td>
                      <input
                        value={row.uom}
                        readOnly
                        style={{ ...roInputStyle, width: 60 }}
                        placeholder="—"
                      />
                    </td>

                    {/* Indent Qty — read-only */}
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={row.indentQty}
                        readOnly
                        style={{ ...roInputStyle, textAlign: "right" }}
                      />
                    </td>

                    {/* Al PO Qty — read-only (THE FIX: added readOnly) */}
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={row.alPoQty}
                        readOnly
                        style={{ ...roInputStyle, textAlign: "right" }}
                      />
                    </td>

                    {/* Bal Qty — read-only */}
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={row.balQty}
                        readOnly
                        style={{
                          ...roInputStyle,
                          textAlign: "right",
                          background:
                            row.balQty === 0 && row.indentQty > 0 ? "#fff7ed" : "#f9fafb",
                          color:
                            row.balQty === 0 && row.indentQty > 0
                              ? "#c2410c"
                              : "var(--text-secondary)",
                        }}
                      />
                    </td>

                    {/* PO Qty — editable */}
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={row.poQty}
                        min={0}
                        onChange={(e) => updateDetail(idx, "poQty", e.target.value)}
                        style={{ width: 70, textAlign: "right" }}
                      />
                    </td>

                    {/* PL Rate */}
                    <td>
                      <input
                        type="number"
                        value={row.priceListRate}
                        onChange={(e) => updateDetail(idx, "priceListRate", e.target.value)}
                        style={{ width: 80, textAlign: "right" }}
                      />
                    </td>

                    {/* PO Rate */}
                    <td>
                      <input
                        type="number"
                        value={row.poRate}
                        onChange={(e) => updateDetail(idx, "poRate", e.target.value)}
                        style={{ width: 80, textAlign: "right" }}
                      />
                    </td>

                    {/* Discount */}
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <button
                          type="button"
                          onClick={() => toggleDiscMode(idx)}
                          title={`Switch to ${row.discMode === "pct" ? "flat price" : "percentage"} mode`}
                          style={{
                            flexShrink: 0,
                            padding: "2px 5px",
                            fontSize: 10,
                            fontWeight: 600,
                            borderRadius: 4,
                            border: "1px solid",
                            cursor: "pointer",
                            lineHeight: 1.4,
                            minWidth: 32,
                            textAlign: "center",
                            transition: "all 0.15s",
                            background: row.discMode === "pct" ? "#eff6ff" : "#fefce8",
                            borderColor: row.discMode === "pct" ? "#93c5fd" : "#fde047",
                            color: row.discMode === "pct" ? "#1d4ed8" : "#854d0e",
                          }}
                        >
                          {row.discMode === "pct" ? "%" : "₹"}
                        </button>
                        {row.discMode === "pct" ? (
                          <input
                            type="number"
                            value={row.discPct}
                            onChange={(e) => updateDetail(idx, "discPct", e.target.value)}
                            style={{ width: 56, textAlign: "right" }}
                            placeholder="0"
                          />
                        ) : (
                          <input
                            type="number"
                            value={row.discPrice}
                            onChange={(e) => updateDetail(idx, "discPrice", e.target.value)}
                            style={{ width: 72, textAlign: "right" }}
                            placeholder="0.00"
                          />
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {row.discMode === "pct"
                            ? `₹${fmt(row.discPrice)}`
                            : `${(row.discPct || 0).toFixed(2)}%`}
                        </span>
                      </div>
                    </td>

                    {/* PO Amount */}
                    <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11 }}>
                      {fmt(row.poAmount)}
                    </td>

                    {/* GST columns */}
                    {gstEnabled && (
                      <>
                        <td>
                          <input
                            type="number"
                            value={row.gstPct}
                            onChange={(e) => updateDetail(idx, "gstPct", e.target.value)}
                            style={{ width: 50, textAlign: "right" }}
                          />
                        </td>
                        {gstType === "local" ? (
                          <>
                            <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11 }}>
                              {fmt(row.sgst)}
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11 }}>
                              {fmt(row.cgst)}
                            </td>
                          </>
                        ) : (
                          <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11 }}>
                            {fmt(row.igst)}
                          </td>
                        )}
                        <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11 }}>
                          {fmt(row.totGst)}
                        </td>
                      </>
                    )}

                    {/* Total Amount */}
                    <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11 }}>
                      {fmt(row.totalAmount)}
                    </td>

                    {/* Indent Remarks */}
                    <td>
                      <input
                        value={row.indentRemarks}
                        onChange={(e) => updateDetail(idx, "indentRemarks", e.target.value)}
                        style={{ width: 120 }}
                        placeholder="Indent rem…"
                      />
                    </td>

                    {/* PO Remarks */}
                    <td>
                      <input
                        value={row.poRemarks}
                        onChange={(e) => updateDetail(idx, "poRemarks", e.target.value)}
                        style={{ width: 120 }}
                        placeholder="PO rem…"
                      />
                    </td>

                    {/* Remove row */}
                    <td>
                      <button
                        className="inv-btn-icon inv-btn-danger"
                        onClick={() => removeRow(idx)}
                        style={{ padding: "2px 6px", fontSize: 13 }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Footer totals */}
              <tfoot>
                <tr>
                  <td colSpan={7} style={{ textAlign: "right", fontWeight: 600 }}>
                    Total
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "DM Mono", fontWeight: 600 }}>
                    {fmtQty(totals.poQty)}
                  </td>
                  <td colSpan={2}></td>
                  <td style={{ textAlign: "right", fontFamily: "DM Mono", fontSize: 11, color: "#dc2626" }}>
                    {totals.discPrice > 0 ? "−" : ""}₹{fmt(totals.discPrice)}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                    {fmt(totals.poAmount)}
                  </td>
                  {gstEnabled && (
                    <>
                      <td></td>
                      {gstType === "local" ? (
                        <>
                          <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                            {fmt(totals.sgst)}
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                            {fmt(totals.cgst)}
                          </td>
                        </>
                      ) : (
                        <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                          {fmt(totals.igst)}
                        </td>
                      )}
                      <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                        {fmt(totals.totGst)}
                      </td>
                    </>
                  )}
                  <td style={{ textAlign: "right", fontFamily: "DM Mono", fontWeight: 600 }}>
                    {fmt(totals.totalAmount)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

        </div>
      </div>

      {pendingModalOpen && (
        <Modal
          maxWidth="920px"
          title={`Pending indent lines (${pendingIndentRows.length})`}
          onClose={() => setPendingModalOpen(false)}
          onSave={addPendingLinesToDetails}
          saveLabel={
            pendingSelected.size
              ? `Add ${pendingSelected.size} to PO`
              : "Add selected to PO"
          }
          saveDisabled={pendingSelected.size === 0}
        >
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
            Select lines with balance, then click <strong>Add selected to PO</strong> (or Cancel to close).
          </p>
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      aria-label="Select all pending lines"
                      checked={
                        pendingIndentRows.length > 0 &&
                        pendingSelected.size === pendingIndentRows.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPendingSelected(
                            new Set(pendingIndentRows.map((r) => r.rowId)),
                          );
                        } else {
                          setPendingSelected(new Set());
                        }
                      }}
                    />
                  </th>
                  <th>#</th>
                  <th>Indent No</th>
                  <th>Date</th>
                  <th>Item</th>
                  <th>UOM</th>
                  <th>Indent Qty</th>
                  <th>Already PO Qty</th>
                  <th>Balance Qty</th>
                </tr>
              </thead>
              <tbody>
                {pendingIndentRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="inv-empty">
                      No pending purchase indents
                    </td>
                  </tr>
                ) : (
                  pendingIndentRows.map((row, idx) => (
                    <tr key={row.rowId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={pendingSelected.has(row.rowId)}
                          onChange={() => {
                            setPendingSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.rowId)) next.delete(row.rowId);
                              else next.add(row.rowId);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="inv-idx">{String(idx + 1).padStart(2, "0")}</td>
                      <td style={{ fontWeight: 600 }}>{row.indentNo}</td>
                      <td>{row.date}</td>
                      <td>{row.itemName}</td>
                      <td>{row.uom}</td>
                      <td>{row.indentQty}</td>
                      <td>{row.alPoQty}</td>
                      <td style={{ fontWeight: 600, color: "#b45309" }}>
                        {row.balQty}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {newSupplierModalOpen && (
        <SupplierCreateModal
          onClose={() => setNewSupplierModalOpen(false)}
          onCreated={async (created) => {
            await loadSuppliers();
            setHeader((h) => ({ ...h, supplierId: sid(created), supplierName: created.supplierName }));
            setNewSupplierModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
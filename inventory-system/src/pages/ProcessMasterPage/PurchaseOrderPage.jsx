import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { purchaseOrderApi, paymentTermsApi, supplierApi } from "../../services/inventoryApi";
import Modal from "../../components/Modal";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

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
  supplierAddress: "",
  supplierGst: "",
  paymentTermsId: "",
  paymentTermsName: "",
  createdBy: "Admin",
  createdOn: today(),
  status: "Open",
  remarks: "",
});

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ("0000000" + num).substr(-7).match(/^(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Hundred ' : '';
  str += (n[4] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'only ' : '';
  return str;
};

function printPurchaseOrder({
  header,
  details: detailRows,
  totals,
  gstEnabled,
  gstType,
  company,
  supplier,
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
    <div style="width: 280px;">
      <table class="sum">
        <tr><td>Gross amount</td><td>₹${fmt(totals.grossAmount)}</td></tr>
        ${totals.discPrice > 0
          ? `<tr><td>Less discount</td><td>−₹${fmt(totals.discPrice)}</td></tr>`
          : ""
        }
        <tr><td>Taxable value</td><td>₹${fmt(totals.poAmount)}</td></tr>
        ${gstEnabled
          ? gstType === "other"
            ? `<tr><td>IGST</td><td>₹${fmt(totals.igst)}</td></tr>`
            : `<tr><td>SGST</td><td>₹${fmt(totals.sgst)}</td></tr>
                   <tr><td>CGST</td><td>₹${fmt(totals.cgst)}</td></tr>`
          : `<tr><td>Tax</td><td>₹0.00</td></tr>`
        }
        <tr class="grand"><td><strong>Grand total</strong></td><td><strong>₹${fmt(totals.totalAmount)}</strong></td></tr>
      </table>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>PO ${esc(header.poNo)}</title>
<style>
@page { margin: 8mm; size: A4; }
*{box-sizing:border-box;}
body{font-family: Arial, sans-serif; margin:0; padding:10px; color:#000; font-size:10px;}
.container { border: 1px solid #000; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 4px; vertical-align: top; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.bold { font-weight: bold; }
.title { font-size: 14px; border-bottom: 2px solid #000; padding: 4px; margin-bottom: 0; }
.header-table td { padding: 2px 5px; }
.header-box { display: flex; border-bottom: 1px solid #000; }
.header-left { flex: 2; border-right: 1px solid #000; padding: 5px; text-align: center; }
.header-right { flex: 1; }
.doc-info-table td { border: 0; border-bottom: 1px solid #000; border-right: 1px solid #000; }
.doc-info-table td:last-child { border-right: 0; }
.doc-info-table tr:last-child td { border-bottom: 0; }
.section-title { background: #f0f0f0; font-weight: bold; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #000; padding: 2px 5px; }
.party-box { display: flex; border-bottom: 1px solid #000; }
.party-left { flex: 2; border-right: 1px solid #000; }
.party-right { flex: 1; }
.delivery-box { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #000; }
.delivery-col { border-right: 1px solid #000; min-height: 80px; }
.delivery-col:last-child { border-right: 0; }
.lines-table th { background: #f0f0f0; font-size: 9px; }
.lines-table td { height: 25px; border-top: 0; border-bottom: 0; }
.lines-table tr.last-row td { border-bottom: 1px solid #000; height: auto; }
.footer-box { display: flex; border-top: 1px solid #000; }
.footer-left { flex: 2; border-right: 1px solid #000; }
.footer-right { flex: 1; }
.summary-table td { border: 0; border-bottom: 1px solid #000; padding: 3px 5px; }
.summary-table tr:last-child td { border-bottom: 0; }
.words-box { padding: 5px; border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 9px; }
.signature-grid { display: grid; grid-template-columns: 1fr 1fr 1.5fr 1fr 1.5fr; }
.sig-col { border-right: 1px solid #000; padding: 5px; height: 120px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
.sig-col:last-child { border-right: 0; }
.sig-label { font-weight: bold; font-size: 9px; text-transform: uppercase; }
@media print { .no-print { display: none; } }
</style></head><body>

<div class="text-right bold" style="margin-bottom: 2px;">Page 1 of 1</div>
<div class="container">
  <div class="text-center bold title">PURCHASE ORDER</div>
  
  <div class="header-box">
    <div class="header-left" style="flex: 2; padding: 5px; text-align: left; display: flex; gap: 10px; align-items: center;">
      ${company?.logo ? `<img src="${company.logo}" style="max-height: 50px; width: auto;" alt="Logo"/>` : ""}
      <div>
        <div class="bold" style="font-size: 12px;">${esc(company?.companyName || "TEST COMPANY")}</div>
        <div style="font-size: 9px; margin-top: 2px;">${esc(company?.address || "Company Address")}</div>
        <div style="font-size: 9px;">Tel: ${esc(company?.tel || "")} Email: ${esc(company?.email || "")}</div>
        <div style="font-size: 9px;">GSTIN: ${esc(company?.gstin || "")}</div>
      </div>
    </div>
    <div class="header-right" style="border-left: 1px solid #000; flex: 1;">
      <table class="doc-info-table" style="height: 100%;">
        <tr style="background: #f0f0f0;">
          <td class="text-center bold">PO NUMBER</td>
          <td class="text-center bold">PO DATE</td>
        </tr>
        <tr>
          <td class="text-center bold" style="font-size: 12px; padding: 10px 0;">${esc(header.poNo)}</td>
          <td class="text-center bold" style="font-size: 11px;">${esc(new Date(header.date).toLocaleDateString("en-GB"))}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="party-box">
    <div class="party-left" style="flex: 1; border-right: 1px solid #000;">
       <div style="border-bottom: 1px solid #000; padding: 2px 5px;">
         <span class="bold">Reference:</span> ${esc(header.remarks || "")}
       </div>
       <div style="padding: 2px 5px;">
         <span class="bold">Delivery Date:</span> ${esc(new Date(header.date).toLocaleDateString("en-GB"))}
       </div>
    </div>
    <div class="party-right" style="flex: 2;">
      <div style="padding: 5px;">
        <span class="bold">Party:</span> ${esc(header.supplierName)}<br/>
        ${esc(header.supplierAddress || "")}<br/>
        GST: ${esc(header.supplierGst || "")}
      </div>
    </div>
  </div>

  <div class="delivery-box">
    <div class="delivery-col">
      <div class="section-title">PLACE OF DELIVERY</div>
      <div style="padding: 5px;">
        ${esc(company?.companyName)}<br/>
        ${esc(company?.address)}<br/>
        GST: ${esc(company?.gstin)}
      </div>
    </div>
    <div class="delivery-col">
      <div class="section-title">TRANSPORTED</div>
      <div style="padding: 5px;"></div>
    </div>
    <div class="delivery-col">
      <div class="section-title">INVOICE TO BE SENT TO</div>
      <div style="padding: 5px;">
        ${esc(company?.companyName)}<br/>
        ${esc(company?.address)}<br/>
        GST: ${esc(company?.gstin)}
      </div>
    </div>
  </div>

  <table class="lines-table">
    <thead>
      <tr>
        <th width="40">SNO</th>
        <th>ITEM NAME</th>
        <th width="70">DISCOUNT%</th>
        <th width="50">TAX%</th>
        <th width="50">UOM</th>
        <th width="70">QUANTITY</th>
        <th width="70">RATE</th>
        <th width="80">VALUE</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((d, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td>${esc(d.itemName)}</td>
          <td class="text-right">${d.discPct > 0 ? fmt(d.discPct) : ""}</td>
          <td class="text-right">${fmt(d.gstPct)}</td>
          <td class="text-center">${esc(d.uom)}</td>
          <td class="text-right">${fmtQty(d.poQty)}</td>
          <td class="text-right">${fmt(d.poRate)}</td>
          <td class="text-right">${fmt(d.poAmount)}</td>
        </tr>
      `).join("")}
      ${Array.from({ length: Math.max(0, 10 - rows.length) }).map(() => `
        <tr>
          <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `).join("")}
      <tr class="last-row">
        <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer-box">
    <div class="footer-left">
      <table class="summary-table">
        <tr>
          <td class="bold">Gross Value</td>
          <td class="text-right bold">${fmt(totals.grossAmount)}</td>
        </tr>
        <tr>
          <td>Discount</td>
          <td class="text-right">${fmt(totals.discPrice)}</td>
        </tr>
        <tr class="bold">
          <td>Basic Value</td>
          <td class="text-right">${fmt(totals.poAmount)}</td>
        </tr>
        <tr>
          <td>IGST</td>
          <td class="text-right">${gstType === "other" ? fmt(totals.igst) : "0.00"}</td>
        </tr>
        <tr>
          <td>CGST ${gstType === "local" ? "2.5%" : ""}</td>
          <td class="text-right">${gstType === "local" ? fmt(totals.cgst) : "0.00"}</td>
        </tr>
        <tr>
          <td>SGST ${gstType === "local" ? "2.5%" : ""}</td>
          <td class="text-right">${gstType === "local" ? fmt(totals.sgst) : "0.00"}</td>
        </tr>
        <tr>
          <td>Other Charges</td>
          <td class="text-right">0.00</td>
        </tr>
        <tr>
          <td>Round off</td>
          <td class="text-right">0.00</td>
        </tr>
        <tr class="bold" style="font-size: 11px; background: #f0f0f0;">
          <td>Net Value</td>
          <td class="text-right">${fmt(totals.totalAmount)}</td>
        </tr>
      </table>
    </div>
    <div class="footer-right">
      <div class="section-title" style="border-bottom: 0;">REMARKS</div>
      <div style="padding: 5px; height: 100px;">
        ${esc(header.remarks)}
      </div>
    </div>
  </div>

  <div class="words-box">
    <span class="bold">VALUE IN WORDS</span> Rupees ${numberToWords(Math.round(totals.totalAmount))}
  </div>

  <div class="signature-grid">
    <div class="sig-col">
      <div style="height: 60px;"></div>
      <div class="sig-label">PREPARED BY</div>
    </div>
    <div class="sig-col">
      <div style="height: 60px;"></div>
      <div class="sig-label">VERIFIED BY</div>
    </div>
    <div class="sig-col">
      <div style="width: 100%;">
        <div class="bold">Name:</div>
        <div class="bold" style="margin-top: 10px;">Mobile No:</div>
        <div class="bold" style="margin-top: 10px;">Sign:</div>
      </div>
    </div>
    <div class="sig-col">
      <div style="height: 60px;"></div>
      <div class="sig-label">Received By</div>
    </div>
    <div class="sig-col">
      <div style="text-align: right; width: 100%; font-size: 9px;">For ${esc(company?.companyName)}</div>
      <div style="height: 40px;"></div>
      <div class="sig-label">Authorised Signatory</div>
    </div>
  </div>
</div>

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
function calcRow(row, gstEnabled) {
  const baseAmt = (row.poQty || 0) * (row.poRate || 0);
  const rowGstType = row.gstType || "local";

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
    if (rowGstType === "other") {
      igst = gst;
    } else {
      sgst = gst / 2;
      cgst = gst / 2;
    }
  }

  return {
    ...row,
    itemName: toTitleCase(row.itemName),
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

function buildDetailFromIndentOption(opt, gstEnabled) {
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
      gstType: opt.gstType || "local",
      indentRemarks: opt.indentRemarks || "",
    },
    gstEnabled
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const navigate = useNavigate();

  const [pos, setPos] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [company, setCompany] = useState(null);

  const [indents, setIndents] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingSelected, setPendingSelected] = useState(() => new Set());
  const [paymentTermsList, setPaymentTermsList] = useState([]);
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);

  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [header, setHeader] = useState(emptyHeader());
  const [details, setDetails] = useState([emptyDetail()]);

  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstType, setGstType] = useState("local");

  function handleGstTypeChange(type) {
    setGstType(type);
    setDetails((prev) => prev.map((row) => calcRow(row, gstEnabled, type)));
  }

  useEffect(() => {
    loadPos();
    loadIndents();
    loadSuppliers();
    openNew();
    (async () => {
      try {
        const [pt, comp] = await Promise.all([
          paymentTermsApi.getAll(),
          fetch("/api/company").then((res) => res.json()),
        ]);
        setPaymentTermsList(Array.isArray(pt) ? pt : []);
        setCompany(comp);
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
      supplierAddress: po.supplierAddress || "",
      supplierGst: po.supplierGst || "",
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
      setSaveSuccessModal(true);
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
            onClick={() => {
              const supplier = suppliers.find((s) => sid(s) === header.supplierId);
              printPurchaseOrder({
                header,
                details,
                totals,
                gstEnabled,
                gstType,
                company,
                supplier,
              });
            }}
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
                  onClick={() => navigate('/supplier')}
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
                      const type = s?.gstType || "local";
                      
                      setHeader((h) => ({
                        ...h,
                        supplierId: e.target.value,
                        supplierName: s?.supplierName || "",
                        supplierAddress: s?.address || "",
                        supplierGst: s?.gstNo || "",
                        paymentTermsId: ptId,
                        paymentTermsName: pt?.name || "",
                      }));
                      handleGstTypeChange(type);
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

                <div className="inv-field">
                  <label className="inv-label">Party Address</label>
                  <textarea
                    className="inv-input"
                    rows={2}
                    value={header.supplierAddress}
                    onChange={(e) => setHeader(h => ({ ...h, supplierAddress: e.target.value }))}
                    placeholder="Supplier Address"
                  />
                </div>
                <div className="inv-field">
                  <label className="inv-label">Party GST</label>
                  <input
                    className="inv-input"
                    value={header.supplierGst}
                    onChange={(e) => setHeader(h => ({ ...h, supplierGst: e.target.value }))}
                    placeholder="Supplier GSTIN"
                  />
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
      {saveSuccessModal && (
        <Modal
          title="Success"
          onClose={() => setSaveSuccessModal(false)}
          onSave={() => {
            setSaveSuccessModal(false);
            setView("list");
          }}
          saveLabel="Go to List"
        >
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "48px", color: "#10b981", marginBottom: "16px" }}>✓</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>Saved Successfully!</h3>
            <p style={{ color: "#64748b" }}>The Purchase Order has been recorded.</p>
          </div>
        </Modal>
      )}


      {saveSuccessModal && (
        <Modal
          title="Success"
          onClose={() => setSaveSuccessModal(false)}
          onSave={() => {
            setSaveSuccessModal(false);
            setView("list");
          }}
          saveLabel="Go to List"
        >
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "48px", color: "#10b981", marginBottom: "16px" }}>✓</div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>Saved Successfully!</h3>
            <p style={{ color: "#64748b" }}>The Purchase Indent has been recorded.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
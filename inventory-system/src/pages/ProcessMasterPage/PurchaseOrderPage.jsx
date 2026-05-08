import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import { purchaseOrderApi, paymentTermsApi, supplierApi, inventoryHeadApi, mainCategoryApi, itemApi } from "../../services/inventoryApi";
import Modal from "../../components/Modal";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SupplierDetailsModal = ({ supplier, onClose }) => {
  const Row = ({ label, value }) => !value ? null : (
    <div style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "13px" }}>
      <span style={{ width: 120, color: "#64748b", fontSize: "12px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, color: "#1e293b" }}>{value}</span>
    </div>
  );
  let addresses = [];
  try {
    if (Array.isArray(supplier.addresses)) addresses = supplier.addresses;
    else if (typeof supplier.addresses === "string") addresses = JSON.parse(supplier.addresses);
  } catch (e) { }

  return (
    <Modal title="Supplier Details" onClose={onClose} onSave={onClose} saveLabel="Close">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px", background: "#f8fafc", borderRadius: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#3b6ef8", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 700 }}>
          {supplier.supplierName?.[0]}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{supplier.supplierName}</div>
          <div style={{ fontSize: 11, color: "#3b6ef8", fontWeight: 600, textTransform: "uppercase" }}>{supplier.type}</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>Contact & Tax</div>
        <Row label="GST No" value={supplier.gstNo} />
        <Row label="PAN No" value={supplier.panNo} />
        <Row label="Email" value={supplier.emailId1} />
        <Row label="Mobile" value={supplier.mobileNo1} />
      </div>

      {addresses.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>Addresses</div>
          {addresses.map((addr, i) => (
            <div key={i} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8, background: addr.isPrimary ? "#fff" : "#fcfdfe" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: addr.isPrimary ? "#3b6ef8" : "#94a3b8", marginBottom: 4 }}>{addr.isPrimary ? "PRIMARY ADDRESS" : `ADDRESS ${i + 1}`}</div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{addr.address || addr.line1}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{addr.cityName}, {addr.stateName} {addr.pinCode}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

const emptyDetail = () => ({
  _rowId: Math.random(), indentDetailId: "", indentNo: "", itemId: "", itemName: "", uom: "", balQty: 0,
  poQty: 0, poRate: 0, discMode: "pct", discPct: 0, discPrice: 0, poAmount: 0,
  gstPct: 0, sgst: 0, cgst: 0, igst: 0, totGst: 0, totalAmount: 0
});

const emptyHeader = () => ({
  poNo: "", date: today(), supplierId: "", supplierName: "", supplierAddress: "", supplierGst: "",
  purchaseIndentId: "", purchaseIndentNo: "",
  refNo: "", refDate: "", paymentTermsId: "", paymentTermsName: "", deliveryDate: "",
  createdBy: "Admin", createdOn: today(), status: "Open", remarks: "",
  poType: "",
  preparedBy: ""
});

const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>{children}</div>
);

const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

function printPurchaseOrder({ header, details: detailRows, totals, gstEnabled, gstType, company, supplier }) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const grossValue = detailRows.reduce((s, d) => s + (Number(d.poQty || 0) * Number(d.poRate || 0)), 0);
  const discountAmount = grossValue - totals.poAmount;
  const igstAmount = detailRows.reduce((s, d) => s + (d.igst || 0), 0);
  const cgstAmount = detailRows.reduce((s, d) => s + (d.cgst || 0), 0);
  const sgstAmount = detailRows.reduce((s, d) => s + (d.sgst || 0), 0);

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>PO ${esc(header.poNo)}</title>
  <style>
    @page { margin: 8mm; size: A4; }
    * { box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 9.5px; margin: 0; padding: 0; color: #000; }
    .bold { font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 4px; vertical-align: top; }
    .no-border { border: none !important; }
    
    .container { border: 1px solid #000; margin-top: 2px; }
    .header-info td { border-bottom: none; border-top: none; }
    
    /* Main grid layouts */
    .grid-table { border: none; }
    .grid-table td { border-top: none; border-left: none; }
    .grid-table td:last-child { border-right: none; }
    
    .items-table { border-left: none; border-right: none; border-bottom: none; }
    .items-table th { background: #f0f0f0; border-top: 1px solid #000; }
    .items-table td { border-top: none; border-bottom: none; height: 25px; }
    .items-table tr.last-row td { height: 400px; border-bottom: 1px solid #000; } /* Spacer */
    
    .footer-table { border: none; }
    .footer-table td { border: none; }
    
    .summary-table td { padding: 3px 5px; border: none; }
    
    .signature-row td { height: 60px; vertical-align: bottom; border-top: 1px solid #000; border-bottom: none; }
  </style>
</head>
<body>
  <table style="border: none; margin-bottom: 2px;">
    <tr>
      <td class="no-border text-center bold" style="font-size: 15px; width: 80%; vertical-align: middle;">PURCHASE ORDER</td>
      <td class="no-border text-right bold" style="width: 20%; vertical-align: middle; font-size: 9px;">Page 1 of 1</td>
    </tr>
  </table>
  
  <div class="container">
    <table class="grid-table">
      <tr>
        <td colspan="2" style="width: 66.66%; border-bottom: 1px solid #000; padding: 0;">
          <table style="width: 100%; height: 100%; border: none;">
            <tr>
              <td style="width: 30%; border: none; text-align: center; vertical-align: middle; padding: 10px;">
                ${company?.logo ? `<img src="${company.logo}" style="height: 55px; max-width: 100%; object-fit: contain;" />` : ''}
              </td>
              <td class="text-center" style="width: 70%; border: none; vertical-align: middle; padding: 10px 10px 10px 0;">
                <div class="bold" style="font-size: 14px;">${esc(company?.companyName || "TEST COMPANY")}</div>
                <div style="font-size: 8.5px; margin-top: 4px;">${esc(company?.address || "Company Address")}</div>
                <div style="font-size: 8.5px;">Tel: ${esc(company?.phone || "")}, E-Mail: ${esc(company?.email || "")}</div>
                <div style="font-size: 8.5px;">GSTIN: ${esc(company?.gstin || "")}</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 33.33%; padding: 0; border-bottom: 1px solid #000; border-left: 1px solid #000;">
          <table style="height: 100%; border: none;">
            <tr>
              <td class="text-center bold" style="background: #e5e7eb; border-top: none; border-left: none; width: 50%; font-size: 9px;">PO NUMBER</td>
              <td class="text-center bold" style="background: #e5e7eb; border-top: none; border-right: none; width: 50%; font-size: 9px;">PO DATE</td>
            </tr>
            <tr>
              <td class="text-center bold" style="border-left: none; border-bottom: none; font-size: 11px; vertical-align: middle; height: 35px;">${esc(header.poNo)}</td>
              <td class="text-center bold" style="border-right: none; border-bottom: none; font-size: 11px; vertical-align: middle; height: 35px;">${esc(new Date(header.date).toLocaleDateString("en-GB"))}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border-bottom: 1px solid #000; padding: 5px;">
          <div><span class="bold">Party:</span> <span class="bold" style="margin-left: 10px; font-size: 11px;">${esc(header.supplierName)}</span></div>
          <div style="margin-top: 4px;">${esc(header.supplierAddress)}</div>
          <div style="margin-top: 4px;">GST: ${esc(header.supplierGst)}</div>
        </td>
        <td style="padding: 0; border-bottom: 1px solid #000; border-left: 1px solid #000;">
          <table style="height: 100%; border: none;">
            <tr><td style="border-top: none; border-left: none; border-right: none; padding: 5px;"><span class="bold">Reference:</span> ${esc(header.refNo || "")}</td></tr>
            <tr><td style="border-bottom: none; border-left: none; border-right: none; padding: 5px;"><span class="bold">Delivery Date:</span> <span style="margin-left: 10px;" class="bold">${esc(header.deliveryDate ? new Date(header.deliveryDate).toLocaleDateString("en-GB") : "")}</span></td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="width: 33.33%; border-bottom: none;">
          <div class="bold" style="text-transform: uppercase;">PLACE OF DELIVERY</div>
          <div class="bold" style="margin-top: 4px; font-size: 10px;">${esc(company?.companyName || "TEST COMPANY")}</div>
          <div style="margin-top: 2px;">${esc(company?.address || "")}</div>
          <div style="margin-top: 10px; font-size: 8px;">GST: ${esc(company?.gstin || "")}</div>
        </td>
        <td style="width: 33.33%; border-bottom: none; border-left: 1px solid #000;">
          <div class="bold" style="text-transform: uppercase;">TRANSPORTED</div>
          <div style="margin-top: 4px;"></div>
        </td>
        <td style="width: 33.33%; border-bottom: none; border-left: 1px solid #000;">
          <div class="bold" style="text-transform: uppercase;">INVOICE TO BE SENT TO</div>
          <div class="bold" style="margin-top: 4px; font-size: 10px;">${esc(company?.companyName || "TEST COMPANY")}</div>
          <div style="margin-top: 2px;">${esc(company?.address || "")}</div>
          <div style="margin-top: 10px; font-size: 8px;">GST: ${esc(company?.gstin || "")}</div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%; border-left: none;">SNO</th>
          <th style="width: 12%;">INDENT NO</th>
          <th style="width: 24%;">ITEM NAME</th>
          <th style="width: 9%;">DISCOUNT%</th>
          <th style="width: 6%;">TAX%</th>
          <th style="width: 7%;">UOM</th>
          <th style="width: 10%;">QUANTITY</th>
          <th style="width: 13%;">UNIT PRICE</th>
          <th style="width: 15%; border-right: none;">VALUE</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows.map((d, i) => `
        <tr>
          <td class="text-left" style="border-left: none;">${i + 1}</td>
          <td class="text-left" style="font-size: 8.5px;">${esc(d.indentNo || "Direct")}</td>
          <td class="text-left" style="font-size: 8.5px;">${esc(d.itemName)}</td>
          <td class="text-right">${d.discMode === 'pct' ? Number(d.discPct || 0).toFixed(2) : ''}</td>
          <td class="text-right">${Number(d.gstPct || 0).toFixed(2)}</td>
          <td class="text-center">${esc(d.uom)}</td>
          <td class="text-right">${Number(d.poQty || 0).toFixed(2)}</td>
          <td class="text-right">${Number(d.poRate || 0).toFixed(2)}</td>
          <td class="text-right" style="border-right: none;">${Number((d.poQty || 0) * (d.poRate || 0)).toFixed(2)}</td>
        </tr>
        `).join("")}
        <tr class="last-row">
          <td style="border-left: none;"></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td style="border-right: none;"></td>
        </tr>
      </tbody>
    </table>

    <table style="border: none; width: 100%;">
      <tr>
        <td style="width: 70%; padding: 0; border: none; border-right: 1px solid #000; vertical-align: top;">
          <table style="border: none; width: 100%; height: 100%;">
            <tr>
              <td style="border: none; border-bottom: 1px solid #000; height: 100px; vertical-align: top; padding: 5px;">
                <div class="bold" style="font-size: 8.5px; margin-bottom: 4px;">REMARKS</div>
                <div style="font-size: 9px;">${esc(header.remarks || "")}</div>
              </td>
            </tr>
            <tr>
              <td style="border: none; height: 40px; vertical-align: middle; padding: 5px;">
                <span class="bold" style="font-size: 8px;">VALUE IN WORDS</span> <span style="font-size: 9px; margin-left: 4px;">Rupees ${numberToWords(Math.round(totals.totalAmount))}</span>
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 30%; padding: 0; border: none; vertical-align: top;">
          <table class="summary-table" style="width: 100%;">
            <tr><td class="bold text-left">Gross Value</td><td class="text-right">${fmt(grossValue)}</td></tr>
            <tr><td class="bold text-left">Discount</td><td class="text-right">${fmt(discountAmount)}</td></tr>
            <tr><td class="bold text-left">Basic Value</td><td class="text-right">${fmt(totals.poAmount)}</td></tr>
            <tr><td class="text-left">IGST</td><td class="text-right">${fmt(igstAmount)}</td></tr>
            <tr><td class="text-left">CGST</td><td class="text-right">${fmt(cgstAmount)}</td></tr>
            <tr><td class="text-left">SGST</td><td class="text-right">${fmt(sgstAmount)}</td></tr>
            <tr><td class="text-left">Other Charges</td><td class="text-right">0.00</td></tr>
            <tr><td class="text-left" style="border-bottom: 1px solid #000; padding-bottom: 6px;">Round off</td><td class="text-right" style="border-bottom: 1px solid #000; padding-bottom: 6px;">0.00</td></tr>
            <tr><td class="bold text-left" style="font-size: 11px; padding-top: 6px;">Net Value</td><td class="bold text-right" style="font-size: 11px; padding-top: 6px;">${fmt(totals.totalAmount)}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <table style="border: none; width: 100%; margin-top: -1px;">
      <tr class="signature-row">
        <td style="width: 20%; border-left: none; text-align: center; font-weight: bold; font-size: 9px; padding-bottom: 10px;">PREPARED BY</td>
        <td style="width: 20%; text-align: center; font-weight: bold; font-size: 9px; padding-bottom: 10px;">VERIFIED BY</td>
        <td style="width: 30%; padding: 5px 10px 10px 10px;">
          <table style="border: none; width: 100%; margin-bottom: 8px;">
            <tr>
              <td style="border: none; padding: 2px; font-weight: bold; text-align: right; width: 15%; font-size: 9px;">Name:</td>
              <td style="border: none; padding: 2px; border-bottom: 1px dotted #000; width: 35%;"></td>
              <td style="border: none; padding: 2px; font-weight: bold; text-align: right; width: 20%; font-size: 9px;">Mobile:</td>
              <td style="border: none; padding: 2px; border-bottom: 1px dotted #000; width: 30%;"></td>
            </tr>
            <tr>
              <td style="border: none; padding: 2px; font-weight: bold; text-align: right; font-size: 9px;">Sign:</td>
              <td colspan="3" style="border: none; padding: 2px; border-bottom: 1px dotted #000;"></td>
            </tr>
          </table>
          <div style="text-align: right; font-weight: bold; font-size: 9px; padding-right: 5px;">Received By</div>
        </td>
        <td style="width: 30%; border-right: none; text-align: center; position: relative; padding-bottom: 10px;">
          <div class="bold" style="font-size: 9px; position: absolute; top: 5px; left: 0; right: 0;">For ${esc(company?.companyName || "TEST COMPANY")}</div>
          <div style="font-weight: bold; font-size: 9px; font-style: italic;">Authorised Signatory</div>
        </td>
      </tr>
    </table>
  </div>

  <script>
    window.onload = () => { setTimeout(() => window.print(), 300); }
  </script>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

export default function PurchaseOrderPage() {
  const { user } = useAuth();
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
  const [gstType, setGstType] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [formError, setFormError] = useState(null);
  const [listError, setListError] = useState(null);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingSelected, setPendingSelected] = useState(new Set());
  const [saveToast, setSaveToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  useEffect(() => {

    loadLookups(); loadPos(); openNew();
  }, []);

  async function loadLookups() {
    try {
      const [supps, inds, its, pterms, comp] = await Promise.all([
        purchaseOrderApi.getSuppliers(), purchaseOrderApi.getIndents(), itemApi.getAll(), paymentTermsApi.getAll(),
        fetch((import.meta.env.VITE_API_URL || "/api") + "/company").then(res => res.json()).catch(() => null)
      ]);
      setSuppliers(Array.isArray(supps) ? supps : []);
      setIndents(Array.isArray(inds) ? inds : []);
      setItems(Array.isArray(its) ? its : []);
      setTerms(Array.isArray(pterms) ? pterms : []);
      setCompany(comp);
    } catch (e) { console.error(e); }
  }

  async function loadPos() {
    setLoadingList(true);
    try {
      const data = await purchaseOrderApi.getAll();
      setPos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load POs:", err);
      if (typeof setListError === "function") {
        setListError(err.message);
      }
    } finally {
      setLoadingList(false);
    }
  }

  async function openNew() {
    setHeader({ ...emptyHeader(), preparedBy: user?.name || "Admin" }); 
    setDetails([emptyDetail()]); setEditId(null); setView("form"); setGstType("");
    try { const res = await purchaseOrderApi.getNextNumber(); if (res?.poNo) setHeader(h => ({ ...h, poNo: res.poNo })); } catch (e) { }
  }

  function openEdit(po) {
    const sId = sid(po.supplierId);
    const s = suppliers.find(x => sid(x) === sId);
    let addrText = "";
    if (s) {
      const parsedAddresses = safeDetails(s?.addresses);
      const primaryAddr = parsedAddresses.find(a => a.isPrimary) || parsedAddresses[0];
      if (primaryAddr) {
        const parts = [
          primaryAddr.address || primaryAddr.line1,
          primaryAddr.cityName,
          primaryAddr.stateName,
          primaryAddr.pinCode ? `PIN: ${primaryAddr.pinCode}` : ""
        ].filter(Boolean);
        addrText = parts.join(", ");
      }
    }

    setEditId(sid(po));
    setHeader({
      ...po,
      supplierId: sId,
      paymentTermsId: sid(po.paymentTermsId),
      supplierAddress: po.supplierAddress || addrText
    });
    setDetails(safeDetails(po.details).map(d => ({ ...d, _rowId: Math.random(), indentDetailId: sid(d.indentDetailId), itemId: sid(d.itemId) })));
    setGstType(po.gstType || "local");
    setGstEnabled(po.gstEnabled !== false);
    setView("form");
  }

  const calcRow = (row, gType = gstType) => {
    const qty = Number(row.poQty || 0); const rate = Number(row.poRate || 0);
    let disc = 0;
    if (row.discMode === 'pct') disc = (qty * rate) * (Number(row.discPct || 0) / 100);
    else disc = Number(row.discPrice || 0);
    const amt = (qty * rate) - disc;
    const gPct = Number(row.gstPct || 0);
    const tax = gstEnabled ? (amt * gPct / 100) : 0;
    return {
      ...row,
      grossAmount: qty * rate,
      rowDisc: disc,
      poAmount: amt, totGst: tax, totalAmount: amt + tax,
      sgst: gType === 'local' ? tax / 2 : 0, cgst: gType === 'local' ? tax / 2 : 0, igst: gType === 'other' ? tax : 0
    };
  };

  function updateDetail(idx, field, val) {
    setDetails(prev => {
      const rows = [...prev];
      let row = { ...rows[idx], [field]: val };

      if (field === "indentNo") {
        // Clear item-specific fields if indent source changes
        if (val !== rows[idx].indentNo) {
          row.indentDetailId = "";
          row.itemId = "";
          row.itemName = "";
          row.uom = "";
          row.balQty = 0;
          row.poRate = 0;
          row.poAmount = 0;
          row.totalAmount = 0;
        }
      }

      if (field === "indentDetailId") {
        const opt = indentDetailOptions.find(o => o.detailId === val);
        if (opt) {
          row.indentNo = opt.indentNo;
          row.itemId = opt.itemId;
          row.itemName = opt.itemName;
          row.uom = opt.uom;
          row.balQty = opt.balQty;
          row.balQty = opt.balQty;
          const itMaster = items.find(i => sid(i) === opt.itemId);
          row.poRate = opt.lastRate || itMaster?.purchaseRate || 0;
          row.gstPct = itMaster?.gstPercent !== undefined ? itMaster.gstPercent : (opt.gstPct !== undefined ? opt.gstPct : 0);
          row.poQty = opt.balQty;
        } else {
          row.indentNo = ""; row.itemId = ""; row.itemName = ""; row.uom = ""; row.balQty = 0;
        }
      }
      if (field === "itemId") {
        const it = items.find(i => sid(i) === val);
        if (it) {
          row.itemId = val; row.itemName = it.itemName; row.uom = it.uom; 
          row.gstPct = it.gstPercent !== undefined ? it.gstPercent : 0;
          row.indentDetailId = ""; row.indentNo = ""; row.balQty = 0;
        }
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
    setFormError(null);
    setSaving(true);
    const payload = { ...header, gstEnabled, gstType, details: details.map(({ _rowId, ...rest }) => rest) };
    try {
      if (editId) await purchaseOrderApi.update(editId, payload);
      else await purchaseOrderApi.create(payload);
      await loadPos();
      setSaveToast(editId ? "Purchase Order updated successfully!" : "Purchase Order saved successfully!");
      setTimeout(() => setSaveToast(""), 4000);
    } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  }

  const totals = details.reduce((acc, r) => ({
    grossAmount: acc.grossAmount + (r.grossAmount || 0),
    discPrice: acc.discPrice + (r.rowDisc || 0),
    poAmount: acc.poAmount + r.poAmount,
    totGst: acc.totGst + r.totGst,
    totalAmount: acc.totalAmount + r.totalAmount,
    sgst: acc.sgst + (r.sgst || 0),
    cgst: acc.cgst + (r.cgst || 0),
    igst: acc.igst + (r.igst || 0)
  }), { grossAmount: 0, discPrice: 0, poAmount: 0, totGst: 0, totalAmount: 0, sgst: 0, cgst: 0, igst: 0 });

  const effectiveDiscPct = totals.grossAmount > 0 ? (totals.discPrice / totals.grossAmount) * 100 : 0;

  const safeDetails = (d) => {
    if (Array.isArray(d)) return d;
    if (typeof d === "string") {
      try { return JSON.parse(d); } catch (e) { return []; }
    }
    return [];
  };
  const indentDetailOptions = indents.flatMap(ind => safeDetails(ind.details).map(d => {
    const itMaster = items.find(i => sid(i) === sid(d.itemId));
    return {
      indentNo: ind.indentNo, detailId: sid(d.id || d._id), itemId: sid(d.itemId), itemName: toTitleCase(d.itemName),
      uom: d.uom, balQty: d.indentQty, lastRate: d.rate, 
      gstPct: itMaster?.gstPercent !== undefined ? itMaster.gstPercent : (d.gstPct !== undefined ? d.gstPct : 0)
    };
  }));

  const pendingIndentRows = indents.flatMap(ind => safeDetails(ind.details).filter(d => (d.indentQty || 0) > 0).map(d => {
    const itMaster = items.find(i => sid(i) === sid(d.itemId));
    return {
      rowId: `${sid(ind.id || ind._id)}-${sid(d.id || d._id)}`, indentNo: ind.indentNo, detailId: sid(d.id || d._id),
      itemId: sid(d.itemId), itemName: toTitleCase(d.itemName), uom: d.uom, balQty: d.indentQty, rate: d.rate,
      gstPct: itMaster?.gstPercent || d.gstPct || 18
    };
  }));

  const uniqueIndentNos = [...new Set(indentDetailOptions.map(o => o.indentNo))];

  function addPendingLinesToDetails() {
    const selected = pendingIndentRows.filter(r => pendingSelected.has(r.rowId));
    const newRows = selected.map(s => calcRow({
      ...emptyDetail(), indentDetailId: s.detailId, indentNo: s.indentNo, itemId: s.itemId, itemName: s.itemName, uom: s.uom, balQty: s.balQty, poQty: s.balQty, poRate: s.rate || 0, 
      gstPct: s.gstPct !== undefined ? s.gstPct : 0
    }));
    setDetails(p => [...p.filter(r => r.itemId), ...newRows]);
    setPendingModalOpen(false); setPendingSelected(new Set());
  }

  if (view === "list") {
    const filteredPos = pos.filter(po => po.poNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const exportToExcel = () => {
      const headers = ["PO No", "Date", "Supplier", "Status", "Total Amount"];
      const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const rows = filteredPos.map(po => {
        const totalAmt = safeDetails(po.details).reduce((s, d) => s + (d.totalAmount || 0), 0);
        return [po.poNo, po.date, po.supplierName, po.status, totalAmt].map(escapeCsv).join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "purchase_orders.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div><h1 className="inv-page-title">Purchase Orders</h1><p className="inv-page-sub">Manage vendor procurement orders</p></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={exportToExcel}>Export to Excel</button>
            <button className="inv-btn-primary" onClick={openNew}>+ New Order</button>
          </div>
        </div>
        
        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body">
            <div className="inv-field" style={{ minWidth: 400, maxWidth: 400 }}>
              <label className="inv-label">Search PO No</label>
              <input 
                className="inv-input" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Type to search PO Number..." 
              />
            </div>
          </div>
        </div>

        <div className="inv-card">
          <table className="inv-table">
            <thead>
              <tr><th>#</th><th>PO No</th><th>Date</th><th>Supplier</th><th>Status</th><th>Total Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredPos.length === 0 && (
                <tr><td colSpan={7} className="inv-empty">No records found</td></tr>
              )}
              {filteredPos.map((po, i) => (
                <tr key={sid(po)}>
                  <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                  <td style={{ fontWeight: 600, color: "var(--accent)" }}>{po.poNo}</td>
                  <td>{po.date}</td>
                  <td>{po.supplierName}</td>
                  <td><span className={`inv-badge ${po.status === 'Open' ? 'inv-badge-yes' : 'inv-badge-no'}`}>{po.status}</span></td>
                  <td>₹{fmt(safeDetails(po.details).reduce((s, d) => s + (d.totalAmount || 0), 0))}</td>
                  <td>
                    <div className="inv-actions">
                      <button className="inv-btn-icon" onClick={() => openEdit(po)}>Edit</button>
                      <button className="inv-btn-icon inv-btn-danger" onClick={() => handleDelete(sid(po))}>Del</button>
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
          <button className="inv-btn-secondary" onClick={() => setView("list")}>View List</button>
          <button className="inv-btn-ghost" onClick={() => printPurchaseOrder({ header, details, totals, gstEnabled, gstType, company })}>Print</button>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>Save Order</button>
        </div>
      </div>

      {formError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}
      {saveToast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: "#10b981", color: "#fff",
          borderRadius: 10, padding: "14px 24px",
          boxShadow: "0 4px 24px rgba(16,185,129,0.3)",
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 15, fontWeight: 600,
          animation: "slideIn 0.3s ease"
        }}>
          <span style={{ fontSize: 20 }}>✓</span>
          {saveToast}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="inv-card">
          <div className="inv-card-body">

            <FormGrid>
              <Field label="PO No (Auto)"><input className="inv-input" value={header.poNo} readOnly style={{ background: "#f8f7ff", color: "#4f46e5", fontWeight: 600 }} /></Field>
              <Field label="Date"><input className="inv-input" type="date" value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} /></Field>

              <Field label="PO Type">
                <select className="inv-input" value={header.poType || ""} onChange={e => setHeader(h => ({ ...h, poType: e.target.value }))}>
                  <option value="">Select Type</option>
                  <option value="Consumables">Consumables</option>
                  <option value="Project">Project</option>
                  <option value="Capital Goods">Capital Goods</option>
                </select>
              </Field>
              <Field label="Supplier">
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <select className="inv-input" style={{ flex: 1 }} value={header.supplierId} onChange={e => {
                    const s = suppliers.find(x => sid(x) === e.target.value);
                    let newGstType = "local";
                    if (s) {
                      const compGst = (company?.gstin || "").trim();
                      const suppGst = (s.gstNo || "").trim();

                      // Only compare if both start with 2 digits (valid GST state codes)
                      const compCode = compGst.match(/^\d{2}/)?.[0];
                      const suppCode = suppGst.match(/^\d{2}/)?.[0];

                      if (compCode && suppCode) {
                        newGstType = compCode === suppCode ? "local" : "other";
                      } else {
                        // Fallback: check states if GSTINs are not fully available
                        const compState = (company?.state || company?.address || "").toLowerCase().replace(/\s+/g, '');
                        const parsedAddresses = safeDetails(s?.addresses);
                        const primaryAddr = parsedAddresses.find(a => a.isPrimary) || parsedAddresses[0];
                        const suppState = (s.state || primaryAddr?.stateName || "").toLowerCase().replace(/\s+/g, '');

                        if (compState && suppState && (compState.includes(suppState) || suppState.includes(compState))) {
                          newGstType = "local";
                        } else {
                          // Final fallback to the supplier's configured gstType or default to local
                          // We don't force "other" unless we have clear evidence (GST codes)
                          newGstType = s.gstType || "local";
                        }
                      }
                    }

                    setGstType(newGstType);

                    const parsedAddresses = safeDetails(s?.addresses);
                    const primaryAddr = parsedAddresses.find(a => a.isPrimary) || parsedAddresses[0];
                    let addrText = "";
                    if (primaryAddr) {
                      const parts = [
                        primaryAddr.address || primaryAddr.line1,
                        primaryAddr.cityName,
                        primaryAddr.stateName,
                        primaryAddr.pinCode ? `PIN: ${primaryAddr.pinCode}` : ""
                      ].filter(Boolean);
                      addrText = parts.join(", ");
                    }

                    setHeader(h => ({ ...h, supplierId: e.target.value, supplierName: toTitleCase(s?.supplierName || ""), supplierAddress: addrText, supplierGst: s?.gstNo || "" }));
                    // Recalculate taxes for all rows when GST type changes
                    setDetails(prev => prev.map(row => calcRow(row, newGstType)));
                  }}>
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={sid(s)} value={sid(s)}>{s.supplierName}</option>)}
                  </select>
                    <button type="button" className="inv-btn-icon" title="Add New Supplier" onClick={() => navigate("/supplier")} style={{ color: "#10b981" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    {header.supplierId && (
                      <button type="button" className="inv-btn-icon" title="View Supplier Details" onClick={() => {
                        const s = suppliers.find(x => sid(x) === header.supplierId);
                        if (s) setViewingSupplier(s);
                      }}>
                        <ViewIcon />
                      </button>
                    )}

                </div>
              </Field>
              <Field label="Reference No"><input className="inv-input" value={header.refNo} onChange={e => setHeader(h => ({ ...h, refNo: e.target.value }))} placeholder="e.g. Quote #123" /></Field>
              <Field label="Delivery Date"><input className="inv-input" type="date" value={header.deliveryDate} onChange={e => setHeader(h => ({ ...h, deliveryDate: e.target.value }))} /></Field>
              <Field label="GST No"><input className="inv-input" value={header.supplierGst} readOnly style={{ background: "#f8fafc" }} /></Field>
              <Field label="GST Type (Auto)"><input className="inv-input" value={!gstType ? "" : (gstType === "local" ? "Local (SGST+CGST)" : "Other State (IGST)")} readOnly style={{ background: "#f8fafc", color: "#64748b" }} /></Field>
            </FormGrid>
          </div>
        </div>

        <div className="inv-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="inv-card-body" style={{ minHeight: "400px", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "16px 20px", background: "#fcfdfe", borderBottom: "1px solid #e2e8f0" }}>
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
                    <th style={{ width: 140 }}>Indent No</th>
                    <th style={{ minWidth: 200 }}>Item Details</th>
                    <th style={{ width: 80 }}>UOM</th>
                    <th style={{ width: 80, textAlign: "right" }}>Bal</th>
                    <th style={{ width: 100, textAlign: "right" }}>PO Qty</th>
                    <th style={{ width: 100, textAlign: "right" }}>Unit Price</th>
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
                        <select
                          className="inv-select-cell"
                          value={row.indentNo || ""}
                          onChange={e => updateDetail(idx, "indentNo", e.target.value)}
                          style={{ color: '#4f46e5', fontWeight: 600 }}
                        >
                          <option value="">— Select —</option>
                          {uniqueIndentNos.map(no => (
                            <option key={no} value={no}>{no}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="inv-select-cell"
                          value={row.indentDetailId || row.itemId}
                          onChange={e => {
                            const val = e.target.value;
                            updateDetail(idx, "indentDetailId", e.target.value);
                          }}
                        >
                          <option value="">— Select Item —</option>
                          {indentDetailOptions.filter(o => o.indentNo === row.indentNo).map(o => (
                            <option key={o.detailId} value={o.detailId}>{o.itemName}</option>
                          ))}
                        </select>
                      </td>
                      <td><input className="inv-input-cell" value={row.uom} readOnly /></td>
                      <td><input className="inv-input-cell" value={fmtQty(row.balQty)} readOnly style={{ textAlign: "right" }} /></td>
                      <td><input className="inv-input-cell" type="number" step="0.01" value={row.poQty} onChange={e => updateDetail(idx, "poQty", e.target.value)} onBlur={e => updateDetail(idx, "poQty", Number(e.target.value || 0).toFixed(2))} style={{ textAlign: "right", fontWeight: 600, color: "#3b6ef8" }} /></td>
                      <td><input className="inv-input-cell" type="number" step="0.01" value={row.poRate} onChange={e => updateDetail(idx, "poRate", e.target.value)} onBlur={e => updateDetail(idx, "poRate", Number(e.target.value || 0).toFixed(2))} style={{ textAlign: "right" }} /></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input className="inv-input-cell" type="number" step="0.01" value={row.discMode === 'pct' ? row.discPct : row.discPrice} onChange={e => updateDetail(idx, row.discMode === 'pct' ? 'discPct' : 'discPrice', e.target.value)} onBlur={e => updateDetail(idx, row.discMode === 'pct' ? 'discPct' : 'discPrice', Number(e.target.value || 0).toFixed(2))} style={{ textAlign: "right", flex: 1 }} />
                          <button type="button" onClick={() => toggleDiscMode(idx)} style={{ fontSize: 10, border: "none", background: "#f1f5f9", padding: "4px 6px", cursor: "pointer", color: "#64748b", fontWeight: 700 }}>{row.discMode === 'pct' ? '%' : '₹'}</button>
                        </div>
                      </td>
                      <td><input className="inv-input-cell" value={fmt(row.poAmount)} readOnly style={{ textAlign: "right", color: "#1e293b", fontWeight: 500 }} /></td>
                      {gstEnabled && (
                        <>
                          <td>
                            <input
                              className="inv-input-cell"
                              value={`${Number(row.gstPct || 0)}%`}
                              readOnly
                              style={{ textAlign: "center", background: "#f8fafc", color: "#64748b", fontWeight: 600 }}
                            />
                          </td>
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

        {/* ── Summary card ── */}
        <div className="inv-card">
          <div className="inv-card-body">

            <div className="inv-summary-grid">
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
                  {Number(effectiveDiscPct || 0).toFixed(2)}% effective
                </div>
              </div>

              <div className="inv-summary-box">
                <div className="inv-summary-box-label">PO Amount (after disc, before GST)</div>
                <div className="inv-summary-box-value">₹{fmt(totals.poAmount)}</div>
                {totals.discPrice > 0 && (
                  <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2, fontWeight: 500 }}>
                    ↓ ₹{fmt(totals.discPrice)} saved vs gross
                  </div>
                )}
              </div>

              {gstEnabled && (
                <>
                  <div className="inv-summary-box">
                    <div className="inv-summary-box-label">Total GST</div>
                    <div className="inv-summary-box-value">₹{fmt(totals.totGst)}</div>
                  </div>
                  {gstType === "local" ? (
                    <div className="inv-summary-box">
                      <div className="inv-summary-box-label">SGST + CGST</div>
                      <div className="inv-summary-box-value">
                        ₹{fmt(totals.sgst + totals.cgst)}
                      </div>
                    </div>
                  ) : (
                    <div className="inv-summary-box">
                      <div className="inv-summary-box-label">IGST (Other State)</div>
                      <div className="inv-summary-box-value" style={{ color: "#7c3aed" }}>
                        ₹{fmt(totals.igst)}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="inv-summary-box" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                <div className="inv-summary-box-label">Grand Total</div>
                <div className="inv-summary-box-value" style={{ color: "var(--accent)" }}>
                  ₹{fmt(totals.totalAmount)}
                </div>
                {totals.discPrice > 0 && (
                  <div style={{ fontSize: 11, color: "#1d4ed8", marginTop: 2, fontWeight: 500 }}>
                    vs gross ₹{fmt(totals.grossAmount + totals.totGst)} — saved ₹{fmt(totals.discPrice)}
                  </div>
                )}
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
                    placeholder="Name of person preparing this PO"
                  />
                </div>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Remarks & Special Instructions</label>
                  <textarea
                    className="inv-input"
                    style={{ height: 40, resize: "none", fontSize: "13px", padding: "12px" }}
                    value={header.remarks || ""}
                    onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))}
                    placeholder="Enter any specific terms, instructions or internal notes..."
                  />
                </div>
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

      {viewingSupplier && (
        <SupplierDetailsModal supplier={viewingSupplier} onClose={() => setViewingSupplier(null)} />
      )}
    </div>
  );
}

import React,{ useState, useEffect, useRef,useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";


import { purchaseOrderApi, paymentTermsApi, supplierApi, inventoryHeadApi, mainCategoryApi, itemApi } from "../../services/inventoryApi";
import Modal from "../../components/Modal";
import { SearchSelect } from "../../components/FormFields";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
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
  if (num === 0 || num === null || num === undefined) return "Zero Only";
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertHundreds = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return tens[ten] + (one ? ' ' + ones[one] : '');
  };
  
  const convertThousands = (n) => {
    if (n === 0) return '';
    if (n < 100) return convertHundreds(n);
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return ones[hundred] + ' Hundred' + (remainder ? ' ' + convertHundreds(remainder) : '');
  };
  
  
  let result = [];
  let remaining = num;
  
  // Crores (10000000)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    result.push(convertHundreds(crores) + ' Crore');
    remaining %= 10000000;
  }
  
  // Lakhs (100000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    result.push(convertHundreds(lakhs) + ' Lakh');
    remaining %= 100000;
  }
  
  // Thousands (1000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    result.push(convertThousands(thousands) + ' Thousand');
    remaining %= 1000;
  }
  
  // Remaining hundreds and below
  if (remaining > 0) {
    if (remaining < 100) {
      result.push(convertHundreds(remaining));
    } else {
      result.push(convertThousands(remaining));
    }
  }
  
  return result.join(' ').trim() ;
};

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// Move these outside the component, around line 100-120 after ViewIcon

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
          <div style={{ fontSize: 11, color: "#3b6ef8", fontWeight: 600 }}>{supplier.type}</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>Contact & Tax</div>
        <Row label="GST No" value={supplier.gstNo} />
        <Row label="PAN No" value={supplier.panNo} />
        <Row label="Email" value={supplier.emailId1} />
        <Row label="Mobile" value={supplier.mobileNo1} />
      </div>

      {addresses.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>Addresses</div>
          {addresses.map((addr, i) => (
            <div key={i} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8, background: addr.isPrimary ? "#fff" : "#fcfdfe" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: addr.isPrimary ? "#3b6ef8" : "#94a3b8", marginBottom: 4 }}>{addr.isPrimary ? "Primary Address" : `Address ${i + 1}`}</div>
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
  poNo: "", 
  date: today(),
  supplierId: "", 
  supplierName: "", 
  supplierAddress: "", 
  supplierGst: "",
  purchaseIndentId: "", 
  purchaseIndentNo: "",
  refNo: "", 
  refDate: "", 
  paymentTermsId: "", 
  paymentTermsName: "", 
  deliveryDate: "", 
  createdBy: "Admin", 
  createdOn: today(), 
  status: "Open", 
  remarks: "",
  poType: "",
  preparedBy: "System Administrator"
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
  
  // Round the net value to whole number - THIS WILL BE THE EXACT AMOUNT FOR WORDS
  const netValueRounded = Math.round(totals.totalAmount);
  const roundOffAmount = netValueRounded - totals.totalAmount;
  const netValueInWords = numberToWords(netValueRounded);
  
  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(detailRows.length / ITEMS_PER_PAGE);
  
  // Calculate totals for all items
  const grossValue = detailRows.reduce((s, d) => s + (Number(d.poQty || 0) * Number(d.poRate || 0)), 0);
  const discountAmount = grossValue - totals.poAmount;
  const igstAmount = detailRows.reduce((s, d) => s + (d.igst || 0), 0);
  const cgstAmount = detailRows.reduce((s, d) => s + (d.cgst || 0), 0);
  const sgstAmount = detailRows.reduce((s, d) => s + (d.sgst || 0), 0);
  
  // Build all pages
  let allPagesHtml = '';
  
  for (let page = 1; page <= totalPages; page++) {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, detailRows.length);
    const pageItems = detailRows.slice(startIndex, endIndex);
    const isLastPage = page === totalPages;
    const startSerial = (page - 1) * ITEMS_PER_PAGE;
    
    allPagesHtml += `
      <div ${page < totalPages ? 'style="page-break-after: always;"' : ''}>
        <table style="border: none; margin-bottom: 2px;">
          <tr>
            <td class="no-border text-center bold" style="font-size: 15px; width: 80%; vertical-align: middle;">Purchase Order</td>
            <td class="no-border text-right bold" style="width: 20%; vertical-align: middle; font-size: 9px;">Page ${page} of ${totalPages}</td>
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
                    <td class="text-center bold" style="background: #e5e7eb; border-top: none; border-left: none; width: 50%; font-size: 9px;">PO Number</td>
                    <td class="text-center bold" style="background: #e5e7eb; border-top: none; border-right: none; width: 50%; font-size: 9px;">PO Date</td>
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
                <div class="bold">Place of Delivery</div>
                <div class="bold" style="margin-top: 4px; font-size: 10px;">${esc(company?.companyName || "TEST COMPANY")}</div>
                <div style="margin-top: 2px;">${esc(company?.address || "")}</div>
                <div style="margin-top: 10px; font-size: 8px;">GST: ${esc(company?.gstin || "")}</div>
              </td>
              <td style="width: 33.33%; border-bottom: none; border-left: 1px solid #000;">
                <div class="bold">Transported</div>
                <div style="margin-top: 4px;"></div>
              </td>
              <td style="width: 33.33%; border-bottom: none; border-left: 1px solid #000;">
                <div class="bold">Invoice to be Sent to</div>
                <div class="bold" style="margin-top: 4px; font-size: 10px;">${esc(company?.companyName || "TEST COMPANY")}</div>
                <div style="margin-top: 2px;">${esc(company?.address || "")}</div>
                <div style="margin-top: 10px; font-size: 8px;">GST: ${esc(company?.gstin || "")}</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 4%; border-left: none;">S.No</th>
                <th style="width: 12%;">Indent No</th>
                <th style="width: 24%;">Item Description</th>
                <th style="width: 9%;">Discount%</th>
                <th style="width: 6%;">Tax%</th>
                <th style="width: 7%;">Uom</th>
                <th style="width: 10%;">Quantity</th>
                <th style="width: 13%;">Unit Price</th>
                <th style="width: 15%; border-right: none;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map((d, i) => `
              <tr>
                <td class="text-left" style="border-left: none;">${startSerial + i + 1}</td>
                <td class="text-left" style="font-size: 8.5px;">${esc(d.indentNo || "Direct")}</td>
                <td class="text-left" style="font-size: 8.5px;">${esc(d.itemName)}</td>
                <td class="text-right">${d.discMode === 'pct' ? Number(d.discPct || 0).toFixed(2) : ''}</td>
                <td class="text-right">${Number(d.gstPct || 0).toFixed(2)}</td>
                <td class="text-center">${esc(d.uom)}</td>
                <td class="text-right">${Number(d.poQty || 0).toFixed(3)}</td>
                <td class="text-right">${Number(d.poRate || 0).toFixed(2)}</td>
                <td class="text-right" style="border-right: none;">${Number((d.poQty || 0) * (d.poRate || 0)).toFixed(2)}</td>
              </tr>
              `).join("")}
            </tbody>
          </table>

          ${isLastPage ? `
          <table style="border: none; width: 100%;">
            <tr>
              <td style="width: 70%; padding: 0; border: none; border-right: 1px solid #000; vertical-align: top;">
                <table style="border: none; width: 100%; height: 100%;">
                  <tr>
                    <td style="border: none; border-bottom: 1px solid #000; height: 100px; vertical-align: top; padding: 5px;">
                      <div class="bold" style="font-size: 8.5px; margin-bottom: 4px;">Remarks</div>
                      <div style="font-size: 9px;">${esc(header.remarks || "")}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="border: none; height: 40px; vertical-align: middle; padding: 5px;">
                      <span class="bold" style="font-size: 8px;">Value in Words</span> 
                      <span style="font-size: 9px; margin-left: 4px;">Rupees ${netValueInWords} Only</span>
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
                  <tr>
                    <td class="text-left" style="border-bottom: 1px solid #000; padding-bottom: 6px;">Round off</td>
                    <td class="text-right" style="border-bottom: 1px solid #000; padding-bottom: 6px;">${roundOffAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td class="bold text-left" style="font-size: 11px; padding-top: 6px;">Net Value</td>
                    <td class="bold text-right" style="font-size: 11px; padding-top: 6px;">${fmt(netValueRounded)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table style="border: none; width: 100%; margin-top: -1px;">
            <tr class="signature-row">
              <td style="width: 20%; border-left: none; text-align: center; font-weight: bold; font-size: 9px; padding-bottom: 10px;">
                <div>Prepared By</div>
                <div style="margin-top: 20px; font-weight: normal; font-size: 10px;">${esc(header.preparedBy || "")}</div>
              </td>
              <td style="width: 20%; text-align: center; font-weight: bold; font-size: 9px; padding-bottom: 10px;">Verified By</td>
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
                <div style="font-weight: bold; font-size: 9px; font-style: italic; margin-top: 25px;">Authorised Signatory</div>
              </td>
            </tr>
          </table>
          ` : ''}
        </div>
      </div>
    `;
  }
  
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
    .items-table td { border-top: none; border-bottom: 1px solid #ddd; height: 25px; }
    
    .footer-table { border: none; }
    .footer-table td { border: none; }
    
    .summary-table td { padding: 3px 5px; border: none; }
    
    .signature-row td { height: 60px; vertical-align: bottom; border-top: 1px solid #000; border-bottom: none; }
  </style>
</head>
<body>
  ${allPagesHtml}
  
  <script>
    window.onload = () => { setTimeout(() => window.print(), 300); }
  </script>
</body>
</html>`;
  
  const w = window.open("", "_blank");
  if (w) { 
    w.document.write(html); 
    w.document.close(); 
  }
}


const downloadAsPDF = ({ header, details: detailRows, totals, gstEnabled, gstType, company, supplier }) => {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(detailRows.length / ITEMS_PER_PAGE);
  
  // Calculate totals for all items
  const grossValue = detailRows.reduce((s, d) => s + (Number(d.poQty || 0) * Number(d.poRate || 0)), 0);
  const discountAmount = grossValue - totals.poAmount;
  const igstAmount = detailRows.reduce((s, d) => s + (d.igst || 0), 0);
  const cgstAmount = detailRows.reduce((s, d) => s + (d.cgst || 0), 0);
  const sgstAmount = detailRows.reduce((s, d) => s + (d.sgst || 0), 0);
  
  // Build all pages
  let allPagesHtml = '';
  
  for (let page = 1; page <= totalPages; page++) {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, detailRows.length);
    const pageItems = detailRows.slice(startIndex, endIndex);
    const isLastPage = page === totalPages;
    const startSerial = (page - 1) * ITEMS_PER_PAGE;
    
    allPagesHtml += `
      <div ${page < totalPages ? 'style="page-break-after: always;"' : ''}>
        <table style="border: none; margin-bottom: 2px;">
          <tr>
            <td class="no-border text-center bold" style="font-size: 15px; width: 80%; vertical-align: middle;">Purchase Order</td>
            <td class="no-border text-right bold" style="width: 20%; vertical-align: middle; font-size: 9px;">Page ${page} of ${totalPages}</td>
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
                    <td class="text-center bold" style="background: #e5e7eb; border-top: none; border-left: none; width: 50%; font-size: 9px;">PO Number</td>
                    <td class="text-center bold" style="background: #e5e7eb; border-top: none; border-right: none; width: 50%; font-size: 9px;">PO Date</td>
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
                <div class="bold">Place of Delivery</div>
                <div class="bold" style="margin-top: 4px; font-size: 10px;">${esc(company?.companyName || "TEST COMPANY")}</div>
                <div style="margin-top: 2px;">${esc(company?.address || "")}</div>
                <div style="margin-top: 10px; font-size: 8px;">GST: ${esc(company?.gstin || "")}</div>
              </td>
              <td style="width: 33.33%; border-bottom: none; border-left: 1px solid #000;">
                <div class="bold">Transported</div>
                <div style="margin-top: 4px;"></div>
              </td>
              <td style="width: 33.33%; border-bottom: none; border-left: 1px solid #000;">
                <div class="bold">Invoice to be Sent to</div>
                <div class="bold" style="margin-top: 4px; font-size: 10px;">${esc(company?.companyName || "TEST COMPANY")}</div>
                <div style="margin-top: 2px;">${esc(company?.address || "")}</div>
                <div style="margin-top: 10px; font-size: 8px;">GST: ${esc(company?.gstin || "")}</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 4%; border-left: none;">S.No</th>
                <th style="width: 12%;">Indent No</th>
                <th style="width: 24%;">Item Description</th>
                <th style="width: 9%;">Discount%</th>
                <th style="width: 6%;">Tax%</th>
                <th style="width: 7%;">Uom</th>
                <th style="width: 10%;">Quantity</th>
                <th style="width: 13%;">Unit Price</th>
                <th style="width: 15%; border-right: none;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.map((d, i) => `
              <tr>
                <td class="text-left" style="border-left: none;">${startSerial + i + 1}</td>
                <td class="text-left" style="font-size: 8.5px;">${esc(d.indentNo || "Direct")}</td>
                <td class="text-left" style="font-size: 8.5px;">${esc(d.itemName)}</td>
                <td class="text-right">${d.discMode === 'pct' ? Number(d.discPct || 0).toFixed(2) : ''}</td>
                <td class="text-right">${Number(d.gstPct || 0).toFixed(2)}</td>
                <td class="text-center">${esc(d.uom)}</td>
                <td class="text-right">${Number(d.poQty || 0).toFixed(3)}</td>
                <td class="text-right">${Number(d.poRate || 0).toFixed(2)}</td>
                <td class="text-right" style="border-right: none;">${Number((d.poQty || 0) * (d.poRate || 0)).toFixed(2)}</td>
              </tr>
              `).join("")}
            <\/tbody>
          <\/table>

          ${isLastPage ? `
          <table style="border: none; width: 100%;">
            <tr>
              <td style="width: 70%; padding: 0; border: none; border-right: 1px solid #000; vertical-align: top;">
                <table style="border: none; width: 100%; height: 100%;">
                  <tr>
                    <td style="border: none; border-bottom: 1px solid #000; height: 100px; vertical-align: top; padding: 5px;">
                      <div class="bold" style="font-size: 8.5px; margin-bottom: 4px;">Remarks<\/div>
                      <div style="font-size: 9px;">${esc(header.remarks || "")}<\/div>
                    <\/td>
                  <\/tr>
                  <tr>
                    <td style="border: none; height: 40px; vertical-align: middle; padding: 5px;">
                      <span class="bold" style="font-size: 8px;">Value in Words<\/span> <span style="font-size: 9px; margin-left: 4px;">Rupees ${numberToWords(Math.round(totals.totalAmount))}<\/span>
                    <\/td>
                  <\/tr>
                <\/table>
              <\/td>
              <td style="width: 30%; padding: 0; border: none; vertical-align: top;">
                <table class="summary-table" style="width: 100%;">
                  <tr><td class="bold text-left">Gross Value<\/td><td class="text-right">${fmt(grossValue)}<\/td><\/tr>
                  <tr><td class="bold text-left">Discount<\/td><td class="text-right">${fmt(discountAmount)}<\/td><\/tr>
                  <tr><td class="bold text-left">Basic Value<\/td><td class="text-right">${fmt(totals.poAmount)}<\/td><\/tr>
                  <tr><td class="text-left">IGST<\/td><td class="text-right">${fmt(igstAmount)}<\/td><\/tr>
                  <tr><td class="text-left">CGST<\/td><td class="text-right">${fmt(cgstAmount)}<\/td><\/tr>
                  <tr><td class="text-left">SGST<\/td><td class="text-right">${fmt(sgstAmount)}<\/td><\/tr>
                  <tr><td class="text-left">Other Charges<\/td><td class="text-right">0.00<\/td><\/tr>
                  <tr><td class="text-left" style="border-bottom: 1px solid #000; padding-bottom: 6px;">Round off<\/td><td class="text-right" style="border-bottom: 1px solid #000; padding-bottom: 6px;">0.00<\/td><\/tr>
                  <tr><td class="bold text-left" style="font-size: 11px; padding-top: 6px;">Net Value<\/td><td class="bold text-right" style="font-size: 11px; padding-top: 6px;">${fmt(totals.totalAmount)}<\/td><\/tr>
                <\/table>
              <\/td>
            <\/tr>
          <\/table>

          <table style="border: none; width: 100%; margin-top: -1px;">
            <tr class="signature-row">
              <td style="width: 20%; border-left: none; text-align: center; font-weight: bold; font-size: 9px; padding-bottom: 10px;">
                <div>Prepared By<\/div>
                <div style="margin-top: 20px; font-weight: normal; font-size: 10px;">${esc(header.preparedBy || "")}<\/div>
              <\/td>
              <td style="width: 20%; text-align: center; font-weight: bold; font-size: 9px; padding-bottom: 10px;">Verified By<\/td>
              <td style="width: 30%; padding: 5px 10px 10px 10px;">
                <table style="border: none; width: 100%; margin-bottom: 8px;">
                  <tr>
                    <td style="border: none; padding: 2px; font-weight: bold; text-align: right; width: 15%; font-size: 9px;">Name:<\/td>
                    <td style="border: none; padding: 2px; border-bottom: 1px dotted #000; width: 35%;"><\/td>
                    <td style="border: none; padding: 2px; font-weight: bold; text-align: right; width: 20%; font-size: 9px;">Mobile:<\/td>
                    <td style="border: none; padding: 2px; border-bottom: 1px dotted #000; width: 30%;"><\/td>
                  <\/tr>
                  <tr>
                    <td style="border: none; padding: 2px; font-weight: bold; text-align: right; font-size: 9px;">Sign:<\/td>
                    <td colspan="3" style="border: none; padding: 2px; border-bottom: 1px dotted #000;"><\/td>
                  <\/tr>
                <\/table>
                <div style="text-align: right; font-weight: bold; font-size: 9px; padding-right: 5px;">Received By<\/div>
              <\/td>
              <td style="width: 30%; border-right: none; text-align: center; position: relative; padding-bottom: 10px;">
                <div class="bold" style="font-size: 9px; position: absolute; top: 5px; left: 0; right: 0;">For ${esc(company?.companyName || "TEST COMPANY")}<\/div>
                <div style="font-weight: bold; font-size: 9px; font-style: italic;">Authorised Signatory<\/div>
              <\/td>
            <\/tr>
          <\/table>
          ` : ''}
        <\/div>
      <\/div>
    `;
  }
  
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
    .items-table td { border-top: none; border-bottom: 1px solid #ddd; height: 25px; }
    
    .footer-table { border: none; }
    .footer-table td { border: none; }
    
    .summary-table td { padding: 3px 5px; border: none; }
    
    .signature-row td { height: 60px; vertical-align: bottom; border-top: 1px solid #000; border-bottom: none; }
  <\/style>
<\/head>
<body>
  ${allPagesHtml}
<\/body>
<\/html>`;
  
  // Create a blob and download as HTML file
  const blob = new Blob([html], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `PO_${header.poNo || 'document'}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export default function PurchaseOrderPage() {
  // 1. All useState declarations first
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
  const [tableEnabled, setTableEnabled] = useState(true);
  const pickIndentRef = useRef(null);
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  const [itemsFromPickIndent, setItemsFromPickIndent] = useState(false);
  const addRowBtnRef = useRef(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const navigate = useNavigate();

  const safeDetails = (d) => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (typeof d === "string") {
      try { 
        const parsed = JSON.parse(d); 
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) { 
        console.error("Error parsing details:", e);
        return []; 
      }
    }
    return [];
  };

  // 2. All useMemo hooks
  const pendingIndentGroups = useMemo(() => {
    const groups = {};
    
    indents.forEach(ind => {
      const details_array = safeDetails(ind.details);
      const pendingDetails = details_array.filter(d => {
        const balance = (d.balQty !== undefined && d.balQty !== null && String(d.balQty) !== '')
          ? Number(d.balQty)
          : Number(d.indentQty || 0);
        return balance > 0 && d.itemId;
      });
      
      if (pendingDetails.length === 0) return;
      
      groups[sid(ind)] = {
        indentNo: ind.indentNo,
        indentDate: ind.date,
        departmentName: ind.departmentName,
        items: pendingDetails.map(d => {
          const itemMaster = items.find(i => sid(i) === sid(d.itemId));
          const realBalQty = (d.balQty !== undefined && d.balQty !== null && String(d.balQty) !== '')
            ? Number(d.balQty)
            : Number(d.indentQty || 0);
          return {
            rowId: `${sid(ind.id || ind._id)}-${sid(d.id || d._id)}`,
            detailId: sid(d.id || d._id),
            itemId: sid(d.itemId),
            itemName: toTitleCase(d.itemDescription || d.itemName),
            categoryName: d.mainCategoryName || d.categoryName || "",
            uom: d.uom,
            balQty: realBalQty,
            rate: itemMaster?.rate || d.rate || 0,
            gstPct: itemMaster?.gstPercent !== undefined ? itemMaster.gstPercent : (d.gstPct !== undefined ? d.gstPct : 18)
          };
        })
      };
    });
    
    return groups;
  }, [indents, items]);

  // ==================== ALL useEffect HOOKS ====================

useEffect(() => {
  loadLookups(); 
  loadPos(); 
  openNew();
}, []);

useEffect(() => {
  setTimeout(() => {
    const firstField = document.querySelector('[tabIndex="1"]');
    if (firstField) firstField.focus();
  }, 100);
}, []);

// Global tab navigation handler (only for main form, not modals)
useEffect(() => {
  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;
    
    // Skip if any modal is open
    if (pendingModalOpen || showSaveConfirm || saveSuccessModal || viewingSupplier) {
      return;
    }
    
    const focusableElements = Array.from(
      document.querySelectorAll('[tabIndex]:not([tabIndex="-1"])')
    ).filter(el => {
      const tabIndex = parseInt(el.getAttribute('tabIndex'));
      return !isNaN(tabIndex) && tabIndex >= 1 && el.offsetParent !== null && !el.disabled;
    }).sort((a, b) => {
      const tabA = parseInt(a.getAttribute('tabIndex'));
      const tabB = parseInt(b.getAttribute('tabIndex'));
      return tabA - tabB;
    });
    
    if (focusableElements.length === 0) return;
    
    const currentElement = document.activeElement;
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (!e.shiftKey) {
      if (currentIndex === focusableElements.length - 1 || currentIndex === -1) {
        e.preventDefault();
        focusableElements[0]?.focus();
      }
    } else {
      if (currentIndex === 0 || currentIndex === -1) {
        e.preventDefault();
        focusableElements[focusableElements.length - 1]?.focus();
      }
    }
  };
  
  document.addEventListener('keydown', handleTabKey);
  return () => {
    document.removeEventListener('keydown', handleTabKey);
  };
}, [details.length, pendingModalOpen, showSaveConfirm, saveSuccessModal, viewingSupplier]);

// ========== TAB TRAP FOR CONFIRM SAVE MODAL ==========
// ========== TAB HANDLER FOR CONFIRM SAVE MODAL ==========
useEffect(() => {
  if (!showSaveConfirm) return;
  
  const saveBtn = document.querySelector('#confirm-save-modal .inv-btn-primary');
  const cancelBtn = document.querySelector('#confirm-save-modal .inv-btn-secondary');
  
  if (!saveBtn || !cancelBtn) return;
  
  const handleTab = (e) => {
    if (e.key !== 'Tab') return;
    
    const current = document.activeElement;
    const isSave = current === saveBtn;
    const isCancel = current === cancelBtn;
    
    // Tab forward
    if (!e.shiftKey) {
      if (isSave) {
        // From Save → Cancel
        e.preventDefault();
        cancelBtn.focus();
      } else if (isCancel) {
        // From Cancel → let focus leave modal (do NOT prevent default)
        // Allow Tab to go to browser/page elements
        return;
      }
    } 
    // Shift+Tab backward
    else {
      if (isCancel) {
        // From Cancel → Save
        e.preventDefault();
        saveBtn.focus();
      } else if (isSave) {
        // From Save → let focus leave modal backwards
        // Allow Shift+Tab to go to browser/page elements
        return;
      }
    }
  };
  
  document.addEventListener('keydown', handleTab);
  
  // Focus Save button when modal opens
  setTimeout(() => {
    saveBtn.focus();
  }, 100);
  
  return () => {
    document.removeEventListener('keydown', handleTab);
  };
}, [showSaveConfirm]);

// ========== 1. TAB NAVIGATION - Only between Cancel and Add buttons ==========
useEffect(() => {
  if (!pendingModalOpen) return;
  
  const cancelBtn = document.getElementById('cancel-pick-btn');
  const addBtn = document.getElementById('add-items-btn');
  
  if (!cancelBtn || !addBtn) return;
  
  const handleTab = (e) => {
    if (e.key !== 'Tab') return;
    
    const current = document.activeElement;
    const isCancel = current === cancelBtn;
    const isAdd = current === addBtn;
    const isRow = current?.classList?.contains('indent-main-row') || 
                  current?.classList?.contains('indent-item-row');
    
    e.preventDefault();
    
    // Tab from Cancel -> Add, Add -> First Row, Row -> Cancel
    if (!e.shiftKey) {
      if (isCancel) {
        addBtn.focus();
      } else if (isAdd) {
        const firstRow = document.querySelector('#pick-indent-table .indent-main-row');
        if (firstRow) firstRow.focus();
        else addBtn.focus();
      } else if (isRow) {
        cancelBtn.focus();
      } else {
        cancelBtn.focus();
      }
    } 
    // Shift+Tab
    else {
      if (isCancel) {
        const lastRow = getLastVisibleRow();
        if (lastRow) lastRow.focus();
        else cancelBtn.focus();
      } else if (isAdd) {
        cancelBtn.focus();
      } else if (isRow) {
        addBtn.focus();
      } else {
        addBtn.focus();
      }
    }
  };
  
  const getLastVisibleRow = () => {
    const allRows = [];
    const mainRows = document.querySelectorAll('#pick-indent-table .indent-main-row');
    mainRows.forEach(mainRow => {
      allRows.push(mainRow);
      const indentNo = mainRow.getAttribute('data-row-id');
      const isExpanded = mainRow.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        const itemRows = document.querySelectorAll(`#pick-indent-table .indent-item-row[data-parent-id="${indentNo}"]`);
        itemRows.forEach(itemRow => allRows.push(itemRow));
      }
    });
    return allRows[allRows.length - 1];
  };
  
  document.addEventListener('keydown', handleTab);
  cancelBtn.focus();
  
  return () => document.removeEventListener('keydown', handleTab);
}, [pendingModalOpen]);

// ========== 2. ARROW KEYS + ENTER + SPACE - Full row navigation ==========
useEffect(() => {
  if (!pendingModalOpen) return;
  
  const handleRowKeys = (e) => {
    const current = document.activeElement;
    const isRow = current?.classList?.contains('indent-main-row') || 
                  current?.classList?.contains('indent-item-row');
    
    if (!isRow) return;
    
    // Get all visible rows
    const getAllRows = () => {
      const rows = [];
      const mainRows = document.querySelectorAll('#pick-indent-table .indent-main-row');
      mainRows.forEach(mainRow => {
        rows.push(mainRow);
        const indentNo = mainRow.getAttribute('data-row-id');
        const isExpanded = mainRow.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
          const itemRows = document.querySelectorAll(`#pick-indent-table .indent-item-row[data-parent-id="${indentNo}"]`);
          itemRows.forEach(itemRow => rows.push(itemRow));
        }
      });
      return rows;
    };
    
    const allRows = getAllRows();
    const currentIndex = allRows.indexOf(current);
    
    // ARROW KEYS
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < allRows.length) {
        allRows[nextIndex].focus();
      } else {
        allRows[0].focus();
      }
      return;
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        allRows[prevIndex].focus();
      } else {
        allRows[allRows.length - 1].focus();
      }
      return;
    }
    
    // ENTER KEY
    if (e.key === 'Enter') {
      e.preventDefault();
      const isMainRow = current.classList.contains('indent-main-row');
      const isItemRow = current.classList.contains('indent-item-row');
      
      if (isMainRow) {
        const indentNo = current.getAttribute('data-row-id');
        if (indentNo) {
          setExpandedGroups(prev => ({ ...prev, [indentNo]: !prev[indentNo] }));
          // Wait for DOM update then refocus
          setTimeout(() => { current.focus(); }, 50);
        }
      } else if (isItemRow) {
        const rowId = current.getAttribute('data-row-id');
        if (rowId) {
          const newSelected = new Set(pendingSelected);
          if (newSelected.has(rowId)) {
            newSelected.delete(rowId);
          } else {
            newSelected.add(rowId);
          }
          setPendingSelected(newSelected);
        }
      }
      return;
    }
    
    // SPACE KEY
    if (e.key === ' ') {
      e.preventDefault();
      const isMainRow = current.classList.contains('indent-main-row');
      const isItemRow = current.classList.contains('indent-item-row');
      
      if (isMainRow) {
        const indentNo = current.getAttribute('data-row-id');
        if (indentNo) {
          const group = Object.values(pendingIndentGroups).find(g => g.indentNo === indentNo);
          if (group) {
            const allSelected = group.items.every(item => pendingSelected.has(item.rowId));
            const newSelected = new Set(pendingSelected);
            group.items.forEach(item => {
              if (allSelected) {
                newSelected.delete(item.rowId);
              } else {
                newSelected.add(item.rowId);
              }
            });
            setPendingSelected(newSelected);
          }
        }
      } else if (isItemRow) {
        const rowId = current.getAttribute('data-row-id');
        if (rowId) {
          const newSelected = new Set(pendingSelected);
          if (newSelected.has(rowId)) {
            newSelected.delete(rowId);
          } else {
            newSelected.add(rowId);
          }
          setPendingSelected(newSelected);
        }
      }
      return;
    }
  };
  
  document.addEventListener('keydown', handleRowKeys);
  return () => document.removeEventListener('keydown', handleRowKeys);
}, [pendingModalOpen, pendingSelected, pendingIndentGroups, expandedGroups]);

  // 4. All functions
  async function loadLookups() {
    try {
      const [supps, inds, its, pterms, comp] = await Promise.all([
        purchaseOrderApi.getSuppliers(),
        purchaseOrderApi.getIndents(),
        itemApi.getAll(),
        paymentTermsApi.getAll(),
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
    setHeader({ ...emptyHeader(), preparedBy: "System Administrator" }); 
    setDetails([emptyDetail()]); 
    setEditId(null); 
    setView("form"); 
    setGstType("");
    setItemsFromPickIndent(false);
    try { 
      const res = await purchaseOrderApi.getNextNumber(); 
      if (res?.poNo) setHeader(h => ({ ...h, poNo: res.poNo })); 
    } catch (e) { }
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
    
    const normalizeDate = (d) => {
      if (!d) return "";
      if (typeof d === "string" && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return d;
      }
      if (typeof d === "string" && d.includes("T")) {
        return d.split("T")[0];
      }
      try {
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) {
          return dt.toISOString().split("T")[0];
        }
      } catch (e) {}
      return "";
    };

    setHeader({
      ...po,
      poNo: po.poNo || po.poNumber || "",
      date: normalizeDate(po.date),
      supplierId: sId,
      paymentTermsId: sid(po.paymentTermsId),
      supplierAddress: po.supplierAddress || addrText,
      refNo: po.refNo || po.referenceNo || "",
      deliveryDate: normalizeDate(po.deliveryDate || po.Date),
      poType: po.poType || po.purchaseOrderType || "",
      supplierGst: po.supplierGst || s?.gstNo || "",
      preparedBy: po.preparedBy || "System Administrator"
    });
    
    const gType = po.gstType || "local";
    setDetails(safeDetails(po.details).map(d => calcRow({ ...d, _rowId: Math.random(), indentDetailId: sid(d.indentDetailId), itemId: sid(d.itemId) }, gType)));
    setGstType(po.gstType || "local");
    setGstEnabled(po.gstEnabled !== false);
    setView("form");
    setItemsFromPickIndent(true);
  }

  const calcRow = (row, gType = gstType) => {
    const qty = Number(row.poQty || 0); 
    const rate = Number(row.poRate || 0);
    let disc = 0;
    if (row.discMode === 'pct') {
      disc = (qty * rate) * (Number(row.discPct || 0) / 100);
    } else {
      disc = Number(row.discPrice || 0);
    }
    const amt = (qty * rate) - disc;
    const gPct = Number(row.gstPct || 0);
    const tax = gstEnabled ? (amt * gPct / 100) : 0;
    
    return {
      ...row,
      grossAmount: (qty * rate) || 0,
      rowDisc: disc || 0,
      poAmount: amt || 0, 
      totGst: tax || 0, 
      totalAmount: (amt + tax) || 0,
      sgst: (gType === 'local' ? tax / 2 : 0) || 0, 
      cgst: (gType === 'local' ? tax / 2 : 0) || 0, 
      igst: (gType === 'other' ? tax : 0) || 0
    };
  };

  function updateDetail(idx, field, val) {
    setDetails(prev => {
      const rows = [...prev];
      let row = { ...rows[idx], [field]: val };
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

  const addRow = () => { 
    const newRow = {
      _rowId: Math.random(),
      indentDetailId: "",
      indentNo: "",
      itemId: "",
      itemName: "",
      uom: "",
      balQty: 0,
      poQty: 0,
      poRate: 0,
      discMode: "pct",
      discPct: 0,
      discPrice: 0,
      poAmount: 0,
      gstPct: 0,
      sgst: 0,
      cgst: 0,
      igst: 0,
      totGst: 0,
      totalAmount: 0
    };
    setDetails(p => [...p, newRow]);
  };

  function removeRow(idx) { 
    setDetails(p => p.filter((_, i) => i !== idx)); 
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await purchaseOrderApi.remove(id);
      await loadPos();
      setSaveToast("Purchase Order deleted successfully!");
      setTimeout(() => setSaveToast(""), 4000);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleSave() {
  console.log("handleSave called"); // Debug log
  
  if (!header.poNo.trim()) {
    setFormError("PO No is required");
    return;
  }
  if (!header.supplierId) {
    setFormError("Supplier is required");
    return;
  }
  
  for (const row of details) {
    if (!row.itemId) {
      setFormError("Item Description is required for all rows");
      return;
    }
    if (!row.poQty || Number(row.poQty) <= 0) {
      setFormError("PO Qty is required and must be greater than 0");
      return;
    }
    if (!row.poRate || Number(row.poRate) <= 0) {
      setFormError("Unit Price is required and must be greater than 0");
      return;
    }
  }
  
  setShowSaveConfirm(true);
}

async function performSave() {
  setShowSaveConfirm(false);
  setFormError(null);
  setSaving(true);
  
  console.log("HEADER BEFORE SAVE:", header);
  console.log("DELIVERY DATE VALUE:", header.deliveryDate);
  
  const payload = { 
    ...header, 
    deliveryDate: header.deliveryDate,
    gstEnabled, 
    gstType, 
    details: details.map(({ _rowId, ...rest }) => rest) 
  };
  
  console.log("FULL PAYLOAD BEING SENT:", JSON.stringify(payload, null, 2));
  
  try {
    if (editId) {
      await purchaseOrderApi.update(editId, payload);
    } else {
      await purchaseOrderApi.create(payload);
    }
    await loadPos();
    setSaveSuccessModal(true);
    setTimeout(() => {
      setSaveSuccessModal(false);
      setView("list");
    }, 2000);
  } catch (err) { 
    console.error("Save error:", err);
    setFormError(err.message); 
  } finally { 
    setSaving(false); 
  }
}

  const totals = details.reduce((acc, r) => ({
    grossAmount: (acc.grossAmount || 0) + Number(r.grossAmount || 0),
    discPrice: (acc.discPrice || 0) + Number(r.rowDisc || 0),
    poAmount: (acc.poAmount || 0) + Number(r.poAmount || 0),
    totGst: (acc.totGst || 0) + Number(r.totGst || 0),
    totalAmount: (acc.totalAmount || 0) + Number(r.totalAmount || 0),
    sgst: (acc.sgst || 0) + Number(r.sgst || 0),
    cgst: (acc.cgst || 0) + Number(r.cgst || 0),
    igst: (acc.igst || 0) + Number(r.igst || 0)
  }), { grossAmount: 0, discPrice: 0, poAmount: 0, totGst: 0, totalAmount: 0, sgst: 0, cgst: 0, igst: 0 });

  const effectiveDiscPct = totals.grossAmount > 0 ? (totals.discPrice / totals.grossAmount) * 100 : 0;

  function addPendingLinesToDetails() {
    const selected = [];
    
    Object.values(pendingIndentGroups).forEach(group => {
      group.items.forEach(item => {
        if (pendingSelected.has(item.rowId)) {
          selected.push(item);
        }
      });
    });
    
    if (selected.length === 0) {
      setPendingModalOpen(false);
      return;
    }
    
    const newRows = selected.map(s => {
      return calcRow({
        ...emptyDetail(), 
        indentDetailId: s.detailId, 
        indentNo: s.indentNo, 
        itemId: s.itemId, 
        itemName: s.itemName, 
        uom: s.uom, 
        balQty: s.balQty, 
        poQty: s.balQty, 
        poRate: s.rate || 0,
        gstPct: s.gstPct || 0
      });
    });
    
    setDetails(p => {
      const existing = p.filter(r => r.itemId || r.itemName);
      if (existing.length === 0) return newRows;
      return [...existing, ...newRows];
    });
    
    setPendingModalOpen(false); 
    setPendingSelected(new Set());
    setTableEnabled(true);
    setItemsFromPickIndent(true);
    
    setTimeout(() => {
      const firstPoQty = document.querySelector('tbody tr:first-child td:nth-child(6) input');
      if (firstPoQty) firstPoQty.focus();
    }, 150);
  }

  // 5. Conditional returns at the end
  if (view === "list") {
    const filteredPos = (pos || []).filter(po => po?.poNo?.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
          <div>
            <h1 className="inv-page-title">Purchase Orders</h1>
            <p className="inv-page-sub">Manage purchase orders</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={exportToExcel}>Export to Excel</button>
            <button className="inv-btn-primary" onClick={openNew}>+ New Purchase Order</button>
          </div>
        </div>

        {listError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{listError}</div>}

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
          {loadingList ? (
            <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>PO No</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPos.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 40 }}>No purchase orders found</td></tr>
                  ) : (
                    filteredPos.map((po, i) => (
                      <tr key={po.id || po._id}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{po.poNo}</td>
                        <td>{po.date}</td>
                        <td>{po.supplierName}</td>
                        <td>
                          <span className={`inv-badge ${po.status === 'Open' ? 'inv-badge-yes' : 'inv-badge-no'}`}>
                            {po.status}
                          </span>
                        </td>
                        <td>
                          ₹{fmt(
                            (safeDetails(po.details) || []).reduce((s, d) => {
                              const amount = Number(d.totalAmount) || Number(d.poAmount) || 0;
                              return s + amount;
                            }, 0)
                          )}
                        </td>
                        <td>
                          <div className="inv-actions">
                            <button className="inv-btn-icon" onClick={() => openEdit(po)}>
                              <EditIcon />
                            </button>
                            <button className="inv-btn-icon inv-btn-danger" onClick={() => handleDelete(po.id || po._id)}>
                              <DeleteIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FORM VIEW
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div><h1 className="inv-page-title">{editId ? "Edit Purchase Order" : "New Purchase Order"}</h1><p className="inv-page-sub">Header-Detail-Summary layout</p></div>
        
        {!pendingModalOpen && !showSaveConfirm && !viewingSupplier && (
          <div style={{ display: "flex", gap: 8 }}>
            <button tabIndex={100} className="inv-btn-secondary" onClick={() => setView("list")}>View List</button>
            <button tabIndex={101} className="inv-btn-ghost" onClick={() => printPurchaseOrder({ header, details, totals, gstEnabled, gstType, company })}>Print</button>
            <button tabIndex={102} className="inv-btn-primary" onClick={() => downloadAsPDF({ header, details, totals, gstEnabled, gstType, company })}>Download as PDF</button>
            <button tabIndex={103} className="inv-btn-primary" onClick={handleSave} disabled={saving}>Save Order</button>
          </div>
        )} 

        {(pendingModalOpen || showSaveConfirm) && (
          <div style={{ display: "flex", gap: 8, visibility: "hidden" }}>
            <button className="inv-btn-secondary">View List</button>
            <button className="inv-btn-ghost">Print</button>
            <button className="inv-btn-primary">Download as PDF</button>
            <button className="inv-btn-primary">Save Order</button>
          </div>
        )}
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
              <Field label="PO No (Auto)">
                <input tabIndex={1} className="inv-input" value={header.poNo} readOnly style={{ background: "#f8f7ff", color: "#4f46e5", fontWeight: 600 }} />
              </Field>
              
              <Field label="PO Date *">
                <input tabIndex={2} className="inv-input" type="date" min="2026-05-01" value={header.date || today()} onChange={e => {
                  const selectedDate = e.target.value;
                  const minDate = "2026-05-01";
                  if (selectedDate < minDate) {
                    setHeader(h => ({ ...h, date: minDate, dateError: "Past dates are not allowed." }));
                  } else {
                    setHeader(h => ({ ...h, date: selectedDate, dateError: "" }));
                  }
                }} />
                {header.dateError && <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>⚠️ {header.dateError}</div>}
              </Field>

              <Field label="PO Type">
                <select tabIndex={3} className="inv-input" value={header.poType || ""} onChange={e => setHeader(h => ({ ...h, poType: e.target.value }))}>
                  <option value="">Select Type</option>
                  <option value="Consumables">Consumables</option>
                  <option value="Project">Project</option>
                  <option value="Capital Goods">Capital Goods</option>
                </select>
              </Field>
              
              <Field label="Supplier *">
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <SearchSelect tabIndex={4} value={header.supplierId} onChange={val => {
                      const s = suppliers.find(x => sid(x) === val);
                      let newGstType = "local";
                      if (s) {
                        const compGst = (company?.gstin || "").trim();
                        const suppGst = (s.gstNo || "").trim();
                        const compCode = compGst.match(/^\d{2}/)?.[0];
                        const suppCode = suppGst.match(/^\d{2}/)?.[0];
                        if (compCode && suppCode) {
                          newGstType = compCode === suppCode ? "local" : "other";
                        } else {
                          const compState = (company?.state || company?.address || "").toLowerCase().replace(/\s+/g, '');
                          const parsedAddresses = safeDetails(s?.addresses);
                          const primaryAddr = parsedAddresses.find(a => a.isPrimary) || parsedAddresses[0];
                          const suppState = (s.state || primaryAddr?.stateName || "").toLowerCase().replace(/\s+/g, '');
                          if (compState && suppState && (compState.includes(suppState) || suppState.includes(compState))) {
                            newGstType = "local";
                          } else {
                            newGstType = s.gstType || "local";
                          }
                        }
                      }
                      setGstType(newGstType);
                      const parsedAddresses = safeDetails(s?.addresses);
                      const primaryAddr = parsedAddresses.find(a => a.isPrimary) || parsedAddresses[0];
                      let addrText = "";
                      if (primaryAddr) {
                        const parts = [primaryAddr.address || primaryAddr.line1, primaryAddr.cityName, primaryAddr.stateName, primaryAddr.pinCode ? `PIN: ${primaryAddr.pinCode}` : ""].filter(Boolean);
                        addrText = parts.join(", ");
                      }
                      setHeader(h => ({ ...h, supplierId: val, supplierName: toTitleCase(s?.supplierName || ""), supplierAddress: addrText, supplierGst: s?.gstNo || "" }));
                      setDetails(prev => prev.map(row => calcRow(row, newGstType)));
                    }} options={suppliers.map(s => ({ value: sid(s), label: s.supplierName }))} placeholder="Select supplier" />
                  </div>
                  <button type="button" className="inv-btn-icon" onClick={() => navigate("/supplier")} style={{ color: "#10b981" }} tabIndex={-1}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  {header.supplierId && (
                    <button type="button" className="inv-btn-icon" onClick={() => { const s = suppliers.find(x => sid(x) === header.supplierId); if (s) setViewingSupplier(s); }} tabIndex={-1}>
                      <ViewIcon />
                    </button>
                  )}
                </div>
              </Field>
              
              <Field label="Reference No">
                <input tabIndex={5} className="inv-input" value={header.refNo} onChange={e => setHeader(h => ({ ...h, refNo: e.target.value }))} placeholder="e.g. Quote #123" />
              </Field>
              
              <Field label="Delivery Date">
                <input 
                  tabIndex={6} 
                  className="inv-input" 
                  type="date" 
                  min="2026-05-01"
                  value={header.deliveryDate || ""} 
                  onChange={e => {
                    const selectedDate = e.target.value;
                    const minDate = "2026-05-01";
                    if (selectedDate < minDate) {
                      setHeader(h => ({ ...h, deliveryDate: minDate, deliveryDateError: "Past dates are not allowed." }));
                    } else {
                      setHeader(h => ({ ...h, deliveryDate: selectedDate, deliveryDateError: "" }));
                    }
                  }} 
                />
                {header.deliveryDateError && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                    ⚠️ {header.deliveryDateError}
                  </div>
                )}
              </Field>
              
              <Field label="GST No">
                <input tabIndex={7} className="inv-input" value={header.supplierGst} readOnly style={{ background: "#f8fafc" }} />
              </Field>
              
              <Field label="GST Type (Auto)">
                <input tabIndex={8} className="inv-input" value={!gstType ? "" : (gstType === "local" ? "Local (SGST+CGST)" : "Other State (IGST)")} readOnly style={{ background: "#f8fafc", color: "#64748b" }} />
              </Field>
            </FormGrid>
          </div>
        </div>

        <div className="inv-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="inv-card-body" style={{ minHeight: "400px", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "16px 20px", background: "#fcfdfe", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  ref={pickIndentRef}
                  className="inv-btn-secondary inv-btn-sm" 
                  onClick={() => setPendingModalOpen(true)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') { 
                      e.preventDefault(); 
                      setPendingModalOpen(true); 
                    }
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      const viewListBtn = document.querySelector('.inv-page-header button:first-child');
                      if (viewListBtn) viewListBtn.focus();
                    }
                  }}
                  style={{ borderRadius: 4 }}
                  tabIndex={9}
                >
                  + Pick Indent
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table-premium">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: "center" }}>#</th>
                    <th style={{ width: 140 }}>Indent No</th>
                    <th style={{ minWidth: 200 }}>Item Description</th>
                    <th style={{ width: 80, textAlign: "center" }}>UOM</th>
                    <th style={{ width: 80, textAlign: "right" }}>Bal</th>
                    <th style={{ width: 100, textAlign: "right" }}>PO Qty</th>
                    <th style={{ width: 100, textAlign: "right" }}>Unit Price</th>
                    <th style={{ width: 100, textAlign: "right" }}>Disc</th>
                    <th style={{ width: 110, textAlign: "right" }}>PO Amt</th>
                    <th style={{ width: 70, textAlign: "center" }}>GST%</th>
                    <th style={{ width: 90, textAlign: "right" }}>IGST</th>
                    <th style={{ width: 120, textAlign: "right" }}>Total</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => {
                    const baseTabIndex = 10 + (idx * 4);
                    const isLastRow = idx === details.length - 1;
                    const hasItems = row.itemId || row.itemName;
                    
                    return (
                      <tr key={row._rowId}>
                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                        <td><input tabIndex={-1} className="inv-input-cell" value={row.indentNo || ""} readOnly /></td>
                        <td><input tabIndex={-1} className="inv-input-cell" value={row.itemName || ""} readOnly /></td>
                        <td><input tabIndex={-1} className="inv-input-cell" value={row.uom || ""} readOnly /></td>
                        <td><input tabIndex={-1} className="inv-input-cell" value={row.balQty ? fmtQty(row.balQty) : "—"} readOnly /></td>
                        <td><input tabIndex={(itemsFromPickIndent || tableEnabled) && hasItems ? baseTabIndex : -1} className="inv-input-cell" type="number" value={row.poQty} onChange={e => updateDetail(idx, "poQty", e.target.value)} /></td>
                        <td><input tabIndex={(itemsFromPickIndent || tableEnabled) && hasItems ? baseTabIndex + 1 : -1} className="inv-input-cell" type="number" value={row.poRate} onChange={e => updateDetail(idx, "poRate", e.target.value)} /></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <input tabIndex={(itemsFromPickIndent || tableEnabled) && hasItems ? baseTabIndex + 2 : -1} className="inv-input-cell" type="number" value={row.discMode === 'pct' ? row.discPct : row.discPrice} onChange={e => updateDetail(idx, row.discMode === 'pct' ? 'discPct' : 'discPrice', e.target.value)} />
                            <button type="button" onClick={() => toggleDiscMode(idx)} tabIndex={-1}>{row.discMode === 'pct' ? '%' : '₹'}</button>
                          </div>
                        </td>
                        <td><input tabIndex={-1} className="inv-input-cell" value={fmt(row.poAmount)} readOnly /></td>
                        <td><input tabIndex={(itemsFromPickIndent || tableEnabled) && hasItems ? baseTabIndex + 3 : -1} className="inv-input-cell" type="number" value={row.gstPct} onChange={e => updateDetail(idx, "gstPct", e.target.value)} /></td>
                        <td><input tabIndex={-1} className="inv-input-cell" value={fmt(row.totGst)} readOnly /></td>
                        <td><input tabIndex={-1} className="inv-input-cell" value={fmt(row.totalAmount)} readOnly /></td>
                        <td style={{ textAlign: "center" }}>
                          <button 
                            onClick={() => removeRow(idx)} 
                            tabIndex={isLastRow && (itemsFromPickIndent || tableEnabled) && hasItems ? baseTabIndex + 4 : -1}
                            onKeyDown={(e) => {
                              if (e.key === 'Tab' && !e.shiftKey && isLastRow && (itemsFromPickIndent || tableEnabled) && hasItems) {
                                e.preventDefault();
                                e.stopPropagation();
                                const pickIndentBtn = document.querySelector('button[tabIndex="9"]');
                                if (pickIndentBtn) pickIndentBtn.focus();
                              }
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="inv-card">
          <div className="inv-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, padding: "10px 20px" }}>
              <div><div style={{ fontSize: 11, color: "#64748b" }}>Gross Amount</div><div style={{ fontSize: 18, fontWeight: 700 }}>₹{fmt(totals.grossAmount)}</div></div>
              <div><div style={{ fontSize: 11, color: "#64748b" }}>Total Discount</div><div style={{ fontSize: 18, fontWeight: 700, color: "#b45309" }}>−₹{fmt(totals.discPrice)}</div><div style={{ fontSize: 11, color: "#92400e" }}>{Number(effectiveDiscPct || 0).toFixed(2)}% effective</div></div>
              <div><div style={{ fontSize: 11, color: "#64748b" }}>PO Amount (after disc, before GST)</div><div style={{ fontSize: 18, fontWeight: 700 }}>₹{fmt(totals.poAmount)}</div></div>
              <div><div style={{ fontSize: 11, color: "#64748b" }}>Total GST</div><div style={{ fontSize: 18, fontWeight: 700 }}>₹{fmt(totals.totGst)}</div></div>
              <div><div style={{ fontSize: 11, color: "#64748b" }}>IGST (Other State)</div><div style={{ fontSize: 18, fontWeight: 700, color: "#7c3aed" }}>₹{fmt(totals.igst)}</div></div>
              <div><div style={{ fontSize: 11, color: "#64748b" }}>Grand Total</div><div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>₹{fmt(totals.totalAmount)}</div></div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Prepared By</label>
                  <input className="inv-input" value={header.preparedBy || ""} onChange={e => setHeader(h => ({ ...h, preparedBy: e.target.value }))} placeholder="System Administrator" />
                </div>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Remarks & Special Instructions</label>
                  <textarea className="inv-input" style={{ height: 40, resize: "none", fontSize: "13px", padding: "12px" }} value={header.remarks || ""} onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))} placeholder="Enter any specific terms, instructions or internal notes..." />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pick Indent Modal */}
{pendingModalOpen && (
  <Modal 
    id="pick-indent-modal"
    title="Pick Pending Indent Lines" 
    onClose={() => { setPendingModalOpen(false); setPendingSelected(new Set()); setExpandedGroups({}); }} 
    full={true}
    hideDefaultButtons={true}
  >
    <style>
      {`
        #pick-indent-modal .inv-modal-header button,
        #pick-indent-modal .inv-modal-header .inv-btn-ghost,
        #pick-indent-modal .inv-modal-header .inv-save-btn,
        #pick-indent-modal .inv-modal-header .inv-btn-secondary,
        #pick-indent-modal .inv-modal-header .inv-btn-primary,
        #pick-indent-modal .inv-modal-header [class*="btn"],
        #pick-indent-modal .inv-modal-header > *:not(h2):not(h3):not(.inv-modal-title),
        #pick-indent-modal .inv-modal-footer {
          display: none !important;
        }

        #cancel-pick-btn, #add-items-btn {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .indent-main-row:focus, .indent-item-row:focus {
          outline: 2px solid #3b6ef8;
          outline-offset: -2px;
          background-color: #eff6ff;
        }
        
        .indent-item-row[style*="background-color: #eef2ff"] {
          background-color: #eef2ff !important;
        }
      `}
    </style>
    
    <div style={{ padding: "0 16px" }}>
      <div className="inv-table-wrap">
        <table className="inv-table" id="pick-indent-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Indent No</th>
              <th>Date</th>
              <th>Department</th>
              <th style={{ width: 100, textAlign: "right" }}>Total Qty</th>
              <th style={{ width: 40, textAlign: "center" }}></th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(pendingIndentGroups).length === 0 ? (
              <tr key="no-data">
                <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>No pending indents available</td>
              </tr>
            ) : (
              Object.values(pendingIndentGroups).map((group) => {
                const isExpanded = expandedGroups[group.indentNo];
                const allGroupItemsSelected = group.items.every(item => pendingSelected.has(item.rowId));
                const someGroupItemsSelected = group.items.some(item => pendingSelected.has(item.rowId));
                const totalQty = group.items.reduce((sum, item) => sum + item.balQty, 0);
                
                return (
                  <React.Fragment key={group.indentNo}>
                    {/* Main Indent Row - REMOVED onKeyDown to avoid conflicts */}
                    <tr 
                      key={group.indentNo}
                      className="indent-main-row"
                      data-row-id={group.indentNo}
                      data-row-type="main"
                      role="row"
                      aria-expanded={isExpanded}
                      style={{ 
                        cursor: "pointer",
                        backgroundColor: "#ffffff",
                        borderBottom: "1px solid #e2e8f0"
                      }}
                      tabIndex={0}
                      onClick={() => {
                        setExpandedGroups(prev => ({ ...prev, [group.indentNo]: !prev[group.indentNo] }));
                      }}
                    >
                      <td style={{ textAlign: "center", color: "#64748b" }}>
                        {isExpanded ? "▼" : "▶"}
                      </td>
                      <td style={{ fontWeight: 600, color: "#3b6ef8" }}>{group.indentNo}</td>
                      <td style={{ color: "#475569" }}>{group.indentDate}</td>
                      <td style={{ color: "#475569" }}>{group.departmentName || "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 500, color: "#475569" }}>{fmtQty(totalQty)}</td>
                      <td style={{ textAlign: "center" }}>
                        <input 
                          type="checkbox"
                          checked={allGroupItemsSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = !allGroupItemsSelected && someGroupItemsSelected;
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(pendingSelected);
                            group.items.forEach(item => {
                              if (e.target.checked) {
                                newSelected.add(item.rowId);
                              } else {
                                newSelected.delete(item.rowId);
                              }
                            });
                            setPendingSelected(newSelected);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          tabIndex={-1}
                        />
                      </td>
                    </tr>
                    
                    {/* Expanded Items Sub-table - REMOVED onKeyDown to avoid conflicts */}
                    {isExpanded && (
                      <tr className="indent-sub-row" data-parent-id={group.indentNo}>
                        <td colSpan={6} style={{ padding: 0, backgroundColor: "#f8fafc" }}>
                          <table className="inv-table" style={{ margin: 0, width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ backgroundColor: "#f1f5f9", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                                <th style={{ width: 30, padding: "10px 8px" }}></th>
                                <th style={{ padding: "10px 12px" }}>Item Description</th>
                                <th style={{ width: 70, padding: "10px 12px", textAlign: "center" }}>UOM</th>
                                <th style={{ width: 80, padding: "10px 12px", textAlign: "right" }}>Bal</th>
                                <th style={{ width: 90, padding: "10px 12px", textAlign: "right" }}>PO Qty</th>
                                <th style={{ width: 90, padding: "10px 12px", textAlign: "right" }}>Unit Price</th>
                                <th style={{ width: 80, padding: "10px 12px", textAlign: "center" }}>Disc%</th>
                                <th style={{ width: 100, padding: "10px 12px", textAlign: "right" }}>PO Amt</th>
                                <th style={{ width: 70, padding: "10px 12px", textAlign: "center" }}>GST%</th>
                                <th style={{ width: 80, padding: "10px 12px", textAlign: "right" }}>IGST</th>
                                <th style={{ width: 100, padding: "10px 12px", textAlign: "right" }}>Total</th>
                                <th style={{ width: 40, padding: "10px 8px", textAlign: "center" }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item, itemIndex) => (
                                <tr 
                                  key={item.rowId}
                                  className="indent-item-row"
                                  data-row-id={item.rowId}
                                  data-row-type="item"
                                  data-parent-id={group.indentNo}
                                  style={{ 
                                    cursor: "pointer",
                                    borderBottom: itemIndex === group.items.length - 1 ? "none" : "1px solid #e2e8f0",
                                    backgroundColor: pendingSelected.has(item.rowId) ? "#eef2ff" : "#ffffff"
                                  }}
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newSelected = new Set(pendingSelected);
                                    if (newSelected.has(item.rowId)) {
                                      newSelected.delete(item.rowId);
                                    } else {
                                      newSelected.add(item.rowId);
                                    }
                                    setPendingSelected(newSelected);
                                  }}
                                >
                                  <td style={{ paddingLeft: 28, color: "#64748b" }}>↳</td>
                                  <td style={{ fontSize: 13 }}>{item.itemName}</td>
                                  <td style={{ textAlign: "center", fontSize: 13 }}>{item.uom}</td>
                                  <td style={{ textAlign: "right", fontSize: 13 }}>{fmtQty(item.balQty)}</td>
                                  <td style={{ textAlign: "right", fontSize: 13 }}>
                                    <input 
                                      type="number" 
                                      value={item.balQty}
                                      style={{ width: 80, padding: "4px 8px", textAlign: "right", borderRadius: 4, border: "1px solid #e2e8f0" }}
                                      onChange={(e) => { e.stopPropagation(); }}
                                      onClick={(e) => e.stopPropagation()}
                                      tabIndex={-1}
                                    />
                                  </td>
                                  <td style={{ textAlign: "right", fontSize: 13 }}>
                                    <input 
                                      type="number" 
                                      value={item.rate}
                                      style={{ width: 80, padding: "4px 8px", textAlign: "right", borderRadius: 4, border: "1px solid #e2e8f0" }}
                                      onChange={(e) => { e.stopPropagation(); }}
                                      onClick={(e) => e.stopPropagation()}
                                      tabIndex={-1}
                                    />
                                  </td>
                                  <td style={{ textAlign: "center", fontSize: 13 }}>0</td>
                                  <td style={{ textAlign: "right", fontSize: 13 }}>{fmt(item.balQty * item.rate)}</td>
                                  <td style={{ textAlign: "center", fontSize: 13 }}>{item.gstPct || 0}</td>
                                  <td style={{ textAlign: "right", fontSize: 13 }}>{fmt((item.balQty * item.rate) * (item.gstPct || 0) / 100)}</td>
                                  <td style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>{fmt((item.balQty * item.rate) + ((item.balQty * item.rate) * (item.gstPct || 0) / 100))}</td>
                                  <td style={{ textAlign: "center" }}>
                                    <input 
                                      type="checkbox"
                                      checked={pendingSelected.has(item.rowId)}
                                      onChange={() => {}}
                                      onClick={(e) => e.stopPropagation()}
                                      tabIndex={-1}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
    
    {/* Custom Footer Buttons */}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0", marginBottom: 16 }}>
      <button 
        className="inv-btn-secondary" 
        id="cancel-pick-btn"
        onClick={() => { setPendingModalOpen(false); setPendingSelected(new Set()); setExpandedGroups({}); }}
      >
        Cancel
      </button>
      <button 
        id="add-items-btn"
        className="inv-btn-primary" 
        onClick={() => { addPendingLinesToDetails(); setPendingModalOpen(false); setPendingSelected(new Set()); setExpandedGroups({}); }}
      >
        Add {pendingSelected.size} Item(s) to PO
      </button>
    </div>
  </Modal>
)}
      {viewingSupplier && <SupplierDetailsModal supplier={viewingSupplier} onClose={() => setViewingSupplier(null)} />}

    {showSaveConfirm && (
  <Modal 
    id="confirm-save-modal"
    title="Confirm Save" 
    onClose={() => setShowSaveConfirm(false)} 
    hideDefaultButtons={true}
  >
    <style>
      {`
        #confirm-save-modal .inv-modal-header button,
        #confirm-save-modal .inv-modal-header .inv-btn-ghost,
        #confirm-save-modal .inv-modal-header .inv-save-btn,
        #confirm-save-modal .inv-modal-header .inv-btn-secondary,
        #confirm-save-modal .inv-modal-header .inv-btn-primary,
        #confirm-save-modal .inv-modal-header [class*="btn"],
        #confirm-save-modal .inv-modal-header > *:not(h2):not(h3):not(.inv-modal-title),
        #confirm-save-modal .inv-modal-footer {
          display: none !important;
        }

        #confirm-save-modal .inv-btn-primary,
        #confirm-save-modal .inv-btn-secondary {
          display: inline-flex !important;
        }
      `}
    </style>
    
    <div style={{ textAlign: "center", padding: 20 }}>
      <p style={{ fontSize: 14, marginBottom: 8 }}>Do you want to save this record?</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
        <button 
          className="inv-btn-primary" 
          onClick={performSave}
          tabIndex={0}
          autoFocus
        >
          Save
        </button>
        <button 
          id="cancel-save-btn"
          className="inv-btn-secondary" 
          onClick={() => setShowSaveConfirm(false)}
          tabIndex={0}
        >
          Cancel
        </button>
      </div>
    </div>
  </Modal>
)}
    </div>
  );
}
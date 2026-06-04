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
import { SearchSelect } from "../../components/FormFields";

const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

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
  poDetailId: "",
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
    grnQty: grnQty.toFixed(3),
    phyQty: (Number(row.phyQty || 0)).toFixed(3),
    batchQty: (Number(row.batchQty || 0)).toFixed(3),
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

const fmtQty = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

export default function PurchaseGRNPage() {
  const { user } = useAuth();

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
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  const [formError, setFormError] = useState(null);

  const [header, setHeader] = useState({
    grnNo: "",
    grnDate: getTodayDate(),
    grnType: "Against PO",
    supplierId: "",
    supplierName: "",
    storeId: "",
    storeName: "",
    invoiceNo: "",
    invoiceDate: getTodayDate(),
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
      const sid = (v) => {
        if (!v) return "";
        if (typeof v === "object") return String(v.id || v._id || "");
        return String(v);
      };

      setGrns(grnData || []);
      setSuppliers((suppData || []).map(s => ({ ...s, id: sid(s) })));
      setStores((storeData || []).map(s => ({ ...s, id: sid(s) })));
      setItems((itemData || []).map(it => ({ ...it, id: sid(it), headId: sid(it.headId), groupId: sid(it.groupId) })));
      setPos(poData || []);
      setIndents(indData || []);
    } catch (err) {
      console.error("Failed to load GRN data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addNewRow = () => {
  const newRowCount = details.length + 1;
  // Calculate the tabIndex for the new row's Item Description field
  const newItemDescTabIndex = header.grnType === "General" ? 9 + (details.length * 10) : 60 + (details.length * 10);
  
  setDetails(prev => [...prev, emptyDetail()]);
  
  // Wait for DOM update and focus the new row's Item Description
  setTimeout(() => {
    // Method 1: Find by tabIndex
    let targetElement = document.querySelector(`[tabIndex="${newItemDescTabIndex}"]`);
    
    // Method 2: If not found, find by DOM position
    if (!targetElement) {
      const rows = document.querySelectorAll('tbody tr');
      const lastRow = rows[rows.length - 1];
      if (lastRow) {
        // Item Description is the 3rd column (index 2) in General mode
        const itemDescCell = lastRow.querySelectorAll('td')[2];
        if (itemDescCell) {
          targetElement = itemDescCell.querySelector('input');
        }
      }
    }
    
    if (targetElement) {
      targetElement.focus();
    }
  }, 150);
};


  useEffect(() => {
    loadData();
    openNew();
  }, [loadData]);

  useEffect(() => {
    const firstField = document.querySelector('[tabIndex="1"]');
    if (firstField) {
      firstField.focus();
    }
  }, []);

  // Global tab navigation handler
  useEffect(() => {
  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;
    
    // Get all elements with tabIndex
    let focusableElements = Array.from(
      document.querySelectorAll('[tabIndex]:not([tabIndex="-1"])')
    ).filter(el => {
      const tabIndex = parseInt(el.getAttribute('tabIndex'));
      return !isNaN(tabIndex) && tabIndex >= 1 && el.offsetParent !== null && !el.disabled;
    });
    
    // For General mode: Reorder to put empty item descriptions FIRST
    if (header.grnType === "General") {
      // Find all item description inputs that are empty
      const emptyItemDesc = focusableElements.filter(el => {
        const isItemDesc = el.getAttribute('placeholder') === 'Enter item name' || 
                          (el.closest('td') && el.closest('tr') && 
                           el.closest('td')?.cellIndex === 2 && 
                           header.grnType === "General");
        return isItemDesc && (!el.value || el.value.trim() === '');
      });
      
      // Find all other elements
      const otherElements = focusableElements.filter(el => {
        const isItemDesc = el.getAttribute('placeholder') === 'Enter item name' ||
                          (el.closest('td') && el.closest('tr') && 
                           el.closest('td')?.cellIndex === 2 && 
                           header.grnType === "General");
        return !isItemDesc || (el.value && el.value.trim() !== '');
      });
      
      // Put empty item descriptions first, then everything else
      focusableElements = [...emptyItemDesc, ...otherElements];
    }
    
    // Sort by tabIndex (your original sorting)
    focusableElements.sort((a, b) => {
      const tabA = parseInt(a.getAttribute('tabIndex'));
      const tabB = parseInt(b.getAttribute('tabIndex'));
      return tabA - tabB;
    });
    
    if (focusableElements.length === 0) return;
    
    const currentElement = document.activeElement;
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (!e.shiftKey) {
      // Tab forward
      if (currentIndex === focusableElements.length - 1 || currentIndex === -1) {
        e.preventDefault();
        focusableElements[0].focus();
      } else {
        // Don't prevent default for normal tab navigation
        // Let the browser handle it naturally
      }
    } else {
      // Shift+Tab backward
      if (currentIndex === 0 || currentIndex === -1) {
        e.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      } else {
        // Let browser handle normal shift+tab
      }
    }
  };
  
  document.addEventListener('keydown', handleTabKey);
  return () => {
    document.removeEventListener('keydown', handleTabKey);
  };
}, [details.length, header.grnType]);

  // ── Handlers ──
  async function openNew() {useEffect(() => {
  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;
    
    // Get all elements with tabIndex
    let focusableElements = Array.from(
      document.querySelectorAll('[tabIndex]:not([tabIndex="-1"])')
    ).filter(el => {
      const tabIndex = parseInt(el.getAttribute('tabIndex'));
      return !isNaN(tabIndex) && tabIndex >= 1 && el.offsetParent !== null && !el.disabled;
    });
    
    // For General mode: Reorder to put empty item descriptions FIRST
    if (header.grnType === "General") {
      // Find all item description inputs that are empty
      const emptyItemDesc = focusableElements.filter(el => {
        const isItemDesc = el.getAttribute('placeholder') === 'Enter item name' || 
                          (el.closest('td') && el.closest('tr') && 
                           el.closest('td')?.cellIndex === 2 && 
                           header.grnType === "General");
        return isItemDesc && (!el.value || el.value.trim() === '');
      });
      
      // Find all other elements
      const otherElements = focusableElements.filter(el => {
        const isItemDesc = el.getAttribute('placeholder') === 'Enter item name' ||
                          (el.closest('td') && el.closest('tr') && 
                           el.closest('td')?.cellIndex === 2 && 
                           header.grnType === "General");
        return !isItemDesc || (el.value && el.value.trim() !== '');
      });
      
      // Put empty item descriptions first, then everything else
      focusableElements = [...emptyItemDesc, ...otherElements];
    }
    
    // Sort by tabIndex (your original sorting)
    focusableElements.sort((a, b) => {
      const tabA = parseInt(a.getAttribute('tabIndex'));
      const tabB = parseInt(b.getAttribute('tabIndex'));
      return tabA - tabB;
    });
    
    if (focusableElements.length === 0) return;
    
    const currentElement = document.activeElement;
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (!e.shiftKey) {
      // Tab forward
      if (currentIndex === focusableElements.length - 1 || currentIndex === -1) {
        e.preventDefault();
        focusableElements[0].focus();
      } else {
        // Don't prevent default for normal tab navigation
        // Let the browser handle it naturally
      }
    } else {
      // Shift+Tab backward
      if (currentIndex === 0 || currentIndex === -1) {
        e.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      } else {
        // Let browser handle normal shift+tab
      }
    }
  };
  
  document.addEventListener('keydown', handleTabKey);
  return () => {
    document.removeEventListener('keydown', handleTabKey);
  };
}, [details.length, header.grnType]);
    setHeader({
      grnNo: "",
      grnDate: getTodayDate(),
      grnType: "Against PO",
      supplierId: "",
      supplierName: "",
      storeId: "",
      storeName: "",
      invoiceNo: "",
      invoiceDate: getTodayDate(),
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
      grnDate: rec.date || rec.grnDate || getTodayDate(),
      grnType: rec.grnType || "Against PO",
      supplierId: rec.supplierId,
      supplierName: rec.supplierName,
      storeId: rec.storeId,
      storeName: rec.storeName,
      invoiceNo: rec.invoiceNo || "",
      invoiceDate: rec.invoiceDate || getTodayDate(),
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
          <div class="bold" style="font-size: 11px; text-decoration: underline; margin-bottom: 5px;">Supplier Details</div>
          <div class="bold">${esc(header.supplierName)}</div>
          <div style="margin-top: 3px;">GST: ${esc(header.supplierGst || "N/A")}</div>
          <div style="margin-top: 10px;"><span class="bold">Invoice No:</span> ${esc(header.invoiceNo)}</div>
          <div><span class="bold">Invoice Date:</span> ${header.invoiceDate ? new Date(header.invoiceDate).toLocaleDateString("en-GB") : ""}</div>
        </td>
        <td style="width: 50%;">
          <div style="margin-bottom: 8px;"><span class="bold">GRN Number:</span> <span style="font-size: 12px;" class="bold">${header.grnNo}</span></div>
          <div style="margin-bottom: 8px;"><span class="bold">GRN Date:</span> ${header.grnDate ? new Date(header.grnDate).toLocaleDateString("en-GB") : ""}</div>
          <div style="margin-bottom: 8px;"><span class="bold">Store / Location:</span> ${header.storeName}</div>
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
          <th style="width: 80px;">Unit Price</th>
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
          <td colspan="5" class="text-right">Total Received Quantity</td>
          <td class="text-right" style="font-size: 11px;">${totals.grnQty.toFixed(2)}</td>
          <td class="text-right">Grand Total</td>
          <td class="text-right" style="font-size: 12px;">₹${totals.totalAmount.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="padding: 10px; border-top: 1px solid #000;">
      <div class="bold" style="font-size: 9px; margin-bottom: 5px;">Remarks / Notes:</div>
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
      </table>
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
        [field]: val,
      };
      row = calcRow(row, header.gstType);
      rows[idx] = row;
      return rows;
    });
  }

  async function handleSave() {
    if (!header.supplierId) return setFormError("Supplier is required");
    if (!header.storeId) return setFormError("Store is required");
    if (!header.grnDate) return setFormError("GRN Date is required");
    
    const hasValidItem = details.some(row => Number(row.grnQty) > 0 && row.itemName);
    if (!hasValidItem) {
      return setFormError("At least one item with GRN Qty is required");
    }
    
    const confirmSave = window.confirm("Do you want to save this record?");
    if (!confirmSave) return;
    
    setFormError(null);
    setSaving(true);
    
    try {
      const payload = {
        grnNo: header.grnNo || "GRN-" + Date.now(),
        date: header.grnDate,
        grnDate: header.grnDate,
        grnType: header.grnType || "Against PO",
        supplierId: String(header.supplierId),
        supplierName: header.supplierName || "",
        storeId: String(header.storeId),
        storeName: header.storeName || "",
        invoiceNo: header.invoiceNo || "",
        invoiceDate: header.invoiceDate || header.grnDate,
        gstType: header.gstType || "local",
        remarks: header.remarks || "",
        preparedBy: header.preparedBy || user?.name || "Admin",
        details: details
          .filter(row => Number(row.grnQty) > 0 && row.itemName)
          .map(({ _rowId, ...rest }) => rest)
      };
      
      if (editId) {
        await grnApi.update(editId, payload);
      } else {
        const res = await grnApi.create(payload);
        if (res?.data?.id) {
          setEditId(res.data.id);
          setHeader(h => ({ ...h, grnNo: res.data.grnNo }));
        }
      }
      await loadData();
      setSaveSuccessModal(true);
      setTimeout(() => {
        setSaveSuccessModal(false);
        setView("list");
      }, 2000);
    } catch (err) {
      console.error("Save error:", err);
      setFormError(err.message || "Failed to save GRN");
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
    try {
      const cleanSupplierId = header.supplierId
        ? String(header.supplierId).split(':')[0]
        : null;
      const pendingData = await grnApi.getPendingPOItems(cleanSupplierId || "");
      const rows = Array.isArray(pendingData) ? pendingData : [];
      if (rows.length === 0) {
        alert(header.supplierId
          ? "No pending PO items found for this supplier. Please ensure POs exist with status 'Open' and have quantities."
          : "No pending PO items found. Please create a Purchase Order first."
        );
        return;
      }
      setPendingPoRows(rows);
      setPendingSelected(new Set());
      setPendingModalOpen(true);
    } catch (err) {
      alert("Failed to fetch pending items: " + err.message);
    }
  }

  function addPendingLinesToDetails() {
    const selected = pendingPoRows.filter(r => {
      const key = r.rowId || `${r.poId}-${r.poDetailId}`;
      return pendingSelected.has(key);
    });
    if (selected.length === 0) {
      setPendingModalOpen(false);
      return;
    }
    
    const firstGstType = selected[0].gstType || "local";
    if (!header.supplierId && selected[0].supplierId) {
      setHeader(h => ({ 
        ...h, 
        supplierId: String(selected[0].supplierId), 
        supplierName: selected[0].supplierName || h.supplierName,
        gstType: firstGstType 
      }));
    } else {
      setHeader(h => ({ ...h, gstType: firstGstType }));
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
      gstPct: s.gstPct !== undefined ? s.gstPct : 0,
      poDetailId: s.poDetailId
    }, firstGstType));
    
    setDetails(p => {
      const existing = p.filter(r => r.itemName || r.poNo);
      if (existing.length === 0) return newRows;
      return [...existing, ...newRows];
    });
    setPendingModalOpen(false);
    setPendingSelected(new Set());
  }

  if (loading && view === "list") return <div className="inv-empty">Loading...</div>;

  /* ── LIST VIEW ── */
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
              <input tabIndex={1} className="inv-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Type to search..." />
            </div>
            <div className="inv-field" style={{ width: 200 }}>
              <label className="inv-label">Filter by Date</label>
              <input tabIndex={2} className="inv-input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            </div>
            <div className="inv-field" style={{ width: 250 }}>
              <label className="inv-label">Filter by Supplier</label>
              <select tabIndex={3} className="inv-input" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
                <option value="">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.supplierName}</option>)}
              </select>
            </div>
            <button tabIndex={4} className="inv-btn-secondary" style={{ height: 38 }} onClick={() => { setSearchTerm(""); setSupplierFilter(""); setDateFilter(""); }}>Clear</button>
          </div>
        </div>

        <div className="inv-card">
          <div className="inv-card-body">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {header.grnType !== "General" && (
                  <button tabIndex={50} className="inv-btn-secondary inv-btn-sm" onClick={openPendingModal}>
                    + Pick Pending PO
                  </button>
                )}
                <button className="inv-btn-secondary inv-btn-sm" onClick={addNewRow}>+ Add Row</button>
              </div>
            </div>
            <div style={{ overflowX: "auto", minHeight: 400 }}>
              <table className="inv-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "left" }}>#</th>
                    {header.grnType !== "General" && <th style={{ width: "120px", textAlign: "left" }}>Indent No</th>}
                    {header.grnType !== "General" && <th style={{ width: "120px", textAlign: "left" }}>PO No</th>}
                    <th style={{ minWidth: "200px", textAlign: "left" }}>Item Description</th>
                    {header.grnType !== "General" && <th style={{ width: "90px", textAlign: "right" }}>PO Qty</th>}
                    {header.grnType !== "General" && <th style={{ width: "100px", textAlign: "right" }}>PO Unit Price</th>}
                    <th style={{ width: "100px", textAlign: "left" }}>GRN Qty</th>
                    <th style={{ width: "80px", textAlign: "left" }}>Batch</th>
                    {header.grnType !== "General" && <th style={{ width: "100px", textAlign: "right" }}>Balance Qty</th>}
                    {header.grnType !== "General" && <th style={{ width: "100px", textAlign: "left" }}>Phy Qty</th>}
                    <th style={{ width: "100px", textAlign: "right" }}>Unit Price</th>
                    <th style={{ width: "80px", textAlign: "right" }}>Disc %</th>
                    <th style={{ width: "70px", textAlign: "center" }}>GST%</th>
                    {header.gstType === 'other' ? (
                      <th style={{ width: "90px", textAlign: "right" }}>IGST</th>
                    ) : (
                      <>
                        <th style={{ width: "80px", textAlign: "right" }}>SGST</th>
                        <th style={{ width: "80px", textAlign: "right" }}>CGST</th>
                      </>
                    )}
                    <th style={{ width: "100px", textAlign: "right" }}>Total</th>
                    <th style={{ width: "50px", textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => {
                    const baseTabIndex = header.grnType === "General" ? 9 + (idx * 10) : 60 + (idx * 10);
                    const isLastRow = idx === details.length - 1;
                    
                    return (
                      <tr key={row._rowId}>
  <td style={{ textAlign: "left", padding: "8px 4px" }}>{idx + 1}</td>
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "left", padding: "8px 4px" }}>
      <input className="inv-input-cell" value={row.indentNo || ""} readOnly placeholder="—" style={{ background: "#f8fafc", textAlign: "left", width: "100%", padding: "6px 4px" }} />
    </td>
  )}
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "left", padding: "8px 4px" }}>
      <input className="inv-input-cell" value={row.poNo || ""} readOnly placeholder="—" style={{ background: "#f8fafc", textAlign: "left", width: "100%", padding: "6px 4px" }} />
    </td>
  )}
  
  {/* Item Description */}
  <td style={{ textAlign: "left", padding: "8px 4px" }}>
    {header.grnType === "General" ? (
      <input type="text" className="inv-input-cell" tabIndex={baseTabIndex} value={row.itemName || ""} onChange={e => updateDetail(idx, "itemName", e.target.value)} placeholder="Enter item name" style={{ border: "1px solid #e2e8f0", borderRadius: "4px", padding: "6px 8px", width: "100%", fontSize: "13px", backgroundColor: "#ffffff" }} autoComplete="off" />
    ) : (
      <input className="inv-input-cell" value={row.itemName || ""} readOnly placeholder="Via Pick PO" style={{ background: "#f8fafc", textAlign: "left", width: "100%", padding: "6px 4px" }} />
    )}
  </td>
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "right", padding: "8px 4px" }}>
      <input className="inv-input" style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={fmtQty(row.poQty)} readOnly />
    </td>
  )}
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "right", padding: "8px 4px" }}>
      <input type="number" step="0.01" className="inv-input" tabIndex={baseTabIndex + 1} style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={row.poRate && row.poRate !== 0 ? row.poRate : ""} onChange={e => updateDetail(idx, "poRate", e.target.value)} placeholder="0.00" />
    </td>
  )}
  
  {/* GRN Qty */}
  <td style={{ textAlign: "left", padding: "8px 4px" }}>
    <input type="number" step="0.001" className="inv-input" tabIndex={baseTabIndex + 2} style={{ border: "none", width: "100%", textAlign: "left", fontWeight: 600, color: '#3b6ef8', background: "transparent", padding: "6px 4px" }} value={row.grnQty && row.grnQty !== 0 ? row.grnQty : ""} onChange={e => updateDetail(idx, "grnQty", e.target.value)} placeholder="0.000" />
  </td>
  
  {/* Batch */}
  <td style={{ textAlign: "left", padding: "8px 4px" }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select className="inv-input" tabIndex={baseTabIndex + 3} style={{ border: "none", width: "50px", padding: "6px 0", textAlign: "left", background: "transparent" }} value={row.isBatch} onChange={e => { const val = e.target.value; updateDetail(idx, "isBatch", val); if (val === "Yes") { setBatchRowIdx(idx); setBatchModalOpen(true); } }}>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      {row.isBatch === "Yes" && (
        <button className="inv-btn-icon" style={{ padding: '4px', color: 'var(--accent)' }} onClick={() => { setBatchRowIdx(idx); setBatchModalOpen(true); }} title="Edit Batch Details">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
      )}
    </div>
  </td>
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "right", padding: "8px 4px" }}>
      <input className="inv-input" style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={fmtQty(row.balQty)} readOnly />
    </td>
  )}
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "left", padding: "8px 4px" }}>
      <input type="number" step="0.001" className="inv-input" tabIndex={baseTabIndex + 4} style={{ border: "none", width: "100%", textAlign: "left", background: "transparent", padding: "6px 4px" }} value={row.phyQty && row.phyQty !== 0 ? row.phyQty : ""} onChange={e => updateDetail(idx, "phyQty", e.target.value)} placeholder="0.000" />
    </td>
  )}
  
  {/* Unit Price */}
  <td style={{ textAlign: "right", padding: "8px 4px" }}>
    <input type="number" step="0.01" className="inv-input" tabIndex={baseTabIndex + 5} style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={row.grnRate && row.grnRate !== 0 ? row.grnRate : ""} onChange={e => updateDetail(idx, "grnRate", e.target.value)} placeholder="0.00" />
  </td>
  
  {/* Disc % */}
  <td style={{ textAlign: "right", padding: "8px 4px" }}>
    <input type="number" step="0.01" className="inv-input" tabIndex={baseTabIndex + 6} style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={row.discPct && row.discPct !== 0 ? row.discPct : ""} onChange={e => updateDetail(idx, "discPct", e.target.value)} placeholder="0.00" />
  </td>
  
  {/* GST% - added tabIndex */}
  {/* GST% - EDITABLE WITH % SYMBOL */}
<td>
  <input 
    type="number"
    step="0.01"
    className="inv-input" 
    style={{ border: "1px solid #e2e8f0", width: 55, textAlign: 'center', padding: "4px" }} 
    value={row.gstPct || 0} 
    onChange={e => updateDetail(idx, "gstPct", e.target.value)}
    placeholder="GST%"
  />
</td>
  
  {/* IGST/SGST/CGST - wrapped in inputs with tabIndex */}
  {header.gstType === 'other' ? (
    <td style={{ textAlign: "right", fontWeight: 500, padding: "8px 4px" }}>
      <input 
        className="inv-input" 
        tabIndex={baseTabIndex + 8}
        style={{ border: "none", width: "100%", textAlign: "right", background: '#f8f9fa', padding: "6px 4px", fontWeight: 500 }} 
        value={fmt(row.igst)} 
        readOnly 
      />
    </td>
  ) : (
    <>
      <td style={{ textAlign: "right", fontWeight: 500, padding: "8px 4px" }}>
        <input 
          className="inv-input" 
          tabIndex={baseTabIndex + 8}
          style={{ border: "none", width: "100%", textAlign: "right", background: '#f8f9fa', padding: "6px 4px", fontWeight: 500 }} 
          value={fmt(row.sgst)} 
          readOnly 
        />
      </td>
      <td style={{ textAlign: "right", fontWeight: 500, padding: "8px 4px" }}>
        <input 
          className="inv-input" 
          tabIndex={baseTabIndex + 9}
          style={{ border: "none", width: "100%", textAlign: "right", background: '#f8f9fa', padding: "6px 4px", fontWeight: 500 }} 
          value={fmt(row.cgst)} 
          readOnly 
        />
      </td>
    </>
  )}
  
  {/* Total Amount - wrapped in input with tabIndex */}
  <td style={{ textAlign: "right", fontWeight: 700, padding: "8px 4px" }}>
    <input 
      className="inv-input" 
      tabIndex={baseTabIndex + 10}
      style={{ border: "none", width: "100%", textAlign: "right", background: '#f8f9fa', fontWeight: 700, padding: "6px 4px" }} 
      value={fmt(row.totalAmount)} 
      readOnly 
    />
  </td>
  
  {/* Delete button - moved to baseTabIndex + 11 */}
  <td style={{ textAlign: "center", padding: "8px 4px" }}>
    <button 
      className="inv-btn-icon inv-btn-danger" 
      tabIndex={isLastRow ? baseTabIndex + 11 : -1} 
      onClick={() => setDetails(p => p.filter((_, i) => i !== idx))} 
      style={{ padding: "4px" }}
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
      </div>
    );
  }

  /* ── FORM VIEW ── */
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">{editId ? "Edit GRN" : "New Purchase GRN"}</h1>
          <p className="inv-page-sub">Record goods received against purchase orders</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => setView("list")} tabIndex={501}>View GRN</button>
          <button className="inv-btn-secondary" onClick={printGRN} tabIndex={502}>Print</button>
          <button className="inv-btn-primary" onClick={handleSave} disabled={saving} tabIndex={503}>{saving ? "Saving..." : "Save GRN"}</button>
        </div>
      </div>

      {pendingModalOpen && (
        <Modal title="Pick Pending PO Items" onClose={() => { setPendingModalOpen(false); setPendingSelected(new Set()); }} onSave={addPendingLinesToDetails} saveLabel={pendingSelected.size > 0 ? `Add ${pendingSelected.size} Item(s) to GRN` : "Select items to add"} full={true}>
          <div style={{ padding: "0 10px" }}>
            <table className="inv-table-premium">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>
                    <input type="checkbox" style={{ width: 18, height: 18, cursor: "pointer" }} checked={pendingPoRows.length > 0 && pendingSelected.size === pendingPoRows.length} onChange={(e) => { if (e.target.checked) setPendingSelected(new Set(pendingPoRows.map(r => r.rowId || `${r.poId}-${r.poDetailId}`))); else setPendingSelected(new Set()); }} />
                  </th>
                  <th style={{ width: 140 }}>PO No</th>
                  <th style={{ width: 100 }}>PO Date</th>
                  <th style={{ minWidth: 200 }}>Item Description</th>
                  <th style={{ width: 80 }}>UOM</th>
                  <th style={{ width: 100, textAlign: "right" }}>Pending Qty</th>
                  <th style={{ width: 100, textAlign: "right" }}>PO Rate</th>
                </tr>
              </thead>
              <tbody>
                {pendingPoRows.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No pending PO items found</td></tr>}
                {pendingPoRows.map(r => {
                  const rowId = r.rowId || `${r.poId}-${r.poDetailId}`;
                  return (
                    <tr key={rowId} onClick={() => { const next = new Set(pendingSelected); if (next.has(rowId)) next.delete(rowId); else next.add(rowId); setPendingSelected(next); }} style={{ cursor: "pointer" }}>
                      <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" style={{ width: 18, height: 18, cursor: "pointer" }} checked={pendingSelected.has(rowId)} onChange={() => { const next = new Set(pendingSelected); if (next.has(rowId)) next.delete(rowId); else next.add(rowId); setPendingSelected(next); }} />
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--accent)" }}>{r.poNo}</td>
                      <td style={{ fontSize: "12px" }}>{r.poDate ? new Date(r.poDate).toLocaleDateString("en-GB") : "—"}</td>
                      <td style={{ fontWeight: 500 }}>{r.itemName}</td>
                      <td style={{ textAlign: "center" }}>{r.uom}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#3b6ef8" }}>{fmtQty(r.balQty)}</td>
                      <td style={{ textAlign: "right" }}>₹{fmt(r.poRate)}</td>
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
            <Field label="GRN Date *">
              <input className="inv-input" tabIndex={1} type="date" min={new Date().toISOString().split('T')[0]} value={header.grnDate || getTodayDate()} onChange={e => setHeader(h => ({ ...h, grnDate: e.target.value }))} />
            </Field>
            <Field label="GRN Type *">
              <select className="inv-input" tabIndex={2} value={header.grnType} onChange={(e) => setHeader(h => ({ ...h, grnType: e.target.value }))}>
                <option value="Against PO">Against PO</option>
                <option value="General">General</option>
              </select>
            </Field>
            <Field label="Supplier *">
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <SearchSelect tabIndex={3} value={header.supplierId} onChange={val => { const cleanId = val.includes(':') ? val.split(':')[0] : val; const s = suppliers.find(x => String(x.id) === cleanId); setHeader(h => ({ ...h, supplierId: cleanId, supplierName: s?.supplierName || "" })); }} options={suppliers.map(s => ({ value: String(s.id || s._id), label: s.supplierName }))} placeholder="Select supplier" />
                </div>
                <button type="button" className="inv-btn-icon" tabIndex={4} title="Add New Supplier" onClick={() => navigate("/supplier")} style={{ color: "#10b981" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </Field>
            <Field label="Store *">
              <select className="inv-input" tabIndex={5} value={header.storeId} onChange={(e) => { const st = stores.find(x => String(x.id || x._id) === e.target.value); setHeader(h => ({ ...h, storeId: e.target.value, storeName: st?.name || "" })); }}>
                <option value="">Select store</option>
                {stores.map(st => <option key={st.id || st._id} value={String(st.id || st._id)}>{st.name}</option>)}
              </select>
            </Field>
            <Field label="Inv/Pdc No">
              <input className="inv-input" tabIndex={6} value={header.invoiceNo} onChange={(e) => setHeader(h => ({ ...h, invoiceNo: e.target.value }))} placeholder="Enter Invoice Number" />
            </Field>
            <Field label="Inv Date">
              <input className="inv-input" tabIndex={7} type="date" value={header.invoiceDate} onChange={(e) => setHeader(h => ({ ...h, invoiceDate: e.target.value }))} />
            </Field>
            <Field label="GST Type">
              <input className="inv-input" tabIndex={8} value={header.gstType === 'other' ? 'Other State (IGST)' : 'Local (SGST+CGST)'} readOnly style={{ background: "#f8f9fa", fontWeight: 600 }} />
            </Field>
          </FormGrid>
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {header.grnType !== "General" && (
                <button tabIndex={50} className="inv-btn-secondary inv-btn-sm" onClick={openPendingModal}>+ Pick Pending PO</button>
              )}
              <button 
  id="addRowBtn"
  className="inv-btn-secondary inv-btn-sm" 
  tabIndex={100} 
  onClick={() => {
    setDetails(p => [...p, emptyDetail()]);
    // After adding, focus on the new empty item description
    setTimeout(() => {
      const newItemDesc = document.querySelector('tbody tr:last-child input[placeholder="Enter item name"]');
      if (newItemDesc) newItemDesc.focus();
    }, 50);
  }}
>
  + Add Row
</button>
            </div>
          </div>
          <div style={{ overflowX: "auto", minHeight: 400 }}>
            <table className="inv-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "left" }}>#</th>
                  {header.grnType !== "General" && <th style={{ width: "120px", textAlign: "left" }}>Indent No</th>}
                  {header.grnType !== "General" && <th style={{ width: "120px", textAlign: "left" }}>PO No</th>}
                  <th style={{ minWidth: "200px", textAlign: "left" }}>Item Description</th>
                  {header.grnType !== "General" && <th style={{ width: "90px", textAlign: "right" }}>PO Qty</th>}
                  {header.grnType !== "General" && <th style={{ width: "100px", textAlign: "right" }}>PO Unit Price</th>}
                  <th style={{ width: "100px", textAlign: "left" }}>GRN Qty</th>
                  <th style={{ width: "80px", textAlign: "left" }}>Batch</th>
                  {header.grnType !== "General" && <th style={{ width: "100px", textAlign: "right" }}>Balance Qty</th>}
                  {header.grnType !== "General" && <th style={{ width: "100px", textAlign: "left" }}>Phy Qty</th>}
                  <th style={{ width: "100px", textAlign: "right" }}>Unit Price</th>
                  <th style={{ width: "80px", textAlign: "right" }}>Disc %</th>
                  <th style={{ width: "70px", textAlign: "center" }}>GST%</th>
                  {header.gstType === 'other' ? (
                    <th style={{ width: "90px", textAlign: "right" }}>IGST</th>
                  ) : (
                    <>
                      <th style={{ width: "80px", textAlign: "right" }}>SGST</th>
                      <th style={{ width: "80px", textAlign: "right" }}>CGST</th>
                    </>
                  )}
                  <th style={{ width: "100px", textAlign: "right" }}>Total</th>
                  <th style={{ width: "50px", textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => {
                  const baseTabIndex = header.grnType === "General" ? 9 + (idx * 10) : 60 + (idx * 10);
                  const isLastRow = idx === details.length - 1;
                  
                  return (
                    <tr key={row._rowId}>
  <td style={{ textAlign: "left", padding: "8px 4px" }}>{idx + 1}</td>
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "left", padding: "8px 4px" }}>
      <input className="inv-input-cell" value={row.indentNo || ""} readOnly placeholder="—" style={{ background: "#f8fafc", textAlign: "left", width: "100%", padding: "6px 4px" }} />
    </td>
  )}
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "left", padding: "8px 4px" }}>
      <input className="inv-input-cell" value={row.poNo || ""} readOnly placeholder="—" style={{ background: "#f8fafc", textAlign: "left", width: "100%", padding: "6px 4px" }} />
    </td>
  )}
  
  <td style={{ textAlign: "left", padding: "8px 4px" }}>
    {header.grnType === "General" ? (
      <input type="text" className="inv-input-cell" tabIndex={baseTabIndex} value={row.itemName || ""} onChange={e => updateDetail(idx, "itemName", e.target.value)} placeholder="Enter item name" style={{ border: "1px solid #e2e8f0", borderRadius: "4px", padding: "6px 8px", width: "100%", fontSize: "13px", backgroundColor: "#ffffff" }} autoComplete="off" />
    ) : (
      <input className="inv-input-cell" value={row.itemName || ""} readOnly placeholder="Via Pick PO" style={{ background: "#f8fafc", textAlign: "left", width: "100%", padding: "6px 4px" }} />
    )}
  </td>
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "right", padding: "8px 4px" }}>
      <input className="inv-input" style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={fmtQty(row.poQty)} readOnly />
    </td>
  )}
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "right", padding: "8px 4px" }}>
      <input type="number" step="0.01" className="inv-input" tabIndex={baseTabIndex + 1} style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={row.poRate && row.poRate !== 0 ? row.poRate : ""} onChange={e => updateDetail(idx, "poRate", e.target.value)} placeholder="0.00" />
    </td>
  )}
  
  <td style={{ textAlign: "left", padding: "8px 4px" }}>
    <input type="number" step="0.001" className="inv-input" tabIndex={baseTabIndex + 2} style={{ border: "none", width: "100%", textAlign: "left", fontWeight: 600, color: '#3b6ef8', background: "transparent", padding: "6px 4px" }} value={row.grnQty && row.grnQty !== 0 ? row.grnQty : ""} onChange={e => updateDetail(idx, "grnQty", e.target.value)} placeholder="0.000" />
  </td>
  
  <td style={{ textAlign: "left", padding: "8px 4px" }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select className="inv-input" tabIndex={baseTabIndex + 3} style={{ border: "none", width: "50px", padding: "6px 0", textAlign: "left", background: "transparent" }} value={row.isBatch} onChange={e => { const val = e.target.value; updateDetail(idx, "isBatch", val); if (val === "Yes") { setBatchRowIdx(idx); setBatchModalOpen(true); } }}>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>
      {row.isBatch === "Yes" && (
        <button className="inv-btn-icon" style={{ padding: '4px', color: 'var(--accent)' }} onClick={() => { setBatchRowIdx(idx); setBatchModalOpen(true); }} title="Edit Batch Details">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
      )}
    </div>
  </td>
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "right", padding: "8px 4px" }}>
      <input className="inv-input" style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={fmtQty(row.balQty)} readOnly />
    </td>
  )}
  
  {header.grnType !== "General" && (
    <td style={{ textAlign: "left", padding: "8px 4px" }}>
      <input type="number" step="0.001" className="inv-input" tabIndex={baseTabIndex + 4} style={{ border: "none", width: "100%", textAlign: "left", background: "transparent", padding: "6px 4px" }} value={row.phyQty && row.phyQty !== 0 ? row.phyQty : ""} onChange={e => updateDetail(idx, "phyQty", e.target.value)} placeholder="0.000" />
    </td>
  )}
  
  <td style={{ textAlign: "right", padding: "8px 4px" }}>
    <input type="number" step="0.01" className="inv-input" tabIndex={baseTabIndex + 5} style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={row.grnRate && row.grnRate !== 0 ? row.grnRate : ""} onChange={e => updateDetail(idx, "grnRate", e.target.value)} placeholder="0.00" />
  </td>
  
  <td style={{ textAlign: "right", padding: "8px 4px" }}>
    <input type="number" step="0.01" className="inv-input" tabIndex={baseTabIndex + 6} style={{ border: "none", width: "100%", textAlign: "right", background: "transparent", padding: "6px 4px" }} value={row.discPct && row.discPct !== 0 ? row.discPct : ""} onChange={e => updateDetail(idx, "discPct", e.target.value)} placeholder="0.00" />
  </td>
  
  {/* GST% */}
  <td style={{ textAlign: "center", padding: "8px 4px" }}>
    <input className="inv-input" tabIndex={baseTabIndex + 7} style={{ border: "none", width: "100%", textAlign: "center", background: '#f8f9fa', padding: "6px 4px" }} value={row.gstPct ? `${row.gstPct}%` : "0%"} readOnly />
  </td>
  
  {/* IGST/SGST/CGST */}
  {header.gstType === 'other' ? (
    <td style={{ textAlign: "right", fontWeight: 500, padding: "8px 4px" }}>
      <input 
        className="inv-input" 
        tabIndex={baseTabIndex + 8}
        style={{ border: "none", width: "100%", textAlign: "right", background: '#f8f9fa', padding: "6px 4px", fontWeight: 500 }} 
        value={fmt(row.igst)} 
        readOnly 
      />
    </td>
  ) : (
    <>
      <td style={{ textAlign: "right", fontWeight: 500, padding: "8px 4px" }}>
        <input 
          className="inv-input" 
          tabIndex={baseTabIndex + 8}
          style={{ border: "none", width: "100%", textAlign: "right", background: '#f8f9fa', padding: "6px 4px", fontWeight: 500 }} 
          value={fmt(row.sgst)} 
          readOnly 
        />
      </td>
      <td style={{ textAlign: "right", fontWeight: 500, padding: "8px 4px" }}>
        <input 
          className="inv-input" 
          tabIndex={baseTabIndex + 9}
          style={{ border: "none", width: "100%", textAlign: "right", background: '#f8f9fa', padding: "6px 4px", fontWeight: 500 }} 
          value={fmt(row.cgst)} 
          readOnly 
        />
      </td>
    </>
  )}
  
  {/* Total Amount - FIXED: wrapped in input */}
  <td style={{ textAlign: "right", fontWeight: 700, padding: "8px 4px" }}>
    <input 
      className="inv-input" 
      tabIndex={baseTabIndex + 10}
      style={{ border: "none", width: "100%", textAlign: "right", background: '#f8f9fa', fontWeight: 700, padding: "6px 4px" }} 
      value={fmt(row.totalAmount)} 
      readOnly 
    />
  </td>
  
  {/* Delete button - FIXED: different tabIndex */}
  <td style={{ textAlign: "center", padding: "8px 4px" }}>
    <button 
      className="inv-btn-icon inv-btn-danger" 
      tabIndex={isLastRow ? baseTabIndex + 11 : -1} 
      onClick={() => setDetails(p => p.filter((_, i) => i !== idx))} 
      style={{ padding: "4px" }}
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

      <div className="inv-card" style={{ marginTop: 20 }}>
        <div className="inv-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, padding: "10px 20px" }}>
          <div><div style={{ fontSize: 11, textAlign: 'center', color: "#64748b", textTransform: "uppercase" }}>Gross Amount</div><div style={{ fontSize: 18, textAlign: 'center', fontWeight: 700, color: "#64748b" }}>₹{fmt(totals.grossAmount)}</div></div>
          <div><div style={{ fontSize: 11, textAlign: 'center', color: "#64748b", textTransform: "uppercase" }}>Total Discount</div><div style={{ fontSize: 18, textAlign: 'center', fontWeight: 700, color: "#b45309" }}>−₹{fmt(totals.discPrice)}</div><div style={{ fontSize: 11, textAlign: 'center', color: "#92400e", marginTop: 2, fontWeight: 500 }}>{Number(effectiveDiscPct || 0).toFixed(2)}% effective</div></div>
          <div><div style={{ fontSize: 11, textAlign: 'center', color: "#64748b", textTransform: "uppercase" }}>Amount after Disc</div><div style={{ fontSize: 18, textAlign: 'center', fontWeight: 700 }}>₹{fmt(totals.poAmount)}</div></div>
          <div><div style={{ fontSize: 11, textAlign: 'center', color: "#64748b", textTransform: "uppercase" }}>Total GST</div><div style={{ fontSize: 18, textAlign: 'center', fontWeight: 700 }}>₹{fmt(totals.totGst)}</div></div>
          {header.gstType === "local" ? (
            <>
              <div><div style={{ fontSize: 11, textAlign: 'center', color: "#64748b", textTransform: "uppercase" }}>SGST</div><div style={{ fontSize: 18, textAlign: 'center', fontWeight: 700 }}>₹{fmt(totals.sgst)}</div></div>
              <div><div style={{ fontSize: 11, textAlign: 'center', color: "#64748b", textTransform: "uppercase" }}>CGST</div><div style={{ fontSize: 18, textAlign: 'center', fontWeight: 700 }}>₹{fmt(totals.cgst)}</div></div>
            </>
          ) : (
            <div><div style={{ fontSize: 11, textAlign: 'center', color: "#64748b", textTransform: "uppercase" }}>IGST (Other State)</div><div style={{ fontSize: 18, textAlign: 'center', fontWeight: 700, color: "#7c3aed" }}>₹{fmt(totals.igst)}</div></div>
          )}
          <div><div style={{ fontSize: 11, textAlign: 'center', color: "#64748b", textTransform: "uppercase" }}>Grand Total</div><div style={{ fontSize: 24, textAlign: 'center', fontWeight: 700, color: "#10b981" }}>₹{fmt(totals.totalAmount)}</div></div>
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: "0 0 12px 12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Prepared By</label>
              <input className="inv-input" style={{ background: "white" }} value={header.preparedBy || ""} onChange={(e) => setHeader(h => ({ ...h, preparedBy: e.target.value }))} placeholder="Name of preparer" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Remarks & Special Instructions</label>
              <textarea className="inv-input" style={{ height: 38, resize: 'none', background: "white" }} value={header.remarks || ""} onChange={(e) => setHeader(h => ({ ...h, remarks: e.target.value }))} placeholder="Enter any special instructions or remarks..." />
            </div>
          </div>
        </div>
      </div>

      {batchModalOpen && batchRowIdx !== null && (
        <Modal title={`Batch Details: ${details[batchRowIdx]?.itemName || "Item"}`} onClose={() => setBatchModalOpen(false)} onSave={() => setBatchModalOpen(false)} saveLabel="Apply Details">
          <div className="inv-form-row cols-2">
            <div className="inv-field"><label className="inv-label">Batch Number (Alphanumeric)</label><input className="inv-input" value={details[batchRowIdx].batchNo || ""} onChange={e => updateDetail(batchRowIdx, "batchNo", e.target.value)} placeholder="e.g. BTH-123-A" /></div>
            <div className="inv-field"><label className="inv-label">Batch Qty (3 decimals)</label><input type="number" step="0.001" className="inv-input" value={details[batchRowIdx].batchQty && details[batchRowIdx].batchQty !== 0 ? details[batchRowIdx].batchQty : ""} onChange={e => updateDetail(batchRowIdx, "batchQty", e.target.value)} placeholder="0.000" /></div>
          </div>
          <div className="inv-form-row cols-2">
            <div className="inv-field"><label className="inv-label">Manufacturing Date</label><input type="date" className="inv-input" value={details[batchRowIdx].mfgDate || ""} onChange={e => updateDetail(batchRowIdx, "mfgDate", e.target.value)} /></div>
            <div className="inv-field"><label className="inv-label">Expiry Date</label><input type="date" className="inv-input" value={details[batchRowIdx].expDate || ""} onChange={e => updateDetail(batchRowIdx, "expDate", e.target.value)} /></div>
          </div>
          <p className="inv-muted-sm" style={{ marginTop: 10 }}>* This information will be saved with the GRN for stock tracking and expiry management.</p>
        </Modal>
      )}

      {saveSuccessModal && (
        <Modal title="Success" onClose={() => { setSaveSuccessModal(false); setView("list"); }} onSave={() => { setSaveSuccessModal(false); setView("list"); }} saveLabel="Go to List">
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 48, color: "#10b981" }}>✓</div>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Saved Successfully!</h3>
            <p style={{ color: "#64748b" }}>The Goods Receipt Note has been recorded.</p>
          </div>
        </Modal>
      )}

      {formError && (
        <div className="inv-error-banner" style={{ marginBottom: 16, padding: "10px 16px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "8px", color: "#ef4444" }}>
          ⚠️ {formError}
        </div>
      )}
    </div>
  );
}
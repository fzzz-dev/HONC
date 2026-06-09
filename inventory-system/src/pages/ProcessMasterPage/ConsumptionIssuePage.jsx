import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  consumptionIssueApi,
  departmentApi,
  storeApi,
  itemApi,
  grnApi,
} from "../../services/inventoryApi";
import { SearchSelect } from "../../components/FormFields";
import Modal from "../../components/Modal";

// ── helpers ───────────────────────────────────────────────────────────────────
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

const getFY = () => {
  const d = new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return m < 4 ? `${y - 1}-${y}` : `${y}-${y + 1}`;
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

const sid = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v.id || v._id || "");
  return String(v);
};

const safeDetails = (details) => {
  if (Array.isArray(details)) return details;
  if (typeof details === "string") {
    try {
      const p = JSON.parse(details);
      return Array.isArray(p) ? p : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(),
  itemName: "",
  grnNo: "",
  stkQty: "0.000",
  stkRate: "0.00",
  issueQty: "0.000",
  rate: "0.00",
  amount: "0.00",
  issueRemarks: "",
});

const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
    {children}
  </div>
);

const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

export default function ConsumptionIssuePage() {
  const { user } = useAuth();
  const today = getTodayDate();

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
  const [formError, setFormError] = useState(null);
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  
  // Refs for tab flow
  const addButtonRef = useRef(null);
  const viewListButtonRef = useRef(null);
  const saveButtonRef = useRef(null);
  const prevDetailsLengthRef = useRef(1);

  const [header, setHeader] = useState({
    issNo: "",
    date: today,
    issueType: "General",
    itemId: "",
    itemName: "",
    departmentId: "",
    departmentName: "",
    storeId: "",
    storeName: "",
    remarks: "",
    preparedBy: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);

  // Memoized sorted options
  const sortedItemOptions = useMemo(() => 
    items
      .map(item => ({ 
        value: String(item.id), 
        label: `${item.itemName} ${item.price ? `(${item.price})` : ''}`
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [items]
  );

  const sortedDepartmentOptions = useMemo(() => 
    departments
      .map(d => ({ value: String(d.id), label: d.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [departments]
  );

  const sortedStoreOptions = useMemo(() => 
    stores
      .map(s => ({ value: String(s.id), label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [stores]
  );

  const sortedTableItemOptions = useMemo(() => 
    items
      .map(it => ({ 
        value: it.itemDescription || it.itemName, 
        label: it.itemDescription || it.itemName 
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [items]
  );

  const sortedGrnOptions = useMemo(() => 
    grns
      .map(g => ({ value: g.grnNo, label: g.grnNo }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [grns]
  );

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

  // Initial focus on tabIndex=1 when page loads
  useEffect(() => {
    setTimeout(() => {
      const firstField = document.querySelector('[tabIndex="1"]');
      if (firstField) {
        firstField.focus();
      }
    }, 100);
  }, []);

  // Global Tab Navigation
  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
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
          focusableElements[0].focus();
        }
      } else {
        if (currentIndex === 0 || currentIndex === -1) {
          e.preventDefault();
          focusableElements[focusableElements.length - 1].focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleTabKey);
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [details.length]);


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
      itemName: "",
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
    setFormError(null);
    prevDetailsLengthRef.current = 1;
  }

  function openEdit(rec) {
    setHeader({
      issNo: rec.issNo,
      date: rec.date,
      issueType: rec.issueType || "General",
      itemId: rec.itemId || "",
      itemName: rec.itemName || "",
      departmentId: sid(rec.departmentId),
      departmentName: rec.departmentName,
      storeId: sid(rec.storeId),
      storeName: rec.storeName,
      remarks: rec.remarks || "",
      preparedBy: rec.preparedBy || user?.name || "Admin",
    });
    
    const safeDetailsList = safeDetails(rec.details);
    const processedDetails = safeDetailsList.map((d, index) => ({
      ...d,
      _rowId: Date.now() + Math.random() + index,
      stkQty: d.stkQty || "0.000",
      stkRate: d.stkRate || "0.00",
      issueQty: d.issueQty || "0.000",
      rate: d.rate || "0.00",
      amount: d.amount || "0.00",
    }));
    
    setDetails(processedDetails);
    setEditId(rec.id);
    setView("form");
    setFormError(null);
    prevDetailsLengthRef.current = processedDetails.length;
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
            const gd = gDetails.find(d => 
              String(d.itemDescription || d.itemName).toLowerCase() === String(targetItem).toLowerCase() || 
              String(d.itemName).toLowerCase() === String(targetItem).toLowerCase()
            );
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

  function addRow() {
    setDetails(prev => [...prev, emptyDetail()]);
  }
  
  function removeRow(idx) {
    setDetails(prev => prev.filter((_, i) => i !== idx));
  }

  const handleSave = useCallback(async () => {
    if (!header.departmentId) {
      setFormError("Department is required");
      return;
    }
    if (!header.storeId) {
      setFormError("Store is required");
      return;
    }
    
    const hasValidRows = details.some(row => row.itemName && Number(row.issueQty) > 0);
    if (!hasValidRows) {
      setFormError("Add at least one item with quantity");
      return;
    }

    const confirmSave = window.confirm("Do you want to save this record?");
    if (!confirmSave) return;

    setFormError(null);
    setSaving(true);
    
    const cleanDetails = details
      .filter(d => d.itemName && Number(d.issueQty) > 0)
      .map(({ _rowId, ...rest }) => rest);
    
    const payload = { ...header, details: cleanDetails };
    
    try {
      if (editId) {
        await consumptionIssueApi.update(editId, payload);
      } else {
        await consumptionIssueApi.create(payload);
      }
      await loadData();
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
  }, [header, details, editId, loadData]);

  function printIssue() {
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const company = JSON.parse(localStorage.getItem("company") || "{}");

    const totals = details.reduce(
      (acc, r) => ({
        issueQty: acc.issueQty + Number(r.issueQty || 0),
        amount: acc.amount + Number(r.amount || 0),
      }),
      { issueQty: 0, amount: 0 },
    );

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
        ${details.map((d, i) => `<tr><td class="text-center">${i + 1}</td><td class="text-center">${esc(d.itemName)}</td><td class="text-center">${esc(d.grnNo)}</td><td class="text-right">${Number(d.issueQty).toFixed(2)}</td><td class="text-right">${Number(d.rate).toFixed(2)}</td><td class="text-right">${Number(d.amount).toFixed(2)}</td>`).join("")}
      </tbody>
      <tfoot><tr class="bold"><td colspan="3" class="text-right">TOTAL</td><td class="text-right">${totals.issueQty.toFixed(2)}</td><td class="text-right"></td><td class="text-right">₹${totals.amount.toFixed(2)}</td></tr></tfoot>
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

  // ─── Tab Index Calculation ───────────────────────────────────────────────────
  const getTabIndex = (rowIndex, fieldOffset, totalRows) => {
    const headerFieldsCount = 6;  // tabs 1-6 for header
    const fieldsPerRow = 8;       // Item, GRN, StkQty, StkRate, IssueQty, Rate, Remarks, Delete
    const rowStartTab = headerFieldsCount + (rowIndex * fieldsPerRow) + 1;
    return rowStartTab + fieldOffset;
  };

  const getAddButtonTabIndex = (totalRows) => {
    return 6 + (totalRows * 8) + 1;
  };

  const getViewListTabIndex = (totalRows) => {
    return getAddButtonTabIndex(totalRows) + 1;
  };

  const getSaveTabIndex = (totalRows) => {
    return getAddButtonTabIndex(totalRows) + 2;
  };

  const getPrintTabIndex = (totalRows) => {
    return getAddButtonTabIndex(totalRows) + 3;
  };

  const totalRows = details.length;
  const addButtonTabIndex = getAddButtonTabIndex(totalRows);
  const viewListTabIndex = getViewListTabIndex(totalRows);
  const saveTabIndex = getSaveTabIndex(totalRows);
  const printTabIndex = getPrintTabIndex(totalRows);

  // Focus on new row's Item field when a row is added
  useEffect(() => {
    if (prevDetailsLengthRef.current === undefined) {
      prevDetailsLengthRef.current = details.length;
      return;
    }
    
    const rowWasAdded = details.length > prevDetailsLengthRef.current;
    
    if (rowWasAdded && view === "form" && details.length > 0) {
      setTimeout(() => {
        const lastRowIndex = details.length - 1;
        const itemFieldTabIndex = getTabIndex(lastRowIndex, 0, details.length);
        const itemField = document.querySelector(`[tabIndex="${itemFieldTabIndex}"]`);
        if (itemField) {
          itemField.focus();
        }
      }, 100);
    }
    
    prevDetailsLengthRef.current = details.length;
  }, [details.length, view]);

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading && view === "list") return <div className="inv-empty">Loading...</div>;

  if (view === "list") {
    const filteredIssues = issues.filter(iss => 
      iss.issNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToExcel = () => {
      const headers = ["ISS No", "Date", "Department", "Store", "Total Items", "Total Qty", "Total Amount"];
      const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const rows = filteredIssues.map(rec => {
        let sd = safeDetails(rec.details);
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
            <button className="inv-btn-primary" onClick={openNew}>+ New Issue</button>
          </div>
        </div>

        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body" style={{ padding: "20px 16px" }}>
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
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Total Amt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length === 0 && (
                    <tr>
                      <td colSpan={9} className="inv-empty">No records found</td>
                    </tr>
                  )}
                  {filteredIssues.map((rec, i) => {
                    let safeDetailsList = safeDetails(rec.details);
                    const qty = safeDetailsList.reduce((s, d) => s + Number(d.issueQty || 0), 0);
                    const amt = safeDetailsList.reduce((s, d) => s + Number(d.amount || 0), 0);
                    return (
                      <tr key={rec.id}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{rec.issNo}</td>
                        <td>{rec.date}</td>
                        <td>{rec.departmentName}</td>
                        <td>{rec.storeName}</td>
                        <td className="inv-muted-sm">{safeDetailsList.length} items</td>
                        <td>{fmtQty(qty)}</td>
                        <td>₹{fmt(amt)}</td>
                        <td>
                          <div className="inv-actions">
                            <button className="inv-btn-icon" onClick={() => openEdit(rec)}>Edit</button>
                            <button className="inv-btn-icon inv-btn-danger" onClick={() => handleDelete(rec.id)}>Del</button>
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

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">{editId ? "Edit Consumption Issue" : "New Consumption Issue"}</h1>
          <p className="inv-page-sub">Issue materials from store to department</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            ref={viewListButtonRef}
            className="inv-btn-secondary" 
            onClick={() => {
              setFormError(null);
              setView("list");
            }}
            tabIndex={viewListTabIndex}
          >
            View List
          </button>
          <button 
            className="inv-btn-secondary" 
            onClick={printIssue} 
            tabIndex={printTabIndex}
          >
            Print
          </button>
          <button 
            ref={saveButtonRef}
            className="inv-btn-primary" 
            onClick={handleSave} 
            disabled={saving}
            tabIndex={saveTabIndex}
          >
            {saving ? "Saving..." : "Save Issue"}
          </button>
        </div>
      </div>

      {formError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Header Card */}
        <div className="inv-card" style={{ minHeight: "160px" }}>
          <div className="inv-card-body" style={{ padding: "24px" }}>
            <FormGrid>
              <Field label="ISS No (Auto)">
                <input 
                  className="inv-input" 
                  value={header.issNo} 
                  readOnly 
                  style={{ background: "#f8f9fa", color: "#4f46e5", fontWeight: 600 }} 
                  tabIndex={1} 
                />
              </Field>
              <Field label="Issue Date">
                <input 
                  className="inv-input" 
                  type="date" 
                  value={header.date} 
                  onChange={(e) => setHeader(h => ({ ...h, date: e.target.value }))} 
                  tabIndex={2} 
                />
              </Field>
              <Field label="Issue Type">
                <select 
                  className="inv-input" 
                  value={header.issueType} 
                  onChange={(e) => setHeader(h => ({ ...h, issueType: e.target.value }))} 
                  tabIndex={3}
                >
                  <option value="General">General</option>
                  <option value="Product">Product</option>
                </select>
              </Field>

              {header.issueType === "Product" && (
                <Field label="Item Description *">
                  <SearchSelect 
                    value={header.itemId}
                    onChange={(val) => {
                      const selectedItem = items.find(x => String(x.id) === val);
                      setHeader(h => ({ 
                        ...h, 
                        itemId: val,
                        itemName: selectedItem?.itemName || "",
                      }));
                    }}
                    options={sortedItemOptions}
                    placeholder="Search or select item description..."
                    tabIndex={4}
                  />
                </Field>
              )}
              
              <Field label="Department *">
                <SearchSelect 
                  value={header.departmentId} 
                  onChange={val => {
                    const d = departments.find(x => String(x.id) === val);
                    setHeader(h => ({ ...h, departmentId: val, departmentName: d?.name || "" }));
                  }}
                  options={sortedDepartmentOptions}
                  placeholder="Select department"
                  tabIndex={5}
                />
              </Field>
              <Field label="Store *">
                <SearchSelect 
                  value={header.storeId} 
                  onChange={val => {
                    const s = stores.find(x => String(x.id) === val);
                    setHeader(h => ({ ...h, storeId: val, storeName: s?.name || "" }));
                  }}
                  options={sortedStoreOptions}
                  placeholder="Select store"
                  tabIndex={6}
                />
              </Field>
            </FormGrid>
          </div>
        </div>

        {/* Items Table Card */}
        <div className="inv-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="inv-card-body" style={{ minHeight: "400px", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "16px 20px", background: "#fcfdfe", borderBottom: "1px solid #e2e8f0" }}>
              <button 
                ref={addButtonRef}
                className="inv-btn-primary inv-btn-sm" 
                onClick={addRow}
                tabIndex={addButtonTabIndex}
                style={{ borderRadius: 4 }}
              >
                + Add Row
              </button>              
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table-premium">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: "center" }}>#</th>
                    <th style={{ minWidth: 180, textAlign: "left" }}>Item *</th>
                    <th style={{ minWidth: 120, textAlign: "left" }}>GRN No</th>
                    <th style={{ width: 100, textAlign: "right" }}>Stk Qty</th>
                    <th style={{ width: 120, textAlign: "right" }}>Stk Unit Price</th>
                    <th style={{ width: 100, textAlign: "right" }}>Issue Qty *</th>
                    <th style={{ width: 100, textAlign: "right" }}>Unit Price</th>
                    <th style={{ width: 100, textAlign: "right" }}>Amount</th>
                    <th style={{ minWidth: 150, textAlign: "left" }}>Remarks</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => (
                    <tr key={row._rowId}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      
                      {/* Item - SearchSelect */}
                      <td>
                        <SearchSelect 
                          className="inv-select-cell"
                          style={{ minWidth: 180, width: "100%" }}
                          value={row.itemName} 
                          onChange={val => updateDetail(idx, "itemName", val)}
                          options={sortedTableItemOptions}
                          placeholder="Select Item"
                          tabIndex={getTabIndex(idx, 0, totalRows)}
                        />
                      </td>
                      
                      {/* GRN No - SearchSelect */}
                      <td>
                        <SearchSelect 
                          style={{ minWidth: 120, width: "100%" }}
                          value={row.grnNo} 
                          onChange={val => updateDetail(idx, "grnNo", val)}
                          options={sortedGrnOptions}
                          placeholder="Select GRN"
                          tabIndex={getTabIndex(idx, 1, totalRows)}
                        />
                      </td>
                      
                      {/* Stk Qty */}
                      <td>
                        <input 
                          type="number" 
                          step="0.001" 
                          className="inv-input-cell" 
                          style={{ width: "100%", textAlign: "right" }} 
                          value={row.stkQty} 
                          onChange={e => updateDetail(idx, "stkQty", e.target.value)}
                          onBlur={e => updateDetail(idx, "stkQty", Number(e.target.value || 0).toFixed(3))}
                          tabIndex={getTabIndex(idx, 2, totalRows)}
                        />
                      </td>
                      
                      {/* Stk Rate */}
                      <td>
                        <input 
                          type="number" 
                          className="inv-input-cell" 
                          style={{ width: "100%", textAlign: "right" }} 
                          value={row.stkRate} 
                          onChange={e => updateDetail(idx, "stkRate", e.target.value)}
                          tabIndex={getTabIndex(idx, 3, totalRows)}
                        />
                      </td>
                      
                      {/* Issue Qty */}
                      <td>
                        <input 
                          type="number" 
                          step="0.001" 
                          className="inv-input-cell" 
                          style={{ width: "100%", textAlign: "right", fontWeight: 600, color: "#3b6ef8" }} 
                          value={row.issueQty} 
                          onChange={e => updateDetail(idx, "issueQty", e.target.value)} 
                          onBlur={e => updateDetail(idx, "issueQty", Number(e.target.value || 0).toFixed(3))}
                          tabIndex={getTabIndex(idx, 4, totalRows)}
                        />
                      </td>
                      
                      {/* Unit Price */}
                      <td>
                        <input 
                          type="number" 
                          className="inv-input-cell" 
                          style={{ width: "100%", textAlign: "right" }} 
                          value={row.rate} 
                          onChange={e => updateDetail(idx, "rate", e.target.value)}
                          tabIndex={getTabIndex(idx, 5, totalRows)}
                        />
                      </td>
                      
                      {/* Amount */}
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {fmt(row.amount)}
                      </td>
                      
                      {/* Remarks */}
                      <td>
                        <input 
                          className="inv-input-cell" 
                          style={{ width: "100%" }} 
                          value={row.issueRemarks} 
                          onChange={e => updateDetail(idx, "issueRemarks", e.target.value)} 
                          placeholder="Notes..."
                          tabIndex={getTabIndex(idx, 6, totalRows)}
                        />
                      </td>
                      
                      {/* Remove Button */}
                      <td style={{ textAlign: "center" }}>
                        <button 
                          className="inv-btn-icon inv-btn-danger" 
                          onClick={() => removeRow(idx)} 
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#ef4444", padding: "4px" }}
                          tabIndex={getTabIndex(idx, 7, totalRows)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", fontWeight: 600 }}>
                    <td colSpan={5} style={{ textAlign: "right", padding: "10px" }}>Total</td>
                    <td style={{ textAlign: "right", padding: "10px" }}>{fmtQty(totals.issueQty)}</td>
                    <td style={{ textAlign: "right", padding: "10px" }}></td>
                    <td style={{ textAlign: "right", padding: "10px", fontWeight: 700, color: "#3b6ef8" }}>₹{fmt(totals.amount)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="inv-card">
          <div className="inv-card-body">
            <div style={{ display: "flex", gap: 40, padding: "10px 20px", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Line Items</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>{details.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Issue Qty</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#3b6ef8" }}>{fmtQty(totals.issueQty)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Amount</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>₹{fmt(totals.amount)}</div>
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Prepared By</label>
                  <input
                    className="inv-input"
                    value={header.preparedBy}
                    onChange={e => setHeader(h => ({ ...h, preparedBy: e.target.value }))}
                    placeholder="Preparer name"
                  />
                </div>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>General Remarks</label>
                  <textarea
                    className="inv-input"
                    style={{ height: 40, resize: "none", fontSize: "13px", padding: "12px" }}
                    value={header.remarks}
                    onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))}
                    placeholder="Enter any remarks..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {saveSuccessModal && (
        <Modal 
          title="Success" 
          onClose={() => {
            setSaveSuccessModal(false);
            setView("list");
          }} 
          onSave={() => {
            setSaveSuccessModal(false);
            setView("list");
          }} 
          saveLabel="Go to List"
        >
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 48, color: "#10b981" }}>✓</div>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Saved Successfully!</h3>
            <p style={{ color: "#64748b" }}>The Consumption Issue has been recorded.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
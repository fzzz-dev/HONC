import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { purchaseIndentApi, inventoryHeadApi, mainCategoryApi, itemApi, departmentApi } from "../../services/inventoryApi";
import Modal from "../../components/Modal";
import { SearchSelect } from "../../components/FormFields";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const getTodayDate = () => new Date().toISOString().split("T")[0];

const sid = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v.id || v._id || "");
  return String(v);
};
const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};
const safeDetails = (details) => {
  if (Array.isArray(details)) return details;
  if (typeof details === "string") { try { const p = JSON.parse(details); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
  return [];
};

const emptyDetail = () => ({
  _rowId: Math.random(), 
  mainCategoryId: "", 
  mainCategoryName: "",
  itemId: "", 
  itemName: "", 
  uom: "", 
  indentQty: "0.000", 
  dueDate: "", 
  remarks: ""
});

const emptyHeader = () => ({
  indentNo: "", 
  indentDate: getTodayDate(),
  date: getTodayDate(),
  departmentId: "", 
  departmentName: "", 
  createdBy: "Admin", 
  createdOn: getTodayDate(),
  status: "Open", 
  remarks: "",
  dueDate: getTodayDate(),
  preparedBy: ""
});

const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px" }}>{children}</div>
);

const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

export default function PurchaseIndentPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [heads, setHeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [indents, setIndents] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [company, setCompany] = useState(null);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [header, setHeader] = useState(emptyHeader());
  const [details, setDetails] = useState([emptyDetail()]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    loadLookups(); 
    loadIndents(); 
    openNew();
  }, []);

  useEffect(() => {
    const firstField = document.querySelector('[tabIndex="1"]');
    if (firstField) {
      firstField.focus();
    }
  }, []);

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

  async function loadLookups() {
    try {
      const [depts, headsData, catsData, itemsData, comp] = await Promise.all([
        departmentApi.getAll(), 
        inventoryHeadApi.getAll(), 
        mainCategoryApi.getAll(), 
        itemApi.getAll(),
        fetch((import.meta.env.VITE_API_URL || "/api") + "/company").then(res => res.json()).catch(() => null)
      ]);
      setDepartments(depts || []); 
      setHeads(headsData || []); 
      setCompany(comp);
      
      const mapped = Array.from(
        new Map(
          (catsData || []).map(c => [c.groupName, c])
        ).values()
      );
      setCategories(mapped);
      setItems((itemsData || []).map(it => ({ ...it, id: sid(it), headId: sid(it.headId), groupId: sid(it.groupId) })));
    } catch (e) { console.error(e); }
  }

  async function loadIndents() {
    setLoadingList(true); 
    try { 
      const data = await purchaseIndentApi.getAll(); 
      setIndents(Array.isArray(data) ? data : []); 
    } catch (e) { 
      setListError(e.message); 
    } finally { 
      setLoadingList(false); 
    }
  }

  async function openNew() {
    setHeader({ ...emptyHeader(), preparedBy: user?.name || "Admin" });
    setDetails([emptyDetail()]); 
    setEditId(null); 
    setView("form");
    try { 
      const { indentNo } = await purchaseIndentApi.getNextNumber(); 
      if (indentNo) setHeader(h => ({ ...h, indentNo })); 
    } catch (e) { }
  }

  function openEdit(indent) {
    setEditId(sid(indent));
    
    setHeader({
      ...indent,
      departmentId: sid(indent.departmentId),
      preparedBy: indent.preparedBy || indent.createdBy || user?.name || "Admin",
      indentDate: indent.indentDate || indent.date || getTodayDate(),
      dueDate: indent.dueDate || getTodayDate(),
      createdBy: indent.createdBy || user?.name || "Admin"
    });
    
    const safeDetailsList = safeDetails(indent.details);
    setDetails(safeDetailsList.map(d => ({
      ...d, 
      _rowId: Math.random(), 
      mainCategoryId: sid(d.mainCategoryId), 
      itemId: sid(d.itemId),
      mainCategoryName: d.mainCategoryName || "",
      itemName: d.itemName || "",
      uom: d.uom || "",
      indentQty: d.indentQty || "0.000",
      dueDate: d.dueDate || indent.dueDate || getTodayDate(),
      remarks: d.remarks || ""
    })));
    setView("form");
  }

  function updateDetail(idx, field, val) {
    setDetails(prev => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };
      if (field === "mainCategoryId") {
        const found = categories.find(c => sid(c) === val);
        row.mainCategoryName = found?.groupName || ""; 
        row.itemId = ""; 
        row.itemName = ""; 
        row.uom = "";
      }
      if (field === "itemId") {
        const found = items.find(it => sid(it) === val);
        row.itemName = (found?.itemDescription || found?.itemName || ""); 
        row.uom = found?.uom || "";
      }
      rows[idx] = row;
      return rows;
    });
  }

  function addRow() { 
    setDetails(p => [...p, emptyDetail()]);
    setTimeout(() => {
      const categoryElements = document.querySelectorAll('.category-select');
      const lastCategory = categoryElements[categoryElements.length - 1];
      if (lastCategory) {
        lastCategory.focus();
      }
    }, 100);
  }
  
  function removeRow(idx) { 
    setDetails(p => p.filter((_, i) => i !== idx)); 
  }

  const handleSave = useCallback(async () => {
    if (!header.indentNo.trim()) return setFormError("Indent No is required");
    if (!header.departmentId) return setFormError("Department is required");

    for (const row of details) {
      if (row.mainCategoryId === "" || row.mainCategoryId === null) {
        return setFormError("Category is required");
      }
      if (row.itemId === "" || row.itemId === null) {
        return setFormError("Item Description is required");
      }
      if (row.indentQty === "" || row.indentQty === null || Number(row.indentQty) <= 0) {
        return setFormError("Indent Qty is required");
      }
    }
        
    const confirmSave = window.confirm("Do you want to save this record?");
    if (!confirmSave) return;

    setFormError("");
    setSaving(true);
    
    const cleanDetails = details.filter(d => d.itemId).map(({ _rowId, ...rest }) => {
      if (!rest.dueDate && header.dueDate) {
        rest.dueDate = header.dueDate;
      }
      return rest;
    });
    
    if (cleanDetails.length === 0) { 
      setSaving(false); 
      return setFormError("Add at least one item"); 
    }
    
    const payload = { 
      ...header, 
      indentDate: header.indentDate,
      date: header.indentDate,
      dueDate: header.dueDate,
      details: cleanDetails 
    };
    
    console.log("Saving payload:", payload);
    
    try {
      if (editId) {
        await purchaseIndentApi.update(editId, payload);
      } else {
        await purchaseIndentApi.create(payload);
      }
      await loadIndents();
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
  }, [header, details, editId]);

  useEffect(() => {
    const listener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (view !== "list") {
          handleSave();
        }
      }
    };  
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [handleSave, view]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this indent?")) return;
    try { 
      await purchaseIndentApi.remove(id); 
      await loadIndents(); 
    } catch (err) { 
      alert(err.message); 
    }
  }

  const syncDueDateToAllRows = (newDueDate) => {
    setDetails(prev => prev.map(row => ({
      ...row,
      dueDate: newDueDate
    })));
  };

  const totalQty = details.reduce((s, r) => s + Number(r.indentQty || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === "list") {
    const filteredIndents = indents.filter(ind => ind.indentNo?.toLowerCase().includes(searchTerm.toLowerCase()));

    const exportToExcel = () => {
      const headers = ["Indent No", "Date", "Department", "Requested By", "Status", "Total Items", "Total Qty"];
      const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      const rows = filteredIndents.map(ind => {
        const totalItems = safeDetails(ind.details).length;
        const totalQtyVal = safeDetails(ind.details).reduce((s, d) => s + Number(d.indentQty || 0), 0);
        return [ind.indentNo, ind.indentDate || ind.date, ind.departmentName, ind.createdBy, ind.status, totalItems, totalQtyVal].map(escapeCsv).join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "purchase_indents.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Purchase Indents</h1>
            <p className="inv-page-sub">Manage material indent requests</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={exportToExcel}>Export to Excel</button>
            <button className="inv-btn-primary" onClick={openNew}>+ New Indent</button>
          </div>
        </div>

        {listError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{listError}</div>}

        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body">
            <div className="inv-field" style={{ minWidth: 400, maxWidth: 400 }}>
              <label className="inv-label">Search Indent No</label>
              <input
                className="inv-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Type to search Indent Number..."
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
                    <th>Indent No</th>
                    <th>Date</th>
                    <th>Department</th>
                    <th>Requested By</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIndents.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 40 }}>No records found</td>
                    </tr>
                  ) : (
                    filteredIndents.map((indent, i) => (
                      <tr key={sid(indent)}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{indent.indentNo}</td>
                        <td>{indent.indentDate || indent.date}</td>
                        <td>{indent.departmentName}</td>
                        <td>{indent.createdBy}</td>
                        <td className="inv-muted-sm">{safeDetails(indent.details).length} lines</td>
                        <td>{fmt(safeDetails(indent.details).reduce((s, d) => s + Number(d.indentQty || 0), 0))}</td>
                        <td>
                          <span className={`inv-badge ${indent.status === 'Open' ? 'inv-badge-yes' : 'inv-badge-no'}`}>
                            {indent.status}
                          </span>
                        </td>
                        <td className="inv-actions-cell">
                          <div className="inv-actions">
                            <button 
                              className="inv-btn-icon" 
                              onClick={() => openEdit(indent)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button 
                              className="inv-btn-icon inv-btn-danger" 
                              onClick={() => handleDelete(sid(indent))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
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

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">{editId ? "Edit Purchase Indent" : "New Purchase Indent"}</h1>
          <p className="inv-page-sub">Header-Detail-Summary layout</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            className="inv-btn-secondary" 
            onClick={() => {
              setFormError("");
              setView("list");
            }}
            tabIndex={100}
          >
            View List
          </button>
          <button 
            className="inv-btn-primary" 
            onClick={handleSave} 
            disabled={saving}
            tabIndex={101}
          >
            {saving ? "Saving..." : "Save Indent"}
          </button>
        </div>
      </div>

      {formError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Header Card */}
        <div className="inv-card">
          <div className="inv-card-body">
            <FormGrid>
              <Field label="Indent No (Auto)">
                <input 
                  className="inv-input" 
                  value={header.indentNo} 
                  readOnly 
                  style={{ background: "#f8f7ff", color: "#4f46e5", fontWeight: 600 }} 
                />
              </Field>
              
              <Field label="Indent Date *">
                <input 
                  className="inv-input"
                  tabIndex={1}
                  type="date"  
                  min="2026-05-01"
                  value={header.indentDate || getTodayDate()}
                  onChange={e => {
                    const selectedDate = e.target.value;
                    const minDate = "2026-05-01";
                    if (selectedDate < minDate) {
                      setHeader(h => ({ ...h, indentDate: minDate, indentDateError: "Past dates are not allowed." }));
                    } else {
                      setHeader(h => ({ ...h, indentDate: selectedDate, indentDateError: "" }));
                    }
                  }}
                />
                {header.indentDateError && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                    ⚠️ {header.indentDateError}
                  </div>
                )}
              </Field>

              <Field label="Due Date *">
                <input 
                  className="inv-input"
                  tabIndex={2}
                  type="date"  
                  min="2026-05-01"
                  value={header.dueDate || getTodayDate()}
                  onChange={e => {
                    const selectedDate = e.target.value;
                    const minDate = "2026-05-01";
                    if (selectedDate < minDate) {
                      setHeader(h => ({ ...h, dueDate: minDate, dueDateError: "Past dates are not allowed." }));
                    } else {
                      setHeader(h => ({ ...h, dueDate: selectedDate, dueDateError: "" }));
                      syncDueDateToAllRows(selectedDate);
                    }
                  }}
                />
                {header.dueDateError && (
                  <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                    ⚠️ {header.dueDateError}
                  </div>
                )}
              </Field>
              
              <Field label="Department *">
                <SearchSelect
                  className="department-select"
                  tabIndex={3}
                  style={{ width: "100%" }}
                  value={header.departmentId}
                  onChange={(val) => {
                    const d = departments.find(x => sid(x) === val);
                    setHeader(h => ({
                      ...h,
                      departmentId: val,
                      departmentName: toTitleCase(d?.name || d?.departmentName || "")
                    }));
                  }}
                  options={departments.map(d => ({ 
                    value: sid(d), 
                    label: d.name || d.departmentName 
                  }))}
                  placeholder="Select Department"
                  menuPortalTarget={document.body}
                />
              </Field>
              
              <Field label="Requested By">
                <input 
                  tabIndex={4} 
                  className="inv-input" 
                  value={header.createdBy} 
                  onChange={e => setHeader(h => ({ ...h, createdBy: e.target.value }))} 
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
                className="inv-btn-primary inv-btn-sm" 
                onClick={addRow}
                tabIndex={99}
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
                    <th style={{ minWidth: 200 }}>Category *</th>
                    <th style={{ minWidth: 200 }}>Item Description *</th>
                    <th style={{ width: 80, textAlign: "center" }}>UOM</th>
                    <th style={{ width: 100, textAlign: "right" }}>Qty *</th>
                    <th style={{ width: 140 }}>Due Date</th>
                    <th style={{ minWidth: 200 }}>Remarks</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => {
                    const filteredItems = row.mainCategoryName ? items.filter(it => it.group === row.mainCategoryName) : [];
                    const baseTab = 5 + (idx * 7);
                    
                    return (
                      <tr key={row._rowId}>
                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                        
                        <td style={{ minWidth: "180px" }}>
                          <SearchSelect
                            tabIndex={baseTab}
                            className="inv-select-cell category-select"
                            style={{ padding: 0, border: "none", width: "100%" }}
                            value={row.mainCategoryId}
                            onChange={val => updateDetail(idx, "mainCategoryId", val)}
                            options={categories.map(c => ({ value: sid(c), label: c.groupName }))}
                            placeholder="Select Category"
                            menuPortalTarget={document.body}
                          />
                        </td>
                        
                        <td style={{ minWidth: "220px" }}>
                          <SearchSelect
                            tabIndex={baseTab + 1}
                            className="inv-select-cell"
                            style={{ padding: 0, border: "none", width: "100%" }}
                            value={row.itemId}
                            onChange={val => updateDetail(idx, "itemId", val)}
                            options={filteredItems.map(it => ({ value: sid(it), label: it.itemDescription || it.itemName }))}
                            placeholder={row.mainCategoryId ? "Select Item" : "Select Category First"}
                            disabled={!row.mainCategoryId}
                            menuPortalTarget={document.body}
                          />
                        </td>
                        
                        <td style={{ width: "80px" }}>
                          <input 
                            className="inv-input-cell" 
                            value={row.uom} 
                            readOnly 
                            style={{ textAlign: "center" }}
                            tabIndex={baseTab + 2}
                          />
                        </td>
                        
                        <td style={{ width: "100px" }}>
                          <input 
                            className="inv-input-cell" 
                            type="number" 
                            step="0.001" 
                            value={row.indentQty} 
                            onChange={e => updateDetail(idx, "indentQty", e.target.value)} 
                            onBlur={e => updateDetail(idx, "indentQty", Number(e.target.value || 0).toFixed(3))} 
                            style={{ textAlign: "right", fontWeight: 600, color: "#3b6ef8" }} 
                            tabIndex={baseTab + 3}
                          />
                        </td>
                        
                        <td style={{ width: "140px" }}>
                          <input 
                            className="inv-input-cell"  
                            type="date" 
                            min={getTodayDate()}  
                            value={row.dueDate || header.dueDate}
                            onChange={e => {
                              updateDetail(idx, "dueDate", e.target.value);
                            }}
                            tabIndex={baseTab + 4}
                          />
                        </td>
                        
                        <td style={{ minWidth: "200px" }}>
                          <input 
                            className="inv-input-cell" 
                            value={row.remarks} 
                            onChange={e => updateDetail(idx, "remarks", e.target.value)} 
                            placeholder="Notes..." 
                            tabIndex={baseTab + 5}
                          />
                        </td>
                        
                        <td style={{ textAlign: "center", width: "50px" }}>
                          <button 
                            className="inv-btn-icon inv-btn-danger" 
                            onClick={() => removeRow(idx)} 
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#ef4444", padding: "4px" }}
                            tabIndex={baseTab + 6}
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

        {/* Summary Card */}
        <div className="inv-card">
          <div className="inv-card-body">
            <div style={{ display: "flex", gap: 40, padding: "10px 20px", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Line Items</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>{details.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Indent Qty</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#3b6ef8" }}>{fmtQty(totalQty)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Status</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{header.status}</div>
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
                    placeholder="Name of preparer"
                    tabIndex={-1}
                  />
                </div>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Indent Remarks</label>
                  <textarea
                    className="inv-input"
                    style={{ height: 40, resize: "none", fontSize: "13px", padding: "12px" }}
                    value={header.remarks || ""}
                    onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))}
                    placeholder="Enter any remarks..."
                    tabIndex={-1}
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
            <p style={{ color: "#64748b" }}>The Purchase Indent has been recorded.</p>
          </div>
        </Modal>
      )}
    </div>
  );
} 
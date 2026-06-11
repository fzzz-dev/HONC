import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import * as XLSX from 'xlsx';

import {
  openingStockApi,
  inventoryHeadApi,
  mainCategoryApi,
  itemApi,
  storeApi, // Add this import
} from "../../services/inventoryApi";
import { SearchSelect } from "../../components/FormFields";

const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(),
  headId: "",           // Head ID (from inventoryHeadApi)
  headName: "",         // Head Name
  categoryId: "",       // Category ID (from mainCategoryApi)
  categoryName: "",     // Category Name (groupName)
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
  const [heads, setHeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]); // Add stores state
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const bulkFileRef = useRef();

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
      const [recData, headsData, catsData, itemData, storesData] = await Promise.all([
        openingStockApi.getAll(),
        inventoryHeadApi.getAll(),
        mainCategoryApi.getAll(),
        itemApi.getAll(),
        storeApi.getAll(), // Load stores
      ]);
      setRecords(recData?.data || recData || []);
      
      // Normalize stores
      const normalizedStores = (storesData?.data || storesData || []).map(s => ({
        ...s,
        id: String(s.id || s._id),
        name: s.name || s.storeName
      }));
      setStores(normalizedStores);
      
      // Normalize heads
      const normalizedHeads = (headsData?.data || headsData || []).map(h => ({
        ...h,
        id: String(h.id || h._id),
        headName: h.headName
      }));
      setHeads(normalizedHeads);
      
      // Normalize categories
      const normalizedCats = (catsData?.data || catsData || []).map(c => ({
        ...c,
        id: String(c.id || c._id),
        headId: String(c.headId?.id || c.headId?._id || c.headId || ""),
        groupName: c.groupName
      }));
      setCategories(normalizedCats);
      
      // Normalize items
      const normalizedItems = (itemData?.data || itemData || []).map(it => ({
        ...it,
        id: String(it.id || it._id),
        headId: String(it.headId?.id || it.headId?._id || it.headId || ""),
        itemName: it.itemName,
        itemDescription: it.itemDescription || it.itemName,
        rate: it.rate || it.purchaseRate || 0
      }));
      setItems(normalizedItems);
      
    } catch (err) {

    } finally {
      setLoading(false);
    }
  }, []);

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
      const res = await openingStockApi.getNextNumber();
      nextNo = res?.openingNo || "";
    } catch (err) {

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

      if (field === "headId") {
        const head = heads.find(h => String(h.id) === val);
        row.headName = head?.headName || "";
        row.categoryId = "";
        row.categoryName = "";
        row.itemId = "";
        row.itemName = "";
        row.rate = "0.00";
        row.qty = "0.000";
        row.amount = "0.00";
      }
      
      if (field === "categoryId") {
        const cat = categories.find(c => String(c.id) === val);
        row.categoryName = cat?.groupName || "";
        row.itemId = "";
        row.itemName = "";
        row.rate = "0.00";
        row.qty = "0.000";
        row.amount = "0.00";
      }
      
      if (field === "itemId") {
        const it = items.find(i => String(i.id) === val);
        row.itemName = it?.itemDescription || it?.itemName || "";
        row.rate = it?.rate || "0.00";
        const qty = Number(row.qty) || 0;
        const rate = Number(row.rate) || 0;
        row.amount = (qty * rate).toFixed(2);
      }

      if (field === "qty") {
        const qty = Number(val) || 0;
        const rate = Number(row.rate) || 0;
        row.qty = val;
        row.amount = (qty * rate).toFixed(2);
      }

      if (field === "rate") {
        const qty = Number(row.qty) || 0;
        const rate = Number(val) || 0;
        row.rate = val;
        row.amount = (qty * rate).toFixed(2);
      }

      rows[idx] = row;
      return rows;
    });
  }

  async function handleBulkImport(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const excelData = XLSX.utils.sheet_to_json(worksheet);
      
      if (!excelData || excelData.length === 0) {
        alert("No data found in Excel file");
        return;
      }
      
      const newDetails = [];
      let skippedCount = 0;
      let rowNumber = 0;
      
      for (const row of excelData) {
        rowNumber++;
        
        const headName = row.Head || row["Head"];
        const categoryName = row.Category || row["Category"];
        const itemName = row["Item"] || row["Item Name"] || row["Item Description"] || row.Description;
        const qty = parseFloat(row["Phy Qty"] || row["PhyQty"] || row["Physical Qty"] || row["Qty"] || row["Quantity"] || 0);
        const rate = parseFloat(row["Phy Rate"] || row["PhyRate"] || row["Physical Rate"] || row["Rate"] || row["Unit Price"] || 0);
        
        if (!headName || !categoryName || !itemName) {

          skippedCount++;
          continue;
        }
        
        const head = heads.find(h => 
          h.headName?.toLowerCase() === headName.toLowerCase()
        );
        
        if (!head) {

          skippedCount++;
          continue;
        }
        
        const category = categories.find(c => 
          String(c.headId) === String(head.id) &&
          c.groupName?.toLowerCase() === categoryName.toLowerCase()
        );
        
        if (!category) {

          skippedCount++;
          continue;
        }
        
        const item = items.find(i => 
          String(i.headId) === String(head.id) &&
          (i.itemDescription?.toLowerCase() === itemName.toLowerCase() ||
           i.itemName?.toLowerCase() === itemName.toLowerCase())
        );
        
        if (!item) {

          skippedCount++;
          continue;
        }
        
        newDetails.push({
          _rowId: Date.now() + Math.random() + newDetails.length,
          headId: String(head.id),
          headName: head.headName,
          categoryId: String(category.id),
          categoryName: category.groupName,
          itemId: String(item.id),
          itemName: item.itemDescription || item.itemName,
          qty: isNaN(qty) ? "0.000" : qty.toFixed(3),
          rate: isNaN(rate) ? (item.rate || "0.00") : rate.toFixed(2),
          amount: isNaN(qty) || isNaN(rate) 
            ? "0.00" 
            : (qty * (isNaN(rate) ? (item.rate || 0) : rate)).toFixed(2)
        });
      }
      
      if (newDetails.length === 0) {
        alert(`No valid records found to import. ${skippedCount} rows were skipped.`);
        return;
      }
      
      setDetails(newDetails);
      alert(`Successfully imported ${newDetails.length} items in Excel order. ${skippedCount} rows skipped.`);
      
    } catch (err) {

      alert("Failed to import Excel file: " + err.message);
    }
  }

  async function handleSave() {
    // Validate store is selected
    if (!header.storeId) {
      alert("Please select a store");
      return;
    }
    
    // Validate at least one detail row
    if (!details || details.length === 0) {
      alert("Please add at least one item");
      return;
    }
    
    // Validate all required fields in details
    const invalidRows = details.filter(row => !row.headId || !row.categoryId || !row.itemId);
    if (invalidRows.length > 0) {
      alert(`Please fill all required fields (Head, Category, Item) for ${invalidRows.length} row(s)`);
      return;
    }
    
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
      alert(err.message || "Error saving opening stock");
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
          <div className="inv-card-body" style={{ padding: "20px 16px" }}>
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
          <button className="inv-btn-secondary" tabIndex={101} onClick={() => setView("list")}>View List</button>
          <button className="inv-btn-primary" tabIndex={100} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Entry"}</button>
        </div>
      </div>

      <div className="inv-card" style={{ minHeight: "160px" }}>
        <div className="inv-card-body" style={{ padding: "24px" }}>
          <FormGrid>
            <Field label="Opening No (Auto)">
              <input className="inv-input" tabIndex={1} value={header.openingNo} readOnly style={{ background: "#f8f9fa", color: "#4f46e5", fontWeight: 600 }} />
            </Field>
            <Field label="Entry Date">
              <input className="inv-input" tabIndex={2} type="date" value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} />
            </Field>
            <Field label="As On Date">
              <input className="inv-input" tabIndex={3} type="date" value={header.asOnDate} onChange={e => setHeader(h => ({ ...h, asOnDate: e.target.value }))} />
            </Field>
            
            {/* ADD STORE SELECTION FIELD */}
            <Field label="Store *">
              <SearchSelect 
                tabIndex={4}
                value={header.storeId} 
                onChange={(val) => {
                  const selectedStore = stores.find(s => String(s.id) === val);
                  setHeader(h => ({ 
                    ...h, 
                    storeId: val,
                    storeName: selectedStore?.name || ""
                  }));
                }}
                options={stores.map(s => ({ 
                  value: String(s.id), 
                  label: s.name 
                }))}
                placeholder="Select Store"
              />
            </Field>
          </FormGrid>
        </div>
      </div>

      <div className="inv-card" style={{ minHeight: "450px" }}>
        <div className="inv-card-body">
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: 10 }}>
            <button className="inv-btn-secondary inv-btn-sm" tabIndex={99} onClick={() => setDetails(p => [...p, emptyDetail()])}>+ Add Row</button>
            <button className="inv-btn-primary inv-btn-sm" tabIndex={98} onClick={() => bulkFileRef.current?.click()}>Bulk Upload</button>
            <input
              ref={bulkFileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleBulkImport}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Head *</th>
                  <th>Category *</th>
                  <th>Item Description *</th>
                  <th style={{ width: 120 }}>Qty *</th>
                  <th style={{ width: 120 }}>Unit Price</th>
                  <th style={{ width: 140 }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => {
                  const baseTab = 10 + (idx * 7);
                  
                  const filteredCategories = row.headId 
                    ? categories.filter(c => String(c.headId) === String(row.headId))
                    : [];
                  
                  const filteredItems = row.headId 
                    ? items.filter(i => String(i.headId) === String(row.headId))
                    : [];
                  
                  return (
                    <tr key={row._rowId}>
                      <td>{idx + 1}</td>
                      
                      <td style={{ minWidth: "180px" }}>
                        <SearchSelect 
                          tabIndex={baseTab}
                          style={{ minWidth: 180, border: "none" }}
                          value={row.headId} 
                          onChange={val => updateDetail(idx, "headId", val)}
                          options={heads.map(h => ({ 
                            value: String(h.id), 
                            label: h.headName 
                          }))}
                          placeholder="Select Head"
                        />
                      </td>
                      
                      <td style={{ minWidth: "180px" }}>
                        <SearchSelect 
                          tabIndex={baseTab + 1}
                          style={{ minWidth: 180, border: "none" }}
                          value={row.categoryId} 
                          onChange={val => updateDetail(idx, "categoryId", val)}
                          options={filteredCategories.map(c => ({ 
                            value: String(c.id), 
                            label: c.groupName 
                          }))}
                          placeholder={row.headId ? "Select Category" : "Select Head First"}
                          disabled={!row.headId}
                        />
                      </td>
                      
                      <td style={{ minWidth: "250px" }}>
                        <SearchSelect 
                          tabIndex={baseTab + 2}      
                          style={{ minWidth: 250, border: "none" }}
                          value={row.itemId} 
                          onChange={val => updateDetail(idx, "itemId", val)}
                          options={filteredItems.map(i => ({ 
                            value: String(i.id), 
                            label: i.itemDescription || i.itemName 
                          }))}
                          placeholder={row.headId ? "Select Item" : "Select Head First"}
                          disabled={!row.headId}
                        />
                      </td>
                      
                      <td>
                        <input 
                          type="number" 
                          step="1.00" 
                          className="inv-input" 
                          tabIndex={baseTab + 3} 
                          style={{ border: "none", width: "100%" }} 
                          value={row.qty} 
                          onChange={e => updateDetail(idx, "qty", e.target.value)} 
                          onBlur={e => updateDetail(idx, "qty", Number(e.target.value || 0).toFixed(3))} 
                        />
                      </td>
                      
                      <td>
                        <input 
                          type="number" 
                          step="1.00" 
                          className="inv-input" 
                          tabIndex={baseTab + 4} 
                          style={{ border: "none", width: "100%" }} 
                          value={row.rate} 
                          onChange={e => updateDetail(idx, "rate", e.target.value)} 
                        />
                      </td>
                      
                      <td style={{ textAlign: "right" }}>{fmt(row.amount)}</td>
                      
                      <td>
                        <button 
                          className="inv-btn-icon inv-btn-danger" 
                          tabIndex={baseTab + 5} 
                          onClick={() => setDetails(p => p.filter((_, i) => i !== idx))}
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

      <div className="inv-card" style={{ marginTop: 20, minHeight: "120px" }}>
        <div className="inv-card-body" style={{ padding: "24px" }}>
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
              <input 
                className="inv-input" 
                value={header.preparedBy} 
                onChange={e => setHeader(h => ({ ...h, preparedBy: e.target.value }))} 
                placeholder="Prepared By" 
              />
            </div>
          </div>
          <div className="inv-field-v" style={{ marginTop: 16 }}>
            <textarea 
              className="inv-input" 
              style={{ height: 40, resize: "none" }} 
              value={header.remarks} 
              onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))} 
              placeholder="Remarks..." 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
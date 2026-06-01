import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { purchaseOrderApi } from "../../services/inventoryApi";

const fmt = (n) => {
  const num = Number(n);
  if (isNaN(num) || n === null || n === undefined) {
    return "0.00";
  }
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtQty = (n) => {
  const num = Number(n);
  if (isNaN(num) || n === null || n === undefined) {
    return "0";
  }
  return num.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

export default function POLevel2Pending() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedPOs, setSelectedPOs] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showApproved, setShowApproved] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const tableBodyRef = useRef(null);

  // Fetch data
const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    let response;
    if (showApproved) {
      response = await purchaseOrderApi.getAll();
      const data = response?.data || response || [];
      const filtered = data.filter(po => po.level2Approved === "Yes");
      
      const grouped = {};
      filtered.forEach(po => {
        let itemsTotal = 0;
        let totalQty = 0;
        const items = [];
        
        if (po.details && Array.isArray(po.details)) {
          po.details.forEach(item => {
            const itemTotal = Number(item.totalAmount) || 0;
            itemsTotal += itemTotal;
            totalQty += Number(item.poQty) || 0;
            items.push({
              indentNo: item.indentNo,
              itemId: item.itemId,
              itemName: item.itemName,
              uom: item.uom,
              poQty: item.poQty,
              poRate: item.poRate,
              poAmount: item.poAmount,
              discPrice: item.discPrice,
              totGst: item.totGst,
              gstPct: item.gstPct,
              sgst: item.sgst,
              cgst: item.cgst,
              igst: item.igst,
              totalAmount: itemTotal
            });
          });
        }
        
        grouped[po.id] = {
          id: po.id,
          poNo: po.poNo,
          poDate: po.date,
          supplier: po.supplierName,
          supplierId: po.supplierId,
          deliveryDate: po.deliveryDate,
          poType: po.poType,
          level2Approved: po.level2Approved,
          level2ApprovedBy: po.level2ApprovedBy,
          level2ApprovedDate: po.level2ApprovedDate,
          totalQty: totalQty,
          totalAmount: itemsTotal,
          totalItems: po.details?.length || 0,
          items: items,
          gstType: po.gstType || "local"
        };
      });
      setReportData(Object.values(grouped));
    } else {
      response = await purchaseOrderApi.getLevel2Pending();
      const data = response?.data || response || [];
      
      const grouped = data.map(po => ({
        id: po.id,
        poNo: po.ponumber,
        poDate: po.podate,
        supplier: po.supplier,
        supplierId: po.supplierId,
        deliveryDate: po.deliverydate,
        poType: po.potype,
        level2Approved: po.level2Approved,
        level2ApprovedBy: po.level2ApprovedBy,
        level2ApprovedDate: po.level2ApprovedDate,
        totalQty: po.items?.reduce((sum, item) => sum + (Number(item.poQty) || 0), 0) || 0,
        totalAmount: po.items?.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0) || 0,
        totalItems: po.items?.length || 0,
        items: (po.items || []).map(item => ({
          indentNo: item.indentNo,
          itemId: item.itemId,        // ← ADD THIS - CRITICAL
          itemName: item.itemName,
          uom: item.uom,
          poQty: item.poQty,
          poRate: item.poRate,
          poAmount: item.poAmount,
          discPrice: item.discPrice,
          totGst: item.totGst,
          gstPct: item.gstPct,
          sgst: item.sgst,
          cgst: item.cgst,
          igst: item.igst,
          totalAmount: item.totalAmount
        })),
        gstType: po.gstType || "local"
      }));
      setReportData(grouped);
    }
  } catch (err) {
    console.error(err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchData();
  }, [showApproved]);

  const toggleExpand = (poId) => {
    setExpandedRows(prev => ({ ...prev, [poId]: !prev[poId] }));
  };

  const handleBulkApprove = async () => {
    if (selectedPOs.size === 0) {
      setToast({ message: "Select at least one PO", type: "error" });
      return;
    }
    if (!window.confirm(`Approve ${selectedPOs.size} PO(s) for Level 2?`)) return;

    setBulkApproving(true);
    try {
      const userStr = localStorage.getItem('honc_user');
      let approvedBy = "System";
      
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          approvedBy = `${userData.username || userData.name || 'User'} (${userData.role || 'No Role'})`;
        } catch (e) {
          approvedBy = "System";
        }
      }
      
      const response = await purchaseOrderApi.bulkApproveLevel2(Array.from(selectedPOs), approvedBy);
      if (response.success) {
        setToast({ message: response.message, type: "success" });
        setSelectedPOs(new Set());
        await fetchData();
      } else {
        setToast({ message: response.message || "Approval failed", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setBulkApproving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedPOs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPOs(newSet);
  };

  const toggleAll = () => {
    if (selectedPOs.size === filteredData.length) {
      setSelectedPOs(new Set());
    } else {
      setSelectedPOs(new Set(filteredData.map(p => p.id)));
    }
  };
const handlePOClick = (po) => {
  const mappedPO = {
    id: po.id,
    poNo: po.poNo,
    ponumber: po.poNo,
    date: po.poDate,
    podate: po.poDate,
    supplierName: po.supplier,
    supplier: po.supplier,
    supplierId: po.supplierId,
    deliveryDate: po.deliveryDate,
    poType: po.poType,
    status: "Open",
    level1Approved: "No",
    level2Approved: po.level2Approved,
    level2ApprovedBy: po.level2ApprovedBy,
    level2ApprovedDate: po.level2ApprovedDate,
    gstType: po.gstType || "local",
    gstEnabled: true,
    details: (po.items || []).map(item => ({
      indentNo: item.indentNo || "",
      itemId: item.itemId || "",      // ← ADD THIS - CRITICAL
      itemName: item.itemName || "",
      uom: item.uom || "",
      poQty: Number(item.poQty) || 0,
      poRate: Number(item.poRate) || 0,
      poAmount: Number(item.poAmount) || 0,
      discPrice: Number(item.discPrice) || 0,
      discPct: Number(item.discPct) || 0,
      discMode: item.discMode || "pct",
      gstPct: Number(item.gstPct) || 0,
      sgst: Number(item.sgst) || 0,
      cgst: Number(item.cgst) || 0,
      igst: Number(item.igst) || 0,
      totGst: Number(item.totGst) || 0,
      totalAmount: Number(item.totalAmount) || 0
    }))
  };
  
  navigate("/purchase-order", { 
    state: { 
      po: mappedPO,
      editMode: true 
    } 
  });
};

const filteredData = useMemo(() => {
  if (!searchTerm.trim()) return reportData;
  
  const term = searchTerm.toLowerCase();
  return reportData.filter(po => {
    // Check PO Number
    const matchPoNo = (po.poNo || "").toLowerCase().includes(term);
    
    // Check Supplier Name
    const matchSupplier = (po.supplier || po.supplierName || "").toLowerCase().includes(term);
    
    // Check Items (Indent No and Item Name only)
    const matchItems = (po.items || []).some(item => 
      (item.indentNo || "").toLowerCase().includes(term) ||
      (item.itemName || "").toLowerCase().includes(term)
    );
    
    // Only return true if matches PO Number, Supplier, or Items
    return matchPoNo || matchSupplier || matchItems;
  });
}, [reportData, searchTerm]);

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1>PO Level 2 {showApproved ? "Approved" : "Pending"} (First Approval)</h1>
          <p>{showApproved ? "View approved POs" : "First level approval before Level 1"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => navigate("/purchase-order")}>← Back</button>
        </div>
      </div>

      {toast && (
        <div style={{ 
          position: "fixed", top: 20, right: 20, 
          background: toast.type === "error" ? "#ef4444" : "#10b981", 
          color: "white", padding: 12, borderRadius: 8, zIndex: 9999 
        }}>
          {toast.message}
        </div>
      )}

      {/* Toggle Buttons */}
      <div className="inv-card" style={{ marginBottom: 16 }}>
        <div className="inv-card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={() => setShowApproved(false)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "1px solid #3b6ef8",
                background: !showApproved ? "#3b6ef8" : "white",
                color: !showApproved ? "white" : "#3b6ef8",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              PO Pending List
            </button>
            <button
              onClick={() => setShowApproved(true)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "1px solid #3b6ef8",
                background: showApproved ? "#3b6ef8" : "white",
                color: showApproved ? "white" : "#3b6ef8",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              PO Approved List
            </button>
          </div>
          <div>
            <span className="inv-badge" style={{ background: showApproved ? "#10b981" : "#f59e0b", color: "white" }}>
              {showApproved ? `✓ ${filteredData.length} Approved` : `${filteredData.length} Pending`}
            </span>
          </div>
        </div>
      </div>

      {/* Single Search Bar */}
      <div className="inv-card" style={{ marginBottom: 16 }}>
        <div className="inv-card-body">
          <input 
            className="inv-input" 
            placeholder="Search by PO Number, Indent Number or Item Name..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ width: "100%", padding: "10px 12px" }}
          />
        </div>
      </div>

      {/* Bulk Approval Bar */}
      {!showApproved && selectedPOs.size > 0 && (
        <div className="inv-card" style={{ marginBottom: 16, background: "#eef2ff", border: "1px solid #3b6ef8" }}>
          <div className="inv-card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>✓ {selectedPOs.size} PO(s) selected for approval</span>
            <button className="inv-btn-primary" onClick={handleBulkApprove} disabled={bulkApproving}>
              {bulkApproving ? "Approving..." : `Approve Selected (${selectedPOs.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Report Table */}
      <div className="inv-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 40, color: "red" }}>Error: {error}</div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>No records found</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  {!showApproved && <th style={{ width: 40 }}><input type="checkbox" onChange={toggleAll} checked={selectedPOs.size === filteredData.length && filteredData.length > 0} /></th>}
                  <th style={{ width: 40 }}></th>
                  <th>PO Number</th>
                  <th>PO Date</th>
                  <th>Supplier</th>
                  <th>Delivery Date</th>
                  <th>PO Type</th>
                  <th style={{ textAlign: "right" }}>Total Items</th>
                  <th style={{ textAlign: "right" }}>Total Qty</th>
                  <th style={{ textAlign: "right" }}>Total Amount</th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef}>
                {filteredData.map((po, index) => {
                  const isExpanded = expandedRows[po.id];
                  return (
                    <React.Fragment key={po.id}>
                      <tr 
                        className="po-main-row"
                        style={{ cursor: "pointer", backgroundColor: "#f8fafc" }}
                        onClick={() => toggleExpand(po.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.target.closest('button')) {
                            e.preventDefault();
                            toggleExpand(po.id);
                          }
                        }}
                        tabIndex={10 + index}
                      >
                        {!showApproved && (
                          <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedPOs.has(po.id)} onChange={() => toggleSelect(po.id)} />
                          </td>
                        )}
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(po.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleExpand(po.id);
                              }
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "12px",
                              padding: "4px",
                              width: "24px",
                              height: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            {isExpanded ? "▼" : "▶"}
                          </button>
                        </td>
                        <td 
                          style={{ fontWeight: 600, color: "#3b6ef8", cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => handlePOClick(po)}
                        >
                          {po.poNo}
                        </td>
                        <td>{po.poDate}</td>
                        <td>{po.supplier || "—"}</td>
                        <td>{po.deliveryDate || "—"}</td>
                        <td>{po.poType || "—"}</td>
                        <td style={{ textAlign: "right" }}>{po.totalItems}</td>
                        <td style={{ textAlign: "right", fontWeight: 500 }}>{fmtQty(po.totalQty)}</td>
                        <td style={{ textAlign: "right", fontWeight: 500, color: "#10b981" }}>₹{fmt(po.totalAmount)}</td>
                      </tr>
                      
                      {isExpanded && (
                        <tr style={{ backgroundColor: "#fafafa" }}>
                          <td colSpan={showApproved ? 10 : 11} style={{ padding: 0 }}>
                            <table className="inv-table" style={{ margin: 0, width: "100%", borderCollapse: "collapse", backgroundColor: "#fafafa" }}>
                              <thead>
                                <tr style={{ backgroundColor: "#e2e8f0", borderTop: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
                                  <th style={{ width: 40, padding: "8px 12px" }}></th>
                                  <th style={{ width: "10%", padding: "8px 12px", textAlign: "left" }}>Indent No</th>
                                  <th style={{ width: "25%", padding: "8px 12px", textAlign: "left" }}>Item Name</th>
                                  <th style={{ width: "8%", padding: "8px 12px", textAlign: "center" }}>UOM</th>
                                  <th style={{ width: "10%", padding: "8px 12px", textAlign: "right" }}>PO Qty</th>
                                  <th style={{ width: "10%", padding: "8px 12px", textAlign: "right" }}>Rate</th>
                                  <th style={{ width: "10%", padding: "8px 12px", textAlign: "right" }}>Discount</th>
                                  <th style={{ width: "10%", padding: "8px 12px", textAlign: "right" }}>GST</th>
                                  <th style={{ width: "12%", padding: "8px 12px", textAlign: "right" }}>Total Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {po.items && po.items.map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: idx === po.items.length - 1 ? "none" : "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
                                    <td style={{ paddingLeft: 28, verticalAlign: "top" }}>↳</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, verticalAlign: "top" }}>{item.indentNo || "—"}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, verticalAlign: "top" }}>{item.itemName}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "center", verticalAlign: "top" }}>{item.uom}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top" }}>{fmtQty(item.poQty)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top" }}>₹{fmt(item.poRate)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top", color: "#ef4444" }}>₹{fmt(item.discPrice)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top" }}>₹{fmt(item.totGst)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top", fontWeight: 600, color: "#10b981" }}>₹{fmt(item.totalAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 600 }}>
                                  <td colSpan={4} style={{ padding: "10px 12px", textAlign: "right" }}>Total:</td>
                                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtQty(po.totalQty)}</td>
                                  <td colSpan={3}></td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#10b981" }}>₹{fmt(po.totalAmount)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Summary Footer */}
      {!loading && !error && filteredData.length > 0 && (
        <div className="inv-card" style={{ marginTop: 16 }}>
          <div className="inv-card-body">
            <div style={{ display: "flex", gap: 32, justifyContent: "flex-end" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total POs</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{filteredData.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Items</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {filteredData.reduce((sum, g) => sum + g.totalItems, 0)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Quantity</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#3b6ef8" }}>
                  {fmtQty(filteredData.reduce((sum, g) => sum + g.totalQty, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Amount</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                  ₹{fmt(filteredData.reduce((sum, g) => sum + g.totalAmount, 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
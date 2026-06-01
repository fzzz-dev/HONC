import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const API = "http://localhost:5000/api"; // Change to your backend port

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── API Calls ────────────────────────────────────────────────────────────────
const reportAPI = {
  getReport: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.searchPONo) queryParams.append('searchPONo', params.searchPONo);
    if (params.supplier) queryParams.append('supplier', params.supplier);
    
    const url = `${API}/reports/purchase-order-report${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  },
  exportToExcel: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.searchPONo) queryParams.append('searchPONo', params.searchPONo);
    if (params.supplier) queryParams.append('supplier', params.supplier);
    
    window.open(`${API}/reports/purchase-order-report/export/csv?${queryParams.toString()}`, '_blank');
  },
  // Fetch ALL suppliers (not filtered by report results)
  getAllSuppliers: async () => {
    const response = await fetch(`${API}/reports/purchase-order-report/all-suppliers`);
    const data = await response.json();
    return data;
  }
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PurchaseOrderReportPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const tableBodyRef = useRef(null);
  
  // Filter states - with fromDate and toDate set to today's date
  const [fromDate, setFromDate] = useState(getTodayDate);
  const [toDate, setToDate] = useState(getTodayDate);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPONo, setSearchPONo] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  
  // Dropdown options - ALWAYS show all suppliers alphabetically
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Fetch ALL suppliers on component mount (only once)
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const result = await reportAPI.getAllSuppliers();
        if (result.success) {
          // Sort alphabetically
          const sortedSuppliers = [...result.data].sort((a, b) => 
            a.localeCompare(b, 'en', { sensitivity: 'base' })
          );
          setAllSuppliers(sortedSuppliers);
        }
      } catch (err) {
        console.error("Error fetching suppliers:", err);
      }
    };
    
    fetchSuppliers();
  }, []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (searchTerm) params.searchTerm = searchTerm;
      if (searchPONo) params.searchPONo = searchPONo;
      if (selectedSupplier) params.supplier = selectedSupplier;
      
      console.log("Fetching with params:", params);
      const result = await reportAPI.getReport(params);
      if (result.success) {
        setReportData(result.data || []);
        setFiltersApplied(true);
      } else {
        setError(result.message || "Failed to fetch report");
        setFiltersApplied(false);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
      setFiltersApplied(false);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchTerm, searchPONo, selectedSupplier]);

  // Auto-fetch on component mount with today's date filters
  useEffect(() => {
    fetchReport();
  }, []);

  // Toggle expand/collapse for PO row
  const toggleExpand = (poNo) => {
    setExpandedRows(prev => ({ ...prev, [poNo]: !prev[poNo] }));
  };

  // Export to Excel
  const handleExport = () => {
    const params = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (searchTerm) params.searchTerm = searchTerm;
    if (searchPONo) params.searchPONo = searchPONo;
    if (selectedSupplier) params.supplier = selectedSupplier;
    reportAPI.exportToExcel(params);
  };
  
  // Handle Result button click
  const handleResult = () => {
    fetchReport();
  };
  
  // Handle Reset button click
  const handleReset = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setSearchTerm("");
    setSearchPONo("");
    setSelectedSupplier("");
    // Fetch with reset filters after state updates
    setTimeout(() => {
      fetchReport();
    }, 0);
  };
  
  // Group data by PO Number and sort with new ones first
  const groupedData = useMemo(() => {
    const groups = {};
    reportData.forEach(item => {
      if (!groups[item.ponumber]) {
        groups[item.ponumber] = {
          poNo: item.ponumber,
          poDate: item.podate,
          supplier: item.supplier,
          deliveryDate: item.deliverydate,
          poType: item.potype,
          totalQty: 0,
          totalAmount: 0,
          totalItems: 0,
          items: []
        };
      }
      groups[item.ponumber].items.push({
        indentNo: item.indentNo,
        itemName: item.itemName,
        uom: item.uom,
        poQty: item.poQty,
        poRate: item.porate,
        poAmount: item.poamt,
        discPrice: item.discPrice,
        totGst: item.totGst,
        totalAmount: item.totalAmount
      });
      groups[item.ponumber].totalQty += Number(item.poQty) || 0;
      groups[item.ponumber].totalAmount += Number(item.totalAmount) || 0;
      groups[item.ponumber].totalItems += 1;
    });
    
    // Sort by PO date (newest first)
    return Object.values(groups).sort((a, b) => {
      if (!a.poDate && !b.poDate) return 0;
      if (!a.poDate) return 1;
      if (!b.poDate) return -1;
      return new Date(b.poDate) - new Date(a.poDate);
    });
  }, [reportData]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      const mainRows = document.querySelectorAll('.po-main-row');
      const currentElement = document.activeElement;
      const currentIndex = Array.from(mainRows).indexOf(currentElement);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < mainRows.length - 1) {
          mainRows[currentIndex + 1].focus();
        } else {
          mainRows[0].focus();
        }
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          mainRows[currentIndex - 1].focus();
        } else {
          mainRows[mainRows.length - 1].focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyNavigation);
    return () => document.removeEventListener('keydown', handleKeyNavigation);
  }, [groupedData]);

  // Tab index navigation for filters
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
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Purchase Order Report</h1>
          <p className="inv-page-sub">View and analyze purchase order details</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-primary" onClick={handleExport}>
            Export to Excel
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="inv-card" style={{ marginBottom: 16 }}>
        <div className="inv-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
            <div className="inv-field">
              <label className="inv-label">From Date</label>
              <input
                type="date"
                className="inv-input"
                tabIndex={1}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">To Date</label>
              <input
                type="date"
                className="inv-input"
                tabIndex={2}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Search PO No</label>
              <input
                type="text"
                className="inv-input"
                tabIndex={3}
                placeholder="Search by PO number..."
                value={searchPONo}
                onChange={(e) => setSearchPONo(e.target.value)}
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Search Item/Indent</label>
              <input
                type="text"
                className="inv-input"
                tabIndex={4}
                placeholder="Search by item or indent no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Supplier</label>
              <select 
                className="inv-input" 
                tabIndex={5} 
                value={selectedSupplier} 
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">All Suppliers</option>
                {allSuppliers.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Filter Action Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
            <button className="inv-btn-secondary" onClick={handleReset} tabIndex={6}>
              Reset
            </button>
            <button className="inv-btn-primary" onClick={handleResult} tabIndex={7}>
              Result
            </button>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="inv-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 40, color: "red" }}>Error: {error}</div>
        ) : groupedData.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            {filtersApplied ? "No records found matching your criteria" : "No records found"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
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
                {groupedData.map((po, index) => {
                  const isExpanded = expandedRows[po.poNo];
                  return (
                    <React.Fragment key={po.poNo}>
                      {/* Main PO Row */}
                      <tr 
                        className="po-main-row"
                        style={{ cursor: "pointer", backgroundColor: "#f8fafc" }}
                        onClick={() => toggleExpand(po.poNo)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            toggleExpand(po.poNo);
                          }
                        }}
                        tabIndex={10 + index}
                      >
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: 12 }}>
                            {isExpanded ? "▼" : "▶"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "#3b6ef8" }}>{po.poNo}</td>
                        <td>{po.poDate}</td>
                        <td>{po.supplier || "—"}</td>
                        <td>{po.deliveryDate || "—"}</td>
                        <td>{po.poType || "—"}</td>
                        <td style={{ textAlign: "right" }}>{po.totalItems}</td>
                        <td style={{ textAlign: "right", fontWeight: 500 }}>{fmtQty(po.totalQty)}</td>
                        <td style={{ textAlign: "right", fontWeight: 500, color: "#10b981" }}>{fmt(po.totalAmount)}</td>
                      </tr>
                      
                      {/* Expanded Items Row */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: "#fafafa" }}>
                          <td colSpan={9} style={{ padding: 0 }}>
                            <table className="inv-table" style={{ 
                              margin: 0, 
                              width: "100%", 
                              borderCollapse: "collapse",
                              backgroundColor: "#fafafa"
                            }}>
                              <thead>
                                <tr style={{ 
                                  backgroundColor: "#e2e8f0", 
                                  borderTop: "1px solid #cbd5e1", 
                                  borderBottom: "1px solid #cbd5e1"
                                }}>
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
                                {po.items.map((item, idx) => (
                                  <tr 
                                    key={idx} 
                                    style={{ 
                                      borderBottom: idx === po.items.length - 1 ? "none" : "1px solid #e2e8f0",
                                      backgroundColor: "#ffffff"
                                    }}
                                  >
                                    <td style={{ paddingLeft: 28, verticalAlign: "top" }}>↳</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, verticalAlign: "top" }}>{item.indentNo || "—"}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, verticalAlign: "top" }}>{item.itemName}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "center", verticalAlign: "top" }}>{item.uom}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top" }}>{fmtQty(item.poQty)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top" }}>{fmt(item.poRate)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top", color: "#ef4444" }}>{fmt(item.discPrice)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top" }}>{fmt(item.totGst)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top", fontWeight: 600, color: "#10b981" }}>{fmt(item.totalAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 600 }}>
                                  <td colSpan={4} style={{ padding: "10px 12px", textAlign: "right" }}>Total:</td>
                                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtQty(po.totalQty)}</td>
                                  <td colSpan={3}></td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#10b981" }}>{fmt(po.totalAmount)}</td>
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
      {!loading && !error && groupedData.length > 0 && (
        <div className="inv-card" style={{ marginTop: 16 }}>
          <div className="inv-card-body">
            <div style={{ display: "flex", gap: 32, justifyContent: "flex-end" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total POs</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{groupedData.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Items</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {groupedData.reduce((sum, g) => sum + g.totalItems, 0)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Quantity</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#3b6ef8" }}>
                  {fmtQty(groupedData.reduce((sum, g) => sum + g.totalQty, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Amount</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                  {fmt(groupedData.reduce((sum, g) => sum + g.totalAmount, 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
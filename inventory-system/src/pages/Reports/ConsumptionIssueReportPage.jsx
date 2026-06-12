import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const API = import.meta.env.VITE_API_URL || "/api";

const consumptionIssueReportAPI = {
  getReport: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.searchISSNo) queryParams.append('searchISSNo', params.searchISSNo);
    if (params.searchItem) queryParams.append('searchItem', params.searchItem);
    if (params.department) queryParams.append('department', params.department);
    if (params.store) queryParams.append('store', params.store);
    
    const url = `${API}/consumption-issues/consumption-issue-report${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  },
  
  exportToExcel: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.searchISSNo) queryParams.append('searchISSNo', params.searchISSNo);
    if (params.searchItem) queryParams.append('searchItem', params.searchItem);
    if (params.department) queryParams.append('department', params.department);
    if (params.store) queryParams.append('store', params.store);
    
    window.open(`${API}/consumption-issues/consumption-issue-report/export/csv?${queryParams.toString()}`, '_blank');
  },
  
  getDepartments: async () => {
    const response = await fetch(`${API}/consumption-issues/consumption-issue-report/departments`);
    const data = await response.json();
    return data;
  },
  
  getStores: async () => {
    const response = await fetch(`${API}/consumption-issues/consumption-issue-report/stores`);
    const data = await response.json();
    return data;
  }
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ConsumptionIssueReportPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const tableBodyRef = useRef(null);
  
  // Filter states
  const [fromDate, setFromDate] = useState(getTodayDate);
  const [toDate, setToDate] = useState(getTodayDate);
  const [searchISSNo, setSearchISSNo] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  
  // Dropdown options
  const [departments, setDepartments] = useState([]);
  const [stores, setStores] = useState([]);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Fetch departments and stores on component mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [deptResult, storeResult] = await Promise.all([
          consumptionIssueReportAPI.getDepartments(),
          consumptionIssueReportAPI.getStores()
        ]);
        
        if (deptResult.success) {
          setDepartments(deptResult.data || []);
        }
        if (storeResult.success) {
          setStores(storeResult.data || []);
        }
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    };
    
    fetchFilters();
  }, []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (searchISSNo) params.searchISSNo = searchISSNo;
      if (searchItem) params.searchItem = searchItem;
      if (selectedDepartment) params.department = selectedDepartment;
      if (selectedStore) params.store = selectedStore;
      
      const result = await consumptionIssueReportAPI.getReport(params);
      if (result.success) {
        setReportData(result.data || []);
        setFiltersApplied(true);
      } else {
        setError(result.message || "Failed to fetch report");
        setFiltersApplied(false);
      }
    } catch (err) {
      console.error("Error fetching report:", err);
      setError(err.message);
      setFiltersApplied(false);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchISSNo, searchItem, selectedDepartment, selectedStore]);

  // Auto-fetch on component mount with today's date filters
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Toggle expand/collapse for ISS row
  const toggleExpand = (issNo) => {
    setExpandedRows(prev => ({ ...prev, [issNo]: !prev[issNo] }));
  };

  // Export to Excel
  const handleExport = () => {
    const params = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (searchISSNo) params.searchISSNo = searchISSNo;
    if (searchItem) params.searchItem = searchItem;
    if (selectedDepartment) params.department = selectedDepartment;
    if (selectedStore) params.store = selectedStore;
    consumptionIssueReportAPI.exportToExcel(params);
  };
  
  // Handle Result button click
  const handleResult = () => {
    if (fromDate && toDate) {
      if (new Date(fromDate) > new Date(toDate)) {
        setError("From Date cannot be greater than To Date");
        return;
      }
    }
    setError(null);
    fetchReport();
  };  
  
  // Handle Reset button click
  const handleReset = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setSearchISSNo("");
    setSearchItem("");
    setSelectedDepartment("");
    setSelectedStore("");
    setTimeout(() => {
      fetchReport();
    }, 0);
  };
  
  // Group data by ISS No
  const groupedData = useMemo(() => {
    const groups = {};
    reportData.forEach(item => {
      if (!groups[item.issno]) {
        groups[item.issno] = {
          issNo: item.issno,
          issueDate: item.issuedate,
          department: item.department,
          store: item.store,
          requestedBy: item.requestedby,
          remarks: item.remarks,
          totalQty: 0,
          totalItems: 0,
          items: []
        };
      }
      
      groups[item.issno].items.push({
        itemName: item.itemname,
        stkQty: item.stkqty,
        issueQty: item.issueqty,
        uom: item.uom,
        balQty: item.balqty,
        itemRemarks: item.itemremarks
      });
      
      groups[item.issno].totalQty += Number(item.issueqty) || 0;
      groups[item.issno].totalItems += 1;
    });
    
    return Object.values(groups).sort((a, b) => {
      if (!a.issueDate && !b.issueDate) return 0;
      if (!a.issueDate) return 1;
      if (!b.issueDate) return -1;
      return new Date(b.issueDate) - new Date(a.issueDate);
    });
  }, [reportData]);

  // Tab index navigation - cycles back to first
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

  // Calculate totals for summary
  const totalIssues = groupedData.length;
  const totalItems = groupedData.reduce((sum, g) => sum + g.totalItems, 0);
  const totalQuantity = groupedData.reduce((sum, g) => sum + g.totalQty, 0);

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Consumption Issue Report</h1>
          <p className="inv-page-sub">View and analyze consumption issue details</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-primary" onClick={handleExport} tabIndex={8}>
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
                onChange={(e) => {
                  const newFromDate = e.target.value;
                  if (toDate && newFromDate > toDate) {
                    setError("From Date cannot be greater than To Date");
                  } else {
                    setError(null);
                    setFromDate(newFromDate);
                  }
                }}
              />
            </div>

            <div className="inv-field">
              <label className="inv-label">To Date</label>
              <input
                type="date"
                className="inv-input"
                tabIndex={2}
                value={toDate}
                onChange={(e) => {
                  const newToDate = e.target.value;
                  if (fromDate && fromDate > newToDate) {
                    setError("To Date cannot be less than From Date");
                  } else {
                    setError(null);
                    setToDate(newToDate);
                  }
                }}
              />
            </div>
            
            <div className="inv-field">
              <label className="inv-label">Search ISS No</label>
              <input
                type="text"
                className="inv-input"
                tabIndex={3}
                placeholder="Search by ISS number..."
                value={searchISSNo}
                onChange={(e) => setSearchISSNo(e.target.value)}
              />
            </div>
            
            <div className="inv-field">
              <label className="inv-label">Search Item</label>
              <input
                type="text"
                className="inv-input"
                tabIndex={4}
                placeholder="Search by item name..."
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
              />
            </div>
            
            <div className="inv-field">
              <label className="inv-label">Department</label>
              <select 
                className="inv-input" 
                tabIndex={5} 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div className="inv-field">
              <label className="inv-label">Store</label>
              <select 
                className="inv-input" 
                tabIndex={6} 
                value={selectedStore} 
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <option value="">All Stores</option>
                {stores.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Filter Action Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
            <button className="inv-btn-secondary" onClick={handleReset} tabIndex={7}>
              Reset
            </button>
            <button className="inv-btn-primary" onClick={handleResult} tabIndex={8}>
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
                  <th>ISS No</th>
                  <th>Issue Date</th>
                  <th>Department</th>
                  <th>Store</th>
                  <th>Requested By</th>
                  <th style={{ textAlign: "right" }}>Total Items</th>
                  <th style={{ textAlign: "right" }}>Total Qty</th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef}>
                {groupedData.map((iss) => {
                  const isExpanded = expandedRows[iss.issNo];
                  return (
                    <React.Fragment key={iss.issNo}>
                      {/* Main ISS Row */}
                      <tr 
                        className="iss-main-row"
                        style={{ cursor: "pointer", backgroundColor: "#f8fafc" }}
                        onClick={() => toggleExpand(iss.issNo)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            toggleExpand(iss.issNo);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: 12 }}>
                            {isExpanded ? "▼" : "▶"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "#3b6ef8" }}>{iss.issNo}</td>
                        <td>{iss.issueDate}</td>
                        <td>{iss.department || "—"}</td>
                        <td>{iss.store || "—"}</td>
                        <td>{iss.requestedBy || "—"}</td>
                        <td style={{ textAlign: "right" }}>{iss.totalItems}</td>
                        <td style={{ textAlign: "right", fontWeight: 500 }}>{fmtQty(iss.totalQty)}</td>
                      </tr>
                      
                      {/* Expanded Items Row */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: "#fafafa" }}>
                          <td colSpan={8} style={{ padding: 0 }}>
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
                                  <th style={{ width: "35%", padding: "8px 12px", textAlign: "left" }}>Item Name</th>
                                  <th style={{ width: "15%", padding: "8px 12px", textAlign: "right" }}>Stock Qty</th>
                                  <th style={{ width: "15%", padding: "8px 12px", textAlign: "right" }}>Issue Qty</th>
                                  <th style={{ width: "10%", padding: "8px 12px", textAlign: "center" }}>UOM</th>
                                  <th style={{ width: "15%", padding: "8px 12px", textAlign: "right" }}>Balance Qty</th>
                                  <th style={{ width: "15%", padding: "8px 12px", textAlign: "left" }}>Item Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {iss.items.map((item, idx) => (
                                  <tr 
                                    key={idx} 
                                    style={{ 
                                      borderBottom: idx === iss.items.length - 1 ? "none" : "1px solid #e2e8f0",
                                      backgroundColor: "#ffffff"
                                    }}
                                  >
                                    <td style={{ paddingLeft: 28, verticalAlign: "top" }}>↳</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, verticalAlign: "top" }}>{item.itemName || "—"}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top" }}>{fmtQty(item.stkQty)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top", fontWeight: 600, color: "#3b6ef8" }}>{fmtQty(item.issueQty)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "center", verticalAlign: "top" }}>{item.uom || "—"}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top" }}>{fmtQty(item.balQty)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, verticalAlign: "top" }}>{item.itemRemarks || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 600 }}>
                                  <td colSpan={3} style={{ padding: "10px 12px", textAlign: "right" }}>Total:</td>
                                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtQty(iss.totalQty)}</td>
                                  <td colSpan={3}></td>
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
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Issues</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{totalIssues}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Items</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{totalItems}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Quantity</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#3b6ef8" }}>{fmtQty(totalQuantity)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
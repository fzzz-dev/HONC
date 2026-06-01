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
    if (params.searchIndentNo) queryParams.append('searchIndentNo', params.searchIndentNo);
    if (params.category) queryParams.append('category', params.category);
    if (params.departmentId) queryParams.append('departmentId', params.departmentId);
    
    const url = `${API}/reports/purchase-indent-report${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  },
  exportToExcel: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.searchIndentNo) queryParams.append('searchIndentNo', params.searchIndentNo);
    if (params.category) queryParams.append('category', params.category);
    if (params.departmentId) queryParams.append('departmentId', params.departmentId);
    
    window.open(`${API}/reports/purchase-indent-report/export/csv?${queryParams.toString()}`, '_blank');
  },
  // Fetch ALL categories (not filtered by report results)
  getAllCategories: async () => {
    const response = await fetch(`${API}/reports/purchase-indent-report/all-categories`);
    const data = await response.json();
    return data;
  },
  // Fetch ALL departments (not filtered by report results)
  getAllDepartments: async () => {
    const response = await fetch(`${API}/reports/purchase-indent-report/all-departments`);
    const data = await response.json();
    return data;
  }
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PurchaseIndentReportPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const tableBodyRef = useRef(null);
  
  // Filter states
  const [fromDate, setFromDate] = useState(getTodayDate);
  const [toDate, setToDate] = useState(getTodayDate);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchIndentNo, setSearchIndentNo] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  
  // Dropdown options - ALWAYS show all categories and departments alphabetically
  const [allCategories, setAllCategories] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  
  // State to track if filters have been applied
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Fetch ALL categories and ALL departments on component mount (only once)
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        // Fetch all categories
        const categoriesResult = await reportAPI.getAllCategories();
        if (categoriesResult.success) {
          // Already sorted from backend, but ensure alphabetical order
          const sortedCategories = [...categoriesResult.data].sort((a, b) => 
            a.localeCompare(b, 'en', { sensitivity: 'base' })
          );
          setAllCategories(sortedCategories);
        }
        
        // Fetch all departments
        const departmentsResult = await reportAPI.getAllDepartments();
        if (departmentsResult.success) {
          // Already sorted from backend, but ensure alphabetical order
          const sortedDepartments = [...departmentsResult.data].sort((a, b) => 
            a.localeCompare(b, 'en', { sensitivity: 'base' })
          );
          setAllDepartments(sortedDepartments);
        }
      } catch (err) {
        console.error("Error fetching dropdown options:", err);
      }
    };
    
    fetchDropdownOptions();
  }, []); // Empty dependency array - runs only once on mount

  // Fetch report data (only called when Result button is clicked)
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (searchTerm) params.searchTerm = searchTerm;
      if (searchIndentNo) params.searchIndentNo = searchIndentNo;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedDepartment) params.departmentId = selectedDepartment;
      
      const result = await reportAPI.getReport(params);
      if (result.success) {
        setReportData(result.data || []);
        setFiltersApplied(true);
      } else {
        setError(result.message || "Failed to fetch report");
        setFiltersApplied(false);
      }
    } catch (err) {
      setError(err.message);
      setFiltersApplied(false);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchTerm, searchIndentNo, selectedCategory, selectedDepartment]);

  // Auto-fetch on component mount with today's date filters
  useEffect(() => {
    fetchReport();
  }, []); // Empty dependency array - only runs once on mount

  // Toggle expand/collapse for indent row
  const toggleExpand = (indentNo) => {
    setExpandedRows(prev => ({ ...prev, [indentNo]: !prev[indentNo] }));
  };

  // Export to Excel
  const handleExport = () => {
    const params = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (searchTerm) params.searchTerm = searchTerm;
    if (searchIndentNo) params.searchIndentNo = searchIndentNo;
    if (selectedCategory) params.category = selectedCategory;
    if (selectedDepartment) params.departmentId = selectedDepartment;
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
    setSearchIndentNo("");
    setSelectedCategory("");
    setSelectedDepartment("");
    // Fetch with reset filters after state updates
    setTimeout(() => {
      fetchReport();
    }, 0);
  };
  
  // Group data by Indent No and sort with new ones first (by date descending)
  const groupedData = useMemo(() => {
    const groups = {};
    reportData.forEach(item => {
      if (!groups[item.indentno]) {
        groups[item.indentno] = {
          indentNo: item.indentno,
          date: item.date,
          deptname: item.deptname,
          createdBy: item.createdBy,
          totalQty: 0,
          totalItems: 0,
          items: []
        };
      }
      groups[item.indentno].items.push({
        groupName: item.groupName,
        itemDescription: item.itemDescription,
        indentQty: item.indentQty,
        uom: item.uom,
        remarks: item.remarks,
        dueDate: item.dueDate
      });
      groups[item.indentno].totalQty += Number(item.indentQty) || 0;
      groups[item.indentno].totalItems += 1;
    });
    
    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
  }, [reportData]);

  // Keyboard navigation for arrow keys and tab
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      const mainRows = document.querySelectorAll('.indent-main-row');
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

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Purchase Indent Report</h1>
          <p className="inv-page-sub">View and analyze purchase indent details</p>
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
              <label className="inv-label">Search Item</label>
              <input
                type="text"
                className="inv-input"
                tabIndex={3}
                placeholder="Search by item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Search Indent No</label>
              <input
                type="text"
                className="inv-input"
                tabIndex={4}
                placeholder="Search by indent number..."
                value={searchIndentNo}
                onChange={(e) => setSearchIndentNo(e.target.value)}
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Category</label>
              <select 
                className="inv-input" 
                tabIndex={5} 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="inv-field">
              <label className="inv-label">Department</label>
              <select 
                className="inv-input" 
                tabIndex={6} 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {allDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
            <button 
              className="inv-btn-secondary" 
              onClick={handleReset}
              tabIndex={7}
              style={{ minWidth: 50 }}
            >
              Reset
            </button>
            <button 
              className="inv-btn-primary" 
              onClick={handleResult}
              tabIndex={8}
              style={{ minWidth: 50 }}
            >
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
                  <th>Indent No</th>
                  <th>Indent Date</th>
                  <th>Department</th>
                  <th>Requested By</th>
                  <th style={{ textAlign: "right" }}>Total Items</th>
                  <th style={{ textAlign: "right" }}>Total Qty</th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef}>
                {groupedData.map((indent, index) => {
                  const isExpanded = expandedRows[indent.indentNo];
                  return (
                    <React.Fragment key={indent.indentNo}>
                      <tr 
                        className="indent-main-row"
                        style={{ cursor: "pointer", backgroundColor: "#f8fafc" }}
                        onClick={() => toggleExpand(indent.indentNo)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            toggleExpand(indent.indentNo);
                          }
                        }}
                        tabIndex={10 + index}
                      >
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontSize: 12 }}>
                            {isExpanded ? "▼" : "▶"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "#3b6ef8" }}>{indent.indentNo}</td>
                        <td>{indent.date}</td>
                        <td>{indent.deptname || "—"}</td>
                        <td>{indent.createdBy || "—"}</td>
                        <td style={{ textAlign: "right" }}>{indent.totalItems}</td>
                        <td style={{ textAlign: "right", fontWeight: 500 }}>{fmtQty(indent.totalQty)}</td>
                      </tr>
                      
                      {isExpanded && (
                        <tr style={{ backgroundColor: "#fafafa" }}>
                          <td colSpan={7} style={{ padding: 0 }}>
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
                                  <th style={{ width: "18%", padding: "8px 12px", textAlign: "left" }}>Category</th>
                                  <th style={{ width: "30%", padding: "8px 12px", textAlign: "left" }}>Item Description</th>
                                  <th style={{ width: "10%", padding: "8px 12px", textAlign: "center" }}>UOM</th>
                                  <th style={{ width: "12%", padding: "8px 12px", textAlign: "right" }}>Indent Qty</th>
                                  <th style={{ width: "12%", padding: "8px 12px", textAlign: "center" }}>Due Date</th>
                                  <th style={{ width: "18%", padding: "8px 12px", textAlign: "left" }}>Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {indent.items.map((item, idx) => (
                                  <tr 
                                    key={idx} 
                                    style={{ 
                                      borderBottom: idx === indent.items.length - 1 ? "none" : "1px solid #e2e8f0",
                                      backgroundColor: "#ffffff"
                                    }}
                                  >
                                    <td style={{ paddingLeft: 28, verticalAlign: "top" }}>↳</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, verticalAlign: "top" }}>{item.groupName || "—"}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, verticalAlign: "top" }}>{item.itemDescription}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "center", verticalAlign: "top" }}>{item.uom}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", verticalAlign: "top", fontWeight: 500 }}>{fmtQty(item.indentQty)}</td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "center", verticalAlign: "top" }}>
                                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-IN") : "—"}
                                    </td>
                                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#64748b", verticalAlign: "top" }}>{item.remarks || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
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
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Indents</div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
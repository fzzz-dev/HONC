import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../context/AuthContext";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const API = "http://192.168.1.100:5173/api";

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Compare dates without time component
const isDateGreater = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1 > d2;
};

// ─── API Calls ────────────────────────────────────────────────────────────────
const reportAPI = {
  getReport: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    
    const url = `${API}/reports/inventory/stock-flow${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  },
  exportToExcel: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    
    window.open(`${API}/reports/inventory/stock-flow/export/csv?${queryParams.toString()}`, '_blank');
  }
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function InventoryStockFlow() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tableBodyRef = useRef(null);
  
  // Get today's date for default values
  const todayDate = getTodayDate();
  
  // Filter states - default to today's date
  const [fromDate, setFromDate] = useState(todayDate);
  const [toDate, setToDate] = useState(todayDate);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State to track if report has been fetched
  const [reportFetched, setReportFetched] = useState(false);

  // Validate dates - to date cannot be greater than today
  const validateDates = useCallback(() => {
    // Reset error first
    setError(null);
    
    const currentFromDate = new Date(fromDate);
    const currentToDate = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    currentFromDate.setHours(0, 0, 0, 0);
    currentToDate.setHours(0, 0, 0, 0);
    
    if (currentFromDate > currentToDate) {
      setError("From date cannot be greater than To date");
      return false;
    }
    
    if (currentToDate > today) {
      setError("To date cannot be greater than today's date");
      return false;
    }
    
    return true;
  }, [fromDate, toDate]);

  // Handle To Date change - ensure it doesn't exceed today
  const handleToDateChange = (e) => {
    const selectedDate = e.target.value;
    const today = getTodayDate();
    
    if (selectedDate > today) {
      setError("To date cannot be greater than today's date");
      return;
    } else {
      setError(null);
      setToDate(selectedDate);
    }
  };

  // Handle From Date change
  const handleFromDateChange = (e) => {
    setFromDate(e.target.value);
    setError(null);
  };

  // Fetch report data
  const fetchReport = useCallback(async () => {
    if (!validateDates()) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      
      const result = await reportAPI.getReport(params);
      
      if (result.success && Array.isArray(result.data)) {
        setReportData(result.data);
        setFilteredData(result.data);
        setReportFetched(true);
      } else if (Array.isArray(result)) {
        setReportData(result);
        setFilteredData(result);
        setReportFetched(true);
      } else {
        setError(result.message || "Failed to fetch report");
        setReportData([]);
        setFilteredData([]);
        setReportFetched(false);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || "An error occurred while fetching data");
      setReportData([]);
      setFilteredData([]);
      setReportFetched(false);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, validateDates]);

  // Filter data based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(reportData);
    } else {
      const filtered = reportData.filter(item => 
        item.itemdescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.storename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.maincat?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, reportData]);

  // Export to Excel
  const handleExport = () => {
    const params = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    reportAPI.exportToExcel(params);
  };
  
  // Handle Result button click
  const handleResult = () => {
    fetchReport();
  };
  
  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredData || !filteredData.length) return null;
    
    return filteredData.reduce(
      (acc, row) => ({
        totalOpStk: acc.totalOpStk + (parseFloat(row.opstk) || 0),
        totalRecQty: acc.totalRecQty + (parseFloat(row.recqty) || 0),
        totalIssQty: acc.totalIssQty + (parseFloat(row.isstqy) || 0),
        totalClsStk: acc.totalClsStk + (parseFloat(row.clsstk) || 0)
      }),
      { totalOpStk: 0, totalRecQty: 0, totalIssQty: 0, totalClsStk: 0 }
    );
  }, [filteredData]);

  // Keyboard navigation for Arrow keys on table rows ONLY
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      const mainRows = document.querySelectorAll('.stock-main-row');
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
  }, [filteredData]);

  // Tab index navigation - ONLY for filters and buttons (tabIndex 1-5), excludes table rows
  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      const focusableElements = Array.from(
        document.querySelectorAll('[tabIndex]:not([tabIndex="-1"])')
      ).filter(el => {
        const tabIndex = parseInt(el.getAttribute('tabIndex'));
        return !isNaN(tabIndex) && tabIndex >= 1 && tabIndex <= 5 && el.offsetParent !== null && !el.disabled;
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
          <h1 className="inv-page-title">Inventory Stock Report</h1>
          <p className="inv-page-sub"></p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-primary" onClick={handleExport} tabIndex={5}>
            Export to Excel
          </button>
        </div>
      </div>

      {/* search and filter section */}
      <div className="inv-card" style={{ marginBottom: 16 }}>
        <div className="inv-card-body">
          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <div className="inv-field" style={{ width: 220 }}>
              <label className="inv-label">From Date</label>
              <input
                type="date"
                className="inv-input"
                tabIndex={1}
                value={fromDate}
                onChange={handleFromDateChange}
                style={{ width: "100%" }}
              />
            </div>
            <div className="inv-field" style={{ width: 220 }}>
              <label className="inv-label">To Date (Cannot exceed today)</label>
              <input
                type="date"
                className="inv-input"
                tabIndex={2}
                max={todayDate}
                value={toDate}
                onChange={handleToDateChange}
                style={{ width: "100%" }}
              />
            </div>
            <div className="inv-field" style={{ width: 280 }}>
              <label className="inv-label">Search Item</label>
              <input
                type="text"
                className="inv-input"
                tabIndex={3}
                placeholder="Search by item name, store or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </div>
          {error && (
            <div style={{ 
              marginBottom: 16, 
              padding: 8, 
              backgroundColor: "#fee2e2", 
              color: "#dc2626", 
              borderRadius: 6,
              fontSize: 14 
            }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button 
              className="inv-btn-primary" 
              onClick={handleResult}
              disabled={loading}
              tabIndex={4}
              style={{ minWidth: 50 }}
            >
              {loading ? "Loading..." : "Result"}
            </button>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="inv-card">
        {!reportFetched ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
            Please select date range and click "Result" to view report
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 40, color: "red" }}>Error: {error}</div>
        ) : !filteredData || filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            No records found matching your criteria
          </div>
        ) : (
          <>
            <div style={{ padding: "12px 16px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontWeight: 500 }}>Showing {filteredData.length} of {reportData.length} records</span>
              {searchTerm && (
                <span style={{ marginLeft: 12, fontSize: 12, color: "#64748b" }}>
                  Filtered by: "{searchTerm}"
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Store Name</th>
                    <th style={{ textAlign: "left" }}>Main Category</th>
                    <th style={{ textAlign: "left" }}>Item Description</th>
                    <th style={{ textAlign: "right" }}>Opening Stock</th>
                    <th style={{ textAlign: "right" }}>Received Qty</th>
                    <th style={{ textAlign: "right" }}>Issued Qty</th>
                    <th style={{ textAlign: "right" }}>Closing Stock</th>
                  </tr>
                </thead>
                <tbody ref={tableBodyRef}>
                  {filteredData.map((row, index) => (
                    <tr 
                      key={index}
                      className="stock-main-row"
                      tabIndex={0}
                      style={{ cursor: "default" }}
                    >
                      <td style={{ fontWeight: 500 }}>{row.storename || "—"}</td>
                      <td>{row.maincat || "—"}</td>
                      <td>{row.itemdescription || "—"}</td>
                      <td style={{ textAlign: "right" }}>{fmtQty(row.opstk)}</td>
                      <td style={{ textAlign: "right", color: "#16a34a" }}>{fmtQty(row.recqty)}</td>
                      <td style={{ textAlign: "right", color: "#dc2626" }}>{fmtQty(row.isstqy)}</td>
                      <td style={{ 
                        textAlign: "right", 
                        fontWeight: 600,
                        color: parseFloat(row.clsstk) < 0 ? "#dc2626" : "#16a34a"
                      }}>
                        {fmtQty(row.clsstk)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {totals && (
                  <tfoot>
                    <tr style={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #cbd5e1" }}>
                      <td colSpan="3" style={{ fontWeight: 700, fontSize: 14 }}>Grand Total</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtQty(totals.totalOpStk)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>{fmtQty(totals.totalRecQty)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>{fmtQty(totals.totalIssQty)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#3b6ef8" }}>
                        {fmtQty(totals.totalClsStk)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
      
      {/* Summary Footer */}
      {reportFetched && !loading && !error && filteredData && filteredData.length > 0 && totals && (
        <div className="inv-card" style={{ marginTop: 16 }}>
          <div className="inv-card-body">
            <div style={{ display: "flex", gap: 32, justifyContent: "flex-end" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Items</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{filteredData.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Opening Stock</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtQty(totals.totalOpStk)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Received</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{fmtQty(totals.totalRecQty)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Issued</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>{fmtQty(totals.totalIssQty)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Closing Stock</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#3b6ef8" }}>{fmtQty(totals.totalClsStk)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
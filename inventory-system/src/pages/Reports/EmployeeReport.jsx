import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── API Calls ────────────────────────────────────────────────────────────────
const reportAPI = {
  getEmployeeReport: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params.designationId) queryParams.append('designationId', params.designationId);
    if (params.status !== undefined && params.status !== '') queryParams.append('status', params.status);
    
    const url = `${API}/reports/employee-report${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  },
  
  exportToExcel: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params.designationId) queryParams.append('designationId', params.designationId);
    if (params.status !== undefined && params.status !== '') queryParams.append('status', params.status);
    
    window.open(`${API}/reports/employee-report/export/csv?${queryParams.toString()}`, '_blank');
  },
  
  getAllDepartments: async () => {
    const response = await fetch(`${API}/reports/employee-report/departments`);
    const data = await response.json();
    return data;
  },
  
  getDesignationsByDepartment: async (departmentId) => {
    const response = await fetch(`${API}/reports/employee-report/designations?departmentId=${departmentId}`);
    const data = await response.json();
    return data;
  }
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function EmployeeReportPage() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("");
  
  // Dropdown options
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const result = await reportAPI.getAllDepartments();
        if (result.success) {
          setDepartments(result.data || []);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch designations when department changes
  useEffect(() => {
    const fetchDesignations = async () => {
      if (!selectedDepartment) {
        setDesignations([]);
        setSelectedDesignation("");
        return;
      }
      
      try {
        const result = await reportAPI.getDesignationsByDepartment(selectedDepartment);
        if (result.success) {
          setDesignations(result.data || []);
        } else {
          setDesignations([]);
        }
      } catch (err) {
        console.error('Error fetching designations:', err);
        setDesignations([]);
      }
    };
    
    fetchDesignations();
  }, [selectedDepartment]);

  // Fetch report data
const fetchReport = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const params = {};
    if (searchTerm) params.searchTerm = searchTerm;
    if (selectedDepartment) params.departmentId = selectedDepartment;
    if (selectedDesignation) params.designationId = selectedDesignation;
    
    const result = await reportAPI.getEmployeeReport(params);
    if (result.success) {
      // Sort by id ascending (oldest first = upload order)
      const sortedData = [...(result.data || [])].sort((a, b) => {
        // Sort by id if available (most reliable)
        if (a.id && b.id) {
          return a.id - b.id;
        }
        // Fallback to created_at
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateA - dateB;
      });
      setReportData(sortedData);
      setFiltersApplied(true);
    } else {
      setError(result.message || "Failed to fetch report");
      setFiltersApplied(false);
    }
  } catch (err) {
    console.error('Error fetching report:', err);
    setError(err.message || "Network error occurred");
    setFiltersApplied(false);
  } finally {
    setLoading(false);
  }
}, [searchTerm, selectedDepartment, selectedDesignation]);
  // Auto-fetch on component mount
  useEffect(() => {
    fetchReport();
  }, []);

  // Export to Excel
  const handleExport = () => {
    const params = {};
    if (searchTerm) params.searchTerm = searchTerm;
    if (selectedDepartment) params.departmentId = selectedDepartment;
    if (selectedDesignation) params.designationId = selectedDesignation;
    reportAPI.exportToExcel(params);
  };
  
  // Handle Result button click
  const handleResult = () => {
    setError(null);
    fetchReport();
  };  
  
  // Handle Reset button click
  const handleReset = () => {
    setSearchTerm("");
    setSelectedDepartment("");
    setSelectedDesignation("");
    setDesignations([]);
    // Fetch with reset filters after state updates
    setTimeout(() => {
      fetchReport();
    }, 100);
  };

  // Format employee data for display
  const formattedData = useMemo(() => {
    return reportData.map(emp => ({
      id: emp.id,
      employeeCode: emp.employee_code || "—",
      firstName: emp.first_name || "",
      lastName: emp.last_name || "",
      fullName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || "—",
      fatherName: emp.father_name || "—",
      dateOfBirth: emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-IN') : "—",
      dateOfJoining: emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-IN') : "—",
      gender: emp.gender || "—",
      contactPhone: emp.contact_phone || "—",
      contactEmail: emp.contact_email || "—",
      department: emp.department_name || "—",
      departmentId: emp.department_id,
      designation: emp.designation_name || "—",
      designationId: emp.designation_id,
      employmentType: emp.employment_type || "—",
      totalSalary: Number(emp.total_salary) || 0,
      basicSalary: Number(emp.basic_salary) || 0,
      hra: Number(emp.hra) || 0,
      allowances: Number(emp.allowances) || 0,
      managementStaff: emp.management_staff || "No",
      status: emp.is_active === 1 ? "Active" : "Inactive",
      isActive: emp.is_active,
      panNumber: emp.pan_number || "—",
      aadharNumber: emp.aadhar_number || "—",
      pfNumber: emp.pf_number || "—",
      bankName: emp.bank_name || "—",
      bankAccountNo: emp.bank_account_no || "—",
      ifscCode: emp.ifsc_code || "—",
      accountHolderName: emp.account_holder_name || "—",
      bankBranch: emp.bank_branch || "—",
      presentAddress: emp.present_address || "—",
      permanentAddress: emp.permanent_address || "—",
      remarks: emp.remarks || "—",
      photoUrl: emp.photo_url || null,
      createdAt: emp.created_at,
      updatedAt: emp.updated_at
    }));
  }, [reportData]);

  // Tab index navigation - CYCLES BACK TO FIRST
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
          <h1 className="inv-page-title">Employee Report</h1>
          <p className="inv-page-sub">View and analyze employee details</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            className="inv-btn-primary" 
            onClick={handleExport} 
            tabIndex={6}
            disabled={formattedData.length === 0}
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="inv-card" style={{ marginBottom: 16 }}>
        <div className="inv-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
            <div className="inv-field">
              <label className="inv-label">Search Employee</label>
              <input
                type="text"
                className="inv-input"
                tabIndex={1}
                placeholder="Search by name, code, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleResult();
                  }
                }}
              />
            </div>

            <div className="inv-field">
              <label className="inv-label">Department</label>
              <select 
                className="inv-input" 
                tabIndex={2} 
                value={selectedDepartment} 
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedDesignation(""); // Reset designation when department changes
                }}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="inv-field">
              <label className="inv-label">Designation</label>
              <select 
                className="inv-input" 
                tabIndex={3} 
                value={selectedDesignation} 
                onChange={(e) => setSelectedDesignation(e.target.value)}
                disabled={!selectedDepartment}
              >
                <option value="">All Designations</option>
                {designations.map(des => (
                  <option key={des.id} value={des.id}>{des.name}</option>
                ))}
              </select>
              {selectedDepartment && designations.length === 0 && (
                <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  No designations found for this department
                </small>
              )}
            </div>
          </div>
          
          {/* Filter Action Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
            <button className="inv-btn-secondary" onClick={handleReset} tabIndex={4}>
              Reset
            </button>
            <button className="inv-btn-primary" onClick={handleResult} tabIndex={5}>
              Result
            </button>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="inv-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div className="spinner" style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #3b6ef8",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px"
            }} />
            <p style={{ color: "#64748b" }}>Loading employee data...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 40, color: "red" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <p><strong>Error:</strong> {error}</p>
            <button 
              className="inv-btn-primary" 
              onClick={fetchReport}
              style={{ marginTop: 16 }}
            >
              Retry
            </button>
          </div>
        ) : formattedData.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p style={{ color: "#64748b", fontSize: 16 }}>
              {filtersApplied ? "No employees found matching your criteria" : "No employees found"}
            </p>
            {filtersApplied && (
              <button 
                className="inv-btn-secondary" 
                onClick={handleReset}
                style={{ marginTop: 12 }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Employee Code</th>
                  <th>Full Name</th>
                  <th>Date of Birth</th>
                  <th>Date of Joining</th>
                  <th>Gender</th>
                  <th>Phone No</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th style={{ textAlign: "right" }}>Total Salary</th>
                  <th>Management Staff</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {formattedData.map((emp, index) => (
                  <tr key={emp.id || index}>
                    <td className="inv-idx">{String(index + 1).padStart(2, "0")}</td>
                    <td className="inv-bold" style={{ color: "#3b6ef8" }}>{emp.employeeCode}</td>
                    <td className="inv-bold">{emp.fullName}</td>
                    <td>{emp.dateOfBirth}</td>
                    <td>{emp.dateOfJoining}</td>
                    <td>{emp.gender}</td>
                    <td>{emp.contactPhone}</td>
                    <td>{emp.department}</td>
                    <td>{emp.designation}</td>
                    <td style={{ textAlign: "right", fontWeight: 500, color: "#10b981" }}>
                      ₹{fmt(emp.totalSalary)}
                    </td>
                    <td style ={{textAlign:"center"}}>
                      <span className={`inv-badge ${emp.managementStaff === "Yes" ? "inv-badge-yes" : "inv-badge-no"}`}>
                        {emp.managementStaff}
                      </span>
                    </td>
                    <td>
                      <span className={`inv-badge ${emp.status === "Active" ? "inv-badge-yes" : "inv-badge-no"}`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Summary Footer */}
      {!loading && !error && formattedData.length > 0 && (
        <div className="inv-card" style={{ marginTop: 16 }}>
          <div className="inv-card-body">
            <div style={{ display: "flex", gap: 32, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Employees</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formattedData.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Active Employees</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                  {formattedData.filter(e => e.status === "Active").length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Inactive Employees</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>
                  {formattedData.filter(e => e.status === "Inactive").length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Salary</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#3b6ef8" }}>
                  ₹{fmt(formattedData.reduce((sum, e) => sum + e.totalSalary, 0))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Management Staff</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#8b5cf6" }}>
                  {formattedData.filter(e => e.managementStaff === "Yes").length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add spinner animation styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
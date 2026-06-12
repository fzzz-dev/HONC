import { useState, useEffect, useCallback, useRef } from "react";
import { 
  hrEmployeeApi, 
  hrDepartmentApi, 
  hrDesignationApi 
} from "../../services/inventoryApi";

const EMPTY = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "Male",
  contactPhone: "",
  contactEmail: "",
  dateOfJoining: "",
  designationId: "",
  departmentId: "",
  employmentType: "Permanent",
  basicSalary: "",
  hra: "",
  allowances: "",
  panNumber: "",
  aadharNumber: "",
  pfNumber: "",
  bankName: "",
  bankAccountNo: "",
  ifscCode: "",
  presentAddress: "",
  permanentAddress: "",
  remarks: "",
  active: true,
};

const FormGrid = ({ children, cols = 2 }) => (
  <div style={{ 
    display: "grid", 
    gridTemplateColumns: `repeat(${cols}, 1fr)`, 
    gap: "16px" 
  }}>
    {children}
  </div>
);

const Field = ({ label, required, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b" }}>
      {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
    </label>
    {children}
  </div>
);

const Section = ({ title, children }) => (
  <div className="inv-card" style={{ marginBottom: "24px" }}>
    <div style={{ 
      padding: "16px 20px", 
      borderBottom: "1px solid #e2e8f0",
      backgroundColor: "#f8fafc"
    }}>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", margin: 0 }}>
        {title}
      </h3>
    </div>
    <div className="inv-card-body" style={{ padding: "20px" }}>
      {children}
    </div>
  </div>
);

export default function HrEmployee() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list"); // "list" or "form"
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDesignations(selectedDepartment);
    } else {
      setDesignations([]);
    }
  }, [selectedDepartment]);

  async function fetchEmployees() {
    setLoading(true);
    setError(null);
    try {
      const data = await hrEmployeeApi.getAll();
      setEmployees(data);
    } catch (err) {
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartments() {
    try {
      const data = await hrDepartmentApi.getActive();
      setDepartments(data);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  }

  async function fetchDesignations(departmentId) {
    try {
      const data = await hrDesignationApi.getByDepartment(departmentId);
      setDesignations(data);
    } catch (err) {
      console.error("Failed to load designations:", err);
    }
  }

  async function fetchNextCode() {
    try {
      const data = await hrEmployeeApi.getNextCode();
      return data.code;
    } catch (err) {
      return "EMP001";
    }
  }

  const filtered = employees.filter((x) =>
    x.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    x.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    x.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
    x.contactPhone?.includes(search) ||
    x.panNumber?.toLowerCase().includes(search.toLowerCase()) ||
    x.aadharNumber?.includes(search)
  );

  async function openAdd() {
    setForm({ ...EMPTY });
    setSelectedDepartment("");
    setDesignations([]);
    setEditId(null);
    setFormError(null);
    const code = await fetchNextCode();
    setForm(prev => ({ ...prev, employeeCode: code }));
    setView("form");
  }

  function openEdit(row) {
    setForm({
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName || "",
      dateOfBirth: row.dateOfBirth?.split('T')[0] || "",
      gender: row.gender || "Male",
      contactPhone: row.contactPhone || "",
      contactEmail: row.contactEmail || "",
      dateOfJoining: row.dateOfJoining?.split('T')[0] || "",
      designationId: row.designationId || "",
      departmentId: row.departmentId || "",
      employmentType: row.employmentType || "Permanent",
      basicSalary: row.basicSalary || "",
      hra: row.hra || "",
      allowances: row.allowances || "",
      panNumber: row.panNumber || "",
      aadharNumber: row.aadharNumber || "",
      pfNumber: row.pfNumber || "",
      bankName: row.bankName || "",
      bankAccountNo: row.bankAccountNo || "",
      ifscCode: row.ifscCode || "",
      presentAddress: row.presentAddress || "",
      permanentAddress: row.permanentAddress || "",
      remarks: row.remarks || "",
      active: row.isActive,
    });
    setEditId(row.id);
    if (row.departmentId) {
      setSelectedDepartment(row.departmentId);
      fetchDesignations(row.departmentId);
    }
    setView("form");
  }

  const handleSave = useCallback(async () => {
    if (!form.firstName.trim()) {
      return setFormError("First Name is required");
    }
    if (!form.employeeCode) {
      return setFormError("Employee Code is required");
    }

    setFormError(null);
    setSaving(true);

    const payload = {
      employeeCode: form.employeeCode,
      firstName: form.firstName.trim(),
      lastName: form.lastName?.trim() || "",
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender,
      contactPhone: form.contactPhone || null,
      contactEmail: form.contactEmail || null,
      dateOfJoining: form.dateOfJoining || null,
      designationId: form.designationId ? parseInt(form.designationId) : null,
      departmentId: form.departmentId ? parseInt(form.departmentId) : null,
      employmentType: form.employmentType,
      basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : 0,
      hra: form.hra ? parseFloat(form.hra) : 0,
      allowances: form.allowances ? parseFloat(form.allowances) : 0,
      panNumber: form.panNumber || null,
      aadharNumber: form.aadharNumber || null,
      pfNumber: form.pfNumber || null,
      bankName: form.bankName || null,
      bankAccountNo: form.bankAccountNo || null,
      ifscCode: form.ifscCode || null,
      accountHolderName: form.accountHolderName || null, 
      bankBranch: form.bankBranch || null,               
      presentAddress: form.presentAddress || null,
      permanentAddress: form.permanentAddress || null,
      remarks: form.remarks || null,
      isActive: form.active,
    };

    try {
      if (editId) {
        await hrEmployeeApi.update(editId, payload);
      } else {
        await hrEmployeeApi.create(payload);
      }
      await fetchEmployees();
      setSaveSuccessModal(true);
      setTimeout(() => {
        setSaveSuccessModal(false);
        setView("list");
      }, 2000);
    } catch (err) {
      console.error("Save error:", err);
      setFormError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [form, editId]);

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this employee record? This action cannot be undone.")) return;
    try {
      await hrEmployeeApi.remove(id);
      await fetchEmployees();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  const exportToExcel = () => {
    const headers = ["Emp Code", "First Name", "Last Name", "Department", "Designation", "Phone", "Email", "PAN", "Aadhar", "PF No", "Bank Name", "Account No", "IFSC", "Status"];
    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    const rows = filtered.map(emp => {
      return [emp.employeeCode, emp.firstName, emp.lastName || "", emp.departmentName || "", emp.designationName || "", emp.contactPhone || "", emp.contactEmail || "", emp.panNumber || "", emp.aadharNumber || "", emp.pfNumber || "", emp.bankName || "", emp.bankAccountNo || "", emp.ifscCode || "", emp.isActive ? "Active" : "Inactive"].map(escapeCsv).join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "employees.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Employee Master</h1>
            <p className="inv-page-sub">Manage employee records</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={exportToExcel}>
              Export to Excel
            </button>
            <button className="inv-btn-primary" onClick={openAdd}>
              + Add Employee
            </button>
          </div>
        </div>

        {error && (
          <div className="inv-error-banner" style={{ marginBottom: 16 }}>
            {error}{" "}
            <button onClick={fetchEmployees} style={{ marginLeft: 8, textDecoration: "underline" }}>
              Retry
            </button>
          </div>
        )}

        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body">
            <div className="inv-field" style={{ minWidth: 400, maxWidth: 400 }}>
              <label className="inv-label">Search Employee</label>
              <input
                className="inv-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code, phone, PAN or Aadhar..."
              />
            </div>
          </div>
        </div>

        <div className="inv-card">
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table" style={{ minWidth: "1400px" }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Emp Code</th>
                    <th>Full Name</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>PAN</th>
                    <th>Aadhar</th>
                    <th>PF No</th>
                    <th>Bank Name</th>
                    <th>Account No</th>
                    <th>IFSC</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={15} style={{ textAlign: "center", padding: 40 }}>
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, i) => (
                      <tr key={row.id}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td className="inv-bold">{row.employeeCode}</td>
                        <td className="inv-bold">{row.firstName} {row.lastName || ""}</td>
                        <td>{row.departmentName || "—"}</td>
                        <td>{row.designationName || "—"}</td>
                        <td>{row.contactPhone || "—"}</td>
                        <td>{row.contactEmail || "—"}</td>
                        <td>{row.panNumber || "—"}</td>
                        <td>{row.aadharNumber || "—"}</td>
                        <td>{row.pfNumber || "—"}</td>
                        <td>{row.bankName || "—"}</td>
                        <td>{row.bankAccountNo || "—"}</td>
                        <td>{row.ifscCode || "—"}</td>
                        <td>
                          <span className={`inv-badge ${row.isActive ? "inv-badge-yes" : "inv-badge-no"}`}>
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="inv-actions">
                            <button 
                              className="inv-btn-icon" 
                              title="Edit" 
                              onClick={() => openEdit(row)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button 
                              className="inv-btn-icon inv-btn-danger" 
                              title="Delete" 
                              onClick={() => handleDelete(row.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
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
  // FORM VIEW (Full Screen)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">{editId ? "Edit Employee" : "Add New Employee"}</h1>
          <p className="inv-page-sub">Complete employee information below</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            className="inv-btn-secondary" 
            onClick={() => {
              setView("list");
              setFormError(null);
            }}
          >
            Cancel
          </button>
          <button 
            className="inv-btn-primary" 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Employee"}
          </button>
        </div>
      </div>

      {formError && (
        <div className="inv-error-banner" style={{ marginBottom: 16 }}>
          {formError}
        </div>
      )}

      {/* Section 1: Personal Information */}
      <Section title="Personal Information">
        <FormGrid cols={2}>
          <Field label="Employee Code" required>
            <input
              className="inv-input"
              value={form.employeeCode}
              onChange={(v) => setForm((f) => ({ ...f, employeeCode: v.target.value.toUpperCase() }))}
              placeholder="Auto-generated"
              disabled={!!editId}
              style={{ background: editId ? "#f1f5f9" : "white" }}
            />
          </Field>
          <Field label="First Name" required>
            <input
              className="inv-input"
              value={form.firstName}
              onChange={(v) => setForm((f) => ({ ...f, firstName: v.target.value }))}
              placeholder="Enter first name"
            />
          </Field>
          <Field label="Last Name">
            <input
              className="inv-input"
              value={form.lastName}
              onChange={(v) => setForm((f) => ({ ...f, lastName: v.target.value }))}
              placeholder="Enter last name"
            />
          </Field>
          <Field label="Date of Birth">
            <input
              type="date"
              className="inv-input"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </Field>
          <Field label="Gender">
            <select
              className="inv-input"
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Date of Joining">
            <input
              type="date"
              className="inv-input"
              value={form.dateOfJoining}
              onChange={(e) => setForm((f) => ({ ...f, dateOfJoining: e.target.value }))}
            />
          </Field>
        </FormGrid>
      </Section>

      {/* Section 2: Contact Information */}
      <Section title="Contact Information">
        <FormGrid cols={2}>
          <Field label="Contact Phone">
            <input
              className="inv-input"
              value={form.contactPhone}
              onChange={(v) => setForm((f) => ({ ...f, contactPhone: v.target.value }))}
              placeholder="Mobile number"
            />
          </Field>
          <Field label="Contact Email">
            <input
              className="inv-input"
              value={form.contactEmail}
              onChange={(v) => setForm((f) => ({ ...f, contactEmail: v.target.value }))}
              placeholder="Email address"
              type="email"
            />
          </Field>
        </FormGrid>
      </Section>

      {/* Section 3: Employment Details */}
      <Section title="Employment Details">
        <FormGrid cols={2}>
          <Field label="Department">
            <select
              className="inv-input"
              value={form.departmentId}
              onChange={(e) => {
                setForm((f) => ({ ...f, departmentId: e.target.value, designationId: "" }));
                setSelectedDepartment(e.target.value);
              }}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Designation">
            <select
              className="inv-input"
              value={form.designationId}
              onChange={(e) => setForm((f) => ({ ...f, designationId: e.target.value }))}
              disabled={!form.departmentId}
            >
              <option value="">Select Designation</option>
              {designations.map((des) => (
                <option key={des.id} value={des.id}>{des.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Employment Type">
            <select
              className="inv-input"
              value={form.employmentType}
              onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
            >
              <option value="Permanent">Permanent</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="Probation">Probation</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              className="inv-input"
              value={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "true" }))}
            >
              <option value={true}>Active</option>
              <option value={false}>Inactive</option>
            </select>
          </Field>
        </FormGrid>
      </Section>

      {/* Section 4: Compensation */}
      <Section title="Compensation">
        <FormGrid cols={3}>
          <Field label="Basic Salary">
            <input
              className="inv-input"
              value={form.basicSalary}
              onChange={(v) => setForm((f) => ({ ...f, basicSalary: v.target.value }))}
              placeholder="Basic Salary"
              type="number"
              step="0.01"
            />
          </Field>
          <Field label="HRA">
            <input
              className="inv-input"
              value={form.hra}
              onChange={(v) => setForm((f) => ({ ...f, hra: v.target.value }))}
              placeholder="HRA Amount"
              type="number"
              step="0.01"
            />
          </Field>
          <Field label="Allowances">
            <input
              className="inv-input"
              value={form.allowances}
              onChange={(v) => setForm((f) => ({ ...f, allowances: v.target.value }))}
              placeholder="Other Allowances"
              type="number"
              step="0.01"
            />
          </Field>
              <Field label="Total Salary">
                <input
                  className="inv-input"
                  value={((parseFloat(form.basicSalary) || 0) + (parseFloat(form.hra) || 0) + (parseFloat(form.allowances) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  readOnly
                  style={{ 
                    background: "#f1f5f9", 
                    fontWeight: 600, 
                    color: "#3b6ef8",
                    cursor: "not-allowed"
                  }}
                />
              </Field>
          </FormGrid>
      </Section>

      {/* Section 5: Banking Information */}
      <Section title="Banking Information">
        <FormGrid cols={2}>
          <Field label="Account Holder Name">
            <input
              className="inv-input"
              value={form.accountHolderName || ""}
              onChange={(v) => setForm((f) => ({ ...f, accountHolderName: v.target.value }))}
              placeholder="Account holder name"
            />
          </Field>
          <Field label="Bank Name">
            <input
              className="inv-input"
              value={form.bankName}
              onChange={(v) => setForm((f) => ({ ...f, bankName: v.target.value }))}
              placeholder="Bank Name"
            />
          </Field>
          <Field label="Bank Branch">
            <input
              className="inv-input"
              value={form.bankBranch || ""}
              onChange={(v) => setForm((f) => ({ ...f, bankBranch: v.target.value }))}
              placeholder="Bank branch name"
            />
          </Field>
          <Field label="Bank Account No">
            <input
              className="inv-input"
              value={form.bankAccountNo}
              onChange={(v) => setForm((f) => ({ ...f, bankAccountNo: v.target.value }))}
              placeholder="Account Number"
            />
          </Field>
          <Field label="IFSC Code">
            <input
              className="inv-input"
              value={form.ifscCode}
              onChange={(v) => setForm((f) => ({ ...f, ifscCode: v.target.value.toUpperCase() }))}
              placeholder="IFSC Code"
            />
          </Field>
        </FormGrid>
      </Section>

      {/* Section 6: Identification Documents */}
      <Section title="Identification Documents">
        <FormGrid cols={2}>
          <Field label="PAN Number">
            <input
              className="inv-input"
              value={form.panNumber}
              onChange={(v) => setForm((f) => ({ ...f, panNumber: v.target.value.toUpperCase() }))}
              placeholder="PAN Card Number"
            />
          </Field>
          <Field label="Aadhar Number">
            <input
              className="inv-input"
              value={form.aadharNumber}
              onChange={(v) => setForm((f) => ({ ...f, aadharNumber: v.target.value }))}
              placeholder="Aadhar Number"
            />
          </Field>
          <Field label="PF Number">
            <input
              className="inv-input"
              value={form.pfNumber}
              onChange={(v) => setForm((f) => ({ ...f, pfNumber: v.target.value.toUpperCase() }))}
              placeholder="PF Account Number"
            />
          </Field>
        </FormGrid>
      </Section>

      {/* Section 7: Address Information */}
      <Section title="Address Information">
        <FormGrid cols={1}>
          <Field label="Present Address">
            <textarea
              className="inv-input"
              rows={3}
              value={form.presentAddress}
              onChange={(e) => setForm((f) => ({ ...f, presentAddress: e.target.value }))}
              placeholder="Current Address"
              style={{ resize: "vertical" }}
            />
          </Field>
          <Field label="Permanent Address">
            <textarea
              className="inv-input"
              rows={3}
              value={form.permanentAddress}
              onChange={(e) => setForm((f) => ({ ...f, permanentAddress: e.target.value }))}
              placeholder="Permanent Address"
              style={{ resize: "vertical" }}
            />
          </Field>
          <Field label="Remarks">
            <textarea
              className="inv-input"
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="Additional remarks"
              style={{ resize: "vertical" }}
            />
          </Field>
        </FormGrid>
      </Section>

      {/* Success Modal */}
      {saveSuccessModal && (
        <div className="inv-modal-overlay" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "400px",
            width: "90%",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 48, color: "#10b981", marginBottom: 16 }}>✓</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Saved Successfully!</h3>
            <p style={{ color: "#64748b", marginBottom: 20 }}>The employee record has been saved.</p>
            <button 
              className="inv-btn-primary" 
              onClick={() => {
                setSaveSuccessModal(false);
                setView("list");
              }}
            >
              Back to List
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
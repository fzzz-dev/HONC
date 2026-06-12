import { useState, useEffect } from "react";
import Modal from "../../components/Modal";
import { Field, Input, Toggle } from "../../components/FormFields";
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

export default function HrEmployee() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");

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
      console.log("Fetched employees:", data);
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

  function openAdd() {
    setForm({ ...EMPTY });
    setSelectedDepartment("");
    setDesignations([]);
    setModal({ mode: "add" });
    fetchNextCode().then(code => {
      setForm(prev => ({ ...prev, employeeCode: code }));
    });
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
    setModal({ mode: "edit", id: row.id });
    if (row.departmentId) {
      setSelectedDepartment(row.departmentId);
      fetchDesignations(row.departmentId);
    }
  }

  async function handleSave() {
    if (!form.firstName.trim()) return alert("First Name is required");
    if (!form.employeeCode) return alert("Employee Code is required");
    
    setSaving(true);
    try {
      const isAdd = modal.mode === "add";
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
        presentAddress: form.presentAddress || null,
        permanentAddress: form.permanentAddress || null,
        remarks: form.remarks || null,
        isActive: form.active,
      };
      
      if (isAdd) {
        await hrEmployeeApi.create(payload);
      } else {
        await hrEmployeeApi.update(modal.id, payload);
      }
      
      await fetchEmployees();
      
      setModal(null);
      setSelectedDepartment("");
    } catch (err) {
      console.error("Save error:", err);
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await hrEmployeeApi.remove(id);
      await fetchEmployees();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Employee Master</h1>
          <p className="inv-page-sub">Manage employee records</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add Employee
        </button>
      </div>

      {error && (
        <div className="inv-error-banner">
          {error}{" "}
          <button onClick={fetchEmployees} style={{ marginLeft: 8, textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search by name, code, phone, PAN or Aadhar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="inv-count">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="inv-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="inv-table" style={{ minWidth: '1200px' }}>
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
                {loading ? (
                  <tr><td colSpan={15} className="inv-empty">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={15} className="inv-empty">No records found</td></tr>
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
                          <button className="inv-btn-icon" title="Edit" onClick={() => openEdit(row)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="inv-btn-icon inv-btn-danger" title="Delete" onClick={() => setDeleteConfirm(row.id)}>
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
        </div>
      </div>

      {/* Modal - Same as before */}
      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add Employee" : "Edit Employee"}
          onClose={() => {
            setModal(null);
            setSelectedDepartment("");
          }}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
          size="large"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <Field label="Employee Code" required>
                <Input
                  value={form.employeeCode}
                  onChange={(v) => setForm((f) => ({ ...f, employeeCode: v.toUpperCase() }))}
                  placeholder="Auto-generated"
                  disabled={modal.mode === "edit"}
                />
              </Field>
              <Field label="First Name" required>
                <Input
                  value={form.firstName}
                  onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                  placeholder="Enter first name"
                />
              </Field>
              <Field label="Last Name">
                <Input
                  value={form.lastName}
                  onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
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
              <Field label="Contact Phone">
                <Input
                  value={form.contactPhone}
                  onChange={(v) => setForm((f) => ({ ...f, contactPhone: v }))}
                  placeholder="Mobile number"
                />
              </Field>
              <Field label="Contact Email">
                <Input
                  value={form.contactEmail}
                  onChange={(v) => setForm((f) => ({ ...f, contactEmail: v }))}
                  placeholder="Email address"
                  type="email"
                />
              </Field>
              <Field label="Date of Joining">
                <input
                  type="date"
                  className="inv-input"
                  value={form.dateOfJoining}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfJoining: e.target.value }))}
                />
              </Field>
              <Field label="PAN Number">
                <Input
                  value={form.panNumber}
                  onChange={(v) => setForm((f) => ({ ...f, panNumber: v.toUpperCase() }))}
                  placeholder="PAN Card Number"
                />
              </Field>
              <Field label="Aadhar Number">
                <Input
                  value={form.aadharNumber}
                  onChange={(v) => setForm((f) => ({ ...f, aadharNumber: v }))}
                  placeholder="Aadhar Number"
                />
              </Field>
              <Field label="PF Number">
                <Input
                  value={form.pfNumber}
                  onChange={(v) => setForm((f) => ({ ...f, pfNumber: v.toUpperCase() }))}
                  placeholder="PF Account Number"
                />
              </Field>
            </div>

            <div>
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
              <Field label="Basic Salary">
                <Input
                  value={form.basicSalary}
                  onChange={(v) => setForm((f) => ({ ...f, basicSalary: v }))}
                  placeholder="Basic Salary"
                  type="number"
                />
              </Field>
              <Field label="HRA">
                <Input
                  value={form.hra}
                  onChange={(v) => setForm((f) => ({ ...f, hra: v }))}
                  placeholder="HRA Amount"
                  type="number"
                />
              </Field>
              <Field label="Allowances">
                <Input
                  value={form.allowances}
                  onChange={(v) => setForm((f) => ({ ...f, allowances: v }))}
                  placeholder="Other Allowances"
                  type="number"
                />
              </Field>
              <Field label="Bank Name">
                <Input
                  value={form.bankName}
                  onChange={(v) => setForm((f) => ({ ...f, bankName: v }))}
                  placeholder="Bank Name"
                />
              </Field>
              <Field label="Bank Account No">
                <Input
                  value={form.bankAccountNo}
                  onChange={(v) => setForm((f) => ({ ...f, bankAccountNo: v }))}
                  placeholder="Account Number"
                />
              </Field>
              <Field label="IFSC Code">
                <Input
                  value={form.ifscCode}
                  onChange={(v) => setForm((f) => ({ ...f, ifscCode: v.toUpperCase() }))}
                  placeholder="IFSC Code"
                />
              </Field>
            </div>
          </div>

          <hr style={{ margin: "16px 0" }} />

          <Field label="Present Address">
            <textarea
              className="inv-input"
              rows={2}
              value={form.presentAddress}
              onChange={(e) => setForm((f) => ({ ...f, presentAddress: e.target.value }))}
              placeholder="Current Address"
            />
          </Field>
          <Field label="Permanent Address">
            <textarea
              className="inv-input"
              rows={2}
              value={form.permanentAddress}
              onChange={(e) => setForm((f) => ({ ...f, permanentAddress: e.target.value }))}
              placeholder="Permanent Address"
            />
          </Field>
          <Field label="Remarks">
            <textarea
              className="inv-input"
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="Additional remarks"
            />
          </Field>
          <Field label="Status">
            <Toggle
              value={form.active}
              onChange={(v) => setForm((f) => ({ ...f, active: v }))}
              label="Active"
            />
          </Field>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this employee record? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
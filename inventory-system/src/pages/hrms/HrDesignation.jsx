import { useState, useEffect } from "react";
import Modal from "../../components/Modal";
import { Field, Input, Toggle } from "../../components/FormFields";
import { hrDesignationApi, hrSubDepartmentApi, hrDepartmentApi } from "../../services/inventoryApi";

const EMPTY = { subDepartmentId: "", name: "", level: "", responsibilities: "", active: true };

export default function HrDesignation() {
  const [designations, setDesignations] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  useEffect(() => {
    fetchDesignations();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchSubDepartments(selectedDepartment);
    } else {
      setSubDepartments([]);
    }
  }, [selectedDepartment]);

  async function fetchDesignations() {
    setLoading(true);
    setError(null);
    try {
      const data = await hrDesignationApi.getAll();
      setDesignations(data);
    } catch (err) {
      setError(err.message || "Failed to load designations");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartments() {
    try {
      const data = await hrDepartmentApi.getActive();
      setDepartments(data);
    } catch (err) {

    }
  }

  async function fetchSubDepartments(departmentId) {
    try {
      const data = await hrSubDepartmentApi.getByDepartment(departmentId);
      setSubDepartments(data);
    } catch (err) {

    }
  }

  const filtered = designations.filter((x) =>
    x.name.toLowerCase().includes(search.toLowerCase()) ||
    (x.subDepartmentName && x.subDepartmentName.toLowerCase().includes(search.toLowerCase())) ||
    (x.departmentName && x.departmentName.toLowerCase().includes(search.toLowerCase()))
  );

  function openAdd() {
    setForm({ ...EMPTY });
    setSelectedDepartment("");
    setSubDepartments([]);
    setModal({ mode: "add" });
  }

  function openEdit(row) {
  setForm({
    subDepartmentId: row.subDepartmentId,
    name: row.name,
    level: row.level || "",
    responsibilities: row.responsibilities || "",
    active: row.isActive,
  });
  setModal({ mode: "edit", id: row.id });
  
  // Find and set the department from the subDepartmentName
  if (row.subDepartmentName) {
    // Find which department this sub-department belongs to
    // You need to fetch department ID from sub-department name
    const findDepartment = async () => {
      const allDepts = await hrDepartmentApi.getActive();
      // This assumes you have a way to match sub-department to department
      // For now, we'll fetch sub-department details
      try {
        const subDeptData = await hrSubDepartmentApi.getOne(row.subDepartmentId);
        if (subDeptData && subDeptData.departmentId) {
          setSelectedDepartment(subDeptData.departmentId);
          fetchSubDepartments(subDeptData.departmentId);
        }
      } catch (err) {

      }
    };
    findDepartment();
  }
}

 async function handleSave() {
  if (!form.subDepartmentId) return alert("Please select a sub-department");
  if (!form.name.trim()) return alert("Designation name is required");
  setSaving(true);
  try {
    const isAdd = modal.mode === "add";
    const payload = {
      subDepartmentId: parseInt(form.subDepartmentId),
      name: form.name.trim(),
      level: form.level ? parseInt(form.level) : null,
      responsibilities: form.responsibilities?.trim() || "",
      isActive: form.active,
    };
    
    if (isAdd) {
      await hrDesignationApi.create(payload);
    } else {
      await hrDesignationApi.update(modal.id, payload);
    }
    
    // Refresh the list after save to get department and sub-department names
    await fetchDesignations();
    
    setModal(null);
    setSelectedDepartment("");
  } catch (err) {
    alert(err.message || "Save failed");
  } finally {
    setSaving(false);
  }
}

  async function handleDelete(id) {
    try {
      await hrDesignationApi.remove(id);
      setDesignations((prev) => prev.filter((x) => x.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Designation</h1>
          <p className="inv-page-sub">Manage job titles / designations</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add
        </button>
      </div>

      {error && (
        <div className="inv-error-banner">
          {error}{" "}
          <button onClick={fetchDesignations} style={{ marginLeft: 8, textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search by name, sub-department or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="inv-count">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Department</th>
                  <th>Sub Department</th>
                  <th>Designation</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="inv-empty">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="inv-empty">No records found</td></tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={row.id}>
                      <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                      <td>{row.departmentName || "—"}</td>
                      <td>{row.subDepartmentName || "—"}</td>
                      <td className="inv-bold">{row.name}</td>
                      <td className="inv-muted-sm">{row.level || "—"}</td>
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

      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add Designation" : "Edit Designation"}
          onClose={() => {
            setModal(null);
            setSelectedDepartment("");
          }}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          <Field label="Department" required>
            <select
              className="inv-input"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
              ))}
            </select>
          </Field>
          <Field label="Sub Department" required>
            <select
              className="inv-input"
              value={form.subDepartmentId}
              onChange={(e) => setForm((f) => ({ ...f, subDepartmentId: e.target.value }))}
              disabled={!selectedDepartment}
            >
              <option value="">Select Sub Department</option>
              {subDepartments.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
              ))}
            </select>
          </Field>
          <Field label="Designation Name" required>
            <Input
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g., Software Engineer, HR Manager"
            />
          </Field>
          <Field label="Level">
            <Input
              value={form.level}
              onChange={(v) => setForm((f) => ({ ...f, level: v }))}
              placeholder="Level number (e.g., 1, 2, 3)"
              type="number"
            />
          </Field>
          <Field label="Responsibilities">
            <Input
              value={form.responsibilities}
              onChange={(v) => setForm((f) => ({ ...f, responsibilities: v }))}
              placeholder="Key responsibilities (optional)"
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
            Are you sure you want to delete this designation? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
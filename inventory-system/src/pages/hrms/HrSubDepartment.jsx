import { useState, useEffect } from "react";
import Modal from "../../components/Modal";
import { Field, Input, Toggle } from "../../components/FormFields";
import { hrSubDepartmentApi, hrDepartmentApi } from "../../services/inventoryApi";

const EMPTY = { departmentId: "", name: "", code: "", description: "", active: true };

export default function HrSubDepartment() {
  const [subDepartments, setSubDepartments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
  fetchSubDepartments();
  fetchDepartments();
}, []);

// Refresh departments when modal closes (after adding new department)
useEffect(() => {
  if (!modal) {
    fetchDepartments();
  }
}, [modal]);

  async function fetchSubDepartments() {
    setLoading(true);
    setError(null);
    try {
      const data = await hrSubDepartmentApi.getAll();
      setSubDepartments(data);
    } catch (err) {
      setError(err.message || "Failed to load sub-departments");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartments() {
  try {
    const data = await hrDepartmentApi.getActive();
    console.log("Fetched departments:", data); // Add this log
    setDepartments(data);
  } catch (err) {

  }
}

  const filtered = subDepartments.filter((x) =>
    x.name.toLowerCase().includes(search.toLowerCase()) ||
    x.code.toLowerCase().includes(search.toLowerCase()) ||
    (x.departmentName && x.departmentName.toLowerCase().includes(search.toLowerCase()))
  );

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      departmentId: row.departmentId,
      name: row.name,
      code: row.code,
      description: row.description || "",
      active: row.isActive,
    });
    setModal({ mode: "edit", id: row.id });
  }

  async function handleSave() {
  if (!form.departmentId) return alert("Please select a department");
  if (!form.name.trim()) return alert("Sub department name is required");
  if (!form.code.trim()) return alert("Sub department code is required");
  setSaving(true);
  try {
    const isAdd = modal.mode === "add";
    const payload = {
      departmentId: parseInt(form.departmentId),
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description?.trim() || "",
      isActive: form.active,
    };
    
    if (isAdd) {
      await hrSubDepartmentApi.create(payload);
    } else {
      await hrSubDepartmentApi.update(modal.id, payload);
    }
    
    // Refresh both lists after save
    await fetchSubDepartments();  // This will reload with department names
    await fetchDepartments();
    
    setModal(null);
  } catch (err) {
    alert(err.message || "Save failed");
  } finally {
    setSaving(false);
  }
}

  async function handleDelete(id) {
    try {
      await hrSubDepartmentApi.remove(id);
      setSubDepartments((prev) => prev.filter((x) => x.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Sub Department</h1>
          <p className="inv-page-sub">Manage sub-departments under main departments</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add
        </button>
      </div>

      {error && (
        <div className="inv-error-banner">
          {error}{" "}
          <button onClick={fetchSubDepartments} style={{ marginLeft: 8, textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search by name, code or department..."
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
                  <th>Code</th>
                  <th>Department</th>
                  <th>Name</th>
                  <th>Description</th>
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
                      <td className="inv-bold">{row.code}</td>
                      <td><span className="inv-badge-info">{row.departmentName || "—"}</span></td>
                      <td className="inv-bold">{row.name}</td>
                      <td className="inv-muted-sm">{row.description || "—"}</td>
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
          title={modal.mode === "add" ? "Add Sub Department" : "Edit Sub Department"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          <Field label="Parent Department" required>
            <select
              className="inv-input"
              value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
              ))}
            </select>
          </Field>
          <Field label="Code" required>
            <Input
              value={form.code}
              onChange={(v) => setForm((f) => ({ ...f, code: v.toUpperCase() }))}
              placeholder="e.g., HR-REC, IT-DEV"
            />
          </Field>
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Enter sub department name"
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Description (optional)"
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
            Are you sure you want to delete this sub-department? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
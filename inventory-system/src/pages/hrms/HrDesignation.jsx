import { useState, useEffect } from "react";
import Modal from "../../components/Modal";
import { Field, Input } from "../../components/FormFields";
import { hrDesignationApi, hrDepartmentApi } from "../../services/inventoryApi";

const EMPTY = { departmentId: "", name: "", level: "", responsibilities: "", isActive: true };

export default function HrDesignation() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDesignations();
    fetchDepartments();
  }, []);

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
      console.error("Failed to fetch departments:", err);
    }
  }

  const filtered = designations.filter((x) =>
    x.name.toLowerCase().includes(search.toLowerCase()) ||
    (x.departmentName && x.departmentName.toLowerCase().includes(search.toLowerCase()))
  );

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      departmentId: row.departmentId || "",
      name: row.name,
      level: row.level || "",
      responsibilities: row.responsibilities || "",
      isActive: row.isActive !== undefined ? row.isActive : true,
    });
    setModal({ mode: "edit", id: row.id });
  }

  async function handleSave() {
    if (!form.departmentId) return alert("Please select a department");
    if (!form.name.trim()) return alert("Designation name is required");
    setSaving(true);
    try {
      const isAdd = modal.mode === "add";
      const payload = {
        departmentId: parseInt(form.departmentId),
        name: form.name.trim(),
        level: form.level ? parseInt(form.level) : null,
        responsibilities: form.responsibilities?.trim() || "",
        isActive: form.isActive,
      };
      
      if (isAdd) {
        await hrDesignationApi.create(payload);
      } else {
        await hrDesignationApi.update(modal.id, payload);
      }
      
      await fetchDesignations();
      setModal(null);
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
              placeholder="Search by name or department..."
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
                  <th>Designation</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="inv-empty">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="inv-empty">No records found</td></tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={row.id}>
                      <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                      <td>{row.departmentName || "—"}</td>
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
          }}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          <Field label="Department" required>
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "#64748b" }}>Active</span>
              <label className="inv-toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <span className="inv-toggle-slider"></span>
              </label>
              <span style={{ fontSize: "13px", color: form.isActive ? "#10b981" : "#ef4444" }}>
                {form.isActive ? "Yes" : "No"}
              </span>
            </div>
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
import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import { Field, Input, Toggle, SearchSelect } from "../components/FormFields";
import { issueTypeApi } from "../services/inventoryApi";

const EMPTY = { issueType: "", descriptions: [], active: true };

export default function IssueTypePage() {
  const [issueTypes, setIssueTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch all issue types ──────────────────────────────────────────────────
  useEffect(() => {
    fetchIssueTypes();
  }, []);

  async function fetchIssueTypes() {
    setLoading(true);
    setError(null);
    try {
      const data = await issueTypeApi.getAll();
      setIssueTypes(data);
    } catch (err) {
      setError(err.message || "Failed to load issue types");
    } finally {
      setLoading(false);
    }
  }

  const filtered = issueTypes.filter((x) =>
    x.issueType.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY, descriptions: [] });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      issueType: row.issueType,
      descriptions: row.descriptions?.map(d => ({ description: d.description })) || [],
      active: row.active,
    });
    setModal({ mode: "edit", id: row.id || row._id });
  }

  // ── Description management ─────────────────────────────────────────────────
  function addDescriptionRow() {
    setForm((f) => ({
      ...f,
      descriptions: [...f.descriptions, { description: "" }],
    }));
  }

  function updateDescription(index, value) {
    setForm((f) => ({
      ...f,
      descriptions: f.descriptions.map((desc, i) =>
        i === index ? { description: value } : desc
      ),
    }));
  }

  function removeDescription(index) {
    setForm((f) => ({
      ...f,
      descriptions: f.descriptions.filter((_, i) => i !== index),
    }));
  }

  // ── Save (Add / Edit) ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.issueType.trim()) return alert("Issue Type is required");
    
    const validDescriptions = form.descriptions.filter(d => d.description.trim());
    if (validDescriptions.length === 0) {
      return alert("At least one description is required");
    }
    
    setSaving(true);
    try {
      const isAdd = modal.mode === "add";
      const payload = {
        issueType: form.issueType.trim(),
        descriptions: validDescriptions.map(d => d.description.trim()),
        active: form.active,
      };
      const saved = isAdd
        ? await issueTypeApi.create(payload)
        : await issueTypeApi.update(modal.id, payload);

      if (isAdd) {
        setIssueTypes((prev) => [...prev, saved]);
      } else {
        setIssueTypes((prev) =>
          prev.map((x) => ((x.id || x._id) === modal.id ? saved : x)),
        );
      }
      setModal(null);
    } catch (err) {
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    try {
      await issueTypeApi.remove(id);
      setIssueTypes((prev) => prev.filter((x) => (x.id || x._id) !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Issue Type</h1>
          <p className="inv-page-sub">Manage issue types with multiple descriptions</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add
        </button>
      </div>

      {error && (
        <div className="inv-error-banner">
          {error}{" "}
          <button onClick={fetchIssueTypes} style={{ marginLeft: 8, textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search issue type..."
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
                  <th>Issue Type</th>
                  <th>Descriptions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="inv-empty">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="inv-empty">No records found</td></tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={row.id || row._id}>
                      <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                      <td className="inv-bold">{row.issueType}</td>
                      <td>
                        {/* Dropdown for descriptions */}
                        <select 
                          className="inv-input" 
                          style={{ width: "100%", padding: "4px 8px" }}
                          value=""
                          onChange={(e) => {
                            // Handle selection if needed
                            console.log("Selected:", e.target.value);
                          }}
                        >
                          <option value="" disabled>Select description</option>
                          {row.descriptions?.map((desc, idx) => (
                            <option key={idx} value={desc.description}>
                              {desc.description}
                            </option>
                          ))}
                          {(!row.descriptions || row.descriptions.length === 0) && (
                            <option disabled>No descriptions</option>
                          )}
                        </select>
                      </td>
                      <td>
                        <span className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}>
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="inv-actions">
                          <button className="inv-btn-icon" title="Edit" onClick={() => openEdit(row)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="inv-btn-icon inv-btn-danger" title="Delete" onClick={() => setDeleteConfirm(row.id || row._id)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add Issue Type" : "Edit Issue Type"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          <Field label="Issue Type" required>
            <Input
              value={form.issueType}
              onChange={(v) => setForm((f) => ({ ...f, issueType: v }))}
              placeholder="Enter issue type (e.g., General, Product)"
            />
          </Field>

          <Field label="Descriptions" required>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 12 }}>
              {form.descriptions.map((desc, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Input
                    value={desc.description}
                    onChange={(v) => updateDescription(idx, v)}
                    placeholder={`Description ${idx + 1}`}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="inv-btn-icon inv-btn-danger"
                    onClick={() => removeDescription(idx)}
                    disabled={form.descriptions.length === 1}
                    style={{ padding: "0 8px" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="inv-btn-secondary inv-btn-sm"
                onClick={addDescriptionRow}
                style={{ marginTop: 8 }}
              >
                + Add Description
              </button>
            </div>
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

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this issue type? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
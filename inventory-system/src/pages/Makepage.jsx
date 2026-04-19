import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import { Field, Input, Toggle } from "../components/FormFields";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const EMPTY = { name: "", description: "", active: true };

export default function MakePage() {
  const [makes, setMakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch all makes ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMakes();
  }, []);

  async function fetchMakes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/makes`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setMakes(data.data);
    } catch (err) {
      setError(err.message || "Failed to load makes");
    } finally {
      setLoading(false);
    }
  }

  const filtered = makes.filter((x) =>
    x.name.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      description: row.description || "",
      active: row.active,
    });
    setModal({ mode: "edit", id: row._id });
  }

  // ── Save (Add / Edit) ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) return alert("Name is required");
    setSaving(true);
    try {
      const isAdd = modal.mode === "add";
      const url = isAdd ? `${API_BASE}/makes` : `${API_BASE}/makes/${modal.id}`;
      const method = isAdd ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      if (isAdd) {
        setMakes((prev) => [...prev, data.data]);
      } else {
        setMakes((prev) =>
          prev.map((x) => (x._id === modal.id ? data.data : x)),
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
      const res = await fetch(`${API_BASE}/makes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setMakes((prev) => prev.filter((x) => x._id !== id));
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
          <h1 className="inv-page-title">Make</h1>
          <p className="inv-page-sub">Manage makes / brands</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add
        </button>
      </div>

      {error && (
        <div className="inv-error-banner">
          {error}{" "}
          <button
            onClick={fetchMakes}
            style={{ marginLeft: 8, textDecoration: "underline" }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search..."
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
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="inv-empty">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={row._id}>
                      <td className="inv-idx">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="inv-bold">{row.name}</td>
                      <td className="inv-muted-sm">{row.description}</td>
                      <td>
                        <span
                          className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
                        >
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="inv-actions">
                          {/* Edit */}
                          <button
                            className="inv-btn-icon"
                            title="Edit"
                            onClick={() => openEdit(row)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            className="inv-btn-icon inv-btn-danger"
                            title="Delete"
                            onClick={() => setDeleteConfirm(row._id)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
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
          title={modal.mode === "add" ? "Add Make" : "Edit Make"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Enter make / brand name"
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

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this record? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

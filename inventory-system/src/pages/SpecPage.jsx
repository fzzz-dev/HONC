import { useState, useEffect } from "react";
import Modal from "../components/Modal";
import { Field, Input, Toggle } from "../components/FormFields";
import { specApi } from "../services/inventoryApi";

const EMPTY = { name: "", active: true };

export default function SpecPage() {
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSpecs();
  }, []);

  async function fetchSpecs() {
    setLoading(true);
    setError(null);
    try {
      const data = await specApi.getAll();
      setSpecs(data);
    } catch (err) {
      setError(err.message || "Failed to load specs");
    } finally {
      setLoading(false);
    }
  }

  const filtered = specs.filter((x) =>
    x.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }
  function openEdit(row) {
    setForm({ name: row.name, active: row.active });
    setModal({ mode: "edit", id: row.id || row._id });
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Name is required");
    setSaving(true);
    try {
      const isAdd = modal.mode === "add";
      const payload = { name: form.name.trim(), active: form.active };
      const saved = isAdd
        ? await specApi.create(payload)
        : await specApi.update(modal.id, payload);

      if (isAdd) setSpecs((prev) => [...prev, saved]);
      else
        setSpecs((prev) =>
          prev.map((x) => ((x.id || x._id) === modal.id ? saved : x)),
        );

      setModal(null);
    } catch (err) {
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await specApi.remove(id);
      setSpecs((prev) => prev.filter((x) => (x.id || x._id) !== id));
      setDeleteConfirm(null);

    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Spec Name</h1>
          <p className="inv-page-sub">Manage specifications</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add
        </button>
      </div>

      {error && (
        <div className="inv-error-banner">
          {error}{" "}
          <button
            onClick={fetchSpecs}
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
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="inv-empty">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={row.id || row._id}>

                      <td className="inv-idx">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="inv-bold">{row.name}</td>
                      <td>
                        <span
                          className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
                        >
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="inv-actions">
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
                          <button
                            className="inv-btn-icon inv-btn-danger"
                            title="Delete"
                            onClick={() => setDeleteConfirm(row.id || row._id)}
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

      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add Spec Name" : "Edit Spec Name"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Enter specification name"
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
            Are you sure you want to delete this record? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

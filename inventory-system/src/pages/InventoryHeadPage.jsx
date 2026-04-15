import { useState } from "react";
import Modal from "../components/Modal";
import { Field, Input, Toggle } from "../components/FormFields";

const EMPTY = { headName: "", active: true };

export default function InventoryHeadPage({ heads, setHeads }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filtered = heads.filter((h) =>
    h.headName.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }
  function openEdit(row) {
    setForm({ ...row });
    setModal({ mode: "edit", id: row.id });
  }

  function handleSave() {
    if (!form.headName.trim()) return alert("Head Name is required");
    if (modal.mode === "add") {
      setHeads((prev) => [...prev, { ...form, id: Date.now() }]);
    } else {
      setHeads((prev) =>
        prev.map((h) => (h.id === modal.id ? { ...form, id: modal.id } : h)),
      );
    }
    setModal(null);
  }

  function handleDelete(id) {
    setHeads((prev) => prev.filter((h) => h.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Inventory head</h1>
          <p className="inv-page-sub">
            Define inventory heads and their default fields
          </p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add Head
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search heads..."
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
                  <th>Head name</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                )}
                {filtered.map((row, i) => (
                  <tr key={row.id}>
                    <td className="inv-idx">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="inv-bold">{row.headName}</td>
                    <td>
                      <span
                        className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
                      >
                        {row.active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <div className="inv-actions">
                        {/* Edit icon */}
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

                        {/* Delete icon */}
                        <button
                          className="inv-btn-icon inv-btn-danger"
                          title="Delete"
                          onClick={() => setDeleteConfirm(row.id)}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <Modal
          title={
            modal.mode === "add" ? "Add inventory head" : "Edit inventory head"
          }
          onClose={() => setModal(null)}
          onSave={handleSave}
        >
          <Field label="Head Name" required>
            <Input
              value={form.headName}
              onChange={(v) => setForm((f) => ({ ...f, headName: v }))}
              placeholder="e.g. Raw Materials"
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
          title="Confirm delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this inventory head? This action
            cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

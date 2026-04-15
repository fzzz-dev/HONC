import { useState } from "react";
import Modal from "../components/Modal";
import {
  Field,
  Input,
  Select,
  Toggle,
  FormGrid,
} from "../components/FormFields";

const EMPTY = { headId: "", headName: "", groupName: "", active: true };

export default function MainCategoryPage({ categories, setCategories, heads }) {
  const [search, setSearch] = useState("");
  const [filterHead, setFilterHead] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const headOptions = heads.map((h) => ({
    value: String(h.id),
    label: h.headName,
  }));

  const filtered = categories.filter((c) => {
    const matchSearch =
      c.groupName.toLowerCase().includes(search.toLowerCase()) ||
      c.headName.toLowerCase().includes(search.toLowerCase());
    const matchHead = !filterHead || String(c.headId) === filterHead;
    return matchSearch && matchHead;
  });

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({ ...row, headId: String(row.headId) });
    setModal({ mode: "edit", id: row.id });
  }

  function handleHeadChange(val) {
    const head = heads.find((h) => String(h.id) === val);
    setForm((f) => ({
      ...f,
      headId: val,
      headName: head ? head.headName : "",
    }));
  }

  function handleSave() {
    if (!form.headId) return alert("Head is required");
    if (!form.groupName.trim()) return alert("Group Name is required");
    if (modal.mode === "add") {
      setCategories((prev) => [
        ...prev,
        { ...form, headId: Number(form.headId), id: Date.now() },
      ]);
    } else {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === modal.id
            ? { ...form, headId: Number(form.headId), id: modal.id }
            : c,
        ),
      );
    }
    setModal(null);
  }

  function handleDelete(id) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Main Category</h1>
          <p className="inv-page-sub">
            Manage item categories organized by head and group
          </p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add Category
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-toolbar">
          <input
            className="inv-search"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="inv-filter-select"
            value={filterHead}
            onChange={(e) => setFilterHead(e.target.value)}
          >
            <option value="">All Heads</option>
            {heads.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.headName}
              </option>
            ))}
          </select>
          <span className="inv-count">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Head Name</th>
                <th>Group Name</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="inv-empty">
                    No records found
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => (
                <tr key={row.id}>
                  <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                  <td className="inv-muted-sm">{row.headName}</td>
                  <td className="inv-bold">{row.groupName}</td>
                  <td>
                    <span
                      className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
                    >
                      {row.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <div className="inv-actions">
                      <button
                        className="inv-btn-icon"
                        onClick={() => openEdit(row)}
                      >
                        {" "}
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

      {modal && (
        <Modal
          title={
            modal.mode === "add" ? "Add Main Category" : "Edit Main Category"
          }
          onClose={() => setModal(null)}
          onSave={handleSave}
        >
          <FormGrid>
            <Field label="Head Name" required>
              <Select
                value={form.headId}
                onChange={handleHeadChange}
                options={headOptions}
                placeholder="Select head..."
              />
            </Field>
            <Field label="Group Name" required>
              <Input
                value={form.groupName}
                onChange={(v) => setForm((f) => ({ ...f, groupName: v }))}
                placeholder="e.g. Metals"
              />
            </Field>
          </FormGrid>
          <Field label="Status">
            <Toggle
              value={form.active}
              onChange={(v) => setForm((f) => ({ ...f, active: v }))}
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
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Are you sure you want to delete this category? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

import { useState, useRef } from "react";
import Modal from "../components/Modal";
import {
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
  FormGrid,
} from "../components/FormFields";
import { UOM_OPTIONS } from "../data/initialData";

const EMPTY = {
  headId: "",
  head: "",
  group: "",
  subCategory: "",
  itemName: "",
  uom: "",
  make: "",
  spec: "",
  itemDescription: "",
  rate: "",
  active: true,
  image: null,
};

export default function ItemPage({ items, setItems, heads, categories }) {
  const [search, setSearch] = useState("");
  const [filterHead, setFilterHead] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileRef = useRef();

  const groupOptions = categories
    .filter((c) => !filterHead || String(c.headId) === filterHead)
    .map((c) => c.groupName)
    .filter((v, i, a) => a.indexOf(v) === i);

  const modalGroupOptions = categories
    .filter((c) => !form.headId || String(c.headId) === form.headId)
    .map((c) => c.groupName)
    .filter((v, i, a) => a.indexOf(v) === i);

  const filtered = items.filter((it) => {
    const q = search.toLowerCase();
    const matchSearch =
      it.itemName.toLowerCase().includes(q) ||
      it.make.toLowerCase().includes(q) ||
      it.spec.toLowerCase().includes(q);
    const matchHead = !filterHead || String(it.headId) === filterHead;
    const matchGroup = !filterGroup || it.group === filterGroup;
    return matchSearch && matchHead && matchGroup;
  });

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({ ...row, headId: String(row.headId), rate: String(row.rate) });
    setModal({ mode: "edit", id: row.id });
  }

  function handleHeadChange(val) {
    const head = heads.find((h) => String(h.id) === val);
    setForm((f) => ({
      ...f,
      headId: val,
      head: head ? head.headName : "",
      group: "",
    }));
  }

  function handleGroupChange(val) {
    setForm((f) => ({ ...f, group: val }));
  }

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, image: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!form.itemName.trim()) return alert("Item Name is required");
    if (!form.head) return alert("Head is required");
    const payload = {
      ...form,
      headId: Number(form.headId),
      rate: parseFloat(form.rate) || 0,
    };
    if (modal.mode === "add") {
      setItems((prev) => [...prev, { ...payload, id: Date.now() }]);
    } else {
      setItems((prev) =>
        prev.map((it) =>
          it.id === modal.id ? { ...payload, id: modal.id } : it,
        ),
      );
    }
    setModal(null);
  }

  function handleDelete(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setDeleteConfirm(null);
  }

  const headOptions = heads.map((h) => ({
    value: String(h.id),
    label: h.headName,
  }));

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Item</h1>
          <p className="inv-page-sub">
            Full inventory item catalogue with specifications
          </p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add Item
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-toolbar">
          <input
            className="inv-search"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="inv-filter-select"
            value={filterHead}
            onChange={(e) => {
              setFilterHead(e.target.value);
              setFilterGroup("");
            }}
          >
            <option value="">All Heads</option>
            {heads.map((h) => (
              <option key={h.id} value={String(h.id)}>
                {h.headName}
              </option>
            ))}
          </select>
          <select
            className="inv-filter-select"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
          >
            <option value="">All Groups</option>
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <span className="inv-count">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="inv-table-wrap inv-scroll-x">
          <table className="inv-table inv-table-wide">
            <thead>
              <tr>
                <th>Image</th>
                <th>Item Name</th>
                <th>Head</th>
                <th>Group</th>
                <th>Sub Category</th>
                <th>UOM</th>
                <th>Make</th>
                <th>Spec</th>
                <th>Rate</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="inv-empty">
                    No records found
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => (
                <tr key={row.id}>
                  <td>
                    {row.image ? (
                      <img
                        src={row.image}
                        alt=""
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div className="inv-img-placeholder">IMG</div>
                    )}
                  </td>
                  <td className="inv-bold">{row.itemName}</td>
                  <td className="inv-muted-sm">{row.head}</td>
                  <td className="inv-muted-sm">{row.group}</td>
                  <td className="inv-muted-sm">{row.subCategory}</td>
                  <td>{row.uom}</td>
                  <td className="inv-muted-sm">{row.make}</td>
                  <td className="inv-spec">{row.spec}</td>
                  <td className="inv-bold">₹{Number(row.rate).toFixed(2)}</td>
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
          title={modal.mode === "add" ? "Add Item" : "Edit Item"}
          onClose={() => setModal(null)}
          onSave={handleSave}
        >
          <FormGrid>
            <Field label="Head" required>
              <Select
                value={form.headId}
                onChange={handleHeadChange}
                options={headOptions}
                placeholder="Select head..."
              />
            </Field>
            <Field label="Group">
              <Select
                value={form.group}
                onChange={handleGroupChange}
                options={modalGroupOptions}
                placeholder="Select group..."
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Sub Category">
              <Input
                value={form.subCategory}
                onChange={(v) => setForm((f) => ({ ...f, subCategory: v }))}
                placeholder="e.g. Mild Steel"
              />
            </Field>
            <Field label="Item Name" required>
              <Input
                value={form.itemName}
                onChange={(v) => setForm((f) => ({ ...f, itemName: v }))}
                placeholder="e.g. MS Flat Bar 50x6"
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="UOM">
              <Select
                value={form.uom}
                onChange={(v) => setForm((f) => ({ ...f, uom: v }))}
                options={UOM_OPTIONS}
                placeholder="Select UOM..."
              />
            </Field>
            <Field label="Make">
              <Input
                value={form.make}
                onChange={(v) => setForm((f) => ({ ...f, make: v }))}
                placeholder="e.g. SAIL"
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Spec">
              <Input
                value={form.spec}
                onChange={(v) => setForm((f) => ({ ...f, spec: v }))}
                placeholder="e.g. 50x6mm IS 2062"
              />
            </Field>
            <Field label="Rate (₹)">
              <Input
                type="number"
                value={form.rate}
                onChange={(v) => setForm((f) => ({ ...f, rate: v }))}
                placeholder="0.00"
              />
            </Field>
          </FormGrid>
          <Field label="Item Description">
            <Textarea
              value={form.itemDescription}
              onChange={(v) => setForm((f) => ({ ...f, itemDescription: v }))}
              placeholder="Brief description of the item..."
              rows={2}
            />
          </Field>
          <FormGrid>
            <Field label="Image">
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {form.image && (
                  <img
                    src={form.image}
                    alt=""
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 6,
                      objectFit: "cover",
                      border: "0.5px solid var(--border-subtle)",
                    }}
                  />
                )}
                <button
                  className="inv-btn-ghost"
                  onClick={() => fileRef.current.click()}
                  style={{ fontSize: "12px" }}
                >
                  {form.image ? "Change Image" : "Upload Image"}
                </button>
                {form.image && (
                  <button
                    className="inv-btn-ghost"
                    onClick={() => setForm((f) => ({ ...f, image: null }))}
                    style={{ fontSize: "12px", color: "#E24B4A" }}
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImage}
                />
              </div>
            </Field>
            <Field label="Status">
              <div style={{ paddingTop: "6px" }}>
                <Toggle
                  value={form.active}
                  onChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
              </div>
            </Field>
          </FormGrid>
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
            Are you sure you want to delete this item? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

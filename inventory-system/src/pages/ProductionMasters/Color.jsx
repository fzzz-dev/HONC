import { useState, useEffect, useRef } from "react";
import Modal from "../../components/Modal";
import { Field, Input, Toggle } from "../../components/FormFields";
import { productionApi } from "../../services/productionApi";
import { ChromePicker } from "react-color";
const EMPTY = { name: "", code: "", hexCode: "", description: "", active: true };

export default function Color() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const rgb = getRgb(form.hexCode);
  const hsl = getHsl(form.hexCode);
  useEffect(() => {
    fetchItems();
  }, []);

  function hexToRgb(hex) {
    if (!hex) return "";

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `${r}, ${g}, ${b}`;
  }
  function getRgb(hex) {
    if (!hex || hex.length !== 7) return null;

    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  function getHsl(hex) {
    if (!hex || hex.length !== 7) return null;

    let r = parseInt(hex.substr(1, 2), 16) / 255;
    let g = parseInt(hex.substr(3, 2), 16) / 255;
    let b = parseInt(hex.substr(5, 2), 16) / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);

    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;

      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {

        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;

        case g:
          h = (b - r) / d + 2;
          break;

        case b:
          h = (r - g) / d + 4;
          break;
      }

      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }
  async function fetchItems() {
    setLoading(true);
    setError(null);
    try {
      const data = await productionApi.color.getAll();
      setItems(data);
    } catch (err) {
      setError(err.message || "Failed to load colors");
    } finally {
      setLoading(false);
    }
  }

  const filtered = items.filter((x) =>
    x.name.toLowerCase().includes(search.toLowerCase()) ||
    x.code.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      code: row.code,
      hexCode: row.hexCode || "",
      description: row.description || "",
      active: row.isActive,
    });
    setModal({ mode: "edit", id: row.id });
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Color name is required");
    if (!form.code.trim()) return alert("Color code is required");
    setSaving(true);
    try {
      const isAdd = modal.mode === "add";
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        hexCode: form.hexCode?.trim() || null,
        description: form.description?.trim() || "",
        isActive: form.active,
      };
      const saved = isAdd
        ? await productionApi.color.create(payload)
        : await productionApi.color.update(modal.id, payload);

      if (isAdd) {
        setItems((prev) => [...prev, saved]);
      } else {
        setItems((prev) =>
          prev.map((x) => (x.id === modal.id ? saved : x))
        );
      }
      setModal(null);
    } catch (err) {
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Permanently delete this color? This action cannot be undone.")) return;

    try {
      await productionApi.color.hardDelete(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Colors</h1>
          <p className="inv-page-sub">Manage production colors</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add
        </button>
      </div>

      {error && (
        <div className="inv-error-banner">
          {error}{" "}
          <button onClick={fetchItems} style={{ marginLeft: 8, textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search by name or code..."
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
                  <th>Name</th>
                  <th>Hex Code</th>
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
                      <td className="inv-bold">{row.name}</td>
                      <td>
                        {row.hexCode ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              display: "inline-block",
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              backgroundColor: row.hexCode,
                              border: "1px solid #ddd"
                            }} />
                            {row.hexCode}
                          </span>
                        ) : "—"}
                      </td>
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
          title={modal.mode === "add" ? "Add Color" : "Edit Color"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          <Field label="Code" required>
            <Input
              value={form.code}
              onChange={(v) => setForm((f) => ({ ...f, code: v.toUpperCase() }))}
              placeholder="e.g., RED, BLU, GRN"
            />
          </Field>
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Enter color name"
            />
          </Field>

          <Field label="Description">
            <Input
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Description (optional)"
            />
          </Field>

          <Field label="Hex code">

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "340px 1fr",
                gap: "20px",
                alignItems: "start"
              }}
            >

              <div>

                <ChromePicker
                  disableAlpha
                  color={form.hexCode || "#FFFFFF"}
                  onChange={(color) => {
                    setForm((f) => ({
                      ...f,
                      hexCode: color.hex.toUpperCase(),
                      code: `R-${color.rgb.r},G-${color.rgb.g},B-${color.rgb.b}`,
                    }));
                  }}
                />
              </div>

              <div>

                <Input
                  value={form.hexCode}
                  placeholder="#FF0000"
                  onChange={(v) => {
                    const hex = v.toUpperCase();
                    const rgb = getRgb(hex);

                    setForm((f) => ({
                      ...f,
                      hexCode: hex,
                      code: rgb ? `${rgb.r},${rgb.g},${rgb.b}` : "",
                    }));
                  }}
                />

                <div
                  style={{
                    marginTop: 15,
                    padding: 18,
                    border: "1px solid #ddd",
                    borderRadius: 8
                  }}
                >

                  <div
                    style={{
                      height: 80,
                      borderRadius: 8,
                      background: form.hexCode || "#fff",
                      border: "1px solid #ccc",
                      marginBottom: 15
                    }}
                  />

                  <table style={{ width: "100%" }}>

                    <tbody>

                      <tr>

                        <td><b>HEX</b></td>

                        <td>{form.hexCode || "-"}</td>

                      </tr>

                      <tr>

                        <td><b>RGB</b></td>

                        <td>

                          {rgb
                            ? `${rgb.r}, ${rgb.g}, ${rgb.b}`
                            : "-"}

                        </td>

                      </tr>

                      <tr>

                        <td><b>HSL</b></td>

                        <td>

                          {hsl
                            ? `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`
                            : "-"}

                        </td>

                      </tr>

                    </tbody>

                  </table>

                </div>

              </div>

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

      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this color? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
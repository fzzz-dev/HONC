import { useState } from "react";

let _id = 500;
const nextId = () => ++_id;

const emptyDetail = () => ({
  id: nextId(),
  inventoryHeadId: "",
  inventoryHeadName: "",
  mainCategoryId: "",
  mainCategoryName: "",
  itemId: "",
  itemName: "",
  uom: "",
  indentQty: 0,
  dueDate: "",
  remarks: "",
});

const fmt = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

function generateIndentNo(existingIndents) {
  const year = new Date().getFullYear();
  const prefix = `IND-${year}-`;
  const nums = existingIndents
    .map((ind) => {
      const match = ind.indentNo?.match(/^IND-\d{4}-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export default function PurchaseIndentPage({
  indents,
  setIndents,
  departments = [],
  heads = [],
  categories = [],
  items = [],
  uoms = [],
}) {
  const today = new Date().toISOString().split("T")[0];
  const [view, setView] = useState("list"); // list | form
  const [editId, setEditId] = useState(null);

  const [header, setHeader] = useState({
    indentNo: "",
    date: today,
    departmentId: "",
    departmentName: "",
    createdBy: "Admin",
    createdOn: today,
    status: "Open",
    remarks: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);

  function resetForm() {
    setHeader({
      indentNo: "",
      date: today,
      departmentId: "",
      departmentName: "",
      createdBy: "Admin",
      createdOn: today,
      status: "Open",
      remarks: "",
    });
    setDetails([emptyDetail()]);
    setEditId(null);
  }

  function openNew() {
    const autoNo = generateIndentNo(indents);
    setHeader({
      indentNo: autoNo,
      date: today,
      departmentId: "",
      departmentName: "",
      createdBy: "Admin",
      createdOn: today,
      status: "Open",
      remarks: "",
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setView("form");
  }

  function openEdit(indent) {
    setHeader({
      indentNo: indent.indentNo,
      date: indent.date,
      departmentId: indent.departmentId,
      departmentName: indent.departmentName,
      createdBy: indent.createdBy,
      createdOn: indent.createdOn,
      status: indent.status,
      remarks: indent.remarks,
    });
    setDetails(indent.details.map((d) => ({ ...d })));
    setEditId(indent.id);
    setView("form");
  }

  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };

      // Cascade: when inventory head changes, reset category & item
      if (field === "inventoryHeadId") {
        const found = heads.find((h) => String(h.id) === String(val));
        row.inventoryHeadName = found?.headName || "";
        row.mainCategoryId = "";
        row.mainCategoryName = "";
        row.itemId = "";
        row.itemName = "";
        row.uom = "";
      }

      // Cascade: when category changes, reset item
      if (field === "mainCategoryId") {
        const found = categories.find((c) => String(c.id) === String(val));
        row.mainCategoryName = found?.groupName || "";
        row.itemId = "";
        row.itemName = "";
        row.uom = "";
      }

      // Auto-fill UOM when item is selected
      if (field === "itemId") {
        const found = items.find((it) => String(it.id) === String(val));
        row.itemName = found?.itemName || "";
        row.uom = found?.uom || "";
      }

      rows[idx] = row;
      return rows;
    });
  }

  function addRow() {
    setDetails((p) => [...p, emptyDetail()]);
  }

  function removeRow(idx) {
    setDetails((p) => p.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!header.indentNo.trim()) return alert("Indent No is required");
    if (!header.departmentId) return alert("Department is required");
    const record = { ...header, details };
    if (editId) {
      setIndents((p) =>
        p.map((x) => (x.id === editId ? { id: editId, ...record } : x)),
      );
    } else {
      setIndents((p) => [...p, { id: nextId(), ...record }]);
    }
    setView("list");
    resetForm();
  }

  const totalQty = details.reduce((s, r) => s + Number(r.indentQty || 0), 0);

  /* ── LIST VIEW ── */
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Purchase Indent</h1>
            <p className="inv-page-sub">Manage material indent requests</p>
          </div>
          <button className="inv-btn-primary" onClick={openNew}>
            + New Indent
          </button>
        </div>

        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Indent No</th>
                    <th>Date</th>
                    <th>Department</th>
                    <th>Created By</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {indents.length === 0 && (
                    <tr>
                      <td colSpan={9} className="inv-empty">
                        No indent records found
                      </td>
                    </tr>
                  )}
                  {indents.map((indent, i) => {
                    const qty = indent.details.reduce(
                      (s, d) => s + Number(d.indentQty || 0),
                      0,
                    );
                    return (
                      <tr key={indent.id}>
                        <td className="inv-idx">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                          {indent.indentNo}
                        </td>
                        <td>{indent.date}</td>
                        <td>{indent.departmentName}</td>
                        <td>{indent.createdBy}</td>
                        <td className="inv-muted-sm">
                          {indent.details.length} item
                          {indent.details.length !== 1 ? "s" : ""}
                        </td>
                        <td
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontWeight: 500,
                          }}
                        >
                          {fmt(qty)}
                        </td>
                        <td>
                          <span
                            className={`inv-badge ${
                              indent.status === "Open"
                                ? "inv-badge-yes"
                                : "inv-badge-no"
                            }`}
                          >
                            {indent.status}
                          </span>
                        </td>
                        <td>
                          <div className="inv-actions">
                            <button
                              className="inv-btn-icon"
                              onClick={() => openEdit(indent)}
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
                              onClick={() =>
                                setIndents((p) =>
                                  p.filter((x) => x.id !== indent.id),
                                )
                              }
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM VIEW ── */
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">
            {editId ? "Edit Purchase Indent" : "New Purchase Indent"}
          </h1>
          <p className="inv-page-sub">Fill header and detail rows, then save</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>
            ← Back
          </button>
          <button className="inv-btn-primary" onClick={handleSave}>
            Save Indent
          </button>
        </div>
      </div>

      {/* ── Header card ── */}
      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Header</div>
          <div className="inv-form-row cols-4">
            {/* Indent No — auto generated */}
            <div className="inv-field">
              <label className="inv-label">
                Indent No
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 500,
                    color: "#6366f1",
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: 4,
                    padding: "1px 6px",
                    letterSpacing: "0.03em",
                  }}
                >
                  Auto
                </span>
              </label>
              <input
                className="inv-input"
                value={header.indentNo}
                readOnly={!editId}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, indentNo: e.target.value }))
                }
                style={{
                  background: editId ? undefined : "#f8f7ff",
                  color: "#4f46e5",
                  fontWeight: 600,
                  cursor: editId ? "text" : "default",
                  border: "1px solid #c7d2fe",
                }}
              />
            </div>

            {/* Date */}
            <div className="inv-field">
              <label className="inv-label">Date</label>
              <input
                className="inv-input"
                type="date"
                value={header.date}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, date: e.target.value }))
                }
              />
            </div>

            {/* Department */}
            <div className="inv-field">
              <label className="inv-label">Department *</label>
              <select
                className="inv-input"
                value={header.departmentId}
                onChange={(e) => {
                  const d = departments.find(
                    (x) => String(x.id) === e.target.value,
                  );
                  setHeader((h) => ({
                    ...h,
                    departmentId: e.target.value,
                    departmentName: d?.name || "",
                  }));
                }}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="inv-field">
              <label className="inv-label">Status</label>
              <select
                className="inv-input"
                value={header.status}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, status: e.target.value }))
                }
              >
                {["Open", "Closed", "Cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="inv-form-row cols-3">
            <div className="inv-field">
              <label className="inv-label">Created By</label>
              <input
                className="inv-input"
                value={header.createdBy}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, createdBy: e.target.value }))
                }
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Created On</label>
              <input
                className="inv-input"
                type="date"
                value={header.createdOn}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, createdOn: e.target.value }))
                }
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Remarks</label>
              <input
                className="inv-input"
                value={header.remarks}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, remarks: e.target.value }))
                }
                placeholder="Optional remarks"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail card ── */}
      <div className="inv-card">
        <div className="inv-card-body">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div className="inv-section-label" style={{ marginBottom: 0 }}>
              Detail
            </div>
            <button className="inv-btn-secondary inv-btn-sm" onClick={addRow}>
              + Add Row
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="po-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th style={{ minWidth: 150 }}>Item Category</th>
                  <th style={{ minWidth: 150 }}>Main Category</th>
                  <th style={{ minWidth: 170 }}>Item Name</th>
                  <th style={{ minWidth: 80 }}>UOM</th>
                  <th style={{ minWidth: 90 }}>Indent Qty</th>
                  <th style={{ minWidth: 120 }}>Due Date</th>
                  <th style={{ minWidth: 160 }}>Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => {
                  // Filter categories by selected head
                  const filteredCategories = row.inventoryHeadId
                    ? categories.filter(
                        (c) => String(c.headId) === String(row.inventoryHeadId),
                      )
                    : categories;

                  // Filter items by selected category
                  const filteredItems = row.mainCategoryId
                    ? items.filter(
                        (it) =>
                          it.group ===
                          categories.find(
                            (c) => String(c.id) === String(row.mainCategoryId),
                          )?.groupName,
                      )
                    : row.inventoryHeadId
                      ? items.filter(
                          (it) =>
                            String(it.headId) === String(row.inventoryHeadId),
                        )
                      : items;

                  const selectStyle = {
                    width: "100%",
                    border: "none",
                    outline: "none",
                    fontSize: 11.5,
                    background: "transparent",
                    padding: "2px 4px",
                    cursor: "pointer",
                  };

                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          textAlign: "center",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {idx + 1}
                      </td>

                      {/* Item Category (Inventory Head) */}
                      <td>
                        <select
                          value={row.inventoryHeadId}
                          onChange={(e) =>
                            updateDetail(idx, "inventoryHeadId", e.target.value)
                          }
                          style={selectStyle}
                        >
                          <option value="">Select category</option>
                          {heads.map((h) => (
                            <option key={h.id} value={String(h.id)}>
                              {h.headName}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Main Category */}
                      <td>
                        <select
                          value={row.mainCategoryId}
                          onChange={(e) =>
                            updateDetail(idx, "mainCategoryId", e.target.value)
                          }
                          style={selectStyle}
                          disabled={!row.inventoryHeadId}
                        >
                          <option value="">
                            {row.inventoryHeadId
                              ? "Select main cat"
                              : "Select category first"}
                          </option>
                          {filteredCategories.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.groupName}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Item Name */}
                      <td style={{ minWidth: 170 }}>
                        <select
                          value={row.itemId}
                          onChange={(e) =>
                            updateDetail(idx, "itemId", e.target.value)
                          }
                          style={selectStyle}
                          disabled={!row.inventoryHeadId}
                        >
                          <option value="">
                            {row.inventoryHeadId
                              ? "Select item"
                              : "Select category first"}
                          </option>
                          {filteredItems.map((it) => (
                            <option key={it.id} value={String(it.id)}>
                              {it.itemName}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* UOM — auto filled, read-only */}
                      <td>
                        <input
                          value={row.uom}
                          readOnly
                          style={{
                            width: 60,
                            border: "none",
                            outline: "none",
                            fontSize: 11.5,
                            background: "transparent",
                            color: "var(--text-secondary)",
                            padding: "2px 4px",
                          }}
                          placeholder="—"
                        />
                      </td>

                      {/* Indent Qty */}
                      <td>
                        <input
                          type="number"
                          value={row.indentQty}
                          min={0}
                          onChange={(e) =>
                            updateDetail(idx, "indentQty", e.target.value)
                          }
                          style={{ width: 80, textAlign: "right" }}
                        />
                      </td>

                      {/* Due Date */}
                      <td>
                        <input
                          type="date"
                          value={row.dueDate}
                          onChange={(e) =>
                            updateDetail(idx, "dueDate", e.target.value)
                          }
                          style={{
                            border: "none",
                            outline: "none",
                            fontSize: 11.5,
                            background: "transparent",
                            padding: "2px 4px",
                          }}
                        />
                      </td>

                      {/* Remarks */}
                      <td>
                        <input
                          value={row.remarks}
                          onChange={(e) =>
                            updateDetail(idx, "remarks", e.target.value)
                          }
                          placeholder="Optional"
                          style={{ width: 140 }}
                        />
                      </td>

                      {/* Remove */}
                      <td>
                        <button
                          className="inv-btn-icon inv-btn-danger"
                          onClick={() => removeRow(idx)}
                          style={{ padding: "2px 6px", fontSize: 13 }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "DM Mono, monospace",
                      fontWeight: 600,
                    }}
                  >
                    {fmt(totalQty)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── Summary card ── */}
      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Summary</div>
          <div className="inv-summary-grid">
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">Department</div>
              <div className="inv-summary-box-value" style={{ fontSize: 15 }}>
                {header.departmentName || "—"}
              </div>
            </div>
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">Total Line Items</div>
              <div className="inv-summary-box-value">{details.length}</div>
            </div>
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">Total Indent Qty</div>
              <div className="inv-summary-box-value">{fmt(totalQty)}</div>
            </div>
            <div
              className="inv-summary-box"
              style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
            >
              <div className="inv-summary-box-label">Status</div>
              <div
                className="inv-summary-box-value"
                style={{ color: "var(--accent)" }}
              >
                {header.status}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

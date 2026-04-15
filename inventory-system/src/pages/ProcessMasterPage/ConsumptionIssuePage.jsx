import { useState } from "react";

let _id = 900;
const nextId = () => ++_id;

const emptyDetail = () => ({
  id: nextId(),
  category: "",
  subCategory: "",
  itemName: "",
  grnNo: "",
  stkQty: 0,
  issueQty: 0,
  rate: 0,
  amount: 0,
});

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function generateIssNo(existing) {
  const year = new Date().getFullYear();
  const prefix = `ISS-${year}-`;
  const nums = existing
    .map((r) => {
      const m = r.issNo?.match(/^ISS-\d{4}-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export default function ConsumptionIssuePage({
  issues = [],
  setIssues,
  departments = [],
  stores = [],
  items = [],
  heads = [],
  grns = [],
}) {
  const today = new Date().toISOString().split("T")[0];
  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);

  const [header, setHeader] = useState({
    issNo: "",
    date: today,
    departmentId: "",
    departmentName: "",
    storeId: "",
    storeName: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);

  function openNew() {
    setHeader({
      issNo: generateIssNo(issues),
      date: today,
      departmentId: "",
      departmentName: "",
      storeId: "",
      storeName: "",
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setView("form");
  }

  function openEdit(rec) {
    setHeader({
      issNo: rec.issNo,
      date: rec.date,
      departmentId: rec.departmentId,
      departmentName: rec.departmentName,
      storeId: rec.storeId,
      storeName: rec.storeName,
    });
    setDetails(rec.details.map((d) => ({ ...d })));
    setEditId(rec.id);
    setView("form");
  }

  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };

      // Auto-fill from item selection
      if (field === "itemName") {
        const found = items.find((it) => it.itemName === val);
        row.category = found?.head || "";
        row.subCategory = found?.subCategory || "";
        row.rate = found?.rate || 0;
      }

      // Recalculate amount
      const issQty = field === "issueQty" ? +val : +row.issueQty;
      const rate = field === "rate" ? +val : +row.rate;
      row.amount = +(issQty * rate).toFixed(2);

      rows[idx] = row;
      return rows;
    });
  }

  function handleSave() {
    if (!header.issNo.trim()) return alert("Issue No is required");
    if (!header.departmentId) return alert("Department is required");
    if (!header.storeId) return alert("Store is required");
    const record = { ...header, details };
    if (editId) {
      setIssues((p) =>
        p.map((x) => (x.id === editId ? { id: editId, ...record } : x)),
      );
    } else {
      setIssues((p) => [...p, { id: nextId(), ...record }]);
    }
    setView("list");
  }

  const totals = details.reduce(
    (acc, r) => ({
      issueQty: acc.issueQty + Number(r.issueQty || 0),
      amount: acc.amount + Number(r.amount || 0),
    }),
    { issueQty: 0, amount: 0 },
  );

  const selectStyle = {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 11.5,
    background: "transparent",
    padding: "2px 4px",
    cursor: "pointer",
  };
  const roStyle = {
    border: "none",
    outline: "none",
    fontSize: 11.5,
    background: "transparent",
    color: "var(--text-secondary)",
    padding: "2px 4px",
  };

  /* ── LIST ── */
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Consumption Issue</h1>
            <p className="inv-page-sub">Manage material issue to departments</p>
          </div>
          <button className="inv-btn-primary" onClick={openNew}>
            + New Issue
          </button>
        </div>
        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ISS No</th>
                    <th>Date</th>
                    <th>Department</th>
                    <th>Store</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Total Amt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.length === 0 && (
                    <tr>
                      <td colSpan={9} className="inv-empty">
                        No issue records found
                      </td>
                    </tr>
                  )}
                  {issues.map((rec, i) => {
                    const qty = rec.details.reduce(
                      (s, d) => s + Number(d.issueQty || 0),
                      0,
                    );
                    const amt = rec.details.reduce(
                      (s, d) => s + Number(d.amount || 0),
                      0,
                    );
                    return (
                      <tr key={rec.id}>
                        <td className="inv-idx">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                          {rec.issNo}
                        </td>
                        <td>{rec.date}</td>
                        <td>{rec.departmentName}</td>
                        <td>{rec.storeName}</td>
                        <td className="inv-muted-sm">
                          {rec.details.length} item
                          {rec.details.length !== 1 ? "s" : ""}
                        </td>
                        <td style={{ fontFamily: "DM Mono, monospace" }}>
                          {fmt(qty)}
                        </td>
                        <td
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontWeight: 500,
                          }}
                        >
                          ₹{fmt(amt)}
                        </td>
                        <td>
                          <div className="inv-actions">
                            <button
                              className="inv-btn-icon"
                              onClick={() => openEdit(rec)}
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
                                setIssues((p) =>
                                  p.filter((x) => x.id !== rec.id),
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

  /* ── FORM ── */
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">
            {editId ? "Edit Issue" : "New Consumption Issue"}
          </h1>
          <p className="inv-page-sub">
            Issue materials from store to department
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>
            ← Back
          </button>
          <button className="inv-btn-primary" onClick={handleSave}>
            Save Issue
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Header</div>
          <div className="inv-form-row cols-4">
            <div className="inv-field">
              <label className="inv-label">
                ISS No
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
                  }}
                >
                  Auto
                </span>
              </label>
              <input
                className="inv-input"
                value={header.issNo}
                readOnly={!editId}
                style={{
                  background: editId ? undefined : "#f8f7ff",
                  color: "#4f46e5",
                  fontWeight: 600,
                  cursor: editId ? "text" : "default",
                  border: "1px solid #c7d2fe",
                }}
              />
            </div>
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
            <div className="inv-field">
              <label className="inv-label">Store Name *</label>
              <select
                className="inv-input"
                value={header.storeId}
                onChange={(e) => {
                  const st = stores.find(
                    (x) => String(x.id) === e.target.value,
                  );
                  setHeader((h) => ({
                    ...h,
                    storeId: e.target.value,
                    storeName: st?.name || "",
                  }));
                }}
              >
                <option value="">Select store</option>
                {stores.map((st) => (
                  <option key={st.id} value={String(st.id)}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Detail */}
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
            <button
              className="inv-btn-secondary inv-btn-sm"
              onClick={() => setDetails((p) => [...p, emptyDetail()])}
            >
              + Add Row
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="po-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th style={{ minWidth: 140 }}>Category</th>
                  <th style={{ minWidth: 120 }}>Sub Category</th>
                  <th style={{ minWidth: 170 }}>Item Name</th>
                  <th style={{ minWidth: 120 }}>GRN No</th>
                  <th style={{ minWidth: 80 }}>Stk Qty</th>
                  <th style={{ minWidth: 80 }}>Issue Qty</th>
                  <th style={{ minWidth: 80 }}>Rate</th>
                  <th style={{ minWidth: 90 }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={row.id}>
                    <td
                      style={{
                        textAlign: "center",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {idx + 1}
                    </td>
                    {/* Category — auto filled */}
                    <td>
                      <input
                        value={row.category}
                        readOnly
                        style={{ ...roStyle, width: 130 }}
                        placeholder="—"
                      />
                    </td>
                    {/* Sub Category — auto filled */}
                    <td>
                      <input
                        value={row.subCategory}
                        readOnly
                        style={{ ...roStyle, width: 110 }}
                        placeholder="—"
                      />
                    </td>
                    {/* Item Name */}
                    <td>
                      <select
                        value={row.itemName}
                        onChange={(e) =>
                          updateDetail(idx, "itemName", e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="">Select item</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.itemName}>
                            {it.itemName}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* GRN No */}
                    <td>
                      <select
                        value={row.grnNo}
                        onChange={(e) =>
                          updateDetail(idx, "grnNo", e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="">Select GRN</option>
                        {grns.map((g) => (
                          <option key={g.id} value={g.grnNo}>
                            {g.grnNo}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* Stk Qty */}
                    <td>
                      <input
                        type="number"
                        value={row.stkQty}
                        onChange={(e) =>
                          updateDetail(idx, "stkQty", e.target.value)
                        }
                        style={{ width: 70, textAlign: "right" }}
                      />
                    </td>
                    {/* Issue Qty */}
                    <td>
                      <input
                        type="number"
                        value={row.issueQty}
                        onChange={(e) =>
                          updateDetail(idx, "issueQty", e.target.value)
                        }
                        style={{ width: 70, textAlign: "right" }}
                      />
                    </td>
                    {/* Rate */}
                    <td>
                      <input
                        type="number"
                        value={row.rate}
                        onChange={(e) =>
                          updateDetail(idx, "rate", e.target.value)
                        }
                        style={{ width: 70, textAlign: "right" }}
                      />
                    </td>
                    {/* Amount — calculated */}
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "DM Mono",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {fmt(row.amount)}
                    </td>
                    <td>
                      <button
                        className="inv-btn-icon inv-btn-danger"
                        onClick={() =>
                          setDetails((p) => p.filter((_, i) => i !== idx))
                        }
                        style={{ padding: "2px 6px", fontSize: 13 }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "DM Mono",
                      fontWeight: 600,
                    }}
                  >
                    {fmt(totals.issueQty)}
                  </td>
                  <td></td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "DM Mono",
                      fontWeight: 600,
                    }}
                  >
                    ₹{fmt(totals.amount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Summary */}
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
              <div className="inv-summary-box-label">Store</div>
              <div className="inv-summary-box-value" style={{ fontSize: 15 }}>
                {header.storeName || "—"}
              </div>
            </div>
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">Total Issue Qty</div>
              <div className="inv-summary-box-value">
                {fmt(totals.issueQty)}
              </div>
            </div>
            <div
              className="inv-summary-box"
              style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
            >
              <div className="inv-summary-box-label">Total Amount</div>
              <div
                className="inv-summary-box-value"
                style={{ color: "var(--accent)" }}
              >
                ₹{fmt(totals.amount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

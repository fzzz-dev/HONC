import { useState } from "react";

let _id = 200;
const nextId = () => ++_id;

const emptyDetail = () => ({
  id: nextId(),
  indentNo: "",
  itemName: "",
  uom: "",
  indentQty: 0,
  alPoQty: 0,
  balQty: 0,
  poQty: 0,
  priceListRate: 0,
  poRate: 0,
  discMode: "pct", // "pct" | "price"
  discPct: 0,
  discPrice: 0,
  poAmount: 0,
  gstPct: 18,
  sgst: 0,
  cgst: 0,
  igst: 0,
  totGst: 0,
  totalAmount: 0,
  indentRemarks: "",
  poRemarks: "",
});

function calcRow(row, gstEnabled) {
  const baseAmt = row.poQty * row.poRate;

  let discPct = row.discPct;
  let discPrice = row.discPrice;

  if (row.discMode === "price") {
    // flat price discount → derive pct from it
    discPrice = row.discPrice;
    discPct = baseAmt > 0 ? (discPrice / baseAmt) * 100 : 0;
  } else {
    // pct mode → derive flat price from it
    discPct = row.discPct;
    discPrice = baseAmt * (discPct / 100);
  }

  const netAmt = baseAmt - discPrice;
  const gst = gstEnabled ? netAmt * (row.gstPct / 100) : 0;
  const sgst = gstEnabled ? gst / 2 : 0;
  const cgst = gstEnabled ? gst / 2 : 0;

  return {
    ...row,
    discPct: +discPct.toFixed(4),
    discPrice: +discPrice.toFixed(2),
    poAmount: +netAmt.toFixed(2),
    sgst: +sgst.toFixed(2),
    cgst: +cgst.toFixed(2),
    igst: 0,
    totGst: +gst.toFixed(2),
    totalAmount: +(netAmt + gst).toFixed(2),
  };
}

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function generatePoNo(existingPos) {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const nums = existingPos
    .map((p) => {
      const match = p.poNo?.match(/^PO-\d{4}-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export default function PurchaseOrderPage({
  pos,
  setPos,
  suppliers,
  items,
  uoms,
}) {
  const today = new Date().toISOString().split("T")[0];
  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [gstEnabled, setGstEnabled] = useState(true);

  const [header, setHeader] = useState({
    poNo: "",
    date: today,
    supplierId: "",
    supplierName: "",
    createdBy: "Admin",
    createdOn: today,
    status: "Open",
    remarks: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);

  function resetForm() {
    setHeader({
      poNo: "",
      date: today,
      supplierId: "",
      supplierName: "",
      createdBy: "Admin",
      createdOn: today,
      status: "Open",
      remarks: "",
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setGstEnabled(true);
  }

  function openNew() {
    const autoPoNo = generatePoNo(pos);
    setHeader({
      poNo: autoPoNo,
      date: today,
      supplierId: "",
      supplierName: "",
      createdBy: "Admin",
      createdOn: today,
      status: "Open",
      remarks: "",
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setGstEnabled(true);
    setView("form");
  }

  function openEdit(po) {
    setHeader({
      poNo: po.poNo,
      date: po.date,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      createdBy: po.createdBy,
      createdOn: po.createdOn,
      status: po.status,
      remarks: po.remarks,
    });
    setDetails(
      po.details.map((d) => ({ discMode: "pct", discPrice: 0, ...d })),
    );
    setGstEnabled(po.gstEnabled !== false);
    setEditId(po.id);
    setView("form");
  }

  function toggleGst() {
    const next = !gstEnabled;
    setGstEnabled(next);
    setDetails((prev) => prev.map((row) => calcRow(row, next)));
  }

  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      rows[idx] = calcRow(
        { ...rows[idx], [field]: isNaN(val) || val === "" ? val : +val },
        gstEnabled,
      );
      return rows;
    });
  }

  // Toggle discount mode for a single row
  function toggleDiscMode(idx) {
    setDetails((prev) => {
      const rows = [...prev];
      const current = rows[idx];
      const nextMode = current.discMode === "pct" ? "price" : "pct";
      rows[idx] = calcRow({ ...current, discMode: nextMode }, gstEnabled);
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
    if (!header.poNo.trim()) return alert("PO No is required");
    const poData = { ...header, gstEnabled, details };
    if (editId)
      setPos((p) =>
        p.map((x) => (x.id === editId ? { id: editId, ...poData } : x)),
      );
    else setPos((p) => [...p, { id: nextId(), ...poData }]);
    setView("list");
    resetForm();
  }

  const totals = details.reduce(
    (acc, r) => ({
      grossAmount: acc.grossAmount + r.poQty * r.poRate, // before discount
      discPrice: acc.discPrice + r.discPrice, // total discount amount
      poAmount: acc.poAmount + r.poAmount,
      sgst: acc.sgst + r.sgst,
      cgst: acc.cgst + r.cgst,
      igst: acc.igst + r.igst,
      totGst: acc.totGst + r.totGst,
      totalAmount: acc.totalAmount + r.totalAmount,
    }),
    {
      grossAmount: 0,
      discPrice: 0,
      poAmount: 0,
      sgst: 0,
      cgst: 0,
      igst: 0,
      totGst: 0,
      totalAmount: 0,
    },
  );

  // Overall effective discount %
  const effectiveDiscPct =
    totals.grossAmount > 0 ? (totals.discPrice / totals.grossAmount) * 100 : 0;

  /* ── LIST VIEW ── */
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Purchase order</h1>
            <p className="inv-page-sub">Manage purchase orders</p>
          </div>
          <button className="inv-btn-primary" onClick={openNew}>
            + New PO
          </button>
        </div>
        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>PO no</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Created by</th>
                    <th>GST</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.length === 0 && (
                    <tr>
                      <td colSpan={9} className="inv-empty">
                        No purchase orders
                      </td>
                    </tr>
                  )}
                  {pos.map((po, i) => {
                    const total = po.details.reduce(
                      (s, d) => s + d.totalAmount,
                      0,
                    );
                    return (
                      <tr key={po.id}>
                        <td className="inv-idx">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                          {po.poNo}
                        </td>
                        <td>{po.date}</td>
                        <td>{po.supplierName}</td>
                        <td>{po.createdBy}</td>
                        <td>
                          <span
                            className={`inv-badge ${po.gstEnabled !== false ? "inv-badge-yes" : "inv-badge-no"}`}
                          >
                            {po.gstEnabled !== false ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`inv-badge ${po.status === "Open" ? "inv-badge-yes" : "inv-badge-no"}`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontWeight: 500,
                          }}
                        >
                          ₹{fmt(total)}
                        </td>
                        <td>
                          <div className="inv-actions">
                            <button
                              className="inv-btn-icon"
                              onClick={() => openEdit(po)}
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
                                setPos((p) => p.filter((x) => x.id !== po.id))
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
            {editId ? "Edit purchase order" : "New purchase order"}
          </h1>
          <p className="inv-page-sub">Fill header, detail and save</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* GST toggle */}
          <button
            type="button"
            onClick={toggleGst}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 8,
              border: gstEnabled ? "1px solid #86efac" : "1px solid #fca5a5",
              background: gstEnabled ? "#f0fdf4" : "#fff1f2",
              color: gstEnabled ? "#16a34a" : "#dc2626",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-block",
                width: 34,
                height: 18,
                borderRadius: 100,
                background: gstEnabled ? "#16a34a" : "#d1d5db",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: gstEnabled ? 18 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </span>
            GST {gstEnabled ? "Enabled" : "Disabled"}
          </button>

          <button className="inv-btn-secondary" onClick={() => setView("list")}>
            ← Back
          </button>
          <button className="inv-btn-primary" onClick={handleSave}>
            Save PO
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Header</div>
          <div className="inv-form-row cols-4">
            <div className="inv-field">
              <label className="inv-label">
                PO no
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
                value={header.poNo}
                readOnly={!editId}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, poNo: e.target.value }))
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
              <label className="inv-label">Supplier</label>
              <select
                className="inv-input"
                value={header.supplierId}
                onChange={(e) => {
                  const s = suppliers.find((x) => x.id === +e.target.value);
                  setHeader((h) => ({
                    ...h,
                    supplierId: +e.target.value,
                    supplierName: s?.supplierName || "",
                  }));
                }}
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.supplierName}
                  </option>
                ))}
              </select>
            </div>
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
              <label className="inv-label">Created by</label>
              <input
                className="inv-input"
                value={header.createdBy}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, createdBy: e.target.value }))
                }
              />
            </div>
            <div className="inv-field">
              <label className="inv-label">Created on</label>
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detail card */}
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
              + Add row
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="po-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Indent no</th>
                  <th>Item name</th>
                  <th>UOM</th>
                  <th>Indent qty</th>
                  <th>Al PO qty</th>
                  <th>Bal qty</th>
                  <th>PO qty</th>
                  <th>PL rate</th>
                  <th>PO rate</th>
                  {/* NEW: combined disc column with mode toggle */}
                  <th style={{ minWidth: 130 }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Disc
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-secondary)",
                          fontWeight: 400,
                        }}
                      >
                        (per row ▾)
                      </span>
                    </span>
                  </th>
                  <th>PO amt</th>
                  {gstEnabled && (
                    <>
                      <th>GST %</th>
                      <th>SGST</th>
                      <th>CGST</th>
                      <th>IGST</th>
                      <th>Tot GST</th>
                    </>
                  )}
                  <th>Total amt</th>
                  <th>Indent rem</th>
                  <th>PO rem</th>
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
                    <td>
                      <input
                        value={row.indentNo}
                        onChange={(e) =>
                          updateDetail(idx, "indentNo", e.target.value)
                        }
                      />
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <select
                        value={row.itemName}
                        onChange={(e) =>
                          updateDetail(idx, "itemName", e.target.value)
                        }
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          fontSize: 11.5,
                          background: "transparent",
                          padding: "2px 4px",
                        }}
                      >
                        <option value="">Select item</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.itemName}>
                            {it.itemName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={row.uom}
                        onChange={(e) =>
                          updateDetail(idx, "uom", e.target.value)
                        }
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          fontSize: 11.5,
                          background: "transparent",
                          padding: "2px 4px",
                        }}
                      >
                        <option value="">-</option>
                        {uoms.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    {[
                      "indentQty",
                      "alPoQty",
                      "balQty",
                      "poQty",
                      "priceListRate",
                      "poRate",
                    ].map((f) => (
                      <td key={f}>
                        <input
                          type="number"
                          value={row[f]}
                          onChange={(e) => updateDetail(idx, f, e.target.value)}
                          style={{ width: 70, textAlign: "right" }}
                        />
                      </td>
                    ))}

                    {/* ── NEW: Disc column with mode toggle ── */}
                    <td style={{ minWidth: 130 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {/* Mode toggle button */}
                        <button
                          type="button"
                          onClick={() => toggleDiscMode(idx)}
                          title={`Switch to ${row.discMode === "pct" ? "flat price" : "percentage"} mode`}
                          style={{
                            flexShrink: 0,
                            padding: "2px 5px",
                            fontSize: 10,
                            fontWeight: 600,
                            borderRadius: 4,
                            border: "1px solid",
                            cursor: "pointer",
                            lineHeight: 1.4,
                            background:
                              row.discMode === "pct" ? "#eff6ff" : "#fefce8",
                            borderColor:
                              row.discMode === "pct" ? "#93c5fd" : "#fde047",
                            color:
                              row.discMode === "pct" ? "#1d4ed8" : "#854d0e",
                            minWidth: 32,
                            textAlign: "center",
                            transition: "all 0.15s",
                          }}
                        >
                          {row.discMode === "pct" ? "%" : "₹"}
                        </button>

                        {/* Input: either disc% or flat disc price */}
                        {row.discMode === "pct" ? (
                          <input
                            type="number"
                            value={row.discPct}
                            onChange={(e) =>
                              updateDetail(idx, "discPct", e.target.value)
                            }
                            style={{ width: 56, textAlign: "right" }}
                            placeholder="0"
                          />
                        ) : (
                          <input
                            type="number"
                            value={row.discPrice}
                            onChange={(e) =>
                              updateDetail(idx, "discPrice", e.target.value)
                            }
                            style={{ width: 72, textAlign: "right" }}
                            placeholder="0.00"
                          />
                        )}

                        {/* Show derived counterpart as a hint */}
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.discMode === "pct"
                            ? `₹${fmt(row.discPrice)}`
                            : `${row.discPct.toFixed(2)}%`}
                        </span>
                      </div>
                    </td>
                    {/* ── end disc column ── */}

                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "DM Mono",
                        fontSize: 11,
                      }}
                    >
                      {fmt(row.poAmount)}
                    </td>
                    {gstEnabled && (
                      <>
                        <td>
                          <input
                            type="number"
                            value={row.gstPct}
                            onChange={(e) =>
                              updateDetail(idx, "gstPct", e.target.value)
                            }
                            style={{ width: 50, textAlign: "right" }}
                          />
                        </td>
                        {["sgst", "cgst", "igst", "totGst"].map((f) => (
                          <td
                            key={f}
                            style={{
                              textAlign: "right",
                              fontFamily: "DM Mono",
                              fontSize: 11,
                            }}
                          >
                            {fmt(row[f])}
                          </td>
                        ))}
                      </>
                    )}
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "DM Mono",
                        fontSize: 11,
                      }}
                    >
                      {fmt(row.totalAmount)}
                    </td>
                    <td>
                      <input
                        value={row.indentRemarks}
                        onChange={(e) =>
                          updateDetail(idx, "indentRemarks", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={row.poRemarks}
                        onChange={(e) =>
                          updateDetail(idx, "poRemarks", e.target.value)
                        }
                      />
                    </td>
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
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={10}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    Total
                  </td>
                  {/* disc total column */}
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "DM Mono",
                      fontSize: 11,
                      color: "#dc2626",
                    }}
                  >
                    −₹{fmt(totals.discPrice)}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                    {fmt(totals.poAmount)}
                  </td>
                  {gstEnabled && (
                    <>
                      <td></td>
                      <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                        {fmt(totals.sgst)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                        {fmt(totals.cgst)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                        {fmt(totals.igst)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                        {fmt(totals.totGst)}
                      </td>
                    </>
                  )}
                  <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                    {fmt(totals.totalAmount)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Summary card */}
      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Summary</div>
          <div className="inv-summary-grid">
            {/* Gross amount (before discount) */}
            <div
              className="inv-summary-box"
              style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
            >
              <div className="inv-summary-box-label">Gross amount</div>
              <div
                className="inv-summary-box-value"
                style={{ color: "#64748b" }}
              >
                ₹{fmt(totals.grossAmount)}
              </div>
            </div>

            {/* Discount box — highlighted in amber/warning */}
            <div
              className="inv-summary-box"
              style={{
                background: "#fffbeb",
                borderColor: "#fcd34d",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* savings ribbon */}
              {totals.discPrice > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 0,
                    background: "#f59e0b",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 8px 2px 6px",
                    borderRadius: "4px 0 0 4px",
                    letterSpacing: "0.05em",
                  }}
                >
                  SAVINGS
                </div>
              )}
              <div className="inv-summary-box-label">Total discount</div>
              <div
                className="inv-summary-box-value"
                style={{ color: "#b45309" }}
              >
                −₹{fmt(totals.discPrice)}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#92400e",
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                {effectiveDiscPct.toFixed(2)}% effective
              </div>
            </div>

            {/* After-discount (PO amount before GST) */}
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">
                PO amount (after disc, before GST)
              </div>
              <div className="inv-summary-box-value">
                ₹{fmt(totals.poAmount)}
              </div>
              {totals.discPrice > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#16a34a",
                    marginTop: 2,
                    fontWeight: 500,
                  }}
                >
                  ↓ ₹{fmt(totals.discPrice)} saved vs gross
                </div>
              )}
            </div>

            {gstEnabled && (
              <>
                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">Total GST</div>
                  <div className="inv-summary-box-value">
                    ₹{fmt(totals.totGst)}
                  </div>
                </div>
                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">SGST + CGST</div>
                  <div className="inv-summary-box-value">
                    ₹{fmt(totals.sgst + totals.cgst)}
                  </div>
                </div>
              </>
            )}

            {/* Grand total */}
            <div
              className="inv-summary-box"
              style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
            >
              <div className="inv-summary-box-label">Grand total</div>
              <div
                className="inv-summary-box-value"
                style={{ color: "var(--accent)" }}
              >
                ₹{fmt(totals.totalAmount)}
              </div>
              {totals.discPrice > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#1d4ed8",
                    marginTop: 2,
                    fontWeight: 500,
                  }}
                >
                  vs gross ₹{fmt(totals.grossAmount + totals.totGst)} — saved ₹
                  {fmt(totals.discPrice)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

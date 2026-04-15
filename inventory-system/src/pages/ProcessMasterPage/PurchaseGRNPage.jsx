import { useState } from "react";

let _id = 800;
const nextId = () => ++_id;

const emptyDetail = () => ({
  id: nextId(),
  indentNo: "",
  poNo: "",
  poDate: "",
  itemName: "",
  uom: "",
  poQty: 0,
  alGrnQty: 0,
  balQty: 0,
  grnQty: 0,
  poRate: 0,
  grnRate: 0,
  discPct: 0,
  grnAmount: 0,
  gstPct: 18,
  sgst: 0,
  cgst: 0,
  igst: 0,
  totGst: 0,
  totalAmount: 0,
  remarks: "",
});

function calcRow(row) {
  const grnAmt = row.grnQty * row.grnRate * (1 - row.discPct / 100);
  const gst = grnAmt * (row.gstPct / 100);
  return {
    ...row,
    grnAmount: +grnAmt.toFixed(2),
    sgst: +(gst / 2).toFixed(2),
    cgst: +(gst / 2).toFixed(2),
    igst: 0,
    totGst: +gst.toFixed(2),
    totalAmount: +(grnAmt + gst).toFixed(2),
  };
}

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function generateGrnNo(existing) {
  const year = new Date().getFullYear();
  const prefix = `GRN-${year}-`;
  const nums = existing
    .map((r) => {
      const m = r.grnNo?.match(/^GRN-\d{4}-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export default function PurchaseGRNPage({
  grns = [],
  setGrns,
  suppliers = [],
  stores = [],
  items = [],
  uoms = [],
  pos = [],
  indents = [],
}) {
  const today = new Date().toISOString().split("T")[0];
  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);

  const [header, setHeader] = useState({
    grnNo: "",
    date: today,
    supplierId: "",
    supplierName: "",
    storeId: "",
    storeName: "",
  });
  const [details, setDetails] = useState([emptyDetail()]);

  function openNew() {
    setHeader({
      grnNo: generateGrnNo(grns),
      date: today,
      supplierId: "",
      supplierName: "",
      storeId: "",
      storeName: "",
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setView("form");
  }

  function openEdit(rec) {
    setHeader({
      grnNo: rec.grnNo,
      date: rec.date,
      supplierId: rec.supplierId,
      supplierName: rec.supplierName,
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
      let row = {
        ...rows[idx],
        [field]: isNaN(val) || typeof val === "string" ? val : +val,
      };
      // Auto-fill from PO selection
      if (field === "poNo") {
        const po = pos.find((p) => p.poNo === val);
        if (po) {
          row.poDate = po.date || "";
        }
      }
      // Auto-fill UOM when item selected
      if (field === "itemName") {
        const found = items.find((it) => it.itemName === val);
        row.uom = found?.uom || "";
        row.poRate = found?.rate || 0;
        row.grnRate = found?.rate || 0;
      }
      row = calcRow(row);
      rows[idx] = row;
      return rows;
    });
  }

  function handleSave() {
    if (!header.grnNo.trim()) return alert("GRN No is required");
    if (!header.supplierId) return alert("Supplier is required");
    const record = { ...header, details };
    if (editId) {
      setGrns((p) =>
        p.map((x) => (x.id === editId ? { id: editId, ...record } : x)),
      );
    } else {
      setGrns((p) => [...p, { id: nextId(), ...record }]);
    }
    setView("list");
  }

  const totals = details.reduce(
    (acc, r) => ({
      grnAmount: acc.grnAmount + r.grnAmount,
      sgst: acc.sgst + r.sgst,
      cgst: acc.cgst + r.cgst,
      igst: acc.igst + r.igst,
      totGst: acc.totGst + r.totGst,
      totalAmount: acc.totalAmount + r.totalAmount,
    }),
    { grnAmount: 0, sgst: 0, cgst: 0, igst: 0, totGst: 0, totalAmount: 0 },
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
            <h1 className="inv-page-title">Purchase GRN</h1>
            <p className="inv-page-sub">Goods receipt note management</p>
          </div>
          <button className="inv-btn-primary" onClick={openNew}>
            + New GRN
          </button>
        </div>
        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>GRN No</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Store</th>
                    <th>Items</th>
                    <th>Total Amt</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.length === 0 && (
                    <tr>
                      <td colSpan={8} className="inv-empty">
                        No GRN records found
                      </td>
                    </tr>
                  )}
                  {grns.map((rec, i) => (
                    <tr key={rec.id}>
                      <td className="inv-idx">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                        {rec.grnNo}
                      </td>
                      <td>{rec.date}</td>
                      <td>{rec.supplierName}</td>
                      <td>{rec.storeName}</td>
                      <td className="inv-muted-sm">
                        {rec.details.length} item
                        {rec.details.length !== 1 ? "s" : ""}
                      </td>
                      <td
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontWeight: 500,
                        }}
                      >
                        ₹
                        {fmt(
                          rec.details.reduce((s, d) => s + d.totalAmount, 0),
                        )}
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
                              setGrns((p) => p.filter((x) => x.id !== rec.id))
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
                  ))}
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
            {editId ? "Edit GRN" : "New Purchase GRN"}
          </h1>
          <p className="inv-page-sub">
            Record goods received against purchase orders
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => setView("list")}>
            ← Back
          </button>
          <button className="inv-btn-primary" onClick={handleSave}>
            Save GRN
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
                GRN No
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
                value={header.grnNo}
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
              <label className="inv-label">Supplier *</label>
              <select
                className="inv-input"
                value={header.supplierId}
                onChange={(e) => {
                  const s = suppliers.find(
                    (x) => String(x.id) === e.target.value,
                  );
                  setHeader((h) => ({
                    ...h,
                    supplierId: e.target.value,
                    supplierName: s?.supplierName || "",
                  }));
                }}
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.supplierName}
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
                  <th style={{ minWidth: 110 }}>Indent No</th>
                  <th style={{ minWidth: 120 }}>PO No</th>
                  <th style={{ minWidth: 100 }}>PO Date</th>
                  <th style={{ minWidth: 160 }}>Item Name</th>
                  <th style={{ minWidth: 60 }}>UOM</th>
                  <th style={{ minWidth: 75 }}>PO Qty</th>
                  <th style={{ minWidth: 80 }}>Al GRN Qty</th>
                  <th style={{ minWidth: 75 }}>Bal Qty</th>
                  <th style={{ minWidth: 75 }}>GRN Qty</th>
                  <th style={{ minWidth: 80 }}>PO Rate</th>
                  <th style={{ minWidth: 80 }}>GRN Rate</th>
                  <th style={{ minWidth: 65 }}>Disc %</th>
                  <th style={{ minWidth: 90 }}>GRN Amt</th>
                  <th style={{ minWidth: 65 }}>GST %</th>
                  <th style={{ minWidth: 80 }}>SGST</th>
                  <th style={{ minWidth: 80 }}>CGST</th>
                  <th style={{ minWidth: 80 }}>IGST</th>
                  <th style={{ minWidth: 80 }}>Tot GST</th>
                  <th style={{ minWidth: 95 }}>Total Amt</th>
                  <th style={{ minWidth: 130 }}>Remarks</th>
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
                    {/* Indent No */}
                    <td>
                      <select
                        value={row.indentNo}
                        onChange={(e) =>
                          updateDetail(idx, "indentNo", e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="">Select indent</option>
                        {indents.map((ind) => (
                          <option key={ind.id} value={ind.indentNo}>
                            {ind.indentNo}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* PO No */}
                    <td>
                      <select
                        value={row.poNo}
                        onChange={(e) =>
                          updateDetail(idx, "poNo", e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="">Select PO</option>
                        {pos.map((po) => (
                          <option key={po.id} value={po.poNo}>
                            {po.poNo}
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* PO Date — auto filled */}
                    <td>
                      <input
                        value={row.poDate}
                        readOnly
                        style={{ ...roStyle, width: 90 }}
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
                    {/* UOM */}
                    <td>
                      <input
                        value={row.uom}
                        readOnly
                        style={{ ...roStyle, width: 50 }}
                        placeholder="—"
                      />
                    </td>
                    {/* Numeric inputs */}
                    {[
                      "poQty",
                      "alGrnQty",
                      "balQty",
                      "grnQty",
                      "poRate",
                      "grnRate",
                      "discPct",
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
                    {/* Calculated */}
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "DM Mono",
                        fontSize: 11,
                      }}
                    >
                      {fmt(row.grnAmount)}
                    </td>
                    {/* GST % */}
                    <td>
                      <input
                        type="number"
                        value={row.gstPct}
                        onChange={(e) =>
                          updateDetail(idx, "gstPct", e.target.value)
                        }
                        style={{ width: 55, textAlign: "right" }}
                      />
                    </td>
                    {/* Calculated GST fields */}
                    {["sgst", "cgst", "igst", "totGst", "totalAmount"].map(
                      (f) => (
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
                      ),
                    )}
                    <td>
                      <input
                        value={row.remarks}
                        onChange={(e) =>
                          updateDetail(idx, "remarks", e.target.value)
                        }
                        placeholder="Remarks"
                        style={{ width: 120 }}
                      />
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
                    colSpan={13}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    Total
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                    {fmt(totals.grnAmount)}
                  </td>
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
                  <td style={{ textAlign: "right", fontFamily: "DM Mono" }}>
                    {fmt(totals.totalAmount)}
                  </td>
                  <td colSpan={2}></td>
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
              <div className="inv-summary-box-label">
                GRN Amount (before GST)
              </div>
              <div className="inv-summary-box-value">
                ₹{fmt(totals.grnAmount)}
              </div>
            </div>
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">Total GST</div>
              <div className="inv-summary-box-value">₹{fmt(totals.totGst)}</div>
            </div>
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">SGST + CGST</div>
              <div className="inv-summary-box-value">
                ₹{fmt(totals.sgst + totals.cgst)}
              </div>
            </div>
            <div
              className="inv-summary-box"
              style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
            >
              <div className="inv-summary-box-label">Grand Total</div>
              <div
                className="inv-summary-box-value"
                style={{ color: "var(--accent)" }}
              >
                ₹{fmt(totals.totalAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// pages/PurchaseOrderPage.jsx
import { useState, useEffect, useCallback } from "react";
import { purchaseOrderApi } from "../../services/inventoryApi"; // adjust path as needed

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const today = () => new Date().toISOString().split("T")[0];

const sid = (v) => {
  if (!v) return "";
  if (typeof v === "object" && v._id) return String(v._id);
  return String(v);
};

// ─── empty row factory ────────────────────────────────────────────────────────
const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(), // local key only

  // Indent linkage
  indentId: "",
  indentNo: "",
  indentDetailId: "", // _id of the selected indent detail row

  // Item
  itemId: "",
  itemName: "",
  uom: "",

  // Qty
  indentQty: 0,
  alPoQty: 0,
  balQty: 0,
  poQty: 0,

  // Pricing
  priceListRate: 0,
  poRate: 0,

  // Discount
  discMode: "pct",
  discPct: 0,
  discPrice: 0,

  // Computed
  poAmount: 0,
  gstPct: 18,
  sgst: 0,
  cgst: 0,
  igst: 0,
  totGst: 0,
  totalAmount: 0,

  // Remarks
  indentRemarks: "",
  poRemarks: "",
});

const emptyHeader = () => ({
  poNo: "",
  date: today(),
  supplierId: "",
  supplierName: "",
  createdBy: "Admin",
  createdOn: today(),
  status: "Open",
  remarks: "",
});

// ─── GST calculation (server mirrors this logic) ──────────────────────────────
function calcRow(row, gstEnabled, gstType) {
  const baseAmt = (row.poQty || 0) * (row.poRate || 0);

  let discPct = row.discPct || 0;
  let discPrice = row.discPrice || 0;

  if (row.discMode === "price") {
    discPrice = row.discPrice || 0;
    discPct = baseAmt > 0 ? (discPrice / baseAmt) * 100 : 0;
  } else {
    discPct = row.discPct || 0;
    discPrice = baseAmt * (discPct / 100);
  }

  const netAmt = baseAmt - discPrice;
  const gst = gstEnabled ? netAmt * ((row.gstPct || 0) / 100) : 0;

  let sgst = 0,
    cgst = 0,
    igst = 0;
  if (gstEnabled) {
    if (gstType === "other") {
      igst = gst;
    } else {
      sgst = gst / 2;
      cgst = gst / 2;
    }
  }

  return {
    ...row,
    discPct: +discPct.toFixed(4),
    discPrice: +discPrice.toFixed(2),
    poAmount: +netAmt.toFixed(2),
    sgst: +sgst.toFixed(2),
    cgst: +cgst.toFixed(2),
    igst: +igst.toFixed(2),
    totGst: +gst.toFixed(2),
    totalAmount: +(netAmt + gst).toFixed(2),
  };
}

// ─── component ────────────────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  // ── list state ──────────────────────────────────────────────────────────────
  const [pos, setPos] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  // ── indent lookup (for PO form) ─────────────────────────────────────────────
  const [indents, setIndents] = useState([]); // Open purchase indents

  // ── supplier lookup (fetched from backend) ──────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // ── form state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [header, setHeader] = useState(emptyHeader());
  const [details, setDetails] = useState([emptyDetail()]);

  // ── GST config ──────────────────────────────────────────────────────────────
  const [gstEnabled, setGstEnabled] = useState(true);
  // "local" → SGST + CGST split; "other" → IGST only
  const [gstType, setGstType] = useState("local");

  // ── boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPos();
    loadIndents();
    loadSuppliers();
  }, []);

  async function loadPos() {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await purchaseOrderApi.getAll();
      setPos(data);
    } catch (err) {
      setListError(err.message || "Failed to load purchase orders");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadIndents() {
    try {
      // Returns all Open indents regardless of balQty
      const data = await purchaseOrderApi.getIndents();
      setIndents(data);
    } catch (err) {
      console.error("Failed to load indents for PO:", err);
    }
  }

  async function loadSuppliers() {
    setLoadingSuppliers(true);
    try {
      const data = await purchaseOrderApi.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    } finally {
      setLoadingSuppliers(false);
    }
  }

  // ── open new form ────────────────────────────────────────────────────────────
  async function openNew() {
    setFormError(null);
    let poNo = "";
    try {
      const res = await purchaseOrderApi.getNextNumber();
      poNo = res.poNo;
    } catch {
      poNo = "";
    }
    setHeader({ ...emptyHeader(), poNo });
    setDetails([emptyDetail()]);
    setEditId(null);
    setGstEnabled(true);
    setGstType("local");
    setView("form");
  }

  // ── open edit form ───────────────────────────────────────────────────────────
  function openEdit(po) {
    setFormError(null);
    setHeader({
      poNo: po.poNo,
      date: po.date,
      supplierId: sid(po.supplierId),
      supplierName: po.supplierName,
      createdBy: po.createdBy,
      createdOn: po.createdOn,
      status: po.status,
      remarks: po.remarks,
    });
    setDetails(
      (po.details || []).map((d) => ({
        ...d,
        _rowId: Date.now() + Math.random(),
        indentId: sid(d.indentId),
        indentDetailId: sid(d.indentDetailId),
        itemId: sid(d.itemId),
      })),
    );
    setGstEnabled(po.gstEnabled !== false);
    setGstType(po.gstType || "local");
    setEditId(sid(po._id));
    setView("form");
  }

  // ── GST enable toggle ────────────────────────────────────────────────────────
  function toggleGst() {
    const next = !gstEnabled;
    setGstEnabled(next);
    setDetails((prev) => prev.map((r) => calcRow(r, next, gstType)));
  }

  // ── GST type toggle (local ↔ other state) ────────────────────────────────────
  function toggleGstType() {
    const next = gstType === "local" ? "other" : "local";
    setGstType(next);
    setDetails((prev) => prev.map((r) => calcRow(r, gstEnabled, next)));
  }

  // ── update a detail field ────────────────────────────────────────────────────
  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      const row = {
        ...rows[idx],
        [field]: isNaN(val) || val === "" ? val : +val,
      };

      // If user picked an indent row, auto-fill item / qty fields
      if (field === "indentDetailId") {
        // val here is the _id of the indent detail row (string)
        // Find which indent + detail it belongs to
        let found = null;
        let foundIndent = null;
        for (const indent of indents) {
          const detail = (indent.details || []).find((d) => sid(d._id) === val);
          if (detail) {
            found = detail;
            foundIndent = indent;
            break;
          }
        }
        if (found && foundIndent) {
          row.indentDetailId = val;
          row.indentId = sid(foundIndent._id);
          row.indentNo = foundIndent.indentNo;
          row.itemId = sid(found.itemId);
          row.itemName = found.itemName;
          row.uom = found.uom;
          row.indentQty = found.indentQty || 0;
          row.alPoQty = found.alPoQty || 0;
          row.balQty = found.balQty || 0;
          // Pre-fill poQty with balQty (but don't exceed)
          row.poQty = found.balQty || 0;
        } else {
          // Cleared
          row.indentDetailId = "";
          row.indentId = "";
          row.indentNo = "";
        }
      }

      rows[idx] = calcRow(row, gstEnabled, gstType);
      return rows;
    });
  }

  // ── toggle per-row discount mode ─────────────────────────────────────────────
  function toggleDiscMode(idx) {
    setDetails((prev) => {
      const rows = [...prev];
      const next = rows[idx].discMode === "pct" ? "price" : "pct";
      rows[idx] = calcRow(
        { ...rows[idx], discMode: next },
        gstEnabled,
        gstType,
      );
      return rows;
    });
  }

  function addRow() {
    setDetails((p) => [...p, emptyDetail()]);
  }
  function removeRow(idx) {
    setDetails((p) => p.filter((_, i) => i !== idx));
  }

  // ── save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!header.poNo.trim()) return setFormError("PO No is required");
    setFormError(null);
    setSaving(true);

    // Strip local-only _rowId
    const cleanDetails = details.map(({ _rowId, ...rest }) => rest);
    const payload = { ...header, gstEnabled, gstType, details: cleanDetails };

    try {
      if (editId) {
        const updated = await purchaseOrderApi.update(editId, payload);
        setPos((p) => p.map((x) => (sid(x._id) === editId ? updated : x)));
      } else {
        const created = await purchaseOrderApi.create(payload);
        setPos((p) => [created, ...p]);
      }
      // Refresh indents so balQty is up-to-date for next PO
      await loadIndents();
      setView("list");
    } catch (err) {
      setFormError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm("Delete this purchase order?")) return;
    try {
      await purchaseOrderApi.remove(id);
      setPos((p) => p.filter((x) => sid(x._id) !== id));
      await loadIndents();
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  // ── totals ───────────────────────────────────────────────────────────────────
  const totals = details.reduce(
    (acc, r) => ({
      grossAmount: acc.grossAmount + (r.poQty || 0) * (r.poRate || 0),
      discPrice: acc.discPrice + (r.discPrice || 0),
      poAmount: acc.poAmount + (r.poAmount || 0),
      sgst: acc.sgst + (r.sgst || 0),
      cgst: acc.cgst + (r.cgst || 0),
      igst: acc.igst + (r.igst || 0),
      totGst: acc.totGst + (r.totGst || 0),
      totalAmount: acc.totalAmount + (r.totalAmount || 0),
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

  const effectiveDiscPct =
    totals.grossAmount > 0 ? (totals.discPrice / totals.grossAmount) * 100 : 0;

  // ── Build a flat list of all indent detail rows for the dropdown ──────────────
  // Each entry carries enough info to show "IndentNo – ItemName (bal: X)"
  // FIX: Filter out invalid detailIds to prevent duplicate empty keys
  const indentDetailOptions = [];
  for (const indent of indents) {
    for (const d of indent.details || []) {
      const detailId = sid(d._id);
      // Only include if detailId is valid (not empty string)
      if (detailId) {
        indentDetailOptions.push({
          detailId,
          indentId: sid(indent._id),
          indentNo: indent.indentNo,
          itemName: d.itemName || "—",
          uom: d.uom || "",
          indentQty: d.indentQty || 0,
          alPoQty: d.alPoQty || 0,
          balQty: d.balQty ?? d.indentQty ?? 0,
        });
      }
    }
  }

  // ── inline select style ──────────────────────────────────────────────────────
  const selectStyle = {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 11.5,
    background: "transparent",
    padding: "2px 4px",
    cursor: "pointer",
  };

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Purchase Order</h1>
            <p className="inv-page-sub">Manage purchase orders</p>
          </div>
          <button className="inv-btn-primary" onClick={openNew}>
            + New PO
          </button>
        </div>

        {listError && (
          <div className="inv-error-banner">
            {listError}{" "}
            <button
              onClick={loadPos}
              style={{ marginLeft: 8, textDecoration: "underline" }}
            >
              Retry
            </button>
          </div>
        )}

        <div className="inv-card">
          <div className="inv-card-body">
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>PO No</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Created By</th>
                    <th>GST</th>
                    <th>GST Type</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr>
                      <td colSpan={10} className="inv-empty">
                        Loading…
                      </td>
                    </tr>
                  ) : pos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="inv-empty">
                        No purchase orders
                      </td>
                    </tr>
                  ) : (
                    pos.map((po, i) => {
                      const total = (po.details || []).reduce(
                        (s, d) => s + (d.totalAmount || 0),
                        0,
                      );
                      return (
                        <tr key={sid(po._id)}>
                          <td className="inv-idx">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td
                            style={{ fontWeight: 600, color: "var(--accent)" }}
                          >
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
                            {po.gstEnabled !== false ? (
                              <span
                                className={`inv-badge ${po.gstType === "other" ? "inv-badge-no" : "inv-badge-yes"}`}
                              >
                                {po.gstType === "other"
                                  ? "Other State"
                                  : "Local"}
                              </span>
                            ) : (
                              <span className="inv-badge inv-badge-no">—</span>
                            )}
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
                                onClick={() => handleDelete(sid(po._id))}
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FORM VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="inv-page">
      {/* ── Page header ── */}
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">
            {editId ? "Edit Purchase Order" : "New Purchase Order"}
          </h1>
          <p className="inv-page-sub">Fill header, select indents and save</p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* ── GST Enabled toggle ── */}
          <button
            type="button"
            onClick={toggleGst}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              borderRadius: 8,
              cursor: "pointer",
              border: gstEnabled ? "1px solid #86efac" : "1px solid #fca5a5",
              background: gstEnabled ? "#f0fdf4" : "#fff1f2",
              color: gstEnabled ? "#16a34a" : "#dc2626",
              fontWeight: 600,
              fontSize: 13,
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
            GST {gstEnabled ? "On" : "Off"}
          </button>

          {/* ── GST Type toggle (only when GST is enabled) ── */}
          {gstEnabled && (
            <button
              type="button"
              onClick={toggleGstType}
              title="Toggle between Local (SGST+CGST) and Other State (IGST)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                cursor: "pointer",
                border:
                  gstType === "local"
                    ? "1px solid #93c5fd"
                    : "1px solid #c4b5fd",
                background: gstType === "local" ? "#eff6ff" : "#f5f3ff",
                color: gstType === "local" ? "#1d4ed8" : "#7c3aed",
                fontWeight: 600,
                fontSize: 13,
                transition: "all 0.2s",
              }}
            >
              {/* small icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              {gstType === "local" ? "Local (SGST+CGST)" : "Other State (IGST)"}
            </button>
          )}

          <button className="inv-btn-secondary" onClick={() => setView("list")}>
            ← Back
          </button>
          <button
            className="inv-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save PO"}
          </button>
        </div>
      </div>

      {formError && (
        <div className="inv-error-banner" style={{ marginBottom: 12 }}>
          {formError}
        </div>
      )}

      {/* ── Header card ── */}
      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Header</div>
          <div className="inv-form-row cols-4">
            <div className="inv-field">
              <label className="inv-label">
                PO No
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
              <label className="inv-label">
                Supplier
                {loadingSuppliers && (
                  <span
                    style={{ marginLeft: 6, fontSize: 10, color: "#6b7280" }}
                  >
                    Loading...
                  </span>
                )}
              </label>
              <select
                className="inv-input"
                value={header.supplierId}
                onChange={(e) => {
                  const s = suppliers.find(
                    (x) => sid(x._id) === e.target.value,
                  );
                  setHeader((h) => ({
                    ...h,
                    supplierId: e.target.value,
                    supplierName: s?.supplierName || "",
                  }));
                }}
                disabled={loadingSuppliers}
              >
                <option value="">
                  {loadingSuppliers
                    ? "Loading suppliers..."
                    : "Select supplier"}
                </option>
                {suppliers.map((s) => (
                  <option key={sid(s._id)} value={sid(s._id)}>
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
                  {/* Indent picker column */}
                  <th style={{ minWidth: 220 }}>
                    Indent Item
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 400,
                        color: "var(--text-secondary)",
                        marginLeft: 4,
                      }}
                    >
                      (from Purchase Indent)
                    </span>
                  </th>
                  <th style={{ minWidth: 80 }}>UOM</th>
                  <th style={{ minWidth: 80 }}>Indent Qty</th>
                  <th style={{ minWidth: 80 }}>Al PO Qty</th>
                  <th style={{ minWidth: 80 }}>Bal Qty</th>
                  <th style={{ minWidth: 80 }}>PO Qty</th>
                  <th style={{ minWidth: 90 }}>PL Rate</th>
                  <th style={{ minWidth: 90 }}>PO Rate</th>
                  <th style={{ minWidth: 140 }}>
                    Disc
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-secondary)",
                        fontWeight: 400,
                        marginLeft: 4,
                      }}
                    >
                      (per row ▾)
                    </span>
                  </th>
                  <th>PO Amt</th>
                  {gstEnabled && (
                    <>
                      <th>GST %</th>
                      {gstType === "local" ? (
                        <>
                          <th>SGST</th>
                          <th>CGST</th>
                        </>
                      ) : (
                        <th>IGST</th>
                      )}
                      <th>Tot GST</th>
                    </>
                  )}
                  <th>Total Amt</th>
                  <th style={{ minWidth: 130 }}>Indent Rem</th>
                  <th style={{ minWidth: 130 }}>PO Rem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={row._rowId}>
                    <td
                      style={{
                        textAlign: "center",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {idx + 1}
                    </td>

                    {/* ── Indent item picker ── */}
                    <td style={{ minWidth: 220 }}>
                      <select
                        value={row.indentDetailId}
                        onChange={(e) =>
                          updateDetail(idx, "indentDetailId", e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="">— select indent item —</option>
                        {indentDetailOptions.map((opt, optIdx) => (
                          <option
                            key={`${opt.detailId}-${optIdx}`}
                            value={opt.detailId}
                          >
                            {opt.indentNo} › {opt.itemName} (bal: {opt.balQty} /{" "}
                            {opt.indentQty} {opt.uom})
                          </option>
                        ))}
                      </select>
                      {/* Show indent no as small hint */}
                      {row.indentNo && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#6366f1",
                            paddingLeft: 4,
                            marginTop: 2,
                          }}
                        >
                          📋 {row.indentNo}
                        </div>
                      )}
                    </td>

                    {/* UOM — read-only, auto-filled from indent */}
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

                    {/* Indent Qty — read-only (from indent) */}
                    <td>
                      <input
                        type="number"
                        value={row.indentQty}
                        readOnly
                        style={{
                          width: 70,
                          textAlign: "right",
                          background: "#f9fafb",
                          color: "var(--text-secondary)",
                          border: "none",
                          outline: "none",
                          fontSize: 11.5,
                          padding: "2px 4px",
                        }}
                      />
                    </td>

                    {/* Al PO Qty — read-only */}
                    <td>
                      <input
                        type="number"
                        value={row.alPoQty}
                        style={{
                          width: 70,
                          textAlign: "right",
                          background: "#f9fafb",
                          color: "var(--text-secondary)",
                          border: "none",
                          outline: "none",
                          fontSize: 11.5,
                          padding: "2px 4px",
                        }}
                      />
                    </td>

                    {/* Bal Qty — read-only, highlight if zero */}
                    <td>
                      <input
                        type="number"
                        value={row.balQty}
                        readOnly
                        style={{
                          width: 70,
                          textAlign: "right",
                          background:
                            row.balQty === 0 && row.indentQty > 0
                              ? "#fff7ed"
                              : "#f9fafb",
                          color:
                            row.balQty === 0 && row.indentQty > 0
                              ? "#c2410c"
                              : "var(--text-secondary)",
                          border: "none",
                          outline: "none",
                          fontSize: 11.5,
                          padding: "2px 4px",
                        }}
                      />
                    </td>

                    {/* PO Qty — editable */}
                    <td>
                      <input
                        type="number"
                        value={row.poQty}
                        min={0}
                        onChange={(e) =>
                          updateDetail(idx, "poQty", e.target.value)
                        }
                        style={{ width: 70, textAlign: "right" }}
                      />
                    </td>

                    {/* PL Rate */}
                    <td>
                      <input
                        type="number"
                        value={row.priceListRate}
                        onChange={(e) =>
                          updateDetail(idx, "priceListRate", e.target.value)
                        }
                        style={{ width: 80, textAlign: "right" }}
                      />
                    </td>

                    {/* PO Rate */}
                    <td>
                      <input
                        type="number"
                        value={row.poRate}
                        onChange={(e) =>
                          updateDetail(idx, "poRate", e.target.value)
                        }
                        style={{ width: 80, textAlign: "right" }}
                      />
                    </td>

                    {/* ── Discount column ── */}
                    <td style={{ minWidth: 140 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
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
                            minWidth: 32,
                            textAlign: "center",
                            transition: "all 0.15s",
                            background:
                              row.discMode === "pct" ? "#eff6ff" : "#fefce8",
                            borderColor:
                              row.discMode === "pct" ? "#93c5fd" : "#fde047",
                            color:
                              row.discMode === "pct" ? "#1d4ed8" : "#854d0e",
                          }}
                        >
                          {row.discMode === "pct" ? "%" : "₹"}
                        </button>

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

                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.discMode === "pct"
                            ? `₹${fmt(row.discPrice)}`
                            : `${(row.discPct || 0).toFixed(2)}%`}
                        </span>
                      </div>
                    </td>

                    {/* PO Amount */}
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "DM Mono",
                        fontSize: 11,
                      }}
                    >
                      {fmt(row.poAmount)}
                    </td>

                    {/* GST columns */}
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
                        {gstType === "local" ? (
                          <>
                            <td
                              style={{
                                textAlign: "right",
                                fontFamily: "DM Mono",
                                fontSize: 11,
                              }}
                            >
                              {fmt(row.sgst)}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontFamily: "DM Mono",
                                fontSize: 11,
                              }}
                            >
                              {fmt(row.cgst)}
                            </td>
                          </>
                        ) : (
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "DM Mono",
                              fontSize: 11,
                            }}
                          >
                            {fmt(row.igst)}
                          </td>
                        )}
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "DM Mono",
                            fontSize: 11,
                          }}
                        >
                          {fmt(row.totGst)}
                        </td>
                      </>
                    )}

                    {/* Total Amount */}
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "DM Mono",
                        fontSize: 11,
                      }}
                    >
                      {fmt(row.totalAmount)}
                    </td>

                    {/* Indent Remarks */}
                    <td>
                      <input
                        value={row.indentRemarks}
                        onChange={(e) =>
                          updateDetail(idx, "indentRemarks", e.target.value)
                        }
                        style={{ width: 120 }}
                        placeholder="Indent rem…"
                      />
                    </td>

                    {/* PO Remarks */}
                    <td>
                      <input
                        value={row.poRemarks}
                        onChange={(e) =>
                          updateDetail(idx, "poRemarks", e.target.value)
                        }
                        style={{ width: 120 }}
                        placeholder="PO rem…"
                      />
                    </td>

                    {/* Remove row */}
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

              {/* ── Footer totals ── */}
              <tfoot>
                <tr>
                  <td
                    colSpan={9}
                    style={{ textAlign: "right", fontWeight: 600 }}
                  >
                    Total
                  </td>
                  {/* disc total */}
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
                      {gstType === "local" ? (
                        <>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "DM Mono",
                            }}
                          >
                            {fmt(totals.sgst)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "DM Mono",
                            }}
                          >
                            {fmt(totals.cgst)}
                          </td>
                        </>
                      ) : (
                        <td
                          style={{ textAlign: "right", fontFamily: "DM Mono" }}
                        >
                          {fmt(totals.igst)}
                        </td>
                      )}
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

      {/* ── Summary card ── */}
      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-section-label">Summary</div>
          <div className="inv-summary-grid">
            {/* Gross */}
            <div
              className="inv-summary-box"
              style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}
            >
              <div className="inv-summary-box-label">Gross Amount</div>
              <div
                className="inv-summary-box-value"
                style={{ color: "#64748b" }}
              >
                ₹{fmt(totals.grossAmount)}
              </div>
            </div>

            {/* Discount */}
            <div
              className="inv-summary-box"
              style={{
                background: "#fffbeb",
                borderColor: "#fcd34d",
                position: "relative",
                overflow: "hidden",
              }}
            >
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
              <div className="inv-summary-box-label">Total Discount</div>
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

            {/* PO Amount */}
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">
                PO Amount (after disc, before GST)
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

            {/* GST breakdown */}
            {gstEnabled && (
              <>
                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">Total GST</div>
                  <div className="inv-summary-box-value">
                    ₹{fmt(totals.totGst)}
                  </div>
                </div>

                {gstType === "local" ? (
                  <div className="inv-summary-box">
                    <div className="inv-summary-box-label">SGST + CGST</div>
                    <div className="inv-summary-box-value">
                      ₹{fmt(totals.sgst + totals.cgst)}
                    </div>
                  </div>
                ) : (
                  <div className="inv-summary-box">
                    <div className="inv-summary-box-label">
                      IGST (Other State)
                    </div>
                    <div
                      className="inv-summary-box-value"
                      style={{ color: "#7c3aed" }}
                    >
                      ₹{fmt(totals.igst)}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Grand total */}
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

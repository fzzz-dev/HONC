import { useState, useEffect, useCallback } from "react";
import {
  purchaseIndentApi,
  inventoryHeadApi,
  mainCategoryApi,
  itemApi,
  departmentApi,
} from "../../services/inventoryApi";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const today = () => new Date().toISOString().split("T")[0];

// Normalize any _id / headId to a plain string safely
const sid = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v.id || v._id || "");
  return String(v);
};

// Always returns a guaranteed array from indent.details (handles null / object / non-array)
const safeDetails = (details) => {
  if (Array.isArray(details)) return details;
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const emptyDetail = () => ({
  _rowId: Date.now() + Math.random(), // local key only, not sent to API
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

const emptyHeader = () => ({
  indentNo: "",
  date: today(),
  departmentId: "",
  departmentName: "",
  createdBy: "Admin",
  createdOn: today(),
  status: "Open",
  remarks: "",
});

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = ("0000000" + num).substr(-7).match(/^(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Hundred ' : '';
  str += (n[4] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'only ' : '';
  return str;
};

function printPurchaseIndent({ header, details: detailRows, company }) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const rows = detailRows || [];
  const rowsHtml = rows
    .map(
      (d, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(d.itemName)}</td>
      <td class="r">${esc(d.uom)}</td>
      <td class="r b">${Number(d.indentQty || 0)}</td>
      <td>${esc(d.dueDate || "—")}</td>
      <td>${esc(d.remarks || "—")}</td>
    </tr>`,
    )
    .join("");

  const totalQty = rows.reduce((s, r) => s + Number(r.indentQty || 0), 0);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Indent ${esc(header.indentNo)}</title>
<style>
@page { margin: 8mm; size: A4; }
*{box-sizing:border-box;}
body{font-family: Arial, sans-serif; margin:0; padding:10px; color:#000; font-size:10px;}
.container { border: 1px solid #000; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 4px; vertical-align: top; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.bold { font-weight: bold; }
.title { font-size: 14px; border-bottom: 2px solid #000; padding: 4px; margin-bottom: 0; }
.header-box { display: flex; border-bottom: 1px solid #000; }
.header-left { flex: 2; border-right: 1px solid #000; padding: 5px; text-align: center; }
.header-right { flex: 1; }
.doc-info-table td { border: 0; border-bottom: 1px solid #000; border-right: 1px solid #000; }
.doc-info-table td:last-child { border-right: 0; }
.doc-info-table tr:last-child td { border-bottom: 0; }
.section-title { background: #f0f0f0; font-weight: bold; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #000; padding: 2px 5px; }
.lines-table th { background: #f0f0f0; font-size: 9px; }
.lines-table td { height: 25px; border-top: 0; border-bottom: 0; }
.lines-table tr.last-row td { border-bottom: 1px solid #000; height: auto; }
.signature-grid { display: grid; grid-template-columns: 1fr 1fr 1.5fr 1.5fr; border-top: 1px solid #000; }
.sig-col { border-right: 1px solid #000; padding: 5px; height: 100px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
.sig-col:last-child { border-right: 0; }
.sig-label { font-weight: bold; font-size: 9px; text-transform: uppercase; }
@media print { .no-print { display: none; } }
</style></head><body>

<div class="text-right bold" style="margin-bottom: 2px;">Page 1 of 1</div>
<div class="container">
  <div class="text-center bold title">PURCHASE INDENT</div>
  
  <div class="header-box">
  <div class="header-box">
    <div class="header-left" style="flex: 2; padding: 5px; text-align: left; display: flex; gap: 10px; align-items: center;">
      ${company?.logo ? `<img src="${company.logo}" style="max-height: 50px; width: auto;" alt="Logo"/>` : ""}
      <div>
        <div class="bold" style="font-size: 12px;">${esc(company?.companyName || "TEST COMPANY")}</div>
        <div style="font-size: 9px; margin-top: 2px;">${esc(company?.address || "Company Address")}</div>
        <div style="font-size: 9px;">Tel: ${esc(company?.tel || "")} Email: ${esc(company?.email || "")}</div>
        <div style="font-size: 9px;">GSTIN: ${esc(company?.gstin || "")}</div>
      </div>
    </div>
    <div class="header-right" style="border-left: 1px solid #000; flex: 1.5;">
      <table class="doc-info-table" style="height: 100%;">
        <tr style="background: #f0f0f0;">
          <td class="text-center bold">INDENT NUMBER</td>
          <td class="text-center bold">DATE</td>
        </tr>
        <tr>
          <td class="text-center bold" style="font-size: 12px; padding: 5px 0;">${esc(header.indentNo)}</td>
          <td class="text-center bold" style="font-size: 11px;">${esc(new Date(header.date).toLocaleDateString("en-GB"))}</td>
        </tr>
        <tr>
          <td colspan="2" style="border-top: 1px solid #000; padding: 5px;">
            <span class="bold">Department:</span> ${esc(header.departmentName)}<br/>
            <span class="bold">Requested By:</span> ${esc(header.createdBy)}
          </td>
        </tr>
      </table>
    </div>
  </div>

  <table class="lines-table">
    <thead>
      <tr>
        <th width="40">SNO</th>
        <th>ITEM DESCRIPTION</th>
        <th width="50">UOM</th>
        <th width="70">QUANTITY</th>
        <th width="100">DUE DATE</th>
        <th>REMARKS</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((d, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td>${esc(d.itemName)}</td>
          <td class="text-center">${esc(d.uom)}</td>
          <td class="text-right bold">${Number(d.indentQty || 0).toFixed(3)}</td>
          <td class="text-center">${esc(d.dueDate || "—")}</td>
          <td>${esc(d.remarks || "—")}</td>
        </tr>
      `).join("")}
      ${Array.from({ length: Math.max(0, 10 - rows.length) }).map(() => `
        <tr>
          <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `).join("")}
      <tr class="last-row">
        <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    </tbody>
  </table>

  <div style="padding: 5px; border-bottom: 1px solid #000; display: flex;">
    <div style="flex: 1; border-right: 1px solid #000; padding: 10px;">
       <div class="bold" style="font-size: 11px;">SUMMARY:</div>
       <div class="bold" style="font-size: 14px; margin-top: 4px;">TOTAL QTY: ${totalQty.toFixed(3)}</div>
    </div>
    <div style="flex: 1.5; padding: 10px;">
       <div class="bold" style="font-size: 9px; margin-bottom: 4px;">GENERAL REMARKS / DETAILS:</div>
       <div style="font-size: 10px;">${esc(header.remarks || "No specific instructions provided.")}</div>
    </div>
  </div>

  <div class="signature-grid">
    <div class="sig-col">
      <div style="height: 60px;"></div>
      <div class="sig-label">Prepared By</div>
    </div>
    <div class="sig-col">
      <div style="height: 60px;"></div>
      <div class="sig-label">Verified By</div>
    </div>
    <div class="sig-col">
      <div style="height: 60px;"></div>
      <div class="sig-label">HOD Approval</div>
    </div>
    <div class="sig-col">
      <div style="height: 60px;"></div>
      <div class="sig-label">Manager Approval</div>
    </div>
  </div>
</div>

<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},100);});</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    return;
  }
}

export default function PurchaseIndentPage() {
  // ── lookup data ───────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [heads, setHeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  // ── indent list + UI state ────────────────────────────────────────────────
  const [indents, setIndents] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [company, setCompany] = useState(null);

  // ── form state ────────────────────────────────────────────────────────────
  const [view, setView] = useState("form"); // "list" | "form"
  const [editId, setEditId] = useState(null);
  const [header, setHeader] = useState(emptyHeader());
  const [details, setDetails] = useState(Array.from({ length: 10 }, emptyDetail));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // ── Bootstrap — load all lookup data once ─────────────────────────────────
  useEffect(() => {
    loadLookups();
    loadIndents();
    openNew();
  }, []);

  async function loadLookups() {
    try {
      const [depts, headsData, catsData, itemsData, comp] = await Promise.all([
        departmentApi.getAll(),
        inventoryHeadApi.getAll(),
        mainCategoryApi.getAll(),
        itemApi.getAll(),
        fetch("/api/company").then((res) => res.json()),
      ]);
      setDepartments(Array.isArray(depts) ? depts : []);
      setHeads(Array.isArray(headsData) ? headsData : []);
      setCompany(comp);
      setCategories(
        (Array.isArray(catsData) ? catsData : []).map((c) => ({
          ...c,
          id: sid(c.id || c._id),
          _id: sid(c.id || c._id),
          headId: sid(c.headId),
        })),
      );
      setItems(
        (Array.isArray(itemsData) ? itemsData : []).map((it) => ({
          ...it,
          id: sid(it.id || it._id),
          _id: sid(it.id || it._id),
          headId: sid(it.headId),
        })),
      );
    } catch (err) {
      console.error("Lookup load error:", err);
    }
  }

  async function loadIndents() {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await purchaseIndentApi.getAll();
      setIndents(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message || "Failed to load indents");
    } finally {
      setLoadingList(false);
    }
  }

  // ── Open new form — fetch next indent number from backend ─────────────────
  async function openNew() {
    setFormError(null);
    try {
      const { indentNo } = await purchaseIndentApi.getNextNumber();
      setHeader({ ...emptyHeader(), indentNo });
    } catch {
      setHeader({ ...emptyHeader(), indentNo: "" });
    }
    setDetails(Array.from({ length: 10 }, emptyDetail));
    setEditId(null);
    setView("form");
  }

  // ── Open edit form ────────────────────────────────────────────────────────
  function openEdit(indent) {
    setFormError(null);
    setHeader({
      indentNo: indent.indentNo,
      date: indent.date,
      departmentId: sid(indent.departmentId),
      departmentName: indent.departmentName,
      createdBy: indent.createdBy,
      createdOn: indent.createdOn,
      status: indent.status,
      remarks: indent.remarks,
    });
    setDetails(
      safeDetails(indent.details).map((d) => ({
        ...d,
        _rowId: Date.now() + Math.random(),
        inventoryHeadId: sid(d.inventoryHeadId),
        mainCategoryId: sid(d.mainCategoryId),
        itemId: sid(d.itemId),
      })),
    );
    setEditId(sid(indent.id || indent._id));
    setView("form");
  }

  // ── Detail row update with cascading auto-fill ────────────────────────────
  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };

      if (field === "inventoryHeadId") {
        const found = heads.find((h) => sid(h.id || h._id) === val);
        row.inventoryHeadName = found?.headName || "";
        row.mainCategoryId = "";
        row.mainCategoryName = "";
        row.itemId = "";
        row.itemName = "";
        row.uom = "";
      }

      if (field === "mainCategoryId") {
        const found = categories.find((c) => (c.id || c._id) === val);
        row.mainCategoryName = found?.groupName || "";
        row.itemId = "";
        row.itemName = "";
        row.uom = "";
      }

      if (field === "itemId") {
        const found = items.find((it) => (it.id || it._id) === val);
        row.itemName = found?.itemDescription || found?.itemName || "";
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

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!header.indentNo.trim()) return setFormError("Indent No is required");
    if (!header.departmentId) return setFormError("Department is required");
    if (details.length === 0)
      return setFormError("Add at least one detail row");

    setFormError(null);
    setSaving(true);

    const cleanDetails = details.map(({ _rowId, ...rest }) => ({
      ...rest,
      id: rest.id || `dtl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    }));
    const payload = { ...header, details: cleanDetails, createdOn: today() };

    try {
      if (editId) {
        const updated = await purchaseIndentApi.update(editId, payload);
        setIndents((p) =>
          p.map((x) => (sid(x.id || x._id) === editId ? updated : x)),
        );
      } else {
        const created = await purchaseIndentApi.create(payload);
        setIndents((p) => [created, ...p]);
      }
      setView("list");
    } catch (err) {
      setFormError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm("Delete this indent?")) return;
    try {
      await purchaseIndentApi.remove(id);
      setIndents((p) => p.filter((x) => sid(x.id || x._id) !== id));
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  const totalQty = details.reduce((s, r) => s + Number(r.indentQty || 0), 0);

  const selectStyle = {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 11.5,
    background: "transparent",
    padding: "2px 4px",
    cursor: "pointer",
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
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

        {listError && (
          <div className="inv-error-banner">
            {listError}{" "}
            <button
              onClick={loadIndents}
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
                  {loadingList ? (
                    <tr>
                      <td colSpan={9} className="inv-empty">
                        Loading…
                      </td>
                    </tr>
                  ) : indents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="inv-empty">
                        No indent records found
                      </td>
                    </tr>
                  ) : (
                    indents.map((indent, i) => {
                      const indentDetails = safeDetails(indent.details);
                      const qty = indentDetails.reduce(
                        (s, d) => s + Number(d.indentQty || 0),
                        0,
                      );
                      return (
                        <tr key={sid(indent.id || indent._id)}>
                          <td className="inv-idx">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td
                            style={{ fontWeight: 600, color: "var(--accent)" }}
                          >
                            {indent.indentNo}
                          </td>
                          <td>{indent.date}</td>
                          <td>{indent.departmentName}</td>
                          <td>{indent.createdBy}</td>
                          <td className="inv-muted-sm">
                            {indentDetails.length} item
                            {indentDetails.length !== 1 ? "s" : ""}
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
                              className={`inv-badge ${indent.status === "Open" ? "inv-badge-yes" : "inv-badge-no"}`}
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
                                  handleDelete(sid(indent.id || indent._id))
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

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM VIEW
  // ═══════════════════════════════════════════════════════════════════════════
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
            View Indent
          </button>
          <button
            className="inv-btn-ghost"
            type="button"
            onClick={() => printPurchaseIndent({ header, details, company })}
          >
            Print
          </button>
          <button
            className="inv-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Indent"}
          </button>
        </div>
      </div>

      {formError && (
        <div className="inv-error-banner" style={{ marginBottom: 12 }}>
          {formError}
        </div>
      )}

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* ── Sidebar (Left) ── */}
        <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header Card */}
          <div className="inv-card">
            <div className="inv-card-body">
              <div className="inv-section-label">Header</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                        (x) => sid(x.id || x._id) === e.target.value,
                      );
                      setHeader((h) => ({
                        ...h,
                        departmentId: e.target.value,
                        departmentName: d?.name || d?.departmentName || "",
                      }));
                    }}
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={sid(d.id || d._id)} value={sid(d.id || d._id)}>
                        {d.name || d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inv-field">
                  <label className="inv-label">Requested By</label>
                  <input
                    className="inv-input"
                    value={header.createdBy}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, createdBy: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="inv-card">
            <div className="inv-card-body">
              <div className="inv-section-label">Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="inv-field">
                  <label className="inv-label">Remarks</label>
                  <textarea
                    className="inv-input"
                    rows={2}
                    value={header.remarks}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, remarks: e.target.value }))
                    }
                    placeholder="Optional remarks"
                  />
                </div>
                <div className="inv-summary-box">
                  <div className="inv-summary-box-label">Total Indent Qty</div>
                  <div className="inv-summary-box-value" style={{ fontSize: "18px", color: "#1e293b" }}>
                    {fmt(totalQty)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content (Right) ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
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

              <div style={{ overflowX: "auto", minHeight: "400px" }}>
                <table className="po-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th style={{ minWidth: "150px" }}>Main Category</th>
                      <th style={{ minWidth: "200px" }}>Item Description</th>
                      <th style={{ width: "80px" }}>UOM</th>
                      <th style={{ width: "100px" }}>Indent Qty</th>
                      <th style={{ width: "120px" }}>Due Date</th>
                      <th style={{ minWidth: "150px" }}>Remarks</th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((row, idx) => {
                      const filteredCategories = row.inventoryHeadId
                        ? categories.filter((c) => c.headId === row.inventoryHeadId)
                        : categories;

                      const filteredItems = row.mainCategoryId
                        ? items.filter((it) => {
                          const cat = categories.find(
                            (c) => (c.id || c._id) === row.mainCategoryId,
                          );
                          return cat ? it.group === cat.groupName : false;
                        })
                        : row.inventoryHeadId
                          ? items.filter((it) => it.headId === row.inventoryHeadId)
                          : items;

                      return (
                        <tr key={row._rowId}>
                          <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                          <td>
                            <select
                              value={row.mainCategoryId}
                              onChange={(e) => updateDetail(idx, "mainCategoryId", e.target.value)}
                              style={selectStyle}
                            >
                              <option value="">Select Category</option>
                              {filteredCategories.map((c) => (
                                <option key={c.id || c._id} value={c.id || c._id}>
                                  {c.groupName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={row.itemId}
                              onChange={(e) => updateDetail(idx, "itemId", e.target.value)}
                              style={selectStyle}
                            >
                              <option value="">Select Item</option>
                              {filteredItems.map((it) => (
                                <option key={it.id || it._id} value={it.id || it._id}>
                                  {it.itemDescription || it.itemName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              className="inv-input-clean"
                              value={row.uom}
                              readOnly
                              placeholder="—"
                              style={{ textAlign: "center" }}
                            />
                          </td>
                          <td>
                            <input
                              className="inv-input-clean"
                              type="number"
                              step="0.001"
                              value={row.indentQty}
                              min={0}
                              onChange={(e) => updateDetail(idx, "indentQty", e.target.value)}
                              style={{ textAlign: "right", fontWeight: 600 }}
                            />
                          </td>
                          <td>
                            <input
                              className="inv-input-clean"
                              type="date"
                              value={row.dueDate}
                              onChange={(e) => updateDetail(idx, "dueDate", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="inv-input-clean"
                              value={row.remarks}
                              onChange={(e) => updateDetail(idx, "remarks", e.target.value)}
                              placeholder="Optional"
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="inv-btn-icon inv-btn-danger"
                              onClick={() => removeRow(idx)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc" }}>
                      <td colSpan={4} style={{ textAlign: "right", fontWeight: 700, paddingRight: "15px" }}>
                        Total
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#4f46e5" }}>
                        {fmt(totalQty)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect, useMemo } from "react";
import Modal from "../components/Modal";
import {
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
  FormGrid,
} from "../components/FormFields";
import {
  itemApi,
  inventoryHeadApi,
  mainCategoryApi,
  uomApi,
  makeApi,
  specApi,
} from "../services/inventoryApi";
import * as XLSX from 'xlsx'; // Add this import

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const EMPTY = {
  headId: "",
  head: "",
  group: "",
  itemName: "",
  uom: "",
  make: "",
  spec: "",
  movementType: "moving",
  itemDescription: "",
  minimumStock: "",
  minimumOrderQty: "",
  leadDays: "",
  inTransitDays: "",
  hsnCode: "",
  gstPercent: "",
  rackBinNo: "",
  rate: "",
  active: true,
  image: null,
  imageFile: null,
};

const GST_OPTIONS = [5, 12, 18];

export default function ItemPage() {
  // ── Data state ───────────────────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [heads, setHeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);
  const [makeOptions, setMakeOptions] = useState([]);
  const [specOptions, setSpecOptions] = useState([]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    gstPercent: "",
    gstPercentError: "",
  });
  const [filterHead, setFilterHead] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  const [makeModalOpen, setMakeModalOpen] = useState(false);
  const [makeForm, setMakeForm] = useState({ name: "", description: "" });
  const [makeSaving, setMakeSaving] = useState(false);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [specForm, setSpecForm] = useState({ name: "" });
  const [specSaving, setSpecSaving] = useState(false);
  const fileRef = useRef();
  const bulkFileRef = useRef();

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [itemsData, headsData, catsData, uomsData, makesData, specsData] =
        await Promise.all([
          itemApi.getAll(),
          inventoryHeadApi.getAll(),
          mainCategoryApi.getAll(),
          uomApi.getAll(),
          makeApi.getAll(),
          specApi.getAll(),
        ]);
      setItems(itemsData);
      setHeads(headsData);
      const normalizedCats = catsData.map((c) => ({
        ...c,
        headId:
          c.headId && typeof c.headId === "object" && c.headId._id
            ? String(c.headId._id)
            : String(c.headId ?? ""),
      }));
      setCategories(normalizedCats);
      setUomOptions(uomsData);
      setMakeOptions(makesData);
      setSpecOptions(specsData);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // ── Export to Excel function ─────────────────────────────────────────────────
  const exportToExcel = () => {
    // Define the columns to export
    const columnsToExport = [
      { header: "Item", key: "itemName" },
      { header: "Head", key: "head" },
      { header: "Category", key: "group" },
      { header: "UOM", key: "uom" },
      { header: "Make", key: "make" },
      { header: "Spec", key: "spec" },
      { header: "Movement", key: "movementType", transform: (val) => val === "moving" ? "Moving" : "Non-Moving" },
      { header: "Description", key: "itemDescription" },
      { header: "Unit Price", key: "rate", transform: (val) => `₹${Number(val || 0).toFixed(2)}` },
    ];

    // Get filtered data
    const exportData = filtered.map(item => {
      const row = {};
      columnsToExport.forEach(col => {
        let value = item[col.key];
        if (col.transform) {
          value = col.transform(value);
        }
        row[col.header] = value || "—";
      });
      return row;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 30 }, // Item
      { wch: 20 }, // Head
      { wch: 25 }, // Category
      { wch: 10 }, // UOM
      { wch: 20 }, // Make
      { wch: 20 }, // Spec
      { wch: 12 }, // Movement
      { wch: 40 }, // Description
      { wch: 15 }, // Unit Price
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items");

    // Download file
    XLSX.writeFile(wb, `items_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // ── Derived dropdown options ──────────────────────────────────────────────────
  const headSelectOptions = heads.map((h) => ({
    value: String(h.id || h._id),
    label: h.headName,
  }));

  const filterGroupOptions = categories
    .filter((c) => !filterHead || String(c.headId) === String(filterHead))
    .map((c) => c.groupName)
    .filter((v, i, a) => v && a.indexOf(v) === i);

  const modalGroupOptions = categories
    .filter((c) => !form.headId || String(c.headId) === String(form.headId))
    .map((c) => c.groupName)
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .map((g) => ({ value: g, label: g }));

  const uomSelectOptions = uomOptions
    .filter((u) => u.active !== false)
    .map((u) => ({
      value: u.name ?? u.uom ?? String(u.id || u._id),
      label: u.name ?? u.uom,
    }));

  const makeSelectOptions = makeOptions
    .filter((m) => m.active !== false)
    .map((m) => ({ value: m.name, label: m.name }));

  const specSelectOptions = specOptions
    .filter((s) => s.active !== false)
    .map((s) => ({ value: s.name, label: s.name }));

  const computedItemDescription = useMemo(() => {
    const n = String(form.itemName || "").trim();
    const s = String(form.spec || "").trim();
    const m = String(form.make || "").trim();
    if (s && m) return `${n} ${s} ${m}`.replace(/\s+/g, " ").trim();
    return n;
  }, [form.itemName, form.spec, form.make]);

  // ── Filtered table rows ───────────────────────────────────────────────────────
  const filtered = items.filter((it) => {
    const q = search.toLowerCase();
    const matchSearch =
      it.itemName.toLowerCase().includes(q) ||
      (it.make || "").toLowerCase().includes(q) ||
      (it.spec || "").toLowerCase().includes(q);
    const matchHead = !filterHead || String(it.headId) === String(filterHead);
    const matchGroup = !filterGroup || it.group === filterGroup;
    return matchSearch && matchHead && matchGroup;
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      headId: String(row.headId?.id || row.headId?._id || row.headId),
      head: row.head || "",
      group: row.group || "",
      itemName: row.itemName || "",
      uom: row.uom || "",
      make: row.make || "",
      spec: row.spec || "",
      movementType: row.movementType || "moving",
      itemDescription: row.itemDescription || "",
      minimumStock: String(row.minimumStock ?? ""),
      minimumOrderQty: String(row.minimumOrderQty ?? ""),
      leadDays: String(row.leadDays ?? ""),
      inTransitDays: String(row.inTransitDays ?? ""),
      hsnCode: row.hsnCode || "",
      gstPercent: String(row.gstPercent ?? ""),
      rackBinNo: row.rackBinNo || "",
      rate: String(row.rate ?? ""),
      active: row.active ?? true,
      image: row.image || null,
      imageFile: null,
    });
    setModal({ mode: "edit", id: row.id || row._id });
  }

  function handleHeadChange(val) {
    const head = heads.find((h) => String(h.id || h._id) === val);
    setForm((f) => ({
      ...f,
      headId: val,
      head: head ? head.headName : "",
      group: "",
    }));
  }

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, image: previewUrl, imageFile: file }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.itemName.trim()) return alert("Item Description is required");
    if (!form.headId || !form.head) return alert("Head is required");
    if (!form.gstPercent || form.gstPercent === "") {
      setForm(f => ({ ...f, gstPercentError: "GST % is required. Please select a value." }));
      return;
    }
    setForm(f => ({ ...f, gstPercentError: "" }));
    setSaving(true);
    try {
      let result;
      if (form.imageFile) {
        const fd = new FormData();
        fd.append("image", form.imageFile);
        fd.append("headId", form.headId);
        fd.append("head", form.head);
        fd.append("group", form.group);
        fd.append("itemName", form.itemName);
        fd.append("uom", form.uom);
        fd.append("make", form.make);
        fd.append("spec", form.spec);
        fd.append("movementType", form.movementType);
        fd.append("itemDescription", computedItemDescription);
        fd.append("minimumStock", parseFloat(form.minimumStock) || 0);
        fd.append("minimumOrderQty", parseFloat(form.minimumOrderQty) || 0);
        fd.append("leadDays", parseInt(form.leadDays, 10) || 0);
        fd.append("inTransitDays", parseInt(form.inTransitDays, 10) || 0);
        fd.append("hsnCode", form.hsnCode);
        fd.append("gstPercent", parseFloat(form.gstPercent) || 0);
        fd.append("rackBinNo", form.rackBinNo);
        fd.append("rate", parseFloat(form.rate) || 0);
        fd.append("active", form.active);
        const url = modal.mode === "add"
          ? `${API_BASE}/items`
          : `${API_BASE}/items/${modal.id}`;
        const method = modal.mode === "add" ? "POST" : "PUT";
        const res = await fetch(url, { method, body: fd });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        result = data.data;
      } else {
        const payload = {
          headId: form.headId,
          head: form.head,
          group: form.group,
          itemName: form.itemName,
          uom: form.uom,
          make: form.make,
          spec: form.spec,
          movementType: form.movementType,
          itemDescription: computedItemDescription,
          minimumStock: parseFloat(form.minimumStock) || 0,
          minimumOrderQty: parseFloat(form.minimumOrderQty) || 0,
          leadDays: parseInt(form.leadDays, 10) || 0,
          inTransitDays: parseInt(form.inTransitDays, 10) || 0,
          hsnCode: form.hsnCode,
          gstPercent: parseFloat(form.gstPercent) || 0,
          rackBinNo: form.rackBinNo,
          rate: parseFloat(form.rate) || 0,
          active: form.active,
          image: form.image,
        };
        result = modal.mode === "add"
          ? await itemApi.create(payload)
          : await itemApi.update(modal.id, payload);
      }
      if (modal.mode === "add") {
        setItems((prev) => [result, ...prev]);
      } else {
        setItems((prev) =>
          prev.map((it) => ((it.id || it._id) === modal.id ? result : it))
        );
      }
      setModal(null);
    } catch (err) {
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickAddMake() {
    if (!makeForm.name.trim()) return alert("Make Name is required");
    setMakeSaving(true);
    try {
      const payload = {
        name: makeForm.name.trim(),
        description: makeForm.description?.trim() || "",
        active: true,
      };
      const saved = await makeApi.create(payload);
      setMakeOptions((prev) => [...prev, saved]);
      setForm((f) => ({ ...f, make: saved.name }));
      setMakeModalOpen(false);
      setMakeForm({ name: "", description: "" });
    } catch (err) {
      alert(err.message || "Failed to add Make");
    } finally {
      setMakeSaving(false);
    }
  }

  async function handleQuickAddSpec() {
    if (!specForm.name.trim()) return alert("Spec Name is required");
    setSpecSaving(true);
    try {
      const payload = {
        name: specForm.name.trim(),
        active: true,
      };
      const saved = await specApi.create(payload);
      setSpecOptions((prev) => [...prev, saved]);
      setForm((f) => ({ ...f, spec: saved.name }));
      setSpecModalOpen(false);
      setSpecForm({ name: "" });
    } catch (err) {
      alert(err.message || "Failed to add Spec");
    } finally {
      setSpecSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await itemApi.remove(id);
      setItems((prev) => prev.filter((it) => (it.id || it._id) !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message || "Delete failed");
    }
  }

  async function handleDownloadTemplate() {
    try {
      const blob = await itemApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "item-bulk-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Template download failed");
    }
  }

  async function handleBulkFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const result = await itemApi.bulkUpload(file);
      await loadAll();
      setBulkUploadResult(result);
    } catch (err) {
      alert(err.message || "Bulk upload failed");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Item</h1>
          <p className="inv-page-sub">
            Full inventory item catalogue with specifications
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-ghost" onClick={exportToExcel}>
            Export as Excel
          </button>
          <button className="inv-btn-ghost" onClick={handleDownloadTemplate}>
            Download Template
          </button>
          <button
            className="inv-btn-ghost"
            onClick={() => bulkFileRef.current?.click()}
          >
            Bulk Upload
          </button>
          <input
            ref={bulkFileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleBulkFileChange}
          />
          <button className="inv-btn-primary" onClick={openAdd}>
            + Add Item
          </button>
        </div>
      </div>

      {error && (
        <div className="inv-error-banner">
          {error}{" "}
          <button
            onClick={loadAll}
            style={{ marginLeft: 8, textDecoration: "underline" }}
          >
            Retry
          </button>
        </div>
      )}

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
              <option key={h.id || h._id} value={String(h.id || h._id)}>
                {h.headName}
              </option>
            ))}
          </select>
          <select
            className="inv-filter-select"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
          >
            <option value="">All Categories</option>
            {filterGroupOptions.map((g) => (
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
                <th>Item</th>
                <th>Head</th>
                <th>Category</th>
                <th>UOM</th>
                <th>Make</th>
                <th>Spec</th>
                <th>Movement</th>
                <th>Description</th>
                <th>Unit Price</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="inv-empty">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="inv-empty">
                    No records found
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id || row._id}>
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
                    <td>{row.uom}</td>
                    <td className="inv-muted-sm">{row.make}</td>
                    <td className="inv-spec">{row.spec}</td>
                    <td className="inv-muted-sm">
                      {row.movementType === "non-moving"
                        ? "Non-Moving"
                        : "Moving"}
                    </td>
                    <td
                      className="inv-muted-sm"
                      style={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.itemDescription || ""}
                    >
                      {row.itemDescription || "—"}
                    </td>
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
                          title="Edit"
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
                          onClick={() => setDeleteConfirm(row.id || row._id)}
                          title="Delete"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rest of your modals remain the same */}
      
      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add Item" : "Edit Item"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          {/* Modal content remains the same */}
          <FormGrid>
            <Field label="Head" required>
              <Select
                value={form.headId}
                onChange={handleHeadChange}
                options={headSelectOptions}
                placeholder="Select head..."
              />
            </Field>
            <Field label="Category">
              <Select
                value={form.group}
                onChange={(v) => setForm((f) => ({ ...f, group: v }))}
                options={modalGroupOptions}
                placeholder={
                  form.headId ? "Select category..." : "Select a head first"
                }
              />
            </Field>
          </FormGrid>

          <FormGrid className="inv-form-grid--item-uom">
            <Field label="Item" required>
              <Input
                value={form.itemName}
                onChange={(v) => setForm((f) => ({ ...f, itemName: v }))}
                placeholder="e.g. MS Flat Bar 50x6"
              />
            </Field>
            <Field label="UOM">
              <Select
                value={form.uom}
                onChange={(v) => setForm((f) => ({ ...f, uom: v }))}
                options={uomSelectOptions}
                placeholder="Select UOM..."
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Make">
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Select
                    value={form.make}
                    onChange={(v) => setForm((f) => ({ ...f, make: v }))}
                    options={makeSelectOptions}
                    placeholder="Select make..."
                  />
                </div>
                <button
                  type="button"
                  className="inv-btn-ghost"
                  style={{
                    padding: 0,
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: "6px",
                  }}
                  onClick={() => {
                    setMakeForm({ name: "", description: "" });
                    setMakeModalOpen(true);
                  }}
                  title="Add Make"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </Field>
            <Field label="Spec">
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Select
                    value={form.spec}
                    onChange={(v) => setForm((f) => ({ ...f, spec: v }))}
                    options={specSelectOptions}
                    placeholder="Select spec..."
                  />
                </div>
                <button
                  type="button"
                  className="inv-btn-ghost"
                  style={{
                    padding: 0,
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: "6px",
                  }}
                  onClick={() => {
                    setSpecForm({ name: "" });
                    setSpecModalOpen(true);
                  }}
                  title="Add Spec"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Moving / Non Moving" required>
              <Select
                value={form.movementType}
                onChange={(v) => setForm((f) => ({ ...f, movementType: v }))}
                options={[
                  { value: "moving", label: "Moving" },
                  { value: "non-moving", label: "Non-Moving" },
                ]}
                placeholder="Select movement type..."
              />
            </Field>
            <Field label="Minimum Stock">
              <Input
                type="number"
                value={form.minimumStock}
                onChange={(v) => setForm((f) => ({ ...f, minimumStock: v }))}
                placeholder="0"
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Minimum Order Qty">
              <Input
                type="number"
                value={form.minimumOrderQty}
                onChange={(v) => setForm((f) => ({ ...f, minimumOrderQty: v }))}
                placeholder="0"
              />
            </Field>
            <Field label="Lead Days">
              <Input
                type="number"
                value={form.leadDays}
                onChange={(v) => setForm((f) => ({ ...f, leadDays: v }))}
                placeholder="0"
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="In Transit Days">
              <Input
                type="number"
                value={form.inTransitDays}
                onChange={(v) => setForm((f) => ({ ...f, inTransitDays: v }))}
                placeholder="0"
              />
            </Field>
            <Field label="HSN Code">
              <Input
                value={form.hsnCode}
                onChange={(v) => setForm((f) => ({ ...f, hsnCode: v }))}
                placeholder="HSN"
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="GST % *">
              <Select
                value={form.gstPercent}
                onChange={(v) => {
                  setForm((f) => ({ 
                    ...f, 
                    gstPercent: Number(v), 
                    gstPercentError: ""
                  }));
                }}
                options={GST_OPTIONS.map(v => ({ value: v, label: `${v}%` }))}
                placeholder="Select GST %"
                className={form.gstPercentError ? "error-field" : ""}
              />
              {form.gstPercentError && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>
                  ⚠️ {form.gstPercentError}
                </div>
              )}
            </Field>
            <Field label="Rack – Bin No">
              <Input
                value={form.rackBinNo}
                onChange={(v) => setForm((f) => ({ ...f, rackBinNo: v }))}
                placeholder="e.g. A-12-03"
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Unit Price (₹)">
              <Input
                type="number"
                value={form.rate}
                onChange={(v) => setForm((f) => ({ ...f, rate: v }))}
                placeholder="0.00"
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Status">
              <div style={{ paddingTop: "6px" }}>
                <Toggle
                  value={form.active}
                  onChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
              </div>
            </Field>
          </FormGrid>

          <Field label="Item Description (auto)">
            <Textarea
              value={computedItemDescription}
              readOnly
              placeholder="Derived from Item Description, Spec, and Make"
              rows={2}
              style={{ background: "var(--surface-muted, #f8fafc)" }}
            />
          </Field>

          <Field label="Image">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                  onClick={() =>
                    setForm((f) => ({ ...f, image: null, imageFile: null }))
                  }
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
        </Modal>
      )}

      {/* Delete Confirm Modal */}
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

      {/* Bulk Upload Summary Modal */}
      {bulkUploadResult && (
        <Modal
          title="Bulk Upload Summary"
          onClose={() => setBulkUploadResult(null)}
          onSave={() => setBulkUploadResult(null)}
          saveLabel="Close"
        >
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px" }}><strong>Inserted:</strong> {bulkUploadResult.insertedCount}</p>
            <p style={{ margin: "0 0 8px" }}><strong>Failed:</strong> {bulkUploadResult.failedCount}</p>
          </div>
          {bulkUploadResult.errors?.length > 0 && (
            <div>
              <div className="inv-section-label" style={{ color: "#dc2626", marginBottom: 8, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Errors</div>
              <div style={{ maxHeight: 250, overflowY: "auto", background: "#fef2f2", padding: 12, borderRadius: 6, border: "1px solid #fca5a5", fontSize: 13, color: "#991b1b" }}>
                {bulkUploadResult.errors.map((e, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    <strong>Row {e.row}:</strong> {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Quick Add Make Modal */}
      {makeModalOpen && (
        <Modal
          title="Add Make"
          onClose={() => setMakeModalOpen(false)}
          onSave={handleQuickAddMake}
          saveLabel={makeSaving ? "Saving…" : "Save"}
        >
          <Field label="Name" required>
            <Input
              value={makeForm.name}
              onChange={(v) => setMakeForm((f) => ({ ...f, name: v }))}
              placeholder="Enter make / brand name"
            />
          </Field>
          <Field label="Description">
            <Input
              value={makeForm.description}
              onChange={(v) => setMakeForm((f) => ({ ...f, description: v }))}
              placeholder="Description (optional)"
            />
          </Field>
        </Modal>
      )}

      {/* Quick Add Spec Modal */}
      {specModalOpen && (
        <Modal
          title="Add Spec Name"
          onClose={() => setSpecModalOpen(false)}
          onSave={handleQuickAddSpec}
          saveLabel={specSaving ? "Saving…" : "Save"}
        >
          <Field label="Name" required>
            <Input
              value={specForm.name}
              onChange={(v) => setSpecForm((f) => ({ ...f, name: v }))}
              placeholder="Enter specification name"
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}
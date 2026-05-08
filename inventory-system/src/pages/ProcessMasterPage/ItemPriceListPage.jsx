import { useState, useEffect } from "react";
import ItemPriceListAPI from "../../services/Itempricelistapi";
import { inventoryHeadApi, itemApi, supplierApi } from "../../services/inventoryApi";

let _id = 700;
const nextId = () => ++_id;

const emptyDetail = () => ({
  id: nextId(),
  inventoryHeadId: "",
  inventoryHeadName: "",
  itemId: "",
  itemName: "",
  price: 0,
  discPct: 0,
  gstPct: 0,
  fromDate: "",
  toDate: "",
  freight: 0,
  others: 0,
  notes: "",
});

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });



export default function ItemPriceListPage() {
  const today = new Date().toISOString().split("T")[0];
  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [priceLists, setPriceLists] = useState([]);

  // Lookup data
  const [heads, setHeads] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [header, setHeader] = useState({
    listNo: "",
    supplierId: "",
    supplierName: "",
    date: today,
  });
  const [details, setDetails] = useState([emptyDetail()]);

  // Load data on component mount
  useEffect(() => {
    loadLookups();
    loadPriceLists();
  }, []);

  async function loadLookups() {
    try {
      const [headsData, itemsData, suppsData] = await Promise.all([
        inventoryHeadApi.getAll(),
        itemApi.getAll(),
        supplierApi.getAll(),
      ]);
      setHeads(headsData);
      setItems(itemsData);
      setSuppliers(suppsData);
    } catch (err) {
      console.error("Failed to load lookups", err);
    }
  }

  /**
   * Load all price lists from API
   */
  async function loadPriceLists() {
    setLoading(true);
    setError(null);
    try {
      const response = await ItemPriceListAPI.getAll();
      setPriceLists(response.data || response || []);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load price lists:", err);
    } finally {
      setLoading(false);
    }
  }

  async function openNew() {
    setHeader({
      listNo: "", // Fetched from backend
      supplierId: "",
      supplierName: "",
      date: today,
    });
    setDetails([emptyDetail()]);
    setEditId(null);
    setView("form");
    try {
      const res = await ItemPriceListAPI.getNextNumber();
      if (res?.listNo) setHeader(h => ({ ...h, listNo: res.listNo }));
    } catch (e) { }
  }

  async function openEdit(rec) {
    setLoading(true);
    setError(null);
    try {
      // Fetch full details from API
      const response = await ItemPriceListAPI.getById(rec.id);
      const fullRecord = response.data || response;

      setHeader({
        listNo: fullRecord.listNo,
        supplierId: fullRecord.supplierId,
        supplierName: fullRecord.supplierName,
        date: fullRecord.date,
      });
      setDetails(fullRecord.details.map((d) => ({ ...d })));
      setEditId(fullRecord.id);
      setView("form");
    } catch (err) {
      setError(err.message);
      console.error("Failed to load price list:", err);
      alert("Failed to load price list details");
    } finally {
      setLoading(false);
    }
  }

  function updateDetail(idx, field, val) {
    setDetails((prev) => {
      const rows = [...prev];
      const row = { ...rows[idx], [field]: val };
      if (field === "inventoryHeadId") {
        const found = heads.find((h) => String(h.id) === String(val));
        row.inventoryHeadName = found?.headName || "";
        row.itemId = "";
        row.itemName = "";
      }
      if (field === "itemId") {
        const found = items.find((it) => String(it.id) === String(val));
        row.itemName = found?.itemName || "";
        row.price = found?.rate || 0;
        row.gstPct = found?.gstPercent !== undefined ? found.gstPercent : 0;
      }
      rows[idx] = row;
      return rows;
    });
  }

  async function handleSave() {
    if (!header.supplierId) {
      alert("Supplier is required");
      return;
    }

    setLoading(true);
    setError(null);

    const record = {
      listNo: header.listNo,
      supplierId: header.supplierId,
      supplierName: header.supplierName,
      date: header.date,
      details: details,
    };

    try {
      if (editId) {
        // Update existing
        await ItemPriceListAPI.update(editId, record);
        alert("Price list updated successfully!");
      } else {
        // Create new
        await ItemPriceListAPI.create(record);
        alert("Price list created successfully!");
      }

      // Reload the list
      await loadPriceLists();
      setView("list");
    } catch (err) {
      setError(err.message);
      console.error("Failed to save price list:", err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this price list?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ItemPriceListAPI.delete(id);
      alert("Price list deleted successfully!");
      await loadPriceLists();
    } catch (err) {
      setError(err.message);
      console.error("Failed to delete price list:", err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const selectStyle = {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 11.5,
    background: "transparent",
    padding: "2px 4px",
    cursor: "pointer",
  };

  /* ── LIST ── */
  if (view === "list") {
    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Item Price List</h1>
            <p className="inv-page-sub">Manage supplier item price lists</p>
          </div>
          <button
            className="inv-btn-primary"
            onClick={openNew}
            disabled={loading}
          >
            + New Price List
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: 6,
              color: "#c00",
              marginBottom: 16,
            }}
          >
            Error: {error}
          </div>
        )}

        <div className="inv-card">
          <div className="inv-card-body">
            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#999",
                }}
              >
                Loading...
              </div>
            ) : (
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>List No</th>
                      <th>Supplier</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceLists.length === 0 && (
                      <tr>
                        <td colSpan={6} className="inv-empty">
                          No price lists found
                        </td>
                      </tr>
                    )}
                    {priceLists.map((rec, i) => (
                      <tr key={rec.id}>
                        <td className="inv-idx">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                          {rec.listNo}
                        </td>
                        <td>{rec.supplierName}</td>
                        <td>{rec.date}</td>
                        <td className="inv-muted-sm">
                          {Array.isArray(rec.details) ? rec.details.length : 0} item
                          {(Array.isArray(rec.details) ? rec.details.length : 0) !== 1 ? "s" : ""}
                        </td>
                        <td>
                          <div className="inv-actions">
                            <button
                              className="inv-btn-icon"
                              onClick={() => openEdit(rec)}
                              disabled={loading}
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
                              onClick={() => handleDelete(rec.id)}
                              disabled={loading}
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
            )}
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
            {editId ? "Edit Price List" : "New Price List"}
          </h1>
          <p className="inv-page-sub">Set item prices per supplier</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="inv-btn-secondary"
            onClick={() => setView("list")}
            disabled={loading}
          >
            ← Back
          </button>
          <button
            className="inv-btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: 6,
            color: "#c00",
            marginBottom: 16,
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Header */}
      <div className="inv-card">
        <div className="inv-card-body">

          <div className="inv-form-row cols-4">
            <div className="inv-field">
              <label className="inv-label">List No (Auto)</label>
              <input
                className="inv-input"
                value={header.listNo}
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
              justifyContent: "flex-end",
              marginBottom: 10,
            }}
          >
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
                  <th style={{ minWidth: 140 }}>Item Category</th>
                  <th style={{ minWidth: 160 }}>Item Name</th>
                  <th style={{ minWidth: 90 }}>Price</th>
                  <th style={{ minWidth: 70 }}>Disc %</th>
                  <th style={{ minWidth: 70 }}>GST %</th>
                  <th style={{ minWidth: 120 }}>From Date</th>
                  <th style={{ minWidth: 120 }}>To Date</th>
                  <th style={{ minWidth: 80 }}>Freight</th>
                  <th style={{ minWidth: 80 }}>Others</th>
                  <th style={{ minWidth: 150 }}>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => {
                  const filteredItems = row.inventoryHeadId
                    ? items.filter(
                        (it) =>
                          String(it.headId) === String(row.inventoryHeadId),
                      )
                    : items;
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

                      <td>
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
                      {["price", "discPct", "gstPct"].map((f) => (
                        <td key={f}>
                          <input
                            type="number"
                            value={row[f]}
                            onChange={(e) =>
                              updateDetail(idx, f, +e.target.value)
                            }
                            style={{ width: 70, textAlign: "right" }}
                            readOnly={f === "gstPct"}
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          type="date"
                          value={row.fromDate}
                          onChange={(e) =>
                            updateDetail(idx, "fromDate", e.target.value)
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
                      <td>
                        <input
                          type="date"
                          value={row.toDate}
                          onChange={(e) =>
                            updateDetail(idx, "toDate", e.target.value)
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
                      {["freight", "others"].map((f) => (
                        <td key={f}>
                          <input
                            type="number"
                            value={row[f]}
                            onChange={(e) =>
                              updateDetail(idx, f, +e.target.value)
                            }
                            style={{ width: 70, textAlign: "right" }}
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          value={row.notes}
                          onChange={(e) =>
                            updateDetail(idx, "notes", e.target.value)
                          }
                          placeholder="Notes"
                          style={{ width: 130 }}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="inv-card">
        <div className="inv-card-body">

          <div className="inv-summary-grid">
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">Supplier</div>
              <div className="inv-summary-box-value" style={{ fontSize: 15 }}>
                {header.supplierName || "—"}
              </div>
            </div>
            <div className="inv-summary-box">
              <div className="inv-summary-box-label">Total Line Items</div>
              <div className="inv-summary-box-value">{details.length}</div>
            </div>
            <div
              className="inv-summary-box"
              style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
            >
              <div className="inv-summary-box-label">Date</div>
              <div
                className="inv-summary-box-value"
                style={{ color: "var(--accent)", fontSize: 15 }}
              >
                {header.date}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

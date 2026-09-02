import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { supplierApi } from "../../services/inventoryApi";
import { productionApi } from "../../services/productionApi";
import Modal from "../../components/Modal";
import { SearchSelect } from "../../components/FormFields";
import { enquiryApi } from "../../services/transactionApi";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const getTodayDate = () => new Date().toISOString().split("T")[0];


const sid = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v.id || v._id || "");
  return String(v);
};

const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const emptyDetail = () => ({
  _rowId: Math.random(),
  colour: "",
  counts: "",
  yarnType: "",
  enqQty: "0.000",
  exShadeNo: ""
});

const emptyHeader = () => ({
  docId: "",
  date: getTodayDate(),
  customer: "",
  customerName: "",
  enqRefNo: "",
  refDate: "",
  styleRefNo: "",
  preparedBy: "",
  remarks: ""
});

const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px" }}>{children}</div>
);

const Field = ({ label, children, horizontal = true }) => (
  <div className={`inv-field ${horizontal ? 'inv-field-h' : ''}`}>
    <label className="inv-label">{label}</label>
    <div className="inv-field-content" style={{ flex: 1 }}>{children}</div>
  </div>
);

export default function Enquiry() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [colors, setColors] = useState([]);
  const [counts, setCounts] = useState([]);
  const [yarnTypes, setYarnTypes] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [view, setView] = useState("form");
  const [editId, setEditId] = useState(null);
  const [header, setHeader] = useState(emptyHeader());
  const [details, setDetails] = useState([emptyDetail()]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  const [formError, setFormError] = useState(null);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);
  const { setHasChanges } = useUnsavedChanges();

  // Refs for tab flow
  const addButtonRef = useRef(null);
  const viewListButtonRef = useRef(null);
  const saveButtonRef = useRef(null);
  const prevDetailsLengthRef = useRef(details.length);

  useEffect(() => {
    loadLookups();
    loadEnquiries();
    openNew();
  }, []);

  // Initial focus on tabIndex=1 when page loads
  useEffect(() => {
    setTimeout(() => {
      const firstElement = document.querySelector('[tabindex="1"]');

      if (firstElement) {
        firstElement.focus();
      }
    }, 100);
  }, []);

  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;
      const focusableElements = Array.from(
        document.querySelectorAll('[tabIndex]:not([tabIndex="-1"])')
      ).filter(el => {
        const tabIndex = parseInt(el.getAttribute('tabIndex'));
        return !isNaN(tabIndex) && tabIndex >= 1 && el.offsetParent !== null && !el.disabled;
      }).sort((a, b) => {
        const tabA = parseInt(a.getAttribute('tabIndex'));
        const tabB = parseInt(b.getAttribute('tabIndex'));
        return tabA - tabB;
      });

      if (focusableElements.length === 0) return;

      const currentElement = document.activeElement;
      const currentIndex = focusableElements.indexOf(currentElement);

      if (!e.shiftKey) {
        if (currentIndex === focusableElements.length - 1 || currentIndex === -1) {
          e.preventDefault();
          focusableElements[0].focus();
        }
      } else {
        if (currentIndex === 0 || currentIndex === -1) {
          e.preventDefault();
          focusableElements[focusableElements.length - 1].focus();
        }
      }
    };
    document.addEventListener('keydown', handleTabKey);
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [details.length]);

  async function loadLookups() {
    try {
      const [
        suppliersData,
        colorsData,
        countsData,
        yarnTypesData
      ] = await Promise.all([
        supplierApi.getAll(),
        productionApi.color.getAll(),
        productionApi.counts.getAll(),
        productionApi.yarnType.getAll()
      ]);

      setSuppliers(suppliersData || []);
      setColors(colorsData || []);
      setCounts(countsData || []);
      setYarnTypes(yarnTypesData || []);

      setLookupsLoaded(true);

    } catch (e) {
      console.error(e);
      setLookupsLoaded(true);
    }
  }

  async function loadEnquiries() {
    setLoadingList(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      const data = await enquiryApi.getAll();
      setEnquiries(data);
    } catch (e) {
      setListError(e.message);
    } finally {
      setLoadingList(false);
    }
  }

  async function openNew() {
    const nextNo = await enquiryApi.getNextNumber();

    setHeader({
      ...emptyHeader(),
      preparedBy: user?.name || "Admin",
      docId: nextNo.docId      // <-- only the string
    });

    setDetails([emptyDetail()]);
    setEditId(null);
    setView("form");
    setHasChanges(false);
  }

  function openEdit(enquiry) {
    console.log(enquiry);
    // TODO: Implement edit when backend is ready
    setEditId(sid(enquiry));
    setHeader({
      ...enquiry,
      customer: enquiry.customerId,
      customerName: enquiry.customerName || "",
    });
    setDetails(
      (enquiry.details || []).map(d => ({
        ...d,
        _rowId: Math.random()
      }))
    );
    setView("form");
    setHasChanges(false);
  }

  function updateDetail(idx, field, val) {
    setDetails(prev => {
      const rows = [...prev];
      rows[idx] = { ...rows[idx], [field]: val };
      return rows;
    });
  }

  function addRow() {
    setHasChanges(true);
    setDetails(prev => [...prev, { ...emptyDetail(), _rowId: Math.random() }]);
  }

  function removeRow(idx) {
    setHasChanges(true);
    setDetails(prev => prev.filter((_, i) => i !== idx));
    if (details.length === 1) {
      setDetails([emptyDetail()]);
    }
  }

  const handleSave = useCallback(async () => {
    if (!header.docId.trim()) return setFormError("Doc ID is required");
    if (!header.customer) return setFormError("Customer is required");

    for (const row of details) {
      if (!row.colour?.trim()) return setFormError("Colour is required");
      if (!row.counts.trim()) return setFormError("Counts is required");
      if (!row.yarnType.trim()) return setFormError("Yarn Type is required");
      if (Number(row.enqQty) <= 0) return setFormError("Enquiry Quantity is required");
    }

    const confirmSave = window.confirm("Do you want to save this record?");
    if (!confirmSave) return;

    setFormError("");
    setSaving(true);

    const cleanDetails = details
      .filter(d => d.colour.trim())
      .map(({ _rowId, ...rest }) => rest);

    if (cleanDetails.length === 0) {
      setSaving(false);
      return setFormError("Add at least one item");
    }

    const payload = {
      ...header,
      customerName: header.customerName,
      details: cleanDetails
    };

    try {
      // TODO: Replace with actual API call when backend is ready
      if (editId) {
        await enquiryApi.update(editId, payload);
      } else {
        await enquiryApi.create(payload);
      }
      console.log("Saving enquiry:", payload);
      await loadEnquiries();
      setHasChanges(false);
      setSaveSuccessModal(true);
      setTimeout(() => {
        setSaveSuccessModal(false);
        setView("list");
      }, 2000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }, [header, details, editId]);

  useEffect(() => {
    const listener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (view !== "list") {
          handleSave();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [handleSave, view]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this enquiry?")) return;
    try {
      // TODO: Replace with actual API call when backend is ready
      await enquiryApi.remove(id);
      await loadEnquiries();
    } catch (err) {
      alert(err.message);
    }
  }

  const totalQty = details.reduce((s, r) => s + Number(r.enqQty || 0), 0);
  const totalItems = details.filter(d => d.colour.trim()).length;

  const displayDetails = details;

  // ─── Tab Index Calculation ───────────────────────────────────────────────────
  const getTabIndex = (rowIndex, fieldOffset, totalRows) => {
    const headerFieldsCount = 5; // tabs 1-6 for header
    const fieldsPerRow = 5; // Colour, Counts, Yarn Type, Enq Qty, Ex.shade No
    const rowStartTab = headerFieldsCount + (rowIndex * fieldsPerRow) + 1;
    return rowStartTab + fieldOffset;
  };

  const getAddButtonTabIndex = (totalRows) => {
    return 6 + (totalRows * 5) + 1;
  };

  const getViewListTabIndex = (totalRows) => {
    return getAddButtonTabIndex(totalRows) + 1;
  };

  const getSaveTabIndex = (totalRows) => {
    return getAddButtonTabIndex(totalRows) + 2;
  };

  const totalRows = displayDetails.length;
  const addButtonTabIndex = getAddButtonTabIndex(totalRows);
  const viewListTabIndex = getViewListTabIndex(totalRows);
  const saveTabIndex = getSaveTabIndex(totalRows);

  const moveFocus = (currentTab, direction) => {
    const fields = [...document.querySelectorAll("[tabindex]")]
      .filter(el => el.tabIndex > 0 && !el.disabled)
      .sort((a, b) => a.tabIndex - b.tabIndex);

    const current = fields.findIndex(el => el.tabIndex === currentTab);

    if (current === -1) return;

    let next = current;

    if (direction === "next") next++;
    if (direction === "prev") next--;

    if (direction === "down") next += 5;
    if (direction === "up") next -= 5;

    if (next >= 0 && next < fields.length) {
      fields[next].focus();
    }
  };
  const handleFieldNavigation = (e) => {
    const tab = e.target.tabIndex;

    switch (e.key) {

      case "Enter":
      case "ArrowRight":
        e.preventDefault();
        moveFocus(tab, "next");
        break;

      case "ArrowLeft":
        e.preventDefault();
        moveFocus(tab, "prev");
        break;

      case "ArrowDown":
        e.preventDefault();
        moveFocus(tab, "down");
        break;

      case "ArrowUp":
        e.preventDefault();
        moveFocus(tab, "up");
        break;

      default:
        break;
    }
  };
  // Focus on new row's Colour field when a row is added
  useEffect(() => {
    if (prevDetailsLengthRef.current === undefined) {
      prevDetailsLengthRef.current = details.length;
      return;
    }

    const rowWasAdded = details.length > prevDetailsLengthRef.current;

    if (rowWasAdded && view === "form" && displayDetails.length > 0) {
      setTimeout(() => {
        const lastRowIndex = displayDetails.length - 1;
        const colourFieldTabIndex = getTabIndex(lastRowIndex, 0, displayDetails.length);
        const colourField = document.querySelector(`[tabIndex="${colourFieldTabIndex}"]`);
        if (colourField) {
          colourField.focus();
        }
      }, 100);
    }

    prevDetailsLengthRef.current = details.length;
  }, [details.length, view, displayDetails.length]);

  // ─────────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === "list") {
    const filteredEnquiries = enquiries.filter(enq =>
      enq.docId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enq.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="inv-page">
        <div className="inv-page-header">
          <div>
            <h1 className="inv-page-title">Enquiries</h1>
            <p className="inv-page-sub">Manage customer enquiries</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="inv-btn-secondary" onClick={() => alert("Export to Excel")}>Export to Excel</button>
            <button className="inv-btn-primary" onClick={openNew}>+ New Enquiry</button>
          </div>
        </div>

        {listError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{listError}</div>}

        <div className="inv-card" style={{ marginBottom: 16 }}>
          <div className="inv-card-body">
            <div className="inv-field" style={{ minWidth: 400, maxWidth: 400 }}>
              <label className="inv-label">Search Enquiry</label>
              <input
                className="inv-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by Doc ID or Customer..."
              />
            </div>
          </div>
        </div>

        <div className="inv-card">
          {loadingList ? (
            <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Doc ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Enq Ref No</th>
                    <th>Style Ref No</th>
                    <th>Total Qty</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnquiries.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: 40 }}>No records found</td>
                    </tr>
                  ) : (
                    filteredEnquiries.map((enq, i) => (
                      <tr key={sid(enq)}>
                        <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>{enq.docId}</td>
                        <td>{enq.date}</td>
                        <td>{enq.customerName}</td>
                        <td>{enq.enqRefNo || "—"}</td>
                        <td>{enq.styleRefNo || "—"}</td>
                        <td>{fmtQty(enq.details?.reduce((s, d) => s + Number(d.enqQty || 0), 0) || 0)}</td>
                        <td className="inv-actions-cell">
                          <div className="inv-actions">
                            <button
                              className="inv-btn-icon"
                              onClick={() => openEdit(enq)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="inv-btn-icon inv-btn-danger"
                              onClick={() => handleDelete(sid(enq))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">{editId ? "Edit Enquiry" : "New Enquiry"}</h1>

        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            ref={viewListButtonRef}
            className="inv-btn-secondary"
            onClick={() => {
              setFormError("");
              setView("list");
            }}
            tabIndex={viewListTabIndex}
          >
            View List
          </button>
          <button
            ref={saveButtonRef}
            className="inv-btn-primary"
            onClick={handleSave}
            disabled={saving}
            tabIndex={saveTabIndex}
          >
            {saving ? "Saving..." : "Save Enquiry"}
          </button>
        </div>
      </div>

      {formError && <div className="inv-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
        {/* Header Card */}
        <div className="inv-card">
          <div className="inv-card-body">
            <FormGrid>
              <Field label="Doc ID (Auto)">
                <input
                  className="inv-input"
                  value={header.docId}
                  readOnly
                  style={{ background: "#f8f7ff", color: "#4f46e5", fontWeight: 600 }}
                />
              </Field>

              <Field label="Date *">
                <input
                  className="inv-input"
                  tabIndex={1}
                  type="date"
                  value={header.date}
                  onChange={e => {
                    setHeader(h => ({ ...h, date: e.target.value }));
                    setHasChanges(true);
                  }}
                />
              </Field>

              <Field label="Customer *">
                <SearchSelect
                  tabIndex={2}
                  style={{ width: "100%" }}
                  value={header.customer}
                  onChange={(val) => {
                    const supplier = suppliers.find(s => sid(s) === val);
                    setHeader(h => ({
                      ...h,
                      customer: val,
                      customerName: supplier?.name || supplier?.supplierName || ""
                    }));
                    setHasChanges(true);
                  }}
                  options={suppliers.map(s => ({
                    value: sid(s),
                    label: s.name || s.supplierName
                  }))}
                  placeholder="Select Customer"
                  menuPortalTarget={document.body}
                />
              </Field>

              <Field label="Enq Ref No">
                <input
                  className="inv-input"
                  tabIndex={3}
                  value={header.enqRefNo}
                  onChange={e => {
                    setHeader(h => ({ ...h, enqRefNo: e.target.value }));
                    setHasChanges(true);
                  }}
                  placeholder="Reference number"

                />
              </Field>

              <Field label="Ref Date">
                <input
                  className="inv-input"
                  tabIndex={4}
                  type="date"
                  value={header.refDate}
                  onChange={e => {
                    setHeader(h => ({ ...h, refDate: e.target.value }));
                    setHasChanges(true);
                  }}

                />
              </Field>

              <Field label="Style Ref No">
                <input
                  className="inv-input"
                  tabIndex={5}
                  value={header.styleRefNo}
                  onChange={e => {
                    setHeader(h => ({ ...h, styleRefNo: e.target.value }));
                    setHasChanges(true);
                  }}
                  placeholder="Style reference"

                />
              </Field>
            </FormGrid>
          </div>
        </div>

        {/* Items Table Card */}
        <div className="inv-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="inv-card-body" style={{ minHeight: "400px", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "16px 20px", background: "#fcfdfe", borderBottom: "1px solid #e2e8f0" }}>
              <button
                ref={addButtonRef}
                className="inv-btn-primary inv-btn-sm"
                onClick={addRow}
                tabIndex={addButtonTabIndex}
                style={{ borderRadius: 4 }}
              >
                + Add Row
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="inv-table-premium">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: "center" }}>#</th>
                    <th style={{ minWidth: 150 }}>Colour *</th>
                    <th style={{ minWidth: 150 }}>Counts *</th>
                    <th style={{ minWidth: 150 }}>Yarn Type *</th>
                    <th style={{ width: 120, textAlign: "right" }}>Enq Qty *</th>
                    <th style={{ minWidth: 150 }}>Ex.shade No</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayDetails.map((row, idx) => (
                    <tr key={row._rowId}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>

                      <td>
                        <SearchSelect
                          tabIndex={getTabIndex(idx, 0, totalRows)}
                          value={row.colour}
                          onChange={(val) => {
                            updateDetail(idx, "colour", val);
                            setHasChanges(true);
                          }}
                          options={colors.map(c => ({
                            value: c.name,
                            label: c.name
                          }))}
                          placeholder="Select Colour"
                          menuPortalTarget={document.body}
                          onKeyDown={handleFieldNavigation}
                        />
                      </td>

                      <td>
                        <SearchSelect
                          tabIndex={getTabIndex(idx, 1, totalRows)}
                          value={row.counts}
                          onChange={(val) => {
                            updateDetail(idx, "counts", val);
                            setHasChanges(true);
                          }}
                          options={counts.map(c => ({
                            value: c.name,
                            label: c.name
                          }))}
                          placeholder="Select Counts"
                          menuPortalTarget={document.body}
                          onKeyDown={handleFieldNavigation}
                        />
                      </td>

                      <td>
                        <SearchSelect
                          tabIndex={getTabIndex(idx, 2, totalRows)}
                          value={row.yarnType}
                          onChange={(val) => {
                            updateDetail(idx, "yarnType", val);
                            setHasChanges(true);
                          }}
                          options={yarnTypes.map(y => ({
                            value: y.name,
                            label: y.name
                          }))}
                          placeholder="Select Yarn Type"
                          menuPortalTarget={document.body}
                          onKeyDown={handleFieldNavigation}
                        />
                      </td>

                      <td>
                        <input
                          className="inv-input-cell"
                          type="number"
                          step="1.00"
                          tabIndex={getTabIndex(idx, 3, totalRows)}
                          value={row.enqQty}
                          onChange={e => {
                            updateDetail(idx, "enqQty", e.target.value);
                            setHasChanges(true);
                          }}
                          onBlur={e => updateDetail(idx, "enqQty", Number(e.target.value || 0).toFixed(3))}
                          style={{ textAlign: "right", fontWeight: 600, color: "#3b6ef8" }}
                          onKeyDown={handleFieldNavigation}
                        />
                      </td>

                      <td>
                        <input
                          className="inv-input-cell"
                          tabIndex={getTabIndex(idx, 4, totalRows)}
                          value={row.exShadeNo}
                          onChange={e => {
                            updateDetail(idx, "exShadeNo", e.target.value);
                            setHasChanges(true);
                          }}
                          placeholder="Shade No"
                          onKeyDown={handleFieldNavigation}
                        />
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          className="inv-btn-icon inv-btn-danger"
                          onClick={() => removeRow(idx)}
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#ef4444", padding: "4px" }}
                          tabIndex={getTabIndex(idx, 5, totalRows)}
                          onKeyDown={handleFieldNavigation}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="inv-card">
          <div className="inv-card-body">
            <div style={{ display: "flex", gap: 10, padding: "5px 14px", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Line Items</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{details.filter(d => d.colour.trim()).length}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Enquiry Qty</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#3b6ef8" }}>{fmtQty(totalQty)}</div>
              </div>
            </div>

            <div style={{ marginTop: 6, padding: 10, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Prepared By</label>
                  <input
                    className="inv-input"
                    value={header.preparedBy || ""}
                    onChange={e => setHeader(h => ({ ...h, preparedBy: e.target.value }))}
                    placeholder="Name of preparer"
                    tabIndex={-1}
                  />
                </div>
                <div className="inv-field-v">
                  <label className="inv-label" style={{ marginBottom: 8, display: "block" }}>Remarks</label>
                  <textarea
                    className="inv-input"
                    style={{ height: 40, resize: "none", fontSize: "13px", padding: "12px" }}
                    value={header.remarks || ""}
                    onChange={e => setHeader(h => ({ ...h, remarks: e.target.value }))}
                    placeholder="Enter any remarks..."
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {saveSuccessModal && (
        <Modal
          title="Success"
          onClose={() => {
            setSaveSuccessModal(false);
            setView("list");
          }}
          onSave={() => {
            setSaveSuccessModal(false);
            setView("list");
          }}
          saveLabel="Go to List"
        >
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 48, color: "#10b981" }}>✓</div>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Saved Successfully!</h3>
            <p style={{ color: "#64748b" }}>The Enquiry has been recorded.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
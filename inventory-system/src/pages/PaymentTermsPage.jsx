import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Modal from "../components/Modal";
import { Field, Input, Toggle, FormGrid } from "../components/FormFields";
import { paymentTermsApi } from "../services/inventoryApi";

const EMPTY = {
  name: "",
  advancePct: "",
  balanceDueDays: "",
  active: true,
};

export default function PaymentTermsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Refs for modal focus trapping
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Sorted rows for display (alphabetical by name)
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentTermsApi.getAll();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = sortedRows.filter((r) =>
    (r.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      name: row.name || "",
      advancePct: String(row.advancePct ?? ""),
      balanceDueDays: String(row.balanceDueDays ?? ""),
      active: row.active !== false,
    });
    setModal({ mode: "edit", id: row.id || row._id });
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Payment Terms Name is required");
    const advancePct = parseFloat(form.advancePct);
    const balanceDueDays = parseInt(form.balanceDueDays, 10);
    if (!Number.isFinite(advancePct) || advancePct < 0 || advancePct > 100) {
      return alert("Advance % must be between 0 and 100");
    }
    if (!Number.isFinite(balanceDueDays) || balanceDueDays < 0) {
      return alert("Balance due days must be a non-negative number");
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        advancePct,
        balanceDueDays,
        active: form.active,
      };
      if (modal.mode === "add") {
        await paymentTermsApi.create(body);
      } else {
        await paymentTermsApi.update(modal.id, body);
      }
      await load();
      setModal(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setSaving(true);
    try {
      await paymentTermsApi.remove(id);
      await load();
      setDeleteConfirm(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Focus on search input when page loads
  useEffect(() => {
    setTimeout(() => {
      const searchInput = document.querySelector('[tabIndex="1"]');
      if (searchInput) searchInput.focus();
    }, 100);
  }, []);

  // Global Tab navigation - ONLY when modal is NOT open
  useEffect(() => {
    if (modal || deleteConfirm) return;
    
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
          focusableElements[0]?.focus();
        }
      } else {
        if (currentIndex === 0 || currentIndex === -1) {
          e.preventDefault();
          focusableElements[focusableElements.length - 1]?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [modal, deleteConfirm]);

  // Modal focus trapping effect
  useEffect(() => {
    const isModalOpen = modal || deleteConfirm;
    
    if (!isModalOpen) return;
    
    previousActiveElement.current = document.activeElement;
    
    const getFocusableElements = () => {
      return Array.from(
        document.querySelectorAll('.inv-modal button, .inv-modal input, .inv-modal select, .inv-modal textarea, .inv-modal [tabindex]:not([tabindex="-1"])')
      ).filter(el => {
        return el.offsetParent !== null && !el.disabled;
      });
    };
    
    setTimeout(() => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }, 50);
    
    const handleModalTabKey = (e) => {
      if (e.key !== 'Tab') return;
      
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    document.addEventListener('keydown', handleModalTabKey);
    
    return () => {
      document.removeEventListener('keydown', handleModalTabKey);
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        setTimeout(() => {
          previousActiveElement.current.focus();
        }, 50);
      }
    };
  }, [modal, deleteConfirm]);

  // CTRL+S Save Shortcut
  useEffect(() => {
    const listener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (modal && !saving) {
          handleSave();
        }
      }
    };  
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, [modal, saving, handleSave]);

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Payment Terms</h1>
          <p className="inv-page-sub">
            Advance % and balance due days for suppliers and purchase orders
          </p>
        </div>
        <button 
          type="button" 
          className="inv-btn-primary" 
          onClick={openAdd}
          tabIndex={3}
        >
          + Add payment terms
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search payment terms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              tabIndex={1}
              style={{ flex: 1, minWidth: "250px" }}
            />
            <span className="inv-count">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {error && <div className="inv-error-banner">{error}</div>}

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Adv %</th>
                  <th>Bal due days</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="inv-empty">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr key={r.id || r._id}>
                      <td className="inv-idx">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="inv-bold">{r.name}</td>
                      <td>{Number(r.advancePct).toFixed(2)}%</td>
                      <td>{r.balanceDueDays}</td>
                      <td>
                        <span
                          className={`inv-badge ${r.active !== false ? "inv-badge-yes" : "inv-badge-no"}`}
                        >
                          {r.active !== false ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <div className="inv-actions">
                          <button
                            type="button"
                            className="inv-btn-icon"
                            title="Edit"
                            onClick={() => openEdit(r)}
                            tabIndex={-1}
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
                            type="button"
                            className="inv-btn-icon inv-btn-danger"
                            title="Delete"
                            onClick={() => setDeleteConfirm(r.id || r._id)}
                            tabIndex={-1}
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

      {/* Add/Edit Modal */}
      {modal && (
        <Modal
          ref={modalRef}
          title={
            modal.mode === "add"
              ? "Add Payment Terms"
              : "Edit Payment Terms"
          }
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
          saveLabel={saving ? "Saving…" : "Save"}
        >
          <FormGrid>
            <Field label="Payment Terms Name" required>
              <Input
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. 30% Advance, balance in 30 days"
                tabIndex={1}
              />
            </Field>
            <Field label="Advance %" required>
              <Input
                type="number"
                step="0.01"
                value={form.advancePct}
                onChange={(v) => setForm((f) => ({ ...f, advancePct: v }))}
                placeholder="0–100"
                tabIndex={2}
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Balance Due Days" required>
              <Input
                type="number"
                value={form.balanceDueDays}
                onChange={(v) => setForm((f) => ({ ...f, balanceDueDays: v }))}
                placeholder="e.g. 30"
                tabIndex={3}
              />
            </Field>
            <Field label="Active">
              <div style={{ paddingTop: 6 }}>
                <Toggle
                  value={form.active}
                  onChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  tabIndex={4}
                />
              </div>
            </Field>
          </FormGrid>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel={saving ? "Deleting…" : "Delete"}
          saving={saving}
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Delete this payment term? This action cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Modal from "../components/Modal";
import { Field, Input, Toggle } from "../components/FormFields";
import { uomApi } from "../services/inventoryApi";

const EMPTY = { name: "", description: "", active: true };

export default function UomPage() {
  const [uoms, setUoms] = useState([]);
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

  // Sorted UOMs for display (alphabetical by name)
  const sortedUoms = useMemo(() => {
    return [...uoms].sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [uoms]);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchUoms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await uomApi.getAll();
      setUoms(data.map((u) => ({ ...u, id: u.id || u._id })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUoms();
  }, [fetchUoms]);

  // ── Client-side filter (using sorted UOMs) ─────────────────────────
  const filtered = sortedUoms.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Handlers ──────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }
  
  function openEdit(row) {
    setForm({
      name: row.name,
      description: row.description || "",
      active: row.active,
    });
    setModal({ mode: "edit", id: row._id || row.id });
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("UOM name is required");
    try {
      setSaving(true);
      if (modal.mode === "add") {
        await uomApi.create(form);
      } else {
        await uomApi.update(modal.id, form);
      }
      await fetchUoms();
      setModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      setSaving(true);
      await uomApi.remove(id);
      await fetchUoms();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message);
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

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Unit of Measure (UOM)</h1>
          <p className="inv-page-sub">
            Define units of measure used across inventory items
          </p>
        </div>
        <button 
          className="inv-btn-primary" 
          onClick={openAdd}
          tabIndex={3}
        >
          + Add UOM
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search UOMs (e.g. kg, pcs, ltr)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              tabIndex={1}
              style={{ flex: 1, minWidth: "250px" }}
            />
            <span className="inv-count">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {error && <p className="inv-error">{error}</p>}

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="inv-empty">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                )}
                {filtered.map((row, i) => (
                  <tr key={row.id}>
                    <td className="inv-idx">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="inv-bold">{row.name}</td>
                    <td className="inv-muted-sm">{row.description || "—"}</td>
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
                          title="Edit"
                          onClick={() => openEdit(row)}
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
                          className="inv-btn-icon inv-btn-danger"
                          title="Delete"
                          onClick={() => setDeleteConfirm(row.id)}
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

      {/* Add/Edit Modal */}
      {modal && (
        <Modal
          ref={modalRef}
          title={modal.mode === "add" ? "Add UOM" : "Edit UOM"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        >
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. kg, pcs, ltr"
              tabIndex={1}
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Optional description"
              tabIndex={2}
            />
          </Field>
          <Field label="Status">
            <Toggle
              value={form.active}
              onChange={(v) => setForm((f) => ({ ...f, active: v }))}
              label="Active"
              tabIndex={3}
            />
          </Field>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
          saving={saving}
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this UOM? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
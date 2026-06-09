import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Modal from "../components/Modal";
import {
  Field,
  Input,
  Select,
  Toggle,
  FormGrid,
} from "../components/FormFields";
import { SearchSelect } from "../components/FormFields"; // Add this import
import { mainCategoryApi, inventoryHeadApi } from "../services/inventoryApi";

const EMPTY = { headId: "", headName: "", groupName: "", active: true };

export default function MainCategoryPage() {
  const [categories, setCategories] = useState([]);
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [filterHead, setFilterHead] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Refs for modal focus trapping
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Sorted heads for filter dropdown (SearchSelect)
  const sortedHeadOptions = useMemo(() => {
    return [...heads]
      .sort((a, b) => {
        const nameA = (a.headName || "").toLowerCase();
        const nameB = (b.headName || "").toLowerCase();
        return nameA.localeCompare(nameB);
      })
      .map((h) => ({
        value: String(h._id || h.id),
        label: h.headName,
      }));
  }, [heads]);

  // Sorted head options for modal dropdown
  const headOptions = useMemo(() => {
    return heads
      .map((h) => ({
        value: String(h._id || h.id),
        label: h.headName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [heads]);

  // ── Fetch heads (for dropdown) ─────────────────────────────────
  const fetchHeads = useCallback(async () => {
    try {
      const data = await inventoryHeadApi.getAll({ active: true });
      setHeads(data.map((h) => ({ ...h, id: h.id || h._id })));
    } catch (err) {
      console.error("Failed to load heads:", err.message);
    }
  }, []);

  // ── Fetch categories ───────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (filterHead) params.headId = filterHead;
      const data = await mainCategoryApi.getAll(params);
      setCategories(data.map((c) => ({ ...c, id: c.id || c._id })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterHead]);

  useEffect(() => {
    fetchHeads();
  }, [fetchHeads]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── Handlers ──────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      headId: String(row.headId?._id || row.headId),
      headName: row.headName,
      groupName: row.groupName,
      active: row.active,
    });
    setModal({ mode: "edit", id: row._id || row.id });
  }

  function handleHeadChange(val) {
    const head = heads.find((h) => String(h._id || h.id) === val);
    setForm((f) => ({
      ...f,
      headId: val,
      headName: head ? head.headName : "",
    }));
  }

  const checkDuplicateCategory = () => {
    const existingCategory = categories.find(cat => 
      String(cat.headId?._id || cat.headId) === form.headId && 
      cat.groupName?.toLowerCase().trim() === form.groupName?.toLowerCase().trim()
    );
    return existingCategory;
  };

  async function handleSave() {
    if (!form.headId) return alert("Head is required");
    if (!form.groupName.trim()) return alert("Group Name is required");
    
    const existingCategory = checkDuplicateCategory();
    
    if (modal.mode === "edit" && existingCategory && existingCategory.id !== modal.id) {
      return alert(`Category "${existingCategory.groupName}" already exists under this Head. Please use a different Group Name.`);
    }
    
    if (modal.mode === "add" && existingCategory) {
      return alert(`Category "${form.groupName}" already exists under this Head. Please use a different Group Name.`);
    }
    
    try {
      setSaving(true);
      const payload = {
        headId: form.headId,
        groupName: form.groupName.trim(),
        active: form.active,
      };
      if (modal.mode === "add") {
        await mainCategoryApi.create(payload);
      } else {
        await mainCategoryApi.update(modal.id, payload);
      }
      await fetchCategories();
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
      await mainCategoryApi.remove(id);
      await fetchCategories();
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
          <h1 className="inv-page-title">Main Category</h1>
          <p className="inv-page-sub">
            Manage item categories organized by head and group
          </p>
        </div>
        <button 
          className="inv-btn-primary" 
          onClick={openAdd}
          tabIndex={3}
        >
          + Add Category
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Search Input - Tab 1 */}
            <input
              className="inv-search"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              tabIndex={1}
              style={{ flex: 2, minWidth: "200px" }}
            />
            
            {/* Searchable Head Filter - Tab 2 */}
            <div style={{ flex: 1, minWidth: "200px" }}>
              <SearchSelect
                value={filterHead}
                onChange={(val) => setFilterHead(val)}
                options={sortedHeadOptions}
                placeholder="Search heads..."
                tabIndex={2}
                className="inv-filter-select"
                style={{ width: "100%" }}
              />
            </div>
            
            <span className="inv-count">
              {categories.length} record{categories.length !== 1 ? "s" : ""}
            </span>
          </div>

          {error && <p className="inv-error">{error}</p>}

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Head Name</th>
                  <th>Group Name</th>
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
                {!loading && categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                )}
                {categories.map((row, i) => (
                  <tr key={row.id}>
                    <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                    <td className="inv-muted-sm">{row.headName}</td>
                    <td className="inv-bold">{row.groupName}</td>
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
          title={
            modal.mode === "add" ? "Add Main Category" : "Edit Main Category"
          }
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        >
          <FormGrid>
            <Field label="Head Name" required>
              <Select
                value={form.headId}
                onChange={handleHeadChange}
                options={headOptions}
                placeholder="Select head..."
                tabIndex={1}
              />
            </Field>
            <Field label="Group Name" required>
              <Input
                value={form.groupName}
                onChange={(v) => setForm((f) => ({ ...f, groupName: v }))}
                placeholder="e.g. Metals"
                tabIndex={2}
              />
            </Field>
          </FormGrid>
          <Field label="Status">
            <Toggle
              value={form.active}
              onChange={(v) => setForm((f) => ({ ...f, active: v }))}
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
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Are you sure you want to delete this category? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCities,
  createCity,
  updateCity,
  deleteCity,
  clearActionError,
} from "../slices/citySlice";
import { fetchStates } from "../slices/stateSlice";
import Modal from "../components/Modal";
import { Field, Input, Select, Toggle } from "../components/FormFields";

const EMPTY_FORM = { stateId: "", stateName: "", name: "", active: true };

export default function CityPage() {
  const dispatch = useDispatch();

  // ─── Redux state ─────────────────────────────────────────────────────────
  const {
    items: cities,
    total,
    loading,
    actionLoading,
    actionError,
  } = useSelector((state) => state.cities);

  const { data: states = [], loading: statesLoading = false } = useSelector(
    (state) => state.states ?? { data: [], loading: false },
  );

  // ─── Local UI state ───────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [modal, setModal] = useState(null); // null | { mode:'add'|'edit', id? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ─── Initial data load ────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchStates());
  }, [dispatch]);

  const loadCities = useCallback(() => {
    dispatch(fetchCities({ search, page, limit }));
  }, [dispatch, search, page, limit]);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  // Reset to page 1 whenever search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  // ─── State dropdown options ───────────────────────────────────────────────
  const stateOptions = (states ?? []).map((s) => ({
    value: s._id,
    label: s.name,
  }));

  // ─── Modal helpers ────────────────────────────────────────────────────────
  function openAdd() {
    dispatch(clearActionError());
    setForm({ ...EMPTY_FORM });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    dispatch(clearActionError());
    setForm({
      stateId: row.stateId?._id ?? row.stateId,
      stateName: row.stateName,
      name: row.name,
      active: row.active,
    });
    setModal({ mode: "edit", id: row._id });
  }

  function handleStateChange(val) {
    const s = states.find((x) => x._id === val);
    setForm((f) => ({ ...f, stateId: val, stateName: s ? s.name : "" }));
  }

  // ─── Save (create / update) ───────────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) return alert("City Name is required");
    if (!form.stateId) return alert("State is required");

    const payload = {
      stateId: form.stateId,
      stateName: form.stateName,
      name: form.name.trim(),
      active: form.active,
    };

    let result;
    if (modal.mode === "add") {
      result = await dispatch(createCity(payload));
    } else {
      result = await dispatch(updateCity({ id: modal.id, payload }));
    }

    // Only close if action succeeded (no error in payload)
    if (!result.error) {
      setModal(null);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    const result = await dispatch(deleteCity(id));
    if (!result.error) setDeleteConfirm(null);
  }

  // ─── Pagination ───────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="inv-page">
      {/* Header */}
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">City</h1>
          <p className="inv-page-sub">Manage cities by state</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add City
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          {/* Toolbar */}
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="inv-count">{total} records</span>
          </div>

          {/* Table */}
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>State</th>
                  <th>City Name</th>
                  <th>Status</th>
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
                {!loading && cities.length === 0 && (
                  <tr>
                    <td colSpan={5} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                )}
                {!loading &&
                  cities.map((row, i) => (
                    <tr key={row._id}>
                      <td className="inv-idx">
                        {String((page - 1) * limit + i + 1).padStart(2, "0")}
                      </td>
                      <td className="inv-muted-sm">{row.stateName}</td>
                      <td className="inv-bold">{row.name}</td>
                      <td>
                        <span
                          className={`inv-badge ${
                            row.active ? "inv-badge-yes" : "inv-badge-no"
                          }`}
                        >
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="inv-actions">
                          {/* Edit */}
                          <button
                            className="inv-btn-icon"
                            onClick={() => openEdit(row)}
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
                          {/* Delete */}
                          <button
                            className="inv-btn-icon inv-btn-danger"
                            onClick={() => setDeleteConfirm(row._id)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="inv-pagination">
              <button
                className="inv-btn-page"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹ Prev
              </button>
              <span className="inv-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="inv-btn-page"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add City" : "Edit City"}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saveDisabled={actionLoading}
        >
          {/* Action-level error */}
          {actionError && (
            <p
              style={{
                color: "var(--danger, #e53e3e)",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              {actionError}
            </p>
          )}

          <Field label="State" required>
            <Select
              value={form.stateId}
              onChange={handleStateChange}
              options={stateOptions}
              placeholder={statesLoading ? "Loading states…" : "Select state…"}
              disabled={statesLoading}
            />
          </Field>

          <Field label="City Name" required>
            <Input
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Chennai"
            />
          </Field>

          <Field label="Status">
            <Toggle
              value={form.active}
              onChange={(v) => setForm((f) => ({ ...f, active: v }))}
              label="Active"
            />
          </Field>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel={actionLoading ? "Deleting…" : "Delete"}
          saveDisabled={actionLoading}
        >
          {actionError && (
            <p
              style={{
                color: "var(--danger, #e53e3e)",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              {actionError}
            </p>
          )}
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this city? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

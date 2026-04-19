import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import Modal from "../components/Modal";
import {
  Field,
  Input,
  Select,
  Toggle,
  FormGrid,
} from "../components/FormFields";

import {
  fetchStates,
  addState,
  updateState,
  deleteState,
} from "../slices/stateSlice";

export default function StatePage() {
  const dispatch = useDispatch();

  const states = useSelector((state) => state.states.data);
  const countries = useSelector((state) => state.countries.data);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    active: true,
    country: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 🔥 fetch states
  useEffect(() => {
    dispatch(fetchStates());
  }, [dispatch]);

  // 🔍 filter
  const filtered = states.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  // 🌍 country dropdown
  const countryOptions = countries.map((c) => ({
    value: c._id,
    label: c.name,
  }));

  function openAdd() {
    setForm({
      name: "",
      code: "",
      active: true,
      country: "",
    });
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      code: row.code,
      active: row.active,
      country: row.country?._id, // 🔥 important
    });

    setModal({ mode: "edit", id: row._id });
  }

  function handleSave() {
    if (!form.name.trim()) return alert("State Name required");
    if (!form.country) return alert("Country required");

    if (modal.mode === "add") {
      dispatch(addState(form));
    } else {
      dispatch(updateState({ id: modal.id, data: form }));
    }

    setModal(null);
  }

  function handleDelete(id) {
    dispatch(deleteState(id));
    setDeleteConfirm(null);
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">State</h1>
          <p className="inv-page-sub">Manage states by country</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add State
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input
              className="inv-search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="inv-count">{filtered.length} records</span>
          </div>

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Country</th>
                  <th>State Name</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                )}

                {filtered.map((row, i) => (
                  <tr key={row._id}>
                    <td className="inv-idx">
                      {String(i + 1).padStart(2, "0")}
                    </td>

                    {/* 🔥 populated country */}
                    <td className="inv-muted-sm">{row.country?.name || "-"}</td>

                    <td className="inv-bold">{row.name}</td>
                    <td>{row.code}</td>

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
                        <button
                          className="inv-btn-icon"
                          onClick={() => openEdit(row)}
                        >
                          ✏️
                        </button>

                        <button
                          className="inv-btn-icon inv-btn-danger"
                          onClick={() => setDeleteConfirm(row._id)}
                        >
                          🗑
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

      {/* MODAL */}
      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add State" : "Edit State"}
          onClose={() => setModal(null)}
          onSave={handleSave}
        >
          <Field label="Country" required>
            <Select
              value={form.country}
              onChange={(val) => setForm((f) => ({ ...f, country: val }))}
              options={countryOptions}
              placeholder="Select country..."
            />
          </Field>

          <FormGrid>
            <Field label="State Name" required>
              <Input
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Tamil Nadu"
              />
            </Field>

            <Field label="State Code">
              <Input
                value={form.code}
                onChange={(v) => setForm((f) => ({ ...f, code: v }))}
                placeholder="e.g. TN"
              />
            </Field>
          </FormGrid>

          <Field label="Status">
            <Toggle
              value={form.active}
              onChange={(v) => setForm((f) => ({ ...f, active: v }))}
              label="Active"
            />
          </Field>
        </Modal>
      )}

      {/* DELETE */}
      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
        >
          <p style={{ fontSize: 14 }}>
            Are you sure you want to delete this state?
          </p>
        </Modal>
      )}
    </div>
  );
}

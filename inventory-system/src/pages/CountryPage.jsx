import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../components/Modal";
import { Field, Input, Toggle, FormGrid } from "../components/FormFields";
import {
  fetchCountries,
  addCountry,
  updateCountry,
  deleteCountry,
} from "../slices/countrySlice";
const EMPTY = { name: "", code: "", active: true };
import { useEffect } from "react";
export default function CountryPage() {
  const dispatch = useDispatch();
  const countries = useSelector((state) => state.countries.data);

  useEffect(() => {
    dispatch(fetchCountries());
  }, [dispatch]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filtered = countries.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }
  function openEdit(row) {
    setForm({ name: row.name, code: row.code, active: row.active });
    setModal({ mode: "edit", id: row.id || row._id });
  }

  function handleSave() {
    if (!form.name.trim()) return alert("Required");

    if (modal.mode === "add") {
      dispatch(addCountry(form));
    } else {
      dispatch(updateCountry({ id: modal.id, data: form }));
    }

    setModal(null);
  }

  function handleDelete(id) {
    dispatch(deleteCountry(id));
    setDeleteConfirm(null);
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Country</h1>
          <p className="inv-page-sub">Manage countries</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>
          + Add Country
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
                  <th>Country Name</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="inv-empty">
                      No records found
                    </td>
                  </tr>
                )}
                {filtered.map((row, i) => (
                  <tr key={row.id || row._id}>
                    <td className="inv-idx">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="inv-bold">{row.name}</td>
                    <td>{row.code}</td>
                    <td>
                      <span
                        className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
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
                          {" "}
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
                        >
                          {" "}
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

      {modal && (
        <Modal
          title={modal.mode === "add" ? "Add Country" : "Edit Country"}
          onClose={() => setModal(null)}
          onSave={handleSave}
        >
          <FormGrid>
            <Field label="Country Name" required>
              <Input
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. India"
              />
            </Field>
            <Field label="Country Code">
              <Input
                value={form.code}
                onChange={(v) => setForm((f) => ({ ...f, code: v }))}
                placeholder="e.g. IN"
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
      {deleteConfirm && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel="Delete"
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Are you sure you want to delete this country?
          </p>
        </Modal>
      )}
    </div>
  );
}

// // StoreMasterPage.jsx
// import { useState } from "react";
// import Modal from "../components/Modal";
// import { Field, Input, Toggle, FormGrid } from "../components/FormFields";

// const EMPTY_STORE = { name: "", location: "", active: true };

// export function StoreMasterPage({ stores, setStores }) {
//   const [search, setSearch] = useState("");
//   const [modal, setModal] = useState(null);
//   const [form, setForm] = useState(EMPTY_STORE);
//   const [deleteConfirm, setDeleteConfirm] = useState(null);

//   const filtered = stores.filter((s) =>
//     s.name.toLowerCase().includes(search.toLowerCase()),
//   );

//   function openAdd() {
//     setForm({ ...EMPTY_STORE });
//     setModal({ mode: "add" });
//   }
//   function openEdit(row) {
//     setForm({ name: row.name, location: row.location, active: row.active });
//     setModal({ mode: "edit", id: row.id });
//   }

//   function handleSave() {
//     if (!form.name.trim()) return alert("Store Name is required");
//     if (modal.mode === "add")
//       setStores((prev) => [...prev, { ...form, id: Date.now() }]);
//     else
//       setStores((prev) =>
//         prev.map((s) => (s.id === modal.id ? { ...form, id: modal.id } : s)),
//       );
//     setModal(null);
//   }

//   function handleDelete(id) {
//     setStores((prev) => prev.filter((s) => s.id !== id));
//     setDeleteConfirm(null);
//   }

//   return (
//     <div className="inv-page">
//       <div className="inv-page-header">
//         <div>
//           <h1 className="inv-page-title">Store Master</h1>
//           <p className="inv-page-sub">Manage store locations</p>
//         </div>
//         <button className="inv-btn-primary" onClick={openAdd}>
//           + Add Store
//         </button>
//       </div>
//       <div className="inv-card">
//         <div className="inv-card-body">
//           <div className="inv-toolbar">
//             <input
//               className="inv-search"
//               placeholder="Search..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//             <span className="inv-count">{filtered.length} records</span>
//           </div>
//           <div className="inv-table-wrap">
//             <table className="inv-table">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>Store Name</th>
//                   <th>Location</th>
//                   <th>Status</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.length === 0 && (
//                   <tr>
//                     <td colSpan={5} className="inv-empty">
//                       No records found
//                     </td>
//                   </tr>
//                 )}
//                 {filtered.map((row, i) => (
//                   <tr key={row.id}>
//                     <td className="inv-idx">
//                       {String(i + 1).padStart(2, "0")}
//                     </td>
//                     <td className="inv-bold">{row.name}</td>
//                     <td>{row.location}</td>
//                     <td>
//                       <span
//                         className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
//                       >
//                         {row.active ? "Active" : "Inactive"}
//                       </span>
//                     </td>
//                     <td>
//                       <div className="inv-actions">
//                         <button
//                           className="inv-btn-icon"
//                           onClick={() => openEdit(row)}
//                         >
//                           <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             width="15"
//                             height="15"
//                             viewBox="0 0 24 24"
//                             fill="none"
//                             stroke="currentColor"
//                             strokeWidth="2"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           >
//                             <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
//                             <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
//                           </svg>
//                         </button>
//                         <button
//                           className="inv-btn-icon inv-btn-danger"
//                           onClick={() => setDeleteConfirm(row.id)}
//                         >
//                           <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             width="15"
//                             height="15"
//                             viewBox="0 0 24 24"
//                             fill="none"
//                             stroke="currentColor"
//                             strokeWidth="2"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           >
//                             <polyline points="3 6 5 6 21 6" />
//                             <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
//                             <path d="M10 11v6" />
//                             <path d="M14 11v6" />
//                             <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
//                           </svg>
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//       {modal && (
//         <Modal
//           title={modal.mode === "add" ? "Add Store" : "Edit Store"}
//           onClose={() => setModal(null)}
//           onSave={handleSave}
//         >
//           <FormGrid>
//             <Field label="Store Name" required>
//               <Input
//                 value={form.name}
//                 onChange={(v) => setForm((f) => ({ ...f, name: v }))}
//                 placeholder="Store name"
//               />
//             </Field>
//             <Field label="Location">
//               <Input
//                 value={form.location}
//                 onChange={(v) => setForm((f) => ({ ...f, location: v }))}
//                 placeholder="Block / area"
//               />
//             </Field>
//           </FormGrid>
//           <Field label="Status">
//             <Toggle
//               value={form.active}
//               onChange={(v) => setForm((f) => ({ ...f, active: v }))}
//               label="Active"
//             />
//           </Field>
//         </Modal>
//       )}
//       {deleteConfirm && (
//         <Modal
//           title="Confirm Delete"
//           onClose={() => setDeleteConfirm(null)}
//           onSave={() => handleDelete(deleteConfirm)}
//           saveLabel="Delete"
//         >
//           <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
//             Delete this store?
//           </p>
//         </Modal>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────

// const EMPTY_DEPT = { name: "", code: "", active: true };

// export function DepartmentMasterPage({ departments, setDepartments }) {
//   const [search, setSearch] = useState("");
//   const [modal, setModal] = useState(null);
//   const [form, setForm] = useState(EMPTY_DEPT);
//   const [deleteConfirm, setDeleteConfirm] = useState(null);

//   const filtered = departments.filter((d) =>
//     d.name.toLowerCase().includes(search.toLowerCase()),
//   );

//   function openAdd() {
//     setForm({ ...EMPTY_DEPT });
//     setModal({ mode: "add" });
//   }
//   function openEdit(row) {
//     setForm({ name: row.name, code: row.code, active: row.active });
//     setModal({ mode: "edit", id: row.id });
//   }

//   function handleSave() {
//     if (!form.name.trim()) return alert("Department Name is required");
//     if (modal.mode === "add")
//       setDepartments((prev) => [...prev, { ...form, id: Date.now() }]);
//     else
//       setDepartments((prev) =>
//         prev.map((d) => (d.id === modal.id ? { ...form, id: modal.id } : d)),
//       );
//     setModal(null);
//   }

//   function handleDelete(id) {
//     setDepartments((prev) => prev.filter((d) => d.id !== id));
//     setDeleteConfirm(null);
//   }

//   return (
//     <div className="inv-page">
//       <div className="inv-page-header">
//         <div>
//           <h1 className="inv-page-title">Department Master</h1>
//           <p className="inv-page-sub">Manage departments</p>
//         </div>
//         <button className="inv-btn-primary" onClick={openAdd}>
//           + Add Department
//         </button>
//       </div>
//       <div className="inv-card">
//         <div className="inv-card-body">
//           <div className="inv-toolbar">
//             <input
//               className="inv-search"
//               placeholder="Search..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//             <span className="inv-count">{filtered.length} records</span>
//           </div>
//           <div className="inv-table-wrap">
//             <table className="inv-table">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>Department Name</th>
//                   <th>Code</th>
//                   <th>Status</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.length === 0 && (
//                   <tr>
//                     <td colSpan={5} className="inv-empty">
//                       No records found
//                     </td>
//                   </tr>
//                 )}
//                 {filtered.map((row, i) => (
//                   <tr key={row.id}>
//                     <td className="inv-idx">
//                       {String(i + 1).padStart(2, "0")}
//                     </td>
//                     <td className="inv-bold">{row.name}</td>
//                     <td>{row.code}</td>
//                     <td>
//                       <span
//                         className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
//                       >
//                         {row.active ? "Active" : "Inactive"}
//                       </span>
//                     </td>
//                     <td>
//                       <div className="inv-actions">
//                         <button
//                           className="inv-btn-icon"
//                           onClick={() => openEdit(row)}
//                         >
//                           <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             width="15"
//                             height="15"
//                             viewBox="0 0 24 24"
//                             fill="none"
//                             stroke="currentColor"
//                             strokeWidth="2"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           >
//                             <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
//                             <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
//                           </svg>
//                         </button>
//                         <button
//                           className="inv-btn-icon inv-btn-danger"
//                           onClick={() => setDeleteConfirm(row.id)}
//                         >
//                           <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             width="15"
//                             height="15"
//                             viewBox="0 0 24 24"
//                             fill="none"
//                             stroke="currentColor"
//                             strokeWidth="2"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           >
//                             <polyline points="3 6 5 6 21 6" />
//                             <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
//                             <path d="M10 11v6" />
//                             <path d="M14 11v6" />
//                             <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
//                           </svg>
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//       {modal && (
//         <Modal
//           title={modal.mode === "add" ? "Add Department" : "Edit Department"}
//           onClose={() => setModal(null)}
//           onSave={handleSave}
//         >
//           <FormGrid>
//             <Field label="Department Name" required>
//               <Input
//                 value={form.name}
//                 onChange={(v) => setForm((f) => ({ ...f, name: v }))}
//                 placeholder="e.g. Production"
//               />
//             </Field>
//             <Field label="Code">
//               <Input
//                 value={form.code}
//                 onChange={(v) => setForm((f) => ({ ...f, code: v }))}
//                 placeholder="e.g. PRD"
//               />
//             </Field>
//           </FormGrid>
//           <Field label="Status">
//             <Toggle
//               value={form.active}
//               onChange={(v) => setForm((f) => ({ ...f, active: v }))}
//               label="Active"
//             />
//           </Field>
//         </Modal>
//       )}
//       {deleteConfirm && (
//         <Modal
//           title="Confirm Delete"
//           onClose={() => setDeleteConfirm(null)}
//           onSave={() => handleDelete(deleteConfirm)}
//           saveLabel="Delete"
//         >
//           <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
//             Delete this department?
//           </p>
//         </Modal>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────

// const EMPTY_PROCESS = { name: "", department: "", active: true };

// export function ProcessMasterPage({ processes, setProcesses, departments }) {
//   const [search, setSearch] = useState("");
//   const [modal, setModal] = useState(null);
//   const [form, setForm] = useState(EMPTY_PROCESS);
//   const [deleteConfirm, setDeleteConfirm] = useState(null);

//   const filtered = processes.filter((p) =>
//     p.name.toLowerCase().includes(search.toLowerCase()),
//   );
//   const deptOptions = departments.map((d) => ({
//     value: d.name,
//     label: d.name,
//   }));

//   function openAdd() {
//     setForm({ ...EMPTY_PROCESS });
//     setModal({ mode: "add" });
//   }
//   function openEdit(row) {
//     setForm({ name: row.name, department: row.department, active: row.active });
//     setModal({ mode: "edit", id: row.id });
//   }

//   function handleSave() {
//     if (!form.name.trim()) return alert("Process Name is required");
//     if (modal.mode === "add")
//       setProcesses((prev) => [...prev, { ...form, id: Date.now() }]);
//     else
//       setProcesses((prev) =>
//         prev.map((p) => (p.id === modal.id ? { ...form, id: modal.id } : p)),
//       );
//     setModal(null);
//   }

//   function handleDelete(id) {
//     setProcesses((prev) => prev.filter((p) => p.id !== id));
//     setDeleteConfirm(null);
//   }

//   return (
//     <div className="inv-page">
//       <div className="inv-page-header">
//         <div>
//           <h1 className="inv-page-title">Process Master</h1>
//           <p className="inv-page-sub">Manage processes</p>
//         </div>
//         <button className="inv-btn-primary" onClick={openAdd}>
//           + Add Process
//         </button>
//       </div>
//       <div className="inv-card">
//         <div className="inv-card-body">
//           <div className="inv-toolbar">
//             <input
//               className="inv-search"
//               placeholder="Search..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//             <span className="inv-count">{filtered.length} records</span>
//           </div>
//           <div className="inv-table-wrap">
//             <table className="inv-table">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>Process Name</th>
//                   <th>Department</th>
//                   <th>Status</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.length === 0 && (
//                   <tr>
//                     <td colSpan={5} className="inv-empty">
//                       No records found
//                     </td>
//                   </tr>
//                 )}
//                 {filtered.map((row, i) => (
//                   <tr key={row.id}>
//                     <td className="inv-idx">
//                       {String(i + 1).padStart(2, "0")}
//                     </td>
//                     <td className="inv-bold">{row.name}</td>
//                     <td className="inv-muted-sm">{row.department}</td>
//                     <td>
//                       <span
//                         className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}
//                       >
//                         {row.active ? "Active" : "Inactive"}
//                       </span>
//                     </td>
//                     <td>
//                       <div className="inv-actions">
//                         <button
//                           className="inv-btn-icon"
//                           onClick={() => openEdit(row)}
//                         >
//                           <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             width="15"
//                             height="15"
//                             viewBox="0 0 24 24"
//                             fill="none"
//                             stroke="currentColor"
//                             strokeWidth="2"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           >
//                             <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
//                             <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
//                           </svg>
//                         </button>
//                         <button
//                           className="inv-btn-icon inv-btn-danger"
//                           onClick={() => setDeleteConfirm(row.id)}
//                         >
//                           <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             width="15"
//                             height="15"
//                             viewBox="0 0 24 24"
//                             fill="none"
//                             stroke="currentColor"
//                             strokeWidth="2"
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                           >
//                             <polyline points="3 6 5 6 21 6" />
//                             <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
//                             <path d="M10 11v6" />
//                             <path d="M14 11v6" />
//                             <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
//                           </svg>
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//       {modal && (
//         <Modal
//           title={modal.mode === "add" ? "Add Process" : "Edit Process"}
//           onClose={() => setModal(null)}
//           onSave={handleSave}
//         >
//           <FormGrid>
//             <Field label="Process Name" required>
//               <Input
//                 value={form.name}
//                 onChange={(v) => setForm((f) => ({ ...f, name: v }))}
//                 placeholder="e.g. Machining"
//               />
//             </Field>
//             <Field label="Department">
//               <select
//                 className="inv-input"
//                 value={form.department}
//                 onChange={(e) =>
//                   setForm((f) => ({ ...f, department: e.target.value }))
//                 }
//               >
//                 <option value="">Select dept</option>
//                 {deptOptions.map((d) => (
//                   <option key={d.value} value={d.value}>
//                     {d.label}
//                   </option>
//                 ))}
//               </select>
//             </Field>
//           </FormGrid>
//           <Field label="Status">
//             <Toggle
//               value={form.active}
//               onChange={(v) => setForm((f) => ({ ...f, active: v }))}
//               label="Active"
//             />
//           </Field>
//         </Modal>
//       )}
//       {deleteConfirm && (
//         <Modal
//           title="Confirm Delete"
//           onClose={() => setDeleteConfirm(null)}
//           onSave={() => handleDelete(deleteConfirm)}
//           saveLabel="Delete"
//         >
//           <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
//             Delete this process?
//           </p>
//         </Modal>
//       )}
//     </div>
//   );
// }
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../components/Modal";
import { Field, Input, Toggle, FormGrid } from "../components/FormFields";

import {
  fetchStores,
  createStore,
  updateStore,
  deleteStore,
  clearActionError as clearStoreError,
} from "../slices/Storeslice";

import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  clearActionError as clearDeptError,
} from "../slices/departmentSlice";

import {
  fetchProcesses,
  createProcess,
  updateProcess,
  deleteProcess,
  clearActionError as clearProcessError,
} from "../slices/processSlice";

// ─────────────────────────────────────────────────────────────────────────────
// STORE MASTER
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_STORE = { name: "", location: "", active: true };

export function StoreMasterPage() {
  const dispatch = useDispatch();
  const { items: stores, loading, error, actionLoading, actionError } =
    useSelector((state) => state.stores);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_STORE);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    dispatch(fetchStores());
  }, [dispatch]);

  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ ...EMPTY_STORE });
    dispatch(clearStoreError());
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({ name: row.name, location: row.location, active: row.active });
    dispatch(clearStoreError());
    setModal({ mode: "edit", id: row.id || row._id });
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Store Name is required");
    if (modal.mode === "add") {
      const res = await dispatch(createStore(form));
      if (res.meta.requestStatus === "fulfilled") setModal(null);
    } else {
      const res = await dispatch(updateStore({ id: modal.id, payload: form }));
      if (res.meta.requestStatus === "fulfilled") setModal(null);
    }
  }

  async function handleDelete(id) {
    const res = await dispatch(deleteStore(id));
    if (res.meta.requestStatus === "fulfilled") setDeleteConfirm(null);
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Store Master</h1>
          <p className="inv-page-sub">Manage store locations</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>+ Add Store</button>
      </div>

      {error && <div className="inv-error-banner">{error}</div>}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input className="inv-search" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="inv-count">{filtered.length} records</span>
          </div>
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr><th>#</th><th>Store Name</th><th>Location</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="inv-empty">Loading...</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={5} className="inv-empty">No records found</td></tr>}
                {!loading && filtered.map((row, i) => (
                  <tr key={row.id || row._id}>
                    <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                    <td className="inv-bold">{row.name}</td>
                    <td>{row.location}</td>
                    <td>
                      <span className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="inv-actions">
                        <button className="inv-btn-icon" onClick={() => openEdit(row)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="inv-btn-icon inv-btn-danger" onClick={() => setDeleteConfirm(row.id || row._id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
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
        <Modal title={modal.mode === "add" ? "Add Store" : "Edit Store"} onClose={() => setModal(null)} onSave={handleSave} saveDisabled={actionLoading}>
          {actionError && <div className="inv-error-banner">{actionError}</div>}
          <FormGrid>
            <Field label="Store Name" required>
              <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Store name" />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="Block / area" />
            </Field>
          </FormGrid>
          <Field label="Status">
            <Toggle value={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
          </Field>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Confirm Delete" onClose={() => setDeleteConfirm(null)} onSave={() => handleDelete(deleteConfirm)} saveLabel="Delete" saveDisabled={actionLoading}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Delete this store?</p>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT MASTER
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_DEPT = { name: "", code: "", active: true };

export function DepartmentMasterPage() {
  const dispatch = useDispatch();
  const { items: departments, loading, error, actionLoading, actionError } =
    useSelector((state) => state.departments);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_DEPT);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ ...EMPTY_DEPT });
    dispatch(clearDeptError());
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({ name: row.name, code: row.code, active: row.active });
    dispatch(clearDeptError());
    setModal({ mode: "edit", id: row.id || row._id });
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Department Name is required");
    if (modal.mode === "add") {
      const res = await dispatch(createDepartment(form));
      if (res.meta.requestStatus === "fulfilled") setModal(null);
    } else {
      const res = await dispatch(updateDepartment({ id: modal.id, payload: form }));
      if (res.meta.requestStatus === "fulfilled") setModal(null);
    }
  }

  async function handleDelete(id) {
    const res = await dispatch(deleteDepartment(id));
    if (res.meta.requestStatus === "fulfilled") setDeleteConfirm(null);
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Department Master</h1>
          <p className="inv-page-sub">Manage departments</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>+ Add Department</button>
      </div>

      {error && <div className="inv-error-banner">{error}</div>}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input className="inv-search" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="inv-count">{filtered.length} records</span>
          </div>
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr><th>#</th><th>Department Name</th><th>Code</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="inv-empty">Loading...</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={5} className="inv-empty">No records found</td></tr>}
                {!loading && filtered.map((row, i) => (
                  <tr key={row.id || row._id}>
                    <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                    <td className="inv-bold">{row.name}</td>
                    <td>{row.code}</td>
                    <td>
                      <span className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="inv-actions">
                        <button className="inv-btn-icon" onClick={() => openEdit(row)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="inv-btn-icon inv-btn-danger" onClick={() => setDeleteConfirm(row.id || row._id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
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
        <Modal title={modal.mode === "add" ? "Add Department" : "Edit Department"} onClose={() => setModal(null)} onSave={handleSave} saveDisabled={actionLoading}>
          {actionError && <div className="inv-error-banner">{actionError}</div>}
          <FormGrid>
            <Field label="Department Name" required>
              <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Production" />
            </Field>
            <Field label="Code">
              <Input value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="e.g. PRD" />
            </Field>
          </FormGrid>
          <Field label="Status">
            <Toggle value={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
          </Field>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Confirm Delete" onClose={() => setDeleteConfirm(null)} onSave={() => handleDelete(deleteConfirm)} saveLabel="Delete" saveDisabled={actionLoading}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Delete this department?</p>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS MASTER
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_PROCESS = { name: "", departmentId: "", active: true };

export function ProcessMasterPage() {
  const dispatch = useDispatch();
  const { items: processes, loading, error, actionLoading, actionError } =
    useSelector((state) => state.processes);
  const { items: departments } = useSelector((state) => state.departments);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_PROCESS);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    dispatch(fetchProcesses());
    dispatch(fetchDepartments());
  }, [dispatch]);

  const filtered = processes.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ ...EMPTY_PROCESS });
    dispatch(clearProcessError());
    setModal({ mode: "add" });
  }

  function openEdit(row) {
    setForm({ name: row.name, departmentId: row.departmentId || "", active: row.active });
    dispatch(clearProcessError());
    setModal({ mode: "edit", id: row.id || row._id });
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Process Name is required");
    if (modal.mode === "add") {
      const res = await dispatch(createProcess(form));
      if (res.meta.requestStatus === "fulfilled") setModal(null);
    } else {
      const res = await dispatch(updateProcess({ id: modal.id, payload: form }));
      if (res.meta.requestStatus === "fulfilled") setModal(null);
    }
  }

  async function handleDelete(id) {
    const res = await dispatch(deleteProcess(id));
    if (res.meta.requestStatus === "fulfilled") setDeleteConfirm(null);
  }

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Process Master</h1>
          <p className="inv-page-sub">Manage processes</p>
        </div>
        <button className="inv-btn-primary" onClick={openAdd}>+ Add Process</button>
      </div>

      {error && <div className="inv-error-banner">{error}</div>}

      <div className="inv-card">
        <div className="inv-card-body">
          <div className="inv-toolbar">
            <input className="inv-search" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="inv-count">{filtered.length} records</span>
          </div>
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr><th>#</th><th>Process Name</th><th>Department</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="inv-empty">Loading...</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={5} className="inv-empty">No records found</td></tr>}
                {!loading && filtered.map((row, i) => (
                  <tr key={row.id || row._id}>
                    <td className="inv-idx">{String(i + 1).padStart(2, "0")}</td>
                    <td className="inv-bold">{row.name}</td>
                    <td className="inv-muted-sm">{row.departmentName}</td>
                    <td>
                      <span className={`inv-badge ${row.active ? "inv-badge-yes" : "inv-badge-no"}`}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="inv-actions">
                        <button className="inv-btn-icon" onClick={() => openEdit(row)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="inv-btn-icon inv-btn-danger" onClick={() => setDeleteConfirm(row.id || row._id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
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
        <Modal title={modal.mode === "add" ? "Add Process" : "Edit Process"} onClose={() => setModal(null)} onSave={handleSave} saveDisabled={actionLoading}>
          {actionError && <div className="inv-error-banner">{actionError}</div>}
          <FormGrid>
            <Field label="Process Name" required>
              <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Machining" />
            </Field>
            <Field label="Department">
              <select
                className="inv-input"
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              >
                <option value="">Select dept</option>
                {departments.map((d) => (
                  <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                ))}

              </select>
            </Field>
          </FormGrid>
          <Field label="Status">
            <Toggle value={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
          </Field>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Confirm Delete" onClose={() => setDeleteConfirm(null)} onSave={() => handleDelete(deleteConfirm)} saveLabel="Delete" saveDisabled={actionLoading}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Delete this process?</p>
        </Modal>
      )}
    </div>
  );
}
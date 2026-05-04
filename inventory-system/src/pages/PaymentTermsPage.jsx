import { useState, useEffect, useCallback } from "react";
import Modal from "../components/Modal";
import { Field, Input, Toggle, FormGrid } from "../components/FormFields";
import { paymentTermsApi } from "../services/inventoryApi";

const EMPTY = {
  name: "",
  advancePct: "",
  balanceDueDays: "",
  active: true,
};

function printPaymentTerm(row) {
  const adv = Number(row.advancePct ?? 0);
  const days = Number(row.balanceDueDays ?? 0);
  const w = window.open("", "_blank");
  if (!w) return;
  const pairs = [
    ["Payment Terms Name", row.name || "—"],
    ["Advance percentage", `${adv}%`],
    ["Balance due days", `${days} days`],
  ];
  w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${row.name || "Payment Terms"}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; max-width: 560px; margin: 0 auto; }
  .row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e8ecf1; font-size: 14px; }
  .l { color: #475569; text-align: left; }
  .v { font-weight: 600; text-align: right; flex: 1; word-break: break-word; }
  h1 { font-size: 18px; margin: 0 0 20px; }
</style></head><body>
<h1>Payment Terms</h1>
${pairs.map(([l, v]) => `<div class="row"><span class="l">${l}:</span><span class="v">${String(v).replace(/</g, "&lt;")}</span></div>`).join("")}
<script>window.onload=function(){window.print();}</script>
</body></html>`);
  w.document.close();
}

export default function PaymentTermsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const filtered = rows.filter((r) =>
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

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Payment Terms</h1>
          <p className="inv-page-sub">
            Advance % and balance due days for suppliers and purchase orders
          </p>
        </div>
        <button type="button" className="inv-btn-primary" onClick={openAdd}>
          + Add payment terms
        </button>
      </div>

      <div className="inv-card">
        <div className="inv-toolbar">
          <input
            className="inv-search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                    No records
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
                          className="inv-btn-ghost inv-no-print"
                          style={{ fontSize: 12 }}
                          title="Print"
                          onClick={() => printPaymentTerm(r)}
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          className="inv-btn-icon"
                          title="Edit"
                          onClick={() => openEdit(r)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="inv-btn-icon inv-btn-danger"
                          title="Delete"
                          onClick={() =>
                            setDeleteConfirm(r.id || r._id)
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
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

      {modal && (
        <Modal
          title={
            modal.mode === "add"
              ? "Add payment terms"
              : "Edit payment terms"
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
                placeholder='e.g. 30% Advance, balance in 30 days'
              />
            </Field>
            <Field label="Adv Per %" required>
              <Input
                type="number"
                value={form.advancePct}
                onChange={(v) => setForm((f) => ({ ...f, advancePct: v }))}
                placeholder="0–100"
              />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Bal Due Days" required>
              <Input
                type="number"
                value={form.balanceDueDays}
                onChange={(v) =>
                  setForm((f) => ({ ...f, balanceDueDays: v }))
                }
                placeholder="e.g. 30"
              />
            </Field>
            <Field label="Active">
              <div style={{ paddingTop: 6 }}>
                <Toggle
                  value={form.active}
                  onChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
              </div>
            </Field>
          </FormGrid>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal
          title="Confirm delete"
          onClose={() => setDeleteConfirm(null)}
          onSave={() => handleDelete(deleteConfirm)}
          saveLabel={saving ? "Deleting…" : "Delete"}
          saving={saving}
        >
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Delete this payment term? It may be referenced by parties or POs.
          </p>
        </Modal>
      )}
    </div>
  );
}

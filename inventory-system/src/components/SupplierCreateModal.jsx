import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCountries } from "../slices/countrySlice";
import { fetchStates } from "../slices/stateSlice";
import { fetchCities } from "../slices/citySlice";
import Modal from "./Modal";
import { Field, Input, Select, Toggle, FormGrid } from "./FormFields";
import { mainCategoryApi, paymentTermsApi, supplierApi } from "../services/inventoryApi";
import {
  EMPTY_FORM,
  EMPTY_ADDRESS,
  normalizeAddrForForm,
  SectionLabel,
  PlusIcon,
  AddressFormPage,
  AddressList,
  TypeManagementModal,
  typesAPI
} from "../pages/SupplierPage";

export default function SupplierCreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [supplierTypes, setSupplierTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [typeManagement, setTypeManagement] = useState(false);
  const [addressForm, setAddressForm] = useState(null);
  
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);

  const dispatch = useDispatch();
  const countries = useSelector((s) => s.countries?.data || []);
  const states = useSelector((s) => s.states?.data || []);
  const cities = useSelector((s) => s.cities?.items || []);

  useEffect(() => {
    dispatch(fetchCountries());
    dispatch(fetchStates());
    dispatch(fetchCities({ page: 1, limit: 10000 }));
  }, [dispatch]);

  const fetchTypes = async () => {
    setTypesLoading(true);
    try {
      const res = await typesAPI.list();
      setSupplierTypes(res.data || []);
    } catch (e) {

    } finally {
      setTypesLoading(false);
    }
  };
  useEffect(() => { fetchTypes(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const [pt, mc] = await Promise.all([
          paymentTermsApi.getAll(),
          mainCategoryApi.getAll(),
        ]);
        setPaymentTerms(Array.isArray(pt) ? pt : []);
        setMainCategories(Array.isArray(mc) ? mc : []);
      } catch (e) {

      }
    })();
  }, []);

  const typeOptions = supplierTypes.map((t) => ({ value: t.name, label: t.name, id: t.id || t._id }));
  const paymentTermOptions = paymentTerms.filter((p) => p.active !== false).map((p) => ({ value: String(p.id || p._id), label: p.name }));
  const mainCategoryOptions = useMemo(() => mainCategories.filter((c) => c.active !== false).map((c) => ({ id: String(c.id || c._id), label: `${c.groupName || ""}${c.headName ? ` (${c.headName})` : ""}` })), [mainCategories]);

  // Address handlers
  function openAddAddress() { setAddressForm({ mode: "add", address: { ...EMPTY_ADDRESS } }); }
  function openEditAddress(idx) {
    setAddressForm({ mode: "edit", index: idx, address: normalizeAddrForForm({ ...(Array.isArray(form.addresses) ? form.addresses : [])[idx] }) });
  }
  function handleAddressSave(addr) {
    const currentAddresses = Array.isArray(form.addresses) ? form.addresses : [];
    if (addressForm.mode === "add") {
      const base = addr.isPrimary ? currentAddresses.map((a) => ({ ...a, isPrimary: false })) : currentAddresses;
      setForm({ ...form, addresses: [...base, { ...addr, _id: Date.now() }] });
    } else {
      const updated = currentAddresses.map((a, i) => {
        if (i === addressForm.index) return addr;
        if (addr.isPrimary) return { ...a, isPrimary: false };
        return a;
      });
      setForm({ ...form, addresses: updated });
    }
    setAddressForm(null);
  }
  function deleteAddress(idx) {
    if (!window.confirm("Delete this address?")) return;
    setForm({ ...form, addresses: (Array.isArray(form.addresses) ? form.addresses : []).filter((_, i) => i !== idx) });
  }
  function setAddressPrimary(idx) {
    setForm({ ...form, addresses: (Array.isArray(form.addresses) ? form.addresses : []).map((a, i) => ({ ...a, isPrimary: i === idx })) });
  }

  // Type management handlers
  async function handleAddType(name) { await typesAPI.create(name); await fetchTypes(); }
  async function handleEditType(id, newName) { await typesAPI.update(id, newName); await fetchTypes(); }
  async function handleDeleteType(id) { if (!window.confirm("Delete this category?")) return; await typesAPI.delete(id); await fetchTypes(); }

  async function handleSave() {
    if (!form.supplierName.trim()) return alert("Party name is required");
    if (!form.type) return alert("Party category is required");
    const sc = String(form.shortCode || "").trim().toUpperCase();
    if (sc.length < 1 || sc.length > 5) return alert("Short code is required (1–5 characters)");
    setSaving(true);
    try {
      const cleanAddresses = (Array.isArray(form.addresses) ? form.addresses : [])
        .filter((a) => (a.line1 || a.address) && a.cityId && a.stateId && a.countryId)
        .map(({ _id, ...rest }) => rest);

      const payload = {
        ...form,
        shortCode: sc,
        paymentTermsId: form.paymentTermsId || null,
        purchaseCategoryIds: form.purchaseCategoryIds.map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n)),
        addresses: cleanAddresses,
      };

      const created = await supplierApi.create(payload);
      onCreated(created);
    } catch (e) {
      alert(e.message || "Error creating supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal maxWidth="760px" title="Create New Supplier" onClose={onClose} onSave={handleSave} saveLabel={saving ? "Saving..." : "Create Supplier"} saveDisabled={saving}>
      <SectionLabel>Basic info</SectionLabel>
      <FormGrid>
        <Field
          label={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <span>Party category *</span>
              <button type="button" className="inv-btn-ghost" onClick={() => setTypeManagement(true)} style={{ padding: "0 4px", fontSize: "11px", color: "var(--primary)" }}>+ Add New</button>
            </div>
          }
          required
        >
          <Select value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={typeOptions} placeholder={typesLoading ? "Loading…" : typeOptions.length === 0 ? "No categories — add one first" : "Select type…"} />
        </Field>
        <Field label="Short code *">
          <Input value={form.shortCode} onChange={(v) => setForm((f) => ({ ...f, shortCode: v.toUpperCase().slice(0, 5) }))} placeholder="Max 5 chars" maxLength={5} />
        </Field>
      </FormGrid>
      <div style={{ marginBottom: 12, width: "100%" }}>
        <Field label="Party name *" required>
          <Input value={form.supplierName} onChange={(v) => setForm((f) => ({ ...f, supplierName: v }))} placeholder="e.g. Steel India Ltd." style={{ width: "100%" }} />
        </Field>
      </div>

      <SectionLabel>Business configuration</SectionLabel>
      <FormGrid>
        <Field label="Payment terms">
          <Select
            value={form.paymentTermsId}
            onChange={(v) => setForm((f) => ({ ...f, paymentTermsId: v }))}
            options={paymentTermOptions}
            placeholder={paymentTermOptions.length === 0 ? "Add payment terms master first" : "Select payment terms…"}
          />
        </Field>
        <Field label="Status">
          <div style={{ paddingTop: 6 }}>
            <Toggle value={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" />
          </div>
        </Field>
      </FormGrid>

      <SectionLabel>Purchase category mapping</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginBottom: 16, maxHeight: 160, overflowY: "auto", padding: "8px 0" }}>
        {mainCategoryOptions.length === 0 ? (
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>No main categories available</span>
        ) : (
          mainCategoryOptions.map((c) => {
            const checked = form.purchaseCategoryIds.map(String).includes(c.id);
            return (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setForm((f) => {
                      const set = new Set(f.purchaseCategoryIds.map(String));
                      if (set.has(c.id)) set.delete(c.id);
                      else set.add(c.id);
                      return { ...f, purchaseCategoryIds: [...set] };
                    });
                  }}
                />
                {c.label}
              </label>
            );
          })
        )}
      </div>

      <SectionLabel>Addresses</SectionLabel>
      <AddressList addresses={form.addresses} onEdit={openEditAddress} onDelete={deleteAddress} onSetPrimary={setAddressPrimary} />
      <button type="button" onClick={openAddAddress} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px dashed var(--border-mid)", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", marginTop: 12 }}>
        <PlusIcon /> Add address
      </button>

      {addressForm && (
        <AddressFormPage
          address={addressForm.address}
          addressNumber={addressForm.mode === "edit" ? addressForm.index + 1 : null}
          onSave={handleAddressSave}
          onCancel={() => setAddressForm(null)}
          countries={countries}
          states={states}
          cities={cities}
        />
      )}

      <SectionLabel>Tax info</SectionLabel>
      <FormGrid>
        <Field label="GST no"><Input value={form.gstNo} onChange={(v) => setForm((f) => ({ ...f, gstNo: v }))} placeholder="e.g. 33AABCU9603R1ZN" /></Field>
        <Field label="PAN no"><Input value={form.panNo} onChange={(v) => setForm((f) => ({ ...f, panNo: v }))} placeholder="e.g. AABCU9603R" /></Field>
      </FormGrid>

      <SectionLabel>Contact</SectionLabel>
      <FormGrid>
        <Field label="Email ID 1"><Input type="email" value={form.emailId1} onChange={(v) => setForm((f) => ({ ...f, emailId1: v }))} placeholder="primary@email.com" /></Field>
        <Field label="Email ID 2"><Input type="email" value={form.emailId2} onChange={(v) => setForm((f) => ({ ...f, emailId2: v }))} placeholder="secondary@email.com" /></Field>
      </FormGrid>
      <FormGrid>
        <Field label="Mobile no 1"><Input value={form.mobileNo1} onChange={(v) => setForm((f) => ({ ...f, mobileNo1: v }))} placeholder="+91 98765 43210" /></Field>
        <Field label="Mobile no 2"><Input value={form.mobileNo2} onChange={(v) => setForm((f) => ({ ...f, mobileNo2: v }))} placeholder="+91 98765 43210" /></Field>
      </FormGrid>

      {typeManagement && (
        <TypeManagementModal
          types={typeOptions}
          onClose={() => setTypeManagement(false)}
          onAdd={handleAddType}
          onEdit={handleEditType}
          onDelete={handleDeleteType}
          loading={typesLoading}
        />
      )}
    </Modal>
  );
}

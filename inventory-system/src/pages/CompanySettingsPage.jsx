import { useState, useEffect } from "react";
import { Field, Input, Textarea } from "../components/FormFields";

export default function CompanySettingsPage() {
  const [company, setCompany] = useState({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    logo: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/company")
      .then((res) => res.json())
      .then((data) => {
        setCompany(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const formData = new FormData();
      formData.append("companyName", company.companyName);
      formData.append("address", company.address);
      formData.append("phone", company.phone);
      formData.append("email", company.email);
      formData.append("gstin", company.gstin);
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await fetch("/api/company", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        const updated = await res.json();
        setCompany(updated);
        setLogoFile(null);
        setMsg("Company details updated successfully!");
      } else {
        setMsg("Failed to update company details.");
      }
    } catch (err) {
      console.error(err);
      setMsg("Error saving data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="inv-page">Loading...</div>;

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Company Settings</h1>
          <p className="inv-page-sub">Required details for bills and reports</p>
        </div>
        <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {msg && (
        <div className={`inv-error-banner ${msg.includes("successfully") ? "success" : ""}`} style={{
          marginBottom: 16,
          background: msg.includes("successfully") ? "#f0fdf4" : undefined,
          color: msg.includes("successfully") ? "#166534" : undefined,
          borderColor: msg.includes("successfully") ? "#bbf7d0" : undefined
        }}>
          {msg}
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <div style={{ maxWidth: 600 }}>
            <Field label="Company Name" required>
              <Input
                value={company.companyName}
                onChange={(v) => setCompany({ ...company, companyName: v })}
                placeholder="e.g. My Industrial Supplies"
              />
            </Field>

            <Field label="Address">
              <Textarea
                value={company.address}
                onChange={(v) => setCompany({ ...company, address: v })}
                placeholder="Full registered address"
                rows={4}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Phone/Tel">
                <Input
                  value={company.phone}
                  onChange={(v) => setCompany({ ...company, phone: v })}
                  placeholder="e.g. 0421-234232"
                />
              </Field>
              <Field label="Email">
                <Input
                  value={company.email}
                  onChange={(v) => setCompany({ ...company, email: v })}
                  placeholder="e.g. contact@company.com"
                />
              </Field>
            </div>

            <Field label="GSTIN">
              <Input
                value={company.gstin}
                onChange={(v) => setCompany({ ...company, gstin: v })}
                placeholder="GST Identification Number"
              />
            </Field>

            <Field label="Company Logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {company.logo && (
                  <div style={{
                    width: 80, height: 80,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#f9fafb', overflow: 'hidden'
                  }}>
                    <img src={company.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files[0])}
                  style={{ fontSize: 13 }}
                />
              </div>
              {logoFile && <p style={{ fontSize: 12, color: '#6366f1', marginTop: 4 }}>New file selected: {logoFile.name}</p>}
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
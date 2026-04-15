// ── Field wrapper ─────────────────────────────────────────────────────────────
export function Field({ label, required, children }) {
  return (
    <div className="inv-field" style={{ marginBottom: 12 }}>
      <label className="inv-label">
        {label}
        {required && " *"}
      </label>
      {children}
    </div>
  );
}

// ── Text / number input ───────────────────────────────────────────────────────
export function Input({
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
}) {
  return (
    <input
      className="inv-input"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
// options can be: string[] | { value, label }[]
export function Select({ value, onChange, options = [], placeholder }) {
  const normalised = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <select
      className="inv-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {normalised.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      className="inv-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ resize: "vertical" }}
    />
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange, label }) {
  return (
    <div className="inv-toggle-wrap">
      <label className="inv-toggle-slider-wrap">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="inv-slider" />
      </label>
      {label && <span style={{ fontSize: 12.5 }}>{label}</span>}
    </div>
  );
}

// ── Two-column grid ───────────────────────────────────────────────────────────
export function FormGrid({ children }) {
  return <div className="inv-form-grid">{children}</div>;
}

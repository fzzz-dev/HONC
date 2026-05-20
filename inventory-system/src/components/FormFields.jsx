import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
  maxLength,
  style,
}) {
  return (
    <input
      className="inv-input"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      style={style}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
// options can be: string[] | { value, label }[]
export function Select({ value, onChange, options = [], placeholder }) {
  const normalised = options.map((o) =>
    typeof o !== "object" || o === null ? { value: String(o), label: String(o) } : o,
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

// ── Searchable Select ─────────────────────────────────────────────────────────
export function SearchSelect({ value, onChange, options = [], placeholder, className, style, disabled, tabIndex}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const handleKeyDown = (e) => {
  if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    setIsOpen(true);
    setHighlightedIndex(0);
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : 0
      );
      break;

    case "ArrowUp":
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filtered.length - 1
      );
      break;

    case "Enter":
      e.preventDefault();
      if (filtered[highlightedIndex]) {
        onChange(filtered[highlightedIndex].value);
        setIsOpen(false);
        setSearch("");
      }
      break;

    case "Escape":
      setIsOpen(false);
      break;
  }
};


  const normalised = options.map((o) =>
    typeof o !== "object" || o === null ? { value: String(o), label: String(o) } : o,
  );

const [highlightedIndex, setHighlightedIndex] = useState(0); 

  const filtered = normalised.filter(o => 
    String(o.label).toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = normalised.find(o => String(o.value) === String(value));

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownWidth = Math.max(rect.width, 220);
      let left = rect.left + window.scrollX;
      
      // Prevent going off screen right
      if (rect.left + dropdownWidth > window.innerWidth - 20) {
        left = window.innerWidth - dropdownWidth - 20;
      }

      setCoords({
        top: rect.bottom + window.scrollY,
        left: left,
        width: dropdownWidth
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      // If the click is outside BOTH the trigger container AND the dropdown portal, close it
      const isOutsideTrigger = containerRef.current && !containerRef.current.contains(event.target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
      
      if (isOutsideTrigger && isOutsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  // Determine if we are in a table cell by checking the className or style
  const isCell = className?.includes("cell") || style?.border === "none";

  return (
  <div
    ref={containerRef}
    tabIndex={tabIndex}
    onKeyDown={handleKeyDown}
    className={className}
    style={{
      position: "relative",
      width: "100%",
      ...style,
    }}
  >
    {/* Trigger */}
    <div
      className={isCell ? "inv-input-cell" : "inv-input"}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        minHeight: isCell ? 5 : 0,
        background: disabled ? "#f9fafb" : "transparent",
        opacity: disabled ? 0.7 : 1,
        border: style?.border || undefined,
        backgroundImage: "none",
        paddingRight: 12,
      }}
    >
      <span
        style={{
          color: selectedOption ? "inherit" : "var(--text-secondary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginRight: 8,
          fontSize: isCell ? "12.5px" : "inherit",
        }}
      >
        {selectedOption
          ? selectedOption.label
          : placeholder || "Select..."}
      </span>

      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M1 1L5 5L9 1"
          stroke="#64748B"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    {/* Dropdown */}
    {isOpen &&
      createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: coords.top + 4,
            left: coords.left,
            width: coords.width,
            zIndex: 10000,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow:
              "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            maxHeight: 250,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: 8,
              borderBottom: "1px solid var(--border-subtle)",
              background: "#f8fafc",
            }}
          >
            <input
              autoFocus
              className="inv-input"
              style={{ fontSize: 12, height: 32, padding: "0 10px" }}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <div
            style={{ overflowY: "auto", flex: 1 }}
            className="no-scrollbar"
          >
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "12px",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  textAlign: "center",
                }}
              >
                No results found
              </div>
            )}

            {filtered.map((o, index) => (
              <div
                key={o.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(o.value);
                  setIsOpen(false);
                  setSearch("");
                  setHighlightedIndex(index);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: 13,

                  background:
                    index === highlightedIndex
                      ? "#e2e8f0"
                      : String(o.value) === String(value)
                      ? "var(--accent-light)"
                      : "transparent",

                  color:
                    String(o.value) === String(value)
                      ? "var(--accent)"
                      : "#334155",

                  transition: "all 0.1s",
                }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
  </div>
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
export function FormGrid({ children, className }) {
  return (
    <div className={className ? `inv-form-grid ${className}` : "inv-form-grid"}>
      {children}
    </div>
  );
}

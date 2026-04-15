import { useEffect } from "react";

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)", // solid dark overlay – no transparency on the card itself
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
    backdropFilter: "none", // ensure no blur
  },
  box: {
    background: "#ffffff", // pure white, no transparency
    borderRadius: "16px", // slightly more formal
    border: "1px solid #eef2f6", // subtle border for definition
    width: "100%",
    maxWidth: "560px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow:
      "0 20px 35px -8px rgba(0, 0, 0, 0.2), 0 5px 12px -4px rgba(0, 0, 0, 0.1)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #e5e7eb",
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#1a1f2e",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#6b7280",
    fontSize: "20px",
    lineHeight: 1,
    padding: "0 4px",
    borderRadius: "4px",
  },
  body: {
    padding: "1.25rem",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    padding: "1rem 1.25rem",
    borderTop: "1px solid #e5e7eb",
  },
};

export default function Modal({
  title,
  onClose,
  onSave,
  children,
  saveLabel = "Save",
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={styles.box}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div style={styles.body}>{children}</div>
        <div style={styles.footer}>
          <button className="inv-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="inv-btn-primary" onClick={onSave}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

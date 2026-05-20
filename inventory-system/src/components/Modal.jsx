import { useEffect } from "react";

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
    backdropFilter: "none",
  },
  box: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #eef2f6",
    width: "85%",
    maxWidth: "560px",
    maxHeight: "50vh",
    overflow: "hidden", // Changed from overflowY: "auto" to hidden to allow body to scroll
    boxShadow:
      "0 20px 35px -8px rgba(0, 0, 0, 0.2), 0 5px 12px -4px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
  },
  fullBox: {
    maxWidth: "98vw",
    maxHeight: "50vh",
    height: "90vh",
    borderRadius: "12px",
    marginRight: "-11%"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #e5e7eb",
    flexShrink: 0,
  },
  title: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#1a1f2e",
    margin: 0,
    flex: "1 1 auto",
    minWidth: 0,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
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
    flex: 1,
    overflowY: "auto",
  },
};

export default function Modal({
  title,
  onClose,
  onSave,
  children,
  saveLabel = "Save",
  saving,
  saveDisabled,
  maxWidth,
  full = false,
}) {
  const primaryDisabled = saving || saveDisabled;
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          ...styles.box,
          ...(full ? styles.fullBox : {}),
          ...(maxWidth ? { maxWidth } : {}),
        }}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <div style={styles.actions}>
            <button
              type="button"
              className="inv-btn-ghost"
              onClick={onClose}
              disabled={primaryDisabled}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inv-btn-primary inv-save-btn"
              onClick={onSave}
              disabled={primaryDisabled}
            >
              {saving ? "Saving…" : saveLabel}
            </button>
            <button
              type="button"
              style={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
}


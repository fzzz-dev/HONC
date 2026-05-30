import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { purchaseOrderApi } from "../../services/inventoryApi";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function POLevel1Pending() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPOs, setSelectedPOs] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showApproved, setShowApproved] = useState(false);

  useEffect(() => {
    loadData();
  }, [showApproved]);

  async function loadData() {
    setLoading(true);
    try {
      let response;
      if (showApproved) {
        response = await purchaseOrderApi.getAll();
        const data = response?.data || response || [];
        const approved = Array.isArray(data) ? data.filter(po => po.level1Approved === "Yes") : [];
        setPos(approved);
      } else {
        response = await purchaseOrderApi.getLevel1Pending();
        const data = response?.data || response || [];
        setPos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async () => {
    if (selectedPOs.size === 0) {
      setToast({ message: "Select at least one PO", type: "error" });
      return;
    }
    if (!window.confirm(`Approve ${selectedPOs.size} PO(s) for Level 1 (Final Approval)?`)) return;

    setBulkApproving(true);
    try {
      const userStr = localStorage.getItem('honc_user');
      let approvedBy = "System";
      
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          approvedBy = `${userData.username || userData.name || 'User'} (${userData.role || 'No Role'})`;
        } catch (e) {
          approvedBy = "System";
        }
      }
      
      const response = await purchaseOrderApi.bulkApproveLevel1(Array.from(selectedPOs), approvedBy);
      if (response.success) {
        setToast({ message: response.message, type: "success" });
        setSelectedPOs(new Set());
        await loadData();
      }
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setBulkApproving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedPOs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedPOs(newSet);
  };

  const toggleAll = () => {
    if (selectedPOs.size === filtered.length) {
      setSelectedPOs(new Set());
    } else {
      setSelectedPOs(new Set(filtered.map(p => p.id)));
    }
  };

const handlePOClick = (po) => {
  console.log("Full PO object:", po);
  console.log("PO ID:", po.id);
  console.log("PO Number:", po.ponumber || po.poNo);
  
  // Navigate with the full PO object
  navigate("/purchase-order", { 
    state: { 
      po: po,
      editMode: true 
    } 
  });
};

  const filtered = pos.filter(p => 
    String(p.ponumber || p.poNo || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Keyboard navigation for table rows
  useEffect(() => {
    const handleKeyNavigation = (e) => {
      // Only enable when in pending mode (not showing approved)
      if (!showApproved) {
        const tableRows = document.querySelectorAll('.inv-table tbody tr');
        const currentElement = document.activeElement;
        const currentIndex = Array.from(tableRows).indexOf(currentElement);
        
        // Arrow Down - Next row
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (currentIndex < tableRows.length - 1 && currentIndex !== -1) {
            tableRows[currentIndex + 1].focus();
          } else if (currentIndex === -1 && tableRows.length > 0) {
            tableRows[0].focus();
          } else if (currentIndex === tableRows.length - 1) {
            tableRows[0].focus();
          }
        }
        
        // Arrow Up - Previous row
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentIndex > 0) {
            tableRows[currentIndex - 1].focus();
          } else if (currentIndex === 0) {
            tableRows[tableRows.length - 1].focus();
          }
        }
        
        // Enter key - Toggle checkbox
        if (e.key === 'Enter' && currentElement && currentElement.tagName === 'TR') {
          e.preventDefault();
          const checkbox = currentElement.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.click();
            const event = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(event);
          }
        }
        
        // Space key - Toggle checkbox
        if (e.key === ' ' && currentElement && currentElement.tagName === 'TR') {
          e.preventDefault();
          const checkbox = currentElement.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.click();
            const event = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(event);
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyNavigation);
    return () => document.removeEventListener('keydown', handleKeyNavigation);
  }, [filtered, showApproved]);

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1>PO Level 1 {showApproved ? "Approved" : "Pending"} (Final Approval)</h1>
          <p>{showApproved ? "View fully approved POs" : "Final approval after Level 2 is complete"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="inv-btn-secondary" onClick={() => navigate("/purchase-order")}>← Back</button>
        </div>
      </div>

      {toast && (
        <div style={{ 
          position: "fixed", top: 20, right: 20, 
          background: toast.type === "error" ? "#ef4444" : "#10b981", 
          color: "white", padding: 12, borderRadius: 8, zIndex: 9999 
        }}>
          {toast.message}
        </div>
      )}

      {/* Toggle Button */}
      <div className="inv-card" style={{ marginBottom: 16 }}>
        <div className="inv-card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={() => setShowApproved(false)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "1px solid #3b6ef8",
                background: !showApproved ? "#3b6ef8" : "white",
                color: !showApproved ? "white" : "#3b6ef8",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              PO Pending List
            </button>
            <button
              onClick={() => setShowApproved(true)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "1px solid #3b6ef8",
                background: showApproved ? "#3b6ef8" : "white",
                color: showApproved ? "white" : "#3b6ef8",
                cursor: "pointer",
                fontWeight: 500
              }}
            >
              PO Approved List
            </button>
          </div>
          <div>
            <span className="inv-badge" style={{ background: showApproved ? "#10b981" : "#f59e0b", color: "white" }}>
              {showApproved ? `✓ ${filtered.length} Approved` : `${filtered.length} Pending`}
            </span>
          </div>
        </div>
      </div>

      {!showApproved && selectedPOs.size > 0 && (
        <div className="inv-card" style={{ marginBottom: 16, background: "#eef2ff" }}>
          <div className="inv-card-body" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{selectedPOs.size} selected</span>
            <button className="inv-btn-primary" onClick={handleApprove} disabled={bulkApproving}>
              {bulkApproving ? "Approving..." : `Final Approve (${selectedPOs.size})`}
            </button>
          </div>
        </div>
      )}

      <div className="inv-card">
        <div className="inv-card-body">
          <input 
            className="inv-input" 
            placeholder="Search PO..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="inv-card">
        {loading ? <div style={{ padding: 40 }}>Loading...</div> : (
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  {!showApproved && <th style={{ width: 40 }}><input type="checkbox" onChange={toggleAll} checked={selectedPOs.size === filtered.length && filtered.length > 0} /></th>}
                  <th>#</th>
                  <th>PO No</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Level 1 Status</th>
                  <th>Approved By</th>
                  <th>Approved Date</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((po, i) => (
                  <tr 
                    key={po.id} 
                    tabIndex={0}
                    style={{ 
                      cursor: "pointer",
                      backgroundColor: selectedPOs.has(po.id) ? "#eef2ff" : "transparent"
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const checkbox = e.currentTarget.querySelector('input[type="checkbox"]');
                        if (checkbox) {
                          checkbox.click();
                          const event = new Event('change', { bubbles: true });
                          checkbox.dispatchEvent(event);
                        }
                      }
                    }}
                  >
                    {!showApproved && (
                      <td style={{ textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={selectedPOs.has(po.id)} 
                          onChange={() => toggleSelect(po.id)} 
                        />
                      </td>
                    )}
                    <td>{i+1}</td>
                    <td 
                      style={{ 
                        fontWeight: 600, 
                        color: "var(--accent)", 
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationColor: "#3b6ef8",
                        textUnderlineOffset: "2px"
                      }}
                      onClick={() => handlePOClick(po)}
                    >
                      {po.ponumber || po.poNo}
                    </td>
                    <td>{po.podate || po.date}</td>
                    <td>{po.supplier || po.supplierName}</td>
                    <td>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 500,
                        background: (po.level1Approved === "Yes") ? "#d1fae5" : "#fef3c7",
                        color: (po.level1Approved === "Yes") ? "#065f46" : "#92400e"
                      }}>
                        {(po.level1Approved === "Yes") ? "✓ Approved" : "⏳ Pending"}
                      </span>
                    </td>
                    <td>{po.level1ApprovedBy || "-"}</td>
                    <td>{po.level1ApprovedDate ? new Date(po.level1ApprovedDate).toLocaleDateString() : "-"}</td>
                    <td>₹{fmt(po.totalAmount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
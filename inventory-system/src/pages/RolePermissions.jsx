import React, { useState, useEffect } from 'react';

const RolePermissions = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [resourceGroups, setResourceGroups] = useState([
    {
      name: "Master Data",
      items: [
        { path: "/inv-head", label: "Inventory Head" },
        { path: "/main-cat", label: "Main Category" },
        { path: "/item", label: "Item" },
        { path: "/supplier", label: "Supplier" },
        { path: "/payment-terms", label: "Payment Terms" },
        { path: "/uom", label: "UOM" },
        { path: "/make", label: "Make" },
        { path: "/spec", label: "Spec Name" },
        { path: "/country", label: "Country" },
        { path: "/state", label: "State" },
        { path: "/city", label: "City" },
        { path: "/store", label: "Store Master" },
        { path: "/department", label: "Department Master" },
        { path: "/process", label: "Process Master" },
      ]
    },{
      name: "Reports",
      items: [
        { path: "/purchase-indent-report", label: "Purchase Indent Report" },
        { path: "/purchase-order-report", label: "Purchase Order Report" },
        { path: "/purchase-grn-report", label: "Purchase GRN Report" },
        {path: "/inventory-report", label: "Inventory Stock Flow Report" },
        {path:"/po-level1-pending", label: "Level 1 Pending PO Report"},
        {path:"/po-level2-pending", label: "Level 2 Pending PO Report"},
      ]
    },
    {
      name: "Transactions",
      items: [
        { path: "/purchase-indent", label: "Purchase Indent" },
        { path: "/item-price-list", label: "Item Price List" },
        { path: "/purchase-order", label: "Purchase Order" },
        { path: "/purchase-grn", label: "Purchase GRN" },
        { path: "/consumption-issue", label: "Consumption Issue" },
        { path: "/opening-stock", label: "Opening Stock" },
      ]
    },
    {
      name: "Administration",
      items: [
        { path: "/admin/users", label: "User Management" },
        { path: "/admin/permissions", label: "Access Control" },
      ]
    }
  ]);
  const [collapsedGroups, setCollapsedGroups] = useState({
    "Master Data": true,
    "Transactions": true,
    "Administration": true
  });

  const toggleCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const BASE_URL = import.meta.env.VITE_API_URL || "/api";
  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch(`${BASE_URL}/roles`),
        fetch(`${BASE_URL}/permissions`)
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (error) {

    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hasPermission = (roleName, resourcePath) => {
    if (roleName === 'admin') return true;
    const perm = permissions.find(p => p.roleName === roleName && p.resourcePath === resourcePath);
    return perm ? perm.canAccess : false;
  };

  const togglePermission = async (roleName, resourcePath, explicitValue = null) => {
    if (roleName === 'admin') return;
    const currentAccess = hasPermission(roleName, resourcePath);
    const newValue = explicitValue !== null ? explicitValue : !currentAccess;

    try {
      await fetch(`${BASE_URL}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName, resourcePath, canAccess: newValue }),
      });
    } catch (error) {

    }
  };

  const toggleGroup = async (roleName, groupItems) => {
    if (roleName === 'admin') return;
    
    const allActive = groupItems.every(item => hasPermission(roleName, item.path));
    const newValue = !allActive;

    for (const item of groupItems) {
      await togglePermission(roleName, item.path, newValue);
    }
    fetchData();
  };

  const isGroupFullyActive = (roleName, groupItems) => {
    return groupItems.every(item => hasPermission(roleName, item.path));
  };

  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">Access Control</h1>
          <p className="inv-page-sub">Dynamically manage page access for each system role</p>
        </div>
      </div>

      <div className="inv-card" style={{ overflowX: 'auto' }}>
        <table className="inv-table">
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 10 }}>Resource / Page</th>
              {roles.filter(r => r.name !== 'admin').map(role => (
                <th key={role.id} style={{ textAlign: 'center', textTransform: 'capitalize' }}>
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resourceGroups.map(group => (
              <React.Fragment key={group.name}>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td 
                    style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 5, cursor: 'pointer' }}
                    onClick={() => toggleCollapse(group.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg 
                        width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                        style={{ transition: 'transform 0.2s', transform: collapsedGroups[group.name] ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                      >
                        <path d="M19 9l-7 7-7-7"></path>
                      </svg>
                      <div style={{ fontWeight: '700', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {group.name}
                      </div>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>({group.items.length})</span>
                    </div>
                  </td>
                  {roles.filter(r => r.name !== 'admin').map(role => (
                    <td key={role.id} style={{ textAlign: 'center' }}>
                      <button 
                        className="inv-btn-icon" 
                        onClick={(e) => { e.stopPropagation(); toggleGroup(role.name, group.items); }}
                        title={`Toggle all ${group.name} for ${role.name}`}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: isGroupFullyActive(role.name, group.items) ? '#3b6ef8' : '#cbd5e1' }}
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
                      </button>
                    </td>
                  ))}
                </tr>
                {!collapsedGroups[group.name] && group.items.map(item => (
                  <tr key={item.path} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 5, paddingLeft: '32px' }}>
                      <div className="inv-bold" style={{ fontSize: '13px' }}>{item.label}</div>
                    </td>
                    {roles.filter(r => r.name !== 'admin').map(role => (
                      <td key={role.id} style={{ textAlign: 'center' }}>
                        <label className="permission-switch">
                          <input 
                            type="checkbox" 
                            checked={hasPermission(role.name, item.path)}
                            onChange={async () => {
                              await togglePermission(role.name, item.path);
                              fetchData();
                            }}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .permission-switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 20px;
        }
        .permission-switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #cbd5e1;
          transition: .4s;
          border-radius: 20px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 14px; width: 14px;
          left: 3px; bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: #3b6ef8; }
        input:checked + .slider:before { transform: translateX(20px); }
      `}} />
    </div>
  );
};

export default RolePermissions;

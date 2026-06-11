import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: null, username: '', role: 'user', password: '', name: '' });
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL || "/api";
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/users`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${BASE_URL}/roles`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setRoles(data);
      }
    } catch (error) {

    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    const results = users.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(results);
  }, [searchTerm, users]);

  const handleOpenModal = (user = { id: null, username: '', role: 'user', password: '', name: '' }) => {
    setCurrentUser({ ...user, password: '' });
    setIsEditing(!!user.id);
    setIsModalOpen(true);
    setShowPassword(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUser({ id: null, username: '', role: 'user', password: '', name: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing ? `${BASE_URL}/users/${currentUser.id}` : `${BASE_URL}/users`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUser),
      });

      if (response.ok) {
        fetchUsers();
        handleCloseModal();
      } else {
        const error = await response.json();
        alert(error.message || 'Operation failed');
      }
    } catch (error) {

    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BASE_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      });
      if (response.ok) {
        fetchRoles();
        setNewRole({ name: '', description: '' });
        setIsRoleModalOpen(false);
      }
    } catch (error) {

    }
  };

  const handleDeleteRole = async (id) => {
    if (window.confirm('Delete this role? This might affect users assigned to it.')) {
      try {
        await fetch(`${BASE_URL}/roles/${id}`, { method: 'DELETE' });
        fetchRoles();
      } catch (error) {

      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await fetch(`${BASE_URL}/users/${id}`, { method: 'DELETE' });
        if (response.ok) {
          fetchUsers();
        }
      } catch (error) {

      }
    }
  };
  const CompanySettingsPopup = () => {
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
      fetch(`${BASE_URL}/company`)
        .then(res => res.json())
        .then(data => {
          setCompany(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, []);

    const handleSave = async () => {
      setSaving(true);
      setMsg("");

      try {
        const formData = new FormData();
        Object.keys(company).forEach(key => {
          formData.append(key, company[key]);
        });

        if (logoFile) {
          formData.append("logo", logoFile);
        }

        const res = await fetch(`${BASE_URL}/company`, {
          method: "PUT",
          body: formData,
        });

        if (res.ok) {
          const updated = await res.json();
          setCompany(updated);
          setLogoFile(null);
          setMsg("Saved successfully!");
        } else {
          setMsg("Failed to save");
        }
      } catch {
        setMsg("Error saving");
      }

      setSaving(false);
    };

    if (loading) {
      return <div style={{ padding: 20 }}>Loading...</div>;
    }

    return (
      <div className="inv-modal-body">
        {msg && <p style={{ marginBottom: 10 }}>{msg}</p>}

        <div className="inv-field">
          <label>Company Name</label>
          <input
            className="inv-input"
            value={company.companyName}
            onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
          />
        </div>

        <div className="inv-field">
          <label>Address</label>
          <textarea
            className="inv-input"
            value={company.address}
            onChange={(e) => setCompany({ ...company, address: e.target.value })}
          />
        </div>

        <div className="inv-field">
          <label>Phone</label>
          <input
            className="inv-input"
            value={company.phone}
            onChange={(e) => setCompany({ ...company, phone: e.target.value })}
          />
        </div>

        <div className="inv-field">
          <label>Email</label>
          <input
            className="inv-input"
            value={company.email}
            onChange={(e) => setCompany({ ...company, email: e.target.value })}
          />
        </div>

        <div className="inv-field">
          <label>GSTIN</label>
          <input
            className="inv-input"
            value={company.gstin}
            onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
          />
        </div>

        <div className="inv-field">
          <label>Logo</label>
          <input
            type="file"
            onChange={(e) => setLogoFile(e.target.files[0])}
          />
        </div>

        <div className="inv-modal-footer">
          <button className="inv-btn-primary" onClick={handleSave}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  };
  return (
    <div className="inv-page">
      <div className="inv-page-header">
        <div>
          <h1 className="inv-page-title">User Management</h1>
          <p className="inv-page-sub">Create and manage administrative accounts for HONC</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="inv-btn-secondary"
            onClick={() => setIsCompanyModalOpen(true)}
          >
            Honc Details
          </button>

          <button
            className="inv-btn-secondary"
            onClick={() => setIsRoleModalOpen(true)}
          >
            Manage Roles
          </button>

          <button className="inv-btn-primary" onClick={() => handleOpenModal()}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path d="M12 5v14M5 12h14"></path></svg>
            Add New User
          </button>
        </div>
      </div>

      <div className="inv-toolbar">
        <div className="inv-search-wrap" style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="inv-search"
            placeholder="Search users by name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div className="inv-count">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      <div className="inv-card">
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th width="60">ID</th>
                <th>User Details</th>
                <th>Role</th>
                <th>Last Updated</th>
                <th width="120" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loader-spinner" style={{ width: '30px', height: '30px', borderColor: '#3b6ef8', borderTopColor: 'transparent' }}></div>
                    <p style={{ marginTop: '10px', color: '#64748b' }}>Loading user data...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: '#64748b' }}>No users found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="inv-idx">{user.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b6ef8', fontSize: '12px', fontWeight: 'bold' }}>
                          {(user.name || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="inv-bold">{user.name || 'No Name Set'}</div>
                          <div className="inv-muted-sm">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`inv-badge ${user.role === 'admin' ? 'inv-badge-yes' : 'inv-tag'}`} style={{ textTransform: 'capitalize' }}>
                        {user.role}
                      </span>
                    </td>
                    <td className="inv-muted-sm">
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="inv-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="inv-btn-icon" onClick={() => handleOpenModal(user)} title="Edit User">
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button className="inv-btn-icon inv-btn-danger" onClick={() => handleDelete(user.id)} title="Delete User">
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
      {isCompanyModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal" style={{ width: '600px' }}>
            <div className="inv-modal-header">
              <h2 className="inv-modal-title">Company Settings</h2>
              <button
                className="inv-modal-close"
                onClick={() => setIsCompanyModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <CompanySettingsPopup />
          </div>
        </div>
      )}
      {isRoleModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal" style={{ width: '400px' }}>
            <div className="inv-modal-header">
              <h2 className="inv-modal-title">System Role Manager</h2>
              <button className="inv-modal-close" onClick={() => setIsRoleModalOpen(false)}>&times;</button>
            </div>
            <div className="inv-modal-body">
              <form onSubmit={handleAddRole} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eef2f6' }}>
                <div className="inv-field" style={{ marginBottom: '12px' }}>
                  <label className="inv-label">New Role Name</label>
                  <input
                    className="inv-input"
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="e.g. Guest"
                    required
                  />
                </div>
                <button type="submit" className="inv-btn-primary" style={{ width: '100%' }}>Add Role</button>
              </form>
              <div className="inv-section-label">Active Roles</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {roles.map(role => (
                  <div key={role.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                    <span className="inv-bold" style={{ textTransform: 'capitalize' }}>{role.name}</span>
                    {role.name !== 'admin' && (
                      <button className="inv-btn-icon inv-btn-danger" onClick={() => handleDeleteRole(role.id)}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal" style={{ width: '450px' }}>
            <div className="inv-modal-header">
              <h2 className="inv-modal-title">{isEditing ? 'Edit User Details' : 'Create New System User'}</h2>
              <button className="inv-modal-close" onClick={handleCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="inv-modal-body">
                <div className="inv-field" style={{ marginBottom: '16px' }}>
                  <label className="inv-label">Full Name</label>
                  <input
                    className="inv-input"
                    type="text"
                    value={currentUser.name}
                    onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="inv-field" style={{ marginBottom: '16px' }}>
                  <label className="inv-label">Username</label>
                  <input
                    className="inv-input"
                    type="text"
                    value={currentUser.username}
                    onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                    placeholder="Enter unique username"
                    required
                  />
                </div>
                <div className="inv-field" style={{ marginBottom: '16px' }}>
                  <label className="inv-label">Password {isEditing && '(Leave blank to keep current)'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="inv-input"
                      type={showPassword ? 'text' : 'password'}
                      value={currentUser.password || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                      placeholder="••••••••"
                      required={!isEditing}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="inv-field">
                  <label className="inv-label">System Role</label>
                  <select
                    className="inv-input"
                    value={currentUser.role}
                    onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="inv-modal-footer">
                <button type="button" className="inv-btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="inv-btn-primary">
                  {isEditing ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;


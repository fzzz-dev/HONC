import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem('honc_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      // Artificial delay for loader aesthetics
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('honc_user', JSON.stringify(data.user));
        setIsAuthenticating(false);
        return data.user;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      setIsAuthenticating(false);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('honc_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticating }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

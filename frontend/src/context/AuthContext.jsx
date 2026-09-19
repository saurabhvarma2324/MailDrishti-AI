import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [investigator, setInvestigator] = useState(
    JSON.parse(localStorage.getItem('investigator')) || null
  );

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    
    if (investigator) {
      localStorage.setItem('investigator', JSON.stringify(investigator));
    } else {
      localStorage.removeItem('investigator');
    }
  }, [token, investigator]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid email or password.');
      }

      const data = await response.json();
      setToken(data.token);
      setInvestigator(data.investigator);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setInvestigator(null);
  };

  return (
    <AuthContext.Provider value={{ token, investigator, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [token, setToken]             = useState(localStorage.getItem('healthcare_token'));
  const [loading, setLoading]         = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Auto-load user on app mount if a token exists
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('healthcare_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.auth.getMe();
        setUser(res.data.user);
        setToken(storedToken);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Session restore failed:', error.message);
        localStorage.removeItem('healthcare_token');
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Register new user
  const register = async (formData) => {
    const res = await api.auth.register(formData);
    const { user: userData, token: newToken } = res.data;
    localStorage.setItem('healthcare_token', newToken);
    setUser(userData);
    setToken(newToken);
    setIsAuthenticated(true);
    return userData;
  };

  // Login existing user
  const login = async (credentials) => {
    const res = await api.auth.login(credentials);
    const { user: userData, token: newToken } = res.data;
    localStorage.setItem('healthcare_token', newToken);
    setUser(userData);
    setToken(newToken);
    setIsAuthenticated(true);
    return userData;
  };

  // Logout: clear all state and token
  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (_) {
      // Silently ignore server-side logout errors
    } finally {
      localStorage.removeItem('healthcare_token');
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
    }
  };

  // Reload user from token (useful after profile updates)
  const loadUser = async () => {
    try {
      const res = await api.auth.getMe();
      setUser(res.data.user);
    } catch (error) {
      console.error('Failed to reload user:', error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, register, logout, loadUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { adminCheckAuth, adminLogin, adminLogout } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [requires2FASetup, setRequires2FASetup] = useState(false);
  const [require2FASetting, setRequire2FASetting] = useState(false);
  const authCheckAttempted = useRef(false);

  const checkAuth = useCallback(async () => {
    try {
      setAuthError(null);
      const data = await adminCheckAuth();
      if (data.authenticated) {
        setUser(data.user);
        setRequires2FASetup(!!data.requires_2fa_setup);
        setRequire2FASetting(!!data.require_2fa_setting);
      }
    } catch (err) {
      if (!authCheckAttempted.current) {
        console.warn('Auth check failed:', err.message || err);
      }
      setAuthError(err.message || 'Authentication check failed');
    }
    authCheckAttempted.current = true;
    setLoading(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const setUserFromData = useCallback((data) => {
    const userData = {
      id: data.id,
      username: data.username,
      email: data.email,
      is_staff: data.is_staff,
      is_superuser: data.is_superuser,
      has_2fa: data.has_2fa,
    };
    setUser(userData);
    // After a successful login, re-check 2FA status
    setRequires2FASetup(data.has_2fa === false && require2FASetting);
  }, [require2FASetting]);

  const login = useCallback(async (username, password) => {
    const data = await adminLogin(username, password);
    if (data.requires_2fa_setup || data.requires_2fa) {
      // Don't set user yet — needs 2FA
      return data;
    }
    setUserFromData(data);
    return data;
  }, [setUserFromData]);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } catch (err) {
      console.warn('Logout request failed:', err.message || err);
    }
    setUser(null);
    setRequires2FASetup(false);
    setAuthError(null);
  }, []);

  // Allow access to security page even if 2FA is required but not set up
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, logout, setUserFromData, isAuthenticated, requires2FASetup, require2FASetting, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

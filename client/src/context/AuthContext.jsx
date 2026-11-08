import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import {
  getSavedAccounts,
  saveAccount,
  removeAccount,
  updateSavedAccountProfile
} from '../utils/savedAccounts';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAccounts());

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      if (data && data.user) {
        setUser(data.user);
        const token = data.token || localStorage.getItem('mycloud_auth_token');
        if (token) {
          localStorage.setItem('mycloud_auth_token', token);
          if (data.user.role !== 'admin' && data.user.username !== 'admin') {
            saveAccount(data.user, token);
            setSavedAccounts(getSavedAccounts());
          }
        }
        return data.user;
      }
      setUser(null);
      return null;
    } catch (err) {
      // Sesi benar-benar invalid / logged out
      localStorage.removeItem('mycloud_auth_token');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    if (data.token) {
      localStorage.setItem('mycloud_auth_token', data.token);
      // Strictly only save non-admin accounts to device
      if (data.user?.role !== 'admin' && data.user?.username !== 'admin') {
        saveAccount(data.user, data.token);
        setSavedAccounts(getSavedAccounts());
      }
    }
    setUser(data.user);
    return data.user;
  };

  const loginPublic = async () => {
    const data = await api.loginPublic();
    if (data.token) {
      localStorage.setItem('mycloud_auth_token', data.token);
      saveAccount(data.user, data.token);
      setSavedAccounts(getSavedAccounts());
    }
    setUser(data.user);
    return data.user;
  };

  const register = async (username, password) => {
    const data = await api.register(username, password);
    if (data.token) {
      localStorage.setItem('mycloud_auth_token', data.token);
      saveAccount(data.user, data.token);
      setSavedAccounts(getSavedAccounts());
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    localStorage.removeItem('mycloud_auth_token');
    setUser(null);
  };

  const switchAccount = async (targetAccount) => {
    if (!targetAccount) return { success: false, error: 'Target akun tidak valid' };

    // Strict guard: Admin is NEVER switchable
    if (targetAccount.role === 'admin' || targetAccount.username === 'admin') {
      return { success: false, error: 'Akun admin tidak dapat diganti melalui fitur switch user.' };
    }

    // Public user: 1-click passwordless switch
    if (targetAccount.role === 'public' || targetAccount.username === 'public') {
      try {
        const publicUser = await loginPublic();
        return { success: true, user: publicUser };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Regular user with stored token
    if (targetAccount.token) {
      try {
        const data = await api.switchUser(targetAccount.token);
        if (data.token) {
          localStorage.setItem('mycloud_auth_token', data.token);
          saveAccount(data.user, data.token);
          setSavedAccounts(getSavedAccounts());
        }
        setUser(data.user);
        return { success: true, user: data.user };
      } catch (err) {
        console.warn('Switch token expired or invalid, requiring re-auth:', err);
        return { success: false, requirePassword: true, account: targetAccount };
      }
    }

    return { success: false, requirePassword: true, account: targetAccount };
  };

  const removeSavedAccount = (userId) => {
    const remaining = removeAccount(userId);
    setSavedAccounts(remaining);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginPublic,
        register,
        logout,
        refreshUser,
        savedAccounts,
        switchAccount,
        removeSavedAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


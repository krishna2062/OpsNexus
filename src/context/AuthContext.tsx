import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  needsPasswordChange: boolean;
  login: (credentials: { username: string; password: string }) => Promise<{ success: boolean; message?: string }>;
  firstLoginPasswordChange: (passwords: { currentPassword?: string; newPassword: string; confirmPassword: string }) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isProjectManager: boolean;
  isTeamLead: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('opsnexus_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState<boolean>(false);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('opsnexus_token');
    if (!storedToken || storedToken === 'undefined' || storedToken === 'null' || storedToken.trim().length < 10) {
      localStorage.removeItem('opsnexus_token');
      localStorage.removeItem('opsnexus_refresh');
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        setToken(storedToken);
        const mustChange = Boolean(res.data.must_change_password ?? res.data.needs_password_change);
        setNeedsPasswordChange(mustChange);
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('opsnexus_token');
        localStorage.removeItem('opsnexus_refresh');
      }
    } catch (err) {
      console.warn('[Auth] Session invalid or expired, resetting auth session:', err);
      setUser(null);
      setToken(null);
      localStorage.removeItem('opsnexus_token');
      localStorage.removeItem('opsnexus_refresh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setNeedsPasswordChange(false);
      localStorage.removeItem('opsnexus_token');
      localStorage.removeItem('opsnexus_refresh');
    };

    window.addEventListener('opsnexus:auth_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('opsnexus:auth_unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    try {
      const res = await api.login(credentials);
      if (res.success && res.data) {
        const { accessToken, refreshToken, user: loggedUser } = res.data;
        if (accessToken) {
          localStorage.setItem('opsnexus_token', accessToken);
          setToken(accessToken);
        }
        if (refreshToken) {
          localStorage.setItem('opsnexus_refresh', refreshToken);
        }
        setUser(loggedUser);
        const mustChange = Boolean(loggedUser.must_change_password ?? loggedUser.needs_password_change);
        setNeedsPasswordChange(mustChange);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Authentication error' };
    }
  };

  const firstLoginPasswordChange = async (passwords: { currentPassword?: string; newPassword: string; confirmPassword: string }) => {
    const res = await api.firstLoginPasswordChange(passwords);
    if (res.data?.accessToken) {
      localStorage.setItem('opsnexus_token', res.data.accessToken);
      setToken(res.data.accessToken);
    }
    if (res.data?.refreshToken) {
      localStorage.setItem('opsnexus_refresh', res.data.refreshToken);
    }
    setNeedsPasswordChange(false);
    if (user) {
      setUser({ ...user, ...(res.data?.user || {}), must_change_password: false, needs_password_change: false });
    }
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string; confirmPassword?: string }) => {
    await api.changePassword(data);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('opsnexus_token');
      localStorage.removeItem('opsnexus_refresh');
      setToken(null);
      setUser(null);
      setNeedsPasswordChange(false);
    }
  };

  const roleName = user?.role_name || '';
  const isAdmin = roleName === 'Super Admin' || roleName === 'Admin / HR Manager';
  const isProjectManager = isAdmin || roleName === 'Project Manager';
  const isTeamLead = isProjectManager || roleName === 'Team Lead';
  const isStaff = true; // All authenticated users are company staff

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        needsPasswordChange,
        login,
        firstLoginPasswordChange,
        changePassword,
        logout,
        refreshUser,
        isAdmin,
        isProjectManager,
        isTeamLead,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

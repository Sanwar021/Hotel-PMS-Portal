import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../api/endpoints';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredUser = (): User | null => {
  const saved = localStorage.getItem('hotelos_user');
  if (!saved) return null;
  try {
    return JSON.parse(saved) as User;
  } catch {
    localStorage.removeItem('hotelos_user');
    localStorage.removeItem('hotelos_token');
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hotelos_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthState = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('hotelos_token');
    localStorage.removeItem('hotelos_user');
  };

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('hotelos_token');
      if (storedToken) {
        try {
          const data = await authApi.getMe();
          setUser(data.user);
          localStorage.setItem('hotelos_user', JSON.stringify(data.user));
        } catch {
          clearAuthState();
        }
      }
      setIsLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    const data = await authApi.login(credentials);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('hotelos_token', data.token);
    localStorage.setItem('hotelos_user', JSON.stringify(data.user));
  };

  const logout = () => {
    clearAuthState();
    window.location.href = '/login';
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasRole,
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


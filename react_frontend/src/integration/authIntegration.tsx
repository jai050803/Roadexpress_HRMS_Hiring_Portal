import React, { createContext, useContext, useState, useEffect } from 'react';
import { HRUser } from '../lib/types';

interface AuthContextType {
  user: HRUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: HRUser) => void;
  logout: () => void;
  isHostAuth: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  isHostAuth: false,
});

export interface AuthProviderProps {
  children: React.ReactNode;
  hostToken?: string;
  hostUser?: HRUser;
  onLogout?: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  hostToken,
  hostUser,
  onLogout,
}) => {
  const isHostAuth = Boolean(hostToken);

  const [token, setToken] = useState<string | null>(() => {
    if (hostToken) return hostToken;
    return localStorage.getItem('roadexpress_hiring_token');
  });

  const [user, setUser] = useState<HRUser | null>(() => {
    if (hostUser) return hostUser;
    const cached = localStorage.getItem('roadexpress_hiring_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (hostToken) {
      setToken(hostToken);
    }
    if (hostUser) {
      setUser(hostUser);
    }
  }, [hostToken, hostUser]);

  const login = (newToken: string, newUser: HRUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('roadexpress_hiring_token', newToken);
    localStorage.setItem('roadexpress_hiring_user', JSON.stringify(newUser));
  };

  const logout = () => {
    if (isHostAuth && typeof onLogout === 'function') {
      onLogout();
      return;
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('roadexpress_hiring_token');
    localStorage.removeItem('roadexpress_hiring_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        login,
        logout,
        isHostAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

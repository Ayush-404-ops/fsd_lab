import { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken, clearToken, getUser, setUser, clearUser } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser);
  const [loading, setLoading] = useState(true);

  // On mount, verify token is still valid
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then(data => {
        setUserState(data.user);
        setUser(data.user);
      })
      .catch(() => {
        // Token invalid/expired
        clearToken();
        clearUser();
        setUserState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier, password) => {
    const data = await api.post('/auth/login', { login: identifier, password });
    setToken(data.token);
    setUser(data.user);
    setUserState(data.user);
    return data;
  };

  const register = async (username, email, password, role = 'player') => {
    const data = await api.post('/auth/register', { username, email, password, role });
    setToken(data.token);
    setUser(data.user);
    setUserState(data.user);
    return data;
  };

  const logout = () => {
    clearToken();
    clearUser();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, missionApi } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('gavelin_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await authApi.getMe();
      setUser(data.user);
      // Login check-in untuk mission
      missionApi.loginCheck().catch(() => {});
    } catch {
      localStorage.removeItem('gavelin_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    localStorage.setItem('gavelin_token', data.token);
    setUser(data.user);
    missionApi.loginCheck().catch(() => {});
    return data;
  };

  const register = async (data) => {
    const { data: res } = await authApi.register(data);
    localStorage.setItem('gavelin_token', res.token);
    setUser(res.user);
    return res;
  };

  const loginWithGoogleToken = (token) => {
    localStorage.setItem('gavelin_token', token);
    fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('gavelin_token');
    setUser(null);
  };

  const refreshUser = () => fetchUser();

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithGoogleToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

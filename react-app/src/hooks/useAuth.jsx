import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || '');
  const [modules, setModules] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(() => {
    const stored = localStorage.getItem('selectedTerminal');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('SamaPos');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }
    loadBranding();
    setLoading(false);
  }, []);

  const loadBranding = async () => {
    try {
      const data = await api.bootstrap();
      if (data.restaurantName) setRestaurantName(data.restaurantName);
      if (data.logoUrl) setLogoUrl(data.logoUrl);
    } catch (e) {
      // ignore
    }
  };

  const login = async (pin) => {
    const result = await api.login(pin);
    setUser(result.user);
    setToken(result.authToken);
    setModules(result.allowedModules || []);
    localStorage.setItem('authToken', result.authToken);
    localStorage.setItem('authUser', JSON.stringify(result.user));
    await loadBranding();
    return result;
  };

  const selectTerminal = (terminal) => {
    setSelectedTerminal(terminal);
    localStorage.setItem('selectedTerminal', JSON.stringify(terminal));
  };

  const logout = () => {
    setUser(null);
    setToken('');
    setModules([]);
    setSelectedTerminal(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('selectedTerminal');
  };

  return (
    <AuthContext.Provider value={{ user, token, modules, selectedTerminal, selectTerminal, login, logout, loading, restaurantName, logoUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

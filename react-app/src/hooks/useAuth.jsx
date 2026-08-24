import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../api';
import { tokenStorage } from '../lib/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Migra keys legacy → versionadas la primera vez que se monta el provider.
  useEffect(() => {
    tokenStorage.migrateLegacy();
  }, []);

  const [user, setUser] = useState(() => tokenStorage.getUser());
  const [token, setToken] = useState(() => tokenStorage.getToken());
  const [modules, setModules] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(() => tokenStorage.getTerminal());
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('SamaPos');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    // user/token ya vienen del initializer. Sólo refrescar branding.
    loadBranding();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    tokenStorage.setToken(result.authToken);
    tokenStorage.setUser(result.user);
    await loadBranding();
    return result;
  };

  const selectTerminal = (terminal) => {
    setSelectedTerminal(terminal);
    tokenStorage.setTerminal(terminal);
  };

  const logout = async () => {
    // Limpia local primero para que la UI reaccione ya, sin esperar al server.
    setUser(null);
    setToken('');
    setModules([]);
    setSelectedTerminal(null);
    tokenStorage.clearAll();
    // Después avisa al server (best-effort: si falla o no hay red, ya cerramos local).
    try {
      await api.logout();
    } catch (_) {
      // ignore — el usuario ya está logged out localmente
    }
  };

  // value estable: evita que todos los consumers re-renderizen cuando
  // se recrea el objeto por cualquier razón. (react-doctor/no-constructed-context-values)
  const value = useMemo(
    () => ({
      user, token, modules, selectedTerminal, selectTerminal,
      login, logout, loading, restaurantName, logoUrl,
    }),
    [user, token, modules, selectedTerminal, loading, restaurantName, logoUrl],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

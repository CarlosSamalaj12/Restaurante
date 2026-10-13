import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../api';
import { tokenStorage } from '../lib/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Migra keys legacy → versionadas la primera vez que se monta el provider.
  useEffect(() => {
    tokenStorage.migrateLegacy();

    const onUnauthorized = () => {
      setUser(null);
      setToken('');
      setModules([]);
      setSelectedTerminal(null);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const [user, setUser] = useState(() => tokenStorage.getUser());
  const [token, setToken] = useState(() => tokenStorage.getToken());
  const [modules, setModules] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(() => tokenStorage.getTerminal());
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('SamaPos');
  const [logoUrl, setLogoUrl] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [businessProfile, setBusinessProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadBranding();
      if (tokenStorage.getToken()) {
        try {
          const res = await api.refreshSession();
          if (!cancelled && res?.user) {
            setUser(res.user);
            tokenStorage.setUser(res.user);
          }
        } catch (_) {}
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBranding = async () => {
    try {
      const data = await api.bootstrap();
      if (data.restaurantName) setRestaurantName(data.restaurantName);
      if (data.logoUrl) setLogoUrl(data.logoUrl);
      if (data.businessProfile) {
        setBusinessProfile(data.businessProfile);
        if (data.businessProfile.currency_symbol) setCurrencySymbol(data.businessProfile.currency_symbol);
      }
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

  const hasPermission = (slug) => {
    if (!user) return false;
    if (['superadmin', 'admin'].includes(user.role)) return true;
    const perms = user.permissions || [];
    return perms.includes(slug) || perms.includes('*');
  };

  const canView = (viewName) => {
    if (!user) return false;
    if (['superadmin', 'admin'].includes(user.role)) return true;
    if (user.default_view === viewName) return true;
    if (hasPermission(`views.${viewName}`)) return true;
    if (viewName === 'reprints' && hasPermission('views.reprint')) return true;
    if (viewName === 'reprint' && hasPermission('views.reprints')) return true;
    if ((viewName === 'executive-dashboard' || viewName === 'executive') && 
        (hasPermission('views.executive') || hasPermission('dashboard.executive'))) return true;
    if (viewName === 'accounts' && (hasPermission('views.shifts') || hasPermission('views.cxc') || hasPermission('views.accounts'))) return true;
    if (viewName === 'cxc' && (['superadmin', 'admin', 'manager', 'cashier'].includes(user.role) || hasPermission('views.cxc'))) return true;
    if (viewName === 'settings' && ['superadmin', 'admin', 'manager'].includes(user.role)) return true;
    return false;
  };

  // value estable: evita que todos los consumers re-renderizen cuando
  // se recrea el objeto por cualquier razón. (react-doctor/no-constructed-context-values)
  const value = useMemo(
    () => ({
      user, token, modules, selectedTerminal, selectTerminal,
      login, logout, loading, restaurantName, logoUrl, currencySymbol,
      businessProfile, reloadBranding: loadBranding,
      hasPermission, canView,
    }),
    [user, token, modules, selectedTerminal, loading, restaurantName, logoUrl, currencySymbol, businessProfile],
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

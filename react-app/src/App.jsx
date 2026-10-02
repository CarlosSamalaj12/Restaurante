import { useState, useEffect } from 'react';
import { MotionConfig, LazyMotion, domMax } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { Toast } from './components/Toast';
import { OfflineBanner } from './components/OfflineBanner';
import { LicenseBlock } from './components/LicenseBlock';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLicense } from './hooks/useLicense';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tables } from './pages/Tables';
import { OrderView } from './pages/OrderView';
import { SettingsPage } from './pages/Settings';
import { ShiftsPage } from './pages/Shifts';
import { ReportsPage } from './pages/Reports';
import { AccountsPage } from './pages/AccountsPage';
import { ReprintPage } from './pages/ReprintPage';
import { KitchenDisplay } from './pages/KitchenDisplay';
import { ExecutiveDashboard } from './pages/ExecutiveDashboard';
import api from './api';
import { syncService } from './lib/syncService';

function AppContent() {
  const { user, loading, canView } = useAuth();
  const [view, setView] = useState(() => {
    const cachedUser = api ? null : null; // lazy fallback
    return 'dashboard';
  });
  const [centers, setCenters] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedTableCode, setSelectedTableCode] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [autoOpenTable, setAutoOpenTable] = useState(null);

  // Inicializar motor de sincronización offline / online
  useEffect(() => {
    const cleanup = syncService.init(api);
    return cleanup;
  }, []);

  // Al iniciar sesión o cambiar usuario, dirigir automáticamente a su vista predeterminada
  useEffect(() => {
    if (!user) {
      setView('dashboard');
      return;
    }
    const initialView = user.default_view || (canView?.('dashboard') ? 'dashboard' : 'tables');
    setView(initialView);
  }, [user?.id, user?.default_view]);

  useEffect(() => {
    if (!user) return;
    // Flag de cancelación: si `user` cambia o el componente se desmonta
    // mientras el bootstrap está en vuelo, evitamos setState en un
    // componente desmontado (react-doctor/effect-needs-cleanup).
    let cancelled = false;
    (async () => {
      try {
        const data = await api.bootstrap();
        if (!cancelled) setCenters(data.centers || []);
      } catch (error) {
        if (!cancelled) console.error('Error loading centers:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleNavigate = (page, params = {}) => {
    if (page !== 'order' && canView && !canView(page)) {
      console.warn(`[Nav] Permiso denegado para vista: ${page}`);
      const fallback = user?.default_view || (canView?.('dashboard') ? 'dashboard' : 'tables');
      setView(fallback);
      return;
    }
    setView(page);
    setSelectedAccount(null);
    if (page === 'tables' && params.openTableId) {
      setAutoOpenTable({ tableId: params.openTableId, accountId: params.openAccountId });
    } else {
      setAutoOpenTable(null);
    }
  };

  const handleSelectTable = (accountId, tableCode, tableId) => {
    setSelectedAccount(accountId);
    setSelectedTableCode(tableCode);
    setSelectedTableId(tableId);
    setView('order');
  };

  const handleBackFromOrder = () => {
    setSelectedAccount(null);
    setSelectedTableCode(null);
    setSelectedTableId(null);
    setView('tables');
  };

  const handleBackFromView = (currentView) => {
    if (canView?.('dashboard')) {
      setView('dashboard');
    } else if (currentView !== 'tables' && canView?.('tables')) {
      setView('tables');
    } else {
      logout();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  switch (view) {
    case 'order':
      return (
        <OrderView
          accountId={selectedAccount}
          tableCode={selectedTableCode}
          tableId={selectedTableId}
          onBack={handleBackFromOrder}
          onNavigate={handleNavigate}
        />
      );
    case 'tables':
      return (
        <Tables
          onBack={() => {
            setAutoOpenTable(null);
            if (canView('dashboard')) {
              setView('dashboard');
            } else {
              logout();
            }
          }}
          onSelectTable={handleSelectTable}
          centers={centers}
          autoOpenTable={autoOpenTable}
          onNavigate={handleNavigate}
        />
      );
    case 'shifts':
      return (
        <ShiftsPage onBack={() => handleBackFromView('shifts')} />
      );
    case 'reprints':
      return (
        <ReprintPage 
          onBack={() => handleBackFromView('reprints')} 
          onSelectAccount={(account) => {
            setSelectedAccount(account.id);
            setSelectedTableCode(account.table_code);
            setSelectedTableId(account.table_id);
            setView('order');
          }}
        />
      );
    case 'reports':
      return (
        <ReportsPage onBack={() => handleBackFromView('reports')} />
      );
    case 'settings':
      return (
        <SettingsPage onBack={() => handleBackFromView('settings')} />
      );
    case 'accounts':
      return (
        <AccountsPage 
          onBack={() => handleBackFromView('accounts')} 
          onSelectAccount={(account) => {
            setSelectedAccount(account.id);
            setSelectedTableCode(account.table_code);
            setSelectedTableId(account.table_id);
            setView('order');
          }} 
        />
      );
    case 'kds':
      return (
        <KitchenDisplay onBack={() => handleBackFromView('kds')} />
      );
    case 'executive-dashboard':
      return (
        <ExecutiveDashboard onBack={() => handleBackFromView('executive-dashboard')} />
      );
    default:
      if (canView && !canView('dashboard')) {
        return (
          <Tables
            onBack={() => {}}
            onSelectTable={handleSelectTable}
            centers={centers}
            autoOpenTable={autoOpenTable}
            onNavigate={handleNavigate}
          />
        );
      }
      return (
        <Dashboard
          onNavigate={handleNavigate}
          onSelectTable={handleSelectTable}
        />
      );
  }
}

function LicenseGate({ children }) {
  const { status, reason, online, serial, canOperate, terminalMeta } = useLicense();
  // Mientras no sepamos el estado, mostramos loading neutro (no bloqueamos login todavía)
  if (status === 'unknown') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-sm text-white/70">Verificando licencia de la terminal...</p>
        </div>
      </div>
    );
  }
  if (!canOperate) {
    return (
      <LicenseBlock
        status={status}
        reason={reason}
        online={online}
        serial={serial}
        firstSeenAt={terminalMeta.first_seen_at}
        ipAddress={terminalMeta.ip_address}
        onRetry={() => window.location.reload()}
      />
    );
  }
  return children;
}

export default function App() {
  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion={false}>
        <AuthProvider>
          <LicenseGate>
            <ToastProvider>
              <OfflineBanner />
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
              <Toast />
            </ToastProvider>
          </LicenseGate>
        </AuthProvider>
      </MotionConfig>
    </LazyMotion>
  );
}

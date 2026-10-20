import { useState, useEffect, lazy, Suspense } from 'react';
import { MotionConfig, LazyMotion, domMax } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { Toast } from './components/Toast';
import { OfflineBanner } from './components/OfflineBanner';
import { LicenseBlock } from './components/LicenseBlock';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useLicense } from './hooks/useLicense';
import { PendingTerminalsNotification } from './components/PendingTerminalsNotification';
import { useMaintenance } from './hooks/useMaintenance';
import { MaintenanceCountdownBanner } from './components/MaintenanceCountdownBanner';
import { MaintenanceLockScreen } from './components/MaintenanceLockScreen';
import { SuperadminMaintenanceBar } from './components/SuperadminMaintenanceBar';
import api from './api';
import { syncService } from './lib/syncService';

// Carga perezosa (Code-Splitting) para desacoplar el Menú Digital del POS
const PublicMenuPage = lazy(() => import('./pages/PublicMenuPage').then((m) => ({ default: m.PublicMenuPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Tables = lazy(() => import('./pages/Tables').then((m) => ({ default: m.Tables })));
const OrderView = lazy(() => import('./pages/OrderView').then((m) => ({ default: m.OrderView })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));
const ShiftsPage = lazy(() => import('./pages/Shifts').then((m) => ({ default: m.ShiftsPage })));
const ReportsPage = lazy(() => import('./pages/Reports').then((m) => ({ default: m.ReportsPage })));
const AccountsPage = lazy(() => import('./pages/AccountsPage').then((m) => ({ default: m.AccountsPage })));
const ReprintPage = lazy(() => import('./pages/ReprintPage').then((m) => ({ default: m.ReprintPage })));
const KitchenDisplay = lazy(() => import('./pages/KitchenDisplay').then((m) => ({ default: m.KitchenDisplay })));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard').then((m) => ({ default: m.ExecutiveDashboard })));
const CXCPage = lazy(() => import('./pages/CXC').then((m) => ({ default: m.CXCPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));

function PublicMenuLoading() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
      <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-bold text-slate-400">Cargando Menú Digital...</p>
    </div>
  );
}

function PosViewLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const { user, loading, canView } = useAuth();
  const [view, setView] = useState(() => {
    const cachedUser = api ? null : null; // lazy fallback
    return 'dashboard';
  });
  const [settingsTab, setSettingsTab] = useState('products');
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
    if (page === 'settings') {
      setSettingsTab(params.tab || 'products');
    }
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
    return (
      <Suspense fallback={<PosViewLoading />}>
        <Login />
      </Suspense>
    );
  }

  const renderCurrentView = () => {
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
          <ReportsPage 
            onBack={() => handleBackFromView('reports')} 
            onNavigateShifts={() => setView('shifts')}
          />
        );
      case 'settings':
        return (
          <SettingsPage 
            onBack={() => handleBackFromView('settings')} 
            initialTab={settingsTab}
          />
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
            onNavigate={handleNavigate}
          />
        );
      case 'cxc':
        return (
          <CXCPage 
            onBack={() => handleBackFromView('cxc')} 
          />
        );
      case 'expenses':
        return (
          <ExpensesPage 
            onBack={() => handleBackFromView('expenses')} 
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
  };

  return (
    <Suspense fallback={<PosViewLoading />}>
      {renderCurrentView()}
    </Suspense>
  );
}

function LicenseGate({ children }) {
  const { status, reason, online, serial, canOperate, terminalMeta, requestAccess, retryEnroll } = useLicense();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (status === 'unknown') {
      const timer = setTimeout(() => setLoadingTimeout(true), 3000);
      return () => clearTimeout(timer);
    }
    setLoadingTimeout(false);
  }, [status]);

  // Durante los primeros 3s mostramos el spinner inicial
  if (status === 'unknown' && !loadingTimeout && !reason) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-sm text-white/70">Verificando autorización de terminal...</p>
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
        label={terminalMeta.label}
        firstSeenAt={terminalMeta.first_seen_at}
        ipAddress={terminalMeta.ip_address}
        onRequestAccess={requestAccess}
        onRetry={() => {
          if (retryEnroll) retryEnroll();
          else window.location.reload();
        }}
      />
    );
  }
  return children;
}

function MaintenanceGate({ children }) {
  const { user } = useAuth();
  const {
    isActive,
    isCountingDown,
    countdownRemaining,
    reason,
    targetVersion,
    abortCountdown,
    endMaintenance,
    refreshStatus
  } = useMaintenance();

  const isSuperadmin = String(user?.role || '').toLowerCase() === 'superadmin';

  return (
    <>
      {/* Banner de cuenta regresiva de 30 segundos sincronizado */}
      <MaintenanceCountdownBanner
        isCountingDown={isCountingDown}
        countdownRemaining={countdownRemaining}
        reason={reason}
        targetVersion={targetVersion}
        onAbort={isSuperadmin ? abortCountdown : null}
      />

      {/* Control de pantalla durante el mantenimiento */}
      {isActive ? (
        isSuperadmin ? (
          <>
            <SuperadminMaintenanceBar
              isActive={isActive}
              reason={reason}
              targetVersion={targetVersion}
              onEndMaintenance={endMaintenance}
            />
            {children}
          </>
        ) : (
          <MaintenanceLockScreen
            reason={reason}
            targetVersion={targetVersion}
            onRefresh={refreshStatus}
          />
        )
      ) : (
        children
      )}
    </>
  );
}

export default function App() {
  const pathname = window.location.pathname;
  const isPublicMenu = pathname.startsWith('/m') || pathname.startsWith('/kiosk');

  if (isPublicMenu) {
    const isKiosk = pathname.startsWith('/kiosk');
    return (
      <LazyMotion features={domMax}>
        <MotionConfig reducedMotion="user">
          <ErrorBoundary>
            <ToastProvider>
              <Suspense fallback={<PublicMenuLoading />}>
                <PublicMenuPage isKiosk={isKiosk} />
              </Suspense>
              <Toast />
            </ToastProvider>
          </ErrorBoundary>
        </MotionConfig>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <LicenseGate>
            <ToastProvider>
              <MaintenanceGate>
                <OfflineBanner />
                <PendingTerminalsNotification />
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
                <Toast />
              </MaintenanceGate>
            </ToastProvider>
          </LicenseGate>
        </AuthProvider>
      </MotionConfig>
    </LazyMotion>
  );
}

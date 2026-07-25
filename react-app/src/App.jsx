import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { Toast } from './components/Toast';
import { OfflineBanner } from './components/OfflineBanner';
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
import api from './api';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard');
  const [centers, setCenters] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedTableCode, setSelectedTableCode] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [autoOpenTable, setAutoOpenTable] = useState(null);

  useEffect(() => {
    if (user) {
      loadCenters();
    }
  }, [user]);

  const loadCenters = async () => {
    try {
      const data = await api.bootstrap();
      setCenters(data.centers || []);
    } catch (error) {
      console.error('Error loading centers:', error);
    }
  };

  const handleNavigate = (page, params = {}) => {
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
        />
      );
    case 'tables':
      return (
        <Tables
          onBack={() => {
            setAutoOpenTable(null);
            setView('dashboard');
          }}
          onSelectTable={handleSelectTable}
          centers={centers}
          autoOpenTable={autoOpenTable}
        />
      );
    case 'shifts':
      return (
        <ShiftsPage onBack={() => setView('dashboard')} />
      );
    case 'reprints':
      return (
        <ReprintPage onBack={() => setView('dashboard')} />
      );
    case 'reports':
      return (
        <ReportsPage onBack={() => setView('dashboard')} />
      );
    case 'settings':
      return (
        <SettingsPage onBack={() => setView('dashboard')} />
      );
    case 'accounts':
      return (
        <AccountsPage 
          onBack={() => setView('dashboard')} 
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
        <KitchenDisplay onBack={() => setView('dashboard')} />
      );
    default:
      return <Dashboard onNavigate={handleNavigate} />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <OfflineBanner />
        <AppContent />
        <Toast />
      </ToastProvider>
    </AuthProvider>
  );
}

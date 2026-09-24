import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSettingsData } from '../hooks/useSettingsData';
import { LicensesTab } from '../components/LicensesTab';
import { ProductsSection } from '../components/settings/ProductsSection';
import { CategoriesSection } from '../components/settings/CategoriesSection';
import { CentersSection } from '../components/settings/CentersSection';
import { ProductionCentersSection } from '../components/settings/ProductionCentersSection';
import { TablesSection } from '../components/settings/TablesSection';
import { TerminalsSection } from '../components/settings/TerminalsSection';
import { ModifiersSection } from '../components/settings/ModifiersSection';
import { UsersSection } from '../components/settings/UsersSection';
import { RolesSection } from '../components/settings/RolesSection';
import { PaymentsSection } from '../components/settings/PaymentsSection';
import { PrintersDiagnosticSection } from '../components/settings/PrintersDiagnosticSection';
import { SystemSection } from '../components/settings/SystemSection';
import {
  ArrowLeft,
  Loader2,
  Package,
  LayoutGrid,
  Users,
  CreditCard,
  Settings,
  Monitor,
  List,
  Shield,
  Key,
  Printer,
} from 'lucide-react';

const TABS = [
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'categories', label: 'Categorías', icon: LayoutGrid },
  { id: 'centers', label: 'Centros', icon: LayoutGrid },
  { id: 'production', label: 'Producción', icon: LayoutGrid },
  { id: 'tables', label: 'Mesas', icon: LayoutGrid },
  { id: 'terminals', label: 'Terminales', icon: Monitor },
  { id: 'printers', label: 'Impresoras', icon: Printer },
  { id: 'modifiers', label: 'Modificadores', icon: List },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'payments', label: 'Pagos', icon: CreditCard },
  { id: 'licenses', label: 'Licencias', icon: Key },
  { id: 'system', label: 'Sistema', icon: Settings },
];

export function SettingsPage({ onBack }) {
  const { user } = useAuth();
  const allowedTabs = TABS.filter(tab => {
    if (['licenses', 'roles', 'system'].includes(tab.id)) {
      return user?.role === 'admin';
    }
    if (tab.id === 'users') {
      return ['admin', 'manager'].includes(user?.role);
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState(() => allowedTabs[0]?.id || 'products');
  const { data, setData, loading, loadData } = useSettingsData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Configuración</h1>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {allowedTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'products' && (
          <ProductsSection
            products={data.products}
            categories={data.categories}
            productionCenters={data.productionCenters}
            productProductionCenters={data.productProductionCenters}
            modifierGroups={data.modifierGroups}
            productModifierGroups={data.productModifierGroups}
            centers={data.centers}
            onReload={loadData}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesSection categories={data.categories} centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'centers' && (
          <CentersSection centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'production' && (
          <ProductionCentersSection productionCenters={data.productionCenters} centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'tables' && (
          <TablesSection tables={data.tables} centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'terminals' && (
          <TerminalsSection terminals={data.terminals} centers={data.centers} onReload={loadData} />
        )}
        {activeTab === 'modifiers' && (
          <ModifiersSection groups={data.modifierGroups} options={data.modifierOptions} onReload={loadData} />
        )}
        {activeTab === 'users' && (
          <UsersSection centers={data.centers} roles={data.roles} staffUsers={data.staffUsers} onReload={loadData} />
        )}
        {activeTab === 'roles' && (
          <RolesSection
            roles={data.roles}
            permissions={data.permissions}
            permByRole={data.permByRole}
            rolesByUser={data.rolesByUser}
            staffUsers={data.staffUsers}
            onReload={loadData}
          />
        )}
        {activeTab === 'payments' && (
          <PaymentsSection methods={data.paymentMethods} />
        )}
        {activeTab === 'printers' && (
          <PrintersDiagnosticSection />
        )}
        {activeTab === 'licenses' && (<LicensesTab />)}
        {activeTab === 'system' && (
          <SystemSection
            restaurantName={data.restaurantName}
            tipPercent={data.tipPercent}
            logoUrl={data.logoUrl}
            loginBgUrl={data.loginBgUrl}
            paymentMethods={data.paymentMethods}
            onSaved={(updates) => {
              if (updates.restaurantName) setData(d => ({ ...d, restaurantName: updates.restaurantName }));
              if (updates.logoUrl !== undefined) setData(d => ({ ...d, logoUrl: updates.logoUrl }));
              if (updates.loginBgUrl !== undefined) setData(d => ({ ...d, loginBgUrl: updates.loginBgUrl }));
            }}
          />
        )}
      </div>
    </div>
  );
}

export default SettingsPage;

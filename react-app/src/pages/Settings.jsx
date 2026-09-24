// react-app/src/pages/Settings.jsx
// Interfaz moderna de Configuración con barra lateral categorizada, buscador inteligente en tiempo real y soporte responsivo

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { RoutingMatrixSection } from '../components/settings/RoutingMatrixSection';
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
  Search,
  X,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeft,
  UtensilsCrossed,
  Building2,
  Store,
  ChevronDown,
  Network
} from 'lucide-react';

const GROUPS = [
  {
    id: 'catalog',
    label: 'Catálogo y Menú',
    description: 'Gestión de productos, categorías y modificadores',
    items: [
      {
        id: 'products',
        label: 'Productos',
        shortDesc: 'Carta y precios',
        icon: Package,
        keywords: ['platos', 'bebidas', 'precios', 'recetas', 'carta', 'menu', 'comida'],
        getBadge: (d) => d.products?.length,
      },
      {
        id: 'categories',
        label: 'Categorías',
        shortDesc: 'Familias del menú',
        icon: LayoutGrid,
        keywords: ['grupos', 'secciones', 'familias'],
        getBadge: (d) => d.categories?.length,
      },
      {
        id: 'modifiers',
        label: 'Modificadores',
        shortDesc: 'Términos, salsas, extras',
        icon: List,
        keywords: ['adicionales', 'extras', 'grupos', 'opciones', 'terminos', 'salsas', 'guarniciones'],
        getBadge: (d) => d.modifierGroups?.length,
      },
    ],
  },
  {
    id: 'operations',
    label: 'Piso y Operaciones',
    description: 'Salones, estaciones, terminales e impresoras',
    items: [
      {
        id: 'tables',
        label: 'Mesas y Áreas',
        shortDesc: 'Distribución y capacidad',
        icon: UtensilsCrossed,
        keywords: ['salones', 'terraza', 'mesas', 'sillas', 'capacidad', 'layout'],
        getBadge: (d) => d.tables?.length,
      },
      {
        id: 'centers',
        label: 'Centros de Operación',
        shortDesc: 'Restaurante, Bar, Delivery',
        icon: Store,
        keywords: ['sucursales', 'bar', 'cocina', 'operacion', 'bodega'],
        getBadge: (d) => d.centers?.length,
      },
      {
        id: 'production',
        label: 'Centros de Producción',
        shortDesc: 'Cocina, Barra, Despacho',
        icon: Building2,
        keywords: ['cocina', 'barra', 'kds', 'produccion', 'despacho'],
        getBadge: (d) => d.productionCenters?.length,
      },
      {
        id: 'terminals',
        label: 'Terminales POS',
        shortDesc: 'Cajas y estaciones',
        icon: Monitor,
        keywords: ['dispositivos', 'cajas', 'estaciones', 'ip', 'maquinas'],
        getBadge: (d) => d.terminals?.length,
      },
      {
        id: 'printers',
        label: 'Impresoras y Diagnóstico',
        shortDesc: 'Comandas y tickets',
        icon: Printer,
        keywords: ['tickets', 'comandas', 'red', 'escpos', 'imprimir', 'papel', 'puerto'],
      },
      {
        id: 'routing',
        label: 'Matriz de Enrutamiento',
        shortDesc: 'Comandas, KDS y rutas',
        icon: Network,
        keywords: ['enrutamiento', 'kds', 'comandas', 'impresion', 'matriz', 'cocina', 'bar', 'categorias impresion'],
        getBadge: (d) => d.routingMatrix?.length,
      },
    ],
  },
  {
    id: 'staff',
    label: 'Personal y Seguridad',
    description: 'Control de meseros, cajeros, administradores y permisos',
    items: [
      {
        id: 'users',
        label: 'Usuarios y Staff',
        shortDesc: 'Meseros, cajeros, personal',
        icon: Users,
        keywords: ['empleados', 'meseros', 'cajeros', 'pin', 'personal', 'staff'],
        getBadge: (d) => d.staffUsers?.length,
        requiresRole: ['admin', 'manager'],
      },
      {
        id: 'roles',
        label: 'Roles y Permisos',
        shortDesc: 'Accesos y restricciones',
        icon: Shield,
        keywords: ['seguridad', 'permisos', 'privilegios', 'administrador', 'cajero', 'accesos'],
        requiresRole: ['admin'],
        getBadge: (d) => d.roles?.length,
      },
    ],
  },
  {
    id: 'business',
    label: 'Negocio y Sistema',
    description: 'Métodos de pago, perfil comercial y licencias',
    items: [
      {
        id: 'payments',
        label: 'Formas de Pago',
        shortDesc: 'Efectivo, tarjetas, transferencias',
        icon: CreditCard,
        keywords: ['metodos', 'efectivo', 'tarjeta', 'transferencia', 'cobro', 'cxc', 'yappy'],
        getBadge: (d) => d.paymentMethods?.length,
      },
      {
        id: 'system',
        label: 'Identidad y Sistema',
        shortDesc: 'Nombre, logo, propina',
        icon: Settings,
        keywords: ['branding', 'logo', 'restaurante', 'propina', 'empresa', 'datos', 'ticket', 'pie'],
        requiresRole: ['admin'],
      },
      {
        id: 'licenses',
        label: 'Licencias de Terminal',
        shortDesc: 'Estado y activación',
        icon: Key,
        keywords: ['licencia', 'serial', 'activacion', 'terminal', 'registro', 'tier'],
        requiresRole: ['admin'],
      },
    ],
  },
];

export function SettingsPage({ onBack }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const { data, setData, loading, loadData } = useSettingsData();
  const searchInputRef = useRef(null);

  // Filtrar apartados según rol del usuario autenticado
  const filteredGroups = useMemo(() => {
    const userRole = user?.role || 'waiter';

    return GROUPS.map(group => {
      const allowedItems = group.items.filter(item => {
        if (!item.requiresRole) return true;
        return item.requiresRole.includes(userRole);
      });

      return {
        ...group,
        items: allowedItems,
      };
    }).filter(group => group.items.length > 0);
  }, [user]);

  // Lista plana de todos los apartados permitidos
  const allAllowedItems = useMemo(() => {
    return filteredGroups.flatMap(g => g.items);
  }, [filteredGroups]);

  // Asegurar que activeTab pertenezca a los apartados permitidos
  useEffect(() => {
    if (allAllowedItems.length > 0 && !allAllowedItems.some(i => i.id === activeTab)) {
      setActiveTab(allAllowedItems[0].id);
    }
  }, [allAllowedItems, activeTab]);

  // Búsqueda en tiempo real por nombre, descripción y palabras clave
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return null;

    return allAllowedItems.filter(item => {
      const matchLabel = item.label.toLowerCase().includes(term);
      const matchDesc = item.shortDesc?.toLowerCase().includes(term);
      const matchId = item.id.toLowerCase().includes(term);
      const matchKeywords = item.keywords?.some(k => k.toLowerCase().includes(term));
      return matchLabel || matchDesc || matchId || matchKeywords;
    });
  }, [searchTerm, allAllowedItems]);

  // Al presionar Enter en el buscador, salta al primer resultado
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchResults && searchResults.length > 0) {
      e.preventDefault();
      handleSelectTab(searchResults[0].id);
    } else if (e.key === 'Escape') {
      setSearchTerm('');
    }
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  // Encontrar la sección activa actual y su grupo
  const activeMeta = useMemo(() => {
    for (const group of filteredGroups) {
      const item = group.items.find(i => i.id === activeTab);
      if (item) return { group, item };
    }
    return { group: null, item: null };
  }, [filteredGroups, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Cargando configuración...</p>
      </div>
    );
  }

  // Contenido de la barra lateral reutilizable (en desktop y en drawer móvil)
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Cabecera del sidebar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2.5 px-3 py-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all group"
          title="Regresar al Dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
          {(!collapsed || isMobile) && (
            <span className="font-semibold text-sm tracking-tight">Volver al POS</span>
          )}
        </button>

        {/* Botón de colapso (solo desktop) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(prev => !prev)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors hidden md:flex items-center justify-center"
            title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        {isMobile && (
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Buscador inteligente */}
      {(!collapsed || isMobile) && (
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar apartado (ej: mesa, propina)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-primary-500 rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 text-slate-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de navegación */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
        {/* Caso: Resultados de búsqueda activa */}
        {searchResults !== null ? (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Resultados ({searchResults.length})
            </p>
            {searchResults.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400">Sin coincidencias para "{searchTerm}"</p>
              </div>
            ) : (
              searchResults.map(item => {
                const Icon = item.icon;
                const isCurrent = activeTab === item.id;
                const badge = item.getBadge ? item.getBadge(data) : null;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                      isCurrent
                        ? 'bg-primary-600 text-white shadow-sm font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                    <div className="flex-1 truncate">
                      <span className="block truncate">{item.label}</span>
                      <span className={`block text-[10px] truncate ${isCurrent ? 'text-primary-100' : 'text-slate-400'}`}>
                        {item.shortDesc}
                      </span>
                    </div>
                    {badge !== null && badge !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isCurrent ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          /* Navegación agrupada normal */
          filteredGroups.map(group => (
            <div key={group.id} className="space-y-1">
              {(!collapsed || isMobile) && (
                <div className="px-3 pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {group.label}
                  </span>
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isCurrent = activeTab === item.id;
                  const badge = item.getBadge ? item.getBadge(data) : null;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      title={collapsed && !isMobile ? `${item.label} (${item.shortDesc})` : undefined}
                      className={`w-full flex items-center rounded-xl text-xs transition-all text-left ${
                        collapsed && !isMobile
                          ? 'justify-center p-3'
                          : 'gap-3 px-3 py-2.5'
                      } ${
                        isCurrent
                          ? 'bg-primary-600 text-white shadow-sm font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                      
                      {(!collapsed || isMobile) && (
                        <>
                          <div className="flex-1 truncate">
                            <span className="block truncate leading-tight">{item.label}</span>
                            <span className={`block text-[10px] truncate mt-0.5 ${
                              isCurrent ? 'text-primary-100' : 'text-slate-400'
                            }`}>
                              {item.shortDesc}
                            </span>
                          </div>

                          {badge !== null && badge !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCurrent ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pie de barra lateral */}
      {(!collapsed || isMobile) && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name || 'Usuario'}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{user?.role || 'Personal'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row antialiased">
      {/* Barra lateral Desktop / Tablet */}
      <aside
        className={`hidden md:block shrink-0 border-r border-slate-200 transition-all duration-200 sticky top-0 h-screen z-30 ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Drawer lateral Móvil */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-right">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Área principal de trabajo */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior con Breadcrumbs y acciones */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Botón menú móvil */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden"
              title="Abrir menú de configuración"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Migas de pan (Breadcrumbs) */}
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0 truncate">
              <span className="font-medium text-slate-500 hover:text-slate-800 transition-colors hidden sm:inline">
                Configuración
              </span>
              {activeMeta.group && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 hidden sm:inline text-slate-300" />
                  <span className="font-medium text-slate-500 truncate hidden sm:inline">
                    {activeMeta.group.label}
                  </span>
                </>
              )}
              {activeMeta.item && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                  <span className="font-bold text-slate-900 truncate">
                    {activeMeta.item.label}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Estado / Resumen del apartado activo */}
          {activeMeta.item && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 hidden lg:inline">
                {activeMeta.item.shortDesc}
              </span>
              {activeMeta.item.getBadge && activeMeta.item.getBadge(data) !== undefined && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200/50">
                  {activeMeta.item.getBadge(data)} registrados
                </span>
              )}
            </div>
          )}
        </header>

        {/* Contenido dinámico del apartado activo */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'products' && (
            <ProductsSection
              products={data.products}
              categories={data.categories}
              productionCenters={data.productionCenters}
              productProductionCenters={data.productProductionCenters}
              modifierGroups={data.modifierGroups}
              productModifierGroups={data.productModifierGroups}
              centers={data.centers}
              printCategories={data.printCategories}
              onReload={loadData}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesSection
              categories={data.categories}
              centers={data.centers}
              onReload={loadData}
            />
          )}

          {activeTab === 'centers' && (
            <CentersSection
              centers={data.centers}
              onReload={loadData}
            />
          )}

          {activeTab === 'production' && (
            <ProductionCentersSection
              productionCenters={data.productionCenters}
              centers={data.centers}
              onReload={loadData}
            />
          )}

          {activeTab === 'tables' && (
            <TablesSection
              tables={data.tables}
              centers={data.centers}
              onReload={loadData}
            />
          )}

          {activeTab === 'terminals' && (
            <TerminalsSection
              terminals={data.terminals}
              centers={data.centers}
              areas={data.areas}
              onReload={loadData}
            />
          )}

          {activeTab === 'modifiers' && (
            <ModifiersSection
              groups={data.modifierGroups}
              options={data.modifierOptions}
              onReload={loadData}
            />
          )}

          {activeTab === 'users' && (
            <UsersSection
              centers={data.centers}
              roles={data.roles}
              staffUsers={data.staffUsers}
              onReload={loadData}
            />
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
            <PaymentsSection
              methods={data.paymentMethods}
              onReload={loadData}
            />
          )}

          {activeTab === 'printers' && (
            <PrintersDiagnosticSection />
          )}

          {activeTab === 'routing' && (
            <RoutingMatrixSection
              areas={data.areas}
              productionCenters={data.productionCenters}
              printCategories={data.printCategories}
              routingMatrix={data.routingMatrix}
              products={data.products}
              onReload={loadData}
            />
          )}

          {activeTab === 'licenses' && (
            <LicensesTab />
          )}

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
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;

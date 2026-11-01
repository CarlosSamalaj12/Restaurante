import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Store,
  UtensilsCrossed,
  ChefHat,
  Monitor,
  Printer,
  Layers,
  ArrowRight,
  Info,
  Network
} from 'lucide-react';
import { CentersSection } from './CentersSection';
import { TablesSection } from './TablesSection';
import { ProductionCentersSection } from './ProductionCentersSection';
import { TerminalsSection } from './TerminalsSection';
import { PrintersDiagnosticSection } from './PrintersDiagnosticSection';
import { RoutingMatrixSection } from './RoutingMatrixSection';

export function InfrastructureSection({
  initialTab = 'centers',
  centers = [],
  tables = [],
  areas = [],
  productionCenters = [],
  terminals = [],
  printers = [],
  licensedTerminals = [],
  products = [],
  routingMatrix = [],
  printCategories = [],
  onReload,
}) {
  const [activeSubTab, setActiveSubTab] = useState(initialTab || 'centers');
  const [printerView, setPrinterView] = useState('catalog'); // 'catalog' | 'routing'

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'routing') {
        setActiveSubTab('printers_routing');
        setPrinterView('routing');
      } else if (initialTab === 'printers') {
        setActiveSubTab('printers_routing');
        setPrinterView('catalog');
      } else {
        setActiveSubTab(initialTab);
      }
    }
  }, [initialTab]);

  const tabs = [
    {
      id: 'centers',
      label: '1. Centros de Venta',
      shortLabel: 'Centros de Venta',
      icon: Store,
      badge: centers?.length || 0,
      badgeLabel: 'centros',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      activeColor: 'bg-blue-600 text-white shadow-blue-600/20',
      desc: 'Puntos de venta globales (Restaurante, Bar, Delivery)',
    },
    {
      id: 'tables',
      label: '2. Salones y Mesas',
      shortLabel: 'Salones y Mesas',
      icon: UtensilsCrossed,
      badge: tables?.length || 0,
      badgeLabel: 'mesas',
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      activeColor: 'bg-teal-600 text-white shadow-teal-600/20',
      desc: 'Distribución física, salones, áreas y capacidad de comensales',
    },
    {
      id: 'production',
      label: '3. Áreas de Preparación',
      shortLabel: 'Áreas de Preparación',
      icon: ChefHat,
      badge: productionCenters?.length || 0,
      badgeLabel: 'cocinas',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      activeColor: 'bg-amber-600 text-white shadow-amber-600/20',
      desc: 'Cocinas, barras y despacho con pantallas KDS o impresoras',
    },
    {
      id: 'terminals',
      label: '4. Cajas y Terminales',
      shortLabel: 'Cajas y Terminales',
      icon: Monitor,
      badge: terminals?.length || 0,
      badgeLabel: 'cajas',
      color: 'text-sky-600 bg-sky-50 border-sky-200',
      activeColor: 'bg-sky-600 text-white shadow-sky-600/20',
      desc: 'Puntos físicos de cobro, estaciones de mesero y turnos',
    },
    {
      id: 'printers_routing',
      label: '5. Impresoras y Enrutamiento',
      shortLabel: 'Impresoras y Enrutamiento',
      icon: Printer,
      badge: printers?.length || 0,
      badgeLabel: 'impresoras',
      color: 'text-violet-600 bg-violet-50 border-violet-200',
      activeColor: 'bg-violet-600 text-white shadow-violet-600/20',
      desc: 'Catálogo de IPs de red y matriz de ruteo de comandas',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Visual Hierarchy Navigation Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Infraestructura y Piso Operativo</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Arquitectura POS
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Centraliza y coordina Centros de Venta, Salones, Cocinas, Cajas e Impresoras
              </p>
            </div>
          </div>

          {/* Quick Flow Hint */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
            <span className="text-blue-600">Centro de Venta</span>
            <ArrowRight className="w-3 h-3 text-slate-300" />
            <span className="text-teal-600">Salones</span>
            <ArrowRight className="w-3 h-3 text-slate-300" />
            <span className="text-amber-600">Cocinas</span>
            <ArrowRight className="w-3 h-3 text-slate-300" />
            <span className="text-sky-600">Cajas</span>
            <ArrowRight className="w-3 h-3 text-slate-300" />
            <span className="text-violet-600">Impresoras</span>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 pt-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isActive
                    ? `${tab.activeColor} shadow-md border-transparent`
                    : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-view Content Area */}
      <div>
        {activeSubTab === 'centers' && (
          <CentersSection centers={centers} onReload={onReload} />
        )}

        {activeSubTab === 'tables' && (
          <TablesSection tables={tables} centers={centers} onReload={onReload} />
        )}

        {activeSubTab === 'production' && (
          <ProductionCentersSection
            productionCenters={productionCenters}
            printers={printers}
            centers={centers}
            onReload={onReload}
          />
        )}

        {activeSubTab === 'terminals' && (
          <TerminalsSection
            terminals={terminals}
            printers={printers}
            centers={centers}
            areas={areas}
            productionCenters={productionCenters}
            licensedTerminals={licensedTerminals}
            onReload={onReload}
          />
        )}

        {activeSubTab === 'printers_routing' && (
          <div className="space-y-4">
            {/* Toggle between Printer Catalog & Routing Matrix */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setPrinterView('catalog')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    printerView === 'catalog'
                      ? 'bg-white text-violet-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Catálogo de Impresoras ({printers.length})</span>
                </button>

                <button
                  onClick={() => setPrinterView('routing')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    printerView === 'routing'
                      ? 'bg-white text-rose-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Matriz de Enrutamiento de Comandas</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5" />
                <span>
                  {printerView === 'catalog'
                    ? 'Prueba y registra IPs de red ESC/POS'
                    : 'Rutas automáticas de platillos hacia cocina y barra'}
                </span>
              </div>
            </div>

            {printerView === 'catalog' ? (
              <PrintersDiagnosticSection
                printers={printers}
                productionCenters={productionCenters}
                terminals={terminals}
                products={products}
                onReload={onReload}
              />
            ) : (
              <RoutingMatrixSection
                onReload={onReload}
                centers={centers}
                areas={areas}
                productionCenters={productionCenters}
                routingMatrix={routingMatrix}
                printCategories={printCategories}
                products={products}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InfrastructureSection;

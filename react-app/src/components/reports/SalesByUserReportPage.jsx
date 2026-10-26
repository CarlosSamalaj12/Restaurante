// react-app/src/components/reports/SalesByUserReportPage.jsx
// Reporte de Ventas por Usuario / Mesero - Diseño Intuitivo & Minimalista v3.4 POS

import { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import { ReportLayout } from './ReportLayout';
import { NotebookMinimalIcon } from '../icons/CustomIcons';
import {
  Users,
  TrendingUp,
  Coins,
  Package,
  Search,
  Printer,
  FileSpreadsheet,
  FileText,
  XCircle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  Building2,
  AlertTriangle
} from 'lucide-react';

export function SalesByUserReportPage({ onBack }) {
  const toast = useToast();
  const [centers, setCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'products' | 'detail'

  // Fechas (por defecto mes en curso)
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Autocompletado de producto
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [searchingProd, setSearchingProd] = useState(false);
  const [showProdDrop, setShowProdDrop] = useState(false);

  useEffect(() => {
    loadBootstrap();
  }, []);

  const loadBootstrap = async () => {
    try {
      const boot = await api.bootstrap();
      setCenters(boot.centers || []);
      setCategories(boot.categories || []);
      setUsers(boot.waiters || []);
      fetchReportData();
    } catch (e) {
      console.error('Error cargando iniciales:', e);
    }
  };

  useEffect(() => {
    if (prodSearch.trim().length < 2) {
      setProdResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProd(true);
      try {
        const prods = await api.getProducts(categoryId || undefined, centerId || undefined);
        const filtered = (prods || [])
          .filter((p) => p.name.toLowerCase().includes(prodSearch.toLowerCase()))
          .slice(0, 15);
        setProdResults(filtered);
        if (filtered.length > 0) setShowProdDrop(true);
      } catch (_) {
        setProdResults([]);
      } finally {
        setSearchingProd(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [prodSearch, categoryId, centerId]);

  const selectProduct = (p) => {
    setProductName(p.name);
    setProdSearch(p.name);
    setProdResults([]);
    setShowProdDrop(false);
  };

  const clearProduct = () => {
    setProductName('');
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const fetchReportData = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecciona un rango de fechas');
      return;
    }
    setLoading(true);
    try {
      const result = await api.getSalesByUser({
        startDate,
        endDate,
        centerId: centerId || undefined,
        categoryId: categoryId || undefined,
        productName: productName || undefined,
        userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      });
      setData(result);
    } catch (e) {
      toast.error(e.message || 'Error al consultar ventas por usuario');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;

  // Cálculos de KPIs
  const grandTotal = Number(data?.grand_total || 0);
  const grandQty = Number(data?.grand_qty || 0);
  const activeUsersCount = data?.users?.length || 0;
  const avgPerUser = activeUsersCount > 0 ? grandTotal / activeUsersCount : 0;

  // Mesero Estrella
  const topWaiter = useMemo(() => {
    if (!data?.users || data.users.length === 0) return null;
    let max = data.users[0];
    for (const u of data.users) {
      if (Number(u.total_sales || 0) > Number(max.total_sales || 0)) {
        max = u;
      }
    }
    return max;
  }, [data]);

  const kpis = [
    {
      label: 'Ventas Totales Equipo',
      value: fmt(grandTotal),
      subtext: `${activeUsersCount} meseros activos`,
      subtextColor: 'text-emerald-700 font-bold',
      icon: Coins,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    },
    {
      label: 'Mesero Estrella (#1)',
      value: topWaiter?.user_name || 'N/A',
      subtext: topWaiter ? `${fmt(topWaiter.total_sales)} facturado` : 'Sin registros',
      subtextColor: 'text-rose-700 font-semibold',
      icon: Users,
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
    },
    {
      label: 'Promedio por Mesero',
      value: fmt(avgPerUser),
      subtext: 'Rendimiento medio individual',
      subtextColor: 'text-blue-700 font-semibold',
      icon: TrendingUp,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    },
    {
      label: 'Artículos Despachados',
      value: grandQty.toLocaleString('es-GT'),
      subtext: 'Platos & bebidas servidas',
      subtextColor: 'text-purple-700 font-semibold',
      icon: Package,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    },
  ];

  // Impresión térmica 80mm
  const handlePrintThermal = () => {
    if (!data) return;
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';
    const nowStr = new Date().toLocaleString('es-GT');

    const content = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Resumen de Ventas por Usuario</title>
          <style>
            body { font-family: monospace; width: 78mm; margin: 0 auto; padding: 4px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
            .title { font-size: 14px; font-weight: 900; }
            .meta { font-size: 10px; margin-bottom: 4px; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .bold { font-weight: bold; }
            .total { font-size: 13px; font-weight: 900; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 0; margin-top: 6px; }
            .footer { text-align: center; font-size: 9px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">VENTAS POR PERSONAL / MESERO</div>
            <div class="meta">${centerName}</div>
            <div class="meta">Periodo: ${startDate} al ${endDate}</div>
            <div class="meta">Impreso: ${nowStr}</div>
          </div>

          <div style="font-weight: bold; margin-bottom: 4px;">RANKING INDIVIDUAL:</div>
          ${(data.users || [])
            .map((u, i) => {
              const pct = grandTotal > 0 ? ((Number(u.total_sales) / grandTotal) * 100).toFixed(1) : '0';
              return `
                <div class="row">
                  <span>#${i + 1} ${u.user_name} (${u.total_qty} pzs):</span>
                  <span class="bold">Q ${Number(u.total_sales || 0).toFixed(2)} (${pct}%)</span>
                </div>
              `;
            })
            .join('')}

          <div class="row total">
            <span>TOTAL EQUIPO:</span>
            <span>Q ${grandTotal.toFixed(2)}</span>
          </div>

          <div class="footer">
            CONTROL DE PRODUCTIVIDAD • NO FISCAL
          </div>
          <script>window.print();window.close();<\/script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) {
      toast.error('Permite las ventanas emergentes para imprimir');
      return;
    }
    win.document.write(content);
    win.document.close();
  };

  // Exportar Excel
  const handleExportExcel = () => {
    if (!data?.users?.length && !data?.detail_rows?.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';

    exportToExcel({
      sheets: [
        {
          name: 'PorUsuario',
          title: 'SamaPos - Ventas por Usuario',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
          headers: [
            { label: '#', width: 6, type: 'center' },
            { label: 'Colaborador / Mesero', width: 24 },
            { label: 'Rol', width: 14 },
            { label: 'Centro', width: 16 },
            { label: 'Productos Distintos', width: 14, type: 'center' },
            { label: 'Unidades Vendidas', width: 14, type: 'center' },
            { label: 'Total Ventas', width: 16, type: 'money' },
          ],
          rows: (data.users || []).map((u, i) => [
            { value: i + 1, type: 'center' },
            { value: u.user_name, type: 'bold' },
            { value: u.user_role || 'Mesero' },
            { value: u.center_name || '-' },
            { value: Number(u.product_count || 0), type: 'center' },
            { value: Number(u.total_qty || 0), type: 'center' },
            { value: parseFloat(Number(u.total_sales || 0).toFixed(2)), type: 'money' },
          ]),
          grandTotals: [
            { value: 'TOTAL GENERAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: grandQty, type: 'boldCenter' },
            { value: parseFloat(grandTotal.toFixed(2)), type: 'money' },
          ],
        },
      ],
    });
    toast.success('Archivo Excel exportado con éxito');
  };

  // Exportar PDF
  const handleExportPDF = () => {
    if (!data?.users?.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';

    exportToPDF({
      title: 'Ventas por Personal y Rendimiento',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
      tables: [
        {
          headers: ['#', 'Usuario', 'Rol', 'Centro', 'Prod.', 'Cant.', 'Total'],
          rows: (data.users || []).map((u, i) => [
            { value: i + 1, type: 'center' },
            { value: u.user_name, type: 'bold' },
            { value: u.user_role || '-' },
            { value: u.center_name || '-' },
            { value: u.product_count, type: 'center' },
            { value: Number(u.total_qty || 0), type: 'center' },
            { value: fmt(u.total_sales), type: 'money' },
          ]),
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: grandQty, type: 'boldCenter' },
            { value: fmt(grandTotal), type: 'money' },
          ],
        },
      ],
    });
    toast.success('Reporte PDF generado');
  };

  return (
    <ReportLayout
      title="Ventas por Usuario & Rendimiento"
      badge="PERSONAL & PRODUCTIVIDAD"
      badgeColor="bg-rose-50 text-rose-800 border-rose-200"
      subtitle="Productividad de meseros, ranking de ventas individuales, productos despachados y auditoría"
      onBack={onBack}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      onRefresh={fetchReportData}
      loading={loading}
      centers={centers}
      selectedCenter={centerId}
      setSelectedCenter={setCenterId}
      kpis={kpis}
      onPrintThermal={handlePrintThermal}
      onExportExcel={handleExportExcel}
      onExportPdf={handleExportPDF}
      extraFilters={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Categoría */}
          <div className="relative">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
              Categoría
            </span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Autocompletado de Platillo */}
          <div className="relative">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
              Buscar Platillo
            </span>
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Platillo específico..."
                value={prodSearch}
                onChange={(e) => {
                  setProdSearch(e.target.value);
                  if (!e.target.value) clearProduct();
                }}
                onFocus={() => {
                  if (prodResults.length > 0) setShowProdDrop(true);
                }}
                onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
                className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none w-44 focus:bg-white focus:border-rose-400 transition-colors"
              />
              {searchingProd && (
                <Loader2 className="w-3.5 h-3.5 text-rose-500 absolute right-2.5 animate-spin" />
              )}
              {productName && !searchingProd && (
                <button
                  type="button"
                  onClick={clearProduct}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showProdDrop && prodResults.length > 0 && (
              <div className="absolute z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 w-60 max-h-52 overflow-y-auto">
                {prodResults.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => selectProduct(p)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-800 truncate">{p.name}</span>
                    {p.category_name && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded ml-1 shrink-0">
                        {p.category_name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      }
    >
      {/* ─────────────────────────────────────────────────────────── */}
      {/* SELECTOR DE USUARIOS EN CHIPS INTERACTIVOS */}
      {/* ─────────────────────────────────────────────────────────── */}
      {users.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              <span>Filtrar Colaboradores ({selectedUserIds.length > 0 ? `${selectedUserIds.length} seleccionados` : 'Todos'})</span>
            </span>
            {selectedUserIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                Limpiar selección
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap max-h-24 overflow-y-auto pt-1">
            <button
              type="button"
              onClick={() => setSelectedUserIds([])}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedUserIds.length === 0
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos los meseros
            </button>
            {users.map((u) => {
              const active = selectedUserIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                      : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${active ? 'bg-rose-600' : 'bg-slate-300'}`} />
                  <span>{u.full_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TABS DE RENDIMIENTO: RANKING / PRODUCTOS / DETALLE */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Navegación por pestañas */}
        <div className="flex border-b border-slate-200/90 bg-slate-50/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-white text-rose-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Ranking por Personal</span>
            <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px]">
              {data?.users?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'products'
                ? 'bg-white text-amber-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Comparación de Productos</span>
            <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px]">
              {data?.product_comparison?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'detail'
                ? 'bg-white text-blue-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Detalle de Transacciones</span>
            <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px]">
              {data?.detail_rows?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab 1: Ranking por Usuario */}
        {activeTab === 'users' && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(data?.users || []).map((u, i) => {
                const sales = Number(u.total_sales || 0);
                const pct = grandTotal > 0 ? ((sales / grandTotal) * 100).toFixed(1) : '0';

                return (
                  <div
                    key={u.user_id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs ${
                            i === 0
                              ? 'bg-amber-400 text-white'
                              : i === 1
                              ? 'bg-slate-300 text-slate-800'
                              : i === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          #{i + 1}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">
                            {u.user_name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
                            {u.user_role || 'Mesero'} · {u.center_name || 'Salón Principal'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {fmt(sales)}
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100/60 px-1.5 py-0.5 rounded">
                          {pct}% del total
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Top productos servidos por este usuario */}
                    {u.products && u.products.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                        {u.products.slice(0, 4).map((p) => (
                          <span
                            key={p.product_id}
                            className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md"
                          >
                            {p.product_name}: <strong className="font-mono">{p.qty}</strong>
                          </span>
                        ))}
                        {u.products.length > 4 && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            +{u.products.length - 4} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {(!data?.users || data.users.length === 0) && (
                <div className="col-span-full text-center py-10 text-slate-400">
                  No hay ventas registradas para el personal en las fechas seleccionadas
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Comparación de Productos */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Platillo / Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-center">Vendedores</th>
                  <th className="px-4 py-3 text-right">Cant. Vendida</th>
                  <th className="px-4 py-3 text-right">Total Facturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(data?.product_comparison || []).map((p, i) => (
                  <tr key={p.product_id || i} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      {p.product_name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {p.category_name}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {p.sellers?.length || 0} meseros
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700">
                      {Number(p.total_qty || 0).toLocaleString('es-GT')}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900">
                      {fmt(p.total_sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Detalle de Cuentas */}
        {activeTab === 'detail' && (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mesero</th>
                  <th className="px-4 py-3">Salón</th>
                  <th className="px-4 py-3">Platillo / Producto</th>
                  <th className="px-4 py-3 text-center">Cuenta</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Cant.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(data?.detail_rows || []).map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap font-bold text-slate-800">
                      {row.user_name || 'Personal'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                      {row.center_name || '-'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                      {row.product_name}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <NotebookMinimalIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono font-bold text-slate-700">
                          #{row.check_number || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center text-slate-400 font-mono text-[11px]">
                      {row.closed_at ? new Date(row.closed_at).toLocaleDateString('es-GT') : '-'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center font-mono font-semibold text-slate-700">
                      {Number(row.qty || 0)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono font-black text-slate-900">
                      {fmt(row.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}

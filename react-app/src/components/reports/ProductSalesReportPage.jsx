// react-app/src/components/reports/ProductSalesReportPage.jsx
// Reporte de Ventas por Categoría y Platillos - Diseño Intuitivo & Minimalista v3.4 POS

import { useState, useEffect, useMemo, Fragment } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import { ReportLayout } from './ReportLayout';
import { NotebookMinimalIcon } from '../icons/CustomIcons';
import {
  Package,
  UtensilsCrossed,
  BarChart3,
  TrendingUp,
  Search,
  Printer,
  FileSpreadsheet,
  FileText,
  XCircle,
  Loader2,
  ChevronRight,
  Coins,
  Layers,
  Trophy,
  Award,
  Flame,
  Sparkles
} from 'lucide-react';

export function ProductSalesReportPage({ onBack }) {
  const toast = useToast();
  const [centers, setCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centerId, setCenterId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [topSortBy, setTopSortBy] = useState('qty'); // 'qty' | 'sales'

  // Fechas (por defecto mes en curso)
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);

  // Autocompletado de productos
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
      fetchReportData();
    } catch (e) {
      console.error('Error cargando iniciales:', e);
    }
  };

  // Búsqueda con debounce para selector de platillo
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

  const fetchReportData = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecciona un rango de fechas');
      return;
    }
    setLoading(true);
    try {
      const result = await api.getProductSales({
        startDate,
        endDate,
        centerId: centerId || undefined,
        categoryId: categoryId || undefined,
        productName: productName || undefined,
      });
      if (result?.categories?.length) {
        setCategories(result.categories);
      }
      setData(result);
    } catch (e) {
      toast.error(e.message || 'Error al consultar ventas de productos');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;

  // Cálculos de KPIs
  const grandTotal = Number(data?.totals?.grand_total || 0);
  const grandQty = Number(data?.totals?.grand_qty || 0);
  const totalAccounts = Number(data?.totals?.total_accounts || 0);

  // Platillo estrella (#1 en ventas)
  const topProduct = useMemo(() => {
    if (!data?.rows || data.rows.length === 0) return null;
    let max = data.rows[0];
    for (const r of data.rows) {
      if (Number(r.total_sales || 0) > Number(max.total_sales || 0)) {
        max = r;
      }
    }
    return max;
  }, [data]);

  // Ranking Top 10 Platillos Más Vendidos
  const top10Products = useMemo(() => {
    if (!data?.rows || data.rows.length === 0) return [];
    const sorted = [...data.rows].sort((a, b) => {
      if (topSortBy === 'qty') {
        return Number(b.total_qty || 0) - Number(a.total_qty || 0);
      }
      return Number(b.total_sales || 0) - Number(a.total_sales || 0);
    });
    return sorted.slice(0, 10);
  }, [data, topSortBy]);

  const maxTopMetric = useMemo(() => {
    if (!top10Products.length) return 1;
    return topSortBy === 'qty'
      ? Math.max(...top10Products.map((p) => Number(p.total_qty || 0)), 1)
      : Math.max(...top10Products.map((p) => Number(p.total_sales || 0)), 1);
  }, [top10Products, topSortBy]);

  // Categoría líder (mayor facturación)
  const topCategory = useMemo(() => {
    if (!data?.rows || data.rows.length === 0) return null;
    const catMap = {};
    for (const r of data.rows) {
      const c = r.category_name || 'Sin Categoría';
      catMap[c] = (catMap[c] || 0) + Number(r.total_sales || 0);
    }
    let bestCat = '';
    let bestVal = 0;
    for (const [cat, val] of Object.entries(catMap)) {
      if (val > bestVal) {
        bestVal = val;
        bestCat = cat;
      }
    }
    return bestCat ? { name: bestCat, total: bestVal } : null;
  }, [data]);

  const kpis = [
    {
      label: 'Ventas Totales en Menú',
      value: fmt(grandTotal),
      subtext: `${totalAccounts} cuentas cerradas`,
      subtextColor: 'text-emerald-700 font-bold',
      icon: Coins,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    },
    {
      label: 'Unidades Despachadas',
      value: grandQty.toLocaleString('es-GT'),
      subtext: 'Platos & bebidas servidas',
      subtextColor: 'text-blue-700 font-semibold',
      icon: Package,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    },
    {
      label: 'Platillo Estrella (#1)',
      value: topProduct?.product_name || 'N/A',
      subtext: topProduct ? `${fmt(topProduct.total_sales)} (${topProduct.total_qty} un.)` : 'Sin registros',
      subtextColor: 'text-purple-700 font-semibold',
      icon: UtensilsCrossed,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    },
    {
      label: 'Categoría Líder',
      value: topCategory?.name || 'N/A',
      subtext: topCategory ? `${fmt(topCategory.total)} generados` : 'Sin registros',
      subtextColor: 'text-amber-700 font-semibold',
      icon: Layers,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
    },
  ];

  // Agrupación de filas por categoría
  const groupedByCategory = useMemo(() => {
    if (!data?.rows) return [];
    const groups = [];
    let currentCat = null;

    for (const row of data.rows) {
      const catName = row.category_name || 'Sin Categoría';
      if (!currentCat || currentCat.name !== catName) {
        currentCat = {
          name: catName,
          items: [],
          totalSales: 0,
          totalQty: 0,
        };
        groups.push(currentCat);
      }
      currentCat.items.push(row);
      currentCat.totalSales += Number(row.total_sales || 0);
      currentCat.totalQty += Number(row.total_qty || 0);
    }
    return groups;
  }, [data]);

  // Impresión térmica 80mm
  const handlePrintThermal = () => {
    if (!data?.rows?.length) return;
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';
    const nowStr = new Date().toLocaleString('es-GT');

    const content = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Resumen de Ventas por Categoría</title>
          <style>
            body { font-family: monospace; width: 78mm; margin: 0 auto; padding: 4px; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
            .title { font-size: 14px; font-weight: 900; }
            .meta { font-size: 10px; margin-bottom: 4px; }
            .cat-header { font-weight: bold; font-size: 11px; margin-top: 6px; border-bottom: 1px solid #000; padding-bottom: 2px; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .bold { font-weight: bold; }
            .total { font-size: 13px; font-weight: 900; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 3px 0; margin-top: 6px; }
            .footer { text-align: center; font-size: 9px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">VENTAS POR MENÚ & PRODUCTO</div>
            <div class="meta">${centerName}</div>
            <div class="meta">Periodo: ${startDate} al ${endDate}</div>
            <div class="meta">Impreso: ${nowStr}</div>
          </div>

          ${groupedByCategory
            .map(
              (cat) => `
              <div class="cat-header">${cat.name.toUpperCase()} (${cat.totalQty} un. - Q ${cat.totalSales.toFixed(2)})</div>
              ${cat.items
                .map(
                  (item) => `
                <div class="row">
                  <span>${item.product_name} x${item.total_qty}</span>
                  <span class="bold">Q ${Number(item.total_sales || 0).toFixed(2)}</span>
                </div>
              `
                )
                .join('')}
            `
            )
            .join('')}

          <div class="row total">
            <span>TOTAL (${grandQty} un):</span>
            <span>Q ${grandTotal.toFixed(2)}</span>
          </div>

          <div class="footer">
            CONTROL DE VENTAS INTERNO • NO FISCAL
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
    if (!data?.rows?.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';

    const excelRows = [];
    data.rows.forEach((r) => {
      excelRows.push([
        { value: r.category_name, type: 'bold' },
        { value: r.product_name },
        { value: Number(r.total_qty || 0), type: 'center' },
        { value: parseFloat(Number(r.total_sales || 0).toFixed(2)), type: 'money' },
        { value: Number(r.account_count || 0), type: 'center' },
      ]);
    });

    exportToExcel({
      sheets: [
        {
          name: 'VentasMenu',
          title: 'SamaPos - Ventas por Categoría y Platillos',
          subtitle: `${centerName} | Del ${startDate} al ${endDate}`,
          headers: [
            { label: 'Categoría', width: 20 },
            { label: 'Platillo / Producto', width: 32 },
            { label: 'Cantidad', width: 12, type: 'center' },
            { label: 'Total Ventas', width: 16, type: 'money' },
            { label: 'Cuentas', width: 12, type: 'center' },
          ],
          rows: excelRows,
          grandTotals: [
            { value: 'TOTAL GENERAL', type: 'bold' },
            { value: '' },
            { value: grandQty, type: 'boldCenter' },
            { value: parseFloat(grandTotal.toFixed(2)), type: 'money' },
            { value: totalAccounts, type: 'boldCenter' },
          ],
        },
      ],
    });
    toast.success('Archivo Excel exportado con éxito');
  };

  // Exportar PDF
  const handleExportPDF = () => {
    if (!data?.rows?.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';

    exportToPDF({
      title: 'Ventas por Categoría y Menú',
      subtitle: `${centerName} | Del ${startDate} al ${endDate}`,
      tables: [
        {
          headers: ['Categoría', 'Platillo / Producto', 'Cantidad', 'Total Ventas', 'Cuentas'],
          rows: data.rows.map((r) => [
            { value: r.category_name, type: 'bold' },
            { value: r.product_name },
            { value: Number(r.total_qty || 0), type: 'center' },
            { value: fmt(r.total_sales), type: 'money' },
            { value: Number(r.account_count || 0), type: 'center' },
          ]),
          grandTotals: [
            { value: 'TOTAL GENERAL', type: 'bold' },
            { value: '' },
            { value: grandQty, type: 'boldCenter' },
            { value: fmt(grandTotal), type: 'money' },
            { value: totalAccounts, type: 'boldCenter' },
          ],
        },
      ],
    });
    toast.success('Reporte PDF generado');
  };

  return (
    <ReportLayout
      title="Ventas por Categoría y Platillos"
      badge="VENTAS & MENÚ"
      badgeColor="bg-blue-50 text-blue-800 border-blue-200"
      subtitle="Rendimiento de menú, productos estrella, unidades vendidas y ventas por categoría"
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

          {/* Autocompletar Platillo */}
          <div className="relative">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
              Buscar Platillo
            </span>
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Ej. Hamburguesa..."
                value={prodSearch}
                onChange={(e) => {
                  setProdSearch(e.target.value);
                  if (!e.target.value) clearProduct();
                }}
                onFocus={() => {
                  if (prodResults.length > 0) setShowProdDrop(true);
                }}
                onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
                className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none w-48 focus:bg-white focus:border-blue-400 transition-colors"
              />
              {searchingProd && (
                <Loader2 className="w-3.5 h-3.5 text-blue-500 absolute right-2.5 animate-spin" />
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

            {/* Dropdown de autocompletado */}
            {showProdDrop && prodResults.length > 0 && (
              <div className="absolute z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 w-64 max-h-52 overflow-y-auto">
                {prodResults.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => selectProduct(p)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-800 truncate">{p.name}</span>
                    {p.category_name && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-1 shrink-0">
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
      <div className="space-y-6">
        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN: TOP 10 PLATILLOS MÁS VENDIDOS                     */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Header del Top 10 con selector de métrica */}
          <div className="px-5 py-4 border-b border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/50 via-white to-blue-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                    Top 10 Platillos Más Vendidos
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-300">
                    Ranking Maestro
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los productos con mayor impacto en cocina y ventas del período seleccionado
                </p>
              </div>
            </div>

            {/* Selector de ordenamiento: Unidades vs Monto */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setTopSortBy('qty')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  topSortBy === 'qty'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Por Unidades</span>
              </button>
              <button
                type="button"
                onClick={() => setTopSortBy('sales')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  topSortBy === 'sales'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Por Facturación (Q)</span>
              </button>
            </div>
          </div>

          {/* Listado / Grid del Top 10 */}
          {top10Products.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <p>No se encontraron productos registrados en este rango de fechas o filtros.</p>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {top10Products.map((p, idx) => {
                  const rank = idx + 1;
                  const qty = Number(p.total_qty || 0);
                  const sales = Number(p.total_sales || 0);
                  const currentVal = topSortBy === 'qty' ? qty : sales;
                  const percentOfTop = maxTopMetric > 0 ? (currentVal / maxTopMetric) * 100 : 0;
                  const percentOfGlobal =
                    topSortBy === 'qty'
                      ? grandQty > 0
                        ? ((qty / grandQty) * 100).toFixed(1)
                        : '0'
                      : grandTotal > 0
                      ? ((sales / grandTotal) * 100).toFixed(1)
                      : '0';

                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  return (
                    <div
                      key={p.product_id || p.product_name || idx}
                      className={`relative p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                        isTop1
                          ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border-amber-300 shadow-xs'
                          : isTop2
                          ? 'bg-gradient-to-r from-slate-200/40 via-slate-100/20 to-white border-slate-300'
                          : isTop3
                          ? 'bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-white border-amber-300/80'
                          : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Medalla / Posición */}
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                              isTop1
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-2 ring-amber-300'
                                : isTop2
                                ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white ring-2 ring-slate-200'
                                : isTop3
                                ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white ring-2 ring-amber-400'
                                : 'bg-slate-100 text-slate-700 font-extrabold border border-slate-200'
                            }`}
                          >
                            {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${rank}`}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                              {p.product_name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                                {p.category_name || 'Menú'}
                              </span>
                              {isTop1 && (
                                <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.2 rounded-md">
                                  Líder en ventas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Cifras clave */}
                        <div className="text-right shrink-0">
                          <div
                            className={`font-black text-xs sm:text-sm font-mono ${
                              topSortBy === 'sales' ? 'text-emerald-700' : 'text-blue-700'
                            }`}
                          >
                            {topSortBy === 'sales' ? fmt(sales) : `${qty.toLocaleString('es-GT')} un.`}
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            {topSortBy === 'sales'
                              ? `${qty.toLocaleString('es-GT')} un.`
                              : fmt(sales)}
                          </div>
                        </div>
                      </div>

                      {/* Barra de progreso relativo al #1 */}
                      <div className="mt-1 space-y-1">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTop1
                                ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                                : topSortBy === 'sales'
                                ? 'bg-gradient-to-r from-emerald-400 to-teal-600'
                                : 'bg-gradient-to-r from-blue-400 to-indigo-600'
                            }`}
                            style={{ width: `${Math.max(percentOfTop, 4)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>{percentOfGlobal}% del total del periodo</span>
                          <span>Frecuencia: {p.frequency || p.account_count || 1} cuentas</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* VISTA DESGLOSADA POR CATEGORÍA & PRODUCTO */}
        {/* ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span>Desglose de Ventas por Menú</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {groupedByCategory.length} categorías · {data?.rows?.length || 0} platillos activos
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-500">
            Total General: <span className="text-slate-900 font-extrabold font-mono">{fmt(grandTotal)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Platillo / Producto</th>
                <th className="px-4 py-3 text-center">Frecuencia (Cuentas)</th>
                <th className="px-4 py-3 text-right">Unidades Vendidas</th>
                <th className="px-4 py-3 text-right">Venta Total</th>
                <th className="px-4 py-3 text-right">% Categoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {groupedByCategory.map((cat, catIdx) => (
                <Fragment key={cat.name || catIdx}>
                  {/* Encabezado de Categoría */}
                  <tr className="bg-slate-100/70 border-y border-slate-200/80 font-bold">
                    <td colSpan={2} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-extrabold text-slate-900 uppercase tracking-tight">
                          {cat.name}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-full">
                          {cat.items.length} items
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-700">
                      {cat.totalQty.toLocaleString('es-GT')} un.
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-extrabold text-slate-900">
                      {fmt(cat.totalSales)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-500">
                      {grandTotal > 0 ? `${((cat.totalSales / grandTotal) * 100).toFixed(1)}% total` : '0%'}
                    </td>
                  </tr>

                  {/* Filas de Platillos dentro de la Categoría */}
                  {cat.items.map((r, itemIdx) => {
                    const itemSales = Number(r.total_sales || 0);
                    const pctOfCat = cat.totalSales > 0 ? ((itemSales / cat.totalSales) * 100).toFixed(1) : '0';

                    return (
                      <tr key={itemIdx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-2.5 pl-8">
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-800 text-xs">
                              {r.product_name}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px]">
                            {r.account_count || 0} tickets
                          </span>
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700 text-xs">
                          {Number(r.total_qty || 0).toLocaleString('es-GT')}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900 text-xs">
                          {fmt(itemSales)}
                        </td>

                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-slate-500 font-semibold">
                          {pctOfCat}%
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}

              {groupedByCategory.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="font-bold text-slate-600 text-xs">
                        Sin datos para el período o producto seleccionado
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Intenta ampliando el rango de fechas o limpiando el filtro
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {groupedByCategory.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-black text-xs">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider text-[11px]">
                    TOTAL GENERAL
                  </td>
                  <td className="px-4 py-3 text-center text-slate-300 font-normal text-[11px]">
                    {totalAccounts} cuentas
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-blue-300 text-sm">
                    {grandQty.toLocaleString('es-GT')} un.
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 text-sm">
                    {fmt(grandTotal)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 font-normal text-[11px]">
                    100%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  </ReportLayout>
);
}

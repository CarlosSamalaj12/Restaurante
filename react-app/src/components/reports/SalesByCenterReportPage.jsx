// react-app/src/components/reports/SalesByCenterReportPage.jsx
// Reporte de Ventas por Centro de Operación - Diseño Intuitivo & Minimalista v3.4 POS

import { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import { ReportLayout } from './ReportLayout';
import { NotebookMinimalIcon } from '../icons/CustomIcons';
import {
  Building2,
  Layers,
  Coins,
  Search,
  Printer,
  FileSpreadsheet,
  FileText,
  XCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Store
} from 'lucide-react';

export function SalesByCenterReportPage({ onBack }) {
  const toast = useToast();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'exclusive' | 'shared'

  // Fechas (por defecto mes en curso)
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');
  const [productName, setProductName] = useState('');

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
        const prods = await api.getProducts(undefined, centerId || undefined);
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
  }, [prodSearch, centerId]);

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
      const result = await api.getSalesByCenter({
        startDate,
        endDate,
        centerId: centerId || undefined,
        productName: productName || undefined,
      });
      setData(result);
    } catch (e) {
      toast.error(e.message || 'Error al consultar ventas por centro');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;

  // Cálculos de KPIs
  const grandTotal = Number(data?.grand_total || 0);
  const grandQty = Number(data?.grand_qty || 0);

  // Centro Líder
  const topCenter = useMemo(() => {
    if (!data?.center_totals || data.center_totals.length === 0) return null;
    let max = data.center_totals[0];
    for (const c of data.center_totals) {
      if (Number(c.total_sales || 0) > Number(max.total_sales || 0)) {
        max = c;
      }
    }
    return max;
  }, [data]);

  const totalAccounts = useMemo(() => {
    return (data?.center_totals || []).reduce((acc, c) => acc + Number(c.account_count || 0), 0);
  }, [data]);

  const kpis = [
    {
      label: 'Venta Consolidada Salones',
      value: fmt(grandTotal),
      subtext: `${grandQty.toLocaleString('es-GT')} productos servidos`,
      subtextColor: 'text-emerald-700 font-bold',
      icon: Coins,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    },
    {
      label: 'Centro con Mayor Venta',
      value: topCenter?.center_name || 'N/A',
      subtext: topCenter ? `${fmt(topCenter.total_sales)} facturado` : 'Sin registros',
      subtextColor: 'text-cyan-700 font-semibold',
      icon: Building2,
      iconBg: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
    },
    {
      label: 'Cuentas Atendidas',
      value: totalAccounts.toLocaleString('es-GT'),
      subtext: 'Tickets totales en el periodo',
      subtextColor: 'text-blue-700 font-semibold',
      icon: NotebookMinimalIcon,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    },
    {
      label: 'Catálogo por Salón',
      value: `${data?.shared_products?.length || 0} Comp. / ${data?.exclusive_products?.length || 0} Excl.`,
      subtext: 'Productos compartidos vs. exclusivos',
      subtextColor: 'text-purple-700 font-semibold',
      icon: Layers,
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
          <title>Resumen de Ventas por Centro</title>
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
            <div class="title">VENTAS POR SALÓN / CENTRO</div>
            <div class="meta">${centerName}</div>
            <div class="meta">Periodo: ${startDate} al ${endDate}</div>
            <div class="meta">Impreso: ${nowStr}</div>
          </div>

          <div style="font-weight: bold; margin-bottom: 4px;">DESGLOSE POR SALÓN:</div>
          ${(data.center_totals || [])
            .map((ct) => {
              const pct = grandTotal > 0 ? ((Number(ct.total_sales) / grandTotal) * 100).toFixed(1) : '0';
              return `
                <div class="row">
                  <span>${ct.center_name} (${ct.account_count} ctas):</span>
                  <span class="bold">Q ${Number(ct.total_sales || 0).toFixed(2)} (${pct}%)</span>
                </div>
              `;
            })
            .join('')}

          <div class="row total">
            <span>TOTAL GENERAL:</span>
            <span>Q ${grandTotal.toFixed(2)}</span>
          </div>

          <div class="footer">
            AUDITORÍA MULTI-SALÓN • NO FISCAL
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
    if (!data?.detail_rows?.length && !data?.products?.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';

    exportToExcel({
      sheets: [
        {
          name: 'Detalle',
          title: 'SamaPos - Ventas por Centro (Detalle)',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
          headers: [
            { label: 'Centro / Salón', width: 18 },
            { label: 'Categoría', width: 18 },
            { label: 'Producto', width: 30 },
            { label: 'Cuenta', width: 14 },
            { label: 'Fecha', width: 14 },
            { label: 'Mesero', width: 20 },
            { label: 'Cant.', width: 8, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.detail_rows || []).map((r) => [
            { value: r.center_name || '-' },
            { value: r.category_name || '-' },
            { value: r.product_name },
            { value: r.check_number || '-' },
            { value: r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: r.waiter_name || '-' },
            { value: Number(r.qty || 0), type: 'center' },
            { value: parseFloat(Number(r.line_total || 0).toFixed(2)), type: 'money' },
          ]),
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total).toFixed(2)), type: 'money' },
          ],
        },
      ],
    });
    toast.success('Archivo Excel exportado');
  };

  // Exportar PDF
  const handleExportPDF = () => {
    if (!data?.detail_rows?.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';

    exportToPDF({
      title: 'Ventas por Centro de Operación',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
      tables: [
        {
          headers: ['Centro', 'Categoría', 'Producto', 'Cuenta', 'Fecha', 'Cant.', 'Total'],
          rows: (data.detail_rows || []).map((r) => [
            { value: r.center_name || '-' },
            { value: r.category_name || '-' },
            { value: r.product_name },
            { value: r.check_number || '-' },
            { value: r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: Number(r.qty || 0), type: 'center' },
            { value: fmt(r.line_total), type: 'money' },
          ]),
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty), type: 'boldCenter' },
            { value: fmt(data.grand_total), type: 'money' },
          ],
        },
      ],
    });
    toast.success('Reporte PDF generado');
  };

  return (
    <ReportLayout
      title="Ventas por Centro de Operación"
      badge="OPERACIONES & SALONES"
      badgeColor="bg-cyan-50 text-cyan-800 border-cyan-200"
      subtitle="Comparativa de volumen, salones, terrazas, productos exclusivos y cuentas unificadas"
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
        <div className="relative">
          <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
            Filtrar Platillo
          </span>
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={prodSearch}
              onChange={(e) => {
                setProdSearch(e.target.value);
                if (!e.target.value) clearProduct();
              }}
              onFocus={() => {
                if (prodResults.length > 0) setShowProdDrop(true);
              }}
              onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
              className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none w-48 focus:bg-white focus:border-cyan-400 transition-colors"
            />
            {searchingProd && (
              <Loader2 className="w-3.5 h-3.5 text-cyan-500 absolute right-2.5 animate-spin" />
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
            <div className="absolute z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 w-64 max-h-52 overflow-y-auto">
              {prodResults.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={() => selectProduct(p)}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-cyan-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between"
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
      }
    >
      {/* ─────────────────────────────────────────────────────────── */}
      {/* RESUMEN COMPARATIVO POR SALÓN / CENTRO */}
      {/* ─────────────────────────────────────────────────────────── */}
      {data?.center_totals && data.center_totals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" />
                <span>Rendimiento y Ocupación por Salón</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Facturación, tickets cerrados y distribución porcentual
              </p>
            </div>
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {data.center_totals.length} Centros
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.center_totals.map((ct) => {
              const sales = Number(ct.total_sales || 0);
              const pct = grandTotal > 0 ? ((sales / grandTotal) * 100).toFixed(1) : '0.0';

              return (
                <div
                  key={ct.center_id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center font-black">
                        <Store className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">
                          {ct.center_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          {ct.account_count} tickets · {Number(ct.total_qty || 0).toLocaleString('es-GT')} piezas
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        {fmt(sales)}
                      </div>
                      <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100/60 px-1.5 py-0.5 rounded">
                        {pct}% total
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* CUENTAS UNIDAS / REUBICADAS (SI EXISTEN) */}
      {/* ─────────────────────────────────────────────────────────── */}
      {data?.merged_accounts && data.merged_accounts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Auditoría de Cuentas Unidas / Fusionadas ({data.merged_accounts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {data.merged_accounts.map((ma) => (
              <div
                key={ma.account_id}
                className="bg-white rounded-xl border border-amber-200/80 p-3 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <NotebookMinimalIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-bold text-slate-800">
                      #{ma.check_number || ma.account_id}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {ma.center_name || 'Salón'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Atendió: {ma.waiter_name || 'Personal'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Unida a #{ma.merged_into_account_id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* TABS DE DETALLE / EXCLUSIVOS / COMPARTIDOS */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Navegación por Pestañas */}
        <div className="flex border-b border-slate-200/90 bg-slate-50/60 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'detail'
                ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Detalle de Transacciones</span>
            <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px]">
              {data?.detail_rows?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exclusive')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'exclusive'
                ? 'bg-white text-rose-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Platillos Exclusivos</span>
            <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px]">
              {data?.exclusive_products?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'shared'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Platillos Compartidos</span>
            <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px]">
              {data?.shared_products?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab 1: Detalle Completo */}
        {activeTab === 'detail' && (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Centro / Salón</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Platillo / Producto</th>
                  <th className="px-4 py-3 text-center">Cuenta</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Cant.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(data?.detail_rows || []).map((row, i) => (
                  <tr key={i} className="hover:bg-cyan-50/40 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200/60">
                        {row.center_name || 'Principal'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                      {row.category_name}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-bold text-slate-800">
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

                {(!data?.detail_rows || data.detail_rows.length === 0) && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No se encontraron productos registrados en este centro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Exclusivos */}
        {activeTab === 'exclusive' && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data?.exclusive_products || []).map((p) => (
                <div
                  key={p.product_id}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md uppercase">
                        Exclusivo de {p.centers[0]?.center_name || 'Salón'}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs mt-1.5">
                        {p.product_name}
                      </h4>
                      <div className="text-[11px] text-slate-400">
                        {p.category_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        {fmt(p.total_sales)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {p.total_qty} unidades
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!data?.exclusive_products || data.exclusive_products.length === 0) && (
                <div className="col-span-full text-center py-10 text-slate-400">
                  No hay platillos exclusivos registrados
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Compartidos */}
        {activeTab === 'shared' && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data?.shared_products || []).map((p) => (
                <div
                  key={p.product_id}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
                        Compartido en {p.centers.length} salones
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs mt-1.5">
                        {p.product_name}
                      </h4>
                      <div className="text-[11px] text-slate-400">
                        {p.category_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        {fmt(p.total_sales)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {p.total_qty} unidades
                      </div>
                    </div>
                  </div>

                  {/* Centros donde se vende */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                    {p.centers.map((c, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md"
                      >
                        {c.center_name}: <strong className="font-mono">{c.qty}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {(!data?.shared_products || data.shared_products.length === 0) && (
                <div className="col-span-full text-center py-10 text-slate-400">
                  No hay platillos compartidos registrados
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}

// react-app/src/components/reports/PaymentMethodReportPage.jsx
// Reporte de Ventas por Forma de Pago - Diseño Intuitivo & Minimalista v3.4 POS

import { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import { ReportLayout } from './ReportLayout';
import { NotebookMinimalIcon } from '../icons/CustomIcons';
import {
  Coins,
  CreditCard,
  Building2,
  Banknote,
  Wallet,
  Search,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Percent,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export function PaymentMethodReportPage({ onBack }) {
  const toast = useToast();
  const [centers, setCenters] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filterMethod, setFilterMethod] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fechas (por defecto mes en curso)
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');

  useEffect(() => {
    loadBootstrap();
  }, []);

  const loadBootstrap = async () => {
    try {
      const boot = await api.bootstrap();
      setCenters(boot.centers || []);
      setPaymentMethods(boot.paymentMethods || []);
      // Carga inicial de datos
      fetchReportData(boot.centers);
    } catch (e) {
      console.error('Error cargando iniciales:', e);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const result = await api.getSalesByPaymentMethod({
        startDate,
        endDate,
        centerId: centerId || undefined,
        method: filterMethod || undefined,
      });
      setData(result);
    } catch (e) {
      toast.error(e.message || 'Error al consultar formas de pago');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;

  // Icono minimalista y estilo según el método de pago
  const getMethodBadge = (methodCode) => {
    const key = String(methodCode || '').toLowerCase();
    if (key.includes('cash') || key.includes('efectivo')) {
      return {
        icon: Banknote,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barBg: 'bg-emerald-500',
        label: 'Efectivo',
      };
    }
    if (key.includes('card') || key.includes('tarjeta') || key.includes('pos')) {
      return {
        icon: CreditCard,
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        barBg: 'bg-blue-500',
        label: 'Tarjeta / POS',
      };
    }
    if (key.includes('transfer') || key.includes('banco') || key.includes('deposito')) {
      return {
        icon: Building2,
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        barBg: 'bg-purple-500',
        label: 'Transferencia',
      };
    }
    return {
      icon: Coins,
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      barBg: 'bg-amber-500',
      label: String(methodCode || 'Otro').toUpperCase(),
    };
  };

  const getMethodLabel = (code) => {
    const found = paymentMethods.find((m) => m.code === code);
    if (found) return found.label;
    return getMethodBadge(code).label;
  };

  // Cálculos de KPIs
  const grandTotal = Number(data?.grand_total || 0);

  const { cashTotal, cardTotal, transferTotal, otherTotal, totalCount } = useMemo(() => {
    let cash = 0;
    let card = 0;
    let transfer = 0;
    let other = 0;
    let count = 0;

    (data?.methods || []).forEach((m) => {
      const amt = Number(m.total_amount || 0);
      const c = Number(m.transaction_count || 0);
      count += c;
      const key = String(m.method || '').toLowerCase();
      if (key.includes('cash') || key.includes('efectivo')) {
        cash += amt;
      } else if (key.includes('card') || key.includes('tarjeta') || key.includes('pos')) {
        card += amt;
      } else if (key.includes('transfer') || key.includes('banco')) {
        transfer += amt;
      } else {
        other += amt;
      }
    });

    return {
      cashTotal: cash,
      cardTotal: card,
      transferTotal: transfer,
      otherTotal: other,
      totalCount: count,
    };
  }, [data]);

  const kpis = [
    {
      label: 'Total Recaudado',
      value: fmt(grandTotal),
      subtext: `${totalCount} transacciones procesadas`,
      subtextColor: 'text-emerald-700 font-bold',
      icon: Coins,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    },
    {
      label: 'Efectivo en Caja',
      value: fmt(cashTotal),
      subtext: grandTotal > 0 ? `${((cashTotal / grandTotal) * 100).toFixed(1)}% del total` : '0.0%',
      subtextColor: 'text-slate-600 font-semibold',
      icon: Banknote,
      iconBg: 'bg-green-50 text-green-600 border border-green-100',
    },
    {
      label: 'Tarjetas / Terminal POS',
      value: fmt(cardTotal),
      subtext: grandTotal > 0 ? `${((cardTotal / grandTotal) * 100).toFixed(1)}% del total` : '0.0%',
      subtextColor: 'text-blue-600 font-semibold',
      icon: CreditCard,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    },
    {
      label: 'Transferencias & Otros',
      value: fmt(transferTotal + otherTotal),
      subtext: grandTotal > 0 ? `${(((transferTotal + otherTotal) / grandTotal) * 100).toFixed(1)}% del total` : '0.0%',
      subtextColor: 'text-purple-600 font-semibold',
      icon: Building2,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    },
  ];

  // Filtrado de la lista detallada de transacciones
  const filteredDetails = useMemo(() => {
    let list = data?.payment_details || [];
    if (filterMethod) {
      list = list.filter((p) => p.method === filterMethod);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const check = String(p.check_number || '').toLowerCase();
        const ref = String(p.reference_no || '').toLowerCase();
        const center = String(p.center_name || '').toLowerCase();
        return check.includes(q) || ref.includes(q) || center.includes(q);
      });
    }
    return list;
  }, [data, filterMethod, searchQuery]);

  // Impresión térmica 80mm de Arqueo por Forma de Pago
  const handlePrintThermal = () => {
    if (!data) return;
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';
    const nowStr = new Date().toLocaleString('es-GT');

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Arqueo por Forma de Pago</title>
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
            <div class="title">REPORTE DE FORMAS DE PAGO</div>
            <div class="meta">${centerName}</div>
            <div class="meta">Periodo: ${startDate} al ${endDate}</div>
            <div class="meta">Impreso: ${nowStr}</div>
          </div>

          <div style="font-weight: bold; margin-bottom: 4px;">DESGLOSE POR MÉTODO:</div>
          ${(data.methods || [])
            .map((m) => {
              const pct = grandTotal > 0 ? ((Number(m.total_amount) / grandTotal) * 100).toFixed(1) : '0';
              return `
                <div class="row">
                  <span>${getMethodLabel(m.method)} (${m.transaction_count} pagos):</span>
                  <span class="bold">Q ${Number(m.total_amount || 0).toFixed(2)} (${pct}%)</span>
                </div>
              `;
            })
            .join('')}

          <div class="row total">
            <span>TOTAL RECAUDADO:</span>
            <span>Q ${grandTotal.toFixed(2)}</span>
          </div>

          <div class="footer">
            CONTROL DE ARQUEO Y CAJA • NO FISCAL
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
    const details = filteredDetails;
    if (!details.length && !data?.methods?.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';
    const filterLabel = filterMethod ? ` | Filtro: ${getMethodLabel(filterMethod)}` : '';

    exportToExcel({
      sheets: [
        {
          name: 'FormaPago',
          title: 'SamaPos - Ventas por Forma de Pago',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${filterLabel}`,
          headers: [
            { label: 'Método de Pago', width: 20 },
            { label: 'Cuenta', width: 14 },
            { label: 'Centro', width: 16 },
            { label: 'Fecha y Hora', width: 18 },
            { label: 'Monto Pagado', width: 15, type: 'money' },
            { label: 'Total Cuenta', width: 15, type: 'money' },
            { label: 'Referencia / Voucher', width: 18 },
          ],
          rows: details.map((p) => [
            { value: getMethodLabel(p.method) },
            { value: p.check_number || '-' },
            { value: p.center_name || '-' },
            { value: p.created_at ? new Date(p.created_at).toLocaleString('es-GT') : '-' },
            { value: parseFloat(Number(p.amount || 0).toFixed(2)), type: 'money' },
            { value: parseFloat(Number(p.account_total || 0).toFixed(2)), type: 'money' },
            { value: p.reference_no || '-' },
          ]),
          grandTotals: [
            { value: 'TOTAL GENERAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: parseFloat(grandTotal.toFixed(2)), type: 'money' },
            { value: '' },
            { value: '' },
          ],
        },
      ],
    });
    toast.success('Archivo Excel exportado con éxito');
  };

  // Exportar PDF
  const handleExportPDF = () => {
    const details = filteredDetails;
    if (!details.length && !data?.methods?.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    const centerName = centers.find((c) => c.id === Number(centerId))?.name || 'Todos los centros';
    const filterLabel = filterMethod ? ` | Filtro: ${getMethodLabel(filterMethod)}` : '';

    exportToPDF({
      title: 'Ventas por Forma de Pago',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${filterLabel}`,
      tables: [
        {
          headers: ['Método', 'Cuenta', 'Centro', 'Fecha', 'Monto Pagado', 'Total Cuenta', 'Referencia'],
          rows: details.map((p) => [
            { value: getMethodLabel(p.method) },
            { value: p.check_number || '-' },
            { value: p.center_name || '-' },
            { value: p.created_at ? new Date(p.created_at).toLocaleDateString('es-GT') : '-' },
            { value: fmt(p.amount), type: 'money' },
            { value: fmt(p.account_total), type: 'money' },
            { value: p.reference_no || '-' },
          ]),
          grandTotals: [
            { value: 'TOTAL GENERAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: fmt(grandTotal), type: 'money' },
            { value: '' },
            { value: '' },
          ],
        },
      ],
    });
    toast.success('Reporte PDF generado');
  };

  return (
    <ReportLayout
      title="Ventas por Forma de Pago"
      badge="FINANZAS & ARQUEO"
      badgeColor="bg-emerald-50 text-emerald-800 border-emerald-200"
      subtitle="Conciliación de ingresos, desglose de efectivo, tarjetas, transferencias y pagos por cuenta"
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
          <div className="relative">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
              Método
            </span>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="">Todas las formas</option>
              {paymentMethods.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
              Buscar en detalle
            </span>
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cuenta #, voucher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none w-44 focus:bg-white focus:border-blue-400 transition-colors"
              />
            </div>
          </div>
        </div>
      }
    >
      {/* ─────────────────────────────────────────────────────────── */}
      {/* TARJETAS RESUMEN DE MÉTODOS DE PAGO CON BARRAS DE PROGRESO */}
      {/* ─────────────────────────────────────────────────────────── */}
      {data?.methods && data.methods.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>Distribución de Ingresos por Medio de Cobro</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Proporción porcentual y totalización de cobros registrados
              </p>
            </div>
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {data.methods.length} Métodos Activos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.methods.map((m) => {
              const meta = getMethodBadge(m.method);
              const Icon = meta.icon;
              const amt = Number(m.total_amount || 0);
              const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : '0.0';

              return (
                <div
                  key={m.method}
                  onClick={() => setFilterMethod(filterMethod === m.method ? '' : m.method)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    filterMethod === m.method
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-2xs ${meta.bg}`}>
                        <Icon className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 text-xs">
                          {getMethodLabel(m.method)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          {m.transaction_count} pago{m.transaction_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        {fmt(amt)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${meta.barBg}`}
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
      {/* TABLA DE AUDITORÍA DETALLADA DE TRANSACCIONES */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <NotebookMinimalIcon className="w-4 h-4 text-blue-600" />
              <span>Detalle de Cobros & Cuentas</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {filteredDetails.length} registros encontrados {filterMethod ? `(Filtrado por: ${getMethodLabel(filterMethod)})` : ''}
            </p>
          </div>
          {filterMethod && (
            <button
              type="button"
              onClick={() => setFilterMethod('')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Mostrar todas las formas
            </button>
          )}
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Método de Pago</th>
                <th className="px-4 py-3">Cuenta / Ticket</th>
                <th className="px-4 py-3">Centro</th>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3 text-right">Monto Pagado</th>
                <th className="px-4 py-3 text-right">Total Cuenta</th>
                <th className="px-4 py-3">Referencia / Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredDetails.map((p, idx) => {
                const meta = getMethodBadge(p.method);
                const Icon = meta.icon;
                return (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border shadow-2xs ${meta.bg}`}>
                          <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                        </div>
                        <span className="font-bold text-slate-800 text-xs">
                          {getMethodLabel(p.method)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <NotebookMinimalIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          #{p.check_number || '-'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                      {p.center_name || '-'}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleString('es-GT', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '-'}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono font-black text-emerald-700 text-xs">
                      {fmt(p.amount)}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono font-semibold text-slate-500 text-xs">
                      {fmt(p.account_total)}
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {p.reference_no || '-'}
                    </td>
                  </tr>
                );
              })}

              {filteredDetails.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="font-bold text-slate-600 text-xs">
                        No se encontraron registros de cobro
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Prueba ajustando el rango de fechas o los filtros seleccionados
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredDetails.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-black text-xs">
                <tr>
                  <td colSpan={4} className="px-4 py-3 uppercase tracking-wider text-[11px]">
                    Total Recaudado en Selección
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 text-sm">
                    {fmt(filteredDetails.reduce((a, b) => a + Number(b.amount || 0), 0))}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-right text-slate-400 font-normal text-[11px]">
                    {filteredDetails.length} transacciones
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </ReportLayout>
  );
}

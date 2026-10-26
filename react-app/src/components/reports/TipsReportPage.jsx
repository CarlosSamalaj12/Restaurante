// react-app/src/components/reports/TipsReportPage.jsx
// Reporte de Propinas con diseño uniforme POS v3.4

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
  Users,
  Printer,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  FileText,
  Search,
  Percent,
  Check
} from 'lucide-react';

export function TipsReportPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [data, setData] = useState(null);
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date();
  firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [filterWaiterId, setFilterWaiterId] = useState('');
  const [filterCenterId, setFilterCenterId] = useState('');
  const [searchTable, setSearchTable] = useState('');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const boot = await api.bootstrap();
      setCenters(boot.centers || []);
      setWaiters(boot.waiters || []);
      // Carga inicial automática
      handleSearch();
    } catch (e) {
      console.error('Error loading filters:', e);
    }
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecciona rango de fechas');
      return;
    }
    setLoading(true);
    try {
      const result = await api.getWaiterTips({
        startDate,
        endDate,
        waiterId: filterWaiterId || undefined,
        centerId: filterCenterId || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(error.message || 'Error al cargar reporte de propinas');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;

  // Cálculos de KPIs
  const grandTips = useMemo(() => {
    return data?.summary?.reduce((a, b) => a + Number(b.totalTips || 0), 0) || 0;
  }, [data]);

  const grandTotal = useMemo(() => {
    return data?.summary?.reduce((a, b) => a + Number(b.totalGeneral || 0), 0) || 0;
  }, [data]);

  const grandEligible = useMemo(() => {
    return data?.summary?.reduce((a, b) => a + Number(b.eligibleCount || 0), 0) || 0;
  }, [data]);

  const totalAccounts = data?.details?.length || 0;
  const tipRatio = totalAccounts > 0 ? ((grandEligible / totalAccounts) * 100).toFixed(1) + '%' : '0.0%';

  const kpis = [
    {
      label: 'Total Propinas Recaudadas',
      value: fmt(grandTips),
      subtext: 'Fondo de reparto activo',
      subtextColor: 'text-emerald-700 font-bold',
      icon: Coins,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    },
    {
      label: 'Cuentas con Propina',
      value: `${grandEligible} / ${totalAccounts}`,
      subtext: `${tipRatio} efectividad`,
      subtextColor: 'text-blue-700 font-semibold',
      icon: CheckCircle,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    },
    {
      label: 'Ventas Totales Base',
      value: fmt(grandTotal),
      subtext: 'Facturado en el periodo',
      subtextColor: 'text-slate-500',
      icon: NotebookMinimalIcon,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    },
    {
      label: 'Configuración Sugerida',
      value: `${data?.globalTipPercent || 10}%`,
      subtext: 'Porcentaje estándar',
      subtextColor: 'text-slate-500',
      icon: Percent,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
    },
  ];

  // Impresión térmica 80mm
  const handlePrintThermal = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(filterCenterId))?.name || 'Todos los centros';
    const content = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Resumen de Propinas</title>
          <style>
            body { font-family: monospace; width: 78mm; margin: 0 auto; font-size: 11px; }
            .center { text-align: center; }
            .sep { border-top: 1px dashed #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3>REPORTE DE PROPINAS</h3>
            <div>${centerName}</div>
            <div>${startDate} al ${endDate}</div>
          </div>
          <div class="sep"></div>
          ${data.summary.map(s => `
            <div class="row">
              <span class="bold">${s.waiterName}:</span>
              <span>${fmt(s.totalTips)}</span>
            </div>
            <div style="font-size:9px;color:#555;">Cuentas: ${s.eligibleCount}/${s.accountCount} | Total: ${fmt(s.totalGeneral)}</div>
          `).join('')}
          <div class="sep"></div>
          <div class="row bold" style="font-size:13px;">
            <span>TOTAL PROPINAS:</span>
            <span>${fmt(grandTips)}</span>
          </div>
          <script>window.print();window.close();<\/script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(content);
      win.document.close();
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(filterCenterId))?.name || 'Todos los centros';
    const waiterName = waiters.find(w => w.id === Number(filterWaiterId))?.full_name || 'Todos los meseros';

    exportToExcel({
      sheets: [{
        name: 'Propinas',
        title: 'SamaPos - Reporte de Propinas',
        subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName} | Mesero: ${waiterName}`,
        headers: [
          { label: 'Mesero', width: 20 },
          { label: 'Centro', width: 16 },
          { label: 'Cuentas', width: 12 },
          { label: 'Con Prop.', width: 12 },
          { label: 'Subtotal', width: 14 },
          { label: 'Descuentos', width: 14 },
          { label: 'Propinas', width: 14 },
          { label: 'Total General', width: 16 },
        ],
        rows: data.summary.map(s => [
          s.waiterName,
          s.centerName,
          Number(s.accountCount || 0),
          `${s.eligibleCount}/${s.accountCount}`,
          Number(s.totalSubtotal || 0),
          Number(s.totalDiscounts || 0),
          Number(s.totalTips || 0),
          Number(s.totalGeneral || 0),
        ]),
      }],
      filename: `Reporte_Propinas_${startDate}_${endDate}.xlsx`
    });
  };

  const handleExportPDF = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(filterCenterId))?.name || 'Todos los centros';
    const waiterName = waiters.find(w => w.id === Number(filterWaiterId))?.full_name || 'Todos los meseros';

    exportToPDF({
      title: 'Reporte de Propinas',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName} | Mesero: ${waiterName}`,
      columns: ['Mesero', 'Centro', 'Cuentas', 'Con Prop.', 'Subtotal', 'Propinas', 'Total'],
      rows: data.summary.map(s => [
        s.waiterName,
        s.centerName,
        s.accountCount,
        `${s.eligibleCount}/${s.accountCount}`,
        fmt(s.totalSubtotal),
        fmt(s.totalTips),
        fmt(s.totalGeneral),
      ]),
      filename: `Reporte_Propinas_${startDate}_${endDate}.pdf`
    });
  };

  // Filtrado en tabla de detalles
  const filteredDetails = useMemo(() => {
    if (!data?.details) return [];
    if (!searchTable.trim()) return data.details;
    const q = searchTable.toLowerCase().trim();
    return data.details.filter(d =>
      (d.waiterName || '').toLowerCase().includes(q) ||
      (d.checkNumber || '').toLowerCase().includes(q) ||
      (d.centerName || '').toLowerCase().includes(q)
    );
  }, [data, searchTable]);

  return (
    <ReportLayout
      title="Reporte de Propinas"
      badge="FINANZAS"
      badgeColor="bg-emerald-50 text-emerald-800 border-emerald-200"
      subtitle="Distribución equitativa por mesero, cocina y métodos POS / Tarjetas"
      onBack={onBack}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      onRefresh={handleSearch}
      loading={loading}
      centers={centers}
      selectedCenter={filterCenterId}
      setSelectedCenter={setFilterCenterId}
      kpis={kpis}
      onPrintThermal={handlePrintThermal}
      onExportExcel={handleExportExcel}
      onExportPdf={handleExportPDF}
      extraFilters={
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de Mesero */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-500">Mesero:</span>
            <select
              value={filterWaiterId}
              onChange={(e) => setFilterWaiterId(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="">Todos los Meseros</option>
              {waiters.map(w => (
                <option key={w.id} value={w.id}>{w.full_name}</option>
              ))}
            </select>
          </div>

          {/* Buscador de comanda */}
          <div className="relative w-full sm:max-w-xs ml-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              placeholder="Buscar comanda o mesero..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white"
            />
          </div>
        </div>
      }
    >
      {/* 1. Tabla Resumen por Mesero */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs space-y-0">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Resumen Consolidado por Mesero
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Regla global: {data?.globalTipPercent || 10}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="px-4 py-3">Mesero</th>
                <th className="px-4 py-3">Centro</th>
                <th className="px-4 py-3 text-center">Cuentas</th>
                <th className="px-4 py-3 text-center">Con Propina</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Descuentos</th>
                <th className="px-4 py-3 text-right">Total Propinas</th>
                <th className="px-4 py-3 text-right">Total General</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.summary?.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{s.waiterName}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{s.centerName}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{s.accountCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.eligibleCount === s.accountCount
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {s.eligibleCount} / {s.accountCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{fmt(s.totalSubtotal)}</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-600 font-semibold">{fmt(s.totalDiscounts)}</td>
                  <td className="px-4 py-3 text-right font-mono font-black text-emerald-700 text-sm">{fmt(s.totalTips)}</td>
                  <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 text-sm">{fmt(s.totalGeneral)}</td>
                </tr>
              ))}
              {(!data?.summary || data.summary.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No hay propinas registradas con los filtros actuales
                  </td>
                </tr>
              )}
            </tbody>
            {data?.summary && data.summary.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-200">
                  <td colSpan={2} className="px-4 py-3">TOTALES CONSOLIDADOS</td>
                  <td className="px-4 py-3 text-center font-mono">{totalAccounts}</td>
                  <td className="px-4 py-3 text-center font-mono">{grandEligible} / {totalAccounts}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(data.summary.reduce((a, b) => a + Number(b.totalSubtotal || 0), 0))}</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-600">{fmt(data.summary.reduce((a, b) => a + Number(b.totalDiscounts || 0), 0))}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700 text-sm">{fmt(grandTips)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900 text-sm">{fmt(grandTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 2. Tabla Detallada por Comanda */}
      {data?.details && data.details.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs space-y-0">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <NotebookMinimalIcon className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Auditoría por Comanda ({filteredDetails.length})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10">
                  <th className="px-4 py-2.5">Mesero</th>
                  <th className="px-4 py-2.5">Centro</th>
                  <th className="px-4 py-2.5 text-center">Comanda</th>
                  <th className="px-4 py-2.5 text-center">Método</th>
                  <th className="px-4 py-2.5 text-center">Propina Aplicada</th>
                  <th className="px-4 py-2.5 text-right">Subtotal</th>
                  <th className="px-4 py-2.5 text-right">Desc.</th>
                  <th className="px-4 py-2.5 text-center">%</th>
                  <th className="px-4 py-2.5 text-right">Propina</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDetails.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{d.waiterName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{d.centerName}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-800">
                      {d.checkNumber}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-slate-600 uppercase text-[10px]">
                      {(d.paymentMethods || []).join(', ') || 'EFECTIVO'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {d.tipEligible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Sí</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          <span>Excluida</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600">{fmt(d.subtotal)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-rose-600">{fmt(d.discountTotal)}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-slate-600">{d.tipPercent}%</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${d.tipEligible ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {fmt(d.tipAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{fmt(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportLayout>
  );
}

export default TipsReportPage;

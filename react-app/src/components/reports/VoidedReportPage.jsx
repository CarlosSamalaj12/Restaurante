// react-app/src/components/reports/VoidedReportPage.jsx
// Reporte de Anulaciones y Devoluciones con diseño uniforme POS v3.4

import { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import { ReportLayout } from './ReportLayout';
import { NotebookMinimalIcon } from '../icons/CustomIcons';
import {
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle,
  XCircle,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  Loader2
} from 'lucide-react';

export function VoidedReportPage({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [voidedItems, setVoidedItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const toast = useToast();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    api.bootstrap().then((b) => {
      setCenters(b.centers || []);
    }).catch(() => {});
    loadVoidedItems();
  }, []);

  const loadVoidedItems = async () => {
    setLoading(true);
    try {
      const data = await api.getVoidedItems();
      setVoidedItems(data || []);
    } catch (error) {
      toast.error('Error al cargar reporte de anulaciones');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q ${Number(n || 0).toFixed(2)}`;

  // Filtrado por fecha y término de búsqueda
  const filteredItems = useMemo(() => {
    return voidedItems.filter((it) => {
      if (startDate && it.voided_at) {
        const itemDate = it.voided_at.split('T')[0];
        if (itemDate < startDate) return false;
      }
      if (endDate && it.voided_at) {
        const itemDate = it.voided_at.split('T')[0];
        if (itemDate > endDate) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (it.product_name || '').toLowerCase();
        const reason = (it.void_reason || '').toLowerCase();
        const check = (it.check_number || '').toLowerCase();
        const auth = (it.authorized_by_name || '').toLowerCase();
        return pName.includes(q) || reason.includes(q) || check.includes(q) || auth.includes(q);
      }
      return true;
    });
  }, [voidedItems, startDate, endDate, searchQuery]);

  // Cálculos de KPIs
  const totalVoidAmount = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + Number(it.void_total || 0), 0);
  }, [filteredItems]);

  const uniqueChecks = useMemo(() => {
    const checks = new Set(filteredItems.map(it => it.check_number || it.account_id).filter(Boolean));
    return checks.size;
  }, [filteredItems]);

  const kpis = [
    {
      label: 'Platillos Anulados',
      value: `${filteredItems.length} registros`,
      subtext: 'Eventos de anulación',
      subtextColor: 'text-rose-600',
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
    },
    {
      label: 'Monto Total Anulado',
      value: fmt(totalVoidAmount),
      subtext: 'Impacto económico',
      subtextColor: 'text-amber-800 font-bold',
      icon: NotebookMinimalIcon,
      iconBg: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    {
      label: 'Cuentas Afectadas',
      value: `${uniqueChecks} comandas`,
      subtext: 'Tickets con reversión',
      subtextColor: 'text-slate-500',
      icon: Tag,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    },
    {
      label: 'Auditoría Supervisada',
      value: '100% con PIN',
      subtext: 'Seguridad en reversiones',
      subtextColor: 'text-emerald-700 font-bold',
      icon: UserCheck,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    },
  ];

  // Impresión térmica individual (80mm)
  const handlePrintItem = (item) => {
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Reversión #${item.id}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", monospace; width: 72mm; margin: 0 auto; font-size: 11px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .sep { border-top: 1.5px dashed #000; margin: 5px 0; }
            .title { font-size: 14px; font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">REVERSIÓN / ANULACIÓN</div>
            <div class="bold">COMPROBANTE DE AUDITORÍA</div>
          </div>
          <div class="sep"></div>
          <div><strong>Producto:</strong> ${item.product_name}</div>
          <div><strong>Monto Anulado:</strong> ${fmt(item.void_total)}</div>
          <div><strong>Motivo:</strong> ${item.void_reason || 'Sin especificar'}</div>
          <div><strong>Fecha / Hora:</strong> ${item.voided_at ? new Date(item.voided_at).toLocaleString('es-GT') : '-'}</div>
          <div><strong>Comanda:</strong> #${item.check_number || item.id}</div>
          <div><strong>Autorizó (PIN):</strong> ${item.authorized_by_name || 'Supervisor'}</div>
          <div class="sep"></div>
          <p class="center" style="margin-top:20px;">Firma Auditor / Supervisor: ____________________</p>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(content);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }
  };

  // Impresión térmica de todo el resumen
  const handlePrintThermalSummary = () => {
    const content = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Resumen de Anulaciones</title>
          <style>
            body { font-family: monospace; width: 78mm; margin: 0 auto; font-size: 11px; }
            .center { text-align: center; }
            .sep { border-top: 1.5px dashed #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3>REPORTE DE ANULACIONES</h3>
            <div>Del ${startDate} al ${endDate}</div>
          </div>
          <div class="sep"></div>
          ${filteredItems.map(it => `
            <div class="row">
              <span>${it.product_name}</span>
              <span class="bold">${fmt(it.void_total)}</span>
            </div>
            <div style="font-size:9px;color:#444;">Motivo: ${it.void_reason || '-'} | Aut: ${it.authorized_by_name || '-'}</div>
          `).join('')}
          <div class="sep"></div>
          <div class="row bold" style="font-size:13px;">
            <span>TOTAL ANULADO:</span>
            <span>${fmt(totalVoidAmount)}</span>
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

  // Exportar Excel
  const handleExportExcel = () => {
    if (!filteredItems.length) return;
    exportToExcel({
      sheets: [{
        name: 'Anulaciones',
        title: 'Reporte de Anulaciones y Devoluciones',
        subtitle: `Del ${startDate} al ${endDate} | Total: ${fmt(totalVoidAmount)}`,
        headers: [
          { label: 'Fecha / Hora', width: 20 },
          { label: 'Comanda #', width: 14 },
          { label: 'Producto Anulado', width: 26 },
          { label: 'Total Anulado', width: 16 },
          { label: 'Motivo', width: 28 },
          { label: 'Autorizó (Supervisor)', width: 22 },
        ],
        rows: filteredItems.map(it => [
          it.voided_at ? new Date(it.voided_at).toLocaleString('es-GT') : '',
          it.check_number || `#${it.id}`,
          it.product_name,
          Number(it.void_total || 0),
          it.void_reason || 'Sin motivo',
          it.authorized_by_name || 'N/A',
        ]),
      }],
      filename: `Reporte_Anulaciones_${startDate}_${endDate}.xlsx`
    });
  };

  // Exportar PDF
  const handleExportPdf = () => {
    if (!filteredItems.length) return;
    exportToPDF({
      title: 'Reporte de Anulaciones y Devoluciones',
      subtitle: `Rango: ${startDate} al ${endDate} • Impacto: ${fmt(totalVoidAmount)}`,
      columns: ['Fecha', 'Comanda', 'Producto', 'Total', 'Motivo', 'Autorizó'],
      rows: filteredItems.map(it => [
        it.voided_at ? new Date(it.voided_at).toLocaleDateString('es-GT') : '',
        it.check_number || `#${it.id}`,
        it.product_name,
        fmt(it.void_total),
        it.void_reason || '-',
        it.authorized_by_name || '-',
      ]),
      filename: `Reporte_Anulaciones_${startDate}_${endDate}.pdf`
    });
  };

  return (
    <ReportLayout
      title="Reporte de Anulaciones y Devoluciones"
      badge="AUDITORÍA CRÍTICA"
      badgeColor="bg-amber-50 text-amber-800 border-amber-200"
      subtitle="Registro pormenorizado de platillos anulados, mermas de cocina y reversiones con PIN"
      onBack={onBack}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      onRefresh={loadVoidedItems}
      loading={loading}
      centers={centers}
      selectedCenter={selectedCenter}
      setSelectedCenter={setSelectedCenter}
      kpis={kpis}
      onPrintThermal={handlePrintThermalSummary}
      onExportExcel={handleExportExcel}
      onExportPdf={handleExportPdf}
      extraFilters={
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por producto, comanda, motivo o supervisor..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 outline-none transition-all"
          />
        </div>
      }
    >
      {/* Tabla de Resultados */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Registros de Auditoría ({filteredItems.length})
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Toca una fila para ver el desglose de productos de la comanda
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs font-semibold">Cargando registros de anulaciones...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <NotebookMinimalIcon className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-700">No se encontraron anulaciones en este rango</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Comanda</th>
                  <th className="px-4 py-3">Platillo Anulado</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3">Autorizó (Supervisor)</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, i) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(isSelected ? null : item.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-rose-50/70 border-l-4 border-rose-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {item.voided_at
                              ? new Date(item.voided_at).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })
                              : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.check_number || `#${item.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-rose-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>{item.product_name}</span>
                          </div>
                          {item.void_reason && (
                            <p className="text-[11px] text-slate-500 italic max-w-sm truncate">
                              Motivo: {item.void_reason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-rose-600 text-sm whitespace-nowrap">
                        {fmt(item.void_total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.authorized_by_name || 'Supervisor'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintItem(item);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title="Imprimir comprobante individual de anulación"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}

export default VoidedReportPage;

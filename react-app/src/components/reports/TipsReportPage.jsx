import { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import {
  ArrowLeft,
  Loader2,
  Receipt,
  Printer,
  FileText,
  CheckCircle,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

export function TipsReportPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [data, setData] = useState(null);
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [filterWaiterId, setFilterWaiterId] = useState('');
  const [filterCenterId, setFilterCenterId] = useState('');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const boot = await api.bootstrap();
      setCenters(boot.centers || []);
      setWaiters(boot.waiters || []);
    } catch (e) {
      console.error('Error loading filters:', e);
    }
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) { toast.error('Selecciona rango de fechas'); return; }
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
      toast.error(error.message || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n, dec = 2) => Number(n || 0).toFixed(dec);
  const formatMoney = (n) => fmt(n);
  const formatQ = (n) => fmt(n);

  const handleExportExcel = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(filterCenterId))?.name || 'Todos los centros';
    const waiterName = waiters.find(w => w.id === Number(filterWaiterId))?.full_name || 'Todos los meseros';
    const grandTips = data.summary.reduce((a, b) => a + b.totalTips, 0);
    const grandTotal = data.summary.reduce((a, b) => a + b.totalGeneral, 0);
    const grandEligible = data.summary.reduce((a, b) => a + b.eligibleCount, 0);

    exportToExcel({
      sheets: [{
        name: 'Propinas',
        title: 'SamaPos - Reporte de Propinas',
        subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName} | Mesero: ${waiterName}`,
        headers: [
          { label: 'Mesero', width: 18 },
          { label: 'Centro', width: 14 },
          { label: 'Cuentas', width: 9, type: 'center' },
          { label: 'Con Prop.', width: 10, type: 'center' },
          { label: 'Subtotal', width: 12, type: 'money' },
          { label: 'Descuentos', width: 12, type: 'money' },
          { label: 'Propinas', width: 12, type: 'money' },
          { label: 'Total General', width: 13, type: 'money' },
        ],
        rows: data.summary.map(s => [
          { value: s.waiterName, type: 'bold' },
          { value: s.centerName },
          { value: Number(s.accountCount || 0), type: 'center' },
          { value: `${Number(s.eligibleCount || 0)}/${Number(s.accountCount || 0)}`, type: 'center' },
          { value: parseFloat(Number(s.totalSubtotal || 0).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(s.totalDiscounts || 0).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(s.totalTips || 0).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(s.totalGeneral || 0).toFixed(2)), type: 'money' },
        ]),
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: data.details.length, type: 'boldCenter' },
          { value: `${grandEligible}/${data.details.length}`, type: 'boldCenter' },
          { value: parseFloat(Number(data.summary.reduce((a, b) => a + (b.totalSubtotal || 0), 0)).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(data.summary.reduce((a, b) => a + (b.totalDiscounts || 0), 0)).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(grandTips).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(grandTotal).toFixed(2)), type: 'money' },
        ],
      }],
    });
  };

  const handleExportPDF = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(filterCenterId))?.name || 'Todos los centros';
    const waiterName = waiters.find(w => w.id === Number(filterWaiterId))?.full_name || 'Todos los meseros';
    const grandTips = data.summary.reduce((a, b) => a + b.totalTips, 0);
    const grandTotal = data.summary.reduce((a, b) => a + b.totalGeneral, 0);
    const grandEligible = data.summary.reduce((a, b) => a + b.eligibleCount, 0);

    exportToPDF({
      title: 'Reporte de Propinas',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName} | Mesero: ${waiterName}`,
      tables: [
        {
          sectionTitle: 'Resumen por Mesero',
          headers: ['Mesero', 'Centro', 'Cuentas', 'Con Prop.', 'Subtotal', 'Descuentos', 'Propinas', 'Total General'],
          rows: data.summary.map(s => [
            { value: s.waiterName, type: 'bold' },
            { value: s.centerName },
            { value: s.accountCount, type: 'center' },
            { value: `${s.eligibleCount}/${s.accountCount}`, type: 'center' },
            { value: `Q${formatQ(s.totalSubtotal)}`, type: 'money' },
            { value: `Q${formatQ(s.totalDiscounts)}`, type: 'money' },
            { value: `Q${formatQ(s.totalTips)}`, type: 'money' },
            { value: `Q${formatQ(s.totalGeneral)}`, type: 'money' },
          ]),
          totals: [
            { value: 'TOTALES', type: 'bold' },
            { value: '' },
            { value: data.details.length, type: 'center' },
            { value: grandEligible, type: 'center' },
            { value: `Q${formatQ(data.summary.reduce((a, b) => a + b.totalSubtotal, 0))}`, type: 'money' },
            { value: `Q${formatQ(data.summary.reduce((a, b) => a + b.totalDiscounts, 0))}`, type: 'money' },
            { value: `Q${grandTips.toFixed(2)}`, type: 'money' },
            { value: `Q${grandTotal.toFixed(2)}`, type: 'money' },
          ],
        },
        {
          sectionTitle: 'Detalle por Cuenta',
          headers: ['Mesero', 'Centro', '# Cuenta', 'Método', 'Prop.', 'Subtotal', 'Desc.', '%', 'Propina', 'Total'],
          rows: data.details.map(d => [
            { value: d.waiterName },
            { value: d.centerName },
            { value: d.checkNumber, type: 'center' },
            { value: (d.paymentMethods || []).join('/ ').toUpperCase(), type: 'center' },
            { value: d.tipEligible ? '✓' : '✗', type: 'center' },
            { value: `Q${formatQ(d.subtotal)}`, type: 'money' },
            { value: `Q${formatQ(d.discountTotal)}`, type: 'money' },
            { value: `${d.tipPercent}%`, type: 'center' },
            { value: `Q${formatQ(d.tipAmount)}`, type: 'money' },
            { value: `Q${formatQ(d.total)}`, type: 'money' },
          ]),
        },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Propinas</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-3">Filtros</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha inicio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha fin</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mesero</label>
              <select value={filterWaiterId} onChange={e => setFilterWaiterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos</option>
                {waiters.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Centro</label>
              <select value={filterCenterId} onChange={e => setFilterCenterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>

        {/* Resultados */}
        {data && (
          <div className="space-y-4">
            {/* Botones de acción */}
            <div className="flex gap-2">
              <button onClick={handleExportPDF}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors">
                <Printer className="w-4 h-4" /> PDF
              </button>
              <button onClick={handleExportExcel}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
            </div>

            {/* Resumen por mesero */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                <h3 className="text-white font-semibold text-sm">Resumen por Mesero</h3>
                <p className="text-blue-200 text-xs mt-0.5">Configuración global de propina: {data.globalTipPercent}% | Métodos excluidos: {(data.excludedMethods||[]).join(', ').toUpperCase() || 'ninguno'}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs">
                      <th className="text-left px-4 py-3">Mesero</th>
                      <th className="text-left px-4 py-3">Centro</th>
                      <th className="text-center px-4 py-3">Cuentas</th>
                      <th className="text-center px-4 py-3">Con Prop.</th>
                      <th className="text-right px-4 py-3">Subtotal</th>
                      <th className="text-right px-4 py-3">Desc.</th>
                      <th className="text-right px-4 py-3">Propinas</th>
                      <th className="text-right px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary.map((s, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.waiterName}</td>
                        <td className="px-4 py-3 text-gray-600">{s.centerName}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{s.accountCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.eligibleCount === s.accountCount ? 'bg-green-100 text-green-700' : s.eligibleCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {s.eligibleCount}/{s.accountCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatMoney(s.totalSubtotal)}</td>
                        <td className="px-4 py-3 text-right text-red-500">{formatMoney(s.totalDiscounts)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatMoney(s.totalTips)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(s.totalGeneral)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold text-sm">
                      <td colSpan={2} className="px-4 py-3 text-gray-900">TOTALES</td>
                      <td className="px-4 py-3 text-center text-gray-900">{data.details.length}</td>
                      <td className="px-4 py-3 text-center text-gray-900">{data.summary.reduce((a, b) => a + b.eligibleCount, 0)}/{data.details.length}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatMoney(data.summary.reduce((a, b) => a + b.totalSubtotal, 0))}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatMoney(data.summary.reduce((a, b) => a + b.totalDiscounts, 0))}</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatMoney(data.summary.reduce((a, b) => a + b.totalTips, 0))}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatMoney(data.summary.reduce((a, b) => a + b.totalGeneral, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Detalle por cuenta */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3">
                <h3 className="text-white font-semibold text-sm">Detalle por Cuenta</h3>
                <p className="text-gray-400 text-xs mt-0.5">{data.details.length} cuentas en total</p>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs sticky top-0">
                      <th className="text-left px-4 py-3">Mesero</th>
                      <th className="text-left px-4 py-3">Centro</th>
                      <th className="text-center px-4 py-3">#</th>
                      <th className="text-center px-4 py-3">Método</th>
                      <th className="text-center px-4 py-3">Prop.</th>
                      <th className="text-right px-4 py-3">Subtotal</th>
                      <th className="text-right px-4 py-3">Desc.</th>
                      <th className="text-center px-4 py-3">%</th>
                      <th className="text-right px-4 py-3">Propina</th>
                      <th className="text-right px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.details.map((d, i) => (
                      <tr key={i} className={`border-t border-gray-100 ${d.tipEligible ? 'hover:bg-green-50' : 'bg-red-50 hover:bg-red-100'}`}>
                        <td className="px-4 py-2.5 text-gray-900">{d.waiterName}</td>
                        <td className="px-4 py-2.5 text-gray-600">{d.centerName}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-gray-600">{d.checkNumber}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs font-mono text-gray-500">{(d.paymentMethods||[]).join(', ').toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {d.tipEligible
                            ? <CheckCircle className="w-4 h-4 text-green-600 inline" />
                            : <XCircle className="w-4 h-4 text-red-500 inline" />
                          }
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{formatMoney(d.subtotal)}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">{formatMoney(d.discountTotal)}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{d.tipPercent}%</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${d.tipEligible ? 'text-green-600' : 'text-red-400'}`}>{formatMoney(d.tipAmount)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatMoney(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!data && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona filtros y genera el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import {
  ArrowLeft,
  Loader2,
  Printer,
  Search,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';

export function PaymentMethodReportPage({ onBack }) {
  const [centers, setCenters] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filterMethod, setFilterMethod] = useState('');
  const [expandedMethod, setExpandedMethod] = useState(null);
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');

  useEffect(() => {
    api.bootstrap().then(boot => {
      setCenters(boot.centers || []);
      setPaymentMethods(boot.paymentMethods || []);
    }).catch(() => {});
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setExpandedMethod(null);
    try {
      const result = await api.getSalesByPaymentMethod({
        startDate,
        endDate,
        centerId: centerId || undefined,
        method: filterMethod || undefined,
      });
      setData(result);
      if (!result.payment_details?.length && !result.methods?.length) toast.error('Sin resultados');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;

  const getMethodIcon = (method) => {
    const key = String(method || '').toLowerCase();
    if (key === 'cash') return '💵';
    if (key === 'card') return '💳';
    if (key === 'transfer') return '🏦';
    return '💰';
  };

  const getMethodLabel = (code) => {
    const found = paymentMethods.find(m => m.code === code);
    return found ? found.label : String(code || '').toUpperCase();
  };

  const handleExportExcel = () => {
    const details = data?.payment_details || [];
    if (!details.length && !data?.methods?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const filterLabel = filterMethod ? ` | Filtro: ${getMethodLabel(filterMethod)}` : '';
    exportToExcel({
      sheets: [{
        name: 'FormaPago',
        title: 'SamaPos - Ventas por Forma de Pago',
        subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${filterLabel}`,
        headers: [
          { label: 'Método', width: 18 },
          { label: 'Cuenta', width: 14 },
          { label: 'Centro', width: 14 },
          { label: 'Fecha', width: 18 },
          { label: 'Monto', width: 14, type: 'money' },
          { label: 'Total Cuenta', width: 14, type: 'money' },
          { label: 'Referencia', width: 16 },
        ],
        rows: details.map(p => [
          { value: getMethodLabel(p.method) },
          { value: p.check_number },
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
          { value: parseFloat(Number(data.grand_total || 0).toFixed(2)), type: 'money' },
          { value: '' },
          { value: '' },
        ],
      }],
    });
  };

  const handleExportPDF = () => {
    const details = data?.payment_details || [];
    if (!details.length && !data?.methods?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const filterLabel = filterMethod ? ` | Filtro: ${getMethodLabel(filterMethod)}` : '';
    exportToPDF({
      title: 'Ventas por Forma de Pago',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${filterLabel}`,
      tables: [{
        headers: ['Método', 'Cuenta', 'Centro', 'Fecha', 'Monto', 'Total Cuenta'],
        rows: details.map(p => [
          { value: getMethodLabel(p.method) },
          { value: p.check_number },
          { value: p.center_name || '-' },
          { value: p.created_at ? new Date(p.created_at).toLocaleString('es-GT') : '-' },
          { value: fmt(p.amount), type: 'money' },
          { value: fmt(p.account_total), type: 'money' },
        ]),
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: '' },
          { value: '' },
          { value: fmt(data.grand_total), type: 'money' },
          { value: '' },
        ],
      }],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Forma de Pago</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Centro</label>
              <select value={centerId} onChange={e => setCenterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Forma de Pago</label>
              <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todas</option>
                {paymentMethods.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>

        {data && (
          <>
            {/* Resumen */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {filterMethod ? getMethodLabel(filterMethod) : 'Resumen por Forma de Pago'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Total recaudo: <span className="font-bold text-gray-800">{fmt(data.grand_total)}</span>
                    {data.methods.length > 0 && !filterMethod && (
                      <span className="ml-2 text-gray-400">· {data.methods.length} método{data.methods.length !== 1 ? 's' : ''}</span>
                    )}
                    {data.payment_details?.length > 0 && (
                      <span className="ml-2 text-gray-400">· {data.payment_details.length} pago{data.payment_details.length !== 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-red-100">
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-emerald-100">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </div>

              {/* Resumen por método */}
              {!filterMethod && data.methods.length > 0 && (
                <div>
                  <div className="divide-y divide-gray-100">
                    {data.methods.map((m, i) => {
                      const pct = ((Number(m.total_amount || 0) / Number(data.grand_total || 1)) * 100).toFixed(1);
                      return (
                        <div key={m.method} onClick={() => setExpandedMethod(expandedMethod === m.method ? null : m.method)}
                          className={`px-4 py-3 cursor-pointer transition-colors ${expandedMethod === m.method ? 'bg-purple-50' : i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getMethodIcon(m.method)}</span>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{getMethodLabel(m.method)}</p>
                                <p className="text-xs text-gray-500">{Number(m.transaction_count || 0)} pago{Number(m.transaction_count || 0) !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{fmt(m.total_amount)}</p>
                              <p className={`text-xs font-medium ${Number(pct) >= 40 ? 'text-green-600' : Number(pct) >= 20 ? 'text-blue-600' : 'text-gray-500'}`}>{pct}%</p>
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between rounded-b-xl">
                    <span className="font-bold text-sm">TOTAL RECAUDADO</span>
                    <span className="font-bold text-sm">{fmt(data.grand_total)}</span>
                  </div>
                </div>
              )}

              {/* Detalle de pagos */}
              {data.payment_details && data.payment_details.length > 0 && (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-600 text-white text-xs sticky top-0">
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Forma de Pago</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Cuenta</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Centro</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Fecha</th>
                        <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Monto Pagado</th>
                        <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Total Cuenta</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Referencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payment_details.map((p, i) => (
                        <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50`}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{getMethodIcon(p.method)}</span>
                              <span className="font-medium text-gray-800 text-xs">{getMethodLabel(p.method)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-gray-700 text-xs">{p.check_number}</td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs">{p.center_name || '-'}</td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {p.created_at ? new Date(p.created_at).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-purple-700 text-xs">{fmt(p.amount)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{fmt(p.account_total)}</td>
                          <td className="px-3 py-2.5 text-gray-400 text-xs font-mono">{p.reference_no || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.methods.length === 0 && (!data.payment_details || data.payment_details.length === 0) && (
                <div className="text-center py-8 text-gray-400 text-sm">Sin pagos en el período seleccionado</div>
              )}
            </div>
          </>
        )}

        {!data && (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona fechas y genera el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SALES BY CENTER REPORT PAGE
// ============================================================

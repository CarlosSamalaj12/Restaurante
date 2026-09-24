import { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import {
  ArrowLeft,
  Loader2,
  Printer,
  XCircle,
  Search,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

export function SalesByCenterReportPage({ onBack }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('detail');
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');
  const [productName, setProductName] = useState('');

  // Product autocomplete
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [searchingProd, setSearchingProd] = useState(false);
  const [showProdDrop, setShowProdDrop] = useState(false);

  useEffect(() => {
    api.bootstrap().then(boot => setCenters(boot.centers || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (prodSearch.trim().length < 2) { setProdResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProd(true);
      try {
        const prods = await api.getProducts(undefined, centerId || undefined);
        const filtered = (prods || []).filter(p =>
          p.name.toLowerCase().includes(prodSearch.toLowerCase())
        ).slice(0, 20);
        setProdResults(filtered);
        if (filtered.length > 0) setShowProdDrop(true);
      } catch (_) { setProdResults([]); }
      finally { setSearchingProd(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [prodSearch, centerId]);

  const selectProduct = (p) => {
    setProductName(p.name);
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const clearProduct = () => {
    setProductName('');
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await api.getSalesByCenter({
        startDate, endDate,
        centerId: centerId || undefined,
        productName: productName || undefined,
      });
      setData(result);
      if (!result.products?.length) toast.error('Sin resultados');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;

  const centerBadge = (name) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('deck')) return 'bg-orange-100 text-orange-700';
    if (n.includes('vaquero')) return 'bg-blue-100 text-blue-700';
    if (n.includes('bar')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const handleExportExcel = () => {
    if (!data?.detail_rows?.length && !data?.products?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    exportToExcel({
      sheets: [
        // Sheet 1: Detalle completo
        {
          name: 'Detalle',
          title: 'SamaPos - Ventas por Centro (Detalle)',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
          headers: [
            { label: 'Centro', width: 16 },
            { label: 'Categoría', width: 18 },
            { label: 'Producto', width: 30 },
            { label: 'Cuenta', width: 12 },
            { label: 'Fecha', width: 14 },
            { label: 'Mesero', width: 20 },
            { label: 'Cant.', width: 8, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.detail_rows || []).map(r => [
            { value: r.center_name || '-' },
            { value: r.category_name },
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
        // Sheet 2: Resumen por producto
        {
          name: 'Resumen',
          title: 'SamaPos - Ventas por Centro (Resumen)',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
          headers: [
            { label: 'Tipo', width: 12 },
            { label: 'Producto', width: 30 },
            { label: 'Categoría', width: 18 },
            { label: 'Centro(s)', width: 20 },
            { label: 'Cantidad', width: 10, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: [
            ...(data.exclusive_products || []).map(p => [
              { value: 'EXCLUSIVO' },
              { value: p.product_name },
              { value: p.category_name },
              { value: p.centers[0]?.center_name || '-' },
              { value: Number(p.total_qty), type: 'center' },
              { value: parseFloat(Number(p.total_sales).toFixed(2)), type: 'money' },
            ]),
            ...(data.shared_products || []).map(p => [
              { value: 'COMPARTIDO' },
              { value: p.product_name },
              { value: p.category_name },
              { value: p.centers.map(c => c.center_name).join(' / ') },
              { value: Number(p.total_qty), type: 'center' },
              { value: parseFloat(Number(p.total_sales).toFixed(2)), type: 'money' },
            ]),
          ],
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 3: Cuentas unidas
        ...((data.merged_accounts || []).length > 0 ? [{
          name: 'Unidas',
          title: 'SamaPos - Cuentas Unidas',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
          headers: [
            { label: 'Centro', width: 16 },
            { label: 'Mesero', width: 20 },
            { label: 'Cuenta Original', width: 16 },
            { label: 'Fecha', width: 14 },
            { label: 'Unida a Cuenta', width: 16 },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.merged_accounts || []).map(ma => [
            { value: ma.center_name || '-' },
            { value: ma.waiter_name || '-' },
            { value: ma.check_number || `#${ma.account_id}` },
            { value: ma.closed_at ? new Date(ma.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: `#${ma.merged_into_account_id}`, type: 'bold' },
            { value: 0, type: 'money' },
          ]),
          grandTotals: [
            { value: `${(data.merged_accounts || []).length} CUENTA(S) UNIDA(S)`, type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: 0, type: 'money' },
          ],
        }] : []),
      ],
    });
  };

  const handleExportPDF = () => {
    if (!data?.detail_rows?.length && !data?.products?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    exportToPDF({
      title: 'Ventas por Centro',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
      tables: [
        {
          sectionTitle: 'Detalle de Productos Vendidos',
          headers: ['Centro', 'Categoría', 'Producto', 'Cuenta', 'Fecha', 'Cant.', 'Total'],
          rows: (data.detail_rows || []).map(r => [
            { value: r.center_name || '-' },
            { value: r.category_name },
            { value: r.product_name },
            { value: r.check_number || '-' },
            { value: r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: Number(r.qty || 0), type: 'center' },
            { value: fmt(r.line_total), type: 'money' },
          ]),
        },
        {
          sectionTitle: 'Resumen - Exclusivos',
          headers: ['Centro', 'Producto', 'Categoría', 'Cantidad', 'Total'],
          rows: (data.exclusive_products || []).flatMap(p =>
            p.centers.map(c => [
              { value: c.center_name, type: 'bold' },
              { value: p.product_name },
              { value: p.category_name },
              { value: c.qty, type: 'center' },
              { value: fmt(c.sales), type: 'money' },
            ])
          ),
        },
        {
          sectionTitle: 'Resumen - Compartidos',
          headers: ['Producto', 'Categoría', 'Centros', 'Cantidad', 'Total'],
          rows: (data.shared_products || []).map(p => [
            { value: p.product_name, type: 'bold' },
            { value: p.category_name },
            { value: p.centers.map(c => `${c.center_name} (${c.qty})`).join(', ') },
            { value: p.total_qty, type: 'center' },
            { value: fmt(p.total_sales), type: 'money' },
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
          <h1 className="font-bold text-gray-900 text-lg">Ventas por Centro</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
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
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Centro</label>
            <select value={centerId} onChange={e => setCenterId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
              <option value="">Todos los centros</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="text-xs text-gray-500 mb-1 block">Producto (opcional)</label>
            <div className="relative">
              <input
                type="text" value={prodSearch}
                onChange={e => { setProdSearch(e.target.value); if (!e.target.value) { setProductName(''); setShowProdDrop(false); } }}
                onFocus={() => { if (prodResults.length > 0) setShowProdDrop(true); }}
                onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
                placeholder="Buscar producto..."
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm pr-8" />
              {searchingProd && (
                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              )}
              {productName && (
                <button onClick={clearProduct}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                  <XCircle className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            {showProdDrop && prodResults.length > 0 && (
              <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                {prodResults.map(p => (
                  <button key={p.id}
                    onMouseDown={() => selectProduct(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-cyan-50 border-b border-gray-50 last:border-0 transition-colors">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    {p.category_name && <span className="text-xs text-gray-400 ml-2">({p.category_name})</span>}
                  </button>
                ))}
              </div>
            )}
            {showProdDrop && prodSearch.length >= 2 && !searchingProd && prodResults.length === 0 && (
              <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full px-4 py-3 text-sm text-gray-400 text-center">
                Sin coincidencias
              </div>
            )}
            {productName && (
              <p className="text-xs text-cyan-600 mt-1 ml-1">✓ {productName}</p>
            )}
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-2.5 bg-cyan-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>

        {data && (
          <>
            {/* Totales por centro */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-800">
                <h3 className="text-white font-semibold text-sm">Totales por Centro</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {data.center_totals.map((ct, i) => (
                  <div key={ct.center_id} className={`px-4 py-3 flex items-center justify-between ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-600" />
                      <span className="font-medium text-gray-800 text-sm">{ct.center_name}</span>
                      <span className="text-xs text-gray-400">{Number(ct.account_count || 0)} cuentas</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{Number(ct.total_qty || 0).toLocaleString('es-GT')} pzs</span>
                      <span className="font-semibold text-gray-900">{fmt(ct.total_sales)}</span>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between rounded-b-xl">
                  <span className="font-bold text-sm">TOTAL GENERAL</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{Number(data.grand_qty || 0).toLocaleString('es-GT')} pzs</span>
                    <span className="font-bold">{fmt(data.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs: Detallado / Exclusivos / Compartidos */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button onClick={() => setActiveTab('detail')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'detail' ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Detalle ({data.detail_rows.length})
                </button>
                <button onClick={() => setActiveTab('exclusive')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'exclusive' ? 'text-red-600 border-b-2 border-red-600 bg-red-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Exclusivos ({data.exclusive_products.length})
                </button>
                <button onClick={() => setActiveTab('shared')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'shared' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Compartidos ({data.shared_products.length})
                </button>
              </div>

              {/* Detalle tab */}
              {activeTab === 'detail' && (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Listado completo de productos vendidos</p>
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

                  {/* Cuentas unidas */}
                  {data.merged_accounts && data.merged_accounts.length > 0 && (
                    <div className="mx-4 my-2 border border-red-200 rounded-xl overflow-hidden bg-red-50">
                      <div className="px-3 py-2 bg-red-100 flex items-center gap-2">
                        <span className="text-red-600 text-xs font-semibold uppercase tracking-wider">⚠ Cuentas Unidas ({data.merged_accounts.length})</span>
                      </div>
                      {data.merged_accounts.map((ma, i) => (
                        <div key={ma.account_id} className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50/50'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${centerBadge(ma.center_name)}`}>
                              {ma.center_name || 'Sin centro'}
                            </span>
                            <span className="font-mono text-xs text-gray-600">{ma.check_number || `#${ma.account_id}`}</span>
                            {ma.waiter_name && <span className="text-xs text-gray-400">· {ma.waiter_name}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-400">Unida a</span>
                            <span className="font-bold text-red-600 font-mono">#{ma.merged_into_account_id}</span>
                            <span className="font-bold text-gray-400 w-16 text-right">Q0.00</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-cyan-600 text-white sticky top-0">
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Centro</th>
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Categoría</th>
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Producto</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Cuenta</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Fecha</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Cant.</th>
                          <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.detail_rows.map((row, i) => (
                          <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-cyan-50`}>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${centerBadge(row.center_name)}`}>
                                {row.center_name || 'Sin centro'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{row.category_name}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{row.product_name}</td>
                            <td className="px-3 py-2 text-center font-mono text-gray-600">
                              {row.merged_into_account_id ? (
                                <span className="flex items-center justify-center gap-1">
                                  <span className="line-through text-gray-400">{row.check_number}</span>
                                  <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded font-bold" title={`Unida a #${row.merged_into_account_id}`}>U</span>
                                </span>
                              ) : row.check_number}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-500 whitespace-nowrap">
                              {row.closed_at ? new Date(row.closed_at).toLocaleDateString('es-GT') : '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">{Number(row.qty || 0)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(row.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Exclusivos tab */}
              {activeTab === 'exclusive' && (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Productos vendidos solo en un centro</p>
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
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {data.exclusive_products.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Sin productos exclusivos</div>
                    ) : (
                      data.exclusive_products.map((p, i) => (
                        <div key={p.product_id} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${centerBadge(p.centers[0]?.center_name)}`}>
                                  {p.centers[0]?.center_name || 'Sin centro'}
                                </span>
                                <span className="text-xs text-gray-400">{p.category_name}</span>
                              </div>
                              <p className="font-medium text-gray-900 text-sm">{p.product_name}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="font-bold text-gray-900">{fmt(p.total_sales)}</p>
                              <p className="text-xs text-gray-400">{p.total_qty} pzs</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* Compartidos tab */}
              {activeTab === 'shared' && (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Productos vendidos en más de un centro</p>
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
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {data.shared_products.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Sin productos compartidos</div>
                    ) : (
                      data.shared_products.map((p, i) => (
                        <div key={p.product_id} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm mb-1">{p.product_name}</p>
                              <p className="text-xs text-gray-400 mb-1.5">{p.category_name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {p.centers.map(c => (
                                  <span key={c.center_id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${centerBadge(c.center_name)}`}>
                                    {c.center_name}: {c.qty} pzs
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="font-bold text-gray-900">{fmt(p.total_sales)}</p>
                              <p className="text-xs text-gray-400">{p.total_qty} pzs</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {!data && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona fechas y genera el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SALES BY USER REPORT PAGE
// ============================================================

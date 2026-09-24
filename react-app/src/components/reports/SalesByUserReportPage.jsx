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
  FileSpreadsheet,
  Users
} from 'lucide-react';

export function SalesByUserReportPage({ onBack }) {
  const [centers, setCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Product autocomplete
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [searchingProd, setSearchingProd] = useState(false);
  const [showProdDrop, setShowProdDrop] = useState(false);

  useEffect(() => {
    api.bootstrap().then(boot => {
      setCenters(boot.centers || []);
      setCategories(boot.categories || []);
      setUsers(boot.waiters || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (prodSearch.trim().length < 2) { setProdResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProd(true);
      try {
        const prods = await api.getProducts(categoryId || undefined, centerId || undefined);
        const filtered = (prods || []).filter(p =>
          p.name.toLowerCase().includes(prodSearch.toLowerCase())
        ).slice(0, 20);
        setProdResults(filtered);
        if (filtered.length > 0) setShowProdDrop(true);
      } catch (_) { setProdResults([]); }
      finally { setSearchingProd(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [prodSearch, categoryId, centerId]);

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
    setActiveTab('users');
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
      if (!result.detail_rows?.length && !result.users?.length) toast.error('Sin resultados');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;

  const toggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleExportExcel = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const userFilter = selectedUserIds.length > 0
      ? ` | Usuarios: ${selectedUserIds.map(id => users.find(u => u.id === id)?.full_name || id).join(', ')}`
      : '';

    exportToExcel({
      sheets: [
        // Sheet 1: Resumen por usuario
        {
          name: 'PorUsuario',
          title: 'SamaPos - Ventas por Usuario',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${userFilter}`,
          headers: [
            { label: '#', width: 5, type: 'center' },
            { label: 'Usuario', width: 22 },
            { label: 'Rol', width: 14 },
            { label: 'Centro', width: 16 },
            { label: 'Productos', width: 12, type: 'center' },
            { label: 'Cantidad', width: 10, type: 'center' },
            { label: 'Total Vendido', width: 15, type: 'money' },
          ],
          rows: data.users.map((u, i) => [
            { value: i + 1, type: 'center' },
            { value: u.user_name, type: 'bold' },
            { value: u.user_role || '-' },
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
            { value: Number(data.grand_qty || 0), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total || 0).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 2: Comparación de productos
        {
          name: 'Comparacion',
          title: 'SamaPos - Comparación por Producto',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${userFilter}`,
          headers: [
            { label: 'Producto', width: 28 },
            { label: 'Categoría', width: 18 },
            { label: 'Vendido por', width: 20 },
            { label: 'Cantidad', width: 10, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.product_comparison || []).map(p => {
            const topSeller = [...p.sellers].sort((a, b) => b.qty - a.qty)[0];
            const sellerCount = p.sellers.length;
            return [
              { value: p.product_name, type: 'bold' },
              { value: p.category_name },
              { value: sellerCount === 1 ? topSeller?.user_name || '-' : `${sellerCount} vendedores` },
              { value: Number(p.total_qty || 0), type: 'center' },
              { value: parseFloat(Number(p.total_sales || 0).toFixed(2)), type: 'money' },
            ];
          }),
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty || 0), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total || 0).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 3: Detalle
        {
          name: 'Detalle',
          title: 'SamaPos - Detalle de Ventas',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${userFilter}`,
          headers: [
            { label: 'Usuario', width: 20 },
            { label: 'Centro', width: 14 },
            { label: 'Categoría', width: 16 },
            { label: 'Producto', width: 28 },
            { label: 'Cuenta', width: 12 },
            { label: 'Fecha', width: 14 },
            { label: 'Cant.', width: 8, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.detail_rows || []).map(r => [
            { value: r.user_name || '-' },
            { value: r.center_name || '-' },
            { value: r.category_name },
            { value: r.product_name },
            { value: r.check_number || '-' },
            { value: r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-' },
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
            { value: Number(data.grand_qty || 0), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total || 0).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 4: Cuentas unidas
        ...((data.merged_accounts || []).length > 0 ? [{
          name: 'Unidas',
          title: 'SamaPos - Cuentas Unidas',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${userFilter}`,
          headers: [
            { label: 'Usuario', width: 20 },
            { label: 'Centro', width: 14 },
            { label: 'Cuenta Original', width: 16 },
            { label: 'Fecha', width: 14 },
            { label: 'Unida a Cuenta', width: 16 },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.merged_accounts || []).map(ma => [
            { value: ma.user_name || '-' },
            { value: ma.center_name || '-' },
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
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    exportToPDF({
      title: 'Ventas por Usuario',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
      tables: [
        {
          sectionTitle: 'Resumen por Usuario',
          headers: ['#', 'Usuario', 'Rol', 'Centro', 'Prod.', 'Cant.', 'Total'],
          rows: data.users.map((u, i) => [
            { value: i + 1, type: 'center' },
            { value: u.user_name, type: 'bold' },
            { value: u.user_role || '-' },
            { value: u.center_name || '-' },
            { value: u.product_count, type: 'center' },
            { value: Number(u.total_qty || 0), type: 'center' },
            { value: fmt(u.total_sales), type: 'money' },
          ]),
        },
        {
          sectionTitle: 'Comparación de Productos',
          headers: ['Producto', 'Categoría', '# Vend.', 'Cantidad', 'Total'],
          rows: (data.product_comparison || []).map(p => [
            { value: p.product_name, type: 'bold' },
            { value: p.category_name },
            { value: p.sellers.length, type: 'center' },
            { value: Number(p.total_qty || 0), type: 'center' },
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
          <h1 className="font-bold text-gray-900 text-lg">Ventas por Usuario</h1>
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
              <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="relative">
            <label className="text-xs text-gray-500 mb-1 block">Producto (opcional)</label>
            <div className="relative">
              <input
                type="text" value={prodSearch}
                onChange={e => { setProdSearch(e.target.value); if (!e.target.value) { setProductName(''); setShowProdDrop(false); } }}
                onFocus={() => { if (prodResults.length > 0) setShowProdDrop(true); }}
                onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
                placeholder="Escribe para buscar producto..."
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
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 border-b border-gray-50 last:border-0 transition-colors">
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
              <p className="text-xs text-rose-600 mt-1 ml-1">✓ {productName}</p>
            )}
          </div>
          {/* Usuarios */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Usuarios ({selectedUserIds.length > 0 ? `${selectedUserIds.length} seleccionado${selectedUserIds.length !== 1 ? 's' : ''}` : 'todos'})
            </label>
            <div className="border border-gray-200 rounded-xl p-2 max-h-28 overflow-y-auto space-y-1">
              {users.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-1">Cargando...</p>
              )}
              {users.map(u => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={isSelected}
                      onChange={() => toggleUser(u.id)}
                      className="w-3.5 h-3.5 accent-rose-600" />
                    <span className="text-xs text-gray-700">{u.full_name}</span>
                    {u.role && <span className="text-xs text-gray-400">({u.role})</span>}
                  </label>
                );
              })}
            </div>
            {selectedUserIds.length > 0 && (
              <button onClick={() => setSelectedUserIds([])}
                className="mt-1 text-xs text-rose-500 hover:text-rose-700 font-medium">
                Limpiar selección
              </button>
            )}
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-2.5 bg-rose-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>

        {data && (
          <>
            {/* Totales resumen */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Resumen General</h3>
                <div className="flex gap-1.5">
                  <button onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-red-500 bg-opacity-20 text-red-300 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-opacity-30">
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-500 bg-opacity-20 text-emerald-300 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-opacity-30">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Usuarios</p>
                  <p className="font-bold text-gray-900 text-lg">{data.users?.length || 0}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Productos Vendidos</p>
                  <p className="font-bold text-gray-900 text-lg">{Number(data.grand_qty || 0).toLocaleString('es-GT')}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Total Vendido</p>
                  <p className="font-bold text-rose-600 text-lg">{fmt(data.grand_total)}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button onClick={() => setActiveTab('users')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'users' ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Por Usuario ({data.users?.length || 0})
                </button>
                <button onClick={() => setActiveTab('products')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'products' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Comparación ({data.product_comparison?.length || 0})
                </button>
                <button onClick={() => setActiveTab('detail')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'detail' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Detalle ({data.detail_rows?.length || 0})
                </button>
              </div>

              {/* Por Usuario tab */}
              {activeTab === 'users' && (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {data.users?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Sin datos</div>
                  ) : (
                    data.users.map((u, i) => (
                      <div key={u.user_id} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-rose-50 transition-colors`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{u.user_name}</p>
                              <p className="text-xs text-gray-400">
                                {u.user_role || 'Empleado'} · {u.center_name || 'Sin centro'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="font-bold text-rose-600 text-sm">{fmt(u.total_sales)}</p>
                            <p className="text-xs text-gray-400">{Number(u.total_qty || 0).toLocaleString('es-GT')} pzs</p>
                          </div>
                        </div>
                        {/* Barra de progreso */}
                        {data.grand_total > 0 && (
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${Math.min(100, (Number(u.total_sales || 0) / Number(data.grand_total || 1)) * 100)}%` }} />
                          </div>
                        )}
                        {/* Productos que vendió */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {u.products?.slice(0, 5).map(p => (
                            <span key={p.product_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {p.product_name} <span className="font-medium">×{p.qty}</span>
                            </span>
                          ))}
                          {u.products?.length > 5 && (
                            <span className="text-xs text-gray-400 px-2 py-0.5">+{u.products.length - 5} más</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Comparación de productos tab */}
              {activeTab === 'products' && (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {data.product_comparison?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Sin datos</div>
                  ) : (
                    data.product_comparison.map((p, i) => {
                      const topSeller = [...p.sellers].sort((a, b) => b.qty - a.qty)[0];
                      return (
                        <div key={p.product_id} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                {i === 0 && <span className="text-xs bg-amber-400 text-white px-1.5 py-0.5 rounded font-bold">#1</span>}
                                <p className="font-semibold text-gray-900 text-sm">{p.product_name}</p>
                              </div>
                              <p className="text-xs text-gray-400">{p.category_name} · {p.sellers.length} vendedor{p.sellers.length !== 1 ? 'es' : ''}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="font-bold text-gray-900 text-sm">{fmt(p.total_sales)}</p>
                              <p className="text-xs text-gray-400">{Number(p.total_qty || 0).toLocaleString('es-GT')} pzs</p>
                            </div>
                          </div>
                          {/* Ranking de vendedores por producto */}
                          <div className="space-y-1.5">
                            {[...p.sellers].sort((a, b) => b.qty - a.qty).map((s, si) => (
                              <div key={s.user_id} className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{si + 1}.</span>
                                <span className={`text-xs font-medium w-5 text-center flex-shrink-0 ${si === 0 ? 'text-amber-500' : 'text-gray-500'}`}>
                                  {si === 0 ? '🥇' : si === 1 ? '🥈' : si === 2 ? '🥉' : ''}
                                </span>
                                <span className="text-xs text-gray-700 flex-1 truncate">{s.user_name}</span>
                                <span className="text-xs text-gray-500">{Number(s.qty || 0).toLocaleString('es-GT')} pzs</span>
                                <span className="text-xs font-medium text-gray-700 w-20 text-right">{fmt(s.sales)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Detalle tab */}
              {activeTab === 'detail' && (
                <>
                  {/* Cuentas unidas */}
                  {data.merged_accounts && data.merged_accounts.length > 0 && (
                    <div className="mx-4 my-2 border border-red-200 rounded-xl overflow-hidden bg-red-50">
                      <div className="px-3 py-2 bg-red-100 flex items-center gap-2">
                        <span className="text-red-600 text-xs font-semibold uppercase tracking-wider">⚠ Cuentas Unidas ({data.merged_accounts.length})</span>
                      </div>
                      {data.merged_accounts.map((ma, i) => (
                        <div key={ma.account_id} className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50/50'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{ma.user_name || '-'}</span>
                            <span className="text-gray-300">·</span>
                            <span className="font-mono text-xs text-gray-600">{ma.check_number || `#${ma.account_id}`}</span>
                            <span className="text-xs text-gray-400">{ma.center_name || ''}</span>
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
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-blue-600 text-white sticky top-0">
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Usuario</th>
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
                        {data.detail_rows?.map((r, i) => (
                          <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                            <td className="px-3 py-2 font-medium text-gray-800">{r.user_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.center_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.category_name}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{r.product_name}</td>
                            <td className="px-3 py-2 text-center font-mono text-gray-600">
                              {r.merged_into_account_id ? (
                                <span className="flex items-center justify-center gap-1">
                                  <span className="line-through text-gray-400">{r.check_number || '-'}</span>
                                  <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded font-bold" title={`Unida a #${r.merged_into_account_id}`}>U</span>
                                </span>
                              ) : r.check_number || '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-500 whitespace-nowrap">
                              {r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">{Number(r.qty || 0)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(r.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between rounded-b-xl">
                    <span className="font-bold text-sm">TOTAL</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{Number(data.grand_qty || 0).toLocaleString('es-GT')} pzs</span>
                      <span className="font-bold">{fmt(data.grand_total)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {!data && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona filtros y genera el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}

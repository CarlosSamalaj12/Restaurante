import { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { exportToExcel, exportToPDF } from '../../utils/exports';
import {
  ArrowLeft,
  Loader2,
  Printer,
  Package,
  XCircle,
  Search,
  ShoppingCart,
  FileSpreadsheet
} from 'lucide-react';

export function ProductSalesReportPage({ onBack }) {
  const toast = useToast();
  const [centers, setCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centerId, setCenterId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Product autocomplete
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [searchingProd, setSearchingProd] = useState(false);
  const [showProdDrop, setShowProdDrop] = useState(false);

  useEffect(() => {
    api.bootstrap().then(boot => {
      setCenters(boot.centers || []);
      setCategories(boot.categories || []);
    }).catch(() => {});
  }, []);

  // Debounced product search
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
    if (!startDate || !endDate) { toast.error('Selecciona rango de fechas'); return; }
    setLoading(true);
    try {
      const result = await api.getProductSales({
        startDate, endDate,
        centerId: centerId || undefined,
        categoryId: categoryId || undefined,
        productName: productName || undefined,
      });
      setCategories(result.categories || []);
      setData(result);
      if (!result.rows?.length) toast.error('Sin resultados');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // formatMoney returns "Q123.45" (string), formatNum returns Number
  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;
  const formatMoney = (n) => fmt(n);
  const formatNum = (n) => Number(n || 0);

  const handleExportExcel = () => {
    if (!data?.rows?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const { rows, totals } = data;
    const catGroups = [];
    let prevCat = '';
    const groupedRows = [];
    rows.forEach(r => {
      if (r.category_name !== prevCat) {
        catGroups.push({ category: r.category_name, startIdx: groupedRows.length });
        prevCat = r.category_name;
      }
      groupedRows.push(r);
    });

    const excelRows = [];
    rows.forEach(r => {
      excelRows.push([
        { value: r.category_name, type: 'bold' },
        { value: r.product_name },
        { value: Number(r.total_qty || 0), type: 'center' },
        { value: parseFloat(Number(r.total_sales || 0).toFixed(2)), type: 'money' },
        { value: Number(r.account_count || 0), type: 'center' },
      ]);
    });

    exportToExcel({
      sheets: [{
        name: 'Ventas',
        title: 'SamaPos - Ventas por Categoría',
        subtitle: `${centerName} | Del ${startDate} al ${endDate}`,
        headers: [
          { label: 'Categoría', width: 18 },
          { label: 'Producto', width: 30 },
          { label: 'Cantidad', width: 10, type: 'center' },
          { label: 'Total', width: 13, type: 'money' },
          { label: 'Cuentas', width: 9, type: 'center' },
        ],
        rows: excelRows,
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: Number(totals.grand_qty || 0), type: 'boldCenter' },
          { value: parseFloat(Number(totals.grand_total || 0).toFixed(2)), type: 'money' },
          { value: Number(totals.total_accounts || 0), type: 'boldCenter' },
        ],
      }],
    });
  };

  const handleExportPDF = () => {
    if (!data?.rows?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const { rows, totals } = data;

    exportToPDF({
      title: 'Ventas por Categoría',
      subtitle: `${centerName} | Del ${startDate} al ${endDate}`,
      tables: [{
        headers: ['Categoría', 'Producto', 'Cantidad', 'Total', 'Cuentas'],
        rows: rows.map(r => [
          { value: r.category_name, type: 'bold' },
          { value: r.product_name },
          { value: Number(r.total_qty || 0), type: 'center' },
          { value: formatMoney(r.total_sales), type: 'money' },
          { value: Number(r.account_count || 0), type: 'center' },
        ]),
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: Number(totals.grand_qty || 0), type: 'boldCenter' },
          { value: formatMoney(totals.grand_total), type: 'money' },
          { value: Number(totals.total_accounts || 0), type: 'boldCenter' },
        ],
      }],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Ventas por Categoría</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Centro</label>
              <select value={centerId} onChange={e => setCenterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos los centros</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todas las categorías</option>
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
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors">
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
              <p className="text-xs text-blue-600 mt-1 ml-1">✓ {productName}</p>
            )}
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 font-medium disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Generar Reporte</>}
          </button>
        </div>

        {data && data.rows?.length > 0 && (() => {
          const { rows, totals } = data;
          let prevCat = '';
          return (
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {totals.total_accounts} cuentas · {formatNum(totals.grand_qty).toLocaleString('es-GT')} productos · {formatMoney(totals.grand_total)}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-red-100 transition-colors">
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-emerald-100 transition-colors">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {rows.map((r, i) => {
                  const isNewCat = r.category_name !== prevCat;
                  prevCat = r.category_name;
                  return (
                    <div key={i}>
                      {isNewCat && (
                        <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-700">{r.category_name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-2.5 pl-10">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-900">{r.product_name}</span>
                          <span className="text-xs text-gray-400 ml-2">{r.account_count} cuenta{r.account_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500 w-16 text-right">{formatNum(r.total_qty).toLocaleString('es-GT')}</span>
                          <span className="font-semibold text-gray-900 w-24 text-right">{formatMoney(r.total_sales)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between rounded-b-xl">
                <span className="font-bold text-sm">TOTALES</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-16 text-right">{formatNum(totals.grand_qty).toLocaleString('es-GT')}</span>
                  <span className="font-bold w-24 text-right text-emerald-400">{formatMoney(totals.grand_total)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {data && !data.rows?.length && (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Sin resultados para los filtros seleccionados</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAYMENT METHOD REPORT PAGE
// ============================================================

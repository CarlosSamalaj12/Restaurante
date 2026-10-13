import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Download, 
  PieChart, 
  CreditCard, 
  Percent, 
  RefreshCw,
  Loader2,
  Wallet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function ProfitLossTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Filtros de fecha
  const [datePreset, setDatePreset] = useState('month'); // 'today' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Primer día del mes
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes
      d.setDate(diff);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const res = await api.expenses.getFinancialSummary({
        startDate,
        endDate,
      });
      setData(res);
    } catch (err) {
      toast.show(err.message || 'Error al cargar balance financiero', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [startDate, endDate]);

  const handleExportExcel = () => {
    if (!data) return;

    const summaryData = [
      { Métrica: 'Ingresos Totales por Ventas', Valor: data.revenue.total },
      { Métrica: 'Cuentas Cobradas', Valor: data.revenue.closedAccountsCount },
      { Métrica: 'Transacciones de Pago', Valor: data.revenue.transactionsCount },
      { Métrica: 'Gastos Operativos Totales', Valor: data.expenses.total },
      { Métrica: 'Gastos Pagados', Valor: data.expenses.totalPaid },
      { Métrica: 'Gastos Pendientes / Por Pagar', Valor: data.expenses.totalPending },
      { Métrica: 'Ganancia / Utilidad Neta', Valor: data.netProfit },
      { Métrica: 'Margen de Ganancia (%)', Valor: `${data.profitMargin}%` },
    ];

    const categoryData = (data.expenses.byCategory || []).map((c) => ({
      Categoría: c.name,
      'Total Gastado (Q)': c.total,
      'Cantidad de Gastos': c.count,
      'Participación (%)': `${c.percentage}%`,
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsCat = XLSX.utils.json_to_sheet(categoryData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Financiero');
    XLSX.utils.book_append_sheet(wb, wsCat, 'Gastos por Categoría');

    const fileName = `Balance_Ganancias_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.show('Reporte de balance exportado a Excel', { type: 'success' });
  };

  const revenue = data?.revenue?.total || 0;
  const expenses = data?.expenses?.total || 0;
  const netProfit = data?.netProfit || 0;
  const margin = data?.profitMargin || 0;
  const isPositive = netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Presets */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: 'custom', label: 'Personalizado' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handlePresetChange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePreset === item.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Inputs fecha personalizada */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
              className="bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold text-slate-800"
            />
            <span className="text-slate-400">al</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
              className="bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold text-slate-800"
            />
          </div>

          <button
            onClick={loadFinancialData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
            title="Refrescar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            disabled={loading || !data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold">Calculando balance financiero y rentabilidad...</p>
        </div>
      ) : (
        <>
          {/* Main 4 Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Ingresos Totales */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ingresos Totales (Ventas)
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                Q {revenue.toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                <span>{data?.revenue?.closedAccountsCount || 0} cuentas cobradas</span>
                <span>•</span>
                <span>{data?.revenue?.transactionsCount || 0} pagos</span>
              </div>
            </div>

            {/* 2. Gastos Totales */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Gastos Operativos
                </span>
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-700">
                Q {expenses.toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                <span>{data?.expenses?.count || 0} registros de egresos</span>
              </div>
            </div>

            {/* 3. Ganancia Neta */}
            <div className={`rounded-3xl p-5 border shadow-xs relative overflow-hidden group ${
              isPositive
                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-400/30'
                : 'bg-gradient-to-br from-rose-600 to-red-800 text-white border-rose-400/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Ganancia / Utilidad Neta
                </span>
                <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">
                Q {netProfit.toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-white/80 font-medium">
                {isPositive ? 'Superávit / Operación Rentable' : 'Déficit en este período'}
              </div>
            </div>

            {/* 4. Margen de Ganancia % */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Margen Operativo
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <div className={`text-2xl font-black ${isPositive ? 'text-blue-600' : 'text-rose-600'}`}>
                {margin}%
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Rentabilidad sobre ingresos totales
              </div>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gastos por Categoría */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Distribución de Gastos por Categoría</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Total: Q {expenses.toFixed(2)}
                </span>
              </div>

              <div className="space-y-3.5">
                {(data?.expenses?.byCategory || []).map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#64748b' }}
                        />
                        <span className="font-bold text-slate-800">{cat.name}</span>
                        <span className="text-[11px] text-slate-400">({cat.count})</span>
                      </div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>Q {Number(cat.total).toFixed(2)}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({cat.percentage}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, cat.percentage))}%`,
                          backgroundColor: cat.color || '#64748b',
                        }}
                      />
                    </div>
                  </div>
                ))}

                {(data?.expenses?.byCategory || []).length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No se registran gastos en este período.
                  </p>
                )}
              </div>
            </div>

            {/* Métodos de Pago Comparativa */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">Ingresos por Método de Cobro</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(data?.revenue?.byMethod || []).map((m) => (
                    <div key={m.method} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[11px] font-bold uppercase text-slate-500 block">
                        {m.method}
                      </span>
                      <span className="text-sm font-black text-slate-900 mt-0.5 block">
                        Q {Number(m.total).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {(data?.revenue?.byMethod || []).length === 0 && (
                    <p className="text-xs text-slate-400 col-span-2 py-3 text-center">Sin ingresos en el período.</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-sm text-slate-900">Gastos por Método de Egreso</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(data?.expenses?.byMethod || []).map((m) => (
                    <div key={m.method} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[11px] font-bold uppercase text-slate-500 block">
                        {m.method}
                      </span>
                      <span className="text-sm font-black text-rose-800 mt-0.5 block">
                        Q {Number(m.total).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {(data?.expenses?.byMethod || []).length === 0 && (
                    <p className="text-xs text-slate-400 col-span-2 py-3 text-center">Sin gastos en el período.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfitLossTab;

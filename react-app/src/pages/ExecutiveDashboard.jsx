// react-app/src/pages/ExecutiveDashboard.jsx
// Dashboard Ejecutivo y Métricas Financieras con diseño uniforme al POS e iconos minimalistas

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { BackButton } from '../components/BackButton';
import {
  TrendingUp,
  Coins,
  Receipt,
  Users,
  Calendar,
  Filter,
  RefreshCw,
  ArrowLeft,
  Download,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Award,
  Flame,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  MapPin,
  Utensils,
  ChevronRight,
  LogOut
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import * as XLSX from 'xlsx';

export function ExecutiveDashboard({ onBack }) {
  const { currencySymbol = 'Q', user, logout } = useAuth();

  // Estados de Filtros
  const [datePreset, setDatePreset] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedWaiter, setSelectedWaiter] = useState('');
  const [selectedShift, setSelectedShift] = useState('');

  // Estados de Datos
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [hoveredHour, setHoveredHour] = useState(null);
  const [hoveredMethod, setHoveredMethod] = useState(null);

  // Helper para calcular rangos de fecha rápidos
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toYMD(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'week') {
      const day = now.getDay() || 7; // Lunes = 1
      const mon = new Date(now);
      mon.setDate(now.getDate() - day + 1);
      setStartDate(toYMD(mon));
      setEndDate(toYMD(now));
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYMD(first));
      setEndDate(toYMD(now));
    }
  };

  // Carga de datos de la API
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await api.analytics.getDashboard({
        startDate,
        endDate,
        centerId: selectedCenter || undefined,
        areaId: selectedArea || undefined,
        method: selectedMethod || undefined,
        waiterId: selectedWaiter || undefined,
        shiftId: selectedShift || undefined,
      });
      setData(res);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[ANALYTICS] Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, selectedCenter, selectedArea, selectedMethod, selectedWaiter, selectedShift]);

  // Recarga al cambiar filtros
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Escucha en tiempo real para recargar silenciosamente cuando ingresan cobros
  useSocket({
    'sales:payment': () => {
      if (datePreset === 'today') fetchDashboardData(true);
    },
    'sales:closed': () => {
      if (datePreset === 'today') fetchDashboardData(true);
    },
    'sales:order': () => {
      if (datePreset === 'today') fetchDashboardData(true);
    },
  });

  const clearFilters = () => {
    setSelectedCenter('');
    setSelectedArea('');
    setSelectedMethod('');
    setSelectedWaiter('');
    setSelectedShift('');
    applyDatePreset('today');
  };

  const hasActiveFilters = Boolean(
    selectedCenter || selectedArea || selectedMethod || selectedWaiter || selectedShift || datePreset !== 'today'
  );

  // Exportar métricas a Excel
  const handleExportExcel = () => {
    if (!data) return;
    try {
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen Ejecutivo
      const summaryData = [
        ['REPORTE EJECUTIVO DE VENTAS SAMAPOS'],
        ['Generado el:', new Date().toLocaleString()],
        ['Rango:', `${startDate} al ${endDate}`],
        [''],
        ['MÉTRICA', 'VALOR'],
        ['Ingresos Totales', `${currencySymbol} ${Number(data.kpis?.totalRevenue || 0).toFixed(2)}`],
        ['Cuentas Cerradas', data.kpis?.closedAccountsCount || 0],
        ['Ticket Promedio', `${currencySymbol} ${Number(data.kpis?.avgTicket || 0).toFixed(2)}`],
        ['Descuentos Otorgados', `${currencySymbol} ${Number(data.kpis?.totalDiscounts || 0).toFixed(2)}`],
        ['Cuentas Abiertas en Curso', data.kpis?.openAccountsCount || 0],
        ['Venta Potencial en Curso', `${currencySymbol} ${Number(data.kpis?.openPotentialRevenue || 0).toFixed(2)}`],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

      // Hoja 2: Ventas por Forma de Pago
      if (data.salesByMethod?.length) {
        const methodData = [
          ['FORMA DE PAGO', 'TOTAL', 'TRANSACCIONES', '% PARTICIPACIÓN'],
          ...data.salesByMethod.map((m) => [m.label, m.total, m.count, `${m.percentage}%`]),
        ];
        const wsMethod = XLSX.utils.aoa_to_sheet(methodData);
        XLSX.utils.book_append_sheet(wb, wsMethod, 'Formas de Pago');
      }

      // Hoja 3: Ranking Meseros
      if (data.waiterRanking?.length) {
        const waiterData = [
          ['MESERO', 'VENTAS TOTALES', 'CUENTAS', 'TICKET PROMEDIO'],
          ...data.waiterRanking.map((w) => [w.name, w.totalSales, w.accountsCount, w.averageTicket]),
        ];
        const wsWaiter = XLSX.utils.aoa_to_sheet(waiterData);
        XLSX.utils.book_append_sheet(wb, wsWaiter, 'Meseros');
      }

      // Hoja 4: Top Platillos
      if (data.topProducts?.length) {
        const prodData = [
          ['PLATILLO / PRODUCTO', 'CATEGORÍA', 'CANTIDAD VENDIDA', 'INGRESOS TOTALES'],
          ...data.topProducts.map((p) => [p.name, p.category, p.quantity, p.revenue]),
        ];
        const wsProd = XLSX.utils.aoa_to_sheet(prodData);
        XLSX.utils.book_append_sheet(wb, wsProd, 'Platillos Más Vendidos');
      }

      XLSX.writeFile(wb, `Reporte_Ejecutivo_${startDate}_${endDate}.xlsx`);
    } catch (err) {
      console.error('[EXPORT] Error exporting excel:', err);
    }
  };

  // Cálculo para Curva de Ventas por Hora (SVG)
  const hourlyData = data?.salesByHour || [];
  const maxHourlySale = Math.max(...hourlyData.map((d) => d.total), 100);
  const peakHourItem = useMemo(() => {
    return hourlyData.reduce((prev, current) => (current.total > prev.total ? current : prev), { total: 0, hour: '--' });
  }, [hourlyData]);

  // Cálculo para Donut de Formas de Pago (SVG)
  const methodsData = data?.salesByMethod || [];
  const totalMethodSales = methodsData.reduce((acc, curr) => acc + curr.total, 0);

  // Paleta de colores para gráficos moderna y limpia
  const chartColors = [
    '#059669', // emerald-600
    '#4f46e5', // indigo-600
    '#0284c7', // sky-600
    '#d97706', // amber-600
    '#db2777', // pink-600
    '#7c3aed', // violet-600
    '#0d9488', // teal-600
    '#64748b', // slate-500
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-20 select-none font-sans antialiased">
      {/* Barra Superior / Header en tema claro uniforme */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-2.5 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 max-w-[1700px] mx-auto">
          <div className="flex items-center space-x-3">
            <BackButton
              onClick={onBack}
              label="Volver al POS"
              title="Volver al POS"
            />

            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-5 h-5 text-emerald-600" strokeWidth={2} />
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  Dashboard Ejecutivo
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Métricas financieras, análisis de ventas y rendimiento operativo
              </p>
            </div>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-2.5 self-end md:self-center">
            {/* Botón Refrescar */}
            <button
              onClick={() => fetchDashboardData(false)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
              title="Refrescar métricas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>

            {/* Botón Exportar */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>

            {/* Botón Salir */}
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition flex items-center gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer ml-1"
              title="Cerrar sesión / Salir (PIN)"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-[1700px] w-full mx-auto px-4 lg:px-6 py-5 space-y-5">
        {/* Barra de Filtros Intuitivos */}
        <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Pills de Rango de Fecha */}
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Período:
              </span>
              {[
                { id: 'today', label: 'Hoy' },
                { id: 'yesterday', label: 'Ayer' },
                { id: 'week', label: 'Esta Semana' },
                { id: 'month', label: 'Este Mes' },
                { id: 'custom', label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyDatePreset(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    datePreset === p.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Selector de Rango Personalizado */}
            {datePreset === 'custom' && (
              <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-slate-400 text-xs">a</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </m.div>
            )}

            {/* Botón Limpiar Filtros */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 self-start lg:self-center transition font-semibold ml-auto"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Dropdowns de Filtro Avanzado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
            {/* Centro de Consumo */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" /> Centro de Consumo
              </label>
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Todos los Centros</option>
                {data?.options?.centers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Área de Mesas */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> Área / Salón
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Todas las Áreas</option>
                {data?.options?.areas?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Forma de Pago */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-slate-400" /> Forma de Pago
              </label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Todas las Formas</option>
                {data?.options?.paymentMethods?.map((pm) => (
                  <option key={pm.code} value={pm.code}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mesero */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" /> Mesero / Vendedor
              </label>
              <select
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Todos los Meseros</option>
                {data?.options?.waiters?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Turno / Caja */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Caja / Turno
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Todos los Turnos</option>
                {data?.options?.shifts?.map((s) => (
                  <option key={s.id} value={s.id}>
                    Turno #{s.id} - {s.cashier_name || 'Cajero'} ({s.status === 'open' ? 'Abierto' : 'Cerrado'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 4 Cards de KPIs Principales con estética limpia */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Ingresos Totales */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ingresos Totales
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <Coins className="w-5 h-5" strokeWidth={1.8} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {currencySymbol} {Number(data?.kpis?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <span>{data?.kpis?.paymentTransactions || 0} pagos cobrados</span>
              <span className="text-emerald-600 font-semibold">Total Liquidado</span>
            </div>
          </div>

          {/* Card 2: Ticket Promedio */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ticket Promedio
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Receipt className="w-5 h-5" strokeWidth={1.8} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {currencySymbol} {Number(data?.kpis?.avgTicket || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <span>Por comanda liquidada</span>
              <span className="text-blue-600 font-semibold">Consumo promedio</span>
            </div>
          </div>

          {/* Card 3: Cuentas Cerradas & Mesas Activas */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cuentas Cerradas
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.8} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {data?.kpis?.closedAccountsCount || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">cuentas</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <span className="text-amber-600 font-semibold">
                {data?.kpis?.openAccountsCount || 0} mesas en curso
              </span>
              <span className="text-slate-600 font-mono">
                {currencySymbol} {Number(data?.kpis?.openPotentialRevenue || 0).toFixed(0)} pot.
              </span>
            </div>
          </div>

          {/* Card 4: Descuentos & Cortesías */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Descuentos Otorgados
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Award className="w-5 h-5" strokeWidth={1.8} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight font-mono">
                {currencySymbol} {Number(data?.kpis?.totalDiscounts || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <span>Cortesías y promociones</span>
              <span className="text-amber-600 font-semibold">Control de margen</span>
            </div>
          </div>
        </section>

        {/* Sección de Gráficos Principales: Curva Horaria y Donut Formas de Pago */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Gráfico 1: Curva de Ventas por Hora (2 columnas) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" /> Curva de Ventas por Hora (00:00 - 23:00)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribución temporal de cobros en el período seleccionado
                </p>
              </div>

              {peakHourItem.total > 0 && (
                <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hora Pico: {peakHourItem.hour} ({currencySymbol} {peakHourItem.total.toFixed(0)})</span>
                </div>
              )}
            </div>

            {/* Gráfico SVG Responsivo */}
            <div className="flex-1 w-full min-h-[220px] relative flex flex-col justify-end pt-4">
              <svg viewBox="0 0 600 180" className="w-full h-44 overflow-visible">
                <defs>
                  <linearGradient id="salesGradientLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Líneas horizontales de referencia */}
                {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={160 - ratio * 140}
                    x2="600"
                    y2={160 - ratio * 140}
                    stroke="#f1f5f9"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                ))}

                {/* Path de Área con Gradiente */}
                {hourlyData.length > 0 && (() => {
                  const points = hourlyData.map((d, idx) => {
                    const x = (idx / 23) * 600;
                    const y = 160 - (d.total / maxHourlySale) * 140;
                    return `${x},${y}`;
                  });
                  const areaPoints = `0,160 ${points.join(' ')} 600,160`;
                  return (
                    <>
                      <polygon points={areaPoints} fill="url(#salesGradientLight)" />
                      <polyline
                        points={points.join(' ')}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}

                {/* Puntos interactivos con Tooltip al Hover */}
                {hourlyData.map((d, idx) => {
                  const x = (idx / 23) * 600;
                  const y = 160 - (d.total / maxHourlySale) * 140;
                  const isHovered = hoveredHour?.hour === d.hour;

                  return (
                    <g key={idx} onMouseEnter={() => setHoveredHour(d)} onMouseLeave={() => setHoveredHour(null)}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : 2.5}
                        fill={isHovered ? '#047857' : '#059669'}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all cursor-pointer"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Dinámico */}
              {hoveredHour && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg text-xs flex items-center gap-2 pointer-events-none">
                  <span className="font-bold text-emerald-400">{hoveredHour.hour}</span>
                  <span>|</span>
                  <span className="font-mono">{currencySymbol} {hoveredHour.total.toFixed(2)}</span>
                  <span className="text-slate-400">({hoveredHour.count} pagos)</span>
                </div>
              )}

              {/* Etiquetas de eje X */}
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono px-1">
                {hourlyData
                  .filter((_, idx) => idx % 3 === 0 || idx === 23)
                  .map((d, i) => (
                    <span key={i}>{d.hour}</span>
                  ))}
              </div>
            </div>
          </div>

          {/* Gráfico 2: Donut de Formas de Pago (1 columna) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-600" /> Formas de Pago
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribución porcentual del total cobrado
              </p>
            </div>

            {/* Visualización Donut SVG */}
            <div className="my-4 relative flex items-center justify-center">
              <svg width="170" height="170" viewBox="0 0 100 100" className="rotate-[-90deg]">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
                {methodsData.length > 0 &&
                  (() => {
                    let accumulatedPercent = 0;
                    return methodsData.map((m, idx) => {
                      const strokeDasharray = `${(m.percentage * 251.2) / 100} 251.2`;
                      const strokeDashoffset = -((accumulatedPercent * 251.2) / 100);
                      accumulatedPercent += m.percentage;
                      const color = chartColors[idx % chartColors.length];

                      return (
                        <circle
                          key={m.method}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke={color}
                          strokeWidth="14"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all hover:opacity-80 cursor-pointer"
                          onMouseEnter={() => setHoveredMethod(m)}
                          onMouseLeave={() => setHoveredMethod(null)}
                        />
                      );
                    });
                  })()}
              </svg>

              {/* Centro del Donut */}
              <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  {currencySymbol} {Number(totalMethodSales).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Leyenda de Formas de Pago */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {methodsData.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">Sin cobros registrados</div>
              ) : (
                methodsData.map((m, idx) => {
                  const color = chartColors[idx % chartColors.length];
                  return (
                    <div
                      key={m.method}
                      className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-slate-700 font-semibold">{m.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 font-medium">{m.percentage}%</span>
                        <span className="text-slate-900 font-bold">
                          {currencySymbol} {m.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Sección Inferior: Ranking de Meseros & Top Platillos & Comparativa por Área */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Leaderboard de Meseros */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" /> Rendimiento de Meseros
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ventas y comandas cobradas por personal de servicio
                </p>
              </div>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {data?.waiterRanking?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Sin registros de meseros</div>
              ) : (
                data?.waiterRanking?.map((w, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <div
                      key={w.id || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold w-6 text-center">{medal}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{w.name}</div>
                          <div className="text-[11px] text-slate-500">{w.accountsCount} cuentas atendidas</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-600 font-mono">
                          {currencySymbol} {w.totalSales.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Prom: {currencySymbol} {w.averageTicket.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Platillos Más Vendidos */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-teal-600" /> Platillos Más Vendidos
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platillos con mayor rotación e ingresos generados
                </p>
              </div>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {data?.topProducts?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Sin ventas de platillos registradas</div>
              ) : (
                data?.topProducts?.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500">{p.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {p.quantity} <span className="text-[10px] font-normal text-slate-500">uds</span>
                      </div>
                      <div className="text-[11px] text-teal-600 font-mono font-semibold">
                        {currencySymbol} {p.revenue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ventas por Área y Centro */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" /> Ventas por Área de Salón
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresos y ocupación monetaria por salón o terraza
              </p>
            </div>

            <div className="space-y-3.5 my-4 flex-1 overflow-y-auto max-h-[220px] pr-1">
              {data?.salesByArea?.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Sin datos de áreas</div>
              ) : (
                data?.salesByArea?.map((area, idx) => {
                  const maxArea = Math.max(...data.salesByArea.map((a) => a.total), 1);
                  const pct = Math.round((area.total / maxArea) * 100);

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700 font-semibold">{area.name}</span>
                        <span className="text-slate-900 font-bold font-mono">
                          {currencySymbol} {area.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        {area.tickets} comandas cobradas
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con Fecha y Hora de Última Sincronización */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Actualizado: {lastUpdated.toLocaleTimeString()}</span>
              <span className="text-slate-500 font-medium">Sincronización activa</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
export default ExecutiveDashboard;

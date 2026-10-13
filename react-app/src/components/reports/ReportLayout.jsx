// react-app/src/components/reports/ReportLayout.jsx
// Contenedor unificado para subreportes del POS - Estética consistente v3.4

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Store,
  LogOut,
  Printer,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function ReportLayout({
  title,
  badge = 'FINANZAS',
  badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200',
  subtitle,
  onBack,
  // Control de fechas
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onRefresh,
  loading = false,
  // Control de centros
  centers = [],
  selectedCenter,
  setSelectedCenter,
  // Tarjetas KPI superiores
  kpis = [],
  // Acciones de exportación
  onPrintThermal,
  onExportExcel,
  onExportPdf,
  // Filtros adicionales (mesero, categoría, etc.)
  extraFilters = null,
  children
}) {
  const { user, logout } = useAuth();
  const [datePreset, setDatePreset] = useState('month');

  // Iniciales del usuario
  const userInitials = (user?.full_name || 'Carlos Samalaj')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  // Presets de fecha
  const handlePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const toYMD = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const todayStr = toYMD(today);
      setStartDate && setStartDate(todayStr);
      setEndDate && setEndDate(todayStr);
    } else if (preset === 'shift') {
      const todayStr = toYMD(today);
      setStartDate && setStartDate(todayStr);
      setEndDate && setEndDate(todayStr);
    } else if (preset === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      setStartDate && setStartDate(toYMD(sevenDaysAgo));
      setEndDate && setEndDate(toYMD(today));
    } else if (preset === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate && setStartDate(toYMD(firstOfMonth));
      setEndDate && setEndDate(toYMD(today));
    }
  };

  // Atajo de teclado ESC para volver
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack && onBack();
      } else if (e.key === 'F5') {
        e.preventDefault();
        onRefresh && onRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, onRefresh]);

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans pb-16">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. CABECERA SUPERIOR UNIFICADA */}
      {/* ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Botón Volver + Título & Badge */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Volver al menú de reportes [ESC]"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Volver a Reportes</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">
                  {title}
                </h1>
                {badge && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shrink-0 ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 truncate max-w-xl">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Selector de Centro + Usuario + Salir */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
            {/* Centro de Operación */}
            {setSelectedCenter && centers.length > 0 && (
              <div className="relative">
                <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">
                  Centro de Operación
                </span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 transition-colors">
                  <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <select
                    value={selectedCenter || ''}
                    onChange={(e) => setSelectedCenter(e.target.value)}
                    className="bg-transparent border-none outline-none font-bold text-slate-800 text-xs cursor-pointer pr-4"
                  >
                    <option value="">Todos los Centros</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Usuario Activo */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {userInitials || 'CS'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-xs truncate max-w-[130px]">
                  {user?.full_name || 'Carlos Samalaj'}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Caja 01 • Turno Activo</span>
                </div>
              </div>
            </div>

            {/* Salir PIN */}
            <button
              type="button"
              onClick={logout}
              className="px-3 py-2 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Cerrar sesión / PIN"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir (PIN)</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* CUERPO PRINCIPAL */}
      {/* ─────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-5 space-y-4">
        {/* Tarjetas KPI Superiores (si existen) */}
        {kpis && kpis.length > 0 && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(kpis.length, 4)} gap-3.5`}>
            {kpis.map((kpi, idx) => {
              const Icon = kpi.icon || FileText;
              return (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {kpi.label}
                    </span>
                    <div className="font-mono font-black text-slate-900 text-xl sm:text-2xl">
                      {kpi.value}
                    </div>
                    {kpi.subtext && (
                      <div className={`text-xs ${kpi.subtextColor || 'text-slate-500'} font-semibold`}>
                        {kpi.subtext}
                      </div>
                    )}
                  </div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${kpi.iconBg || 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Barra de Filtros de Fecha & Herramientas de Exportación */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Izquierda: Presets de Fecha & Controles */}
            {setStartDate && setEndDate && (
              <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
                {/* Presets */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handlePreset('today')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      datePreset === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('week')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      datePreset === 'week' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('month')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      datePreset === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mes
                  </button>
                </div>

                {/* Input Desde */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="font-bold text-slate-400">Desde:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                    className="bg-transparent font-mono font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>

                {/* Input Hasta */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="font-bold text-slate-400">Hasta:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                    className="bg-transparent font-mono font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>

                {/* Botón Actualizar */}
                {onRefresh && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onRefresh}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                    title="Actualizar datos [F5]"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            )}

            {/* Derecha: Botones de Exportación / Impresión */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
              {onPrintThermal && (
                <button
                  type="button"
                  onClick={onPrintThermal}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  title="Imprimir tirilla térmica de 80mm"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Tirilla Térmica (80mm)</span>
                </button>
              )}

              {onExportExcel && (
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  title="Exportar a Microsoft Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel</span>
                </button>
              )}

              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  title="Exportar a documento PDF"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* Filtros específicos adicionales del reporte */}
          {extraFilters && (
            <div className="pt-2.5 border-t border-slate-100">
              {extraFilters}
            </div>
          )}
        </div>

        {/* Contenido / Tablas del reporte */}
        <div className="space-y-4">
          {children}
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. BARRA DE ESTADO INFERIOR */}
      {/* ─────────────────────────────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Servidor POS: <strong>Sincronizado</strong></span>
          <span>|</span>
          <span>Base de datos local activa: <strong>99.9% disponible</strong></span>
          <span>|</span>
          <span>Terminal: <strong>TPV-SALON-01</strong></span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">F5</kbd> Actualizar</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-700">ESC</kbd> Volver a Reportes</span>
        </div>
      </footer>
    </div>
  );
}

export default ReportLayout;

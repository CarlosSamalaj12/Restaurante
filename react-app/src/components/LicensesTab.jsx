/**
 * LicensesTab.jsx
 *
 * Tablero Ejecutivo y Centro de Control de Licencias y Terminales — SamaPos
 * Protegido para administradores.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff, Monitor, Utensils,
  Check, X, RefreshCw, Plus, Clock, AlertTriangle, Copy, Edit2,
  RotateCcw, Search, Sparkles, Filter, Info, ChevronRight, Activity,
  Laptop, Server, CheckCircle2, AlertCircle, Trash2, History, ExternalLink
} from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { getOrCreateSerial } from '../lib/terminalSerial';

function fmtDate(d) {
  if (!d) return 'Sin vencimiento (Permanente)';
  try {
    return new Date(d).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(d);
  }
}

function timeAgo(date) {
  if (!date) return 'Nunca';
  try {
    const diff = Date.now() - new Date(date).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Hace segundos';
    if (min < 60) return `Hace ${min} min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    const days = Math.floor(hrs / 24);
    return `Hace ${days} d`;
  } catch {
    return '—';
  }
}

function isRecentHeartbeat(date) {
  if (!date) return false;
  try {
    const diff = Date.now() - new Date(date).getTime();
    return diff < 10 * 60 * 1000; // Menos de 10 min
  } catch {
    return false;
  }
}

const PRESETS = [
  {
    id: 'trial_30',
    title: 'Demo / Evaluación',
    desc: '30 días, hasta 2 terminales',
    tier: 'trial',
    max_terminals: 2,
    offline_grace_days: 7,
    notes: 'Periodo de prueba para evaluación',
  },
  {
    id: 'std_restaurant',
    title: 'Estándar Restaurante',
    desc: 'Sin vencimiento, 5 terminales activas',
    tier: 'standard',
    max_terminals: 5,
    offline_grace_days: 7,
    notes: 'Plan estándar para restaurante (5 terminales)',
  },
  {
    id: 'std_unlimited',
    title: 'Pro Ilimitada',
    desc: 'Sin vencimiento, terminales ilimitadas (∞)',
    tier: 'standard',
    max_terminals: 0,
    offline_grace_days: 7,
    notes: 'Plan Pro con terminales ilimitadas',
  },
];

export function LicensesTab() {
  const toast = useToast();
  const currentSerial = useMemo(() => getOrCreateSerial(), []);

  const [licenses, setLicenses] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | active | history

  // Modales
  const [modalNewLicense, setModalNewLicense] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('std_unlimited');
  const [newLicForm, setNewLicForm] = useState({
    tier: 'standard',
    max_terminals: 0,
    offline_grace_days: 7,
    notes: 'Plan Pro con terminales ilimitadas',
  });

  const [editTerminalModal, setEditTerminalModal] = useState(null); // terminal object
  const [editForm, setEditForm] = useState({ label: '', terminal_type: 'pos' });

  const [approveModal, setApproveModal] = useState(null); // terminal object
  const [approveForm, setApproveForm] = useState({ label: '', terminal_type: 'pos' });

  const [revokeModal, setRevokeModal] = useState(null); // terminal object
  const [revokeReason, setRevokeReason] = useState('');

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [lics, terms, aud] = await Promise.all([
        api.licenses.list(),
        api.licenseTerminals.list(),
        api.licenseAudit.list(100),
      ]);
      setLicenses(Array.isArray(lics) ? lics : []);
      setTerminals(Array.isArray(terms) ? terms : []);
      setAudit(Array.isArray(aud) ? aud : []);
    } catch (e) {
      if (e?.status !== 403 && e?.message !== 'Error 403') {
        console.error('Error loading licenses:', e);
        toast.error('Error cargando datos de licencias: ' + (e.data?.error || e.message));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeLic = useMemo(() => licenses.find((l) => l.status === 'active'), [licenses]);

  const activeTerminalsCount = useMemo(
    () => terminals.filter((t) => t.status === 'active').length,
    [terminals]
  );
  const pendingTerminalsCount = useMemo(
    () => terminals.filter((t) => t.status === 'pending').length,
    [terminals]
  );

  // Terminales filtradas
  const filteredTerminals = useMemo(() => {
    return terminals.filter((t) => {
      // Filtro de pestaña
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'active' && t.status !== 'active') return false;
      if (statusFilter === 'history' && ['pending', 'active'].includes(t.status)) return false;

      // Filtro de búsqueda
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const label = (t.label || '').toLowerCase();
      const serial = (t.serial || '').toLowerCase();
      const ip = (t.ip_address || '').toLowerCase();
      const hostname = (t.hostname || '').toLowerCase();
      const type = (t.terminal_type || '').toLowerCase();
      return (
        label.includes(q) ||
        serial.includes(q) ||
        ip.includes(q) ||
        hostname.includes(q) ||
        type.includes(q)
      );
    });
  }, [terminals, statusFilter, searchTerm]);

  // Manejadores de acciones
  const handleCopySerial = async (serial) => {
    try {
      await navigator.clipboard.writeText(serial);
      toast.success('Serial copiado al portapapeles');
    } catch {
      toast.info(`Serial: ${serial}`);
    }
  };

  const openApproveModal = (t) => {
    const isThisPC = t.serial === currentSerial;
    setApproveForm({
      label: t.label || (isThisPC ? 'Servidor Principal (Esta PC)' : `Terminal ${t.id}`),
      terminal_type: t.terminal_type || 'pos',
    });
    setApproveModal(t);
  };

  const handleApproveSubmit = async (e) => {
    e?.preventDefault();
    if (!approveModal) return;
    setActionBusy(true);
    try {
      await api.licenseTerminals.approve(approveModal.id, approveForm.label);
      if (approveForm.terminal_type !== approveModal.terminal_type) {
        await api.licenseTerminals.update(approveModal.id, { terminal_type: approveForm.terminal_type });
      }
      toast.success(`Terminal "${approveForm.label}" aprobada exitosamente`);
      setApproveModal(null);
      await loadData(true);
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al aprobar terminal');
    } finally {
      setActionBusy(false);
    }
  };

  const openEditModal = (t) => {
    setEditForm({
      label: t.label || '',
      terminal_type: t.terminal_type || 'pos',
    });
    setEditTerminalModal(t);
  };

  const handleEditSubmit = async (e) => {
    e?.preventDefault();
    if (!editTerminalModal) return;
    setActionBusy(true);
    try {
      await api.licenseTerminals.update(editTerminalModal.id, {
        label: editForm.label,
        terminal_type: editForm.terminal_type,
      });
      toast.success('Datos de la terminal actualizados');
      setEditTerminalModal(null);
      await loadData(true);
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error actualizando terminal');
    } finally {
      setActionBusy(false);
    }
  };

  const openRevokeModal = (t) => {
    setRevokeReason('');
    setRevokeModal(t);
  };

  const handleRevokeSubmit = async (e) => {
    e?.preventDefault();
    if (!revokeModal) return;
    setActionBusy(true);
    try {
      await api.licenseTerminals.revoke(revokeModal.id, revokeReason || 'Revocada desde panel admin');
      toast.success(`Terminal "${revokeModal.label || revokeModal.id}" revocada`);
      setRevokeModal(null);
      await loadData(true);
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al revocar terminal');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReplaceTerminal = async (t) => {
    if (!window.confirm(`¿Marcar "${t.label || t.id}" como reemplazada? Esto liberará su cupo para un nuevo dispositivo.`)) return;
    setActionBusy(true);
    try {
      await api.licenseTerminals.replace(t.id);
      toast.success('Terminal marcada como reemplazada. Cupo liberado.');
      await loadData(true);
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al reemplazar terminal');
    } finally {
      setActionBusy(false);
    }
  };

  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    const p = PRESETS.find((x) => x.id === presetId);
    if (p) {
      setNewLicForm({
        tier: p.tier,
        max_terminals: p.max_terminals,
        offline_grace_days: p.offline_grace_days,
        notes: p.notes,
      });
    }
  };

  const handleCreateLicense = async (e) => {
    e?.preventDefault();
    setActionBusy(true);
    try {
      const body = {
        tier: newLicForm.tier,
        max_terminals: Number(newLicForm.max_terminals) || 0,
        offline_grace_days: Number(newLicForm.offline_grace_days) || 7,
        notes: newLicForm.notes || null,
      };
      await api.licenses.create(body);
      toast.success('Licencia activada con éxito');
      setModalNewLicense(false);
      await loadData(true);
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al crear licencia');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRevokeLicense = async (licId) => {
    if (!window.confirm('ADVERTENCIA: ¿Revocar esta licencia activa? Todas las terminales asociadas pasarán a estado revocado.')) return;
    setActionBusy(true);
    try {
      await api.licenses.revoke(licId);
      toast.success('Licencia revocada');
      await loadData(true);
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al revocar licencia');
    } finally {
      setActionBusy(false);
    }
  };

  // Cálculo de progreso de cupo
  const quotaPercent = useMemo(() => {
    if (!activeLic || !activeLic.max_terminals) return 0;
    return Math.min(Math.round((activeTerminalsCount / activeLic.max_terminals) * 100), 100);
  }, [activeLic, activeTerminalsCount]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Cargando centro de control de licencias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── BARRA SUPERIOR: KPI CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Licencia Actual */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-800/40 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Shield className="w-24 h-24 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Licencia del Sistema
              </span>
              {activeLic && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  activeLic.tier === 'standard' ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30' : 'bg-purple-500/30 text-purple-200 border border-purple-400/30'
                }`}>
                  {activeLic.tier}
                </span>
              )}
            </div>
            {activeLic ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-lg font-bold text-white tracking-tight">Licencia Activa</span>
                </div>
                <p className="text-xs text-slate-300 pt-1">
                  Vigencia: <span className="font-semibold text-white">{fmtDate(activeLic.valid_until)}</span>
                </p>
                <p className="text-[11px] text-indigo-200/80">
                  Gracia offline: {activeLic.offline_grace_days} días protegidos
                </p>
              </div>
            ) : (
              <div className="space-y-1 text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-bold">Sin Licencia Activa</span>
                </div>
                <p className="text-xs text-slate-400">Genera una licencia para autorizar terminales.</p>
              </div>
            )}
          </div>
          <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => setModalNewLicense(true)}
              className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Licencia
            </button>
            {activeLic && (
              <button
                onClick={() => handleRevokeLicense(activeLic.id)}
                className="text-[11px] text-red-300/80 hover:text-red-200 transition"
              >
                Revocar
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Cupo de Terminales */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cupo de Terminales
              </span>
              <Monitor className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{activeTerminalsCount}</span>
              <span className="text-sm font-medium text-slate-400">
                de {activeLic?.max_terminals === 0 ? '∞ ilimitadas' : (activeLic?.max_terminals ?? 0)}
              </span>
            </div>
            {/* Barra de progreso si tiene límite numérico */}
            {activeLic && activeLic.max_terminals > 0 && (
              <div className="mt-3">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      quotaPercent >= 90 ? 'bg-red-500' : quotaPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>{quotaPercent}% utilizado</span>
                  <span>{activeLic.max_terminals - activeTerminalsCount} libres</span>
                </div>
              </div>
            )}
            {activeLic && activeLic.max_terminals === 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Plan sin restricción de dispositivos
              </p>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Pendientes por autorizar:</span>
            <span className={`font-bold px-2 py-0.5 rounded-full ${
              pendingTerminalsCount > 0 ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-slate-100 text-slate-600'
            }`}>
              {pendingTerminalsCount}
            </span>
          </div>
        </div>

        {/* Card 3: Esta PC (Terminal Local / Servidor) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Esta Terminal (PC Actual)
              </span>
              <Laptop className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-800 text-sm truncate">Servidor / Permitido</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600 break-all select-all flex items-center justify-between">
              <span>{currentSerial.slice(0, 20)}…</span>
              <button
                onClick={() => handleCopySerial(currentSerial)}
                className="text-indigo-600 hover:text-indigo-800 p-1 hover:bg-white rounded transition"
                title="Copiar serial completo de esta PC"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Bypass Localhost Activo
            </span>
            <span className="text-[10px] text-slate-400">Siempre autorizado</span>
          </div>
        </div>

        {/* Card 4: Seguridad y Auditoría */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Auditoría y Red
              </span>
              <History className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                {terminals.length} Dispositivos Registrados
              </p>
              <p className="text-xs text-slate-500">
                Últimas {audit.length} acciones de seguridad registradas
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setShowAuditModal(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition"
            >
              <History className="w-3.5 h-3.5" /> Ver Historial
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Sincronizar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filtros por pestaña */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas ({terminals.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            Pendientes
            {pendingTerminalsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'pending' ? 'bg-white text-amber-700' : 'bg-amber-600 text-white'
              }`}>
                {pendingTerminalsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            Activas ({activeTerminalsCount})
          </button>
          <button
            onClick={() => setStatusFilter('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              statusFilter === 'history'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Historial / Inactivas ({terminals.filter((t) => !['pending', 'active'].includes(t.status)).length})
          </button>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, serial, IP..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── TABLA PRINCIPAL DE DISPOSITIVOS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dispositivos y Terminales</h3>
            <p className="text-xs text-slate-500">
              Control de hardware, pantallas de cocina (KDS) y cajas POS autorizadas
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {filteredTerminals.length} mostrado{filteredTerminals.length === 1 ? '' : 's'}
          </span>
        </div>

        {filteredTerminals.length === 0 ? (
          <div className="p-12 text-center">
            <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No se encontraron terminales</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? 'Prueba con otros términos de búsqueda.' : 'No hay terminales bajo este filtro.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Dispositivo</th>
                  <th className="px-6 py-3.5">Identificador (Serial)</th>
                  <th className="px-6 py-3.5">Red & IP</th>
                  <th className="px-6 py-3.5">Última Actividad</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTerminals.map((t) => {
                  const isThisPC = t.serial === currentSerial;
                  const recent = isRecentHeartbeat(t.last_seen_at);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isThisPC ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Dispositivo y Tipo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            t.terminal_type === 'kds'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {t.terminal_type === 'kds' ? (
                              <Utensils className="w-4 h-4" />
                            ) : (
                              <Monitor className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {t.label || (isThisPC ? 'Servidor Principal' : `Terminal #${t.id}`)}
                              </span>
                              {isThisPC && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  <Sparkles className="w-2.5 h-2.5" /> Esta PC
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium capitalize">
                              {t.terminal_type === 'kds' ? 'Pantalla de Cocina (KDS)' : 'Punto de Venta (POS)'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Identificador / Serial */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 bg-slate-100/70 px-2 py-1 rounded-lg w-fit">
                          <span>{t.serial.slice(0, 16)}…</span>
                          <button
                            onClick={() => handleCopySerial(t.serial)}
                            className="text-slate-400 hover:text-indigo-600 p-0.5"
                            title="Copiar serial completo"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        {t.hostname && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[180px]" title={t.hostname}>
                            Host: {t.hostname.slice(0, 24)}
                          </p>
                        )}
                      </td>

                      {/* Red & IP */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              recent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`}
                            title={recent ? 'En línea' : 'Inactiva / Sin latido reciente'}
                          />
                          <span className="font-mono text-slate-700">{t.ip_address || '—'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {recent ? 'En línea ahora' : 'Desconectada'}
                        </p>
                      </td>

                      {/* Última Actividad */}
                      <td className="px-6 py-4">
                        <p className="text-slate-800 font-medium">{timeAgo(t.last_seen_at)}</p>
                        <p className="text-[10px] text-slate-400">{fmtDate(t.last_seen_at)}</p>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          t.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                            : t.status === 'revoked'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {t.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                          {t.status === 'pending' && <Clock className="w-3 h-3" />}
                          {t.status === 'revoked' && <ShieldOff className="w-3 h-3" />}
                          {t.status === 'replaced' && <RotateCcw className="w-3 h-3" />}
                          <span className="capitalize">{t.status === 'replaced' ? 'Reemplazada' : t.status}</span>
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === 'pending' && (
                            <button
                              onClick={() => openApproveModal(t)}
                              disabled={actionBusy}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" /> Aprobar
                            </button>
                          )}

                          {t.status === 'active' && (
                            <>
                              <button
                                onClick={() => openEditModal(t)}
                                disabled={actionBusy}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                                title="Renombrar o cambiar tipo (POS / KDS)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleReplaceTerminal(t)}
                                disabled={actionBusy}
                                className="px-2 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition"
                                title="Reemplazar dispositivo (libera cupo)"
                              >
                                Reemplazar
                              </button>
                              <button
                                onClick={() => openRevokeModal(t)}
                                disabled={actionBusy}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                title="Revocar permiso"
                              >
                                <ShieldOff className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {['revoked', 'replaced'].includes(t.status) && (
                            <button
                              onClick={() => openApproveModal(t)}
                              disabled={actionBusy}
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg text-xs font-medium transition"
                            >
                              Re-aprobar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL APROBAR TERMINAL ── */}
      {approveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Aprobar Terminal</h3>
                  <p className="text-xs text-slate-500">Autorizar acceso al sistema POS / Cocina</p>
                </div>
              </div>
              <button
                onClick={() => setApproveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre o Alias del Dispositivo
                </label>
                <input
                  type="text"
                  required
                  value={approveForm.label}
                  onChange={(e) => setApproveForm({ ...approveForm, label: e.target.value })}
                  placeholder="Ej: Caja Principal, Barra, Tablet Terraza 1"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Función
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApproveForm({ ...approveForm, terminal_type: 'pos' })}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      approveForm.terminal_type === 'pos'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Monitor className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold">Punto de Venta</p>
                      <p className="text-[10px] text-slate-400">Mesas y cobros</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApproveForm({ ...approveForm, terminal_type: 'kds' })}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      approveForm.terminal_type === 'kds'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Utensils className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-xs font-bold">Cocina (KDS)</p>
                      <p className="text-[10px] text-slate-400">Comandas en vivo</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-[11px] text-slate-500">
                <p>
                  <strong>Serial:</strong> <span className="font-mono">{approveModal.serial}</span>
                </p>
                <p>
                  <strong>Dirección IP:</strong> <span className="font-mono">{approveModal.ip_address || '—'}</span>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModal(null)}
                  disabled={actionBusy}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionBusy || !approveForm.label.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {actionBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar Aprobación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR TERMINAL ── */}
      {editTerminalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Editar Dispositivo</h3>
                  <p className="text-xs text-slate-500">Modificar nombre o cambiar función</p>
                </div>
              </div>
              <button
                onClick={() => setEditTerminalModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre / Alias
                </label>
                <input
                  type="text"
                  required
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Función
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, terminal_type: 'pos' })}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      editForm.terminal_type === 'pos'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Monitor className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold">Punto de Venta</p>
                      <p className="text-[10px] text-slate-400">Mesas y cobros</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, terminal_type: 'kds' })}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      editForm.terminal_type === 'kds'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Utensils className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-xs font-bold">Cocina (KDS)</p>
                      <p className="text-[10px] text-slate-400">Comandas en vivo</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTerminalModal(null)}
                  disabled={actionBusy}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionBusy || !editForm.label.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {actionBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL REVOCAR TERMINAL ── */}
      {revokeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-red-100 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">¿Revocar Permiso?</h3>
                <p className="text-xs text-slate-500">
                  El dispositivo quedará bloqueado de inmediato
                </p>
              </div>
            </div>

            {revokeModal.serial === currentSerial && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-800 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  ATENCIÓN: Estás a punto de revocar la PC en la que te encuentras conectado actualmente.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-600 mb-3">
              Terminal: <strong className="text-slate-900">{revokeModal.label || revokeModal.id}</strong> (Serial: <span className="font-mono text-[11px]">{revokeModal.serial.slice(0, 16)}…</span>)
            </p>

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo de la revocación (opcional)
                </label>
                <input
                  type="text"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Ej: Cambio de equipo, extravío, baja de personal"
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokeModal(null)}
                  disabled={actionBusy}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {actionBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                  Revocar Ahora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVA LICENCIA (CON PRESETS) ── */}
      {modalNewLicense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Activar Nueva Licencia</h3>
                  <p className="text-xs text-slate-500">Selecciona un plan o define parámetros a medida</p>
                </div>
              </div>
              <button
                onClick={() => setModalNewLicense(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Selecciona un Plan / Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetSelect(p.id)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      selectedPreset === p.id
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{p.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateLicense} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo (Tier)</label>
                  <select
                    value={newLicForm.tier}
                    onChange={(e) => setNewLicForm({ ...newLicForm, tier: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="standard">Standard (Sin Vencimiento)</option>
                    <option value="trial">Trial (Evaluación 30 días)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Límite Terminales (0 = ∞)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newLicForm.max_terminals}
                    onChange={(e) => setNewLicForm({ ...newLicForm, max_terminals: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none"
                    placeholder="0 = ilimitadas"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Días de Gracia Offline (Sin Internet)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newLicForm.offline_grace_days}
                  onChange={(e) => setNewLicForm({ ...newLicForm, offline_grace_days: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Referencia</label>
                <textarea
                  value={newLicForm.notes}
                  onChange={(e) => setNewLicForm({ ...newLicForm, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNewLicense(false)}
                  disabled={actionBusy}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {actionBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Crear y Activar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIAL DE AUDITORÍA ── */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Historial y Auditoría de Seguridad</h3>
                  <p className="text-xs text-slate-500">Últimos eventos registrados en el subsistema de licencias</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 text-xs">
              {audit.length === 0 ? (
                <p className="p-8 text-center text-slate-400">No hay registros de auditoría aún.</p>
              ) : (
                audit.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 w-28">
                        {fmtDate(a.created_at)}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-100 shrink-0">
                        {a.action}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">
                          {a.actor_name || 'Sistema / Auto'}
                        </span>
                        {a.details && (
                          <span className="text-slate-500 ml-2 font-mono text-[10px]">
                            {typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

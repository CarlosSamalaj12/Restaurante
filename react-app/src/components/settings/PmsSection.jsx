import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  BedDouble,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Wifi,
  History,
  ShieldCheck,
  RefreshCw,
  Info,
  DollarSign,
  User,
  ArrowRightLeft
} from 'lucide-react';

export function PmsSection() {
  const [config, setConfig] = useState({
    is_enabled: 1,
    base_url: '',
    api_key: '',
    sandbox_mode: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [sandboxRooms, setSandboxRooms] = useState([]);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfg, hist, roomsRes] = await Promise.all([
        api.pms.getConfig().catch(() => ({ is_enabled: 1, sandbox_mode: 1 })),
        api.pms.getHistory(15).catch(() => []),
        api.pms.lookupRoom('').catch(() => ({ results: [] })),
      ]);
      if (cfg) setConfig(cfg);
      setHistory(hist || []);
      setSandboxRooms(roomsRes?.results || []);
    } catch (err) {
      console.error('Error cargando configuración PMS:', err);
      toast.error('Error al cargar ajustes de PMS');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const updated = await api.pms.updateConfig(config);
      setConfig(updated);
      toast.success('Configuración de Hotel PMS guardada');
      setTestResult(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.pms.testConnection();
      setTestResult(res);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      setTestResult({ ok: false, message: err.message });
      toast.error(err.message || 'Fallo de conexión');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Cargando integración Hotel PMS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white text-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xs border border-slate-200/90 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shrink-0 shadow-2xs">
              <BedDouble className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Integración Hotel PMS</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  {config.sandbox_mode ? 'Modo Sandbox' : 'PMS Externo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Permite a los meseros verificar crédito de habitaciones y cargar cuentas de restaurante directamente al folio del hotel.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            title="Refrescar datos"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        {/* Toggle Habilitar */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Habilitar Cargos a Habitación</h4>
            <p className="text-xs text-slate-500">Muestra la opción de pago "Cargo a Habitación" en el cobro de comandas</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(config.is_enabled)}
              onChange={(e) => setConfig({ ...config, is_enabled: e.target.checked ? 1 : 0 })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        {/* Selector de Modo: Sandbox vs Producción */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Modo de Operación del PMS
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConfig({ ...config, sandbox_mode: 1 })}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                config.sandbox_mode === 1
                  ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className={`w-4 h-4 ${config.sandbox_mode === 1 ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="font-extrabold text-xs text-slate-900">Modo Sandbox (Local)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Utiliza habitaciones simuladas pre-cargadas (101, 102, 204, etc.) para pruebas y entrenamiento sin depender de un servidor externo.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setConfig({ ...config, sandbox_mode: 0 })}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                config.sandbox_mode === 0
                  ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Wifi className={`w-4 h-4 ${config.sandbox_mode === 0 ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="font-extrabold text-xs text-slate-900">PMS Externo (Red / Web REST API)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Conecta por HTTP con tu sistema PMS en la red local o en la nube mediante API Key.
              </p>
            </button>
          </div>
        </div>

        {/* Inputs de Conexión Externa */}
        {config.sandbox_mode === 0 && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                URL Base de la API del PMS *
              </label>
              <input
                type="url"
                value={config.base_url || ''}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                placeholder="http://192.168.1.150:4000/api/v1/pms o https://pms.hotel.com/api/v1/pms"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Dirección IP o dominio donde responde tu servidor hotelero.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clave Secreta de API (X-PMS-API-Key)
              </label>
              <input
                type="password"
                value={config.api_key || ''}
                onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                placeholder="pos_sec_live_..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-teal-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Test Connection Button & Result */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> : <Wifi className="w-4 h-4 text-teal-600" />}
            <span>Probar Conectividad con PMS</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Configuración</span>
          </button>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2.5 ${
              testResult.ok
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </form>

      {/* Habitaciones Activas de Prueba (Sandbox) */}
      {config.sandbox_mode === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-teal-600" />
                Habitaciones Activas para Pruebas (Sandbox)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Los meseros pueden cobrar a estas habitaciones desde el Punto de Venta usando el buscador:
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700">
              {sandboxRooms.length} habitaciones
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sandboxRooms.map((r) => (
              <div
                key={r.room_number}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-extrabold bg-teal-600 text-white">
                      Hab. {r.room_number}
                    </span>
                    <p className="font-bold text-slate-900 text-xs mt-1.5">{r.guest.full_name}</p>
                    <p className="text-[10px] text-slate-400">{r.room_type}</p>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      r.credit.post_allowed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {r.credit.post_allowed ? 'Crédito OK' : 'No-Post'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-slate-200/60 text-center text-[10px]">
                  <div>
                    <span className="text-slate-400 block">Saldo Usado</span>
                    <span className="font-bold text-slate-700">Q{r.credit.current_balance.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Disponible</span>
                    <span className="font-extrabold text-teal-600">Q{r.credit.available_credit.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de Cargos Recientes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Historial de Cargos a Habitaciones
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Últimos cobros enviados al hotel desde las comandas</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Aún no se han registrado cobros a habitaciones desde el POS.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Habitación</th>
                  <th className="py-2.5 px-3">Huésped</th>
                  <th className="py-2.5 px-3">Comanda</th>
                  <th className="py-2.5 px-3 text-right">Monto</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3">Transacción</th>
                  <th className="py-2.5 px-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <span className="font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200/80">
                        #{h.room_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{h.guest_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{h.check_number ? `#${h.check_number}` : `Cta ${h.account_id}`}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                      Q{Number(h.amount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status === 'applied'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {h.status === 'applied' ? 'Aplicado' : 'Reversado'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{h.transaction_id}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-400">
                      {new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

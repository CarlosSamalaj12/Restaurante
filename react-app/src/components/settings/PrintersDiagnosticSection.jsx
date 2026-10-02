import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Printer,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Activity
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function PrintersDiagnosticSection() {
  const [status, setStatus] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [s, j] = await Promise.all([
        api.getPrintServiceStatus(),
        api.getPrintJobs(50),
      ]);
      setStatus(s);
      setJobs(j.jobs || []);
    } catch (e) {
      toast.error(`Error cargando diagnóstico: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusBadge = (s) => {
    if (s === 'success') {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-md font-semibold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          OK
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-700 border border-rose-200/80 px-2 py-0.5 rounded-md font-semibold">
          <XCircle className="w-3 h-3 text-rose-600" />
          Falló
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold">
        <Clock className="w-3 h-3 text-amber-600" />
        {s}
      </span>
    );
  };

  const typeLabel = (t) => {
    if (t === 'kitchen_ticket') return 'Comanda';
    if (t === 'customer_receipt') return 'Recibo';
    if (t === 'test') return 'Prueba';
    return t;
  };

  const successCount = jobs.filter((j) => j.status === 'success').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Impresoras</h2>
          <p className="text-sm text-gray-500">
            Diagnóstico del servicio de impresión. Si una impresora no responde, revisá acá.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="group px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl shadow-2xs transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
          <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Servicio</p>
          <p className={`text-lg font-semibold ${status?.escposAvailable ? 'text-emerald-700' : 'text-red-700'}`}>
            {status?.escposAvailable ? 'Activo' : 'No disponible'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Impresiones OK (últimas {jobs.length})</p>
          <p className="text-lg font-semibold text-emerald-700">{successCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Fallos (últimas {jobs.length})</p>
          <p className={`text-lg font-semibold ${failedCount > 0 ? 'text-red-700' : 'text-gray-700'}`}>
            {failedCount}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">Últimos trabajos de impresión</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Cargando…</div>
        ) : jobs.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            No hay trabajos de impresión aún. Las comandas y recibos que se hayan enviado aparecerán acá.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {jobs.map((j) => (
              <div key={j.id} className="p-3 text-sm flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{j.printer_target}</span>
                    {statusBadge(j.status)}
                    <span className="text-xs text-gray-500">{typeLabel(j.job_type)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {j.printer_ip ? `${j.printer_ip}:${j.printer_port || 9100}` : 'Sin IP'}
                    {j.account_id ? ` · cuenta #${j.account_id}` : ''}
                    {' · '}
                    {j.created_at ? new Date(j.created_at).toLocaleString('es-GT') : ''}
                    {j.attempts > 0 ? ` · ${j.attempts} intento(s)` : ''}
                  </p>
                  {j.error_message && (
                    <p className="text-xs text-red-600 mt-1 font-mono break-all">{j.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-900/90 font-medium">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          Para diagnosticar una impresora en particular, andá a la pestaña{' '}
          <strong>Producción</strong> o <strong>Terminales</strong> y usá el botón de prueba de impresión{' '}
          <Printer className="w-3.5 h-3.5 inline text-emerald-600 align-text-bottom" />.
        </span>
      </div>
    </div>
  );
}

// Modifiers Section

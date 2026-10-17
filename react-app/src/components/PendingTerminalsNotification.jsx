// react-app/src/components/PendingTerminalsNotification.jsx
// Notificación flotante en tiempo real y modal de aprobación rápida para el Super Admin

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import api from '../api';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Monitor,
  Check,
  X,
  ShieldAlert,
  Loader2,
  Clock,
  Wifi,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

function formatPendingTerminalName(t) {
  if (!t) return 'Terminal';
  if (t.label && t.label.trim()) return t.label.trim();
  if (t.os_info) {
    const osClean = t.os_info.split('|')[0]?.trim();
    if (osClean && !osClean.includes('unknown')) {
      return `${osClean} (${t.ip_address || 'Red local'})`;
    }
  }
  return `Terminal #${t.id || (t.serial ? t.serial.slice(0, 8) : '')}`;
}

const POLL_INTERVAL_MS = 8000; // 8 segundos

export function PendingTerminalsNotification() {
  const { user } = useAuth();
  const toast = useToast();

  const [pendingList, setPendingList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);

  // Solo los administradores reciben estas notificaciones
  const isAdmin = user?.role === 'admin';

  const checkPending = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.licenseTerminals.getPendingCount();
      if (res?.terminals) {
        setPendingList(res.terminals);
      } else {
        setPendingList([]);
      }
    } catch (e) {
      // Ignorar errores silenciosos en sondeo
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    checkPending();
    const interval = setInterval(checkPending, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAdmin, checkPending]);

  const handleApprove = async (terminal) => {
    setActionBusyId(terminal.id);
    try {
      await api.licenseTerminals.approve(terminal.id, terminal.label);
      toast.success(`Terminal "${terminal.label || terminal.id}" aprobada exitosamente`);
      // Refrescar lista
      const updated = pendingList.filter((t) => t.id !== terminal.id);
      setPendingList(updated);
      if (updated.length === 0) {
        setModalOpen(false);
      }
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al aprobar terminal');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleReject = (terminal) => {
    setConfirmReject(terminal);
  };

  const executeReject = async (terminal) => {
    setActionBusyId(terminal.id);
    try {
      await api.licenseTerminals.reject(terminal.id, 'Rechazado por el Administrador');
      toast.info(`Acceso rechazado para "${formatPendingTerminalName(terminal)}"`);
      const updated = pendingList.filter((t) => t.id !== terminal.id);
      setPendingList(updated);
      setConfirmReject(null);
      if (updated.length === 0) {
        setModalOpen(false);
      }
    } catch (err) {
      toast.error(err?.data?.error || err?.message || 'Error al rechazar terminal');
    } finally {
      setActionBusyId(null);
    }
  };

  if (!isAdmin || pendingList.length === 0) {
    return null;
  }

  const pendingCount = pendingList.length;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────── */}
      {/* BADGE FLOTANTE SUPERIOR EN TIEMPO REAL */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="fixed top-3 right-4 z-50 animate-bounce duration-1000">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-orange-500/25 border-2 border-white/40 backdrop-blur-md cursor-pointer transition-all active:scale-95"
        >
          <div className="relative">
            <Monitor className="w-4 h-4 stroke-[2.5]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
          </div>
          <span>
            {pendingCount === 1 ? '1 PC solicita acceso' : `${pendingCount} PCs solicitan acceso`}
          </span>
          <span className="px-1.5 py-0.5 bg-black/20 rounded-md text-[10px] font-black uppercase">
            Revisar
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MODAL DE APROBACIÓN / RECHAZO RÁPIDO */}
      {/* ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cabecera del modal */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    Solicitudes de Acceso a Terminales
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {pendingCount} equipo{pendingCount !== 1 ? 's' : ''} esperando tu autorización
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de solicitudes */}
            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 divide-y divide-slate-100">
              {pendingList.map((t) => {
                const busy = actionBusyId === t.id;
                return (
                  <div key={t.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-extrabold text-slate-900 text-sm">
                            {formatPendingTerminalName(t)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                            Pendiente
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                          {t.ip_address && (
                            <span>IP: <strong className="text-slate-600">{t.ip_address}</strong></span>
                          )}
                          {t.first_seen_at && (
                            <span className="flex items-center gap-1 font-sans">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{new Date(t.first_seen_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {/* Botón Aceptar (Verde) */}
                      <button
                        type="button"
                        onClick={() => handleApprove(t)}
                        disabled={busy}
                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm shadow-emerald-600/20 cursor-pointer"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>Aceptar Acceso</span>
                      </button>

                      {/* Botón Rechazar (Rojo) */}
                      <button
                        type="button"
                        onClick={() => handleReject(t)}
                        disabled={busy}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer con aviso */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <p className="text-[11px] text-slate-500 font-medium">
                Al presionar <strong>Aceptar Acceso</strong>, la terminal se desbloqueará de inmediato en la otra PC.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para rechazar acceso */}
      {confirmReject && (
        <ConfirmDialog
          isOpen={Boolean(confirmReject)}
          title="¿Rechazar solicitud de acceso?"
          message="Esta terminal quedará bloqueada en la pantalla de control de acceso y no podrá acceder al sistema."
          itemName={formatPendingTerminalName(confirmReject)}
          itemDetail={`Serial: ${confirmReject.serial} · IP: ${confirmReject.ip_address || 'Red local'}`}
          confirmText="Rechazar Acceso"
          cancelText="Cancelar"
          variant="danger"
          icon={ShieldAlert}
          loading={Boolean(actionBusyId)}
          onConfirm={() => executeReject(confirmReject)}
          onCancel={() => !actionBusyId && setConfirmReject(null)}
        />
      )}
    </>
  );
}

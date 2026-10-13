/**
 * LicenseBlock.jsx
 *
 * Pantalla de control de acceso y licencias de terminales.
 * Flujo intuitivo y minimalista:
 *  - Solicitud interactiva de acceso con nombre personalizado de PC
 *  - Espera activa con sondeo automático y stepper en tiempo real
 *  - Bloqueo claro de terminal revocada con opción de reenviar solicitud
 *  - Acceso inmediato con PIN de Super Admin en sitio
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Copy,
  Check,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Monitor,
  Send,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import api from '../api';
import { tokenStorage } from '../lib/tokenStorage';
import { CustomIcon, StepIcon } from './icons/CustomIcons';

const PENDING_AUTO_REFRESH_MS = 5000; // Sondeo cada 5s

export function LicenseBlock({
  status,
  reason,
  online,
  onRetry,
  serial,
  label: initialLabel,
  firstSeenAt,
  ipAddress,
  onRequestAccess
}) {
  const [copied, setCopied] = useState(false);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const [countdown, setCountdown] = useState(PENDING_AUTO_REFRESH_MS / 1000);

  // Modo solicitud interactiva
  const [requestMode, setRequestMode] = useState(status === 'revoked' ? false : !initialLabel && status === 'pending');
  const [terminalName, setTerminalName] = useState(initialLabel || '');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState(null);

  // Modo PIN de administrador
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState(null);
  const pinInputRef = useRef(null);

  const config = getBlockConfig(status, reason, online);

  const copySerial = useCallback(async () => {
    if (!serial) return;
    try {
      await navigator.clipboard.writeText(serial);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.createElement('textarea');
      el.value = serial;
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {}
      document.body.removeChild(el);
    }
  }, [serial]);

  // Auto-refresh cuando está esperando aprobación (cada 5s)
  useEffect(() => {
    if (status !== 'pending' || !onRetry) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      setAutoRetrying(true);
      try {
        await onRetry();
      } catch {}
      if (cancelled) return;
      setAutoRetrying(false);
    };
    const id = setInterval(tick, PENDING_AUTO_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, onRetry]);

  useEffect(() => {
    if (status !== 'pending') return;
    setCountdown(PENDING_AUTO_REFRESH_MS / 1000);
    const id = setInterval(() => {
      setCountdown((c) => (c <= 1 ? PENDING_AUTO_REFRESH_MS / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [status, autoRetrying]);

  // Enfocar input de PIN
  useEffect(() => {
    if (pinMode && pinInputRef.current) pinInputRef.current.focus();
  }, [pinMode]);

  // Enviar solicitud de acceso
  const handleRequestSubmit = async (e) => {
    e?.preventDefault();
    if (!terminalName.trim()) {
      setRequestError('Por favor ingresa un nombre para identificar esta terminal');
      return;
    }
    setRequestBusy(true);
    setRequestError(null);
    try {
      if (onRequestAccess) {
        const ok = await onRequestAccess(terminalName.trim());
        if (ok) {
          setRequestMode(false);
        } else {
          setRequestError('No se pudo enviar la solicitud. Revisa la conexión.');
        }
      } else {
        await api.license.requestAccess({
          serial,
          label: terminalName.trim(),
        });
        setRequestMode(false);
        onRetry && onRetry();
      }
    } catch (err) {
      setRequestError(err?.data?.error || err?.message || 'Error al enviar solicitud');
    } finally {
      setRequestBusy(false);
    }
  };

  // Aprobación local con PIN de Super Admin
  const handlePinSubmit = async (e) => {
    e?.preventDefault();
    if (!pin || !serial) return;
    setPinBusy(true);
    setPinError(null);
    try {
      const result = await api.licenseAdmin.approveSelf({ pin, serial });
      if (result?.authToken && result?.user) {
        tokenStorage.setToken(result.authToken);
        tokenStorage.setUser(result.user);
        window.location.reload();
        return;
      }
    } catch (err) {
      setPinError(err?.data?.error || err?.message || 'PIN incorrecto o no pertenece a un administrador');
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Luces sutiles de fondo */}
      <div className="absolute top-0 -left-32 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen opacity-10 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-32 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

      <div className="relative w-full max-w-md">
        {/* Badge superior SamaPos */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-3.5 py-1 text-xs text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-bold tracking-wide">SamaPos · Control de Acceso</span>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8">
          {/* Icono de estado */}
          <div className="flex justify-center mb-4">
            <CustomIcon status={status} />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 text-center tracking-tight">
            {config.title}
          </h1>
          <p className="text-slate-600 mb-5 text-center text-xs sm:text-sm leading-relaxed">
            {config.message}
          </p>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* CASO 1: FORMULARIO DE SOLICITUD INTERACTIVA */}
          {/* ─────────────────────────────────────────────────────────── */}
          {requestMode ? (
            <form onSubmit={handleRequestSubmit} className="space-y-4 mb-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  ¿Cómo identificar esta terminal en el sistema?
                </label>
                <div className="relative">
                  <Monitor className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={terminalName}
                    onChange={(e) => setTerminalName(e.target.value)}
                    placeholder="Ej. Caja 2, Barra, Tablet Terraza..."
                    disabled={requestBusy}
                    className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  El Super Administrador verá este nombre en su pantalla para aceptar o rechazar el acceso.
                </p>
              </div>

              {requestError && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  {requestError}
                </div>
              )}

              <button
                type="submit"
                disabled={requestBusy || !terminalName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer text-xs uppercase tracking-wider"
              >
                {requestBusy ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{requestBusy ? 'Enviando Solicitud...' : 'Enviar Solicitud al Administrador'}</span>
              </button>

              {status === 'revoked' && (
                <button
                  type="button"
                  onClick={() => setRequestMode(false)}
                  className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Volver al mensaje de bloqueo
                </button>
              )}
            </form>
          ) : (
            <>
              {/* Stepper visual solo en pending */}
              {status === 'pending' && (
                <div className="mb-5 px-1">
                  <div className="flex items-start justify-between gap-1">
                    <StepItem n={1} label="Solicitud enviada" state="done" />
                    <Connector active />
                    <StepItem n={2} label="Esperando al Admin" state="active" />
                    <Connector />
                    <StepItem n={3} label="Acceso concedido" state="pending" />
                  </div>
                </div>
              )}

              {/* Botón para enviar nueva solicitud si está revocada */}
              {status === 'revoked' && (
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setRequestMode(true);
                      setTerminalName(initialLabel || '');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer text-xs uppercase tracking-wider"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Nueva Solicitud de Acceso</span>
                  </button>
                </div>
              )}

              {/* Tarjeta de información de la terminal */}
              {serial && (
                <div className="bg-slate-50 rounded-2xl p-3.5 mb-4 text-left border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">
                      Identificador de Terminal
                    </div>
                    <button
                      onClick={copySerial}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition px-2 py-0.5 rounded cursor-pointer"
                      title="Copiar serial"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar Serial
                        </>
                      )}
                    </button>
                  </div>

                  <div className="font-mono text-xs text-slate-800 break-all select-all font-bold">
                    {serial}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1">
                    {initialLabel && (
                      <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                        <span className="text-[11px] text-slate-400 font-normal">Nombre asignado:</span>
                        <span>{initialLabel}</span>
                      </div>
                    )}
                    {ipAddress && (
                      <div className="flex items-center justify-between text-xs text-slate-700 font-mono">
                        <span className="text-[11px] text-slate-400 font-sans font-normal">Dirección IP:</span>
                        <span>{ipAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estado de conexión + contador */}
              <div className="flex items-center justify-between mb-3 text-[11px] text-slate-500 px-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  {online ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-rose-500" />}
                  {online ? 'Conectado al servidor' : 'Sin conexión'}
                </span>
                {status === 'pending' && (
                  <span className="flex items-center gap-1.5 font-mono text-blue-600 font-bold">
                    <span className={`w-2 h-2 rounded-full ${autoRetrying ? 'bg-blue-600 animate-ping' : 'bg-blue-400'}`} />
                    {autoRetrying ? 'verificando...' : `próximo check ${countdown}s`}
                  </span>
                )}
              </div>

              {/* Botón Reintentar Manual */}
              {onRetry && (
                <button
                  onClick={onRetry}
                  disabled={autoRetrying}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 text-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${autoRetrying ? 'animate-spin' : ''}`} />
                  <span>{autoRetrying ? 'Comprobando autorización...' : 'Comprobar Aprobación Ahora'}</span>
                </button>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* BOOTSTRAP / OVERRIDE CON PIN DE SUPER ADMIN */}
              {/* ─────────────────────────────────────────────────────────── */}
              {status === 'pending' && (
                <>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">o bien</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {!pinMode ? (
                    <button
                      onClick={() => setPinMode(true)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 text-xs cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>¿Eres Admin? Autorizar en sitio con PIN</span>
                    </button>
                  ) : (
                    <form onSubmit={handlePinSubmit} className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <label className="text-[11px] uppercase tracking-wider text-slate-600 font-black flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>PIN de Super Administrador</span>
                      </label>
                      <div className="relative">
                        <input
                          ref={pinInputRef}
                          type={showPin ? 'text' : 'password'}
                          inputMode="numeric"
                          value={pin}
                          onChange={(e) => {
                            setPin(e.target.value.replace(/\D/g, '').slice(0, 8));
                            setPinError(null);
                          }}
                          placeholder="••••"
                          disabled={pinBusy}
                          className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {pinError && (
                        <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 text-center">
                          {pinError}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPinMode(false);
                            setPin('');
                            setPinError(null);
                          }}
                          disabled={pinBusy}
                          className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={pinBusy || !pin}
                          className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {pinBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Aprobar y Entrar</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepItem({ n, label, state }) {
  const stateClass = {
    done: 'text-emerald-700 font-black',
    active: 'text-blue-700 font-black',
    pending: 'text-slate-400 font-semibold',
  }[state];

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div
        className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          state === 'done'
            ? 'bg-emerald-100 text-emerald-700'
            : state === 'active'
            ? 'bg-blue-100 text-blue-700 ring-4 ring-blue-50'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        <StepIcon state={state} />
      </div>
      <div className={`text-[10px] text-center leading-tight ${stateClass}`}>
        {label}
      </div>
    </div>
  );
}

function Connector({ active }) {
  return (
    <div
      className={`flex-shrink-0 h-0.5 w-6 mt-4 rounded-full transition-all ${
        active ? 'bg-blue-500' : 'bg-slate-200'
      }`}
    />
  );
}

function getBlockConfig(status, reason, online) {
  switch (status) {
    case 'pending':
      return {
        title: 'Esperando Aprobación',
        message: 'Esta terminal ha solicitado acceso. El Super Administrador debe aceptarla desde el panel para autorizarla.',
      };
    case 'revoked':
      return {
        title: 'Acceso Denegado / Terminal Revocada',
        message: 'El acceso de esta terminal fue revocado o denegado por el Administrador. No tiene autorización para ingresar al POS.',
      };
    case 'expired':
    case 'license_expired':
      return {
        title: 'Licencia Vencida',
        message: 'La suscripción del restaurante ha caducado. Contacta al administrador para renovarla.',
      };
    case 'license_inactive':
      return {
        title: 'Licencia Inactiva',
        message: 'La licencia del sistema fue suspendida.',
      };
    case 'offline':
      return {
        title: 'Modo Offline',
        message: 'Operando sin conexión mediante licencia temporal en memoria.',
      };
    case 'unknown':
    default:
      return {
        title: online === false
          ? 'Sin Conexión con el Servidor'
          : (reason === 'rate-limited' ? 'Límite de Solicitudes Temporal' : 'Verificando Autorización'),
        message: online === false
          ? 'No se puede contactar al servidor central del POS.'
          : (reason === 'rate-limited'
              ? 'Se enviaron demasiadas solicitudes al servidor. El sistema reintentará en unos segundos...'
              : 'Comprobando el estado de licencia de este equipo...'),
      };
  }
}

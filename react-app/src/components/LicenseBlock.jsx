/**
 * LicenseBlock.jsx
 *
 * Pantalla de bloqueo cuando la terminal no puede operar.
 *
 * Mejoras visuales:
 *  - Íconos custom SVG (no Lucide) — más identidad de marca
 *  - Glassmorphism en el card principal
 *  - Stepper visual con íconos custom
 *  - Campo "Bootstrap con PIN de admin" (auto-aprueba la propia terminal)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, Wifi, WifiOff, RefreshCw, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';
import api from '../api';
import { tokenStorage } from '../lib/tokenStorage';
import { CustomIcon, StepIcon } from './icons/CustomIcons';

const PENDING_AUTO_REFRESH_MS = 15_000; // 15s

export function LicenseBlock({ status, reason, online, onRetry, serial, firstSeenAt, ipAddress }) {
  const [copied, setCopied] = useState(false);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const [countdown, setCountdown] = useState(PENDING_AUTO_REFRESH_MS / 1000);
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
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
      document.body.removeChild(el);
    }
  }, [serial]);

  // Auto-refresh cuando está esperando aprobación.
  useEffect(() => {
    if (status !== 'pending' || !onRetry) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      setAutoRetrying(true);
      try { await onRetry(); } catch {}
      if (cancelled) return;
      setAutoRetrying(false);
    };
    const initialId = setTimeout(tick, 5_000);
    const id = setInterval(tick, PENDING_AUTO_REFRESH_MS);
    return () => { cancelled = true; clearTimeout(initialId); clearInterval(id); };
  }, [status, onRetry]);

  useEffect(() => {
    if (status !== 'pending') return;
    setCountdown(PENDING_AUTO_REFRESH_MS / 1000);
    const id = setInterval(() => {
      setCountdown((c) => (c <= 1 ? PENDING_AUTO_REFRESH_MS / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [status, autoRetrying]);

  // Abrir input de PIN → autofocus
  useEffect(() => {
    if (pinMode && pinInputRef.current) pinInputRef.current.focus();
  }, [pinMode]);

  const handlePinSubmit = async (e) => {
    e?.preventDefault?.();
    if (!pin || !serial) return;
    setPinBusy(true);
    setPinError(null);
    try {
      const result = await api.licenseAdmin.approveSelf({ pin, serial });
      if (result?.authToken && result?.user) {
        // Guardar sesión admin y recargar
        tokenStorage.setToken(result.authToken);
        tokenStorage.setUser(result.user);
        // Recargar para que useAuth tome el nuevo token
        window.location.reload();
        return;
      }
    } catch (err) {
      setPinError(err?.data?.error || err?.message || 'No se pudo aprobar');
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Animated blobs */}
      <div className="absolute top-0 -left-32 w-[28rem] h-[28rem] bg-indigo-500 rounded-full mix-blend-screen opacity-10 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-32 w-[28rem] h-[28rem] bg-purple-500 rounded-full mix-blend-screen opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500 rounded-full mix-blend-screen opacity-[0.05] blur-3xl animate-pulse" style={{ animationDelay: '0.8s' }} />

      <div className="relative w-full max-w-md">
        {/* Top brand badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-xs text-indigo-200">
            <Sparkles className="w-3 h-3" />
            <span className="font-medium">SamaPos · Licencias</span>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-7 sm:p-8">
          {/* Icono principal custom */}
          <div className="flex justify-center mb-5">
            <CustomIcon status={status} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center tracking-tight">
            {config.title}
          </h1>
          <p className="text-gray-600 mb-6 text-center text-sm sm:text-base leading-relaxed">
            {config.message}
          </p>

          {/* Stepper visual solo en pending */}
          {status === 'pending' && (
            <div className="mb-6 px-1">
              <div className="flex items-start justify-between gap-1">
                <StepItem n={1} label="Registrada" state="done" />
                <Connector active />
                <StepItem n={2} label="Esperando admin" state="active" />
                <Connector />
                <StepItem n={3} label="Activa" state="pending" />
              </div>
            </div>
          )}

          {/* Serial + copiar */}
          {serial && (
            <div className="bg-gray-50 rounded-xl p-3.5 mb-4 text-left border border-gray-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  Serial de la terminal
                </div>
                <button
                  onClick={copySerial}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition px-2 py-0.5 rounded hover:bg-indigo-50"
                  title="Copiar al portapapeles"
                >
                  {copied ? (
                    <><Check className="w-3 h-3" /> Copiado</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copiar</>
                  )}
                </button>
              </div>
              <div className="font-mono text-xs sm:text-sm text-gray-800 break-all select-all leading-relaxed">
                {serial}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-gray-200 space-y-1">
                {ipAddress && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <span className="font-mono bg-gray-200 px-1.5 rounded">IP</span>
                    <span className="font-mono">{ipAddress}</span>
                  </div>
                )}
                {firstSeenAt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <span className="font-mono bg-gray-200 px-1.5 rounded">t</span>
                    <span>Registrada {formatRelative(firstSeenAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {config.showContact && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-4 mb-4 text-left">
              <p className="text-sm text-blue-900 leading-relaxed">
                <strong className="flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  ¿Cómo destrabar esto?
                </strong>
                <span>{config.contactText}</span>
              </p>
            </div>
          )}

          {/* Estado de conexión + countdown */}
          <div className="flex items-center justify-between mb-3 text-[11px] text-gray-500 px-1">
            <span className="flex items-center gap-1.5">
              {online ? <Wifi className="w-3.5 h-3.5 text-green-500" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
              {online ? 'Conectado al servidor' : 'Sin conexión'}
            </span>
            {status === 'pending' && (
              <span className="flex items-center gap-1.5 font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${autoRetrying ? 'bg-indigo-500 animate-pulse' : 'bg-gray-400'}`} />
                {autoRetrying ? 'verificando…' : `próx. check ${countdown}s`}
              </span>
            )}
          </div>

          {/* Botón reintentar (manual) */}
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={autoRetrying}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${autoRetrying ? 'animate-spin' : ''}`} />
              {autoRetrying ? 'Verificando con el servidor…' : 'Reintentar ahora'}
            </button>
          )}

          {/* ───────── Bootstrap con PIN de admin ───────── */}
          {status === 'pending' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">o</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              </div>

              {!pinMode ? (
                <button
                  onClick={() => setPinMode(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg shadow-indigo-500/30"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Soy admin · aprobar esta terminal
                </button>
              ) : (
                <form onSubmit={handlePinSubmit} className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    PIN de administrador
                  </label>
                  <div className="relative">
                    <input
                      ref={pinInputRef}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      autoComplete="off"
                      value={pin}
                      onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 12)); setPinError(null); }}
                      placeholder="••••"
                      disabled={pinBusy}
                      className="w-full bg-white border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl px-4 py-3 pr-10 text-center text-2xl font-mono tracking-[0.5em] text-gray-900 placeholder-gray-300 transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      tabIndex={-1}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pinError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {pinError}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setPinMode(false); setPin(''); setPinError(null); }}
                      disabled={pinBusy}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium py-2.5 rounded-lg transition text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={pinBusy || !pin}
                      className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition text-sm flex items-center justify-center gap-1.5"
                    >
                      {pinBusy ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Aprobando…</>
                      ) : (
                        <>Aprobar y entrar</>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center pt-1">
                    Solo funciona con un PIN de un usuario admin. La terminal se aprueba y se inicia sesión automáticamente.
                  </p>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-[10px] text-white/30 text-center mt-4 font-mono">
          sama-pos-license-v1
        </p>
      </div>
    </div>
  );
}

function StepItem({ n, label, state }) {
  const stateClass = {
    done: 'text-emerald-600',
    active: 'text-amber-600',
    pending: 'text-gray-300',
  }[state];
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className={`relative w-9 h-9 rounded-full flex items-center justify-center transition ${
        state === 'done' ? 'bg-emerald-100' :
        state === 'active' ? 'bg-amber-100' : 'bg-gray-100'
      }`}>
        {state === 'active' && <span className="absolute inset-0 rounded-full bg-amber-300 opacity-40 animate-ping" />}
        <span className="relative">
          <StepIcon state={state} />
        </span>
      </div>
      <div className={`text-[10px] text-center leading-tight font-medium ${stateClass}`}>
        {label}
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex-shrink-0 h-0.5 w-6 -mt-3.5 rounded-full bg-gradient-to-r from-gray-200 via-gray-200 to-gray-200" />
  );
}

function formatRelative(date) {
  try {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `hace ${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `hace ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `hace ${hr} h`;
    return d.toLocaleString();
  } catch {
    return '—';
  }
}

function getBlockConfig(status, reason, online) {
  switch (status) {
    case 'pending':
      return {
        title: 'Esperando aprobación',
        message: 'Esta terminal está registrada pero el administrador aún no la ha aprobado.',
        showContact: true,
        contactText: 'Si sos el admin, usá el botón de abajo con tu PIN para aprobar esta terminal al toque. Si no, pedile al admin que la apruebe desde el panel.',
      };
    case 'revoked':
      return {
        title: 'Terminal revocada',
        message: 'El administrador revocó el permiso de esta terminal.',
        showContact: true,
        contactText: 'Contacta al administrador para reactivar esta terminal o usa otra máquina autorizada.',
      };
    case 'expired':
    case 'license_expired':
      return {
        title: 'Licencia vencida',
        message: 'La licencia de este restaurante venció. No se pueden registrar más operaciones.',
        showContact: true,
        contactText: 'Pídele al administrador que renueve o upgrade la licencia en Settings → Licencias.',
      };
    case 'license_inactive':
      return {
        title: 'Licencia inactiva',
        message: 'La licencia del sistema fue desactivada.',
        showContact: true,
        contactText: 'Contacta al administrador del sistema.',
      };
    case 'offline':
      return {
        title: 'Modo offline',
        message: 'No hay conexión con el servidor, pero la licencia cacheada permite seguir operando.',
        showContact: false,
      };
    case 'unknown':
    default:
      return {
        title: online === false ? 'Sin conexión' : 'Conectando con el servidor',
        message: online === false
          ? 'No se puede contactar al servidor y no hay licencia offline guardada.'
          : 'Verificando licencia de la terminal...',
        showContact: online === false,
        contactText: 'Verifica la conexión de red. Si el problema persiste, contacta al administrador.',
      };
  }
}

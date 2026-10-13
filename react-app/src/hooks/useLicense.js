/**
 * useLicense.js
 *
 * Hook que mantiene el "latido" y estado de autorización de la terminal con el servidor.
 *
 * Estados posibles:
 *   - 'unknown'        → verificando con el servidor
 *   - 'pending'        → solicitud de acceso enviada, esperando que el Super Admin acepte
 *   - 'active'         → terminal autorizada, la app puede operar
 *   - 'offline'        → sin red, operando con token cacheado
 *   - 'expired'        → el token offline venció
 *   - 'revoked'        → terminal revocada o rechazada por el administrador
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { getOrCreateSerial, getHostname, getOSInfo } from '../lib/terminalSerial';
import { saveLicenseToken, loadLicensePayload, clearLicenseToken } from '../lib/licenseStorage';

const PENDING_POLL_INTERVAL_MS = 5000;    // 5s cuando está pendiente
const ACTIVE_HEARTBEAT_INTERVAL_MS = 25000; // 25s cuando está activa (detección rápida de revocación)
const HEARTBEAT_TIMEOUT_MS = 7000;         // 7s timeout
const HEARTBEAT_FAIL_GRACE = 2;            // 2 fallos consecutivos → offline

export function useLicense() {
  const [status, setStatus] = useState('unknown');
  const [reason, setReason] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [terminalMeta, setTerminalMeta] = useState({ ip_address: null, first_seen_at: null, label: null });

  const [serial] = useState(() => getOrCreateSerial());
  const failCountRef = useRef(0);
  const lastTokenRef = useRef(null);

  // Consulta de estado o registro inicial
  const doEnroll = useCallback(async () => {
    if (!serial) return null;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), HEARTBEAT_TIMEOUT_MS);
      const r = await fetch('/api/license/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial,
          hostname: getHostname(),
          os_info: getOSInfo(),
          terminal_type: window.location.pathname.includes('kitchen') ? 'kds' : 'pos',
        }),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setStatus(data.status);
        setReason(null);
        setLicenseInfo({ terminal_id: data.terminal_id, label: data.label });
        setTerminalMeta({
          ip_address: data.ip_address || null,
          first_seen_at: data.first_seen_at || null,
          label: data.label || null,
        });
        return data;
      }
      if (r.status === 429) {
        setStatus('unknown');
        setReason('rate-limited');
        return null;
      }
      if (r.status === 403) {
        clearLicenseToken();
        setStatus('revoked');
        setReason(data.error || 'Esta terminal fue revocada por el administrador.');
        return null;
      }
      throw new Error('enroll-failed');
    } catch (e) {
      const payload = await loadLicensePayload();
      if (payload) {
        setStatus('offline');
        setReason('no-network');
        setLicenseInfo({
          tier: payload.tier,
          label: payload.label,
          expires_at: payload.expires_at,
        });
      } else {
        setStatus('unknown');
        setReason('no-network-no-cache');
      }
      return null;
    }
  }, [serial]);

  // Solicitud explícita de acceso con nombre personalizado
  const requestAccess = useCallback(async (customLabel) => {
    if (!serial) return false;
    try {
      const r = await fetch('/api/license/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial,
          label: customLabel || undefined,
          hostname: getHostname(),
          os_info: getOSInfo(),
          terminal_type: window.location.pathname.includes('kitchen') ? 'kds' : 'pos',
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setStatus(data.status || 'pending');
        setReason(null);
        setTerminalMeta((prev) => ({
          ...prev,
          label: data.label || customLabel || prev.label,
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error al solicitar acceso:', e);
      return false;
    }
  }, [serial]);

  // Heartbeat con el servidor
  const doHeartbeat = useCallback(async () => {
    if (!serial) return;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), HEARTBEAT_TIMEOUT_MS);
      const r = await fetch('/api/license/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Terminal-Serial': serial,
        },
        signal: ctrl.signal,
      });
      clearTimeout(to);
      const data = await r.json().catch(() => ({}));

      if (r.ok && data.ok) {
        if (data.license_token) {
          await saveLicenseToken(data.license_token);
          lastTokenRef.current = data.license_token;
        }
        setStatus('active');
        setReason(null);
        setLicenseInfo({
          tier: data.license?.tier,
          max_terminals: data.license?.max_terminals,
          valid_until: data.license?.valid_until,
          offline_grace_days: data.license?.offline_grace_days,
        });
        failCountRef.current = 0;
        setOnline(true);
        return;
      }

      // Si el servidor responde con estado no activo
      if (data.status) {
        setStatus(data.status);
        setReason(data.reason || data.status);
        if (['revoked', 'expired', 'license_expired', 'license_inactive'].includes(data.status)) {
          clearLicenseToken();
        }
        failCountRef.current = 0;
        return;
      }

      if (r.status === 403) {
        clearLicenseToken();
        setStatus('revoked');
        setReason(data.error || 'Terminal revocada');
        return;
      }

      throw new Error('heartbeat-failed');
    } catch (e) {
      failCountRef.current += 1;
      if (failCountRef.current >= HEARTBEAT_FAIL_GRACE) {
        const payload = await loadLicensePayload();
        if (payload) {
          setStatus('offline');
          setReason('no-network');
        } else {
          setStatus('unknown');
          setReason('no-network-no-cache');
        }
        setOnline(false);
      }
    }
  }, [serial]);

  // Efecto principal de conexión y latido
  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (cancelled) return;
      const enrolled = await doEnroll();
      if (cancelled) return;
      if (enrolled?.status === 'active' || enrolled?.status === 'pending') {
        await doHeartbeat();
      }
    };
    start();

    // Event listener para intercepciones 403 inmediatas desde api.js
    const onLicenseBlocked = (e) => {
      console.warn('[useLicense] Evento de bloqueo de licencia detectado:', e.detail);
      clearLicenseToken();
      setStatus('revoked');
      setReason(e.detail?.error || 'Acceso denegado / Terminal revocada por el administrador');
    };
    window.addEventListener('license:blocked', onLicenseBlocked);

    // Conexión / desconexión de red
    const onConn = () => {
      setOnline(true);
      failCountRef.current = 0;
      doHeartbeat();
    };
    const onDisc = () => setOnline(false);
    window.addEventListener('online', onConn);
    window.addEventListener('offline', onDisc);

    return () => {
      cancelled = true;
      window.removeEventListener('license:blocked', onLicenseBlocked);
      window.removeEventListener('online', onConn);
      window.removeEventListener('offline', onDisc);
    };
  }, [doEnroll, doHeartbeat]);

  // Polling dinámico: más rápido si está en 'pending', normal si está 'active'
  useEffect(() => {
    const intervalMs = status === 'pending' ? PENDING_POLL_INTERVAL_MS : ACTIVE_HEARTBEAT_INTERVAL_MS;
    const timerId = setInterval(() => {
      if (navigator.onLine && (status === 'active' || status === 'pending')) {
        doHeartbeat();
      }
    }, intervalMs);

    return () => clearInterval(timerId);
  }, [status, doHeartbeat]);

  // Auto-retry si queda en 'unknown' (por rate limit o desconexión temporal)
  useEffect(() => {
    if (status !== 'unknown') return;
    const timer = setTimeout(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        doEnroll();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [status, doEnroll]);

  return {
    status,
    reason,
    licenseInfo,
    online,
    serial,
    terminalMeta,
    canOperate: status === 'active' || status === 'offline',
    isBlocked: ['revoked', 'expired', 'license_expired', 'license_inactive'].includes(status),
    isPending: status === 'pending',
    isOffline: status === 'offline',
    requestAccess,
    doHeartbeat,
    retryEnroll: doEnroll,
  };
}

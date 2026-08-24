/**
 * useLicense.js
 *
 * Hook que mantiene el "latido" de licencia con el server.
 *
 * Estados posibles:
 *   - 'unknown'    → acaba de iniciar, no se ha contactado al server
 *   - 'pending'    → la terminal está registrada pero el admin no la aprobó
 *   - 'active'     → todo OK, la app puede operar
 *   - 'offline'    → sin red, operando con token cacheado
 *   - 'expired'    → el token offline venció, necesita conectarse
 *   - 'revoked'    → la terminal fue revocada por el admin
 *   - 'unknown-serial' → el server no reconoce este serial
 *
 * El hook hace heartbeat cada 5 minutos. Si el server no responde 2 veces
 * seguidas, pasa a modo offline. Si el token offline vence, bloquea.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { getOrCreateSerial, getHostname, getOSInfo } from '../lib/terminalSerial';
import { saveLicenseToken, loadLicenseToken, loadLicensePayload, clearLicenseToken } from '../lib/licenseStorage';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const HEARTBEAT_TIMEOUT_MS = 8000;           // 8s
const HEARTBEAT_FAIL_GRACE = 2;              // 2 fallos consecutivos → offline

export function useLicense() {
  const [status, setStatus] = useState('unknown');
  const [reason, setReason] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [terminalMeta, setTerminalMeta] = useState({ ip_address: null, first_seen_at: null });

  const [serial] = useState(() => getOrCreateSerial());
  const failCountRef = useRef(0);
  const lastTokenRef = useRef(null);

  const doEnroll = useCallback(async () => {
    if (!serial) return;
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
        });
        return data;
      }
      if (r.status === 429) {
        setStatus('unknown');
        setReason('rate-limited');
        return null;
      }
      if (r.status === 403) {
        setStatus('revoked');
        setReason(data.error || 'revoked');
        return null;
      }
      throw new Error('enroll-failed');
    } catch (e) {
      // No se pudo contactar al server. Verificar si tenemos token cacheado.
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
  }, []);

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
        // OK
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
      if (data.status) {
        setStatus(data.status);
        setReason(data.reason || data.status);
        if (['revoked', 'expired', 'license_expired', 'license_inactive'].includes(data.status)) {
          clearLicenseToken();
        }
        failCountRef.current = 0;
        return;
      }
      throw new Error('heartbeat-failed');
    } catch (e) {
      failCountRef.current += 1;
      if (failCountRef.current >= HEARTBEAT_FAIL_GRACE) {
        // Sin red 2 veces seguidas → intentar modo offline
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (cancelled) return;
      // 1) Intentar enroll (puede revivir pending→active si el admin aprobó)
      const enrolled = await doEnroll();
      if (cancelled) return;
      // 2) Si está pending/active, heartbeat para pedir token
      if (enrolled?.status === 'active' || enrolled?.status === 'pending') {
        await doHeartbeat();
      }
    };
    start();
    const id = setInterval(() => {
      if (navigator.onLine) doHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
    const onConn = () => {
      setOnline(true);
      // Al volver la red, hacer heartbeat inmediato
      failCountRef.current = 0;
      doHeartbeat();
    };
    const onDisc = () => setOnline(false);
    window.addEventListener('online', onConn);
    window.addEventListener('offline', onDisc);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('online', onConn);
      window.removeEventListener('offline', onDisc);
    };
  }, [doEnroll, doHeartbeat]);

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
  };
}

// react-app/src/hooks/useMaintenance.js
// Hook reactivo centralizado para escuchar estado de mantenimiento y versiones en tiempo real

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { useSocket } from './useSocket';

export function useMaintenance() {
  const [isActive, setIsActive] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [reason, setReason] = useState('Mantenimiento del sistema y actualización');
  const [targetVersion, setTargetVersion] = useState('v1.0.0');
  const [currentVersion, setCurrentVersion] = useState('v1.0.0');
  const [activatedAt, setActivatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const countdownTimerRef = useRef(null);

  // Consulta el estado inicial del servidor
  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.maintenance.getStatus();
      const data = res?.data || res || {};
      setIsActive(Boolean(data.isActive));
      setIsCountingDown(Boolean(data.isCountingDown));
      setCountdownRemaining(Number(data.countdownRemaining || 0));
      if (data.reason) setReason(data.reason);
      if (data.targetVersion) setTargetVersion(data.targetVersion);
      if (data.currentVersion) setCurrentVersion(data.currentVersion);
      if (data.activatedAt) setActivatedAt(data.activatedAt);
    } catch (err) {
      console.warn('[useMaintenance] Error al obtener estado inicial:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Manejo del temporizador de decremento segundo a segundo
  useEffect(() => {
    if (!isCountingDown) return;

    if (countdownRemaining <= 0) {
      setIsCountingDown(false);
      setIsActive(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isCountingDown, countdownRemaining]);

  // Event handlers para Socket.IO
  const handleMaintenanceWarning = useCallback((payload) => {
    console.log('[MAINTENANCE EVENT] Warning:', payload);
    setIsCountingDown(true);
    setCountdownRemaining(Number(payload.countdownSeconds || 30));
    if (payload.reason) setReason(payload.reason);
    if (payload.targetVersion) setTargetVersion(payload.targetVersion);
  }, []);

  const handleMaintenanceStart = useCallback((payload) => {
    console.log('[MAINTENANCE EVENT] Start:', payload);
    setIsCountingDown(false);
    setCountdownRemaining(0);
    setIsActive(true);
    if (payload.reason) setReason(payload.reason);
    if (payload.targetVersion) setTargetVersion(payload.targetVersion);
    if (payload.activatedAt) setActivatedAt(payload.activatedAt);
  }, []);

  const handleMaintenanceAbort = useCallback((payload) => {
    console.log('[MAINTENANCE EVENT] Abort:', payload);
    setIsCountingDown(false);
    setCountdownRemaining(0);
  }, []);

  const handleMaintenanceEnd = useCallback((payload) => {
    console.log('[MAINTENANCE EVENT] End:', payload);
    setIsActive(false);
    setIsCountingDown(false);
    setCountdownRemaining(0);
    if (payload?.version) setCurrentVersion(payload.version);

    // Al finalizar mantenimiento, purgar caché y forzar reload limpio tras 1 segundo
    setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.update());
        });
      }
      window.location.reload();
    }, 1200);
  }, []);

  const handleVersionPublished = useCallback((payload) => {
    if (payload?.version?.version_tag) {
      setCurrentVersion(payload.version.version_tag);
    }
  }, []);

  // Suscribirse a los eventos del socket
  useSocket({
    'system:maintenance_warning': handleMaintenanceWarning,
    'system:maintenance_start': handleMaintenanceStart,
    'system:maintenance_abort': handleMaintenanceAbort,
    'system:maintenance_end': handleMaintenanceEnd,
    'system:version_published': handleVersionPublished,
  });

  // Escuchar evento disparado por api.js en caso de recibir HTTP 503
  useEffect(() => {
    const handle503 = (e) => {
      const detail = e.detail || {};
      setIsActive(true);
      if (detail.reason) setReason(detail.reason);
      if (detail.targetVersion) setTargetVersion(detail.targetVersion);
    };

    window.addEventListener('system:maintenance_active', handle503);
    return () => window.removeEventListener('system:maintenance_active', handle503);
  }, []);

  // Acciones disponibles para el Superadmin
  const startCountdown = async ({ countdownSeconds = 30, reason, targetVersion }) => {
    const res = await api.maintenance.startCountdown({ countdownSeconds, reason, targetVersion });
    await fetchStatus();
    return res;
  };

  const abortCountdown = async () => {
    const res = await api.maintenance.abortCountdown();
    await fetchStatus();
    return res;
  };

  const endMaintenance = async () => {
    const res = await api.maintenance.end();
    await fetchStatus();
    return res;
  };

  return {
    isActive,
    isCountingDown,
    countdownRemaining,
    reason,
    targetVersion,
    currentVersion,
    activatedAt,
    loading,
    refreshStatus: fetchStatus,
    startCountdown,
    abortCountdown,
    endMaintenance,
  };
}

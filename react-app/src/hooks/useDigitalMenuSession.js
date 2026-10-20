// react-app/src/hooks/useDigitalMenuSession.js
// Hook especializado para persistencia de huella digital, sesión de mesa y monitoreo de cuenta

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

export function useDigitalMenuSession(slug, tableToken) {
  // Huella persistente del dispositivo móvil del comensal
  const getDeviceFingerprint = useCallback(() => {
    let fp = localStorage.getItem('sama_diner_device_fp');
    if (!fp) {
      fp = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('sama_diner_device_fp', fp);
    }
    return fp;
  }, []);

  const [sessionData, setSessionData] = useState(() => {
    try {
      const saved = localStorage.getItem(`sama_diner_session_${slug}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [accountClosedNotice, setAccountClosedNotice] = useState(false);
  const wasActiveRef = useRef(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(`sama_diner_session_${slug}`);
    setSessionData(null);
  }, [slug]);

  // Vincular sesión de dispositivo (nueva cuenta o unirse a existente)
  const bindSession = useCallback(async ({ tableId, joinAccountId = null, alias = 'Comensal', menuId = 1 }) => {
    try {
      const fp = getDeviceFingerprint();
      const res = await api.digitalMenu.bindDeviceSession(
        {
          tableId,
          deviceFingerprint: fp,
          guestAlias: alias,
          joinAccountId,
          menuId,
        },
        tableToken
      );
      setSessionData(res);
      localStorage.setItem(`sama_diner_session_${slug}`, JSON.stringify(res));
      return res;
    } catch (err) {
      console.warn('Error vinculando sesión de comensal:', err.message);
      throw err;
    }
  }, [slug, tableToken, getDeviceFingerprint]);

  // Monitorear periódicamente si la cuenta de la mesa fue pagada y cerrada en el POS
  useEffect(() => {
    if (!sessionData?.sessionToken) return;
    const interval = setInterval(async () => {
      try {
        const status = await api.digitalMenu.checkSessionStatus(sessionData.sessionToken);
        const isActive = Boolean(status?.active ?? status?.valid);
        if (isActive) {
          wasActiveRef.current = true;
        } else if (wasActiveRef.current) {
          // Si la cuenta estaba abierta en esta sesión y ahora fue cerrada en el POS
          setAccountClosedNotice(true);
          clearSession();
          wasActiveRef.current = false;
        } else {
          clearSession();
        }
      } catch (e) {
        // Tolerancia a fallos momentáneos de red
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [sessionData?.sessionToken, clearSession]);

  return {
    sessionData,
    setSessionData,
    bindSession,
    clearSession,
    accountClosedNotice,
    setAccountClosedNotice,
    getDeviceFingerprint,
  };
}

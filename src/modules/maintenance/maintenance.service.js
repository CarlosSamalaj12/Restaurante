// src/modules/maintenance/maintenance.service.js
// Servicio de negocio para control de mantenimiento, timers en tiempo real y versiones

const maintenanceRepository = require("./maintenance.repository");
const { emitEvent } = require("../../common/sockets");
const { BadRequestError } = require("../../common/errors");

let activeCountdownTimer = null;
let countdownEndsAt = null;

const maintenanceService = {
  async ensureTables() {
    await maintenanceRepository.ensureTables();
  },

  /**
   * Obtiene el estado consolidado de mantenimiento y versión actual
   */
  async getStatus() {
    const state = await maintenanceRepository.getMaintenanceState();
    const currentVersion = await maintenanceRepository.getCurrentVersion();

    let countdownRemaining = 0;
    if (state?.is_counting_down && countdownEndsAt) {
      const msRemaining = countdownEndsAt - Date.now();
      countdownRemaining = Math.max(0, Math.ceil(msRemaining / 1000));
    } else if (state?.is_counting_down && state.countdown_started_at) {
      const started = new Date(state.countdown_started_at).getTime();
      const totalMs = (state.countdown_seconds || 30) * 1000;
      const msRemaining = (started + totalMs) - Date.now();
      countdownRemaining = Math.max(0, Math.ceil(msRemaining / 1000));
    }

    return {
      isActive: Boolean(state?.is_active),
      isCountingDown: Boolean(state?.is_counting_down && countdownRemaining > 0),
      countdownRemaining,
      countdownSeconds: state?.countdown_seconds || 30,
      reason: state?.reason || 'Mantenimiento del sistema y actualización programada',
      targetVersion: state?.target_version || currentVersion?.version_tag || 'v1.0.0',
      activatedAt: state?.activated_at || null,
      currentVersion: currentVersion?.version_tag || 'v1.0.0',
      currentVersionDetails: currentVersion || null,
    };
  },

  /**
   * Determina si el sistema está bloqueado por mantenimiento activo
   */
  async isSystemInMaintenance() {
    const state = await maintenanceRepository.getMaintenanceState();
    return Boolean(state?.is_active);
  },

  /**
   * Inicia la cuenta regresiva de 30 segundos y emite el evento en tiempo real
   */
  async startCountdown({ countdownSeconds = 30, reason, targetVersion, initiatedBy }) {
    const seconds = Math.max(5, Number(countdownSeconds) || 30);
    const cleanReason = String(reason || 'Actualización y mantenimiento programado').trim();
    const cleanTargetVersion = String(targetVersion || '').trim() || 'v1.0.0';

    if (activeCountdownTimer) {
      clearTimeout(activeCountdownTimer);
      activeCountdownTimer = null;
    }

    const updated = await maintenanceRepository.startCountdown({
      countdownSeconds: seconds,
      reason: cleanReason,
      targetVersion: cleanTargetVersion,
      initiatedBy,
    });

    countdownEndsAt = Date.now() + seconds * 1000;

    // Emitir alerta a todos los clientes por Socket.IO
    emitEvent('system:maintenance_warning', {
      countdownSeconds: seconds,
      endsAt: countdownEndsAt,
      reason: cleanReason,
      targetVersion: cleanTargetVersion,
    });

    console.log(`[MAINTENANCE] Cuenta regresiva iniciada (${seconds}s) para versión ${cleanTargetVersion}`);

    // Programar el bloqueo automático cuando expiren los segundos
    activeCountdownTimer = setTimeout(async () => {
      try {
        await maintenanceRepository.activateMaintenance({
          reason: cleanReason,
          targetVersion: cleanTargetVersion,
          initiatedBy,
        });

        activeCountdownTimer = null;
        countdownEndsAt = null;

        // Emitir bloqueo en tiempo real
        emitEvent('system:maintenance_start', {
          reason: cleanReason,
          targetVersion: cleanTargetVersion,
          activatedAt: new Date().toISOString(),
        });

        console.log(`[MAINTENANCE] Mantenimiento ACTIVO bloqueando accesos regulares`);
      } catch (err) {
        console.error('[MAINTENANCE] Error al activar modo mantenimiento tras temporizador:', err);
      }
    }, seconds * 1000);

    return this.getStatus();
  },

  /**
   * Cancela la cuenta regresiva antes de que comience el mantenimiento
   */
  async abortCountdown() {
    if (activeCountdownTimer) {
      clearTimeout(activeCountdownTimer);
      activeCountdownTimer = null;
    }
    countdownEndsAt = null;

    await maintenanceRepository.abortCountdown();

    emitEvent('system:maintenance_abort', {
      abortedAt: new Date().toISOString(),
      message: 'La cuenta regresiva de mantenimiento ha sido cancelada por el administrador.',
    });

    console.log('[MAINTENANCE] Cuenta regresiva abortada por Superadmin');
    return this.getStatus();
  },

  /**
   * Desactiva el modo mantenimiento y notifica a las terminales para reanudar operaciones
   */
  async endMaintenance() {
    if (activeCountdownTimer) {
      clearTimeout(activeCountdownTimer);
      activeCountdownTimer = null;
    }
    countdownEndsAt = null;

    const previousState = await maintenanceRepository.getMaintenanceState();
    await maintenanceRepository.endMaintenance();

    const currentVersion = await maintenanceRepository.getCurrentVersion();

    // Notificar a todos los clientes para que desbloqueen y refresquen la app
    emitEvent('system:maintenance_end', {
      endedAt: new Date().toISOString(),
      version: currentVersion?.version_tag || previousState?.target_version || 'v1.0.0',
      message: 'Mantenimiento finalizado. El sistema vuelve a operar con normalidad.',
    });

    console.log('[MAINTENANCE] Modo mantenimiento DESACTIVADO. Sistema en línea.');
    return this.getStatus();
  },

  /**
   * Obtiene el listado de versiones
   */
  async getVersions() {
    return maintenanceRepository.getVersions();
  },

  /**
   * Crea una nueva versión en el historial
   */
  async createVersion({ versionTag, title, changelog, releasedBy }) {
    if (!versionTag || !title) {
      throw new BadRequestError('El tag de versión y el título son obligatorios');
    }

    const version = await maintenanceRepository.createVersion({
      versionTag: String(versionTag).trim(),
      title: String(title).trim(),
      changelog: changelog ? String(changelog).trim() : null,
      releasedBy,
    });

    emitEvent('system:version_published', {
      version,
      publishedAt: new Date().toISOString(),
    });

    return version;
  }
};

module.exports = maintenanceService;

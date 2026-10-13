// src/modules/maintenance/maintenance.repository.js
// Persistencia en base de datos para el estado de mantenimiento y control de versiones

const { query } = require("../../common/db");

const maintenanceRepository = {
  /**
   * Asegura la existencia de las tablas de mantenimiento y control de versiones
   */
  async ensureTables() {
    await query(`
      CREATE TABLE IF NOT EXISTS system_maintenance_state (
        id INT PRIMARY KEY,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        is_counting_down TINYINT(1) NOT NULL DEFAULT 0,
        countdown_started_at DATETIME NULL,
        countdown_seconds INT NOT NULL DEFAULT 30,
        activated_at DATETIME NULL,
        reason VARCHAR(255) NULL,
        target_version VARCHAR(50) NULL,
        initiated_by INT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      INSERT IGNORE INTO system_maintenance_state 
        (id, is_active, is_counting_down, countdown_seconds, reason, target_version)
      VALUES 
        (1, 0, 0, 30, 'Mantenimiento y actualización del sistema POS', 'v1.0.0')
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS system_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version_tag VARCHAR(50) NOT NULL,
        title VARCHAR(150) NOT NULL,
        changelog TEXT NULL,
        released_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        released_by INT NULL,
        is_current TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_version_tag (version_tag),
        INDEX idx_is_current (is_current)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Insertar versión base inicial si no hay versiones
    const [existing] = await query(`SELECT COUNT(*) as count FROM system_versions`);
    if (existing[0]?.count === 0) {
      await query(`
        INSERT INTO system_versions (version_tag, title, changelog, is_current)
        VALUES ('v1.0.0', 'Versión Inicial de Producción', 'Sistema POS, control de mesas, órdenes KDS y soporte PWA.', 1)
      `);
    }
  },

  /**
   * Obtiene el estado actual de mantenimiento
   */
  async getMaintenanceState() {
    const [rows] = await query(`SELECT * FROM system_maintenance_state WHERE id = 1 LIMIT 1`);
    return rows[0] || null;
  },

  /**
   * Inicia la cuenta regresiva de mantenimiento (30 segundos por defecto)
   */
  async startCountdown({ countdownSeconds = 30, reason, targetVersion, initiatedBy }) {
    await query(
      `UPDATE system_maintenance_state 
       SET is_counting_down = 1,
           is_active = 0,
           countdown_seconds = ?,
           countdown_started_at = NOW(),
           reason = ?,
           target_version = ?,
           initiated_by = ?
       WHERE id = 1`,
      [countdownSeconds, reason || 'Actualización y mantenimiento programado', targetVersion || 'v1.0.0', initiatedBy || null]
    );
    return this.getMaintenanceState();
  },

  /**
   * Activa el modo de mantenimiento permanente
   */
  async activateMaintenance({ reason, targetVersion, initiatedBy } = {}) {
    await query(
      `UPDATE system_maintenance_state 
       SET is_active = 1,
           is_counting_down = 0,
           activated_at = NOW(),
           reason = COALESCE(?, reason),
           target_version = COALESCE(?, target_version),
           initiated_by = COALESCE(?, initiated_by)
       WHERE id = 1`,
      [reason || null, targetVersion || null, initiatedBy || null]
    );
    return this.getMaintenanceState();
  },

  /**
   * Cancela la cuenta regresiva sin entrar a mantenimiento
   */
  async abortCountdown() {
    await query(
      `UPDATE system_maintenance_state 
       SET is_counting_down = 0,
           countdown_started_at = NULL
       WHERE id = 1`
    );
    return this.getMaintenanceState();
  },

  /**
   * Desactiva el modo mantenimiento y restablece la normalidad
   */
  async endMaintenance() {
    await query(
      `UPDATE system_maintenance_state 
       SET is_active = 0,
           is_counting_down = 0,
           activated_at = NULL,
           countdown_started_at = NULL
       WHERE id = 1`
    );
    return this.getMaintenanceState();
  },

  /**
   * Obtiene la versión actual activa del sistema
   */
  async getCurrentVersion() {
    const [rows] = await query(`
      SELECT * FROM system_versions 
      WHERE is_current = 1 
      ORDER BY id DESC 
      LIMIT 1
    `);
    if (rows.length > 0) return rows[0];

    const [latest] = await query(`
      SELECT * FROM system_versions 
      ORDER BY id DESC 
      LIMIT 1
    `);
    return latest[0] || null;
  },

  /**
   * Lista el historial de versiones
   */
  async getVersions() {
    const [rows] = await query(`
      SELECT sv.*, su.full_name as released_by_name
      FROM system_versions sv
      LEFT JOIN staff_users su ON su.id = sv.released_by
      ORDER BY sv.id DESC
      LIMIT 50
    `);
    return rows;
  },

  /**
   * Registra una nueva versión y la marca como actual
   */
  async createVersion({ versionTag, title, changelog, releasedBy }) {
    await query(`UPDATE system_versions SET is_current = 0`);
    const [result] = await query(
      `INSERT INTO system_versions (version_tag, title, changelog, released_by, is_current)
       VALUES (?, ?, ?, ?, 1)`,
      [versionTag, title, changelog || null, releasedBy || null]
    );
    const [inserted] = await query(`SELECT * FROM system_versions WHERE id = ?`, [result.insertId]);
    return inserted[0] || null;
  }
};

module.exports = maintenanceRepository;

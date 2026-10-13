// react-app/src/components/settings/VersionMaintenanceSection.jsx
// Panel exclusivo para Superadmin para control de versiones y modo mantenimiento

import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  GitBranch,
  Clock,
  Play,
  XCircle,
  Plus,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  Shield,
  Loader2,
  Sparkles,
  Radio
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { useMaintenance } from '../../hooks/useMaintenance';

export function VersionMaintenanceSection() {
  const toast = useToast();
  const {
    isActive,
    isCountingDown,
    countdownRemaining,
    reason: currentReason,
    targetVersion: currentTargetVersion,
    currentVersion,
    startCountdown,
    abortCountdown,
    endMaintenance,
    refreshStatus,
  } = useMaintenance();

  // Estados locales para el lanzador
  const [targetVersionInput, setTargetVersionInput] = useState('');
  const [reasonInput, setReasonInput] = useState('Actualización programada y mejoras del sistema POS');
  const [secondsInput, setSecondsInput] = useState(30);
  const [launching, setLaunching] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Estados para historial de versiones
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newChangelog, setNewChangelog] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);

  useEffect(() => {
    loadVersions();
  }, []);

  useEffect(() => {
    if (currentVersion && !targetVersionInput) {
      // Sugerir siguiente versión menor por defecto
      const match = currentVersion.match(/v?(\d+)\.(\d+)\.?(\d+)?/);
      if (match) {
        const major = match[1];
        const minor = parseInt(match[2], 10) + 1;
        setTargetVersionInput(`v${major}.${minor}.0`);
      } else {
        setTargetVersionInput('v1.1.0');
      }
    }
  }, [currentVersion]);

  const loadVersions = async () => {
    try {
      setLoadingVersions(true);
      const res = await api.maintenance.getVersions();
      setVersions(res?.data || res || []);
    } catch (err) {
      console.warn('Error cargando versiones:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleLaunchCountdown = async () => {
    setLaunching(true);
    try {
      await startCountdown({
        countdownSeconds: secondsInput,
        reason: reasonInput,
        targetVersion: targetVersionInput || 'v1.1.0',
      });
      toast.success(`Aviso emitido: Mantenimiento comenzará en ${secondsInput} segundos.`);
      setConfirmModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error al iniciar mantenimiento');
    } finally {
      setLaunching(false);
    }
  };

  const handleAbort = async () => {
    try {
      await abortCountdown();
      toast.info('Cuenta regresiva cancelada. El sistema continúa en línea.');
    } catch (err) {
      toast.error(err.message || 'Error al cancelar');
    }
  };

  const handleEnd = async () => {
    try {
      await endMaintenance();
      toast.success('Mantenimiento finalizado con éxito. Terminales desbloqueadas.');
      await loadVersions();
    } catch (err) {
      toast.error(err.message || 'Error al finalizar');
    }
  };

  const handleCreateVersion = async (e) => {
    e.preventDefault();
    if (!newTag.trim() || !newTitle.trim()) {
      toast.warning('Ingresa el tag de versión y el título');
      return;
    }
    setSavingVersion(true);
    try {
      await api.maintenance.createVersion({
        versionTag: newTag.trim(),
        title: newTitle.trim(),
        changelog: newChangelog.trim(),
      });
      toast.success(`Versión ${newTag} registrada correctamente`);
      setNewVersionModalOpen(false);
      setNewTag('');
      setNewTitle('');
      setNewChangelog('');
      await loadVersions();
      await refreshStatus();
    } catch (err) {
      toast.error(err.message || 'Error al registrar versión');
    } finally {
      setSavingVersion(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Control de Versiones y Mantenimiento</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
              <Shield className="w-3 h-3 text-purple-600" /> Superadmin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestiona el ciclo de vida del POS, emite alertas de 30 segundos y controla las versiones del sistema.
          </p>
        </div>

        {/* Estado actual en vivo */}
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
          <div className="p-2 rounded-xl bg-white shadow-xs">
            {isActive ? (
              <Wrench className="w-5 h-5 text-amber-500 animate-spin" />
            ) : isCountingDown ? (
              <Clock className="w-5 h-5 text-rose-500 animate-pulse" />
            ) : (
              <Radio className="w-5 h-5 text-emerald-500" />
            )}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Estado del Servidor
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${
                isActive ? 'text-amber-600' : isCountingDown ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {isActive ? 'En Mantenimiento' : isCountingDown ? `Aviso Activo (${countdownRemaining}s)` : 'En Línea (Normal)'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono font-bold text-slate-700">{currentVersion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Lanzador de Mantenimiento vs Versión Actual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarjeta de Control de Mantenimiento */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Lanzador de Modo Mantenimiento</h3>
                <p className="text-xs text-slate-500">Notifica a todas las terminales con cuenta regresiva previa.</p>
              </div>
            </div>
          </div>

          {/* Si está en mantenimiento activo */}
          {isActive ? (
            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4">
              <div className="flex items-start gap-3">
                <Wrench className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-purple-900">El Modo Mantenimiento está Activo</h4>
                  <p className="text-xs text-purple-700 mt-1">
                    Las terminales de meseros, cajeros y cocina están bloqueadas mostrando la pantalla de espera. Como Superadmin, tú tienes acceso para realizar ajustes y validar.
                  </p>
                  <p className="text-xs text-purple-800 font-semibold mt-2">
                    Versión instalada/destino: <span className="font-mono">{currentTargetVersion}</span>
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleEnd}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reanudar y Desactivar Mantenimiento</span>
                </button>
              </div>
            </div>
          ) : isCountingDown ? (
            /* Si la cuenta regresiva está corriendo */
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-mono font-extrabold text-2xl shadow-md animate-pulse">
                    {countdownRemaining}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">Aviso en Curso</h4>
                    <p className="text-xs text-rose-700">
                      Entrando en mantenimiento en {countdownRemaining} segundos...
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAbort}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-300 shadow-xs transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Abortar Aviso</span>
                </button>
              </div>
            </div>
          ) : (
            /* Formulario normal para iniciar mantenimiento */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Versión a Desplegar / Tag
                  </label>
                  <input
                    type="text"
                    value={targetVersionInput}
                    onChange={(e) => setTargetVersionInput(e.target.value)}
                    placeholder="ej. v1.1.0"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tiempo de Aviso Previo
                  </label>
                  <select
                    value={secondsInput}
                    onChange={(e) => setSecondsInput(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                  >
                    <option value={15}>15 Segundos (Rápido)</option>
                    <option value={30}>30 Segundos (Recomendado)</option>
                    <option value={60}>60 Segundos (1 Minuto)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Motivo o Mensaje Informativo para el Personal
                </label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="ej. Actualización del sistema y mejoras en reportes"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  ⚠️ Emitirá una alerta audible y visual en todas las pantallas.
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Clock className="w-4 h-4" />
                  <span>Lanzar Aviso de {secondsInput}s</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta de Resumen de Versión */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-sky-300 flex items-center justify-center border border-white/10 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
              Versión Activa
            </span>
            <h3 className="text-3xl font-extrabold font-mono text-white mt-1">
              {currentVersion}
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Sistema PWA instalable con soporte offline y sincronización en tiempo real vía Socket.IO.
            </p>
          </div>

          <div className="pt-6 border-t border-white/10 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Modo PWA:</span>
              <span className="text-emerald-400 font-semibold">Instalable</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Soporte Móvil:</span>
              <span className="text-slate-200">iOS / Android / Desktop</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Versiones Registradas:</span>
              <span className="text-slate-200 font-bold">{versions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Versiones */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historial de Versiones y Changelog</h3>
              <p className="text-xs text-slate-500">Registro de despliegues y notas de actualización.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNewVersionModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Versión</span>
          </button>
        </div>

        {loadingVersions ? (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Cargando versiones...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No hay versiones registradas aún.
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-mono font-bold text-xs">
                      {ver.version_tag}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{ver.title}</h4>
                    {ver.is_current ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Vigente
                      </span>
                    ) : null}
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {new Date(ver.released_at).toLocaleDateString('es-GT', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {ver.changelog && (
                  <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/60 leading-relaxed font-sans whitespace-pre-line">
                    {ver.changelog}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación para lanzar cuenta regresiva */}
      <AnimatePresence>
        {confirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Cerrar modal"
              onClick={() => !launching && setConfirmModalOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm w-full h-full border-none cursor-default"
            />

            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 p-6 text-slate-800"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">
                ¿Iniciar Aviso de Mantenimiento?
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Todas las terminales conectadas recibirán una alerta con un contador de <strong className="text-slate-900">{secondsInput} segundos</strong>. Al concluir el tiempo, se activará el bloqueo para meseros y cajeros mientras realizas las modificaciones.
              </p>

              <div className="bg-slate-50 rounded-xl p-3 text-xs mb-5 space-y-1 text-slate-700">
                <p>• Versión objetivo: <strong className="font-mono">{targetVersionInput}</strong></p>
                <p>• Motivo: <em>{reasonInput}</em></p>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={launching}
                  onClick={() => setConfirmModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={launching}
                  onClick={handleLaunchCountdown}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {launching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Iniciando...</span>
                    </>
                  ) : (
                    <span>Sí, Iniciar {secondsInput}s</span>
                  )}
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para registrar nueva versión */}
      <AnimatePresence>
        {newVersionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Cerrar modal"
              onClick={() => !savingVersion && setNewVersionModalOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm w-full h-full border-none cursor-default"
            />

            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 p-6 text-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Registrar Nueva Versión</h3>
                    <p className="text-xs text-slate-500">Documenta cambios y despliegues.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateVersion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tag de Versión (SemVer)
                  </label>
                  <input
                    type="text"
                    required
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="ej. v1.1.0"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título del Despliegue
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="ej. Optimización de facturación y PWA"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notas de la Versión (Changelog)
                  </label>
                  <textarea
                    rows={4}
                    value={newChangelog}
                    onChange={(e) => setNewChangelog(e.target.value)}
                    placeholder="- Agregado soporte PWA instalable&#10;- Agregado modo mantenimiento de 30s&#10;- Mejoras en el rendimiento de base de datos"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={savingVersion}
                    onClick={() => setNewVersionModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingVersion}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {savingVersion ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>Guardar y Publicar</span>
                    )}
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

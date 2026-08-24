/**
 * LicensesTab.jsx
 *
 * Pestaña de administración de licencias dentro de Settings.
 * Solo visible para usuarios con role=admin (la pestaña ya está protegida
 * por requireAdmin en el server).
 *
 * Funcionalidades:
 *  - Ver la licencia activa (tier, max terminales, expiry)
 *  - Aprobar / rechazar terminales pendientes
 *  - Revocar / reemplazar terminales activas
 *  - Crear nuevas licencias (trial / standard)
 *  - Ver el audit log de las últimas 100 acciones
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Check, X, Shield, ShieldOff, RefreshCw, Plus, Clock,
  AlertTriangle, Server, Monitor, History, Trash2
} from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(d);
  }
}

function StatusBadge({ status }) {
  const cfg = {
    active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activa' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pendiente' },
    revoked: { bg: 'bg-red-100', text: 'text-red-800', label: 'Revocada' },
    replaced: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Reemplazada' },
    expired: { bg: 'bg-red-100', text: 'text-red-800', label: 'Vencida' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function TierBadge({ tier }) {
  const cfg = {
    trial: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Trial' },
    standard: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Standard' },
  }[tier] || { bg: 'bg-gray-100', text: 'text-gray-700', label: tier };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export function LicensesTab() {
  const toast = useToast();
  const [licenses, setLicenses] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewLicense, setShowNewLicense] = useState(false);
  const [newLic, setNewLic] = useState({ tier: 'standard', max_terminals: '', offline_grace_days: 7, notes: '' });
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lics, terms, aud] = await Promise.all([
        api.licenses.list(),
        api.licenseTerminals.list(),
        api.licenseAudit.list(50),
      ]);
      setLicenses(Array.isArray(lics) ? lics : []);
      setTerminals(Array.isArray(terms) ? terms : []);
      setAudit(Array.isArray(aud) ? aud : []);
    } catch (e) {
      toast.error('Error cargando licencias: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const activeLic = licenses.find((l) => l.status === 'active');
  const pendingTerms = terminals.filter((t) => t.status === 'pending');
  const activeTerms = terminals.filter((t) => t.status === 'active');
  const otherTerms = terminals.filter((t) => !['pending', 'active'].includes(t.status));

  const approveTerminal = async (id, label) => {
    if (!window.confirm(`¿Aprobar la terminal "${label || id}"?`)) return;
    setBusyId(id);
    try {
      await api.licenseTerminals.approve(id, label || undefined);
      toast.success('Terminal aprobada');
      await load();
    } catch (e) {
      toast.error('No se pudo aprobar: ' + (e.data?.error || e.message));
    } finally {
      setBusyId(null);
    }
  };

  const revokeTerminal = async (id, label) => {
    const typed = window.prompt(`Para revocar la terminal "${label || id}", escribe su nombre o ID (${id}):`);
    if (typed !== String(id) && typed !== label) {
      if (typed !== null) toast.error('Confirmación incorrecta');
      return;
    }
    setBusyId(id);
    try {
      await api.licenseTerminals.revoke(id, 'manual');
      toast.success('Terminal revocada');
      await load();
    } catch (e) {
      toast.error('No se pudo revocar: ' + (e.data?.error || e.message));
    } finally {
      setBusyId(null);
    }
  };

  const replaceTerminal = async (id, label) => {
    if (!window.confirm(`¿Marcar "${label || id}" como reemplazada?`)) return;
    setBusyId(id);
    try {
      await api.licenseTerminals.replace(id);
      toast.success('Terminal marcada como reemplazada');
      await load();
    } catch (e) {
      toast.error('Error: ' + (e.data?.error || e.message));
    } finally {
      setBusyId(null);
    }
  };

  const createLicense = async () => {
    try {
      const body = {
        tier: newLic.tier,
        offline_grace_days: Number(newLic.offline_grace_days) || 7,
        notes: newLic.notes || null,
      };
      if (newLic.max_terminals !== '') {
        body.max_terminals = Number(newLic.max_terminals);
      }
      await api.licenses.create(body);
      toast.success('Licencia creada');
      setShowNewLicense(false);
      setNewLic({ tier: 'standard', max_terminals: '', offline_grace_days: 7, notes: '' });
      await load();
    } catch (e) {
      toast.error('Error creando licencia: ' + (e.data?.error || e.message));
    }
  };

  const revokeLicense = async (id) => {
    if (!window.confirm('¿Revocar esta licencia? Todas sus terminales activas serán revocadas también.')) return;
    setBusyId(id);
    try {
      await api.licenses.revoke(id);
      toast.success('Licencia revocada');
      await load();
    } catch (e) {
      toast.error('Error: ' + (e.data?.error || e.message));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header con licencia activa ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Licencia del sistema</h2>
            </div>
            {activeLic ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <TierBadge tier={activeLic.tier} />
                  <StatusBadge status={activeLic.status} />
                </div>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>
                    Terminales: <span className="font-semibold text-white">{activeLic.active_terminals || 0}</span>
                    {' / '}
                    <span className="font-semibold text-white">
                      {activeLic.max_terminals === 0 ? '∞' : activeLic.max_terminals}
                    </span>
                  </div>
                  <div>
                    Gracia offline: <span className="font-semibold text-white">{activeLic.offline_grace_days} días</span>
                  </div>
                  <div>
                    Vence: <span className="font-semibold text-white">{fmtDate(activeLic.valid_until)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                No hay licencia activa. Crea una para empezar.
              </div>
            )}
          </div>
          <button
            onClick={() => setShowNewLicense(true)}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition"
          >
            <Plus className="w-4 h-4" /> Nueva licencia
          </button>
        </div>
      </div>

      {/* ── Modal nueva licencia ── */}
      {showNewLicense && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Nueva licencia</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={newLic.tier}
                  onChange={(e) => setNewLic({ ...newLic, tier: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="trial">Trial (30 días)</option>
                  <option value="standard">Standard (sin vencimiento)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máx terminales (0 = ilimitado)
                </label>
                <input
                  type="number" min="0"
                  value={newLic.max_terminals}
                  onChange={(e) => setNewLic({ ...newLic, max_terminals: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={newLic.tier === 'trial' ? '2' : '0'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días de gracia offline
                </label>
                <input
                  type="number" min="0" max="30"
                  value={newLic.offline_grace_days}
                  onChange={(e) => setNewLic({ ...newLic, offline_grace_days: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={newLic.notes}
                  onChange={(e) => setNewLic({ ...newLic, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowNewLicense(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={createLicense}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Terminales pendientes ── */}
      {pendingTerms.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 border-b border-amber-200">
            <Clock className="w-4 h-4 text-amber-700" />
            <h3 className="font-semibold text-amber-900">Pendientes de aprobación ({pendingTerms.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-amber-50/50 text-left text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-2">Serial</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Hostname</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Visto</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingTerms.map((t) => (
                <tr key={t.id} className="border-t border-amber-100">
                  <td className="px-4 py-2 font-mono text-xs">{t.serial.slice(0, 18)}…</td>
                  <td className="px-4 py-2">{t.terminal_type?.toUpperCase()}</td>
                  <td className="px-4 py-2 text-gray-600">{t.hostname?.slice(0, 20) || '—'}</td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">{t.ip_address || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{fmtDate(t.first_seen_at)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => approveTerminal(t.id, t.label)}
                      disabled={busyId === t.id}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs flex items-center gap-1 ml-auto"
                    >
                      <Check className="w-3 h-3" /> Aprobar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Terminales activas ── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-600" />
          <h3 className="font-semibold">Terminales activas ({activeTerms.length})</h3>
        </div>
        {activeTerms.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No hay terminales activas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-2">Etiqueta</th>
                <th className="px-4 py-2">Serial</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Último heartbeat</th>
                <th className="px-4 py-2">Aprobada</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {activeTerms.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{t.label || `Terminal ${t.id}`}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">{t.serial.slice(0, 14)}…</td>
                  <td className="px-4 py-2">{t.terminal_type?.toUpperCase()}</td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">{t.ip_address || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{fmtDate(t.last_seen_at)}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{fmtDate(t.approved_at)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => replaceTerminal(t.id, t.label)}
                        disabled={busyId === t.id}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs"
                        title="Marcar como reemplazada (cuando se mueve la licencia a otra máquina)"
                      >
                        Reemplazar
                      </button>
                      <button
                        onClick={() => revokeTerminal(t.id, t.label)}
                        disabled={busyId === t.id}
                        className="bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <ShieldOff className="w-3 h-3" /> Revocar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Otras terminales (revocadas/reemplazadas) ── */}
      {otherTerms.length > 0 && (
        <details className="bg-white rounded-xl border overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-50">
            Historial ({otherTerms.length} terminales revocadas/reemplazadas)
          </summary>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-2">Serial</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Etiqueta</th>
                <th className="px-4 py-2">Última vez</th>
              </tr>
            </thead>
            <tbody>
              {otherTerms.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{t.serial.slice(0, 18)}…</td>
                  <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-2 text-gray-600">{t.label || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{fmtDate(t.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* ── Otras licencias ── */}
      {licenses.length > 1 && (
        <details className="bg-white rounded-xl border overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-50">
            Todas las licencias ({licenses.length})
          </summary>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Tier</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Max</th>
                <th className="px-4 py-2">Usadas</th>
                <th className="px-4 py-2">Vence</th>
                <th className="px-4 py-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-4 py-2 text-gray-500">#{l.id}</td>
                  <td className="px-4 py-2"><TierBadge tier={l.tier} /></td>
                  <td className="px-4 py-2"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-2">{l.max_terminals === 0 ? '∞' : l.max_terminals}</td>
                  <td className="px-4 py-2">{l.active_terminals || 0}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{fmtDate(l.valid_until)}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{l.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* ── Audit log ── */}
      {audit.length > 0 && (
        <details className="bg-white rounded-xl border overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <History className="w-4 h-4" />
            Auditoría ({audit.length} últimas acciones)
          </summary>
          <ul className="divide-y text-sm max-h-96 overflow-y-auto">
            {audit.map((a) => (
              <li key={a.id} className="px-4 py-2 flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono w-32 shrink-0">{fmtDate(a.created_at)}</span>
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{a.action}</span>
                <span className="text-gray-600">{a.actor_name || 'sistema'}</span>
                {a.details && (
                  <span className="text-xs text-gray-400 truncate">
                    {typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

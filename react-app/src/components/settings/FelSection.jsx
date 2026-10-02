import { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Building2,
  Key,
  Printer,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  HelpCircle,
  QrCode
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

const PROVIDERS = [
  {
    id: 'demo',
    name: 'Modo Demo / Simulador SAT',
    desc: 'Pruebas locales inmediatas con DTEs y códigos QR válidos sin costo.',
    badge: 'Recomendado para pruebas',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'infile',
    name: 'INFILE (Infile, S.A.)',
    desc: 'Certificador oficial líder en Guatemala (FelPlex / Feel).',
    badge: 'API REST / SOAP',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'digifact',
    name: 'DIGIFACT (Digifact Servicios)',
    desc: 'Certificación ágil con autenticación de tokens JWT.',
    badge: 'API REST JSON',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'guatefacturas',
    name: 'GUATEFACTURAS (Guatefacturas, S.A.)',
    desc: 'Certificador tradicional corporativo.',
    badge: 'DTE Corporativo',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];

export function FelSection() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey] = useState(false);

  const [config, setConfig] = useState({
    is_enabled: 0,
    provider: 'demo',
    environment: 'sandbox',
    issuer_nit: '',
    issuer_name: '',
    commercial_name: '',
    establishment_code: 1,
    affiliation: 'GEN',
    sat_phrase_type: '1',
    sat_phrase_code: '1',
    api_username: '',
    api_key: '',
    api_token: '',
    api_alias: '',
    receipt_copies: 1,
    kitchen_copies: 1,
    ticket_width: '80mm',
    print_qr: 1,
  });

  const [paymentRules, setPaymentRules] = useState([]);

  useEffect(() => {
    loadFelData();
  }, []);

  const loadFelData = async () => {
    setLoading(true);
    try {
      const res = await api.fel.getConfig();
      if (res.config) {
        setConfig(prev => ({
          ...prev,
          ...res.config,
          api_key: res.config.api_key_masked || res.config.api_key || '',
          api_token: res.config.api_token_masked || res.config.api_token || '',
        }));
      }
      if (res.paymentMethods) {
        setPaymentRules(res.paymentMethods);
      }
    } catch (err) {
      console.error('Error cargando configuración FEL:', err);
      toast.error('No se pudo cargar la configuración de facturación');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await api.fel.updateConfig({
        config,
        paymentRules,
      });
      toast.success('Configuración de Facturación FEL guardada exitosamente');
      setTestResult(null);
      await loadFelData();
    } catch (err) {
      toast.error(err.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.fel.testConnection(config);
      setTestResult(res);
      if (res.success) {
        toast.success('¡Conexión con el certificador exitosa!');
      } else {
        toast.error(res.message || 'Fallo de conexión');
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
      toast.error('Error al probar conexión');
    } finally {
      setTesting(false);
    }
  };

  const updateRule = (code, field, value) => {
    setPaymentRules(prev =>
      prev.map(r => (r.code === code ? { ...r, [field]: value } : r))
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-bold text-slate-700">Cargando módulo de Facturación FEL...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Facturación Electrónica (FEL SAT Guatemala)</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.is_enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {config.is_enabled ? 'Módulo Activo' : 'Módulo Inactivo'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Emisión de DTEs, consulta de NITs en línea, copias y código QR para tickets térmicos.
              </p>
            </div>
          </div>

          {/* Switch de activación general */}
          <label className="flex items-center gap-3 cursor-pointer self-start md:self-auto bg-slate-50 p-2.5 px-4 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-800">
              {config.is_enabled ? 'FEL Habilitado' : 'FEL Deshabilitado'}
            </span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!config.is_enabled}
                onChange={e => setConfig(prev => ({ ...prev, is_enabled: e.target.checked ? 1 : 0 }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Selector de Certificador y Ambiente */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">1. Certificador Autorizado SAT</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROVIDERS.map(prov => {
              const isSelected = config.provider === prov.id;
              return (
                <div
                  key={prov.id}
                  onClick={() => setConfig(prev => ({ ...prev, provider: prov.id }))}
                  className={`
                    p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between
                    ${isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{prov.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{prov.desc}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${prov.badgeColor}`}>
                      {prov.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 mt-2">
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                      {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </span>
                    <span>{isSelected ? 'Seleccionado' : 'Seleccionar'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ambiente Sandbox vs Producción */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Entorno de Emisión SAT</p>
              <p className="text-[11px] text-slate-500">Usa 'Pruebas / Sandbox' mientras configuras y pruebas sin validez fiscal real.</p>
            </div>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, environment: 'sandbox' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${config.environment === 'sandbox' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Pruebas (Sandbox)
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, environment: 'production' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${config.environment === 'production' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Producción (SAT Real)
              </button>
            </div>
          </div>
        </div>

        {/* 2. Datos Fiscales del Emisor (Restaurante) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">2. Datos Fiscales del Emisor (Restaurante)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                NIT del Emisor
              </label>
              <input
                type="text"
                value={config.issuer_nit || ''}
                onChange={e => setConfig(prev => ({ ...prev, issuer_nit: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                placeholder="Ej. 12345678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Razón Social / Nombre Registrado
              </label>
              <input
                type="text"
                value={config.issuer_name || ''}
                onChange={e => setConfig(prev => ({ ...prev, issuer_name: e.target.value }))}
                placeholder="Ej. Mi Restaurante, S.A."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre Comercial
              </label>
              <input
                type="text"
                value={config.commercial_name || ''}
                onChange={e => setConfig(prev => ({ ...prev, commercial_name: e.target.value }))}
                placeholder="Ej. Restaurante El Sabor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código de Establecimiento SAT
              </label>
              <input
                type="number"
                min="1"
                value={config.establishment_code || 1}
                onChange={e => setConfig(prev => ({ ...prev, establishment_code: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Afiliación de IVA
              </label>
              <select
                value={config.affiliation || 'GEN'}
                onChange={e => setConfig(prev => ({ ...prev, affiliation: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="GEN">Régimen General (12% IVA Incluido)</option>
                <option value="PEQ">Pequeño Contribuyente (5% Tarifa Fija)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Frase SAT Principal
              </label>
              <select
                value={config.sat_phrase_type || '1'}
                onChange={e => setConfig(prev => ({ ...prev, sat_phrase_type: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="1">Sujeto a Pagos Trimestrales ISR (Tipo 1, Código 1)</option>
                <option value="2">Sujeto a Retención Definitiva ISR (Tipo 1, Código 2)</option>
                <option value="3">Pequeño Contribuyente no genera crédito (Tipo 2)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Credenciales y Conexión de API */}
        {config.provider !== 'demo' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">3. Llaves y Credenciales del Certificador</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Campos protegidos y enmascarados</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Usuario / API Username
                </label>
                <input
                  type="text"
                  value={config.api_username || ''}
                  onChange={e => setConfig(prev => ({ ...prev, api_username: e.target.value }))}
                  placeholder="Usuario proporcionado por el certificador"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Clave / API Key / Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showKey ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.api_key || ''}
                  onChange={e => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {config.provider === 'infile' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Alias / Identificador Emisor (Infile)
                  </label>
                  <input
                    type="text"
                    value={config.api_alias || ''}
                    onChange={e => setConfig(prev => ({ ...prev, api_alias: e.target.value }))}
                    placeholder="Ej. NOMBRE_COMERCIAL"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              )}

              {['digifact', 'guatefacturas'].includes(config.provider) && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Token de Autorización (Opcional)
                  </label>
                  <input
                    type="password"
                    value={config.api_token || ''}
                    onChange={e => setConfig(prev => ({ ...prev, api_token: e.target.value }))}
                    placeholder="Token directo si no usa login dinámico"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Botón de prueba de conexión */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-400" />}
                <span>Probar Conexión con el Certificador</span>
              </button>

              {testResult && (
                <div className={`p-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${testResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Reglas de Facturación Automática por Forma de Pago */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">4. Facturación Automática por Forma de Pago</h3>
              <p className="text-xs text-slate-500 font-medium">Configura qué métodos de cobro activan la emisión de factura automáticamente.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Forma de Pago</th>
                  <th className="py-2.5 px-3 text-center">Facturación Automática</th>
                  <th className="py-2.5 px-3">Cliente por Defecto</th>
                  <th className="py-2.5 px-3">Comportamiento en Cobro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paymentRules.map(rule => (
                  <tr key={rule.code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 text-xs">{rule.label}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{rule.code}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!rule.auto_invoice}
                          onChange={e => updateRule(rule.code, 'auto_invoice', e.target.checked ? 1 : 0)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={rule.default_recipient || 'CF'}
                        onChange={e => updateRule(rule.code, 'default_recipient', e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white"
                      >
                        <option value="CF">Consumidor Final (C/F)</option>
                        <option value="NIT">Solicitar NIT / CUI</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {rule.auto_invoice ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Factura Inmediata
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Opcional / Manual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Impresión Térmica, Copias y Código QR */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Printer className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">5. Copias de Impresión y Formato del Ticket</h3>
              <p className="text-xs text-slate-500 font-medium">Configura cuántas copias se imprimen y el código QR de verificación SAT.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Copias Factura / Recibo Cliente
              </label>
              <select
                value={config.receipt_copies || 1}
                onChange={e => setConfig(prev => ({ ...prev, receipt_copies: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white outline-hidden"
              >
                <option value={1}>1 Copia (Cliente)</option>
                <option value={2}>2 Copias (Cliente + Caja)</option>
                <option value={3}>3 Copias (Cliente + Caja + Contabilidad)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Copias Comanda Cocina
              </label>
              <select
                value={config.kitchen_copies || 1}
                onChange={e => setConfig(prev => ({ ...prev, kitchen_copies: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white outline-hidden"
              >
                <option value={1}>1 Copia (Cocina)</option>
                <option value={2}>2 Copias (Cocina + Despacho)</option>
                <option value={3}>3 Copias</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ancho del Papel Térmico
              </label>
              <select
                value={config.ticket_width || '80mm'}
                onChange={e => setConfig(prev => ({ ...prev, ticket_width: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white outline-hidden"
              >
                <option value="80mm">80mm (Estándar POS)</option>
                <option value="58mm">58mm (Impresora compacta / móvil)</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-50 rounded-2xl border border-slate-200 w-full">
                <input
                  type="checkbox"
                  checked={!!config.print_qr}
                  onChange={e => setConfig(prev => ({ ...prev, print_qr: e.target.checked ? 1 : 0 }))}
                  className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500"
                />
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-800">Imprimir Código QR SAT</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="group px-6 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl font-bold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
            <span>Guardar Ajustes de Facturación FEL</span>
          </button>
        </div>
      </form>
    </div>
  );
}

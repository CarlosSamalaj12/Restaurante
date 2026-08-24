import { useState, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  PlayCircle,
  StopCircle,
  Clock,
  Loader2,
  DollarSign,
  CreditCard,
  Printer,
  Landmark,
  Receipt,
  PiggyBank,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wallet,
  AlertTriangle,
  CheckCircle,
  FileText
} from 'lucide-react';

const METHOD_CONFIG = {
  cash:    { label: 'Efectivo',         icon: DollarSign,  bg: 'bg-green-50',   text: 'text-green-700',   iconColor: 'text-green-600',   border: 'border-green-200' },
  card:    { label: 'Tarjeta',          icon: CreditCard,  bg: 'bg-purple-50',   text: 'text-purple-700',   iconColor: 'text-purple-600',   border: 'border-purple-200' },
  transfer:{ label: 'Transferencia',    icon: Landmark,    bg: 'bg-blue-50',     text: 'text-blue-700',     iconColor: 'text-blue-600',     border: 'border-blue-200' },
  cxc:     { label: 'Cuentas x Cobrar', icon: Receipt,     bg: 'bg-amber-50',    text: 'text-amber-700',    iconColor: 'text-amber-600',    border: 'border-amber-200' },
  other:   { label: 'Otro',             icon: PiggyBank,   bg: 'bg-gray-50',     text: 'text-gray-700',     iconColor: 'text-gray-600',     border: 'border-gray-200' },
};

export function ShiftsPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [shiftDates, setShiftDates] = useState({ openedAt: null, closedAt: null });
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [showVoided, setShowVoided] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const summaryRef = useRef(null);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadBootstrap();
  }, []);

  useEffect(() => {
    if (selectedCenter) {
      checkActiveShift(selectedCenter);
      setPreviewData(null);
    }
  }, [selectedCenter]);

  const checkActiveShift = async (centerId) => {
    try {
      const result = await api.checkActiveShift(centerId);
      setCurrentShift(result.active ? { id: result.shift.id } : null);
    } catch (error) {
      console.error('Error checking active shift:', error);
    }
  };

  const loadBootstrap = async () => {
    try {
      const data = await api.bootstrap();
      setCenters(data.centers || []);
      if (data.centers?.length > 0) setSelectedCenter(data.centers[0].id);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleOpenShift = async () => {
    if (!selectedCenter) { toast.error('Selecciona un centro'); return; }
    setLoading(true);
    try {
      await api.openShift({
        cashierId: user?.id || 1,
        centerId: selectedCenter,
        note: '',
        openingCash: Number(openingCash) || 0,
      });
      toast.success('Turno abierto');
      setCurrentShift({ id: 'active' });
      setShiftSummary(null);
      setOpeningCash('');
    } catch (error) {
      toast.error(error.message);
    } finally { setLoading(false); }
  };

  const handlePreview = async () => {
    if (!selectedCenter) { toast.error('Selecciona un centro'); return; }
    setPreviewLoading(true);
    try {
      const result = await api.previewShift(selectedCenter, closingCash ? Number(closingCash) : undefined);
      setPreviewData(result.summary);
      toast.success('Vista previa generada');
    } catch (error) {
      toast.error(error.message);
    } finally { setPreviewLoading(false); }
  };

  const handleCloseShift = async () => {
    if (!selectedCenter) { toast.error('Selecciona un centro'); return; }
    setShowConfirm(true);
  };

  const confirmCloseShift = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const result = await api.closeShift({
        cashierId: user?.id || 1,
        centerId: selectedCenter,
        note: '',
        closingCash: closingCash ? Number(closingCash) : null,
      });
      setShiftSummary(result.summary || {});
      setShiftDates({ openedAt: result.openedAt, closedAt: result.closedAt });
      setPreviewData(null);
      toast.success('Turno cerrado exitosamente');
      setCurrentShift(null);
    } catch (error) {
      toast.error(error.message);
    } finally { setLoading(false); }
  };

  const getSummaryData = () => previewData || shiftSummary || {};

  const getMethodTotal = (methodCode) => Number(getSummaryData()[methodCode + '_total'] || 0);

  const getPaymentsByMethod = (methodCode) =>
    (getSummaryData().paymentsDetail || []).filter(p => p.method === methodCode);

  const getCashDifference = () => {
    const s = getSummaryData();
    if (s.closingCash === null || s.closingCash === undefined) return null;
    return Number(s.closingCash) - Number(s.expectedCash || 0);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) { toast.error('Permite ventanas emergentes para imprimir'); return; }

    const s = getSummaryData();
    const centerName = centers.find(c => c.id === selectedCenter)?.name || 'Centro';
    const opened = shiftDates.openedAt ? new Date(shiftDates.openedAt).toLocaleString('es-GT') : '---';
    const closed = shiftDates.closedAt ? new Date(shiftDates.closedAt).toLocaleString('es-GT') : '---';
    const diff = getCashDifference();

    let detailHtml = '';
    for (const m of (s.methods || [])) {
      const payments = getPaymentsByMethod(m.code);
      if (payments.length === 0 && getMethodTotal(m.code) === 0) continue;
      detailHtml += `<h3 style="margin-top:14px;font-size:13px;border-bottom:2px solid #333;padding-bottom:4px">${m.label}</h3>`;
      detailHtml += `<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f3f4f6"><th style="padding:4px 6px;text-align:left"># Cheque</th><th style="padding:4px 6px;text-align:right">Monto</th></tr></thead><tbody>`;
      for (const p of payments) {
        detailHtml += `<tr><td style="padding:3px 6px;border-bottom:1px solid #eee">${p.check_number || '---'}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right">Q${Number(p.amount).toFixed(2)}</td></tr>`;
      }
      detailHtml += `<tr style="font-weight:bold"><td style="padding:4px 6px;border-top:1px solid #999">Subtotal</td><td style="padding:4px 6px;border-top:1px solid #999;text-align:right">Q${getMethodTotal(m.code).toFixed(2)}</td></tr>`;
      detailHtml += `</tbody></table>`;
    }

    let voidHtml = '';
    const voided = s.voidedItems || [];
    if (voided.length > 0) {
      voidHtml = `<h3 style="margin-top:14px;font-size:13px;border-bottom:1px solid #999;padding-bottom:4px;color:#999">Anulaciones</h3>
        <table style="width:100%;border-collapse:collapse;font-size:10px;color:#666">
        <thead><tr style="background:#f9f9f9"><th style="padding:3px 5px;text-align:left">Prod</th><th style="padding:3px 5px;text-align:right">Monto</th></tr></thead><tbody>`;
      for (const v of voided) {
        voidHtml += `<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">${v.product_name}</td><td style="padding:2px 5px;border-bottom:1px solid #eee;text-align:right">-Q${Number(v.line_total).toFixed(2)}</td></tr>`;
      }
      voidHtml += `</tbody></table>`;
    }

    win.document.write(`
      <html><head><title>Cierre de Turno</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; padding: 16px; color: #333; max-width: 80mm; margin:0 auto; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 1px; }
        .sub { text-align: center; font-size: 11px; color: #666; margin-bottom: 12px; }
        .info { margin-bottom: 10px; padding: 6px 0; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; font-size: 11px; }
        .info div { padding: 2px 0; }
        .cuadre { margin: 10px 0; padding: 8px; text-align: center; border: 2px solid #333; }
        .cuadre .big { font-size: 18px; font-weight: bold; }
        .cuadre .label { font-size: 10px; color: #666; }
        .diff-positive { color: #059669; font-weight: bold; }
        .diff-negative { color: #dc2626; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 10px; text-transform: uppercase; }
        .grand { margin-top: 8px; padding: 6px; border-top: 2px solid #333; text-align: right; font-weight: bold; font-size: 14px; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; padding-top: 6px; border-top: 1px dashed #ccc; }
      </style></head><body>
        <h1>Cierre de Turno</h1>
        <div class="sub">${centerName}</div>
        <div class="info">
          <div>Abierto: ${opened}</div>
          <div>Cerrado: ${closed}</div>
          <div>Cajero: ${user?.full_name || '---'}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span>Efectivo inicial:</span><span>Q${Number(s.openingCash || 0).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span>Ventas efectivo:</span><span>+Q${Number(s.cashTotal || 0).toFixed(2)}</span>
        </div>
        <hr style="border-top:1px dashed #999">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold">
          <span>Efectivo esperado:</span><span>Q${Number(s.expectedCash || 0).toFixed(2)}</span>
        </div>
        ${s.closingCash !== null && s.closingCash !== undefined ? `
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px">
          <span>Efectivo contado:</span><span>Q${Number(s.closingCash).toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:2px" class="${diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : ''}">
          <span>Diferencia:</span><span>${diff >= 0 ? '+' : ''}Q${Number(diff || 0).toFixed(2)}</span>
        </div>` : ''}
        <div class="cuadre">
          <div class="big">Q${Number(s.grand_total || 0).toFixed(2)}</div>
          <div class="label">Total General Ventas</div>
        </div>
        ${detailHtml}
        ${voidHtml}
        ${(s.paidAccounts || []).length > 0 ? `
        <h3 style="margin-top:14px;font-size:13px;border-bottom:1px solid #999;padding-bottom:4px;color:#059669">Cobradas (${s.paidAccounts.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr style="background:#f0fdf4"><th style="padding:3px 5px;text-align:left">Cuenta</th><th style="padding:3px 5px;text-align:left">Mesero</th><th style="padding:3px 5px;text-align:left">Pago</th><th style="padding:3px 5px;text-align:right">Total</th></tr></thead><tbody>
        ${s.paidAccounts.map(o => `<tr><td style="padding:2px 5px;border-bottom:1px solid #eee;font-weight:bold">${o.check_number}</td><td style="padding:2px 5px;border-bottom:1px solid #eee">${o.waiter_name || ''}</td><td style="padding:2px 5px;border-bottom:1px solid #eee">${(o.payment_methods || '').toUpperCase()}</td><td style="padding:2px 5px;border-bottom:1px solid #eee;text-align:right">Q${Number(o.total).toFixed(2)}</td></tr>`).join('')}
        </tbody></table>` : ''}
        <div class="grand">Total: Q${Number(s.grand_total || 0).toFixed(2)}</div>
        <div class="footer">--- Fin del Reporte ---</div>
        <script>window.print();window.close();<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Gestión de Turnos</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Centro de Operación</label>
          <select value={selectedCenter || ''} onChange={e => setSelectedCenter(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl p-3">
            <option value="">Seleccionar centro...</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Cajero en Turno</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold">{user?.full_name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.full_name || 'Usuario'}</p>
              <p className="text-sm text-gray-500">
                {user?.role === 'admin' ? 'Administrador' : user?.role === 'manager' ? 'Gerente' : user?.role === 'cashier' ? 'Cajero' : user?.role === 'waiter' ? 'Mesero' : user?.role || 'Cajero'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            {currentShift ? (
              <><div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"><StopCircle className="w-6 h-6 text-green-600" /></div>
                <div><p className="font-semibold text-gray-900">Turno Activo</p><p className="text-sm text-gray-500">Caja abierta</p></div></>
            ) : (
              <><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center"><Clock className="w-6 h-6 text-gray-400" /></div>
                <div><p className="font-semibold text-gray-900">Sin Turno Activo</p><p className="text-sm text-gray-500">Abre un turno para comenzar</p></div></>
            )}
          </div>

          {currentShift ? (
            <>
              {/* Closing cash input */}
              <div className="mb-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
                <label className="text-sm font-medium text-blue-800 mb-1 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Efectivo contado al cerrar
                </label>
                <p className="text-xs text-blue-600 mb-2">Cuenta el dinero en caja e ingresa el total</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">Q</span>
                  <input type="number" step="0.01" min="0" value={closingCash}
                    onChange={e => setClosingCash(e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border-2 border-blue-200 rounded-xl text-lg font-bold focus:border-blue-500 focus:outline-none bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePreview} disabled={previewLoading}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  {previewLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Vista Previa</>}
                </button>
                <button onClick={handleCloseShift} disabled={loading}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><StopCircle className="w-5 h-5" /> Cerrar Turno</>}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Opening cash input */}
              <div className="mb-4 bg-green-50 rounded-xl p-4 border border-green-100">
                <label className="text-sm font-medium text-green-800 mb-1 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Efectivo inicial en caja
                </label>
                <p className="text-xs text-green-600 mb-2">¿Con cuánto efectivo empiezas el turno?</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">Q</span>
                  <input type="number" step="0.01" min="0" value={openingCash}
                    onChange={e => setOpeningCash(e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border-2 border-green-200 rounded-xl text-lg font-bold focus:border-green-500 focus:outline-none bg-white"
                  />
                </div>
              </div>
              <button onClick={handleOpenShift} disabled={loading || !selectedCenter}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PlayCircle className="w-5 h-5" /> Abrir Nuevo Turno</>}
              </button>
            </>
          )}
        </div>

        {(shiftSummary || previewData) && (
          <m.div ref={summaryRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-xl p-4 border ${previewData ? 'border-blue-300' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {previewData ? 'Vista Previa del Cierre' : 'Resumen del Turno'}
              </h3>
              <div className="flex items-center gap-2">
                {previewData && (
                  <>
                    <button onClick={() => setPreviewData(null)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 font-medium flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Cerrar vista
                    </button>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">Previsualización</span>
                  </>
                )}
                <button onClick={handlePrint}
                  className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5">
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              </div>
            </div>

          {(() => {
            const s = previewData || shiftSummary;
            if (!s) return null;
            return (
            <>
            {/* Cuadre de efectivo */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4 border-2 border-gray-300">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Cuadre de Efectivo
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Efectivo inicial</span>
                  <span className="font-medium">Q{Number(s.openingCash || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">+ Ventas en efectivo</span>
                  <span className="font-medium text-green-600">+Q{Number(s.cashTotal || 0).toFixed(2)}</span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between items-center font-bold">
                  <span>Efectivo esperado</span>
                  <span className="text-lg">Q{Number(s.expectedCash || 0).toFixed(2)}</span>
                </div>
                {s.closingCash !== null && s.closingCash !== undefined && (() => {
                  const diff = Number(s.closingCash) - Number(s.expectedCash || 0);
                  const diffClass = diff === 0 ? 'bg-green-100 text-green-800' : diff > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800';
                  const diffSign = diff >= 0 ? '+' : '';
                  return (
                    <>
                      <hr className="border-gray-300" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Efectivo contado</span>
                        <span className="font-medium">Q{Number(s.closingCash).toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between items-center text-sm font-bold p-2 rounded-lg ${diffClass}`}>
                        <span>Diferencia</span>
                        <span>{diffSign}Q{Math.abs(diff).toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Totals by method */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(s.methods || []).map(m => {
                const total = getMethodTotal(m.code);
                if (total === 0 && getPaymentsByMethod(m.code).length === 0) return null;
                const cfg = METHOD_CONFIG[m.code] || METHOD_CONFIG.other;
                const Icon = cfg.icon;
                return (
                  <button key={m.code} onClick={() => setExpandedMethod(expandedMethod === m.code ? null : m.code)}
                    className={`${cfg.bg} rounded-xl p-3 border ${cfg.border} text-left transition-all`}>
                    <div className={`flex items-center gap-1.5 mb-1 ${cfg.iconColor}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">Q{total.toFixed(2)}</p>
                  </button>
                );
              })}
            </div>

            {/* Detail by method */}
            {expandedMethod && (
              <div className="mb-4 bg-gray-50 rounded-xl p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  {(() => { const Icon = METHOD_CONFIG[expandedMethod]?.icon || DollarSign; return <Icon className="w-4 h-4" />; })()}
                  {METHOD_CONFIG[expandedMethod]?.label || expandedMethod}
                </h4>
                {getPaymentsByMethod(expandedMethod).length === 0 ? (
                  <p className="text-sm text-gray-400">Sin movimientos</p>
                ) : (
                  <div className="space-y-1">
                    {getPaymentsByMethod(expandedMethod).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                        <span className="font-mono text-gray-600">#{p.check_number || '---'}</span>
                        <span className="font-semibold text-gray-900">Q{Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Voided items */}
            {(s.voidedItems || []).length > 0 && (
              <div className="mb-3">
                <button onClick={() => setShowVoided(!showVoided)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                  <XCircle className="w-4 h-4" />
                  Items anulados ({(s.voidedItems || []).length})
                  {showVoided ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showVoided && (
                  <div className="mt-2 space-y-1 bg-red-50 rounded-xl p-3">
                    {(s.voidedItems || []).map((v, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-mono text-gray-500 text-xs">#{v.check_number}</span>
                          <span className="text-gray-700 ml-2">{v.product_name}</span>
                        </div>
                        <span className="text-red-600 font-medium">-Q{Number(v.line_total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Open accounts */}
            {(s.openAccounts || []).length > 0 && (
              <div className="mb-3">
                <button onClick={() => setShowOpen(!showOpen)}
                  className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-800">
                  <Receipt className="w-4 h-4" />
                  Cuentas pendientes ({(s.openAccounts || []).length})
                  {showOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showOpen && (
                  <div className="mt-2 space-y-1 bg-amber-50 rounded-xl p-3">
                    {(s.openAccounts || []).map((o, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-gray-600">#{o.check_number} - {o.waiter_name}</span>
                        <span className="font-semibold text-amber-700">Q{Number(o.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Paid accounts */}
            {(s.paidAccounts || []).length > 0 && (
              <div className="mb-3">
                <button onClick={() => {
                  const opened = expandedMethod === 'paid';
                  setExpandedMethod(opened ? null : 'paid');
                }}
                  className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  Cuentas cobradas ({(s.paidAccounts || []).length})
                  {expandedMethod === 'paid' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedMethod === 'paid' && (
                  <div className="mt-2 space-y-1 bg-green-50 rounded-xl p-3">
                    {(s.paidAccounts || []).map((o, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-mono text-gray-600">#{o.check_number}</span>
                          <span className="text-gray-500 ml-2 text-xs">{o.waiter_name}</span>
                          {o.payment_methods && <span className="text-gray-400 ml-1 text-xs">({o.payment_methods.toUpperCase()})</span>}
                        </div>
                        <span className="font-semibold text-green-700">Q{Number(o.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grand total */}
            <div className="bg-gray-900 rounded-xl p-4 text-white">
              <div className="flex justify-between items-center mb-2 text-gray-300">
                <span>Total de Cuentas</span>
                <span>{s.total_checks || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                <span className="text-lg font-bold">TOTAL GENERAL</span>
                <span className="text-2xl font-bold text-emerald-400">
                  Q{Number(s.grand_total || 0).toFixed(2)}
                </span>
              </div>
            </div>
            </>);
          })()}
          </m.div>
        )}

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h4 className="font-medium text-blue-800 mb-2">Flujo de trabajo</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Al abrir turno, ingresa el efectivo con que empiezas</li>
            <li>2. Durante el turno, ve cerrando cuentas y cobrando</li>
            <li>3. Al cerrar, ingresa el efectivo que tienes en caja</li>
            <li>4. El sistema calcula: inicial + ventas efectivo = esperado</li>
            <li>5. Compara el esperado vs lo contado para ver diferencias</li>
          </ul>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <m.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Cerrar Turno</h3>
            <p className="text-gray-500 text-center text-sm mb-1">¿Estás seguro de cerrar el turno?</p>
            <p className="text-red-500 text-center text-xs font-medium mb-6">Esta acción no se puede revertir</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmCloseShift}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                <StopCircle className="w-4 h-4" /> Cerrar Turno
              </button>
            </div>
          </m.div>
        </div>
      )}
    </div>
  );
}
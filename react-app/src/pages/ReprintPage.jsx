import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import { api } from '../api';
import {
  ArrowLeft, Search, Printer, Receipt, FileText,
  Clock, ChevronDown, ChevronUp, Loader2, DollarSign, CreditCard,
  Building2, Users, Hash, Calendar, CheckCircle, X, AlertTriangle
} from 'lucide-react';

const METHOD_CONFIG = {
  cash: { label: 'Efectivo', icon: DollarSign },
  card: { label: 'Tarjeta', icon: CreditCard },
  transfer: { label: 'Transferencia', icon: Building2 },
  cxc: { label: 'CXC', icon: Users },
  other: { label: 'Otro', icon: DollarSign },
};

export function ReprintPage({ onBack, user }) {
  const toast = useToast();
  const [tab, setTab] = useState('account');
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');

  // Account search
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Shift list
  const [closedShifts, setClosedShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [shiftReport, setShiftReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    api.bootstrap().then(data => {
      setCenters(data.centers || []);
    }).catch(() => {});
  }, []);

  const doSearch = useCallback(() => {
    if (!selectedCenter) {
      toast.error('Selecciona un centro');
      return;
    }
    const q = searchQuery.trim();
    setSearching(true);
    setReceiptData(null);
    setSelectedAccount(null);
    api.searchPaidAccounts(q || '', selectedCenter, startDate || undefined, endDate || undefined)
      .then(results => {
        setSearchResults(results);
        if (results.length === 0) toast.error('No se encontraron cuentas');
      })
      .catch(e => toast.error(e.message))
      .finally(() => setSearching(false));
  }, [selectedCenter, searchQuery, startDate, endDate]);

  // Auto-search when center or dates change
  useEffect(() => {
    if (selectedCenter) doSearch();
  }, [selectedCenter, startDate, endDate]);

  const loadReceipt = async (accountId) => {
    setLoadingReceipt(true);
    setSelectedAccount(accountId);
    setReceiptData(null);
    try {
      const data = await api.getAccountReceipt(accountId);
      setReceiptData(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    const { account, items, payments, totals } = receiptData;
    const restaurantName = 'RESTAURANTE POS';
    const now = new Date().toLocaleString('es-GT');
    const win = window.open('', '_blank');
    if (!win) { toast.error('Permite ventanas emergentes para imprimir'); return; }

    let itemsHtml = items.map(i => `
      <tr><td style="padding:2px 4px">${i.qty} x ${i.product_name}</td><td style="padding:2px 4px;text-align:right">Q${Number(i.line_total).toFixed(2)}</td></tr>
    `).join('');

    let paymentsHtml = (payments || []).map(p => `
      <tr><td style="padding:2px 4px">${p.method_label || p.method}</td><td style="padding:2px 4px;text-align:right">Q${Number(p.amount).toFixed(2)}</td></tr>
    `).join('');

    win.document.write(`
      <html><head><title>Reimpresión Cuenta #${account.check_number}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; max-width: 80mm; margin:0 auto; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 2px; text-transform: uppercase; }
        .sub { text-align: center; font-size: 10px; color: #666; margin-bottom: 8px; }
        .info { font-size: 11px; margin-bottom: 8px; padding: 4px 0; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; }
        .info div { padding: 1px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { text-align: left; padding: 3px 4px; border-bottom: 1px solid #333; }
        td { padding: 2px 4px; }
        .total-row td { border-top: 2px solid #333; font-weight: bold; }
        .grand { font-size: 14px; font-weight: bold; text-align: right; margin-top: 6px; padding-top: 4px; border-top: 2px solid #333; }
        .reprint-msg { text-align: center; font-size: 10px; color: #999; margin-top: 8px; font-style: italic; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 8px; padding-top: 4px; border-top: 1px dashed #ccc; }
      </style></head><body>
        <h1>${restaurantName}</h1>
        <div class="sub">REIMPRESIÓN</div>
        <div class="info">
          <div>Cuenta: #${account.check_number}</div>
          <div>Mesa: ${account.table_code || '---'}</div>
          <div>Mesero: ${account.waiter_name || '---'}</div>
          <div>Reimpreso: ${now}</div>
        </div>
        <table><thead><tr><th>Producto</th><th style="text-align:right">Total</th></tr></thead><tbody>
          ${itemsHtml}
        </tbody></table>
        <div class="grand">Subtotal: Q${Number(totals.subtotal || 0).toFixed(2)}</div>
        ${Number(totals.discountTotal || 0) > 0 ? `<div style="text-align:right;font-size:11px;color:#dc2626">Descuento: -Q${Number(totals.discountTotal).toFixed(2)}</div>` : ''}
        <div style="text-align:right;font-size:11px">Propina (${totals.tipPercent || 0}%): Q${Number(totals.tipAmount || 0).toFixed(2)}</div>
        <div style="text-align:right;font-size:14px;font-weight:bold;margin-top:4px">Total: Q${Number(totals.total || 0).toFixed(2)}</div>
        ${paymentsHtml ? `<h3 style="font-size:11px;margin-top:8px;margin-bottom:2px">Pagos</h3><table>${paymentsHtml}</table>` : ''}
        <div style="text-align:center;font-size:11px;margin-top:6px;padding-top:4px;border-top:1px dashed #ccc">¡Gracias por su visita!</div>
        <div class="reprint-msg">--- REIMPRESIÓN ---</div>
        <div class="footer">--- Fin del Ticket ---</div>
        <script>window.print();window.close();<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const loadClosedShifts = async (centerId) => {
    if (!centerId) return;
    setLoadingShifts(true);
    setShiftReport(null);
    setSelectedShiftId(null);
    try {
      const shifts = await api.getClosedShifts(centerId);
      setClosedShifts(shifts);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingShifts(false);
    }
  };

  const loadShiftReport = async (shiftId) => {
    setLoadingReport(true);
    setSelectedShiftId(shiftId);
    setShiftReport(null);
    try {
      const data = await api.getShiftReport(shiftId);
      setShiftReport(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingReport(false);
    }
  };

  const handlePrintShift = () => {
    if (!shiftReport) return;
    const { shift, summary: s } = shiftReport;
    const centerName = centers.find(c => c.id === Number(selectedCenter))?.name || 'Centro';
    const opened = shift.opened_at ? new Date(shift.opened_at).toLocaleString('es-GT') : '---';
    const closed = shift.closed_at ? new Date(shift.closed_at).toLocaleString('es-GT') : '---';
    const diff = s.closingCash !== null ? Number(s.closingCash) - Number(s.expectedCash || 0) : null;
    const win = window.open('', '_blank');
    if (!win) { toast.error('Permite ventanas emergentes para imprimir'); return; }

    const methodsHtml = (s.methods || []).map(m => {
      const total = Number(s[m.code + '_total'] || 0);
      if (total === 0) return '';
      const payments = (s.paymentsDetail || []).filter(p => p.method === m.code);
      return `
        <h3 style="margin-top:12px;font-size:13px;border-bottom:2px solid #333;padding-bottom:4px">${m.label}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f3f4f6"><th style="padding:4px 6px;text-align:left"># Cheque</th><th style="padding:4px 6px;text-align:right">Monto</th></tr></thead><tbody>
        ${payments.map(p => `<tr><td style="padding:3px 6px;border-bottom:1px solid #eee">${p.check_number || '---'}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right">Q${Number(p.amount).toFixed(2)}</td></tr>`).join('')}
        <tr style="font-weight:bold"><td style="padding:4px 6px;border-top:1px solid #999">Subtotal</td><td style="padding:4px 6px;border-top:1px solid #999;text-align:right">Q${total.toFixed(2)}</td></tr>
        </tbody></table>`;
    }).join('');

    const voidHtml = (s.voidedItems || []).length > 0 ? `
      <h3 style="margin-top:12px;font-size:13px;border-bottom:1px solid #999;padding-bottom:4px;color:#999">Anulaciones</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10px;color:#666">
      <thead><tr style="background:#f9f9f9"><th style="padding:3px 5px;text-align:left">Producto</th><th style="padding:3px 5px;text-align:right">Monto</th></tr></thead><tbody>
      ${s.voidedItems.map(v => `<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">${v.product_name}</td><td style="padding:2px 5px;border-bottom:1px solid #eee;text-align:right">-Q${Number(v.line_total).toFixed(2)}</td></tr>`).join('')}
      </tbody></table>` : '';

    const paidHtml = (s.paidAccounts || []).length > 0 ? `
      <h3 style="margin-top:12px;font-size:13px;border-bottom:1px solid #999;padding-bottom:4px;color:#059669">Cobradas (${s.paidAccounts.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead><tr style="background:#f0fdf4"><th style="padding:3px 5px;text-align:left">Cuenta</th><th style="padding:3px 5px;text-align:left">Mesero</th><th style="padding:3px 5px;text-align:left">Pago</th><th style="padding:3px 5px;text-align:right">Total</th></tr></thead><tbody>
      ${s.paidAccounts.map(o => `<tr><td style="padding:2px 5px;border-bottom:1px solid #eee;font-weight:bold">${o.check_number}</td><td style="padding:2px 5px;border-bottom:1px solid #eee">${o.waiter_name || ''}</td><td style="padding:2px 5px;border-bottom:1px solid #eee">${(o.payment_methods || '').toUpperCase()}</td><td style="padding:2px 5px;border-bottom:1px solid #eee;text-align:right">Q${Number(o.total).toFixed(2)}</td></tr>`).join('')}
      </tbody></table>` : '';

    win.document.write(`
      <html><head><title>Reimpresión Cierre de Turno</title>
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
        .reprint-msg { text-align: center; font-size: 10px; color: #999; margin-top: 8px; font-style: italic; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; padding-top: 6px; border-top: 1px dashed #ccc; }
      </style></head><body>
        <h1>Cierre de Turno</h1>
        <div class="sub">${centerName} — REIMPRESIÓN</div>
        <div class="info">
          <div>Abierto: ${opened}</div>
          <div>Cerrado: ${closed}</div>
          <div>Cajero: ${shift.cashier_name || '---'}</div>
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
        ${s.closingCash !== null ? `
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
        ${methodsHtml}
        ${voidHtml}
        ${paidHtml}
        <div class="grand">Total: Q${Number(s.grand_total || 0).toFixed(2)}</div>
        <div class="reprint-msg">--- REIMPRESIÓN ---</div>
        <div class="footer">--- Fin del Reporte ---</div>
        <script>window.print();window.close();<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const formatDate = (d) => {
    if (!d) return '---';
    return new Date(d).toLocaleString('es-GT');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Reimprimir</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Center selector */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Centro de Operación</label>
          <select value={selectedCenter} onChange={e => {
            setSelectedCenter(e.target.value);
            setSearchResults([]);
            setReceiptData(null);
            setClosedShifts([]);
            setShiftReport(null);
            if (e.target.value) loadClosedShifts(e.target.value);
          }}
            className="w-full border border-gray-200 rounded-xl p-3">
            <option value="">Seleccionar centro...</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-200 rounded-xl p-1">
          <button onClick={() => setTab('account')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${tab === 'account' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            <Receipt className="w-4 h-4 inline mr-1.5" />Reimprimir Cuenta
          </button>
          <button onClick={() => setTab('shift')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${tab === 'shift' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            <FileText className="w-4 h-4 inline mr-1.5" />Reimprimir Cierre
          </button>
        </div>

        {/* Tab: Account reprint */}
        {tab === 'account' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Buscar cuenta por número
              </label>
              <input type="text" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                placeholder="CHK-0001 (opcional)"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3"
              />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Desde (opcional)</label>
                  <input type="date" value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Hasta (opcional)</label>
                  <input type="date" value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm"
                  />
                </div>
              </div>
              <button onClick={doSearch} disabled={searching}
                className="w-full py-3 bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Buscar</>}
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
                <div className="p-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Resultados ({searchResults.length})
                </div>
                {searchResults.map(r => (
                  <button key={r.id} onClick={() => loadReceipt(r.id)}
                    className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors ${selectedAccount === r.id ? 'bg-blue-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-gray-900">{r.check_number}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">M{r.table_code}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {r.waiter_name} · {formatDate(r.closed_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className="font-semibold text-gray-900">Q{Number(r.total || 0).toFixed(2)}</span>
                      {selectedAccount === r.id && loadingReceipt && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                      {selectedAccount === r.id && !loadingReceipt && receiptData && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Receipt data */}
            {receiptData && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Cuenta #{receiptData.account.check_number}
                  </h3>
                  <button onClick={handlePrintReceipt}
                    className="px-4 py-2 bg-primary-500 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 rounded-xl p-3">
                  <div><span className="text-gray-500">Mesa:</span> <span className="font-medium">{receiptData.account.table_code || '---'}</span></div>
                  <div><span className="text-gray-500">Mesero:</span> <span className="font-medium">{receiptData.account.waiter_name || '---'}</span></div>
                  {receiptData.account.closed_at && <div><span className="text-gray-500">Cerrada:</span> <span className="font-medium">{formatDate(receiptData.account.closed_at)}</span></div>}
                </div>

                <div className="text-sm font-medium text-gray-700">Productos</div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {(receiptData.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-700">{item.qty} x {item.product_name}</span>
                      <span className="font-medium text-gray-900">Q{Number(item.line_total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>Q{Number(receiptData.totals.subtotal || 0).toFixed(2)}</span></div>
                  {Number(receiptData.totals.discountTotal || 0) > 0 && <div className="flex justify-between text-red-500"><span>Descuento</span><span>-Q{Number(receiptData.totals.discountTotal).toFixed(2)}</span></div>}
                  <div className="flex justify-between text-gray-600"><span>Propina ({receiptData.totals.tipPercent || 0}%)</span><span>Q{Number(receiptData.totals.tipAmount || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>Q{Number(receiptData.totals.total || 0).toFixed(2)}</span></div>
                </div>

                {(receiptData.payments || []).length > 0 && (
                  <>
                    <div className="text-sm font-medium text-gray-700">Pagos</div>
                    <div className="space-y-1">
                      {receiptData.payments.map((p, i) => (
                        <div key={i} className="flex justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                          <span className="text-gray-700">{p.method_label || p.method}</span>
                          <span className="font-medium text-green-700">Q{Number(p.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Shift reprint */}
        {tab === 'shift' && (
          <div className="space-y-4">
            {/* Closed shifts list */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Turnos cerrados
                </span>
                {loadingShifts && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>
              {closedShifts.length === 0 && !loadingShifts && (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No hay turnos cerrados en este centro
                </div>
              )}
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {closedShifts.map(s => (
                  <button key={s.id} onClick={() => loadShiftReport(s.id)}
                    className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors ${selectedShiftId === s.id ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Turno #{s.id}</div>
                        <div className="text-xs text-gray-500">{formatDate(s.opened_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{s.cashier_name || ''}</span>
                      {selectedShiftId === s.id && loadingReport && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                      {selectedShiftId === s.id && !loadingReport && shiftReport && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Shift report */}
            {shiftReport && (() => {
              const { shift, summary: s } = shiftReport;
              const diff = s.closingCash !== null ? Number(s.closingCash) - Number(s.expectedCash || 0) : null;
              const totalChecks = (s.paidAccounts || []).length + (s.openAccounts || []).length;
              return (
                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Cierre de Turno #{shift.id}</h3>
                    <button onClick={handlePrintShift}
                      className="px-4 py-2 bg-primary-500 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
                      <Printer className="w-4 h-4" /> Imprimir
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 rounded-xl p-3">
                    <div><span className="text-gray-500">Abierto:</span> <span className="font-medium">{formatDate(shift.opened_at)}</span></div>
                    <div><span className="text-gray-500">Cerrado:</span> <span className="font-medium">{formatDate(shift.closed_at)}</span></div>
                    <div><span className="text-gray-500">Cajero:</span> <span className="font-medium">{shift.cashier_name || '---'}</span></div>
                    <div><span className="text-gray-500">Cuentas:</span> <span className="font-medium">{totalChecks}</span></div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 text-white space-y-2">
                    <div className="flex justify-between"><span className="text-gray-300">Efectivo inicial</span><span>Q{Number(s.openingCash || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-300">Ventas efectivo</span><span>+Q{Number(s.cashTotal || 0).toFixed(2)}</span></div>
                    <hr className="border-gray-600" />
                    <div className="flex justify-between font-bold"><span>Efectivo esperado</span><span>Q{Number(s.expectedCash || 0).toFixed(2)}</span></div>
                    {s.closingCash !== null && (
                      <>
                        <div className="flex justify-between"><span className="text-gray-300">Efectivo contado</span><span>Q{Number(s.closingCash).toFixed(2)}</span></div>
                        <div className={`flex justify-between font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : ''}`}>
                          <span>Diferencia</span>
                          <span>{diff >= 0 ? '+' : ''}Q{Number(diff || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 text-white">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">TOTAL GENERAL</span>
                      <span className="text-2xl font-bold text-emerald-400">Q{Number(s.grand_total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Methods */}
                  <div className="space-y-2">
                    {(s.methods || []).map((m, i) => {
                      const total = Number(s[m.code + '_total'] || 0);
                      if (total === 0) return null;
                      const Icon = METHOD_CONFIG[m.code]?.icon || DollarSign;
                      return (
                        <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Icon className="w-5 h-5 text-gray-600" />
                            </div>
                            <span className="font-medium text-gray-900">{m.label}</span>
                          </div>
                          <span className="font-semibold text-gray-900">Q{total.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Paid accounts summary */}
                  {(s.paidAccounts || []).length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Cuentas cobradas ({s.paidAccounts.length})
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
                        {s.paidAccounts.map((o, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-mono text-gray-600">#{o.check_number}</span>
                              <span className="text-gray-500 ml-2 text-xs">{o.waiter_name}</span>
                            </div>
                            <span className="font-semibold text-green-700">Q{Number(o.total).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

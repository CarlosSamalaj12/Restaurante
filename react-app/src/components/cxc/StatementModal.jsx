import { useState, useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import {
  Loader2,
  X,
  Download,
  Printer
} from 'lucide-react';

export function StatementModal({ client, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCenter, setFilterCenter] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCheck, setFilterCheck] = useState('');
  const toast = useToast();
  const { user } = useAuth();
  const tableRef = useRef(null);

  useEffect(() => {
    loadStatement();
  }, []);

  const loadStatement = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCenter) params.center_id = filterCenter;
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;
      if (filterCheck) params.check_number = filterCheck;
      const res = await api.cxc.getStatement(client.id, params);
      setData(res);
    } catch (error) {
      toast.error('Error al cargar estado de cuenta');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    const params = {};
    if (filterCenter) params.center_id = filterCenter;
    if (filterStartDate) params.start_date = filterStartDate;
    if (filterEndDate) params.end_date = filterEndDate;
    if (filterCheck) params.check_number = filterCheck;
    const qs = new URLSearchParams(params).toString();
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/cxc/export-statement/${client.id}${qs ? '?' + qs : ''}`, {
        headers: { ...(token && { 'X-Auth-Token': token }) }
      });
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Estado_Cuenta_${client.full_name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Error al exportar Excel');
    }
  };

  const printReport = () => {
    if (!data) return;
    const w = window.open('', '_blank');
    const userName = user?.full_name || 'Usuario';
    const balance = Number(data.client.current_balance);
    const rowsHtml = data.movements.map((m, i) => `
      <tr${i % 2 === 1 ? ' class="alt"' : ''}>
        <td style="text-align:left">${new Date(m.date).toLocaleDateString()}</td>
        <td style="text-align:left">${m.description}</td>
        <td>${m.center_name || '-'}</td>
        <td class="${m.charge > 0 ? 'red' : ''}">${m.charge > 0 ? 'Q' + m.charge.toFixed(2) : '-'}</td>
        <td class="${m.payment > 0 ? 'green' : ''}">${m.payment > 0 ? 'Q' + m.payment.toFixed(2) : '-'}</td>
        <td class="${m.balance > 0 ? 'red' : 'green'}">Q${m.balance.toFixed(2)}</td>
      </tr>
    `).join('');

    w.document.write(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Estado de Cuenta - ${data.client.full_name}</title>
<style>
  @page { margin: 1.5cm; size: landscape; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #222; margin:0; padding:20px; }
  .header { text-align:center; margin-bottom:20px; }
  .header h1 { color: #1F4E79; font-size: 20pt; margin:0; }
  .header p { color: #666; font-size: 9pt; margin:2px 0; }
  .summary { display:flex; justify-content:center; gap:15px; margin:15px 0; }
  .summary > div { background:#f5f5f5; border:1px solid #ddd; border-radius:6px; padding:8px 18px; text-align:center; }
  .summary > div .label { font-size:7.5pt; color:#888; text-transform:uppercase; }
  .summary > div .value { font-size:16pt; font-weight:bold; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th { background:#1F4E79; color:#fff; font-size:8pt; text-transform:uppercase; padding:7px 6px; text-align:right; }
  th:first-child, th:nth-child(2), th:nth-child(3) { text-align:left; }
  td { padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:9pt; }
  td:first-child, td:nth-child(2), td:nth-child(3) { text-align:left; }
  .alt td { background:#f9f9f9; }
  .red { color:#d32f2f; font-weight:bold; }
  .green { color:#2e7d32; font-weight:bold; }
  .total td { background:#e8e8e8; font-weight:bold; font-size:10pt; border-top:2px solid #999; }
  .footer { text-align:center; color:#999; font-size:7.5pt; margin-top:20px; }
  @media print { body { padding:0; } .no-print { display:none; } }
</style></head><body>
<div class="no-print" style="text-align:right;margin-bottom:10px">
  <button onclick="window.print()" style="padding:6px 18px;background:#1F4E79;color:#fff;border:none;border-radius:4px;cursor:pointer">Imprimir</button>
  <button onclick="window.close()" style="padding:6px 18px;background:#ccc;border:none;border-radius:4px;cursor:pointer;margin-left:6px">Cerrar</button>
</div>
<div class="header">
  <h1>ESTADO DE CUENTA</h1>
  <p>${data.client.full_name}${data.client.area_name ? '  |  ' + data.client.area_name : ''}</p>
  <p>Generado por: ${userName}  |  ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  ${filterStartDate || filterEndDate ? '  |  Período: ' + (filterStartDate || '—') + ' al ' + (filterEndDate || '—') : ''}</p>
</div>
<div class="summary">
  <div><div class="label">Total Cargado</div><div class="value">Q${data.totals.total_charged.toFixed(2)}</div></div>
  <div><div class="label">Total Pagado</div><div class="value" style="color:#2e7d32">Q${data.totals.total_paid.toFixed(2)}</div></div>
  <div><div class="label">Saldo Actual</div><div class="value" style="color:${balance > 0 ? '#d32f2f' : '#2e7d32'}">Q${balance.toFixed(2)}</div></div>
  <div><div class="label">Límite</div><div class="value">Q${Number(data.client.credit_limit || 0).toFixed(2)}</div></div>
</div>
<table>
<thead><tr><th>Fecha</th><th>Descripción</th><th>Centro</th><th>Cargo</th><th>Pago</th><th>Saldo</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr class="total"><td colspan="3">TOTALES</td>
  <td class="red">Q${data.totals.total_charged.toFixed(2)}</td>
  <td class="green">Q${data.totals.total_paid.toFixed(2)}</td>
  <td class="${balance > 0 ? 'red' : 'green'}">Q${balance.toFixed(2)}</td>
</tr></tfoot>
</table>
<div class="footer">Documento generado el ${new Date().toLocaleString()} - Sistema de Cuentas por Cobrar</div>
<script>window.onload=function(){setTimeout(function(){document.querySelector('.no-print').style.display='none';window.print();window.close()},500)}</script>
</body></html>
`);
    w.document.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-5xl p-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const balance = Number(data.client.current_balance);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Estado de Cuenta</h3>
            <p className="text-sm text-gray-500">
              {data.client.full_name}{data.client.area_name ? ` · ${data.client.area_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printReport}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={exportExcel}
              className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Centro:</label>
            <select
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              <option value="">Todos</option>
              {data.centers?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Chk:</label>
            <input
              type="text"
              value={filterCheck}
              onChange={(e) => setFilterCheck(e.target.value)}
              placeholder="No. de check"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white w-28"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Desde:</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Hasta:</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <button
            onClick={loadStatement}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            Filtrar
          </button>
          {(filterCenter || filterStartDate || filterEndDate || filterCheck) && (
            <button
              onClick={() => { setFilterCenter(''); setFilterStartDate(''); setFilterEndDate(''); setFilterCheck(''); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Cargado</p>
            <p className="text-lg font-bold text-gray-900">Q{data.totals.total_charged.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Pagado</p>
            <p className="text-lg font-bold text-green-600">Q{data.totals.total_paid.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Saldo Actual</p>
            <p className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Q{balance.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Límite</p>
            <p className="text-lg font-bold text-gray-900">Q{Number(data.client.credit_limit || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Movements Table */}
        <div className="flex-1 overflow-auto px-6 py-4" ref={tableRef}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Fecha</th>
                <th className="text-left py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Descripción</th>
                <th className="text-left py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Centro</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Cargo</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Pago</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((m, i) => (
                <tr key={i} className={`border-b border-gray-50 ${m.type === 'initial' ? 'bg-gray-50' : ''}`}>
                  <td className="py-2.5 text-gray-600 whitespace-nowrap">{new Date(m.date).toLocaleDateString()}</td>
                  <td className={`py-2.5 ${m.type === 'initial' ? 'text-gray-400 italic' : 'text-gray-800'}`}>{m.description}</td>
                  <td className="py-2.5 text-gray-500 text-sm">{m.center_name || '-'}</td>
                  <td className="py-2.5 text-right">
                    {m.charge > 0 ? (
                      <span className="font-medium text-red-600">Q{m.charge.toFixed(2)}</span>
                    ) : '-'}
                  </td>
                  <td className="py-2.5 text-right">
                    {m.payment > 0 ? (
                      <span className="font-medium text-green-600">Q{m.payment.toFixed(2)}</span>
                    ) : '-'}
                  </td>
                  <td className={`py-2.5 text-right font-semibold ${
                    m.balance > 0 ? 'text-red-600' : m.balance < 0 ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    Q{m.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="py-3 text-gray-700" colSpan={3}>TOTALES</td>
                <td className="py-3 text-right text-red-600">Q{data.totals.total_charged.toFixed(2)}</td>
                <td className="py-3 text-right text-green-600">Q{data.totals.total_paid.toFixed(2)}</td>
                <td className={`py-3 text-right ${
                  balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>Q{balance.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">
            Cerrar
          </button>
        </div>
      </m.div>
    </div>
  );
}


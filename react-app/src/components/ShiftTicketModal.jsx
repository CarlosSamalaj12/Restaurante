import React, { useEffect, useCallback } from 'react';
import { Printer, Share2, X, Check, Copy } from 'lucide-react';
import { useToast } from '../hooks/useToast';

/**
 * Formatea valores numéricos a moneda Q con 2 decimales.
 */
export function formatMoney(val) {
  const num = Number(val);
  return Number.isNaN(num) ? 'Q0.00' : `Q${num.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Extrae la hora formateada HH:MM AM/PM de una fecha ISO o string.
 */
export function formatTimeOnly(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (_) {
    return '';
  }
}

/**
 * Genera el documento HTML completo para impresión térmica directa de 80mm
 */
export function generateShiftTicketHtml({
  type = 'X',
  shiftData = {},
  businessProfile = {},
  centerName = 'Sucursal Principal',
  cashierName = 'Cajero',
  terminalInfo = { code: 'POS-01', name: 'Lado A' },
}) {
  const isZ = type === 'Z';
  const docTitle = isZ ? 'CORTE Z - CIERRE DEFINITIVO' : 'CORTE X - ARQUEO PARCIAL';
  const docNotice = isZ ? 'CIERRE FISCAL Y DE AUDITORÍA DEFINITIVO' : 'DOCUMENTO DE CONTROL INTERNO - NO CIERRA TURNO';

  const subtitle = businessProfile?.business_subtitle || 'POS RESTAURANTE & BAR';
  const restaurantName = businessProfile?.restaurant_name || 'SAMAPOS ARQUEO';
  const nit = businessProfile?.tax_id || businessProfile?.nit || '8492048-2';
  const phone = businessProfile?.phone || '(502) 2345-6789';
  const address = businessProfile?.address || 'Ciudad de Guatemala';
  const receiptLogo = businessProfile?.receipt_logo_url || null;

  const shiftId = shiftData.shiftId || shiftData.id || '0001';
  const openedStr = shiftData.openedAt ? new Date(shiftData.openedAt).toLocaleString('es-GT') : '---';
  const now = new Date();
  const timeOnly = now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const printTimeStr = isZ
    ? (shiftData.closedAt ? new Date(shiftData.closedAt).toLocaleString('es-GT') : now.toLocaleString('es-GT'))
    : `EN CURSO (${timeOnly})`;

  const openingCash = Number(shiftData.openingCash || 0);
  const cashSales = Number(shiftData.cash_total || shiftData.cashTotal || 0);
  const expenses = Number(shiftData.expensesTotal || 0);
  const expectedCash = Number(shiftData.expectedCash || (openingCash + cashSales - expenses));
  const closingCash = shiftData.closingCash !== null && shiftData.closingCash !== undefined
    ? Number(shiftData.closingCash)
    : expectedCash;
  const diff = closingCash - expectedCash;
  const diffLabel = Math.abs(diff) < 0.01 ? '(Cuadrado)' : diff > 0 ? '(Sobrante)' : '(Faltante)';

  const activeMethods = shiftData.methods || [
    { code: 'cash', label: 'Efectivo' },
    { code: 'card', label: 'Tarjeta' },
    { code: 'room_charge', label: 'Cargo Habitación' },
    { code: 'cxc', label: 'Crédito / CxC' },
    { code: 'courtesy', label: 'Exento / Consumos' },
    { code: 'transfer', label: 'Transferencia' },
    { code: 'other', label: 'Otro' },
  ];
  const allPayments = shiftData.paymentsDetail || [];

  // Total ventas brutas (Grand total)
  const grandTotal = Number(shiftData.grand_total || shiftData.grandTotal || (
    activeMethods.reduce((acc, m) => acc + Number(shiftData[m.code + '_total'] || 0), 0)
  ));

  // Generar bloque de cheques desglosados
  let detailedChecksHtml = '';
  let methodIndex = 1;

  for (const m of activeMethods) {
    const paymentsForMethod = allPayments.filter(p => p.method === m.code);
    const totalForMethod = Number(shiftData[m.code + '_total'] || 0);

    if (paymentsForMethod.length > 0 || totalForMethod > 0) {
      detailedChecksHtml += `
        <div style="margin-top:6px;">
          <div style="font-weight:900;font-size:11px;background:#000;color:#fff;padding:2px 5px;display:flex;justify-content:space-between;text-transform:uppercase;">
            <span>${methodIndex}. ${m.label.toUpperCase()} (${paymentsForMethod.length} ${paymentsForMethod.length === 1 ? 'CHK' : 'CHKS'})</span>
            <span>Q${totalForMethod.toFixed(2)}</span>
          </div>
          <div style="padding:2px 4px 4px 4px;">
            ${paymentsForMethod.length > 0 ? paymentsForMethod.map(p => {
              const timeStr = p.payment_time ? formatTimeOnly(p.payment_time) : (p.closed_at ? formatTimeOnly(p.closed_at) : '');
              const checkNum = p.check_number || `CHK-${String(p.account_id).padStart(4, '0')}`;
              let extraMeta = '';
              if (p.method === 'card' && p.reference_no) {
                extraMeta = ` • Ref: ${p.reference_no}`;
              } else if (p.method === 'room_charge' && (p.room_number || p.reference_no)) {
                extraMeta = ` • Hab: ${p.room_number || p.reference_no}`;
              } else if (p.reference_no) {
                extraMeta = ` • ${p.reference_no}`;
              }
              return `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:10.5px;padding:2px 0;border-bottom:0.5px dotted #aaa;">
                  <span style="font-weight:600;">
                    ${checkNum}${timeStr ? ` • ${timeStr}` : ''}${extraMeta}
                  </span>
                  <span style="font-weight:800;white-space:nowrap;margin-left:6px;">Q${Number(p.amount).toFixed(2)}</span>
                </div>
              `;
            }).join('') : `
              <div style="display:flex;justify-content:space-between;font-size:10.5px;padding:2px 0;">
                <span>Total transacciones ${m.label}</span>
                <span style="font-weight:800;">Q${totalForMethod.toFixed(2)}</span>
              </div>
            `}
            <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:900;padding:2px 0 1px 0;border-top:1px solid #000;margin-top:2px;">
              <span>SUBTOTAL ${m.label.toUpperCase()}:</span>
              <span>Q${totalForMethod.toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
      methodIndex++;
    }
  }

  // Generar bloque de resumen con porcentajes
  let consolidatedTotalsHtml = '';
  for (const m of activeMethods) {
    const tot = Number(shiftData[m.code + '_total'] || 0);
    if (tot > 0) {
      const pct = grandTotal > 0 ? ((tot / grandTotal) * 100).toFixed(1) : '0.0';
      consolidatedTotalsHtml += `
        <div style="display:flex;justify-content:space-between;padding:1.5px 0;font-size:10.5px;">
          <span style="font-weight:600;">${m.label} (${pct}%):</span>
          <span style="font-weight:800;">Q${tot.toFixed(2)}</span>
        </div>
      `;
    }
  }

  const accountsCount = shiftData.totalAccounts || (shiftData.paidAccounts ? shiftData.paidAccounts.length : (allPayments.length ? new Set(allPayments.map(p => p.account_id)).size : 0));
  const avgTicket = accountsCount > 0 ? (grandTotal / accountsCount) : 0;
  const discounts = Number(shiftData.discountsTotal || 0);
  const tips = Number(shiftData.tipsTotal || 0);

  const footerText = businessProfile?.shift_receipt_footer || '💡 Arqueo parcial completado: Todos los cheques han sido consolidados según las formas de pago configuradas en el turno actual.';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>${docTitle} - Turno #${shiftId}</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
          width: 78mm;
          margin: 0 auto;
          padding: 6px 3px;
          color: #000;
          background: #fff;
          font-size: 11px;
          line-height: 1.35;
        }
        .center { text-align: center; }
        .bold { font-weight: 800; }
        .logo-box { text-align: center; margin-bottom: 6px; }
        .logo-box img { max-width: 140px; max-height: 60px; object-fit: contain; filter: grayscale(100%) contrast(200%); }
        .subtitle { font-size: 10px; font-weight: 700; color: #444; letter-spacing: 0.5px; text-transform: uppercase; }
        .main-title { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; margin: 1px 0; }
        .branch-info { font-size: 10px; color: #222; margin-top: 1px; }
        .tax-info { font-size: 10px; font-weight: 600; color: #222; margin-top: 1px; }
        
        .doc-banner {
          background: #000;
          color: #fff;
          text-align: center;
          padding: 4px 2px;
          margin: 7px 0 2px 0;
        }
        .doc-banner .title {
          font-size: 12.5px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .doc-subnotice {
          text-align: center;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.3px;
          padding: 2px 0;
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
        }

        .meta-box {
          border: 1px solid #000;
          border-radius: 3px;
          padding: 4px 6px;
          margin: 5px 0;
          font-size: 10.5px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
        }

        .section-box {
          border: 1.5px solid #000;
          border-radius: 4px;
          padding: 5px 6px;
          margin: 6px 0;
        }
        .section-title {
          font-weight: 900;
          font-size: 10.5px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          text-align: center;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          margin-bottom: 4px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          padding: 1.5px 0;
          font-size: 10.5px;
        }
        .row.highlight {
          font-size: 12px;
          font-weight: 900;
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 3px 0;
          margin: 3px 0;
        }

        .dashed-sep {
          border-top: 1.5px dashed #000;
          margin: 7px 0;
        }

        .grand-banner {
          background: #000;
          color: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 6px;
          margin: 6px 0;
        }
        .grand-banner .label-col {
          display: flex;
          flex-direction: column;
        }
        .grand-banner .small-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #ccc;
          text-transform: uppercase;
        }
        .grand-banner .big-label {
          font-size: 12.5px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }
        .grand-banner .amount {
          font-size: 16px;
          font-weight: 900;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 8px;
          font-size: 10px;
          margin: 6px 0;
        }
        .stats-item {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
        }
        .stats-item .lbl {
          color: #444;
          font-weight: 600;
          text-transform: uppercase;
        }
        .stats-item .val {
          font-weight: 800;
        }

        .footer-note {
          font-size: 9.5px;
          line-height: 1.35;
          margin-top: 8px;
          text-align: center;
          color: #222;
          padding: 4px 2px;
          border-top: 1.5px dashed #000;
        }

        @media print {
          body {
            width: 100%;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      </style>
    </head>
    <body>
      <!-- 1. ENCABEZADO -->
      <div class="center">
        ${receiptLogo ? `
          <div class="logo-box">
            <img src="${receiptLogo}" alt="Logo" />
          </div>
        ` : ''}
        <div class="subtitle">${subtitle}</div>
        <div class="main-title">${restaurantName}</div>
        <div class="branch-info">${centerName} • ${address}</div>
        <div class="tax-info">NIT: ${nit} • Tel: ${phone}</div>
      </div>

      <!-- 2. FRANJA CORTE -->
      <div class="doc-banner">
        <div class="title">${docTitle}</div>
      </div>
      <div class="doc-subnotice">${docNotice}</div>

      <!-- 3. METADATOS DEL TURNO -->
      <div class="meta-box">
        <div class="meta-row"><span>TURNO ID:</span><span class="bold">#TRN-${String(shiftId).padStart(4, '0')}</span></div>
        <div class="meta-row"><span>CAJERO / OPERADOR:</span><span class="bold">${cashierName}</span></div>
        <div class="meta-row"><span>TERMINAL / CAJA:</span><span>#${terminalInfo.code || 'POS-01'} (${terminalInfo.name || 'Lado A'})</span></div>
        <div class="meta-row"><span>APERTURA TURNO:</span><span>${openedStr}</span></div>
        <div class="meta-row"><span>${isZ ? 'CIERRE TURNO:' : 'HORA IMPRESIÓN:'}</span><span class="bold">${printTimeStr}</span></div>
      </div>

      <!-- 4. ARQUEO DE EFECTIVO EN CAJA -->
      <div class="section-box">
        <div class="section-title">ARQUEO DE EFECTIVO EN CAJA</div>
        <div class="row"><span>Fondo Inicial (Base):</span><span class="bold">Q${openingCash.toFixed(2)}</span></div>
        <div class="row"><span>(+) Ventas Efectivo:</span><span class="bold" style="color:#000;">+Q${cashSales.toFixed(2)}</span></div>
        <div class="row"><span>(-) Retiros Caja Chica:</span><span class="bold" style="color:#000;">-Q${expenses.toFixed(2)}</span></div>
        <div class="row highlight">
          <span>EFECTIVO ESPERADO:</span>
          <span>Q${expectedCash.toFixed(2)}</span>
        </div>
        <div class="row" style="font-size:11.5px;padding-top:2px;">
          <span>Efectivo Contado (Físico):</span>
          <span class="bold" style="font-size:12px;">Q${closingCash.toFixed(2)}</span>
        </div>
        <div class="row" style="font-weight:bold;font-size:11.5px;padding-top:2px;">
          <span>Diferencia:</span>
          <span style="font-weight:900;">
            ${diff > 0 ? '+' : ''}Q${diff.toFixed(2)} ${diffLabel}
          </span>
        </div>
      </div>

      <div class="dashed-sep"></div>

      <!-- 5. DETALLE DE CHEQUES POR FORMA DE PAGO -->
      <div>
        <div class="bold center" style="font-size:11.5px;letter-spacing:0.5px;text-transform:uppercase;">
          DETALLE DE CHEQUES POR FORMA DE PAGO
        </div>
        <div class="center" style="font-size:9.5px;color:#555;margin-bottom:4px;">
          Desglose de transacciones auditadas
        </div>
        ${detailedChecksHtml || '<div style="text-align:center;padding:6px 0;font-style:italic;">Sin transacciones registradas</div>'}
      </div>

      <!-- 6. RESUMEN TOTALES POR FORMA DE PAGO -->
      <div class="section-box" style="margin-top:8px;">
        <div class="section-title">RESUMEN TOTALES POR FORMA DE PAGO</div>
        ${consolidatedTotalsHtml || '<div style="text-align:center;padding:4px 0;">Q0.00</div>'}
      </div>

      <!-- 7. TOTAL FACTURADO / VENTAS BRUTAS -->
      <div class="grand-banner">
        <div class="label-col">
          <span class="small-label">TOTAL FACTURADO</span>
          <span class="big-label">VENTAS BRUTAS:</span>
        </div>
        <div class="amount">Q${grandTotal.toFixed(2)}</div>
      </div>

      <!-- 8. MÉTRICAS OPERATIVAS -->
      <div class="stats-grid">
        <div class="stats-item">
          <span class="lbl">Cuentas:</span>
          <span class="val">${accountsCount}</span>
        </div>
        <div class="stats-item">
          <span class="lbl">Ticket Prom.:</span>
          <span class="val">Q${avgTicket.toFixed(2)}</span>
        </div>
        <div class="stats-item">
          <span class="lbl">Descuentos:</span>
          <span class="val">Q${discounts.toFixed(2)}</span>
        </div>
        <div class="stats-item">
          <span class="lbl">Propinas:</span>
          <span class="val">Q${tips.toFixed(2)}</span>
        </div>
      </div>

      <!-- 9. NOTA INFORMATIVA FINAL (SIN FIRMAS) -->
      <div class="footer-note">
        ${footerText}
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 300);
        };
      <\/script>
    </body>
    </html>
  `;
}

/**
 * Función utilitaria para disparar la impresión directa física sin pasar por el modal
 */
export function printShiftTicket(params) {
  const win = window.open('', '_blank', 'width=420,height=650');
  if (!win) {
    throw new Error('Permite ventanas emergentes para imprimir');
  }
  const html = generateShiftTicketHtml(params);
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/**
 * Componente Modal interactivo con previsualización fidedigna
 */
export function ShiftTicketModal({
  isOpen,
  onClose,
  type = 'X',
  shiftData = {},
  businessProfile = {},
  centerName = 'Sucursal Principal',
  cashierName = 'Cajero',
  terminalInfo = { code: 'POS-01', name: 'Lado A' },
}) {
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);

  const handlePrint = useCallback(() => {
    try {
      printShiftTicket({
        type,
        shiftData,
        businessProfile,
        centerName,
        cashierName,
        terminalInfo,
      });
    } catch (e) {
      toast.error(e.message || 'Error al lanzar impresión');
    }
  }, [type, shiftData, businessProfile, centerName, cashierName, terminalInfo, toast]);

  const handleShare = useCallback(() => {
    const isZ = type === 'Z';
    const shiftId = shiftData.shiftId || shiftData.id || '0001';
    const openingCash = Number(shiftData.openingCash || 0);
    const cashSales = Number(shiftData.cash_total || shiftData.cashTotal || 0);
    const expectedCash = Number(shiftData.expectedCash || (openingCash + cashSales));
    const grandTotal = Number(shiftData.grand_total || shiftData.grandTotal || 0);

    const text = `📊 *${isZ ? 'CORTE Z - CIERRE DEFINITIVO' : 'CORTE X - ARQUEO PARCIAL'}*\n` +
      `Turno #${shiftId} • ${centerName}\n` +
      `Cajero: ${cashierName}\n` +
      `----------------------------\n` +
      `Fondo Inicial: ${formatMoney(openingCash)}\n` +
      `Ventas Efectivo: ${formatMoney(cashSales)}\n` +
      `Efectivo Esperado: ${formatMoney(expectedCash)}\n` +
      `VENTAS BRUTAS: ${formatMoney(grandTotal)}\n` +
      `----------------------------\n` +
      `SamaPos POS`;

    if (navigator.share) {
      navigator.share({
        title: `${isZ ? 'Corte Z' : 'Corte X'} - Turno #${shiftId}`,
        text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Resumen copiado al portapapeles');
      setTimeout(() => setCopied(false), 2500);
    }
  }, [type, shiftData, centerName, cashierName, toast]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrint]);

  if (!isOpen) return null;

  const isZ = type === 'Z';
  const docTitle = isZ ? 'CORTE Z - CIERRE DEFINITIVO' : 'CORTE X - ARQUEO PARCIAL';
  const docNotice = isZ ? 'CIERRE FISCAL Y DE AUDITORÍA DEFINITIVO' : 'DOCUMENTO DE CONTROL INTERNO - NO CIERRA TURNO';

  const subtitle = businessProfile?.business_subtitle || 'POS RESTAURANTE & BAR';
  const restaurantName = businessProfile?.restaurant_name || 'SAMAPOS ARQUEO';
  const nit = businessProfile?.tax_id || businessProfile?.nit || '8492048-2';
  const phone = businessProfile?.phone || '(502) 2345-6789';
  const address = businessProfile?.address || 'Ciudad de Guatemala';
  const receiptLogo = businessProfile?.receipt_logo_url || null;

  const shiftId = shiftData.shiftId || shiftData.id || '0001';
  const openedStr = shiftData.openedAt ? new Date(shiftData.openedAt).toLocaleString('es-GT') : '---';
  const now = new Date();
  const timeOnly = now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const printTimeStr = isZ
    ? (shiftData.closedAt ? new Date(shiftData.closedAt).toLocaleString('es-GT') : now.toLocaleString('es-GT'))
    : `EN CURSO (${timeOnly})`;

  const openingCash = Number(shiftData.openingCash || 0);
  const cashSales = Number(shiftData.cash_total || shiftData.cashTotal || 0);
  const expenses = Number(shiftData.expensesTotal || 0);
  const expectedCash = Number(shiftData.expectedCash || (openingCash + cashSales - expenses));
  const closingCash = shiftData.closingCash !== null && shiftData.closingCash !== undefined
    ? Number(shiftData.closingCash)
    : expectedCash;
  const diff = closingCash - expectedCash;
  const diffLabel = Math.abs(diff) < 0.01 ? '(Cuadrado)' : diff > 0 ? '(Sobrante)' : '(Faltante)';

  const activeMethods = shiftData.methods || [
    { code: 'cash', label: 'Efectivo' },
    { code: 'card', label: 'Tarjeta' },
    { code: 'room_charge', label: 'Cargo Habitación' },
    { code: 'cxc', label: 'Crédito / CxC' },
    { code: 'courtesy', label: 'Exento / Consumos' },
    { code: 'transfer', label: 'Transferencia' },
    { code: 'other', label: 'Otro' },
  ];
  const allPayments = shiftData.paymentsDetail || [];

  const grandTotal = Number(shiftData.grand_total || shiftData.grandTotal || (
    activeMethods.reduce((acc, m) => acc + Number(shiftData[m.code + '_total'] || 0), 0)
  ));

  const accountsCount = shiftData.totalAccounts || (shiftData.paidAccounts ? shiftData.paidAccounts.length : (allPayments.length ? new Set(allPayments.map(p => p.account_id)).size : 0));
  const avgTicket = accountsCount > 0 ? (grandTotal / accountsCount) : 0;
  const discounts = Number(shiftData.discountsTotal || 0);
  const tips = Number(shiftData.tipsTotal || 0);

  const footerText = businessProfile?.shift_receipt_footer || '💡 Arqueo parcial completado: Todos los cheques han sido consolidados según las formas de pago configuradas en el turno actual.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] max-h-[92vh] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden">
        
        {/* TOP BAR / HEADER DEL MODAL */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="text-left">
              <div className="text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5">
                Terminal en Línea
              </div>
              <div className="text-[10px] text-slate-400">
                #{terminalInfo.code || 'POS-01'} • {centerName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Imprimir ticket en impresora térmica (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
              title="Compartir o copiar resumen"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 rounded-xl transition-all cursor-pointer ml-1"
              title="Cerrar vista previa (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTENEDOR DEL PAPEL TÉRMICO SCROLLEABLE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-950/60 flex justify-center">
          <div className="w-[330px] bg-white text-black p-4 rounded-sm shadow-xl font-mono text-[11px] leading-[1.35] select-text">
            
            {/* CABECERA COMERCIAL */}
            <div className="text-center pb-2">
              {receiptLogo && (
                <div className="mb-2 flex justify-center">
                  <img
                    src={receiptLogo}
                    alt="Logo"
                    className="max-h-14 max-w-[150px] object-contain grayscale contrast-200"
                  />
                </div>
              )}
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{subtitle}</div>
              <div className="text-[17px] font-black uppercase tracking-tight text-black my-0.5">{restaurantName}</div>
              <div className="text-[10px] text-slate-700">{centerName} • {address}</div>
              <div className="text-[10px] font-semibold text-slate-800">NIT: {nit} • Tel: {phone}</div>
            </div>

            {/* BANNER NEGRO CORTE */}
            <div className="bg-black text-white text-center py-1.5 px-1 mt-1">
              <div className="text-[12px] font-black tracking-wide uppercase">{docTitle}</div>
            </div>
            <div className="text-center text-[9px] font-extrabold tracking-tight py-0.5 border-b border-black mb-2 uppercase">
              {docNotice}
            </div>

            {/* METADATOS */}
            <div className="border border-black rounded-xs p-2 mb-2 space-y-0.5 text-[10.5px]">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">TURNO ID:</span>
                <span className="font-black text-black">#TRN-{String(shiftId).padStart(4, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">CAJERO / OPERADOR:</span>
                <span className="font-bold text-black">{cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">TERMINAL / CAJA:</span>
                <span className="font-bold text-black">#{terminalInfo.code || 'POS-01'} ({terminalInfo.name || 'Lado A'})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">APERTURA TURNO:</span>
                <span className="text-black">{openedStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">{isZ ? 'CIERRE TURNO:' : 'HORA IMPRESIÓN:'}</span>
                <span className="font-black text-black">{printTimeStr}</span>
              </div>
            </div>

            {/* ARQUEO DE EFECTIVO */}
            <div className="border-[1.5px] border-black rounded-xs p-2 my-2 space-y-1">
              <div className="font-black text-center text-[10.5px] uppercase tracking-wider border-b border-black pb-1 mb-1.5">
                ARQUEO DE EFECTIVO EN CAJA
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Fondo Inicial (Base):</span>
                <span className="font-bold">{formatMoney(openingCash)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>(+) Ventas Efectivo:</span>
                <span className="font-bold text-emerald-800">+{formatMoney(cashSales)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>(-) Retiros Caja Chica:</span>
                <span className="font-bold text-rose-800">-{formatMoney(expenses)}</span>
              </div>
              
              <div className="border-t-[1.5px] border-b-[1.5px] border-black py-1 my-1 flex justify-between font-black text-[12px]">
                <span>EFECTIVO ESPERADO:</span>
                <span>{formatMoney(expectedCash)}</span>
              </div>

              <div className="flex justify-between text-[11.5px] pt-0.5">
                <span>Efectivo Contado (Físico):</span>
                <span className="font-black text-[12px]">{formatMoney(closingCash)}</span>
              </div>

              <div className="flex justify-between text-[11px] font-bold pt-0.5">
                <span>Diferencia (Sobrante/Faltante):</span>
                <span className={`font-black ${diff === 0 ? 'text-emerald-700' : diff > 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                  {diff > 0 ? '+' : ''}{formatMoney(diff)} {diffLabel}
                </span>
              </div>
            </div>

            <div className="border-t-[1.5px] border-dashed border-black my-2.5"></div>

            {/* DETALLE DE CHEQUES POR FORMA DE PAGO */}
            <div>
              <div className="font-black text-center text-[11.5px] uppercase tracking-wider">
                DETALLE DE CHEQUES POR FORMA DE PAGO
              </div>
              <div className="text-center text-[9.5px] text-slate-600 mb-2">
                Desglose de transacciones auditadas
              </div>

              {activeMethods.map((m, idx) => {
                const paymentsForMethod = allPayments.filter(p => p.method === m.code);
                const totalForMethod = Number(shiftData[m.code + '_total'] || 0);
                if (paymentsForMethod.length === 0 && totalForMethod === 0) return null;

                return (
                  <div key={m.code} className="mt-2 text-[10.5px]">
                    <div className="bg-black text-white px-1.5 py-0.5 flex justify-between font-black uppercase text-[11px]">
                      <span>{idx + 1}. {m.label} ({paymentsForMethod.length} {paymentsForMethod.length === 1 ? 'CHK' : 'CHKS'})</span>
                      <span>{formatMoney(totalForMethod)}</span>
                    </div>

                    <div className="px-1 py-1 space-y-1">
                      {paymentsForMethod.length > 0 ? paymentsForMethod.map((p, pIdx) => {
                        const timeStr = p.payment_time ? formatTimeOnly(p.payment_time) : (p.closed_at ? formatTimeOnly(p.closed_at) : '');
                        const checkNum = p.check_number || `CHK-${String(p.account_id).padStart(4, '0')}`;
                        let extra = '';
                        if (p.method === 'card' && p.reference_no) extra = ` • ${p.reference_no}`;
                        else if (p.method === 'room_charge' && p.room_number) extra = ` • Hab: ${p.room_number}`;
                        else if (p.reference_no) extra = ` • ${p.reference_no}`;

                        return (
                          <div key={p.id || pIdx} className="flex justify-between items-start border-b border-dotted border-slate-300 pb-0.5">
                            <span className="font-semibold text-slate-800">
                              {checkNum}{timeStr ? ` • ${timeStr}` : ''}{extra}
                            </span>
                            <span className="font-extrabold text-black ml-2 whitespace-nowrap">
                              {formatMoney(p.amount)}
                            </span>
                          </div>
                        );
                      }) : (
                        <div className="flex justify-between text-slate-700 py-0.5">
                          <span>Ventas {m.label}</span>
                          <span className="font-bold">{formatMoney(totalForMethod)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-black border-t border-black pt-1 mt-1 text-[11px]">
                        <span>SUBTOTAL {m.label.toUpperCase()}:</span>
                        <span>{formatMoney(totalForMethod)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RESUMEN TOTALES POR FORMA DE PAGO */}
            <div className="border-[1.5px] border-black rounded-xs p-2 mt-3 space-y-1">
              <div className="font-black text-center text-[10.5px] uppercase tracking-wider border-b border-black pb-1 mb-1.5">
                RESUMEN TOTALES POR FORMA DE PAGO
              </div>
              {activeMethods.map((m) => {
                const tot = Number(shiftData[m.code + '_total'] || 0);
                if (tot === 0) return null;
                const pct = grandTotal > 0 ? ((tot / grandTotal) * 100).toFixed(1) : '0.0';
                return (
                  <div key={m.code} className="flex justify-between text-[10.5px]">
                    <span className="font-semibold">{m.label} ({pct}%):</span>
                    <span className="font-black">{formatMoney(tot)}</span>
                  </div>
                );
              })}
            </div>

            {/* BANNER NEGRO VENTAS BRUTAS */}
            <div className="bg-black text-white p-2 mt-2 flex justify-between items-center">
              <div>
                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">TOTAL FACTURADO</div>
                <div className="text-[13px] font-black tracking-wide">VENTAS BRUTAS:</div>
              </div>
              <div className="text-[17px] font-black">
                {formatMoney(grandTotal)}
              </div>
            </div>

            {/* MÉTRICAS OPERATIVAS */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] py-2 border-b border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">CUENTAS:</span>
                <span className="font-black">{accountsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">TICKET PROM:</span>
                <span className="font-black">{formatMoney(avgTicket)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">DESCUENTOS:</span>
                <span className="font-black">{formatMoney(discounts)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">PROPINAS:</span>
                <span className="font-black">{formatMoney(tips)}</span>
              </div>
            </div>

            {/* NOTA INFORMATIVA FINAL */}
            <div className="mt-3 text-[9.5px] leading-tight text-center text-slate-800 border-t border-dashed border-black pt-2">
              {footerText}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

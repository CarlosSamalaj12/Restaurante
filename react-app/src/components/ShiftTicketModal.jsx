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
      const pct = grandTotal > 0 ? ((totalForMethod / grandTotal) * 100).toFixed(1) : '0.0';
      detailedChecksHtml += `
        <div style="margin-top:3px;page-break-inside:avoid;break-inside:avoid;">
          <div class="method-banner">
            <span>${methodIndex}. ${m.label.toUpperCase()} (${paymentsForMethod.length} CHK • ${pct}%)</span>
            <span>Q${totalForMethod.toFixed(2)}</span>
          </div>
          <div class="ascii-sep">------------------------------------------</div>
          <div style="padding:1px 0;">
            ${paymentsForMethod.length > 0 ? paymentsForMethod.map((p, pIdx) => {
              const timeStr = p.payment_time ? formatTimeOnly(p.payment_time) : (p.closed_at ? formatTimeOnly(p.closed_at) : '');
              const checkNum = p.check_number || `CHK-${String(p.account_id).padStart(4, '0')}`;
              let extraMeta = '';
              if (p.method === 'card' && p.reference_no) {
                extraMeta = ` • Ref:${p.reference_no}`;
              } else if (p.method === 'room_charge' && (p.room_number || p.reference_no)) {
                extraMeta = ` • Hab:${p.room_number || p.reference_no}`;
              } else if (p.reference_no) {
                extraMeta = ` • ${p.reference_no}`;
              }
              const isLast = pIdx === paymentsForMethod.length - 1;
              return `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:11px;padding:1px 0;color:#000;">
                  <span style="font-weight:700;">
                    ${checkNum}${timeStr ? ` ${timeStr}` : ''}${extraMeta}
                  </span>
                  <span style="font-weight:900;white-space:nowrap;margin-left:4px;">Q${Number(p.amount).toFixed(2)}</span>
                </div>
                ${!isLast ? '<div class="ascii-sep" style="font-size:10px;margin:1px 0;">------------------------------------------</div>' : ''}
              `;
            }).join('') : `
              <div style="display:flex;justify-content:space-between;font-size:11px;padding:1px 0;color:#000;">
                <span>Total transacciones ${m.label}</span>
                <span style="font-weight:900;">Q${totalForMethod.toFixed(2)}</span>
              </div>
            `}
          </div>
        </div>
      `;
      methodIndex++;
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
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color: #000 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        @page {
          size: 80mm auto;
          margin: 0;
        }
        html, body {
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          overflow: visible !important;
        }
        body {
          font-family: 'Consolas', 'Lucida Console', Monaco, monospace !important;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.25;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: geometricPrecision !important;
        }
        .ticket-wrapper {
          width: 72mm;
          margin: 0 auto;
          padding: 2mm 2mm;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: avoid !important;
          break-before: avoid !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .logo-box { text-align: center; margin-bottom: 2px; }
        .logo-box img { max-width: 120px; max-height: 45px; object-fit: contain; filter: grayscale(100%) contrast(300%); }
        .subtitle { font-size: 11px; font-weight: 700; color: #000 !important; text-transform: uppercase; }
        .main-title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 1px 0; color: #000 !important; line-height: 1.15; }
        .branch-info { font-size: 11px; color: #000 !important; font-weight: 700; }
        .tax-info { font-size: 11px; font-weight: 700; color: #000 !important; }
        
        .ascii-sep {
          overflow: hidden;
          white-space: nowrap;
          font-family: 'Consolas', 'Lucida Console', Monaco, monospace !important;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.1;
          text-align: center;
          margin: 2px 0;
          color: #000 !important;
          letter-spacing: -0.5px;
        }

        .doc-banner {
          background-color: #fff !important;
          color: #000 !important;
          text-align: center;
          padding: 3px 2px;
          margin: 2px 0 1px 0;
          border: 2px solid #000 !important;
        }
        .doc-banner .title {
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
          color: #000 !important;
        }
        .doc-subnotice {
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 0;
          margin-bottom: 2px;
          color: #000 !important;
        }

        .meta-box {
          border: 1.5px solid #000;
          padding: 3px 4px;
          margin: 2px 0;
          font-size: 11px;
          font-weight: 700;
          color: #000 !important;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
          color: #000 !important;
        }

        .section-box {
          border: 1.5px solid #000;
          padding: 3px 4px;
          margin: 2px 0;
          color: #000 !important;
        }
        .section-title {
          font-weight: 900;
          font-size: 13px;
          text-transform: uppercase;
          text-align: center;
          border-bottom: 1.5px solid #000;
          padding-bottom: 2px;
          margin-bottom: 2px;
          color: #000 !important;
        }

        .row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
          font-size: 11px;
          font-weight: 700;
          color: #000 !important;
        }
        .row.highlight {
          font-size: 13px;
          font-weight: 900;
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 2px 0;
          margin: 2px 0;
          color: #000 !important;
        }

        .method-banner {
          font-weight: 900;
          font-size: 12px;
          background-color: #fff !important;
          color: #000 !important;
          padding: 2px 2px;
          display: flex;
          justify-content: space-between;
          text-transform: uppercase;
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
        }

        .totals-group {
          margin-top: 3px;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: avoid !important;
          break-before: avoid !important;
        }

        .grand-banner {
          background-color: #fff !important;
          color: #000 !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 4px;
          border: 2px solid #000 !important;
        }
        .grand-banner .label-col {
          display: flex;
          flex-direction: column;
        }
        .grand-banner .small-label {
          font-size: 9px;
          font-weight: 900;
          color: #000 !important;
          text-transform: uppercase;
        }
        .grand-banner .big-label {
          font-size: 14px;
          font-weight: 900;
          color: #000 !important;
        }
        .grand-banner .amount {
          font-size: 16px;
          font-weight: 900;
          color: #000 !important;
        }

        .stats-box {
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 3px 2px;
          margin-top: 2px;
          font-size: 12px;
          color: #000 !important;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
          font-weight: 900;
          color: #000 !important;
        }

        .footer-note {
          font-size: 10px;
          line-height: 1.3;
          margin-top: 3px;
          text-align: center;
          color: #000 !important;
          font-weight: 700;
          padding: 2px 1px 0 1px;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000 !important;
            border-color: #000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            font-family: 'Consolas', 'Lucida Console', Monaco, monospace !important;
            -webkit-font-smoothing: antialiased !important;
            text-rendering: geometricPrecision !important;
          }
          .ticket-wrapper {
            width: 72mm !important;
            margin: 0 auto !important;
            padding: 1mm 2mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .totals-group {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
          .doc-banner {
            background-color: #fff !important;
            color: #000 !important;
            border: 2px solid #000 !important;
          }
          .grand-banner {
            background-color: #fff !important;
            color: #000 !important;
            border: 2px solid #000 !important;
          }
          .method-banner {
            background-color: #fff !important;
            color: #000 !important;
            border-top: 1.5px solid #000 !important;
            border-bottom: 1.5px solid #000 !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="ticket-wrapper">
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

        <div class="ascii-sep">==========================================</div>

        <!-- 2. FRANJA CORTE -->
        <div class="doc-banner">
          <div class="title">${docTitle}</div>
        </div>
        <div class="doc-subnotice">${docNotice}</div>

        <!-- 3. METADATOS DEL TURNO -->
        <div class="meta-box">
          <div class="meta-row"><span>TURNO: #TRN-${String(shiftId).padStart(4, '0')}</span><span class="bold">CAJERO: ${cashierName}</span></div>
          <div class="meta-row"><span>TERMINAL: #${terminalInfo.code || 'POS-01'}</span><span>APERTURA: ${openedStr}</span></div>
          <div class="meta-row"><span>${isZ ? 'CIERRE TURNO:' : 'HORA IMPRESIÓN:'}</span><span class="bold">${printTimeStr}</span></div>
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 4. ARQUEO DE EFECTIVO EN CAJA -->
        <div class="section-box">
          <div class="section-title">ARQUEO DE EFECTIVO EN CAJA</div>
          <div class="row"><span>Fondo Inicial (Base):</span><span class="bold">Q${openingCash.toFixed(2)}</span></div>
          <div class="row"><span>(+) Ventas Efectivo:</span><span class="bold">+Q${cashSales.toFixed(2)}</span></div>
          <div class="row"><span>(-) Retiros Caja Chica:</span><span class="bold">-Q${expenses.toFixed(2)}</span></div>
          <div class="row highlight">
            <span>EFECTIVO ESPERADO:</span>
            <span>Q${expectedCash.toFixed(2)}</span>
          </div>
          <div class="row" style="padding-top:1px;">
            <span>Efectivo Contado (Físico):</span>
            <span class="bold">Q${closingCash.toFixed(2)}</span>
          </div>
          <div class="row" style="padding-top:1px;">
            <span>Diferencia:</span>
            <span class="bold">${diff > 0 ? '+' : ''}Q${diff.toFixed(2)} ${diffLabel}</span>
          </div>
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 5. DETALLE DE CHEQUES POR FORMA DE PAGO -->
        <div style="margin-top:2px;">
          <div class="bold center" style="font-size:13px;text-transform:uppercase;color:#000;">
            DETALLE DE CHEQUES POR FORMA DE PAGO
          </div>
          ${detailedChecksHtml || '<div style="text-align:center;padding:4px 0;font-weight:bold;color:#000;">Sin transacciones registradas</div>'}
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 6. TOTALES Y MÉTRICAS OPERATIVAS (UNIFICADOS) -->
        <div class="totals-group">
          <div class="grand-banner">
            <div class="label-col">
              <span class="small-label">TOTAL FACTURADO</span>
              <span class="big-label">VENTAS BRUTAS:</span>
            </div>
            <div class="amount">Q${grandTotal.toFixed(2)}</div>
          </div>

          <div class="stats-box">
            <div class="stat-row">
              <span>TOTAL CUENTAS:</span>
              <span class="bold">${accountsCount}</span>
            </div>
            <div class="stat-row">
              <span>TICKET PROMEDIO:</span>
              <span class="bold">Q${avgTicket.toFixed(2)}</span>
            </div>
            ${discounts > 0 ? `
            <div class="stat-row">
              <span>DESCUENTOS APLICADOS:</span>
              <span class="bold">-Q${discounts.toFixed(2)}</span>
            </div>
            ` : ''}
            ${tips > 0 ? `
            <div class="stat-row">
              <span>PROPINAS RECIBIDAS:</span>
              <span class="bold">+Q${tips.toFixed(2)}</span>
            </div>
            ` : ''}
          </div>

          <div class="ascii-sep">------------------------------------------</div>

          <div class="footer-note">
            ${footerText}
          </div>
        </div>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-950/60">
          <div
            className="w-[330px] mx-auto bg-white text-black p-4 pb-6 mb-6 rounded-sm shadow-xl select-text h-auto"
            style={{ fontFamily: "'Consolas', 'Lucida Console', Monaco, monospace", fontSize: '11px', lineHeight: 1.25, fontWeight: 700 }}
          >
            
            {/* CABECERA COMERCIAL */}
            <div className="text-center pb-1">
              {receiptLogo && (
                <div className="mb-2 flex justify-center">
                  <img
                    src={receiptLogo}
                    alt="Logo"
                    className="max-h-14 max-w-[150px] object-contain grayscale contrast-200"
                  />
                </div>
              )}
              <div className="text-[11px] font-bold text-black uppercase tracking-wider">{subtitle}</div>
              <div className="text-[18px] font-black uppercase tracking-tight text-black my-0.5">{restaurantName}</div>
              <div className="text-[11px] text-black font-bold">{centerName} • {address}</div>
              <div className="text-[11px] font-bold text-black">NIT: {nit} • Tel: {phone}</div>
            </div>

            <div className="text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap">
              ==========================================
            </div>

            {/* RECUADRO CORTE */}
            <div className="bg-white text-black text-center py-1 px-1 border-2 border-black">
              <div className="text-[14px] font-black tracking-wide uppercase">{docTitle}</div>
            </div>
            <div className="text-center text-[10px] font-bold tracking-tight py-0.5 mb-1 uppercase text-black">
              {docNotice}
            </div>

            {/* METADATOS */}
            <div className="border-[1.5px] border-black p-1.5 mb-1 space-y-0.5 text-[11px] font-bold">
              <div className="flex justify-between">
                <span className="text-black">TURNO: #TRN-{String(shiftId).padStart(4, '0')}</span>
                <span className="font-black text-black">CAJERO: {cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">TERMINAL: #{terminalInfo.code || 'POS-01'}</span>
                <span className="text-black">{openedStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">{isZ ? 'CIERRE TURNO:' : 'HORA IMPRESIÓN:'}</span>
                <span className="font-black text-black">{printTimeStr}</span>
              </div>
            </div>

            <div className="text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap">
              ==========================================
            </div>

            {/* ARQUEO DE EFECTIVO */}
            <div className="border-[1.5px] border-black p-1.5 my-1 space-y-0.5 text-[11px]">
              <div className="font-black text-center text-[13px] uppercase tracking-wider border-b-[1.5px] border-black pb-1 mb-1 text-black">
                ARQUEO DE EFECTIVO EN CAJA
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Fondo Inicial (Base):</span>
                <span className="font-bold">{formatMoney(openingCash)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>(+) Ventas Efectivo:</span>
                <span className="font-bold text-black">+{formatMoney(cashSales)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>(-) Retiros Caja Chica:</span>
                <span className="font-bold text-black">-{formatMoney(expenses)}</span>
              </div>
              
              <div className="border-t-[1.5px] border-b-[1.5px] border-black py-0.5 my-0.5 flex justify-between font-black text-[13px]">
                <span>EFECTIVO ESPERADO:</span>
                <span>{formatMoney(expectedCash)}</span>
              </div>

              <div className="flex justify-between text-[12px] pt-0.5">
                <span>Efectivo Contado (Físico):</span>
                <span className="font-black text-[12px]">{formatMoney(closingCash)}</span>
              </div>

              <div className="flex justify-between text-[12px] font-bold pt-0.5">
                <span>Diferencia (Sobrante/Faltante):</span>
                <span className="font-black text-black">
                  {diff > 0 ? '+' : ''}{formatMoney(diff)} {diffLabel}
                </span>
              </div>
            </div>

            <div className="text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap">
              ==========================================
            </div>

            {/* DETALLE DE CHEQUES POR FORMA DE PAGO */}
            <div>
              <div className="font-black text-center text-[13px] uppercase tracking-wider text-black">
                DETALLE DE CHEQUES POR FORMA DE PAGO
              </div>

              {activeMethods.map((m, idx) => {
                const paymentsForMethod = allPayments.filter(p => p.method === m.code);
                const totalForMethod = Number(shiftData[m.code + '_total'] || 0);
                if (paymentsForMethod.length === 0 && totalForMethod === 0) return null;
                const pct = grandTotal > 0 ? ((totalForMethod / grandTotal) * 100).toFixed(1) : '0.0';

                return (
                  <div key={m.code} className="mt-1.5 text-[11px]">
                    <div className="bg-white text-black px-1 py-0.5 flex justify-between font-black uppercase text-[12px] border-t-[1.5px] border-b-[1.5px] border-black">
                      <span>{idx + 1}. {m.label} ({paymentsForMethod.length} CHK • {pct}%)</span>
                      <span>{formatMoney(totalForMethod)}</span>
                    </div>

                    <div className="text-center font-black tracking-tighter text-[10px] text-black my-0.5 select-none overflow-hidden whitespace-nowrap">
                      ------------------------------------------
                    </div>

                    <div className="px-0.5 py-0.5 space-y-0.5">
                      {paymentsForMethod.length > 0 ? paymentsForMethod.map((p, pIdx) => {
                        const timeStr = p.payment_time ? formatTimeOnly(p.payment_time) : (p.closed_at ? formatTimeOnly(p.closed_at) : '');
                        const checkNum = p.check_number || `CHK-${String(p.account_id).padStart(4, '0')}`;
                        let extra = '';
                        if (p.method === 'card' && p.reference_no) extra = ` • ${p.reference_no}`;
                        else if (p.method === 'room_charge' && p.room_number) extra = ` • Hab: ${p.room_number}`;
                        else if (p.reference_no) extra = ` • ${p.reference_no}`;

                        const isLast = pIdx === paymentsForMethod.length - 1;

                        return (
                          <React.Fragment key={p.id || pIdx}>
                            <div className="flex justify-between items-start text-[11px]">
                              <span className="font-bold text-black">
                                {checkNum}{timeStr ? ` • ${timeStr}` : ''}{extra}
                              </span>
                              <span className="font-black text-black ml-2 whitespace-nowrap">
                                {formatMoney(p.amount)}
                              </span>
                            </div>
                            {!isLast && (
                              <div className="text-center font-bold tracking-tighter text-[10px] text-black my-0.5 select-none overflow-hidden whitespace-nowrap">
                                ------------------------------------------
                              </div>
                            )}
                          </React.Fragment>
                        );
                      }) : (
                        <div className="flex justify-between text-black py-0.5 text-[11px]">
                          <span>Ventas {m.label}</span>
                          <span className="font-bold">{formatMoney(totalForMethod)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap">
              ==========================================
            </div>

            {/* TOTALES Y MÉTRICAS OPERATIVAS (UNIFICADO) */}
            <div className="mt-1">
              {/* RECUADRO VENTAS BRUTAS */}
              <div className="bg-white text-black p-1.5 flex justify-between items-center border-2 border-black">
                <div>
                  <div className="text-[9px] font-black text-black uppercase tracking-widest">TOTAL FACTURADO</div>
                  <div className="text-[14px] font-black">VENTAS BRUTAS:</div>
                </div>
                <div className="text-[16px] font-black text-black">
                  {formatMoney(grandTotal)}
                </div>
              </div>

              {/* MÉTRICAS OPERATIVAS (CUENTAS Y TICKET PROMEDIO) */}
              <div className="border-t-[1.5px] border-b-[1.5px] border-black py-1.5 my-1.5 space-y-0.5 text-[12px] font-black text-black">
                <div className="flex justify-between">
                  <span>TOTAL CUENTAS:</span>
                  <span className="font-black">{accountsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>TICKET PROMEDIO:</span>
                  <span className="font-black">{formatMoney(avgTicket)}</span>
                </div>
                {discounts > 0 && (
                  <div className="flex justify-between">
                    <span>DESCUENTOS APLICADOS:</span>
                    <span className="font-black">-{formatMoney(discounts)}</span>
                  </div>
                )}
                {tips > 0 && (
                  <div className="flex justify-between">
                    <span>PROPINAS RECIBIDAS:</span>
                    <span className="font-black">+{formatMoney(tips)}</span>
                  </div>
                )}
              </div>

              <div className="text-center font-black tracking-tighter text-[10px] text-black my-1 select-none overflow-hidden whitespace-nowrap">
                ------------------------------------------
              </div>

              {/* NOTA INFORMATIVA FINAL */}
              <div className="mt-1 text-[10px] font-bold leading-tight text-center text-black pt-1">
                {footerText}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

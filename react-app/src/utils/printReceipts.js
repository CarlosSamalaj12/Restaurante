/**
 * Utilidades de impresión térmica para Cuentas, Precuentas y Comprobantes
 */

export function printPrecheckThermal({ account, items = [], totals = {}, businessProfile = {} }) {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    throw new Error('Permite ventanas emergentes para imprimir');
  }

  const subtitle = businessProfile?.business_subtitle || 'POS RESTAURANTE & BAR';
  const restaurantName = businessProfile?.restaurant_name || account.center_name || 'RESTAURANTE';
  const address = businessProfile?.address || account.center_name || 'Ciudad de Guatemala';
  const nit = businessProfile?.tax_id || businessProfile?.nit || '8492048-2';
  const phone = businessProfile?.phone || '(502) 2345-6789';
  const receiptLogo = businessProfile?.receipt_logo_url || null;
  const footerText = businessProfile?.receipt_footer || '¡Gracias por su preferencia!';

  const checkNumber = account.check_number || `CHK-${String(account.id || '').padStart(4, '0')}`;
  const tableName = account.table_code ? `Mesa ${account.table_code}` : (account.table_name || 'Mostrador / Barra');
  const waiterName = account.waiter_name || 'Personal POS';
  const nowStr = new Date().toLocaleString('es-GT');

  const subtotal = totals.subtotal !== undefined
    ? Number(totals.subtotal)
    : items.reduce((sum, i) => sum + Number(i.line_total || (i.qty * i.unit_price) || 0), 0);
  
  const discount = Number(totals.discountTotal || 0);
  const tip = Number(totals.tipAmount || (totals.tipPercent ? (subtotal * totals.tipPercent / 100) : 0));
  const total = totals.total !== undefined ? Number(totals.total) : (subtotal - discount + tip);

  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Precuenta - ${checkNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
          width: 78mm;
          margin: 0 auto;
          padding: 6px 3px;
          color: #000;
          font-size: 11px;
          line-height: 1.35;
        }
        .center { text-align: center; }
        .bold { font-weight: 800; }
        .logo-box { text-align: center; margin-bottom: 5px; }
        .logo-box img { max-width: 130px; max-height: 55px; object-fit: contain; filter: grayscale(100%) contrast(200%); }
        .subtitle { font-size: 9.5px; font-weight: 700; color: #444; letter-spacing: 0.5px; text-transform: uppercase; }
        .main-title { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; margin: 1px 0; }
        .branch-info { font-size: 10px; color: #222; }
        .tax-info { font-size: 10px; font-weight: 600; color: #222; margin-top: 1px; }

        .doc-banner {
          background: #000;
          color: #fff;
          text-align: center;
          padding: 3px 2px;
          margin: 6px 0 2px 0;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .doc-subnotice {
          text-align: center;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 0;
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
        }

        .meta-box {
          border: 1px solid #000;
          border-radius: 3px;
          padding: 3px 5px;
          margin: 5px 0;
          font-size: 10px;
        }
        .meta-row { display: flex; justify-content: space-between; padding: 1px 0; }

        .items-table { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 10.5px; }
        .items-table th { border-bottom: 1.5px solid #000; padding: 2px 0; font-size: 9.5px; text-transform: uppercase; }
        .items-table td { padding: 2.5px 0; border-bottom: 0.5px dotted #aaa; }

        .tot-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 10.5px; }
        .grand-total {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 900;
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 3px 0;
          margin: 4px 0;
        }

        .footer-note {
          font-size: 9.5px;
          text-align: center;
          padding-top: 6px;
          margin-top: 8px;
          border-top: 1.5px dashed #000;
          line-height: 1.35;
        }

        @media print {
          body { width: 100%; margin: 0; padding: 0; }
          @page { margin: 0; size: auto; }
        }
      </style>
    </head>
    <body>
      <div class="center">
        ${receiptLogo ? `
          <div class="logo-box">
            <img src="${receiptLogo}" alt="Logo" />
          </div>
        ` : ''}
        <div class="subtitle">${subtitle}</div>
        <div class="main-title">${restaurantName}</div>
        <div class="branch-info">${address}</div>
        <div class="tax-info">NIT: ${nit} • Tel: ${phone}</div>
      </div>

      <div class="doc-banner">*** PRE-CUENTA / ESTADO ***</div>
      <div class="doc-subnotice">DOCUMENTO DE CONTROL • NO ES FACTURA CONTABLE</div>

      <div class="meta-box">
        <div class="meta-row"><span>Comanda / Check:</span><span class="bold">#${checkNumber}</span></div>
        <div class="meta-row"><span>Mesa / Ubicación:</span><span class="bold">${tableName}</span></div>
        <div class="meta-row"><span>Atiende:</span><span>${waiterName}</span></div>
        <div class="meta-row"><span>Fecha y Hora:</span><span>${nowStr}</span></div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align:left;width:15%;">Cant</th>
            <th style="text-align:left;width:60%;">Descripción</th>
            <th style="text-align:right;width:25%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i => `
            <tr>
              <td style="font-weight:bold;">${i.qty}x</td>
              <td>${i.product_name}</td>
              <td style="text-align:right;font-weight:bold;">Q${Number(i.line_total || (i.qty * i.unit_price) || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top:4px;">
        <div class="tot-row">
          <span>Subtotal:</span>
          <span>Q${subtotal.toFixed(2)}</span>
        </div>
        ${discount > 0 ? `
          <div class="tot-row">
            <span>Descuento:</span>
            <span>-Q${discount.toFixed(2)}</span>
          </div>
        ` : ''}
        ${tip > 0 ? `
          <div class="tot-row">
            <span>Propina sugerida:</span>
            <span>+Q${tip.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="grand-total">
          <span>TOTAL:</span>
          <span>Q${total.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer-note">
        ${footerText}
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 300);
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

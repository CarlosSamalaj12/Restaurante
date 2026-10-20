function u({account:o,items:c=[],totals:a={},businessProfile:t={}}){const e=window.open("","_blank","width=400,height=600");if(!e)throw new Error("Permite ventanas emergentes para imprimir");const g=(t==null?void 0:t.business_subtitle)||"POS RESTAURANTE & BAR",x=(t==null?void 0:t.restaurant_name)||o.center_name||"RESTAURANTE",s=(t==null?void 0:t.address)||o.center_name||"Ciudad de Guatemala",h=(t==null?void 0:t.tax_id)||(t==null?void 0:t.nit)||"8492048-2",w=(t==null?void 0:t.phone)||"(502) 2345-6789",m=(t==null?void 0:t.receipt_logo_url)||null,b=(t==null?void 0:t.receipt_footer)||"¡Gracias por su preferencia!",l=o.check_number||`CHK-${String(o.id||"").padStart(4,"0")}`,v=o.table_code?`Mesa ${o.table_code}`:o.table_name||"Mostrador / Barra",f=o.waiter_name||"Personal POS",y=new Date().toLocaleString("es-GT"),i=a.subtotal!==void 0?Number(a.subtotal):c.reduce((n,d)=>n+Number(d.line_total||d.qty*d.unit_price||0),0),r=Number(a.discountTotal||0),p=Number(a.tipAmount||(a.tipPercent?i*a.tipPercent/100:0)),$=a.total!==void 0?Number(a.total):i-r+p;e.document.open(),e.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Precuenta - ${l}</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color: #000 !important;
        }
        body {
          font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;
          width: 78mm;
          margin: 0 auto;
          padding: 4px 2px;
          color: #000 !important;
          background: #fff !important;
          font-size: 11px;
          line-height: 1.3;
          -webkit-font-smoothing: none !important;
          -moz-osx-font-smoothing: grayscale !important;
          font-smooth: never !important;
          text-rendering: geometricPrecision !important;
          image-rendering: pixelated !important;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .logo-box { text-align: center; margin-bottom: 4px; }
        .logo-box img { max-width: 130px; max-height: 55px; object-fit: contain; filter: grayscale(100%) contrast(300%); image-rendering: pixelated; }
        .subtitle { font-size: 10px; font-weight: bold; color: #000 !important; letter-spacing: 0; text-transform: uppercase; }
        .main-title { font-size: 17px; font-weight: 900; letter-spacing: 0; text-transform: uppercase; margin: 2px 0; color: #000 !important; line-height: 1.2; }
        .branch-info { font-size: 10px; color: #000 !important; font-weight: bold; }
        .tax-info { font-size: 10px; font-weight: bold; color: #000 !important; margin-top: 1px; }

        .doc-banner {
          background-color: #fff !important;
          color: #000 !important;
          text-align: center;
          padding: 3px 2px;
          margin: 6px 0 2px 0;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
          border: 2px solid #000 !important;
        }
        .doc-subnotice {
          text-align: center;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0;
          padding: 1px 0;
          border-bottom: 1.5px solid #000;
          margin-bottom: 5px;
          color: #000 !important;
        }

        .meta-box {
          border: 1.5px solid #000;
          border-radius: 0;
          padding: 4px 5px;
          margin: 5px 0;
          font-size: 10.5px;
          font-weight: bold;
          color: #000 !important;
        }
        .meta-row { display: flex; justify-content: space-between; padding: 1px 0; color: #000 !important; }

        .items-table { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 11px; color: #000 !important; }
        .items-table th { border-bottom: 1.5px solid #000; padding: 2px 0; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #000 !important; }
        .items-table td { padding: 2.5px 0; border-bottom: 1px dotted #000; color: #000 !important; font-weight: 700; }

        .tot-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 11px; font-weight: 700; color: #000 !important; }
        .grand-total {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 900;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 3px 0;
          margin: 4px 0;
          color: #000 !important;
        }

        .footer-note {
          font-size: 10px;
          text-align: center;
          padding-top: 6px;
          margin-top: 8px;
          border-top: 1.5px dashed #000;
          line-height: 1.35;
          font-weight: 700;
          color: #000 !important;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000 !important;
            border-color: #000 !important;
          }
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace !important;
            -webkit-font-smoothing: none !important;
            text-rendering: geometricPrecision !important;
          }
          .doc-banner {
            background-color: #fff !important;
            color: #000 !important;
            border: 2px solid #000 !important;
          }
          @page { margin: 0; size: auto; }
        }
      </style>
    </head>
    <body>
      <div class="center">
        ${m?`
          <div class="logo-box">
            <img src="${m}" alt="Logo" />
          </div>
        `:""}
        <div class="subtitle">${g}</div>
        <div class="main-title">${x}</div>
        <div class="branch-info">${s}</div>
        <div class="tax-info">NIT: ${h} • Tel: ${w}</div>
      </div>

      <div class="doc-banner">*** PRE-CUENTA / ESTADO ***</div>
      <div class="doc-subnotice">DOCUMENTO DE CONTROL • NO ES FACTURA CONTABLE</div>

      <div class="meta-box">
        <div class="meta-row"><span>Comanda / Check:</span><span class="bold">#${l}</span></div>
        <div class="meta-row"><span>Mesa / Ubicación:</span><span class="bold">${v}</span></div>
        <div class="meta-row"><span>Atiende:</span><span>${f}</span></div>
        <div class="meta-row"><span>Fecha y Hora:</span><span>${y}</span></div>
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
          ${c.map(n=>`
            <tr>
              <td style="font-weight:bold;">${n.qty}x</td>
              <td>${n.product_name}</td>
              <td style="text-align:right;font-weight:bold;">Q${Number(n.line_total||n.qty*n.unit_price||0).toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top:4px;">
        <div class="tot-row">
          <span>Subtotal:</span>
          <span>Q${i.toFixed(2)}</span>
        </div>
        ${r>0?`
          <div class="tot-row">
            <span>Descuento:</span>
            <span>-Q${r.toFixed(2)}</span>
          </div>
        `:""}
        ${p>0?`
          <div class="tot-row">
            <span>Propina sugerida:</span>
            <span>+Q${p.toFixed(2)}</span>
          </div>
        `:""}
        <div class="grand-total">
          <span>TOTAL:</span>
          <span>Q${$.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer-note">
        ${b}
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 300);
        };
      <\/script>
    </body>
    </html>
  `),e.document.close()}export{u as p};

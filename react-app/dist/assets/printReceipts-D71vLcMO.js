function k({account:n,items:l=[],totals:a={},businessProfile:t={}}){const w=(t==null?void 0:t.business_subtitle)||"POS RESTAURANTE & BAR",b=(t==null?void 0:t.restaurant_name)||n.center_name||"RESTAURANTE",f=(t==null?void 0:t.address)||n.center_name||"Ciudad de Guatemala",v=(t==null?void 0:t.tax_id)||(t==null?void 0:t.nit)||"8492048-2",u=(t==null?void 0:t.phone)||"(502) 2345-6789",g=(t==null?void 0:t.receipt_logo_url)||null,y=(t==null?void 0:t.receipt_footer)||"¡Gracias por su preferencia!",s=n.check_number||`CHK-${String(n.id||"").padStart(4,"0")}`,_=n.table_code?`Mesa ${n.table_code}`:n.table_name||"Mostrador / Barra",$=n.waiter_name||"Personal POS",T=new Date().toLocaleString("es-GT"),p=a.subtotal!==void 0?Number(a.subtotal):l.reduce((e,o)=>e+Number(o.line_total||o.qty*o.unit_price||0),0),d=Number(a.discountTotal||0),c=Number(a.tipAmount||(a.tipPercent?p*a.tipPercent/100:0)),N=a.total!==void 0?Number(a.total):p-d+c,x=`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Precuenta - ${s}</title>
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
        ${g?`
          <div class="logo-box">
            <img src="${g}" alt="Logo" />
          </div>
        `:""}
        <div class="subtitle">${w}</div>
        <div class="main-title">${b}</div>
        <div class="branch-info">${f}</div>
        <div class="tax-info">NIT: ${v} • Tel: ${u}</div>
      </div>

      <div class="doc-banner">*** PRE-CUENTA / ESTADO ***</div>
      <div class="doc-subnotice">DOCUMENTO DE CONTROL • NO ES FACTURA CONTABLE</div>

      <div class="meta-box">
        <div class="meta-row"><span>Comanda / Check:</span><span class="bold">#${s}</span></div>
        <div class="meta-row"><span>Mesa / Ubicación:</span><span class="bold">${_}</span></div>
        <div class="meta-row"><span>Atiende:</span><span>${$}</span></div>
        <div class="meta-row"><span>Fecha y Hora:</span><span>${T}</span></div>
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
          ${l.map(e=>`
            <tr>
              <td style="font-weight:bold;">${e.qty}x</td>
              <td>${e.product_name}</td>
              <td style="text-align:right;font-weight:bold;">Q${Number(e.line_total||e.qty*e.unit_price||0).toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top:4px;">
        <div class="tot-row">
          <span>Subtotal:</span>
          <span>Q${p.toFixed(2)}</span>
        </div>
        ${d>0?`
          <div class="tot-row">
            <span>Descuento:</span>
            <span>-Q${d.toFixed(2)}</span>
          </div>
        `:""}
        ${c>0?`
          <div class="tot-row">
            <span>Propina sugerida:</span>
            <span>+Q${c.toFixed(2)}</span>
          </div>
        `:""}
        <div class="grand-total">
          <span>TOTAL:</span>
          <span>Q${N.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer-note">
        ${y}
      </div>

      <script>
        window.onload = function() {
          if (!window.__precheckPrinted) {
            window.__precheckPrinted = true;
            try {
              window.print();
            } catch (err) {}
            if (window.self === window.top) {
              setTimeout(function() {
                try { window.close(); } catch (err) {}
              }, 400);
            }
          }
        };
      <\/script>
    </body>
    </html>
  `;try{const e="__precheck_thermal_print_iframe__";let o=document.getElementById(e);o&&o.remove(),o=document.createElement("iframe"),o.id=e,o.setAttribute("style","position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;pointer-events:none;"),document.body.appendChild(o);const h=o.contentWindow||o.contentDocument,m=h.document||h;m.open(),m.write(x),m.close(),setTimeout(()=>{try{o.contentWindow&&!o.contentWindow.__precheckPrinted&&(o.contentWindow.__precheckPrinted=!0,o.contentWindow.focus(),o.contentWindow.print())}catch{}setTimeout(()=>{try{const i=document.getElementById(e);i&&i.remove()}catch{}},3500)},300);return}catch(e){console.warn("[PRINT] Fallback a window.open para precuenta:",e)}const r=window.open("","_blank","width=400,height=600");if(!r)throw new Error("Permite ventanas emergentes para imprimir");r.document.open(),r.document.write(x),r.document.close()}export{k as p};

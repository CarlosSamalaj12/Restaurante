import{R as et,r as P,j as t}from"./vendor-react-Cpam9IyN.js";import{u as ot}from"./index-CET6EIvn.js";import{ab as st,b as ct,bu as it,X as rt}from"./vendor-icons-Ba3nkUP0.js";function r(l){const e=Number(l);return Number.isNaN(e)?"Q0.00":`Q${e.toLocaleString("es-GT",{minimumFractionDigits:2,maximumFractionDigits:2})}`}function B(l){if(!l)return"";try{return new Date(l).toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit",hour12:!0})}catch{return""}}function dt({type:l="X",shiftData:e={},businessProfile:n={},centerName:a="Sucursal Principal",cashierName:o="Cajero",terminalInfo:h={code:"POS-01",name:"Lado A"}}){const m=l==="Z",f=m?"CORTE Z - CIERRE DEFINITIVO":"CORTE X - ARQUEO PARCIAL",N=m?"CIERRE FISCAL Y DE AUDITORÍA DEFINITIVO":"DOCUMENTO DE CONTROL INTERNO - NO CIERRA TURNO",K=(n==null?void 0:n.business_subtitle)||"POS RESTAURANTE & BAR",z=(n==null?void 0:n.restaurant_name)||"SAMAPOS ARQUEO",O=(n==null?void 0:n.tax_id)||(n==null?void 0:n.nit)||"8492048-2",X=(n==null?void 0:n.phone)||"(502) 2345-6789",j=(n==null?void 0:n.address)||"Ciudad de Guatemala",M=(n==null?void 0:n.receipt_logo_url)||null,Q=e.shiftId||e.id||"0001",J=e.openedAt?new Date(e.openedAt).toLocaleString("es-GT"):"---",V=new Date,q=V.toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}),Y=m?e.closedAt?new Date(e.closedAt).toLocaleString("es-GT"):V.toLocaleString("es-GT"):`EN CURSO (${q})`,H=Number(e.openingCash||0),R=Number(e.cash_total||e.cashTotal||0),G=Number(e.expensesTotal||0),S=Number(e.expectedCash||H+R-G),$=e.closingCash!==null&&e.closingCash!==void 0?Number(e.closingCash):S,k=$-S,W=Math.abs(k)<.01?"(Cuadrado)":k>0?"(Sobrante)":"(Faltante)",I=e.methods||[{code:"cash",label:"Efectivo"},{code:"card",label:"Tarjeta"},{code:"room_charge",label:"Cargo Habitación"},{code:"cxc",label:"Crédito / CxC"},{code:"courtesy",label:"Exento / Consumos"},{code:"transfer",label:"Transferencia"},{code:"other",label:"Otro"}],E=e.paymentsDetail||[],u=Number(e.grand_total||e.grandTotal||I.reduce((p,g)=>p+Number(e[g.code+"_total"]||0),0));let T="",_=1;for(const p of I){const g=E.filter(A=>A.method===p.code),w=Number(e[p.code+"_total"]||0);if(g.length>0||w>0){const A=u>0?(w/u*100).toFixed(1):"0.0";T+=`
        <div style="margin-top:3px;page-break-inside:avoid;break-inside:avoid;">
          <div class="method-banner">
            <span>${_}. ${p.label.toUpperCase()} (${g.length} CHK • ${A}%)</span>
            <span>Q${w.toFixed(2)}</span>
          </div>
          <div class="ascii-sep">------------------------------------------</div>
          <div style="padding:1px 0;">
            ${g.length>0?g.map((c,i)=>{const d=c.payment_time?B(c.payment_time):c.closed_at?B(c.closed_at):"",b=c.check_number||`CHK-${String(c.account_id).padStart(4,"0")}`;let x="";c.method==="card"&&c.reference_no?x=` • Ref:${c.reference_no}`:c.method==="room_charge"&&(c.room_number||c.reference_no)?x=` • Hab:${c.room_number||c.reference_no}`:c.reference_no&&(x=` • ${c.reference_no}`);const F=i===g.length-1;return`
                <div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:11px;padding:1px 0;color:#000;">
                  <span style="font-weight:700;">
                    ${b}${d?` ${d}`:""}${x}
                  </span>
                  <span style="font-weight:900;white-space:nowrap;margin-left:4px;">Q${Number(c.amount).toFixed(2)}</span>
                </div>
                ${F?"":'<div class="ascii-sep" style="font-size:10px;margin:1px 0;">------------------------------------------</div>'}
              `}).join(""):`
              <div style="display:flex;justify-content:space-between;font-size:11px;padding:1px 0;color:#000;">
                <span>Total transacciones ${p.label}</span>
                <span style="font-weight:900;">Q${w.toFixed(2)}</span>
              </div>
            `}
          </div>
        </div>
      `,_++}}const v=e.totalAccounts||(e.paidAccounts?e.paidAccounts.length:E.length?new Set(E.map(p=>p.account_id)).size:0),D=v>0?u/v:0,L=Number(e.discountsTotal||0),C=Number(e.tipsTotal||0),y=(n==null?void 0:n.shift_receipt_footer)||"💡 Arqueo parcial completado: Todos los cheques han sido consolidados según las formas de pago configuradas en el turno actual.";return`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>${f} - Turno #${Q}</title>
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
          ${M?`
            <div class="logo-box">
              <img src="${M}" alt="Logo" />
            </div>
          `:""}
          <div class="subtitle">${K}</div>
          <div class="main-title">${z}</div>
          <div class="branch-info">${a} • ${j}</div>
          <div class="tax-info">NIT: ${O} • Tel: ${X}</div>
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 2. FRANJA CORTE -->
        <div class="doc-banner">
          <div class="title">${f}</div>
        </div>
        <div class="doc-subnotice">${N}</div>

        <!-- 3. METADATOS DEL TURNO -->
        <div class="meta-box">
          <div class="meta-row"><span>TURNO: #TRN-${String(Q).padStart(4,"0")}</span><span class="bold">CAJERO: ${o}</span></div>
          <div class="meta-row"><span>TERMINAL: #${h.code||"POS-01"}</span><span>APERTURA: ${J}</span></div>
          <div class="meta-row"><span>${m?"CIERRE TURNO:":"HORA IMPRESIÓN:"}</span><span class="bold">${Y}</span></div>
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 4. ARQUEO DE EFECTIVO EN CAJA -->
        <div class="section-box">
          <div class="section-title">ARQUEO DE EFECTIVO EN CAJA</div>
          <div class="row"><span>Fondo Inicial (Base):</span><span class="bold">Q${H.toFixed(2)}</span></div>
          <div class="row"><span>(+) Ventas Efectivo:</span><span class="bold">+Q${R.toFixed(2)}</span></div>
          <div class="row"><span>(-) Retiros Caja Chica:</span><span class="bold">-Q${G.toFixed(2)}</span></div>
          <div class="row highlight">
            <span>EFECTIVO ESPERADO:</span>
            <span>Q${S.toFixed(2)}</span>
          </div>
          <div class="row" style="padding-top:1px;">
            <span>Efectivo Contado (Físico):</span>
            <span class="bold">Q${$.toFixed(2)}</span>
          </div>
          <div class="row" style="padding-top:1px;">
            <span>Diferencia:</span>
            <span class="bold">${k>0?"+":""}Q${k.toFixed(2)} ${W}</span>
          </div>
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 5. DETALLE DE CHEQUES POR FORMA DE PAGO -->
        <div style="margin-top:2px;">
          <div class="bold center" style="font-size:13px;text-transform:uppercase;color:#000;">
            DETALLE DE CHEQUES POR FORMA DE PAGO
          </div>
          ${T||'<div style="text-align:center;padding:4px 0;font-weight:bold;color:#000;">Sin transacciones registradas</div>'}
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 6. TOTALES Y MÉTRICAS OPERATIVAS (UNIFICADOS) -->
        <div class="totals-group">
          <div class="grand-banner">
            <div class="label-col">
              <span class="small-label">TOTAL FACTURADO</span>
              <span class="big-label">VENTAS BRUTAS:</span>
            </div>
            <div class="amount">Q${u.toFixed(2)}</div>
          </div>

          <div class="stats-box">
            <div class="stat-row">
              <span>TOTAL CUENTAS:</span>
              <span class="bold">${v}</span>
            </div>
            <div class="stat-row">
              <span>TICKET PROMEDIO:</span>
              <span class="bold">Q${D.toFixed(2)}</span>
            </div>
            ${L>0?`
            <div class="stat-row">
              <span>DESCUENTOS APLICADOS:</span>
              <span class="bold">-Q${L.toFixed(2)}</span>
            </div>
            `:""}
            ${C>0?`
            <div class="stat-row">
              <span>PROPINAS RECIBIDAS:</span>
              <span class="bold">+Q${C.toFixed(2)}</span>
            </div>
            `:""}
          </div>

          <div class="ascii-sep">------------------------------------------</div>

          <div class="footer-note">
            ${y}
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
  `}function lt(l){const e=window.open("","_blank","width=420,height=650");if(!e)throw new Error("Permite ventanas emergentes para imprimir");const n=dt(l);e.document.open(),e.document.write(n),e.document.close()}function bt({isOpen:l,onClose:e,type:n="X",shiftData:a={},businessProfile:o={},centerName:h="Sucursal Principal",cashierName:m="Cajero",terminalInfo:f={code:"POS-01",name:"Lado A"}}){const N=ot(),[K,z]=et.useState(!1),O=P.useCallback(()=>{try{lt({type:n,shiftData:a,businessProfile:o,centerName:h,cashierName:m,terminalInfo:f})}catch(i){N.error(i.message||"Error al lanzar impresión")}},[n,a,o,h,m,f,N]),X=P.useCallback(()=>{const i=n==="Z",d=a.shiftId||a.id||"0001",b=Number(a.openingCash||0),x=Number(a.cash_total||a.cashTotal||0),F=Number(a.expectedCash||b+x),s=Number(a.grand_total||a.grandTotal||0),U=`📊 *${i?"CORTE Z - CIERRE DEFINITIVO":"CORTE X - ARQUEO PARCIAL"}*
Turno #${d} • ${h}
Cajero: ${m}
----------------------------
Fondo Inicial: ${r(b)}
Ventas Efectivo: ${r(x)}
Efectivo Esperado: ${r(F)}
VENTAS BRUTAS: ${r(s)}
----------------------------
SamaPos POS`;navigator.share?navigator.share({title:`${i?"Corte Z":"Corte X"} - Turno #${d}`,text:U}).catch(()=>{}):(navigator.clipboard.writeText(U),z(!0),N.success("Resumen copiado al portapapeles"),setTimeout(()=>z(!1),2500))},[n,a,h,m,N]);if(P.useEffect(()=>{const i=d=>{d.key==="Escape"&&(e==null||e()),(d.ctrlKey||d.metaKey)&&d.key.toLowerCase()==="p"&&(d.preventDefault(),O())};return l&&window.addEventListener("keydown",i),()=>window.removeEventListener("keydown",i)},[l,e,O]),!l)return null;const j=n==="Z",M=j?"CORTE Z - CIERRE DEFINITIVO":"CORTE X - ARQUEO PARCIAL",Q=j?"CIERRE FISCAL Y DE AUDITORÍA DEFINITIVO":"DOCUMENTO DE CONTROL INTERNO - NO CIERRA TURNO",J=(o==null?void 0:o.business_subtitle)||"POS RESTAURANTE & BAR",V=(o==null?void 0:o.restaurant_name)||"SAMAPOS ARQUEO",q=(o==null?void 0:o.tax_id)||(o==null?void 0:o.nit)||"8492048-2",Y=(o==null?void 0:o.phone)||"(502) 2345-6789",H=(o==null?void 0:o.address)||"Ciudad de Guatemala",R=(o==null?void 0:o.receipt_logo_url)||null,G=a.shiftId||a.id||"0001",S=a.openedAt?new Date(a.openedAt).toLocaleString("es-GT"):"---",$=new Date,k=$.toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}),W=j?a.closedAt?new Date(a.closedAt).toLocaleString("es-GT"):$.toLocaleString("es-GT"):`EN CURSO (${k})`,I=Number(a.openingCash||0),E=Number(a.cash_total||a.cashTotal||0),u=Number(a.expensesTotal||0),T=Number(a.expectedCash||I+E-u),_=a.closingCash!==null&&a.closingCash!==void 0?Number(a.closingCash):T,v=_-T,D=Math.abs(v)<.01?"(Cuadrado)":v>0?"(Sobrante)":"(Faltante)",L=a.methods||[{code:"cash",label:"Efectivo"},{code:"card",label:"Tarjeta"},{code:"room_charge",label:"Cargo Habitación"},{code:"cxc",label:"Crédito / CxC"},{code:"courtesy",label:"Exento / Consumos"},{code:"transfer",label:"Transferencia"},{code:"other",label:"Otro"}],C=a.paymentsDetail||[],y=Number(a.grand_total||a.grandTotal||L.reduce((i,d)=>i+Number(a[d.code+"_total"]||0),0)),p=a.totalAccounts||(a.paidAccounts?a.paidAccounts.length:C.length?new Set(C.map(i=>i.account_id)).size:0),g=p>0?y/p:0,w=Number(a.discountsTotal||0),A=Number(a.tipsTotal||0),c=(o==null?void 0:o.shift_receipt_footer)||"💡 Arqueo parcial completado: Todos los cheques han sido consolidados según las formas de pago configuradas en el turno actual.";return t.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200",children:t.jsxs("div",{className:"relative w-full max-w-[420px] max-h-[92vh] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden",children:[t.jsxs("div",{className:"flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0",children:[t.jsxs("div",{className:"flex items-center gap-2.5",children:[t.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[t.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"}),t.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"})]}),t.jsxs("div",{className:"text-left",children:[t.jsx("div",{className:"text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5",children:"Terminal en Línea"}),t.jsxs("div",{className:"text-[10px] text-slate-400",children:["#",f.code||"POS-01"," • ",h]})]})]}),t.jsxs("div",{className:"flex items-center gap-1.5",children:[t.jsxs("button",{type:"button",onClick:O,className:"px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer",title:"Imprimir ticket en impresora térmica (Ctrl+P)",children:[t.jsx(st,{className:"w-3.5 h-3.5"}),t.jsx("span",{children:"Imprimir"})]}),t.jsx("button",{type:"button",onClick:X,className:"p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer",title:"Compartir o copiar resumen",children:K?t.jsx(ct,{className:"w-4 h-4 text-emerald-400"}):t.jsx(it,{className:"w-4 h-4"})}),t.jsx("button",{type:"button",onClick:e,className:"p-1.5 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 rounded-xl transition-all cursor-pointer ml-1",title:"Cerrar vista previa (ESC)",children:t.jsx(rt,{className:"w-4 h-4"})})]})]}),t.jsx("div",{className:"flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-950/60",children:t.jsxs("div",{className:"w-[330px] mx-auto bg-white text-black p-4 pb-6 mb-6 rounded-sm shadow-xl select-text h-auto",style:{fontFamily:"'Consolas', 'Lucida Console', Monaco, monospace",fontSize:"11px",lineHeight:1.25,fontWeight:700},children:[t.jsxs("div",{className:"text-center pb-1",children:[R&&t.jsx("div",{className:"mb-2 flex justify-center",children:t.jsx("img",{src:R,alt:"Logo",className:"max-h-14 max-w-[150px] object-contain grayscale contrast-200"})}),t.jsx("div",{className:"text-[11px] font-bold text-black uppercase tracking-wider",children:J}),t.jsx("div",{className:"text-[18px] font-black uppercase tracking-tight text-black my-0.5",children:V}),t.jsxs("div",{className:"text-[11px] text-black font-bold",children:[h," • ",H]}),t.jsxs("div",{className:"text-[11px] font-bold text-black",children:["NIT: ",q," • Tel: ",Y]})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"=========================================="}),t.jsx("div",{className:"bg-white text-black text-center py-1 px-1 border-2 border-black",children:t.jsx("div",{className:"text-[14px] font-black tracking-wide uppercase",children:M})}),t.jsx("div",{className:"text-center text-[10px] font-bold tracking-tight py-0.5 mb-1 uppercase text-black",children:Q}),t.jsxs("div",{className:"border-[1.5px] border-black p-1.5 mb-1 space-y-0.5 text-[11px] font-bold",children:[t.jsxs("div",{className:"flex justify-between",children:[t.jsxs("span",{className:"text-black",children:["TURNO: #TRN-",String(G).padStart(4,"0")]}),t.jsxs("span",{className:"font-black text-black",children:["CAJERO: ",m]})]}),t.jsxs("div",{className:"flex justify-between",children:[t.jsxs("span",{className:"text-black",children:["TERMINAL: #",f.code||"POS-01"]}),t.jsx("span",{className:"text-black",children:S})]}),t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{className:"text-black",children:j?"CIERRE TURNO:":"HORA IMPRESIÓN:"}),t.jsx("span",{className:"font-black text-black",children:W})]})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"=========================================="}),t.jsxs("div",{className:"border-[1.5px] border-black p-1.5 my-1 space-y-0.5 text-[11px]",children:[t.jsx("div",{className:"font-black text-center text-[13px] uppercase tracking-wider border-b-[1.5px] border-black pb-1 mb-1 text-black",children:"ARQUEO DE EFECTIVO EN CAJA"}),t.jsxs("div",{className:"flex justify-between text-[11px]",children:[t.jsx("span",{children:"Fondo Inicial (Base):"}),t.jsx("span",{className:"font-bold",children:r(I)})]}),t.jsxs("div",{className:"flex justify-between text-[11px]",children:[t.jsx("span",{children:"(+) Ventas Efectivo:"}),t.jsxs("span",{className:"font-bold text-black",children:["+",r(E)]})]}),t.jsxs("div",{className:"flex justify-between text-[11px]",children:[t.jsx("span",{children:"(-) Retiros Caja Chica:"}),t.jsxs("span",{className:"font-bold text-black",children:["-",r(u)]})]}),t.jsxs("div",{className:"border-t-[1.5px] border-b-[1.5px] border-black py-0.5 my-0.5 flex justify-between font-black text-[13px]",children:[t.jsx("span",{children:"EFECTIVO ESPERADO:"}),t.jsx("span",{children:r(T)})]}),t.jsxs("div",{className:"flex justify-between text-[12px] pt-0.5",children:[t.jsx("span",{children:"Efectivo Contado (Físico):"}),t.jsx("span",{className:"font-black text-[12px]",children:r(_)})]}),t.jsxs("div",{className:"flex justify-between text-[12px] font-bold pt-0.5",children:[t.jsx("span",{children:"Diferencia (Sobrante/Faltante):"}),t.jsxs("span",{className:"font-black text-black",children:[v>0?"+":"",r(v)," ",D]})]})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"=========================================="}),t.jsxs("div",{children:[t.jsx("div",{className:"font-black text-center text-[13px] uppercase tracking-wider text-black",children:"DETALLE DE CHEQUES POR FORMA DE PAGO"}),L.map((i,d)=>{const b=C.filter(s=>s.method===i.code),x=Number(a[i.code+"_total"]||0);if(b.length===0&&x===0)return null;const F=y>0?(x/y*100).toFixed(1):"0.0";return t.jsxs("div",{className:"mt-1.5 text-[11px]",children:[t.jsxs("div",{className:"bg-white text-black px-1 py-0.5 flex justify-between font-black uppercase text-[12px] border-t-[1.5px] border-b-[1.5px] border-black",children:[t.jsxs("span",{children:[d+1,". ",i.label," (",b.length," CHK • ",F,"%)"]}),t.jsx("span",{children:r(x)})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[10px] text-black my-0.5 select-none overflow-hidden whitespace-nowrap",children:"------------------------------------------"}),t.jsx("div",{className:"px-0.5 py-0.5 space-y-0.5",children:b.length>0?b.map((s,U)=>{const tt=s.payment_time?B(s.payment_time):s.closed_at?B(s.closed_at):"",at=s.check_number||`CHK-${String(s.account_id).padStart(4,"0")}`;let Z="";s.method==="card"&&s.reference_no?Z=` • ${s.reference_no}`:s.method==="room_charge"&&s.room_number?Z=` • Hab: ${s.room_number}`:s.reference_no&&(Z=` • ${s.reference_no}`);const nt=U===b.length-1;return t.jsxs(et.Fragment,{children:[t.jsxs("div",{className:"flex justify-between items-start text-[11px]",children:[t.jsxs("span",{className:"font-bold text-black",children:[at,tt?` • ${tt}`:"",Z]}),t.jsx("span",{className:"font-black text-black ml-2 whitespace-nowrap",children:r(s.amount)})]}),!nt&&t.jsx("div",{className:"text-center font-bold tracking-tighter text-[10px] text-black my-0.5 select-none overflow-hidden whitespace-nowrap",children:"------------------------------------------"})]},s.id||U)}):t.jsxs("div",{className:"flex justify-between text-black py-0.5 text-[11px]",children:[t.jsxs("span",{children:["Ventas ",i.label]}),t.jsx("span",{className:"font-bold",children:r(x)})]})})]},i.code)})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"=========================================="}),t.jsxs("div",{className:"mt-1",children:[t.jsxs("div",{className:"bg-white text-black p-1.5 flex justify-between items-center border-2 border-black",children:[t.jsxs("div",{children:[t.jsx("div",{className:"text-[9px] font-black text-black uppercase tracking-widest",children:"TOTAL FACTURADO"}),t.jsx("div",{className:"text-[14px] font-black",children:"VENTAS BRUTAS:"})]}),t.jsx("div",{className:"text-[16px] font-black text-black",children:r(y)})]}),t.jsxs("div",{className:"border-t-[1.5px] border-b-[1.5px] border-black py-1.5 my-1.5 space-y-0.5 text-[12px] font-black text-black",children:[t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{children:"TOTAL CUENTAS:"}),t.jsx("span",{className:"font-black",children:p})]}),t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{children:"TICKET PROMEDIO:"}),t.jsx("span",{className:"font-black",children:r(g)})]}),w>0&&t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{children:"DESCUENTOS APLICADOS:"}),t.jsxs("span",{className:"font-black",children:["-",r(w)]})]}),A>0&&t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{children:"PROPINAS RECIBIDAS:"}),t.jsxs("span",{className:"font-black",children:["+",r(A)]})]})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[10px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"------------------------------------------"}),t.jsx("div",{className:"mt-1 text-[10px] font-bold leading-tight text-center text-black pt-1",children:c})]})]})})]})})}export{bt as S,lt as p};

import{R as et,r as P,j as t}from"./vendor-react-nDqC1Qgh.js";import{u as ot}from"./index-H5F4Lv8p.js";import{ao as ct,b as it,by as st,X as rt}from"./vendor-icons-DXgOUkA0.js";function r(p){const n=Number(p);return Number.isNaN(n)?"Q0.00":`Q${n.toLocaleString("es-GT",{minimumFractionDigits:2,maximumFractionDigits:2})}`}function Z(p){if(!p)return"";try{return new Date(p).toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit",hour12:!0})}catch{return""}}function dt({type:p="X",shiftData:n={},businessProfile:o={},centerName:e="Sucursal Principal",cashierName:a="Cajero",terminalInfo:g={code:"POS-01",name:"Lado A"}}){const l=p==="Z",x=l?"CORTE Z - CIERRE DEFINITIVO":"CORTE X - ARQUEO PARCIAL",N=l?"CIERRE FISCAL Y DE AUDITORÍA DEFINITIVO":"DOCUMENTO DE CONTROL INTERNO - NO CIERRA TURNO",K=(o==null?void 0:o.business_subtitle)||"POS RESTAURANTE & BAR",z=(o==null?void 0:o.restaurant_name)||"SAMAPOS ARQUEO",R=(o==null?void 0:o.tax_id)||(o==null?void 0:o.nit)||"8492048-2",W=(o==null?void 0:o.phone)||"(502) 2345-6789",j=(o==null?void 0:o.address)||"Ciudad de Guatemala",M=(o==null?void 0:o.receipt_logo_url)||null,Q=n.shiftId||n.id||"0001",X=n.openedAt?new Date(n.openedAt).toLocaleString("es-GT"):"---",V=new Date,J=V.toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}),q=l?n.closedAt?new Date(n.closedAt).toLocaleString("es-GT"):V.toLocaleString("es-GT"):`EN CURSO (${J})`,H=Number(n.openingCash||0),O=Number(n.cash_total||n.cashTotal||0),G=Number(n.expensesTotal||0),S=Number(n.expectedCash||H+O-G),_=n.closingCash!==null&&n.closingCash!==void 0?Number(n.closingCash):S,k=_-S,Y=Math.abs(k)<.01?"(Cuadrado)":k>0?"(Sobrante)":"(Faltante)",I=n.methods||[{code:"cash",label:"Efectivo"},{code:"card",label:"Tarjeta"},{code:"room_charge",label:"Cargo Habitación"},{code:"cxc",label:"Crédito / CxC"},{code:"courtesy",label:"Exento / Consumos"},{code:"transfer",label:"Transferencia"},{code:"other",label:"Otro"}],E=n.paymentsDetail||[],u=Number(n.grand_total||n.grandTotal||I.reduce((m,v)=>m+Number(n[v.code+"_total"]||0),0));let T="",$=1;for(const m of I){const v=E.filter(A=>A.method===m.code),w=Number(n[m.code+"_total"]||0);if(v.length>0||w>0){const A=u>0?(w/u*100).toFixed(1):"0.0";T+=`
        <div style="margin-top:3px;page-break-inside:avoid;break-inside:avoid;">
          <div class="method-banner">
            <span>${$}. ${m.label.toUpperCase()} (${v.length} CHK • ${A}%)</span>
            <span>Q${w.toFixed(2)}</span>
          </div>
          <div class="ascii-sep">------------------------------------------</div>
          <div style="padding:1px 0;">
            ${v.length>0?v.map((i,s)=>{const d=i.payment_time?Z(i.payment_time):i.closed_at?Z(i.closed_at):"",h=i.check_number||`CHK-${String(i.account_id).padStart(4,"0")}`;let b="";i.method==="card"&&i.reference_no?b=` • Ref:${i.reference_no}`:i.method==="room_charge"&&(i.room_number||i.reference_no)?b=` • Hab:${i.room_number||i.reference_no}`:i.reference_no&&(b=` • ${i.reference_no}`);const L=s===v.length-1;return`
                <div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:11px;padding:1px 0;color:#000;">
                  <span style="font-weight:700;">
                    ${h}${d?` ${d}`:""}${b}
                  </span>
                  <span style="font-weight:900;white-space:nowrap;margin-left:4px;">Q${Number(i.amount).toFixed(2)}</span>
                </div>
                ${L?"":'<div class="ascii-sep" style="font-size:10px;margin:1px 0;">------------------------------------------</div>'}
              `}).join(""):`
              <div style="display:flex;justify-content:space-between;font-size:11px;padding:1px 0;color:#000;">
                <span>Total transacciones ${m.label}</span>
                <span style="font-weight:900;">Q${w.toFixed(2)}</span>
              </div>
            `}
          </div>
        </div>
      `,$++}}const f=n.totalAccounts||(n.paidAccounts?n.paidAccounts.length:E.length?new Set(E.map(m=>m.account_id)).size:0),D=f>0?u/f:0,F=Number(n.discountsTotal||0),y=Number(n.tipsTotal||0),C=(o==null?void 0:o.shift_receipt_footer)||"💡 Arqueo parcial completado: Todos los cheques han sido consolidados según las formas de pago configuradas en el turno actual.";return`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>${x} - Turno #${Q}</title>
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
          <div class="branch-info">${e} • ${j}</div>
          <div class="tax-info">NIT: ${R} • Tel: ${W}</div>
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 2. FRANJA CORTE -->
        <div class="doc-banner">
          <div class="title">${x}</div>
        </div>
        <div class="doc-subnotice">${N}</div>

        <!-- 3. METADATOS DEL TURNO -->
        <div class="meta-box">
          <div class="meta-row"><span>TURNO: #TRN-${String(Q).padStart(4,"0")}</span><span class="bold">CAJERO: ${a}</span></div>
          <div class="meta-row"><span>TERMINAL: #${g.code||"POS-01"}</span><span>APERTURA: ${X}</span></div>
          <div class="meta-row"><span>${l?"CIERRE TURNO:":"HORA IMPRESIÓN:"}</span><span class="bold">${q}</span></div>
        </div>

        <div class="ascii-sep">==========================================</div>

        <!-- 4. ARQUEO DE EFECTIVO EN CAJA -->
        <div class="section-box">
          <div class="section-title">ARQUEO DE EFECTIVO EN CAJA</div>
          <div class="row"><span>Fondo Inicial (Base):</span><span class="bold">Q${H.toFixed(2)}</span></div>
          <div class="row"><span>(+) Ventas Efectivo:</span><span class="bold">+Q${O.toFixed(2)}</span></div>
          <div class="row"><span>(-) Retiros Caja Chica:</span><span class="bold">-Q${G.toFixed(2)}</span></div>
          <div class="row highlight">
            <span>EFECTIVO ESPERADO:</span>
            <span>Q${S.toFixed(2)}</span>
          </div>
          <div class="row" style="padding-top:1px;">
            <span>Efectivo Contado (Físico):</span>
            <span class="bold">Q${_.toFixed(2)}</span>
          </div>
          <div class="row" style="padding-top:1px;">
            <span>Diferencia:</span>
            <span class="bold">${k>0?"+":""}Q${k.toFixed(2)} ${Y}</span>
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
              <span class="bold">${f}</span>
            </div>
            <div class="stat-row">
              <span>TICKET PROMEDIO:</span>
              <span class="bold">Q${D.toFixed(2)}</span>
            </div>
            ${F>0?`
            <div class="stat-row">
              <span>DESCUENTOS APLICADOS:</span>
              <span class="bold">-Q${F.toFixed(2)}</span>
            </div>
            `:""}
            ${y>0?`
            <div class="stat-row">
              <span>PROPINAS RECIBIDAS:</span>
              <span class="bold">+Q${y.toFixed(2)}</span>
            </div>
            `:""}
          </div>

          <div class="ascii-sep">------------------------------------------</div>

          <div class="footer-note">
            ${C}
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          if (!window.__shiftPrinted) {
            window.__shiftPrinted = true;
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
  `}function lt(p){const n=dt(p);try{const e="__shift_thermal_print_iframe__";let a=document.getElementById(e);a&&a.remove(),a=document.createElement("iframe"),a.id=e,a.setAttribute("style","position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;pointer-events:none;"),document.body.appendChild(a);const g=a.contentWindow||a.contentDocument,l=g.document||g;l.open(),l.write(n),l.close(),setTimeout(()=>{try{a.contentWindow&&!a.contentWindow.__shiftPrinted&&(a.contentWindow.__shiftPrinted=!0,a.contentWindow.focus(),a.contentWindow.print())}catch{}setTimeout(()=>{try{const x=document.getElementById(e);x&&x.remove()}catch{}},3500)},300);return}catch(e){console.warn("[PRINT] Fallback a window.open para ticket de turno:",e)}const o=window.open("","_blank","width=420,height=650");if(!o)throw new Error("Permite ventanas emergentes para imprimir");o.document.open(),o.document.write(n),o.document.close()}function bt({isOpen:p,onClose:n,type:o="X",shiftData:e={},businessProfile:a={},centerName:g="Sucursal Principal",cashierName:l="Cajero",terminalInfo:x={code:"POS-01",name:"Lado A"}}){const N=ot(),[K,z]=et.useState(!1),R=P.useCallback(()=>{try{lt({type:o,shiftData:e,businessProfile:a,centerName:g,cashierName:l,terminalInfo:x})}catch(s){N.error(s.message||"Error al lanzar impresión")}},[o,e,a,g,l,x,N]),W=P.useCallback(()=>{const s=o==="Z",d=e.shiftId||e.id||"0001",h=Number(e.openingCash||0),b=Number(e.cash_total||e.cashTotal||0),L=Number(e.expectedCash||h+b),c=Number(e.grand_total||e.grandTotal||0),U=`📊 *${s?"CORTE Z - CIERRE DEFINITIVO":"CORTE X - ARQUEO PARCIAL"}*
Turno #${d} • ${g}
Cajero: ${l}
----------------------------
Fondo Inicial: ${r(h)}
Ventas Efectivo: ${r(b)}
Efectivo Esperado: ${r(L)}
VENTAS BRUTAS: ${r(c)}
----------------------------
SamaPos POS`;navigator.share?navigator.share({title:`${s?"Corte Z":"Corte X"} - Turno #${d}`,text:U}).catch(()=>{}):(navigator.clipboard.writeText(U),z(!0),N.success("Resumen copiado al portapapeles"),setTimeout(()=>z(!1),2500))},[o,e,g,l,N]);if(P.useEffect(()=>{const s=d=>{d.key==="Escape"&&(n==null||n()),(d.ctrlKey||d.metaKey)&&d.key.toLowerCase()==="p"&&(d.preventDefault(),R())};return p&&window.addEventListener("keydown",s),()=>window.removeEventListener("keydown",s)},[p,n,R]),!p)return null;const j=o==="Z",M=j?"CORTE Z - CIERRE DEFINITIVO":"CORTE X - ARQUEO PARCIAL",Q=j?"CIERRE FISCAL Y DE AUDITORÍA DEFINITIVO":"DOCUMENTO DE CONTROL INTERNO - NO CIERRA TURNO",X=(a==null?void 0:a.business_subtitle)||"POS RESTAURANTE & BAR",V=(a==null?void 0:a.restaurant_name)||"SAMAPOS ARQUEO",J=(a==null?void 0:a.tax_id)||(a==null?void 0:a.nit)||"8492048-2",q=(a==null?void 0:a.phone)||"(502) 2345-6789",H=(a==null?void 0:a.address)||"Ciudad de Guatemala",O=(a==null?void 0:a.receipt_logo_url)||null,G=e.shiftId||e.id||"0001",S=e.openedAt?new Date(e.openedAt).toLocaleString("es-GT"):"---",_=new Date,k=_.toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}),Y=j?e.closedAt?new Date(e.closedAt).toLocaleString("es-GT"):_.toLocaleString("es-GT"):`EN CURSO (${k})`,I=Number(e.openingCash||0),E=Number(e.cash_total||e.cashTotal||0),u=Number(e.expensesTotal||0),T=Number(e.expectedCash||I+E-u),$=e.closingCash!==null&&e.closingCash!==void 0?Number(e.closingCash):T,f=$-T,D=Math.abs(f)<.01?"(Cuadrado)":f>0?"(Sobrante)":"(Faltante)",F=e.methods||[{code:"cash",label:"Efectivo"},{code:"card",label:"Tarjeta"},{code:"room_charge",label:"Cargo Habitación"},{code:"cxc",label:"Crédito / CxC"},{code:"courtesy",label:"Exento / Consumos"},{code:"transfer",label:"Transferencia"},{code:"other",label:"Otro"}],y=e.paymentsDetail||[],C=Number(e.grand_total||e.grandTotal||F.reduce((s,d)=>s+Number(e[d.code+"_total"]||0),0)),m=e.totalAccounts||(e.paidAccounts?e.paidAccounts.length:y.length?new Set(y.map(s=>s.account_id)).size:0),v=m>0?C/m:0,w=Number(e.discountsTotal||0),A=Number(e.tipsTotal||0),i=(a==null?void 0:a.shift_receipt_footer)||"💡 Arqueo parcial completado: Todos los cheques han sido consolidados según las formas de pago configuradas en el turno actual.";return t.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200",children:t.jsxs("div",{className:"relative w-full max-w-[420px] max-h-[92vh] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden",children:[t.jsxs("div",{className:"flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0",children:[t.jsxs("div",{className:"flex items-center gap-2.5",children:[t.jsxs("span",{className:"relative flex h-2.5 w-2.5",children:[t.jsx("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"}),t.jsx("span",{className:"relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"})]}),t.jsxs("div",{className:"text-left",children:[t.jsx("div",{className:"text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5",children:"Terminal en Línea"}),t.jsxs("div",{className:"text-[10px] text-slate-400",children:["#",x.code||"POS-01"," • ",g]})]})]}),t.jsxs("div",{className:"flex items-center gap-1.5",children:[t.jsxs("button",{type:"button",onClick:R,className:"px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer",title:"Imprimir ticket en impresora térmica (Ctrl+P)",children:[t.jsx(ct,{className:"w-3.5 h-3.5"}),t.jsx("span",{children:"Imprimir"})]}),t.jsx("button",{type:"button",onClick:W,className:"p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer",title:"Compartir o copiar resumen",children:K?t.jsx(it,{className:"w-4 h-4 text-emerald-400"}):t.jsx(st,{className:"w-4 h-4"})}),t.jsx("button",{type:"button",onClick:n,className:"p-1.5 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 rounded-xl transition-all cursor-pointer ml-1",title:"Cerrar vista previa (ESC)",children:t.jsx(rt,{className:"w-4 h-4"})})]})]}),t.jsx("div",{className:"flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-950/60",children:t.jsxs("div",{className:"w-[330px] mx-auto bg-white text-black p-4 pb-6 mb-6 rounded-sm shadow-xl select-text h-auto",style:{fontFamily:"'Consolas', 'Lucida Console', Monaco, monospace",fontSize:"11px",lineHeight:1.25,fontWeight:700},children:[t.jsxs("div",{className:"text-center pb-1",children:[O&&t.jsx("div",{className:"mb-2 flex justify-center",children:t.jsx("img",{src:O,alt:"Logo",className:"max-h-14 max-w-[150px] object-contain grayscale contrast-200"})}),t.jsx("div",{className:"text-[11px] font-bold text-black uppercase tracking-wider",children:X}),t.jsx("div",{className:"text-[18px] font-black uppercase tracking-tight text-black my-0.5",children:V}),t.jsxs("div",{className:"text-[11px] text-black font-bold",children:[g," • ",H]}),t.jsxs("div",{className:"text-[11px] font-bold text-black",children:["NIT: ",J," • Tel: ",q]})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"=========================================="}),t.jsx("div",{className:"bg-white text-black text-center py-1 px-1 border-2 border-black",children:t.jsx("div",{className:"text-[14px] font-black tracking-wide uppercase",children:M})}),t.jsx("div",{className:"text-center text-[10px] font-bold tracking-tight py-0.5 mb-1 uppercase text-black",children:Q}),t.jsxs("div",{className:"border-[1.5px] border-black p-1.5 mb-1 space-y-0.5 text-[11px] font-bold",children:[t.jsxs("div",{className:"flex justify-between",children:[t.jsxs("span",{className:"text-black",children:["TURNO: #TRN-",String(G).padStart(4,"0")]}),t.jsxs("span",{className:"font-black text-black",children:["CAJERO: ",l]})]}),t.jsxs("div",{className:"flex justify-between",children:[t.jsxs("span",{className:"text-black",children:["TERMINAL: #",x.code||"POS-01"]}),t.jsx("span",{className:"text-black",children:S})]}),t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{className:"text-black",children:j?"CIERRE TURNO:":"HORA IMPRESIÓN:"}),t.jsx("span",{className:"font-black text-black",children:Y})]})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"=========================================="}),t.jsxs("div",{className:"border-[1.5px] border-black p-1.5 my-1 space-y-0.5 text-[11px]",children:[t.jsx("div",{className:"font-black text-center text-[13px] uppercase tracking-wider border-b-[1.5px] border-black pb-1 mb-1 text-black",children:"ARQUEO DE EFECTIVO EN CAJA"}),t.jsxs("div",{className:"flex justify-between text-[11px]",children:[t.jsx("span",{children:"Fondo Inicial (Base):"}),t.jsx("span",{className:"font-bold",children:r(I)})]}),t.jsxs("div",{className:"flex justify-between text-[11px]",children:[t.jsx("span",{children:"(+) Ventas Efectivo:"}),t.jsxs("span",{className:"font-bold text-black",children:["+",r(E)]})]}),t.jsxs("div",{className:"flex justify-between text-[11px]",children:[t.jsx("span",{children:"(-) Retiros Caja Chica:"}),t.jsxs("span",{className:"font-bold text-black",children:["-",r(u)]})]}),t.jsxs("div",{className:"border-t-[1.5px] border-b-[1.5px] border-black py-0.5 my-0.5 flex justify-between font-black text-[13px]",children:[t.jsx("span",{children:"EFECTIVO ESPERADO:"}),t.jsx("span",{children:r(T)})]}),t.jsxs("div",{className:"flex justify-between text-[12px] pt-0.5",children:[t.jsx("span",{children:"Efectivo Contado (Físico):"}),t.jsx("span",{className:"font-black text-[12px]",children:r($)})]}),t.jsxs("div",{className:"flex justify-between text-[12px] font-bold pt-0.5",children:[t.jsx("span",{children:"Diferencia (Sobrante/Faltante):"}),t.jsxs("span",{className:"font-black text-black",children:[f>0?"+":"",r(f)," ",D]})]})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"=========================================="}),t.jsxs("div",{children:[t.jsx("div",{className:"font-black text-center text-[13px] uppercase tracking-wider text-black",children:"DETALLE DE CHEQUES POR FORMA DE PAGO"}),F.map((s,d)=>{const h=y.filter(c=>c.method===s.code),b=Number(e[s.code+"_total"]||0);if(h.length===0&&b===0)return null;const L=C>0?(b/C*100).toFixed(1):"0.0";return t.jsxs("div",{className:"mt-1.5 text-[11px]",children:[t.jsxs("div",{className:"bg-white text-black px-1 py-0.5 flex justify-between font-black uppercase text-[12px] border-t-[1.5px] border-b-[1.5px] border-black",children:[t.jsxs("span",{children:[d+1,". ",s.label," (",h.length," CHK • ",L,"%)"]}),t.jsx("span",{children:r(b)})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[10px] text-black my-0.5 select-none overflow-hidden whitespace-nowrap",children:"------------------------------------------"}),t.jsx("div",{className:"px-0.5 py-0.5 space-y-0.5",children:h.length>0?h.map((c,U)=>{const tt=c.payment_time?Z(c.payment_time):c.closed_at?Z(c.closed_at):"",at=c.check_number||`CHK-${String(c.account_id).padStart(4,"0")}`;let B="";c.method==="card"&&c.reference_no?B=` • ${c.reference_no}`:c.method==="room_charge"&&c.room_number?B=` • Hab: ${c.room_number}`:c.reference_no&&(B=` • ${c.reference_no}`);const nt=U===h.length-1;return t.jsxs(et.Fragment,{children:[t.jsxs("div",{className:"flex justify-between items-start text-[11px]",children:[t.jsxs("span",{className:"font-bold text-black",children:[at,tt?` • ${tt}`:"",B]}),t.jsx("span",{className:"font-black text-black ml-2 whitespace-nowrap",children:r(c.amount)})]}),!nt&&t.jsx("div",{className:"text-center font-bold tracking-tighter text-[10px] text-black my-0.5 select-none overflow-hidden whitespace-nowrap",children:"------------------------------------------"})]},c.id||U)}):t.jsxs("div",{className:"flex justify-between text-black py-0.5 text-[11px]",children:[t.jsxs("span",{children:["Ventas ",s.label]}),t.jsx("span",{className:"font-bold",children:r(b)})]})})]},s.code)})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[11px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"=========================================="}),t.jsxs("div",{className:"mt-1",children:[t.jsxs("div",{className:"bg-white text-black p-1.5 flex justify-between items-center border-2 border-black",children:[t.jsxs("div",{children:[t.jsx("div",{className:"text-[9px] font-black text-black uppercase tracking-widest",children:"TOTAL FACTURADO"}),t.jsx("div",{className:"text-[14px] font-black",children:"VENTAS BRUTAS:"})]}),t.jsx("div",{className:"text-[16px] font-black text-black",children:r(C)})]}),t.jsxs("div",{className:"border-t-[1.5px] border-b-[1.5px] border-black py-1.5 my-1.5 space-y-0.5 text-[12px] font-black text-black",children:[t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{children:"TOTAL CUENTAS:"}),t.jsx("span",{className:"font-black",children:m})]}),t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{children:"TICKET PROMEDIO:"}),t.jsx("span",{className:"font-black",children:r(v)})]}),w>0&&t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{children:"DESCUENTOS APLICADOS:"}),t.jsxs("span",{className:"font-black",children:["-",r(w)]})]}),A>0&&t.jsxs("div",{className:"flex justify-between",children:[t.jsx("span",{children:"PROPINAS RECIBIDAS:"}),t.jsxs("span",{className:"font-black",children:["+",r(A)]})]})]}),t.jsx("div",{className:"text-center font-black tracking-tighter text-[10px] text-black my-1 select-none overflow-hidden whitespace-nowrap",children:"------------------------------------------"}),t.jsx("div",{className:"mt-1 text-[10px] font-bold leading-tight text-center text-black pt-1",children:i})]})]})})]})})}export{bt as S,lt as p};

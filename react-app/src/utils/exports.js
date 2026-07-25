import * as XLSX from 'xlsx';

// ============================================================
// HELPERS
// ============================================================

function colLetter(colIdx) {
  let letters = '';
  colIdx++;
  while (colIdx > 0) {
    colIdx--;
    letters = String.fromCharCode(65 + (colIdx % 26)) + letters;
    colIdx = Math.floor(colIdx / 26);
  }
  return letters;
}

function cellAddr(row, col) {
  return `${colLetter(col)}${row}`;
}

// ============================================================
// STYLE HELPERS
// ============================================================

const S = {
  // Dark blue header style
  header() {
    return {
      bold: true,
      fontSize: 11,
      fontName: 'Calibri',
      alignment: { horizontal: 'center', vertical: 'center' },
      color: { rgb: 'FFFFFF' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
      border: {
        top:    { style: 'thin', color: { rgb: '1E3A5F' } },
        bottom: { style: 'thin', color: { rgb: '1E3A5F' } },
        left:   { style: 'thin', color: { rgb: '1E3A5F' } },
        right:  { style: 'thin', color: { rgb: '1E3A5F' } },
      },
    };
  },

  // Data cell — light zebra stripe
  data(alt) {
    return {
      fontSize: 10,
      fontName: 'Calibri',
      alignment: { horizontal: 'left', vertical: 'center' },
      color: { rgb: '111827' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: alt ? 'F3F4F6' : 'FFFFFF' } },
      border: {
        top:    { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left:   { style: 'thin', color: { rgb: 'D1D5DB' } },
        right:  { style: 'thin', color: { rgb: 'D1D5DB' } },
      },
    };
  },

  // Data cell — right aligned (money)
  dataMoney(alt) {
    return {
      fontSize: 10,
      fontName: 'Calibri',
      alignment: { horizontal: 'right', vertical: 'center' },
      color: { rgb: '111827' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: alt ? 'F3F4F6' : 'FFFFFF' } },
      border: {
        top:    { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left:   { style: 'thin', color: { rgb: 'D1D5DB' } },
        right:  { style: 'thin', color: { rgb: 'D1D5DB' } },
      },
    };
  },

  // Data cell — center aligned
  dataCenter(alt) {
    return {
      fontSize: 10,
      fontName: 'Calibri',
      alignment: { horizontal: 'center', vertical: 'center' },
      color: { rgb: '111827' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: alt ? 'F3F4F6' : 'FFFFFF' } },
      border: {
        top:    { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left:   { style: 'thin', color: { rgb: 'D1D5DB' } },
        right:  { style: 'thin', color: { rgb: 'D1D5DB' } },
      },
    };
  },

  // Subtotal row (gray background)
  subtotal(label) {
    return {
      bold: true,
      fontSize: 10,
      fontName: 'Calibri',
      alignment: { horizontal: 'left', vertical: 'center' },
      color: { rgb: '111827' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'E5E7EB' } },
      border: {
        top:    { style: 'medium', color: { rgb: '374151' } },
        bottom: { style: 'medium', color: { rgb: '374151' } },
        left:   { style: 'thin',   color: { rgb: 'D1D5DB' } },
        right:  { style: 'thin',   color: { rgb: 'D1D5DB' } },
      },
    };
  },

  subtotalMoney() {
    return {
      bold: true,
      fontSize: 10,
      fontName: 'Calibri',
      alignment: { horizontal: 'right', vertical: 'center' },
      color: { rgb: '111827' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'E5E7EB' } },
      border: {
        top:    { style: 'medium', color: { rgb: '374151' } },
        bottom: { style: 'medium', color: { rgb: '374151' } },
        left:   { style: 'thin',   color: { rgb: 'D1D5DB' } },
        right:  { style: 'thin',   color: { rgb: 'D1D5DB' } },
      },
    };
  },

  subtotalCenter() {
    return {
      bold: true,
      fontSize: 10,
      fontName: 'Calibri',
      alignment: { horizontal: 'center', vertical: 'center' },
      color: { rgb: '111827' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'E5E7EB' } },
      border: {
        top:    { style: 'medium', color: { rgb: '374151' } },
        bottom: { style: 'medium', color: { rgb: '374151' } },
        left:   { style: 'thin',   color: { rgb: 'D1D5DB' } },
        right:  { style: 'thin',   color: { rgb: 'D1D5DB' } },
      },
    };
  },

  // Grand total row (dark blue, white text)
  grandTotal(label) {
    return {
      bold: true,
      fontSize: 12,
      fontName: 'Calibri',
      alignment: { horizontal: 'left', vertical: 'center' },
      color: { rgb: 'FFFFFF' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
      border: {
        top:    { style: 'medium', color: { rgb: 'FFFFFF' } },
        bottom: { style: 'medium', color: { rgb: 'FFFFFF' } },
        left:   { style: 'thin',   color: { rgb: 'FFFFFF' } },
        right:  { style: 'thin',   color: { rgb: 'FFFFFF' } },
      },
    };
  },

  grandTotalMoney() {
    return {
      bold: true,
      fontSize: 12,
      fontName: 'Calibri',
      alignment: { horizontal: 'right', vertical: 'center' },
      color: { rgb: 'FFFFFF' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
      border: {
        top:    { style: 'medium', color: { rgb: 'FFFFFF' } },
        bottom: { style: 'medium', color: { rgb: 'FFFFFF' } },
        left:   { style: 'thin',   color: { rgb: 'FFFFFF' } },
        right:  { style: 'thin',   color: { rgb: 'FFFFFF' } },
      },
    };
  },

  grandTotalCenter() {
    return {
      bold: true,
      fontSize: 12,
      fontName: 'Calibri',
      alignment: { horizontal: 'center', vertical: 'center' },
      color: { rgb: 'FFFFFF' },
      fill: { type: 'pattern', patternType: 'solid', fgColor: { rgb: '1E3A5F' } },
      border: {
        top:    { style: 'medium', color: { rgb: 'FFFFFF' } },
        bottom: { style: 'medium', color: { rgb: 'FFFFFF' } },
        left:   { style: 'thin',   color: { rgb: 'FFFFFF' } },
        right:  { style: 'thin',   color: { rgb: 'FFFFFF' } },
      },
    };
  },

  title() {
    return {
      bold: true,
      fontSize: 18,
      fontName: 'Calibri',
      alignment: { horizontal: 'center' },
      color: { rgb: '1E3A5F' },
    };
  },

  subtitle() {
    return {
      fontSize: 10,
      fontName: 'Calibri',
      alignment: { horizontal: 'center' },
      color: { rgb: '6B7280' },
    };
  },
};

// ============================================================
// EXTRACT PLAIN VALUES
// ============================================================
function extractValue(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'object' && cell !== null) return (cell.value !== undefined ? cell.value : '');
  return cell;
}

function extractType(cell) {
  if (typeof cell === 'object' && cell !== null) return (cell.type || 'text');
  return 'text';
}

// ============================================================
// BUILD AOA (array of arrays) + APPLY STYLES
// ============================================================
function buildSheet(sheetDef) {
  const { title, subtitle, headers, rows, totals, grandTotals } = sheetDef;

  // Collect all rows as plain arrays (for aoa_to_sheet)
  const aoa = [];
  const merges = [];
  const styles = {}; // keyed by "row,col"
  const numFmts = {}; // keyed by "row,col"
  let rowNum = 1;

  // Title
  if (title) {
    aoa.push([title]);
    const titleEndCol = (headers?.length || 1) - 1;
    if (titleEndCol > 0) {
      merges.push({ s: { r: rowNum - 1, c: 0 }, e: { r: rowNum - 1, c: titleEndCol } });
    }
    styles[`${rowNum},0`] = S.title();
    rowNum++;
  }

  // Subtitle
  if (subtitle) {
    aoa.push([subtitle]);
    const subEndCol = (headers?.length || 1) - 1;
    if (subEndCol > 0) {
      merges.push({ s: { r: rowNum - 1, c: 0 }, e: { r: rowNum - 1, c: subEndCol } });
    }
    styles[`${rowNum},0`] = S.subtitle();
    rowNum++;
  }

  // Spacer
  if (title || subtitle) {
    aoa.push([]);
    rowNum++;
  }

  // Header row
  if (headers?.length) {
    aoa.push(headers.map(h => {
      if (typeof h === 'object') return (h.label || '');
      return h;
    }));
    for (let c = 0; c < headers.length; c++) {
      styles[`${rowNum},${c}`] = S.header();
    }
    rowNum++;
  }

  // Data rows
  if (rows?.length) {
    rows.forEach((row, ri) => {
      const alt = ri % 2 === 1;
      const rowArr = [];
      row.forEach((cell) => {
        const raw = extractValue(cell);
        const type = extractType(cell);
        if (typeof raw === 'number') {
          rowArr.push(raw);
        } else {
          rowArr.push(raw === null || raw === undefined ? '' : String(raw));
        }
        const colIdx = rowArr.length - 1;
        const key = `${rowNum},${colIdx}`;
        if (type === 'money') {
          styles[key] = S.dataMoney(alt);
          numFmts[key] = '"Q"#,##0.00';
        } else if (type === 'center' || type === 'boldCenter') {
          styles[key] = S.dataCenter(alt);
        } else if (type === 'bold') {
          styles[key] = {
            ...S.data(alt),
            bold: true,
          };
        } else {
          styles[key] = S.data(alt);
        }
      });
      aoa.push(rowArr);
      rowNum++;
    });
  }

  // Subtotals
  if (totals?.length) {
    aoa.push([]); // spacer
    rowNum++;
    aoa.push(totals.map(cell => extractValue(cell)));
    for (let c = 0; c < totals.length; c++) {
      const raw = extractValue(totals[c]);
      const type = extractType(totals[c]);
      const key = `${rowNum},${c}`;
      if (type === 'money') {
        styles[key] = S.subtotalMoney();
        numFmts[key] = '"Q"#,##0.00';
      } else if (type === 'center' || type === 'boldCenter') {
        styles[key] = S.subtotalCenter();
      } else {
        styles[key] = S.subtotal(raw);
      }
    }
    rowNum++;
  }

  // Grand totals
  if (grandTotals?.length) {
    aoa.push([]); // spacer
    rowNum++;
    aoa.push(grandTotals.map(cell => extractValue(cell)));
    for (let c = 0; c < grandTotals.length; c++) {
      const raw = extractValue(grandTotals[c]);
      const type = extractType(grandTotals[c]);
      const key = `${rowNum},${c}`;
      if (type === 'money') {
        styles[key] = S.grandTotalMoney();
        numFmts[key] = '"Q"#,##0.00';
      } else if (type === 'center' || type === 'boldCenter') {
        styles[key] = S.grandTotalCenter();
      } else {
        styles[key] = S.grandTotal(raw);
      }
    }
    rowNum++;
  }

  // Build with aoa_to_sheet (creates all cells)
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Apply styles to all existing cells
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const key = `${R + 1},${C}`;
      const addr = cellAddr(R + 1, C);
      if (ws[addr] && styles[key]) {
        ws[addr].s = styles[key];
      }
      if (ws[addr] && numFmts[key]) {
        ws[addr].z = numFmts[key];
      }
    }
  }

  // Apply merges
  if (merges.length) {
    ws['!merges'] = merges;
  }

  // Column widths
  if (headers?.length) {
    ws['!cols'] = headers.map(h => {
      const w = typeof h === 'object' ? (h.width || 12) : 12;
      return { wch: w };
    });
  }

  return ws;
}

// ============================================================
// EXPORT TO EXCEL (.xlsx)
// ============================================================
export function exportToExcel({ sheets }) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ name, title, subtitle, headers, rows, totals, grandTotals }) => {
    const ws = buildSheet({ title, subtitle, headers, rows, totals, grandTotals });
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });

  const fileName = `${sheets[0].name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ============================================================
// EXPORT TO PDF (print via browser)
// ============================================================
export function exportToPDF({ title, subtitle, tables }) {
  let tablesHTML = '';

  tables.forEach(({ headers, rows, totals, grandTotals, sectionTitle }) => {
    if (sectionTitle) {
      tablesHTML += `<div class="section-title">${sectionTitle}</div>`;
    }

    tablesHTML += '<table>';

    // Header
    tablesHTML += '<thead><tr>';
    headers.forEach(h => {
      tablesHTML += `<th>${typeof h === 'object' ? (h.label || '') : h}</th>`;
    });
    tablesHTML += '</tr></thead>';

    // Body
    tablesHTML += '<tbody>';
    rows.forEach((row, rowIdx) => {
      const altClass = rowIdx % 2 === 1 ? ' class="alt"' : '';
      tablesHTML += `<tr${altClass}>`;
      row.forEach(cell => {
        const rawCell = cell?.value !== undefined ? cell.value : cell;
        const cellType = cell?.type;
        let cls = '';
        if (cellType === 'money') { cls = 'money'; }
        else if (cellType === 'center') { cls = 'center'; }
        else if (cellType === 'bold') { cls = 'bold'; }
        tablesHTML += `<td class="${cls}">${rawCell}</td>`;
      });
      tablesHTML += '</tr>';
    });
    tablesHTML += '</tbody>';

    // Totals
    if (totals && totals.length) {
      tablesHTML += '<tbody><tr class="total-row">';
      totals.forEach(cell => {
        const rawCell = cell?.value !== undefined ? cell.value : cell;
        const cellType = cell?.type;
        const cls = cellType === 'money' ? 'money' : cellType === 'center' ? 'center' : '';
        tablesHTML += `<td class="${cls}">${rawCell}</td>`;
      });
      tablesHTML += '</tr></tbody>';
    }

    // Grand totals
    if (grandTotals && grandTotals.length) {
      tablesHTML += '<tbody><tr class="grand-total">';
      grandTotals.forEach(cell => {
        const rawCell = cell?.value !== undefined ? cell.value : cell;
        const cellType = cell?.type;
        const cls = cellType === 'money' ? 'money' : cellType === 'center' ? 'center' : '';
        tablesHTML += `<td class="${cls}">${rawCell}</td>`;
      });
      tablesHTML += '</tr></tbody>';
    }

    tablesHTML += '</table>';
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 11px; color: #111827; background: #fff; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 3px solid #1E3A5F; }
    .header h1 { font-size: 20px; font-weight: 700; color: #1E3A5F; margin-bottom: 4px; }
    .header .subtitle { font-size: 11px; color: #6B7280; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; page-break-inside: auto; }
    thead tr th {
      background: #1E3A5F; color: #fff;
      padding: 7px 10px; font-size: 10px; font-weight: 700;
      text-align: left; border: 1px solid #1E3A5F;
    }
    tbody tr td {
      padding: 6px 10px; border: 1px solid #D1D5DB; font-size: 10px;
    }
    tbody tr.alt td { background: #F9FAFB; }
    tbody tr:hover td { background: #EFF6FF !important; }
    tbody tr td.money { text-align: right; }
    tbody tr td.center { text-align: center; }
    tbody tr td.bold { font-weight: 700; }
    tbody tr.total-row td {
      background: #F3F4F6; font-weight: 700;
      border-top: 2px solid #374151;
    }
    tbody tr.total-row td.money { text-align: right; }
    tbody tr.total-row td.center { text-align: center; }
    tbody tr.grand-total td {
      background: #1E3A5F; color: #fff; font-weight: 700; font-size: 11px;
      border: 2px solid #1E3A5F;
    }
    tbody tr.grand-total td.money { text-align: right; }
    tbody tr.grand-total td.center { text-align: center; }
    .section-title {
      font-size: 13px; font-weight: 700; color: #374151;
      margin: 18px 0 6px; padding-left: 8px;
      border-left: 4px solid #1E3A5F;
    }
    .footer {
      text-align: center; color: #9CA3AF; font-size: 9px;
      margin-top: 16px; padding-top: 10px; border-top: 1px solid #E5E7EB;
    }
    @media print {
      body { padding: 8px; }
      .section-title { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  </div>
  ${tablesHTML}
  <div class="footer">
    Generado el ${new Date().toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' })} &middot; SamaPos
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Permite ventanas emergentes para imprimir'); return; }
  win.document.write(html);
  win.document.close();
}

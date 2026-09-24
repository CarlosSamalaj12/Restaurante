const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../react-app/src/pages/Reports.jsx');
const outDir = path.join(__dirname, '../react-app/src/components/reports');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const lines = fs.readFileSync(srcPath, 'utf8').split('\n');

function getSlice(start1Based, end1Based) {
  return lines.slice(start1Based - 1, end1Based).join('\n');
}

const allLucideIcons = [
  'ArrowLeft', 'Loader2', 'AlertTriangle', 'Receipt', 'Clock', 'Printer',
  'FileText', 'Package', 'CheckCircle', 'XCircle', 'Search', 'ShoppingCart',
  'Building2', 'CreditCard', 'Hash', 'Download', 'FileSpreadsheet', 'Users'
];

function buildReportCode(exportedFnName, codeBlock) {
  const combined = codeBlock;

  // React hooks
  const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'].filter(h =>
    new RegExp(`\\b${h}\\b`).test(combined)
  );

  // api
  const usesApi = /\bapi\b/.test(combined);

  // useToast
  const usesToast = /\buseToast\b/.test(combined);

  // framer-motion m
  const usesM = /<m\./.test(combined);

  // exports
  const usesExportToExcel = /\bexportToExcel\b/.test(combined);
  const usesExportToPDF = /\bexportToPDF\b/.test(combined);

  // Lucide icons
  const usedIcons = allLucideIcons.filter(icon => {
    return new RegExp(`<${icon}\\b`).test(combined) || new RegExp(`\\bicon:\\s*${icon}\\b`).test(combined);
  });

  const imports = [];
  if (reactHooks.length > 0) {
    imports.push(`import { ${reactHooks.join(', ')} } from 'react';`);
  } else {
    imports.push(`import React from 'react';`);
  }

  if (usesM) {
    imports.push(`import { m } from 'framer-motion';`);
  }

  if (usesApi) {
    imports.push(`import api from '../../api';`);
  }

  if (usesToast) {
    imports.push(`import { useToast } from '../../hooks/useToast';`);
  }

  const exportFns = [];
  if (usesExportToExcel) exportFns.push('exportToExcel');
  if (usesExportToPDF) exportFns.push('exportToPDF');
  if (exportFns.length > 0) {
    imports.push(`import { ${exportFns.join(', ')} } from '../../utils/exports';`);
  }

  if (usedIcons.length > 0) {
    imports.push(`import {\n  ${usedIcons.join(',\n  ')}\n} from 'lucide-react';`);
  }

  let modifiedCode = combined;
  const fnRegex = new RegExp(`^function ${exportedFnName}\\b`, 'm');
  if (fnRegex.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(fnRegex, `export function ${exportedFnName}`);
  }

  return `${imports.join('\n')}\n\n${modifiedCode}\n`;
}

const reports = [
  {
    file: 'VoidedReportPage.jsx',
    fn: 'VoidedReportPage',
    block: getSlice(184, 423)
  },
  {
    file: 'TipsReportPage.jsx',
    fn: 'TipsReportPage',
    block: getSlice(424, 758)
  },
  {
    file: 'ProductSalesReportPage.jsx',
    fn: 'ProductSalesReportPage',
    block: getSlice(759, 1083)
  },
  {
    file: 'PaymentMethodReportPage.jsx',
    fn: 'PaymentMethodReportPage',
    block: getSlice(1084, 1388)
  },
  {
    file: 'SalesByCenterReportPage.jsx',
    fn: 'SalesByCenterReportPage',
    block: getSlice(1389, 1954)
  },
  {
    file: 'SalesByUserReportPage.jsx',
    fn: 'SalesByUserReportPage',
    block: getSlice(1955, 2578)
  }
];

for (const rep of reports) {
  const content = buildReportCode(rep.fn, rep.block);
  const targetPath = path.join(outDir, rep.file);
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`Generated ${rep.file} (${content.split('\n').length} lines)`);
}

console.log('Reports extraction complete!');

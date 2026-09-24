const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../react-app/src/pages/CXC.jsx');
const outDir = path.join(__dirname, '../react-app/src/components/cxc');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const lines = fs.readFileSync(srcPath, 'utf8').split('\n');

function getSlice(start1Based, end1Based) {
  return lines.slice(start1Based - 1, end1Based).join('\n');
}

const allLucideIcons = [
  'ArrowLeft', 'Plus', 'Loader2', 'Users', 'DollarSign', 'Search',
  'X', 'ChevronRight', 'CreditCard', 'Wallet', 'FileText', 'Download', 'Printer'
];

function buildCxcCode(exportedFnName, codeBlocks) {
  const combined = codeBlocks.join('\n\n');

  const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'].filter(h =>
    new RegExp(`\\b${h}\\b`).test(combined)
  );

  const usesApi = /\bapi\b/.test(combined);
  const usesToast = /\buseToast\b/.test(combined);
  const usesAuth = /\buseAuth\b/.test(combined);
  const usesM = /<m\./.test(combined);
  const usesAnimatePresence = /<AnimatePresence\b/.test(combined);

  const usedIcons = allLucideIcons.filter(icon => {
    return new RegExp(`<${icon}\\b`).test(combined) || new RegExp(`\\bicon:\\s*${icon}\\b`).test(combined);
  });

  const imports = [];
  if (reactHooks.length > 0) {
    imports.push(`import { ${reactHooks.join(', ')} } from 'react';`);
  } else {
    imports.push(`import React from 'react';`);
  }

  const framerItems = [];
  if (usesM) framerItems.push('m');
  if (usesAnimatePresence) framerItems.push('AnimatePresence');
  if (framerItems.length > 0) {
    imports.push(`import { ${framerItems.join(', ')} } from 'framer-motion';`);
  }

  if (usesApi) {
    imports.push(`import api from '../../api';`);
  }

  if (usesToast) {
    imports.push(`import { useToast } from '../../hooks/useToast';`);
  }

  if (usesAuth) {
    imports.push(`import { useAuth } from '../../hooks/useAuth';`);
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

const cxcModules = [
  {
    file: 'ClientsTab.jsx',
    fn: 'ClientsTab',
    blocks: [getSlice(151, 409)]
  },
  {
    file: 'PendingTab.jsx',
    fn: 'PendingTab',
    blocks: [getSlice(410, 454)]
  },
  {
    file: 'AreasTab.jsx',
    fn: 'AreasTab',
    blocks: [getSlice(455, 546)]
  },
  {
    file: 'AccountDetailModal.jsx',
    fn: 'AccountDetailModal',
    blocks: [getSlice(547, 825)]
  },
  {
    file: 'GlobalPayModal.jsx',
    fn: 'GlobalPayModal',
    blocks: [getSlice(826, 986)]
  },
  {
    file: 'StatementModal.jsx',
    fn: 'StatementModal',
    blocks: [getSlice(987, 1306)]
  },
  {
    file: 'PendingSummaryModal.jsx',
    fn: 'PendingSummaryModal',
    blocks: [getSlice(1307, 1559)]
  }
];

for (const mod of cxcModules) {
  const content = buildCxcCode(mod.fn, mod.blocks);
  const targetPath = path.join(outDir, mod.file);
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`Generated ${mod.file} (${content.split('\n').length} lines)`);
}

console.log('CXC extraction complete!');

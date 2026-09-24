const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../react-app/src/pages/Settings.jsx');
const outDir = path.join(__dirname, '../react-app/src/components/settings');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const lines = fs.readFileSync(srcPath, 'utf8').split('\n');

function getSlice(start1Based, end1Based) {
  return lines.slice(start1Based - 1, end1Based).join('\n');
}

const allLucideIcons = [
  'ArrowLeft', 'ChevronRight', 'Loader2', 'Plus', 'Edit', 'Trash2',
  'Check', 'X', 'Package', 'LayoutGrid', 'Users', 'CreditCard',
  'Settings', 'Save', 'Monitor', 'List', 'Shield', 'Store', 'Key', 'Printer'
];

function buildModuleCode(exportedFnName, codeBlocks) {
  const combined = codeBlocks.join('\n\n');

  // Detect which hooks are used
  const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'].filter(h =>
    new RegExp(`\\b${h}\\b`).test(combined)
  );

  // Detect if api is used
  const usesApi = /\bapi\b/.test(combined);

  // Detect if useToast is used
  const usesToast = /\buseToast\b/.test(combined);

  // Detect if framer-motion m is used
  const usesM = /<m\./.test(combined);

  // Detect which lucide icons are used
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

  if (usedIcons.length > 0) {
    imports.push(`import {\n  ${usedIcons.join(',\n  ')}\n} from 'lucide-react';`);
  }

  // Ensure exportedFnName is exported
  let modifiedCode = combined;
  const fnRegex = new RegExp(`^function ${exportedFnName}\\b`, 'm');
  if (fnRegex.test(modifiedCode)) {
    modifiedCode = modifiedCode.replace(fnRegex, `export function ${exportedFnName}`);
  }

  return `${imports.join('\n')}\n\n${modifiedCode}\n`;
}

const sections = [
  {
    file: 'ProductsSection.jsx',
    fn: 'ProductsSection',
    blocks: [
      getSlice(228, 1009) // ProductsSection + ProductWizardModal
    ]
  },
  {
    file: 'CategoriesSection.jsx',
    fn: 'CategoriesSection',
    blocks: [
      getSlice(1010, 1272)
    ]
  },
  {
    file: 'CentersSection.jsx',
    fn: 'CentersSection',
    blocks: [
      getSlice(1273, 1397),
      getSlice(2570, 2681) // CenterWizardModal
    ]
  },
  {
    file: 'ProductionCentersSection.jsx',
    fn: 'ProductionCentersSection',
    blocks: [
      getSlice(1398, 1742) // ProductionCentersSection + ProductionCenterWizardModal
    ]
  },
  {
    file: 'TerminalsSection.jsx',
    fn: 'TerminalsSection',
    blocks: [
      getSlice(1743, 1919),
      getSlice(2438, 2569) // TerminalWizardModal
    ]
  },
  {
    file: 'PrintersDiagnosticSection.jsx',
    fn: 'PrintersDiagnosticSection',
    blocks: [
      getSlice(1920, 2044)
    ]
  },
  {
    file: 'ModifiersSection.jsx',
    fn: 'ModifiersSection',
    blocks: [
      getSlice(2045, 2437) // ModifiersSection + ModifierGroupWizard
    ]
  },
  {
    file: 'TablesSection.jsx',
    fn: 'TablesSection',
    blocks: [
      getSlice(2682, 3033) // TablesSection + TableWizardModal
    ]
  },
  {
    file: 'UsersSection.jsx',
    fn: 'UsersSection',
    blocks: [
      getSlice(3034, 3128),
      getSlice(3481, 3693), // UserWizardModal
      getSlice(3694, 3777)  // EditUserModal
    ]
  },
  {
    file: 'RolesSection.jsx',
    fn: 'RolesSection',
    blocks: [
      getSlice(3129, 3318),
      getSlice(3319, 3396), // CreateRoleModal
      getSlice(3397, 3480)  // AssignUsersModal
    ]
  },
  {
    file: 'PaymentsSection.jsx',
    fn: 'PaymentsSection',
    blocks: [
      getSlice(3778, 3810)
    ]
  },
  {
    file: 'SystemSection.jsx',
    fn: 'SystemSection',
    blocks: [
      getSlice(3811, 4163) // resizeImage + SystemSection
    ]
  }
];

for (const sec of sections) {
  const content = buildModuleCode(sec.fn, sec.blocks);
  const targetPath = path.join(outDir, sec.file);
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log(`Generated ${sec.file} (${content.split('\n').length} lines)`);
}

console.log('Extraction complete!');

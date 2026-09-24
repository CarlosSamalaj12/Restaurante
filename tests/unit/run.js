#!/usr/bin/env node
/**
 * Cross-platform wrapper for `node --test tests/unit/`.
 *
 * The built-in `node --test` doesn't recurse into a directory path on all
 * versions, so this wrapper collects all *.test.js files and runs them.
 *
 * Usage:  node tests/unit/run.js
 */

'use strict';

const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const unitDir = join(__dirname);
const files = readdirSync(unitDir)
  .filter((f) => f.endsWith('.test.js'))
  .sort()
  .map((f) => join(unitDir, f));

if (files.length === 0) {
  console.error('No test files found in', unitDir);
  process.exit(2);
}

console.log(`Running ${files.length} test file(s):`);
for (const f of files) console.log('  -', f);
console.log('');

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);

/**
 * Derive the mini program's lib/ from src/, converting ES modules to CommonJS.
 *
 * The point is that src/ stays the single source of truth. Hand-copying the logic into the
 * mini program would create two copies that drift, and the next bug would get fixed on one
 * side only — exactly the failure mode that makes "we also have a mini program" expensive.
 *
 * Safe because src/ modules are flat (no module imports one another) and only use `export`
 * on declarations. Both facts are asserted, so a future edit that breaks the assumption fails
 * the build instead of silently shipping a half-converted file.
 *
 *   node tools/build-mp.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'mp', 'lib');

const MODULES = ['src/schema.mjs', 'src/import-weread.mjs', 'src/review.mjs'];

mkdirSync(OUT, { recursive: true });

let total = 0;
for (const rel of MODULES) {
  const src = readFileSync(join(ROOT, rel), 'utf8');

  if (/^\s*import\s/m.test(src)) {
    throw new Error(`${rel} imports another module; build-mp.mjs assumes a flat graph`);
  }
  if (/^\s*export\s+default/m.test(src)) {
    throw new Error(`${rel} has a default export; only named exports convert cleanly`);
  }
  if (/^\s*export\s*\{/m.test(src)) {
    throw new Error(`${rel} uses an export list; declare exports inline instead`);
  }

  // collect the exported names before stripping the keyword
  const names = [...src.matchAll(/^\s*export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)]
    .map((m) => m[1]);
  if (!names.length) throw new Error(`${rel} exports nothing`);

  const body = src.replace(/^(\s*)export\s+/gm, '$1');
  const out = `${body.trimEnd()}\n\nmodule.exports = { ${names.join(', ')} };\n`;

  const name = basename(rel).replace(/\.mjs$/, '.js');
  writeFileSync(join(OUT, name), out, 'utf8');
  console.log(`${rel}  ->  mp/lib/${name}   (${names.length} exports: ${names.join(', ')})`);
  total += names.length;
}
console.log(`\n${MODULES.length} modules, ${total} exports. src/ remains the only source of truth.`);

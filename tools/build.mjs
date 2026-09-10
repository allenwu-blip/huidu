/**
 * Bundle the app into one self-contained HTML file at dist/index.html.
 *
 * Why hand-rolled instead of a bundler: every module here is flat — none of them import each
 * other, only index.html imports them — so "strip `export`, concatenate, drop the import lines"
 * is complete and provably correct. Adding a build toolchain would be more moving parts than
 * the thing it builds. The script asserts the flatness rather than assuming it.
 *
 *   node tools/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
// GitHub Pages serves the repo's /docs folder with no Actions workflow and no second branch.
// The landing page owns the root (that is what people link to); the app lives one level down
// so its service worker scope (/huidu/app/) cannot intercept the landing.
const DOCS = join(ROOT, 'docs');
const DIST = join(DOCS, 'app');
const LANDING = join(ROOT, 'landing');

const MODULES = [
  'src/schema.mjs',
  'src/import-weread.mjs',
  'src/review.mjs',
  'app/store.mjs',
  'app/ui.mjs',
];

function read(p) {
  return readFileSync(join(ROOT, p), 'utf8');
}

// 1. sanity: the concatenate-and-strip trick is only valid while no module imports another
for (const m of MODULES) {
  const src = read(m);
  const bad = src.match(/^\s*import\s/m);
  if (bad) throw new Error(`${m} has an import; tools/build.mjs assumes a flat module graph`);
}

// 2. strip the `export` keyword — everything ends up in one shared scope
const stripExport = (src) =>
  src
    .replace(/^\s*export\s+(?=(const|let|var|function|class|async))/gm, '')
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '');

const bundled = MODULES.map((m) => `/* ── ${m} ─────────────── */\n${stripExport(read(m)).trim()}`).join(
  '\n\n',
);

// 3. the page: drop its import lines, they are satisfied by the bundle above
const html = read('app/index.html');
const scriptRe = /<script type="module">([\s\S]*?)<\/script>/;
const found = html.match(scriptRe);
if (!found) throw new Error('app/index.html: could not find the module script');
// Aliased imports (`import { stats as calcStats }`) cannot just be deleted: the bundle defines
// `stats`, and the page calls `calcStats`. Each alias becomes a local binding instead.
const aliases = [];
let appCode = found[1].replace(/^[ \t]*import\s+\{([^}]*)\}\s+from\s+[^;]+;[ \t]*$/gm, (_, names) => {
  for (const part of names.split(',')) {
    const m = part.trim().match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
    if (m) aliases.push(`const ${m[2]} = ${m[1]};`);
  }
  return '';
});
if (/^[ \t]*import\s+(?!\{)/m.test(appCode)) {
  throw new Error('app/index.html uses a default or namespace import; the bundler only handles named ones');
}
appCode = (aliases.length ? `/* aliased imports */\n${aliases.join('\n')}\n\n` : '') + appCode.trim();

// 4. the bookmarklet is fetched at runtime; inline it so dist has no side files
const bletPath = join(ROOT, 'app', 'bookmarklet.txt');
if (!existsSync(bletPath)) throw new Error('run node tools/build-bookmarklet.mjs first');
const blet = readFileSync(bletPath, 'utf8').trim();

const inlined = appCode.replace(
  /let blet = '';\s*try \{[\s\S]*?\} catch \{\}/,
  `const blet = ${JSON.stringify(blet)};`,
);
if (inlined === appCode) throw new Error('bookmarklet fetch block not found — did drawImport change?');

const out = html.replace(scriptRe, `<script type="module">\n${bundled}\n\n/* ── app ─────────────── */\n${inlined}\n</script>`);

mkdirSync(DIST, { recursive: true });
writeFileSync(join(DIST, 'index.html'), out, 'utf8');
// GitHub Pages runs Jekyll by default and would eat files starting with an underscore.
// Lives at the Pages root, not inside app/.
writeFileSync(join(DOCS, '.nojekyll'), '', 'utf8');

// 5. PWA files are static, so they are copied rather than bundled. They must sit beside
// index.html for the relative paths in the manifest and service worker to resolve.
let copied = 0;
for (const f of ['manifest.webmanifest', 'sw.js']) {
  const src = join(ROOT, 'app', f);
  if (!existsSync(src)) throw new Error(`missing ${f} — the app will not be installable`);
  copyFileSync(src, join(DIST, f));
  copied++;
}
const iconSrc = join(ROOT, 'app', 'icons');
if (!existsSync(iconSrc)) throw new Error('app/icons missing — run: python tools/make_icons.py');
mkdirSync(join(DIST, 'icons'), { recursive: true });
for (const f of readdirSync(iconSrc)) {
  copyFileSync(join(iconSrc, f), join(DIST, 'icons', f));
  copied++;
}
console.log(`copied   ${copied} static files (manifest, service worker, icons)`);

// 6. The landing page is plain static HTML: copied as-is, plus its screenshots.
const landingSrc = join(LANDING, 'index.html');
if (!existsSync(landingSrc)) throw new Error('landing/index.html missing');
copyFileSync(landingSrc, join(DOCS, 'index.html'));
const imgSrc = join(LANDING, 'img');
let imgs = 0;
if (existsSync(imgSrc)) {
  mkdirSync(join(DOCS, 'img'), { recursive: true });
  for (const f of readdirSync(imgSrc)) {
    copyFileSync(join(imgSrc, f), join(DOCS, 'img', f));
    imgs++;
  }
}
console.log(`landing  docs/index.html + ${imgs} image(s)`);

console.log(`modules  ${MODULES.length}`);
console.log(`bundle   ${(bundled.length / 1024).toFixed(1)} KB`);
console.log(`page     ${(out.length / 1024).toFixed(1)} KB  -> docs/app/index.html`);
// Must be anchored to line start: a loose /\bimport\s/ also matches the word in a comment,
// which made this warn on a perfectly good bundle.
const leftovers = out.replace(/<style>[\s\S]*?<\/style>/, '').match(/^\s*(import|export)\s+/gm);
if (leftovers) {
  console.log(`WARNING: ${leftovers.length} import/export statements survived the strip`);
  process.exitCode = 1;
} else {
  console.log('check    no module syntax left in the bundle');
}

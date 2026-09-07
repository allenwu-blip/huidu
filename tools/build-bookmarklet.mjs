/**
 * Turn tools/bookmarklet.js into the javascript: URL the import page hands out.
 *
 * Hand-rolled rather than pulling in a minifier: the source is small, and a build step with
 * zero dependencies is one less thing to break. It only strips comments and collapses
 * whitespace outside of strings, so it cannot mangle the Chinese literals.
 *
 *   node tools/build-bookmarklet.mjs          print size + write app/bookmarklet.txt
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(HERE, 'bookmarklet.js'), 'utf8');

/** Strip comments and collapse runs of whitespace, while never touching string contents. */
function squeeze(code) {
  let out = '';
  let i = 0;
  let quote = null; // current string delimiter, or null
  while (i < code.length) {
    const c = code[i];
    const n = code[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += code[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (/\s/.test(c)) {
      // keep exactly one space, and only where removing it would join two words
      const prev = out[out.length - 1] ?? '';
      let j = i;
      while (j < code.length && /\s/.test(code[j])) j++;
      const next = code[j] ?? '';
      if (/[\w$]/.test(prev) && /[\w$]/.test(next)) out += ' ';
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const squeezed = squeeze(src).trim();
const url = 'javascript:' + encodeURIComponent(squeezed);

writeFileSync(join(HERE, '..', 'app', 'bookmarklet.txt'), url, 'utf8');
console.log(`source   ${src.length} bytes`);
console.log(`squeezed ${squeezed.length} bytes`);
console.log(`url      ${url.length} bytes  -> app/bookmarklet.txt`);
if (url.length > 60000) console.log('WARNING: some browsers refuse very long bookmarklets');

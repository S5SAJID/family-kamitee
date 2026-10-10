#!/usr/bin/env node
/**
 * i18n checker.
 *   1. Every key in `en` exists in `ru` and vice versa (no silent English fallbacks).
 *   2. Every literal t('key') used in src/ exists in the dictionary.
 *   3. Every dynamic key family t(`prefix.${x}`) has at least one key with that prefix.
 *   4. Placeholders ({name}) are identical in en and ru for each key.
 * Run: npm run check:i18n
 */
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const i18n = readFileSync(join(ROOT, 'src/lib/i18n.ts'), 'utf8');

function dict(name, endMarker) {
  const start = i18n.indexOf(`const ${name}: Dict = {`);
  const end = i18n.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Could not find dictionary "${name}" in src/lib/i18n.ts`);
  const body = i18n.slice(start, end);
  const map = new Map();
  // key: 'value' | "value"  (keys may be bare identifiers or quoted)
  const re = /^\s+(?:'([^']+)'|([A-Za-z_][\w]*))\s*:\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")/gm;
  for (const m of body.matchAll(re)) map.set(m[1] ?? m[2], m[3] ?? m[4] ?? '');
  return map;
}

const en = dict('en', 'const ru');
const ru = dict('ru', 'const dicts');
const errors = [];

for (const k of en.keys()) if (!ru.has(k)) errors.push(`missing in ru: ${k}`);
for (const k of ru.keys()) if (!en.has(k)) errors.push(`missing in en: ${k}`);

const ph = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
for (const [k, v] of en) if (ru.has(k) && ph(v) !== ph(ru.get(k))) errors.push(`placeholder mismatch: ${k}  en{${ph(v)}} ru{${ph(ru.get(k))}}`);

function walk(dir) {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const sources = walk(join(ROOT, 'src')).filter(p => /\.tsx?$/.test(p) && !p.endsWith('i18n.ts'));
for (const file of sources) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) if (!en.has(m[1])) errors.push(`unknown key t('${m[1]}') in ${file.replace(ROOT + '/', '')}`);
  for (const m of src.matchAll(/\bt\(\s*`([\w.]+)\.\$\{/g)) {
    const prefix = m[1] + '.';
    if (![...en.keys()].some(k => k.startsWith(prefix))) errors.push(`no keys for dynamic family t(\`${prefix}\${…}\`) in ${file.replace(ROOT + '/', '')}`);
  }
}

if (errors.length) {
  console.error(errors.map(e => '✖ ' + e).join('\n'));
  console.error(`\n${errors.length} i18n problem(s). Add keys to BOTH en and ru in src/lib/i18n.ts.`);
  process.exit(1);
}
console.log(`✔ i18n: ${en.size} keys, en/ru in sync, all used keys exist.`);

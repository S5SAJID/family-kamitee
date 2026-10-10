#!/usr/bin/env node
/**
 * Project rule checker: enforces the "Strict rules" in docs/DEVELOPER_GUIDE.md.
 * Run: npm run check:rules   (also runs in CI on every push / PR)
 *
 * Each rule has a regex, the files it applies to, and an explicit allowlist.
 * If you really need an exception, add the file to `allow` WITH a comment
 * explaining why, and mention it in your PR.
 */
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, sep} from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(ROOT, 'src');

/** Generated files are never checked. */
const GENERATED = new Set(['src/astryx-themes.ts']);

const RULES = [
  {
    id: 'no-raw-layout-elements',
    why: 'Use Astryx components (Stack, Grid, Section, Text…) instead of raw <div>/<span>.',
    test: /<(div|span)[\s>]/,
    files: /\.tsx$/,
    allow: [],
  },
  {
    id: 'no-inline-style',
    why: 'Use component props, then className + tokens (src/styles/app.css). Inline style objects are not allowed.',
    test: /style=\{\{/,
    files: /\.tsx$/,
    // SVG illustration: colours are theme tokens (var(--color-*)); SVG has no component equivalent.
    allow: ['src/components/BallotBox.tsx'],
  },
  {
    id: 'no-hex-colors',
    why: 'Use semantic tokens: var(--color-*). Never hard-code hex colours.',
    test: /['"`(\s]#[0-9a-fA-F]{3,8}\b/,
    files: /\.(tsx?|css)$/,
    // Canvas cannot read CSS vars directly; hex values are ONLY fallbacks for getComputedStyle().
    allow: ['src/lib/receipt.ts'],
  },
  {
    id: 'no-math-random',
    why: 'Fairness: all randomness must come from secureRandomInt / secureShuffle (crypto.getRandomValues).',
    test: /Math\.random\s*\(/,
    files: /\.tsx?$/,
    // Audio noise synthesis only; never used for any decision.
    allow: ['src/lib/sound.ts'],
  },
  {
    id: 'storage-only-in-store',
    why: 'Persistence is owned by the Zustand store (src/lib/store.ts). Do not touch storage directly.',
    test: /\b(localStorage|sessionStorage|indexedDB)\b/,
    files: /\.tsx?$/,
    // Test setup provides an in-memory localStorage for Node.
    allow: ['src/lib/store.ts', 'src/test/setup.ts'],
  },
  {
    id: 'tauri-only-in-platform',
    why: 'All native APIs go through src/lib/platform.ts so the app also runs in a plain browser.',
    test: /@tauri-apps\//,
    files: /\.tsx?$/,
    allow: ['src/lib/platform.ts'],
  },
  {
    id: 'astryx-subpath-imports',
    why: "Import components from their subpath, e.g. '@astryxdesign/core/Button'.",
    test: /from\s+['"]@astryxdesign\/core['"]/,
    files: /\.tsx?$/,
    // <Theme> provider is only exported from the package root.
    allow: ['src/main.tsx'],
  },
  {
    id: 'no-xstyle',
    why: 'There is no StyleX compiler in this project; xstyle does nothing. Use props / className + tokens.',
    test: /\bxstyle\s*=/,
    files: /\.tsx$/,
    allow: [],
  },
  {
    id: 'no-any',
    why: 'Type it properly (or use unknown + narrowing).',
    test: /(:\s*any\b|\bas\s+any\b|<any>)/,
    files: /\.tsx?$/,
    allow: [],
  },
  {
    id: 'no-ts-suppressions',
    why: 'Fix the type error instead of suppressing it.',
    test: /@ts-(ignore|nocheck|expect-error)/,
    files: /\.tsx?$/,
    allow: [],
  },
  {
    id: 'no-console',
    why: 'No console output in shipped code. Surface problems to the user with Toast/Banner.',
    test: /\bconsole\.(log|debug|info|warn|error)\s*\(/,
    files: /\.tsx?$/,
    allow: [],
  },
  {
    id: 'no-network',
    why: 'The app is 100% offline. No fetch/XHR/WebSocket/remote URLs.',
    test: /\b(fetch\s*\(|XMLHttpRequest|new\s+WebSocket|EventSource)\b|['"`]https?:\/\/(?!wa\.me\/)/,
    files: /\.tsx?$/,
    allow: [],
  },
];

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(SRC).map(p => relative(ROOT, p).split(sep).join('/'));
let failures = 0;

for (const rule of RULES) {
  for (const file of files) {
    if (GENERATED.has(file) || !rule.files.test(file) || rule.allow.includes(file)) continue;
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      // Ignore comment lines so docs can mention forbidden things.
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (rule.test.test(line)) {
        failures++;
        console.error(`✖ [${rule.id}] ${file}:${i + 1}\n    ${trimmed}\n    → ${rule.why}`);
      }
    });
  }
}

if (failures) {
  console.error(`\n${failures} rule violation(s). See docs/DEVELOPER_GUIDE.md → "Strict rules".`);
  process.exit(1);
}
console.log(`✔ Project rules: ${RULES.length} rules, ${files.length} files, no violations.`);

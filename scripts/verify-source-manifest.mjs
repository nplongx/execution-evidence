#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'docs/source-manifest.json');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function walk(directory, prefix = '') {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'coverage') continue;
    if (relative === 'docs/source-manifest.json' || relative.endsWith('.tgz')) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute, relative));
    else if (entry.isFile()) output.push(relative);
    else throw new Error('unsupported source-manifest entry type: ' + relative);
  }
  return output;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files) || !manifest.files.length) {
  throw new Error('source manifest schema or file inventory is invalid');
}
const expected = walk(ROOT).sort();
const actual = manifest.files.map(entry => entry?.path).sort();
if (JSON.stringify(expected) !== JSON.stringify(actual)) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  throw new Error('source manifest inventory mismatch; missing=' +
    expected.filter(file => !actualSet.has(file)).join(',') +
    '; extra=' + actual.filter(file => !expectedSet.has(file)).join(','));
}
const seen = new Set();
for (const entry of manifest.files) {
  if (!entry || typeof entry.path !== 'string' || path.isAbsolute(entry.path) ||
      entry.path.split(/[\\/]/).includes('..') || !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !Number.isSafeInteger(entry.sizeBytes) || entry.sizeBytes < 0 || seen.has(entry.path)) {
    throw new Error('invalid source manifest entry: ' + String(entry?.path));
  }
  seen.add(entry.path);
  const bytes = fs.readFileSync(path.join(ROOT, entry.path));
  if (bytes.length !== entry.sizeBytes || digest(bytes) !== entry.sha256) {
    throw new Error('source manifest mismatch: ' + entry.path);
  }
}
for (const required of ['index.js','package.json','src/runtime/execution-verifier.js']) {
  if (!seen.has(required)) throw new Error('source manifest omits required file: ' + required);
}
console.log('Execution Evidence source manifest PASS: ' + manifest.files.length + ' pinned files');

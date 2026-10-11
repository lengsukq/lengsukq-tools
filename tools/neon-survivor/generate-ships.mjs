#!/usr/bin/env node
/**
 * Static HTML cannot enumerate public/ directories at runtime. Build a single
 * classic-script bundle from self-registering ship folders before dev/build.
 * Add `js/ships/<id>/ship.js` and `renderer.js` to add a ship; no HTML edits.
 *
 * Usage: node tools/neon-survivor/generate-ships.mjs [--check]
 */
import { readFile, readdir, lstat, rename, writeFile, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const base = join(project, 'public/Game/neon-survivor/js');
const shipsDir = join(base, 'ships');
const output = join(base, 'ships.generated.js');
const ID = /^[a-z][a-z0-9_]{0,31}$/;
const PRIORITY = ['ship.js', 'renderer.js', 'abilities.js', 'weapons.js', 'upgrades.js', 'warp.js', 'effects.js', 'network.js'];
const limit = 1024 * 1024;

export async function buildShipBundle(sourceDirectory = shipsDir, labelBase = base) {
  const shipFolders = (await readdir(sourceDirectory, { withFileTypes: true }))
    .filter(entry => !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  if (!shipFolders.length) throw new Error('No ships found');
  const sections = [];
  const ids = [];
  let totalBytes = 0;
  for (const folder of shipFolders) {
    if (!folder.isDirectory() || !ID.test(folder.name)) {
      throw new Error(`Invalid ship directory: ${folder.name}`);
    }
    const path = join(sourceDirectory, folder.name);
    const entries = (await readdir(path, { withFileTypes: true }))
      .filter(entry => !entry.name.startsWith('.'));
    if (entries.some(entry => !(
      (entry.isFile() && (/^[a-z][a-z0-9_-]*\.js$/.test(entry.name) || entry.name === 'README.md')) ||
      (entry.isDirectory() && entry.name === 'assets')
    ))) {
      throw new Error(`Only registered .js files, README.md and assets/ are allowed in ships/${folder.name}`);
    }
    const names = entries.filter(entry => entry.name.endsWith('.js')).map(entry => entry.name);
    for (const required of ['ship.js', 'renderer.js']) {
      if (!names.includes(required)) throw new Error(`Missing ships/${folder.name}/${required}`);
    }
    names.sort((a, b) => {
      const ai = PRIORITY.indexOf(a), bi = PRIORITY.indexOf(b);
      return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) || a.localeCompare(b, 'en');
    });
    for (const name of names) {
      const filename = join(path, name);
      if (!(await lstat(filename)).isFile()) throw new Error(`Invalid file type: ${filename}`);
      const source = await readFile(filename, 'utf8');
      totalBytes += Buffer.byteLength(source);
      if (totalBytes > limit) throw new Error('Ship bundle exceeds 1 MiB');
      const label = relative(labelBase, filename).replaceAll('\\', '/');
      try { new Script(source, { filename: label }); }
      catch (error) { throw new Error(`${label}: ${error.message}`); }
      sections.push(`// Source: ${label}\n${source.trimEnd()}\n`);
      if (name === 'ship.js') {
        sections.push(`if (!window.NeonShips?.get(${JSON.stringify(folder.name)})) { throw new Error(${JSON.stringify(`Ship ${folder.name} did not register itself`)}); }\n`);
      }
    }
    ids.push(folder.name);
  }
  return `/* GENERATED FILE – do not edit. Run npm run ships:generate. */\n` +
    `/* Registered folders: ${ids.join(', ')} */\n` +
    `window.NeonShipsManifest = Object.freeze(${JSON.stringify(ids)});\n` + sections.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const expected = await buildShipBundle();
if (process.argv.includes('--check')) {
  let current = '';
  try { current = await readFile(output, 'utf8'); } catch { /* missing */ }
  if (current !== expected) {
    console.error('Stale ship bundle. Run npm run ships:generate before deployment.');
    process.exitCode = 1;
  } else console.log('Ship bundle is current.');
} else {
  let current = '';
  try { current = await readFile(output, 'utf8'); } catch { /* missing */ }
  if (current !== expected) {
    const tmp = output + '.tmp';
    try { await writeFile(tmp, expected); await rename(tmp, output); }
    finally { await unlink(tmp).catch(() => {}); }
  }
  console.log(`Ship auto-registration ready: ${expected.match(/Registered folders: ([^*]*)/)[1].trim()}`);
}
}

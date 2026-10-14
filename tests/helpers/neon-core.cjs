/* Shared core-game loader for neon-survivor smoke tests.
 *
 * The core game used to be one 7,256-line js/core.js. It is now split across
 * js/core/*.js, loaded by index.html in a fixed order. Tests must never
 * hardcode that order: this helper reads index.html — the single source of
 * truth for script order — so adding or moving a core file needs no test edit.
 *
 * Works before and after the split: with no js/core/ directory it falls back to
 * the legacy single js/core.js.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../../public/Game/neon-survivor');
const MARKER = '/Game/neon-survivor/';

function html() {
  return fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
}

/** Every neon-survivor <script src> in document order, as { path, query }. */
function scriptTags() {
  const tags = [];
  const tag = /<script\b[^>]*\bsrc="([^"]+)"/g;
  let match;
  while ((match = tag.exec(html()))) {
    const at = match[1].indexOf(MARKER);
    if (at < 0) continue;
    const [path, query = ''] = match[1].slice(at + MARKER.length).split('?');
    tags.push({ path, query: query ? `?${query}` : '' });
  }
  return tags;
}

/** Every neon-survivor <script src> in document order, game-relative and unversioned. */
function scriptPaths() {
  return scriptTags().map(tag => tag.path);
}

function isCore(path) {
  return path === 'js/core.js' || path.startsWith('js/core/');
}

/** Core-game parts in load order; falls back to the legacy single file. */
function coreScriptPaths() {
  const parts = scriptPaths().filter(isCore);
  return parts.length ? parts : ['js/core.js'];
}

/** The last core script tag — the game entry point. Carries the cache version. */
function coreEntryTag() {
  return scriptTags().filter(tag => isCore(tag.path)).at(-1);
}

/** Concatenated core source, for tests that assert on source text. */
function coreSource() {
  return coreScriptPaths()
    .map(part => fs.readFileSync(path.join(ROOT, part), 'utf8'))
    .join('\n');
}

function read(part) {
  return fs.readFileSync(path.join(ROOT, part), 'utf8');
}

function toPath(relative) {
  const withDir = relative.startsWith('js/') ? relative : `js/${relative}`;
  return withDir.endsWith('.js') ? withDir : `${withDir}.js`;
}

/** Evaluate the whole core game into an existing vm sandbox, in load order. */
function runCore(sandbox) {
  for (const part of coreScriptPaths()) {
    vm.runInContext(read(part), sandbox, { filename: part });
  }
}

/** Evaluate the named game scripts first, then the whole core game.
 *
 * network/schema.js is a declared dependency of every other network module, so
 * it is loaded automatically whenever one is requested: a test that lists the
 * modules under test should not also have to remember their contract module.
 */
function runScripts(sandbox, relatives) {
  const list = [...relatives];
  const needsNetwork = list.some(entry => /(^|\/)network\//.test(entry));
  // js/players.js owns the remote pilot shape and network/schema.js owns the
  // wire contract; both load before the transport in the page, so a test that
  // lists network modules gets them automatically.
  if (needsNetwork && !list.some(entry => /(^|\/)players$/.test(entry))) list.unshift('players');
  if (needsNetwork && !list.some(entry => /network\/schema$/.test(entry))) list.unshift('network/schema');
  for (const relative of list) {
    const part = toPath(relative);
    vm.runInContext(read(part), sandbox, { filename: part });
  }
  runCore(sandbox);
}

module.exports = {
  ROOT, html, scriptTags, scriptPaths, coreScriptPaths, coreEntryTag,
  coreSource, runCore, runScripts
};

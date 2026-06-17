const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  iina: {
    core: {},
    mpv: {},
    event: {},
    overlay: {},
    menu: {},
    input: {},
    ws: {},
    preferences: { get() { return undefined; } },
    console: { log() {}, warn() {}, error() {}, info() {} },
    file: {},
    http: {},
    utils: {},
    standaloneWindow: {}
  },
  console,
  Date,
  setTimeout,
  clearTimeout
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'src/main/00_context_state_paths.js'), 'utf8'), context);

context.resetLookupCache();
for (let i = 0; i < 40; i++) {
  context.setLookupCacheValue('entry-' + i, { ok: true, payload: 'x'.repeat(1024), index: i });
}
let stats = context.lookupCacheStats();
assert(stats.entries <= 24, 'Lookup cache should cap entry count');
assert(!context.getLookupCacheValue('entry-0'), 'Lookup cache should evict old entries');
assert(context.getLookupCacheValue('entry-39'), 'Lookup cache should keep recent entries');

context.resetLookupCache();
for (let i = 0; i < 12; i++) {
  context.setLookupCacheValue('large-' + i, { ok: true, payload: 'x'.repeat(300 * 1024), index: i });
}
stats = context.lookupCacheStats();
assert(stats.bytes <= 2 * 1024 * 1024, 'Lookup cache should cap approximate bytes');
assert(stats.entries < 12, 'Large lookup results should force eviction before entry cap');
assert(context.getLookupCacheValue('large-11'), 'Most recent large lookup should stay cached');

context.resetLookupCache();
stats = context.lookupCacheStats();
assert(stats.entries === 0 && stats.bytes === 0, 'Lookup cache reset should clear metadata');

console.log('lookup cache limit tests passed');

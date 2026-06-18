const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runCase(options) {
  const calls = [];
  const context = {
    console,
    selectedLanguageModule() { return { id: 'ja' }; },
    debugVerbose() {},
    debugWarn() {},
    compactError(error) { return error && error.message ? error.message : String(error); },
    emptyDictionaryGroups() { return { term: [], frequency: [], pitch: [] }; },
    prefNumber(key, fallback) { return fallback; },
    prefBool(key, fallback) {
      if (/directWorkerIpc|fallbackToClientExec|allowClientExecLookup/.test(String(key || ''))) {
        throw new Error('Interactive lookup must not read removed exec fallback preferences');
      }
      return fallback;
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/main/30_backend_import_worker_lookup.js'), 'utf8'), context);
  context.runWorkerQueueLookupDirect = async function runWorkerQueueLookupDirect() {
    calls.push('direct');
    if (options.directError) throw new Error(options.directError);
    return { ok: true, results: [{ matched: '読む' }] };
  };
  context.runBackendJson = async function runBackendJson() {
    calls.push('backend-exec');
    return { ok: true, results: [] };
  };
  let result = null;
  let error = null;
  try {
    result = await context.lookupViaWorker('読む', ['/dict'], 24, 3, 'req-1', 'yomitan-japanese', 4, { id: 'ja' });
  } catch (err) {
    error = err;
  }
  return { calls, result, error };
}

(async () => {
  const normal = await runCase({});
  assert(normal.result && normal.result.ok, 'Lookup should succeed through the worker queue');
  assert(normal.calls.join('|') === 'direct', 'Interactive lookup must use the worker queue without reading removed exec fallback preferences');

  const directFailure = await runCase({
    directError: 'queue unavailable'
  });
  assert(directFailure.error && /queue unavailable/.test(directFailure.error.message), 'Direct worker failures should propagate');
  assert(directFailure.calls.join('|') === 'direct', 'Interactive lookup must not call backend exec after direct worker failure');

  console.log('lookup worker exec guard tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const calls = [];
const files = Object.create(null);
let extractedPath = '';
const settings = {
  localAudioEnabled: true,
  localAudioDatabasePath: '/dictionaries/android.db',
  audioSourcesJson: '[{"name":"Hoshi Reader","url":"https://example.invalid/?term={term}&reading={reading}"}]'
};
const context = {
  console,
  DEFAULT_AUDIO_SOURCES_JSON: settings.audioSourcesJson,
  pref(key, fallback) {
    return Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : fallback;
  },
  prefBool(key, fallback) {
    return Object.prototype.hasOwnProperty.call(settings, key) ? !!settings[key] : fallback;
  },
  prefNumber(key, fallback) {
    return Object.prototype.hasOwnProperty.call(settings, key) ? Number(settings[key]) : fallback;
  },
  normalizeAudioSources(value) {
    return JSON.parse(value);
  },
  dataRoot() { return '/data'; },
  dataPath(name) { return '/data/' + name; },
  pathJoin(...parts) { return parts.join('/').replace(/\/+/g, '/'); },
  ankiSafeFileStem(value) { return String(value).replace(/[^A-Za-z0-9._-]+/g, '-'); },
  debugVerbose() {},
  async execChecked() {},
  safeDelete(value) { delete files[value]; },
  safeAudioCandidateUrl(value) { return value; },
  async fetchAudioSourceCandidates() { return []; },
  async ensureBackendWorker() {},
  makeJsWorkerRequestId() { return 'worker-local-audio-1'; },
  workerQueueDir() { return '/worker/queue'; },
  workerResponseDir() { return '/worker/responses'; },
  workerStopPath() { return '/worker/stop'; },
  parseBackendJsonOutput(value) { return JSON.parse(value); },
  configuredDirectIpcPollMs() { return 1; },
  sleep() { return Promise.resolve(); },
  file: {
    exists(value) {
      return value === settings.localAudioDatabasePath || value === extractedPath || Object.prototype.hasOwnProperty.call(files, value);
    },
    read(value) { return files[value] || ''; },
    write(value, content) {
      files[value] = String(content || '');
      const payload = JSON.parse(String(content || '{}'));
      if (payload.type === 'localAudio') {
        extractedPath = '/data/audio-cache/' + payload.stem + '.mp3';
        const responsePath = '/worker/responses/' + payload.requestId + '.json';
        files[extractedPath] = 'audio';
        files[responsePath] = JSON.stringify({
          ok: true,
          found: true,
          id: 42,
          source: 'nhk16',
          filename: 'nhk/test.mp3',
          extension: 'mp3',
          path: extractedPath,
          bytes: 3
        }) + '\n';
      }
    },
    delete(value) { delete files[value]; }
  },
  utils: {
    async exec(command, args) {
      calls.push({ command, args });
      if (command === '/usr/bin/base64') throw new Error('Local overlay audio must not base64 encode media through utils.exec');
      if (command === '/usr/bin/sqlite3' && args.includes('-readonly')) {
        return { status: 0, stdout: '42\tnhk16\tnhk/test.mp3\n', stderr: '' };
      }
      if (command === '/usr/bin/sqlite3') {
        const match = /writefile\('([^']+)'/.exec(args[args.length - 1]);
        extractedPath = match ? match[1] : '';
        return { status: 0, stdout: '3\n', stderr: '' };
      }
      return { status: 1, stdout: '', stderr: 'unexpected command' };
    }
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'src/main/55_word_audio.js'), 'utf8'), context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const sources = context.activeWordAudioSources();
  assert(sources.length === 2, 'Local audio should be prepended to online sources');
  assert(sources[0].name === 'Local Audio', 'Local audio should have a stable English source name');

  const record = await context.findLocalAudioRecord('トイレ', 'トイレ');
  assert(record && record.id === 42, 'Local audio lookup should return the sqlite record');
  const query = calls[0].args[calls[0].args.length - 1];
  assert(/e\.expression = 'トイレ'/.test(query), 'Local audio lookup should query the expression');
  assert(/nhk16/.test(query) && /forvo_ext2/.test(query), 'Local audio lookup should use Hoshi Reader source priority');

  const callsBeforeBridgeLookup = calls.length;
  const candidates = await context.localAudioCandidatesForUrl(
    'http://127.0.0.1:19742/localaudio/?term=%E3%83%88%E3%82%A4%E3%83%AC&reading=%E3%83%88%E3%82%A4%E3%83%AC'
  );
  assert(candidates.length === 1, 'Local audio bridge should return one preferred candidate');
  assert(candidates[0].name === 'nhk16', 'Local audio bridge should preserve the source name');
  assert(/^file:\/\/\/data\/audio-cache\/.+\.mp3$/.test(candidates[0].url), 'Local audio bridge should return a cached file URL instead of a data URL');
  assert(calls.length === callsBeforeBridgeLookup, 'Local overlay audio should use the worker queue instead of spawning sqlite');
  assert(!calls.some(call => call.command === '/usr/bin/base64'), 'Local overlay audio should not pipe media through base64');

  const callsAfterFirstBridgeLookup = calls.length;
  const cachedCandidates = await context.localAudioCandidatesForUrl(
    'http://127.0.0.1:19742/localaudio/?term=%E3%83%88%E3%82%A4%E3%83%AC&reading=%E3%83%88%E3%82%A4%E3%83%AC'
  );
  assert(cachedCandidates[0].url === candidates[0].url, 'Local audio bridge should reuse cached extracted files for repeated hover playback');
  assert(calls.length === callsAfterFirstBridgeLookup, 'Cached local audio playback should not spawn another sqlite subprocess');

  console.log('local audio tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

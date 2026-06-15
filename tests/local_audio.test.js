const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const calls = [];
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
  normalizeAudioSources(value) {
    return JSON.parse(value);
  },
  dataRoot() { return '/data'; },
  dataPath(name) { return '/data/' + name; },
  pathJoin(...parts) { return parts.join('/').replace(/\/+/g, '/'); },
  ankiSafeFileStem(value) { return String(value).replace(/[^A-Za-z0-9._-]+/g, '-'); },
  debugVerbose() {},
  async execChecked() {},
  safeDelete() {},
  safeAudioCandidateUrl(value) { return value; },
  async fetchAudioSourceCandidates() { return []; },
  file: {
    exists(value) {
      return value === settings.localAudioDatabasePath || value === extractedPath;
    }
  },
  utils: {
    async exec(command, args) {
      calls.push({ command, args });
      if (command === '/usr/bin/base64') return { status: 0, stdout: 'SUQz', stderr: '' };
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

  const candidates = await context.localAudioCandidatesForUrl(
    'http://127.0.0.1:19742/localaudio/?term=%E3%83%88%E3%82%A4%E3%83%AC&reading=%E3%83%88%E3%82%A4%E3%83%AC'
  );
  assert(candidates.length === 1, 'Local audio bridge should return one preferred candidate');
  assert(candidates[0].name === 'nhk16', 'Local audio bridge should preserve the source name');
  assert(candidates[0].url === 'data:audio/mpeg;base64,SUQz', 'Local audio bridge should return a playable data URL');

  console.log('local audio tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

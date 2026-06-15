const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ankiExportSource = fs.readFileSync(path.join(root, 'src/main/68_anki_export.js'), 'utf8');
const settings = {
  ankiConnectUrl: 'http://127.0.0.1:8765',
  uiLanguage: 'en',
  ankiApiKey: '',
  ankiDeckName: 'Lapis_test',
  ankiModelName: 'Lapis',
  ankiFieldMappingsJson: JSON.stringify({
    Sentence: '{sentence}',
    Expression: '{expression}',
    ExpressionReading: '{reading}',
    MainDefinition: '{single-glossary-明鏡日汉双解辞典}',
    MiscInfo: '{source}',
    Frequencies: '{frequency-harmonic-rank}'
  }),
  ankiTags: 'hoshitan test, test',
  ankiAllowDuplicate: false,
  ankiIncludeScreenshot: false,
  ankiIncludeAudio: false,
  ankiAudioPaddingMs: 120,
  ankiFfmpegPath: '/opt/homebrew/bin/ffmpeg'
};
const actions = [];
const overlayPosts = [];
const notifications = [];
const responses = {
  version: 6,
  deckNames: ['Lapis_test'],
  modelNames: ['Lapis'],
  modelFieldNames: [
    'Expression',
    'ExpressionReading',
    'MainDefinition',
    'Sentence',
    'MiscInfo',
    'Frequencies'
  ],
  addNote: 123456789
};

const context = {
  pref(key, fallback) {
    return Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : fallback;
  },
  preferenceValueToBool(value, fallback) {
    return value === undefined ? fallback : !!value;
  },
  http: {
    async post(url, options) {
      actions.push({ url, options });
      const request = options.data;
      return {
        statusCode: 200,
        data: { result: responses[request.action], error: null }
      };
    }
  },
  mpv: {
    getNumber(name) {
      const values = {
        'time-pos': 7.1,
        'sub-start': 6.74,
        'sub-end': 8.24,
        'sub-delay': 0.2,
        'audio-delay': 0.05
      };
      return values[name];
    },
    getString(name) {
      if (name === 'filename') return 'episode.mkv';
      if (name === 'path') return '/tmp/episode.mkv';
      return '';
    }
  },
  compactError(error) {
    return error && error.message ? error.message : String(error);
  },
  debugLog() {},
  debugWarn() {},
  debugError() {},
  postToOverlay(name, data) {
    overlayPosts.push({ name, data });
  },
  notify(message, kind) {
    notifications.push({ message, kind });
  },
  normalizeFileUrlPath(value) { return value; },
  dataPath(value) { return '/tmp/' + value; },
  dataRoot() { return '/tmp'; },
  pathJoin(...parts) { return parts.join('/').replace(/\/+/g, '/'); },
  safeDelete() {},
  execChecked: async () => {},
  sleep: async () => {},
  file: { exists: () => true },
  Date,
  Promise,
  console
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'src/main/15_i18n.js'), 'utf8') +
    '\n' +
    ankiExportSource,
  context
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  assert(/"-c:a", "libmp3lame"/.test(ankiExportSource), 'Sentence audio should use the MP3 encoder');
  assert(ankiExportSource.includes('base + ".mp3"'), 'Sentence audio should use an MP3 filename');
  const timing = context.ankiSubtitleTiming();
  assert(Math.abs(timing.start - 6.89) < 0.0001, 'Subtitle timing should include subtitle/audio delay correction');
  assert(Math.abs(timing.end - 8.39) < 0.0001, 'Subtitle end should include subtitle/audio delay correction');

  const metadata = await context.ankiConnectionMetadata('Lapis');
  assert(metadata.connected === true, 'Anki metadata should report a successful connection');
  assert(metadata.deckNames[0] === 'Lapis_test', 'Anki metadata should preserve deck names');

  await context.exportLookupEntryToAnki({
    requestId: 'anki-test',
    sentence: 'トイレ　トイレ',
    expression: 'トイレ',
    reading: 'トイレ',
    furiganaPlain: 'トイレ',
    definition: '<test> & definition',
    glossary: '<test> & definition',
    glossaryBrief: '<test> & definition',
    glossaryFirst: '[明鏡日汉双解辞典] <test> & definition',
    selectedGlossary: '[明鏡日汉双解辞典] <test> & definition',
    singleGlossaries: {
      '明鏡日汉双解辞典': '[明鏡日汉双解辞典] <test> & definition'
    },
    frequencyHarmonicRank: '184'
  });

  const addCall = actions.find(call => call.options.data.action === 'addNote');
  assert(addCall, 'Anki export should call addNote');
  assert(addCall.options.headers['Content-Type'] === 'application/json', 'AnkiConnect request should use JSON');
  const note = addCall.options.data.params.note;
  assert(note.deckName === 'Lapis_test', 'Export must target the configured test deck');
  assert(note.modelName === 'Lapis', 'Export must use the configured note type');
  assert(note.fields.Sentence === 'トイレ　トイレ', 'Sentence should map to the configured field');
  assert(note.fields.Expression === 'トイレ', 'Expression should map to the configured field');
  assert(note.fields.MainDefinition === '[明鏡日汉双解辞典] &lt;test&gt; &amp; definition', 'Per-dictionary glossary should map by dictionary title');
  assert(note.fields.MiscInfo === 'episode.mkv @ 00:07.099', 'Source field should include a timestamp');
  assert(note.fields.Frequencies === '184', 'Frequency harmonic rank should map to an Anki field');
  assert(note.tags.length === 2 && note.tags[0] === 'hoshitan' && note.tags[1] === 'test', 'Tags should be deduplicated');
  assert(!note.picture && !note.audio, 'Disabled media should not be attached');
  assert(overlayPosts.some(post => post.name === 'anki-export-result' && post.data.ok), 'Overlay should receive success');
  assert(notifications.some(item => item.kind === 'info'), 'Successful export should notify the user');

  settings.ankiFieldMappingsJson = JSON.stringify({ MissingField: '{definition}' });
  let rejected = false;
  try {
    await context.exportLookupEntryToAnki({
      requestId: 'anki-invalid-field',
      sentence: 'test',
      definition: 'test'
    });
  } catch (error) {
    rejected = /Fields not found/.test(String(error && error.message));
  }
  assert(rejected, 'Export should reject fields absent from the selected note type');
  assert(actions.filter(call => call.options.data.action === 'addNote').length === 1, 'Invalid field mapping must not create a note');

  console.log('anki export tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

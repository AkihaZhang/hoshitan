const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/main/10_subtitle_text_style.js'), 'utf8');
const start = source.indexOf('function readCurrentSubtitle()');
const end = source.indexOf('function charsOf(text)');
if (start < 0 || end < 0) throw new Error('Could not isolate subtitle polling functions');

const values = { 'sub-text': '', 'secondary-sub-text': '' };
const posts = [];
const context = {
  clock: 1000,
  dictGroups: { term: ['/dict/term'], frequency: ['/dict/frequency'], pitch: ['/dict/pitch'] },
  workerWarmups: [],
  enabled: true,
  lastSubtitle: null,
  subtitleEmptySince: 0,
  lastSubtitlePublishedAt: 0,
  textSubtitleOverlayPrimed: false,
  textSubtitleOverlayRefreshes: 0,
  nativeSubVisibilityBeforeEnable: null,
  currentSubtitleLineId: 0,
  subtitleLineSerial: 0,
  SUBTITLE_EMPTY_GRACE_MS: 260,
  SUBTITLE_REPLAY_INTERVAL_MS: 1500,
  Date: { now() { return context.clock; } },
  mpv: {
    getString(name) { return values[name] || ''; },
    set() {}
  },
  cleanSubtitleText(value) { return String(value || '').trim(); },
  prefBool() { return false; },
  refreshPollingInterval() {},
  syncNativeSubtitleVisibility() {},
  refreshOverlayForTextSubtitleActivation() {
    context.textSubtitleOverlayRefreshes += 1;
    return true;
  },
  selectedLanguageModule() { return { id: 'ja', hasLookupText: text => !!text }; },
  activeDictionaryPaths() { throw new Error('subtitle publishing must use grouped dictionaries for worker warmup'); },
  activeDictionaryGroups() { return context.dictGroups; },
  workerLookupTermPaths(groups) { return groups.term.slice(); },
  workerDictionaryCount(groups) { return groups.term.length + groups.frequency.length + groups.pitch.length; },
  overlayConfig() { return {}; },
  ensureBackendWorker(dicts) {
    context.workerWarmups.push(dicts);
    return Promise.resolve();
  },
  debugVerbose() {},
  debugLog() {},
  compactError(error) { return String(error && error.message ? error.message : error); },
  postToOverlay(name, data) { posts.push({ name, data }); },
  Promise,
  console
};

vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

values['sub-text'] = '主字幕';
context.pollSubtitle();
assert(posts.filter(post => post.name === 'subtitle').length === 1, 'A new subtitle should be published');
assert(context.textSubtitleOverlayRefreshes === 1, 'The first text subtitle should refresh the overlay attachment once');
assert(context.workerWarmups.length === 1, 'A lookup-capable subtitle should warm the backend worker');
assert(context.workerWarmups[0].frequency[0] === '/dict/frequency', 'Subtitle worker warmup should preserve frequency dictionaries');
assert(context.workerWarmups[0].pitch[0] === '/dict/pitch', 'Subtitle worker warmup should preserve pitch dictionaries');
const firstLineId = posts.find(post => post.name === 'subtitle').data.lineId;

values['sub-text'] = '';
context.clock += 100;
context.pollSubtitle();
assert(posts.filter(post => post.name === 'subtitle').length === 1, 'A transient empty subtitle should be ignored');

context.clock += 300;
context.pollSubtitle();
assert(posts.filter(post => post.name === 'subtitle').length === 2, 'A sustained subtitle gap should be published');
assert(posts.filter(post => post.name === 'subtitle')[1].data.text === '', 'A sustained gap should clear the overlay');

values['secondary-sub-text'] = '副字幕';
context.clock += 10;
context.pollSubtitle();
assert(context.textSubtitleOverlayRefreshes === 1, 'Later text subtitles should not repeatedly reload the overlay');
const subtitlePosts = posts.filter(post => post.name === 'subtitle');
assert(subtitlePosts[subtitlePosts.length - 1].data.text === '副字幕', 'Secondary subtitles should be used when the primary subtitle is empty');
const secondaryLineId = subtitlePosts[subtitlePosts.length - 1].data.lineId;

context.clock += 1600;
const resetCount = posts.filter(post => post.name === 'line-lookup-reset').length;
context.pollSubtitle();
const replay = posts.filter(post => post.name === 'subtitle').slice(-1)[0];
assert(replay.data.lineId === secondaryLineId, 'Heartbeat replay should preserve the subtitle line id');
assert(!Object.prototype.hasOwnProperty.call(replay.data, 'config'), 'Heartbeat replay should not resend the full overlay configuration');
assert(posts.filter(post => post.name === 'line-lookup-reset').length === resetCount, 'Heartbeat replay should not reset active lookups');
assert(firstLineId !== secondaryLineId, 'A genuinely changed subtitle should get a new line id');

console.log('subtitle polling tests passed');

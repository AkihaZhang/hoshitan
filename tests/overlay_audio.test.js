const { assert, loadOverlayForTest } = require('./helpers/overlay_test_context');

const { context, overlay } = loadOverlayForTest([
  'state',
  'applyConfig',
  'showPopup',
  'renderStoredLookup',
  'renderSubtitle',
  'audioTermReadingKey',
  'playAudioForTerm',
  'probePopupAudioButtons',
  'showAudioSourceMenu',
  'closestAnkiButton'
]);

const fetchCalls = [];
const fetchResponses = [];
context.fetch = async function fetch(url) {
  fetchCalls.push(String(url || ''));
  if (/audiomp3\.php/i.test(String(url || ''))) throw new Error('direct audio endpoints are not JSON');
  const response = fetchResponses.length
    ? fetchResponses.shift()
    : { type: 'audioSourceList', audioSources: [] };
  return {
    ok: response !== false,
    status: response === false ? 500 : 200,
    text: async () => JSON.stringify(response === false ? {} : response)
  };
};

const loaded = [];
const played = [];
context.Audio = function TestAudio(url) {
  this.url = String(url);
  this.readyState = 0;
  this.listeners = Object.create(null);
};
context.Audio.prototype.addEventListener = function addEventListener(type, handler) {
  if (!this.listeners[type]) this.listeners[type] = [];
  this.listeners[type].push(handler);
};
context.Audio.prototype.removeEventListener = function removeEventListener(type, handler) {
  if (!this.listeners[type]) return;
  this.listeners[type] = this.listeners[type].filter(item => item !== handler);
};
context.Audio.prototype._emit = function emit(type) {
  (this.listeners[type] || []).slice().forEach(handler => handler());
};
context.Audio.prototype.load = function load() {
  loaded.push(this.url);
  setTimeout(() => {
    if (this.url.indexOf('bad') >= 0) {
      this.error = new Error('bad audio');
      this._emit('error');
      return;
    }
    this.readyState = 2;
    this._emit('loadeddata');
  }, 0);
};
context.Audio.prototype.play = function play() {
  played.push(this.url);
  return Promise.resolve();
};
context.Audio.prototype.pause = function pause() {};

overlay.applyConfig({
  language: { id: 'ja', label: 'Japanese', lookupUnit: 'character', wordMode: 'rightward-prefix' },
  audioSources: [{ url: 'http://127.0.0.1:5050/?term={term}&reading={reading}' }],
  overlayBridgePort: 19741,
  hoverRequestTimeoutMs: 5000
});

overlay.showPopup(context.document.createElement('span'), '読', '<div class="loading">Loading...</div>');
overlay.renderStoredLookup({
  ok: true,
  position: 0,
  result: {
    ok: true,
    language: 'ja',
    results: [{
      matched: '読む',
      deinflected: '読む',
      term: { expression: '読む', reading: 'よむ', glossaries: [] }
    }]
  }
});

const unrelatedAudioButton = context.document.createElement('button');
unrelatedAudioButton.className = 'audio-button';
unrelatedAudioButton.parentNode = context.__elements.popup;
assert(overlay.closestAnkiButton(unrelatedAudioButton) === null, 'Audio buttons must not be mistaken for Anki export buttons');

overlay.state.enabled = true;
overlay.renderSubtitle('読む', 91);
overlay.state.audioAutoPlayed['91:0:test'] = true;
overlay.renderSubtitle('読む', 91);
assert(overlay.state.audioAutoPlayed['91:0:test'] === true, 'Replaying the same subtitle line must not reset audio auto-play state');
overlay.state.subtitleVisible = false;
context.__elements.subtitle.classList.add('hidden');
overlay.renderSubtitle('読む', 91);
assert(context.__elements.subtitle.classList.contains('hidden'), 'Heartbeat replay must not re-show subtitles hidden by the S shortcut');
overlay.state.subtitleVisible = true;

const headHtml = context.__elements.popup.querySelector('.head')._innerHTML;
assert(/class="audio-button"/.test(headHtml), 'Lookup result header should render a speaker button when audio sources are configured');
assert(/data-audio-term="読む"/.test(headHtml), 'Speaker button should carry the entry headword');
assert(/data-audio-reading="よむ"/.test(headHtml), 'Speaker button should carry the entry reading');
assert(/<svg class="audio-icon"/.test(headHtml), 'Speaker buttons should use a centered vector icon instead of an emoji glyph');

const key = overlay.audioTermReadingKey('読む', 'よむ');
const button = context.document.createElement('button');
button.className = 'audio-button';
button.dataset.audioKey = key;
context.__elements.popup.appendChild(button);

function respondToAudioSourceRequest(fromIndex, candidates, ok) {
  const message = context.__sent.slice(fromIndex).find(item => item.type === 'audio-source');
  assert(message, 'Audio playback should request source JSON over the WebSocket bridge');
  context.__handlers['audio-source-result']({
    requestId: message.requestId,
    ok: ok !== false,
    candidates: candidates || []
  });
  return message;
}

(async () => {
  const beforeFirst = context.__sent.length;
  fetchResponses.push({
    type: 'audioSourceList',
    audioSources: [
      { name: 'bad', url: 'http://127.0.0.1:5050/bad.mp3' },
      { name: 'good', url: 'http://127.0.0.1:5050/good.mp3' }
    ]
  });
  const playPromise = overlay.playAudioForTerm('読む', 'よむ', button, {});
  const ok = await playPromise;
  assert(ok, 'Audio playback should succeed when a later candidate works');
  assert(!context.__sent.slice(beforeFirst).some(item => item.type === 'audio-source'), 'Online audio should not spawn plugin-side curl through the bridge');
  assert(fetchCalls[0].indexOf('term=%E8%AA%AD%E3%82%80') >= 0, 'Audio source URL should receive the encoded term');
  assert(fetchCalls[0].indexOf('reading=%E3%82%88%E3%82%80') >= 0, 'Audio source URL should receive the encoded reading');
  assert(loaded[0].indexOf('bad.mp3') >= 0, 'The first candidate should be tried before fallback candidates');
  assert(played[0] === 'http://127.0.0.1:5050/good.mp3', 'The first working candidate should be played');
  assert(button.dataset.audioState === 'ready', 'Successful audio should leave the button available without a missing badge');

  const loadedAfterFirstPlay = loaded.length;
  const replayed = await overlay.playAudioForTerm('読む', 'よむ', button, {});
  assert(replayed, 'Clicking the same playing audio should be accepted');
  assert(loaded.length === loadedAfterFirstPlay, 'Clicking the same playing audio should not create another Audio object');

  const rapidKey = overlay.audioTermReadingKey('連打', 'れんだ');
  const rapidButton = context.document.createElement('button');
  rapidButton.className = 'audio-button';
  rapidButton.dataset.audioKey = rapidKey;
  context.__elements.popup.appendChild(rapidButton);
  const beforeRapidLoaded = loaded.filter(url => url.indexOf('rapid.mp3') >= 0).length;
  fetchResponses.push({
    type: 'audioSourceList',
    audioSources: [
      { name: 'rapid', url: 'http://127.0.0.1:5050/rapid.mp3' }
    ]
  });
  const rapidResults = await Promise.all([
    overlay.playAudioForTerm('連打', 'れんだ', rapidButton, {}),
    overlay.playAudioForTerm('連打', 'れんだ', rapidButton, {}),
    overlay.playAudioForTerm('連打', 'れんだ', rapidButton, {})
  ]);
  assert(rapidResults[0] === true && rapidResults[1] === false && rapidResults[2] === false, 'Concurrent clicks for the same audio should coalesce behind the first load');
  assert(loaded.filter(url => url.indexOf('rapid.mp3') >= 0).length === beforeRapidLoaded + 1, 'Concurrent clicks for the same audio should only load one candidate');

  const missingKey = overlay.audioTermReadingKey('無音', '');
  const missingButton = context.document.createElement('button');
  missingButton.className = 'audio-button';
  missingButton.dataset.audioKey = missingKey;
  context.__elements.popup.appendChild(missingButton);
  const beforeMissing = context.__sent.length;
  fetchResponses.push({ type: 'audioSourceList', audioSources: [] });
  const missingPromise = overlay.playAudioForTerm('無音', '', missingButton, {});
  const missing = await missingPromise;
  assert(!context.__sent.slice(beforeMissing).some(item => item.type === 'audio-source'), 'Missing online audio should not use plugin-side curl');
  assert(!missing, 'Empty audio source JSON should report missing audio');
  assert(missingButton.dataset.audioState === 'missing', 'Missing audio should mark the speaker with the missing badge state');

  const proactiveButton = context.document.createElement('button');
  proactiveButton.className = 'audio-button';
  proactiveButton.dataset.audioKey = overlay.audioTermReadingKey('未収録', 'みしゅうろく');
  proactiveButton.dataset.audioTerm = '未収録';
  proactiveButton.dataset.audioReading = 'みしゅうろく';
  context.__elements.popup.appendChild(proactiveButton);
  const skippedProbeButton = context.document.createElement('button');
  skippedProbeButton.className = 'audio-button';
  skippedProbeButton.dataset.audioKey = overlay.audioTermReadingKey('別語', 'べつご');
  skippedProbeButton.dataset.audioTerm = '別語';
  skippedProbeButton.dataset.audioReading = 'べつご';
  context.__elements.popup.appendChild(skippedProbeButton);
  const beforeProbe = context.__sent.length;
  fetchResponses.push({ type: 'audioSourceList', audioSources: [] });
  overlay.probePopupAudioButtons();
  await new Promise(resolve => setTimeout(resolve, 5));
  assert(!context.__sent.slice(beforeProbe).some(item => item.type === 'audio-source'), 'Online popup audio probing should not use plugin-side curl');
  assert(proactiveButton.dataset.audioState === 'missing', 'Visible entries should proactively show a missing-audio badge');
  assert(!skippedProbeButton.dataset.audioState, 'Secondary entries should not be eagerly probed on popup open');

  overlay.applyConfig({
    audioSources: [{ name: 'Local Audio', url: 'http://127.0.0.1:19742/localaudio/?term={term}&reading={reading}' }]
  });
  const localKey = overlay.audioTermReadingKey('読む', 'よむ');
  const localButton = context.document.createElement('button');
  localButton.className = 'audio-button';
  localButton.dataset.audioKey = localKey;
  context.__elements.popup.appendChild(localButton);
  const beforeLocal = context.__sent.length;
  const localPromise = overlay.playAudioForTerm('読む', 'よむ', localButton, {});
  const localRequest = respondToAudioSourceRequest(beforeLocal, [{ name: 'Local Audio', url: 'file:///tmp/hoshitan%20local/audio.mp3' }]);
  const local = await localPromise;
  assert(local, 'Local audio should still resolve through the plugin bridge');
  assert(localRequest.url.indexOf('127.0.0.1:19742') >= 0, 'Only the local audio bridge URL should be sent to the plugin');
  assert(played[played.length - 1] === 'file:///tmp/hoshitan%20local/audio.mp3', 'Local audio bridge file URLs should be playable without base64 conversion');

  overlay.applyConfig({
    audioSources: [{ name: 'LanguagePod101', url: 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kanji={term}&kana={reading}' }]
  });
  const directKey = overlay.audioTermReadingKey('読む', 'よむ');
  const directButton = context.document.createElement('button');
  directButton.className = 'audio-button';
  directButton.dataset.audioKey = directKey;
  context.__elements.popup.appendChild(directButton);
  const beforeDirect = context.__sent.length;
  const directPromise = overlay.playAudioForTerm('読む', 'よむ', directButton, {});
  const direct = await directPromise;
  assert(direct, 'Non-JSON source URLs should be tried directly as audio');
  assert(!context.__sent.slice(beforeDirect).some(item => item.type === 'audio-source'), 'Direct online audio fallback should not use plugin-side curl');
  assert(played[played.length - 1].indexOf('audiomp3.php') >= 0, 'Direct audio fallback should play the templated source URL');
  assert(played[played.length - 1].indexOf('kanji=%E8%AA%AD%E3%82%80') >= 0, 'Direct audio source URL should encode the term');
  assert(played[played.length - 1].indexOf('kana=%E3%82%88%E3%82%80') >= 0, 'Direct audio source URL should encode the reading');
  assert(directButton.dataset.audioState === 'ready', 'Direct audio fallback should leave the button ready');

  overlay.applyConfig({
    audioSources: [
      { name: 'JapanesePod101', url: 'https://japanese.example.invalid/audio.mp3?term={term}' },
      { url: 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kanji={term}&kana={reading}' },
      { url: 'http://127.0.0.1:5050/?term={term}&reading={reading}' }
    ]
  });
  const menuButton = context.document.createElement('button');
  menuButton.className = 'audio-button';
  menuButton.dataset.audioTerm = '読む';
  menuButton.dataset.audioReading = 'よむ';
  context.__elements.popup.appendChild(menuButton);
  let menuPrevented = false;
  const menuOpened = overlay.showAudioSourceMenu(menuButton, {
    clientX: 220,
    clientY: 160,
    preventDefault() { menuPrevented = true; },
    stopPropagation() {}
  });
  assert(menuOpened, 'Right-clicking an audio button should open the source menu');
  assert(menuPrevented, 'Audio source menu should suppress the native context menu');
  const menu = context.__body.querySelector('.audio-source-menu');
  assert(menu, 'Audio source menu should be rendered');
  assert(!context.__elements.popup.querySelector('.audio-source-menu'), 'Audio source menu should render outside the popup to avoid clipping');
  assert(menu.getAttribute('data-clickable') === 'true', 'Floating audio source menus should be marked clickable for IINA');
  const items = menu.querySelectorAll('.audio-source-menu-item');
  assert(items.length === 3, 'Audio source menu should list configured sources');
  assert(items[0].textContent === 'JapanesePod101', 'Named audio sources should use their configured name');
  assert(items[1].textContent === 'languagepod101.com', 'Unnamed web audio sources should use a readable host label');
  assert(items[2].textContent === 'Local audio', 'The local Anki source should use a readable label');
  items.forEach(item => assert(item.getAttribute('data-clickable') === 'true', 'Floating audio source menu items should be marked clickable for IINA'));
  assert(!items[0].focused, 'Opening the audio source menu should not keep the first item highlighted by focus');
  context.__elements.popup.listeners.mouseleave({});
  assert(overlay.state.hideTimer, 'Leaving the popup for the source menu should start the normal hide timer');
  menu.listeners.mouseenter({});
  assert(!overlay.state.hideTimer, 'Hovering the source menu should keep the popup open');

  const beforeMenuPlay = context.__sent.length;
  items[1].listeners.click({ preventDefault() {}, stopPropagation() {} });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert(!context.__sent.slice(beforeMenuPlay).some(item => item.type === 'audio-source'), 'Choosing a direct online audio source should not use plugin-side curl');
  assert(played[played.length - 1].indexOf('languagepod101.com') >= 0, 'Chosen direct audio source should be played');
  assert(!context.__body.querySelector('.audio-source-menu'), 'Choosing a source should close the menu');

  console.log('overlay audio tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

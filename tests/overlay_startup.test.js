const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const lifecycleSource = fs.readFileSync(path.join(root, 'src/main/60_overlay_lifecycle_toggle.js'), 'utf8');
const sourceEnd = lifecycleSource.indexOf('function reloadOverlayForProfileChange()');
if (sourceEnd < 0) throw new Error('Could not isolate overlay startup functions');

const handlers = Object.create(null);
const calls = [];
const timers = [];
const context = {
  VERSION: 'test',
  enabled: true,
  initialized: false,
  overlayMessageHandlersRegistered: false,
  overlayLoadGeneration: 0,
  overlayReadyGeneration: 0,
  textSubtitleOverlayPrimed: false,
  core: { window: { loaded: true } },
  overlay: {
    onMessage(name, handler) {
      calls.push('onMessage:' + name);
      handlers[name] = handler;
    },
    loadFile(name) {
      calls.push('loadFile:' + name);
      if (!handlers.ready) throw new Error('ready listener was registered after loadFile');
      handlers.ready({ ready: true });
    },
    setOpacity() {},
    setClickable() {},
    show() {}
  },
  ensureOverlayBridge() {},
  debugLog(message) { calls.push('log:' + message); },
  debugVerbose() {},
  handleLookupPopupOverlayReady() { calls.push('readyHandled'); },
  handleLookupAt() {},
  handleLookupPopupVisibility() {},
  openExternalUrlFromOverlay() {},
  handleAnkiAddRequest() {},
  postToOverlay(name) { calls.push('post:' + name); },
  overlayConfig() { return {}; },
  replayActiveOverlayTask() { calls.push('replayTask'); },
  pollSubtitle(options) { calls.push('poll:' + String(!!(options && options.forceReplay))); },
  setTimeout(handler, delay) {
    timers.push({ handler, delay });
    return timers.length;
  },
  console
};

vm.createContext(context);
vm.runInContext(lifecycleSource.slice(0, sourceEnd), context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

context.initializeOverlay();

assert(calls.indexOf('onMessage:ready') >= 0, 'Overlay ready listener should be registered');
assert(
  calls.indexOf('onMessage:ready') < calls.indexOf('loadFile:overlay.html'),
  'Overlay message listeners must be registered before loading the webview'
);
assert(calls.includes('readyHandled'), 'Synchronous overlay ready should be handled during initial load');
assert(calls.includes('post:config'), 'Overlay ready should synchronize configuration');
assert(calls.includes('post:enabled'), 'Overlay ready should synchronize enabled state');
assert(calls.includes('poll:true'), 'Overlay ready should force replay of the current subtitle');
assert(context.overlayReadyGeneration === 1, 'Ready should acknowledge the active overlay generation');

const registrationCount = calls.filter(call => call.startsWith('onMessage:')).length;
context.initializeOverlay();
assert(
  calls.filter(call => call.startsWith('onMessage:')).length === registrationCount,
  'Repeated initialization must not register duplicate overlay listeners'
);

timers.forEach(timer => timer.handler());
assert(
  calls.filter(call => call === 'post:config').length === 1,
  'Startup fallbacks should not run after the active generation reports ready'
);

const timerCountBeforeMissingReadyLoad = timers.length;
const configPostsBeforeMissingReadyLoad = calls.filter(call => call === 'post:config').length;
const forcedPollsBeforeMissingReadyLoad = calls.filter(call => call === 'poll:true').length;
context.overlay.loadFile = name => { calls.push('loadFile:' + name); };
context.loadOverlayDocument('missing-ready-test');
assert(context.overlayLoadGeneration === 2, 'Reloading should advance the overlay generation');
timers.slice(timerCountBeforeMissingReadyLoad, timerCountBeforeMissingReadyLoad + 1).forEach(timer => timer.handler());
assert(
  calls.filter(call => call === 'post:config').length === configPostsBeforeMissingReadyLoad + 1,
  'The startup fallback should resend configuration when ready is missing'
);
assert(
  calls.filter(call => call === 'poll:true').length === forcedPollsBeforeMissingReadyLoad + 1,
  'The startup fallback should force-read and replay the current subtitle'
);

context.loadOverlayDocument = reason => { calls.push('reload:' + reason); };
assert(context.refreshOverlayForTextSubtitleActivation() === true, 'Text subtitle activation should refresh an available overlay');
assert(calls.includes('reload:text-subtitle-activation'), 'Text subtitle activation should reload the overlay document');

console.log('overlay startup tests passed');

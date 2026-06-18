const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const posts = [];
const execCalls = [];
let localAudioCalls = 0;

const context = {
  console,
  dataRoot() { return '/data'; },
  compactError(error) { return error && error.message ? error.message : String(error); },
  debugVerbose() {},
  debugWarn() {},
  postToOverlay(type, payload) { posts.push({ type, payload }); },
  isLocalAudioSourceUrl(url) {
    return /^http:\/\/127\.0\.0\.1:19742\/localaudio\/?\?/i.test(String(url || ''));
  },
  async localAudioCandidatesForUrl(sourceUrl) {
    localAudioCalls++;
    return [{ name: 'Local Audio', url: 'data:audio/mpeg;base64,SUQz', sourceUrl }];
  },
  utils: {
    async exec(command, args, cwd) {
      execCalls.push({ command, args, cwd });
      throw new Error('utils.exec must not be used by overlay audio bridge');
    }
  }
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'src/main/50_overlay_bridge_pause.js'), 'utf8'), context);

(async () => {
  context.handleBridgeAudioSource({
    requestId: 'online-1',
    url: 'https://hoshi-reader.manhhaoo-do.workers.dev/?term=%E8%AA%AD%E3%82%80&reading=%E3%82%88%E3%82%80'
  });
  await delay(0);
  const online = posts.find(item => item.payload && item.payload.requestId === 'online-1');
  assert(online, 'Online audio bridge requests should receive a response');
  assert(online.type === 'audio-source-result', 'Audio bridge should respond with audio-source-result');
  assert(online.payload.ok === false, 'Online audio must be rejected by the plugin bridge');
  assert(/Only local audio bridge/.test(online.payload.error), 'Online audio rejection should explain the boundary');
  assert(execCalls.length === 0, 'Online audio bridge rejection must not call utils.exec');
  assert(localAudioCalls === 0, 'Online audio bridge rejection must not query local audio');

  context.handleBridgeAudioSource({
    requestId: 'local-1',
    url: 'http://127.0.0.1:19742/localaudio/?term=%E8%AA%AD%E3%82%80&reading=%E3%82%88%E3%82%80'
  });
  await delay(0);
  const local = posts.find(item => item.payload && item.payload.requestId === 'local-1');
  assert(local, 'Local audio bridge requests should receive a response');
  assert(local.payload.ok === true, 'Local audio should still resolve through the plugin bridge');
  assert(local.payload.candidates.length === 1, 'Local audio bridge should return local candidates');
  assert(local.payload.candidates[0].url === 'data:audio/mpeg;base64,SUQz', 'Local audio bridge should preserve data audio URLs');
  assert(execCalls.length === 0, 'Bridge dispatch itself must not call utils.exec');
  assert(localAudioCalls === 1, 'Local audio bridge should delegate to localAudioCandidatesForUrl exactly once');

  console.log('audio bridge tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

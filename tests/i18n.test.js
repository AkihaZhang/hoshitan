const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let language = 'zh-CN';
const context = {
  pref(key, fallback) {
    return key === 'uiLanguage' ? language : fallback;
  },
  utils: { exec: async () => ({ status: 0, stdout: '("zh-Hans-JP")' }) },
  dataRoot() { return '/tmp'; },
  rebuildMenu() {},
  postToOverlay() {},
  postDictionaryManagerState() {},
  initialized: false,
  console
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'src/main/15_i18n.js'), 'utf8'), context);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(context.resolvedUiLanguage() === 'zh-CN', 'Explicit Simplified Chinese should resolve');
assert(context.t('menu.settings') === '设置...', 'Menu labels should translate to Simplified Chinese');
assert(
  context.t('anki.deckMissing', { deck: 'Lapis_test' }) === '未找到 Anki 牌组：Lapis_test',
  'Translations should interpolate values'
);
assert(context.languageLabelForUi({ id: 'ja', label: 'Japanese' }) === '日本語', 'Language labels should use native display names');

language = 'en';
assert(context.t('menu.settings') === 'Settings...', 'English should remain available');

const managerHtml = fs.readFileSync(path.join(root, 'src/dictionary-manager/dictionary-manager.html'), 'utf8');
assert(managerHtml.includes("'Anki Card Export': 'Anki 制卡'"), 'Settings should include Simplified Chinese Anki labels');

const overlaySource = fs.readFileSync(path.join(root, 'src/overlay/overlay.js'), 'utf8');
assert(overlaySource.includes("'Add to Anki': '添加到 Anki'"), 'Overlay should include Simplified Chinese Anki action');

console.log('i18n tests passed');

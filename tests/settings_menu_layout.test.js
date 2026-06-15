const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const info = JSON.parse(fs.readFileSync(path.join(root, 'Info.json'), 'utf8'));
assert(info.name === 'Hoshitan', 'Plugin display name should use the Hoshitan brand');
assert(info.identifier === 'io.github.akihazhang.hoshitan', 'Plugin identifier should be independent from upstream');
assert(info.author && info.author.name === 'AkihaZhang', 'Plugin author metadata should name the fork maintainer');
assert(info.version === '0.1.0-dev.1', 'Testing builds should use the Hoshitan development version');
assert(info.ghRepo === 'AkihaZhang/hoshitan', 'GitHub updates should target the Hoshitan repository');
assert(info.preferenceDefaults.etymologyCollapseDefault === 'collapsed', 'Etymology should default collapsed globally');
assert(info.preferenceDefaults.wiktionaryEtymologyCollapseOverride === 'collapsed', 'Wiktionary/Kaikki override should default collapsed');
assert(info.preferenceDefaults.popupTheme === 'inherit', 'Popup theme should default to inheriting IINA appearance');
assert(info.preferenceDefaults.uiLanguage === 'auto', 'UI language should default to system detection');
assert(Object.prototype.hasOwnProperty.call(info.preferenceDefaults, 'customPopupCss'), 'Custom popup CSS preference should exist');
assert(info.preferenceDefaults.audioAutoPlay === false, 'Word audio auto-play should default off');
assert(/hoshi-reader\.manhhaoo-do\.workers\.dev/.test(info.preferenceDefaults.audioSourcesJson), 'Word audio should default to the Hoshi Reader online source');
assert(info.preferenceDefaults.localAudioEnabled === false, 'Local audio should be opt-in');
assert(Object.prototype.hasOwnProperty.call(info.preferenceDefaults, 'localAudioDatabasePath'), 'Local audio database path should be configurable');

const preferencesHtml = fs.readFileSync(path.join(root, 'preferences.html'), 'utf8');
assert(!/data-pref=/.test(preferencesHtml), 'IINA preferences page should not own profile settings');
assert(!/id="dictionaryList"/.test(preferencesHtml), 'Preferences should not own installed dictionary management');
assert(/Plugins -&gt; Hoshitan -&gt; Settings/.test(preferencesHtml) || /Plugins -> Hoshitan -> Settings/.test(preferencesHtml), 'Preferences should point users to Hoshitan Settings');

const managerHtml = fs.readFileSync(path.join(root, 'dictionary-manager.html'), 'utf8');
assert(/Hoshitan Settings/.test(managerHtml), 'Settings manager should use the plugin settings title');
assert(/data-profile-pref="lookupLanguage"/.test(managerHtml), 'Settings manager should expose per-profile language');
assert(/data-profile-pref="pauseWhilePopupVisible"/.test(managerHtml), 'Settings manager should expose per-profile playback settings');
assert(/data-profile-pref="audioAutoPlay"/.test(managerHtml), 'Settings manager should expose per-profile word audio auto-play');
assert(/id="audioSourceList"/.test(managerHtml), 'Settings manager should expose the word audio source list');
assert(/moveAudioSourceBefore/.test(managerHtml), 'Audio source priorities should support drag reordering');
assert(/audioSourcesJson/.test(managerHtml), 'Audio source priorities should be saved with profile preferences');
const addAudioSourceSource = managerHtml.slice(managerHtml.indexOf('function addAudioSource()'), managerHtml.indexOf('function updateAudioSourceUrl'));
assert(/firstSource\s*=\s*state\.audioSources\.length\s*===\s*0/.test(addAudioSourceSource), 'Adding audio sources should distinguish empty lists from custom additions');
assert(/url:\s*firstSource\s*\?\s*DEFAULT_AUDIO_SOURCE_URL\s*:\s*''/.test(addAudioSourceSource), 'The first audio source after deleting all sources should restore the Hoshi Reader source');
assert(/if\s*\(firstSource\)\s*saveAudioSources\(\)/.test(addAudioSourceSource), 'Restored default audio sources should be saved immediately');
assert(/data-profile-pref="scanLength"/.test(managerHtml), 'Settings manager should expose per-profile scan length');
assert(/data-profile-pref="popupTheme"/.test(managerHtml), 'Settings manager should expose per-profile popup color mode');
assert(/data-profile-pref="customPopupCss"/.test(managerHtml), 'Settings manager should expose per-profile custom popup CSS');
assert(/data-global-setting="lowRamImport"/.test(managerHtml), 'Settings manager should expose global dictionary import settings');
assert(/data-global-setting="ankiDeckName"/.test(managerHtml), 'Settings manager should expose the Anki deck');
assert(/data-global-setting="uiLanguage"/.test(managerHtml), 'Settings manager should expose UI language selection');
assert(/简体中文/.test(managerHtml), 'Settings manager should include Simplified Chinese');
assert(/function translateStaticDocument\(\)/.test(managerHtml), 'Settings manager should translate static UI text');
assert(/data-global-setting="ankiModelName"/.test(managerHtml), 'Settings manager should expose the Anki note type');
assert(/id="ankiAutoMap"/.test(managerHtml), 'Settings manager should offer automatic Anki field mapping');
assert(/id="ankiFieldMappings"/.test(managerHtml), 'Settings manager should render fields returned by AnkiConnect');
assert(/ankiFieldMappingsJson/.test(managerHtml), 'Settings manager should persist raw Anki field mappings');
assert(/data-no-i18n/.test(managerHtml), 'Raw Anki fields should be excluded from UI translation');
assert(/function saveAnkiFieldMappings\(\)/.test(managerHtml), 'Anki field mappings should save independently from unrelated settings');
assert(/appearance:\s*menulist/.test(managerHtml), 'Anki field mapping controls should use native selectable menus');
assert(/dictionary-manager-anki-refresh/.test(managerHtml), 'Settings manager should load Anki deck and field metadata');
assert(/data-panel="audio"/.test(managerHtml), 'Settings manager should expose a dedicated audio panel');
assert(/data-global-setting="localAudioEnabled"/.test(managerHtml), 'Settings manager should expose local audio');
assert(/data-global-setting="localAudioDatabasePath"/.test(managerHtml), 'Settings manager should expose the Hoshi Reader database path');
assert(/id="dictionaryList"/.test(managerHtml), 'Dictionary manager should include the installed dictionary list');
assert(/dictionary-manager-set-enabled/.test(managerHtml), 'Dictionary manager should toggle dictionary enabled state');
assert(/dictionary-manager-set-order/.test(managerHtml), 'Dictionary manager should save dictionary order');
assert(/dictionary-manager-delete/.test(managerHtml), 'Dictionary manager should expose per-dictionary deletion');
assert(/dictionary-manager-create-profile/.test(managerHtml), 'Settings manager should create profiles');
assert(/dictionary-manager-rename-profile/.test(managerHtml), 'Settings manager should rename profiles');
assert(/dictionary-manager-delete-profile/.test(managerHtml), 'Settings manager should delete profiles');
assert(/Delete/.test(managerHtml), 'Dictionary manager rows should include a delete button');
assert(/id="recommendedList"/.test(managerHtml), 'Settings manager should expose a recommended downloads list');
assert(/Import ZIP/.test(managerHtml), 'Dictionary manager should expose ZIP import');
assert(/typeof iina !== 'undefined'/.test(managerHtml), 'Dictionary manager should use the IINA webview message bridge');
assert(/id="profileSelect"/.test(managerHtml), 'Dictionary manager should expose profile selection');
assert(!/Import from Folder/.test(managerHtml), 'Dictionary manager should not expose manual folder import');
assert(!/Reveal Folder/.test(managerHtml), 'Dictionary manager should not expose manual folder reveal');
assert(
  /dictionary-manager-import-zip', \{\}, tr\('Opening ZIP picker\.\.\.'\), \{ busy: false, clearAfterMs: 5000 \}/.test(managerHtml),
  'Dictionary manager should not lock the UI while the ZIP picker is open'
);
assert(/clearAfterMs/.test(managerHtml), 'Transient dictionary manager statuses should be able to clear themselves');

const menuSource = fs.readFileSync(path.join(root, 'src/main/70_tests_menu.js'), 'utf8');
const rebuildMenu = menuSource.slice(menuSource.indexOf('function rebuildMenu()'));
assert(/t\("menu\.settings"\)/.test(rebuildMenu), 'Hoshitan menu should localize plugin settings');
assert(/setActiveDictionaryProfile/.test(rebuildMenu), 'Dictionary menu should be prepared to switch profiles');
assert(/const rootMenu = menu\.item\("Hoshitan"\)/.test(rebuildMenu), 'Hoshitan menu should be a submenu root');
assert(/menu\.item\(t\("menu\.profiles"\), null, \{ enabled: false \}\)/.test(rebuildMenu), 'Hoshitan submenu should localize the profile section');
assert(/const inlineProfileLimit = 5/.test(rebuildMenu), 'Hoshitan submenu should keep up to five profiles inline');
assert(/profiles\.length > inlineProfileLimit/.test(rebuildMenu), 'Hoshitan submenu should only add More after the inline profile limit is exceeded');
assert(/const moreMenu = menu\.item\(t\("menu\.more"\)\)/.test(rebuildMenu), 'Hoshitan submenu should add a localized More submenu for overflow profiles');
assert(
  rebuildMenu.indexOf('menu.item(t("menu.profiles"), null') < rebuildMenu.indexOf('const debugMenu = menu.item(t("menu.debug"))'),
  'Debug should appear after the profile section'
);
assert(
  rebuildMenu.indexOf('addSubMenuItemCompat(rootMenu, menu.separator());\n    const debugMenu = menu.item(t("menu.debug"))') > 0,
  'Debug should be separated from profiles by a native separator'
);
assert(!/menu\.item\("Dictionaries"/.test(rebuildMenu), 'Hoshitan menu should not nest profile switching under a Dictionaries submenu');
assert(!/Download Recommended Dictionaries/.test(rebuildMenu), 'Recommended downloads should live in settings, not the top menu');
assert(!/Toggle Hoshitan/.test(rebuildMenu), 'Hoshitan submenu should not place the toggle between profiles and Debug');
assert(!/for\s*\(\s*const\s+d\s+of\s+dicts\s*\)/.test(rebuildMenu), 'Dictionary menu should not list every installed dictionary');
assert(!/setDictionaryEnabled\(d\.name/.test(rebuildMenu), 'Dictionary menu should not toggle installed dictionaries directly');
assert(!/Import Yomitan Dictionary ZIP/.test(rebuildMenu), 'Dictionary ZIP import should live in the manager window');
assert(!/Import ZIP from Manual Import Folder/.test(rebuildMenu), 'Manual folder import should not be in the menu');
assert(/function runMenuAction\(label, action\)/.test(menuSource), 'Top menu actions should go through the guarded menu wrapper');
assert(/isPromiseLike\(result\)/.test(menuSource), 'Menu wrapper should catch async action failures');
assert(/addDebugMenuItem\(debugMenu, t\("menu\.filePicker"\)/.test(rebuildMenu), 'Debug menu entries should use localized guarded helpers');
assert(/function revealPathInFinder\(path, label\)/.test(menuSource), 'Debug reveal actions should share one reveal helper');
assert(/utils\.open\(p\)/.test(menuSource), 'Debug reveal actions should prefer the documented utils.open path');
assert(!/file\.showInFinder\(dataRoot\(\)\)/.test(rebuildMenu), 'Plugin data folder reveal should not rely on the older direct Finder call');

const managerBridgeSource = fs.readFileSync(path.join(root, 'src/main/65_dictionary_manager_window.js'), 'utf8');
const openDictionaryManagerSource = managerBridgeSource.slice(managerBridgeSource.indexOf('function openDictionaryManager()'));
assert(
  openDictionaryManagerSource.indexOf('standaloneWindow.loadFile("dictionary-manager.html")') < openDictionaryManagerSource.indexOf('registerDictionaryManagerHandlers()'),
  'Dictionary manager should load its webview before registering message handlers'
);
assert(/t\("settings\.title"\)/.test(openDictionaryManagerSource), 'Settings window should use the localized plugin settings title');
assert(/postDictionaryManagerStatus\(t\("manager\.selectionSaved"\)/.test(managerBridgeSource), 'Dictionary manager toggles should acknowledge persistence');
assert(/dictionary-manager-delete/.test(managerBridgeSource), 'Dictionary manager should handle delete commands');
assert(/dictionary-manager-rename-profile/.test(managerBridgeSource), 'Settings manager should handle profile rename commands');
assert(/dictionary-manager-delete-profile/.test(managerBridgeSource), 'Settings manager should handle profile delete commands');
assert(/dictionary-manager-update-global-settings/.test(managerBridgeSource), 'Settings manager should handle global import settings');
assert(/deleteDictionary\(String\(name\)\)/.test(managerBridgeSource), 'Dictionary manager delete commands should remove installed dictionaries');
assert(/function runDictionaryManagerZipImport\(\)/.test(managerBridgeSource), 'Dictionary ZIP import should use a picker-aware action path');
assert(!/postDictionaryManagerStatus\("Opening ZIP picker\.\.\."/.test(managerBridgeSource), 'ZIP picker opening status should be transient webview state only');
assert(/t\("manager\.importCancelled"\)/.test(managerBridgeSource), 'Dictionary manager should acknowledge cancelled ZIP imports');
assert(!/runDictionaryManagerAction\("Importing dictionary"/.test(managerBridgeSource), 'ZIP import should not enter busy state before file selection');

const lifecycleSource = fs.readFileSync(path.join(root, 'src/main/60_overlay_lifecycle_toggle.js'), 'utf8');
assert(/function reloadOverlayForProfileChange\(\)/.test(lifecycleSource), 'Profile changes should be able to reload the overlay');
assert(/function videoWindowAvailableForOverlayLoad\(\)/.test(lifecycleSource), 'Profile overlay reload should have a video-window availability guard');
assert(/core\.window\.loaded/.test(lifecycleSource), 'Profile overlay reload should check IINA window availability before overlay.loadFile');
assert(
  lifecycleSource.indexOf('if (!videoWindowAvailableForOverlayLoad())') < lifecycleSource.indexOf('initializeOverlay();'),
  'Profile overlay reload should skip initializeOverlay before iina.window-loaded'
);

console.log('settings and menu layout tests passed');

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
assert(/^0\.1\.0-dev\.\d+$/.test(info.version), 'Testing builds should use the Hoshitan development version');
assert(info.ghRepo === 'AkihaZhang/hoshitan', 'GitHub updates should target the Hoshitan repository');
assert(info.preferenceDefaults.etymologyCollapseDefault === 'collapsed', 'Etymology should default collapsed globally');
assert(info.preferenceDefaults.wiktionaryEtymologyCollapseOverride === 'collapsed', 'Wiktionary/Kaikki override should default collapsed');
assert(info.preferenceDefaults.popupTheme === 'inherit', 'Popup theme should default to inheriting IINA appearance');
assert(info.preferenceDefaults.uiLanguage === 'auto', 'UI language should default to system detection');
assert(Object.prototype.hasOwnProperty.call(info.preferenceDefaults, 'customPopupCss'), 'Custom popup CSS preference should exist');
assert(info.preferenceDefaults.audioAutoPlay === false, 'Word audio auto-play should default off');
assert(info.preferenceDefaults.audioProbeOnPopup === false, 'Popup audio probing should default off to avoid plugin-side process churn');
assert(/hoshi-reader\.manhhaoo-do\.workers\.dev/.test(info.preferenceDefaults.audioSourcesJson), 'Word audio should default to the Hoshi Reader online source');
assert(info.preferenceDefaults.localAudioEnabled === false, 'Local audio should be opt-in');
assert(Object.prototype.hasOwnProperty.call(info.preferenceDefaults, 'localAudioDatabasePath'), 'Local audio database path should be configurable');
assert(info.preferenceDefaults.fontScale <= 0.7, 'Hoshitan subtitle size should default compact enough for video overlays');
assert(info.preferenceDefaults.nativeSubtitleScale <= 0.7, 'IINA native subtitles should default to a reduced scale while Hoshitan is active');
assert(info.preferenceDefaults.popupTopMarginPx >= 48, 'Popup top safe margin should keep controls clear of the title bar');
assert(!Object.prototype.hasOwnProperty.call(info.preferenceDefaults, 'directWorkerIpc'), 'Removed worker IPC compatibility preference should not be in defaults');
assert(!Object.prototype.hasOwnProperty.call(info.preferenceDefaults, 'fallbackToClientExec'), 'Removed client executable lookup fallback should not be in defaults');
assert(!Object.prototype.hasOwnProperty.call(info.preferenceDefaults, 'allowClientExecLookup'), 'Removed client executable lookup opt-in should not be in defaults');
assert(info.preferenceDefaults.directIpcPollMs >= 16, 'Direct worker IPC polling should not default to a busy 2ms loop');
assert(info.preferenceDefaults.workerIdleSleepMs >= 30, 'Worker idle polling should not default to a busy 2ms loop');

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
assert(/data-profile-pref="nativeSubtitleScale"/.test(managerHtml), 'Settings manager should expose IINA native subtitle scale');
assert(/const liveProfilePreferenceIds = \{ fontScale: true, nativeSubtitleScale: true \}/.test(managerHtml), 'Subtitle size settings should opt into live preference saving');
assert(/addEventListener\('input', scheduleProfilePreferencesSave\)/.test(managerHtml), 'Subtitle size changes should save while typing');
assert(/data-profile-pref="popupMaxWidth"/.test(managerHtml), 'Settings manager should expose popup width in pixels');
assert(/data-profile-pref="popupMaxHeight"/.test(managerHtml), 'Settings manager should expose popup height in pixels');
assert(/data-profile-pref="popupTopMarginPx"/.test(managerHtml), 'Settings manager should expose popup top safe margin');
assert(/data-profile-pref="customPopupCss"/.test(managerHtml), 'Settings manager should expose per-profile custom popup CSS');
assert(/data-profile-pref="audioProbeOnPopup"/.test(managerHtml), 'Settings manager should expose popup audio probing as an opt-in');
assert(!/data-profile-pref="directWorkerIpc"/.test(managerHtml), 'Settings manager should not expose removed directWorkerIpc preference');
assert(!/data-profile-pref="allowClientExecLookup"/.test(managerHtml), 'Settings manager should not expose client executable lookup fallback on interactive lookup paths');
assert(!/fallbackToClientExec|client executable lookup fallback|Use direct worker IPC/.test(managerHtml), 'Settings manager should not include removed worker compatibility labels');
assert(/id="directIpcPollMs"[^>]*min="16"[^>]*max="250"/.test(managerHtml), 'Direct IPC polling setting should enforce a conservative lower bound');
assert(/id="workerIdleSleepMs"[^>]*min="30"[^>]*max="250"/.test(managerHtml), 'Worker idle sleep setting should enforce a conservative lower bound');
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
assert(/input\.setAttribute\('list', 'ankiMappingSuggestions'\)/.test(managerHtml), 'Anki field mappings should allow manual text entry with suggestions');
assert(/document\.createElement\('datalist'\)/.test(managerHtml), 'Anki field mappings should retain selectable placeholder suggestions');
assert(/input\.addEventListener\('blur', commitMapping\)/.test(managerHtml), 'Manual Anki field mappings should save when focus leaves the field');
assert(/event\.key !== 'Enter'/.test(managerHtml), 'Manual Anki field mappings should save on Enter');
assert(/dictionary-manager-anki-refresh/.test(managerHtml), 'Settings manager should load Anki deck and field metadata');
assert(/function ankiMappingOptions\(\)/.test(managerHtml), 'Settings manager should centralize Hoshi-compatible Anki mapping options');
assert(/single-glossary-/.test(managerHtml), 'Settings manager should add per-dictionary glossary mappings');
assert(!/\['\{book-cover\}', '\{book-cover\}'\]/.test(managerHtml), 'Settings should not expose the legacy book-cover mapping');
assert(!/\['\{sasayaki-audio\}', '\{sasayaki-audio\}'\]/.test(managerHtml), 'Settings should not expose the legacy sasayaki-audio mapping');
assert(/picture:\s*'\{image\}'/.test(managerHtml), 'Picture fields should auto-map to the canonical image mapping');
assert(!/definitionpicture:\s*'\{image\}'/.test(managerHtml), 'DefinitionPicture should not receive the video screenshot by default');
assert(/sentenceaudio:\s*'\{sentence-audio\}'/.test(managerHtml), 'SentenceAudio should auto-map to the canonical sentence-audio mapping');
assert(/iswordandsentencecard:\s*'X'/.test(managerHtml), 'Lapis card type fields should default to a word-and-sentence card');
assert(/frequency:\s*'\{frequencies-html\}'/.test(managerHtml), 'Lapis Frequency should receive HTML frequency metadata');
assert(/freqsort:\s*'\{frequency-harmonic-rank\}'/.test(managerHtml), 'Lapis FreqSort should receive the sortable harmonic rank');
assert(/\{frequency-harmonic-rank\}/.test(managerHtml), 'Settings manager should expose frequency metadata mappings');
assert(/\{frequencies-html\}/.test(managerHtml), 'Settings manager should expose HTML frequency metadata mappings');
assert(/\{pitch-accent-categories\}/.test(managerHtml), 'Settings manager should expose pitch accent mappings');
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

const backendSource = fs.readFileSync(path.join(root, 'src/main/30_backend_import_worker_lookup.js'), 'utf8');
assert(/function configuredWorkerIdleSleepMs\(\)/.test(backendSource), 'Worker startup should use a bounded idle sleep helper');
assert(/WORKER_IDLE_SLEEP_MS_MIN/.test(backendSource), 'Worker idle sleep should clamp saved legacy values below the safe lower bound');
assert(/function configuredDirectIpcPollMs\(\)/.test(backendSource), 'Direct IPC response polling should use a bounded helper');
assert(/DIRECT_IPC_POLL_MS_MIN/.test(backendSource), 'Direct IPC polling should clamp saved legacy values below the safe lower bound');
assert(!/directWorkerIpc|fallbackToClientExec|allowClientExecLookup/.test(backendSource), 'Interactive lookup source should not read removed exec fallback preferences');
const lookupViaWorkerSource = backendSource.slice(backendSource.indexOf('async function lookupViaWorker'), backendSource.indexOf('function glossaryTagsIndicateNonLemma'));
assert(/runWorkerQueueLookupDirect/.test(lookupViaWorkerSource), 'Interactive lookup should use the persistent worker queue');
assert(!/runWorkerLookupViaClientExec/.test(lookupViaWorkerSource), 'Interactive lookup must not fall back to client executable lookup');

const lifecycleSource = fs.readFileSync(path.join(root, 'src/main/60_overlay_lifecycle_toggle.js'), 'utf8');
assert(/function reloadOverlayForProfileChange\(\)/.test(lifecycleSource), 'Profile changes should be able to reload the overlay');
assert(/function videoWindowAvailableForOverlayLoad\(\)/.test(lifecycleSource), 'Profile overlay reload should have a video-window availability guard');
assert(/core\.window\.loaded/.test(lifecycleSource), 'Profile overlay reload should check IINA window availability before overlay.loadFile');
assert(
  lifecycleSource.indexOf('if (!videoWindowAvailableForOverlayLoad())') < lifecycleSource.indexOf('initializeOverlay();'),
  'Profile overlay reload should skip initializeOverlay before iina.window-loaded'
);
assert(/registerInputShortcut\("SPACE", "play\/pause"/.test(lifecycleSource), 'Video shortcuts should include Space play/pause');
assert(/registerInputShortcut\("LEFT", "seek backward 5 seconds"/.test(lifecycleSource), 'Video shortcuts should include Left seek');
assert(/registerInputShortcut\("\[", "previous subtitle"/.test(lifecycleSource), 'Video shortcuts should include previous subtitle');
assert(/registerInputShortcut\("ESC", "close lookup popup"/.test(lifecycleSource), 'Video shortcuts should include Escape popup close');
assert(/registerInputShortcut\("Meta\+w", "close video"/.test(lifecycleSource), 'Video shortcuts should include Command-W stop/back');
assert(/core\.seek\(-5, true\)/.test(lifecycleSource), 'Video seek shortcuts should use the typed IINA core API');
assert(/mpv\.command\("sub-seek", \["-1"\]\)/.test(lifecycleSource), 'Subtitle seek command arguments should be strings');
assert(/core\.stop\(\)/.test(lifecycleSource), 'Command-W should use the typed IINA core stop API');
assert(!/mpv\.command\([^;\n]*\[\s*\]\)/.test(lifecycleSource), 'IINA mpv commands must not receive untyped empty JavaScript arrays');
assert(!/mpv\.command\([^;\n]*\[\s*-?\d/.test(lifecycleSource), 'IINA mpv command arrays must not contain JavaScript numbers');

const subtitleSource = fs.readFileSync(path.join(root, 'src/main/10_subtitle_text_style.js'), 'utf8');
assert(/function configuredNativeSubtitleScale\(\)/.test(subtitleSource), 'Native subtitle scale should be configurable');
assert(/mpv\.set\("sub-scale"/.test(subtitleSource), 'Native subtitle scale should be applied through mpv');
const canHideSource = subtitleSource.slice(
  subtitleSource.indexOf('function canHideNativeSubtitlesForCurrentLanguage()'),
  subtitleSource.indexOf('function syncNativeSubtitleVisibility()')
);
assert(!/activeDictionaryPaths|readManifest|readWorkerReady|file\.read/.test(canHideSource), 'Native subtitle visibility checks must not read files on the subtitle polling hot path');
const pollSource = subtitleSource.slice(
  subtitleSource.indexOf('function pollSubtitle(options)'),
  subtitleSource.indexOf('function charsOf(text)')
);
assert(!/syncNativeSubtitleVisibility\(\)/.test(pollSource), 'Subtitle polling must not synchronize native subtitle visibility on every tick');

console.log('settings and menu layout tests passed');

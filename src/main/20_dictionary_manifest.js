const DEFAULT_PROFILE_ID = "default";
const DEFAULT_AUDIO_SOURCE_URL = "https://hoshi-reader.manhhaoo-do.workers.dev/?term={term}&reading={reading}";
const DEFAULT_AUDIO_SOURCES_JSON = JSON.stringify([{ name: "Hoshi Reader", url: DEFAULT_AUDIO_SOURCE_URL }]);
const SHORTCUT_ACTION_DEFINITIONS = [
  { id: "toggleHoshitan", label: "Toggle Hoshitan", defaultKey: "Shift+H" },
  { id: "playPause", label: "Play / pause", defaultKey: "Space" },
  { id: "seekBackward5", label: "Seek backward 5 seconds", defaultKey: "Left" },
  { id: "seekForward5", label: "Seek forward 5 seconds", defaultKey: "Right" },
  { id: "previousSubtitle", label: "Previous subtitle", defaultKey: "[" },
  { id: "nextSubtitle", label: "Next subtitle", defaultKey: "]" },
  { id: "toggleSubtitleDisplay", label: "Toggle subtitle display", defaultKey: "S" },
  { id: "toggleFullscreen", label: "Toggle fullscreen", defaultKey: "F" },
  { id: "closePopup", label: "Close popup", defaultKey: "Esc" },
  { id: "closeVideo", label: "Close video / return", defaultKey: "Cmd+W" }
];
const DEFAULT_KEYBOARD_SHORTCUTS_JSON = JSON.stringify(shortcutDefaultMap());
const DIRECT_IPC_POLL_MS_DEFAULT = 16;
const DIRECT_IPC_POLL_MS_MIN = 16;
const DIRECT_IPC_POLL_MS_MAX = 250;
const WORKER_IDLE_SLEEP_MS_DEFAULT = 30;
const WORKER_IDLE_SLEEP_MS_MIN = 30;
const WORKER_IDLE_SLEEP_MS_MAX = 250;
const PROFILE_PREFERENCE_DEFAULTS = {
  enabledByDefault: true,
  hideNativeSubtitles: true,
  pauseWhilePopupVisible: true,
  audioAutoPlay: false,
  audioProbeOnPopup: false,
  audioSourcesJson: DEFAULT_AUDIO_SOURCES_JSON,
  keyboardShortcutsJson: DEFAULT_KEYBOARD_SHORTCUTS_JSON,
  lookupLanguage: "ja",
  scanLength: 24,
  maxEntries: 3,
  maxGlossesPerEntry: 4,
  lookupTimeoutMs: 9000,
  fontScale: 0.65,
  nativeSubtitleScale: 0.65,
  popupScale: 0.92,
  popupMaxWidth: 440,
  popupMaxHeight: 520,
  popupMaxHeightVh: 34,
  popupSubtitleGapPx: 34,
  popupTopMarginPx: 56,
  popupTheme: "inherit",
  subtitlePollMs: 120,
  etymologyCollapseDefault: "collapsed",
  wiktionaryEtymologyCollapseOverride: "collapsed",
  customPopupCss: "",
  hoverRequestTimeoutMs: 15000,
  backendTimeoutMs: 30000,
  debugLogEnabled: true,
  debugLogVerbose: false,
  directIpcPollMs: DIRECT_IPC_POLL_MS_DEFAULT,
  workerIdleSleepMs: WORKER_IDLE_SLEEP_MS_DEFAULT
};
const PROFILE_PREFERENCE_KEYS = Object.keys(PROFILE_PREFERENCE_DEFAULTS);
const GLOBAL_SETTINGS_DEFAULTS = {
  lowRamImport: true,
  importTimeoutMs: 1800000,
  uiLanguage: "auto",
  uiTheme: "auto",
  ankiConnectUrl: "http://127.0.0.1:8765",
  ankiApiKey: "",
  ankiDeckName: "Default",
  ankiModelName: "Basic",
  ankiFieldMappingsJson: "{}",
  ankiFieldSentence: "Front",
  ankiFieldExpression: "",
  ankiFieldReading: "",
  ankiFieldDefinition: "Back",
  ankiFieldImage: "",
  ankiFieldAudio: "",
  ankiFieldSource: "",
  ankiTags: "hoshitan",
  ankiAllowDuplicate: false,
  ankiIncludeScreenshot: true,
  ankiIncludeAudio: true,
  ankiAudioPaddingMs: 120,
  ankiFfmpegPath: "/opt/homebrew/bin/ffmpeg",
  localAudioEnabled: false,
  localAudioDatabasePath: ""
};
const GLOBAL_SETTINGS_KEYS = Object.keys(GLOBAL_SETTINGS_DEFAULTS);

function normalizeAudioSourceUrl(value) {
  const url = String(value || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return "";
  return url;
}
function normalizeAudioSourceItem(source) {
  const raw = typeof source === "string" ? { url: source } : (source && typeof source === "object" ? source : {});
  const url = normalizeAudioSourceUrl(raw.url);
  if (!url) return null;
  const name = String(raw.name || "").trim();
  return name ? { name, url } : { url };
}
function normalizeAudioSources(value) {
  let raw = value;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    try { raw = JSON.parse(text); } catch (_) { raw = text; }
  }
  if (raw && typeof raw === "object" && Array.isArray(raw.audioSources)) raw = raw.audioSources;
  const values = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const seen = Object.create(null);
  const out = [];
  values.forEach(item => {
    const normalized = normalizeAudioSourceItem(item);
    if (!normalized || seen[normalized.url]) return;
    seen[normalized.url] = true;
    out.push(normalized);
  });
  return out;
}
function normalizeAudioSourcesJsonPreference(value, useDefaultWhenEmpty) {
  const sources = normalizeAudioSources(value);
  if (!sources.length && useDefaultWhenEmpty) return DEFAULT_AUDIO_SOURCES_JSON;
  return JSON.stringify(sources);
}
function normalizeProfilePreferenceBoolValue(value, fallback) {
  if (typeof preferenceValueToBool === "function") return preferenceValueToBool(value, fallback);
  if (value === undefined || value === null || value === "") return !!fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return !!fallback;
    if (["true", "1", "yes", "on"].indexOf(normalized) >= 0) return true;
    if (["false", "0", "no", "off"].indexOf(normalized) >= 0) return false;
  }
  return !!value;
}
function normalizeProfilePreferenceNumberValue(value, fallback, minValue, maxValue) {
  const number = Number(value);
  const fallbackNumber = Number(fallback);
  const minNumber = Number(minValue);
  const maxNumber = Number(maxValue);
  let out = Number.isFinite(number) ? number : fallbackNumber;
  if (!Number.isFinite(out)) out = 0;
  if (Number.isFinite(minNumber)) out = Math.max(minNumber, out);
  if (Number.isFinite(maxNumber)) out = Math.min(maxNumber, out);
  return out;
}
function shortcutDefaultMap() {
  const out = {};
  SHORTCUT_ACTION_DEFINITIONS.forEach(action => {
    out[action.id] = action.defaultKey;
  });
  return out;
}
function shortcutDefinitionById(id) {
  const key = String(id || "");
  for (let i = 0; i < SHORTCUT_ACTION_DEFINITIONS.length; i++) {
    if (SHORTCUT_ACTION_DEFINITIONS[i].id === key) return SHORTCUT_ACTION_DEFINITIONS[i];
  }
  return null;
}
function normalizeShortcutBaseName(value) {
  const raw = String(value || "").trim();
  const compact = raw.replace(/\s+/g, "");
  const lower = compact.toLowerCase();
  if (!compact) return "";
  if (lower === "space" || lower === "spacebar") return "Space";
  if (lower === "esc" || lower === "escape") return "Esc";
  if (lower === "left" || lower === "arrowleft") return "Left";
  if (lower === "right" || lower === "arrowright") return "Right";
  if (lower === "up" || lower === "arrowup") return "Up";
  if (lower === "down" || lower === "arrowdown") return "Down";
  if (lower === "return" || lower === "enter") return "Enter";
  if (lower === "tab") return "Tab";
  if (/^[a-z]$/i.test(compact)) return compact.toUpperCase();
  return compact;
}
function normalizeShortcutModifierName(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "cmd" || raw === "command" || raw === "meta" || raw === "super") return "Cmd";
  if (raw === "control" || raw === "ctrl") return "Ctrl";
  if (raw === "option" || raw === "alt") return "Alt";
  if (raw === "shift") return "Shift";
  return raw ? String(value || "").trim() : "";
}
function normalizeShortcutDisplayKey(value, fallback) {
  const fallbackText = String(fallback || "").trim();
  const text = String(value === undefined || value === null ? "" : value).trim();
  const raw = text || fallbackText;
  if (!raw) return "";
  const parts = raw.replace(/\s+/g, "").split("+").filter(Boolean);
  if (!parts.length) return fallbackText;
  const base = normalizeShortcutBaseName(parts[parts.length - 1]);
  if (!base) return fallbackText;
  const seen = Object.create(null);
  const modifiers = [];
  for (let i = 0; i < parts.length - 1; i++) {
    const modifier = normalizeShortcutModifierName(parts[i]);
    if (!modifier || seen[modifier]) continue;
    seen[modifier] = true;
    modifiers.push(modifier);
  }
  return modifiers.concat([base]).join("+");
}
function normalizeKeyboardShortcuts(value) {
  let raw = value;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) raw = {};
    else {
      try { raw = JSON.parse(text); } catch (_) { raw = {}; }
    }
  }
  if (raw && typeof raw === "object" && raw.shortcuts && typeof raw.shortcuts === "object") raw = raw.shortcuts;
  if (Array.isArray(raw)) {
    const mapped = {};
    raw.forEach(item => {
      if (!item || typeof item !== "object") return;
      const id = String(item.id || item.action || "").trim();
      const key = item.key !== undefined ? item.key : item.shortcut;
      if (id) mapped[id] = key;
    });
    raw = mapped;
  }
  const source = raw && typeof raw === "object" ? raw : {};
  const out = shortcutDefaultMap();
  SHORTCUT_ACTION_DEFINITIONS.forEach(action => {
    const configured = Object.prototype.hasOwnProperty.call(source, action.id) ? source[action.id] : out[action.id];
    out[action.id] = normalizeShortcutDisplayKey(configured, action.defaultKey);
  });
  return out;
}
function normalizeKeyboardShortcutsJsonPreference(value) {
  return JSON.stringify(normalizeKeyboardShortcuts(value));
}
function shortcutActionSummaries() {
  return SHORTCUT_ACTION_DEFINITIONS.map(action => ({
    id: action.id,
    label: action.label,
    defaultKey: action.defaultKey
  }));
}
function emptyManifest() {
  return { dictionaries: {}, disabled: {}, dictionaryOrder: [], activeProfileId: DEFAULT_PROFILE_ID, profiles: {} };
}
function normalizeDictionaryOrder(order) {
  const seen = Object.create(null);
  const out = [];
  if (!Array.isArray(order)) return out;
  order.forEach(name => {
    const key = String(name || "").trim();
    if (key && !seen[key]) {
      seen[key] = true;
      out.push(key);
    }
  });
  return out;
}
function normalizeDisabledMap(map) {
  const out = {};
  if (!map || typeof map !== "object") return out;
  Object.keys(map).forEach(name => {
    if (map[name]) out[name] = true;
  });
  return out;
}
function normalizeProfilePreferences(prefs) {
  const out = {};
  PROFILE_PREFERENCE_KEYS.forEach(key => { out[key] = PROFILE_PREFERENCE_DEFAULTS[key]; });
  if (!prefs || typeof prefs !== "object") return out;
  const hasAudioSources = Object.prototype.hasOwnProperty.call(prefs, "audioSourcesJson");
  PROFILE_PREFERENCE_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(prefs, key)) out[key] = prefs[key];
  });
  out.audioAutoPlay = normalizeProfilePreferenceBoolValue(out.audioAutoPlay, PROFILE_PREFERENCE_DEFAULTS.audioAutoPlay);
  out.audioProbeOnPopup = normalizeProfilePreferenceBoolValue(out.audioProbeOnPopup, PROFILE_PREFERENCE_DEFAULTS.audioProbeOnPopup);
  out.audioSourcesJson = normalizeAudioSourcesJsonPreference(out.audioSourcesJson, !hasAudioSources);
  out.keyboardShortcutsJson = normalizeKeyboardShortcutsJsonPreference(out.keyboardShortcutsJson);
  out.directIpcPollMs = normalizeProfilePreferenceNumberValue(out.directIpcPollMs, DIRECT_IPC_POLL_MS_DEFAULT, DIRECT_IPC_POLL_MS_MIN, DIRECT_IPC_POLL_MS_MAX);
  out.workerIdleSleepMs = normalizeProfilePreferenceNumberValue(out.workerIdleSleepMs, WORKER_IDLE_SLEEP_MS_DEFAULT, WORKER_IDLE_SLEEP_MS_MIN, WORKER_IDLE_SLEEP_MS_MAX);
  return out;
}
function makeDefaultProfile(id, name) {
  const profileId = String(id || DEFAULT_PROFILE_ID);
  return { id: profileId, name: String(name || "Profile 1"), dictionaryOrder: [], disabled: {}, preferences: normalizeProfilePreferences({}) };
}
function normalizeManifestProfile(id, profile, manifest, existed) {
  const profileId = String(id || DEFAULT_PROFILE_ID);
  const source = profile && typeof profile === "object" ? profile : {};
  const fallbackFromRoot = !existed && (profileId === String(manifest.activeProfileId || DEFAULT_PROFILE_ID) || profileId === DEFAULT_PROFILE_ID);
  const fallback = makeDefaultProfile(profileId, profileId === DEFAULT_PROFILE_ID ? "Default" : profileId);
  return {
    id: profileId,
    name: String(source.name || fallback.name),
    dictionaryOrder: normalizeDictionaryOrder(
      Array.isArray(source.dictionaryOrder) ? source.dictionaryOrder :
        fallbackFromRoot ? manifest.dictionaryOrder : []
    ),
    disabled: normalizeDisabledMap(
      source.disabled && typeof source.disabled === "object" ? source.disabled :
        fallbackFromRoot ? manifest.disabled : {}
    ),
    preferences: normalizeProfilePreferences(source.preferences)
  };
}
function normalizeManifestShape(manifest) {
  const out = manifest && typeof manifest === "object" ? manifest : emptyManifest();
  if (!out.dictionaries || typeof out.dictionaries !== "object") out.dictionaries = {};
  out.disabled = normalizeDisabledMap(out.disabled);
  out.dictionaryOrder = normalizeDictionaryOrder(out.dictionaryOrder);
  out.activeProfileId = String(out.activeProfileId || DEFAULT_PROFILE_ID);
  const sourceProfiles = out.profiles && typeof out.profiles === "object" ? out.profiles : {};
  const profiles = {};
  Object.keys(sourceProfiles).forEach(id => {
    profiles[id] = normalizeManifestProfile(id, sourceProfiles[id], out, true);
  });
  if (!profiles[out.activeProfileId]) profiles[out.activeProfileId] = normalizeManifestProfile(out.activeProfileId, null, out, false);
  if (!profiles[DEFAULT_PROFILE_ID]) profiles[DEFAULT_PROFILE_ID] = normalizeManifestProfile(DEFAULT_PROFILE_ID, null, out, false);
  out.profiles = profiles;
  const active = profiles[out.activeProfileId] || profiles[DEFAULT_PROFILE_ID];
  out.disabled = normalizeDisabledMap(active.disabled);
  out.dictionaryOrder = normalizeDictionaryOrder(active.dictionaryOrder);
  return out;
}
function activeDictionaryProfile(manifest) {
  const normalized = normalizeManifestShape(manifest || readManifest());
  return normalized.profiles[normalized.activeProfileId] || normalized.profiles[DEFAULT_PROFILE_ID] || makeDefaultProfile(DEFAULT_PROFILE_ID, "Default");
}
function activeProfilePreferenceValue(key, fallback) {
  const preferenceKey = String(key || "");
  const fallbackValue = Object.prototype.hasOwnProperty.call(PROFILE_PREFERENCE_DEFAULTS, preferenceKey) ? PROFILE_PREFERENCE_DEFAULTS[preferenceKey] : fallback;
  const profile = activeDictionaryProfile(readManifest());
  const prefs = normalizeProfilePreferences(profile.preferences);
  if (Object.prototype.hasOwnProperty.call(prefs, preferenceKey)) return prefs[preferenceKey];
  return fallbackValue;
}
function activeProfilePreferenceBool(key, fallback) {
  const preferenceKey = String(key || "");
  const fallbackValue = Object.prototype.hasOwnProperty.call(PROFILE_PREFERENCE_DEFAULTS, preferenceKey) ? PROFILE_PREFERENCE_DEFAULTS[preferenceKey] : fallback;
  try {
    return preferenceValueToBool(activeProfilePreferenceValue(preferenceKey, fallbackValue), fallbackValue);
  } catch (_) {
    return prefBool(preferenceKey, fallbackValue);
  }
}
function profileSummaries(manifest) {
  const normalized = normalizeManifestShape(manifest || readManifest());
  return Object.keys(normalized.profiles).sort((a, b) => {
    if (a === normalized.activeProfileId) return -1;
    if (b === normalized.activeProfileId) return 1;
    if (a === DEFAULT_PROFILE_ID) return -1;
    if (b === DEFAULT_PROFILE_ID) return 1;
    return String(normalized.profiles[a].name || a).localeCompare(String(normalized.profiles[b].name || b));
  }).map(id => ({
    id,
    name: normalized.profiles[id].name || id,
    active: id === normalized.activeProfileId,
    locked: id === DEFAULT_PROFILE_ID
  }));
}
function activeProfileDisabledMap(manifest) {
  return normalizeDisabledMap(activeDictionaryProfile(manifest).disabled);
}
function activeProfileDictionaryOrder(manifest) {
  return normalizeDictionaryOrder(activeDictionaryProfile(manifest).dictionaryOrder);
}
function updateActiveProfile(manifest, updater) {
  const normalized = normalizeManifestShape(manifest || readManifest());
  const profile = activeDictionaryProfile(normalized);
  updater(profile, normalized);
  profile.dictionaryOrder = normalizeDictionaryOrder(profile.dictionaryOrder);
  profile.disabled = normalizeDisabledMap(profile.disabled);
  profile.preferences = normalizeProfilePreferences(profile.preferences);
  normalized.profiles[profile.id] = profile;
  normalized.dictionaryOrder = profile.dictionaryOrder.slice();
  normalized.disabled = normalizeDisabledMap(profile.disabled);
  return normalized;
}
function dictionaryOrderWithInstalledNames(requestedOrder, installedNames) {
  const installedSeen = Object.create(null);
  const installed = (installedNames || []).map(name => String(name || "")).filter(Boolean);
  installed.forEach(name => { installedSeen[name] = true; });
  const out = [];
  const used = Object.create(null);
  normalizeDictionaryOrder(requestedOrder).forEach(name => {
    if (installedSeen[name] && !used[name]) {
      used[name] = true;
      out.push(name);
    }
  });
  installed.forEach(name => {
    if (!used[name]) {
      used[name] = true;
      out.push(name);
    }
  });
  return out;
}
function orderedDictionaryDirs(installed, manifest) {
  const dicts = (installed || []).slice();
  const order = activeProfileDictionaryOrder(manifest);
  if (!order.length) return dicts;
  const byName = Object.create(null);
  dicts.forEach(d => { if (d && d.name) byName[d.name] = d; });
  const used = Object.create(null);
  const out = [];
  order.forEach(name => {
    if (byName[name] && !used[name]) {
      used[name] = true;
      out.push(byName[name]);
    }
  });
  dicts.forEach(d => {
    if (d && d.name && !used[d.name]) out.push(d);
  });
  return out;
}

function readManifest() {
  try {
    if (!file.exists(manifestPath())) return normalizeManifestShape(emptyManifest());
    const parsed = JSON.parse(file.read(manifestPath()));
    return normalizeManifestShape(parsed);
  } catch (_) { return normalizeManifestShape(emptyManifest()); }
}
function writeManifest(manifest) {
  try { file.write(manifestPath(), JSON.stringify(normalizeManifestShape(manifest), null, 2)); } catch (error) { console.warn("Could not write manifest: " + compactError(error)); }
}
function readDictionaryIndexMetadata(dictPath) {
  try {
    const indexPath = pathJoin(dictPath, "index.json");
    if (!file.exists(indexPath)) return {};
    const parsed = JSON.parse(file.read(indexPath));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    debugWarn("Could not read dictionary index metadata for " + String(dictPath || "") + ": " + compactError(error));
    return {};
  }
}
function normalizeDictionaryLanguage(value) {
  const lang = String(value || "").trim().toLowerCase();
  if (!lang) return "";
  if (/^(ja|jpn|jp|japanese)$/.test(lang)) return "ja";
  if (/^(en|eng|english)$/.test(lang)) return "en";
  if (/^(fr|fra|fre|french|francais|français)$/.test(lang)) return "fr";
  if (/^(de|deu|ger|german|deutsch)$/.test(lang)) return "de";
  if (/^(ko|kor|korean)$/.test(lang)) return "ko";
  if (/^(zh|zho|chi|cmn|yue|wuu|hak|nan|chinese|mandarin|cantonese|hanzi|hanyu|zhongwen)$/.test(lang)) return "zh";
  return lang;
}
function dictionaryLanguageFromMetadata(meta, manifestEntry) {
  const candidates = [
    meta && meta.language,
    meta && meta.lang,
    meta && meta.sourceLanguage,
    meta && meta.source_language,
    meta && meta.targetLanguage,
    meta && meta.target_language,
    manifestEntry && manifestEntry.language
  ];
  for (const candidate of candidates) {
    const normalized = normalizeDictionaryLanguage(candidate);
    if (normalized) return normalized;
  }
  return "unknown";
}
function filenameFromListPath(listPath) {
  return String(listPath || "").split(/[\\/]/).filter(Boolean).pop() || "";
}
function dictionaryListItemName(item) {
  const name = String((item && item.filename) || filenameFromListPath(item && item.path) || "").trim();
  if (!name || name === "." || name === ".." || /[\\/]/.test(name)) return "";
  return name;
}
function dictionaryListItemPath(item) {
  const name = dictionaryListItemName(item);
  return name ? pathJoin(dictRoot(), name) : "";
}
function unorderedDictionaryDirs() {
  try {
    if (!file.exists(dictRoot())) return [];
    const manifest = readManifest();
    return file.list(dictRoot(), { includeSubDir: false })
      .filter(item => item && item.isDir && dictionaryListItemName(item))
      .map(item => {
        const name = dictionaryListItemName(item);
        const dictPath = dictionaryListItemPath(item);
        const meta = readDictionaryIndexMetadata(dictPath);
        const manifestEntry = (manifest.dictionaries && (manifest.dictionaries[name] || manifest.dictionaries[meta.title])) || {};
        return {
          name,
          path: dictPath,
          title: meta.title || name,
          revision: meta.revision || "",
          format: meta.format || null,
          indexUrl: meta.indexUrl || "",
          downloadUrl: meta.downloadUrl || "",
          language: dictionaryLanguageFromMetadata(meta, manifestEntry),
          termCount: Number(manifestEntry.termCount || 0),
          metaCount: Number(manifestEntry.metaCount || 0),
          tagCount: Number(manifestEntry.tagCount || 0),
          mediaCount: Number(manifestEntry.mediaCount || 0),
          pitchCount: Number(manifestEntry.pitchCount || 0),
          freqCount: Number(manifestEntry.freqCount || 0)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn("Could not list dictionaries: " + compactError(error));
    return [];
  }
}
function dictionaryDirs() {
  const manifest = readManifest();
  return orderedDictionaryDirs(unorderedDictionaryDirs(), manifest);
}
function disabledDictionaryMap(manifest) { return activeProfileDisabledMap(manifest || readManifest()); }
function dictionaryCompatibilityDetails(language, installed) {
  const lang = language || selectedLanguageModule();
  const dicts = installed || dictionaryDirs();
  const out = { compatible: [], unknown: [], incompatible: [] };
  if (!lang || lang.id === "ja" || typeof lang.dictionaryMatches !== "function") {
    out.compatible = dicts.slice();
    return out;
  }
  dicts.forEach(d => {
    try {
      if (d && d.language && d.language !== "unknown") {
        if (d.language === lang.id) out.compatible.push(d);
        else out.incompatible.push(d);
        return;
      }
      if (lang.dictionaryMatches(d)) out.compatible.push(d);
      else out.unknown.push(d);
    } catch (error) {
      debugWarn("Dictionary compatibility check failed language=" + String(lang.id || "") + " dict=" + String(d && d.name || "") + ": " + compactError(error));
      out.unknown.push(d);
    }
  });
  return out;
}
function languageCompatibleDictionaries(language, installed) {
  return dictionaryCompatibilityDetails(language, installed).compatible;
}
function activeDictionaryEntries(language) {
  const installed = dictionaryDirs();
  const disabled = disabledDictionaryMap();
  const seen = Object.create(null);
  const out = [];
  installed.filter(d => !disabled[d.name]).forEach(d => {
    const p = pathJoin(dictRoot(), d.name);
    if (!seen[p]) { seen[p] = true; out.push(d); }
  });
  return out;
}
function dictionaryTypes(entry) {
  const types = [];
  if (Number(entry && entry.termCount || 0) > 0) types.push("term");
  if (Number(entry && entry.freqCount || 0) > 0) types.push("frequency");
  if (Number(entry && entry.pitchCount || 0) > 0) types.push("pitch");
  return types;
}
function dictionaryPrimaryType(entry) {
  const types = dictionaryTypes(entry);
  if (types.indexOf("term") >= 0) return "term";
  if (types.indexOf("frequency") >= 0) return "frequency";
  if (types.indexOf("pitch") >= 0) return "pitch";
  return "term";
}
function emptyDictionaryGroups() {
  return { term: [], frequency: [], pitch: [] };
}
function activeDictionaryGroups(language) {
  const groups = emptyDictionaryGroups();
  activeDictionaryEntries(language).forEach(entry => {
    const p = pathJoin(dictRoot(), entry.name);
    const types = dictionaryTypes(entry);
    if (!types.length) types.push("term");
    types.forEach(type => {
      if (!groups[type]) groups[type] = [];
      groups[type].push(p);
    });
  });
  return groups;
}
function activeDictionaryPaths(language) {
  return activeDictionaryEntries(language).map(d => pathJoin(dictRoot(), d.name));
}
function activeDictionaryStyles(language) {
  const entries = activeDictionaryEntries(language);
  const cacheKey = entries.map(entry => String(entry.path || pathJoin(dictRoot(), entry.name))).join("\n");
  const now = Date.now();
  if (cacheKey === dictionaryStylesCacheKey && now - dictionaryStylesCacheAt < DICTIONARY_STYLES_CACHE_MS) {
    return dictionaryStylesCacheValue;
  }
  const styles = {};
  let totalBytes = 0;
  entries.forEach(entry => {
    if (totalBytes >= 300000) return;
    const dictPath = String(entry.path || pathJoin(dictRoot(), entry.name));
    const candidates = [pathJoin(dictPath, "styles.css"), pathJoin(dictPath, "style.css")];
    let css = "";
    for (let i = 0; i < candidates.length; i++) {
      try {
        if (!file.exists(candidates[i])) continue;
        css = String(file.read(candidates[i]) || "").slice(0, 100000);
        if (css.trim()) break;
      } catch (error) {
        debugWarn("Could not read dictionary styles for " + String(entry.title || entry.name) + ": " + compactError(error));
      }
    }
    if (!css.trim()) return;
    css = css.slice(0, Math.max(0, 300000 - totalBytes));
    totalBytes += css.length;
    const title = String(entry.title || entry.name || "").trim();
    const name = String(entry.name || "").trim();
    if (title) styles[title] = css;
    if (name && name !== title) styles[name] = css;
  });
  dictionaryStylesCacheKey = cacheKey;
  dictionaryStylesCacheValue = styles;
  dictionaryStylesCacheAt = now;
  return styles;
}
function dictionarySetupMessage(language, dicts) {
  const lang = language || selectedLanguageModule();
  const label = typeof languageLabelForUi === "function" ? languageLabelForUi(lang) : (lang.label || lang.id || "selected language");
  if (dicts && dicts.length) return "";
  if (lang.id === "ja") return t("dict.noInstalled");
  return t("dict.noInstalledForLanguage", { language: label.replace(/\s*\(experimental\)\s*/i, "") });
}
function dictionaryCompatibilityWarning(language, entries) {
  const lang = language || selectedLanguageModule();
  const dicts = entries || activeDictionaryEntries(lang);
  if (!lang || lang.id === "ja" || !dicts.length || typeof lang.dictionaryMatches !== "function") return "";
  const details = dictionaryCompatibilityDetails(lang, dicts);
  if (details.compatible.length || details.unknown.length) return "";
  const label = typeof languageLabelForUi === "function" ? languageLabelForUi(lang) : (lang.label || lang.id);
  return t("dict.compatibilityWarning", { language: label });
}
function workerFingerprint(dicts, language) {
  const lang = language || selectedLanguageModule();
  let groups;
  if (!dicts) groups = activeDictionaryGroups(lang);
  else if (Array.isArray(dicts)) groups = { term: dicts.slice(), frequency: [], pitch: [] };
  else groups = {
    term: Array.isArray(dicts.term) ? dicts.term.slice() : [],
    frequency: Array.isArray(dicts.frequency) ? dicts.frequency.slice() : [],
    pitch: Array.isArray(dicts.pitch) ? dicts.pitch.slice() : []
  };
  return JSON.stringify({
    version: VERSION,
    language: lang.id || "ja",
    termDictionaries: groups.term,
    frequencyDictionaries: groups.frequency,
    pitchDictionaries: groups.pitch
  });
}
function setDictionaryEnabled(name, enabledNow) {
  const manifest = updateActiveProfile(readManifest(), profile => {
    if (!profile.disabled) profile.disabled = {};
    if (enabledNow) delete profile.disabled[name]; else profile.disabled[name] = true;
  });
  writeManifest(manifest);
  if (typeof resetLookupCache === "function") resetLookupCache();
  else lookupCache = Object.create(null);
  activeWorkerFingerprint = null;
  activeWorkerReady = null;
  stopBackendWorker().catch(() => {});
  rebuildMenu();
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  showOSD(t(enabledNow ? "dict.enabled" : "dict.disabled", { name }));
}
function setDictionaryOrder(names) {
  const installedNames = unorderedDictionaryDirs().map(d => d.name);
  const manifest = updateActiveProfile(readManifest(), profile => {
    profile.dictionaryOrder = dictionaryOrderWithInstalledNames(names, installedNames);
  });
  writeManifest(manifest);
  if (typeof resetLookupCache === "function") resetLookupCache();
  else lookupCache = Object.create(null);
  activeWorkerFingerprint = null;
  activeWorkerReady = null;
  stopBackendWorker().catch(() => {});
  rebuildMenu();
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  showOSD(t("dict.orderUpdated"));
}
function dictionaryRemovalNameMap(names) {
  const out = Object.create(null);
  (Array.isArray(names) ? names : []).forEach(name => {
    const key = String(name || "").trim();
    if (key) out[key] = true;
  });
  return out;
}
function removeDictionaryReferencesFromProfile(profile, removeMap) {
  if (!profile || typeof profile !== "object") return;
  profile.dictionaryOrder = normalizeDictionaryOrder(profile.dictionaryOrder).filter(name => !removeMap[name]);
  profile.disabled = normalizeDisabledMap(profile.disabled);
  Object.keys(profile.disabled).forEach(name => {
    if (removeMap[name]) delete profile.disabled[name];
  });
}
function removeDictionaryReferencesFromManifest(manifest, names) {
  const normalized = normalizeManifestShape(manifest);
  const removeMap = dictionaryRemovalNameMap(names);
  Object.keys(normalized.dictionaries || {}).forEach(key => {
    const entry = normalized.dictionaries[key] || {};
    if (removeMap[key] || removeMap[entry.title] || removeMap[entry.name]) delete normalized.dictionaries[key];
  });
  Object.keys(normalized.profiles || {}).forEach(id => {
    removeDictionaryReferencesFromProfile(normalized.profiles[id], removeMap);
  });
  normalized.dictionaryOrder = normalizeDictionaryOrder(normalized.dictionaryOrder).filter(name => !removeMap[name]);
  normalized.disabled = normalizeDisabledMap(normalized.disabled);
  Object.keys(normalized.disabled).forEach(name => {
    if (removeMap[name]) delete normalized.disabled[name];
  });
  return normalizeManifestShape(normalized);
}
function installedDictionaryByName(name) {
  const requested = String(name || "").trim();
  if (!requested) return null;
  const dicts = unorderedDictionaryDirs();
  for (let i = 0; i < dicts.length; i++) {
    if (dicts[i] && dicts[i].name === requested) return dicts[i];
  }
  return null;
}
function safeInstalledDictionaryPath(dictPath) {
  const root = String(dictRoot()).replace(/\/+$/, "");
  const candidate = String(dictPath || "").replace(/\/+$/, "");
  const relative = candidate.indexOf(root + "/") === 0 ? candidate.slice(root.length + 1) : "";
  const hasUnsafePart = relative.split("/").some(part => !part || part === "." || part === "..");
  if (!candidate || candidate === root || candidate.indexOf(root + "/") !== 0 || hasUnsafePart) {
    throw new Error("Refusing to delete dictionary outside installed dictionary folder: " + candidate);
  }
  return candidate;
}
function deletedDictionaryRoot() {
  return pathJoin(dataRoot(), "deleted-dictionaries");
}
function deletedDictionaryPath(name) {
  const safeName = String(name || "dictionary").replace(/[^A-Za-z0-9._ -]+/g, "-").replace(/^-+|-+$/g, "") || "dictionary";
  return pathJoin(deletedDictionaryRoot(), safeName + "-" + String(Date.now()));
}
function deleteDictionaryPathInBackground(dictPath, name) {
  execChecked("/bin/rm", ["-rf", "--", dictPath]).catch(error => {
    debugWarn("background cleanup failed for deleted dictionary " + String(name || "") + ": " + compactError(error));
  });
}
async function deleteDictionary(name) {
  const dict = installedDictionaryByName(name);
  if (!dict) throw new Error("Dictionary is not installed: " + String(name || ""));
  const deletePath = safeInstalledDictionaryPath(dict.path);
  const removedPath = deletedDictionaryPath(dict.name);
  const names = [dict.name, dict.title, name].filter(Boolean);
  if (typeof resetLookupCache === "function") resetLookupCache();
  else lookupCache = Object.create(null);
  activeWorkerFingerprint = null;
  activeWorkerReady = null;
  stopBackendWorker().catch(error => {
    debugWarn("dictionary delete could not stop worker before removing files: " + compactError(error));
  });
  await execChecked("/bin/mkdir", ["-p", deletedDictionaryRoot()]);
  await execChecked("/bin/mv", ["--", deletePath, removedPath]);
  writeManifest(removeDictionaryReferencesFromManifest(readManifest(), names));
  rebuildMenu();
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  deleteDictionaryPathInBackground(removedPath, dict.name);
  showOSD("Deleted dictionary: " + dict.name);
  return dict;
}
function ensureDictionaryInActiveProfileOrder(manifest, name) {
  const dictName = String(name || "").trim();
  if (!dictName) return normalizeManifestShape(manifest);
  return updateActiveProfile(manifest, profile => {
    const order = normalizeDictionaryOrder(profile.dictionaryOrder);
    if (order.indexOf(dictName) < 0) order.push(dictName);
    profile.dictionaryOrder = order;
  });
}
function readPreferenceForSnapshot(key) {
  const fallback = PROFILE_PREFERENCE_DEFAULTS[key];
  try {
    if (preferences && typeof preferences.get === "function") {
      const value = preferences.get(key);
      if (value !== undefined && value !== null && value !== "") return value;
    }
  } catch (_) {}
  try {
    if (typeof pref === "function") return pref(key, fallback);
  } catch (_) {}
  return fallback;
}
function applyProfilePreferences(profile) {
  if (!profile || !profile.preferences) return;
  const profilePreferences = normalizeProfilePreferences(profile.preferences);
  Object.keys(profilePreferences).forEach(key => {
    try {
      if (PROFILE_PREFERENCE_KEYS.indexOf(key) >= 0 && typeof preferences !== "undefined" && preferences && typeof preferences.set === "function") {
        preferences.set(key, profilePreferences[key]);
      }
    } catch (_) {}
  });
  try { if (typeof preferences !== "undefined" && preferences && preferences.sync) preferences.sync(); } catch (_) {}
}
function currentProfilePreferenceSnapshot() {
  const out = normalizeProfilePreferences({});
  PROFILE_PREFERENCE_KEYS.forEach(key => {
    out[key] = readPreferenceForSnapshot(key);
  });
  return normalizeProfilePreferences(out);
}
function profileIdFromName(name) {
  const base = String(name || "profile").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "profile";
}
function nextProfileName(profiles) {
  const names = Object.create(null);
  Object.keys(profiles || {}).forEach(id => {
    const name = String((profiles[id] && profiles[id].name) || "").trim();
    if (name) names[name] = true;
  });
  let index = Object.keys(profiles || {}).length + 1;
  while (names["Profile " + index]) index++;
  return "Profile " + index;
}
function uniqueProfileId(base, profiles) {
  const root = profileIdFromName(base);
  let id = root;
  let index = 2;
  while (profiles[id]) {
    id = root + "-" + String(index++);
  }
  return id;
}
function resetLookupRuntimeForProfileChange() {
  if (typeof resetLookupCache === "function") resetLookupCache();
  else lookupCache = Object.create(null);
  lookupInFlight = Object.create(null);
  activeWorkerFingerprint = null;
  activeWorkerReady = null;
  lookupBackendReadyForNativeHide = false;
  try {
    if (typeof stopBackendWorker === "function") stopBackendWorker().catch(() => {});
  } catch (_) {}
}
function refreshRuntimeAfterProfileChange(reloadOverlay) {
  resetLookupRuntimeForProfileChange();
  if (typeof syncKeyboardShortcutRegistrations === "function") syncKeyboardShortcutRegistrations();
  if (reloadOverlay && typeof reloadOverlayForProfileChange === "function") {
    reloadOverlayForProfileChange();
  } else if (typeof pushOverlayConfigForProfileChange === "function") {
    pushOverlayConfigForProfileChange();
  }
}
function createDictionaryProfile(name, sourceProfileId) {
  const manifest = normalizeManifestShape(readManifest());
  const source = manifest.profiles[String(sourceProfileId || manifest.activeProfileId || DEFAULT_PROFILE_ID)] || activeDictionaryProfile(manifest);
  const sourcePreferences = source.id === manifest.activeProfileId ? currentProfilePreferenceSnapshot() : source.preferences;
  const profileName = String(name || nextProfileName(manifest.profiles)).trim() || nextProfileName(manifest.profiles);
  const id = uniqueProfileId(profileName, manifest.profiles);
  manifest.profiles[id] = {
    id,
    name: profileName,
    dictionaryOrder: normalizeDictionaryOrder(source.dictionaryOrder),
    disabled: normalizeDisabledMap(source.disabled),
    preferences: normalizeProfilePreferences(sourcePreferences)
  };
  writeManifest(manifest);
  rebuildMenu();
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  return manifest.profiles[id];
}
function renameDictionaryProfile(profileId, name) {
  const manifest = normalizeManifestShape(readManifest());
  const id = String(profileId || manifest.activeProfileId || DEFAULT_PROFILE_ID);
  if (!manifest.profiles[id]) throw new Error("Unknown dictionary profile: " + id);
  const nextName = String(name || "").trim();
  if (!nextName) throw new Error("Profile name cannot be empty.");
  manifest.profiles[id].name = nextName;
  writeManifest(manifest);
  rebuildMenu();
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  return manifest.profiles[id];
}
function deleteDictionaryProfile(profileId) {
  const manifest = normalizeManifestShape(readManifest());
  const id = String(profileId || "").trim();
  if (!id || !manifest.profiles[id]) throw new Error("Unknown dictionary profile: " + id);
  if (id === DEFAULT_PROFILE_ID) throw new Error("The first profile cannot be deleted.");
  const wasActive = id === manifest.activeProfileId;
  delete manifest.profiles[id];
  if (wasActive) manifest.activeProfileId = DEFAULT_PROFILE_ID;
  const normalized = normalizeManifestShape(manifest);
  writeManifest(normalized);
  if (wasActive) {
    applyProfilePreferences(activeDictionaryProfile(normalized));
    refreshRuntimeAfterProfileChange(true);
  } else {
    rebuildMenu();
  }
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  return activeDictionaryProfile(normalized);
}
function updateDictionaryProfilePreferences(profileId, prefs) {
  const manifest = normalizeManifestShape(readManifest());
  const id = String(profileId || manifest.activeProfileId || DEFAULT_PROFILE_ID);
  if (!manifest.profiles[id]) throw new Error("Unknown dictionary profile: " + id);
  const previous = normalizeProfilePreferences(manifest.profiles[id].preferences);
  manifest.profiles[id].preferences = normalizeProfilePreferences(Object.assign({}, previous, prefs || {}));
  writeManifest(manifest);
  if (id === manifest.activeProfileId) {
    applyProfilePreferences(manifest.profiles[id]);
    refreshRuntimeAfterProfileChange(previous.lookupLanguage !== manifest.profiles[id].preferences.lookupLanguage);
    rebuildMenu();
  }
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  return manifest.profiles[id];
}
function readGlobalSettingsSnapshot() {
  const out = {};
  GLOBAL_SETTINGS_KEYS.forEach(key => {
    const fallback = GLOBAL_SETTINGS_DEFAULTS[key];
    try {
      const value = typeof preferences !== "undefined" && preferences && typeof preferences.get === "function" ? preferences.get(key) : undefined;
      out[key] = value === undefined || value === null || value === "" ? fallback : value;
    } catch (_) {
      out[key] = fallback;
    }
  });
  return out;
}
function updateGlobalSettings(prefs) {
  const values = prefs && typeof prefs === "object" ? prefs : {};
  const previousUiLanguage = configuredUiLanguage();
  const previousUiTheme = configuredUiTheme();
  GLOBAL_SETTINGS_KEYS.forEach(key => {
    try {
      if (Object.prototype.hasOwnProperty.call(values, key) && typeof preferences !== "undefined" && preferences && typeof preferences.set === "function") {
        preferences.set(key, values[key]);
      }
    } catch (_) {}
  });
  try { if (typeof preferences !== "undefined" && preferences && preferences.sync) preferences.sync(); } catch (_) {}
  const uiLanguageChanged = configuredUiLanguage() !== previousUiLanguage;
  const uiThemeChanged = configuredUiTheme() !== previousUiTheme;
  if (uiLanguageChanged) {
    refreshSystemUiLanguage().catch(() => {});
    try { rebuildMenu(); } catch (_) {}
  }
  if (uiLanguageChanged || uiThemeChanged) {
    try { if (initialized) postToOverlay("config", overlayConfig()); } catch (_) {}
  }
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  return readGlobalSettingsSnapshot();
}
function setActiveDictionaryProfile(profileId) {
  const requested = String(profileId || "").trim();
  const manifest = normalizeManifestShape(readManifest());
  if (!requested || !manifest.profiles[requested]) throw new Error("Unknown dictionary profile: " + requested);
  const currentId = manifest.activeProfileId || DEFAULT_PROFILE_ID;
  if (manifest.profiles[currentId]) {
    manifest.profiles[currentId].preferences = currentProfilePreferenceSnapshot();
  }
  manifest.activeProfileId = requested;
  const normalized = normalizeManifestShape(manifest);
  writeManifest(normalized);
  applyProfilePreferences(activeDictionaryProfile(normalized));
  refreshRuntimeAfterProfileChange(true);
  rebuildMenu();
  if (typeof postDictionaryManagerState === "function") postDictionaryManagerState();
  showOSD("Switched Hoshitan profile: " + activeDictionaryProfile(normalized).name);
}
function addSubMenuItemCompat(parent, item) {
  if (!parent) throw new Error("No parent menu item");
  if (typeof parent.addSubMenuItem === "function") return parent.addSubMenuItem(item);
  if (typeof parent.addSubmenuItem === "function") return parent.addSubmenuItem(item);
  throw new Error("This IINA build did not expose MenuItem.addSubMenuItem/addSubmenuItem");
}
function addMenuItemSafe(item) {
  try { menu.addItem(item); return true; }
  catch (error) { console.warn("Could not add menu item: " + compactError(error)); return false; }
}

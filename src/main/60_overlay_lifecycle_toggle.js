function synchronizeOverlayAfterLoad(reason) {
  debugVerbose("synchronizing overlay state reason=" + String(reason || "unknown") + " generation=" + overlayLoadGeneration);
  postToOverlay("config", overlayConfig());
  postToOverlay("enabled", { enabled });
  replayActiveOverlayTask();
  if (enabled) pollSubtitle({ forceReplay: true });
}
function registerOverlayMessageHandlers() {
  if (overlayMessageHandlersRegistered) return;
  overlay.onMessage("ready", payload => {
    overlayReadyGeneration = overlayLoadGeneration;
    debugLog("overlay ready received payloadType=" + typeof payload);
    handleLookupPopupOverlayReady(payload);
    synchronizeOverlayAfterLoad("ready");
  });
  overlay.onMessage("lookup-at", payload => { handleLookupAt(payload); });
  overlay.onMessage("lookup-at-lite", payload => { handleLookupAt(payload); });
  overlay.onMessage("nested-lookup", payload => { handleNestedLookup(payload); });
  overlay.onMessage("lookup-popup-visibility", payload => { handleLookupPopupVisibility(payload); });
  overlay.onMessage("lookup-popup-visible", payload => { handleLookupPopupVisibility(payload); });
  overlay.onMessage("open-external-url", payload => { openExternalUrlFromOverlay(payload && payload.url !== undefined ? payload.url : payload); });
  overlay.onMessage("anki-add", payload => { handleAnkiAddRequest(payload); });
  overlayMessageHandlersRegistered = true;
}
function scheduleOverlayLoadFallbacks(generation) {
  [180, 700, 1600].forEach(delayMs => {
    setTimeout(() => {
      if (!initialized || generation !== overlayLoadGeneration || overlayReadyGeneration === generation) return;
      debugVerbose("overlay ready not received; applying startup fallback generation=" + generation + " delayMs=" + delayMs);
      synchronizeOverlayAfterLoad("fallback-" + delayMs);
    }, delayMs);
  });
}
function loadOverlayDocument(reason) {
  registerOverlayMessageHandlers();
  const generation = ++overlayLoadGeneration;
  debugVerbose("loading overlay document reason=" + String(reason || "unknown") + " generation=" + generation);
  overlay.loadFile("overlay.html");
  scheduleOverlayLoadFallbacks(generation);
}
function initializeOverlay() {
  ensureOverlayBridge();
  if (initialized) return;
  debugLog("initializeOverlay v" + VERSION + " initialized=" + initialized + " enabled=" + enabled);
  registerOverlayMessageHandlers();
  initialized = true;
  try {
    loadOverlayDocument("initial");
    overlay.setOpacity(1);
    overlay.setClickable(true);
    overlay.show();
  } catch (error) {
    initialized = false;
    throw error;
  }
}
function prepareRuntimeAfterProfileChange() {
  lookupBackendReadyForNativeHide = false;
  lookupInFlight = Object.create(null);
  hoverLookupInFlight = false;
  pendingHoverLookup = null;
  hoverLookupActiveKey = "";
  lastSubtitle = null;
  subtitleEmptySince = 0;
  lastSubtitlePublishedAt = 0;
  resetLookupPopupPause();
}
function warmActiveProfileBackend() {
  if (!enabled) return;
  const language = selectedLanguageModule();
  const dicts = activeDictionaryGroups(language);
  prepareLookupBackendForEnabledOverlay(language, dicts).then(() => {
    if (!enabled) return;
    lookupBackendReadyForNativeHide = true;
    syncNativeSubtitleVisibility();
    setOverlayStatus(t("lookup.ready", { language: languageLabelForUi(language) }), "info", 3500);
  }).catch(error => {
    lookupBackendReadyForNativeHide = false;
    debugError("Dictionary lookup startup failed after profile change language=" + language.id + ": " + compactError(error));
    setOverlayStatus(compactError(error), "error", 14000);
  });
}
function pushOverlayConfigForProfileChange() {
  prepareRuntimeAfterProfileChange();
  if (initialized) {
    postToOverlay("config", overlayConfig());
    postToOverlay("enabled", { enabled });
  }
  if (enabled) {
    refreshPollingInterval();
    pollSubtitle();
    syncNativeSubtitleVisibility();
    warmActiveProfileBackend();
  }
}
function videoWindowAvailableForOverlayLoad() {
  try { return !!(core && core.window && core.window.loaded); }
  catch (_) { return false; }
}
function refreshOverlayForTextSubtitleActivation() {
  if (!videoWindowAvailableForOverlayLoad()) return false;
  try {
    debugLog("refreshing overlay for first text subtitle in current media");
    if (!initialized) {
      initializeOverlay();
    } else {
      loadOverlayDocument("text-subtitle-activation");
      overlay.setOpacity(1);
      overlay.setClickable(enabled);
      overlay.show();
    }
    return true;
  } catch (error) {
    debugWarn("overlay refresh for text subtitle activation failed: " + compactError(error));
    return false;
  }
}
function reloadOverlayForProfileChange() {
  prepareRuntimeAfterProfileChange();
  if (!videoWindowAvailableForOverlayLoad()) {
    debugLog("deferring overlay reload for profile change until iina.window-loaded");
    return;
  }
  if (!initialized) {
    initializeOverlay();
  } else {
    try {
      debugLog("reloading overlay for active profile language=" + selectedLanguageModule().id);
      loadOverlayDocument("profile-change");
      overlay.setOpacity(1);
      overlay.setClickable(enabled);
      if (enabled) overlay.show();
    } catch (error) {
      debugWarn("overlay reload failed for profile change: " + compactError(error));
    }
  }
  setTimeout(() => {
    postToOverlay("config", overlayConfig());
    postToOverlay("enabled", { enabled });
    replayActiveOverlayTask();
    if (enabled) {
      startPolling();
      syncNativeSubtitleVisibility();
      warmActiveProfileBackend();
    } else {
      publishSubtitle("");
    }
  }, 80);
}
function startPolling() {
  const nextMs = configuredSubtitlePollMs();
  debugLog("startPolling subtitlePollMs=" + nextMs);
  if (pollTimer !== null) clearInterval(pollTimer);
  activeSubtitlePollMs = nextMs;
  pollTimer = setInterval(pollSubtitle, activeSubtitlePollMs);
  pollSubtitle();
}
function configuredSubtitlePollMs() {
  return Math.max(80, prefNumber("subtitlePollMs", 120));
}
function refreshPollingInterval() {
  if (pollTimer === null) return;
  const nextMs = configuredSubtitlePollMs();
  if (nextMs === activeSubtitlePollMs) return;
  debugLog("subtitlePollMs changed " + activeSubtitlePollMs + " -> " + nextMs);
  clearInterval(pollTimer);
  activeSubtitlePollMs = nextMs;
  pollTimer = setInterval(pollSubtitle, activeSubtitlePollMs);
}
function stopPolling() {
  debugLog("stopPolling");
  if (pollTimer !== null) clearInterval(pollTimer);
  pollTimer = null;
  activeSubtitlePollMs = 0;
  lastSubtitle = null;
  subtitleEmptySince = 0;
  lastSubtitlePublishedAt = 0;
  textSubtitleOverlayPrimed = false;
  lookupInFlight = Object.create(null);
}
async function prepareLookupBackendForEnabledOverlay(language, dicts) {
  const lang = language || selectedLanguageModule();
  const activeDicts = dicts || activeDictionaryGroups(lang);
  const termPaths = workerLookupTermPaths(activeDicts);
  const allPaths = flattenedWorkerDictionaryPaths(activeDicts);
  debugLog("prepare lookup backend language=" + lang.id + " label=" + lang.label + " termDicts=" + termPaths.length + " activeDicts=" + allPaths.length + " dicts=" + JSON.stringify(allPaths.map(p => String(p).split("/").pop())));
  const setupMessage = dictionarySetupMessage(lang, termPaths);
  if (setupMessage) throw new Error(setupMessage);
  const ready = await ensureBackendWorker(activeDicts, lang);
  debugLog("prepare lookup backend ready language=" + lang.id + " fingerprint=" + JSON.stringify((ready && ready.fingerprint) || ""));
  return ready;
}
function setEnabled(next) {
  debugLog("setEnabled requested next=" + String(!!next) + " previous=" + String(enabled));
  enabled = !!next;
  lookupBackendReadyForNativeHide = false;
  initializeOverlay();
  overlay.setClickable(enabled);
  postToOverlay("enabled", { enabled });
  postToOverlay("config", overlayConfig());
  rebuildMenu();
  if (enabled) {
    const language = selectedLanguageModule();
    const dicts = activeDictionaryGroups(language);
    try {
      nativeSubVisibilityBeforeEnable = mpv.getFlag("sub-visibility");
      nativeSubScaleBeforeEnable = mpv.getString("sub-scale");
      syncNativeSubtitleVisibility();
    } catch (error) { console.warn("Could not update native subtitle visibility: " + compactError(error)); }
    overlay.show();
    startPolling();
    showOSD(t("state.on"));
    prepareLookupBackendForEnabledOverlay(language, dicts).then(() => {
      if (!enabled) return;
      lookupBackendReadyForNativeHide = true;
      syncNativeSubtitleVisibility();
      setOverlayStatus(t("lookup.ready", { language: languageLabelForUi(language) }), "info", 3500);
    }).catch(error => {
      lookupBackendReadyForNativeHide = false;
      debugError("Dictionary lookup startup failed language=" + language.id + ": " + compactError(error));
      try { if (nativeSubVisibilityBeforeEnable !== null) mpv.set("sub-visibility", nativeSubVisibilityBeforeEnable); } catch (_) {}
      restoreNativeSubtitleScale();
      setOverlayStatus(compactError(error), "error", 14000);
    });
  } else {
    lookupBackendReadyForNativeHide = false;
    resetLookupPopupPause();
    stopPolling();
    publishSubtitle("");
    try { if (nativeSubVisibilityBeforeEnable !== null) mpv.set("sub-visibility", nativeSubVisibilityBeforeEnable); } catch (_) {}
    restoreNativeSubtitleScale();
    showOSD(t("state.off"));
  }
}
function toggleFromShortcut(data) {
  try {
    if (data && data.isRepeat) return true;
    const now = Date.now();
    if (now - lastShortcutToggleAt < 280) return true;
    lastShortcutToggleAt = now;
    debugLog("shortcut Shift+H toggle enabled=" + String(enabled) + " -> " + String(!enabled));
    setEnabled(!enabled);
    return true;
  } catch (error) {
    console.error("Shift+H shortcut failed: " + compactError(error));
    return true;
  }
}
function toggleSubtitleDisplay() {
  subtitleDisplayEnabled = !subtitleDisplayEnabled;
  postToOverlay("subtitle-visibility", { visible: subtitleDisplayEnabled });
  showOSD(subtitleDisplayEnabled ? "Subtitles: On" : "Subtitles: Off");
}
function shortcutBaseInputKey(baseName, hasShift) {
  const base = normalizeShortcutBaseName(baseName);
  if (base === "Space") return "SPACE";
  if (base === "Esc") return "ESC";
  if (base === "Left") return "LEFT";
  if (base === "Right") return "RIGHT";
  if (base === "Up") return "UP";
  if (base === "Down") return "DOWN";
  if (base === "Enter") return "ENTER";
  if (base === "Tab") return "TAB";
  if (/^[A-Z]$/.test(base)) return hasShift ? base : base.toLowerCase();
  return base;
}
function shortcutInputKeysForDisplay(value) {
  const display = normalizeShortcutDisplayKey(value, "");
  if (!display) return [];
  const parts = display.split("+").filter(Boolean);
  if (!parts.length) return [];
  const base = parts[parts.length - 1];
  const modifierNames = parts.slice(0, -1);
  const inputModifiers = modifierNames.map(modifier => {
    if (modifier === "Cmd") return "Meta";
    return modifier;
  });
  const hasShift = modifierNames.indexOf("Shift") >= 0;
  const baseInput = shortcutBaseInputKey(base, hasShift);
  const keys = [];
  if (modifierNames.length === 1 && modifierNames[0] === "Shift" && /^[A-Z]$/.test(base)) {
    keys.push(base);
  }
  keys.push(inputModifiers.length ? inputModifiers.concat([baseInput]).join("+") : baseInput);
  const seen = Object.create(null);
  return keys.filter(key => {
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}
function configuredKeyboardShortcuts() {
  return normalizeKeyboardShortcuts(pref("keyboardShortcutsJson", DEFAULT_KEYBOARD_SHORTCUTS_JSON));
}
function shortcutDefinitionsForInputKey(inputKey) {
  const current = configuredKeyboardShortcuts();
  const matched = [];
  SHORTCUT_ACTION_DEFINITIONS.forEach(action => {
    const keys = shortcutInputKeysForDisplay(current[action.id] || action.defaultKey);
    if (keys.indexOf(inputKey) >= 0) matched.push(action);
  });
  return matched;
}
function shortcutActionHandler(actionId) {
  const handlers = {
    toggleHoshitan: data => toggleFromShortcut(data),
    playPause: () => setPauseState(!pauseState()),
    seekBackward5: () => core.seek(-5, true),
    seekForward5: () => core.seek(5, true),
    previousSubtitle: () => mpv.command("sub-seek", ["-1"]),
    nextSubtitle: () => mpv.command("sub-seek", ["1"]),
    toggleSubtitleDisplay,
    toggleFullscreen: () => mpv.set("fullscreen", !mpv.getFlag("fullscreen")),
    closePopup: () => postToOverlay("close-popup", {}),
    closeVideo: () => core.stop()
  };
  return handlers[actionId] || null;
}
function dispatchShortcutInputKey(inputKey, data) {
  try {
    if (data && data.isRepeat) return true;
    const matches = shortcutDefinitionsForInputKey(inputKey);
    if (!matches.length) return false;
    const action = matches[0];
    const handler = shortcutActionHandler(action.id);
    if (!handler) {
      debugWarn("No shortcut handler for " + action.id);
      return true;
    }
    handler(data);
  } catch (error) {
    debugWarn("Shortcut " + inputKey + " failed: " + compactError(error));
  }
  return true;
}
function registerInputShortcut(key) {
  if (!key || registeredShortcutInputKeys[key]) return;
  try {
    input.onKeyDown(key, data => dispatchShortcutInputKey(key, data), input.PRIORITY_HIGH);
    registeredShortcutInputKeys[key] = true;
    debugLog("registered input shortcut " + key);
  } catch (error) {
    debugWarn("Could not register shortcut " + key + ": " + compactError(error));
  }
}
function syncKeyboardShortcutRegistrations() {
  const current = configuredKeyboardShortcuts();
  SHORTCUT_ACTION_DEFINITIONS.forEach(action => {
    shortcutInputKeysForDisplay(current[action.id] || action.defaultKey).forEach(registerInputShortcut);
  });
}
function registerShortcut() {
  if (shortcutRegistered) return;
  shortcutRegistered = true;
  syncKeyboardShortcutRegistrations();
}

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
  const dicts = activeDictionaryPaths(language);
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
  const activeDicts = dicts || activeDictionaryPaths(lang);
  debugLog("prepare lookup backend language=" + lang.id + " label=" + lang.label + " activeDicts=" + activeDicts.length + " dicts=" + JSON.stringify(activeDicts.map(p => String(p).split("/").pop())));
  const setupMessage = dictionarySetupMessage(lang, activeDicts);
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
    const dicts = activeDictionaryPaths(language);
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
function shortcutAction(label, action) {
  return data => {
    try {
      if (data && data.isRepeat) return true;
      action();
    } catch (error) {
      debugWarn("Shortcut " + label + " failed: " + compactError(error));
    }
    return true;
  };
}
function toggleSubtitleDisplay() {
  subtitleDisplayEnabled = !subtitleDisplayEnabled;
  postToOverlay("subtitle-visibility", { visible: subtitleDisplayEnabled });
  showOSD(subtitleDisplayEnabled ? "Subtitles: On" : "Subtitles: Off");
}
function registerInputShortcut(key, label, action) {
  try {
    input.onKeyDown(key, shortcutAction(label, action), input.PRIORITY_HIGH);
    debugLog("registered input shortcut " + key + " for " + label);
  } catch (error) {
    debugWarn("Could not register shortcut " + key + " for " + label + ": " + compactError(error));
  }
}
function registerShortcut() {
  if (shortcutRegistered) return;
  shortcutRegistered = true;
  try {
    // Prefer IINA's input module over menu keyBinding here. The menu shortcut could
    // turn the overlay on but then fail to turn it off while the overlay/webview was
    // active. We listen for mpv's uppercase H form, i.e. Shift+h.
    input.onKeyDown("H", toggleFromShortcut, input.PRIORITY_HIGH);
    debugLog("registered input shortcut H for Shift+H");
  } catch (error) {
    console.warn("Could not register H shortcut: " + compactError(error));
  }
  try {
    // Fallback for builds/configs that accept explicit modifier notation.
    input.onKeyDown("Shift+H", toggleFromShortcut, input.PRIORITY_HIGH);
    debugLog("registered input shortcut Shift+H fallback");
  } catch (error) {
    console.warn("Could not register Shift+H fallback: " + compactError(error));
  }
  registerInputShortcut("SPACE", "play/pause", () => setPauseState(!pauseState()));
  registerInputShortcut("LEFT", "seek backward 5 seconds", () => core.seek(-5, true));
  registerInputShortcut("RIGHT", "seek forward 5 seconds", () => core.seek(5, true));
  registerInputShortcut("[", "previous subtitle", () => mpv.command("sub-seek", ["-1"]));
  registerInputShortcut("]", "next subtitle", () => mpv.command("sub-seek", ["1"]));
  registerInputShortcut("s", "toggle subtitles", toggleSubtitleDisplay);
  registerInputShortcut("f", "toggle fullscreen", () => mpv.set("fullscreen", !mpv.getFlag("fullscreen")));
  registerInputShortcut("ESC", "close lookup popup", () => postToOverlay("close-popup", {}));
  registerInputShortcut("Meta+w", "close video", () => core.stop());
}


registerShortcut();
rebuildMenu();
refreshSystemUiLanguage().catch(() => {});

event.on("iina.window-loaded", () => {
  initializeOverlay();
  setEnabled(prefBool("enabledByDefault", true));
});
event.on("mpv.file-loaded", () => {
  subtitleDisplayEnabled = true;
  postToOverlay("subtitle-visibility", { visible: true });
  lastSubtitle = null;
  subtitleEmptySince = 0;
  lastSubtitlePublishedAt = 0;
  textSubtitleOverlayPrimed = false;
  if (typeof resetLookupCache === "function") resetLookupCache();
  else lookupCache = Object.create(null);
  lookupInFlight = Object.create(null);
  if (enabled) startPolling();
});
event.on("mpv.end-file", () => {
  resetLookupPopupPause();
  stopPolling();
  publishSubtitle("");
});
event.on("iina.window-will-close", () => {
  resetLookupPopupPause();
  stopPolling();
  flushDebugLogBuffer();
});
try {
  if (core.window.loaded) {
    initializeOverlay();
    setEnabled(prefBool("enabledByDefault", true));
  }
} catch (_) {}

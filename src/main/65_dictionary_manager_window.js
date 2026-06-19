function dictionaryManagerAvailable() {
  return !!(standaloneWindow && typeof standaloneWindow.loadFile === "function");
}
function postToDictionaryManager(name, data) {
  try {
    if (!standaloneWindow || typeof standaloneWindow.postMessage !== "function") return;
    standaloneWindow.postMessage(name, data || {});
  } catch (error) {
    debugWarn("dictionary manager postMessage failed name=" + String(name || "") + ": " + compactError(error));
  }
}
function dictionaryManagerState() {
  const manifest = readManifest();
  const disabled = disabledDictionaryMap(manifest);
  const dicts = dictionaryDirs();
  const activeProfile = activeDictionaryProfile(manifest);
  return {
    version: VERSION,
    dictionaries: dicts.map((dict, index) => ({
      name: dict.name,
      title: dict.title || dict.name,
      language: dict.language || "unknown",
      revision: dict.revision || "",
      format: dict.format || "",
      termCount: Number(dict.termCount || 0),
      metaCount: Number(dict.metaCount || 0),
      tagCount: Number(dict.tagCount || 0),
      mediaCount: Number(dict.mediaCount || 0),
      pitchCount: Number(dict.pitchCount || 0),
      freqCount: Number(dict.freqCount || 0),
      type: dictionaryPrimaryType(dict),
      types: dictionaryTypes(dict),
      enabled: !disabled[dict.name],
      order: index
    })),
    activeProfileId: manifest.activeProfileId || DEFAULT_PROFILE_ID,
    activeProfileName: activeProfile.name || "Profile 1",
    profiles: profileSummaries(manifest),
    profilePreferenceKeys: PROFILE_PREFERENCE_KEYS.slice(),
    profilePreferenceDefaults: Object.assign({}, PROFILE_PREFERENCE_DEFAULTS),
    profilePreferences: normalizeProfilePreferences(activeProfile.preferences),
    shortcutActions: shortcutActionSummaries(),
    globalSettings: readGlobalSettingsSnapshot(),
    globalSettingDefaults: Object.assign({}, GLOBAL_SETTINGS_DEFAULTS),
    lookupLanguage: pref("lookupLanguage", "ja")
  };
}
function postDictionaryManagerState() {
  try { postToDictionaryManager("dictionary-manager-state", dictionaryManagerState()); }
  catch (error) { debugWarn("could not build dictionary manager state: " + compactError(error)); }
}
function postDictionaryManagerStatus(message, kind, busy) {
  postToDictionaryManager("dictionary-manager-status", {
    message: String(message || ""),
    kind: kind || "info",
    busy: !!busy,
    updatedAt: Date.now()
  });
}
function postAnkiManagerState(modelName) {
  (async () => {
    try {
      const state = await ankiConnectionMetadata(modelName);
      postToDictionaryManager("dictionary-manager-anki-state", state);
      postDictionaryManagerStatus(t("manager.connected"), "info", false);
    } catch (error) {
      postToDictionaryManager("dictionary-manager-anki-state", {
        connected: false,
        error: compactError(error),
        deckNames: [],
        modelNames: [],
        fieldNames: []
      });
      postDictionaryManagerStatus(t("manager.ankiError", { error: compactError(error) }), "error", false);
    }
  })();
}
function runDictionaryManagerAction(label, action) {
  (async () => {
    const actionLabel = label || "Working";
    if (dictionaryManagerActionInFlight) {
      postDictionaryManagerStatus(t("manager.busy"), "info", true);
      return;
    }
    dictionaryManagerActionInFlight = true;
    postDictionaryManagerStatus(actionLabel + "...", "info", true);
    try {
      const result = await action();
      postDictionaryManagerState();
      if (result && result.cancelled) {
        postDictionaryManagerStatus(result.message || t("manager.actionCancelled", { action: actionLabel }), "info", false);
        return;
      }
      postDictionaryManagerStatus(t("manager.actionComplete", { action: actionLabel }), "info", false);
    } catch (error) {
      const msg = t("manager.actionFailed", { action: actionLabel, error: compactError(error) });
      debugError("dictionary manager action failed label=" + actionLabel + " error=" + compactError(error));
      postDictionaryManagerState();
      postDictionaryManagerStatus(msg, "error", false);
      alert(msg);
    } finally {
      dictionaryManagerActionInFlight = false;
    }
  })();
}
function runDictionaryManagerZipImport() {
  (async () => {
    if (dictionaryManagerActionInFlight) {
      postDictionaryManagerStatus(t("manager.busy"), "info", true);
      return;
    }
    let zipPaths = [];
    try {
      zipPaths = await chooseDictionaryZipPaths();
    } catch (error) {
      const msg = t("manager.pickerFailed", { error: compactError(error) });
      debugError("dictionary manager file picker failed: " + compactError(error));
      postDictionaryManagerState();
      postDictionaryManagerStatus(msg, "error", false);
      alert(msg);
      return;
    }
    if (!zipPaths.length) {
      notify(t("manager.importCancelled"), "info", 3500);
      postDictionaryManagerState();
      postDictionaryManagerStatus(t("manager.importCancelled"), "info", false);
      return;
    }

    const countLabel = zipPaths.length === 1
      ? t("manager.oneDictionary")
      : t("manager.manyDictionaries", { count: zipPaths.length });
    dictionaryManagerActionInFlight = true;
    postDictionaryManagerStatus(t("manager.importing", { count: countLabel }), "info", true);
    try {
      await validateAndImportDictionaryZips(zipPaths, "dictionary-manager-picker");
      postDictionaryManagerState();
      postDictionaryManagerStatus(t("manager.imported", { count: countLabel }), "info", false);
    } catch (error) {
      const msg = t("manager.importFailed", { error: compactError(error) });
      debugError("dictionary manager import failed: " + compactError(error));
      postDictionaryManagerState();
      postDictionaryManagerStatus(msg, "error", false);
      alert(msg);
    } finally {
      dictionaryManagerActionInFlight = false;
    }
  })();
}
function registerDictionaryManagerHandlers() {
  if (!standaloneWindow || typeof standaloneWindow.onMessage !== "function") return;
  const generation = ++dictionaryManagerHandlerGeneration;
  const onMessage = (name, handler) => {
    standaloneWindow.onMessage(name, payload => {
      if (generation !== dictionaryManagerHandlerGeneration) {
        debugVerbose("ignored stale dictionary manager message name=" + String(name || "") + " generation=" + generation + " current=" + dictionaryManagerHandlerGeneration);
        return;
      }
      handler(payload);
    });
  };
  onMessage("dictionary-manager-ready", () => {
    postDictionaryManagerState();
    postDictionaryManagerStatus("", "info", false);
    postAnkiManagerState(ankiSettings().modelName);
  });
  onMessage("dictionary-manager-refresh", () => {
    postDictionaryManagerState();
    postDictionaryManagerStatus(t("manager.refreshed"), "info", false);
  });
  onMessage("dictionary-manager-set-enabled", payload => {
    const name = payload && payload.name;
    if (!name) return;
    setDictionaryEnabled(String(name), !!(payload && payload.enabled));
    postDictionaryManagerStatus(t("manager.selectionSaved"), "info", false);
  });
  onMessage("dictionary-manager-set-order", payload => {
    const order = payload && Array.isArray(payload.order) ? payload.order : [];
    setDictionaryOrder(order);
    postDictionaryManagerStatus(t("manager.orderSaved"), "info", false);
  });
  onMessage("dictionary-manager-delete", payload => {
    const name = payload && payload.name;
    if (!name) return;
    runDictionaryManagerAction(t("manager.deletingDictionary"), () => deleteDictionary(String(name)));
  });
  onMessage("dictionary-manager-import-zip", () => {
    runDictionaryManagerZipImport();
  });
  onMessage("dictionary-manager-switch-profile", payload => {
    const profileId = payload && payload.profileId;
    if (!profileId) return;
    runDictionaryManagerAction(t("manager.switchingProfile"), () => {
      setActiveDictionaryProfile(profileId);
      return Promise.resolve();
    });
  });
  onMessage("dictionary-manager-create-profile", payload => {
    const name = payload && payload.name;
    runDictionaryManagerAction(t("manager.creatingProfile"), () => {
      const profile = createDictionaryProfile(name || "", payload && payload.sourceProfileId);
      setActiveDictionaryProfile(profile.id);
      return Promise.resolve();
    });
  });
  onMessage("dictionary-manager-rename-profile", payload => {
    try {
      renameDictionaryProfile(payload && payload.profileId, payload && payload.name);
      postDictionaryManagerStatus(t("manager.profileRenamed"), "info", false);
    } catch (error) {
      const msg = t("manager.renameFailed", { error: compactError(error) });
      debugError(msg);
      postDictionaryManagerStatus(msg, "error", false);
      alert(msg);
    }
  });
  onMessage("dictionary-manager-delete-profile", payload => {
    runDictionaryManagerAction(t("manager.deletingProfile"), () => {
      deleteDictionaryProfile(payload && payload.profileId);
      return Promise.resolve();
    });
  });
  onMessage("dictionary-manager-update-profile-preferences", payload => {
    try {
      updateDictionaryProfilePreferences(payload && payload.profileId, payload && payload.preferences);
      postDictionaryManagerStatus(t("manager.profileSaved"), "info", false);
    } catch (error) {
      const msg = t("manager.profileSaveFailed", { error: compactError(error) });
      debugError(msg);
      postDictionaryManagerStatus(msg, "error", false);
      alert(msg);
    }
  });
  onMessage("dictionary-manager-update-global-settings", payload => {
    try {
      updateGlobalSettings(payload && payload.settings);
      postDictionaryManagerStatus(t("manager.globalSaved"), "info", false);
    } catch (error) {
      const msg = t("manager.globalSaveFailed", { error: compactError(error) });
      debugError(msg);
      postDictionaryManagerStatus(msg, "error", false);
      alert(msg);
    }
  });
  onMessage("dictionary-manager-anki-refresh", payload => {
    postDictionaryManagerStatus(t("manager.connecting"), "info", true);
    postAnkiManagerState(payload && payload.modelName);
  });
  onMessage("dictionary-manager-choose-local-audio-database", () => {
    (async () => {
      try {
        const selectedPath = await chooseLocalAudioDatabasePath();
        if (selectedPath) {
          postToDictionaryManager("dictionary-manager-local-audio-path", { path: selectedPath });
          postDictionaryManagerStatus("Local audio database selected.", "info", false);
        } else {
          postDictionaryManagerStatus("", "info", false);
        }
      } catch (error) {
        postDictionaryManagerStatus(compactError(error), "error", false);
      }
    })();
  });
}
function openDictionaryManager() {
  if (!dictionaryManagerAvailable()) {
    alert(t("manager.unavailable"));
    return;
  }
  try {
    standaloneWindow.loadFile("dictionary-manager.html");
    registerDictionaryManagerHandlers();
    try {
      if (typeof standaloneWindow.setProperty === "function") standaloneWindow.setProperty({ title: t("settings.title"), resizable: true });
    } catch (_) {}
    if (typeof standaloneWindow.open === "function") standaloneWindow.open();
    else if (typeof standaloneWindow.show === "function") standaloneWindow.show();
    setTimeout(() => postDictionaryManagerState(), 120);
  } catch (error) {
    const msg = t("manager.openFailed", { error: compactError(error) });
    debugError(msg);
    alert(msg);
  }
}

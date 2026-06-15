let ankiExportInFlight = false;

function ankiSetting(key, fallback) {
  try {
    const value = pref(key, fallback);
    return value === undefined || value === null || value === "" ? fallback : value;
  } catch (_) {
    return fallback;
  }
}
function ankiSettings() {
  const fieldMappings = ankiFieldMappings();
  return {
    url: String(ankiSetting("ankiConnectUrl", "http://127.0.0.1:8765") || "").replace(/\/+$/, ""),
    apiKey: String(ankiSetting("ankiApiKey", "") || ""),
    deckName: String(ankiSetting("ankiDeckName", "Default") || ""),
    modelName: String(ankiSetting("ankiModelName", "Basic") || ""),
    fieldMappings,
    imageFields: ankiFieldsMappedToAny(fieldMappings, ["{image}", "{book-cover}"]),
    wordAudioFields: ankiFieldsMappedTo(fieldMappings, "{audio}"),
    sentenceAudioFields: ankiFieldsMappedToAny(fieldMappings, ["{sentence-audio}", "{sasayaki-audio}"]),
    tags: String(ankiSetting("ankiTags", "hoshitan") || ""),
    allowDuplicate: preferenceValueToBool(ankiSetting("ankiAllowDuplicate", false), false),
    includeScreenshot: preferenceValueToBool(ankiSetting("ankiIncludeScreenshot", true), true),
    includeAudio: preferenceValueToBool(ankiSetting("ankiIncludeAudio", true), true),
    audioPaddingMs: Math.max(0, Math.min(5000, Number(ankiSetting("ankiAudioPaddingMs", 120)) || 0)),
    ffmpegPath: String(ankiSetting("ankiFfmpegPath", "/opt/homebrew/bin/ffmpeg") || "")
  };
}
function ankiMappingPlaceholderValid(mapping) {
  if (/^\{single-glossary-.+\}$/.test(mapping)) return true;
  return [
    "{expression}",
    "{reading}",
    "{furigana-plain}",
    "{audio}",
    "{glossary}",
    "{glossary-brief}",
    "{glossary-first}",
    "{selected-glossary}",
    "{selected-glossary-fallback}",
    "{popup-selection-text}",
    "{sentence}",
    "{frequencies}",
    "{frequency-harmonic-rank}",
    "{pitch-accent-positions}",
    "{pitch-accent-categories}",
    "{document-title}",
    "{book-cover}",
    "{sasayaki-audio}",
    "{definition}",
    "{image}",
    "{sentence-audio}",
    "{source}",
    "{dictionary}"
  ].indexOf(mapping) >= 0;
}
function ankiFieldMappings() {
  let parsed = {};
  const raw = String(ankiSetting("ankiFieldMappingsJson", "") || "").trim();
  if (raw) {
    try { parsed = JSON.parse(raw); } catch (_) { parsed = {}; }
  }
  const out = {};
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    Object.keys(parsed).forEach(fieldName => {
      const name = String(fieldName || "").trim();
      const mapping = String(parsed[fieldName] || "").trim();
      if (name && ankiMappingPlaceholderValid(mapping)) {
        out[name] = mapping;
      }
    });
  }
  if (Object.keys(out).length) return out;
  const legacy = [
    ["ankiFieldSentence", "Front", "{sentence}"],
    ["ankiFieldExpression", "", "{expression}"],
    ["ankiFieldReading", "", "{reading}"],
    ["ankiFieldDefinition", "Back", "{definition}"],
    ["ankiFieldImage", "", "{image}"],
    ["ankiFieldAudio", "", "{sentence-audio}"],
    ["ankiFieldSource", "", "{source}"]
  ];
  legacy.forEach(([key, fallback, mapping]) => {
    const fieldName = String(ankiSetting(key, fallback) || "").trim();
    if (fieldName) out[fieldName] = mapping;
  });
  return out;
}
function ankiFieldsMappedTo(mappings, placeholder) {
  return Object.keys(mappings || {}).filter(fieldName => mappings[fieldName] === placeholder);
}
function ankiFieldsMappedToAny(mappings, placeholders) {
  const allowed = Object.create(null);
  (placeholders || []).forEach(placeholder => { allowed[String(placeholder)] = true; });
  return Object.keys(mappings || {}).filter(fieldName => allowed[mappings[fieldName]]);
}
function ankiSingleGlossaryValue(singleGlossaries, dictionaryTitle) {
  if (Object.prototype.hasOwnProperty.call(singleGlossaries, dictionaryTitle)) {
    return singleGlossaries[dictionaryTitle];
  }
  const normalizedTitle = String(dictionaryTitle || "").replace(/\s+/g, " ").trim();
  const matched = Object.keys(singleGlossaries || {}).find(title =>
    String(title || "").replace(/\s+/g, " ").trim() === normalizedTitle
  );
  return matched ? singleGlossaries[matched] : "";
}
function ankiText(value, maxLength) {
  const normalized = String(value || "").replace(/\u0000/g, "").replace(/\r/g, "").trim();
  return normalized.slice(0, Math.max(1, Number(maxLength) || 50000));
}
function ankiEscapeHtml(value) {
  return ankiText(value, 50000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}
function ankiTags(value) {
  const seen = Object.create(null);
  return String(value || "").split(/[\s,]+/).map(tag => tag.trim()).filter(tag => {
    if (!tag || seen[tag]) return false;
    seen[tag] = true;
    return true;
  }).slice(0, 32);
}
function ankiFieldsFromPayload(payload, settings, sourceText) {
  const fields = {};
  const singleGlossaries = payload && payload.singleGlossaries && typeof payload.singleGlossaries === "object"
    ? payload.singleGlossaries
    : {};
  const glossary = payload && (payload.glossary || payload.definition);
  const glossaryFirst = payload && (payload.glossaryFirst || payload.selectedGlossary || glossary);
  const values = {
    "{sentence}": payload && payload.sentence,
    "{expression}": payload && payload.expression,
    "{reading}": payload && payload.reading,
    "{furigana-plain}": payload && (payload.furiganaPlain || payload.expression),
    "{definition}": glossary,
    "{glossary}": glossary,
    "{glossary-brief}": payload && (payload.glossaryBrief || glossary),
    "{glossary-first}": glossaryFirst,
    "{selected-glossary}": payload && payload.selectedGlossary,
    "{selected-glossary-fallback}": payload && (payload.selectedGlossary || glossaryFirst),
    "{popup-selection-text}": payload && payload.popupSelectionText,
    "{frequencies}": payload && payload.frequencies,
    "{frequency-harmonic-rank}": payload && payload.frequencyHarmonicRank,
    "{pitch-accent-positions}": payload && payload.pitchAccentPositions,
    "{pitch-accent-categories}": payload && payload.pitchAccentCategories,
    "{document-title}": ankiStringProperty("filename", "") || sourceText,
    "{source}": sourceText,
    "{dictionary}": payload && payload.dictionary,
    "{image}": "",
    "{book-cover}": "",
    "{audio}": "",
    "{sentence-audio}": "",
    "{sasayaki-audio}": ""
  };
  Object.keys(settings.fieldMappings || {}).forEach(fieldName => {
    const mapping = settings.fieldMappings[fieldName];
    let value = values[mapping];
    const singleMatch = /^\{single-glossary-(.+)\}$/.exec(mapping);
    if (singleMatch) value = ankiSingleGlossaryValue(singleGlossaries, singleMatch[1]);
    fields[fieldName] = ankiEscapeHtml(value || "");
  });
  return fields;
}
async function ankiInvoke(action, params, settingsOverride) {
  const settings = settingsOverride || ankiSettings();
  if (!settings.url || !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(settings.url)) {
    throw new Error(t("anki.localhost"));
  }
  const request = { action: String(action || ""), version: 6 };
  if (params !== undefined) request.params = params;
  if (settings.apiKey) request.key = settings.apiKey;
  let response;
  try {
    response = await http.post(settings.url, {
      params: {},
      headers: { "Content-Type": "application/json" },
      data: request
    });
  } catch (error) {
    throw new Error(t("anki.connectFailed", { error: compactError(error) }));
  }
  if (!response || Number(response.statusCode || 0) < 200 || Number(response.statusCode || 0) >= 300) {
    throw new Error(t("anki.httpError", { status: String(response && response.statusCode || "unknown") }));
  }
  let body = response.data;
  if (!body || typeof body !== "object") {
    try { body = JSON.parse(String(response.text || "")); }
    catch (_) { body = null; }
  }
  if (!body || typeof body !== "object") throw new Error(t("anki.invalidJson"));
  if (body.error) throw new Error(String(body.error));
  return body.result;
}
async function ankiConnectionMetadata(modelName) {
  const settings = ankiSettings();
  const version = await ankiInvoke("version", undefined, settings);
  const deckNames = await ankiInvoke("deckNames", undefined, settings);
  const modelNames = await ankiInvoke("modelNames", undefined, settings);
  const selectedModel = String(modelName || settings.modelName || "");
  let fieldNames = [];
  if (selectedModel) {
    try {
      fieldNames = await ankiInvoke("modelFieldNames", { modelName: selectedModel }, settings);
    } catch (error) {
      debugWarn("Could not load Anki fields for " + selectedModel + ": " + compactError(error));
    }
  }
  return {
    connected: true,
    version,
    deckNames: Array.isArray(deckNames) ? deckNames : [],
    modelNames: Array.isArray(modelNames) ? modelNames : [],
    modelName: selectedModel,
    fieldNames: Array.isArray(fieldNames) ? fieldNames : []
  };
}
function ankiNumberProperty(name, fallback) {
  try {
    const value = Number(mpv.getNumber(name));
    return Number.isFinite(value) ? value : fallback;
  } catch (_) {
    try {
      const value = Number(mpv.getString(name));
      return Number.isFinite(value) ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }
}
function ankiStringProperty(name, fallback) {
  try {
    const value = mpv.getString(name);
    return value === undefined || value === null || value === "" ? fallback : String(value);
  } catch (_) {
    return fallback;
  }
}
function ankiSubtitleTiming() {
  const timePos = Math.max(0, ankiNumberProperty("time-pos", 0));
  let start = ankiNumberProperty("sub-start", NaN);
  let end = ankiNumberProperty("sub-end", NaN);
  const subDelay = ankiNumberProperty("sub-delay", 0);
  const audioDelay = ankiNumberProperty("audio-delay", 0);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const correction = subDelay - audioDelay;
    start += correction;
    end += correction;
  } else {
    start = Math.max(0, timePos - 1.2);
    end = timePos + 1.2;
  }
  return {
    start: Math.max(0, start),
    end: Math.max(Math.max(0, start) + 0.05, end),
    timePos
  };
}
function ankiSourcePath() {
  const path = ankiStringProperty("path", "");
  if (!path || /^(?:https?|ytdl):/i.test(path)) return "";
  return normalizeFileUrlPath(path);
}
function ankiSourceLabel(timing) {
  const filename = ankiStringProperty("filename", "") || ankiSourcePath().split("/").pop() || "video";
  const seconds = Math.max(0, Number(timing && timing.timePos) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds - Math.floor(seconds)) * 1000);
  const stamp = (hours ? String(hours).padStart(2, "0") + ":" : "") +
    String(minutes).padStart(2, "0") + ":" +
    String(secs).padStart(2, "0") + "." +
    String(millis).padStart(3, "0");
  return filename + " @ " + stamp;
}
function ankiMediaRoot() { return dataPath("anki-media"); }
function ankiSafeFileStem(value) {
  const ascii = String(value || "").normalize ? String(value || "").normalize("NFKD") : String(value || "");
  const stem = ascii.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return stem || "card";
}
function ankiMediaBaseName(payload, timing) {
  const term = ankiSafeFileStem(payload && payload.expression);
  return "hoshitan-" + term + "-" + String(Math.round((timing && timing.timePos || 0) * 1000)) + "-" + String(Date.now());
}
async function waitForFile(path, timeoutMs) {
  const deadline = Date.now() + Math.max(250, Number(timeoutMs) || 3000);
  while (Date.now() < deadline) {
    try { if (file.exists(path)) return path; } catch (_) {}
    await sleep(50);
  }
  throw new Error(t("anki.mediaTimeout", { path }));
}
async function createAnkiScreenshot(outputPath) {
  await execChecked("/bin/mkdir", ["-p", ankiMediaRoot()]);
  try {
    mpv.command("screenshot-to-file", [outputPath, "video"]);
  } catch (error) {
    throw new Error(t("anki.screenshotFailed", { error: compactError(error) }));
  }
  return await waitForFile(outputPath, 5000);
}
function activeAudioFfmpegMap() {
  try {
    const tracks = mpv.getNative("track-list");
    if (Array.isArray(tracks)) {
      const selected = tracks.find(track => track && track.type === "audio" && track.selected);
      const index = Number(selected && (selected["ff-index"] !== undefined ? selected["ff-index"] : selected.ffIndex));
      if (Number.isFinite(index) && index >= 0) return "0:" + String(index);
    }
  } catch (_) {}
  return "0:a:0";
}
function resolveAnkiFfmpegPath(configured) {
  const candidates = [
    String(configured || ""),
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg"
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { if (file.exists(candidate)) return candidate; } catch (_) {}
  }
  return "";
}
async function createAnkiAudio(outputPath, timing, settings) {
  const source = ankiSourcePath();
  if (!source) throw new Error(t("anki.localVideoRequired"));
  const ffmpegPath = resolveAnkiFfmpegPath(settings.ffmpegPath);
  if (!ffmpegPath) throw new Error(t("anki.ffmpegMissing"));
  const padding = Math.max(0, Number(settings.audioPaddingMs) || 0) / 1000;
  const start = Math.max(0, timing.start - padding);
  const end = Math.max(start + 0.05, timing.end + padding);
  await execChecked("/bin/mkdir", ["-p", ankiMediaRoot()]);
  await execChecked(ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-ss", start.toFixed(3),
    "-i", source,
    "-t", (end - start).toFixed(3),
    "-map", activeAudioFfmpegMap(),
    "-vn", "-ac", "1",
    "-c:a", "libmp3lame", "-b:a", "64k",
    outputPath
  ], dataRoot());
  return await waitForFile(outputPath, 1000);
}
function ankiMediaObject(path, filename, fieldNames) {
  const fields = (Array.isArray(fieldNames) ? fieldNames : [fieldNames])
    .map(name => String(name || "").trim())
    .filter(Boolean);
  return { path, filename, fields };
}
async function buildAnkiMedia(payload, settings, timing) {
  const base = ankiMediaBaseName(payload, timing);
  const media = { picture: [], audio: [], warnings: [], paths: [] };
  if (settings.includeScreenshot && settings.imageFields.length) {
    const imagePath = pathJoin(ankiMediaRoot(), base + ".jpg");
    try {
      await createAnkiScreenshot(imagePath);
      media.picture.push(ankiMediaObject(imagePath, base + ".jpg", settings.imageFields));
      media.paths.push(imagePath);
    } catch (error) {
      media.warnings.push(compactError(error));
    }
  }
  if (settings.wordAudioFields.length) {
    try {
      const wordAudio = await resolveWordAudioToFile(
        payload && payload.expression,
        payload && payload.reading,
        ankiMediaRoot(),
        base + "-word"
      );
      if (wordAudio) {
        const filename = base + "-word." + wordAudio.extension;
        media.audio.push(ankiMediaObject(wordAudio.path, filename, settings.wordAudioFields));
        media.paths.push(wordAudio.path);
      }
    } catch (error) {
      media.warnings.push(compactError(error));
    }
  }
  if (settings.includeAudio && settings.sentenceAudioFields.length) {
    const audioPath = pathJoin(ankiMediaRoot(), base + ".mp3");
    try {
      await createAnkiAudio(audioPath, timing, settings);
      media.audio.push(ankiMediaObject(audioPath, base + ".mp3", settings.sentenceAudioFields));
      media.paths.push(audioPath);
    } catch (error) {
      media.warnings.push(compactError(error));
    }
  }
  return media;
}
function cleanupAnkiMedia(paths) {
  (paths || []).forEach(path => safeDelete(path));
}
function validateAnkiCardSettings(settings, fields) {
  if (!settings.deckName) throw new Error(t("anki.deckRequired"));
  if (!settings.modelName) throw new Error(t("anki.modelRequired"));
  if (!Object.keys(fields || {}).length) throw new Error(t("anki.fieldRequired"));
}
async function validateAnkiDestination(settings, fields) {
  const deckNames = await ankiInvoke("deckNames", undefined, settings);
  if (!Array.isArray(deckNames) || deckNames.indexOf(settings.deckName) < 0) {
    throw new Error(t("anki.deckMissing", { deck: settings.deckName }));
  }
  const fieldNames = await ankiInvoke("modelFieldNames", { modelName: settings.modelName }, settings);
  const available = Object.create(null);
  (Array.isArray(fieldNames) ? fieldNames : []).forEach(name => {
    available[String(name).toLowerCase()] = true;
  });
  const configured = Object.keys(settings.fieldMappings || {});
  const missing = configured.filter(name => !available[String(name).toLowerCase()]);
  if (missing.length) {
    throw new Error(t("anki.fieldsMissing", { model: settings.modelName, fields: missing.join(", ") }));
  }
}
async function exportLookupEntryToAnki(payload) {
  if (ankiExportInFlight) throw new Error(t("anki.busy"));
  ankiExportInFlight = true;
  const requestId = String(payload && payload.requestId || "");
  let media = null;
  try {
    const settings = ankiSettings();
    const timing = ankiSubtitleTiming();
    const source = ankiSourceLabel(timing);
    const fields = ankiFieldsFromPayload(payload || {}, settings, source);
    validateAnkiCardSettings(settings, fields);
    await validateAnkiDestination(settings, fields);
    media = await buildAnkiMedia(payload || {}, settings, timing);
    const note = {
      deckName: settings.deckName,
      modelName: settings.modelName,
      fields,
      options: {
        allowDuplicate: !!settings.allowDuplicate,
        duplicateScope: "deck"
      },
      tags: ankiTags(settings.tags)
    };
    if (media.picture.length) note.picture = media.picture;
    if (media.audio.length) note.audio = media.audio;
    const noteId = await ankiInvoke("addNote", { note }, settings);
    const warning = media.warnings.length ? " " + media.warnings.join(" ") : "";
    const message = t("anki.added", { noteId: String(noteId) }) + warning;
    debugLog("Anki export succeeded requestId=" + requestId + " noteId=" + String(noteId) + " media=" + String(media.paths.length));
    postToOverlay("anki-export-result", { requestId, ok: true, noteId, message, warnings: media.warnings });
    notify(message, media.warnings.length ? "error" : "info", 7000);
    return { noteId, message, warnings: media.warnings };
  } catch (error) {
    const message = t("anki.failed", { error: compactError(error) });
    debugError(message + " requestId=" + requestId);
    postToOverlay("anki-export-result", { requestId, ok: false, error: compactError(error), message });
    notify(message, "error", 10000);
    throw error;
  } finally {
    if (media) cleanupAnkiMedia(media.paths);
    ankiExportInFlight = false;
  }
}
function handleAnkiAddRequest(payload) {
  exportLookupEntryToAnki(payload || {}).catch(() => {});
}

const LOCAL_AUDIO_SOURCE_URL = "http://127.0.0.1:19742/localaudio/?term={term}&reading={reading}";
const LOCAL_AUDIO_SOURCE_PRIORITY = [
  "nhk16",
  "daijisen",
  "shinmeikai8",
  "jpod",
  "jpod_alternate",
  "taas",
  "ozk5",
  "forvo",
  "forvo_ext",
  "forvo_ext2"
];
const LOCAL_AUDIO_CANDIDATE_CACHE_MAX = 128;
const LOCAL_AUDIO_RESOLVE_QUEUE_MAX = 4;
const localAudioCandidateCache = Object.create(null);
const localAudioCandidateCacheOrder = [];
const localAudioCandidateInFlight = Object.create(null);
let localAudioResolveTail = Promise.resolve();
let localAudioResolveQueuedCount = 0;

function localAudioEnabled() {
  return prefBool("localAudioEnabled", false);
}
function localAudioDatabasePath() {
  return String(pref("localAudioDatabasePath", "") || "").trim();
}
function isLocalAudioSourceUrl(value) {
  return /^http:\/\/127\.0\.0\.1:19742\/localaudio\/?\?/i.test(String(value || ""));
}
function activeWordAudioSources() {
  const sources = normalizeAudioSources(pref("audioSourcesJson", DEFAULT_AUDIO_SOURCES_JSON));
  const databasePath = localAudioDatabasePath();
  if (!localAudioEnabled() || !databasePath) return sources;
  return [{ name: "Local Audio", url: LOCAL_AUDIO_SOURCE_URL }].concat(sources);
}
function audioSourceUrlForTerm(template, term, reading) {
  return String(template || "")
    .replace(/\{term\}/g, encodeURIComponent(String(term || "")))
    .replace(/\{reading\}/g, encodeURIComponent(String(reading || "")));
}
function audioSqlString(value) {
  return "'" + String(value || "").replace(/'/g, "''") + "'";
}
function katakanaToHiragana(value) {
  return String(value || "").replace(/[\u30a1-\u30f6]/g, character =>
    String.fromCharCode(character.charCodeAt(0) - 0x60)
  );
}
function localAudioSourceOrderSql() {
  return "CASE lower(e.source) " + LOCAL_AUDIO_SOURCE_PRIORITY.map((source, index) =>
    "WHEN " + audioSqlString(source) + " THEN " + String(index)
  ).join(" ") + " ELSE 999 END";
}
function localAudioExtension(filename) {
  const match = /\.([A-Za-z0-9]{2,5})$/.exec(String(filename || ""));
  const extension = match ? match[1].toLowerCase() : "mp3";
  return ["mp3", "opus", "ogg", "m4a", "aac", "wav", "flac"].indexOf(extension) >= 0 ? extension : "mp3";
}
function localAudioMimeType(extension) {
  const types = {
    mp3: "audio/mpeg",
    opus: "audio/ogg",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    flac: "audio/flac"
  };
  return types[String(extension || "").toLowerCase()] || "audio/mpeg";
}
function localAudioFileUrl(path) {
  const raw = String(path || "");
  if (!raw || raw.charAt(0) !== "/") return "";
  return "file://" + raw.split("/").map(part => {
    try { return encodeURIComponent(part); } catch (_) { return part; }
  }).join("/");
}
function localAudioCandidateCacheKey(term, reading) {
  return JSON.stringify([
    localAudioDatabasePath(),
    String(term || "").trim(),
    katakanaToHiragana(String(reading || "").trim())
  ]);
}
function cachedLocalAudioCandidates(key) {
  const cached = localAudioCandidateCache[key];
  if (!cached || !cached.path || !Array.isArray(cached.candidates)) return null;
  try {
    if (!file.exists(cached.path)) return null;
  } catch (_) {
    return null;
  }
  return cached.candidates.map(candidate => Object.assign({}, candidate));
}
function setLocalAudioCandidateCache(key, value) {
  if (!key || !value || !value.path || !Array.isArray(value.candidates)) return;
  if (Object.prototype.hasOwnProperty.call(localAudioCandidateCache, key)) {
    const existing = localAudioCandidateCacheOrder.indexOf(key);
    if (existing >= 0) localAudioCandidateCacheOrder.splice(existing, 1);
  }
  localAudioCandidateCache[key] = value;
  localAudioCandidateCacheOrder.push(key);
  while (localAudioCandidateCacheOrder.length > LOCAL_AUDIO_CANDIDATE_CACHE_MAX) {
    const oldest = localAudioCandidateCacheOrder.shift();
    if (oldest) delete localAudioCandidateCache[oldest];
  }
}
function enqueueLocalAudioResolve(task) {
  if (localAudioResolveQueuedCount >= LOCAL_AUDIO_RESOLVE_QUEUE_MAX) {
    debugVerbose("local audio request dropped: queue full");
    return Promise.resolve([]);
  }
  localAudioResolveQueuedCount++;
  const run = localAudioResolveTail.catch(() => {}).then(task);
  const cleanup = () => {
    localAudioResolveQueuedCount = Math.max(0, localAudioResolveQueuedCount - 1);
  };
  localAudioResolveTail = run.then(cleanup, cleanup);
  return run;
}
async function findLocalAudioRecord(term, reading) {
  const databasePath = localAudioDatabasePath();
  if (!databasePath) {
    debugVerbose("local audio lookup skipped: database path is empty");
    return null;
  }
  const expression = String(term || "").trim();
  const normalizedReading = katakanaToHiragana(String(reading || "").trim());
  if (!expression) return null;
  const readingClause = normalizedReading
    ? "CASE WHEN e.reading = " + audioSqlString(normalizedReading) + " THEN 0 WHEN e.reading = '' THEN 1 ELSE 2 END,"
    : "CASE WHEN e.reading = '' THEN 0 ELSE 1 END,";
  const sql = [
    "SELECT a.id, e.source, a.file",
    "FROM entries e JOIN android a ON a.file = e.file AND a.source = e.source",
    "WHERE e.expression = " + audioSqlString(expression),
    "ORDER BY " + readingClause + " " + localAudioSourceOrderSql() + ", a.id",
    "LIMIT 1;"
  ].join(" ");
  const result = await utils.exec("/usr/bin/sqlite3", ["-readonly", "-separator", "\t", databasePath, sql], dataRoot());
  if (!result || result.status !== 0) {
    throw new Error("Local audio database query failed: " + String((result && result.stderr) || "sqlite3 failed").slice(0, 500));
  }
  const line = String(result.stdout || "").trim().split(/\r?\n/)[0] || "";
  debugVerbose("local audio lookup term=" + JSON.stringify(expression) + " reading=" + JSON.stringify(normalizedReading) + " matched=" + String(!!line));
  const columns = line.split("\t");
  if (columns.length < 3 || !columns[0]) return null;
  return {
    id: Number(columns[0]),
    source: columns[1] || "Local Audio",
    filename: columns.slice(2).join("\t"),
    databasePath
  };
}
async function extractLocalAudioRecord(record, outputRoot, stem) {
  if (!record) return null;
  const extension = localAudioExtension(record.filename);
  const outputPath = pathJoin(outputRoot, ankiSafeFileStem(stem || "word-audio") + "." + extension);
  await execChecked("/bin/mkdir", ["-p", outputRoot]);
  if (file.exists(outputPath)) {
    return {
      path: outputPath,
      extension,
      source: record.source,
      filename: String(record.filename || "")
    };
  }
  const sql = "SELECT writefile(" + audioSqlString(outputPath) + ", data) FROM android WHERE id = " + String(record.id) + " LIMIT 1;";
  const result = await utils.exec("/usr/bin/sqlite3", [record.databasePath, sql], dataRoot());
  if (!result || result.status !== 0 || !file.exists(outputPath)) {
    throw new Error("Local audio extraction failed: " + String((result && result.stderr) || "sqlite3 failed").slice(0, 500));
  }
  return {
    path: outputPath,
    extension,
    source: record.source,
    filename: String(record.filename || "")
  };
}
async function extractLocalWordAudio(term, reading, outputRoot, stem) {
  const record = await findLocalAudioRecord(term, reading);
  return record ? await extractLocalAudioRecord(record, outputRoot, stem) : null;
}
async function runWorkerLocalAudioRequest(term, reading, outputRoot, stem, timeoutMs) {
  if (typeof ensureBackendWorker !== "function") throw new Error("Dictionary worker is not available for local audio.");
  await ensureBackendWorker();
  const timeout = Math.max(1000, timeoutMs || prefNumber("lookupTimeoutMs", 9000));
  const id = makeJsWorkerRequestId();
  const req = pathJoin(workerQueueDir(), id + ".json");
  const resp = pathJoin(workerResponseDir(), id + ".json");
  const payload = {
    requestId: id,
    type: "localAudio",
    databasePath: localAudioDatabasePath(),
    term: String(term || "").trim(),
    reading: katakanaToHiragana(String(reading || "").trim()),
    outputRoot: String(outputRoot || ""),
    stem: ankiSafeFileStem(stem || "word-audio")
  };
  const startedAt = Date.now();
  debugVerbose("worker local audio write requestId=" + id + " term=" + JSON.stringify(payload.term) + " reading=" + JSON.stringify(payload.reading));
  file.write(req, JSON.stringify(payload) + "\n");
  const deadline = startedAt + timeout;
  while (Date.now() < deadline) {
    if (file.exists(resp)) {
      const raw = String(file.read(resp) || "");
      safeDelete(resp);
      safeDelete(req);
      const parsed = parseBackendJsonOutput(raw, "");
      debugVerbose("worker local audio done requestId=" + id + " elapsedMs=" + (Date.now() - startedAt) + " stdoutBytes=" + raw.length + " found=" + String(parsed && parsed.found));
      if (!parsed || parsed.ok === false) throw new Error((parsed && parsed.error) || "Worker local audio failed");
      return parsed;
    }
    if (file.exists(workerStopPath())) {
      safeDelete(req);
      throw new Error("Worker stopped before local audio completed");
    }
    await sleep(configuredDirectIpcPollMs());
  }
  safeDelete(req);
  throw new Error("Worker local audio timed out after " + timeout + " ms");
}
function audioQueryParameter(sourceUrl, name) {
  const raw = String(sourceUrl || "");
  try {
    if (typeof URL === "function") return new URL(raw).searchParams.get(name) || "";
  } catch (_) {}
  const query = raw.split("?").slice(1).join("?").split("#")[0];
  const parts = query ? query.split("&") : [];
  for (const part of parts) {
    const pair = part.split("=");
    let key = "";
    try { key = decodeURIComponent(String(pair.shift() || "").replace(/\+/g, " ")); } catch (_) {}
    if (key !== name) continue;
    try { return decodeURIComponent(pair.join("=").replace(/\+/g, " ")); } catch (_) { return ""; }
  }
  return "";
}
async function localAudioCandidatesForUrl(sourceUrl) {
  const term = audioQueryParameter(sourceUrl, "term");
  const reading = audioQueryParameter(sourceUrl, "reading");
  const cacheKey = localAudioCandidateCacheKey(term, reading);
  const cached = cachedLocalAudioCandidates(cacheKey);
  if (cached) return cached;
  if (localAudioCandidateInFlight[cacheKey]) return await localAudioCandidateInFlight[cacheKey];
  const work = enqueueLocalAudioResolve(async () => {
    const currentCached = cachedLocalAudioCandidates(cacheKey);
    if (currentCached) return currentCached;
    const root = dataPath("audio-cache");
    const stem = [
      "overlay",
      String(term || "").trim(),
      katakanaToHiragana(String(reading || "").trim())
    ].filter(Boolean).join("-");
    const result = await runWorkerLocalAudioRequest(term, reading, root, stem, prefNumber("lookupTimeoutMs", 9000));
    if (!result || !result.found || !result.path) return [];
    const url = localAudioFileUrl(result.path);
    if (!url) return [];
    const candidates = [{
      name: result.source || "Local Audio",
      url
    }];
    setLocalAudioCandidateCache(cacheKey, { path: result.path, candidates });
    return candidates.map(candidate => Object.assign({}, candidate));
  });
  localAudioCandidateInFlight[cacheKey] = work;
  try {
    return await work;
  } finally {
    if (localAudioCandidateInFlight[cacheKey] === work) delete localAudioCandidateInFlight[cacheKey];
  }
}
function audioDownloadExtension(url) {
  let pathname = String(url || "");
  try { pathname = new URL(pathname).pathname; } catch (_) {}
  return localAudioExtension(pathname);
}
async function downloadWordAudioCandidate(candidate, outputRoot, stem) {
  const url = safeAudioCandidateUrl(candidate && candidate.url, "");
  if (!url || /^data:/i.test(url)) return null;
  const extension = audioDownloadExtension(url);
  const outputPath = pathJoin(outputRoot, ankiSafeFileStem(stem || "word-audio") + "." + extension);
  await execChecked("/bin/mkdir", ["-p", outputRoot]);
  const result = await utils.exec("/usr/bin/curl", [
    "--silent", "--show-error", "--fail", "--location", "--max-time", "12",
    "--output", outputPath, url
  ], dataRoot());
  if (!result || result.status !== 0 || !file.exists(outputPath)) {
    safeDelete(outputPath);
    return null;
  }
  return { path: outputPath, extension, source: String((candidate && candidate.name) || "") };
}
async function resolveWordAudioToFile(term, reading, outputRoot, stem) {
  const sources = activeWordAudioSources();
  for (const source of sources) {
    const sourceUrl = audioSourceUrlForTerm(source && source.url, term, reading);
    if (!sourceUrl) continue;
    if (isLocalAudioSourceUrl(sourceUrl)) {
      const local = await extractLocalWordAudio(term, reading, outputRoot, stem);
      if (local) return local;
      continue;
    }
    let candidates = [];
    try {
      candidates = await fetchAudioSourceCandidates(sourceUrl);
    } catch (_) {
      candidates = [{ name: String((source && source.name) || ""), url: sourceUrl }];
    }
    for (const candidate of candidates) {
      const downloaded = await downloadWordAudioCandidate(candidate, outputRoot, stem);
      if (downloaded) return downloaded;
    }
  }
  return null;
}

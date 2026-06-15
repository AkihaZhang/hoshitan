function dictionaryZipValidation(zipPath, existsFn) {
  const raw = zipPath === undefined || zipPath === null ? "" : String(zipPath).trim();
  if (!raw || raw === "[object Promise]") {
    return { ok: false, reason: "empty", message: t("dict.noZip") };
  }
  if (!/\.zip$/i.test(raw)) {
    return { ok: false, reason: "extension", path: raw, message: t("dict.notZip", { path: raw }) };
  }
  if (typeof existsFn === "function") {
    let exists = false;
    try { exists = !!existsFn(raw); } catch (_) { exists = false; }
    if (!exists) {
      return { ok: false, reason: "missing", path: raw, message: t("dict.missingZip", { path: raw }) };
    }
  }
  return { ok: true, path: raw };
}

function isPromiseLike(value) {
  return !!value && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
}

async function resolveMaybePromise(value) {
  return isPromiseLike(value) ? await value : value;
}

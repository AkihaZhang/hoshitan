const I18N_MESSAGES = {
  en: {
    "menu.settings": "Settings...",
    "menu.profiles": "Profiles",
    "menu.more": "More",
    "menu.debug": "Debug",
    "menu.benchmark": "Run Lookup Performance Benchmark",
    "menu.parserTests": "Run Lookup Parser Unit Tests",
    "menu.languageTests": "Run Language Unit Tests",
    "menu.settingsTests": "Run Settings Audit Checks",
    "menu.filePicker": "Test File Picker API",
    "menu.lookupTest": "Test Dictionary Lookup",
    "menu.restartLookup": "Restart Dictionary Lookup",
    "menu.stopLookup": "Stop Dictionary Lookup",
    "menu.taskTest": "Show Task Panel Test",
    "menu.logTest": "Emit Debug Log Test Message",
    "menu.revealLog": "Reveal Debug Log File",
    "menu.revealData": "Reveal Plugin Data Folder",
    "state.on": "Hoshitan: On",
    "state.off": "Hoshitan: Off",
    "lookup.ready": "Dictionary lookup ready for {language}.",
    "settings.title": "Hoshitan Settings",
    "anki.connected": "Connected to AnkiConnect.",
    "anki.localhost": "AnkiConnect URL must point to localhost.",
    "anki.connectFailed": "Could not connect to AnkiConnect: {error}",
    "anki.httpError": "AnkiConnect HTTP error {status}",
    "anki.invalidJson": "AnkiConnect returned invalid JSON.",
    "anki.mediaTimeout": "Timed out waiting for media file: {path}",
    "anki.screenshotFailed": "IINA could not capture the current frame: {error}",
    "anki.localVideoRequired": "Audio export requires a local video file.",
    "anki.ffmpegMissing": "FFmpeg was not found. Set its path in Hoshitan Settings.",
    "anki.deckRequired": "Choose an Anki deck in Settings.",
    "anki.modelRequired": "Choose an Anki note type in Settings.",
    "anki.fieldRequired": "Configure at least one Anki text field.",
    "anki.deckMissing": "Anki deck was not found: {deck}",
    "anki.fieldsMissing": "Fields not found in note type {model}: {fields}",
    "anki.busy": "Another Anki card is still being created.",
    "anki.added": "Added Anki note {noteId}.",
    "anki.failed": "Anki export failed: {error}",
    "manager.connected": "Connected to AnkiConnect.",
    "manager.busy": "Another dictionary action is already running.",
    "manager.actionFailed": "{action} failed: {error}",
    "manager.actionComplete": "{action} complete.",
    "manager.actionCancelled": "{action} cancelled.",
    "manager.pickerFailed": "Could not open dictionary ZIP picker: {error}",
    "manager.importCancelled": "Dictionary import cancelled.",
    "manager.importing": "Importing {count}...",
    "manager.imported": "Imported {count}.",
    "manager.importFailed": "Importing dictionary failed: {error}",
    "manager.refreshed": "Dictionary list refreshed.",
    "manager.selectionSaved": "Dictionary selection saved.",
    "manager.orderSaved": "Dictionary order saved.",
    "manager.deletingDictionary": "Deleting dictionary",
    "manager.switchingProfile": "Switching profile",
    "manager.creatingProfile": "Creating profile",
    "manager.profileRenamed": "Profile renamed.",
    "manager.renameFailed": "Renaming profile failed: {error}",
    "manager.deletingProfile": "Deleting profile",
    "manager.profileSaved": "Profile settings saved.",
    "manager.profileSaveFailed": "Saving profile settings failed: {error}",
    "manager.globalSaved": "Global settings saved.",
    "manager.globalSaveFailed": "Saving global settings failed: {error}",
    "manager.connecting": "Connecting to AnkiConnect...",
    "manager.ankiError": "AnkiConnect: {error}",
    "manager.unavailable": "This IINA build does not expose standalone windows.",
    "manager.openFailed": "Could not open Hoshitan Settings: {error}",
    "manager.oneDictionary": "dictionary",
    "manager.manyDictionaries": "{count} dictionaries",
    "dict.noInstalled": "No dictionaries installed/enabled. Open Hoshitan Settings to import a Yomitan dictionary ZIP.",
    "dict.noInstalledForLanguage": "No dictionaries installed/enabled for {language}. Import or enable a Yomitan dictionary ZIP.",
    "dict.imported": "Added {title} ({count} terms).",
    "dict.importTime": "Import took about {seconds} seconds.",
    "dict.importCancelled": "Dictionary import cancelled.",
    "dict.multipleImported": "Imported {count} dictionaries.",
    "dict.adding": "Adding dictionary",
    "dict.preparingImport": "Preparing import...",
    "dict.importing": "Importing dictionary...",
    "dict.largeImport": "Large dictionaries can take several minutes.",
    "dict.savingList": "Saving dictionary list...",
    "dict.refreshingList": "Refreshing installed dictionaries.",
    "dict.refreshingWorker": "Refreshing lookup worker...",
    "dict.workerAvailable": "The new dictionary will be available for hover popups.",
    "dict.lookupReady": "Dictionary lookup ready.",
    "dict.preparingLookup": "Preparing dictionary lookup...",
    "dict.chooseZip": "Choose Yomitan dictionary ZIPs",
    "dict.noZip": "No dictionary ZIP was selected.",
    "dict.notZip": "Selected file is not a .zip dictionary: {path}",
    "dict.missingZip": "Selected dictionary ZIP does not exist: {path}",
    "dict.compatibilityWarning": "No enabled dictionary is marked compatible with {language}; lookup will still try the enabled dictionaries.",
    "dict.enabled": "Enabled dictionary: {name}",
    "dict.disabled": "Disabled dictionary: {name}",
    "dict.orderUpdated": "Updated dictionary order.",
    "dict.workerRestartFailed": "Dictionary imported, but the lookup worker could not restart. Restart Hoshitan or use Debug -> Restart Dictionary Lookup.",
    "dict.manifestUpdateFailed": "Manifest update failed.",
    "dict.backendImportFailed": "Backend import command failed.",
    "dict.importStageFailed": "Dictionary import failed.",
    "dict.couldNotAdd": "Could not add dictionary.",
    "dict.couldNotAddDetail": "Could not add dictionary: {error}"
  },
  "zh-CN": {
    "menu.settings": "设置...",
    "menu.profiles": "配置方案",
    "menu.more": "更多",
    "menu.debug": "调试",
    "menu.benchmark": "运行查词性能测试",
    "menu.parserTests": "运行查词解析器单元测试",
    "menu.languageTests": "运行语言单元测试",
    "menu.settingsTests": "运行设置检查",
    "menu.filePicker": "测试文件选择器",
    "menu.lookupTest": "测试词典查词",
    "menu.restartLookup": "重启词典查词",
    "menu.stopLookup": "停止词典查词",
    "menu.taskTest": "显示任务面板测试",
    "menu.logTest": "写入调试日志测试消息",
    "menu.revealLog": "在访达中显示调试日志",
    "menu.revealData": "在访达中显示插件数据目录",
    "state.on": "Hoshitan：已开启",
    "state.off": "Hoshitan：已关闭",
    "lookup.ready": "{language}词典查词已就绪。",
    "settings.title": "Hoshitan 设置",
    "anki.connected": "已连接到 AnkiConnect。",
    "anki.localhost": "AnkiConnect 地址必须指向本机。",
    "anki.connectFailed": "无法连接 AnkiConnect：{error}",
    "anki.httpError": "AnkiConnect HTTP 错误 {status}",
    "anki.invalidJson": "AnkiConnect 返回了无效的 JSON。",
    "anki.mediaTimeout": "等待媒体文件超时：{path}",
    "anki.screenshotFailed": "IINA 无法截取当前画面：{error}",
    "anki.localVideoRequired": "导出音频需要本地视频文件。",
    "anki.ffmpegMissing": "未找到 FFmpeg，请在 Hoshitan 设置中填写路径。",
    "anki.deckRequired": "请在设置中选择 Anki 牌组。",
    "anki.modelRequired": "请在设置中选择 Anki 笔记类型。",
    "anki.fieldRequired": "请至少配置一个 Anki 文本字段。",
    "anki.deckMissing": "未找到 Anki 牌组：{deck}",
    "anki.fieldsMissing": "笔记类型 {model} 中不存在这些字段：{fields}",
    "anki.busy": "上一张 Anki 卡片仍在创建中。",
    "anki.added": "已添加 Anki 笔记 {noteId}。",
    "anki.failed": "Anki 导出失败：{error}",
    "manager.connected": "已连接到 AnkiConnect。",
    "manager.busy": "另一个词典操作仍在进行中。",
    "manager.actionFailed": "{action}失败：{error}",
    "manager.actionComplete": "{action}已完成。",
    "manager.actionCancelled": "已取消{action}。",
    "manager.pickerFailed": "无法打开词典 ZIP 选择器：{error}",
    "manager.importCancelled": "已取消词典导入。",
    "manager.importing": "正在导入{count}...",
    "manager.imported": "已导入{count}。",
    "manager.importFailed": "词典导入失败：{error}",
    "manager.refreshed": "词典列表已刷新。",
    "manager.selectionSaved": "词典选择已保存。",
    "manager.orderSaved": "词典顺序已保存。",
    "manager.deletingDictionary": "正在删除词典",
    "manager.switchingProfile": "正在切换配置方案",
    "manager.creatingProfile": "正在创建配置方案",
    "manager.profileRenamed": "配置方案已重命名。",
    "manager.renameFailed": "重命名配置方案失败：{error}",
    "manager.deletingProfile": "正在删除配置方案",
    "manager.profileSaved": "配置方案设置已保存。",
    "manager.profileSaveFailed": "保存配置方案设置失败：{error}",
    "manager.globalSaved": "全局设置已保存。",
    "manager.globalSaveFailed": "保存全局设置失败：{error}",
    "manager.connecting": "正在连接 AnkiConnect...",
    "manager.ankiError": "AnkiConnect：{error}",
    "manager.unavailable": "当前 IINA 版本不支持插件独立窗口。",
    "manager.openFailed": "无法打开 Hoshitan 设置：{error}",
    "manager.oneDictionary": "词典",
    "manager.manyDictionaries": "{count} 个词典",
    "dict.noInstalled": "没有已安装并启用的词典。请打开 Hoshitan 设置导入 Yomitan 词典 ZIP。",
    "dict.noInstalledForLanguage": "没有为{language}安装并启用词典。请导入或启用 Yomitan 词典 ZIP。",
    "dict.imported": "已添加 {title}（{count} 个词条）。",
    "dict.importTime": "导入耗时约 {seconds} 秒。",
    "dict.importCancelled": "已取消词典导入。",
    "dict.multipleImported": "已导入 {count} 个词典。",
    "dict.adding": "正在添加词典",
    "dict.preparingImport": "正在准备导入...",
    "dict.importing": "正在导入词典...",
    "dict.largeImport": "大型词典可能需要几分钟。",
    "dict.savingList": "正在保存词典列表...",
    "dict.refreshingList": "正在刷新已安装词典。",
    "dict.refreshingWorker": "正在刷新查词进程...",
    "dict.workerAvailable": "新词典很快即可用于字幕悬停查词。",
    "dict.lookupReady": "词典查词已就绪。",
    "dict.preparingLookup": "正在准备词典查词...",
    "dict.chooseZip": "选择 Yomitan 词典 ZIP",
    "dict.noZip": "未选择词典 ZIP。",
    "dict.notZip": "所选文件不是 .zip 词典：{path}",
    "dict.missingZip": "所选词典 ZIP 不存在：{path}",
    "dict.compatibilityWarning": "没有标记为兼容{language}的已启用词典；仍会尝试使用当前启用的词典查词。",
    "dict.enabled": "已启用词典：{name}",
    "dict.disabled": "已停用词典：{name}",
    "dict.orderUpdated": "词典顺序已更新。",
    "dict.workerRestartFailed": "词典已导入，但查词进程重启失败。请重启 Hoshitan，或使用“调试 -> 重启词典查词”。",
    "dict.manifestUpdateFailed": "更新词典清单失败。",
    "dict.backendImportFailed": "词典后端导入命令失败。",
    "dict.importStageFailed": "词典导入失败。",
    "dict.couldNotAdd": "无法添加词典。",
    "dict.couldNotAddDetail": "无法添加词典：{error}"
  }
};

let detectedSystemUiLanguage = "en";

function normalizeUiLanguage(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/_/g, "-");
  if (raw === "zh-cn" || raw === "zh-hans" || raw.indexOf("zh-hans-") === 0 || raw.indexOf("zh-cn-") === 0) return "zh-CN";
  if (raw === "en" || raw.indexOf("en-") === 0) return "en";
  return raw === "auto" || !raw ? "auto" : "en";
}
function configuredUiLanguage() {
  return normalizeUiLanguage(pref("uiLanguage", "auto"));
}
function resolvedUiLanguage() {
  const configured = configuredUiLanguage();
  return configured === "auto" ? detectedSystemUiLanguage : configured;
}
function t(key, values) {
  const language = resolvedUiLanguage();
  const table = I18N_MESSAGES[language] || I18N_MESSAGES.en;
  let text = table[key] || I18N_MESSAGES.en[key] || String(key || "");
  Object.keys(values || {}).forEach(name => {
    text = text.split("{" + name + "}").join(String(values[name]));
  });
  return text;
}
function languageLabelForUi(language) {
  const id = String(language && language.id || "");
  const labels = { ja: "日本語", en: "English", fr: "Français", de: "Deutsch", zh: "中文", ko: "한국어" };
  return labels[id] || String(language && (language.nativeLabel || language.label) || id);
}
async function refreshSystemUiLanguage() {
  if (configuredUiLanguage() !== "auto") return resolvedUiLanguage();
  const detected = detectedSystemUiLanguage;
  if (detected !== detectedSystemUiLanguage) {
    detectedSystemUiLanguage = detected;
    try { rebuildMenu(); } catch (_) {}
    try { if (initialized) postToOverlay("config", overlayConfig()); } catch (_) {}
    try { postDictionaryManagerState(); } catch (_) {}
  }
  return detectedSystemUiLanguage;
}

# Changelog

## 0.1.0-dev.18 - 2026-06-19

- Added per-profile editable video shortcuts in Settings while preserving the existing default key bindings.
- Reworked shortcut registration around action IDs so future shortcut actions can be added from one shared definition table.
- Made popup nested lookup respond to selected text and clicked text positions instead of requiring a double-click-only path.
- Added click-outside-to-close behavior for lookup popups and tightened collapsed dictionary section spacing.
- Updated local audio wording to avoid requiring a specific database filename and credited the original Hoshi Reader project.

## 0.1.0-dev.17 - 2026-06-19

- Stopped local overlay word audio from piping media through `base64` subprocess stdout; playback now reuses cached local file URLs.
- Moved hover/autoplay local-audio lookup and extraction into the persistent native worker so rapid popup audio no longer spawns plugin-side sqlite subprocesses.
- Added bounded local-audio bridge queuing and duplicate request coalescing so rapid hover autoplay cannot build an audio backlog.
- Delayed popup audio autoplay and availability probing until the hovered lookup stays stable, and cancel stale audio bridge requests when a new lookup renders.

## 0.1.0-dev.15 - 2026-06-19

- Fixed lookup timeout/high-CPU regressions caused by subtitle and profile warmups restarting the dictionary worker with flattened dictionary paths.
- Kept worker startup on the grouped term, frequency, and pitch dictionary configuration so hover lookups are not interrupted by background warmups.

## 0.1.0-dev.14 - 2026-06-18

- Removed the recommended Jitendex download flow; enabled local Yomitan dictionaries are no longer treated as dependent on a bundled recommendation.
- Split dictionary worker configuration into Hoshi-style term, frequency, and pitch dictionary groups, avoiding loading every dictionary as every type.
- Refresh the installed native lookup backend when the bundled binary changes, so development builds do not keep using an older worker.
- Export `{sentence}` to Anki with the matched word bolded while preserving rendered glossary HTML.
- Kept nested lookup results visible while showing lookup progress in the popup action bar.
- Display lookup language names using each language's native name.

## 0.1.0-dev.13 - 2026-06-18

- Export rendered Yomitan glossary HTML and scoped dictionary stylesheet rules to Anki instead of flattening definitions to plain text.
- Auto-map Lapis card type, frequency, pitch, and screenshot fields so new cards show both the word and sentence on the front.

## 0.1.0-dev.12 - 2026-06-18

- Reduced the default Hoshitan and native IINA subtitle scale so the subtitle overlay starts smaller on video playback.
- Made subtitle size controls in Settings save while typing, so scale changes apply without leaving the input.

## 0.1.0-dev.11 - 2026-06-18

- Removed the remaining client-executable lookup fallback from interactive lookup paths and rejected remote audio URLs in the plugin-side local audio bridge.
- Throttled repeated audio button clicks for the same source to prevent playback churn during rapid lookup testing.

## 0.1.0-dev.10 - 2026-06-17

- Added bounded LRU storage for large lookup results so repeated hover lookups cannot grow IINA's plugin memory for the whole playback session.
- Added caps for overlay audio/probe caches and release `Audio` objects after failures or replacement playback.

## 0.1.0-dev.9 - 2026-06-16

- Disabled client-executable lookup fallback unless explicitly opted in, preventing repeated `utils.exec` subprocesses from driving IINA CPU spikes when direct worker IPC is available.
- Stopped routing online audio source checks through plugin-side `curl`; online sources now resolve in the overlay, while local audio continues to use the plugin bridge.
- Made popup audio probing opt-in and lightweight so opening a lookup popup no longer eagerly loads audio.
- Suppressed hover lookups from idle mouseenter events after subtitle rerenders, avoiding continuous lookup churn when the cursor rests over the subtitle area during playback.
- Added controls for Hoshitan subtitle size, IINA native subtitle scale, and popup top safe margin; defaults now keep native subtitles smaller and popup controls away from the title bar.

## 0.1.0-dev.8 - 2026-06-16

- Fixed a high-CPU polling path where native subtitle visibility checks read manifest and worker files on every subtitle timer tick.

## 0.1.0-dev.7 - 2026-06-16

- Reduced idle CPU use by moving dictionary worker polling from a 2ms busy loop to conservative bounded intervals.
- Limited popup audio availability probing to the primary visible entry and cached probe results, avoiding repeated eager audio loads across all dictionary results.

## 0.1.0-dev.6 - 2026-06-15

- Reworked lookup popups with a fixed navigation bar, compact audio and Anki actions, collapsible dictionary groups, and configurable pixel height.
- Word audio is checked for the primary entry when a popup appears, so unavailable audio is marked with a red cross before playback is requested.

## 0.1.0-dev.5 - 2026-06-15

- Anki field mappings are now editable templates with placeholder suggestions, so text and multiple parameters can be entered manually.
- Preserved safe Yomitan structured-content colors, typography, spacing, and dictionary stylesheet rules in lookup popups.

## 0.1.0-dev.4 - 2026-06-15

- Fixed an IINA crash when using video shortcuts. Shortcut handlers now avoid unsafe JavaScript array bridging in `mpv.command`.

## 0.1.0-dev.3 - 2026-06-15

### Added

- Added scoped Yomitan dictionary `styles.css` support while preserving structured `data-sc-*` attributes.
- Added popup close and nested-lookup Back controls; double-click selected popup text to look it up.
- Added video shortcuts for playback, seeking, subtitle navigation and visibility, fullscreen, popup close, and video stop.

### Fixed

- Stopped audio-button clicks from being misrouted to Anki export and showing a false missing-entry error.
- Prevented stale audio requests and subtitle heartbeat replays from repeatedly playing the first word.
- Changed visible Anki mappings to the canonical `{image}` and `{sentence-audio}` names while retaining legacy import compatibility.
- Reduced overlay traffic by sending dictionary styles only during configuration synchronization instead of every subtitle heartbeat.

## 0.1.0-dev.2 - 2026-06-15

### Added

- Added Hoshi Reader-compatible Anki placeholders for furigana, glossaries, popup selection, frequency, pitch accent, document title, screenshot, and subtitle audio.
- Added dynamic `{single-glossary-DICTIONARY}` mappings for installed term dictionaries.

### Fixed

- Preserved dictionary titles containing full-width spaces when resolving per-dictionary Anki fields.
- Kept legacy Hoshi Reader field aliases compatible while mapping them to the video screenshot and subtitle MP3 clip.

## 0.1.0-dev.1 - 2026-06-15

Initial Hoshitan testing build, based on the upstream project history.

### Added

- Added AnkiConnect card export from dictionary entries with configurable deck, note type, field mapping, tags, duplicate handling, screenshots, and subtitle-timed audio.
- Added Anki connection metadata loading, automatic note-type field fetching, and raw English field mapping, including common Lapis fields.
- Added Anki word-audio export through the `{audio}` mapping while keeping subtitle clips separate as `{sentence-audio}`.
- Added interface localization with automatic macOS language detection and explicit English or Simplified Chinese selection.
- Added a dedicated Audio settings panel with the Hoshi Reader online endpoint and direct Hoshi Reader `android.db` support.

### Fixed

- Kept transient empty subtitle properties from clearing lookup text and replayed active subtitles after dropped or reloaded overlay messages.
- Restored lookup subtitles after switching from an embedded image subtitle to an external text subtitle by reattaching the overlay when the first text subtitle appears, without requiring a target-language toggle.
- Assigned each IINA plugin instance its own local bridge port so multiple windows or processes no longer disable lookup/audio messaging with an address-in-use error.
- Changed Anki sentence-audio clips from AAC/M4A to MP3.

For history before the Hoshitan fork, see the
[upstream changelog](https://github.com/afn478/iinatan/blob/main/CHANGELOG.md).

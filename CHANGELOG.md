# Changelog

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

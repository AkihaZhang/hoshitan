# Hoshitan ![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20IINA-lightgrey) ![Status](https://img.shields.io/badge/status-beta-orange) ![License](https://img.shields.io/badge/license-GPLv3-blue)

**English** | [简体中文](README.zh-CN.md)

> [!WARNING]
> Hoshitan is still a testing build. Development happens on the `dev` branch, there is no stable release yet, and settings or behavior may change without migration support.

Hoshitan is an IINA plugin for subtitle lookup and Anki card creation. It adds hover dictionary popups, word audio, screenshots, subtitle audio clips, and AnkiConnect export to videos with text subtitles.

The project is an experimental fork of [afn478/iinatan](https://github.com/afn478/iinatan), with a separate feature set focused on Hoshi Reader style dictionary lookup and card mining.

## Features

- Hover over text subtitles in IINA to open dictionary popups.
- Japanese lookup through HoshiDicts with Yomitan-compatible term dictionaries and deinflection.
- Experimental English, French, German, Chinese, and Korean lookup modes for compatible Yomitan dictionaries.
- Separate Term, Frequency, and Pitch dictionary groups, with profile-specific priority and enable/disable controls.
- Popup rendering for structured Yomitan content, bundled dictionary `styles.css`, collapsible dictionary sections, nested lookup, and custom CSS.
- Online word audio from Yomitan `audioSourceList` endpoints or direct URL templates.
- Local word audio from Hoshi Reader compatible local audio database exports, without a separate localhost server.
- AnkiConnect export with configurable deck, note type, field mapping, tags, screenshot, word audio, and subtitle audio.
- Subtitle audio clips are exported as MP3.
- English and Simplified Chinese UI for settings, menus, popups, status messages, and Anki actions.

## Requirements

- macOS with [IINA](https://iina.io/).
- Text subtitles such as `.ass`, `.srt`, or embedded text subtitle tracks. Image subtitles such as PGS cannot be dictionary-scanned.
- Yomitan-compatible dictionaries. Japanese dictionaries can be split into Term, Frequency, and Pitch groups.
- Optional: [Anki](https://apps.ankiweb.net/) with AnkiConnect for card creation.
- Optional: FFmpeg for screenshot/audio export if IINA cannot find it automatically.

## Install

### From GitHub

1. Open IINA's plugin manager.
2. Choose **Install from GitHub**.
3. Enter `AkihaZhang/hoshitan`.
4. Enable the plugin.
5. Open **Plugins -> Hoshitan -> Settings...**.
6. Import or enable the dictionaries you want to use.
7. Toggle Hoshitan with **Shift+H**.

### Release Package

There is no stable release package yet. Testing packages are built from the `dev` branch.

## Basic Setup

1. Open **Plugins -> Hoshitan -> Settings...**.
2. Choose a lookup language.
3. Import Yomitan-compatible dictionaries from ZIP files or folders.
4. Enable and order Term, Frequency, and Pitch dictionaries in the dictionary panel.
5. Open a video with a text subtitle track.
6. Pause playback, move the pointer over subtitle text, and wait for the popup.

Double-click text inside a popup to perform nested lookup. Use the Back / Forward buttons, the close button, or **Esc** to navigate and dismiss the popup.

## Video Shortcuts

| Action | Shortcut |
| --- | --- |
| Play / pause | `Space` |
| Seek backward / forward 5 seconds | `Left` / `Right` |
| Previous / next subtitle | `[` / `]` |
| Toggle lookup subtitle visibility | `S` |
| Toggle fullscreen | `F` |
| Close dictionary popup | `Esc` |
| Stop the current video / return | `Cmd+W` |

## Anki Export

Anki Desktop and AnkiConnect must be running.

1. Open **Settings -> Anki**.
2. Connect to AnkiConnect.
3. Select the target deck and note type.
4. Hoshitan loads the note type's exact field names from AnkiConnect.
5. Known Lapis-style fields are filled automatically; adjust placeholders manually when needed.
6. Configure screenshots, subtitle MP3 audio, word audio, tags, audio padding, and FFmpeg.
7. Open a dictionary popup and click **Add to Anki**.

Field names and placeholders stay in English in every UI language. Common placeholders include `{expression}`, `{reading}`, `{sentence}`, `{definition}`, `{image}`, `{audio}`, `{sentence-audio}`, `{source}`, and `{dictionary}`.

## Word Audio

Open **Settings -> Audio**.

- Online sources can be Yomitan `audioSourceList` endpoints or direct audio URL templates.
- Local audio uses Hoshi Reader compatible local audio database exports.
- Local audio is tried before online sources when enabled.
- The popup shows a missing-audio state when no source can provide audio.
- Map an Anki field to `{audio}` for word audio and `{sentence-audio}` for the current subtitle clip.

## Development

Development notes, build commands, tests, packaging, and release details live in [CONTRIBUTING.md](CONTRIBUTING.md).

Useful commands:

```bash
npm test
npm run package
```

## License

Hoshitan is licensed under the GNU General Public License v3.0 only. See [LICENSE](LICENSE) for details.

## Thanks

- [afn478/iinatan](https://github.com/afn478/iinatan), the original IINA subtitle lookup plugin.
- [Yomitan](https://github.com/yomidevs/yomitan), the popup dictionary ecosystem and compatible dictionary format.
- [HoshiDicts](https://github.com/Manhhao/hoshidicts/), the native dictionary backend used by Hoshitan.
- [Hoshi Reader](https://github.com/Manhhao/Hoshi-Reader), the original project behind the Hoshi Reader family of tools and workflows.
- [Hoshi Reader Android](https://github.com/HuangAntimony/Hoshi-Reader-Android), which inspired the dictionary, Anki, and local audio workflows.

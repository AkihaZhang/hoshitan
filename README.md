# Hoshitan

> [!WARNING]
> Hoshitan is currently an early testing build. Development happens on the `dev` branch, there is no stable release yet, and settings or behavior may change without migration support.

Hoshitan brings hover-to-lookup dictionary popups, word audio, and Anki card creation to subtitles in IINA on macOS.

The goal is a compact dictionary popup that feels native to a video player: quick enough for subtitles, structured enough for serious reading, and quiet enough to stay out of the movie's way.

Hoshitan is an independent experimental fork of [afn478/iinatan](https://github.com/afn478/iinatan). It retains the upstream Git history and GPL-3.0 license while developing a separate feature set and release path.

## Screenshots

![Japanese popup over paused subtitles](docs/screenshots/japanese-popup.png)

| English lookup and language menu | Dictionary settings |
| --- | --- |
| ![English lookup with language menu](docs/screenshots/english-popup-language-menu.png) | ![Dictionary settings](docs/screenshots/dictionary-settings.png) |

## Feature Highlights

- Hover subtitle text to show dictionary entries without leaving IINA.
- Pause-only popup behavior keeps lookups from interrupting normal playback.
- Japanese lookup uses HoshiDicts with Yomitan-compatible dictionary data, including deinflection support.
- Jitendex is the recommended Japanese dictionary and can be installed from the plugin settings.
- English, French, German, Chinese, and Korean lookup modes are available for compatible dictionaries.
- Japanese entries can show frequency and pitch-accent metadata when the dictionary provides it.
- Dictionary popups support structured entries, compact tags, collapsed long sections, source links, and custom CSS.
- Dictionary entries include configurable online and local word audio, with optional autoplay and per-source selection.
- Dictionary entries can be exported through AnkiConnect with the sentence, selected expression, reading, definition, source timestamp, screenshot, word audio, and subtitle audio.
- Menus, settings, dictionary status messages, and Anki actions support English and Simplified Chinese, with automatic macOS language detection.
- Settings profiles make it possible to keep separate language, popup, playback, and dictionary setups.

## Installation

### Install From GitHub

1. Open IINA's plugin manager.
2. Choose **Install from GitHub**.
3. Enter `AkihaZhang/hoshitan`.
4. Enable the plugin.
5. Open **Plugins -> Hoshitan -> Settings...** and install the recommended dictionary or import a Yomitan-compatible dictionary ZIP.
6. Toggle Hoshitan with **Shift+H**.

### Install a Release Package

There is no stable package release yet. Development packages may be attached to GitHub Actions runs from the `dev` branch.

## Basic Japanese Setup

1. Open **Plugins -> Hoshitan -> Settings...**.
2. Set the lookup language to **Japanese**.
3. Install the recommended dictionary, Jitendex, from the dictionary panel.
4. Make sure Jitendex is enabled.
5. Open a video with Japanese subtitles.
6. Pause playback, move the pointer over subtitle text, and wait for the popup.
7. If the popup does not appear, press **Shift+H** to toggle Hoshitan on.

## Dictionaries

Open **Plugins -> Hoshitan -> Settings...** to install the recommended Japanese dictionary, import local Yomitan-compatible dictionary ZIP files, enable or disable dictionaries, and reorder lookup priority.

Installed dictionary state is stored in the plugin data folder. The active profile controls dictionary order, lookup language, popup appearance, playback behavior, import settings, and lookup settings.

Language modes behave differently:

- Japanese uses HoshiDicts text processing and deinflection.
- English looks up whole words after lowercasing the hovered text.
- French and German use Yomitan-style candidate and deinflection rules.
- Chinese uses longest rightward-prefix lookup.
- Korean performs exact contiguous-Hangul lookup.

Compatibility metadata is advisory. A dictionary may still import even when Hoshitan cannot confidently identify its language.

## Settings

Use **Plugins -> Hoshitan -> Settings...** to create profiles, switch profiles, choose the lookup language, tune subtitle and popup appearance, manage playback behavior, configure audio, adjust lookup/import timeouts, and manage installed dictionaries.

The interface language can follow macOS automatically or be set explicitly to English or Simplified Chinese. Changes apply immediately to the Settings window and dictionary popup.

The top plugin menu also exposes **Settings...** and direct profile switching.

## Anki Export

Anki Desktop and the AnkiConnect add-on must be running.

1. Open **Plugins -> Hoshitan -> Settings... -> Anki**.
2. Connect to AnkiConnect, then select the target deck and note type.
3. Selecting a note type automatically loads its exact field names. Field names and mapping placeholders remain in English in every interface language.
4. Click **Auto-map fields** or assign `{expression}`, `{reading}`, `{sentence}`, `{definition}`, `{image}`, `{audio}`, `{sentence-audio}`, `{source}`, and `{dictionary}` manually.
5. Configure screenshot, sentence audio, tags, audio padding, and the FFmpeg path.
6. Pause on a subtitle, open a dictionary entry, and click **Add to Anki**.

The export validates the selected deck, note type fields, and AnkiConnect response before reporting success. Media files are copied into Anki through AnkiConnect and temporary files are removed afterward.

## Word Audio

Open **Plugins -> Hoshitan -> Settings... -> Audio**.

- Online sources accept Yomitan `audioSourceList` endpoints and direct audio URL templates. The default uses the Hoshi Reader online source.
- Local audio accepts a Hoshi Reader-compatible `android.db`. Enable **Use local audio database** and select the database file; no separate localhost server is required.
- Local sources are tried before online sources. The source priority follows Hoshi Reader: NHK, Daijisen, Shinmeikai, JapanesePod101, TAAS, OJAD/Ozk, then Forvo variants.
- Map an Anki field to `{audio}` for word audio or `{sentence-audio}` for the current subtitle clip. Subtitle clips are exported as MP3.

## Development / Contributing

Development notes, build commands, test commands, packaging details, and release steps live in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Hoshitan is licensed under the GNU General Public License v3.0 only (`GPL-3.0-only`). See `LICENSE` for the full license text.

## Common Troubleshooting

- If the plugin stalls, try restarting IINA first.

## Thanks

- [afn478/iinatan](https://github.com/afn478/iinatan) for the original IINA subtitle lookup plugin on which Hoshitan is based.
- [Yomitan](https://github.com/yomidevs/yomitan) for the overall inspiration for popup dictionaries, as well as the deinflection logic base for non-Japanese languages.
- [HoshiDicts](https://github.com/Manhhao/hoshidicts/) for the high-performance dictionary backend.
- [Chimahon](https://github.com/sohilsayed/chimahon) and [Hoshi Reader Android](https://github.com/HuangAntimony/Hoshi-Reader-Android) for inspiration on how to use HoshiDicts effectively, particularly for multilingual support.
- [Hoshi Reader Mac](https://github.com/W1ght/Hoshi-Reader-Mac) for the Anki field-mapping and local audio database workflows.

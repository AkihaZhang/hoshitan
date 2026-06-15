const { assert, loadOverlayForTest } = require('./helpers/overlay_test_context');

const { context, overlay } = loadOverlayForTest([
  'state',
  'ankiPayloadForEntry'
]);

overlay.state.text = '彼は待つ。';
overlay.state.lineId = 9;
overlay.state.currentPos = 2;
context.window.getSelection = () => ({ toString: () => 'selected text' });

const payload = overlay.ankiPayloadForEntry({
  matched: '待つ',
  term: {
    expression: '待つ',
    reading: 'まつ',
    rules: ['v5t'],
    glossaries: [
      { dict: '明鏡日汉双解辞典', glossary: '等待' },
      { dict: '新明解国語辞典　第八版', glossary: 'その場所にとどまる' }
    ],
    frequencies: [
      { dict: 'JPDBv2', frequencies: [{ value: 184, displayValue: '184' }] },
      { dict: 'Anime', frequencies: [{ value: 736, displayValue: '736' }] }
    ],
    pitches: [
      { dict: '新明解第八版', positions: [1], transcriptions: [] }
    ]
  }
}, 'anki-payload-test');

assert(payload.expression === '待つ', 'Anki payload should include the expression');
assert(payload.furiganaPlain === '待つ[まつ]', 'Anki payload should include plain furigana');
assert(payload.glossary.includes('[明鏡日汉双解辞典] 等待'), 'Anki payload should include dictionary-labelled glossaries');
assert(payload.glossaryBrief.includes('等待') && !payload.glossaryBrief.includes('[明鏡'), 'Brief glossary should omit dictionary labels');
assert(payload.singleGlossaries['新明解国語辞典　第八版'].includes('その場所にとどまる'), 'Anki payload should group glossaries by dictionary');
assert(payload.selectedGlossary === payload.singleGlossaries['明鏡日汉双解辞典'], 'First dictionary should be the selected glossary fallback');
assert(payload.popupSelectionText === 'selected text', 'Anki payload should preserve popup selection text');
assert(payload.frequencies.includes('JPDBv2: 184'), 'Anki payload should include frequency sources');
assert(payload.frequencyHarmonicRank === '294', 'Anki payload should calculate the harmonic frequency rank');
assert(payload.pitchAccentPositions === '[1]', 'Anki payload should include pitch positions');
assert(payload.pitchAccentCategories === 'kifuku', 'Verb pitch accent should use the kifuku category');

console.log('anki payload tests passed');

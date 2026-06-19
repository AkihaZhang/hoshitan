const { assert, loadOverlayForTest } = require('./helpers/overlay_test_context');

const { context, overlay } = loadOverlayForTest([
  'state',
  'applyConfig',
  'showPopup',
  'renderStoredLookup',
  'requestNestedLookup',
  'showPreviousNestedLookup',
  'showNextNestedLookup',
  'hidePopup'
]);

overlay.applyConfig({
  language: { id: 'ja', label: 'Japanese', lookupUnit: 'character', wordMode: 'rightward-prefix' },
  overlayBridgePort: 19741,
  audioSources: []
});

const anchor = context.document.createElement('span');
overlay.state.currentPos = 0;
overlay.showPopup(anchor, '読', '<div class="loading">Loading...</div>');
overlay.renderStoredLookup({
  ok: true,
  position: 0,
  result: {
    language: 'ja',
    results: [{
      matched: '読む',
      term: {
        expression: '読む',
        reading: 'よむ',
        glossaries: [{ dict: 'Jitendex', glossary: 'to read' }]
      }
    }]
  }
});

const initialActionBar = context.__elements.popup.querySelector('.popup-action-bar');
assert(/data-popup-action="close"/.test(initialActionBar.innerHTML), 'Lookup popup should render close in a dedicated action bar');
assert(/data-popup-action="back"[^>]*disabled/.test(initialActionBar.innerHTML), 'Back should start disabled in the action bar');
assert(/class="anki-add-button"/.test(context.__elements.popup.querySelector('.head').innerHTML), 'The entry header should use a compact Anki add button');
assert(/<details class="dict-section"[^>]*open>/.test(context.__elements.popup.querySelector('.body').innerHTML), 'Dictionary groups should render as collapsible details');
assert(/<summary class="dict-header">/.test(context.__elements.popup.querySelector('.body').innerHTML), 'Dictionary names should toggle their glossary groups');

assert(overlay.requestNestedLookup('読書'), 'Nested lookup should start for selected lookup text');
const request = context.__sent.find(message => message.type === 'nested-lookup');
assert(request && request.text === '読書', 'Nested lookup should send selected text through the overlay bridge');
assert(request.position === 0, 'Nested lookup should default to position 0 for selected text');
assert(/nested-lookup-status/.test(context.__elements.popup.querySelector('.popup-action-bar').innerHTML), 'Nested lookup should show progress in the action bar');
assert(/読書/.test(context.__elements.popup.querySelector('.popup-action-bar').innerHTML), 'Nested lookup progress should include the selected text');
assert(/to read/.test(context.__elements.popup.querySelector('.body').innerHTML), 'Nested lookup should keep the current result visible while loading');

context.__handlers['nested-lookup-result']({
  requestId: request.requestId,
  ok: true,
  result: {
    language: 'ja',
    results: [{
      matched: '読書',
      term: {
        expression: '読書',
        reading: 'どくしょ',
        glossaries: [{ dict: 'Jitendex', glossary: 'reading books' }]
      }
    }]
  }
});

assert(overlay.state.nestedLookupHistory.length === 1, 'Nested lookup should retain the previous popup result for Back');
assert(overlay.state.currentLookupStored.result.results[0].term.expression === '読書', 'Nested lookup should replace the visible result');
assert(!/data-popup-action="back"[^>]*disabled/.test(context.__elements.popup.querySelector('.popup-action-bar').innerHTML), 'Nested lookup should enable Back in the action bar');
assert(!/nested-lookup-status/.test(context.__elements.popup.querySelector('.popup-action-bar').innerHTML), 'Nested lookup progress should clear after the result arrives');
assert(overlay.showPreviousNestedLookup(), 'Back should restore the previous nested lookup');
assert(overlay.state.currentLookupStored.result.results[0].term.expression === '読む', 'Back should restore the previous result');
assert(!/data-popup-action="forward"[^>]*disabled/.test(context.__elements.popup.querySelector('.popup-action-bar').innerHTML), 'Back should enable Forward');
assert(overlay.showNextNestedLookup(), 'Forward should restore the newer nested lookup');
assert(overlay.state.currentLookupStored.result.results[0].term.expression === '読書', 'Forward should restore the newer result');

assert(overlay.requestNestedLookup('大きい', 1), 'Nested lookup should accept a clicked text position');
const positionedRequest = context.__sent.filter(message => message.type === 'nested-lookup').pop();
assert(positionedRequest && positionedRequest.text === '大きい' && positionedRequest.position === 1, 'Nested lookup should send clicked text position through the overlay bridge');
context.__handlers['nested-lookup-result']({
  requestId: positionedRequest.requestId,
  ok: false,
  error: 'cancelled for test'
});

const closeButton = context.document.createElement('button');
closeButton.dataset.popupAction = 'close';
closeButton.parentNode = context.__elements.popup;
context.__elements.popup.listeners.click({
  target: closeButton,
  preventDefault() {},
  stopPropagation() {},
  stopImmediatePropagation() {}
});
assert(context.__elements.popup.classList.contains('hidden'), 'Popup close button should hide the lookup popup');

overlay.showPopup(anchor, '読', '<div class="loading">Loading...</div>');
assert(!context.__elements['popup-backdrop'].classList.contains('hidden'), 'Popup backdrop should show while the lookup popup is visible');
context.__elements['popup-backdrop'].listeners.click({
  target: context.__elements['popup-backdrop'],
  preventDefault() {},
  stopPropagation() {}
});
assert(context.__elements.popup.classList.contains('hidden'), 'Clicking outside the popup should hide it');
assert(context.__elements['popup-backdrop'].classList.contains('hidden'), 'Popup backdrop should hide after outside click');

console.log('overlay popup interaction tests passed');

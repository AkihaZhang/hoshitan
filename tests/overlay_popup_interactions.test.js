const { assert, loadOverlayForTest } = require('./helpers/overlay_test_context');

const { context, overlay } = loadOverlayForTest([
  'state',
  'applyConfig',
  'showPopup',
  'renderStoredLookup',
  'requestNestedLookup',
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

const initialHead = context.__elements.popup.querySelector('.head');
assert(/data-popup-action="close"/.test(initialHead.innerHTML), 'Lookup popup should render an explicit close button');

assert(overlay.requestNestedLookup('読書'), 'Nested lookup should start for selected lookup text');
const request = context.__sent.find(message => message.type === 'nested-lookup');
assert(request && request.text === '読書', 'Nested lookup should send selected text through the overlay bridge');

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
assert(/data-popup-action="back"/.test(context.__elements.popup.querySelector('.head').innerHTML), 'Nested lookup should render a Back button');

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

console.log('overlay popup interaction tests passed');

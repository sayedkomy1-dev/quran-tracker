/* Review 9 Hotfix 2 — canonical HD Mushaf entry for all standalone reader actions.
   Keeps the current student/session page alive while opening a separate HD viewer.
   Does not modify Quran text, offline lesson resources, student data or grades. */
(function (g) {
  'use strict';
  const d = g.document;
  const MAX_PAGE = 604;
  let returnFocus = null;

  function validPage(input) {
    if (input === undefined || input === null || input === '') return null;
    const num = Number(input);
    return Number.isInteger(num) && num >= 1 && num <= MAX_PAGE ? num : null;
  }
  function readerUrl(page) {
    const url = new URL('academy-mushaf.html', g.location.href);
    url.searchParams.set('embedded', '1');
    const requested = validPage(page);
    if (requested !== null) url.searchParams.set('page', String(requested));
    return url.href;
  }
  function ensureDialog() {
    let layer = d.getElementById('imamUnifiedHdMushaf');
    if (layer) return layer;
    layer = d.createElement('section');
    layer.id = 'imamUnifiedHdMushaf';
    layer.className = 'imam-hd-reader-layer';
    layer.hidden = true;
    layer.dir = 'rtl';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', 'مصحف المدينة عالي الدقة');
    const top = d.createElement('header');
    top.className = 'imam-hd-reader-top';
    const heading = d.createElement('strong');
    heading.textContent = 'مصحف المدينة عالي الدقة';
    const close = d.createElement('button');
    close.type = 'button';
    close.className = 'imam-hd-reader-close';
    close.textContent = '✕ إغلاق المصحف والعودة';
    close.setAttribute('aria-label', 'إغلاق المصحف والعودة للحصة');
    close.addEventListener('click', closeReader);
    top.append(heading, close);
    const frame = d.createElement('iframe');
    frame.className = 'imam-hd-reader-frame';
    frame.title = 'مصحف المدينة عالي الدقة';
    frame.setAttribute('loading', 'eager');
    layer.append(top, frame);
    d.body.append(layer);
    return layer;
  }
  function openReader(page) {
    const layer = ensureDialog();
    returnFocus = d.activeElement;
    layer.querySelector('iframe').src = readerUrl(page);
    layer.hidden = false;
    d.body.classList.add('imam-hd-reader-open');
    layer.querySelector('button').focus({preventScroll: true});
    return Promise.resolve(true);
  }
  function closeReader() {
    const layer = d.getElementById('imamUnifiedHdMushaf');
    if (!layer) return;
    layer.hidden = true;
    layer.querySelector('iframe').removeAttribute('src');
    d.body.classList.remove('imam-hd-reader-open');
    if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus({preventScroll: true});
    returnFocus = null;
  }
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !d.getElementById('imamUnifiedHdMushaf')?.hidden) closeReader();
  });

  // The legacy v9 route was already redirected. These direct calls bypassed it.
  g.openTeacherMushaf = openReader;
  g.openMushafReader = openReader;
  g.openMushafLitePage = openReader;
  if (g.ImamApp?.MushafOffline) g.ImamApp.MushafOffline.openTeacherReader = openReader;
  g.ImamUnifiedHdMushaf = {open: openReader, close: closeReader, version: 'review9-hotfix2'};
})(window);

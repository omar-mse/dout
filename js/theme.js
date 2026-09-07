/* dout — theme (palette + dark mode)
   Loaded synchronously in <head> so the stored choice applies before first paint. */
(function () {
  var PALETTES = [
    { id: 'blue',    name: 'Blue',    mid: '#3557ff', deep: '#1f35d6' },
    { id: 'crimson', name: 'Crimson', mid: '#d11a34', deep: '#8f0d24' },
    { id: 'forest',  name: 'Forest',  mid: '#197a42', deep: '#0d4d2a' },
    { id: 'violet',  name: 'Violet',  mid: '#7a3cff', deep: '#4a1cc2' },
    { id: 'pink',    name: 'Pink',    mid: '#cc1a73', deep: '#8a104c' }
  ];
  var KEY_PALETTE = 'metoo.palette';
  var KEY_DARK = 'metoo.dark';

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage blocked: choice lives for this page only */ }
  }
  function validPalette(id) {
    return PALETTES.some(function (p) { return p.id === id; }) ? id : 'blue';
  }

  /* No stored choice means we have not been told anything, not that light was asked for.
     Fall back to what the operating system already says; an explicit flip still wins and
     still persists, because setDark writes the key. */
  function prefersDark() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
    catch (e) { return false; }
  }

  var root = document.documentElement;
  root.dataset.palette = validPalette(read(KEY_PALETTE));
  var stored = read(KEY_DARK);
  root.dataset.theme = (stored === null ? prefersDark() : stored === '1') ? 'dark' : 'light';

  /* A theme or palette flip repaints every token at once, but only some of them are animated.
     The tiles and the landing preview cross-fade their fill over 350-400ms while the ground, the
     borders and every piece of text arrive in the same frame, so the board spends most of a
     second crawling between two colour schemes underneath chrome that is already there. Worse,
     the two themes run their heat ramp in opposite luminance directions — light goes 0.77 down
     to 0.08, dark goes 0.03 up to 0.24 — so during that crawl the biggest tile is fading one way
     while the small ones fade the other, and the board's whole weight map visibly turns inside
     out. That is what reads as everything jumping.

     Those transitions exist for one tile changing heat under a Me too, which is the thing worth
     watching. A whole-page recolour is not. Suppress them for the swap and hand them straight
     back: set the guard, change the token, force a style flush so the new values commit while
     transitions are still off, then drop the guard. Nothing has changed since the flush, so
     nothing starts. Synchronous on purpose — a rAF or a timer here would never fire in a
     background tab and would leave the guard stuck on. */
  function instantly(change) {
    root.setAttribute('data-theming', '');
    change();
    void root.offsetWidth;
    root.removeAttribute('data-theming');
  }

  window.MeTooTheme = {
    PALETTES: PALETTES,
    get: function () {
      return { palette: root.dataset.palette, dark: root.dataset.theme === 'dark' };
    },
    setPalette: function (id) {
      id = validPalette(id);
      instantly(function () { root.dataset.palette = id; });
      write(KEY_PALETTE, id);
      document.dispatchEvent(new CustomEvent('metoo:theme', { detail: this.get() }));
    },
    setDark: function (on) {
      instantly(function () { root.dataset.theme = on ? 'dark' : 'light'; });
      write(KEY_DARK, on ? '1' : '0');
      document.dispatchEvent(new CustomEvent('metoo:theme', { detail: this.get() }));
    }
  };
})();

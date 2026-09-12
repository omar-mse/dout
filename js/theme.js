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

  /* The device decides the first visit. A visitor whose system is set to dark has already said
     which way they read, and the board arrives that way rather than flashing paper-white at
     them; a visitor on a light system still sees the design as drawn. An explicit flip of the
     dark switch outranks the system for good, because setDark writes the key and a written key
     is the only thing consulted from then on. */
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function systemPrefersDark() {
    return !!(darkQuery && darkQuery.matches);
  }
  function preferredDark() {
    var stored = read(KEY_DARK);
    if (stored === '1') return true;
    if (stored === '0') return false;
    return systemPrefersDark();
  }

  var root = document.documentElement;
  root.dataset.palette = validPalette(read(KEY_PALETTE));
  root.dataset.theme = preferredDark() ? 'dark' : 'light';

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

  function applyDark(on) {
    instantly(function () { root.dataset.theme = on ? 'dark' : 'light'; });
    document.dispatchEvent(new CustomEvent('metoo:theme', { detail: window.MeTooTheme.get() }));
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
      applyDark(on);
      write(KEY_DARK, on ? '1' : '0');
    }
  };

  /* Someone who has never touched the switch is still following their system, so follow it when
     it changes — a laptop crossing sunset should not leave the board in the wrong scheme until
     the next reload. Once the key is written this listener stops mattering: preferredDark reads
     the stored answer and returns it whatever the system now says. The popover's switch hears
     the same metoo:theme event it hears from a click, so it stays honest either way. */
  if (darkQuery) {
    var onSystemChange = function () {
      if (read(KEY_DARK) === null) applyDark(systemPrefersDark());
    };
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onSystemChange);
    else if (darkQuery.addListener) darkQuery.addListener(onSystemChange);
  }
})();

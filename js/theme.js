/* Me Too — theme (palette + dark mode)
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

  window.MeTooTheme = {
    PALETTES: PALETTES,
    get: function () {
      return { palette: root.dataset.palette, dark: root.dataset.theme === 'dark' };
    },
    setPalette: function (id) {
      id = validPalette(id);
      root.dataset.palette = id;
      write(KEY_PALETTE, id);
      document.dispatchEvent(new CustomEvent('metoo:theme', { detail: this.get() }));
    },
    setDark: function (on) {
      root.dataset.theme = on ? 'dark' : 'light';
      write(KEY_DARK, on ? '1' : '0');
      document.dispatchEvent(new CustomEvent('metoo:theme', { detail: this.get() }));
    }
  };
})();

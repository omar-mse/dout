/* dout — shared chrome: nav, theme popover, icons, toast. */
(function () {
  var ICONS = {
    hand: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="0"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    palette: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><rect x="9" y="9" width="12" height="12"/><path d="M5 15V3h12"/></svg>'
  };

  var LINKS = [
    { href: 'feed.html', label: 'Feed', page: 'feed' },
    { href: 'problem.html', label: 'Problem & Solution', page: 'problem' },
    { href: 'professor.html', label: 'For professors', page: 'professor' }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderNav(page) {
    var theme = window.MeTooTheme;
    var current = theme.get();
    var links = LINKS.map(function (l) {
      var cur = l.page === page ? ' aria-current="page"' : '';
      return '<li><a class="nav__link" href="' + l.href + '"' + cur + '>' + esc(l.label) + '</a></li>';
    }).join('');
    var swatches = theme.PALETTES.map(function (p) {
      var pressed = p.id === current.palette ? 'true' : 'false';
      return '<li><button type="button" class="swatch" data-palette="' + p.id + '" aria-pressed="' + pressed + '" aria-label="' + esc(p.name) + ' palette" style="--sw-mid:' + p.mid + ';--sw-deep:' + p.deep + '"></button><span class="swatch-name" aria-hidden="true">' + esc(p.name) + '</span></li>';
    }).join('');

    return '' +
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<div class="nav__inner">' +
        /* The b the brand dropped is still in the wordmark, just faint: at a glance the nav
           reads "dout", up close (or on hover) it says "doubt". Hidden from assistive tech as
           a whole, because the name is dout however the letters are painted — the link's
           aria-label carries it instead. */
        '<a class="nav__brand" href="index.html" aria-label="dout home">' +
          '<span class="nav__word" aria-hidden="true">dou<span class="nav__mark">b</span>t</span>' +
        '</a>' +
        '<nav class="nav__nav" aria-label="Main"><ul class="nav__links" id="nav-links">' + links + '</ul></nav>' +
        '<div class="nav__actions">' +
          '<div class="theme">' +
            '<button type="button" class="btn btn--ghost btn--icon" id="theme-btn" aria-expanded="false" aria-controls="theme-panel" aria-label="Theme: palette and dark mode">' + ICONS.palette + '</button>' +
            '<div class="theme__panel" id="theme-panel" hidden>' +
              '<div class="theme__title">Heat palette</div>' +
              '<ul class="swatches">' + swatches + '</ul>' +
              '<div class="theme__row">' +
                '<span class="kicker" id="dark-label">Dark mode</span>' +
                '<button type="button" class="switch" id="dark-switch" role="switch" aria-checked="' + (current.dark ? 'true' : 'false') + '" aria-labelledby="dark-label"></button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          /* One accessible name on the anchor, both labels hidden from it: the visible text
             swaps to a short form on narrow screens without the name changing, and without
             the sr-only copy that used to make desktop announce this twice. */
          '<a class="btn btn--primary" href="feed.html#ask" aria-label="Ask anonymously">' + ICONS.hand +
            '<span class="nav__cta-text" aria-hidden="true">Ask anonymously</span>' +
            '<span class="nav__cta-short" aria-hidden="true">Ask</span></a>' +
          '<button type="button" class="btn btn--ghost btn--icon nav__menu-btn" id="menu-btn" aria-expanded="false" aria-controls="nav-links" aria-label="Menu">' +
            '<span data-menu-icon="open">' + ICONS.menu + '</span>' +
            '<span data-menu-icon="close" hidden>' + ICONS.close + '</span>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function wireNav(nav) {
    var theme = window.MeTooTheme;
    var btn = nav.querySelector('#theme-btn');
    var panel = nav.querySelector('#theme-panel');
    var darkSwitch = nav.querySelector('#dark-switch');
    var menuBtn = nav.querySelector('#menu-btn');
    var links = nav.querySelector('#nav-links');

    function openPanel(open) {
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { openPanel(panel.hidden); });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) openPanel(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { openPanel(false); btn.focus(); }
    });

    panel.querySelectorAll('.swatch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        theme.setPalette(sw.dataset.palette);
        panel.querySelectorAll('.swatch').forEach(function (s) { s.setAttribute('aria-pressed', s === sw ? 'true' : 'false'); });
        window.MeTooUI.toast(sw.getAttribute('aria-label').replace(' palette', '') + ' palette');
      });
    });

    darkSwitch.addEventListener('click', function () {
      var on = darkSwitch.getAttribute('aria-checked') !== 'true';
      theme.setDark(on);
    });

    /* Keep the popover honest whenever the theme changes, from here or from anywhere else. */
    document.addEventListener('metoo:theme', function (e) {
      panel.querySelectorAll('.swatch').forEach(function (s) {
        s.setAttribute('aria-pressed', s.dataset.palette === e.detail.palette ? 'true' : 'false');
      });
      darkSwitch.setAttribute('aria-checked', e.detail.dark ? 'true' : 'false');
    });

    /* The mobile menu covers the page, so every ordinary way out of it has to work:
       Escape, a tap anywhere else, following a link, and growing the window past the
       breakpoint that removes the button in the first place. */
    if (menuBtn) {
      /* Both icons stay in the DOM and are toggled, never re-written. Replacing the button's
         innerHTML detached the clicked node, so the outside-click check below stopped
         recognising it as its own button and shut the menu on the click that opened it. */
      var iconOpen = menuBtn.querySelector('[data-menu-icon="open"]');
      var iconClose = menuBtn.querySelector('[data-menu-icon="close"]');
      var openMenu = function (open) {
        links.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        iconOpen.hidden = open;
        iconClose.hidden = !open;
      };
      menuBtn.addEventListener('click', function () {
        openMenu(!links.classList.contains('is-open'));
      });
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) openMenu(false);
      });
      document.addEventListener('click', function (e) {
        if (!links.classList.contains('is-open')) return;
        if (links.contains(e.target) || menuBtn.contains(e.target)) return;
        openMenu(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !links.classList.contains('is-open')) return;
        openMenu(false);
        menuBtn.focus();
      });
      /* Not every engine ships matchMedia; the menu must still open and close without it. */
      var wide = window.matchMedia ? window.matchMedia('(min-width: 761px)') : null;
      var onWide = function (e) { if (e.matches) openMenu(false); };
      if (wide && wide.addEventListener) wide.addEventListener('change', onWide);
      else if (wide && wide.addListener) wide.addListener(onWide);
    }
  }

  var toastEl = null;
  var toastText = null;
  var toastTimer = null;

  function hideToast() {
    if (toastEl) toastEl.classList.remove('is-visible', 'has-action');
  }

  /* toast(msg) is the plain notice. toast(msg, {label, onClick}) turns it into the undo
     affordance for a destructive act: it stays up for eight seconds instead of two, accepts
     clicks, and is reachable by Tab. The message still lives in its own node so the status
     region announces the sentence rather than the sentence plus a button label. */
  function toast(msg, action) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastText = document.createElement('span');
      toastText.className = 'toast__text';
      toastText.setAttribute('role', 'status');
      toastText.setAttribute('aria-live', 'polite');
      toastEl.appendChild(toastText);
      document.body.appendChild(toastEl);
    }
    var old = toastEl.querySelector('.toast__action');
    if (old) old.remove();
    toastText.textContent = msg;
    toastEl.classList.toggle('has-action', !!action);

    if (action) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast__action';
      btn.textContent = action.label;
      btn.addEventListener('click', function () {
        clearTimeout(toastTimer);
        hideToast();
        action.onClick();
      });
      toastEl.appendChild(btn);
    }

    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 8000 : 1800);
  }

  /* ---------- reveal ----------
     The one scroll-triggered move on the site: the seat map filling in, the ranked bars
     growing, the landing board developing. All three say the same thing the product says, so
     they are one idea rather than a reveal bolted onto every section.

     The hidden state lives in a class this function adds, never in the stylesheet's resting
     state. Nothing is armed unless motion is wanted AND this code is alive to release it, so
     markup with no JS, a prerender, a headless screenshot, or reduced motion all render the
     finished figure instead of an empty box. Both classes come off once the wave has played:
     a finished animation declared over an element is a trap the feed already learned about
     (see the note on is-settled in js/feed.js). */
  function wantsMotion() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* no matchMedia: fall through and let the stylesheet decide */ }
    return !!window.IntersectionObserver && !document.hidden;
  }

  function reveal(el) {
    if (!el || !wantsMotion() || el.dataset.revealed) return;
    el.dataset.revealed = '1';
    el.classList.add('reveal-armed');

    var settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      el.classList.remove('reveal-armed', 'is-revealed');
    }

    /* The observer is an optimisation, never the thing content depends on. Measured: arm an
       element the observer then never reports on (a tab that is not rendering, a container
       that never intersects) and the seats stay at opacity 0 for the life of the page, so the
       revealed panel reads as the silent one and the figure argues the opposite of its own
       caption. Whatever happens, the figure is finished within a few seconds. */
    var failsafe = setTimeout(function () { io.disconnect(); settle(); }, 8000);

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i += 1) {
        if (!entries[i].isIntersecting) continue;
        clearTimeout(failsafe);
        io.disconnect();
        /* Backgrounded between arming and arriving: animations will not advance, so hand the
           element its finished state rather than leaving it holding an empty one. */
        if (document.hidden) { settle(); return; }
        el.classList.remove('reveal-armed');
        el.classList.add('is-revealed');
        /* Longer than the slowest wave (17 seats x 26ms + 300ms), so nothing is cut short. */
        setTimeout(settle, 1400);
        return;
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    io.observe(el);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { io.disconnect(); settle(); }
    });
  }

  function renderFooter() {
    return '<div class="footer"><div>dout</div>' +
      '<nav aria-label="Footer"><ul>' +
      LINKS.map(function (l) { return '<li><a href="' + l.href + '">' + esc(l.label) + '</a></li>'; }).join('') +
      '</ul></nav></div>';
  }

  /* wantsMotion is shared so the hero and the story gate on exactly the same conditions. */
  window.MeTooUI = { icons: ICONS, esc: esc, toast: toast, reveal: reveal, wantsMotion: wantsMotion };

  document.addEventListener('DOMContentLoaded', function () {
    var foot = document.querySelector('[data-footer]');
    if (foot) foot.innerHTML = renderFooter();

    document.querySelectorAll('[data-reveal]').forEach(reveal);

    var nav = document.querySelector('.nav');
    if (!nav) return;
    nav.innerHTML = renderNav(document.body.dataset.page || '');
    /* The links, the brand and the Ask button are plain markup and work regardless. Only the
       popover and the menu need wiring, so a failure there must not take the page with it. */
    try { wireNav(nav); }
    catch (e) { if (window.console && console.error) console.error('dout: nav controls unavailable', e); }
  });
})();

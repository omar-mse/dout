/* dout — first-visit tour
   Six short steps over the landing page, shown once per browser and skippable from the first
   frame. Landing only: it is the front door, and a tour that ambushes you again on every page is
   not a tour, it is an obstacle.

   The page behind is fully rendered and never gated on this — kill the script, block storage, or
   skip in one keystroke and the site is exactly the site. The overlay is an addition to a working
   page, not a gate in front of an empty one. */
(function () {
  var KEY = 'dout.tour.v1';

  /* Copy first, markup second: the steps are the content of this feature, so they read as a list
     of plain sentences rather than as strings buried in a template. */
  var STEPS = [
    {
      kicker: 'The point',
      title: 'Half the room has the same question.',
      body: 'Most people who are lost assume they are the only one, so nobody asks. The count on ' +
            'every doubt is the evidence that they were wrong.',
      figure: '<div class="tourfig tourfig--tiles">' +
        '<span class="tourfig__tile tourfig__tile--h5">31</span>' +
        '<span class="tourfig__tile tourfig__tile--h4">27</span>' +
        '<span class="tourfig__tile tourfig__tile--h2">14</span>' +
        '</div>'
    },
    {
      kicker: 'Asking',
      title: 'Type the thing you did not get.',
      body: 'No account, no name, not even a nickname. Nothing about you is stored, so asking ' +
            'costs you nothing in front of the room.',
      figure: '<div class="tourfig tourfig--composer">' +
        '<span class="tourfig__field">Why is push O(1) amortized_</span>' +
        '<span class="tourfig__ask">Ask</span>' +
        '</div>'
    },
    {
      kicker: 'Me too',
      title: 'One tap says you were stuck there too.',
      body: 'If your question is already up there, tap Me too instead of asking it again. The tile ' +
            'darkens and the number climbs.',
      figure: '<div class="tourfig tourfig--metoo">' +
        '<span class="tourfig__pill">Me too</span>' +
        '<span class="tourfig__climb">27 <span aria-hidden="true">&rarr;</span> 28</span>' +
        '</div>'
    },
    {
      kicker: 'Boards',
      title: 'Every subject has its own board.',
      body: 'Open yours to read what the room is stuck on. Sort by most me too, by newest, or by ' +
            'the ones the professor has already answered.',
      figure: '<div class="tourfig tourfig--subjects">' +
        '<span class="tourfig__chip">CSCI 201</span>' +
        '<span class="tourfig__chip">MATH 102</span>' +
        '<span class="tourfig__chip">BIOL 130</span>' +
        '</div>'
    },
    {
      kicker: 'For professors',
      title: 'The lecture gets a ranked list.',
      body: 'Doubts sorted by how many people they lost, so the next class opens on the three ' +
            'things that broke this one. Students stay anonymous throughout.',
      figure: '<div class="tourfig tourfig--rank">' +
        '<span class="tourfig__row"><b>31</b><i style="width:100%"></i></span>' +
        '<span class="tourfig__row"><b>27</b><i style="width:87%"></i></span>' +
        '<span class="tourfig__row"><b>23</b><i style="width:74%"></i></span>' +
        '</div>'
    },
    {
      kicker: 'Make it yours',
      title: 'Five palettes and a dark mode.',
      body: 'Both live in the nav. The hue changes with your palette; what the heat means never ' +
            'does, and the number is always there beside it.',
      figure: '<div class="tourfig tourfig--theme">' +
        '<span class="tourfig__sw" style="--sw:#3557ff"></span>' +
        '<span class="tourfig__sw" style="--sw:#d11a34"></span>' +
        '<span class="tourfig__sw" style="--sw:#197a42"></span>' +
        '<span class="tourfig__sw" style="--sw:#7a3cff"></span>' +
        '<span class="tourfig__sw" style="--sw:#cc1a73"></span>' +
        '</div>'
    },
    {
      kicker: 'Stickers',
      title: 'Put something on the wall.',
      body: 'Open the sheet in the nav and drag one anywhere on the page. Click a sticker to turn ' +
            'it, drag it back to the sheet to remove it. They sit behind everything, so they never ' +
            'cover a doubt — and like the rest of this, they are saved in this browser only.',
      figure: stickerFigure
    }
  ];

  /* Built from the live sheet rather than a second hardcoded list, so swapping the art in
     img/stickers/ changes the tour too. Three spread across the sheet, not the first three, to
     show some of its range. If the sticker module is absent the step still reads fine without a
     picture, which is the point of returning an empty string rather than throwing. */
  function stickerFigure() {
    var s = window.MeTooStickers;
    if (!s || !s.SHEET || !s.SHEET.length) return '';
    var n = s.SHEET.length;
    var picks = [0, Math.floor(n / 2), n - 1];
    var tilts = ['-6deg', '4deg', '-3deg'];
    return '<div class="tourfig tourfig--stickers">' + picks.map(function (i, k) {
      return '<span class="tourfig__peel" style="--t:' + tilts[k] + '">' +
        '<img src="' + s.DIR + esc(s.SHEET[i]) + '" alt="" draggable="false">' +
        '</span>';
    }).join('') + '</div>';
  }

  var root = null;
  var step = 0;
  var dir = 1;              /* +1 travelling forward, -1 going back; the step animates from that side */
  var lastFocus = null;

  function esc(s) {
    return window.MeTooUI ? window.MeTooUI.esc(s) : String(s);
  }

  /* Motion is opt-in and asked for fresh every time. Two ways it must not run: the visitor asked
     for stillness, or the page is not being painted — a background tab and a headless renderer
     both freeze animations mid-flight, and a keyframe that begins at opacity 0 would then hold
     this card invisible over a page it has already covered. The unanimated state is the finished
     state, so refusing here costs nothing but the movement. */
  function canAnimate() {
    try {
      if (document.visibilityState === 'hidden') return false;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { return false; }
    return true;
  }

  function seen() {
    try { return !!localStorage.getItem(KEY); }
    catch (e) { return true; }   /* storage blocked: show nothing rather than on every load */
  }

  function markSeen() {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }

  function render() {
    var s = STEPS[step];
    var dots = STEPS.map(function (_, i) {
      return '<span class="tour__dot' + (i === step ? ' is-on' : '') + '"></span>';
    }).join('');

    root.querySelector('.tour__card').innerHTML =
      '<div class="tour__step' + (canAnimate() ? ' is-entering' : '') + '" style="--dir:' + dir + '">' +
      '<div class="tour__top">' +
        '<span class="kicker">' + esc(s.kicker) + '</span>' +
        '<button type="button" class="tour__skip" data-skip>Skip</button>' +
      '</div>' +
      '<h2 class="tour__title" id="tour-title" tabindex="-1">' + esc(s.title) + '</h2>' +
      /* A figure may be a function when it depends on something outside this file. */
      (typeof s.figure === 'function' ? s.figure() : s.figure) +
      '<p class="tour__body">' + esc(s.body) + '</p>' +
      '<div class="tour__foot">' +
        '<span class="tour__dots" aria-hidden="true">' + dots + '</span>' +
        '<span class="tour__count">' + (step + 1) + ' / ' + STEPS.length + '</span>' +
        '<button type="button" class="btn btn--sm" data-back' + (step === 0 ? ' disabled' : '') + '>Back</button>' +
        '<button type="button" class="btn btn--sm btn--primary" data-next>' +
          (step === STEPS.length - 1 ? 'Start' : 'Next') +
        '</button>' +
      '</div>' +
      '</div>';

    /* Focus the heading on every step: the dialog's content changes under the reader's feet
       otherwise, and there is nothing to announce the change. */
    root.querySelector('#tour-title').focus();
  }

  function close() {
    markSeen();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    document.documentElement.removeAttribute('data-tour');
    /* Hand focus to the thing the tour was about, not back to the top of the document. */
    var cta = document.querySelector('.hero__cta .btn--primary');
    if (cta) cta.focus();
    else if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function go(n) {
    var next = Math.min(Math.max(n, 0), STEPS.length - 1);
    dir = next < step ? -1 : 1;
    step = next;
    render();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); step === STEPS.length - 1 ? close() : go(step + 1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(step - 1); return; }
    if (e.key !== 'Tab') return;

    /* Keep Tab inside the dialog. Without this the tab order walks off into the page behind,
       which is still there and still full of links. */
    var focusable = root.querySelectorAll('button:not([disabled]), [href], [tabindex="-1"]');
    var list = [];
    for (var i = 0; i < focusable.length; i++) {
      if (focusable[i].getAttribute('tabindex') !== '-1') list.push(focusable[i]);
    }
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open() {
    lastFocus = document.activeElement;
    root = document.createElement('div');
    root.className = 'tour';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'tour-title');
    root.innerHTML = '<div class="tour__card"></div>';
    document.body.appendChild(root);
    document.documentElement.setAttribute('data-tour', 'open');
    if (canAnimate()) {
      root.classList.add('is-entering');
      setTimeout(function () { if (root) root.classList.remove('is-entering'); }, 600);
    }

    /* One first-run prompt at a time: the sticker nudge is covered by the last step anyway, and
       it can introduce itself on a later visit. Its "seen" flag is deliberately left alone. */
    var nudge = document.querySelector('.sticker-nudge');
    if (nudge && nudge.parentNode) nudge.parentNode.removeChild(nudge);

    render();

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-skip]')) return close();
      if (e.target.closest('[data-back]')) return go(step - 1);
      if (e.target.closest('[data-next]')) {
        return step === STEPS.length - 1 ? close() : go(step + 1);
      }
    });
    root.addEventListener('keydown', onKey);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (seen()) return;
    /* A tour is the least important thing on the page: if it throws, the page carries on. */
    try { open(); }
    catch (e) { if (window.console && console.error) console.error('dout: tour unavailable', e); }
  });
})();

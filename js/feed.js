/* dout — feed: subject picker, then one subject's board (composer, filters, heat tiles, Me too). */
(function () {
  var store = window.MeTooStore;
  var ui = window.MeTooUI;
  var filter = 'top';
  var grid, counter, textarea, legend, legendBox, hint, askBtn, noticeEl;
  var HINT_KEY = 'metoo.hint.v1';
  var firstRender = true;
  var submitting = false;

  /* A lecture can run to hundreds of doubts. Painting all of them at once is a long frame
     for a board nobody scrolls to the end of, so the tail waits behind one explicit button. */
  var PAGE = 120;
  var shownLimit = PAGE;
  var showing = 0, total = 0;

  function sorted() {
    var doubts = store.getDoubts();
    if (filter === 'answered') doubts = doubts.filter(function (d) { return d.answered; });
    if (filter === 'new') doubts.sort(function (a, b) { return b.createdAt - a.createdAt; });
    else doubts.sort(function (a, b) { return b.count - a.count || b.createdAt - a.createdAt; });
    /* A doubt you just posted rides at the top of the board. It starts at zero, so under "Most
       me too" it would land off-screen at the bottom, which is exactly the moment you most need
       to see it. The "Yours" tag says why it is there, so the ranking still reads true.

       Scoped to doubts with no me toos, which is the whole reason the pin exists. Pinning your
       own doubts once the room has answered them used to hold a 31-me-too doubt out of the
       ranking it was winning, and put a tile at the top whose size disagreed with its position. */
    if (filter !== 'answered') {
      doubts.sort(function (a, b) {
        return (pinned(b) ? 1 : 0) - (pinned(a) ? 1 : 0);
      });
    }
    return doubts;
  }

  /* Size is the ranking channel, so it only carries meaning on a board that is ranked. "Most me
     too" and "Answered" both sort by count, so their spans arrive in descending order and tile
     the grid exactly: measured 0 empty cells. "Newest" sorts by time while size still came from
     the count, so the spans arrived scrambled — s,m,s,s,w,s,l,m,m,s,s,s,s — and auto-placement
     skipped every cell a wide or tall tile could not fit, leaving four holes mid-board.

     Dense packing is not the way out: it reorders, and on this board reading order is the
     ranking (see the note on .grid). Uniform tiles are. Nothing is lost by it, because colour
     still carries the heat and colour is the only channel the legend ever claims. */
  /* Posted, and the room has not answered yet: outside the ranking rather than at the bottom
     of it. Both the pin above and the full-width span below key off this one predicate, so the
     board's order and its geometry can never disagree about which doubts are ranked. */
  function pinned(d) {
    return !!(d.mine && !d.answered && !d.count);
  }

  function sizeFor(d, max) {
    if (filter === 'new') return 'tile--s';
    /* A doubt with no count has no rank, so it must not take a rank-shaped span. Measured: one
       posted doubt rendered as a 1x1 in front of the leader's 2x2 left three empty cells, two
       of them mid-board, which is the same scrambled-span failure described above arriving by
       a different route. Spanning the full row ends the pinned block on a row boundary and
       hands the ranked tail an untouched grid. */
    if (pinned(d)) return 'tile--pin';
    return 'tile--' + store.sizeClass(d.count, max);
  }

  function tileHtml(d, max, i) {
    var step = store.heatStep(d.count, max);
    var pressed = store.hasMeToo(d.id);
    var textId = 'doubt-' + d.id;
    var top;
    var waiting = d.mine && !d.answered && !d.count;
    var cls = d.answered ? 'tile--answered' : (waiting ? 'tile--waiting' : (step ? 'tile--h' + step : ''));
    if (d.answered) {
      top = '<div class="tile__top"><span class="tag">Answered</span><span class="tile__meta">' + store.formatCount(d.count) + ' me too</span></div>';
    } else if (waiting) {
      /* A big "0" is the wrong reward for the bravest action on the page. Say what is happening instead. */
      top = '<div class="tile__top"><span class="tag tag--outline">Yours</span></div>';
    } else {
      top = '<div class="tile__top"><div class="tile__count"><strong data-count>' + store.formatCount(d.count) + '</strong><span>me too</span></div>' + (d.mine ? '<span class="tag tag--outline">Yours</span>' : '') + '</div>';
    }
    var bottom;
    if (d.answered) {
      /* Marking a doubt answered and writing a reply are two different acts. Rendering the
         reply box for both shipped an empty white card signed by the professor, which is a
         worse ending than no card at all. Say which of the two actually happened. */
      bottom = d.reply
        ? '<div class="reply" dir="auto"><strong>' + ui.esc(store.getMeta().professor) + ':</strong> ' + ui.esc(d.reply) + '</div>'
        : '<p class="answered-note">' + ui.icons.check + '<span>Covered in class. No written reply.</span></p>';
    } else if (d.mine) {
      /* No disabled Me too on your own doubt: a greyed-out button is a dead end dressed as an action. */
      bottom = (waiting ? '<p class="waiting"><span class="waiting__dot" aria-hidden="true"></span>Posted. Waiting for the room.</p>' : '') +
        '<div class="tile__bottom"><span class="tile__meta">Anon · ' + store.timeAgo(d.createdAt) + '</span></div>';
    } else {
      /* Thirteen buttons all reading "Me too" is a maze in a screen reader. The doubt itself
         is the only thing that tells them apart, so it rides along in the accessible name. */
      var btn = '<button type="button" class="metoo" data-metoo="' + d.id + '" aria-pressed="' + (pressed ? 'true' : 'false') + '">' +
        (pressed ? ui.icons.check : ui.icons.hand) +
        '<span aria-hidden="true">Me too</span>' +
        '<span class="sr-only">Me too: ' + ui.esc(d.text) + '</span></button>';
      bottom = '<div class="tile__bottom"><span class="tile__meta">Anon · ' + store.timeAgo(d.createdAt) + '</span>' + btn + '</div>';
    }
    var size = sizeFor(d, max);
    return '<article class="tile ' + size + ' ' + cls + '" data-id="' + d.id + '" data-size="' + size + '" style="--i:' + i + '" aria-labelledby="' + textId + '">' +
      top + '<p class="tile__text" id="' + textId + '" dir="auto">' + ui.esc(d.text) + '</p>' + bottom + '</article>';
  }

  /* Empty states are the only onboarding a student ever reads, so each one says what belongs
     here, why it is worth anything, and what to do next. */
  function emptyHtml() {
    if (filter === 'answered') {
      return '<div class="empty">' +
        '<div class="empty__copy">' +
          '<h2 class="empty__title">Nothing answered yet</h2>' +
          '<p class="empty__body">When your professor replies, the doubt turns yellow and their answer sits right on the tile. Until then the ranked list on their dashboard is doing the work.</p>' +
          '<button type="button" class="btn" data-empty-all>Show all doubts</button>' +
        '</div></div>';
    }
    return '<div class="empty empty--first">' +
      '<div class="empty__ghost" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
      '<div class="empty__copy">' +
        '<h2 class="empty__title">The board is empty</h2>' +
        '<p class="empty__body">Every question posted here becomes a tile. The more classmates tap <strong>Me too</strong>, the stronger its colour gets, so your professor can see exactly where the lecture lost the room.</p>' +
        '<button type="button" class="btn btn--primary" data-empty-ask>Ask the first question</button>' +
      '</div></div>';
  }

  /* The board's one encoding lives in the markup; only the room's live reading changes here.
     Filtering and "show more" both rearrange the board without moving focus, so this line is
     a status region: it is the one thing that tells a screen reader what just happened. */
  function renderLegend() {
    if (!legend) return;
    var s = store.stats();
    /* A five-step ramp and "0 open" above an empty state that explains the same encoding in
       words is a key to a map with nothing on it. It comes back with the first tile. */
    if (legendBox) legendBox.hidden = total === 0;
    var reading = store.formatCount(s.open) + ' open · ' + store.formatCount(s.meToos) + ' me too' + (s.meToos === 1 ? '' : 's') + ' in this subject';
    if (showing < total) reading = 'Showing ' + showing + ' of ' + total + ' · ' + reading;
    legend.textContent = reading;
  }

  function render() {
    var doubts = sorted();
    var max = store.maxCount(store.getDoubts());
    /* Only the very first paint runs the entrance stagger. A re-render after a tap or a filter
       change must not blank the board and replay it.

       The second condition is the one that matters. The entrance is an enhancement and must
       never be the thing that makes content visible: `rise` starts at opacity 0 and is declared
       with fill `both`, so its backwards fill paints every tile transparent until the animation
       actually runs — and a hidden tab never runs it, because Chrome does not advance animation
       timelines in the background. Measured on a backgrounded tab: thirteen tiles, playState
       "running", currentTime 0, computed opacity 0. The whole board was blank. Restoring a
       session, opening a subject in a background tab, and any prerender or screenshot pass all
       land in exactly that state. If nobody is looking, skip the entrance and paint the board. */
    if (!firstRender || document.hidden) grid.classList.add('is-settled');
    firstRender = false;

    if (!doubts.length) {
      grid.innerHTML = emptyHtml();
      showing = total = 0;
      renderLegend();
      return;
    }

    var page = doubts.slice(0, shownLimit);
    showing = page.length;
    total = doubts.length;
    var html = page.map(function (d, i) { return tileHtml(d, max, i); }).join('');
    if (doubts.length > page.length) {
      var rest = doubts.length - page.length;
      html += '<div class="grid__more"><button type="button" class="btn" data-more>Show ' +
        Math.min(rest, PAGE) + ' more</button>' +
        '<span class="grid__more-meta">' + page.length + ' of ' + doubts.length + ' doubts</span></div>';
    }
    grid.innerHTML = html;
    /* Hand the board over to interaction motion once the entrance has played out. A finished CSS
       animation declared with fill `both` goes on applying its end state forever, so leaving it
       declared would park a filled transform underneath every FLIP for the rest of the session.
       Settling the grid drops the declaration instead of racing it. */
    if (!grid.classList.contains('is-settled')) {
      var lastDelay = Math.min(page.length - 1, 12) * 45;
      setTimeout(function () { grid.classList.add('is-settled'); }, 500 + lastDelay + 60);
    }
    renderLegend();
  }

  /* Update a single tile in place so the heat change animates instead of re-rendering everything.
     Size follows the count now, so a tap that pushes a doubt into the next band grows its tile
     here too; leaving the old span behind would let colour and size disagree until the next
     full render. */
  /* The motion below is driven from JS, so the stylesheet's prefers-reduced-motion rule cannot
     reach it: that rule can only switch off animations and transitions the stylesheet itself
     declared. Ask the platform directly instead, and ask on every tap rather than caching the
     answer, because the setting can change while the page is open. */
  function stillness() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  /* The count is the product's whole argument and it used to change by teleporting. It rolls
     now: the old value leaves in the direction the number is travelling and the new one arrives
     from behind it, so "fourteen became fifteen" is something a student watches happen rather
     than something they notice afterwards. Up when the room grows, down when they take theirs
     back.

     The two values crossfade rather than running under a mask. .tile__count strong sits at
     line-height 0.9, so a box tight enough to clip the roll would shave the tops off Archivo
     Black's digits at every band and every breakpoint; a fade needs no clip to read cleanly. */
  function rollCount(el, next, up) {
    var prev = el.textContent;
    if (prev === next) return;
    el.textContent = next;

    var host = el.parentNode;
    /* Swept before the early return as well as before a new roll: a second tap that lands mid
       roll, or motion being switched off between one tap and the next, must not strand a stale
       value on top of the live one. */
    host.querySelectorAll('.count-ghost').forEach(function (g) { g.remove(); });
    if (stillness() || !el.animate) return;

    var ghost = el.cloneNode(false);
    ghost.textContent = prev;
    ghost.className = (el.className ? el.className + ' ' : '') + 'count-ghost';
    /* Never let the next refresh mistake the ghost for the live numeral. */
    ghost.removeAttribute('data-count');
    ghost.setAttribute('aria-hidden', 'true');
    host.appendChild(ghost);

    var dir = up ? -1 : 1;
    var drop = function () { ghost.remove(); };
    var out = ghost.animate([
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(' + (dir * 0.45) + 'em)', opacity: 0 }
    ], { duration: 240, easing: EASE, fill: 'forwards' });
    /* Three ways out, because the event alone is not dependable. onfinish covers the ordinary
       case and oncancel the interrupted one, but an animation that completes while the tab is in
       the background reaches "finished" without ever delivering the event — observed here, with
       the handler still attached and the ghost still in the DOM. The timer owes nothing to event
       delivery, so it is the one that guarantees the ghost goes. Removing it early costs nothing:
       the live numeral already holds the new value. */
    out.onfinish = out.oncancel = drop;
    setTimeout(drop, 320);
    el.animate([
      { transform: 'translateY(' + (-dir * 0.45) + 'em)', opacity: 0 },
      { transform: 'none', opacity: 1 }
    ], { duration: 300, easing: EASE });
  }

  /* A tap that pushes a doubt into the next band changes that tile's span, and every tile after
     it reflows around the new shape. Painted straight, the board teleports into its new
     arrangement: the one thing worth watching, the composition rearranging itself around what
     the room just said, happens between two frames.

     FLIP plays it back. Measure where every tile was, let the layout change, put each one back
     where it started with a transform, then release it. Transforms only, so the browser lays out
     once and the animation runs on the compositor rather than re-running layout every frame.

     Returns whether anything actually moved, which is how the caller knows the board has already
     spoken for this tap.

     `alsoMutate` runs inside the measure window, and anything that changes layout above the grid
     belongs in it. Dismissing the first-run hint used to happen after this function had already
     measured and started: the hint is a ~103px box above the board, so every tile's inverse
     transform came out 103px wrong and the board jumped by exactly that much while the reflow
     played. It fired on a student's first ever tap, which is the one time the hint is on screen.
     Folded in here, the board slides up into the space the hint vacates as part of the same
     move. */
  function refreshHeat(up, alsoMutate) {
    var all = store.getDoubts();
    var max = store.maxCount(all);
    var moving = !stillness();
    /* One pass over the painted tiles rather than a querySelector per doubt: the board holds
       at most PAGE tiles while the lecture can hold MAX_DOUBTS, so the old loop searched the
       DOM 400 times to touch 120 elements on every tap. */
    var els = Object.create(null);
    var before = Object.create(null);
    grid.querySelectorAll('.tile').forEach(function (el) {
      els[el.dataset.id] = el;
      if (!moving) return;
      var r = el.getBoundingClientRect();
      before[el.dataset.id] = { x: r.left, y: r.top };
    });
    all.forEach(function (d) {
      var el = els[d.id];
      if (!el || d.answered) return;
      var step = store.heatStep(d.count, max);
      var base = d.mine && !d.count ? ' tile--waiting' : (step ? ' tile--h' + step : '');
      el.dataset.size = sizeFor(d, max);
      el.className = 'tile ' + el.dataset.size + base + (el.classList.contains('is-pumping') ? ' is-pumping' : '');
      var c = el.querySelector('[data-count]');
      if (c) rollCount(c, store.formatCount(d.count), up);
    });
    if (alsoMutate) alsoMutate();
    renderLegend();
    if (!moving) return false;

    /* Every measurement first, then every animation: one layout pass for the whole board
       instead of one per tile. */
    var moves = [];
    grid.querySelectorAll('.tile').forEach(function (el) {
      var was = before[el.dataset.id];
      if (!was || !el.animate) return;
      var r = el.getBoundingClientRect();
      var dx = was.x - r.left, dy = was.y - r.top;
      /* Sub-pixel drift is not movement; animating it would only cost a compositor layer. */
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      moves.push([el, dx, dy]);
    });
    moves.forEach(function (m) {
      m[0].animate([
        { transform: 'translate(' + m[1] + 'px, ' + m[2] + 'px)' },
        { transform: 'none' }
      ], { duration: 460, easing: EASE });
    });
    return moves.length > 0;
  }

  function hintSeen() {
    try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return true; }
  }

  function dismissHint() {
    try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* session only */ }
    if (hint) hint.hidden = true;
  }

  /* Shown once, to someone who has never asked or tapped. It teaches the fast path to value
     (read the board, one tap) rather than the interface. Taking part retires it for good. */
  function renderHint() {
    if (!hint) return;
    if (hintSeen() || store.hasParticipated()) { hint.hidden = true; return; }
    hint.innerHTML =
      '<p class="hint__text">First time here? Read the board before you type. If your question is already up there, tapping <strong>Me too</strong> counts you in, and you will not have to ask it twice.</p>' +
      '<button type="button" class="hint__close" data-hint-close aria-label="Dismiss tip">' + ui.icons.close + '</button>';
    hint.querySelector('[data-hint-close]').addEventListener('click', dismissHint);
    hint.hidden = false;
  }

  /* Blocked storage, a full quota, or a record we had to repair. Whichever applies, the feed
     says it in a sentence rather than losing work quietly. */
  function renderNotice() {
    if (!noticeEl) return;
    var msg = store.notice();
    if (!msg) { noticeEl.hidden = true; noticeEl.textContent = ''; return; }
    noticeEl.innerHTML = ui.icons.lock + '<span>' + ui.esc(msg) + '</span>';
    noticeEl.hidden = false;
  }

  function onMeToo(btn) {
    var id = btn.dataset.metoo;
    var firstEver = !store.hasParticipated();
    var res = store.toggleMeToo(id);
    if (!res) return;
    btn.setAttribute('aria-pressed', res.pressed ? 'true' : 'false');
    btn.innerHTML = (res.pressed ? ui.icons.check : ui.icons.hand) +
      '<span aria-hidden="true">Me too</span>' + btn.querySelector('.sr-only').outerHTML;
    var tile = btn.closest('.tile');
    /* Cleared before the refresh so it is not carried across into the rebuilt class list. */
    tile.classList.remove('is-pumping');
    var reflowed = refreshHeat(res.pressed, dismissHint);
    /* The pulse is for taps that change nothing but the number. When the tap crosses a band the
       board is already reflowing around this tile and the count is already rolling inside it, and
       a third motion competing for the same instant reads as noise rather than as feedback. */
    if (!reflowed) {
      void tile.offsetWidth;
      tile.classList.add('is-pumping');
    }
    renderNotice();
    /* The aha moment, said out loud exactly once: you were never the only one. */
    if (!res.pressed) ui.toast('Taken back.');
    else if (firstEver && res.count > 1) ui.toast('Counted. ' + store.formatCount(res.count - 1) + ' others were stuck here too.');
    else ui.toast('Counted. ' + store.formatCount(res.count) + ' of you now.');
  }

  function onAsk(e) {
    e.preventDefault();
    /* Two taps on Ask before the first render lands would post the same doubt twice. */
    if (submitting) return;
    var text = textarea.value.trim();
    if (!text) { textarea.focus(); return; }

    submitting = true;
    askBtn.disabled = true;

    var d = store.ask(text);
    if (!d) {
      submitting = false;
      askBtn.disabled = false;
      ui.toast(store.isFull()
        ? 'This subject has reached its limit. Tap Me too on a doubt that matches instead.'
        : 'That did not post. Try rewording it.');
      textarea.focus();
      return;
    }

    textarea.value = '';
    counter.textContent = '0';
    dismissHint();
    if (filter === 'answered') setFilter('top'); else { shownLimit = PAGE; render(); }
    renderNotice();
    var el = grid.querySelector('[data-id="' + d.id + '"]');
    if (el) {
      /* Same rule the board entrance follows: `rise` is declared with fill `both`, so its
         backwards fill paints the tile transparent and 18px low until the animation actually
         runs, and a hidden tab never advances it. Measured: post from a background tab and the
         doubt you just wrote sits at opacity 0, offset 18px, for as long as the tab stays
         hidden — the one tile you most need to see. Animate only when somebody is looking, and
         drop the class once it has played so a finished animation is not left declared over
         the tile for the rest of the session. */
      if (!document.hidden) {
        el.classList.add('is-new');
        setTimeout(function () { el.classList.remove('is-new'); }, 560);
      }
      /* It now sits at the top of the board, so it is usually on screen already. Move the page
         the smallest amount that brings it fully into view, and never far enough to take the
         composer with it; scrolling away from what you just did was the old valley. */
      var r = el.getBoundingClientRect();
      var h = window.innerHeight || 0;
      if (r.top < 84 || r.top > h - 120) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    ui.toast('Posted anonymously. It is at the top of the board.');
    submitting = false;
    askBtn.disabled = false;
  }

  /* Three buttons where exactly one can be on is a radio group, not three toggles. That
     brings the keyboard contract with it: one tab stop for the set, arrows to move within
     it, and the moved-to option selected. */
  function setFilter(f, focusIt) {
    filter = f;
    shownLimit = PAGE;
    document.querySelectorAll('.filters__btn').forEach(function (b) {
      var on = b.dataset.filter === f;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      if (on && focusIt) b.focus();
    });
    render();
  }

  function onFilterKey(e) {
    var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    var step = keys[e.key];
    var btns = [].slice.call(document.querySelectorAll('.filters__btn'));
    var i = btns.indexOf(e.target);
    if (i === -1) return;
    if (step) {
      e.preventDefault();
      setFilter(btns[(i + step + btns.length) % btns.length].dataset.filter, true);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setFilter(btns[e.key === 'Home' ? 0 : btns.length - 1].dataset.filter, true);
    }
  }

  /* Relative timestamps drift out of date while the tab sits open. Refresh them on a slow
     tick, skip the work entirely while the tab is hidden, and catch up on return. */
  function refreshTimes() {
    if (document.hidden) return;
    var byId = Object.create(null);
    store.getDoubts().forEach(function (d) { byId[d.id] = d; });
    grid.querySelectorAll('.tile').forEach(function (el) {
      var d = byId[el.dataset.id];
      var metaEl = el.querySelector('.tile__bottom .tile__meta');
      if (d && metaEl) metaEl.textContent = 'Anon · ' + store.timeAgo(d.createdAt);
    });
  }

  /* ---------- subject picker ---------- */

  /* The subject lives in the URL rather than in storage, so a board is a link: shareable,
     bookmarkable, and survivable by the back button. Anything not on the timetable falls
     through to the picker instead of opening a board that does not exist. */
  function subjectFromUrl() {
    var m = /[?&]subject=([^&#]*)/.exec(location.search);
    if (!m) return '';
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  function subjectCard(s, busiest) {
    /* The bar is the subject's share of the busiest board's me toos, which is the same
       question the tiles answer one level down: where is the room most stuck. A subject with
       any activity at all keeps a visible sliver, so the bar never reads as nothing. */
    var pct = busiest && s.meToos ? Math.max(3, Math.round((s.meToos / busiest) * 100)) : 0;
    var reading = s.total
      ? '<strong>' + store.formatCount(s.open) + '</strong> open · <strong>' + store.formatCount(s.meToos) + '</strong> me too' + (s.meToos === 1 ? '' : 's')
      : '<strong>No doubts yet</strong> · be the first to ask';
    return '<a class="subject' + (s.total ? '' : ' subject--quiet') + '" href="feed.html?subject=' + encodeURIComponent(s.id) + '">' +
      '<span class="subject__code">' + ui.esc(s.code) + '</span>' +
      '<h2 class="subject__name">' + ui.esc(s.name) + '</h2>' +
      '<span class="subject__prof">' + ui.esc(s.professor) + '</span>' +
      '<span class="subject__bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
      '<span class="subject__stats">' + reading + '</span>' +
      '<span class="subject__go" aria-hidden="true">Open board ' + ui.icons.arrow + '</span>' +
      '</a>';
  }

  function renderPicker() {
    var wrap = document.getElementById('subjects');
    if (!wrap) return;
    var subs = store.subjects();
    var busiest = subs.reduce(function (m, s) { return s.meToos > m ? s.meToos : m; }, 0);
    wrap.innerHTML = subs.map(function (s) { return subjectCard(s, busiest); }).join('');
    document.getElementById('picker-note').innerHTML = ui.icons.lock +
      '<span>Nothing you post is tied to a name, in any subject. Professors see questions and counts, never people.</span>';
  }

  /* ---------- board ---------- */

  function bootBoard() {
    grid = document.getElementById('grid');
    counter = document.getElementById('counter');
    textarea = document.getElementById('doubt');
    legend = document.getElementById('legend-count');
    legendBox = document.getElementById('legend');
    hint = document.getElementById('hint');
    askBtn = document.getElementById('ask-btn');
    noticeEl = document.getElementById('storage-note');

    var meta = store.getMeta();
    document.title = 'dout — ' + meta.title;
    document.getElementById('course').textContent = meta.code + ' · ' + meta.professor;
    document.getElementById('subject-title').textContent = meta.name;
    document.getElementById('lock-note').innerHTML = ui.icons.lock + '<span>No name attached</span>';
    document.getElementById('note-line').innerHTML = ui.icons.lock + '<span>Nothing on this grid is tied to a name. ' + ui.esc(meta.professor) + ' sees questions and counts, never people.</span>';

    document.querySelectorAll('.filters__btn').forEach(function (b) {
      b.addEventListener('click', function () { setFilter(b.dataset.filter); });
      b.addEventListener('keydown', onFilterKey);
    });
    document.getElementById('ask').addEventListener('submit', onAsk);
    textarea.addEventListener('input', function () { counter.textContent = String(textarea.value.length); });
    textarea.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { document.getElementById('ask').requestSubmit(); }
    });
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-metoo]');
      if (btn) { onMeToo(btn); return; }
      if (e.target.closest('[data-empty-ask]')) {
        textarea.focus();
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (e.target.closest('[data-empty-all]')) { setFilter('top'); return; }
      if (e.target.closest('[data-more]')) {
        shownLimit += PAGE;
        render();
        /* Land on the first tile that was not there a moment ago, not back at the top. */
        var next = grid.querySelectorAll('.tile')[shownLimit - PAGE];
        if (next) { next.setAttribute('tabindex', '-1'); next.focus({ preventScroll: true }); }
      }
    });

    renderNotice();
    renderHint();
    render();
    if (location.hash === '#ask') { textarea.focus(); }

    /* Another tab asked or answered. Repaint rather than sit on a board that is no longer true. */
    document.addEventListener('metoo:change', function (e) {
      if (!e.detail || !e.detail.external) return;
      render();
      renderNotice();
    });

    setInterval(refreshTimes, 30000);
    document.addEventListener('visibilitychange', refreshTimes);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var picker = document.getElementById('picker');
    var boardEl = document.getElementById('board');

    if (store.setSubject(subjectFromUrl())) {
      boardEl.hidden = false;
      bootBoard();
      return;
    }

    picker.hidden = false;
    renderPicker();
    /* The nav's Ask button and the landing page both point at #ask. Arriving here with no
       subject chosen is not an error, but it is a question the page has to answer: which
       class are you asking in. Say so rather than dropping them on a silent list. */
    if (location.hash === '#ask') {
      var cue = document.getElementById('picker-cue');
      cue.textContent = 'Pick your subject first — the composer is on its board.';
      cue.hidden = false;
      document.getElementById('picker-title').focus();
    }
    document.addEventListener('metoo:change', function (e) {
      if (!e.detail || !e.detail.external) return;
      renderPicker();
    });
  });
})();

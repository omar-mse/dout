/* dout — stickers
   A decoration layer sitting behind the page: drag one out of the tray, drop it anywhere, and it
   stays there across reloads. Landing and feed only.

   Two rules shape the whole file. The layer lives at z-index -1 and is inert, so a sticker can
   never cover a doubt, a count, or a control — it peeks out of the margins and gutters and nothing
   more. And decoration is not content, so the layer is hidden from assistive tech and its buttons
   are pulled out of the tab order whenever the tray is shut; arranging stickers is the only state
   in which any of it is reachable, by pointer or by keyboard alike.

   Placements live in this browser, like everything else on this site. Blocked or full storage
   costs you the memory of where you put things, never the ability to put them there. */
(function () {
  var KEY = 'dout.stickers.v1';
  var NUDGE = 'dout.stickers.nudge';
  var POS = 'dout.stickers.sheet';
  var DIR = 'img/stickers/';

  /* The contents of img/stickers/, written out rather than fetched: a directory listing or an
     index.json would need fetch(), which fails on file://, and opening index.html straight off
     disk has to keep working. Drop a file in that folder and add its name here. */
  var SHEET = [
    '011157a377c2cd6e68792ef967a820e4.png', '053902a2b3b51a523711e6eb26123c93.png',
    '27f1593b9087eb75e662f8180c5baf86.png', '2ae72ace922f6fc2a2faca086dc7926d.png',
    '367679d9b5af2e0c6ca8ee808fe02bc8.png', '3af8c8306e33f78b16f48fe4dff1a600.png',
    '3ec65433d30589ba1e938715684c24fd.png', '435d0297061246e16abccd0157972b10.png',
    '575f5a1dfe98d0375f8df74c84cbf723.png', '5b649816c387d3466daf024a7fe31d05.png',
    '5bdc064011f2efd71395bc5cc2034906.png', '60351a7d039e5ab251593b562e7876d6.png',
    '6410c31ca07dc5b68c16bcc9ffbcac7f.png', '7e7e7037207112dc817906c433949eec.png',
    '900cbb9fe1a6b4333ea329888ea746ef.png', '926efa3490e86f565a9b801f865a6183.png',
    'a08784a906b2a822eaf11c9e93b5ddfe.png', 'cd2414b91aa0aa31864e6ae01248b44e.png',
    'd14c3cae7081231aa3c81cc46868ff45.png', 'df6b5d3597af48a7df09b520870b68bb.png',
    'e258a2af5a3644b40973d7f434fe5d1b.png', 'f519bd864b389e958de5e6a90ed3184a.png',
    'f59f829c272b2da1a04575b1d2945954.png'
  ];

  var MAX = 60;        /* a wall, not a swarm; also keeps the record inside the storage quota */
  var EDGE = 2;        /* percent of the layer kept clear, so nothing is half-clipped at a corner */
  var STEP = 1;        /* percent per arrow key press */
  var BIG_STEP = 5;    /* with shift held */

  var page = '';
  var list = [];
  var layer = null;
  var tray = null;
  var trayBtn = null;
  var countEl = null;
  var open = false;
  var drag = null;
  var lastGesture = null;   /* what the pointer just did, for the click that follows it */
  var win = null;           /* an in-progress drag of the sheet itself */
  var sheetPos = null;      /* where the sheet window currently sits */

  function esc(s) {
    return window.MeTooUI ? window.MeTooUI.esc(s) : String(s);
  }

  /* Script-driven motion is out of the stylesheet's reach: its prefers-reduced-motion rule can
     only switch off what it declared itself. Ask the platform directly, and ask every time,
     because the setting can change while the page is open. Same shape as feed.js. */
  function stillness() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';   /* --ease-pop, for the JS-driven pieces */

  /* ---------- storage ---------- */

  /* One bucket per page, so the landing and the feed are decorated separately. Anything that
     comes back malformed is dropped rather than repaired: a sticker is not worth a rescue. */
  function read() {
    var all;
    try { all = JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { return []; }
    if (!all || typeof all !== 'object') return [];
    var raw = all[page];
    if (!Array.isArray(raw)) return [];

    var out = [];
    for (var i = 0; i < raw.length && out.length < MAX; i++) {
      var r = raw[i];
      if (!r || typeof r !== 'object') continue;
      var k = Math.floor(Number(r.k));
      if (!(k >= 0 && k < SHEET.length)) continue;
      out.push({
        k: k,
        x: clamp(Number(r.x), EDGE, 100 - EDGE, 50),
        y: clamp(Number(r.y), EDGE, 100 - EDGE, 50),
        /* Wrapped, not clamped. A sticker turned a few times is legitimately at 225 degrees, and
           the old ±30 clamp — written when the only rotation was the drop tilt — would have
           flattened every one of those turns back to 30 on the next reload. */
        r: wrap(Number(r.r)),
        s: clamp(Number(r.s), 0.6, 1.6, 1)
      });
    }
    return out;
  }

  function write() {
    var all;
    try { all = JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { all = {}; }
    if (!all || typeof all !== 'object') all = {};
    all[page] = list.map(function (r) {
      return { k: r.k, x: round(r.x), y: round(r.y), r: round(r.r), s: round(r.s) };
    });
    /* A full or blocked store loses the placements, not the session: the stickers already on
       screen stay exactly where they were put. */
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }

  function clamp(n, lo, hi, fallback) {
    if (typeof n !== 'number' || !isFinite(n)) return fallback;
    return n < lo ? lo : n > hi ? hi : n;
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  /* Any angle into [0, 360). Keeps the stored number small however many times a sticker is turned. */
  function wrap(n) {
    if (typeof n !== 'number' || !isFinite(n)) return 0;
    return ((n % 360) + 360) % 360;
  }

  /* ---------- drawing ---------- */

  function place(rec, el) {
    el.style.left = rec.x + '%';
    el.style.top = rec.y + '%';
    el.style.setProperty('--r', rec.r + 'deg');
    el.style.setProperty('--s', rec.s);
  }

  /* Carries the angle, because turning is the one change a sighted user sees and a screen reader
     user otherwise cannot: the sticker is decoration, so nothing else about it is announced. */
  function label(rec, el) {
    el.setAttribute('aria-label', 'Sticker ' + (rec.k + 1) + ', turned ' + Math.round(rec.r) +
      ' degrees. Click to turn it, arrow keys move it, Delete removes it.');
  }

  function makeSticker(rec) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'sticker';
    el.tabIndex = open ? 0 : -1;
    el.innerHTML = '<img src="' + DIR + esc(SHEET[rec.k]) + '" alt="" draggable="false">';
    label(rec, el);
    place(rec, el);

    el.addEventListener('pointerdown', function (e) { grab(e, rec, el); });
    el.addEventListener('click', function () { turn(rec, el); });
    el.addEventListener('keydown', function (e) { onStickerKey(e, rec, el); });
    return el;
  }

  function render() {
    layer.innerHTML = '';
    list.forEach(function (rec) { layer.appendChild(makeSticker(rec)); });
    if (countEl) {
      countEl.textContent = SHEET.length + ' stickers · ' +
        (list.length === 0 ? 'none here yet'
          : list.length === 1 ? '1 on this page' : list.length + ' on this page');
    }
  }

  /* ---------- placing and dragging ---------- */

  /* Percentages of the layer, not pixels: the layer is as tall as the document, and both it and
     the content reflow on resize. A sticker dropped beside the third tile should stay beside the
     third tile on a narrower screen. */
  function toPercent(clientX, clientY) {
    var box = layer.getBoundingClientRect();
    return {
      x: clamp(((clientX - box.left) / box.width) * 100, EDGE, 100 - EDGE, 50),
      y: clamp(((clientY - box.top) / box.height) * 100, EDGE, 100 - EDGE, 50)
    };
  }

  /* Where a sticker lands when there is no drop point — the press-without-moving and keyboard
     paths. The spot walks around a small grid as stickers accumulate, or pressing the tray five
     times just buries five stickers in one pile. */
  function slotFor(n) {
    return { x: 50 + ((n % 5) - 2) * 7, y: 50 + ((Math.floor(n / 5) % 3) - 1) * 9 };
  }

  function add(k, at) {
    if (list.length >= MAX) {
      if (window.MeTooUI) window.MeTooUI.toast('That is as many stickers as this page holds.');
      return null;
    }
    var slot = at || slotFor(list.length);

    /* Lands square. Turning is a deliberate act now — click the sticker — so dropping one
       pre-tilted would mean every sticker arrives already needing to be straightened.
       A little size variation stays, so a wall of them does not read as a grid. */
    var rec = {
      k: k,
      x: slot.x,
      y: slot.y,
      r: 0,
      s: round(0.9 + Math.random() * 0.25)
    };
    list.push(rec);
    render();
    write();
    return layer.lastChild;
  }

  function grab(e, rec, el) {
    if (!open || e.button > 0) return;
    e.preventDefault();
    lastGesture = null;
    var box = layer.getBoundingClientRect();
    drag = {
      rec: rec,
      el: el,
      id: e.pointerId,
      moved: false,
      fromTray: false,
      left: true,        /* already outside the tray: this one started on the board */
      binning: false,
      startX: e.clientX,
      startY: e.clientY,
      /* Keep the grab offset, so a sticker does not jump its centre to the cursor on pick-up. */
      dx: e.clientX - (box.left + (rec.x / 100) * box.width),
      dy: e.clientY - (box.top + (rec.y / 100) * box.height)
    };
    el.classList.add('is-held');
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  }

  /* The tray doubles as the bin: carry a sticker back down into it and let go. */
  function overTray(e) {
    if (tray.hidden) return false;
    var b = tray.getBoundingClientRect();
    return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom;
  }

  function move(e) {
    if (!drag || e.pointerId !== drag.id) return;
    /* Past this many pixels the gesture is a drag and not a click, so the turn on release is
       suppressed. A few pixels of slop, because a press with a mouse or a thumb is never still. */
    if (Math.abs(e.clientX - drag.startX) > 5 || Math.abs(e.clientY - drag.startY) > 5) drag.moved = true;

    /* Only once the sticker has actually left the tray can it count as being carried back into
       it — otherwise every drag that starts in the tray would begin life marked for deletion. */
    if (drag.moved && !overTray(e)) drag.left = true;
    var binning = drag.left && overTray(e);
    if (binning !== drag.binning) {
      drag.binning = binning;
      tray.classList.toggle('is-bin', binning);
      drag.el.classList.toggle('is-binning', binning);
      /* Over the sheet the whole layer rises above it, so the sticker being dragged stays in
         sight rather than sliding underneath the thing about to consume it. */
      layer.classList.toggle('is-lifted', binning);
    }

    var at = toPercent(e.clientX - drag.dx, e.clientY - drag.dy);
    drag.rec.x = at.x;
    drag.rec.y = at.y;
    place(drag.rec, drag.el);
  }

  function drop(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.el.classList.remove('is-held');
    try { drag.el.releasePointerCapture(e.pointerId); } catch (err) {}

    layer.classList.remove('is-lifted');

    if (drag.binning) {
      tray.classList.remove('is-bin');
      var binned = drag.rec;
      lastGesture = { moved: true, fromTray: drag.fromTray };
      setTimeout(function () { lastGesture = null; }, 0);
      var binnedEl = drag.el;
      drag = null;
      /* No focus move: this hand is on a pointer, and pulling focus mid-gesture would scroll the
         page out from under it. The keyboard path through remove() still places focus. */
      removeWithExit(binned, binnedEl);
      if (window.MeTooUI) window.MeTooUI.toast('Sticker removed.');
      return;
    }

    /* Pressed a tray sticker without dragging it anywhere: the sticker was created under the
       pointer, which is down inside the tray itself. Send it to the middle, where the keyboard
       path puts it, rather than leaving it hidden behind the tray. */
    if (drag.fromTray && !drag.moved) {
      var slot = slotFor(list.indexOf(drag.rec));
      drag.rec.x = slot.x;
      drag.rec.y = slot.y;
      place(drag.rec, drag.el);
    }

    /* Handed to the click that browsers fire immediately after this, then dropped on the next
       task: a click is how both the turn and the tray's keyboard path arrive, and each needs to
       know whether a pointer gesture just produced it. */
    lastGesture = { moved: drag.moved, fromTray: drag.fromTray };
    setTimeout(function () { lastGesture = null; }, 0);

    /* It settles onto the page instead of simply stopping. Restarting the class needs the reflow
       between removing and adding, or a second drop in the same spot plays nothing. */
    var settled = drag.el;
    settled.classList.remove('is-dropped');
    void settled.offsetWidth;
    settled.classList.add('is-dropped');
    setTimeout(function () { settled.classList.remove('is-dropped'); }, 300);

    drag = null;
    write();
  }

  /* Clicking a placed sticker turns it a further 45 degrees — eight clicks bring it back round. */
  function turn(rec, el) {
    var g = lastGesture;
    lastGesture = null;
    /* Ignore the click that closes a drag, and the one that can follow a press on the tray;
       a click with no gesture behind it at all is the keyboard, which should turn. */
    if (g && (g.moved || g.fromTray)) return;
    if (list.indexOf(rec) < 0) return;   /* the drag that ended in the bin took this one */

    rec.r = wrap(rec.r + 45);
    place(rec, el);
    label(rec, el);
    write();
  }

  /* Let the sticker leave before the list forgets it. render() rebuilds the layer from the array,
     so removing the record first would make the element vanish mid-gesture with nothing to watch;
     the element is animated out and the record is dropped when it lands. */
  function removeWithExit(rec, el) {
    if (stillness() || !el || !el.animate) { remove(rec, true); return; }
    var done = false;
    var finish = function () { if (!done) { done = true; remove(rec, true); } };
    var anim = el.animate(
      [{ opacity: 0.45, transform: getComputedStyle(el).transform },
       { opacity: 0, transform: getComputedStyle(el).transform + ' scale(0.5)' }],
      { duration: 180, easing: EASE, fill: 'forwards' }
    );
    anim.addEventListener('finish', finish);
    /* A dropped animation (backgrounded tab, an engine that never fires finish) must not leave
       a sticker on screen that the record no longer contains. */
    setTimeout(finish, 400);
  }

  function remove(rec, quiet) {
    var i = list.indexOf(rec);
    if (i < 0) return;
    list.splice(i, 1);
    render();
    write();
    if (quiet) return;
    /* Focus has to land somewhere deliberate or it falls to <body> and the keyboard user is
       dumped at the top of the document. */
    var next = layer.children[Math.min(i, layer.children.length - 1)];
    if (next) next.focus();
    else if (trayBtn) trayBtn.focus();
  }

  function onStickerKey(e, rec, el) {
    if (!open) return;
    var step = e.shiftKey ? BIG_STEP : STEP;
    var k = e.key;

    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      if (k === 'ArrowLeft') rec.x = clamp(rec.x - step, EDGE, 100 - EDGE, rec.x);
      if (k === 'ArrowRight') rec.x = clamp(rec.x + step, EDGE, 100 - EDGE, rec.x);
      if (k === 'ArrowUp') rec.y = clamp(rec.y - step, EDGE, 100 - EDGE, rec.y);
      if (k === 'ArrowDown') rec.y = clamp(rec.y + step, EDGE, 100 - EDGE, rec.y);
      place(rec, el);
      write();
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      remove(rec);
      return;
    }
    if (k === 'Escape') setOpen(false);
  }

  /* ---------- tray ---------- */

  /* Out at roughly three quarters of the entrance, the way an exit should be. The attribute is
     flipped before this runs, so the veil is already fading on its own transition alongside it.
     Hiding is what actually matters, so it happens on a timer too: a finish event that never
     arrives — a backgrounded tab, an engine without the Web Animations API — must not leave a
     sheet on screen that the site believes is shut. */
  function hideSheet() {
    if (!tray || tray.hidden) return;
    if (stillness() || !tray.animate) { tray.hidden = true; return; }

    var to = docked() ? 'translateY(18px)' : 'translate(14px, -6px)';
    var done = false;
    var end = function () { if (!done) { done = true; tray.hidden = true; } };
    try {
      tray.animate([{ opacity: 1 }, { opacity: 0, transform: to }],
        { duration: 220, easing: EASE }).addEventListener('finish', end);
    } catch (e) { end(); return; }
    setTimeout(end, 450);
  }

  /* `quiet` sets the state without moving focus. Closing the sheet should hand focus back to the
     button that opened it, but booting the page is not a close: doing it there stole focus from the
     top of the document on every load, and painted a focus ring on the button after a keyboard
     reload, which looked like a stray yellow border around the icon. */
  function setOpen(next, quiet) {
    open = next;
    document.documentElement.setAttribute('data-stickers', open ? 'edit' : 'off');
    layer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      tray.hidden = false;
      /* Same rule as the tour: only animate a sheet the visitor can actually watch arrive. */
      if (!stillness() && document.visibilityState !== 'hidden') {
        tray.classList.add('is-entering');
        setTimeout(function () { tray.classList.remove('is-entering'); }, 400);
      }
    } else hideSheet();
    trayBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    /* Hidden decoration must not collect tab stops. */
    for (var i = 0; i < layer.children.length; i++) layer.children[i].tabIndex = open ? 0 : -1;
    /* Now it has a size: pull it back inside the viewport if the stored position came from a wider
       screen, a taller one, or a sheet that was never measured. */
    if (open && sheetPos) placeSheet(sheetPos, false);

    if (open) dismissNudge();
    else if (!quiet && trayBtn) trayBtn.focus();
  }

  /* ---------- the sheet as a window ---------- */

  /* Where the window sits is a preference about this browser, not content, so it lives under its
     own key and is shared by both pages rather than stored per page like the stickers are. */
  function readPos() {
    var p;
    try { p = JSON.parse(localStorage.getItem(POS) || 'null'); }
    catch (e) { return null; }
    if (!p || typeof p !== 'object') return null;
    var x = Number(p.x), y = Number(p.y);
    if (!isFinite(x) || !isFinite(y)) return null;
    return { x: x, y: y };
  }

  function docked() {
    return window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
  }

  /* Always leave the window reachable: a stored position from a wide screen, or a viewport that
     has since been resized, must not park it off the edge where it cannot be dragged back. */
  function placeSheet(pos, save) {
    if (!tray || docked()) return;
    var box = tray.getBoundingClientRect();

    /* A shut sheet is display:none and measures 0x0, so there is no width to clamp against yet —
       and clamping against zero parks the window just off the right edge. Remember the intention,
       apply it, and let setOpen() clamp for real once the thing has a size. */
    if (!box.width) {
      sheetPos = { x: pos.x, y: pos.y };
      tray.style.setProperty('--sheet-x', Math.round(pos.x) + 'px');
      tray.style.setProperty('--sheet-y', Math.round(pos.y) + 'px');
      return;
    }

    var maxX = Math.max(8, window.innerWidth - box.width - 8);
    var maxY = Math.max(navHeight() + 8, window.innerHeight - box.height - 8);
    var x = clamp(pos.x, 8, maxX, 8);
    var y = clamp(pos.y, navHeight() + 8, maxY, navHeight() + 8);
    tray.style.setProperty('--sheet-x', Math.round(x) + 'px');
    tray.style.setProperty('--sheet-y', Math.round(y) + 'px');
    sheetPos = { x: x, y: y };
    if (save) {
      try { localStorage.setItem(POS, JSON.stringify({ x: Math.round(x), y: Math.round(y) })); }
      catch (e) {}
    }
  }

  function navHeight() {
    var nav = document.querySelector('.nav');
    return nav ? Math.round(nav.getBoundingClientRect().height) : 76;
  }

  function currentPos() {
    if (sheetPos) return sheetPos;
    var box = tray.getBoundingClientRect();
    return { x: box.left, y: box.top };
  }

  function wireWindow() {
    var head = tray.querySelector('.tray__head');

    head.addEventListener('pointerdown', function (e) {
      if (docked() || e.button > 0) return;
      e.preventDefault();
      var box = tray.getBoundingClientRect();
      win = { id: e.pointerId, dx: e.clientX - box.left, dy: e.clientY - box.top };
      tray.classList.add('is-moving');
      try { head.setPointerCapture(e.pointerId); } catch (err) {}
    });

    /* Arrow keys from the grip, because a window that can only be moved by dragging is a window
       a keyboard user cannot move off the stickers they are trying to reach. */
    tray.querySelector('.tray__grip').addEventListener('keydown', function (e) {
      if (docked()) return;
      var step = e.shiftKey ? 40 : 10;
      var p = currentPos();
      if (e.key === 'ArrowLeft') p = { x: p.x - step, y: p.y };
      else if (e.key === 'ArrowRight') p = { x: p.x + step, y: p.y };
      else if (e.key === 'ArrowUp') p = { x: p.x, y: p.y - step };
      else if (e.key === 'ArrowDown') p = { x: p.x, y: p.y + step };
      else return;
      e.preventDefault();
      placeSheet(p, true);
    });
  }

  function moveWindow(e) {
    if (!win || e.pointerId !== win.id) return;
    placeSheet({ x: e.clientX - win.dx, y: e.clientY - win.dy }, false);
  }

  function dropWindow(e) {
    if (!win || e.pointerId !== win.id) return;
    tray.classList.remove('is-moving');
    win = null;
    placeSheet(currentPos(), true);
  }

  function buildTray() {
    var items = SHEET.map(function (file, i) {
      return '<li><button type="button" class="tray__item" data-k="' + i + '" ' +
        'aria-label="Add sticker ' + (i + 1) + '">' +
        '<img src="' + DIR + esc(file) + '" alt="" draggable="false"></button></li>';
    }).join('');

    var el = document.createElement('div');
    el.className = 'tray';
    el.id = 'sticker-tray';
    el.hidden = true;
    /* Header, scrolling sheet, footer. The header and footer sit outside the scroll area so the
       count and Clear all stay put however far down the sheet you are. */
    el.innerHTML =
      '<div class="tray__head">' +
        '<span class="tray__title">Peel one off</span>' +
        '<span class="tray__count" id="tray-count" role="status"></span>' +
        '<button type="button" class="tray__grip" aria-label="Move the sticker sheet. ' +
          'Arrow keys move it, hold shift to move further."></button>' +
      '</div>' +
      '<ul class="tray__items">' + items + '</ul>' +
      '<div class="tray__foot">' +
        '<button type="button" class="btn btn--sm" data-clear>Clear all</button>' +
        '<button type="button" class="btn btn--sm" data-close>Done</button>' +
        '<p class="tray__note">Drag one out, or press it to drop one in the middle. Click a placed ' +
          'sticker to turn it; drag it back here to remove it. They sit behind the page and are ' +
          'saved in this browser only.</p>' +
      '</div>';
    return el;
  }

  function wireTray() {
    countEl = tray.querySelector('#tray-count');

    tray.addEventListener('pointerdown', function (e) {
      var item = e.target.closest ? e.target.closest('.tray__item') : null;
      if (!item) return;
      /* Drag straight out of the tray: the sticker is created under the pointer and inherits the
         gesture already in progress, so picking and placing are one motion rather than two. */
      e.preventDefault();
      lastGesture = null;
      var el = add(Number(item.dataset.k), toPercent(e.clientX, e.clientY));
      if (!el) return;
      drag = {
        rec: list[list.length - 1], el: el, id: e.pointerId, dx: 0, dy: 0,
        moved: false, fromTray: true, left: false, binning: false,
        startX: e.clientX, startY: e.clientY
      };
      el.classList.add('is-held');
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });

    /* Keyboard and assistive-tech path: no pointer gesture, so the sticker lands in the middle and
       the arrow keys take it from there. A click that a press just produced is skipped — that
       press already added its sticker, and adding a second here was a real double-drop. */
    tray.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('.tray__item') : null;
      if (item) {
        if (drag || lastGesture) { lastGesture = null; return; }
        add(Number(item.dataset.k), null);
        var last = layer.lastChild;
        if (last) last.focus();
        return;
      }
      if (e.target.closest('[data-close]')) setOpen(false);
      if (e.target.closest('[data-clear]')) {
        if (!list.length) return;
        list = [];
        render();
        write();
        if (window.MeTooUI) window.MeTooUI.toast('Stickers cleared.');
      }
    });

    tray.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ---------- the nudge ---------- */

  function dismissNudge() {
    var n = document.querySelector('.sticker-nudge');
    if (n && n.parentNode) n.parentNode.removeChild(n);
    try { localStorage.setItem(NUDGE, '1'); } catch (e) {}
  }

  function maybeNudge() {
    var seen = true;
    try { seen = !!localStorage.getItem(NUDGE); } catch (e) {}
    if (seen || list.length) return;

    var n = document.createElement('div');
    n.className = 'sticker-nudge';
    n.innerHTML = '<span>Decorate this page</span>' +
      '<button type="button" class="sticker-nudge__x" aria-label="Dismiss">' +
      (window.MeTooUI ? window.MeTooUI.icons.close : '×') + '</button>';
    n.querySelector('.sticker-nudge__x').addEventListener('click', dismissNudge);
    document.body.appendChild(n);
  }

  /* ---------- boot ---------- */

  /* The sheet is docked below the nav, which is sticky, raised above the layer during edit mode,
     and taller once its links wrap. Measuring beats hardcoding a top that is wrong at two widths. */
  function measureNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    document.documentElement.style.setProperty('--nav-h', Math.round(nav.getBoundingClientRect().height) + 'px');
  }

  function start() {
    page = document.body.dataset.page || '';
    if (!page || !SHEET.length) return;

    layer = document.createElement('div');
    layer.className = 'stickers';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    tray = buildTray();
    document.body.appendChild(tray);
    wireTray();

    trayBtn = document.createElement('button');
    trayBtn.type = 'button';
    trayBtn.className = 'btn btn--ghost btn--icon stickers-btn';
    trayBtn.setAttribute('aria-expanded', 'false');
    trayBtn.setAttribute('aria-controls', 'sticker-tray');
    trayBtn.setAttribute('aria-label', 'Stickers');
    trayBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="miter" ' +
      'aria-hidden="true"><path d="M4 4h16v10l-6 6H4z"/><path d="M20 14h-6v6"/></svg>';
    trayBtn.addEventListener('click', function () { setOpen(!open); });

    /* Next to the theme control, because it is the same kind of thing: a per-browser preference
       about how this site looks. Falls back to floating on its own if the nav never rendered. */
    var actions = document.querySelector('.nav__actions');
    if (actions) actions.insertBefore(trayBtn, actions.firstChild);
    else { trayBtn.classList.add('stickers-btn--loose'); document.body.appendChild(trayBtn); }

    list = read();
    render();
    setOpen(false, true);
    maybeNudge();

    wireWindow();
    var stored = readPos();
    if (stored) placeSheet(stored, false);

    measureNav();
    window.addEventListener('resize', function () {
      measureNav();
      /* A window parked against the right edge of a wide viewport would hang off a narrow one. */
      if (sheetPos) placeSheet(sheetPos, false);
    });

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', drop);
    document.addEventListener('pointercancel', drop);

    document.addEventListener('pointermove', moveWindow);
    document.addEventListener('pointerup', dropWindow);
    document.addEventListener('pointercancel', dropWindow);
  }

  /* The sheet, for anything that needs to show a sticker without owning a second copy of the list
     — the tour does. Read-only by convention; this module is still the only writer. */
  window.MeTooStickers = { DIR: DIR, SHEET: SHEET };

  document.addEventListener('DOMContentLoaded', function () {
    /* Decoration must never be the reason a board fails to draw. */
    try { start(); }
    catch (e) { if (window.console && console.error) console.error('dout: stickers unavailable', e); }
  });
})();

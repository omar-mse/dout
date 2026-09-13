/* dout — the pointer
   The favicon as a cursor: a yellow square in a black border that follows the pointer with a
   hair of lag, grows over anything that can be pressed, shrinks while it is being pressed, and
   steps aside over a text field so the system I-beam can do its job.

   Only for a fine pointer with motion allowed. A touch screen has no pointer to follow, and
   someone who asked for less motion did not ask for a pointer that trails their hand; both keep
   the arrow they came with. Nothing here is content, so nothing here is ever waited on: the
   square is appended to a page that already works, and the system pointer is hidden only once
   the square has actually moved to where the pointer is. */
(function () {
  var fine, still;
  try {
    fine = window.matchMedia('(pointer: fine)').matches;
    still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { return; }
  if (!fine || still || !document.body) return;

  var INTERACTIVE = 'a, button, [role="button"], label, .tile, .preview__cell, .swatch, .room__seat';
  var TEXT = 'input, textarea, select, [contenteditable]';

  var root = document.documentElement;
  var el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  /* Over anything that can be pressed the square lets go of the pointer, snaps to the control
     and opens into a frame around it, tracking the control's own hover lift. Tiles and seats
     are not controls, so over those it only grows. */
  var FRAME = 'a, button, [role="button"], [role="switch"], [role="radio"]';
  var FRAME_PAD = 6;

  var tx = 0, ty = 0, x = 0, y = 0, scale = 1;
  var raf = 0;
  var shown = false;
  var framed = null;

  /* Lerp toward the pointer and stop asking for frames once it has caught up, so an idle page
     costs nothing. While framed the loop stays alive: the target is re-measured each frame so
     the frame rides the button's lift, one layout read on one element for the length of a hover. */
  function frame() {
    if (framed) {
      var b = framed.getBoundingClientRect();
      tx = b.left + b.width / 2;
      ty = b.top + b.height / 2;
      el.style.setProperty('--w', (b.width + FRAME_PAD * 2) + 'px');
      el.style.setProperty('--h', (b.height + FRAME_PAD * 2) + 'px');
    }
    x += (tx - x) * 0.35;
    y += (ty - y) * 0.35;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')';
    if (framed || Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(frame);
    else raf = 0;
  }
  function tick() { if (!raf) raf = requestAnimationFrame(frame); }

  function setFrame(target) {
    if (target === framed) return;
    framed = target;
    el.classList.toggle('is-frame', !!target);
    if (!target) {
      el.style.removeProperty('--w');
      el.style.removeProperty('--h');
    }
    tick();
  }

  document.addEventListener('pointermove', function (e) {
    /* A hybrid laptop matches (pointer: fine) for its trackpad and still takes touches. */
    if (e.pointerType === 'touch') return;
    tx = e.clientX; ty = e.clientY;
    if (!shown) {
      shown = true;
      x = tx; y = ty;
      root.classList.add('has-cursor');
      el.classList.add('is-on');
    }
    tick();
  }, { passive: true });

  document.addEventListener('pointerover', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var f = t.closest(FRAME);
    setFrame(f);
    el.classList.toggle('is-over', !f && !!t.closest(INTERACTIVE));
    el.classList.toggle('is-text', !!t.closest(TEXT));
  });

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') return;
    scale = 0.85; tick();
  });
  document.addEventListener('pointerup', function () { scale = 1; tick(); });

  /* Gone off the window: nothing to follow, so nothing to show. */
  root.addEventListener('pointerleave', function () { el.classList.remove('is-on'); });
  root.addEventListener('pointerenter', function () { if (shown) el.classList.add('is-on'); });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
})();

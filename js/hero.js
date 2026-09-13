/* dout — hero load-in
   The landing's first screen arrives in order: kicker, the headline a word at a time, the flag
   stamped on, the lede, the ticker, the buttons, the three props thrown down beside the copy,
   and last the board taking its heat with every count climbing to its number. Then two things
   keep going: the pointer taps the me-too prop once, and the ticker takes the doubts in turns.

   An addition to a finished page, never a gate in front of one: the stylesheet paints every one
   of these at rest, this file runs only when motion is wanted, and every element is handed back
   to the stylesheet with nothing of this file's left inline the moment the sequence ends or is
   cut short. */
(function () {
  var ui = window.MeTooUI;
  var hero = document.querySelector('.hero');
  if (!hero || !window.gsap || !ui || !ui.wantsMotion()) return;

  /* Claimed before DOMContentLoaded, so landing.js leaves the board's reveal to this timeline. */
  window.DoutHero = { live: true };

  var q = gsap.utils.selector(hero);
  var parts = q('.kicker, .hero__word, .hero__flag, .hero__lede, .ticker, .hero__cta .btn, .prop');
  var done = false;
  var started = false;

  function settle() {
    if (done) return;
    done = true;
    /* Only what the tweens set. 'all' would also strip the props' own --r and --dy from the markup. */
    gsap.set(parts, { clearProps: 'transform,opacity' });
    if (!document.hidden) tapDemo();
    ticker();
  }

  /* A count climbs from nothing to its number. Only plain digits take part: "Answered" and the
     compact form the store uses past 10,000 are left exactly as painted. If landing.js repaints
     the board mid-climb the tweened nodes are simply gone and the fresh ones show the true count. */
  function tickUp(el, delay) {
    if (!el) return;
    var text = el.textContent.trim();
    var final = parseInt(text, 10);
    if (!(final > 0) || String(final) !== text) return;
    var o = { n: 0 };
    el.textContent = '0';
    gsap.to(o, {
      n: final, duration: 0.9, delay: delay, ease: 'power2.out', snap: { n: 1 },
      onUpdate: function () { el.textContent = String(o.n); },
      onComplete: function () { el.textContent = String(final); }
    });
  }

  var tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 0.7 }, onComplete: settle });
  tl.from(q('.kicker'), { y: 16, opacity: 0, duration: 0.45 })
    .from(q('.hero__word'), { y: '0.45em', opacity: 0, duration: 0.55, stagger: 0.06 }, '-=0.25')
    /* The flag is a stamp, so it lands rather than rises. */
    .from(q('.hero__flag'), { scale: 0.7, opacity: 0, ease: 'back.out(1.7)', duration: 0.5 }, '-=0.3')
    .from(q('.hero__lede'), { y: 24, opacity: 0 }, '-=0.3')
    /* opacity, not autoAlpha: the tour hands focus to the first button when it closes, and a
       button that is visibility:hidden for the length of a tween would refuse it. */
    .from(q('.hero__cta .btn'), { y: 16, opacity: 0, stagger: 0.08 }, '-=0.35')
    .from(q('.ticker'), { y: 16, opacity: 0, duration: 0.5 }, '-=0.4')
    /* Each prop comes in from its own corner and settles onto the rotation the stylesheet gave it. */
    .from(q('.prop'), {
      x: function (i) { return [-48, 40, 56][i] || 0; },
      y: function (i) { return [-56, -40, 48][i] || 0; },
      opacity: 0, rotation: '+=14', stagger: 0.09, ease: 'back.out(1.4)', duration: 0.8
    }, '-=0.5')
    /* The board's heat wave is the same one it has always had (reveal() in ui.js); this only
       decides when it starts, and sets the counts climbing on the same 55ms wave. Skipped when
       the sequence is jumped to its end, which leaves the board finished with its real counts,
       exactly as a page with no motion would have it. */
    .add(function () {
      var grid = document.getElementById('preview');
      ui.reveal(grid);
      if (grid) grid.querySelectorAll('.preview__count').forEach(function (el, i) { tickUp(el, i * 0.055); });
      tickUp(q('.prop--metoo b')[0], 0);
    }, '-=0.4');

  /* One tap, once. The pointer glides onto the me-too prop, presses, and the prop's count rolls
     to the next number and pops: the flag says nobody asks, the tap says me too. The prop and
     not a board tile, because the board's counts are real and a tap nobody made must not land
     there. */
  function roll(el, to) {
    if (!el) return;
    gsap.timeline()
      .to(el, { y: '-0.5em', opacity: 0, duration: 0.12, ease: 'power2.in' })
      .add(function () { el.textContent = String(to); })
      .fromTo(el, { y: '0.5em', opacity: 0 }, { y: 0, opacity: 1, duration: 0.14, ease: 'power2.out', clearProps: 'transform,opacity' });
  }

  function tapDemo() {
    var prop = q('.prop--metoo')[0];
    var tap = q('.tapper')[0];
    if (!prop || !tap) return;
    var num = prop.querySelector('b');
    gsap.set(tap, { display: 'block', x: 90, y: 70, opacity: 0 });
    gsap.timeline({
      delay: 0.5,
      onComplete: function () { gsap.set([tap, prop], { clearProps: 'transform,opacity,display' }); }
    })
      .to(tap, { x: 0, y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
      .to(tap, { scale: 0.82, duration: 0.1 })
      /* Read at the moment of the tap, not when the demo was scheduled: the prop's own count is
         still climbing to 31 for a moment after the load-in settles. */
      .add(function () { roll(num, (parseInt(num && num.textContent, 10) || 31) + 1); })
      .to(prop, { scale: 1.08, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' }, '<')
      .to(tap, { scale: 1, duration: 0.14 })
      .to(tap, { y: -18, opacity: 0, duration: 0.4, delay: 0.5, ease: 'power2.in' });
  }

  /* The doubts take turns: each one rises in, holds long enough to read, and leaves upward as
     the next rises under it. Hovering holds the current one still. */
  function ticker() {
    var box = document.querySelector('[data-ticker]');
    if (!box) return;
    var items = box.querySelectorAll('.ticker__item');
    if (items.length < 2) return;
    box.classList.add('ticker--live');
    var move = 0.35, hold = 2.9, step = move + hold;
    var loop = gsap.timeline({ repeat: -1 });
    items.forEach(function (item, i) {
      var at = i * step;
      if (i > 0) loop.set(item, { yPercent: 100 }, 0);
      loop.to(item, { yPercent: 0, duration: move, ease: 'power3.out' }, at)
        .to(item, { yPercent: -100, duration: move, ease: 'power3.in' }, at + step)
        .set(item, { yPercent: 100 }, at + step + move);
    });
    box.addEventListener('pointerenter', function () { loop.pause(); });
    box.addEventListener('pointerleave', function () { loop.play(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) loop.pause(); else loop.play();
    });
  }

  function finish() {
    tl.progress(1);
    settle();
  }

  function start() {
    if (started || done) return;
    started = true;
    /* Archivo Black is preloaded, so fonts.ready is normally already settled. The cap is for a
       slow link, where a headline that rises in a fallback face and swaps mid-flight is worse
       than one that rises 300ms later. */
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var cap = new Promise(function (resolve) { setTimeout(resolve, 300); });
    Promise.race([fonts, cap]).then(function () {
      if (done) return;
      tl.play();
      /* Longer than the whole sequence. If the tab is throttled and the ticker never gets
         there, the hero is handed its finished state rather than left half-arrived. */
      setTimeout(finish, 4500);
    });
  }

  /* Backgrounded at any point: a paused ticker would hold the start state indefinitely. */
  document.addEventListener('visibilitychange', function () { if (document.hidden) finish(); });

  /* The first-visit tour covers the hero, so play once it has gone rather than underneath it.
     The attribute the tour sets on <html> is the signal, watched rather than hooked so every way
     the tour closes counts. Checked a frame after DOMContentLoaded, because tour.js decides
     whether to open in its own DOMContentLoaded listener, which runs after this file's. */
  document.addEventListener('DOMContentLoaded', function () {
    requestAnimationFrame(function () {
      var root = document.documentElement;
      if (!root.hasAttribute('data-tour')) { start(); return; }
      var mo = new MutationObserver(function () {
        if (root.hasAttribute('data-tour')) return;
        mo.disconnect();
        start();
      });
      mo.observe(root, { attributes: true, attributeFilter: ['data-tour'] });
      /* A tour left open is still a hero left hidden. Not forever. */
      setTimeout(function () { if (!started) { mo.disconnect(); finish(); } }, 45000);
    });
  });
})();

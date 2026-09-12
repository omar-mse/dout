/* dout — hero load-in
   The landing's first screen arrives in order: kicker, headline, the flag stamped on, the lede,
   the buttons, the three props thrown down beside the copy, and last the board taking its heat.
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
  var parts = q('.kicker, .hero__title, .hero__flag, .hero__lede, .hero__cta .btn, .prop');
  var done = false;
  var started = false;

  function settle() {
    if (done) return;
    done = true;
    /* Only what the tweens set. 'all' would also strip the props' own --r and --dy from the markup. */
    gsap.set(parts, { clearProps: 'transform,opacity' });
  }

  var tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out', duration: 0.7 }, onComplete: settle });
  tl.from(q('.kicker'), { y: 16, opacity: 0, duration: 0.45 })
    .from(q('.hero__title'), { y: 40, opacity: 0 }, '-=0.25')
    /* The flag is a stamp, so it lands rather than rises. */
    .from(q('.hero__flag'), { scale: 0.7, opacity: 0, ease: 'back.out(1.7)', duration: 0.5 }, '-=0.35')
    .from(q('.hero__lede'), { y: 24, opacity: 0 }, '-=0.3')
    /* opacity, not autoAlpha: the tour hands focus to the first button when it closes, and a
       button that is visibility:hidden for the length of a tween would refuse it. */
    .from(q('.hero__cta .btn'), { y: 16, opacity: 0, stagger: 0.08 }, '-=0.35')
    /* Each prop comes in from its own corner and settles onto the rotation the stylesheet gave it. */
    .from(q('.prop'), {
      x: function (i) { return [-48, 40, 56][i] || 0; },
      y: function (i) { return [-56, -40, 48][i] || 0; },
      opacity: 0, rotation: '+=14', stagger: 0.09, ease: 'back.out(1.4)', duration: 0.8
    }, '-=0.5')
    /* The board's heat wave is the same one it has always had (reveal() in ui.js); this only
       decides when it starts. Skipped when the sequence is jumped to its end, which leaves the
       board in its finished state, exactly as a page with no motion would have it. */
    .add(function () { ui.reveal(document.getElementById('preview')); }, '-=0.4');

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
      setTimeout(finish, 4000);
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

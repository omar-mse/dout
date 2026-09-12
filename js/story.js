/* dout — the landing story
   One scroll timeline over the story section: the room fills in, the stuck seats gather into the
   board's tiles as the tiles take their heat, and the board steps aside for the ranked list.

   Built only when motion is wanted, and only then is the section put into its live layout;
   everyone else gets the finished section the stylesheet already draws (see .story in
   styles.css). The class and the timeline are created in the same breath and torn down
   together, so there is no state in which the layout is live and nothing is driving it. */
(function () {
  var ui = window.MeTooUI;
  var section = document.querySelector('[data-story]');
  if (!section || !window.gsap || !window.ScrollTrigger || !ui || !ui.wantsMotion()) return;

  gsap.registerPlugin(ScrollTrigger);

  var room = section.querySelector('.room');
  var board = section.querySelector('.story__board');
  var rank = section.querySelector('.story__rank');
  var beats = section.querySelectorAll('.story__beat');
  var stuck = section.querySelectorAll('.room__seat[data-stuck]');
  var quiet = section.querySelectorAll('.room__seat:not([data-stuck])');
  var bars = section.querySelectorAll('.rankfig__bar i');
  if (!room || !board || !rank || beats.length < 4 || !stuck.length) return;

  /* How far a seat travels to land on its tile. Seat n goes to tile n mod 8, so the eight real
     tiles each collect two or three. Measured from layout positions (offsetLeft/Top, relative
     to .story__fig, the nearest positioned ancestor of both) rather than bounding boxes, so a
     seat already halfway there when the window is resized measures the same as one at rest.
     The board is painted by landing.js on DOMContentLoaded; these are read the first time the
     playhead reaches the flight and again on every refresh, never at build. */
  function travel(axis) {
    return function (i, seat) {
      var cells = board.querySelectorAll('.preview__cell:not(.preview__cell--empty)');
      var cell = cells.length ? cells[i % cells.length] : null;
      if (!cell) return 0;
      return axis === 'x'
        ? (cell.offsetLeft + cell.offsetWidth / 2) - (seat.offsetLeft + seat.offsetWidth / 2)
        : (cell.offsetTop + cell.offsetHeight / 2) - (seat.offsetTop + seat.offsetHeight / 2);
    };
  }

  var mm = gsap.matchMedia();
  mm.add({
    /* The stylesheet stacks the stage at 1100px and below; the two halves have to agree. */
    wide: '(min-width: 1101px)',
    narrow: '(max-width: 1100px)',
    reduce: '(prefers-reduced-motion: reduce)'
  }, function (ctx) {
    if (ctx.conditions.reduce) return;
    var wide = ctx.conditions.wide;

    section.classList.add('story--live');

    /* Start states live here rather than in the stylesheet: its resting state is the finished
       one, and these exist only while a timeline is alive to move them. matchMedia reverts
       every set and tween below when the condition stops matching. */
    gsap.set(room, { '--stuck-p': 0 });
    gsap.set(board, { '--heat-p': 0, opacity: 0, scale: 0.96 });
    gsap.set(rank, { opacity: 0 });
    gsap.set(bars, { scaleX: 0 });
    gsap.set([beats[1], beats[2], beats[3]], { opacity: 0, y: 12 });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true
      }
    });

    /* The beats share one grid cell, so a caption leaves entirely before the next arrives; a
       crossfade here paints two paragraphs over each other. */
    function swap(from, to, at) {
      tl.to(from, { opacity: 0, y: -12, duration: 0.16 }, at)
        .to(to, { opacity: 1, y: 0, duration: 0.16 }, at + 0.2);
    }

    /* Beat 1: the room as it is. The stylesheet turns --stuck-p into a wave across the seats. */
    tl.to(room, { '--stuck-p': 1, duration: 1 }, 0);
    swap(beats[0], beats[1], 0.78);
    /* Beat 2: the seats gather into the board and the board takes its heat. */
    tl.to(board, { opacity: 1, scale: 1, duration: 0.25 }, 1.2)
      .to(quiet, { opacity: 0, duration: 0.3 }, 1.3)
      .fromTo(stuck, { x: 0, y: 0, scale: 1 }, {
        x: travel('x'), y: travel('y'), scale: 0.35, ease: 'power2.in', duration: 1
      }, 1.4)
      .to(stuck, { opacity: 0, duration: 0.25 }, 2.15)
      .to(board, { '--heat-p': 1, duration: 0.9 }, 1.9);
    swap(beats[1], beats[2], 1.62);
    /* Beat 3: the board steps aside and the dashboard's ranking grows in. On one column there
       is no aside to step to, so the board gives way instead. */
    tl.to(board, wide ? { xPercent: -34, scale: 0.82, duration: 0.5 } : { opacity: 0, scale: 0.9, duration: 0.4 }, 3.0)
      .to(rank, { opacity: 1, duration: 0.3 }, 3.1)
      .to(bars, { scaleX: 1, stagger: 0.12, duration: 0.5, ease: 'power2.out' }, 3.2);
    swap(beats[2], beats[3], 2.84);
    /* A beat of rest at the end, so the finished frame is seen before the stage lets go. */
    tl.to({}, { duration: 0.4 }, 3.7);

    return function () { section.classList.remove('story--live'); };
  });

  /* Positions shift when the board is painted or repainted and when the display face lands;
     a resize is handled by ScrollTrigger itself. */
  document.addEventListener('metoo:change', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();

/* dout — landing: the live heat boards (the hero's 3×3 and the story's) fed from the store. */
(function () {
  var store = window.MeTooStore;
  var ui = window.MeTooUI;

  /* One subject, not a mix. Eight unlabelled tiles from five different classes would read as
     one room that is stuck on everything at once, which is the opposite of the point. The
     busiest board is the honest pick, and the caption names it. */
  function busiest() {
    return store.subjects().reduce(function (best, s) {
      return !best || s.meToos > best.meToos ? s : best;
    }, null);
  }

  var revealed = false;

  function render() {
    var grids = document.querySelectorAll('[data-live-board]');
    if (!grids.length) return;
    var subject = busiest();
    if (subject) store.setSubject(subject.id);
    var doubts = store.getDoubts().sort(function (a, b) { return b.count - a.count; });
    var max = store.maxCount(doubts);
    var top = doubts.slice(0, 8);
    /* --i is the cell's place in the entrance wave, so the board develops in reading order. */
    var html = top.map(function (d, i) {
      var cls = d.answered ? 'tile--answered' : (store.heatStep(d.count, max) ? 'tile--h' + store.heatStep(d.count, max) : '');
      var head = d.answered
        ? '<span class="preview__count preview__count--word">Answered</span>'
        : '<span class="preview__count">' + store.formatCount(d.count) + '</span>';
      return '<div class="preview__cell ' + cls + '" style="--i:' + i + '">' + head + '<span class="preview__label" dir="auto">' + ui.esc(d.text) + '</span></div>';
    }).join('');
    var n = top.length;
    while (n < 8) { html += '<div class="preview__cell" style="--i:' + n + '"></div>'; n += 1; }
    var href = subject ? 'feed.html?subject=' + encodeURIComponent(subject.id) + '#ask' : 'feed.html#ask';
    html += '<a class="preview__cell preview__cell--empty" href="' + href + '" style="--i:8;text-decoration:none;color:inherit">Your<br>doubt</a>';
    grids.forEach(function (grid) { grid.innerHTML = html; });
    /* Only the first paint earns the entrance, and only the hero's board gets one: the story's
       takes its heat from the scroll (js/story.js). When js/hero.js is live it fires the reveal
       itself at the right beat of the load-in. A repaint driven by another tab's me too must
       not blank the board and replay it, the same rule the feed grid follows. */
    if (!revealed) {
      revealed = true;
      var hero = document.getElementById('preview');
      if (hero && !window.DoutHero) ui.reveal(hero);
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('metoo:change', render);
})();

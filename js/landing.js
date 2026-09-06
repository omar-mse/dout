/* dout — landing: live 3×3 heat preview fed from the store. */
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

  function render() {
    var grid = document.getElementById('preview');
    if (!grid) return;
    var subject = busiest();
    if (subject) store.setSubject(subject.id);
    var doubts = store.getDoubts().sort(function (a, b) { return b.count - a.count; });
    var max = store.maxCount(doubts);
    var top = doubts.slice(0, 8);
    var html = top.map(function (d) {
      var cls = d.answered ? 'tile--answered' : (store.heatStep(d.count, max) ? 'tile--h' + store.heatStep(d.count, max) : '');
      var head = d.answered
        ? '<span class="preview__count preview__count--word">Answered</span>'
        : '<span class="preview__count">' + store.formatCount(d.count) + '</span>';
      return '<div class="preview__cell ' + cls + '">' + head + '<span class="preview__label" dir="auto">' + ui.esc(d.text) + '</span></div>';
    }).join('');
    while (top.length < 8) { html += '<div class="preview__cell"></div>'; top.push(null); }
    var href = subject ? 'feed.html?subject=' + encodeURIComponent(subject.id) + '#ask' : 'feed.html#ask';
    html += '<a class="preview__cell preview__cell--empty" href="' + href + '" style="text-decoration:none;color:inherit">Your<br>doubt</a>';
    grid.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('metoo:change', render);
})();

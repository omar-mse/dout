/* dout — professor: per-subject gate + dashboard.
   A professor picks their subject and opens it. There is no password, because there is nothing
   to authenticate against in a demo that lives in one browser, and a fake lock would claim a
   protection this build cannot provide; the gate says so in a sentence. The session still
   remembers which subject was opened, never a blanket "logged in", so the dashboard can only
   ever show the one class that was chosen. */
(function () {
  var SESSION_KEY = 'metoo.prof.subject';
  var store = window.MeTooStore;
  var ui = window.MeTooUI;
  var openReply = {};
  var gateSelect = null;

  /* The unlocked subject id, or '' — validated against the timetable on the way out of
     storage, so a hand-edited session key opens nothing. */
  function unlocked() {
    var id;
    try { id = sessionStorage.getItem(SESSION_KEY); } catch (e) { return ''; }
    return store.isSubject(id) ? id : '';
  }
  function setUnlocked(id) {
    try { id ? sessionStorage.setItem(SESSION_KEY, id) : sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }

  /* Hiding the panel that currently holds focus strands the keyboard on nothing, so every
     swap between gate and dashboard hands focus to the heading or field that now matters. */
  function show(moveFocus) {
    var gate = document.getElementById('gate');
    var dash = document.getElementById('dash-root');
    var id = unlocked();
    gate.hidden = !!id;
    dash.hidden = !id;
    /* The head script stamps this before first paint so the gate never flashes ahead of a
       dashboard. Keep it in step from here, or locking would leave the gate hidden by CSS
       that JS no longer agrees with. */
    if (id) document.documentElement.setAttribute('data-prof', 'open');
    else document.documentElement.removeAttribute('data-prof');
    if (id) {
      store.setSubject(id);
      render();
      if (moveFocus) document.getElementById('dash-title').focus();
    } else {
      /* Locking has to take the subject out of the tab title too. Leaving "BIOL" up there
         after the dashboard is closed tells the next person at the machine which class this
         key opens, which is the one thing locking was supposed to put away. */
      document.title = 'dout · For professors';
      if (moveFocus && gateSelect) gateSelect.focus();
    }
  }

  /* Opening the dashboard replaces the whole screen: the gate's one paragraph becomes a ranked
     board. The rows arrive in the order they are ranked, which is the order they matter in — the
     professor watches the class's worst-understood question land first.

     One motion, not two. A view transition across the swap was the reflex and it was wrong: it
     crossfades the whole page in, and then the stagger plays over rows that have already
     arrived, so every row animates twice. The stagger is the reveal; the swap underneath it is
     instant. An addition to a dashboard that is already there and already focused — no API, a
     hidden tab, or reduced motion simply skips it. */
  function revealDash() {
    show(true);
    if (!ui.wantsMotion()) return;
    var items = document.querySelectorAll('#stats .stat, #ranked .row, #ranked .ranked-empty');
    for (var i = 0; i < items.length && i < 14; i += 1) {
      if (!items[i].animate) break;
      items[i].animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 440, delay: i * 45, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' });
    }
  }

  function rowHtml(d, max) {
    /* One runaway doubt rounds every other bar to 0% and the column reads as empty rows.
       Anything with a count keeps a visible sliver, so the bar never lies about having none. */
    var pct = max && d.count ? Math.max(2, Math.round((d.count / max) * 100)) : 0;
    var replyOpen = !!openReply[d.id];
    var replyBlock = '';
    if (replyOpen) {
      replyBlock = '<div class="row__reply">' +
        '<label class="sr-only" for="reply-' + d.id + '">Reply to this doubt</label>' +
        '<textarea id="reply-' + d.id + '" data-reply-input="' + d.id + '" dir="auto" maxlength="' + store.MAX_REPLY + '" placeholder="Re-explain it in two lines. Students see this under the doubt.">' + ui.esc(d.reply) + '</textarea>' +
        '<div class="row__reply-actions">' +
          '<button type="button" class="btn btn--primary btn--sm" data-save-reply="' + d.id + '">Save reply &amp; mark answered</button>' +
          '<button type="button" class="btn btn--sm" data-cancel-reply="' + d.id + '">Cancel</button>' +
        '</div></div>';
    } else if (d.reply) {
      replyBlock = '<div class="reply" dir="auto"><strong>Your reply:</strong> ' + ui.esc(d.reply) + '</div>';
    }
    /* Writing a reply is the act that reaches students; marking answered only closes the row.
       The filled button used to be "Mark answered", so the fastest path through the dashboard
       was the one that told the room nothing. Reply carries the weight now. */
    var answerBtn = d.answered
      ? '<button type="button" class="btn btn--sm" data-reopen="' + d.id + '">Reopen</button>'
      : '<button type="button" class="btn btn--sm" data-answered="' + d.id + '">Mark answered</button>';
    /* Primary only while the row still needs an answer. An answered row is already yellow, so a
       yellow button on it reads as one flat field; and editing a reply that exists is not the
       thing this dashboard should be pushing anyone toward. */
    var replyBtn = replyOpen ? '' : '<button type="button" class="btn btn--sm' + (d.answered ? '' : ' btn--primary') + '" data-open-reply="' + d.id + '">' + (d.reply ? 'Edit reply' : 'Reply') + '</button>';
    return '<article class="row' + (d.answered ? ' row--answered' : '') + '" data-id="' + d.id + '">' +
      '<div class="row__count">' + store.formatCount(d.count) + '<small>me too</small></div>' +
      '<div class="row__body">' +
        '<p class="row__text" dir="auto">' + ui.esc(d.text) + '</p>' +
        '<div class="row__heat" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
        replyBlock +
        '<div class="row__actions">' +
          replyBtn + answerBtn +
          '<label class="check"><input type="checkbox" data-cover="' + d.id + '"' + (d.toCover ? ' checked' : '') + '> Cover next class</label>' +
          (d.answered ? '<span class="tag">Answered</span>' : '') +
        '</div>' +
      '</div></article>';
  }

  function agendaText(items) {
    var meta = store.getMeta();
    return meta.title + ' · re-explain next class\n' + items.map(function (d, i) {
      return (i + 1) + '. ' + d.text + ' (' + d.count + ' me too)';
    }).join('\n');
  }

  /* Every repaint of the ranked list goes through a FLIP: measure where each row was, paint,
     put each row back with a transform and release it. A reply box opening pushes the rows
     under it down as a slide rather than a jump; closing it slides them back; a reopened doubt
     climbing the ranking is seen climbing. First paint has nothing to measure and paints
     straight, as does a hidden tab or a professor who asked for less motion. */
  function render() {
    var ranked = document.getElementById('ranked');
    if (!ranked || !ui.wantsMotion()) { paint(); return; }
    var before = Object.create(null);
    ranked.querySelectorAll('.row[data-id]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      before[el.dataset.id] = r.top;
    });
    paint();
    ranked.querySelectorAll('.row[data-id]').forEach(function (el) {
      var was = before[el.dataset.id];
      if (was === undefined || !el.animate) return;
      var dy = was - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    });
  }

  /* The box is new DOM on every open, so it arrives rather than pops. */
  function arrive(el) {
    if (!el || !el.animate || !ui.wantsMotion()) return;
    el.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
      { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  }

  /* The colour arrives: tile to yellow over the row, then the class comes off so no finished
     animation is left declared over it. Only when someone is looking, for the usual reason. */
  function settleAnswered(id) {
    var row = document.querySelector('#ranked .row[data-id="' + id + '"]');
    if (!row || !ui.wantsMotion()) return;
    row.classList.add('is-just-answered');
    setTimeout(function () { row.classList.remove('is-just-answered'); }, 320);
  }

  function paint() {
    var meta = store.getMeta();
    document.title = 'dout · ' + meta.title;
    document.getElementById('course').textContent = meta.code + ' · ' + meta.professor;
    document.getElementById('dash-title').textContent = meta.name;

    var doubts = store.getDoubts().sort(function (a, b) { return b.count - a.count || b.createdAt - a.createdAt; });
    var max = store.maxCount(doubts);
    var open = doubts.filter(function (d) { return !d.answered; }).length;
    var totalMeToos = doubts.reduce(function (n, d) { return n + d.count; }, 0);
    var answered = doubts.length - open;

    document.getElementById('stats').innerHTML =
      '<div class="stat stat--hue"><strong>' + store.formatCount(open) + '</strong><span>Open doubts</span></div>' +
      '<div class="stat"><strong>' + store.formatCount(totalMeToos) + '</strong><span>Me toos in this subject</span></div>' +
      '<div class="stat"><strong>' + store.formatCount(answered) + '</strong><span>Answered</span></div>';

    /* A lecture nobody asked about is a real state, not a bug. Say which of the two it is. */
    document.getElementById('ranked').innerHTML = doubts.length
      ? doubts.map(function (d) { return rowHtml(d, max); }).join('')
      : '<div class="ranked-empty">' +
          '<h3>No doubts yet</h3>' +
          '<p>Nothing has been posted for ' + ui.esc(meta.code) + '. As soon as a student asks, it appears here ranked by how many classmates tapped Me too.</p>' +
        '</div>';

    var cover = doubts.filter(function (d) { return d.toCover; });
    var agenda = document.getElementById('agenda');
    if (!cover.length) {
      agenda.innerHTML = '<div class="agenda__empty">Nothing ticked yet.</div>';
    } else {
      agenda.innerHTML = '<ol>' + cover.map(function (d) {
        return '<li dir="auto" data-id="' + d.id + '">' + ui.esc(d.text) + ' <span class="agenda__meta">· ' + store.formatCount(d.count) + ' me too</span></li>';
      }).join('') + '</ol>';
    }
    document.getElementById('copy-btn').disabled = !cover.length;
  }

  /* The clipboard is refused often enough (insecure origin, denied permission, no focus)
     that a blanket "Copied." would be a lie. Only claim it when the write actually landed. */
  function copyAgenda() {
    var cover = store.getDoubts().filter(function (d) { return d.toCover; }).sort(function (a, b) { return b.count - a.count; });
    if (!cover.length) return;
    var text = agendaText(cover);
    function ok() { ui.toast('Agenda copied.'); }
    function failed() { ui.toast('Copy was blocked. Select the list and copy it by hand.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () {
        if (fallbackCopy(text)) ok(); else failed();
      });
    } else if (fallbackCopy(text)) { ok(); } else { failed(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    var done = false;
    try { done = document.execCommand('copy'); } catch (e) { done = false; }
    document.body.removeChild(ta);
    return done;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('gate-form');
    gateSelect = document.getElementById('subject');

    /* Code and name only. A select clips its option text rather than wrapping it, and adding
       the professor's name pushed the subject itself off the right edge of the field on
       anything narrower than a laptop. The name they log in as is on the dashboard anyway. */
    gateSelect.innerHTML = store.subjects().map(function (s) {
      return '<option value="' + ui.esc(s.id) + '">' + ui.esc(s.code + ' · ' + s.name) + '</option>';
    }).join('');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = gateSelect.value;
      if (!store.isSubject(id)) return;
      setUnlocked(id);
      store.setSubject(id);
      revealDash();
      ui.toast(store.getMeta().code + ' dashboard open.');
    });

    document.getElementById('logout-btn').addEventListener('click', function () {
      setUnlocked('');
      show(true);
    });

    /* Reset used to be one click, no confirm, no undo, sitting first in the header beside Lock.
       It is now a two-step at the foot of the page with an eight-second way back: ask, then do,
       then let them change their mind. The confirm retires itself so it never sits there armed. */
    var resetBtn = document.getElementById('reset-btn');
    var resetConfirm = document.getElementById('reset-confirm');
    var resetYes = document.getElementById('reset-yes');
    var resetNo = document.getElementById('reset-no');
    var armTimer = null;

    function armReset(on) {
      clearTimeout(armTimer);
      resetBtn.hidden = on;
      resetConfirm.hidden = !on;
      if (on) {
        /* Name the board being wiped. Four other subjects are one dropdown away, and
           "lose every reply?" does not say which room's replies. */
        document.getElementById('reset-q').textContent = 'Reset ' + store.getMeta().code + ' and lose every reply?';
        resetYes.focus();
        /* Left alone, it disarms rather than waiting to be clicked by accident later. */
        armTimer = setTimeout(function () { armReset(false); }, 12000);
      }
    }

    resetBtn.addEventListener('click', function () { armReset(true); });
    resetNo.addEventListener('click', function () { armReset(false); resetBtn.focus(); });
    resetYes.addEventListener('click', function () {
      var before = store.snapshot();
      store.resetSubject();
      openReply = {};
      render();
      armReset(false);
      resetBtn.focus();
      ui.toast(store.getMeta().code + ' reset to demo data.', before && {
        label: 'Undo',
        onClick: function () {
          if (store.restore(before)) { openReply = {}; render(); ui.toast('Reset undone.'); }
          else ui.toast('Could not undo that reset.');
        }
      });
    });

    /* Escape is the ordinary way out of an armed destructive prompt. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !resetConfirm.hidden) { armReset(false); resetBtn.focus(); }
    });

    document.getElementById('copy-btn').addEventListener('click', copyAgenda);

    var ranked = document.getElementById('ranked');
    ranked.addEventListener('click', function (e) {
      var t = e.target.closest('[data-open-reply],[data-cancel-reply],[data-save-reply],[data-answered],[data-reopen]');
      if (!t) return;
      if (t.dataset.openReply) {
        openReply[t.dataset.openReply] = true;
        render();
        var field = document.getElementById('reply-' + t.dataset.openReply);
        arrive(field && field.closest('.row__reply'));
        if (field) field.focus();
      }
      else if (t.dataset.cancelReply) {
        var cancelled = t.dataset.cancelReply;
        delete openReply[cancelled];
        render();
        /* Cancel destroys the button that was focused. Put focus back on the row it belonged to. */
        var back = ranked.querySelector('[data-open-reply="' + cancelled + '"]');
        if (back) back.focus();
      }
      else if (t.dataset.saveReply) {
        var id = t.dataset.saveReply;
        var input = document.querySelector('[data-reply-input="' + id + '"]');
        var text = input ? input.value.trim() : '';
        if (!text) {
          ui.toast('Write a reply first.');
          if (input) input.focus();
          return;
        }
        store.reply(id, text);
        delete openReply[id];
        render();
        settleAnswered(id);
        var saved = ranked.querySelector('[data-open-reply="' + id + '"]');
        if (saved) saved.focus();
        ui.toast('Reply posted. Students see it now.');
      }
      else if (t.dataset.answered) {
        store.setAnswered(t.dataset.answered, true);
        render();
        settleAnswered(t.dataset.answered);
        /* The professor should know what the room actually sees, since it is not their words. */
        var marked = store.getDoubts().filter(function (x) { return x.id === t.dataset.answered; })[0];
        ui.toast(marked && marked.reply ? 'Marked answered.' : 'Marked answered. Students see "covered in class".');
      }
      else if (t.dataset.reopen) { store.setAnswered(t.dataset.reopen, false); render(); ui.toast('Reopened.'); }
    });
    ranked.addEventListener('change', function (e) {
      var cb = e.target.closest('[data-cover]');
      if (!cb) return;
      store.setCover(cb.dataset.cover, cb.checked);
      render();
      /* The tick happens in the ranked column and the result lands in a panel on the other
         side of the page, so without this the only acknowledgement is a list the professor
         is not looking at silently gaining a row. */
      if (cb.checked) {
        var landed = document.querySelector('#agenda li[data-id="' + cb.dataset.cover + '"]');
        if (landed) landed.classList.add('is-added');
      }
    });

    /* A student asked in another tab while the dashboard sat open. Repaint, but never blow
       away a reply that is half-typed. */
    document.addEventListener('metoo:change', function (e) {
      if (!e.detail || !e.detail.external) return;
      if (!unlocked()) return;
      var typing = document.activeElement;
      if (typing && typing.hasAttribute && typing.hasAttribute('data-reply-input')) return;
      render();
    });

    show(false);
  });
})();

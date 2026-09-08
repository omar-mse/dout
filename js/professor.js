/* dout — professor: per-subject gate + dashboard.
   A professor picks their subject and types its name as the password. The session remembers
   which subject was unlocked, never a blanket "logged in", so the dashboard can only ever
   show the one class that key opens. */
(function () {
  var SESSION_KEY = 'metoo.prof.subject';
  var store = window.MeTooStore;
  var ui = window.MeTooUI;
  var openReply = {};
  var gateInput = null;
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
    if (id) {
      store.setSubject(id);
      render();
      if (moveFocus) document.getElementById('dash-title').focus();
    } else {
      /* Locking has to take the subject out of the tab title too. Leaving "BIOL" up there
         after the dashboard is closed tells the next person at the machine which class this
         key opens, which is the one thing locking was supposed to put away. */
      document.title = 'dout — For professors';
      if (moveFocus && gateSelect) gateSelect.focus();
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

  function render() {
    var meta = store.getMeta();
    document.title = 'dout — ' + meta.title;
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
    var error = document.getElementById('gate-error');
    var hintEl = document.getElementById('password-hint');
    gateInput = document.getElementById('password');
    gateSelect = document.getElementById('subject');

    /* Code and name only. A select clips its option text rather than wrapping it, and adding
       the professor's name pushed the subject itself off the right edge of the field on
       anything narrower than a laptop. The name they log in as is on the dashboard anyway. */
    gateSelect.innerHTML = store.subjects().map(function (s) {
      return '<option value="' + ui.esc(s.id) + '">' + ui.esc(s.code + ' · ' + s.name) + '</option>';
    }).join('');

    /* The password is the selected subject's own name, so the hint has to follow the dropdown.
       A hint frozen on the first subject is worse than no hint: it teaches the wrong key. */
    function syncHint() {
      hintEl.innerHTML = '<span aria-hidden="true">→</span> The password is the subject name: <code>' +
        ui.esc(store.passwordHint(gateSelect.value)) + '</code>';
    }
    gateSelect.addEventListener('change', function () {
      syncHint();
      error.textContent = '';
    });
    syncHint();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = gateSelect.value;
      if (store.checkPassword(id, gateInput.value)) {
        setUnlocked(id);
        store.setSubject(id);
        error.textContent = '';
        gateInput.value = '';
        show(true);
        ui.toast(store.getMeta().code + ' dashboard open.');
      } else {
        /* Naming the subject they picked matters here: the commonest miss is the right
           password typed against the wrong class in the dropdown. */
        error.textContent = 'That is not the password for ' + store.subjects().filter(function (s) { return s.id === id; }).map(function (s) { return s.code; })[0] + '. The hint is right under the box.';
        form.classList.remove('is-shaking');
        void form.offsetWidth;
        form.classList.add('is-shaking');
        gateInput.select();
      }
    });

    document.getElementById('logout-btn').addEventListener('click', function () {
      setUnlocked('');
      gateInput.value = '';
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
        var saved = ranked.querySelector('[data-open-reply="' + id + '"]');
        if (saved) saved.focus();
        ui.toast('Reply posted. Students see it now.');
      }
      else if (t.dataset.answered) {
        store.setAnswered(t.dataset.answered, true);
        render();
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

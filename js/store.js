/* dout — local store
   Everything lives in this browser's localStorage under one key.
   The board is split by subject: five subjects, each with its own doubts and its own
   me too record. Seeded on first load so judges see live boards immediately.

   localStorage is user-writable, shared across tabs, and can vanish or refuse writes
   at any moment. Nothing read back from it is trusted: every record is normalised into
   the shape the UI expects before a single tile is drawn. */
(function () {
  var KEY = 'metoo.v3';
  var MIN = 60 * 1000;

  var MAX_TEXT = 240;    /* a doubt is one question, not an essay */
  var MAX_REPLY = 600;   /* the professor re-explains in two lines, not a lecture */
  var MAX_DOUBTS = 400;  /* one subject's ceiling; also keeps us inside the storage quota */
  var MAX_COUNT = 999999;

  /* The five subjects are fixed: this is a semester's timetable, not user content, so it lives
     in code rather than storage. The password is the subject name in plain words, matched
     case- and space-insensitively, because a professor typing their own subject should not
     have to guess our punctuation. */
  var SUBJECTS = [
    { id: 'cs201', code: 'CSCI', name: 'Data Structures',  professor: 'Prof. Rahman' },
    { id: 'ma102', code: 'MATH', name: 'Calculus II',      professor: 'Prof. Iyer' },
    { id: 'bi130', code: 'BIOL', name: 'Cell Biology',     professor: 'Prof. Okafor' },
    { id: 'ec220', code: 'ECON', name: 'Microeconomics',   professor: 'Prof. Lindqvist' },
    { id: 'ps101', code: 'PSYC', name: 'Intro Psychology', professor: 'Prof. Navarro' }
  ];

  var byId = Object.create(null);
  SUBJECTS.forEach(function (s) { byId[s.id] = s; });

  function isSubject(id) {
    return !!(id && byId[String(id)]);
  }

  /* "Data Structures", "data structures" and "  DATA  STRUCTURES " are the same answer. */
  function fold(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function seedDoubts(id, now) {
    var m = MIN;
    if (id === 'cs201') return [
      { id: 'cs1',  text: 'What is the difference between load factor and capacity? The slide used them like the same thing.', count: 31, createdAt: now - 21 * m },
      { id: 'cs2',  text: 'Can someone re-explain the accounting method? I lost it after the first example.', count: 27, createdAt: now - 14 * m },
      { id: 'cs3',  text: 'Why is push on a dynamic array O(1) amortized when a resize copies every element? Where does that cost go?', count: 23, createdAt: now - 33 * m },
      { id: 'cs4',  text: 'When two keys collide, does chaining add the new key at the head or the tail of the list? Does it matter?', count: 17, createdAt: now - 6 * m },
      { id: 'cs5',  text: 'Why do we resize at 0.75 load and not 1.0? Who picked 0.75?', count: 14, createdAt: now - 9 * m },
      { id: 'cs6',  text: 'Is open addressing always faster than chaining, or only when the table is mostly empty?', count: 9, createdAt: now - 40 * m },
      { id: 'cs7',  text: 'Do Python dicts use chaining or open addressing?', count: 6, createdAt: now - 60 * m, answered: true, reply: 'Open addressing with a perturbation probe. We will trace it on Thursday.' },
      { id: 'cs8',  text: 'What happens to the hash of a string if the string is mutated after insertion?', count: 4, createdAt: now - 52 * m },
      { id: 'cs9',  text: 'In the amortized analysis slide the potential function changed halfway through the proof, from 2n minus capacity to something else. Was that a different function, or did I miss the step where capacity doubled and the potential reset to zero?', count: 19, createdAt: now - 27 * m },
      { id: 'cs10', text: 'Is a collision a bug?', count: 12, createdAt: now - 11 * m },
      { id: 'cs11', text: 'If two different strings land in the same bucket, does a lookup compare the full strings every time or only the hashes? That sounds like it could get slow.', count: 11, createdAt: now - 18 * m },
      { id: 'cs12', text: 'What is a probe?', count: 8, createdAt: now - 4 * m },
      { id: 'cs13', text: 'Mutable keys: allowed or not?', count: 5, createdAt: now - 36 * m }
    ];
    if (id === 'ma102') return [
      { id: 'ma1', text: 'Why does the integral test need the function to be decreasing? What actually breaks if it is not?', count: 24, createdAt: now - 26 * m },
      { id: 'ma2', text: 'I do not understand the difference between conditional and absolute convergence. Is one just a stronger version of the other?', count: 21, createdAt: now - 12 * m },
      { id: 'ma3', text: 'How do you know which part to pick as u in integration by parts? I pick wrong every single time.', count: 18, createdAt: now - 31 * m },
      { id: 'ma4', text: 'Radius of convergence: do the endpoints always have to be tested one at a time, or is there a shortcut?', count: 13, createdAt: now - 7 * m },
      { id: 'ma5', text: 'In the washer method, when do you integrate with respect to y instead of x?', count: 9, createdAt: now - 44 * m },
      { id: 'ma6', text: 'What is the Taylor remainder actually bounding, the error at one point or over the whole interval?', count: 7, createdAt: now - 19 * m },
      { id: 'ma7', text: 'Why is the harmonic series divergent when the terms go to zero? That still feels wrong.', count: 6, createdAt: now - 58 * m, answered: true, reply: 'Terms going to zero is necessary but not sufficient. Group them in blocks of 2, 4, 8: every block sums to at least one half, so the total grows without bound.' },
      { id: 'ma8', text: 'Can you use L’Hopital directly on zero times infinity, or does it have to be rewritten first?', count: 4, createdAt: now - 3 * m }
    ];
    if (id === 'bi130') return [
      { id: 'bi1', text: 'What is the actual difference between facilitated diffusion and active transport if both of them use proteins?', count: 19, createdAt: now - 16 * m },
      { id: 'bi2', text: 'In the electron transport chain, where does the energy in the proton gradient physically go?', count: 15, createdAt: now - 29 * m },
      { id: 'bi3', text: 'Why does the cell bother making ATP instead of just using glucose directly?', count: 11, createdAt: now - 8 * m },
      { id: 'bi4', text: 'Do all cells have the same number of mitochondria? The slide said it varies but not what decides it.', count: 8, createdAt: now - 47 * m },
      { id: 'bi5', text: 'Is the Golgi before or after the ER in the pathway? I keep flipping the two around.', count: 6, createdAt: now - 5 * m },
      { id: 'bi6', text: 'What happens to a cell if a lysosome membrane ruptures?', count: 3, createdAt: now - 22 * m }
    ];
    if (id === 'ec220') return [
      { id: 'ec1', text: 'Why is marginal cost the supply curve only above average variable cost, and not below it?', count: 16, createdAt: now - 13 * m },
      { id: 'ec2', text: 'Deadweight loss: is that money that disappears, or money that just moves to somebody else?', count: 12, createdAt: now - 35 * m },
      { id: 'ec3', text: 'What is the difference between a shift in demand and a movement along it? The coffee example lost me.', count: 9, createdAt: now - 2 * m },
      { id: 'ec4', text: 'If a monopoly sets the price, why does it not just charge an enormous amount?', count: 5, createdAt: now - 51 * m }
    ];
    if (id === 'ps101') return [
      { id: 'ps1', text: 'Is "correlation is not causation" only about experiments, or does it apply to the survey studies too?', count: 3, createdAt: now - 17 * m }
    ];
    return [];
  }

  function seedBoard(id) {
    var now = Date.now();
    return {
      meToos: [],
      doubts: seedDoubts(id, now).map(function (d) {
        return {
          id: d.id,
          text: d.text,
          count: d.count,
          createdAt: d.createdAt,
          answered: !!d.answered,
          reply: d.reply || '',
          mine: false,
          toCover: false
        };
      })
    };
  }

  function seed() {
    var boards = {};
    SUBJECTS.forEach(function (s) { boards[s.id] = seedBoard(s.id); });
    return { boards: boards };
  }

  /* ---------- coercion helpers ---------- */

  /* Slice on code points, never UTF-16 units: cutting a surrogate pair in half turns the
     last emoji of a doubt into a replacement glyph. */
  function cut(value, max) {
    var s = String(value == null ? '' : value);
    if (s.length <= max) return s;
    var chars = Array.prototype.slice.call(s);
    return chars.length <= max ? s : chars.slice(0, max).join('');
  }

  function oneLine(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function clampInt(value, lo, hi) {
    var n = Math.floor(Number(value));
    if (!isFinite(n)) return lo;
    return n < lo ? lo : n > hi ? hi : n;
  }

  function validTime(value) {
    var n = Number(value);
    /* Nothing before 2000 and nothing from the future: a bad clock or a hand-edited record
       must not produce "in -4 min" or a doubt that sorts above everything forever. */
    if (!isFinite(n) || n < 946684800000) return Date.now();
    return Math.min(n, Date.now());
  }

  /* Ids reach the DOM inside attribute values and selectors. Anything outside this set is
     dropped rather than escaped, so a hand-written localStorage record cannot break out. */
  function safeId(value) {
    var id = String(value == null ? '' : value).replace(/[^A-Za-z0-9_-]/g, '');
    return id.slice(0, 40);
  }

  function uid() {
    return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------- state ---------- */

  var state = null;
  var recovered = false;   /* we had to repair or drop something on the way in */
  var saveFailed = false;  /* the browser refused a write after we had already started */
  var currentId = SUBJECTS[0].id;

  function normalizeBoard(raw) {
    var seen = Object.create(null);
    var doubts = [];
    var dropped = false;

    (Array.isArray(raw && raw.doubts) ? raw.doubts : []).forEach(function (d) {
      if (doubts.length >= MAX_DOUBTS) { dropped = true; return; }
      if (!d || typeof d !== 'object') { dropped = true; return; }
      var text = cut(oneLine(d.text), MAX_TEXT);
      if (!text) { dropped = true; return; }
      var id = safeId(d.id);
      if (!id || seen[id]) { id = uid(); dropped = true; }
      seen[id] = true;
      doubts.push({
        id: id,
        text: text,
        count: clampInt(d.count, 0, MAX_COUNT),
        createdAt: validTime(d.createdAt),
        answered: !!d.answered,
        reply: cut(String(d.reply == null ? '' : d.reply).trim(), MAX_REPLY),
        mine: !!d.mine,
        toCover: !!d.toCover
      });
    });

    /* A me too that points at nothing is a phantom vote: it would keep the button pressed
       on a doubt that no longer exists, or on nothing at all. */
    var meToos = [];
    if (Array.isArray(raw && raw.meToos)) {
      raw.meToos.forEach(function (v) {
        var id = safeId(v);
        if (id && seen[id] && meToos.indexOf(id) === -1) meToos.push(id);
        else dropped = true;
      });
    } else if (raw && raw.meToos != null) {
      dropped = true;
    }

    if (dropped) recovered = true;
    return { meToos: meToos, doubts: doubts };
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !raw.boards || typeof raw.boards !== 'object') return null;
    var boards = {};
    var any = false;
    SUBJECTS.forEach(function (s) {
      var stored = raw.boards[s.id];
      if (stored && typeof stored === 'object') {
        boards[s.id] = normalizeBoard(stored);
        any = true;
      } else {
        /* A subject added to the timetable since this browser last saved. Seed it rather
           than showing an empty board the room was never given a chance to fill. */
        boards[s.id] = seedBoard(s.id);
      }
    });
    if (!any) return null;
    return { boards: boards };
  }

  function load() {
    if (state) return state;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var clean = normalize(JSON.parse(raw));
        if (clean) {
          state = clean;
          /* Write the repaired board straight back, so the damaged record is fixed once
             instead of being re-repaired on every page load. */
          if (recovered) save();
          return state;
        }
        /* Parsed, but not a set of boards. Treat it as gone rather than half-trusting it. */
        recovered = true;
      }
    } catch (e) {
      /* Unreadable or unparseable storage. Fall through to fresh boards. */
      recovered = true;
    }
    state = seed();
    save();
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      saveFailed = false;
    } catch (e) {
      /* Quota exhausted or storage blocked mid-session. The board keeps working from memory;
         the feed says so rather than pretending the write landed. */
      saveFailed = true;
    }
    document.dispatchEvent(new CustomEvent('metoo:change'));
  }

  function board(id) {
    var s = load();
    return s.boards[isSubject(id) ? id : currentId];
  }

  function find(id) {
    id = safeId(id);
    if (!id) return null;
    var doubts = board().doubts;
    for (var i = 0; i < doubts.length; i += 1) {
      if (doubts[i].id === id) return doubts[i];
    }
    return null;
  }

  function maxCount(doubts) {
    return doubts.reduce(function (m, d) { return d.count > m ? d.count : m; }, 0);
  }

  function statsFor(id) {
    var b = board(id);
    var open = 0, answered = 0, meToos = 0;
    b.doubts.forEach(function (d) {
      if (d.answered) answered += 1; else open += 1;
      meToos += d.count;
    });
    return { open: open, answered: answered, meToos: meToos, total: b.doubts.length };
  }

  /* Heat step 0-5: how much of the room this doubt has lost.

     Relative to the hottest doubt in the same subject, but floored on the raw count as well.
     A purely relative scale makes the leader step 5 no matter what, so the first doubt of a
     subject with one me too painted the biggest, darkest tile on the board under a legend
     claiming the room was stuck on it. One person is not the room. A band now needs both a
     share of the leader and a real number behind it, so a young board starts small and pale
     and grows into its own scale as the room fills in. */
  var FLOOR = { 5: 8, 4: 5, 3: 3, 2: 2 };

  function heatStep(count, max) {
    if (!count || !max) return 0;
    var r = count / max;
    if (r >= 0.999 && count >= FLOOR[5]) return 5;
    if (r > 0.75 && count >= FLOOR[4]) return 4;
    if (r > 0.5 && count >= FLOOR[3]) return 3;
    if (r > 0.25 && count >= FLOOR[2]) return 2;
    return 1;
  }

  /* Board size from how much of the room a doubt lost: s = 1x1, m = 1x2 (square),
     w = 2x1 (wide), l = 2x2 (big).

     Size used to follow question length, which put a wordy minor doubt above a short urgent
     one and left the board arguing with its own ranking. Now the three signals agree: the
     biggest tile, the strongest colour and the top of the board are all the same doubt. */
  function sizeClass(count, max) {
    var step = heatStep(count, max);
    return step === 5 ? 'l' : step === 4 ? 'w' : step === 3 ? 'm' : 's';
  }

  /* Private windows and blocked cookies make localStorage throw on write.
     The app still works for the session; the feed says so rather than silently forgetting. */
  var storageProbe = null;
  function storageOk() {
    if (storageProbe !== null) return storageProbe;
    try {
      localStorage.setItem('metoo.probe', '1');
      localStorage.removeItem('metoo.probe');
      storageProbe = true;
    } catch (e) { storageProbe = false; }
    return storageProbe;
  }

  /* Four-plus digits in a 96px count column is a layout break, not a number.
     Compact notation keeps the figure honest and the tile intact. */
  var compact = null;
  function formatCount(n) {
    n = clampInt(n, 0, MAX_COUNT);
    if (n < 10000) return String(n);
    if (compact === null) {
      try {
        compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 0 });
        /* Some locales spell the suffix out ("12 mil"), which is wider than the count column.
           Probe the widest number we can ever show and fall back if it does not fit. */
        if (compact.format(987654).length > 4) compact = false;
      } catch (e) { compact = false; }
    }
    if (compact) return compact.format(n);
    return Math.round(n / 1000) + 'k';
  }

  function timeAgo(ts) {
    var diff = Math.max(0, Date.now() - validTime(ts));
    var m = Math.round(diff / MIN);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h';
    var d = Math.round(h / 24);
    return d + ' d';
  }

  /* Another tab asked, answered, or reset. Drop the cached copy so the next read comes from
     storage, and tell this page so it can repaint instead of arguing with its own stale board. */
  window.addEventListener('storage', function (e) {
    if (e.key !== null && e.key !== KEY) return;
    state = null;
    document.dispatchEvent(new CustomEvent('metoo:change', { detail: { external: true } }));
  });

  window.MeTooStore = {
    MAX_TEXT: MAX_TEXT,
    MAX_REPLY: MAX_REPLY,

    /* ---------- subjects ---------- */

    /* The timetable, each entry carrying its own live reading. Ordered as written above, so
       the picker is a stable list rather than a leaderboard that reshuffles under a tap. */
    subjects: function () {
      load();
      return SUBJECTS.map(function (s) {
        var st = statsFor(s.id);
        return {
          id: s.id, code: s.code, name: s.name, professor: s.professor,
          open: st.open, answered: st.answered, meToos: st.meToos, total: st.total
        };
      });
    },
    isSubject: isSubject,
    /* Point every other call in this module at one subject. Returns false for anything that
       is not on the timetable, so a hand-edited URL lands on the picker rather than on a
       blank board pretending to be a class. */
    setSubject: function (id) {
      if (!isSubject(id)) return false;
      currentId = String(id);
      return true;
    },
    getSubject: function () {
      var s = byId[currentId];
      return { id: s.id, code: s.code, name: s.name, professor: s.professor };
    },
    /* The subject's own name, in plain words, is the password. Case and spacing are forgiven;
       nothing else is. This is a demo gate, not authentication, and the page says so. */
    checkPassword: function (id, value) {
      if (!isSubject(id)) return false;
      return fold(value) === fold(byId[id].name);
    },
    passwordHint: function (id) {
      return isSubject(id) ? fold(byId[id].name) : '';
    },

    /* ---------- the current subject's board ---------- */

    getMeta: function () {
      var s = byId[currentId];
      return { code: s.code, name: s.name, professor: s.professor, title: s.code + ' · ' + s.name };
    },
    getDoubts: function () {
      return board().doubts.slice();
    },
    hasMeToo: function (id) {
      return board().meToos.indexOf(safeId(id)) !== -1;
    },
    isFull: function () {
      return board().doubts.length >= MAX_DOUBTS;
    },
    ask: function (text) {
      text = cut(oneLine(text), MAX_TEXT);
      if (!text) return null;
      var b = board();
      if (b.doubts.length >= MAX_DOUBTS) return null;
      var d = { id: uid(), text: text, count: 0, createdAt: Date.now(), answered: false, reply: '', mine: true, toCover: false };
      b.doubts.push(d);
      save();
      return d;
    },
    toggleMeToo: function (id) {
      var b = board();
      var d = find(id);
      if (!d || d.mine) return null;
      var i = b.meToos.indexOf(d.id);
      if (i === -1) { b.meToos.push(d.id); d.count = clampInt(d.count + 1, 0, MAX_COUNT); }
      else { b.meToos.splice(i, 1); d.count = Math.max(0, d.count - 1); }
      save();
      return { count: d.count, pressed: i === -1 };
    },
    reply: function (id, text) {
      var d = find(id);
      if (!d) return null;
      d.reply = cut(String(text == null ? '' : text).trim(), MAX_REPLY);
      if (d.reply) d.answered = true;
      save();
      return d;
    },
    setAnswered: function (id, on) {
      var d = find(id);
      if (!d) return null;
      d.answered = !!on;
      save();
      return d;
    },
    setCover: function (id, on) {
      var d = find(id);
      if (!d) return null;
      d.toCover = !!on;
      save();
      return d;
    },
    /* A professor only holds the key to their own subject, so resetting is scoped to it.
       The other four boards belong to somebody else's class and are left untouched. */
    resetSubject: function () {
      var s = load();
      s.boards[currentId] = seedBoard(currentId);
      recovered = false;
      save();
    },
    reset: function () {
      state = seed();
      recovered = false;
      save();
    },
    /* Reset is the one destructive act in the product, so it has to be survivable. The caller
       takes a snapshot first and can put the board back exactly as it was. Snapshots are plain
       JSON and go back through the same normaliser as anything else read from storage. */
    snapshot: function () {
      load();
      try { return JSON.stringify(state); } catch (e) { return null; }
    },
    restore: function (snap) {
      if (!snap) return false;
      try {
        var clean = normalize(JSON.parse(snap));
        if (!clean) return false;
        state = clean;
        save();
        return true;
      } catch (e) { return false; }
    },
    /* Headline numbers for the feed legend: how much of this subject is still open. */
    stats: function () { return statsFor(currentId); },
    /* Has this browser ever taken part, by asking or by tapping Me too, in any subject?
       Drives first-run copy, which should not reappear on every new board. */
    hasParticipated: function () {
      var s = load();
      return SUBJECTS.some(function (sub) {
        var b = s.boards[sub.id];
        return b.meToos.length > 0 || b.doubts.some(function (d) { return d.mine; });
      });
    },
    /* One honest sentence about the state of storage, or null when there is nothing to say.
       Ordered worst first: a refused write is more urgent than a repaired record. */
    notice: function () {
      load();
      if (!storageOk() || saveFailed) {
        return 'This browser is not saving, so your me toos last until you close the tab. Nothing is lost for anyone else.';
      }
      if (recovered) {
        return 'Some saved doubts could not be read and were skipped. The board below is everything that survived.';
      }
      return null;
    },
    storageOk: storageOk,
    maxCount: maxCount,
    heatStep: heatStep,
    sizeClass: sizeClass,
    formatCount: formatCount,
    timeAgo: timeAgo
  };
})();

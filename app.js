/*
 * AMC 8 practice: pick a mode, answer one question at a time against the clock, then review every answer
 * with the correct choice, the key idea and a worked solution. English first, Chinese available.
 * Progress (history and missed problems) is saved in this browser.
 */
(function () {
  'use strict';
  var BANK = window.PROBLEMS || [];
  // The pool: fixed problems plus generators (a generator makes a fresh problem with new numbers every time it is drawn).
  // A generator stands in for the fixed problems it replaces; those stay in BANK so old saved mistakes still open.
  var GEN = window.GENERATORS || { list: [], fromId: function () { return null; } };
  var REPLACED = {};
  GEN.list.forEach(function (g) { (g.replaces || []).forEach(function (id) { REPLACED[id] = true; }); });
  var POOL = BANK.filter(function (p) { return !REPLACED[p.id]; }).map(function (p) { return { topic: p.topic, level: p.level, p: p }; })
    .concat(GEN.list.map(function (g) { return { topic: g.topic, level: g.level, g: g }; }));
  function draw(item) { return item.g ? GEN.build(item.g, 1 + Math.floor(Math.random() * 2147483000)) : item.p; }
  function byId(id) {
    if (String(id).indexOf('#') >= 0) return GEN.fromId(id);
    for (var i = 0; i < BANK.length; i++) if (BANK[i].id === id) return BANK[i];
    return null;
  }
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];
  var TOPICS = ['arithmetic', 'percent', 'algebra', 'number', 'counting', 'probability', 'geometry', 'logic'];
  // past contests: the 20 most recent AMC 8s (there was none in 2021 — the contest moved from November to January)
  var YEARS = [2026, 2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006];
  var MOCK = { count: 25, minutes: 40, levels: [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5] };

  var TEXT = {
    en: {
      brand: 'AMC 8 Practice', lang: '中文',
      title: 'Get ready for the AMC 8',
      lead: 'Answer one problem at a time against the clock. At the end you see the right answer to every problem, the key idea, and a step-by-step explanation. Problems are generated with new numbers every time, so you never run out.',
      mock: 'Full mock test', mockDesc: '25 problems, 40 minutes, easy to hard — just like the real contest.',
      quick: 'Quick 10', quickDesc: '10 random problems with a stopwatch — new numbers every time.',
      quick1: 'Quick 1', quick1Desc: 'One random problem. See the answer right away, then keep going.', another: 'Another problem →', skipNew: 'Skip →',
      topic: 'Practice a topic', topicDesc: 'Pick a topic below, then start 10 problems from it.',
      mistakes: 'Review mistakes', mistakesDesc: 'Try again the problems you missed ({n}).', noMistakes: 'Nothing to review yet — great!',
      instant: 'In practice modes, show the answer right after each problem',
      yourStats: 'Your progress', tests: 'Tests taken', best: 'Best mock score', accuracy: 'Accuracy', solved: 'Problems solved',
      past: 'Official past contests', pastNote: 'The real AMC 8 problems are copyrighted by the MAA. Practice them on the AoPS Wiki (problems, answer keys and solutions):',
      problems: 'Problems', key: 'Answer key',
      disclaimer: 'Original practice problems in the style of the AMC 8. Not affiliated with or endorsed by the MAA. AMC 8 is a trademark of the Mathematical Association of America.',
      question: 'Question', of: 'of', level: 'Level', prev: '← Back', next: 'Next →', skip: 'Skip', flag: 'Flag', finish: 'Finish', check: 'Check',
      confirmFinish: 'Finish now? {n} question(s) are not answered yet.', timeUp: 'Time is up!',
      keys: 'Keys: A–E choose · Enter next · ← → move',
      results: 'Results', scoreOf: 'out of', time: 'Time', perQ: 'per question', onlyWrong: 'Only show the ones I missed',
      retryWrong: 'Retry the ones I missed', home: 'Home', again: 'New test',
      you: 'Your answer', correct: 'Correct answer', blank: 'No answer', right: 'Correct!', wrongAns: 'Not quite',
      idea: 'How to think about it', solution: 'Solution', spent: 'time',
      byTopic: 'By topic', great: 'Excellent work!', good: 'Nice job — review the misses below.', keep: 'Keep practicing — read each explanation carefully.',
      amcNote: 'On the real AMC 8, each correct answer is 1 point and there is no penalty for guessing.',
      topics: { arithmetic: 'Arithmetic', percent: 'Ratios & %', algebra: 'Algebra', number: 'Number theory', counting: 'Counting', probability: 'Probability', geometry: 'Geometry', logic: 'Logic' },
      startTopic: 'Start {topic}'
    },
    zh: {
      brand: 'AMC 8 練習', lang: 'English',
      title: '準備 AMC 8 數學競賽',
      lead: '一次一題，邊作答邊計時。做完後會告訴你每一題的正確答案、解題關鍵，以及一步一步的解說。題目每次都隨機產生新的數字，永遠做不完。',
      mock: '完整模擬考', mockDesc: '25 題、40 分鐘，由易到難——和正式比賽一樣。',
      quick: '快速 10 題', quickDesc: '隨機 10 題，碼錶計時——每次數字都不一樣。',
      quick1: '快速 1 題', quick1Desc: '隨機 1 題，作答後馬上看答案，再接著下一題。', another: '再來一題 →', skipNew: '換一題 →',
      topic: '單元練習', topicDesc: '在下面選一個單元，再開始該單元的 10 題。',
      mistakes: '複習錯題', mistakesDesc: '重新挑戰答錯的題目（{n} 題）。', noMistakes: '目前沒有錯題——很棒！',
      instant: '練習模式中，每題作答後立刻顯示答案',
      yourStats: '你的紀錄', tests: '練習次數', best: '模擬考最高分', accuracy: '答對率', solved: '答對題數',
      past: '歷屆正式考題', pastNote: '正式的 AMC 8 題目版權屬於 MAA（美國數學協會）。可以到 AoPS Wiki 練習（題目、答案、詳解）：',
      problems: '題目', key: '答案',
      disclaimer: '本站題目為依照 AMC 8 風格原創的練習題，與 MAA 無關，也未經其認可。AMC 8 是美國數學協會（MAA）的商標。',
      question: '第', of: '／', level: '難度', prev: '← 上一題', next: '下一題 →', skip: '跳過', flag: '標記', finish: '交卷', check: '對答案',
      confirmFinish: '確定要交卷嗎？還有 {n} 題沒有作答。', timeUp: '時間到！',
      keys: '鍵盤：A–E 選答案 · Enter 下一題 · ← → 換題',
      results: '成績', scoreOf: '題中答對', time: '用時', perQ: '每題平均', onlyWrong: '只顯示答錯的題目',
      retryWrong: '重做答錯的題目', home: '回首頁', again: '再考一次',
      you: '你的答案', correct: '正確答案', blank: '未作答', right: '答對了！', wrongAns: '再想想',
      idea: '解題關鍵', solution: '詳解', spent: '用時',
      byTopic: '各單元表現', great: '表現優異！', good: '做得不錯——看看下面答錯的題目。', keep: '繼續加油——仔細讀每一題的解說。',
      amcNote: '正式的 AMC 8 每答對一題得 1 分，答錯不倒扣。',
      topics: { arithmetic: '四則運算', percent: '比例與百分比', algebra: '代數', number: '數論', counting: '計數', probability: '機率', geometry: '幾何', logic: '邏輯' },
      startTopic: '開始：{topic}'
    }
  };

  // ---------- saved in this browser ----------
  function load(k, d) { try { var v = localStorage.getItem('amc8.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('amc8.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  var lang = load('lang', 'en');
  var settings = load('settings', { instant: false, topic: 'geometry' });
  var hist = load('history', []);           // [{ mode, score, total, secs, date }]
  var missed = load('missed', []);             // problem ids answered wrong (removed when answered right later)

  var app = document.getElementById('app');
  function t(key, vars) {
    var v = key.split('.').reduce(function (o, k) { return o && o[k]; }, TEXT[lang]);
    if (v == null) v = key;
    return String(v).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }
  function L(o) { return o ? (o[lang] != null ? o[lang] : o.en) : ''; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clock(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  // "3/8" → a stacked fraction, "1 2/3" → 1 and a stacked fraction
  function mathy(s) {
    return esc(s).replace(/(\d+)\/(\d+)/g, '<span class="frac"><span>$1</span><span>$2</span></span>');
  }
  function choicesOf(p) { return Array.isArray(p.choices) ? p.choices : p.choices[lang] || p.choices.en; }

  // ======================= home =======================
  function home() {
    stopTimer();
    var mockScores = hist.filter(function (h) { return h.mode === 'mock'; }).map(function (h) { return h.score; });
    var answered = hist.reduce(function (s, h) { return s + h.total; }, 0), right = hist.reduce(function (s, h) { return s + h.score; }, 0);
    app.innerHTML =
      '<h1>' + t('title') + '</h1><p class="lead">' + t('lead') + '</p>' +
      '<div class="modes">' +
        '<button class="mode" data-start="mock"><div class="ic">🏆</div><b>' + t('mock') + '</b><span>' + t('mockDesc') + '</span></button>' +
        '<button class="mode" data-start="quick1"><div class="ic">🎲</div><b>' + t('quick1') + '</b><span>' + t('quick1Desc') + '</span></button>' +
        '<button class="mode" data-start="quick"><div class="ic">⚡</div><b>' + t('quick') + '</b><span>' + t('quickDesc') + '</span></button>' +
        '<button class="mode" data-start="topic"><div class="ic">🎯</div><b>' + t('startTopic', { topic: t('topics.' + settings.topic) }) + '</b><span>' + t('topicDesc') + '</span></button>' +
        '<button class="mode" data-start="mistakes"' + (missed.length ? '' : ' disabled') + '><div class="ic">🔁</div><b>' + t('mistakes') + '</b><span>' +
          (missed.length ? t('mistakesDesc', { n: missed.length }) : t('noMistakes')) + '</span></button>' +
      '</div>' +
      '<div class="chips">' + TOPICS.filter(function (k) { return POOL.some(function (p) { return p.topic === k; }); }).map(function (k) {
        return '<button class="chip' + (settings.topic === k ? ' on' : '') + '" data-topic="' + k + '">' + t('topics.' + k) + ' · ' + POOL.filter(function (p) { return p.topic === k; }).length + '</button>';
      }).join('') + '</div>' +
      '<label class="opt"><input type="checkbox" id="instant"' + (settings.instant ? ' checked' : '') + '> ' + t('instant') + '</label>' +
      (hist.length ? '<h2>' + t('yourStats') + '</h2><div class="stats">' +
        stat(hist.length, t('tests')) + stat(mockScores.length ? Math.max.apply(null, mockScores) + ' / 25' : '—', t('best')) +
        stat(answered ? Math.round(right / answered * 100) + '%' : '—', t('accuracy')) + stat(right, t('solved')) + '</div>' : '') +
      '<h2>' + t('past') + '</h2><p class="note">' + t('pastNote') + '</p><div class="years">' +
      YEARS.map(function (y) {
        var base = 'https://artofproblemsolving.com/wiki/index.php/' + y + '_AMC_8_';
        return '<a href="' + base + 'Problems" target="_blank" rel="noopener">' + y + '<small>' + t('problems') + '</small></a>';
      }).join('') + '</div>';
    function stat(n, l) { return '<div class="stat"><div class="n">' + n + '</div><div class="l">' + l + '</div></div>'; }
  }

  // ======================= a test =======================
  var T = null, timer = null;
  function pickMock() {
    var used = [];
    return MOCK.levels.map(function (lv) {
      var pool = shuffle(POOL.filter(function (p) { return p.level === lv && used.indexOf(p) < 0; }));
      if (!pool.length) pool = shuffle(POOL.filter(function (p) { return used.indexOf(p) < 0; }));
      used.push(pool[0]);
      return draw(pool[0]);
    });
  }
  function start(mode, list) {
    if (!list) {
      if (mode === 'mock') list = pickMock();
      else if (mode === 'quick') list = shuffle(POOL).slice(0, 10).map(draw).sort(function (a, b) { return a.level - b.level; });
      else if (mode === 'quick1') list = [draw(shuffle(POOL)[0])];
      else if (mode === 'topic') list = shuffle(POOL.filter(function (p) { return p.topic === settings.topic; })).slice(0, 10).map(draw).sort(function (a, b) { return a.level - b.level; });
      else if (mode === 'mistakes') list = shuffle(missed.map(byId).filter(Boolean)).slice(0, 15);
    }
    if (!list || !list.length) return;
    T = { mode: mode, list: list, i: 0, answers: list.map(function () { return null; }), flags: list.map(function () { return false; }),
          spent: list.map(function () { return 0; }), checked: list.map(function () { return false; }),
          limit: mode === 'mock' ? MOCK.minutes * 60 : 0, elapsed: 0, last: Date.now(), instant: mode === 'quick1' || (mode !== 'mock' && settings.instant) };
    location.hash = 'test';
    startTimer();
    renderQ();
  }
  function startTimer() {
    stopTimer();
    timer = setInterval(function () {
      if (!T) return;
      var now = Date.now(), dt = (now - T.last) / 1000;
      T.last = now;
      if (document.hidden) return;
      T.elapsed += dt; T.spent[T.i] += dt;
      var el = document.getElementById('clock');
      if (el) {
        el.textContent = T.limit ? clock(T.limit - T.elapsed) : clock(T.elapsed);
        el.classList.toggle('low', !!T.limit && T.limit - T.elapsed < 300);
      }
      if (T.limit && T.elapsed >= T.limit) { alert(t('timeUp')); finish(); }
    }, 250);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  function renderQ() {
    var p = T.list[T.i], n = T.list.length, a = T.answers[T.i], checked = T.checked[T.i], ch = choicesOf(p);
    var done = T.answers.filter(function (x) { return x != null; }).length;
    app.innerHTML =
      '<div class="qbar"><span class="count">' + (lang === 'zh' ? '第 ' + (T.i + 1) + ' 題／共 ' + n + ' 題' : 'Question ' + (T.i + 1) + ' of ' + n) + '</span>' +
        '<span class="badge">' + t('topics.' + p.topic) + '</span><span class="badge">' + t('level') + ' ' + '★'.repeat(p.level) + '</span>' +
        '<span class="timer" id="clock">' + (T.limit ? clock(T.limit - T.elapsed) : clock(T.elapsed)) + '</span></div>' +
      '<div class="progress"><i style="width:' + (done / n * 100) + '%"></i></div>' +
      '<div class="card"><p class="qtext">' + L(p.q) + '</p>' + (p.fig ? '<div class="fig">' + p.fig + '</div>' : '') +
        '<div class="choices">' + ch.map(function (c, k) {
          var cls = 'choice' + (a === k ? ' on' : '');
          if (checked) cls += k === LETTERS.indexOf(p.answer) ? ' right' : a === k ? ' wrong' : '';
          return '<button class="' + cls + '" data-pick="' + k + '"' + (checked ? ' disabled' : '') + '><span class="L">' + LETTERS[k] + '</span><span>' + mathy(c) + '</span></button>';
        }).join('') + '</div>' +
        (checked ? feedback(p, a) : '') +
        '<div class="qnav">' +
          '<button class="btn" data-nav="-1"' + (T.i ? '' : ' disabled') + '>' + t('prev') + '</button>' +
          (T.mode === 'mock' ? '<button class="btn flag' + (T.flags[T.i] ? ' on' : '') + '" data-flag>⚑ ' + t('flag') + '</button>' : '') +
          '<span class="spacer"></span>' +
          (T.mode === 'quick1' ? (checked ? '<button class="btn primary" data-another>' + t('another') + '</button>' :
            a != null ? '<button class="btn primary" data-check>' + t('check') + '</button>' : '<button class="btn" data-skipnew>' + t('skipNew') + '</button>') :
          T.instant && !checked && a != null ? '<button class="btn primary" data-check>' + t('check') + '</button>' :
            T.i < n - 1 ? '<button class="btn primary" data-nav="1">' + (a == null && !checked ? t('skip') : t('next')) + '</button>' : '') +
          '<button class="btn' + (T.i === n - 1 ? ' primary' : '') + '" data-finish>' + t('finish') + '</button>' +
        '</div></div>' +
      (n > 1 ? '<div class="dots">' + T.list.map(function (q, k) {
        return '<button class="dot' + (T.answers[k] != null ? ' done' : '') + (k === T.i ? ' cur' : '') + (T.flags[k] ? ' flagged' : '') + '" data-jump="' + k + '">' + (k + 1) + '</button>';
      }).join('') + '</div>' : '') + '<p class="kbd">' + t('keys') + '</p>';
  }
  function feedback(p, a) {
    var ok = a === LETTERS.indexOf(p.answer);
    return '<div class="feedback"><b style="color:var(--' + (ok ? 'good' : 'bad') + ')">' + (ok ? '✔ ' + t('right') : '✘ ' + t('wrongAns')) + '</b>' + explain(p) + '</div>';
  }
  function explain(p) {
    return '<div class="idea">💡 <b>' + t('idea') + (lang === 'zh' ? '：' : ': ') + '</b>' + L(p.insight) + '</div>' +
      '<b>' + t('solution') + '</b><ol class="steps">' + L(p.steps).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>';
  }
  function pick(k) {
    if (!T || T.checked[T.i]) return;
    T.answers[T.i] = T.answers[T.i] === k && !T.instant ? null : k;    // click again to clear (not in instant mode)
    renderQ();
  }
  function go(d) {
    if (!T) return;
    var j = T.i + d;
    if (j < 0 || j >= T.list.length) return;
    T.i = j; renderQ();
  }
  function finish(ask) {
    if (!T) return;
    var blanks = T.answers.filter(function (x) { return x == null; }).length;
    if (ask && blanks && !confirm(t('confirmFinish', { n: blanks }))) return;
    stopTimer();
    tally();
    location.hash = 'results';
    results(false);
  }
  function tally() {                          // score the test, remember mistakes, add it to the history
    var score = 0;
    T.list.forEach(function (p, k) {
      var ok = T.answers[k] === LETTERS.indexOf(p.answer);
      if (ok) score++;
      var at = missed.indexOf(p.id);
      if (ok && at >= 0) missed.splice(at, 1);
      if (!ok && at < 0) missed.push(p.id);
    });
    hist.push({ mode: T.mode, score: score, total: T.list.length, secs: Math.round(T.elapsed), date: new Date().toISOString().slice(0, 10) });
    save('history', hist.slice(-200)); save('missed', missed);
    T.score = score;
  }

  // ======================= results =======================
  function results(onlyWrong) {
    var n = T.list.length, pct = Math.round(T.score / n * 100);
    var tops = {};
    T.list.forEach(function (p, k) {
      var o = tops[p.topic] = tops[p.topic] || { n: 0, ok: 0 };
      o.n++; if (T.answers[k] === LETTERS.indexOf(p.answer)) o.ok++;
    });
    app.innerHTML =
      '<h1>' + t('results') + '</h1>' +
      '<div class="card score"><div class="ring" style="--p:' + pct + '"><div>' + T.score + '<small>' + t('scoreOf') + ' ' + n + '</small></div></div>' +
        '<div class="bars"><b>' + (pct >= 80 ? t('great') : pct >= 50 ? t('good') : t('keep')) + '</b>' +
        '<span class="note">' + t('time') + ' ' + clock(T.elapsed) + ' · ' + t('perQ') + ' ' + clock(T.elapsed / n) + (T.mode === 'mock' ? ' · ' + t('amcNote') : '') + '</span>' +
        '<b style="margin-top:6px">' + t('byTopic') + '</b>' +
        Object.keys(tops).map(function (k) {
          var o = tops[k];
          return '<div class="bar"><span>' + t('topics.' + k) + '</span><span class="track"><i style="width:' + (o.ok / o.n * 100) + '%"></i></span><span>' + o.ok + '/' + o.n + '</span></div>';
        }).join('') + '</div></div>' +
      '<div class="tools">' +
        (T.score < n ? '<button class="btn primary" data-retry>' + t('retryWrong') + '</button>' : '') +
        '<button class="btn" data-start="' + T.mode + '">' + t('again') + '</button><button class="btn" data-go="home">' + t('home') + '</button>' +
        '<label class="opt" style="margin:0"><input type="checkbox" id="onlyWrong"' + (onlyWrong ? ' checked' : '') + '> ' + t('onlyWrong') + '</label>' +
      '</div>' +
      '<div class="review">' + T.list.map(function (p, k) {
        var a = T.answers[k], key = LETTERS.indexOf(p.answer), ok = a === key, ch = choicesOf(p);
        if (onlyWrong && ok) return '';
        return '<div class="rv' + (ok ? '' : a == null ? ' skip' : ' no') + '">' +
          '<h3>' + (ok ? '✔' : a == null ? '–' : '✘') + ' ' + (k + 1) + '. <span class="badge">' + t('topics.' + p.topic) + '</span><span class="badge">' + '★'.repeat(p.level) + '</span>' +
            '<span class="note">' + t('spent') + ' ' + clock(T.spent[k]) + '</span></h3>' +
          '<div>' + L(p.q) + '</div>' + (p.fig ? '<div class="fig">' + p.fig + '</div>' : '') +
          '<div class="ans"><span class="you ' + (ok ? 'yes' : 'no') + '">' + t('you') + ': ' + (a == null ? t('blank') : '(' + LETTERS[a] + ') ' + mathy(ch[a])) + '</span>' +
            '<span class="key">' + t('correct') + ': (' + p.answer + ') ' + mathy(ch[key]) + '</span></div>' +
          explain(p) + '</div>';
      }).join('') + '</div>';
  }

  // ======================= events =======================
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-start],[data-topic],[data-pick],[data-nav],[data-jump],[data-flag],[data-check],[data-finish],[data-go],[data-retry],[data-another],[data-skipnew]');
    if (!el) return;
    if (el.hasAttribute('data-start')) start(el.getAttribute('data-start'));
    else if (el.hasAttribute('data-topic')) { settings.topic = el.getAttribute('data-topic'); save('settings', settings); home(); }
    else if (el.hasAttribute('data-pick')) pick(+el.getAttribute('data-pick'));
    else if (el.hasAttribute('data-nav')) go(+el.getAttribute('data-nav'));
    else if (el.hasAttribute('data-jump')) { T.i = +el.getAttribute('data-jump'); renderQ(); }
    else if (el.hasAttribute('data-flag')) { T.flags[T.i] = !T.flags[T.i]; renderQ(); }
    else if (el.hasAttribute('data-check')) { T.checked[T.i] = true; renderQ(); }
    else if (el.hasAttribute('data-finish')) finish(true);
    else if (el.hasAttribute('data-another')) { stopTimer(); tally(); start('quick1'); }
    else if (el.hasAttribute('data-skipnew')) start('quick1');
    else if (el.hasAttribute('data-retry')) {
      var wrong = T.list.filter(function (p, k) { return T.answers[k] !== LETTERS.indexOf(p.answer); });
      start('mistakes', wrong);
    } else if (el.hasAttribute('data-go')) { e.preventDefault(); T = null; location.hash = ''; home(); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'instant') { settings.instant = e.target.checked; save('settings', settings); }
    if (e.target.id === 'onlyWrong') results(e.target.checked);
  });
  document.addEventListener('keydown', function (e) {
    if (!T || location.hash !== '#test' || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toUpperCase(), idx = LETTERS.indexOf(k);
    if (idx < 0 && /^[1-5]$/.test(e.key)) idx = +e.key - 1;
    if (idx >= 0) { pick(idx); e.preventDefault(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Enter') {
      if (T.mode === 'quick1' && T.checked[0]) { stopTimer(); tally(); start('quick1'); }
      else if (T.instant && !T.checked[T.i] && T.answers[T.i] != null) { T.checked[T.i] = true; renderQ(); }
      else if (T.i < T.list.length - 1) go(1); else finish(true);
    }
  });
  window.addEventListener('hashchange', function () {
    if (location.hash === '' || location.hash === '#') { T = null; home(); }
  });
  document.getElementById('lang').addEventListener('click', function () {
    lang = lang === 'en' ? 'zh' : 'en'; save('lang', lang); paintStatic();
    if (T && location.hash === '#test') renderQ(); else if (T && location.hash === '#results') results(!!(document.getElementById('onlyWrong') || {}).checked); else home();
  });
  function paintStatic() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    document.title = t('brand');
    document.getElementById('lang').textContent = t('lang');
    document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
  }
  paintStatic();
  if (location.hash) window.history.replaceState(null, '', location.pathname + location.search);   // always start at home
  home();
})();

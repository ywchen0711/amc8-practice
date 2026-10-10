/*
 * Problem generators: every time a problem is drawn it gets new numbers (and often a new situation), with the
 * answer, the five choices, the key idea and a worked solution computed for those numbers, in English and Chinese.
 *
 * A generator:  { id, topic, level, replaces: [ids of fixed problems in problems.js it stands in for],
 *                 insight: { en, zh }, make(R) → { p (the numbers), q, ans, wrong, kind, steps, fig? }, check(p) }
 *   ans / wrong: numbers (kind 'int' | 'num' | 'money' | 'pct' | 'pi' | 'pad2') or fractions F(n, d) (kind 'frac')
 *   check(p) recomputes the answer a different way (brute force where possible) — tools/verify.js runs it
 *   on hundreds of random instances of every generator.
 * A drawn problem has the id "<generator id>#<seed>", so the same numbers come back when you review a mistake.
 */
(function () {
  'use strict';
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];

  // ---------------- tools ----------------
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function tools(r) {
    var R = {
      int: function (a, b) { return a + Math.floor(r() * (b - a + 1)); },
      pick: function (a) { return a[Math.floor(r() * a.length)]; },
      chance: function (p) { return r() < p; },
      shuffle: function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
    };
    return R;
  }
  var gcd = function (a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; };
  var lcm = function (a, b) { return a / gcd(a, b) * b; };
  var C = function (n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r); };
  var fact = function (n) { return n <= 1 ? 1 : n * fact(n - 1); };
  var isPrime = function (n) { if (n < 2) return false; for (var k = 2; k * k <= n; k++) if (n % k === 0) return false; return true; };
  var range = function (a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; };
  var dsum = function (n) { return String(n).split('').reduce(function (s, c) { return s + +c; }, 0); };
  var r2 = function (v) { return Math.round(v * 1e6) / 1e6; };
  var num = function (v) { v = r2(v); return v < 0 ? '−' + String(+(-v).toFixed(4)) : String(+v.toFixed(4)); };   // for text
  function F(n, d) {
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    return { n: n / g, d: d / g, v: n / d };
  }
  function fs(f, mixed) {                                    // "3/8", "2", or "2 1/2"
    if (f.d === 1) return String(f.n);
    if (mixed && f.n > f.d) return Math.floor(f.n / f.d) + ' ' + (f.n % f.d) + '/' + f.d;
    return f.n + '/' + f.d;
  }
  var mul = function (a, b) { return F(a.n * b.n, a.d * b.d); };
  var add = function (a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); };
  function factorStr(n) {
    var out = [], p = 2;
    while (n > 1) { var e = 0; while (n % p === 0) { n /= p; e++; } if (e) out.push(p + (e > 1 ? '<sup>' + e + '</sup>' : '')); p++; }
    return out.join(' × ');
  }
  function ord(n) { var s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'; return n + s; }
  var WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  var ZHN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  function listEn(a) { return a.length < 2 ? String(a[0]) : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function listZh(a) { return a.join('、'); }
  var NAMES = ['Amy', 'Ben', 'Chloe', 'David', 'Emma', 'Leo', 'Nora', 'Sam', 'Mia', 'Kai', 'Josh', 'Jasper', 'Lily', 'Owen'];
  function pow(a, b) { return Math.pow(a, b); }
  function modpow(a, n, m) { var r = 1 % m; a %= m; for (var i = 0; i < n; i++) r = r * a % m; return r; }

  // ---------------- turning an answer into five choices ----------------
  var FMT = {
    int: function (v) { return v < 0 ? '−' + (-v) : String(v); },
    num: function (v) { return num(v); },
    money: function (v) { return v.toFixed(2); },
    pct: function (v) { return num(v) + '%'; },
    pi: function (v) { return (v === 1 ? '' : num(v)) + 'π'; },
    pad2: function (v) { return (v < 10 ? '0' : '') + v; }
  };
  // Distractors come from the likely mistakes first, then from nearby values. The correct answer lands on a random
  // letter: pick how many choices go below it, then take that many smaller and the rest larger candidates.
  function place(R, ansV, cands, valOf) {
    var below = cands.filter(function (c) { return valOf(c) < ansV; }), above = cands.filter(function (c) { return valOf(c) > ansV; });
    var t = R.int(0, 4);
    if (t > below.length) t = below.length;
    if (4 - t > above.length) t = 4 - above.length;
    return below.slice(0, t).concat(above.slice(0, 4 - t));
  }
  function chooseNum(o, R) {
    var kind = o.kind || 'int', fmt = FMT[kind];
    var min = o.min != null ? o.min : (o.ans >= 1 ? 1 : o.ans >= 0 ? 0 : -Infinity), max = o.max != null ? o.max : Infinity;
    var ok = function (v) {
      return isFinite(v) && v >= min && v <= max && (kind !== 'int' && kind !== 'pad2' || Number.isInteger(v)) &&
        (!o.clean || o.clean(v)) && (kind !== 'money' || Number.isInteger(Math.round(v * 100 * 1e6) / 1e6));
    };
    var ans = r2(o.ans), keys = {}, cands = [];
    keys[fmt(ans)] = 1;
    var put = function (v) { v = r2(v); if (!ok(v)) return; var k = fmt(v); if (keys[k]) return; keys[k] = 1; cands.push(v); };
    (o.wrong || []).forEach(put);
    var step = o.step || 1;
    R.shuffle([1, 2, 3, 4]).forEach(function (k) { put(ans + k * step); put(ans - k * step); });
    for (var k = 5; k < 120; k++) { put(ans + k * step); put(ans - k * step); }
    var vals = place(R, ans, cands, function (v) { return v; }).concat([ans]).sort(function (a, b) { return a - b; });
    return { choices: vals.map(fmt), answer: LETTERS[vals.indexOf(ans)], text: fmt(ans) };
  }
  function chooseFrac(o, R) {
    var fm = function (f) { return fs(f, o.mixed); };
    var ok = function (f) { return f && f.d > 0 && f.n > 0 && (!o.prob || f.v <= 1); };
    var a = o.ans, keys = {}, cands = [];
    keys[fm(a)] = 1;
    var put = function (f) { if (!ok(f)) return; var k = fm(f); if (keys[k]) return; keys[k] = 1; cands.push(f); };
    (o.wrong || []).forEach(put);
    R.shuffle([F(a.n + 1, a.d), F(a.n - 1, a.d), F(a.n, a.d + 1), F(a.n, a.d - 1), F(a.n + 1, a.d + 1), F(a.n, 2 * a.d), F(2 * a.n, a.d)]).forEach(put);
    [F(a.n + 2, a.d), F(a.n - 2, a.d), F(a.n, a.d + 2), F(a.n, a.d - 2), F(1, a.d), F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(1, 6), F(5, 6)].forEach(put);
    for (var k = 3; k < 40; k++) { put(F(a.n + k, a.d)); put(F(a.n, a.d + k)); put(F(Math.max(1, a.n - k), a.d)); }
    var vals = place(R, a.v, cands, function (f) { return f.v; }).concat([a]).sort(function (x, y) { return x.v - y.v; });
    return { choices: vals.map(fm), answer: LETTERS[vals.indexOf(a)], text: fm(a) };
  }

  // ---------------- figures ----------------
  var SVG = function (w, h, body, width) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + (width || 170) + '">' + body + '</svg>'; };
  var txt = function (x, y, s, anchor) { return '<text x="' + x + '" y="' + y + '" font-size="10" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>'; };
  function figRectCut(W, H, a, b) {
    var s = 110 / Math.max(W, H), w = W * s, h = H * s, x0 = 22, y0 = 16;
    return SVG(w + 46, h + 40,
      '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" fill="#a8d8ff" stroke="#333" stroke-width="2"/>' +
      '<polygon points="' + (x0 + w - a * s) + ',' + y0 + ' ' + (x0 + w) + ',' + y0 + ' ' + (x0 + w) + ',' + (y0 + b * s) + '" fill="#fff" stroke="#c05000" stroke-width="2" stroke-dasharray="4 3"/>' +
      txt(x0 + w / 2, y0 + h + 14, W) + txt(x0 - 10, y0 + h / 2 + 3, H) + txt(x0 + w - a * s / 2, y0 - 4, a) + txt(x0 + w + 9, y0 + b * s / 2 + 3, b));
  }
  function figGrid(a, b, ends) {
    var s = Math.min(110 / a, 90 / b), x0 = 16, y0 = 12, w = a * s, h = b * s, lines = '';
    for (var i = 0; i <= a; i++) lines += '<line x1="' + (x0 + i * s) + '" y1="' + y0 + '" x2="' + (x0 + i * s) + '" y2="' + (y0 + h) + '"/>';
    for (var j = 0; j <= b; j++) lines += '<line x1="' + x0 + '" y1="' + (y0 + j * s) + '" x2="' + (x0 + w) + '" y2="' + (y0 + j * s) + '"/>';
    return SVG(w + 32, h + 26, '<g stroke="#333" stroke-width="1.5">' + lines + '</g>' +
      (ends ? '<circle cx="' + x0 + '" cy="' + (y0 + h) + '" r="3" fill="#c05000"/><circle cx="' + (x0 + w) + '" cy="' + y0 + '" r="3" fill="#2f6fde"/>' +
        txt(x0 - 7, y0 + h + 10, 'A') + txt(x0 + w + 7, y0 - 2, 'B') : ''));
  }
  function figTri(P) {
    var s = 13, x0 = 14, y0 = 8, N = 8, g = '';
    for (var i = 0; i <= N; i++) {
      g += '<line x1="' + (x0 + i * s) + '" y1="' + y0 + '" x2="' + (x0 + i * s) + '" y2="' + (y0 + N * s) + '"/>';
      g += '<line x1="' + x0 + '" y1="' + (y0 + i * s) + '" x2="' + (x0 + N * s) + '" y2="' + (y0 + i * s) + '"/>';
    }
    var pt = function (p) { return (x0 + p[0] * s) + ',' + (y0 + (N - p[1]) * s); };
    return SVG(N * s + 28, N * s + 24, '<g stroke="#ccd" stroke-width="1">' + g + '</g>' +
      '<line x1="' + x0 + '" y1="' + (y0 + N * s) + '" x2="' + (x0 + N * s) + '" y2="' + (y0 + N * s) + '" stroke="#333" stroke-width="1.5"/>' +
      '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + (y0 + N * s) + '" stroke="#333" stroke-width="1.5"/>' +
      '<polygon points="' + P.map(pt).join(' ') + '" fill="#ffd0a0" fill-opacity="0.8" stroke="#c05000" stroke-width="2"/>' +
      txt(x0 - 6, y0 + N * s + 10, '0'), 160);
  }
  function figSquareCircle(s) {
    return SVG(120, 124, '<rect x="10" y="14" width="100" height="100" fill="#ffe8a8" stroke="#333" stroke-width="2"/><circle cx="60" cy="64" r="50" fill="#fff" stroke="#333" stroke-width="2"/>' + txt(60, 10, s), 140);
  }
  function figRing(r, Rr) {
    var k = 50 / Rr;
    return SVG(120, 120, '<circle cx="60" cy="60" r="50" fill="#a8d8ff" stroke="#333" stroke-width="2"/><circle cx="60" cy="60" r="' + (r * k) + '" fill="#fff" stroke="#333" stroke-width="2"/>' +
      '<line x1="60" y1="60" x2="110" y2="60" stroke="#c05000" stroke-width="1.5"/><line x1="60" y1="60" x2="60" y2="' + (60 - r * k) + '" stroke="#2f6fde" stroke-width="1.5"/>' +
      txt(88, 56, Rr) + txt(66, 60 - r * k / 2, r, 'start'), 130);
  }

  // ======================= the generators =======================
  var G = [];
  var add2 = function (g) { G.push(g); };

  // ---------- arithmetic ----------
  add2({ id: 'g_ops', topic: 'arithmetic', level: 1, replaces: ['p01'],
    insight: { en: 'Order of operations: parentheses first, then multiplication, then subtraction. Working left to right ("subtract first") is the classic trap.',
               zh: '運算順序：先算括號，再算乘法，最後才減。從左到右先做減法，是最常見的陷阱。' },
    make: function (R) {
      var a = R.int(1990, 2040), b = R.int(2, 9), c = R.pick([1000, 500, 200, 100]), d = c - R.int(3, 25), e = c - d;
      return { p: { a: a, b: b, c: c, d: d }, ans: a - b * e, wrong: [(a - b) * e, a - b * c - d, a + b * e, a - b - e],
        q: { en: 'What is the value of ' + a + ' − ' + b + ' × (' + c + ' − ' + d + ')?', zh: a + ' − ' + b + ' × (' + c + ' − ' + d + ') 的值是多少？' },
        steps: { en: [c + ' − ' + d + ' = ' + e, b + ' × ' + e + ' = ' + b * e, a + ' − ' + b * e + ' = ' + (a - b * e)],
                 zh: [c + ' − ' + d + ' = ' + e, b + ' × ' + e + ' = ' + b * e, a + ' − ' + b * e + ' = ' + (a - b * e)] } };
    },
    check: function (p) { return new Function('return ' + p.a + '-' + p.b + '*(' + p.c + '-' + p.d + ')')(); } });

  add2({ id: 'g_avg_remove', topic: 'arithmetic', level: 1, replaces: ['p07'],
    insight: { en: 'Averages are easier as totals: total = average × how many. Compare the totals before and after.',
               zh: '平均數換成「總和」比較好算：總和 = 平均 × 個數。比較前後的總和。' },
    make: function (R) {
      var n, B, x, A;
      do { n = R.int(5, 9); B = R.int(8, 30); x = R.int(B + 2, B + 45); A = (x + (n - 1) * B) / n; } while (!Number.isInteger(A));
      return { p: { n: n, A: A, B: B }, ans: x, wrong: [A - B, n * (A - B), A + B, (n - 1) * B],
        q: { en: 'The average of ' + n + ' numbers is ' + A + '. When one of the numbers is removed, the average of the other ' + (n - 1) + ' is ' + B + '. Which number was removed?',
             zh: n + ' 個數的平均是 ' + A + '。拿掉其中一個數後，剩下 ' + (n - 1) + ' 個數的平均是 ' + B + '。被拿掉的數是多少？' },
        steps: { en: ['Total of all ' + n + ': ' + n + ' × ' + A + ' = ' + n * A, 'Total of the other ' + (n - 1) + ': ' + (n - 1) + ' × ' + B + ' = ' + (n - 1) * B, 'Removed: ' + n * A + ' − ' + (n - 1) * B + ' = ' + x],
                 zh: [n + ' 個數總和：' + n + ' × ' + A + ' = ' + n * A, '剩下 ' + (n - 1) + ' 個數總和：' + (n - 1) + ' × ' + B + ' = ' + (n - 1) * B, '拿掉的數：' + n * A + ' − ' + (n - 1) * B + ' = ' + x] } };
    },
    check: function (p) { for (var x = 0; x < 2000; x++) if ((p.n * p.A - x) === p.B * (p.n - 1)) return x; } });

  add2({ id: 'g_unit_price', topic: 'arithmetic', level: 1, replaces: [],
    insight: { en: 'Find the price of one first (the unit rate), then multiply. Comparing "how many times as many" also works when the numbers divide evenly.',
               zh: '先算出一個的價錢（單價），再乘上數量。如果數量剛好是倍數，也可以直接看「幾倍」。' },
    make: function (R) {
      var it = R.pick([['pencils', '枝鉛筆'], ['notebooks', '本筆記本'], ['apples', '顆蘋果'], ['stickers', '張貼紙'], ['markers', '枝麥克筆']]);
      var u = R.int(15, 240), n = R.int(2, 6), m = R.int(n + 1, 12), X = u * n / 100;
      return { p: { u: u, n: n, m: m }, ans: u * m / 100, kind: 'money', step: u / 100, wrong: [u * (m - 1) / 100, u * (m + 1) / 100, X + (m - n)],
        q: { en: n + ' ' + it[0] + ' cost $' + X.toFixed(2) + '. At the same price for each, how much do ' + m + ' ' + it[0] + ' cost, in dollars?',
             zh: n + ' ' + it[1] + '共 ' + X.toFixed(2) + ' 美元。每個價錢相同，' + m + ' ' + it[1] + '要多少美元？' },
        steps: { en: ['One costs $' + X.toFixed(2) + ' ÷ ' + n + ' = $' + (u / 100).toFixed(2), m + ' cost ' + m + ' × $' + (u / 100).toFixed(2) + ' = $' + (u * m / 100).toFixed(2)],
                 zh: ['一個是 ' + X.toFixed(2) + ' ÷ ' + n + ' = ' + (u / 100).toFixed(2) + ' 美元', m + ' 個是 ' + m + ' × ' + (u / 100).toFixed(2) + ' = ' + (u * m / 100).toFixed(2) + ' 美元'] } };
    },
    check: function (p) { var cents = p.u * p.n; return cents / p.n * p.m / 100; } });

  add2({ id: 'g_telescope', topic: 'arithmetic', level: 2, replaces: ['p16'],
    insight: { en: 'Write each factor as one fraction. In a long product like this, almost everything cancels — this is called telescoping.',
               zh: '把每個括號寫成一個分數。這種長長的連乘，幾乎全部會互相約掉——這叫「伸縮相消」。' },
    make: function (R) {
      var v = R.pick(['minus', 'plus', 'sq']), n = R.int(8, 30), ans, wrong, q, st;
      if (v === 'minus') {
        ans = F(1, n); wrong = [F(1, n - 1), F(1, n + 1), F(n - 1, n), F(1, 2)];
        q = '(1 − 1/2)(1 − 1/3)(1 − 1/4) ⋯ (1 − 1/' + n + ')';
        st = { en: ['Each factor is (k − 1)/k: 1/2 · 2/3 · 3/4 ⋯ ' + (n - 1) + '/' + n, 'Every numerator cancels the denominator just before it', 'Only 1 on top and ' + n + ' on the bottom remain: 1/' + n],
               zh: ['每個括號都是 (k − 1)/k：1/2 · 2/3 · 3/4 ⋯ ' + (n - 1) + '/' + n, '每個分子都和前一個分母約掉', '只剩分子 1 和分母 ' + n + '：1/' + n] };
      } else if (v === 'plus') {
        ans = F(n + 1, 1); wrong = [F(n, 1), F(n + 2, 1), F(2 * n, 1), F(n + 1, 2)];
        q = '(1 + 1/1)(1 + 1/2)(1 + 1/3) ⋯ (1 + 1/' + n + ')';
        st = { en: ['Each factor is (k + 1)/k: 2/1 · 3/2 · 4/3 ⋯ ' + (n + 1) + '/' + n, 'Everything cancels except ' + (n + 1) + ' on top and 1 on the bottom', '= ' + (n + 1)],
               zh: ['每個括號都是 (k + 1)/k：2/1 · 3/2 · 4/3 ⋯ ' + (n + 1) + '/' + n, '除了分子 ' + (n + 1) + ' 和分母 1，其他全部約掉', '= ' + (n + 1)] };
      } else {
        ans = F(n + 1, 2 * n); wrong = [F(1, n), F(n + 1, n), F(1, 2), F(n, 2 * n + 2)];
        q = '(1 − 1/2<sup>2</sup>)(1 − 1/3<sup>2</sup>)(1 − 1/4<sup>2</sup>) ⋯ (1 − 1/' + n + '<sup>2</sup>)';
        st = { en: ['1 − 1/k² = (k − 1)(k + 1)/k² = (k − 1)/k × (k + 1)/k', 'The (k − 1)/k parts multiply to 1/' + n + '; the (k + 1)/k parts multiply to ' + (n + 1) + '/2', '1/' + n + ' × ' + (n + 1) + '/2 = ' + fs(ans)],
               zh: ['1 − 1/k² = (k − 1)(k + 1)/k² = (k − 1)/k × (k + 1)/k', '(k − 1)/k 的部分乘起來是 1/' + n + '；(k + 1)/k 的部分乘起來是 ' + (n + 1) + '/2', '1/' + n + ' × ' + (n + 1) + '/2 = ' + fs(ans)] };
      }
      return { p: { v: v, n: n }, ans: ans, kind: 'frac', wrong: wrong,
        q: { en: 'What is the value of ' + q + '?', zh: q + ' 的值是多少？' }, steps: st };
    },
    check: function (p) {
      var r = F(1, 1);
      if (p.v === 'minus') for (var k = 2; k <= p.n; k++) r = mul(r, F(k - 1, k));
      if (p.v === 'plus') for (k = 1; k <= p.n; k++) r = mul(r, F(k + 1, k));
      if (p.v === 'sq') for (k = 2; k <= p.n; k++) r = mul(r, F(k * k - 1, k * k));
      return r;
    } });

  add2({ id: 'g_fraction_left', topic: 'arithmetic', level: 2, replaces: [],
    insight: { en: 'Track what fraction is LEFT after each step, then work backwards from the amount left.',
               zh: '每一步都算出「剩下」幾分之幾，最後從剩下的錢倒推回去。' },
    make: function (R) {
      var name = R.pick(NAMES), a = R.pick([2, 3, 4, 5]), b = R.pick([2, 3, 4, 5]), k = R.int(2, 9), S = a * b * k, L = S * (a - 1) / a * (b - 1) / b;
      var left = F((a - 1) * (b - 1), a * b);
      return { p: { a: a, b: b, L: L }, ans: S, wrong: [L * a, L * b, L * (a + b), L * 2 + a * b],
        q: { en: name + ' spent 1/' + a + ' of the money on a book and then 1/' + b + ' of what was left on lunch. ' + name + ' had $' + L + ' left. How many dollars did ' + name + ' start with?',
             zh: name + ' 先花掉錢的 1/' + a + ' 買書，再花掉剩下的 1/' + b + ' 吃午餐，最後剩下 ' + L + ' 美元。' + name + ' 原本有多少美元？' },
        steps: { en: ['After the book, ' + (a - 1) + '/' + a + ' of the money is left', 'After lunch, ' + (b - 1) + '/' + b + ' of that is left: ' + (a - 1) + '/' + a + ' × ' + (b - 1) + '/' + b + ' = ' + fs(left) + ' of the start', 'Start = ' + L + ' ÷ ' + fs(left) + ' = ' + S],
                 zh: ['買書後剩下 ' + (a - 1) + '/' + a, '吃午餐後再剩下其中的 ' + (b - 1) + '/' + b + '：' + (a - 1) + '/' + a + ' × ' + (b - 1) + '/' + b + ' = 原來的 ' + fs(left), '原本 = ' + L + ' ÷ ' + fs(left) + ' = ' + S] } };
    },
    check: function (p) { for (var s = 1; s < 5000; s++) { var x = s - s / p.a; x = x - x / p.b; if (Math.abs(x - p.L) < 1e-9) return s; } } });

  add2({ id: 'g_mean_median', topic: 'arithmetic', level: 3, replaces: ['p27'],
    insight: { en: 'Find the median first (it does not depend on x once you know x is the largest), then use total = mean × count.',
               zh: '先求中位數（知道 x 最大後，中位數就和 x 無關），再用「總和 = 平均 × 個數」。' },
    make: function (R) {
      var a = R.int(1, 9), b = a + R.int(1, 6), c = b + R.int(1, 8), x = b + c - a, m = (b + c) / 2;
      return { p: { a: a, b: b, c: c }, ans: x, kind: 'num', clean: function (v) { return Number.isInteger(v * 2); },
        wrong: [(a + b + c) / 3, b + c, 2 * (b + c) - a, c + 1],
        q: { en: 'The numbers ' + a + ', ' + b + ', ' + c + ' and x have a mean equal to their median, and x is greater than ' + c + '. What is x?',
             zh: a + '、' + b + '、' + c + ' 和 x 這四個數的平均數等於中位數，而且 x 比 ' + c + ' 大。x 是多少？' },
        steps: { en: ['x is the largest, so the order is ' + a + ', ' + b + ', ' + c + ', x and the median is (' + b + ' + ' + c + ') ÷ 2 = ' + num(m), 'The mean is also ' + num(m) + ', so the total is 4 × ' + num(m) + ' = ' + (b + c) * 2, 'x = ' + (b + c) * 2 + ' − ' + a + ' − ' + b + ' − ' + c + ' = ' + x],
                 zh: ['x 最大，所以順序是 ' + a + ', ' + b + ', ' + c + ', x，中位數是 (' + b + ' + ' + c + ') ÷ 2 = ' + num(m), '平均也是 ' + num(m) + '，所以總和是 4 × ' + num(m) + ' = ' + (b + c) * 2, 'x = ' + (b + c) * 2 + ' − ' + a + ' − ' + b + ' − ' + c + ' = ' + x] } };
    },
    check: function (p) { for (var x = p.c + 0.5; x < 200; x += 0.5) { var s = [p.a, p.b, p.c, x].sort(function (u, v) { return u - v; }); if ((s[1] + s[2]) / 2 === (p.a + p.b + p.c + x) / 4) return x; } } });

  add2({ id: 'g_gauss', topic: 'arithmetic', level: 3, replaces: ['p33'],
    insight: { en: 'Pair the first number with the last, the second with the second-to-last, and so on: every pair has the same sum.',
               zh: '頭尾配對：第一個配最後一個、第二個配倒數第二個……每一對的和都一樣。' },
    make: function (R) {
      var v = R.pick(['nat', 'odd']), n = R.int(v === 'nat' ? 20 : 12, v === 'nat' ? 120 : 60);
      if (v === 'nat') {
        var s = n * (n + 1) / 2;
        return { p: { v: v, n: n }, ans: s, wrong: [n * n, n * (n - 1) / 2, n * (n + 1), s + n],
          q: { en: 'What is 1 + 2 + 3 + ⋯ + ' + n + '?', zh: '1 + 2 + 3 + ⋯ + ' + n + ' 等於多少？' },
          steps: { en: ['Pair the ends: 1 + ' + n + ' = ' + (n + 1) + ', 2 + ' + (n - 1) + ' = ' + (n + 1) + ', …', 'There are ' + n + ' numbers, so the sum is ' + n + ' × ' + (n + 1) + ' ÷ 2', '= ' + s],
                   zh: ['頭尾配對：1 + ' + n + ' = ' + (n + 1) + '，2 + ' + (n - 1) + ' = ' + (n + 1) + '，…', '一共 ' + n + ' 個數，所以和是 ' + n + ' × ' + (n + 1) + ' ÷ 2', '= ' + s] } };
      }
      return { p: { v: v, n: n }, ans: n * n, wrong: [n * (n + 1) / 2, n * (n - 1), n * n + n, (n - 1) * (n - 1)],
        q: { en: 'What is 1 + 3 + 5 + ⋯ + ' + (2 * n - 1) + '?', zh: '1 + 3 + 5 + ⋯ + ' + (2 * n - 1) + ' 等於多少？' },
        steps: { en: ['There are ' + n + ' odd numbers from 1 to ' + (2 * n - 1) + ' (since ' + (2 * n - 1) + ' = 2 × ' + n + ' − 1)', 'The first k odd numbers add up to k²: 1 = 1, 1 + 3 = 4, 1 + 3 + 5 = 9, …', n + '² = ' + n * n],
                 zh: ['1 到 ' + (2 * n - 1) + ' 共有 ' + n + ' 個奇數（因為 ' + (2 * n - 1) + ' = 2 × ' + n + ' − 1）', '前 k 個奇數的和是 k²：1 = 1，1 + 3 = 4，1 + 3 + 5 = 9，…', n + '² = ' + n * n] } };
    },
    check: function (p) { var s = 0; if (p.v === 'nat') for (var i = 1; i <= p.n; i++) s += i; else for (i = 1; i <= 2 * p.n - 1; i += 2) s += i; return s; } });

  // ---------- ratios & percent ----------
  add2({ id: 'g_discount', topic: 'percent', level: 1, replaces: ['p02'],
    insight: { en: 'Discounts in a row multiply; they do not add. p% off then q% off is ×(1 − p%) then ×(1 − q%), which is not the same as (p + q)% off.',
               zh: '連續打折要「相乘」，不能相加。先減 p% 再減 q% 是 ×(1 − p%) 再 ×(1 − q%)，不等於減 (p + q)%。' },
    make: function (R) {
      var it = R.pick([['jacket', '外套'], ['backpack', '背包'], ['pair of shoes', '雙鞋子'], ['board game', '盒桌遊'], ['scooter', '台滑板車']]), P, p, q;
      do { P = R.int(2, 10) * 20; p = R.pick([10, 20, 25, 30, 40, 50]); q = R.pick([10, 20, 25, 50]); } while ((P * (100 - p) * (100 - q)) % 10000);
      var s1 = P * (100 - p) / 100, ans = P * (100 - p) * (100 - q) / 10000;
      return { p: { P: P, p: p, q: q }, ans: ans, wrong: [P * (100 - p - q) / 100, s1, P * (100 - q) / 100, ans - 2],
        q: { en: 'A ' + it[0] + ' costs $' + P + '. It is on sale for ' + p + '% off, and then a coupon takes another ' + q + '% off the sale price. What is the final price, in dollars?',
             zh: '一' + it[1] + '原價 ' + P + ' 美元，先減價 ' + p + '%，再用折價券把特價再減 ' + q + '%。最後要付多少美元？' },
        steps: { en: ['Sale price: ' + P + ' × ' + num((100 - p) / 100) + ' = ' + num(s1), 'With the coupon: ' + num(s1) + ' × ' + num((100 - q) / 100) + ' = ' + num(ans)],
                 zh: ['特價：' + P + ' × ' + num((100 - p) / 100) + ' = ' + num(s1), '用折價券：' + num(s1) + ' × ' + num((100 - q) / 100) + ' = ' + num(ans)] } };
    },
    check: function (p) { var c = p.P * 100; c -= c * p.p / 100; c -= c * p.q / 100; return c / 100; } });

  add2({ id: 'g_ratio_diff', topic: 'percent', level: 1, replaces: ['p03'],
    insight: { en: 'Turn a ratio into "parts". The difference between the two groups is a number of parts — that tells you how big one part is.',
               zh: '把比例想成「份數」。兩組相差的份數，對應到題目給的差，就能求出一份是多少。' },
    make: function (R) {
      var pr = R.pick([[3, 5], [2, 3], [4, 7], [3, 4], [5, 8], [2, 5], [4, 5], [5, 7]]), a = pr[0], b = pr[1], k = R.int(3, 12), d = (b - a) * k;
      var ctx = R.pick([
        { en: ['In a class', 'boys', 'girls', 'students'], zh: ['某班', '男生', '女生', '人'] },
        { en: ['In a bag', 'red marbles', 'blue marbles', 'marbles'], zh: ['袋子裡', '紅彈珠', '藍彈珠', '顆彈珠'] },
        { en: ['On a shelf', 'comic books', 'novels', 'books'], zh: ['書架上', '漫畫', '小說', '本書'] }]);
      return { p: { a: a, b: b, d: d }, ans: (a + b) * k, wrong: [b * k, a * k, d * (a + b), (a + b) * (k + 1)],
        q: { en: ctx.en[0] + ' the ratio of ' + ctx.en[1] + ' to ' + ctx.en[2] + ' is ' + a + ' : ' + b + '. There are ' + d + ' more ' + ctx.en[2] + ' than ' + ctx.en[1] + '. How many ' + ctx.en[3] + ' are there in total?',
             zh: ctx.zh[0] + ctx.zh[1] + '和' + ctx.zh[2] + '的數量比是 ' + a + ' : ' + b + '，' + ctx.zh[2] + '比' + ctx.zh[1] + '多 ' + d + '。總共有多少' + ctx.zh[3] + '？' },
        steps: { en: [b + ' parts − ' + a + ' parts = ' + (b - a) + ' parts = ' + d + ', so 1 part = ' + k, 'Total = ' + (a + b) + ' parts = ' + (a + b) + ' × ' + k + ' = ' + (a + b) * k],
                 zh: [b + ' 份 − ' + a + ' 份 = ' + (b - a) + ' 份 = ' + d + '，所以 1 份 = ' + k, '總共 = ' + (a + b) + ' 份 = ' + (a + b) + ' × ' + k + ' = ' + (a + b) * k] } };
    },
    check: function (p) { for (var k = 1; k < 500; k++) if (p.b * k - p.a * k === p.d) return (p.a + p.b) * k; } });

  add2({ id: 'g_reverse_pct', topic: 'percent', level: 2, replaces: [],
    insight: { en: 'After p% off you pay (100 − p)% of the original. Divide by that — adding p% of the sale price back is the classic mistake.',
               zh: '減價 p% 後付的是原價的 (100 − p)%，所以要「除以」它。把特價再加回 p%，是最常見的錯誤。' },
    make: function (R) {
      var it = R.pick([['bike', '腳踏車'], ['guitar', '吉他'], ['tablet', '平板'], ['coat', '大衣']]), O, p;
      do { O = R.int(2, 15) * 20; p = R.pick([10, 20, 25, 40, 50]); } while ((O * (100 - p)) % 100);
      var X = O * (100 - p) / 100;
      return { p: { X: X, p: p }, ans: O, wrong: [X * (100 + p) / 100, X + p, X * 100 / p, O + 10],
        q: { en: 'After a ' + p + '% discount, a ' + it[0] + ' costs $' + X + '. What was the original price, in dollars?',
             zh: '一台' + it[1] + '減價 ' + p + '% 之後賣 ' + X + ' 美元。原價是多少美元？' },
        steps: { en: ['After ' + p + '% off you pay ' + (100 - p) + '% of the original', num((100 - p) / 100) + ' × original = ' + X, 'Original = ' + X + ' ÷ ' + num((100 - p) / 100) + ' = ' + O],
                 zh: ['減價 ' + p + '% 後付的是原價的 ' + (100 - p) + '%', '原價 × ' + num((100 - p) / 100) + ' = ' + X, '原價 = ' + X + ' ÷ ' + num((100 - p) / 100) + ' = ' + O] } };
    },
    check: function (p) { for (var o = 1; o < 10000; o++) if (o * (100 - p.p) === p.X * 100) return o; } });

  add2({ id: 'g_pct_updown', topic: 'percent', level: 3, replaces: ['p23'],
    insight: { en: 'Percent changes multiply. Up p% and down q% is ×(1 + p%) × (1 − q%); the second percent is taken of a different (new) amount.',
               zh: '百分比的變化要相乘。漲 p% 再跌 q% 是 ×(1 + p%) × (1 − q%)，第二次的百分比是以「新的」價格為基準。' },
    make: function (R) {
      var p, q;
      do { p = R.pick([10, 20, 25, 40, 50]); q = R.pick([10, 20, 25, 40, 50]); } while (((100 + p) * (100 - q)) % 100);
      var ans = (100 + p) * (100 - q) / 100;
      return { p: { p: p, q: q }, ans: ans, kind: 'pct', wrong: [100 + p - q, 100, 100 - q, 100 + p],
        q: { en: 'A price is increased by ' + p + '% and then the new price is decreased by ' + q + '%. The final price is what percent of the original price?',
             zh: '一個價格先上漲 ' + p + '%，新價格再下降 ' + q + '%。最後的價格是原價的百分之幾？' },
        steps: { en: ['Up ' + p + '%: × ' + num((100 + p) / 100), 'Down ' + q + '%: × ' + num((100 - q) / 100), num((100 + p) / 100) + ' × ' + num((100 - q) / 100) + ' = ' + num(ans / 100) + ', which is ' + ans + '%'],
                 zh: ['上漲 ' + p + '%：× ' + num((100 + p) / 100), '下降 ' + q + '%：× ' + num((100 - q) / 100), num((100 + p) / 100) + ' × ' + num((100 - q) / 100) + ' = ' + num(ans / 100) + '，也就是 ' + ans + '%'] } };
    },
    check: function (p) { var c = 10000; c += c * p.p / 100; c -= c * p.q / 100; return c / 100; } });

  add2({ id: 'g_recipe', topic: 'percent', level: 3, replaces: ['p42'],
    insight: { en: 'Scale the recipe: find how many times bigger the new batch is, then multiply. Fractions times fractions: multiply tops and bottoms.',
               zh: '按比例放大：先看新的份量是原來的幾倍，再相乘。分數乘分數：分子乘分子、分母乘分母。' },
    make: function (R) {
      var fr, n, m, ans;
      do { fr = R.pick([[2, 3], [3, 4], [1, 2], [3, 8], [5, 6], [1, 3]]); n = R.pick([12, 16, 18, 24]); m = R.int(2, 12) * n / R.pick([2, 3, 4]); ans = F(fr[0] * m, fr[1] * n); }
      while (!Number.isInteger(m) || m === n || m < 4 || ans.d > 8 || ans.v > 9);
      var a = fr[0], b = fr[1], times = F(m, n);
      return { p: { a: a, b: b, n: n, m: m }, ans: ans, kind: 'frac', mixed: true, wrong: [F(b * m, a * n), F(a * m, b), add(ans, F(1, 2)), F(a * m, b * n * 2)],
        q: { en: 'A recipe uses ' + a + '/' + b + ' cup of sugar to make ' + n + ' cookies. How many cups of sugar are needed for ' + m + ' cookies?',
             zh: '一份食譜用 ' + a + '/' + b + ' 杯糖做 ' + n + ' 片餅乾。做 ' + m + ' 片餅乾需要幾杯糖？' },
        steps: { en: [m + ' cookies is ' + m + '/' + n + ' = ' + fs(times, true) + ' times the recipe', a + '/' + b + ' × ' + fs(times) + ' = ' + fs(ans) + (ans.n > ans.d && ans.d > 1 ? ' = ' + fs(ans, true) : '') + ' cups'],
                 zh: [m + ' 片是 ' + m + '/' + n + ' = ' + fs(times, true) + ' 倍的份量', a + '/' + b + ' × ' + fs(times) + ' = ' + fs(ans) + (ans.n > ans.d && ans.d > 1 ? ' = ' + fs(ans, true) : '') + ' 杯'] } };
    },
    check: function (p) { return mul(F(p.a, p.b), F(p.m, p.n)); } });

  add2({ id: 'g_mixture', topic: 'percent', level: 4, replaces: [],
    insight: { en: 'Do not average the percents. Add up the actual amount of salt, then divide by the total amount of liquid.',
               zh: '不要直接平均兩個百分比。先算出真正有多少鹽，再除以總量。' },
    make: function (R) {
      var x, y, a, b, s;
      do { x = R.int(1, 8); y = R.int(1, 8); a = R.pick([5, 10, 15, 20, 25, 30]); b = R.pick([10, 20, 30, 40, 50, 60]); s = x * a + y * b; } while (a === b || x === y || s % (x + y));
      var ans = s / (x + y);
      return { p: { x: x, y: y, a: a, b: b }, ans: ans, kind: 'pct', wrong: [(a + b) / 2, a + b, (a * y + b * x) / (x + y), Math.max(a, b) - 5],
        q: { en: x + ' liters of a ' + a + '% salt solution are mixed with ' + y + ' liters of a ' + b + '% salt solution. What percent of the mixture is salt?',
             zh: x + ' 公升濃度 ' + a + '% 的鹽水和 ' + y + ' 公升濃度 ' + b + '% 的鹽水混合。混合後的鹽水濃度是百分之幾？' },
        steps: { en: ['Salt: ' + x + ' × ' + a + '% + ' + y + ' × ' + b + '% = ' + num(x * a / 100) + ' + ' + num(y * b / 100) + ' = ' + num(s / 100) + ' liters', 'Total liquid: ' + x + ' + ' + y + ' = ' + (x + y) + ' liters', num(s / 100) + ' ÷ ' + (x + y) + ' = ' + num(ans / 100) + ' = ' + num(ans) + '%'],
                 zh: ['鹽：' + x + ' × ' + a + '% + ' + y + ' × ' + b + '% = ' + num(x * a / 100) + ' + ' + num(y * b / 100) + ' = ' + num(s / 100) + ' 公升', '總量：' + x + ' + ' + y + ' = ' + (x + y) + ' 公升', num(s / 100) + ' ÷ ' + (x + y) + ' = ' + num(ans / 100) + ' = ' + num(ans) + '%'] } };
    },
    check: function (p) { return (p.x * p.a / 100 + p.y * p.b / 100) / (p.x + p.y) * 100; } });

  // ---------- algebra ----------
  add2({ id: 'g_rates_gap', topic: 'algebra', level: 1, replaces: ['p05'],
    insight: { en: 'When two things grow at steady rates, the gap between them also grows at a steady rate: the difference of the rates.',
               zh: '兩者都以固定速度增加時，它們的差距也以固定速度增加：速度相減。' },
    make: function (R) {
      var n = R.shuffle(NAMES).slice(0, 2), r2_ = R.int(8, 30), r1 = r2_ + R.int(2, 12), h = R.int(2, 9), G_ = (r1 - r2_) * h;
      return { p: { r1: r1, r2: r2_, G: G_ }, ans: h, kind: 'num', clean: function (v) { return Number.isInteger(v * 2); }, wrong: [G_ / r2_, G_ / r1, G_ / (r1 + r2_), h + 1],
        q: { en: n[0] + ' reads ' + r1 + ' pages per hour and ' + n[1] + ' reads ' + r2_ + ' pages per hour. They start reading their own copies of the same book at the same time. After how many hours will ' + n[0] + ' be ' + G_ + ' pages ahead of ' + n[1] + '?',
             zh: n[0] + ' 每小時讀 ' + r1 + ' 頁，' + n[1] + ' 每小時讀 ' + r2_ + ' 頁。兩人同時開始讀同一本書（各自一本）。幾小時後 ' + n[0] + ' 會比 ' + n[1] + ' 多讀 ' + G_ + ' 頁？' },
        steps: { en: ['The gap grows by ' + r1 + ' − ' + r2_ + ' = ' + (r1 - r2_) + ' pages each hour', G_ + ' ÷ ' + (r1 - r2_) + ' = ' + h + ' hours'],
                 zh: ['差距每小時增加 ' + r1 + ' − ' + r2_ + ' = ' + (r1 - r2_) + ' 頁', G_ + ' ÷ ' + (r1 - r2_) + ' = ' + h + ' 小時'] } };
    },
    check: function (p) { for (var t = 0; t < 100; t += 0.5) if (p.r1 * t - p.r2 * t === p.G) return t; } });

  add2({ id: 'g_seq', topic: 'algebra', level: 1, replaces: ['p08'],
    insight: { en: 'To reach the nth term you take n − 1 steps from the 1st term, not n. Off-by-one is the classic trap.',
               zh: '從第 1 項走到第 n 項只走了 n − 1 步，不是 n 步。差一個是最常見的陷阱。' },
    make: function (R) {
      var a = R.int(1, 9), d = R.int(2, 9), n = R.int(20, 120), ans = a + (n - 1) * d;
      return { p: { a: a, d: d, n: n }, ans: ans, wrong: [a + n * d, n * d, a + (n - 2) * d, a * n],
        q: { en: 'The sequence ' + a + ', ' + (a + d) + ', ' + (a + 2 * d) + ', ' + (a + 3 * d) + ', … adds ' + d + ' each time. What is its ' + ord(n) + ' term?',
             zh: '數列 ' + a + ', ' + (a + d) + ', ' + (a + 2 * d) + ', ' + (a + 3 * d) + ', … 每次加 ' + d + '。第 ' + n + ' 項是多少？' },
        steps: { en: ['From the 1st term to the ' + ord(n) + ' term there are ' + (n - 1) + ' steps of ' + d, a + ' + ' + (n - 1) + ' × ' + d + ' = ' + ans],
                 zh: ['從第 1 項到第 ' + n + ' 項共走 ' + (n - 1) + ' 步，每步加 ' + d, a + ' + ' + (n - 1) + ' × ' + d + ' = ' + ans] } };
    },
    check: function (p) { var t = p.a; for (var i = 1; i < p.n; i++) t += p.d; return t; } });

  add2({ id: 'g_sum_diff', topic: 'algebra', level: 2, replaces: ['p15'],
    insight: { en: 'Adding and subtracting the two equations gives x and y directly. For x² − y², the factoring (x + y)(x − y) skips the solving entirely.',
               zh: '兩式相加、相減就能直接得到 x 和 y。如果求 x² − y²，用 (x + y)(x − y) 分解，連解都不用解。' },
    make: function (R) {
      var y = R.int(1, 15), x = y + R.int(1, 15), S = x + y, D = x - y, v = R.pick(['xy', 'sq', 'sum2']), ans, wrong, ex, st;
      if (v === 'xy') {
        ans = x * y; wrong = [S * D, S + D, x * x, (S * S - D * D) / 2]; ex = 'xy';
        st = { en: ['Add the equations: 2x = ' + (S + D) + ', so x = ' + x, 'Then y = ' + S + ' − ' + x + ' = ' + y, 'xy = ' + x + ' × ' + y + ' = ' + ans],
               zh: ['兩式相加：2x = ' + (S + D) + '，所以 x = ' + x, '所以 y = ' + S + ' − ' + x + ' = ' + y, 'xy = ' + x + ' × ' + y + ' = ' + ans] };
      } else if (v === 'sq') {
        ans = S * D; wrong = [S + D, S * S - D * D, x * y, S * S]; ex = 'x<sup>2</sup> − y<sup>2</sup>';
        st = { en: ['x² − y² = (x + y)(x − y)', '= ' + S + ' × ' + D + ' = ' + ans], zh: ['x² − y² = (x + y)(x − y)', '= ' + S + ' × ' + D + ' = ' + ans] };
      } else {
        ans = x * x + y * y; wrong = [S * S, D * D, S * D, 2 * x * y]; ex = 'x<sup>2</sup> + y<sup>2</sup>';
        st = { en: ['(x + y)² + (x − y)² = 2(x² + y²)', S + '² + ' + D + '² = ' + (S * S + D * D), 'x² + y² = ' + (S * S + D * D) + ' ÷ 2 = ' + ans],
               zh: ['(x + y)² + (x − y)² = 2(x² + y²)', S + '² + ' + D + '² = ' + (S * S + D * D), 'x² + y² = ' + (S * S + D * D) + ' ÷ 2 = ' + ans] };
      }
      return { p: { S: S, D: D, v: v }, ans: ans, wrong: wrong, steps: st,
        q: { en: 'If x + y = ' + S + ' and x − y = ' + D + ', what is the value of ' + ex + '?', zh: '如果 x + y = ' + S + '，x − y = ' + D + '，那麼 ' + ex + ' 的值是多少？' } };
    },
    check: function (p) { for (var x = 0; x <= p.S; x++) { var y = p.S - x; if (x - y === p.D) return p.v === 'xy' ? x * y : p.v === 'sq' ? x * x - y * y : x * x + y * y; } } });

  add2({ id: 'g_pipes', topic: 'algebra', level: 3, replaces: ['p21'],
    insight: { en: 'Work with rates: each pipe does a fraction of the job per hour. Rates add (or subtract for a drain); time = 1 ÷ combined rate.',
               zh: '用「速率」思考：每條水管每小時完成幾分之幾。速率相加（排水就相減），時間 = 1 ÷ 合起來的速率。' },
    make: function (R) {
      var drain = R.chance(0.35), pr = drain ? R.pick([[2, 3], [3, 4], [4, 6], [3, 6], [4, 12], [6, 12], [10, 15], [6, 10]]) : R.pick([[3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [20, 30], [5, 20], [9, 18], [8, 24], [15, 30], [21, 28], [10, 40], [12, 36]]);
      var a = pr[0], b = pr[1], ans = drain ? a * b / (b - a) : a * b / (a + b), rate = drain ? F(b - a, a * b) : F(a + b, a * b);
      return { p: { a: a, b: b, drain: drain }, ans: ans, kind: 'num', clean: function (v) { return Number.isInteger(v * 2); },
        wrong: drain ? [b - a, (a + b) / 2, a * b / (a + b), a + b] : [(a + b) / 2, a + b, b - a, Math.min(a, b) / 2],
        q: drain ? { en: 'A pipe fills a tank in ' + a + ' hours, and a drain empties the full tank in ' + b + ' hours. If the tank starts empty with both open, how many hours does it take to fill it?',
                     zh: '一條水管 ' + a + ' 小時可以注滿水槽，排水口 ' + b + ' 小時可以把滿槽的水排光。從空槽開始、兩個同時打開，幾小時可以注滿？' }
                 : { en: 'One pipe fills a tank in ' + a + ' hours. A second pipe fills the same tank in ' + b + ' hours. How many hours does it take to fill the tank with both pipes open?',
                     zh: '一條水管 ' + a + ' 小時可以注滿水槽，另一條水管 ' + b + ' 小時可以注滿同一個水槽。兩條一起開，幾小時可以注滿？' },
        steps: { en: ['Per hour: 1/' + a + (drain ? ' − ' : ' + ') + '1/' + b + ' = ' + fs(rate) + ' of the tank', 'Time = 1 ÷ ' + fs(rate) + ' = ' + num(ans) + ' hours'],
                 zh: ['每小時：1/' + a + (drain ? ' − ' : ' + ') + '1/' + b + ' = 水槽的 ' + fs(rate), '時間 = 1 ÷ ' + fs(rate) + ' = ' + num(ans) + ' 小時'] } };
    },
    check: function (p) { for (var t = 0.5; t < 200; t += 0.5) if (Math.abs(t / p.a + (p.drain ? -1 : 1) * t / p.b - 1) < 1e-9) return t; } });

  add2({ id: 'g_avg_speed', topic: 'algebra', level: 3, replaces: ['p29'],
    insight: { en: 'Average speed = total distance ÷ total time. It is NOT the average of the two speeds unless the times are equal.',
               zh: '平均速率 = 總距離 ÷ 總時間。除非兩段時間一樣長，否則不是兩個速率的平均。' },
    make: function (R) {
      var v1, v2, t1, t2;
      do { v1 = R.int(6, 14) * 5; v2 = R.int(6, 14) * 5; t1 = R.int(1, 4); t2 = R.int(1, 4); } while (v1 === v2 || t1 === t2 || (v1 * t1 + v2 * t2) % (t1 + t2));
      var D = v1 * t1 + v2 * t2, T = t1 + t2, ans = D / T;
      return { p: { v1: v1, v2: v2, t1: t1, t2: t2 }, ans: ans, wrong: [(v1 + v2) / 2, D / 2, ans + 5, ans - 5],
        q: { en: 'A car drives ' + v1 + ' miles per hour for ' + t1 + ' hour' + (t1 > 1 ? 's' : '') + ' and then ' + v2 + ' miles per hour for ' + t2 + ' hour' + (t2 > 1 ? 's' : '') + '. What is its average speed for the whole trip, in miles per hour?',
             zh: '一輛車以每小時 ' + v1 + ' 英里的速度開了 ' + t1 + ' 小時，再以每小時 ' + v2 + ' 英里開了 ' + t2 + ' 小時。整趟的平均時速是多少英里？' },
        steps: { en: ['Distance: ' + v1 + ' × ' + t1 + ' + ' + v2 + ' × ' + t2 + ' = ' + D + ' miles', 'Time: ' + t1 + ' + ' + t2 + ' = ' + T + ' hours', 'Average speed: ' + D + ' ÷ ' + T + ' = ' + ans],
                 zh: ['距離：' + v1 + ' × ' + t1 + ' + ' + v2 + ' × ' + t2 + ' = ' + D + ' 英里', '時間：' + t1 + ' + ' + t2 + ' = ' + T + ' 小時', '平均時速：' + D + ' ÷ ' + T + ' = ' + ans] } };
    },
    check: function (p) { var d = 0, t = 0; for (var i = 0; i < p.t1 * 60; i++) { d += p.v1 / 60; t++; } for (i = 0; i < p.t2 * 60; i++) { d += p.v2 / 60; t++; } return d / (t / 60); } });

  add2({ id: 'g_tickets', topic: 'algebra', level: 3, replaces: ['p32'],
    insight: { en: 'Pretend every ticket is the cheap kind, then see how much money is "extra". Each expensive ticket accounts for the same extra amount.',
               zh: '假設全部都是便宜的票，看看多出多少錢。每張貴的票都多出固定的金額。' },
    make: function (R) {
      var pr = R.pick([[8, 5], [12, 7], [10, 6], [9, 4], [15, 9], [11, 6]]), p1 = pr[0], p2 = pr[1], N = R.int(15, 40), A = R.int(3, N - 3), T = A * p1 + (N - A) * p2;
      return { p: { p1: p1, p2: p2, N: N, T: T }, ans: A, wrong: [N - A, Math.round(T / p1), Math.round(T / (p1 + p2)), A + 2],
        q: { en: 'Adult tickets cost $' + p1 + ' and child tickets cost $' + p2 + '. A group bought ' + N + ' tickets for a total of $' + T + '. How many adult tickets did they buy?',
             zh: '成人票 ' + p1 + ' 美元，兒童票 ' + p2 + ' 美元。一群人買了 ' + N + ' 張票，總共花了 ' + T + ' 美元。他們買了幾張成人票？' },
        steps: { en: ['If all ' + N + ' were child tickets: ' + N + ' × ' + p2 + ' = $' + N * p2, 'The extra $' + (T - N * p2) + ' comes from adult tickets, each $' + (p1 - p2) + ' more', (T - N * p2) + ' ÷ ' + (p1 - p2) + ' = ' + A],
                 zh: ['如果 ' + N + ' 張全是兒童票：' + N + ' × ' + p2 + ' = ' + N * p2 + ' 美元', '多出的 ' + (T - N * p2) + ' 美元來自成人票，每張多 ' + (p1 - p2) + ' 美元', (T - N * p2) + ' ÷ ' + (p1 - p2) + ' = ' + A] } };
    },
    check: function (p) { for (var a = 0; a <= p.N; a++) if (a * p.p1 + (p.N - a) * p.p2 === p.T) return a; } });

  add2({ id: 'g_powers', topic: 'algebra', level: 3, replaces: ['p43'],
    insight: { en: 'Adding equal powers is multiplying: b<sup>k</sup> + b<sup>k</sup> = 2 × b<sup>k</sup>. Then rewrite everything with the same base and add exponents.',
               zh: '相同的次方相加其實是相乘：b<sup>k</sup> + b<sup>k</sup> = 2 × b<sup>k</sup>。再把所有東西換成同一個底數，指數相加。' },
    make: function (R) {
      var v = R.pick(['2', '3', '4', '8']), k = R.int(5, 20), ex, base, ans, st;
      if (v === '2') { ex = '2<sup>' + k + '</sup> + 2<sup>' + k + '</sup>'; base = 2; ans = k + 1; st = ['2<sup>' + k + '</sup> + 2<sup>' + k + '</sup> = 2 × 2<sup>' + k + '</sup>', '= 2<sup>' + (k + 1) + '</sup>']; }
      if (v === '3') { ex = '3<sup>' + k + '</sup> + 3<sup>' + k + '</sup> + 3<sup>' + k + '</sup>'; base = 3; ans = k + 1; st = ['Three equal terms: 3 × 3<sup>' + k + '</sup>', '= 3<sup>' + (k + 1) + '</sup>']; }
      if (v === '4') { ex = '4<sup>' + k + '</sup> + 4<sup>' + k + '</sup> + 4<sup>' + k + '</sup> + 4<sup>' + k + '</sup>'; base = 2; ans = 2 * k + 2; st = ['Four equal terms: 4 × 4<sup>' + k + '</sup> = 4<sup>' + (k + 1) + '</sup>', '4 = 2<sup>2</sup>, so 4<sup>' + (k + 1) + '</sup> = 2<sup>' + (2 * k + 2) + '</sup>']; }
      if (v === '8') { ex = '8<sup>' + k + '</sup> + 8<sup>' + k + '</sup>'; base = 2; ans = 3 * k + 1; st = ['8 = 2<sup>3</sup>, so 8<sup>' + k + '</sup> = 2<sup>' + 3 * k + '</sup>', '2<sup>' + 3 * k + '</sup> + 2<sup>' + 3 * k + '</sup> = 2 × 2<sup>' + 3 * k + '</sup> = 2<sup>' + (3 * k + 1) + '</sup>']; }
      var stZh = st.map(function (s) { return s.replace('Three equal terms', '三個相同的項').replace('Four equal terms', '四個相同的項').replace(', so ', '，所以 '); });
      return { p: { v: v, k: k }, ans: ans, wrong: [2 * k, k, 2 * ans, ans + 1, k * k],
        q: { en: 'If ' + ex + ' = ' + base + '<sup>n</sup>, what is n?', zh: '如果 ' + ex + ' = ' + base + '<sup>n</sup>，n 是多少？' },
        steps: { en: st.concat(['n = ' + ans]), zh: stZh.concat(['n = ' + ans]) } };
    },
    check: function (p) {
      var k = BigInt(p.k), b = { '2': 2n, '3': 3n, '4': 4n, '8': 8n }[p.v], copies = { '2': 2n, '3': 3n, '4': 4n, '8': 2n }[p.v], target = copies * b ** k, base = p.v === '3' ? 3n : 2n;
      for (var n = 0; n < 100; n++) if (base ** BigInt(n) === target) return n;
    } });

  add2({ id: 'g_age', topic: 'algebra', level: 3, replaces: ['p44'],
    insight: { en: 'Let the unknown age be x, write both people’s ages now and later, and set up one equation. Remember both get older by the same number of years.',
               zh: '設未知的年齡為 x，寫出兩人現在和以後的年齡，列一個方程式。別忘了兩個人都會長大同樣的歲數。' },
    make: function (R) {
      var name = R.pick(NAMES), m, k, y, c;
      do { m = R.pick([3, 4, 5]); k = R.pick([2, 3]); y = R.int(4, 30); c = y * (k - 1) / (m - k); } while (k >= m || !Number.isInteger(c) || c < 3 || c > 15);
      return { p: { m: m, k: k, y: y }, ans: c, wrong: [m * c, c + y, Math.round(y / k), y - c],
        q: { en: 'Mom is ' + m + ' times as old as ' + name + '. In ' + y + ' years she will be ' + (k === 2 ? 'twice' : 'three times') + ' as old as ' + name + '. How old is ' + name + ' now?',
             zh: '媽媽的年齡是 ' + name + ' 的 ' + m + ' 倍。' + y + ' 年後，媽媽的年齡會是 ' + name + ' 的 ' + k + ' 倍。' + name + ' 現在幾歲？' },
        steps: { en: ['Let ' + name + ' be x. Mom is ' + m + 'x', 'In ' + y + ' years: ' + m + 'x + ' + y + ' = ' + k + '(x + ' + y + ')', (m - k) + 'x = ' + (k - 1) * y + ', so x = ' + c],
                 zh: ['設 ' + name + ' 現在 x 歲，媽媽是 ' + m + 'x 歲', y + ' 年後：' + m + 'x + ' + y + ' = ' + k + '(x + ' + y + ')', (m - k) + 'x = ' + (k - 1) * y + '，所以 x = ' + c] } };
    },
    check: function (p) { for (var x = 1; x < 100; x++) if (p.m * x + p.y === p.k * (x + p.y)) return x; } });

  add2({ id: 'g_train', topic: 'algebra', level: 3, replaces: ['p49'],
    insight: { en: 'Follow one point of the train, say the front. To be completely past, the front travels the bridge PLUS the whole length of the train.',
               zh: '盯著火車上的一個點，例如車頭。要完全通過，車頭要走「橋長 + 整列車長」。' },
    make: function (R) {
      var L = R.pick([100, 120, 150, 180, 200, 240, 300]), v = R.pick([10, 12, 15, 20, 25, 30]), t, B;
      do { t = R.int(10, 60); B = v * t - L; } while (B < 100);
      return { p: { L: L, v: v, B: B }, ans: t, wrong: [B / v, L / v, (B - L) / v, t + Math.round(L / v)],
        q: { en: 'A train ' + L + ' meters long travels at ' + v + ' meters per second. How many seconds does it take to cross a ' + B + '-meter bridge completely (from the moment the front reaches the bridge until the back leaves it)?',
             zh: '一列長 ' + L + ' 公尺的火車以每秒 ' + v + ' 公尺前進。從車頭上橋到車尾離開，完全通過一座 ' + B + ' 公尺長的橋要幾秒？' },
        steps: { en: ['The front must travel the bridge plus the whole train: ' + B + ' + ' + L + ' = ' + (B + L) + ' m', (B + L) + ' ÷ ' + v + ' = ' + t + ' seconds'],
                 zh: ['車頭要走橋長加上整列車長：' + B + ' + ' + L + ' = ' + (B + L) + ' 公尺', (B + L) + ' ÷ ' + v + ' = ' + t + ' 秒'] } };
    },
    check: function (p) { var back = -p.L; for (var s = 0; s < 1000; s++) { if (back >= p.B) return s; back += p.v; } } });

  add2({ id: 'g_abs', topic: 'algebra', level: 3, replaces: ['p50'],
    insight: { en: '|x − a| is the distance from x to a on the number line. "Less than b" means strictly inside an interval — check whether the ends count.',
               zh: '|x − a| 是數線上 x 到 a 的距離。「小於 b」是在一個區間的內部——要注意端點算不算。' },
    make: function (R) {
      var a = R.int(-9, 9), b = R.int(2, 12), le = R.chance(0.4), ans = le ? 2 * b + 1 : 2 * b - 1;
      var lhs = a === 0 ? '|x|' : a > 0 ? '|x − ' + a + '|' : '|x + ' + (-a) + '|', sign = le ? ' ≤ ' : ' < ';
      var lo = le ? a - b : a - b + 1, hi = le ? a + b : a + b - 1;
      return { p: { a: a, b: b, le: le }, ans: ans, wrong: [2 * b, le ? 2 * b - 1 : 2 * b + 1, b, 2 * b + 2],
        q: { en: 'How many integers x satisfy ' + lhs + sign + b + '?', zh: '有幾個整數 x 滿足 ' + lhs + sign + b + '？' },
        steps: { en: ['The distance from x to ' + num(a) + ' is ' + (le ? 'at most ' : 'less than ') + b, num(a - b) + (le ? ' ≤ x ≤ ' : ' < x < ') + num(a + b), 'The integers from ' + num(lo) + ' to ' + num(hi) + ': ' + ans],
                 zh: ['x 到 ' + num(a) + ' 的距離' + (le ? '不超過 ' : '小於 ') + b, num(a - b) + (le ? ' ≤ x ≤ ' : ' < x < ') + num(a + b), '從 ' + num(lo) + ' 到 ' + num(hi) + ' 的整數：' + ans + ' 個'] } };
    },
    check: function (p) { var c = 0; for (var x = -60; x <= 60; x++) if (p.le ? Math.abs(x - p.a) <= p.b : Math.abs(x - p.a) < p.b) c++; return c; } });

  add2({ id: 'g_late_early', topic: 'algebra', level: 5, replaces: ['p55'],
    insight: { en: 'The two trips cover the same distance; their times differ by the late minutes plus the early minutes. Write time = distance ÷ speed for each and subtract.',
               zh: '兩次走的距離一樣，時間差 = 遲到的分鐘 + 早到的分鐘。分別寫出「時間 = 距離 ÷ 速率」再相減。' },
    make: function (R) {
      var name = R.pick(NAMES), pr, t1, t2, d;
      do { pr = R.pick([[4, 5], [4, 6], [3, 4], [5, 6], [6, 8], [10, 12], [12, 15], [3, 5]]); t1 = R.int(1, 12) * 2; t2 = R.int(1, 12) * 2; d = (t1 + t2) / 60 * pr[0] * pr[1] / (pr[1] - pr[0]); }
      while (!Number.isInteger(d * 2) || d < 1);
      var v1 = pr[0], v2 = pr[1], dt = F(t1 + t2, 60), k = F(v2 - v1, v1 * v2);
      return { p: { v1: v1, v2: v2, t1: t1, t2: t2 }, ans: d, kind: 'num', clean: function (v) { return Number.isInteger(v * 2); }, wrong: [d / 2, d * 2, (v1 + v2) / 2, d + 1],
        q: { en: name + ' walks to school. Walking at ' + v1 + ' km/h, ' + name + ' arrives ' + t1 + ' minutes late; at ' + v2 + ' km/h, ' + t2 + ' minutes early. How far is it to school, in kilometers?',
             zh: name + ' 走路上學。以每小時 ' + v1 + ' 公里走會遲到 ' + t1 + ' 分鐘，以每小時 ' + v2 + ' 公里走會早到 ' + t2 + ' 分鐘。家裡到學校有幾公里？' },
        steps: { en: ['The two trips take ' + t1 + ' + ' + t2 + ' = ' + (t1 + t2) + ' minutes = ' + fs(dt) + ' hour apart', 'd/' + v1 + ' − d/' + v2 + ' = d × ' + fs(k), 'd × ' + fs(k) + ' = ' + fs(dt), 'd = ' + fs(dt) + ' ÷ ' + fs(k) + ' = ' + num(d) + ' km'],
                 zh: ['兩次相差 ' + t1 + ' + ' + t2 + ' = ' + (t1 + t2) + ' 分鐘 = ' + fs(dt) + ' 小時', 'd/' + v1 + ' − d/' + v2 + ' = d × ' + fs(k), 'd × ' + fs(k) + ' = ' + fs(dt), 'd = ' + fs(dt) + ' ÷ ' + fs(k) + ' = ' + num(d) + ' 公里'] } };
    },
    check: function (p) { for (var d = 0.5; d < 100; d += 0.5) if (Math.abs(d / p.v1 * 60 - d / p.v2 * 60 - (p.t1 + p.t2)) < 1e-9) return d; } });

  // ---------- number theory ----------
  add2({ id: 'g_mult_not', topic: 'number', level: 1, replaces: ['p04'],
    insight: { en: 'Count everything, then subtract what you do not want. A number that is a multiple of both is exactly a multiple of their LCM.',
               zh: '先全部數，再扣掉不要的。同時是兩者的倍數，就是它們最小公倍數的倍數。' },
    make: function (R) {
      var a, b, N, L;
      do { a = R.pick([3, 4, 5, 6]); b = R.pick([2, 4, 6, 9, 10]); N = R.pick([50, 60, 100, 120, 200]); L = lcm(a, b); } while (L === a || L >= N || a === b);
      var A = Math.floor((N - 1) / a), B = Math.floor((N - 1) / L);
      return { p: { a: a, b: b, N: N }, ans: A - B, wrong: [A, A - Math.floor((N - 1) / b), B, A + B],
        q: { en: 'How many positive integers less than ' + N + ' are multiples of ' + a + ' but not multiples of ' + b + '?', zh: '小於 ' + N + ' 的正整數中，有多少個是 ' + a + ' 的倍數、但不是 ' + b + ' 的倍數？' },
        steps: { en: ['Multiples of ' + a + ' below ' + N + ': ' + A, 'Multiples of both ' + a + ' and ' + b + ' are multiples of lcm(' + a + ', ' + b + ') = ' + L + ': ' + B + ' below ' + N, A + ' − ' + B + ' = ' + (A - B)],
                 zh: ['小於 ' + N + ' 的 ' + a + ' 的倍數：' + A + ' 個', '同時是 ' + a + ' 和 ' + b + ' 的倍數，就是 ' + L + '（最小公倍數）的倍數：' + B + ' 個', A + ' − ' + B + ' = ' + (A - B)] } };
    },
    check: function (p) { return range(1, p.N - 1).filter(function (n) { return n % p.a === 0 && n % p.b !== 0; }).length; } });

  add2({ id: 'g_power_mod', topic: 'number', level: 2, replaces: ['p11'],
    insight: { en: 'Powers repeat in a cycle when you only care about the last digit (or a remainder). Find the cycle length, then divide the exponent by it.',
               zh: '只看個位數（或餘數）時，次方會循環。找出循環的長度，再用指數除以它。' },
    make: function (R) {
      var m = R.pick([5, 10]), a = R.pick([2, 3, 4, 7, 8, 9, 12, 13, 17]), n = R.int(25, 2030), cyc = [], v = a % m;
      while (cyc.indexOf(v) < 0) { cyc.push(v); v = v * a % m; }
      var L = cyc.length, idx = (n - 1) % L, ans = cyc[idx];
      var what = m === 10 ? { en: 'What is the units digit of ', zh: '的個位數字是多少？' } : { en: 'What is the remainder when ', zh: '除以 5 的餘數是多少？' };
      return { p: { a: a, n: n, m: m }, ans: ans, min: 0, max: m - 1, wrong: cyc.filter(function (x) { return x !== ans; }).concat([a % m, n % m]),
        q: { en: what.en + a + '<sup>' + n + '</sup>' + (m === 10 ? '?' : ' is divided by 5?'), zh: a + '<sup>' + n + '</sup> ' + what.zh },
        steps: { en: [(m === 10 ? 'Units digits' : 'Remainders') + ' of ' + a + '<sup>1</sup>, ' + a + '<sup>2</sup>, …: ' + cyc.join(', ') + ', then it repeats every ' + L, n + ' = ' + L + ' × ' + Math.floor((n - 1) / L) + ' + ' + (idx + 1) + ', so ' + a + '<sup>' + n + '</sup> is at position ' + (idx + 1) + ' of the cycle', 'The answer is ' + ans],
                 zh: [a + '<sup>1</sup>, ' + a + '<sup>2</sup>, … 的' + (m === 10 ? '個位數' : '餘數') + '：' + cyc.join(', ') + '，之後每 ' + L + ' 個循環一次', n + ' = ' + L + ' × ' + Math.floor((n - 1) / L) + ' + ' + (idx + 1) + '，所以 ' + a + '<sup>' + n + '</sup> 在循環的第 ' + (idx + 1) + ' 個', '答案是 ' + ans] } };
    },
    check: function (p) { return modpow(p.a, p.n, p.m); } });

  add2({ id: 'g_digitsum_pow', topic: 'number', level: 2, replaces: ['p19'],
    insight: { en: 'Write out what 10<sup>k</sup> − m looks like: a run of 9s followed by a few digits. Then count.',
               zh: '先寫出 10<sup>k</sup> − m 長什麼樣子：一串 9，後面接幾個數字。再數一數。' },
    make: function (R) {
      var k = R.int(8, 40), m = R.int(2, 99), L = String(m).length, tail = Math.pow(10, L) - m, tailS = String(tail).padStart(L, '0'), ans = 9 * (k - L) + dsum(tail);
      return { p: { k: k, m: m }, ans: ans, wrong: [9 * k, 9 * (k - L), ans + 9, ans - 9, 9 * k - m],
        q: { en: 'What is the sum of the digits of 10<sup>' + k + '</sup> − ' + m + '?', zh: '10<sup>' + k + '</sup> − ' + m + ' 的各位數字和是多少？' },
        steps: { en: ['10<sup>' + k + '</sup> is 1 followed by ' + k + ' zeros', 'Subtracting ' + m + ' leaves ' + (k - L) + ' nines followed by ' + tailS + ' (like 99…9' + tailS + ')', '9 × ' + (k - L) + ' + ' + dsum(tail) + ' = ' + ans],
                 zh: ['10<sup>' + k + '</sup> 是 1 後面接 ' + k + ' 個 0', '減掉 ' + m + ' 後是 ' + (k - L) + ' 個 9，後面接 ' + tailS + '（像 99…9' + tailS + '）', '9 × ' + (k - L) + ' + ' + dsum(tail) + ' = ' + ans] } };
    },
    check: function (p) { return (10n ** BigInt(p.k) - BigInt(p.m)).toString().split('').reduce(function (s, c) { return s + +c; }, 0); } });

  add2({ id: 'g_bus_lcm', topic: 'number', level: 2, replaces: ['p20'],
    insight: { en: 'Things that repeat every a and every b minutes line up again after the least common multiple of a and b.',
               zh: '每 a 分鐘和每 b 分鐘重複一次的事，下次再碰在一起的時間是 a 和 b 的最小公倍數。' },
    make: function (R) {
      var a, b, l;
      do { a = R.pick([6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25, 30]); b = R.pick([6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 25, 30]); l = lcm(a, b); } while (a >= b || l > 240 || l === b);
      return { p: { a: a, b: b }, ans: l, wrong: [a * b, a + b, 2 * l, l / 2, gcd(a, b)],
        q: { en: 'Bus A leaves the station every ' + a + ' minutes and bus B every ' + b + ' minutes. They both leave at 7:00 a.m. How many minutes later will they next leave together?',
             zh: 'A 公車每 ' + a + ' 分鐘發一班，B 公車每 ' + b + ' 分鐘發一班。兩班車在早上 7:00 同時發車，再過幾分鐘它們會再次同時發車？' },
        steps: { en: ['They leave together after a common multiple of ' + a + ' and ' + b, a + ' = ' + factorStr(a) + ', ' + b + ' = ' + factorStr(b), 'lcm = ' + factorStr(l) + ' = ' + l],
                 zh: ['同時發車的時間是 ' + a + ' 和 ' + b + ' 的公倍數', a + ' = ' + factorStr(a) + '，' + b + ' = ' + factorStr(b), '最小公倍數 = ' + factorStr(l) + ' = ' + l] } };
    },
    check: function (p) { for (var t = 1; ; t++) if (t % p.a === 0 && t % p.b === 0) return t; } });

  add2({ id: 'g_lcm_gcd', topic: 'number', level: 3, replaces: [],
    insight: { en: 'For any two positive integers, gcd × lcm = the product of the two numbers.',
               zh: '對任何兩個正整數，最大公因數 × 最小公倍數 = 兩數的乘積。' },
    make: function (R) {
      var g_, m, n;
      do { g_ = R.int(2, 12); m = R.int(2, 9); n = R.int(2, 9); } while (m === n || gcd(m, n) !== 1);
      var a = g_ * m, b = g_ * n, l = g_ * m * n;
      return { p: { g: g_, l: l, a: a }, ans: b, wrong: [l / g_, l - a, l / a, a + g_],
        q: { en: 'The greatest common divisor of two positive integers is ' + g_ + ' and their least common multiple is ' + l + '. One of the numbers is ' + a + '. What is the other?',
             zh: '兩個正整數的最大公因數是 ' + g_ + '，最小公倍數是 ' + l + '。其中一個數是 ' + a + '，另一個數是多少？' },
        steps: { en: ['gcd × lcm = product of the two numbers', g_ + ' × ' + l + ' = ' + g_ * l, 'Other number = ' + g_ * l + ' ÷ ' + a + ' = ' + b],
                 zh: ['最大公因數 × 最小公倍數 = 兩數乘積', g_ + ' × ' + l + ' = ' + g_ * l, '另一數 = ' + g_ * l + ' ÷ ' + a + ' = ' + b] } };
    },
    check: function (p) { for (var b = 1; b <= p.l; b++) if (gcd(p.a, b) === p.g && lcm(p.a, b) === p.l) return b; } });

  add2({ id: 'g_consec', topic: 'number', level: 3, replaces: ['p22'],
    insight: { en: 'Two consecutive integers are very close to the square root of their product. Estimate with a square root, then check.',
               zh: '兩個連續整數都很接近它們乘積的平方根。先用平方根估計，再驗算。' },
    make: function (R) {
      var n = R.int(11, 45), P = n * (n + 1);
      return { p: { P: P }, ans: 2 * n + 1, wrong: [n, n + 1, 2 * n, 2 * n + 3],
        q: { en: 'The product of two consecutive positive integers is ' + P + '. What is their sum?', zh: '兩個連續正整數的乘積是 ' + P + '，它們的和是多少？' },
        steps: { en: ['√' + P + ' is a little more than ' + n + ', so try ' + n + ' × ' + (n + 1), n + ' × ' + (n + 1) + ' = ' + P + ' ✓', n + ' + ' + (n + 1) + ' = ' + (2 * n + 1)],
                 zh: ['√' + P + ' 比 ' + n + ' 大一點，試試 ' + n + ' × ' + (n + 1), n + ' × ' + (n + 1) + ' = ' + P + ' ✓', n + ' + ' + (n + 1) + ' = ' + (2 * n + 1)] } };
    },
    check: function (p) { for (var n = 1; n < 1000; n++) if (n * (n + 1) === p.P) return 2 * n + 1; } });

  add2({ id: 'g_divisors', topic: 'number', level: 3, replaces: ['p31'],
    insight: { en: 'Factor into primes. A divisor chooses each exponent from 0 up to its value, so multiply (exponent + 1) for every prime.',
               zh: '先質因數分解。因數的每個質因數指數可以從 0 選到原來的指數，所以把每個（指數 + 1）相乘。' },
    make: function (R) {
      var a, b, c, N;
      do { a = R.int(0, 4); b = R.int(0, 3); c = R.int(0, 2); N = pow(2, a) * pow(3, b) * pow(5, c); } while (N < 30 || N > 1000 || (a > 0) + (b > 0) + (c > 0) < 2);
      var ex = [[2, a], [3, b], [5, c]].filter(function (e) { return e[1] > 0; }), ans = (a + 1) * (b + 1) * (c + 1);
      return { p: { N: N }, ans: ans, min: 1, wrong: [a + b + c, a + b + c + ex.length, ans - 2, ans + 2],
        q: { en: 'How many positive divisors does ' + N + ' have?', zh: N + ' 有幾個正因數？' },
        steps: { en: [N + ' = ' + factorStr(N), 'Each exponent can be chosen from 0 up to its value: ' + ex.map(function (e) { return '(' + e[1] + ' + 1)'; }).join(' × '), '= ' + ans],
                 zh: [N + ' = ' + factorStr(N), '每個質因數的指數可以從 0 選到它的值：' + ex.map(function (e) { return '(' + e[1] + ' + 1)'; }).join(' × '), '= ' + ans] } };
    },
    check: function (p) { return range(1, p.N).filter(function (d) { return p.N % d === 0; }).length; } });

  add2({ id: 'g_prime_sum', topic: 'number', level: 3, replaces: ['p39'],
    insight: { en: 'Only check odd numbers that are not multiples of 3 or 5; test divisibility by primes up to the square root.',
               zh: '只要檢查不是 3 或 5 的倍數的奇數；用不超過平方根的質數去試除。' },
    make: function (R) {
      var a, b;
      do { a = R.int(10, 80); b = a + 20; } while (isPrime(a) || isPrime(b));
      var ps = range(a + 1, b - 1).filter(isPrime), s = ps.reduce(function (x, y) { return x + y; }, 0);
      return { p: { a: a, b: b }, ans: s, wrong: [s - ps[ps.length - 1], s - ps[0], s + 2, s + ps[0]],
        q: { en: 'What is the sum of all prime numbers between ' + a + ' and ' + b + '?', zh: '介於 ' + a + ' 和 ' + b + ' 之間的所有質數，和是多少？' },
        steps: { en: ['Check the numbers from ' + (a + 1) + ' to ' + (b - 1) + ' (even numbers and multiples of 3, 5, 7 are out)', 'The primes are ' + listEn(ps), 'Sum: ' + ps.join(' + ') + ' = ' + s],
                 zh: ['檢查 ' + (a + 1) + ' 到 ' + (b - 1) + '（偶數和 3、5、7 的倍數都不是）', '質數有 ' + listZh(ps), '和：' + ps.join(' + ') + ' = ' + s] } };
    },
    check: function (p) { var s = 0; for (var n = p.a + 1; n < p.b; n++) { var pr = n > 1; for (var d = 2; d < n; d++) if (n % d === 0) pr = false; if (pr) s += n; } return s; } });

  add2({ id: 'g_remainder', topic: 'number', level: 4, replaces: ['p38'],
    insight: { en: 'If n leaves the same remainder r when divided by several numbers, then n − r is a multiple of all of them — so of their LCM.',
               zh: '如果 n 除以好幾個數的餘數都是 r，那 n − r 就是它們的公倍數——也就是最小公倍數的倍數。' },
    make: function (R) {
      var set = R.pick([[2, 3, 4, 5, 6], [3, 4, 5], [4, 6, 9], [2, 3, 5, 7], [3, 5, 7], [4, 5, 6], [5, 6, 8], [6, 8, 10], [3, 4, 7]]), r = R.pick([1, 1, 2]);
      if (r >= Math.min.apply(null, set)) r = 1;
      var l = set.reduce(lcm), ans = l + r;
      return { p: { set: set, r: r }, ans: ans, wrong: [l, l - r, set.reduce(function (a, b) { return a * b; }) + r, l * 2 + r],
        q: { en: 'What is the smallest integer greater than ' + r + ' that leaves a remainder of ' + r + ' when divided by each of ' + listEn(set) + '?',
             zh: '除以 ' + listZh(set) + ' 的餘數都是 ' + r + '，而且大於 ' + r + ' 的最小整數是多少？' },
        steps: { en: ['n − ' + r + ' must be divisible by each of ' + listEn(set), 'lcm(' + set.join(', ') + ') = ' + l, 'So n = ' + l + ' + ' + r + ' = ' + ans],
                 zh: ['n − ' + r + ' 必須是 ' + listZh(set) + ' 的公倍數', set.join('、') + ' 的最小公倍數 = ' + l, '所以 n = ' + l + ' + ' + r + ' = ' + ans] } };
    },
    check: function (p) { for (var n = p.r + 1; ; n++) if (p.set.every(function (d) { return n % d === p.r; })) return n; } });

  add2({ id: 'g_coins', topic: 'number', level: 4, replaces: ['p40'],
    insight: { en: 'Once you can make a run of consecutive amounts as long as the smaller coin, every bigger amount can be made too. For two coins with no common factor, the largest impossible amount is a × b − a − b.',
               zh: '只要能連續湊出「和較小硬幣一樣多個」相連的金額，之後所有金額都湊得出來。兩種沒有公因數的硬幣，湊不出的最大金額是 a × b − a − b。' },
    make: function (R) {
      var a, b;
      do { a = R.int(3, 9); b = R.int(a + 1, 13); } while (gcd(a, b) !== 1);
      var ans = a * b - a - b;
      return { p: { a: a, b: b }, ans: ans, min: 1, wrong: [a * b, a * b - a, a + b, ans + 1, ans - 1],
        q: { en: 'Using only ' + a + '-cent and ' + b + '-cent coins (as many as you like), what is the largest amount in cents that cannot be paid exactly?',
             zh: '只用 ' + a + ' 分和 ' + b + ' 分的硬幣（數量不限），最大的一個「湊不出來」的金額是幾分？' },
        steps: { en: [(ans + 1) + ' through ' + (ans + a) + ' cents can all be made — ' + a + ' amounts in a row', 'Adding more ' + a + '-cent coins then makes every larger amount', ans + ' cannot be made, so it is the largest: ' + a + ' × ' + b + ' − ' + a + ' − ' + b + ' = ' + ans],
                 zh: [(ans + 1) + ' 到 ' + (ans + a) + ' 分都湊得出來——連續 ' + a + ' 個金額', '再加 ' + a + ' 分的硬幣，之後所有金額都湊得出來', ans + ' 湊不出來，所以它最大：' + a + ' × ' + b + ' − ' + a + ' − ' + b + ' = ' + ans] } };
    },
    check: function (p) { var last = 0; for (var n = 1; n < p.a * p.b; n++) { var ok = false; for (var k = 0; k * p.b <= n; k++) if ((n - k * p.b) % p.a === 0) ok = true; if (!ok) last = n; } return last; } });

  add2({ id: 'g_div_pattern', topic: 'number', level: 4, replaces: ['p48'],
    insight: { en: 'Divisible by 9 (or 3) ⇔ the digit sum is divisible by 9 (or 3). Turn the question into counting digit pairs A, B with the right sum.',
               zh: '能被 9（或 3）整除 ⇔ 各位數字和能被 9（或 3）整除。題目就變成數有幾組數字 A、B 的和符合條件。' },
    make: function (R) {
      var d1 = R.int(1, 9), d2 = R.int(0, 9), m = R.pick([9, 9, 3]), base = d1 + d2, sums = [];
      for (var s = 0; s <= 18; s++) if ((base + s) % m === 0) sums.push(s);
      var cnt = function (s) { return s <= 9 ? s + 1 : 19 - s; }, ans = sums.reduce(function (t, s) { return t + cnt(s); }, 0);
      return { p: { d1: d1, d2: d2, m: m }, ans: ans, min: 1, wrong: [m === 9 ? 10 : 33, ans - 1, ans + 1, sums.length],
        q: { en: 'How many four-digit numbers of the form ' + d1 + 'A' + d2 + 'B (A and B are digits) are divisible by ' + m + '?', zh: '形如 ' + d1 + 'A' + d2 + 'B 的四位數（A、B 是數字）中，有幾個能被 ' + m + ' 整除？' },
        steps: { en: ['The digit sum ' + d1 + ' + A + ' + d2 + ' + B = ' + base + ' + A + B must be a multiple of ' + m, 'So A + B is one of ' + listEn(sums), 'Pairs of digits with each sum: ' + sums.map(function (s) { return cnt(s); }).join(' + ') + ' = ' + ans],
                 zh: ['數字和 ' + d1 + ' + A + ' + d2 + ' + B = ' + base + ' + A + B 必須是 ' + m + ' 的倍數', '所以 A + B 是 ' + listZh(sums) + ' 其中之一', '每個和對應的數字組數：' + sums.map(function (s) { return cnt(s); }).join(' + ') + ' = ' + ans] } };
    },
    check: function (p) { var c = 0; for (var A = 0; A <= 9; A++) for (var B = 0; B <= 9; B++) if (Number('' + p.d1 + A + p.d2 + B) % p.m === 0) c++; return c; } });

  add2({ id: 'g_zeros', topic: 'number', level: 4, replaces: [],
    insight: { en: 'Each zero at the end comes from a 10 = 2 × 5. There are always more 2s than 5s, so count the factors of 5 — and multiples of 25 give two.',
               zh: '末尾的每個 0 都來自 10 = 2 × 5。因數 2 永遠比 5 多，所以只要數因數 5 的個數——25 的倍數會貢獻兩個。' },
    make: function (R) {
      var n = R.int(20, 150), a = Math.floor(n / 5), b = Math.floor(n / 25), c = Math.floor(n / 125), ans = a + b + c;
      return { p: { n: n }, ans: ans, wrong: [a, Math.floor(n / 10), a + Math.floor(n / 10), ans + 1, ans - 1],
        q: { en: 'How many zeros are at the end of ' + n + '! (that is, ' + n + ' × ' + (n - 1) + ' × ⋯ × 2 × 1)?', zh: n + '!（也就是 ' + n + ' × ' + (n - 1) + ' × ⋯ × 2 × 1）的末尾有幾個 0？' },
        steps: { en: ['Count the factors of 5 (there are plenty of 2s)', 'Multiples of 5: ' + a + '; multiples of 25 add ' + b + (c ? '; multiples of 125 add ' + c : ''), 'Total: ' + ans],
                 zh: ['數因數 5 的個數（因數 2 一定夠多）', '5 的倍數：' + a + ' 個；25 的倍數再多 ' + b + ' 個' + (c ? '；125 的倍數再多 ' + c + ' 個' : ''), '共 ' + ans + ' 個'] } };
    },
    check: function (p) { var f = 1n; for (var i = 2; i <= p.n; i++) f *= BigInt(i); var s = f.toString(), z = 0; while (s[s.length - 1 - z] === '0') z++; return z; } });

  add2({ id: 'g_last_two', topic: 'number', level: 5, replaces: ['p53'],
    insight: { en: 'Only the last two digits matter, so work mod 100 and keep just two digits at every step. Find when the pattern returns to 01.',
               zh: '只關心最後兩位，所以每一步都只留最後兩位數（mod 100）。找出什麼時候又回到 01。' },
    make: function (R) {
      var a = R.pick([3, 7, 9, 11, 13, 17, 19, 21, 23]), n = R.int(20, 500), L = 1, v = a % 100;
      while (v !== 1) { v = v * a % 100; L++; }
      var r = n % L, ans = modpow(a, n, 100);
      return { p: { a: a, n: n }, ans: ans, kind: 'pad2', min: 0, max: 99, wrong: [(ans + 20) % 100, (ans + 40) % 100, modpow(a, n - 1, 100), (ans + 50) % 100],
        q: { en: 'What are the last two digits of ' + a + '<sup>' + n + '</sup>?', zh: a + '<sup>' + n + '</sup> 的最後兩位數是多少？' },
        steps: { en: ['Work mod 100 (keep only the last two digits)', a + '<sup>' + L + '</sup> ends in 01, so the last two digits repeat every ' + L + ' powers', n + ' = ' + L + ' × ' + Math.floor(n / L) + ' + ' + r + ', so ' + a + '<sup>' + n + '</sup> ends like ' + a + '<sup>' + r + '</sup>: ' + FMT.pad2(ans)],
                 zh: ['只看最後兩位（mod 100）', a + '<sup>' + L + '</sup> 的最後兩位是 01，所以每 ' + L + ' 次方循環一次', n + ' = ' + L + ' × ' + Math.floor(n / L) + ' + ' + r + '，所以 ' + a + '<sup>' + n + '</sup> 的最後兩位和 ' + a + '<sup>' + r + '</sup> 一樣：' + FMT.pad2(ans)] } };
    },
    check: function (p) { return Number(BigInt(p.a) ** BigInt(p.n) % 100n); } });

  add2({ id: 'g_fib_even', topic: 'number', level: 5, replaces: ['p58'],
    insight: { en: 'Only odd/even matters. odd + odd = even and odd + even = odd, so the pattern of parities repeats every 3 terms.',
               zh: '只看奇偶。奇 + 奇 = 偶，奇 + 偶 = 奇，所以奇偶的規律每 3 項重複一次。' },
    make: function (R) {
      var s2 = R.pick([1, 2]), n = R.int(20, 60), seq = [1, s2];
      while (seq.length < 6) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
      var ans = s2 === 2 ? Math.floor((n + 1) / 3) : Math.floor(n / 3), pat = s2 === 2 ? 'odd, even, odd' : 'odd, odd, even', patZh = s2 === 2 ? '奇、偶、奇' : '奇、奇、偶';
      return { p: { s2: s2, n: n }, ans: ans, wrong: [Math.floor(n / 2), ans + 1, ans - 1, Math.ceil(n / 2)],
        q: { en: 'A sequence starts 1, ' + s2 + ', and each term after that is the sum of the two terms before it: ' + seq.join(', ') + ', … How many of the first ' + n + ' terms are even?',
             zh: '一個數列從 1, ' + s2 + ' 開始，之後每一項都是前兩項的和：' + seq.join(', ') + ', … 前 ' + n + ' 項中有幾個偶數？' },
        steps: { en: ['Parities: ' + pat + ', ' + pat + ', … (repeats every 3)', 'One even term in each block of 3; ' + n + ' = 3 × ' + Math.floor(n / 3) + ' + ' + n % 3, 'Even terms: ' + ans],
                 zh: ['奇偶：' + patZh + '，' + patZh + '，…（每 3 項重複）', '每 3 項有一個偶數；' + n + ' = 3 × ' + Math.floor(n / 3) + ' + ' + n % 3, '偶數共 ' + ans + ' 個'] } };
    },
    check: function (p) { var a = 1, b = p.s2, c = 0; for (var i = 0; i < p.n; i++) { if (a % 2 === 0) c++; var t = (a + b) % 1000000; a = b; b = t; } return c; } });

  // ---------- counting ----------
  add2({ id: 'g_digit_set', topic: 'counting', level: 1, replaces: ['p09'],
    insight: { en: 'Multiplication principle: if each position is chosen independently, multiply the number of choices for each position. Watch the first digit — it cannot be 0.',
               zh: '乘法原理：每個位置可以獨立選擇時，把每個位置的選法數相乘。注意最高位不能是 0。' },
    make: function (R) {
      var k = R.int(2, 4), v = R.pick(['odd', 'even', 'prime']), ans, wrong, st;
      if (v === 'odd') { ans = pow(5, k); wrong = [4 * pow(5, k - 1), 5 * k, pow(5, k - 1), pow(10, k) / 2]; st = ['Odd digits: 1, 3, 5, 7, 9 → 5 choices for every position (none of them is 0)', '5<sup>' + k + '</sup> = ' + ans]; }
      if (v === 'even') { ans = 4 * pow(5, k - 1); wrong = [pow(5, k), pow(4, k), pow(5, k - 1), pow(10, k) / 2]; st = ['Even digits: 0, 2, 4, 6, 8, but the first digit cannot be 0 → 4 choices first, then 5 for each other position', '4 × 5<sup>' + (k - 1) + '</sup> = ' + ans]; }
      if (v === 'prime') { ans = pow(4, k); wrong = [4 * k, pow(5, k), pow(4, k - 1), 3 * pow(4, k - 1)]; st = ['Prime digits: 2, 3, 5, 7 → 4 choices for every position', '4<sup>' + k + '</sup> = ' + ans]; }
      var zhW = { odd: '奇數', even: '偶數', prime: '質數' }[v];
      var stZh = st.map(function (s) { return s.replace('Odd digits', '奇數數字').replace('Even digits', '偶數數字').replace('Prime digits', '質數數字').replace(' choices for every position (none of them is 0)', ' 種，每一位都可以選（都不是 0）').replace(' choices for every position', ' 種，每一位都可以選').replace(', but the first digit cannot be 0 → 4 choices first, then 5 for each other position', '，但最高位不能是 0 → 最高位 4 種，其他每位 5 種'); });
      return { p: { k: k, v: v }, ans: ans, wrong: wrong, steps: { en: st, zh: stZh },
        q: { en: 'How many ' + WORD[k] + '-digit numbers have all their digits ' + (v === 'prime' ? 'prime' : v) + '?', zh: '有多少個' + ZHN[k] + '位數的每一位數字都是' + zhW + '？' } };
    },
    check: function (p) {
      var ok = { odd: function (d) { return d % 2 === 1; }, even: function (d) { return d % 2 === 0; }, prime: function (d) { return [2, 3, 5, 7].indexOf(d) >= 0; } }[p.v];
      return range(pow(10, p.k - 1), pow(10, p.k) - 1).filter(function (n) { return String(n).split('').every(function (c) { return ok(+c); }); }).length;
    } });

  add2({ id: 'g_arrange', topic: 'counting', level: 2, replaces: ['p14'],
    insight: { en: 'Arrange as if all letters were different (n!), then divide by the ways to shuffle each repeated letter among itself.',
               zh: '先當作每個字母都不同（n!），再除以重複字母彼此交換的方法數。' },
    make: function (R) {
      var w = R.pick(['LEVEL', 'BANANA', 'APPLE', 'PEPPER', 'LETTER', 'COOKIE', 'TOOTH', 'BOOK', 'CHEESE', 'PUZZLE', 'MAMMAL', 'ALPHA', 'SCHOOL', 'COFFEE', 'GOOSE']), n = w.length, cnt = {};
      w.split('').forEach(function (c) { cnt[c] = (cnt[c] || 0) + 1; });
      var reps = Object.keys(cnt).filter(function (c) { return cnt[c] > 1; }), den = reps.reduce(function (d, c) { return d * fact(cnt[c]); }, 1), ans = fact(n) / den;
      return { p: { w: w }, ans: ans, wrong: [fact(n), fact(n) / 2, ans * 2, ans / 2],
        q: { en: 'How many different arrangements are there of the letters in the word ' + w + '?', zh: '把 ' + w + ' 這個字的字母重新排列，共有多少種不同的排法？' },
        steps: { en: [w + ' has ' + n + ' letters, with ' + listEn(reps.map(function (c) { return c + ' ' + (cnt[c] === 2 ? 'twice' : cnt[c] + ' times'); })), n + '! = ' + fact(n), 'Divide by ' + reps.map(function (c) { return cnt[c] + '!'; }).join(' × ') + ' = ' + den + ': ' + fact(n) + ' ÷ ' + den + ' = ' + ans],
                 zh: [w + ' 有 ' + n + ' 個字母，其中' + listZh(reps.map(function (c) { return c + ' 有 ' + cnt[c] + ' 個'; })), n + '! = ' + fact(n), '除以 ' + reps.map(function (c) { return cnt[c] + '!'; }).join(' × ') + ' = ' + den + '：' + fact(n) + ' ÷ ' + den + ' = ' + ans] } };
    },
    check: function (p) { var s = {}; (function perm(pre, rest) { if (!rest.length) { s[pre] = 1; return; } rest.forEach(function (c, i) { perm(pre + c, rest.slice(0, i).concat(rest.slice(i + 1))); }); })('', p.w.split('')); return Object.keys(s).length; } });

  add2({ id: 'g_handshake', topic: 'counting', level: 3, replaces: ['p25'],
    insight: { en: 'Count from each person (n × (n − 1)), then divide by 2 because every handshake was counted twice — once by each person.',
               zh: '從每個人的角度數（n × (n − 1)），再除以 2，因為每次握手被兩個人各算了一次。' },
    make: function (R) {
      var n = R.int(6, 25), games = R.chance(0.5), ans = n * (n - 1) / 2;
      return { p: { n: n }, ans: ans, wrong: [n * (n - 1), n * n, ans + n, n * (n + 1) / 2],
        q: games ? { en: n + ' teams are in a league. Every team plays every other team exactly once. How many games are played?', zh: '一個聯盟有 ' + n + ' 支隊伍，每兩隊都恰好比賽一場。總共要比幾場？' }
                 : { en: n + ' people are at a party. Each person shakes hands exactly once with every other person. How many handshakes are there?', zh: '派對上有 ' + n + ' 個人，每個人都和其他每個人恰好握手一次。總共握了幾次手？' },
        steps: { en: ['Each of the ' + n + ' ' + (games ? 'teams plays ' + (n - 1) + ' games' : 'people shakes ' + (n - 1) + ' hands') + ': ' + n + ' × ' + (n - 1) + ' = ' + n * (n - 1), 'That counts each ' + (games ? 'game' : 'handshake') + ' twice: ' + n * (n - 1) + ' ÷ 2 = ' + ans],
                 zh: ['每' + (games ? '隊打 ' + (n - 1) + ' 場' : '人握 ' + (n - 1) + ' 次') + '：' + n + ' × ' + (n - 1) + ' = ' + n * (n - 1), '每' + (games ? '場比賽' : '次握手') + '都被算了兩次：' + n * (n - 1) + ' ÷ 2 = ' + ans] } };
    },
    check: function (p) { var c = 0; for (var i = 0; i < p.n; i++) for (var j = i + 1; j < p.n; j++) c++; return c; } });

  add2({ id: 'g_digit_count', topic: 'counting', level: 3, replaces: ['p26'],
    insight: { en: 'Count one place value at a time: how many times the digit shows up in the ones place, then in the tens place, and so on.',
               zh: '一個位數一個位數地數：先數個位出現幾次，再數十位，依此類推。' },
    make: function (R) {
      var d = R.int(1, 9), N = R.pick([99, 100, 150, 200, 250, 300]);
      var place = function (k) { return range(1, N).filter(function (n) { return Math.floor(n / k) % 10 === d && n >= k; }).length; };
      var ones = place(1), tens = place(10), hund = place(100), ans = ones + tens + hund;
      return { p: { d: d, N: N }, ans: ans, wrong: [Math.floor(N / 10), ones, ans + 1, ans - 1, 2 * Math.floor(N / 10) + 1],
        q: { en: 'How many times is the digit ' + d + ' written when all the integers from 1 to ' + N + ' are written down?', zh: '把 1 到 ' + N + ' 的所有整數寫下來，數字 ' + d + ' 一共會寫幾次？' },
        steps: { en: ['In the ones place: ' + ones, 'In the tens place: ' + tens + (hund ? '; in the hundreds place: ' + hund : ''), 'Total: ' + ans],
                 zh: ['個位：' + ones + ' 次', '十位：' + tens + ' 次' + (hund ? '；百位：' + hund + ' 次' : ''), '共 ' + ans + ' 次'] } };
    },
    check: function (p) { var c = 0; for (var n = 1; n <= p.N; n++) String(n).split('').forEach(function (ch) { if (+ch === p.d) c++; }); return c; } });

  add2({ id: 'g_officers', topic: 'counting', level: 3, replaces: ['p46'],
    insight: { en: 'Does order matter? Different jobs (president, vice-president) — yes, multiply. A committee where everyone is equal — no, divide by the number of orderings.',
               zh: '順序重不重要？職位不同（社長、副社長）——重要，直接相乘。委員會裡大家平等——不重要，要除以排列數。' },
    make: function (R) {
      var n = R.int(5, 12), v = R.pick(['p2', 'p3', 'c2', 'c3']), k = +v[1], P = k === 2 ? n * (n - 1) : n * (n - 1) * (n - 2), ans = v[0] === 'p' ? P : P / fact(k);
      var q, st;
      if (v === 'p2') q = { en: 'A club of ' + n + ' people chooses a president and a vice-president (two different people). How many ways can this be done?', zh: '一個 ' + n + ' 人的社團要選出社長和副社長（兩個不同的人），有幾種選法？' };
      if (v === 'p3') q = { en: 'A club of ' + n + ' people chooses a president, a vice-president and a secretary (three different people). How many ways can this be done?', zh: '一個 ' + n + ' 人的社團要選出社長、副社長和秘書（三個不同的人），有幾種選法？' };
      if (v[0] === 'c') q = { en: 'A club of ' + n + ' people chooses a committee of ' + k + ' members. How many different committees are possible?', zh: '一個 ' + n + ' 人的社團要選出 ' + k + ' 人的委員會，有幾種不同的委員會？' };
      var prod = k === 2 ? n + ' × ' + (n - 1) : n + ' × ' + (n - 1) + ' × ' + (n - 2);
      if (v[0] === 'p') st = { en: ['First job: ' + n + ' choices, then ' + (n - 1) + (k === 3 ? ', then ' + (n - 2) : ''), prod + ' = ' + ans], zh: ['第一個職位 ' + n + ' 種，接著 ' + (n - 1) + ' 種' + (k === 3 ? '，再來 ' + (n - 2) + ' 種' : ''), prod + ' = ' + ans] };
      else st = { en: ['If order mattered: ' + prod + ' = ' + P, 'Each committee was counted ' + k + '! = ' + fact(k) + ' times', P + ' ÷ ' + fact(k) + ' = ' + ans], zh: ['如果有順序：' + prod + ' = ' + P, '每個委員會被算了 ' + k + '! = ' + fact(k) + ' 次', P + ' ÷ ' + fact(k) + ' = ' + ans] };
      return { p: { n: n, v: v }, ans: ans, q: q, steps: st, wrong: v[0] === 'p' ? [P / fact(k), pow(n, k), n * k, ans / 2] : [P, n * k, C(n, k - 1), pow(n, k)] };
    },
    check: function (p) {
      var k = +p.v[1], c = 0, i, j, l;
      if (k === 2) for (i = 0; i < p.n; i++) for (j = 0; j < p.n; j++) if (i !== j && (p.v[0] === 'p' || i < j)) c++;
      if (k === 3) for (i = 0; i < p.n; i++) for (j = 0; j < p.n; j++) for (l = 0; l < p.n; l++) if (i !== j && j !== l && i !== l && (p.v[0] === 'p' || (i < j && j < l))) c++;
      return c;
    } });

  add2({ id: 'g_squares', topic: 'counting', level: 4, replaces: ['p34'],
    insight: { en: 'Organize by size. In an n-by-n grid there are (n − k + 1)² squares of size k × k. For rectangles, choose 2 vertical and 2 horizontal grid lines.',
               zh: '依大小分類。n × n 的方格裡，k × k 的正方形有 (n − k + 1)² 個。數長方形就是選 2 條直線和 2 條橫線。' },
    make: function (R) {
      var rect = R.chance(0.4), m = R.int(2, 5), n = rect ? R.int(2, 6) : R.int(3, 8), ans, wrong, q, st;
      if (!rect) {
        var parts = range(1, n).map(function (k) { return (n - k + 1) * (n - k + 1); });
        ans = parts.reduce(function (a, b) { return a + b; }, 0); wrong = [n * n, n * n + (n - 1) * (n - 1), 2 * n * n, ans - 1];
        q = { en: 'How many squares of any size can be found in a ' + n + '-by-' + n + ' grid of unit squares?', zh: '在 ' + n + ' × ' + n + ' 的方格圖中，大大小小的正方形共有幾個？' };
        st = { en: ['k × k squares: (' + n + ' − k + 1)² of them', parts.map(function (v, i) { return (i + 1) + '×' + (i + 1) + ': ' + v; }).join(', '), 'Total: ' + ans],
               zh: ['k × k 的正方形有 (' + n + ' − k + 1)² 個', parts.map(function (v, i) { return (i + 1) + '×' + (i + 1) + '：' + v; }).join('，'), '共 ' + ans + ' 個'] };
      } else {
        ans = C(m + 1, 2) * C(n + 1, 2); wrong = [m * n, C(m + 1, 2) + C(n + 1, 2), (m + 1) * (n + 1), ans / 2];
        q = { en: 'How many rectangles of any size (squares count too) can be found in a ' + m + '-by-' + n + ' grid of unit squares?', zh: '在 ' + m + ' × ' + n + ' 的方格圖中，大大小小的長方形（正方形也算）共有幾個？' };
        st = { en: ['A rectangle is fixed by choosing 2 of the ' + (n + 1) + ' vertical lines and 2 of the ' + (m + 1) + ' horizontal lines', 'C(' + (n + 1) + ', 2) × C(' + (m + 1) + ', 2) = ' + C(n + 1, 2) + ' × ' + C(m + 1, 2), '= ' + ans],
               zh: ['選 ' + (n + 1) + ' 條直線中的 2 條、' + (m + 1) + ' 條橫線中的 2 條，就決定一個長方形', 'C(' + (n + 1) + ', 2) × C(' + (m + 1) + ', 2) = ' + C(n + 1, 2) + ' × ' + C(m + 1, 2), '= ' + ans] };
      }
      return { p: { rect: rect, m: m, n: n }, ans: ans, wrong: wrong, q: q, steps: st, fig: figGrid(n, rect ? m : n, false) };
    },
    check: function (p) {
      var rows = p.rect ? p.m : p.n, cols = p.n, c = 0;
      for (var x1 = 0; x1 <= cols; x1++) for (var x2 = x1 + 1; x2 <= cols; x2++) for (var y1 = 0; y1 <= rows; y1++) for (var y2 = y1 + 1; y2 <= rows; y2++) if (p.rect || x2 - x1 === y2 - y1) c++;
      return c;
    } });

  add2({ id: 'g_paths', topic: 'counting', level: 4, replaces: ['p35'],
    insight: { en: 'A shortest path is a list of moves: some R’s and some U’s. Counting paths = choosing which positions in the list are R.',
               zh: '一條最短路徑就是一串「右、上」的走法。數路徑 = 選出哪幾步是「右」。' },
    make: function (R) {
      var a = R.int(2, 5), b = R.int(2, 5), ans = C(a + b, a);
      return { p: { a: a, b: b }, ans: ans, wrong: [a * b, a + b, 2 * ans, C(a + b, 2), ans - 2], fig: figGrid(a, b, true),
        q: { en: 'Moving only right or up along the lines of a ' + a + '-by-' + b + ' grid (' + a + ' squares across, ' + b + ' up), how many shortest paths go from corner A to corner B?',
             zh: '在 ' + a + ' × ' + b + ' 的方格（橫 ' + a + ' 格、直 ' + b + ' 格）上，只能沿著格線向右或向上走，從 A 走到 B 的最短路徑有幾條？' },
        steps: { en: ['Every shortest path is ' + a + ' R’s and ' + b + ' U’s in some order: ' + (a + b) + ' moves', 'Choose which ' + a + ' of the ' + (a + b) + ' moves are R: C(' + (a + b) + ', ' + a + ')', '= ' + ans],
                 zh: ['每條最短路徑都是 ' + a + ' 個「右」和 ' + b + ' 個「上」，共 ' + (a + b) + ' 步', '從 ' + (a + b) + ' 步中選 ' + a + ' 步是「右」：C(' + (a + b) + ', ' + a + ')', '= ' + ans] } };
    },
    check: function (p) { var g = []; for (var i = 0; i <= p.a; i++) { g.push([]); for (var j = 0; j <= p.b; j++) g[i][j] = i === 0 || j === 0 ? 1 : g[i - 1][j] + g[i][j - 1]; } return g[p.a][p.b]; } });

  add2({ id: 'g_digit_sum_count', topic: 'counting', level: 4, replaces: [],
    insight: { en: 'Fix the first digit, then count the ways to finish. Organizing the count by the first digit keeps it from getting messy.',
               zh: '先固定第一位，再數後面有幾種。依第一位分類，數起來就不會亂。' },
    make: function (R) {
      var k = R.pick([2, 3]), S = k === 2 ? R.int(5, 15) : R.int(4, 12);
      var tails = function (rest, digits) { var c = 0; for (var n = 0; n < pow(10, digits); n++) if (dsum(n) === rest) c++; return c; };
      var parts = range(1, 9).map(function (f) { return [f, S - f >= 0 ? tails(S - f, k - 1) : 0]; }).filter(function (x) { return x[1] > 0; });
      var ans = parts.reduce(function (s, x) { return s + x[1]; }, 0);
      return { p: { k: k, S: S }, ans: ans, wrong: [ans - 1, ans + 1, S, S + 1, ans + 9],
        q: { en: 'How many ' + WORD[k] + '-digit numbers have digits that add up to ' + S + '?', zh: '有多少個' + ZHN[k] + '位數的各位數字和是 ' + S + '？' },
        steps: { en: ['Go through the first digit and count the ways to finish', parts.map(function (x) { return 'first digit ' + x[0] + ': ' + x[1]; }).join(', '), 'Total: ' + ans],
                 zh: ['依第一位分類，數後面有幾種', parts.map(function (x) { return '第一位是 ' + x[0] + '：' + x[1]; }).join('，'), '共 ' + ans + ' 個'] } };
    },
    check: function (p) { return range(pow(10, p.k - 1), pow(10, p.k) - 1).filter(function (n) { return dsum(n) === p.S; }).length; } });

  add2({ id: 'g_incl_excl', topic: 'counting', level: 4, replaces: ['p52'],
    insight: { en: 'Inclusion–exclusion: |A or B| = |A| + |B| − |both|. For "but not both", subtract the overlap twice.',
               zh: '排容原理：|A 或 B| = |A| + |B| − |兩者都是|。如果要「不能同時」，重疊的部分要扣兩次。' },
    make: function (R) {
      var pr = R.shuffle([2, 3, 5, 7]).slice(0, 2).sort(function (x, y) { return x - y; }), a = pr[0], b = pr[1], N = R.pick([100, 200, 300, 500, 1000]), xor = R.chance(0.5);
      var A = Math.floor(N / a), B = Math.floor(N / b), AB = Math.floor(N / (a * b)), ans = xor ? A + B - 2 * AB : A + B - AB;
      return { p: { a: a, b: b, N: N, xor: xor }, ans: ans, wrong: xor ? [A + B - AB, A + B, A + B - 3 * AB, A - AB] : [A + B, A + B - 2 * AB, A + B + AB, Math.max(A, B)],
        q: { en: 'How many positive integers up to ' + N + ' are divisible by ' + a + ' or by ' + b + (xor ? ', but not by both' : '') + '?', zh: '1 到 ' + N + ' 的正整數中，有幾個能被 ' + a + ' 或 ' + b + ' 整除' + (xor ? '，但不能同時被兩者整除' : '') + '？' },
        steps: { en: ['Divisible by ' + a + ': ' + A + '; by ' + b + ': ' + B, 'By both (that is, by ' + a * b + '): ' + AB, xor ? A + ' + ' + B + ' − 2 × ' + AB + ' = ' + ans : A + ' + ' + B + ' − ' + AB + ' = ' + ans],
                 zh: [a + ' 的倍數：' + A + ' 個；' + b + ' 的倍數：' + B + ' 個', '兩者都是（' + a * b + ' 的倍數）：' + AB + ' 個', xor ? A + ' + ' + B + ' − 2 × ' + AB + ' = ' + ans : A + ' + ' + B + ' − ' + AB + ' = ' + ans] } };
    },
    check: function (p) { return range(1, p.N).filter(function (n) { var x = n % p.a === 0, y = n % p.b === 0; return p.xor ? x !== y : x || y; }).length; } });

  add2({ id: 'g_digit_product', topic: 'counting', level: 5, replaces: ['p57'],
    insight: { en: 'First find the sets of three digits with the right product, then count the orders for each set (fewer orders when digits repeat).',
               zh: '先找出乘積正確的三個數字組合，再數每組有幾種排法（有重複數字時排法比較少）。' },
    make: function (R) {
      var P = R.pick([6, 8, 10, 12, 18, 20, 24, 30, 36]), sets = [];
      for (var a = 1; a <= 9; a++) for (var b = a; b <= 9; b++) for (var c = b; c <= 9; c++) if (a * b * c === P) sets.push([a, b, c]);
      var ways = function (s) { return s[0] === s[2] ? 1 : s[0] === s[1] || s[1] === s[2] ? 3 : 6; }, ans = sets.reduce(function (t, s) { return t + ways(s); }, 0);
      return { p: { P: P }, ans: ans, wrong: [sets.length, ans - 3, ans + 3, sets.length * 6],
        q: { en: 'How many three-digit positive integers have digits whose product is ' + P + '?', zh: '有多少個三位數的各位數字乘積是 ' + P + '？' },
        steps: { en: ['No digit can be 0. Digit sets with product ' + P + ': ' + sets.map(function (s) { return '{' + s.join(', ') + '}'; }).join(', '), 'Orders: ' + sets.map(function (s) { return ways(s); }).join(' + ') + ' (3 if a digit repeats, 6 if all differ)', 'Total: ' + ans],
                 zh: ['數字不能有 0。乘積是 ' + P + ' 的數字組合：' + sets.map(function (s) { return '{' + s.join(', ') + '}'; }).join('、'), '排法：' + sets.map(function (s) { return ways(s); }).join(' + ') + '（有重複是 3 種，全不同是 6 種）', '共 ' + ans + ' 個'] } };
    },
    check: function (p) { return range(100, 999).filter(function (n) { return String(n).split('').reduce(function (x, c) { return x * c; }, 1) === p.P; }).length; } });

  // ---------- probability ----------
  add2({ id: 'g_dice', topic: 'probability', level: 1, replaces: ['p10'],
    insight: { en: 'Two dice give 6 × 6 = 36 equally likely outcomes. Count the good ones — listing them as pairs (first die, second die) keeps you from missing any.',
               zh: '兩顆骰子共有 6 × 6 = 36 種同樣可能的結果。數出符合的——用（第一顆, 第二顆）列出來就不會漏掉。' },
    make: function (R) {
      var v = R.pick(['eq', 'eq', 'ge', 'prime', 'mult']), s = R.int(3, 11), t = R.int(8, 11), m = R.pick([3, 4, 5]);
      var test = { eq: function (x) { return x === s; }, ge: function (x) { return x >= t; }, prime: isPrime, mult: function (x) { return x % m === 0; } }[v];
      var good = [];
      for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) if (test(a + b)) good.push('(' + a + ', ' + b + ')');
      var c = good.length, ans = F(c, 36);
      var en = { eq: String(s), ge: 'at least ' + t, prime: 'a prime number', mult: 'a multiple of ' + m }[v], zh = { eq: '是 ' + s, ge: '至少是 ' + t, prime: '是質數', mult: '是 ' + m + ' 的倍數' }[v];
      return { p: { v: v, s: s, t: t, m: m }, ans: ans, kind: 'frac', prob: true, wrong: [F(c, 11), F(c + 1, 36), F(c - 1, 36), F(1, 6), F(c, 6)],
        q: { en: 'Two fair six-sided dice are rolled. What is the probability that the sum is ' + en + '?', zh: '同時擲兩顆公正的六面骰。點數和' + zh + '的機率是多少？' },
        steps: { en: ['There are 6 × 6 = 36 equally likely outcomes', 'Good outcomes: ' + (c <= 8 ? good.join(', ') + ' → ' : '') + c, c + '/36 = ' + fs(ans)],
                 zh: ['共有 6 × 6 = 36 種同樣可能的結果', '符合的結果：' + (c <= 8 ? good.join('、') + ' → ' : '') + c + ' 種', c + '/36 = ' + fs(ans)] } };
    },
    check: function (p) {
      var c = 0;
      for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) { var x = a + b; if (p.v === 'eq' ? x === p.s : p.v === 'ge' ? x >= p.t : p.v === 'prime' ? [2, 3, 5, 7, 11].indexOf(x) >= 0 : x % p.m === 0) c++; }
      return F(c, 36);
    } });

  add2({ id: 'g_marbles', topic: 'probability', level: 3, replaces: ['p28'],
    insight: { en: 'Without replacement, the second draw has one fewer marble — and one fewer of the color you took. Multiply along the way; add separate cases.',
               zh: '不放回時，第二次少了一顆，而且少的是第一次抽到的那個顏色。同一條路徑要相乘，不同情況要相加。' },
    make: function (R) {
      var r = R.int(2, 7), b = R.int(2, 8), n = r + b, v = R.pick(['rr', 'rb', 'same']), den = n * (n - 1), ans, wrong, en, zh, st;
      if (v === 'rr') {
        ans = F(r * (r - 1), den); wrong = [F(r * r, n * n), F(r, n), F(r * (r - 1), n * n), F(r - 1, n - 1)]; en = 'both are red'; zh = '兩顆都是紅色';
        st = { en: ['First red: ' + r + '/' + n, 'Second red (one red is gone): ' + (r - 1) + '/' + (n - 1), r + '/' + n + ' × ' + (r - 1) + '/' + (n - 1) + ' = ' + fs(ans)],
               zh: ['第一顆紅：' + r + '/' + n, '第二顆紅（少了一顆紅的）：' + (r - 1) + '/' + (n - 1), r + '/' + n + ' × ' + (r - 1) + '/' + (n - 1) + ' = ' + fs(ans)] };
      } else if (v === 'rb') {
        ans = F(2 * r * b, den); wrong = [F(r * b, den), F(2 * r * b, n * n), F(1, 2), F(r * b, n * n)]; en = 'one is red and one is blue'; zh = '一紅一藍';
        st = { en: ['Red then blue: ' + r + '/' + n + ' × ' + b + '/' + (n - 1) + ' = ' + fs(F(r * b, den)), 'Blue then red: ' + b + '/' + n + ' × ' + r + '/' + (n - 1) + ' = ' + fs(F(r * b, den)), 'Add: ' + fs(ans)],
               zh: ['先紅後藍：' + r + '/' + n + ' × ' + b + '/' + (n - 1) + ' = ' + fs(F(r * b, den)), '先藍後紅：' + b + '/' + n + ' × ' + r + '/' + (n - 1) + ' = ' + fs(F(r * b, den)), '相加：' + fs(ans)] };
      } else {
        ans = F(r * (r - 1) + b * (b - 1), den); wrong = [F(r * r + b * b, n * n), F(1, 2), F(r * (r - 1), den), F(b * (b - 1), den)]; en = 'they are the same color'; zh = '兩顆同色';
        st = { en: ['Both red: ' + r + '/' + n + ' × ' + (r - 1) + '/' + (n - 1) + ' = ' + fs(F(r * (r - 1), den)), 'Both blue: ' + b + '/' + n + ' × ' + (b - 1) + '/' + (n - 1) + ' = ' + fs(F(b * (b - 1), den)), 'Add: ' + fs(ans)],
               zh: ['兩顆紅：' + r + '/' + n + ' × ' + (r - 1) + '/' + (n - 1) + ' = ' + fs(F(r * (r - 1), den)), '兩顆藍：' + b + '/' + n + ' × ' + (b - 1) + '/' + (n - 1) + ' = ' + fs(F(b * (b - 1), den)), '相加：' + fs(ans)] };
      }
      return { p: { r: r, b: b, v: v }, ans: ans, kind: 'frac', prob: true, wrong: wrong, steps: st,
        q: { en: 'A bag has ' + r + ' red marbles and ' + b + ' blue marbles. Two marbles are drawn without putting the first one back. What is the probability that ' + en + '?',
             zh: '袋子裡有 ' + r + ' 顆紅色彈珠和 ' + b + ' 顆藍色彈珠。不放回地連續抽出兩顆，' + zh + '的機率是多少？' } };
    },
    check: function (p) {
      var bag = [], c = 0, t = 0, i, j;
      for (i = 0; i < p.r; i++) bag.push('r'); for (i = 0; i < p.b; i++) bag.push('b');
      for (i = 0; i < bag.length; i++) for (j = 0; j < bag.length; j++) if (i !== j) { t++; if (p.v === 'rr' ? bag[i] === 'r' && bag[j] === 'r' : p.v === 'rb' ? bag[i] !== bag[j] : bag[i] === bag[j]) c++; }
      return F(c, t);
    } });

  add2({ id: 'g_coins_prob', topic: 'probability', level: 3, replaces: ['p47'],
    insight: { en: '"At least one" is easiest through the complement: 1 − P(none). "Exactly k" means choosing which k coins are heads: C(n, k) of the 2<sup>n</sup> outcomes.',
               zh: '「至少一個」用補集最快：1 − P(一個都沒有)。「恰好 k 個」就是選哪 k 枚是正面：2<sup>n</sup> 種結果中有 C(n, k) 種。' },
    make: function (R) {
      var n = R.int(3, 6), k = R.int(1, n - 1), v = R.pick(['one', 'k', 'k']), tot = pow(2, n), ans, wrong, st, en, zh;
      if (v === 'one') {
        ans = F(tot - 1, tot); wrong = [F(1, tot), F(n, tot), F(1, 2), F(n - 1, n)]; en = 'at least one head'; zh = '至少出現一個正面';
        st = { en: ['2<sup>' + n + '</sup> = ' + tot + ' equally likely outcomes', 'Only one has no heads (all tails)', '1 − 1/' + tot + ' = ' + fs(ans)], zh: ['共 2<sup>' + n + '</sup> = ' + tot + ' 種結果', '只有一種完全沒有正面（全反面）', '1 − 1/' + tot + ' = ' + fs(ans)] };
      } else {
        ans = F(C(n, k), tot); wrong = [F(1, tot), F(k, n), F(C(n, k), tot / 2), F(1, 2), F(k, tot)]; en = 'exactly ' + k + ' head' + (k > 1 ? 's' : ''); zh = '恰好出現 ' + k + ' 個正面';
        st = { en: ['2<sup>' + n + '</sup> = ' + tot + ' equally likely outcomes', 'Choose which ' + k + ' coin' + (k > 1 ? 's are' : ' is') + ' heads: C(' + n + ', ' + k + ') = ' + C(n, k), C(n, k) + '/' + tot + ' = ' + fs(ans)], zh: ['共 2<sup>' + n + '</sup> = ' + tot + ' 種結果', '選哪 ' + k + ' 枚是正面：C(' + n + ', ' + k + ') = ' + C(n, k), C(n, k) + '/' + tot + ' = ' + fs(ans)] };
      }
      return { p: { n: n, k: k, v: v }, ans: ans, kind: 'frac', prob: true, wrong: wrong, steps: st,
        q: { en: cap(WORD[n]) + ' fair coins are flipped. What is the probability of getting ' + en + '?', zh: '同時擲 ' + n + ' 枚公正的硬幣，' + zh + '的機率是多少？' } };
    },
    check: function (p) { var c = 0, t = pow(2, p.n); for (var m = 0; m < t; m++) { var h = m.toString(2).split('').filter(function (x) { return x === '1'; }).length; if (p.v === 'one' ? h >= 1 : h === p.k) c++; } return F(c, t); } });

  add2({ id: 'g_dice_product', topic: 'probability', level: 4, replaces: [],
    insight: { en: 'Sometimes the opposite is easier: a product is odd only when BOTH numbers are odd. Otherwise, make the 6 × 6 table and count.',
               zh: '有時候反過來想比較快：乘積是奇數，只有兩個數都是奇數。其他情況就畫 6 × 6 的表來數。' },
    make: function (R) {
      var v = R.pick(['even', 'mult3', 'square', 'gt']), t = R.pick([10, 12, 15, 18, 20]);
      var test = { even: function (x) { return x % 2 === 0; }, mult3: function (x) { return x % 3 === 0; }, square: function (x) { return Math.sqrt(x) % 1 === 0; }, gt: function (x) { return x > t; } }[v];
      var c = 0; for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) if (test(a * b)) c++;
      var ans = F(c, 36), en = { even: 'even', mult3: 'a multiple of 3', square: 'a perfect square', gt: 'greater than ' + t }[v], zh = { even: '是偶數', mult3: '是 3 的倍數', square: '是完全平方數', gt: '大於 ' + t }[v];
      var st = v === 'even' ? { en: ['The product is odd only when both dice are odd: 3 × 3 = 9 outcomes', 'Even: 36 − 9 = 27', '27/36 = 3/4'], zh: ['只有兩顆都是奇數，乘積才是奇數：3 × 3 = 9 種', '偶數：36 − 9 = 27 種', '27/36 = 3/4'] }
        : v === 'mult3' ? { en: ['The product is NOT a multiple of 3 only when neither die shows 3 or 6: 4 × 4 = 16 outcomes', 'Multiple of 3: 36 − 16 = 20', '20/36 = 5/9'], zh: ['兩顆都不是 3 或 6，乘積才不是 3 的倍數：4 × 4 = 16 種', '3 的倍數：36 − 16 = 20 種', '20/36 = 5/9'] }
        : { en: ['36 equally likely outcomes', 'Products that are ' + en + ': ' + c + ' outcomes', c + '/36 = ' + fs(ans)], zh: ['共 36 種同樣可能的結果', '乘積' + zh + '：' + c + ' 種', c + '/36 = ' + fs(ans)] };
      return { p: { v: v, t: t }, ans: ans, kind: 'frac', prob: true, wrong: [F(1, 2), F(36 - c, 36), F(c, 6 * 7), F(c + 2, 36)], steps: st,
        q: { en: 'Two fair six-sided dice are rolled. What is the probability that the product of the two numbers is ' + en + '?', zh: '同時擲兩顆公正的六面骰。兩數乘積' + zh + '的機率是多少？' } };
    },
    check: function (p) {
      var c = 0;
      for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) { var x = a * b; if (p.v === 'even' ? x % 2 === 0 : p.v === 'mult3' ? x % 3 === 0 : p.v === 'square' ? [1, 4, 9, 16, 25, 36].indexOf(x) >= 0 : x > p.t) c++; }
      return F(c, 36);
    } });

  add2({ id: 'g_square_cube', topic: 'probability', level: 5, replaces: ['p54'],
    insight: { en: 'Count squares and cubes separately, then subtract the numbers that are both (sixth powers) so they are not counted twice.',
               zh: '分別數完全平方數和完全立方數，再扣掉兩者都是的（六次方數），才不會重複計算。' },
    make: function (R) {
      var N = R.pick([50, 100, 200, 300, 500, 1000]), sq = Math.floor(Math.sqrt(N) + 1e-9), cu = Math.round(Math.pow(N, 1 / 3));
      while (cu * cu * cu > N) cu--; while ((cu + 1) * (cu + 1) * (cu + 1) <= N) cu++;
      var both = 1; while (pow(both + 1, 6) <= N) both++;
      var c = sq + cu - both, ans = F(c, N);
      return { p: { N: N }, ans: ans, kind: 'frac', prob: true, wrong: [F(sq + cu, N), F(sq, N), F(cu, N), F(c + 1, N)],
        q: { en: 'An integer from 1 to ' + N + ' is chosen at random. What is the probability that it is a perfect square or a perfect cube?', zh: '從 1 到 ' + N + ' 隨機選一個整數，它是完全平方數或完全立方數的機率是多少？' },
        steps: { en: ['Squares: 1², 2², …, ' + sq + '² → ' + sq, 'Cubes: 1³, …, ' + cu + '³ → ' + cu + '; both (sixth powers): ' + both, sq + ' + ' + cu + ' − ' + both + ' = ' + c + ', so ' + c + '/' + N + ' = ' + fs(ans)],
                 zh: ['平方數：1², 2², …, ' + sq + '² → ' + sq + ' 個', '立方數：1³, …, ' + cu + '³ → ' + cu + ' 個；兩者都是（六次方數）：' + both + ' 個', sq + ' + ' + cu + ' − ' + both + ' = ' + c + '，所以 ' + c + '/' + N + ' = ' + fs(ans)] } };
    },
    check: function (p) { var S = {}, i; for (i = 1; i * i <= p.N; i++) S[i * i] = 1; for (i = 1; i * i * i <= p.N; i++) S[i * i * i] = 1; return F(Object.keys(S).length, p.N); } });

  // ---------- geometry ----------
  add2({ id: 'g_angle_ratio', topic: 'geometry', level: 1, replaces: [],
    insight: { en: 'The angles of a triangle add to 180°. With a ratio, find how many degrees one "part" is.',
               zh: '三角形三個角加起來是 180°。給比例時，先求一「份」是幾度。' },
    make: function (R) {
      var p, q, r, s;
      do { p = R.int(1, 6); q = R.int(1, 7); r = R.int(2, 9); s = p + q + r; } while (180 % s || p === q || q === r || p === r);
      var u = 180 / s, mx = Math.max(p, q, r), mn = Math.min(p, q, r), ans = mx * u;
      return { p: { p: p, q: q, r: r }, ans: ans, wrong: [mn * u, (s - mx - mn) * u, u, 180 - ans],
        q: { en: 'The angles of a triangle are in the ratio ' + p + ' : ' + q + ' : ' + r + '. What is the measure of the largest angle, in degrees?', zh: '一個三角形三個角的比是 ' + p + ' : ' + q + ' : ' + r + '，最大的角是幾度？' },
        steps: { en: ['The parts add up to ' + p + ' + ' + q + ' + ' + r + ' = ' + s, 'One part: 180° ÷ ' + s + ' = ' + u + '°', 'Largest: ' + mx + ' × ' + u + '° = ' + ans + '°'],
                 zh: ['份數總和：' + p + ' + ' + q + ' + ' + r + ' = ' + s, '一份：180° ÷ ' + s + ' = ' + u + '°', '最大角：' + mx + ' × ' + u + '° = ' + ans + '°'] } };
    },
    check: function (p) { for (var u = 1; u <= 180; u++) if ((p.p + p.q + p.r) * u === 180) return Math.max(p.p, p.q, p.r) * u; } });

  add2({ id: 'g_rect_cut', topic: 'geometry', level: 1, replaces: ['p06'],
    insight: { en: 'Area of a cut-out shape = area of the whole − area removed. A right triangle is half of a rectangle: ½ × leg × leg.',
               zh: '剪掉一塊的面積 = 整個的面積 − 剪掉的面積。直角三角形是長方形的一半：½ × 股 × 股。' },
    make: function (R) {
      var W, H, a, b;
      do { W = R.int(6, 14); H = R.int(4, W); a = R.int(2, W - 2); b = R.int(2, H - 1); } while ((a * b) % 2);
      var ans = W * H - a * b / 2;
      return { p: { W: W, H: H, a: a, b: b }, ans: ans, wrong: [W * H - a * b, W * H, a * b / 2, W * H - a - b], fig: figRectCut(W, H, a, b),
        q: { en: 'A rectangle is ' + W + ' units by ' + H + ' units. A right triangle with legs ' + a + ' and ' + b + ' is cut off one corner, as shown. What is the area of the shape that is left?',
             zh: '一個長方形長 ' + W + '、寬 ' + H + '。如圖，從一個角剪掉一個兩股分別為 ' + a + ' 和 ' + b + ' 的直角三角形。剩下的圖形面積是多少？' },
        steps: { en: ['Rectangle: ' + W + ' × ' + H + ' = ' + W * H, 'Triangle: ½ × ' + a + ' × ' + b + ' = ' + a * b / 2, W * H + ' − ' + a * b / 2 + ' = ' + ans],
                 zh: ['長方形：' + W + ' × ' + H + ' = ' + W * H, '三角形：½ × ' + a + ' × ' + b + ' = ' + a * b / 2, W * H + ' − ' + a * b / 2 + ' = ' + ans] } };
    },
    check: function (p) { var P = [[0, 0], [p.W, 0], [p.W, p.H - p.b], [p.W - p.a, p.H], [0, p.H]], s = 0; for (var i = 0; i < P.length; i++) { var u = P[i], v = P[(i + 1) % P.length]; s += u[0] * v[1] - v[0] * u[1]; } return Math.abs(s) / 2; } });

  add2({ id: 'g_perimeter', topic: 'geometry', level: 1, replaces: [],
    insight: { en: 'Use the area to find the missing side first (area = length × width), then add up all four sides.',
               zh: '先用面積求出另一邊（面積 = 長 × 寬），再把四個邊加起來。' },
    make: function (R) {
      var s = R.int(3, 15), w = R.int(2, 15), A = s * w, ans = 2 * (s + w);
      return { p: { A: A, s: s }, ans: ans, wrong: [A, s + w, 4 * s, 2 * s + w, A / 2],
        q: { en: 'A rectangle has an area of ' + A + ' square units, and one of its sides is ' + s + ' units long. What is its perimeter?', zh: '一個長方形的面積是 ' + A + ' 平方單位，其中一邊長 ' + s + '。它的周長是多少？' },
        steps: { en: ['Other side: ' + A + ' ÷ ' + s + ' = ' + w, 'Perimeter: 2 × (' + s + ' + ' + w + ') = ' + ans], zh: ['另一邊：' + A + ' ÷ ' + s + ' = ' + w, '周長：2 × (' + s + ' + ' + w + ') = ' + ans] } };
    },
    check: function (p) { for (var w = 1; w <= p.A; w++) if (w * p.s === p.A) return w + w + p.s + p.s; } });

  add2({ id: 'g_tri_angles', topic: 'geometry', level: 2, replaces: ['p12'],
    insight: { en: 'Name the smallest angle x, write the others in terms of x, and use the fact that the angles add to 180°.',
               zh: '把一個角設為 x，用 x 表示其他角，再利用三個角加起來是 180°。' },
    make: function (R) {
      var k = R.pick([2, 3]), B, t;
      do { B = R.int(15, 50); t = 180 - (k + 2) * B; } while (t < 5 || t > 60);
      var A = k * B, Cc = B + t;
      return { p: { k: k, t: t }, ans: A, wrong: [B, Cc, 180 - A, A + t],
        q: { en: 'In triangle ABC, angle A is ' + (k === 2 ? 'twice' : 'three times') + ' angle B, and angle C is ' + t + '° more than angle B. What is the measure of angle A, in degrees?', zh: '在三角形 ABC 中，∠A 是 ∠B 的 ' + k + ' 倍，∠C 比 ∠B 大 ' + t + '°。∠A 是幾度？' },
        steps: { en: ['Let ∠B = x. Then ∠A = ' + k + 'x and ∠C = x + ' + t + '°', k + 'x + x + x + ' + t + ' = 180, so ' + (k + 2) + 'x = ' + (180 - t) + ' and x = ' + B, '∠A = ' + k + ' × ' + B + ' = ' + A + '°'],
                 zh: ['設 ∠B = x，則 ∠A = ' + k + 'x，∠C = x + ' + t + '°', k + 'x + x + x + ' + t + ' = 180，所以 ' + (k + 2) + 'x = ' + (180 - t) + '，x = ' + B, '∠A = ' + k + ' × ' + B + ' = ' + A + '°'] } };
    },
    check: function (p) { for (var B = 1; B < 180; B++) if (p.k * B + B + B + p.t === 180) return p.k * B; } });

  add2({ id: 'g_clock', topic: 'geometry', level: 2, replaces: ['p13'],
    insight: { en: 'The minute hand moves 6° per minute. The hour hand moves 30° per hour AND 0.5° per minute — forgetting that it moves is the usual mistake.',
               zh: '分針每分鐘走 6°。時針每小時走 30°，而且每分鐘也走 0.5°——忘了時針也會動是最常見的錯。' },
    make: function (R) {
      var h, m, d, ans;
      do { h = R.int(1, 11); m = 2 * R.int(1, 29); d = Math.abs(30 * h + 0.5 * m - 6 * m); ans = Math.min(d, 360 - d); } while (ans === 0);
      var naive = Math.abs(30 * h - 6 * m), mm = (m < 10 ? '0' : '') + m;
      return { p: { h: h, m: m }, ans: ans, wrong: [Math.min(naive, 360 - naive), 360 - ans, ans + 15, Math.abs(ans - 30)],
        q: { en: 'What is the smaller angle, in degrees, between the hour hand and the minute hand of a clock at ' + h + ':' + mm + '?', zh: '在 ' + h + ':' + mm + ' 時，時鐘的時針與分針所夾的較小角是幾度？' },
        steps: { en: ['Minute hand: ' + m + ' × 6° = ' + 6 * m + '° past the 12', 'Hour hand: ' + h + ' × 30° + ' + m + ' × 0.5° = ' + (30 * h + 0.5 * m) + '° past the 12', 'Difference: ' + d + '°' + (d > 180 ? ', so the smaller angle is 360° − ' + d + '° = ' + ans + '°' : '')],
                 zh: ['分針：' + m + ' × 6° = 從 12 起 ' + 6 * m + '°', '時針：' + h + ' × 30° + ' + m + ' × 0.5° = 從 12 起 ' + (30 * h + 0.5 * m) + '°', '相差 ' + d + '°' + (d > 180 ? '，較小的角是 360° − ' + d + '° = ' + ans + '°' : '')] } };
    },
    check: function (p) { var mh = 0, hh = 0; for (var i = 0; i < p.h * 60 + p.m; i++) { mh = (mh + 6) % 360; hh += 0.5; } var d = Math.abs(hh % 360 - mh); return Math.min(d, 360 - d); } });

  add2({ id: 'g_pythag', topic: 'geometry', level: 2, replaces: ['p17'],
    insight: { en: 'Right triangle → Pythagorean theorem: leg² + leg² = hypotenuse². Knowing common triples (3-4-5, 5-12-13, 8-15-17, 7-24-25) saves time.',
               zh: '直角三角形 → 畢氏定理：股² + 股² = 斜邊²。記得常見的勾股數（3-4-5、5-12-13、8-15-17、7-24-25）可以省時間。' },
    make: function (R) {
      var t, k, a, b, c;
      do { t = R.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]]); k = R.int(1, 4); a = t[0] * k; b = t[1] * k; c = t[2] * k; } while (c > 60);
      if (R.chance(0.5)) { var x = a; a = b; b = x; }
      var ladder = R.chance(0.55);
      if (ladder) return { p: { v: 'leg', a: a, c: c }, ans: b, wrong: [c - a, c + a, (a + c) / 2, b + 1],
        q: { en: 'A ' + c + '-foot ladder leans against a vertical wall. Its foot is ' + a + ' feet from the base of the wall. How high up the wall does the ladder reach, in feet?', zh: '一把 ' + c + ' 英尺長的梯子靠在垂直的牆上，梯腳離牆腳 ' + a + ' 英尺。梯子靠在牆上的高度是幾英尺？' },
        steps: { en: ['The wall, the ground and the ladder form a right triangle with hypotenuse ' + c, 'h² = ' + c + '² − ' + a + '² = ' + c * c + ' − ' + a * a + ' = ' + b * b, 'h = ' + b],
                 zh: ['牆、地面和梯子形成直角三角形，斜邊是 ' + c, 'h² = ' + c + '² − ' + a + '² = ' + c * c + ' − ' + a * a + ' = ' + b * b, 'h = ' + b] } };
      return { p: { v: 'hyp', a: a, b: b }, ans: c, wrong: [a + b, Math.max(a, b) + 1, (a + b) / 2, Math.abs(a - b)],
        q: { en: 'A rectangular field is ' + a + ' m by ' + b + ' m. How long is the straight path from one corner to the opposite corner, in meters?', zh: '一塊長方形的田長 ' + a + ' 公尺、寬 ' + b + ' 公尺。從一個角直直走到對角，路徑有幾公尺？' },
        steps: { en: ['The diagonal is the hypotenuse: d² = ' + a + '² + ' + b + '² = ' + (a * a + b * b), 'd = ' + c], zh: ['對角線是斜邊：d² = ' + a + '² + ' + b + '² = ' + (a * a + b * b), 'd = ' + c] } };
    },
    check: function (p) { for (var x = 1; x < 200; x++) if (p.v === 'leg' ? p.a * p.a + x * x === p.c * p.c : p.a * p.a + p.b * p.b === x * x) return x; } });

  add2({ id: 'g_circle_square', topic: 'geometry', level: 2, replaces: ['p18'],
    insight: { en: 'Shaded area = big shape − small shape. A circle inside a square touching all four sides has diameter = side, so radius = half the side.',
               zh: '陰影面積 = 大圖形 − 小圖形。內切於正方形的圓，直徑等於邊長，所以半徑是邊長的一半。' },
    make: function (R) {
      var s = R.pick([4, 6, 8, 10, 12, 14, 20]), circ = 3.14 * (s / 2) * (s / 2), ans = s * s - circ;
      return { p: { s: s }, ans: ans, kind: 'num', wrong: [circ, s * s - 3.14 * s, s * s - 3.14 * (s / 2), 4 * ans], fig: figSquareCircle(s),
        q: { en: 'A circle fits exactly inside a square with side length ' + s + '. Using π ≈ 3.14, what is the area inside the square but outside the circle?', zh: '一個圓剛好內切於邊長 ' + s + ' 的正方形。取 π ≈ 3.14，正方形內、圓外的面積是多少？' },
        steps: { en: ['Square: ' + s + ' × ' + s + ' = ' + s * s, 'Radius ' + s / 2 + ', so the circle is about 3.14 × ' + s / 2 + '² = ' + num(circ), s * s + ' − ' + num(circ) + ' = ' + num(ans)],
                 zh: ['正方形：' + s + ' × ' + s + ' = ' + s * s, '半徑 ' + s / 2 + '，圓面積約 3.14 × ' + s / 2 + '² = ' + num(circ), s * s + ' − ' + num(circ) + ' = ' + num(ans)] } };
    },
    check: function (p) { return (p.s * p.s * 100 - 314 * (p.s / 2) * (p.s / 2)) / 100; } });

  add2({ id: 'g_polygon', topic: 'geometry', level: 3, replaces: ['p45'],
    insight: { en: 'The exterior angles of any convex polygon add up to 360°. In a regular polygon they are equal, and interior = 180° − exterior.',
               zh: '任何凸多邊形的外角和都是 360°。正多邊形的外角都一樣，內角 = 180° − 外角。' },
    make: function (R) {
      var n = R.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]), ang = 180 - 360 / n, sides = R.chance(0.4);
      if (sides) return { p: { v: 'n', x: ang }, ans: n, min: 3, wrong: [n - 2, n + 2, Math.round(360 / ang), 2 * n],
        q: { en: 'Each interior angle of a regular polygon measures ' + ang + '°. How many sides does the polygon have?', zh: '一個正多邊形的每個內角都是 ' + ang + '°，它有幾條邊？' },
        steps: { en: ['Each exterior angle is 180° − ' + ang + '° = ' + (180 - ang) + '°', 'The exterior angles add up to 360°, so n = 360 ÷ ' + (180 - ang) + ' = ' + n], zh: ['每個外角是 180° − ' + ang + '° = ' + (180 - ang) + '°', '外角和是 360°，所以 n = 360 ÷ ' + (180 - ang) + ' = ' + n] } };
      return { p: { v: 'a', n: n }, ans: ang, wrong: [180 * (n - 2), 360 / n, 180 - 180 / n, ang + 10],
        q: { en: 'What is the measure, in degrees, of each interior angle of a regular ' + n + '-sided polygon?', zh: '正 ' + n + ' 邊形的每個內角是幾度？' },
        steps: { en: ['Each exterior angle: 360° ÷ ' + n + ' = ' + 360 / n + '°', 'Interior angle: 180° − ' + 360 / n + '° = ' + ang + '°'], zh: ['每個外角：360° ÷ ' + n + ' = ' + 360 / n + '°', '內角：180° − ' + 360 / n + '° = ' + ang + '°'] } };
    },
    check: function (p) { if (p.v === 'a') return 180 * (p.n - 2) / p.n; for (var n = 3; n < 400; n++) if (180 * (n - 2) === p.x * n) return n; } });

  add2({ id: 'g_box', topic: 'geometry', level: 3, replaces: ['p37'],
    insight: { en: 'A box has three pairs of matching faces. Find the three different face areas and double their sum.',
               zh: '長方體有三對一樣的面。算出三種不同的面積，相加再乘 2。' },
    make: function (R) {
      var a = R.int(2, 8), b = R.int(2, 9), c = R.int(3, 10), ans = 2 * (a * b + b * c + a * c);
      return { p: { a: a, b: b, c: c }, ans: ans, wrong: [a * b * c, a * b + b * c + a * c, 4 * (a + b + c), ans + 2 * a * b],
        q: { en: 'What is the surface area of a ' + a + ' × ' + b + ' × ' + c + ' rectangular box?', zh: '一個 ' + a + ' × ' + b + ' × ' + c + ' 的長方體，表面積是多少？' },
        steps: { en: ['Three kinds of faces: ' + a + ' × ' + b + ' = ' + a * b + ', ' + b + ' × ' + c + ' = ' + b * c + ', ' + a + ' × ' + c + ' = ' + a * c, 'Each appears twice: 2 × (' + a * b + ' + ' + b * c + ' + ' + a * c + ') = ' + ans],
                 zh: ['三種面：' + a + ' × ' + b + ' = ' + a * b + '，' + b + ' × ' + c + ' = ' + b * c + '，' + a + ' × ' + c + ' = ' + a * c, '每種有兩面：2 × (' + a * b + ' + ' + b * c + ' + ' + a * c + ') = ' + ans] } };
    },
    check: function (p) {
      var f = 0, ins = function (x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < p.a && y < p.b && z < p.c; };
      for (var x = 0; x < p.a; x++) for (var y = 0; y < p.b; y++) for (var z = 0; z < p.c; z++) [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) { if (!ins(x + d[0], y + d[1], z + d[2])) f++; });
      return f;
    } });

  add2({ id: 'g_tri_area', topic: 'geometry', level: 3, replaces: ['p30'],
    insight: { en: 'Box it in: draw the smallest rectangle around the triangle, then subtract the right triangles in the corners.',
               zh: '用框框住：畫出包住三角形的最小長方形，再減掉角落的直角三角形。' },
    make: function (R) {
      var P, area, minx, maxx, miny, maxy;
      for (;;) {
        P = [[R.int(0, 8), R.int(0, 8)], [R.int(0, 8), R.int(0, 8)], [R.int(0, 8), R.int(0, 8)]];
        area = Math.abs((P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1])) / 2;
        minx = Math.min(P[0][0], P[1][0], P[2][0]); maxx = Math.max(P[0][0], P[1][0], P[2][0]); miny = Math.min(P[0][1], P[1][1], P[2][1]); maxy = Math.max(P[0][1], P[1][1], P[2][1]);
        var onBox = P.every(function (q) { return q[0] === minx || q[0] === maxx || q[1] === miny || q[1] === maxy; });
        if (area >= 4 && onBox && maxx - minx >= 3 && maxy - miny >= 3) break;
      }
      var w = maxx - minx, h = maxy - miny, cut = [0, 1, 2].map(function (i) { var u = P[i], v = P[(i + 1) % 3]; return Math.abs((v[0] - u[0]) * (v[1] - u[1])) / 2; });
      var pts = P.map(function (q) { return '(' + q[0] + ', ' + q[1] + ')'; });
      return { p: { P: P }, ans: area, kind: 'num', clean: function (v) { return Number.isInteger(v * 2); }, wrong: [w * h, w * h / 2, 2 * area, area + 2], fig: figTri(P),
        q: { en: 'What is the area of the triangle with vertices ' + pts[0] + ', ' + pts[1] + ' and ' + pts[2] + '?', zh: '頂點為 ' + pts.join('、') + ' 的三角形面積是多少？' },
        steps: { en: ['The smallest rectangle around it is ' + w + ' × ' + h + ' = ' + w * h, 'The right triangles cut off along the three sides: ' + cut.map(num).join(', '), w * h + ' − ' + cut.map(num).join(' − ') + ' = ' + num(area)],
                 zh: ['包住它的最小長方形是 ' + w + ' × ' + h + ' = ' + w * h, '三個邊外側的直角三角形：' + cut.map(num).join('、'), w * h + ' − ' + cut.map(num).join(' − ') + ' = ' + num(area)] } };
    },
    check: function (p) {   // Pick's theorem: area = interior points + boundary points / 2 − 1
      var P = p.P, B = 0, I = 0, i;
      for (i = 0; i < 3; i++) B += gcd(P[(i + 1) % 3][0] - P[i][0], P[(i + 1) % 3][1] - P[i][1]);
      var side = function (a, b, x, y) { return (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); };
      for (var x = 0; x <= 8; x++) for (var y = 0; y <= 8; y++) { var s = [side(P[0], P[1], x, y), side(P[1], P[2], x, y), side(P[2], P[0], x, y)]; if (s.every(function (v) { return v > 0; }) || s.every(function (v) { return v < 0; })) I++; }
      return I + B / 2 - 1;
    } });

  add2({ id: 'g_shadow', topic: 'geometry', level: 3, replaces: ['p41'],
    insight: { en: 'At the same moment, the sun makes similar triangles: height ÷ shadow is the same for everything.',
               zh: '同一時間，陽光形成相似三角形：所有東西的「高度 ÷ 影長」都一樣。' },
    make: function (R) {
      var h, s, S, H;
      do { h = R.pick([5, 6]); s = R.pick([2, 3, 4, 8, 10]); S = R.int(4, 30) * 2; H = h * S / s; } while (!Number.isInteger(H) || h === s);
      return { p: { h: h, s: s, S: S }, ans: H, wrong: [S * s / h, S + h - s, h * S, S - s + h + 2],
        q: { en: 'A ' + h + '-foot-tall person casts a ' + s + '-foot shadow. At the same moment, a tree casts a ' + S + '-foot shadow. How tall is the tree, in feet?', zh: '一個身高 ' + h + ' 英尺的人影子長 ' + s + ' 英尺。同一時間，一棵樹的影子長 ' + S + ' 英尺。這棵樹有幾英尺高？' },
        steps: { en: ['Height ÷ shadow is the same: ' + h + ' ÷ ' + s + ' = H ÷ ' + S, 'H = ' + S + ' × ' + h + ' ÷ ' + s + ' = ' + H], zh: ['高度 ÷ 影長相同：' + h + ' ÷ ' + s + ' = H ÷ ' + S, 'H = ' + S + ' × ' + h + ' ÷ ' + s + ' = ' + H] } };
    },
    check: function (p) { for (var H = 1; H < 1000; H++) if (H * p.s === p.h * p.S) return H; } });

  add2({ id: 'g_ring', topic: 'geometry', level: 4, replaces: ['p56'],
    insight: { en: 'The ring is the big circle minus the small circle: π(R² − r²). Subtract the areas, not the radii.',
               zh: '圓環 = 大圓 − 小圓：π(R² − r²)。要相減的是面積，不是半徑。' },
    make: function (R) {
      var r = R.int(1, 8), Rr = R.int(r + 1, 10), ans = Rr * Rr - r * r;
      return { p: { r: r, R: Rr }, ans: ans, kind: 'pi', min: 1, wrong: [(Rr - r) * (Rr - r), Rr * Rr + r * r, 2 * (Rr - r), Rr * Rr], fig: figRing(r, Rr),
        q: { en: 'Two circles have the same center. Their radii are ' + r + ' and ' + Rr + '. What is the area of the ring between them?', zh: '兩個同心圓的半徑分別是 ' + r + ' 和 ' + Rr + '。兩圓之間環形區域的面積是多少？' },
        steps: { en: ['Big circle: π × ' + Rr + '² = ' + Rr * Rr + 'π', 'Small circle: π × ' + r + '² = ' + r * r + 'π', 'Ring: ' + Rr * Rr + 'π − ' + r * r + 'π = ' + ans + 'π'], zh: ['大圓：π × ' + Rr + '² = ' + Rr * Rr + 'π', '小圓：π × ' + r + '² = ' + r * r + 'π', '圓環：' + Rr * Rr + 'π − ' + r * r + 'π = ' + ans + 'π'] } };
    },
    check: function (p) { return (p.R - p.r) * (p.R + p.r); } });

  add2({ id: 'g_painted', topic: 'geometry', level: 4, replaces: ['p36'],
    insight: { en: 'Sort the small cubes by where they sit: corners (3 painted faces), edges (2), face centers (1), and the hidden inside (0).',
               zh: '依位置分類：角上（3 面塗色）、稜上（2 面）、面的中間（1 面）、藏在裡面（0 面）。' },
    make: function (R) {
      var n = R.int(3, 7), k = R.pick([0, 1, 2, 3, 1, 2]), m = n - 2, cnt = [m * m * m, 6 * m * m, 12 * m, 8], ans = cnt[k];
      var st = {
        3: { en: ['Only the corner cubes have 3 painted faces', 'A cube has 8 corners → 8'], zh: ['只有角上的小正方體有 3 面塗色', '正方體有 8 個角 → 8 個'] },
        2: { en: ['Cubes with 2 painted faces sit along the edges, but not at the corners', 'Each of the 12 edges has ' + n + ' − 2 = ' + m, '12 × ' + m + ' = ' + ans], zh: ['2 面塗色的在稜上，但不在角上', '12 條稜每條有 ' + n + ' − 2 = ' + m + ' 個', '12 × ' + m + ' = ' + ans] },
        1: { en: ['Cubes with 1 painted face are in the middle of a face', 'Each face has (' + n + ' − 2)² = ' + m * m, '6 × ' + m * m + ' = ' + ans], zh: ['1 面塗色的在每個面的中間', '每個面有 (' + n + ' − 2)² = ' + m * m + ' 個', '6 × ' + m * m + ' = ' + ans] },
        0: { en: ['The unpainted cubes form the inside cube', 'It is ' + m + ' × ' + m + ' × ' + m, m + '³ = ' + ans], zh: ['沒塗色的組成裡面的小正方體', '它是 ' + m + ' × ' + m + ' × ' + m, m + '³ = ' + ans] } }[k];
      return { p: { n: n, k: k }, ans: ans, min: k === 0 ? 1 : 0, wrong: cnt.filter(function (_, i) { return i !== k; }).concat([n * n * n - ans, 6 * n * n]), steps: st,
        q: { en: 'A ' + n + ' × ' + n + ' × ' + n + ' cube is painted on the outside and then cut into ' + n * n * n + ' unit cubes. How many unit cubes have ' + (k === 0 ? 'no painted faces' : 'exactly ' + WORD[k] + ' painted face' + (k > 1 ? 's' : '')) + '?',
             zh: '一個 ' + n + ' × ' + n + ' × ' + n + ' 的正方體外表全部塗上顏色，再切成 ' + n * n * n + ' 個小正方體。' + (k === 0 ? '完全沒有塗色' : '恰好有 ' + k + ' 面塗色') + '的小正方體有幾個？' } };
    },
    check: function (p) { var c = 0, e = function (v) { return v === 0 || v === p.n - 1 ? 1 : 0; }; for (var x = 0; x < p.n; x++) for (var y = 0; y < p.n; y++) for (var z = 0; z < p.n; z++) if (e(x) + e(y) + e(z) === p.k) c++; return c; } });

  add2({ id: 'g_altitude', topic: 'geometry', level: 5, replaces: ['p59'],
    insight: { en: 'Compute the area two ways: ½ × leg × leg, and ½ × hypotenuse × altitude. Set them equal.',
               zh: '用兩種方法算面積：½ × 股 × 股，以及 ½ × 斜邊 × 高。兩者相等。' },
    make: function (R) {
      var t, k;
      do { t = R.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 12, 15], [6, 8, 10], [12, 16, 20], [15, 20, 25]]); k = R.int(1, 3); } while (t[2] * k > 50 || !Number.isInteger(t[0] * k * t[1] * k / (t[2] * k) * 100));
      var a = t[0] * k, b = t[1] * k, c = t[2] * k, h = a * b / c;
      return { p: { a: a, b: b }, ans: h, kind: 'num', wrong: [c / 2, (a + b) / 2, a * b / 2, h + 1, Math.min(a, b) - 1],
        q: { en: 'A right triangle has legs ' + a + ' and ' + b + '. What is the length of the altitude from the right angle to the hypotenuse?', zh: '一個直角三角形的兩股長是 ' + a + ' 和 ' + b + '。從直角頂點到斜邊的高是多少？' },
        steps: { en: ['Hypotenuse: √(' + a + '² + ' + b + '²) = ' + c, '½ × ' + a + ' × ' + b + ' = ½ × ' + c + ' × h', 'h = ' + a + ' × ' + b + ' ÷ ' + c + ' = ' + num(h)], zh: ['斜邊：√(' + a + '² + ' + b + '²) = ' + c, '½ × ' + a + ' × ' + b + ' = ½ × ' + c + ' × h', 'h = ' + a + ' × ' + b + ' ÷ ' + c + ' = ' + num(h)] } };
    },
    check: function (p) { return Math.round(p.a * Math.sin(Math.atan2(p.b, p.a)) * 1e6) / 1e6; } });   // similar triangles: h = a × sin(angle opposite b)

  // ---------- logic ----------
  var DAYS = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] };
  var MONTHS = ['January', 'March', 'May', 'July', 'August', 'October', 'December'], MNUM = [1, 3, 5, 7, 8, 10, 12];
  add2({ id: 'g_calendar', topic: 'logic', level: 2, replaces: [],
    insight: { en: 'The days of the week repeat every 7 days, so only the remainder when you divide the number of days by 7 matters.',
               zh: '星期每 7 天循環一次，所以只要看相差的天數除以 7 的餘數。' },
    make: function (R) {
      var mi = R.int(0, 6), D = R.int(1, 10), E = R.int(D + 9, 31), W = R.int(0, 6), diff = E - D, r = diff % 7, ans = (W + r) % 7, o = R.int(0, 4);
      var idx = range(0, 4).map(function (i) { return (ans - o + i + 7) % 7; });
      return { p: { D: D, E: E, W: W }, ans: ans, words: { en: idx.map(function (i) { return DAYS.en[i]; }), zh: idx.map(function (i) { return DAYS.zh[i]; }) }, at: o,
        q: { en: MONTHS[mi] + ' ' + D + ' is a ' + DAYS.en[W] + '. What day of the week is ' + MONTHS[mi] + ' ' + E + ' of the same year?', zh: '某年 ' + MNUM[mi] + ' 月 ' + D + ' 日是' + DAYS.zh[W] + '。同一年 ' + MNUM[mi] + ' 月 ' + E + ' 日是星期幾？' },
        steps: { en: [E + ' − ' + D + ' = ' + diff + ' days later', diff + ' = 7 × ' + Math.floor(diff / 7) + ' + ' + r + ', so it is the same as ' + r + ' day' + (r === 1 ? '' : 's') + ' later', r + ' day' + (r === 1 ? '' : 's') + ' after ' + DAYS.en[W] + ' is ' + DAYS.en[ans]],
                 zh: [E + ' − ' + D + ' = ' + diff + ' 天後', diff + ' = 7 × ' + Math.floor(diff / 7) + ' + ' + r + '，等於 ' + r + ' 天後', DAYS.zh[W] + '再過 ' + r + ' 天是' + DAYS.zh[ans]] } };
    },
    check: function (p) { var w = p.W; for (var d = p.D; d < p.E; d++) w = (w + 1) % 7; return w; } });

  add2({ id: 'g_socks', topic: 'logic', level: 2, replaces: [],
    insight: { en: 'Pigeonhole principle: imagine the unluckiest possible draws. Count how many you can take while still failing — one more guarantees success.',
               zh: '鴿籠原理：想像運氣最差的抽法。算出「還沒成功」最多能抽幾個，再多抽一個就一定成功。' },
    make: function (R) {
      var cols = R.shuffle([['red', '紅'], ['blue', '藍'], ['green', '綠'], ['black', '黑'], ['white', '白']]).slice(0, R.int(3, 4)), cnt = cols.map(function () { return R.int(3, 10); });
      var one = R.chance(0.35), k = R.int(2, 3), list = cols.map(function (c, i) { return cnt[i] + ' ' + c[0]; }), listZ = cols.map(function (c, i) { return cnt[i] + ' 隻' + c[1] + '色'; }), ans, st, q;
      if (one) {
        var tot = cnt.reduce(function (a, b) { return a + b; }, 0), ci = 0; ans = tot - cnt[ci] + 1;
        q = { en: 'A drawer has ' + listEn(list) + ' socks. In the dark, what is the smallest number of socks you must take out to be sure of getting at least one ' + cols[ci][0] + ' sock?', zh: '抽屜裡有' + listZh(listZ) + '的襪子。在黑暗中，至少要拿出幾隻，才能保證拿到至少一隻' + cols[ci][1] + '色襪子？' };
        st = { en: ['Worst case: every sock that is not ' + cols[ci][0] + ' comes out first: ' + (tot - cnt[ci]), 'The next sock must be ' + cols[ci][0] + ': ' + ans], zh: ['最壞的情況：先把所有不是' + cols[ci][1] + '色的都拿出來：' + (tot - cnt[ci]) + ' 隻', '下一隻一定是' + cols[ci][1] + '色：' + ans] };
        return { p: { cnt: cnt, one: true }, ans: ans, wrong: [cnt[ci] + 1, tot - cnt[ci], 2, tot], q: q, steps: st };
      }
      var worst = cnt.reduce(function (s, c) { return s + Math.min(c, k - 1); }, 0); ans = worst + 1;
      q = { en: 'A drawer has ' + listEn(list) + ' socks. In the dark, what is the smallest number of socks you must take out to be sure of having ' + k + ' socks of the same color?', zh: '抽屜裡有' + listZh(listZ) + '的襪子。在黑暗中，至少要拿出幾隻，才能保證有 ' + k + ' 隻同色？' };
      st = { en: ['Worst case: no color reaches ' + k + ' — at most ' + (k - 1) + ' of each color', 'That is ' + cnt.map(function (c) { return Math.min(c, k - 1); }).join(' + ') + ' = ' + worst + ' socks', 'One more sock must make ' + k + ' of one color: ' + ans],
             zh: ['最壞的情況：每種顏色都不到 ' + k + ' 隻——每色最多 ' + (k - 1) + ' 隻', '也就是 ' + cnt.map(function (c) { return Math.min(c, k - 1); }).join(' + ') + ' = ' + worst + ' 隻', '再拿一隻就一定有某色 ' + k + ' 隻：' + ans] };
      return { p: { cnt: cnt, one: false, k: k }, ans: ans, wrong: [k * cols.length, cols.length + 1, ans + 1, worst, k + 1], q: q, steps: st };
    },
    check: function (p) {
      if (p.one) { return p.cnt.reduce(function (a, b) { return a + b; }, 0) - p.cnt[0] + 1; }
      var best = 0;
      (function go(i, s) { if (i === p.cnt.length) { best = Math.max(best, s); return; } for (var x = 0; x <= p.cnt[i] && x < p.k; x++) go(i + 1, s + x); })(0, 0);
      return best + 1;
    } });

  // ======================= building a problem =======================
  var BY = {};
  G.forEach(function (g) { BY[g.id] = g; });
  function build(g, seed) {
    var o = g.make(tools(rng(seed))), c;
    if (o.words) c = { choices: o.words, answer: LETTERS[o.at], text: o.words.en[o.at] };
    else if (o.kind === 'frac') c = chooseFrac(o, tools(rng(seed + 1)));
    else c = chooseNum(o, tools(rng(seed + 1)));
    return { id: g.id + '#' + seed, gen: g.id, topic: g.topic, level: g.level, q: o.q, fig: o.fig, choices: c.choices, answer: c.answer,
      insight: o.insight || g.insight, steps: o.steps, _p: o.p, _ans: o.ans, _kind: o.words ? 'words' : (o.kind || 'int'), _text: c.text, _mixed: o.mixed };
  }
  function fromId(id) {
    var at = String(id).indexOf('#'); if (at < 0) return null;
    var g = BY[id.slice(0, at)]; return g ? build(g, +id.slice(at + 1)) : null;
  }
  window.GENERATORS = { list: G, build: build, fromId: fromId, F: F, fs: fs, FMT: FMT };
})();

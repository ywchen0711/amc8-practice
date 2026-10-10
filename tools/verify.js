// Re-computes every answer in problems.js (brute force where possible) and checks it against the marked choice.
// Also checks each problem has all the fields, both languages, and numeric choices in increasing order.
//   node tools/verify.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'problems.js'), 'utf8'));
const P = window.PROBLEMS;

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const frac = (n, d) => { const g = gcd(n, d); return (n / g) + '/' + (d / g); };
const isPrime = (n) => n > 1 && range(2, Math.floor(Math.sqrt(n))).every((k) => n % k);
const digits = (n) => String(n).split('').map(Number);
const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

const expected = {
  p01: 2024 - 2 * (1000 - 989),
  p02: 80 * 0.75 * 0.9,
  p03: (() => { for (let k = 1; k < 100; k++) if (5 * k - 3 * k === 12) return 8 * k; })(),
  p04: range(1, 99).filter((n) => n % 6 === 0 && n % 4 !== 0).length,
  p05: (() => { for (let h = 0.5; h < 20; h += 0.5) if (24 * h - 16 * h === 40) return h; })(),
  p06: 8 * 6 - 3 * 4 / 2,
  p07: 5 * 12 - 4 * 10,
  p08: 3 + 49 * 4,
  p09: range(100, 999).filter((n) => digits(n).every((d) => d % 2)).length,
  p10: (() => { let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 7) c++; return frac(c, 36); })(),
  p11: (() => { let r = 1; for (let i = 0; i < 2024; i++) r = r * 7 % 5; return r; })(),
  p12: (() => { const B = (180 - 30) / 4; return 2 * B; })(),
  p13: (() => { const m = 40 * 6, h = 3 * 30 + 40 * 0.5, d = Math.abs(m - h); return Math.min(d, 360 - d); })(),
  p14: (() => { const s = new Set(); const perm = (pre, rest) => { if (!rest.length) s.add(pre); rest.forEach((c, i) => perm(pre + c, rest.slice(0, i).concat(rest.slice(i + 1)))); }; perm('', 'LEVEL'.split('')); return s.size; })(),
  p15: (() => { const x = (10 + 4) / 2, y = 10 - x; return x * y; })(),
  p16: (() => { let n = 1, d = 1; for (let k = 2; k <= 10; k++) { n *= k - 1; d *= k; } return frac(n, d); })(),
  p17: Math.sqrt(13 * 13 - 5 * 5),
  p18: +(100 - 3.14 * 25).toFixed(2),
  p19: digits(10n ** 20n - 20n).reduce((a, b) => a + b, 0),
  p20: (() => { let t = 12; while (t % 18) t += 12; return '7:' + String(t).padStart(2, '0') + ' a.m.'; })(),
  p21: 1 / (1 / 6 + 1 / 3),
  p22: (() => { for (let n = 1; n < 100; n++) if (n * (n + 1) === 506) return 2 * n + 1; })(),
  p23: Math.round((1.2 * 0.8 - 1) * 100),
  p24: 4 * 3 + 4 * 1,
  p25: C(10, 2),
  p26: range(1, 100).map((n) => String(n).split('').filter((c) => c === '7').length).reduce((a, b) => a + b, 0),
  p27: (() => { for (let x = 8.5; x < 20; x += 0.5) { const s = [3, 5, 8, x].sort((a, b) => a - b), med = (s[1] + s[2]) / 2, mean = (3 + 5 + 8 + x) / 4; if (med === mean) return x; } })(),
  p28: frac(3 * 2, 8 * 7),
  p29: (60 * 2 + 40 * 3) / 5,
  p30: Math.abs(6 * 5 - 0 * 2) / 2,
  p31: range(1, 72).filter((d) => 72 % d === 0).length,
  p32: (() => { for (let a = 0; a <= 30; a++) if (8 * a + 5 * (30 - a) === 204) return a; })(),
  p33: range(1, 50).reduce((a, b) => a + b, 0),
  p34: range(1, 4).map((k) => (5 - k) * (5 - k)).reduce((a, b) => a + b, 0),
  p35: (() => { const g = Array.from({ length: 4 }, () => Array(4).fill(0)); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g[i][j] = i === 0 || j === 0 ? 1 : g[i - 1][j] + g[i][j - 1]; return g[3][3]; })(),
  p36: (() => { let c = 0; for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) { const f = [x, y, z].filter((v) => v === 0 || v === 3).length; if (f === 2) c++; } return c; })(),
  p37: 2 * (2 * 3 + 2 * 4 + 3 * 4),
  p38: (() => { for (let n = 2; ; n++) if ([2, 3, 4, 5, 6].every((d) => n % d === 1)) return n; })(),
  p39: range(31, 49).filter(isPrime).reduce((a, b) => a + b, 0),
  p40: (() => { const can = (n) => range(0, Math.floor(n / 5)).some((f) => (n - 5 * f) % 3 === 0); let last = 0; for (let n = 1; n < 100; n++) if (!can(n)) last = n; return last; })(),
  p41: 30 * 6 / 4,
  p42: (() => { const n = 2 * 30, d = 3 * 12, g = gcd(n, d), N = n / g, D = d / g; return Math.floor(N / D) + ' ' + (N % D) + '/' + D; })(),
  p43: Math.log2(2 ** 10 + 2 ** 10),
  p44: (() => { for (let x = 1; x < 50; x++) if (4 * x + 20 === 2 * (x + 20)) return x; })(),
  p45: (8 - 2) * 180 / 8,
  p46: 6 * 5,
  p47: (() => { let c = 0; for (let m = 0; m < 8; m++) if (m) c++; return frac(c, 8); })(),
  p48: (() => { let c = 0; for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) if (Number('4' + a + '2' + b) % 9 === 0) c++; return c; })(),
  p49: (400 + 200) / 20,
  p50: range(-20, 20).filter((x) => Math.abs(x - 3) < 5).length,
  p51: (() => { const D = [0, 0], E = [4, 8], F = [8, 4]; return Math.abs((E[0] - D[0]) * (F[1] - D[1]) - (F[0] - D[0]) * (E[1] - D[1])) / 2; })(),
  p52: range(1, 1000).filter((n) => (n % 3 === 0 || n % 5 === 0) && n % 15 !== 0).length,
  p53: (() => { let r = 1; for (let i = 0; i < 100; i++) r = r * 7 % 100; return String(r).padStart(2, '0'); })(),
  p54: (() => { const sq = new Set(range(1, 10).map((k) => k * k)), cu = new Set(range(1, 4).map((k) => k ** 3)); return frac(range(1, 100).filter((n) => sq.has(n) || cu.has(n)).length, 100); })(),
  p55: (() => { for (let d = 0.5; d < 20; d += 0.5) if (Math.abs(d / 4 - d / 5 - 0.25) < 1e-9) return d; })(),
  p56: (25 - 9) + 'π',
  p57: range(100, 999).filter((n) => digits(n).reduce((a, b) => a * b, 1) === 12).length,
  p58: (() => { const a = [1, 2]; while (a.length < 30) a.push(a[a.length - 1] + a[a.length - 2]); return a.filter((v) => v % 2 === 0).length; })(),
  p59: (9 * 12) / Math.sqrt(81 + 144),
  // logic: try every possible true assignment where all labels are wrong; one draw from "Mixed" always decides it
  p60: (() => {
    const labels = ['A', 'O', 'M'], kinds = [['A', 'O', 'M'], ['A', 'M', 'O'], ['O', 'A', 'M'], ['O', 'M', 'A'], ['M', 'A', 'O'], ['M', 'O', 'A']];
    const ok = kinds.filter((k) => k.every((v, i) => v !== labels[i]));
    // after one draw from box 2 ("Mixed"), the contents of box 2 are known (it is pure), which leaves one option
    const groups = {}; ok.forEach((k) => { groups[k[2]] = (groups[k[2]] || 0) + 1; });
    return Object.values(groups).every((n) => n === 1) ? 1 : 2;
  })()
};

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const val = (s) => {
  if (/^\d+ \d+\/\d+$/.test(s)) { const [w, f] = s.split(' '), [n, d] = f.split('/'); return +w + n / d; }
  if (/^-?\d+\/\d+$/.test(s)) { const [n, d] = s.split('/'); return n / d; }
  const t = s.replace(/[−]/g, '-').replace(/[%π]/g, '');
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};
let bad = 0;
const ids = new Set();
for (const p of P) {
  const err = (m) => { bad++; console.log(p.id + ': ' + m); };
  if (ids.has(p.id)) err('duplicate id'); ids.add(p.id);
  ['q', 'insight', 'steps'].forEach((k) => { if (!p[k] || !p[k].en || !p[k].zh) err('missing ' + k + ' (en / zh)'); });
  if (p.steps && p.steps.en.length !== p.steps.zh.length) err('steps: en and zh have a different number of lines');
  if (!(p.level >= 1 && p.level <= 5)) err('level must be 1–5');
  const en = Array.isArray(p.choices) ? p.choices : p.choices.en;
  if (en.length !== 5 || (!Array.isArray(p.choices) && p.choices.zh.length !== 5)) err('needs 5 choices');
  const k = LETTERS.indexOf(p.answer);
  if (k < 0) { err('answer must be A–E'); continue; }
  const want = expected[p.id];
  if (want === undefined) { err('no check in tools/verify.js'); continue; }
  const got = en[k];
  const same = typeof want === 'number' ? Math.abs(val(got) - want) < 1e-9 : String(want) === got;
  if (!same) err(`marked ${p.answer} = "${got}", but the computed answer is ${want}`);
  if (en.filter((c) => (typeof want === 'number' ? Math.abs(val(c) - want) < 1e-9 : c === String(want))).length !== 1) err('the correct value appears more or less than once');
  const nums = en.map(val);
  if (nums.every((v) => v != null) && nums.some((v, i) => i && v <= nums[i - 1])) err('numeric choices should be in increasing order');
}
const byLetter = {}; P.forEach((p) => { byLetter[p.answer] = (byLetter[p.answer] || 0) + 1; });
const byLevel = {}; P.forEach((p) => { byLevel[p.level] = (byLevel[p.level] || 0) + 1; });
console.log(`${P.length} problems · answers ${JSON.stringify(byLetter)} · levels ${JSON.stringify(byLevel)}`);
console.log(bad ? bad + ' PROBLEM(S)' : 'all answers verified');
process.exit(bad ? 1 : 0);

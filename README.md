# AMC 8 Practice · AMC 8 練習

**Play:** https://ywchen0711.github.io/amc8-practice/

Timed practice for the AMC 8 math contest. One problem at a time; at the end you see the correct answer to every
problem, the key idea ("how to think about it") and a step-by-step solution. English first, with a full Chinese version.

- **Full mock test**: 25 problems in 40 minutes, easy → hard like the real contest, with a ⚑ flag to come back later
- **Quick 1**: one random problem with the answer and explanation right away, then another, as many as you like
- **Quick 10**: 10 random problems with a stopwatch
- **Topic practice**: arithmetic, ratios & percent, algebra, number theory, counting, probability, geometry, logic
- **Review mistakes**: problems you missed come back (with the same numbers) until you get them right
- Optional instant feedback in practice modes; time spent on each problem; score by topic
- Progress is saved in your browser; keyboard: A–E choose, Enter next, ← → move
- Links to the 20 most recent official AMC 8 contests (2006–2026; there was no 2021 contest) on the AoPS Wiki

## About the problems

The real AMC 8 problems are copyrighted by the MAA, so this site does **not** copy them. The problems are original,
written in the style of the AMC 8 and covering the same topics and difficulty range.

- `gen.js` has 69 **problem generators**. Every time one is drawn it makes a new problem — new numbers and often a new
  situation — and works out the answer, five choices (the wrong ones are the mistakes students really make), the key
  idea and a worked solution for those numbers, in English and Chinese. A drawn problem is saved as
  `generator#seed`, so a missed problem comes back with exactly the same numbers.
- `problems.js` has hand-written problems; the ones a generator covers are replaced by it, the rest are still used.

Every answer is checked by a script that recomputes it a different way (brute force where possible). For the
generators it builds 400 random problems from each one and checks every answer, the choices (five different values
in increasing order, the answer exactly once) and both languages:

```
node tools/verify.js        # or: node tools/verify.js 2000  for more instances per generator
```

Not affiliated with or endorsed by the MAA. AMC 8 is a trademark of the Mathematical Association of America.

## Adding problems

- **A generator** (preferred): add an entry to `gen.js` with `make(R)` returning the numbers, question, answer,
  likely wrong answers and solution steps, plus `check(p)` that recomputes the answer another way; run the check.
- **A fixed problem**: add an entry to `problems.js` (question, five choices in increasing order, answer, key idea and
  solution steps in English and Chinese, optional SVG figure), add how to compute its answer in `tools/verify.js`,
  and run the check.

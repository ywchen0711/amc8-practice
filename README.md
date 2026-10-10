# AMC 8 Practice · AMC 8 練習

**Play:** https://ywchen0711.github.io/amc8-practice/

Timed practice for the AMC 8 math contest. One problem at a time; at the end you see the correct answer to every
problem, the key idea ("how to think about it") and a step-by-step solution. English first, with a full Chinese version.

- **Full mock test**: 25 problems in 40 minutes, easy → hard like the real contest, with a ⚑ flag to come back later
- **Quick practice**: 10 random problems with a stopwatch
- **Topic practice**: arithmetic, ratios & percent, algebra, number theory, counting, probability, geometry, logic
- **Review mistakes**: problems you missed come back until you get them right
- Optional instant feedback in practice modes; time spent on each problem; score by topic
- Progress is saved in your browser; keyboard: A–E choose, Enter next, ← → move
- Links to the 20 most recent official AMC 8 contests (2006–2026; there was no 2021 contest) on the AoPS Wiki

## About the problems

The real AMC 8 problems are copyrighted by the MAA, so this site does **not** copy them. The problems in
`problems.js` are original, written in the style of the AMC 8 and covering the same topics and difficulty range.
Every answer is checked by a script that recomputes it independently:

```
node tools/verify.js
```

Not affiliated with or endorsed by the MAA. AMC 8 is a trademark of the Mathematical Association of America.

## Adding problems

Add an entry to `problems.js` (question, five choices in increasing order, answer, key idea and solution steps in
English and Chinese, optional SVG figure), add how to compute its answer in `tools/verify.js`, and run the check.

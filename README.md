# Electronics Bootcamp

An interactive, zero-install electronics course. Short lessons, a live circuit simulator, quizzes, and exercises that are checked automatically by **measuring the learner's circuit**. Static site, vanilla JS, no build step, works offline.

## Status (implements Phases 0–1 of `../electronics-bootcamp-plan.md`)

| Piece | State |
|---|---|
| Track 1: Electricity Fundamentals | **Playable**: 12 lessons, 36 quiz questions, 41 exercises |
| DC solver (MNA + Newton for diodes/LEDs) | Done, with plain-English diagnostics |
| Schematic editor, multimeter, unit parser | Done |
| Exercise types: calculate, measure, predict, build, fix | Done |
| Workbench (free sandbox) | Done |
| Tracks 2–5 (Analog, Digital, Microcontrollers, Build It for Real) | Outlined in the app, **not built**: they need the transient/AC solvers, logic simulator and virtual board from Phases 2–4 |
| SME review, mobile/touch pass, GitHub Pages deploy | Not done |

## Run it

Open `index.html` through any static server (module-free, but `file://` works too in most browsers):

```bash
npm start        # python3 -m http.server 8080  ->  http://localhost:8080
npm test         # solver checks + course self-check
```

## How it works

```
js/units.js            "4.7k", "4k7", "10 µF" <-> numbers
js/sim/mna.js          DC solver, device models, diagnostics
js/engine.js           Circuit wrapper, test DSL (T / expect), answer checking
js/ui/schematic.js     SVG editor + animated view (current dots, LED glow, smoke)
js/lessons-*.js        content as data
js/content.js          assembles tracks
js/app.js              routing, lessons, exercises, workbench
tests/verify.js        the self-check
```

**Circuit JSON** is the contract between editor, solver and tests:

```js
{ parts: [
    { id: 'V1',  type: 'vsource',  value: 9,   pins: ['a', 'gnd'] },   // pin 0 = +
    { id: 'R1',  type: 'resistor', value: 470, pins: ['a', 'b'] },
    { id: 'LED1', type: 'led', color: 'red',   pins: ['b', 'gnd'] },   // pin 0 = anode
  ],
  layout: { a: [160, 80], b: [600, 80], gnd: [160, 320] } }            // optional; auto-laid-out if missing
```

Part types: `vsource`, `resistor`, `lamp`, `ldr`, `switch`, `led`, `diode`. Node `gnd` is 0 V. Optional `bends` / `at` on a part route its wire through extra points.

### Solver notes
- Modified Nodal Analysis with partial-pivot Gaussian elimination.
- Diodes/LEDs: Shockley model with a small series resistance (so a "dead short" is a large but finite current), Newton-Raphson with `pnjlim` voltage limiting and a source-stepping fallback.
- Ratings are enforced as diagnostics: LED > 30 mA ("magic smoke"), resistor > ¼ W, lamp over its rating, battery > 10 A, plus no ground, shorted/looped batteries, floating groups, loose ends, backwards LED and open loops.
- DC only so far. Capacitors, inductors, transistors, op-amps and AC analysis are Phase 2.

## Authoring a lesson

Add an object to `js/lessons-fundamentals.js` (or a new `lessons-*.js` file plus a script tag and an entry in `js/content.js`). No engine changes are needed.

```js
{ id: 'ohms-law', title: 'Ohm’s law', time: '25 min',
  blocks: [ { h: '…' }, { p: 'Text with `code` and **bold**.' }, { formula: 'V = I × R' },
            { circuit: {/* JSON */}, editable: true, caption: '…' }, { tip: '…' }, { warn: '…' } ],
  quiz: [ { q: '…', options: ['…', '…'], answer: 1, why: '…' } ],
  exercises: [ /* see below */ ] }
```

| `type` | Fields | Checked by |
|---|---|---|
| `calculate` | `answer: {value, unit, tol?, bare?}`, `solution`, `hint` | Unit-aware numeric tolerance (`bare` = multiplier for a unit-less number, e.g. `1e3` for "answer in kΩ") |
| `measure` | `circuit`, `answer: {measure: c => number, unit, tol, abs}` | The learner uses the multimeter; the reading is compared with the simulator |
| `predict` | `circuit`, `question`, `options`, `truth: c => index`, `why` | The simulator decides the right option, so it can't drift from the physics |
| `build` / `fix` | `starter`, `solution`, `palette`, `tools`, `tests`, `hint` | Tests probe the learner's circuit |

Tests use a small DSL; the learner sees the message when one fails:

```js
T('LED current is 10–20 mA', (c, { expect }) =>
  expect(c.dc().current(c.first('led', 'LED').id), 'A').toBeBetween(0.010, 0.020));
```

Look parts up by **type** (`c.first('led')`, `c.all('resistor')`) rather than by node name, because learners create their own nodes. Add structural tests (`c.count('resistor')`, "the switch really turns it off") so the answer can't be faked by typing a number into a source.

## Self-check

`npm test` runs, in Node with no dependencies:

1. **Solver**: closed-form checks (dividers, series/parallel, balanced bridge, LED/diode drops, polarity), the plain-English diagnostics, and a property test (KCL at every node and power balance on 200 random networks).
2. **Course**: every lesson has blocks, ≥3 quiz questions and exercises; each `calculate` reference answer passes while blank/wrong ones fail; each `build`/`fix` **solution passes every test and the starter fails at least one**; each `predict` truth is a valid option.

## Safety

Safety notes are repeated where relevant and lesson 12 covers them in depth. The course contains no mains-voltage design exercises.

## Licences

No third-party code or assets. (Future: record any vendored libraries, e.g. an AVR simulator for Track 4, in `vendor/README`.)

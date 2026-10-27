// npm test  ->  solver checks + course self-check (every solution passes, every starter fails).
const path = require('path');
const root = path.join(__dirname, '..');
['js/units.js', 'js/sim/mna.js', 'js/engine.js', 'js/lessons-fundamentals.js', 'js/content.js'].forEach((f) => require(path.join(root, f)));
const EB = globalThis.EB;
const { solveDC } = EB.sim;
const { Circuit, runTests, checkAnswer } = EB.engine;

let passed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; } catch (e) { failures.push(`${name}\n      ${e.message}`); }
}
const near = (a, b, tol, what = '') => { if (!(Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-12))) throw new Error(`${what} expected ${b}, got ${a} (tol ${tol * 100}%)`); };
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const V = (id, value, a, b = 'gnd') => ({ id, type: 'vsource', value, pins: [a, b] });
const R = (id, value, a, b) => ({ id, type: 'resistor', value, pins: [a, b] });

// ---------------------------------------------------------------- units
check('units: parse prefixes, RKM and unit names', () => {
  const p = EB.units.parse;
  near(p('4.7k').value, 4700, 1e-9); near(p('4k7').value, 4700, 1e-9); near(p('2R2').value, 2.2, 1e-9);
  near(p('250 mA').value, 0.25, 1e-9); must(p('250 mA').unit === 'A', 'unit A');
  near(p('10 µF').value, 1e-5, 1e-9); near(p('10uF').value, 1e-5, 1e-9); near(p('2.2 MΩ').value, 2.2e6, 1e-9);
  must(p('470 ohm').unit === 'Ω', 'ohm alias'); near(p('1e3').value, 1000, 1e-9); near(p('3.3V').value, 3.3, 1e-9);
  must(p('banana') === null && p('') === null, 'garbage rejected');
  must(p('5 M').value === 5e6 && p('5 m').value === 5e-3, 'M vs m');
});
check('units: format', () => {
  const f = EB.units.format;
  must(f(0.0151, 'A') === '15.1 mA', f(0.0151, 'A')); must(f(4700, 'Ω') === '4.7 kΩ', 'kΩ');
  must(f(2.2e-6, 'F') === '2.2 µF', 'µF'); must(f(3, 'V') === '3 V', '3 V'); must(f(0, 'V') === '0 V', '0 V');
});

// ---------------------------------------------------------------- solver: closed form
check('solver: voltage divider', () => {
  const r = solveDC({ parts: [V('V1', 9, 'a'), R('R1', 10000, 'a', 'o'), R('R2', 5000, 'o', 'gnd')] });
  near(r.v('o'), 3, 1e-6); near(r.current('V1'), 0.0006, 1e-6);
});
check('solver: series resistors', () => {
  const r = solveDC({ parts: [V('V1', 12, 'a'), R('R1', 1000, 'a', 'b'), R('R2', 2000, 'b', 'gnd')] });
  near(r.current('R1'), 0.004, 1e-6); near(r.v('b'), 8, 1e-6);
});
check('solver: parallel resistors', () => {
  const r = solveDC({ parts: [V('V1', 6, 'a'), R('R1', 200, 'a', 'gnd'), R('R2', 300, 'a', 'gnd')] });
  near(r.current('V1'), 0.05, 1e-6);
});
check('solver: series-parallel', () => {
  const r = solveDC({ parts: [V('V1', 10, 'a'), R('R1', 100, 'a', 'b'), R('R2', 200, 'b', 'gnd'), R('R3', 200, 'b', 'gnd')] });
  near(r.current('V1'), 0.05, 1e-6); near(r.v('b'), 5, 1e-6);
});
check('solver: balanced Wheatstone bridge has zero bridge current', () => {
  const r = solveDC({ parts: [V('V1', 10, 'a'), R('R1', 100, 'a', 'l'), R('R2', 200, 'l', 'gnd'), R('R3', 300, 'a', 'r'), R('R4', 600, 'r', 'gnd'), R('Rb', 1000, 'l', 'r')] });
  must(r.current('Rb') < 1e-9, `bridge current ${r.current('Rb')}`);
});
check('solver: battery polarity (+ pin is positive)', () => {
  const r = solveDC({ parts: [V('V1', 5, 'gnd', 'x'), R('R1', 100, 'x', 'gnd')] });
  near(r.v('x'), -5, 1e-6);
});
check('solver: open switch passes no current, closed passes full', () => {
  const sw = (closed) => solveDC({ parts: [V('V1', 9, 'a'), { id: 'S', type: 'switch', closed, pins: ['a', 'b'] }, R('R1', 90, 'b', 'gnd')] });
  must(sw(false).current('R1') < 1e-9, 'open'); near(sw(true).current('R1'), 0.1, 1e-3);
});
check('solver: LED with resistor satisfies KVL and Newton converged', () => {
  const r = solveDC({ parts: [V('V1', 9, 'a'), R('R1', 470, 'a', 'b'), { id: 'D', type: 'led', color: 'red', pins: ['b', 'gnd'] }] });
  near(r.v('b'), 1.9, 0.03); near(r.current('R1'), (9 - r.v('b')) / 470, 1e-6); must(r.warnings.length === 0, r.warnings.join());
});
check('solver: silicon diode drops about 0.7 V', () => {
  const r = solveDC({ parts: [V('V1', 5, 'a'), R('R1', 430, 'a', 'b'), { id: 'D', type: 'diode', pins: ['b', 'gnd'] }] });
  near(r.v('b'), 0.7, 0.02); near(r.current('D'), (5 - r.v('b')) / 430, 1e-6);
});
check('solver: reverse-biased diode blocks', () => {
  const r = solveDC({ parts: [V('V1', 5, 'a'), R('R1', 430, 'a', 'b'), { id: 'D', type: 'diode', pins: ['gnd', 'b'] }] });
  must(r.current('D') < 1e-9, 'leakage ' + r.current('D'));
});
check('solver: lamp power = V^2/R', () => {
  const r = solveDC({ parts: [V('V1', 9, 'a'), { id: 'L', type: 'lamp', value: 90, watts: 1, pins: ['a', 'gnd'] }] });
  near(r.power('L'), 0.9, 1e-6);
});
check('solver: LDR resistance falls with light', () => {
  const at = (light) => solveDC({ parts: [V('V1', 5, 'a'), { id: 'X', type: 'ldr', value: 200000, light, pins: ['a', 'gnd'] }] }).current('X');
  must(at(0.9) > at(0.1) * 5, 'LDR');
});

// ---------------------------------------------------------------- diagnostics in plain English
check('diagnostics: no ground', () => {
  const r = solveDC({ parts: [V('V1', 9, 'a', 'b'), R('R1', 100, 'a', 'b')] });
  must(!r.ok && /no ground/i.test(r.errors[0]), r.errors.join());
});
check('diagnostics: shorted battery / battery loop', () => {
  must(!solveDC({ parts: [V('V1', 9, 'a', 'a'), R('R1', 100, 'a', 'gnd')] }).ok, 'same node');
  must(!solveDC({ parts: [V('V1', 9, 'a'), V('V2', 5, 'a'), R('R1', 100, 'a', 'gnd')] }).ok, 'parallel sources');
});
check('diagnostics: LED without resistor burns', () => {
  const r = solveDC({ parts: [V('V1', 9, 'a'), { id: 'D', type: 'led', color: 'red', pins: ['a', 'gnd'] }] });
  must(r.ok && r.burnt.includes('D') && /Magic smoke/.test(r.warnings.join()), r.warnings.join());
});
check('diagnostics: backwards LED, overloaded resistor, dead short, open loop, loose end', () => {
  must(solveDC({ parts: [V('V1', 9, 'a'), R('R1', 470, 'a', 'b'), { id: 'D', type: 'led', pins: ['gnd', 'b'] }] }).infos.some((m) => /backwards/.test(m)), 'backwards');
  must(solveDC({ parts: [V('V1', 5, 'a'), R('R1', 47, 'a', 'gnd')] }).overRated.includes('R1'), 'overload');
  must(solveDC({ parts: [V('V1', 9, 'a'), { id: 'S', type: 'switch', closed: true, pins: ['a', 'gnd'] }] }).warnings.some((m) => /short circuit/.test(m)), 'short');
  must(solveDC({ parts: [V('V1', 9, 'a'), { id: 'S', type: 'switch', closed: false, pins: ['a', 'b'] }, R('R1', 90, 'b', 'gnd')] }).infos.some((m) => /No current/.test(m)), 'open loop');
  must(solveDC({ parts: [V('V1', 9, 'a'), R('R1', 100, 'a', 'b')] }).warnings.some((m) => /loose end/.test(m)), 'loose');
});
check('diagnostics: floating group is reported', () => {
  const r = solveDC({ parts: [V('V1', 9, 'a'), R('R1', 100, 'a', 'gnd'), R('R2', 100, 'x', 'y'), R('R3', 100, 'y', 'x')] });
  must(r.warnings.some((m) => /not connected/.test(m)), r.warnings.join());
});

// ---------------------------------------------------------------- property tests: KCL and power balance on random networks
check('property: KCL and power balance hold on 200 random resistor networks', () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let t = 0; t < 200; t++) {
    const n = 3 + Math.floor(rnd() * 4);
    const nodes = ['gnd', ...Array.from({ length: n }, (_, i) => 'n' + i)];
    const parts = [V('V1', 1 + rnd() * 20, 'n0')];
    // spanning chain guarantees connectivity, then random extra links
    for (let i = 1; i < nodes.length; i++) parts.push(R('Rc' + i, 10 + rnd() * 10000, nodes[i - 1], nodes[i]));
    for (let k = 0; k < 3; k++) { const a = nodes[Math.floor(rnd() * nodes.length)], b = nodes[Math.floor(rnd() * nodes.length)]; if (a !== b) parts.push(R('Rx' + k, 10 + rnd() * 10000, a, b)); }
    const r = solveDC({ parts });
    must(r.ok, 'random network failed to solve');
    const net = Object.fromEntries(r.nodes.map((x) => [x, 0]));
    let dissipated = 0;
    for (const p of parts) {
      if (p.type === 'vsource') { net[p.pins[0]] += r.flow(p.id); net[p.pins[1]] -= r.flow(p.id); }
      else { net[p.pins[0]] -= r.flow(p.id); net[p.pins[1]] += r.flow(p.id); dissipated += r.power(p.id); }
    }
    for (const x of r.nodes) if (x !== 'gnd') must(Math.abs(net[x]) < 1e-7, `KCL broken at ${x}: ${net[x]}`);
    near(dissipated, r.power('V1'), 1e-6, 'power balance');
  }
});

// ---------------------------------------------------------------- course self-check
const track = EB.TRACKS.find((t) => t.id === 'fundamentals');
const seen = new Set();
check('course: Track 1 has 12 lessons, all with blocks, 3+ quiz questions and exercises', () => {
  must(track.lessons.length === 12, `lessons: ${track.lessons.length}`);
  for (const l of track.lessons) {
    must(l.blocks.length >= 3 && l.quiz.length >= 3 && l.exercises.length >= 1, `${l.id}: too thin`);
    must(!seen.has(l.id), 'duplicate lesson id ' + l.id); seen.add(l.id);
    l.quiz.forEach((q, i) => { must(q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length && q.why, `${l.id} quiz ${i + 1} malformed`); });
  }
});
check('course: a safety lesson exists', () => { must(track.lessons.some((l) => /safety/i.test(l.title)), 'no safety lesson'); });

const ids = new Set();
let counts = { exercises: 0 };
for (const l of track.lessons) {
  for (const ex of l.exercises) {
    counts.exercises++;
    check(`exercise ${ex.id} (${ex.type}): well-formed`, () => {
      must(!ids.has(ex.id), 'duplicate id'); ids.add(ex.id);
      must(ex.title && ex.prompt, 'missing title/prompt'); must(ex.hint || ex.type === 'predict', 'missing hint');
      if (ex.type === 'build' || ex.type === 'fix') must(ex.tests && ex.tests.length >= 2 && ex.solution && ex.starter, 'needs starter, solution and ≥2 tests');
    });
    if (ex.type === 'calculate') {
      check(`exercise ${ex.id}: reference answer passes, blank and wrong answers fail`, () => {
        must(checkAnswer(ex.answer, ex.solution).pass, `solution "${ex.solution}" rejected: ${checkAnswer(ex.answer, ex.solution).msg}`);
        must(!checkAnswer(ex.answer, '').pass, 'blank accepted');
        must(!checkAnswer(ex.answer, `${ex.answer.value * 10} ${ex.answer.unit}`).pass, '10x answer accepted');
        must(!checkAnswer(ex.answer, '7 banana').pass, 'garbage accepted');
      });
    } else if (ex.type === 'measure') {
      check(`exercise ${ex.id}: measured value is sensible`, () => {
        const c = new Circuit(ex.circuit);
        const val = ex.answer.measure(c);
        must(Number.isFinite(val) && val !== 0, 'measurement ' + val);
        must(checkAnswer({ ...ex.answer, value: val }, EB.units.format(val, ex.answer.unit)).pass, 'formatted reading rejected');
        must(!checkAnswer({ ...ex.answer, value: val }, `${val * 3} ${ex.answer.unit}`).pass, 'wrong reading accepted');
        must(c.dc().ok, 'circuit has errors');
      });
    } else if (ex.type === 'predict') {
      check(`exercise ${ex.id}: simulation decides the right option`, () => {
        const t = ex.truth(new Circuit(ex.circuit));
        must(Number.isInteger(t) && t >= 0 && t < ex.options.length, 'truth index ' + t);
        must(ex.options.length >= 2 && ex.why, 'options/why');
      });
    } else {
      check(`exercise ${ex.id}: solution passes every test`, () => {
        const res = runTests(ex.tests, ex.solution);
        const bad = res.filter((r) => !r.pass);
        must(bad.length === 0, bad.map((b) => `"${b.name}": ${b.msg}`).join('; '));
        must(new Circuit(ex.solution).dc().ok, 'solution circuit has errors');
      });
      check(`exercise ${ex.id}: starter fails at least one test`, () => {
        const res = runTests(ex.tests, ex.starter);
        must(res.some((r) => !r.pass), 'starter already passes: nothing to learn');
      });
    }
  }
}

console.log(`\n${passed} checks passed, ${failures.length} failed  (${counts.exercises} exercises in ${track.lessons.length} lessons)`);
if (failures.length) { console.log('\nFAILURES:\n  - ' + failures.join('\n  - ')); process.exit(1); }

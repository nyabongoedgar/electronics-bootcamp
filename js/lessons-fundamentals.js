// Track 1: Electricity Fundamentals.  Content is data: no engine changes needed to add a lesson.
//
// lesson   { id, title, time, blocks[], quiz[], exercises[] }
// block    { h } { p } { list } { table:{head,rows} } { tip } { warn } { formula } { circuit, ... }
// exercise types: calculate | measure | predict | build | fix   (see README "Authoring")
(function () {
  const EB = (globalThis.EB = globalThis.EB || {});
  const { T, withPart, withSwitches, Circuit } = EB.engine;

  // ---------- circuit-building shorthands (pin 0 of a battery is +, of an LED the anode) ----------
  const V = (id, value, a, b = 'gnd') => ({ id, type: 'vsource', value, pins: [a, b] });
  const R = (id, value, a, b, extra) => ({ id, type: 'resistor', value, pins: [a, b], ...extra });
  const LED = (id, color, a, b, extra) => ({ id, type: 'led', color, pins: [a, b], ...extra });
  const SW = (id, closed, a, b) => ({ id, type: 'switch', closed, pins: [a, b] });
  const LAMP = (id, a, b, extra) => ({ id, type: 'lamp', value: 90, watts: 1, pins: [a, b], ...extra });
  const LDR = (id, light, a, b) => ({ id, type: 'ldr', value: 200000, light, pins: [a, b] });
  const C = (parts, layout) => ({ parts, layout });
  // standard corners of the canvas: battery on the left, parts along the top, return along the bottom
  const TL = [160, 80], BL = [160, 320], TM = [380, 80], TR = [600, 80], BR = [600, 320];

  // ---------- reusable tests ----------
  const notOverloaded = T('no part is overloaded', (c, { expect }) => {
    const op = c.dc();
    expect(op.ok && op.overRated.length === 0).toBeTruthy(op.ok ? `${op.overRated.join(', ')} would overheat or burn out. Read the orange notes under the circuit.` : op.errors[0]);
  });
  const hasPart = (type, label) => T(`uses ${/^[aeiou]/i.test(label || type) ? 'an' : 'a'} ${label || type}`, (c) => { c.first(type, label); });
  const ledBetween = (lo, hi) => T(`LED current is ${lo * 1000}–${hi * 1000} mA`, (c, { expect }) => {
    expect(c.dc().current(c.first('led', 'LED').id), 'A').toBeBetween(lo, hi);
  });

  const lampLoop = (closed) => C([V('V1', 9, 'a'), SW('SW1', closed, 'a', 'b'), LAMP('L1', 'b', 'gnd', { bends: [BR], at: 0 })], { a: TL, b: TR, gnd: BL });
  const ledLoop = C([V('V1', 9, 'a'), R('R1', 470, 'a', 'b'), LED('LED1', 'red', 'b', 'gnd', { bends: [BR], at: 0 })], { a: TL, b: TR, gnd: BL });

  // chain used by lessons 8, 10: V1 - R1 - (R2 || R3)
  const mixed = (withR3 = true) => C([
    V('V1', 10, 'a'), R('R1', 100, 'a', 'b'), R('R2', 200, 'b', 'gnd', { bends: [[380, 320]], at: 0 }),
    ...(withR3 ? [R('R3', 200, 'b', 'gnd', { bends: [[540, 80], [540, 320]], at: 1 })] : []),
  ], { a: TL, b: TM, gnd: BL });

  const ladder = C([V('V1', 12, 'A'), R('R1', 1000, 'A', 'B'), R('R2', 2000, 'B', 'C'), R('R3', 3000, 'C', 'gnd', { bends: [BR], at: 0 })], { A: TL, B: TM, C: TR, gnd: BL });

  const divider = (r2) => C([V('V1', 9, 'a'), R('R1', 10000, 'a', 'out'), R('R2', r2, 'out', 'gnd', { bends: [[380, 320]], at: 0 })], { a: TL, out: TM, gnd: BL });

  // ------------------------------------------------------------------------------------------
  const lessons = [];

  // 1 ------------------------------------------------------------------------------------------
  lessons.push({
    id: 'what-is-electricity', title: 'What is electricity?', time: '15 min',
    blocks: [
      { h: 'Charge, current and voltage' },
      { p: 'Everything is made of atoms, and atoms contain tiny charged particles. In a metal wire, some **electrons** are free to wander. If something pushes them all the same way, we get an **electric current**.' },
      { list: [
        '**Current** (`I`, measured in amperes, A) is how much charge flows past a point each second.',
        '**Voltage** (`V`, measured in volts, V) is the push that makes the charge move: the energy given to each bit of charge.',
        '**Resistance** (`R`, measured in ohms, Ω) is how much a part holds the flow back.',
      ] },
      { tip: 'Water analogy: voltage is like water pressure, current is like the flow rate, resistance is like a narrow pipe. Where it breaks: electrons are not used up. The current leaving a lamp equals the current entering it.' },
      { h: 'Try it' },
      { circuit: lampLoop(false), caption: 'A battery, a switch and a lamp. Click the switch to close the circuit and watch the lamp and the moving yellow dots.' },
      { p: 'Current only flows around a **complete loop**: out of the battery’s + side, through the parts, and back into the − side. Break the loop anywhere (an open switch, a loose wire) and the current stops everywhere.' },
      { tip: 'By convention we draw current flowing from + to −. Electrons actually drift the other way, but the maths works the same, and every schematic uses the convention.' },
      { warn: 'The small batteries in this course (1.5–12 V) are harmless. Mains wall sockets are not: never experiment with them. Lesson 12 covers safety in detail.' },
    ],
    quiz: [
      { q: 'What does a battery provide?', options: ['A fixed current', 'Voltage: a push for the charges', 'Resistance', 'Light'], answer: 1, why: 'A battery sets the voltage. How much current flows then depends on the circuit connected to it.' },
      { q: 'What is needed for a steady current to flow?', options: ['A complete loop', 'A battery with no wires', 'Only a switch', 'A very high voltage'], answer: 0, why: 'Charge has to get back to where it started, so the path must be a closed loop.' },
      { q: 'Voltage is measured in…', options: ['amperes', 'ohms', 'volts', 'watts'], answer: 2, why: 'Volts (V). Amperes measure current, ohms measure resistance, watts measure power.' },
    ],
    exercises: [
      {
        id: 'e1-predict', type: 'predict', title: 'Predict the lamp',
        prompt: 'Look at the circuit. Make a prediction first, then check it.',
        circuit: lampLoop(false), question: 'The switch is open. Will the lamp light?',
        options: ['Yes, the battery is connected', 'No, the loop is broken'],
        truth: (c) => (c.dc().power('L1') > 0.01 ? 0 : 1),
        why: 'An open switch breaks the loop, so no current can flow anywhere in the circuit, not even up to the switch.',
      },
      {
        id: 'e1-close', type: 'fix', title: 'Turn the lamp on',
        prompt: 'The lamp is off. Fix the circuit so it lights at about full brightness. (Click the switch.)',
        starter: lampLoop(false), solution: lampLoop(true), hint: 'Click the switch symbol to close it. A closed switch is just a wire.',
        tests: [
          T('the lamp is lit (0.5–1 W)', (c, { expect }) => expect(c.dc().power(c.first('lamp').id), 'W').toBeBetween(0.5, 1.05)),
          T('the lamp still has its battery', (c) => { c.first('vsource', 'battery'); }),
        ],
      },
    ],
  });

  // 2 ------------------------------------------------------------------------------------------
  lessons.push({
    id: 'units-prefixes', title: 'Units and prefixes', time: '15 min',
    blocks: [
      { h: 'Why prefixes?' },
      { p: 'Electronics uses numbers from tiny to enormous, so we attach **SI prefixes** to units instead of writing lots of zeros.' },
      { table: { head: ['Prefix', 'Symbol', 'Means', 'Example'], rows: [
        ['mega', 'M', '× 1,000,000', '2.2 MΩ = 2,200,000 Ω'],
        ['kilo', 'k', '× 1,000', '4.7 kΩ = 4,700 Ω'],
        ['(none)', '', '× 1', '9 V'],
        ['milli', 'm', '÷ 1,000', '250 mA = 0.25 A'],
        ['micro', 'µ', '÷ 1,000,000', '350 µA = 0.00035 A'],
        ['nano', 'n', '÷ 1,000,000,000', '10 nF'],
        ['pico', 'p', '÷ 10¹²', '22 pF'],
      ] } },
      { tip: 'Capital M means mega and lowercase m means milli: 1 MΩ is a million ohms, 1 mΩ is a thousandth of an ohm. Case matters!' },
      { p: 'Resistor values are often written like `4k7` (4.7 kΩ) or `2R2` (2.2 Ω), because a decimal point can get lost on a printed part. This course’s answer boxes understand all of these: `4.7k`, `4k7`, `4700`, `4.7 kΩ`, `4700 ohm`, `250mA`, `0.25 A`.' },
    ],
    quiz: [
      { q: 'How many milliamps are in 1 amp?', options: ['10', '100', '1,000', '1,000,000'], answer: 2, why: 'milli means one thousandth, so 1 A = 1000 mA.' },
      { q: '4.7 kΩ equals…', options: ['47 Ω', '470 Ω', '4,700 Ω', '47,000 Ω'], answer: 2, why: 'k means × 1000: 4.7 × 1000 = 4700.' },
      { q: 'Which is the larger current: 0.5 A or 450 mA?', options: ['0.5 A', '450 mA', 'They are equal'], answer: 0, why: '450 mA = 0.45 A, which is less than 0.5 A.' },
    ],
    exercises: [
      { id: 'u1', type: 'calculate', title: 'Kilo to ones', prompt: 'Write 4.7 kΩ in plain ohms.', answer: { value: 4700, unit: 'Ω' }, solution: '4700 Ω', hint: 'k means × 1000.' },
      { id: 'u2', type: 'calculate', title: 'A phone charger', prompt: 'A charger supplies 2000 mA. How many amps is that?', answer: { value: 2, unit: 'A' }, solution: '2 A', hint: 'Divide milliamps by 1000.' },
      { id: 'u3', type: 'calculate', title: 'Mega to kilo', prompt: 'Convert 2.2 MΩ into kΩ. Include the unit, like “… kΩ”.', answer: { value: 2.2e6, unit: 'Ω', bare: 1e3 }, solution: '2200 kΩ', hint: '1 MΩ = 1000 kΩ.' },
      { id: 'u4', type: 'calculate', title: 'Tiny currents', prompt: 'How many microamps (µA) is 0.35 mA? Write it like “… µA”.', answer: { value: 3.5e-4, unit: 'A', bare: 1e-6 }, solution: '350 µA', hint: '1 mA = 1000 µA.' },
    ],
  });

  // 3 ------------------------------------------------------------------------------------------
  const closeLoopStarter = C([V('V1', 9, 'a'), LAMP('L1', 'b', 'c')], { a: TL, b: [300, 80], c: TR, gnd: BL });
  const gapStarter = C([V('V1', 9, 'a'), LAMP('L1', 'b', 'gnd', { bends: [BR], at: 0 })], { a: TL, b: TR, gnd: BL });
  const ledGapStarter = C([V('V1', 9, 'a'), R('R1', 470, 'a', 'b'), LED('LED1', 'red', 'c', 'gnd', { bends: [BR], at: 0 })], { a: TL, b: [440, 80], c: [520, 80], gnd: BL });
  lessons.push({
    id: 'schematics', title: 'Circuits and schematics', time: '20 min',
    blocks: [
      { h: 'The language of circuits' },
      { p: 'A **schematic** is a map of a circuit. Each part has a standard symbol, and lines show how they connect. Where lines meet there is a **node**: everything on one node is at the same voltage.' },
      { table: { head: ['Part', 'What it does', 'Notes'], rows: [
        ['Battery', 'Provides voltage', 'Long plate = + side'],
        ['Resistor', 'Limits current', 'Zigzag line'],
        ['Switch', 'Opens/closes the loop', 'Closed = a wire'],
        ['Lamp', 'Glows when current flows', 'Circle with a cross'],
        ['LED', 'Light-emitting diode: one-way, glows', 'Current flows into the triangle’s flat side (anode) and out of the bar (cathode)'],
        ['Ground', '0 V reference point', 'Every voltage is measured relative to it'],
      ] } },
      { p: 'The **ground** symbol is not “the earth” in these circuits: it simply marks the node we call 0 volts. Choosing it is like choosing sea level when you measure the height of mountains.' },
      { h: 'Editing a circuit' },
      { p: 'Exercises give you a toolbar. **Wire** joins two dots. Part tools place a part: click where one end goes, then the other. **Delete** removes a part. Select a part to change its value.' },
      { circuit: ledLoop, caption: 'A battery, a resistor and an LED in one loop. The yellow dots show current; the coloured dots show voltage (blue = low, red = high).' },
    ],
    quiz: [
      { q: 'What does the ground symbol mean in a schematic?', options: ['The point where wires touch the floor', 'The 0 V reference node', 'The positive terminal', 'A fuse'], answer: 1, why: 'Ground is the reference: we call it 0 V and measure other voltages against it.' },
      { q: 'A lamp is connected to the battery’s + terminal only; its other end touches nothing. What happens?', options: ['It glows dimly', 'It glows fully', 'Nothing: there is no loop', 'The battery explodes'], answer: 2, why: 'No complete loop means no current, so nothing lights.' },
      { q: 'A closed switch behaves like…', options: ['a resistor', 'a plain wire', 'a battery', 'a gap'], answer: 1, why: 'Closed means connected: an ideal wire.' },
    ],
    exercises: [
      {
        id: 's3-wire', type: 'build', title: 'Close the loop',
        prompt: 'The battery and the lamp are on the canvas but not joined. Use the **Wire** tool to connect them so the lamp lights.',
        tools: ['wire'], starter: closeLoopStarter,
        solution: C([V('V1', 9, 'a'), LAMP('L1', 'a', 'gnd')], { a: TL, gnd: BL }),
        hint: 'Two wires are needed: the battery’s + to one end of the lamp, and the other end of the lamp back to ground.',
        tests: [
          T('the lamp is lit (0.5–1 W)', (c, { expect }) => expect(c.dc().power(c.first('lamp').id), 'W').toBeBetween(0.5, 1.05)),
          notOverloaded,
        ],
      },
      {
        id: 's3-switch', type: 'build', title: 'Add a switch',
        prompt: 'Add a **switch** between the battery and the lamp so you can turn it on and off. It must really control the lamp.',
        palette: ['switch'], tools: ['wire'], starter: gapStarter,
        solution: C([V('V1', 9, 'a'), SW('SW1', true, 'a', 'b'), LAMP('L1', 'b', 'gnd')], { a: TL, b: TR, gnd: BL }),
        hint: 'Pick the Switch tool, click the dot at the battery’s + end, then the dot at the lamp’s top end.',
        tests: [
          hasPart('switch'),
          T('with the switch closed, the lamp is lit', (c, { expect }) => expect(new Circuit(withSwitches(c.json, true)).dc().power(c.first('lamp').id), 'W').toBeBetween(0.5, 1.05)),
          T('with the switch open, the lamp is off', (c, { expect }) => expect(new Circuit(withSwitches(c.json, false)).dc().power(c.first('lamp').id), 'W').toBeAtMost(0.001)),
        ],
      },
      {
        id: 's3-led', type: 'fix', title: 'Find the gap',
        prompt: 'The LED never lights. Something is not connected. Find the gap and fix it.',
        tools: ['wire'], starter: ledGapStarter,
        solution: C([V('V1', 9, 'a'), R('R1', 470, 'a', 'b'), LED('LED1', 'red', 'b', 'gnd')], { a: TL, b: TR, gnd: BL }),
        hint: 'Look at the two dots between the resistor and the LED. Use the Wire tool on them.',
        tests: [ledBetween(0.008, 0.025), hasPart('resistor')],
      },
    ],
  });

  // 4 ------------------------------------------------------------------------------------------
  const oneResistor = (r, v = 5) => C([V('V1', v, 'a'), R('R1', r, 'a', 'gnd')], { a: [380, 80], gnd: [380, 320] });
  lessons.push({
    id: 'ohms-law', title: 'Resistors and Ohm’s law', time: '25 min',
    blocks: [
      { h: 'Resistance' },
      { p: 'A **resistor** restricts current. More resistance means less current for the same voltage. Georg Ohm found the simple relationship that bears his name:' },
      { formula: 'V = I × R' },
      { p: 'Rearranged: `I = V / R` (current) and `R = V / I` (resistance). Cover the one you want in the triangle V over (I × R) and read off the rest.' },
      { circuit: oneResistor(1000, 5), editable: true, caption: 'Select R1 and change its value (try 500, 2k, 100). Compare the current with V / R.' },
      { tip: 'Predict first, then check. 5 V across 1 kΩ: I = 5 / 1000 = 0.005 A = 5 mA.' },
      { h: 'Reading the colour bands' },
      { p: 'Small resistors carry coloured bands: the first two (or three) give digits, the next is the multiplier, the last is the tolerance.' },
      { table: { head: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], rows: [['Black', 'Brown', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Grey', 'White']] } },
      { p: 'Example: yellow (4), violet (7), red (×100) = 47 × 100 = 4700 Ω = 4.7 kΩ.' },
    ],
    quiz: [
      { q: 'A 5 V supply is across a 1 kΩ resistor. What is the current?', options: ['5 mA', '50 mA', '0.5 mA', '5 A'], answer: 0, why: 'I = V / R = 5 / 1000 = 0.005 A = 5 mA.' },
      { q: 'You double the voltage across the same resistor. The current…', options: ['halves', 'stays the same', 'doubles', 'quadruples'], answer: 2, why: 'I = V / R: current is proportional to voltage.' },
      { q: 'Bands yellow, violet, red mean…', options: ['470 Ω', '4.7 kΩ', '47 kΩ', '742 Ω'], answer: 1, why: '4 and 7 are the digits, red means × 100: 4700 Ω.' },
    ],
    exercises: [
      { id: 'o1', type: 'calculate', title: 'Find the current', prompt: 'A 12 V battery is connected across a 240 Ω resistor. What current flows?', answer: { value: 0.05, unit: 'A' }, solution: '50 mA', hint: 'I = V / R' },
      { id: 'o2', type: 'calculate', title: 'Find the resistance', prompt: 'What resistance draws 10 mA from a 5 V supply?', answer: { value: 500, unit: 'Ω' }, solution: '500 Ω', hint: 'R = V / I. Convert 10 mA to amps first.' },
      { id: 'o3', type: 'calculate', title: 'Find the voltage', prompt: 'A 330 Ω resistor carries 20 mA. What voltage is across it?', answer: { value: 6.6, unit: 'V' }, solution: '6.6 V', hint: 'V = I × R' },
      {
        id: 'o4', type: 'fix', title: 'Hit the target current',
        prompt: 'Change R1 so that 20 mA flows from the 5 V supply.',
        starter: oneResistor(1000), solution: oneResistor(250), hint: 'R = V / I = 5 / 0.02.',
        tests: [T('R1 carries 19–21 mA', (c, { expect }) => expect(c.dc().current(c.first('resistor').id), 'A').toBeBetween(0.019, 0.021)), hasPart('resistor')],
      },
      {
        id: 'o5', type: 'predict', title: 'Halve the resistance',
        prompt: 'The circuit above has R1 = 1 kΩ. Predict what happens if you swap in 500 Ω.',
        circuit: oneResistor(1000), question: 'With R1 = 500 Ω, the current will…',
        options: ['halve', 'stay the same', 'double'],
        truth: (c) => { const a = c.dc().current('R1'); const b = new Circuit(withPart(c.json, 'R1', { value: 500 })).dc().current('R1'); return b > a * 1.5 ? 2 : b < a * 0.67 ? 0 : 1; },
        why: 'I = V / R. Half the resistance gives twice the current. Try it: select R1 and type 500.', editable: true,
      },
    ],
  });

  // 5 ------------------------------------------------------------------------------------------
  lessons.push({
    id: 'power-energy', title: 'Power and energy', time: '20 min',
    blocks: [
      { h: 'Power' },
      { p: '**Power** is the rate at which energy is converted: in a resistor, electrical energy becomes heat. It is measured in **watts** (W).' },
      { formula: 'P = V × I' },
      { p: 'Combining with Ohm’s law gives two more forms: `P = I² × R` and `P = V² / R`. Use whichever matches the numbers you know.' },
      { circuit: oneResistor(100, 5), editable: true, caption: 'A 100 Ω resistor on 5 V dissipates 5² / 100 = 0.25 W: right at the limit of a standard ¼ W resistor. Lower its value and watch the warning appear.' },
      { h: 'Energy' },
      { p: '**Energy** is power over time: `E = P × t`. One watt for one second is one **joule** (J). Electricity bills use kilowatt-hours (kWh): 1 kW for 1 hour.' },
      { warn: 'Every resistor has a power rating (commonly ¼ W). Exceed it and the part overheats, discolours and can start a fire. This course’s simulator warns you when that would happen.' },
    ],
    quiz: [
      { q: 'A device runs on 12 V and draws 2 A. Its power is…', options: ['6 W', '14 W', '24 W', '0.17 W'], answer: 2, why: 'P = V × I = 12 × 2 = 24 W.' },
      { q: 'What happens when a ¼ W resistor dissipates 1 W?', options: ['Nothing, ratings are advisory', 'It gets hot and can burn out', 'It conducts better', 'Its value halves'], answer: 1, why: 'Heat output beyond the rating raises the temperature until the part is damaged.' },
      { q: 'A 100 W bulb runs for 10 hours. Energy used?', options: ['10 Wh', '100 Wh', '1 kWh', '10 kWh'], answer: 2, why: '100 W × 10 h = 1000 Wh = 1 kWh.' },
    ],
    exercises: [
      { id: 'p1', type: 'calculate', title: 'Power from V and I', prompt: 'A lamp runs on 9 V and draws 100 mA. What power does it use?', answer: { value: 0.9, unit: 'W' }, solution: '0.9 W', hint: 'P = V × I; use 0.1 A.' },
      { id: 'p2', type: 'calculate', title: 'Power in a resistor', prompt: 'A 100 Ω resistor has 5 V across it. How much power does it dissipate?', answer: { value: 0.25, unit: 'W' }, solution: '0.25 W', hint: 'P = V² / R' },
      { id: 'p3', type: 'calculate', title: 'Energy', prompt: 'A 2 W LED lamp stays on for 30 seconds. How much energy does it use, in joules?', answer: { value: 60, unit: 'J' }, solution: '60 J', hint: 'E = P × t' },
      {
        id: 'p4', type: 'fix', title: 'Stop the overheating',
        prompt: 'R1 is overheating on 5 V. Change it so it stays within its ¼ W rating but still draws at least 10 mA.',
        starter: oneResistor(47), solution: oneResistor(220), hint: 'P = V² / R must be ≤ 0.25 W, so R ≥ 100 Ω. And I = V / R ≥ 10 mA means R ≤ 500 Ω. Pick something in between.',
        tests: [notOverloaded, T('it still draws at least 10 mA', (c, { expect }) => expect(c.dc().current(c.first('resistor').id), 'A').toBeAtLeast(0.01))],
      },
    ],
  });

  // 6 ------------------------------------------------------------------------------------------
  const seriesDemo = C([V('V1', 12, 'a'), R('R1', 1000, 'a', 'b'), R('R2', 2000, 'b', 'gnd', { bends: [BR, ], at: 0 })], { a: TL, b: TR, gnd: BL });
  const seriesGap = C([V('V1', 10, 'a'), R('R1', 330, 'a', 'b')], { a: TL, b: TR, gnd: BL });
  lessons.push({
    id: 'series', title: 'Series circuits', time: '20 min',
    blocks: [
      { h: 'One path' },
      { p: 'Parts are in **series** when they are connected end to end so that the same current must go through each one.' },
      { list: [
        'The **current is the same** through every part.',
        'The **voltages add up** to the supply voltage.',
        'The **total resistance** is the sum: `R_total = R1 + R2 + …`',
      ] },
      { circuit: seriesDemo, editable: true, caption: '12 V across 1 kΩ + 2 kΩ: I = 12 / 3000 = 4 mA. The voltages are 4 V and 8 V. Select a resistor to check.' },
      { tip: 'The bigger resistor takes the bigger share of the voltage. This idea becomes the voltage divider in lesson 9.' },
      { warn: 'If any part in a series chain fails open (a blown bulb in an old string of lights), the whole chain stops.' },
    ],
    quiz: [
      { q: 'Two resistors, 100 Ω and 220 Ω, are in series. Total resistance?', options: ['69 Ω', '120 Ω', '320 Ω', '22,000 Ω'], answer: 2, why: 'Series resistances add: 100 + 220 = 320 Ω.' },
      { q: 'In a series circuit the current…', options: ['is the same everywhere', 'is largest at the first part', 'splits between parts', 'is zero'], answer: 0, why: 'There is only one path, so all the charge goes through each part.' },
      { q: 'One bulb in a series string burns out (open). What happens to the rest?', options: ['They get brighter', 'They go out', 'Nothing changes', 'They flicker'], answer: 1, why: 'The loop is broken, so there is no current anywhere.' },
    ],
    exercises: [
      { id: 'se1', type: 'calculate', title: 'Total resistance', prompt: 'Three resistors, 100 Ω, 220 Ω and 330 Ω, are in series. What is the total?', answer: { value: 650, unit: 'Ω' }, solution: '650 Ω', hint: 'Add them.' },
      { id: 'se2', type: 'calculate', title: 'Share of the voltage', prompt: 'A 12 V supply drives a 1 kΩ and a 2 kΩ resistor in series. What voltage is across the 2 kΩ resistor?', answer: { value: 8, unit: 'V' }, solution: '8 V', hint: 'First find the current: 12 / 3000. Then V = I × 2000.' },
      {
        id: 'se3', type: 'build', title: 'Add the missing resistor',
        prompt: 'The 10 V battery has R1 = 330 Ω but the loop is not closed. Add a **resistor** from R1’s free end back to ground so that the battery supplies about 10 mA (within 5%).',
        palette: ['resistor'], tools: ['wire'], starter: seriesGap,
        solution: C([V('V1', 10, 'a'), R('R1', 330, 'a', 'b'), R('R2', 680, 'b', 'gnd')], { a: TL, b: TR, gnd: BL }),
        hint: 'You need 10 V / 10 mA = 1000 Ω in total. 1000 − 330 = 670 Ω: pick the nearest standard value, 680 Ω. Click the new resistor and set its value.',
        tests: [
          T('the battery supplies 9.5–10.5 mA', (c, { expect }) => expect(c.dc().current(c.first('vsource', 'battery').id), 'A').toBeBetween(0.0095, 0.0105)),
          T('there are two resistors in series', (c, { expect }) => expect(c.count('resistor')).toBeAtLeast(2)),
        ],
      },
    ],
  });

  // 7 ------------------------------------------------------------------------------------------
  const par = (extra) => C([V('V1', 6, 'a'), R('R1', 200, 'a', 'gnd'), ...extra], { a: [380, 80], gnd: [380, 320] });
  lessons.push({
    id: 'parallel', title: 'Parallel circuits', time: '20 min',
    blocks: [
      { h: 'Many paths' },
      { p: 'Parts are in **parallel** when both their ends connect to the same two nodes. Current has a choice of routes.' },
      { list: [
        'The **voltage is the same** across every branch.',
        'The **currents add up** at the battery: `I_total = I1 + I2 + …`',
        'The **total resistance** is *smaller* than the smallest branch: `1/R_total = 1/R1 + 1/R2 + …`',
      ] },
      { circuit: par([R('R2', 300, 'a', 'gnd')]), editable: true, caption: '6 V across 200 Ω and 300 Ω in parallel: branch currents 30 mA and 20 mA, so the battery supplies 50 mA.' },
      { tip: 'For exactly two resistors: `R_total = (R1 × R2) / (R1 + R2)`. For equal resistors, divide by how many there are: two 100 Ω in parallel make 50 Ω.' },
      { p: 'Your house is wired in parallel: each socket gets the full voltage, and switching one lamp off does not affect the others.' },
    ],
    quiz: [
      { q: 'Two 100 Ω resistors are in parallel. Total?', options: ['200 Ω', '100 Ω', '50 Ω', '25 Ω'], answer: 2, why: 'Equal resistors: 100 / 2 = 50 Ω.' },
      { q: 'You add another branch in parallel. The current drawn from the battery…', options: ['decreases', 'stays the same', 'increases'], answer: 2, why: 'A new path lets more current flow: the total resistance falls.' },
      { q: 'The voltage across each parallel branch is…', options: ['divided between them', 'the same', 'zero', 'different in proportion to R'], answer: 1, why: 'Every branch is connected across the same two nodes.' },
    ],
    exercises: [
      { id: 'pa1', type: 'calculate', title: 'Three in parallel', prompt: 'What is the total resistance of 1 kΩ, 1 kΩ and 500 Ω in parallel?', answer: { value: 250, unit: 'Ω' }, solution: '250 Ω', hint: '1/R = 1/1000 + 1/1000 + 1/500 = 0.004.' },
      { id: 'pa2', type: 'calculate', title: 'Branch currents add', prompt: '6 V is across 200 Ω and 300 Ω resistors in parallel. What total current does the battery supply?', answer: { value: 0.05, unit: 'A' }, solution: '50 mA', hint: '6/200 + 6/300' },
      {
        id: 'pa3', type: 'build', title: 'Double the current',
        prompt: 'The battery supplies 30 mA through R1 = 200 Ω. Add a **resistor in parallel** so the battery supplies about 60 mA.',
        palette: ['resistor'], starter: par([]), solution: par([R('R2', 200, 'a', 'gnd')]),
        hint: 'Place a resistor between the top node and ground, the same as R1. 30 mA more needs another 200 Ω.',
        tests: [
          T('the battery supplies 57–63 mA', (c, { expect }) => expect(c.dc().current(c.first('vsource', 'battery').id), 'A').toBeBetween(0.057, 0.063)),
          T('there are at least two resistors', (c, { expect }) => expect(c.count('resistor')).toBeAtLeast(2)),
        ],
      },
    ],
  });

  // 8 ------------------------------------------------------------------------------------------
  lessons.push({
    id: 'combining', title: 'Combining series and parallel', time: '20 min',
    blocks: [
      { h: 'Collapse it step by step' },
      { p: 'Most circuits mix both. To find the total resistance, replace each group with its equivalent, working from the inside out.' },
      { circuit: mixed(true), editable: true, caption: 'R1 is in series with the parallel pair R2 ∥ R3. First 200 Ω ∥ 200 Ω = 100 Ω. Then 100 Ω + 100 Ω = 200 Ω. At 10 V the battery supplies 50 mA.' },
      { list: [
        'Find a pair that is *clearly* in series or parallel and replace it.',
        'Redraw, and repeat until one resistor is left.',
        'Then work back out: the total current flows through every series part, and a parallel pair shares the voltage that is left.',
      ] },
      { tip: 'Remove R3 in the circuit above and watch the battery current drop. Less parallel paths means more resistance.' },
    ],
    quiz: [
      { q: '100 Ω in series with (200 Ω ∥ 200 Ω) gives…', options: ['50 Ω', '200 Ω', '300 Ω', '500 Ω'], answer: 1, why: '200 ∥ 200 = 100; then 100 + 100 = 200 Ω.' },
      { q: 'Total resistance is 600 Ω on a 12 V supply. What current does the battery supply?', options: ['2 mA', '20 mA', '72 mA', '0.2 A'], answer: 1, why: '12 / 600 = 0.02 A = 20 mA.' },
      { q: 'In R1 in series with (R2 ∥ R3), which resistor carries the whole battery current?', options: ['R1', 'R2', 'R3', 'All of them'], answer: 0, why: 'R1 is the only part in the single path out of the battery.' },
    ],
    exercises: [
      { id: 'c1', type: 'calculate', title: 'Equivalent resistance', prompt: 'R1 = 100 Ω is in series with R2 = R3 = 200 Ω in parallel. What is the total?', answer: { value: 200, unit: 'Ω' }, solution: '200 Ω', hint: 'Parallel pair first: 100 Ω.' },
      { id: 'c2', type: 'calculate', title: 'Total current', prompt: 'The same network is connected to a 10 V battery. How much current does the battery supply?', answer: { value: 0.05, unit: 'A' }, solution: '50 mA', hint: 'I = V / R_total' },
      { id: 'c3', type: 'calculate', title: 'Voltage on the pair', prompt: 'With 50 mA through R1 = 100 Ω, what voltage is across the parallel pair R2 ∥ R3?', answer: { value: 5, unit: 'V' }, solution: '5 V', hint: 'R1 drops 5 V, so 10 − 5 remains.' },
      {
        id: 'c4', type: 'predict', title: 'Remove a branch',
        prompt: 'In the circuit, R3 is about to be removed.', circuit: mixed(true), editable: true, question: 'After removing R3, the battery current will…',
        options: ['go up', 'stay the same', 'go down'],
        truth: (c) => { const a = c.dc().current('V1'); const b = new Circuit(mixed(false)).dc().current('V1'); return b > a * 1.01 ? 0 : b < a * 0.99 ? 2 : 1; },
        why: 'Without R3, the total resistance rises from 200 Ω to 300 Ω, so the current falls from 50 mA to 33 mA.',
      },
    ],
  });

  // 9 ------------------------------------------------------------------------------------------
  const ldrDivider = (light) => C([V('V1', 5, 'a'), R('R1', 10000, 'a', 'out'), LDR('LDR1', light, 'out', 'gnd', { bends: [[380, 320]], at: 0 })], { a: TL, out: TM, gnd: BL });
  lessons.push({
    id: 'dividers', title: 'Voltage dividers and sensors', time: '25 min',
    blocks: [
      { h: 'Two resistors, one useful trick' },
      { p: 'Two resistors in series split the supply in proportion to their sizes. The voltage at the point between them is:' },
      { formula: 'V_out = V_in × R2 / (R1 + R2)' },
      { circuit: divider(10000), editable: true, caption: 'R2 is the bottom resistor (to ground). With R1 = R2 the output is half the supply: 4.5 V. Try changing R2 to 5k (3 V) or 20k (6 V).' },
      { warn: 'The formula assumes nothing else is connected to the output. A load in parallel with R2 lowers the real output voltage, so dividers suit signals and sensors, not power.' },
      { h: 'Sensors are variable resistors' },
      { p: 'A light-dependent resistor (**LDR**) has a high resistance in the dark and a low one in the light. Put one in a divider and you get a voltage that follows the light level. A thermistor does the same for temperature.' },
      { circuit: ldrDivider(0.5), editable: true, caption: 'Select the LDR and drag its light slider. The output voltage across the LDR changes.' },
    ],
    quiz: [
      { q: '9 V, R1 = 10 kΩ on top, R2 = 5 kΩ to ground. What is V_out?', options: ['3 V', '4.5 V', '6 V', '9 V'], answer: 0, why: '9 × 5k / 15k = 3 V.' },
      { q: 'With two equal resistors, V_out is…', options: ['0 V', 'half of V_in', 'V_in', 'twice V_in'], answer: 1, why: 'R2 / (R1 + R2) = ½.' },
      { q: 'Why is a divider a poor way to power a motor?', options: ['Resistors can’t carry current', 'The load pulls the output voltage down and wastes power', 'Motors need AC', 'Dividers only work with LEDs'], answer: 1, why: 'The motor sits in parallel with R2, so the divider ratio changes, and heat is wasted in the resistors.' },
    ],
    exercises: [
      { id: 'd1', type: 'calculate', title: 'Divide it', prompt: 'V_in = 9 V, R1 = 10 kΩ (top), R2 = 5 kΩ (bottom). What is V_out?', answer: { value: 3, unit: 'V' }, solution: '3 V', hint: 'V_out = 9 × 5k / (10k + 5k)' },
      { id: 'd2', type: 'calculate', title: 'Design a divider', prompt: 'You have 12 V and want 4 V out. R2 (bottom) is 1 kΩ. What must R1 (top) be?', answer: { value: 2000, unit: 'Ω' }, solution: '2 kΩ', hint: 'V_out / V_in = 1/3, so R2 is one third of the total: R1 = 2 × R2.' },
      {
        id: 'd3', type: 'fix', title: 'Make 3 V',
        prompt: 'Change R2 so that 3 V appears across it (±5%). The divider must not waste more than 1 mA from the battery.',
        starter: divider(10000), solution: divider(5000), hint: 'You want R2 / (R1 + R2) = 3 / 9 = 1/3. So R2 is half of R1.',
        tests: [
          T('V across R2 is 2.85–3.15 V', (c, { expect }) => expect(c.dc().vAcross(c.part('R2').id), 'V').toBeBetween(2.85, 3.15)),
          T('battery current is at most 1 mA', (c, { expect }) => expect(c.dc().current(c.first('vsource', 'battery').id), 'A').toBeAtMost(0.001)),
        ],
      },
      {
        id: 'd4', type: 'predict', title: 'More light',
        prompt: 'The LDR is the bottom resistor of a divider. Predict, then drag the light slider to test it.',
        circuit: ldrDivider(0.3), editable: true, question: 'As light on the LDR increases, the voltage across the LDR…',
        options: ['rises', 'falls', 'stays the same'],
        truth: (c) => { const lo = new Circuit(withPart(c.json, 'LDR1', { light: 0.1 })).dc().vAcross('LDR1'); const hi = new Circuit(withPart(c.json, 'LDR1', { light: 0.9 })).dc().vAcross('LDR1'); return hi > lo ? 0 : hi < lo ? 1 : 2; },
        why: 'More light means the LDR’s resistance falls. In a divider a smaller R2 gets a smaller share of the voltage.',
      },
    ],
  });

  // 10 -----------------------------------------------------------------------------------------
  lessons.push({
    id: 'kirchhoff', title: 'Kirchhoff’s laws', time: '25 min',
    blocks: [
      { h: 'Two rules that always hold' },
      { p: '**Kirchhoff’s current law (KCL):** the current flowing into any node equals the current flowing out of it. Charge does not pile up.' },
      { formula: 'ΣI_in = ΣI_out' },
      { p: '**Kirchhoff’s voltage law (KVL):** around any closed loop, the voltage rises (batteries) equal the voltage drops (resistors).' },
      { formula: 'ΣV_rises = ΣV_drops' },
      { circuit: mixed(true), editable: true, caption: 'Select R1, then R2 and R3. KCL at the middle node: the current in R1 (50 mA) equals the currents out through R2 and R3 (25 mA + 25 mA). KVL: 10 V = 5 V (R1) + 5 V (R2).' },
      { tip: 'KCL and KVL are what the simulator itself solves. If you can write the equations, you can solve any resistor circuit by hand.' },
    ],
    quiz: [
      { q: '3 mA and 5 mA flow into a node and a single wire leaves. Its current is…', options: ['2 mA', '3 mA', '5 mA', '8 mA'], answer: 3, why: 'In = out: 3 + 5 = 8 mA.' },
      { q: 'A 9 V battery drives three resistors in series. Two drop 4 V and 3 V. The third drops…', options: ['1 V', '2 V', '3 V', '7 V'], answer: 1, why: '9 − 4 − 3 = 2 V.' },
      { q: 'KCL is really a statement about conservation of…', options: ['energy', 'charge', 'resistance', 'power'], answer: 1, why: 'Charge cannot accumulate at a node, so what flows in must flow out.' },
    ],
    exercises: [
      { id: 'k1', type: 'calculate', title: 'KCL: total current', prompt: 'Three branches draw 20 mA, 35 mA and 15 mA from a battery. What current leaves the battery?', answer: { value: 0.07, unit: 'A' }, solution: '70 mA', hint: 'Add the branch currents.' },
      { id: 'k2', type: 'calculate', title: 'KVL: the missing drop', prompt: 'A 12 V battery drives three series resistors. Two drop 5 V and 4 V. What is the voltage across the third?', answer: { value: 3, unit: 'V' }, solution: '3 V', hint: 'The drops add up to 12 V.' },
      { id: 'k3', type: 'calculate', title: 'KCL at a junction', prompt: 'At a junction, 12 mA flows in on wire A and 7 mA flows out on wire B. How much current flows out along wire C?', answer: { value: 0.005, unit: 'A' }, solution: '5 mA', hint: 'In = out: 12 = 7 + I_C' },
      {
        id: 'k4', type: 'predict', title: 'Check KCL',
        prompt: 'Look at the circuit with the node between R1 and the parallel pair.', circuit: mixed(true), editable: true,
        question: 'Is the current through R1 equal to (current through R2) + (current through R3)?',
        options: ['Yes, always', 'No, it is larger', 'No, it is smaller'],
        truth: (c) => { const op = c.dc(); const d = op.current('R1') - op.current('R2') - op.current('R3'); return Math.abs(d) < 1e-6 ? 0 : d > 0 ? 1 : 2; },
        why: 'KCL at that node: whatever flows in through R1 must flow out through R2 and R3.',
      },
    ],
  });

  // 11 -----------------------------------------------------------------------------------------
  const measureEx = (id, title, prompt, measure, unit, hint, abs = true) => ({
    id, type: 'measure', title, prompt, circuit: ladder, answer: { measure, unit, tol: 0.03, abs }, hint,
  });
  lessons.push({
    id: 'multimeter', title: 'Using a multimeter', time: '20 min',
    blocks: [
      { h: 'Measuring, safely' },
      { p: 'A **multimeter** reads voltage, current and resistance. How you connect it depends on what you measure:' },
      { table: { head: ['To measure', 'Connect the meter', 'Why'], rows: [
        ['Voltage', 'in parallel (across the part)', 'It must not change the current, so it has a very high resistance'],
        ['Current', 'in series (break the loop and put the meter in)', 'All of the current has to pass through the meter, which has a very low resistance'],
        ['Resistance', 'across the part, circuit powered OFF and the part isolated', 'The meter supplies its own tiny current; other parts would confuse it'],
        ['Continuity', 'across a wire or switch, power OFF', 'It beeps if the path is a near-zero resistance'],
      ] } },
      { warn: 'Never connect a current-mode meter across a battery or a supply: it is a near-short circuit. Real meters have a fuse for exactly that mistake.' },
      { h: 'Practice' },
      { circuit: ladder, probe: true, tool: 'probe', showVolts: false, caption: 'Choose the Multimeter tool. Click a dot to place the red probe (the black probe starts on ground), click a second dot to move the black probe. Click a part to read its current.' },
    ],
    quiz: [
      { q: 'To measure the voltage across a resistor, you connect the meter…', options: ['in series with it', 'in parallel with it', 'in series with the battery only', 'to the battery’s + only'], answer: 1, why: 'Voltage is a difference between two points, so touch both sides of the part.' },
      { q: 'To measure current you must…', options: ['touch both sides of the part', 'break the loop and insert the meter in series', 'switch off the meter', 'measure resistance first'], answer: 1, why: 'Current is measured where it flows, so the meter has to be part of the path.' },
      { q: 'Resistance must be measured with the circuit…', options: ['powered', 'switched off, with the part isolated', 'on fire', 'connected to ground'], answer: 1, why: 'A live circuit or parallel paths give false readings, and a power supply could damage the meter.' },
    ],
    exercises: [
      measureEx('m1', 'Voltage at B', 'Use the multimeter to find the voltage at node **B**, measured against ground.', (c) => c.dc().v('B'), 'V', 'Click B with the red probe; black stays on ground.'),
      measureEx('m2', 'Voltage across R3', 'Measure the voltage across **R3**.', (c) => c.dc().vAcross('R3'), 'V', 'Red probe on C; black probe on ground.'),
      measureEx('m3', 'Current through R2', 'Measure the current through **R2**.', (c) => c.dc().current('R2'), 'A', 'Click the resistor R2 itself: that places an ammeter in series.'),
      measureEx('m4', 'Voltage across R1', 'Measure the voltage across **R1**. Give it as a positive number.', (c) => c.dc().vAcross('R1'), 'V', 'Red on A, then click B to move the black probe there.'),
    ],
  });

  // 12 -----------------------------------------------------------------------------------------
  const torch = (extra, sw = true) => C([V('V1', 4.5, 'a'), SW('SW1', sw, 'a', 'b'), LED('LED1', 'red', 'c', 'gnd', { bends: [BR], at: 0 }), ...extra], { a: TL, b: [380, 80], c: TR, gnd: BL });
  lessons.push({
    id: 'safety-project', title: 'Safety, and project: LED torch', time: '30 min',
    blocks: [
      { h: 'Safety first' },
      { warn: 'Mains electricity (the wall socket) can kill. Never open or modify anything plugged into the wall, and never build circuits that connect to it. Use batteries and low-voltage supplies only.' },
      { list: [
        '**Short circuits:** a wire straight across a battery makes huge current and heat. Batteries, especially lithium ones, can burn or explode.',
        '**Capacitors** can hold charge after power is removed. Large ones in power supplies and old TVs can shock you even when unplugged.',
        '**Heat:** resistors, regulators and soldering irons get hot. Respect power ratings.',
        '**Eyes:** wear safety glasses when cutting leads or soldering.',
        '**LiPo / lithium cells:** never puncture, overcharge or short them. Use proper chargers.',
      ] },
      { h: 'Project: a battery-powered LED torch' },
      { p: 'An LED has almost no resistance once it conducts, so on its own it would draw ruinous current. A **series resistor** limits it. Pick the resistor with Ohm’s law applied to what is left after the LED drops its share:' },
      { formula: 'R = (V_supply − V_LED) / I_LED' },
      { p: 'A red LED drops about 1.9 V and is happy at 10–20 mA. Your supply is three AA cells in series, 4.5 V. Aim for about 15 mA: R = (4.5 − 1.9) / 0.015 ≈ 173 Ω. Resistors come in standard values, so choose the nearest: 180 Ω.' },
      { tip: 'Try it first in the Workbench (top bar): place an LED straight across a battery and see what the simulator says.' },
    ],
    quiz: [
      { q: 'Why must an LED have a resistor in series?', options: ['To make it brighter', 'To limit the current to a safe value', 'Because LEDs need AC', 'To change its colour'], answer: 1, why: 'Without it, the current is limited only by tiny internal resistance and the LED burns out.' },
      { q: 'Which is safe to experiment with as a beginner?', options: ['A 4.5 V battery pack', 'A wall socket', 'A charged capacitor from an old TV', 'The back of a microwave oven'], answer: 0, why: 'Low-voltage batteries cannot push dangerous current through your skin. The others can kill.' },
      { q: 'A 9 V battery is shorted with a wire. The main danger is…', options: ['Nothing happens', 'The wire and battery get very hot', 'The battery charges', 'The voltage doubles'], answer: 1, why: 'Almost no resistance means huge current and heat, so batteries can burn or burst.' },
    ],
    exercises: [
      {
        id: 'torch', type: 'build', title: 'Project: LED torch',
        prompt: 'Build the torch. The battery pack (4.5 V), switch and red LED are placed. Add a **series resistor** so the LED gets 10–20 mA, nothing is overloaded, and the switch really turns the LED off.',
        palette: ['resistor'], tools: ['wire'], starter: torch([]), solution: torch([R('R1', 180, 'b', 'c')]),
        hint: 'R = (4.5 − 1.9) / 0.015 ≈ 173 Ω. Place a resistor between the two loose dots and set it to 180 Ω.',
        tests: [
          hasPart('resistor'),
          ledBetween(0.01, 0.02),
          notOverloaded,
          T('the switch turns the LED off', (c, { expect }) => expect(new Circuit(withSwitches(c.json, false)).dc().current(c.first('led', 'LED').id), 'A').toBeAtMost(1e-6)),
        ],
      },
    ],
  });

  EB.lessons = EB.lessons || {};
  EB.lessons.fundamentals = lessons;
})();

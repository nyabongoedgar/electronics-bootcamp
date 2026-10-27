// Assembles the track list from lesson files. Only tracks with `lessons` are playable.
(function () {
  const EB = (globalThis.EB = globalThis.EB || {});
  const L = EB.lessons || {};

  EB.TRACKS = [
    {
      id: 'fundamentals', title: 'Electricity Fundamentals', status: 'ready',
      prereq: 'Basic arithmetic',
      blurb: 'Use Ohm’s law, solve series, parallel and divider circuits, use a multimeter and read a schematic.',
      lessons: L.fundamentals || [],
    },
    {
      id: 'analog', title: 'Analog Electronics', status: 'planned', phase: 'Phase 2', prereq: 'Track 1',
      blurb: 'Diodes, LEDs, transistors, op-amps; capacitors, inductors and RC filters; reading an oscilloscope.',
      needs: 'Transient and AC solvers, oscilloscope and function generator',
      outline: ['Capacitors and RC circuits', 'Inductors and RL circuits', 'AC basics and the oscilloscope', 'Reactance and impedance', 'Filters and Bode plots', 'Diodes', 'LEDs in depth', 'Rectifier and smoothing capacitor', 'BJT transistors', 'MOSFET switches', 'Op-amps', 'Project: night-light'],
    },
    {
      id: 'digital', title: 'Digital Electronics', status: 'planned', phase: 'Phase 3', prereq: 'Track 1',
      blurb: 'Logic gates, Boolean algebra, flip-flops, counters, state machines and binary arithmetic.',
      needs: 'Event-driven logic simulator and logic analyser',
      outline: ['Analog vs digital, binary and hex', 'Logic gates and truth tables', 'Boolean algebra and K-maps', 'Building from NAND', 'Adders', 'Multiplexers and decoders', 'Latches and flip-flops', 'Counters and shift registers', 'Finite state machines', 'Project: digital dice'],
    },
    {
      id: 'mcu', title: 'Microcontrollers (Arduino)', status: 'planned', phase: 'Phase 4', prereq: 'Tracks 1 and 3',
      blurb: 'Blink LEDs, read buttons and sensors, PWM, serial and interrupts on a simulated board.',
      needs: 'Virtual board and Arduino-style API',
      outline: ['What is a microcontroller?', 'Blink', 'Buttons and debouncing', 'Analog input', 'PWM', 'Serial output', 'Variables, loops, functions', 'Timers and millis()', 'Interrupts', 'Project: reaction-time game'],
    },
    {
      id: 'real', title: 'Build It for Real', status: 'planned', phase: 'Phase 6 (stretch)', prereq: 'Tracks 1–4',
      blurb: 'Datasheets, choosing parts, breadboarding, soldering safely, debugging and an intro to PCBs.',
      outline: ['Reading datasheets', 'Choosing components', 'Breadboard best practices', 'Soldering and safety', 'Debugging with a multimeter', 'Intro to KiCad and PCBs'],
    },
  ];
})();

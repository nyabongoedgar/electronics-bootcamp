// App shell: routing, track picker, lesson pages, exercises, workbench.
(function () {
  const EB = globalThis.EB;
  const { format } = EB.units;
  const { Circuit, runTests, checkAnswer } = EB.engine;
  const app = document.getElementById('app');

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------- progress (localStorage, tolerant of it being unavailable) ----------
  const KEY = 'eb-progress-v1';
  let memory = {};
  const progress = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return memory; } },
    save(p) { memory = p; try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (_) { /* ignore */ } },
    has(id) { return !!this.load()[id]; },
    mark(id) { const p = this.load(); p[id] = true; this.save(p); },
    reset() { this.save({}); },
  };
  const trackStats = (t) => {
    let total = 0, done = 0;
    t.lessons.forEach((l) => {
      l.quiz.forEach((_, i) => { total++; if (progress.has(`q:${l.id}:${i}`)) done++; });
      l.exercises.forEach((e) => { total++; if (progress.has(`x:${e.id}`)) done++; });
    });
    return { total, done, pct: total ? Math.round((100 * done) / total) : 0 };
  };
  const lessonDone = (l) => l.quiz.every((_, i) => progress.has(`q:${l.id}:${i}`)) && l.exercises.every((e) => progress.has(`x:${e.id}`));

  // ---------- routing ----------
  let editors = [];
  function route() {
    editors.forEach((e) => { try { e.destroy(); } catch (_) { /* gone */ } });
    editors = [];
    const [, kind, a, b] = (location.hash || '#/').split('/');
    const t = (id) => EB.TRACKS.find((x) => x.id === id);
    if (kind === 'track' && t(a)) renderTrack(t(a));
    else if (kind === 'lesson' && t(a) && t(a).lessons && t(a).lessons.find((l) => l.id === b)) renderLesson(t(a), t(a).lessons.find((l) => l.id === b));
    else if (kind === 'bench') renderBench();
    else renderPicker();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  function mount(host, opts) {
    const ed = new EB.ui.Editor(host, opts);
    editors.push(ed);
    return ed;
  }

  // ---------- track picker ----------
  function renderPicker() {
    document.title = 'Electronics Bootcamp';
    app.innerHTML = `
      <h1>What do you want to learn?</h1>
      <p class="lede">Interactive electronics, from “what is a volt?” to real circuits. Build in the simulator, predict, measure, and get instant feedback. No install and no account; your progress stays in this browser.</p>
      <div class="cards">${EB.TRACKS.map((t, i) => {
        const ready = t.status === 'ready';
        const s = ready ? trackStats(t) : null;
        return `<article class="card ${ready ? '' : 'soon'}">
          <span class="badge ${ready ? 'ready' : ''}">${ready ? `${t.lessons.length} lessons` : `Planned · ${esc(t.phase)}`}</span>
          <h3>${i + 1}. ${esc(t.title)}</h3>
          <p>${esc(t.blurb)}</p>
          <p class="muted">Prerequisite: ${esc(t.prereq)}</p>
          ${ready ? `<div class="bar" role="progressbar" aria-valuenow="${s.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${s.pct}%"></i></div><p class="muted">${s.done} of ${s.total} done</p>
            <a class="btn" href="#/track/${t.id}">${s.done ? 'Continue' : 'Start'}</a>`
          : `<a class="btn secondary" href="#/track/${t.id}">See the outline</a>`}
        </article>`;
      }).join('')}</div>
      <p class="muted" style="margin-top:28px">Not sure where to begin? Take them in order, 1 → 2 → 3 → 4 → 5. Tracks 2 and 3 are independent of each other. <button class="small danger" id="reset" type="button">Reset my progress</button></p>`;
    document.getElementById('reset').onclick = () => { if (confirm('Erase all saved progress in this browser?')) { progress.reset(); route(); } };
  }

  // ---------- track home ----------
  function sidebar(t, current) {
    return `<aside class="side" aria-label="Lessons"><h4><a href="#/track/${t.id}">${esc(t.title)}</a></h4>
      <ol>${t.lessons.map((l, i) => `<li><a href="#/lesson/${t.id}/${l.id}" ${l.id === current ? 'aria-current="page"' : ''}><span class="num">${i + 1}</span>${esc(l.title)}${lessonDone(l) ? '<span class="done" aria-label="completed">✓</span>' : ''}</a></li>`).join('')}</ol></aside>`;
  }

  function renderTrack(t) {
    document.title = `${t.title} · Electronics Bootcamp`;
    if (t.status !== 'ready') {
      app.innerHTML = `<p><a href="#/">← All tracks</a></p><h1>${esc(t.title)}</h1><p class="lede">${esc(t.blurb)}</p>
        <div class="block-tip"><strong>Planned for ${esc(t.phase)}.</strong> ${t.needs ? `It needs: ${esc(t.needs)}.` : ''} The roadmap ships one track at a time, so this one is not playable yet.</div>
        <h2>Planned lessons</h2><ol>${t.outline.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>
        <p>Meanwhile, the <a href="#/bench">Workbench</a> lets you build anything with the parts that exist today.</p>`;
      return;
    }
    const s = trackStats(t);
    app.innerHTML = `<div class="layout">${sidebar(t)}<section><p><a href="#/">← All tracks</a></p><h1>${esc(t.title)}</h1><p class="lede">${esc(t.blurb)}</p>
      <div class="bar"><i style="width:${s.pct}%"></i></div><p class="muted">${s.done} of ${s.total} quizzes and exercises done</p>
      <div class="cards">${t.lessons.map((l, i) => `<article class="card"><span class="badge">${esc(l.time)}${lessonDone(l) ? ' · done ✓' : ''}</span><h3>${i + 1}. ${esc(l.title)}</h3>
        <p class="muted">${l.quiz.length} quiz questions · ${l.exercises.length} exercises</p><a class="btn small" href="#/lesson/${t.id}/${l.id}">Open</a></article>`).join('')}</div></section></div>`;
  }

  // ---------- lesson page ----------
  function renderBlock(b) {
    if (b.h) return `<h2>${inline(b.h)}</h2>`;
    if (b.p) return `<p>${inline(b.p)}</p>`;
    if (b.list) return `<ul>${b.list.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`;
    if (b.tip) return `<div class="block-tip"><strong>Tip.</strong> ${inline(b.tip)}</div>`;
    if (b.warn) return `<div class="block-warn"><strong>Careful.</strong> ${inline(b.warn)}</div>`;
    if (b.formula) return `<div class="block-formula" role="math">${esc(b.formula)}</div>`;
    if (b.table) return `<div style="overflow-x:auto"><table class="data"><thead><tr>${b.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (b.circuit) return '<div class="demo"></div>' + (b.caption ? `<p class="caption">${inline(b.caption)}</p>` : '');
    return '';
  }

  function renderLesson(t, l) {
    document.title = `${l.title} · Electronics Bootcamp`;
    const idx = t.lessons.indexOf(l);
    const next = t.lessons[idx + 1];
    app.innerHTML = `<div class="layout">${sidebar(t, l.id)}<article>
      <p class="muted">Lesson ${idx + 1} of ${t.lessons.length} · ${esc(l.time)}</p><h1>${esc(l.title)}</h1>
      ${l.blocks.map(renderBlock).join('')}
      <h2>Quick check</h2><div id="quiz"></div>
      <h2>Exercises</h2><div id="exercises"></div>
      <p style="margin-top:30px">${idx > 0 ? `<a class="btn secondary" href="#/lesson/${t.id}/${t.lessons[idx - 1].id}">← Previous</a> ` : ''}${next ? `<a class="btn" href="#/lesson/${t.id}/${next.id}">Next: ${esc(next.title)} →</a>` : `<a class="btn" href="#/track/${t.id}">Finish track</a>`}</p>
    </article></div>`;

    const demos = app.querySelectorAll('.demo');
    l.blocks.filter((b) => b.circuit).forEach((b, i) => {
      mount(demos[i], { circuit: b.circuit, caption: b.caption, editable: !!b.editable, probe: !!b.probe, tool: b.tool, showVolts: b.showVolts !== false });
    });
    l.quiz.forEach((q, i) => renderQuiz(app.querySelector('#quiz'), l, q, i));
    l.exercises.forEach((ex) => renderExercise(app.querySelector('#exercises'), t, ex));
  }

  function renderQuiz(host, lesson, q, i) {
    const el = document.createElement('div');
    el.className = 'quiz';
    const name = `q-${lesson.id}-${i}`;
    el.innerHTML = `<p class="q"><strong>${i + 1}.</strong> ${inline(q.q)}</p>${q.options.map((o, j) => `<label><input type="radio" name="${name}" value="${j}"> ${inline(o)}</label>`).join('')}<p class="why" aria-live="polite"></p>`;
    host.appendChild(el);
    const labels = el.querySelectorAll('label');
    if (progress.has(`q:${lesson.id}:${i}`)) { labels[q.answer].classList.add('right'); el.querySelector('.why').textContent = q.why; }
    el.addEventListener('change', (e) => {
      const j = +e.target.value;
      labels.forEach((l) => l.classList.remove('right', 'wrong'));
      if (j === q.answer) {
        labels[j].classList.add('right');
        el.querySelector('.why').textContent = 'Correct. ' + q.why;
        progress.mark(`q:${lesson.id}:${i}`);
        refreshSidebar();
      } else {
        labels[j].classList.add('wrong');
        el.querySelector('.why').textContent = 'Not quite. Have another go.';
      }
    });
  }

  function refreshSidebar() {
    const [, , a, b] = location.hash.split('/');
    const t = EB.TRACKS.find((x) => x.id === a);
    const old = app.querySelector('aside.side');
    if (t && old) { const d = document.createElement('div'); d.innerHTML = sidebar(t, b); old.replaceWith(d.firstElementChild); }
  }

  // ---------- exercises ----------
  const TYPE_TAG = { calculate: 'Calculate', measure: 'Measure', predict: 'Predict', build: 'Build', fix: 'Fix' };

  function renderExercise(host, track, ex) {
    const card = document.createElement('section');
    card.className = 'exercise';
    const key = `x:${ex.id}`;
    const setDone = () => { progress.mark(key); card.classList.add('done'); refreshSidebar(); };
    card.innerHTML = `<h3><span class="tag">${TYPE_TAG[ex.type]}</span> ${esc(ex.title)} <span class="done-mark" aria-live="polite"></span></h3><p>${inline(ex.prompt)}</p><div class="body"></div>`;
    host.appendChild(card);
    if (progress.has(key)) card.classList.add('done');
    const body = card.querySelector('.body');
    const mark = () => { card.querySelector('.done-mark').textContent = '✓'; };
    if (progress.has(key)) mark();

    const hintBlock = () => {
      const h = document.createElement('div');
      h.className = 'hint'; h.hidden = true; h.innerHTML = '<strong>Hint.</strong> ' + inline(ex.hint || 'Re-read the lesson.');
      return h;
    };

    if (ex.type === 'calculate' || ex.type === 'measure') {
      let ans = ex.answer;
      if (ex.type === 'measure') ans = { ...ans, value: ans.measure(new Circuit(ex.circuit)) };
      let ed = null;
      if (ex.type === 'measure') {
        const holder = document.createElement('div');
        body.appendChild(holder);
        ed = mount(holder, { circuit: ex.circuit, editable: false, probe: true, tool: 'probe', showVolts: false });
      }
      const row = document.createElement('form');
      row.className = 'answer-row';
      row.innerHTML = `<input type="text" aria-label="Your answer" placeholder="e.g. 4.7 kΩ" autocomplete="off"><button class="btn small" type="submit">Check</button>
        <button type="button" class="small" data-hint>Hint</button><button type="button" class="small" data-sol>Show answer</button>`;
      const fb = document.createElement('p');
      fb.className = 'feedback'; fb.setAttribute('aria-live', 'polite');
      const hint = hintBlock();
      body.append(row, fb, hint);
      row.addEventListener('submit', (e) => {
        e.preventDefault();
        const r = checkAnswer(ans, row.querySelector('input').value);
        fb.className = 'feedback ' + (r.pass ? 'ok' : 'bad');
        fb.textContent = r.pass ? 'Correct!' : r.msg;
        if (r.pass) { setDone(); mark(); }
      });
      row.querySelector('[data-hint]').onclick = () => { hint.hidden = !hint.hidden; };
      row.querySelector('[data-sol]').onclick = () => {
        row.querySelector('input').value = ex.solution || format(ans.value, ans.unit);
        fb.className = 'feedback'; fb.textContent = 'That is the answer. Work out how to get there, then try the next one.';
      };
      void ed;
      return;
    }

    if (ex.type === 'predict') {
      const name = `p-${ex.id}`;
      const holder = document.createElement('div');
      body.appendChild(holder);
      let ed = mount(holder, { circuit: ex.circuit, editable: false, showVolts: false });
      const form = document.createElement('form');
      form.innerHTML = `<p><strong>${inline(ex.question)}</strong></p>${ex.options.map((o, j) => `<label class="opt"><input type="radio" name="${name}" value="${j}"> ${inline(o)}</label>`).join('')}
        <div class="actions"><button class="primary" type="submit">Lock in my prediction</button></div><p class="feedback" aria-live="polite"></p>`;
      body.appendChild(form);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pick = form.querySelector('input:checked');
        const fb = form.querySelector('.feedback');
        if (!pick) { fb.className = 'feedback bad'; fb.textContent = 'Pick an option first.'; return; }
        const truth = ex.truth(new Circuit(ex.circuit));
        const labels = form.querySelectorAll('label');
        labels.forEach((l) => l.classList.remove('right', 'wrong'));
        labels[truth].classList.add('right');
        const good = +pick.value === truth;
        if (!good) labels[+pick.value].classList.add('wrong');
        fb.className = 'feedback ' + (good ? 'ok' : 'bad');
        fb.textContent = (good ? 'Right! ' : 'Not this time. ') + ex.why;
        if (good) { setDone(); mark(); }
        ed.destroy(); editors = editors.filter((x) => x !== ed);
        ed = mount(holder, { circuit: ex.circuit, editable: !!ex.editable, showVolts: true });
      });
      return;
    }

    // build / fix
    const holder = document.createElement('div');
    body.appendChild(holder);
    const ed = mount(holder, { circuit: ex.starter, palette: ex.palette || [], tools: ex.tools || [], editable: true, showVolts: true });
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = '<button type="button" class="primary" data-run>Run tests</button><button type="button" data-hint>Hint</button><button type="button" data-sol>Show solution</button><button type="button" data-reset>Reset</button>';
    const results = document.createElement('ul');
    results.className = 'results'; results.setAttribute('aria-live', 'polite');
    const hint = hintBlock();
    body.append(actions, results, hint);
    actions.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.run !== undefined) {
        const res = runTests(ex.tests, ed.getCircuit());
        results.innerHTML = res.map((r) => `<li class="${r.pass ? 'pass' : 'fail'}">${esc(r.name)}${r.pass ? '' : `<span class="msg">${esc(r.msg)}</span>`}</li>`).join('');
        if (res.every((r) => r.pass)) { setDone(); mark(); results.insertAdjacentHTML('beforeend', '<li class="feedback ok">All tests pass. Nicely done!</li>'); }
      } else if (b.dataset.hint !== undefined) hint.hidden = !hint.hidden;
      else if (b.dataset.sol !== undefined) { ed.setCircuit(clone(ex.solution)); ed.draw(); ed.refresh(); results.innerHTML = '<li class="muted">The solution is loaded into the editor. Press Run tests, then study how it differs from your attempt.</li>'; }
      else if (b.dataset.reset !== undefined) { ed.setCircuit(clone(ex.starter)); results.innerHTML = ''; }
    });
  }

  // ---------- workbench ----------
  const EXAMPLES = {
    'Empty canvas': { parts: [] },
    'LED with resistor': { parts: [{ id: 'V1', type: 'vsource', value: 9, pins: ['a', 'gnd'] }, { id: 'R1', type: 'resistor', value: 470, pins: ['a', 'b'] }, { id: 'LED1', type: 'led', color: 'green', pins: ['b', 'gnd'] }], layout: { a: [160, 80], b: [600, 80], gnd: [160, 320] } },
    'LED without a resistor (don’t!)': { parts: [{ id: 'V1', type: 'vsource', value: 9, pins: ['a', 'gnd'] }, { id: 'LED1', type: 'led', color: 'red', pins: ['a', 'gnd'] }], layout: { a: [380, 80], gnd: [380, 320] } },
    'Voltage divider': { parts: [{ id: 'V1', type: 'vsource', value: 9, pins: ['a', 'gnd'] }, { id: 'R1', type: 'resistor', value: 10000, pins: ['a', 'out'] }, { id: 'R2', type: 'resistor', value: 5000, pins: ['out', 'gnd'], bends: [[380, 320]], at: 0 }], layout: { a: [160, 80], out: [380, 80], gnd: [160, 320] } },
    'Rectifier diode drop': { parts: [{ id: 'V1', type: 'vsource', value: 5, pins: ['a', 'gnd'] }, { id: 'R1', type: 'resistor', value: 430, pins: ['a', 'b'] }, { id: 'D1', type: 'diode', pins: ['b', 'gnd'] }], layout: { a: [160, 80], b: [600, 80], gnd: [160, 320] } },
  };

  function renderBench() {
    document.title = 'Workbench · Electronics Bootcamp';
    app.innerHTML = `<h1>Workbench</h1><p class="lede">A free sandbox: build anything with the parts so far. There are no tests here. Experiment, and read the notes under the circuit when something looks wrong.</p>
      <p><label>Start from <select id="ex">${Object.keys(EXAMPLES).map((k) => `<option>${esc(k)}</option>`).join('')}</select></label></p>
      <div class="bench-grid"><div id="bench"></div><aside class="card"><h3>Readings</h3><div id="readings" class="muted">Nothing yet.</div></aside></div>`;
    const readings = app.querySelector('#readings');
    const show = (circ, op) => {
      if (!op.ok) { readings.textContent = op.errors[0] || 'Nothing to show.'; return; }
      const nodes = op.nodes.map((n) => `<tr><td>${n === 'gnd' ? 'ground' : esc(n)}</td><td>${esc(format(op.v(n), 'V'))}</td></tr>`).join('');
      const parts = circ.parts.map((p) => `<tr><td>${esc(p.id)}</td><td>${esc(format(op.current(p.id), 'A'))}</td><td>${esc(format(op.power(p.id), 'W'))}</td></tr>`).join('');
      readings.innerHTML = `<table class="readings"><tr><th>Node</th><th>Voltage</th></tr>${nodes}</table><br><table class="readings"><tr><th>Part</th><th>Current</th><th>Power</th></tr>${parts}</table>`;
    };
    const ed = mount(app.querySelector('#bench'), {
      circuit: EXAMPLES['LED with resistor'], editable: true, probe: true, showVolts: true,
      palette: ['vsource', 'resistor', 'led', 'diode', 'lamp', 'switch', 'ldr'], tools: ['wire', 'ground', 'delete'], onChange: show,
    });
    show(ed.getCircuit(), ed.op);
    app.querySelector('#ex').value = 'LED with resistor';
    app.querySelector('#ex').onchange = (e) => { ed.setCircuit(clone(EXAMPLES[e.target.value])); show(ed.getCircuit(), ed.op); };
  }

  route();
})();

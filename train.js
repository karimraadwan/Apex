/* Apex training tools: weights logger + rest timer, exercise videos, warm-up builder, interval timer,
   run checks against your race pace, race-day plan, HYROX stations, sport sessions + weekly load,
   injury mode and travel mode. Loaded before app.js. */
const TI = {
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  band: '<path d="M4 12a8 8 0 0 1 16 0"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M2 12h20"/>',
  fist: '<path d="M7 11V7a2 2 0 0 1 4 0v4M11 9a2 2 0 0 1 4 0v2M15 10a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-2a2 2 0 0 1 4 0"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-2 7 1 4-5.5a2 2 0 0 1 3 3L13 12l1 7-2 1.5-2.5-7.5z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M8 11h2l1.5-2 2 4 1.5-2h1"/>',
  play: '<path d="M8 5v14l11-7z"/>', pause: '<path d="M8 5v14M16 5v14"/>'
};
const nk = (s) => String(s || '').toLowerCase().replace(/\d+(\.\d+)?\s*kg/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/* ======================= 1. weights logger + rest timer ======================= */
function restSec(rest) {
  const s = String(rest || ''); let m = s.match(/(\d+(?:\.\d+)?)(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:min|m)\b/i); if (m) return Math.round(Number(m[1]) * 60);
  m = s.match(/(\d+)\s*(?:s|sec)/i); return m ? Number(m[1]) : 90;
}
function rxTarget(name, rx) {
  // your plans are written reps x sets, e.g. "Hip thrusters 12 x 3" = 12 reps, 3 sets
  const t = String(rx || '') + ' ' + String(name || ''), sr = t.match(/(\d+)(?:\s*-\s*(\d+))?\s*(?:each(?:\s+side|\s+leg|\s+hand)?\s*)?[×x]\s*(\d+)/i), kg = t.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (sr) return { sets: Math.max(1, Math.min(10, Number(sr[3]))), reps: Number(sr[2] || sr[1]), kg: kg ? Number(kg[1]) : '' };
  // other ways you write it: "15 Australian pullups x 3", "L-sit 10s x 3", "EMOM x5: ..."
  const xs = t.match(/[×x]\s*(\d+)(?!.*[×x]\s*\d)/i), first = String(name || '').match(/^\D{0,3}?(\d+)\b(?!\s*kg)/i);
  return { sets: xs ? Math.max(1, Math.min(10, Number(xs[1]))) : 3, reps: first ? Number(first[1]) : 8, kg: kg ? Number(kg[1]) : '' };
}
function setsFor(ex) { const k = nk(ex); return (D().sets || []).filter((s) => nk(s.exercise) === k); }
function liftSuggest(ex, tgt) {
  const today = todayStr(), hist = setsFor(ex).filter((s) => s.date < today);
  if (!hist.length) return { kg: tgt.kg, last: null, why: tgt.kg ? 'From your plan' : 'No history yet' };
  const lastDate = hist[hist.length - 1].date, last = hist.filter((s) => s.date === lastDate).sort((a, b) => a.set - b.set);
  const top = Math.max(...last.map((s) => Number(s.kg) || 0)), allHit = last.every((s) => Number(s.reps) >= tgt.reps);
  const inc = /squat|deadlift|leg press|hip thrust|lunge|rdl/i.test(ex) ? 5 : 2.5;
  if (!top) return { kg: tgt.kg, last, why: 'Bodyweight last time' };
  return allHit ? { kg: top + inc, last, why: 'You hit every set last time: +' + inc + ' kg' } : { kg: top, last, why: 'Same weight until you hit ' + tgt.reps + ' reps on every set' };
}
function exSheetBody() {
  const X = S.ex, today = todayStr(), done = setsFor(X.name).filter((s) => s.date === today), sug = liftSuggest(X.name, X.tgt);
  const nSets = Math.max(X.tgt.sets, X.extra + X.tgt.sets, done.length);
  let h = '<p class="mut small">' + esc(X.rx || '') + (X.rest ? ' · rest ' + fmtSec(X.rest) : '') + '</p>' + cuesHTML(X.name);
  if (sug.last) h += '<div class="lastbox"><span class="eyebrow3">Last time · ' + esc(niceDate(sug.last[0].date)) + '</span><b>' + sug.last.map((s) => (Number(s.kg) ? s.kg + ' kg × ' : '') + s.reps).join(' · ') + '</b><span class="mut small">' + esc(sug.why) + '</span></div>';
  else h += '<p class="mut small">' + esc(sug.why) + '</p>';
  h += '<div class="setgrid" role="table" aria-label="Sets"><div class="sg-h" role="row"><span>Set</span><span>kg</span><span>Reps</span><span></span></div>';
  for (let i = 1; i <= nSets; i++) {
    const d = done.find((s) => Number(s.set) === i);
    h += '<div class="sg-r' + (d ? ' done' : '') + '" role="row"><span class="sg-n">' + i + '</span>' +
      '<input id="kg' + i + '" type="number" inputmode="decimal" step="0.5" min="0" max="500" value="' + esc(d ? d.kg : sug.kg) + '" aria-label="Set ' + i + ' weight in kg">' +
      '<input id="rp' + i + '" type="number" inputmode="numeric" min="0" max="500" value="' + esc(d ? d.reps : X.tgt.reps) + '" aria-label="Set ' + i + ' reps">' +
      '<button class="setok' + (d ? ' on' : '') + '" data-act="setlog" data-i="' + i + '" aria-label="' + (d ? 'Set ' + i + ' saved, update it' : 'Save set ' + i + ' and start rest') + '">' + (d ? '✓' : 'Done') + '</button></div>';
  }
  h += '</div><div class="row"><button class="sm" data-act="setadd">+ Add set</button><button class="sm" data-act="restgo" data-s="' + (X.rest || 90) + '">' + ICON(TI.timer, 'ib') + ' Rest ' + fmtSec(X.rest || 90) + '</button></div>';
  // 13. videos for this exercise
  const words = nk(X.name).split(' ').filter((w) => w.length > 3);
  const vids = D().library.filter((l) => { const t = nk(l.title + ' ' + (l.note || '')); return words.length && words.some((w) => t.indexOf(w) >= 0); });
  h += '<p class="lbl">How to do it</p><div class="card list flat">' + vids.slice(0, 4).map((l) => '<a class="li" href="' + esc(l.url) + '" target="_blank" rel="noopener"><span class="li-ic" style="background:#d6249f">' + ICON(I.play) + '</span><span class="li-main"><b>' + esc(l.title) + '</b><span class="mut small">' + esc(l.creator || l.tab) + '</span></span><span class="chev">›</span></a>').join('') +
    '<a class="li" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(nk(X.name) + ' exercise proper form') + '" target="_blank" rel="noopener"><span class="li-ic" style="background:#ff0000">' + ICON(I.play) + '</span><span class="li-main"><b>Watch on YouTube</b><span class="mut small">Search: ' + esc(nk(X.name)) + ' form</span></span><span class="chev">›</span></a></div>' +
    '<div class="row"><input id="exvid" inputmode="url" placeholder="Paste a video link for this exercise" aria-label="Video link for this exercise"><button class="sm fit" data-act="exvid">Save</button></div>';
  return h;
}
function exOpen(el) {
  const name = el.dataset.n, rx = el.dataset.rx;
  S.ex = { name, rx, tgt: rxTarget(name, rx), rest: Number(el.dataset.rest) || 90, extra: 0 };
  infoSheet(nk(name) ? name.replace(/\s*\d+(\.\d+)?\s*kg/i, '') : name, exSheetBody(), 'ex');
}
function setLog(i) {
  const X = S.ex, kg = $('#kg' + i).value.trim(), reps = $('#rp' + i).value.trim();
  if (!/^\d+$/.test(reps)) { toast('Write the reps'); return; }
  if (kg && !(Number(kg) >= 0 && Number(kg) <= 500)) { toast('Weight must be 0-500 kg'); return; }
  const ex = X.name.replace(/\s*\d+(\.\d+)?\s*kg/i, '').trim();
  send({ action: 'log', table: 'Sets', row: { date: todayStr(), exercise: ex, set: String(i), reps, kg: kg || '0', note: '' } });
  keepScroll('ex', exSheetBody());
  const nSets = X.tgt.sets + X.extra; if (i < nSets) restStart(X.rest || 90); else toast('All sets done. Nice work.');
}
/* rest timer: a bar above the tabs that counts down and beeps */
let RT = null;
function beep(n) {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return; S.ac = S.ac || new A();
    for (let i = 0; i < (n || 1); i++) { const o = S.ac.createOscillator(), g = S.ac.createGain(); o.frequency.value = 880; o.connect(g); g.connect(S.ac.destination); const t = S.ac.currentTime + i * 0.25; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.start(t); o.stop(t + 0.2); }
  } catch (e) { /* no sound */ }
  try { if (navigator.vibrate) navigator.vibrate(300); } catch (e) { /* ignore */ }
}
function tone(f, t0, len, vol, type) { try { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; S.ac = S.ac || new A(); const o = S.ac.createOscillator(), g = S.ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; o.connect(g); g.connect(S.ac.destination); const t = S.ac.currentTime + t0; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.start(t); o.stop(t + len + 0.02); } catch (e) { /* no sound */ } }
function bell(n) { for (let i = 0; i < (n || 1); i++) { tone(660, i * 0.55, 1.2, 0.35, 'triangle'); tone(1320, i * 0.55, 0.8, 0.12); } try { if (navigator.vibrate) navigator.vibrate(500); } catch (e) { /* ignore */ } }
function clap() { tone(2200, 0, 0.06, 0.4, 'square'); tone(2200, 0.18, 0.06, 0.4, 'square'); }
function restStart(sec) {
  restStop(); beep(0);
  const bar = document.createElement('div'); bar.id = 'rest'; bar.setAttribute('role', 'timer'); bar.setAttribute('aria-live', 'off');
  bar.innerHTML = '<span class="rt-l">Rest</span><b id="rtv"></b><button class="rt-b" data-act="restadd" aria-label="Add 30 seconds">+30s</button><button class="rt-b" data-act="reststop" aria-label="Stop rest timer">✕</button><i id="rtp"></i>';
  document.body.appendChild(bar);
  RT = { end: Date.now() + sec * 1000, total: sec };
  const tick = () => {
    if (!RT) return; const left = Math.max(0, Math.round((RT.end - Date.now()) / 1000));
    const v = $('#rtv'); if (v) v.textContent = fmtSec(left); const p = $('#rtp'); if (p) p.style.width = (100 * left / RT.total) + '%';
    if (left <= 0) { beep(3); bar.classList.add('go'); $('#rtv').textContent = 'Go!'; RT = null; setTimeout(restStop, 2500); return; }
    RT.t = setTimeout(tick, 250);
  };
  tick();
}
function restStop() { if (RT && RT.t) clearTimeout(RT.t); RT = null; const b = $('#rest'); if (b) b.remove(); }

/* ======================= 14. warm-up builder ======================= */
const WARM = {
  legs: ['Bike or easy jog, 3 min', 'Leg swings, 10 each way', '90/90 hip switches, 8 each side', 'Ankle rocks, 10 each', 'Glute bridges, 12', 'Bodyweight squats, 10', 'Goblet squat, light, 2 x 6'],
  push: ['Rower or jumping jacks, 2 min', 'Arm circles, 10 each way', 'Band pull-aparts, 15', 'Scapula push-ups, 10', 'Cat-cow, 8', 'Incline push-ups, 8', 'Pike shoulder taps, 10'],
  pull: ['Rower or rope, 2 min', 'Shoulder CARs, 5 each', 'Dead hang, 2 x 20 s', 'Scapula pull-ups, 2 x 8', 'Band face pulls, 15', 'Hollow hold, 2 x 20 s'],
  run: ['Brisk walk or easy jog, 4 min', 'Leg swings, 10 each way', 'A-skips, 2 x 20 m', 'B-skips, 2 x 20 m', 'High knees, 2 x 20 m', 'Strides, 3 x 80 m building to fast'],
  cond: ['Easy row or bike, 3 min', 'World’s greatest stretch, 4 each side', 'Inchworms, 6', 'Air squats, 10', 'Jumping jacks, 30', 'Burpees at easy pace, 5', '2 short bursts at race pace, 20 s each'],
  kb: ['Jump rope or jog, 2 min', 'Halo with light bell, 6 each way', 'Hip hinge drill, 10', 'Goblet squat hold, 30 s', 'Light swings, 15', 'Turkish get-up to elbow, 3 each side'],
  mob: ['Breathing, 6 slow breaths', 'Cat-cow, 10', 'Thread the needle, 6 each side', 'Deep squat hold, 45 s', 'Hip flexor stretch, 45 s each']
};
function warmKind(s) {
  s = String(s || '').toLowerCase();
  if (/leg|squat|lower/.test(s)) return 'legs'; if (/push|press|dip|handstand/.test(s)) return 'push'; if (/pull|muscle|mu\b|row/.test(s)) return 'pull';
  if (/run|jog|tempo|interval/.test(s)) return 'run'; if (/kettle|kb/.test(s)) return 'kb'; if (/recover|mobil|flow|yoga|walk/.test(s)) return 'mob';
  if (/calisth/.test(s)) return /push/.test(s) ? 'push' : 'pull';
  return 'cond';
}
function warmSheet(session) {
  const k = warmKind(session), L = WARM[k];
  infoSheet('Warm-up · 6 to 8 min', '<p class="mut small">Made for ' + esc(session) + '. Easy pace: you should feel warm, not tired.</p><ol class="warm-l">' + L.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol><button class="p" style="width:100%;margin-top:16px" data-act="itopen" data-m="custom" data-w="45" data-r="15" data-n="' + L.length + '">' + ICON(TI.timer, 'ib') + ' Start a 45 s / 15 s timer</button>');
}

/* ======================= 15. interval timer ======================= */
const IT_PRESET = { emom: { w: 60, r: 0, n: 10, label: 'EMOM' }, tabata: { w: 20, r: 10, n: 8, label: 'Tabata' }, amrap: { w: 600, r: 0, n: 1, label: 'AMRAP' }, custom: { w: 40, r: 20, n: 8, label: 'Custom' } };
function itBody() {
  const T = S.it;
  if (T.run) {
    const ph = T.phase === 'work' ? 'WORK' : T.phase === 'rest' ? 'REST' : T.phase === 'get' ? 'GET READY' : 'DONE';
    return '<div class="itrun ' + T.phase + '"><span class="it-ph">' + ph + '</span><b id="itv">' + fmtSec(T.left) + '</b><span class="it-rd">Round ' + Math.min(T.round, T.n) + ' of ' + T.n + '</span></div>' +
      '<div class="row"><button data-act="itpause">' + (T.paused ? 'Resume' : 'Pause') + '</button><button class="r" data-act="itstop">Stop</button></div>';
  }
  return '<div class="segc" role="group" aria-label="Timer type">' + Object.keys(IT_PRESET).map((k) => '<button class="' + (T.mode === k ? 'on' : '') + '" aria-pressed="' + (T.mode === k) + '" data-act="itmode" data-m="' + k + '">' + IT_PRESET[k].label + '</button>').join('') + '</div>' +
    '<p class="mut small">' + { rounds: 'Fight rounds: a clap 10 s before the end, a bell to start and stop.', emom: 'A new round starts every interval. Do the work, rest what is left.', tabata: '20 s hard, 10 s rest, 8 rounds.', amrap: 'As many rounds as possible in the time.', custom: 'Set your own work, rest and rounds.' }[T.mode] + '</p>' +
    '<div class="row three">' +
    '<div><label class="mut small" for="itw">' + (T.mode === 'amrap' ? 'Minutes' : T.mode === 'rounds' ? 'Round (min)' : 'Work (s)') + '</label><input id="itw" type="number" inputmode="decimal" min="0.5" max="3600" value="' + (T.mode === 'amrap' || T.mode === 'rounds' ? T.w / 60 : T.w) + '"></div>' +
    (T.mode === 'amrap' || T.mode === 'emom' ? '' : '<div><label class="mut small" for="itr">Rest (s)</label><input id="itr" type="number" inputmode="numeric" min="0" max="600" value="' + T.r + '"></div>') +
    (T.mode === 'amrap' ? '' : '<div><label class="mut small" for="itn">Rounds</label><input id="itn" type="number" inputmode="numeric" min="1" max="100" value="' + T.n + '"></div>') + '</div>' +
    '<button class="p" style="width:100%;margin-top:20px" data-act="itstart">' + ICON(TI.play, 'ib') + ' Start</button>';
}
function itOpen(mode, w, r, n) {
  const P = IT_PRESET[mode || 'emom'];
  S.it = { mode: mode || 'emom', w: w || P.w, r: r != null ? r : P.r, n: n || P.n, run: false };
  infoSheet('Interval timer', itBody(), 'it');
}
function itStart() {
  const T = S.it, w = Number(($('#itw') || {}).value), r = Number(($('#itr') || { value: T.mode === 'emom' || T.mode === 'amrap' ? 0 : T.r }).value), n = Number(($('#itn') || { value: 1 }).value);
  T.w = T.mode === 'amrap' || T.mode === 'rounds' ? Math.round(Math.max(0.5, w || 0) * 60) : Math.max(5, w || 0); T.r = Math.max(0, r || 0); T.n = T.mode === 'amrap' ? 1 : Math.max(1, Math.min(100, n || 1));
  Object.assign(T, { run: true, phase: 'get', left: 5, round: 1, paused: false, last: Date.now() });
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { S.wl = l; }).catch(() => {}); } catch (e) { /* ignore */ }
  refreshSheet('it', itBody()); itTick();
}
function itTick() {
  clearTimeout(S.itT); const T = S.it;
  if (!T || !T.run || !document.querySelector('.modal.info[data-id="it"]')) { itEnd(); return; }
  if (!T.paused) {
    const now = Date.now(); T.acc = (T.acc || 0) + (now - T.last); T.last = now;
    while (T.acc >= 1000) {
      T.acc -= 1000; T.left--;
      if (T.mode === 'rounds' && T.phase === 'work' && T.left === 10) clap();
      else if (T.left <= 3 && T.left > 0 && T.mode !== 'rounds') beep(1);
      if (T.left <= 0) {
        if (T.phase === 'get') { T.phase = 'work'; T.left = T.w; T.mode === 'rounds' ? bell() : beep(2); }
        else if (T.phase === 'work' && T.r > 0) { T.phase = 'rest'; T.left = T.r; T.mode === 'rounds' ? bell(3) : beep(2); }
        else { T.round++; if (T.round > T.n) { T.phase = 'done'; T.left = 0; T.mode === 'rounds' ? bell(3) : beep(4); refreshSheet('it', itBody()); itEnd(); return; } T.phase = 'work'; T.left = T.w; T.mode === 'rounds' ? bell() : beep(2); }
        refreshSheet('it', itBody());
      }
    }
    const v = $('#itv'); if (v) v.textContent = fmtSec(T.left);
  } else T.last = Date.now();
  S.itT = setTimeout(itTick, 200);
}
function itEnd() { clearTimeout(S.itT); try { if (S.wl) { S.wl.release(); S.wl = null; } } catch (e) { /* ignore */ } }

/* ======================= 2. runs checked against your race pace ======================= */
function goalPace() {
  const ev = nextRace(); const km = ev && (RACE_KM.find((r) => r[0].test(ev.name)) || [])[1], g = ev && secOf(ev.goal);
  if (km && g) return { pace: g / km, from: 'your ' + ev.name + ' goal' };
  const runs = D().strava.filter((a) => /run/i.test(a.type) && Number(a.distance_km) >= 5 && paceOf(a) > 0);
  if (runs.length) { const best = Math.min(...runs.map(paceOf)); return { pace: best + 10, from: 'your best recent runs' }; }
  return null;
}
function runZones() {
  const g = goalPace(); if (!g) return null; const p = g.pace;
  return { from: g.from, race: p, easy: [p + 60, p + 100], long: [p + 40, p + 80], tempo: [p - 10, p + 10], intervals: [p - 35, p - 10] };
}
function runKind(name) { const s = String(name || '').toLowerCase(); return /interval|track|repeat|speed/.test(s) ? 'intervals' : /tempo|threshold|race pace/.test(s) ? 'tempo' : /long/.test(s) ? 'long' : 'easy'; }
function runCheck(a) {
  const Z = runZones(), pace = paceOf(a); if (!Z || !pace || !/run/i.test(a.type)) return null;
  const p = sessionFor(a.date), kind = p && /run|jog|tempo|interval/i.test(p.name) ? runKind(p.name) : Number(a.distance_km) >= 14 ? 'long' : 'easy';
  const z = Z[kind], ok = pace >= z[0] - 5 && pace <= z[1] + 5, fast = pace < z[0] - 5;
  return { kind, z, ok, fast, planned: p ? p.name : '', text: (ok ? '✓ On target' : fast ? 'Faster than planned' : 'Slower than planned') + ' for ' + kind + ' (' + fmtSec(z[0]) + '–' + fmtSec(z[1]) + ' /km)' };
}

/* ======================= 3. race-day plan ======================= */
function raceDayPlan(ev) {
  const km = (RACE_KM.find((r) => r[0].test(ev.name)) || [])[1] || 21.0975, goal = secOf(ev.goal) || 0, kmInt = Math.ceil(km);
  const body = D().logs.Body, wt = body.length ? Number(body[body.length - 1].weight) : 0, hrs = goal / 3600;
  let h = '<p class="mut small">' + esc(niceDate(ev.date)) + (goal ? ' · goal ' + esc(ev.goal) + ' (' + fmtSec(goal / km) + ' /km)' : ' · set a goal time to get your pacing') + '</p>';
  if (goal) {
    const base = goal / km, rows = [];
    for (let k = 1; k <= kmInt; k++) {
      const adj = k <= 2 ? 9 : k >= kmInt - 3 && k < kmInt ? -6 : 0;
      rows.push([k, base + adj]);
    }
    let cum = 0;
    h += '<p class="lbl">Pacing · start easy, finish strong</p><div class="pace-t">' + rows.map(([k, p]) => { const seg = (Math.min(k, km) - (k - 1)) * p; cum += seg; return '<div><span>km ' + (k > km ? km.toFixed(1) : k) + '</span><b>' + fmtSec(p) + '</b><em>' + fmtSec(cum) + '</em></div>'; }).join('') + '</div>' +
      '<p class="mut small">First 2 km about 9 s slower than goal pace so you don\u2019t start too fast, the last 3 full km 6 s faster.</p>';
  }
  const carbs = wt ? Math.round(wt * 7) + ' g (7 g per kg)' : '7 g per kg of body weight';
  h += '<p class="lbl">Two days before</p><ul class="rd-l"><li>Carb up: about ' + carbs + ' of carbs a day, from rice, pasta, bread, potatoes, fruit. Keep fat and fibre lower.</li><li>Sleep is the big one: aim for 8+ hours both nights.</li><li>Easy 20 min run with 4 short strides the day before.</li></ul>' +
    '<p class="lbl">Race morning</p><ul class="rd-l"><li>Wake 3 hours before the start.</li><li>Breakfast 2.5–3 h before: ' + (wt ? Math.round(wt * 1.5) + ' g carbs' : '1–2 g carbs per kg') + ', e.g. bread with honey and a banana, plus 500 ml water.</li><li>Coffee 45–60 min before if you usually drink it.</li><li>Warm up 10 min: easy jog plus 3 strides.</li></ul>' +
    '<p class="lbl">During the race</p><ul class="rd-l"><li>Drink 150–250 ml at most water stations, more if it is hot.</li>' + (hrs > 1.25 || !goal ? '<li>Gel or 2–3 dates at 40–45 min and again at 75–80 min, with water.</li>' : '<li>One gel at about 40 min if you trained with it.</li>') + '<li>Nothing new on race day: same shoes, socks and food you trained with.</li></ul>' +
    '<p class="lbl">After</p><ul class="rd-l"><li>Within 1 hour: protein and carbs, e.g. chicken with rice, plus ORS or salty food and water.</li><li>Walk 10 min, then rest. Easy days for the next 3–4 days.</li></ul>';
  return h;
}

/* ======================= 16. HYROX stations ======================= */
const HY = [['Run 1', 300], ['SkiErg 1000 m', 270], ['Run 2', 300], ['Sled push', 210], ['Run 3', 300], ['Sled pull', 270], ['Run 4', 300], ['Burpee broad jumps', 270], ['Run 5', 300], ['Row 1000 m', 270], ['Run 6', 300], ['Farmers carry', 120], ['Run 7', 300], ['Sandbag lunges', 270], ['Run 8', 300], ['Wall balls', 360], ['Roxzone (all transitions)', 420]];
function hyEvents() { const by = {}; (D().hyrox || []).forEach((r) => { (by[r.date] = by[r.date] || { date: r.date, event: r.event, st: {} }).st[r.station] = r.time; }); return Object.values(by).sort((a, b) => (a.date < b.date ? 1 : -1)); }
function hyBody() {
  const E = hyEvents(), cur = E[0];
  let h = '<p class="mut small">Log each station from a race or simulation. I compare it with a solid Open-division target and show where you lose the most time.</p>';
  if (cur) {
    const lost = HY.map(([n, t]) => ({ n, t, me: secOf(cur.st[n]) })).filter((x) => x.me).map((x) => Object.assign(x, { d: x.me - x.t })).sort((a, b) => b.d - a.d);
    const tot = Object.values(cur.st).reduce((a, t) => a + secOf(t), 0);
    h += '<div class="lastbox"><span class="eyebrow3">' + esc(cur.event || 'HYROX') + ' · ' + esc(niceDate(cur.date)) + '</span><b>Total ' + fmtSec(tot) + '</b><span class="mut small">' + Object.keys(cur.st).length + ' of ' + HY.length + ' parts logged</span></div>';
    if (lost.length) h += '<p class="lbl">Where you lose the most time</p><div class="card list flat">' + lost.slice(0, 5).map((x, i) => '<div class="li"><span class="li-main"><b>' + (i + 1) + '. ' + esc(x.n) + '</b><span class="mut small">You ' + fmtSec(x.me) + ' · target ' + fmtSec(x.t) + '</span></span><span class="li-end ' + (x.d > 0 ? 'badt' : 'okt') + '">' + (x.d > 0 ? '+' : '−') + fmtSec(Math.abs(x.d)) + '</span></div>').join('') + '</div>';
  }
  h += '<p class="lbl">' + (cur ? 'Log another race or simulation' : 'Log a race or simulation') + '</p><div class="row two"><div><label class="mut small" for="hyd">Date</label><input type="date" id="hyd" value="' + todayStr() + '"></div><div><label class="mut small" for="hye">Name</label><input id="hye" maxlength="40" placeholder="e.g. HYROX Cairo"></div></div>' +
    '<div class="hygrid">' + HY.map(([n], i) => '<label for="hy' + i + '"><span>' + esc(n) + '</span><input id="hy' + i + '" inputmode="numeric" placeholder="m:ss" maxlength="8"></label>').join('') + '</div><p class="err" id="hyerr" role="alert"></p><button class="p" style="width:100%" data-act="hysave">Save times</button>';
  return h;
}
function hySave() {
  const ds = $('#hyd').value, ev = ($('#hye').value || 'HYROX').trim(), err = $('#hyerr'), rows = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) { err.textContent = 'Pick a date'; return; }
  for (let i = 0; i < HY.length; i++) { const v = $('#hy' + i).value.trim(); if (!v) continue; if (!/^\d{1,2}:\d{2}$/.test(v)) { err.textContent = HY[i][0] + ': write it like 4:35'; return; } rows.push([HY[i][0], v]); }
  if (!rows.length) { err.textContent = 'Write at least one station time'; return; }
  rows.forEach(([st, t]) => send({ action: 'log', table: 'Hyrox', row: { date: ds, event: ev.slice(0, 40), station: st, time: t } }));
  refreshSheet('hy', hyBody()); toast('Saved ' + rows.length + ' times');
}

/* ======================= 17. sport sessions + weekly training load ======================= */
const SPORTS = ['Sparring', 'BJJ', 'Muay Thai', 'Boxing', 'Wrestling', 'Climbing', 'Football', 'Padel', 'Swimming', 'Other'];
const LOAD_RPE = { Hard: 8, Moderate: 6, Recovery: 3, Rest: 0 };
function weekLoad(endDs) {
  let tot = 0;
  for (let i = 0; i < 7; i++) {
    const ds = dateAdd(endDs, -i);
    logs('WorkoutLog', ds).filter((l) => l.status === 'done').forEach((l) => { const p = sessionFor(ds); tot += 60 * (LOAD_RPE[p && p.p.load] || 6); });
    D().strava.filter((a) => a.date === ds && !/weight|workout|hiit/i.test(a.type + ' ' + a.name)).forEach((a) => { tot += (Number(a.moving_min) || 0) * (/run/i.test(a.type) ? 6 : 3); });
    (D().sport || []).filter((x) => x.date === ds).forEach((x) => { tot += Number(x.minutes) * Number(x.rpe); });
  }
  return Math.round(tot);
}
function loadCard() {
  const t = todayStr(), now = weekLoad(t), prev = [7, 14, 21].map((k) => weekLoad(dateAdd(t, -k))), avg = prev.reduce((a, b) => a + b, 0) / 3;
  const ratio = avg ? now / avg : 0, st = !avg ? ['Building your baseline', ''] : ratio > 1.3 ? ['Big jump this week', 'badt'] : ratio < 0.8 ? ['Lighter week', 'warnt'] : ['Steady', 'okt'];
  const sp = (D().sport || []).filter((x) => x.date > dateAdd(t, -7));
  return '<h2>Training load</h2><section class="card load"><div class="row sp"><div><span class="eyebrow3">Last 7 days</span><b class="ld-n">' + now + '</b><span class="mut small"> load points</span></div><span class="pill ' + (st[1] === 'badt' ? 'swap' : st[1] === 'warnt' ? 'reduce' : 'keep') + '">' + st[0].toUpperCase() + '</span></div>' +
    '<p class="mut small" style="margin-top:8px">' + (avg ? 'Your usual week: ' + Math.round(avg) + '. ' + (ratio > 1.3 ? 'More than 30% above normal raises injury risk. Keep the next days easier.' : 'Within a safe range.') : 'Effort × minutes from workouts, runs and sports. Needs 3 weeks of data.') + '</p>' +
    (sp.length ? '<p class="small" style="margin-top:8px">' + sp.map((x) => esc(x.type) + ' ' + x.minutes + ' min').join(' · ') + '</p>' : '') +
    '<button class="link-row" data-act="sportlog">Log a sport session (sparring, BJJ, climbing…)<span class="chev">›</span></button></section>';
}
function sportBody() {
  const v = S.sp || (S.sp = { type: 'Sparring', rpe: 7 });
  return '<div class="chiprow">' + SPORTS.map((s) => '<button class="chip' + (s === v.type ? ' on' : '') + '" aria-pressed="' + (s === v.type) + '" data-act="sptype" data-t="' + s + '">' + s + '</button>').join('') + '</div>' +
    '<div class="row two"><div><label class="mut small" for="spm">Minutes</label><input id="spm" type="number" inputmode="numeric" min="1" max="600" value="' + (v.min || 60) + '"></div><div><label class="mut small" for="spr">Rounds (optional)</label><input id="spr" type="number" inputmode="numeric" min="0" max="100" value="' + (v.rounds || '') + '"></div></div>' +
    '<p class="lbl">How hard was it? ' + v.rpe + '/10</p><div class="rpe" role="group" aria-label="Effort from 1 to 10">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => '<button class="' + (n === v.rpe ? 'on' : '') + '" aria-pressed="' + (n === v.rpe) + '" data-act="sprpe" data-n="' + n + '">' + n + '</button>').join('') + '</div><p class="mut small">1 very easy · 5 steady · 8 hard · 10 all-out</p>' +
    '<div class="row two"><div><label class="mut small" for="spd">Date</label><input type="date" id="spd" value="' + todayStr() + '"></div><div><label class="mut small" for="spn">Note</label><input id="spn" maxlength="100" placeholder="optional"></div></div>' +
    '<button class="p" style="width:100%;margin-top:20px" data-act="spsave">Save session</button>';
}

/* ======================= 18. injury mode ======================= */
const INJ = {
  Knee: [/squat|lunge|jump|pistol|step.?up|burpee|wall ball|leg press|skater|box/i, 'Glute bridge or hip thrust, same sets'],
  Shoulder: [/press|push.?up|dip|handstand|muscle.?up|snatch|wall ball|pike|overhead|jerk|thruster/i, 'Band external rotations + light rows, same sets'],
  'Lower back': [/deadlift|good morning|swing|clean|row\b|bent|rdl|sandbag|sled/i, 'Bird dog + dead bug, same sets'],
  Wrist: [/push.?up|handstand|plank|press|dip|front rack|burpee|clean/i, 'Fist or dumbbell-handle version, or skip'],
  Elbow: [/curl|pull.?up|chin.?up|dip|skull|muscle.?up|extension/i, 'Isometric holds, pain-free range only'],
  Ankle: [/run|jump|skip|rope|lunge|sprint|burpee|box/i, 'Bike or row, same time'],
  Hamstring: [/deadlift|rdl|sprint|nordic|swing|good morning|hamstring/i, 'Glute bridge isometric 30 s, same sets'],
  Hip: [/squat|lunge|deadlift|run|kick|sprint|step.?up/i, 'Upper-body or core move instead']
};
function activeInjuries() { return (D().injuries || []).filter((i) => i.status === 'active'); }
function adaptSession(ses) {
  if (!ses) return ses; const inj = activeInjuries(); if (!inj.length) return ses;
  let n = 0;
  const details = String(ses.details || '').split('\n').map((l) => {
    if (!/^\s*-/.test(l)) return l;
    const hit = inj.find((i) => INJ[i.area] && INJ[i.area][0].test(l));
    if (!hit) return l; n++; return '- ' + INJ[hit.area][1] + ' (instead of ' + l.replace(/^\s*-\s*/, '').replace(/,.*$/, '') + ')';
  }).join('\n');
  return Object.assign({}, ses, { details, injured: n, injAreas: inj.map((i) => i.area) });
}
function injBody() {
  const act = activeInjuries();
  return '<p class="mut small">Tell me what hurts. Until you mark it healed, I swap the exercises that load it for safe ones in every session. Sharp pain, swelling or pain that lasts more than a week: see a physio or doctor.</p>' +
    (act.length ? '<div class="card list flat">' + act.map((i) => '<div class="li"><span class="li-main"><b>' + esc(i.area) + '</b><span class="mut small">since ' + esc(niceDate(i.since)) + (i.note ? ' · ' + esc(i.note) : '') + '</span></span><button class="sm fit" data-act="injheal" data-a="' + esc(i.area) + '">Healed</button></div>').join('') + '</div>' : '') +
    '<p class="lbl">What hurts?</p><div class="chiprow">' + Object.keys(INJ).filter((a) => !act.some((i) => i.area === a)).map((a) => '<button class="chip" data-act="injadd" data-a="' + esc(a) + '">+ ' + esc(a) + '</button>').join('') + '</div>' +
    '<label class="mut small" for="injn">Note (optional, saved with the next one you add)</label><input id="injn" maxlength="100" placeholder="e.g. left knee, hurts on stairs">';
}

/* ======================= 25. travel mode ======================= */
function travel() { try { const t = JSON.parse(D().cfg.travel || 'null'); return t && t.to >= new Date().toISOString().slice(0, 10) ? t : null; } catch (e) { return null; } }
function travelTz() { const t = S.data && S.data.cfg && S.data.cfg.travel ? travel() : null; const n = new Date().toISOString().slice(0, 10); return t && t.tz && n >= t.from && n <= t.to ? t.tz : null; }
function travelBody() {
  const t = travel();
  if (t) return '<div class="lastbox"><span class="eyebrow3">Travel mode is on</span><b>' + esc(t.place) + '</b><span class="mut small">' + esc(niceDate(t.from)) + ' to ' + esc(niceDate(t.to)) + ' · ' + esc(t.equip) + (t.tz ? ' · ' + esc(t.tz.replace(/_/g, ' ')) : '') + '</span></div>' +
    '<p class="mut small">Your sessions on these days are rewritten for what you have. Meals: on Today you get a simple guide that works in any restaurant.</p><button class="r" style="width:100%;margin-top:16px" data-act="trend"' + (S.trBusy ? ' disabled' : '') + '>End travel mode</button>';
  let dev = ''; try { dev = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* ignore */ }
  return '<p class="mut small">Going away? I rewrite your sessions for the equipment you will have and switch the app to local time while you are there.</p>' +
    '<label class="mut small" for="trp">Where to?</label><input id="trp" maxlength="60" placeholder="e.g. Dubai">' +
    '<div class="row two"><div><label class="mut small" for="trf">From</label><input type="date" id="trf" value="' + todayStr() + '"></div><div><label class="mut small" for="trt">To</label><input type="date" id="trt" value="' + dateAdd(todayStr(), 4) + '"></div></div>' +
    '<p class="lbl">What will you have?</p><div class="segc" role="group" aria-label="Equipment">' + [['none', 'Nothing'], ['hotel gym', 'Hotel gym'], ['full gym', 'Full gym']].map(([k, l]) => '<button class="' + ((S.trEq || 'none') === k ? 'on' : '') + '" aria-pressed="' + ((S.trEq || 'none') === k) + '" data-act="treq" data-e="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<label class="mut small" for="trz">Time zone there</label><input id="trz" list="tzl" value="' + esc(dev && dev !== tz() ? dev : '') + '" placeholder="e.g. Asia/Dubai (leave empty if same as home)"><datalist id="tzl">' + ['Asia/Dubai', 'Asia/Riyadh', 'Europe/London', 'Europe/Warsaw', 'Europe/Berlin', 'Europe/Paris', 'Europe/Istanbul', 'America/New_York'].map((z) => '<option value="' + z + '">').join('') + '</datalist>' +
    '<p class="err" id="trerr" role="alert"></p><button class="p" style="width:100%" data-act="trstart"' + (S.trBusy ? ' disabled' : '') + '>' + (S.trBusy ? 'Rewriting your sessions…' : 'Turn on travel mode') + '</button>';
}
function travelMealsCard() {
  const t = travel(); if (!t || todayStr() < t.from) return '';
  return '<section class="card travelc"><span class="eyebrow3">' + ICON(TI.plane) + ' Travel mode · ' + esc(t.place) + '</span><p class="small" style="margin:8px 0 0">Eat the same way anywhere: each meal a palm-to-two-palms of protein (grilled meat, fish, eggs), a fist of carbs on training days, half a plate of vegetables. Water bottle with you all day.</p><button class="link-row" data-act="eatout">Help me order at a restaurant<span class="chev">›</span></button></section>';
}

/* ======================= Train tab: tools ======================= */
function toolsCard() {
  const inj = activeInjuries().length, tr = travel();
  const T = [['itopen', TI.timer, 'Interval timer', 'EMOM · Tabata · AMRAP', '#0ea5e9'], ['hyopen', TI.bolt, 'HYROX stations', 'Find your slowest part', '#f59e0b'], ['sportlog', TI.fist, 'Sport session', 'Sparring, BJJ, climbing', '#ef4444'],
    ['injopen', TI.heart, inj ? 'Injury mode · on' : 'Injury mode', inj ? activeInjuries().map((i) => i.area).join(', ') : 'Swap exercises that hurt', inj ? '#ff453a' : '#14b8a6'], ['tropen', TI.plane, tr ? 'Travel mode · on' : 'Travel mode', tr ? tr.place : 'Hotel and no-gym sessions', '#6d5ce8']];
  return '<h2>Tools</h2><div class="tools">' + T.map(([a, ic, t, s, c]) => '<button class="tool" data-act="' + a + '"><span class="li-ic" style="background:' + c + '">' + ICON(ic) + '</span><b>' + t + '</b><span>' + esc(s) + '</span></button>').join('') + '</div>';
}

/* ======================= actions ======================= */
COACH_KEEP.push('setlog', 'setadd', 'restgo', 'exvid', 'itmode', 'itstart', 'itpause', 'itstop', 'hysave', 'sptype', 'sprpe', 'injadd', 'injheal', 'treq', 'trstart', 'trend');
Object.assign(COACH_ACTS, {
  exopen: (el) => exOpen(el),
  setlog: (el) => setLog(Number(el.dataset.i)),
  setadd: () => { S.ex.extra++; keepScroll('ex', exSheetBody()); },
  restgo: (el) => restStart(Number(el.dataset.s) || 90),
  restadd: () => { if (RT) { RT.end += 30000; RT.total += 30; } },
  reststop: () => restStop(),
  exvid: () => {
    const u = ($('#exvid').value || '').trim(); if (!/^https?:\/\/\S+$/i.test(u)) { toast('Paste a full link that starts with https://'); return; }
    if (D().library.some((l) => l.url === u)) { toast('Already saved'); return; }
    send({ action: 'log', table: 'Library', row: { tab: 'Exercises', title: nk(S.ex.name).replace(/\b\w/g, (c) => c.toUpperCase()), creator: platformOf(u), url: u, note: S.ex.name } });
    keepScroll('ex', exSheetBody()); toast('Saved for this exercise');
  },
  warmup: (el) => warmSheet(el.dataset.s),
  itopen: (el) => itOpen(el.dataset.m, Number(el.dataset.w) || 0, el.dataset.r != null ? Number(el.dataset.r) : null, Number(el.dataset.n) || 0),
  itmode: (el) => { const P = IT_PRESET[el.dataset.m]; Object.assign(S.it, { mode: el.dataset.m, w: P.w, r: P.r, n: P.n }); refreshSheet('it', itBody()); },
  itstart: () => itStart(),
  itpause: () => { S.it.paused = !S.it.paused; refreshSheet('it', itBody()); },
  itstop: () => { S.it.run = false; itEnd(); refreshSheet('it', itBody()); },
  racedayopen: (el) => { const ev = D().events.find((e) => e.name === el.dataset.n && e.date === el.dataset.d) || nextRace(); if (ev) infoSheet('Race-day plan · ' + ev.name, raceDayPlan(ev), 'rd'); },
  hyopen: () => infoSheet('HYROX stations', hyBody(), 'hy'),
  hysave: () => hySave(),
  sportlog: () => { S.sp = null; infoSheet('Sport session', sportBody(), 'sp'); },
  sptype: (el) => { S.sp.min = $('#spm').value; S.sp.rounds = $('#spr').value; S.sp.type = el.dataset.t; keepScroll('sp', sportBody()); },
  sprpe: (el) => { S.sp.min = $('#spm').value; S.sp.rounds = $('#spr').value; S.sp.rpe = Number(el.dataset.n); keepScroll('sp', sportBody()); },
  spsave: () => {
    const m = Number($('#spm').value), r = $('#spr').value.trim(), ds = $('#spd').value;
    if (!(m >= 1 && m <= 600)) { toast('Minutes must be 1 to 600'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds) || ds > todayStr()) { toast('Pick a date up to today'); return; }
    send({ action: 'log', table: 'SportLog', row: { id: 's' + Date.now(), date: ds, type: S.sp.type, rounds: r, minutes: String(m), rpe: String(S.sp.rpe), note: ($('#spn').value || '').trim() } });
    closeSheets(); toast(S.sp.type + ' saved · ' + m * S.sp.rpe + ' load points');
  },
  injopen: () => infoSheet('Injury mode', injBody(), 'inj'),
  injadd: (el) => { send({ action: 'log', table: 'Injuries', row: { area: el.dataset.a, since: todayStr(), status: 'active', note: ($('#injn').value || '').trim() } }); refreshSheet('inj', injBody()); toast('Injury mode on for ' + el.dataset.a); },
  injheal: (el) => { const i = (D().injuries || []).find((x) => x.area === el.dataset.a); send({ action: 'log', table: 'Injuries', row: Object.assign({}, i, { status: 'healed' }) }); refreshSheet('inj', injBody()); toast(el.dataset.a + ' marked healed'); },
  tropen: () => { S.trEq = 'none'; infoSheet('Travel mode', travelBody(), 'tr'); },
  treq: (el) => { const keep = ['#trp', '#trf', '#trt', '#trz'].map((q) => $(q).value); S.trEq = el.dataset.e; refreshSheet('tr', travelBody()); ['#trp', '#trf', '#trt', '#trz'].forEach((q, i) => { $(q).value = keep[i]; }); },
  trstart: async () => {
    const place = $('#trp').value.trim(), from = $('#trf').value, to = $('#trt').value, z = $('#trz').value.trim(), err = $('#trerr');
    if (!place) { err.textContent = 'Where are you going?'; return; }
    if (!from || !to || to < from) { err.textContent = 'Pick valid dates'; return; }
    if (z) { try { new Intl.DateTimeFormat('en', { timeZone: z }); } catch (e) { err.textContent = 'Unknown time zone'; return; } }
    if (!D().ai && S.trEq !== 'full gym') { err.textContent = 'Add your Claude API key first so I can rewrite the sessions.'; return; }
    S.trBusy = true; refreshSheet('tr', travelBody());
    try { const j = await call({ action: 'travel_start', from, to, place, tz: z, equip: S.trEq || 'none' }); D().cfg.travel = JSON.stringify(j.travel); D().overrides = j.overrides || D().overrides; save(); toast('Travel mode on. Have a good trip!'); closeSheets(); render(); }
    catch (e) { err.textContent = e.message === 'offline' ? 'You are offline.' : e.message; }
    S.trBusy = false; refreshSheet('tr', travelBody());
  },
  trend: async () => {
    if (!confirm('End travel mode? Your normal sessions come back.')) return;
    try { const j = await call({ action: 'travel_end' }); D().cfg.travel = ''; D().overrides = j.overrides || []; save(); closeSheets(); render(); toast('Welcome back'); }
    catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message); }
  }
});

/* Apex: one file built from src/ (coach.js, train.js, life.js, batch4.js, batch5.js, batch6.js, batch7.js, batch8.js, batch9.js, app.js, v2c.js, v2d.js, v2e.js, v2a.js, v2b.js). Edit the files in src/ and run build.py. */

/* ===================== coach.js ===================== */
/* Apex coach: feedback on your sessions, weekly review, race countdown, missed-workout fix,
   personal records, and the "create a new program" flow. Loaded before app.js. */
const CI = {
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  move: '<path d="M4 12h14M14 7l5 5-5 5"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
};
const DOC_LABELS = ['Calisthenics', 'Legs', 'Conditioning', 'Kettlebell', 'Running', 'Mobility', 'Nutrition', 'Other'];
const GOALS = ['Half marathon', 'Strength', 'Calisthenics skills', 'Build muscle', 'Lose fat', 'Conditioning', 'MMA'];
const FOCI = ['Let Apex decide', 'Calisthenics', 'Calisthenics Push', 'Calisthenics Pull', 'Legs', 'Conditioning', 'Kettlebell', 'Easy run', 'Long run', 'Intervals / tempo', 'Mobility', 'Sport (e.g. climbing)', 'Rest'];
const RATE = { great: ['Great', 'keep'], solid: ['Solid', 'keep'], easy: ['Easy', 'keep'], tough: ['Tough', 'reduce'], watch: ['Watch', 'swap'] };
const PR_PRESETS = [['Engine Test', 'time'], ['5K run', 'time'], ['Back squat', 'kg'], ['Weighted pull-up', 'kg'], ['Max burpees 60 s', 'reps'], ['Muscle-ups', 'reps'], ['Dead hang', 'time'], ['Farmers carry 2 x 24 kg', 'm']];
const LOADC = (l) => esc(String(l || '').toLowerCase());

/* ---------- small helpers ---------- */
function planWeeks() { return Math.max(1, ...(D().plan || []).map((p) => Number(p.week) || 1)); }
function secOf(t) { const p = String(t || '').split(':').map(Number); if (p.some(isNaN) || p.length < 2) return 0; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; }
function fmtSec(s) { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0'); return h ? h + ':' + String(m).padStart(2, '0') + ':' + x : m + ':' + x; }
function paceOf(a) { const km = Number(a.distance_km), min = Number(a.moving_min); return km > 0.2 && min > 0 ? (min * 60) / km : 0; }
function fbObj(f) { try { return Object.assign({}, JSON.parse(f.json || '{}'), { kind: f.kind, date: f.date, title: f.title, ref: f.ref }); } catch (e) { return null; } }
function latestFb(kinds) {
  const L = (D().feedback || []).filter((f) => kinds.indexOf(f.kind) >= 0).map(fbObj).filter(Boolean);
  L.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return L[L.length - 1] || null;
}
function bullets(cls, mark, arr) {
  arr = (Array.isArray(arr) ? arr : []).filter(Boolean); if (!arr.length) return '';
  return '<ul class="fb-list ' + cls + '">' + arr.map((x) => '<li><span aria-hidden="true">' + mark + '</span>' + esc(x) + '</li>').join('') + '</ul>';
}
function fbHTML(f) {
  const r = RATE[f.rating] || RATE.solid;
  return '<div class="fb-top"><span class="pill ' + r[1] + '">' + r[0].toUpperCase() + '</span><span class="mut small">' + esc(niceDate(f.date)) + '</span></div>' +
    '<h3>' + esc(f.headline || 'Feedback') + '</h3><p class="mut small">' + esc(f.title) + (f.done ? ' · ' + esc(f.done) : '') + '</p>' +
    bullets('good', '✓', f.good) + bullets('watch', '!', f.watch) +
    (f.focus ? '<p class="fb-next"><b>Focus this week</b>' + esc(f.focus) + '</p>' : '') +
    (f.next ? '<p class="fb-next"><b>Next</b>' + esc(f.next) + '</p>' : '');
}

/* ---------- Home: coach feedback ---------- */
function coachCard() {
  const d = D(), f = latestFb(['run', 'workout']), fresh = f && daysBetween(f.date, todayStr()) <= 4;
  let h = '<h2>Coach</h2><section class="card coach" aria-live="polite">';
  if (!d.ai) return h + '<div class="coach-empty"><span class="coach-ic">' + ICON(CI.spark) + '</span><div><b>Feedback after every run and workout</b><p class="mut small">Add your Claude API key (SETUP.md, part 9). Then after each WHOOP and Strava sync I review your newest session here.</p></div></div></section>';
  h += fresh ? fbHTML(f) : '<div class="coach-empty"><span class="coach-ic">' + ICON(CI.spark) + '</span><div><b>No new feedback yet</b><p class="mut small">After each sync I look at your newest run or finished workout. Tap below to ask now.</p></div></div>';
  return h + '<button class="link-row" data-act="chatopen">Ask the coach anything<span class="chev">›</span></button><button class="link-row" data-act="coachnow"' + (S.coachBusy ? ' disabled' : '') + '>' + (S.coachBusy ? 'Looking at your last session…' : fresh ? 'Refresh feedback' : 'Get feedback on my last session') + '<span class="chev">›</span></button></section>';
}
function weeklyCard(home) {
  const f = latestFb(['weekly']);
  if (!f || (home && daysBetween(f.date, todayStr()) > 1)) return '';
  return (home ? '' : '<h2>Weekly review</h2>') + '<section class="card weekly">' + (home ? '<span class="eyebrow3">Your weekly review</span>' : '') + fbHTML(f) + '</section>';
}
async function coachNow() {
  if (S.coachBusy) return;
  S.coachBusy = true; render();
  try { const j = await call({ action: 'coach_now' }); D().feedback = j.feedback || D().feedback; save(); toast('Feedback ready'); }
  catch (e) { toast(e.message === 'offline' ? 'You are offline. Try again when connected.' : e.message, 4500); }
  S.coachBusy = false; render();
}

/* ---------- Home: race countdown ---------- */
const RACE_KM = [[/half/i, 21.0975], [/marathon/i, 42.195], [/10\s?k/i, 10], [/5\s?k/i, 5]];
function nextRace() {
  const t = todayStr();
  return D().events.filter((e) => e.date && e.date >= t && daysBetween(t, e.date) <= 180).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
}
function racePhase(left) { return left <= 10 ? 'Taper' : left <= 28 ? 'Peak' : left <= 63 ? 'Build' : 'Base'; }
function raceDayLink() {
  const ev = nextRace(); if (!ev || daysBetween(todayStr(), ev.date) > 14) return '';
  return '<button class="card eoc" data-act="racedayopen" data-n="' + esc(ev.name) + '" data-d="' + esc(ev.date) + '"><span class="li-ic" style="background:#f59e0b">' + ICON(I.flag) + '</span><span><b>Race-day plan</b><span class="mut small">Pacing per km, food and water for ' + esc(ev.name) + '</span></span><span class="chev">›</span></button>';
}
function raceCard() {
  const ev = nextRace(); if (!ev) return '';
  const left = daysBetween(todayStr(), ev.date), ph = racePhase(left);
  const km = (RACE_KM.find((r) => r[0].test(ev.name)) || [])[1], g = secOf(ev.goal);
  const tip = { Base: 'Build easy kilometres. Most runs should feel conversational.', Build: 'Add one quality run a week: tempo or intervals.', Peak: 'Longest long run now, then hold. Sleep matters most.', Taper: 'Cut volume, keep a little speed. Arrive fresh.' }[ph];
  return '<button class="card race" data-act="evsheet" data-n="' + esc(ev.name) + '" data-d="' + esc(ev.date) + '" aria-label="' + esc(ev.name) + ', ' + left + ' days to go, ' + ph + ' phase">' +
    '<div class="race-top"><div class="race-big"><b>' + left + '</b><span>' + (left === 1 ? 'day' : 'days') + '</span></div><div class="race-t"><span class="eyebrow3">' + ICON(I.flag) + ' Race countdown</span><h3>' + esc(ev.name) + '</h3><p class="mut small">' + esc(niceDate(ev.date)) + ' · ' + Math.ceil(left / 7) + ' weeks' + (g ? ' · goal ' + esc(ev.goal) + (km ? ' (' + fmtSec(g / km) + ' /km)' : '') : ' · tap to set a goal time') + '</p></div></div>' +
    '<div class="phases" aria-hidden="true">' + ['Base', 'Build', 'Peak', 'Taper'].map((p) => '<span class="' + (p === ph ? 'on' : '') + '">' + p + '</span>').join('') + '</div>' +
    '<p class="small race-tip">' + esc(tip) + '</p></button>';
}

/* ---------- Home: missed workout fix ---------- */
function didTrain(ds) {
  return logs('WorkoutLog', ds).some((r) => r.status === 'done') || D().strava.some((a) => a.date === ds);
}
function missedFix() {
  const t = todayStr(), d = D(), start = d.cfg.program_start || '';
  // position in the plan week (weeks start on the program_start weekday, Saturday by default)
  const dw = start ? ((daysBetween(start, t) % 7) + 7) % 7 : (new Date(t + 'T12:00:00Z').getUTCDay() + 1) % 7;
  if (dw === 0) return null; // first day of a new plan week
  if (d.overrides.some((o) => o.date === t && /^(break|sick)/.test(o.reason || ''))) return null; // on a break or ill today
  for (let i = 1; i <= Math.min(3, dw); i++) {
    const ds = dateAdd(t, -i);
    if (ds < start || LS.getItem('missdis-' + ds)) continue;
    const s = sessionFor(ds);
    if (!s || s.p.load === 'Rest' || s.p.load === 'Recovery' || didTrain(ds)) continue;
    if (d.overrides.some((o) => String(o.reason || '').indexOf(ds) >= 0)) continue; // already moved
    for (let k = 0; k <= 6 - dw; k++) {
      const td = dateAdd(t, k);
      if (d.overrides.some((o) => o.date === td) || (k === 0 && didTrain(td))) continue;
      const ts = sessionFor(td), load = ts ? ts.p.load : 'Rest';
      if (load === 'Rest' || load === 'Recovery') return { from: ds, to: td, s, ts };
    }
    return { from: ds, s, to: null };
  }
  return null;
}
function missedCard() {
  if (missedWeek()) return ''; // the ease-back card covers a missed week
  const m = missedFix(); if (!m) return '';
  const dayName = (ds) => (ds === todayStr() ? 'today' : DOW_L[new Date(ds + 'T12:00:00Z').getUTCDay()]);
  return '<section class="card missed"><div class="ms-top"><span class="ms-ic">' + ICON(CI.move) + '</span><div><span class="eyebrow3">Missed workout</span><h3>' + esc(m.s.p.session) + '</h3><p class="mut small">Planned for ' + esc(dayName(m.from)) + '. ' +
    (m.to ? 'Move it to ' + esc(dayName(m.to)) + ' (' + esc(m.ts ? m.ts.p.session : 'rest day') + ')? Two hard days stay apart, so your recovery is protected.' : 'No easy day is left this week, so the best move is to let it go and stay on plan.') + '</p></div></div>' +
    '<div class="row hero-act">' + (m.to ? '<button class="p" data-act="mvacc" data-f="' + m.from + '" data-t="' + m.to + '">Move it</button><button data-act="mvrej" data-f="' + m.from + '">Skip it</button>' : '<button data-act="mvrej" data-f="' + m.from + '">OK, skip it</button>') + '</div></section>';
}
function moveAccept(from, to) {
  const s = sessionFor(from); if (!s) return;
  send({ action: 'log', table: 'Overrides', row: { date: to, session: s.p.session, load: s.p.load, time: s.p.time, daytype: s.p.daytype, details: s.p.details, reason: 'moved from ' + from } });
  toast(s.p.session + ' moved to ' + (to === todayStr() ? 'today' : niceDate(to)), 3000);
}

/* ---------- personal records ---------- */
function prRows() {
  const by = {};
  (D().prs || []).forEach((r) => { (by[r.name] = by[r.name] || []).push(r); });
  return Object.keys(by).map((n) => {
    const L = by[n].slice().sort((a, b) => (a.date < b.date ? -1 : 1)), unit = L[L.length - 1].unit, low = unit === 'time';
    const val = (r) => (unit === 'time' ? secOf(r.value) : Number(r.value));
    const best = L.reduce((b, r) => (!b || (low ? val(r) < val(b) : val(r) > val(b)) ? r : b), null);
    const prev = L.filter((r) => r !== best).reduce((b, r) => (!b || (low ? val(r) < val(b) : val(r) > val(b)) ? r : b), null);
    const isNew = best && L.length > 1 && best === L[L.length - 1] && daysBetween(best.date, todayStr()) <= 7;
    return { name: n, unit, best, prev, count: L.length, isNew };
  }).sort((a, b) => (a.best.date < b.best.date ? 1 : -1));
}
function prShow(v, u) { return u === 'time' ? esc(v) : esc(v) + ' ' + esc(u); }
function autoPRs() {
  const runs = D().strava.filter((a) => /run/i.test(a.type) && Number(a.distance_km) > 0);
  if (!runs.length) return [];
  const out = [], mx = (f) => runs.reduce((b, a) => (f(a) > f(b) ? a : b));
  const lr = mx((a) => Number(a.distance_km)); out.push(['Longest run', lr.distance_km + ' km', lr]);
  [[5, 'Best pace, 5 km+'], [10, 'Best pace, 10 km+']].forEach(([k, l]) => {
    const L = runs.filter((a) => Number(a.distance_km) >= k && paceOf(a) > 0);
    if (L.length) { const b = L.reduce((x, a) => (paceOf(a) < paceOf(x) ? a : x)); out.push([l, fmtSec(paceOf(b)) + ' /km', b]); }
  });
  const cl = mx((a) => Number(a.elevation) || 0); if (Number(cl.elevation) > 0) out.push(['Biggest climb', Math.round(cl.elevation) + ' m', cl]);
  return out;
}
function prsSection() {
  const rows = prRows(), auto = autoPRs();
  let h = '<h2>Personal records</h2><div class="card list">';
  h += rows.map((r) => '<button class="li" data-act="prsheet" data-n="' + esc(r.name) + '"><span class="li-ic" style="background:#f59e0b">' + ICON(CI.trophy) + '</span><span class="li-main"><b>' + esc(r.name) + '</b><span class="mut small">' + esc(niceDate(r.best.date)) + (r.prev ? ' · before: ' + prShow(r.prev.value, r.unit) : '') + '</span></span><span class="li-end">' + (r.isNew ? '<span class="pill keep">NEW</span> ' : '') + '<b class="pr-v">' + prShow(r.best.value, r.unit) + '</b><span class="chev">›</span></span></button>').join('');
  h += auto.map((x) => '<div class="li"><span class="li-ic" style="background:#fc4c02">' + ICON(I.run) + '</span><span class="li-main"><b>' + esc(x[0]) + '</b><span class="mut small">Strava · ' + esc(niceDate(x[2].date)) + '</span></span><span class="li-end"><b class="pr-v">' + esc(x[1]) + '</b></span></div>').join('');
  if (!rows.length && !auto.length) h += '<p class="empty-note">No records yet. Log your first one below.</p>';
  return h + row({ act: 'prlog', ic: I.plus, bg: 'var(--accFill)', t: 'Log a record', cls: 'add' }) + '</div>' + (auto.length ? '<p class="foot">Strava records use your synced runs from the last 4 months.</p>' : '');
}
function prCelebrate() {
  const r = prRows().find((x) => x.isNew && daysBetween(x.best.date, todayStr()) <= 2);
  if (!r) return '';
  const key = 'conf-' + r.best.date + '-' + r.name;
  if (!LS.getItem(key)) { LS.setItem(key, '1'); setTimeout(confetti, 350); }
  return '<button class="card prc" data-act="prsheet" data-n="' + esc(r.name) + '"><span class="prc-ic">' + ICON(CI.trophy) + '</span><span><span class="eyebrow3">New personal record</span><b>' + esc(r.name) + ': ' + prShow(r.best.value, r.unit) + '</b><span class="mut small">' + (r.prev ? 'Up from ' + prShow(r.prev.value, r.unit) : 'First record') + '</span></span></button>';
}
function prLog(name, unit) {
  S.prUnit = unit || 'time';
  infoSheet(name ? 'New result' : 'Log a record', prLogBody(name || ''), 'prlog');
}
function prLogBody(name) {
  const u = S.prUnit, have = prRows().map((r) => r.name), ideas = PR_PRESETS.filter((x) => have.indexOf(x[0]) < 0).concat(have.map((n) => [n, prRows().find((r) => r.name === n).unit]));
  return '<p class="mut small">Pick a test or type your own.</p><div class="chiprow">' + ideas.slice(0, 10).map((x) => '<button class="chip" data-act="prpre" data-n="' + esc(x[0]) + '" data-u="' + x[1] + '">' + esc(x[0]) + '</button>').join('') + '</div>' +
    '<label class="mut small" for="prn">Name</label><input id="prn" maxlength="60" value="' + esc(name) + '" placeholder="e.g. Engine Test">' +
    '<p class="lbl">Measured in</p><div class="segc" role="group" aria-label="Unit">' + [['time', 'Time'], ['kg', 'kg'], ['reps', 'Reps'], ['km', 'km'], ['m', 'm']].map((x) => '<button class="' + (x[0] === u ? 'on' : '') + '" aria-pressed="' + (x[0] === u) + '" data-act="prunit" data-u="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div class="row two"><div><label class="mut small" for="prv">Result</label><input id="prv" ' + (u === 'time' ? 'inputmode="numeric" placeholder="32:10"' : 'inputmode="decimal" placeholder="' + { kg: '100', reps: '12', km: '21.1', m: '400' }[u] + '"') + '></div><div><label class="mut small" for="prd">Date</label><input type="date" id="prd" value="' + todayStr() + '"></div></div>' +
    '<label class="mut small" for="prno">Note (optional)</label><input id="prno" maxlength="120" placeholder="e.g. felt strong, new shoes">' +
    '<p class="err" id="prerr" role="alert"></p><button class="p" style="width:100%" data-act="prsave">Save record</button>';
}
function prSave() {
  const n = ($('#prn').value || '').trim(), v = ($('#prv').value || '').trim(), dt = $('#prd').value, note = ($('#prno').value || '').trim(), u = S.prUnit, err = $('#prerr');
  if (!n) { err.textContent = 'Give the record a name'; return; }
  if (u === 'time' ? !/^\d{1,2}:\d{2}(:\d{2})?$/.test(v) : !/^\d+(\.\d+)?$/.test(v)) { err.textContent = u === 'time' ? 'Write the time like 32:10 or 1:55:00' : 'Write a number'; return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || dt > todayStr()) { err.textContent = 'Pick a date up to today'; return; }
  const before = prRows().find((r) => r.name.toLowerCase() === n.toLowerCase()), nm = before ? before.name : n;
  if (before && before.unit !== u) { err.textContent = nm + ' is measured in ' + before.unit + '. Pick that unit.'; return; }
  closeSheets();
  send({ action: 'log', table: 'PRs', row: { date: dt, name: nm, value: v, unit: u, note } });
  const after = prRows().find((r) => r.name === nm);
  if (before && after && after.best.date === dt && after.best.value === v) { LS.setItem('conf-' + dt + '-' + nm, '1'); confetti(); toast('New record! ' + nm + ' ' + prShow(v, u), 3500); }
  else toast(before ? 'Saved. Your best is still ' + prShow(before.best.value, before.unit) : 'First record saved', 3000);
}
function prSheet(n) {
  const L = (D().prs || []).filter((r) => r.name === n).sort((a, b) => (a.date < b.date ? 1 : -1)); if (!L.length) return;
  infoSheet(n, prChart(n) + '<div class="card list flat">' + L.map((r) => '<div class="li"><span class="li-main"><b>' + prShow(r.value, r.unit) + '</b><span class="mut small">' + esc(niceDate(r.date)) + (r.note ? ' · ' + esc(r.note) : '') + '</span></span><button class="icon-btn x" data-act="prdel" data-n="' + esc(r.name) + '" data-d="' + esc(r.date) + '" aria-label="Delete result from ' + esc(r.date) + '">✕</button></div>').join('') + '</div><button class="p" style="width:100%;margin-top:20px" data-act="prlogn" data-n="' + esc(n) + '" data-u="' + esc(L[0].unit) + '">Log a new result</button>', 'pr');
}
function confetti() {
  try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) { /* ignore */ }
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const C = ['#22d3ee', '#34d399', '#a3e635', '#f59e0b', '#a597ff', '#ff453a'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%'; p.style.background = C[i % C.length];
    p.style.animationDelay = Math.random() * 0.5 + 's'; p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    p.style.setProperty('--x', (Math.random() * 160 - 80) + 'px'); p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
}

/* ---------- Train: program card ---------- */
const DRAFT = ['analysing', 'review', 'building', 'ready', 'failed'];
function progDraft() { return (D().programs || []).filter((p) => DRAFT.indexOf(p.status) >= 0).slice(-1)[0] || null; }
function programCard() {
  const c = D().cfg, N = planWeeks(), t = todayStr(), w = weekNo(t), dr = progDraft();
  const started = c.program_start && c.program_start <= t, over = started && daysBetween(c.program_start, t) >= N * 7, pct = over ? 100 : started ? Math.min(100, ((daysBetween(c.program_start, t) % (N * 7)) + 1) / (N * 7) * 100) : 0;
  let h = '<section class="card prog"><span class="eyebrow3">Your program</span><h3>' + esc(D().plan.length ? c.program_name || 'Current plan' : 'No program yet') + '</h3><p class="mut small">' + (!D().plan.length ? 'Tell Apex your goals and days, and it builds your weeks.' : over ? 'Finished ' + esc(niceDate(dateAdd(c.program_start, N * 7 - 1))) + '. Repeating week ' + w + ' until you create the next one.' : started ? 'Week ' + w + ' of ' + N : c.program_start ? 'Starts ' + esc(niceDate(c.program_start)) : N + ' weeks') + '</p>' +
    (!D().plan.length ? '' : '<div class="bar" role="img" aria-label="' + Math.round(pct) + ' percent through the program"><i style="width:' + pct + '%"></i></div>');
  if (dr) {
    const msg = { analysing: ['Reading your documents…', 'busy'], building: ['Building your program…', 'busy'], review: ['Recommendations are ready for you', 'act'], ready: ['Your new program is ready to check', 'act'], failed: ['Program could not be built', 'bad'] }[dr.status];
    h += '<button class="draft ' + msg[1] + '" data-act="progopen" data-id="' + esc(dr.id) + '"><span class="dr-dot"></span><span class="dr-t"><b>' + esc(dr.name) + '</b><span>' + esc(msg[0]) + '</span></span><span class="chev">›</span></button>';
  }
  return h + '<button class="p" style="width:100%;margin-top:16px" data-act="wizopen">' + ICON(I.plus, 'ib') + ' Create new program</button></section>';
}

/* ---------- new program wizard ---------- */
function guessFocus(s) {
  s = String(s || '').toLowerCase();
  if (!s || /rest|off/.test(s)) return 'Rest';
  if (/long run/.test(s)) return 'Long run'; if (/interval|tempo|track/.test(s)) return 'Intervals / tempo'; if (/run|jog/.test(s)) return 'Easy run';
  if (/leg|squat|lower/.test(s)) return 'Legs'; if (/push/.test(s)) return 'Calisthenics Push'; if (/pull/.test(s)) return 'Calisthenics Pull';
  if (/calisth|upper|gymnast/.test(s)) return 'Calisthenics'; if (/kettle|kb/.test(s)) return 'Kettlebell';
  if (/engine|condition|metcon|hiit|hyrox/.test(s)) return 'Conditioning'; if (/mobil|recovery|flow|yoga|stretch/.test(s)) return 'Mobility';
  return 'Let Apex decide';
}
// next plan-week start (Saturday for the current plan; Sunday when no program is set)
function nextSunday() { const t = todayStr(); return dateAdd(weekStart(t), 7); }
function newWiz() {
  const d = D(), days = {}, race = nextRace();
  DAYS.forEach((x) => { const p = d.plan.find((r) => String(r.week) === '1' && r.day === x); days[x] = guessFocus(p && p.session); });
  const goals = race && /half/i.test(race.name) ? ['Half marathon'] : [];
  return { step: 1, docs: {}, prefs: { name: '', goals, days, time: (d.plan[0] && d.plan[0].time) || '08:00', start: nextSunday(), weeks: 4, notes: '', use: { whoop: true, strava: true, reels: true, sports: true } } };
}
function wizSave() { LS.setItem('wiz', JSON.stringify(S.wiz)); }
function wizOpen(fresh) {
  if (fresh || !S.wiz) S.wiz = jget('wiz', null) || newWiz();
  infoSheet('New program', wizBody(), 'wiz');
}
function wizRefresh() { wizSave(); refreshSheet('wiz', wizBody()); const sh = document.querySelector('.modal.info[data-id="wiz"] .sheet'); if (sh) sh.scrollTop = 0; }
function stepper(n) {
  return '<ol class="steps" aria-label="Step ' + n + ' of 3">' + ['Documents', 'Your week', 'Generate'].map((t, i) => '<li class="' + (i + 1 < n ? 'done' : i + 1 === n ? 'on' : '') + '"' + (i + 1 === n ? ' aria-current="step"' : '') + '><i>' + (i + 1 < n ? '✓' : i + 1) + '</i>' + t + '</li>').join('') + '</ol>';
}
function wizBody() {
  const W = S.wiz, d = D(), P = W.prefs;
  let h = stepper(W.step);
  if (W.step === 1) {
    const docs = d.docs.slice().reverse();
    const ul = W.upLabel || 'Calisthenics';
    h += '<p class="mut small">Pick the documents to build from and tell me what each one is. I read every page.</p>' +
      '<p class="lbl">Next upload is for</p><div class="chiprow uplbl" role="group" aria-label="What the next upload is for">' + DOC_LABELS.map((l) => '<button class="chip' + (l === ul ? ' on' : '') + '" aria-pressed="' + (l === ul) + '" data-act="wuplbl" data-l="' + l + '">' + l + '</button>').join('') + '</div>' +
      '<label class="upbtn" for="wizfile">' + ICON(I.plus) + (S.uploading ? 'Uploading ' + esc(S.uploading) + '…' : 'Upload ' + esc(ul) + ' document') + '</label><input type="file" id="wizfile" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.md,image/*" multiple hidden>' +
      '<p class="mut small" style="margin-top:8px">Pick the type, upload, then pick the next type and upload again. Best as PDF; save Word and Excel as PDF first.</p>';
    if (!docs.length) h += '<p class="empty-note">No documents yet. You can also skip this and just describe what you want in step 2.</p>';
    h += docs.map((x, i) => {
      const s = W.docs[x.url] || { on: false, label: x.label || 'Other', note: '' };
      return '<div class="wdoc' + (s.on ? ' on' : '') + '"><button class="wdoc-h" data-act="wdoc" data-u="' + esc(x.url) + '" aria-pressed="' + !!s.on + '"><span class="chk" aria-hidden="true">' + (s.on ? '✓' : '') + '</span><span class="li-main"><b>' + esc(x.name) + '</b><span class="mut small">' + (s.on ? esc(s.label) + ' · ' : '') + esc(ago(x.date)) + ' · ' + fmtSize(x.size) + '</span></span></button><button class="icon-btn x wdoc-x" data-act="docdel" data-u="' + esc(x.url) + '" data-n="' + esc(x.name) + '" aria-label="Delete ' + esc(x.name) + '">✕</button>' +
        (s.on ? '<div class="wdoc-b"><label class="mut small" for="wl' + i + '">This document is for</label><select id="wl' + i + '" data-wl="' + esc(x.url) + '">' + DOC_LABELS.map((l) => '<option' + (l === s.label ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
          '<label class="mut small" for="wn' + i + '">Anything I should know about it? (optional)</label><input id="wn' + i + '" data-wn="' + esc(x.url) + '" maxlength="200" value="' + esc(s.note) + '" placeholder="e.g. I like the skill work, drop the finisher"></div>' : '') + '</div>';
    }).join('');
    const n = Object.values(W.docs).filter((s) => s.on).length;
    h += '<div class="row wiz-nav"><button class="p" data-act="wnext">' + (n ? 'Next · ' + n + ' document' + (n > 1 ? 's' : '') : 'Next without documents') + '</button></div>';
  } else if (W.step === 2) {
    const race = nextRace();
    h += '<label class="mut small" for="wf-name">Program name</label><input id="wf-name" data-wf="name" maxlength="60" value="' + esc(P.name) + '" placeholder="' + esc(race ? race.name + ' block' : 'e.g. Winter strength block') + '">' +
      '<p class="lbl">Goals</p><div class="chiprow">' + GOALS.map((g) => '<button class="chip' + (P.goals.indexOf(g) >= 0 ? ' on' : '') + '" aria-pressed="' + (P.goals.indexOf(g) >= 0) + '" data-act="wgoal" data-g="' + esc(g) + '">' + esc(g) + '</button>').join('') + '</div>' +
      (race ? '<p class="wrace">' + ICON(I.flag) + '<span><b>' + esc(race.name) + '</b> in ' + daysBetween(todayStr(), race.date) + ' days' + (race.goal ? ', goal ' + esc(race.goal) : '') + '. I plan around it.</span></p>' : '<p class="mut small" style="margin-top:12px">Training for a race? Add it in More › Events and I plan around it.</p>') +
      '<p class="lbl">What do you want on each day?</p><div class="wdays">' + DAYS.map((x) => '<label class="wday" for="wd-' + x + '"><span>' + DOW_L[DAYS.indexOf(x)] + '</span><select id="wd-' + x + '" data-wday="' + x + '">' + FOCI.map((f) => '<option' + (f === P.days[x] ? ' selected' : '') + '>' + esc(f) + '</option>').join('') + (FOCI.indexOf(P.days[x]) < 0 ? '<option selected>' + esc(P.days[x]) + '</option>' : '') + '</select></label>').join('') + '</div>' +
      '<div class="row two"><div><label class="mut small" for="wf-start">Start</label><input type="date" id="wf-start" data-wf="start" value="' + esc(P.start) + '"></div><div><label class="mut small" for="wf-time">Usual time</label><input type="time" id="wf-time" data-wf="time" value="' + esc(P.time) + '"></div></div>' +
      '<p class="lbl">Length</p><div class="segc" role="group" aria-label="Program length">' + [4, 6, 8].map((n) => '<button class="' + (P.weeks === n ? 'on' : '') + '" aria-pressed="' + (P.weeks === n) + '" data-act="wweeks" data-n="' + n + '">' + n + ' weeks</button>').join('') + '</div>' +
      '<label class="mut small" for="wf-notes">Tell me what is in your mind</label><textarea id="wf-notes" data-wf="notes" maxlength="2000" rows="5" placeholder="e.g. Legs on Monday, calisthenics Tuesday and Thursday, long run Friday morning. I train for the half marathon, so keep legs away from the long run. Climbing with friends on Wednesday evening.">' + esc(P.notes) + '</textarea>' +
      '<p class="err" id="wizerr" role="alert"></p><div class="row wiz-nav"><button data-act="wback">Back</button><button class="p" data-act="wnext">Next</button></div>';
  } else {
    const docs = d.docs.filter((x) => (W.docs[x.url] || {}).on), U = P.use;
    const tog = (k, t, s) => '<button class="li tog" data-act="wuse" data-k="' + k + '" role="switch" aria-checked="' + !!U[k] + '"><span class="li-main"><b>' + t + '</b><span class="mut small">' + s + '</span></span><span class="sw' + (U[k] ? ' on' : '') + '" aria-hidden="true"><i></i></span></button>';
    h += '<div class="card list flat wsum">' +
      row({ ic: CI.doc, bg: '#ef4444', t: docs.length ? docs.length + ' document' + (docs.length > 1 ? 's' : '') : 'No documents', s: esc(docs.map((x) => (W.docs[x.url].label) + ': ' + x.name).join(' · ') || 'Built from your notes only') }) +
      row({ ic: CI.cal, bg: '#6d5ce8', t: esc(P.name || 'New program') + ' · ' + P.weeks + ' weeks', s: 'Starts ' + esc(niceDate(P.start)) + ' · ' + esc(P.goals.join(', ') || 'no goal picked') }) + '</div>' +
      '<p class="lbl">Also use</p><div class="card list flat">' + tog('whoop', 'WHOOP', 'Recovery, HRV and sleep, last 14 days') + tog('strava', 'Strava', 'Your recent runs and paces') + tog('reels', 'Your reels', 'Exercises from your ' + (RL.list ? RL.list.length + ' ' : '') + 'saved reels + links you add, picked for your days') + tog('sports', 'Sports I\'m into', 'e.g. climbing days') + '</div>' +
      '<div class="cost">' + ICON(CI.spark) + '<p class="small">I read your documents, then show you my recommendations to accept or reject before I write the weeks. It takes 2 to 5 minutes and you can close the app meanwhile. Each program costs about $0.30 to $0.60 on your Claude API account.</p></div>' +
      (d.ai ? '' : '<p class="err">Add your Claude API key first (SETUP.md, part 9).</p>') +
      '<div class="row wiz-nav"><button data-act="wback">Back</button><button class="p" data-act="wgen"' + (d.ai && !S.genBusy ? '' : ' disabled') + '>' + (S.genBusy ? 'Starting…' : ICON(CI.spark, 'ib') + ' Generate') + '</button></div>';
  }
  return h;
}
function wizField(el) {
  const W = S.wiz; if (!W) return;
  if (el.dataset.wf) W.prefs[el.dataset.wf] = el.value;
  else if (el.dataset.wday) W.prefs.days[el.dataset.wday] = el.value;
  else if (el.dataset.wl) (W.docs[el.dataset.wl] = W.docs[el.dataset.wl] || { on: true, note: '' }).label = el.value;
  else if (el.dataset.wn) (W.docs[el.dataset.wn] = W.docs[el.dataset.wn] || { on: true, label: 'Other' }).note = el.value;
  else return;
  wizSave();
}
document.addEventListener('input', (ev) => { if (ev.target.closest && ev.target.closest('.modal.info[data-id="wiz"]')) wizField(ev.target); });
document.addEventListener('change', (ev) => {
  if (ev.target.closest && ev.target.closest('.modal.info[data-id="wiz"]')) wizField(ev.target);
  if (ev.target.id === 'wizfile' && ev.target.files.length) uploadFiles([...ev.target.files], (S.wiz && S.wiz.upLabel) || 'Calisthenics');
});
async function wizGen() {
  const W = S.wiz, P = W.prefs, d = D();
  const docs = d.docs.filter((x) => (W.docs[x.url] || {}).on).map((x) => ({ name: x.name, label: W.docs[x.url].label || 'Other', note: W.docs[x.url].note || '', file_id: x.file_id || (String(x.url).match(/[-\w]{25,}/) || [''])[0] }));
  S.genBusy = true; wizRefresh();
  try {
    const reels = P.use && P.use.reels === false ? [] : pickReels(P, await reelsLoad());
    const j = await call({ action: 'plan_start', prefs: Object.assign({}, P, { name: P.name || (nextRace() ? nextRace().name + ' block' : 'New program') }), docs, reels });
    d.programs.push({ id: j.id, status: 'analysing', name: P.name || 'New program', step: 'Reading your documents' }); save();
    S.wiz = null; LS.removeItem('wiz'); S.genBusy = false;
    progOpen(j.id); render();
  } catch (e) { S.genBusy = false; wizRefresh(); toast(e.message === 'offline' ? 'You are offline. Try again when connected.' : e.message, 4500); }
}

/* ---------- program: progress, review, preview, activate ---------- */
function progOpen(id) {
  S.progId = id; S.dec = S.dec && S.dec._id === id ? S.dec : { _id: id }; S.progWeek = 1;
  const cached = S.prog && S.prog.program && S.prog.program.id === id ? S.prog : { program: (D().programs.find((p) => p.id === id) || { id, status: 'analysing', step: 'Loading…' }) };
  S.prog = cached;
  infoSheet('New program', progBody(), 'prog');
  progPoll(true);
}
async function progPoll(now) {
  clearTimeout(S.progT);
  if (!document.querySelector('.modal.info[data-id="prog"]')) return;
  if (!now && S.prog && ['analysing', 'building'].indexOf(S.prog.program.status) < 0) return;
  try {
    const j = await call({ action: 'plan_status', id: S.progId });
    const changed = !S.prog || !S.prog.analysis || S.prog.program.status !== j.program.status || S.prog.program.step !== j.program.step;
    S.prog = j;
    const i = D().programs.findIndex((p) => p.id === j.program.id); if (i >= 0) D().programs[i] = j.program; save();
    if (changed) { refreshSheet('prog', progBody()); render(); }
  } catch (e) { /* offline: keep showing what we have */ }
  if (S.prog && ['analysing', 'building'].indexOf(S.prog.program.status) >= 0) S.progT = setTimeout(() => progPoll(), 4000);
}
function skelWithDecisions() {
  const a = S.prog.analysis, sk = a.skeleton.map((x) => Object.assign({}, x));
  a.recommendations.forEach((r) => {
    if (S.dec[r.id] !== 'accept' || !r.patch) return;
    sk.forEach((s) => { const p = r.patch[s.day]; if (p) { if (p.focus) s.focus = p.focus; if (p.load) s.load = p.load; s.changed = true; } });
  });
  return sk;
}
function recCard(r) {
  const dv = S.dec[r.id];
  return '<div class="rec' + (dv ? ' ' + dv : '') + '"><b>' + esc(r.title) + '</b><p class="mut small">' + esc(r.reason) + '</p>' +
    (r.before || r.after ? '<div class="ba"><div><span>Now</span>' + esc(r.before || '—') + '</div><span class="ba-ar" aria-hidden="true">→</span><div class="after"><span>Suggested</span>' + esc(r.after || '—') + '</div></div>' : '') +
    '<div class="row"><button class="g' + (dv === 'accept' ? ' sel' : '') + '" aria-pressed="' + (dv === 'accept') + '" data-act="recdec" data-id="' + r.id + '" data-v="accept">' + (dv === 'accept' ? '✓ Accepted' : 'Accept') + '</button><button class="r' + (dv === 'reject' ? ' sel' : '') + '" aria-pressed="' + (dv === 'reject') + '" data-act="recdec" data-id="' + r.id + '" data-v="reject">' + (dv === 'reject' ? '✕ Rejected' : 'Reject') + '</button></div></div>';
}
function progBody() {
  const P = S.prog, pr = P.program, st = pr.status, a = P.analysis;
  if (st === 'analysing' || st === 'building') {
    const N = (P.prefs && P.prefs.weeks) || 4, m = String(pr.step || '').match(/week (\d+)/i), wk = m ? Number(m[1]) : 0;
    const pct = st === 'analysing' ? 18 : 45 + Math.round(((wk - 1) / N) * 50);
    const steps = [['Reading your documents', st === 'analysing' ? 'on' : 'done'], ['Your recommendations', st === 'analysing' ? '' : 'done'], ['Writing the weeks', st === 'building' ? 'on' : ''], ['Ready to check', '']];
    return '<div class="gen"><div class="gen-orb" aria-hidden="true">' + ICON(CI.spark) + '</div><h3>' + esc(pr.step || 'Working…') + '</h3><div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
      '<ol class="gen-steps">' + steps.map((s) => '<li class="' + s[1] + '"><i>' + (s[1] === 'done' ? '✓' : '') + '</i>' + s[0] + '</li>').join('') + '</ol>' +
      '<p class="mut small center">You can close this. I keep working and show a banner on Train when it is your turn.</p></div>';
  }
  if (st === 'failed') return '<div class="gen"><h3>Something went wrong</h3><p class="mut">' + esc(pr.error || 'Unknown error') + '</p></div><div class="row"><button class="p" data-act="progretry">Edit and try again</button><button class="r" data-act="progdisc">Discard</button></div>';
  if (st === 'active') return '<div class="gen"><h3>This program is active</h3><p class="mut">Find it on Train and Today.</p></div>';
  if (!a) return '<p class="mut">Loading…</p>';
  if (st === 'review') {
    const recs = a.recommendations, by = (t) => recs.filter((r) => r.type === t), sk = skelWithDecisions();
    const n = recs.filter((r) => S.dec[r.id]).length;
    let h = '<p class="psum">' + esc(a.summary) + '</p>' + (a.skipped && a.skipped.length ? '<p class="warnbox small">I could not read: ' + esc(a.skipped.join('; ')) + '</p>' : '');
    h += '<p class="lbl">Your week' + (sk.some((s) => s.changed) ? ' (with your accepted changes)' : '') + '</p><div class="skel-wk">' + sk.map((s) => '<div class="sk' + (s.changed ? ' ch' : '') + '"><span class="sk-d">' + s.day + '</span><span class="sk-f">' + esc(s.focus) + (s.changed ? '<span class="sk-ch">changed</span>' : '') + '</span><span class="tag ' + LOADC(s.load) + '">' + esc(s.load) + '</span></div>').join('') + '</div>';
    if (recs.length) {
      h += '<div class="row sp rec-all"><p class="lbl" style="margin:0">My recommendations · ' + n + ' of ' + recs.length + ' decided</p></div><div class="row"><button class="sm" data-act="recall" data-v="accept">Accept all</button><button class="sm" data-act="recall" data-v="reject">Reject all</button></div>';
      if (by('schedule').length) h += '<p class="grp">Training days</p>' + by('schedule').map(recCard).join('');
      if (by('document').length) h += '<p class="grp">Your documents</p>' + by('document').map(recCard).join('');
      h += '<p class="mut small" style="margin-top:16px">Anything you do not decide stays as you wrote it.</p>';
    } else h += '<p class="mut">No changes to suggest. Your plan and documents fit your goals.</p>';
    return h + '<div class="row wiz-nav"><button class="r fit" data-act="progdisc">Discard</button><button class="p" data-act="progbuild"' + (S.buildBusy ? ' disabled' : '') + '>' + (S.buildBusy ? 'Starting…' : 'Build my program') + '</button></div>';
  }
  if (st === 'ready') {
    const W = P.weeks || [], wk = Math.min(S.progWeek || 1, W.length || 1), cur = W[wk - 1] || { days: [] }, acc = a.recommendations.filter((r) => P.decisions[r.id] === 'accept').length;
    let h = '<p class="psum">' + esc(P.prefs.name) + ' · ' + W.length + ' weeks from ' + esc(niceDate(P.prefs.start)) + '. ' + acc + ' of ' + a.recommendations.length + ' recommendations applied.</p>';
    h += '<div class="segc" role="tablist" aria-label="Week">' + W.map((w) => '<button role="tab" aria-selected="' + (w.week === wk) + '" class="' + (w.week === wk ? 'on' : '') + '" data-act="progweek" data-w="' + w.week + '">W' + w.week + '</button>').join('') + '</div>';
    h += cur.days.map((x) => '<details class="pday"><summary><span class="sk-d">' + esc(x.day) + '</span><span class="sk-f">' + esc(x.session) + '</span><span class="tag ' + LOADC(x.load) + '">' + esc(x.load) + '</span></summary>' + blocksHTML(x.details, 'pv-' + pr.id + '-' + wk + '-' + x.day) + '</details>').join('');
    return h + '<p class="mut small" style="margin-top:16px">Your current plan is saved to the PlanArchive tab when you start this one.</p><div class="row wiz-nav"><button class="r fit" data-act="progdisc">Discard</button><button class="p" data-act="progact"' + (S.actBusy ? ' disabled' : '') + '>' + (S.actBusy ? 'Switching…' : 'Start this program') + '</button></div>';
  }
  return '<p class="mut">Status: ' + esc(st) + '</p>';
}

/* ---------- actions (called from the main click handler in app.js) ---------- */
const COACH_KEEP = ['wuplbl', 'docdel', 'prpre', 'prunit', 'prsave', 'wdoc', 'wgoal', 'wweeks', 'wuse', 'wnext', 'wback', 'wgen', 'recdec', 'recall', 'progweek', 'progbuild', 'progact', 'progdisc', 'progretry', 'prdel'];
const COACH_ACTS = {
  coachnow: () => coachNow(),
  mvacc: (el) => { LS.setItem('missdis-' + el.dataset.f, '1'); moveAccept(el.dataset.f, el.dataset.t); },
  mvrej: (el) => { LS.setItem('missdis-' + el.dataset.f, '1'); render(); },
  mvundo: (el) => { const m = String(el.dataset.r || '').match(/\d{4}-\d{2}-\d{2}/); if (m) LS.removeItem('missdis-' + m[0]); send({ action: 'del', table: 'Overrides', row: { date: el.dataset.d } }); },
  prlog: () => prLog(),
  prlogn: (el) => prLog(el.dataset.n, el.dataset.u),
  prsheet: (el) => prSheet(el.dataset.n),
  prpre: (el) => { $('#prn').value = el.dataset.n; S.prUnit = el.dataset.u; const nm = el.dataset.n; refreshSheet('prlog', prLogBody(nm)); },
  prunit: (el) => { const keep = [$('#prn').value, $('#prd').value, $('#prno').value]; S.prUnit = el.dataset.u; refreshSheet('prlog', prLogBody(keep[0])); $('#prd').value = keep[1]; $('#prno').value = keep[2]; },
  prsave: () => prSave(),
  prdel: (el) => { if (!confirm('Delete this result?')) return; send({ action: 'del', table: 'PRs', row: { name: el.dataset.n, date: el.dataset.d } }); if ((D().prs || []).some((r) => r.name === el.dataset.n)) prSheet(el.dataset.n); else closeSheets(); },
  evgoal: async (el) => {
    const ev = D().events.find((e) => e.name === el.dataset.n && e.date === el.dataset.d); if (!ev) return;
    const v = await form('Goal time for ' + ev.name, [{ label: 'Goal time (h:mm:ss, e.g. 1:55:00)', value: ev.goal || '', check: (x) => (!x || /^\d{1,2}:\d{2}(:\d{2})?$/.test(x) ? '' : 'Use a time like 1:55:00') }]);
    if (!v) return;
    send({ action: 'log', table: 'Events', row: Object.assign({}, ev, { goal: v[0] }) }); toast(v[0] ? 'Goal set: ' + v[0] : 'Goal removed');
  },
  wizopen: () => { const dr = progDraft(); if (dr && ['review', 'ready'].indexOf(dr.status) >= 0 && !confirm('You already have a program waiting for you. Start another one?')) { progOpen(dr.id); return; } wizOpen(); },
  wuplbl: (el) => { S.wiz.upLabel = el.dataset.l; wizRefreshKeep(); },
  docdel: (el) => {
    if (!confirm('Delete ' + el.dataset.n + '? It is moved to the trash of your Google Drive.')) return;
    send({ action: 'doc_del', url: el.dataset.u });
    if (S.wiz) { delete S.wiz.docs[el.dataset.u]; wizSave(); keepScroll('wiz', wizBody()); }
    refreshSheet('docs', docsBody()); toast('Deleted');
  },
  wdoc: (el) => { const u = el.dataset.u, x = D().docs.find((y) => y.url === u), s = S.wiz.docs[u] || { on: false, label: (x && x.label) || 'Other', note: '' }; s.on = !s.on; S.wiz.docs[u] = s; wizRefreshKeep(); },
  wgoal: (el) => { const g = el.dataset.g, G = S.wiz.prefs.goals, i = G.indexOf(g); if (i >= 0) G.splice(i, 1); else G.push(g); wizRefreshKeep(); },
  wweeks: (el) => { S.wiz.prefs.weeks = Number(el.dataset.n); wizRefreshKeep(); },
  wuse: (el) => { const U = S.wiz.prefs.use; U[el.dataset.k] = !U[el.dataset.k]; wizRefreshKeep(); },
  wback: () => { S.wiz.step = Math.max(1, S.wiz.step - 1); wizRefresh(); },
  wnext: () => {
    const W = S.wiz, P = W.prefs;
    if (W.step === 2) {
      const err = $('#wizerr');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(P.start)) { err.textContent = 'Pick a start date'; return; }
      if (P.start < todayStr()) { err.textContent = 'The start date has passed. Pick today or later.'; return; }
      if (!Object.values(W.docs).some((s) => s.on) && !String(P.notes).trim()) { err.textContent = 'Without documents, tell me what you want in the box above.'; return; }
    }
    W.step = Math.min(3, W.step + 1); wizRefresh();
  },
  wgen: () => wizGen(),
  progopen: (el) => progOpen(el.dataset.id),
  progweek: (el) => { S.progWeek = Number(el.dataset.w); refreshSheet('prog', progBody()); },
  recdec: (el) => { S.dec[el.dataset.id] = S.dec[el.dataset.id] === el.dataset.v ? undefined : el.dataset.v; progRefreshKeep(); },
  recall: (el) => { S.prog.analysis.recommendations.forEach((r) => { S.dec[r.id] = el.dataset.v; }); progRefreshKeep(); },
  progbuild: async () => {
    const decisions = {}; S.prog.analysis.recommendations.forEach((r) => { decisions[r.id] = S.dec[r.id] === 'accept' ? 'accept' : 'reject'; });
    S.buildBusy = true; refreshSheet('prog', progBody());
    try { await call({ action: 'plan_decide', id: S.progId, decisions }); S.prog.program.status = 'building'; S.prog.program.step = 'Building week 1 of ' + S.prog.prefs.weeks; S.prog.decisions = decisions; }
    catch (e) { toast(e.message === 'offline' ? 'You are offline. Try again when connected.' : e.message, 4500); }
    S.buildBusy = false; refreshSheet('prog', progBody()); render(); progPoll();
  },
  progact: async () => {
    const P = S.prog.prefs;
    if (!confirm('Start "' + P.name + '" on ' + niceDate(P.start) + '? It replaces your current plan, which is saved in the PlanArchive tab of your sheet.')) return;
    S.actBusy = true; refreshSheet('prog', progBody());
    try { await call({ action: 'plan_activate', id: S.progId }); S.actBusy = false; closeSheets(); confetti(); toast('New program set. Week 1 starts ' + niceDate(P.start), 4000); await load(); }
    catch (e) { S.actBusy = false; refreshSheet('prog', progBody()); toast(e.message === 'offline' ? 'You are offline. Try again when connected.' : e.message, 4500); }
  },
  progdisc: async () => {
    if (!confirm('Discard this program? Your current plan stays as it is.')) return;
    try { await call({ action: 'plan_discard', id: S.progId }); D().programs = D().programs.filter((p) => p.id !== S.progId); save(); closeSheets(); render(); toast('Discarded'); }
    catch (e) { toast(e.message === 'offline' ? 'You are offline. Try again when connected.' : e.message, 4500); }
  },
  progretry: async () => {
    const P = S.prog.prefs || newWiz().prefs, W = newWiz();
    W.prefs = Object.assign(W.prefs, P, { start: P.start >= todayStr() ? P.start : nextSunday() }); W.step = 2;
    try { await call({ action: 'plan_discard', id: S.progId }); } catch (e) { /* ignore */ }
    D().programs = D().programs.filter((p) => p.id !== S.progId); save();
    S.wiz = W; wizSave(); wizOpen(); render();
  }
};
function keepScroll(id, body) {
  const sh = document.querySelector('.modal.info[data-id="' + id + '"] .sheet'), y = sh ? sh.scrollTop : 0;
  refreshSheet(id, body); if (sh) sh.scrollTop = y;
}
function wizRefreshKeep() { wizSave(); keepScroll('wiz', wizBody()); }
function progRefreshKeep() { keepScroll('prog', progBody()); }

/* ---------- food log: type what you ate, Claude estimates the calories ---------- */
function foodOpen(mode, slot, time) {
  const m = mode === 'swap' && D().plan ? mealsFor((dayPlan(todayStr()) || {}).daytype).find((x) => x.slot === slot) : null;
  S.food = { mode, slot, time: time || nowTime(), rows: [{ name: '', qty: '' }], est: null, busy: false, err: '', planned: m ? m.name : '' };
  infoSheet(mode === 'swap' ? 'What did you eat instead?' : 'Extra meal or snack', foodBody(), 'food');
}
function foodBody() {
  const F = S.food, ai = D().ai;
  let h = F.planned ? '<p class="mut small">Instead of ' + esc(F.planned) + '.</p>' : '';
  if (!F.est) {
    h += '<p class="mut small">Write each food and roughly how much. ' + (ai ? 'I work out the average calories for you.' : 'Add your Claude API key to get calories worked out for you; for now type them in.') + '</p>' +
      (ai ? '<label class="upbtn alt" for="foodcam">' + ICON(LI.cam) + (F.busy ? 'Looking at your photo…' : 'Take a photo of your food') + '</label><input type="file" id="foodcam" accept="image/*" capture="environment" hidden><p class="or"><span>or type it</span></p>' : '');
    h += F.rows.map((r, i) => '<div class="frow"><div class="frow-h"><b>Food ' + (i + 1) + '</b>' + (F.rows.length > 1 ? '<button class="txt fit" data-act="fdel" data-i="' + i + '" aria-label="Remove food ' + (i + 1) + '">Remove</button>' : '') + '</div>' +
      '<input data-fn="' + i + '" maxlength="80" value="' + esc(r.name) + '" placeholder="e.g. Koshary, chicken shawarma, banana" aria-label="Food ' + (i + 1) + '">' +
      '<input data-fq="' + i + '" maxlength="40" value="' + esc(r.qty) + '" placeholder="Amount, e.g. 1 plate, 200 g, 2 pieces" aria-label="Amount of food ' + (i + 1) + '">' +
      (ai ? '' : '<input data-fk="' + i + '" type="number" inputmode="numeric" min="0" max="3000" value="' + esc(r.kcal || '') + '" placeholder="Calories (kcal)" aria-label="Calories of food ' + (i + 1) + '">') + '</div>').join('');
    h += '<button class="sm fadd" data-act="fadd"' + (F.rows.length >= 12 ? ' disabled' : '') + '>' + ICON(I.plus, 'ib') + ' Add another food</button>';
    if (F.mode === 'extra') h += '<label class="mut small" for="ftime">Time</label><input type="time" id="ftime" data-ft="1" value="' + esc(F.time) + '">';
    h += '<p class="err" role="alert">' + esc(F.err) + '</p>';
    h += ai ? '<button class="p" style="width:100%" data-act="fcalc"' + (F.busy ? ' disabled' : '') + '>' + (F.busy ? 'Working out calories…' : ICON(CI.spark, 'ib') + ' Calculate calories') + '</button>' : '<button class="p" style="width:100%" data-act="fsave">Save</button>';
    return h;
  }
  const E = F.est;
  h += '<div class="card list flat fest">' + E.items.map((x, i) => '<div class="li"><span class="li-main"><b>' + esc(x.name) + '</b><span class="mut small">' + esc(x.qty) + (x.protein ? ' · ' + x.protein + ' g protein' : '') + '</span></span><span class="li-end"><input class="kin" data-fk="' + i + '" type="number" inputmode="numeric" min="0" max="3000" value="' + x.kcal + '" aria-label="Calories for ' + esc(x.name) + '"><span class="mut small">kcal</span></span></div>').join('') +
    '<div class="li ftot"><span class="li-main"><b>Total</b>' + (E.protein ? '<span class="mut small">' + E.protein + ' g protein</span>' : '') + '</span><span class="li-end"><b id="ftotal">' + E.kcal + ' kcal</b></span></div></div>' +
    '<p class="mut small" style="margin-top:12px">Average estimates. Tap a number to correct it.</p><p class="err" role="alert">' + esc(F.err) + '</p>' +
    '<div class="row"><button data-act="fedit">Edit foods</button><button class="p" data-act="fsave">Save</button></div>';
  return h;
}
function foodInput(el) {
  const F = S.food; if (!F) return;
  if (el.dataset.fn !== undefined) F.rows[el.dataset.fn].name = el.value;
  else if (el.dataset.fq !== undefined) F.rows[el.dataset.fq].qty = el.value;
  else if (el.dataset.ft) F.time = el.value;
  else if (el.dataset.fk !== undefined) {
    const v = Math.max(0, Math.min(3000, Math.round(Number(el.value) || 0)));
    if (F.est) { F.est.items[el.dataset.fk].kcal = v; F.est.kcal = F.est.items.reduce((a, x) => a + x.kcal, 0); const t = $('#ftotal'); if (t) t.textContent = F.est.kcal + ' kcal'; }
    else F.rows[el.dataset.fk].kcal = v;
  }
}
document.addEventListener('input', (ev) => { if (ev.target.closest && ev.target.closest('.modal.info[data-id="food"]')) foodInput(ev.target); });
function foodRefresh() { keepScroll('food', foodBody()); }
async function foodCalc() {
  const F = S.food, rows = F.rows.filter((r) => r.name.trim());
  if (!rows.length) { F.err = 'Write at least one food'; foodRefresh(); return; }
  F.busy = true; F.err = ''; foodRefresh();
  try { const j = await call({ action: 'food_estimate', items: rows.map((r) => ({ name: r.name.trim(), qty: r.qty.trim() })) }); F.est = { items: j.items, kcal: j.kcal, protein: j.protein }; }
  catch (e) { F.err = e.message === 'offline' ? 'You are offline. Try again when connected.' : e.message; }
  F.busy = false; foodRefresh();
}
function foodSave() {
  const F = S.food, ds = todayStr();
  const items = F.est ? F.est.items : F.rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), qty: r.qty.trim(), kcal: Number(r.kcal) || 0 }));
  if (!items.length) { F.err = 'Write at least one food'; foodRefresh(); return; }
  if (F.mode === 'extra' && !/^\d{2}:\d{2}$/.test(F.time)) { F.err = 'Pick a time'; foodRefresh(); return; }
  const kcal = Math.min(5000, items.reduce((a, x) => a + (Number(x.kcal) || 0), 0));
  const note = items.map((x) => x.name + (x.qty ? ' (' + x.qty + ')' : '') + ' ' + (Number(x.kcal) || 0) + ' kcal').join('; ').slice(0, 400);
  const names = items.map((x) => x.name).join(' + ').slice(0, 120);
  const prot = String(Math.min(400, items.reduce((a, x) => a + (Number(x.protein) || 0), 0)));
  if (F.mode === 'swap') send({ action: 'log', table: 'MealLog', row: { date: ds, slot: F.slot, status: 'swap', time: F.time, note, extra_name: '', kcal: String(kcal), protein: prot } });
  else send({ action: 'log', table: 'MealLog', row: { date: ds, slot: 'extra-' + Date.now(), status: 'extra', time: F.time, note, extra_name: names, kcal: String(kcal), protein: prot } });
  S.food = null; closeSheets(); toast('Saved · ' + kcal + ' kcal');
}
COACH_KEEP.push('fadd', 'fdel', 'fcalc', 'fedit', 'fsave');
Object.assign(COACH_ACTS, {
  fadd: () => { S.food.rows.push({ name: '', qty: '' }); foodRefresh(); const ins = document.querySelectorAll('[data-fn]'); if (ins.length) ins[ins.length - 1].focus(); },
  fdel: (el) => { S.food.rows.splice(Number(el.dataset.i), 1); foodRefresh(); },
  fcalc: () => foodCalc(),
  fedit: () => { S.food.est = null; S.food.err = ''; foodRefresh(); },
  fsave: () => foodSave()
});


/* ===================== train.js ===================== */
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


/* ===================== life.js ===================== */
/* Apex life: food photo, protein, shopping list from your plan, body trend, sleep coach, supplements,
   reminders, streaks + monthly report, ask the coach, eating out, stress/mood and caffeine insights,
   progress photos, fitness test days and goals. Loaded after coach.js and train.js, before app.js. */
const LI = {
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M10 7.5 14 16.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  fork: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  flame: '<path d="M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4S9 11 11 11c0-4 1-8 1-8z"/>'
};

/* ---------- shared: shrink a photo before upload ---------- */
function shrinkImage(file, max, q) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', q || 0.8).split(',')[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not open that photo')); };
    img.src = url;
  });
}

/* ======================= 4. food photo ======================= */
async function foodPhoto(file) {
  const F = S.food; if (!F) return;
  F.busy = true; F.err = ''; foodRefresh();
  try {
    const img = await shrinkImage(file, 1024, 0.8);
    const rows = F.rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), qty: r.qty.trim() }));
    const j = await call({ action: 'food_estimate', items: rows, image: img });
    F.est = { items: j.items, kcal: j.kcal, protein: j.protein };
  } catch (e) { F.err = e.message === 'offline' ? 'You are offline. Try again when connected.' : e.message; }
  F.busy = false; foodRefresh();
}

/* ======================= 5. protein ======================= */
function proteinEaten(ms, ml) {
  return ml.reduce((a, r) => {
    if (r.status === 'skipped') return a;
    if (r.status === 'extra' || r.status === 'swap') return a + (Number(r.protein) || 0);
    const m = ms.find((x) => x.slot === r.slot); return a + (m ? Number(m.protein) || 0 : 0);
  }, 0);
}
function proteinTarget(tg) { return Number(D().cfg.protein_target) || Number(tg.protein) || 180; }

/* ======================= 6. shopping list from the plan ======================= */
function shopPlanHTML() {
  const L = D().shopweek || [];
  if (!L.length) return '<div class="card empty-s"><b>Your list for the next 7 days</b><p class="mut small" style="margin:4px 0 12px">I add up every ingredient from your planned meals and turn it into a shopping list by section.</p><button class="p" style="width:100%" data-act="shopbuild"' + (S.shopBusy || !D().ai ? ' disabled' : '') + '>' + (S.shopBusy ? 'Making your list…' : 'Make my list') + '</button>' + (D().ai ? '' : '<p class="mut small" style="margin-top:8px">Needs your Claude API key.</p>') + '</div>';
  const wk = L[0].week, got = L.filter((x) => LS.getItem('shopw-' + wk + x.item) === '1').length;
  let h = '<div class="card"><div class="row sp"><b>' + got + ' of ' + L.length + ' bought</b><span class="mut small">Made ' + esc(niceDate(wk)) + '</span></div><div class="bar"><i style="width:' + (got / L.length) * 100 + '%"></i></div>', g = '';
  L.forEach((x, i) => {
    const k = 'shopw-' + wk + x.item, chk = LS.getItem(k) === '1';
    if (x.section !== g) { g = x.section; h += '<div class="grp">' + esc(g) + '</div>'; }
    h += '<label class="shop" for="sw' + i + 'x"><input id="sw' + i + 'x" type="checkbox" class="chk" data-shop="' + esc(k) + '" ' + (chk ? 'checked' : '') + '><span class="' + (chk ? 'got' : '') + '">' + esc(x.item) + ' <em class="mut">' + esc(x.qty) + '</em></span></label>';
  });
  return h + '<button class="link-row" data-act="shopbuild"' + (S.shopBusy ? ' disabled' : '') + '>' + (S.shopBusy ? 'Making your list…' : 'Make a new list for the next 7 days') + '<span class="chev">›</span></button></div>';
}

/* ======================= 7. body trend ======================= */
function bodyTrend() {
  const B = D().logs.Body.filter((b) => Number(b.weight) > 0);
  if (B.length < 2) return '';
  const pts = B.slice(-60), avg = pts.map((b, i) => { const w = pts.filter((x) => x.date <= b.date && x.date > dateAdd(b.date, -7)).map((x) => Number(x.weight)); return w.reduce((a, c) => a + c, 0) / w.length; });
  const ws = pts.map((b) => Number(b.weight)), lo = Math.min(...ws) - 0.5, hi = Math.max(...ws) + 0.5, d0x = pts[0].date, span = Math.max(1, daysBetween(d0x, pts[pts.length - 1].date));
  const X = (ds) => 8 + (daysBetween(d0x, ds) / span) * 284, Y = (v) => 8 + (1 - (v - lo) / (hi - lo)) * 104;
  const line = avg.map((v, i) => (i ? 'L' : 'M') + X(pts[i].date).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  const now = avg[avg.length - 1], twoAgo = pts.findIndex((b) => b.date > dateAdd(pts[pts.length - 1].date, -14)), then = avg[Math.max(0, twoAgo)], dl = now - then;
  const wa = B.filter((b) => Number(b.waist) > 0), wd = wa.length > 1 ? Number(wa[wa.length - 1].waist) - Number(wa[0].waist) : null;
  return '<section class="card"><div class="row sp" style="align-items:baseline"><div><span class="eyebrow3">7-day average</span><b class="ld-n">' + now.toFixed(1) + '</b><span class="mut small"> kg</span></div><span class="' + (dl < 0 ? 'okt' : dl > 0 ? 'badt' : 'mut') + ' small"><b>' + (dl > 0 ? '+' : '') + dl.toFixed(1) + ' kg</b> in 2 weeks</span></div>' +
    '<svg class="trend" viewBox="0 0 300 120" role="img" aria-label="Weight trend: 7-day average ' + now.toFixed(1) + ' kg">' + pts.map((b) => '<circle cx="' + X(b.date).toFixed(1) + '" cy="' + Y(Number(b.weight)).toFixed(1) + '" r="2.6" class="tdot"/>').join('') + '<path d="' + line + '" class="tline"/></svg>' +
    '<p class="mut small">Dots are daily weigh-ins, the line is the 7-day average. Daily jumps are mostly water; watch the line.' + (wd !== null ? ' Waist: ' + (wd > 0 ? '+' : '') + wd.toFixed(1) + ' cm since ' + esc(niceDate(wa[0].date)) + '.' : '') + '</p></section>';
}

/* ======================= 8. sleep coach ======================= */
function bedtime(ds) {
  const next = dateAdd(ds, 1), p = sessionFor(next), dt = p ? p.p.daytype : (planFor(next) || {}).daytype;
  const wake = (D().meals.find((m) => m.slot === 'wake' && (!dt || m.daytype === dt)) || {}).time || '06:45';
  let need = (Number(D().cfg.sleep_need) || 8) * 60, why = [];
  if (p && p.p.load === 'Hard') { need += 30; why.push('hard session tomorrow (+30 min)'); }
  const w = whoopFor(ds); if (w && Number(w.sleep_perf) && Number(w.sleep_perf) < 85) { need += 20; why.push('short sleep last night (+20 min)'); }
  const toMin = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)), b = ((toMin(wake) - need - 15) % 1440 + 1440) % 1440;
  return { bed: String(Math.floor(b / 60)).padStart(2, '0') + ':' + String(b % 60).padStart(2, '0'), wake, need, why, tomorrow: p ? p.name : 'rest day' };
}
function sleepCard() {
  const h = local().hour; if (h < 17) return '';
  const B = bedtime(todayStr()), late = lateCaffeine(todayStr());
  return '<section class="card sleepc"><div class="ms-top"><span class="ms-ic sl">' + ICON(LI.moon) + '</span><div><span class="eyebrow3">Tonight</span><h3>Bed by ' + B.bed + '</h3><p class="mut small">To wake at ' + B.wake + ' with ' + (B.need / 60).toFixed(1).replace('.0', '') + ' h of sleep. Tomorrow: ' + esc(B.tomorrow) + '.' + (B.why.length ? ' Extra for ' + B.why.join(' and ') + '.' : '') + '</p>' +
    forecastLine() + (late ? '<p class="small warnline">☕ Coffee at ' + esc(late) + ' today can cut deep sleep. Keep the room cool and dark.</p>' : '<p class="small" style="margin:6px 0 0">Screens off 30 min before. Magnesium at 21:00.</p>') + '</div></div></section>';
}

/* ======================= 9. supplements ======================= */
function suppList(daytype) {
  const out = [];
  mealsFor(daytype).forEach((m) => String(m.supps || '').split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => out.push({ name: x, slot: m.slot, time: m.time })));
  mealsFor(daytype).filter((m) => /magnesium/i.test(m.name) && !m.supps).forEach((m) => out.push({ name: m.items.replace(/\s*\(.*\)/, ''), slot: m.slot, time: m.time }));
  return out;
}
function suppsTaken(ds) { return (D().supps || []).filter((x) => x.date === ds).map((x) => x.name); }
function suppCard(p) {
  const L = suppList(p.daytype); if (!L.length) return '';
  const got = suppsTaken(todayStr()), n = L.filter((x) => got.indexOf(x.name) >= 0).length;
  return '<h2>Supplements · ' + n + ' of ' + L.length + '</h2><div class="supp" role="group" aria-label="Supplements taken today">' + L.map((x) => { const on = got.indexOf(x.name) >= 0; return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="supp" data-n="' + esc(x.name) + '">' + (on ? '✓ ' : '') + esc(x.name) + '<small>' + esc(x.time) + '</small></button>'; }).join('') + '</div>';
}
function autoSupps(slot) {
  const p = dayPlan(todayStr()); if (!p) return; const got = suppsTaken(todayStr());
  suppList(p.daytype).filter((x) => x.slot === slot && got.indexOf(x.name) < 0).forEach((x) => send({ action: 'log', table: 'Supps', row: { date: todayStr(), name: x.name, time: nowTime() } }));
}

/* ======================= 10. reminders ======================= */
function remBody() {
  const c = D().cfg, on = (k) => c[k] !== 'off';
  const T = [['rem_meals', 'Meals', 'At each planned meal time, with supplements'], ['rem_workout', 'Workout', '30 min before your session'], ['rem_water', 'Water', '11:00, 14:00 and 17:00'], ['rem_bed', 'Bedtime', '30 min before your bedtime'], ['rem_recovery', 'Recovery is in', 'When WHOOP scores you in the morning']];
  return '<p class="mut small">Reminders go to a private Google Calendar called <b>Apex</b>, so your iPhone shows them as alerts. Turn on the Apex calendar once: install the Google Calendar app and allow notifications, or iPhone Settings › Calendar › Accounts › your Google account › Calendars.</p>' +
    '<div class="card list flat">' + T.map(([k, t, s]) => '<button class="li tog" data-act="remtog" data-k="' + k + '" role="switch" aria-checked="' + on(k) + '"><span class="li-main"><b>' + t + '</b><span class="mut small">' + s + '</span></span><span class="sw' + (on(k) ? ' on' : '') + '" aria-hidden="true"><i></i></span></button>').join('') + '</div>' +
    '<div class="row two"><div><label class="mut small" for="slneed">Sleep you need (hours)</label><input id="slneed" type="number" inputmode="decimal" step="0.25" min="5" max="11" value="' + esc(c.sleep_need || 8) + '"></div><div><label class="mut small" for="prtg">Protein a day (g)</label><input id="prtg" type="number" inputmode="numeric" min="50" max="400" value="' + esc(c.protein_target || '') + '" placeholder="from plan"></div></div>' +
    '<button class="p" style="width:100%;margin-top:20px" data-act="remsync"' + (S.remBusy ? ' disabled' : '') + '>' + (S.remBusy ? 'Setting reminders…' : 'Save and set reminders now') + '</button>' +
    '<p class="mut small center" style="margin-top:10px">' + (c.last_reminders ? 'Last set: ' + esc(c.last_reminders) : 'They refresh every morning with your sync.') + '</p>';
}

/* ======================= 11. streaks + monthly report ======================= */
function streakCard() {
  const st = D().stats || {}; if (st.error || st.train === undefined) return '';
  const mp = st.mealsPlanned ? Math.round((st.meals / st.mealsPlanned) * 100) : 0;
  return '<div class="tiles streaks">' + [[LI.flame, st.train, 'day' + (st.train === 1 ? '' : 's') + ' training streak'], [I.drop, st.water, 'day' + (st.water === 1 ? '' : 's') + ' water goal'], [LI.fork, mp + '%', 'meals on plan this month'], [I.train, st.sessions + '/' + st.sessionsPlanned, 'sessions this month']]
    .map(([ic, v, l]) => '<div class="tile stk"><span class="stk-ic">' + ICON(ic) + '</span><b>' + v + '</b><span class="tl-l">' + l + '</span></div>').join('') + '</div>';
}
function monthlyCard(home) {
  const f = latestFb(['monthly']); if (!f || (home && daysBetween(f.date, todayStr()) > 3)) return '';
  return (home ? '' : '<h2>Monthly report</h2>') + '<section class="card weekly">' + (home ? '<span class="eyebrow3">Your monthly report</span>' : '') + fbHTML(f) + '</section>';
}

/* ======================= 12. ask the coach ======================= */
function chatMsgs() { return jget('chat', []); }
function chatBody() {
  const M = chatMsgs();
  const ideas = ['Can I train hard today?', 'What should I eat before my long run?', 'Can I move legs to Thursday?', 'Why is my HRV low?'];
  return '<div class="chat" id="chatlog" aria-live="polite">' + (M.length ? M.map((m) => '<div class="msg ' + (m.role === 'user' ? 'me' : 'ai') + '">' + esc(m.content).replace(/\n/g, '<br>') + '</div>').join('') : '<p class="mut small center" style="margin:8px 0 12px">I know your plan, WHOOP, Strava, meals and goals. Ask anything.</p>') + (S.chatBusy ? '<div class="msg ai typing"><i></i><i></i><i></i></div>' : '') + '</div>' +
    (M.length ? '' : '<div class="chiprow">' + ideas.map((q) => '<button class="chip" data-act="chatq" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>') +
    '<div class="chatin"><textarea id="chatq" rows="2" maxlength="1000" placeholder="Ask your coach…" aria-label="Your question"></textarea><button class="p fit" data-act="chatsend"' + (S.chatBusy ? ' disabled' : '') + ' aria-label="Send">' + (S.chatBusy ? '…' : 'Send') + '</button></div>' +
    (M.length ? '<button class="txt" style="margin-top:8px" data-act="chatclear">Clear chat</button>' : '');
}
function chatScroll() { const s = document.querySelector('.modal.info[data-id="chat"] .sheet'); if (s) s.scrollTop = s.scrollHeight; }
async function chatSend(q) {
  q = String(q || '').trim(); if (!q || S.chatBusy) return;
  if (!D().ai) { toast('Add your Claude API key first'); return; }
  const M = chatMsgs(); M.push({ role: 'user', content: q }); LS.setItem('chat', JSON.stringify(M.slice(-30)));
  S.chatBusy = true; refreshSheet('chat', chatBody()); chatScroll();
  try { const j = await call({ action: 'coach_chat', messages: M.slice(-12) }); M.push({ role: 'assistant', content: j.reply }); }
  catch (e) { M.push({ role: 'assistant', content: e.message === 'offline' ? 'You are offline. Ask me again when you are connected.' : 'Sorry, that did not work: ' + e.message }); }
  LS.setItem('chat', JSON.stringify(M.slice(-30))); S.chatBusy = false; refreshSheet('chat', chatBody()); chatScroll();
}

/* ======================= 19 + 22. eating out ======================= */
function eoBody() {
  const E = S.eo || {};
  let h = '<p class="mut small">Tell me where you are eating. I pick the best choices for what is left of your day, and how to fit your other meals around it.</p>' +
    '<label class="mut small" for="eop">Restaurant or food</label><input id="eop" maxlength="100" value="' + esc(E.place || '') + '" placeholder="e.g. Zooba, Mo’men, sushi, a wedding buffet">' +
    '<div class="row two"><div><label class="mut small" for="eot">When</label><input type="time" id="eot" value="' + esc(E.time || '20:00') + '"></div><div><label class="mut small" for="eon">Note</label><input id="eon" maxlength="100" value="' + esc(E.note || '') + '" placeholder="optional"></div></div>' +
    '<p class="err" role="alert">' + esc(E.err || '') + '</p><button class="p" style="width:100%" data-act="eofind"' + (E.busy ? ' disabled' : '') + '>' + (E.busy ? 'Looking at the menu…' : 'Find my best choices') + '</button>';
  if (E.res) {
    const R0 = E.res;
    h += '<p class="lbl">Best choices · ' + R0.left + ' kcal left today</p>' + R0.options.map((o, i) => '<div class="rec"><b>' + esc(o.name) + '</b><p class="mut small">' + o.kcal + ' kcal · ' + o.protein + ' g protein · ' + esc(o.why) + '</p><button class="g" style="width:100%;margin-top:8px" data-act="eopick" data-i="' + i + '">I’ll have this</button></div>').join('') +
      (R0.adjust.length ? '<p class="lbl">Fit the rest of your day</p><ul class="rd-l">' + R0.adjust.map((a) => '<li><b>' + esc(a.meal) + ':</b> ' + esc(a.advice) + '</li>').join('') + '</ul>' : '') + (R0.tip ? '<p class="small" style="margin-top:8px">💡 ' + esc(R0.tip) + '</p>' : '');
  }
  return h;
}

/* ======================= 23 + 24. stress, mood, caffeine and what they do to recovery ======================= */
function checkinExtra(ck) {
  const row = (k, label, lo, hi) => '<div class="scale"><span>' + label + '</span><div role="group" aria-label="' + label + ' from 1 to 5">' + [1, 2, 3, 4, 5].map((n) => '<button class="' + (ck && Number(ck[k]) === n ? 'on' : '') + '" aria-pressed="' + !!(ck && Number(ck[k]) === n) + '" aria-label="' + label + ' ' + n + '" data-act="ckscale" data-k="' + k + '" data-v="' + n + '">' + n + '</button>').join('') + '</div><em>' + lo + ' · ' + hi + '</em></div>';
  const ds = todayStr(), caf = (D().habits || []).filter((x) => x.date === ds && x.kind === 'caffeine'), alc = (D().habits || []).filter((x) => x.date === ds && x.kind === 'alcohol');
  return '<div class="card ckx">' + row('stress', 'Stress', 'calm', 'very stressed') + row('mood', 'Mood', 'low', 'great') +
    '<div class="row habits"><button class="sm" data-act="habit" data-k="caffeine">☕ Coffee' + (caf.length ? ' · ' + caf.length + ' (last ' + esc(caf[caf.length - 1].time) + ')' : '') + '</button><button class="sm" data-act="habit" data-k="alcohol">🍷 Alcohol' + (alc.length ? ' · ' + alc.length : '') + '</button></div></div>';
}
function lateCaffeine(ds) { const c = (D().habits || []).filter((x) => x.date === ds && x.kind === 'caffeine' && x.time >= '16:00'); return c.length ? c[c.length - 1].time : ''; }
function lateMeal(ds) { return D().logs.MealLog.some((r) => r.date === ds && r.time >= '21:00' && r.status !== 'skipped' && r.slot !== 'mg'); }
function affectCard() {
  const W = D().whoop, nextW = (ds) => W.find((w) => w.date === dateAdd(ds, 1)), avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const rows = [];
  const cmp = (label, test, metric, unit, days) => {
    const yes = [], no = []; days.forEach((ds) => { const w = nextW(ds); if (!w || !Number(w[metric])) return; (test(ds) ? yes : no).push(Number(w[metric])); });
    if (yes.length >= 3 && no.length >= 3) { const a = avg(yes), b = avg(no), d = Math.round(a - b); rows.push('<div class="li"><span class="li-main"><b>' + label + '</b><span class="mut small">' + yes.length + ' vs ' + no.length + ' days</span></span><span class="li-end ' + (d < 0 ? 'badt' : d > 0 ? 'okt' : 'mut') + '"><b>' + (d === 0 ? 'no change' : (d > 0 ? '+' : '') + d + unit) + '</b></span></div>'); }
    else rows.push('<div class="li"><span class="li-main"><b>' + label + '</b><span class="mut small">Needs 3+ days of each (' + yes.length + ' / ' + no.length + ' so far)</span></span></div>');
  };
  const days = []; for (let i = 1; i <= 59; i++) days.push(dateAdd(todayStr(), -i));
  const ck = (ds) => D().logs.Checkin.find((c) => c.date === ds);
  cmp('High stress (4–5) → next-day recovery', (ds) => ck(ds) && Number(ck(ds).stress) >= 4, 'recovery', '%', days.filter((ds) => ck(ds) && ck(ds).stress));
  cmp('Coffee after 16:00 → sleep score', (ds) => !!lateCaffeine(ds), 'sleep_perf', '%', days.filter((ds) => (D().habits || []).some((h) => h.date === ds) || D().logs.Checkin.some((c) => c.date === ds)));
  cmp('Eating after 21:00 → sleep score', lateMeal, 'sleep_perf', '%', days.filter((ds) => D().logs.MealLog.some((r) => r.date === ds)));
  cmp('Alcohol → next-day HRV', (ds) => (D().habits || []).some((h) => h.date === ds && h.kind === 'alcohol'), 'hrv', ' ms', days.filter((ds) => (D().habits || []).some((h) => h.date === ds) || D().logs.Checkin.some((c) => c.date === ds)));
  return '<h2>Details</h2><div class="card list">' + rows.join('') + '</div><p class="foot">Log stress, mood and coffee on Today. The difference compares your WHOOP numbers on those days with your other days.</p>';
}

/* ======================= 26. progress photos ======================= */
function photoDates() { return [...new Set((D().photos || []).map((p) => p.date))].sort().reverse(); }
function photosSection() {
  const ds = photoDates();
  return '<h2>Progress photos</h2><div class="card">' + (ds.length ? '<p class="mut small" style="margin:0 0 12px">' + ds.length + ' date' + (ds.length > 1 ? 's' : '') + ' · private, saved in your Google Drive</p><div class="phd">' + ds.slice(0, 8).map((d) => '<button class="chip" data-act="phview" data-d="' + d + '">' + esc(niceDate(d).replace(/^\w+ /, '')) + '</button>').join('') + '</div>' : '<p class="mut small" style="margin:0 0 12px">Same light, same place, once a month. Only you can see them (private folder in your Google Drive).</p>') +
    '<div class="row"><button class="p" data-act="phadd">' + ICON(LI.cam, 'ib') + ' Add photos</button>' + (ds.length > 1 ? '<button data-act="phcompare">Compare</button>' : '') + '</div></div>';
}
function phAddBody() {
  const pose = S.phPose || 'front', have = (D().photos || []).filter((p) => p.date === todayStr()).map((p) => p.pose);
  return '<div class="segc" role="group" aria-label="Pose">' + ['front', 'side', 'back'].map((p) => '<button class="' + (p === pose ? 'on' : '') + '" aria-pressed="' + (p === pose) + '" data-act="phpose" data-p="' + p + '">' + p[0].toUpperCase() + p.slice(1) + (have.indexOf(p) >= 0 ? ' ✓' : '') + '</button>').join('') + '</div>' +
    '<p class="mut small">Stand 2 m from the camera, arms relaxed, same spot each month.</p><label class="upbtn" for="phfile">' + ICON(LI.cam) + (S.phBusy ? 'Saving…' : 'Take or choose ' + pose + ' photo') + '</label><input type="file" id="phfile" accept="image/*" capture="user" hidden>';
}
async function photoImg(fid) {
  S.phc = S.phc || {}; if (S.phc[fid]) return S.phc[fid];
  const j = await call({ action: 'photo_get', file_id: fid }); S.phc[fid] = 'data:image/jpeg;base64,' + j.data; return S.phc[fid];
}
async function phCompare(a, b) {
  const P = D().photos || [], poses = ['front', 'side', 'back'].filter((p) => P.some((x) => x.pose === p && (x.date === a || x.date === b)));
  const ds = photoDates();
  const sel = (id, v) => '<select id="' + id + '" data-phsel="1" aria-label="Date">' + ds.map((d) => '<option value="' + d + '"' + (d === v ? ' selected' : '') + '>' + esc(niceDate(d)) + '</option>').join('') + '</select>';
  const body = () => '<div class="row two">' + '<div>' + sel('pha', a) + '</div><div>' + sel('phb', b) + '</div></div>' + poses.map((p) => '<p class="lbl">' + p[0].toUpperCase() + p.slice(1) + '</p><div class="phpair">' + [a, b].map((d) => { const x = P.find((y) => y.date === d && y.pose === p); return '<div class="phbox">' + (x ? (S.phc && S.phc[x.file_id] ? '<img src="' + S.phc[x.file_id] + '" alt="' + p + ' ' + d + '">' : '<span class="mut small">Loading…</span>') + '<button class="icon-btn x phx" data-act="phdel" data-d="' + d + '" data-p="' + p + '" aria-label="Delete ' + p + ' photo from ' + d + '">✕</button>' : '<span class="mut small">No photo</span>') + '</div>'; }).join('') + '</div>').join('');
  if (document.querySelector('.modal.info[data-id="ph"]')) refreshSheet('ph', body()); else infoSheet('Compare photos', body(), 'ph');
  for (const p of poses) for (const d of [a, b]) { const x = P.find((y) => y.date === d && y.pose === p); if (x && !(S.phc && S.phc[x.file_id])) { try { await photoImg(x.file_id); refreshSheet('ph', body()); } catch (e) { /* offline */ } } }
}

/* ======================= 27. fitness test days ======================= */
function testsCard() {
  const R0 = prRows(); if (!R0.length) return '';
  const t = todayStr(), rows = R0.map((r) => { const last = (D().prs || []).filter((x) => x.name === r.name).map((x) => x.date).sort().pop(), next = dateAdd(last, 42), left = daysBetween(t, next); return { r, next, left }; }).sort((a, b) => a.left - b.left);
  return '<h2>Test days · every 6 weeks</h2><div class="card list">' + rows.map((x) => '<button class="li" data-act="prsheet" data-n="' + esc(x.r.name) + '"><span class="li-main"><b>' + esc(x.r.name) + '</b><span class="mut small">Next test ' + esc(niceDate(x.next)) + '</span></span><span class="li-end">' + (x.left <= 0 ? '<span class="pill reduce">DUE</span>' : '<span class="count">' + x.left + 'd</span>') + '<span class="chev">›</span></span></button>').join('') + '</div>';
}
function prChart(name) {
  const L = (D().prs || []).filter((r) => r.name === name).sort((a, b) => (a.date < b.date ? -1 : 1)); if (L.length < 2) return '';
  const u = L[0].unit, v = L.map((r) => (u === 'time' ? secOf(r.value) : Number(r.value))), lo = Math.min(...v), hi = Math.max(...v), rg = hi - lo || 1;
  const X = (i) => 10 + (i / (L.length - 1)) * 280, Y = (x) => { const k = (x - lo) / rg; return 10 + (u === 'time' ? k : 1 - k) * 80; };
  return '<svg class="trend" viewBox="0 0 300 100" role="img" aria-label="' + esc(name) + ' results over time">' + '<path class="tline" d="' + v.map((x, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1)).join(' ') + '"/>' + v.map((x, i) => '<circle class="tdot" cx="' + X(i).toFixed(1) + '" cy="' + Y(x).toFixed(1) + '" r="3.5"/>').join('') + '</svg><p class="mut small center">' + (u === 'time' ? 'Higher on the chart = faster' : 'Higher = better') + '</p>';
}

/* ======================= 28. goals ======================= */
function goalSteps(g) { try { const j = JSON.parse(g.steps || '{}'); return Array.isArray(j) ? { steps: j, note: '' } : j; } catch (e) { return { steps: [], note: '' }; } }
function goalsSection() {
  const G = (D().goals || []).filter((g) => g.status === 'active');
  return '<h2>Goals</h2><div class="card list">' + G.map((g) => { const s = goalSteps(g), n = s.steps.filter((x) => x.done).length; return '<button class="li" data-act="goalopen" data-id="' + esc(g.id) + '"><span class="li-ic" style="background:#6d5ce8">' + ICON(LI.target) + '</span><span class="li-main"><b>' + esc(g.goal) + '</b><span class="mut small">' + n + ' of ' + s.steps.length + ' steps' + (g.target ? ' · by ' + esc(niceDate(g.target)) : '') + '</span><span class="bar gbar"><i style="width:' + (s.steps.length ? (n / s.steps.length) * 100 : 0) + '%"></i></span></span><span class="chev">›</span></button>'; }).join('') +
    row({ act: 'goalnew', ic: I.plus, bg: 'var(--accFill)', t: 'New goal', s: 'e.g. muscle-up by March, half marathon under 1:50', cls: 'add' }) + '</div>';
}
function goalBody(id) {
  const g = (D().goals || []).find((x) => x.id === id); if (!g) return '<p class="mut">Goal not found.</p>';
  const s = goalSteps(g);
  return (g.target ? '<p class="mut small">Target ' + esc(niceDate(g.target)) + ' · ' + daysBetween(todayStr(), g.target) + ' days left</p>' : '') + (s.note ? '<p class="small">' + esc(s.note) + '</p>' : '') +
    '<ol class="gsteps">' + s.steps.map((x, i) => '<li><button class="gstep' + (x.done ? ' on' : '') + '" aria-pressed="' + !!x.done + '" data-act="goalstep" data-id="' + esc(id) + '" data-i="' + i + '"><span class="ex-chk" aria-hidden="true"></span><span><b>' + esc(x.t) + '</b>' + (x.how ? '<span class="mut small">' + esc(x.how) + '</span>' : '') + '</span></button></li>').join('') + '</ol>' +
    '<div class="row"><button class="g" data-act="goalset" data-id="' + esc(id) + '" data-s="done">Goal reached 🎉</button><button class="r" data-act="goalset" data-id="' + esc(id) + '" data-s="dropped">Drop goal</button></div>';
}
function goalNewBody() {
  return '<p class="mut small">Write what you want to achieve. I break it into steps you can check off, using your records and training.</p><label class="mut small" for="gname">Goal</label><input id="gname" maxlength="120" placeholder="e.g. First strict muscle-up">' +
    '<label class="mut small" for="gdate">By when (optional)</label><input type="date" id="gdate"><p class="err" id="gerr" role="alert"></p><button class="p" style="width:100%" data-act="goalmake"' + (S.gBusy || !D().ai ? ' disabled' : '') + '>' + (S.gBusy ? 'Planning your steps…' : 'Make my plan') + '</button>' + (D().ai ? '' : '<p class="mut small">Needs your Claude API key.</p>');
}

/* ======================= events + actions ======================= */
document.addEventListener('change', async (ev) => {
  const t = ev.target;
  if (t.id === 'foodcam' && t.files.length) { foodPhoto(t.files[0]); t.value = ''; return; }
  if (t.id === 'phfile' && t.files.length) {
    S.phBusy = true; refreshSheet('phadd', phAddBody());
    try {
      const img = await shrinkImage(t.files[0], 900, 0.82), pose = S.phPose || 'front';
      const j = await call({ action: 'photo_upload', date: todayStr(), pose, data: img.data });
      D().photos = (D().photos || []).filter((p) => !(p.date === todayStr() && p.pose === pose)).concat([j.photo]);
      S.phc = S.phc || {}; S.phc[j.photo.file_id] = 'data:image/jpeg;base64,' + img.data; save(); toast(pose[0].toUpperCase() + pose.slice(1) + ' photo saved');
      S.phPose = { front: 'side', side: 'back', back: 'front' }[pose];
    } catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message, 4000); }
    S.phBusy = false; refreshSheet('phadd', phAddBody()); render(); return;
  }
  if (t.dataset && t.dataset.phsel) phCompare($('#pha').value, $('#phb').value);
});
COACH_KEEP.push('remtog', 'remsync', 'chatsend', 'chatq', 'chatclear', 'eofind', 'phpose', 'phdel', 'goalstep', 'goalmake', 'supp');
Object.assign(COACH_ACTS, {
  shopbuild: async () => {
    if (S.shopBusy) return; S.shopBusy = true; render();
    try { const j = await call({ action: 'shop_build' }); D().shopweek = j.shopweek; save(); toast('Your list is ready'); }
    catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message, 4000); }
    S.shopBusy = false; render();
  },
  supp: (el) => {
    const n = el.dataset.n, ds = todayStr(), on = suppsTaken(ds).indexOf(n) >= 0;
    send(on ? { action: 'del', table: 'Supps', row: { date: ds, name: n } } : { action: 'log', table: 'Supps', row: { date: ds, name: n, time: nowTime() } });
  },
  remopen: () => infoSheet('Reminders', remBody(), 'rem'),
  remtog: (el) => { const k = el.dataset.k, v = D().cfg[k] === 'off' ? 'on' : 'off'; send({ action: 'config', key: k, value: v }); refreshSheet('rem', remBody()); },
  remsync: async () => {
    const sn = Number($('#slneed').value), pt = $('#prtg').value.trim();
    if (!(sn >= 5 && sn <= 11)) { toast('Sleep need must be 5 to 11 hours'); return; }
    if (pt && !(Number(pt) >= 50 && Number(pt) <= 400)) { toast('Protein must be 50 to 400 g'); return; }
    if (String(sn) !== String(D().cfg.sleep_need || 8)) setCfg('sleep_need', sn);
    if (pt && pt !== String(D().cfg.protein_target || '')) setCfg('protein_target', pt);
    S.remBusy = true; refreshSheet('rem', remBody());
    try { await flush(); const j = await call({ action: 'reminders_sync' }); toast(j.result, 4000); D().cfg.last_reminders = j.result; save(); }
    catch (e) { toast(e.message === 'offline' ? 'You are offline.' : /calendar/i.test(e.message) ? 'Allow Calendar: run authorizeCalendar in Apps Script (SETUP.md part 10)' : e.message, 5000); }
    S.remBusy = false; refreshSheet('rem', remBody());
  },
  chatopen: () => { infoSheet('Ask your coach', chatBody(), 'chat'); setTimeout(chatScroll, 80); },
  chatq: (el) => chatSend(el.dataset.q),
  chatsend: () => { const v = $('#chatq').value; chatSend(v); },
  chatclear: () => { LS.removeItem('chat'); refreshSheet('chat', chatBody()); },
  eatout: () => { S.eo = {}; infoSheet('Eating out', eoBody(), 'eo'); },
  eofind: async () => {
    const E = S.eo; E.place = $('#eop').value.trim(); E.time = $('#eot').value; E.note = $('#eon').value.trim();
    if (!E.place) { E.err = 'Write the restaurant or the food'; keepScroll('eo', eoBody()); return; }
    if (!D().ai) { E.err = 'Add your Claude API key first'; keepScroll('eo', eoBody()); return; }
    E.busy = true; E.err = ''; keepScroll('eo', eoBody());
    try { E.res = await call({ action: 'eat_out', place: E.place, time: E.time, note: E.note }); } catch (e) { E.err = e.message === 'offline' ? 'You are offline.' : e.message; }
    E.busy = false; keepScroll('eo', eoBody());
  },
  eopick: (el) => {
    const E = S.eo, o = E.res.options[Number(el.dataset.i)];
    send({ action: 'log', table: 'MealLog', row: { date: todayStr(), slot: 'extra-' + Date.now(), status: 'extra', time: /^\d{2}:\d{2}$/.test(E.time) ? E.time : nowTime(), note: E.place + ': ' + o.name + ' ' + o.kcal + ' kcal', extra_name: o.name.slice(0, 120), kcal: String(o.kcal), protein: String(o.protein) } });
    toast('Added ' + o.name + ' · ' + o.kcal + ' kcal', 3500);
  },
  ckscale: (el) => { const ds = todayStr(), ck = logs('Checkin', ds)[0] || { date: ds, feel: '' }; send({ action: 'log', table: 'Checkin', row: Object.assign({}, ck, { [el.dataset.k]: el.dataset.v }) }); },
  habit: (el) => {
    const k = el.dataset.k, t = nowTime();
    send({ action: 'log', table: 'Habits', row: { date: todayStr(), kind: k, time: t, note: '' } });
    toast(k === 'caffeine' ? (t >= '16:00' ? '☕ Logged. After 16:00 it can hurt tonight’s sleep.' : '☕ Logged at ' + t) : 'Logged', 3500);
  },
  phadd: () => { S.phPose = S.phPose || 'front'; infoSheet('Progress photos', phAddBody(), 'phadd'); },
  phpose: (el) => { S.phPose = el.dataset.p; refreshSheet('phadd', phAddBody()); },
  phview: (el) => { const ds = photoDates(); phCompare(el.dataset.d, ds.find((d) => d !== el.dataset.d) || el.dataset.d); },
  phcompare: () => { const ds = photoDates(); phCompare(ds[0], ds[ds.length - 1]); },
  phdel: async (el) => {
    if (!confirm('Delete this photo? It goes to your Google Drive trash.')) return;
    try { await call({ action: 'photo_del', date: el.dataset.d, pose: el.dataset.p }); D().photos = D().photos.filter((p) => !(p.date === el.dataset.d && p.pose === el.dataset.p)); save(); const ds = photoDates(); if (ds.length) phCompare(ds[0], ds[ds.length - 1]); else closeSheets(); render(); }
    catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message); }
  },
  goalnew: () => infoSheet('New goal', goalNewBody(), 'gnew'),
  goalmake: async () => {
    const g = $('#gname').value.trim(), dt = $('#gdate').value;
    if (!g) { $('#gerr').textContent = 'Write your goal'; return; }
    if (dt && dt <= todayStr()) { $('#gerr').textContent = 'Pick a date in the future'; return; }
    S.gBusy = true; refreshSheet('gnew', goalNewBody()); $('#gname').value = g; $('#gdate').value = dt;
    try { const j = await call({ action: 'goal_plan', goal: g, target: dt }); D().goals = (D().goals || []).concat([j.goal]); save(); S.gBusy = false; infoSheet(j.goal.goal, goalBody(j.goal.id), 'goal'); render(); }
    catch (e) { S.gBusy = false; refreshSheet('gnew', goalNewBody()); $('#gname').value = g; $('#gerr').textContent = e.message === 'offline' ? 'You are offline.' : e.message; }
  },
  goalopen: (el) => { const g = D().goals.find((x) => x.id === el.dataset.id); if (g) infoSheet(g.goal, goalBody(g.id), 'goal'); },
  goalstep: (el) => {
    const g = D().goals.find((x) => x.id === el.dataset.id), s = goalSteps(g), st = s.steps[Number(el.dataset.i)]; st.done = !st.done;
    send({ action: 'log', table: 'Goals', row: Object.assign({}, g, { steps: JSON.stringify(s) }) });
    keepScroll('goal', goalBody(g.id)); if (s.steps.every((x) => x.done)) { confetti(); toast('Every step done! Mark the goal reached.'); }
  },
  goalset: (el) => {
    const g = D().goals.find((x) => x.id === el.dataset.id); if (el.dataset.s === 'dropped' && !confirm('Drop this goal?')) return;
    send({ action: 'log', table: 'Goals', row: Object.assign({}, g, { status: el.dataset.s }) }); if (el.dataset.s === 'done') confetti(); toast(el.dataset.s === 'done' ? 'Goal reached. Proud of you!' : 'Goal dropped');
  }
});


/* ===================== batch4.js ===================== */
/* Apex batch 4: lighter weeks, muscle volume, skills, week planner, session rating, shoes, protein fix,
   fasting mode, weekly food check, readiness forecast, badges, year in review, share link, undo,
   form cues, superset + short-on-time, mobility check, round timer, weight-cut planner,
   "what works for you" and the tip of the day. Loaded after life.js, before app.js. */
const BI = {
  shoe: '<path d="M3 16h17a1 1 0 0 0 1-1c0-1.5-2-2.5-4-3l-3-1-2-3H8L6 10H3z"/><path d="M3 16v2h18v-2"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6h14v-6"/>',
  moonc: '<path d="M15 4a8 8 0 1 0 5 13 7 7 0 0 1-5-13z"/><path d="M18 3v3M16.5 4.5h3"/>',
  ladder: '<path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 10a3 3 0 0 1 6 0M12 10l1.5-2"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'
};

/* ======================= shared: parse + rewrite a session ======================= */
function parseSession(details) {
  const B = []; let cur = null;
  String(details || '').split('\n').forEach((l) => {
    if (/^\s*#/.test(l)) { cur = { head: l.replace(/^\s*#\s*/, ''), ex: [] }; B.push(cur); }
    else if (/^\s*-/.test(l)) { const t = l.replace(/^\s*-\s*/, '').trim(); if (!t) return; if (!cur) { cur = { head: 'Main', ex: [] }; B.push(cur); } cur.ex.push(t); }
  });
  B.forEach((b) => { b.rest = restSec((b.head.match(/rest[^,]*/i) || [''])[0]); b.skip = /warm|note|cool/i.test(b.head); });
  return B;
}
function setsIn(line) { const t = rxTarget(line, ''); return t.sets; }
function withSets(line, n) { return /[×x]\s*\d+/i.test(line) ? line.replace(/([×x]\s*)(\d+)(?!.*[×x]\s*\d)/i, '$1' + n) : line; }
// lighter versions of a session: deload = half the sets, ease = one set less
function lighten(p, level) {
  if (!p || p.load === 'Rest') return null;
  const dl = level === 'deload';
  const det = String(p.details || '').split('\n').map((l) => {
    if (!/^\s*-/.test(l) || /warm/i.test(l)) return l;
    const n = setsIn(l); if (!/[×x]\s*\d+/i.test(l)) return l;
    return withSets(l, Math.max(dl ? 1 : 2, dl ? Math.ceil(n / 2) : n - 1));
  }).join('\n') + '\n# Note\n- ' + (dl ? 'Deload week: about 60-70% of your usual weights, stop 3 reps before failure. Runs easy.' : 'Easing back in: about 80% of your usual weights. Runs easy.');
  return { session: p.session + (dl ? ' (deload)' : ' (easy)'), load: p.load === 'Hard' ? 'Moderate' : p.load, time: p.time, daytype: p.daytype, details: det };
}
function writeWeek(level, reason) {
  const t = todayStr(); let n = 0;
  for (let i = 0; i < 7; i++) {
    const ds = dateAdd(t, i); if (D().overrides.some((o) => o.date === ds && /travel|break|rest day|sick|comeback|post race|race taper/.test(o.reason || ''))) continue;
    const raw = sessionFor0(ds), L = raw && lighten(raw.p, level);
    if (L) { send({ action: 'log', table: 'Overrides', row: Object.assign({ date: ds, reason }, L) }); n++; }
  }
  return n;
}

/* ======================= 33. auto-deload ======================= */
function stalledLifts() {
  const by = {}; (D().sets || []).filter((s) => s.date >= dateAdd(todayStr(), -42) && Number(s.kg) > 0).forEach((s) => { const k = nk(s.exercise); (by[k] = by[k] || {})[s.date] = Math.max((by[k] || {})[s.date] || 0, Number(s.kg)); });
  return Object.keys(by).filter((k) => { const d = Object.keys(by[k]).sort(); if (d.length < 3) return false; const v = d.map((x) => by[k][x]); return v[v.length - 1] <= v[v.length - 3]; });
}
function deloadCheck() {
  const c = D().cfg, t = todayStr(), since = c.last_deload || c.program_start || '';
  if (!since || LS.getItem('deload-dis') > dateAdd(t, -7)) return null;
  if (D().overrides.some((o) => o.date >= t && /deload|ease/.test(o.reason || ''))) return null;
  const weeks = Math.floor(daysBetween(since, t) / 7); if (weeks < 4) return null;
  const W = D().whoop.filter((w) => Number(w.hrv) > 0), avg = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const h7 = avg(W.filter((w) => w.date > dateAdd(t, -7)).map((w) => Number(w.hrv))), h30 = avg(W.filter((w) => w.date > dateAdd(t, -30)).map((w) => Number(w.hrv)));
  const r7 = avg(W.filter((w) => w.date > dateAdd(t, -7)).map((w) => Number(w.recovery) || 0)), st = stalledLifts(), why = [];
  if (h30 && h7 < h30 * 0.9) why.push('HRV is ' + Math.round((1 - h7 / h30) * 100) + '% under your normal');
  if (r7 && r7 < 45) why.push('recovery averaged ' + Math.round(r7) + '% this week');
  if (st.length >= 2) why.push(st.length + ' lifts stopped going up');
  if (!why.length && weeks < 6) return null;
  if (!why.length) why.push(weeks + ' weeks of hard training in a row');
  return { weeks, why };
}
function deloadCard() {
  const x = deloadCheck(); if (!x) return '';
  return '<section class="card missed dl"><div class="ms-top"><span class="ms-ic">' + ICON(TI.heart) + '</span><div><span class="eyebrow3">Time for a lighter week</span><h3>Deload for 7 days?</h3><p class="mut small">' + esc(x.why.join(', ')) + '. A lighter week (half the sets, 60–70% weights) lets your body catch up so you come back stronger.</p></div></div>' +
    '<div class="row hero-act"><button class="p" data-act="dlacc">Make it lighter</button><button data-act="dlrej">Not now</button></div></section>';
}

/* ======================= 54. ease back in after a missed week ======================= */
function missedWeek() {
  const t = todayStr(); if (travel() || LS.getItem('ease-dis') > dateAdd(t, -7)) return 0;
  if (D().overrides.some((o) => o.date >= dateAdd(t, -7) && /deload|ease|break|comeback|sick|post race|race taper/.test(o.reason || ''))) return 0;
  let miss = 0;
  for (let i = 1; i <= 7; i++) { const ds = dateAdd(t, -i); if (ds < (D().cfg.program_start || '')) continue; const s = sessionFor0(ds); if (s && s.p.load !== 'Rest' && s.p.load !== 'Recovery' && !didTrain(ds)) miss++; }
  return miss >= 3 ? miss : 0;
}
function easeCard() {
  const n = missedWeek(); if (!n) return '';
  return '<section class="card missed"><div class="ms-top"><span class="ms-ic">' + ICON(CI.move) + '</span><div><span class="eyebrow3">Welcome back</span><h3>Ease back in this week?</h3><p class="mut small">You missed ' + n + ' sessions in the last 7 days. Jumping straight back to full load is how people get hurt. I can make this week a bit lighter: one set less, about 80% weights.</p></div></div>' +
    '<div class="row hero-act"><button class="p" data-act="easeacc">Ease me back in</button><button data-act="easerej">I’m fine</button></div></section>';
}

/* ======================= 34. muscle-group volume ======================= */
const MUSC = [['Quads', /squat|lunge|leg press|step.?up|pistol|wall ball|thruster|box jump|sled push|skater/i], ['Hamstrings & glutes', /deadlift|rdl|hip thrust|glute|swing|good morning|nordic|bridge/i], ['Back', /pull.?up|chin|row\b|rowing|lat |pulldown|muscle.?up|front lever|face pull|sled pull/i], ['Chest', /push.?up|bench|dip|chest|fly/i], ['Shoulders', /press|handstand|pike|raise|overhead|jerk|snatch/i], ['Arms', /curl|tricep|extension|skull/i], ['Core', /plank|hollow|pallof|crunch|leg raise|l.?sit|dead bug|core|ab wheel|carry/i]];
function muscleOf(name) { const m = MUSC.find((x) => x[1].test(name)); return m ? m[0] : null; }
function volumeCard() {
  const t = todayStr(), logged = (D().sets || []).filter((s) => s.date > dateAdd(t, -7)), V = {};
  let mode = 'logged';
  if (logged.length) logged.forEach((s) => { const g = muscleOf(s.exercise); if (g) V[g] = (V[g] || 0) + 1; });
  else {
    mode = 'planned'; const dw = weekIdx(t);
    for (let i = 0; i < 7; i++) { const s = sessionFor(dateAdd(t, i - dw)); if (!s) continue; parseSession(s.details).filter((b) => !b.skip).forEach((b) => b.ex.forEach((e) => { const g = muscleOf(e); if (g) V[g] = (V[g] || 0) + setsIn(e); })); }
  }
  const rows = MUSC.map(([g]) => { const n = V[g] || 0, lo = g === 'Core' || g === 'Arms' ? 6 : 10, hi = g === 'Core' || g === 'Arms' ? 15 : 20; return { g, n, lo, hi, st: n < lo ? 'low' : n > hi ? 'high' : 'ok' }; });
  return '<h2>Sets per muscle · this week</h2><div class="card vol">' + rows.map((r) => '<div class="vrow"><span>' + esc(r.g) + '</span><div class="vbar" role="img" aria-label="' + r.n + ' sets, aim ' + r.lo + ' to ' + r.hi + '"><i class="' + r.st + '" style="width:' + Math.min(100, (r.n / 25) * 100) + '%"></i><em style="left:' + (r.lo / 25) * 100 + '%;width:' + ((r.hi - r.lo) / 25) * 100 + '%"></em></div><b class="' + (r.st === 'ok' ? 'okt' : 'warnt') + '">' + r.n + '</b></div>').join('') +
    '<p class="mut small" style="margin-top:10px">' + (mode === 'logged' ? 'From the sets you logged in the last 7 days.' : 'From this week’s plan (log your sets to see what you really did).') + ' The shaded zone is a good range for growth: ' + rows.filter((r) => r.st === 'low').map((r) => r.g).join(', ').replace(/^$/, 'everything is in range') + (rows.some((r) => r.st === 'low') ? ' could use more.' : '.') + '</p></div>';
}

/* ======================= 35. skill progressions + 59. grip ======================= */
const SKILLS = {
  'Muscle-up': ['10 strict pull-ups', '5 chest-to-bar pull-ups', '10 straight-bar dips', 'Explosive pull-ups to waist, 3 x 3', 'Band or jumping muscle-up, 3 x 3', '1 strict muscle-up', '3 muscle-ups in a row'],
  Handstand: ['Wall plank hold 60 s', 'Chest-to-wall handstand 45 s', 'Kick up to the wall 10 times in a row', 'Freestanding 5 s', 'Freestanding 15 s', 'Freestanding 30 s'],
  'Pistol squat': ['Pistol to a knee-high box, 5 each leg', 'Assisted pistol holding a pole, 5 each', 'Pistol to a low box, 5 each', '1 full pistol each leg', '5 pistols each leg'],
  'Front lever': ['Tuck front lever 15 s', 'Advanced tuck 10 s', 'One-leg front lever 8 s', 'Straddle front lever 5 s', 'Full front lever 3 s'],
  Grip: ['Dead hang 45 s', 'Dead hang 60 s', 'Farmers carry 2 x 24 kg, 40 m', 'Dead hang 90 s', 'One-arm hang 10 s each', 'Farmers carry 2 x 32 kg, 40 m']
};
function skillDone(sk) { return (D().skills || []).filter((x) => x.skill === sk).map((x) => Number(x.step)); }
function skillsCard() {
  return '<h2>Skills</h2><div class="card list">' + Object.keys(SKILLS).map((k) => { const d = skillDone(k), L = SKILLS[k], nx = L.findIndex((_, i) => d.indexOf(i + 1) < 0);
    return '<button class="li" data-act="skopen" data-k="' + esc(k) + '"><span class="li-ic" style="background:#0ea5e9">' + ICON(BI.ladder) + '</span><span class="li-main"><b>' + esc(k) + '</b><span class="mut small">' + (nx < 0 ? 'All steps done 🎉' : 'Next: ' + esc(L[nx])) + '</span><span class="bar gbar"><i style="width:' + (d.length / L.length) * 100 + '%"></i></span></span><span class="chev">›</span></button>'; }).join('') + '</div>';
}
function skillBody(k) {
  const d = skillDone(k);
  return '<p class="mut small">Tick a step when you can do it with good form. Work on the next one in your sessions.</p><ol class="gsteps">' + SKILLS[k].map((s, i) => { const on = d.indexOf(i + 1) >= 0; return '<li><button class="gstep' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="skstep" data-k="' + esc(k) + '" data-i="' + (i + 1) + '"><span class="ex-chk" aria-hidden="true"></span><span><b>' + esc(s) + '</b></span></button></li>'; }).join('') + '</ol>';
}

/* ======================= 36. plan your week ======================= */
function pwBody() {
  const t = todayStr(), sel = S.pwSel, busy = (S.pw && S.pw.busy) || {};
  const W = D().whoop.filter((w) => Number(w.recovery) > 0), avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
  const r7 = avg(W.filter((w) => w.date > dateAdd(t, -7)).map((w) => Number(w.recovery))), r30 = avg(W.filter((w) => w.date > dateAdd(t, -30)).map((w) => Number(w.recovery)));
  let h = '<p class="mut small">' + (r7 ? 'Recovery this week ' + r7 + '% (normal ' + r30 + '%). ' + (r7 < r30 - 8 ? 'You are running low: keep at most 3 hard days.' : 'You can handle your normal week.') : '') + ' Tap <b>Move</b> on a day, then tap the day to swap it with.</p>' + (S.pw && S.pw.loading ? '<p class="mut small">Loading your calendar…</p>' : S.pw && S.pw.err ? '<p class="mut small">' + esc(S.pw.err) + '</p>' : '');
  const days = []; for (let i = 0; i < 7; i++) days.push(dateAdd(t, i));
  const hardAdj = days.filter((ds, i) => i && (sessionFor(ds) || { p: {} }).p.load === 'Hard' && (sessionFor(days[i - 1]) || { p: {} }).p.load === 'Hard');
  h += days.map((ds) => {
    const s = sessionFor(ds), b = busy[ds] || [], on = sel === ds;
    return '<div class="pwd' + (on ? ' on' : '') + '"><div class="pwd-h"><b>' + (ds === t ? 'Today' : DOW_L[new Date(ds + 'T12:00:00Z').getUTCDay()]) + '</b><span class="mut small">' + esc(niceDate(ds).replace(/^\w+ /, '')) + '</span></div>' +
      '<div class="pwd-m"><span class="sk-f">' + esc(s ? s.name : 'Rest') + '</span><span class="tag ' + LOADC(s ? s.p.load : 'rest') + '">' + esc(s ? s.p.load : 'Rest') + '</span></div>' +
      (b.length ? '<div class="pwd-b">' + b.slice(0, 3).map((e) => '<span>' + esc(e.start) + '–' + esc(e.end) + ' ' + esc(e.title) + '</span>').join('') + '</div>' : '') +
      (s && s.p.time && b.some((e) => e.start <= s.p.time && e.end > s.p.time) ? '<p class="small warnt" style="margin:4px 0 0">Clashes with your calendar at ' + esc(s.p.time) + '</p>' : '') +
      (hardAdj.indexOf(ds) >= 0 ? '<p class="small warnt" style="margin:4px 0 0">Two hard days in a row</p>' : '') +
      '<button class="sm pwmv" data-act="pwmove" data-d="' + ds + '">' + (on ? 'Cancel' : sel ? 'Swap here' : 'Move') + '</button></div>';
  }).join('');
  return h;
}
async function pwOpen() {
  S.pwSel = null; S.pw = { loading: true }; infoSheet('Plan your week', pwBody(), 'pw');
  try { const j = await call({ action: 'week_busy' }); S.pw = { busy: j.busy }; } catch (e) { S.pw = { err: e.message === 'offline' ? 'Offline: your calendar is not shown.' : /permission|calendar/i.test(e.message) ? 'Apex can\u2019t read your Google Calendar yet, so busy times aren\u2019t shown. To allow it: Apps Script › choose authorizeCalendar › Run › Allow, then Deploy › New version.' : 'Your calendar couldn\u2019t be read right now. Try again later.' }; }
  refreshSheet('pw', pwBody());
}
function pwSwap(a, b) {
  const sa = sessionFor0(a), sb = sessionFor0(b), rest = { session: 'Rest', load: 'Rest', time: '', daytype: '', details: '' };
  const f = (s, ds) => (s ? { session: s.p.session, load: s.p.load, time: s.p.time, daytype: s.p.daytype || (planFor(ds) || {}).daytype || 'sat', details: s.p.details } : Object.assign({}, rest, { daytype: (planFor(ds) || {}).daytype || 'sat' }));
  send({ action: 'log', table: 'Overrides', row: Object.assign({ date: b, reason: 'moved from ' + a + ' (week plan)' }, f(sa, b)) });
  send({ action: 'log', table: 'Overrides', row: Object.assign({ date: a, reason: 'moved from ' + b + ' (week plan)' }, f(sb, a)) });
}

/* ======================= 37. session rating ======================= */
function rateBody() {
  const R0 = S.rate;
  return '<p class="mut small">' + esc(R0.session) + ' done. How did it feel?</p><p class="lbl">Effort ' + (R0.rpe ? R0.rpe + '/10' : '') + '</p><div class="rpe" role="group" aria-label="Effort from 1 to 10">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => '<button class="' + (n === R0.rpe ? 'on' : '') + '" aria-pressed="' + (n === R0.rpe) + '" data-act="rtrpe" data-n="' + n + '">' + n + '</button>').join('') + '</div><p class="mut small">1 very easy · 5 steady · 8 hard · 10 all-out</p>' +
    '<p class="lbl">Energy</p><div class="segc" role="group" aria-label="Energy">' + [['great', 'Great'], ['ok', 'OK'], ['flat', 'Flat']].map(([k, l]) => '<button class="' + (R0.energy === k ? 'on' : '') + '" aria-pressed="' + (R0.energy === k) + '" data-act="rten" data-e="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<button class="p" style="width:100%;margin-top:20px" data-act="rtsave"' + (R0.rpe ? '' : ' disabled') + '>Save</button><button class="txt" style="width:100%;margin-top:6px" data-close>Skip</button>';
}

/* ======================= 38. running shoes ======================= */
function shoesCard() {
  const L = (D().shoes || []).filter((s) => !s.retired);
  return '<h2>Running shoes</h2><div class="card list">' + L.map((s) => { const km = Number(s.km) || 0, w = km >= 700 ? 'badt' : km >= 600 ? 'warnt' : ''; return '<button class="li" data-act="shoeopen" data-id="' + esc(s.id) + '"><span class="li-ic" style="background:#fc4c02">' + ICON(BI.shoe) + '</span><span class="li-main"><b>' + esc(s.name) + '</b><span class="mut small ' + w + '">' + (km >= 700 ? 'Time for new shoes' : km >= 600 ? 'Getting worn: plan a new pair' : 'Since ' + esc(niceDate(s.added))) + '</span><span class="bar gbar"><i style="width:' + Math.min(100, (km / 700) * 100) + '%"></i></span></span><span class="li-end"><b>' + Math.round(km) + '</b> km</span></button>'; }).join('') +
    row({ act: 'shoeadd', ic: I.plus, bg: 'var(--accFill)', t: 'Add shoes', s: 'Runs from Strava count from the day you add them', cls: 'add' }) + '</div>';
}

/* ======================= 39. protein-first fix ======================= */
const PROT = [['Greek yogurt, 200 g', 20, 130], ['Tuna can in water', 25, 110], ['Whey shake, 1 scoop', 24, 120], ['Cottage cheese, 200 g', 24, 180], ['Chicken breast, 150 g cooked', 46, 240], ['4 egg whites', 14, 70], ['Lean beef, 100 g cooked', 26, 200]];
function proteinGap() {
  const ds = todayStr(), p = dayPlan(ds); if (!p) return 0;
  const ms = mealsFor(p.daytype), ml = logs('MealLog', ds), tg = targetFor(p.daytype);
  const left = ms.filter((m) => !ml.some((r) => r.slot === m.slot)).reduce((a, m) => a + (Number(m.protein) || 0), 0);
  return Math.round(proteinTarget(tg) - proteinEaten(ms, ml) - left);
}
function proteinOpts() {
  const need = Math.min(proteinGap(), 70) - 5, C = [];
  PROT.forEach((a, i) => { C.push([a]); PROT.forEach((b, k) => { if (k > i) { C.push([a, b]); PROT.forEach((c, l) => { if (l > k) C.push([a, b, c]); }); } }); });
  return C.map((c) => [c, c.reduce((x, y) => x + y[1], 0), c.reduce((x, y) => x + y[2], 0)]).filter((o) => o[1] >= need).sort((a, b) => a[2] - b[2] || a[0].length - b[0].length).slice(0, 2);
}
function proteinFixCard() {
  if (local().hour < 15) return ''; const gap = proteinGap(); if (gap < 20) return '';
  const opts = proteinOpts();
  return '<section class="card pfix"><span class="eyebrow3">Protein still missing</span><h3>' + gap + ' g to go today</h3><p class="mut small">Your planned meals left won\u2019t cover it. ' + (gap > 70 ? 'The biggest quick fixes' : 'Quick fixes') + ', lowest calories first:</p>' +
    opts.map((o, i) => '<div class="li"><span class="li-main"><b>' + esc(o[0].map((x) => x[0]).join(' + ')) + '</b><span class="mut small">' + o[1] + ' g protein · ' + o[2] + ' kcal</span></span><button class="sm fit" data-act="pfate" data-i="' + i + '">I had it</button></div>').join('') + '</section>';
}
/* ======================= 41. fasting / Ramadan mode ======================= */
function fasting() { try { const f = JSON.parse(D().cfg.fasting || 'null'); return f && f.iftar ? f : null; } catch (e) { return null; } }
function addHM(hm, min) { const t = Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)) + min, x = ((t % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); }
function fastRemap(ms) {
  const f = fasting(); if (!f) return ms;
  const food = ms.filter((m) => m.slot !== 'wake' && m.slot !== 'mg').sort((a, b) => (a.time < b.time ? -1 : 1));
  const map = {}; food.forEach((m, i) => { map[m.slot] = i === food.length - 1 && food.length > 1 ? f.suhoor : addHM(f.iftar, i * 120); });
  const toM = (hm) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)), rel = (hm) => (toM(hm) - toM(f.iftar) + 1440) % 1440;
  // the day now runs from iftar to the morning protocol before suhoor
  return ms.map((m) => Object.assign({}, m, { time: m.slot === 'wake' ? addHM(f.suhoor, -15) : m.slot === 'mg' ? addHM(f.iftar, 300) : map[m.slot] || m.time })).sort((a, b) => rel(a.time) - rel(b.time));
}
function fastCard() {
  const f = fasting(); if (!f) return '';
  const W = waterInfo(todayStr()), open = (Number(f.suhoor.slice(0, 2)) + 24 - Number(f.iftar.slice(0, 2))) % 24;
  return '<section class="card travelc"><span class="eyebrow3">' + ICON(BI.moonc) + ' Fasting mode</span><p class="small" style="margin:8px 0 0">Iftar ' + esc(f.iftar) + ' · suhoor ' + esc(f.suhoor) + '. Meals are moved to your eating window. Train 60–90 min before iftar (easy) or 2 h after iftar (hard). Drink ' + wFmt(W.tgt) + ' between iftar and suhoor, about ' + wFmt(Math.round(W.tgt / Math.max(4, open))) + ' an hour.</p></section>';
}
function fastBody() {
  const f = fasting() || { iftar: '17:05', suhoor: '04:30' };
  return '<p class="mut small">For Ramadan or any daily fast. Your meals move to the eating window: first meal at iftar, the next ones every 2 hours, the last at suhoor.</p><div class="row two"><div><label class="mut small" for="fsi">Iftar</label><input type="time" id="fsi" value="' + esc(f.iftar) + '"></div><div><label class="mut small" for="fss">Suhoor</label><input type="time" id="fss" value="' + esc(f.suhoor) + '"></div></div>' +
    '<button class="p" style="width:100%;margin-top:20px" data-act="fastsave">' + (fasting() ? 'Save times' : 'Turn on fasting mode') + '</button>' + (fasting() ? '<button class="r" style="width:100%;margin-top:10px" data-act="fastoff">Turn off</button>' : '');
}

/* ======================= 43. weekly food check ======================= */
function foodCheck() {
  const t = todayStr(); let planned = 0, on = 0, late = 0, extras = 0, pSum = 0, pT = 0, days = 0;
  for (let i = 1; i <= 7; i++) {
    const ds = dateAdd(t, -i), p = dayPlan(ds); if (!p) continue; const ms = mealsFor(p.daytype), ml = logs('MealLog', ds); if (!ml.length) continue;
    days++; ms.filter((m) => Number(m.kcal) > 0).forEach((m) => { planned++; const r = ml.find((x) => x.slot === m.slot); if (r && r.status === 'ate') on++; });
    if (lateMeal(ds)) late++; extras += ml.filter((r) => r.status === 'extra').length; pSum += proteinEaten(ms, ml); pT += proteinTarget(targetFor(p.daytype));
  }
  if (days < 3) return null;
  const hasP = D().meals.some((m) => Number(m.protein) > 0);
  const onp = planned ? on / planned : 0, pr = hasP && pT ? Math.min(1, pSum / pT) : 1, score = Math.round(hasP ? 50 * onp + 30 * pr + 20 * (1 - late / days) : (70 * onp + 30 * (1 - late / days)));
  const fix = [[onp, 'Stick closer to your planned meals: ' + Math.round(onp * 100) + '% were eaten as planned.'], [pr, 'Protein averaged ' + Math.round(pSum / days) + ' g a day, below target. Add one protein snack.'], [1 - late / days, 'You ate after 21:00 on ' + late + ' days. Finish dinner earlier for better sleep.']].sort((a, b) => a[0] - b[0])[0][1];
  return { score, onp, prot: Math.round(pSum / days), late, extras, days, fix };
}
function foodCheckCard(home) {
  if (home && weekIdx(todayStr()) !== 0) return ''; // first day of the plan week
  const F = foodCheck(); if (!F) return '';
  return (home ? '' : '<h2>Weekly food check</h2>') + '<section class="card fcheck"><div class="row sp"><div>' + (home ? '<span class="eyebrow3">Weekly food check</span>' : '') + '<b class="ld-n">' + F.score + '</b><span class="mut small"> / 100</span></div><span class="pill ' + (F.score >= 75 ? 'keep' : F.score >= 50 ? 'reduce' : 'swap') + '">' + (F.score >= 75 ? 'GOOD WEEK' : F.score >= 50 ? 'OK' : 'NEEDS WORK') + '</span></div>' +
    '<p class="small" style="margin:8px 0 0">' + Math.round(F.onp * 100) + '% meals on plan · ' + (D().meals.some((m) => Number(m.protein) > 0) ? F.prot + ' g protein a day · ' : '') + F.late + ' late nights · ' + F.extras + ' extras</p><p class="fb-next"><b>One thing to fix</b>' + esc(F.fix) + '</p></section>';
}

/* ======================= 44. readiness forecast ======================= */
function forecast() {
  const t = todayStr(), W = D().whoop, w = whoopFor(t), base = W.filter((x) => x.date > dateAdd(t, -30) && Number(x.recovery) > 0).map((x) => Number(x.recovery));
  if (base.length < 5) return null;
  const avg = base.reduce((a, b) => a + b, 0) / base.length, why = [];
  let est = w && Number(w.recovery) ? 0.6 * avg + 0.4 * Number(w.recovery) : avg;
  const strain = w ? Number(w.strain) || 0 : 0; if (strain > 14) { est -= 8; why.push('high strain today'); } else if (strain > 10) { est -= 4; why.push('solid strain today'); }
  if (lateCaffeine(t)) { est -= 5; why.push('late coffee'); }
  if ((D().habits || []).some((h) => h.date === t && h.kind === 'alcohol')) { est -= 12; why.push('alcohol'); }
  const ck = logs('Checkin', t)[0]; if (ck && Number(ck.stress) >= 4) { est -= 5; why.push('stress'); }
  const wl = logs('WorkoutLog', t).find((l) => l.status === 'done'); if (wl && Number(wl.rpe) >= 8) { est -= 4; why.push('hard session'); }
  if (!why.length) why.push('a normal day');
  est = Math.max(5, Math.min(95, Math.round(est)));
  return { lo: Math.max(1, est - 8), hi: Math.min(99, est + 8), est, why, zone: est >= 67 ? 'okt' : est >= 34 ? 'warnt' : 'badt' };
}
function forecastLine() {
  const F = forecast(); if (!F) return '';
  return '<p class="fcast"><span>Tomorrow’s recovery, likely</span><b class="' + F.zone + '">' + F.lo + '–' + F.hi + '%</b><em>Based on your normal, ' + esc(F.why.join(', ')) + '. Sleep on time to land at the top.</em></p>';
}

/* ======================= 48. badges + 49. year in review ======================= */
function badgeList() {
  const T = (D().stats || {}).totals || {}, st = D().stats || {};
  return [['First workout', T.workouts >= 1, 'Finish a workout'], ['10 workouts', T.workouts >= 10, '10 workouts done'], ['50 workouts', T.workouts >= 50, '50 workouts done'], ['100 workouts', T.workouts >= 100, '100 workouts done'],
    ['50 km run', T.km >= 50, 'Run 50 km in total'], ['100 km run', T.km >= 100, 'Run 100 km'], ['500 km run', T.km >= 500, 'Run 500 km'], ['Half-marathon distance', T.longest >= 21.1, 'One run of 21.1 km'],
    ['Sub-25 5K pace', T.best5kPace && T.best5kPace <= 300, 'A 5 km+ run under 5:00 /km'], ['HYROX finisher', T.hyrox >= 1, 'Log a HYROX race'], ['First record', T.prs >= 1, 'Log a personal record'], ['10 records', T.prs >= 10, '10 records logged'],
    ['Goal reached', T.goalsDone >= 1, 'Finish a goal'], ['7-day streak', st.train >= 7, '7 days on plan in a row'], ['Water week', st.water >= 7, 'Hit water 7 days in a row'], ['100 sets logged', T.sets >= 100, 'Log 100 sets'], ['All-rounder', T.sport >= 5, 'Log 5 sport sessions']];
}
function badgesCard() {
  const B = badgeList(), got = B.filter((b) => b[1]);
  const seen = jget('badges', null), names = got.map((b) => b[0]);
  if (seen && names.some((n) => seen.indexOf(n) < 0)) { const nw = names.filter((n) => seen.indexOf(n) < 0); setTimeout(() => { confetti(); toast('New badge: ' + nw.join(', ') + ' 🏅', 4000); }, 500); }
  LS.setItem('badges', JSON.stringify(names));
  return '<h2>Badges · ' + got.length + ' of ' + B.length + '</h2><div class="badges">' + B.map((b) => '<div class="badge' + (b[1] ? ' on' : '') + '" role="img" aria-label="' + esc(b[0]) + (b[1] ? ', earned' : ', locked: ' + esc(b[2])) + '"><span>' + ICON(BI.star) + '</span><b>' + esc(b[0]) + '</b>' + (b[1] ? '' : '<em>' + esc(b[2]) + '</em>') + '</div>').join('') + '</div>';
}
function yearCard() {
  const Y = ((D().stats || {}).totals || {}).year; if (!Y || !Y.workouts && !Y.runs) return '';
  const M = Y.bestMonth ? new Date(Y.bestMonth + '-15T12:00:00Z').toLocaleString('en', { month: 'long', timeZone: 'UTC' }) : '';
  return '<h2>' + esc(Y.y) + ' so far</h2><div class="tiles streaks yr">' + [[Y.workouts, 'workouts done'], [Y.km + ' km', Y.runs + ' runs'], [Y.prs, 'records'], [Y.recovery ? Y.recovery + '%' : '—', 'average recovery'], [Y.sleep ? Y.sleep + ' h' : '—', 'average sleep'], [M || '—', M ? 'best month · ' + Y.bestMonthCount + ' workouts' : 'best month']]
    .map(([v, l]) => '<div class="tile stk"><b>' + esc(v) + '</b><span class="tl-l">' + esc(l) + '</span></div>').join('') + '</div>' + (Y.sportMin ? '<p class="foot">Plus ' + Math.round(Y.sportMin / 60) + ' hours of other sports.</p>' : '');
}

/* ======================= 50. share your week ======================= */
function shareBody() {
  const tk = D().cfg.share_token, url = tk ? S.url + '?share=' + tk : '';
  if (!tk) return '<p class="mut small">Make a private, read-only link to this week’s training (sessions and which are done). No food, body or health data. Turn it off any time.</p><button class="p" style="width:100%;margin-top:16px" data-act="shareon"' + (S.shBusy ? ' disabled' : '') + '>' + (S.shBusy ? 'Making link…' : 'Make a link') + '</button>';
  return '<p class="mut small">Anyone with this link can see this week’s sessions. Turning it off stops the link at once.</p><input id="shurl" readonly value="' + esc(url) + '" aria-label="Share link">' +
    '<div class="row" style="margin-top:12px"><button class="p" data-act="sharecopy">Copy link</button>' + (navigator.share ? '<button data-act="sharesend">Send…</button>' : '') + '</div><button class="r" style="width:100%;margin-top:12px" data-act="shareoff">Turn link off</button>';
}

/* ======================= 52. undo ======================= */
const UKEYS = { MealLog: ['date', 'slot'], WaterLog: ['date'], WorkoutLog: ['date', 'session'], Checkin: ['date'], Body: ['date'], Events: ['name', 'date'], Library: ['url'], Interests: ['name'], Overrides: ['date'], PRs: ['date', 'name'], Sets: ['date', 'exercise', 'set'], Supps: ['date', 'name'], SportLog: ['id'], Hyrox: ['date', 'station'], Injuries: ['area'], Habits: ['date', 'kind', 'time'], Goals: ['id'], Skills: ['skill', 'step'], Shoes: ['id'], Mobility: ['date', 'test'] };
function ulist(table) { const d = S.data; return { Events: d.events, Library: d.library, Interests: d.interests, Overrides: d.overrides, PRs: d.prs, Sets: d.sets, Supps: d.supps, SportLog: d.sport, Hyrox: d.hyrox, Injuries: d.injuries, Habits: d.habits, Goals: d.goals, Skills: d.skills, Shoes: d.shoes, Mobility: d.mobility }[table] || d.logs[table]; }
function inverseOf(item) {
  if (!S.data) return null;
  if (item.action === 'config') { const old = D().cfg[item.key]; return { action: 'config', key: item.key, value: old != null ? old : /^rem_/.test(item.key) ? 'on' : '' }; }
  if (item.action !== 'log' && item.action !== 'del') return null;
  const keys = UKEYS[item.table], L = ulist(item.table); if (!keys || !L) return null;
  const old = L.find((r) => keys.every((k) => String(r[k]) === String(item.row[k])));
  if (item.action === 'del') return old ? { action: 'log', table: item.table, row: Object.assign({}, old) } : null;
  if (old) return { action: 'log', table: item.table, row: Object.assign({}, old) };
  const row = {}; keys.forEach((k) => { row[k] = item.row[k]; }); return { action: 'del', table: item.table, row };
}
function undoTrack(item) {
  if (S.noUndo) return; const inv = inverseOf(item); if (!inv) return;
  const now = Date.now();
  if (!S.undo || now - S.undo.at > 800 || S.undo.used) S.undo = { ops: [], at: now, shown: false };
  S.undo.ops.push(inv); S.undo.at = now;
  clearTimeout(S.undoT); S.undoT = setTimeout(() => { if (S.undo && !S.undo.shown) toast('Saved', 5000); }, 120);
}
function undoNow() {
  const U = S.undo; if (!U || U.used) return; U.used = true; S.noUndo = true;
  U.ops.slice().reverse().forEach((op) => send(op)); S.noUndo = false;
  const t = $('#toast'); t.textContent = 'Undone'; clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), 1500);
}

/* ======================= 55. tempo + form cues ======================= */
const CUES = [
  [/back squat|front squat|goblet/i, '3-1-1', ['Brace your belly before you go down', 'Knees follow your toes, heels stay down']],
  [/deadlift(?!.*romanian)|^deadlift/i, '2-1-1', ['Bar close to your shins the whole way', 'Push the floor away, hips and shoulders rise together']],
  [/romanian|rdl/i, '3-1-1', ['Soft knees, push your hips back', 'Stop when you feel the hamstrings, back stays flat']],
  [/bulgarian|split squat|lunge/i, '2-1-1', ['Front knee over the middle of the foot', 'Drop the back knee straight down']],
  [/hip thrust|glute bridge|bridge/i, '2-2-1', ['Chin tucked, ribs down', 'Squeeze glutes 2 s at the top']],
  [/pull.?up|chin.?up/i, '2-1-1', ['Start each rep from a dead hang', 'Pull elbows down to your ribs']],
  [/muscle.?up/i, 'controlled', ['Pull high to the waist, not just the chest', 'Fast wrists over the bar at the top']],
  [/push.?up/i, '2-1-1', ['Body in one straight line', 'Elbows about 45° from your sides']],
  [/dip/i, '2-1-1', ['Shoulders down away from ears', 'Go down until upper arm is level']],
  [/handstand/i, 'controlled', ['Push tall through the shoulders', 'Squeeze legs and glutes, look at your hands']],
  [/press|overhead/i, '2-1-1', ['Squeeze glutes so your back does not arch', 'Head through at the top']],
  [/row\b|bent.?over|inverted row/i, '2-1-1', ['Lead with the elbows', 'Pause with shoulder blades squeezed']],
  [/swing/i, 'explosive', ['Hinge, don’t squat', 'Snap hips, the bell floats to chest height']],
  [/box jump|jump/i, 'explosive', ['Land soft and quiet', 'Step down, don’t jump down']],
  [/plank|hollow/i, 'hold', ['Ribs down, lower back pressed flat', 'Breathe slowly through the hold']],
  [/pallof/i, '2-2-2', ['Don’t let the band twist you', 'Press straight out from the chest']],
  [/wall ball/i, 'steady', ['Full squat, then use your legs to throw', 'Catch high and go straight into the next squat']],
  [/burpee/i, 'steady', ['Step back if tired, keep moving', 'Breathe out on every jump']],
  [/sled/i, 'steady', ['Low body angle, arms locked', 'Short fast steps']],
  [/farmer|carry/i, 'walk', ['Tall chest, shoulders down', 'Small quick steps, grip hard']],
  [/run|jog|strides/i, 'n/a', ['Relaxed shoulders, quick light steps', 'Easy days: you should be able to talk']]
];
function cuesFor(name) { const c = CUES.find((x) => x[0].test(name)); if (c) return { tempo: c[1], cues: c[2] }; return jget('cue-' + nk(name), null); }
function cuesHTML(name) {
  const c = cuesFor(name);
  if (c) return '<div class="cues"><span class="eyebrow3">Tempo ' + esc(c.tempo) + '</span><ul>' + c.cues.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' + (/\d-\d-\d/.test(c.tempo) ? '<p class="mut small">Tempo = seconds down · pause · up.</p>' : '') + '</div>';
  return D().ai ? '<button class="sm" style="width:100%;margin-top:10px" data-act="excues"' + (S.cueBusy ? ' disabled' : '') + '>' + (S.cueBusy ? 'Getting tips…' : 'Get tempo and form tips') + '</button>' : '';
}

/* ======================= 56. superset + 57. short on time ======================= */
// minutes for a session: a block heading that says "40 min" wins; a line like "Easy run 40 min" counts its minutes; otherwise sets x (45 s + rest)
function estMin(blocks) {
  const hm = (t) => { const m = String(t || '').replace(/\(.*?\)/g, '').replace(/\brest\b.*$/i, '').match(/(\d+)\s*min\b/i); return m ? Number(m[1]) : 0; };
  return Math.round(blocks.reduce((a, b) => {
    if (hm(b.head)) return a + hm(b.head) * 60;
    const km = String(b.head).match(/(\d+(?:\.\d+)?)\s*km\b/i); if (km && /run|jog/i.test(b.head)) return a + Number(km[1]) * 7 * 60; // easy pace, about 7 min per km
    if (b.skip) return a + (/warm/i.test(b.head) ? 6 * 60 : 0);
    return a + b.ex.reduce((x, e) => x + (hm(e) && !/[x×]\s*\d+\s*$/i.test(e) ? hm(e) * 60 : setsIn(e) * (45 + b.rest)), 0);
  }, 0) / 60);
}
function supersetPlan(details) {
  const B = parseSession(details), main = [], out = []; B.forEach((b) => { if (!b.skip) b.ex.forEach((e) => main.push({ e, rest: b.rest, g: muscleOf(e) || e })); });
  const used = new Set();
  main.forEach((x, i) => {
    if (used.has(i)) return; used.add(i);
    const j = main.findIndex((y, k) => !used.has(k) && k > i && y.g !== x.g); if (j < 0) { out.push([x]); return; }
    used.add(j); out.push([x, main[j]]);
  });
  const warm = B.find((b) => /warm/i.test(b.head));
  let det = warm ? '# ' + warm.head + '\n' + warm.ex.map((e) => '- ' + e).join('\n') + '\n' : '';
  out.forEach((g, i) => { det += '# ' + (g.length > 1 ? 'Superset ' + (i + 1) + ', rest ' + fmtSec(Math.max(g[0].rest, g[1].rest)) + ' after both' : 'Block ' + (i + 1) + ', rest ' + fmtSec(g[0].rest)) + '\n' + g.map((x, k) => '- ' + (g.length > 1 ? String.fromCharCode(65 + i) + (k + 1) + '. ' : '') + x.e).join('\n') + '\n'; });
  const after = out.reduce((a, g) => a + Math.max(...g.map((x) => setsIn(x.e))) * (g.length * 45 + Math.max(...g.map((x) => x.rest))), 0) / 60 + (warm ? 6 : 0);
  return { details: det.trim(), before: estMin(B), after: Math.round(after), pairs: out.filter((g) => g.length > 1).length };
}
function shortPlan(details, mins) {
  const B = parseSession(details), warm = B.find((b) => /warm/i.test(b.head)); let left = mins * 60 - (warm ? 300 : 0), det = warm ? '# Warm-up 5 min (short)\n- ' + (warm.ex[0] || 'Easy cardio and dynamic stretches') + '\n' : '';
  const keep = [];
  B.filter((b) => !b.skip).sort((a, b) => (/core|finisher|accessor|abs/i.test(a.head) ? 1 : 0) - (/core|finisher|accessor|abs/i.test(b.head) ? 1 : 0)).forEach((b) => {
    if (left < 120) return; const ex = [];
    b.ex.forEach((e) => { const per = 45 + b.rest; let n = setsIn(e); while (n > 1 && n * per > left) n--; if (n * per <= left || ex.length === 0 && left >= per) { ex.push(n === setsIn(e) ? e : withSets(e, n)); left -= n * per; } });
    if (ex.length) keep.push({ head: b.head, ex });
  });
  keep.forEach((b) => { det += '# ' + b.head + '\n' + b.ex.map((e) => '- ' + e).join('\n') + '\n'; });
  return { details: det.trim(), kept: keep.reduce((a, b) => a + b.ex.length, 0), total: B.filter((b) => !b.skip).reduce((a, b) => a + b.ex.length, 0), before: estMin(B) };
}
function adjBody() {
  const A = S.adj, ses = sessionFor(A.ds); if (!ses) return '<p class="mut">No session.</p>';
  let h = '<div class="segc" role="group" aria-label="How to change it">' + [['short', 'Short on time'], ['ss', 'Superset']].map(([k, l]) => '<button class="' + (A.mode === k ? 'on' : '') + '" aria-pressed="' + (A.mode === k) + '" data-act="adjmode" data-m="' + k + '">' + l + '</button>').join('') + '</div>';
  let P;
  if (A.mode === 'short') {
    h += '<p class="lbl">How much time do you have?</p><div class="segc" role="group" aria-label="Minutes">' + [20, 30, 45, 60].map((m) => '<button class="' + (A.min === m ? 'on' : '') + '" aria-pressed="' + (A.min === m) + '" data-act="adjmin" data-n="' + m + '">' + m + ' min</button>').join('') + '</div>';
    P = shortPlan(ses.details, A.min); h += '<p class="mut small">Normally about ' + P.before + ' min. Keeps the main lifts first and drops core/finisher work first: ' + P.kept + ' of ' + P.total + ' exercises.</p>';
  } else { P = supersetPlan(ses.details); h += '<p class="mut small">' + P.pairs + ' pairs of exercises that don’t tire the same muscles. About ' + P.before + ' → ' + P.after + ' min.</p>'; }
  A.plan = P.details;
  return h + '<div class="card adjprev">' + blocksHTML(P.details, 'adj-' + A.ds) + '</div><button class="p" style="width:100%;margin-top:16px" data-act="adjuse">Use this ' + (A.ds === todayStr() ? 'today' : 'on ' + esc(niceDate(A.ds))) + '</button>';
}

/* ======================= 58. mobility check ======================= */
const MOB = [['Deep squat', 'Feet shoulder-width, sit down and hold 30 s. 2 = heels down, chest up · 1 = heels lift or wobbly · 0 = can’t get down', 'Goblet squat hold 3 x 45 s'], ['Toe touch', 'Legs straight, reach down. 2 = palms on floor · 1 = fingertips · 0 = above toes', 'Jefferson curl, light, 2 x 8'],
  ['Shoulder reach', 'One hand over the shoulder, the other behind the back. 2 = fingers overlap · 1 = touch · 0 = gap', 'Sleeper stretch and wall slides 2 x 10'], ['90/90 hips', 'Sit with both knees bent 90°. 2 = upright with no hands, both sides · 1 = one side · 0 = need hands', '90/90 switches 2 x 8 each'],
  ['Ankle', 'Foot 10 cm from a wall, knee to the wall, heel down. 2 = both sides · 1 = one side · 0 = neither', 'Knee-to-wall rocks 2 x 15 each']];
function mobLatest() { const L = D().mobility || []; const ds = [...new Set(L.map((x) => x.date))].sort(); const d = ds[ds.length - 1]; return d ? { date: d, rows: L.filter((x) => x.date === d), prev: ds[ds.length - 2] } : null; }
function mobCard() {
  const M = mobLatest(), tot = M ? M.rows.reduce((a, r) => a + Number(r.score), 0) : null;
  const prevT = M && M.prev ? (D().mobility || []).filter((x) => x.date === M.prev).reduce((a, r) => a + Number(r.score), 0) : null;
  const low = M ? M.rows.filter((r) => Number(r.score) < 2) : [];
  return '<h2>Mobility check</h2><div class="card">' + (M ? '<div class="row sp"><div><b class="ld-n">' + tot + '</b><span class="mut small"> / 10</span></div><span class="mut small">' + esc(niceDate(M.date)) + (prevT !== null ? ' · was ' + prevT : '') + '</span></div>' +
    (low.length ? '<p class="small" style="margin:8px 0 0">Work on: ' + low.map((r) => { const m = MOB.find((x) => x[0] === r.test); return '<b>' + esc(r.test) + '</b> (' + esc(m ? m[2] : '') + ')'; }).join(', ') + '</p>' : '<p class="small okt" style="margin:8px 0 0">Full marks. Keep it up.</p>') +
    (daysBetween(M.date, todayStr()) >= 28 ? '<p class="small warnt" style="margin:6px 0 0">Time for this month’s check.</p>' : '<p class="mut small" style="margin:6px 0 0">Next check ' + esc(niceDate(dateAdd(M.date, 30))) + '</p>') : '<p class="mut small" style="margin:0">Five quick tests, 5 minutes, once a month. Shows what is tight and what to stretch.</p>') +
    '<button class="p" style="width:100%;margin-top:14px" data-act="mobopen">' + (M ? 'Do the check again' : 'Start the check') + '</button></div>';
}
function mobBody() {
  const V = S.mob;
  return MOB.map(([n, d], i) => '<div class="mobt"><b>' + (i + 1) + '. ' + esc(n) + '</b><p class="mut small">' + esc(d) + '</p><div class="segc" role="group" aria-label="' + esc(n) + ' score">' + [0, 1, 2].map((s) => '<button class="' + (V[n] === s ? 'on' : '') + '" aria-pressed="' + (V[n] === s) + '" data-act="mobsc" data-n="' + esc(n) + '" data-s="' + s + '">' + s + '</button>').join('') + '</div></div>').join('') +
    '<button class="p" style="width:100%;margin-top:16px" data-act="mobsave"' + (Object.keys(V).length === MOB.length ? '' : ' disabled') + '>Save · ' + Object.values(V).reduce((a, b) => a + b, 0) + ' / 10</button>';
}

/* ======================= 61. round timer: added as a mode of the interval timer ======================= */
IT_PRESET.rounds = { w: 180, r: 60, n: 5, label: 'Rounds' };

/* ======================= 62. weight-cut planner ======================= */
function cut() { try { const c = JSON.parse(D().cfg.cut || 'null'); return c && c.target ? c : null; } catch (e) { return null; } }
function curWeight() { const B = D().logs.Body.filter((b) => Number(b.weight) > 0); if (!B.length) return 0; const L = B.filter((b) => b.date > dateAdd(B[B.length - 1].date, -7)).map((b) => Number(b.weight)); return Math.round((L.reduce((a, b) => a + b, 0) / L.length) * 10) / 10; }
function cutPlan(start, target, startDate, date) {
  const weeks = Math.max(1, daysBetween(startDate, date) / 7), perW = (start - target) / weeks, pct = (perW / start) * 100;
  const kcal = Math.round((perW * 7700) / 7), rows = []; for (let i = 1; i <= Math.ceil(weeks); i++) rows.push([dateAdd(startDate, Math.min(i * 7, daysBetween(startDate, date))), Math.max(target, start - perW * i)]);
  return { weeks, perW, pct, kcal, rows, lvl: pct > 1.5 ? 'bad' : pct > 1 ? 'warn' : 'ok' };
}
function cutBody() {
  const c = cut(), w = curWeight(), V = S.cutV || { target: c ? c.target : '', date: c ? c.date : dateAdd(todayStr(), 56) };
  let h = '<p class="mut small">Plan a safe weight loss to a target, e.g. for a fight or a race. Uses your 7-day average weight' + (w ? ' (' + w + ' kg)' : '') + '.</p><div class="row two"><div><label class="mut small" for="cutt">Target (kg)</label><input id="cutt" type="number" inputmode="decimal" step="0.1" value="' + esc(V.target) + '"></div><div><label class="mut small" for="cutd">By</label><input type="date" id="cutd" value="' + esc(V.date) + '"></div></div><button class="sm" style="width:100%;margin-top:10px" data-act="cutcalc">Show the plan</button>';
  if (!w) return h + '<p class="err">Log your weight on Today first.</p>';
  if (V.target && V.date > todayStr() && Number(V.target) < w) {
    const P = cutPlan(c && c.start ? c.start : w, Number(V.target), c && c.startDate ? c.startDate : todayStr(), V.date);
    h += '<div class="lastbox ' + P.lvl + '"><b>' + P.perW.toFixed(2) + ' kg a week · ' + P.pct.toFixed(1) + '% of body weight</b><span class="small">' + (P.lvl === 'ok' ? 'Safe pace. Keep protein high and lift heavy so you lose fat, not muscle.' : P.lvl === 'warn' ? 'Fast. You will likely lose some muscle and feel flat in training. More time is better.' : 'Too fast to be safe. Push the date back or pick a higher target.') + '</span><span class="mut small">About ' + P.kcal + ' kcal a day under what you burn.</span></div>' +
      '<div class="pace-t">' + P.rows.map(([d, kg]) => '<div><span>' + esc(niceDate(d).replace(/^\w+ /, '')) + '</span><b>' + kg.toFixed(1) + ' kg</b></div>').join('') + '</div>' +
      '<p class="mut small" style="margin-top:10px">Making weight with water or sauna right before a weigh-in is risky: only do that with your coach or a doctor. This plan is for steady fat loss.</p>' +
      '<button class="p" style="width:100%;margin-top:14px" data-act="cutsave">' + (c ? 'Update plan' : 'Start this plan') + '</button>';
  } else if (V.target) h += '<p class="err">Target must be below ' + w + ' kg and the date in the future.</p>';
  if (c) h += '<button class="r" style="width:100%;margin-top:10px" data-act="cutoff">Stop the plan</button>';
  return h;
}
function cutCard() {
  const c = cut(); if (!c) return ''; const w = curWeight(), P = cutPlan(c.start, c.target, c.startDate, c.date);
  const exp = Math.max(c.target, c.start - P.perW * (daysBetween(c.startDate, todayStr()) / 7)), d = w - exp;
  return '<section class="card cutc"><div class="row sp"><div><span class="eyebrow3">Weight plan · ' + c.target + ' kg by ' + esc(niceDate(c.date).replace(/^\w+ /, '')) + '</span><b class="ld-n">' + (w || '—') + '</b><span class="mut small"> kg now</span></div><button class="sm fit" data-act="cutopen">Edit</button></div><p class="small" style="margin:8px 0 0">Plan for today: ' + exp.toFixed(1) + ' kg. ' + (!w ? '' : d > 0.5 ? '<span class="warnt">' + d.toFixed(1) + ' kg behind.</span> Tighten up snacks and late eating.' : d < -0.7 ? '<span class="warnt">Going faster than planned.</span> Eat a bit more to protect muscle.' : '<span class="okt">On track.</span>') + '</p></section>';
}

/* ======================= 74. what works for you ======================= */
function whatWorks() {
  const W = D().whoop, t = todayStr(), out = [], avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const same = (test, metric) => { const y = [], n = []; W.forEach((w) => { if (!Number(w[metric])) return; const r = test(w); if (r === null) return; (r ? y : n).push(Number(w[metric])); }); return y.length >= 3 && n.length >= 3 ? avg(y) - avg(n) : null; };
  const nextd = (test, metric) => same((w) => test(dateAdd(w.date, -1)), metric);
  const ck = (ds) => D().logs.Checkin.find((c) => c.date === ds);
  const F = [
    ['sleeping 8+ hours', same((w) => (Number(w.sleep_hours) >= 8 ? true : Number(w.sleep_hours) < 7 ? false : null), 'recovery'), 'recovery', '%'],
    ['a hard workout the day before', nextd((ds) => { const s = logs('WorkoutLog', ds).find((l) => l.status === 'done'); return s ? (sessionFor(ds) || { p: {} }).p.load === 'Hard' : null; }, 'recovery'), 'recovery', '%'],
    ['coffee after 16:00', nextd((ds) => ((D().habits || []).some((h) => h.date === ds) ? !!lateCaffeine(ds) : null), 'sleep_perf'), 'sleep score', '%'],
    ['eating after 21:00', nextd((ds) => (D().logs.MealLog.some((r) => r.date === ds) ? lateMeal(ds) : null), 'sleep_perf'), 'sleep score', '%'],
    ['a high-stress day', nextd((ds) => (ck(ds) && ck(ds).stress ? Number(ck(ds).stress) >= 4 : null), 'recovery'), 'recovery', '%'],
    ['alcohol', nextd((ds) => ((D().habits || []).some((h) => h.date === ds) ? (D().habits || []).some((h) => h.date === ds && h.kind === 'alcohol') : null), 'hrv'), 'HRV', ' ms']
  ];
  F.forEach(([what, d, m, u]) => { if (d !== null && Math.abs(d) >= 3) out.push({ what, d, m, u }); });
  return out.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
}
function whatWorksCard() {
  const L = whatWorks();
  return '<h2>What works for you</h2><div class="card ww">' + (L.length ? '<ul class="wwl">' + L.slice(0, 5).map((x) => '<li class="' + (x.d > 0 ? 'up' : 'dn') + '"><b>' + (x.d > 0 ? '+' : '') + Math.round(x.d) + x.u + '</b><span>' + esc(x.m[0].toUpperCase() + x.m.slice(1)) + ' after ' + esc(x.what) + '</span></li>').join('') + '</ul>' : '<p class="mut small" style="margin:0">Keep logging sleep, coffee, stress and workouts. After a few weeks I show what really moves your recovery.</p>') + '</div>';
}

/* ======================= 77. tip of the day ======================= */
const TIPS = {
  run: ['Most of your runs should feel easy enough to talk. Speed comes from the few hard ones.', 'The week before a race, cut volume by about 40% and keep a little speed.', 'Practise your race-day breakfast before a long run, never for the first time on race day.', 'Run the first kilometre of a race 5-10 s slower than goal pace.', 'Strides after easy runs (4 x 80 m) keep your legs quick without tiring you.', 'Long runs: take water or dates every 40-45 min once you go past 75 min.'],
  fast: ['Break your fast with water and dates, then a proper protein meal 15-20 min later.', 'Add salt to iftar food on training days to hold on to water.', 'At suhoor, eat slow carbs and protein: oats, eggs, yogurt.', 'Train hard after iftar, not before it, while fasting.'],
  all: ['Protein at every meal makes hitting your target easy: about 40-50 g each.', 'Sleep is your best supplement: same bedtime every night, even weekends.', 'Get morning sunlight for 10 minutes: it sets your body clock for better sleep.', 'Stop caffeine 8 hours before bed.', 'Weigh yourself daily but watch the 7-day average, not the daily number.', 'Add weight or reps every week, but only when every set was clean.', 'If recovery is red, a walk and mobility beats a hard session.', 'Creatine works only if you take it every day, timing doesn’t matter.', 'Warm up the exact movement you will train: lighter sets of the first lift.', 'A cool, dark room (18-20°C) gives deeper sleep.', 'Hydrate early: half your water before 14:00 means fewer night wake-ups.', 'Fibre and protein first, carbs last in a meal keeps energy steadier.', 'Write down one thing that went well in every workout.', 'Two hard days in a row is OK only if sleep was good.', 'Grip strength is trainable: hang from the bar at the end of pull days.', 'Long exhale breathing (4 s in, 8 s out) calms you down in two minutes.', 'Magnesium in the evening can help you fall asleep.', 'Hit your step count on rest days: easy walking speeds up recovery.', 'For HYROX, practise wall balls and lunges tired, after running.', 'Film your lifts sometimes: you will spot form issues you can’t feel.']
};
function tipCard() {
  const ev = nextRace(), pool = fasting() ? TIPS.fast.concat(TIPS.all) : ev && daysBetween(todayStr(), ev.date) <= 45 ? TIPS.run.concat(TIPS.all) : TIPS.all;
  const doy = Math.floor((new Date(todayStr() + 'T12:00:00Z') - new Date(todayStr().slice(0, 4) + '-01-01T12:00:00Z')) / 864e5);
  return '<p class="tip">' + ICON(BI.bulb) + '<span><b>Tip of the day</b>' + esc(pool[doy % pool.length]) + '</span></p>';
}

/* ======================= actions ======================= */
document.addEventListener('click', (ev) => { const b = ev.target.closest && ev.target.closest('#toast [data-undo]'); if (b) { ev.preventDefault(); undoNow(); } });
COACH_KEEP.push('skstep', 'pwmove', 'rtrpe', 'rten', 'rtsave', 'pfate', 'fastsave', 'fastoff', 'shareon', 'sharecopy', 'sharesend', 'shareoff', 'excues', 'adjmode', 'adjmin', 'mobsc', 'mobsave', 'cutcalc', 'cutsave', 'cutoff', 'shoesave', 'shoeret');
Object.assign(COACH_ACTS, {
  instab: (el) => { S.insTab = el.dataset.t; render(); window.scrollTo(0, 0); },
  setsleep: async () => { const v = await form('Sleep you need', [{ label: 'Hours a night (5 to 11)', value: D().cfg.sleep_need || '8', attrs: 'inputmode="decimal"', check: (x) => (Number(x) >= 5 && Number(x) <= 11 ? '' : 'Use 5 to 11 hours') }]); if (v) setCfg('sleep_need', String(Number(v[0]))); },
  setprot: async () => { const v = await form('Protein a day', [{ label: 'Grams (50 to 400). Leave empty to use your plan', value: D().cfg.protein_target || '', attrs: 'inputmode="numeric"', check: (x) => (!x || (Number(x) >= 50 && Number(x) <= 400) ? '' : 'Use 50 to 400 g') }]); if (v) setCfg('protein_target', v[0] ? String(Math.round(Number(v[0]))) : ''); },
  dlacc: () => { const n = writeWeek('deload', 'deload'); setCfg('last_deload', todayStr()); toast('Lighter week set: ' + n + ' sessions changed', 3500); },
  dlrej: () => { LS.setItem('deload-dis', todayStr()); render(); },
  easeacc: () => { const n = writeWeek('ease', 'ease back'); toast('This week is lighter: ' + n + ' sessions', 3500); },
  easerej: () => { LS.setItem('ease-dis', todayStr()); render(); },
  skopen: (el) => infoSheet(el.dataset.k, skillBody(el.dataset.k), 'sk'),
  skstep: (el) => {
    const k = el.dataset.k, i = el.dataset.i, on = skillDone(k).indexOf(Number(i)) >= 0;
    send(on ? { action: 'del', table: 'Skills', row: { skill: k, step: i } } : { action: 'log', table: 'Skills', row: { skill: k, step: i, date: todayStr() } });
    keepScroll('sk', skillBody(k)); if (!on && skillDone(k).length === SKILLS[k].length) confetti();
  },
  pwopen: () => pwOpen(),
  pwmove: (el) => { const d = el.dataset.d; if (!S.pwSel) S.pwSel = d; else if (S.pwSel === d) S.pwSel = null; else { pwSwap(S.pwSel, d); S.pwSel = null; } keepScroll('pw', pwBody()); },
  rtrpe: (el) => { S.rate.rpe = Number(el.dataset.n); keepScroll('rate', rateBody()); },
  rten: (el) => { S.rate.energy = el.dataset.e; keepScroll('rate', rateBody()); },
  rtsave: () => { const R0 = S.rate, row = Object.assign({}, logs('WorkoutLog', R0.date).find((l) => l.session === R0.session) || {}, { date: R0.date, session: R0.session, status: 'done', rpe: String(R0.rpe), energy: R0.energy || '' }); send({ action: 'log', table: 'WorkoutLog', row }); closeSheets(); },
  shoeopen: (el) => { const s = D().shoes.find((x) => x.id === el.dataset.id); if (s) infoSheet(s.name, '<p class="mut small">' + Math.round(s.km) + ' km · added ' + esc(niceDate(s.added)) + (Number(s.start_km) ? ' with ' + s.start_km + ' km already on them' : '') + '. Most running shoes last 600–800 km.</p><button class="r" style="width:100%;margin-top:16px" data-act="shoeret" data-id="' + esc(s.id) + '">Retire these shoes</button>', 'shoe'); },
  shoeadd: () => infoSheet('Add running shoes', '<label class="mut small" for="shn">Name</label><input id="shn" maxlength="40" placeholder="e.g. Nike Pegasus 41"><div class="row two"><div><label class="mut small" for="shd">Started using</label><input type="date" id="shd" value="' + todayStr() + '"></div><div><label class="mut small" for="shk">Km already on them</label><input id="shk" type="number" inputmode="numeric" min="0" max="3000" value="0"></div></div><p class="err" id="sherr" role="alert"></p><button class="p" style="width:100%;margin-top:16px" data-act="shoesave">Save</button>', 'shoe'),
  shoesave: () => {
    const n = $('#shn').value.trim(), d = $('#shd').value, k = Number($('#shk').value) || 0;
    if (!n) { $('#sherr').textContent = 'Give them a name'; return; } if (!d || d > todayStr()) { $('#sherr').textContent = 'Pick a date up to today'; return; }
    const cur = (D().shoes || []).filter((s) => !s.retired);
    if (cur.length && confirm('Retire ' + cur.map((s) => s.name).join(', ') + '? Runs then count only on the new pair.')) cur.forEach((s) => send({ action: 'log', table: 'Shoes', row: Object.assign({}, s, { retired: dateAdd(d, -1) }) }));
    send({ action: 'log', table: 'Shoes', row: { id: 'sh' + Date.now(), name: n, added: d, retired: '', start_km: String(k), km: k } }); closeSheets(); toast('Shoes added. Pull to refresh to count your runs.', 3500);
  },
  shoeret: (el) => { const s = D().shoes.find((x) => x.id === el.dataset.id); send({ action: 'log', table: 'Shoes', row: Object.assign({}, s, { retired: todayStr() }) }); closeSheets(); },
  pfate: (el) => { const o = proteinOpts()[Number(el.dataset.i)]; if (!o) return; send({ action: 'log', table: 'MealLog', row: { date: todayStr(), slot: 'extra-' + Date.now(), status: 'extra', time: nowTime(), note: o[0].map((x) => x[0] + ' ' + x[1] + ' g protein').join('; '), extra_name: o[0].map((x) => x[0]).join(' + ').slice(0, 120), kcal: String(o[2]), protein: String(o[1]) } }); },
  fastopen: () => infoSheet('Fasting mode', fastBody(), 'fast'),
  fastsave: () => { const i = $('#fsi').value, s = $('#fss').value; if (!/^\d{2}:\d{2}$/.test(i) || !/^\d{2}:\d{2}$/.test(s)) { toast('Pick both times'); return; } setCfg('fasting', JSON.stringify({ iftar: i, suhoor: s })); closeSheets(); toast('Fasting mode on', 2500); },
  fastoff: () => { setCfg('fasting', ''); closeSheets(); toast('Fasting mode off'); },
  shareopen: () => infoSheet('Share your week', shareBody(), 'share'),
  shareon: async () => { S.shBusy = true; refreshSheet('share', shareBody()); try { const j = await call({ action: 'share_on' }); D().cfg.share_token = j.token; save(); } catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message); } S.shBusy = false; refreshSheet('share', shareBody()); },
  sharecopy: async () => { const u = $('#shurl').value; try { await navigator.clipboard.writeText(u); toast('Link copied'); } catch (e) { $('#shurl').select(); toast('Select and copy the link'); } },
  sharesend: () => { try { navigator.share({ title: 'My training week', url: $('#shurl').value }); } catch (e) { /* cancelled */ } },
  shareoff: async () => { if (!confirm('Turn the link off? Anyone who has it will lose access.')) return; try { await call({ action: 'share_off' }); D().cfg.share_token = ''; save(); refreshSheet('share', shareBody()); toast('Link turned off'); } catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message); } },
  excues: async () => { S.cueBusy = true; keepScroll('ex', exSheetBody()); try { const j = await call({ action: 'ex_cues', name: nk(S.ex.name) }); LS.setItem('cue-' + nk(S.ex.name), JSON.stringify({ tempo: j.tempo, cues: j.cues })); } catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message); } S.cueBusy = false; keepScroll('ex', exSheetBody()); },
  adjopen: (el) => { S.adj = { ds: el.dataset.d, mode: el.dataset.m || 'short', min: 30 }; infoSheet('Change this session', adjBody(), 'adj'); },
  adjmode: (el) => { S.adj.mode = el.dataset.m; keepScroll('adj', adjBody()); },
  adjmin: (el) => { S.adj.min = Number(el.dataset.n); keepScroll('adj', adjBody()); },
  adjuse: () => { const A = S.adj, s = sessionFor0(A.ds); send({ action: 'log', table: 'Overrides', row: { date: A.ds, session: s.p.session + (A.mode === 'short' ? ' (' + A.min + ' min)' : ' (supersets)'), load: s.p.load, time: s.p.time, daytype: s.p.daytype || (planFor(A.ds) || {}).daytype, details: A.plan, reason: A.mode === 'short' ? 'short on time' : 'superset' } }); toast('Session updated'); },
  mobopen: () => { S.mob = {}; infoSheet('Mobility check', mobBody(), 'mob'); },
  mobsc: (el) => { S.mob[el.dataset.n] = Number(el.dataset.s); keepScroll('mob', mobBody()); },
  mobsave: () => { const ds = todayStr(); MOB.forEach(([n]) => send({ action: 'log', table: 'Mobility', row: { date: ds, test: n, score: String(S.mob[n]) } })); closeSheets(); toast('Mobility ' + Object.values(S.mob).reduce((a, b) => a + b, 0) + ' / 10 saved', 3000); },
  cutopen: () => { S.cutV = null; infoSheet('Weight plan', cutBody(), 'cut'); },
  cutcalc: () => { S.cutV = { target: $('#cutt').value, date: $('#cutd').value }; keepScroll('cut', cutBody()); },
  cutsave: () => { const V = S.cutV, w = curWeight(); setCfg('cut', JSON.stringify({ target: Number(V.target), date: V.date, start: w, startDate: todayStr() })); closeSheets(); toast('Weight plan started'); },
  cutoff: () => { if (!confirm('Stop the weight plan?')) return; setCfg('cut', ''); closeSheets(); }
});


/* ===================== batch5.js ===================== */
/* Apex batch 5: patterns, plan vs reality, personal rules, predictions, consistency score, plan tuning,
   habit stacks, morning briefing, Plan B, short-night adjust, coach memory, meal rotation, supplement stock,
   exercise library, run workouts, heat/hill pace adjustment, strength standards, illness mode.
   Loaded after batch4.js, before app.js. */
const B5 = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  book: '<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 20a4 4 0 0 1 0-8h10"/>',
  runr: '<path d="M13 4a2 2 0 1 1 0 .01M7 21l3-6 3 2v4M10 15l1-5 4 2 3-1M8 11l3-2"/>',
  therm: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>',
  link: '<path d="M9 15l6-6M10 6l1-1a4 4 0 0 1 6 6l-1 1M14 18l-1 1a4 4 0 0 1-6-6l1-1"/>',
  box: '<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>'
};
// 120 days of history from the sheet, merged with anything logged on this phone since
function H() {
  const h = D().hist || {}, L = D().logs;
  const m = (a, b, k) => { const seen = new Set(), out = []; (b || []).concat(a || []).forEach((r) => { const id = k.map((x) => r[x]).join('|'); if (!seen.has(id)) { seen.add(id); out.push(r); } }); return out; };
  return { meals: m(h.meals, L.MealLog, ['date', 'slot']), workouts: m(h.workouts, L.WorkoutLog.filter((r) => !PART_RE.test(r.session || '')), ['date', 'session']), water: m(h.water, L.WaterLog, ['date']), overrides: m(h.overrides, D().overrides, ['date']), whoop: m(h.whoop, D().whoop, ['date']) };
}
UKEYS.Stock = ['name']; UKEYS.CoachMemory = ['id'];
const ulist0 = ulist;
ulist = function (t) { const d = S.data; return t === 'Stock' ? d.stock : t === 'CoachMemory' ? d.memory : ulist0(t); };
const avgN = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const weekdayOf = (ds) => new Date(ds + 'T12:00:00Z').getUTCDay();

/* ======================= 83. consistency score ======================= */
function weekScore(sunDs) {
  const t = todayStr(), Hh = H(), need = Number(D().cfg.sleep_need) || 8;
  let pl = 0, dn = 0, mp = 0, me = 0, wHit = 0, days = 0; const sl = [];
  for (let i = 0; i < 7; i++) {
    const ds = dateAdd(sunDs, i); if (ds > t) break; days++;
    const s = sessionFor0(ds), done = (Hh.workouts || []).some((w) => w.date === ds && w.status === 'done') || D().strava.some((a) => a.date === ds);
    if (s && s.p.load !== 'Rest' && s.p.load !== 'Recovery') { pl++; if (done) dn++; }
    const p = dayPlan(ds); if (p) mealsFor(p.daytype).filter((m) => Number(m.kcal) > 0).forEach((m) => { mp++; if ((Hh.meals || []).some((r) => r.date === ds && r.slot === m.slot && (r.status === 'ate' || r.status === 'swap'))) me++; });
    const wl = (Hh.water || []).find((w) => w.date === ds), tg = weekdayOf(ds) === 6 ? Number(D().cfg.water_target_rest) || 3500 : Number(D().cfg.water_target_train) || 4500;
    if (wl && Number(wl.ml) >= tg) wHit++;
    const w = Hh.whoop.find((x) => x.date === ds); if (w && Number(w.sleep_hours)) sl.push(Number(w.sleep_hours));
  }
  if (!days) return null;
  const tr = pl ? dn / pl : 1, fo = mp ? me / mp : 0, sp = sl.length ? Math.min(1, avgN(sl) / need) : 0, wa = wHit / days;
  return { score: Math.round(35 * tr + 25 * fo + 20 * sp + 20 * wa), tr, fo, sp, wa, days, sun: sunDs };
}
function sundayOf(ds) { return dateAdd(ds, -weekdayOf(ds)); }
function consistencyCard() {
  const t = todayStr(), W = []; for (let k = 7; k >= 0; k--) { const w = weekScore(dateAdd(sundayOf(t), -7 * k)); if (w) W.push(w); }
  const cur = W[W.length - 1]; if (!cur) return '';
  const prev = W[W.length - 2], parts = [['Training', cur.tr], ['Food', cur.fo], ['Sleep', cur.sp], ['Water', cur.wa]], weak = parts.slice().sort((a, b) => a[1] - b[1])[0];
  return '<h2>This week\'s habits</h2><section class="card cons"><div class="row sp"><div><b class="ld-n">' + cur.score + '</b><span class="mut small"> / 100 this week</span></div>' + (prev ? '<span class="small ' + (cur.score >= prev.score ? 'okt' : 'warnt') + '"><b>' + (cur.score >= prev.score ? '+' : '') + (cur.score - prev.score) + '</b> vs last week</span>' : '') + '</div>' +
    '<div class="cbars" role="img" aria-label="Scores of the last ' + W.length + ' weeks: ' + W.map((w) => w.score).join(', ') + '">' + W.map((w, i) => '<i style="height:' + Math.max(6, w.score) + '%" class="' + (i === W.length - 1 ? 'now' : '') + '"></i>').join('') + '</div>' +
    '<div class="cparts">' + parts.map(([n, v]) => '<div><span>' + n + '</span><b>' + Math.round(v * 100) + '%</b></div>').join('') + '</div>' +
    '<p class="fb-next"><b>Biggest lever</b>' + esc({ Training: 'Do the sessions you planned; even a short version counts.', Food: 'Log your meals as you eat them; swaps count as on plan.', Sleep: 'Get to bed on time: your sleep need is ' + (Number(D().cfg.sleep_need) || 8) + ' h.', Water: 'Hit your water target: half of it before 14:00.' }[weak[0]]) + '</p></section>';
}

/* ======================= 79. patterns ======================= */
function patterns() {
  const t = todayStr(), Hh = H(), out = [], DN = DOW_L;
  const logDays = [...new Set((Hh.meals || []).map((r) => r.date))].filter((d) => d < t && d >= dateAdd(t, -56));
  if (logDays.length >= 8) {
    const miss = {};
    logDays.forEach((ds) => { const p = dayPlan(ds); if (!p) return; mealsFor(p.daytype).filter((m) => Number(m.kcal) > 0).forEach((m) => { const k = weekdayOf(ds) + '|' + m.name; const r = (Hh.meals || []).find((x) => x.date === ds && x.slot === m.slot); const o = miss[k] = miss[k] || { n: 0, m: 0 }; o.n++; if (!r || r.status === 'skipped') o.m++; }); });
    const worst = Object.keys(miss).map((k) => Object.assign({ k }, miss[k])).filter((x) => x.n >= 3 && x.m / x.n >= 0.5).sort((a, b) => b.m / b.n - a.m / a.n)[0];
    if (worst) { const [d, n] = worst.k.split('|'); out.push({ w: worst.m / worst.n, t: 'You miss <b>' + esc(n) + '</b> on ' + worst.m + ' of ' + worst.n + ' ' + DN[d] + 's.', fix: 'Move it to a time that fits ' + DN[d] + 's, or swap it for something quicker.' }); }
  }
  const done = (Hh.workouts || []).filter((w) => w.status === 'done');
  if (done.length >= 5) {
    const by = {}; for (let i = 1; i <= 56; i++) { const ds = dateAdd(t, -i), s = sessionFor0(ds); if (!s || s.p.load === 'Rest' || s.p.load === 'Recovery') continue; const k = weekdayOf(ds) + '|' + s.p.session; const o = by[k] = by[k] || { n: 0, d: 0 }; o.n++; if (didTrain(ds)) o.d++; }
    const w = Object.keys(by).map((k) => Object.assign({ k }, by[k])).filter((x) => x.n >= 3 && x.d / x.n <= 0.6).sort((a, b) => a.d / a.n - b.d / b.n)[0];
    if (w) { const [d, n] = w.k.split('|'); out.push({ w: 1 - w.d / w.n, t: '<b>' + esc(n) + '</b> on ' + DN[d] + ' is your most skipped session: done ' + w.d + ' of ' + w.n + ' times.', fix: 'Try it on another day, or use the Short on time version.' }); }
    const hrs = done.filter((x) => /^\d{2}:/.test(x.time)).map((x) => Number(x.time.slice(0, 2)));
    if (hrs.length >= 5) { const b = {}; hrs.forEach((h) => { const k = h < 10 ? 'morning (before 10)' : h < 16 ? 'midday (10–16)' : 'evening (after 16)'; b[k] = (b[k] || 0) + 1; }); const top = Object.keys(b).sort((x, y) => b[y] - b[x])[0]; out.push({ w: b[top] / hrs.length * 0.6, t: 'You finish most workouts in the <b>' + top + '</b>: ' + b[top] + ' of ' + hrs.length + '.', fix: '' }); }
  }
  const Wh = (Hh.whoop || []).filter((w) => Number(w.recovery) > 0);
  if (Wh.length >= 21) {
    const by = [0, 1, 2, 3, 4, 5, 6].map((d) => avgN(Wh.filter((w) => weekdayOf(w.date) === d).map((w) => Number(w.recovery)))), all = avgN(Wh.map((w) => Number(w.recovery)));
    const lo = by.reduce((b, v, i) => (v != null && (b < 0 || v < by[b]) ? i : b), -1);
    if (lo >= 0 && all - by[lo] >= 5) out.push({ w: (all - by[lo]) / 30, t: 'Your recovery is lowest on <b>' + DN[lo] + 's</b>: ' + Math.round(by[lo]) + '% vs ' + Math.round(all) + '% normally.', fix: 'Look at the day before: ' + DN[(lo + 6) % 7] + ' sleep, training or food.' });
    const sl = [0, 1, 2, 3, 4, 5, 6].map((d) => avgN(Wh.filter((w) => weekdayOf(w.date) === d && Number(w.sleep_hours)).map((w) => Number(w.sleep_hours)))), sa = avgN(Wh.filter((w) => Number(w.sleep_hours)).map((w) => Number(w.sleep_hours)));
    const sw = sl.reduce((b, v, i) => (v != null && (b < 0 || v < sl[b]) ? i : b), -1);
    if (sw >= 0 && sa - sl[sw] >= 0.4) out.push({ w: (sa - sl[sw]) / 2, t: 'You sleep least on <b>' + DN[(sw + 6) % 7] + ' nights</b>: ' + sl[sw].toFixed(1) + ' h vs ' + sa.toFixed(1) + ' h.', fix: 'Set an earlier bedtime that night.' });
  }
  const wd = (Hh.water || []); if (wd.length >= 14) { const tg = Number(D().cfg.water_target_train) || 4500, by = [0, 1, 2, 3, 4, 5, 6].map((d) => { const L = wd.filter((w) => weekdayOf(w.date) === d); return L.length >= 2 ? L.filter((w) => Number(w.ml) >= tg * 0.9).length / L.length : null; }); const lo = by.reduce((b, v, i) => (v != null && (b < 0 || v < by[b]) ? i : b), -1); if (lo >= 0 && by[lo] <= 0.4) out.push({ w: 0.4 - by[lo] + 0.2, t: 'Water is hardest on <b>' + DN[lo] + 's</b>: target reached ' + Math.round(by[lo] * 100) + '% of the time.', fix: 'Fill two bottles in the morning on ' + DN[lo] + 's.' }); }
  return out.sort((a, b) => b.w - a.w);
}
function patternsCard() {
  const P = patterns();
  return '<h2>Your patterns</h2><div class="card pats">' + (P.length ? P.slice(0, 5).map((p) => '<div class="pat"><p>' + p.t + '</p>' + (p.fix ? '<span class="mut small">' + esc(p.fix) + '</span>' : '') + '</div>').join('') : '<p class="mut small" style="margin:0">Patterns appear after 2–3 weeks of logging meals, workouts and water. The more you log, the clearer they get.</p>') + '</div>';
}

/* ======================= 80. plan vs reality ======================= */
function planReality() {
  const t = todayStr(), Hh = H(), S0 = {}, M0 = {};
  for (let i = 1; i <= 28; i++) {
    const ds = dateAdd(t, -i), s = sessionFor0(ds);
    if (s && s.p.load !== 'Rest' && s.p.load !== 'Recovery') { const o = S0[s.p.session] = S0[s.p.session] || { n: 0, d: 0, s: 0, mv: 0 }; o.n++; const w = (Hh.workouts || []).find((x) => x.date === ds); if (w && w.status === 'done' || didTrain(ds)) o.d++; else if (w && w.status === 'skipped') o.s++; if ((Hh.overrides || []).some((x) => x.date === ds && /moved|short|superset|plan b|deload|ease|night/.test(x.reason || ''))) o.mv++; }
    const p = dayPlan(ds); if (p) mealsFor(p.daytype).filter((m) => Number(m.kcal) > 0).forEach((m) => { const o = M0[m.name] = M0[m.name] || { n: 0, a: 0, sw: 0, sk: 0 }; o.n++; const r = (Hh.meals || []).find((x) => x.date === ds && x.slot === m.slot); if (r && r.status === 'ate') o.a++; else if (r && r.status === 'swap') o.sw++; else if (r && r.status === 'skipped') o.sk++; });
  }
  return { S0, M0 };
}
function realityCard() {
  const R0 = planReality(), bar = (parts) => '<span class="rbar">' + parts.map(([v, c]) => '<i class="' + c + '" style="width:' + v + '%"></i>').join('') + '</span>';
  const ses = Object.keys(R0.S0).map((k) => { const o = R0.S0[k]; return '<div class="rr"><b>' + esc(k) + '</b>' + bar([[o.d / o.n * 100, 'ok'], [o.s / o.n * 100, 'sk']]) + '<span class="mut small">' + o.d + ' of ' + o.n + ' done' + (o.s ? ' · ' + o.s + ' skipped' : '') + (o.mv ? ' · ' + o.mv + ' changed' : '') + '</span></div>'; }).join('');
  const mea = Object.keys(R0.M0).map((k) => { const o = R0.M0[k]; return '<div class="rr"><b>' + esc(k) + '</b>' + bar([[o.a / o.n * 100, 'ok'], [o.sw / o.n * 100, 'sw'], [o.sk / o.n * 100, 'sk']]) + '<span class="mut small">' + o.a + ' as planned · ' + o.sw + ' swapped · ' + o.sk + ' skipped · ' + (o.n - o.a - o.sw - o.sk) + ' not logged</span></div>'; }).join('');
  return '<h2>Plan vs reality · 4 weeks</h2><div class="card real">' + (ses || mea ? '<p class="lbl" style="margin-top:0">Sessions</p>' + ses + '<p class="lbl">Meals</p>' + mea + '<p class="mut small" style="margin:10px 0 0"><i class="lg ok"></i> as planned <i class="lg sw"></i> swapped <i class="lg sk"></i> skipped</p>' : '<p class="mut small" style="margin:0">Shows how often you follow each session and meal once you have a few weeks of logs.</p>') + '</div>';
}

/* ======================= 81. personal rules ======================= */
function rulesList() { try { return JSON.parse(D().cfg.rules || '[]'); } catch (e) { return []; } }
function ruleCandidates() {
  const C = [], W = whatWorks();
  W.forEach((x) => {
    if (x.what === 'sleeping 8+ hours' && x.d >= 5) C.push(['sleep8', 'Get 8+ hours of sleep before hard days', 'Your recovery is ' + Math.round(x.d) + '% higher after 8 h.']);
    if (x.what === 'coffee after 16:00' && x.d <= -4) C.push(['coffee16', 'No coffee after 16:00', 'Late coffee costs you ' + Math.abs(Math.round(x.d)) + '% sleep score.']);
    if (x.what === 'eating after 21:00' && x.d <= -4) C.push(['late21', 'Last meal before 21:00', 'Late meals cost you ' + Math.abs(Math.round(x.d)) + '% sleep score.']);
    if (x.what === 'alcohol' && x.d <= -5) C.push(['alc', 'No alcohol before hard sessions', 'Your HRV drops ' + Math.abs(Math.round(x.d)) + ' ms the next day.']);
    if (x.what === 'a hard workout the day before' && x.d <= -8) C.push(['hard2', 'Never two hard days in a row', 'Recovery drops ' + Math.abs(Math.round(x.d)) + '% after a hard day.']);
    if (x.what === 'a high-stress day' && x.d <= -6) C.push(['stress', 'On stressful days, make the session moderate', 'Stress costs you ' + Math.abs(Math.round(x.d)) + '% recovery.']);
  });
  patterns().forEach((p, i) => { if (/most skipped session/.test(p.t)) C.push(['skip' + i, p.fix.replace(/^Try it/, 'Move your most skipped session to a better day'), p.t.replace(/<[^>]+>/g, '')]); });
  return C;
}
function rulesCard() {
  const R0 = rulesList(), on = R0.filter((r) => r.status === 'on'), cand = ruleCandidates().filter((c) => !R0.some((r) => r.id === c[0]));
  const enough = (H().whoop || []).length >= 28;
  return '<h2>Your rules</h2><div class="card rules">' + (on.length ? on.map((r) => '<div class="rule on"><span>✓</span><p>' + esc(r.text) + '</p><button class="icon-btn x" data-act="ruleoff" data-id="' + esc(r.id) + '" aria-label="Remove rule: ' + esc(r.text) + '">✕</button></div>').join('') : '') +
    (cand.length ? '<p class="lbl"' + (on.length ? '' : ' style="margin-top:0"') + '>Suggested from your data</p>' + cand.map((c) => '<div class="rule"><div><b>' + esc(c[1]) + '</b><span class="mut small">' + esc(c[2]) + '</span></div><div class="row"><button class="g sm" data-act="ruleon" data-id="' + c[0] + '" data-t="' + esc(c[1]) + '">Keep</button><button class="sm" data-act="ruleno" data-id="' + c[0] + '" data-t="' + esc(c[1]) + '">No</button></div></div>').join('') : '') +
    (!on.length && !cand.length ? '<p class="mut small" style="margin:0">' + (enough ? 'No clear rules yet: nothing in your data stands out strongly. Keep logging.' : 'After about 4–8 weeks of data I suggest rules that are true for you. Your coach uses the ones you keep.') + '</p>' : '') + '</div>';
}

/* ======================= 82. predictions ======================= */
function slope(pts) { const n = pts.length; if (n < 3) return null; const mx = avgN(pts.map((p) => p[0])), my = avgN(pts.map((p) => p[1])); let a = 0, b = 0; pts.forEach(([x, y]) => { a += (x - mx) * (y - my); b += (x - mx) * (x - mx); }); return b ? a / b : null; }
function predictions() {
  const t = todayStr(), out = [];
  const B = D().logs.Body.filter((b) => Number(b.weight) > 0 && b.date >= dateAdd(t, -42));
  if (B.length >= 4 && daysBetween(B[0].date, B[B.length - 1].date) >= 14) {
    let s = slope(B.map((b) => [daysBetween(B[0].date, b.date), Number(b.weight)])) * 7, now = curWeight();
    s = Math.max(-now * 0.01, Math.min(now * 0.01, s));
    out.push(['Weight in 8 weeks', (now + s * 8).toFixed(1) + ' kg', (s >= 0 ? '+' : '') + s.toFixed(2) + ' kg a week right now']);
  }
  const runs = D().strava.filter((a) => /run/i.test(a.type) && Number(a.distance_km) >= 5 && Number(a.moving_min) > 0);
  if (runs.length) {
    const best = runs.map((a) => ({ a, hm: Number(a.moving_min) * 60 * Math.pow(21.0975 / Number(a.distance_km), 1.06) })).sort((x, y) => x.hm - y.hm)[0];
    const ev = nextRace(), g = ev && secOf(ev.goal);
    out.push(['Half marathon today', fmtSec(best.hm), 'From your ' + best.a.distance_km + ' km run on ' + niceDate(best.a.date).replace(/^\w+ /, '') + (g ? (best.hm <= g ? ' · on track for ' + ev.goal : ' · ' + fmtSec(best.hm - g) + ' slower than your goal') : '')]);
  }
  const lifts = {}; (D().sets || []).filter((s) => Number(s.kg) > 0 && s.date >= dateAdd(t, -56)).forEach((s) => { const k = nk(s.exercise), e = Number(s.kg) * (1 + Number(s.reps) / 30); const L = lifts[k] = lifts[k] || {}; L[s.date] = Math.max(L[s.date] || 0, e); });
  const best = Object.keys(lifts).map((k) => ({ k, d: Object.keys(lifts[k]).sort() })).filter((x) => x.d.length >= 3).sort((a, b) => b.d.length - a.d.length)[0];
  if (best) {
    const pts = best.d.map((d) => [daysBetween(best.d[0], d), lifts[best.k][d]]), now = pts[pts.length - 1][1];
    let s = slope(pts) * 7; s = Math.max(0, Math.min(now * 0.015, s));
    out.push([best.k.replace(/\b\w/, (c) => c.toUpperCase()) + ' in 12 weeks', Math.round(now + s * 12) + ' kg (1 rep max)', 'Now about ' + Math.round(now) + ' kg · +' + s.toFixed(1) + ' kg a week']);
  }
  return out;
}
function predictCard() {
  const P = predictions();
  return '<h2>If you keep going like this</h2><div class="card list">' + (P.length ? P.map((p) => '<div class="li"><span class="li-main"><b>' + esc(p[0]) + '</b><span class="mut small">' + esc(p[2]) + '</span></span><span class="li-end"><b class="pr-v">' + esc(p[1]) + '</b></span></div>').join('') : '<p class="empty-note">Log your weight weekly, runs on Strava and your sets, and I forecast where you’ll be.</p>') + '</div><p class="foot">Estimates from your own trend, capped at realistic rates. Real progress is rarely a straight line.</p>';
}

/* ======================= 86. plan tuning ======================= */
function tuneDue() { const c = D().cfg, st = c.program_start; return st && daysBetween(st, todayStr()) >= 28 && (!c.last_tune || daysBetween(c.last_tune, todayStr()) >= 28); }
function tuneCard() {
  if (!tuneDue() || !D().ai) return '';
  return '<button class="card eoc" data-act="tuneopen"><span class="li-ic" style="background:var(--accFill)">' + ICON(CI.spark) + '</span><span><b>Monthly plan check</b><span class="mut small">See what you really did and fine-tune your plan</span></span><span class="chev">›</span></button>';
}
function tuneBody() {
  const T = S.tune;
  if (T.busy) return '<div class="gen"><div class="gen-orb" aria-hidden="true">' + ICON(CI.spark) + '</div><h3>Looking at your last 6 weeks…</h3><p class="mut small">About 20 seconds.</p></div>';
  if (T.err) return '<p class="err">' + esc(T.err) + '</p>';
  if (!T.res) return '';
  const R0 = T.res, n = R0.recs.filter((r) => T.dec[r.id] === 'accept' && r.type !== 'note').length;
  return '<p class="psum">' + esc(R0.summary) + '</p>' + R0.recs.map((r) => { const dv = T.dec[r.id]; return '<div class="rec' + (dv ? ' ' + dv : '') + '"><b>' + esc(r.title) + '</b><p class="mut small">' + esc(r.reason) + '</p>' +
    (r.type === 'swap' ? '<div class="ba"><div><span>Now</span>' + esc(r.a) + ' ↔ ' + esc(r.b) + '</div></div>' : r.type === 'edit' ? '<div class="ba"><div><span>Now (' + esc(r.day) + ')</span>' + esc(r.find) + '</div><span class="ba-ar" aria-hidden="true">→</span><div class="after"><span>Suggested</span>' + esc(r.replace) + '</div></div>' : '') +
    (r.type === 'note' ? '' : '<div class="row"><button class="g' + (dv === 'accept' ? ' sel' : '') + '" aria-pressed="' + (dv === 'accept') + '" data-act="tunedec" data-id="' + r.id + '" data-v="accept">' + (dv === 'accept' ? '✓ Accepted' : 'Accept') + '</button><button class="r' + (dv === 'reject' ? ' sel' : '') + '" aria-pressed="' + (dv === 'reject') + '" data-act="tunedec" data-id="' + r.id + '" data-v="reject">' + (dv === 'reject' ? '✕ Rejected' : 'Reject') + '</button></div>') + '</div>'; }).join('') +
    '<p class="mut small" style="margin-top:12px">Your current plan is copied to the PlanArchive tab before any change.</p><button class="p" style="width:100%;margin-top:12px" data-act="tuneapply"' + (n ? '' : ' disabled') + '>' + (n ? 'Apply ' + n + ' change' + (n > 1 ? 's' : '') : 'Accept a change to apply it') + '</button>';
}

/* ======================= 90. habit stacks ======================= */
const ANCH = [['wake', 'Morning protocol'], ['m1', 'Meal 1'], ['m2', 'Meal 2'], ['m3', 'Meal 3'], ['m4', 'Meal 4'], ['workout', 'Workout done'], ['mg', 'Magnesium']];
function stacks() { try { return JSON.parse(D().cfg.stacks || '[]'); } catch (e) { return []; } }
function stackCard() {
  const L = stacks(); if (!L.length) return '';
  const got = suppsTaken(todayStr());
  return '<h2>Habit stacks</h2><div class="supp stacks">' + L.map((s) => { const on = got.indexOf(s.habit) >= 0, a = (ANCH.find((x) => x[0] === s.anchor) || [0, s.anchor])[1]; return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="supp" data-n="' + esc(s.habit) + '">' + (on ? '✓ ' : '') + esc(s.habit) + '<small>after ' + esc(a) + '</small></button>'; }).join('') + '</div>';
}
function stackBody() {
  const L = stacks();
  return '<p class="mut small">Tie a new habit to something you already do every day. "After Meal 1, I take creatine." When you tick the first one, Apex reminds you of the second.</p>' +
    (L.length ? '<div class="card list flat">' + L.map((s) => '<div class="li"><span class="li-main"><b>' + esc(s.habit) + '</b><span class="mut small">after ' + esc((ANCH.find((x) => x[0] === s.anchor) || [0, s.anchor])[1]) + '</span></span><button class="icon-btn x" data-act="stackdel" data-id="' + esc(s.id) + '" aria-label="Remove ' + esc(s.habit) + '">✕</button></div>').join('') + '</div>' : '') +
    '<p class="lbl">Add one</p><label class="mut small" for="sta">After</label><select id="sta">' + ANCH.map(([k, l]) => '<option value="' + k + '">' + l + '</option>').join('') + '</select><label class="mut small" for="sth">I will</label><input id="sth" maxlength="60" placeholder="e.g. take creatine, stretch 5 min, read 10 pages"><button class="p" style="width:100%;margin-top:16px" data-act="stackadd">Add stack</button>';
}
function stackNudge(anchor) {
  const L = stacks().filter((s) => s.anchor === anchor && suppsTaken(todayStr()).indexOf(s.habit) < 0);
  if (L.length) setTimeout(() => toast('Habit stack: now ' + L.map((s) => s.habit).join(' + '), 4500), 900);
}

/* ======================= 92. morning briefing ======================= */
function briefCard() {
  const h = local().hour; if (h < 4 || h >= 12 || LS.getItem('brief-' + todayStr())) return '';
  const ds = todayStr(), ses = sessionFor(ds), w = whoopFor(ds), p = ses ? ses.p : planFor(ds), first = p ? mealsFor(p.daytype).find((m) => Number(m.kcal) > 0 && !logs('MealLog', ds).some((r) => r.slot === m.slot)) : null;
  const rule = rulesList().filter((r) => r.status === 'on'), focus = rule.length ? rule[new Date(ds).getDate() % rule.length].text : 'Protein at every meal and water before 14:00.';
  const rec = w && Number(w.recovery) ? Number(w.recovery) : null, RST = restInfo(ds, ses), off = RST && RST.kind !== 'recovery';
  const body = rec == null ? '' : off ? (rec < 34 ? ' · sleep early tonight' : rec < 67 ? ' · take it easy' : ' · enjoy the rest') : RST ? ' · keep it easy' : (rec < 34 ? ' · take it easy' : rec < 67 ? ' · go a bit lighter' : ' · good to push');
  return '<section class="card brief"><div class="row sp"><span class="eyebrow3">' + ICON(B5.sun) + ' Your morning briefing</span><button class="txt fit" data-act="briefx" aria-label="Hide the briefing for today">Hide</button></div>' +
    '<ul class="bl"><li><b>Train</b>' + (RST && RST.kind === 'noplan' ? 'No program yet' : !off ? esc(ses.name) + ' at ' + esc(ses.p.time) + ' (' + esc(ses.p.load.toLowerCase()) + ')' : RST.kind === 'break' ? esc(RST.label.replace('Break · d', 'Break day, d')) : 'Rest day') + '</li>' +
    '<li><b>Body</b>' + (rec != null ? 'Recovery ' + rec + '%' + (w.sleep_hours ? ', ' + esc(w.sleep_hours) + ' h sleep' : '') + body : 'WHOOP score not in yet') + '</li>' +
    (first ? '<li><b>Eat</b>' + esc(first.name) + ' at ' + esc(first.time) + '</li>' : '') + '<li><b>Focus</b>' + esc(focus) + '</li></ul></section>';
}

/* ======================= 94. Plan B + 57/56: the "change this session" sheet now has 4 options ======================= */
function lowEnergy(ses) { const L = lighten(ses.p, 'deload'); return L ? L.details.replace(/Deload week: about 60-70% of your usual weights, stop 3 reps before failure\. Runs easy\./, 'Low-energy day: about 70% weights, stop 3 reps before failure. Moving is the win today.') : ses.details; }
function adjBody() {
  const A = S.adj, ses = sessionFor(A.ds); if (!ses) return '<p class="mut">No session.</p>';
  let h = '<div class="adjopts" role="group" aria-label="How to change it">' + [['low', 'Low energy'], ['nogym', 'No gym'], ['short', 'Short on time'], ['ss', 'Superset']].map(([k, l]) => '<button class="chip' + (A.mode === k ? ' on' : '') + '" aria-pressed="' + (A.mode === k) + '" data-act="adjmode" data-m="' + k + '">' + l + '</button>').join('') + '</div>';
  let det = '';
  if (A.mode === 'short') {
    h += '<p class="lbl">How much time do you have?</p><div class="segc" role="group" aria-label="Minutes">' + [20, 30, 45, 60].map((m) => '<button class="' + (A.min === m ? 'on' : '') + '" aria-pressed="' + (A.min === m) + '" data-act="adjmin" data-n="' + m + '">' + m + ' min</button>').join('') + '</div>';
    const P = shortPlan(ses.details, A.min); det = P.details; h += '<p class="mut small">Normally about ' + P.before + ' min. Keeps the main lifts first and drops core and finisher work first: ' + P.kept + ' of ' + P.total + ' exercises.</p>';
  } else if (A.mode === 'ss') { const P = supersetPlan(ses.details); det = P.details; h += '<p class="mut small">' + P.pairs + ' pairs of exercises that don’t tire the same muscles. About ' + P.before + ' → ' + P.after + ' min.</p>'; }
  else if (A.mode === 'low') { det = lowEnergy(ses); h += '<p class="mut small">Half the sets, lighter weights, same exercises. For a bad night, stress or just feeling flat.</p>'; }
  else {
    if (!D().ai) return h + '<p class="err">Needs your Claude API key.</p>';
    if (A.nogym && A.nogym.ds === A.ds) { det = A.nogym.details; h += '<p class="mut small">Bodyweight version of ' + esc(ses.name) + ' for a small room.</p>'; }
    else return h + '<p class="mut small">I rewrite this session for no equipment: bodyweight, a chair or a backpack.</p><button class="p" style="width:100%" data-act="nogymgo"' + (A.busy ? ' disabled' : '') + '>' + (A.busy ? 'Writing it…' : 'Make a no-gym version') + '</button>';
  }
  A.plan = det;
  return h + '<div class="card adjprev">' + blocksHTML(det, 'adj-' + A.ds) + '</div><button class="p" style="width:100%;margin-top:16px" data-act="adjuse">Use this ' + (A.ds === todayStr() ? 'today' : 'on ' + esc(niceDate(A.ds))) + '</button>';
}

/* ======================= 95. short night ======================= */
function shortNightCard() {
  const ds = todayStr(), w = whoopFor(ds), ses = sessionFor(ds);
  if (!w || !Number(w.sleep_hours) || Number(w.sleep_hours) >= 6 || !ses || ses.p.load !== 'Hard' || ses.p.moved || D().overrides.some((o) => o.date === ds) || LS.getItem('night-' + ds) || logs('WorkoutLog', ds).length) return '';
  return '<section class="card missed"><div class="ms-top"><span class="ms-ic">' + ICON(LI.moon) + '</span><div><span class="eyebrow3">Short night · ' + esc(w.sleep_hours) + ' h</span><h3>Make today lighter?</h3><p class="mut small">Hard training on under 6 hours raises injury risk and gives less back. The lighter version keeps the same exercises with half the sets.</p></div></div>' +
    '<div class="row hero-act"><button class="p" data-act="nightacc">Use the lighter version</button><button data-act="nightrej">Keep it hard</button></div></section>';
}

/* ======================= 97. meal rotation ======================= */
function altsHTML(daytype, slot) {
  const L = (D().mealalts || []).filter((a) => a.daytype === daytype && a.slot === slot);
  if (!L.length) return D().ai ? '<p class="lbl">Bored of this meal?</p><button class="sm" style="width:100%" data-act="altsmake"' + (S.altBusy ? ' disabled' : '') + '>' + (S.altBusy ? 'Making alternatives…' : 'Make 2 alternatives for every meal') + '</button>' : '';
  return '<p class="lbl">Same calories and protein, different food</p>' + L.map((a) => '<div class="rec"><b>' + esc(a.name) + '</b><p class="mut small">' + esc(a.items) + ' · ' + esc(a.kcal) + ' kcal' + (Number(a.protein) ? ' · ' + esc(a.protein) + ' g protein' : '') + '</p><button class="g" style="width:100%;margin-top:8px" data-act="alteat" data-slot="' + esc(slot) + '" data-i="' + esc(a.idx) + '">I ate this instead</button></div>').join('');
}

/* ======================= 98. supplement stock ======================= */
function stockLeft(s) { const used = Math.max(0, daysBetween(s.updated, todayStr())) * Number(s.per_day); return Math.max(0, Number(s.count) - used); }
function stockCard() {
  const L = D().stock || [];
  return '<h2>Supplement stock</h2><div class="card list">' + L.map((s) => { const left = stockLeft(s), days = Number(s.per_day) ? Math.floor(left / Number(s.per_day)) : null, warn = days !== null && days <= 7;
    return '<button class="li" data-act="stockedit" data-n="' + esc(s.name) + '"><span class="li-ic" style="background:' + (warn ? '#ff453a' : '#14b8a6') + '">' + ICON(B5.box) + '</span><span class="li-main"><b>' + esc(s.name) + '</b><span class="mut small' + (warn ? ' warnt' : '') + '">' + (days === null ? Math.round(left) + ' left' : days <= 0 ? 'Run out: buy more' : days + ' days left' + (warn ? ': buy more soon' : '')) + '</span></span><span class="li-end">' + Math.round(left) + '<span class="chev">›</span></span></button>'; }).join('') +
    row({ act: 'stockedit', ic: I.plus, bg: 'var(--accFill)', t: 'Add a supplement', s: 'Count what you have, I count down every day', cls: 'add' }) + '</div>';
}
function stockBody(name) {
  const s = (D().stock || []).find((x) => x.name === name) || { name: '', count: '', per_day: 1 };
  const sug = [...new Set(D().meals.map((m) => m.supps).join(',').split(',').map((x) => x.trim().replace(/\s+\d.*$/, '')).filter(Boolean))].slice(0, 8);
  return (name ? '' : '<div class="chiprow">' + sug.map((x) => '<button class="chip" data-act="stockpre" data-n="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>') +
    '<label class="mut small" for="stn">Name</label><input id="stn" maxlength="40" value="' + esc(s.name) + '"' + (name ? ' readonly' : '') + '>' +
    '<div class="row two"><div><label class="mut small" for="stc">How many you have now</label><input id="stc" type="number" inputmode="numeric" min="0" max="5000" value="' + esc(name ? Math.round(stockLeft(s)) : '') + '" placeholder="e.g. 60"></div><div><label class="mut small" for="stp">Per day</label><input id="stp" type="number" inputmode="decimal" min="0" max="20" step="0.5" value="' + esc(s.per_day) + '"></div></div>' +
    '<p class="mut small">Pills, capsules or scoops. Update the count when you buy more.</p><button class="p" style="width:100%;margin-top:12px" data-act="stocksave">Save</button>';
}

/* ======================= 102. exercise library ======================= */
function exLib() {
  const by = {};
  (D().sets || []).forEach((s) => { const k = nk(s.exercise); if (!k) return; const o = by[k] = by[k] || { name: s.exercise, days: new Set(), best: 0, last: '' }; o.days.add(s.date); const e = Number(s.kg) * (1 + Number(s.reps) / 30); if (e > o.best) o.best = e; if (s.date > o.last) o.last = s.date; });
  D().plan.forEach((p) => parseSession(p.details).filter((b) => !b.skip).forEach((b) => b.ex.forEach((e) => { const n = e.replace(/,.*$/, '').replace(/\s*\d+(\.\d+)?\s*kg.*$/i, '').replace(/\s+\d.*$/, '').trim(); const k = nk(n); if (k.length < 3 || by[k]) return; by[k] = { name: n, days: new Set(), best: 0, last: '' }; })));
  return Object.keys(by).map((k) => Object.assign({ k }, by[k])).sort((a, b) => (b.last || '').localeCompare(a.last || '') || a.name.localeCompare(b.name));
}
function libBody() {
  const q = (S.libq || '').toLowerCase(), L = exLib().filter((x) => !q || x.k.indexOf(q) >= 0);
  return '<input id="libq" type="search" placeholder="Search exercises" value="' + esc(S.libq || '') + '" aria-label="Search exercises"><div class="card list flat" style="margin-top:12px">' + L.slice(0, 60).map((x) => '<button class="li" data-act="libone" data-k="' + esc(x.k) + '"><span class="li-main"><b>' + esc(x.name) + '</b><span class="mut small">' + (x.days.size ? x.days.size + ' session' + (x.days.size > 1 ? 's' : '') + ' · last ' + esc(niceDate(x.last).replace(/^\w+ /, '')) : 'In your plan, not logged yet') + '</span></span><span class="li-end">' + (x.best ? '<b class="pr-v">' + Math.round(x.best) + ' kg</b>' : '') + '<span class="chev">›</span></span></button>').join('') + (L.length ? '' : '<p class="empty-note">Nothing found.</p>') + '</div><p class="foot">Kg = estimated 1-rep max from your best set.</p>';
}
function libOne(k) {
  const x = exLib().find((e) => e.k === k); if (!x) return;
  const S2 = (D().sets || []).filter((s) => nk(s.exercise) === k), days = [...new Set(S2.map((s) => s.date))].sort();
  const top = days.map((d) => { const L = S2.filter((s) => s.date === d); const b = L.reduce((m, s) => (Number(s.kg) * (1 + Number(s.reps) / 30) > Number(m.kg) * (1 + Number(m.reps) / 30) ? s : m), L[0]); return { d, b, sets: L.length, e: Number(b.kg) * (1 + Number(b.reps) / 30) }; });
  let chart = '';
  if (top.length >= 2) { const v = top.map((t) => t.e), lo = Math.min(...v), hi = Math.max(...v), rg = hi - lo || 1; chart = '<svg class="trend" viewBox="0 0 300 100" role="img" aria-label="Estimated max over time"><path class="tline" d="' + v.map((y, i) => (i ? 'L' : 'M') + (10 + i / (v.length - 1) * 280).toFixed(1) + ' ' + (90 - (y - lo) / rg * 80).toFixed(1)).join(' ') + '"/></svg>'; }
  infoSheet(x.name, chart + cuesHTML(x.name) + (top.length ? '<div class="card list flat">' + top.slice().reverse().slice(0, 12).map((t) => '<div class="li"><span class="li-main"><b>' + (Number(t.b.kg) ? t.b.kg + ' kg × ' : '') + t.b.reps + '</b><span class="mut small">' + esc(niceDate(t.d)) + ' · ' + t.sets + ' sets</span></span><span class="li-end">' + (t.e ? Math.round(t.e) + ' kg max' : '') + '</span></div>').join('') + '</div>' : '<p class="mut small">Not logged yet. Tap an exercise in your session to log sets.</p>') +
    '<a class="p btn-a" style="margin-top:16px" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(x.k + ' exercise proper form') + '" target="_blank" rel="noopener">Watch how to do it</a>', 'libone');
}

/* ======================= 103. run workouts ======================= */
function runWorkouts() {
  const Z = runZones(); if (!Z) return null; const p = Z.race, f = fmtSec;
  return {
    easy: ['Easy run', 'Moderate', '# Easy run 40-50 min\n- Run at ' + f(Z.easy[0]) + '–' + f(Z.easy[1]) + ' /km, you can talk the whole time\n- Finish with 4 strides of 20 s, walk back between'],
    long: ['Long run', 'Hard', '# Long run 75-100 min\n- First 2/3 at ' + f(Z.long[0] + 10) + '–' + f(Z.long[1]) + ' /km\n- Last 1/3 at ' + f(Z.long[0]) + ' /km if you feel good\n- Water or dates every 40 min'],
    tempo: ['Tempo run', 'Hard', '# Warm-up 15 min easy\n- Easy at ' + f(Z.easy[1]) + ' /km plus 4 strides\n# Tempo 20-25 min\n- At ' + f(Z.tempo[0]) + '–' + f(Z.tempo[1]) + ' /km, comfortably hard\n# Cool-down 10 min easy'],
    intervals: ['Intervals', 'Hard', '# Warm-up 15 min easy\n- Easy jog plus 4 strides\n# 6 x 800 m, rest 2 min jog\n- Each 800 m at ' + f(Z.intervals[0]) + '–' + f(Z.intervals[1]) + ' /km (' + f(Z.intervals[0] * 0.8) + '–' + f(Z.intervals[1] * 0.8) + ' per 800 m)\n# Cool-down 10 min easy'],
    race: ['Race-pace run', 'Hard', '# Warm-up 15 min easy\n# 3 x 3 km at race pace, rest 3 min easy jog\n- Race pace: ' + f(p) + ' /km, hold it even\n# Cool-down 10 min easy']
  };
}
function rwBody() {
  const W = runWorkouts(), k = S.rw || 'tempo';
  if (!W) return '<p class="mut">Set a goal time for your race (tap the race countdown) or log a few runs on Strava, and I build workouts with your paces.</p>';
  const w = W[k], Z = runZones();
  return '<div class="adjopts" role="group" aria-label="Workout type">' + Object.keys(W).map((x) => '<button class="chip' + (x === k ? ' on' : '') + '" aria-pressed="' + (x === k) + '" data-act="rwtype" data-k="' + x + '">' + W[x][0] + '</button>').join('') + '</div>' +
    '<p class="mut small">Paces from ' + esc(Z.from) + '.</p><div class="card adjprev">' + blocksHTML(w[2], 'rw-' + k) + '</div>' +
    '<div class="row two"><div><label class="mut small" for="rwd">Day</label><input type="date" id="rwd" value="' + dateAdd(todayStr(), 1) + '"></div><div><label class="mut small" for="rwt">Time</label><input type="time" id="rwt" value="07:00"></div></div>' +
    '<p class="mut small">Replaces that day’s session. Undo anytime from Train.</p><button class="p" style="width:100%;margin-top:8px" data-act="rwadd">Add to my plan</button>';
}

/* ======================= 104. heat and hills: fair pace check ======================= */
function adjPace(a) {
  const pace = paceOf(a); if (!pace) return null;
  const T = Number(a.temp_c), km = Number(a.distance_km), climb = km > 0 ? (Number(a.elevation) || 0) / km : 0;
  const heat = isFinite(T) && a.temp_c !== '' && T > 15 ? (T - 15) * 1.5 : 0, hill = climb * 0.5;
  return { pace, adj: pace - heat - hill, heat, hill, T: a.temp_c !== '' && isFinite(T) ? T : null, climb };
}
const runCheck0 = runCheck;
runCheck = function (a) {
  const Z = runZones(), P = adjPace(a); if (!Z || !P || !/run/i.test(a.type)) return null;
  const s = sessionFor(a.date), kind = s && /run|jog|tempo|interval/i.test(s.name) ? runKind(s.name) : Number(a.distance_km) >= 14 ? 'long' : 'easy';
  const z = Z[kind], ok = P.adj >= z[0] - 5 && P.adj <= z[1] + 5, fast = P.adj < z[0] - 5, note = P.heat + P.hill >= 3 ? ' · counts as ' + fmtSec(P.adj) + ' /km after ' + [P.heat >= 2 ? Math.round(P.T) + '°C' : '', P.hill >= 2 ? Math.round(P.climb) + ' m/km climb' : ''].filter(Boolean).join(' and ') : '';
  return { kind, z, ok, fast, text: (ok ? '✓ On target' : fast ? 'Faster than planned' : 'Slower than planned') + ' for ' + kind + ' (' + fmtSec(z[0]) + '–' + fmtSec(z[1]) + ' /km)' + note };
};

/* ======================= 105. strength standards ======================= */
const STD = [['Back squat', /back squat|^squat/i, [0.75, 1.25, 1.5, 2, 2.5]], ['Deadlift', /^deadlift|conventional deadlift|sumo deadlift/i, [1, 1.5, 2, 2.5, 3]], ['Bench press', /bench/i, [0.5, 0.75, 1, 1.5, 2]], ['Overhead press', /overhead press|military|strict press|^ohp/i, [0.35, 0.55, 0.75, 1, 1.25]], ['Weighted pull-up', /pull.?up/i, [1, 1.15, 1.35, 1.6, 1.85]]];
const LVL = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
function standardsCard() {
  const bw = curWeight(); if (!bw) return '';
  const rows = STD.map(([n, re, lv]) => {
    let best = 0; (D().sets || []).filter((s) => re.test(s.exercise)).forEach((s) => { const add = Number(s.kg) || 0, e = (/pull.?up/i.test(n) ? bw + add : add) * (1 + Number(s.reps) / 30); if (e > best) best = e; });
    (D().prs || []).filter((r) => re.test(r.name) && r.unit === 'kg').forEach((r) => { const e = /pull.?up/i.test(n) ? bw + Number(r.value) : Number(r.value); if (e > best) best = e; });
    if (!best) return null; const ratio = best / bw, li = lv.reduce((b, v, i) => (ratio >= v ? i : b), -1);
    return { n, best, ratio, li, next: lv[li + 1] ? Math.round(lv[li + 1] * bw - (/pull.?up/i.test(n) ? bw : 0)) : null };
  }).filter(Boolean);
  return '<h2>Strength standards</h2><div class="card list">' + (rows.length ? rows.map((r) => '<div class="li"><span class="li-main"><b>' + esc(r.n) + '</b><span class="mut small">' + r.ratio.toFixed(2) + '× body weight' + (r.next ? ' · next level at ' + r.next + ' kg' + (/pull/i.test(r.n) ? ' added' : '') : '') + '</span><span class="lvl" aria-hidden="true">' + LVL.map((l, i) => '<i class="' + (i <= r.li ? 'on' : '') + '"></i>').join('') + '</span></span><span class="li-end"><b>' + (r.li >= 0 ? LVL[r.li] : 'Starting') + '</b></span></div>').join('') : '<p class="empty-note">Log sets of squat, deadlift, bench, overhead press or weighted pull-ups to see your level.</p>') + '</div><p class="foot">Estimated 1-rep max vs your body weight (' + bw + ' kg), adult male standards.</p>';
}

/* ======================= 106. illness mode ======================= */
function sick() { try { const s = JSON.parse(D().cfg.sick || 'null'); return s && s.since ? s : null; } catch (e) { return null; } }
function sickCard() {
  const s = sick(); if (!s) return '';
  return '<section class="card sickc"><div class="ms-top"><span class="ms-ic">' + ICON(TI.heart) + '</span><div><span class="eyebrow3">Illness mode · since ' + esc(niceDate(s.since).replace(/^\w+ /, '')) + '</span><h3>' + (s.kind === 'above' ? 'Easy movement only' : 'Rest and recover') + '</h3><p class="mut small">' + (s.kind === 'above' ? 'Cold symptoms above the neck: a 20–30 min walk or mobility is fine if you feel up to it. No hard training.' : 'Fever, chest or body aches: full rest. Training now makes it last longer. Drink plenty and sleep.') + ' See a doctor if it gets worse or lasts more than a week.</p></div></div><button class="p" style="width:100%;margin-top:14px" data-act="sickoff">I feel better</button></section>';
}
function sickBody() {
  return '<p class="mut small">Pause your plan while you are ill. I replace the next 3 days with rest or easy movement and ease you back in after.</p><div class="card list flat">' +
    '<button class="li" data-act="sickon" data-k="above"><span class="li-main"><b>Above the neck</b><span class="mut small">Runny nose, sore throat, sneezing</span></span><span class="chev">›</span></button>' +
    '<button class="li" data-act="sickon" data-k="below"><span class="li-main"><b>Below the neck</b><span class="mut small">Fever, chest cough, body aches, stomach</span></span><span class="chev">›</span></button></div>';
}

/* ======================= hooks into the rest of the app ======================= */
const toolsCard0 = toolsCard;
toolsCard = function () { return toolsCard0().replace(/<\/div>$/, '') + '<button class="tool" data-act="rwopen"><span class="li-ic" style="background:#fc4c02">' + ICON(B5.runr) + '</span><b>Run workouts</b><span>Tempo, intervals with your paces</span></button><button class="tool" data-act="libopen"><span class="li-ic" style="background:#0ea5e9">' + ICON(B5.book) + '</span><b>Exercise library</b><span>Your history and bests</span></button><button class="tool" data-act="stackopen"><span class="li-ic" style="background:#14b8a6">' + ICON(B5.link) + '</span><b>Habit stacks</b><span>Tie new habits to old ones</span></button></div>'; };

/* ======================= actions ======================= */
document.addEventListener('input', (ev) => { if (ev.target.id === 'libq') { S.libq = ev.target.value; const pos = ev.target.selectionStart; refreshSheet('lib', libBody()); const q = $('#libq'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } } });
COACH_KEEP.push('tunedec', 'tuneapply', 'ruleon', 'ruleno', 'ruleoff', 'stackadd', 'stackdel', 'nogymgo', 'altsmake', 'stocksave', 'stockpre', 'rwtype', 'rwadd', 'sickon', 'memdel', 'libone');
Object.assign(COACH_ACTS, {
  briefx: () => { LS.setItem('brief-' + todayStr(), '1'); render(); },
  tuneopen: async () => {
    S.tune = { busy: true, dec: {} }; infoSheet('Monthly plan check', tuneBody(), 'tune');
    try { S.tune.res = await call({ action: 'plan_tune' }); D().cfg.last_tune = todayStr(); save(); } catch (e) { S.tune.err = e.message === 'offline' ? 'You are offline.' : e.message; }
    S.tune.busy = false; refreshSheet('tune', tuneBody());
  },
  tunedec: (el) => { const T = S.tune; T.dec[el.dataset.id] = T.dec[el.dataset.id] === el.dataset.v ? undefined : el.dataset.v; keepScroll('tune', tuneBody()); },
  tuneapply: async () => {
    const T = S.tune, recs = T.res.recs.filter((r) => T.dec[r.id] === 'accept' && r.type !== 'note');
    if (!confirm('Change your plan with ' + recs.length + ' accepted change' + (recs.length > 1 ? 's' : '') + '? The current plan is saved in PlanArchive.')) return;
    try { const j = await call({ action: 'plan_patch', recs }); closeSheets(); toast(j.applied + ' change' + (j.applied === 1 ? '' : 's') + ' applied', 3500); await load(); }
    catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message, 4000); }
  },
  ruleon: (el) => { const L = rulesList().filter((r) => r.id !== el.dataset.id); L.push({ id: el.dataset.id, text: el.dataset.t, status: 'on' }); setCfg('rules', JSON.stringify(L)); },
  ruleno: (el) => { const L = rulesList().filter((r) => r.id !== el.dataset.id); L.push({ id: el.dataset.id, text: el.dataset.t, status: 'off' }); setCfg('rules', JSON.stringify(L)); },
  ruleoff: (el) => { const L = rulesList().map((r) => (r.id === el.dataset.id ? Object.assign({}, r, { status: 'off' }) : r)); setCfg('rules', JSON.stringify(L)); },
  stackopen: () => infoSheet('Habit stacks', stackBody(), 'stack'),
  stackadd: () => { const h = $('#sth').value.trim(), a = $('#sta').value; if (!h) { toast('Write the habit'); return; } const L = stacks(); if (L.length >= 8) { toast('Up to 8 stacks'); return; } L.push({ id: 's' + Date.now(), anchor: a, habit: h.slice(0, 60) }); setCfg('stacks', JSON.stringify(L)); refreshSheet('stack', stackBody()); },
  stackdel: (el) => { setCfg('stacks', JSON.stringify(stacks().filter((s) => s.id !== el.dataset.id))); refreshSheet('stack', stackBody()); },
  nogymgo: async () => {
    const A = S.adj, ses = sessionFor0(A.ds); A.busy = true; keepScroll('adj', adjBody());
    try { const j = await call({ action: 'planb_nogym', session: ses.p.session, details: ses.p.details }); A.nogym = { ds: A.ds, details: j.details, session: j.session }; } catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message, 4000); }
    A.busy = false; keepScroll('adj', adjBody());
  },
  adjuse: () => {
    const A = S.adj, s = sessionFor0(A.ds), lab = { short: ' (' + A.min + ' min)', ss: ' (supersets)', low: ' (low energy)', nogym: ' (no gym)' }[A.mode];
    const name = A.mode === 'nogym' && A.nogym ? A.nogym.session : s.p.session + lab;
    send({ action: 'log', table: 'Overrides', row: { date: A.ds, session: name, load: A.mode === 'low' && s.p.load === 'Hard' ? 'Moderate' : s.p.load, time: s.p.time, daytype: s.p.daytype || (planFor(A.ds) || {}).daytype, details: A.plan, reason: { short: 'short on time', ss: 'superset', low: 'plan b low energy', nogym: 'plan b no gym' }[A.mode] } });
    toast('Session updated');
  },
  nightacc: () => { const ds = todayStr(), s = sessionFor0(ds), L = lighten(s.p, 'deload'); send({ action: 'log', table: 'Overrides', row: Object.assign({ date: ds, reason: 'short night' }, L, { session: s.p.session + ' (light)', details: lowEnergy(s) }) }); toast('Lighter version set for today'); },
  nightrej: () => { LS.setItem('night-' + todayStr(), '1'); render(); },
  altsmake: async () => {
    S.altBusy = true; const sh = document.querySelector('.modal.info .sheet'); if (sh) sh.querySelector('[data-act="altsmake"]').disabled = true;
    try { const j = await call({ action: 'meal_alts' }); D().mealalts = j.mealalts; save(); toast('Alternatives ready for every meal', 3000); } catch (e) { toast(e.message === 'offline' ? 'You are offline.' : e.message, 4000); }
    S.altBusy = false; closeSheets(); render();
  },
  alteat: (el) => {
    const p = dayPlan(todayStr()), a = (D().mealalts || []).find((x) => x.daytype === p.daytype && x.slot === el.dataset.slot && String(x.idx) === el.dataset.i); if (!a) return;
    send({ action: 'log', table: 'MealLog', row: { date: todayStr(), slot: el.dataset.slot, status: 'swap', time: nowTime(), note: 'Alternative: ' + a.name + ' (' + a.items + ') ' + a.kcal + ' kcal', extra_name: '', kcal: String(a.kcal), protein: String(a.protein || '') } });
    closeSheets(); toast('Logged ' + a.name);
  },
  stockedit: (el) => infoSheet(el.dataset.n ? el.dataset.n : 'Add a supplement', stockBody(el.dataset.n || ''), 'stock'),
  stockpre: (el) => { $('#stn').value = el.dataset.n; },
  stocksave: () => {
    const n = $('#stn').value.trim(), c = Number($('#stc').value), p = Number($('#stp').value);
    if (!n) { toast('Name it'); return; } if (!(c >= 0 && c <= 5000) || $('#stc').value === '') { toast('Count must be 0 to 5000'); return; } if (!(p >= 0 && p <= 20)) { toast('Per day must be 0 to 20'); return; }
    send({ action: 'log', table: 'Stock', row: { name: n.slice(0, 40), count: String(Math.round(c)), per_day: String(p), updated: todayStr() } }); closeSheets();
  },
  libopen: () => { S.libq = ''; infoSheet('Exercise library', libBody(), 'lib'); },
  libone: (el) => libOne(el.dataset.k),
  rwopen: () => { S.rw = 'tempo'; infoSheet('Run workouts', rwBody(), 'rw'); },
  rwtype: (el) => { S.rw = el.dataset.k; keepScroll('rw', rwBody()); },
  rwadd: () => {
    const ds = $('#rwd').value, tm = $('#rwt').value, w = runWorkouts()[S.rw || 'tempo'];
    if (!ds || ds < todayStr()) { toast('Pick today or a later day'); return; }
    const had = sessionFor0(ds); if (had && had.p.load !== 'Rest' && !confirm('This replaces ' + had.p.session + ' on ' + niceDate(ds) + '. OK?')) return;
    send({ action: 'log', table: 'Overrides', row: { date: ds, session: w[0], load: w[1], time: tm || '07:00', daytype: (planFor(ds) || {}).daytype || 'chicken', details: w[2], reason: 'run workout' } }); closeSheets(); toast(w[0] + ' added to ' + niceDate(ds));
  },
  sickopen: () => infoSheet('Illness mode', sickBody(), 'sick'),
  sickon: (el) => {
    const k = el.dataset.k, t = todayStr();
    setCfg('sick', JSON.stringify({ since: t, kind: k }));
    for (let i = 0; i < 3; i++) { const ds = dateAdd(t, i), p = planFor(ds); send({ action: 'log', table: 'Overrides', row: { date: ds, session: k === 'above' ? 'Easy walk + mobility' : 'Rest (ill)', load: k === 'above' ? 'Recovery' : 'Rest', time: (p && p.time) || '08:00', daytype: 'sat', details: k === 'above' ? '# Easy walk 20-30 min\n- Only if you feel up to it, conversational pace\n# Mobility 10 min\n- Gentle stretches, breathing' : '# Rest\n- Sleep, fluids, warm food. No training.', reason: 'sick' } }); }
    closeSheets(); toast('Get well soon. Plan paused for 3 days.', 3500);
  },
  sickoff: () => {
    const t = todayStr();
    D().overrides.filter((o) => o.reason === 'sick' && o.date >= t).forEach((o) => send({ action: 'del', table: 'Overrides', row: { date: o.date } }));
    setCfg('sick', ''); const n = writeWeek('ease', 'ease back'); toast('Welcome back. Next ' + n + ' sessions are lighter.', 3500);
  },
  memopen: () => infoSheet('What your coach remembers', '<p class="mut small">Your coach saves lasting things you tell it, like preferences or injuries, and uses them in every answer.</p><div class="card list flat">' + ((D().memory || []).map((m) => '<div class="li"><span class="li-main"><b>' + esc(m.fact) + '</b><span class="mut small">' + esc(niceDate(m.date)) + '</span></span><button class="icon-btn x" data-act="memdel" data-id="' + esc(m.id) + '" aria-label="Forget: ' + esc(m.fact) + '">✕</button></div>').join('') || '<p class="empty-note">Nothing yet. Tell your coach things like "I hate burpees".</p>') + '</div>', 'mem'),
  memdel: (el) => { send({ action: 'del', table: 'CoachMemory', row: { id: el.dataset.id } }); COACH_ACTS.memopen(); }
});

/* ======================= 96. coach memory: show what was remembered ======================= */
async function chatSend(q) {
  q = String(q || '').trim(); if (!q || S.chatBusy) return;
  if (!D().ai) { toast('Add your Claude API key first'); return; }
  const M = chatMsgs(); M.push({ role: 'user', content: q }); LS.setItem('chat', JSON.stringify(M.slice(-30)));
  S.chatBusy = true; refreshSheet('chat', chatBody()); chatScroll();
  try {
    const j = await call({ action: 'coach_chat', messages: M.filter((m) => m.role !== 'note').slice(-12) });
    M.push({ role: 'assistant', content: j.reply });
    (j.remembered || []).forEach((r) => { if (!D().memory.some((x) => x.id === r.id)) D().memory.push(r); M.push({ role: 'note', content: 'Remembered: ' + r.fact }); });
    if ((j.remembered || []).length) save();
  } catch (e) { M.push({ role: 'assistant', content: e.message === 'offline' ? 'You are offline. Ask me again when you are connected.' : 'Sorry, that did not work: ' + e.message }); }
  LS.setItem('chat', JSON.stringify(M.slice(-30))); S.chatBusy = false; refreshSheet('chat', chatBody()); chatScroll();
}
const chatBody0 = chatBody;
chatBody = function () {
  return chatBody0().replace(/<div class="msg ai">Remembered: ([^<]*)<\/div>/g, '<button class="msg note" data-act="memopen">' + ICON(CI.spark) + ' Remembered: $1</button>') + ((D().memory || []).length ? '<button class="txt" style="margin-top:8px" data-act="memopen">What your coach remembers (' + D().memory.length + ')</button>' : '');
};


/* ===================== batch6.js ===================== */
/* Apex batch 6: race week, after the race, load balance, MMA camp, Ramadan mode, what-if, goal check,
   rest-day options, week review, session warm-ups, smarter deload detector, PR planner, then vs now.
   Loaded after batch5.js, before app.js. */
const B6 = {
  flag: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  dial: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
  glove: '<path d="M7 11V7a3 3 0 0 1 6 0v1h1a3 3 0 0 1 3 3v4a6 6 0 0 1-6 6H9a3 3 0 0 1-3-3v-4z"/><path d="M7 11h6"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>'
};
const r25 = (x) => Math.round(x / 2.5) * 2.5;
const raceKm = (ev) => (RACE_KM.find((r) => r[0].test(ev.name)) || [])[1] || 21.0975;
const MMA = ['Sparring', 'BJJ', 'Muay Thai', 'Boxing', 'Wrestling', 'MMA'];

/* ======================= 115. race week, day by day ======================= */
const TAPER = {
  6: ['Easy run 40 min + 4 strides', 'Moderate', '# Easy run 40 min\n- Conversational pace\n- Finish with 4 strides of 20 s'],
  5: ['Rest or mobility 20 min', 'Recovery', '# Mobility 20 min\n- Hips, calves, hamstrings. Nothing hard.'],
  4: ['Race-pace sharpener', 'Moderate', '# Warm-up 10 min easy\n# 3 x 1 km at race pace, 2 min jog between\n# Cool-down 10 min easy'],
  3: ['Easy run 30 min', 'Recovery', '# Easy run 30 min\n- Very easy. Legs should feel fresh after.'],
  2: ['Rest', 'Rest', '# Rest\n- Walk, stretch lightly, sleep 8+ hours'],
  1: ['Shake-out 15–20 min + 4 strides', 'Recovery', '# Shake-out 15-20 min\n- Very easy, then 4 strides of 15 s\n- Lay out your kit tonight']
};
function raceStart(ev) { return LS.getItem('rstart-' + ev.name) || '06:30'; }
function raceWeekHTML(ev) {
  const t = todayStr(), wt = curWeight(), km = raceKm(ev), st = raceStart(ev), carbs = (g) => (wt ? Math.round(wt * g) + ' g carbs' : g + ' g carbs per kg');
  let h = '<p class="mut small">' + esc(niceDate(ev.date)) + ' · ' + km.toFixed(km % 1 ? 1 : 0) + ' km. Less training, more carbs and sleep: you arrive fresh, not unfit.</p>' +
    '<label class="mut small" for="rws">Race start time</label><input type="time" id="rws" value="' + esc(st) + '">';
  for (let k = 6; k >= 0; k--) {
    const ds = dateAdd(ev.date, -k); if (ds < t && k > 0) continue;
    const T = TAPER[k], food = k <= 2 && k >= 1 ? 'Carb up: ' + carbs(km > 15 ? 8 : 6) + ' today, from rice, pasta, bread, potatoes, fruit. Less fat and fibre.' : k === 0 ? '' : 'Normal meals, protein at each one.';
    const do0 = k === 2 ? 'Check kit: shoes, socks, gels, bib, watch charged.' : k === 1 ? 'Pin your bib, lay out everything, set two alarms for ' + addHM(st, -180) + '. Aim to be asleep by ' + addHM(st, -180 - 7 * 60) + '; a short night before a race is normal, the night before that counts more.' : k === 6 ? 'Plan how you get to the start and when you leave.' : '';
    h += '<div class="rw-d' + (ds === t ? ' now' : '') + '"><span class="rw-n">' + (k === 0 ? 'Race' : k + 'd') + '</span><div><b>' + esc(niceDate(ds)) + (ds === t ? ' · today' : '') + '</b>' +
      (k === 0 ? '<p>Race day. Morning timeline below.</p>' : '<p><b class="rw-s">' + esc(T[0]) + '</b></p>' + (food ? '<p class="mut small">' + esc(food) + '</p>' : '') + (do0 ? '<p class="mut small">' + esc(do0) + '</p>' : '')) + '</div></div>';
  }
  const tl = [[-180, 'Wake up, 500 ml water with a pinch of salt'], [-170, 'Breakfast: ' + carbs(1.5) + ', e.g. bread, honey, banana'], [-75, 'Leave for the start (adjust to your travel time)'], [-60, 'Coffee if you usually have it, toilet'], [-25, 'Warm-up: 10 min easy jog + 3 strides'], [-10, 'In your start pen, small sip of water'], [0, 'Start: first 2 km slower than goal pace']];
  h += '<p class="lbl">Race morning</p><div class="card list flat">' + tl.map(([m, x]) => '<div class="li"><span class="li-main"><b>' + addHM(st, m) + '</b><span class="mut small">' + esc(x) + '</span></span></div>').join('') + '</div>';
  const n = [1, 2, 3, 4, 5, 6].filter((k) => dateAdd(ev.date, -k) >= t).length;
  return h + (n ? '<button class="p" style="width:100%;margin-top:16px" data-act="rwapply" data-n="' + esc(ev.name) + '" data-d="' + esc(ev.date) + '">Put this taper in my plan (' + n + ' day' + (n > 1 ? 's' : '') + ')</button>' : '') +
    '<button class="sm" style="width:100%;margin-top:10px" data-act="racedayopen" data-n="' + esc(ev.name) + '" data-d="' + esc(ev.date) + '">Pacing per km and race fuel</button>';
}
function raceWeekCard() {
  const ev = nextRace(); if (!ev) return ''; const left = daysBetween(todayStr(), ev.date); if (left < 0 || left > 7) return '';
  const T = TAPER[left] || ['Taper starts: keep it easy', 'Moderate', ''];
  return '<button class="card eoc rweek" data-act="rwkopen" data-n="' + esc(ev.name) + '" data-d="' + esc(ev.date) + '"><span class="li-ic" style="background:#f59e0b">' + ICON(B6.flag) + '</span><span><b>' + (left ? 'Race week · ' + left + ' day' + (left > 1 ? 's' : '') + ' to go' : 'Race day: ' + esc(ev.name)) + '</b><span class="mut small">' + (left ? 'Today: ' + esc(T[0]) : 'Morning timeline, pacing and fuel') + '</span></span><span class="chev">›</span></button>';
}

/* ======================= 118. after the race ======================= */
function lastRace() {
  const t = todayStr();
  return D().events.filter((e) => e.date && e.date <= t && daysBetween(e.date, t) <= 3 && RACE_KM.some((r) => r[0].test(e.name))).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
}
function postDays(km) { return km <= 5 ? 3 : km <= 10 ? 5 : km <= 22 ? 8 : 14; }
function postPlan(ev) {
  const n = postDays(raceKm(ev)), out = [];
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    out.push(i === 1 ? ['Rest + 20 min walk', 'Rest', '# Recovery day 1\n- 20 min easy walk\n- Protein at every meal, drink well\n- No running'] :
      f <= 0.34 ? ['Walk 30 min + mobility', 'Recovery', '# Recovery\n- 30 min walk\n- 10 min gentle mobility: hips, calves'] :
      f <= 0.6 ? ['Easy run 20 min or bike 30 min', 'Recovery', '# Easy\n- 20 min very easy run or 30 min bike\n- Upper body is fine, no heavy legs yet'] :
      f < 1 ? ['Easy run 30 min', 'Moderate', '# Easy run 30 min\n- Conversational pace\n- Light leg strength allowed: 60% weights'] :
      ['Easy run 40 min + 4 strides', 'Moderate', '# Easy run 40 min\n- Then 4 strides of 20 s\n- Back to your normal plan tomorrow']);
  }
  return out;
}
function postRaceCard() {
  const ev = lastRace(); if (!ev || LS.getItem('post-' + ev.name + ev.date) || D().overrides.some((o) => o.reason === 'post race' && o.date > todayStr())) return '';
  const P = postPlan(ev);
  return '<section class="card missed"><div class="ms-top"><span class="ms-ic">' + ICON(B6.trophy) + '</span><div><span class="eyebrow3">After ' + esc(ev.name) + '</span><h3>Recover for ' + P.length + ' days?</h3><p class="mut small">Your legs need about ' + P.length + ' days after ' + raceKm(ev).toFixed(0) + ' km, even when they feel fine. I\u2019ll replace your next ' + P.length + ' sessions with rest, walks and easy runs, then you\u2019re back on your plan.</p></div></div>' +
    '<div class="row two" style="margin-top:12px"><div><label class="mut small" for="prt">Your finish time</label><input id="prt" inputmode="numeric" placeholder="1:52:30" maxlength="8"></div><div style="display:flex;align-items:flex-end"><button class="sm" style="width:100%" data-act="prtsave" data-n="' + esc(ev.name) + '">Save time</button></div></div>' +
    '<div class="row hero-act"><button class="p" data-act="postacc" data-n="' + esc(ev.name) + '" data-d="' + esc(ev.date) + '">Use recovery days</button><button data-act="postrej" data-n="' + esc(ev.name) + '" data-d="' + esc(ev.date) + '">No thanks</button></div></section>';
}

/* ======================= 119. load balance ======================= */
const LCOL = { run: '#fc4c02', lift: '#6d5ce8', mma: '#ef4444', other: '#14b8a6' };
const LNAME = { run: 'Running', lift: 'Gym and conditioning', mma: 'MMA and combat', other: 'Other sport' };
function dayLoad(ds) {
  const o = { run: 0, lift: 0, mma: 0, other: 0 }, runs = D().strava.filter((a) => a.date === ds && /run/i.test(a.type));
  runs.forEach((a) => { o.run += (Number(a.moving_min) || 0) * 6; });
  D().strava.filter((a) => a.date === ds && !/run|weight|workout|hiit/i.test(a.type + ' ' + a.name)).forEach((a) => { o.other += (Number(a.moving_min) || 0) * 3; });
  H().workouts.filter((w) => w.date === ds && w.status === 'done').forEach((w) => {
    const s = sessionFor0(ds), nm = (s && s.p.session) || w.session || '';
    if (/run|jog|tempo|interval/i.test(nm) && runs.length) return;
    const rpe = Number(w.rpe) || LOAD_RPE[s && s.p.load] || 6;
    o[/run|jog|tempo|interval/i.test(nm) ? 'run' : 'lift'] += 60 * rpe;
  });
  (D().sport || []).filter((x) => x.date === ds).forEach((x) => { o[MMA.indexOf(x.type) >= 0 ? 'mma' : 'other'] += Number(x.minutes) * Number(x.rpe); });
  return o;
}
function rangeLoad(endDs, days) { const o = { run: 0, lift: 0, mma: 0, other: 0 }; for (let i = 0; i < days; i++) { const d = dayLoad(dateAdd(endDs, -i)); Object.keys(o).forEach((k) => { o[k] += d[k]; }); } o.tot = o.run + o.lift + o.mma + o.other; return o; }
function loadBalance() {
  const t = todayStr(), a = rangeLoad(t, 7), c = rangeLoad(t, 28), chronic = c.tot / 4, ratio = chronic ? a.tot / chronic : 0;
  const weeks = [5, 4, 3, 2, 1, 0].map((k) => rangeLoad(dateAdd(t, -7 * k), 7));
  return { a, c, chronic, ratio, weeks };
}
loadCard = function () {
  const L = loadBalance(), r = L.ratio, max = Math.max(1, ...L.weeks.map((w) => w.tot));
  const st = !L.chronic || L.c.tot < 300 ? ['Building baseline', 'keep', 'Effort × minutes from workouts, runs and sports. Needs about 3 weeks of data.'] : r > 1.5 ? ['Too big a jump', 'swap', 'This week is ' + Math.round((r - 1) * 100) + '% above your 4-week normal. That is the main injury-risk zone: make the next 2–3 days easy.'] : r > 1.3 ? ['Careful', 'reduce', 'This week is ' + Math.round((r - 1) * 100) + '% above normal. Fine for a week, not two in a row.'] : r < 0.8 ? ['Lighter than usual', 'reduce', 'Good for recovery. If it lasts 2+ weeks you start losing fitness.'] : ['Balanced', 'keep', 'Within your safe range (0.8–1.3 × your normal).'];
  const big = Object.keys(LCOL).filter((k) => L.a[k] > 0).sort((x, y) => L.a[y] - L.a[x]);
  const share = (k, o) => (o.tot ? Math.round(o[k] / o.tot * 100) : 0), shift = big.find((k) => L.c.tot && share(k, L.a) - share(k, L.c) >= 15);
  const sp = (D().sport || []).filter((x) => x.date > dateAdd(todayStr(), -7));
  return '<h2>Training load</h2><section class="card load"><div class="row sp"><div><span class="eyebrow3">Last 7 days</span><b class="ld-n">' + Math.round(L.a.tot) + '</b><span class="mut small"> points' + (L.chronic ? ' · ' + r.toFixed(2) + '× normal' : '') + '</span></div><span class="pill ' + st[1] + '">' + st[0].toUpperCase() + '</span></div>' +
    '<div class="lbars" role="img" aria-label="Weekly load, last 6 weeks: ' + L.weeks.map((w) => Math.round(w.tot)).join(', ') + '">' + L.weeks.map((w, i) => '<span class="' + (i === 5 ? 'now' : '') + '" style="height:' + Math.max(4, w.tot / max * 100) + '%">' + ['mma', 'other', 'lift', 'run'].map((k) => (w[k] ? '<i style="background:' + LCOL[k] + ';height:' + (w[k] / w.tot * 100) + '%"></i>' : '')).join('') + '</span>').join('') + '</div>' +
    '<div class="lkey">' + Object.keys(LCOL).map((k) => '<span><i style="background:' + LCOL[k] + '"></i>' + LNAME[k] + (L.a[k] ? ' ' + share(k, L.a) + '%' : '') + '</span>').join('') + '</div>' +
    '<p class="mut small" style="margin-top:10px">' + esc(st[2]) + (shift ? ' ' + LNAME[shift] + ' is ' + share(shift, L.a) + '% of this week vs ' + share(shift, L.c) + '% normally.' : '') + '</p>' +
    (sp.length ? '<p class="small" style="margin-top:8px">' + sp.map((x) => esc(x.type) + ' ' + x.minutes + ' min').join(' · ') + '</p>' : '') +
    '<button class="link-row" data-act="sportlog">Log a sport session (sparring, BJJ, climbing…)<span class="chev">›</span></button></section>';
};

/* ======================= 120. MMA camp log ======================= */
function camp() { try { const c = JSON.parse(D().cfg.camp || 'null'); return c && c.name ? c : null; } catch (e) { return null; } }
const sportBody0 = sportBody;
sportBody = function () {
  const h = sportBody0(), v = S.sp;
  if (MMA.indexOf(v.type) < 0) return h;
  v.int = v.int || 'medium'; v.kn = v.kn || [];
  const extra = '<p class="lbl">Sparring intensity</p><div class="segc" role="group" aria-label="Sparring intensity">' + [['light', 'Light / technical'], ['medium', 'Medium'], ['hard', 'Hard']].map(([k, l]) => '<button class="' + (v.int === k ? 'on' : '') + '" aria-pressed="' + (v.int === k) + '" data-act="spint" data-k="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<label class="mut small" for="spt">Techniques you worked on</label><input id="spt" maxlength="200" value="' + esc(v.tech || '') + '" placeholder="e.g. jab-cross-hook, double leg, guard passing">' +
    '<p class="lbl">Knocks you took</p><div class="chiprow">' + ['Head', 'Body', 'Legs', 'Hands'].map((k) => { const on = v.kn.indexOf(k) >= 0; return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="spkn" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
    '<input id="spk" maxlength="80" value="' + esc(v.knote || '') + '" placeholder="Note, e.g. clean jab, bruised shin" aria-label="Knock note">';
  return h.replace('<div class="row two"><div><label class="mut small" for="spd">', extra + '<div class="row two"><div><label class="mut small" for="spd">');
};
function spKeep() { const v = S.sp; v.min = $('#spm').value; v.rounds = $('#spr').value; if ($('#spt')) { v.tech = $('#spt').value; v.knote = $('#spk').value; } }
function campStats(days) {
  const t = todayStr(), L = (D().sport || []).filter((x) => MMA.indexOf(x.type) >= 0 && x.date > dateAdd(t, -days));
  const tech = {}; L.forEach((x) => String(x.techniques || '').split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean).forEach((s) => { tech[s] = (tech[s] || 0) + 1; }));
  return { L, n: L.length, rounds: L.reduce((a, x) => a + (Number(x.rounds) || 0), 0), min: L.reduce((a, x) => a + (Number(x.minutes) || 0), 0), hard: L.filter((x) => x.intensity === 'hard').length, head: L.filter((x) => /head/i.test(x.knocks || '')).length, tech: Object.keys(tech).map((k) => [k, tech[k]]).sort((a, b) => b[1] - a[1]) };
}
function campBody() {
  const c = camp(), w = campStats(7), m = campStats(28), warn = [];
  if (w.hard > 2) warn.push('3+ hard sparring sessions this week. Most fight camps cap hard sparring at 1–2 a week.');
  if (campStats(14).head >= 3) warn.push('Head knocks in 3+ sessions in 2 weeks. Take a week of light, technical sparring. Headache, dizziness or blurred vision: stop and see a doctor.');
  const L = loadBalance(); if (L.a.mma && L.a.run && L.ratio > 1.3) warn.push('Running and MMA together pushed your load ' + Math.round((L.ratio - 1) * 100) + '% above normal. Make the next run easy.');
  return (c ? '<div class="lastbox"><span class="eyebrow3">' + ICON(B6.glove) + ' ' + esc(c.name) + '</span>' + (c.date ? '<b>' + Math.max(0, daysBetween(todayStr(), c.date)) + ' days to go</b><span class="mut small">' + esc(niceDate(c.date)) + '</span>' : '<b>Camp running</b>') + '</div>' : '') +
    '<div class="cparts" style="margin:12px 0"><div><span>Sessions</span><b>' + w.n + '</b></div><div><span>Rounds</span><b>' + w.rounds + '</b></div><div><span>Hard</span><b>' + w.hard + '</b></div><div><span>Minutes</span><b>' + w.min + '</b></div></div><p class="mut small center">Last 7 days · 4 weeks: ' + m.n + ' sessions, ' + m.rounds + ' rounds</p>' +
    (warn.length ? warn.map((x) => '<p class="warnbox">' + esc(x) + '</p>').join('') : '') +
    '<p class="lbl">Techniques, last 4 weeks</p>' + (m.tech.length ? '<div class="chiprow">' + m.tech.slice(0, 12).map(([k, n]) => '<span class="chip static">' + esc(k) + ' <b>×' + n + '</b></span>').join('') + '</div>' : '<p class="mut small">Write techniques when you log sparring, BJJ or pads.</p>') +
    '<p class="lbl">Sessions</p><div class="card list flat">' + (m.L.length ? m.L.slice().sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 10).map((x) => '<div class="li"><span class="li-main"><b>' + esc(x.type) + (x.intensity ? ' · ' + esc(x.intensity) : '') + '</b><span class="mut small">' + esc(niceDate(x.date)) + ' · ' + esc(x.minutes) + ' min' + (x.rounds ? ' · ' + esc(x.rounds) + ' rounds' : '') + (x.knocks ? ' · knocks: ' + esc(x.knocks) : '') + '</span></span><span class="li-end">' + esc(x.rpe) + '/10</span></div>').join('') : '<p class="empty-note">No MMA sessions in 4 weeks.</p>') + '</div>' +
    '<button class="p" style="width:100%;margin-top:16px" data-act="sportlog">Log a session</button>' +
    '<p class="lbl">Camp</p><div class="row two"><div><label class="mut small" for="cpn">Name</label><input id="cpn" maxlength="40" value="' + esc((c && c.name) || '') + '" placeholder="e.g. Amateur fight"></div><div><label class="mut small" for="cpd">Fight or test date</label><input type="date" id="cpd" value="' + esc((c && c.date) || '') + '"></div></div>' +
    '<button class="sm" style="width:100%;margin-top:10px" data-act="campsave">' + (c ? 'Save camp' : 'Start a camp') + '</button>' + (c ? '<button class="txt" style="margin-top:8px" data-act="campoff">End camp</button>' : '');
}

/* ======================= 126. Ramadan mode ======================= */
function tzOff(ds) { try { const h = Number(new Date(ds + 'T12:00:00Z').toLocaleString('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', hour12: false })); return (h - 12) * 60; } catch (e) { return 120; } }
function sunAt(ds, alt, evening) {
  const lat = (Number(D().cfg.lat) || 30.0444) * Math.PI / 180, lon = Number(D().cfg.lon) || 31.2357, d0 = new Date(ds + 'T12:00:00Z'), doy = Math.floor((d0 - Date.UTC(d0.getUTCFullYear(), 0, 0)) / 864e5);
  const g = 2 * Math.PI / 365 * (doy - 1 + 0.5), eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos((Math.sin(alt * Math.PI / 180) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec))) * 180 / Math.PI;
  const m = 720 - 4 * lon - eq + (evening ? 4 * ha : -4 * ha) + tzOff(ds) + (evening ? 2 : 0), x = Math.round(m);
  return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0');
}
function ramadan() { try { const r = JSON.parse(D().cfg.ramadan || 'null'); return r && r.start ? r : null; } catch (e) { return null; } }
function ramDay(ds) { const r = ramadan(); if (!r) return 0; const n = daysBetween(r.start, ds) + 1; return n >= 1 && n <= Number(r.days || 30) ? n : 0; }
function ramTimes(ds) { return { iftar: sunAt(ds, -0.833, true), suhoor: addHM(sunAt(ds, -19.5, false), -10), fajr: sunAt(ds, -19.5, false) }; }
const fasting0 = fasting;
fasting = function () { if (ramDay(todayStr())) { const r = ramTimes(todayStr()); return { iftar: r.iftar, suhoor: r.suhoor, ramadan: true }; } return fasting0(); };
// called from sessionFor() in app.js
function ramShift(ds, s) {
  if (!s || !ramDay(ds) || s.p.load === 'Rest' || (s.p.reason || '') === 'run workout') return s;
  const r = ramTimes(ds), easy = s.p.load === 'Recovery' || /walk|mobil|easy|recover/i.test(s.p.session), tm = easy ? addHM(r.iftar, -60) : addHM(r.iftar, 120);
  return Object.assign({}, s, { p: Object.assign({}, s.p, { time: tm, ramadan: true }) });
};
function ramCard() {
  const t = todayStr(), r = ramadan(), n = ramDay(t);
  if (n) { const R0 = ramTimes(t), s = sessionFor(t); return '<section class="card travelc"><span class="eyebrow3">' + ICON(B6.moon) + ' Ramadan · day ' + n + ' of ' + (r.days || 30) + '</span><p class="small" style="margin:8px 0 0">Iftar <b>' + R0.iftar + '</b> · suhoor by <b>' + R0.suhoor + '</b> (Fajr ' + R0.fajr + ').' + (s && s.p.load !== 'Rest' ? ' ' + esc(s.p.session) + ' moved to <b>' + s.p.time + '</b>: ' + (s.p.time < R0.iftar ? 'easy work just before iftar.' : 'hard work 2 h after iftar, once you have eaten.') : '') + ' Keep protein at iftar and suhoor; drink through the night.</p></section>'; }
  if (r && daysBetween(t, r.start) > 0 && daysBetween(t, r.start) <= 14) return '<button class="card eoc" data-act="ramopen"><span class="li-ic" style="background:#6d5ce8">' + ICON(B6.moon) + '</span><span><b>Ramadan in ' + daysBetween(t, r.start) + ' days</b><span class="mut small">Check your times and training plan</span></span><span class="chev">›</span></button>';
  return '';
}
function ramBody() {
  const r = ramadan() || { start: '2027-02-08', days: 30 }, on = !!ramadan(), ds = ramDay(todayStr()) ? todayStr() : r.start, T0 = ramTimes(ds), T1 = ramTimes(dateAdd(r.start, Number(r.days) - 1));
  return '<p class="mut small">Iftar and suhoor are worked out every day for Cairo (sunset, and Fajr minus 10 min, Egyptian method). Meals move into your eating window and training moves around iftar:</p>' +
    '<ul class="rd-l"><li><b>Hard sessions:</b> 2 h after iftar, when you have eaten and drunk.</li><li><b>Easy sessions and walks:</b> 60 min before iftar, then eat straight after.</li><li><b>Water:</b> spread through the night, not all at iftar.</li><li><b>Running:</b> easy runs only in the first week while your body adjusts.</li></ul>' +
    '<div class="row two"><div><label class="mut small" for="rms">First day</label><input type="date" id="rms" value="' + esc(r.start) + '"></div><div><label class="mut small" for="rmd">Days</label><select id="rmd"><option' + (Number(r.days) === 29 ? ' selected' : '') + '>29</option><option' + (Number(r.days) !== 29 ? ' selected' : '') + '>30</option></select></div></div>' +
    '<p class="mut small">' + (on ? '' : 'Expected to start around 8 February 2027: check the official announcement and fix the date if needed. ') + 'First day: iftar ' + T0.iftar + ', suhoor ' + T0.suhoor + '. Last day: iftar ' + T1.iftar + ', suhoor ' + T1.suhoor + '.</p>' +
    '<button class="p" style="width:100%;margin-top:12px" data-act="ramsave">' + (on ? 'Save' : 'Turn on Ramadan mode') + '</button>' + (on ? '<button class="r" style="width:100%;margin-top:10px" data-act="ramoff">Turn off</button>' : '');
}

/* ======================= 133. what-if simulator ======================= */
function myBase() {
  const W = H().whoop.filter((w) => Number(w.sleep_hours) > 0 && Number(w.recovery) > 0 && w.date >= dateAdd(todayStr(), -60));
  const sl = avgN(W.map((w) => Number(w.sleep_hours))) || 7, s = W.length >= 14 ? slope(W.map((w) => [Number(w.sleep_hours), Number(w.recovery)])) : null;
  const days = Math.round(H().workouts.filter((w) => w.status === 'done' && w.date >= dateAdd(todayStr(), -28)).length / 4) || 4;
  const km = Math.round(D().strava.filter((a) => /run/i.test(a.type) && a.date >= dateAdd(todayStr(), -28)).reduce((x, a) => x + Number(a.distance_km || 0), 0) / 4);
  return { sleep: Math.round(sl * 2) / 2, recSlope: s != null && s > 0 ? Math.max(2, Math.min(12, s)) : 6, own: s != null && s > 0, days: Math.min(7, days), km, rec: avgN(W.slice(-14).map((w) => Number(w.recovery))) };
}
function hmNow() { const P = predictions().find((p) => /Half marathon/.test(p[0])); return P ? secOf(P[1]) : null; }
function sqNow() { const P = predictions().find((p) => /in 12 weeks/.test(p[0])); return P ? { name: P[0].replace(' in 12 weeks', ''), now: Number((P[2].match(/about (\d+)/) || [])[1]) } : null; }
function wiCalc(v) {
  const B = S.wiBase, out = [], bw = curWeight();
  if (B.rec != null) { const d = (v.sleep - B.sleep) * B.recSlope - Math.max(0, v.days - B.days) * 2; out.push(['Recovery', Math.round(Math.max(1, Math.min(99, B.rec + d))) + '%', (d >= 0 ? '+' : '') + Math.round(d) + ' vs now (' + Math.round(B.rec) + '%)', d >= 0]); }
  if (bw) { const kg = v.kcal * 56 / 7700; out.push(['Weight in 8 weeks', (bw + kg).toFixed(1) + ' kg', (kg >= 0 ? '+' : '') + kg.toFixed(1) + ' kg from food alone', null]); }
  const hm = hmNow();
  if (hm) { let pct = Math.max(-5, Math.min(5, (v.km - B.km) / 10 * 0.8)) + (v.sleep < 7 ? -1 : 0) + (v.kcal < -500 ? -0.5 : 0); out.push(['Half marathon in 8 weeks', fmtSec(hm * (1 - pct / 100)), (pct >= 0 ? pct.toFixed(1) + '% faster' : Math.abs(pct).toFixed(1) + '% slower') + ' than today\u2019s ' + fmtSec(hm), pct >= 0]); }
  const sq = sqNow();
  if (sq && sq.now) { let wk = 0.006 * (v.days >= 3 ? 1 : 0.5) * (v.prot >= (bw || 80) * 1.6 ? 1 : 0.7) * (v.kcal < -500 ? 0.4 : v.kcal < 0 ? 0.8 : 1) * (v.sleep < 7 ? 0.8 : 1); out.push([sq.name + ' in 8 weeks', Math.round(sq.now * (1 + wk * 8)) + ' kg', '+' + Math.round(sq.now * wk * 8) + ' kg (1-rep max)', true]); }
  return out;
}
function wiOut() { const v = S.wi; return wiCalc(v).map((r) => '<div class="li"><span class="li-main"><b>' + esc(r[0]) + '</b><span class="mut small ' + (r[3] === true ? 'okt' : r[3] === false ? 'warnt' : '') + '">' + esc(r[2]) + '</span></span><span class="li-end"><b class="pr-v">' + esc(r[1]) + '</b></span></div>').join('') || '<p class="empty-note">Needs a few weeks of WHOOP, weight, runs or sets.</p>'; }
function wiBody() {
  const v = S.wi, B = S.wiBase, sl = (id, l, min, max, st, val, fmt) => '<label class="wi-r" for="' + id + '"><span>' + l + '<b id="' + id + 'v">' + fmt(val) + '</b></span><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + st + '" value="' + val + '"></label>';
  return '<p class="mut small">Move the sliders and see roughly where you\u2019d be. Starting points are your last 4 weeks.' + (B.own ? ' Sleep effect is from your own WHOOP data: about ' + Math.round(B.recSlope) + '% recovery per hour.' : '') + '</p>' +
    sl('wis', 'Sleep a night', 5, 9.5, 0.5, v.sleep, (x) => x + ' h') + sl('wid', 'Training days a week', 1, 7, 1, v.days, (x) => x) + sl('wik', 'Running a week', 0, 80, 5, v.km, (x) => x + ' km') + sl('wic', 'Calories vs plan', -750, 500, 50, v.kcal, (x) => (x > 0 ? '+' : '') + x + ' kcal') + sl('wip', 'Protein a day', 60, 250, 10, v.prot, (x) => x + ' g') +
    '<div class="card list flat" id="wiout" aria-live="polite">' + wiOut() + '</div><p class="foot">Rough estimates from your trends and common training research. Real results vary.</p>';
}

/* ======================= 134. goal reality check ======================= */
const GV = { likely: ['Likely', 'keep'], possible: ['Possible with work', 'reduce'], unlikely: ['Unlikely by then', 'swap'] };
function goalVerdict(g) {
  const t = todayStr(), wk = Math.max(1, daysBetween(t, g.date) / 7), bw = curWeight();
  if (g.kind === 'race') {
    const km = Number(g.km), runs = D().strava.filter((a) => /run/i.test(a.type) && Number(a.distance_km) >= 3 && Number(a.moving_min) > 0); if (!runs.length) return { err: 'Log a few runs of 3 km or more on Strava first.' };
    const now = Math.min(...runs.map((a) => Number(a.moving_min) * 60 * Math.pow(km / Number(a.distance_km), 1.06))), goal = secOf(g.target); if (!goal) return { err: 'Write the time like 1:50:00' };
    const need = (now - goal) / now * 100, rate = need / wk, v = need <= 0 ? 'likely' : rate <= 0.35 ? 'likely' : rate <= 0.7 ? 'possible' : 'unlikely';
    return { v, now: fmtSec(now), need: need <= 0 ? 'You can already run about ' + fmtSec(now) + '.' : 'You need to get ' + need.toFixed(1) + '% faster in ' + Math.round(wk) + ' weeks (' + rate.toFixed(2) + '% a week). Realistic: about 0.3–0.7% a week.', take: ['Run ' + (v === 'likely' ? 3 : 4) + '–5 times a week, mostly easy', 'One quality run a week at ' + fmtSec(goal / km) + ' /km or faster', 'A long run every week, building to ' + Math.round(km * 0.9) + '+ km'] };
  }
  if (g.kind === 'weight') {
    if (!bw) return { err: 'Log your weight first.' }; const tg = Number(g.target); if (!(tg > 30 && tg < 250)) return { err: 'Write a weight in kg' };
    const d = tg - bw, rate = Math.abs(d) / wk / bw * 100, lose = d < 0, v = rate <= (lose ? 0.5 : 0.25) ? 'likely' : rate <= (lose ? 1 : 0.5) ? 'possible' : 'unlikely';
    return { v, now: bw + ' kg', need: (lose ? 'Lose ' : 'Gain ') + Math.abs(d).toFixed(1) + ' kg in ' + Math.round(wk) + ' weeks: ' + (Math.abs(d) / wk).toFixed(2) + ' kg a week (' + rate.toFixed(2) + '% of body weight). Safe: ' + (lose ? 'up to 0.5–1%' : 'up to 0.25–0.5%') + ' a week.', take: [(lose ? 'About ' + Math.round(Math.abs(d) / wk * 7700 / 7) + ' kcal a day under maintenance' : 'About ' + Math.round(Math.abs(d) / wk * 7700 / 7 + 150) + ' kcal a day above maintenance'), 'Protein ' + Math.round(bw * (lose ? 2 : 1.8)) + ' g a day', lose ? 'Keep lifting heavy so the weight lost is fat, not muscle' : 'Lift 3–4 times a week so the weight gained is muscle'] };
  }
  const L = exLib().find((x) => x.k === nk(g.lift)); if (!L || !L.best) return { err: 'Log sets of this lift first.' };
  const tg = Number(g.target); if (!(tg > 0)) return { err: 'Write the weight in kg' };
  const need = (tg - L.best) / L.best * 100, rate = need / wk, v = need <= 0 ? 'likely' : rate <= 0.75 ? 'likely' : rate <= 1.5 ? 'possible' : 'unlikely';
  return { v, now: Math.round(L.best) + ' kg (estimated max)', need: need <= 0 ? 'Your estimated max is already there: test it.' : '+' + need.toFixed(1) + '% in ' + Math.round(wk) + ' weeks (' + rate.toFixed(2) + '% a week). Realistic for you: about 0.5–1.5% a week.', take: [L.name + ' 2 times a week', 'Add 2.5 kg when you hit all reps', 'Use the PR planner for the last 4 weeks'] };
}
function gcBody() {
  const g = S.gc, ev = nextRace(), R0 = g.res;
  const f = g.kind === 'race' ? '<div class="row two"><div><label class="mut small" for="gck">Distance</label><select id="gck">' + [[5, '5 km'], [10, '10 km'], [21.0975, 'Half marathon'], [42.195, 'Marathon']].map(([k, l]) => '<option value="' + k + '"' + (Number(g.km) === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div><div><label class="mut small" for="gct">Goal time</label><input id="gct" value="' + esc(g.target || (ev && ev.goal) || '') + '" placeholder="1:50:00"></div></div>'
    : g.kind === 'weight' ? '<label class="mut small" for="gct">Goal weight (kg)</label><input id="gct" type="number" inputmode="decimal" value="' + esc(g.target || '') + '">'
    : '<div class="row two"><div><label class="mut small" for="gcl">Lift</label><select id="gcl">' + exLib().filter((x) => x.best).slice(0, 15).map((x) => '<option' + (x.name === g.lift ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div><div><label class="mut small" for="gct">Goal (kg, 1 rep)</label><input id="gct" type="number" inputmode="decimal" value="' + esc(g.target || '') + '"></div></div>';
  return '<p class="mut small">An honest answer from your own data, not motivation.</p><div class="segc" role="group" aria-label="Goal type">' + [['race', 'Race time'], ['weight', 'Body weight'], ['lift', 'Lift']].map(([k, l]) => '<button class="' + (g.kind === k ? 'on' : '') + '" aria-pressed="' + (g.kind === k) + '" data-act="gckind" data-k="' + k + '">' + l + '</button>').join('') + '</div>' + f +
    '<label class="mut small" for="gcd">By</label><input type="date" id="gcd" value="' + esc(g.date || (ev && ev.date) || dateAdd(todayStr(), 84)) + '"><button class="p" style="width:100%;margin-top:16px" data-act="gcgo">Check my goal</button>' +
    (R0 ? (R0.err ? '<p class="err">' + esc(R0.err) + '</p>' : '<div class="gcres"><span class="pill ' + GV[R0.v][1] + '">' + GV[R0.v][0].toUpperCase() + '</span><p><b>Now:</b> ' + esc(R0.now) + '</p><p class="small">' + esc(R0.need) + '</p><p class="lbl">What it takes</p><ul class="rd-l">' + R0.take.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>') : '');
}
function raceGoalCard() {
  const ev = nextRace(); if (!ev || !ev.goal) return '';
  const R0 = goalVerdict({ kind: 'race', km: raceKm(ev), target: ev.goal, date: ev.date }); if (R0.err) return '';
  return '<h2>Goal check</h2><button class="card gcc" data-act="gcopen"><span class="pill ' + GV[R0.v][1] + '">' + GV[R0.v][0].toUpperCase() + '</span><b>' + esc(ev.name) + ' in ' + esc(ev.goal) + '</b><span class="mut small">' + esc(R0.need) + '</span><span class="link-t">Check another goal ›</span></button>';
}

/* ======================= 135. rest-day options ======================= */
const RESTO = {
  walk: ['Walk 30–45 min', 'Easy pace, outside if you can. Blood flow helps your legs recover.', ['Walk 30–45 min at an easy pace', 'Finish with 5 min of calf and hip stretches'], 40],
  mob: ['Mobility 15 min', 'For tight hips, back or shoulders.', ['90/90 hip switches, 8 each side', 'World\u2019s greatest stretch, 4 each side', 'Thread the needle, 6 each side', 'Deep squat hold, 2 x 45 s', 'Couch stretch, 45 s each side', 'Cat-cow, 10 slow'], 15],
  sauna: ['Sauna or hot shower + stretch', 'Relaxing, may help sleep. Drink 500 ml after.', ['Sauna 10–15 min (or 10 min hot shower)', 'Cool down 5 min', 'Gentle stretch 10 min', 'Drink 500 ml water with a pinch of salt'], 30],
  rest: ['Full rest', 'When you are tired, sore or sleep was short. Rest is training too.', ['No planned exercise', 'Get outside for daylight', 'Early night: in bed by your usual time or earlier'], 0]
};
function restPick() {
  const t = todayStr(), w = whoopFor(t), rec = w && Number(w.recovery), L = loadBalance(), y = sessionFor0(dateAdd(t, -1)), y2 = sessionFor0(dateAdd(t, -2));
  if ((rec && rec < 40) || L.ratio > 1.3 || sick()) return ['rest', rec && rec < 40 ? 'Recovery is ' + rec + '%' : L.ratio > 1.3 ? 'Your load is high this week' : 'You\u2019re ill'];
  let ir = null; try { ir = typeof illRisk === 'function' && !illOff() ? illRisk(t) : null; } catch (e) { ir = null; }
  if (ir && ir.level === 'high') return ['rest', 'Your body may be fighting something'];
  const didHard = (s, d) => s && s.p.load === 'Hard' && logs('WorkoutLog', d).some((r) => r.status === 'done');
  if (didHard(y, dateAdd(t, -1)) && didHard(y2, dateAdd(t, -2))) return ['mob', 'Two hard days behind you'];
  return ['walk', rec ? 'Recovery ' + rec + '%: easy movement helps' : 'Easy movement helps you recover'];
}
function restDayCard() {
  const t = todayStr(), s = sessionFor(t); if (!s || s.p.load !== 'Rest' || sick()) return '';
  const pk = restPick(), done = (D().sport || []).find((x) => x.date === t && /^Rest:/.test(x.note || '')) || (LS.getItem('rest-' + t) ? { type: 'Full rest' } : null);
  return '<h2>Rest day</h2><section class="card restc"><p class="small" style="margin:0 0 12px">' + (done ? '✓ ' + esc(done.type) + ' done. Enjoy the rest of your day.' : '<b>I suggest: ' + esc(RESTO[pk[0]][0]) + '.</b> ' + esc(pk[1]) + '.') + '</p><div class="adjopts">' +
    Object.keys(RESTO).map((k) => '<button class="chip' + (k === pk[0] && !done ? ' on' : '') + '" data-act="restopen" data-k="' + k + '">' + esc(RESTO[k][0]) + '</button>').join('') + '</div></section>';
}

/* ======================= 136. week review chat ======================= */
const BLOCK = ['Work', 'Sleep', 'Travel', 'Ill', 'Motivation', 'Food', 'Social', 'Nothing'];
function wrDue() { const t = todayStr(), dw = weekIdx(t), h = local().hour; if (!D().ai || !((dw === 5 && h >= 17) || dw === 6)) return false; /* last 1.5 days of the plan week */ const last = D().cfg.wr_last || ''; return !last || daysBetween(last, t) >= 4; }
function wrCard() {
  if (!wrDue() || LS.getItem('wr-x-' + todayStr())) return '';
  return '<button class="card eoc" data-act="wropen"><span class="li-ic" style="background:#8b5cf6">' + ICON(B6.chat) + '</span><span><b>Your week review</b><span class="mut small">3 quick questions, then I tune next week</span></span><span class="chev">›</span></button>';
}
function wrBody() {
  const W = S.wr;
  if (W.busy) return '<div class="gen"><div class="gen-orb" aria-hidden="true">' + ICON(CI.spark) + '</div><h3>Reading your week…</h3><p class="mut small">About 15 seconds.</p></div>';
  if (W.res) {
    const R0 = W.res, n = R0.recs.filter((r) => W.dec[r.id] === 'accept' && r.type !== 'note').length;
    return '<p class="psum">' + esc(R0.summary) + '</p>' + (R0.win ? '<p class="fb-next"><b>Your win</b>' + esc(R0.win) + '</p>' : '') + R0.recs.map((r) => { const dv = W.dec[r.id]; return '<div class="rec' + (dv ? ' ' + dv : '') + '"><b>' + esc(r.title) + '</b><p class="mut small">' + esc(r.reason) + (r.date ? ' · ' + esc(niceDate(r.date)) + (r.date2 ? ' ↔ ' + esc(niceDate(r.date2)) : '') : '') + '</p>' +
      (r.type === 'note' ? '' : '<div class="row"><button class="g' + (dv === 'accept' ? ' sel' : '') + '" aria-pressed="' + (dv === 'accept') + '" data-act="wrdec" data-id="' + r.id + '" data-v="accept">' + (dv === 'accept' ? '✓ Accepted' : 'Accept') + '</button><button class="r' + (dv === 'reject' ? ' sel' : '') + '" aria-pressed="' + (dv === 'reject') + '" data-act="wrdec" data-id="' + r.id + '" data-v="reject">' + (dv === 'reject' ? '✕ Rejected' : 'Reject') + '</button></div>') + '</div>'; }).join('') +
      '<button class="p" style="width:100%;margin-top:16px" data-act="wrapply"' + (n ? '' : ' disabled') + '>' + (n ? 'Apply ' + n + ' change' + (n > 1 ? 's' : '') + ' to next week' : 'Accept a change to apply it') + '</button>' + (W.err ? '<p class="err">' + esc(W.err) + '</p>' : '');
  }
  return '<p class="lbl" style="margin-top:0">1. How did this week feel?</p><div class="rpe five" role="group" aria-label="1 bad to 5 great">' + [1, 2, 3, 4, 5].map((n) => '<button class="' + (W.feel === n ? 'on' : '') + '" aria-pressed="' + (W.feel === n) + '" data-act="wrfeel" data-n="' + n + '">' + n + '</button>').join('') + '</div><p class="mut small">1 rough · 3 OK · 5 great</p>' +
    '<p class="lbl">2. What got in the way?</p><div class="chiprow">' + BLOCK.map((b) => { const on = W.bl.indexOf(b) >= 0; return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="wrbl" data-k="' + b + '">' + b + '</button>'; }).join('') + '</div>' +
    '<label class="lbl" for="wrn" style="display:block">3. Anything for next week?</label><textarea id="wrn" maxlength="300" rows="3" placeholder="e.g. busy Tuesday, want a longer run">' + esc(W.next || '') + '</textarea>' + (W.err ? '<p class="err">' + esc(W.err) + '</p>' : '') +
    '<button class="p" style="width:100%;margin-top:16px" data-act="wrgo"' + (W.feel ? '' : ' disabled') + '>Review my week</button><p class="foot">Uses Claude, about 1¢.</p>';
}

/* ======================= 138. warm-ups made for the session ======================= */
const BW_EASIER = [[/muscle.?up/i, 'Pull-ups, 2 x 3 + explosive pull-ups, 2 x 2'], [/pull.?up|chin/i, 'Scapula pull-ups x 8, then 1 easy set of 3 pull-ups'], [/dip/i, 'Support hold 20 s, then 5 easy dips'], [/handstand/i, 'Wall plank 20 s + 5 pike push-ups'], [/push.?up/i, '10 incline push-ups'], [/pistol/i, 'Box pistol x 3 each side']];
function warmPlan(ses) {
  const det = ses ? String(ses.details || '') : '', bl = det ? parseSession(det).filter((b) => !b.skip && !/warm/i.test(b.head)) : [], out = { lifts: [], bw: [] };
  bl.slice(0, 2).forEach((b) => b.ex.forEach((e) => {
    const kg = Number((e.match(/(\d+(?:\.\d+)?)\s*kg/i) || [])[1]) || 0, name = e.replace(/,.*$/, '').replace(/\s*\d+(\.\d+)?\s*kg.*$/i, '').trim();
    if (kg >= 30 && out.lifts.length < 2) { const bar = /dumbbell|db\b|kettle|kb\b/i.test(name) ? 0 : 20, pts = kg >= 60 ? [[0.4, 5], [0.6, 3], [0.8, 2]] : [[0.5, 5], [0.75, 3]]; out.lifts.push({ name, kg, sets: (bar ? [[bar, 10]] : []).concat(pts.map(([p, r]) => [Math.max(bar || 2.5, r25(kg * p)), r])) }); }
    else if (!kg && out.bw.length < 2) { const m = BW_EASIER.find((x) => x[0].test(name)); if (m) out.bw.push([name, m[1]]); }
  }));
  if (!out.lifts.length) { const L = bl.slice(0, 2).flatMap((b) => b.ex).map((e) => e.replace(/,.*$/, '').trim()).find((n) => setsFor(n).some((s) => Number(s.kg) >= 30)); if (L) { const top = Math.max(...setsFor(L).map((s) => Number(s.kg))); out.lifts.push({ name: L, kg: top, sets: [[20, 10], [r25(top * 0.4), 5], [r25(top * 0.6), 3], [r25(top * 0.8), 2]], guess: true }); } }
  return out;
}
warmSheet = function (session) {
  const t = todayStr(); let ses = null; for (let i = 0; i < 8 && !ses; i++) { const s = sessionFor(dateAdd(t, i)); if (s && s.name === session) ses = s; }
  const k = warmKind(session), P = warmPlan(ses), rk = /run|jog|tempo|interval/i.test(session) ? runKind(session) : null;
  let gen = WARM[k].slice(0, rk ? 6 : 4);
  if (rk === 'easy' || rk === 'long') gen = ['Brisk walk 3 min, then 5 min very easy jog', 'Leg swings, 10 each way', 'Ankle rocks, 10 each side'];
  let h = '<p class="mut small">Made for ' + esc(session) + '. ' + (P.lifts.length ? 'General part first, then ramp-up sets to your working weight.' : 'Easy pace: you should feel warm, not tired.') + '</p><p class="lbl">1 · General, 4–6 min</p><ol class="warm-l">' + gen.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>';
  if (P.lifts.length) h += '<p class="lbl">2 · Ramp-up sets</p>' + P.lifts.map((L) => '<div class="card list flat"><div class="li"><span class="li-main"><b>' + esc(L.name) + '</b><span class="mut small">Working weight ' + L.kg + ' kg' + (L.guess ? ' (your last top set)' : '') + '. Rest 60–90 s between.</span></span></div>' + L.sets.map(([kg, r]) => '<div class="li"><span class="li-main">' + (kg === 20 ? 'Empty bar' : kg + ' kg') + '</span><span class="li-end">× ' + r + '</span></div>').join('') + '</div>').join('');
  if (P.bw.length) h += '<p class="lbl">' + (P.lifts.length ? 3 : 2) + ' · Skill primer</p><ol class="warm-l">' + P.bw.map(([n, x]) => '<li><b>' + esc(n) + ':</b> ' + esc(x) + '</li>').join('') + '</ol>';
  if (rk === 'tempo' || rk === 'intervals') h += '<p class="mut small">Before the hard part: 4 strides of 20 s building to your interval pace.</p>';
  infoSheet('Warm-up', h + '<button class="p" style="width:100%;margin-top:16px" data-act="itopen" data-m="custom" data-w="45" data-r="15" data-n="' + gen.length + '">' + ICON(TI.timer, 'ib') + ' Timer for the general part</button>', 'warm');
};

/* ======================= 139. deload detector ======================= */
function fatigueSignals() {
  const t = todayStr(), W = H().whoop, avg = (L, f) => avgN(L.map(f).filter((x) => x > 0)), r7 = W.filter((w) => w.date > dateAdd(t, -7)), r30 = W.filter((w) => w.date > dateAdd(t, -30) && w.date <= dateAdd(t, -7));
  const hrv7 = avg(r7, (w) => Number(w.hrv)), hrv30 = avg(r30, (w) => Number(w.hrv)), rhr7 = avg(r7, (w) => Number(w.rhr)), rhr30 = avg(r30, (w) => Number(w.rhr)), sl7 = avg(r7, (w) => Number(w.sleep_hours)), rec7 = avg(r7, (w) => Number(w.recovery)), need = Number(D().cfg.sleep_need) || 8;
  const WL = H().workouts.filter((w) => Number(w.rpe) > 0), rp7 = avg(WL.filter((w) => w.date > dateAdd(t, -7)), (w) => Number(w.rpe)), rp28 = avg(WL.filter((w) => w.date > dateAdd(t, -28) && w.date <= dateAdd(t, -7)), (w) => Number(w.rpe));
  const flat = H().workouts.filter((w) => w.date > dateAdd(t, -10) && w.energy === 'flat').length, L = loadBalance(), st = stalledLifts();
  return [
    ['HRV', hrv7 && hrv30 ? hrv7 < hrv30 * 0.9 : null, hrv7 && hrv30 ? Math.round(hrv7) + ' ms vs ' + Math.round(hrv30) + ' normal' : 'needs WHOOP'],
    ['Resting heart rate', rhr7 && rhr30 ? rhr7 >= rhr30 + 4 : null, rhr7 && rhr30 ? Math.round(rhr7) + ' vs ' + Math.round(rhr30) + ' bpm normal' : 'needs WHOOP'],
    ['Sleep', sl7 ? sl7 < need - 0.75 : null, sl7 ? sl7.toFixed(1) + ' h vs ' + need + ' h need' : 'needs WHOOP'],
    ['Recovery', rec7 ? rec7 < 45 : null, rec7 ? Math.round(rec7) + '% average this week' : 'needs WHOOP'],
    ['Effort', rp7 && rp28 ? rp7 >= rp28 + 1 : null, rp7 && rp28 ? 'Sessions feel ' + rp7.toFixed(1) + '/10 vs ' + rp28.toFixed(1) + ' before' : 'rate your workouts'],
    ['Energy', flat || H().workouts.some((w) => w.energy) ? flat >= 2 : null, flat + ' flat session' + (flat === 1 ? '' : 's') + ' in 10 days'],
    ['Load', L.chronic ? L.ratio > 1.3 : null, L.chronic ? L.ratio.toFixed(2) + '× your normal' : 'building baseline'],
    ['Lifts', (D().sets || []).length ? st.length >= 2 : null, st.length ? st.length + ' stalled: ' + st.slice(0, 2).join(', ') : 'all moving']
  ];
}
const deloadCheck0 = deloadCheck;
deloadCheck = function () {
  const c = D().cfg, t = todayStr(), since = c.last_deload || c.program_start || '';
  // never suggest a lighter week while one is already set, or around a break, comeback, illness or race
  if (D().overrides.some((o) => o.date >= dateAdd(t, -7) && /deload|ease|sick|post race|race taper|break|comeback/.test(o.reason || ''))) return null;
  if (missedWeek()) return null; // missed most of last week: ease back in, not a deload
  const a = deloadCheck0(); if (a) return a;
  if (!since || LS.getItem('deload-dis') > dateAdd(t, -7)) return null;
  const weeks = Math.floor(daysBetween(since, t) / 7), on = fatigueSignals().filter((s) => s[1] === true);
  return weeks >= 2 && on.length >= 3 ? { weeks, why: on.map((s) => s[0].toLowerCase() + ': ' + s[2]) } : null;
};
function fatigueCard() {
  const F = fatigueSignals(), on = F.filter((s) => s[1] === true).length, known = F.filter((s) => s[1] !== null).length, v = on >= 3 ? ['Deload soon', 'swap'] : on === 2 ? ['Watch it', 'reduce'] : ['Fresh', 'keep'];
  return '<h2>Fatigue check</h2><section class="card fat"><div class="row sp"><span class="small">' + on + ' of ' + known + ' warning signs on</span><span class="pill ' + v[1] + '">' + v[0].toUpperCase() + '</span></div><div class="fsig">' +
    F.map((s) => '<div class="' + (s[1] === true ? 'on' : s[1] === null ? 'na' : '') + '"><i aria-hidden="true"></i><b>' + esc(s[0]) + '</b><span class="mut small">' + esc(s[2]) + '</span></div>').join('') + '</div><p class="foot" style="margin:10px 0 0">3 or more signs at once: I suggest a lighter week on Train, even before it is due.</p></section>';
}

/* ======================= 140. PR attempt planner ======================= */
const PRW = { 3: [[0.85, '3 x 3'], [0.9, '2 x 2']], 4: [[0.8, '4 x 4'], [0.85, '3 x 3'], [0.9, '2 x 2']], 5: [[0.8, '4 x 4'], [0.85, '3 x 3'], [0.88, '3 x 2'], [0.92, '2 x 1']], 6: [[0.78, '4 x 5'], [0.82, '4 x 4'], [0.85, '3 x 3'], [0.88, '3 x 2'], [0.92, '2 x 1']] };
function prPlan(p) {
  if (p.kind === 'run') {
    const km = Number(p.km), runs = D().strava.filter((a) => /run/i.test(a.type) && Number(a.distance_km) >= 3); if (!runs.length) return { err: 'Log some runs on Strava first.' };
    const now = Math.min(...runs.map((a) => Number(a.moving_min) * 60 * Math.pow(km / Number(a.distance_km), 1.06))), tg = now * (1 - Math.min(0.04, 0.007 * p.weeks)), pace = tg / km, w = [];
    for (let i = 1; i < p.weeks; i++) w.push([i, i % 2 ? (km <= 5 ? '5 x 1 km at ' + fmtSec(pace - 5) + ' /km, 2 min jog' : '3 x 2 km at ' + fmtSec(pace) + ' /km, 2 min jog') : 'Tempo 20 min at ' + fmtSec(pace + 12) + ' /km']);
    return { now: fmtSec(now), target: fmtSec(tg), weeks: w, test: '# Warm-up 15 min easy + 4 strides\n# ' + km + ' km time trial\n- Target ' + fmtSec(tg) + ': ' + fmtSec(pace) + ' /km, first km 5 s slower\n# Cool-down 10 min easy', match: /run|jog|tempo|interval/i, label: km + ' km' };
  }
  const L = exLib().find((x) => x.k === nk(p.lift)); if (!L || !L.best) return { err: 'Log sets of this lift first.' };
  const tg = r25(L.best * (1 + Math.min(0.05, 0.009 * p.weeks))), sch = PRW[Math.min(6, Math.max(3, p.weeks))];
  return { now: Math.round(L.best) + ' kg', target: tg + ' kg', weeks: sch.map(([f, sr], i) => [i + 1, L.name + ' ' + r25(L.best * f) + 'kg, ' + sr + ' (heavy top sets before your normal work)']), test: '# Warm-up\n- ' + L.name + ' ramp: bar x 10, 40% x 5, 60% x 3, 75% x 2, 85% x 1\n# PR attempt, rest 3-4 min\n- Opener ' + r25(tg * 0.9) + 'kg x 1\n- Second ' + r25(tg * 0.95) + 'kg x 1\n- Attempt ' + tg + 'kg x 1 (only if the second moved fast)\n# Note\n- Spotter or safety bars. Nothing else heavy today.', match: new RegExp(L.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), label: L.name };
}
function prDates(P, weeks) {
  const t = todayStr(), out = [];
  for (let w = 0; w < weeks; w++) { for (let i = 1; i <= 7; i++) { const ds = dateAdd(t, w * 7 + i), s = sessionFor0(ds); if (s && P.match.test(s.p.session + ' ' + s.p.details)) { out.push(ds); break; } } }
  return out;
}
function prpBody() {
  const p = S.prp, P = prPlan(p), lifts = exLib().filter((x) => x.best).slice(0, 15);
  let h = '<div class="segc" role="group" aria-label="Kind">' + [['lift', 'Lift'], ['run', 'Run']].map(([k, l]) => '<button class="' + (p.kind === k ? 'on' : '') + '" aria-pressed="' + (p.kind === k) + '" data-act="prpkind" data-k="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<div class="row two"><div><label class="mut small" for="prl">' + (p.kind === 'lift' ? 'Lift' : 'Distance') + '</label><select id="prl">' + (p.kind === 'lift' ? lifts.map((x) => '<option' + (x.name === p.lift ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') : [[5, '5 km'], [10, '10 km'], [21.0975, 'Half marathon']].map(([k, l]) => '<option value="' + k + '"' + (Number(p.km) === k ? ' selected' : '') + '>' + l + '</option>').join('')) + '</select></div>' +
    '<div><label class="mut small" for="prw">Weeks</label><select id="prw">' + [3, 4, 5, 6].map((n) => '<option' + (n === p.weeks ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div>';
  if (P.err) return h + '<p class="err">' + esc(P.err) + '</p>';
  const ds = prDates(P, p.weeks);
  h += '<div class="cparts" style="margin:16px 0;grid-template-columns:1fr 1fr"><div><span>Now (estimated)</span><b>' + esc(P.now) + '</b></div><div><span>Realistic PR</span><b>' + esc(P.target) + '</b></div></div>' +
    '<div class="card list flat">' + P.weeks.map(([i, x]) => '<div class="li"><span class="li-main"><b>Week ' + i + (ds[i - 1] ? ' · ' + esc(niceDate(ds[i - 1])) : '') + '</b><span class="mut small">' + esc(x) + '</span></span></div>').join('') + '<div class="li"><span class="li-main"><b>Test · ' + (ds[p.weeks - 1] ? esc(niceDate(ds[p.weeks - 1])) : 'pick a day') + '</b><span class="mut small">' + esc(P.test.replace(/^# /gm, '').replace(/\n- /g, ': ').split('\n').slice(1, 4).join(' · ')) + '</span></span></div></div>';
  return h + (ds.length ? '<p class="mut small">Adds the heavy sets to ' + ds.length + ' of your planned ' + esc(P.label) + ' sessions, last one becomes the test day. Undo any day from Train.</p><button class="p" style="width:100%;margin-top:8px" data-act="prpadd">Add to my plan</button>' : '<p class="mut small">No ' + esc(P.label) + ' session in your plan for the next ' + p.weeks + ' weeks: add these sets yourself.</p>');
}

/* ======================= 151. then vs now ======================= */
function tvWindow(from, to) {
  const inW = (d) => d >= from && d <= to, W = H().whoop.filter((w) => inW(w.date)), a = (L, f) => avgN(L.map(f).filter((x) => x > 0));
  const B = D().logs.Body.filter((b) => inW(b.date)), runs = D().strava.filter((x) => inW(x.date) && /run/i.test(x.type) && Number(x.distance_km) >= 3 && Number(x.moving_min) > 0);
  const e1 = (re) => Math.max(0, ...(D().sets || []).filter((s) => inW(s.date) && re.test(s.exercise) && Number(s.kg) > 0).map((s) => Number(s.kg) * (1 + Number(s.reps) / 30)));
  const days = daysBetween(from, to) + 1;
  return { weight: a(B, (b) => Number(b.weight)), waist: a(B, (b) => Number(b.waist)), rec: a(W, (w) => Number(w.recovery)), hrv: a(W, (w) => Number(w.hrv)), rhr: a(W, (w) => Number(w.rhr)), sleep: a(W, (w) => Number(w.sleep_hours)),
    five: runs.length ? Math.min(...runs.map((x) => Number(x.moving_min) * 60 * Math.pow(5 / Number(x.distance_km), 1.06))) : 0, sq: e1(/back squat|^squat/i), bench: e1(/bench/i),
    train: H().workouts.filter((w) => inW(w.date) && w.status === 'done').length / days * 7 };
}
function thenNowCard() {
  const t = todayStr(), H0 = H(), first = H0.whoop.concat(H0.workouts, D().logs.Body).map((x) => x.date).filter(Boolean).sort()[0];
  if (!first || daysBetween(first, t) < 28) return '<h2>Then vs now</h2><div class="card"><p class="mut small" style="margin:0">After 4 weeks of data you\u2019ll see your numbers then and now side by side.</p></div>';
  const back = Math.min(90, daysBetween(first, t)), A = tvWindow(dateAdd(t, -back), dateAdd(t, -back + 13)), B = tvWindow(dateAdd(t, -13), t);
  const R0 = [['Weight', 'weight', (x) => x.toFixed(1) + ' kg', 0], ['Waist', 'waist', (x) => x.toFixed(1) + ' cm', -1], ['Recovery', 'rec', (x) => Math.round(x) + '%', 1], ['HRV', 'hrv', (x) => Math.round(x) + ' ms', 1], ['Resting HR', 'rhr', (x) => Math.round(x) + ' bpm', -1], ['Sleep', 'sleep', (x) => x.toFixed(1) + ' h', 1], ['5 km (estimated)', 'five', fmtSec, -1], ['Back squat max', 'sq', (x) => Math.round(x) + ' kg', 1], ['Bench max', 'bench', (x) => Math.round(x) + ' kg', 1], ['Workouts a week', 'train', (x) => x.toFixed(1), 1]]
    .filter((r) => A[r[1]] && B[r[1]]);
  const goodW = cut() ? -1 : 0;
  return '<h2>Then vs now · ' + (back >= 84 ? '3 months' : Math.round(back / 7) + ' weeks') + '</h2><div class="card tvn">' + (R0.length ? '<div class="tvh"><span></span><span>Then</span><span>Now</span></div>' + R0.map(([n, k, f, dir]) => { const d = B[k] - A[k], dd = dir || (k === 'weight' ? goodW : 0), good = dd ? (d * dd > 0) : null, same = Math.abs(d) / (A[k] || 1) < 0.01;
    return '<div class="tvr"><b>' + n + '</b><span class="mut">' + f(A[k]) + '</span><span class="' + (same || good === null ? '' : good ? 'okt' : 'warnt') + '">' + f(B[k]) + (same ? '' : ' ' + (d > 0 ? '↑' : '↓')) + '</span></div>'; }).join('') : '<p class="mut small" style="margin:0">Not enough matching data in both periods yet.</p>') + '</div><p class="foot">Average of 2 weeks then vs your last 2 weeks.</p>';
}

/* ======================= hooks ======================= */
const raceDayPlan0 = raceDayPlan;
raceDayPlan = function (ev) { const left = daysBetween(todayStr(), ev.date); return (left >= 0 && left <= 10 ? '<button class="sm" style="width:100%;margin-bottom:12px" data-act="rwkopen" data-n="' + esc(ev.name) + '" data-d="' + esc(ev.date) + '">Race week, day by day</button>' : '') + raceDayPlan0(ev); };
const toolsCard5 = toolsCard;
toolsCard = function () { return toolsCard5().replace(/<\/div>$/, '') + [['campopen', B6.glove, camp() ? 'MMA camp · on' : 'MMA camp', 'Rounds, techniques, knocks', '#ef4444'], ['prpopen', B6.trophy, 'PR planner', 'Peak for a lift or run', '#f59e0b'], ['wiopen', B6.dial, 'What if…', 'Sleep more, run more: see the effect', '#0ea5e9'], ['gcopen', B6.scale, 'Goal check', 'Is it realistic?', '#6d5ce8']].map(([a, ic, t, s, c]) => '<button class="tool" data-act="' + a + '"><span class="li-ic" style="background:' + c + '">' + ICON(ic) + '</span><b>' + t + '</b><span>' + esc(s) + '</span></button>').join('') + '</div>'; };
COACH_KEEP.push('spint', 'spkn', 'campsave', 'rwapply', 'prtsave', 'ramsave', 'gckind', 'gcgo', 'wrfeel', 'wrbl', 'wrgo', 'wrdec', 'prpkind', 'restdone', 'rwkopen');
document.addEventListener('input', (ev) => {
  const id = ev.target.id;
  if (S.wi && /^wi[sdkcp]$/.test(id)) { const k = { wis: 'sleep', wid: 'days', wik: 'km', wic: 'kcal', wip: 'prot' }[id], v = Number(ev.target.value); S.wi[k] = v; const lab = $('#' + id + 'v'); if (lab) lab.textContent = id === 'wis' ? v + ' h' : id === 'wik' ? v + ' km' : id === 'wic' ? (v > 0 ? '+' : '') + v + ' kcal' : id === 'wip' ? v + ' g' : v; const o = $('#wiout'); if (o) o.innerHTML = wiOut(); }
  if (id === 'rws') { const ev2 = S.rwk; if (ev2 && /^\d\d:\d\d$/.test(ev.target.value)) { LS.setItem('rstart-' + ev2.name, ev.target.value); clearTimeout(S.rwT); S.rwT = setTimeout(() => keepScroll('rwk', raceWeekHTML(ev2)), 600); } }
});
document.addEventListener('change', (ev) => { if (S.prp && (ev.target.id === 'prl' || ev.target.id === 'prw')) { if (ev.target.id === 'prw') S.prp.weeks = Number(ev.target.value); else if (S.prp.kind === 'lift') S.prp.lift = ev.target.value; else S.prp.km = Number(ev.target.value); keepScroll('prp', prpBody()); } });
Object.assign(COACH_ACTS, {
  rwkopen: (el) => { const ev = D().events.find((e) => e.name === el.dataset.n && e.date === el.dataset.d) || nextRace(); if (!ev) return; S.rwk = ev; infoSheet('Race week · ' + ev.name, raceWeekHTML(ev), 'rwk'); },
  rwapply: (el) => {
    const ev = D().events.find((e) => e.name === el.dataset.n && e.date === el.dataset.d); if (!ev) return; const t = todayStr(), L = [];
    for (let k = 6; k >= 1; k--) { const ds = dateAdd(ev.date, -k); if (ds >= t) L.push([ds, TAPER[k]]); }
    if (!confirm('Replace your next ' + L.length + ' sessions before ' + ev.name + ' with the taper? You can undo any day from Train.')) return;
    L.forEach(([ds, T]) => { const p = planFor(ds) || {}; send({ action: 'log', table: 'Overrides', row: { date: ds, session: T[0], load: T[1], time: (sessionFor0(ds) || { p: {} }).p.time || '07:00', daytype: p.daytype || 'chicken', details: T[2], reason: 'race taper' } }); });
    closeSheets(); toast('Taper added: ' + L.length + ' days', 3500);
  },
  postacc: (el) => {
    const ev = D().events.find((e) => e.name === el.dataset.n && e.date === el.dataset.d); if (!ev) return; const P = postPlan(ev), t = todayStr(); let n = 0;
    P.forEach((T, i) => { const ds = dateAdd(ev.date, i + 1); if (ds < t) return; const p = planFor(ds) || {}; send({ action: 'log', table: 'Overrides', row: { date: ds, session: T[0], load: T[1], time: (sessionFor0(ds) || { p: {} }).p.time || '07:00', daytype: p.daytype || 'sat', details: T[2], reason: 'post race' } }); n++; });
    LS.setItem('post-' + ev.name + ev.date, '1'); toast(n + ' recovery days set. Well done!', 3500);
  },
  postrej: (el) => { LS.setItem('post-' + el.dataset.n + el.dataset.d, '1'); render(); },
  prtsave: (el) => { const v = ($('#prt').value || '').trim(); if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(v)) { toast('Write it like 1:52:30'); return; } send({ action: 'log', table: 'PRs', row: { date: todayStr(), name: el.dataset.n, value: v, unit: 'time', note: 'race' } }); toast('Finish time saved'); confetti(); },
  spint: (el) => { spKeep(); S.sp.int = el.dataset.k; keepScroll('sp', sportBody()); },
  spkn: (el) => { spKeep(); const k = el.dataset.k, a = S.sp.kn; S.sp.kn = a.indexOf(k) >= 0 ? a.filter((x) => x !== k) : a.concat(k); keepScroll('sp', sportBody()); },
  spsave: () => {
    const m = Number($('#spm').value), r = $('#spr').value.trim(), ds = $('#spd').value, v = S.sp, mma = MMA.indexOf(v.type) >= 0;
    if (!(m >= 1 && m <= 600)) { toast('Minutes must be 1 to 600'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds) || ds > todayStr()) { toast('Pick a date up to today'); return; }
    const kn = mma ? (v.kn || []).join(', ') + ((v.kn || []).length && $('#spk').value.trim() ? ': ' : '') + $('#spk').value.trim() : '';
    send({ action: 'log', table: 'SportLog', row: { id: 's' + Date.now(), date: ds, type: v.type, rounds: r, minutes: String(m), rpe: String(v.rpe), note: ($('#spn').value || '').trim(), techniques: mma ? $('#spt').value.trim().slice(0, 200) : '', intensity: mma ? v.int || 'medium' : '', knocks: kn.slice(0, 120) } });
    closeSheets(); toast(v.type + ' saved · ' + m * v.rpe + ' load points');
    if (mma && /head/i.test(kn)) setTimeout(() => toast('Head knock logged. Headache, dizziness or blurred vision: stop and see a doctor.', 5000), 1600);
  },
  campopen: () => infoSheet('MMA camp', campBody(), 'camp'),
  campsave: () => { const n = $('#cpn').value.trim(), d = $('#cpd').value; if (!n) { toast('Name the camp'); return; } setCfg('camp', JSON.stringify({ name: n.slice(0, 40), date: d })); refreshSheet('camp', campBody()); toast('Camp saved'); },
  campoff: () => { setCfg('camp', ''); closeSheets(); toast('Camp ended'); },
  ramopen: () => infoSheet('Ramadan mode', ramBody(), 'ram'),
  ramsave: () => { const s = $('#rms').value, d = Number($('#rmd').value); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) { toast('Pick the first day'); return; } setCfg('ramadan', JSON.stringify({ start: s, days: d })); refreshSheet('ram', ramBody()); toast('Ramadan mode on from ' + niceDate(s)); },
  ramoff: () => { setCfg('ramadan', ''); closeSheets(); toast('Ramadan mode off'); },
  wiopen: () => { const B = myBase(); S.wiBase = B; S.wi = { sleep: Math.min(9.5, Math.max(5, B.sleep)), days: B.days, km: Math.min(80, B.km), kcal: 0, prot: Math.round(Math.min(250, Math.max(60, proteinTarget(150) || 150)) / 10) * 10 }; infoSheet('What if…', wiBody(), 'wi'); },
  gcopen: () => { const ev = nextRace(); S.gc = { kind: 'race', km: ev ? raceKm(ev) : 21.0975, target: ev && ev.goal, date: ev && ev.date }; infoSheet('Goal check', gcBody(), 'gc'); },
  gckind: (el) => { S.gc = { kind: el.dataset.k, km: 21.0975, lift: (exLib().find((x) => x.best) || {}).name }; keepScroll('gc', gcBody()); },
  gcgo: () => { const g = S.gc; g.target = $('#gct').value.trim(); g.date = $('#gcd').value; if ($('#gck')) g.km = Number($('#gck').value); if ($('#gcl')) g.lift = $('#gcl').value; if (!g.date || g.date <= todayStr()) { g.res = { err: 'Pick a future date' }; } else g.res = goalVerdict(g); keepScroll('gc', gcBody()); },
  restopen: (el) => { const k = el.dataset.k, R0 = RESTO[k]; infoSheet(R0[0], '<p class="mut small">' + esc(R0[1]) + '</p><ol class="warm-l">' + R0[2].map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol><button class="p" style="width:100%;margin-top:16px" data-act="restdone" data-k="' + k + '">Done</button>', 'rest'); },
  restdone: (el) => { const k = el.dataset.k, R0 = RESTO[k]; if (k === 'rest') LS.setItem('rest-' + todayStr(), '1'); else send({ action: 'log', table: 'SportLog', row: { id: 's' + Date.now(), date: todayStr(), type: k === 'walk' ? 'Walk' : k === 'mob' ? 'Mobility' : 'Sauna', rounds: '', minutes: String(R0[3]), rpe: '2', note: 'Rest: ' + R0[0], techniques: '', intensity: '', knocks: '' } }); closeSheets(); render(); toast('Nice. Rest day done right.'); },
  wropen: () => { S.wr = { feel: 0, bl: [], dec: {} }; infoSheet('Week review', wrBody(), 'wr'); },
  wrfeel: (el) => { S.wr.next = ($('#wrn') || {}).value || S.wr.next; S.wr.feel = Number(el.dataset.n); keepScroll('wr', wrBody()); },
  wrbl: (el) => { S.wr.next = ($('#wrn') || {}).value || S.wr.next; const k = el.dataset.k, a = S.wr.bl; S.wr.bl = a.indexOf(k) >= 0 ? a.filter((x) => x !== k) : a.concat(k); keepScroll('wr', wrBody()); },
  wrgo: async () => {
    const W = S.wr; W.next = $('#wrn').value.trim(); W.busy = true; W.err = ''; keepScroll('wr', wrBody());
    try { W.res = await call({ action: 'week_review', answers: { feel: String(W.feel), blockers: W.bl, next: W.next } }); D().cfg.wr_last = todayStr(); save(); } catch (e) { W.err = e.message === 'offline' ? 'You are offline.' : e.message; }
    W.busy = false; keepScroll('wr', wrBody());
  },
  wrdec: (el) => { const W = S.wr; W.dec[el.dataset.id] = W.dec[el.dataset.id] === el.dataset.v ? undefined : el.dataset.v; keepScroll('wr', wrBody()); },
  wrapply: () => {
    const W = S.wr; let n = 0;
    W.res.recs.filter((r) => W.dec[r.id] === 'accept').forEach((r) => {
      if (r.type === 'lighter') { const s = sessionFor0(r.date), L = s && lighten(s.p, 'ease'); if (L) { send({ action: 'log', table: 'Overrides', row: Object.assign({ date: r.date, reason: 'week review' }, L) }); n++; } }
      if (r.type === 'swap') { const a = sessionFor0(r.date), b = sessionFor0(r.date2); if (a && b) { [[r.date, b], [r.date2, a]].forEach(([ds, s]) => send({ action: 'log', table: 'Overrides', row: { date: ds, session: s.p.session, load: s.p.load, time: s.p.time, daytype: s.p.daytype || (planFor(ds) || {}).daytype, details: s.p.details, reason: 'week review' } })); n++; } }
    });
    closeSheets(); toast(n + ' change' + (n === 1 ? '' : 's') + ' made to next week', 3500);
  },
  prpopen: () => { S.prp = { kind: 'lift', lift: (exLib().find((x) => x.best) || {}).name || '', km: 5, weeks: 4 }; infoSheet('PR planner', prpBody(), 'prp'); },
  prpkind: (el) => { S.prp.kind = el.dataset.k; keepScroll('prp', prpBody()); },
  prpadd: () => {
    const p = S.prp, P = prPlan(p), ds = prDates(P, p.weeks); if (!ds.length) return;
    if (!confirm('Add your PR plan to ' + ds.length + ' sessions? The last one (' + niceDate(ds[ds.length - 1]) + ') becomes the test day.')) return;
    ds.forEach((d, i) => { const s = sessionFor0(d), last = i === ds.length - 1 && ds.length === p.weeks; send({ action: 'log', table: 'Overrides', row: { date: d, session: last ? P.label + ' PR test' : s.p.session, load: 'Hard', time: s.p.time, daytype: s.p.daytype || (planFor(d) || {}).daytype, details: last ? P.test : '# PR prep week ' + (i + 1) + '\n- ' + P.weeks[i][1] + '\n' + s.p.details, reason: 'pr plan' } }); });
    closeSheets(); toast('PR plan added. Target ' + P.target, 3500);
  }
});


/* ===================== batch7.js ===================== */
/* Apex batch 7: your Claude project knowledge inside the app.
   Profile, current plan, race report and notes (Knowledge tab) + heart-rate based run targets from your tested zones.
   Loaded after batch6.js, before app.js. */
const B7 = { id: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' };

/* ---------- simple markdown for the knowledge docs ---------- */
function mdHTML(t) {
  const inl = (x) => esc(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  let h = '', list = false, tbl = [];
  const flush = () => { if (list) { h += '</ul>'; list = false; } if (tbl.length) { const rows = tbl.filter((r) => !/^\s*\|?\s*-{2,}/.test(r)).map((r) => r.replace(/^\s*\||\|\s*$/g, '').split('|').map((c) => c.trim())); h += '<div class="md-t"><table>' + rows.map((r, i) => '<tr>' + r.map((c) => (i ? '<td>' : '<th>') + inl(c) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</table></div>'; tbl = []; } };
  String(t || '').split('\n').forEach((ln) => {
    if (/^\s*\|/.test(ln)) { if (list) { h += '</ul>'; list = false; } tbl.push(ln); return; }
    if (tbl.length) flush();
    if (/^#{1,2} /.test(ln)) { flush(); const lv = ln.match(/^#+/)[0].length; h += lv === 1 ? '' : '<p class="lbl">' + inl(ln.replace(/^#+\s*/, '')) + '</p>'; }
    else if (/^\s*([-*]|\d+\.)\s+/.test(ln)) { if (!list) { h += '<ul class="md-l">'; list = true; } h += '<li>' + inl(ln.replace(/^\s*([-*]|\d+\.)\s+/, '')) + '</li>'; }
    else if (!ln.trim()) flush();
    else { flush(); h += '<p class="md-p">' + inl(ln) + '</p>'; }
  });
  flush(); return h;
}
const KORD = ['profile', 'plan', 'notes', 'hyrox', 'log'];
function knowList() { return (D().knowledge || []).slice().sort((a, b) => (KORD.indexOf(a.key) + 1 || 99) - (KORD.indexOf(b.key) + 1 || 99)); }
function hrZones() {
  const mx = Number(D().cfg.max_hr); if (!mx) return null;
  return [['Z1 recovery', 0, 125], ['Z2 easy', 126, 156], ['Z3 moderate', 157, 172], ['Z4 hard', 173, 187], ['Z5 max', 188, mx]].map((z) => ({ n: z[0], lo: z[1], hi: z[2] }));
}
function knowBody() {
  const L = knowList(), c = D().cfg, Z = hrZones();
  return '<p class="mut small">From your Claude project. Your coach reads all of this before every answer, plan check and feedback. Edit it in the Knowledge tab of your Sheet.</p>' +
    (Z ? '<p class="lbl">Your heart-rate zones</p><div class="card list flat">' + Z.map((z) => '<div class="li"><span class="li-main"><b>' + esc(z.n) + '</b></span><span class="li-end">' + (z.lo ? z.lo + '–' : 'up to ') + z.hi + ' bpm</span></div>').join('') + '</div><p class="mut small">Max ' + esc(c.max_hr) + ' · threshold ' + esc(c.lthr || '?') + ' bpm' + (c.thr_pace ? ' at ' + esc(c.thr_pace) + ' /km' : '') + '. Easy runs: keep under ' + esc(c.easy_hr_cap || 150) + '.</p>' : '') +
    '<p class="lbl">Your notes</p><div class="card list flat">' + (L.length ? L.map((k) => '<button class="li" data-act="knowone" data-k="' + esc(k.key) + '"><span class="li-main"><b>' + esc(k.title) + '</b><span class="mut small">Updated ' + esc(niceDate(k.updated)) + '</span></span><span class="chev">›</span></button>').join('') : '<p class="empty-note">Nothing yet.</p>') + '</div>';
}

/* ---------- 1. run targets from your 20-min test, by heart rate ---------- */
const runZones7 = runZones;
runZones = function () {
  const T = secOf(D().cfg.thr_pace); if (!T) return runZones7();
  const g = goalPace(), race = g ? g.pace : T + 57;
  return { from: 'your 20-min test (' + D().cfg.thr_pace + ' /km)', race, easy: [T + 111, T + 146], long: [T + 111, T + 146], tempo: [T + 6, T + 16], intervals: [T - 24, T - 14] };
};
function hrFor(kind) {
  const c = D().cfg, cap = Number(c.easy_hr_cap) || 150, lt = Number(c.lthr) || 0; if (!Number(c.max_hr)) return null;
  return { easy: [0, cap, 'Keep HR under ' + cap + ', walk the hills if needed'], long: [0, cap, 'Keep HR under ' + cap + '; last 2 km may drift to 156'], tempo: lt ? [lt - 4, lt + 2, 'HR ' + (lt - 4) + '–' + (lt + 2) + ', comfortably hard'] : null, intervals: [182, 188, 'HR should reach 182–188 by the end of each rep'], race: [148, 158, 'Hold about HR 152; do not pass 158 before km 15'] }[kind];
}
const runWorkouts7 = runWorkouts;
runWorkouts = function () {
  const W = runWorkouts7(); if (!W) return W;
  Object.keys(W).forEach((k) => { const h = hrFor(k === 'race' ? 'race' : k); if (h) W[k] = [W[k][0], W[k][1], W[k][2] + '\n# Heart rate (your main target)\n- ' + h[2]]; });
  return W;
};
const runCheck7 = runCheck;
runCheck = function (a) {
  const r = runCheck7(a); if (!r) return r;
  const hr = Number(a.avg_hr), h = hrFor(r.kind); if (!hr || !h) return r;
  if ((r.kind === 'easy' || r.kind === 'long') && hr > h[1] + 3) return Object.assign({}, r, { ok: false, fast: true, text: 'Too hard by heart rate: average ' + hr + ' vs your easy cap ' + h[1] + '. Slow down next time, the pace will come.' });
  if ((r.kind === 'easy' || r.kind === 'long') && hr <= h[1] + 3) return Object.assign({}, r, { ok: true, fast: false, text: '✓ Easy by heart rate (average ' + hr + ', cap ' + h[1] + ')' + (r.ok ? '' : ' · pace ' + fmtSec(paceOf(a)) + ' /km is fine') });
  return r;
};

Object.assign(COACH_ACTS, {
  knowopen: () => infoSheet('About me', knowBody(), 'know'),
  knowone: (el) => { const k = (D().knowledge || []).find((x) => x.key === el.dataset.k); if (k) infoSheet(k.title, '<div class="md">' + mdHTML(k.text) + '</div>', 'know1'); }
});


/* ===================== batch8.js ===================== */
/* Apex batch 8: your saved Instagram reels inside the app.
   reels.json = 294 analyzed reels (title, creator, summary, key points, tags). Sessions link reels with [reel:ID].
   Loaded after batch7.js, before app.js. */
const RL = { list: null, busy: null };
function reelsLoad() {
  if (RL.list) return Promise.resolve(RL.list);
  if (!RL.busy) RL.busy = fetch('./reels.json').then((r) => r.json()).then((j) => { RL.list = j; RL.by = {}; j.forEach((x) => { RL.by[x.id] = x; }); return j; }).catch(() => { RL.busy = null; return []; });
  return RL.busy;
}
reelsLoad();
const reelT = (id) => (RL.by && RL.by[id] ? RL.by[id].t : 'Saved reel');
function reelChip(id) { return '<button class="reelchip" data-act="reelopen" data-id="' + esc(id) + '"><span aria-hidden="true">▶</span> ' + esc(reelT(id)) + '</button>'; }
// session text: "[reel:ID]" becomes a tappable chip
// called at the end of blocksHTML() in app.js
function reelify(h) {
  return h.indexOf('[reel:') < 0 ? h : h.replace(/(?:Reels:\s*)?((?:\[reel:[\w-]+\]\s*)+)/g, (m, g) => '<span class="reelrow">' + (g.match(/\[reel:([\w-]+)\]/g) || []).map((x) => reelChip(x.slice(6, -1))).join('') + '</span>');
};
function reelBody(r) {
  return '<p class="mut small">' + esc(r.c) + ' · ' + esc(r.g) + '</p><p>' + esc(r.s) + '</p>' + (r.p.length ? '<p class="lbl">Key points</p><ul class="md-l">' + r.p.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
    '<a class="p btn-a" style="margin-top:16px" href="' + esc(r.u) + '" target="_blank" rel="noopener">Watch on Instagram</a>';
}
// reels for an exercise name: best title/point matches
function reelsFor(name, n) {
  if (!RL.list) return [];
  const w = nk(name).replace(/\d+(\.\d+)?\s*kg|\+\s*\d+|\bx\b|\d+/g, ' ').split(/\s+/).filter((x) => x.length > 3 && !/each|side|sets?|reps?|with|weighted|minute/.test(x));
  if (!w.length) return [];
  const phrase = w.join(' ');
  return RL.list.map((r) => { const t = r.t.toLowerCase(), p = r.p.join(' ').toLowerCase(); let s = t.indexOf(phrase) >= 0 ? 5 : 0; w.forEach((x) => { if (t.indexOf(x) >= 0) s += 2; else if (p.indexOf(x) >= 0) s += 1; }); return [r, s]; })
    .filter((x) => x[1] >= Math.min(4, w.length * 2)).sort((a, b) => b[1] - a[1]).slice(0, n || 3).map((x) => x[0]);
}
const exSheetBody8 = exSheetBody;
exSheetBody = function () {
  const h = exSheetBody8(), R0 = reelsFor(S.ex.name, 3);
  if (!R0.length) return h;
  return h.replace('<p class="lbl">How to do it</p>', '<p class="lbl">From your saved reels</p><div class="reelrow">' + R0.map((r) => reelChip(r.id)).join('') + '</div><p class="lbl">How to do it</p>');
};
// browser
const RTAG = [['', 'All'], ['kettlebell', 'Kettlebell'], ['calisthenics', 'Calisthenics'], ['hyrox', 'HYROX'], ['boxing', 'Boxing'], ['mma', 'MMA'], ['legs', 'Legs'], ['core', 'Core'], ['mobility', 'Mobility'], ['animal flow', 'Animal flow'], ['stretching', 'Stretching'], ['emom', 'EMOM'], ['complex', 'Complexes'], ['landmine', 'Landmine'], ['grip', 'Grip']];
function rlBody() {
  if (!RL.list) return '<p class="mut">Loading your reels…</p>';
  const q = (S.rlq || '').toLowerCase(), tg = S.rlt || '';
  const L = RL.list.filter((r) => (!tg || r.tags.indexOf(tg) >= 0) && (!q || (r.t + ' ' + r.c + ' ' + r.s + ' ' + r.p.join(' ')).toLowerCase().indexOf(q) >= 0));
  return '<input id="rlq" type="search" placeholder="Search 294 reels: exercise, creator…" value="' + esc(S.rlq || '') + '" aria-label="Search reels">' +
    '<div class="chiprow rltags">' + RTAG.map(([k, l]) => '<button class="chip' + (k === tg ? ' on' : '') + '" aria-pressed="' + (k === tg) + '" data-act="rltag" data-k="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<p class="mut small">' + L.length + ' reel' + (L.length === 1 ? '' : 's') + '</p><div class="card list flat">' + L.slice(0, 40).map((r) => '<button class="li" data-act="reelopen" data-id="' + esc(r.id) + '"><span class="li-ic" style="background:#d6249f">' + ICON(I.play) + '</span><span class="li-main"><b>' + esc(r.t) + '</b><span class="mut small">' + esc(r.c) + '</span></span><span class="chev">›</span></button>').join('') + (L.length > 40 ? '<p class="empty-note">Showing 40. Search to narrow it down.</p>' : '') + (L.length ? '' : '<p class="empty-note">Nothing found.</p>') + '</div>';
}
document.addEventListener('input', (ev) => { if (ev.target.id === 'rlq') { S.rlq = ev.target.value; const pos = ev.target.selectionStart; refreshSheet('rl', rlBody()); const q = $('#rlq'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } } });
const toolsCard6 = toolsCard;
toolsCard = function () { return toolsCard6().replace(/<\/div>$/, '') + '<button class="tool" data-act="rlopen"><span class="li-ic" style="background:#d6249f">' + ICON(I.play) + '</span><b>Saved reels</b><span>Your 294 Instagram workouts</span></button></div>'; };
COACH_KEEP.push('rltag');
Object.assign(COACH_ACTS, {
  reelopen: async (el) => { await reelsLoad(); const r = RL.by && RL.by[el.dataset.id]; if (r) infoSheet(r.t, reelBody(r), 'reel'); else toast('Reel not found'); },
  rlopen: async () => { S.rlq = ''; S.rlt = ''; infoSheet('Saved reels', rlBody(), 'rl'); await reelsLoad(); refreshSheet('rl', rlBody()); },
  rltag: (el) => { S.rlt = el.dataset.k; keepScroll('rl', rlBody()); }
});
// chips rendered before reels.json arrived get their titles once it loads
reelsLoad().then(() => { document.querySelectorAll('.reelchip').forEach((b) => { const r = RL.by[b.dataset.id]; if (r) b.innerHTML = '<span aria-hidden="true">▶</span> ' + esc(r.t); }); });

/* ======================= redesigned Today timeline: meals + their supplements in one list ======================= */
function dayTimeline(ms, ml, next, p) {
  const SL = suppList(p.daytype), got = suppsTaken(todayStr()), sOn = SL.filter((x) => got.indexOf(x.name) >= 0).length;
  const done = ms.filter((m) => ml.some((r) => r.slot === m.slot)).length;
  const lab = { ate: 'Eaten', swap: 'Swapped', skipped: 'Skipped', next: 'Up next', todo: '' };
  const row = (m) => {
    const r = ml.find((x) => x.slot === m.slot), st = r ? r.status : m === next ? 'next' : 'todo', sp = SL.filter((x) => x.slot === m.slot);
    const sub = r ? lab[st] + (r.time ? ' ' + r.time : '') : st === 'next' ? 'Up next' + (Number(m.kcal) ? ' · ' + m.kcal + ' kcal' : '') : Number(m.kcal) ? m.kcal + ' kcal' : '';
    return '<li class="tr st-' + st + '"><span class="tr-t">' + esc(r && r.time ? r.time : m.time) + '</span><span class="tr-dot" aria-hidden="true">' + (st === 'next' ? '' : ST_ICON[st] || '') + '</span><div class="tr-b">' +
      '<button class="tr-m" data-act="msheet" data-slot="' + esc(m.slot) + '" aria-label="' + esc(m.name) + ', ' + esc(sub || 'not logged') + '"><b>' + esc(m.name.replace('Morning protocol', 'Morning').replace(' + soup', '')) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '<i class="chev" aria-hidden="true">›</i></button>' +
      (sp.length ? '<div class="tr-s" role="group" aria-label="Supplements with ' + esc(m.name) + '">' + sp.map((x) => { const on = got.indexOf(x.name) >= 0; return '<button class="spill' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="supp" data-n="' + esc(x.name) + '">' + (on ? '✓ ' : '') + esc(x.name) + '</button>'; }).join('') + '</div>' : '') + '</div></li>';
  };
  const extra = ml.filter((r) => r.status === 'extra').map((r) => '<li class="tr st-extra"><span class="tr-t">' + esc(r.time) + '</span><span class="tr-dot" aria-hidden="true">+</span><div class="tr-b"><button class="tr-m" data-act="msheet" data-slot="' + esc(r.slot) + '"><b>' + esc(r.extra_name) + '</b><span>Extra' + (r.kcal ? ' · ' + esc(r.kcal) + ' kcal' : '') + '</span><i class="chev" aria-hidden="true">›</i></button></div></li>');
  const all = ms.map((m) => [m.time, row(m)]).concat(extra.map((x, i) => [ml.filter((r) => r.status === 'extra')[i].time || '99', x])).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((x) => x[1]).join('');
  return '<section class="card tline"><div class="tline-h"><span><b>' + done + '</b> of ' + ms.length + ' meals</span>' + (SL.length ? '<span><b>' + sOn + '</b> of ' + SL.length + ' supplements</span>' : '') + '</div><ol class="trs">' + all + '</ol>' +
    '<button class="tr-add" data-act="mextra">' + ICON(I.plus) + ' Add a snack or extra food</button></section>';
}

/* ======================= reels for the program builder =======================
   Picks up to 40 of your saved reels that fit the new program (day focus, goals, notes),
   reels you also saved as links first. Sent compactly: id, title, tags, first key points. */
const FOCUS_TAGS = { legs: ['legs', 'power', 'hips'], calisth: ['calisthenics', 'shoulders', 'grip', 'core', 'muscle-up'], pull: ['calisthenics', 'grip', 'shoulders'], push: ['calisthenics', 'shoulders', 'core'],
  kettle: ['kettlebell', 'complex', 'emom'], condition: ['emom', 'amrap', 'hyrox', 'complex', 'kettlebell', 'carry'], hyrox: ['hyrox', 'carry', 'emom', 'kettlebell'], mobil: ['mobility', 'hips', 'spine', 'stretching', 'animal flow'],
  rest: ['mobility', 'stretching'], run: ['running', 'legs', 'hips'], strik: ['boxing', 'mma', 'power'], box: ['boxing', 'mma'], mma: ['mma', 'boxing', 'grip'], grappl: ['mma', 'grip', 'core'], core: ['core', 'spine'], animal: ['animal flow', 'mobility'], strength: ['power', 'legs', 'calisthenics'] };
function pickReels(P, list) {
  list = list || RL.list || []; if (!list.length) return [];
  const words = [].concat(P.goals || [], Object.values(P.days || {}), [P.notes || '']).join(' ').toLowerCase();
  const want = {}; Object.keys(FOCUS_TAGS).forEach((k) => { if (words.indexOf(k) >= 0) FOCUS_TAGS[k].forEach((t, i) => { want[t] = (want[t] || 0) + (i === 0 ? 3 : 1); }); });
  if (!Object.keys(want).length) ['legs', 'calisthenics', 'kettlebell', 'mobility', 'core'].forEach((t) => { want[t] = 1; });
  const noteW = String(P.notes || '').toLowerCase().split(/[^a-z-]+/).filter((x) => x.length > 4);
  const saved = {}; (D().library || []).forEach((l) => { const m = String(l.url || '').match(/\/(?:reel|p)\/([\w-]+)/); if (m) saved[m[1]] = l.note || true; });
  const sc = list.map((r) => { let s = saved[r.id] ? (typeof saved[r.id] === 'string' ? 60 : 50) : 0; (r.tags || []).forEach((t) => { s += want[t] || 0; }); const tl = r.t.toLowerCase(); noteW.forEach((w) => { if (tl.indexOf(w) >= 0) s += 2; }); return [r, s]; })
    .filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const per = {}, out = [];
  for (const [r] of sc) { const k = (r.tags || [])[0] || 'other'; if ((per[k] = (per[k] || 0) + 1) > 10 && !saved[r.id]) continue; out.push(r); if (out.length >= 40) break; }
  return out.map((r) => ({ id: r.id, t: r.t.slice(0, 90), tags: (r.tags || []).slice(0, 4), p: (r.p || []).slice(0, 4).map((x) => String(x).slice(0, 110)), note: typeof saved[r.id] === 'string' ? saved[r.id].slice(0, 120) : '' }));
}


/* ===================== batch9.js ===================== */
/* Apex batch 9: "Recommended" on the home card, rest today, plan a break with a comeback,
   and a log of every choice you make so the coach plans around what you really do.
   Loaded after batch8.js, before app.js. */

/* ======================= decisions log ======================= */
function decide(kind, what, choice, note) {
  send({ action: 'log', table: 'Decisions', row: { id: 'd' + Date.now() + Math.random().toString(36).slice(2, 5), date: todayStr(), kind: String(kind).slice(0, 40), what: String(what || '').slice(0, 200), choice: String(choice).slice(0, 40), note: String(note || '').slice(0, 300) } });
}
// existing accept / reject buttons all over the app get logged too
const DLOG = {
  vacc: ['WHOOP recommendation', 'accepted'], vrej: ['WHOOP recommendation', 'rejected'],
  nightacc: ['short night', 'accepted'], nightrej: ['short night', 'rejected'],
  dlacc: ['deload', 'accepted'], dlrej: ['deload', 'rejected'], easeacc: ['ease back', 'accepted'], easerej: ['ease back', 'rejected'],
  sacc: ['coach suggestion', 'accepted'], srej: ['coach suggestion', 'rejected'],
  ruleon: ['personal rule', 'accepted'], ruleno: ['personal rule', 'rejected'],
  postacc: ['post-race recovery', 'accepted'], postrej: ['post-race recovery', 'rejected'],
  rwapply: ['race taper', 'accepted'], adjuse: ['session change', 'accepted'], wskip: ['session', 'skipped'], mskip: ['meal', 'skipped'], mswap: ['meal', 'swapped']
};
document.addEventListener('click', (ev) => {
  const el = ev.target.closest && ev.target.closest('[data-act]'); if (!el || !DLOG[el.dataset.act]) return;
  const a = el.dataset.act, L = DLOG[a], ses = sessionFor0(todayStr());
  let what = el.dataset.t || el.dataset.slot || (ses ? ses.p.session : '');
  if (a === 'adjuse' && S.adj) what = S.adj.mode + ': ' + ((sessionFor0(S.adj.ds) || { p: {} }).p.session || '');
  try { decide(L[0], what, L[1], ''); } catch (e) { /* never block the real action */ }
}, true);

/* ======================= comeback-style lighter sessions ======================= */
function comeback(p, level) {
  const L = lighten(p, level); if (!L) return null;
  if (/run|jog|tempo|interval/i.test(p.session)) {
    const f = level === 'deload' ? 0.5 : 0.75;
    const km = (t) => t.replace(/(\d+(?:\.\d+)?)\s*km\b/g, (m, k) => Math.max(3, Math.round(Number(k) * f)) + ' km');
    L.details = L.details.split('\n').map((l) => km(l).replace(/race effort: HR 150-155[^,\n]*/gi, 'easy, HR under 150').replace(/race rehearsal/gi, 'easy').replace(/at race pace[^,\n]*/gi, 'at easy pace, HR under 150')).join('\n');
    L.session = km(p.session).replace(/:?\s*race rehearsal/i, '').replace(/race[- ]pace run/i, 'easy run').replace(/\b(tempo|interval)s? run/i, 'easy run') + (level === 'deload' ? ' (comeback)' : ' (easing in)');
  } else L.session = p.session + (level === 'deload' ? ' (comeback)' : ' (easing in)');
  L.details = L.details.replace(/Deload week: about 60-70%[^\n]*|Easing back in: about 80%[^\n]*/, level === 'deload' ? 'Comeback: about 60% of your usual weights, half the sets, runs shorter and easy. You should finish feeling you could do more.' : 'Comeback week 2: about 80% of your weights, runs 75% of the distance.');
  return L;
}

/* ======================= Recommended (home card) ======================= */
function todayRecs(ds) {
  const out = [], s0 = sessionFor0(ds), ses = sessionFor(ds), w = whoopFor(ds), ch = verdictChoice(ds);
  if (!s0 || s0.p.load === 'Rest' || logs('WorkoutLog', ds).length) return out;
  if (D().overrides.some((o) => o.date === ds)) return out;
  const hid = (id) => LS.getItem('recx-' + ds + id);
  const v = w && /^(reduce|swap)$/.test(w.verdict) ? w.verdict : null;
  if (v && !ch && s0.p.load !== 'Recovery') out.push({ id: 'whoop', title: v === 'swap' ? 'Swap to Active Recovery today' : 'Do it, but lighter', why: 'WHOOP recovery ' + w.recovery + '%. ' + (w.reason || ''), acc: 'vacc', rej: 'vrej' });
  const sh = w && Number(w.sleep_hours);
  if (sh && sh < 6 && s0.p.load === 'Hard' && !LS.getItem('night-' + ds)) out.push({ id: 'night', title: 'Lighter session after a short night', why: 'You slept ' + w.sleep_hours + ' h. Hard training on under 6 h raises injury risk and gives less back.', acc: 'nightacc', rej: 'nightrej', prev: lowEnergy(s0) });
  const rec = w && Number(w.recovery), lb = loadBalance();
  if (!v && s0.p.load === 'Hard' && ((rec && rec < 40) || lb.ratio > 1.3) && !hid('easy')) { const L = lighten(s0.p, 'ease'); if (L) out.push({ id: 'easy', title: 'Ease today’s session', why: rec && rec < 40 ? 'Recovery is ' + rec + '%.' : 'Your training load is ' + Math.round((lb.ratio - 1) * 100) + '% above your normal this week.', prev: L.details, row: Object.assign({ reason: 'recommended: easier' }, L) }); }
  const dl = deloadCheck(); if (dl && !hid('deload')) out.push({ id: 'deload', title: 'Start a lighter week', why: (dl.why || []).slice(0, 3).join(' · ') || 'Several fatigue signs at once.', acc: 'dlacc', rej: 'dlrej' });
  const sk = H().workouts.filter((x) => x.session === s0.p.session && x.date < ds && x.date >= dateAdd(ds, -42)), skN = sk.filter((x) => x.status === 'skipped').length;
  if (sk.length >= 3 && skN / sk.length >= 0.5 && !hid('short')) { const P = shortPlan(s0.p.details, 30); out.push({ id: 'short', title: 'Do the 30-minute version', why: 'You skipped ' + s0.p.session + ' ' + skN + ' of the last ' + sk.length + ' times. A short version you do beats a long one you skip.', prev: P.details, row: { session: s0.p.session + ' (30 min)', load: s0.p.load, time: s0.p.time, daytype: s0.p.daytype, details: P.details, reason: 'recommended: short version' } }); }
  return out.filter((r) => !hid(r.id) || r.acc).slice(0, 3);
}
function recBody(ds) {
  const R0 = todayRecs(ds);
  if (!R0.length) return '<p class="mut">No changes recommended right now. Train as planned.</p>';
  return '<p class="mut small">Based on your recovery, sleep, training load and what you usually do. Accept or reject each one.</p>' + R0.map((r, i) => '<div class="rec' + (i ? '' : ' top') + '"><b>' + esc(r.title) + '</b><p class="mut small">' + esc(r.why) + '</p>' +
    (r.prev ? '<details class="recprev"><summary>See the new session</summary><div class="card adjprev">' + blocksHTML(r.prev, 'rec-' + r.id) + '</div></details>' : '') +
    '<div class="row"><button class="g" data-act="' + (r.acc || 'recacc') + '" data-id="' + r.id + '" data-t="' + esc(r.title) + '">Accept</button><button class="r" data-act="' + (r.rej || 'recrej') + '" data-id="' + r.id + '" data-t="' + esc(r.title) + '">Reject</button></div></div>').join('');
}

/* ======================= rest today ======================= */
const OFFWHY = [['tired', 'Tired'], ['sore', 'Sore'], ['busy', 'No time'], ['ill', 'Feeling ill'], ['travel', 'Travelling'], ['mind', 'Need a mental break']];
function nextFree(ds) { for (let i = 1; i <= 6; i++) { const d = dateAdd(ds, i), s = sessionFor0(d); if (!s || s.p.load === 'Rest') return d; } return null; }
function offBody() {
  const O = S.off, ds = todayStr(), s0 = sessionFor0(ds), key = s0 && s0.p.load === 'Hard', free = key ? nextFree(ds) : null;
  const pick = { tired: 'rest', sore: 'mob', busy: 'walk', travel: 'walk', mind: 'walk' }[O.why] || restPick()[0];
  let h = '<p class="lbl" style="margin-top:0">Why are you resting?</p><div class="chiprow">' + OFFWHY.map(([k, l]) => '<button class="chip' + (O.why === k ? ' on' : '') + '" aria-pressed="' + (O.why === k) + '" data-act="offwhy" data-k="' + k + '">' + l + '</button>').join('') + '</div>';
  if (!O.why) return h + '<p class="mut small">Your answer changes what I recommend.</p>';
  if (O.why === 'ill') return h + '<p class="fb-next"><b>Use illness mode</b>It pauses the next 3 days and eases you back in after.</p><button class="p" style="width:100%" data-act="sickopen">Open illness mode</button>';
  const tip = { tired: 'Full rest, early night. If you wake fresh tomorrow, train as planned.', sore: '15 minutes of easy mobility helps soreness more than lying still.', busy: 'Even a 20-minute walk keeps the habit. Nothing else needed.', travel: 'Walk where you are, drink extra water, keep protein high.', mind: 'A walk outside, no tracking. Come back tomorrow fresh.' }[O.why];
  h += '<p class="lbl">What to do today</p><div class="rec top"><b>' + esc(RESTO[pick][0]) + '</b><p class="mut small">' + esc(tip) + '</p></div>';
  if (s0 && s0.p.load !== 'Rest') {
    h += '<p class="lbl">What happens to ' + esc(s0.p.session) + '?</p><div class="card list flat">' +
      (free ? '<button class="li wrap' + (O.move === 'move' ? ' sel' : '') + '" aria-pressed="' + (O.move === 'move') + '" data-act="offmove" data-k="move"><span class="li-main"><b>Move it to ' + esc(niceDate(free)) + '</b><span class="mut small">Your next free day. You lose that rest day, so only if you feel ready.</span></span><span class="chev">' + (O.move === 'move' ? '✓' : '') + '</span></button>' : '') +
      '<button class="li wrap' + (O.move === 'skip' ? ' sel' : '') + '" aria-pressed="' + (O.move === 'skip') + '" data-act="offmove" data-k="skip"><span class="li-main"><b>Skip it</b><span class="mut small">' + (key ? 'One missed session costs nothing. ' : '') + 'The plan continues tomorrow as normal.</span></span><span class="chev">' + (O.move === 'skip' ? '✓' : '') + '</span></button></div>';
  }
  return h + '<button class="p" style="width:100%;margin-top:16px" data-act="offgo"' + (s0 && s0.p.load !== 'Rest' && !O.move ? ' disabled' : '') + '>Rest today</button><button class="txt" style="margin-top:10px" data-act="breakopen">Need more than a day? Plan a break</button>';
}

/* ======================= break + comeback ======================= */
const BRWHY = [['holiday', 'Holiday'], ['travel', 'Travel'], ['busy', 'Busy period'], ['ill', 'Illness'], ['injury', 'Injury'], ['tired', 'Burned out']];
function breakPlan(B) {
  const n = Math.max(1, Math.min(28, daysBetween(B.from, B.to) + 1)), end = dateAdd(B.from, n - 1), ph = n <= 3 ? [[2, 'ease']] : n <= 7 ? [[3, 'deload'], [4, 'ease']] : n <= 14 ? [[7, 'deload'], [7, 'ease']] : [[7, 'deload'], [7, 'deload'], [7, 'ease']];
  // pausing moves the whole plan later; never with a race in the next 8 weeks, or race day would no longer match the race
  const raceAhead = (D().events || []).some((e) => e.date && e.status !== 'done' && e.date > B.to && e.date <= dateAdd(B.to, 8 * 7));
  const shift = B.mode === 'pause' && n >= 5 && !raceAhead ? Math.max(1, Math.round(n / 7)) * 7 : 0, back = [];
  let d = dateAdd(end, 1) > todayStr() ? dateAdd(end, 1) : todayStr();
  ph.forEach(([days, lv]) => { for (let i = 0; i < days; i++, d = dateAdd(d, 1)) back.push([d, lv]); });
  // race week and the days right after a race keep their own plan (taper / post race), never a comeback session
  const evs = (D().events || []).filter((e) => e.date && e.date >= B.from), near = (x) => evs.some((e) => x >= dateAdd(e.date, -6) && x <= dateAdd(e.date, 2));
  const raceIn = evs.filter((e) => e.date <= end);
  return { n, end, shift, back: back.filter(([x]) => !near(x)), raceIn };
}
function breakSes(ds, shift) {
  if (!shift) return sessionFor0(ds);
  const c = D().cfg, st0 = c.program_start; c.program_start = dateAdd(st0, shift);
  try { return sessionFor0(ds); } finally { c.program_start = st0; }
}
function breakBody() {
  const B = S.brk, P = breakPlan(B), ev = nextRace(), raceSoon = ev && daysBetween(todayStr(), ev.date) <= 42;
  const dur = { holiday: 'Walk every day, swim or play if you can. Bodyweight 20 min every 2-3 days keeps your strength.', travel: 'Hotel-room bodyweight sessions (20 min) or walks. Protein at every meal.', busy: 'Two 20-minute bodyweight or KB sessions a week keep almost all your fitness.', ill: 'Full rest until symptoms are gone. Walks only if above the neck.', injury: 'Train what does not hurt. Keep your rehab sessions. See your physio before coming back.', tired: 'Real rest: sleep, walks, mobility. No hard training at all.' }[B.why] || 'Walk daily, sleep well, keep protein high.';
  const ln = (ds, lv) => { const s = breakSes(ds, P.shift); if (!s || s.p.load === 'Rest') return ''; return '<div class="li"><span class="li-main"><b>' + esc(niceDate(ds)) + '</b><span class="mut small">' + esc(s.p.session) + '</span></span><span class="li-end"><span class="tag ' + (lv === 'deload' ? 'recovery' : 'moderate') + '">' + (lv === 'deload' ? '60%' : '80%') + '</span></span></div>'; };
  return '<p class="mut small">Rest days, then a comeback that builds you back up so you don’t start too heavy.</p>' +
    '<div class="row two"><div><label class="mut small" for="brf">From</label><input type="date" id="brf" min="' + dateAdd(todayStr(), -30) + '" value="' + esc(B.from) + '"></div><div><label class="mut small" for="brt">To</label><input type="date" id="brt" min="' + esc(B.from) + '" max="' + dateAdd(B.from, 27) + '" value="' + esc(B.to) + '"></div></div>' +
    '<p class="mut small">' + P.n + ' day' + (P.n > 1 ? 's' : '') + ' off' + (B.from < todayStr() ? ' · past days are saved as rest, the comeback starts ' + (P.back.length ? esc(niceDate(P.back[0][0])) : 'now') : '') + '. Up to 28 days, back to 30 days ago.</p>' +
    (P.raceIn.length ? '<p class="warnline">⚠ ' + esc(P.raceIn.map((e) => e.name + ' (' + niceDate(e.date) + ')').join(', ')) + ' is inside this break. Race days stay as planned.</p>' : '') +
    '<p class="lbl">Why?</p><div class="chiprow">' + BRWHY.map(([k, l]) => '<button class="chip' + (B.why === k ? ' on' : '') + '" aria-pressed="' + (B.why === k) + '" data-act="brwhy" data-k="' + k + '">' + l + '</button>').join('') + '</div>' +
    (P.n >= 5 ? '<p class="lbl">Your program</p><div class="segc" role="group" aria-label="Program"><button class="' + (B.mode === 'keep' ? 'on' : '') + '" aria-pressed="' + (B.mode === 'keep') + '" data-act="brmode" data-k="keep">Keep the dates</button><button class="' + (B.mode === 'pause' ? 'on' : '') + '" aria-pressed="' + (B.mode === 'pause') + '" data-act="brmode" data-k="pause">Pause it</button></div><p class="mut small">' + (B.mode === 'pause' ? 'You continue where you stopped: the program moves ' + P.shift / 7 + ' week' + (P.shift > 7 ? 's' : '') + ' later.' : 'Missed sessions are skipped and you rejoin the calendar.') + (raceSoon ? ' ' + esc(ev.name) + ' is in ' + daysBetween(todayStr(), ev.date) + ' days, so keeping the dates is safer.' : '') + '</p>' : '') +
    '<p class="lbl">During the break</p><p class="small">' + esc(dur) + '</p>' +
    '<p class="lbl">Comeback · ' + P.back.length + ' days</p><div class="card list flat">' + (P.back.map(([d, lv]) => ln(d, lv)).join('') || '<p class="empty-note">Rest days only.</p>') + '</div>' +
    '<p class="mut small">' + esc(niceDate(B.from)) + ' to ' + esc(niceDate(P.end)) + ' off. You can undo any day from Train.</p>' +
    '<button class="p" style="width:100%;margin-top:12px" data-act="brgo"' + (B.why ? '' : ' disabled') + '>' + (B.why ? 'Set ' + P.n + ' day' + (P.n > 1 ? 's' : '') + ' off + comeback' : 'Pick a reason first') + '</button>';
}

/* ======================= your choices (Insights › You) ======================= */
function choicesCard() {
  const L = (D().decisions || []).filter((x) => x.date >= dateAdd(todayStr(), -90)); if (L.length < 3) return '';
  const rec = L.filter((x) => /accept|reject/.test(x.choice) && !/meal|session/.test(x.kind)), acc = rec.filter((x) => /accept/.test(x.choice)).length;
  const by = {}; rec.forEach((x) => { const o = by[x.kind] = by[x.kind] || [0, 0]; o[/accept/.test(x.choice) ? 0 : 1]++; });
  const rejTop = Object.keys(by).filter((k) => by[k][1] >= 2).sort((a, b) => by[b][1] - by[a][1])[0], rest = L.filter((x) => x.kind === 'rest day' || x.kind === 'break');
  return '<h2>Your choices · 90 days</h2><div class="card list">' +
    (rec.length ? '<div class="li"><span class="li-main"><b>Recommendations accepted</b><span class="mut small">' + acc + ' of ' + rec.length + (rejTop ? ' · you usually say no to "' + esc(rejTop) + '"' : '') + '</span></span><span class="li-end"><b class="pr-v">' + Math.round(acc / rec.length * 100) + '%</b></span></div>' : '') +
    '<div class="li"><span class="li-main"><b>Rest days and breaks you took</b><span class="mut small">' + (rest.length ? esc([...new Set(rest.map((x) => x.note).filter(Boolean))].slice(0, 3).join(', ')) : 'None') + '</span></span><span class="li-end"><b class="pr-v">' + rest.length + '</b></span></div>' +
    '<div class="li"><span class="li-main"><b>Sessions skipped</b><span class="mut small">Your coach plans around this</span></span><span class="li-end"><b class="pr-v">' + L.filter((x) => x.kind === 'session' && x.choice === 'skipped').length + '</b></span></div></div><p class="foot">Every choice you make is saved. Your coach, the monthly plan check, the week review and new programs use it.</p>';
}

/* ======================= actions ======================= */
COACH_KEEP.push('offwhy', 'offmove', 'brwhy', 'brmode', 'recacc', 'recrej');
document.addEventListener('change', (ev) => {
  if (!S.brk || (ev.target.id !== 'brf' && ev.target.id !== 'brt')) return;
  const f = $('#brf').value, t = $('#brt').value, B = S.brk, ok = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x);
  if (ev.target.id === 'brf' && ok(f)) { if (f < dateAdd(todayStr(), -30)) toast('Up to 30 days back'); else { const len = daysBetween(B.from, B.to); B.from = f; B.to = dateAdd(f, len); } }
  if (ev.target.id === 'brt' && ok(t)) { if (t < B.from) toast('The end must be after the start'); else if (daysBetween(B.from, t) > 27) { toast('Up to 28 days'); B.to = dateAdd(B.from, 27); } else B.to = t; }
  clearTimeout(S.brkT); S.brkT = setTimeout(() => { if (document.querySelector('.modal.info')) keepScroll('brk', breakBody()); }, 50);
});
Object.assign(COACH_ACTS, {
  recopen: () => infoSheet('Recommended for today', recBody(todayStr()), 'rec'),
  recacc: (el) => {
    const ds = todayStr(), r = todayRecs(ds).find((x) => x.id === el.dataset.id); if (!r || !r.row) return;
    send({ action: 'log', table: 'Overrides', row: Object.assign({ date: ds }, r.row) }); decide('recommendation: ' + r.id, r.title, 'accepted', '');
    closeSheets(); toast('Session changed. Undo anytime from Train.');
  },
  recrej: (el) => { LS.setItem('recx-' + todayStr() + el.dataset.id, '1'); decide('recommendation: ' + el.dataset.id, el.dataset.t, 'rejected', ''); keepScroll('rec', recBody(todayStr())); render(); },
  offopen: () => { S.off = { why: '', move: '' }; infoSheet('Rest today', offBody(), 'off'); },
  offwhy: (el) => { S.off.why = el.dataset.k; keepScroll('off', offBody()); },
  offmove: (el) => { S.off.move = el.dataset.k; keepScroll('off', offBody()); },
  offgo: () => {
    const ds = todayStr(), s0 = sessionFor0(ds), O = S.off, free = s0 && s0.p.load === 'Hard' ? nextFree(ds) : null;
    send({ action: 'log', table: 'Overrides', row: { date: ds, session: 'Rest day', load: 'Rest', time: (s0 && s0.p.time) || '09:00', daytype: 'sat', details: '# Rest\n- ' + ({ tired: 'Full rest, early night', sore: '15 min easy mobility', busy: '20-minute walk if you can', travel: 'Walk, extra water, protein high', mind: 'A walk outside, no tracking' }[O.why] || 'Rest'), reason: 'rest day: ' + O.why } });
    if (O.move === 'move' && free && s0) send({ action: 'log', table: 'Overrides', row: { date: free, session: s0.p.session, load: s0.p.load, time: s0.p.time, daytype: s0.p.daytype || (planFor(free) || {}).daytype, details: s0.p.details, reason: 'moved from rest day' } });
    decide('rest day', s0 ? s0.p.session : '', O.move === 'move' ? 'moved' : 'accepted', O.why);
    closeSheets(); toast(O.move === 'move' ? 'Rest today. ' + s0.p.session + ' moved to ' + niceDate(free) + '.' : 'Rest today. Enjoy it.', 3500);
  },
  restcancel: () => {
    const ds = todayStr(), o = D().overrides.find((x) => x.date === ds); if (!o) return;
    const br = /^break/.test(o.reason || '');
    if (!confirm(br ? 'Train today instead? Today comes off your break. The rest of the break stays.' : 'Train today instead? Your planned session comes back.')) return;
    send({ action: 'del', table: 'Overrides', row: { date: ds } });
    if (/^rest day/.test(o.reason || '')) D().overrides.filter((x) => x.reason === 'moved from rest day' && x.date > ds && x.session === (planFor(ds) || {}).session).slice(0, 1).forEach((x) => send({ action: 'del', table: 'Overrides', row: { date: x.date } }));
    decide(br ? 'break' : 'rest day', 'trained instead', 'rejected', ''); toast('Back on: ' + ((planFor(ds) || {}).session || 'today’s plan') + '.', 3000);
  },
  breakopen: () => { const ev = nextRace(); S.brk = { from: todayStr(), to: dateAdd(todayStr(), 6), why: '', mode: ev && daysBetween(todayStr(), ev.date) <= 42 ? 'keep' : 'pause' }; infoSheet('Plan a break', breakBody(), 'brk'); },
  brwhy: (el) => { S.brk.why = el.dataset.k; keepScroll('brk', breakBody()); },
  brmode: (el) => { S.brk.mode = el.dataset.k; keepScroll('brk', breakBody()); },
  brgo: () => {
    const B = S.brk, P = breakPlan(B); if (!B.why) return;
    if (!confirm(P.n + ' days off, ' + niceDate(B.from) + ' to ' + niceDate(P.end) + ', then a ' + P.back.length + '-day comeback. OK?')) return;
    if (P.shift) setCfg('program_start', dateAdd(D().cfg.program_start, P.shift));
    for (let i = 0; i < P.n; i++) { const ds = dateAdd(B.from, i); if (logs('WorkoutLog', ds).some((x) => x.status === 'done') || P.raceIn.some((e) => e.date === ds)) continue; send({ action: 'log', table: 'Overrides', row: { date: ds, session: 'Break: rest', load: 'Rest', time: '09:00', daytype: 'sat', details: '# Break day\n- Walk 20-40 min if you feel like it\n- Sleep, water, protein', reason: 'break: ' + B.why } }); }
    let n = 0; P.back.forEach(([ds, lv]) => { const s = sessionFor0(ds), L = s && comeback(s.p, lv); if (L) { send({ action: 'log', table: 'Overrides', row: Object.assign({ date: ds, reason: 'comeback' }, L) }); n++; } });
    decide('break', P.n + ' days, ' + B.from + ' to ' + P.end + (P.shift ? ', program paused' : ''), 'accepted', B.why);
    closeSheets(); toast(P.n + ' days off set. Comeback: ' + n + ' lighter sessions after.', 4000);
  }
});


/* ===================== app.js ===================== */

/* Apex app. Talks to your Apps Script web app with POST only (token never in a URL).
   Everything is cached on the phone; writes queue offline and upload in order. */
const LS = window.localStorage;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const jget = (k, d) => { try { const v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };

const S = { url: LS.getItem('url') || '', token: LS.getItem('token') || '', data: jget('data', null), queue: jget('queue', []), failed: jget('failed', []), tab: 'today', viewDay: null, libTab: null, busy: false, lastTap: 0 };

/* ---------- limits (same as the server) ---------- */
const LIM = { kcal: [0, 5000], weight: [20, 300], waist: [40, 200], waterMax: 10000, waterWarn: 6000 };

/* ---------- dates ---------- */
const tz = () => travelTz() || (S.data && S.data.cfg && S.data.cfg.timezone) || 'Africa/Cairo';
function local(d) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d || new Date());
  const g = (t) => p.find((x) => x.type === t).value;
  const h = g('hour') === '24' ? '00' : g('hour');
  return { date: g('year') + '-' + g('month') + '-' + g('day'), time: h + ':' + g('minute'), hour: Number(h) };
}
const todayStr = () => local().date;
// "1 days" → "1 day" everywhere text is rendered (only exact 1, never 21 or 0.1)
const PLU = /(^|[^\d.,])1 (day|session|week|meal|exercise|hour|time|minute|supplement|run|workout|thing|block|night|set|rep|round|lighter session)s\b/g;
const plural = (h) => String(h).replace(PLU, '$11 $2');
const nowTime = () => local().time;
function dateAdd(ds, n) { const d = new Date(ds + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5); }
function dow(ds) { return DAYS[new Date(ds + 'T12:00:00Z').getUTCDay()]; }
// plan weeks start on the program_start weekday (Saturday for the current plan); Sunday if no start is set
function weekIdx(ds) { const st = S.data && S.data.cfg.program_start; return st ? ((daysBetween(st, ds) % 7) + 7) % 7 : new Date(ds + 'T12:00:00Z').getUTCDay(); }
function weekStart(ds) { return dateAdd(ds, -weekIdx(ds)); }
// "Week 2 of 4", "Starts Sat 21 Nov" or "Block done · repeating week 2"
function weekLabel(ds) {
  const st = S.data && S.data.cfg.program_start, N = planWeeks();
  if (!(S.data && (S.data.plan || []).length)) return 'No program yet';
  if (!st) return 'Week ' + weekNo(ds) + ' of ' + N;
  const diff = daysBetween(st, ds);
  if (diff < 0) return 'Plan starts ' + (diff === -1 ? 'tomorrow' : niceDate(st));
  if (diff >= N * 7) return 'Block done · repeating week ' + weekNo(ds);
  return 'Week ' + weekNo(ds) + ' of ' + N;
}
function weekNo(ds) {
  const start = (S.data && S.data.cfg.program_start) || ds;
  const diff = daysBetween(start, ds);
  return diff < 0 ? 1 : (Math.floor(diff / 7) % planWeeks()) + 1;
}
// Accepts "2026-11-16 07:02", "2026-11-16" or a full ISO/Date string; returns null when unreadable.
function parseStamp(x) {
  if (!x) return null;
  const s = String(x), m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ ](\d{2}:\d{2}))?$/);
  if (m) return { d: m[1], t: m[2] || '' };
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  const L = local(dt); return { d: L.date, t: L.time };
}
function ago(stamp) {
  const p = parseStamp(stamp); if (!p) return 'never';
  const n = daysBetween(p.d, todayStr()); if (!isFinite(n)) return 'never';
  return n <= 0 ? 'today ' + p.t : n === 1 ? 'yesterday ' + p.t : n + ' days ago';
}
function updatedLabel() {
  const c = D().cfg;
  if (S.busy) return '<p class="upd busy"><i></i>Syncing WHOOP and Strava…</p>';
  if (c.last_sync_error && D().connected.whoop) return '<p class="upd bad"><i></i>Last sync had a problem · see below</p>';
  const a = ago(c.last_sync_ok);
  if (a === 'never') return '<p class="upd off"><i></i>Not synced yet · pull down to sync</p>';
  return '<p class="upd"><i></i>Updated ' + esc(a.replace('today ', '')) + '</p>';
}
let toastT;
const toast = (m, ms) => {
  const t = $('#toast'), U = S.undo, can = U && !U.used && Date.now() - U.at < 1500;
  t.innerHTML = '<span class="tmsg">' + plural(esc(m)) + '</span>'; if (can) { U.shown = true; t.insertAdjacentHTML('beforeend', '<button class="undo" data-undo="1">Undo</button>'); ms = Math.max(ms || 0, 5000); }
  t.className = 'on' + (can ? ' act' : ''); clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), ms || 2200);
};

/* ---------- API (POST only) ---------- */
class Reject extends Error {}
async function call(body) {
  let j;
  try {
    const r = await fetch(S.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ token: S.token }, body)) });
    j = await r.json();
  } catch (e) { throw new Error('offline'); }
  if (!j.ok) { if (j.reject) throw new Reject(j.error); throw new Error(j.error || 'failed'); }
  return j;
}
function save() { LS.setItem('data', JSON.stringify(S.data)); LS.setItem('queue', JSON.stringify(S.queue)); LS.setItem('failed', JSON.stringify(S.failed)); }

// B2: a rejected item is moved aside so it never blocks the items behind it
let flushing = false;
async function flush() {
  if (flushing) return; flushing = true;
  let rejected = false;
  while (S.queue.length) {
    try { await call(S.queue[0]); S.queue.shift(); save(); }
    catch (e) {
      if (e instanceof Reject) { rejected = true; S.failed.push({ item: S.queue.shift(), error: e.message }); save(); toast('Not saved: ' + e.message, 4500); continue; }
      break; // offline or server busy: keep everything and retry later
    }
  }
  flushing = false;
  if (rejected && !S.queue.length) setTimeout(() => load(), 1500); // show what the sheet really has
}

// local mirror of a queued write (used right away and again after every reload)
function applyLocal(item) {
  const d = S.data; if (!d) return;
  if (item.action === 'log' || item.action === 'del') {
    const keys = UKEYS[item.table], L = ulist(item.table);
    if (!L || !keys) return;
    const i = L.findIndex((r) => keys.every((k) => String(r[k]) === String(item.row[k])));
    if (item.action === 'del') { if (i >= 0) L.splice(i, 1); return; }
    if (i >= 0) L[i] = Object.assign({}, L[i], item.row); else L.push(Object.assign({}, item.row));
  } else if (item.action === 'doc_del') {
    d.docs = d.docs.filter((x) => x.url !== item.url);
  } else if (item.action === 'config') {
    d.cfg[item.key] = String(item.value);
  } else if (item.action === 'suggest_decide') {
    d.suggestions = d.suggestions.filter((s) => s.id !== item.id);
    if (String(item.id).startsWith('verdict-')) {
      d.verdicts = (d.verdicts || []).filter((v) => v.id !== item.id);
      d.verdicts.push({ id: item.id, status: item.status, date: item.date });
    }
  }
}
function send(item) { undoTrack(item); applyLocal(item); S.queue.push(item); save(); render(); flush(); }

async function load(sync) {
  if (!S.url || !S.token) return;
  S.busy = true; render();
  try {
    await flush();
    const j = await call({ action: sync ? 'sync' : 'boot' });
    S.data = normalize(j.data);
    S.queue.forEach(applyLocal); // B3: anything not uploaded yet stays on screen
    save();
    if (sync) toast((j.data.syncLog || []).join(' | ') || 'Synced', 3500);
  } catch (e) {
    toast(e.message === 'auth' ? 'Wrong token. More > Disconnect, then connect again.' : S.data ? 'Offline, showing saved data' : 'Error: ' + e.message, 3000);
  }
  S.busy = false; render();
}
/* Protein estimate from a meal's written items, used when the Meals sheet has no protein number.
   grams per 100 g (cooked unless the line says raw), or grams per piece. */
const PROT_100 = [[/egg whites?/, 0, 3.6], [/\beggs?\b/, 0, 6.3], [/whey|protein powder/, 80, 24], [/scoops?/, 0, 24], [/cottage cheese/, 11], [/greek yo(?:g|gh)urt/, 10, 17], [/yo(?:g|gh)urt/, 4, 6], [/ground beef|minced beef|mince/, 20], [/ribeye|steak|beef|lamb|veal/, 26], [/chicken|turkey/, 31, 0, 23], [/tuna/, 26, 25], [/salmon/, 22, 0, 20], [/shrimps?|prawns?/, 24], [/fish|tilapia|seabass|sea bass|fillet/, 22, 0, 20], [/lentils?|beans|chickpeas?|hummus/, 8], [/oats/, 13], [/quinoa/, 4.4], [/rice/, 2.7], [/pasta|noodles/, 5.5], [/bread|toast|pita/, 9], [/potato(?:es)?/, 2], [/nuts|almonds?|cashews?|walnuts?/, 20], [/peanut butter/, 25], [/cheese/, 25], [/milk/, 3.4], [/bone marrow soup|bone broth|soup/, 0, 5], [/salad|veg(?:etables?|gies)?/, 0, 2]];
function protEst(items) {
  let tot = 0;
  String(items || '').toLowerCase().split(/\s*\+\s*|,\s*|\s+and\s+|\s+with\s+/).forEach((part) => {
    const f = PROT_100.find((x) => x[0].test(part)); if (!f) return;
    const g = part.match(/(\d+(?:\.\d+)?)\s*(?:g|gr|grams?)\b/), n = part.match(/^\s*(\d+(?:\.\d+)?)\s*(?!g\b|gr\b|grams?\b|ml\b)/), raw = /\braw\b/.test(part) && f[3];
    if (g) tot += Number(g[1]) * (raw ? f[3] : f[1]) / 100;
    else if (f[2]) tot += f[2] * (n ? Number(n[1]) : 1);
  });
  return Math.round(tot);
}
function normalize(d) {
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  d.whoop.sort(byDate); d.strava.sort(byDate); // B1: never trust row order
  Object.values(d.logs).forEach((l) => l.sort(byDate));
  d.verdicts = d.verdicts || []; d.docs = d.docs || []; d.interests = d.interests || []; d.library = d.library || [];
  d.feedback = d.feedback || []; d.prs = d.prs || []; d.programs = d.programs || []; d.overrides = d.overrides || []; d.ai = !!d.ai;
  ['sets', 'supps', 'sport', 'hyrox', 'injuries', 'habits', 'photos', 'goals', 'shopweek', 'skills', 'shoes', 'mobility'].forEach((k) => { d[k] = d[k] || []; }); d.stats = d.stats || {}; d.hist = d.hist || {}; ['mealalts', 'stock', 'memory', 'knowledge', 'decisions'].forEach((k) => { d[k] = d[k] || []; });
  (d.meals || []).forEach((m) => { if (m.protein === '' || m.protein == null || isNaN(Number(m.protein))) { m.protein = String(protEst(m.items)); m.protEst = true; } });
  return d;
}

/* ---------- data helpers ---------- */
const D = () => S.data;
// AM/PM part rows ("<session> · AM") are read only through partRow(); everything else sees the day's own row
const PART_RE = /\s·\s(?:AM|PM)$/;
const logs = (t, date) => D().logs[t].filter((r) => r.date === date && !(t === 'WorkoutLog' && PART_RE.test(r.session || '')));
// the day as you will actually live it: override (break, comeback, moved…) first, then the plan. Use for meals and targets.
function dayPlan(ds) { const s = sessionFor0(ds); return s ? s.p : planFor(ds); }
const ACTIVE_REC = { session: 'Active recovery', load: 'Recovery', details: '# Active recovery 40 min\n- Easy walk, bike or swim 30 min, HR under 130\n- Mobility 10 min: hips, ankles, thoracic spine\n# Note\n- You should feel better after than before.' };
function planFor(ds, day) { return D().plan.find((p) => String(p.week) === String(weekNo(ds)) && p.day === (day || dow(ds))); }
// meal-day names: fri / sat are the low-carb days in the sheet
function dayTypeName(t) { t = String(t || ''); return /^(fri|sat)$/i.test(t) ? 'Low-carb day' : t ? t.charAt(0).toUpperCase() + t.slice(1) + ' day' : 'Meal day'; }
function mealsFor(daytype) { return fastRemap(D().meals.filter((m) => m.daytype === daytype)); }
function targetFor(daytype) { return D().targets.find((t) => t.daytype === daytype) || {}; }
function whoopFor(ds) { return D().whoop.find((w) => w.date === ds); }
function verdictChoice(ds) { const v = D().verdicts.find((x) => x.id === 'verdict-' + ds); return v && (v.status === 'accepted' || v.status === 'rejected') ? v.status : null; }

// B6 / B7: what you actually train after accepting a verdict
function sessionFor(ds) { return ramShift(ds, adaptSession(sessionFor0(ds))); }
function sessionFor0(ds) {
  // a session you moved here (missed-workout fix) replaces the planned one
  const ov = D().overrides.find((o) => o.date === ds);
  const p = ov ? Object.assign({ week: String(weekNo(ds)), day: dow(ds), moved: true }, ov) : planFor(ds); if (!p) return null;
  const w = whoopFor(ds), ch = verdictChoice(ds);
  if (ch !== 'accepted' || !w) return { p, name: p.session, details: p.details, mode: 'plan' };
  if (w.verdict === 'swap') {
    const rec = D().plan.find((x) => String(x.week) === String(weekNo(ds)) && x.load === 'Recovery') || ACTIVE_REC;
    return { p, name: rec.session + ' (swapped from ' + p.session + ')', details: rec.details, mode: 'swap' };
  }
  if (w.verdict === 'reduce') return { p, name: p.session + ' (reduced)', details: reduceDetails(p.details), mode: 'reduce' };
  return { p, name: p.session, details: p.details, mode: 'plan' };
}
function reduceDetails(txt) {
  const lines = String(txt || '').split('\n');
  const heads = lines.map((l, i) => (/^#\s*Block/i.test(l.trim()) ? i : -1)).filter((i) => i >= 0);
  let out = lines;
  if (heads.length > 1) {
    const start = heads[heads.length - 1];
    let end = lines.findIndex((l, i) => i > start && /^#/.test(l.trim()));
    if (end < 0) end = lines.length;
    out = lines.slice(0, start).concat(lines.slice(end));
  }
  return '# Reduced day\n- Last block removed\n- Use about 80% of planned weights, stop every set 2 reps early\n' + out.join('\n');
}
function parseDetails(txt) {
  let h = '';
  String(txt || '').split('\n').forEach((l) => {
    l = l.trim(); if (!l) return;
    if (l[0] === '#') h += '<h4>' + esc(l.replace(/^#\s*/, '')) + '</h4>';
    else h += '<div>' + esc(l.replace(/^-\s*/, '')) + '</div>';
  });
  return h;
}

/* ---------- form sheet (B22: no more pop-up prompts) ---------- */
function form(title, fields, okLabel) {
  return new Promise((resolve) => {
    const m = document.createElement('div');
    m.className = 'modal';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', title);
    m.innerHTML = '<div class="sheet"><h3>' + esc(title) + '</h3>' + fields.map((f, i) =>
      '<label for="ff' + i + '" class="mut small">' + esc(f.label) + '</label><input id="ff' + i + '" type="' + (f.type || 'text') + '" ' + (f.attrs || '') + ' value="' + esc(f.value || '') + '">').join('') +
      '<p class="err" id="ferr" role="alert"></p><div class="row"><button type="button" data-f="cancel">Cancel</button><button type="button" class="p" data-f="ok">' + esc(okLabel || 'Save') + '</button></div></div>';
    document.body.appendChild(m);
    const close = (v) => { m.classList.add('closing'); setTimeout(() => m.remove(), 220); resolve(v); };
    const first = m.querySelector('input'); if (first) setTimeout(() => first.focus(), 50);
    m.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-f]');
      if (!b && ev.target !== m) return;
      if (!b || b.dataset.f === 'cancel') { close(null); return; }
      const vals = fields.map((f, i) => m.querySelector('#ff' + i).value.trim());
      for (let i = 0; i < fields.length; i++) {
        const err = fields[i].check ? fields[i].check(vals[i]) : '';
        if (err) { m.querySelector('#ferr').textContent = err; m.querySelector('#ff' + i).focus(); return; }
      }
      close(vals);
    });
  });
}
const need = (lbl) => (v) => (v ? '' : lbl + ' is required');
const range = (lbl, lo, hi, opt) => (v) => {
  if (opt && v === '') return '';
  const n = Number(v);
  return v !== '' && isFinite(n) && n >= lo && n <= hi ? '' : lbl + ' must be a number from ' + lo + ' to ' + hi;
};
const validDate = (opt) => (v) => {
  if (opt && v === '') return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T12:00:00Z')) ? '' : 'Pick a valid date';
};

/* ---------- views (v6: glanceable, tap-first home) ---------- */
const d0 = () => S.data;
const DOW_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function niceDate(ds) { const d = new Date(ds + 'T12:00:00Z'); return DOW_L[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
function greeting() { const h = local().hour; return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
const ICON = (d, cls) => '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const I = {
  today: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5 12 8l3.5 6.5"/>',
  meals: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M9 3v6"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  train: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  insights: '<path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-7"/>',
  more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  run: '<circle cx="14" cy="4.5" r="1.8"/><path d="m6 21 3.5-6 3 2.5V22M9 11l2.5-3.5 3.5 2 2 3.5h3M11.5 7.5 9 6l-3 2"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 10a3 3 0 0 1 6 0"/><path d="m12 10 1.5-1.5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  out: '<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>'
};

function ringSVG(frac, size, sw, stroke) {
  const r = (size - sw) / 2, C = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0)), off = (C * (1 - f)).toFixed(1), c = size / 2;
  return '<svg class="rs" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><circle class="trk" cx="' + c + '" cy="' + c + '" r="' + r + '" stroke-width="' + sw + '"/>' +
    (f > 0 ? '<circle class="val" cx="' + c + '" cy="' + c + '" r="' + r + '" stroke-width="' + sw + '" stroke="' + stroke + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off + '" style="--c:' + C.toFixed(1) + '"/>' : '') + '</svg>';
}
const cnt = (v, dec) => '<span data-count="' + v + '" data-dec="' + (dec || 0) + '">' + Number(v).toFixed(dec || 0) + '</span>';

function kcalEaten(ms, ml) {
  return ml.reduce((a, r) => {
    if (r.status === 'skipped') return a;
    if (r.status === 'extra' || r.status === 'swap') return a + (Number(r.kcal) || 0);
    const m = ms.find((x) => x.slot === r.slot); return a + (m ? Number(m.kcal) || 0 : 0);
  }, 0);
}
const OZ = 29.5735;
const wUnit = () => (['L', 'ml', 'oz'].indexOf(D().cfg.water_unit) >= 0 ? D().cfg.water_unit : 'L');
// ml -> number in the chosen unit, and formatted text
function wNum(ml, u) { u = u || wUnit(); return u === 'L' ? ml / 1000 : u === 'oz' ? ml / OZ : ml; }
function wDec(u, big) { u = u || wUnit(); return u === 'L' ? (big ? 2 : 1) : 0; }
function wFmt(ml, u, dec) { u = u || wUnit(); const d = dec === undefined ? wDec(u) : dec, n = wNum(ml, u); return (n === 0 ? '0' : n.toFixed(d)) + ' ' + u; }
function toMl(v, u) { const n = Number(v); return u === 'L' ? n * 1000 : u === 'oz' ? n * OZ : n; }
function waterInfo(ds) {
  const c = d0().cfg, bot = Number(c.bottle_ml) || 750, dp = typeof dayPlan === 'function' ? dayPlan(ds) : null, rest = dp ? /^(Rest|Recovery)$/.test(dp.load) : dow(ds) === 'Sat', tgt = Number(rest ? c.water_target_rest : c.water_target_train) || 4000;
  const ml = Number((logs('WaterLog', ds)[0] || {}).ml) || 0;
  return { bot, tgt, ml };
}

function syncBanner() {
  const d = d0(), c = d.cfg;
  if (!d.connected.whoop || !d.connected.strava) {
    return '<div class="card infoc"><div class="row" style="align-items:flex-start;gap:14px"><span class="li-ic fit" style="background:var(--accFill)">' + ICON(I.link) + '</span><div><h3>Connect your apps</h3><p class="mut">Connect WHOOP and Strava once. Apex then pulls your data every morning by itself.</p></div></div>' +
      (S.tab !== 'more' ? '<button class="p" style="width:100%;margin-top:16px" data-act="tab" data-t="more">Connect now</button>' : '') + '</div>';
  }
  if (c.last_sync_error) return '<div class="card warnc" role="alert"><h3>Sync needs attention</h3><p class="small" style="margin:6px 0">' + esc(c.last_sync_error) + '</p><p class="mut small">Last good sync: ' + esc(ago(c.last_sync_ok)) + '. If it says reconnect, use More.</p></div>';
  return '';
}
function tzBanner() {
  let dev = '';
  try { dev = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* ignore */ }
  if (!dev || dev === tz()) return '';
  return '<div class="card mut small">Your phone is on ' + esc(dev) + ' but Apex is using ' + esc(tz()) + '. Travelling? Change "timezone" in the Config tab.</div>';
}

function tiles(w) {
  const T = [['HRV', 'hrv', 'ms', 1, 0], ['Resting HR', 'rhr', 'bpm', -1, 0], ['Sleep', 'sleep_hours', 'h', 1, 1]];
  return '<div class="tiles">' + T.map(([lbl, k, u, good, dec]) => {
    const v = Number(w[k]);
    const hist = d0().whoop.filter((x) => x.date < w.date).slice(-30).map((x) => Number(x[k])).filter((x) => x > 0);
    const avg = hist.length >= 3 ? hist.reduce((a, b) => a + b, 0) / hist.length : null;
    let dl = '<span class="dl">30-day avg —</span>';
    if (avg && v) {
      const diff = v - avg, flat = Math.abs(diff) < avg * 0.03, cls = flat ? '' : (diff > 0 ? 1 : -1) * good > 0 ? 'up' : 'down';
      dl = '<span class="dl ' + cls + '">' + (flat ? '● normal' : (diff > 0 ? '▲ ' : '▼ ') + Math.abs(diff).toFixed(dec)) + '</span>';
    }
    return '<div class="tile"><span class="tl-l">' + lbl + '</span><b>' + (v ? cnt(v, dec) : '–') + '<small> ' + u + '</small></b>' + dl + '</div>';
  }).join('') + '</div>';
}

/* rest / break / recovery day detection (no WHOOP training verdict on these days) */
function restInfo(ds, ses) {
  if ((!ses || !ses.p) && !(D().plan || []).length) return { kind: 'noplan', label: 'No program yet' };
  const st = D().cfg.program_start;
  if ((!ses || !ses.p) && st && ds < st) return { kind: 'rest', label: weekLabel(ds) };
  if (!ses || !ses.p) return { kind: 'rest', label: 'Rest day' };
  const p = ses.p, load = ses.mode === 'swap' ? 'Recovery' : p.load;
  const ov = D().overrides.find((o) => o.date === ds), why = String((ov && ov.reason) || '');
  if (/^break/i.test(why)) {
    const isB = (d) => D().overrides.some((o) => o.date === d && /^break/i.test(String(o.reason || '')));
    let a = ds, b = ds; while (isB(dateAdd(a, -1))) a = dateAdd(a, -1); while (isB(dateAdd(b, 1))) b = dateAdd(b, 1);
    return { kind: 'break', ov: true, label: 'Break · day ' + (daysBetween(a, ds) + 1) + ' of ' + (daysBetween(a, b) + 1) };
  }
  if (load === 'Rest' || /^rest\b/i.test(String(p.session || ''))) return { kind: 'rest', ov: !!ov && /^rest day|^sick|^ill/i.test(why), label: ov && /^rest day/i.test(why) ? 'Rest day · your choice' : 'Rest day' };
  if (load === 'Recovery') return { kind: 'recovery' };
  return null;
}
function heroCard(ds, w, ch, ses) {
  const d = d0(), p = ses && ses.p;
  const rec = w && w.verdict ? Number(w.recovery) || 0 : null;
  const v = w && /^(keep|reduce|swap)$/.test(w.verdict) ? w.verdict : 'none';
  const V = {
    keep: ['✓', 'Good to go', 'Recovery ' + rec + '%. Do the full session as planned.'],
    reduce: ['↓', 'Do it, but go lighter', 'Recovery ' + rec + '%. Drop the last block and use about 80% of your weights.'],
    swap: ['⇄', 'Change it today', 'Recovery ' + rec + '%. Skip this session and do Active Recovery instead.'],
    none: ['?', d.connected.whoop ? 'Waiting for your score' : 'No recovery data', d.connected.whoop ? 'WHOOP scores you after you wake. Train as planned, or tap sync to check.' : 'Connect WHOOP in More to get a daily go / change decision.']
  }[v];
  const RST = restInfo(ds, ses), rv = rec === null ? null : rec >= 67 ? 0 : rec >= 34 ? 1 : 2;
  if (RST) {
    V[0] = '☾';
    if (RST.kind === 'noplan') { V[0] = '+'; V[1] = 'No program yet'; V[2] = 'Create one on Train and Apex builds every day around your goals and recovery.'; }
    else if (RST.kind === 'recovery') { if (v === 'reduce' || v === 'swap') { V[1] = 'Easy day, keep it gentle'; V[2] = 'Recovery ' + rec + '%. Today is already a recovery day. Keep it short and easy' + (v === 'swap' ? ', or rest if you feel flat.' : '.'); } else if (v === 'keep') { V[1] = 'Easy day'; V[2] = 'Recovery ' + rec + '%. Feeling good, but keep it easy. That is the point of today.'; } else V[1] = 'Easy day'; }
    else { V[1] = RST.kind === 'break' ? 'Break day' : 'Rest day'; V[2] = rv === null ? 'No training today. Walk, stretch, sleep well.' : ['Recovery ' + rec + '%. Enjoy the rest. An easy walk is fine.', 'Recovery ' + rec + '%. Take it easy today. Walk, stretch, eat well.', 'Recovery ' + rec + '%. Your body needs this. Sleep early tonight.'][rv]; }
  }
  if (!RST && ch === 'accepted' && v === 'swap') { V[0] = '⇄'; V[1] = 'Switched to recovery'; V[2] = 'Recovery ' + rec + '%. Today is Active Recovery instead of ' + p.session + '.'; }
  if (!RST && ch === 'accepted' && v === 'reduce') { V[1] = 'Lighter session set'; V[2] = 'Last block removed. Use about 80% of your weights.'; }
  if (!RST && ch === 'rejected') { V[2] = 'You chose the full plan. Recovery ' + rec + '%, so listen to your body and stop if something feels off.'; }
  const wl = p && logs('WorkoutLog', ds).find((r) => r.session === ses.name);
  const blocks = ses ? (String(ses.details).match(/^#\s*Block/gim) || []).length : 0;
  const load = ses ? (ses.mode === 'swap' ? 'Recovery' : p.load) : '';
  let h = '<section class="card hero v-' + (RST ? 'rest' : v) + '" aria-label="Today: ' + esc(V[1]) + '">' +
    '<div class="hero-top"><div class="hring" role="img" aria-label="' + (rec === null ? 'No recovery score' : 'Recovery ' + rec + ' percent') + '">' + ringSVG(rec === null ? 0 : rec / 100, 76, 8, 'url(#rg)') + '<div class="hero-num xs"><b>' + (rec === null ? '--' : cnt(rec)) + '</b><span>REC</span></div></div>' +
    '<div class="hero-ses"><span class="eyebrow3">' + (RST && RST.label ? esc(RST.label) : 'Today\'s workout') + '</span>' + (ses ? '<h3>' + esc(ses.name) + '</h3><p class="mut small"><span class="tag ' + esc(String(load).toLowerCase()) + '">' + esc(load) + '</span> ' + esc(p.time) + (blocks ? ' · ' + blocks + ' blocks' : '') + '</p>' : '<h3>' + (RST && RST.kind === 'noplan' ? 'Nothing planned' : 'Rest day') + '</h3>') + '</div></div>' +
    '<div class="vbox"><span class="vic" aria-hidden="true">' + V[0] + '</span><div><b>' + esc(V[1]) + '</b><span>' + esc(V[2]) + '</span></div></div>';
  if (w && w.verdict) h += tiles(w);
  if (RST && RST.kind === 'noplan') h += '<button class="link-row" data-act="wizopen">Create your program<span class="chev">›</span></button>';
  else if (ses && RST && RST.kind !== 'recovery') {
    if (wl) h += '<div class="row sp hero-act"><span class="pill ' + (wl.status === 'done' ? 'keep' : 'swap') + '">' + esc(wl.status.toUpperCase()) + ' · ' + esc(wl.time) + '</span><button class="txt fit" data-act="wundo">Undo</button></div>';
    h += '<button class="link-row" data-act="ssheet">' + (RST.kind === 'break' ? 'Break day ideas' : 'Rest day ideas') + '<span class="chev">›</span></button>' + (RST.ov && !wl ? '<button class="link-row" data-act="restcancel">Train today instead<span class="chev">›</span></button>' : '');
  } else if (ses) {
    const RC = todayRecs(ds);
    if (wl) h += '<div class="row sp hero-act"><span class="pill ' + (wl.status === 'done' ? 'keep' : 'swap') + '">' + esc(wl.status.toUpperCase()) + ' · ' + esc(wl.time) + '</span><button class="txt fit" data-act="wundo">Undo</button></div>';
    else h += (RC.length ? '<button class="p recb" data-act="recopen">' + ICON(CI.spark) + ' Recommended' + (RC.length > 1 ? ' · ' + RC.length : '') + '</button>' : '') + '<div class="row hero-act' + (RC.length ? ' tight' : '') + '"><button class="g" data-act="wdone">Did it</button><button data-act="wskip">Skipped</button></div>';
    if (ch) h += '<p class="chosen">' + (ch === 'accepted' ? 'Plan adjusted for today' : 'Keeping the original plan') + ' · <button class="txt" data-act="vundo">Change</button></p>';
    h += '<button class="link-row" data-act="ssheet">View full session<span class="chev">›</span></button>' + (wl || sessionFor0(ds).p.load === 'Rest' ? '' : '<button class="link-row" data-act="offopen">Take today off<span class="chev">›</span></button>');
  }
  if (w && w.reason && !(RST && RST.kind !== 'recovery')) h += '<details class="why"><summary>Why this decision?</summary><p>' + esc(w.reason) + '</p></details>';
  return h + '</section>';
}
function miniRing(key, label, val, tgt, unit, stroke, txt) {
  return '<button class="mr" data-act="jump" data-k="' + key + '" aria-label="' + label + ' ' + txt + '"><div class="rw">' + ringSVG(tgt ? val / tgt : 0, 64, 7, stroke) + '<b>' + Math.round(tgt ? Math.min(999, (val / tgt) * 100) : 0) + '%</b></div><span>' + label + '</span><em>' + txt + '</em></button>';
}

const ST_ICON = { ate: '✓', swap: '↺', extra: '+', skipped: '✕', next: '•', todo: '' };
function viewToday() {
  const ds = todayStr(), d = d0(), c = d.cfg, ses = sessionFor(ds), p = ses && ses.p, w = whoopFor(ds), ch = verdictChoice(ds);
  let h = '<header class="top home"><div class="top-l"><p class="date">' + esc(niceDate(ds)) + (p ? ' · ' + esc(weekLabel(ds).replace(/ of \d+$/, '')) : '') + '</p><h1>' + greeting() + (c.name ? ',<br>' + esc(c.name) : '') + '</h1>' + updatedLabel() + '</div>' +
    '<button class="sync-ic' + (S.busy ? ' busy' : '') + '" data-act="sync" aria-label="Sync WHOOP and Strava now">' + ICON(I.sync) + '</button></header>';
  h += syncBanner() + tzBanner() + sickCard() + ramCard() + briefCard() + raceWeekCard() + postRaceCard();
  h += heroCard(ds, w, ch, ses) + (ses && ses.injured ? '<p class="injline">' + ICON(TI.heart) + '<span>Injury mode: ' + ses.injured + ' exercise' + (ses.injured > 1 ? 's' : '') + ' swapped to protect your ' + esc(ses.injAreas.join(' and ').toLowerCase()) + '.</span></p>' : '') + restDayCard() + wrCard() + missedCard() + easeCard() + tipCard();
  const extras = () => foodCheckCard(true) + cutCard() + weeklyCard(true) + monthlyCard(true) + prCelebrate() + sleepCard() + coachCard() + raceCard() + raceDayLink();
  if (!p) return h + extras();

  const ms = mealsFor(p.daytype), ml = logs('MealLog', ds), tg = targetFor(p.daytype);
  const eaten = kcalEaten(ms, ml), kT = Number(tg.kcal) || 0, W = waterInfo(ds), pE = proteinEaten(ms, ml), pT = proteinTarget(tg);
  h += '<div class="rings3 r4">' +
    miniRing('meals', 'Fuel', eaten, kT, 'kcal', 'url(#gk)', eaten + ' / ' + kT) +
    miniRing('meals', 'Protein', pE, pT, 'g', 'url(#gp)', pE + ' / ' + pT + ' g') +
    miniRing('water', 'Water', W.ml, W.tgt, wUnit(), 'url(#gw)', wNum(W.ml).toFixed(wDec()) + ' / ' + wFmt(W.tgt)) +
    miniRing('insights', 'Sleep', w ? Number(w.sleep_perf) || 0 : 0, 100, '%', 'url(#gt)', w && w.sleep_hours ? esc(w.sleep_hours) + ' h' : 'No data') + '</div>';
  h += extras();

  // up next
  const next = ms.find((m) => !ml.find((r) => r.slot === m.slot));
  h += travelMealsCard() + fastCard() + proteinFixCard() + '<div class="row sp h2row"><h2 id="sec-meals">Meals</h2><button class="txt fit" data-act="eatout">Eating out?</button></div>';
  if (next) {
    h += '<section class="card upnext' + (S.flash === 'meal' ? ' pop' : '') + '"><div class="eyebrow2"><span>UP NEXT</span><span>' + esc(next.time) + '</span></div><h3>' + esc(next.name) + '</h3><p class="mut">' + esc(next.items) + '</p>' +
      (next.supps ? '<p class="supps">Supplements · ' + esc(next.supps) + '</p>' : '') +
      '<div class="row" style="margin-top:20px"><button class="g" data-act="mate" data-slot="' + esc(next.slot) + '">Ate it</button><button data-act="mskip" data-slot="' + esc(next.slot) + '">Skip</button><button data-act="mswap" data-slot="' + esc(next.slot) + '">Swap</button></div></section>';
  } else h += '<section class="card upnext done"><div class="eyebrow2"><span>ALL DONE</span></div><h3>Every meal logged today</h3><p class="mut">' + eaten + ' kcal so far. Nice work.</p></section>';
  // day timeline: meals and their supplements in one list
  h += dayTimeline(ms, ml, next, p);

  h += stackCard();
  // water
  const pct = W.tgt ? Math.min(100, (W.ml / W.tgt) * 100) : 0;
  h += '<h2 id="sec-water">Water</h2><section class="card water' + (S.flash === 'water' ? ' pop' : '') + '"><div class="row sp" style="align-items:baseline"><div><span class="big">' + cnt(wNum(W.ml), wDec(null, true)) + '</span><span class="unit"> / ' + wFmt(W.tgt) + '</span></div><span class="mut small">' + (W.ml >= W.tgt ? 'Goal reached ✓' : Math.round(pct) + '%') + '</span></div>' +
    '<div class="bar wbar" role="img" aria-label="' + Math.round(pct) + ' percent of water goal"><i style="width:' + pct + '%"></i></div>' +
    '<div class="row" style="margin-top:20px"><button class="icon-btn" data-act="wminus" aria-label="Remove one bottle" ' + (W.ml <= 0 ? 'disabled' : '') + '>−</button><button class="p" data-act="wplus">' + ICON(I.drop, 'ib') + ' Add ' + wFmt(W.bot, null, wUnit() === 'L' ? 2 : 0) + '</button></div></section>';

  // check-in
  const ck = logs('Checkin', ds)[0];
  h += '<h2>How do you feel?</h2><div class="feel" role="group" aria-label="How do you feel">' + [['Fresh', '⚡'], ['OK', '🙂'], ['Tired', '😴']].map(([x, e]) =>
    '<button class="' + (ck && ck.feel === x ? 'on' : '') + '" aria-pressed="' + !!(ck && ck.feel === x) + '" data-act="feel" data-v="' + x + '"><span class="em" aria-hidden="true">' + e + '</span>' + x + '</button>').join('') + '</div>' + checkinExtra(ck);
  return h;
}

/* ---------- sheets ---------- */
function infoSheet(title, body, id) {
  closeSheets(true);
  const m = document.createElement('div');
  m.className = 'modal info'; if (id) m.dataset.id = id;
  m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', title);
  m.innerHTML = '<div class="sheet"><div class="sheet-h"><h3>' + esc(title) + '</h3><button class="icon-btn x" data-close aria-label="Close">✕</button></div>' + plural(body) + '</div>';
  S.lastFocus = document.activeElement;
  document.body.appendChild(m);
  setTimeout(() => { const f = m.querySelector('input,[data-close]'); if (f) f.focus(); }, 60);
  m.addEventListener('click', (ev) => { if (ev.target === m || ev.target.closest('[data-close]')) closeSheets(); });
}
function refreshSheet(id, body) {
  const m = document.querySelector('.modal.info[data-id="' + id + '"]');
  if (!m) return;
  const h = m.querySelector('.sheet-h');
  while (h.nextSibling) h.nextSibling.remove();
  h.insertAdjacentHTML('afterend', plural(body));
}
function closeSheets(now) {
  const open = document.querySelectorAll('.modal.info');
  open.forEach((m) => { if (now) { m.remove(); return; } m.classList.add('closing'); setTimeout(() => m.remove(), 220); });
  if (open.length && !now && S.lastFocus && document.body.contains(S.lastFocus)) { try { S.lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
}
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  const f = document.querySelector('.modal:not(.info):not(.closing) [data-f="cancel"]');
  if (f) { f.click(); return; }
  closeSheets();
});
function mealSheet(slot) {
  const ds = todayStr(), p = dayPlan(ds); if (!p) return;
  const m = mealsFor(p.daytype).find((x) => x.slot === slot), r = logs('MealLog', ds).find((x) => x.slot === slot);
  if (!m) { if (r) infoSheet(r.extra_name || 'Snack', '<p class="mut">' + esc(r.kcal) + ' kcal at ' + esc(r.time) + '</p>' + (r.note ? '<p class="small" style="margin-top:8px">' + esc(r.note).replace(/; /g, '<br>') + '</p>' : '') + '<button class="r" style="width:100%;margin-top:20px" data-act="mundo" data-slot="' + esc(slot) + '">Delete</button>'); return; }
  let b = '<p class="mut small">Planned ' + esc(m.time) + ' · ' + esc(m.kcal) + ' kcal</p><p style="margin:12px 0">' + esc(m.items) + '</p>' + (m.supps ? '<p class="supps">Supplements · ' + esc(m.supps) + '</p>' : '');
  if (r) b += '<div class="row sp" style="margin-top:20px"><span class="pill ' + (r.status === 'skipped' ? 'swap' : 'keep') + '">' + esc(r.status.toUpperCase()) + (r.time ? ' · ' + esc(r.time) : '') + '</span>' + (r.note ? '<span class="mut small">' + esc(r.note) + '</span>' : '') + '</div><button style="width:100%;margin-top:20px" data-act="mundo" data-slot="' + esc(slot) + '">Undo</button>';
  else b += '<label for="mt" class="mut small" style="margin:20px 0 8px">Time you ate it</label><input type="time" id="mt" value="' + nowTime() + '"><div class="row" style="margin-top:16px"><button class="g" data-act="mate" data-slot="' + esc(slot) + '">Ate it</button><button data-act="mskip" data-slot="' + esc(slot) + '">Skip</button><button data-act="mswap" data-slot="' + esc(slot) + '">Swap</button></div>' + altsHTML(p.daytype, slot);
  infoSheet(m.name, b);
}
function secInfo(h) {
  let tag = '', title = h, rest = '', kind = 'block';
  if (/^note/i.test(h)) return { kind: 'note', tag: 'NOTE', title: '', rest: '' };
  if (/^(warm|cool|mobility|before|deep|long|breath)/i.test(h)) kind = 'warm';
  const m = h.match(/^(block\s*[\w]+)\s*:\s*(.*)$/i);
  if (m) { tag = m[1].toUpperCase(); title = m[2]; }
  const r = title.match(/^(.*?)[,(]?\s*rest\s+(\d[^)]*)\)?\s*$/i);
  if (r && r[1].trim()) { title = r[1].replace(/[,(]\s*$/, '').trim(); rest = r[2].trim(); }
  if (kind === 'warm' && !tag) { const w = title.match(/^(\S+)\s+(.*)$/); tag = (w ? w[1] : title).toUpperCase(); title = w ? w[2] : ''; }
  return { kind, tag, title, rest };
}
function exParts(x) {
  const m = x.match(/^(.*?)[,:]?\s+((?:\d+(?:-\d+)?\s*(?:s|m|kg|cal)?\s*(?:each(?:\s+side|\s+hand)?|\/side)?\s*)x\s*\d+\b.*)$/i);
  return m && m[1].length > 1 ? [m[1], m[2].replace(/\s*x\s*/i, ' × ')] : [x, ''];
}
function exKey(day, i) { return 'ex-' + day + '-' + i; }
function blocksHTML(txt, day) {
  day = day || todayStr();
  const secs = []; let cur = null;
  String(txt || '').split('\n').forEach((l) => {
    l = l.trim(); if (!l) return;
    if (l[0] === '#') { cur = { h: l.replace(/^#\s*/, ''), items: [] }; secs.push(cur); }
    else { if (!cur) { cur = { h: 'Session', items: [] }; secs.push(cur); } cur.items.push(l.replace(/^-\s*/, '')); }
  });
  let n = 0, done = 0;
  const body = secs.map((s) => {
    const k = secInfo(s.h);
    if (k.kind === 'note') return '<div class="wo-note"><span aria-hidden="true">💡</span><div>' + s.items.map(esc).join('<br>') + '</div></div>';
    const items = s.items.map((x) => {
      const key = exKey(day, n++), on = LS.getItem(key) === '1'; if (on) done++;
      const [name, rx] = exParts(x);
      return '<li class="exrow' + (on ? ' on' : '') + '"><button class="ex' + (on ? ' on' : '') + '" data-act="extick" data-k="' + key + '" aria-pressed="' + on + '" aria-label="Mark ' + esc(name) + ' done"><span class="ex-chk" aria-hidden="true"></span></button><button class="ex-open" data-act="exopen" data-n="' + esc(name) + '" data-rx="' + esc(rx) + '" data-rest="' + restSec(k.rest) + '" aria-label="' + esc(name) + (rx ? ', ' + esc(rx) : '') + '. Log weights, rest timer and videos"><span class="ex-name">' + esc(name) + '</span>' + (rx ? '<span class="ex-rx">' + esc(rx) + '</span>' : '') + '</button></li>';
    }).join('');
    return '<section class="wo-sec ' + k.kind + '"><div class="wo-h">' + (k.tag ? '<span class="wo-tag">' + esc(k.tag) + '</span>' : '') + (k.title ? '<b>' + esc(k.title) + '</b>' : '') + (k.rest ? '<span class="wo-rest">' + ICON('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>') + 'Rest ' + esc(k.rest) + '</span>' : '') + '</div><ul class="wo-list">' + items + '</ul></section>';
  }).join('');
  const pct = n ? Math.round((done / n) * 100) : 0;
  return reelify('<div class="det wo"><div class="wo-prog"><span>' + done + ' of ' + n + ' done</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>' + body + '</div>');
}
function parseDetails(txt) { return blocksHTML(txt); }

/* ---------- plan inputs: documents, inspiration links, interests ---------- */
const INTEREST_IDEAS = ['Rock climbing', 'Bouldering', 'Swimming', 'Yoga', 'Boxing', 'BJJ', 'Muay Thai', 'Padel', 'Hiking', 'Cycling', 'Running', 'HYROX', 'Calisthenics', 'Pilates', 'Surfing', 'CrossFit'];
function platformOf(u) {
  const h = (u.match(/^https?:\/\/([^/]+)/i) || ['', ''])[1].toLowerCase().replace(/^www\./, '');
  return /instagram/.test(h) ? 'Instagram' : /tiktok/.test(h) ? 'TikTok' : /youtu/.test(h) ? 'YouTube' : h || 'Link';
}
function fmtSize(b) { b = Number(b) || 0; return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
function docsBody() {
  const docs = d0().docs.slice().reverse();
  return '<p class="mut small">Upload your program PDFs, nutrition plans, photos of notes, anything I should use. They are saved privately in your Google Drive (folder "Apex plan documents"), and I read them when I build your next plan.</p>' +
    '<label class="upbtn" for="docfile">' + ICON(I.plus) + (S.uploading ? 'Uploading ' + esc(S.uploading) + '…' : 'Upload a document') + '</label><input type="file" id="docfile" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.md,image/*" multiple hidden>' +
    '<p class="mut small" style="margin-top:8px">PDF, Word, Excel, text or photos · up to 20 MB each</p>' +
    (docs.length ? '<div class="card list flat">' + docs.map((x) => '<div class="li"><a class="li-link" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="li-ic" style="background:#ef4444">' + ICON('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>') + '</span><span class="li-main"><b>' + esc(x.name) + '</b><span class="mut small">' + esc(x.label && x.label !== 'Other' ? x.label + ' · ' : '') + esc(ago(x.date)) + ' · ' + fmtSize(x.size) + '</span></span></a><button class="icon-btn x" data-act="docdel" data-u="' + esc(x.url) + '" data-n="' + esc(x.name) + '" aria-label="Delete ' + esc(x.name) + '">✕</button></div>').join('') + '</div>' : '<p class="empty-note">No documents yet.</p>');
}
function inspBody() {
  const d = d0(), cats = [...new Set(d.library.map((l) => l.tab).concat(d.interests.map((i) => i.name)))];
  const mine = d.library.slice().reverse();
  return '<p class="mut small">Paste a link to a reel, TikTok or YouTube video that inspires you. Tip: in Instagram or TikTok tap Share, then Copy link.</p>' +
    '<label for="il" class="mut small" style="margin:16px 0 8px">Link</label><input id="il" inputmode="url" autocomplete="off" placeholder="https://www.instagram.com/reel/…">' +
    '<label for="ic" class="mut small" style="margin:16px 0 8px">Category</label><input id="ic" list="icl" autocomplete="off" placeholder="e.g. Rock climbing, Mobility, HYROX"><datalist id="icl">' + cats.map((c) => '<option value="' + esc(c) + '">').join('') + '</datalist>' +
    '<div class="chiprow">' + cats.slice(0, 8).map((c) => '<button class="chip" data-act="icpick" data-v="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
    '<label for="in" class="mut small" style="margin:16px 0 8px">What do you like about it? (optional)</label><input id="in" maxlength="120" placeholder="e.g. great finger-strength drills">' +
    '<p class="err" id="ierr" role="alert"></p><button class="p" style="width:100%" data-act="inspsave">Save to my library</button>' +
    '<h2 style="margin-top:28px">Saved (' + mine.length + ')</h2><div class="card list flat">' + mine.slice(0, 30).map((l) => '<div class="li"><span class="li-ic" style="background:' + ({ Instagram: '#d6249f', TikTok: '#111', YouTube: '#ff0000' }[l.creator] || 'var(--accFill)') + '">' + ICON(I.play) + '</span><span class="li-main"><b>' + esc(l.title) + '</b><span class="mut small">' + esc(l.tab) + ' · ' + esc(l.creator) + '</span></span><button class="icon-btn x" data-act="inspdel" data-u="' + esc(l.url) + '" aria-label="Remove ' + esc(l.title) + '">✕</button></div>').join('') + '</div>';
}
function interestsBody() {
  const have = d0().interests.map((i) => i.name), lower = have.map((x) => x.toLowerCase());
  return '<p class="mut small">Tell me the sports and training styles you want in your life. I will mix them into your next plan, for example a climbing session instead of a gym day.</p>' +
    '<h2>Your sports</h2>' + (have.length ? '<div class="chiprow">' + have.map((n) => '<span class="chip on">' + esc(n) + '<button class="chip-x" data-act="intdel" data-n="' + esc(n) + '" aria-label="Remove ' + esc(n) + '">✕</button></span>').join('') + '</div>' : '<p class="empty-note">Nothing added yet.</p>') +
    '<h2>Add</h2><div class="chiprow">' + INTEREST_IDEAS.filter((x) => lower.indexOf(x.toLowerCase()) < 0).map((n) => '<button class="chip" data-act="intadd" data-n="' + esc(n) + '">+ ' + esc(n) + '</button>').join('') + '</div>' +
    '<div class="row" style="margin-top:16px"><input id="ia" maxlength="40" placeholder="Something else, e.g. Kitesurfing" aria-label="Add your own sport"><button class="p fit" data-act="intaddc">Add</button></div>';
}

/* ---------- settings sheets ---------- */
function trimNum(n, u) { return Number(n).toFixed(u === 'L' ? 2 : 0).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1'); }
function waterSetBody(u) {
  const c = D().cfg; u = u || S.setUnit || wUnit();
  const step = u === 'L' ? '0.05' : u === 'oz' ? '1' : '50';
  const v = (ml) => trimNum(wNum(Number(ml), u), u);
  return '<div class="segc" role="tablist" aria-label="Unit">' + ['L', 'ml', 'oz'].map((x) => '<button role="tab" aria-selected="' + (x === u) + '" class="' + (x === u ? 'on' : '') + '" data-act="setunit" data-u="' + x + '">' + { L: 'Liters', ml: 'Milliliters', oz: 'Ounces' }[x] + '</button>').join('') + '</div>' +
    '<label for="sw0" class="mut small" style="margin:20px 0 8px">Bottle size (' + u + ')</label><input id="sw0" type="number" inputmode="decimal" step="' + step + '" value="' + v(c.bottle_ml || 750) + '">' +
    '<div class="chiprow">' + [500, 750, 1000, 1500].map((ml) => '<button class="chip" data-act="setbot" data-ml="' + ml + '">' + trimNum(wNum(ml, u), u) + ' ' + u + '</button>').join('') + '</div>' +
    '<label for="sw1" class="mut small" style="margin:20px 0 8px">Daily target, training days (' + u + ')</label><input id="sw1" type="number" inputmode="decimal" step="' + step + '" value="' + v(c.water_target_train || 4500) + '">' +
    '<label for="sw2" class="mut small" style="margin:20px 0 8px">Daily target, rest day / Saturday (' + u + ')</label><input id="sw2" type="number" inputmode="decimal" step="' + step + '" value="' + v(c.water_target_rest || 3500) + '">' +
    '<p class="err" id="swerr" role="alert"></p><button class="p" style="width:100%" data-act="savewater">Save</button>';
}
function tzBody() {
  let dev = '', list = [];
  try { dev = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* ignore */ }
  try { list = Intl.supportedValuesOf('timeZone'); } catch (e) { list = ['Africa/Cairo', 'Europe/London', 'Europe/Warsaw', 'Europe/Berlin', 'Europe/Paris', 'Asia/Dubai', 'Asia/Riyadh', 'America/New_York', 'America/Los_Angeles']; }
  const cur = tz();
  if (list.indexOf(cur) < 0) list.unshift(cur);
  return '<p class="mut small">Apex uses this to decide when your day starts, when water resets and which WHOOP score is today\'s. Change it when you travel.</p>' +
    (dev && dev !== cur ? '<button class="p" style="width:100%;margin-top:16px" data-act="savetz" data-z="' + esc(dev) + '">Use my phone\'s time zone (' + esc(dev.replace(/_/g, ' ')) + ')</button>' : '<p class="chosen">✓ Same as your phone</p>') +
    '<div class="chiprow">' + ['Africa/Cairo', 'Europe/Warsaw', 'Europe/London', 'Asia/Dubai'].filter((z) => z !== cur).map((z) => '<button class="chip" data-act="savetz" data-z="' + z + '">' + z.split('/')[1].replace(/_/g, ' ') + '</button>').join('') + '</div>' +
    '<label for="tzs" class="mut small" style="margin:20px 0 8px">All time zones</label><select id="tzs">' + list.map((z) => '<option value="' + esc(z) + '"' + (z === cur ? ' selected' : '') + '>' + esc(z.replace(/_/g, ' ')) + '</option>').join('') + '</select>' +
    '<button style="width:100%;margin-top:16px" data-act="savetzsel">Save selected</button>';
}
function setCfg(key, value) { send({ action: 'config', key, value: String(value) }); }

/* ---------- Meals ---------- */
function shopKey(per, item) { return 'shop-' + periodKey(per) + '-' + per + item; }
function periodKey(per) { const ds = todayStr(); return per === 'monthly' ? ds.slice(0, 7) : weekStart(ds); }
function viewMeals() {
  const ds = todayStr(), p = dayPlan(ds), d = d0();
  let h = '<header class="top"><div><p class="date">' + esc(niceDate(ds)) + '</p><h1>Meals</h1></div></header>';
  if (!p || !mealsFor(p.daytype).length) h += '<section class="card"><p class="mut small" style="margin:0">' + (!(D().meals || []).length ? 'No meal plan yet. Add your meals to the Meals tab of your Google Sheet, then tap Reload from sheet in More.' : 'No meals planned for today. You can still log food with Add a snack.') + '</p></section>';
  if (p) {
    const ms = mealsFor(p.daytype), ml = logs('MealLog', ds), t = targetFor(p.daytype), eaten = kcalEaten(ms, ml), kT = Number(t.kcal) || 1;
    h += '<section class="card macro"><div class="macro-ring">' + ringSVG(eaten / kT, 124, 12, 'url(#gk)') + '<div class="hero-num sm"><b>' + cnt(eaten) + '</b><span>of ' + esc(t.kcal) + '</span></div></div><div class="macros">' +
      [['Protein', proteinEaten(ms, ml) + ' / ' + proteinTarget(t), 'var(--ringA)', Math.min(100, (proteinEaten(ms, ml) / proteinTarget(t)) * 100)], ['Carbs target', t.carbs, 'var(--ringC)', 100], ['Fat target', t.fat, '#f59e0b', 100]].map(([n, g, col, pc]) => '<div class="mac"><span class="mut small">' + n + '</span><b>' + esc(g) + ' g</b><i style="background:linear-gradient(90deg,' + col + ' ' + pc + '%,var(--card2) ' + pc + '%)"></i></div>').join('') + '</div></section>' +
      '<button class="card eoc" data-act="eatout"><span class="li-ic" style="background:#f97316">' + ICON(LI.fork) + '</span><span><b>Eating out today?</b><span class="mut small">Best choices on the menu and how to fit your day</span></span><span class="chev">›</span></button>';
    h += '<p class="sub center">' + esc(dayTypeName(p.daytype)) + ' · ' + esc(p.session) + '</p>';
    const nxt = ms.find((m) => !ml.find((x) => x.slot === m.slot));
    const ST = { ate: ['✓', 'Ate'], swap: ['↺', 'Swapped'], skipped: ['✕', 'Skipped'] };
    h += '<h2>Today</h2><div class="mtl">' + ms.map((m) => {
      const r = ml.find((x) => x.slot === m.slot), st = r ? r.status : m === nxt ? 'next' : 'todo';
      const nS = m.supps ? m.supps.split(',').length : 0;
      return '<button class="mt-row st-' + st + '" data-act="msheet" data-slot="' + esc(m.slot) + '" aria-label="' + esc(m.name) + ' at ' + esc(m.time) + ', ' + (r ? ST[r.status] ? ST[r.status][1] : r.status : st === 'next' ? 'up next' : 'not logged') + '">' +
        '<span class="mt-rail"><span class="mt-time">' + esc(m.time) + '</span><span class="mt-dot" aria-hidden="true">' + (r && ST[r.status] ? ST[r.status][0] : '') + '</span></span>' +
        '<span class="mt-card"><span class="mt-head"><b>' + esc(m.name) + '</b>' + (r && ST[r.status] ? '<span class="mt-st">' + ST[r.status][1] + (r.time ? ' ' + esc(r.time) : '') + '</span>' : st === 'next' ? '<span class="mt-st nx">Up next</span>' : '') + '</span>' +
        '<span class="mt-items">' + esc(r && r.status === 'swap' && r.note ? r.note : m.items) + '</span>' +
        '<span class="mt-tags">' + ((r && r.status === 'swap' ? Number(r.kcal) : Number(m.kcal)) ? '<span class="chipk">' + esc(r && r.status === 'swap' ? r.kcal : m.kcal) + ' kcal</span>' : '') + (nS ? '<span class="chips">💊 ' + nS + ' supplement' + (nS > 1 ? 's' : '') + '</span>' : '') + '</span></span></button>';
    }).join('') + ml.filter((r) => r.status === 'extra').map((r) => '<button class="mt-row st-ate" data-act="msheet" data-slot="' + esc(r.slot) + '"><span class="mt-rail"><span class="mt-time">' + esc(r.time) + '</span><span class="mt-dot">+</span></span><span class="mt-card"><span class="mt-head"><b>' + esc(r.extra_name) + '</b><span class="mt-st">Extra</span></span><span class="mt-tags"><span class="chipk">' + esc(r.kcal) + ' kcal</span></span></span></button>').join('') +
      '<button class="mt-row add" data-act="mextra"><span class="mt-rail"><span class="mt-time"></span><span class="mt-dot">+</span></span><span class="mt-card"><b>Add a snack or extra meal</b></span></button></div>';
  }
  const per = S.shopPer || 'plan', items = d.shopping.filter((s) => s.period === per);
  const got = items.filter((s) => LS.getItem(shopKey(per, s.item)) === '1').length;
  h += '<h2>Shopping</h2><div class="segc" role="tablist">' + ['plan', 'weekly', 'monthly'].map((x) => '<button role="tab" aria-selected="' + (x === per) + '" class="' + (x === per ? 'on' : '') + '" data-act="shopper" data-p="' + x + '">' + ({ plan: 'Next 7 days', weekly: 'Weekly', monthly: 'Monthly' })[x] + '</button>').join('') + '</div>';
  if (per === 'plan') return h + shopPlanHTML();
  h += '<div class="card"><div class="row sp"><b>' + got + ' of ' + items.length + ' bought</b><span class="mut small">Resets ' + (per === 'weekly' ? 'Sunday' : 'on the 1st') + '</span></div><div class="bar"><i style="width:' + (items.length ? (got / items.length) * 100 : 0) + '%"></i></div>';
  let g = '';
  items.forEach((s, i) => {
    const k = shopKey(per, s.item), chk = LS.getItem(k) === '1';
    if (s.group !== g) { g = s.group; h += '<div class="grp">' + esc(g) + '</div>'; }
    h += '<label class="shop" for="sh' + i + '"><input id="sh' + i + '" type="checkbox" class="chk" data-shop="' + esc(k) + '" ' + (chk ? 'checked' : '') + '><span class="' + (chk ? 'got' : '') + '">' + esc(s.item) + '</span></label>';
  });
  return h + '</div>';
}

/* ---------- Train ---------- */
const LIB_COL = { Kettlebell: ['#f97316', '#ef4444'], 'Animal Flow': ['#22c55e', '#14b8a6'], Mobility: ['#38bdf8', '#6366f1'], HYROX: ['#facc15', '#f97316'], Striking: ['#ef4444', '#a855f7'], Grappling: ['#6366f1', '#0ea5e9'] };
function viewTrain() {
  const today = todayStr(), d = d0(), sel = S.viewDay || today;
  const start = weekStart(sel);
  let h = '<header class="top"><div><p class="date">' + esc(weekLabel(sel)) + '</p><h1>Train</h1></div></header>' + programCard() + tuneCard() + deloadCard() + '<div class="wk" role="group" aria-label="This week">';
  for (let i = 0; i < 7; i++) {
    const ds = dateAdd(start, i), done = logs('WorkoutLog', ds).some((r) => r.status === 'done');
    const sv = sessionFor(ds), ld = !sv || sv.p.load === 'Rest' ? 'rest' : sv.p.load === 'Hard' ? 'hard' : sv.p.load === 'Moderate' ? 'mod' : 'rec';
    h += '<button class="' + (ds === sel ? 'on ' : '') + (done ? 'done ' : '') + (ds === today ? 'today ' : '') + 'ld-' + ld + '" aria-pressed="' + (ds === sel) + '" aria-label="' + dow(ds) + ' ' + Number(ds.slice(8)) + ', ' + (sv ? sv.p.session + ', ' + sv.p.load : 'rest') + (done ? ', done' : '') + '" data-act="vday" data-d="' + ds + '"><small>' + dow(ds).slice(0, 1) + '</small><b>' + Number(ds.slice(8)) + '</b><i class="wd" aria-hidden="true">' + (done ? '✓' : '') + '</i></button>';
  }
  h += '</div><p class="wklegend" aria-hidden="true"><span><i style="background:#ff6b5e"></i>Hard</span><span><i style="background:#f5b83d"></i>Moderate</span><span><i style="background:#4fd1c5"></i>Easy</span><span><i style="background:var(--ok)"></i>Done</span></p>';
  const ses = sessionFor(sel);
  if (!ses) h += '<section class="card emptyday"><p class="mut small" style="margin:0">' + (!D().plan.length ? 'No program yet. Tap Create new program above.' : D().cfg.program_start && sel < D().cfg.program_start ? 'Before your plan starts. Nothing planned.' : 'Rest day. Nothing planned.') + '</p></section>';
  if (ses) {
    const load = ses.mode === 'swap' ? 'Recovery' : ses.p.load;
    h += '<section class="card"><div class="work-top"><div><span class="tag ' + esc(String(load).toLowerCase()) + '">' + esc(load) + '</span><h3>' + esc(ses.name) + '</h3><p class="mut small">' + esc(niceDate(sel)) + ' · ' + esc(ses.p.time) + '</p></div><div class="work-ic">' + ICON(I.train) + '</div></div>' +
      (ses.injured ? '<p class="injline">' + ICON(TI.heart) + '<span>' + ses.injured + ' exercise' + (ses.injured > 1 ? 's' : '') + ' swapped for your ' + esc(ses.injAreas.join(' and ').toLowerCase()) + '</span></p>' : '') +
      '<div class="sesstools" role="group" aria-label="Session tools"><button class="chip" data-act="warmup" data-s="' + esc(ses.name) + '">Warm-up</button><button class="chip" data-act="itopen" data-m="emom">Timer</button><button class="chip" data-act="adjopen" data-m="low" data-d="' + sel + '">Plan B</button><button class="chip" data-act="adjopen" data-m="short" data-d="' + sel + '">Short on time</button></div>' +
      (ses.p.moved ? '<p class="moved">' + ICON(CI.move) + '<span>Moved here ' + esc(String(ses.p.reason || '').replace(/(\d{4}-\d{2}-\d{2})/, (m) => niceDate(m))) + '</span><button class="txt fit" data-act="mvundo" data-d="' + esc(sel) + '" data-r="' + esc(ses.p.reason) + '">Undo</button></p>' : '') + blocksHTML(ses.details, sel) + '</section>';
  }
  h += toolsCard() + loadCard() + skillsCard() + shoesCard();
  const tabs = [...new Set(d.library.map((l) => l.tab))];
  if (tabs.length) {
    const lt = S.libTab || tabs[0];
    h += '<h2>Library</h2><div class="seg" role="tablist">' + tabs.map((t) => '<button role="tab" aria-selected="' + (t === lt) + '" class="' + (t === lt ? 'on' : '') + '" data-act="ltab" data-t="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div><div class="hs">';
    d.library.filter((l) => l.tab === lt).forEach((l) => {
      l = Object.assign({}, l);
      const c = LIB_COL[l.tab] || [['#6d5ce8', '#22d3ee'], ['#14b8a6', '#84cc16'], ['#f43f5e', '#f59e0b'], ['#0ea5e9', '#8b5cf6']][[...l.tab].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4];
      h += '<a class="lib" href="' + esc(l.url) + '" target="_blank" rel="noopener"><div class="th" style="--a:' + c[0] + ';--b:' + c[1] + '"><span>' + ICON(I.play) + '</span></div><div class="lb"><b>' + esc(l.title) + '</b><span class="mut">' + esc(l.creator) + '</span></div></a>';
    });
    h += '<button class="lib add" data-act="inspsheet"><div class="th"><span>' + ICON(I.plus) + '</span></div><div class="lb"><b>Add a reel or TikTok</b><span class="mut">Paste a link</span></div></button></div>';
  } else h += '<h2>Library</h2><button class="card empty-s" data-act="inspsheet" style="width:100%;text-align:left"><b>Add reels and TikToks that inspire you</b><p class="mut small" style="margin:4px 0 0">They show up here, sorted by category.</p></button>';
  const Z = runZones();
  h += '<h2>Strava · runs and activities</h2>' + (Z ? '<p class="foot" style="margin:-4px 4px 10px">Run paces from ' + esc(Z.from) + ': easy ' + fmtSec(Z.easy[0]) + '–' + fmtSec(Z.easy[1]) + ', tempo ' + fmtSec(Z.tempo[0]) + '–' + fmtSec(Z.tempo[1]) + ' /km</p>' : '');
  if (!d.strava.length) h += '<div class="card mut">No activities yet. Connect Strava in More.</div>';
  else {
    h += '<div class="card list">' + d.strava.slice().reverse().map((a) => {
      const km = Number(a.distance_km), min = Number(a.moving_min); let pace = '';
      if (km > 0.2 && min > 0 && /run|walk|hike/i.test(a.type)) { const s = Math.round((min * 60) / km); pace = ' · ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' /km'; }
      const rc = runCheck(a);
      return '<div class="li"><span class="li-ic" style="background:#fc4c02">' + ICON(I.run) + '</span><span class="li-main"><b>' + esc(a.name) + '</b><span class="mut small">' + esc(niceDate(a.date)) + ' · ' + esc(a.distance_km) + ' km · ' + esc(a.moving_min) + ' min' + pace + '</span>' + (rc ? '<span class="rcheck ' + (rc.ok ? 'okt' : 'warnt') + '">' + esc(rc.text) + '</span>' : '') + '</span><span class="li-end">' + (a.avg_hr ? esc(a.avg_hr) + ' bpm' : '') + '</span></div>';
    }).join('') + '</div>';
  }
  return h;
}

/* ---------- Insights ---------- */
const METRICS = { recovery: ['Recovery', '%', 0], hrv: ['HRV', 'ms', 0], sleep_hours: ['Sleep', 'h', 1], rhr: ['Resting HR', 'bpm', 0] };
function viewInsights() {
  const d = d0(), today = todayStr(), mk = S.metric || 'recovery', M = METRICS[mk], tab = S.insTab || 'recovery';
  let h = '<header class="top"><div><p class="date">Your trends</p><h1>Insights</h1></div></header>';
  // decisions waiting for you always come first
  // suggestions older than 10 days are stale (the plan has usually moved on)
  const SG = d.suggestions.filter((s) => !s.date || String(s.date).slice(0, 10) >= dateAdd(today, -10));
  if (SG.length) {
  h += '<h2>Waiting for you</h2>';
  SG.forEach((s) => { h += '<div class="card"><p>' + esc(s.text) + '</p><div class="row" style="margin-top:16px"><button class="g" data-act="sacc" data-id="' + esc(s.id) + '">Accept</button><button class="r" data-act="srej" data-id="' + esc(s.id) + '">Reject</button></div></div>'; });
  }
  const T = [['recovery', 'Recovery'], ['training', 'Training'], ['body', 'Body'], ['you', 'You']];
  h += '<div class="instab" role="tablist" aria-label="Insights sections">' + T.map(([k, l]) => '<button role="tab" aria-selected="' + (k === tab) + '" class="' + (k === tab ? 'on' : '') + '" data-act="instab" data-t="' + k + '">' + l + '</button>').join('') + '</div>';
  if (tab === 'recovery') {
    h += '<h2>WHOOP · last 14 days</h2>';
  h += '<section class="card wcard"><div class="mchips" role="tablist" aria-label="Metric">' + Object.keys(METRICS).map((k) => '<button role="tab" aria-selected="' + (k === mk) + '" class="' + (k === mk ? 'on' : '') + '" data-act="metric" data-m="' + k + '">' + METRICS[k][0] + '</button>').join('') + '</div>';
  if (!d.whoop.length) h += '<p class="mut">No WHOOP data yet. Connect WHOOP in More.</p></section>';
  else {
    const vals = (n) => d.whoop.slice(-n).map((x) => Number(x[mk])).filter((x) => x > 0);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const last = d.whoop[d.whoop.length - 1], age = daysBetween(last.date, today);
    const a7 = avg(vals(7)), a30 = avg(vals(30));
    h += '<div class="wstats">' + [['Latest', Number(last[mk])], ['7-day avg', a7], ['30-day avg', a30]].map(([l, v]) => '<div><span>' + l + '</span><b>' + (v ? cnt(v, M[2]) : '–') + '<small>' + (M[1] === '%' ? '%' : ' ' + M[1]) + '</small></b></div>').join('') + '</div>';
    const cols = [];
    for (let i = 13; i >= 0; i--) { const ds = dateAdd(today, -i); cols.push({ ds, w: whoopFor(ds) }); }
    const max = mk === 'recovery' ? 100 : Math.max(1, ...cols.map((c) => (c.w ? Number(c.w[mk]) || 0 : 0))) * 1.1;
    h += '<div class="chart" role="img" aria-label="' + M[0] + ' by day: ' + cols.filter((c) => c.w).map((c) => c.ds.slice(5) + ' ' + c.w[mk]).join(', ') + '">' + cols.map((c) => {
      const v = c.w ? Number(c.w[mk]) || 0 : 0, r = Number(c.w && c.w.recovery) || 0;
      const col = mk === 'recovery' ? (r >= 67 ? 'var(--ok)' : r >= 34 ? 'var(--warn)' : 'var(--bad)') : 'linear-gradient(180deg,var(--acc),var(--accFill))';
      return '<div class="col' + (c.ds === today ? ' now' : '') + '"><span class="v">' + (c.w ? (M[2] ? v.toFixed(1) : Math.round(v)) : '') + '</span><i style="height:' + (c.w ? Math.max(3, Math.round((v / max) * 96)) : 0) + 'px;background:' + col + '"></i><span class="d">' + Number(c.ds.slice(8)) + '</span></div>';
    }).join('') + '</div><p class="mut small">' + (mk === 'recovery' ? 'Green 67%+ · yellow 34–66% · red 33% and under. ' : '') + 'Empty column = no data that day.' + (age > 0 ? ' <b class="warnt">Latest data is ' + age + ' day' + (age > 1 ? 's' : '') + ' old.</b>' : '') + '</p></section>';
  }
    h += whatWorksCard() + affectCard() + weeklyCard(false) + monthlyCard(false);
  } else if (tab === 'training') {
    h += fatigueCard() + volumeCard() + prsSection() + standardsCard() + testsCard() + mobCard() + goalsSection();
  } else if (tab === 'body') {
    h += cutCard();
  const b = d.logs.Body.slice(-8).reverse();
  h += '<h2>Weight</h2>' + bodyTrend();
  if (!b.length) h += '<div class="card mut">No entries yet. Log your weight in More.</div>';
  else h += '<div class="card list">' + b.map((x, i) => {
    const prev = b[i + 1], dlt = prev ? Number(x.weight) - Number(prev.weight) : 0;
    return '<div class="li"><span class="li-main"><b>' + esc(x.weight) + ' kg</b><span class="mut small">' + esc(niceDate(x.date)) + (x.waist ? ' · waist ' + esc(x.waist) + ' cm' : '') + '</span></span><span class="li-end ' + (dlt < 0 ? 'okt' : dlt > 0 ? 'badt' : '') + '">' + (prev ? (dlt > 0 ? '+' : '') + dlt.toFixed(1) : '') + '</span></div>';
  }).join('') + '</div>';
    h += foodCheckCard(false) + photosSection();
  } else {
    h += consistencyCard() + choicesCard() + thenNowCard() + raceGoalCard() + patternsCard() + realityCard() + rulesCard() + predictCard() + '<h2>Streaks</h2>' + streakCard() + badgesCard() + yearCard();
  }
  if (S.failed.length) h += '<h2>Not saved</h2><div class="card">' + S.failed.slice(-5).map((f) => '<div class="small" style="padding:6px 0">' + esc(f.item.table || f.item.action) + ': ' + esc(f.error) + '</div>').join('') + '<button class="sm" style="margin-top:12px" data-act="clearfail">Clear</button></div>';
  return h;
}

/* ---------- More ---------- */
function row(o) {
  return '<' + (o.act ? 'button' : 'div') + ' class="li' + (o.cls ? ' ' + o.cls : '') + '"' + (o.act ? ' data-act="' + o.act + '"' : '') + (o.data || '') + '>' + (o.ic ? '<span class="li-ic" style="background:' + o.bg + '">' + ICON(o.ic) + '</span>' : '') +
    '<span class="li-main"><b>' + o.t + '</b>' + (o.s ? '<span class="mut small">' + o.s + '</span>' : '') + '</span><span class="li-end">' + (o.end || '') + (o.act ? '<span class="chev">›</span>' : '') + '</span></' + (o.act ? 'button' : 'div') + '>';
}
function viewMore() {
  const d = d0(), c = d.cfg, lastB = d.logs.Body[d.logs.Body.length - 1];
  const st = (on) => '<span class="pill ' + (on ? 'keep' : 'swap') + '">' + (on ? 'Connected' : 'Connect') + '</span>';
  let h = '<header class="top"><div><p class="date">Apex</p><h1>More</h1></div></header>' + syncBanner();
  const ints = d.interests.map((i) => i.name);
  h += '<h2>Your plan inputs</h2><div class="card plan-in"><p class="mut small" style="margin:0 0 4px">Used when you create a new program on Train.</p></div><div class="card list">' +
    row({ act: 'docsheet', ic: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>', bg: '#ef4444', t: 'Program documents', s: d.docs.length ? d.docs.length + ' uploaded' : 'Upload PDFs, plans, notes', end: d.docs.length ? '<span class="count">' + d.docs.length + '</span>' : '' }) +
    row({ act: 'inspsheet', ic: I.play, bg: '#d6249f', t: 'Reels and TikToks', s: d.library.length + ' saved · add what inspires you', end: '<span class="count">' + d.library.length + '</span>' }) +
    row({ act: 'intsheet', ic: '<path d="m3 20 6-11 4 6 3-4 5 9z"/><circle cx="17" cy="6" r="2"/>', bg: '#14b8a6', t: 'Sports I\'m into', s: ints.length ? esc(ints.slice(0, 3).join(', ')) + (ints.length > 3 ? ' +' + (ints.length - 3) : '') : 'e.g. rock climbing, swimming', end: ints.length ? '<span class="count">' + ints.length + '</span>' : '' }) + '</div>';
  h += '<h2>Coach</h2><div class="card list">' + row({ act: 'knowopen', ic: B7.id, bg: '#0ea5e9', t: 'About me', s: (d.knowledge || []).length ? 'Profile, plan, zones and race history' : 'Profile and notes your coach reads' }) + row({ act: 'chatopen', ic: LI.chat, bg: 'var(--accFill)', t: 'Ask your coach', s: 'Questions about training, food, recovery' }) + row({ act: 'memopen', ic: CI.spark, bg: '#8b5cf6', t: 'What your coach remembers', s: (d.memory || []).length ? d.memory.length + ' thing' + (d.memory.length > 1 ? 's' : '') : 'Nothing yet', end: (d.memory || []).length ? '<span class="count">' + d.memory.length + '</span>' : '' }) +
    row({ act: 'remopen', ic: LI.bell, bg: '#ef4444', t: 'Reminders', s: 'Meals, workout, water, bedtime' }) + row({ act: 'pwopen', ic: CI.cal, bg: '#0ea5e9', t: 'Plan your week', s: 'Move sessions around your calendar' }) +
    row({ act: 'shareopen', ic: BI.share, bg: '#14b8a6', t: 'Share my week', s: D().cfg.share_token ? 'Link is on' : 'Read-only link for a friend or coach' }) + row({ act: 'ramopen', ic: B6.moon, bg: '#8b5cf6', t: ramadan() ? 'Ramadan mode · on' : 'Ramadan mode', s: ramadan() ? 'From ' + niceDate(ramadan().start) : 'Iftar and suhoor times, training moved' }) + row({ act: 'fastopen', ic: BI.moonc, bg: '#6d5ce8', t: 'Fasting mode', s: fasting() ? 'On · iftar ' + esc(fasting().iftar) : 'Intermittent or daily fasting' }) +
    row({ act: 'cutopen', ic: BI.scale, bg: '#f59e0b', t: 'Weight plan', s: cut() ? 'Target ' + cut().target + ' kg' : 'Safe weight loss to a target' }) + row({ act: 'tropen', ic: TI.plane, bg: '#6d5ce8', t: 'Travel mode', s: travel() ? 'On · ' + esc(travel().place) : 'Off' }) + '</div>';
  h += '<h2>Data</h2><div class="card list">' +
    row({ act: 'sync', ic: I.sync, bg: 'var(--accFill)', t: S.busy ? 'Syncing…' : 'Sync now', s: 'Last good sync: ' + esc(ago(c.last_sync_ok)) }) +
    row({ act: 'cw', ic: I.link, bg: '#111', t: 'WHOOP', s: 'Recovery, strain and sleep · read-only', end: st(d.connected.whoop) }) +
    row({ act: 'cs', ic: I.run, bg: '#fc4c02', t: 'Strava', s: 'Your activities · read-only', end: st(d.connected.strava) }) +
    row({ act: 'reload', ic: I.out, bg: '#64748b', t: 'Reload from sheet', s: 'Use after editing your Google Sheet' }) + '</div>';
  h += '<h2>Body</h2><div class="card list">' + row({ act: 'body', ic: I.scale, bg: '#14b8a6', t: 'Log weight and waist', s: lastB ? 'Last: ' + esc(lastB.weight) + ' kg on ' + esc(niceDate(lastB.date)) : 'No entries yet' }) + row({ act: 'breakopen', ic: B6.moon, bg: '#0ea5e9', t: 'Take a break', s: 'Days off + an easy comeback after' }) + row({ act: 'sickopen', ic: TI.heart, bg: sick() ? '#ff453a' : '#64748b', t: sick() ? 'Illness mode · on' : 'I\'m ill', s: sick() ? 'Tap "I feel better" on Today when you\'re back' : 'Pause training and recover' }) + '</div>' + stockCard();
  h += '<h2>Events</h2><div class="card list">' + d.events.map((e) => {
    const left = e.date ? daysBetween(todayStr(), e.date) : null;
    return row({ act: 'evsheet', data: ' data-n="' + esc(e.name) + '" data-d="' + esc(e.date) + '"', ic: I.flag, bg: '#f59e0b', t: esc(e.name), s: e.date ? esc(niceDate(e.date)) : 'Date not set', end: left === null ? '' : left >= 0 ? '<span class="count">' + left + 'd</span>' : '<span class="mut small">passed</span>' });
  }).join('') + row({ act: 'evadd', ic: I.plus, bg: 'var(--accFill)', t: 'Add event' }) + '</div>';
  h += '<h2>Settings</h2><div class="card list">' +
    row({ act: 'setwater', ic: I.drop, bg: '#0ea5e9', t: 'Water unit', end: esc({ L: 'Liters', ml: 'Milliliters', oz: 'Ounces' }[wUnit()]) }) +
    row({ act: 'setwater', ic: I.drop, bg: '#0ea5e9', t: 'Bottle size', end: esc(wFmt(Number(c.bottle_ml) || 750, null, wUnit() === 'L' ? 2 : 0)) }) +
    row({ act: 'setwater', ic: I.drop, bg: '#0ea5e9', t: 'Water target', s: 'Training day / rest day', end: esc(wFmt(Number(c.water_target_train) || 4500) + ' / ' + wFmt(Number(c.water_target_rest) || 3500)) }) +
    row({ act: 'setstart', ic: I.train, bg: '#6d5ce8', t: 'Program start', s: 'Today is week ' + weekNo(todayStr()) + ' of ' + planWeeks(), end: esc(c.program_start ? niceDate(c.program_start) : 'Not set') }) +
    row({ act: 'setsleep', ic: LI.moon, bg: '#6d5ce8', t: 'Sleep you need', end: esc(c.sleep_need || 8) + ' h' }) + row({ act: 'setprot', ic: LI.fork, bg: '#ef4444', t: 'Protein a day', s: c.protein_target ? '' : 'From your meal plan', end: c.protein_target ? esc(c.protein_target) + ' g' : '' }) +
    row({ act: 'settz', ic: I.gear, bg: '#64748b', t: 'Time zone', end: esc(tz().replace(/_/g, ' ')) }) + '</div><p class="foot">Tap a setting to change it. Changes save to your Google Sheet.</p>';
  h += '<div class="card list" style="margin-top:24px">' + row({ act: 'logout', ic: I.out, bg: 'var(--bad)', t: 'Disconnect this phone', cls: 'danger' }) + '</div>';
  return h;
}

function viewSetup() {
  return '<div class="setup"><img src="icon-512.png" alt="" class="setup-logo"><h1>Welcome to Apex</h1><p class="sub">Paste the two things from your Google Sheet setup.</p><div class="card"><label for="su" class="mut small" style="margin-bottom:8px">Web app URL (ends in /exec)</label><input id="su" inputmode="url" autocomplete="off" placeholder="https://script.google.com/macros/s/.../exec"><label for="st" class="mut small" style="display:block;margin:20px 0 8px">Token (api_token in the Config tab)</label><input id="st" autocomplete="off" placeholder="token"><button class="p" style="width:100%;margin-top:24px" data-act="connect">Connect</button></div></div>';
}

const VIEWS = { today: viewToday, meals: viewMeals, train: viewTrain, insights: viewInsights, more: viewMore };
const TABS = [['today', ICON(I.today), 'Today'], ['meals', ICON(I.meals), 'Meals'], ['train', ICON(I.train), 'Train'], ['insights', ICON(I.insights), 'Insights'], ['more', ICON(I.more), 'More']];

function countUp(root) {
  let reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  if (reduce || !window.requestAnimationFrame) return;
  root.querySelectorAll('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count), dec = Number(el.dataset.dec) || 0, t0 = performance.now(), dur = 900;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); };
    el.textContent = (0).toFixed(dec); requestAnimationFrame(step);
  });
}

function render() {
  const app = $('#app'), tabs = $('#tabs');
  if (!S.url || !S.token) { app.innerHTML = viewSetup(); tabs.style.display = 'none'; return; }
  tabs.style.display = 'flex';
  tabs.innerHTML = TABS.map((t) => '<button class="' + (S.tab === t[0] ? 'on' : '') + '" aria-label="' + t[2] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + ' data-act="tab" data-t="' + t[0] + '">' + t[1] + '<span aria-hidden="true">' + t[2] + '</span></button>').join('');
  if (!S.data) { app.innerHTML = '<div class="skel"><i></i><i></i><i></i></div>'; return; }
  const y = window.scrollY, key = S.tab + '|' + (S.viewDay || '') + '|' + (S.libTab || '') + '|' + (S.metric || '') + '|' + (S.shopPer || ''), fresh = S._shown !== key;
  S._shown = key;
  try { app.innerHTML = plural(VIEWS[S.tab]()); } catch (e) { app.innerHTML = '<div class="card">Display error: ' + esc(e.message) + '</div>'; }
  app.classList.remove('enter');
  if (fresh) { void app.offsetWidth; app.classList.add('enter'); countUp(app); }
  S.flash = null;
  window.scrollTo(0, y);
}

/* ---------- actions ---------- */
const LOG_ACTS = ['mate', 'mskip', 'mswap', 'wdone', 'wskip', 'wplus', 'wminus', 'vacc', 'vrej', 'feel', 'mundo', 'wundo'];
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  const a = el.dataset.act;
  // B14: ignore a second tap that lands within 0.8 s on a logging button
  if (LOG_ACTS.includes(a)) { const t = Date.now(); if (t - S.lastTap < 800) return; S.lastTap = t; }
  const KEEP = ['extick', 'icpick', 'inspsave', 'inspdel', 'intadd', 'intaddc', 'intdel', 'setunit', 'setbot', 'savewater', 'savetz', 'savetzsel'].concat(COACH_KEEP);
  if (el.closest('.modal.info') && !el.closest('[data-close]') && KEEP.indexOf(a) < 0) closeSheets();
  const ds = todayStr(), ses = S.data && sessionFor(ds);
  const timeVal = () => { const i = $('#mt'); return (i && /^\d{2}:\d{2}$/.test(i.value) && i.value) || nowTime(); };
  switch (a) {
    case 'tab': S.tab = el.dataset.t; S.viewDay = null; render(); window.scrollTo(0, 0); break;
    case 'connect': {
      const u = $('#su').value.trim(), t = $('#st').value.trim();
      if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u) || !t) { toast('Need the https://script.google.com/.../exec URL and the token'); break; }
      S.url = u; S.token = t; LS.setItem('url', u); LS.setItem('token', t); load(); break;
    }
    case 'logout': if (confirm('Disconnect this phone? Your sheet keeps all data.' + (S.queue.length ? ' ' + S.queue.length + ' entries not uploaded yet will be lost.' : ''))) { LS.clear(); location.reload(); } break;
    case 'sync': toast('Syncing WHOOP and Strava...'); load(true); break;
    case 'reload': load(); break;
    case 'vacc': case 'vrej': {
      const w = whoopFor(ds);
      send({ action: 'suggest_decide', id: 'verdict-' + ds, status: a === 'vacc' ? 'accepted' : 'rejected', date: ds, text: 'Verdict ' + (w ? w.verdict + ' (recovery ' + w.recovery + '%)' : '') });
      break;
    }
    case 'vundo': send({ action: 'suggest_decide', id: 'verdict-' + ds, status: 'cleared', date: ds, text: 'Verdict choice cleared' }); break;
    case 'wdone': case 'wskip': if (a === 'wdone') stackNudge('workout'); send({ action: 'log', table: 'WorkoutLog', row: { date: ds, session: ses.name, status: a === 'wdone' ? 'done' : 'skipped', note: ses.mode, time: nowTime() } });
      if (a === 'wdone') { S.rate = { date: ds, session: ses.name }; setTimeout(() => infoSheet('Rate your session', rateBody(), 'rate'), 350); } break;
    case 'wundo': send({ action: 'del', table: 'WorkoutLog', row: { date: ds, session: ses.name } }); break;
    case 'mate': S.flash = 'meal'; autoSupps(el.dataset.slot); stackNudge(el.dataset.slot); send({ action: 'log', table: 'MealLog', row: { date: ds, slot: el.dataset.slot, status: 'ate', time: timeVal(), note: '', extra_name: '', kcal: '' } }); break;
    case 'mskip': send({ action: 'log', table: 'MealLog', row: { date: ds, slot: el.dataset.slot, status: 'skipped', time: '', note: '', extra_name: '', kcal: '' } }); break;
    case 'mundo': send({ action: 'del', table: 'MealLog', row: { date: ds, slot: el.dataset.slot } }); break;
    case 'mswap': foodOpen('swap', el.dataset.slot, timeVal()); break;
    case 'mextra': foodOpen('extra'); break;
    case 'wplus': case 'wminus': {
      const bot = Number(S.data.cfg.bottle_ml) || 750, cur = Number((logs('WaterLog', ds)[0] || {}).ml) || 0;
      const nv = Math.max(0, cur + (a === 'wplus' ? bot : -bot));
      if (nv > LIM.waterMax) { toast('That would be over ' + wFmt(LIM.waterMax, null, 0) + ' today. Not added.', 3000); break; }
      if (a === 'wplus' && cur < LIM.waterWarn && nv >= LIM.waterWarn && !confirm('Over ' + wFmt(LIM.waterWarn, null, 0) + ' today. Too much water too fast can be dangerous. Add anyway?')) break;
      S.flash = 'water'; send({ action: 'log', table: 'WaterLog', row: { date: ds, ml: nv, time: nowTime() } }); break;
    }
    case 'feel': send({ action: 'log', table: 'Checkin', row: { date: ds, feel: el.dataset.v } }); break;
    case 'body': {
      const last = S.data.logs.Body[S.data.logs.Body.length - 1];
      const v = await form('Log body (today)', [
        { label: 'Weight (kg)', type: 'number', attrs: 'inputmode="decimal" step="0.1" min="20" max="300"', value: last ? last.weight : '', check: range('Weight', LIM.weight[0], LIM.weight[1]) },
        { label: 'Waist (cm, optional)', type: 'number', attrs: 'inputmode="decimal" step="0.5" min="40" max="200"', check: range('Waist', LIM.waist[0], LIM.waist[1], true) }
      ]);
      if (!v) break;
      if (last && Math.abs(Number(v[0]) - Number(last.weight)) > 5 && !confirm('That is ' + Math.abs(Number(v[0]) - Number(last.weight)).toFixed(1) + ' kg different from last time. Save anyway?')) break;
      send({ action: 'log', table: 'Body', row: { date: ds, weight: v[0], waist: v[1] } }); toast('Saved'); break;
    }
    case 'evadd': {
      const v = await form('Add event', [{ label: 'Name', check: need('Name'), attrs: 'maxlength="80"' }, { label: 'Date (leave empty if not set)', type: 'date', check: validDate(true) }, { label: 'Type (race, fight, test...)', value: 'race', attrs: 'maxlength="30"' }]);
      if (!v) break;
      if (v[1] && v[1] < ds && !confirm('That date has already passed. Save anyway?')) break;
      send({ action: 'log', table: 'Events', row: { name: v[0], date: v[1], type: v[2] || 'race', status: v[1] && v[1] < ds ? 'done' : 'upcoming', result: '' } }); break;
    }
    case 'evdel': if (confirm('Delete ' + el.dataset.n + '?')) send({ action: 'del', table: 'Events', row: { name: el.dataset.n, date: el.dataset.d } }); break;
    case 'msheet': mealSheet(el.dataset.slot); break;
    case 'setwater': S.setUnit = null; infoSheet('Water', waterSetBody(), 'water'); break;
    case 'setunit': {
      const from = S.setUnit || wUnit(), to = el.dataset.u, vals = [0, 1, 2].map((i) => toMl($('#sw' + i).value, from));
      S.setUnit = to; refreshSheet('water', waterSetBody(to));
      vals.forEach((ml, i) => { if (isFinite(ml) && ml > 0) $('#sw' + i).value = trimNum(wNum(ml, to), to); });
      break;
    }
    case 'setbot': { const u = S.setUnit || wUnit(); $('#sw0').value = trimNum(wNum(Number(el.dataset.ml), u), u); break; }
    case 'savewater': {
      const u = S.setUnit || wUnit(), [b, t1, t2] = [0, 1, 2].map((i) => Math.round(toMl($('#sw' + i).value, u))), err = $('#swerr');
      if (!(b >= 100 && b <= 3000)) { err.textContent = 'Bottle size must be between ' + trimNum(wNum(100, u), u) + ' and ' + trimNum(wNum(3000, u), u) + ' ' + u; break; }
      if (!(t1 >= 500 && t1 <= 10000) || !(t2 >= 500 && t2 <= 10000)) { err.textContent = 'Targets must be between ' + trimNum(wNum(500, u), u) + ' and ' + trimNum(wNum(10000, u), u) + ' ' + u; break; }
      setCfg('water_unit', u); setCfg('bottle_ml', b); setCfg('water_target_train', t1); setCfg('water_target_rest', t2);
      closeSheets(); toast('Water settings saved'); break;
    }
    case 'setstart': {
      const v = await form('Program start', [{ label: 'First day of Week 1', type: 'date', value: S.data.cfg.program_start || todayStr(), check: validDate(false) }]);
      if (!v) break;
      setCfg('program_start', v[0]); toast('Week 1 starts ' + niceDate(v[0])); break;
    }
    case 'settz': infoSheet('Time zone', tzBody(), 'tz'); break;
    case 'savetz': case 'savetzsel': {
      const z = a === 'savetz' ? el.dataset.z : $('#tzs').value;
      try { new Intl.DateTimeFormat('en', { timeZone: z }); } catch (e) { toast('Unknown time zone'); break; }
      setCfg('timezone', z); closeSheets(); toast('Time zone set to ' + z.replace(/_/g, ' ')); break;
    }
    case 'docsheet': infoSheet('Program documents', docsBody(), 'docs'); break;
    case 'inspsheet': infoSheet('Reels and TikToks', inspBody(), 'insp'); break;
    case 'intsheet': infoSheet('Sports I\'m into', interestsBody(), 'ints'); break;
    case 'icpick': { const i = $('#ic'); if (i) i.value = el.dataset.v; break; }
    case 'inspsave': {
      const u = ($('#il').value || '').trim(), cat = ($('#ic').value || '').trim(), note = ($('#in').value || '').trim(), err = $('#ierr');
      if (!/^https?:\/\/\S+$/i.test(u)) { err.textContent = 'Paste a full link that starts with https://'; break; }
      if (!cat) { err.textContent = 'Pick or type a category'; break; }
      if (S.data.library.some((l) => l.url === u)) { err.textContent = 'You already saved this link'; break; }
      const pf = platformOf(u);
      send({ action: 'log', table: 'Library', row: { tab: cat.slice(0, 40), title: (note || pf + ' video').slice(0, 120), creator: pf, url: u, note: note } });
      refreshSheet('insp', inspBody()); toast('Saved to ' + cat); break;
    }
    case 'inspdel': send({ action: 'del', table: 'Library', row: { url: el.dataset.u } }); refreshSheet('insp', inspBody()); break;
    case 'intadd': case 'intaddc': {
      const n = a === 'intadd' ? el.dataset.n : ($('#ia').value || '').trim();
      if (!n) break;
      if (S.data.interests.some((i) => i.name.toLowerCase() === n.toLowerCase())) { toast(n + ' is already in your list'); break; }
      send({ action: 'log', table: 'Interests', row: { name: n.slice(0, 40), added: todayStr(), note: '' } });
      refreshSheet('ints', interestsBody()); break;
    }
    case 'intdel': send({ action: 'del', table: 'Interests', row: { name: el.dataset.n } }); refreshSheet('ints', interestsBody()); break;
    case 'extick': {
      const on = LS.getItem(el.dataset.k) !== '1'; LS.setItem(el.dataset.k, on ? '1' : '0');
      el.classList.toggle('on', on); el.setAttribute('aria-pressed', on); if (el.closest('.exrow')) el.closest('.exrow').classList.toggle('on', on);
      const box = el.closest('.wo'), all = box.querySelectorAll('.ex'), dn = box.querySelectorAll('.ex.on').length;
      box.querySelector('.wo-prog span').textContent = dn + ' of ' + all.length + ' done';
      box.querySelector('.wo-prog i').style.width = Math.round((dn / all.length) * 100) + '%';
      break;
    }
    case 'ssheet': if (ses) infoSheet(ses.name, '<p class="mut small">' + esc(ses.p.time) + ' · ' + esc(ses.mode === 'swap' ? 'Recovery' : ses.p.load) + '</p>' + blocksHTML(ses.details)); break;
    case 'jump': if (el.dataset.k === 'insights') { S.tab = 'insights'; S.insTab = 'recovery'; S.metric = 'sleep_hours'; render(); window.scrollTo(0, 0); break; } { const t = document.getElementById('sec-' + el.dataset.k); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
    case 'shopper': S.shopPer = el.dataset.p; render(); break;
    case 'metric': S.metric = el.dataset.m; render(); break;
    case 'evsheet': {
      const n = el.dataset.n, dt = el.dataset.d, left = dt ? daysBetween(ds, dt) : null;
      const ev = S.data.events.find((e) => e.name === n && e.date === dt) || {};
      infoSheet(n, '<div class="evbig">' + (left === null ? '<b>—</b><span>date not set</span>' : left >= 0 ? '<b>' + left + '</b><span>days to go</span>' : '<b>✓</b><span>passed</span>') + '</div><p class="mut center">' + (dt ? esc(niceDate(dt)) : 'Add the date in the Events tab of your sheet.') + (left !== null && left >= 0 && left <= 180 ? ' · ' + racePhase(left) + ' phase' : '') + '</p>' +
        (dt ? '<div class="card list flat"><button class="li" data-act="evgoal" data-n="' + esc(n) + '" data-d="' + esc(dt) + '"><span class="li-main"><b>Goal time</b><span class="mut small">' + (ev.goal ? 'Used for your race pace' : 'Set one to get your goal pace') + '</span></span><span class="li-end">' + esc(ev.goal || 'Not set') + '<span class="chev">›</span></span></button></div>' : '') +
        (dt && left >= 0 ? '<button class="p" style="width:100%;margin-top:16px" data-act="racedayopen" data-n="' + esc(n) + '" data-d="' + esc(dt) + '">Race-day plan</button>' : '') +
        '<button class="r" style="width:100%;margin-top:24px" data-act="evdel" data-n="' + esc(n) + '" data-d="' + esc(dt) + '">Delete event</button>');
      break;
    }
    case 'vday': S.viewDay = el.dataset.d; render(); break;
    case 'ltab': S.libTab = el.dataset.t; render(); break;
    case 'sacc': case 'srej': send({ action: 'suggest_decide', id: el.dataset.id, status: a === 'sacc' ? 'accepted' : 'rejected' }); break;
    case 'clearfail': S.failed = []; save(); render(); break;
    default: if (COACH_ACTS[a]) await COACH_ACTS[a](el); break;
    case 'cw': case 'cs': {
      // open the window inside the tap so iPhone does not block it, then point it at the link
      const win = window.open('', '_blank');
      try { const j = await call({ action: 'links' }); const u = a === 'cw' ? j.links.whoop : j.links.strava; if (win) win.location = u; else location.href = u; }
      catch (e) { if (win) win.close(); toast('Error: ' + e.message); }
      break;
    }
  }
});
async function uploadFiles(files, label) {
  for (const f of files) {
    if (f.size > 20 * 1024 * 1024) { toast(f.name + ' is over 20 MB', 3500); continue; }
    S.uploading = f.name; refreshSheet('docs', docsBody()); if (S.wiz) refreshSheet('wiz', wizBody());
    try {
      const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(f); });
      const j = await call({ action: 'upload', name: f.name, mime: f.type || 'application/octet-stream', data, label: label || 'Other' });
      S.data.docs.push(j.doc); save(); toast('Uploaded ' + f.name);
      if (S.wiz && label) { S.wiz.docs[j.doc.url] = { on: true, label: j.doc.label || label, note: '' }; wizSave(); }
    } catch (e) { toast(e.message === 'offline' ? 'You are offline. Try again when connected.' : 'Upload failed: ' + e.message, 4000); }
    S.uploading = null; refreshSheet('docs', docsBody()); if (S.wiz) refreshSheet('wiz', wizBody());
  }
  render();
}
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'docfile' && ev.target.files.length) { uploadFiles([...ev.target.files]); return; }
  const el = ev.target.closest('[data-shop]'); if (!el) return;
  LS.setItem(el.dataset.shop, el.checked ? '1' : '0'); render();
});
window.addEventListener('online', () => load());
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
/* ---------- pull to refresh: pull down at the top to sync WHOOP + Strava and redraw everything ---------- */
(function pullToRefresh() {
  const ind = document.createElement('div');
  ind.id = 'ptr'; ind.setAttribute('aria-hidden', 'true');
  ind.innerHTML = ICON(I.sync) + '<span>Pull to sync</span>';
  document.body.appendChild(ind);
  const TH = 64; let y0 = null, d = 0, busy = false;
  const app = () => $('#app');
  const can = () => window.scrollY <= 0 && !document.querySelector('.modal') && S.url && S.token && S.data && !busy;
  const paint = () => {
    ind.style.transform = 'translate(-50%,' + (d - 56) + 'px)';
    ind.style.opacity = Math.min(1, d / 36);
    ind.querySelector('svg').style.transform = 'rotate(' + d * 4 + 'deg)';
    const ready = d >= TH; ind.classList.toggle('ready', ready);
    ind.querySelector('span').textContent = ready ? 'Release to sync' : 'Pull to sync';
    app().style.transform = 'translateY(' + d * 0.7 + 'px)';
  };
  function reset() {
    ind.classList.remove('spin', 'ready');
    ind.style.transition = 'transform .4s var(--ease),opacity .25s'; app().style.transition = 'transform .4s var(--ease)';
    ind.style.transform = 'translate(-50%,-64px)'; ind.style.opacity = 0; app().style.transform = '';
    setTimeout(() => { ind.style.transition = ''; app().style.transition = ''; }, 420);
  }
  window.addEventListener('touchstart', (e) => { y0 = can() && e.touches.length === 1 ? e.touches[0].clientY : null; d = 0; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy <= 0 || window.scrollY > 0) { if (d) { d = 0; reset(); } return; }
    e.preventDefault();
    d = Math.min(110, dy * 0.5); paint();
  }, { passive: false });
  window.addEventListener('touchend', async () => {
    if (y0 === null) return; y0 = null;
    if (d < TH) { d = 0; reset(); return; }
    busy = true; ind.classList.add('spin'); ind.querySelector('span').textContent = 'Syncing WHOOP & Strava';
    ind.style.transition = 'transform .3s var(--ease)'; app().style.transition = 'transform .3s var(--ease)';
    ind.style.transform = 'translate(-50%,8px)'; app().style.transform = 'translateY(56px)';
    S._shown = null; await load(true); S._shown = null; render();
    busy = false; d = 0; reset();
  });
})();
if (S.data) normalize(S.data);
render();
load();


/* ===================== v2c.js ===================== */
/* Apex 2.0 graphics: one line-icon set, small illustrations and charts (all inline SVG, no downloads).
   Loaded before v2a.js. Icons use currentColor so they follow dark and light mode. */
const GI_P = {
  run: '<circle cx="14.5" cy="4.5" r="2"/><path d="M6 21l3.5-5.5L13 18v3M5 12l3-3.5 4.5 1 2 3.5 3.5 1M9.5 15.5L12 10"/>',
  barbell: '<path d="M2.5 9.5v5M5.5 7v10M18.5 7v10M21.5 9.5v5M5.5 12h13"/>',
  pull: '<path d="M3 3.5h18M7.5 3.5v3M16.5 3.5v3"/><circle cx="12" cy="10" r="2"/><path d="M7.5 6.5L12 12l4.5-5.5M12 12v4.5l-2.5 4.5M12 16.5l2.5 4.5"/>',
  kb: '<path d="M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5"/><path d="M6 14.5a6 6 0 0 0 12 0c0-3.3-2.7-6-6-6s-6 2.7-6 6z"/>',
  flame: '<path d="M12 3c.8 3.6 5 5 5 10a5 5 0 0 1-10 0c0-2.8 1.6-4 2-6 1.2 1 2 2.2 2 3.2 1.2-1.8 1.4-4.6 1-7.2z"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/>',
  stretch: '<circle cx="12" cy="4.5" r="2"/><path d="M4 9.5l8 2 8-2M12 11.5v4.5l-4 5M12 16l4 5"/>',
  glove: '<path d="M7 11V7.5a2 2 0 0 1 4 0V10M11 9.5V6a2 2 0 0 1 4 0v4M15 9.5a2 2 0 0 1 4 0V14a7 7 0 0 1-7 7h-1a5 5 0 0 1-5-5v-2a2 2 0 0 1 2-2h3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 21h7"/>',
  sunrise: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5 10.5l1.5 1.5M19 10.5L17.5 12"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8.5 7.5c0-1.5 1-2 1-3.5M12.5 7.5c0-1.5 1-2 1-3.5"/>',
  plate: '<circle cx="12" cy="12.5" r="5.5"/><path d="M3 4v6a2 2 0 0 0 2 2v8M5 4v6M21 4c-1.8 0-3 2-3 5s1.2 3 3 3v8"/>',
  pill: '<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7z"/><path d="M7 7l7 7"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 10a5 5 0 0 1 7 0l-2.2 2.2"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M2.5 20h19"/>',
  face: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5a4.2 4.2 0 0 0 7 0M9 10h.01M15 10h.01"/>',
  plug: '<path d="M9 2.5V7M15 2.5V7M6 7h12v4a6 6 0 0 1-12 0zM12 17v4.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.8 2H4.2zM10 21h4"/>',
  flag: '<path d="M5 21V3.5M5 4h12l-2.5 4L17 12H5"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
  share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v6.5h14V13"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  shoe: '<path d="M3 16.5V10l4 1 3-3 3 2.5c2 1.5 4.5 2 7 2.5V16.5zM3 19.5h18"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  spark: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>',
  cart: '<path d="M3 4h2.5l2 11h11l2-7.5H7"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  tools: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'
};
const gi = (n, cls) => '<svg class="gi ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (GI_P[n] || GI_P.spark) + '</svg>';
const gtile = (n, tone) => '<span class="gtile t-' + (tone || 'vio') + '">' + gi(n) + '</span>';

/* what kind of session is this? → icon + colour */
function sesKind(name, load) {
  const s = String(name || '').toLowerCase();
  if (load === 'Rest' || /^off\b|rest|break/.test(s)) return ['moon', 'vio'];
  if (/hyrox|condition|emom|amrap|metcon|sled/.test(s)) return ['flame', 'warm'];
  if (/kettlebell|\bkb\b/.test(s)) return ['kb', 'warm'];
  if (/bjj|mma|box|spar|grappl|kick|muay|pads/.test(s)) return ['glove', 'bad'];
  if (/mobility|stretch|yoga|recovery|walk|animal/.test(s)) return ['stretch', 'ok'];
  if (/calisthenic|pull|muscle-up|handstand|dip/.test(s) && !/run/.test(s)) return ['pull', 'vio'];
  if (/run|km|tempo|interval|stride|jog/.test(s) && !/legs|calisthenic/.test(s)) return ['run', 'blue'];
  if (/legs|squat|deadlift|strength|gym|heavy/.test(s)) return ['barbell', 'bad'];
  if (/run/.test(s)) return ['run', 'blue'];
  return ['bolt', 'vio'];
}
function mealKind(m) {
  const s = String((m && (m.name + ' ' + m.slot)) || '').toLowerCase(), t = Number(String((m && m.time) || '').slice(0, 2));
  if (/protocol|wake|morning/.test(s)) return 'sunrise';
  if (/magnes|sleep|bed|\bmg\b/.test(s)) return 'moon';
  if (/supp|vitamin|creatine/.test(s)) return 'pill';
  if (/pre-?workout|post|shake|snack/.test(s)) return 'bolt';
  if (/soup/.test(s) || t < 11) return 'bowl';
  return 'plate';
}

/* ---------- small charts ---------- */
function gdonut(pct, color, size, label) {
  size = size || 72; const r = size / 2 - 6, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, pct || 0));
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(label || Math.round(f * 100) + ' percent') + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--v2line)" stroke-width="7"/><circle class="gprog" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="' + Math.round(size * 0.22) + '" font-weight="700">' + Math.round(f * 100) + '%</text></svg>';
}
function gspark(vals, color, w, h) {
  w = w || 120; h = h || 32; const V = vals.filter((v) => v != null); if (V.length < 2) return '';
  const mn = Math.min.apply(null, V), mx = Math.max.apply(null, V), sp = mx - mn || 1, step = w / (vals.length - 1);
  const pts = vals.map((v, i) => v == null ? null : [i * step, h - 4 - ((v - mn) / sp) * (h - 8)]).filter(Boolean);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '), last = pts[pts.length - 1];
  return '<svg class="gspark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + ' L' + last[0] + ' ' + h + ' L' + pts[0][0] + ' ' + h + 'Z" fill="' + color + '" opacity=".12"/><path class="gline" pathLength="1" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="' + color + '"/></svg>';
}
function gbottle(pct, label) {
  const f = Math.max(0, Math.min(1, pct || 0)), top = 8 + 50 * (1 - f);
  return '<svg class="gbottle" width="34" height="64" viewBox="0 0 34 64" role="img" aria-label="' + esc(label || '') + '"><defs><clipPath id="gbc"><path d="M11 2h12v6c0 2 6 4 6 10v40a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V18c0-6 6-8 6-10z"/></clipPath></defs><g clip-path="url(#gbc)"><rect x="0" y="0" width="34" height="64" fill="var(--v2line)"/><rect class="gfill" x="0" y="' + top.toFixed(1) + '" width="34" height="64" fill="#38BDF8"/><path d="M0 ' + top.toFixed(1) + ' q8.5 -3 17 0 t17 0 v4 H0z" fill="#7DD3FC" opacity=".7"/></g><path d="M11 2h12v6c0 2 6 4 6 10v40a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V18c0-6 6-8 6-10z" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/></svg>';
}
/* block route: one dot per week, a line through them, the race flag at the end */
function groute(N, frac, raceLabel) {
  const w = 300, x0 = 14, x1 = raceLabel ? w - 34 : w - 14, step = (x1 - x0) / Math.max(1, N), done = x0 + (x1 - x0) * frac;
  let g = '<line x1="' + x0 + '" y1="20" x2="' + x1 + '" y2="20" stroke="var(--v2line)" stroke-width="4" stroke-linecap="round"/>' + (frac > 0 ? '<line class="gline" pathLength="1" x1="' + x0 + '" y1="20" x2="' + done.toFixed(1) + '" y2="20" stroke="var(--v2vio)" stroke-width="4" stroke-linecap="round"/>' : '');
  for (let i = 0; i <= N; i++) { const x = x0 + i * step, on = x <= done + 0.5; g += '<circle cx="' + x.toFixed(1) + '" cy="20" r="' + (i === 0 || i === N ? 6 : 5) + '" fill="' + (on ? 'var(--v2vio)' : 'var(--v2card)') + '" stroke="' + (on ? 'var(--v2vio)' : 'var(--v2line)') + '" stroke-width="2.5"/>'; if (i < N) g += '<text x="' + (x + step / 2).toFixed(1) + '" y="40" text-anchor="middle" font-size="10" font-weight="600" fill="var(--v2mut)">W' + (i + 1) + '</text>'; }
  if (raceLabel) g += '<g transform="translate(' + (w - 26) + ' 6)" stroke="var(--v2warn)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 26V2M2 3h14l-3 5 3 5H2"/></g>';
  if (frac > 0 && frac < 1) g += '<circle cx="' + done.toFixed(1) + '" cy="20" r="8" fill="var(--v2vio)" opacity=".25"/>';
  return '<svg class="groute" viewBox="0 0 ' + w + ' 46" width="100%" role="img" aria-label="Block ' + Math.round(frac * 100) + ' percent done' + (raceLabel ? ', ending at ' + esc(raceLabel) : '') + '">' + g + '</svg>';
}

/* ---------- illustrations ---------- */
const GILL = {
  night: '<svg class="gill" viewBox="0 0 320 96" width="100%" aria-hidden="true"><defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--v2vio)" stop-opacity=".28"/><stop offset="1" stop-color="var(--v2vio)" stop-opacity="0"/></linearGradient></defs><rect width="320" height="96" rx="16" fill="url(#gsky)"/><path d="M244 22a20 20 0 1 0 22 26 16 16 0 0 1-22-26z" fill="var(--v2vio)" opacity=".85"/><g fill="var(--v2tx)" opacity=".7"><circle cx="40" cy="22" r="1.6"/><circle cx="88" cy="40" r="1.2"/><circle cx="150" cy="18" r="1.8"/><circle cx="196" cy="44" r="1.2"/><circle cx="290" cy="20" r="1.4"/><circle cx="120" cy="56" r="1"/></g><path d="M0 80c40-14 80-14 120-4s80 10 120-2 60-10 80-6v28H0z" fill="var(--v2vio)" opacity=".18"/></svg>',
  plan: '<svg class="gill sm" viewBox="0 0 120 90" aria-hidden="true"><rect x="18" y="16" width="84" height="66" rx="12" fill="var(--v2vioT)" stroke="var(--v2vio)" stroke-width="2.5"/><path d="M18 34h84M40 8v16M80 8v16" stroke="var(--v2vio)" stroke-width="2.5" stroke-linecap="round"/><circle cx="60" cy="58" r="14" fill="var(--v2vio)"/><path d="M60 51v14M53 58h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  plate: '<svg class="gill sm" viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="50" rx="34" ry="30" fill="var(--v2okT)" stroke="var(--v2ok)" stroke-width="2.5"/><ellipse cx="60" cy="50" rx="20" ry="17" fill="none" stroke="var(--v2ok)" stroke-width="2" opacity=".6"/><path d="M14 22v18a5 5 0 0 0 5 5v30M19 22v18M106 22c-5 0-8 5-8 13s3 9 8 9v31" stroke="var(--v2ok)" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>',
  trophy: '<svg class="gill sm" viewBox="0 0 120 90" aria-hidden="true"><path d="M42 14h36v22a18 18 0 0 1-36 0z" fill="var(--v2warnT)" stroke="var(--v2warn)" stroke-width="2.5"/><path d="M42 20H30a12 12 0 0 0 14 16M78 20h12a12 12 0 0 1-14 16M60 54v12M46 78h28" stroke="var(--v2warn)" stroke-width="2.5" stroke-linecap="round" fill="none"/><g fill="var(--v2warn)"><circle cx="22" cy="12" r="2"/><circle cx="100" cy="16" r="2.5"/><circle cx="104" cy="60" r="1.8"/></g></svg>'
};

/* icons for settings rows, by title */
const V2ROWIC = { 'WHOOP': ['heart', 'bad'], 'Strava': ['run', 'warm'], 'Google Calendar': ['cal', 'blue'], 'Sync now': ['bolt', 'vio'], 'Reload from sheet': ['book', 'mut'], 'Count meals as eaten': ['plate', 'ok'], 'Log workouts from Strava': ['run', 'warm'], 'Evening wrap-up reminder': ['moon', 'vio'],
  'Races and events': ['flag', 'warm'], 'Body and weight': ['scale', 'ok'], 'Supplement stock': ['pill', 'ok'], 'Program documents': ['book', 'vio'], 'Saved reels': ['spark', 'vio'], 'Reels and TikToks': ['spark', 'vio'], 'Sports I\'m into': ['glove', 'bad'], 'Program start': ['cal', 'vio'],
  'About me': ['face', 'vio'], 'What the coach remembers': ['spark', 'vio'], 'Share my week': ['share', 'blue'], 'Reminders': ['bell', 'warm'], 'Siri and Shortcuts': ['mic', 'vio'], 'Ramadan mode': ['moon', 'vio'], 'Fasting': ['timer', 'warm'], 'Water': ['drop', 'blue'], 'Time zone': ['sun', 'warm'], 'Home city for weather': ['sun', 'warm'], 'All settings and tools': ['tools', 'mut'], 'Classic layout': ['gear', 'mut'] };

/* hours (7.99) -> '7 h 59', never '7 h 60' */
function hmOf(h) { const t = Math.round(Number(h) * 60); return Math.floor(t / 60) + ' h ' + String(t % 60).padStart(2, '0'); }


/* ===================== v2d.js ===================== */
/* Apex 2.0 · Health watch: early illness warning from WHOOP + ways to stay healthy.
   Compares today with your own normal (median of the 30 days before). Not a diagnosis. */

const ILL_MIN_DAYS = 7;
function illNum(v) { const n = Number(v); return v === '' || v == null || isNaN(n) || n <= 0 ? null : n; }
function illMed(a) { const s = a.filter((x) => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function illOff() { return LS.getItem('illwatch-off') === '1'; }

function illBase(ds) {
  const past = D().whoop.filter((w) => w.date < ds && w.date >= dateAdd(ds, -30));
  const col = (k) => past.map((w) => illNum(w[k]));
  return { n: past.filter((w) => illNum(w.rhr) || illNum(w.hrv)).length, rhr: illMed(col('rhr')), hrv: illMed(col('hrv')), skin: illMed(col('skin_temp')), spo2: illMed(col('spo2')) };
}

/* Returns null (not enough data / no WHOOP today) or {level: 'ok'|'watch'|'high', score, signals[], keys{}, race, base, w} */
function illRisk(ds) {
  ds = ds || todayStr();
  const w = whoopFor(ds); if (!w) return null;
  const B = illBase(ds); if (B.n < ILL_MIN_DAYS) return null;
  const rhr = illNum(w.rhr), hrv = illNum(w.hrv), skin = illNum(w.skin_temp), spo2 = illNum(w.spo2), sh = illNum(w.sleep_hours), sp = illNum(w.sleep_perf);
  if (rhr == null && hrv == null) return null;
  const sig = [], K = {}; let score = 0;
  const add = (k, pts, txt) => { K[k] = pts; score += pts; sig.push({ k, pts, txt }); };
  // resting heart rate
  if (rhr != null && B.rhr != null) {
    if (rhr >= B.rhr + 5) add('rhr', 1, 'Resting HR ' + rhr + ', normal ' + Math.round(B.rhr));
    else if (rhr >= B.rhr + 3) add('rhr', 0.5, 'Resting HR ' + rhr + ', a bit above your ' + Math.round(B.rhr));
  }
  // rising 3 days in a row
  const r3 = [dateAdd(ds, -2), dateAdd(ds, -1), ds].map((d) => { const x = whoopFor(d); return x ? illNum(x.rhr) : null; });
  if (!K.rhr && r3.every((x) => x != null) && r3[0] < r3[1] && r3[1] < r3[2] && B.rhr != null && r3[2] > B.rhr) add('rhrup', 0.5, 'Resting HR rising 3 days: ' + r3.join(' → '));
  // HRV
  if (hrv != null && B.hrv != null) {
    const h3 = [dateAdd(ds, -2), dateAdd(ds, -1), ds].map((d) => { const x = whoopFor(d); return x ? illNum(x.hrv) : null; }).filter((x) => x != null), a3 = h3.length === 3 ? h3.reduce((a, x) => a + x, 0) / 3 : null;
    if (hrv <= B.hrv * 0.8) add('hrv', 1, 'HRV ' + Math.round(hrv) + ', normal ' + Math.round(B.hrv));
    else if (hrv <= B.hrv * 0.9) add('hrv', 0.5, 'HRV ' + Math.round(hrv) + ', normal ' + Math.round(B.hrv));
    else if (a3 != null && a3 <= B.hrv * 0.93 && hrv < B.hrv) add('hrv', 0.5, 'HRV low 3 days, average ' + Math.round(a3) + ' vs normal ' + Math.round(B.hrv));
  }
  // skin temperature
  if (skin != null && B.skin != null && skin >= B.skin + 1) add('skin', 1, 'Skin temp +' + (skin - B.skin).toFixed(1) + '°C');
  else if (skin != null && B.skin != null && skin >= B.skin + 0.7) add('skin', 0.5, 'Skin temp +' + (skin - B.skin).toFixed(1) + '°C');
  // blood oxygen
  if (spo2 != null && (spo2 < 94 || (B.spo2 != null && spo2 <= B.spo2 - 2))) add('spo2', 1, 'Blood oxygen ' + spo2.toFixed(1) + '%');
  // sleep
  if ((sh != null && sh < 6.5) || (sp != null && sp < 75)) add('sleep', 0.5, sh != null && sh < 6.5 ? 'Slept ' + hmOf(sh) : 'Sleep quality ' + sp + '%');
  // a very hard day yesterday explains a lot of this
  const y = whoopFor(dateAdd(ds, -1)), race = !!(y && Number(y.strain) >= 18);
  let level = score >= 2 ? 'high' : score >= 1 ? 'watch' : 'ok';
  if (race && level === 'high') level = 'watch';
  return { level, score, signals: sig, keys: K, race, base: B, w };
}

/* Ways to stay healthy, most relevant first */
const ILL_TIPS = [
  { k: 'sleep', ic: 'moon', tone: 'vio', t: 'Sleep 8+ hours tonight', s: 'The strongest defence you have. In studies, people sleeping under 6 hours caught colds far more often than those sleeping 7+.' },
  { k: 'train', ic: 'heart', tone: 'bad', t: 'Go easy until your numbers are back', s: 'Hard sessions briefly lower your defences. While HRV is low or resting HR is high, keep it easy or rest. One easy day costs nothing; a cold costs a week.' },
  { k: 'food', ic: 'plate', tone: 'ok', t: 'Eat enough, especially carbs around training', s: 'A big calorie gap plus heavy training is a known illness risk. Carbs during and after hard sessions help your immune system recover.' },
  { k: 'drink', ic: 'drop', tone: 'blue', t: 'Drink enough water', s: 'Aim for pale urine. More on hot days and after sweaty sessions.' },
  { k: 'alcohol', ic: 'bolt', tone: 'warm', t: 'Skip alcohol while the signs are up', s: 'It lowers HRV and sleep quality the same night.' },
  { k: 'hands', ic: 'face', tone: 'mut', t: 'Wash hands, don\'t share bottles', s: 'Most colds spread by hands. Matters most in the gym, at university and in race week. Keep your hands away from your face.' },
  { k: 'stress', ic: 'spark', tone: 'vio', t: 'Plan around stressful weeks', s: 'Exams, travel and races stack with training. Lighten training in those weeks instead of adding to the load.' },
  { k: 'vitd', ic: 'sun', tone: 'warm', t: 'Check vitamin D and iron once a year', s: 'Low vitamin D is linked to more chest infections in athletes. A blood test tells you if you need a supplement; ask your doctor.' },
  { k: 'flu', ic: 'check', tone: 'ok', t: 'Get the yearly flu shot', s: 'Best before winter and before a big race.' },
  { k: 'first', ic: 'pill', tone: 'blue', t: 'At the first sign of a cold', s: 'Use the neck check: runny nose or sore throat only, easy movement is OK. Fever, chest cough or body aches, rest fully. Zinc lozenges started within a day may shorten a cold; ask a pharmacist.' }
];
function illTips(R) {
  const pri = [];
  if (R && R.keys.sleep) pri.push('sleep');
  if (R && (R.keys.rhr || R.keys.hrv || R.keys.rhrup || R.keys.skin)) pri.push('train');
  if (R && R.level !== 'ok') pri.push('sleep', 'drink', 'alcohol', 'first');
  const seen = {}, out = [];
  pri.concat(ILL_TIPS.map((x) => x.k)).forEach((k) => { if (!seen[k]) { seen[k] = 1; out.push(ILL_TIPS.find((x) => x.k === k)); } });
  return out;
}
function illTipRow(x) { return '<div class="v2li">' + gtile(x.ic, x.tone) + '<span class="v2li-t"><b>' + esc(x.t) + '</b><span>' + esc(x.s) + '</span></span></div>'; }

/* Today card */
function illCard(ds) {
  if (illOff() || (typeof sick === 'function' && sick())) return '';
  const R = illRisk(ds); if (!R || R.level === 'ok' || LS.getItem('illx-' + ds)) return '';
  const hi = R.level === 'high', ses = sessionFor(ds), canEase = ses && ses.p && ses.p.load && ses.p.load !== 'Rest' && ses.p.load !== 'Recovery' && !logs('WorkoutLog', ds).length;
  const top = illTips(R).slice(0, 3), ov = D().overrides.find((o) => o.date === ds), eased = ov && /recommended: easier/.test(ov.reason || '');
  if (eased) {
    return '<section class="v2card v2ill done" role="status"><div class="v2ses-h">' + gtile('check', 'ok') + '<div class="v2grow"><span class="v2lbl">Health watch · done</span><h2 class="v2h2">Today\'s session is easier now</h2><span class="v2mut">' + esc(ov.session) + '. One set less on each exercise, about 80% of your usual weights, runs easy.</span></div></div>' +
      '<div class="v2chips">' + R.signals.map((s) => '<span class="v2pill' + (s.pts >= 1 ? ' bad' : '') + '">' + esc(s.txt) + '</span>').join('') + '</div>' +
      '<p class="v2lbl">Still helps today</p><ul class="v2illtips">' + top.map((x) => '<li>' + gi(x.ic) + '<span>' + esc(x.t) + '</span></li>').join('') + '</ul>' +
      '<div class="v2row2"><button class="v2btn2" data-act="v2go" data-sub="session" data-d="' + ds + '" style="flex:1">See session</button><button class="v2btn2" data-act="illundo" data-d="' + ds + '" style="flex:1">Undo</button></div>' +
      '<button class="v2link" data-act="sickopen">Feeling ill? Rest instead ›</button></section>';
  }
  return '<section class="v2card v2ill ' + (hi ? 'hi' : 'watch') + '"><div class="v2ses-h">' + gtile('heart', hi ? 'bad' : 'warm') + '<div class="v2grow"><span class="v2lbl">' + (hi ? 'Health watch · possible illness coming' : 'Health watch') + '</span><h2 class="v2h2">' + (hi ? 'Your body may be fighting something' : 'Your body is under some stress') + '</h2><span class="v2mut">' + (R.race ? 'Partly explained by yesterday\'s very hard effort. ' : '') + (hi ? 'Several signs that often show 1–3 days before a cold.' : 'Early signs, nothing alarming. Worth being careful today.') + '</span></div></div>' +
    '<div class="v2chips">' + R.signals.map((s) => '<span class="v2pill' + (s.pts >= 1 ? ' bad' : '') + '">' + esc(s.txt) + '</span>').join('') + '</div>' +
    '<p class="v2lbl">What helps today</p><ul class="v2illtips">' + top.map((x) => '<li>' + gi(x.ic) + '<span>' + esc(x.t) + '</span></li>').join('') + '</ul>' +
    (canEase ? '<button class="v2btn wide" data-act="illease">Make today\'s session easier</button>' : '') +
    '<div class="v2row2"><button class="v2btn2" data-act="sickopen" style="flex:1">I feel ill</button><button class="v2btn2" data-act="illx" style="flex:1">I feel fine</button></div>' +
    '<button class="v2link" data-act="v2go" data-tab="you" data-sub="health">See your health watch ›</button></section>';
}

/* You › Health watch page */
function illMetric(label, unit, key, base, today, goodHigh, color, dec) {
  const days = []; for (let i = 13; i >= 0; i--) days.push(dateAdd(todayStr(), -i));
  const vals = days.map((d) => { const x = whoopFor(d); return x ? illNum(x[key]) : null; });
  const fmt = (v) => v == null ? '–' : (dec ? v.toFixed(dec) : Math.round(v));
  let st = '', cls = 'ok';
  if (today != null && base != null) {
    const diff = today - base, bad = goodHigh ? diff < 0 : diff > 0, big = key === 'hrv' ? Math.abs(diff) >= base * 0.1 : key === 'rhr' ? Math.abs(diff) >= 3 : key === 'skin_temp' ? Math.abs(diff) >= 0.7 : Math.abs(diff) >= 1.5;
    st = big ? (bad ? 'Off your normal' : 'Better than normal') : 'Normal'; cls = big && bad ? 'bad' : 'ok';
  }
  return '<div class="v2li v2hm"><span class="v2li-t"><b>' + label + '</b><span>Today ' + fmt(today) + unit + ' · normal ' + fmt(base) + unit + '</span><span class="v2hm-st ' + cls + '">' + st + '</span></span>' + gspark(vals, color, 110, 36) + '</div>';
}
function v2health() {
  const ds = todayStr(), R = illRisk(ds), w = whoopFor(ds), B = illBase(ds);
  let h = '<h1 class="v2h1">Health watch</h1><p class="v2mut">Apex compares your WHOOP numbers each morning with your own normal. When several move the wrong way together, it warns you on Today. It can\'t diagnose anything.</p>';
  if (!w || B.n < ILL_MIN_DAYS) {
    h += '<section class="v2card">' + GILL.night + '<h2 class="v2h2">Learning your normal</h2><span class="v2mut">' + (w ? 'Needs ' + ILL_MIN_DAYS + ' days of WHOOP data. ' + B.n + ' so far.' : 'No WHOOP data for today yet. Sync, or wait for this morning\'s data.') + '</span></section>';
  } else {
    const L = R.level, col = L === 'high' ? 'bad' : L === 'watch' ? 'warm' : 'ok';
    h += '<section class="v2card v2flat">' + gtile(L === 'ok' ? 'check' : 'heart', col) + '<div class="v2grow"><span class="v2lbl">Today</span><b class="v2num">' + (L === 'high' ? 'Possible illness coming' : L === 'watch' ? 'Some stress showing' : 'All normal') + '</b><span class="v2mut">' + (R.signals.length ? R.signals.map((s) => esc(s.txt)).join(' · ') : 'Resting HR, HRV, skin temperature and blood oxygen are all in your normal range.') + (R.race ? ' · yesterday was a very hard day' : '') + '</span></div></section>';
    h += '<p class="v2lbl">Last 14 days vs your normal</p><section class="v2card v2list">' +
      illMetric('Resting heart rate', '', 'rhr', B.rhr, illNum(w.rhr), false, 'var(--v2bad)') +
      illMetric('HRV', ' ms', 'hrv', B.hrv, illNum(w.hrv), true, 'var(--v2vio)') +
      illMetric('Skin temperature', '°', 'skin_temp', B.skin, illNum(w.skin_temp), false, 'var(--v2warn)', 1) +
      illMetric('Blood oxygen', '%', 'spo2', B.spo2, illNum(w.spo2), true, 'var(--v2ok)', 1) + '</section>';
  }
  h += '<p class="v2lbl">How to stay healthy</p><section class="v2card v2list">' + illTips(R).map(illTipRow).join('') + '</section>';
  h += '<section class="v2card"><h2 class="v2h2">See a doctor if</h2><span class="v2mut">You have a fever, chest pain, trouble breathing, a racing heart at rest, or your numbers stay off for more than 3 days. Don\'t train through a fever.</span></section>';
  h += '<p class="v2lbl">Settings</p><section class="v2card v2list"><button class="v2li" data-act="illtog" role="switch" aria-checked="' + !illOff() + '">' + gtile('bell', 'vio') + '<span class="v2li-t"><b>Illness warning on Today</b><span>Shows when 2 or more signs move together</span></span><span class="v2sw' + (illOff() ? '' : ' on') + '" aria-hidden="true"><i></i></span></button></section>';
  return h;
}

COACH_KEEP.push('illtog', 'illx');
Object.assign(COACH_ACTS, {
  illx: () => { LS.setItem('illx-' + todayStr(), '1'); toast('OK. I\'ll check again tomorrow.'); render(); },
  illtog: () => { if (illOff()) LS.removeItem('illwatch-off'); else LS.setItem('illwatch-off', '1'); render(); },
  illease: () => { const ds = todayStr(); S.chg = { ds, why: 'tired', opt: 'light' }; COACH_ACTS.v2chggo(); },
  illundo: (el) => {
    const ds = el.dataset.d || todayStr(); let prev = null; try { prev = JSON.parse(LS.getItem('ease-prev-' + ds) || 'null'); } catch (e) { prev = null; }
    if (prev && prev.date === ds) send({ action: 'log', table: 'Overrides', row: prev }); else send({ action: 'del', table: 'Overrides', row: { date: ds } });
    LS.removeItem('ease-prev-' + ds); S.eased = null; toast('Back to the session you had before.');
  }
});

/* ---------- Send to WHOOP (Strength Trainer) ----------
   WHOOP has no public API for adding workouts. Apex writes the session in a fixed, plain
   format that WHOOP's AI ("Generate with WHOOP AI" / WHOOP Coach) maps reliably:
   one line per set, kg everywhere, added weight marked "+", per-side reps marked,
   supersets/EMOMs as numbered rounds, timed holds and distances flagged (Strength Trainer
   counts reps, not seconds or metres), runs and warm-ups listed apart. */

const WH_LOADED = /squat|deadlift|thrust|bench|press|row\b|rdl|clean|snatch|kettlebell|dumbbell|barbell|landmine|sled|wall ball|lunge|carry|good morning|curl|extension|fly|pulldown|leg press/i;
function whCap(t) { t = String(t || '').trim(); return t.charAt(0).toUpperCase() + t.slice(1); }
function whSing(t) { return t.replace(/([a-z-]*[^s\s])s$/i, '$1'); }
function whNum(n) { n = Number(n); return Number.isInteger(n) ? String(n) : String(+n.toFixed(2)); }
/* Clean an exercise name: drop cues, percentages, "weighted", added weight */
function whName(t) {
  let n = String(t || '').replace(/\([^)]*\)/g, ' ').replace(/\+\s*\d+(?:\.\d+)?\s*kg/ig, ' ').replace(/\b\d+(?:\.\d+)?\s*kg\b/ig, ' ');
  n = n.replace(/\s+(?:at|with|to)\s+(?:about|race|your|saturday|that|\d).*$/i, '').replace(/\b(?:attempts?|practice)\b/ig, '').replace(/^weighted\s+/i, '').replace(/[,:;.\s]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  return whCap(n);
}
/* One plan line -> {kind:'ex', name, sets, reps, unit:'reps'|'sec'|'m'|'cal', each, kg, added, note} */
function whLine(line) {
  const L0 = String(line).replace(/\s+/g, ' ').trim(), L = L0.replace(/\((?![^)]*\beach\b)[^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const added = (L.match(/\+\s*(\d+(?:\.\d+)?)\s*kg/i) || [])[1], kgm = L.replace(/\+\s*\d+(?:\.\d+)?\s*kg/ig, '').match(/(\d+(?:\.\d+)?)\s*kg/i);
  const up = L.match(/work up to (?:a )?heavy (\d+)/i);
  if (up) return { kind: 'ex', name: whName(L.split(/:|,/)[0]), sets: 1, reps: Number(up[1]), unit: 'reps', each: false, kg: kgm ? Number(kgm[1]) : 0, added: added ? Number(added) : 0, note: 'top set; build up with lighter warm-up sets first' + (/warm-up sets ([\d, ]+)/i.test(L0) ? ' (' + L0.match(/warm-up sets ([\d, ]+)/i)[1].trim().replace(/,$/, '') + ' reps)' : '') };
  const m = L.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(s|sec|secs|seconds|m(?!in)|meters?|metres?|cal|calories)?\s*(each(?:\s+(?:side|leg|arm|hand))?)?\s*[x×]\s*(\d+)/i);
  if (!m) return null;
  const u = !m[3] ? 'reps' : /^s/i.test(m[3]) ? 'sec' : /^m/i.test(m[3]) ? 'm' : 'cal';
  let name = L.slice(0, m.index); if (L.indexOf(':') > 0 && L.indexOf(':') < m.index && !/\d/.test(L.slice(0, L.indexOf(':')))) name = L.slice(0, L.indexOf(':'));
  name = whName(name); if (!name) return null;
  return { kind: 'ex', name, sets: Math.min(12, Number(m[5])), reps: Number(m[2] || m[1]), unit: u, each: !!m[4], kg: kgm ? Number(kgm[1]) : 0, added: added ? Number(added) : 0, note: m[2] ? 'aim ' + m[1] + '-' + m[2] : '' };
}
/* "3 pull-ups", "10 kettlebell swings", "12 cal row" -> part */
function whPart(t, added) {
  t = String(t).replace(/^minute\s*\d+\s*:\s*/i, '').trim();
  let m = t.match(/^(\d+(?:\.\d+)?)\s*(cal|calories|m|meters?|metres?|s|sec)?\s+(.+)$/i); if (!m) return null;
  const unit = !m[2] ? 'reps' : /^c/i.test(m[2]) ? 'cal' : /^m/i.test(m[2]) ? 'm' : 'sec';
  let rest = m[3], each = false; const e = rest.match(/\((\d+)\s*each\s*side\)/i); if (e) { each = true; }
  return { name: whSing(whName(rest)), reps: e ? Number(e[1]) : Number(m[1]), unit, each, added: added || 0, kg: 0 };
}
function whParse(ses) {
  const out = { items: [], cardio: [], skipped: [] };
  parseSession(ses.details).forEach((b) => {
    const head = b.head || '', ex = b.ex.filter((l) => !/^reels?\s*:/i.test(l));
    if (/warm|cool|mobility|note/i.test(head)) { if (/warm|cool|mobility/i.test(head)) out.skipped.push(head.replace(/\s*\d+\s*min.*$/i, '').trim()); return; }
    if (/\brun\b/i.test(head) || ex.length && ex.every((l) => /\b(km|run|jog|stride)\b/i.test(l) && !/[x×]\s*\d+\s*$/.test(l))) { out.cardio.push(head + (ex[0] ? ': ' + ex[0] : '')); return; }
    const rest = b.rest || 90;
    if (ex.some((l) => /^minute\s*\d+/i.test(l))) {
      const rounds = Number((head.match(/(\d+)\s*rounds?/i) || [])[1]) || 1;
      const parts = ex.filter((l) => !/:\s*rest\b/i.test(l)).map((l) => whPart(l)).filter(Boolean);
      if (parts.length) out.items.push({ kind: 'ss', label: /emom/i.test(head) ? 'EMOM circuit, ' + rounds + ' rounds, one exercise per minute' : 'Circuit, ' + rounds + ' rounds', rounds, parts, rest, raw: ex.join('\n') });
      return;
    }
    ex.forEach((l) => {
      const em = l.match(/^emom\s*x\s*(\d+)\s*:\s*(.*)$/i);
      if (em) {
        const add = Number((em[2].match(/\+\s*(\d+(?:\.\d+)?)\s*kg\s*$/i) || [])[1]) || 0, body = em[2].replace(/\+\s*\d+(?:\.\d+)?\s*kg\s*$/i, '');
        const parts = body.split(/\s\+\s(?=\d)/).map((p) => whPart(p, add)).filter(Boolean);
        if (parts.length) out.items.push({ kind: 'ss', label: 'Superset, EMOM ' + em[1] + ' rounds (one round every minute)', rounds: Number(em[1]), parts, rest: 0, raw: l });
        return;
      }
      const x = whLine(l); if (x) { x.rest = rest; x.raw = l; out.items.push(x); } else out.skipped.push(l.replace(/[,:].*$/, '').slice(0, 40));
    });
  });
  return out;
}
function whWeight(kg, added, name, unit) {
  if (unit === 'cal') return 'machine';
  if (added) return '+' + whNum(added) + ' kg added';
  if (kg) return whNum(kg) + ' kg';
  return WH_LOADED.test(name) ? 'weight not set' : 'bodyweight';
}
function whAmt(v, unit, each) {
  const e = each ? ' each side' : '';
  return unit === 'sec' ? v + ' sec hold' + e + ' (enter as 1 rep)' : unit === 'm' ? v + ' m' + e + ' (enter as 1 rep)' : unit === 'cal' ? v + ' calories' : v + ' reps' + e;
}
function whTime(ds, ses) {
  const wl = logs('WorkoutLog', ds).find((r) => r.session === ses.name && /done|partial/.test(r.status || 'done'));
  const lv = wl && String(wl.note || '').match(/(\d+)\s*min\s*·\s*start\s*(\d{1,2}:\d{2})/);
  const addMin = (hm, n) => { const [h, m] = hm.split(':').map(Number), t = h * 60 + m + n; return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  if (lv) return { done: true, txt: lv[2] + ' to ' + addMin(lv[2], Number(lv[1])) + ' (' + lv[1] + ' min, timed in Apex)', rpe: wl.rpe };
  let st = null; try { st = stravaMatch(ds, ses); } catch (e) { st = null; }
  if (st && st.start && st.moving_min) { const s0 = String(st.start).slice(0, 5); return { done: !!wl, txt: s0 + ' to ' + addMin(s0, Math.round(st.moving_min)) + ' (' + Math.round(st.moving_min) + ' min, from Strava)', rpe: wl && wl.rpe }; }
  let mins = 0; try { mins = estMin(parseSession(ses.details).filter((b) => !b.skip)); } catch (e) { mins = 0; }
  return { done: !!wl, txt: (ses.p.time ? (wl ? 'around ' : 'planned ') + ses.p.time : 'time not logged') + (mins ? ', about ' + mins + ' min' : ''), rpe: wl && wl.rpe };
}
/* Build everything: items with per-set lines, using logged sets when there are any */
function whoopList(ds) {
  const ses = sessionFor(ds); if (!ses || !ses.p) return null;
  const P = whParse(ses), logged = (D().sets || []).filter((s) => s.date === ds), used = new Set();
  let live = []; try { live = liveList(ses); } catch (e) { live = []; }
  const nameOf = (raw) => { const x = live.find((y) => y.raw === raw); return x ? x.name : ''; };
  const same = (a, b) => { a = nk(a); b = nk(b); return !!a && !!b && (a === b || a.includes(b) || b.includes(a)); };
  const pick = (raw, name) => { const ln = nameOf(raw), free = logged.filter((s) => !used.has(s)); let r = free.filter((s) => nk(s.exercise) === nk(ln) || (name && nk(s.exercise) === nk(name))); if (!r.length) r = free.filter((s) => same(s.exercise, ln) || same(s.exercise, name)); r.sort((a, b) => a.set - b.set); r.forEach((s) => used.add(s)); return r; };
  const items = P.items.map((x) => {
    if (x.kind === 'ss') {
      const lg = pick(x.raw, ''), n = lg.length || x.rounds, add = lg.length && Number(lg[0].kg) ? Number(lg[0].kg) : null;
      return Object.assign({}, x, { done: !!lg.length, rounds: n, parts: x.parts.map((p) => Object.assign({}, p, add != null && p.added ? { added: add } : {})) });
    }
    const lg = pick(x.raw, x.name);
    if (lg.length) return Object.assign({}, x, { done: true, sets: lg.map((s) => ({ v: s.reps, kg: Number(s.kg) || 0, note: s.note || '' })) });
    let kg = x.kg; if (!x.added && !kg && x.unit === 'reps') { try { const g = liftSuggest(nameOf(x.raw) || x.name, { sets: x.sets, reps: x.reps, kg: '' }); if (Number(g.kg)) kg = Number(g.kg); } catch (e) { /* none */ } }
    return Object.assign({}, x, { done: false, sets: Array.from({ length: x.sets }, () => ({ v: x.reps, kg, note: '' })) });
  });
  const extra = {}; logged.filter((s) => !used.has(s)).forEach((s) => { (extra[s.exercise] = extra[s.exercise] || []).push({ v: s.reps, kg: Number(s.kg) || 0, note: s.note || '' }); });
  Object.keys(extra).forEach((n) => items.push({ kind: 'ex', name: whName(n), unit: 'reps', each: false, added: 0, rest: 0, done: true, sets: extra[n], note: '' }));
  const T = whTime(ds, ses), anyLog = items.some((i) => i.done);
  if (anyLog && !T.done) T.txt = T.txt.replace(/^planned /, 'around ').replace(/, about/, ' (planned time, exact time not logged), about');
  const notLogged = anyLog ? items.filter((i) => !i.done) : [];
  return { ses, ds, items: anyLog ? items.filter((i) => i.done) : items, notLogged, cardio: P.cardio, skipped: P.skipped, time: T, done: anyLog || T.done, logged: anyLog };
}
function whRest(s) { return !s ? '' : s >= 60 ? (s % 60 ? (s / 60).toFixed(1).replace('.0', '') : s / 60) + ' min' : s + ' sec'; }
function whoopText(ds, W) {
  const L = [];
  L.push('Please build a Strength Trainer workout from this' + (W.done ? ' and add it to the matching activity on ' + niceDate(ds) + '.' : '.'));
  L.push('How to read it: one line = one set, in order. Weights are in kg. "+X kg added" means extra weight on a belt or vest on top of my bodyweight. "each side" means the reps are per side. Keep every exercise, set, rep and weight exactly as written.');
  L.push('');
  L.push('WORKOUT: ' + W.ses.name);
  L.push('DATE: ' + niceDate(ds) + ' (' + ds + ')');
  L.push('TIME: ' + W.time.txt);
  L.push('STATUS: ' + (W.logged ? 'completed, these are my real logged sets' : W.done ? 'completed as planned (sets not logged one by one)' : 'planned, not done yet'));
  if (W.time.rpe) L.push('SESSION EFFORT (RPE): ' + W.time.rpe + '/10');
  let n = 0, ssN = 0;
  W.items.forEach((x) => {
    L.push('');
    if (x.kind === 'ss') {
      const tag = String.fromCharCode(65 + ssN++);
      L.push('SUPERSET ' + tag + ': ' + x.label.replace(/^Superset, /, ''));
      x.parts.forEach((p, i) => L.push('  ' + tag + (i + 1) + ' = ' + p.name + ', ' + whAmt(p.reps, p.unit, p.each) + ', ' + whWeight(p.kg, p.added, p.name, p.unit)));
      for (let r = 1; r <= x.rounds; r++) L.push('Round ' + r + ': ' + x.parts.map((p, i) => tag + (i + 1) + ' ' + p.name + ' ' + whAmt(p.reps, p.unit, p.each).replace(' (enter as 1 rep)', '') + (p.added ? ' +' + whNum(p.added) + ' kg' : '')).join(', then '));
      if (x.parts.some((p) => p.unit !== 'reps' && p.unit !== 'cal')) L.push('Note: holds and distances can be entered as 1 rep.');
      return;
    }
    n++;
    L.push('EXERCISE ' + n + ': ' + x.name + (x.each ? ' (per side)' : ''));
    if (x.rest) L.push('Rest: ' + whRest(x.rest) + ' between sets');
    if (x.note && !x.done) L.push('Note: ' + x.note);
    x.sets.forEach((s, i) => L.push('Set ' + (i + 1) + ': ' + whAmt(s.v, x.unit, x.each) + ', ' + whWeight(x.added ? 0 : s.kg, x.added ? (s.kg || x.added) : 0, x.name, x.unit) + (s.note ? ' (' + s.note + ')' : '')));
  });
  if (W.notLogged && W.notLogged.length) {
    L.push(''); L.push('PLANNED BUT NOT LOGGED (I may have skipped these, do not add unless I confirm):');
    W.notLogged.forEach((x) => L.push('- ' + (x.kind === 'ss' ? x.parts.map((p) => p.name).join(' + ') : x.name)));
  }
  if (W.cardio.length || W.skipped.length) {
    L.push(''); L.push('NOT PART OF THIS STRENGTH WORKOUT (do not add):');
    W.cardio.forEach((c) => L.push('- ' + c + ' (tracked as its own run activity)'));
    if (W.skipped.length) { const sk = W.skipped.filter((x) => !/^(warm-?up|cool-?down|mobility)$/i.test(x)); L.push('- Warm-up and mobility' + (sk.length ? ': ' + sk.join(', ') : '')); }
  }
  L.push(''); L.push('If an exercise is not in the Strength Trainer library, use the closest match and list which ones you changed.');
  return L.join('\n');
}
function whoopImage(ds, W) {
  const w = 1080, pad = 56, rows = []; let ssN = 0;
  W.items.forEach((x) => {
    if (x.kind === 'ss') { const tag = String.fromCharCode(65 + ssN++); rows.push({ t: 'Superset ' + tag + ' · ' + x.rounds + ' rounds', s: x.parts.map((p) => p.name + ' ' + p.reps + (p.unit === 'reps' ? '' : ' ' + (p.unit === 'sec' ? 's' : p.unit)) + (p.each ? '/side' : '') + (p.added ? ' +' + whNum(p.added) + 'kg' : '')).join('  +  ') }); return; }
    const sets = x.sets.map((s) => (x.added || s.kg ? (x.added ? '+' : '') + whNum(x.added ? (s.kg || x.added) : s.kg) + 'kg×' : '') + s.v + (x.unit === 'reps' ? '' : x.unit === 'sec' ? 's' : x.unit === 'm' ? 'm' : 'cal')).join(', ');
    rows.push({ t: x.name + (x.each ? ' (per side)' : ''), s: x.sets.length + ' sets: ' + sets });
  });
  const c = document.createElement('canvas'), g = c.getContext('2d'), F = 'system-ui, -apple-system, Segoe UI, sans-serif';
  const wrap = (txt, font, max) => { g.font = font; const words = String(txt).split(' '), out = []; let line = ''; words.forEach((wd) => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > max && line) { out.push(line); line = wd; } else line = t; }); if (line) out.push(line); return out; };
  const max = w - pad * 2 - 120, laid = rows.map((r) => ({ t: wrap(r.t, '700 36px ' + F, max), s: wrap(r.s, '500 30px ' + F, max) }));
  const hs = laid.map((r) => 34 + r.t.length * 44 + r.s.length * 40 + 20), h = 330 + hs.reduce((a, x) => a + x + 16, 0) + 80;
  c.width = w; c.height = h; g.fillStyle = '#101014'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#8B7CF6'; g.font = '700 30px ' + F; g.fillText('APEX · STRENGTH WORKOUT', pad, 88);
  g.fillStyle = '#FFFFFF'; wrap(W.ses.name, '800 54px ' + F, w - pad * 2).slice(0, 2).forEach((l, i) => { g.font = '800 54px ' + F; g.fillText(l, pad, 160 + i * 62); });
  g.fillStyle = '#A1A1AA'; g.font = '500 30px ' + F; g.fillText(niceDate(ds) + ' · ' + W.time.txt.replace(/\s*\((.*?)\)/, ' ($1)').slice(0, 60), pad, 260);
  g.fillText(W.logged ? 'Real logged sets · weights in kg' : W.done ? 'Done as planned · weights in kg' : 'Planned · weights in kg', pad, 302);
  let y = 340;
  laid.forEach((r, i) => {
    const hh = hs[i]; g.fillStyle = '#1C1C22'; g.beginPath(); (g.roundRect ? g.roundRect(pad, y, w - pad * 2, hh, 22) : g.rect(pad, y, w - pad * 2, hh)); g.fill();
    g.fillStyle = '#8B7CF6'; g.font = '800 34px ' + F; g.fillText(String(i + 1), pad + 30, y + 58);
    let yy = y + 58; g.fillStyle = '#FFFFFF'; r.t.forEach((l) => { g.font = '700 36px ' + F; g.fillText(l, pad + 90, yy); yy += 44; });
    g.fillStyle = '#C9C9D1'; r.s.forEach((l) => { g.font = '500 30px ' + F; g.fillText(l, pad + 90, yy); yy += 40; });
    y += hh + 16;
  });
  g.fillStyle = '#71717A'; g.font = '500 26px ' + F; g.fillText('Made with Apex' + (W.cardio.length ? ' · runs tracked separately' : ''), pad, h - 40);
  return c;
}
function whoopSheet(ds) {
  const W = whoopList(ds);
  if (!W || !W.items.length) { toast('No strength exercises in this session'); return; }
  S.wh = { ds, W };
  const txt = whoopText(ds, W);
  infoSheet('Send to WHOOP',
    '<p class="v2mut">' + (W.logged ? 'Uses the sets you logged, one line per set.' : W.done ? 'You marked this done without logging sets, so it uses the plan. Log sets in live mode next time for exact numbers.' : 'Not done yet, so it uses the plan and suggested weights. Log your sets first to send what you actually did.') + '</p>' +
    '<button class="v2btn wide" data-act="whcopy">Copy for WHOOP</button>' +
    '<details class="v2whd"><summary>See the text</summary><pre class="v2whpre">' + esc(txt) + '</pre></details>' +
    '<button class="v2btn2 wide" data-act="whshare">Share as image instead</button>' +
    '<p class="v2lbl" style="margin-top:16px">Then in WHOOP</p><ol class="v2steps">' +
    '<li>Open Strength Trainer and tap <b>Generate with WHOOP AI</b> (or open WHOOP Coach).</li>' +
    '<li>Paste the text and send it. Text reads more reliably than the image.</li>' +
    '<li>Check the workout it builds: exercise names, sets, reps and weights. Fix anything it changed.</li>' +
    '<li>' + (W.done ? 'Add it to the activity WHOOP recorded at that time (tap the activity and follow the prompts), so the muscle load counts in your strain.' : 'Save it, then start it in Strength Trainer when you train. Wear WHOOP on your wrist so it can track reps.') + '</li></ol>' +
    '<p class="v2mut sm">WHOOP Strength Trainer counts reps, not seconds or metres, so holds and distances are marked "enter as 1 rep". Runs are listed apart because WHOOP tracks them as their own activity.</p>');
}
Object.assign(COACH_ACTS, {
  whsend: (el) => whoopSheet(el.dataset.d || todayStr()),
  whcopy: async () => { const X = S.wh; if (!X) return; try { await navigator.clipboard.writeText(whoopText(X.ds, X.W)); toast('Copied. Paste it in WHOOP.'); } catch (e) { toast('Copy did not work. Open "See the text" and copy it by hand.'); } },
  whshare: async () => {
    const X = S.wh; if (!X) return;
    try {
      const c = whoopImage(X.ds, X.W), blob = await new Promise((r) => c.toBlob(r, 'image/png')), file = new File([blob], 'apex-workout-' + X.ds + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); toast('Image saved. Attach it in WHOOP.');
    } catch (e) { if (e && e.name !== 'AbortError') toast('Sharing did not work. Use Copy for WHOOP.'); }
  }
});
COACH_KEEP.push('whcopy', 'whshare');


/* ===================== v2e.js ===================== */
/* Apex 2.0 · Plan follow-through
   1. A day with nothing logged becomes a rest day (after it has passed).
   2. Easy comeback week: offered as a choice, then checked against what you actually did.
      Consistent → back to the program (or earlier, if every session is done).
      Not consistent → you choose: another easy week, or the program.
   3. Race day check: the plan's RACE day must land on the race's real date. */

const EW_REASON = 'easy week', AUTO_REST = 'auto rest: nothing logged';
const ewOv = (ds) => D().overrides.find((o) => o.date === ds);
const isAuto = (o) => !!o && /^auto rest/.test(o.reason || '');
// an easy-week day stays part of its week even after it was turned into an automatic rest day
const isEasy = (o) => !!o && (/^(easy week|comeback)$/.test(o.reason || '') || /^auto rest.*· (easy week|comeback)$/.test(o.reason || ''));
const trained = (ds) => D().logs.WorkoutLog.some((r) => r.date === ds && r.status === 'done') || D().strava.some((a) => a.date === ds && !/walk/i.test(a.type || ''));
const anyLog = (ds) => D().logs.WorkoutLog.some((r) => r.date === ds);

/* ---------- 1. nothing logged → rest day ---------- */
let autoRestDone = '';
function autoRest() {
  const t = todayStr(), c = D().cfg; if (autoRestDone === t || !S.data) return; autoRestDone = t;
  const since = c.v2_since || t;
  for (let i = 14; i >= 1; i--) {
    const ds = dateAdd(t, -i); if (ds < since) continue;
    const ov = ewOv(ds);
    if (isAuto(ov)) { // Strava came in later: give the day back
      if (trained(ds)) v2quiet({ action: 'del', table: 'Overrides', row: { date: ds } });
      continue;
    }
    if (!ov && c.program_start && ds < c.program_start) continue;
    const s = sessionFor0(ds); if (!s || /^(Rest|Recovery)$/.test(s.p.load)) continue;
    if (anyLog(ds) || trained(ds)) continue;
    v2quiet({ action: 'log', table: 'Overrides', row: { date: ds, session: 'Rest day', load: 'Rest', time: s.p.time || '09:00', daytype: s.p.daytype || 'sat', details: '# Rest\n- Nothing was logged this day, so Apex saved it as a rest day.\n- Planned: ' + String(s.name).slice(0, 120), reason: AUTO_REST + (isEasy(ov) ? ' · ' + ov.reason : '') } });
  }
}

/* ---------- planned vs done for a stretch of days ---------- */
function adherence(from, to) {
  let plan = 0, done = 0; const t = todayStr();
  for (let ds = from; ds <= to && ds < t; ds = dateAdd(ds, 1)) {
    const ov = ewOv(ds), p = isAuto(ov) ? { load: 'Hard' } : (ov && !/^(rest day|break)/.test(ov.reason || '') ? ov : planFor(ds));
    if (!p || /^(Rest|Recovery)$/.test(p.load)) continue;
    plan++;
    const w = D().logs.WorkoutLog.find((r) => r.date === ds && !PART_RE.test(r.session || '') && r.status === 'done');
    if (w) done += /^partial/.test(w.note || '') ? 0.5 : 1; else if (trained(ds)) done += 1;
  }
  return { plan, done, pct: plan ? done / plan : 1 };
}

/* ---------- 3. race day check ---------- */
function planDate(week, day, start) { const b = dateAdd(start, (Number(week) - 1) * 7); for (let i = 0; i < 7; i++) { const d = dateAdd(b, i); if (dow(d) === day) return d; } return null; }
function raceShift() {
  const c = D().cfg, t = todayStr(); if (!c.program_start) return null;
  const row = D().plan.find((p) => /^race\b/i.test(p.session || '')); if (!row) return null;
  const pd = planDate(row.week, row.day, c.program_start);
  const ev = (D().events || []).filter((e) => e.type === 'race' && e.status !== 'done' && e.date && e.date >= t && daysBetween(t, e.date) <= 70).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  if (!ev || !pd || pd === ev.date || dow(pd) !== dow(ev.date)) return null;
  const diff = daysBetween(pd, ev.date); if (diff % 7) return null;
  return { ev, pd, start: dateAdd(c.program_start, diff) };
}

/* ---------- 2. easy week ---------- */
function ewOffer() { try { const o = JSON.parse(D().cfg.easy_week_offer || 'null'); return o && /^\d{4}-\d{2}-\d{2}$/.test(o.from) ? o : null; } catch (e) { return null; } }
function raceNear(ds) { return (D().events || []).some((e) => e.date && e.status !== 'done' && ds >= dateAdd(e.date, -6) && ds <= dateAdd(e.date, 2)); }
// what each day of an easy week would be: keeps comeback days and days you changed yourself, eases the rest
function ewPreview(from) {
  return Array.from({ length: 7 }, (_, i) => {
    const ds = dateAdd(from, i), ov = ewOv(ds), base = planFor(ds);
    if (ov && !isAuto(ov)) return { ds, keep: true, from: ov.session, to: ov.session, load: ov.load };
    if (!base) return { ds, keep: true, from: 'Nothing planned', to: 'Nothing planned', load: 'Rest' };
    if (/^(Rest|Recovery)$/.test(base.load) || raceNear(ds)) return { ds, keep: true, from: base.session, to: base.session, load: base.load };
    const L = comeback(base, 'ease'); return L ? { ds, from: base.session, to: L.session, load: L.load || base.load, L } : { ds, keep: true, from: base.session, to: base.session, load: base.load };
  });
}
function ewWrite(from) {
  let n = 0;
  ewPreview(from).forEach((x) => { if (!x.keep && x.L && x.ds >= todayStr()) { send({ action: 'log', table: 'Overrides', row: Object.assign({}, x.L, { date: x.ds, reason: EW_REASON }) }); n++; } });
  return n;
}
// the easy block around today, if any: first and last day of consecutive easy days
function ewBlock(around) {
  const t = around || todayStr(); let a = null;
  for (let i = -8; i <= 8; i++) { const d = dateAdd(t, i); if (isEasy(ewOv(d))) { a = d; break; } } if (!a) return null;
  let s = a, e = a, gap = 0;
  for (let d = dateAdd(a, -1), g = 0; g < 2; d = dateAdd(d, -1)) { if (isEasy(ewOv(d))) { s = d; g = 0; } else g++; } // a rest day inside the week does not break it
  for (let d = dateAdd(a, 1); gap < 2; d = dateAdd(d, 1)) { if (isEasy(ewOv(d))) { e = d; gap = 0; } else gap++; }
  return { from: s, to: e };
}
function decided(kind, what) { return !!LS.getItem('ewd-' + kind + '-' + what) || (D().decisions || []).some((x) => x.kind === kind && String(x.what || '').indexOf(what) >= 0); }
function markDecided(kind, what) { try { LS.setItem('ewd-' + kind + '-' + what, '1'); } catch (e) { /* private mode */ } }
const wkFrom = (B) => (B.from > dateAdd(B.to, -6) ? B.from : dateAdd(B.to, -6)); // the easy week itself: its last 7 days

function ewRow(x) {
  const ch = !x.keep && x.from !== x.to;
  return '<li><span class="v2ew-d">' + esc(dow(x.ds)) + ' ' + Number(x.ds.slice(8)) + '</span><span class="v2ew-s">' + (ch ? '<s>' + esc(x.from) + '</s><b>' + esc(x.to) + '</b>' : '<b class="' + (/^(Rest|Recovery)$/.test(x.load) ? 'mut' : '') + '">' + esc(x.to) + '</b>') + '</span></li>';
}
function planCard(ds) {
  const t = todayStr(); if (ds !== t) return '';
  // a) race day does not match the race
  const RS = raceShift();
  if (RS && !LS.getItem('rsx-' + RS.pd)) {
    return '<section class="v2card v2prop"><div class="v2ses-h">' + gtile('flag', 'warm') + '<div class="v2grow"><span class="v2lbl">Waiting for you · nothing changes until you choose</span><h2 class="v2h2">Race day is on the wrong date</h2></div></div>' +
      '<span class="v2mut">Your plan has race day on ' + esc(niceDate(RS.pd)) + ', but ' + esc(RS.ev.name) + ' is on ' + esc(niceDate(RS.ev.date)) + '. Moving the plan lines up race day and the taper before it.</span>' +
      '<div class="v2row2"><button class="v2btn" data-act="rsfix" style="flex:1">Line it up</button><button class="v2btn2" data-act="rsx" data-d="' + RS.pd + '">Leave it</button></div></section>';
  }
  // b) an easy week waiting for a yes or no
  const O = ewOffer();
  if (O && dateAdd(O.from, 6) >= t) {
    const P = ewPreview(O.from > t ? O.from : t), n = P.filter((x) => !x.keep).length;
    return '<section class="v2card v2prop"><div class="v2ses-h">' + gtile('heart', 'ok') + '<div class="v2grow"><span class="v2lbl">Waiting for you · nothing changes until you choose</span><h2 class="v2h2">Easy comeback week, ' + esc(shortDate(O.from)) + ' to ' + esc(shortDate(dateAdd(O.from, 6))) + '</h2></div></div>' +
      '<span class="v2mut">Same days, about 80% of your weights, a set less, runs 75% as long and all easy. ' + n + ' session' + (n === 1 ? '' : 's') + ' change. After it, Apex checks how consistent you were before going back to the full program.</span>' +
      '<ul class="v2ew">' + P.map(ewRow).join('') + '</ul>' +
      '<div class="v2row2"><button class="v2btn" data-act="ewacc" style="flex:1">Start the easy week</button><button class="v2btn2" data-act="ewrej">Keep my plan</button></div></section>';
  }
  const B = ewBlock(t);
  // c) inside an easy week, and every session so far is done → offer the full program early
  if (B && t >= B.from && t <= B.to && !LS.getItem('ewkeep-' + B.from) && !decided('easy week early', B.from)) {
    const A = adherence(wkFrom(B), dateAdd(t, -1));
    if (A.plan >= 3 && A.done >= A.plan) {
      return '<section class="v2card v2prop"><div class="v2ses-h">' + gtile('trophy', 'ok') + '<div class="v2grow"><span class="v2lbl">You\'re consistent</span><h2 class="v2h2">' + A.done + ' of ' + A.plan + ' easy sessions done</h2></div></div><span class="v2mut">Every session so far. Go back to the full program for the rest of the week, or finish the easy week first?</span>' +
        '<div class="v2row2"><button class="v2btn" data-act="ewfull" data-f="' + B.from + '" style="flex:1">Full program from today</button><button class="v2btn2" data-act="ewkeep" data-f="' + B.from + '">Keep it easy</button></div></section>';
    }
  }
  // d) the easy week just ended → check it
  const E = ewBlock(dateAdd(t, -1));
  if (E && E.to < t && daysBetween(E.to, t) <= 3 && !decided('easy week check', E.to)) {
    const A = adherence(wkFrom(E), E.to), pct = Math.round(A.pct * 100);
    const next = ewPreview(t), canMore = next.some((x) => !x.keep);
    if (A.pct >= 0.7) {
      return '<section class="v2card v2ill done" role="status"><div class="v2ses-h">' + gtile('check', 'ok') + '<div class="v2grow"><span class="v2lbl">Easy week done · ' + pct + '%</span><h2 class="v2h2">Back to your program</h2><span class="v2mut">' + A.done + ' of ' + A.plan + ' sessions. That\'s consistent, so the full program carries on from today.</span></div></div><div class="v2row2"><button class="v2btn2" data-act="ewok" data-e="' + E.to + '" style="flex:1">Got it</button></div></section>';
    }
    return '<section class="v2card v2prop"><div class="v2ses-h">' + gtile('heart', 'warm') + '<div class="v2grow"><span class="v2lbl">Waiting for you · nothing changes until you choose</span><h2 class="v2h2">Easy week: ' + A.done + ' of ' + A.plan + ' sessions</h2></div></div>' +
      '<span class="v2mut">' + (canMore ? 'That\'s ' + pct + '%. Another easy week to build the habit back, or go back to this month\'s program?' : 'That\'s ' + pct + '%. The next days are race week, already easy, so the program carries on.') + '</span>' +
      (canMore ? '<details class="v2prev"><summary>See the next easy week</summary><ul class="v2ew">' + next.map(ewRow).join('') + '</ul></details>' : '') +
      '<div class="v2row2">' + (canMore ? '<button class="v2btn" data-act="ewmore" data-e="' + E.to + '" style="flex:1">Another easy week</button><button class="v2btn2" data-act="ewcont" data-e="' + E.to + '">The program</button>' : '<button class="v2btn2" data-act="ewcont" data-e="' + E.to + '" style="flex:1">OK</button>') + '</div></section>';
  }
  return '';
}

COACH_KEEP.push('rsx', 'ewkeep');
Object.assign(COACH_ACTS, {
  rsfix: () => { const RS = raceShift(); if (!RS) return; setCfg('program_start', RS.start); decide('race day', RS.ev.name + ': plan moved so race day is ' + RS.ev.date, 'accepted', 'program start ' + RS.start); toast('Race day now on ' + niceDate(RS.ev.date) + '.'); },
  rsx: (el) => { LS.setItem('rsx-' + el.dataset.d, '1'); decide('race day', 'kept race day on ' + el.dataset.d, 'rejected', ''); render(); },
  ewacc: () => { const O = ewOffer(); if (!O) return; const n = ewWrite(O.from > todayStr() ? O.from : todayStr()); setCfg('easy_week_offer', ''); decide('easy week', O.from + ' to ' + dateAdd(O.from, 6), 'accepted', n + ' sessions eased'); toast('Easy week set: ' + n + ' sessions eased.'); },
  ewrej: () => { const O = ewOffer(); setCfg('easy_week_offer', ''); decide('easy week', O ? O.from + ' to ' + dateAdd(O.from, 6) : '', 'rejected', ''); toast('Kept your plan.'); },
  ewfull: (el) => {
    const t = todayStr(), B = ewBlock(t); if (!B) return; let n = 0;
    for (let d = t; d <= B.to; d = dateAdd(d, 1)) { const o = ewOv(d); if (o && o.reason === EW_REASON && !anyLog(d)) { send({ action: 'del', table: 'Overrides', row: { date: d } }); n++; } }
    markDecided('easy week early', el.dataset.f); decide('easy week early', el.dataset.f + ': full program from ' + t, 'accepted', n + ' days back to the plan'); toast('Full program from today.');
  },
  ewkeep: (el) => { LS.setItem('ewkeep-' + el.dataset.f, '1'); render(); },
  ewok: (el) => { markDecided('easy week check', el.dataset.e); decide('easy week check', 'week ending ' + el.dataset.e, 'consistent', ''); render(); },
  ewmore: (el) => { markDecided('easy week check', el.dataset.e); const n = ewWrite(todayStr()); decide('easy week check', 'week ending ' + el.dataset.e, 'another easy week', n + ' sessions eased'); toast('Another easy week: ' + n + ' sessions eased.'); },
  ewcont: (el) => { markDecided('easy week check', el.dataset.e); decide('easy week check', 'week ending ' + el.dataset.e, 'program', ''); toast('Back to the program.'); render(); }
});


/* ===================== v2a.js ===================== */
/* Apex 2.0, part A: shell, readiness, Today, auto-logging, wrap-up, change sheet, live workout.
   Loaded after app.js, so it can replace views and wrap app.js functions.
   Classic layout stays available: localStorage v2off=1 (Settings and more › Classic layout). */
const V2ON = !LS.getItem('v2off');
const V2I = {
  you: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9 4c0 2 2 2 2 5M14 4c0 2 2 2 2 5"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>'
};
const v2tag = (load) => { const k = { Hard: ['hard', 'HARD'], Moderate: ['mod', 'MODERATE'], Recovery: ['rec', 'EASY'], Rest: ['rest', 'REST'] }[load] || ['mod', String(load || '').toUpperCase()]; return '<span class="v2tag ' + k[0] + '">' + esc(k[1]) + '</span>'; };
const v2back = (to, label) => '<button class="v2back" data-act="v2go" data-sub="' + (to || '') + '" aria-label="Back to ' + esc(label || 'previous') + '">‹</button>';
const v2row = (act, title, sub, end, extra, icon, tone) => '<button class="v2li" data-act="' + act + '"' + (extra || '') + '>' + (icon ? gtile(icon, tone) : V2ROWIC[title] ? gtile(V2ROWIC[title][0], V2ROWIC[title][1]) : '') + '<span class="v2li-t"><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</span><span class="v2li-e">' + (end || '›') + '</span></button>';

/* ---------- readiness: one 0-100 score from recovery, HRV, sleep, load and soreness ---------- */
function readiness(ds) {
  const w = whoopFor(ds), hasRec = w && w.recovery !== '' && w.recovery != null && !isNaN(Number(w.recovery));
  const why = [];
  let s;
  if (hasRec) {
    s = Number(w.recovery); why.push('Recovery ' + s + '%');
    const past = D().whoop.filter((x) => x.date < ds && Number(x.hrv) > 0).slice(-30), hb = past.length >= 5 ? past.reduce((a, x) => a + Number(x.hrv), 0) / past.length : 0, hrv = Number(w.hrv);
    if (hb && hrv) { if (hrv < hb * 0.85) { s -= 6; why.push('HRV ' + Math.round(hrv) + ', below your normal'); } else if (hrv > hb * 1.05) why.push('HRV ' + Math.round(hrv) + ', above your normal'); }
    const sh = Number(w.sleep_hours); if (sh) { if (sh < 6) { s -= 6; } why.push('slept ' + hmOf(sh)); }
  } else {
    const ck = logs('Checkin', ds).find((c) => c.feel);
    if (!ck) return null;
    s = { fresh: 75, ok: 60, tired: 40 }[ck.feel] || 60; why.push('You said ' + ck.feel);
  }
  try { const lb = loadBalance(); if (lb && lb.ratio > 1.3) { s -= 5; why.push('training load ' + lb.ratio.toFixed(1) + '× normal'); } } catch (e) { /* load is optional */ }
  const sore = (D().soreness || []).filter((x) => x.date >= dateAdd(ds, -1) && x.date <= ds && Number(x.level) >= 2);
  if (sore.length) { s -= 5; why.push('sore ' + sore.map((x) => x.area).join(', ')); }
  s = Math.max(1, Math.min(99, Math.round(s)));
  const k = s >= 67 ? ['ready', 'READY', 'var(--v2ok)'] : s >= 34 ? ['light', 'GO LIGHTER', 'var(--v2warn)'] : ['rest', 'REST TODAY', 'var(--v2bad)'];
  return { score: s, kind: k[0], word: k[1], color: k[2], why, src: hasRec ? 'whoop' : 'feel' };
}
function v2ring(score, color, size) {
  size = size || 88; const r = size / 2 - 6, c = 2 * Math.PI * r, f = score == null ? 0 : score / 100;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + (score == null ? 'No readiness score yet' : 'Readiness ' + score + ' out of 100') + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--v2line)" stroke-width="8"/>' +
    (score == null ? '' : '<circle class="gprog" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>') +
    '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-family="Space Grotesk,Inter,sans-serif" font-size="' + Math.round(size * 0.3) + '" font-weight="700">' + (score == null ? '--' : score) + '</text></svg>';
}
function readinessCard(ds, ses) {
  const R = readiness(ds), RST = restInfo(ds, ses), d = d0();
  if (!R) {
    const wait = d.connected.whoop;
    return '<section class="v2card v2ready"><div class="v2ready-r">' + v2ring(null) + '</div><div class="v2ready-t"><span class="v2tag none">' + (wait ? 'WAITING FOR WHOOP' : 'NO WHOOP') + '</span><b>' + (wait ? (RST && RST.kind !== 'recovery' ? 'Enjoy your rest' : RST && RST.kind === 'noplan' ? 'No session today' : 'Train as planned') : 'How do you feel this morning?') + '</b>' +
      (wait ? '<span class="v2mut">' + (RST && RST.kind !== 'recovery' ? 'Rest day. Your score shows after WHOOP has scored your sleep.' : 'WHOOP scores you after you wake. I check again every 30 min.') + '</span>' : '<div class="v2row3"><button class="v2chip" data-act="feel" data-v="fresh">Fresh</button><button class="v2chip" data-act="feel" data-v="ok">OK</button><button class="v2chip" data-act="feel" data-v="tired">Tired</button></div>') + '</div></section>';
  }
  let head;
  if (RST && RST.kind !== 'recovery') head = R.score >= 67 ? 'Enjoy the rest. An easy walk is fine.' : R.score >= 34 ? 'Take it easy today.' : 'Your body needs this. Sleep early tonight.';
  else if (RST && RST.kind === 'recovery') head = 'Easy day, keep it gentle';
  else {
    const sp = (sessionFor(ds) || {}).p || {}, easy = /comeback|easing|recommended: easier/.test(sp.reason || '') || /\((?:comeback|easing in|easy)\)/.test(sp.session || '');
    head = R.kind === 'ready' ? (easy ? 'Ready. Keep to today\'s lighter weights' : 'Push the top set today') : R.kind === 'light' ? 'Go a bit lighter today' : 'Your body is asking for a day off';
  }
  const word = RST && RST.kind !== 'recovery' ? 'REST DAY' : R.word;
  const wk = [6, 5, 4, 3, 2, 1, 0].map((i) => { const r = i ? readiness(dateAdd(ds, -i)) : R; return r ? r.score : null; });
  return '<section class="v2card v2ready k-' + R.kind + '"><div class="v2ready-r" style="color:var(--v2tx)">' + v2ring(R.score, R.color) + '</div><div class="v2ready-t"><span class="v2tag ' + R.kind + '">' + word + '</span><b>' + esc(head) + '</b><span class="v2mut">' + esc(R.why.join(' · ')) + '</span>' + (wk.filter((x) => x != null).length >= 3 ? '<span class="v2sparkrow">' + gspark(wk, R.color, 120, 28) + '<span class="v2mut">7 days</span></span>' : '') + '</div></section>';
}

/* ---------- auto-logging ---------- */
// background saves: no toast, no undo entry, no re-render loop
function v2quiet(item) { applyLocal(item); S.queue.push(item); save(); flush(); }
const v2hm = (x) => { const m = String(x || '').match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
function stravaMatch(ds, ses) {
  if (!ses || !ses.p || ses.p.load === 'Rest') return null;
  const run = /run|jog|tempo|interval|km/i.test(ses.name), t = v2hm(ses.p.time);
  return (D().strava || []).filter((a) => a.date === ds).find((a) => {
    const isRun = /run/i.test(a.type), st = v2hm(a.start);
    if (run !== isRun && !(run && /run/i.test(a.name))) return false;
    return t == null || st == null || Math.abs(st - t) <= 240;
  }) || null;
}
/* ---------- AM / PM parts: a day with "# AM ..." and "# PM ..." blocks can be done or skipped one part at a time ----------
   Each part is logged as its own WorkoutLog row ("<session> · AM"). When both parts are decided, the day's own row is
   written too (done, partly done or skipped), so every other screen keeps working from the day's row. */
const PART_TIME = { AM: null, PM: '18:00' };
function sesParts(ses) {
  if (!ses || !ses.details || !ses.p || ses.p.load === 'Rest') return null;
  const secs = []; let cur = null;
  String(ses.details).split('\n').forEach((l) => { if (/^\s*#/.test(l)) { cur = { head: l.replace(/^\s*#+\s*/, ''), lines: [l] }; secs.push(cur); } else if (cur) cur.lines.push(l); else { cur = { head: '', lines: [l] }; secs.push(cur); } });
  const tag = (h) => (/^AM\b/i.test(h) ? 'AM' : /^PM\b/i.test(h) ? 'PM' : '');
  if (!secs.some((x) => tag(x.head) === 'AM') || !secs.some((x) => tag(x.head) === 'PM')) return null;
  const names = String(ses.name).split(/\s+·\s+/);
  return ['AM', 'PM'].map((k) => {
    const mine = secs.filter((x) => tag(x.head) === k || (!tag(x.head) && /^note|^reels?/i.test(x.head)));
    const nm = (names.find((n) => new RegExp('^' + k + '\\b', 'i').test(n)) || mine[0].head).replace(new RegExp('^' + k + '\\s*', 'i'), '').replace(/:.*$/, '').trim();
    const tail = (String(ses.name).match(/\s(\((?:comeback|easing in|easy)\))(?:\s|$)/) || [])[1] || '';
    const label = (nm.charAt(0).toUpperCase() + nm.slice(1)).replace(/\s*\((?:comeback|easing in|easy)\)\s*/g, ' ').trim();
    const p = Object.assign({}, ses.p, { time: k === 'AM' ? ses.p.time : (PART_TIME.PM) });
    return { k, label, full: label + (tail ? ' ' + tail : ''), log: ses.name + ' · ' + k, ses: Object.assign({}, ses, { name: label + (tail ? ' ' + tail : ''), details: mine.map((x) => x.lines.join('\n')).join('\n'), p, part: k, whole: ses.name }) };
  });
}
function partRow(ds, P) { return D().logs.WorkoutLog.find((r) => r.date === ds && r.session === P.log) || null; }
// keep the day's own row in step with its two parts (writes only when something is out of step)
function partsSync(ds, ses) {
  const PS = sesParts(ses); if (!PS) return;
  const st = PS.map((P) => (partRow(ds, P) || {}).status || ''), whole = logs('WorkoutLog', ds).find((r) => r.session === ses.name);
  const decided = st.every((x) => x === 'done' || x === 'skipped');
  if (!decided) { if (whole && /parts/.test(whole.note || '')) v2quiet({ action: 'del', table: 'WorkoutLog', row: { date: ds, session: ses.name } }); return; }
  if (whole && !/parts/.test(whole.note || '')) return; // logged by hand for the whole day: leave it
  const nd = st.filter((x) => x === 'done').length, sk = PS.filter((P, i) => st[i] === 'skipped').map((P) => P.k);
  const row = { date: ds, session: ses.name, status: nd ? 'done' : 'skipped', note: (nd === 1 ? 'partial · ' : '') + 'parts: ' + PS.map((P, i) => P.k + ' ' + (st[i] === 'done' ? 'done' : 'skipped')).join(', '), time: nowTime(), rpe: (whole && whole.rpe) || '', energy: '' };
  if (!whole || whole.status !== row.status || whole.note !== row.note) v2quiet({ action: 'log', table: 'WorkoutLog', row });
  return sk;
}
function partsLine(ds, ses) {
  const PS = sesParts(ses); if (!PS) return '';
  return PS.map((P) => { const r = partRow(ds, P); return P.k + ' ' + (r ? (r.status === 'done' ? 'done' : 'skipped') : 'to do'); }).join(' · ');
}
function partsHTML(ds, ses) {
  const PS = sesParts(ses); if (!PS) return '';
  const t = todayStr();
  return '<div class="v2parts" role="list">' + PS.map((P) => {
    const r = partRow(ds, P), K = sesKind(P.ses.name, P.ses.p.load), bl = parseSession(P.ses.details).filter((b) => !b.skip);
    let mins = 0; try { mins = estMin(bl); } catch (e) { mins = 0; }
    const st = r ? r.status : '', auto = r && /^auto: Strava/.test(r.note || ''), strength = liveList(P.ses).some((x) => !/\b(run|jog|km|stride)/i.test(x.raw));
    const acts = st ? '<span class="v2tag ' + (st === 'done' ? 'ready">DONE' + (auto ? ' · STRAVA' : '') : 'rest">SKIPPED') + '</span><button class="v2btn2 sm" data-act="v2part" data-s="undo" data-k="' + P.k + '" data-d="' + ds + '" aria-label="Undo ' + P.k + '">Undo</button>'
      : ds <= t ? (strength && ds === t ? '<button class="v2btn v2btn-s" data-act="v2live" data-d="' + ds + '" data-k="' + P.k + '">Start</button>' : '') + '<button class="v2btn2 sm" data-act="v2part" data-s="done" data-k="' + P.k + '" data-d="' + ds + '">Did it</button><button class="v2btn2 sm" data-act="v2part" data-s="skip" data-k="' + P.k + '" data-d="' + ds + '">Skip ' + P.k + '</button>' : '';
    return '<div class="v2part' + (st ? ' ' + (st === 'done' ? 'done' : 'skip') : '') + '" role="listitem">' + gtile(st === 'done' ? 'check' : K[0], st === 'done' ? 'ok' : st ? 'mut' : K[1]) + '<div class="v2grow"><span class="v2lbl">' + P.k + (P.ses.p.time && P.k === 'AM' ? ' · ' + esc(P.ses.p.time) : P.k === 'PM' ? ' · afternoon' : '') + '</span><b>' + esc(P.label) + '</b><span class="v2mut">' + (mins ? 'About ' + mins + ' min · ' : '') + bl.length + ' block' + (bl.length === 1 ? '' : 's') + '</span><div class="v2part-a">' + acts + '</div></div></div>';
  }).join('') + '</div>';
}
function autoWorkout(ds) {
  if (D().cfg.auto_workouts === 'off') return;
  const ses0 = sessionFor(ds), PS = sesParts(ses0);
  if (PS) { // Strava activities fill in the part they match: a run for AM, a gym session in the afternoon for PM
    PS.forEach((P) => {
      if (LS.getItem('aw-' + ds + '-' + P.k) || partRow(ds, P) || logs('WorkoutLog', ds).some((r) => r.session === ses0.name)) return;
      const a = stravaMatch(ds, P.ses); if (!a) return;
      LS.setItem('aw-' + ds + '-' + P.k, '1');
      v2quiet({ action: 'log', table: 'WorkoutLog', row: { date: ds, session: P.log, status: 'done', note: 'auto: Strava ' + String(a.name || a.type).slice(0, 60), time: String(a.start || '').match(/\d{1,2}:\d{2}/) ? String(a.start).match(/\d{1,2}:\d{2}/)[0].padStart(5, '0') : nowTime(), rpe: '', energy: '' } });
    });
    return;
  }
  if (LS.getItem('aw-' + ds)) return;
  const ses = ses0; if (!ses || logs('WorkoutLog', ds).some((r) => r.session === ses.name)) return;
  const a = stravaMatch(ds, ses); if (!a) return;
  LS.setItem('aw-' + ds, '1');
  v2quiet({ action: 'log', table: 'WorkoutLog', row: { date: ds, session: ses.name, status: 'done', note: 'auto: Strava ' + String(a.name || a.type).slice(0, 60), time: String(a.start || '').match(/\d{1,2}:\d{2}/) ? String(a.start).match(/\d{1,2}:\d{2}/)[0].padStart(5, '0') : nowTime(), rpe: '', energy: '' } });
}
// meals: a meal whose time passed 90 min ago counts as eaten unless you changed it
function mealPassed(ds, m) { if (ds < todayStr()) return true; if (ds > todayStr()) return false; const t = v2hm(m.time); return t != null && v2hm(nowTime()) >= t + 90; }
function mealView(ds, p) {
  if (!p) return [];
  const ms = mealsFor(p.daytype), ml = logs('MealLog', ds), auto = D().cfg.auto_meals !== 'off';
  return ms.map((m) => { const r = ml.find((x) => x.slot === m.slot); return { m, r, st: r ? r.status : auto && mealPassed(ds, m) ? 'auto' : 'todo' }; });
}
function v2fuel(ds, p) {
  const V = mealView(ds, p), ml = logs('MealLog', ds).filter((r) => r.status === 'extra');
  let kcal = 0, prot = 0;
  V.forEach((x) => { if (x.st === 'ate' || x.st === 'auto') { kcal += Number(x.m.kcal) || 0; prot += Number(x.m.protein) || 0; } else if (x.st === 'swap' && x.r) { kcal += Number(x.r.kcal) || Number(x.m.kcal) || 0; prot += Number(x.r.protein) || 0; } });
  ml.forEach((r) => { kcal += Number(r.kcal) || 0; prot += Number(r.protein) || 0; });
  return { kcal: Math.round(kcal), prot: Math.round(prot), V };
}
// days before today: meals that were counted as eaten are saved, so history and reports stay right
function persistMeals() {
  if (D().cfg.auto_meals === 'off') return;
  const t = todayStr(), from = D().cfg.v2_since || t;
  for (let i = 1; i <= 3; i++) {
    const ds = dateAdd(t, -i); if (ds < from || LS.getItem('am-' + ds)) continue;
    const p = dayPlan(ds); LS.setItem('am-' + ds, '1'); if (!p) continue;
    mealView(ds, p).filter((x) => x.st === 'auto').forEach((x) => v2quiet({ action: 'log', table: 'MealLog', row: { date: ds, slot: x.m.slot, status: 'ate', time: x.m.time, note: 'auto', extra_name: '', kcal: '', protein: '' } }));
  }
}

/* ---------- page header: date row with actions, full-width title, status chips ---------- */
const shortDate = (ds) => niceDate(ds).replace(/^(\w{3})\w*/, '$1');
function v2head(kicker, title, sync) {
  return '<header class="v2head"><div class="v2head-r"><p class="v2lbl">' + esc(kicker) + '</p><span class="v2grow"></span><button class="v2ask" data-act="chatopen" aria-label="Ask the coach">' + V2I.spark + '<span>Coach</span></button>' +
    (sync ? '<button class="v2icb' + (S.busy ? ' busy' : '') + '" data-act="sync" aria-label="Sync WHOOP and Strava now">' + ICON(I.sync) + '</button>' : '') + '</div><h1 class="v2h1">' + esc(title) + '</h1></header>';
}
function v2status(ds) {
  const c = D().cfg, st = c.program_start, chips = [];
  if (D().plan.length && st && ds < st) chips.push(['plan', 'Plan starts ' + shortDate(st)]);
  else if (D().plan.length) chips.push(['plan', weekLabel(ds)]);
  if (S.busy) chips.push(['busy', 'Syncing WHOOP and Strava…']);
  else if (c.last_sync_error && D().connected.whoop) chips.push(['bad', 'Last sync had a problem']);
  else { const a = ago(c.last_sync_ok); chips.push(['ok', a === 'never' ? 'Not synced yet' : 'Updated ' + a.replace('today ', '')]); }
  return '<div class="v2status">' + chips.map(([k, t]) => '<span class="v2st ' + k + '">' + (k === 'plan' ? '' : '<i aria-hidden="true"></i>') + esc(t) + '</span>').join('') + '</div>';
}

/* ---------- Today ---------- */
function v2nextUp(ds, p) {
  if (!p) return '';
  const nx = mealView(ds, p).find((x) => x.st === 'todo' && x.m.slot !== 'mg'), W = waterInfo(ds);
  return '<section class="v2card v2list"><div class="v2hd"><span class="v2lbl">Next up</span><button class="v2link" data-act="tab" data-t="meals">Fuel ›</button></div>' +
    (nx ? '<button class="v2li" data-act="msheet" data-slot="' + esc(nx.m.slot) + '">' + gtile(mealKind(nx.m), 'ok') + '<span class="v2li-t"><span class="v2time2">' + esc(nx.m.time) + '</span><b>' + esc(nx.m.name) + '</b>' + (nx.m.supps ? '<span>' + esc(nx.m.supps) + ' with it</span>' : '') + '</span><span class="v2li-e">' + esc(nx.m.kcal) + '</span></button>' : '') +
    '<div class="v2li v2water">' + gtile('drop', 'blue') + '<span class="v2li-t"><span class="v2time2">Water</span><span class="v2bar"><i style="width:' + Math.min(100, Math.round(100 * W.ml / (W.tgt || 1))) + '%;background:#38BDF8"></i></span><span>' + esc(wFmt(W.ml)) + ' of ' + esc(wFmt(W.tgt)) + (W.heat ? ' · hot day' : '') + '</span></span><button class="v2btn2 sm" data-act="wplus" aria-label="Add a bottle">+ Bottle</button></div></section>';
}
function sessionCard(ds, ses) {
  partsSync(ds, ses);
  const p = ses.p, wl = logs('WorkoutLog', ds).find((r) => r.session === ses.name), blocks = parseSession(ses.details).filter((b) => !b.skip);
  let mins = 0; try { mins = estMin(blocks); } catch (e) { mins = 0; }
  const load = ses.mode === 'swap' ? 'Recovery' : p.load;
  if (wl && wl.status === 'done') {
    const auto = /^auto: Strava/.test(wl.note || ''), a = auto ? stravaMatch(ds, ses) : null, rp = Number(wl.rpe) || 0;
    return '<section class="v2card v2ses done"><div class="v2ses-h">' + gtile('check', 'ok') + '<div class="v2grow"><span class="v2tag ready">DONE' + (auto ? ' · FROM STRAVA' : '') + '</span><h2 class="v2h2">' + esc(ses.name) + '</h2></div></div>' +
      (a ? '<div class="v2stats"><div><b>' + esc(a.distance_km) + ' km</b><span>distance</span></div><div><b>' + (Number(a.distance_km) > 0 ? fmtSec(Math.round(Number(a.moving_min) * 60 / Number(a.distance_km))) : '-') + '</b><span>min per km</span></div><div><b>' + esc(a.avg_hr || '-') + '</b><span>avg HR</span></div></div>' : '<span class="v2mut">Logged ' + esc(wl.time || '') + '</span>') +
      (sesParts(ses) ? '<span class="v2mut">' + esc(partsLine(ds, ses)) + '</span>' : '') + '<b class="v2q">How hard did it feel?</b><div class="v2rpe" role="group" aria-label="Effort from 6 to 10">' + [6, 7, 8, 9, 10].map((v) => '<button class="' + (rp === v ? 'on' : '') + '" aria-pressed="' + (rp === v) + '" data-act="v2rpe" data-v="' + v + '">' + v + '</button>').join('') + '</div><span class="v2mut">6 easy · 8 hard but steady · 10 all out</span>' +
      '<div class="v2row2"><button class="v2btn2" data-act="v2wundo">' + (auto ? 'Not me, undo' : 'Undo') + '</button><button class="v2btn2" data-act="v2go" data-sub="session" data-d="' + ds + '">See session</button></div></section>';
  }
  if (wl && wl.status === 'skipped') return '<section class="v2card v2ses"><span class="v2tag rest">SKIPPED</span><h2 class="v2h2">' + esc(ses.name) + '</h2>' + (sesParts(ses) ? '<span class="v2mut">' + esc(partsLine(ds, ses)) + '</span>' : '') + '<div class="v2row2"><button class="v2btn2" data-act="v2wundo">Undo</button></div></section>';
  const K = sesKind(ses.name, load);
  const eased = /recommended: easier/.test(p.reason || ''), fl = S.eased && S.eased.ds === ds && Date.now() - S.eased.t < 5000;
  return '<section class="v2card v2ses' + (fl ? ' flash' : '') + '"><div class="v2ses-h">' + gtile(K[0], K[1]) + '<div class="v2grow"><span class="v2lbl">Today\'s session · ' + esc(p.time || '') + (eased ? ' · <span class="v2eased">' + gi('check') + 'Made easier</span>' : '') + '</span><h2 class="v2h2">' + esc(ses.name) + '</h2><span class="v2mut">' + (mins ? 'About ' + mins + ' min · ' : '') + blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + (ses.injured ? ' · ' + ses.injured + ' swapped for your ' + esc(ses.injAreas.join(' and ').toLowerCase()) : '') + '</span></div>' + v2tag(load) + '</div>' +
    (sesParts(ses) ? partsHTML(ds, ses) + '<div class="v2row2"><button class="v2btn2" data-act="v2change" style="flex:1">Change the whole day</button></div>' : '<div class="v2row2"><button class="v2btn" data-act="v2live" style="flex:1">Start session</button><button class="v2btn2" data-act="v2change">Change</button></div>') +
    '<button class="v2link" data-act="v2go" data-sub="session" data-d="' + ds + '">See all exercises and reels ›</button></section>';
}
function proposalCard(ds) {
  const R = todayRecs(ds); if (!R.length) return '';
  const r = R[0];
  return '<section class="v2card v2prop"><div class="v2ses-h">' + gtile('spark', 'vio') + '<div class="v2grow"><span class="v2lbl">Waiting for you · nothing changes until you choose</span><h2 class="v2h2">' + esc(r.title) + '</h2></div></div><span class="v2mut">' + esc(String(r.why || '').slice(0, 220)) + '</span>' +
    (r.prev ? '<details class="v2prev"><summary>See the new session</summary>' + blocksHTML(r.prev, 'rec-' + r.id) + '</details>' : '') +
    '<div class="v2row2"><button class="v2btn" data-act="' + (r.acc || 'recacc') + '" data-id="' + r.id + '" data-t="' + esc(r.title) + '" style="flex:1">Accept</button><button class="v2btn2" data-act="' + (r.rej || 'recrej') + '" data-id="' + r.id + '" data-t="' + esc(r.title) + '" style="flex:1">Keep original</button></div>' +
    (R.length > 1 ? '<button class="v2link" data-act="recopen">' + (R.length - 1) + ' more suggestion' + (R.length > 2 ? 's' : '') + ' ›</button>' : '') + '</section>';
}
function restCard(ds, ses, RST) {
  let bar = '';
  const m = RST.kind === 'break' && String(RST.label).match(/day (\d+) of (\d+)/);
  if (m) { const a = Number(m[1]), n = Number(m[2]); bar = '<div class="v2seg" role="img" aria-label="Break day ' + a + ' of ' + n + '">' + Array.from({ length: n }, (_, i) => '<i class="' + (i + 1 < a ? 'p' : i + 1 === a ? 'n' : '') + '"></i>').join('') + '</div>'; }
  return '<section class="v2card">' + GILL.night + bar + '<span class="v2tag rest">' + esc(String(RST.label || 'Rest day').toUpperCase()) + '</span><h2 class="v2h2">' + esc(ses ? ses.name : 'Rest day') + '</h2>' +
    '<span class="v2mut">' + esc(ses && ses.p.details ? String(ses.p.details).split('\n').filter((l) => /^\s*-/.test(l)).map((l) => l.replace(/^\s*-\s*/, '')).slice(0, 2).join(' · ') : 'Walk, stretch, sleep well.') + '</span>' +
    (RST.ov ? '<button class="v2btn2 wide" data-act="restcancel">Train today instead</button>' : '') + '</section>';
}
function v2calConflict(ds, ses) {
  if (!ses || ses.p.load === 'Rest' || logs('WorkoutLog', ds).length) return '';
  const t = v2hm(ses.p.time); if (t == null) return '';
  const ev = (D().calendar || []).find((e) => e.date === ds && v2hm(e.start) < t + 60 && v2hm(e.end) > t);
  if (!ev) return '';
  return '<section class="v2card v2flat">' + '<span class="v2ic">' + V2I.cal + '</span><div class="v2grow"><b>' + esc(ev.title || 'Busy') + ' ' + esc(ev.start) + '–' + esc(ev.end) + '</b><span class="v2mut">It overlaps your ' + esc(ses.p.time) + ' session.</span></div><button class="v2btn2 sm" data-act="v2time">Pick time</button></section>';
}
function v2setup() {
  const d = d0(), c = d.connected, steps = [['Google Sheet', true, 'Your plan and meals are in', ''], ['WHOOP', c.whoop, 'Readiness every morning, no typing', 'cw'], ['Strava', c.strava, 'Runs and workouts logged for you', 'cs'], ['Google Calendar', !!D().calOk, 'Sessions move around meetings', 'v2calhelp']];
  const n = steps.filter((s) => s[1]).length; if ((n >= 3 && D().plan.length && c.whoop) || LS.getItem('setup-x')) return '';
  return '<section class="v2card v2list"><div class="v2hd"><span class="v2lbl">Set up Apex · ' + n + ' of 4</span></div><div class="v2bar"><i style="width:' + n * 25 + '%;background:#4ADE9B"></i></div>' +
    steps.map(([t, ok, s, a], i) => '<div class="v2li">' + gtile(['book', 'heart', 'run', 'cal'][i], ok ? 'ok' : 'mut') + '<span class="v2li-t"><b>' + t + '</b><span>' + s + '</span></span>' + (ok ? '' : '<button class="v2btn2 sm" data-act="' + a + '">Connect</button>') + '</div>').join('') +
    '<button class="v2link" data-act="v2setupx">Hide this</button></section>';
}
function viewToday2() {
  autoRest();
  const ds = todayStr(), d = d0(), c = d.cfg, ses = sessionFor(ds), RST = restInfo(ds, ses), p = dayPlan(ds), hr = local().hour;
  let h = v2head(shortDate(ds), greeting() + (c.name ? ', ' + c.name : ''), true) + v2status(ds);
  h += syncBanner() + tzBanner() + v2setup() + sickCard() + illCard(ds) + planCard(ds) + ramCard() + raceWeekCard() + postRaceCard() + v2heatCard(ds);
  h += readinessCard(ds, ses);
  if (RST && RST.kind === 'noplan') h += '<section class="v2card">' + GILL.plan + '<span class="v2tag none">NO PROGRAM YET</span><h2 class="v2h2">Nothing planned</h2><span class="v2mut">Tell Apex your goals and which days you can train. It builds your weeks from your documents and saved reels.</span><button class="v2btn wide" data-act="wizopen">Create my program</button></section>';
  else if (RST && RST.kind !== 'recovery') h += restCard(ds, ses, RST) + restDayCard();
  else if (ses) h += proposalCard(ds) + v2calConflict(ds, ses) + sessionCard(ds, ses);
  if (hr >= 20 && !LS.getItem('wrap-' + ds)) h += '<button class="v2card v2flat v2cta" data-act="v2wrap">' + gtile('moon', 'vio') + '<span class="v2grow"><b>Wrap up your day</b><span class="v2mut">About 10 seconds: meals, how you feel, anything sore.</span></span><span class="v2li-e">›</span></button>';
  h += v2nextUp(ds, p) + missedCard() + easeCard() + wrCard() + raceDayLink() + prCelebrate() + coachCard() + raceCard();
  return h;
}

/* ---------- wrap-up (evening) ---------- */
const SORE_AREAS = [['neck', 'Neck'], ['shoulder', 'Shoulder'], ['back', 'Lower back'], ['hip', 'Hip'], ['knee', 'Knee'], ['ankle', 'Ankle'], ['wrist', 'Wrist'], ['elbow', 'Elbow']];
function wrapBody() {
  const ds = todayStr(), W = S.wrap, p = dayPlan(ds), V = mealView(ds, p).filter((x) => Number(x.m.kcal) > 0);
  const seg = (k, opts) => '<div class="v2seg3" role="group">' + opts.map(([v, l]) => '<button class="' + (W[k] === v ? 'on' : '') + '" aria-pressed="' + (W[k] === v) + '" data-act="v2w" data-k="' + k + '" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
  return '<p class="v2mut">About 10 seconds. Skip anything, nothing breaks.</p>' +
    '<p class="v2lbl">Food · counted as eaten</p><div class="v2card v2list flat">' + (V.length ? V.map((x) => '<div class="v2li"><span class="v2ck ' + (x.st === 'todo' ? 'q' : x.st === 'skipped' ? 'no' : 'ok') + '" aria-hidden="true">' + (x.st === 'todo' ? '?' : x.st === 'skipped' ? '✕' : '✓') + '</span><span class="v2li-t"><b>' + esc(x.m.name) + '</b><span>' + (x.st === 'todo' ? 'not yet' : x.st === 'auto' ? 'counted as planned' : esc(x.st)) + '</span></span>' +
      (x.st === 'todo' || x.st === 'auto' ? '<button class="v2btn2 sm" data-act="mate" data-slot="' + esc(x.m.slot) + '">Ate</button><button class="v2btn2 sm" data-act="mskip" data-slot="' + esc(x.m.slot) + '">Skip</button>' : '') + '</div>').join('') : '<p class="v2mut">No meals planned today.</p>') + '</div>' +
    '<p class="v2lbl">How was today?</p>' + seg('mood', [['1', 'Rough'], ['2', 'Meh'], ['3', 'OK'], ['4', 'Good'], ['5', 'Great']]) +
    '<p class="v2lbl">Stress</p>' + seg('stress', [['1', 'Calm'], ['3', 'Some'], ['5', 'A lot']]) +
    '<p class="v2lbl">After 16:00</p><div class="v2row2"><button class="v2chip' + (W.coffee ? ' on' : '') + '" aria-pressed="' + !!W.coffee + '" data-act="v2w" data-k="coffee" data-v="1">Coffee</button><button class="v2chip' + (W.alcohol ? ' on' : '') + '" aria-pressed="' + !!W.alcohol + '" data-act="v2w" data-k="alcohol" data-v="1">Alcohol</button><button class="v2chip' + (W.late ? ' on' : '') + '" aria-pressed="' + !!W.late + '" data-act="v2w" data-k="late" data-v="1">Ate after 21:00</button></div>' +
    '<p class="v2lbl">Anything sore? Tap once a bit, twice a lot</p><div class="v2sore">' + SORE_AREAS.map(([k, l]) => { const v = W.sore[k] || 0; return '<button class="lv' + v + '" aria-pressed="' + (v > 0) + '" aria-label="' + l + (v ? v === 2 ? ', really sore' : ', a bit sore' : ', not sore') + '" data-act="v2sore" data-k="' + k + '">' + l + (v ? '<i>' + (v === 2 ? '••' : '•') + '</i>' : '') + '</button>'; }).join('') + '</div>' +
    v2soreWarn() +
    '<button class="v2btn wide" data-act="v2wrapdone">Done</button>';
}
function v2soreWarn() {
  const t = todayStr(), W = S.wrap; let out = '';
  Object.keys(W.sore).filter((k) => W.sore[k]).forEach((k) => {
    const prev = [1, 2].every((i) => (D().soreness || []).some((x) => x.date === dateAdd(t, -i) && x.area === k));
    if (prev && !out) { const inj = { shoulder: 'Shoulder', back: 'Lower back', knee: 'Knee', hip: 'Hip', wrist: 'Wrist', elbow: 'Elbow', ankle: 'Ankle', neck: 'Neck' }[k]; out = '<div class="v2warn">' + esc(inj) + ': 3rd evening in a row. Turn on injury mode so sessions swap exercises that load it? <button class="v2btn2 sm" data-act="injadd" data-a="' + esc(inj) + '">Injury mode on</button></div>'; }
  });
  return out;
}

/* ---------- change today ---------- */
function changeBody() {
  const C = S.chg, ds = C.ds, s0 = sessionFor0(ds), free = nextFree(ds);
  const opts = [['light', 'Lighter', 'One set less, about 80% weights'], ['short', 'Shorter', 'Main lifts only, pick 20–60 min'], ['move', 'Move it', free ? niceDate(free) + ' is free and keeps hard days apart' : 'No free day left this week'], ['swap', 'Swap', 'No-gym or hotel version, same muscles'], ['rest', 'Rest today', 'Session goes, your week stays balanced']];
  const best = C.why === 'busy' ? 'short' : C.why === 'nogym' ? 'swap' : C.why === 'sore' ? 'light' : 'light';
  let prev = '';
  if (C.opt === 'light' && s0) { const L = lighten(s0.p, 'ease'); prev = L ? L.details.split('\n').filter((l) => /^\s*-/.test(l) && !/warm/i.test(l)).slice(0, 3).map((l) => esc(l.replace(/^\s*-\s*/, ''))).join(' · ') : ''; }
  return '<p class="v2lbl">What is going on?</p><div class="v2chips" role="group">' + [['tired', 'Tired'], ['busy', 'Short on time'], ['sore', 'Sore'], ['nogym', 'No gym'], ['ill', 'Feeling ill']].map(([k, l]) => '<button class="v2chip' + (C.why === k ? ' on' : '') + '" aria-pressed="' + (C.why === k) + '" data-act="v2chg" data-k="why" data-v="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<div class="v2opts">' + opts.map(([k, t, s]) => '<button class="v2opt' + (C.opt === k ? ' on' : '') + '" aria-pressed="' + (C.opt === k) + '" data-act="v2chg" data-k="opt" data-v="' + k + '"' + (k === 'move' && !free ? ' disabled' : '') + '><span class="v2li-t"><b>' + t + '</b><span>' + esc(s) + '</span></span>' + (k === best && C.why ? '<span class="v2best">Best fit</span>' : '') + '</button>').join('') + '</div>' +
    (prev ? '<div class="v2card flat"><span class="v2lbl">Preview</span><p class="v2small">' + prev + '</p></div>' : '') +
    '<button class="v2btn wide" data-act="v2chggo"' + (C.opt ? '' : ' disabled') + '>' + ({ light: 'Use lighter session', short: 'Choose the time', move: 'Move it', swap: 'See the swap', rest: 'Rest today' }[C.opt] || 'Pick an option') + '</button>';
}

/* ---------- live workout ---------- */
function liveList(ses) {
  const out = [];
  parseSession(ses.details).filter((b) => !b.skip).forEach((b, bi) => b.ex.forEach((e) => { if (/^reels?:/i.test(e)) return; const t = rxTarget(e, ''); out.push({ name: e.replace(/,?\s*\d+(?:-\d+)?\s*(?:s|sec|m|cal)?\s*(?:each(?:\s+\w+)?\s*)?[×x]\s*\d+.*$/i, '').replace(/\s*\+?\s*\d+(\.\d+)?\s*kg/i, '').replace(/[,\s]+$/, '').trim() || e, raw: e, sets: t.sets, reps: t.reps, kg: t.kg, rest: b.rest || 90, block: bi, head: b.head }); }));
  return out;
}
function liveHTML() {
  const L = S.live, X = L.list[L.i]; if (!X) return '';
  const sug = liftSuggest(X.name, { sets: X.sets, reps: X.reps, kg: X.kg }), last = sug.last ? sug.last.map((s) => (Number(s.kg) ? s.kg + ' kg × ' : '') + s.reps).join(', ') : '';
  const blocks = [...new Set(L.list.map((x) => x.block))].length, bi = [...new Set(L.list.slice(0, L.i + 1).map((x) => x.block))].length, nx = L.list[L.i + 1];
  const el = Math.floor((Date.now() - L.t0) / 60000);
  return '<div class="v2live-h"><button class="v2btn2 sm" data-act="v2liveend">End</button><span class="v2time">' + el + ' min</span><span class="v2mut">Block ' + bi + ' of ' + blocks + '</span></div>' +
    '<div class="v2ses-h v2stack">' + gtile(sesKind(X.name + ' ' + L.ses)[0], 'vio') + '<div class="v2grow"><p class="v2lbl">Exercise ' + (L.i + 1) + ' of ' + L.list.length + ' · ' + esc(X.head) + '</p><h1 class="v2h1">' + esc(X.name) + '</h1></div></div>' +
    '<div class="v2dots" role="img" aria-label="Set ' + L.set + ' of ' + X.sets + '">' + Array.from({ length: X.sets }, (_, i) => '<i class="' + (i + 1 < L.set ? 'p' : i + 1 === L.set ? 'n' : '') + '"></i>').join('') + '</div>' +
    '<p class="v2mut">Set ' + L.set + ' of ' + X.sets + (last ? ' · last time ' + esc(last) : '') + ' · ' + esc(sug.why) + '</p>' +
    '<div class="v2step2"><div><span class="v2lbl">kg</span><b>' + (L.kg === '' ? '–' : L.kg) + '</b><div><button data-act="v2lv" data-k="kg" data-v="-2.5" aria-label="Less weight">−</button><button data-act="v2lv" data-k="kg" data-v="2.5" aria-label="More weight">+</button></div></div>' +
    '<div><span class="v2lbl">reps</span><b>' + L.reps + '</b><div><button data-act="v2lv" data-k="reps" data-v="-1" aria-label="Fewer reps">−</button><button data-act="v2lv" data-k="reps" data-v="1" aria-label="More reps">+</button></div></div></div>' +
    '<button class="v2btn big" data-act="v2liveset">Set done</button>' +
    '<div class="v2row2"><button class="v2btn2" data-act="v2liveskip">Skip exercise</button><button class="v2btn2" data-act="exopen" data-n="' + esc(X.raw) + '" data-rx="" data-rest="' + X.rest + '">History and how-to</button></div>' +
    (nx ? '<div class="v2next"><span class="v2lbl">Up next</span><b>' + esc(nx.name) + ' · ' + nx.reps + ' × ' + nx.sets + '</b></div>' : '<div class="v2next"><span class="v2lbl">Last exercise</span></div>');
}
function liveOpen(ds, k) {
  let ses = sessionFor(ds || todayStr()); if (!ses) return;
  const PS = sesParts(ses), P = PS && (PS.find((x) => x.k === k) || PS.find((x) => !partRow(ds || todayStr(), x) && liveList(x.ses).length));
  if (P) { ses = Object.assign({}, P.ses, { name: P.log }); }
  const list = liveList(ses); if (!list.length) { toast('No exercises to log in this session. Use Did it.'); return; }
  S.live = { ds: ds || todayStr(), ses: ses.name, list, i: 0, set: 1, t0: Date.now(), done: 0 };
  liveLoad(); let box = $('#v2live'); if (!box) { box = document.createElement('div'); box.id = 'v2live'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Live workout'); document.body.appendChild(box); }
  liveDraw();
}
function liveLoad() { const L = S.live, X = L.list[L.i]; if (!X) return; const sug = liftSuggest(X.name, { sets: X.sets, reps: X.reps, kg: X.kg }); L.kg = sug.kg === '' || sug.kg == null ? '' : Number(sug.kg); L.reps = X.reps; }
function liveDraw() { const b = $('#v2live'); if (b) b.innerHTML = liveHTML(); }
function liveFinish(partial) {
  const L = S.live; if (!L) return;
  restStop();
  if (L.done) send({ action: 'log', table: 'WorkoutLog', row: { date: L.ds, session: L.ses, status: 'done', note: (partial ? 'partial: ' + L.done + ' sets' : 'live') + ' · ' + Math.max(1, Math.round((Date.now() - L.t0) / 60000)) + ' min · start ' + new Date(L.t0).toTimeString().slice(0, 5), time: nowTime(), rpe: '', energy: '' } });
  const b = $('#v2live'); if (b) b.remove();
  S.live = null; render(); toast(L.done ? (partial ? 'Saved as partly done: ' + L.done + ' sets.' : 'Session done. ' + L.done + ' sets logged.') : 'Nothing logged.');
}

/* ---------- actions ---------- */
COACH_KEEP.push('v2w', 'v2sore', 'v2chg', 'v2lv', 'mate', 'mskip');
Object.assign(COACH_ACTS, {
  v2go: (el) => { if (el.dataset.tab) S.tab = el.dataset.tab; S.sub = el.dataset.sub || null; if (el.dataset.d) S.subDay = el.dataset.d; if (!S.sub) S.subDay = null; render(); window.scrollTo(0, 0); },
  v2rpe: (el) => { const ds = todayStr(), ses = sessionFor(ds), wl = ses && logs('WorkoutLog', ds).find((r) => r.session === ses.name); if (!wl) return; send({ action: 'log', table: 'WorkoutLog', row: Object.assign({}, wl, { rpe: el.dataset.v }) }); },
  v2wrap: () => { S.wrap = { mood: '', stress: '', coffee: false, alcohol: false, late: false, sore: {} }; infoSheet('Wrap up your day', wrapBody(), 'wrap'); },
  v2w: (el) => { const W = S.wrap, k = el.dataset.k; if (['coffee', 'alcohol', 'late'].includes(k)) W[k] = !W[k]; else W[k] = W[k] === el.dataset.v ? '' : el.dataset.v; keepScroll('wrap', wrapBody()); },
  v2sore: (el) => { const W = S.wrap, k = el.dataset.k; W.sore[k] = ((W.sore[k] || 0) + 1) % 3; keepScroll('wrap', wrapBody()); },
  v2wrapdone: () => {
    const ds = todayStr(), W = S.wrap, p = dayPlan(ds);
    if (W.mood || W.stress) send({ action: 'log', table: 'Checkin', row: Object.assign({ date: ds }, W.mood ? { mood: W.mood } : {}, W.stress ? { stress: W.stress } : {}) });
    if (W.coffee) send({ action: 'log', table: 'Habits', row: { date: ds, kind: 'caffeine', time: '16:30', note: 'wrap-up' } });
    if (W.alcohol) send({ action: 'log', table: 'Habits', row: { date: ds, kind: 'alcohol', time: '20:00', note: 'wrap-up' } });
    if (W.late) send({ action: 'log', table: 'Habits', row: { date: ds, kind: 'late_meal', time: '21:30', note: 'wrap-up' } });
    Object.keys(W.sore).filter((k) => W.sore[k]).forEach((k) => send({ action: 'log', table: 'Soreness', row: { date: ds, area: k, level: String(W.sore[k]) } }));
    if (D().cfg.auto_meals !== 'off') mealView(ds, p).filter((x) => x.st === 'auto').forEach((x) => send({ action: 'log', table: 'MealLog', row: { date: ds, slot: x.m.slot, status: 'ate', time: x.m.time, note: 'auto', extra_name: '', kcal: '', protein: '' } }));
    LS.setItem('wrap-' + ds, '1'); closeSheets(); render(); toast('Day saved. Sleep well.');
  },
  v2change: (el) => { S.chg = { ds: (el && el.dataset.d) || todayStr(), why: '', opt: '' }; infoSheet('Change today', changeBody(), 'chg'); },
  v2chg: (el) => { S.chg[el.dataset.k] = el.dataset.v; if (el.dataset.k === 'why' && !S.chg.opt) S.chg.opt = { busy: 'short', nogym: 'swap', ill: 'rest' }[el.dataset.v] || 'light'; keepScroll('chg', changeBody()); },
  v2chggo: () => {
    const C = S.chg, ds = C.ds, s0 = sessionFor0(ds); if (!s0 || !C.opt) return;
    const why = C.why || 'tired';
    if (C.opt === 'light') { const cur = D().overrides.find((o) => o.date === ds); if (cur && /recommended: easier/.test(cur.reason || '')) { closeSheets(); toast('This day is already the easier version.'); return; } const L = lighten(s0.p, 'ease'); if (!L) { toast('Nothing to make lighter'); return; } try { LS.setItem('ease-prev-' + ds, JSON.stringify(cur || null)); } catch (e) { /* storage full */ } S.eased = { ds, t: Date.now() }; send({ action: 'log', table: 'Overrides', row: Object.assign({ date: ds, reason: 'recommended: easier' }, L) }); decide('change today', s0.p.session, 'lighter', why); closeSheets(); toast('Lighter session set.'); setTimeout(() => { const c = document.querySelector('.v2ses.flash'); if (c) c.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, 60); return; }
    if (C.opt === 'short') { closeSheets(); COACH_ACTS.adjopen({ dataset: { m: 'short', d: ds } }); return; }
    if (C.opt === 'swap') { closeSheets(); COACH_ACTS.adjopen({ dataset: { m: 'nogym', d: ds } }); return; }
    if (C.opt === 'move' || C.opt === 'rest') { S.off = { why: { busy: 'busy', ill: 'ill', sore: 'sore', nogym: 'busy' }[why] || 'tired', move: C.opt === 'move' ? 'move' : 'skip' }; COACH_ACTS.offgo(); }
  },
  v2live: (el) => liveOpen(el && el.dataset.d, el && el.dataset.k),
  v2part: (el) => {
    const ds = el.dataset.d || todayStr(), ses = sessionFor(ds), PS = sesParts(ses), P = PS && PS.find((x) => x.k === el.dataset.k); if (!P) return;
    const other = PS.find((x) => x !== P), s = el.dataset.s;
    if (s === 'undo') { LS.setItem('aw-' + ds + '-' + P.k, '1'); v2quiet({ action: 'del', table: 'WorkoutLog', row: { date: ds, session: P.log } }); }
    else v2quiet({ action: 'log', table: 'WorkoutLog', row: { date: ds, session: P.log, status: s === 'done' ? 'done' : 'skipped', note: 'part', time: nowTime(), rpe: '', energy: '' } });
    partsSync(ds, ses); render();
    const oR = partRow(ds, other);
    toast(s === 'undo' ? P.k + ' is open again.' : P.k + (s === 'done' ? ' done.' : ' skipped.') + (oR ? ' Day saved.' : ' ' + other.k + ' is still on: ' + other.label + '.'));
  },
  v2wundo: () => {
    const ds = todayStr(), ses = sessionFor(ds); if (!ses) return;
    (sesParts(ses) || []).forEach((P) => { if (partRow(ds, P)) { LS.setItem('aw-' + ds + '-' + P.k, '1'); v2quiet({ action: 'del', table: 'WorkoutLog', row: { date: ds, session: P.log } }); } });
    send({ action: 'del', table: 'WorkoutLog', row: { date: ds, session: ses.name } });
  },
  v2setupx: () => { LS.setItem('setup-x', '1'); render(); },
  v2lv: (el) => { const L = S.live, k = el.dataset.k, v = Number(el.dataset.v); if (k === 'kg') L.kg = Math.max(0, Math.round(((Number(L.kg) || 0) + v) * 10) / 10); else L.reps = Math.max(0, L.reps + v); liveDraw(); },
  v2liveset: () => {
    const L = S.live, X = L.list[L.i]; if (!X) return;
    send({ action: 'log', table: 'Sets', row: { date: L.ds, exercise: X.name, set: String(L.set), reps: String(L.reps), kg: String(L.kg === '' ? 0 : L.kg), note: '' } });
    L.done++;
    if (L.set < X.sets) { L.set++; restStart(X.rest); }
    else if (L.i < L.list.length - 1) { L.i++; L.set = 1; liveLoad(); restStart(X.rest); }
    else { liveFinish(false); return; }
    liveDraw();
  },
  v2liveskip: () => { const L = S.live; if (L.i < L.list.length - 1) { L.i++; L.set = 1; liveLoad(); liveDraw(); } else liveFinish(L.done > 0); },
  v2liveend: () => { const L = S.live; if (L && L.done && !confirm('End now? ' + L.done + ' sets are saved and the session counts as partly done.')) return; liveFinish(true); }
});

/* ---------- data: soreness table and calendar ---------- */
const v2normalize0 = normalize;
normalize = function (d) { d = v2normalize0(d); d.soreness = d.soreness || []; const c = d.calendar; d.calOk = !!(c && c.ok); d.calendar = c && Array.isArray(c.events) ? c.events : Array.isArray(c) ? c : []; return d; };
UKEYS.Soreness = ['date', 'area'];
const v2ulist0 = ulist;
ulist = function (t) { return t === 'Soreness' ? S.data.soreness : v2ulist0(t); };

/* ---------- wiring: tabs, sub-pages, render ---------- */
if (V2ON) {
  document.documentElement.classList.add('v2');
  TABS.length = 0;
  TABS.push(['today', V2I.today, 'Today'], ['train', V2I.plan, 'Plan'], ['meals', V2I.fuel, 'Fuel'], ['you', V2I.you, 'You']);
  document.addEventListener('click', (ev) => { const el = ev.target.closest && ev.target.closest('[data-act="tab"]'); if (el) { S.sub = null; S.subDay = null; } }, true);
  const render0 = render;
  render = function () {
    if (S.tab === 'more' || S.tab === 'insights') { S.sub = S.sub || (S.tab === 'more' ? 'more' : 'insights'); S.tab = 'you'; }
    if (S.data && !S._v2boot) { S._v2boot = true; if (!D().cfg.v2_since) v2quiet({ action: 'config', key: 'v2_since', value: todayStr() }); }
    if (S.data && S.url) { try { autoWorkout(todayStr()); persistMeals(); } catch (e) { /* never block the screen */ } }
    return render0();
  };
  VIEWS.today = () => (S.sub === 'session' ? v2session(S.subDay || todayStr()) : viewToday2());
}


/* ===================== v2b.js ===================== */
/* Apex 2.0, part B: Plan, session page, Fuel, You and its pages, season, best time, shortcuts,
   consistency, heat, weekly PDF. Old screens stay reachable as pages, so no feature is lost. */
const v2page = (back, backLabel, body) => '<div class="v2pagebar">' + v2back(back, backLabel) + '</div>' + body;

/* ---------- Plan ---------- */
function v2dayInfo(ds) {
  const t = todayStr(), st = D().cfg.program_start, ov = (D().overrides || []).find((o) => o.date === ds), why = String((ov && ov.reason) || '');
  const ses = sessionFor(ds), wl = logs('WorkoutLog', ds).concat((H().workouts || []).filter((w) => w.date === ds)).filter((w) => !/\s·\s(?:AM|PM)$/.test(w.session || ''));
  const done = wl.find((w) => w.status === 'done'), skip = wl.find((w) => w.status === 'skipped'), partial = done && /^partial/.test(done.note || '');
  if (/^break/i.test(why)) return { k: 'break', ses, done, why };
  if (st && ds < st && !ov) return { k: 'pre', ses: null, done };
  if (!ses) return { k: 'none' };
  const RST = restInfo(ds, ses);
  if (RST && RST.kind !== 'recovery' && !done) return { k: 'rest', ses, label: RST.label };
  const PS = sesParts(ses), pr = PS ? PS.map((P) => partRow(ds, P)).filter(Boolean) : [];
  const pp = PS && (pr.length || done || skip) ? partsLine(ds, ses) : '';
  if (!done && !skip && pr.length) return { k: pr.some((r) => r.status === 'done') ? 'partial' : ds < t ? 'missed' : 'plan', ses, done: pr.find((r) => r.status === 'done'), pp };
  return { k: done ? (partial ? 'partial' : 'done') : skip ? 'skip' : ds < t ? 'missed' : 'plan', ses, done, pp };
}
function v2weekRows(start) {
  const t = todayStr(), days = [0, 1, 2, 3, 4, 5, 6].map((i) => { const ds = dateAdd(start, i); return Object.assign({ ds }, v2dayInfo(ds)); });
  const groups = []; days.forEach((d) => { const g = groups[groups.length - 1]; if (g && (d.k === 'break' || d.k === 'pre') && g.k === d.k) g.days.push(d); else groups.push({ k: d.k, days: [d] }); });
  return groups.map((g) => {
    const d = g.days[0], last = g.days[g.days.length - 1], isT = g.days.some((x) => x.ds === t), open = isT ? t : d.ds;
    const dn = '<span class="v2dn">' + (g.days.length > 1 ? dow(d.ds).slice(0, 3) + '<b>' + Number(d.ds.slice(8)) + '–' + Number(last.ds.slice(8)) + '</b>' : (d.ds === t ? 'Today' : dow(d.ds).slice(0, 3)) + '<b>' + Number(d.ds.slice(8)) + '</b>') + '</span>';
    let title, sub, end = '', cls = '';
    if (g.k === 'break') {
      const isB = (x) => (D().overrides || []).some((o) => o.date === x && /^break/i.test(o.reason || ''));
      let a = d.ds, z = last.ds; while (isB(dateAdd(a, -1))) a = dateAdd(a, -1); while (isB(dateAdd(z, 1))) z = dateAdd(z, 1);
      const n = daysBetween(a, z) + 1;
      title = 'Break' + (String(d.why).split(':')[1] ? ' · ' + String(d.why).split(':')[1].trim() : '');
      sub = isT ? 'Day ' + (daysBetween(a, t) + 1) + ' of ' + n + ' · ends ' + shortDate(z) : shortDate(a) + ' – ' + shortDate(z) + ' · ' + n + ' days';
      end = '<span class="v2tag rest">BREAK</span>'; cls = ' brk';
    } else if (g.k === 'pre') { title = 'Before your plan'; sub = 'Plan starts ' + shortDate(D().cfg.program_start); cls = ' pre'; }
    else if (g.k === 'none') { title = 'Rest'; sub = 'Nothing planned'; cls = ' pre'; }
    else {
      title = d.ses.name; const load = d.ses.mode === 'swap' ? 'Recovery' : d.ses.p.load;
      sub = { done: 'Done' + (d.done && d.done.rpe ? ' · RPE ' + d.done.rpe : ''), partial: 'Partly done', skip: 'Skipped', missed: 'Not logged', rest: d.label || 'Rest', plan: d.ses.p.time || '' }[g.k];
      if (d.pp) sub = d.pp;
      end = g.k === 'done' ? '<span class="v2ok" aria-label="done">✓</span>' : g.k === 'partial' ? '<span class="v2ok" aria-label="partly done">½</span>' : g.k === 'skip' || g.k === 'missed' ? '<span class="v2no" aria-label="' + (g.k === 'skip' ? 'skipped' : 'not logged') + '">✕</span>' : v2tag(load);
    }
    const K = g.k === 'break' ? ['moon', 'vio'] : g.k === 'pre' || g.k === 'none' ? null : sesKind(d.ses.name, d.ses.p.load);
    return '<button class="v2day' + (isT ? ' today' : '') + cls + '" data-act="v2go" data-sub="session" data-d="' + open + '">' + dn + (K ? gtile(K[0], g.k === 'done' || g.k === 'partial' ? 'ok' : K[1]) : '<span class="gtile t-mut" aria-hidden="true"></span>') + '<span class="v2li-t"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></span><span class="v2li-e">' + end + '</span></button>';
  }).join('');
}
function viewPlan2() {
  if (S.sub === 'session') return v2session(S.subDay || todayStr());
  if (S.sub === 'season') return v2page('', 'Plan', v2season());
  const t = todayStr(), off = S.v2wk || 0, start = dateAdd(weekStart(t), 7 * off), end = dateAdd(start, 6), c = D().cfg, N = planWeeks(), ev = nextRace();
  const st = c.program_start, pre = st && t < st, wk = st && !pre ? Math.min(N, Math.floor(daysBetween(st, t) / 7) + 1) : 0, frac = st && !pre ? Math.min(1, (daysBetween(st, t) + 1) / (N * 7)) : 0;
  const info = [0, 1, 2, 3, 4, 5, 6].map((i) => v2dayInfo(dateAdd(start, i)));
  const planned = info.filter((x) => ['done', 'partial', 'skip', 'missed', 'plan'].includes(x.k)).length, done = info.filter((x) => x.k === 'done' || x.k === 'partial').length;
  const title = !D().plan.length ? 'No program yet' : pre ? 'Starts in ' + daysBetween(t, st) + ' day' + (daysBetween(t, st) === 1 ? '' : 's') : st && daysBetween(st, t) >= N * 7 ? 'Block done' : 'Week ' + wk + ' of ' + N;
  let h = v2head(c.program_name || (D().plan.length ? 'Your plan' : 'Plan'), title, false);
  if (D().plan.length) {
    h += '<section class="v2card v2block">' + groute(N, frac, ev && daysBetween(t, ev.date) <= N * 7 + (pre ? daysBetween(t, st) : 0) + 7 ? ev.name : '') +
      '<div class="v2kpis"><div><span class="v2lbl">' + (pre ? 'Plan starts' : 'This block') + '</span><b>' + esc(pre ? shortDate(st) : 'Week ' + wk + ' of ' + N) + '</b></div>' +
      (ev ? '<div><span class="v2lbl">' + esc(ev.name.replace(/\s*marathon$/i, '').replace(/half$/i, 'Half')) + '</span><b>' + daysBetween(t, ev.date) + ' days</b></div>' : '<div><span class="v2lbl">Next race</span><b>None set</b></div>') + '</div></section>';
    const rng = Number(start.slice(8)) + (start.slice(5, 7) === end.slice(5, 7) ? '' : ' ' + MON[Number(start.slice(5, 7)) - 1]) + '–' + Number(end.slice(8)) + ' ' + MON[Number(end.slice(5, 7)) - 1];
    h += '<section class="v2card v2list"><div class="v2wknav"><button class="v2icb" data-act="v2wk" data-v="-1" aria-label="Week before">‹</button><div class="v2wkt"><b>' + (off === 0 ? 'This week' : off === 1 ? 'Next week' : off === -1 ? 'Last week' : rng) + '</b><span>' + esc(rng) + (planned ? ' · ' + done + ' of ' + planned + ' done' : '') + '</span></div><button class="v2icb" data-act="v2wk" data-v="1" aria-label="Week after">›</button></div>' +
      v2weekRows(start) + (off ? '<button class="v2link" data-act="v2wk" data-v="0">Back to this week</button>' : '') + '</section>';
  }
  h += '<div class="v2chips scroll"><button class="v2chip" data-act="breakopen">Take a break</button><button class="v2chip" data-act="sickopen">I\'m ill</button><button class="v2chip" data-act="tropen">Travelling</button><button class="v2chip" data-act="v2go" data-sub="season">Season</button><button class="v2chip" data-act="libopen">Search exercises</button></div>';
  h += tuneCard() + deloadCard() + programCard();
  return h;
}
function v2session(ds) {
  const ses = sessionFor(ds), t = todayStr(), back = S.tab === 'train' ? 'Plan' : 'Today';
  if (!ses) return v2page('', back, '<h1 class="v2h1">' + esc(niceDate(ds)) + '</h1><div class="v2card"><p class="v2mut">Nothing planned this day.</p></div>');
  const load = ses.mode === 'swap' ? 'Recovery' : ses.p.load, blocks = parseSession(ses.details).filter((b) => !b.skip); let mins = 0; try { mins = estMin(blocks); } catch (e) { mins = 0; }
  const wl = logs('WorkoutLog', ds).find((r) => r.session === ses.name);
  const K = sesKind(ses.name, load);
  let h = '<div class="v2ses-h v2stack">' + gtile(K[0], K[1]) + '<div class="v2grow"><p class="v2lbl">' + esc(niceDate(ds)) + ' · ' + esc(ses.p.time || '') + '</p><h1 class="v2h1">' + esc(ses.name) + '</h1></div></div><div class="v2chips">' + v2tag(load) + (mins ? '<span class="v2pill">About ' + mins + ' min</span>' : '') + '<span class="v2pill">' + blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + '</span></div>' +
    (ses.injured ? '<p class="injline">' + ICON(TI.heart) + '<span>' + ses.injured + ' exercise' + (ses.injured > 1 ? 's' : '') + ' swapped for your ' + esc(ses.injAreas.join(' and ').toLowerCase()) + '</span></p>' : '') +
    (ses.p.moved ? '<p class="moved">' + ICON(CI.move) + '<span>Moved here ' + esc(String(ses.p.reason || '').replace(/(\d{4}-\d{2}-\d{2})/, (m) => niceDate(m))) + '</span><button class="txt fit" data-act="mvundo" data-d="' + esc(ds) + '" data-r="' + esc(ses.p.reason) + '">Undo</button></p>' : '') +
    '<div class="v2chips"><button class="v2chip" data-act="warmup" data-s="' + esc(ses.name) + '">Warm-up</button><button class="v2chip" data-act="itopen" data-m="emom">Interval timer</button>' + (/barbell|pull|kb|flame/.test(K[0]) || (D().sets || []).some((x) => x.date === ds) ? '<button class="v2chip" data-act="whsend" data-d="' + ds + '">' + gi('share') + 'Send to WHOOP</button>' : '') + (ds >= t ? '<button class="v2chip" data-act="v2change" data-d="' + ds + '">Change</button>' : '') + '</div>' +
    (sesParts(ses) && !wl && ds <= t ? '<p class="v2lbl">Do or skip each part</p>' + partsHTML(ds, ses) : '') +
    '<div class="card">' + blocksHTML(ses.details, ds) + '</div>';
  if (ds === t && !wl && load !== 'Rest' && !sesParts(ses)) h += '<div class="v2sticky"><button class="v2btn" data-act="v2live" style="flex:1">Start session</button><button class="v2btn2" data-act="wdone">Did it already</button></div>';
  return v2page('', back, h);
}

/* ---------- Fuel ---------- */
function viewFuel2() {
  if (S.sub === 'foodmore') return v2page('', 'Fuel', viewMeals());
  const ds = todayStr(), p = dayPlan(ds), ses = sessionFor(ds);
  let h = v2head(shortDate(ds) + (p ? ' · ' + dayTypeName(p.daytype) : ''), 'Fuel', false);
  if (!p || !mealsFor(p.daytype).length) return h + '<div class="v2card">' + GILL.plate + '<p class="v2mut">' + (!(D().meals || []).length ? 'No meal plan yet. Add your meals to the Meals tab of your Google Sheet, then tap Reload from sheet in Settings and more.' : 'No meals planned for today. You can still log food.') + '</p><button class="v2btn2 wide" data-act="mextra">Add food</button></div>';
  const F = v2fuel(ds, p), tg = targetFor(p.daytype), kT = Number(tg.kcal) || 0, pT = proteinTarget(tg), nowI = F.V.findIndex((x) => x.st === 'todo'), est = F.V.some((x) => x.m.protEst), planK = F.V.reduce((a, x) => a + (Number(x.m.kcal) || 0), 0);
  h += '<section class="v2card v2macro"><div class="v2mac">' + gdonut(F.kcal / (kT || 1), 'var(--v2vio)', 64, 'Calories ' + F.kcal + ' of ' + kT) + '<div><span class="v2lbl">Calories</span><b class="v2num">' + F.kcal.toLocaleString('en') + '</b><span class="v2mut">of ' + kT.toLocaleString('en') + '</span></div></div>' +
    '<div class="v2mac">' + gdonut(F.prot / (pT || 1), 'var(--v2ok)', 64, 'Protein ' + F.prot + ' of ' + pT + ' grams') + '<div><span class="v2lbl">Protein</span><b class="v2num">' + (est ? '≈' : '') + F.prot + ' g</b><span class="v2mut">of ' + pT + ' g</span></div></div>' +
    '<p class="v2mut v2span">Carbs ' + esc(tg.carbs || '–') + ' g · fat ' + esc(tg.fat || '–') + ' g today' + (est ? ' · protein estimated from what each meal contains' : '') + '</p>' + (kT && planK < kT - 150 ? '<p class="v2mut v2span">Your planned meals add up to ' + planK.toLocaleString('en') + ' kcal, ' + (kT - planK).toLocaleString('en') + ' under today\'s target.</p>' : '') + '</section>';
  h += '<section class="v2card v2list"><div class="v2hd"><span class="v2lbl">Today</span><span class="v2mut">' + (D().cfg.auto_meals === 'off' ? 'Tap a meal to log it' : 'Counted as planned unless you change it') + '</span></div>' +
    F.V.map((x, i) => {
      const st = x.st, mark = st === 'ate' || st === 'auto' ? '✓' : st === 'skipped' ? '✕' : st === 'swap' ? '↺' : '';
      return '<button class="v2meal' + (i === nowI ? ' now' : '') + (st !== 'todo' ? ' past' : '') + '" data-act="msheet" data-slot="' + esc(x.m.slot) + '">' + gtile(mealKind(x.m), st === 'todo' ? (i === nowI ? 'vio' : 'mut') : st === 'skipped' ? 'bad' : 'ok') + '<span class="v2li-t"><span class="v2time2">' + esc(x.m.time) + '</span><b>' + esc(x.m.name) + (i === nowI ? ' · now' : '') + '</b><span>' + esc(x.m.items) + (Number(x.m.kcal) ? ' · ' + esc(x.m.kcal) + ' kcal' : '') + (st === 'auto' ? ' · counted' : '') + '</span>' +
        (x.m.supps ? '<span class="v2supps">' + String(x.m.supps).split(/\s*[,+]\s*/).filter(Boolean).map((s) => '<i>' + esc(s.replace(/\s+\d.*$/, '')) + '</i>').join('') + '</span>' : '') + '</span><span class="v2li-e">' + mark + '</span></button>';
    }).join('') + '<div class="v2row2"><button class="v2btn2 sm" data-act="mextra">+ Snack or extra</button><button class="v2btn2 sm" data-act="eatout">Eating out?</button></div></section>';
  const W = waterInfo(ds);
  h += '<section class="v2card v2flat">' + gbottle(W.ml / (W.tgt || 1), 'Water ' + wFmt(W.ml) + ' of ' + wFmt(W.tgt)) + '<div class="v2grow"><span class="v2lbl">Water</span><b>' + esc(wFmt(W.ml)) + ' of ' + esc(wFmt(W.tgt)) + '</b>' + (W.heat ? '<span class="v2mut">Raised for the heat</span>' : '') + '</div><button class="v2btn2 sm" data-act="wminus" aria-label="Remove a bottle">−</button><button class="v2btn2 sm" data-act="wplus">+ ' + esc(wFmt(W.bot, undefined, 2)) + '</button></section>';
  h += travelMealsCard() + fastCard() + proteinFixCard() + stockCard();
  h += '<button class="v2card v2flat v2cta" data-act="v2go" data-sub="foodmore">' + gtile('cart', 'ok') + '<span class="v2grow"><b>Shopping list and food tools</b><span class="v2mut">Weekly list, swaps, supplements, eating out</span></span><span class="v2li-e">›</span></button>';
  return h;
}

/* ---------- You ---------- */
function v2consistency(days) {
  const t = todayStr(), out = []; let ok = 0, tot = 0;
  for (let i = days - 1; i >= 0; i--) {
    const ds = dateAdd(t, -i), s = sessionFor0(ds), wl = logs('WorkoutLog', ds).concat((H().workouts || []).filter((w) => w.date === ds)), ov = (D().overrides || []).find((o) => o.date === ds);
    let k;
    if (!s) k = 'off';
    else if (ov && /^(break|rest day|sick)/.test(ov.reason || '')) k = 'br';
    else if (s.p.load === 'Rest') k = 'off';
    else if (wl.some((w) => w.status === 'done')) k = 'd';
    else if (ds === t) k = 'n';
    else k = 'm';
    if (k !== 'n') { tot++; if (k !== 'm') ok++; }
    out.push([ds, k]);
  }
  return { pct: tot ? Math.round(100 * ok / tot) : 0, days: out };
}
function v2readinessBars() {
  const t = todayStr(), B = [];
  for (let i = 13; i >= 0; i--) { const ds = dateAdd(t, -i), R = readiness(ds); B.push(R ? [R.score, R.color] : [0, 'var(--v2line)']); }
  const vals = B.filter((b) => b[0]).map((b) => b[0]), avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  return '<section class="v2card"><div class="v2hd"><span class="v2lbl">Readiness · 14 days</span><span class="v2mut">' + (avg == null ? 'no data yet' : 'avg ' + avg) + '</span></div><div class="v2bars" role="img" aria-label="Readiness for the last 14 days' + (avg == null ? '' : ', average ' + avg) + '">' + B.map((b) => '<i style="height:' + Math.max(4, b[0]) + '%;background:' + b[1] + '"></i>').join('') + '</div></section>';
}
function viewYou2() {
  const sub = S.sub;
  if (sub === 'insights') return v2page('', 'You', viewInsights());
  if (sub === 'training') { S.insTab = 'training'; return v2page('', 'You', viewInsights()); }
  if (sub === 'oldmore') return v2page('more', 'Settings and more', viewMore());
  if (sub === 'more') return v2page('', 'You', v2more());
  if (sub === 'extras') return v2page('', 'You', v2extras());
  if (sub === 'skills') return v2page('extras', 'Extras', '<h1 class="v2h1">Skills</h1>' + skillsCard() + shoesCard());
  if (sub === 'profile') return v2page('', 'You', v2profile());
  if (sub === 'review') return v2page('', 'You', v2review());
  if (sub === 'body') return v2page('', 'You', v2body());
  if (sub === 'health') return v2page('', 'You', v2health());
  if (sub === 'season') return v2page('', 'You', v2season());
  if (sub === 'shortcuts') return v2page('more', 'Settings and more', v2shortcuts());
  if (sub === 'consistency') return v2page('', 'You', v2consPage());
  const ev = nextRace(), C = v2consistency(28), pr = prRows().slice(0, 3);
  let h = v2head('Progress and settings', 'You', false);
  if (ev) h += '<section class="v2card v2prop v2race-card">' + gtile('flag', 'warm') + '<span class="v2lbl">' + esc(ev.name) + ' · ' + daysBetween(todayStr(), ev.date) + ' days</span>' + (ev.goal ? '<b class="v2num">goal ' + esc(ev.goal) + '</b>' : '') + '<button class="v2link" data-act="gcopen">Is my goal realistic? ›</button></section>';
  h += v2readinessBars();
  if (pr.length) h += '<section class="v2card v2grid3">' + pr.map((r) => '<button class="v2stat" data-act="prsheet" data-n="' + esc(r.name) + '">' + gi('trophy', 'gtr') + '<span class="v2lbl">' + esc(r.name) + '</span><b>' + esc(prShow(r.best ? r.best.value : r.value, r.unit || (r.best && r.best.unit))) + '</b></button>').join('') + '</section>';
  h += '<button class="v2card v2flat v2cta" data-act="v2go" data-sub="consistency">' + gdonut(C.pct / 100, 'var(--v2vio)', 56, 'Consistency ' + C.pct + ' percent') + '<span class="v2grow"><span class="v2lbl">Consistency · 4 weeks</span><b class="v2num">' + C.pct + '%</b><span class="v2mut">Planned rest and breaks count as done</span></span><span class="v2li-e">›</span></button>';
  const L = [['How Apex sees you', 'Patterns from your training, food, sleep and choices', 'profile', 'face', 'vio'], ['Weekly review', 'Your week, next week\'s proposals, share as PDF', 'review', 'cal', 'blue'], ['Training and runs', 'Load, fatigue check, runs, records', 'training', 'run', 'blue'], ['Health watch', 'Early illness warning and how to stay healthy', 'health', 'heart', 'bad'], ['Body', 'Weight, waist, weight plan, photos', 'body', 'scale', 'ok'], ['All insights', 'Recovery charts, what works for you', 'insights', 'chart', 'vio'], ['Season planner', 'Blocks between your races', 'season', 'route', 'warm'], ['Extras', 'Timer, PR planner, skills and more tools', 'extras', 'tools', 'vio'], ['Settings and more', 'Connections, races, supplements, coach, preferences', 'more', 'gear', 'mut']];
  h += '<section class="v2card v2list">' + L.map(([t, s, sub, ic, tone]) => v2row('v2go', t, s, '', ' data-sub="' + sub + '"', ic, tone)).join('') + '</section>';
  return h;
}
function v2consPage() {
  const C = v2consistency(28), lab = { d: '✓', br: 'br', off: 'off', m: '✕', n: '·' };
  return '<h1 class="v2h1">Consistency</h1><section class="v2card v2flat"><div style="color:var(--v2tx)">' + v2ring(C.pct, 'var(--v2vio)') + '</div><div class="v2grow"><span class="v2lbl">Last 4 weeks</span><b>You follow the plan, rest included</b><span class="v2mut">Planned rest, breaks and sick days never lower the score.</span></div></section>' +
    '<section class="v2card"><div class="v2cal" role="img" aria-label="Last 28 days">' + C.days.map(([ds, k]) => '<span class="c-' + k + '" title="' + esc(niceDate(ds)) + '">' + lab[k] + '</span>').join('') + '</div><p class="v2mut">✓ done · off / br planned rest · ✕ missed</p></section>' + consistencyCard();
}
function v2profile() {
  let P = []; try { P = patterns(); } catch (e) { P = []; }
  const said = (txt) => (D().decisions || []).find((x) => x.kind === 'pattern' && x.what === txt.replace(/<[^>]+>/g, '').slice(0, 120));
  return '<h1 class="v2h1">How Apex sees you</h1><p class="v2mut">Learned from your training, food, sleep and choices. The coach and every new program use this. Wrong? Tell me.</p>' +
    (P.length ? P.slice(0, 8).map((p) => { const conf = Math.max(1, Math.min(4, Math.round((p.w || 0.4) * 4))), plain = p.t.replace(/<[^>]+>/g, ''), s = said(p.t); return '<section class="v2card"><div class="v2hd"><span class="v2lbl">Pattern</span><span class="v2conf" role="img" aria-label="How sure: ' + conf + ' of 4">' + [1, 2, 3, 4].map((i) => '<i class="' + (i <= conf ? 'f' : '') + '"></i>').join('') + '</span></div><p class="v2small">' + p.t + '</p>' + (p.fix ? '<p class="v2mut">' + esc(p.fix) + '</p>' : '') +
      (s ? '<p class="v2mut">You said: ' + (s.choice === 'accepted' ? 'that\'s right' : 'not really') + '</p>' : '<div class="v2row2"><button class="v2btn2 sm" data-act="v2pat" data-t="' + esc(plain.slice(0, 120)) + '" data-v="accepted">That\'s right</button><button class="v2btn2 sm" data-act="v2pat" data-t="' + esc(plain.slice(0, 120)) + '" data-v="rejected">Not really</button></div>') + '</section>'; }).join('')
      : '<div class="v2card"><p class="v2mut">Still learning. Patterns appear after about 2 weeks of logs and WHOOP data.</p></div>') +
    whatWorksCard() + choicesCard();
}
function v2review() {
  return '<h1 class="v2h1">Weekly review</h1>' + (wrDue() ? '<button class="v2btn wide" data-act="wropen">Answer 3 questions, then I tune next week</button>' : '') + (weeklyCard(false) || '<div class="v2card"><p class="v2mut">Your review is written every Thursday from 18:00, after you answer 3 quick questions.</p></div>') +
    realityCard() + '<button class="v2btn2 wide" data-act="v2pdf">Share this week as a PDF</button><p class="v2mut">For a coach or physio. Sent from your phone\'s share sheet, never by Apex.</p>';
}
function v2body() {
  const last = D().logs.Body.slice(-1)[0];
  return '<h1 class="v2h1">Body</h1><section class="v2card v2flat"><div class="v2grow"><span class="v2lbl">Latest</span><b class="v2num">' + (last ? esc(last.weight) + ' kg' : 'Not logged yet') + '</b><span class="v2mut">' + (last ? esc(niceDate(last.date)) + (last.waist ? ' · waist ' + esc(last.waist) + ' cm' : '') : 'Saturday mornings, before breakfast') + '</span></div><button class="v2btn" data-act="body">Log</button></section>' +
    cutCard() + '<button class="v2btn2 wide" data-act="cutopen">Weight plan</button>' + photosSection();
}
function v2more() {
  const d = d0(), c = d.cfg, ev = (D().events || []).filter((e) => e.date && e.date >= todayStr()), stk = (D().stock || []).length;
  const tog = (k, t, s) => '<button class="v2li" data-act="v2tog" data-k="' + k + '" role="switch" aria-checked="' + (c[k] !== 'off') + '">' + (V2ROWIC[t] ? gtile(V2ROWIC[t][0], V2ROWIC[t][1]) : '') + '<span class="v2li-t"><b>' + t + '</b><span>' + s + '</span></span><span class="v2sw' + (c[k] !== 'off' ? ' on' : '') + '" aria-hidden="true"><i></i></span></button>';
  return '<h1 class="v2h1">Settings and more</h1>' +
    '<p class="v2lbl">Connections</p><section class="v2card v2list">' + v2row('cw', 'WHOOP', d.connected.whoop ? 'Connected' : 'Not connected', d.connected.whoop ? '✓' : 'Connect') + v2row('cs', 'Strava', d.connected.strava ? 'Connected' : 'Not connected', d.connected.strava ? '✓' : 'Connect') + v2row('v2calhelp', 'Google Calendar', D().calOk ? 'Reads busy times to place sessions' : 'Not reading your calendar yet', D().calOk ? '✓' : '›') + v2row('sync', 'Sync now', 'Pull WHOOP and Strava') + v2row('reload', 'Reload from sheet', 'After you edit your Google Sheet') + '</section>' +
    '<p class="v2lbl">Automation</p><section class="v2card v2list">' + tog('auto_meals', 'Count meals as eaten', 'Change only what was different') + tog('auto_workouts', 'Log workouts from Strava', 'You only rate how hard') + tog('rem_wrap', 'Evening wrap-up reminder', '21:00 in your Apex calendar') + '<div class="v2li"><span class="v2li-t"><b>Plan changes</b><span>Always ask me first</span></span><span class="v2li-e">Locked</span></div></section>' +
    '<p class="v2lbl">My data</p><section class="v2card v2list">' + v2row('evsheet', 'Races and events', ev.length ? ev.map((e) => e.name).slice(0, 2).join(' · ') : 'Add your next race') + v2row('v2go', 'Body and weight', 'Weight, waist, plan, photos', '', ' data-sub="body"') + v2row('stockedit', 'Supplement stock', stk ? stk + ' tracked' : 'Count what you have') + v2row('docsheet', 'Program documents', (D().docs || []).length + ' files') + v2row('rlopen', 'Saved reels', 'Your analysed reels') + v2row('inspsheet', 'Reels and TikToks', (D().library || []).length + ' links') + v2row('intsheet', 'Sports I\'m into', 'Climbing, BJJ…') + v2row('setstart', 'Program start', c.program_start ? niceDate(c.program_start) : 'Not set') + '</section>' +
    '<p class="v2lbl">Coach</p><section class="v2card v2list">' + v2row('knowopen', 'About me', 'Profile and notes the coach reads') + v2row('memopen', 'What the coach remembers', (D().memory || []).length + ' things') + v2row('shareopen', 'Share my week', c.share_token ? 'Link is on' : 'Read-only link for a friend or coach') + '</section>' +
    '<p class="v2lbl">Preferences</p><section class="v2card v2list">' + v2row('remopen', 'Reminders', 'Meals, workout, water, bedtime') + v2row('v2go', 'Siri and Shortcuts', 'Log without opening Apex', '', ' data-sub="shortcuts"') + v2row('ramopen', 'Ramadan mode', ramadan() ? 'On' : 'Off') + v2row('fastopen', 'Fasting', fasting() ? 'On' : 'Off') + v2row('setwater', 'Water', esc(wFmt(waterInfo(todayStr()).tgt)) + ' a day') + v2row('settz', 'Time zone', esc(c.timezone || 'Africa/Cairo')) + v2row('v2geo', 'Home city for weather', c.home_geo ? 'Set' : 'Cairo') + '</section>' +
    '<p class="v2lbl">Everything else</p><section class="v2card v2list">' + v2row('v2go', 'All settings and tools', 'The full list from the classic More screen', '', ' data-sub="oldmore"') + v2row('v2classic', 'Classic layout', 'Switch back to the old 5-tab Apex') + '</section>';
}
function v2extras() {
  const T = [['itopen', 'Interval timer', 'EMOM, Tabata, AMRAP', '', 'timer', 'warm'], ['libopen', 'Exercise library', 'History and bests', '', 'book', 'vio'], ['rwopen', 'Run workouts', 'Tempo and intervals at your paces', '', 'run', 'blue'], ['hyopen', 'HYROX stations', 'Find your slowest part', '', 'flame', 'warm'], ['prpopen', 'PR planner', 'Peak for a lift or run', '', 'trophy', 'warm'], ['v2go', 'Skills', 'Muscle-up, handstand…', 'skills', 'pull', 'vio'], ['campopen', 'MMA camp', 'Rounds, techniques, knocks', '', 'glove', 'bad'], ['sportlog', 'Sport session', 'Sparring, BJJ, climbing', '', 'glove', 'bad'], ['injopen', 'Injury mode', 'Swap exercises that hurt', '', 'heart', 'bad'], ['tropen', 'Travel mode', 'Hotel and no-gym sessions', '', 'route', 'blue'], ['gcopen', 'Goal check', 'Is it realistic?', '', 'flag', 'ok'], ['wiopen', 'What if…', 'Sleep more, run more', '', 'spark', 'vio'], ['stackopen', 'Habit stacks', 'Tie a habit to a routine', '', 'check', 'ok'], ['shoeopen', 'Running shoes', 'km per pair', '', 'shoe', 'blue'], ['mobopen', 'Mobility tests', 'Track your range', '', 'stretch', 'ok'], ['pwopen', 'Plan your week', 'Move sessions around your week', '', 'cal', 'vio']];
  return '<h1 class="v2h1">Extras</h1><p class="v2mut">Tools you open less often. Many also appear by themselves where they fit.</p><div class="v2tools">' + T.map(([a, t, s, sub, ic, tone]) => '<button class="v2tool" data-act="' + a + '"' + (a === 'itopen' ? ' data-m="emom"' : '') + (sub ? ' data-sub="' + sub + '"' : '') + '>' + gtile(ic, tone) + '<b>' + t + '</b><span>' + s + '</span></button>').join('') + '</div>';
}
function v2shortcuts() {
  const u = S.url || '', mk = (body) => JSON.stringify(Object.assign({ token: '•••' }, body));
  const L = [['Add a bottle', 'Hey Siri, Apex bottle', { action: 'log', table: 'WaterLog', row: { date: 'Current Date (yyyy-MM-dd)', ml: '+750' } }, 'Uses the water you already logged: set "ml" to your new total, or use the "Add a bottle" Shortcut steps below.'],
    ['Log a sport session', 'Hey Siri, log BJJ 60 minutes', { action: 'log', table: 'SportLog', row: { id: 'any unique text', date: 'Current Date', type: 'BJJ', minutes: '60', rpe: '7' } }, ''],
    ['How do I feel', 'Hey Siri, Apex tired', { action: 'log', table: 'Checkin', row: { date: 'Current Date', feel: 'tired' } }, 'fresh, ok or tired']];
  return '<h1 class="v2h1">Siri and Shortcuts</h1><p class="v2mut">iPhone Shortcuts can send to your Apps Script like the app does. Make each one once in Apple\'s Shortcuts app: Add action › "Get contents of URL", method POST, body JSON, then give it a Siri phrase.</p>' +
    '<section class="v2card"><span class="v2lbl">URL for every shortcut</span><p class="v2small v2mono">' + esc(u || 'Your Apps Script URL') + '</p><button class="v2btn2 sm" data-act="v2copy" data-v="url">Copy URL</button><button class="v2btn2 sm" data-act="v2copy" data-v="token">Copy token</button></section>' +
    L.map(([t, say, body, note]) => '<section class="v2card"><b>' + t + '</b><p class="v2mut"><i>"' + esc(say) + '"</i></p><p class="v2small v2mono">' + esc(mk(body)) + '</p>' + (note ? '<p class="v2mut">' + esc(note) + '</p>' : '') + '</section>').join('') +
    '<p class="v2mut">Plan changes (rest today, I\'m ill) still happen in Apex, where you see what changes before you accept.</p>';
}

/* ---------- Season planner ---------- */
function v2seasonBlocks() {
  const t = todayStr(), ev = (D().events || []).filter((e) => e.date && e.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1)), c = D().cfg, out = [];
  const st = c.program_start, N = planWeeks();
  if (st && D().plan.length) { const end = dateAdd(st, N * 7 - 1); out.push({ k: 'cur', name: c.program_name || 'Current block', from: st, to: end, note: t < st ? 'starts in ' + daysBetween(t, st) + (daysBetween(t, st) === 1 ? ' day' : ' days') : t > end ? 'finished' : 'running now' }); }
  const curEnd = out.length ? out[0].to : null;
  let cur = out.length ? dateAdd(out[0].to, 1) : t;
  ev.forEach((e, i) => {
    out.push({ k: 'race', name: e.name, date: e.date, goal: e.goal });
    const after = dateAdd(e.date, 1), next = ev[i + 1];
    // a race inside the current block: that block already holds the recovery days, so only the rest of the 2 weeks is added
    const recFrom = curEnd && curEnd >= after ? dateAdd(curEnd, 1) : after, recTo = dateAdd(after, 13);
    if (daysBetween(recFrom, recTo) >= 6) out.push({ k: 'rec', name: 'Recovery', from: recFrom, to: recTo, note: 'easy runs, mobility, gym at 70%' });
    if (next) {
      const wks = Math.floor(daysBetween(recTo > (curEnd || '') ? dateAdd(recTo, 1) : dateAdd(curEnd, 1), next.date) / 7);
      if (wks >= 3) {
        const taper = wks >= 8 ? 2 : 1, base = Math.max(0, Math.round((wks - taper) / 3)), build = wks - taper - base, s0 = recTo > (curEnd || '') ? dateAdd(recTo, 1) : dateAdd(curEnd, 1);
        if (base) out.push({ k: 'base', name: 'Strength base', from: s0, to: dateAdd(s0, base * 7 - 1), note: 'heavy legs and pulling, short runs' });
        const s1 = dateAdd(s0, base * 7); out.push({ k: 'build', name: /hyrox/i.test(next.name) ? 'HYROX build' : 'Build', from: s1, to: dateAdd(s1, build * 7 - 1), note: /hyrox/i.test(next.name) ? 'stations, compromised running, sleds' : 'race-specific work' });
        const s2 = dateAdd(s1, build * 7); out.push({ k: 'taper', name: 'Taper', from: s2, to: dateAdd(next.date, -1), note: 'volume down, race pace sharp' });
      }
    }
    cur = after;
  });
  return { blocks: out, undated: (D().events || []).filter((e) => !e.date) };
}
function v2season() {
  const B = v2seasonBlocks(), saved = D().cfg.season;
  return '<h1 class="v2h1">Your season</h1><p class="v2mut">Blocks between your races, proposed by Apex. Nothing starts until you approve it. When a block starts you build it with Create new program.</p><section class="v2card v2list">' +
    (B.blocks.length ? B.blocks.map((b) => b.k === 'race' ? '<div class="v2race"><b class="v2num">' + esc(niceDate(b.date)) + '</b><span class="v2li-t"><b>' + esc(b.name) + '</b><span>' + (b.goal ? 'goal ' + esc(b.goal) : 'no goal set') + '</span></span></div>'
      : '<div class="v2li"><i class="v2blk b-' + b.k + '"></i><span class="v2li-t"><b>' + esc(b.name) + '</b><span>' + esc(niceDate(b.from)) + ' – ' + esc(niceDate(b.to)) + ' · ' + esc(b.note) + '</span></span><span class="v2li-e">' + Math.max(1, Math.round((daysBetween(b.from, b.to) + 1) / 7)) + ' wk</span></div>').join('') : '<p class="v2mut">Add a race with a date in Settings and more › Races and events.</p>') +
    B.undated.map((e) => '<div class="v2race dash"><b class="v2num">?</b><span class="v2li-t"><b>' + esc(e.name) + '</b><span>No date yet. Add it and the blocks fill in.</span></span></div>').join('') + '</section>' +
    (B.blocks.length > 1 ? '<div class="v2row2"><button class="v2btn" data-act="v2seasonok" style="flex:1">' + (saved ? 'Approve again' : 'Approve the plan') + '</button><button class="v2btn2" data-act="evsheet">Change races</button></div>' + (saved ? '<p class="v2mut">Approved ' + esc((JSON.parse(saved || '{}').at || '').slice(0, 10)) + '.</p>' : '') : '');
}

/* ---------- best time to train ---------- */
function timeBody() {
  const ds = todayStr(), ses = sessionFor(ds), mins = (() => { try { return estMin(parseSession(ses.details).filter((b) => !b.skip)) || 45; } catch (e) { return 45; } })();
  const busy = (D().calendar || []).filter((e) => e.date === ds).map((e) => [v2hm(e.start), v2hm(e.end), e.title]);
  const meals = mealsFor((dayPlan(ds) || {}).daytype).map((m) => v2hm(m.time)).filter((x) => x != null);
  const free = (a) => busy.every(([s, e]) => a + mins <= s || a >= e) && v2hm(nowTime()) <= a;
  const C = []; [360, 420, 480, 1020, 1080, 1140].forEach((a) => { if (free(a) && !meals.some((m) => Math.abs(m - a) < 30)) C.push(a); });
  const hh = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const pick = S.tp || (C[0] != null ? hh(C[0]) : '');
  return '<p class="v2mut">' + esc(ses.name) + ', about ' + mins + ' min. From your calendar and when you train best.</p><section class="v2card v2list flat">' + (busy.length ? busy.map(([s, e, tt]) => '<div class="v2li"><b class="v2time">' + hh(s) + '</b><span class="v2li-t"><b>' + esc(tt || 'Busy') + '</b><span>until ' + hh(e) + '</span></span></div>').join('') : '<p class="v2mut">Nothing in your calendar today.</p>') + '</section>' +
    '<p class="v2lbl">Free times</p><div class="v2chips">' + (C.length ? C.map((a) => '<button class="v2chip' + (pick === hh(a) ? ' on' : '') + '" aria-pressed="' + (pick === hh(a)) + '" data-act="v2tp" data-v="' + hh(a) + '">' + hh(a) + (a < 600 ? ' · morning' : '') + '</button>').join('') : '<span class="v2mut">No free slot left today. Move it to another day instead.</span>') + '</div>' +
    '<button class="v2btn wide" data-act="v2tpgo"' + (pick ? '' : ' disabled') + '>Train at ' + esc(pick || '…') + '</button><button class="v2btn2 wide" data-act="v2change">Another day</button>';
}

/* ---------- heat ---------- */
function v2geo() { try { const g = JSON.parse(D().cfg.home_geo || ''); if (g && isFinite(g.lat) && isFinite(g.lon)) return g; } catch (e) { /* default */ } return { lat: 30.04, lon: 31.24, name: 'Cairo' }; }
function v2wx() { try { const w = JSON.parse(LS.getItem('wx') || 'null'); return w && w.day === todayStr() ? w : null; } catch (e) { return null; } }
function v2wxLoad() {
  if (v2wx() || S._wxBusy || !navigator.onLine) return; S._wxBusy = true; const g = v2geo();
  fetch('https://api.open-meteo.com/v1/forecast?latitude=' + g.lat + '&longitude=' + g.lon + '&daily=temperature_2m_max,temperature_2m_min&hourly=temperature_2m&forecast_days=2&timezone=auto')
    .then((r) => r.json()).then((j) => { const w = { day: todayStr(), max: j.daily.temperature_2m_max, min: j.daily.temperature_2m_min, h6: j.hourly.temperature_2m[6], name: g.name || '' }; LS.setItem('wx', JSON.stringify(w)); S._wxBusy = false; if (w.max[0] >= 32 && S.tab === 'today') render(); })
    .catch(() => { S._wxBusy = false; });
}
function v2heatCard(ds) {
  v2wxLoad(); const w = v2wx(); if (!w || ds !== todayStr() || !(w.max[0] >= 32)) return '';
  const W = waterInfo(ds), ses = sessionFor(ds), run = ses && /run|km/i.test(ses.name);
  return '<section class="v2card v2heat"><span class="v2ic">' + V2I.sun + '</span><div class="v2grow"><span class="v2lbl">Hot day · ' + esc(w.name || 'home') + '</span><b>' + Math.round(w.h6) + '°C at 06:00, ' + Math.round(w.max[0]) + '°C max</b><span class="v2mut">Water raised to ' + esc(wFmt(W.tgt)) + ' with a pinch of salt' + (run ? '. Easy runs about 15 s/km slower, judge by heart rate.' : '.') + '</span></div></section>';
}

/* ---------- weekly PDF ---------- */
function v2weekHTML() {
  const t = todayStr(), st = weekStart(t), name = D().cfg.name || 'Athlete'; let rows = '';
  for (let i = 0; i < 7; i++) {
    const ds = dateAdd(st, i), s = sessionFor0(ds), wl = logs('WorkoutLog', ds).concat((H().workouts || []).filter((w) => w.date === ds))[0], R = readiness(ds);
    rows += '<tr><td>' + esc(dow(ds)) + ' ' + Number(ds.slice(8)) + '</td><td>' + esc(s ? s.p.session : 'Rest') + '</td><td>' + esc(wl ? wl.status + (wl.rpe ? ' · RPE ' + wl.rpe : '') : ds > t ? 'planned' : '–') + '</td><td>' + (R ? R.score : '–') + '</td></tr>';
  }
  const sore = (D().soreness || []).filter((x) => x.date >= st).map((x) => x.area + ' (' + x.date.slice(5) + ')').join(', ');
  return '<html><body style="font-family:Arial,sans-serif;color:#17171D;padding:24px"><h2 style="margin:0 0 4px">' + esc(name) + ' · week of ' + esc(niceDate(st)) + '</h2><p style="color:#555;margin:0 0 16px">From Apex</p><table style="width:100%;border-collapse:collapse;font-size:12px" border="1" cellpadding="6"><tr style="background:#eee"><th>Day</th><th>Session</th><th>Done</th><th>Readiness</th></tr>' + rows + '</table>' +
    (sore ? '<p style="font-size:12px"><b>Sore:</b> ' + esc(sore) + '</p>' : '') + (activeInjuries().length ? '<p style="font-size:12px"><b>Injuries:</b> ' + esc(activeInjuries().map((i) => i.area + (i.note ? ' (' + i.note + ')' : '')).join(', ')) + '</p>' : '') + '</body></html>';
}

/* ---------- actions ---------- */
COACH_KEEP.push('v2tp', 'v2copy');
Object.assign(COACH_ACTS, {
  v2wk: (el) => { const v = Number(el.dataset.v); S.v2wk = v === 0 ? 0 : (S.v2wk || 0) + v; render(); },
  v2tog: (el) => { const k = el.dataset.k, on = D().cfg[k] !== 'off'; setCfg(k, on ? 'off' : 'on'); render(); },
  v2pat: (el) => { decide('pattern', el.dataset.t, el.dataset.v, ''); toast(el.dataset.v === 'accepted' ? 'Thanks, noted.' : 'Got it, I\'ll stop assuming that.'); render(); },
  v2time: () => { S.tp = ''; infoSheet('When to train today', timeBody(), 'tp'); },
  v2tp: (el) => { S.tp = el.dataset.v; keepScroll('tp', timeBody()); },
  v2tpgo: () => { const ds = todayStr(), s0 = sessionFor0(ds); if (!s0 || !S.tp) return; send({ action: 'log', table: 'Overrides', row: { date: ds, session: s0.p.session, load: s0.p.load, time: S.tp, daytype: s0.p.daytype || (planFor(ds) || {}).daytype || 'sat', details: s0.p.details, reason: 'time change' } }); decide('time change', s0.p.session, 'accepted', S.tp); closeSheets(); toast('Training at ' + S.tp + ' today.'); },
  v2seasonok: () => { const B = v2seasonBlocks(); setCfg('season', JSON.stringify({ at: todayStr(), blocks: B.blocks.filter((b) => b.k !== 'race').map((b) => [b.name, b.from, b.to]) }).slice(0, 2000)); decide('season', B.blocks.filter((b) => b.k === 'race').map((b) => b.name).join(' → '), 'accepted', ''); toast('Season approved. Each block is built when it starts.'); render(); },
  v2calhelp: () => infoSheet('Google Calendar', '<p class="v2small">Apex reads only the start, end and title of today\'s and the next 7 days\' events from your main calendar, to place sessions around meetings. It never changes your events.</p><p class="v2small">After updating Apps Script (Part 21 in SETUP.md), run <b>authorizeCalendar</b> once from the editor and allow access. Then tap Sync.</p>', 'calh'),
  v2copy: (el) => { const v = el.dataset.v === 'url' ? S.url : S.token; try { navigator.clipboard.writeText(v || ''); toast('Copied'); } catch (e) { toast('Copy did not work on this phone'); } },
  v2geo: () => { if (!navigator.geolocation) { toast('Location is not available on this phone'); return; } navigator.geolocation.getCurrentPosition((p) => { setCfg('home_geo', JSON.stringify({ lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100, name: 'Home' })); LS.removeItem('wx'); toast('Home city set for the weather.'); }, () => toast('Location not allowed. Cairo stays the default.')); },
  v2classic: () => { if (!confirm('Switch to the classic 5-tab layout? You can switch back in More › 2.0 layout.')) return; LS.setItem('v2off', '1'); location.reload(); },
  v2new: () => { LS.removeItem('v2off'); location.reload(); },
  v2pdf: async () => {
    try {
      toast('Making the PDF…', 4000);
      const j = await call({ action: 'week_pdf', html: v2weekHTML() });
      const bin = atob(j.pdf), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const file = new File([u8], 'apex-week.pdf', { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'My training week' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = 'apex-week.pdf'; document.body.appendChild(a); a.click(); a.remove(); }
    } catch (e) { if (e && e.name !== 'AbortError') toast('Could not make the PDF: ' + (e.message || 'try again')); }
  }
});

/* heat raises today's water target */
const v2waterInfo0 = waterInfo;
waterInfo = function (ds) {
  const W = v2waterInfo0(ds); if (!V2ON || ds !== todayStr()) return W;
  const w = v2wx(); if (w && w.max[0] >= 32) { W.tgt = Math.round(W.tgt * (w.max[0] >= 36 ? 1.25 : 1.15) / 50) * 50; W.heat = true; }
  return W;
};

if (!V2ON) {
  const v2viewMore0 = viewMore;
  viewMore = function () { return '<button class="card" data-act="v2new" style="width:100%;text-align:left;border:0;font:inherit;color:inherit;cursor:pointer;min-height:56px"><b>Try Apex 2.0</b><p class="mut small" style="margin:4px 0 0">The new 4-tab layout. You can switch back any time.</p></button>' + v2viewMore0(); };
  VIEWS.more = viewMore;
}
if (V2ON) {
  VIEWS.train = viewPlan2;
  VIEWS.meals = viewFuel2;
  VIEWS.you = viewYou2;
  VIEWS.more = viewYou2; VIEWS.insights = viewYou2;
}
// app.js already painted once with the classic views: repaint with 2.0
if (V2ON) { if (S.data) normalize(S.data); render(); }

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
  const t = todayStr(), d = D(), dw = new Date(t + 'T12:00:00Z').getUTCDay(), start = d.cfg.program_start || '';
  if (dw === 0) return null; // a new week starts on Sunday
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
  return h + row({ act: 'prlog', ic: I.plus, bg: 'var(--accFill)', t: 'Log a record', cls: 'add' }) + '</div>' + (auto.length ? '<p class="foot">Strava records use your synced runs (last 14 days).</p>' : '');
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
  const started = c.program_start && c.program_start <= t, pct = started ? Math.min(100, ((daysBetween(c.program_start, t) % (N * 7)) + 1) / (N * 7) * 100) : 0;
  let h = '<section class="card prog"><span class="eyebrow3">Your program</span><h3>' + esc(c.program_name || 'Current plan') + '</h3><p class="mut small">' + (started ? 'Week ' + w + ' of ' + N : c.program_start ? 'Starts ' + esc(niceDate(c.program_start)) : N + ' weeks') + '</p>' +
    '<div class="bar" role="img" aria-label="' + Math.round(pct) + ' percent through the program"><i style="width:' + pct + '%"></i></div>';
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
function nextSunday() { const t = todayStr(), dw = new Date(t + 'T12:00:00Z').getUTCDay(); return dateAdd(t, dw === 0 ? 7 : 7 - dw); }
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
      '<p class="lbl">Also use</p><div class="card list flat">' + tog('whoop', 'WHOOP', 'Recovery, HRV and sleep, last 14 days') + tog('strava', 'Strava', 'Your recent runs and paces') + tog('reels', 'Reels and TikToks', 'Titles and your notes') + tog('sports', 'Sports I\'m into', 'e.g. climbing days') + '</div>' +
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
    const j = await call({ action: 'plan_start', prefs: Object.assign({}, P, { name: P.name || (nextRace() ? nextRace().name + ' block' : 'New program') }), docs });
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
  const m = mode === 'swap' && D().plan ? mealsFor((planFor(todayStr()) || {}).daytype).find((x) => x.slot === slot) : null;
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

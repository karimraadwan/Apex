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
    const ds = dateAdd(t, i); if (D().overrides.some((o) => o.date === ds && o.reason === 'travel')) continue;
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
  if (D().overrides.some((o) => o.date >= t && /deload|ease/.test(o.reason || ''))) return 0;
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
    mode = 'planned'; const dw = new Date(t + 'T12:00:00Z').getUTCDay();
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
  const ds = todayStr(), p = planFor(ds); if (!p) return 0;
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
    const ds = dateAdd(t, -i), p = planFor(ds); if (!p) continue; const ms = mealsFor(p.daytype), ml = logs('MealLog', ds); if (!ml.length) continue;
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
  if (home && new Date(todayStr() + 'T12:00:00Z').getUTCDay() !== 0) return '';
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
function estMin(blocks) { return Math.round(blocks.reduce((a, b) => a + (b.skip ? (/warm/i.test(b.head) ? 6 * 60 : 0) : b.ex.reduce((x, e) => x + setsIn(e) * (45 + b.rest), 0)), 0) / 60); }
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

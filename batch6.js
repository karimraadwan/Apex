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
  const T = TAPER[left];
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
  if ([y, y2].filter((s) => s && s.p.load === 'Hard').length >= 2) return ['mob', 'Two hard days behind you'];
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

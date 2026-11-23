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

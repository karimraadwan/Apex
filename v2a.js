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
  const ds = todayStr(), d = d0(), c = d.cfg, ses = sessionFor(ds), RST = restInfo(ds, ses), p = dayPlan(ds), hr = local().hour;
  let h = v2head(shortDate(ds), greeting() + (c.name ? ', ' + c.name : ''), true) + v2status(ds);
  h += syncBanner() + tzBanner() + v2setup() + sickCard() + illCard(ds) + ramCard() + raceWeekCard() + postRaceCard() + v2heatCard(ds);
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

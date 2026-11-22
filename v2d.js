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
    else if (hrv <= B.hrv * 0.9 || (a3 != null && a3 <= B.hrv * 0.93)) add('hrv', 0.5, 'HRV ' + Math.round(hrv) + (a3 != null && hrv > B.hrv * 0.9 ? ', low 3 days' : '') + ', normal ' + Math.round(B.hrv));
  }
  // skin temperature
  if (skin != null && B.skin != null && skin >= B.skin + 1) add('skin', 1, 'Skin temp +' + (skin - B.skin).toFixed(1) + '°C');
  else if (skin != null && B.skin != null && skin >= B.skin + 0.7) add('skin', 0.5, 'Skin temp +' + (skin - B.skin).toFixed(1) + '°C');
  // blood oxygen
  if (spo2 != null && (spo2 < 94 || (B.spo2 != null && spo2 <= B.spo2 - 2))) add('spo2', 1, 'Blood oxygen ' + spo2.toFixed(1) + '%');
  // sleep
  if ((sh != null && sh < 6.5) || (sp != null && sp < 75)) add('sleep', 0.5, sh != null && sh < 6.5 ? 'Slept ' + Math.floor(sh) + ' h ' + String(Math.round((sh % 1) * 60)).padStart(2, '0') : 'Sleep quality ' + sp + '%');
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
      illMetric('Resting heart rate', '', 'rhr', B.rhr, illNum(w.rhr), false, '#FF7A6E') +
      illMetric('HRV', ' ms', 'hrv', B.hrv, illNum(w.hrv), true, '#8B7CF6') +
      illMetric('Skin temperature', '°', 'skin_temp', B.skin, illNum(w.skin_temp), false, '#F5B83D', 1) +
      illMetric('Blood oxygen', '%', 'spo2', B.spo2, illNum(w.spo2), true, '#5AB0FF', 1) + '</section>';
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

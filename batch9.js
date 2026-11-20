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
    L.details = L.details.split('\n').map((l) => km(l).replace(/race effort: HR 150-155[^,\n]*/gi, 'easy, HR under 150').replace(/race rehearsal/gi, 'easy')).join('\n');
    L.session = km(p.session).replace(/:?\s*race rehearsal/i, '') + (level === 'deload' ? ' (comeback)' : ' (easing in)');
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
  if (v && !ch) out.push({ id: 'whoop', title: v === 'swap' ? 'Swap to Active Recovery today' : 'Do it, but lighter', why: 'WHOOP recovery ' + w.recovery + '%. ' + (w.reason || ''), acc: 'vacc', rej: 'vrej' });
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
  const n = Math.max(1, Math.min(28, daysBetween(B.from, B.to) + 1)), end = B.to, ph = n <= 3 ? [[2, 'ease']] : n <= 7 ? [[3, 'deload'], [4, 'ease']] : n <= 14 ? [[7, 'deload'], [7, 'ease']] : [[7, 'deload'], [7, 'deload'], [7, 'ease']];
  const shift = B.mode === 'pause' && n >= 5 ? Math.max(1, Math.round(n / 7)) * 7 : 0, back = [];
  let d = dateAdd(end, 1) > todayStr() ? dateAdd(end, 1) : todayStr();
  ph.forEach(([days, lv]) => { for (let i = 0; i < days; i++, d = dateAdd(d, 1)) back.push([d, lv]); });
  return { n, end, shift, back };
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
  breakopen: () => { const ev = nextRace(); S.brk = { from: todayStr(), to: dateAdd(todayStr(), 6), why: '', mode: ev && daysBetween(todayStr(), ev.date) <= 42 ? 'keep' : 'pause' }; infoSheet('Plan a break', breakBody(), 'brk'); },
  brwhy: (el) => { S.brk.why = el.dataset.k; keepScroll('brk', breakBody()); },
  brmode: (el) => { S.brk.mode = el.dataset.k; keepScroll('brk', breakBody()); },
  brgo: () => {
    const B = S.brk, P = breakPlan(B); if (!B.why) return;
    if (!confirm(P.n + ' days off, ' + niceDate(B.from) + ' to ' + niceDate(P.end) + ', then a ' + P.back.length + '-day comeback. OK?')) return;
    if (P.shift) setCfg('program_start', dateAdd(D().cfg.program_start, P.shift));
    for (let i = 0; i < P.n; i++) { const ds = dateAdd(B.from, i); if (logs('WorkoutLog', ds).some((x) => x.status === 'done')) continue; send({ action: 'log', table: 'Overrides', row: { date: ds, session: 'Break: rest', load: 'Rest', time: '09:00', daytype: 'sat', details: '# Break day\n- Walk 20-40 min if you feel like it\n- Sleep, water, protein', reason: 'break: ' + B.why } }); }
    let n = 0; P.back.forEach(([ds, lv]) => { const s = sessionFor0(ds), L = s && comeback(s.p, lv); if (L) { send({ action: 'log', table: 'Overrides', row: Object.assign({ date: ds, reason: 'comeback' }, L) }); n++; } });
    decide('break', P.n + ' days, ' + B.from + ' to ' + P.end + (P.shift ? ', program paused' : ''), 'accepted', B.why);
    closeSheets(); toast(P.n + ' days off set. Comeback: ' + n + ' lighter sessions after.', 4000);
  }
});

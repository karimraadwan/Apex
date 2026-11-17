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
  const p = planFor(todayStr()); if (!p) return; const got = suppsTaken(todayStr());
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

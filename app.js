'use strict';
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
const tz = () => (S.data && S.data.cfg && S.data.cfg.timezone) || 'Africa/Cairo';
function local(d) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d || new Date());
  const g = (t) => p.find((x) => x.type === t).value;
  const h = g('hour') === '24' ? '00' : g('hour');
  return { date: g('year') + '-' + g('month') + '-' + g('day'), time: h + ':' + g('minute'), hour: Number(h) };
}
const todayStr = () => local().date;
const nowTime = () => local().time;
function dateAdd(ds, n) { const d = new Date(ds + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5); }
function dow(ds) { return DAYS[new Date(ds + 'T12:00:00Z').getUTCDay()]; }
function weekNo(ds) {
  const start = (S.data && S.data.cfg.program_start) || ds;
  const diff = daysBetween(start, ds);
  return diff < 0 ? 1 : (Math.floor(diff / 7) % 4) + 1;
}
function ago(stamp) {
  if (!stamp) return 'never';
  const [d, t] = String(stamp).split(' ');
  const n = daysBetween(d, todayStr());
  return n === 0 ? 'today ' + (t || '') : n === 1 ? 'yesterday ' + (t || '') : n + ' days ago';
}
let toastT;
const toast = (m, ms) => { const t = $('#toast'); t.textContent = m; t.className = 'on'; clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), ms || 2200); };

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
  while (S.queue.length) {
    try { await call(S.queue[0]); S.queue.shift(); save(); }
    catch (e) {
      if (e instanceof Reject) { S.failed.push({ item: S.queue.shift(), error: e.message }); save(); toast('Not saved: ' + e.message, 3500); continue; }
      break; // offline or server busy: keep everything and retry later
    }
  }
  flushing = false;
}

// local mirror of a queued write (used right away and again after every reload)
function applyLocal(item) {
  const d = S.data; if (!d) return;
  if (item.action === 'log' || item.action === 'del') {
    const keys = { MealLog: ['date', 'slot'], WaterLog: ['date'], WorkoutLog: ['date', 'session'], Checkin: ['date'], Body: ['date'], Events: ['name', 'date'] }[item.table];
    const L = item.table === 'Events' ? d.events : d.logs[item.table];
    if (!L || !keys) return;
    const i = L.findIndex((r) => keys.every((k) => String(r[k]) === String(item.row[k])));
    if (item.action === 'del') { if (i >= 0) L.splice(i, 1); return; }
    if (i >= 0) L[i] = Object.assign({}, L[i], item.row); else L.push(Object.assign({}, item.row));
  } else if (item.action === 'suggest_decide') {
    d.suggestions = d.suggestions.filter((s) => s.id !== item.id);
    if (String(item.id).startsWith('verdict-')) {
      d.verdicts = (d.verdicts || []).filter((v) => v.id !== item.id);
      d.verdicts.push({ id: item.id, status: item.status, date: item.date });
    }
  }
}
function send(item) { applyLocal(item); S.queue.push(item); save(); render(); flush(); }

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
function normalize(d) {
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  d.whoop.sort(byDate); d.strava.sort(byDate); // B1: never trust row order
  Object.values(d.logs).forEach((l) => l.sort(byDate));
  d.verdicts = d.verdicts || [];
  return d;
}

/* ---------- data helpers ---------- */
const D = () => S.data;
const logs = (t, date) => D().logs[t].filter((r) => r.date === date);
function planFor(ds, day) { return D().plan.find((p) => String(p.week) === String(weekNo(ds)) && p.day === (day || dow(ds))); }
function mealsFor(daytype) { return D().meals.filter((m) => m.daytype === daytype); }
function targetFor(daytype) { return D().targets.find((t) => t.daytype === daytype) || {}; }
function whoopFor(ds) { return D().whoop.find((w) => w.date === ds); }
function verdictChoice(ds) { const v = D().verdicts.find((x) => x.id === 'verdict-' + ds); return v ? v.status : null; }

// B6 / B7: what you actually train after accepting a verdict
function sessionFor(ds) {
  const p = planFor(ds); if (!p) return null;
  const w = whoopFor(ds), ch = verdictChoice(ds);
  if (ch !== 'accepted' || !w) return { p, name: p.session, details: p.details, mode: 'plan' };
  if (w.verdict === 'swap') {
    const rec = planFor(ds, 'Sat') || p;
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
    const first = m.querySelector('input'); if (first) setTimeout(() => first.focus(), 50);
    m.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-f]');
      if (!b && ev.target !== m) return;
      if (!b || b.dataset.f === 'cancel') { m.remove(); resolve(null); return; }
      const vals = fields.map((f, i) => m.querySelector('#ff' + i).value.trim());
      for (let i = 0; i < fields.length; i++) {
        const err = fields[i].check ? fields[i].check(vals[i]) : '';
        if (err) { m.querySelector('#ferr').textContent = err; m.querySelector('#ff' + i).focus(); return; }
      }
      m.remove(); resolve(vals);
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

/* ---------- views ---------- */
function syncBanner() {
  const c = D().cfg;
  if (c.last_sync_error) return '<div class="card warnc" role="alert"><b>Last sync had a problem</b><p class="small" style="margin:4px 0">' + esc(c.last_sync_error) + '</p><p class="mut small">Last good sync: ' + esc(ago(c.last_sync_ok)) + '. If it says reconnect, use More > Connect.</p></div>';
  return '';
}
function tzBanner() {
  let dev = '';
  try { dev = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { /* ignore */ }
  if (!dev || dev === tz()) return '';
  return '<div class="card mut small">Your phone is on ' + esc(dev) + ' but Apex is using ' + esc(tz()) + '. If you are travelling, change "timezone" in the Config tab.</div>';
}
function greeting() { const h = local().hour; return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }

function viewToday() {
  const ds = todayStr(), d = D(), c = d.cfg, ses = sessionFor(ds), p = ses && ses.p;
  const w = whoopFor(ds), ch = verdictChoice(ds);
  let h = '<h1>' + greeting() + ', ' + esc(c.name || '') + '</h1><p class="sub">' + dow(ds) + ' ' + ds + (p ? ' · Week ' + p.week : '') +
    ' · ' + (S.busy ? 'syncing...' : 'updated ' + esc(ago(c.last_sync_ok))) + (S.queue.length ? ' · ' + S.queue.length + ' waiting to upload' : '') + '</p>';
  h += syncBanner() + tzBanner();

  if (w && w.verdict) {
    const rec = Number(w.recovery) || 0;
    const msg = { keep: 'Keep today\'s plan.', reduce: 'Reduce: last block removed, about 80% weights.', swap: 'Swap to Active Recovery today.' }[w.verdict];
    h += '<div class="card"><span class="pill ' + w.verdict + '">' + w.verdict.toUpperCase() + '</span><div class="vbig">Recovery ' + rec + '%</div><div class="bar" role="img" aria-label="Recovery ' + rec + ' percent"><i style="width:' + rec + '%"></i></div>' +
      '<p class="mut" style="margin:8px 0 4px">' + esc(w.reason) + '</p><p style="margin:4px 0 8px"><b>' + esc(msg) + '</b></p>';
    if (w.verdict !== 'keep' && !ch) h += '<div class="row"><button class="g" data-act="vacc">Accept change</button><button data-act="vrej">Keep original</button></div>';
    else if (ch) h += '<p class="mut small">You chose: ' + (ch === 'accepted' ? 'accept the change' : 'keep the original plan') + ' <button class="sm" data-act="vundo">Change</button></p>';
    h += '</div>';
  } else {
    const last = d.whoop[d.whoop.length - 1];
    h += '<div class="card"><h3>No WHOOP score for today yet</h3><p class="mut">It appears after you wake and WHOOP syncs. Tap Sync now in More.' + (last ? ' Last score: ' + esc(last.recovery) + '% on ' + esc(last.date) + ' (' + daysBetween(last.date, ds) + ' day(s) old).' : '') + '</p></div>';
  }

  if (p) {
    const wl = logs('WorkoutLog', ds).find((r) => r.session === ses.name);
    h += '<h2>Workout</h2><div class="card"><h3>' + esc(ses.name) + '</h3><p class="mut">' + esc(ses.mode === 'swap' ? 'Recovery' : p.load) + ' · ' + esc(p.time) + '</p>';
    if (wl) h += '<p><span class="pill keep">' + esc(wl.status) + '</span> ' + esc(wl.time) + ' <button class="sm" data-act="wundo">Undo</button></p>';
    else h += '<div class="row"><button class="g" data-act="wdone">Did it</button><button data-act="wskip">Skipped</button></div>';
    h += '<details style="margin-top:10px"' + (ses.mode !== 'plan' ? ' open' : '') + '><summary class="mut">See the full session</summary><div class="det">' + parseDetails(ses.details) + '</div></details></div>';

    const ms = mealsFor(p.daytype), ml = logs('MealLog', ds);
    const done = ms.filter((m) => ml.find((r) => r.slot === m.slot));
    const next = ms.find((m) => !ml.find((r) => r.slot === m.slot));
    h += '<h2>Meals</h2><div class="card">';
    done.forEach((m) => {
      const r = ml.find((x) => x.slot === m.slot);
      h += '<div class="done-m row sp"><span>✓ ' + esc(m.name) + ' · ' + esc(r.status) + (r.note ? ' (' + esc(r.note) + ')' : '') + (r.time ? ' at ' + esc(r.time) : '') + '</span><button class="sm fit" data-act="mundo" data-slot="' + esc(m.slot) + '" aria-label="Undo ' + esc(m.name) + '">Undo</button></div>';
    });
    if (next) {
      h += '<div style="margin-top:8px"><span class="mut small">Planned ' + esc(next.time) + '</span><h3>' + esc(next.name) + '</h3><p style="margin:2px 0 6px">' + esc(next.items) + '</p>' +
        (next.supps ? '<p class="mut small">Supplements: ' + esc(next.supps) + '</p>' : '') +
        '<label for="mt" class="mut small">Time you ate it</label><input type="time" id="mt" value="' + nowTime() + '">' +
        '<div class="row" style="margin-top:8px"><button class="g" data-act="mate" data-slot="' + esc(next.slot) + '">Ate it</button><button data-act="mskip" data-slot="' + esc(next.slot) + '">Skipped</button><button data-act="mswap" data-slot="' + esc(next.slot) + '">Swap</button></div></div>';
    } else h += '<p><b>All meals logged for today.</b></p>';
    ml.filter((r) => r.status === 'extra').forEach((r) => (h += '<div class="done-m row sp"><span>+ ' + esc(r.extra_name) + ' · ' + esc(r.kcal) + ' kcal at ' + esc(r.time) + '</span><button class="sm fit" data-act="mundo" data-slot="' + esc(r.slot) + '" aria-label="Delete ' + esc(r.extra_name) + '">Delete</button></div>'));
    h += '<button class="sm" style="margin-top:10px;width:100%" data-act="mextra">+ Extra meal or snack</button>';
    const tg = targetFor(p.daytype);
    const eaten = ml.reduce((a, r) => {
      if (r.status === 'skipped') return a;
      if (r.status === 'extra' || r.status === 'swap') return a + (Number(r.kcal) || 0);
      const m = ms.find((x) => x.slot === r.slot); return a + (m ? Number(m.kcal) || 0 : 0);
    }, 0);
    const pct = Math.min(100, (eaten / (Number(tg.kcal) || 1)) * 100);
    h += '<p class="mut small" style="margin:10px 0 4px">' + eaten + ' / ' + esc(tg.kcal || '?') + ' kcal · protein target ' + esc(tg.protein || '?') + ' g' + (eaten > Number(tg.kcal) ? ' · over target' : '') + '</p><div class="bar" role="img" aria-label="' + Math.round(pct) + ' percent of calories"><i style="width:' + pct + '%"></i></div></div>';
  }

  const bot = Number(c.bottle_ml) || 750, tgt = Number(dow(ds) === 'Sat' ? c.water_target_rest : c.water_target_train) || 4000;
  const wr = logs('WaterLog', ds)[0], ml2 = wr ? Number(wr.ml) : 0, n = Math.ceil(tgt / bot), f = Math.floor(ml2 / bot);
  h += '<h2>Water</h2><div class="card"><div class="row sp"><b>' + (ml2 / 1000).toFixed(2) + ' L</b><span class="mut">target ' + (tgt / 1000).toFixed(1) + ' L' + (ml2 >= tgt ? ' · done ✓' : '') + '</span></div><div class="bottles" role="img" aria-label="' + f + ' of ' + n + ' bottles">';
  for (let i = 0; i < Math.max(n, f); i++) h += '<div class="bt ' + (i < f ? 'f' : '') + '"></div>';
  h += '</div><div class="row"><button data-act="wminus" ' + (ml2 <= 0 ? 'disabled' : '') + '>- bottle</button><button class="p" data-act="wplus">+ bottle (' + bot + ' ml)</button></div></div>';

  const ck = logs('Checkin', ds)[0];
  h += '<h2>How do you feel?</h2><div class="card row" role="group" aria-label="How do you feel">' + ['Fresh', 'OK', 'Tired'].map((x) => '<button class="' + (ck && ck.feel === x ? 'p' : '') + '" aria-pressed="' + !!(ck && ck.feel === x) + '" data-act="feel" data-v="' + x + '">' + x + '</button>').join('') + '</div>';
  return h;
}

function periodKey(per) { const ds = todayStr(); return per === 'monthly' ? ds.slice(0, 7) : dateAdd(ds, -new Date(ds + 'T12:00:00Z').getUTCDay()); }
function viewMeals() {
  const ds = todayStr(), p = planFor(ds), d = D();
  let h = '<h1>Meals</h1>';
  if (p) {
    h += '<p class="sub">Today\'s plan · ' + esc(p.session) + ' · ' + esc(p.daytype) + ' day</p>';
    mealsFor(p.daytype).forEach((m) => { h += '<div class="card"><div class="row sp"><b>' + esc(m.name) + '</b><span class="mut fit">' + esc(m.time) + '</span></div><p style="margin:4px 0">' + esc(m.items) + '</p><p class="mut small">' + esc(m.kcal) + ' kcal' + (m.supps ? ' · ' + esc(m.supps) : '') + '</p></div>'; });
    const t = targetFor(p.daytype);
    h += '<div class="card"><b>Targets</b><p class="mut">' + esc(t.kcal) + ' kcal · P ' + esc(t.protein) + ' g · C ' + esc(t.carbs) + ' g · F ' + esc(t.fat) + ' g</p></div>';
  }
  ['weekly', 'monthly'].forEach((per) => {
    h += '<h2>Shopping, ' + per + (per === 'weekly' ? ' (resets Sunday)' : ' (resets the 1st)') + '</h2><div class="card">';
    let g = '';
    d.shopping.filter((s) => s.period === per).forEach((s, i) => {
      const k = 'shop-' + periodKey(per) + '-' + per + s.item, chk = LS.getItem(k) === '1';
      if (s.group !== g) { g = s.group; h += '<div class="mut small" style="margin-top:8px">' + esc(g) + '</div>'; }
      h += '<label class="row" style="padding:6px 0" for="sh' + per + i + '"><input id="sh' + per + i + '" type="checkbox" class="fit chk" data-shop="' + esc(k) + '" ' + (chk ? 'checked' : '') + '><span style="' + (chk ? 'text-decoration:line-through;opacity:.6' : '') + '">' + esc(s.item) + '</span></label>';
    });
    h += '</div>';
  });
  return h;
}

function viewTrain() {
  const today = todayStr(), d = D();
  const sel = S.viewDay || today;
  const start = dateAdd(today, -new Date(today + 'T12:00:00Z').getUTCDay());
  let h = '<h1>Train</h1><div class="wk" role="group" aria-label="This week">';
  for (let i = 0; i < 7; i++) {
    const ds = dateAdd(start, i), done = logs('WorkoutLog', ds).some((r) => r.status === 'done');
    h += '<button class="' + (ds === sel ? 'on ' : '') + (done ? 'done' : '') + '" aria-pressed="' + (ds === sel) + '" aria-label="' + DAYS[i] + ' ' + ds + (done ? ', done' : '') + '" data-act="vday" data-d="' + ds + '">' + DAYS[i] + '<br>' + ds.slice(8) + (done ? ' ✓' : '') + '</button>';
  }
  h += '</div>';
  const ses = sessionFor(sel);
  if (ses) h += '<div class="card"><h3>' + esc(ses.name) + '</h3><p class="mut">Week ' + esc(ses.p.week) + ' · ' + esc(ses.p.load) + '</p><div class="det">' + parseDetails(ses.details) + '</div></div>';
  const tabs = [...new Set(d.library.map((l) => l.tab))];
  if (tabs.length) {
    const lt = S.libTab || tabs[0];
    h += '<h2>Library</h2><div class="seg" role="group" aria-label="Library categories">' + tabs.map((t) => '<button class="' + (t === lt ? 'on' : '') + '" aria-pressed="' + (t === lt) + '" data-act="ltab" data-t="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>';
    d.library.filter((l) => l.tab === lt).forEach((l) => { h += '<a class="card" style="display:block;text-decoration:none;color:inherit" href="' + esc(l.url) + '" target="_blank" rel="noopener"><b>' + esc(l.title) + '</b><div class="mut small">' + esc(l.creator) + ' · ' + esc(l.note) + '</div></a>'; });
  }
  h += '<h2>Strava, last 14 days (newest first)</h2>';
  if (!d.strava.length) h += '<div class="card mut">Nothing yet. Connect Strava in More.</div>';
  d.strava.slice().reverse().forEach((a) => {
    const km = Number(a.distance_km), min = Number(a.moving_min);
    let pace = '';
    if (km > 0.2 && min > 0 && /run|walk|hike/i.test(a.type)) { const secs = Math.round((min * 60) / km); pace = ' · ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + ' /km'; }
    h += '<div class="card"><b>' + esc(a.name) + '</b><div class="mut small">' + esc(a.date) + ' · ' + esc(a.type) + ' · ' + esc(a.distance_km) + ' km · ' + esc(a.moving_min) + ' min' + pace + (a.avg_hr ? ' · ' + esc(a.avg_hr) + ' bpm' : '') + '</div></div>';
  });
  return h;
}

function viewInsights() {
  const d = D(), today = todayStr();
  let h = '<h1>Insights</h1><h2>Recovery, last 14 days</h2><div class="card">';
  if (!d.whoop.length) h += '<p class="mut">No WHOOP data yet.</p>';
  else {
    // one column per calendar day, so missing days show as gaps
    const cols = [];
    for (let i = 13; i >= 0; i--) { const ds = dateAdd(today, -i); cols.push({ ds, w: whoopFor(ds) }); }
    h += '<div class="chart" role="img" aria-label="Recovery by day: ' + cols.filter((c) => c.w).map((c) => c.ds.slice(5) + ' ' + c.w.recovery + '%').join(', ') + '">' + cols.map((c) => {
      const r = c.w ? Number(c.w.recovery) || 0 : 0;
      return '<div class="col"><span class="v">' + (c.w ? r : '') + '</span><i style="height:' + (c.w ? Math.max(3, Math.round(r * 0.9)) : 0) + 'px;background:' + (r >= 67 ? 'var(--ok)' : r >= 34 ? 'var(--warn)' : 'var(--bad)') + '"></i><span class="d">' + c.ds.slice(8) + '</span></div>';
    }).join('') + '</div><p class="mut small">Green 67%+ · yellow 34–66% · red 33% and under. Empty column = no score that day.</p>';
    const last = d.whoop[d.whoop.length - 1], age = daysBetween(last.date, today);
    h += '<p class="small" style="margin-top:8px">Latest ' + esc(last.date) + (age > 0 ? ' <b class="warnt">(' + age + ' day' + (age > 1 ? 's' : '') + ' old)</b>' : ' (today)') + ': HRV ' + esc(last.hrv) + ' ms · RHR ' + esc(last.rhr) + ' · sleep ' + esc(last.sleep_hours) + ' h (' + esc(last.sleep_perf) + '%) · strain ' + esc(last.strain) + '</p>';
  }
  h += '</div><h2>Suggested changes</h2>';
  if (!d.suggestions.length) h += '<div class="card mut">Nothing waiting. Any change to your plan shows up here first, and nothing changes until you accept it.</div>';
  d.suggestions.forEach((s) => { h += '<div class="card"><p>' + esc(s.text) + '</p><div class="row"><button class="g" data-act="sacc" data-id="' + esc(s.id) + '">Accept</button><button class="r" data-act="srej" data-id="' + esc(s.id) + '">Reject</button></div></div>'; });
  const b = d.logs.Body.slice(-10).reverse();
  h += '<h2>Weight</h2><div class="card">' + (b.length ? b.map((x) => '<div class="row sp small"><span>' + esc(x.date) + '</span><span class="fit">' + esc(x.weight) + ' kg' + (x.waist ? ' · waist ' + esc(x.waist) + ' cm' : '') + '</span></div>').join('') : '<p class="mut">No entries yet.</p>') + '</div>';
  if (S.failed.length) {
    h += '<h2>Not saved</h2><div class="card">' + S.failed.slice(-5).map((f) => '<div class="small">' + esc(f.item.table || f.item.action) + ': ' + esc(f.error) + '</div>').join('') + '<button class="sm" style="margin-top:8px" data-act="clearfail">Clear</button></div>';
  }
  return h;
}

function viewMore() {
  const d = D(), c = d.cfg;
  let h = '<h1>More</h1><h2>Sync</h2><div class="card"><div class="row"><button class="p" data-act="sync">Sync now</button><button data-act="reload">Reload</button></div>' +
    '<p class="mut small">Last sync: ' + esc(ago(c.last_sync)) + ' · last good sync: ' + esc(ago(c.last_sync_ok)) + '</p><p class="mut small">The sheet pulls WHOOP and Strava by itself around 07:00, 08:00 and 18:00 Cairo time.</p></div>';
  h += syncBanner();
  h += '<h2>Connections</h2><div class="card"><div class="row sp"><span>WHOOP</span><span class="pill ' + (d.connected.whoop ? 'keep' : 'swap') + '">' + (d.connected.whoop ? 'connected' : 'not connected') + '</span></div><div class="row sp" style="margin-top:8px"><span>Strava</span><span class="pill ' + (d.connected.strava ? 'keep' : 'swap') + '">' + (d.connected.strava ? 'connected' : 'not connected') + '</span></div>' +
    '<p class="mut small">Apex only asks WHOOP for recovery, cycles (strain) and sleep, and Strava for your activities. Both are read-only.</p><div class="row" style="margin-top:10px"><button data-act="cw">Connect WHOOP</button><button data-act="cs">Connect Strava</button></div></div>';
  h += '<h2>Log body</h2><div class="card"><button class="p" style="width:100%" data-act="body">Log weight and waist</button></div>';
  h += '<h2>Events</h2>';
  d.events.forEach((e) => {
    const left = e.date ? daysBetween(todayStr(), e.date) : null;
    h += '<div class="card"><div class="row sp"><b>' + esc(e.name) + '</b><span class="mut fit">' + esc(e.date || 'date TBD') + '</span></div><div class="row sp"><span class="mut small">' + esc(e.type) + ' · ' + esc(e.status) + (left === null ? '' : left >= 0 ? ' · ' + left + ' days to go' : ' · passed') + '</span><button class="sm fit" data-act="evdel" data-n="' + esc(e.name) + '" data-d="' + esc(e.date) + '" aria-label="Delete ' + esc(e.name) + '">Delete</button></div></div>';
  });
  h += '<button class="sm" style="width:100%" data-act="evadd">+ Add event</button>';
  h += '<h2>Settings</h2><div class="card"><p class="mut small">Bottle size, water targets, program start date, name and time zone (' + esc(tz()) + ') live in the Config tab of your sheet.</p><button class="r" data-act="logout">Disconnect this phone</button></div>';
  return h;
}

function viewSetup() {
  return '<h1>Apex setup</h1><p class="sub">Paste the two things from your Google Sheet setup (SETUP.md, steps 3 and 4).</p><div class="card"><label for="su" class="mut small">Web app URL (ends in /exec)</label><input id="su" inputmode="url" autocomplete="off" placeholder="https://script.google.com/macros/s/.../exec"><label for="st" class="mut small" style="display:block;margin-top:10px">Token (api_token in the Config tab)</label><input id="st" autocomplete="off" placeholder="token"><button class="p" style="width:100%;margin-top:12px" data-act="connect">Connect</button></div>';
}

const VIEWS = { today: viewToday, meals: viewMeals, train: viewTrain, insights: viewInsights, more: viewMore };
const TABS = [['today', '🏠', 'Today'], ['meals', '🍽', 'Meals'], ['train', '💪', 'Train'], ['insights', '📈', 'Insights'], ['more', '⚙️', 'More']];

function render() {
  const app = $('#app'), tabs = $('#tabs');
  if (!S.url || !S.token) { app.innerHTML = viewSetup(); tabs.style.display = 'none'; return; }
  tabs.style.display = 'flex';
  tabs.innerHTML = TABS.map((t) => '<button class="' + (S.tab === t[0] ? 'on' : '') + '" aria-label="' + t[2] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + ' data-act="tab" data-t="' + t[0] + '"><b aria-hidden="true">' + t[1] + '</b><span aria-hidden="true">' + t[2] + '</span></button>').join('');
  if (!S.data) { app.innerHTML = '<h1>Loading...</h1><p class="sub">First load can take a few seconds.</p>'; return; }
  const y = window.scrollY;
  try { app.innerHTML = VIEWS[S.tab](); } catch (e) { app.innerHTML = '<div class="card">Display error: ' + esc(e.message) + '</div>'; }
  window.scrollTo(0, y);
}

/* ---------- actions ---------- */
const LOG_ACTS = ['mate', 'mskip', 'mswap', 'wdone', 'wskip', 'wplus', 'wminus', 'vacc', 'vrej', 'feel', 'mundo', 'wundo'];
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  const a = el.dataset.act;
  // B14: ignore a second tap that lands within 0.8 s on a logging button
  if (LOG_ACTS.includes(a)) { const t = Date.now(); if (t - S.lastTap < 800) return; S.lastTap = t; }
  const ds = todayStr(), ses = S.data && sessionFor(ds);
  const timeVal = () => { const i = $('#mt'); return (i && /^\d{2}:\d{2}$/.test(i.value) && i.value) || nowTime(); };
  const kcalField = (label) => ({ label: label || 'Calories (kcal)', type: 'number', attrs: 'inputmode="numeric" min="0" max="5000"', check: range('Calories', LIM.kcal[0], LIM.kcal[1]) });
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
    case 'vundo': S.data.verdicts = S.data.verdicts.filter((v) => v.id !== 'verdict-' + ds); save(); render(); break;
    case 'wdone': case 'wskip': send({ action: 'log', table: 'WorkoutLog', row: { date: ds, session: ses.name, status: a === 'wdone' ? 'done' : 'skipped', note: ses.mode, time: nowTime() } }); break;
    case 'wundo': send({ action: 'del', table: 'WorkoutLog', row: { date: ds, session: ses.name } }); break;
    case 'mate': send({ action: 'log', table: 'MealLog', row: { date: ds, slot: el.dataset.slot, status: 'ate', time: timeVal(), note: '', extra_name: '', kcal: '' } }); break;
    case 'mskip': send({ action: 'log', table: 'MealLog', row: { date: ds, slot: el.dataset.slot, status: 'skipped', time: '', note: '', extra_name: '', kcal: '' } }); break;
    case 'mundo': send({ action: 'del', table: 'MealLog', row: { date: ds, slot: el.dataset.slot } }); break;
    case 'mswap': {
      const slot = el.dataset.slot, tm = timeVal();
      const v = await form('What did you eat instead?', [{ label: 'Food', check: need('Food'), attrs: 'maxlength="120"' }, kcalField()]);
      if (!v) break;
      send({ action: 'log', table: 'MealLog', row: { date: ds, slot, status: 'swap', time: tm, note: v[0], extra_name: '', kcal: String(Number(v[1])) } }); break;
    }
    case 'mextra': {
      const v = await form('Extra meal or snack', [{ label: 'What was it?', check: need('Name'), attrs: 'maxlength="120"' }, kcalField(), { label: 'Time', type: 'time', value: nowTime(), check: (x) => (/^\d{2}:\d{2}$/.test(x) ? '' : 'Pick a time') }]);
      if (!v) break;
      send({ action: 'log', table: 'MealLog', row: { date: ds, slot: 'extra-' + Date.now(), status: 'extra', time: v[2], note: '', extra_name: v[0], kcal: String(Number(v[1])) } }); break;
    }
    case 'wplus': case 'wminus': {
      const bot = Number(S.data.cfg.bottle_ml) || 750, cur = Number((logs('WaterLog', ds)[0] || {}).ml) || 0;
      const nv = Math.max(0, cur + (a === 'wplus' ? bot : -bot));
      if (nv > LIM.waterMax) { toast('That would be over 10 L today. Not added.', 3000); break; }
      if (a === 'wplus' && cur < LIM.waterWarn && nv >= LIM.waterWarn && !confirm('Over 6 L today. Too much water too fast can be dangerous. Add anyway?')) break;
      send({ action: 'log', table: 'WaterLog', row: { date: ds, ml: nv, time: nowTime() } }); break;
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
    case 'vday': S.viewDay = el.dataset.d; render(); break;
    case 'ltab': S.libTab = el.dataset.t; render(); break;
    case 'sacc': case 'srej': send({ action: 'suggest_decide', id: el.dataset.id, status: a === 'sacc' ? 'accepted' : 'rejected' }); break;
    case 'clearfail': S.failed = []; save(); render(); break;
    case 'cw': case 'cs': {
      // open the window inside the tap so iPhone does not block it, then point it at the link
      const win = window.open('', '_blank');
      try { const j = await call({ action: 'links' }); const u = a === 'cw' ? j.links.whoop : j.links.strava; if (win) win.location = u; else location.href = u; }
      catch (e) { if (win) win.close(); toast('Error: ' + e.message); }
      break;
    }
  }
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-shop]'); if (!el) return;
  LS.setItem(el.dataset.shop, el.checked ? '1' : '0'); render();
});
window.addEventListener('online', () => load());
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (S.data) normalize(S.data);
render();
load();

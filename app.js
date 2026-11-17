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
const tz = () => travelTz() || (S.data && S.data.cfg && S.data.cfg.timezone) || 'Africa/Cairo';
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
  t.textContent = m; if (can) { U.shown = true; t.insertAdjacentHTML('beforeend', '<button class="undo" data-undo="1">Undo</button>'); ms = Math.max(ms || 0, 5000); }
  t.className = 'on'; clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), ms || 2200);
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
function normalize(d) {
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  d.whoop.sort(byDate); d.strava.sort(byDate); // B1: never trust row order
  Object.values(d.logs).forEach((l) => l.sort(byDate));
  d.verdicts = d.verdicts || []; d.docs = d.docs || []; d.interests = d.interests || []; d.library = d.library || [];
  d.feedback = d.feedback || []; d.prs = d.prs || []; d.programs = d.programs || []; d.overrides = d.overrides || []; d.ai = !!d.ai;
  ['sets', 'supps', 'sport', 'hyrox', 'injuries', 'habits', 'photos', 'goals', 'shopweek', 'skills', 'shoes', 'mobility'].forEach((k) => { d[k] = d[k] || []; }); d.stats = d.stats || {}; d.hist = d.hist || {}; ['mealalts', 'stock', 'memory'].forEach((k) => { d[k] = d[k] || []; });
  return d;
}

/* ---------- data helpers ---------- */
const D = () => S.data;
const logs = (t, date) => D().logs[t].filter((r) => r.date === date);
function planFor(ds, day) { return D().plan.find((p) => String(p.week) === String(weekNo(ds)) && p.day === (day || dow(ds))); }
function mealsFor(daytype) { return fastRemap(D().meals.filter((m) => m.daytype === daytype)); }
function targetFor(daytype) { return D().targets.find((t) => t.daytype === daytype) || {}; }
function whoopFor(ds) { return D().whoop.find((w) => w.date === ds); }
function verdictChoice(ds) { const v = D().verdicts.find((x) => x.id === 'verdict-' + ds); return v && (v.status === 'accepted' || v.status === 'rejected') ? v.status : null; }

// B6 / B7: what you actually train after accepting a verdict
function sessionFor(ds) { return adaptSession(sessionFor0(ds)); }
function sessionFor0(ds) {
  // a session you moved here (missed-workout fix) replaces the planned one
  const ov = D().overrides.find((o) => o.date === ds);
  const p = ov ? Object.assign({ week: String(weekNo(ds)), day: dow(ds), moved: true }, ov) : planFor(ds); if (!p) return null;
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
function wFmt(ml, u, dec) { u = u || wUnit(); const d = dec === undefined ? wDec(u) : dec; return wNum(ml, u).toFixed(d) + ' ' + u; }
function toMl(v, u) { const n = Number(v); return u === 'L' ? n * 1000 : u === 'oz' ? n * OZ : n; }
function waterInfo(ds) {
  const c = d0().cfg, bot = Number(c.bottle_ml) || 750, tgt = Number(dow(ds) === 'Sat' ? c.water_target_rest : c.water_target_train) || 4000;
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
  if (ch === 'accepted' && v === 'swap') { V[0] = '⇄'; V[1] = 'Switched to recovery'; V[2] = 'Recovery ' + rec + '%. Today is Active Recovery instead of ' + p.session + '.'; }
  if (ch === 'accepted' && v === 'reduce') { V[1] = 'Lighter session set'; V[2] = 'Last block removed. Use about 80% of your weights.'; }
  if (ch === 'rejected') { V[2] = 'You chose the full plan. Recovery ' + rec + '%, so listen to your body and stop if something feels off.'; }
  const wl = p && logs('WorkoutLog', ds).find((r) => r.session === ses.name);
  const blocks = ses ? (String(ses.details).match(/^#\s*Block/gim) || []).length : 0;
  const load = ses ? (ses.mode === 'swap' ? 'Recovery' : p.load) : '';
  let h = '<section class="card hero v-' + v + '" aria-label="Today: ' + esc(V[1]) + '">' +
    '<div class="hero-top"><div class="hring" role="img" aria-label="' + (rec === null ? 'No recovery score' : 'Recovery ' + rec + ' percent') + '">' + ringSVG(rec === null ? 0 : rec / 100, 76, 8, 'url(#rg)') + '<div class="hero-num xs"><b>' + (rec === null ? '--' : cnt(rec)) + '</b><span>REC</span></div></div>' +
    '<div class="hero-ses"><span class="eyebrow3">Today\'s workout</span>' + (ses ? '<h3>' + esc(ses.name) + '</h3><p class="mut small"><span class="tag ' + esc(String(load).toLowerCase()) + '">' + esc(load) + '</span> ' + esc(p.time) + (blocks ? ' · ' + blocks + ' blocks' : '') + '</p>' : '<h3>Rest day</h3>') + '</div></div>' +
    '<div class="vbox"><span class="vic" aria-hidden="true">' + V[0] + '</span><div><b>' + esc(V[1]) + '</b><span>' + esc(V[2]) + '</span></div></div>';
  if (w && w.verdict) h += tiles(w);
  if (ses) {
    if (v !== 'keep' && v !== 'none' && !ch) h += '<div class="row hero-act"><button class="p" data-act="vacc">Accept</button><button data-act="vrej">Keep plan</button></div>';
    else if (wl) h += '<div class="row sp hero-act"><span class="pill ' + (wl.status === 'done' ? 'keep' : 'swap') + '">' + esc(wl.status.toUpperCase()) + ' · ' + esc(wl.time) + '</span><button class="txt fit" data-act="wundo">Undo</button></div>';
    else h += '<div class="row hero-act"><button class="g" data-act="wdone">Did it</button><button data-act="wskip">Skipped</button></div>';
    if (ch) h += '<p class="chosen">' + (ch === 'accepted' ? 'Plan adjusted for today' : 'Keeping the original plan') + ' · <button class="txt" data-act="vundo">Change</button></p>';
    h += '<button class="link-row" data-act="ssheet">View full session<span class="chev">›</span></button>';
  }
  if (w && w.reason) h += '<details class="why"><summary>Why this decision?</summary><p>' + esc(w.reason) + '</p></details>';
  return h + '</section>';
}
function miniRing(key, label, val, tgt, unit, stroke, txt) {
  return '<button class="mr" data-act="jump" data-k="' + key + '" aria-label="' + label + ' ' + txt + '"><div class="rw">' + ringSVG(tgt ? val / tgt : 0, 64, 7, stroke) + '<b>' + Math.round(tgt ? Math.min(999, (val / tgt) * 100) : 0) + '%</b></div><span>' + label + '</span><em>' + txt + '</em></button>';
}

const ST_ICON = { ate: '✓', swap: '↺', extra: '+', skipped: '✕', next: '•', todo: '' };
function viewToday() {
  const ds = todayStr(), d = d0(), c = d.cfg, ses = sessionFor(ds), p = ses && ses.p, w = whoopFor(ds), ch = verdictChoice(ds);
  let h = '<header class="top home"><div class="top-l"><p class="date">' + esc(niceDate(ds)) + (p ? ' · Week ' + p.week : '') + '</p><h1>' + greeting() + (c.name ? ',<br>' + esc(c.name) : '') + '</h1>' + updatedLabel() + '</div>' +
    '<button class="sync-ic' + (S.busy ? ' busy' : '') + '" data-act="sync" aria-label="Sync WHOOP and Strava now">' + ICON(I.sync) + '</button></header>';
  h += syncBanner() + tzBanner() + sickCard() + briefCard();
  h += heroCard(ds, w, ch, ses) + (ses && ses.injured ? '<p class="injline">' + ICON(TI.heart) + '<span>Injury mode: ' + ses.injured + ' exercise' + (ses.injured > 1 ? 's' : '') + ' swapped to protect your ' + esc(ses.injAreas.join(' and ').toLowerCase()) + '.</span></p>' : '') + shortNightCard() + missedCard() + easeCard() + tipCard();
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
  // day timeline
  h += '<div class="tl" role="list" aria-label="Today\'s meals">' + ms.map((m) => {
    const r = ml.find((x) => x.slot === m.slot), st = r ? r.status : m === next ? 'next' : 'todo';
    return '<button role="listitem" class="tl-i st-' + st + '" data-act="msheet" data-slot="' + esc(m.slot) + '" aria-label="' + esc(m.name) + ', ' + (r ? r.status : 'not logged') + '"><span class="tl-t">' + esc(r && r.time ? r.time : m.time) + '</span><span class="tl-ic">' + ST_ICON[st] + '</span><span class="tl-n">' + esc(m.name.replace('Morning protocol', 'Morning').replace(' + soup', '')) + '</span></button>';
  }).join('') + ml.filter((r) => r.status === 'extra').map((r) => '<button role="listitem" class="tl-i st-extra" data-act="msheet" data-slot="' + esc(r.slot) + '"><span class="tl-t">' + esc(r.time) + '</span><span class="tl-ic">+</span><span class="tl-n">' + esc(r.extra_name) + '</span></button>').join('') +
    '<button class="tl-i add" data-act="mextra" aria-label="Add a snack"><span class="tl-t">&nbsp;</span><span class="tl-ic">' + ICON(I.plus) + '</span><span class="tl-n">Snack</span></button></div>';

  h += suppCard(p) + stackCard();
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
  m.innerHTML = '<div class="sheet"><div class="sheet-h"><h3>' + esc(title) + '</h3><button class="icon-btn x" data-close aria-label="Close">✕</button></div>' + body + '</div>';
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
  h.insertAdjacentHTML('afterend', body);
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
  const ds = todayStr(), p = planFor(ds); if (!p) return;
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
  return '<div class="det wo"><div class="wo-prog"><span>' + done + ' of ' + n + ' done</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>' + body + '</div>';
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
function periodKey(per) { const ds = todayStr(); return per === 'monthly' ? ds.slice(0, 7) : dateAdd(ds, -new Date(ds + 'T12:00:00Z').getUTCDay()); }
function viewMeals() {
  const ds = todayStr(), p = planFor(ds), d = d0();
  let h = '<header class="top"><div><p class="date">' + esc(niceDate(ds)) + '</p><h1>Meals</h1></div></header>';
  if (p) {
    const ms = mealsFor(p.daytype), ml = logs('MealLog', ds), t = targetFor(p.daytype), eaten = kcalEaten(ms, ml), kT = Number(t.kcal) || 1;
    h += '<section class="card macro"><div class="macro-ring">' + ringSVG(eaten / kT, 124, 12, 'url(#gk)') + '<div class="hero-num sm"><b>' + cnt(eaten) + '</b><span>of ' + esc(t.kcal) + '</span></div></div><div class="macros">' +
      [['Protein', proteinEaten(ms, ml) + ' / ' + proteinTarget(t), 'var(--ringA)', Math.min(100, (proteinEaten(ms, ml) / proteinTarget(t)) * 100)], ['Carbs target', t.carbs, 'var(--ringC)', 100], ['Fat target', t.fat, '#f59e0b', 100]].map(([n, g, col, pc]) => '<div class="mac"><span class="mut small">' + n + '</span><b>' + esc(g) + ' g</b><i style="background:linear-gradient(90deg,' + col + ' ' + pc + '%,var(--card2) ' + pc + '%)"></i></div>').join('') + '</div></section>' +
      '<button class="card eoc" data-act="eatout"><span class="li-ic" style="background:#f97316">' + ICON(LI.fork) + '</span><span><b>Eating out today?</b><span class="mut small">Best choices on the menu and how to fit your day</span></span><span class="chev">›</span></button>';
    h += '<p class="sub center">' + esc(p.daytype.charAt(0).toUpperCase() + p.daytype.slice(1)) + ' day · ' + esc(p.session) + '</p>';
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
  const start = dateAdd(today, -new Date(today + 'T12:00:00Z').getUTCDay());
  let h = '<header class="top"><div><p class="date">Week ' + weekNo(sel) + ' of ' + planWeeks() + '</p><h1>Train</h1></div></header>' + programCard() + tuneCard() + deloadCard() + '<div class="wk" role="group" aria-label="This week">';
  for (let i = 0; i < 7; i++) {
    const ds = dateAdd(start, i), done = logs('WorkoutLog', ds).some((r) => r.status === 'done');
    h += '<button class="' + (ds === sel ? 'on ' : '') + (done ? 'done ' : '') + (ds === today ? 'today' : '') + '" aria-pressed="' + (ds === sel) + '" aria-label="' + DAYS[i] + ' ' + ds + (done ? ', done' : '') + '" data-act="vday" data-d="' + ds + '"><small>' + DAYS[i] + '</small><b>' + Number(ds.slice(8)) + '</b><i class="wd"></i></button>';
  }
  h += '</div>';
  const ses = sessionFor(sel);
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
  if (d.suggestions.length) {
  h += '<h2>Waiting for you</h2>';
  d.suggestions.forEach((s) => { h += '<div class="card"><p>' + esc(s.text) + '</p><div class="row" style="margin-top:16px"><button class="g" data-act="sacc" data-id="' + esc(s.id) + '">Accept</button><button class="r" data-act="srej" data-id="' + esc(s.id) + '">Reject</button></div></div>'; });
  }
  const T = [['recovery', 'Recovery'], ['training', 'Training'], ['body', 'Body'], ['you', 'You']];
  h += '<div class="instab" role="tablist" aria-label="Insights sections">' + T.map(([k, l]) => '<button role="tab" aria-selected="' + (k === tab) + '" class="' + (k === tab ? 'on' : '') + '" data-act="instab" data-t="' + k + '">' + l + '</button>').join('') + '</div>';
  if (tab === 'recovery') {
    h += '<h2>WHOOP · last 14 days</h2>';
  h += '<div class="segc" role="tablist">' + Object.keys(METRICS).map((k) => '<button role="tab" aria-selected="' + (k === mk) + '" class="' + (k === mk ? 'on' : '') + '" data-act="metric" data-m="' + k + '">' + METRICS[k][0] + '</button>').join('') + '</div>';
  if (!d.whoop.length) h += '<div class="card mut">No WHOOP data yet. Connect WHOOP in More.</div>';
  else {
    const vals = (n) => d.whoop.slice(-n).map((x) => Number(x[mk])).filter((x) => x > 0);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const last = d.whoop[d.whoop.length - 1], age = daysBetween(last.date, today);
    const a7 = avg(vals(7)), a30 = avg(vals(30));
    h += '<div class="tiles stats">' + [['Latest', Number(last[mk])], ['7-day avg', a7], ['30-day avg', a30]].map(([l, v]) => '<div class="tile"><span class="tl-l">' + l + '</span><b>' + (v ? cnt(v, M[2]) : '–') + '<small> ' + M[1] + '</small></b></div>').join('') + '</div>';
    const cols = [];
    for (let i = 13; i >= 0; i--) { const ds = dateAdd(today, -i); cols.push({ ds, w: whoopFor(ds) }); }
    const max = mk === 'recovery' ? 100 : Math.max(1, ...cols.map((c) => (c.w ? Number(c.w[mk]) || 0 : 0))) * 1.1;
    h += '<section class="card"><div class="chart" role="img" aria-label="' + M[0] + ' by day: ' + cols.filter((c) => c.w).map((c) => c.ds.slice(5) + ' ' + c.w[mk]).join(', ') + '">' + cols.map((c) => {
      const v = c.w ? Number(c.w[mk]) || 0 : 0, r = Number(c.w && c.w.recovery) || 0;
      const col = mk === 'recovery' ? (r >= 67 ? 'var(--ok)' : r >= 34 ? 'var(--warn)' : 'var(--bad)') : 'linear-gradient(180deg,var(--acc),var(--accFill))';
      return '<div class="col' + (c.ds === today ? ' now' : '') + '"><span class="v">' + (c.w ? (M[2] ? v.toFixed(1) : Math.round(v)) : '') + '</span><i style="height:' + (c.w ? Math.max(3, Math.round((v / max) * 96)) : 0) + 'px;background:' + col + '"></i><span class="d">' + Number(c.ds.slice(8)) + '</span></div>';
    }).join('') + '</div><p class="mut small">' + (mk === 'recovery' ? 'Green 67%+ · yellow 34–66% · red 33% and under. ' : '') + 'Empty column = no data that day.' + (age > 0 ? ' <b class="warnt">Latest data is ' + age + ' day' + (age > 1 ? 's' : '') + ' old.</b>' : '') + '</p></section>';
  }
    h += whatWorksCard() + affectCard() + weeklyCard(false) + monthlyCard(false);
  } else if (tab === 'training') {
    h += volumeCard() + prsSection() + standardsCard() + testsCard() + mobCard() + goalsSection();
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
    h += consistencyCard() + patternsCard() + realityCard() + rulesCard() + predictCard() + '<h2>Streaks</h2>' + streakCard() + badgesCard() + yearCard();
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
  h += '<h2>Coach</h2><div class="card list">' + row({ act: 'chatopen', ic: LI.chat, bg: 'var(--accFill)', t: 'Ask your coach', s: 'Questions about training, food, recovery' }) + row({ act: 'memopen', ic: CI.spark, bg: '#8b5cf6', t: 'What your coach remembers', s: (d.memory || []).length ? d.memory.length + ' thing' + (d.memory.length > 1 ? 's' : '') : 'Nothing yet', end: (d.memory || []).length ? '<span class="count">' + d.memory.length + '</span>' : '' }) +
    row({ act: 'remopen', ic: LI.bell, bg: '#ef4444', t: 'Reminders', s: 'Meals, workout, water, bedtime' }) + row({ act: 'pwopen', ic: CI.cal, bg: '#0ea5e9', t: 'Plan your week', s: 'Move sessions around your calendar' }) +
    row({ act: 'shareopen', ic: BI.share, bg: '#14b8a6', t: 'Share my week', s: D().cfg.share_token ? 'Link is on' : 'Read-only link for a friend or coach' }) + row({ act: 'fastopen', ic: BI.moonc, bg: '#6d5ce8', t: 'Fasting mode', s: fasting() ? 'On · iftar ' + esc(fasting().iftar) : 'Ramadan or daily fasting' }) +
    row({ act: 'cutopen', ic: BI.scale, bg: '#f59e0b', t: 'Weight plan', s: cut() ? 'Target ' + cut().target + ' kg' : 'Safe weight loss to a target' }) + row({ act: 'tropen', ic: TI.plane, bg: '#6d5ce8', t: 'Travel mode', s: travel() ? 'On · ' + esc(travel().place) : 'Off' }) + '</div>';
  h += '<h2>Data</h2><div class="card list">' +
    row({ act: 'sync', ic: I.sync, bg: 'var(--accFill)', t: S.busy ? 'Syncing…' : 'Sync now', s: 'Last good sync: ' + esc(ago(c.last_sync_ok)) }) +
    row({ act: 'cw', ic: I.link, bg: '#111', t: 'WHOOP', s: 'Recovery, strain and sleep · read-only', end: st(d.connected.whoop) }) +
    row({ act: 'cs', ic: I.run, bg: '#fc4c02', t: 'Strava', s: 'Your activities · read-only', end: st(d.connected.strava) }) +
    row({ act: 'reload', ic: I.out, bg: '#64748b', t: 'Reload from sheet', s: 'Use after editing your Google Sheet' }) + '</div>';
  h += '<h2>Body</h2><div class="card list">' + row({ act: 'body', ic: I.scale, bg: '#14b8a6', t: 'Log weight and waist', s: lastB ? 'Last: ' + esc(lastB.weight) + ' kg on ' + esc(niceDate(lastB.date)) : 'No entries yet' }) + row({ act: 'sickopen', ic: TI.heart, bg: sick() ? '#ff453a' : '#64748b', t: sick() ? 'Illness mode · on' : 'I\'m ill', s: sick() ? 'Tap "I feel better" on Today when you\'re back' : 'Pause training and recover' }) + '</div>' + stockCard();
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
  try { app.innerHTML = VIEWS[S.tab](); } catch (e) { app.innerHTML = '<div class="card">Display error: ' + esc(e.message) + '</div>'; }
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

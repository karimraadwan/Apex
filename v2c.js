/* Apex 2.0 graphics: one line-icon set, small illustrations and charts (all inline SVG, no downloads).
   Loaded before v2a.js. Icons use currentColor so they follow dark and light mode. */
const GI_P = {
  run: '<circle cx="14.5" cy="4.5" r="2"/><path d="M6 21l3.5-5.5L13 18v3M5 12l3-3.5 4.5 1 2 3.5 3.5 1M9.5 15.5L12 10"/>',
  barbell: '<path d="M2.5 9.5v5M5.5 7v10M18.5 7v10M21.5 9.5v5M5.5 12h13"/>',
  pull: '<path d="M3 3.5h18M7.5 3.5v3M16.5 3.5v3"/><circle cx="12" cy="10" r="2"/><path d="M7.5 6.5L12 12l4.5-5.5M12 12v4.5l-2.5 4.5M12 16.5l2.5 4.5"/>',
  kb: '<path d="M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5"/><path d="M6 14.5a6 6 0 0 0 12 0c0-3.3-2.7-6-6-6s-6 2.7-6 6z"/>',
  flame: '<path d="M12 3c.8 3.6 5 5 5 10a5 5 0 0 1-10 0c0-2.8 1.6-4 2-6 1.2 1 2 2.2 2 3.2 1.2-1.8 1.4-4.6 1-7.2z"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/>',
  stretch: '<circle cx="12" cy="4.5" r="2"/><path d="M4 9.5l8 2 8-2M12 11.5v4.5l-4 5M12 16l4 5"/>',
  glove: '<path d="M7 11V7.5a2 2 0 0 1 4 0V10M11 9.5V6a2 2 0 0 1 4 0v4M15 9.5a2 2 0 0 1 4 0V14a7 7 0 0 1-7 7h-1a5 5 0 0 1-5-5v-2a2 2 0 0 1 2-2h3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 21h7"/>',
  sunrise: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5 10.5l1.5 1.5M19 10.5L17.5 12"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8.5 7.5c0-1.5 1-2 1-3.5M12.5 7.5c0-1.5 1-2 1-3.5"/>',
  plate: '<circle cx="12" cy="12.5" r="5.5"/><path d="M3 4v6a2 2 0 0 0 2 2v8M5 4v6M21 4c-1.8 0-3 2-3 5s1.2 3 3 3v8"/>',
  pill: '<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7z"/><path d="M7 7l7 7"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 10a5 5 0 0 1 7 0l-2.2 2.2"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M2.5 20h19"/>',
  face: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5a4.2 4.2 0 0 0 7 0M9 10h.01M15 10h.01"/>',
  plug: '<path d="M9 2.5V7M15 2.5V7M6 7h12v4a6 6 0 0 1-12 0zM12 17v4.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.8 2H4.2zM10 21h4"/>',
  flag: '<path d="M5 21V3.5M5 4h12l-2.5 4L17 12H5"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
  share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v6.5h14V13"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  shoe: '<path d="M3 16.5V10l4 1 3-3 3 2.5c2 1.5 4.5 2 7 2.5V16.5zM3 19.5h18"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  spark: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>',
  cart: '<path d="M3 4h2.5l2 11h11l2-7.5H7"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  tools: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'
};
const gi = (n, cls) => '<svg class="gi ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (GI_P[n] || GI_P.spark) + '</svg>';
const gtile = (n, tone) => '<span class="gtile t-' + (tone || 'vio') + '">' + gi(n) + '</span>';

/* what kind of session is this? → icon + colour */
function sesKind(name, load) {
  const s = String(name || '').toLowerCase();
  if (load === 'Rest' || /^off\b|rest|break/.test(s)) return ['moon', 'vio'];
  if (/hyrox|condition|emom|amrap|metcon|sled/.test(s)) return ['flame', 'warm'];
  if (/kettlebell|\bkb\b/.test(s)) return ['kb', 'warm'];
  if (/bjj|mma|box|spar|grappl|kick|muay|pads/.test(s)) return ['glove', 'bad'];
  if (/mobility|stretch|yoga|recovery|walk|animal/.test(s)) return ['stretch', 'ok'];
  if (/calisthenic|pull|muscle-up|handstand|dip/.test(s) && !/run/.test(s)) return ['pull', 'vio'];
  if (/run|km|tempo|interval|stride|jog/.test(s) && !/legs|calisthenic/.test(s)) return ['run', 'blue'];
  if (/legs|squat|deadlift|strength|gym|heavy/.test(s)) return ['barbell', 'bad'];
  if (/run/.test(s)) return ['run', 'blue'];
  return ['bolt', 'vio'];
}
function mealKind(m) {
  const s = String((m && (m.name + ' ' + m.slot)) || '').toLowerCase(), t = Number(String((m && m.time) || '').slice(0, 2));
  if (/protocol|wake|morning/.test(s)) return 'sunrise';
  if (/magnes|sleep|bed|\bmg\b/.test(s)) return 'moon';
  if (/supp|vitamin|creatine/.test(s)) return 'pill';
  if (/pre-?workout|post|shake|snack/.test(s)) return 'bolt';
  if (/soup/.test(s) || t < 11) return 'bowl';
  return 'plate';
}

/* ---------- small charts ---------- */
function gdonut(pct, color, size, label) {
  size = size || 72; const r = size / 2 - 6, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, pct || 0));
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(label || Math.round(f * 100) + ' percent') + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--v2line)" stroke-width="7"/><circle class="gprog" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="' + Math.round(size * 0.22) + '" font-weight="700">' + Math.round(f * 100) + '%</text></svg>';
}
function gspark(vals, color, w, h) {
  w = w || 120; h = h || 32; const V = vals.filter((v) => v != null); if (V.length < 2) return '';
  const mn = Math.min.apply(null, V), mx = Math.max.apply(null, V), sp = mx - mn || 1, step = w / (vals.length - 1);
  const pts = vals.map((v, i) => v == null ? null : [i * step, h - 4 - ((v - mn) / sp) * (h - 8)]).filter(Boolean);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '), last = pts[pts.length - 1];
  return '<svg class="gspark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + ' L' + last[0] + ' ' + h + ' L' + pts[0][0] + ' ' + h + 'Z" fill="' + color + '" opacity=".12"/><path class="gline" pathLength="1" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="' + color + '"/></svg>';
}
function gbottle(pct, label) {
  const f = Math.max(0, Math.min(1, pct || 0)), top = 8 + 50 * (1 - f);
  return '<svg class="gbottle" width="34" height="64" viewBox="0 0 34 64" role="img" aria-label="' + esc(label || '') + '"><defs><clipPath id="gbc"><path d="M11 2h12v6c0 2 6 4 6 10v40a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V18c0-6 6-8 6-10z"/></clipPath></defs><g clip-path="url(#gbc)"><rect x="0" y="0" width="34" height="64" fill="var(--v2line)"/><rect class="gfill" x="0" y="' + top.toFixed(1) + '" width="34" height="64" fill="#38BDF8"/><path d="M0 ' + top.toFixed(1) + ' q8.5 -3 17 0 t17 0 v4 H0z" fill="#7DD3FC" opacity=".7"/></g><path d="M11 2h12v6c0 2 6 4 6 10v40a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V18c0-6 6-8 6-10z" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/></svg>';
}
/* block route: one dot per week, a line through them, the race flag at the end */
function groute(N, frac, raceLabel) {
  const w = 300, x0 = 14, x1 = raceLabel ? w - 34 : w - 14, step = (x1 - x0) / Math.max(1, N), done = x0 + (x1 - x0) * frac;
  let g = '<line x1="' + x0 + '" y1="20" x2="' + x1 + '" y2="20" stroke="var(--v2line)" stroke-width="4" stroke-linecap="round"/>' + (frac > 0 ? '<line class="gline" pathLength="1" x1="' + x0 + '" y1="20" x2="' + done.toFixed(1) + '" y2="20" stroke="var(--v2vio)" stroke-width="4" stroke-linecap="round"/>' : '');
  for (let i = 0; i <= N; i++) { const x = x0 + i * step, on = x <= done + 0.5; g += '<circle cx="' + x.toFixed(1) + '" cy="20" r="' + (i === 0 || i === N ? 6 : 5) + '" fill="' + (on ? 'var(--v2vio)' : 'var(--v2card)') + '" stroke="' + (on ? 'var(--v2vio)' : 'var(--v2line)') + '" stroke-width="2.5"/>'; if (i < N) g += '<text x="' + (x + step / 2).toFixed(1) + '" y="40" text-anchor="middle" font-size="10" font-weight="600" fill="var(--v2mut)">W' + (i + 1) + '</text>'; }
  if (raceLabel) g += '<g transform="translate(' + (w - 26) + ' 6)" stroke="var(--v2warn)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 26V2M2 3h14l-3 5 3 5H2"/></g>';
  if (frac > 0 && frac < 1) g += '<circle cx="' + done.toFixed(1) + '" cy="20" r="8" fill="var(--v2vio)" opacity=".25"/>';
  return '<svg class="groute" viewBox="0 0 ' + w + ' 46" width="100%" role="img" aria-label="Block ' + Math.round(frac * 100) + ' percent done' + (raceLabel ? ', ending at ' + esc(raceLabel) : '') + '">' + g + '</svg>';
}

/* ---------- illustrations ---------- */
const GILL = {
  night: '<svg class="gill" viewBox="0 0 320 96" width="100%" aria-hidden="true"><defs><linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--v2vio)" stop-opacity=".28"/><stop offset="1" stop-color="var(--v2vio)" stop-opacity="0"/></linearGradient></defs><rect width="320" height="96" rx="16" fill="url(#gsky)"/><path d="M244 22a20 20 0 1 0 22 26 16 16 0 0 1-22-26z" fill="var(--v2vio)" opacity=".85"/><g fill="var(--v2tx)" opacity=".7"><circle cx="40" cy="22" r="1.6"/><circle cx="88" cy="40" r="1.2"/><circle cx="150" cy="18" r="1.8"/><circle cx="196" cy="44" r="1.2"/><circle cx="290" cy="20" r="1.4"/><circle cx="120" cy="56" r="1"/></g><path d="M0 80c40-14 80-14 120-4s80 10 120-2 60-10 80-6v28H0z" fill="var(--v2vio)" opacity=".18"/></svg>',
  plan: '<svg class="gill sm" viewBox="0 0 120 90" aria-hidden="true"><rect x="18" y="16" width="84" height="66" rx="12" fill="var(--v2vioT)" stroke="var(--v2vio)" stroke-width="2.5"/><path d="M18 34h84M40 8v16M80 8v16" stroke="var(--v2vio)" stroke-width="2.5" stroke-linecap="round"/><circle cx="60" cy="58" r="14" fill="var(--v2vio)"/><path d="M60 51v14M53 58h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  plate: '<svg class="gill sm" viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="50" rx="34" ry="30" fill="var(--v2okT)" stroke="var(--v2ok)" stroke-width="2.5"/><ellipse cx="60" cy="50" rx="20" ry="17" fill="none" stroke="var(--v2ok)" stroke-width="2" opacity=".6"/><path d="M14 22v18a5 5 0 0 0 5 5v30M19 22v18M106 22c-5 0-8 5-8 13s3 9 8 9v31" stroke="var(--v2ok)" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>',
  trophy: '<svg class="gill sm" viewBox="0 0 120 90" aria-hidden="true"><path d="M42 14h36v22a18 18 0 0 1-36 0z" fill="var(--v2warnT)" stroke="var(--v2warn)" stroke-width="2.5"/><path d="M42 20H30a12 12 0 0 0 14 16M78 20h12a12 12 0 0 1-14 16M60 54v12M46 78h28" stroke="var(--v2warn)" stroke-width="2.5" stroke-linecap="round" fill="none"/><g fill="var(--v2warn)"><circle cx="22" cy="12" r="2"/><circle cx="100" cy="16" r="2.5"/><circle cx="104" cy="60" r="1.8"/></g></svg>'
};

/* icons for settings rows, by title */
const V2ROWIC = { 'WHOOP': ['heart', 'bad'], 'Strava': ['run', 'warm'], 'Google Calendar': ['cal', 'blue'], 'Sync now': ['bolt', 'vio'], 'Reload from sheet': ['book', 'mut'], 'Count meals as eaten': ['plate', 'ok'], 'Log workouts from Strava': ['run', 'warm'], 'Evening wrap-up reminder': ['moon', 'vio'],
  'Races and events': ['flag', 'warm'], 'Body and weight': ['scale', 'ok'], 'Supplement stock': ['pill', 'ok'], 'Program documents': ['book', 'vio'], 'Saved reels': ['spark', 'vio'], 'Reels and TikToks': ['spark', 'vio'], 'Sports I\'m into': ['glove', 'bad'], 'Program start': ['cal', 'vio'],
  'About me': ['face', 'vio'], 'What the coach remembers': ['spark', 'vio'], 'Share my week': ['share', 'blue'], 'Reminders': ['bell', 'warm'], 'Siri and Shortcuts': ['mic', 'vio'], 'Ramadan mode': ['moon', 'vio'], 'Fasting': ['timer', 'warm'], 'Water': ['drop', 'blue'], 'Time zone': ['sun', 'warm'], 'Home city for weather': ['sun', 'warm'], 'All settings and tools': ['tools', 'mut'], 'Classic layout': ['gear', 'mut'] };

/* hours (7.99) -> '7 h 59', never '7 h 60' */
function hmOf(h) { const t = Math.round(Number(h) * 60); return Math.floor(t / 60) + ' h ' + String(t % 60).padStart(2, '0'); }

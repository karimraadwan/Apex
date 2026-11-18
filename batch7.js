/* Apex batch 7: your Claude project knowledge inside the app.
   Profile, current plan, race report and notes (Knowledge tab) + heart-rate based run targets from your tested zones.
   Loaded after batch6.js, before app.js. */
const B7 = { id: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' };

/* ---------- simple markdown for the knowledge docs ---------- */
function mdHTML(t) {
  const inl = (x) => esc(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  let h = '', list = false, tbl = [];
  const flush = () => { if (list) { h += '</ul>'; list = false; } if (tbl.length) { const rows = tbl.filter((r) => !/^\s*\|?\s*-{2,}/.test(r)).map((r) => r.replace(/^\s*\||\|\s*$/g, '').split('|').map((c) => c.trim())); h += '<div class="md-t"><table>' + rows.map((r, i) => '<tr>' + r.map((c) => (i ? '<td>' : '<th>') + inl(c) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</table></div>'; tbl = []; } };
  String(t || '').split('\n').forEach((ln) => {
    if (/^\s*\|/.test(ln)) { if (list) { h += '</ul>'; list = false; } tbl.push(ln); return; }
    if (tbl.length) flush();
    if (/^#{1,2} /.test(ln)) { flush(); const lv = ln.match(/^#+/)[0].length; h += lv === 1 ? '' : '<p class="lbl">' + inl(ln.replace(/^#+\s*/, '')) + '</p>'; }
    else if (/^\s*([-*]|\d+\.)\s+/.test(ln)) { if (!list) { h += '<ul class="md-l">'; list = true; } h += '<li>' + inl(ln.replace(/^\s*([-*]|\d+\.)\s+/, '')) + '</li>'; }
    else if (!ln.trim()) flush();
    else { flush(); h += '<p class="md-p">' + inl(ln) + '</p>'; }
  });
  flush(); return h;
}
const KORD = ['profile', 'plan', 'notes', 'hyrox', 'log'];
function knowList() { return (D().knowledge || []).slice().sort((a, b) => (KORD.indexOf(a.key) + 1 || 99) - (KORD.indexOf(b.key) + 1 || 99)); }
function hrZones() {
  const mx = Number(D().cfg.max_hr); if (!mx) return null;
  return [['Z1 recovery', 0, 125], ['Z2 easy', 126, 156], ['Z3 moderate', 157, 172], ['Z4 hard', 173, 187], ['Z5 max', 188, mx]].map((z) => ({ n: z[0], lo: z[1], hi: z[2] }));
}
function knowBody() {
  const L = knowList(), c = D().cfg, Z = hrZones();
  return '<p class="mut small">From your Claude project. Your coach reads all of this before every answer, plan check and feedback. Edit it in the Knowledge tab of your Sheet.</p>' +
    (Z ? '<p class="lbl">Your heart-rate zones</p><div class="card list flat">' + Z.map((z) => '<div class="li"><span class="li-main"><b>' + esc(z.n) + '</b></span><span class="li-end">' + (z.lo ? z.lo + '–' : 'up to ') + z.hi + ' bpm</span></div>').join('') + '</div><p class="mut small">Max ' + esc(c.max_hr) + ' · threshold ' + esc(c.lthr || '?') + ' bpm' + (c.thr_pace ? ' at ' + esc(c.thr_pace) + ' /km' : '') + '. Easy runs: keep under ' + esc(c.easy_hr_cap || 150) + '.</p>' : '') +
    '<p class="lbl">Your notes</p><div class="card list flat">' + (L.length ? L.map((k) => '<button class="li" data-act="knowone" data-k="' + esc(k.key) + '"><span class="li-main"><b>' + esc(k.title) + '</b><span class="mut small">Updated ' + esc(niceDate(k.updated)) + '</span></span><span class="chev">›</span></button>').join('') : '<p class="empty-note">Nothing yet.</p>') + '</div>';
}

/* ---------- 1. run targets from your 20-min test, by heart rate ---------- */
const runZones7 = runZones;
runZones = function () {
  const T = secOf(D().cfg.thr_pace); if (!T) return runZones7();
  const g = goalPace(), race = g ? g.pace : T + 57;
  return { from: 'your 20-min test (' + D().cfg.thr_pace + ' /km)', race, easy: [T + 111, T + 146], long: [T + 111, T + 146], tempo: [T + 6, T + 16], intervals: [T - 24, T - 14] };
};
function hrFor(kind) {
  const c = D().cfg, cap = Number(c.easy_hr_cap) || 150, lt = Number(c.lthr) || 0; if (!Number(c.max_hr)) return null;
  return { easy: [0, cap, 'Keep HR under ' + cap + ', walk the hills if needed'], long: [0, cap, 'Keep HR under ' + cap + '; last 2 km may drift to 156'], tempo: lt ? [lt - 4, lt + 2, 'HR ' + (lt - 4) + '–' + (lt + 2) + ', comfortably hard'] : null, intervals: [182, 188, 'HR should reach 182–188 by the end of each rep'], race: [148, 158, 'Hold about HR 152; do not pass 158 before km 15'] }[kind];
}
const runWorkouts7 = runWorkouts;
runWorkouts = function () {
  const W = runWorkouts7(); if (!W) return W;
  Object.keys(W).forEach((k) => { const h = hrFor(k === 'race' ? 'race' : k); if (h) W[k] = [W[k][0], W[k][1], W[k][2] + '\n# Heart rate (your main target)\n- ' + h[2]]; });
  return W;
};
const runCheck7 = runCheck;
runCheck = function (a) {
  const r = runCheck7(a); if (!r) return r;
  const hr = Number(a.avg_hr), h = hrFor(r.kind); if (!hr || !h) return r;
  if ((r.kind === 'easy' || r.kind === 'long') && hr > h[1] + 3) return Object.assign({}, r, { ok: false, fast: true, text: 'Too hard by heart rate: average ' + hr + ' vs your easy cap ' + h[1] + '. Slow down next time, the pace will come.' });
  if ((r.kind === 'easy' || r.kind === 'long') && hr <= h[1] + 3) return Object.assign({}, r, { ok: true, fast: false, text: '✓ Easy by heart rate (average ' + hr + ', cap ' + h[1] + ')' + (r.ok ? '' : ' · pace ' + fmtSec(paceOf(a)) + ' /km is fine') });
  return r;
};

Object.assign(COACH_ACTS, {
  knowopen: () => infoSheet('About me', knowBody(), 'know'),
  knowone: (el) => { const k = (D().knowledge || []).find((x) => x.key === el.dataset.k); if (k) infoSheet(k.title, '<div class="md">' + mdHTML(k.text) + '</div>', 'know1'); }
});

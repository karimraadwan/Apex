/* Apex batch 8: your saved Instagram reels inside the app.
   reels.json = 294 analyzed reels (title, creator, summary, key points, tags). Sessions link reels with [reel:ID].
   Loaded after batch7.js, before app.js. */
const RL = { list: null, busy: null };
function reelsLoad() {
  if (RL.list) return Promise.resolve(RL.list);
  if (!RL.busy) RL.busy = fetch('./reels.json').then((r) => r.json()).then((j) => { RL.list = j; RL.by = {}; j.forEach((x) => { RL.by[x.id] = x; }); return j; }).catch(() => { RL.busy = null; return []; });
  return RL.busy;
}
reelsLoad();
const reelT = (id) => (RL.by && RL.by[id] ? RL.by[id].t : 'Saved reel');
function reelChip(id) { return '<button class="reelchip" data-act="reelopen" data-id="' + esc(id) + '"><span aria-hidden="true">▶</span> ' + esc(reelT(id)) + '</button>'; }
// session text: "[reel:ID]" becomes a tappable chip
// called at the end of blocksHTML() in app.js
function reelify(h) {
  return h.indexOf('[reel:') < 0 ? h : h.replace(/(?:Reels:\s*)?((?:\[reel:[\w-]+\]\s*)+)/g, (m, g) => '<span class="reelrow">' + (g.match(/\[reel:([\w-]+)\]/g) || []).map((x) => reelChip(x.slice(6, -1))).join('') + '</span>');
};
function reelBody(r) {
  return '<p class="mut small">' + esc(r.c) + ' · ' + esc(r.g) + '</p><p>' + esc(r.s) + '</p>' + (r.p.length ? '<p class="lbl">Key points</p><ul class="md-l">' + r.p.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
    '<a class="p btn-a" style="margin-top:16px" href="' + esc(r.u) + '" target="_blank" rel="noopener">Watch on Instagram</a>';
}
// reels for an exercise name: best title/point matches
function reelsFor(name, n) {
  if (!RL.list) return [];
  const w = nk(name).replace(/\d+(\.\d+)?\s*kg|\+\s*\d+|\bx\b|\d+/g, ' ').split(/\s+/).filter((x) => x.length > 3 && !/each|side|sets?|reps?|with|weighted|minute/.test(x));
  if (!w.length) return [];
  const phrase = w.join(' ');
  return RL.list.map((r) => { const t = r.t.toLowerCase(), p = r.p.join(' ').toLowerCase(); let s = t.indexOf(phrase) >= 0 ? 5 : 0; w.forEach((x) => { if (t.indexOf(x) >= 0) s += 2; else if (p.indexOf(x) >= 0) s += 1; }); return [r, s]; })
    .filter((x) => x[1] >= Math.min(4, w.length * 2)).sort((a, b) => b[1] - a[1]).slice(0, n || 3).map((x) => x[0]);
}
const exSheetBody8 = exSheetBody;
exSheetBody = function () {
  const h = exSheetBody8(), R0 = reelsFor(S.ex.name, 3);
  if (!R0.length) return h;
  return h.replace('<p class="lbl">How to do it</p>', '<p class="lbl">From your saved reels</p><div class="reelrow">' + R0.map((r) => reelChip(r.id)).join('') + '</div><p class="lbl">How to do it</p>');
};
// browser
const RTAG = [['', 'All'], ['kettlebell', 'Kettlebell'], ['calisthenics', 'Calisthenics'], ['hyrox', 'HYROX'], ['boxing', 'Boxing'], ['mma', 'MMA'], ['legs', 'Legs'], ['core', 'Core'], ['mobility', 'Mobility'], ['animal flow', 'Animal flow'], ['stretching', 'Stretching'], ['emom', 'EMOM'], ['complex', 'Complexes'], ['landmine', 'Landmine'], ['grip', 'Grip']];
function rlBody() {
  if (!RL.list) return '<p class="mut">Loading your reels…</p>';
  const q = (S.rlq || '').toLowerCase(), tg = S.rlt || '';
  const L = RL.list.filter((r) => (!tg || r.tags.indexOf(tg) >= 0) && (!q || (r.t + ' ' + r.c + ' ' + r.s + ' ' + r.p.join(' ')).toLowerCase().indexOf(q) >= 0));
  return '<input id="rlq" type="search" placeholder="Search 294 reels: exercise, creator…" value="' + esc(S.rlq || '') + '" aria-label="Search reels">' +
    '<div class="chiprow rltags">' + RTAG.map(([k, l]) => '<button class="chip' + (k === tg ? ' on' : '') + '" aria-pressed="' + (k === tg) + '" data-act="rltag" data-k="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<p class="mut small">' + L.length + ' reel' + (L.length === 1 ? '' : 's') + '</p><div class="card list flat">' + L.slice(0, 40).map((r) => '<button class="li" data-act="reelopen" data-id="' + esc(r.id) + '"><span class="li-ic" style="background:#d6249f">' + ICON(I.play) + '</span><span class="li-main"><b>' + esc(r.t) + '</b><span class="mut small">' + esc(r.c) + '</span></span><span class="chev">›</span></button>').join('') + (L.length > 40 ? '<p class="empty-note">Showing 40. Search to narrow it down.</p>' : '') + (L.length ? '' : '<p class="empty-note">Nothing found.</p>') + '</div>';
}
document.addEventListener('input', (ev) => { if (ev.target.id === 'rlq') { S.rlq = ev.target.value; const pos = ev.target.selectionStart; refreshSheet('rl', rlBody()); const q = $('#rlq'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } } });
const toolsCard6 = toolsCard;
toolsCard = function () { return toolsCard6().replace(/<\/div>$/, '') + '<button class="tool" data-act="rlopen"><span class="li-ic" style="background:#d6249f">' + ICON(I.play) + '</span><b>Saved reels</b><span>Your 294 Instagram workouts</span></button></div>'; };
COACH_KEEP.push('rltag');
Object.assign(COACH_ACTS, {
  reelopen: async (el) => { await reelsLoad(); const r = RL.by && RL.by[el.dataset.id]; if (r) infoSheet(r.t, reelBody(r), 'reel'); else toast('Reel not found'); },
  rlopen: async () => { S.rlq = ''; S.rlt = ''; infoSheet('Saved reels', rlBody(), 'rl'); await reelsLoad(); refreshSheet('rl', rlBody()); },
  rltag: (el) => { S.rlt = el.dataset.k; keepScroll('rl', rlBody()); }
});
// chips rendered before reels.json arrived get their titles once it loads
reelsLoad().then(() => { document.querySelectorAll('.reelchip').forEach((b) => { const r = RL.by[b.dataset.id]; if (r) b.innerHTML = '<span aria-hidden="true">▶</span> ' + esc(r.t); }); });

/* ======================= redesigned Today timeline: meals + their supplements in one list ======================= */
function dayTimeline(ms, ml, next, p) {
  const SL = suppList(p.daytype), got = suppsTaken(todayStr()), sOn = SL.filter((x) => got.indexOf(x.name) >= 0).length;
  const done = ms.filter((m) => ml.some((r) => r.slot === m.slot)).length;
  const lab = { ate: 'Eaten', swap: 'Swapped', skipped: 'Skipped', next: 'Up next', todo: '' };
  const row = (m) => {
    const r = ml.find((x) => x.slot === m.slot), st = r ? r.status : m === next ? 'next' : 'todo', sp = SL.filter((x) => x.slot === m.slot);
    const sub = r ? lab[st] + (r.time ? ' ' + r.time : '') : st === 'next' ? 'Up next' + (Number(m.kcal) ? ' · ' + m.kcal + ' kcal' : '') : Number(m.kcal) ? m.kcal + ' kcal' : '';
    return '<li class="tr st-' + st + '"><span class="tr-t">' + esc(r && r.time ? r.time : m.time) + '</span><span class="tr-dot" aria-hidden="true">' + (st === 'next' ? '' : ST_ICON[st] || '') + '</span><div class="tr-b">' +
      '<button class="tr-m" data-act="msheet" data-slot="' + esc(m.slot) + '" aria-label="' + esc(m.name) + ', ' + esc(sub || 'not logged') + '"><b>' + esc(m.name.replace('Morning protocol', 'Morning').replace(' + soup', '')) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '<i class="chev" aria-hidden="true">›</i></button>' +
      (sp.length ? '<div class="tr-s" role="group" aria-label="Supplements with ' + esc(m.name) + '">' + sp.map((x) => { const on = got.indexOf(x.name) >= 0; return '<button class="spill' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="supp" data-n="' + esc(x.name) + '">' + (on ? '✓ ' : '') + esc(x.name) + '</button>'; }).join('') + '</div>' : '') + '</div></li>';
  };
  const extra = ml.filter((r) => r.status === 'extra').map((r) => '<li class="tr st-extra"><span class="tr-t">' + esc(r.time) + '</span><span class="tr-dot" aria-hidden="true">+</span><div class="tr-b"><button class="tr-m" data-act="msheet" data-slot="' + esc(r.slot) + '"><b>' + esc(r.extra_name) + '</b><span>Extra' + (r.kcal ? ' · ' + esc(r.kcal) + ' kcal' : '') + '</span><i class="chev" aria-hidden="true">›</i></button></div></li>');
  const all = ms.map((m) => [m.time, row(m)]).concat(extra.map((x, i) => [ml.filter((r) => r.status === 'extra')[i].time || '99', x])).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map((x) => x[1]).join('');
  return '<section class="card tline"><div class="tline-h"><span><b>' + done + '</b> of ' + ms.length + ' meals</span>' + (SL.length ? '<span><b>' + sOn + '</b> of ' + SL.length + ' supplements</span>' : '') + '</div><ol class="trs">' + all + '</ol>' +
    '<button class="tr-add" data-act="mextra">' + ICON(I.plus) + ' Add a snack or extra food</button></section>';
}

/* ======================= reels for the program builder =======================
   Picks up to 40 of your saved reels that fit the new program (day focus, goals, notes),
   reels you also saved as links first. Sent compactly: id, title, tags, first key points. */
const FOCUS_TAGS = { legs: ['legs', 'power', 'hips'], calisth: ['calisthenics', 'shoulders', 'grip', 'core', 'muscle-up'], pull: ['calisthenics', 'grip', 'shoulders'], push: ['calisthenics', 'shoulders', 'core'],
  kettle: ['kettlebell', 'complex', 'emom'], condition: ['emom', 'amrap', 'hyrox', 'complex', 'kettlebell', 'carry'], hyrox: ['hyrox', 'carry', 'emom', 'kettlebell'], mobil: ['mobility', 'hips', 'spine', 'stretching', 'animal flow'],
  rest: ['mobility', 'stretching'], run: ['running', 'legs', 'hips'], strik: ['boxing', 'mma', 'power'], box: ['boxing', 'mma'], mma: ['mma', 'boxing', 'grip'], grappl: ['mma', 'grip', 'core'], core: ['core', 'spine'], animal: ['animal flow', 'mobility'], strength: ['power', 'legs', 'calisthenics'] };
function pickReels(P, list) {
  list = list || RL.list || []; if (!list.length) return [];
  const words = [].concat(P.goals || [], Object.values(P.days || {}), [P.notes || '']).join(' ').toLowerCase();
  const want = {}; Object.keys(FOCUS_TAGS).forEach((k) => { if (words.indexOf(k) >= 0) FOCUS_TAGS[k].forEach((t, i) => { want[t] = (want[t] || 0) + (i === 0 ? 3 : 1); }); });
  if (!Object.keys(want).length) ['legs', 'calisthenics', 'kettlebell', 'mobility', 'core'].forEach((t) => { want[t] = 1; });
  const noteW = String(P.notes || '').toLowerCase().split(/[^a-z-]+/).filter((x) => x.length > 4);
  const saved = {}; (D().library || []).forEach((l) => { const m = String(l.url || '').match(/\/(?:reel|p)\/([\w-]+)/); if (m) saved[m[1]] = l.note || true; });
  const sc = list.map((r) => { let s = saved[r.id] ? (typeof saved[r.id] === 'string' ? 60 : 50) : 0; (r.tags || []).forEach((t) => { s += want[t] || 0; }); const tl = r.t.toLowerCase(); noteW.forEach((w) => { if (tl.indexOf(w) >= 0) s += 2; }); return [r, s]; })
    .filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const per = {}, out = [];
  for (const [r] of sc) { const k = (r.tags || [])[0] || 'other'; if ((per[k] = (per[k] || 0) + 1) > 10 && !saved[r.id]) continue; out.push(r); if (out.length >= 40) break; }
  return out.map((r) => ({ id: r.id, t: r.t.slice(0, 90), tags: (r.tags || []).slice(0, 4), p: (r.p || []).slice(0, 4).map((x) => String(x).slice(0, 110)), note: typeof saved[r.id] === 'string' ? saved[r.id].slice(0, 120) : '' }));
}

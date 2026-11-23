/* Apex 2.0, part B: Plan, session page, Fuel, You and its pages, season, best time, shortcuts,
   consistency, heat, weekly PDF. Old screens stay reachable as pages, so no feature is lost. */
const v2page = (back, backLabel, body) => '<div class="v2pagebar">' + v2back(back, backLabel) + '</div>' + body;

/* ---------- Plan ---------- */
function v2dayInfo(ds) {
  const t = todayStr(), st = D().cfg.program_start, ov = (D().overrides || []).find((o) => o.date === ds), why = String((ov && ov.reason) || '');
  const ses = sessionFor(ds), wl = logs('WorkoutLog', ds).concat((H().workouts || []).filter((w) => w.date === ds)).filter((w) => !/\s·\s(?:AM|PM)$/.test(w.session || ''));
  const done = wl.find((w) => w.status === 'done'), skip = wl.find((w) => w.status === 'skipped'), partial = done && /^partial/.test(done.note || '');
  if (/^break/i.test(why)) return { k: 'break', ses, done, why };
  if (st && ds < st && !ov) return { k: 'pre', ses: null, done };
  if (!ses) return { k: 'none' };
  const RST = restInfo(ds, ses);
  if (RST && RST.kind !== 'recovery' && !done) return { k: 'rest', ses, label: RST.label };
  const PS = sesParts(ses), pr = PS ? PS.map((P) => partRow(ds, P)).filter(Boolean) : [];
  const pp = PS && (pr.length || done || skip) ? partsLine(ds, ses) : '';
  if (!done && !skip && pr.length) return { k: pr.some((r) => r.status === 'done') ? 'partial' : ds < t ? 'missed' : 'plan', ses, done: pr.find((r) => r.status === 'done'), pp };
  return { k: done ? (partial ? 'partial' : 'done') : skip ? 'skip' : ds < t ? 'missed' : 'plan', ses, done, pp };
}
function v2weekRows(start) {
  const t = todayStr(), days = [0, 1, 2, 3, 4, 5, 6].map((i) => { const ds = dateAdd(start, i); return Object.assign({ ds }, v2dayInfo(ds)); });
  const groups = []; days.forEach((d) => { const g = groups[groups.length - 1]; if (g && (d.k === 'break' || d.k === 'pre') && g.k === d.k) g.days.push(d); else groups.push({ k: d.k, days: [d] }); });
  return groups.map((g) => {
    const d = g.days[0], last = g.days[g.days.length - 1], isT = g.days.some((x) => x.ds === t), open = isT ? t : d.ds;
    const dn = '<span class="v2dn">' + (g.days.length > 1 ? dow(d.ds).slice(0, 3) + '<b>' + Number(d.ds.slice(8)) + '–' + Number(last.ds.slice(8)) + '</b>' : (d.ds === t ? 'Today' : dow(d.ds).slice(0, 3)) + '<b>' + Number(d.ds.slice(8)) + '</b>') + '</span>';
    let title, sub, end = '', cls = '';
    if (g.k === 'break') {
      const isB = (x) => (D().overrides || []).some((o) => o.date === x && /^break/i.test(o.reason || ''));
      let a = d.ds, z = last.ds; while (isB(dateAdd(a, -1))) a = dateAdd(a, -1); while (isB(dateAdd(z, 1))) z = dateAdd(z, 1);
      const n = daysBetween(a, z) + 1;
      title = 'Break' + (String(d.why).split(':')[1] ? ' · ' + String(d.why).split(':')[1].trim() : '');
      sub = isT ? 'Day ' + (daysBetween(a, t) + 1) + ' of ' + n + ' · ends ' + shortDate(z) : shortDate(a) + ' – ' + shortDate(z) + ' · ' + n + ' days';
      end = '<span class="v2tag rest">BREAK</span>'; cls = ' brk';
    } else if (g.k === 'pre') { title = 'Before your plan'; sub = 'Plan starts ' + shortDate(D().cfg.program_start); cls = ' pre'; }
    else if (g.k === 'none') { title = 'Rest'; sub = 'Nothing planned'; cls = ' pre'; }
    else {
      title = d.ses.name; const load = d.ses.mode === 'swap' ? 'Recovery' : d.ses.p.load;
      sub = { done: 'Done' + (d.done && d.done.rpe ? ' · RPE ' + d.done.rpe : ''), partial: 'Partly done', skip: 'Skipped', missed: 'Not logged', rest: d.label || 'Rest', plan: d.ses.p.time || '' }[g.k];
      if (d.pp) sub = d.pp;
      end = g.k === 'done' ? '<span class="v2ok" aria-label="done">✓</span>' : g.k === 'partial' ? '<span class="v2ok" aria-label="partly done">½</span>' : g.k === 'skip' || g.k === 'missed' ? '<span class="v2no" aria-label="' + (g.k === 'skip' ? 'skipped' : 'not logged') + '">✕</span>' : v2tag(load);
    }
    const K = g.k === 'break' ? ['moon', 'vio'] : g.k === 'pre' || g.k === 'none' ? null : sesKind(d.ses.name, d.ses.p.load);
    return '<button class="v2day' + (isT ? ' today' : '') + cls + '" data-act="v2go" data-sub="session" data-d="' + open + '">' + dn + (K ? gtile(K[0], g.k === 'done' || g.k === 'partial' ? 'ok' : K[1]) : '<span class="gtile t-mut" aria-hidden="true"></span>') + '<span class="v2li-t"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></span><span class="v2li-e">' + end + '</span></button>';
  }).join('');
}
function viewPlan2() {
  if (S.sub === 'session') return v2session(S.subDay || todayStr());
  if (S.sub === 'season') return v2page('', 'Plan', v2season());
  const t = todayStr(), off = S.v2wk || 0, start = dateAdd(weekStart(t), 7 * off), end = dateAdd(start, 6), c = D().cfg, N = planWeeks(), ev = nextRace();
  const st = c.program_start, pre = st && t < st, wk = st && !pre ? Math.min(N, Math.floor(daysBetween(st, t) / 7) + 1) : 0, frac = st && !pre ? Math.min(1, (daysBetween(st, t) + 1) / (N * 7)) : 0;
  const info = [0, 1, 2, 3, 4, 5, 6].map((i) => v2dayInfo(dateAdd(start, i)));
  const planned = info.filter((x) => ['done', 'partial', 'skip', 'missed', 'plan'].includes(x.k)).length, done = info.filter((x) => x.k === 'done' || x.k === 'partial').length;
  const title = !D().plan.length ? 'No program yet' : pre ? 'Starts in ' + daysBetween(t, st) + ' day' + (daysBetween(t, st) === 1 ? '' : 's') : st && daysBetween(st, t) >= N * 7 ? 'Block done' : 'Week ' + wk + ' of ' + N;
  let h = v2head(c.program_name || (D().plan.length ? 'Your plan' : 'Plan'), title, false);
  if (D().plan.length) {
    h += '<section class="v2card v2block">' + groute(N, frac, ev && daysBetween(t, ev.date) <= N * 7 + (pre ? daysBetween(t, st) : 0) + 7 ? ev.name : '') +
      '<div class="v2kpis"><div><span class="v2lbl">' + (pre ? 'Plan starts' : 'This block') + '</span><b>' + esc(pre ? shortDate(st) : 'Week ' + wk + ' of ' + N) + '</b></div>' +
      (ev ? '<div><span class="v2lbl">' + esc(ev.name.replace(/\s*marathon$/i, '').replace(/half$/i, 'Half')) + '</span><b>' + daysBetween(t, ev.date) + ' days</b></div>' : '<div><span class="v2lbl">Next race</span><b>None set</b></div>') + '</div></section>';
    const rng = Number(start.slice(8)) + (start.slice(5, 7) === end.slice(5, 7) ? '' : ' ' + MON[Number(start.slice(5, 7)) - 1]) + '–' + Number(end.slice(8)) + ' ' + MON[Number(end.slice(5, 7)) - 1];
    h += '<section class="v2card v2list"><div class="v2wknav"><button class="v2icb" data-act="v2wk" data-v="-1" aria-label="Week before">‹</button><div class="v2wkt"><b>' + (off === 0 ? 'This week' : off === 1 ? 'Next week' : off === -1 ? 'Last week' : rng) + '</b><span>' + esc(rng) + (planned ? ' · ' + done + ' of ' + planned + ' done' : '') + '</span></div><button class="v2icb" data-act="v2wk" data-v="1" aria-label="Week after">›</button></div>' +
      v2weekRows(start) + (off ? '<button class="v2link" data-act="v2wk" data-v="0">Back to this week</button>' : '') + '</section>';
  }
  h += '<div class="v2chips scroll"><button class="v2chip" data-act="breakopen">Take a break</button><button class="v2chip" data-act="sickopen">I\'m ill</button><button class="v2chip" data-act="tropen">Travelling</button><button class="v2chip" data-act="v2go" data-sub="season">Season</button><button class="v2chip" data-act="libopen">Search exercises</button></div>';
  h += tuneCard() + deloadCard() + programCard();
  return h;
}
function v2session(ds) {
  const ses = sessionFor(ds), t = todayStr(), back = S.tab === 'train' ? 'Plan' : 'Today';
  if (!ses) return v2page('', back, '<h1 class="v2h1">' + esc(niceDate(ds)) + '</h1><div class="v2card"><p class="v2mut">Nothing planned this day.</p></div>');
  const load = ses.mode === 'swap' ? 'Recovery' : ses.p.load, blocks = parseSession(ses.details).filter((b) => !b.skip); let mins = 0; try { mins = estMin(blocks); } catch (e) { mins = 0; }
  const wl = logs('WorkoutLog', ds).find((r) => r.session === ses.name);
  const K = sesKind(ses.name, load);
  let h = '<div class="v2ses-h v2stack">' + gtile(K[0], K[1]) + '<div class="v2grow"><p class="v2lbl">' + esc(niceDate(ds)) + ' · ' + esc(ses.p.time || '') + '</p><h1 class="v2h1">' + esc(ses.name) + '</h1></div></div><div class="v2chips">' + v2tag(load) + (mins ? '<span class="v2pill">About ' + mins + ' min</span>' : '') + '<span class="v2pill">' + blocks.length + ' block' + (blocks.length === 1 ? '' : 's') + '</span></div>' +
    (ses.injured ? '<p class="injline">' + ICON(TI.heart) + '<span>' + ses.injured + ' exercise' + (ses.injured > 1 ? 's' : '') + ' swapped for your ' + esc(ses.injAreas.join(' and ').toLowerCase()) + '</span></p>' : '') +
    (ses.p.moved ? '<p class="moved">' + ICON(CI.move) + '<span>Moved here ' + esc(String(ses.p.reason || '').replace(/(\d{4}-\d{2}-\d{2})/, (m) => niceDate(m))) + '</span><button class="txt fit" data-act="mvundo" data-d="' + esc(ds) + '" data-r="' + esc(ses.p.reason) + '">Undo</button></p>' : '') +
    '<div class="v2chips"><button class="v2chip" data-act="warmup" data-s="' + esc(ses.name) + '">Warm-up</button><button class="v2chip" data-act="itopen" data-m="emom">Interval timer</button>' + (/barbell|pull|kb|flame/.test(K[0]) || (D().sets || []).some((x) => x.date === ds) ? '<button class="v2chip" data-act="whsend" data-d="' + ds + '">' + gi('share') + 'Send to WHOOP</button>' : '') + (ds >= t ? '<button class="v2chip" data-act="v2change" data-d="' + ds + '">Change</button>' : '') + '</div>' +
    (sesParts(ses) && !wl && ds <= t ? '<p class="v2lbl">Do or skip each part</p>' + partsHTML(ds, ses) : '') +
    '<div class="card">' + blocksHTML(ses.details, ds) + '</div>';
  if (ds === t && !wl && load !== 'Rest' && !sesParts(ses)) h += '<div class="v2sticky"><button class="v2btn" data-act="v2live" style="flex:1">Start session</button><button class="v2btn2" data-act="wdone">Did it already</button></div>';
  return v2page('', back, h);
}

/* ---------- Fuel ---------- */
function viewFuel2() {
  if (S.sub === 'foodmore') return v2page('', 'Fuel', viewMeals());
  const ds = todayStr(), p = dayPlan(ds), ses = sessionFor(ds);
  let h = v2head(shortDate(ds) + (p ? ' · ' + dayTypeName(p.daytype) : ''), 'Fuel', false);
  if (!p || !mealsFor(p.daytype).length) return h + '<div class="v2card">' + GILL.plate + '<p class="v2mut">' + (!(D().meals || []).length ? 'No meal plan yet. Add your meals to the Meals tab of your Google Sheet, then tap Reload from sheet in Settings and more.' : 'No meals planned for today. You can still log food.') + '</p><button class="v2btn2 wide" data-act="mextra">Add food</button></div>';
  const F = v2fuel(ds, p), tg = targetFor(p.daytype), kT = Number(tg.kcal) || 0, pT = proteinTarget(tg), nowI = F.V.findIndex((x) => x.st === 'todo'), est = F.V.some((x) => x.m.protEst), planK = F.V.reduce((a, x) => a + (Number(x.m.kcal) || 0), 0);
  h += '<section class="v2card v2macro"><div class="v2mac">' + gdonut(F.kcal / (kT || 1), 'var(--v2vio)', 64, 'Calories ' + F.kcal + ' of ' + kT) + '<div><span class="v2lbl">Calories</span><b class="v2num">' + F.kcal.toLocaleString('en') + '</b><span class="v2mut">of ' + kT.toLocaleString('en') + '</span></div></div>' +
    '<div class="v2mac">' + gdonut(F.prot / (pT || 1), 'var(--v2ok)', 64, 'Protein ' + F.prot + ' of ' + pT + ' grams') + '<div><span class="v2lbl">Protein</span><b class="v2num">' + (est ? '≈' : '') + F.prot + ' g</b><span class="v2mut">of ' + pT + ' g</span></div></div>' +
    '<p class="v2mut v2span">Carbs ' + esc(tg.carbs || '–') + ' g · fat ' + esc(tg.fat || '–') + ' g today' + (est ? ' · protein estimated from what each meal contains' : '') + '</p>' + (kT && planK < kT - 150 ? '<p class="v2mut v2span">Your planned meals add up to ' + planK.toLocaleString('en') + ' kcal, ' + (kT - planK).toLocaleString('en') + ' under today\'s target.</p>' : '') + '</section>';
  h += '<section class="v2card v2list"><div class="v2hd"><span class="v2lbl">Today</span><span class="v2mut">' + (D().cfg.auto_meals === 'off' ? 'Tap a meal to log it' : 'Counted as planned unless you change it') + '</span></div>' +
    F.V.map((x, i) => {
      const st = x.st, mark = st === 'ate' || st === 'auto' ? '✓' : st === 'skipped' ? '✕' : st === 'swap' ? '↺' : '';
      return '<button class="v2meal' + (i === nowI ? ' now' : '') + (st !== 'todo' ? ' past' : '') + '" data-act="msheet" data-slot="' + esc(x.m.slot) + '">' + gtile(mealKind(x.m), st === 'todo' ? (i === nowI ? 'vio' : 'mut') : st === 'skipped' ? 'bad' : 'ok') + '<span class="v2li-t"><span class="v2time2">' + esc(x.m.time) + '</span><b>' + esc(x.m.name) + (i === nowI ? ' · now' : '') + '</b><span>' + esc(x.m.items) + (Number(x.m.kcal) ? ' · ' + esc(x.m.kcal) + ' kcal' : '') + (st === 'auto' ? ' · counted' : '') + '</span>' +
        (x.m.supps ? '<span class="v2supps">' + String(x.m.supps).split(/\s*[,+]\s*/).filter(Boolean).map((s) => '<i>' + esc(s.replace(/\s+\d.*$/, '')) + '</i>').join('') + '</span>' : '') + '</span><span class="v2li-e">' + mark + '</span></button>';
    }).join('') + '<div class="v2row2"><button class="v2btn2 sm" data-act="mextra">+ Snack or extra</button><button class="v2btn2 sm" data-act="eatout">Eating out?</button></div></section>';
  const W = waterInfo(ds);
  h += '<section class="v2card v2flat">' + gbottle(W.ml / (W.tgt || 1), 'Water ' + wFmt(W.ml) + ' of ' + wFmt(W.tgt)) + '<div class="v2grow"><span class="v2lbl">Water</span><b>' + esc(wFmt(W.ml)) + ' of ' + esc(wFmt(W.tgt)) + '</b>' + (W.heat ? '<span class="v2mut">Raised for the heat</span>' : '') + '</div><button class="v2btn2 sm" data-act="wminus" aria-label="Remove a bottle">−</button><button class="v2btn2 sm" data-act="wplus">+ ' + esc(wFmt(W.bot, undefined, 2)) + '</button></section>';
  h += travelMealsCard() + fastCard() + proteinFixCard() + stockCard();
  h += '<button class="v2card v2flat v2cta" data-act="v2go" data-sub="foodmore">' + gtile('cart', 'ok') + '<span class="v2grow"><b>Shopping list and food tools</b><span class="v2mut">Weekly list, swaps, supplements, eating out</span></span><span class="v2li-e">›</span></button>';
  return h;
}

/* ---------- You ---------- */
function v2consistency(days) {
  const t = todayStr(), out = []; let ok = 0, tot = 0;
  for (let i = days - 1; i >= 0; i--) {
    const ds = dateAdd(t, -i), s = sessionFor0(ds), wl = logs('WorkoutLog', ds).concat((H().workouts || []).filter((w) => w.date === ds)), ov = (D().overrides || []).find((o) => o.date === ds);
    let k;
    if (!s) k = 'off';
    else if (ov && /^(break|rest day|sick)/.test(ov.reason || '')) k = 'br';
    else if (s.p.load === 'Rest') k = 'off';
    else if (wl.some((w) => w.status === 'done')) k = 'd';
    else if (ds === t) k = 'n';
    else k = 'm';
    if (k !== 'n') { tot++; if (k !== 'm') ok++; }
    out.push([ds, k]);
  }
  return { pct: tot ? Math.round(100 * ok / tot) : 0, days: out };
}
function v2readinessBars() {
  const t = todayStr(), B = [];
  for (let i = 13; i >= 0; i--) { const ds = dateAdd(t, -i), R = readiness(ds); B.push(R ? [R.score, R.color] : [0, 'var(--v2line)']); }
  const vals = B.filter((b) => b[0]).map((b) => b[0]), avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  return '<section class="v2card"><div class="v2hd"><span class="v2lbl">Readiness · 14 days</span><span class="v2mut">' + (avg == null ? 'no data yet' : 'avg ' + avg) + '</span></div><div class="v2bars" role="img" aria-label="Readiness for the last 14 days' + (avg == null ? '' : ', average ' + avg) + '">' + B.map((b) => '<i style="height:' + Math.max(4, b[0]) + '%;background:' + b[1] + '"></i>').join('') + '</div></section>';
}
function viewYou2() {
  const sub = S.sub;
  if (sub === 'insights') return v2page('', 'You', viewInsights());
  if (sub === 'training') { S.insTab = 'training'; return v2page('', 'You', viewInsights()); }
  if (sub === 'oldmore') return v2page('more', 'Settings and more', viewMore());
  if (sub === 'more') return v2page('', 'You', v2more());
  if (sub === 'extras') return v2page('', 'You', v2extras());
  if (sub === 'skills') return v2page('extras', 'Extras', '<h1 class="v2h1">Skills</h1>' + skillsCard() + shoesCard());
  if (sub === 'profile') return v2page('', 'You', v2profile());
  if (sub === 'review') return v2page('', 'You', v2review());
  if (sub === 'body') return v2page('', 'You', v2body());
  if (sub === 'health') return v2page('', 'You', v2health());
  if (sub === 'season') return v2page('', 'You', v2season());
  if (sub === 'shortcuts') return v2page('more', 'Settings and more', v2shortcuts());
  if (sub === 'consistency') return v2page('', 'You', v2consPage());
  const ev = nextRace(), C = v2consistency(28), pr = prRows().slice(0, 3);
  let h = v2head('Progress and settings', 'You', false);
  if (ev) h += '<section class="v2card v2prop v2race-card">' + gtile('flag', 'warm') + '<span class="v2lbl">' + esc(ev.name) + ' · ' + daysBetween(todayStr(), ev.date) + ' days</span>' + (ev.goal ? '<b class="v2num">goal ' + esc(ev.goal) + '</b>' : '') + '<button class="v2link" data-act="gcopen">Is my goal realistic? ›</button></section>';
  h += v2readinessBars();
  if (pr.length) h += '<section class="v2card v2grid3">' + pr.map((r) => '<button class="v2stat" data-act="prsheet" data-n="' + esc(r.name) + '">' + gi('trophy', 'gtr') + '<span class="v2lbl">' + esc(r.name) + '</span><b>' + esc(prShow(r.best ? r.best.value : r.value, r.unit || (r.best && r.best.unit))) + '</b></button>').join('') + '</section>';
  h += '<button class="v2card v2flat v2cta" data-act="v2go" data-sub="consistency">' + gdonut(C.pct / 100, 'var(--v2vio)', 56, 'Consistency ' + C.pct + ' percent') + '<span class="v2grow"><span class="v2lbl">Consistency · 4 weeks</span><b class="v2num">' + C.pct + '%</b><span class="v2mut">Planned rest and breaks count as done</span></span><span class="v2li-e">›</span></button>';
  const L = [['How Apex sees you', 'Patterns from your training, food, sleep and choices', 'profile', 'face', 'vio'], ['Weekly review', 'Your week, next week\'s proposals, share as PDF', 'review', 'cal', 'blue'], ['Training and runs', 'Load, fatigue check, runs, records', 'training', 'run', 'blue'], ['Health watch', 'Early illness warning and how to stay healthy', 'health', 'heart', 'bad'], ['Body', 'Weight, waist, weight plan, photos', 'body', 'scale', 'ok'], ['All insights', 'Recovery charts, what works for you', 'insights', 'chart', 'vio'], ['Season planner', 'Blocks between your races', 'season', 'route', 'warm'], ['Extras', 'Timer, PR planner, skills and more tools', 'extras', 'tools', 'vio'], ['Settings and more', 'Connections, races, supplements, coach, preferences', 'more', 'gear', 'mut']];
  h += '<section class="v2card v2list">' + L.map(([t, s, sub, ic, tone]) => v2row('v2go', t, s, '', ' data-sub="' + sub + '"', ic, tone)).join('') + '</section>';
  return h;
}
function v2consPage() {
  const C = v2consistency(28), lab = { d: '✓', br: 'br', off: 'off', m: '✕', n: '·' };
  return '<h1 class="v2h1">Consistency</h1><section class="v2card v2flat"><div style="color:var(--v2tx)">' + v2ring(C.pct, 'var(--v2vio)') + '</div><div class="v2grow"><span class="v2lbl">Last 4 weeks</span><b>You follow the plan, rest included</b><span class="v2mut">Planned rest, breaks and sick days never lower the score.</span></div></section>' +
    '<section class="v2card"><div class="v2cal" role="img" aria-label="Last 28 days">' + C.days.map(([ds, k]) => '<span class="c-' + k + '" title="' + esc(niceDate(ds)) + '">' + lab[k] + '</span>').join('') + '</div><p class="v2mut">✓ done · off / br planned rest · ✕ missed</p></section>' + consistencyCard();
}
function v2profile() {
  let P = []; try { P = patterns(); } catch (e) { P = []; }
  const said = (txt) => (D().decisions || []).find((x) => x.kind === 'pattern' && x.what === txt.replace(/<[^>]+>/g, '').slice(0, 120));
  return '<h1 class="v2h1">How Apex sees you</h1><p class="v2mut">Learned from your training, food, sleep and choices. The coach and every new program use this. Wrong? Tell me.</p>' +
    (P.length ? P.slice(0, 8).map((p) => { const conf = Math.max(1, Math.min(4, Math.round((p.w || 0.4) * 4))), plain = p.t.replace(/<[^>]+>/g, ''), s = said(p.t); return '<section class="v2card"><div class="v2hd"><span class="v2lbl">Pattern</span><span class="v2conf" role="img" aria-label="How sure: ' + conf + ' of 4">' + [1, 2, 3, 4].map((i) => '<i class="' + (i <= conf ? 'f' : '') + '"></i>').join('') + '</span></div><p class="v2small">' + p.t + '</p>' + (p.fix ? '<p class="v2mut">' + esc(p.fix) + '</p>' : '') +
      (s ? '<p class="v2mut">You said: ' + (s.choice === 'accepted' ? 'that\'s right' : 'not really') + '</p>' : '<div class="v2row2"><button class="v2btn2 sm" data-act="v2pat" data-t="' + esc(plain.slice(0, 120)) + '" data-v="accepted">That\'s right</button><button class="v2btn2 sm" data-act="v2pat" data-t="' + esc(plain.slice(0, 120)) + '" data-v="rejected">Not really</button></div>') + '</section>'; }).join('')
      : '<div class="v2card"><p class="v2mut">Still learning. Patterns appear after about 2 weeks of logs and WHOOP data.</p></div>') +
    whatWorksCard() + choicesCard();
}
function v2review() {
  return '<h1 class="v2h1">Weekly review</h1>' + (wrDue() ? '<button class="v2btn wide" data-act="wropen">Answer 3 questions, then I tune next week</button>' : '') + (weeklyCard(false) || '<div class="v2card"><p class="v2mut">Your review is written every Thursday from 18:00, after you answer 3 quick questions.</p></div>') +
    realityCard() + '<button class="v2btn2 wide" data-act="v2pdf">Share this week as a PDF</button><p class="v2mut">For a coach or physio. Sent from your phone\'s share sheet, never by Apex.</p>';
}
function v2body() {
  const last = D().logs.Body.slice(-1)[0];
  return '<h1 class="v2h1">Body</h1><section class="v2card v2flat"><div class="v2grow"><span class="v2lbl">Latest</span><b class="v2num">' + (last ? esc(last.weight) + ' kg' : 'Not logged yet') + '</b><span class="v2mut">' + (last ? esc(niceDate(last.date)) + (last.waist ? ' · waist ' + esc(last.waist) + ' cm' : '') : 'Saturday mornings, before breakfast') + '</span></div><button class="v2btn" data-act="body">Log</button></section>' +
    cutCard() + '<button class="v2btn2 wide" data-act="cutopen">Weight plan</button>' + photosSection();
}
function v2more() {
  const d = d0(), c = d.cfg, ev = (D().events || []).filter((e) => e.date && e.date >= todayStr()), stk = (D().stock || []).length;
  const tog = (k, t, s) => '<button class="v2li" data-act="v2tog" data-k="' + k + '" role="switch" aria-checked="' + (c[k] !== 'off') + '">' + (V2ROWIC[t] ? gtile(V2ROWIC[t][0], V2ROWIC[t][1]) : '') + '<span class="v2li-t"><b>' + t + '</b><span>' + s + '</span></span><span class="v2sw' + (c[k] !== 'off' ? ' on' : '') + '" aria-hidden="true"><i></i></span></button>';
  return '<h1 class="v2h1">Settings and more</h1>' +
    '<p class="v2lbl">Connections</p><section class="v2card v2list">' + v2row('cw', 'WHOOP', d.connected.whoop ? 'Connected' : 'Not connected', d.connected.whoop ? '✓' : 'Connect') + v2row('cs', 'Strava', d.connected.strava ? 'Connected' : 'Not connected', d.connected.strava ? '✓' : 'Connect') + v2row('v2calhelp', 'Google Calendar', D().calOk ? 'Reads busy times to place sessions' : 'Not reading your calendar yet', D().calOk ? '✓' : '›') + v2row('sync', 'Sync now', 'Pull WHOOP and Strava') + v2row('reload', 'Reload from sheet', 'After you edit your Google Sheet') + '</section>' +
    '<p class="v2lbl">Automation</p><section class="v2card v2list">' + tog('auto_meals', 'Count meals as eaten', 'Change only what was different') + tog('auto_workouts', 'Log workouts from Strava', 'You only rate how hard') + tog('rem_wrap', 'Evening wrap-up reminder', '21:00 in your Apex calendar') + '<div class="v2li"><span class="v2li-t"><b>Plan changes</b><span>Always ask me first</span></span><span class="v2li-e">Locked</span></div></section>' +
    '<p class="v2lbl">My data</p><section class="v2card v2list">' + v2row('evsheet', 'Races and events', ev.length ? ev.map((e) => e.name).slice(0, 2).join(' · ') : 'Add your next race') + v2row('v2go', 'Body and weight', 'Weight, waist, plan, photos', '', ' data-sub="body"') + v2row('stockedit', 'Supplement stock', stk ? stk + ' tracked' : 'Count what you have') + v2row('docsheet', 'Program documents', (D().docs || []).length + ' files') + v2row('rlopen', 'Saved reels', 'Your analysed reels') + v2row('inspsheet', 'Reels and TikToks', (D().library || []).length + ' links') + v2row('intsheet', 'Sports I\'m into', 'Climbing, BJJ…') + v2row('setstart', 'Program start', c.program_start ? niceDate(c.program_start) : 'Not set') + '</section>' +
    '<p class="v2lbl">Coach</p><section class="v2card v2list">' + v2row('knowopen', 'About me', 'Profile and notes the coach reads') + v2row('memopen', 'What the coach remembers', (D().memory || []).length + ' things') + v2row('shareopen', 'Share my week', c.share_token ? 'Link is on' : 'Read-only link for a friend or coach') + '</section>' +
    '<p class="v2lbl">Preferences</p><section class="v2card v2list">' + v2row('remopen', 'Reminders', 'Meals, workout, water, bedtime') + v2row('v2go', 'Siri and Shortcuts', 'Log without opening Apex', '', ' data-sub="shortcuts"') + v2row('ramopen', 'Ramadan mode', ramadan() ? 'On' : 'Off') + v2row('fastopen', 'Fasting', fasting() ? 'On' : 'Off') + v2row('setwater', 'Water', esc(wFmt(waterInfo(todayStr()).tgt)) + ' a day') + v2row('settz', 'Time zone', esc(c.timezone || 'Africa/Cairo')) + v2row('v2geo', 'Home city for weather', c.home_geo ? 'Set' : 'Cairo') + '</section>' +
    '<p class="v2lbl">Everything else</p><section class="v2card v2list">' + v2row('v2go', 'All settings and tools', 'The full list from the classic More screen', '', ' data-sub="oldmore"') + v2row('v2classic', 'Classic layout', 'Switch back to the old 5-tab Apex') + '</section>';
}
function v2extras() {
  const T = [['itopen', 'Interval timer', 'EMOM, Tabata, AMRAP', '', 'timer', 'warm'], ['libopen', 'Exercise library', 'History and bests', '', 'book', 'vio'], ['rwopen', 'Run workouts', 'Tempo and intervals at your paces', '', 'run', 'blue'], ['hyopen', 'HYROX stations', 'Find your slowest part', '', 'flame', 'warm'], ['prpopen', 'PR planner', 'Peak for a lift or run', '', 'trophy', 'warm'], ['v2go', 'Skills', 'Muscle-up, handstand…', 'skills', 'pull', 'vio'], ['campopen', 'MMA camp', 'Rounds, techniques, knocks', '', 'glove', 'bad'], ['sportlog', 'Sport session', 'Sparring, BJJ, climbing', '', 'glove', 'bad'], ['injopen', 'Injury mode', 'Swap exercises that hurt', '', 'heart', 'bad'], ['tropen', 'Travel mode', 'Hotel and no-gym sessions', '', 'route', 'blue'], ['gcopen', 'Goal check', 'Is it realistic?', '', 'flag', 'ok'], ['wiopen', 'What if…', 'Sleep more, run more', '', 'spark', 'vio'], ['stackopen', 'Habit stacks', 'Tie a habit to a routine', '', 'check', 'ok'], ['shoeopen', 'Running shoes', 'km per pair', '', 'shoe', 'blue'], ['mobopen', 'Mobility tests', 'Track your range', '', 'stretch', 'ok'], ['pwopen', 'Plan your week', 'Move sessions around your week', '', 'cal', 'vio']];
  return '<h1 class="v2h1">Extras</h1><p class="v2mut">Tools you open less often. Many also appear by themselves where they fit.</p><div class="v2tools">' + T.map(([a, t, s, sub, ic, tone]) => '<button class="v2tool" data-act="' + a + '"' + (a === 'itopen' ? ' data-m="emom"' : '') + (sub ? ' data-sub="' + sub + '"' : '') + '>' + gtile(ic, tone) + '<b>' + t + '</b><span>' + s + '</span></button>').join('') + '</div>';
}
function v2shortcuts() {
  const u = S.url || '', mk = (body) => JSON.stringify(Object.assign({ token: '•••' }, body));
  const L = [['Add a bottle', 'Hey Siri, Apex bottle', { action: 'log', table: 'WaterLog', row: { date: 'Current Date (yyyy-MM-dd)', ml: '+750' } }, 'Uses the water you already logged: set "ml" to your new total, or use the "Add a bottle" Shortcut steps below.'],
    ['Log a sport session', 'Hey Siri, log BJJ 60 minutes', { action: 'log', table: 'SportLog', row: { id: 'any unique text', date: 'Current Date', type: 'BJJ', minutes: '60', rpe: '7' } }, ''],
    ['How do I feel', 'Hey Siri, Apex tired', { action: 'log', table: 'Checkin', row: { date: 'Current Date', feel: 'tired' } }, 'fresh, ok or tired']];
  return '<h1 class="v2h1">Siri and Shortcuts</h1><p class="v2mut">iPhone Shortcuts can send to your Apps Script like the app does. Make each one once in Apple\'s Shortcuts app: Add action › "Get contents of URL", method POST, body JSON, then give it a Siri phrase.</p>' +
    '<section class="v2card"><span class="v2lbl">URL for every shortcut</span><p class="v2small v2mono">' + esc(u || 'Your Apps Script URL') + '</p><button class="v2btn2 sm" data-act="v2copy" data-v="url">Copy URL</button><button class="v2btn2 sm" data-act="v2copy" data-v="token">Copy token</button></section>' +
    L.map(([t, say, body, note]) => '<section class="v2card"><b>' + t + '</b><p class="v2mut"><i>"' + esc(say) + '"</i></p><p class="v2small v2mono">' + esc(mk(body)) + '</p>' + (note ? '<p class="v2mut">' + esc(note) + '</p>' : '') + '</section>').join('') +
    '<p class="v2mut">Plan changes (rest today, I\'m ill) still happen in Apex, where you see what changes before you accept.</p>';
}

/* ---------- Season planner ---------- */
function v2seasonBlocks() {
  const t = todayStr(), ev = (D().events || []).filter((e) => e.date && e.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1)), c = D().cfg, out = [];
  const st = c.program_start, N = planWeeks();
  if (st && D().plan.length) { const end = dateAdd(st, N * 7 - 1); out.push({ k: 'cur', name: c.program_name || 'Current block', from: st, to: end, note: t < st ? 'starts in ' + daysBetween(t, st) + (daysBetween(t, st) === 1 ? ' day' : ' days') : t > end ? 'finished' : 'running now' }); }
  const curEnd = out.length ? out[0].to : null;
  let cur = out.length ? dateAdd(out[0].to, 1) : t;
  ev.forEach((e, i) => {
    out.push({ k: 'race', name: e.name, date: e.date, goal: e.goal });
    const after = dateAdd(e.date, 1), next = ev[i + 1];
    // a race inside the current block: that block already holds the recovery days, so only the rest of the 2 weeks is added
    const recFrom = curEnd && curEnd >= after ? dateAdd(curEnd, 1) : after, recTo = dateAdd(after, 13);
    if (daysBetween(recFrom, recTo) >= 6) out.push({ k: 'rec', name: 'Recovery', from: recFrom, to: recTo, note: 'easy runs, mobility, gym at 70%' });
    if (next) {
      const wks = Math.floor(daysBetween(recTo > (curEnd || '') ? dateAdd(recTo, 1) : dateAdd(curEnd, 1), next.date) / 7);
      if (wks >= 3) {
        const taper = wks >= 8 ? 2 : 1, base = Math.max(0, Math.round((wks - taper) / 3)), build = wks - taper - base, s0 = recTo > (curEnd || '') ? dateAdd(recTo, 1) : dateAdd(curEnd, 1);
        if (base) out.push({ k: 'base', name: 'Strength base', from: s0, to: dateAdd(s0, base * 7 - 1), note: 'heavy legs and pulling, short runs' });
        const s1 = dateAdd(s0, base * 7); out.push({ k: 'build', name: /hyrox/i.test(next.name) ? 'HYROX build' : 'Build', from: s1, to: dateAdd(s1, build * 7 - 1), note: /hyrox/i.test(next.name) ? 'stations, compromised running, sleds' : 'race-specific work' });
        const s2 = dateAdd(s1, build * 7); out.push({ k: 'taper', name: 'Taper', from: s2, to: dateAdd(next.date, -1), note: 'volume down, race pace sharp' });
      }
    }
    cur = after;
  });
  return { blocks: out, undated: (D().events || []).filter((e) => !e.date) };
}
function v2season() {
  const B = v2seasonBlocks(), saved = D().cfg.season;
  return '<h1 class="v2h1">Your season</h1><p class="v2mut">Blocks between your races, proposed by Apex. Nothing starts until you approve it. When a block starts you build it with Create new program.</p><section class="v2card v2list">' +
    (B.blocks.length ? B.blocks.map((b) => b.k === 'race' ? '<div class="v2race"><b class="v2num">' + esc(niceDate(b.date)) + '</b><span class="v2li-t"><b>' + esc(b.name) + '</b><span>' + (b.goal ? 'goal ' + esc(b.goal) : 'no goal set') + '</span></span></div>'
      : '<div class="v2li"><i class="v2blk b-' + b.k + '"></i><span class="v2li-t"><b>' + esc(b.name) + '</b><span>' + esc(niceDate(b.from)) + ' – ' + esc(niceDate(b.to)) + ' · ' + esc(b.note) + '</span></span><span class="v2li-e">' + Math.max(1, Math.round((daysBetween(b.from, b.to) + 1) / 7)) + ' wk</span></div>').join('') : '<p class="v2mut">Add a race with a date in Settings and more › Races and events.</p>') +
    B.undated.map((e) => '<div class="v2race dash"><b class="v2num">?</b><span class="v2li-t"><b>' + esc(e.name) + '</b><span>No date yet. Add it and the blocks fill in.</span></span></div>').join('') + '</section>' +
    (B.blocks.length > 1 ? '<div class="v2row2"><button class="v2btn" data-act="v2seasonok" style="flex:1">' + (saved ? 'Approve again' : 'Approve the plan') + '</button><button class="v2btn2" data-act="evsheet">Change races</button></div>' + (saved ? '<p class="v2mut">Approved ' + esc((JSON.parse(saved || '{}').at || '').slice(0, 10)) + '.</p>' : '') : '');
}

/* ---------- best time to train ---------- */
function timeBody() {
  const ds = todayStr(), ses = sessionFor(ds), mins = (() => { try { return estMin(parseSession(ses.details).filter((b) => !b.skip)) || 45; } catch (e) { return 45; } })();
  const busy = (D().calendar || []).filter((e) => e.date === ds).map((e) => [v2hm(e.start), v2hm(e.end), e.title]);
  const meals = mealsFor((dayPlan(ds) || {}).daytype).map((m) => v2hm(m.time)).filter((x) => x != null);
  const free = (a) => busy.every(([s, e]) => a + mins <= s || a >= e) && v2hm(nowTime()) <= a;
  const C = []; [360, 420, 480, 1020, 1080, 1140].forEach((a) => { if (free(a) && !meals.some((m) => Math.abs(m - a) < 30)) C.push(a); });
  const hh = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const pick = S.tp || (C[0] != null ? hh(C[0]) : '');
  return '<p class="v2mut">' + esc(ses.name) + ', about ' + mins + ' min. From your calendar and when you train best.</p><section class="v2card v2list flat">' + (busy.length ? busy.map(([s, e, tt]) => '<div class="v2li"><b class="v2time">' + hh(s) + '</b><span class="v2li-t"><b>' + esc(tt || 'Busy') + '</b><span>until ' + hh(e) + '</span></span></div>').join('') : '<p class="v2mut">Nothing in your calendar today.</p>') + '</section>' +
    '<p class="v2lbl">Free times</p><div class="v2chips">' + (C.length ? C.map((a) => '<button class="v2chip' + (pick === hh(a) ? ' on' : '') + '" aria-pressed="' + (pick === hh(a)) + '" data-act="v2tp" data-v="' + hh(a) + '">' + hh(a) + (a < 600 ? ' · morning' : '') + '</button>').join('') : '<span class="v2mut">No free slot left today. Move it to another day instead.</span>') + '</div>' +
    '<button class="v2btn wide" data-act="v2tpgo"' + (pick ? '' : ' disabled') + '>Train at ' + esc(pick || '…') + '</button><button class="v2btn2 wide" data-act="v2change">Another day</button>';
}

/* ---------- heat ---------- */
function v2geo() { try { const g = JSON.parse(D().cfg.home_geo || ''); if (g && isFinite(g.lat) && isFinite(g.lon)) return g; } catch (e) { /* default */ } return { lat: 30.04, lon: 31.24, name: 'Cairo' }; }
function v2wx() { try { const w = JSON.parse(LS.getItem('wx') || 'null'); return w && w.day === todayStr() ? w : null; } catch (e) { return null; } }
function v2wxLoad() {
  if (v2wx() || S._wxBusy || !navigator.onLine) return; S._wxBusy = true; const g = v2geo();
  fetch('https://api.open-meteo.com/v1/forecast?latitude=' + g.lat + '&longitude=' + g.lon + '&daily=temperature_2m_max,temperature_2m_min&hourly=temperature_2m&forecast_days=2&timezone=auto')
    .then((r) => r.json()).then((j) => { const w = { day: todayStr(), max: j.daily.temperature_2m_max, min: j.daily.temperature_2m_min, h6: j.hourly.temperature_2m[6], name: g.name || '' }; LS.setItem('wx', JSON.stringify(w)); S._wxBusy = false; if (w.max[0] >= 32 && S.tab === 'today') render(); })
    .catch(() => { S._wxBusy = false; });
}
function v2heatCard(ds) {
  v2wxLoad(); const w = v2wx(); if (!w || ds !== todayStr() || !(w.max[0] >= 32)) return '';
  const W = waterInfo(ds), ses = sessionFor(ds), run = ses && /run|km/i.test(ses.name);
  return '<section class="v2card v2heat"><span class="v2ic">' + V2I.sun + '</span><div class="v2grow"><span class="v2lbl">Hot day · ' + esc(w.name || 'home') + '</span><b>' + Math.round(w.h6) + '°C at 06:00, ' + Math.round(w.max[0]) + '°C max</b><span class="v2mut">Water raised to ' + esc(wFmt(W.tgt)) + ' with a pinch of salt' + (run ? '. Easy runs about 15 s/km slower, judge by heart rate.' : '.') + '</span></div></section>';
}

/* ---------- weekly PDF ---------- */
function v2weekHTML() {
  const t = todayStr(), st = weekStart(t), name = D().cfg.name || 'Athlete'; let rows = '';
  for (let i = 0; i < 7; i++) {
    const ds = dateAdd(st, i), s = sessionFor0(ds), wl = logs('WorkoutLog', ds).concat((H().workouts || []).filter((w) => w.date === ds))[0], R = readiness(ds);
    rows += '<tr><td>' + esc(dow(ds)) + ' ' + Number(ds.slice(8)) + '</td><td>' + esc(s ? s.p.session : 'Rest') + '</td><td>' + esc(wl ? wl.status + (wl.rpe ? ' · RPE ' + wl.rpe : '') : ds > t ? 'planned' : '–') + '</td><td>' + (R ? R.score : '–') + '</td></tr>';
  }
  const sore = (D().soreness || []).filter((x) => x.date >= st).map((x) => x.area + ' (' + x.date.slice(5) + ')').join(', ');
  return '<html><body style="font-family:Arial,sans-serif;color:#17171D;padding:24px"><h2 style="margin:0 0 4px">' + esc(name) + ' · week of ' + esc(niceDate(st)) + '</h2><p style="color:#555;margin:0 0 16px">From Apex</p><table style="width:100%;border-collapse:collapse;font-size:12px" border="1" cellpadding="6"><tr style="background:#eee"><th>Day</th><th>Session</th><th>Done</th><th>Readiness</th></tr>' + rows + '</table>' +
    (sore ? '<p style="font-size:12px"><b>Sore:</b> ' + esc(sore) + '</p>' : '') + (activeInjuries().length ? '<p style="font-size:12px"><b>Injuries:</b> ' + esc(activeInjuries().map((i) => i.area + (i.note ? ' (' + i.note + ')' : '')).join(', ')) + '</p>' : '') + '</body></html>';
}

/* ---------- actions ---------- */
COACH_KEEP.push('v2tp', 'v2copy');
Object.assign(COACH_ACTS, {
  v2wk: (el) => { const v = Number(el.dataset.v); S.v2wk = v === 0 ? 0 : (S.v2wk || 0) + v; render(); },
  v2tog: (el) => { const k = el.dataset.k, on = D().cfg[k] !== 'off'; setCfg(k, on ? 'off' : 'on'); render(); },
  v2pat: (el) => { decide('pattern', el.dataset.t, el.dataset.v, ''); toast(el.dataset.v === 'accepted' ? 'Thanks, noted.' : 'Got it, I\'ll stop assuming that.'); render(); },
  v2time: () => { S.tp = ''; infoSheet('When to train today', timeBody(), 'tp'); },
  v2tp: (el) => { S.tp = el.dataset.v; keepScroll('tp', timeBody()); },
  v2tpgo: () => { const ds = todayStr(), s0 = sessionFor0(ds); if (!s0 || !S.tp) return; send({ action: 'log', table: 'Overrides', row: { date: ds, session: s0.p.session, load: s0.p.load, time: S.tp, daytype: s0.p.daytype || (planFor(ds) || {}).daytype || 'sat', details: s0.p.details, reason: 'time change' } }); decide('time change', s0.p.session, 'accepted', S.tp); closeSheets(); toast('Training at ' + S.tp + ' today.'); },
  v2seasonok: () => { const B = v2seasonBlocks(); setCfg('season', JSON.stringify({ at: todayStr(), blocks: B.blocks.filter((b) => b.k !== 'race').map((b) => [b.name, b.from, b.to]) }).slice(0, 2000)); decide('season', B.blocks.filter((b) => b.k === 'race').map((b) => b.name).join(' → '), 'accepted', ''); toast('Season approved. Each block is built when it starts.'); render(); },
  v2calhelp: () => infoSheet('Google Calendar', '<p class="v2small">Apex reads only the start, end and title of today\'s and the next 7 days\' events from your main calendar, to place sessions around meetings. It never changes your events.</p><p class="v2small">After updating Apps Script (Part 21 in SETUP.md), run <b>authorizeCalendar</b> once from the editor and allow access. Then tap Sync.</p>', 'calh'),
  v2copy: (el) => { const v = el.dataset.v === 'url' ? S.url : S.token; try { navigator.clipboard.writeText(v || ''); toast('Copied'); } catch (e) { toast('Copy did not work on this phone'); } },
  v2geo: () => { if (!navigator.geolocation) { toast('Location is not available on this phone'); return; } navigator.geolocation.getCurrentPosition((p) => { setCfg('home_geo', JSON.stringify({ lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100, name: 'Home' })); LS.removeItem('wx'); toast('Home city set for the weather.'); }, () => toast('Location not allowed. Cairo stays the default.')); },
  v2classic: () => { if (!confirm('Switch to the classic 5-tab layout? You can switch back in More › 2.0 layout.')) return; LS.setItem('v2off', '1'); location.reload(); },
  v2new: () => { LS.removeItem('v2off'); location.reload(); },
  v2pdf: async () => {
    try {
      toast('Making the PDF…', 4000);
      const j = await call({ action: 'week_pdf', html: v2weekHTML() });
      const bin = atob(j.pdf), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const file = new File([u8], 'apex-week.pdf', { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'My training week' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = 'apex-week.pdf'; document.body.appendChild(a); a.click(); a.remove(); }
    } catch (e) { if (e && e.name !== 'AbortError') toast('Could not make the PDF: ' + (e.message || 'try again')); }
  }
});

/* heat raises today's water target */
const v2waterInfo0 = waterInfo;
waterInfo = function (ds) {
  const W = v2waterInfo0(ds); if (!V2ON || ds !== todayStr()) return W;
  const w = v2wx(); if (w && w.max[0] >= 32) { W.tgt = Math.round(W.tgt * (w.max[0] >= 36 ? 1.25 : 1.15) / 50) * 50; W.heat = true; }
  return W;
};

if (!V2ON) {
  const v2viewMore0 = viewMore;
  viewMore = function () { return '<button class="card" data-act="v2new" style="width:100%;text-align:left;border:0;font:inherit;color:inherit;cursor:pointer;min-height:56px"><b>Try Apex 2.0</b><p class="mut small" style="margin:4px 0 0">The new 4-tab layout. You can switch back any time.</p></button>' + v2viewMore0(); };
  VIEWS.more = viewMore;
}
if (V2ON) {
  VIEWS.train = viewPlan2;
  VIEWS.meals = viewFuel2;
  VIEWS.you = viewYou2;
  VIEWS.more = viewYou2; VIEWS.insights = viewYou2;
}
// app.js already painted once with the classic views: repaint with 2.0
if (V2ON) { if (S.data) normalize(S.data); render(); }

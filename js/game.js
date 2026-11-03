// Движок боя: симуляция, бот, раунды, онлайн и отрисовка
const GROUND = 160, MINX = 14, MAXX = 306, ROUND_T = 60 * 60;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const EMPTY = () => ({ l: 0, r: 0, u: 0, d: 0, p: 0, k: 0, s: 0, b: 0 });
const KEYS8 = ['l', 'r', 'u', 'd', 'p', 'k', 's', 'b'];
const encIn = I => KEYS8.reduce((v, k, i) => v | (I[k] ? 1 << i : 0), 0);
const decIn = v => Object.fromEntries(KEYS8.map((k, i) => [k, (v >> i) & 1]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let G = null;
let menuStage = 0;

function mkFighter(side, id) {
  const def = FIGHTER[id];
  return {
    side, id, def, x: side ? 212 : 108, y: GROUND, vx: 0, vy: 0, face: side ? -1 : 1,
    hp: def.hp, maxHp: def.hp, trail: def.hp, meter: 0, st: 'idle', t: 0,
    mv: null, mvId: null, mvT: 0, hitDone: [], landed: false, grabbed: false,
    stun: 0, flash: 0, inv: 0, downDur: 0, gkind: null, gt: 0, mash: 0,
    atkSeq: 0, inp: EMPTY(), prev: EMPTY(), crouchB: false, combo: 0, airUsed: false,
    dmgZ: { head: 0, body: 0, arm: 0, leg: 0 },
  };
}

function newMatch(o) {
  G = {
    mode: o.mode, stage: o.stage, diff: o.diff ?? 1,
    f: [mkFighter(0, o.p1), mkFighter(1, o.p2)],
    round: 1, wins: [0, 0], timer: ROUND_T, phase: 'intro', phaseT: 0, winner: -1,
    hitstop: 0, slow: 0, shake: 0, parts: [], fx: [], stains: [], remoteHeld: 0, remoteLatch: 0, frame: 0,
    ai: [makeAI(o.mode === 'demo' ? 1 : 0), makeAI(o.diff ?? 1)],
  };
  Sound.quiet = o.mode === 'demo';
  const buff = o.mode === 'bot' && AIP[G.diff] && AIP[G.diff].buff;
  if (buff) { G.f[1].maxHp = Math.round(G.f[1].def.hp * buff.hp); G.f[1].dmgMul = buff.dmg; }
  G.nicks = o.nicks || ['', ''];
  startRound();
  G.train = !!o.train; G.career = o.career || null;
  if (o.mode !== 'demo' && !o.train) {
    G.phase = 'walkout';
    G.f[0].x = -30; G.f[1].x = 350;
  }
}

function startRound() {
  G.f.forEach((f, i) => {
    Object.assign(f, {
      x: i ? 212 : 108, y: GROUND, vx: 0, vy: 0, face: i ? -1 : 1, hp: f.maxHp, trail: f.maxHp,
      st: 'idle', t: 0, mv: null, mvId: null, inv: 0, stun: 0, combo: 0, gkind: null, flash: 0,
    });
  });
  G.timer = ROUND_T; G.phase = 'intro'; G.phaseT = 0; G.winner = -1; G.clinch = null; G.closeT = 0;
}

// ---------- События (звук, искры, надписи) — на хосте ещё и уходят другу
function emit(e) {
  applyFx(e);
  if (G && G.mode === 'host') G.fx.push(e);
}
function applyFx(e) {
  if (!G) return;
  const demo = G.mode === 'demo';
  switch (e.k) {
    case 'sfx': Sound.sfx(e.n); break;
    case 'spark': spark(e.x, e.y, e.big, e.blk); break;
    case 'dust': dust(e.x); break;
    case 'heart': for (let i = 0; i < 3; i++) G.parts.push({ x: e.x, y: e.y, vx: e.d * (0.6 + Math.random() * 0.8), vy: -0.4 - Math.random() * 0.6, l: 50, c: ['#ff4f8b', '#ff7aa8', '#ff2e63'][i], heart: 1 }); break;
    case 'shake': G.shake = Math.max(G.shake, e.v); break;
    case 'msg': if (!demo) UI.banner(e.text, e.big); break;
    case 'sp': if (!demo) UI.special(e.side, e.text); break;
    case 'combo': if (!demo) UI.combo(e.side, e.n); break;
    case 'say': if (!demo) Sound.say(e.text); break;
    case 'music': if (!demo) Sound.music(e.n); break;
    case 'hush': Sound.hush(); break;
    case 'over': if (!demo) UI.matchOver(e.w, e.ko); else setTimeout(() => G && G.mode === 'demo' && startDemo(), 600); break;
  }
}

function spark(x, y, big, blk) {
  const cols = blk ? ['#e0f4ff', '#8fd0ff', '#4f9bff'] : ['#ffffff', '#ffe066', '#ff9a3c', '#ff5a2a'];
  const n = big ? 18 : 9;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, sp = (big ? 2.6 : 1.6) * (0.4 + Math.random());
    G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.4, l: 10 + Math.random() * 10 | 0, c: cols[Math.random() * cols.length | 0], g: 0.12 });
  }
  G.parts.push({ x, y, vx: 0, vy: 0, l: big ? 6 : 4, c: '#fff', star: big ? 7 : 4 });
}
function dust(x) {
  for (let i = 0; i < 8; i++) {
    G.parts.push({ x: x + (Math.random() - 0.5) * 16, y: GROUND - 1, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.6,
      l: 14 + Math.random() * 10 | 0, c: Math.random() < 0.5 ? '#9a8f88' : '#c8bdb4', g: 0.01 });
  }
}
function updateParts() {
  for (const p of G.parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.vx *= 0.95; p.l--;
    // капля упала на мат — остаётся пятно до конца боя
    if (p.drop && p.y >= GROUND + 1) {
      p.l = 0;
      if (G.stains.length > 160) G.stains.shift();
      G.stains.push({ x: Math.round(p.x), y: GROUND + 1 + (Math.random() * 7 | 0), w: 1 + (Math.random() * 3 | 0), c: Math.random() < 0.5 ? '#6a0a12' : '#8a1018' });
    }
  }
  G.parts = G.parts.filter(p => p.l > 0);
}

// ---------- Травмы: счёт ударов по зонам, сообщения и кровь
function injure(d, zone) {
  d.dmgZ[zone] = (d.dmgZ[zone] || 0) + 1;
  const n = d.dmgZ[zone];
  if (n === 7) emit({ k: 'msg', text: zone === 'head' ? 'РАССЕЧЕНИЕ!' : 'КРОВЬ!' });
  if (n === 15) emit({ k: 'msg', text: zone === 'head' ? 'ГЛАЗ ЗАПЛЫЛ!' : 'ПЕРЕЛОМ!' });
}
const BLEED_AT = 7;
function bleed() {
  for (const f of G.f) {
    for (const z of ['head', 'body', 'arm', 'leg']) {
      const n = f.dmgZ[z] || 0;
      if (n < BLEED_AT || Math.random() > 0.025 + Math.min(0.08, (n - BLEED_AT) * 0.008)) continue;
      const part = bodyParts(f).find(p => p.z === z);
      if (!part) continue;
      const t = Math.random(), x = part.a[0] + (part.b[0] - part.a[0]) * t, y = part.a[1] + (part.b[1] - part.a[1]) * t;
      G.parts.push({ x, y, vx: (Math.random() - 0.5) * 0.3, vy: 0.2, l: 200, c: BLOOD[Math.random() * 3 | 0], g: 0.12, drop: 1 });
    }
  }
}

// ---------- Ввод ударов
function pickMove(f, btn, fwd, down, back, near) {
  if (btn === 'p') {
    if (near && down && !fwd && !back) return 'shortUpper';
    if (down) return fwd ? 'bodyHook' : back ? 'bodyJab' : 'upper';
    if (back) return 'backfist';
    if (near && !fwd) return 'elbowS';
    return fwd ? 'cross' : 'jab';
  }
  if (near && down && !fwd && !back) return 'kneeBody';
  if (down) return fwd ? 'bodyKick' : back ? 'axeKick' : 'lowKick';
  if (back) return 'spinKick';
  if (near && !fwd) return 'kneeS';
  return fwd ? 'highKick' : 'teep';
}

// названия приёмов для тренировки
const MOVE_NAME = {
  jab: 'ДЖЕБ', cross: 'КРОСС', hookP: 'ХУК (ТРОЙКА)', upper: 'АПЕРКОТ', bodyHook: 'ХУК В ПЕЧЕНЬ', bodyJab: 'ДЖЕБ В КОРПУС',
  backfist: 'БЭКФИСТ', elbowS: 'ЛОКОТЬ', shortUpper: 'КОРОТКИЙ АПЕРКОТ', teep: 'ФРОНТ-КИК', highKick: 'ХАЙ-КИК', lowKick: 'ЛОУ-КИК',
  bodyKick: 'В КОРПУС НОГОЙ', axeKick: 'ТОПОР', spinKick: 'ВЕРТУХА', kneeS: 'КОЛЕНО', kneeBody: 'КОЛЕНО В КОРПУС',
  airPunch: 'РУКА В ПРЫЖКЕ', airKick: 'НОГА В ПРЫЖКЕ', hammerFist: 'МОЛОТ', stomp: 'ТОПЧУЩИЙ', flyingKick: 'ЛЕТЯЩИЙ УДАР',
  jumpKnee: 'КОЛЕНО В ПРЫЖКЕ', wallKick: 'УДАР ОТ СЕТКИ', flipKick: 'САЛЬТО', superman: 'СУПЕРМЕН', sweep: 'ПОДСЕЧКА',
  spinBackKick: 'УДАР НАЗАД С РАЗВОРОТА', counterHook: 'ВСТРЕЧНЫЙ ХУК', obliqueKick: 'ПО КОЛЕНУ', calfKick: 'ПО ИКРЕ',
  dashIn: 'РЫВОК', shootTD: 'ПРОХОД В НОГИ', hook: 'ХУК', overhand: 'ОВЕРХЕНД', doubleJab: 'ДВОЙНОЙ ДЖЕБ', oneTwo: 'ДВОЙКА',
};

// рука + нога вместе: сальто, а с направлением — супермен, подсечка или удар назад
const PK_MOVES = ['flipKick', 'superman', 'sweep', 'spinBackKick'];
const comboPK = (fwd, down, back) => (down ? 'sweep' : fwd ? 'superman' : back ? 'spinBackKick' : 'flipKick');

function setSt(f, s) { if (f.st !== s) { f.st = s; f.t = 0; } }

function startMove(f, id) {
  const m = MOVES[id];
  f.mv = m; f.mvId = id; f.mvT = 0; f.st = 'attack'; f.t = 0;
  f.hitDone = []; f.landed = false; f.grabbed = false; f.atkSeq++;
  if (G.train && f.side === 0) UI.special(0, MOVE_NAME[id] || id);
  if (m.cat === 's') {
    f.meter = 0;
    emit({ k: 'sp', side: f.side, text: f.def.spName });
    emit({ k: 'sfx', n: 'special' });
  } else emit({ k: 'sfx', n: m.whoosh || 'whoosh' });
}

const inLunge = f => f.mv && f.mv.lunge && f.mvT >= f.mv.lunge[0] && f.mvT <= f.mv.lunge[1];

function updFighter(f, o) {
  const I = f.inp, pr = k => I[k] && !f.prev[k];
  f.t++;
  if (!I.u) f.jumpLock = false; // чтобы прыгнуть снова, отпусти вверх
  if (f.flash > 0) f.flash--;
  if (f.inv > 0) f.inv--;
  const D = f.def, air = f.y < GROUND;
  const fwdOf = () => (f.face > 0 ? I.r : I.l);
  const backOf = () => (f.face > 0 ? I.l : I.r);

  if (['idle', 'walk', 'crouch', 'block'].includes(f.st)) {
    if (Math.abs(o.x - f.x) > 1) f.face = o.x > f.x ? 1 : -1;
    const fwd = fwdOf(), bk = backOf();
    const near = Math.abs(o.x - f.x) < 25 * D.scale;
    if (pr('s') && f.meter >= 100) startMove(f, D.special);
    else if ((pr('p') && I.k) || (pr('k') && I.p)) startMove(f, comboPK(fwd, I.d, bk));
    else if (I.b && (f.face > 0 ? pr('l') : pr('r'))) { setSt(f, 'slip'); emit({ k: 'sfx', n: 'whoosh' }); }
    else if (I.b && (f.face > 0 ? pr('r') : pr('l'))) startMove(f, 'dashIn');
    else if (I.b && I.d && pr('p')) startMove(f, 'shootTD');
    else if (I.b && pr('p')) startMove(f, 'counterHook');
    else if (I.b && pr('k')) startMove(f, I.d ? 'calfKick' : 'obliqueKick');
    else if (pr('p')) startMove(f, pickMove(f, 'p', fwd, I.d, bk, near));
    else if (pr('k')) startMove(f, pickMove(f, 'k', fwd, I.d, bk, near));
    else if (I.b) { setSt(f, 'block'); f.crouchB = !!I.d; }
    else if (pr('u') && !f.jumpLock) {
      f.st = 'jump'; f.t = 0; f.vy = -4.4; f.airUsed = false; f.jumpLock = true;
      f.vx = (fwd ? 1.7 : bk ? -1.5 : 0) * f.face;
      emit({ k: 'sfx', n: 'jump' });
    }
    else if (I.d) setSt(f, 'crouch');
    else if (fwd) { setSt(f, 'walk'); f.vx = 1.25 * D.walk * f.face; }
    else if (bk) { setSt(f, 'walk'); f.vx = -1.0 * D.walk * f.face; }
    else setSt(f, 'idle');
  } else if (f.st === 'jump') {
    // отпустил вверх сразу — короткий подскок
    if (!I.u && f.t < 7 && f.vy < -1.5) f.vy *= 0.6;
    if (!f.airUsed && (pr('p') || pr('k'))) {
      f.airUsed = true;
      const fw = fwdOf();
      const wall = f.x < MINX + 14 || f.x > MAXX - 14;
      if (pr('k') && wall) { f.face = o.x > f.x ? 1 : -1; f.vx = 0; startMove(f, 'wallKick'); }
      else if (pr('p')) startMove(f, I.d ? 'hammerFist' : fw ? 'jumpKnee' : 'airPunch');
      else if (pr('k')) startMove(f, I.d ? 'stomp' : fw ? 'flyingKick' : 'airKick');
    }
  } else if (f.st === 'attack') {
    const m = f.mv, t0 = f.mvT;
    f.mvT += D.spd;
    if (inLunge(f)) f.vx = m.lunge[2] * f.face;
    if (m.jump && t0 < m.jump[0] && f.mvT >= m.jump[0]) f.vy = m.jump[1];
    // рука и нога почти одновременно — сальто
    if (f.mvT < 6 && m.cat !== 's' && !m.air && !PK_MOVES.includes(f.mvId) && ((m.cat === 'p' && pr('k')) || (m.cat === 'k' && pr('p')))) startMove(f, comboPK(fwdOf(), I.d, backOf()));
    else if (m.chain && f.mvT >= m.chain.at && pr(m.chain.btn) && !I.d && !backOf()) startMove(f, m.chain.to);
    else if (f.landed && m.cancel && f.mvT >= m.cancel) {
      const fwd = fwdOf(), bk = backOf();
      if (pr('s') && f.meter >= 100) startMove(f, D.special);
      else if (pr('p')) startMove(f, pickMove(f, 'p', fwd, I.d, bk));
      else if (pr('k')) startMove(f, pickMove(f, 'k', fwd, I.d, bk));
    }
    if (f.st === 'attack' && f.mvT >= f.mv.len) {
      f.mv = null; f.mvId = null; f.airUsed = true;
      setSt(f, air ? 'jump' : 'idle');
    }
  } else if (f.st === 'slip') {
    if (f.t >= 16) setSt(f, 'idle');
  } else if (f.st === 'land') {
    if (f.t >= 9) setSt(f, 'idle');
  } else if (f.st === 'hit') {
    // под ударами можно сразу бить в ответ или закрыться — никакого «замка»
    const fwd = fwdOf(), bk = backOf(), near = Math.abs(o.x - f.x) < 25 * D.scale;
    if (f.t >= 2 && !air && pr('s') && f.meter >= 100) startMove(f, D.special);
    else if (f.t >= 2 && !air && (pr('p') || pr('k'))) startMove(f, pickMove(f, pr('p') ? 'p' : 'k', fwd, I.d, bk, near));
    else if (f.t >= 2 && !air && I.b) { setSt(f, 'block'); f.crouchB = !!I.d; f.stun = 0; }
    else if (--f.stun <= 0 && !air) setSt(f, 'idle');
  } else if (f.st === 'down') {
    if (f.t >= f.downDur) { setSt(f, 'idle'); f.inv = 30; }
  } else if (f.st === 'grab') {
    updGrab(f, o);
  } else if (f.st === 'held') {
    // нажатия друга по сети считаются отдельно (пачкой), здесь — только свои
    const remote = G.mode === 'host' && f.side === 1;
    if (!remote && (pr('p') || pr('k') || pr('s') || pr('b'))) f.mash++;
  } else if (f.st === 'clinch') {
    const remote = G.mode === 'host' && f.side === 1;
    if (G.clinch && !remote && (pr('p') || pr('k') || pr('s') || pr('b'))) G.clinch.n[f.side]++;
  }

  if (f.st !== 'held' && f.st !== 'grab' && f.st !== 'clinch') {
    if (f.y < GROUND || f.vy < 0) {
      f.vy += 0.25; f.y += f.vy;
      if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; land(f); }
    }
    f.x += f.vx;
    if (f.y >= GROUND && f.st !== 'walk' && !(f.st === 'attack' && inLunge(f))) f.vx *= 0.78;
    f.x = clamp(f.x, MINX, MAXX);
  }
}

function land(f) {
  if (f.st === 'jump') { setSt(f, 'land'); f.vx *= 0.3; emit({ k: 'dust', x: f.x }); emit({ k: 'sfx', n: 'land' }); }
  else if (f.st === 'attack' && f.mv.air) { f.mv = null; f.mvId = null; setSt(f, 'idle'); emit({ k: 'dust', x: f.x }); }
  else if (f.st === 'down' || f.st === 'ko') { emit({ k: 'dust', x: f.x }); emit({ k: 'shake', v: 2 }); }
}

// ---------- Попадания
const canBeHit = d => !['down', 'ko', 'held', 'grab', 'clinch'].includes(d.st) && d.inv <= 0;

// ---------- Хитбоксы по частям тела: капсулы по текущей позе
function segDist(p1, q1, p2, q2) {
  const d1 = [q1[0] - p1[0], q1[1] - p1[1]], d2 = [q2[0] - p2[0], q2[1] - p2[1]], r = [p1[0] - p2[0], p1[1] - p2[1]];
  const a = d1[0] * d1[0] + d1[1] * d1[1], e = d2[0] * d2[0] + d2[1] * d2[1], f = d2[0] * r[0] + d2[1] * r[1];
  let sN, tN;
  if (a < 1e-6 && e < 1e-6) return [Math.hypot(r[0], r[1]), p1];
  if (a < 1e-6) { sN = 0; tN = clamp(f / e, 0, 1); }
  else {
    const c = d1[0] * r[0] + d1[1] * r[1];
    if (e < 1e-6) { tN = 0; sN = clamp(-c / a, 0, 1); }
    else {
      const bb = d1[0] * d2[0] + d1[1] * d2[1], den = a * e - bb * bb;
      sN = den ? clamp((bb * f - c * e) / den, 0, 1) : 0;
      tN = (bb * sN + f) / e;
      if (tN < 0) { tN = 0; sN = clamp(-c / a, 0, 1); } else if (tN > 1) { tN = 1; sN = clamp((bb - c) / a, 0, 1); }
    }
  }
  const c1 = [p1[0] + d1[0] * sN, p1[1] + d1[1] * sN], c2 = [p2[0] + d2[0] * tN, p2[1] + d2[1] * tN];
  return [Math.hypot(c1[0] - c2[0], c1[1] - c2[1]), c1];
}

function bodyParts(d) {
  const pose = getPose(d), s = d.def.scale, bk = d.def.bulk, Y = d.y + poseExtra(d).dy;
  const W = n => jointWorld(d.def, pose, d.x, Y, d.face, n);
  const hip = W('hip'), neck = W('neck'), ux = neck[0] - hip[0], uy = neck[1] - hip[1], ul = Math.hypot(ux, uy) || 1;
  const head = [neck[0] + ux / ul * 4.4 * s, neck[1] + uy / ul * 4.4 * s];
  const fk = W('fk'), bkn = W('bk');
  return [
    { z: 'head', a: head, b: head, r: 4.7 * s },
    { z: 'body', a: hip, b: neck, r: 5.4 * bk * s },
    { z: 'leg', a: hip, b: fk, r: 3.1 * bk * s }, { z: 'leg', a: fk, b: W('ff'), r: 2.3 * s },
    { z: 'leg', a: hip, b: bkn, r: 3.1 * bk * s }, { z: 'leg', a: bkn, b: W('bf'), r: 2.3 * s },
    { z: 'arm', a: W('fe'), b: W('fh'), r: 2.3 * s }, { z: 'arm', a: W('be'), b: W('bh'), r: 2.3 * s },
  ];
}

// ударная часть: перчатка с предплечьем, голень со стопой, колено, локоть
function strikeSeg(a, pose, limb) {
  const s = a.def.scale, Y = a.y + poseExtra(a).dy, W = n => jointWorld(a.def, pose, a.x, Y, a.face, n);
  const L2 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  if (limb === 'fh' || limb === 'bh') { const e = W(limb === 'fh' ? 'fe' : 'be'), h = W(limb); return [L2(e, h, 0.25), h, 2.4 * s]; }
  if (limb === 'ff' || limb === 'bf') { const k = W(limb === 'ff' ? 'fk' : 'bk'), f = W(limb); return [L2(k, f, 0.15), f, 2.6 * s]; }
  if (limb === 'fk') { const h = W('hip'), k = W('fk'); return [L2(h, k, 0.7), k, 3 * s]; }
  const e = W('be'), n = W('neck'); return [L2(n, e, 0.6), e, 2.5 * s];
}

const ZONE = { head: 1.15, body: 1, leg: 0.9, arm: 0.5 };
const ZORDER = ['head', 'body', 'leg', 'arm'];
function hitZone(d, seg) {
  if (!canBeHit(d) || d.st === 'slip') return null;
  let best = null;
  for (const p of bodyParts(d)) {
    const [dist, at] = segDist(seg[0], seg[1], p.a, p.b);
    if (dist <= p.r + seg[2] && (!best || ZORDER.indexOf(p.z) < ZORDER.indexOf(best.z))) best = { z: p.z, at };
  }
  return best;
}

function checkHits(a, d) {
  if (a.st !== 'attack') return;
  const m = a.mv;
  if (m.grab && !a.grabbed && a.mvT >= m.grab.s && a.mvT <= m.grab.e) {
    const dx = d.x - a.x;
    if (Math.sign(dx) === a.face && Math.abs(dx) <= m.grab.r * a.def.scale && d.y >= GROUND - 2 && canBeHit(d)) {
      if (m.grab.sprawl && (d.st === 'crouch' || (d.st === 'block' && d.crouchB))) {
        a.grabbed = true; a.mv = null; a.mvId = null; setSt(a, 'hit'); a.stun = 28; a.vx = -a.face * 1.5;
        emit({ k: 'msg', text: 'СПРОЛ!' }); emit({ k: 'sfx', n: 'block' });
        return;
      }
      beginGrab(a, d, m.grab.kind);
      return;
    }
  }
  if (!m.hits.length) return;
  const pose = getPose(a);
  m.hits.forEach((h, i) => {
    if (a.hitDone[i] || a.mvT < h.s || a.mvT > h.e) return;
    const hz = hitZone(d, strikeSeg(a, pose, h.limb));
    if (hz) { a.hitDone[i] = true; applyHit(a, d, h, m, hz.at, hz.z); }
  });
}

function applyHit(a, d, h, m, pt, zone = 'body') {
  const mul = m.cat === 'p' ? a.def.pMul : m.cat === 'k' ? a.def.kMul : 1;
  let dmg = h.dmg * mul * ZONE[zone] * (a.dmgMul || 1);
  if (zone === 'arm') h = { ...h, stun: Math.round(h.stun * 0.6), kd: false };
  const facing = d.face === Math.sign(a.x - d.x);
  if (d.st === 'block' && facing && d.t <= 6) {
    a.mv = null; a.mvId = null; a.st = 'hit'; a.t = 0; a.stun = 30; a.vx = -a.face * 1.5;
    d.meter = Math.min(100, d.meter + 12);
    emit({ k: 'spark', x: pt[0], y: pt[1], blk: 1, big: 1 });
    emit({ k: 'sfx', n: 'block' }); emit({ k: 'msg', text: 'ПАРИРОВАНИЕ!' });
    G.hitstop = 8;
    return;
  }
  if (d.st === 'block' && facing) {
    dmg *= 0.15;
    d.hp = Math.max(1, d.hp - dmg);
    d.vx = a.face * h.kb * 0.8;
    a.meter = Math.min(100, a.meter + dmg * 2);
    d.meter = Math.min(100, d.meter + 3);
    emit({ k: 'spark', x: pt[0], y: pt[1], blk: 1 });
    emit({ k: 'sfx', n: 'block' });
    G.hitstop = 3;
    return;
  }
  const armored = d.st === 'attack' && d.mv.armor && d.mvT < d.mv.armor;
  const wasStunned = d.st === 'hit';
  d.hp -= dmg; d.flash = 4; a.landed = true;
  injure(d, zone);
  if ((d.dmgZ[zone] || 0) >= 7) for (let i = 0; i < 5; i++) G.parts.push({ x: pt[0], y: pt[1], vx: a.face * (0.5 + Math.random() * 1.5), vy: -Math.random() * 1.5, l: 60, c: BLOOD[i % 3], g: 0.14, drop: 1 });
  a.combo = wasStunned ? a.combo + 1 : 1;
  if (a.combo >= 2) emit({ k: 'combo', side: a.side, n: a.combo });
  a.meter = Math.min(100, a.meter + dmg * 1.6);
  d.meter = Math.min(100, d.meter + dmg);
  const heavy = !!h.kd || dmg >= 13;
  if (d.hp <= 0) { d.hp = 0; knock(d, a, h, true); }
  else if (armored && !h.kd) { /* Нганну не сбить с замаха */ }
  else if (heavy || d.y < GROUND - 1) knock(d, a, h, false);
  else { d.mv = null; d.mvId = null; d.st = 'hit'; d.t = 0; d.stun = h.stun; d.vx = a.face * h.kb; }
  emit({ k: 'spark', x: pt[0], y: pt[1], big: heavy ? 1 : 0 });
  emit({ k: 'sfx', n: heavy ? 'heavy' : m.cat === 'k' ? 'kick' : 'punch' });
  G.hitstop = heavy ? 9 : 3 + (dmg / 5 | 0);
  if (heavy) emit({ k: 'shake', v: 5 });
}

function knock(d, a, h, ko) {
  d.mv = null; d.mvId = null; d.st = ko ? 'ko' : 'down'; d.t = 0; d.downDur = 75;
  d.vx = a.face * (h.kb + 1.2); d.vy = -2.6;
}

function placePair(a, d, off) {
  a.x = d.x - a.face * off;
  if (a.x < MINX) { d.x += MINX - a.x; a.x = MINX; }
  if (a.x > MAXX) { d.x -= a.x - MAXX; a.x = MAXX; }
}

function beginGrab(a, d, kind) {
  a.grabbed = true; a.st = 'grab'; a.t = 0; a.gkind = kind; a.gt = 0; a.mv = null; a.mvId = null; a.vx = 0;
  d.st = 'held'; d.t = 0; d.gkind = kind; d.mash = 0; d.vx = 0; d.vy = 0; d.y = GROUND; d.face = -a.face; d.mv = null; d.mvId = null;
  if (kind === 'gnp') {
    placePair(a, d, 6);
    d.hp -= 6; d.flash = 4;
    emit({ k: 'sfx', n: 'heavy' }); emit({ k: 'shake', v: 6 }); emit({ k: 'dust', x: d.x });
  } else if (kind === 'td') {
    placePair(a, d, 6);
  } else if (kind === 'throw') {
    placePair(a, d, 16);
    emit({ k: 'sfx', n: 'grab' });
  } else {
    placePair(a, d, 26 * a.def.scale);
    emit({ k: 'sfx', n: 'grab' });
  }
}

function updGrab(a, d) {
  a.gt++; d.gt = a.gt;
  if (a.gkind === 'td') {
    if (a.gt === 1) { d.hp -= 10; d.flash = 4; emit({ k: 'sfx', n: 'heavy' }); emit({ k: 'shake', v: 6 }); emit({ k: 'dust', x: d.x }); }
    if (d.hp <= 0) { d.hp = 0; endGrab(a, d, true); return; }
    if (a.gt >= 40) endGrab(a, d, false);
    return;
  }
  if (a.gkind === 'throw') {
    const th = Math.PI * Math.min(1, a.gt / 26);
    d.x = clamp(a.x + a.face * 16 * Math.cos(th), MINX, MAXX);
    d.y = GROUND - 30 * Math.sin(th);
    if (a.gt === 26) {
      d.y = GROUND; d.hp -= 13; d.flash = 4;
      emit({ k: 'sfx', n: 'heavy' }); emit({ k: 'shake', v: 8 }); emit({ k: 'dust', x: d.x });
      if (d.hp <= 0) { d.hp = 0; endGrab(a, d, true); return; }
    }
    if (a.gt >= 40) { endGrab(a, d, false); a.face = -a.face; }
    return;
  }
  if (a.gkind === 'gnp') {
    const HITS = 6, START = 20, CYC = 12, k = a.gt - START;
    if (k >= 0 && k % CYC === 6 && k / CYC < HITS) {
      d.hp -= 3.6; d.flash = 3; injure(d, 'head');
      const pt = jointWorld(a.def, POSE.gnp, a.x, a.y, a.face, 'bh');
      emit({ k: 'spark', x: pt[0], y: pt[1] });
      emit({ k: 'sfx', n: 'punch' }); emit({ k: 'shake', v: 2 });
      G.hitstop = 2;
      if (d.hp <= 0) { d.hp = 0; endGrab(a, d, true); return; }
    }
    if (a.gt >= START + HITS * CYC + 6) endGrab(a, d, false);
  } else {
    if (a.gt > 16) {
      d.hp -= 0.3;
      if (a.gt % 20 === 0) { d.flash = 3; emit({ k: 'sfx', n: 'grab' }); }
    }
    if (d.mash >= 16) {
      setSt(a, 'hit'); a.stun = 26; a.vx = -a.face * 2.5; a.gkind = null;
      setSt(d, 'idle'); d.inv = 20; d.vx = a.face * 1.5; d.gkind = null;
      emit({ k: 'sfx', n: 'block' }); emit({ k: 'msg', text: 'ВЫРВАЛСЯ!' });
      return;
    }
    if (d.hp <= 0) { d.hp = 0; endGrab(a, d, true); return; }
    if (a.gt >= 120) endGrab(a, d, false);
  }
}

function endGrab(a, d, ko) {
  const was = a.gkind;
  a.st = 'idle'; a.t = 0; a.inv = 10; a.gkind = null;
  d.gkind = null;
  d.st = ko ? 'ko' : 'down';
  d.t = was === 'gnp' || was === 'td' || was === 'throw' ? 12 : 0;
  d.downDur = was === 'gnp' ? 60 : 75;
  d.y = GROUND;
  if (was !== 'gnp') emit({ k: 'dust', x: d.x });
}

function separate(a, b) {
  const lying = s => ['held', 'grab', 'down', 'ko', 'clinch'].includes(s);
  if (lying(a.st) || lying(b.st)) return;
  const minD = 11 * (a.def.bulk * a.def.scale + b.def.bulk * b.def.scale);
  const dx = b.x - a.x;
  if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 40) {
    const push = (minD - Math.abs(dx)) / 2, sg = dx === 0 ? a.face : Math.sign(dx);
    a.x -= push * sg; b.x += push * sg;
    if (a.x < MINX) { b.x += MINX - a.x; a.x = MINX; }
    if (b.x < MINX) { a.x += MINX - b.x; b.x = MINX; }
    if (a.x > MAXX) { b.x -= a.x - MAXX; a.x = MAXX; }
    if (b.x > MAXX) { a.x -= b.x - MAXX; b.x = MAXX; }
  }
}

// ---------- Клинч: стоят вплотную — кто быстрее жмёт, тот бросает или проходит в ноги
const CLINCH_T = 150, CLINCH_WIN = 18;
function clinchLogic(a, b) {
  const g = G;
  if (g.phase !== 'fight') { g.closeT = 0; return; }
  if (g.clinch) {
    g.clinch.t++;
    a.t++; b.t++;
    const [n0, n1] = g.clinch.n;
    if (g.clinch.t >= CLINCH_T || n0 >= CLINCH_WIN || n1 >= CLINCH_WIN) {
      const w = n0 > n1 ? 0 : n1 > n0 ? 1 : (Math.random() < 0.5 ? 0 : 1);
      const W = g.f[w], L = g.f[1 - w];
      const kind = Math.random() < W.def.stats.grap / 14 ? 'td' : 'throw';
      g.clinch = null; g.closeT = -120;
      W.st = 'idle'; L.st = 'idle';
      beginGrab(W, L, kind);
      emit({ k: 'msg', text: kind === 'td' ? 'ПРОХОД В НОГИ!' : 'БРОСОК ЧЕРЕЗ СЕБЯ!', big: 0 });
    }
    return;
  }
  const free = f => ['idle', 'walk', 'block', 'crouch'].includes(f.st) && f.y >= GROUND;
  const minD = 11 * (a.def.bulk * a.def.scale + b.def.bulk * b.def.scale);
  if (free(a) && free(b) && Math.abs(a.x - b.x) < minD + 4) g.closeT = (g.closeT || 0) + 1;
  else if ((g.closeT || 0) > 0) g.closeT = 0; else g.closeT = Math.min(0, (g.closeT || 0) + 1);
  if (g.closeT > 50) {
    g.clinch = { t: 0, n: [0, 0] };
    const mid = (a.x + b.x) / 2, d = a.x <= b.x ? 1 : -1;
    Object.assign(a, { st: 'clinch', t: 0, mv: null, mvId: null, face: d, x: mid - d * 9, vx: 0 });
    Object.assign(b, { st: 'clinch', t: 0, mv: null, mvId: null, face: -d, x: mid + d * 9, vx: 0 });
    emit({ k: 'msg', text: 'КЛИНЧ! ЖМИ БЫСТРЕЕ!' });
    emit({ k: 'sfx', n: 'grab' });
  }
}

// ---------- Бот
const AIP = [
  { blk: 0.18, agg: 0.025, react: 0.3, jump: 0.003, sp: 0.3, combo: 0.1 },
  { blk: 0.42, agg: 0.05, react: 0.6, jump: 0.004, sp: 0.6, combo: 0.35 },
  { blk: 0.68, agg: 0.085, react: 0.85, jump: 0.005, sp: 0.9, combo: 0.7 },
  { blk: 0.78, agg: 0.11, react: 0.9, jump: 0.005, sp: 0.95, combo: 0.82 },                          // сложный
  { blk: 0.86, agg: 0.13, react: 0.95, jump: 0.005, sp: 1, combo: 0.92 },                            // ультра
  { blk: 0.9, agg: 0.15, react: 1, jump: 0.006, sp: 1, combo: 1, buff: { hp: 1.25, dmg: 1.1 } },      // хардкор
  { blk: 0.94, agg: 0.18, react: 1, jump: 0.006, sp: 1, combo: 1, buff: { hp: 1.5, dmg: 1.25 } },     // безумный
];
const CLINCH_MASH = [0.16, 0.26, 0.38, 0.45, 0.52, 0.58, 0.66];
function makeAI(diff) { return { diff, plan: 'approach', planT: 0, blockT: 0, lastSeq: -1 }; }

function aiInput(me, op, ai) {
  const I = EMPTY(), P = AIP[ai.diff];
  if (G.train && me.side === 1) return I;
  const dx = op.x - me.x, dist = Math.abs(dx);
  const F = dx > 0 ? 'r' : 'l', B = dx > 0 ? 'l' : 'r';
  const R = Math.random;
  if (me.st === 'held') { if (R() < P.react * 0.35) I[R() < 0.5 ? 'p' : 'k'] = 1; return I; }
  if (me.st === 'clinch') { if (R() < CLINCH_MASH[ai.diff]) I[R() < 0.5 ? 'p' : 'k'] = 1; return I; }
  if (['down', 'ko', 'grab', 'win'].includes(me.st)) return I;
  // бот тоже отвечает из-под ударов: чем выше уровень, тем чаще
  if (me.st === 'hit') { if (dist < 44 && R() < P.react * 0.08) { I[R() < 0.6 ? 'p' : 'k'] = 1; if (R() < 0.3) I[F] = 1; } else if (R() < P.blk * 0.05) I.b = 1; return I; }
  if (op.st === 'attack' && op.atkSeq !== ai.lastSeq) {
    ai.lastSeq = op.atkSeq;
    if (op.mv.grab && op.mv.grab.sprawl && R() < P.blk * 0.6) { I.d = 1; ai.blockT = 0; return I; }
    if (dist < 50 && R() < P.react * 0.12 && !op.mv.grab) { I.b = 1; I[B] = 1; return I; }
    if (dist < 64 && R() < P.blk && !op.mv.grab) ai.blockT = 16 + R() * 14 | 0;
  }
  if (ai.blockT > 0 && me.st !== 'attack' && me.st !== 'jump') { ai.blockT--; I.b = 1; return I; }
  if (me.st === 'attack') {
    if ((me.landed || me.mv.chain) && R() < P.combo * 0.2) I[me.mv.chain ? 'p' : R() < 0.6 ? 'p' : 'k'] = 1;
    return I;
  }
  if (me.st === 'jump') { if (dist < 44 && R() < 0.12) { I[R() < 0.5 ? 'k' : 'p'] = 1; const q = R(); if (q < 0.35) I.d = 1; else if (q < 0.7) I[F] = 1; } return I; }
  const reach = 30 * me.def.scale + 6;
  if (op.st === 'down' || op.st === 'held' || op.st === 'ko') {
    if (dist > 56) I[F] = 1; else if (dist < 38) I[B] = 1;
    return I;
  }
  if (op.y < GROUND - 14 && dist < 44 && R() < P.react * 0.12) { I.d = 1; I.p = 1; return I; }
  if (--ai.planT <= 0) {
    ai.planT = 20 + R() * 40 | 0;
    const r = R();
    ai.plan = dist > 80 ? (r < 0.8 ? 'approach' : 'hold') : r < 0.55 ? 'approach' : r < 0.8 ? 'hold' : 'retreat';
  }
  if (dist < reach + 8 && R() < P.agg) {
    const m = me.def;
    const grabber = MOVES[m.special].grab;
    const spOK = grabber ? dist <= 28 * m.scale : dist <= 50;
    if (me.meter >= 100 && spOK && R() < P.sp) { I.s = 1; return I; }
    const r = R(), v = R();
    if (r < 0.06) { I.p = 1; I.k = 1; const q = R(); if (q < 0.25) I[F] = 1; else if (q < 0.5) I.d = 1; else if (q < 0.7) I[B] = 1; return I; }
    if (r < 0.1) { I.b = 1; I[R() < 0.5 ? 'p' : 'k'] = 1; if (R() < 0.3) I.d = 1; return I; }
    if (r < 0.14 && me.def.stats.grap >= 7) { I.b = 1; I.d = 1; I.p = 1; return I; }
    if (v < 0.32) {} else if (v < 0.55) I[F] = 1; else if (v < 0.72) I.d = 1; else if (v < 0.82) { I.d = 1; I[F] = 1; }
    else if (v < 0.9) { I.d = 1; I[B] = 1; } else I[B] = 1;
    I[r < 0.5 ? 'p' : 'k'] = 1;
    return I;
  }
  if (ai.plan === 'approach') { if (dist > reach - 6) I[F] = 1; if (R() < P.jump) { I.u = 1; I[F] = 1; } }
  else if (ai.plan === 'retreat') I[B] = 1;
  return I;
}

// ---------- Позы для отрисовки
function getPose(f) {
  switch (f.st) {
    case 'idle': return lerpPose(POSE.idle, POSE.idle2, (Math.sin(f.t * 0.09) + 1) / 2);
    case 'walk': return lerpPose(POSE.walk1, POSE.walk2, (Math.sin(f.t * 0.28) + 1) / 2);
    case 'crouch': return POSE.crouch;
    case 'block': return f.crouchB ? POSE.cblock : POSE.block;
    case 'jump': return POSE.jump;
    case 'slip': return lerpPose(POSE.slipP, POSE.idle, Math.max(0, (f.t - 10) / 6));
    case 'land': return lerpPose(POSE.crouch, POSE.idle, f.t / 9);
    case 'attack': return f.mv ? keyPose(f.mv.keys, f.mvT) : POSE.idle;
    case 'hit': return POSE.hit;
    case 'down': case 'ko': {
      const t = f.t;
      if (t < 12) return lerpPose(POSE.hit, POSE.down, t / 12);
      if (f.st === 'down') {
        const rem = f.downDur - t;
        if (rem < 8) return lerpPose(POSE.sit, POSE.idle, 1 - rem / 8);
        if (rem < 20) return lerpPose(POSE.down, POSE.sit, 1 - (rem - 8) / 12);
      }
      return POSE.down;
    }
    case 'held': return f.gkind === 'gnp' || f.gkind === 'td' ? POSE.down : f.gkind === 'throw' ? POSE.hit : POSE.guillo;
    case 'grab': {
      if (f.gkind === 'td') return f.gt < 10 ? lerpPose(POSE.shoot, POSE.mount, f.gt / 10) : POSE.mount;
      if (f.gkind === 'throw') return f.gt < 26 ? lerpPose(POSE.clinch, POSE.suplex, f.gt / 12) : lerpPose(POSE.suplex, POSE.idle, (f.gt - 26) / 14);
      if (f.gkind === 'gnp') {
        const k = f.gt - 20;
        if (k < 0) return lerpPose(POSE.shoot, POSE.mount, f.gt / 10);
        if (k >= 72) return POSE.mount;
        const c = k % 12;
        return c < 6 ? lerpPose(POSE.mount, POSE.gnpW, c / 5) : c < 9 ? POSE.gnp : POSE.mount;
      }
      const p = lerpPose(POSE.shoot, POSE.guilloA, f.gt / 8);
      if (f.gt > 16) p[3] += Math.sin(f.gt * 0.8) * 0.8;
      return p;
    }
    case 'win': return lerpPose(POSE.win, POSE.win2, (Math.sin(f.t * 0.15) + 1) / 2);
    case 'taunt': return tauntOf(f).p;
    case 'clinch': { const p = POSE.clinch.slice(); p[3] += Math.sin(f.t * 0.6); p[1] += Math.sin(f.t * 0.4) * 0.5; return p; }
  }
  return POSE.idle;
}

function drawFace(f) {
  const m = f.mv;
  if (f.st === 'attack' && m && m.flip && f.mvT >= m.flip[0] && f.mvT < m.flip[1]) return -f.face;
  // вертушка: боец крутится вокруг себя — быстро разворачиваем спрайт туда-обратно
  if (f.st === 'attack' && m && m.spinAir && f.mvT >= m.spinAir[0] && f.mvT < m.spinAir[1])
    return Math.floor((f.mvT - m.spinAir[0]) / 3) % 2 ? -f.face : f.face;
  return f.face;
}

// ---------- Выход бойцов и ведущий
const WALK_END = 520;
const RG_T = 190; // сколько кадров идёт ринг-гёрл
function annState(T) {
  if (T >= 445) return { x: 160 + (T - 445) * 1.6, face: 1, pose: lerpPose(POSE.walk1, POSE.walk2, (Math.sin(T * 0.28) + 1) / 2) };
  const p = POSE.annL.slice(); p[3] += Math.sin(T * 0.1);
  return { x: 160, face: T < 245 ? 1 : -1, pose: p };
}

// фирменный номер каждого бойца при выходе (t от 0 до 70)
const wave = (t, sp) => (Math.sin(t * sp) + 1) / 2;
const TAUNT = {
  khabib: t => ({ p: lerpPose(POSE.idle, POSE.pray, Math.min(1, t / 12)) }),
  oliveira: t => ({ p: t < 12 ? lerpPose(POSE.idle, POSE.heart, t / 12) : t < 45 ? POSE.heart : lerpPose(POSE.kiss1, POSE.kiss2, wave(t, 0.25)) }),
  jones: t => ({ p: lerpPose(POSE.chest, POSE.idle, wave(t, 0.5)) }),
  tyson: t => ({ p: keyPose([[0,'idle'],[3,'jab'],[6,'idle'],[9,'cross'],[12,'idle'],[15,'hook'],[18,'idle']], t % 18) }),
  tsarukyan: t => {
    if (t < 10) return { p: lerpPose(POSE.idle, POSE.crouch, t / 10) };
    if (t < 36) { const k = (t - 10) / 26; return { p: POSE.jump, dy: -Math.sin(k * Math.PI) * 34, rot: -k * Math.PI * 2 }; }
    if (t < 44) return { p: lerpPose(POSE.crouch, POSE.idle, (t - 36) / 8) };
    return { p: lerpPose(POSE.win, POSE.win2, wave(t, 0.2)) };
  },
  mcgregor: t => { const p = POSE.strut.slice(); p[1] -= wave(t, 0.3); p[3] -= wave(t, 0.3); return { p }; },
  adesanya: t => ({ p: lerpPose(POSE.dance1, POSE.dance2, wave(t, 0.22)) }),
  poirier: t => ({ p: lerpPose(POSE.win, POSE.win2, wave(t, 0.3)) }),
  ngannou: t => ({ p: lerpPose(POSE.idle, POSE.flex, Math.min(1, t / 10)), dy: t > 10 ? -wave(t, 0.4) : 0 }),
  usyk: t => ({ p: lerpPose(POSE.hopak1, POSE.hopak2, wave(t, 0.35)) }),
  pimblett: t => ({ p: lerpPose(POSE.kiss1, POSE.kiss2, wave(t, 0.22)) }),
};
const tauntOf = f => (TAUNT[f.id] || TAUNT.poirier)(f.t);
function poseExtra(f) {
  if (f.st === 'taunt') { const r = tauntOf(f); return { dy: r.dy || 0, rot: r.rot || 0 }; }
  if (f.st === 'attack' && f.mv && f.mv.spinAir && f.mvT >= f.mv.spinAir[0] && f.mvT < f.mv.spinAir[1])
    return { dy: 0, rot: Math.sin((f.mvT - f.mv.spinAir[0]) * 0.55) * 0.35 };
  if (f.st === 'attack' && f.mv && f.mv.spin && f.mvT >= f.mv.spin[0] && f.mvT < f.mv.spin[1])
    return { dy: 0, rot: ((f.mvT - f.mv.spin[0]) / (f.mv.spin[1] - f.mv.spin[0])) * Math.PI * 2 };
  if (f.st === 'held' && f.gkind === 'throw') return { dy: 0, rot: -Math.PI * Math.min(1, f.gt / 26) };
  return { dy: 0, rot: 0 };
}

function walkout() {
  const g = G, [a, b] = g.f, T = ++g.phaseT;
  a.t++; b.t++;
  if (g.mode !== 'guest' && T > 20) {
    const I = Input.read();
    if (I.p || I.k || I.s || I.b) { endWalkout(); return; }
  }
  const walkTo = (f, x) => {
    const d = Math.sign(x - f.x);
    if (Math.abs(x - f.x) > 1.3) { if (f.st !== 'walk') { f.st = 'walk'; f.t = 0; } f.face = d; f.x += d * 1.2; }
    else if (f.st === 'walk') { f.x = x; f.st = 'idle'; f.t = 0; }
  };
  const kissy = f => (f.id === 'pimblett' || f.id === 'oliveira') && f.st === 'taunt' && f.t > 20 && f.t % 12 === 0;
  const ia = INTRO[a.id] || ['', a.def.name], ib = INTRO[b.id] || ['', b.def.name];
  if (T === 1) {
    emit({ k: 'msg', text: 'ДАМЫ И ГОСПОДА!' });
    emit({ k: 'sfx', n: 'crowd' });
  }
  if (T === 50) {
    emit({ k: 'music', n: a.id });
    emit({ k: 'msg', text: 'В КРАСНОМ УГЛУ' });
  }
  if (T >= 50 && T < 170) walkTo(a, 108);
  if (T === 170) { a.x = 108; a.face = 1; a.st = 'taunt'; a.t = 0; emit({ k: 'msg', text: a.def.name + ' «' + a.def.nick.toUpperCase() + '»' }); emit({ k: 'sfx', n: 'crowd' }); }
  if (kissy(a)) emit({ k: 'heart', x: a.x + 12, y: a.y - 56, d: 1 });
  if (T === 240) { a.st = 'idle'; a.face = 1; a.t = 0; }
  if (T === 245) {
    emit({ k: 'music', n: b.id });
    emit({ k: 'msg', text: 'В СИНЕМ УГЛУ' });
  }
  if (T >= 245 && T < 365) walkTo(b, 212);
  if (T === 365) { b.x = 212; b.face = -1; b.st = 'taunt'; b.t = 0; emit({ k: 'msg', text: b.def.name + ' «' + b.def.nick.toUpperCase() + '»' }); emit({ k: 'sfx', n: 'crowd' }); }
  if (kissy(b)) emit({ k: 'heart', x: b.x - 12, y: b.y - 56, d: -1 });
  if (T === 435) { b.st = 'idle'; b.face = -1; b.t = 0; }
  if (T === 445) { emit({ k: 'msg', text: 'ДА НАЧНЁТСЯ БИТВА!' }); }
  if (T >= WALK_END) endWalkout();
}

function endWalkout() {
  const [a, b] = G.f;
  Object.assign(a, { x: 108, y: GROUND, face: 1, st: 'idle', t: 0 });
  Object.assign(b, { x: 212, y: GROUND, face: -1, st: 'idle', t: 0 });
  emit({ k: 'hush' });
  emit({ k: 'music', n: 'fight' });
  G.phase = 'intro'; G.phaseT = 0;
}

// ---------- Раунды
function endRound(w, txt) {
  G.phase = 'ko'; G.phaseT = 0; G.winner = w;
  emit({ k: 'msg', text: txt, big: 1 });
  G.lastKO = txt === 'K.O.!';
  if (txt === 'K.O.!') { emit({ k: 'sfx', n: 'ko' }); G.slow = 60; }
  else emit({ k: 'sfx', n: 'bell' });
}

function phaseLogic() {
  const g = G, [a, b] = g.f;
  g.phaseT++;
  if (g.phase === 'intro') {
    // со второго раунда сначала проходит ринг-гёрл, потом гонг
    const pre = g.round > 1 ? RG_T : 0;
    if (g.round > 1 && g.phaseT === 1) emit({ k: 'sfx', n: 'crowd' });
    if (g.phaseT === pre + 1) { emit({ k: 'msg', text: g.round === 3 ? 'ФИНАЛЬНЫЙ РАУНД' : 'РАУНД ' + g.round }); emit({ k: 'sfx', n: 'bell' }); }
    if (g.phaseT === pre + 80) emit({ k: 'msg', text: 'БОЙ!', big: 1 });
    if (g.phaseT >= pre + 100) { g.phase = 'fight'; g.phaseT = 0; }
  } else if (g.phase === 'fight') {
    g.timer--;
    if (g.train) {
      g.timer = ROUND_T;
      a.meter = Math.min(100, a.meter + 0.5);
      for (const f of g.f) if (f.hp < f.maxHp * 0.3 && !['down', 'ko', 'held'].includes(f.st)) f.hp = f.maxHp;
      if (b.hp <= 0) b.hp = 1;
    }
    if (a.hp <= 0 || b.hp <= 0) endRound(a.hp <= 0 && b.hp <= 0 ? -1 : a.hp <= 0 ? 1 : 0, 'K.O.!');
    else if (g.timer <= 0) {
      g.timer = 0;
      const r = a.hp / a.maxHp - b.hp / b.maxHp;
      endRound(r > 0.001 ? 0 : r < -0.001 ? 1 : -1, 'ВРЕМЯ!');
    }
  } else if (g.phase === 'ko') {
    if (g.phaseT === 110) {
      if (g.winner >= 0) {
        const w = g.f[g.winner];
        if (w.st !== 'ko') { w.mv = null; w.mvId = null; w.st = 'win'; w.t = 0; }
        g.wins[g.winner]++;
        emit({ k: 'msg', text: w.def.name + ' ПОБЕЖДАЕТ' });
      } else emit({ k: 'msg', text: 'НИЧЬЯ' });
    }
    if (g.phaseT === 230) {
      if (g.wins[0] >= 2 || g.wins[1] >= 2 || g.round >= 5) {
        g.phase = 'over';
        emit({ k: 'over', w: g.wins[0] > g.wins[1] ? 0 : g.wins[1] > g.wins[0] ? 1 : -1, ko: g.lastKO ? 1 : 0 });
      } else { g.round++; startRound(); }
    }
  }
}

function step() {
  const g = G;
  g.frame++;
  if (g.hitstop > 0) { g.hitstop--; updateParts(); return; }
  if (g.slow > 0) { g.slow--; if (g.slow % 3) { updateParts(); return; } }
  if (g.phase === 'walkout') { walkout(); updateParts(); return; }
  const [a, b] = g.f;
  if (g.phase === 'fight') {
    a.inp = g.mode === 'demo' ? aiInput(a, b, g.ai[0]) : Input.read();
    b.inp = g.mode === 'host' ? decIn(g.remoteHeld | g.remoteLatch) : aiInput(b, a, g.ai[1]);
  } else { a.inp = EMPTY(); b.inp = EMPTY(); }
  g.remoteLatch = 0;
  updFighter(a, b); updFighter(b, a);
  if (g.mode !== 'demo') bleed();
  checkHits(a, b); checkHits(b, a);
  separate(a, b);
  clinchLogic(a, b);
  a.prev = a.inp; b.prev = b.inp;
  if (g.phase !== 'over') phaseLogic();
  updateParts();
}

// ---------- Онлайн: хост считает бой, гость шлёт кнопки и рисует присланное
const Net = { peer: null, conn: null, role: null };

const snapF = f => [Math.round(f.x * 10) / 10, Math.round(f.y * 10) / 10, f.face, Math.round(f.hp * 10) / 10,
  Math.round(f.meter), f.st, f.mvId || 0, Math.round(f.mvT * 10) / 10, f.t, f.gkind || 0, f.gt, f.flash, f.downDur, f.crouchB ? 1 : 0,
  [f.dmgZ.head || 0, f.dmgZ.body || 0, f.dmgZ.arm || 0, f.dmgZ.leg || 0]];

function applySnapF(f, s) {
  let mv, gk, cb, dz;
  [f.tx, f.ty, f.face, f.hp, f.meter, f.st, mv, f.mvT, f.t, gk, f.gt, f.flash, f.downDur, cb, dz] = s;
  if (dz) f.dmgZ = { head: dz[0], body: dz[1], arm: dz[2], leg: dz[3] };
  if (f.x === undefined || Math.abs(f.tx - f.x) > 60) { f.x = f.tx; f.y = f.ty; }
  f.mvId = mv || null; f.mv = mv ? MOVES[mv] : null; f.gkind = gk || null; f.crouchB = !!cb;
}

function netSend(o) {
  try {
    if (Net.p2p && Net.p2p.open && (o.t === 's' || o.t === 'i')) { Net.p2p.send(o); return; }
    if (Net.conn && Net.conn.open) Net.conn.send(o);
  } catch (e) {}
}
const netEvery = () => (Net.p2p && Net.p2p.open ? 2 : 7);

function onNetData(d) {
  if (!d || !d.t) return;
  if (d.t === 'i' && G && G.mode === 'host') {
    Net.guestSeen = true; G.remoteHeld = d.v; G.remoteLatch |= d.v | (d.l || 0);
    const b = G.f[1];
    if (d.c && G.clinch && b.st === 'clinch') G.clinch.n[1] += d.c;
    if (d.c && b.st === 'held') b.mash += d.c;
  }
  else if (d.t === 's' && G && G.mode === 'guest') {
    applySnapF(G.f[0], d.a); applySnapF(G.f[1], d.b);
    G.timer = d.tm; G.round = d.rd; G.wins = d.w; G.phase = d.ph; G.phaseT = d.pt; G.clinch = d.cl ? { n: [d.cl[0], d.cl[1]], t: d.cl[2] } : null;
    d.fx.forEach(applyFx);
  } else UI.onNet(d);
}

function cleanupNet() {
  try { Net.conn && Net.conn.close(); } catch (e) {}
  try { Net.peer && Net.peer.destroy(); } catch (e) {}
  try { Net.p2pPeer && Net.p2pPeer.destroy(); } catch (e) {}
  Net.peer = Net.conn = Net.role = Net.p2p = Net.p2pPeer = null;
}

// ---------- Цикл
let paused = false;
function tick() {
  if (!G) return;
  const online = G.mode === 'host' || G.mode === 'guest';
  if (online && Net.lastRx && performance.now() - Net.lastRx > 12000) { UI.netLost(); return; }
  Net.tick = (Net.tick || 0) + 1;
  if (G.mode === 'guest') {
    // копим нажатия и шлём пачкой раз в 7 кадров: сервер пропускает ~10 сообщений в секунду
    const I = Input.read(), v = encIn(I);
    const edges = v & ~(Net.lastIn || 0);
    Net.latch = (Net.latch || 0) | v;
    Net.count = (Net.count || 0) + ((edges & 0xF0) ? 1 : 0);
    Net.lastIn = v;
    if (Net.tick % netEvery() === 0) { netSend({ t: 'i', v, l: Net.latch, c: Net.count }); Net.latch = 0; Net.count = 0; }
    bleed();
    // между пакетами двигаем бойцов сами — без рывков
    for (const f of G.f) {
      f.t++;
      if (f.st === 'attack' && f.mv) f.mvT += f.def.spd;
      if (f.tx !== undefined) { f.x += (f.tx - f.x) * 0.3; f.y += (f.ty - f.y) * 0.3; }
    }
    updateParts();
    return;
  }
  if (paused) return;
  step();
  if (G.mode === 'host' && Net.tick % netEvery() === 0) {
    netSend({ t: 's', a: snapF(G.f[0]), b: snapF(G.f[1]), tm: G.timer, rd: G.round, w: G.wins, ph: G.phase, pt: G.phaseT, cl: G.clinch ? [G.clinch.n[0], G.clinch.n[1], G.clinch.t] : 0, fx: G.fx });
    G.fx = [];
  }
}

const RS = 3; // картинка 960×540: бойцы ~180 пикселей ростом
function render(now) {
  const c = ctx;
  let sx = 0, sy = 0;
  if (G && G.shake > 0) {
    sx = Math.round((Math.random() - 0.5) * G.shake) * RS; sy = Math.round((Math.random() - 0.5) * G.shake) * RS;
    G.shake *= 0.85; if (G.shake < 0.5) G.shake = 0;
  }
  c.save();
  c.setTransform(RS, 0, 0, RS, sx, sy);
  const si = G ? G.stage : menuStage;
  drawStageBack(c, si, now);
  if (G && G.stains) for (const st of G.stains) { c.fillStyle = st.c; c.fillRect(st.x, st.y, st.w, 1); }
  if (G) {
    for (const f of G.f) {
      const k = 1 - Math.min(0.5, (GROUND - f.y) / 80);
      const w = Math.round(22 * f.def.scale * f.def.bulk * k);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(Math.round(f.x - w / 2), GROUND - 1, w, 2);
      c.fillRect(Math.round(f.x - w / 2) + 3, GROUND + 1, w - 6, 1);
    }
    // ринг-гёрл с табличкой раунда — между раундами
    if (G.phase === 'intro' && G.round > 1 && G.phaseT < RG_T) {
      const t = G.phaseT, x = -20 + t * (360 / RG_T);
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(Math.round(x) - 7, GROUND - 1, 14, 2);
      drawRingGirl(c, x, GROUND, t, G.round === 3 ? 'ФИНАЛ' : 'РАУНД ' + G.round);
    }
    const pri = f => (['held', 'down', 'ko'].includes(f.st) ? 0 : ['attack', 'grab'].includes(f.st) ? 2 : 1);
    c.setTransform(1, 0, 0, 1, sx, sy);
    [...G.f].sort((p, q) => pri(p) - pri(q)).forEach(f => {
      const ex = poseExtra(f);
      drawFighterHD(c, f.def, getPose(f), f.x * RS, (f.y + ex.dy) * RS, drawFace(f),
        { flash: f.flash > 0, hat: f.st === 'win' || (f.st === 'taunt' && f.id === 'khabib'), rot: ex.rot, dmg: f.dmgZ });
    });
    c.setTransform(RS, 0, 0, RS, sx, sy);
    for (const p of G.parts) {
      c.fillStyle = p.c;
      if (p.star) {
        const r = p.star;
        c.fillRect(Math.round(p.x - r), Math.round(p.y), r * 2 + 1, 1);
        c.fillRect(Math.round(p.x), Math.round(p.y - r), 1, r * 2 + 1);
        c.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 3, 3);
      } else if (p.heart) {
        const hx = Math.round(p.x), hy = Math.round(p.y);
        c.fillRect(hx - 2, hy - 1, 2, 2); c.fillRect(hx + 1, hy - 1, 2, 2); c.fillRect(hx - 2, hy, 5, 2); c.fillRect(hx - 1, hy + 2, 3, 1); c.fillRect(hx, hy + 3, 1, 1);
      } else c.fillRect(Math.round(p.x), Math.round(p.y), p.l > 8 ? 2 : 1, p.l > 8 ? 2 : 1);
    }
  }
  drawStageFront(c, si, now);
  c.restore();
  if (G && G.mode !== 'demo') UI.hud(G);
}

let acc = 0, last = performance.now();
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { tick(); acc -= 1000 / 60; }
  render(now);
  requestAnimationFrame(loop);
}

function startDemo() {
  const ids = ROSTER.map(f => f.id);
  const a = ids[Math.random() * ids.length | 0];
  let b = ids[Math.random() * ids.length | 0];
  if (b === a) b = ids[(ids.indexOf(a) + 3) % ids.length];
  menuStage = 0;
  newMatch({ mode: 'demo', p1: a, p2: b, stage: menuStage, diff: 1 });
}

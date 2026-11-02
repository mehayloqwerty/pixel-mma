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
  };
}

function newMatch(o) {
  G = {
    mode: o.mode, stage: o.stage, diff: o.diff ?? 1,
    f: [mkFighter(0, o.p1), mkFighter(1, o.p2)],
    round: 1, wins: [0, 0], timer: ROUND_T, phase: 'intro', phaseT: 0, winner: -1,
    hitstop: 0, slow: 0, shake: 0, parts: [], fx: [], remoteHeld: 0, remoteLatch: 0, frame: 0,
    ai: [makeAI(o.mode === 'demo' ? 1 : 0), makeAI(o.diff ?? 1)],
  };
  Sound.quiet = o.mode === 'demo';
  startRound();
  if (o.mode !== 'demo') {
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
  G.timer = ROUND_T; G.phase = 'intro'; G.phaseT = 0; G.winner = -1;
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
    case 'shake': G.shake = Math.max(G.shake, e.v); break;
    case 'msg': if (!demo) UI.banner(e.text, e.big); break;
    case 'sp': if (!demo) UI.special(e.side, e.text); break;
    case 'combo': if (!demo) UI.combo(e.side, e.n); break;
    case 'say': if (!demo) Sound.say(e.text); break;
    case 'music': if (!demo) Sound.music(e.n); break;
    case 'hush': Sound.hush(); break;
    case 'over': if (!demo) UI.matchOver(e.w); else setTimeout(() => G && G.mode === 'demo' && startDemo(), 600); break;
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
  for (const p of G.parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.vx *= 0.95; p.l--; }
  G.parts = G.parts.filter(p => p.l > 0);
}

// ---------- Ввод ударов
function pickMove(f, btn, fwd, down, back) {
  if (btn === 'p') {
    if (down) return fwd ? 'bodyHook' : 'upper';
    if (back) return 'backfist';
    return fwd ? 'cross' : 'jab';
  }
  if (down) return fwd ? 'bodyKick' : 'lowKick';
  if (back) return 'spinKick';
  return fwd ? 'highKick' : 'teep';
}

function setSt(f, s) { if (f.st !== s) { f.st = s; f.t = 0; } }

function startMove(f, id) {
  const m = MOVES[id];
  f.mv = m; f.mvId = id; f.mvT = 0; f.st = 'attack'; f.t = 0;
  f.hitDone = []; f.landed = false; f.grabbed = false; f.atkSeq++;
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
  if (f.flash > 0) f.flash--;
  if (f.inv > 0) f.inv--;
  const D = f.def, air = f.y < GROUND;
  const fwdOf = () => (f.face > 0 ? I.r : I.l);
  const backOf = () => (f.face > 0 ? I.l : I.r);

  if (['idle', 'walk', 'crouch', 'block'].includes(f.st)) {
    if (Math.abs(o.x - f.x) > 1) f.face = o.x > f.x ? 1 : -1;
    const fwd = fwdOf(), bk = backOf();
    if (pr('s') && f.meter >= 100) startMove(f, D.special);
    else if (pr('p')) startMove(f, pickMove(f, 'p', fwd, I.d, bk));
    else if (pr('k')) startMove(f, pickMove(f, 'k', fwd, I.d, bk));
    else if (I.b) { setSt(f, 'block'); f.crouchB = !!I.d; }
    else if (I.u) {
      f.st = 'jump'; f.t = 0; f.vy = -4.7; f.airUsed = false;
      f.vx = (fwd ? 1.7 : bk ? -1.5 : 0) * f.face;
      emit({ k: 'sfx', n: 'jump' });
    }
    else if (I.d) setSt(f, 'crouch');
    else if (fwd) { setSt(f, 'walk'); f.vx = 1.25 * D.walk * f.face; }
    else if (bk) { setSt(f, 'walk'); f.vx = -1.0 * D.walk * f.face; }
    else setSt(f, 'idle');
  } else if (f.st === 'jump') {
    if (!f.airUsed && (pr('p') || pr('k'))) { f.airUsed = true; startMove(f, pr('p') ? 'airPunch' : 'airKick'); }
  } else if (f.st === 'attack') {
    const m = f.mv, t0 = f.mvT;
    f.mvT += D.spd;
    if (inLunge(f)) f.vx = m.lunge[2] * f.face;
    if (m.jump && t0 < m.jump[0] && f.mvT >= m.jump[0]) f.vy = m.jump[1];
    if (m.chain && f.mvT >= m.chain.at && pr(m.chain.btn) && !I.d && !backOf()) startMove(f, m.chain.to);
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
  } else if (f.st === 'hit') {
    if (--f.stun <= 0 && !air) setSt(f, 'idle');
  } else if (f.st === 'down') {
    if (f.t >= f.downDur) { setSt(f, 'idle'); f.inv = 30; }
  } else if (f.st === 'grab') {
    updGrab(f, o);
  } else if (f.st === 'held') {
    if (pr('p') || pr('k') || pr('s') || pr('b')) f.mash++;
  }

  if (f.st !== 'held' && f.st !== 'grab') {
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
  if (f.st === 'jump') { setSt(f, 'idle'); emit({ k: 'dust', x: f.x }); emit({ k: 'sfx', n: 'land' }); }
  else if (f.st === 'attack' && f.mv.air) { f.mv = null; f.mvId = null; setSt(f, 'idle'); emit({ k: 'dust', x: f.x }); }
  else if (f.st === 'down' || f.st === 'ko') { emit({ k: 'dust', x: f.x }); emit({ k: 'shake', v: 2 }); }
}

// ---------- Попадания
const canBeHit = d => !['down', 'ko', 'held', 'grab'].includes(d.st) && d.inv <= 0;

function hurt(d, pt) {
  if (!canBeHit(d)) return false;
  const s = d.def.scale;
  const low = d.st === 'crouch' || (d.st === 'block' && d.crouchB);
  const top = d.y - (low ? 42 : 58) * s;
  const hw = 9 * d.def.bulk * s + 3, cx = d.x + d.face * 2 * s;
  return pt[0] >= cx - hw && pt[0] <= cx + hw && pt[1] >= top - 5 && pt[1] <= d.y + 2;
}

function checkHits(a, d) {
  if (a.st !== 'attack') return;
  const m = a.mv;
  if (m.grab && !a.grabbed && a.mvT >= m.grab.s && a.mvT <= m.grab.e) {
    const dx = d.x - a.x;
    if (Math.sign(dx) === a.face && Math.abs(dx) <= m.grab.r * a.def.scale && d.y >= GROUND - 2 && canBeHit(d)) {
      beginGrab(a, d, m.grab.kind);
      return;
    }
  }
  if (!m.hits.length) return;
  const pose = getPose(a);
  m.hits.forEach((h, i) => {
    if (a.hitDone[i] || a.mvT < h.s || a.mvT > h.e) return;
    const pt = jointWorld(a.def, pose, a.x, a.y, a.face, h.limb);
    if (hurt(d, pt)) { a.hitDone[i] = true; applyHit(a, d, h, m, pt); }
  });
}

function applyHit(a, d, h, m, pt) {
  const mul = m.cat === 'p' ? a.def.pMul : m.cat === 'k' ? a.def.kMul : 1;
  let dmg = h.dmg * mul;
  const facing = d.face === Math.sign(a.x - d.x);
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
  } else {
    placePair(a, d, 26 * a.def.scale);
    emit({ k: 'sfx', n: 'grab' });
  }
  a.meter = 0;
}

function updGrab(a, d) {
  a.gt++;
  if (a.gkind === 'gnp') {
    const HITS = 6, START = 20, CYC = 12, k = a.gt - START;
    if (k >= 0 && k % CYC === 6 && k / CYC < HITS) {
      d.hp -= 3.6; d.flash = 3;
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
  d.t = was === 'gnp' ? 12 : 0;
  d.downDur = was === 'gnp' ? 60 : 75;
  if (was !== 'gnp') emit({ k: 'dust', x: d.x });
}

function separate(a, b) {
  const lying = s => ['held', 'grab', 'down', 'ko'].includes(s);
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

// ---------- Бот
const AIP = [
  { blk: 0.18, agg: 0.025, react: 0.3, jump: 0.003, sp: 0.3, combo: 0.1 },
  { blk: 0.42, agg: 0.05, react: 0.6, jump: 0.004, sp: 0.6, combo: 0.35 },
  { blk: 0.68, agg: 0.085, react: 0.85, jump: 0.005, sp: 0.9, combo: 0.7 },
];
function makeAI(diff) { return { diff, plan: 'approach', planT: 0, blockT: 0, lastSeq: -1 }; }

function aiInput(me, op, ai) {
  const I = EMPTY(), P = AIP[ai.diff];
  const dx = op.x - me.x, dist = Math.abs(dx);
  const F = dx > 0 ? 'r' : 'l', B = dx > 0 ? 'l' : 'r';
  const R = Math.random;
  if (me.st === 'held') { if (R() < P.react * 0.35) I[R() < 0.5 ? 'p' : 'k'] = 1; return I; }
  if (['down', 'ko', 'hit', 'grab', 'win'].includes(me.st)) return I;
  if (op.st === 'attack' && op.atkSeq !== ai.lastSeq) {
    ai.lastSeq = op.atkSeq;
    if (dist < 64 && R() < P.blk && !op.mv.grab) ai.blockT = 16 + R() * 14 | 0;
  }
  if (ai.blockT > 0 && me.st !== 'attack' && me.st !== 'jump') { ai.blockT--; I.b = 1; return I; }
  if (me.st === 'attack') {
    if ((me.landed || me.mv.chain) && R() < P.combo * 0.2) I[me.mv.chain ? 'p' : R() < 0.6 ? 'p' : 'k'] = 1;
    return I;
  }
  if (me.st === 'jump') { if (dist < 40 && R() < 0.1) I.k = 1; return I; }
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
    if (v < 0.35) {} else if (v < 0.6) I[F] = 1; else if (v < 0.78) I.d = 1; else if (v < 0.88) { I.d = 1; I[F] = 1; } else I[B] = 1;
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
    case 'held': return f.gkind === 'gnp' ? POSE.down : POSE.guillo;
    case 'grab': {
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
  }
  return POSE.idle;
}

function drawFace(f) {
  const m = f.mv;
  if (f.st === 'attack' && m && m.flip && f.mvT >= m.flip[0] && f.mvT < m.flip[1]) return -f.face;
  return f.face;
}

// ---------- Выход бойцов и ведущий
const WALK_END = 480;
function annState(T) {
  if (T >= 410) return { x: 160 + (T - 410) * 1.6, face: 1, pose: lerpPose(POSE.walk1, POSE.walk2, (Math.sin(T * 0.28) + 1) / 2) };
  const p = POSE.annL.slice(); p[3] += Math.sin(T * 0.1);
  return { x: 160, face: T < 230 ? 1 : -1, pose: p };
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
  const ia = INTRO[a.id] || ['', a.def.name], ib = INTRO[b.id] || ['', b.def.name];
  if (T === 1) {
    emit({ k: 'msg', text: 'ДАМЫ И ГОСПОДА!' });
    emit({ k: 'say', text: 'Дамы и господа! Главный бой вечера!' });
    emit({ k: 'sfx', n: 'crowd' });
  }
  if (T === 50) {
    emit({ k: 'music', n: a.id });
    emit({ k: 'msg', text: 'В КРАСНОМ УГЛУ' });
    emit({ k: 'say', text: 'В красном углу! ' + ia[0] + '! ' + ia[1] + '!' });
  }
  if (T >= 50 && T < 170) walkTo(a, 108);
  if (T === 170) { a.x = 108; a.st = 'win'; a.t = 0; emit({ k: 'msg', text: a.def.name + ' «' + a.def.nick.toUpperCase() + '»', big: 0 }); emit({ k: 'sfx', n: 'crowd' }); }
  if (T === 225) { a.st = 'idle'; a.face = 1; a.t = 0; }
  if (T === 230) {
    emit({ k: 'music', n: b.id });
    emit({ k: 'msg', text: 'В СИНЕМ УГЛУ' });
    emit({ k: 'say', text: 'В синем углу! ' + ib[0] + '! ' + ib[1] + '!' });
  }
  if (T >= 230 && T < 350) walkTo(b, 212);
  if (T === 350) { b.x = 212; b.st = 'win'; b.t = 0; emit({ k: 'msg', text: b.def.name + ' «' + b.def.nick.toUpperCase() + '»' }); emit({ k: 'sfx', n: 'crowd' }); }
  if (T === 405) { b.st = 'idle'; b.face = -1; b.t = 0; }
  if (T === 410) { emit({ k: 'msg', text: 'ДА НАЧНЁТСЯ БИТВА!' }); emit({ k: 'say', text: 'Да начнётся битва!' }); }
  if (T >= WALK_END) endWalkout();
}

function endWalkout() {
  const [a, b] = G.f;
  Object.assign(a, { x: 108, face: 1, st: 'idle', t: 0 });
  Object.assign(b, { x: 212, face: -1, st: 'idle', t: 0 });
  emit({ k: 'hush' });
  emit({ k: 'music', n: 'fight' });
  G.phase = 'intro'; G.phaseT = 0;
}

// ---------- Раунды
function endRound(w, txt) {
  G.phase = 'ko'; G.phaseT = 0; G.winner = w;
  emit({ k: 'msg', text: txt, big: 1 });
  if (txt === 'K.O.!') { emit({ k: 'sfx', n: 'ko' }); G.slow = 60; }
  else emit({ k: 'sfx', n: 'bell' });
}

function phaseLogic() {
  const g = G, [a, b] = g.f;
  g.phaseT++;
  if (g.phase === 'intro') {
    if (g.phaseT === 1) { emit({ k: 'msg', text: g.round === 3 ? 'ФИНАЛЬНЫЙ РАУНД' : 'РАУНД ' + g.round }); emit({ k: 'sfx', n: 'bell' }); }
    if (g.phaseT === 80) emit({ k: 'msg', text: 'БОЙ!', big: 1 });
    if (g.phaseT >= 100) { g.phase = 'fight'; g.phaseT = 0; }
  } else if (g.phase === 'fight') {
    g.timer--;
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
        emit({ k: 'over', w: g.wins[0] > g.wins[1] ? 0 : g.wins[1] > g.wins[0] ? 1 : -1 });
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
  checkHits(a, b); checkHits(b, a);
  separate(a, b);
  a.prev = a.inp; b.prev = b.inp;
  if (g.phase !== 'over') phaseLogic();
  updateParts();
}

// ---------- Онлайн: хост считает бой, гость шлёт кнопки и рисует присланное
const Net = { peer: null, conn: null, role: null };

const snapF = f => [Math.round(f.x * 10) / 10, Math.round(f.y * 10) / 10, f.face, Math.round(f.hp * 10) / 10,
  Math.round(f.meter), f.st, f.mvId || 0, Math.round(f.mvT * 10) / 10, f.t, f.gkind || 0, f.gt, f.flash, f.downDur, f.crouchB ? 1 : 0];

function applySnapF(f, s) {
  let mv, gk, cb;
  [f.x, f.y, f.face, f.hp, f.meter, f.st, mv, f.mvT, f.t, gk, f.gt, f.flash, f.downDur, cb] = s;
  f.mvId = mv || null; f.mv = mv ? MOVES[mv] : null; f.gkind = gk || null; f.crouchB = !!cb;
}

function netSend(o) { try { if (Net.conn && Net.conn.open) Net.conn.send(o); } catch (e) {} }

function onNetData(d) {
  if (!d || !d.t) return;
  if (d.t === 'i' && G && G.mode === 'host') { Net.guestSeen = true; G.remoteHeld = d.v; G.remoteLatch |= d.v; }
  else if (d.t === 's' && G && G.mode === 'guest') {
    applySnapF(G.f[0], d.a); applySnapF(G.f[1], d.b);
    G.timer = d.tm; G.round = d.rd; G.wins = d.w; G.phase = d.ph; G.phaseT = d.pt;
    d.fx.forEach(applyFx);
  } else UI.onNet(d);
}

function cleanupNet() {
  try { Net.conn && Net.conn.close(); } catch (e) {}
  try { Net.peer && Net.peer.destroy(); } catch (e) {}
  Net.peer = Net.conn = Net.role = null;
}

// ---------- Цикл
let paused = false;
function tick() {
  if (!G) return;
  const online = G.mode === 'host' || G.mode === 'guest';
  if (online && Net.lastRx && performance.now() - Net.lastRx > 12000) { UI.netLost(); return; }
  Net.tick = (Net.tick || 0) + 1;
  if (G.mode === 'guest') {
    // кнопки шлём при изменении и раз в 6 кадров для надёжности
    const v = encIn(Input.read());
    if (v !== Net.lastIn || Net.tick % 6 === 0) { netSend({ t: 'i', v }); Net.lastIn = v; }
    updateParts();
    return;
  }
  if (paused) return;
  step();
  if (G.mode === 'host' && Net.tick % 2 === 0) {
    netSend({ t: 's', a: snapF(G.f[0]), b: snapF(G.f[1]), tm: G.timer, rd: G.round, w: G.wins, ph: G.phase, pt: G.phaseT, fx: G.fx });
    G.fx = [];
  }
}

function render(now) {
  const c = ctx;
  c.save();
  if (G && G.shake > 0) {
    c.translate(Math.round((Math.random() - 0.5) * G.shake), Math.round((Math.random() - 0.5) * G.shake));
    G.shake *= 0.85; if (G.shake < 0.5) G.shake = 0;
  }
  const si = G ? G.stage : menuStage;
  drawStageBack(c, si, now);
  if (G) {
    for (const f of G.f) {
      const k = 1 - Math.min(0.5, (GROUND - f.y) / 80);
      const w = Math.round(22 * f.def.scale * f.def.bulk * k);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(Math.round(f.x - w / 2), GROUND - 1, w, 2);
      c.fillRect(Math.round(f.x - w / 2) + 3, GROUND + 1, w - 6, 1);
    }
    if (G.phase === 'walkout') {
      const A = annState(G.phaseT);
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(Math.round(A.x) - 10, GROUND - 1, 20, 2);
      drawFighter(c, ANNOUNCER, A.pose, A.x, GROUND, A.face, { mic: true });
    }
    const pri = f => (['held', 'down', 'ko'].includes(f.st) ? 0 : ['attack', 'grab'].includes(f.st) ? 2 : 1);
    [...G.f].sort((p, q) => pri(p) - pri(q)).forEach(f => {
      drawFighter(c, f.def, getPose(f), f.x, f.y, drawFace(f), { flash: f.flash > 0, hat: f.st === 'win' });
    });
    for (const p of G.parts) {
      c.fillStyle = p.c;
      if (p.star) {
        const r = p.star;
        c.fillRect(Math.round(p.x - r), Math.round(p.y), r * 2 + 1, 1);
        c.fillRect(Math.round(p.x), Math.round(p.y - r), 1, r * 2 + 1);
        c.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 3, 3);
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
  menuStage = Math.random() * STAGES.length | 0;
  newMatch({ mode: 'demo', p1: a, p2: b, stage: menuStage, diff: 1 });
}

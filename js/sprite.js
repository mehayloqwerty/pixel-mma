// Детальные бойцы: рисуем гладкими объёмными формами в большом размере,
// уменьшаем в пиксели, сводим цвета к нескольким тонам и обводим — как ручной пиксель-арт
const SPR = { W: 180, H: 190, OX: 90, OY: 170, SS: 2 };
const sprHi = document.createElement('canvas');
sprHi.width = SPR.W * SPR.SS; sprHi.height = SPR.H * SPR.SS;
const sprLo = document.createElement('canvas');
sprLo.width = SPR.W; sprLo.height = SPR.H;
const hx = sprHi.getContext('2d');
const lx = sprLo.getContext('2d', { willReadFrequently: true });

const rgbOf = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const css = (h, k = 1, a = 1) => {
  const [r, g, b] = rgbOf(h);
  return `rgba(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0},${a})`;
};
const LIGHT = [0.55, -0.83]; // свет спереди сверху
const TAU = Math.PI * 2;
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function capsule(a, b, r0, r1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 0.001;
  const px = -dy / l, py = dx / l, ang = Math.atan2(dy, dx);
  hx.beginPath();
  hx.moveTo(a[0] + px * r0, a[1] + py * r0);
  hx.lineTo(b[0] + px * r1, b[1] + py * r1);
  hx.arc(b[0], b[1], r1, ang + Math.PI / 2, ang - Math.PI / 2, true);
  hx.lineTo(a[0] - px * r0, a[1] - py * r0);
  hx.arc(a[0], a[1], r0, ang - Math.PI / 2, ang + Math.PI / 2, true);
  hx.closePath();
}
const litSide = (a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 0.001;
  let px = -dy / l, py = dx / l;
  if (px * LIGHT[0] + py * LIGHT[1] < 0) { px = -px; py = -py; }
  return [px, py];
};
// часть тела цилиндром: свет сверху-спереди, тень снизу-сзади
function limb(a, b, r0, r1, col) {
  capsule(a, b, r0, r1);
  const [px, py] = litSide(a, b), m = lerp2(a, b, 0.5), r = Math.max(r0, r1);
  const g = hx.createLinearGradient(m[0] + px * r, m[1] + py * r, m[0] - px * r, m[1] - py * r);
  g.addColorStop(0, css(col, 1.32)); g.addColorStop(0.28, css(col, 1.1));
  g.addColorStop(0.62, css(col, 0.9)); g.addColorStop(1, css(col, 0.58));
  hx.fillStyle = g; hx.fill();
}
// мышечный бугор: мягкий блик поверх
function bulge(a, b, t, side, rl, rs, col, k = 1.22) {
  const [px, py] = litSide(a, b), c = lerp2(a, b, t), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  hx.save();
  hx.translate(c[0] + px * side, c[1] + py * side); hx.rotate(ang);
  const g = hx.createRadialGradient(0, 0, 0, 0, 0, rl);
  g.addColorStop(0, css(col, k, 0.9)); g.addColorStop(1, css(col, k, 0));
  hx.fillStyle = g; hx.beginPath(); hx.ellipse(0, 0, rl, rs, 0, 0, TAU); hx.fill();
  hx.restore();
}
function line(pts, col, lw) {
  hx.beginPath(); hx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) hx.lineTo(pts[i][0], pts[i][1]);
  hx.strokeStyle = col; hx.lineWidth = lw; hx.lineCap = 'round'; hx.lineJoin = 'round'; hx.stroke();
}

function foot(ankle, knee, col, shoe) {
  const sx = ankle[0] - knee[0], sy = ankle[1] - knee[1], l = Math.hypot(sx, sy) || 1;
  const ang = Math.atan2(-sx / l, sy / l);
  hx.save(); hx.translate(ankle[0], ankle[1]); hx.rotate(ang);
  hx.beginPath();
  hx.moveTo(-1.6, -1.4); hx.lineTo(1.0, -1.9);
  hx.quadraticCurveTo(4.2, -1.2, 4.6, 0.2); hx.lineTo(4.4, 0.6); hx.lineTo(-1.8, 0.6);
  hx.closePath();
  const g = hx.createLinearGradient(0, -2, 0, 0.6);
  g.addColorStop(0, css(shoe || col, 1.25)); g.addColorStop(1, css(shoe || col, 0.7));
  hx.fillStyle = g; hx.fill();
  if (shoe) { hx.fillStyle = 'rgba(240,240,240,0.9)'; hx.fillRect(-1.8, 0.1, 6.2, 0.5); }
  hx.restore();
}

function glove(hand, elbow, L, colGlove, box) {
  const ang = Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]);
  hx.save(); hx.translate(hand[0], hand[1]); hx.rotate(ang);
  const w = box ? 5.0 : 3.8, h = box ? 4.8 : 3.5, r = box ? 2.0 : 1.2;
  hx.beginPath(); hx.roundRect(-1.4, -h / 2, w, h, r);
  const g = hx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, css(colGlove, box ? 1.5 : 2.6)); g.addColorStop(0.35, css(colGlove, 1.05)); g.addColorStop(1, css(colGlove, 0.55));
  hx.fillStyle = g; hx.fill();
  if (!box) {
    line([[w - 2.2, -h / 2 + 0.6], [w - 2.2, h / 2 - 0.6]], 'rgba(0,0,0,0.6)', 0.25);
    hx.fillStyle = css(L.shorts2 || '#c0262d'); hx.fillRect(-1.6, -h / 2 + 0.2, 0.9, h - 0.4);
  } else {
    hx.fillStyle = '#f2f2f2'; hx.fillRect(-1.8, -h / 2 + 0.4, 0.8, h - 0.8);
  }
  hx.restore();
}

function head(L, o) {
  const skin = L.skin, hair = L.hair, beard = L.beardCol || L.hair;
  // череп и челюсть
  hx.beginPath();
  hx.ellipse(-0.2, -0.7, 4.0, 4.4, 0, 0, TAU);
  hx.moveTo(-3.3, 1.0); hx.lineTo(-1.5, 3.9); hx.quadraticCurveTo(1.2, 5.1, 3.1, 4.2);
  hx.lineTo(3.9, 2.4); hx.lineTo(4.1, 0.1); hx.lineTo(-3.3, 1.0);
  const g = hx.createRadialGradient(1.6, -1.8, 0.5, 0.4, 0, 6.2);
  g.addColorStop(0, css(skin, 1.28)); g.addColorStop(0.45, css(skin, 1.0)); g.addColorStop(1, css(skin, 0.62));
  hx.fillStyle = g; hx.fill();
  // глазница, скула, нос
  hx.fillStyle = css(skin, 0.8); hx.beginPath(); hx.ellipse(2.5, -0.2, 1.3, 0.85, 0, 0, TAU); hx.fill();
  hx.fillStyle = css(skin, 1.22, 0.8); hx.beginPath(); hx.ellipse(2.4, 1.3, 1.2, 0.6, -0.3, 0, TAU); hx.fill();
  hx.beginPath(); hx.moveTo(3.5, -0.9); hx.lineTo(5.2, 1.5); hx.lineTo(3.9, 2.0); hx.closePath();
  hx.fillStyle = css(skin, 1.05); hx.fill();
  hx.fillStyle = css(skin, 0.6); hx.fillRect(3.8, 1.75, 1.0, 0.35);
  // ухо
  hx.fillStyle = css(L.skinD, 1.05); hx.beginPath(); hx.ellipse(-1.1, 0.6, 0.95, 1.45, 0, 0, TAU); hx.fill();
  hx.fillStyle = css(L.skinD, 0.7); hx.beginPath(); hx.ellipse(-1.0, 0.7, 0.4, 0.8, 0, 0, TAU); hx.fill();
  // глаз и бровь
  hx.fillStyle = '#efe7dc'; hx.beginPath(); hx.ellipse(2.65, -0.15, 0.75, 0.4, 0, 0, TAU); hx.fill();
  hx.fillStyle = '#24160f'; hx.beginPath(); hx.arc(3.05, -0.15, 0.36, 0, TAU); hx.fill();
  line([[1.5, -1.25], [2.7, -1.5], [3.8, -1.2]], css(L.hairStyle === 'bald' ? L.skinD : hair, 0.85), 0.7);
  // рот
  if (L.beard !== 'full') {
    line([[2.5, 2.75], [3.75, 2.55]], css(skin, 0.5), 0.35);
    line([[2.7, 3.15], [3.5, 3.05]], css(skin, 1.2), 0.3);
  }
  if (L.tattoo === 'face') {
    line([[1.6, -1.9], [2.3, -2.4], [3.0, -2.0]], 'rgba(20,20,20,0.9)', 0.3);
    line([[1.9, -2.6], [2.6, -3.0]], 'rgba(20,20,20,0.9)', 0.3);
  }
  // борода
  if (L.beard === 'full') {
    hx.beginPath();
    hx.moveTo(-2.5, 0.6); hx.lineTo(-1.7, 4.0); hx.quadraticCurveTo(1.2, 5.8, 3.7, 4.5);
    hx.lineTo(4.1, 2.3); hx.lineTo(3.3, 2.0); hx.lineTo(2.5, 3.2); hx.lineTo(1.0, 2.9); hx.lineTo(-0.5, 1.0);
    hx.closePath();
    const bg = hx.createLinearGradient(0, 0.5, 0, 5.5);
    bg.addColorStop(0, css(beard, 1.35)); bg.addColorStop(1, css(beard, 0.75));
    hx.fillStyle = bg; hx.fill();
    line([[2.1, 2.3], [3.0, 2.0], [4.0, 2.1]], css(beard, 1.1), 0.75);
  } else if (L.beard === 'goatee') {
    hx.beginPath(); hx.moveTo(1.4, 3.3); hx.lineTo(3.4, 3.1); hx.lineTo(3.3, 4.6); hx.lineTo(1.7, 4.9); hx.closePath();
    hx.fillStyle = css(beard, 1.1); hx.fill();
    line([[2.2, 2.3], [3.9, 2.1]], css(beard, 1.1), 0.6);
  } else if (L.beard === 'stubble') {
    hx.beginPath(); hx.moveTo(-2.0, 1.4); hx.lineTo(-1.4, 3.9); hx.quadraticCurveTo(1.2, 5.0, 3.2, 4.2); hx.lineTo(3.6, 2.6); hx.lineTo(0.5, 2.2); hx.closePath();
    hx.fillStyle = 'rgba(30,20,15,0.22)'; hx.fill();
  }
  // волосы
  const hs = L.hairStyle;
  const hg = () => { const g2 = hx.createLinearGradient(0, -5.5, 0, 0); g2.addColorStop(0, css(hair, 1.6)); g2.addColorStop(0.5, css(hair, 1.0)); g2.addColorStop(1, css(hair, 0.7)); return g2; };
  if (hs === 'short' || hs === 'flattop' || hs === 'braids' || hs === 'mullet') {
    hx.beginPath();
    hx.moveTo(3.5, -2.0); hx.quadraticCurveTo(3.1, -5.6, -0.4, -5.4); hx.quadraticCurveTo(-4.6, -4.8, -4.4, -0.4);
    hx.lineTo(-3.4, 1.0); hx.lineTo(-2.3, -0.8); hx.quadraticCurveTo(-0.6, -3.0, 3.5, -2.0);
    if (hs === 'flattop') { hx.moveTo(-3.4, -3.9); hx.lineTo(-3.0, -7.6); hx.lineTo(3.0, -7.6); hx.lineTo(3.3, -3.6); hx.closePath(); }
    if (hs === 'mullet') { hx.moveTo(-3.8, -1.2); hx.lineTo(-5.0, 4.8); hx.lineTo(-2.6, 4.1); hx.lineTo(-2.4, 0.4); hx.closePath(); }
    hx.fillStyle = hg(); hx.fill();
    for (let i = 0; i < 4; i++) line([[-2.6 + i * 1.3, -4.6 + i * 0.1], [-1.6 + i * 1.3, -3.4]], css(hair, 1.7, 0.6), 0.25);
    if (hs === 'braids') for (let i = 0; i < 3; i++) { hx.fillStyle = css(hair, 1.1); hx.beginPath(); hx.ellipse(-4.4 + i * 0.3, -0.5 + i * 1.6, 0.7, 0.9, 0, 0, TAU); hx.fill(); }
  } else if (hs === 'chub') {
    line([[0.8, -4.8], [-1.6, -5.6], [-4.0, -4.4], [-5.2, -1.6], [-4.8, 1.8]], css(hair, 1.2), 1.1);
    hx.fillStyle = 'rgba(255,255,255,0.35)'; hx.beginPath(); hx.ellipse(1.0, -3.6, 1.6, 0.7, -0.3, 0, TAU); hx.fill();
  } else {
    hx.fillStyle = 'rgba(255,255,255,0.3)'; hx.beginPath(); hx.ellipse(1.0, -3.6, 1.6, 0.7, -0.3, 0, TAU); hx.fill();
  }
  if (o.hat && L.hat === 'papakha') {
    hx.beginPath(); hx.roundRect(-4.8, -9.2, 9.4, 6.0, 1.8);
    const pg = hx.createLinearGradient(0, -9.2, 0, -3.2);
    pg.addColorStop(0, '#f6f2ea'); pg.addColorStop(1, '#a89f90');
    hx.fillStyle = pg; hx.fill();
    for (let i = 0; i < 14; i++) {
      hx.fillStyle = i % 2 ? 'rgba(255,255,255,0.7)' : 'rgba(120,110,95,0.5)';
      hx.beginPath(); hx.arc(-4 + (i * 37 % 85) / 10, -8.6 + (i * 53 % 50) / 10, 0.55, 0, TAU); hx.fill();
    }
  }
}

function renderSprite(def, pose, o = {}) {
  const L = def.look, w = def.bulk, suit = L.suit;
  hx.setTransform(1, 0, 0, 1, 0, 0);
  hx.clearRect(0, 0, sprHi.width, sprHi.height);
  const U = 2 * SPR.SS * def.scale;
  hx.setTransform(U, 0, 0, U, SPR.OX * SPR.SS, SPR.OY * SPR.SS);
  const J = {};
  for (let i = 0; i < 10; i++) J[JOINTS[i]] = [pose[i * 2], pose[i * 2 + 1]];
  if (o.rot) { hx.translate(J.hip[0], J.hip[1]); hx.rotate(o.rot); hx.translate(-J.hip[0], -J.hip[1]); }

  const tv = [J.neck[0] - J.hip[0], J.neck[1] - J.hip[1]], tl0 = Math.hypot(tv[0], tv[1]) || 1;
  const up = [tv[0] / tl0, tv[1] / tl0], fw = [-up[1], up[0]];
  const P = (k, f) => [J.hip[0] + up[0] * k + fw[0] * f, J.hip[1] + up[1] * k + fw[1] * f];
  const tl = tl0 - 1;
  const shF = P(tl - 0.6, 2.4 * w), shB = P(tl - 0.4, -2.6 * w);
  const hipF = P(0, 1.6 * w), hipB = P(0, -1.8 * w);
  const skin = L.skin, skinB = L.skinD;
  const legC = suit ? L.pants : skin, armC = suit ? L.suit : skin;
  const thR = 3.1 * w, shinR = 2.2 * w, uaR = 2.3 * w, faR = 1.85 * w;

  const leg = (h, k, f, col, back) => {
    limb(h, k, thR, thR * 0.82, back && !suit ? skinB : col);
    limb(k, f, shinR * 1.05, shinR * 0.7, back && !suit ? skinB : col);
    if (!suit) {
      bulge(h, k, 0.45, thR * 0.25, thR * 1.1, thR * 0.7, back ? skinB : col);
      bulge(k, f, 0.3, -shinR * 0.3, shinR * 1.3, shinR * 0.7, back ? skinB : col, 1.15);
      hx.fillStyle = css(back ? skinB : col, 1.25, 0.7); hx.beginPath(); hx.arc(k[0], k[1], 1.0, 0, TAU); hx.fill();
    }
    foot(f, k, back && !suit ? skinB : col, L.shoes);
    if (!suit) {
      // шорты на бедре
      const m = lerp2(h, k, 0.55);
      limb(h, m, thR + 0.8, thR + 0.6, back ? css2(L.shorts, 0.8) : L.shorts);
      if (!back) { const [px, py] = litSide(h, k); line([[h[0] - px * (thR + 0.4), h[1] - py * (thR + 0.4)], [m[0] - px * (thR + 0.2), m[1] - py * (thR + 0.2)]], css(L.shorts2), 0.6); }
    }
  };
  const arm = (sh, e, hd, col, glv) => {
    limb(sh, e, uaR, uaR * 0.85, col);
    limb(e, hd, faR, faR * 0.78, col);
    if (!suit) {
      bulge(sh, e, 0.5, uaR * 0.25, uaR * 1.2, uaR * 0.75, col);
      bulge(e, hd, 0.3, faR * 0.2, faR * 1.3, faR * 0.7, col, 1.15);
      bulge(sh, e, 0.08, 0, uaR * 1.0, uaR * 0.9, col, 1.12);
      glove(hd, e, L, glv, L.boxing);
    } else {
      hx.fillStyle = css(L.skin); hx.beginPath(); hx.arc(hd[0], hd[1], 1.3, 0, TAU); hx.fill();
      hx.fillStyle = '#f2f2f2'; hx.beginPath(); hx.arc(lerp2(e, hd, 0.86)[0], lerp2(e, hd, 0.86)[1], faR * 0.85, 0, TAU); hx.fill();
    }
  };

  // задние конечности
  leg(hipB, J.bk, J.bf, legC, true);
  arm(shB, J.be, J.bh, suit ? css2(L.suit, 0.85) : skinB, css2(L.gloves, 0.8));

  // торс
  hx.beginPath();
  const pt = (k, f) => P(k, f * w);
  let q = pt(-1.2, -4.6); hx.moveTo(q[0], q[1]);
  q = pt(-1.2, 4.4); hx.lineTo(q[0], q[1]);
  let c1 = pt(tl * 0.3, 5.2), q2 = pt(tl * 0.58, 5.0); hx.quadraticCurveTo(c1[0], c1[1], q2[0], q2[1]);
  c1 = pt(tl * 0.8, 6.0); q2 = pt(tl - 0.2, 4.0); hx.quadraticCurveTo(c1[0], c1[1], q2[0], q2[1]);
  q = pt(tl + 1.0, 0.6); hx.lineTo(q[0], q[1]);
  q = pt(tl + 0.4, -3.4); hx.lineTo(q[0], q[1]);
  c1 = pt(tl * 0.82, -6.6); q2 = pt(tl * 0.45, -5.2); hx.quadraticCurveTo(c1[0], c1[1], q2[0], q2[1]);
  q = pt(-1.2, -4.6); hx.lineTo(q[0], q[1]);
  hx.closePath();
  const tCol = suit ? L.suit : skin;
  const ga = pt(tl * 0.55, 6.4), gb = pt(tl * 0.55, -6.6);
  const tg = hx.createLinearGradient(ga[0], ga[1], gb[0], gb[1]);
  tg.addColorStop(0, css(tCol, 1.3)); tg.addColorStop(0.3, css(tCol, 1.05)); tg.addColorStop(0.7, css(tCol, 0.85)); tg.addColorStop(1, css(tCol, 0.6));
  hx.fillStyle = tg; hx.fill();

  if (!suit) {
    const dk = css(skin, 0.68, 0.85);
    // грудь
    bulge(pt(tl * 0.78, 1.2), pt(tl * 0.78, 5.0), 0.5, 0.3, 2.6 * w, 1.9, skin, 1.25);
    line([pt(tl * 0.63, 0.6), pt(tl * 0.6, 3.0), pt(tl * 0.68, 5.0)], dk, 0.45);
    hx.fillStyle = css(skin, 0.55); { const n = pt(tl * 0.68, 3.4); hx.beginPath(); hx.arc(n[0], n[1], 0.32, 0, TAU); hx.fill(); }
    // пресс: кубики со светом сверху и тенью снизу
    for (const kk of [0.46, 0.33, 0.2]) for (const ff of [1.5, 3.4]) {
      const cc = pt(tl * kk + 0.6, ff);
      hx.fillStyle = css(skin, 1.2, 0.7); hx.beginPath(); hx.ellipse(cc[0], cc[1], 0.85 * w, 0.7, 0, 0, TAU); hx.fill();
      line([pt(tl * kk, ff - 0.9), pt(tl * kk, ff + 0.9)], dk, 0.3);
    }
    line([pt(tl * 0.12, 2.5), pt(tl * 0.55, 2.4)], dk, 0.3);
    line([pt(tl * 0.08, 4.4), pt(tl * 0.5, 4.9)], css(skin, 0.75, 0.6), 0.35);
    // спина/широчайшая
    line([pt(tl * 0.35, -4.4), pt(tl * 0.75, -5.2)], css(skin, 0.6, 0.7), 0.4);
    if (L.tattoo === 'chest') {
      line([pt(tl * 0.82, 1.0), pt(tl * 0.86, 2.6), pt(tl * 0.8, 4.0)], 'rgba(30,70,50,0.85)', 0.45);
      line([pt(tl * 0.45, 2.0), pt(tl * 0.5, 3.2)], 'rgba(30,70,50,0.85)', 0.35);
    }
    // шорты на поясе
    hx.beginPath();
    q = pt(-2.0, -5.0); hx.moveTo(q[0], q[1]);
    q = pt(-2.0, 5.0); hx.lineTo(q[0], q[1]);
    q = pt(4.2, 4.6); hx.lineTo(q[0], q[1]);
    q = pt(4.2, -4.8); hx.lineTo(q[0], q[1]);
    hx.closePath();
    const sa = pt(1, 6), sb = pt(1, -6);
    const sg = hx.createLinearGradient(sa[0], sa[1], sb[0], sb[1]);
    sg.addColorStop(0, css(L.shorts, 1.6)); sg.addColorStop(0.4, css(L.shorts, 1.05)); sg.addColorStop(1, css(L.shorts, 0.6));
    hx.fillStyle = sg; hx.fill();
    line([pt(4.0, -4.8), pt(4.0, 4.7)], css(L.shorts2), 1.1);
    line([pt(0.5, 1.2), pt(-1.2, 2.2)], 'rgba(0,0,0,0.3)', 0.35);
  } else {
    // рубашка, лацканы и бабочка
    hx.beginPath(); q = pt(tl * 0.45, 2.2); hx.moveTo(q[0], q[1]); q = pt(tl + 0.6, 0.6); hx.lineTo(q[0], q[1]); q = pt(tl + 0.6, 3.6); hx.lineTo(q[0], q[1]); hx.closePath();
    hx.fillStyle = '#f2f2f2'; hx.fill();
    hx.fillStyle = '#a01818'; q = pt(tl - 0.2, 2.2); hx.beginPath(); hx.ellipse(q[0], q[1], 1.2, 0.6, 0, 0, TAU); hx.fill();
    line([pt(tl * 0.45, 2.2), pt(tl - 0.4, 4.4)], css(L.suit, 1.8), 0.4);
    hx.fillStyle = '#ddd'; q = pt(tl * 0.25, 3.2); hx.beginPath(); hx.arc(q[0], q[1], 0.35, 0, TAU); hx.fill();
  }

  // передняя нога
  leg(hipF, J.fk, J.ff, legC, false);

  // шея и голова
  const hc = [J.neck[0] + up[0] * 4.4, J.neck[1] + up[1] * 4.4];
  limb(P(tl - 1.2, 0.2), [J.neck[0] + up[0] * 1.6, J.neck[1] + up[1] * 1.6], 1.9 * w, 1.7 * w, skin);
  hx.save(); hx.translate(hc[0], hc[1]); hx.rotate(Math.atan2(up[1], up[0]) + Math.PI / 2);
  head(L, o);
  hx.restore();

  // передняя рука
  arm(shF, J.fe, J.fh, armC, L.gloves);
  if (o.mic) {
    hx.save(); hx.translate(J.fh[0], J.fh[1]);
    hx.fillStyle = '#111'; hx.fillRect(-0.4, -3.2, 0.9, 3.0);
    hx.fillStyle = '#9a9aa6'; hx.beginPath(); hx.arc(0, -3.6, 0.9, 0, TAU); hx.fill();
    hx.restore();
  }

  // в пиксели: уменьшаем, сводим тона, обводим
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.clearRect(0, 0, SPR.W, SPR.H);
  lx.imageSmoothingEnabled = true; lx.imageSmoothingQuality = 'high';
  lx.drawImage(sprHi, 0, 0, SPR.W, SPR.H);
  const img = lx.getImageData(0, 0, SPR.W, SPR.H), d = img.data, N = SPR.W * SPR.H;
  const op = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const j = i * 4;
    if (d[j + 3] < 115) { d[j + 3] = 0; continue; }
    op[i] = 1;
    const a = d[j + 3] / 255;
    if (o.flash) { d[j] = d[j + 1] = d[j + 2] = 255; d[j + 3] = 255; continue; }
    for (let c = 0; c < 3; c++) d[j + c] = Math.min(255, Math.round(d[j + c] / a / 20) * 20);
    d[j + 3] = 255;
  }
  const W = SPR.W;
  for (let y = 1; y < SPR.H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (op[i]) continue;
    const n = op[i - 1] ? i - 1 : op[i + 1] ? i + 1 : op[i - W] ? i - W : op[i + W] ? i + W : -1;
    if (n < 0) continue;
    const j = i * 4, k = n * 4;
    d[j] = d[k] * 0.28; d[j + 1] = d[k + 1] * 0.22; d[j + 2] = d[k + 2] * 0.26; d[j + 3] = 255;
  }
  lx.putImageData(img, 0, 0);
  return sprLo;
}
const css2 = (h, k) => { const [r, g, b] = rgbOf(h); return '#' + [r, g, b].map(v => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0')).join(''); };

// X/Y — точка между ступнями в пикселях экрана (уже умноженных на масштаб)
function drawFighterHD(ctx, def, pose, X, Y, face, o = {}) {
  const c = renderSprite(def, pose, o);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(X), Math.round(Y));
  ctx.scale(face, 1);
  ctx.drawImage(c, -SPR.OX, -SPR.OY);
  ctx.restore();
}

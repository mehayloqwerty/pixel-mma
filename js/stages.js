// Пиксельные арены: статичный слой рисуется один раз, анимация — каждый кадр
const SW = 320, SH = 180;

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
function ditherBands(ctx, y0, y1, cols, x0 = 0, x1 = SW) {
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / Math.max(1, y1 - y0 - 1) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(f)), fr = f - i;
    for (let x = x0; x < x1; x++) {
      ctx.fillStyle = fr * 16 > BAYER[y & 3][x & 3] ? cols[i + 1] : cols[i];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

// крошечный пиксельный шрифт 3x5
const GLYPH = {
  A: '010101111101101', C: '011100100100011', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101',
  L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', X: '101101010101101', Y: '101101010010010', 2: '110001010100111',
  4: '101101111001001', 7: '111001010010010', '/': '001001010100100', '!': '010010010000010', ' ': '000000000000000',
};
function ptext(c, str, x, y, col, sc = 1) {
  c.fillStyle = col;
  for (const ch of str) {
    const g = GLYPH[ch] || GLYPH[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') c.fillRect(x + (i % 3) * sc, y + Math.floor(i / 3) * sc, sc, sc);
    x += 4 * sc;
  }
}

function mountainLine(r, base, amp, rough) {
  const h = [];
  let v = base, target = base;
  for (let x = 0; x < SW; x++) {
    if (x % rough === 0) target = base - r() * amp;
    v += (target - v) * 0.18;
    h.push(Math.round(v + (r() - 0.5) * 1.2));
  }
  return h;
}

const STAGES = [
  // ---------- ОКТАГОН
  {
    id: 'octagon', name: 'ОКТАГОН',
    build(back, mid, st) {
      const r = rng(7);
      ditherBands(back, 0, 152, ['#04040a', '#0b0a18', '#151229', '#1e1836', '#282240']);
      // фермы под крышей
      rect(back, 0, 6, SW, 2, '#2a2840'); rect(back, 0, 16, SW, 2, '#2a2840');
      for (let x = 0; x < SW; x += 12) { back.fillStyle = '#211f33'; for (let i = 0; i < 10; i++) back.fillRect(x + i, 8 + i * 0.8 | 0, 1, 1); }
      // трибуны
      for (let y = 58; y < 122; y += 9) rect(back, 0, y, SW, 1, '#17142a');
      // табло
      rect(back, 124, 20, 72, 30, '#2f2e46'); rect(back, 126, 22, 68, 26, '#07070d');
      st.crowd = [];
      const pal = ['#3b2f4f', '#4a3446', '#2f3a52', '#523a3a', '#3e3e3e', '#4b4258'];
      for (let row = 0; row < 7; row++) {
        const y = 62 + row * 9;
        for (let x = (row & 1) * 3; x < SW; x += 5 + (r() * 3 | 0)) {
          st.crowd.push({ x, y, c: shade(pal[r() * pal.length | 0], 0.55 + row * 0.08), ph: r() * 6.28, cheer: r() < 0.3 });
        }
      }
      st.flashes = [];
      // прожекторы
      mid.globalAlpha = 0.07; mid.fillStyle = '#d8d6ff';
      [50, 125, 195, 270].forEach(x => {
        mid.beginPath(); mid.moveTo(x - 4, 0); mid.lineTo(x + 4, 0); mid.lineTo(x + 34, 160); mid.lineTo(x - 34, 160); mid.fill();
      });
      mid.globalAlpha = 1;
      // сетка клетки
      mid.fillStyle = 'rgba(165,170,205,0.26)';
      for (let k = -80; k < SW + 80; k += 7) {
        for (let i = 0; i < 64; i++) { mid.fillRect(k + i, 88 + i, 1, 1); mid.fillRect(k + 64 - i, 88 + i, 1, 1); }
      }
      rect(mid, 0, 82, SW, 6, '#0d0d14'); rect(mid, 0, 83, SW, 3, '#23348c');
      [0, 106, 212, 316].forEach(x => { rect(mid, x - 3, 82, 7, 70, '#09090f'); rect(mid, x - 2, 82, 5, 14, '#23348c'); });
      // мат
      ditherBands(mid, 150, 180, ['#7f7f8c', '#a2a2ae', '#c3c3cc']);
      mid.fillStyle = '#8a1f2b';
      for (let x = 0; x < SW; x++) { const y = 166 + Math.round(Math.sin(x / SW * Math.PI) * -5); mid.fillRect(x, y, 1, 1); }
      for (let a = 0; a < 6.28; a += 0.01) mid.fillRect(160 + Math.cos(a) * 46 | 0, 165 + Math.sin(a) * 8 | 0, 1, 1);
      ptext(mid, 'PML', 148, 161, '#8a1f2b', 2);
      rect(mid, 0, 150, SW, 1, '#5f5f6c');
      rect(mid, 0, 176, SW, 4, '#121219');
    },
    anim(c, t, st) {
      for (const p of st.crowd) {
        const bob = p.cheer && Math.sin(t * 0.012 + p.ph) > 0.4 ? -1 : 0;
        c.fillStyle = p.c;
        c.fillRect(p.x, p.y + bob, 3, 3);
        c.fillRect(p.x - 1, p.y + 3 + bob, 5, 4);
        if (p.cheer && bob) c.fillRect(p.x - 2, p.y - 2 + bob, 1, 3);
      }
      if (Math.random() < 0.08) { const p = st.crowd[Math.random() * st.crowd.length | 0]; st.flashes.push({ x: p.x, y: p.y, l: 4 }); }
      st.flashes = st.flashes.filter(f => f.l-- > 0);
      for (const f of st.flashes) { rect(c, f.x - 1, f.y - 1, 4, 4, 'rgba(255,255,255,0.35)'); rect(c, f.x, f.y, 2, 2, '#fff'); }
      // табло
      const hue = (t * 0.03) % 360;
      c.fillStyle = `hsl(${hue},70%,22%)`; c.fillRect(126, 22, 68, 26);
      ptext(c, 'FIGHT', 140, 27, '#ffd85a', 2);
      if ((t / 400 | 0) % 2) ptext(c, 'PIXEL MMA', 143, 41, '#fff');
      else ptext(c, 'LIGA', 152, 41, '#fff');
    },
  },
  // ---------- ГОРЫ
  {
    id: 'mountains', name: 'ГОРЫ ДАГЕСТАНА',
    build(back, mid, st) {
      const r = rng(21);
      rect(back, 0, 96, SW, 40, '#f9b45f');
      ditherBands(back, 0, 98, ['#1b1340', '#3d1f5c', '#7a2f6e', '#c4486a', '#ef7d5a', '#f9b45f']);
      for (let i = 0; i < 40; i++) rect(back, r() * SW | 0, r() * 30 | 0, 1, 1, '#c9b8ff');
      // солнце с полосками
      const cols = ['#fff3b0', '#ffe08a', '#ffc46a', '#ffa057', '#ff8a4c'];
      for (let y = -22; y <= 22; y++) {
        if (y > 4 && (y % 5 === 0 || (y > 12 && y % 5 === 1))) continue;
        const w = Math.round(Math.sqrt(22 * 22 - y * y));
        rect(back, 236 - w, 66 + y, w * 2, 1, cols[Math.min(4, (y + 22) / 9 | 0)]);
      }
      const far = mountainLine(r, 100, 30, 14);
      far.forEach((h, x) => { rect(back, x, h, 1, 130 - h, '#5a2b63'); if (h < 84) rect(back, x, h, 1, Math.min(4, 86 - h), '#f0cfe0'); });
      const midL = mountainLine(r, 116, 26, 22);
      midL.forEach((h, x) => { rect(back, x, h, 1, 150 - h, '#3a1d4a'); rect(back, x, h, 1, 1, '#7a3a6e'); });
      // аул
      for (let i = 0; i < 9; i++) {
        const x = 30 + i * 30 + (r() * 10 | 0), y = midL[Math.min(SW - 1, x + 4)] + 2;
        rect(back, x, y, 9, 6, '#2a1436'); rect(back, x - 1, y - 1, 11, 1, '#4f2a55');
        if (r() < 0.8) rect(back, x + 2 + (r() * 4 | 0), y + 2, 1, 1, '#ffcf5a');
      }
      const near = mountainLine(r, 140, 12, 30);
      near.forEach((h, x) => rect(back, x, h, 1, 160 - h, '#22122c'));
      // плато
      ditherBands(back, 150, 180, ['#3a2833', '#2c1e27', '#1d141b']);
      for (let x = 0; x < SW; x++) if (r() < 0.5) rect(back, x, 149 - (r() * 3 | 0), 1, 2, r() < 0.5 ? '#55703a' : '#3d5a2c');
      for (let i = 0; i < 18; i++) rect(back, r() * SW | 0, 156 + r() * 22 | 0, 2 + (r() * 3 | 0), 1, '#4a3540');
      st.clouds = [0, 1, 2, 3].map(i => ({ x: r() * 360, y: 20 + i * 12 + r() * 8, w: 18 + r() * 20 | 0, sp: 0.004 + r() * 0.006 }));
    },
    anim(c, t, st) {
      for (const cl of st.clouds) {
        const x = Math.round((cl.x + t * cl.sp) % 380) - 40;
        rect(c, x, cl.y, cl.w, 3, '#f4a3a0'); rect(c, x + 4, cl.y - 2, cl.w - 10, 2, '#f8c1b4');
        rect(c, x + 2, cl.y + 3, cl.w - 4, 1, '#c76c86');
      }
      const ex = Math.round((t * 0.025) % 420) - 50, ey = Math.round(42 + Math.sin(t * 0.002) * 6);
      const fl = (t / 160 | 0) % 2;
      c.fillStyle = '#1a0f1f';
      c.fillRect(ex, ey, 3, 2);
      if (fl) { c.fillRect(ex - 4, ey - 2, 4, 1); c.fillRect(ex + 3, ey - 2, 4, 1); c.fillRect(ex - 2, ey - 1, 2, 1); c.fillRect(ex + 3, ey - 1, 2, 1); }
      else { c.fillRect(ex - 4, ey + 1, 4, 1); c.fillRect(ex + 3, ey + 1, 4, 1); }
    },
  },
  // ---------- ПОДВАЛ
  {
    id: 'gym', name: 'ПОДВАЛЬНЫЙ ЗАЛ',
    build(back, mid, st) {
      const r = rng(5);
      rect(back, 0, 0, SW, 150, '#2a1512');
      const bricks = ['#5c2a22', '#542620', '#63302a', '#4d221d', '#5a2c24'];
      for (let y = 0, row = 0; y < 150; y += 7, row++) {
        for (let x = (row & 1) ? -7 : 0; x < SW; x += 14) {
          rect(back, x, y, 13, 6, bricks[r() * bricks.length | 0]);
          rect(back, x, y, 13, 1, 'rgba(255,200,170,0.08)');
        }
      }
      // затемнение сверху
      back.fillStyle = '#000';
      for (let y = 0; y < 50; y++) for (let x = 0; x < SW; x++) if ((1 - y / 50) * 16 > BAYER[y & 3][x & 3] + 2) back.fillRect(x, y, 1, 1);
      // окно
      rect(back, 138, 12, 44, 24, '#1c1c22'); rect(back, 140, 14, 40, 20, '#1a2a4a');
      rect(back, 168, 17, 5, 5, '#d8e2ff');
      for (let x = 146; x < 180; x += 7) rect(back, x, 14, 1, 20, '#26262e');
      // постеры
      rect(back, 36, 44, 28, 38, '#c9b27a'); rect(back, 40, 48, 20, 16, '#9a2020'); ptext(back, 'FIGHT', 38, 68, '#2a1a10'); ptext(back, 'N 7', 42, 75, '#2a1a10');
      rect(back, 250, 40, 30, 40, '#2a4a8a'); ptext(back, 'MMA', 259, 46, '#ffd85a'); rect(back, 256, 56, 18, 16, '#d8d8d8'); rect(back, 262, 58, 6, 6, '#3a2a20');
      // трубы
      rect(back, 0, 3, SW, 4, '#4a4a52'); rect(back, 0, 3, SW, 1, '#6a6a74');
      rect(back, 302, 0, 4, 150, '#44444c');
      // пол
      ditherBands(back, 150, 180, ['#6b4426', '#5a3820', '#3e2716']);
      for (let y = 150; y < 180; y += 5) rect(back, 0, y, SW, 1, '#3a2414');
      for (let i = 0; i < 40; i++) rect(back, r() * SW | 0, 150 + (r() * 6 | 0) * 5, 1, 5, '#3a2414');
      rect(back, 0, 149, SW, 1, '#1a0e0a');
      st.dust = Array.from({ length: 24 }, () => ({ x: r() * SW, y: r() * 140, sp: 0.002 + r() * 0.004 }));
      st.flick = 0;
    },
    anim(c, t, st) {
      // лампы
      if (st.flick > 0) st.flick--; else if (Math.random() < 0.01) st.flick = 6 + Math.random() * 10 | 0;
      const a = st.flick > 0 && (st.flick & 2) ? 0.03 : 0.11;
      [80, 240].forEach(x => {
        rect(c, x, 0, 1, 24, '#111'); rect(c, x - 5, 24, 11, 3, '#2a2a2a'); rect(c, x - 3, 27, 7, 1, st.flick && (st.flick & 2) ? '#555' : '#fff3b0');
        c.globalAlpha = a; c.fillStyle = '#ffe9a8';
        c.beginPath(); c.moveTo(x - 4, 27); c.lineTo(x + 4, 27); c.lineTo(x + 50, 160); c.lineTo(x - 50, 160); c.fill();
        c.globalAlpha = 1;
      });
      for (const d of st.dust) {
        const y = (d.y + t * d.sp) % 140, x = d.x + Math.sin(t * 0.001 + d.y) * 4;
        rect(c, x | 0, y | 0, 1, 1, 'rgba(255,240,200,0.5)');
      }
      // груши
      [22, 296].forEach((x, i) => {
        const ang = Math.sin(t * 0.0018 + i * 2) * 0.07;
        const tx = x + Math.sin(ang) * 40, ty = 40;
        seg(c, x, 0, tx, ty, 1, '#777');
        const bx = tx + Math.sin(ang) * 46, by = ty + Math.cos(ang) * 46;
        seg(c, tx, ty, bx, by, 14, '#120808');
        seg(c, tx, ty + 1, bx, by - 1, 12, '#8a1f1f');
        seg(c, tx + Math.sin(ang) * 18, ty + 18, tx + Math.sin(ang) * 22, ty + 22, 12, '#1a1a1a');
        seg(c, tx - 3, ty + 4, bx - 3, by - 4, 2, '#a83434');
      });
    },
  },
  // ---------- НОЧНОЙ ГОРОД
  {
    id: 'city', name: 'НОЧНАЯ КРЫША',
    build(back, mid, st) {
      const r = rng(77);
      ditherBands(back, 0, 140, ['#03040c', '#070b22', '#0f1538', '#1c1f4f', '#2b2457']);
      st.stars = Array.from({ length: 50 }, () => ({ x: r() * SW | 0, y: r() * 70 | 0, p: r() * 6 }));
      // луна
      for (let y = -10; y <= 10; y++) { const w = Math.round(Math.sqrt(100 - y * y)); rect(back, 60 - w, 30 + y, w * 2, 1, '#f2eccf'); }
      rect(back, 56, 26, 3, 3, '#d8d0b0'); rect(back, 63, 33, 4, 3, '#d8d0b0'); rect(back, 58, 35, 2, 2, '#d8d0b0');
      // дальние дома
      for (let x = -5; x < SW;) {
        const w = 14 + r() * 18 | 0, h = 40 + r() * 50 | 0, y = 140 - h;
        rect(back, x, y, w, h, '#141836');
        for (let wy = y + 4; wy < 136; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4)
          rect(back, wx, wy, 2, 2, r() < 0.3 ? '#d9b453' : '#1e2350');
        x += w + 2;
      }
      // ближние дома по краям
      [[0, 46, 70], [274, 46, 54]].forEach(([x, w, y]) => {
        rect(back, x, y, w, 140 - y, '#0a0c1e');
        for (let wy = y + 6; wy < 136; wy += 8) for (let wx = x + 4; wx < x + w - 4; wx += 7)
          rect(back, wx, wy, 3, 4, r() < 0.45 ? '#f2d36b' : '#121530');
      });
      // антенна
      rect(back, 296, 14, 1, 40, '#3a3a4a'); rect(back, 292, 24, 9, 1, '#3a3a4a');
      // крыша
      rect(back, 0, 138, SW, 12, '#24242e'); rect(back, 0, 138, SW, 2, '#3a3a48');
      for (let x = 0; x < SW; x += 24) rect(back, x, 140, 1, 10, '#1a1a22');
      ditherBands(back, 150, 180, ['#24242f', '#1c1c26', '#14141c']);
      st.puddles = [[60, 166, 34], [196, 172, 44], [270, 160, 22]];
      st.puddles.forEach(([x, y, w]) => rect(back, x, y, w, 3, '#262a4e'));
      st.rain = Array.from({ length: 80 }, () => ({ x: r() * 360, y: r() * 200, sp: 0.18 + r() * 0.08 }));
    },
    anim(c, t, st) {
      for (const s of st.stars) if (Math.sin(t * 0.003 + s.p) > -0.3) rect(c, s.x, s.y, 1, 1, '#aab0ff');
      const on1 = !(Math.random() < 0.04), on2 = Math.sin(t * 0.004) > -0.8;
      rect(c, 6, 82, 34, 13, '#0d0d1a');
      ptext(c, 'GYM', 12, 85, on1 ? '#ff4fb4' : '#4a1a38', 2);
      rect(c, 278, 74, 40, 12, '#0d0d1a');
      ptext(c, '24/7', 282, 77, on2 ? '#4ff0ff' : '#18404a', 2);
      st.puddles.forEach(([x, y, w], i) => {
        rect(c, x + 3, y + 1, w - 6, 1, i === 1 ? (on2 ? '#3b6f8a' : '#2a3050') : (on1 ? '#7a3b6a' : '#2a3050'));
      });
      if ((t / 500 | 0) % 2) rect(c, 295, 12, 3, 3, '#ff3030');
    },
    front(c, t, st) {
      c.fillStyle = 'rgba(140,160,230,0.45)';
      for (const d of st.rain) {
        const y = (d.y + t * d.sp) % 200 - 10, x = (d.x - y * 0.25 + 400) % 360 - 20;
        c.fillRect(x | 0, y | 0, 1, 4);
      }
    },
  },
];

STAGES.length = 1; // оставлен только октагон

const stageCache = {};
function stageLayers(i) {
  if (stageCache[i]) return stageCache[i];
  const mk = () => { const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; return cv; };
  const back = mk(), mid = mk(), st = {};
  rect(back.getContext('2d'), 0, 0, SW, SH, '#06060d');
  STAGES[i].build(back.getContext('2d'), mid.getContext('2d'), st);
  return (stageCache[i] = { back, mid, st });
}

function drawStageBack(c, i, t) {
  const L = stageLayers(i);
  c.drawImage(L.back, 0, 0);
  STAGES[i].anim(c, t, L.st);
  c.drawImage(L.mid, 0, 0);
}
function drawStageFront(c, i, t) {
  const S = STAGES[i];
  if (S.front) S.front(c, t, stageLayers(i).st);
}

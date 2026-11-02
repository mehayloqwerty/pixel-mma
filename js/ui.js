// Меню, выбор бойца, HUD, клавиатура и джойстик
const $ = id => document.getElementById(id);
const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------- Ввод
const Input = (() => {
  const kb = {}, touch = EMPTY(), tapped = {};
  const MAP = {
    ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
    KeyJ: 'p', KeyZ: 'p', KeyK: 'k', KeyX: 'k', KeyL: 's', KeyC: 's', Space: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyV: 'b',
  };
  addEventListener('keydown', e => {
    if (e.code === 'Escape' || e.code === 'KeyP') { UI.togglePause(); return; }
    const k = MAP[e.code];
    if (k && G && G.mode !== 'demo') { kb[k] = 1; tapped[k] = 1; e.preventDefault(); }
  });
  addEventListener('keyup', e => { const k = MAP[e.code]; if (k) kb[k] = 0; });
  addEventListener('blur', () => { for (const k in kb) kb[k] = 0; });

  // джойстик
  const stick = $('stick'), knob = $('knob');
  let sid = null;
  const setStick = (dx, dy) => {
    const r = stick.clientWidth / 2, len = Math.hypot(dx, dy), m = Math.min(len, r * 0.6);
    const nx = len ? dx / len : 0, ny = len ? dy / len : 0;
    knob.style.transform = `translate(${nx * m}px, ${ny * m}px)`;
    const vx = dx / r, vy = dy / r;
    touch.l = vx < -0.32 ? 1 : 0; touch.r = vx > 0.32 ? 1 : 0;
    touch.u = vy < -0.5 ? 1 : 0; touch.d = vy > 0.45 ? 1 : 0;
  };
  const stickMove = e => {
    if (e.pointerId !== sid) return;
    const b = stick.getBoundingClientRect();
    setStick(e.clientX - b.left - b.width / 2, e.clientY - b.top - b.height / 2);
  };
  stick.addEventListener('pointerdown', e => { sid = e.pointerId; stick.setPointerCapture(sid); stickMove(e); e.preventDefault(); });
  stick.addEventListener('pointermove', stickMove);
  const stickEnd = e => { if (e.pointerId === sid) { sid = null; setStick(0, 0); } };
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);

  // iPhone приближает страницу от частых касаний — запрещаем
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = performance.now();
    if (document.body.classList.contains('fighting') && now - lastTouch < 450) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || document.body.classList.contains('fighting')) e.preventDefault(); }, { passive: false });
  $('touch').addEventListener('touchstart', e => e.preventDefault(), { passive: false });

  document.querySelectorAll('.tb').forEach(b => {
    const k = b.dataset.k;
    const on = e => { touch[k] = 1; tapped[k] = 1; b.classList.add('on'); e.preventDefault(); if (navigator.vibrate) navigator.vibrate(8); };
    const off = () => { touch[k] = 0; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });

  return {
    // короткое нажатие между кадрами всё равно засчитывается один кадр
    read() {
      const I = EMPTY();
      for (const k of KEYS8) { I[k] = kb[k] || touch[k] || tapped[k] ? 1 : 0; tapped[k] = 0; }
      return I;
    },
    clear() { for (const k in kb) kb[k] = 0; for (const k of KEYS8) { touch[k] = 0; tapped[k] = 0; } setStick(0, 0); },
  };
})();

// ---------- Экраны
const Flow = { mode: 'bot', p1: 'khabib', p2: 'mcgregor', stage: 0, diff: 1, room: null };
try { const s = JSON.parse(localStorage.getItem('pml_flow') || '{}'); Object.assign(Flow, s, { room: null }); } catch (e) {}
const saveFlow = () => { try { localStorage.setItem('pml_flow', JSON.stringify({ p1: Flow.p1, p2: Flow.p2, stage: Flow.stage, diff: Flow.diff })); } catch (e) {} };

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id));
  if (id === 's-menu') Sound.music('menu');
}

// ---------- Полный экран (на iPhone — через «На экран Домой»)
const fsEl = document.documentElement;
const canFS = !!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen);
const isFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone;
let wantFS = true;
function goFullscreen(force) {
  if (!canFS || isFS() || standalone || (!force && !wantFS)) return;
  try {
    const r = (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen).call(fsEl, { navigationUI: 'hide' });
    if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
  } catch (e) {}
}
function toggleFS() {
  if (isFS()) { wantFS = false; (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
  else if (canFS) { wantFS = true; goFullscreen(true); }
  else { UI.togglePause(true); show('s-ios'); }
}
function hideScreens() { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); }

function toMenu() {
  cleanupNet();
  paused = false;
  history.replaceState(null, '', location.pathname);
  $('hud').classList.add('hidden');
  document.body.classList.remove('fighting');
  $('touch').classList.add('hidden');
  startDemo();
  Sound.music('menu');
  show('s-menu');
}

// ---------- Выбор бойца
let selCb = null, selBack = null, selIdx = 0, prevAnim = null;

function buildGrid() {
  const grid = $('grid');
  ROSTER.forEach((f, i) => {
    const card = document.createElement('button');
    card.className = 'card';
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#1b1830'; x.fillRect(0, 0, 40, 40);
    drawFighter(x, f, POSE.idle, 17, 40 + 50 * f.scale - 50 + 26, 1, {});
    card.appendChild(c);
    const n = document.createElement('span'); n.textContent = f.name; card.appendChild(n);
    card.onclick = () => { if (selIdx === i) $('selOk').click(); else pickCard(i); };
    grid.appendChild(card);
  });
}

function pickCard(i) {
  selIdx = i;
  document.querySelectorAll('.card').forEach((c, j) => c.classList.toggle('sel', i === j));
  const f = ROSTER[i];
  $('iName').textContent = f.name + ' ' + f.flag;
  $('iNick').textContent = '«' + f.nick + '»';
  const lbl = { pow: 'СИЛА', spd: 'СКОРОСТЬ', grap: 'БОРЬБА', reach: 'ДИСТАНЦИЯ' };
  $('iStats').innerHTML = Object.entries(f.stats).map(([k, v]) =>
    `<div class="st"><b>${lbl[k]}</b><span>${'<i class="on"></i>'.repeat(v)}${'<i></i>'.repeat(10 - v)}</span></div>`).join('');
  $('iStyle').textContent = f.style;
  $('iSp').textContent = '⚡ ' + f.spName;
  $('iSong').textContent = '♪ ' + Sound.title(f.id);
  Sound.sfx('select');
  Sound.music(f.id);
  prevAnim = { def: f, mv: null, mvT: 0, t: 0, n: 0 };
}

function openSelect(title, initial, cb, back) {
  $('selTitle').textContent = title;
  selCb = cb; selBack = back;
  pickCard(Math.max(0, ROSTER.findIndex(f => f.id === initial)));
  show('s-select');
}

function drawPreview() {
  requestAnimationFrame(drawPreview);
  if ($('s-select').classList.contains('hidden') || !prevAnim) return;
  const p = prevAnim, c = $('prev').getContext('2d');
  c.imageSmoothingEnabled = false;
  p.t++;
  if (!p.mv && p.t > 40) {
    const order = ['jab', 'cross', 'highKick', 'backfist', 'bodyKick', 'spinKick', p.def.special];
    p.mv = MOVES[order[p.n++ % order.length]]; p.mvT = 0;
  }
  let pose;
  if (p.mv) {
    p.mvT += p.def.spd * 0.8;
    pose = keyPose(p.mv.keys, p.mvT);
    if (p.mvT >= p.mv.len) { p.mv = null; p.t = 0; }
  } else pose = lerpPose(POSE.idle, POSE.idle2, (Math.sin(p.t * 0.09) + 1) / 2);
  const g = c.createLinearGradient(0, 0, 0, 84);
  g.addColorStop(0, '#0d0b1c'); g.addColorStop(1, '#2a1f3f');
  c.fillStyle = g; c.fillRect(0, 0, 96, 84);
  c.fillStyle = '#3a2f55'; c.fillRect(0, 78, 96, 6);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(30, 77, 26, 2);
  drawFighter(c, p.def, pose, 40, 78, 1, {});
}

// ---------- Настройка боя с ботом
function buildSetup() {
  const ar = $('arenas');
  STAGES.forEach((s, i) => {
    const b = document.createElement('button'); b.className = 'arena';
    const c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const L = stageLayers(i), x = c.getContext('2d');
    x.drawImage(L.back, 0, 0); STAGES[i].anim(x, 1000, L.st); x.drawImage(L.mid, 0, 0);
    b.appendChild(c);
    const n = document.createElement('span'); n.textContent = s.name; b.appendChild(n);
    b.onclick = () => { Flow.stage = i; refreshSetup(); Sound.sfx('select'); };
    ar.appendChild(b);
  });
  const rnd = document.createElement('button'); rnd.className = 'arena rnd';
  rnd.innerHTML = '<div class="q">?</div><span>СЛУЧАЙНАЯ</span>';
  rnd.onclick = () => { Flow.stage = -1; refreshSetup(); Sound.sfx('select'); };
  ar.appendChild(rnd);
  ['ЛЁГКИЙ', 'БОЕЦ', 'ЧЕМПИОН'].forEach((t, i) => {
    const b = document.createElement('button'); b.textContent = t; b.className = 'diff';
    b.onclick = () => { Flow.diff = i; refreshSetup(); Sound.sfx('select'); };
    $('diffs').appendChild(b);
  });
}
function refreshSetup() {
  document.querySelectorAll('.arena').forEach((b, i) => b.classList.toggle('sel', i === (Flow.stage < 0 ? STAGES.length : Flow.stage)));
  document.querySelectorAll('.diff').forEach((b, i) => b.classList.toggle('sel', i === Flow.diff));
}

// ---------- Старт боя
function startFight(o) {
  Input.clear();
  paused = false;
  hideScreens();
  document.body.classList.add('fighting');
  $('hud').classList.remove('hidden');
  $('touch').classList.toggle('hidden', !isTouch());
  newMatch(o);
  const me = o.mode === 'guest' ? 1 : 0, online = o.mode !== 'bot';
  [0, 1].forEach(i => { $('nm' + i).textContent = G.f[i].def.name + (online && i === me ? ' ★ТЫ' : ''); });
  goFullscreen();
}

function botFight() {
  Flow.mode = 'bot';
  const stage = Flow.stage < 0 ? Math.random() * STAGES.length | 0 : Flow.stage;
  saveFlow();
  startFight({ mode: 'bot', p1: Flow.p1, p2: Flow.p2, stage, diff: Flow.diff });
}

// ---------- Онлайн
function makePeer(id) {
  return new Peer(id, {
    debug: 1,
    config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] },
  });
}

function hostRoom() {
  if (typeof Peer === 'undefined') { $('hostStatus').textContent = 'Нет интернета для онлайна'; return; }
  cleanupNet();
  Net.role = 'host';
  $('link').value = '';
  $('hostStatus').textContent = 'СОЗДАЮ КОМНАТУ...';
  show('s-host');
  const id = 'pml-' + Math.random().toString(36).slice(2, 8);
  const peer = Net.peer = makePeer(id);
  peer.on('open', pid => {
    $('link').value = location.origin + location.pathname + '?room=' + pid;
    $('hostStatus').textContent = 'ЖДЁМ ДРУГА...';
  });
  peer.on('connection', c => {
    if (Net.conn && Net.conn.open) { c.close(); return; }
    Net.conn = c;
    c.on('open', () => { $('hostStatus').textContent = 'ДРУГ ПОДКЛЮЧИЛСЯ!'; });
    c.on('data', onNetData);
    c.on('close', netLost);
  });
  peer.on('error', e => { $('hostStatus').textContent = 'ОШИБКА СВЯЗИ: ' + e.type; });
}

function hostStart() {
  const stage = Math.random() * STAGES.length | 0;
  netSend({ t: 'start', p1: Flow.p1, p2: Flow.p2, stage });
  startFight({ mode: 'host', p1: Flow.p1, p2: Flow.p2, stage });
}

function joinRoom() {
  if (typeof Peer === 'undefined') { $('waitTxt').textContent = 'НЕТ ИНТЕРНЕТА'; show('s-wait'); return; }
  cleanupNet();
  Net.role = 'guest';
  $('waitTxt').textContent = 'ПОДКЛЮЧАЮСЬ К ДРУГУ...';
  show('s-wait');
  const peer = Net.peer = makePeer();
  setTimeout(() => {
    if (Net.peer === peer && !(Net.conn && Net.conn.open)) {
      $('waitTxt').textContent = 'НЕ ПОЛУЧАЕТСЯ СОЕДИНИТЬСЯ. ПОПРОБУЙТЕ ОБА ЧЕРЕЗ WI-FI И НОВУЮ ССЫЛКУ';
    }
  }, 15000);
  peer.on('open', () => {
    const c = Net.conn = peer.connect(Flow.room, { reliable: true, serialization: 'json' });
    c.on('open', () => { $('waitTxt').textContent = 'ДРУГ НАЙДЕН! НАЧИНАЕМ...'; c.send({ t: 'hello', fid: Flow.p1 }); });
    c.on('data', onNetData);
    c.on('close', netLost);
  });
  peer.on('error', e => {
    $('waitTxt').textContent = e.type === 'peer-unavailable'
      ? 'КОМНАТА НЕ НАЙДЕНА. ПОПРОСИ ДРУГА ПРИСЛАТЬ НОВУЮ ССЫЛКУ'
      : 'ОШИБКА СВЯЗИ: ' + e.type;
  });
}

function netLost() {
  if (!Net.role) return;
  cleanupNet();
  G = null;
  $('hud').classList.add('hidden');
  document.body.classList.remove('fighting');
  $('touch').classList.add('hidden');
  startDemo();
  Sound.music('menu');
  $('waitTxt').textContent = 'СВЯЗЬ С ДРУГОМ ПОТЕРЯНА';
  show('s-wait');
}

// ---------- Публичный интерфейс для движка
const UI = {
  banner(text, big) {
    const b = $('banner');
    b.textContent = text;
    b.className = '';
    void b.offsetWidth;
    b.className = big ? 'show big' : 'show';
  },
  special(side, text) {
    const e = $('sp' + side);
    e.textContent = '⚡ ' + text;
    e.className = 'sp' + (side ? ' r' : '');
    void e.offsetWidth;
    e.classList.add('show');
  },
  combo(side, n) {
    const e = $('cb' + side);
    e.textContent = n + (n < 5 ? ' УДАРА!' : ' УДАРОВ!');
    e.className = 'cmb' + (side ? ' r' : '');
    void e.offsetWidth;
    e.classList.add('show');
  },
  hud(g) {
    g.f.forEach((f, i) => {
      f.trail = f.trail < f.hp ? f.hp : Math.max(f.hp, f.trail - 0.35);
      $('hp' + i).style.width = (f.hp / f.maxHp * 100) + '%';
      $('tr' + i).style.width = (f.trail / f.maxHp * 100) + '%';
      $('mt' + i).style.width = f.meter + '%';
      $('mt' + i).parentNode.classList.toggle('ready', f.meter >= 100);
      $('wn' + i).textContent = '★'.repeat(g.wins[i]) + '☆'.repeat(Math.max(0, 2 - g.wins[i]));
    });
    $('clock').textContent = Math.ceil(g.timer / 60);
    $('hud').classList.toggle('walk', g.phase === 'walkout');
  },
  matchOver(w) {
    const me = G.mode === 'guest' ? 1 : 0;
    $('resTitle').textContent = w < 0 ? 'НИЧЬЯ' : w === me ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
    $('resTitle').className = w === me ? 'win' : 'lose';
    $('resSub').textContent = w < 0 ? 'Судьи развели руками' : G.f[w].def.name + ' — чемпион лиги!';
    Sound.sfx(w === me ? 'win' : 'lose');
    $('resAgain').classList.toggle('hidden', G.mode === 'guest');
    $('resNew').classList.toggle('hidden', G.mode !== 'bot');
    $('resWait').classList.toggle('hidden', G.mode !== 'guest');
    $('touch').classList.add('hidden');
    show('s-result');
  },
  onNet(d) {
    if (d.t === 'hello' && Net.role === 'host') { Flow.p2 = d.fid; hostStart(); }
    else if (d.t === 'start' && Net.role === 'guest') startFight({ mode: 'guest', p1: d.p1, p2: d.p2, stage: d.stage });
  },
  togglePause(forceOn) {
    if (!G || G.mode === 'demo' || G.phase === 'over') return;
    if (forceOn) { paused = G.mode === 'bot'; Input.clear(); return; }
    if ($('s-pause').classList.contains('hidden')) {
      paused = G.mode === 'bot';
      Input.clear();
      show('s-pause');
    } else { paused = false; hideScreens(); }
  },
};

// ---------- Размер под экран
function layout() {
  const vw = innerWidth, vh = innerHeight, st = $('stage');
  const portrait = vh > vw;
  const s = portrait ? vw / 320 : Math.min(vw / 320, vh / 180);
  const w = 320 * s, h = 180 * s;
  st.style.width = w + 'px'; st.style.height = h + 'px';
  st.style.left = (vw - w) / 2 + 'px';
  st.style.top = (portrait ? Math.min((vh - h) / 2, vh * 0.1) : (vh - h) / 2) + 'px';
  document.documentElement.style.setProperty('--u', s + 'px');
  document.body.classList.toggle('portrait', portrait);
}

// ---------- Кнопки
function wire() {
  const musicBtns = document.querySelectorAll('.music');
  const musicLbl = () => musicBtns.forEach(b => b.textContent = Sound.muted ? '♪ МУЗЫКА: ВЫКЛ' : '♪ МУЗЫКА: ВКЛ');
  musicLbl();
  musicBtns.forEach(b => b.onclick = () => { Sound.setMuted(!Sound.muted); musicLbl(); });

  $('mFs').classList.toggle('hidden', !!standalone);
  $('mFs').onclick = toggleFS;
  $('fsBtn').classList.toggle('hidden', !!standalone);
  $('fsBtn').onclick = toggleFS;
  $('iosBack').onclick = () => {
    if (G && G.mode !== 'demo' && G.phase !== 'over') { paused = false; hideScreens(); } else show('s-menu');
  };
  $('s-title').onclick = () => {
    Sound.init(); Sound.music('menu'); Sound.sfx('confirm'); goFullscreen();
    if (Flow.room) show('s-join'); else show('s-menu');
  };
  $('mBot').onclick = () => {
    Sound.sfx('confirm');
    openSelect('ВЫБЕРИ СВОЕГО БОЙЦА', Flow.p1, id => {
      Flow.p1 = id;
      openSelect('ВЫБЕРИ СОПЕРНИКА', Flow.p2, id2 => { Flow.p2 = id2; refreshSetup(); show('s-setup'); }, () => $('mBot').click());
    }, () => show('s-menu'));
  };
  $('mOnline').onclick = () => {
    Sound.sfx('confirm');
    openSelect('ВЫБЕРИ СВОЕГО БОЙЦА', Flow.p1, id => { Flow.p1 = id; saveFlow(); hostRoom(); }, () => show('s-menu'));
  };
  $('mHelp').onclick = () => { Sound.sfx('confirm'); show('s-help'); };
  $('helpBack').onclick = () => show('s-menu');
  $('selOk').onclick = () => { Sound.sfx('confirm'); selCb && selCb(ROSTER[selIdx].id); };
  $('selBack').onclick = () => selBack && selBack();
  $('setBack').onclick = () => $('mBot').click();
  $('setGo').onclick = () => { Sound.sfx('confirm'); botFight(); };
  $('copyBtn').onclick = async () => {
    const v = $('link').value; if (!v) return;
    try { await navigator.clipboard.writeText(v); } catch (e) { $('link').select(); document.execCommand('copy'); }
    $('copyBtn').textContent = 'СКОПИРОВАНО!';
    setTimeout(() => $('copyBtn').textContent = 'КОПИРОВАТЬ', 1500);
  };
  $('shareBtn').onclick = () => {
    const v = $('link').value; if (!v) return;
    if (navigator.share) navigator.share({ title: 'Pixel MMA League', text: 'Вызываю тебя на бой! 🥊', url: v }).catch(() => {});
    else $('copyBtn').click();
  };
  $('hostCancel').onclick = toMenu;
  $('joinGo').onclick = () => {
    Sound.sfx('confirm');
    openSelect('ВЫБЕРИ СВОЕГО БОЙЦА', Flow.p1, id => { Flow.p1 = id; saveFlow(); joinRoom(); }, () => show('s-join'));
  };
  $('waitCancel').onclick = toMenu;
  $('pauseBtn').onclick = () => UI.togglePause();
  $('pResume').onclick = () => UI.togglePause();
  $('pMenu').onclick = toMenu;
  $('resAgain').onclick = () => { Sound.sfx('confirm'); if (G.mode === 'host') hostStart(); else botFight(); };
  $('resNew').onclick = () => $('mBot').click();
  $('resMenu').onclick = toMenu;

  addEventListener('keydown', e => {
    if ($('s-select').classList.contains('hidden')) {
      if (e.code === 'Enter' && !$('s-title').classList.contains('hidden')) $('s-title').click();
      return;
    }
    const cols = getComputedStyle($('grid')).gridTemplateColumns.split(' ').length, n = ROSTER.length;
    const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.code];
    if (mv) { pickCard((selIdx + mv + n) % n); e.preventDefault(); }
    if (e.code === 'Enter' || e.code === 'KeyJ') $('selOk').click();
    if (e.code === 'Escape') $('selBack').click();
  });
}

// ---------- Запуск
Flow.room = new URLSearchParams(location.search).get('room');
buildGrid();
buildSetup();
wire();
layout();
addEventListener('resize', layout);
addEventListener('orientationchange', () => setTimeout(layout, 200));
if (Flow.room) $('titleHint').textContent = 'ДРУГ ЗОВЁТ ТЕБЯ НА БОЙ!';
startDemo();
show('s-title');
requestAnimationFrame(loop);
requestAnimationFrame(drawPreview);

// Меню, выбор бойца, HUD, клавиатура и джойстик
const $ = id => document.getElementById(id);
const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------- Ввод
const Input = (() => {
  const kb = {}, touch = EMPTY(), tapped = {};
  const MAP = {
    ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', KeyI: 'j', KeyN: 'j',
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
  // 8 секторов по 45°: каждое направление — свой удар
  const setStick = (dx, dy) => {
    const r = stick.clientWidth / 2, len = Math.hypot(dx, dy), m = Math.min(len, r * 0.62);
    const nx = len ? dx / len : 0, ny = len ? dy / len : 0;
    knob.style.transform = `translate(${nx * m}px, ${ny * m}px)`;
    touch.l = touch.r = touch.u = touch.d = 0;
    if (!len || !r || len < r * 0.28) { stick.dataset.dir = ''; return; }
    const sec = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const DIR = { 0: 'r', 1: 'rd', 2: 'd', 3: 'ld', 4: 'l', '-4': 'l', '-3': 'lu', '-2': 'u', '-1': 'ru' }[sec] || '';
    for (const ch of DIR) touch[ch] = 1;
    stick.dataset.dir = DIR;
  };
  const rotated = () => document.body.classList.contains('forceLand');
  const stickMove = e => {
    if (e.pointerId !== sid) return;
    const b = stick.getBoundingClientRect();
    const dx = e.clientX - b.left - b.width / 2, dy = e.clientY - b.top - b.height / 2;
    if (rotated()) setStick(dy, -dx); else setStick(dx, dy);
  };
  // плавающий джойстик: центр там, где коснулся пальцем в левой половине
  const zone = $('stickZone');
  zone.addEventListener('pointerdown', e => {
    sid = e.pointerId; zone.setPointerCapture(sid);
    const zr = zone.getBoundingClientRect(), half = stick.offsetWidth / 2;
    const lx = rotated() ? e.clientY - zr.top : e.clientX - zr.left, ly = rotated() ? zr.right - e.clientX : e.clientY - zr.top;
    stick.style.left = (lx - half) + 'px'; stick.style.top = (ly - half) + 'px'; stick.style.bottom = 'auto';
    stick.classList.add('on'); stickMove(e); e.preventDefault();
  });
  zone.addEventListener('pointermove', stickMove);
  const zoneEnd = e => { if (e.pointerId === sid) { sid = null; setStick(0, 0); stick.classList.remove('on'); } };
  zone.addEventListener('pointerup', zoneEnd); zone.addEventListener('pointercancel', zoneEnd);
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
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 1 || !(e.target.closest && e.target.closest('.scrollY'))) e.preventDefault();
  }, { passive: false });
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

// смена экрана: пиксельная шторка и вылет элементов по очереди
let curScreen = null;
function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
// шторка убирается полностью, как только проехала последняя полоса
$('wipe').lastElementChild.addEventListener('animationend', () => $('wipe').classList.remove('go'));
$('flash').addEventListener('animationend', () => $('flash').classList.remove('go'));
function show(id) {
  const changed = curScreen !== id;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id));
  if (changed && curScreen) replay($('wipe'), 'go');
  if (changed) { const el = $(id); el && replay(el, 'enter'); }
  curScreen = id;
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
function hideScreens() { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); curScreen = null; }

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

// ---------- Выбор бойца: вкладки весовых категорий, большая карточка, сетка категории
let curDiv = 'lw';
function buildGrid() {
  const grid = $('grid'), tabs = $('divs');
  DIVISIONS.forEach(([div, title, ids]) => {
    const t = document.createElement('button');
    t.className = 'tab'; t.dataset.div = div;
    t.innerHTML = title + ' <small>' + ids.length + '</small>';
    t.onclick = () => { showDiv(div); Sound.sfx('select'); };
    tabs.appendChild(t);
  });
  ROSTER.forEach((f, i) => {
    const card = document.createElement('button');
    card.className = 'card'; card.dataset.div = f.div; card.dataset.i = i;
    const c = document.createElement('canvas');
    c.width = 90; c.height = 90;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const g = x.createLinearGradient(0, 0, 0, 90);
    g.addColorStop(0, '#2a2348'); g.addColorStop(1, '#120f22');
    x.fillStyle = g; x.fillRect(0, 0, 90, 90);
    drawFighterHD(x, f, POSE.idle, 39, Math.round(192 * f.scale), 1, {});
    card.appendChild(c);
    const o = document.createElement('em'); o.textContent = ovr(f); card.appendChild(o);
    const fl = document.createElement('i'); fl.textContent = f.flag; card.appendChild(fl);
    const n = document.createElement('span'); n.textContent = f.name; card.appendChild(n);
    card.onclick = () => { if (selIdx === i) $('selOk').click(); else pickCard(i); };
    grid.appendChild(card);
  });
  // внутри категории — от сильного к слабому
  DIVISIONS.forEach(([div]) => {
    [...grid.querySelectorAll('.card[data-div="' + div + '"]')]
      .sort((p, q) => ovr(ROSTER[q.dataset.i]) - ovr(ROSTER[p.dataset.i]))
      .forEach(c => grid.appendChild(c));
  });
}

const visibleCards = () => [...document.querySelectorAll('#grid .card')].filter(c => c.dataset.div === curDiv);
function showDiv(div, keep) {
  curDiv = div;
  document.querySelectorAll('#divs .tab').forEach(t => t.classList.toggle('sel', t.dataset.div === div));
  document.querySelectorAll('#grid .card').forEach(c => {
    const on = c.dataset.div === div;
    c.classList.toggle('hidden', !on);
    if (on && !keep) replay(c, 'pop');
  });
  const act = document.querySelector('#divs .tab.sel');
  if (act) act.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (!keep) pickCard(+visibleCards()[0].dataset.i);
}
function stepCard(d) {
  const v = visibleCards(), k = v.findIndex(c => +c.dataset.i === selIdx);
  pickCard(+v[(k + d + v.length) % v.length].dataset.i);
}

function pickCard(i) {
  selIdx = i;
  const f = ROSTER[i];
  showDiv(f.div, true);
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('sel', +c.dataset.i === i));
  $('iName').textContent = f.name + ' ' + f.flag;
  $('iNick').textContent = '«' + f.nick + '»';
  $('iOvr').textContent = ovr(f);
  $('iDiv').textContent = (DIVISIONS.find(d => d[0] === f.div) || [, ''])[1];
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
  const g = c.createLinearGradient(0, 0, 0, 230);
  g.addColorStop(0, '#0d0b1c'); g.addColorStop(1, '#2a1f3f');
  c.fillStyle = g; c.fillRect(0, 0, 220, 230);
  c.fillStyle = '#3a2f55'; c.fillRect(0, 220, 220, 10);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(70, 219, 60, 3);
  drawFighterHD(c, p.def, pose, 92, 220, 1, {});
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
  $('arenas').classList.add('hidden'); $('arenaTitle').classList.add('hidden');
  Flow.stage = 0;
  if (STAGES.length < 2) return buildDiffs();
  const rnd = document.createElement('button'); rnd.className = 'arena rnd';
  rnd.innerHTML = '<div class="q">?</div><span>СЛУЧАЙНАЯ</span>';
  rnd.onclick = () => { Flow.stage = -1; refreshSetup(); Sound.sfx('select'); };
  ar.appendChild(rnd);
  buildDiffs();
}
function buildDiffs() {
  DIFFS.forEach((t, i) => {
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
// ---------- Профиль: ник и рекорд как в UFC (победы-поражения-ничьи)
const DIFFS = ['ЛЁГКИЙ', 'БОЕЦ', 'ЧЕМПИОН', 'СЛОЖНЫЙ', 'УЛЬТРА', 'ХАРДКОР', 'БЕЗУМНЫЙ'];
const Profile = { nick: '', w: 0, l: 0, d: 0, ko: 0, belts: 0 };
try { Object.assign(Profile, JSON.parse(localStorage.getItem('pml_profile') || '{}')); } catch (e) {}
const saveProfile = () => { try { localStorage.setItem('pml_profile', JSON.stringify(Profile)); } catch (e) {} };
const recordText = () => Profile.w + '-' + Profile.l + '-' + Profile.d + (Profile.ko ? ' (' + Profile.ko + ' KO)' : '') + (Profile.belts ? ' · ' + '🏆'.repeat(Math.min(5, Profile.belts)) + (Profile.belts > 5 ? '×' + Profile.belts : '') : '');
function refreshProfile() {
  $('profileLine').textContent = Profile.nick ? '👤 ' + Profile.nick + ' · ' + recordText() : '';
  $('nickRecord').textContent = Profile.nick ? 'РЕКОРД: ' + recordText() : 'Ник — это твой аккаунт: под ним считаются победы и поражения.';
}

function startFight(o) {
  Input.clear();
  paused = false;
  hideScreens();
  document.body.classList.add('fighting');
  replay($('flash'), 'go'); replay($('stage'), 'slam');
  $('hud').classList.remove('hidden');
  $('touch').classList.toggle('hidden', !isTouch());
  newMatch(o);
  Net.lastRx = performance.now();
  const me = o.mode === 'guest' ? 1 : 0, online = o.mode !== 'bot';
  [0, 1].forEach(i => {
    const nk = (G.nicks && G.nicks[i]) || '';
    $('nm' + i).textContent = (nk ? nk + ' · ' : '') + G.f[i].def.name + (online && i === me ? ' ★' : '');
  });
  goFullscreen();
  Sound.unlockVoice();
}

// ---------- Друзья по нику: заявки, кто в сети, вызов на бой, профиль друга
if (!Profile.id) Profile.id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
Profile.friends = Profile.friends || []; Profile.requests = Profile.requests || [];
saveProfile();
const Lobby = { ws: null, online: {}, tries: 0 };
const lobbySend = o => { if (Lobby.ws && Lobby.ws.readyState === 1) { Lobby.ws.send(JSON.stringify(o)); return true; } return false; };
function lobbyConnect() {
  if (!Profile.nick || navigator.onLine === false) return;
  try { Lobby.ws && Lobby.ws.close(); } catch (e) {}
  let ws;
  try { ws = new WebSocket('wss://' + FIGHT_SERVER + '/?lobby=1&id=' + encodeURIComponent(Profile.id) + '&nick=' + encodeURIComponent(Profile.nick)); } catch (e) { return; }
  Lobby.ws = ws;
  ws.onopen = () => { Lobby.tries = 0; lobbySend({ t: 'watch', ids: Profile.friends.map(f => f.id) }); refreshFriends(); };
  ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } onLobby(m); };
  ws.onclose = () => {
    if (Lobby.ws !== ws) return;
    Lobby.ws = null; Lobby.online = {}; refreshFriends();
    setTimeout(lobbyConnect, Math.min(30000, 3000 * ++Lobby.tries));
  };
  ws.onerror = () => {};
}
function toast(text, btns = [], ms = 6000) {
  const t = document.createElement('div'); t.className = 'toast';
  const p = document.createElement('p'); p.textContent = text; t.appendChild(p);
  for (const [label, fn] of btns) {
    const b = document.createElement('button'); b.textContent = label;
    b.onclick = () => { t.remove(); fn(); }; t.appendChild(b);
  }
  $('toasts').appendChild(t); Sound.sfx('select');
  setTimeout(() => t.remove(), ms);
}
function addFriend(f) {
  if (!Profile.friends.some(x => x.id === f.id)) Profile.friends.push({ id: f.id, nick: f.nick });
  Profile.requests = Profile.requests.filter(x => x.id !== f.id);
  saveProfile(); lobbySend({ t: 'watch', ids: [f.id] }); refreshFriends();
}
function onLobby(m) {
  const fr = m.from;
  if (m.t === 'presence') {
    Lobby.online[m.id] = m.on;
    const f = Profile.friends.find(x => x.id === m.id);
    if (f && m.nick && f.nick !== m.nick) { f.nick = m.nick; saveProfile(); }
  } else if (m.t === 'freq') {
    if (Profile.friends.some(x => x.id === fr.id)) { lobbySend({ t: 'facc', to: fr.id }); return; }
    if (!Profile.requests.some(x => x.id === fr.id)) Profile.requests.push(fr);
    saveProfile();
    toast('📨 ' + fr.nick + ' хочет в друзья', [['ПРИНЯТЬ', () => acceptReq(fr)], ['НЕТ', () => declineReq(fr)]], 12000);
  } else if (m.t === 'freqOk') {
    toast(m.online ? '✉ Заявка отправлена: ' + m.nick : '✉ Заявка для ' + m.nick + ' придёт, когда он зайдёт в игру');
  } else if (m.t === 'facc') { addFriend(fr); toast('🤝 ' + fr.nick + ' теперь твой друг'); }
  else if (m.t === 'fdec') toast(fr.nick + ' отклонил заявку');
  else if (m.t === 'unfriend') { Profile.friends = Profile.friends.filter(x => x.id !== fr.id); saveProfile(); }
  else if (m.t === 'prof?') lobbySend({ t: 'prof', to: fr.id, data: { nick: Profile.nick, w: Profile.w, l: Profile.l, d: Profile.d, ko: Profile.ko, belts: Profile.belts || 0, fav: Flow.p1 } });
  else if (m.t === 'prof') showFriendProfile(m.data);
  else if (m.t === 'inv') toast('⚔ ' + fr.nick + ' вызывает тебя на бой!', [['В БОЙ', () => acceptInvite(m)], ['НЕТ', () => lobbySend({ t: 'invNo', to: fr.id })]], 20000);
  else if (m.t === 'invNo') toast(fr.nick + ' отказался от боя');
  else if (m.t === 'nickTaken') toast('⚠ Ник ' + m.nick + ' уже занят игроком в сети — смени ник в профиле', [], 9000);
  else if (m.t === 'err') toast('⚠ ' + m.text);
  refreshFriends();
}
function acceptReq(f) { addFriend(f); lobbySend({ t: 'facc', to: f.id }); }
function declineReq(f) { Profile.requests = Profile.requests.filter(x => x.id !== f.id); saveProfile(); lobbySend({ t: 'fdec', to: f.id }); refreshFriends(); }
function inviteFriend(f) {
  openSelect('БОЕЦ ДЛЯ БОЯ С ' + f.nick, Flow.p1, id => {
    Flow.p1 = id; saveFlow(); hostRoom();
    lobbySend({ t: 'inv', to: f.id, room: Net.roomId, b: 0 });
    $('hostStatus').textContent = 'ВЫЗОВ ОТПРАВЛЕН ' + f.nick + '... ЖДЁМ';
  }, () => show('s-friends'));
}
function acceptInvite(m) {
  Flow.room = m.room; Flow.broker = m.b || 0; wakeServer();
  openSelect('БОЕЦ ПРОТИВ ' + m.from.nick, Flow.p1, id => { Flow.p1 = id; saveFlow(); joinRoom(); }, () => show('s-menu'));
}
function showFriendProfile(d) {
  $('fpNick').textContent = '👤 ' + d.nick;
  const fav = FIGHTER[d.fav];
  $('fpBody').innerHTML = `<div class="fpcard"><div><b>${d.w}</b><small>ПОБЕД</small></div><div><b>${d.l}</b><small>ПОРАЖЕНИЙ</small></div>`
    + `<div><b>${d.d}</b><small>НИЧЬИХ</small></div><div><b>${d.ko}</b><small>НОКАУТОВ</small></div><div><b>${d.belts}🏆</b><small>ПОЯСОВ</small></div></div>`
    + (fav ? `<p>ЛЮБИМЫЙ БОЕЦ: ${fav.name} ${fav.flag}</p>` : '');
  show('s-fprof');
}
function refreshFriends() {
  const on = Profile.friends.filter(f => Lobby.online[f.id]).length, rq = Profile.requests.length;
  if ($('mFriends')) $('mFriends').innerHTML = '👥 ДРУЗЬЯ' + (on ? ' <small class="on">● ' + on + '</small>' : '') + (rq ? ' <small class="rq">📨' + rq + '</small>' : '');
  if (!$('frList')) return;
  $('frStatus').textContent = Lobby.ws && Lobby.ws.readyState === 1 ? 'ТЫ В СЕТИ КАК ' + Profile.nick : navigator.onLine === false ? 'НЕТ ИНТЕРНЕТА' : 'ПОДКЛЮЧАЮСЬ К СЕРВЕРУ... (если он спал — до минуты)';
  $('frReq').innerHTML = Profile.requests.map(r => `<div class="fr req"><i>📨</i><b>${r.nick}</b><span>хочет в друзья</span><button data-a="acc" data-id="${r.id}">✓</button><button data-a="dec" data-id="${r.id}">✕</button></div>`).join('');
  $('frList').innerHTML = Profile.friends.length ? Profile.friends.map(f => {
    const o = !!Lobby.online[f.id];
    return `<div class="fr"><i class="dot ${o ? 'on' : ''}"></i><b>${f.nick}</b><span>${o ? 'В СЕТИ' : 'НЕ В СЕТИ'}</span>`
      + `<button data-a="prof" data-id="${f.id}" ${o ? '' : 'disabled'}>👤</button><button data-a="inv" data-id="${f.id}" class="hot" ${o ? '' : 'disabled'}>⚔</button><button data-a="del" data-id="${f.id}">✕</button></div>`;
  }).join('') : '<p class="tiny">Пока нет друзей. Впиши ник друга и нажми «Добавить».</p>';
}

// ---------- Путь к поясу: 5 соперников по нарастающей, проиграл — начинай заново
const CAREER_DIFF = [1, 2, 3, 4, 5];
let Career = null;
function buildLadder(fid) {
  const me = FIGHTER[fid];
  const same = ROSTER.filter(f => f.div === me.div && f.id !== fid);
  const rest = ROSTER.filter(f => f.div !== me.div && f.id !== fid).sort(() => Math.random() - 0.5);
  const pool = [...same, ...rest].slice(0, Math.max(5, same.length)).slice(0, 5);
  while (pool.length < 5) pool.push(rest[pool.length]);
  return pool.sort((p, q) => ovr(p) - ovr(q)).map(f => f.id);
}
function showCareer() {
  const me = FIGHTER[Career.fid];
  $('carInfo').textContent = me.name + ' · БОЙ ' + (Career.step + 1) + ' ИЗ 5 · ПОЯСОВ: ' + (Profile.belts || 0);
  Sound.music('career');
  $('ladder').innerHTML = Career.ladder.map((id, i) => {
    const f = FIGHTER[id], st = i < Career.step ? 'won' : i === Career.step ? 'cur' : '';
    return `<div class="rung ${st}"><b>${i + 1}</b><span>${f.name} ${f.flag}</span><em>${ovr(f)}</em><small>${DIFFS[CAREER_DIFF[i]]}</small>${i < Career.step ? '<i>✓</i>' : i === 4 ? '<i>🏆</i>' : ''}</div>`;
  }).join('');
  show('s-career');
}
function careerFight() {
  Flow.p1 = Career.fid; Flow.p2 = Career.ladder[Career.step]; Flow.diff = CAREER_DIFF[Career.step];
  startFight({ mode: 'bot', p1: Flow.p1, p2: Flow.p2, stage: 0, diff: Flow.diff, career: true,
    nicks: [Profile.nick, 'БОЙ ' + (Career.step + 1) + '/5'] });
}

function botFight() {
  Flow.mode = 'bot';
  const stage = 0;
  saveFlow();
  startFight({ mode: 'bot', p1: Flow.p1, p2: Flow.p2, stage, diff: Flow.diff, nicks: [Profile.nick, 'БОТ ' + DIFFS[Flow.diff]] });
}

// ---------- Онлайн
// ---------- Онлайн через сервер-посредник MQTT: проходит через любой мобильный интернет и роутер
const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
function relay(room, me, onMsg, onReady, fixed) {
  const other = me === 'host' ? 'guest' : 'host';
  let bi = fixed ?? 0, client = null, closed = false;
  const connect = () => {
    let ok = false;
    client = mqtt.connect(BROKERS[bi], {
      clientId: 'pml_' + me + '_' + Math.random().toString(36).slice(2, 10),
      reconnectPeriod: 1500, connectTimeout: 6000, clean: true,
    });
    client.on('connect', () => { ok = true; client.subscribe('pml/' + room + '/' + me, { qos: 0 }); onReady(bi); });
    client.on('message', (t, buf) => { Net.lastRx = performance.now(); try { onMsg(JSON.parse(buf.toString())); } catch (e) {} });
    client.on('error', () => {});
    if (fixed === undefined) setTimeout(() => {
      if (!ok && !closed && bi < BROKERS.length - 1) { client.end(true); bi++; connect(); }
    }, 7000);
  };
  connect();
  return {
    open: true,
    send(o) { if (client && client.connected) client.publish('pml/' + room + '/' + other, JSON.stringify(o), { qos: 0 }); },
    close() { closed = true; this.open = false; if (client) client.end(true); },
    destroy() { this.close(); },
  };
}

function hostRoom() {
  show('s-host');
  if (typeof mqtt === 'undefined') { $('hostStatus').textContent = 'НЕТ ИНТЕРНЕТА ДЛЯ ОНЛАЙНА'; return; }
  cleanupNet();
  Net.role = 'host'; Net.guestSeen = false;
  $('link').value = '';
  $('hostStatus').textContent = 'СОЗДАЮ КОМНАТУ...';
  const room = Math.random().toString(36).slice(2, 8);
  Net.roomId = room;
  Net.conn = Net.peer = relay(room, 'host', onNetData, bi => {
    $('link').value = location.origin + location.pathname + '?room=' + room + '&b=' + bi;
    if (!G || G.mode !== 'host') $('hostStatus').textContent = 'ЖДЁМ ДРУГА...';
  });
  tryP2P(room, true);
  wsLink(room, 'host');
}

// ---------- Свой сервер боёв
const FIGHT_SERVER = 'pixel-mma-server.onrender.com';
const wakeServer = () => { try { fetch('https://' + FIGHT_SERVER + '/', { mode: 'no-cors', cache: 'no-store' }).catch(() => {}); } catch (e) {} };
function wsLink(room, role) {
  const role0 = Net.role;
  let tries = 0;
  const open = () => {
    if (Net.role !== role0) return;
    let ws;
    try { ws = new WebSocket('wss://' + FIGHT_SERVER + '/?room=' + encodeURIComponent(room) + '&role=' + role); } catch (e) { return; }
    ws.onopen = () => { if (Net.role !== role0) { ws.close(); return; } Net.ws = ws; tries = 0; };
    ws.onmessage = ev => {
      Net.lastRx = performance.now();
      let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.t === '_peer') { Net.peerWs = d.on; return; }
      Net.peerWs = true; onNetData(d);
    };
    ws.onclose = () => { if (Net.ws === ws) { Net.ws = null; Net.peerWs = false; } if (Net.role === role0 && tries++ < 30) setTimeout(open, 2500); };
    ws.onerror = () => {};
  };
  open();
}

// пробуем прямое соединение телефон-телефон: если пробьётся — лагов почти нет, иначе остаёмся на посреднике
function tryP2P(room, host) {
  if (typeof Peer === 'undefined') return;
  try {
    const cfg = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
    const peer = Net.p2pPeer = host ? new Peer('pml-' + room, cfg) : new Peer(cfg);
    const bind = c => {
      c.on('open', () => { if (Net.p2pPeer === peer) Net.p2p = c; });
      c.on('data', d => { Net.lastRx = performance.now(); onNetData(d); });
      c.on('close', () => { if (Net.p2p === c) Net.p2p = null; });
      c.on('error', () => {});
    };
    peer.on('error', () => {});
    if (host) peer.on('connection', bind);
    else peer.on('open', () => bind(peer.connect('pml-' + room, { serialization: 'json', reliable: false })));
  } catch (e) {}
}

function hostStart() {
  const stage = 0;
  Net.lastStart = { t: 'start', p1: Flow.p1, p2: Flow.p2, stage, nicks: [Profile.nick, Net.guestNick || 'ДРУГ'] };
  Net.guestSeen = false;
  netSend(Net.lastStart);
  startFight({ mode: 'host', p1: Flow.p1, p2: Flow.p2, stage });
}

function joinRoom() {
  show('s-wait');
  if (typeof mqtt === 'undefined') { $('waitTxt').textContent = 'НЕТ ИНТЕРНЕТА'; return; }
  cleanupNet();
  Net.role = 'guest';
  $('waitTxt').textContent = 'ПОДКЛЮЧАЮСЬ...';
  let knocking = false;
  const r = Net.conn = Net.peer = relay(Flow.room, 'guest', onNetData, () => {
    if (knocking) return;
    knocking = true;
    let n = 0;
    // стучимся, пока друг не начнёт бой (он мог выйти в мессенджер)
    const knock = () => {
      if (Net.conn !== r || (G && G.mode === 'guest')) return;
      r.send({ t: 'hello', fid: Flow.p1, nick: Profile.nick });
      if (Net.ws && Net.ws.readyState === 1) Net.ws.send(JSON.stringify({ t: 'hello', fid: Flow.p1, nick: Profile.nick }));
      n++;
      $('waitTxt').textContent = n < 4 ? 'ИЩУ ДРУГА В КОМНАТЕ...' : 'ЖДЁМ ДРУГА... ПУСТЬ ВЕРНЁТСЯ В ИГРУ';
      if (n > 60) { $('waitTxt').textContent = 'ДРУГ НЕ ОТВЕЧАЕТ. ПУСТЬ ОТКРОЕТ ИГРУ И ПРИШЛЁТ НОВУЮ ССЫЛКУ'; return; }
      setTimeout(knock, 1500);
    };
    knock();
  }, Flow.broker);
  tryP2P(Flow.room, false);
  wsLink(Flow.room, 'guest');
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
  netLost() { netLost(); },
  banner(text, big) {
    const b = $('banner');
    b.textContent = text;
    b.className = '';
    void b.offsetWidth;
    b.className = big ? 'show big' : text.length > 13 ? 'show long' : 'show';
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
    $('clinch').classList.toggle('hidden', !g.clinch);
    if (g.clinch) {
      const [a, b] = g.clinch.n, sum = a + b || 1;
      $('cl0').style.width = (a + b ? a / sum * 100 : 50) + '%';
      $('cl1').style.width = (a + b ? b / sum * 100 : 50) + '%';
    }
  },
  matchOver(w, ko) {
    const me = G.mode === 'guest' ? 1 : 0;
    if (G.train) { toMenu(); return; }
    if (w < 0) Profile.d++; else if (w === me) { Profile.w++; if (ko) Profile.ko++; } else Profile.l++;
    let carMsg = '';
    if (G.career && Career) {
      if (w === me) {
        Career.step++;
        if (Career.step >= 5) { Profile.belts = (Profile.belts || 0) + 1; carMsg = ' · 🏆 ТЫ ЧЕМПИОН ЛИГИ!'; Career = null; }
        else carMsg = ' · дальше бой ' + (Career.step + 1) + ' из 5';
      } else { carMsg = ' · путь к поясу окончен на бою ' + (Career.step + 1); Career = null; }
    }
    saveProfile(); refreshProfile();
    $('resCareer').classList.toggle('hidden', !(G.career && Career));
    $('resTitle').textContent = w < 0 ? 'НИЧЬЯ' : w === me ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
    $('resTitle').className = w === me ? 'win' : 'lose';
    $('resSub').textContent = (w < 0 ? 'Судьи развели руками' : G.f[w].def.name + (ko ? ' — нокаутом!' : ' — решением судей')) + carMsg + ' · твой рекорд ' + recordText();
    if (G.career && !Career && w === me) { $('resTitle').textContent = '🏆 ЧЕМПИОН!'; }
    Sound.sfx(w === me ? 'win' : 'lose');
    $('resAgain').classList.toggle('hidden', G.mode === 'guest' || !!G.career);
    $('resNew').classList.toggle('hidden', G.mode !== 'bot' || !!G.career);
    $('resWait').classList.toggle('hidden', G.mode !== 'guest');
    $('touch').classList.add('hidden');
    show('s-result');
  },
  onNet(d) {
    if (d.t === 'hello' && Net.role === 'host') {
      if (d.nick) Net.guestNick = d.nick;
      // повторный «стук» во время боя: друг мог не получить старт — шлём ещё раз
      if (G && G.mode === 'host' && G.phase !== 'over') { if (!Net.guestSeen) netSend(Net.lastStart); return; }
      Flow.p2 = d.fid; hostStart();
    }
    else if (d.t === 'start' && Net.role === 'guest') startFight({ mode: 'guest', p1: d.p1, p2: d.p2, stage: d.stage, nicks: d.nicks });
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
  const force = isTouch() && innerHeight > innerWidth;
  document.body.classList.toggle('forceLand', force);
  const vw = force ? innerHeight : innerWidth, vh = force ? innerWidth : innerHeight, st = $('stage');
  const portrait = !force && vh > vw;
  document.body.classList.toggle('compact', vh <= 520);
  const s = portrait ? vw / 320 : Math.min(vw / 320, vh / 180);
  const w = 320 * s, h = 180 * s;
  st.style.width = w + 'px'; st.style.height = h + 'px';
  st.style.left = (vw - w) / 2 + 'px';
  st.style.top = (portrait ? Math.min((vh - h) / 2, vh * 0.1) : (vh - h) / 2) + 'px';
  document.documentElement.style.setProperty('--u', s + 'px');
  document.body.classList.toggle('portrait', portrait);
  document.body.classList.toggle('touch', isTouch());
  // на телефоне держим горизонтальную ориентацию, если система позволяет
  try { if (screen.orientation && screen.orientation.lock && (document.fullscreenElement || standalone)) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
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
    if (!Profile.nick) { $('nickIn').value = ''; refreshProfile(); show('s-nick'); return; }
    if (Flow.room) show('s-join'); else show('s-menu');
  };
  $('nickOk').onclick = () => {
    const n = $('nickIn').value.trim().replace(/\s+/g, ' ').slice(0, 14);
    if (!n) { $('nickIn').focus(); return; }
    Profile.nick = n.toUpperCase(); saveProfile(); refreshProfile(); Sound.sfx('confirm');
    lobbyConnect();
    if (Flow.room) show('s-join'); else show('s-menu');
  };
  $('mFriends').onclick = () => { Sound.sfx('confirm'); if (!Lobby.ws) lobbyConnect(); refreshFriends(); show('s-friends'); };
  $('frBack').onclick = () => show('s-menu');
  $('fpBack').onclick = () => show('s-friends');
  $('frAddBtn').onclick = () => {
    const n = $('frNick').value.trim().toUpperCase().slice(0, 14);
    if (!n) return;
    if (n === Profile.nick) { toast('Это твой ник 🙂'); return; }
    if (!lobbySend({ t: 'freq', nick: n })) { toast('⚠ Нет связи с сервером, попробуй через минуту'); lobbyConnect(); return; }
    $('frNick').value = '';
  };
  const frClick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.dataset.id, f = Profile.friends.find(x => x.id === id) || Profile.requests.find(x => x.id === id);
    if (!f) return;
    if (b.dataset.a === 'acc') acceptReq(f);
    if (b.dataset.a === 'dec') declineReq(f);
    if (b.dataset.a === 'prof') { lobbySend({ t: 'prof?', to: id }); toast('Запрашиваю профиль ' + f.nick + '...', [], 2500); }
    if (b.dataset.a === 'inv') inviteFriend(f);
    if (b.dataset.a === 'del') { Profile.friends = Profile.friends.filter(x => x.id !== id); saveProfile(); lobbySend({ t: 'unfriend', to: id }); refreshFriends(); }
  };
  $('frList').onclick = frClick; $('frReq').onclick = frClick;
  $('mProfile').onclick = () => { $('nickIn').value = Profile.nick; refreshProfile(); show('s-nick'); };
  refreshProfile();
  $('mBot').onclick = () => {
    Sound.sfx('confirm');
    openSelect('ВЫБЕРИ СВОЕГО БОЙЦА', Flow.p1, id => {
      Flow.p1 = id;
      openSelect('ВЫБЕРИ СОПЕРНИКА', Flow.p2, id2 => { Flow.p2 = id2; refreshSetup(); show('s-setup'); }, () => $('mBot').click());
    }, () => show('s-menu'));
  };
  $('mOnline').onclick = () => {
    if (offlineMsg()) return;
    wakeServer();
    Sound.sfx('confirm');
    openSelect('ВЫБЕРИ СВОЕГО БОЙЦА', Flow.p1, id => { Flow.p1 = id; saveFlow(); hostRoom(); }, () => show('s-menu'));
  };
  $('mHelp').onclick = () => { Sound.sfx('confirm'); show('s-help'); };
  $('helpBack').onclick = () => show('s-menu');
  $('selOk').onclick = () => { Sound.sfx('confirm'); selCb && selCb(ROSTER[selIdx].id); };
  $('selBack').onclick = () => selBack && selBack();
  $('selPrev').onclick = () => stepCard(-1);
  $('selNext').onclick = () => stepCard(1);
  $('selRnd').onclick = () => { pickCard(Math.random() * ROSTER.length | 0); Sound.sfx('confirm'); };
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
    wakeServer();
    Sound.sfx('confirm');
    openSelect('ВЫБЕРИ СВОЕГО БОЙЦА', Flow.p1, id => { Flow.p1 = id; saveFlow(); joinRoom(); }, () => show('s-join'));
  };
  $('waitCancel').onclick = toMenu;
  $('pauseBtn').onclick = () => UI.togglePause();
  $('pResume').onclick = () => UI.togglePause();
  $('pMenu').onclick = toMenu;
  $('resAgain').onclick = () => { Sound.sfx('confirm'); if (G.mode === 'host') hostStart(); else botFight(); };
  $('resNew').onclick = () => $('mBot').click();
  $('resCareer').onclick = () => { Sound.sfx('confirm'); showCareer(); };
  $('mCareer').onclick = () => {
    Sound.sfx('confirm');
    if (Career) { showCareer(); return; }
    openSelect('БОЕЦ ДЛЯ ПУТИ К ПОЯСУ', Flow.p1, id => { Flow.p1 = id; saveFlow(); Career = { fid: id, step: 0, ladder: buildLadder(id) }; showCareer(); }, () => show('s-menu'));
  };
  $('carGo').onclick = () => { Sound.sfx('confirm'); careerFight(); };
  $('carBack').onclick = () => show('s-menu');
  $('mTrain').onclick = () => {
    Sound.sfx('confirm');
    openSelect('БОЕЦ ДЛЯ ТРЕНИРОВКИ', Flow.p1, id => {
      Flow.p1 = id; saveFlow();
      startFight({ mode: 'bot', p1: id, p2: id === 'khabib' ? 'tyson' : 'khabib', stage: 0, diff: 0, train: true, nicks: [Profile.nick, 'ГРУША'] });
      Sound.music('career');
    }, () => show('s-menu'));
  };
  $('resMenu').onclick = toMenu;

  addEventListener('keydown', e => {
    if ($('s-select').classList.contains('hidden')) {
      if (e.code === 'Enter' && !$('s-title').classList.contains('hidden')) $('s-title').click();
      return;
    }
    const cols = getComputedStyle($('grid')).gridTemplateColumns.split(' ').length;
    const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.code];
    if (mv) { stepCard(mv); e.preventDefault(); }
    if (e.code === 'KeyQ' || e.code === 'KeyE') {
      const k = DIVISIONS.findIndex(d => d[0] === curDiv), n = DIVISIONS.length;
      showDiv(DIVISIONS[(k + (e.code === 'KeyE' ? 1 : -1) + n) % n][0]);
    }
    if (e.code === 'Enter' || e.code === 'KeyJ') $('selOk').click();
    if (e.code === 'Escape') $('selBack').click();
  });
}

$('pixCredits') && ($('pixCredits').textContent = 'Pixabay (Pixabay Content License): ' + Sound.credits().join(' · '));

// ---------- Офлайн: игра кэшируется и запускается без интернета
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
addEventListener('online', () => { if (!Lobby.ws) lobbyConnect(); });
const offlineMsg = () => { if (navigator.onLine === false) { $('waitTxt').textContent = 'НЕТ ИНТЕРНЕТА — ОНЛАЙН НЕДОСТУПЕН. ИГРАЙ С БОТАМИ!'; show('s-wait'); return true; } return false; };

// ---------- Запуск
const qs = new URLSearchParams(location.search);
Flow.room = qs.get('room');
Flow.broker = qs.has('b') ? +qs.get('b') || 0 : 0;
buildGrid();
buildSetup();
wire();
layout();
addEventListener('resize', layout);
addEventListener('orientationchange', () => setTimeout(layout, 200));
if (Flow.room) $('titleHint').textContent = 'ДРУГ ЗОВЁТ ТЕБЯ НА БОЙ!';
startDemo();
show('s-title');
lobbyConnect(); refreshFriends();
requestAnimationFrame(loop);
requestAnimationFrame(drawPreview);

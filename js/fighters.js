// Бойцы лиги: внешность, характеристики, позы, удары и пиксельная отрисовка

const ROSTER = [
  {
    id: 'khabib', name: 'ХАБИБ', nick: 'Орёл', flag: '🦅',
    style: 'Борец-самбист. Слабые ноги, зато если схватит — не отпустит.',
    special: 'sp_takedown', spName: 'ДАГЕСТАНСКИЙ ТЕЙКДАУН',
    stats: { pow: 7, spd: 6, grap: 10, reach: 5 },
    scale: 1.0, bulk: 1.15, pMul: 1.0, kMul: 0.85, spd: 1.0, walk: 1.0, hp: 108,
    look: { skin: '#d6a07a', skinD: '#a8714d', hair: '#1c1410', hairStyle: 'short', beard: 'full',
            shorts: '#1c1c1c', shorts2: '#d2a536', gloves: '#161616', hat: 'papakha' },
  },
  {
    id: 'oliveira', name: 'ОЛИВЕЙРА', nick: 'До Бронкс', flag: '🇧🇷',
    style: 'Мастер сабмишенов. Гильотина из любого положения.',
    special: 'sp_choke', spName: 'ГИЛЬОТИНА ДО БРОНКС',
    stats: { pow: 6, spd: 7, grap: 10, reach: 7 },
    scale: 1.03, bulk: 0.95, pMul: 0.95, kMul: 1.05, spd: 1.05, walk: 1.05, hp: 96,
    look: { skin: '#c78a5e', skinD: '#965f3a', hair: '#17110d', hairStyle: 'short', beard: 'goatee',
            shorts: '#1d8a3c', shorts2: '#f3d33a', gloves: '#161616' },
  },
  {
    id: 'jones', name: 'ДЖОН ДЖОНС', nick: 'Кости', flag: '🇺🇸',
    style: 'Длиннющие руки и ноги. Бьёт с дистанции, крутит локти.',
    special: 'sp_elbow', spName: 'ВРАЩАЮЩИЙСЯ ЛОКОТЬ',
    stats: { pow: 8, spd: 6, grap: 8, reach: 10 },
    scale: 1.12, bulk: 1.02, pMul: 1.0, kMul: 1.15, spd: 0.95, walk: 1.0, hp: 106,
    look: { skin: '#7a4a2c', skinD: '#55311c', hair: '#0e0a08', hairStyle: 'short', beard: 'stubble',
            shorts: '#efefef', shorts2: '#c22a2a', gloves: '#161616' },
  },
  {
    id: 'tyson', name: 'МАЙК ТАЙСОН', nick: 'Железный', flag: '🥊',
    style: 'Боксёр-кувалда. Руки — самые тяжёлые в лиге, ноги слабее.',
    special: 'sp_peek', spName: 'ПИК-А-БУ АПЕРКОТ',
    stats: { pow: 10, spd: 9, grap: 1, reach: 4 },
    scale: 0.95, bulk: 1.25, pMul: 1.3, kMul: 0.85, spd: 1.15, walk: 1.15, hp: 100,
    look: { skin: '#6b3f24', skinD: '#4a2915', hair: '#0b0807', hairStyle: 'flattop', beard: 'none',
            shorts: '#111111', shorts2: '#111111', gloves: '#b81d1d', boxing: true, shoes: '#111', tattoo: 'face' },
  },
  {
    id: 'tsarukyan', name: 'ЦАРУКЯН', nick: 'Ахалкалаки', flag: '🇦🇲',
    style: 'Борьба плюс взрывные удары. Летающее колено — коронка.',
    special: 'sp_knee', spName: 'ЛЕТЯЩЕЕ КОЛЕНО',
    stats: { pow: 8, spd: 8, grap: 9, reach: 6 },
    scale: 1.0, bulk: 1.1, pMul: 1.05, kMul: 1.0, spd: 1.05, walk: 1.05, hp: 102,
    look: { skin: '#d9a17b', skinD: '#a9714e', hair: '#141010', hairStyle: 'short', beard: 'full',
            shorts: '#c8202a', shorts2: '#f29a1a', gloves: '#161616' },
  },
  {
    id: 'mcgregor', name: 'МАКГРЕГОР', nick: 'Ноториус', flag: '🇮🇪',
    style: 'Снайпер с левой. Одно попадание — и свет выключен.',
    special: 'sp_left', spName: 'ЛЕВАЯ ИРЛАНДЦА',
    stats: { pow: 9, spd: 9, grap: 4, reach: 7 },
    scale: 1.0, bulk: 0.95, pMul: 1.22, kMul: 0.95, spd: 1.1, walk: 1.1, hp: 92,
    look: { skin: '#f0c4a2', skinD: '#c48f6c', hair: '#b4542a', hairStyle: 'short', beard: 'full',
            beardCol: '#b4542a', shorts: '#127a3e', shorts2: '#f2f2f2', gloves: '#161616', tattoo: 'chest' },
  },
  {
    id: 'adesanya', name: 'АДЕСАНЬЯ', nick: 'Стилбендер', flag: '🇳🇬',
    style: 'Кикбоксер-танцор. Ноги быстрее, чем ты моргаешь.',
    special: 'sp_spin', spName: 'УДАР С РАЗВОРОТА',
    stats: { pow: 7, spd: 9, grap: 3, reach: 9 },
    scale: 1.1, bulk: 0.85, pMul: 0.95, kMul: 1.25, spd: 1.1, walk: 1.12, hp: 92,
    look: { skin: '#5a3520', skinD: '#3d2213', hair: '#0c0806', hairStyle: 'braids', beard: 'none',
            shorts: '#151515', shorts2: '#d22a2a', gloves: '#161616' },
  },
  {
    id: 'poirier', name: 'ПОРЬЕ', nick: 'Бриллиант', flag: '🇺🇸',
    style: 'Боксёр-рубака. Заводит серию и не останавливается.',
    special: 'sp_flurry', spName: 'СЕРИЯ БРИЛЛИАНТА',
    stats: { pow: 8, spd: 8, grap: 6, reach: 6 },
    scale: 1.0, bulk: 1.0, pMul: 1.1, kMul: 1.0, spd: 1.05, walk: 1.0, hp: 102,
    look: { skin: '#e6b28c', skinD: '#b98263', hair: '#3a2416', hairStyle: 'short', beard: 'full',
            beardCol: '#3a2416', shorts: '#1f4fb0', shorts2: '#f2f2f2', gloves: '#161616' },
  },
  {
    id: 'ngannou', name: 'НГАННУ', nick: 'Хищник', flag: '🇨🇲',
    style: 'Медленный гигант. Самый тяжёлый удар в истории.',
    special: 'sp_bomb', spName: 'МОЛОТ ХИЩНИКА',
    stats: { pow: 10, spd: 4, grap: 5, reach: 8 },
    scale: 1.15, bulk: 1.35, pMul: 1.4, kMul: 1.15, spd: 0.85, walk: 0.85, hp: 122,
    look: { skin: '#4a2a18', skinD: '#2f190d', hair: '#000', hairStyle: 'bald', beard: 'stubble',
            shorts: '#0f0f0f', shorts2: '#22a04a', gloves: '#161616' },
  },
  {
    id: 'usyk', name: 'УСИК', nick: 'Кот', flag: '🇺🇦',
    style: 'Боксёр-левша. Кошачьи шаги и серии с неудобных углов.',
    special: 'sp_cat', spName: 'КОШАЧЬЯ СЕРИЯ',
    stats: { pow: 8, spd: 9, grap: 2, reach: 8 },
    scale: 1.08, bulk: 1.05, pMul: 1.15, kMul: 0.9, spd: 1.12, walk: 1.2, hp: 110,
    look: { skin: '#ebbf9b', skinD: '#bd8f6d', hair: '#2a1d14', hairStyle: 'chub', beard: 'none',
            shorts: '#1f5fd0', shorts2: '#f7d21c', gloves: '#1f5fd0', boxing: true, shoes: '#f7d21c' },
  },
  {
    id: 'pimblett', name: 'ПИМБЛЕТТ', nick: 'Бадди', flag: '🇬🇧',
    style: 'Скаузер-хулиган. Машет без остановки и душит из любой позиции.',
    special: 'sp_scouse', spName: 'СКАУЗЕРСКИЙ ЗАМЕС',
    stats: { pow: 7, spd: 8, grap: 8, reach: 6 },
    scale: 1.0, bulk: 0.98, pMul: 1.05, kMul: 1.0, spd: 1.06, walk: 1.05, hp: 98,
    look: { skin: '#f3c9ab', skinD: '#c99a7c', hair: '#ecd27a', hairStyle: 'mullet', beard: 'stubble',
            shorts: '#151515', shorts2: '#d81f26', gloves: '#161616' },
  },
];
const FIGHTER = Object.fromEntries(ROSTER.map(f => [f.id, f]));

// как ведущий объявляет бойца
const INTRO = {
  khabib: ['из Махачкалы, Дагестан', 'Хабиб «Орёл» Нурмагомедов'],
  oliveira: ['из Гуаружи, Бразилия', 'Чарльз «До Бронкс» Оливейра'],
  jones: ['из Рочестера, США', 'Джон «Кости» Джонс'],
  tyson: ['из Бруклина, Нью-Йорк', 'Майк «Железный» Тайсон'],
  tsarukyan: ['из Ахалкалаки', 'Арман Царукян'],
  mcgregor: ['из Дублина, Ирландия', 'Конор «Ноториус» Макгрегор'],
  adesanya: ['из Окленда, Новая Зеландия', 'Исраэль «Стилбендер» Адесанья'],
  poirier: ['из Лафайета, Луизиана', 'Дастин «Бриллиант» Порье'],
  ngannou: ['из Камеруна', 'Фрэнсис «Хищник» Нганну'],
  usyk: ['из Симферополя, Украина', 'Александр «Кот» Усик'],
  pimblett: ['из Ливерпуля, Англия', 'Пэдди «Бадди» Пимблетт'],
};

// ведущий в смокинге
const ANNOUNCER = {
  id: 'announcer', scale: 1.0, bulk: 0.95,
  look: { skin: '#e3b48f', skinD: '#b88a68', hair: '#b9b9b9', hairStyle: 'short', beard: 'none',
          suit: '#16161e', pants: '#16161e', shorts: '#16161e', shorts2: '#16161e', gloves: '#e3b48f', shoes: '#050505' },
};

// ---- Позы: 10 суставов (x вперёд, y вверх отрицательный), начало — между ступнями
// порядок: таз, шея, локоть/кисть передней руки, локоть/кисть задней, колено/стопа передней ноги, задней
const P = (...a) => a;
const POSE = {
  idle:   P(0,-30, 3,-50, 12,-42, 16,-50, 6,-39, 12,-48, 8,-15, 10,0, -5,-15, -10,0),
  idle2:  P(0,-29, 3,-49, 12,-41, 16,-49, 6,-38, 12,-47, 9,-15, 10,0, -5,-14, -10,0),
  walk1:  P(0,-30, 4,-50, 12,-42, 16,-50, 6,-39, 12,-48, 11,-16, 15,0, -4,-14, -9,0),
  walk2:  P(1,-31, 4,-51, 12,-43, 16,-51, 6,-40, 12,-49, 5,-16, 5,-1, 0,-16, -3,-2),
  crouch: P(0,-20, 5,-38, 13,-31, 16,-39, 7,-28, 12,-36, 12,-12, 10,0, -6,-8, -12,0),
  block:  P(0,-30, 1,-49, 9,-44, 9,-54, 5,-42, 6,-53, 8,-15, 10,0, -5,-15, -10,0),
  cblock: P(0,-20, 3,-37, 9,-30, 10,-40, 5,-29, 6,-39, 12,-12, 10,0, -6,-8, -12,0),
  jump:   P(0,-34, 2,-54, 10,-46, 14,-54, 5,-44, 10,-52, 10,-26, 8,-16, -4,-24, -8,-14),
  jab:    P(1,-30, 5,-50, 18,-47, 29,-48, 7,-39, 12,-48, 9,-15, 12,0, -5,-15, -10,0),
  cross:  P(3,-30, 9,-49, 13,-43, 15,-51, 18,-47, 30,-47, 10,-15, 12,0, -3,-14, -8,0),
  upperW: P(0,-26, 6,-43, 12,-37, 15,-45, 4,-30, 10,-28, 11,-13, 10,0, -6,-12, -11,0),
  upper:  P(2,-31, 6,-51, 11,-43, 14,-50, 14,-42, 18,-57, 9,-15, 10,0, -4,-15, -9,0),
  hookW:  P(0,-30, 0,-49, 4,-44, 6,-50, 4,-39, 10,-48, 8,-15, 10,0, -5,-15, -10,0),
  hook:   P(1,-30, 6,-49, 14,-50, 25,-49, 7,-39, 12,-47, 9,-15, 11,0, -5,-15, -10,0),
  ovhW:   P(-1,-30, 0,-50, 10,-43, 14,-50, -2,-46, -4,-56, 8,-15, 10,0, -5,-15, -10,0),
  ovh:    P(3,-30, 11,-47, 10,-40, 12,-47, 18,-50, 28,-43, 10,-15, 12,0, -3,-14, -8,0),
  bodyHook: P(0,-24, 8,-42, 14,-36, 23,-34, 7,-34, 12,-42, 12,-12, 10,0, -6,-10, -12,0),
  teepW:  P(-1,-31, -2,-50, 8,-44, 12,-51, 3,-40, 9,-48, 12,-30, 10,-20, -4,-15, -6,0),
  teep:   P(-2,-31, -4,-50, 6,-44, 10,-51, 2,-40, 8,-48, 13,-34, 31,-32, -4,-15, -6,0),
  highW:  P(0,-31, -1,-50, 9,-44, 13,-51, 4,-40, 9,-48, 5,-15, 6,0, 6,-26, 0,-18),
  high:   P(0,-32, -8,-48, 2,-42, 6,-50, -4,-40, -8,-46, 3,-16, 4,0, 14,-42, 31,-55),
  lowW:   P(0,-30, 0,-50, 10,-43, 14,-50, 5,-39, 11,-48, 5,-15, 6,0, 2,-20, -4,-8),
  low:    P(1,-30, -1,-50, 9,-43, 13,-50, 4,-39, 10,-48, 5,-15, 6,0, 13,-20, 28,-10),
  airPunch: P(0,-34, 4,-53, 16,-49, 27,-45, 6,-44, 10,-52, 10,-26, 8,-16, -4,-24, -8,-14),
  airKick: P(0,-34, -2,-53, 8,-47, 12,-54, 3,-44, 8,-52, 14,-30, 27,-22, -4,-26, -6,-16),
  hit:    P(-2,-29, -7,-47, 4,-42, 8,-48, -1,-38, 4,-44, 7,-15, 10,0, -6,-15, -12,0),
  down:   P(-4,-5, -22,-5, -14,-10, -8,-14, -18,-2, -26,-1, 4,-10, 14,-2, 6,-4, 16,-1),
  sit:    P(0,-8, -4,-26, 4,-18, 10,-22, -6,-14, -10,-6, 10,-14, 16,0, 6,-6, 14,0),
  win:    P(0,-30, 2,-51, 8,-58, 10,-68, -3,-58, -6,-68, 8,-15, 10,0, -5,-15, -10,0),
  win2:   P(0,-31, 2,-52, 9,-60, 12,-70, -3,-60, -5,-70, 8,-16, 10,0, -5,-16, -10,0),
  shoot:  P(-2,-22, 14,-30, 22,-24, 28,-20, 16,-22, 24,-16, 10,-8, 14,0, -8,-6, -16,0),
  mount:  P(4,-12, 8,-30, 14,-22, 16,-14, 6,-22, 10,-26, 14,-4, 10,0, -4,-4, -10,0),
  gnpW:   P(4,-12, 6,-31, 14,-22, 16,-14, 0,-30, 4,-40, 14,-4, 10,0, -4,-4, -10,0),
  gnp:    P(4,-12, 12,-27, 14,-22, 16,-14, 14,-16, 21,-6, 14,-4, 10,0, -4,-4, -10,0),
  guillo: P(0,-30, 12,-38, 16,-30, 20,-24, 12,-30, 18,-22, 7,-15, 8,0, -6,-15, -10,0),
  guilloA: P(-2,-30, 0,-50, 10,-42, 14,-36, 8,-40, 13,-37, 6,-15, 8,0, -7,-15, -12,0),
  knee:   P(0,-36, 4,-56, 12,-52, 16,-58, 8,-50, 12,-56, 16,-46, 8,-30, -4,-30, -10,-18),
  spinW:  P(0,-30, -4,-50, 4,-46, 2,-40, -4,-44, -10,-46, 6,-15, 8,0, -6,-15, -10,0),
  elbow:  P(2,-30, 8,-50, 4,-44, 0,-48, 20,-50, 12,-53, 9,-15, 12,0, -4,-15, -9,0),
  spinKW: P(0,-31, -6,-48, 2,-44, 6,-50, -2,-42, 2,-48, 2,-15, 2,0, -2,-24, -6,-14),
  spinK:  P(-2,-32, -12,-44, -4,-40, -2,-46, -10,-38, -6,-44, -2,-16, -2,0, 14,-34, 35,-37),
  leftS:  P(4,-30, 11,-48, 24,-48, 34,-49, 10,-40, 14,-48, 11,-15, 13,0, -2,-14, -7,0),
  bombW:  P(-1,-30, -2,-50, 10,-42, 14,-48, -4,-50, -8,-61, 8,-15, 10,0, -5,-15, -10,0),
  bomb:   P(4,-29, 13,-45, 8,-38, 10,-46, 22,-48, 32,-40, 11,-15, 13,0, -2,-14, -7,0),
  peekW:  P(0,-24, 8,-40, 13,-36, 14,-44, 9,-34, 12,-42, 11,-12, 10,0, -6,-11, -12,0),
  bfist:  P(2,-30, 8,-50, 20,-51, 31,-50, 6,-40, 10,-46, 9,-15, 12,0, -4,-15, -9,0),
  shk:    P(-1,-33, -11,-46, -2,-42, 2,-48, -8,-40, -4,-46, -1,-16, -1,0, 16,-44, 35,-52),
  bodyK:  P(0,-31, -6,-49, 4,-43, 8,-50, -2,-40, -5,-46, 3,-16, 4,0, 15,-32, 31,-34),
  annL:   P(0,-31, 0,-51, 6,-44, 4,-56, -10,-48, -22,-52, 3,-15, 4,0, -3,-15, -4,0),
  annR:   P(0,-31, 0,-51, 10,-48, 22,-52, -2,-44, -4,-56, 3,-15, 4,0, -3,-15, -4,0),
  bodyJab: P(0,-24, 7,-42, 18,-36, 29,-36, 7,-34, 12,-42, 12,-12, 10,0, -6,-10, -12,0),
  axeW:   P(-1,-32, -4,-50, 6,-44, 10,-51, 2,-40, 8,-48, 10,-46, 14,-66, -4,-15, -6,0),
  axe:    P(1,-31, 2,-50, 8,-43, 12,-50, 4,-40, 10,-48, 16,-36, 28,-38, -4,-15, -6,0),
  kneeUp: P(1,-31, 6,-49, 14,-50, 20,-52, 12,-48, 18,-50, 14,-40, 6,-26, -4,-15, -8,0),
  clinch: P(2,-30, 9,-48, 15,-48, 21,-51, 13,-45, 19,-49, 8,-15, 10,0, -6,-15, -11,0),
  suplex: P(0,-30, -5,-50, 6,-56, 8,-64, 2,-56, 4,-64, 8,-15, 10,0, -6,-15, -11,0),
  pray:   P(0,-30, 2,-51, 7,-43, 6,-53, 5,-43, 5,-54, 8,-15, 10,0, -5,-15, -10,0),
  heart:  P(0,-30, 2,-50, 9,-40, 5,-46, 7,-40, 3,-46, 8,-15, 10,0, -5,-15, -10,0),
  strut:  P(0,-31, 1,-52, 12,-40, 20,-33, -10,-40, -18,-33, 10,-15, 14,0, -8,-15, -14,0),
  flex:   P(0,-30, 2,-51, 12,-50, 10,-60, -10,-50, -8,-60, 9,-15, 12,0, -7,-15, -12,0),
  kiss1:  P(0,-30, 2,-50, 9,-44, 6,-53, 5,-39, 10,-47, 8,-15, 10,0, -5,-15, -10,0),
  kiss2:  P(0,-31, 3,-51, 14,-52, 24,-60, 5,-39, 10,-47, 8,-15, 10,0, -5,-15, -10,0),
  hopak1: P(0,-14, 2,-34, 8,-28, -4,-30, 6,-26, 14,-28, 12,-12, 22,-8, -4,-6, -8,0),
  hopak2: P(0,-14, 2,-34, 8,-28, -4,-30, 6,-26, 14,-28, 4,-6, 8,0, 8,-12, 20,-8),
  dance1: P(-3,-30, 1,-50, 10,-52, 14,-62, -6,-44, -12,-50, 6,-15, 8,0, -7,-15, -12,0),
  dance2: P(3,-30, 3,-50, 12,-44, 18,-50, -2,-52, -4,-62, 9,-15, 12,0, -4,-15, -8,0),
  chest:  P(0,-30, 3,-51, 10,-40, 7,-44, 4,-40, 2,-44, 8,-15, 10,0, -5,-15, -10,0),
  peekW2: P(0,-24, 2,-41, 9,-37, 11,-45, 5,-34, 8,-43, 11,-12, 10,0, -6,-11, -12,0),
};

// ---- Удары. keys: [кадр, поза]; hits: окна попадания; lunge: [с, по, скорость]
const MOVES = {
  jab:   { cat: 'p', len: 18, cancel: 9, chain: { btn: 'p', to: 'cross', at: 6 }, keys: [[0,'idle'],[3,'jab'],[8,'jab'],[18,'idle']],
           hits: [{ s: 3, e: 6, limb: 'fh', dmg: 4, kb: 1.2, stun: 13 }] },
  cross: { cat: 'p', len: 24, cancel: 12, chain: { btn: 'p', to: 'hookP', at: 9 }, lunge: [2, 6, 1.2], keys: [[0,'idle'],[5,'cross'],[11,'cross'],[24,'idle']],
           hits: [{ s: 5, e: 8, limb: 'bh', dmg: 7, kb: 2, stun: 17 }] },
  upper: { cat: 'p', len: 30, cancel: 17, keys: [[0,'idle'],[5,'upperW'],[9,'upper'],[16,'upper'],[30,'idle']],
           hits: [{ s: 8, e: 12, limb: 'bh', dmg: 10, kb: 2.4, stun: 22 }] },
  teep:  { cat: 'k', len: 28, cancel: 16, keys: [[0,'idle'],[5,'teepW'],[9,'teep'],[15,'teep'],[28,'idle']],
           hits: [{ s: 9, e: 12, limb: 'ff', dmg: 7, kb: 4, stun: 16 }] },
  highKick: { cat: 'k', len: 34, cancel: 19, keys: [[0,'idle'],[7,'highW'],[12,'high'],[18,'high'],[34,'idle']],
           hits: [{ s: 12, e: 15, limb: 'bf', dmg: 12, kb: 3, stun: 24 }] },
  lowKick: { cat: 'k', len: 26, cancel: 14, keys: [[0,'idle'],[5,'lowW'],[9,'low'],[14,'low'],[26,'idle']],
           hits: [{ s: 9, e: 12, limb: 'bf', dmg: 6, kb: 1, stun: 15 }] },
  airPunch: { cat: 'p', air: true, len: 20, keys: [[0,'jump'],[3,'airPunch'],[12,'airPunch'],[20,'jump']],
           hits: [{ s: 3, e: 10, limb: 'fh', dmg: 6, kb: 2, stun: 15 }] },
  airKick: { cat: 'k', air: true, len: 24, keys: [[0,'jump'],[4,'airKick'],[16,'airKick'],[24,'jump']],
           hits: [{ s: 4, e: 14, limb: 'ff', dmg: 8, kb: 3, stun: 17 }] },
  // боксёрская «нога» — хуки
  hook:  { cat: 'k', len: 24, cancel: 13, keys: [[0,'idle'],[5,'hookW'],[9,'hook'],[13,'hook'],[24,'idle']],
           hits: [{ s: 9, e: 11, limb: 'fh', dmg: 9, kb: 2.2, stun: 18 }] },
  overhand: { cat: 'k', len: 30, cancel: 18, lunge: [6, 12, 1.4], keys: [[0,'idle'],[8,'ovhW'],[13,'ovh'],[18,'ovh'],[30,'idle']],
           hits: [{ s: 13, e: 16, limb: 'bh', dmg: 12, kb: 3, stun: 22 }] },
  bodyHook: { cat: 'p', len: 24, cancel: 13, keys: [[0,'idle'],[4,'crouch'],[8,'bodyHook'],[13,'bodyHook'],[24,'idle']],
           hits: [{ s: 8, e: 11, limb: 'fh', dmg: 9, kb: 1.5, stun: 26 }] },

  // тройка: джеб → кросс → хук
  hookP: { cat: 'p', len: 24, cancel: 13, keys: [[0,'cross'],[4,'hookW'],[8,'hook'],[12,'hook'],[24,'idle']],
           hits: [{ s: 8, e: 10, limb: 'fh', dmg: 8, kb: 2.4, stun: 18 }] },
  // назад + рука: вертушка рукой (бэкфист)
  backfist: { cat: 'p', len: 30, spinAir: [2, 10], lunge: [3, 10, 1.8], keys: [[0,'idle'],[6,'spinW'],[11,'bfist'],[17,'bfist'],[30,'idle']],
           hits: [{ s: 10, e: 14, limb: 'fh', dmg: 11, kb: 3, stun: 24 }], whoosh: 'spin' },
  // назад + нога: вертушка ногой
  spinKick: { cat: 'k', len: 42, jump: [3, -3.9], lunge: [3, 20, 1.7], spinAir: [3, 17],
           keys: [[0,'crouch'],[3,'jump'],[14,'spinKW'],[18,'shk'],[28,'shk'],[42,'idle']],
           hits: [{ s: 17, e: 23, limb: 'bf', dmg: 15, kb: 4, stun: 30, kd: true }], whoosh: 'spin' },
  // вниз-вперёд + нога: в корпус
  bodyKick: { cat: 'k', len: 30, cancel: 17, keys: [[0,'idle'],[6,'highW'],[11,'bodyK'],[17,'bodyK'],[30,'idle']],
           hits: [{ s: 11, e: 14, limb: 'bf', dmg: 9, kb: 2.5, stun: 20 }] },
  // боксёрам: назад + рука — двойной джеб, назад + «нога» — двойка
  doubleJab: { cat: 'p', len: 28, cancel: 16, keys: [[0,'idle'],[3,'jab'],[7,'idle'],[10,'jab'],[15,'jab'],[28,'idle']],
           hits: [{ s: 3, e: 5, limb: 'fh', dmg: 4, kb: 0.5, stun: 16 }, { s: 10, e: 13, limb: 'fh', dmg: 5, kb: 1.5, stun: 16 }] },
  oneTwo: { cat: 'k', len: 30, cancel: 18, lunge: [1, 10, 1.2], keys: [[0,'idle'],[3,'jab'],[8,'idle'],[11,'cross'],[17,'cross'],[30,'idle']],
           hits: [{ s: 3, e: 5, limb: 'fh', dmg: 5, kb: 0.5, stun: 18 }, { s: 11, e: 14, limb: 'bh', dmg: 8, kb: 2.5, stun: 20 }] },

  // джеб в корпус (вниз-назад + рука)
  bodyJab: { cat: 'p', len: 20, cancel: 10, keys: [[0,'idle'],[3,'crouch'],[6,'bodyJab'],[11,'bodyJab'],[20,'idle']],
           hits: [{ s: 6, e: 9, limb: 'fh', dmg: 5, kb: 1, stun: 16 }] },
  // удар-топор пяткой сверху (вниз-назад + нога)
  axeKick: { cat: 'k', len: 36, keys: [[0,'idle'],[8,'axeW'],[14,'axe'],[20,'axe'],[36,'idle']],
           hits: [{ s: 14, e: 17, limb: 'ff', dmg: 13, kb: 2, stun: 28 }] },
  // вплотную: колено и локоть
  kneeS: { cat: 'k', len: 24, cancel: 13, keys: [[0,'idle'],[5,'kneeUp'],[11,'kneeUp'],[24,'idle']],
           hits: [{ s: 5, e: 9, limb: 'fk', dmg: 9, kb: 2, stun: 20 }] },
  elbowS: { cat: 'p', len: 22, cancel: 12, keys: [[0,'idle'],[4,'hookW'],[8,'elbow'],[12,'elbow'],[22,'idle']],
           hits: [{ s: 7, e: 10, limb: 'be', dmg: 8, kb: 2, stun: 20 }] },
  // сальто с ударом ногой (рука + нога вместе)
  flipKick: { cat: 'k', len: 46, jump: [6, -4.6], lunge: [6, 30, 1.8], spin: [6, 30],
           keys: [[0,'crouch'],[6,'jump'],[18,'airKick'],[30,'airKick'],[46,'idle']],
           hits: [{ s: 16, e: 28, limb: 'ff', dmg: 16, kb: 4, stun: 30, kd: true }], whoosh: 'spin' },

  // ---- Спешлы
  sp_scouse: { cat: 's', len: 50, lunge: [0, 30, 1.5], keys: [[0,'idle'],[4,'hookW'],[8,'hook'],[13,'ovhW'],[17,'ovh'],[22,'hookW'],[26,'hook'],[31,'upperW'],[34,'upper'],[41,'upper'],[50,'idle']],
           hits: [{ s: 8, e: 10, limb: 'fh', dmg: 6, kb: 0.6, stun: 22 }, { s: 17, e: 19, limb: 'bh', dmg: 6, kb: 0.6, stun: 22 },
                  { s: 26, e: 28, limb: 'fh', dmg: 6, kb: 0.6, stun: 22 }, { s: 34, e: 37, limb: 'bh', dmg: 9, kb: 3.5, stun: 36, kd: true }] },
  sp_takedown: { cat: 's', len: 30, lunge: [4, 15, 3.4], keys: [[0,'crouch'],[6,'shoot'],[22,'shoot'],[30,'idle']],
           hits: [], grab: { s: 6, e: 17, r: 30, kind: 'gnp' } },
  sp_choke: { cat: 's', len: 32, lunge: [3, 12, 2.8], keys: [[0,'idle'],[6,'shoot'],[20,'shoot'],[32,'idle']],
           hits: [], grab: { s: 6, e: 15, r: 30, kind: 'guillotine' } },
  sp_elbow: { cat: 's', len: 30, flip: [3, 10], lunge: [4, 11, 2.2], keys: [[0,'idle'],[6,'spinW'],[11,'elbow'],[18,'elbow'],[30,'idle']],
           hits: [{ s: 10, e: 14, limb: 'be', dmg: 17, kb: 4, stun: 30, kd: true }] },
  sp_peek: { cat: 's', len: 40, lunge: [6, 21, 2.6], keys: [[0,'idle'],[6,'peekW'],[12,'peekW2'],[17,'upperW'],[22,'upper'],[30,'upper'],[40,'idle']],
           hits: [{ s: 21, e: 26, limb: 'bh', dmg: 21, kb: 3, stun: 40, kd: true }] },
  sp_knee: { cat: 's', len: 36, jump: [6, -3.6], lunge: [6, 20, 3.2], keys: [[0,'crouch'],[6,'knee'],[24,'knee'],[36,'idle']],
           hits: [{ s: 8, e: 19, limb: 'fk', dmg: 19, kb: 4, stun: 36, kd: true }] },
  sp_left: { cat: 's', len: 26, lunge: [2, 8, 2.8], keys: [[0,'idle'],[4,'leftS'],[14,'leftS'],[26,'idle']],
           hits: [{ s: 4, e: 8, limb: 'fh', dmg: 21, kb: 4, stun: 40, kd: true }] },
  sp_spin: { cat: 's', len: 40, jump: [3, -4.3], lunge: [3, 20, 2], spinAir: [3, 18], keys: [[0,'crouch'],[3,'jump'],[14,'spinKW'],[19,'spinK'],[27,'spinK'],[40,'idle']],
           hits: [{ s: 19, e: 24, limb: 'bf', dmg: 19, kb: 5, stun: 36, kd: true }] },
  sp_flurry: { cat: 's', len: 46, lunge: [0, 28, 1.3], keys: [[0,'idle'],[4,'jab'],[8,'cross'],[14,'hook'],[20,'cross'],[26,'upperW'],[29,'upper'],[36,'upper'],[46,'idle']],
           hits: [{ s: 4, e: 6, limb: 'fh', dmg: 5, kb: 0.6, stun: 22 }, { s: 8, e: 10, limb: 'bh', dmg: 5, kb: 0.6, stun: 22 },
                  { s: 14, e: 16, limb: 'fh', dmg: 6, kb: 0.6, stun: 22 }, { s: 20, e: 22, limb: 'bh', dmg: 6, kb: 0.6, stun: 22 },
                  { s: 29, e: 32, limb: 'bh', dmg: 9, kb: 3, stun: 36, kd: true }] },
  sp_bomb: { cat: 's', len: 44, armor: 20, lunge: [12, 20, 2.6], keys: [[0,'idle'],[14,'bombW'],[19,'bomb'],[28,'bomb'],[44,'idle']],
           hits: [{ s: 19, e: 23, limb: 'bh', dmg: 29, kb: 6, stun: 50, kd: true }] },
  sp_cat: { cat: 's', len: 40, lunge: [3, 10, 3.2], keys: [[0,'idle'],[3,'crouch'],[8,'jab'],[11,'idle'],[13,'jab'],[18,'cross'],[24,'hook'],[30,'hook'],[40,'idle']],
           hits: [{ s: 8, e: 10, limb: 'fh', dmg: 5, kb: 0.5, stun: 22 }, { s: 13, e: 15, limb: 'fh', dmg: 5, kb: 0.5, stun: 22 },
                  { s: 18, e: 20, limb: 'bh', dmg: 8, kb: 0.8, stun: 24 }, { s: 24, e: 27, limb: 'fh', dmg: 9, kb: 3.5, stun: 36, kd: true }] },
};

const JOINTS = ['hip', 'neck', 'fe', 'fh', 'be', 'bh', 'fk', 'ff', 'bk', 'bf'];
const JI = Object.fromEntries(JOINTS.map((j, i) => [j, i]));

function lerpPose(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const r = new Array(20);
  for (let i = 0; i < 20; i++) r[i] = a[i] + (b[i] - a[i]) * t;
  return r;
}

function keyPose(keys, t) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, p0] = keys[i], [f1, p1] = keys[i + 1];
    if (t < f1) return lerpPose(POSE[p0], POSE[p1], (t - f0) / (f1 - f0));
  }
  return POSE[keys[keys.length - 1][1]];
}

// ---- Пиксельная отрисовка
const OUTLINE = '#14090a';

function seg(ctx, x1, y1, x2, y2, w, col) {
  ctx.fillStyle = col;
  const dx = x2 - x1, dy = y2 - y1;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const h = w / 2;
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(Math.round(x1 + dx * i / n - h), Math.round(y1 + dy * i / n - h), w, w);
  }
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

function drawHead(ctx, cx, cy, R, up, L, o, C) {
  const fwd = [-up[1], up[0]];
  const ext = R + 4, size = ext * 2 + 1;
  const grid = new Array(size * size).fill(null);
  const hairC = L.hair, beardC = L.beardCol || L.hair;
  const inside = (u, v) => u * u + v * v <= R * R + R * 0.6;
  for (let yy = -ext; yy <= ext; yy++) {
    for (let xx = -ext; xx <= ext; xx++) {
      const u = Math.round(xx * fwd[0] + yy * fwd[1]);
      const v = Math.round(xx * up[0] + yy * up[1]);
      let c = null;
      const inn = inside(u, v);
      if (inn) {
        c = u <= -R + 1 ? L.skinD : L.skin;
        if (v <= -R * 0.5 && u <= 1) c = L.skinD;
        if (u >= R - 1 && v >= -1 && v <= 1) c = shade(L.skin, 1.1);
        if (u >= -1 && u <= 0 && v >= -1 && v <= 0) c = L.skinD;
        if (u === -1 && v === 0) c = shade(L.skinD, 0.85);
        if (L.beard !== 'full' && u === Math.round(R * 0.6) && v === -Math.round(R * 0.5)) c = shade(L.skin, 0.62);
        const hs = L.hairStyle;
        if ((hs === 'short' || hs === 'flattop' || hs === 'braids' || hs === 'mullet') &&
            (v >= R * 0.35 || (u <= -R * 0.4 && v >= -R * 0.15))) c = (u + v) % 3 === 0 ? shade(hairC, 1.25) : hairC;
        if (hs === 'mullet' && u <= -R * 0.4 && v >= -R * 0.7) c = hairC;
        if (hs === 'chub' && v >= R - 1 && u >= -2 && u <= 1) c = hairC;
        if (L.beard === 'full' && ((v <= -2 && u >= -2) || (v <= 0 && u >= -2 && u <= 0))) c = beardC;
        if (L.beard === 'goatee' && v <= -R * 0.45 && u >= 0) c = beardC;
        if (L.beard === 'stubble' && v <= -R * 0.3 && u >= 0 && ((u + v) & 1)) c = shade(L.skin, 0.7);
        if (R >= 8) {
          const eu = Math.round(R * 0.5), ev = Math.round(R * 0.12);
          if (v === ev && u >= eu - 1 && u <= eu + 1) c = '#f4eee6';
          if (v === ev && u === eu + 1) c = '#2a1a12';
          if (v === ev + 1 && u >= eu - 1 && u <= eu + 1) c = shade(L.skin, 0.8);
          if (v === ev + 2 && u >= eu - 2 && u <= eu + 2 && L.hairStyle !== 'bald') c = shade(L.hair === '#ecd27a' ? '#b08a3a' : L.hair, 0.9);
          if (u >= R - 2 && v >= -2 && v <= 0) c = shade(L.skin, u === R - 2 ? 0.92 : 1.04);
          if (u === R - 1 && v === -2) c = shade(L.skin, 0.7);
          if (L.beard !== 'full' && v === -Math.round(R * 0.48) && u >= Math.round(R * 0.4) && u <= Math.round(R * 0.8)) c = shade(L.skin, 0.68);
          if (u >= -2 && u <= -1 && v >= -1 && v <= 2) c = shade(L.skinD, u === -1 && v >= 0 && v <= 1 ? 0.75 : 1);
        } else if (u === Math.round(R * 0.5) && v === Math.round(R * 0.15)) c = '#120808';
        if (u >= Math.round(R * 0.3) && u <= Math.round(R * 0.75) && v === Math.round(R * 0.45) && L.hairStyle !== 'bald') c = shade(hairC, 0.8);
        if (L.tattoo === 'face' && u === Math.round(R * 0.5) + 1 && (v === Math.round(R * 0.45) || v === Math.round(R * 0.7))) c = '#1a1a1a';
      } else {
        if (L.hairStyle === 'flattop' && v > R - 1 && v <= R + 2 && Math.abs(u) <= R - 1) c = hairC;
        if (L.hairStyle === 'chub' && ((v >= R - 1 && v <= R + 1 && u >= -2 && u <= 0) ||
            (u >= -R - 1 && u <= -R + 1 && v >= -2 && v <= R - 1))) c = hairC;
        if (L.hairStyle === 'braids' && u >= -R - 1 && u <= -R && v >= -4 && v <= 1 && !(v & 1)) c = hairC;
        if (L.hairStyle === 'mullet' && ((u >= -R - 1 && u <= -R + 1 && v >= -R - 1 && v <= 1) || (v === R + 1 && u >= -2 && u <= 2))) c = hairC;
        if (u === R + 1 && (v === 0 || (R >= 8 && v === -1))) c = L.skin; // нос
      }
      if (o.hat && L.hat === 'papakha' && v >= Math.round(R * 0.3) && v <= R + 5 && Math.abs(u) <= R + 1) {
        c = ((u + v) & 1) ? '#bdb5a6' : '#ebe6dc';
      }
      grid[(yy + ext) * size + (xx + ext)] = c;
    }
  }
  // контур
  ctx.fillStyle = C(OUTLINE);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (grid[y * size + x]) continue;
    const nb = (x > 0 && grid[y * size + x - 1]) || (x < size - 1 && grid[y * size + x + 1]) ||
               (y > 0 && grid[(y - 1) * size + x]) || (y < size - 1 && grid[(y + 1) * size + x]);
    if (nb) ctx.fillRect(cx - ext + x, cy - ext + y, 1, 1);
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = grid[y * size + x];
    if (!c) continue;
    ctx.fillStyle = C(c);
    ctx.fillRect(cx - ext + x, cy - ext + y, 1, 1);
  }
}

// def — боец, pose — 20 чисел, X/Y — точка между ступнями на земле, face — 1 вправо / -1 влево
function drawFighter(ctx, def, pose, X, Y, face, o = {}) {
  const L = def.look, s = def.scale * (o.k || 1), b = def.bulk, K = o.k || 1;
  const J = {};
  for (let i = 0; i < 10; i++) J[JOINTS[i]] = [pose[i * 2] * s, pose[i * 2 + 1] * s];
  const C = o.flash ? (() => '#ffffff') : (c => c);

  ctx.save();
  ctx.translate(Math.round(X), Math.round(Y));
  ctx.scale(face, 1);
  if (o.rot) {
    const py = pose[1] * s;
    ctx.translate(0, py); ctx.rotate(o.rot); ctx.translate(0, -py);
  }

  const tv = [J.neck[0] - J.hip[0], J.neck[1] - J.hip[1]];
  const tl = Math.hypot(tv[0], tv[1]) || 1;
  const up = [tv[0] / tl, tv[1] / tl];
  const fwd = [-up[1], up[0]];
  const sh = [J.neck[0] - up[0] * 2 * s, J.neck[1] - up[1] * 2 * s];
  const armW = Math.max(3, Math.round(4 * b * s)), legW = Math.max(4, Math.round(5 * b * s));
  const torW = Math.round(10 * b * s), R = Math.round(5 * s);
  const mid = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];

  // кисть, сужающаяся от w0 к w1
  const tseg = (a, c, w0, w1, col) => {
    ctx.fillStyle = col;
    const dx = c[0] - a[0], dy = c[1] - a[1];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (let i = 0; i <= n; i++) {
      const t = i / n, w = Math.max(1, Math.round(w0 + (w1 - w0) * t));
      ctx.fillRect(Math.round(a[0] + dx * t - w / 2), Math.round(a[1] + dy * t - w / 2), w, w);
    }
  };
  // часть конечности со светом сверху и тенью снизу
  const limb = (a, c, w0, w1, col, outline = true) => {
    if (outline) tseg(a, c, w0 + 2, w1 + 2, C(OUTLINE));
    tseg(a, c, w0, w1, C(col));
    if (w0 < 4) return;
    const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1;
    let px = -dy / l, py = dx / l;
    if (py > 0 || (py === 0 && px < 0)) { px = -px; py = -py; }
    const o0 = w0 / 2 - 1.2, o1 = w1 / 2 - 1.2;
    tseg([a[0] + px * o0, a[1] + py * o0], [c[0] + px * o1, c[1] + py * o1], 1, 1, C(shade(col, 1.16)));
    tseg([a[0] - px * o0, a[1] - py * o0], [c[0] - px * o1, c[1] - py * o1], 1, 1, C(shade(col, 0.8)));
  };
  const leg = (hip, knee, foot, skin, shorts) => {
    const toe = [foot[0] + 4 * s, foot[1]];
    tseg(foot, toe, 5 * K, 4 * K, C(OUTLINE));
    limb(hip, knee, legW + 1, legW, skin);
    limb(knee, foot, legW, legW - 2, skin);
    tseg(foot, toe, 3 * K, 2 * K, C(L.shoes || skin));
    if (!L.shoes) tseg([foot[0] - K, foot[1]], [foot[0] - K, foot[1]], 2 * K, 2 * K, C(shade(skin, 0.8)));
    if (K > 1) {
      // колено и икра
      const kn = mid(knee, foot, 0.12), cf = mid(knee, foot, 0.35);
      tseg(kn, kn, 2, 2, C(shade(skin, 1.12)));
      tseg([cf[0] - 2, cf[1]], [cf[0] - 2, cf[1] + 4], 1, 1, C(shade(skin, 0.82)));
    }
    const m = mid(hip, knee, 0.5);
    tseg(hip, m, legW + 3, legW + 2, C(shorts));
    tseg(mid(hip, knee, 0.45), m, legW + 2, legW + 2, C(shade(shorts, 0.7)));
  };
  const arm = (shp, elbow, hand, skin, glove) => {
    limb(shp, elbow, armW + 1, armW, skin);
    limb(elbow, hand, armW, armW - 1, skin);
    const g = L.boxing ? Math.round(6 * s) : Math.round(4 * s);
    const gx = Math.round(hand[0] - g / 2), gy = Math.round(hand[1] - g / 2);
    ctx.fillStyle = C(OUTLINE);
    ctx.fillRect(gx - 1, gy - 1, g + 2, g + 2);
    ctx.fillStyle = C(glove);
    ctx.fillRect(gx, gy, g, g);
    ctx.fillStyle = C(shade(glove, L.boxing ? 1.4 : 2.6));
    ctx.fillRect(gx + 1, gy, g - 2, 1);
    ctx.fillStyle = C(shade(glove, 0.6));
    ctx.fillRect(gx, gy + g - 1, g, 1);
    if (K > 1) {
      // пальцы и липучка
      ctx.fillStyle = C(shade(glove, 0.45));
      for (let i = 1; i < 4; i++) ctx.fillRect(gx + Math.round(g * i / 4), gy + 1, 1, Math.round(g / 3));
      ctx.fillStyle = C(L.boxing ? '#f2f2f2' : (L.shorts2 || '#c0262d'));
      ctx.fillRect(gx, gy + g, g, Math.max(1, Math.round(K)));
      // бицепс и предплечье
      const bc = mid(shp, elbow, 0.45);
      tseg(bc, bc, 2, 2, C(shade(skin, 1.15)));
    }
  };

  // задние конечности темнее
  const suit = L.suit, legC = suit ? L.pants : L.skin, armC = suit ? L.suit : L.skin;
  leg(J.hip, J.bk, J.bf, suit ? shade(legC, 0.8) : L.skinD, shade(L.shorts, 0.75));
  arm(sh, J.be, J.bh, suit ? shade(armC, 0.8) : L.skinD, shade(L.gloves, 0.75));

  // торс: поперечные штрихи от таза к плечам, грудь шире талии
  const tLen = Math.hypot(sh[0] - J.hip[0], sh[1] - J.hip[1]);
  const band = (k0, k1, wFn, col) => {
    for (let k = k0; k <= k1; k += 0.7) {
      const cx = J.hip[0] + up[0] * k, cy = J.hip[1] + up[1] * k, hw = wFn(k) / 2;
      seg(ctx, cx - fwd[0] * hw, cy - fwd[1] * hw, cx + fwd[0] * hw, cy + fwd[1] * hw, 2, col);
    }
  };
  const torsoW = k => torW * (0.82 + 0.3 * Math.min(1, Math.max(0, k / tLen)));
  band(-2, tLen + 2, k => torsoW(k) + 2, C(OUTLINE));
  band(-1, tLen + 1, torsoW, C(suit ? L.suit : L.skin));
  const hl = torW / 4;
  seg(ctx, J.hip[0] + fwd[0] * hl + up[0] * 5, J.hip[1] + fwd[1] * hl + up[1] * 5,
      sh[0] + fwd[0] * hl - up[0] * 2, sh[1] + fwd[1] * hl - up[1] * 2, 2, C(shade(L.skin, 1.12)));
  seg(ctx, J.hip[0] - fwd[0] * (hl + 1) + up[0] * 4, J.hip[1] - fwd[1] * (hl + 1) + up[1] * 4,
      sh[0] - fwd[0] * (hl + 1) - up[0] * 2, sh[1] - fwd[1] * (hl + 1) - up[1] * 2, 2, C(L.skinD));
  if (suit) {
    // рубашка и бабочка
    for (let k = tLen * 0.55; k <= tLen + 1; k += 0.7) seg(ctx, J.hip[0] + up[0] * k + fwd[0] * 2, J.hip[1] + up[1] * k + fwd[1] * 2, J.hip[0] + up[0] * k + fwd[0] * 3, J.hip[1] + up[1] * k + fwd[1] * 3, 2, C('#f2f2f2'));
    seg(ctx, J.hip[0] + up[0] * (tLen - 1) + fwd[0] * 1, J.hip[1] + up[1] * (tLen - 1) + fwd[1] * 1, J.hip[0] + up[0] * (tLen - 1) + fwd[0] * 4, J.hip[1] + up[1] * (tLen - 1) + fwd[1] * 4, 2, C('#a01818'));
  }
  const at = (k, f) => [J.hip[0] + up[0] * k + fwd[0] * f, J.hip[1] + up[1] * k + fwd[1] * f];
  const dot = (p, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(p[0]), Math.round(p[1]), w, h); };
  // мышцы: грудь, пресс, плечо
  if (!suit) {
  const dk = C(shade(L.skin, 0.78));
  const pw = torsoW(tLen * 0.68) / 2;
  tseg(at(tLen * 0.66, pw * 0.05), at(tLen * 0.66, pw * 0.85), 1, 1, dk);
  dot(at(tLen * 0.74, pw * 0.45), C(shade(L.skin, 0.62)));
  for (const k of [0.3, 0.42, 0.54]) { dot(at(tLen * k, pw * 0.25), dk); dot(at(tLen * k, pw * 0.6), dk); }
  tseg(at(tLen * 0.3, pw * 0.42), at(tLen * 0.58, pw * 0.42), 1, 1, dk);
  dot(at(tLen * 0.9, -pw * 0.2), C(shade(L.skin, 1.18)), 2, 1);
  if (L.tattoo === 'chest') {
    ctx.fillStyle = C('#2c4a3a');
    const c0 = mid(J.hip, sh, 0.7);
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(c0[0] - 2 + i), Math.round(c0[1] + (i & 1)), 1, 1);
    const c1 = mid(J.hip, sh, 0.45);
    ctx.fillRect(Math.round(c1[0] + 1), Math.round(c1[1]), 2, 1);
  }
  }
  // шорты
  const sk = 5 * s;
  if (!suit) {
  band(-3, sk, k => torsoW(k) + 1, C(L.shorts));
  band(sk, sk + 1.4, k => torsoW(k) + 1, C(L.shorts2));
  tseg(at(-2, -torsoW(0) / 2 + 1), at(sk, -torsoW(sk) / 2 + 1), 1, 1, C(L.shorts2));
  dot(at(1, torsoW(1) * 0.2), C(shade(L.shorts, 1.6)), 2, 1);
  }

  leg(J.hip, J.fk, J.ff, legC, L.shorts);

  const hc = [J.neck[0] + up[0] * (R + 1), J.neck[1] + up[1] * (R + 1)];
  drawHead(ctx, Math.round(hc[0]), Math.round(hc[1]), R, up, L, o, C);

  arm(sh, J.fe, J.fh, armC, L.gloves);
  if (o.mic) {
    ctx.fillStyle = C('#111'); ctx.fillRect(Math.round(J.fh[0]) + 1, Math.round(J.fh[1]) - 4, 2, 5);
    ctx.fillStyle = C('#9a9aa6'); ctx.fillRect(Math.round(J.fh[0]), Math.round(J.fh[1]) - 6, 4, 3);
  }
  ctx.restore();
}

// мировая координата сустава
function jointWorld(def, pose, X, Y, face, name) {
  const i = JI[name];
  return [X + pose[i * 2] * def.scale * face, Y + pose[i * 2 + 1] * def.scale];
}

// 8-битный звук: выходные темы бойцов и эффекты прямо на WebAudio, без файлов
const Sound = (() => {
  let ctx = null, master, musicBus, leadBus, distBus, drumBus, sfxBus, noiseBuf, waves = {};
  let song = null, timer = null, nextTime = 0, stepN = 0;
  let muted = false;
  try { muted = localStorage.getItem('pml_mute') === '1'; } catch (e) {}

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const freq = n => {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    return 440 * Math.pow(2, (12 * (+m[2] + 1) + NOTE[m[1]] - 69) / 12);
  };

  // прямоугольная волна с заданной скважностью — тот самый «денди»-звук
  function pulse(duty) {
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) {
      re[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
      im[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
    }
    return ctx.createPeriodicWave(re, im);
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master);
    // соло с эхом
    leadBus = ctx.createGain(); leadBus.connect(musicBus);
    const dl = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
    dl.delayTime.value = 0.21; fb.gain.value = 0.28; wet.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2600;
    leadBus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(musicBus);
    // перегруз для баса и пауэр-аккордов
    const ws = ctx.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
    ws.curve = curve;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
    distBus = ctx.createGain(); distBus.gain.value = 0.9;
    const dOut = ctx.createGain(); dOut.gain.value = 0.32;
    distBus.connect(ws); ws.connect(dlp); dlp.connect(dOut); dOut.connect(musicBus);
    // барабаны чуть подрубленные — плотнее
    const dc = ctx.createDynamicsCompressor(); dc.threshold.value = -18; dc.ratio.value = 6;
    drumBus = ctx.createGain(); drumBus.gain.value = 1.15; drumBus.connect(dc); dc.connect(musicBus);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    waves = { p12: pulse(0.125), p25: pulse(0.25) };
  }

  function tone(type, f, t, dur, vol, dest, slideTo, vib) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    if (waves[type]) o.setPeriodicWave(waves[type]); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    if (vib && dur > 0.25) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6);
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.03);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur * 0.55));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(t, dur, vol, dest, type, cutoff) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  }

  // ---- Песни: 16 шагов на такт, '-' тянет ноту, '.' пауза. Все мелодии оригинальные.
  const bar = s => s.trim().split(/\s+/);
  const CH = {
    Am: ['A4', 'C5', 'E5'], Dm: ['D4', 'F4', 'A4'], E: ['E4', 'G#4', 'B4'], F: ['F4', 'A4', 'C5'], G: ['G4', 'B4', 'D5'],
    C: ['C4', 'E4', 'G4'], Bb: ['A#3', 'D4', 'F4'], A: ['A3', 'C#4', 'E4'], Gm: ['G4', 'A#4', 'D5'], Eb: ['D#4', 'G4', 'A#4'],
    D: ['D4', 'F#4', 'A4'], Cm: ['C4', 'D#4', 'G4'], Ab: ['G#3', 'C4', 'D#4'], Fm: ['F4', 'G#4', 'C5'], Bbm: ['A#3', 'C#4', 'F4'],
    G7: ['G4', 'B4', 'F5'], C7: ['C4', 'E4', 'A#4'], D7: ['D4', 'F#4', 'C5'], Em: ['E4', 'G4', 'B4'], B: ['B3', 'D#4', 'F#4'],
    Glo: ['G3', 'B3', 'D4'], Am5: ['A4', 'C#5', 'E5'],
  };
  const S = (o) => ({ arpVol: 0.03, leadVol: 0.11, wave: 'square', ...o, lead: o.lead.map(bar), chords: o.chords.map(c => CH[c]) });

  const SONGS = {
    menu: S({
      title: 'Тема лиги', bpm: 108, wave: 'p25',
      lead: ['D5 - - - . . A4 - C5 - - - D5 - . .', 'F5 - - - E5 - D5 - C5 - - - A4 - . .',
             'C5 - - - . . G4 - A#4 - - - C5 - . .', 'A4 - - - - - - - C#5 - - - E5 - - -'],
      chords: ['Dm', 'Bb', 'C', 'A'], roots: ['D2', 'A#1', 'C2', 'A1'],
      bass: [0, null, null, 12, null, null, 0, null, 0, null, null, 12, null, null, 7, null],
      drums: ['k...h...s...h...', 'k...h.k.s...h.h.'], arpVol: 0.045, leadVol: 0.07,
    }),
    khabib: S({
      title: 'Горы зовут (лезгинка)', bpm: 150, wave: 'p25',
      lead: ['E5 - F5 - G#5 - F5 - E5 - - - . . E5 F5', 'G#5 - A5 - G#5 - F5 - E5 - D5 - E5 - - -',
             'A5 - G#5 - F5 - E5 - D5 - C5 - B4 - C5 -', 'B4 - C5 - B4 - A4 - G#4 - - - E4 - - -',
             'E5 E5 F5 - E5 E5 F5 - G#5 - F5 - E5 - . .', 'A5 - A5 - G#5 - F5 - G#5 - A5 - B5 - - -',
             'C6 - B5 - A5 - G#5 - F5 - E5 - D5 - F5 -', 'E5 - - - - - - - E4 - G#4 - B4 - E5 -'],
      chords: ['E', 'F', 'Dm', 'E', 'E', 'Am', 'Dm', 'E'], roots: ['E2', 'F2', 'D2', 'E2', 'E2', 'A2', 'D2', 'E2'],
      bass: [0, null, 12, 0, null, 12, 0, null, 0, null, 12, 0, null, 12, 7, null],
      drums: ['k.hkk.hsk.hkk.hs', 'k.hkk.hsk.hks.ss'],
    }),
    oliveira: S({
      title: 'Фавела-фанк', bpm: 128,
      lead: ['D5 - . D5 F5 - D5 - . . A4 - C5 - D5 -', 'F5 - E5 - D5 - C5 - A4 - - - . . . .',
             'A#4 - . A#4 D5 - F5 - . . E5 - D5 - C5 -', 'A4 - - - C#5 - E5 - A5 - G5 - E5 - C#5 -'],
      chords: ['Dm', 'Dm', 'Bb', 'A'], roots: ['D2', 'D2', 'A#1', 'A1'],
      bass: [0, null, null, 0, null, null, 12, null, 0, null, null, 0, null, 7, null, null],
      drums: ['k..k..s.k..k..s.', 'k..k..s.k.kk.ss.'],
    }),
    jones: S({
      title: 'Кости', bpm: 140, wave: 'p12', arpVol: 0.02,
      lead: ['G5 - - - . . A#5 - A5 - G5 - D5 - - -', 'D#5 - - - D5 - C5 - D5 - - - . . . .',
             'G5 - - - . . A#5 - C6 - A#5 - A5 - G5 -', 'F#5 - - - D5 - - - G5 - - - . . . .'],
      chords: ['Gm', 'Eb', 'Gm', 'D'], roots: ['G1', 'D#2', 'G1', 'D2'],
      bass: [0, null, null, null, null, null, null, 0, null, null, 0, null, null, null, null, null],
      drums: ['k.h.h.hhs.h.k.hh', 'k.h.hkh.s.h.hhhh'],
    }),
    tyson: S({
      title: 'Железный кулак', bpm: 92,
      lead: ['C5 - - - D#5 - - - . . G5 - F5 - D#5 -', 'D5 - - - . . . . C5 - A#4 - G4 - - -',
             'G#4 - - - C5 - - - D#5 - - - G5 - - -', 'F5 - D#5 - D5 - - - G4 - - - . . . .'],
      chords: ['Cm', 'Cm', 'Ab', 'Glo'], roots: ['C2', 'C2', 'G#1', 'G1'],
      bass: [0, null, null, 0, null, null, null, null, 0, null, 7, null, null, null, null, null],
      drums: ['k...s..kk.k.s...', 'k...s..k..kks..s'], arpVol: 0.02,
    }),
    tsarukyan: S({
      title: 'Дудук', bpm: 112, wave: 'triangle', leadVol: 0.2,
      lead: ['A4 - - - B4 - C5 - B4 - A4 - G#4 - A4 -', 'E5 - - - - - D5 - C5 - B4 - C5 - - -',
             'D5 - - - C5 - B4 - A4 - G#4 - F4 - - -', 'E4 - G#4 - B4 - D5 - C5 - B4 - A4 - - -',
             'A5 - - - G#5 - F5 - E5 - - - D5 - C5 -', 'D5 - E5 - F5 - E5 - D5 - C5 - B4 - - -',
             'C5 - D5 - E5 - - - A4 - B4 - C5 - B4 -', 'A4 - - - - - - - E4 - - - A4 - - -'],
      chords: ['Am', 'Am', 'Dm', 'E', 'Am', 'Dm', 'Am', 'Am'], roots: ['A1', 'A1', 'D2', 'E2', 'A1', 'D2', 'A1', 'A1'],
      bass: [0, null, null, null, 7, null, null, null, 0, null, null, null, 7, null, 12, null],
      drums: ['k...h.h.s...h.h.', 'k...h.k.s...h.hh'],
    }),
    mcgregor: S({
      title: 'Ирландский джиг', bpm: 168, wave: 'p12',
      lead: ['D5 - F#5 - A5 - F#5 - A5 - D6 - A5 - F#5 -', 'G5 - E5 - C#5 - E5 - A5 - G5 - F#5 - E5 -',
             'D5 - F#5 - A5 - F#5 - B5 - A5 - F#5 - D5 -', 'E5 - C#5 - A4 - C#5 - D5 - - - . . . .',
             'A5 - B5 - A5 - F#5 - D5 - F#5 - A5 - - -', 'B5 - C#6 - D6 - B5 - A5 - F#5 - E5 - - -',
             'D5 - E5 - F#5 - G5 - A5 - B5 - A5 - F#5 -', 'E5 - C#5 - A4 - E5 - D5 - - - - - - -'],
      chords: ['D', 'A', 'D', 'A', 'D', 'G', 'D', 'A'], roots: ['D2', 'A1', 'D2', 'A1', 'D2', 'G1', 'D2', 'A1'],
      bass: [0, null, 7, null, 12, null, 7, null, 0, null, 7, null, 12, null, 7, null],
      drums: ['k.hhs.hhk.hhs.hh'],
    }),
    adesanya: S({
      title: 'Афробит стилбендера', bpm: 106,
      lead: ['F5 - . G#5 - . F5 - D#5 - C5 - . . . .', '. . C5 - D#5 - F5 - G#5 - F5 - D#5 - C5 -',
             'A#4 - . C5 - . D#5 - F5 - D#5 - C5 - . .', 'C5 - - - A#4 - G#4 - G4 - - - . . . .'],
      chords: ['Fm', 'Fm', 'Bbm', 'C'], roots: ['F1', 'F1', 'A#1', 'C2'],
      bass: [0, null, null, 12, null, 0, null, null, null, 0, null, 12, null, null, 7, null],
      drums: ['k..hs.hkk.h.s.hh', 'k..hs.hkk.hks.hs'],
    }),
    poirier: S({
      title: 'Луизианский блюз', bpm: 118, wave: 'p25',
      lead: ['G4 - A#4 - B4 - D5 - E5 - D5 - B4 - G4 -', 'C5 - C#5 - D5 - - - A#4 - G4 - - - . .',
             'C5 - D#5 - E5 - G5 - E5 - D#5 - C5 - A4 -', 'D5 - - - C5 - A4 - G4 - - - . . . .'],
      chords: ['G7', 'G7', 'C7', 'D7'], roots: ['G1', 'G1', 'C2', 'D2'],
      bass: [0, null, 4, null, 7, null, 9, null, 10, null, 9, null, 7, null, 4, null],
      drums: ['k.hhs.hhk.hhs.hh'],
    }),
    ngannou: S({
      title: 'Хищник', bpm: 84, wave: 'p25', leadVol: 0.1,
      lead: ['E4 - - - - - - - G4 - - - F#4 - E4 -', 'B4 - - - - - - - A#4 - - - A4 - G4 -',
             'E5 - - - D5 - - - B4 - - - G4 - - -', 'F#4 - - - - - - - D#4 - - - B3 - - -'],
      chords: ['Em', 'Em', 'C', 'B'], roots: ['E1', 'E1', 'C2', 'B1'],
      bass: [0, null, 0, null, null, null, 0, 0, null, null, 0, null, 12, null, 0, null],
      drums: ['k.k...s.k.k...s.', 'k.k...s.kkk.s.ss'],
    }),
    usyk: S({
      title: 'Казацкий гопак', bpm: 144, wave: 'p25',
      lead: ['D5 - A4 - D5 - E5 - F5 - E5 - D5 - C5 -', 'A#4 - A4 - G4 - A4 - A#4 - C5 - D5 - - -',
             'F5 - E5 - D5 - C5 - A#4 - A4 - G4 - A#4 -', 'A4 - C#5 - E5 - G5 - F5 - E5 - D5 - - -',
             'D6 - C6 - A#5 - A5 - G5 - A5 - A#5 - G5 -', 'A5 - G5 - F5 - E5 - D5 - E5 - F5 - - -',
             'G5 - F5 - E5 - D5 - C#5 - D5 - E5 - C#5 -', 'D5 - - - A4 - - - D5 - - - . . . .'],
      chords: ['Dm', 'Gm', 'Dm', 'A', 'Gm', 'Dm', 'A', 'Dm'], roots: ['D2', 'G1', 'D2', 'A1', 'G1', 'D2', 'A1', 'D2'],
      bass: [0, null, 7, null, 0, null, 7, null, 0, null, 7, null, 0, null, 7, null],
      drums: ['k.h.s.h.k.h.s.hs'],
    }),
    pimblett: S({
      title: 'Гимн трибун Ливерпуля', bpm: 126,
      lead: ['E5 - - - C#5 - E5 - F#5 - E5 - C#5 - A4 -', 'B4 - - - B4 - C#5 - D5 - C#5 - B4 - - -',
             'A4 - C#5 - E5 - A5 - G#5 - F#5 - E5 - C#5 -', 'D5 - - - F#5 - - - E5 - - - . . . .'],
      chords: ['Am5', 'E', 'Am5', 'D'], roots: ['A1', 'E2', 'A1', 'D2'],
      bass: [0, null, 0, 12, null, 0, null, 12, 0, null, 0, 12, null, 0, 7, null],
      drums: ['k.h.s.hkk.h.s.h.'],
    }),
  };

  // жёсткая версия: быстрее, двойная бочка, пауэр-аккорды
  const HARD = {
    menu:      { bpm: 122, riff: 'x..x..x.x.......', drums: ['k.h.s.hkk.h.s.h.', 'k.hks.hkk.hks.ss'] },
    khabib:    { bpm: 162, riff: 'x.xx.x.xx.xx.x.x', drums: ['k.hkk.hsk.hkk.hs', 'kkhkk.hskkhks.ss'], hats16: 1 },
    oliveira:  { bpm: 136, riff: 'x..x..x.x..x..x.', drums: ['k..k.hs.k..k.hsh', 'k..kk.s.k.kk.sss'], hats16: 1 },
    jones:     { bpm: 146, riff: 'x.......x.x.....', drums: ['k.hhh.hhs.hhkhhh', 'k.hhhkhhs.hhhhss'] },
    tyson:     { bpm: 100, riff: 'x..x....x.x.....', drums: ['k..ks..kk.k.s..s', 'k..ks..k.kkks.ss'], hats16: 1 },
    tsarukyan: { bpm: 128, riff: 'x...x...x...x.x.', drums: ['k.hks.hkk.hks.hs', 'kkhks.hkkkhks.ss'] },
    mcgregor:  { bpm: 176, riff: 'x.xx.xx.xx.x.xx.', drums: ['k.hhs.hhk.hhs.hk', 'kkhhs.hhkkhhsss.'] },
    adesanya:  { bpm: 114, riff: 'x..x.x..x..x.x..', drums: ['k..hs.hkk.hks.hh', 'k.khs.hkk.hks.ss'], hats16: 1 },
    poirier:   { bpm: 134, riff: 'x.x.x.x.x.x.x.x.', drums: ['k.h.s.hkk.h.s.hh', 'kkh.s.hkkkh.s.ss'] },
    ngannou:   { bpm: 92, riff: 'x...x.x.x...x...', drums: ['k.k...s.k.k.kks.', 'kkk...s.kkk.s.ss'], hats16: 1 },
    usyk:      { bpm: 154, riff: 'x.x.x.xxx.x.x.xx', drums: ['k.h.s.hkk.h.s.hs', 'kkh.s.hkkkh.s.ss'] },
    pimblett:  { bpm: 142, riff: 'x..x..x.x..x..x.', drums: ['k.h.s.hkk.h.s.h.', 'k.hks.hkk.hks.ss'] },
  };
  for (const k in HARD) Object.assign(SONGS[k], HARD[k]);

  function playStep(i, t, sd) {
    const s = song, b = Math.floor(i / 16) % s.lead.length, k = i % 16;
    const tok = s.lead[b][k];
    if (tok !== '-' && tok !== '.') {
      let len = 1;
      while (k + len < 16 && s.lead[b][k + len] === '-') len++;
      tone(s.wave, freq(tok), t, len * sd * 0.92, s.leadVol, leadBus, 0, true);
      if (s.wave !== 'triangle') tone(s.wave, freq(tok) * 1.007, t, len * sd * 0.6, s.leadVol * 0.25, musicBus);
    }
    const ch = s.chords[b % s.chords.length];
    if (s.arpVol) tone('p12', freq(ch[k % ch.length]), t, sd * 0.7, s.arpVol, musicBus);
    const root = freq(s.roots[b % s.roots.length]);
    const bo = s.bass[k];
    if (bo !== null) {
      const f = root * Math.pow(2, bo / 12);
      tone('triangle', f, t, sd * 1.6, 0.24, musicBus);
      tone('sawtooth', f, t, sd * 1.3, 0.22, distBus);
    }
    // пауэр-аккорд: прима + квинта + октава через перегруз
    if (s.riff && s.riff[k] === 'x') {
      [0, 7, 12].forEach(st => tone('sawtooth', root * 2 * Math.pow(2, st / 12), t, sd * 1.7, 0.14, distBus));
    }
    if (k === 0 && b % 4 === 0) noise(t, 1.1, 0.16, drumBus, 'highpass', 5000);
    const dr = s.drums[b % s.drums.length][k];
    if (dr === 'k') {
      tone('sine', 190, t, 0.22, 0.85, drumBus, 36);
      noise(t, 0.02, 0.4, drumBus, 'lowpass', 4000);
    }
    if (dr === 's') {
      noise(t, 0.2, 0.55, drumBus, 'highpass', 900);
      noise(t, 0.05, 0.4, drumBus, 'bandpass', 3500);
      tone('triangle', 230, t, 0.1, 0.35, drumBus, 120);
    }
    if (dr === 'h') noise(t, 0.035, 0.16, drumBus, 'highpass', 8000);
    if (s.hats16 && dr === '.') noise(t, 0.02, 0.07, drumBus, 'highpass', 9000);
  }

  function sched() {
    if (!song || !ctx) return;
    const sd = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      playStep(stepN, nextTime, sd);
      nextTime += sd; stepN++;
    }
  }

  function music(name) {
    init(); if (!ctx) return;
    const s = SONGS[name] || SONGS.menu;
    if (song === s) return;
    stopMusic();
    song = s; stepN = 0; nextTime = ctx.currentTime + 0.08;
    timer = setInterval(sched, 25);
  }
  function stopMusic() { clearInterval(timer); timer = null; song = null; }

  // ---- Звуковые эффекты
  let quiet = false;
  function sfx(name) {
    if (!ctx || quiet) return;
    const t = ctx.currentTime, B = sfxBus;
    switch (name) {
      case 'punch': noise(t, 0.08, 0.5, B, 'lowpass', 1800); tone('square', 180, t, 0.07, 0.15, B, 70); break;
      case 'kick': noise(t, 0.12, 0.6, B, 'lowpass', 1100); tone('square', 120, t, 0.1, 0.2, B, 50); break;
      case 'heavy':
        noise(t, 0.25, 0.8, B, 'lowpass', 900); tone('square', 110, t, 0.22, 0.3, B, 35);
        tone('sine', 70, t, 0.3, 0.5, B, 30); break;
      case 'block': tone('square', 900, t, 0.05, 0.12, B, 600); noise(t, 0.04, 0.25, B, 'highpass', 3000); break;
      case 'whoosh': noise(t, 0.12, 0.18, B, 'bandpass', 1500); break;
      case 'spin': noise(t, 0.25, 0.25, B, 'bandpass', 900); noise(t + 0.08, 0.15, 0.2, B, 'bandpass', 1800); break;
      case 'jump': tone('square', 220, t, 0.12, 0.08, B, 440); break;
      case 'land': noise(t, 0.06, 0.25, B, 'lowpass', 500); break;
      case 'grab': tone('square', 140, t, 0.18, 0.18, B, 260); noise(t, 0.15, 0.3, B, 'lowpass', 700); break;
      case 'special':
        [0, 0.05, 0.1, 0.15].forEach((d, i) => tone('square', 330 * Math.pow(1.26, i), t + d, 0.1, 0.12, B));
        break;
      case 'ko':
        tone('square', 600, t, 0.9, 0.2, B, 60); noise(t, 0.6, 0.5, B, 'lowpass', 600);
        tone('sine', 55, t, 0.8, 0.6, B, 30); break;
      case 'bell':
        tone('sine', 1320, t, 1.2, 0.25, B); tone('sine', 2640, t, 0.8, 0.08, B);
        tone('sine', 1320, t + 0.18, 1.0, 0.2, B); break;
      case 'select': tone('square', 660, t, 0.06, 0.1, B); break;
      case 'confirm': tone('square', 523, t, 0.08, 0.12, B); tone('square', 784, t + 0.08, 0.14, 0.12, B); break;
      case 'win':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone('square', freq(n), t + i * 0.13, 0.2, 0.13, B));
        tone('square', freq('C6'), t + 0.55, 0.6, 0.12, B); break;
      case 'lose':
        ['G4', 'F4', 'D#4', 'C4'].forEach((n, i) => tone('square', freq(n), t + i * 0.2, 0.25, 0.12, B)); break;
    }
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('pml_mute', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = m ? 0 : 0.55;
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  return {
    init, music, stopMusic, sfx, setMuted,
    title: name => (SONGS[name] || SONGS.menu).title,
    get muted() { return muted; },
    set quiet(q) { quiet = q; },
  };
})();

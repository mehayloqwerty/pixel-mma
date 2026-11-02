// 8-битный звук: чиптюн-музыка и эффекты прямо на WebAudio, без файлов
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let song = null, timer = null, nextTime = 0, stepN = 0;
  let muted = false;
  try { muted = localStorage.getItem('pml_mute') === '1'; } catch (e) {}

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const freq = n => {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    return 440 * Math.pow(2, (12 * (+m[2] + 1) + NOTE[m[1]] - 69) / 12);
  };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(type, f, t, dur, vol, dest, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
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

  // ---- Песни: 16 шагов на такт, '-' тянет ноту, '.' пауза
  const bar = s => s.trim().split(/\s+/);
  const SONGS = {
    fight: {
      bpm: 152,
      lead: [
        'A4 - . A4 C5 - E5 - D5 - C5 - A4 - . .',
        'G4 - A4 - . . E4 - G4 - A4 - C5 - . .',
        'F5 - E5 - C5 - A4 - . A4 C5 - F5 - E5 -',
        'D5 - - - B4 - G4 - D5 - E5 - D5 - B4 -',
        'A4 - . A4 C5 - E5 - A5 - G5 - E5 - . .',
        'D5 - C5 - A4 - G4 - A4 - - - . . . .',
        'F4 - A4 - C5 - F5 - E5 - C5 - A4 - C5 -',
        'B4 - - - G#4 - - - E4 - G#4 - B4 - E5 -',
      ].map(bar),
      roots: ['A2', 'A2', 'F2', 'G2', 'A2', 'A2', 'F2', 'E2'],
      chords: [['A4', 'C5', 'E5'], ['A4', 'C5', 'E5'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'],
               ['A4', 'C5', 'E5'], ['A4', 'C5', 'E5'], ['F4', 'A4', 'C5'], ['E4', 'G#4', 'B4']],
      bass: [0, null, 12, null, 0, null, 12, 0, null, 0, 12, null, 0, null, 12, null],
      drums: ['k.h.s.h.k.k.s.h.', 'k.h.s.h.k.h.s.ss'],
      arpVol: 0.035, leadVol: 0.09,
    },
    menu: {
      bpm: 108,
      lead: [
        'D5 - - - . . A4 - C5 - - - D5 - . .',
        'F5 - - - E5 - D5 - C5 - - - A4 - . .',
        'C5 - - - . . G4 - A#4 - - - C5 - . .',
        'A4 - - - - - - - C#5 - - - E5 - - -',
      ].map(bar),
      roots: ['D2', 'A#1', 'C2', 'A1'],
      chords: [['D4', 'F4', 'A4'], ['A#3', 'D4', 'F4'], ['C4', 'E4', 'G4'], ['A3', 'C#4', 'E4']],
      bass: [0, null, null, 12, null, null, 0, null, 0, null, null, 12, null, null, 7, null],
      drums: ['k...h...s...h...', 'k...h.k.s...h.h.'],
      arpVol: 0.045, leadVol: 0.07,
    },
  };

  function playStep(i, t, sd) {
    const s = song, b = Math.floor(i / 16) % s.lead.length, k = i % 16;
    const tok = s.lead[b][k];
    if (tok !== '-' && tok !== '.') {
      let len = 1;
      while (k + len < 16 && s.lead[b][k + len] === '-') len++;
      tone('square', freq(tok), t, len * sd * 0.92, s.leadVol, musicBus);
      tone('square', freq(tok) * 1.006, t, len * sd * 0.6, s.leadVol * 0.3, musicBus);
    }
    const ch = s.chords[b];
    tone('square', freq(ch[k % ch.length]), t, sd * 0.7, s.arpVol, musicBus);
    const bo = s.bass[k];
    if (bo !== null) {
      const f = freq(s.roots[b]) * Math.pow(2, bo / 12);
      tone('triangle', f, t, sd * 1.6, 0.22, musicBus);
    }
    const dr = s.drums[b % s.drums.length][k];
    if (dr === 'k') tone('sine', 160, t, 0.16, 0.5, musicBus, 40);
    if (dr === 's') { noise(t, 0.13, 0.28, musicBus, 'highpass', 1200); tone('triangle', 190, t, 0.07, 0.18, musicBus, 120); }
    if (dr === 'h') noise(t, 0.035, 0.12, musicBus, 'highpass', 7000);
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
    if (song === SONGS[name]) return;
    stopMusic();
    song = SONGS[name]; stepN = 0; nextTime = ctx.currentTime + 0.08;
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
    get muted() { return muted; },
    set quiet(q) { quiet = q; },
  };
})();

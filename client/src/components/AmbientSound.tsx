import { useLang } from '../lib/language';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import '../styles/ambient-sound.css';

// Four slow bars in D major, with a sparse answering phrase an octave above the bass.
const BARS = [
  { bass: 50, notes: [69, 73, 76, 0, 74, 0, 69, 0] },
  { bass: 47, notes: [66, 0, 69, 73, 0, 71, 0, 0] },
  { bass: 43, notes: [67, 71, 0, 74, 78, 0, 74, 0] },
  { bass: 45, notes: [73, 0, 69, 64, 0, 66, 0, 0] }
];

async function renderMelody() {
  const step = 0.78;
  const rate = 24000;
  const offline = new OfflineAudioContext(1, Math.ceil(BARS.length * 8 * step * rate), rate);

  function note(pitch: number, start: number, duration: number, volume: number) {
    const oscillator = offline.createOscillator();
    const envelope = offline.createGain();
    oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.11);
    envelope.gain.exponentialRampToValueAtTime(0.00003, start + duration);
    oscillator.connect(envelope).connect(offline.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  BARS.forEach(({ bass, notes }, bar) => {
    const start = bar * 8 * step;
    note(bass, start, 5.6, 0.062);
    note(bass + 7, start + 0.32, 5.1, 0.028);
    notes.forEach((pitch, index) => {
      if (!pitch) return;
      const time = start + index * step;
      note(pitch, time, 1.92, 0.10);
      note(pitch + 12, time + 0.24, 1.45, 0.019);
    });
  });
  return offline.startRendering();
}

const SoundContext = createContext<{playing:boolean; failed:boolean; toggle:()=>void} | null>(null);

export function SoundProvider({children}:{children: ReactNode}) {
  const audio = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const pauseTimer = useRef<number | undefined>(undefined);
  const busy = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => {
    window.clearTimeout(pauseTimer.current);
    const context = audio.current;
    audio.current = null;
    if (context) void context.close();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const context = audio.current;
    const output = master.current;
    if (!context || !output) return;
    const ctx = context;
    const bus = output;
    let lastSplash = -Infinity;
    function tone(hz: number, endHz: number, delay: number, length: number, volume: number) {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(hz, start);
      osc.frequency.exponentialRampToValueAtTime(endHz, start + length * .65);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.025, length / 8));
      gain.gain.exponentialRampToValueAtTime(.0001, start + length);
      osc.connect(gain).connect(bus);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      osc.start(start);
      osc.stop(start + length);
    }
    function accent(event: Event) {
      if (document.hidden || ctx.state !== 'running') return;
      if (event.type === 'water-splash') {
        if (ctx.currentTime - lastSplash < .065) return;
        lastSplash = ctx.currentTime;
        tone(490, 180, 0, .20, .11);
      } else if (event.type === 'portfolio-folio') {
        const opening = (event as CustomEvent<{ open: boolean }>).detail?.open;
        tone(opening ? 370 : 440, opening ? 370 : 440, 0, .38, .050);
        tone(opening ? 554 : 294, opening ? 554 : 294, .12, .50, .035);
      } else {
        [440, 554.37, 659.25].forEach((hz, i) => tone(hz, hz, .15 * i, .95, .042));
      }
    }
    function followVisibility() {
      if (document.hidden) {
        void ctx.suspend().catch(() => {});
      } else {
        void ctx.resume().catch(() => { setPlaying(false); setFailed(true); });
      }
    }
    const events = ['water-splash', 'portfolio-folio', 'portfolio-light-caught'];
    events.forEach(name => window.addEventListener(name, accent));
    document.addEventListener('visibilitychange', followVisibility);
    followVisibility();
    return () => {
      events.forEach(name => window.removeEventListener(name, accent));
      document.removeEventListener('visibilitychange', followVisibility);
    };
  }, [playing]);

  async function toggle() {
    if (busy.current) return;
    busy.current = true;
    window.clearTimeout(pauseTimer.current);
    try {
      const context = audio.current ?? new AudioContext();
      audio.current = context;
      if (playing && master.current) {
        master.current.gain.setTargetAtTime(0, context.currentTime, 0.025);
        pauseTimer.current = window.setTimeout(() => { void context.suspend(); }, 160);
        setPlaying(false);
        return;
      }
      await context.resume();
      if (!master.current) {
        const buffer = await renderMelody();
        if (audio.current !== context) return;
        const output = context.createGain();
        output.gain.value = 0;
        output.connect(context.destination);
        const loop = context.createBufferSource();
        loop.buffer = buffer;
        loop.loop = true;
        loop.connect(output);
        loop.start();
        master.current = output;
      }
      master.current.gain.setTargetAtTime(0.85, context.currentTime, 0.09);
      setPlaying(true);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
    }
  }

  return <SoundContext.Provider value={{playing,failed,toggle}}>{children}</SoundContext.Provider>;
}

export default function AmbientSound({inHeader=false}:{inHeader?: boolean}) {
  const kk=useLang()==='kk';
  const state=useContext(SoundContext);
  if (!state) return null;
  const {playing,failed,toggle}=state;
  if (typeof AudioContext === 'undefined' || typeof OfflineAudioContext === 'undefined') return null;
  const label=kk?(playing?'Әуенді өшіру':'Әуенді қосу'):(playing?'Выключить мелодию':'Включить мелодию');
  return (
    <button type="button" className={inHeader ? "ambient-sound header-sound" : "ambient-sound footer-sound"} aria-label={kk?'Фондық әуен':'Фоновая мелодия'} aria-pressed={playing}
      onClick={toggle} title={failed ? (kk?'Әуен қосылмады. Қайталап көріңіз':'Не удалось включить мелодию. Попробовать снова') : label}>
      <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9.5h3L12 5v14l-5-4.5H4z" />
        {playing ? <path d="M15.5 8.5a5 5 0 0 1 0 7m2.7-9.7a8.8 8.8 0 0 1 0 12.4" /> : <path d="m16 10 4 4m0-4-4 4" />}
      </svg>
    </button>
  );
}

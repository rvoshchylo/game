import type { Settings } from '../run/meta';
import type { SimEvent } from '../run/sim';

/**
 * Synthesized SFX (Web Audio). No files, no licenses, tiny build.
 * Swappable later for CC0 sample packs behind the same method names.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastPlay = new Map<string, number>();

  constructor(private settings: () => Settings) {}

  /** Browsers require a user gesture before audio may start. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private ready(name: string, minGapMs: number): AudioContext | null {
    const s = this.settings();
    if (!this.ctx || !this.master || !s.sfx || this.ctx.state !== 'running') return null;
    this.master.gain.value = s.volume * 0.5;
    const now = performance.now();
    if (now - (this.lastPlay.get(name) ?? 0) < minGapMs) return null;
    this.lastPlay.set(name, now);
    return this.ctx;
  }

  private tone(type: OscillatorType, freq: number, dur: number, vol: number, slideTo?: number, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, vol: number, filterFreq: number, type: BiquadFilterType = 'lowpass', delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  strike(): void {
    if (!this.ready('strike', 55)) return;
    this.burst(0.06, 0.35, 1800 + Math.random() * 600);
    this.tone('square', 180 + Math.random() * 30, 0.05, 0.08);
  }
  fracture(chain: number): void {
    if (!this.ready('fracture', 30)) return;
    const base = 520 * Math.pow(1.06, chain);
    this.tone('square', base, 0.12, 0.12);
    this.tone('triangle', base * 1.5, 0.18, 0.1);
    this.burst(0.08, 0.3, 4000, 'highpass');
  }
  kill(boss: boolean): void {
    if (!this.ready('kill', 40)) return;
    this.burst(boss ? 0.8 : 0.18, boss ? 0.6 : 0.35, boss ? 600 : 1200);
    this.tone('square', boss ? 220 : 330, boss ? 0.6 : 0.15, 0.1, boss ? 55 : 110);
  }
  hurt(): void {
    if (!this.ready('hurt', 120)) return;
    this.tone('sawtooth', 120, 0.12, 0.08, 70);
  }
  vent(): void {
    if (!this.ready('vent', 200)) return;
    this.burst(0.7, 0.45, 500);
    this.tone('sine', 90, 0.6, 0.25, 45);
  }
  heatFull(): void {
    if (!this.ready('heat', 500)) return;
    this.tone('triangle', 660, 0.12, 0.08);
    this.tone('triangle', 990, 0.18, 0.08, undefined, 0.08);
  }
  tollWarn(): void {
    if (!this.ready('tollWarn', 300)) return;
    this.tone('sine', 1320, 0.25, 0.05);
  }
  toll(): void {
    if (!this.ready('toll', 300)) return;
    for (const [f, v] of [
      [110, 0.25],
      [220, 0.18],
      [277, 0.1],
      [330, 0.1],
      [440, 0.06],
    ] as const)
      this.tone('sine', f, 1.6, v);
  }
  counter(): void {
    if (!this.ready('counter', 200)) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, 0.25, 0.09, undefined, i * 0.04));
  }
  unlock_(): void {
    if (!this.ready('unlock', 200)) return;
    [392, 523, 659].forEach((f, i) => this.tone('square', f, 0.14, 0.06, undefined, i * 0.08));
  }
  item(rarityIndex: number): void {
    if (!this.ready('item', 150)) return;
    const notes = [523, 659, 784, 988, 1175].slice(0, 2 + rarityIndex);
    notes.forEach((f, i) => this.tone('triangle', f, 0.2, 0.08, undefined, i * 0.07));
  }
  retreat(): void {
    if (!this.ready('retreat', 300)) return;
    this.tone('sawtooth', 220, 0.5, 0.1, 60);
  }
  signal(): void {
    if (!this.ready('signal', 500)) return;
    this.tone('sine', 300, 0.9, 0.06, 900);
  }
  click(): void {
    if (!this.ready('click', 40)) return;
    this.tone('square', 880, 0.03, 0.04);
  }
  error(): void {
    if (!this.ready('error', 150)) return;
    this.tone('square', 110, 0.12, 0.06);
  }
  fanfare(): void {
    if (!this.ready('fanfare', 500)) return;
    [392, 523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, 0.3, 0.07, undefined, i * 0.1));
  }

  gem(): void {
    if (!this.ready('gem', 45)) return;
    this.tone('triangle', 1100 + Math.random() * 300, 0.05, 0.035);
  }

  /** React to simulation events. */
  play(e: SimEvent): void {
    switch (e.k) {
      case 'shot':
        this.strike();
        break;
      case 'kill':
        this.kill(e.boss);
        break;
      case 'hurt':
        this.hurt();
        break;
      case 'gem':
        this.gem();
        break;
      case 'levelup':
        this.unlock_();
        break;
      case 'chest':
        this.item(3);
        break;
      case 'boss':
        this.toll();
        break;
      case 'swarm':
        this.signal();
        break;
      case 'blast':
        this.vent();
        break;
      case 'pickup':
        if (e.kind !== 'chest') this.item(1);
        break;
      case 'revive':
        this.counter();
        break;
      case 'over':
        if (e.result === 'win') this.fanfare();
        else this.retreat();
        break;
      default:
        break;
    }
  }
}

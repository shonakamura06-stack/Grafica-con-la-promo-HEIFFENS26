/**
 * Motor de sonido — ¡Piso Equivocado!
 * Todos los sonidos son ORIGINALES y sintetizados con WebAudio:
 * no se usan canciones ni recursos con licencia.
 * Incluye música ambiental del hotel en bucle (melodía pentatónica suave).
 */

type OscType = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;
  soundEnabled = true;
  musicEnabled = true;
  private visBound = false;

  /** Debe llamarse tras un gesto del usuario (toque/clic). */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      // Pausar el audio cuando la pestaña/app está oculta (ahorra batería y RAM).
      if (!this.visBound && typeof document !== 'undefined') {
        this.visBound = true;
        document.addEventListener('visibilitychange', () => {
          if (!this.ctx) return;
          if (document.hidden) void this.ctx.suspend();
          else void this.ctx.resume();
        });
      }
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, dur: number, type: OscType = 'sine', vol = 0.5, delay = 0, dest?: GainNode): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    if (!this.ctx || !this.master || !this.soundEnabled) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(dest ?? this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private sweep(f0: number, f1: number, dur: number, type: OscType = 'sine', vol = 0.4, delay = 0): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    if (!this.ctx || !this.master || !this.soundEnabled) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // ── Efectos ──────────────────────────────────────────────────────────────
  click(): void { this.tone(700, 0.07, 'triangle', 0.35); }
  select(): void { this.tone(520, 0.09, 'sine', 0.45); this.tone(780, 0.1, 'sine', 0.4, 0.06); }
  deselect(): void { this.tone(660, 0.09, 'sine', 0.4); this.tone(440, 0.1, 'sine', 0.35, 0.06); }
  error(): void { this.sweep(220, 140, 0.22, 'square', 0.22); }
  boing(): void { this.sweep(180, 520, 0.28, 'sine', 0.45); }
  ding(): void { this.tone(1318, 0.35, 'sine', 0.4); this.tone(1760, 0.3, 'sine', 0.25, 0.05); }
  doorOpen(): void { this.sweep(300, 520, 0.18, 'triangle', 0.2); }
  doorClose(): void { this.sweep(520, 300, 0.18, 'triangle', 0.2); }
  moveStart(): void { this.sweep(90, 140, 0.25, 'sawtooth', 0.12); }
  happy(): void { this.tone(880, 0.1, 'sine', 0.4); this.tone(1174, 0.14, 'sine', 0.4, 0.08); }
  wake(): void { this.tone(659, 0.1, 'triangle', 0.4); this.tone(988, 0.16, 'triangle', 0.4, 0.09); }
  coin(): void { this.tone(988, 0.08, 'square', 0.25); this.tone(1318, 0.22, 'square', 0.25, 0.07); }
  star(i: number): void { this.tone(880 + i * 220, 0.25, 'sine', 0.45); }
  unlock(): void { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.4, i * 0.09)); }
  victory(): void {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.45, i * 0.11));
  }
  pop(): void { this.sweep(400, 900, 0.08, 'sine', 0.35); }
  /** "¡Piso equivocado!": bajada dramática tipo trombón triste. */
  wrong(): void {
    this.sweep(392, 370, 0.22, 'sawtooth', 0.22);
    this.sweep(370, 349, 0.22, 'sawtooth', 0.22, 0.2);
    this.sweep(349, 311, 0.4, 'sawtooth', 0.25, 0.4);
  }
  /** Los monstruos se bajan molestos: bufido descendente. */
  grumpy(): void {
    this.sweep(300, 180, 0.3, 'square', 0.18);
    this.sweep(260, 150, 0.35, 'square', 0.18, 0.15);
  }

  // ── Música ambiental (bucle original) ────────────────────────────────────
  startMusic(): void {
    this.ensure();
    if (!this.ctx || this.musicTimer !== null) return;
    // Melodía pentatónica de Do mayor, 16 pasos, tempo suave.
    const melody = [523, 587, 659, 784, 659, 587, 523, 587, 659, 784, 880, 784, 659, 587, 523, 0];
    const bass = [131, 0, 0, 0, 98, 0, 0, 0, 110, 0, 0, 0, 98, 0, 0, 0];
    this.step = 0;
    const tick = () => {
      if (this.musicEnabled && this.ctx && this.musicGain) {
        const m = melody[this.step % melody.length];
        const b = bass[this.step % bass.length];
        if (m) this.tone(m, 0.32, 'triangle', 0.5, 0, this.musicGain);
        if (b) this.tone(b, 0.4, 'sine', 0.6, 0, this.musicGain);
      }
      this.step++;
    };
    tick();
    this.musicTimer = window.setInterval(tick, 300);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioEngine();

/** Vibración compatible (Android). No hace nada si no es compatible. */
export function vibrate(pattern: number | number[]): void {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* no compatible */
  }
}

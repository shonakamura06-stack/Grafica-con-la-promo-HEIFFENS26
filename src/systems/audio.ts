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
  /** Tensión: pulso rápido cuando queda poco tiempo. */
  tension(): void {
    this.tone(880, 0.09, 'square', 0.2);
    this.tone(880, 0.09, 'square', 0.2, 0.12);
    this.tone(1108, 0.14, 'square', 0.22, 0.24);
  }
  /** Avería: chispazo descendente. */
  breakdown(): void {
    this.sweep(600, 120, 0.4, 'sawtooth', 0.25);
    this.tone(200, 0.2, 'square', 0.2, 0.1);
  }
  /** Engranaje al girar. */
  gear(): void { this.tone(440, 0.06, 'triangle', 0.3); }
  /** Reparación completa: fanfarria corta. */
  repaired(): void { [523, 659, 784].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.4, i * 0.08)); }
  /** Los monstruos se bajan molestos: bufido descendente. */
  grumpy(): void {
    this.sweep(300, 180, 0.3, 'square', 0.18);
    this.sweep(260, 150, 0.35, 'square', 0.18, 0.15);
  }

  // ── Sonidos característicos de cada monstruo (Sprint 2) ───────────────────
  // Todos son breves (<0,4 s) y flojos (vol <= 0,16): son RASGOS de personaje que
  // suenan de vez en cuando, no efectos de acción. Se disparan con enfriamiento
  // global (FX_LIMITS.sfxEveryMs) para que la cola no sea un gallinero.
  /** Pisotón grave del gigante. */
  thud(): void { this.sweep(120, 62, 0.2, 'sine', 0.16); this.tone(90, 0.09, 'triangle', 0.14, 0.02); }
  /** Aire atravesado por el fantasma. */
  whoosh(): void { this.sweep(880, 210, 0.28, 'sine', 0.11); this.sweep(240, 700, 0.2, 'sine', 0.06, 0.1); }
  /** Ronquido de búho dormido. */
  snore(): void { this.sweep(84, 142, 0.22, 'sawtooth', 0.1); this.sweep(142, 86, 0.2, 'sawtooth', 0.07, 0.21); }
  /** Doble pitido de los gemelos (uno detrás del otro). */
  twinBlip(): void { this.tone(660, 0.06, 'triangle', 0.16); this.tone(880, 0.07, 'triangle', 0.15, 0.09); }
  /** Susurro casi inaudible del tímido. */
  whisper(): void { this.sweep(1400, 900, 0.22, 'sine', 0.05); }
  /** Chispas nerviosas. */
  sparkle(): void { [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.05, 'sine', 0.11, i * 0.045)); }
  /** Gelatina que se despega. */
  slime(): void { this.sweep(300, 118, 0.18, 'sine', 0.15); this.tone(176, 0.09, 'sine', 0.1, 0.16); }
  /** Pompas de agua. */
  bubblePop(): void { this.tone(500, 0.05, 'sine', 0.13); this.sweep(700, 1200, 0.07, 'sine', 0.1, 0.06); }
  /** Ronroneo de nube. */
  purr(): void { [0, 1, 2].forEach((i) => this.tone(118 + i * 6, 0.07, 'triangle', 0.09, i * 0.085)); }
  /** Aleteo de capa. */
  cape(): void { this.sweep(420, 150, 0.2, 'triangle', 0.08); }
  /** Orejas que se estiran. */
  earTwitch(): void { this.tone(1200, 0.04, 'triangle', 0.1); this.tone(900, 0.04, 'triangle', 0.08, 0.06); }
  /** Obturador de la cámara del turista. */
  camera(): void { this.tone(2000, 0.02, 'square', 0.11); this.tone(1400, 0.03, 'square', 0.09, 0.05); }
  /** Chasquido metálico de las maletas. */
  cling(): void { this.tone(1800, 0.08, 'square', 0.06); this.tone(2400, 0.06, 'square', 0.045, 0.02); }
  /** Latido suave del enamorado. */
  heartSfx(): void { this.tone(784, 0.12, 'sine', 0.13); this.tone(1046, 0.14, 'sine', 0.11, 0.13); }
  /** Bufido del gruñón. */
  grumble(): void { this.sweep(152, 88, 0.28, 'sawtooth', 0.12); }
  /** Temblor del miedoso. */
  tremble(): void { [0, 1, 2, 3].forEach((i) => this.tone(i % 2 ? 182 : 206, 0.04, 'square', 0.07, i * 0.05)); }
  /** Ojo único que gira curioso. */
  eyeSpin(): void { this.sweep(900, 1420, 0.12, 'sine', 0.08); }
  /** Se recoloca presumido (VIP). */
  pose(): void { this.tone(880, 0.06, 'triangle', 0.08); this.tone(1320, 0.08, 'triangle', 0.06, 0.07); }

  /**
   * Dispara el sonido característico por clave. Devuelve `false` si el sonido está
   * desactivado o la clave no existe, para que la escena no cuente enfriamientos en
   * balde.
   */
  signature(key?: string): boolean {
    if (!key || !this.soundEnabled || !this.ctx) return false;
    const fn = (this as unknown as Record<string, unknown>)[key];
    if (typeof fn !== 'function') return false;
    (fn as () => void).call(this);
    return true;
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

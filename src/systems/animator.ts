/**
 * ANIMADOR — ¡Piso Equivocado!
 *
 * Convierte la personalidad (`systems/personality.ts`) en movimiento. Dos piezas:
 *
 * 1. **Reposo por cálculo, no por tweens.** `idleFrame()` devuelve el desplazamiento
 *    de UN fotograma a partir del tiempo. Antes cada pasajero tenía su propio tween
 *    infinito (`bobTween`): 10 pasajeros = 10 tweens repitiéndose para siempre.
 *    Ahora la escena hace una sola pasada en `update()` y aplica la fórmula, así que
 *    el coste no crece con los tweens sino con los pasajeros visibles, y se puede
 *    parar por completo cuando la escena está oculta.
 *
 * 2. **Reacciones declarativas.** `MOTION_PRESETS` y `REACTION_PRESETS` describen
 *    tweens como datos (propiedad, destino, duración, ease). GameScene los traduce a
 *    Phaser. Al ser datos, se pueden probar: ninguna animación dura más de la cuenta,
 *    ninguna se repite infinitamente y ninguna escala el sprite a valores absurdos.
 *
 * Nada de esto toca la lógica del puzle: son sólo transformaciones visuales.
 */

import { IdleStyle, MotionStyle } from './personality';

/** Desplazamiento visual de un fotograma de reposo. Todo relativo al hueco original. */
export interface IdleFrame {
  dx: number;      // desplazamiento horizontal (px)
  dy: number;      // desplazamiento vertical (px, negativo = hacia arriba)
  sx: number;      // escala horizontal (1 = normal)
  sy: number;      // escala vertical
  angle: number;   // giro en grados
}

/** Fotograma neutro: no mueve nada. */
export const STILL: IdleFrame = { dx: 0, dy: 0, sx: 1, sy: 1, angle: 0 };

/** Límites duros del reposo: nada puede salirse de aquí (lo comprueba una prueba). */
export const IDLE_BOUNDS = { dx: 8, dy: 16, scale: 0.22, angle: 7 };

/**
 * Reposo de un monstruo en el instante `t` (segundos).
 * `phase` desincroniza a los pasajeros: dos Sombrines idénticos no respiran a la vez.
 */
export function idleFrame(
  style: IdleStyle, t: number, phase: number, amp: number, speed: number, mirrorLag = 0,
): IdleFrame {
  const w = (t * speed * Math.PI * 2) + phase - mirrorLag;
  const s = Math.sin(w);
  const c = Math.cos(w);
  const up = Math.max(0, s);          // mitad del ciclo "arriba"
  const a = clamp(amp, 0, IDLE_BOUNDS.dx);
  switch (style) {
    case 'breathe':  return { dx: 0, dy: -a * 0.25 * s, sx: 1 - 0.02 * s, sy: 1 + 0.035 * s, angle: 0 };
    case 'hop':      return { dx: 0, dy: -a * up, sx: 1 - 0.05 * up, sy: 1 + 0.07 * up, angle: 0 };
    case 'sway':     return { dx: a * s, dy: 0, sx: 1, sy: 1, angle: 2.2 * s };
    case 'float':    return { dx: a * 0.3 * c, dy: -a * 0.8 - a * 0.35 * s, sx: 1, sy: 1, angle: 1.6 * c };
    case 'tremble':  return { dx: a * 0.55 * Math.sin(w * 6.5), dy: 0, sx: 1, sy: 1, angle: 0.8 * Math.sin(w * 6.5) };
    case 'peek':     return { dx: 0, dy: a * up * 0.8, sx: 1 - 0.06 * up, sy: 1 - 0.09 * up, angle: -1.5 * up };
    case 'mirror':   return { dx: a * 0.3 * s, dy: -a * 0.75 * up, sx: 1, sy: 1 + 0.05 * up, angle: 1.4 * s };
    case 'doze':     return { dx: 0, dy: a * 0.5 * up, sx: 1, sy: 1 - 0.03 * up, angle: 3.4 * Math.sin(w * 0.5) };
    case 'drift':    return { dx: a * s, dy: -a * 0.7 - a * 0.3 * c, sx: 1, sy: 1, angle: 1.2 * s };
    case 'march':    return { dx: 0, dy: -a * 0.45 * Math.abs(s), sx: 1, sy: 1 + 0.03 * Math.abs(s), angle: 1.3 * s };
    case 'pose':     return { dx: 0, dy: -a * 0.15 * up, sx: 1, sy: 1 + 0.025 * s, angle: 2.6 * Math.sin(w * 0.5) };
    case 'wobble':   return { dx: 0, dy: -a * 0.12 * Math.max(0, s), sx: 1 - 0.08 * s, sy: 1 + 0.1 * s, angle: 0 };
    case 'spark':    return { dx: a * 0.35 * Math.sin(w * 4.5), dy: -a * 0.4 * Math.abs(Math.sin(w * 2.5)), sx: 1, sy: 1, angle: 0 };
    case 'purr':     return { dx: 0, dy: -a * 0.4, sx: 1 - 0.02 * s, sy: 1 + 0.03 * s, angle: 0 };
    case 'bubble':   return { dx: 0.8 * c, dy: -a * (0.4 + 0.6 * s * s * s), sx: 1 + 0.03 * s, sy: 1 - 0.03 * s, angle: 0 };
    case 'listen':   return { dx: a * 0.4 * s, dy: 0, sx: 1, sy: 1, angle: 4.2 * s };
    case 'cape':     return { dx: 0, dy: -a * 0.2 * up, sx: 1 + 0.05 * s, sy: 1, angle: 1.6 * s };
    case 'eye':      return { dx: 2 * Math.sin(w * 0.6), dy: 0, sx: 1, sy: 1, angle: 3 * Math.sin(w * 0.6) };
    // Gruñón: respira hondo (se hincha el pecho) y bufa de vez en cuando, con un
    // cabeceo lento y mínimo. La amplitud manda: sin `a` era una estatua.
    case 'grump':    return { dx: 0, dy: -a * 0.18 * Math.max(0, s), sx: 1 + 0.05 * s, sy: 1 + 0.05 * s, angle: 1.1 * Math.sin(w * 0.5) };
    case 'love':     return { dx: 0, dy: -a * 0.2 * up, sx: 1 - 0.045 * s, sy: 1 + 0.06 * s, angle: 0.9 * s };
    default:         return STILL;
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** ¿El fotograma se mantiene dentro de los límites? (invariante de rendimiento/arte) */
export function frameInBounds(f: IdleFrame): boolean {
  return Math.abs(f.dx) <= IDLE_BOUNDS.dx
    && Math.abs(f.dy) <= IDLE_BOUNDS.dy
    && Math.abs(f.sx - 1) <= IDLE_BOUNDS.scale
    && Math.abs(f.sy - 1) <= IDLE_BOUNDS.scale
    && Math.abs(f.angle) <= IDLE_BOUNDS.angle;
}

// ── Parpadeos y miradas ───────────────────────────────────────────────────────

/**
 * Planificador de eventos espaciados (parpadeo, mirada, sonido propio, reacción).
 * Puro y determinista si se le pasa el generador aleatorio: así se puede probar que
 * un monstruo no parpadea cada 0,1 s ni se queda sin parpadear nunca.
 */
export class EventTimer {
  private next: number;
  constructor(private min: number, private max: number, start = 0, rnd: () => number = Math.random) {
    this.next = start + this.span(rnd);
  }
  private span(rnd: () => number): number {
    return this.min + (this.max - this.min) * rnd();
  }
  /** ¿Toca en este instante? No consume el evento: hay que llamar a `reset`. */
  due(now: number): boolean { return now >= this.next; }
  /** Reprograma el siguiente evento y devuelve cuándo caerá. */
  reset(now: number, rnd: () => number = Math.random): number {
    this.next = now + this.span(rnd);
    return this.next;
  }
  /** Cuándo toca la próxima vez (para pruebas y depuración). */
  nextAt(): number { return this.next; }
  /** Silencia el evento hasta `now + extra` (p. ej. durante un diálogo). */
  postpone(now: number, extra: number, rnd: () => number = Math.random): void {
    this.next = Math.max(this.next, now + extra + this.span(rnd) * 0.5);
  }
}

/** Textura de ojos según el estado de la cara. */
export type FaceState = 'open' | 'blink' | 'left' | 'right';

/**
 * Clave de textura para el estado de la cara: reutiliza las variantes generadas en
 * BootScene (`monster-<id>`, `monster-<id>-blink`, `monster-<id>-look`) y devuelve
 * SIEMPRE una clave existente: si el monstruo no tiene variante, se queda con la base.
 * Así no se regeneran texturas en caliente (prohibido por rendimiento).
 */
export function faceTexture(monsterId: string, mood: 'happy' | 'neutral' | 'angry', face: FaceState, hasVariants: boolean): string {
  const base = mood === 'happy' ? `monster-${monsterId}` : `monster-${monsterId}-${mood}`;
  if (!hasVariants || mood !== 'happy') return base;   // solo el ánimo feliz tiene variantes
  if (face === 'blink') return `monster-${monsterId}-blink`;
  if (face === 'left') return `monster-${monsterId}-look-l`;
  if (face === 'right') return `monster-${monsterId}-look-r`;
  return base;
}

// ── Animaciones puntuales (entrada, salida, reacciones) ───────────────────────

export interface TweenSpec {
  /** Propiedad del objeto a animar. */
  prop: 'x' | 'y' | 'scaleX' | 'scaleY' | 'angle' | 'alpha';
  /** Valor absoluto de destino (o `by` para incremento relativo). */
  to?: number;
  by?: number;
  ms: number;
  ease?: string;
  delay?: number;
  yoyo?: boolean;
  repeat?: number;
}

/** Duración máxima admitida para una animación puntual (ms). */
export const MAX_TWEEN_MS = 900;
/** Repeticiones máximas: nada de loops infinitos en reacciones. */
export const MAX_TWEEN_REPEAT = 4;

/** Animación al ENTRAR en el ascensor, por estilo. */
export const MOTION_PRESETS: Record<MotionStyle, TweenSpec[]> = {
  hop: [
    { prop: 'scaleY', to: 0.82, ms: 90, ease: 'Quad.easeIn' },
    { prop: 'scaleY', to: 1.12, ms: 130, ease: 'Quad.easeOut', delay: 90 },
    { prop: 'scaleY', to: 1, ms: 110, ease: 'Bounce.easeOut', delay: 220 },
  ],
  slide: [
    { prop: 'x', by: 0, ms: 1 },                       // marcador: el viaje ya lo hace GameScene
    { prop: 'angle', to: -8, ms: 160, ease: 'Quad.easeOut' },
    { prop: 'angle', to: 0, ms: 220, ease: 'Back.easeOut', delay: 160 },
  ],
  float: [
    { prop: 'scaleY', to: 1.08, ms: 220, ease: 'Sine.easeInOut' },
    { prop: 'scaleY', to: 1, ms: 240, ease: 'Sine.easeInOut', delay: 220 },
    { prop: 'alpha', to: 0.86, ms: 200, yoyo: true },
  ],
  stomp: [
    { prop: 'scaleY', to: 0.78, ms: 110, ease: 'Quad.easeIn' },
    { prop: 'scaleY', to: 1.1, ms: 150, ease: 'Quad.easeOut', delay: 110 },
    { prop: 'scaleY', to: 1, ms: 130, ease: 'Bounce.easeOut', delay: 260 },
  ],
  squeeze: [
    { prop: 'scaleX', to: 0.84, ms: 150, ease: 'Quad.easeInOut' },
    { prop: 'scaleX', to: 1, ms: 210, ease: 'Back.easeOut', delay: 150 },
    { prop: 'scaleY', to: 1.06, ms: 150, yoyo: true },
  ],
  glide: [
    { prop: 'alpha', to: 0.5, ms: 200, ease: 'Sine.easeInOut' },
    { prop: 'alpha', to: 0.9, ms: 240, ease: 'Sine.easeInOut', delay: 200 },
  ],
  waddle: [
    { prop: 'angle', to: 9, ms: 130, yoyo: true, repeat: 2 },
    { prop: 'scaleY', to: 0.94, ms: 130, yoyo: true, repeat: 2 },
  ],
  spin: [
    { prop: 'angle', to: 360, ms: 460, ease: 'Cubic.easeOut' },
    { prop: 'scaleY', to: 1.1, ms: 200, yoyo: true },
  ],
  march: [
    { prop: 'y', by: -5, ms: 120, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' },
    { prop: 'angle', to: 3, ms: 120, yoyo: true, repeat: 2 },
  ],
  dash: [
    { prop: 'scaleX', to: 1.14, ms: 90, ease: 'Quad.easeOut' },
    { prop: 'scaleX', to: 1, ms: 140, ease: 'Quad.easeIn', delay: 90 },
    { prop: 'y', by: -7, ms: 100, yoyo: true, repeat: 1 },
  ],
};

/** Reacciones emocionales (sorpresa, alegría, enfado) que pide el diseño. */
export type ReactionKind = 'surprise' | 'joy' | 'anger' | 'sad' | 'sleepy';

export const REACTION_PRESETS: Record<ReactionKind, TweenSpec[]> = {
  surprise: [
    { prop: 'scaleY', to: 1.16, ms: 110, ease: 'Back.easeOut' },
    { prop: 'scaleY', to: 1, ms: 200, ease: 'Bounce.easeOut', delay: 110 },
    { prop: 'y', by: -6, ms: 110, yoyo: true },
  ],
  joy: [
    { prop: 'y', by: -12, ms: 170, ease: 'Quad.easeOut', yoyo: true, repeat: 1 },
    { prop: 'angle', to: 7, ms: 120, yoyo: true, repeat: 2 },
    { prop: 'scaleY', to: 1.08, ms: 150, yoyo: true },
  ],
  anger: [
    { prop: 'angle', to: -6, ms: 70, yoyo: true, repeat: 3 },
    { prop: 'scaleX', to: 1.08, ms: 90, yoyo: true, repeat: 2 },
  ],
  sad: [
    { prop: 'scaleY', to: 0.88, ms: 240, ease: 'Quad.easeInOut' },
    { prop: 'scaleY', to: 1, ms: 320, ease: 'Sine.easeInOut', delay: 240 },
    { prop: 'y', by: 3, ms: 240, yoyo: true },
  ],
  sleepy: [
    { prop: 'angle', to: 8, ms: 300, ease: 'Sine.easeInOut', yoyo: true, repeat: 1 },
    { prop: 'scaleY', to: 0.95, ms: 300, ease: 'Sine.easeInOut', yoyo: true, repeat: 1 },
  ],
};

/** ¿El preset es seguro? (duración, repeticiones y escala acotadas) */
export function presetIsSane(specs: TweenSpec[]): boolean {
  if (specs.length === 0 || specs.length > 4) return false;
  return specs.every((s) => s.ms > 0 && s.ms <= MAX_TWEEN_MS
    && (s.repeat ?? 0) <= MAX_TWEEN_REPEAT
    && (s.to === undefined || (s.prop.startsWith('scale') ? Math.abs(s.to) <= 1.4 : Math.abs(s.to) <= 400))
    && (s.by === undefined || Math.abs(s.by) <= 60));
}

/** Duración total de un preset (para no encadenar efectos infinitos). */
export function presetDuration(specs: TweenSpec[]): number {
  return specs.reduce((a, s) => Math.max(a, (s.delay ?? 0) + s.ms * (1 + 2 * (s.repeat ?? 0) * (s.yoyo ? 1 : 0))), 0);
}

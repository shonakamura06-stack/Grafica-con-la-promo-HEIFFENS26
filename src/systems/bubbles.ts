/**
 * DIRECTOR DE BOCADILLOS — ¡Piso Equivocado!
 *
 * Antes había UN objeto de bocadillo y cualquiera que hablara lo sobrescribía:
 * dos monstruos podían "decir" cosas distintas a la vez y solo se leía la última,
 * el texto podía salirse de la pantalla y un aviso importante (¡no pueden viajar
 * juntos!) quedaba tapado por una frase decorativa.
 *
 * Este módulo pone orden sin gastar rendimiento:
 *  - **un solo bocadillo visible** (`FX_LIMITS.maxBubbles = 1`): los demás esperan
 *    su turno en una cola, así es imposible que se solapen;
 *  - **prioridad**: un aviso de regla o un error interrumpe a la charla decorativa;
 *  - **caducidad**: un mensaje decorativo viejo se descarta en vez de decirse tarde;
 *  - **turnos**: el mismo monstruo no puede encadenar frases y hay un hueco mínimo
 *    entre bocadillos para que no parezca una ametralladora;
 *  - **anclaje**: cerca de quien habla, dentro de la pantalla y sin tapar la cara
 *    de otro pasajero (si hace falta, se desplaza).
 *
 * Lógica pura y determinista (se le pasa `now`): probable en Node sin navegador.
 */

import { FX_LIMITS } from './personality';

/** Prioridades: cuanto más alto, más importante. */
export const PRIORITY = {
  chat: 0,      // conversación decorativa entre monstruos
  idle: 1,      // frase de espera ("¡yo quiero ir al piso 3!")
  arrive: 2,    // llegada a su destino
  hint: 3,      // pista de Rese / tutorial corto
  rule: 4,      // aviso de regla social (parejas, enemigos, tímido...)
  error: 5,     // piso equivocado: lo más importante
} as const;

export type BubblePriority = typeof PRIORITY[keyof typeof PRIORITY];

export interface BubbleRequest {
  /** Identificador único de la petición. */
  id: number;
  /** Pasajero que habla (-1 si habla el sistema/Rese). */
  speaker: number;
  text: string;
  priority: number;
  /** Instante en que se pidió (ms). */
  at: number;
  /** Cuánto permanece visible (ms). */
  ttl: number;
}

/** Dónde está el que habla en el momento de mostrar el bocadillo. */
export interface Anchor { x: number; y: number; w: number; h: number }

export interface BubbleOptions {
  screenW: number;
  screenH: number;
  /** Margen con los bordes de la pantalla. */
  margin: number;
  /** Techo útil: por encima está el HUD. */
  topLimit: number;
  /** Hueco mínimo entre dos bocadillos seguidos (ms). */
  minGap: number;
  /** Enfriamiento por personaje (ms): no puede encadenar frases. */
  speakerCooldown: number;
  /** Cuánto aguanta un mensaje decorativo en la cola antes de descartarse (ms). */
  staleAfter: number;
  /** Largo máximo de texto; lo que sobre se corta por palabras. */
  maxChars: number;
  /** Ancho/alto máximos del globo. */
  maxBubbleW: number;
  maxBubbleH: number;
}

export const BUBBLE_OPTIONS: BubbleOptions = {
  screenW: 540, screenH: 960, margin: 8, topLimit: 108,
  minGap: 320, speakerCooldown: 2200, staleAfter: 4200,
  maxChars: 44, maxBubbleW: 280, maxBubbleH: 76,
};

export interface BubbleEvent {
  kind: 'show' | 'hide';
  req: BubbleRequest;
  x: number;
  y: number;
  /** 'cerca' = junto al hablante · 'reserva' = banda superior de diálogo. */
  zone?: 'cerca' | 'reserva';
}

/**
 * Tamaño estimado del globo a partir del texto (redonda infantil de 16 px,
 * ajuste a 236 px). Sprint 2.2: globo compacto de cómic, no una estrella enorme.
 */
export function bubbleBox(text: string, opts: BubbleOptions = BUBBLE_OPTIONS): { w: number; h: number } {
  const trozos = wrapText(text, 26);
  const w = Math.min(opts.maxBubbleW, Math.max(...trozos.map((t) => t.length)) * 8.0 + 36);
  const h = Math.min(opts.maxBubbleH, Math.max(44, trozos.length * 20 + 24));
  return { w, h };
}

/** Parte el texto en líneas de como mucho `maxChars` caracteres, por palabras. */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const prueba = line ? `${line} ${w}` : w;
    if (prueba.length > maxChars && line) { lines.push(line); line = w; }
    else line = prueba;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** Corta un texto demasiado largo por palabras, con puntos suspensivos. */
export function shorten(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cortado = text.slice(0, maxChars - 1);
  const ultimo = cortado.lastIndexOf(' ');
  return `${(ultimo > maxChars * 0.5 ? cortado.slice(0, ultimo) : cortado).trim()}…`;
}

/**
 * Rectángulo que el globo NO debe tapar nunca de un pasajero: su cara y su
 * etiqueta (insignia de destino + corazón de pareja + rayo de enemigo).
 * Sprint 2.2: la información del puzle manda sobre la conversación.
 */
export function protectedRect(a: Anchor): { x1: number; y1: number; x2: number; y2: number } {
  return {
    x1: a.x - a.w / 2 - 6,
    y1: a.y - a.h / 2 - 58,          // por encima del corazón / rayo
    x2: a.x + a.w / 2 + 6,
    y2: a.y - a.h * 0.05,            // hasta media cara
  };
}

function chocan(x: number, y: number, hw: number, hh: number,
  r: { x1: number; y1: number; x2: number; y2: number }): boolean {
  return x + hw > r.x1 && x - hw < r.x2 && y + hh > r.y1 && y - hh < r.y2;
}

/**
 * Dónde colocar el globo, por este orden:
 *  A) encima de la etiqueta de quien habla, si no tapa la de nadie;
 *  B) a un lado de su cabeza (y C) al otro lado);
 *  D) ZONA RESERVADA de diálogo: la banda superior bajo el HUD, que no
 *     estorba a ningún pasajero ni al ascensor (se aparta de él si hace falta).
 * Nunca se solapa con caras, insignias, símbolos de relación ni con los
 * rectángulos extra que pase la escena (ascensor).
 */
export function anchorBubble(
  speaker: Anchor, box: { w: number; h: number }, others: Anchor[], opts: BubbleOptions = BUBBLE_OPTIONS,
  extra: Anchor[] = [],
): { x: number; y: number; zone: 'cerca' | 'reserva' } {
  const hw = box.w / 2;
  const hh = box.h / 2;
  const minY = opts.topLimit + hh;
  const protegidos = [...others, speaker, ...extra].map(protectedRect);
  const libre = (x: number, y: number): boolean => protegidos.every((r) => !chocan(x, y, hw, hh, r));
  const clampX = (x: number): number =>
    Math.min(opts.screenW - opts.margin - hw, Math.max(opts.margin + hw, x));

  // A) Encima de su propia etiqueta.
  let x = clampX(speaker.x);
  let y = speaker.y - speaker.h / 2 - 58 - hh - 6;
  if (y >= minY && libre(x, y)) return { x, y, zone: 'cerca' };

  // B) y C) A los lados de la cabeza, a la altura de los ojos.
  y = Math.max(minY, speaker.y - speaker.h / 2 + 4);
  const lado = speaker.x + hw + speaker.w / 2 + 8 > opts.screenW - opts.margin ? -1 : 1;
  for (const l of [lado, -lado]) {
    x = clampX(speaker.x + l * (hw + speaker.w / 2 + 8));
    if (libre(x, y)) return { x, y, zone: 'cerca' };
  }

  // D) Zona reservada de diálogo (banda superior), apartada del ascensor.
  y = minY;
  x = clampX(speaker.x);
  for (const e of extra) {
    if (chocan(x, y, hw, hh, protectedRect(e))) {
      x = e.x < opts.screenW / 2
        ? clampX(opts.screenW * 0.75)
        : clampX(opts.screenW * 0.25);
    }
  }
  return { x, y, zone: 'reserva' };
}

/**
 * Cola con prioridades y turnos. `update(now, anchors)` devuelve qué mostrar y qué
 * ocultar; GameScene solo tiene que pintar lo que le digan.
 */
export class BubbleDirector {
  private queue: BubbleRequest[] = [];
  private current: BubbleRequest | null = null;
  private shownAt = -Infinity;
  private hiddenAt = -Infinity;
  private lastBySpeaker = new Map<number, number>();
  private seq = 0;
  private dropped = 0;
  private preempted = 0;

  constructor(private opts: BubbleOptions = BUBBLE_OPTIONS) {}

  /** Encola una frase. Devuelve el id asignado o `null` si se descartó. */
  say(speaker: number, text: string, priority: BubblePriority, now: number, ttl = 1700): number | null {
    const limpio = shorten(text.replace(/\s+/g, ' ').trim(), this.opts.maxChars);
    if (!limpio) return null;
    // Un personaje decorativo no puede repetir si acaba de hablar. El reloj corre
    // desde que su globo anterior se OCULTÓ (no desde que apareció): si no, con un
    // ttl de 2 s y enfriamiento de 2,2 s apenas callaría 0,2 s.
    if (priority <= PRIORITY.idle) {
      const ultimo = this.lastBySpeaker.get(speaker) ?? -Infinity;
      // Si todavía está en pantalla hablando, se cuenta desde su final previsto.
      const fin = this.current && this.current.speaker === speaker
        ? Math.max(ultimo, this.shownAt + this.current.ttl)
        : ultimo;
      if (now - fin < this.opts.speakerCooldown) { this.dropped++; return null; }
    }
    const req: BubbleRequest = { id: ++this.seq, speaker, text: limpio, priority, at: now, ttl };
    this.queue.push(req);
    // Prioridad alta primero; a igual prioridad, por orden de llegada.
    this.queue.sort((a, b) => b.priority - a.priority || a.at - b.at || a.id - b.id);
    // La cola no puede crecer sin límite (10 pasajeros hablando a la vez).
    while (this.queue.length > FX_LIMITS.maxBubbles * 8) {
      const viejo = this.queue.pop();
      if (viejo) this.dropped++;
    }
    return req.id;
  }

  /** ¿Hay algo visible ahora mismo? */
  get visible(): BubbleRequest | null { return this.current; }
  pending(): number { return this.queue.length; }
  stats(): { dropped: number; preempted: number; shown: number } {
    return { dropped: this.dropped, preempted: this.preempted, shown: this.seq };
  }

  /** Silencia todo (diálogo de Rese, pausa, tarjeta de regla...). */
  silence(now: number): BubbleEvent[] {
    const out: BubbleEvent[] = [];
    if (this.current) { out.push({ kind: 'hide', req: this.current, x: 0, y: 0 }); this.current = null; this.hiddenAt = now; }
    this.queue = [];
    return out;
  }

  /**
   * Avanza el director. `anchors` da la posición actual de cada hablante (la cola se
   * recoloca constantemente, así que se calcula en el momento de mostrar).
   */
  update(now: number, anchors: Map<number, Anchor>, extra: Anchor[] = []): BubbleEvent[] {
    const out: BubbleEvent[] = [];

    // 1. Ocultar el visible si ya cumplió su tiempo.
    if (this.current && now - this.shownAt >= this.current.ttl) {
      out.push({ kind: 'hide', req: this.current, x: 0, y: 0 });
      this.lastBySpeaker.set(this.current.speaker, now);
      this.current = null;
      this.hiddenAt = now;
    }

    // 2. Descartar lo decorativo que lleva demasiado esperando (mejor no decirlo).
    const vivos: BubbleRequest[] = [];
    for (const r of this.queue) {
      const viejo = now - r.at > this.opts.staleAfter && r.priority <= PRIORITY.idle;
      if (viejo) this.dropped++; else vivos.push(r);
    }
    this.queue = vivos;

    // 3. Interrumpir lo visible si llega algo claramente más importante.
    const cabeza = this.queue[0];
    if (this.current && cabeza && cabeza.priority >= this.current.priority + 1
      && now - this.shownAt > 220) {
      out.push({ kind: 'hide', req: this.current, x: 0, y: 0 });
      this.current = null;
      this.hiddenAt = now;
      this.preempted++;
    }

    // 4. Mostrar el siguiente si hay hueco.
    if (!this.current && this.queue.length && now - this.hiddenAt >= this.opts.minGap) {
      const req = this.queue.shift()!;
      const propio = anchors.get(req.speaker);
      const box = bubbleBox(req.text, this.opts);
      const otros: Anchor[] = [];
      for (const [id, a] of anchors) if (id !== req.speaker) otros.push(a);
      const pos = propio
        ? anchorBubble(propio, box, otros, this.opts, extra)
        : { x: this.opts.screenW / 2, y: this.opts.topLimit + box.h / 2 + 6, zone: 'reserva' as const };
      this.current = req;
      this.shownAt = now;
      out.push({ kind: 'show', req, x: pos.x, y: pos.y, zone: pos.zone });
    }
    return out;
  }
}

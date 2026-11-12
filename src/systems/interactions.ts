/**
 * REACCIONES ENTRE PERSONAJES — ¡Piso Equivocado!
 *
 * Aprovecha las relaciones que YA existen en las reglas del juego (parejas,
 * enemigos, dúos, gemelos, tímidos, gigantes, fantasmas, sonámbulos, miedosos)
 * para que los monstruos se miren, se saluden o se gruñan solos.
 *
 * Regla de oro: **esto no toca la lógica del puzle.** El director sólo observa un
 * retrato del estado y devuelve descripciones de efectos visuales; nunca decide quién
 * sube, quién baja ni cuántos pasos cuesta. Lo que ve es lo mismo que ve el motor
 * (`systems/rules.ts`), así que una pareja se mira porque ES pareja, no al azar.
 *
 * Rendimiento: como mucho UN evento por actualización, con enfriamiento global
 * (`FX_LIMITS.interactionEveryMs`), enfriamiento por pareja y tope de partículas
 * vivas. Todo determinista si se le pasa el generador aleatorio.
 */

import { SpecialRule } from '../data/monsters';
import { FX_LIMITS } from './personality';

/** Dónde está cada pasajero en el momento del retrato. */
export type ActorPlace = 'queue' | 'cab' | 'gone';

export interface ActorSnapshot {
  id: number;
  monsterId: string;
  rule: SpecialRule;
  place: ActorPlace;
  asleep: boolean;
  /** Id de su pareja enamorada, si la tiene en este nivel. */
  coupleWith?: number;
  /** Id de su compañero de dúo (Pegajín ↔ Pegajón). */
  duoWith?: number;
  /** Ids de sus enemigos declarados. */
  enemies?: number[];
  /** Cuántos monstruos hay dentro de la cabina ahora mismo. */
  cabLoad?: number;
}

export type InteractionKind =
  | 'coupleGaze'    // se miran y salen corazones
  | 'enemyGlare'    // se miran con asco y sale un rayo
  | 'duoHug'        // el dúo se pega
  | 'twinsMirror'   // los gemelos se imitan
  | 'shyHide'       // el tímido se esconde
  | 'giantStomp'    // el gigante hace vibrar el suelo
  | 'ghostPhase'    // el fantasma atraviesa a otro
  | 'snore'         // el sonámbulo suelta una Z
  | 'fearTremble'   // el miedoso tiembla con la cabina llena
  | 'ambient';      // manía propia: foto, burbujas, orejas...

export interface InteractionEvent {
  kind: InteractionKind;
  /** Protagonista del efecto. */
  a: number;
  /** Acompañante, si el efecto es entre dos. */
  b?: number;
  /** Par de frases si hay conversación escrita para ellos. */
  lines?: { a: string; b: string };
  /** Gravedad: 0 decorativo, 1 llama la atención, 2 avisa de un problema real. */
  weight: 0 | 1 | 2;
}

export interface InteractionOptions {
  /** El ascensor se está moviendo: no se dispara nada (el jugador mira otra cosa). */
  moving: boolean;
  /** Hay un diálogo de Rese o una tarjeta en pantalla: silencio total. */
  dialogActive: boolean;
  /** Partículas vivas ahora mismo (tope `FX_LIMITS.maxLiveParticles`). */
  liveParticles: number;
}

const NADA: InteractionOptions = { moving: false, dialogActive: false, liveParticles: 0 };

/**
 * Director de interacciones. Una sola instancia por escena; se llama desde
 * `update()` con el retrato del momento.
 */
export class InteractionDirector {
  private lastEvent = -Infinity;
  private lastPair = new Map<string, number>();
  private lastKind = new Map<number, number>();
  private fired = 0;
  private skipped = 0;

  constructor(private rnd: () => number = Math.random) {}

  /** Estadísticas para pruebas y depuración. */
  stats(): { fired: number; skipped: number } { return { fired: this.fired, skipped: this.skipped }; }

  private pairOk(key: string, now: number): boolean {
    const ultimo = this.lastPair.get(key) ?? -Infinity;
    return now - ultimo >= FX_LIMITS.pairCooldownMs;
  }

  private markPair(key: string, now: number): void { this.lastPair.set(key, now); }

  private markKind(id: number, kind: InteractionKind, now: number): void {
    this.lastKind.set(id, now);
    this.lastEvent = now;
    this.fired++;
    void kind;
  }

  /** ¿Este actor puede protagonizar algo ahora? */
  private ready(id: number, now: number, cooldown: number): boolean {
    const ultimo = this.lastKind.get(id) ?? -Infinity;
    return now - ultimo >= cooldown;
  }

  /**
   * Devuelve como mucho UN evento (o ninguno). `actors` son los pasajeros vivos.
   */
  update(now: number, actors: ActorSnapshot[], opts: InteractionOptions = NADA): InteractionEvent | null {
    if (opts.moving || opts.dialogActive) { this.skipped++; return null; }
    if (now - this.lastEvent < FX_LIMITS.interactionEveryMs) { this.skipped++; return null; }
    if (opts.liveParticles >= FX_LIMITS.maxLiveParticles) { this.skipped++; return null; }
    const vivos = actors.filter((a) => a.place !== 'gone');
    if (vivos.length === 0) return null;
    const porId = new Map(vivos.map((a) => [a.id, a]));

    // ── 1. Lo que AVISA de algo real: un enemigo dentro de la cabina ─────────
    // Solo ocurre si el jugador ya ha roto la regla; el efecto lo señala sin
    // cambiar nada (la penalización la pone rules.ts, no esto).
    for (const a of vivos) {
      if (a.place !== 'cab' || !a.enemies?.length) continue;
      const b = a.enemies.map((e) => porId.get(e)).find((x) => x && x.place === 'cab');
      if (b && this.pairOk(`e${a.id}-${b.id}`, now) && this.ready(a.id, now, 3000)) {
        this.markPair(`e${a.id}-${b.id}`, now);
        this.markKind(a.id, 'enemyGlare', now);
        return { kind: 'enemyGlare', a: a.id, b: b.id, weight: 2 };
      }
    }

    // ── 2. Sonámbulo dormido: la Z es su seña de identidad ───────────────────
    const dormido = vivos.find((a) => a.asleep && a.rule === 'sleepwalker');
    if (dormido && this.ready(dormido.id, now, 5200) && this.rnd() < 0.55) {
      this.markKind(dormido.id, 'snore', now);
      return { kind: 'snore', a: dormido.id, weight: 0 };
    }

    // ── 3. Parejas: se miran donde estén ─────────────────────────────────────
    for (const a of vivos) {
      if (a.coupleWith === undefined) continue;
      const b = porId.get(a.coupleWith);
      if (!b || b.place !== a.place) continue;
      if (!this.pairOk(`c${a.id}-${b.id}`, now) || !this.ready(a.id, now, 6000)) continue;
      if (this.rnd() > 0.5) continue;
      this.markPair(`c${a.id}-${b.id}`, now);
      this.markKind(a.id, 'coupleGaze', now);
      return { kind: 'coupleGaze', a: a.id, b: b.id, weight: 0 };
    }

    // ── 4. Dúos y gemelos ────────────────────────────────────────────────────
    for (const a of vivos) {
      const otro = a.duoWith !== undefined ? porId.get(a.duoWith) : undefined;
      const kind: InteractionKind | null = a.rule === 'twins' ? 'twinsMirror'
        : (otro && otro.place === a.place ? 'duoHug' : null);
      if (!kind) continue;
      if (!this.ready(a.id, now, 7000) || this.rnd() > 0.45) continue;
      this.markKind(a.id, kind, now);
      return { kind, a: a.id, b: otro?.id, weight: 0 };
    }

    // ── 5. Enemigos en la cola: tensión antes de subir ───────────────────────
    for (const a of vivos) {
      if (a.place !== 'queue' || !a.enemies?.length) continue;
      const b = a.enemies.map((e) => porId.get(e)).find((x) => x && x.place === 'queue');
      if (!b || !this.pairOk(`q${a.id}-${b.id}`, now) || !this.ready(a.id, now, 8000)) continue;
      if (this.rnd() > 0.4) continue;
      this.markPair(`q${a.id}-${b.id}`, now);
      this.markKind(a.id, 'enemyGlare', now);
      return { kind: 'enemyGlare', a: a.id, b: b.id, weight: 1 };
    }

    // ── 6. Reglas con manía propia ───────────────────────────────────────────
    for (const a of vivos) {
      if (!this.ready(a.id, now, 6500)) continue;
      if (a.rule === 'shy' && a.place === 'queue' && this.rnd() < 0.4) {
        this.markKind(a.id, 'shyHide', now);
        return { kind: 'shyHide', a: a.id, weight: 0 };
      }
      if (a.rule === 'ghost' && this.rnd() < 0.35) {
        const vecino = vivos.find((v) => v.id !== a.id && v.place === a.place);
        this.markKind(a.id, 'ghostPhase', now);
        return { kind: 'ghostPhase', a: a.id, b: vecino?.id, weight: 0 };
      }
      if (a.rule === 'giant' && this.rnd() < 0.3) {
        this.markKind(a.id, 'giantStomp', now);
        return { kind: 'giantStomp', a: a.id, weight: 0 };
      }
      if (a.rule === 'fear' && (a.cabLoad ?? 0) >= 2 && this.rnd() < 0.5) {
        this.markKind(a.id, 'fearTremble', now);
        return { kind: 'fearTremble', a: a.id, weight: 1 };
      }
      if (a.rule === 'none' && this.rnd() < 0.22) {
        this.markKind(a.id, 'ambient', now);
        return { kind: 'ambient', a: a.id, weight: 0 };
      }
    }
    this.skipped++;
    return null;
  }
}

/**
 * ¿Qué parejas de monstruos deberían poder conversar en este nivel?
 * Sale de las relaciones REALES del nivel (parejas, enemigos, dúos), así que las
 * conversaciones nunca hablan de alguien que no está.
 */
export function talkPairs(actors: ActorSnapshot[]): Array<[number, number]> {
  const pares: Array<[number, number]> = [];
  const vistos = new Set<string>();
  const add = (a: number, b: number): void => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || vistos.has(key)) return;
    vistos.add(key);
    pares.push(a < b ? [a, b] : [b, a]);
  };
  for (const a of actors) {
    if (a.place === 'gone') continue;
    if (a.coupleWith !== undefined) add(a.id, a.coupleWith);
    if (a.duoWith !== undefined) add(a.id, a.duoWith);
    for (const e of a.enemies ?? []) add(a.id, e);
  }
  return pares;
}

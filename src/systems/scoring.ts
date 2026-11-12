/**
 * Puntuación y recorrido óptimo — ¡Piso Equivocado!
 *
 * La distancia recorrida por el ascensor determina las estrellas. El recorrido
 * óptimo se calcula con Dijkstra sobre el estado completo de la partida
 * (entregados, a bordo, posición).
 *
 * Las reglas que aplica el solver NO están aquí: viven en `systems/rules.ts`, que
 * es el mismo módulo que consulta `GameScene` para decidir si un monstruo sube o
 * baja. Así el número "óptimo" y el juego no pueden volver a separarse.
 *
 * `policy`:
 *   'clean' (por defecto) → ruta RECOMENDADA: tampoco separa parejas ni junta
 *                            enemigos. Contra ella se comparan las estrellas y el
 *                            bonus de ruta óptima.
 *   'real'                → lo que el motor permite de verdad (juntar enemigos y
 *                            separar parejas cuesta 1 estrella cada vez). Sirve
 *                            para que las pruebas comparen ambos mundos.
 *
 * OJO: `PlanStep.pax` es un índice del CREW (ver rules.buildCrew), no de
 * `level.passengers`. Los gemelos son UNA unidad del crew, igual que en el juego.
 *
 * El modelo de tiempo (con cuánto margen se juega) está en `systems/timing.ts`.
 */

import { LevelDef } from '../data/levels';
import { Mood } from '../data/monsters';
import { BoardPolicy, buildCrew, canBoard, canExit } from './rules';

export type PlanStep =
  | { kind: 'board'; pax: number }   // sube la unidad i del crew (gemelos/dúo: juntos)
  | { kind: 'move'; floor: number }; // viaja al piso f (los de destino f bajan)

export interface SolveResult {
  optimal: number;      // distancia mínima posible
  plan: PlanStep[];     // secuencia óptima de acciones para lograrla
  policy: BoardPolicy;  // con qué reglas se calculó
}

/**
 * Calcula la distancia mínima posible para completar el nivel.
 * Dijkstra con montón binario. Los niveles tienen <=10 unidades, así que el
 * espacio de estados es pequeño y el cálculo es rápido.
 */
export function computeOptimal(level: LevelDef, policy: BoardPolicy = 'clean'): SolveResult {
  const crew = buildCrew(level);
  const n = crew.length;
  const full = (1 << n) - 1;
  const N = level.floors;
  const capacity = level.capacity;

  // dist: mapa estado -> distancia. Estado = delivered|onboard|pos
  const dist = new Map<number, number>();
  const parent = new Map<number, [number, PlanStep]>(); // estado -> [previo, acción]
  const heap: Array<[number, number]> = []; // [distancia, estado]

  const key = (delivered: number, onboard: number, pos: number) =>
    (delivered * (1 << n) + onboard) * (N + 1) + pos;

  const push = (d: number, state: number) => {
    heap.push([d, state]);
    let i = heap.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (heap[up][0] <= heap[i][0]) break;
      [heap[up], heap[i]] = [heap[i], heap[up]];
      i = up;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let smallest = i;
        if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
        if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
      }
    }
    return top;
  };

  // Reutilizamos estos arrays para no generar basura en el bucle caliente.
  const inCab: number[] = [];
  const waiting: number[] = [];
  const fillSets = (delivered: number, onboard: number) => {
    inCab.length = 0;
    waiting.length = 0;
    for (let i = 0; i < n; i++) {
      if (onboard & (1 << i)) inCab.push(i);
      else if (!(delivered & (1 << i))) waiting.push(i);
    }
  };

  const start = key(0, 0, 0);
  dist.set(start, 0);
  push(0, start);

  while (heap.length > 0) {
    const [d, state] = pop();
    if (dist.get(state) !== d) continue;
    const pos = state % (N + 1);
    const rest = Math.floor(state / (N + 1));
    const onboard = rest % (1 << n);
    const delivered = Math.floor(rest / (1 << n));

    if (delivered === full) {
      // Reconstruir el plan hacia atrás desde el estado final.
      const plan: PlanStep[] = [];
      let cur = state;
      while (parent.has(cur)) {
        const [prev, act] = parent.get(cur)!;
        plan.push(act);
        cur = prev;
      }
      plan.reverse();
      return { optimal: d, plan, policy };
    }

    const relax = (nd: number, ndelivered: number, nonboard: number, npos: number, act: PlanStep) => {
      const k = key(ndelivered, nonboard, npos);
      if (nd < (dist.get(k) ?? Infinity)) {
        dist.set(k, nd);
        parent.set(k, [state, act]);
        push(nd, k);
      }
    };

    // Acción: subir pasajeros (solo en recepción).
    if (pos === 0) {
      fillSets(delivered, onboard);
      for (let i = 0; i < n; i++) {
        if (delivered & (1 << i)) continue;
        if (onboard & (1 << i)) continue;
        const verdict = canBoard(crew, i, inCab, capacity, policy, waiting);
        if (!verdict.ok) continue;
        let next = onboard;
        for (const b of verdict.board) next |= 1 << b;
        relax(d, delivered, next, 0, { kind: 'board', pax: i });
      }
    }

    // Acción: viajar a otro piso (los pasajeros salen solos al llegar).
    fillSets(delivered, onboard);
    for (let f = 0; f <= N; f++) {
      if (f === pos) continue;
      let ndelivered = delivered;
      let nonboard = onboard;
      let prohibido = false;
      for (const i of inCab) {
        // El sonámbulo no sale solo: en el juego hay que tocarlo para despertarlo.
        // Despertarlo no cuesta MOVIMIENTO, así que el solver lo da por hecho y
        // systems/timing.ts cobra su tiempo aparte.
        const verdict = canExit(crew, i, f, inCab, true, policy);
        if (!verdict.exits) {
          // DIVERGENCIA SOLVER ↔ MOTOR corregida (Sprint 1):
          // si al llegar a `f` un miembro de una pareja está dentro y su pareja no,
          // canExit en ruta limpia dice "no sale" (coupleAlone) y el solver lo
          // interpretaba como "se queda dentro gratis" para entregarlo más tarde
          // con su pareja. Pero el motor juega en política 'real': lo BAJA igual y
          // cobra coupleSeparated (una estrella menos). Así que ese viaje no es una
          // ruta limpia de verdad y hay que prohibirlo, no aprovecharlo.
          if (policy === 'clean' && verdict.reason === 'coupleAlone') { prohibido = true; break; }
          continue;
        }
        if (policy === 'clean' && verdict.penalties.length > 0) { prohibido = true; break; }
        ndelivered |= 1 << i;
        nonboard &= ~(1 << i);
      }
      if (prohibido) continue;
      relax(d + Math.abs(f - pos), ndelivered, nonboard, f, { kind: 'move', floor: f });
    }
  }

  // Si no se encontró solución (no debería pasar), se devuelve un valor alto.
  return { optimal: Number.MAX_SAFE_INTEGER, plan: [], policy };
}

/**
 * Umbrales de estrellas por eficiencia:
 * - 3 estrellas: distancia <= óptima + 1 (¡casi perfecto!).
 * - 2 estrellas: distancia <= óptima + 3.
 * - 1 estrella: completar el nivel (cualquier distancia mayor).
 * La solución perfecta (distancia == óptima) da bonus de monedas.
 */
export function starThresholds(optimal: number): { three: number; two: number } {
  return { three: optimal + 1, two: optimal + 3 };
}

export function starsFor(distance: number, optimal: number): number {
  const { three, two } = starThresholds(optimal);
  if (distance <= three) return 3;
  if (distance <= two) return 2;
  return 1;
}

/** ¿La solución fue perfecta (sin movimientos de más)? */
export function isPerfect(distance: number, optimal: number): boolean {
  return distance === optimal;
}

// Las monedas ya NO se calculan aquí: la Economía V3 las paga por logros únicos
// (primera victoria, estrellas nuevas, ruta óptima, misiones) en systems/economy.ts.

/**
 * Ánimo de los pasajeros según los pisos equivocados acumulados:
 * 0 errores = felices, 1 = neutros, 2 o más = enojados.
 * Al tercer error los monstruos vuelven molestos a recepción.
 */
export function moodForMistakes(mistakes: number): Mood {
  if (mistakes <= 0) return 'happy';
  if (mistakes === 1) return 'neutral';
  return 'angry';
}

export const MAX_MISTAKES = 3;

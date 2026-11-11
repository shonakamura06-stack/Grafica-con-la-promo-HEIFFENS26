/**
 * Puntuación y recorrido óptimo — ¡Piso Equivocado!
 *
 * La distancia recorrida por el ascensor determina las estrellas.
 * El recorrido óptimo se calcula con el algoritmo de Dijkstra sobre el
 * estado completo de la partida (entregados, a bordo, posición), teniendo
 * en cuenta la capacidad, los gigantes, los gemelos, los tímidos, los
 * fantasmas, las PAREJAS (deben salir juntas) y los ENEMIGOS (no pueden
 * viajar juntos). Así las estrellas siempre se comparan contra un óptimo
 * real, nunca contra límites arbitrarios.
 */

import { LevelDef } from '../data/levels';
import { MONSTER_MAP, TWIN_GROUP, Mood } from '../data/monsters';

export type PlanStep =
  | { kind: 'board'; pax: number }   // sube el pasajero i (gemelos: suben juntos)
  | { kind: 'move'; floor: number }; // viaja al piso f (los de destino f bajan)

export interface SolveResult {
  optimal: number;      // distancia mínima posible
  plan: PlanStep[];     // secuencia óptima de acciones para lograrla
}

/**
 * Simulación de partida a velocidad LENTA de niño (segundos):
 * leer la escena al iniciar, pensar y tocar cada monstruo, pensar y tocar
 * cada botón del panel, esperar puertas/recorrido, y ver bajar a cada uno.
 * Con esta tabla se calibran los timeLimit de los niveles.
 */
export const SLOW = {
  readLevel: 8,      // mirar el nivel al empezar
  tapMonster: 4,     // pensar + tocar un monstruo para que suba
  pressButton: 3,    // pensar + tocar un botón del panel
  doors: 0.24,       // cierre/apertura de puertas
  travelPerFloor: 0.38, // animación del ascensor por piso
  reactAfterMove: 1.5, // reaccionar al llegar
  watchExit: 1.5,    // ver bajar a cada monstruo
  celebrate: 4,      // leer la pantalla final
};

export function slowPlaySeconds(plan: PlanStep[], passengers: number, optimal: number): number {
  let t = SLOW.readLevel + SLOW.celebrate;
  for (const step of plan) {
    if (step.kind === 'board') t += SLOW.tapMonster;
    else t += SLOW.pressButton + SLOW.doors + SLOW.reactAfterMove;
  }
  t += optimal * SLOW.travelPerFloor;
  t += passengers * SLOW.watchExit;
  return t;
}

interface PassengerInfo {
  dest: number;
  slots: number;
  rule: string;
  twinPair: number; // índice del gemelo pareja, o -1
  duoPair: number;  // índice del mejor amigo (suben juntos), o -1
  couplePair: number; // índice de la pareja enamorada, o -1
  enemies: number[]; // índices de enemigos (no pueden viajar juntos)
}

function buildInfos(level: LevelDef): PassengerInfo[] {
  const infos: PassengerInfo[] = level.passengers.map((p) => {
    const def = MONSTER_MAP[p.m];
    return { dest: p.d, slots: def.slots, rule: def.rule, twinPair: -1, duoPair: -1, couplePair: -1, enemies: [] };
  });
  // Emparejar gemelos: cada gemelo conoce a su pareja.
  const twinIdx = infos.map((inf, i) => (inf.rule === 'twins' ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k + 1 < twinIdx.length; k += 2) {
    infos[twinIdx[k]].twinPair = twinIdx[k + 1];
    infos[twinIdx[k + 1]].twinPair = twinIdx[k];
  }
  // Mejores amigos: suben juntos (bajan por separado).
  const duoIdx = infos.map((inf, i) => (inf.rule === 'duo' ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k + 1 < duoIdx.length; k += 2) {
    infos[duoIdx[k]].duoPair = duoIdx[k + 1];
    infos[duoIdx[k + 1]].duoPair = duoIdx[k];
  }
  // Parejas enamoradas: deben salir juntas del ascensor.
  for (const [a, b] of level.couples) {
    if (infos[a] && infos[b]) {
      infos[a].couplePair = b;
      infos[b].couplePair = a;
    }
  }
  // Enemigos: no pueden estar a bordo a la vez.
  for (const [a, b] of level.enemies) {
    if (infos[a] && infos[b]) {
      infos[a].enemies.push(b);
      infos[b].enemies.push(a);
    }
  }
  return infos;
}

function slotsOf(mask: number, infos: PassengerInfo[]): number {
  let s = 0;
  for (let i = 0; i < infos.length; i++) if (mask & (1 << i)) s += infos[i].slots;
  return s;
}

function popcount(m: number): number {
  let c = 0;
  while (m) { c += m & 1; m >>= 1; }
  return c;
}

function hasFear(mask: number, infos: PassengerInfo[]): boolean {
  for (let i = 0; i < infos.length; i++) {
    if (mask & (1 << i)) {
      if (infos[i].rule === 'fear') return true;
    }
  }
  return false;
}

function hasShy(mask: number, infos: PassengerInfo[]): boolean {
  for (let i = 0; i < infos.length; i++) {
    if (mask & (1 << i)) {
      if (infos[i].rule === 'shy') return true;
    }
  }
  return false;
}

/** ¿Puede subir el pasajero i con el estado actual? (reglas especiales) */
function canBoard(i: number, onboard: number, infos: PassengerInfo[], capacity: number): boolean {
  const inf = infos[i];
  // Tímido: solo si el ascensor está vacío.
  if (inf.rule === 'shy' && onboard !== 0) return false;
  // Si hay un tímido a bordo, nadie más puede subir.
  if (hasShy(onboard, infos)) return false;
  // Enemigos: no puede subir si su enemigo está a bordo.
  for (const e of inf.enemies) {
    if (onboard & (1 << e)) return false;
  }
  // Gemelos y dúo: suben en pareja (se comprueba el coste conjunto).
  let extra = inf.slots;
  if (inf.rule === 'twins' && inf.twinPair >= 0) extra += infos[inf.twinPair].slots;
  if (inf.rule === 'duo' && inf.duoPair >= 0) extra += infos[inf.duoPair].slots;
  if (slotsOf(onboard, infos) + extra > capacity) return false;
  // Miedoso: con él involucrado, como mucho 2 monstruos dentro.
  let newMask = onboard | (1 << i);
  if (inf.rule === 'twins' && inf.twinPair >= 0) newMask |= 1 << inf.twinPair;
  if (inf.rule === 'duo' && inf.duoPair >= 0) newMask |= 1 << inf.duoPair;
  if (hasFear(newMask, infos) && popcount(newMask) > 2) return false;
  return true;
}

/**
 * Calcula la distancia mínima posible para completar el nivel.
 * Dijkstra con montón binario. Los niveles tienen ≤10 pasajeros,
 * por lo que el espacio de estados es pequeño y el cálculo es rápido.
 */
export function computeOptimal(level: LevelDef): SolveResult {
  const infos = buildInfos(level);
  const n = infos.length;
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
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
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
      return { optimal: d, plan };
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
      for (let i = 0; i < n; i++) {
        if (delivered & (1 << i)) continue;
        if (onboard & (1 << i)) continue;
        if (!canBoard(i, onboard, infos, capacity)) continue;
        let next = onboard | (1 << i);
        if (infos[i].rule === 'twins' && infos[i].twinPair >= 0) {
          next |= 1 << infos[i].twinPair;
        }
        if (infos[i].rule === 'duo' && infos[i].duoPair >= 0) {
          next |= 1 << infos[i].duoPair;
        }
        relax(d, delivered, next, 0, { kind: 'board', pax: i });
      }
    }

    // Acción: viajar a otro piso (los pasajeros salen solos al llegar).
    for (let f = 0; f <= N; f++) {
      if (f === pos) continue;
      let ndelivered = delivered;
      let nonboard = onboard;
      for (let i = 0; i < n; i++) {
        if ((onboard & (1 << i)) && infos[i].dest === f) {
          // Parejas: solo salen si AMBOS están a bordo (si no, se quedan).
          if (infos[i].couplePair >= 0 && !(onboard & (1 << infos[i].couplePair))) continue;
          ndelivered |= 1 << i;
          nonboard &= ~(1 << i);
        }
      }
      relax(d + Math.abs(f - pos), ndelivered, nonboard, f, { kind: 'move', floor: f });
    }
  }

  // Si no se encontró solución (no debería pasar), se devuelve un valor alto.
  return { optimal: Number.MAX_SAFE_INTEGER, plan: [] };
}

/**
 * Umbrales de estrellas por eficiencia:
 * - 3 estrellas: distancia ≤ óptima + 1 (¡casi perfecto!).
 * - 2 estrellas: distancia ≤ óptima + 3.
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

/**
 * Puntuación y recorrido óptimo — ¡Piso Equivocado!
 *
 * La distancia recorrida por el ascensor determina las estrellas.
 * El recorrido óptimo se calcula con el algoritmo de Dijkstra sobre el
 * estado completo de la partida (entregados, a bordo, posición), teniendo
 * en cuenta la capacidad, los gigantes, los gemelos, los tímidos y los
 * fantasmas. Así las estrellas siempre se comparan contra un óptimo real,
 * nunca contra límites arbitrarios.
 */

import { LevelDef } from '../data/levels';
import { MONSTER_MAP, TWIN_GROUP } from '../data/monsters';

export interface SolveResult {
  optimal: number; // distancia mínima posible
}

interface PassengerInfo {
  dest: number;
  slots: number;
  rule: string;
  twinPair: number; // índice del gemelo pareja, o -1
}

function buildInfos(level: LevelDef): PassengerInfo[] {
  const infos: PassengerInfo[] = level.passengers.map((p) => {
    const def = MONSTER_MAP[p.m];
    return { dest: p.d, slots: def.slots, rule: def.rule, twinPair: -1 };
  });
  // Emparejar gemelos: cada gemelo conoce a su pareja.
  const twinIdx = infos.map((inf, i) => (inf.rule === 'twins' ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k + 1 < twinIdx.length; k += 2) {
    infos[twinIdx[k]].twinPair = twinIdx[k + 1];
    infos[twinIdx[k + 1]].twinPair = twinIdx[k];
  }
  return infos;
}

function slotsOf(mask: number, infos: PassengerInfo[]): number {
  let s = 0;
  for (let i = 0; i < infos.length; i++) if (mask & (1 << i)) s += infos[i].slots;
  return s;
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
  // Gemelos: suben en pareja (se comprueba el coste conjunto).
  let extra = inf.slots;
  if (inf.rule === 'twins' && inf.twinPair >= 0) extra += infos[inf.twinPair].slots;
  return slotsOf(onboard, infos) + extra <= capacity;
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

    if (delivered === full) return { optimal: d };

    const relax = (nd: number, ndelivered: number, nonboard: number, npos: number) => {
      const k = key(ndelivered, nonboard, npos);
      if (nd < (dist.get(k) ?? Infinity)) {
        dist.set(k, nd);
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
        relax(d, delivered, next, 0);
      }
    }

    // Acción: viajar a otro piso (los pasajeros salen solos al llegar).
    for (let f = 0; f <= N; f++) {
      if (f === pos) continue;
      let ndelivered = delivered;
      let nonboard = onboard;
      for (let i = 0; i < n; i++) {
        if ((onboard & (1 << i)) && infos[i].dest === f) {
          ndelivered |= 1 << i;
          nonboard &= ~(1 << i);
        }
      }
      relax(d + Math.abs(f - pos), ndelivered, nonboard, f);
    }
  }

  // Si no se encontró solución (no debería pasar), se devuelve un valor alto.
  return { optimal: Number.MAX_SAFE_INTEGER };
}

/** Umbrales de estrellas a partir del óptimo (siempre alcanzables y claros). */
export function starThresholds(optimal: number): { three: number; two: number } {
  const three = optimal + Math.max(2, Math.round(optimal * 0.2));
  const two = optimal + Math.max(4, Math.round(optimal * 0.6));
  return { three, two };
}

export function starsFor(distance: number, optimal: number): number {
  const { three, two } = starThresholds(optimal);
  if (distance <= three) return 3;
  if (distance <= two) return 2;
  return 1;
}

export function coinsFor(stars: number): number {
  return 6 + stars * 4;
}

/**
 * REGLAS COMPARTIDAS — ¡Piso Equivocado!
 *
 * Este módulo es la ÚNICA fuente de verdad de las reglas del puzzle. Lo usan:
 *   - el solver        (systems/scoring.ts)  → para calcular la ruta óptima,
 *   - el motor         (scenes/GameScene.ts) → para decidir si un monstruo sube o baja,
 *   - el modelo de tiempo (systems/timing.ts)→ para contar interacciones reales,
 *   - las pruebas      (tests/rules.test.ts) → para comprobar cada regla social.
 *
 * Antes existían DOS copias de las reglas (una dentro del solver y otra dentro de
 * GameScene) y ya se habían separado en tres puntos: los gemelos, el miedoso y el
 * sonámbulo. Aquí se unifican para que no vuelva a pasar.
 *
 * ── El "crew": la visión real de la cabina ─────────────────────────────────
 * `levels.ts` lista pasajeros individuales, pero el juego fusiona a los gemelos
 * en UN SOLO grupo que sube y baja junto (GameScene.createPassengers). El crew es
 * esa misma lista fusionada, así que un miembro del crew == un toque del jugador.
 *
 * ── Reglas DURAS y reglas BLANDAS ──────────────────────────────────────────
 * DURAS (las dos partes las bloquean igual, `policy` no importa):
 *   shy         Sombrín solo sube con la cabina vacía, y mientras él está dentro
 *               no puede subir nadie más.
 *   giant       Gordito ocupa 2 lugares.
 *   luggage     Maletero ocupa 2 lugares (sus maletas).
 *   ghost       Fantasmita ocupa 0 lugares (atraviesa paredes).
 *   twins       Los gemelos suben SIEMPRE juntos (1 toque, 2 criaturas, 2 lugares).
 *   duo         Pegajín y Pegajón suben siempre juntos (2 toques → el amigo sube solo).
 *   fear        Con Temblorín involucrado, como mucho 2 CRIATURAS en la cabina.
 *   capacity    La suma de lugares nunca puede pasar la capacidad del ascensor.
 *
 * BLANDAS (el juego las permite y cobra 1 estrella; el solver "limpio" las evita):
 *   enemies     Dos enemigos PUEDEN viajar juntos → -1 estrella (la 1ª vez Rese perdona).
 *   couples     Un enamorado PUEDE salir sin su pareja → -1 estrella (la 1ª vez perdona).
 *
 * `policy: 'clean'` convierte las blandas en duras: es la ruta que el juego
 * RECOMIENDA y contra la que se comparan las estrellas y el bonus de ruta óptima.
 * `policy: 'real'` es lo que el motor permite de verdad, y devuelve los avisos de
 * penalización para que la escena los cobre. Así el número "óptimo" nunca promete
 * algo que el juego no haga, y el juego nunca cobra algo que el solver no conozca.
 */

import { LevelDef } from '../data/levels';
import { MONSTER_MAP, TWIN_GROUP, SpecialRule } from '../data/monsters';

/** Una unidad que puede viajar: un monstruo, o los dos gemelos juntos. */
export interface CrewMember {
  /** Índice dentro del crew. Coincide con `Passenger.id` del motor. */
  id: number;
  /** Índices en `level.passengers` que representa (los gemelos son 2). */
  orig: number[];
  monsterId: string;
  rule: SpecialRule;
  dest: number;
  /** Lugares que ocupa en la cabina (gigante 2, maletas 2, fantasma 0). */
  slots: number;
  /** Cuántas CRIATURAS son: los gemelos son 2 aunque viajen como un grupo. */
  creatures: number;
  /** Mejor amigo (duo): sube automáticamente con él. -1 si no tiene. */
  partnerId: number;
  /** Pareja enamorada: debe salir junta. -1 si no tiene. */
  coupleId: number;
  /** Enemigos: viajar juntos cuesta 1 estrella. */
  enemyIds: number[];
  /** Sonámbulo: hay que tocarlo para despertarlo antes de que salga. */
  needsWake: boolean;
}

/** 'clean' = ruta recomendada (sin romper relaciones). 'real' = lo que el motor permite. */
export type BoardPolicy = 'clean' | 'real';

export type BlockReason =
  | 'shyInside'      // hay un tímido dentro: nadie más puede subir
  | 'shyWaiting'     // él es tímido y la cabina no está vacía
  | 'fear'           // Temblorín se asusta: más de 2 criaturas
  | 'partnerSpace'   // el dúo necesita 2 lugares libres
  | 'full'           // ascensor lleno
  | 'enemyOnboard';  // solo con policy 'clean'

export type Penalty = 'enemyRide' | 'coupleSeparated';

export type BoardVerdict =
  | { ok: true; board: number[]; penalties: Penalty[] }
  | { ok: false; reason: BlockReason };

export type ExitVerdict =
  | { exits: true; penalties: Penalty[] }
  | { exits: false; reason: 'wrongFloor' | 'asleep' | 'coupleAlone' };

/**
 * Construye el crew del nivel: la lista de unidades que el jugador ve y toca.
 * Reproduce EXACTAMENTE la fusión de gemelos de `GameScene.createPassengers`,
 * incluido el mapeo de parejas y enemigos desde los índices originales.
 */
export function buildCrew(level: LevelDef): CrewMember[] {
  const members: CrewMember[] = [];
  const twinIndexes: number[] = [];

  level.passengers.forEach((p, idx) => {
    if (p.m === TWIN_GROUP) { twinIndexes.push(idx); return; }
    const def = MONSTER_MAP[p.m];
    members.push(makeMember(members.length, [idx], p.m, p.d, def.rule, def.slots, 1));
  });

  // Los gemelos se fusionan al final (mismo orden que usa el motor).
  if (twinIndexes.length > 0) {
    const def = MONSTER_MAP[TWIN_GROUP];
    members.push(makeMember(
      members.length,
      twinIndexes,
      TWIN_GROUP,
      level.passengers[twinIndexes[0]].d,
      def.rule,
      def.slots * twinIndexes.length,
      twinIndexes.length,
    ));
  }

  // Índice original -> id del crew (para parejas y enemigos).
  const origToId = new Map<number, number>();
  for (const m of members) for (const oi of m.orig) origToId.set(oi, m.id);

  for (const [a, b] of level.couples) {
    const ia = origToId.get(a);
    const ib = origToId.get(b);
    if (ia !== undefined && ib !== undefined && ia !== ib) {
      members[ia].coupleId = ib;
      members[ib].coupleId = ia;
    }
  }
  for (const [a, b] of level.enemies) {
    const ia = origToId.get(a);
    const ib = origToId.get(b);
    if (ia !== undefined && ib !== undefined && ia !== ib) {
      if (!members[ia].enemyIds.includes(ib)) members[ia].enemyIds.push(ib);
      if (!members[ib].enemyIds.includes(ia)) members[ib].enemyIds.push(ia);
    }
  }

  // Mejores amigos (duo): se emparejan por orden de aparición, como el motor.
  const duoIds = members.filter((m) => m.rule === 'duo').map((m) => m.id);
  for (let k = 0; k + 1 < duoIds.length; k += 2) {
    members[duoIds[k]].partnerId = duoIds[k + 1];
    members[duoIds[k + 1]].partnerId = duoIds[k];
  }

  return members;
}

function makeMember(
  id: number, orig: number[], monsterId: string, dest: number,
  rule: SpecialRule, slots: number, creatures: number,
): CrewMember {
  return {
    id, orig, monsterId, rule, dest, slots, creatures,
    partnerId: -1, coupleId: -1, enemyIds: [], needsWake: rule === 'sleepwalker',
  };
}

/** Lugares ocupados por un conjunto de miembros. */
export function slotsOf(crew: CrewMember[], ids: Iterable<number>): number {
  let s = 0;
  for (const id of ids) s += crew[id].slots;
  return s;
}

/** Criaturas dentro de la cabina (los gemelos cuentan como 2). */
export function creaturesOf(crew: CrewMember[], ids: Iterable<number>): number {
  let c = 0;
  for (const id of ids) c += crew[id].creatures;
  return c;
}

function hasRule(crew: CrewMember[], ids: Iterable<number>, rule: SpecialRule): boolean {
  for (const id of ids) if (crew[id].rule === rule) return true;
  return false;
}

/**
 * ¿Puede subir el miembro `id` con `inCab` dentro?
 * `inCab` DEBE incluir también a los que están animando su subida ('boarding'):
 * si no, dos toques rápidos podían saltarse la regla del tímido.
 * `waiting` son los que siguen en la cola (ni entregados ni a bordo): hace falta
 * para saber si el mejor amigo del dúo puede subir con él o ya se fue a su piso.
 */
export function canBoard(
  crew: CrewMember[],
  id: number,
  inCab: number[],
  capacity: number,
  policy: BoardPolicy = 'clean',
  waiting?: number[],
): BoardVerdict {
  const me = crew[id];

  // Tímido: solo sube con la cabina vacía.
  if (me.rule === 'shy' && inCab.length > 0) return { ok: false, reason: 'shyWaiting' };
  // Y mientras hay un tímido dentro, no sube nadie más.
  if (hasRule(crew, inCab, 'shy')) return { ok: false, reason: 'shyInside' };

  // El grupo que sube: él + su mejor amigo (los gemelos ya son un solo miembro).
  // El amigo solo acompaña si SIGUE EN LA COLA: si ya llegó a su piso, no vuelve.
  const available = waiting ?? crew.filter((m) => !inCab.includes(m.id)).map((m) => m.id);
  const group = [id];
  if (me.partnerId >= 0 && available.includes(me.partnerId)) group.push(me.partnerId);

  // Enemigos: en ruta limpia no pueden viajar juntos; en el juego real sí, con coste.
  const penalties: Penalty[] = [];
  const enemiesInside = me.enemyIds.filter((e) => inCab.includes(e));
  if (enemiesInside.length > 0) {
    if (policy === 'clean') return { ok: false, reason: 'enemyOnboard' };
    penalties.push('enemyRide');
  }
  for (const g of group) {
    for (const e of crew[g].enemyIds) {
      if (e !== id && inCab.includes(e) && !penalties.includes('enemyRide')) {
        if (policy === 'clean') return { ok: false, reason: 'enemyOnboard' };
        penalties.push('enemyRide');
      }
    }
  }

  // Capacidad: lugares del grupo + los ya ocupados.
  const used = slotsOf(crew, inCab);
  const need = slotsOf(crew, group);
  if (used + need > capacity) {
    return { ok: false, reason: group.length > 1 ? 'partnerSpace' : 'full' };
  }

  // Miedoso: con él involucrado, como mucho 2 CRIATURAS dentro.
  const after = [...inCab, ...group];
  const fearInvolved = hasRule(crew, after, 'fear');
  if (fearInvolved && creaturesOf(crew, after) > 2) return { ok: false, reason: 'fear' };

  return { ok: true, board: group, penalties };
}

/**
 * ¿Sale el miembro `id` al llegar al piso `floor`?
 * `asleep` = ya se durmió y todavía no lo han despertado (sonámbulo).
 */
export function canExit(
  crew: CrewMember[],
  id: number,
  floor: number,
  inCab: number[],
  awake: boolean,
  policy: BoardPolicy = 'clean',
): ExitVerdict {
  const me = crew[id];
  if (me.needsWake && !awake) return { exits: false, reason: 'asleep' };
  if (me.dest !== floor) return { exits: false, reason: 'wrongFloor' };
  if (me.coupleId >= 0 && !inCab.includes(me.coupleId)) {
    if (policy === 'clean') return { exits: false, reason: 'coupleAlone' };
    return { exits: true, penalties: ['coupleSeparated'] };
  }
  return { exits: true, penalties: [] };
}

/** Regla de monstruo o relación entre pasajeros: todo lo que hay que interpretar. */
export type LevelRule = SpecialRule | 'couples' | 'enemies';

/** Reglas sociales distintas que aparecen en un nivel (para tarjetas y dificultad). */
export function rulesPresent(level: LevelDef): LevelRule[] {
  const set = new Set<LevelRule>();
  for (const p of level.passengers) {
    const r = MONSTER_MAP[p.m].rule;
    if (r !== 'none') set.add(r);
  }
  if (level.couples.length > 0) set.add('couples');
  if (level.enemies.length > 0) set.add('enemies');
  return [...set];
}

/** ¿El nivel estrena una mecánica que no existía en ningún nivel anterior? */
export function newRulesIn(level: LevelDef, all: LevelDef[]): LevelRule[] {
  const prev = new Set<LevelRule>();
  for (const l of all) {
    if (l.id >= level.id) break;
    for (const r of rulesPresent(l)) prev.add(r);
  }
  return rulesPresent(level).filter((r) => !prev.has(r));
}

/**
 * ÍNDICE DE DIFICULTAD (adimensional: solo sirve para comparar niveles entre sí).
 *
 * No usa solo los movimientos: un nivel de 12 pasos con tres reglas sociales es
 * más difícil que uno de 16 pasos sin ninguna. Pesa lo que el jugador tiene que
 * PENSAR, no lo que tiene que pulsar:
 *
 *   optimal               tamaño real del problema (movimientos mínimos demostrados)
 * + 4 × reglas sociales    cada regla activa obliga a interpretar una restricción
 * + 3 × presión de cabina  criaturas que no caben a la vez → más viajes que planificar
 * + 8 × prob. de avería    la interrupción rompe el plan a mitad de partida
 *
 * Lo consume tests/progression.test.ts para exigir que la campaña no tenga caídas
 * bruscas: la dificultad puede amesetarse, pero no desplomarse sin motivo.
 */
export function difficultyIndex(level: LevelDef, optimal: number, crewSize: number): number {
  const rules = rulesPresent(level).length;
  const pressure = Math.max(0, crewSize - level.capacity);
  return Math.round(optimal + 4 * rules + 3 * pressure + 8 * level.breakdownChance);
}

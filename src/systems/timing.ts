/**
 * MODELO DE TIEMPO — ¡Piso Equivocado!
 *
 * De aquí salen los `timeLimit` de los 30 niveles. No son un multiplicador
 * arbitrario sobre una partida perfecta: son la suma de TODO lo que un niño hace
 * de verdad, más el margen para equivocarse.
 *
 * Principio de diseño (Sprint 1): la tensión la ponen las ESTRELLAS (eficiencia de
 * la ruta), nunca el cronómetro. El reloj solo existe para que una partida no se
 * alargue para siempre, no para castigar pensar.
 *
 * Principio de diseño (opción B, decisión de producto): **un error grave no puede
 * convertir el nivel en una derrota automática**. Tres pisos equivocados seguidos
 * devuelven a todos los monstruos a recepción y cuestan ~45 s de reloj; el margen
 * de cada nivel cubre ese peor caso medido + 2 s de seguridad. El límite es un
 * techo, no una duración: quien juega bien termina igual de rápido, así que esto
 * solo alarga la partida de quien se equivoca, que es quien antes la perdía.
 *
 * Lo que NO consume reloj (comprobado en GameScene.ts:541, el tick del temporizador
 * se salta cuando alguna de estas condiciones es cierta):
 *   - los diálogos de Rese y el tutorial guiado   (reseActive)
 *   - las tarjetas ¡NUEVO! y la ficha de regla    (teaching)
 *   - la avería y su minijuego de reparación      (repairing)
 *   - la pausa y los paneles de fin de nivel      (paused / won)
 * Por eso el presupuesto no incluye "leer el tutorial" ni "reparar el ascensor":
 * esos segundos ya están regalados. Solo se presupuesta la REORIENTACIÓN tras una
 * avería, que sí ocurre con el reloj en marcha.
 */

import { LevelDef } from '../data/levels';
import { PlanStep, SolveResult, computeOptimal, MAX_MISTAKES } from './scoring';
import { buildCrew, difficultyIndex } from './rules';

/** Segundos de cada interacción real, medidos sobre las animaciones del juego. */
export const PACING = {
  readLevel: 6,          // mirar el edificio, la cola y los globos al empezar
  tapMonster: 3.5,       // pensar + tocar una criatura para que suba
  pressButton: 2.5,      // pensar + tocar un botón del panel de pisos
  doors: 0.5,            // cierre + apertura en cada parada (220 ms × 2)
  travelPerFloor: 0.42,  // 380 ms de tween por piso + 240 ms de arranque repartidos
  reactAfterMove: 1.2,   // darse cuenta de que ya llegó
  watchExit: 1.6,        // ver salir a cada uno (620 ms de vuelo + 300 ms de brillo)
  thinkPerTrip: 2.5,     // planificar cada viaje nuevo: quién sube y a dónde
  wakeThink: 3,          // darse cuenta de que Nocti se ha dormido
  wakeTap: 3,            // tocarlo, animación de 350 ms y burbuja "¡Despierto!"
  reorientAfterRepair: 3,// volver a situarse después de la avería (reloj en marcha)
  learningEarly: 8,      // niveles 1-3: aprender la interfaz (no a leer, eso pausa)
  learningMid: 4,        // niveles 4-8: todavía se duda al pulsar
  /** Un piso equivocado: drama en pantalla + viaje de más + volver a decidir. */
  mistakeRealize: 2.5,
  mistakeDrama: 1,
  mistakeExtraFloors: 3,
  mistakePressAgain: 2.5,
};

/** Errores normales que el reloj debe aguantar en CUALQUIER nivel. */
export const MISTAKES_ALLOWED = 2;

/** Segundos que cuesta un piso equivocado (el error caro; los bloqueos de regla son más baratos). */
export function mistakeCostSeconds(): number {
  return PACING.mistakeRealize
    + PACING.mistakeDrama
    + PACING.mistakeExtraFloors * PACING.travelPerFloor
    + PACING.mistakePressAgain
    + PACING.doors;
}

/**
 * El ERROR GRAVE, leído de `GameScene.ts` (no inventado):
 * al llegar a `MAX_MISTAKES` (3) pisos equivocados SEGUIDOS —el contador se
 * reinicia con cada entrega correcta— `wrongFloor()` avisa con un globo, espera
 * 1400 ms (l.1188) y baja a recepción (l.1189); al llegar, `grumpyExit()` devuelve
 * a TODOS a la cola con salida escalonada cada 260 ms (l.1200) y reinicia el
 * contador. El jugador tiene que volver a tocarlos a todos y rehacer el viaje.
 * El reloj NO se pausa en ningún momento de esa secuencia.
 */
export const GRUMPY = {
  bubbleWait: 1.4,     // espera antes de que el ascensor baje (delayedCall(1400))
  exitStagger: 0.26,   // retardo entre cada monstruo que sale de la cabina
  /** Cabina más grande de la campaña (nv 14+): el peor caso lleva 4 dentro. */
  worstCab: 4,
  /**
   * Piso medio más alto medido en los 30 niveles: nv 15 y nv 26, con 37/9 = 4,11.
   * Se presupuesta 4,12 (redondeado AL ALZA) para que el techo uniforme cubra de
   * verdad el peor nivel; `tests/timing.test.ts` comprueba nivel a nivel que ningún
   * coste propio se pasa de él.
   */
  worstAvgFloor: 4.12,
};

/** Margen de seguridad añadido al peor error grave (decisión de producto). */
export const SAFETY_MARGIN = 2;

/**
 * Coste del error grave EN UN NIVEL CONCRETO: sus 3 errores consecutivos, la espera
 * del globo, bajar a recepción y volver a subir (ida y vuelta al piso medio de ese
 * nivel), la salida escalonada, volver a tocar a todos los que iban dentro y rehacer
 * el plan. Se usa para COMPROBAR que el presupuesto uniforme cubre los 30 casos.
 */
export function grumpyCostSeconds(level: LevelDef): number {
  const dentro = Math.min(level.capacity, buildCrew(level).length);
  const pisoMedio = level.passengers.reduce((a, p) => a + p.d, 0) / level.passengers.length;
  return MAX_MISTAKES * mistakeCostSeconds()
    + GRUMPY.bubbleWait
    + 2 * pisoMedio * PACING.travelPerFloor
    + (dentro - 1) * GRUMPY.exitStagger
    + dentro * PACING.tapMonster
    + PACING.thinkPerTrip;
}

/**
 * Coste del PEOR error grave medido en la campaña (45,42 s), NO del promedio
 * (43,1 s): se calcula con la geometría más cara que existe en el juego —cabina
 * llena de 4 en un edificio cuyo piso medio es 4,12— para que un mismo margen sirva
 * en los 30 niveles. `tests/timing.test.ts` comprueba que ninguno se pasa de él.
 */
export function grumpyWorstCaseSeconds(): number {
  return MAX_MISTAKES * mistakeCostSeconds()
    + GRUMPY.bubbleWait
    + 2 * GRUMPY.worstAvgFloor * PACING.travelPerFloor
    + (GRUMPY.worstCab - 1) * GRUMPY.exitStagger
    + GRUMPY.worstCab * PACING.tapMonster
    + PACING.thinkPerTrip;
}

/**
 * Presupuesto de errores del reloj = el MAYOR de:
 *   - 2 errores normales  (MISTAKES_ALLOWED × mistakeCostSeconds() = 15,52 s)
 *   - 1 error grave completo en su peor caso medido + 2 s de margen de seguridad
 *
 * Es la opción B autorizada: permite DOS errores normales O UN error grave, pero
 * no los dos a la vez (eso alargaría la campaña un 32 % y se descartó). Como el
 * presupuesto de errores ya no depende del nivel, la parte individual de cada
 * `timeLimit` sigue siendo su `base` (pasajeros, viajes, reglas, averías).
 */
export function mistakesBudgetSeconds(): number {
  return Math.max(
    MISTAKES_ALLOWED * mistakeCostSeconds(),
    grumpyWorstCaseSeconds() + SAFETY_MARGIN,
  );
}

export interface LevelTiming {
  /** Unidades que el jugador toca (los gemelos cuentan como 1 unidad y 2 criaturas). */
  crew: number;
  /** Criaturas en total (lo que se ve en pantalla). */
  monsters: number;
  /** Toques para subir a todos. */
  boards: number;
  /** Toques de botón de piso. */
  moves: number;
  /** Viajes de carga distintos (vueltas a recepción con monstruos esperando). */
  trips: number;
  /** Distancia mínima demostrada por el solver. */
  optimal: number;
  /** Sonámbulos que hay que despertar. */
  sleepers: number;
  /** Desglose en segundos. */
  read: number;
  taps: number;
  buttons: number;
  travel: number;
  exits: number;
  wakes: number;
  thinking: number;
  learning: number;
  breakdown: number;
  /** Partida limpia y lenta: todo lo anterior sumado. */
  base: number;
  /** Margen para equivocarse: cubre 2 errores normales O 1 error grave + seguridad. */
  mistakes: number;
  /** Coste del error grave de ESTE nivel (su propia cabina y su propio piso medio). */
  grumpyCost: number;
  /** base + mistakes, sin redondear. */
  total: number;
  /** Lo que debe poner levels.ts (total redondeado hacia arriba a 5 s). */
  recommended: number;
  /** Holgura real del límite recomendado frente a la partida limpia. */
  slack: number;
  /** Errores normales que aguanta ese límite (debe ser >= MISTAKES_ALLOWED). */
  errorsTolerated: number;
  /** Errores GRAVES completos que aguanta ese límite (debe ser >= 1). */
  grumpyTolerated: number;
  /** Índice de dificultad compartido con rules.ts. */
  difficulty: number;
}

const cache = new WeakMap<LevelDef, LevelTiming>();

/** Cuenta los viajes de carga de un plan: grupos de subidas separados por movimientos. */
export function countTrips(plan: PlanStep[]): number {
  let trips = 0;
  let prev: PlanStep['kind'] | null = null;
  for (const step of plan) {
    if (step.kind === 'board' && prev !== 'board') trips += 1;
    prev = step.kind;
  }
  return trips;
}

/** Calcula (y memoriza) el presupuesto de tiempo completo de un nivel. */
export function levelTiming(level: LevelDef, solve?: SolveResult): LevelTiming {
  const hit = cache.get(level);
  if (hit && !solve) return hit;

  const { optimal, plan } = solve ?? computeOptimal(level);
  const crew = buildCrew(level);
  const boards = plan.filter((s) => s.kind === 'board').length;
  const moves = plan.filter((s) => s.kind === 'move').length;
  const trips = countTrips(plan);
  const sleepers = crew.filter((m) => m.needsWake).length;
  const monsters = crew.reduce((a, m) => a + m.creatures, 0);

  const read = PACING.readLevel;
  const taps = boards * PACING.tapMonster;
  const buttons = moves * (PACING.pressButton + PACING.doors + PACING.reactAfterMove);
  const travel = optimal * PACING.travelPerFloor;
  const exits = boards * PACING.watchExit;
  const wakes = sleepers * (PACING.wakeThink + PACING.wakeTap);
  const thinking = trips * PACING.thinkPerTrip;
  const learning = level.id <= 3 ? PACING.learningEarly : level.id <= 8 ? PACING.learningMid : 0;
  const breakdown = level.breakdownChance * PACING.reorientAfterRepair;

  const base = read + taps + buttons + travel + exits + wakes + thinking + learning + breakdown;
  const mistakes = mistakesBudgetSeconds();
  const total = base + mistakes;
  const recommended = Math.ceil(total / 5) * 5;

  const t: LevelTiming = {
    crew: crew.length, monsters, boards, moves, trips, optimal, sleepers,
    read, taps, buttons, travel, exits, wakes, thinking, learning, breakdown,
    // base/mistakes se publican redondeados a 0,1 s (son para mostrar); `total` se
    // publica EXACTO porque de él sale `recommended` y un total redondeado no permite
    // recalcularlo (150,004 s redondeado a 150,0 daría 150 en vez de 155).
    base: round1(base), mistakes: round1(mistakes), total,
    grumpyCost: round1(grumpyCostSeconds(level)),
    recommended,
    slack: round1(recommended - base),
    errorsTolerated: Math.floor((recommended - base) / mistakeCostSeconds()),
    grumpyTolerated: Math.floor((recommended - base) / grumpyCostSeconds(level)),
    difficulty: difficultyIndex(level, optimal, trips),
  };
  if (!solve) cache.set(level, t);
  return t;
}

/** Límite de tiempo que debe llevar el nivel en `levels.ts`. */
export function recommendedTimeLimit(level: LevelDef, solve?: SolveResult): number {
  return levelTiming(level, solve).recommended;
}

/**
 * Segundos que tarda de verdad una partida limpia y lenta (sin errores).
 * Es lo que usa el simulador de equilibrio para estimar la duración de una sesión:
 * el `timeLimit` ya no sirve para eso porque ahora incluye el margen de errores.
 */
export function expectedSeconds(level: LevelDef): number {
  return levelTiming(level).base;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

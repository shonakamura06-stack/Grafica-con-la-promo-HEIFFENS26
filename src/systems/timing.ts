/**
 * MODELO DE TIEMPO — ¡Piso Equivocado!
 *
 * De aquí salen los `timeLimit` de los 30 niveles. No son un multiplicador
 * arbitrario sobre una partida perfecta: son la suma de TODO lo que un niño hace
 * de verdad, más el margen para equivocarse dos veces.
 *
 * Principio de diseño (Sprint 1): la tensión la ponen las ESTRELLAS (eficiencia de
 * la ruta), nunca el cronómetro. El reloj solo existe para que una partida no se
 * alargue para siempre, no para castigar pensar.
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
import { PlanStep, SolveResult, computeOptimal } from './scoring';
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
  /** Margen para equivocarse MISTAKES_ALLOWED veces. */
  mistakes: number;
  /** base + mistakes, sin redondear. */
  total: number;
  /** Lo que debe poner levels.ts (total redondeado hacia arriba a 5 s). */
  recommended: number;
  /** Holgura real del límite recomendado frente a la partida limpia. */
  slack: number;
  /** Errores normales que aguanta ese límite (debe ser >= MISTAKES_ALLOWED). */
  errorsTolerated: number;
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
  const mistakes = MISTAKES_ALLOWED * mistakeCostSeconds();
  const total = base + mistakes;
  const recommended = Math.ceil(total / 5) * 5;

  const t: LevelTiming = {
    crew: crew.length, monsters, boards, moves, trips, optimal, sleepers,
    read, taps, buttons, travel, exits, wakes, thinking, learning, breakdown,
    base: round1(base), mistakes: round1(mistakes), total: round1(total),
    recommended,
    slack: round1(recommended - base),
    errorsTolerated: Math.floor((recommended - base) / mistakeCostSeconds()),
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

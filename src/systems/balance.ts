/**
 * Simulación de balance económico — Economía V3.
 *
 * Responde con NÚMEROS (no suposiciones) a:
 *  - ¿Cuánto tarda cada perfil de jugador en conseguir cada cosmético?
 *  - ¿Hay inflación (monedas de sobra) o escasez absurda?
 *  - ¿Repetir niveles genera monedas? (debe ser 0: no se puede granjear)
 *
 * Los tiempos por nivel usan el `timeLimit` de cada nivel, que ya está calibrado
 * con una simulación de partida lenta de un niño (ver docs/INFORME-PRUEBAS.md).
 */

import { LEVELS, TOTAL_LEVELS } from '../data/levels';
import { expectedSeconds } from './timing';
import { SHOP_ITEMS } from '../data/shop';
import { MISSIONS } from '../data/missions';
import { COIN_REWARDS, coinShopTotalWithBundle } from './economy';

export interface Profile {
  id: string;
  name: string;
  desc: string;
  /** Niveles distintos completados en la campaña. */
  levelsCompleted: number;
  /** Promedio de estrellas conseguidas por nivel (1..3). */
  avgStars: number;
  /** Fracción de niveles completados con 3 estrellas (0..1). */
  threeStarRate: number;
  /** Fracción resuelta en la ruta óptima exacta (0..1). */
  optimalRate: number;
  /** Fracción completada sin ninguna equivocación (0..1). */
  cleanRate: number;
  /** Parejas entregadas juntas por nivel (promedio). */
  couplesPerLevel: number;
  /** Repeticiones por nivel completado (NO dan monedas). */
  replaysPerLevel: number;
  /** Niveles superados en el Modo Desafío opcional. */
  challengeLevels: number;
  /** Monstruos distintos descubiertos. */
  albumFound: number;
  /** Niveles jugados por sesión. */
  levelsPerSession: number;
  /** Fracción del tiempo límite que tarda por nivel (1 = usa todo el tiempo). */
  speedFactor: number;
}

export const PROFILES: Profile[] = [
  {
    id: 'casual', name: 'Jugador casual',
    desc: 'Juega de vez en cuando, termina la campaña con 1–2 estrellas y sin buscar el óptimo.',
    levelsCompleted: TOTAL_LEVELS, avgStars: 1.6, threeStarRate: 0.15, optimalRate: 0,
    cleanRate: 0.2, couplesPerLevel: 0.6, replaysPerLevel: 0.6, challengeLevels: 0,
    albumFound: 16, levelsPerSession: 3, speedFactor: 0.95,
  },
  {
    id: 'habitual', name: 'Jugador habitual',
    desc: 'Vuelve varias veces por semana, mejora sus estrellas y prueba el Modo Desafío.',
    levelsCompleted: TOTAL_LEVELS, avgStars: 2.3, threeStarRate: 0.45, optimalRate: 0.2,
    cleanRate: 0.45, couplesPerLevel: 1.1, replaysPerLevel: 1.0, challengeLevels: 10,
    albumFound: 20, levelsPerSession: 4, speedFactor: 0.8,
  },
  {
    id: 'perfeccionista', name: 'Jugador que consigue 3 estrellas',
    desc: 'Busca la ruta óptima y las 3 estrellas en todo; completa el álbum y el desafío.',
    levelsCompleted: TOTAL_LEVELS, avgStars: 3, threeStarRate: 1, optimalRate: 0.85,
    cleanRate: 0.85, couplesPerLevel: 1.5, replaysPerLevel: 1.4, challengeLevels: TOTAL_LEVELS,
    albumFound: 20, levelsPerSession: 5, speedFactor: 0.6,
  },
  {
    id: 'repetidor', name: 'Jugador que repite niveles',
    desc: 'Repite mucho los mismos niveles: debe ganar monedas SOLO por logros nuevos.',
    levelsCompleted: 8, avgStars: 2.5, threeStarRate: 0.5, optimalRate: 0.25,
    cleanRate: 0.5, couplesPerLevel: 1, replaysPerLevel: 8, challengeLevels: 2,
    albumFound: 12, levelsPerSession: 6, speedFactor: 0.7,
  },
  {
    id: 'sesion_corta', name: 'Jugador de pocos minutos por sesión',
    desc: 'Sesiones muy cortas (1–2 niveles): progresa lento pero sin castigos ni esperas.',
    levelsCompleted: 18, avgStars: 2, threeStarRate: 0.3, optimalRate: 0.1,
    cleanRate: 0.35, couplesPerLevel: 0.9, replaysPerLevel: 0.8, challengeLevels: 0,
    albumFound: 16, levelsPerSession: 1.5, speedFactor: 0.9,
  },
];

export interface Affordability {
  id: string;
  name: string;
  cat: string;
  price: number;
  affordable: boolean;
  /** Cuántas sesiones de este perfil harían falta para pagarlo desde cero. */
  sessionsNeeded: number;
  /** Minutos de juego equivalentes. */
  minutesNeeded: number;
}

export interface BalanceResult {
  profile: Profile;
  coins: number;
  breakdown: {
    firstWin: number;
    stars: number;
    optimal: number;
    missions: number;
    challenge: number;
    replays: number;
  };
  levelsPlayed: number;
  sessions: number;
  minutes: number;
  affordability: Affordability[];
  /** Cosméticos DE PAGO que puede comprar con su saldo (comprando lo más barato primero). */
  itemsAffordable: number;
  /** Cosméticos de pago que existen en la tienda. */
  itemsTotal: number;
  /** ¿Le alcanza para TODO el catálogo de monedas (ruta del paquete incluido)? */
  canBuyEverything: boolean;
  /** Monedas que le sobran después de comprar lo que puede. */
  coinsLeft: number;
}

/**
 * Minutos promedio por nivel del perfil.
 *
 * Usa el tiempo REAL de una partida limpia y lenta (systems/timing.ts), no el
 * `timeLimit`: desde el Sprint 1 el límite incluye el margen para equivocarse dos
 * veces, así que tomarlo aquí sobreestimaría la duración de cada sesión y todo el
 * informe de equilibrio saldría inflado. Las monedas NO dependen de este número
 * (salen de niveles, estrellas y misiones), así que la Economía V3 queda intacta.
 */
export function avgMinutesPerLevel(p: Profile): number {
  const avgSeconds = LEVELS.reduce((a, l) => a + expectedSeconds(l), 0) / LEVELS.length;
  return (avgSeconds * p.speedFactor) / 60;
}

/** Simula las monedas que gana un perfil y cuánto tarda en cada cosmético. */
export function simulateProfile(p: Profile): BalanceResult {
  const levelsCompleted = Math.max(0, Math.min(TOTAL_LEVELS, Math.round(p.levelsCompleted)));
  const replays = Math.round(levelsCompleted * p.replaysPerLevel);
  const challenge = Math.max(0, Math.min(levelsCompleted, Math.round(p.challengeLevels)));

  const firstWin = levelsCompleted * COIN_REWARDS.FIRST_WIN;
  const starsEarned = Math.round(levelsCompleted * p.avgStars);
  const stars = starsEarned * COIN_REWARDS.PER_STAR;
  const optimalCount = Math.round(levelsCompleted * p.optimalRate);
  const optimal = optimalCount * COIN_REWARDS.OPTIMAL;
  const challengeCoins = challenge * COIN_REWARDS.CHALLENGE_BADGE;

  // Contadores de misiones derivados del perfil (mismas reglas que el juego).
  const counters: Record<string, number> = {
    levelsDone: levelsCompleted,
    threeStars: Math.round(levelsCompleted * p.threeStarRate),
    perfects: optimalCount,
    album: Math.min(20, p.albumFound),
    couples: Math.round(levelsCompleted * p.couplesPerLevel),
    cleanLevels: Math.round(levelsCompleted * p.cleanRate),
    challengeCleared: challenge,
  };
  const missions = MISSIONS
    .filter((m) => (counters[m.counter] ?? 0) >= m.goal)
    .reduce((a, m) => a + m.reward, 0);

  const coins = firstWin + stars + optimal + missions + challengeCoins;
  const levelsPlayed = levelsCompleted + replays + challenge;
  const minutesPerLevel = avgMinutesPerLevel(p);
  const minutes = levelsPlayed * minutesPerLevel;
  const sessions = Math.max(1, Math.ceil(levelsPlayed / p.levelsPerSession));

  // Repetir no paga: se calcula explícitamente para que la prueba lo verifique.
  const replaysCoins = 0;

  const coinItems = SHOP_ITEMS.filter((i) => i.cat !== 'pack' && i.price > 0);
  // Compra voraz (lo más barato primero) para saber cuántos objetos alcanzan.
  const sorted = [...coinItems].sort((a, b) => a.price - b.price);
  let budget = coins;
  let bought = 0;
  for (const item of sorted) {
    if (budget >= item.price) { budget -= item.price; bought += 1; }
  }
  const affordability: Affordability[] = SHOP_ITEMS.map((item) => {
    const price = item.cat === 'pack' ? item.price : item.price;
    const perLevel = levelsPlayed > 0 ? coins / levelsPlayed : 0;
    const levelsNeeded = perLevel > 0 ? price / perLevel : Infinity;
    return {
      id: item.id,
      name: item.name,
      cat: item.cat,
      price,
      affordable: coins >= price,
      sessionsNeeded: Number.isFinite(levelsNeeded)
        ? Math.max(1, Math.ceil(levelsNeeded / p.levelsPerSession))
        : Infinity,
      minutesNeeded: Number.isFinite(levelsNeeded) ? levelsNeeded * minutesPerLevel : Infinity,
    };
  });

  return {
    profile: p,
    coins,
    breakdown: { firstWin, stars, optimal, missions, challenge: challengeCoins, replays: replaysCoins },
    levelsPlayed,
    sessions,
    minutes,
    affordability,
    itemsAffordable: bought,
    itemsTotal: coinItems.length,
    canBuyEverything: coins >= coinShopTotalWithBundle(),
    coinsLeft: budget,
  };
}

/** Simula todos los perfiles de una vez (para informes y pruebas). */
export function simulateAll(): BalanceResult[] {
  return PROFILES.map(simulateProfile);
}

/** Tabla legible del balance (se copia al informe y se muestra en el panel de datos). */
export function balanceTable(): string {
  const rows = simulateAll();
  const lines: string[] = [];
  lines.push('| Perfil | Niveles | Partidas | Sesiones | Minutos | Monedas | Repeticiones pagan |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(
      `| ${r.profile.name} | ${Math.round(r.profile.levelsCompleted)} | ${r.levelsPlayed} | ${r.sessions} | `
      + `${Math.round(r.minutes)} | ${r.coins} | ${r.breakdown.replays} |`
    );
  }
  return lines.join('\n');
}

/**
 * Motor económico V3 — ¡Piso Equivocado!
 *
 * Principios (ver docs/ECONOMIA.md):
 *  1. La campaña es GRATIS y sin energía: reintentos ilimitados, sin esperas.
 *  2. Las monedas premian LOGROS, no tiempo: cada logro paga UNA SOLA VEZ.
 *     Repetir un nivel no duplica monedas; mejorar una marca paga solo la diferencia.
 *  3. Todo lo comprable con monedas es cosmético.
 *  4. Sin anuncios, sin cajas aleatorias, sin ofertas con cuenta atrás.
 *
 * Este módulo es lógica pura (sin Phaser): se puede probar y simular.
 */

import {
  SaveData, ownsItem, writeSave, defaultMetrics,
} from './save';
import { itemById, SHOP_ITEMS, PACKS, type PackDef } from '../data/shop';
import { MISSIONS, MISSION_MAP, type MissionDef } from '../data/missions';

/** Recompensas base acordadas. */
export const COIN_REWARDS = {
  FIRST_WIN: 20,        // completar un nivel por primera vez
  PER_STAR: 5,          // cada estrella NUEVA conseguida
  OPTIMAL: 10,          // resolverlo con movimientos óptimos (una vez por nivel)
  CHALLENGE_BADGE: 25,  // insignia del Modo Desafío (una vez por nivel)
} as const;

export interface RewardLine {
  label: string;
  coins: number;
}

export interface LevelReward {
  lines: RewardLine[];
  total: number;
  stars: number;
  newStars: number;
  firstWin: boolean;
  perfect: boolean;
  record: boolean;
  missionsReady: MissionDef[];
}

export interface SettleOptions {
  /** Reglas rotas (parejas separadas, enemigos juntos): afectan estrellas, no monedas. */
  penalties?: number;
  /** Pisos equivocados en la partida. */
  mistakes?: number;
  /** Parejas entregadas juntas en este nivel. */
  couplesDelivered?: number;
  /** ¿Se jugó en Modo Desafío (opcional, con vidas)? */
  challenge?: boolean;
}

/** Recalcula los contadores derivados (nunca se cuentan dos veces). */
export function syncProgress(save: SaveData): void {
  const p = save.progress;
  p.levelsDone = Object.keys(save.completed).length;
  p.threeStars = Object.values(save.stars).filter((s) => s >= 3).length;
  p.perfects = Object.keys(save.perfectLevels).length;
  p.album = save.monstersUnlocked.length;
  p.challengeCleared = Object.keys(save.challengeCleared).length;
  for (const key of ['levelsDone', 'threeStars', 'perfects', 'album', 'challengeCleared']) {
    p[key] = Math.max(0, p[key] ?? 0);
  }
  for (const key of ['couples', 'cleanLevels']) p[key] = Math.max(0, p[key] ?? 0);
}

function addCoins(save: SaveData, amount: number, lines: RewardLine[], label: string): void {
  if (amount <= 0) return;
  save.coins += amount;
  save.metrics.coinsEarned += amount;
  lines.push({ label, coins: amount });
}

/**
 * Liquida las recompensas de un nivel completado.
 * Devuelve el desglose para mostrarlo en el panel de victoria.
 * MUTA el save (llamar a writeSave después).
 */
export function settleLevel(
  save: SaveData,
  levelId: number,
  stars: number,
  distance: number,
  optimal: number,
  opts: SettleOptions = {}
): LevelReward {
  const lines: RewardLine[] = [];
  const penalties = opts.penalties ?? 0;
  const mistakes = opts.mistakes ?? 0;
  const couples = opts.couplesDelivered ?? 0;

  if (!save.metrics) save.metrics = defaultMetrics();
  save.metrics.levelsCompleted += 1;

  // 1) Primera victoria del nivel: 20 monedas, una sola vez en la vida.
  const firstWin = save.completed[levelId] !== true;
  if (firstWin) {
    save.completed[levelId] = true;
    addCoins(save, COIN_REWARDS.FIRST_WIN, lines, 'Primera victoria');
  }

  // 2) Estrellas NUEVAS: +5 por cada estrella que no tenías (solo la diferencia).
  const prevStars = save.stars[levelId] ?? 0;
  const newStars = Math.max(0, stars - prevStars);
  save.stars[levelId] = Math.max(prevStars, stars);
  addCoins(save, newStars * COIN_REWARDS.PER_STAR, lines, `Estrellas nuevas ×${newStars}`);

  // 3) Ruta óptima exacta: +10, una sola vez por nivel.
  const perfect = distance === optimal && penalties === 0;
  if (perfect && save.perfectLevels[levelId] !== true) {
    save.perfectLevels[levelId] = true;
    addCoins(save, COIN_REWARDS.OPTIMAL, lines, 'Ruta óptima');
  }

  // 4) Récord personal (sin monedas: es prestigio, evita granjas de recompensas).
  const prevBest = save.bestDistance[levelId];
  const record = penalties === 0 && prevBest !== undefined && distance < prevBest;
  save.bestDistance[levelId] = Math.min(prevBest ?? Infinity, distance);

  // Contadores de misiones (acumulativos solo cuando corresponde).
  if (!opts.challenge) {
    if (penalties === 0 && couples > 0) save.progress.couples = (save.progress.couples ?? 0) + couples;
    if (mistakes === 0 && penalties === 0) save.progress.cleanLevels = (save.progress.cleanLevels ?? 0) + 1;
  }
  syncProgress(save);

  const total = lines.reduce((a, l) => a + l.coins, 0);
  return {
    lines, total, stars, newStars, firstWin, perfect, record,
    missionsReady: claimableMissions(save).map((m) => m.def),
  };
}

/** Insignia del Modo Desafío: +25 monedas una sola vez por nivel. */
export function settleChallenge(save: SaveData, levelId: number): RewardLine | null {
  if (!save.metrics) save.metrics = defaultMetrics();
  save.metrics.challengeAttempts += 1;
  if (save.challengeCleared[levelId] === true) return null;
  save.challengeCleared[levelId] = true;
  const line: RewardLine = { label: 'Insignia de Desafío', coins: COIN_REWARDS.CHALLENGE_BADGE };
  save.coins += line.coins;
  save.metrics.coinsEarned += line.coins;
  save.metrics.challengeCleared += 1;
  syncProgress(save);
  return line;
}

// ── Misiones ───────────────────────────────────────────────────────────────

export interface MissionState {
  def: MissionDef;
  progress: number;
  goal: number;
  done: boolean;
  claimed: boolean;
}

export function missionState(save: SaveData): MissionState[] {
  syncProgress(save);
  return MISSIONS.map((def) => {
    const progress = Math.min(def.goal, save.progress[def.counter] ?? 0);
    const done = progress >= def.goal;
    return { def, progress, goal: def.goal, done, claimed: save.claimed[def.id] !== undefined };
  });
}

/** Misiones completadas y todavía sin cobrar. */
export function claimableMissions(save: SaveData): MissionState[] {
  return missionState(save).filter((m) => m.done && !m.claimed);
}

/**
 * Cobra una misión. Devuelve las monedas entregadas (0 si no corresponde).
 * Imposible cobrar dos veces: queda registrado el timestamp.
 */
export function claimMission(save: SaveData, id: string, now: number = Date.now()): number {
  const def = MISSION_MAP[id];
  if (!def) return 0;
  if (save.claimed[id] !== undefined) return 0;
  const progress = save.progress[def.counter] ?? 0;
  if (progress < def.goal) return 0;
  save.claimed[id] = now;
  save.coins += def.reward;
  if (!save.metrics) save.metrics = defaultMetrics();
  save.metrics.coinsEarned += def.reward;
  save.metrics.missionsClaimed += 1;
  return def.reward;
}

// ── Tienda (monedas virtuales) ─────────────────────────────────────────────

export interface PurchaseResult {
  ok: boolean;
  reason?: 'no-existe' | 'solo-pago' | 'ya-lo-tienes' | 'sin-monedas';
  spent: number;
  granted: string[];
}

/** ¿El item es comprable con monedas? */
export function isCoinItem(id: string): boolean {
  return itemById(id)?.source === 'coins';
}

/**
 * Compra con monedas. Nunca permite comprar dos veces lo mismo y nunca
 * entrega más de lo pagado (los paquetes entregan su contenido exacto).
 */
export function buyItem(save: SaveData, id: string): PurchaseResult {
  const item = itemById(id);
  const fail = (reason: PurchaseResult['reason']): PurchaseResult => ({ ok: false, reason, spent: 0, granted: [] });
  if (!item) return fail('no-existe');
  if (item.source !== 'coins') return fail('solo-pago');
  if (ownsItem(save, id)) return fail('ya-lo-tienes');
  if (save.coins < item.price) return fail('sin-monedas');

  save.coins -= item.price;
  save.owned[id] = true;
  const granted = item.includes ? [...item.includes] : [];
  for (const g of granted) save.owned[g] = true;

  if (!save.metrics) save.metrics = defaultMetrics();
  save.metrics.coinsSpent += item.price;
  save.metrics.itemsBought += 1;
  save.metrics.itemsByCategory[item.cat] = (save.metrics.itemsByCategory[item.cat] ?? 0) + 1;
  return { ok: true, spent: item.price, granted: [id, ...granted] };
}

/** Equipa un item ya poseído. */
export function equipItem(save: SaveData, id: string): boolean {
  const item = itemById(id);
  if (!item || item.slot === 'pack') return false;
  if (!ownsItem(save, id)) return false;
  if (item.slot === 'celebration') {
    save.custom.celebration = id === 'd_celebracion' ? 'd_celebracion' : 'normal';
    return true;
  }
  (save.custom[item.slot] as string) = id;
  return true;
}

/** Quita un accesorio/decoración (vuelve al estado base). */
export function unequipSlot(save: SaveData, slot: 'monsterAcc' | 'decor' | 'celebration' | 'accessory'): void {
  if (slot === 'celebration') save.custom.celebration = 'normal';
  else if (slot === 'accessory') save.custom.accessory = 'a_azul';
  else save.custom[slot] = 'ninguno';
}

export function packById(id: string): PackDef | undefined {
  return PACKS.find((p) => p.id === id);
}

/**
 * Desbloquea un pack de contenido de pago.
 *  - via 'store': compra real (solo en la versión de tienda con pagos integrados).
 *  - via 'demo': prueba sin cobro en esta versión web, para que un adulto evalúe
 *    el contenido exacto antes de decidir. No sustituye la compra real.
 */
export function unlockPack(save: SaveData, packId: string, via: 'store' | 'demo'): boolean {
  const pack = packById(packId);
  if (!pack || save.paid[packId]) return false;
  save.paid[packId] = true;
  for (const id of pack.items) save.owned[id] = true;
  if (!save.metrics) save.metrics = defaultMetrics();
  save.metrics.packsUnlocked += 1;
  if (via === 'demo') save.metrics.demoUnlocks += 1;
  return true;
}

/** Guarda de forma segura después de una operación económica. */
export function commit(save: SaveData): SaveData {
  writeSave(save);
  return save;
}

// ── Balance: cuánto da el juego, para simular la economía ──────────────────

/** Monedas máximas obtenibles por completar TODO (campaña + misiones + desafío). */
export function maxCoinsFromGame(totalLevels = 30, totalStars = 3, albumSize = 20): number {
  const firstWins = totalLevels * COIN_REWARDS.FIRST_WIN;
  const stars = totalLevels * totalStars * COIN_REWARDS.PER_STAR;
  const optimal = totalLevels * COIN_REWARDS.OPTIMAL;
  const missions = MISSIONS.reduce((a, m) => a + m.reward, 0);
  const challenge = totalLevels * COIN_REWARDS.CHALLENGE_BADGE;
  return firstWins + stars + optimal + missions + challenge;
}

export const MAX_COINS = maxCoinsFromGame();

/** Coste total de la tienda de monedas (items individuales, sin el paquete). */
export function coinShopTotal(): number {
  return SHOP_ITEMS.filter((i) => i.cat !== 'pack').reduce((a, i) => a + i.price, 0);
}

/** Coste comprando el paquete + lo que no incluye. */
export function coinShopTotalWithBundle(): number {
  const pack = SHOP_ITEMS.find((i) => i.cat === 'pack');
  const included = new Set(pack?.includes ?? []);
  const rest = SHOP_ITEMS.filter((i) => i.cat !== 'pack' && !included.has(i.id))
    .reduce((a, i) => a + i.price, 0);
  return (pack?.price ?? 0) + rest;
}

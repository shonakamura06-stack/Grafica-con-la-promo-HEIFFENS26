/**
 * Guardado local — ¡Piso Equivocado! (Economía V3)
 *
 * Persiste el progreso en localStorage con formato versionado.
 * NO se guarda ninguna información personal: solo progreso de juego, monedas,
 * cosméticos comprados, contadores de misiones y métricas agregadas.
 *
 * CAMBIOS V3 (respecto a la V2 de corazones escasos):
 *  - Se eliminan los corazones como requisito para jugar: la campaña tiene
 *    reintentos ilimitados (modo Desafío opcional aparte, con vidas propias).
 *  - Se elimina la suscripción premium mensual y la compra de corazones.
 *  - Las monedas se ganan por LOGROS ÚNICOS (primera victoria, estrellas nuevas,
 *    ruta óptima, misiones e hitos): repetir un nivel no duplica monedas.
 *  - Migración: se conservan monedas, estrellas, récords, álbum y compras; los
 *    objetos de categorías retiradas se devuelven en monedas.
 */

import { SHOP_ITEMS, ALL_ITEMS, itemById, paletteOf, type ShopItem } from '../data/shop';

export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
}

/** Cosméticos equipados. Cada valor es el id de un item del catálogo. */
export interface Customization {
  facade: string;       // color de la fachada del edificio
  wallpaper: string;    // papel tapiz (textura de las paredes)
  elevator: string;     // aspecto del ascensor
  accessory: string;    // uniforme/accesorio del recepcionista (Rese)
  monsterAcc: string;   // accesorio de los monstruos ('ninguno' | dm_*)
  decor: string;        // decoración del hotel ('ninguno' | dd_*)
  celebration: string;  // celebración de victoria ('normal' | 'd_celebracion')
  theme: string;        // temática completa ('clasico' | t_*)
  night: boolean;       // modo noche (ajuste gratuito para todos)
}

/** Métricas agregadas de balance económico. Locales, anónimas, sin red. */
export interface Metrics {
  sessionsStarted: number;      // partidas de nivel iniciadas
  levelsCompleted: number;      // victorias (incluye repeticiones)
  levelReplays: number;         // niveles ya completados que se vuelven a jugar
  timeouts: number;             // niveles perdidos por tiempo
  mistakes: number;             // pisos equivocados acumulados
  coinsEarned: number;          // monedas ganadas (todas las fuentes)
  coinsSpent: number;           // monedas gastadas en la tienda
  itemsBought: number;          // compras con monedas
  itemsByCategory: Record<string, number>; // categoría -> compras
  packsUnlocked: number;        // packs de contenido desbloqueados (demo o tienda)
  challengeAttempts: number;    // partidas en Modo Desafío
  challengeCleared: number;     // niveles superados en Modo Desafío
  missionsClaimed: number;      // misiones cobradas
  quitsMidLevel: number;        // salidas a mitad de nivel (posible frustración)
  adultGateOpens: number;       // aperturas de la sección para adultos
  adultGatePasses: number;      // barreras parentales superadas
  demoUnlocks: number;          // packs desbloqueados en modo demo (sin cobro)
}

export interface SaveData {
  version: number;
  unlockedLevel: number;                 // último nivel desbloqueado (1..TOTAL)
  stars: Record<number, number>;         // nivel -> mejor puntuación (1..3)
  coins: number;
  monstersUnlocked: string[];            // ids de monstruos descubiertos
  custom: Customization;
  owned: Record<string, boolean>;        // itemId -> comprado con monedas
  paid: Record<string, boolean>;         // packId -> contenido de pago desbloqueado
  completed: Record<number, boolean>;    // nivel -> primera victoria ya pagada
  perfectLevels: Record<number, boolean>;// nivel -> resuelto en ruta óptima (pagado 1 vez)
  bestDistance: Record<number, number>;  // nivel -> mejor distancia personal
  challengeCleared: Record<number, boolean>; // nivel -> superado en Modo Desafío
  progress: Record<string, number>;      // contadores de misiones
  claimed: Record<string, number>;       // misión -> timestamp del cobro
  metrics: Metrics;
  settings: Settings;
  seenTutorials: string[];               // reglas especiales ya explicadas
  migration?: { fromVersion: number; refund: number; premiumConverted: boolean };
}

/** Se conserva la misma clave para migrar en el sitio sin perder datos. */
export const KEY = 'piso-equivocado-save-v1';
export const SAVE_VERSION = 3;

export function defaultMetrics(): Metrics {
  return {
    sessionsStarted: 0, levelsCompleted: 0, levelReplays: 0, timeouts: 0, mistakes: 0,
    coinsEarned: 0, coinsSpent: 0, itemsBought: 0, itemsByCategory: {}, packsUnlocked: 0,
    challengeAttempts: 0, challengeCleared: 0, missionsClaimed: 0, quitsMidLevel: 0,
    adultGateOpens: 0, adultGatePasses: 0, demoUnlocks: 0,
  };
}

export function defaultCustom(): Customization {
  return {
    facade: 'f_crema', wallpaper: 'w_liso', elevator: 'e_naranja', accessory: 'a_azul',
    monsterAcc: 'ninguno', decor: 'ninguno', celebration: 'normal', theme: 'clasico', night: false,
  };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    unlockedLevel: 1,
    stars: {},
    coins: 0,
    monstersUnlocked: ['bubu', 'chispa'],
    custom: defaultCustom(),
    owned: {},
    paid: {},
    completed: {},
    perfectLevels: {},
    bestDistance: {},
    challengeCleared: {},
    progress: {},
    claimed: {},
    metrics: defaultMetrics(),
    settings: { sound: true, music: true, vibration: true },
    seenTutorials: [],
  };
}

// ── Migración desde la economía V2 ─────────────────────────────────────────
/** Objeto antiguo -> item del catálogo nuevo (conserva la compra). */
export const LEGACY_ITEM_MAP: Record<string, string> = {
  wallpaper_crema: 'f_crema',
  wallpaper_menta: 'f_menta',
  wallpaper_rosa: 'f_rosa',
  wallpaper_noche: 'f_noche',
  elevator_naranja: 'e_naranja',
  elevator_dorado: 'e_dorado',
  door_cristal: 'e_cristal',
  door_dorado: 'e_dorado',
  rese_azul: 'a_azul',
  rese_rojo: 'a_rojo',
  rese_verde: 'a_verde',
  rese_morado: 'a_morado',
};

/**
 * Categorías retiradas en V3 (alfombra y puertas se fusionaron con fachada/ascensor,
 * el modo noche ahora es gratuito). Lo ya pagado se DEVUELVE en monedas.
 */
export const LEGACY_REFUND: Record<string, number> = {
  carpet_verde: 30, carpet_dorada: 50, carpet_violeta: 50,
  door_plateado: 30, door_madera: 50,
  elevator_rosa: 40, elevator_menta: 40,
  night_noche: 80,
};

const LEGACY_CUSTOM_TO_ITEM: Record<string, string> = {
  crema: 'f_crema', menta: 'f_menta', rosa: 'f_rosa', noche: 'f_noche',
  azul: 'a_azul', rojo: 'a_rojo', verde: 'a_verde', morado: 'a_morado',
  naranja: 'e_naranja', dorado: 'e_dorado', cristal: 'e_cristal',
};

type Raw = Record<string, unknown> & { version?: number };

/** Convierte un guardado V1/V2 en V3 sin perder monedas ni compras. */
export function migrateSave(parsed: Raw): SaveData {
  const base = defaultSave();
  const fromVersion = typeof parsed.version === 'number' ? parsed.version : 1;
  const ownedIn = (parsed.owned ?? {}) as Record<string, boolean>;
  const customIn = (parsed.custom ?? {}) as Record<string, string>;
  const stars = (parsed.stars ?? {}) as Record<number, number>;

  const save: SaveData = {
    ...base,
    version: SAVE_VERSION,
    unlockedLevel: typeof parsed.unlockedLevel === 'number' ? parsed.unlockedLevel : 1,
    stars: { ...stars },
    coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? Math.floor(parsed.coins) : 0,
    monstersUnlocked: Array.isArray(parsed.monstersUnlocked) ? [...parsed.monstersUnlocked] : base.monstersUnlocked,
    settings: { ...base.settings, ...((parsed.settings ?? {}) as Settings) },
    seenTutorials: Array.isArray(parsed.seenTutorials) ? [...parsed.seenTutorials] : [],
    bestDistance: { ...(parsed.bestDistance as Record<number, number> ?? {}) },
    custom: { ...base.custom },
  };

  // Compras antiguas -> items nuevos equivalentes.
  let refund = 0;
  for (const legacyKey of Object.keys(ownedIn)) {
    if (!ownedIn[legacyKey]) continue;
    const mapped = LEGACY_ITEM_MAP[legacyKey];
    if (mapped) save.owned[mapped] = true;
    refund += LEGACY_REFUND[legacyKey] ?? 0;
  }
  save.coins += refund;

  // Cosméticos equipados antiguamente -> nuevos ids (si el item existe).
  const eq = (slot: keyof Customization, legacyValue: unknown, fallback: string) => {
    if (typeof legacyValue !== 'string') return;
    const direct = itemById(legacyValue);
    if (direct && direct.slot === slot) { (save.custom[slot] as string) = legacyValue; return; }
    const mapped = LEGACY_CUSTOM_TO_ITEM[legacyValue];
    if (mapped && itemById(mapped)?.slot === slot) (save.custom[slot] as string) = mapped;
    else (save.custom[slot] as string) = fallback;
  };
  eq('facade', customIn.wallpaper ?? customIn.facade, 'f_crema');
  eq('elevator', customIn.elevator, 'e_naranja');
  eq('accessory', customIn.rese ?? customIn.accessory, 'a_azul');
  save.custom.wallpaper = 'w_liso';
  save.custom.night = customIn.night === 'noche';

  // Lo que el jugador tenía EQUIPADO también era suyo: se conserva como propiedad
  // aunque el guardado antiguo no lo listara en `owned` (evita perder contenido).
  for (const slot of ['facade', 'elevator', 'accessory'] as const) {
    const equippedId = save.custom[slot] as string;
    const it = itemById(equippedId);
    if (it && it.source === 'coins' && it.price > 0) save.owned[equippedId] = true;
  }

  // La suscripción premium mensual desaparece: quien la tuviera activa recibe el
  // Pack Deluxe como agradecimiento (contenido real, sin coste adicional).
  const premiumUntil = typeof parsed.premiumUntil === 'number' ? parsed.premiumUntil : 0;
  const premiumConverted = premiumUntil > Date.now();
  if (premiumConverted) {
    save.paid.deluxe = true;
    for (const it of ALL_ITEMS) {
      if (it.packId === 'deluxe') save.owned[it.id] = true;
    }
  }

  // Primera victoria y niveles completados se deducen de las estrellas ya logradas.
  for (const key of Object.keys(stars)) {
    const lvl = Number(key);
    if (stars[lvl] > 0) save.completed[lvl] = true;
  }
  save.progress = {
    levelsDone: Object.keys(save.completed).length,
    threeStars: Object.values(stars).filter((s) => s >= 3).length,
    album: save.monstersUnlocked.length,
  };
  save.metrics = { ...defaultMetrics(), levelsCompleted: Object.keys(save.completed).length };
  save.migration = { fromVersion, refund, premiumConverted };
  return save;
}

function num(v: unknown, dflt: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : dflt;
}

function record(v: unknown): Record<string, number> {
  return typeof v === 'object' && v !== null ? (v as Record<string, number>) : {};
}

function boolRecord(v: unknown): Record<string, boolean> {
  return typeof v === 'object' && v !== null ? (v as Record<string, boolean>) : {};
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Raw;
    if (num(parsed.version, 1) < SAVE_VERSION) return migrateSave(parsed);

    const base = defaultSave();
    const custom = { ...base.custom, ...((parsed.custom ?? {}) as Partial<Customization>) };
    const stars = record(parsed.stars);
    const save: SaveData = {
      ...base,
      version: SAVE_VERSION,
      unlockedLevel: num(parsed.unlockedLevel, 1),
      stars,
      coins: Math.max(0, Math.floor(num(parsed.coins, 0))),
      monstersUnlocked: Array.isArray(parsed.monstersUnlocked)
        ? (parsed.monstersUnlocked as string[])
        : base.monstersUnlocked,
      custom: { ...custom, night: custom.night === true },
      owned: boolRecord(parsed.owned),
      paid: boolRecord(parsed.paid),
      completed: boolRecord(parsed.completed) as unknown as Record<number, boolean>,
      perfectLevels: boolRecord(parsed.perfectLevels) as unknown as Record<number, boolean>,
      bestDistance: record(parsed.bestDistance),
      challengeCleared: boolRecord(parsed.challengeCleared) as unknown as Record<number, boolean>,
      progress: record(parsed.progress),
      claimed: record(parsed.claimed),
      metrics: { ...base.metrics, ...((parsed.metrics ?? {}) as Partial<Metrics>) },
      settings: { ...base.settings, ...((parsed.settings ?? {}) as Settings) },
      seenTutorials: Array.isArray(parsed.seenTutorials) ? (parsed.seenTutorials as string[]) : [],
    };
    if (parsed.migration && typeof parsed.migration === 'object') {
      save.migration = parsed.migration as SaveData['migration'];
    }
    return save;
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Sin espacio o modo privado: el juego sigue funcionando en memoria.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

// ── Helpers de cosméticos ──────────────────────────────────────────────────

/** ¿El jugador posee este item? Gratis (precio 0 y de monedas) = siempre sí. */
export function ownsItem(save: SaveData, id: string): boolean {
  const item = itemById(id);
  if (!item) return false;
  if (item.source === 'coins' && item.price === 0) return true;
  if (save.owned[id]) return true;
  // Un paquete comprado entrega todos sus contenidos.
  if (item.packId && save.paid[item.packId]) return true;
  const pack = SHOP_ITEMS.find((p) => p.cat === 'pack' && p.includes?.includes(id));
  if (pack && save.owned[pack.id]) return true;
  return false;
}

/** ¿Está equipado este item? */
export function isEquipped(save: SaveData, id: string): boolean {
  const item = itemById(id);
  if (!item || item.slot === 'pack') return false;
  if (item.slot === 'celebration') {
    return id === 'd_celebracion' ? save.custom.celebration === 'd_celebracion' : save.custom.celebration === 'normal';
  }
  return save.custom[item.slot] === id;
}

/** Color principal del cosmético equipado en un slot (para dibujar). */
export function equippedItem(save: SaveData, slot: keyof Customization): ShopItem | undefined {
  const id = save.custom[slot];
  return typeof id === 'string' ? itemById(id) : undefined;
}

/** Paleta de la temática equipada. */
export function themePalette(save: SaveData) {
  return paletteOf(save.custom.theme);
}

/** Utilidad de formato para contadores y cronómetros. */
export function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

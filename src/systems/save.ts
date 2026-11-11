/**
 * Guardado local — ¡Piso Equivocado!
 * Persiste progreso en localStorage con formato versionado.
 * No se guarda ninguna información personal.
 */

export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
}

export interface Customization {
  wallpaper: string;  // id de opción de papel de pared
  carpet: string;     // id de opción de alfombra
  door: string;       // id de opción de puertas del ascensor
  rese: string;       // id de skin del recepcionista
  elevator: string;   // id de skin del ascensor
  night: string;      // 'dia' | 'noche'
}

export interface SaveData {
  version: number;
  unlockedLevel: number;              // último nivel desbloqueado (1..TOTAL)
  stars: Record<number, number>;      // nivel -> mejor puntuación (1..3)
  coins: number;
  monstersUnlocked: string[];         // ids de monstruos descubiertos
  custom: Customization;
  owned: Record<string, boolean>;     // "categoria_id" -> comprado
  settings: Settings;
  seenTutorials: string[];            // reglas especiales ya explicadas
  hearts: number;                     // corazones globales 0..3 (niveles con vidas)
  heartsRefillAt: number;             // ms epoch: con 0 corazones, cuándo se recargan solos
  premiumUntil: number;               // ms epoch: vidas infinitas sin anuncios; 0 = sin premium
  adsWatched: number;                 // anuncios de recompensa vistos (estadística)
  bestDistance: Record<number, number>; // nivel -> mejor distancia personal
}

const KEY = 'piso-equivocado-save-v1';
export const SAVE_VERSION = 1;

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    unlockedLevel: 1,
    stars: {},
    coins: 0,
    monstersUnlocked: ['bubu', 'chispa'],
    custom: { wallpaper: 'crema', carpet: 'roja', door: 'dorado', rese: 'azul', elevator: 'naranja', night: 'dia' },
    owned: {},
    settings: { sound: true, music: true, vibration: true },
    seenTutorials: [],
    hearts: 3,
    heartsRefillAt: 0,
    premiumUntil: 0,
    adsWatched: 0,
    bestDistance: {},
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = defaultSave();
    // Fusión defensiva: si falta algo (versión antigua), se usa el valor por defecto.
    const merged: SaveData = {
      ...base,
      ...parsed,
      custom: { ...base.custom, ...(parsed.custom ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      stars: parsed.stars ?? {},
      monstersUnlocked: parsed.monstersUnlocked ?? base.monstersUnlocked,
      seenTutorials: parsed.seenTutorials ?? [],
      hearts: typeof parsed.hearts === 'number' && parsed.hearts >= 0 && parsed.hearts <= 3 ? parsed.hearts : 3,
      heartsRefillAt: typeof parsed.heartsRefillAt === 'number' ? parsed.heartsRefillAt : 0,
      premiumUntil: typeof parsed.premiumUntil === 'number' ? parsed.premiumUntil : 0,
      adsWatched: typeof parsed.adsWatched === 'number' ? parsed.adsWatched : 0,
      bestDistance: typeof parsed.bestDistance === 'object' && parsed.bestDistance !== null ? parsed.bestDistance : {},
      version: SAVE_VERSION,
    };
    // Validación extra: si algún dato viene corrupto, se corrige.
    if (typeof merged.coins !== 'number' || !Number.isFinite(merged.coins) || merged.coins < 0) merged.coins = 0;
    if (typeof merged.unlockedLevel !== 'number' || merged.unlockedLevel < 1 || merged.unlockedLevel > 30) merged.unlockedLevel = 1;
    if (!Array.isArray(merged.monstersUnlocked)) merged.monstersUnlocked = base.monstersUnlocked;
    if (!Array.isArray(merged.seenTutorials)) merged.seenTutorials = [];
    if (typeof merged.stars !== 'object' || merged.stars === null) merged.stars = {};
    return merged;
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno o no disponible: el juego sigue funcionando sin guardar.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sin efecto */
  }
}

/** Opciones de personalización disponibles (nombre, color, precio). */
export interface CustomOption {
  id: string;
  name: string;
  color: number;
  price: number; // 0 = gratis / por defecto
}

export const CUSTOM_OPTIONS: Record<keyof Customization, CustomOption[]> = {
  wallpaper: [
    { id: 'crema', name: 'Crema vainilla', color: 0xf5e6c8, price: 0 },
    { id: 'menta', name: 'Menta fresca', color: 0xb8e6c9, price: 30 },
    { id: 'rosa', name: 'Rosa chicle', color: 0xfbcfe8, price: 30 },
    { id: 'noche', name: 'Azul noche', color: 0x3b4a7a, price: 50 },
  ],
  carpet: [
    { id: 'roja', name: 'Roja clásica', color: 0xb91c1c, price: 0 },
    { id: 'verde', name: 'Verde esmeralda', color: 0x15803d, price: 30 },
    { id: 'dorada', name: 'Dorado real', color: 0xd97706, price: 50 },
    { id: 'violeta', name: 'Violeta mágica', color: 0x7c3aed, price: 50 },
  ],
  door: [
    { id: 'dorado', name: 'Dorado', color: 0xf59e0b, price: 0 },
    { id: 'plateado', name: 'Plateado', color: 0xcbd5e1, price: 30 },
    { id: 'madera', name: 'Madera noble', color: 0x92400e, price: 50 },
    { id: 'cristal', name: 'Cristal azul', color: 0x38bdf8, price: 50 },
  ],
  rese: [
    { id: 'azul', name: 'Azul clásico', color: 0x3b82f6, price: 0 },
    { id: 'rojo', name: 'Rojo elegante', color: 0xef4444, price: 40 },
    { id: 'verde', name: 'Verde esmeralda', color: 0x10b981, price: 40 },
    { id: 'morado', name: 'Morado real', color: 0x8b5cf6, price: 60 },
  ],
  elevator: [
    { id: 'naranja', name: 'Naranja', color: 0xffa94d, price: 0 },
    { id: 'rosa', name: 'Rosa chicle', color: 0xf472b6, price: 40 },
    { id: 'menta', name: 'Menta fresca', color: 0x5cc9b8, price: 40 },
    { id: 'dorado', name: 'Dorado real', color: 0xf59e0b, price: 60 },
  ],
  night: [
    { id: 'dia', name: 'Modo día', color: 0xaee3f5, price: 0 },
    { id: 'noche', name: 'Modo noche', color: 0x1e293b, price: 80 },
  ],
};

export function getCustomOption(category: keyof Customization, id: string): CustomOption {
  const list = CUSTOM_OPTIONS[category];
  return list.find((o) => o.id === id) ?? list[0];
}


// ── Economía de corazones (vidas) ──────────────────────────────────────────
export const REFILL_MS = 25 * 60 * 1000;   // 25 minutos para recuperar los 3 corazones
export const PREMIUM_MS = 30 * 24 * 60 * 60 * 1000; // 1 mes de vidas infinitas

export function isPremium(save: SaveData, now: number = Date.now()): boolean {
  return save.premiumUntil > now;
}

/** Si pasó el tiempo de espera, recarga los 3 corazones. */
export function tickHearts(save: SaveData, now: number = Date.now()): SaveData {
  if (!isPremium(save, now) && save.hearts <= 0 && save.heartsRefillAt > 0 && now >= save.heartsRefillAt) {
    save.hearts = 3;
    save.heartsRefillAt = 0;
  }
  return save;
}

/** Gasta un corazón global. Devuelve los corazones restantes. */
export function spendHeart(save: SaveData, now: number = Date.now()): number {
  if (isPremium(save, now)) return 3;
  tickHearts(save, now);
  save.hearts = Math.max(0, save.hearts - 1);
  if (save.hearts === 0) save.heartsRefillAt = now + REFILL_MS;
  return save.hearts;
}

/** Recarga inmediata (por anuncio de recompensa). */
export function refillHearts(save: SaveData): void {
  save.hearts = 3;
  save.heartsRefillAt = 0;
}

export function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

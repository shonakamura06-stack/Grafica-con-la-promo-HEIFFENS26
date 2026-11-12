/**
 * PERSONALIDAD DE LOS 20 MONSTRUOS — ¡Piso Equivocado!
 *
 * Un solo sitio donde vive "cómo es" cada personaje fuera de sus frases
 * (`data/voices.ts`): cómo espera, cómo parpadea, cómo entra y sale del
 * ascensor, qué sonido hace y qué manías visuales tiene.
 *
 * Todo son DATOS y funciones puras (sin Phaser): se puede probar en Node y el
 * motor solo tiene que aplicarlos. `systems/animator.ts` los convierte en
 * movimiento y `scenes/GameScene.ts` en tweens.
 *
 * Principio de rendimiento: cada monstruo tiene UN estilo de reposo (no varios a
 * la vez), con fase y velocidad propias para que la cola no se mueva en bloque,
 * y los eventos caros (sonido propio, reacción con otro personaje) llevan
 * enfriamiento y un límite global.
 */

import { MONSTERS, MONSTER_MAP, SpecialRule } from '../data/monsters';

/** Estilo de animación de reposo (mientras espera en la cola o viaja). */
export type IdleStyle =
  | 'breathe'  // sube y baja muy suave: respiración
  | 'hop'      // saltitos cortos
  | 'sway'     // balanceo lateral
  | 'float'    // flota despegado del suelo
  | 'tremble'  // tiembla (miedoso)
  | 'peek'     // se asoma y se encoge (tímido)
  | 'mirror'   // imita al vecino con un retardo (gemelos)
  | 'doze'     // cabecea y se endereza (sonámbulo)
  | 'drift'    // deriva lento de lado a lado (fantasma)
  | 'march'    // marca el paso (carga peso)
  | 'pose'     // se recoloca presumido
  | 'wobble'   // gelatina: se aplasta y rebota
  | 'spark'    // vibración rápida y nerviosa
  | 'purr'     // ronroneo: ondulación mínima
  | 'bubble'   // burbujeo: sube y baja a tirones suaves
  | 'listen'   // gira la cabeza como si oyera algo
  | 'cape'     // aletea la capa
  | 'eye'      // ladea el cuerpo para mirar con su ojo único
  | 'grump'    // apenas se mueve, respira hondo y bufa
  | 'love';    // suspiro: se hincha y se deshace

/** Animación puntual al entrar o salir del ascensor. */
export type MotionStyle =
  | 'hop'      // salto con squash
  | 'slide'    // entra deslizándose
  | 'float'    // sube flotando
  | 'stomp'    // pisotón: entra pesado y hace temblar
  | 'squeeze'  // se aprieta para caber
  | 'glide'    // atraviesa la puerta sin frenar
  | 'waddle'   // sale contoneándose
  | 'spin'     // gira de alegría
  | 'march'    // sale marcando el paso, con el peso encima
  | 'dash';    // sale disparado

/** Manía visual que puede dispararse sola (nunca altera la lógica del puzle). */
export type Quirk =
  | 'hearts'    // corazones al mirar a su pareja
  | 'glare'     // rayo de enfado al ver a su enemigo
  | 'hide'      // se esconde cuando alguien se acerca
  | 'mirror'    // imita el movimiento del vecino
  | 'stomp'     // hace vibrar el suelo al caminar
  | 'phase'     // atraviesa visualmente a otro monstruo
  | 'snore'     // suelta una "z" dormido
  | 'tremble'   // tiembla si la cabina se llena
  | 'photo'     // dispara la cámara
  | 'bubbles'   // suelta burbujas
  | 'ears'      // mueve las orejas
  | 'stretch'   // se estira tras el viaje
  | 'fan'       // se abanica
  | 'hug';      // se abraza a su dúo

/** Claves de sonido propio (métodos de systems/audio.ts). */
export type SfxKey =
  | 'thud' | 'whoosh' | 'snore' | 'twinBlip' | 'whisper' | 'sparkle'
  | 'slime' | 'bubblePop' | 'purr' | 'cape' | 'earTwitch' | 'camera'
  | 'cling' | 'heartSfx' | 'grumble' | 'tremble' | 'eyeSpin' | 'pose';

export interface Personality {
  id: string;
  /** Cómo espera: rasgo reconocible SIN leer su nombre (para docs y álbum). */
  trait: string;
  idle: IdleStyle;
  /** Amplitud del reposo en píxeles (o su equivalente angular). */
  amp: number;
  /** Ciclos por segundo del reposo. */
  speed: number;
  /** Segundos entre parpadeos: [mínimo, máximo]. */
  blink: [number, number];
  /** Segundos entre miradas a los lados: [mínimo, máximo]. */
  gaze: [number, number];
  /** Sonido característico y cada cuánto puede sonar como mínimo. */
  sfx?: SfxKey;
  sfxEvery?: number;
  board: MotionStyle;
  exit: MotionStyle;
  quirks: Quirk[];
}

/**
 * Los 20. El orden no importa: se indexa por id.
 * `trait` es lo que el jugador debe poder reconocer sin leer el nombre.
 */
export const PERSONALITIES: Record<string, Personality> = {
  // ── Los cinco prioritarios: reposo, entrada, salida y manía propios ───────
  sombrin: {
    id: 'sombrin', trait: 'Se encoge y mira al suelo; retrocede si alguien se acerca.',
    idle: 'peek', amp: 3, speed: 0.55, blink: [1.6, 3.4], gaze: [2.4, 5],
    sfx: 'whisper', sfxEvery: 14, board: 'squeeze', exit: 'slide',
    quirks: ['hide'],
  },
  gordito: {
    id: 'gordito', trait: 'Ocupa dos sitios y hace vibrar el suelo al entrar.',
    idle: 'breathe', amp: 3.4, speed: 0.42, blink: [2.4, 5.5], gaze: [4, 9],
    sfx: 'thud', sfxEvery: 12, board: 'stomp', exit: 'waddle',
    quirks: ['stomp', 'stretch'],
  },
  gemelos: {
    id: 'gemelos', trait: 'Dos cabezas que se imitan con medio segundo de retardo.',
    idle: 'mirror', amp: 4, speed: 1.05, blink: [1.4, 3], gaze: [1.8, 4],
    sfx: 'twinBlip', sfxEvery: 10, board: 'hop', exit: 'spin',
    quirks: ['mirror'],
  },
  nocti: {
    id: 'nocti', trait: 'Cabecea dormido y suelta una "z" cada pocos segundos.',
    idle: 'doze', amp: 5, speed: 0.34, blink: [0.9, 2.2], gaze: [6, 14],
    sfx: 'snore', sfxEvery: 9, board: 'float', exit: 'hop',
    quirks: ['snore'],
  },
  fantasmita: {
    id: 'fantasmita', trait: 'Flota, se desdibuja y atraviesa a quien se cruza.',
    idle: 'drift', amp: 6, speed: 0.5, blink: [3, 7], gaze: [2, 5],
    sfx: 'whoosh', sfxEvery: 11, board: 'glide', exit: 'glide',
    quirks: ['phase'],
  },

  // ── Los otros 15: un rasgo claro cada uno ─────────────────────────────────
  bubu: {
    id: 'bubu', trait: 'Ladea el cuerpo para mirar con su único ojo.',
    idle: 'eye', amp: 3.2, speed: 0.8, blink: [1.8, 4], gaze: [1.6, 3.6],
    sfx: 'eyeSpin', sfxEvery: 16, board: 'hop', exit: 'waddle', quirks: ['ears'],
  },
  chispa: {
    id: 'chispa', trait: 'No para quieta: vibra y salta sin que nadie la toque.',
    idle: 'spark', amp: 2.6, speed: 2.6, blink: [1.2, 2.6], gaze: [1.2, 3],
    sfx: 'sparkle', sfxEvery: 9, board: 'dash', exit: 'dash', quirks: [],
  },
  moco: {
    id: 'moco', trait: 'Gelatina: se aplasta y rebota, dejando brillitos.',
    idle: 'wobble', amp: 4.5, speed: 0.9, blink: [2.6, 6], gaze: [4, 10],
    sfx: 'slime', sfxEvery: 13, board: 'squeeze', exit: 'waddle', quirks: ['bubbles'],
  },
  nube: {
    id: 'nube', trait: 'Flota un dedo del suelo y ronronea muy despacio.',
    idle: 'purr', amp: 2.2, speed: 0.62, blink: [3.4, 7], gaze: [5, 12],
    sfx: 'purr', sfxEvery: 15, board: 'float', exit: 'float', quirks: [],
  },
  draculin: {
    id: 'draculin', trait: 'Aletea la capa y se esconde un instante al parpadear.',
    idle: 'cape', amp: 3.6, speed: 0.85, blink: [2.2, 5], gaze: [3, 7],
    sfx: 'cape', sfxEvery: 14, board: 'glide', exit: 'spin', quirks: ['phase'],
  },
  rufi: {
    id: 'rufi', trait: 'Gira la cabeza a izquierda y derecha: siempre oye algo.',
    idle: 'listen', amp: 4.2, speed: 0.72, blink: [2, 4.6], gaze: [1.4, 3.2],
    sfx: 'earTwitch', sfxEvery: 12, board: 'hop', exit: 'hop', quirks: ['ears'],
  },
  glup: {
    id: 'glup', trait: 'Burbujea: sube y baja a tirones y suelta pompas.',
    idle: 'bubble', amp: 3.8, speed: 1.15, blink: [2.4, 5.2], gaze: [3, 8],
    sfx: 'bubblePop', sfxEvery: 11, board: 'hop', exit: 'hop', quirks: ['bubbles'],
  },
  turista: {
    id: 'turista', trait: 'Se recoloca el sombrero y dispara la cámara de vez en cuando.',
    idle: 'pose', amp: 2.8, speed: 0.66, blink: [2, 4.4], gaze: [2, 5],
    sfx: 'camera', sfxEvery: 13, board: 'hop', exit: 'waddle', quirks: ['photo'],
  },
  vip: {
    id: 'vip', trait: 'De pie, quieto y altivo; solo se abanica con desprecio.',
    idle: 'pose', amp: 1.8, speed: 0.4, blink: [3, 6.4], gaze: [6, 14],
    sfx: 'pose', sfxEvery: 18, board: 'slide', exit: 'waddle', quirks: ['fan'],
  },
  maletero: {
    id: 'maletero', trait: 'Marca el paso bajo el peso y suelta un chasquido metálico.',
    idle: 'march', amp: 3, speed: 1.1, blink: [2.6, 5.6], gaze: [4, 10],
    sfx: 'cling', sfxEvery: 12, board: 'stomp', exit: 'march', quirks: ['stomp', 'stretch'],
  },
  enamorado: {
    id: 'enamorado', trait: 'Suspira hinchándose y suelta corazones al ver a su pareja.',
    idle: 'love', amp: 3.2, speed: 0.58, blink: [2.2, 4.8], gaze: [2, 5],
    sfx: 'heartSfx', sfxEvery: 14, board: 'hop', exit: 'spin', quirks: ['hearts', 'hug'],
  },
  grunon: {
    id: 'grunon', trait: 'Casi no se mueve; respira hondo y bufa mirando a su enemigo.',
    idle: 'grump', amp: 1.6, speed: 0.38, blink: [4, 8], gaze: [5, 12],
    sfx: 'grumble', sfxEvery: 15, board: 'stomp', exit: 'march', quirks: ['glare'],
  },
  pegajin: {
    id: 'pegajin', trait: 'Se estira hacia Pegajón y vuelve pegajoso a su sitio.',
    idle: 'wobble', amp: 4.2, speed: 1.0, blink: [2, 4.4], gaze: [2.4, 6],
    sfx: 'slime', sfxEvery: 12, board: 'squeeze', exit: 'hop', quirks: ['mirror', 'hug'],
  },
  pegajon: {
    id: 'pegajon', trait: 'Onda lenta: sigue a Pegajín con un compás de retraso.',
    idle: 'wobble', amp: 3.6, speed: 0.82, blink: [2.4, 5], gaze: [3, 7],
    sfx: 'slime', sfxEvery: 13, board: 'squeeze', exit: 'hop', quirks: ['hug'],
  },
  temblorin: {
    id: 'temblorin', trait: 'Tiembla más cuanto más llena está la cabina.',
    idle: 'tremble', amp: 1.8, speed: 3.1, blink: [1.2, 2.8], gaze: [1.4, 3.4],
    sfx: 'tremble', sfxEvery: 10, board: 'squeeze', exit: 'dash', quirks: ['tremble', 'hide'],
  },
};

/** Personalidad por defecto para un id desconocido (nunca rompe el juego). */
export const DEFAULT_PERSONALITY: Personality = {
  id: 'none', trait: 'Respira tranquilo y mira de vez en cuando.',
  idle: 'breathe', amp: 3, speed: 0.7, blink: [2, 5], gaze: [3, 8],
  board: 'hop', exit: 'hop', quirks: [],
};

export function personalityOf(monsterId: string): Personality {
  return PERSONALITIES[monsterId] ?? DEFAULT_PERSONALITY;
}

/** Fase inicial del reposo: distinta por pasajero para que no se muevan en bloque. */
export function idlePhase(passengerIndex: number, monsterId: string): number {
  let h = 2166136261;
  const s = `${passengerIndex}:${monsterId}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 6283) / 1000;      // 0..2π en radianes, determinista
}

/** Retardo (s) con el que el gemelo/dúo imita a su compañero. */
export const MIRROR_DELAY = 0.42;

/** Límites globales de rendimiento para las reacciones entre personajes. */
export const FX_LIMITS = {
  /** Reacciones entre personajes como máximo cada estos milisegundos. */
  interactionEveryMs: 2600,
  /** Enfriamiento por pareja concreta. */
  pairCooldownMs: 9000,
  /** Sonidos propios: como mucho uno cada estos milisegundos en toda la escena. */
  sfxEveryMs: 1400,
  /** Partículas vivas como máximo a la vez (corazones, burbujas, zzz). */
  maxLiveParticles: 24,
  /** Duración máxima de una partícula (ms). */
  particleLifeMs: 1100,
  /** Bocadillos simultáneos: 1 (los demás esperan su turno). */
  maxBubbles: 1,
};

/** Regla social → manía visual asociada (para las reacciones automáticas). */
export const QUIRK_BY_RULE: Partial<Record<SpecialRule, Quirk>> = {
  shy: 'hide',
  giant: 'stomp',
  twins: 'mirror',
  sleepwalker: 'snore',
  ghost: 'phase',
  luggage: 'stretch',
  duo: 'hug',
  fear: 'tremble',
};

/** Manía propia de un monstruo, teniendo en cuenta también su regla social. */
export function quirksOf(monsterId: string, rule: SpecialRule): Quirk[] {
  const propias = personalityOf(monsterId).quirks;
  const deRegla = QUIRK_BY_RULE[rule];
  if (!deRegla || propias.includes(deRegla)) return propias;
  return [...propias, deRegla];
}

/**
 * Variantes de cara que BootScene genera como textura aparte.
 *
 * Parpadeo: todos menos Nube (duerme con los ojos cerrados, no tiene qué cerrar)
 * y el Señor VIP (lleva gafas de sol: su expresión es la boca).
 * Mirada: solo los que tienen pupila móvil y salen mucho en pantalla. Cada variante
 * es una textura de 128×128, así que se generan las justas (30 en total, ~2 MB) y
 * NUNCA en caliente durante la partida.
 */
export const BLINK_IDS: string[] = MONSTERS.map((m) => m.id).filter((id) => id !== 'nube' && id !== 'vip');
export const GAZE_IDS: string[] = ['sombrin', 'gordito', 'gemelos', 'nocti', 'bubu', 'chispa'];

export function hasBlink(monsterId: string): boolean { return BLINK_IDS.includes(monsterId); }
export function hasGaze(monsterId: string): boolean { return GAZE_IDS.includes(monsterId); }

/** Claves de textura de la cara de un monstruo (las que existen de verdad). */
export function faceTexturesOf(monsterId: string): string[] {
  const claves = [`monster-${monsterId}`, `monster-${monsterId}-neutral`, `monster-${monsterId}-angry`];
  if (hasBlink(monsterId)) claves.push(`monster-${monsterId}-blink`);
  if (hasGaze(monsterId)) claves.push(`monster-${monsterId}-look-l`, `monster-${monsterId}-look-r`);
  return claves;
}

/** ¿Están los 20 monstruos con personalidad propia? (lo comprueba una prueba) */
export function missingPersonalities(): string[] {
  return MONSTERS.map((m) => m.id).filter((id) => !PERSONALITIES[id]);
}

/** Regla social declarada en monsters.ts (para no duplicarla aquí). */
export function ruleOf(monsterId: string): SpecialRule {
  return MONSTER_MAP[monsterId]?.rule ?? 'none';
}

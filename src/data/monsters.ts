/**
 * Datos de los monstruos — ¡Piso Equivocado! El Hotel de Monstruos.
 * Cada monstruo es original: nombre, personalidad, color, regla especial
 * (si la tiene), categoría de diálogo y condición de desbloqueo en el álbum.
 */

export type SpecialRule = 'none' | 'giant' | 'twins' | 'shy' | 'sleepwalker' | 'ghost' | 'luggage' | 'duo' | 'fear';

/** Categoría de personalidad: determina sus frases y reacciones. */
export type MonsterKind =
  | 'none'        // sin categoría especial
  | 'tourist'     // turista con cámara
  | 'vip'         // huésped VIP exigente
  | 'duo'         // mejores amigos: suben juntos
  | 'fear'        // miedoso: viaja con pocos
  | 'luggage'     // lleva maletas (ocupa 2 espacios)
  | 'couple'      // enamorado/a (viaja en pareja)
  | 'enemy'       // gruñón (no soporta a otro)
  | 'family';     // miembro de una familia

/** Ánimo del monstruo: feliz (normal), neutral (1er error) o enojado (2º+). */
export type Mood = 'happy' | 'neutral' | 'angry';

export interface MonsterDef {
  id: string;
  name: string;
  color: number;        // color principal (hex)
  colorDark: number;    // color oscuro para contornos/sombras
  personality: string;  // descripción para el álbum
  rule: SpecialRule;
  ruleText: string;     // explicación corta de la regla especial
  slots: number;        // espacios que ocupa en el ascensor
  unlockLevel: number;  // nivel en el que aparece por primera vez
  scale: number;        // escala visual del sprite
  kind: MonsterKind;    // categoría de diálogo y personalidad
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'bubu', name: 'Bubu', color: 0xa855f7, colorDark: 0x6b21a8,
    personality: 'Pequeño monstruo morado de un solo ojo. Curioso, juguetón y siempre con una sonrisa.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 1, scale: 1, kind: 'none',
  },
  {
    id: 'chispa', name: 'Chispa', color: 0xfacc15, colorDark: 0xca8a04,
    personality: 'Criatura amarilla llena de energía. No puede quedarse quieta ni un segundo.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 1, scale: 1, kind: 'none',
  },
  {
    id: 'moco', name: 'Moco', color: 0x4ade80, colorDark: 0x16a34a,
    personality: 'Monstruo verde gelatinoso. Se mueve como una gelatina y deja un rastro brillante.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 2, scale: 1, kind: 'none',
  },
  {
    id: 'nube', name: 'Nube', color: 0x60a5fa, colorDark: 0x2563eb,
    personality: 'Pequeño monstruo azul con forma de nube. Flota un poquito y ronronea como un gato.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 3, scale: 1, kind: 'none',
  },
  {
    id: 'draculin', name: 'Draculín', color: 0x8b5cf6, colorDark: 0x4c1d95,
    personality: 'Vampiro diminuto y simpático. Le encanta el hotel porque nadie le teme... casi nadie.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 4, scale: 0.92, kind: 'none',
  },
  {
    id: 'rufi', name: 'Rufi', color: 0xfb923c, colorDark: 0xc2410c,
    personality: 'Criatura peluda naranja con orejas enormes. Escucha cada ruido del hotel.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 5, scale: 1, kind: 'none',
  },
  {
    id: 'glup', name: 'Glup', color: 0x2dd4bf, colorDark: 0x0f766e,
    personality: 'Monstruo acuático que siempre lleva burbujas. Hace "glup glup" al hablar.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 7, scale: 1, kind: 'none',
  },
  {
    id: 'sombrin', name: 'Sombrín', color: 0x475569, colorDark: 0x1e293b,
    personality: 'Criatura oscura y adorable que tiene miedo de viajar en ascensor con otros monstruos.',
    rule: 'shy', ruleText: 'Sombrín es tímido: solo viaja SOLO en el ascensor.', slots: 1, unlockLevel: 9, scale: 1, kind: 'none',
  },
  {
    id: 'gordito', name: 'Gordito', color: 0xf472b6, colorDark: 0xbe185d,
    personality: 'Monstruo gigante y redondito. Es tan grande que ocupa dos espacios del ascensor.',
    rule: 'giant', ruleText: 'Gordito es gigante: ocupa 2 espacios del ascensor.', slots: 2, unlockLevel: 16, scale: 1.35, kind: 'none',
  },
  {
    id: 'gemelos', name: 'Tini y Toni', color: 0x2dd4bf, colorDark: 0x0d9488,
    personality: 'Los gemelos inseparables del hotel. Siempre suben juntos al ascensor, sin excepción.',
    rule: 'twins', ruleText: 'Los gemelos siempre suben JUNTOS al ascensor.', slots: 1, unlockLevel: 19, scale: 1, kind: 'family',
  },
  {
    id: 'nocti', name: 'Nocti', color: 0x818cf8, colorDark: 0x4338ca,
    personality: 'Monstruo búho sonámbulo. Se duerme en el ascensor y hay que despertarlo para que salga.',
    rule: 'sleepwalker', ruleText: 'Nocti se duerme en el ascensor: tócalo para despertarlo cuando llegue a su piso.', slots: 1, unlockLevel: 22, scale: 1, kind: 'none',
  },
  {
    id: 'fantasmita', name: 'Fantasmita', color: 0xe2e8f0, colorDark: 0x94a3b8,
    personality: 'Fantasma amigable que atraviesa paredes. No ocupa espacio: flota junto a los demás.',
    rule: 'ghost', ruleText: 'Fantasmita no ocupa espacio: puede subir aunque el ascensor esté lleno.', slots: 0, unlockLevel: 24, scale: 1, kind: 'none',
  },
  // ── Nuevos personajes con personalidad ──────────────────────────────────
  {
    id: 'turista', name: 'Turista', color: 0x38bdf8, colorDark: 0x0369a1,
    personality: 'Monstruo viajero con sombrero de sol y cámara. Quiere conocer cada rincón del hotel.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 11, scale: 1, kind: 'tourist',
  },
  {
    id: 'vip', name: 'Señor VIP', color: 0xf59e0b, colorDark: 0xb45309,
    personality: 'Huésped muy importante con gafas de sol y cadena de oro. Le gusta que todo sea perfecto.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 13, scale: 1, kind: 'vip',
  },
  {
    id: 'maletero', name: 'Maletero', color: 0xef4444, colorDark: 0x991b1b,
    personality: 'Monstruo fuerte que carga con muchas maletas. Ocupa dos espacios del ascensor.',
    rule: 'luggage', ruleText: 'El Maletero lleva muchas maletas: ocupa 2 espacios del ascensor.', slots: 2, unlockLevel: 20, scale: 1.1, kind: 'luggage',
  },
  {
    id: 'enamorado', name: 'Enamorado', color: 0xf472b6, colorDark: 0xbe185d,
    personality: 'Monstruo romántico que viaja con su pareja. Si los separas, se pone muy triste.',
    rule: 'none', ruleText: 'Las parejas enamoradas deben viajar JUNTAS. Separarlas cuesta una estrella.', slots: 1, unlockLevel: 12, scale: 1, kind: 'couple',
  },
  {
    id: 'grunon', name: 'Gruñón', color: 0x78716c, colorDark: 0x44403c,
    personality: 'Monstruo gruñón que no soporta a ciertos compañeros de viaje. No puede compartir ascensor con ellos.',
    rule: 'none', ruleText: 'Los gruñones no pueden viajar con su enemigo: no los subas juntos.', slots: 1, unlockLevel: 17, scale: 1, kind: 'enemy',
  },
  {
    id: 'pegajin', name: 'Pegajín', color: 0x4ade80, colorDark: 0x15803d,
    personality: 'Slime verde pegajoso, mejor amigo de Pegajón. Nunca sube al ascensor sin él.',
    rule: 'duo', ruleText: 'Pegajín y Pegajón suben SIEMPRE juntos, pero cada uno baja en su piso.', slots: 1, unlockLevel: 22, scale: 1, kind: 'duo',
  },
  {
    id: 'pegajon', name: 'Pegajón', color: 0xa78bfa, colorDark: 0x6d28d9,
    personality: 'Slime morado, la otra mitad del dúo inseparable.',
    rule: 'duo', ruleText: 'Pegajín y Pegajón suben SIEMPRE juntos, pero cada uno baja en su piso.', slots: 1, unlockLevel: 22, scale: 1, kind: 'duo',
  },
  {
    id: 'temblorin', name: 'Temblorín', color: 0x93c5fd, colorDark: 0x1d4ed8,
    personality: 'Monstruo miedoso que tiembla si la cabina se llena. Viaja con poca gente.',
    rule: 'fear', ruleText: 'Temblorín solo viaja si hay 2 monstruos o menos dentro de la cabina.', slots: 1, unlockLevel: 25, scale: 1, kind: 'fear',
  },
];

export const MONSTER_MAP: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m])
);

/** Grupo de gemelos: ambos pasajeros comparten este id de grupo. */
export const TWIN_GROUP = 'gemelos';

/** Colores caramelo por piso (banners, insignias, botones y barandillas). */
export const FLOOR_COLORS: Record<number, number> = {
  1: 0x5aa8e8, // azul
  2: 0xf87171, // rojo
  3: 0xfacc15, // amarillo
  4: 0x4ade80, // verde
  5: 0xfb923c, // naranja
  6: 0xc084fc, // morado
};

export function floorColor(f: number): number {
  return FLOOR_COLORS[f] ?? 0x9fe8d8;
}

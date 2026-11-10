/**
 * Datos de los monstruos — ¡Piso Equivocado! El Hotel de Monstruos.
 * Cada monstruo es original: nombre, personalidad, color, regla especial
 * (si la tiene) y condición de desbloqueo en el álbum.
 */

export type SpecialRule = 'none' | 'giant' | 'twins' | 'shy' | 'sleepwalker' | 'ghost';

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
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'bubu', name: 'Bubu', color: 0xa855f7, colorDark: 0x6b21a8,
    personality: 'Pequeño monstruo morado de un solo ojo. Curioso, juguetón y siempre con una sonrisa.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 1, scale: 1,
  },
  {
    id: 'chispa', name: 'Chispa', color: 0xfacc15, colorDark: 0xca8a04,
    personality: 'Criatura amarilla llena de energía. No puede quedarse quieta ni un segundo.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 1, scale: 1,
  },
  {
    id: 'moco', name: 'Moco', color: 0x4ade80, colorDark: 0x16a34a,
    personality: 'Monstruo verde gelatinoso. Se mueve como una gelatina y deja un rastro brillante.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 2, scale: 1,
  },
  {
    id: 'nube', name: 'Nube', color: 0x60a5fa, colorDark: 0x2563eb,
    personality: 'Pequeño monstruo azul con forma de nube. Flota un poquito y ronronea como un gato.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 3, scale: 1,
  },
  {
    id: 'draculin', name: 'Draculín', color: 0x8b5cf6, colorDark: 0x4c1d95,
    personality: 'Vampiro diminuto y simpático. Le encanta el hotel porque nadie le teme... casi nadie.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 4, scale: 0.92,
  },
  {
    id: 'rufi', name: 'Rufi', color: 0xfb923c, colorDark: 0xc2410c,
    personality: 'Criatura peluda naranja con orejas enormes. Escucha cada ruido del hotel.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 5, scale: 1,
  },
  {
    id: 'glup', name: 'Glup', color: 0x2dd4bf, colorDark: 0x0f766e,
    personality: 'Monstruo acuático que siempre lleva burbujas. Hace "glup glup" al hablar.',
    rule: 'none', ruleText: '', slots: 1, unlockLevel: 7, scale: 1,
  },
  {
    id: 'sombrin', name: 'Sombrín', color: 0x475569, colorDark: 0x1e293b,
    personality: 'Criatura oscura y adorable que tiene miedo de viajar en ascensor con otros monstruos.',
    rule: 'shy', ruleText: 'Sombrín es tímido: solo viaja SOLO en el ascensor.', slots: 1, unlockLevel: 9, scale: 1,
  },
  {
    id: 'gordito', name: 'Gordito', color: 0xf472b6, colorDark: 0xbe185d,
    personality: 'Monstruo gigante y redondito. Es tan grande que ocupa dos espacios del ascensor.',
    rule: 'giant', ruleText: 'Gordito es gigante: ocupa 2 espacios del ascensor.', slots: 2, unlockLevel: 16, scale: 1.35,
  },
  {
    id: 'gemelos', name: 'Tini y Toni', color: 0x2dd4bf, colorDark: 0x0d9488,
    personality: 'Los gemelos inseparables del hotel. Siempre suben juntos al ascensor, sin excepción.',
    rule: 'twins', ruleText: 'Los gemelos siempre suben JUNTOS al ascensor.', slots: 1, unlockLevel: 18, scale: 1,
  },
  {
    id: 'nocti', name: 'Nocti', color: 0x818cf8, colorDark: 0x4338ca,
    personality: 'Monstruo búho sonámbulo. Se duerme en el ascensor y hay que despertarlo para que salga.',
    rule: 'sleepwalker', ruleText: 'Nocti se duerme en el ascensor: tócalo para despertarlo cuando llegue a su piso.', slots: 1, unlockLevel: 22, scale: 1,
  },
  {
    id: 'fantasmita', name: 'Fantasmita', color: 0xe2e8f0, colorDark: 0x94a3b8,
    personality: 'Fantasma amigable que atraviesa paredes. No ocupa espacio: flota junto a los demás.',
    rule: 'ghost', ruleText: 'Fantasmita no ocupa espacio: puede subir aunque el ascensor esté lleno.', slots: 0, unlockLevel: 24, scale: 1,
  },
];

export const MONSTER_MAP: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m])
);

/** Grupo de gemelos: ambos pasajeros comparten este id de grupo. */
export const TWIN_GROUP = 'gemelos';

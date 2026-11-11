/**
 * Misiones y recompensas — Economía V3.
 *
 * Reglas de diseño:
 *  - Premian EXPLORAR las mecánicas, no conectarse a diario: ninguna misión exige
 *    entrar cada día y ninguna castiga la ausencia (no hay rachas ni temporizadores).
 *  - Cada misión se cobra UNA SOLA VEZ (save.claimed).
 *  - Recompensas dentro de las bandas acordadas: misiones especiales 10–30 monedas,
 *    hitos de progreso 50–100 monedas.
 */

export interface MissionDef {
  id: string;
  name: string;
  desc: string;
  /** Contador de save.progress que alimenta la misión. */
  counter: string;
  goal: number;
  reward: number;
  /** 'special' = 10–30 monedas · 'milestone' = hito de progreso 50–100 monedas. */
  kind: 'special' | 'milestone';
  icon: string;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'm_3star', name: 'Tres estrellas', desc: 'Consigue 3 estrellas en 3 niveles.',
    counter: 'threeStars', goal: 3, reward: 20, kind: 'special', icon: 'star',
  },
  {
    id: 'm_perfect', name: 'Ruta perfecta', desc: 'Resuelve 5 niveles con la ruta óptima exacta.',
    counter: 'perfects', goal: 5, reward: 30, kind: 'special', icon: 'sparkle',
  },
  {
    id: 'm_couples', name: 'Amor en el aire', desc: 'Entrega 10 parejas sin separarlas nunca.',
    counter: 'couples', goal: 10, reward: 20, kind: 'special', icon: 'heart',
  },
  {
    id: 'm_clean', name: 'Sin equivocaciones', desc: 'Completa 5 niveles sin ningún piso equivocado.',
    counter: 'cleanLevels', goal: 5, reward: 30, kind: 'special', icon: 'star',
  },
  {
    id: 'm_meet', name: 'Coleccionista', desc: 'Descubre 12 personajes en el álbum.',
    counter: 'album', goal: 12, reward: 20, kind: 'special', icon: 'sparkle',
  },
  {
    id: 'm_challenge', name: 'Valiente', desc: 'Supera 1 nivel en el Modo Desafío (opcional).',
    counter: 'challengeCleared', goal: 1, reward: 25, kind: 'special', icon: 'heart',
  },
  {
    id: 'h_cap1', name: 'Hito: Capítulo 1', desc: 'Completa los niveles 1 al 5.',
    counter: 'levelsDone', goal: 5, reward: 50, kind: 'milestone', icon: 'coin',
  },
  {
    id: 'h_cap2', name: 'Hito: Capítulo 2', desc: 'Completa los niveles 1 al 15.',
    counter: 'levelsDone', goal: 15, reward: 50, kind: 'milestone', icon: 'coin',
  },
  {
    id: 'h_album', name: 'Hito: Álbum completo', desc: 'Descubre los 20 monstruos del hotel.',
    counter: 'album', goal: 20, reward: 50, kind: 'milestone', icon: 'coin',
  },
  {
    id: 'h_cap3', name: 'Hito: Hotel completo', desc: 'Completa los 30 niveles de la campaña.',
    counter: 'levelsDone', goal: 30, reward: 100, kind: 'milestone', icon: 'coin',
  },
];

export const MISSION_MAP: Record<string, MissionDef> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m])
);

/** Suma de todas las recompensas de misiones (para el balance económico). */
export const MISSIONS_TOTAL = MISSIONS.reduce((a, m) => a + m.reward, 0);

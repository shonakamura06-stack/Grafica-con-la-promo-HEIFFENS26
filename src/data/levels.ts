/**
 * Definición de niveles — ¡Piso Equivocado! El Hotel de Monstruos.
 *
 * Los niveles son DATOS separados del motor del juego: para añadir un nivel
 * basta con agregar una entrada en LEVELS (ver docs/ANADIR-NIVELES.md).
 *
 * Formato de cada pasajero: { m: 'idDelMonstruo', d: pisoDestino }
 * - Los pisos van de 1 a `floors`. El 0 es recepción (no se usa como destino).
 * - Los gemelos ('gemelos') siempre aparecen en pareja con el MISMO destino.
 * - `couples`: parejas de índices de pasajero que deben viajar JUNTAS.
 * - `enemies`: parejas de índices que NO pueden viajar juntas.
 * - La campaña NO tiene sistema de vidas (Economía V3): reintentos ilimitados.
 *   El Modo Desafío opcional pone 3 vidas por partida desde la pantalla de niveles.
 * - `breakdownChance`: probabilidad de avería del ascensor (0 = nunca).
 *
 * ★ SPRINT 1 — cómo se calcularon estos 30 niveles ★
 *
 * `timeLimit` ya NO es un múltiplo genérico ni una simulación de "partida lenta":
 * es `recommendedTimeLimit()` de src/systems/timing.ts, un presupuesto individual
 * por nivel que suma el coste real de sus interacciones (leer la tarjeta, tocar a
 * cada pasajero, pulsar el botón, puertas, viajes, salidas, despertar a Nocti,
 * pensar entre viajes, aprender una regla nueva, reencuadrarse tras una avería)
 * MÁS el margen para equivocarse dos veces. tests/timing.test.ts obliga a que este
 * campo siga coincidiendo con el modelo: si cambias el roster o los destinos de un
 * nivel, cambia también su timeLimit.
 *
 * Los destinos y algunos rosters se rediseñaron para que la curva de movimientos
 * óptimos sea débilmente creciente (2 → 27) sin los desplomes que había antes
 * (nv12=25 → nv14=11, nv23=19 → nv24=11). La dificultad añadida NO viene de meter
 * más pasajeros: salvo nv14 (+1, porque estrena la cabina de 4), el resto se logró
 * SUSTITUYENDO un huésped genérico por uno con regla (gigante = 2 sitios, tímido =
 * viaje propio), que es lo que de verdad obliga a planificar más viajes.
 * tests/progression.test.ts fija la forma de la curva para que no vuelva a romperse.
 */

export interface PassengerDef {
  m: string;
  d: number;
}

export interface LevelDef {
  id: number;
  title: string;
  floors: number;      // pisos disponibles (1..floors)
  capacity: number;    // espacios del ascensor
  passengers: PassengerDef[];
  timeLimit: number;   // segundos: presupuesto individual + margen para 2 errores
  breakdownChance: number; // 0..1
  couples: Array<[number, number]>;
  enemies: Array<[number, number]>;
}

const P = (m: string, d: number): PassengerDef => ({ m, d });

export const LEVELS: LevelDef[] = [
  // ── Niveles 1-5: aprendizaje de la mecánica básica ──────────────────────
  { id: 1, title: 'Primera visita', floors: 2, capacity: 3, timeLimit: 60, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('bubu', 1), P('chispa', 2), P('bubu', 2),
  ]},
  { id: 2, title: 'Sube, sube', floors: 3, capacity: 3, timeLimit: 75, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('moco', 3), P('bubu', 1), P('chispa', 2), P('moco', 1),
  ]},
  { id: 3, title: 'Día nublado', floors: 3, capacity: 3, timeLimit: 80, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('nube', 2), P('moco', 3), P('bubu', 3), P('chispa', 1), P('nube', 1),
  ]},
  { id: 4, title: 'Noche de vampiros', floors: 4, capacity: 3, timeLimit: 85, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('draculin', 4), P('nube', 1), P('moco', 2), P('bubu', 4), P('chispa', 3),
  ]},
  { id: 5, title: 'Orejas grandes', floors: 4, capacity: 3, timeLimit: 90, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('rufi', 2), P('draculin', 1), P('nube', 4), P('moco', 4), P('bubu', 3), P('chispa', 2),
  ]},
  // ── Niveles 6-10: más pasajeros, más pisos y el primer huésped tímido ───
  { id: 6, title: 'Doble Rufi', floors: 4, capacity: 3, timeLimit: 90, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('rufi', 4), P('rufi', 1), P('draculin', 3), P('nube', 2), P('moco', 1), P('chispa', 4),
  ]},
  { id: 7, title: 'Glup glup', floors: 5, capacity: 3, timeLimit: 95, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('glup', 5), P('rufi', 2), P('draculin', 5), P('nube', 3), P('moco', 4), P('bubu', 1),
  ]},
  { id: 8, title: 'Ola de burbujas', floors: 5, capacity: 3, timeLimit: 105, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('glup', 1), P('glup', 4), P('chispa', 5), P('rufi', 3), P('nube', 5), P('moco', 2), P('draculin', 2),
  ]},
  { id: 9, title: 'Un huésped tímido', floors: 5, capacity: 3, timeLimit: 105, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('sombrin', 3), P('glup', 5), P('bubu', 1), P('nube', 2), P('chispa', 4), P('moco', 5), P('rufi', 1),
  ]},
  { id: 10, title: 'Sombrín viaja solo', floors: 5, capacity: 3, timeLimit: 115, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('sombrin', 5), P('sombrin', 1), P('glup', 1), P('draculin', 4), P('nube', 2), P('bubu', 3), P('chispa', 1),
  ]},
  // ── Niveles 11-14: turistas, VIP, parejas enamoradas y ascensor grande ──
  { id: 11, title: '¡A hacer turismo!', floors: 5, capacity: 3, timeLimit: 105, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('turista', 4), P('glup', 5), P('rufi', 5), P('nube', 4), P('moco', 3), P('bubu', 3), P('chispa', 1), P('draculin', 5),
  ]},
  { id: 12, title: 'Amor en el hotel', floors: 5, capacity: 3, timeLimit: 120, breakdownChance: 0, couples: [[0,1]], enemies: [], passengers: [
    P('enamorado', 4), P('enamorado', 4), P('moco', 1), P('nube', 5), P('rufi', 4), P('glup', 3), P('draculin', 2), P('sombrin', 2),
  ]},
  { id: 13, title: 'El señor VIP', floors: 5, capacity: 3, timeLimit: 115, breakdownChance: 0, couples: [[0,1]], enemies: [], passengers: [
    P('enamorado', 5), P('enamorado', 5), P('vip', 3), P('turista', 2), P('bubu', 5), P('chispa', 5), P('moco', 1), P('nube', 4),
  ]},
  { id: 14, title: 'Ascensor grande', floors: 5, capacity: 4, timeLimit: 120, breakdownChance: 0, couples: [[0,1]], enemies: [], passengers: [
    P('enamorado', 5), P('enamorado', 5), P('rufi', 2), P('nube', 5), P('moco', 5), P('bubu', 5), P('chispa', 2), P('glup', 3), P('nube', 4),
  ]},
  // ── Niveles 15-19: gigantes, enemigos y gemelos ─────────────────────────
  { id: 15, title: 'Hora punta', floors: 5, capacity: 4, timeLimit: 110, breakdownChance: 0, couples: [[0,1]], enemies: [], passengers: [
    P('enamorado', 5), P('enamorado', 5), P('glup', 5), P('nube', 4), P('moco', 5), P('bubu', 3), P('chispa', 5), P('rufi', 4), P('glup', 3),
  ]},
  { id: 16, title: '¡Cuidado, gigante!', floors: 5, capacity: 4, timeLimit: 105, breakdownChance: 0, couples: [], enemies: [], passengers: [
    P('gordito', 5), P('bubu', 5), P('chispa', 5), P('moco', 3), P('nube', 4), P('rufi', 4), P('glup', 3), P('draculin', 5),
  ]},
  { id: 17, title: 'No se soportan', floors: 5, capacity: 4, timeLimit: 105, breakdownChance: 0, couples: [], enemies: [[0,1]], passengers: [
    P('grunon', 5), P('chispa', 3), P('bubu', 5), P('moco', 4), P('nube', 5), P('rufi', 5), P('glup', 5), P('gordito', 5),
  ]},
  { id: 18, title: 'Amor y gruñidos', floors: 5, capacity: 4, timeLimit: 115, breakdownChance: 0, couples: [[0,1]], enemies: [[2,3]], passengers: [
    P('enamorado', 4), P('enamorado', 4), P('grunon', 2), P('bubu', 1), P('chispa', 4), P('moco', 4), P('nube', 3), P('sombrin', 5),
  ]},
  { id: 19, title: 'Tímido y gemelos', floors: 5, capacity: 4, timeLimit: 105, breakdownChance: 0, couples: [], enemies: [[0,1]], passengers: [
    P('sombrin', 3), P('grunon', 5), P('gemelos', 5), P('gemelos', 5), P('bubu', 5), P('chispa', 1), P('moco', 2), P('nube', 5),
  ]},
  // ── Niveles 20-24: maletas, averías, sonámbulos, dúos y fantasmas ───────
  { id: 20, title: 'Mucho equipaje', floors: 5, capacity: 4, timeLimit: 110, breakdownChance: 0.1, couples: [], enemies: [], passengers: [
    P('maletero', 5), P('bubu', 5), P('chispa', 4), P('moco', 2), P('nube', 5), P('rufi', 3), P('glup', 3), P('gordito', 5),
  ]},
  { id: 21, title: 'El ascensor falla', floors: 5, capacity: 4, timeLimit: 105, breakdownChance: 0.35, couples: [[0,1]], enemies: [], passengers: [
    P('enamorado', 5), P('enamorado', 5), P('gordito', 5), P('bubu', 4), P('chispa', 5), P('moco', 4), P('nube', 4), P('glup', 3),
  ]},
  { id: 22, title: 'Buenas noches, Nocti', floors: 5, capacity: 4, timeLimit: 115, breakdownChance: 0.15, couples: [], enemies: [[0,1]], passengers: [
    P('nocti', 3), P('grunon', 5), P('pegajin', 1), P('pegajon', 5), P('moco', 4), P('nube', 3), P('rufi', 2), P('sombrin', 5),
  ]},
  { id: 23, title: 'Siesta colectiva', floors: 5, capacity: 4, timeLimit: 120, breakdownChance: 0.2, couples: [[1,2]], enemies: [], passengers: [
    P('nocti', 5), P('enamorado', 5), P('enamorado', 5), P('sombrin', 5), P('bubu', 2), P('chispa', 4), P('moco', 1), P('nube', 4),
  ]},
  { id: 24, title: 'Atraviesa paredes', floors: 5, capacity: 4, timeLimit: 115, breakdownChance: 0.2, couples: [], enemies: [[0,1]], passengers: [
    P('fantasmita', 5), P('grunon', 5), P('bubu', 1), P('chispa', 5), P('moco', 3), P('nube', 2), P('rufi', 1), P('sombrin', 5),
  ]},
  // ── Niveles 25-30: rompecabezas exigentes (todas las reglas combinadas) ─
  { id: 25, title: 'Fantasma y gigante', floors: 5, capacity: 4, timeLimit: 125, breakdownChance: 0.25, couples: [[1,2]], enemies: [], passengers: [
    P('fantasmita', 4), P('enamorado', 1), P('enamorado', 1), P('gordito', 1), P('temblorin', 5), P('sombrin', 5), P('moco', 3), P('nube', 5),
  ]},
  { id: 26, title: 'Todo junto', floors: 5, capacity: 4, timeLimit: 130, breakdownChance: 0.3, couples: [[0,1]], enemies: [[2,3]], passengers: [
    P('enamorado', 5), P('enamorado', 5), P('grunon', 3), P('nocti', 4), P('fantasmita', 4), P('bubu', 1), P('chispa', 5), P('moco', 5), P('sombrin', 5),
  ]},
  { id: 27, title: 'Noche en el hotel', floors: 5, capacity: 4, timeLimit: 140, breakdownChance: 0.3, couples: [[1,2]], enemies: [], passengers: [
    P('nocti', 5), P('enamorado', 3), P('enamorado', 3), P('sombrin', 3), P('fantasmita', 5), P('gordito', 5), P('bubu', 4), P('chispa', 5), P('moco', 5), P('nube', 2),
  ]},
  { id: 28, title: 'Peso pesado', floors: 5, capacity: 4, timeLimit: 120, breakdownChance: 0.35, couples: [[1,2]], enemies: [[2,3]], passengers: [
    P('gordito', 5), P('enamorado', 5), P('enamorado', 5), P('grunon', 5), P('pegajin', 5), P('pegajon', 5), P('moco', 1), P('nube', 2), P('rufi', 5), P('glup', 5),
  ]},
  { id: 29, title: 'Dulces sueños', floors: 5, capacity: 4, timeLimit: 145, breakdownChance: 0.35, couples: [[1,2]], enemies: [[2,3]], passengers: [
    P('sombrin', 5), P('enamorado', 2), P('enamorado', 2), P('grunon', 4), P('nocti', 4), P('fantasmita', 1), P('temblorin', 3), P('chispa', 5), P('moco', 4), P('nube', 5),
  ]},
  { id: 30, title: '¡La gran noche!', floors: 5, capacity: 4, timeLimit: 145, breakdownChance: 0.4, couples: [[1,2]], enemies: [[2,3]], passengers: [
    P('gordito', 5), P('enamorado', 3), P('enamorado', 3), P('grunon', 5), P('nocti', 5), P('fantasmita', 2), P('sombrin', 5), P('bubu', 1), P('chispa', 5), P('moco', 4),
  ]},
];

export const TOTAL_LEVELS = LEVELS.length;

export function getLevel(id: number): LevelDef {
  const lvl = LEVELS.find((l) => l.id === id);
  if (!lvl) throw new Error(`Nivel ${id} no existe`);
  return lvl;
}

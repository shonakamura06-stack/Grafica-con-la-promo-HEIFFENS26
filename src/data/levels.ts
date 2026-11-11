/**
 * Definición de niveles — ¡Piso Equivocado! El Hotel de Monstruos.
 *
 * Los niveles son DATOS separados del motor del juego: para añadir un nivel
 * basta con agregar una entrada en LEVELS (ver docs/ANADIR-NIVELES.md).
 *
 * Formato de cada pasajero: { m: 'idDelMonstruo', d: pisoDestino }
 * - Los pisos van de 1 a `floors`. El 0 es recepción (no se usa como destino).
 * - Los gemelos ('gemelos') siempre aparecen en pareja con el MISMO destino.
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
}

const P = (m: string, d: number): PassengerDef => ({ m, d });

export const LEVELS: LevelDef[] = [
  // ── Niveles 1-5: aprendizaje de la mecánica básica ──────────────────────
  { id: 1, title: 'Primera visita', floors: 2, capacity: 3, passengers: [
    P('bubu', 1), P('chispa', 2), P('bubu', 2),
  ]},
  { id: 2, title: 'Sube, sube', floors: 3, capacity: 3, passengers: [
    P('moco', 3), P('bubu', 1), P('chispa', 2), P('moco', 1),
  ]},
  { id: 3, title: 'Día nublado', floors: 3, capacity: 3, passengers: [
    P('nube', 2), P('moco', 3), P('bubu', 3), P('chispa', 1), P('nube', 1),
  ]},
  { id: 4, title: 'Noche de vampiros', floors: 4, capacity: 3, passengers: [
    P('draculin', 4), P('nube', 1), P('moco', 2), P('bubu', 4), P('chispa', 3),
  ]},
  { id: 5, title: 'Orejas grandes', floors: 4, capacity: 3, passengers: [
    P('rufi', 2), P('draculin', 1), P('nube', 4), P('moco', 4), P('bubu', 3), P('chispa', 2),
  ]},
  // ── Niveles 6-10: más pasajeros y destinos ──────────────────────────────
  { id: 6, title: 'Doble Rufi', floors: 4, capacity: 3, passengers: [
    P('rufi', 4), P('rufi', 1), P('draculin', 3), P('nube', 2), P('moco', 1), P('chispa', 4),
  ]},
  { id: 7, title: 'Glup glup', floors: 5, capacity: 3, passengers: [
    P('glup', 5), P('rufi', 2), P('draculin', 5), P('nube', 3), P('moco', 4), P('bubu', 1),
  ]},
  { id: 8, title: 'Ola de burbujas', floors: 5, capacity: 3, passengers: [
    P('glup', 1), P('glup', 4), P('chispa', 5), P('rufi', 3), P('nube', 5), P('moco', 2), P('draculin', 2),
  ]},
  { id: 9, title: 'Un huésped tímido', floors: 5, capacity: 3, passengers: [
    P('sombrin', 3), P('glup', 5), P('bubu', 1), P('nube', 2), P('chispa', 4), P('moco', 5), P('rufi', 1),
  ]},
  { id: 10, title: 'Sombrín viaja solo', floors: 5, capacity: 3, passengers: [
    P('sombrin', 5), P('sombrin', 1), P('glup', 2), P('draculin', 4), P('nube', 3), P('bubu', 5), P('chispa', 1),
  ]},
  // ── Niveles 11-15: planificar los viajes ────────────────────────────────
  { id: 11, title: 'Hotel completo', floors: 5, capacity: 3, passengers: [
    P('glup', 5), P('rufi', 5), P('nube', 4), P('moco', 3), P('bubu', 2), P('chispa', 1), P('draculin', 5), P('sombrin', 2),
  ]},
  { id: 12, title: 'Parejas de piso', floors: 5, capacity: 3, passengers: [
    P('bubu', 5), P('chispa', 5), P('moco', 5), P('nube', 5), P('rufi', 4), P('glup', 3), P('draculin', 2), P('sombrin', 4),
  ]},
  { id: 13, title: 'De punta a punta', floors: 5, capacity: 3, passengers: [
    P('glup', 1), P('glup', 5), P('nube', 5), P('rufi', 1), P('moco', 5), P('bubu', 3), P('chispa', 3), P('draculin', 5),
  ]},
  { id: 14, title: 'Ascensor grande', floors: 5, capacity: 4, passengers: [
    P('rufi', 5), P('nube', 2), P('moco', 5), P('bubu', 1), P('chispa', 4), P('glup', 3), P('draculin', 5), P('sombrin', 3),
  ]},
  { id: 15, title: 'Hora punta', floors: 5, capacity: 4, passengers: [
    P('glup', 5), P('nube', 5), P('moco', 1), P('bubu', 2), P('chispa', 5), P('rufi', 3), P('draculin', 4), P('sombrin', 5), P('glup', 2),
  ]},
  // ── Niveles 16-20: primeros monstruos especiales ────────────────────────
  { id: 16, title: '¡Cuidado, gigante!', floors: 5, capacity: 4, passengers: [
    P('gordito', 5), P('bubu', 1), P('chispa', 2), P('moco', 3), P('nube', 4), P('rufi', 5), P('glup', 2), P('draculin', 5),
  ]},
  { id: 17, title: 'Doble peso', floors: 5, capacity: 4, passengers: [
    P('gordito', 2), P('gordito', 5), P('nube', 1), P('moco', 4), P('bubu', 5), P('chispa', 3), P('rufi', 2), P('glup', 4),
  ]},
  { id: 18, title: 'Gemelos inseparables', floors: 5, capacity: 4, passengers: [
    P('gemelos', 4), P('gemelos', 4), P('bubu', 1), P('chispa', 5), P('moco', 2), P('nube', 5), P('rufi', 3), P('glup', 5),
  ]},
  { id: 19, title: 'Tímido y gemelos', floors: 5, capacity: 4, passengers: [
    P('sombrin', 2), P('gemelos', 5), P('gemelos', 5), P('bubu', 5), P('chispa', 1), P('moco', 3), P('nube', 4), P('draculin', 5),
  ]},
  { id: 20, title: 'Viajes en solitario', floors: 5, capacity: 4, passengers: [
    P('sombrin', 5), P('sombrin', 1), P('gemelos', 3), P('gemelos', 3), P('glup', 4), P('rufi', 5), P('bubu', 2), P('nube', 5),
  ]},
  // ── Niveles 21-25: combinaciones de varias reglas ───────────────────────
  { id: 21, title: 'Gigante y gemelos', floors: 5, capacity: 4, passengers: [
    P('gordito', 3), P('gemelos', 5), P('gemelos', 5), P('bubu', 2), P('chispa', 5), P('moco', 1), P('nube', 4), P('glup', 3),
  ]},
  { id: 22, title: 'Buenas noches, Nocti', floors: 5, capacity: 4, passengers: [
    P('nocti', 4), P('bubu', 1), P('chispa', 5), P('moco', 2), P('nube', 5), P('rufi', 3), P('glup', 4), P('draculin', 1),
  ]},
  { id: 23, title: 'Siesta colectiva', floors: 5, capacity: 4, passengers: [
    P('nocti', 2), P('nocti', 5), P('sombrin', 4), P('bubu', 5), P('chispa', 3), P('moco', 5), P('nube', 1), P('glup', 2),
  ]},
  { id: 24, title: 'Atraviesa paredes', floors: 5, capacity: 4, passengers: [
    P('fantasmita', 5), P('bubu', 1), P('chispa', 2), P('moco', 3), P('nube', 4), P('rufi', 5), P('glup', 5), P('draculin', 3),
  ]},
  { id: 25, title: 'Fantasma y gigante', floors: 5, capacity: 4, passengers: [
    P('fantasmita', 2), P('fantasmita', 5), P('gordito', 4), P('bubu', 5), P('chispa', 1), P('moco', 5), P('nube', 3), P('rufi', 5),
  ]},
  // ── Niveles 26-30: rompecabezas exigentes ──────────────────────────────
  { id: 26, title: 'Todo junto', floors: 5, capacity: 4, passengers: [
    P('gemelos', 2), P('gemelos', 2), P('nocti', 5), P('fantasmita', 4), P('bubu', 5), P('chispa', 1), P('moco', 3), P('nube', 5), P('glup', 1),
  ]},
  { id: 27, title: 'Noche en el hotel', floors: 5, capacity: 4, passengers: [
    P('nocti', 5), P('nocti', 1), P('sombrin', 3), P('fantasmita', 5), P('gordito', 2), P('bubu', 4), P('chispa', 5), P('moco', 5), P('nube', 2), P('glup', 3),
  ]},
  { id: 28, title: 'Peso pesado', floors: 5, capacity: 4, passengers: [
    P('gordito', 5), P('gordito', 1), P('gemelos', 4), P('gemelos', 4), P('bubu', 3), P('chispa', 5), P('moco', 2), P('nube', 5), P('rufi', 4), P('glup', 5),
  ]},
  { id: 29, title: 'Dulces sueños', floors: 5, capacity: 4, passengers: [
    P('sombrin', 5), P('sombrin', 2), P('nocti', 4), P('nocti', 5), P('fantasmita', 1), P('bubu', 3), P('chispa', 5), P('moco', 4), P('nube', 5), P('glup', 2),
  ]},
  { id: 30, title: '¡La gran noche!', floors: 5, capacity: 4, passengers: [
    P('gordito', 5), P('gemelos', 3), P('gemelos', 3), P('nocti', 5), P('fantasmita', 2), P('sombrin', 4), P('bubu', 1), P('chispa', 5), P('moco', 2), P('nube', 4),
  ]},
];

export const TOTAL_LEVELS = LEVELS.length;

export function getLevel(id: number): LevelDef {
  const lvl = LEVELS.find((l) => l.id === id);
  if (!lvl) throw new Error(`Nivel ${id} no existe`);
  return lvl;
}

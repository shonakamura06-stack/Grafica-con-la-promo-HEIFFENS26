/**
 * Pruebas del sistema de puntuación y del recorrido óptimo (Dijkstra).
 * Regla del juego: el nivel termina cuando el ÚLTIMO monstruo sale del
 * ascensor (no hace falta volver a recepción), por lo que el óptimo no
 * incluye un regreso final. Los regresos entre viajes sí cuentan.
 * Ejecutar con: npm test
 */
import { describe, it, expect } from 'vitest';
import { computeOptimal, starsFor, starThresholds, coinsFor, isPerfect, moodForMistakes, MAX_MISTAKES } from '../src/systems/scoring';
import { LevelDef } from '../src/data/levels';

const L = (
  passengers: Array<[string, number]>,
  floors = 3,
  capacity = 3,
  couples: Array<[number, number]> = [],
  enemies: Array<[number, number]> = []
): LevelDef => ({
  id: 99,
  title: 'test',
  floors,
  capacity,
  passengers: passengers.map(([m, d]) => ({ m, d })),
  timeLimit: 120,
  lives: 0,
  breakdownChance: 0,
  couples,
  enemies,
});

describe('computeOptimal', () => {
  it('un solo pasajero al piso 2: óptimo 2 (el nivel termina al entregarlo)', () => {
    expect(computeOptimal(L([['bubu', 2]])).optimal).toBe(2);
  });

  it('dos pasajeros al mismo piso caben juntos: 2', () => {
    expect(computeOptimal(L([['bubu', 2], ['chispa', 2]])).optimal).toBe(2);
  });

  it('dos pasajeros a pisos distintos con capacidad 3: subir a 1, luego a 3 = 1+2 = 3', () => {
    expect(computeOptimal(L([['bubu', 1], ['chispa', 3]])).optimal).toBe(3);
  });

  it('con capacidad 1 hay que hacer dos viajes: (2+2) + 3 = 7', () => {
    expect(computeOptimal(L([['bubu', 2], ['chispa', 3]], 3, 1)).optimal).toBe(7);
  });

  it('un gigante ocupa 2 espacios: con capacidad 2 viaja solo', () => {
    const opt = computeOptimal(L([['gordito', 2], ['bubu', 2]], 3, 2)).optimal;
    // Viaje 1: Gordito a 2 y volver (4). Viaje 2: Bubu a 2 (2). Total 6.
    expect(opt).toBe(6);
  });

  it('un fantasma no ocupa espacio: cabe con el ascensor lleno', () => {
    const opt = computeOptimal(L([['bubu', 2], ['chispa', 2], ['moco', 2], ['fantasmita', 2]], 3, 3)).optimal;
    // Los 4 van en un solo viaje: 2.
    expect(opt).toBe(2);
  });

  it('un tímido viaja solo: dos viajes aunque quepan juntos', () => {
    const opt = computeOptimal(L([['sombrin', 2], ['bubu', 2]], 3, 3)).optimal;
    // Viaje 1: Sombrín a 2 y volver (4). Viaje 2: Bubu a 2 (2). Total 6.
    expect(opt).toBe(6);
  });

  it('los gemelos suben juntos en un solo viaje', () => {
    const opt = computeOptimal(L([['gemelos', 3], ['gemelos', 3]], 3, 3)).optimal;
    expect(opt).toBe(3);
  });

  it('una pareja enamorada sale junta: viajan en un solo viaje', () => {
    const opt = computeOptimal(L([['enamorado', 2], ['enamorado', 2]], 3, 3, [[0, 1]])).optimal;
    expect(opt).toBe(2);
  });

  it('una pareja no puede separarse: si uno sube solo, no sale hasta que suba el otro', () => {
    // Pareja al piso 2 + otro al piso 3, capacidad 2.
    // Óptimo: subir pareja (2) -> piso 2 (2) -> volver (2) -> subir otro (3) = 7.
    // No se puede entregar a uno de la pareja sin el otro.
    const opt = computeOptimal(L([['enamorado', 2], ['enamorado', 2], ['bubu', 3]], 3, 2, [[0, 1]])).optimal;
    expect(opt).toBe(7);
  });

  it('dos enemigos no viajan juntos: dos viajes separados', () => {
    const opt = computeOptimal(L([['grunon', 2], ['bubu', 2]], 3, 3, [], [[0, 1]])).optimal;
    // Viaje 1: Gruñón a 2 y volver (4). Viaje 2: Bubu a 2 (2). Total 6.
    expect(opt).toBe(6);
  });

  it('el óptimo nunca es mayor que el recorrido ingenuo de un viaje por pasajero', () => {
    const level = L([['bubu', 1], ['chispa', 2], ['moco', 3], ['nube', 1], ['rufi', 3]], 3, 3);
    const naive = level.passengers.reduce((a, p) => a + p.d * 2, 0);
    expect(computeOptimal(level).optimal).toBeLessThanOrEqual(naive);
  });
});

describe('estrellas y monedas', () => {
  it('umbrales por eficiencia: 3★ = óptima+1, 2★ = óptima+3', () => {
    const { three, two } = starThresholds(10);
    expect(three).toBe(11);
    expect(two).toBe(13);
  });

  it('recorrido perfecto (== óptima) = 3 estrellas', () => {
    expect(starsFor(10, 10)).toBe(3);
  });

  it('óptima+1 también da 3 estrellas (sin bonus de perfección)', () => {
    expect(starsFor(11, 10)).toBe(3);
    expect(isPerfect(11, 10)).toBe(false);
  });

  it('óptima+2 y óptima+3 dan 2 estrellas', () => {
    expect(starsFor(12, 10)).toBe(2);
    expect(starsFor(13, 10)).toBe(2);
  });

  it('recorrido muy ineficiente = 1 estrella (nunca 0)', () => {
    expect(starsFor(100, 10)).toBe(1);
  });

  it('isPerfect solo cuando distancia == óptima', () => {
    expect(isPerfect(10, 10)).toBe(true);
    expect(isPerfect(9, 10)).toBe(false);
  });

  it('las monedas crecen con las estrellas y el bonus de perfección', () => {
    expect(coinsFor(3)).toBeGreaterThan(coinsFor(2));
    expect(coinsFor(2)).toBeGreaterThan(coinsFor(1));
    expect(coinsFor(3, true)).toBeGreaterThan(coinsFor(3, false));
  });
});

describe('ánimos ante pisos equivocados', () => {
  it('sin errores los monstruos están felices', () => {
    expect(moodForMistakes(0)).toBe('happy');
  });

  it('al primer error se ponen neutros', () => {
    expect(moodForMistakes(1)).toBe('neutral');
  });

  it('al segundo error se enojan', () => {
    expect(moodForMistakes(2)).toBe('angry');
    expect(moodForMistakes(3)).toBe('angry');
  });

  it('el límite de errores es 3 (vuelven molestos a recepción)', () => {
    expect(MAX_MISTAKES).toBe(3);
  });
});

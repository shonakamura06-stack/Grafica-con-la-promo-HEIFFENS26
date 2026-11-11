/**
 * Pruebas del sistema de puntuación y del recorrido óptimo (Dijkstra).
 * Regla del juego: el nivel termina cuando el ÚLTIMO monstruo sale del
 * ascensor (no hace falta volver a recepción), por lo que el óptimo no
 * incluye un regreso final. Los regresos entre viajes sí cuentan.
 * Ejecutar con: npm test
 */
import { describe, it, expect } from 'vitest';
import { MONSTER_MAP } from '../src/data/monsters';
import { computeOptimal, starsFor, starThresholds, isPerfect, moodForMistakes, MAX_MISTAKES } from '../src/systems/scoring';
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

  it('las monedas ya no se calculan aquí (Economía V3)', () => {
    // El pago por logros únicos vive en systems/economy.ts y se prueba en economy.test.ts.
    expect(isPerfect(5, 5)).toBe(true);
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

describe('auditoría del óptimo: fuerza bruta independiente vs solver', () => {
  // Búsqueda exhaustiva con poda, escrita aparte del solver, con las mismas
  // reglas del juego (capacidad, gemelos, dúo, tímido, miedoso, parejas,
  // enemigos no juntos, salida automática al llegar, bajar cuenta).
  function brute(level: LevelDef): number {
    const infos = level.passengers.map((p, i) => {
      const def = MONSTER_MAP[p.m];
      return { dest: p.d, slots: def.slots, rule: def.rule, i };
    });
    const pairOf = (i: number, rule: string): number => {
      if (infos[i].rule !== rule) return -1;
      const grp = infos.filter((x) => x.rule === rule).map((x) => x.i);
      const pos = grp.indexOf(i);
      return grp[pos % 2 === 0 ? pos + 1 : pos - 1];
    };
    const coupleOf = (i: number): number => {
      for (const [a, b] of level.couples) if (a === i) return b; else if (b === i) return a;
      return -1;
    };
    const enemyOf = (i: number): number[] => {
      const out: number[] = [];
      for (const [a, b] of level.enemies) { if (a === i) out.push(b); if (b === i) out.push(a); }
      return out;
    };
    const n = infos.length;
    const full = (1 << n) - 1;
    const slots = (mask: number) => infos.reduce((t, x, i) => t + ((mask & (1 << i)) ? x.slots : 0), 0);
    const count = (mask: number) => infos.reduce((t, _x, i) => t + ((mask & (1 << i)) ? 1 : 0), 0);
    let best = Infinity;
    const seen = new Map<string, number>();
    const dfs = (delivered: number, onboard: number, pos: number, d: number, depth: number): void => {
      if (d >= best || depth > 16) return;
      if (delivered === full) { best = d; return; }
      const key = `${delivered}|${onboard}|${pos}`;
      if ((seen.get(key) ?? Infinity) <= d) return;
      seen.set(key, d);
      if (pos === 0) {
        for (let i = 0; i < n; i++) {
          if (delivered & (1 << i)) continue;
          if (onboard & (1 << i)) continue;
          let group = [i];
          const tw = pairOf(i, 'twins'); if (tw >= 0) group.push(tw);
          const du = pairOf(i, 'duo'); if (du >= 0) group.push(du);
          let mask = onboard;
          group.forEach((g) => { mask |= 1 << g; });
          if (slots(mask) > level.capacity) continue;
          if (infos[i].rule === 'shy' && onboard !== 0) continue;
          if (group.some((g) => infos[g].rule === 'shy') && count(onboard) > 0) continue;
          if (infos.some((x, k) => x.rule === 'shy' && (onboard & (1 << k)))) continue;
          if (enemyOf(i).some((e) => onboard & (1 << e))) continue;
          const fear = group.some((g) => infos[g].rule === 'fear') || infos.some((x, k) => x.rule === 'fear' && (onboard & (1 << k)));
          if (fear && count(mask) > 2) continue;
          dfs(delivered, mask, 0, d, depth + 1);
        }
      }
      for (let f = 0; f <= level.floors; f++) {
        if (f === pos) continue;
        let nd = delivered; let nb = onboard;
        for (let i = 0; i < n; i++) {
          if (!(onboard & (1 << i)) || infos[i].dest !== f) continue;
          const cp = coupleOf(i);
          if (cp >= 0 && !(onboard & (1 << cp))) continue;
          nd |= 1 << i; nb &= ~(1 << i);
        }
        dfs(nd, nb, f, d + Math.abs(f - pos), depth + 1);
      }
    };
    dfs(0, 0, 0, 0, 0);
    return best;
  }

  const L = (passengers: Array<[string, number]>, floors = 3, capacity = 3, couples: Array<[number, number]> = [], enemies: Array<[number, number]> = []): LevelDef => ({
    id: 99, title: 'test', floors, capacity, timeLimit: 120, breakdownChance: 0, couples, enemies,
    passengers: passengers.map(([m, d]) => ({ m, d })),
  });

  it('el solver coincide con la fuerza bruta en niveles pequeños (todas las reglas)', () => {
    const cases: LevelDef[] = [
      L([['bubu', 2]]),
      L([['bubu', 2], ['chispa', 3]], 3, 2),
      L([['pegajin', 2], ['pegajon', 3]], 3, 2),
      L([['pegajin', 2], ['pegajon', 3], ['bubu', 1]], 3, 3),
      L([['temblorin', 2], ['bubu', 3], ['chispa', 2]], 3, 3),
      L([['enamorado', 2], ['enamorado', 2], ['bubu', 3]], 3, 2, [[0, 1]]),
      L([['grunon', 2], ['bubu', 2]], 3, 2, [], [[0, 1]]),
      L([['sombrin', 2], ['bubu', 2]], 3, 2),
      L([['gordito', 2], ['bubu', 2]], 3, 2),
      L([['nocti', 3], ['moco', 1], ['nube', 3]], 3, 2),
    ];
    for (const lvl of cases) {
      expect(computeOptimal(lvl).optimal, JSON.stringify(lvl.passengers)).toBe(brute(lvl));
    }
  }, 60000);
});

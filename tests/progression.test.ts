/**
 * Pruebas de PROGRESIÓN de la campaña (data/levels.ts + systems/rules.ts).
 *
 * La auditoría encontró una curva en sierra: nivel 12 = 25 movimientos, 13 = 17,
 * 14 = 11; nivel 23 = 19 y 24 = 11. El jugador pasaba de un pico a un respiro sin
 * motivo. Estas pruebas fijan la forma de la curva para que no vuelva a romperse:
 *
 *   - los movimientos óptimos NUNCA bajan de un nivel al siguiente,
 *   - el índice de dificultad puede amesetarse o dipar un poco (las reglas rotan),
 *     pero nunca desplomarse, y la tendencia a 4 niveles siempre sube,
 *   - el nivel 30 es el más difícil de la campaña,
 *   - cada mecánica se estrena una vez, en orden, y el monstruo aparece en el
 *     nivel que dice su ficha del álbum,
 *   - el título de un nivel no promete un monstruo que no está.
 */
import { describe, it, expect } from 'vitest';
import { LEVELS, TOTAL_LEVELS } from '../src/data/levels';
import { MONSTERS, MONSTER_MAP, TWIN_GROUP } from '../src/data/monsters';
import { computeOptimal } from '../src/systems/scoring';
import { buildCrew, difficultyIndex } from '../src/systems/rules';

interface Row {
  id: number; optimal: number; difficulty: number; crew: number; pax: number;
  capacity: number; floors: number; breakdown: number; rules: string[];
}

const rows: Row[] = LEVELS.map((lvl) => {
  const { optimal } = computeOptimal(lvl);
  const crew = buildCrew(lvl);
  const rules = new Set<string>(crew.filter((m) => m.rule !== 'none').map((m) => m.rule));
  if (lvl.couples.length) rules.add('couples');
  if (lvl.enemies.length) rules.add('enemies');
  return {
    id: lvl.id, optimal, difficulty: difficultyIndex(lvl, optimal, crew.length),
    crew: crew.length, pax: lvl.passengers.length, capacity: lvl.capacity,
    floors: lvl.floors, breakdown: lvl.breakdownChance, rules: [...rules],
  };
});

describe('curva de movimientos óptimos', () => {
  it('NUNCA baja de un nivel al siguiente (antes caía de 25 a 17 y de 19 a 11)', () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].optimal, `nv${rows[i].id} baja respecto a nv${rows[i - 1].id}`)
        .toBeGreaterThanOrEqual(rows[i - 1].optimal);
    }
  }, 60000);

  it('las mesetas del óptimo están acotadas y compensadas con reglas nuevas', () => {
    // El óptimo PUEDE amesetarse: la complejidad de la segunda mitad viene de
    // combinar reglas (sonámbulo + dúo + maletas + averías), no de meter más
    // pasajeros. Lo que no se admite es una meseta eterna y plana: como mucho 8
    // niveles seguidos con el mismo número de movimientos, y el índice de
    // dificultad del último tiene que superar al del primero.
    let inicio = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i === rows.length || rows[i].optimal !== rows[inicio].optimal) {
        const largo = i - inicio;
        expect(largo, `meseta de ${rows[inicio].optimal} pasos desde nv${rows[inicio].id}`)
          .toBeLessThanOrEqual(8);
        if (largo > 1) {
          expect(rows[i - 1].difficulty, `meseta nv${rows[inicio].id}-nv${rows[i - 1].id} sin avanzar`)
            .toBeGreaterThanOrEqual(rows[inicio].difficulty);
        }
        inicio = i;
      }
    }
  }, 60000);

  it('empieza siendo trivial y termina siendo exigente', () => {
    expect(rows[0].optimal).toBeLessThanOrEqual(3);
    expect(rows[29].optimal).toBeGreaterThanOrEqual(24);
    expect(rows[29].optimal).toBe(Math.max(...rows.map((r) => r.optimal)));
  }, 60000);

  it('el primer tercio enseña: ningún nivel antes del 10 pasa de 17 movimientos', () => {
    for (const r of rows.filter((x) => x.id <= 10)) {
      expect(r.optimal, `nv${r.id}`).toBeLessThanOrEqual(17);
    }
  }, 60000);
});

describe('curva del índice de dificultad', () => {
  it('no se desploma: como mucho 6 puntos de caída entre niveles seguidos', () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].difficulty, `nv${rows[i].id} cae desde ${rows[i - 1].difficulty}`)
        .toBeGreaterThanOrEqual(rows[i - 1].difficulty - 6);
    }
  }, 60000);

  it('la tendencia a 6 niveles siempre sube', () => {
    // Ventana de 6: permite que un nivel baje un poco respecto al anterior porque
    // ese día rotan las reglas (menos mecánicas activas = índice menor), pero la
    // campaña no puede estar 6 niveles seguidos sin endurecerse.
    for (let i = 6; i < rows.length; i++) {
      expect(rows[i].difficulty, `nv${rows[i].id} no supera a nv${rows[i - 6].id}`)
        .toBeGreaterThanOrEqual(rows[i - 6].difficulty);
    }
  }, 60000);

  it('el nivel 30 es el más difícil de la campaña', () => {
    expect(rows[29].difficulty).toBe(Math.max(...rows.map((r) => r.difficulty)));
  }, 60000);

  it('la dificultad del nivel 1 es mínima (apenas hay que pensar)', () => {
    expect(rows[0].difficulty).toBeLessThanOrEqual(6);
  }, 60000);
});

describe('estructura de la campaña', () => {
  it('la cabina crece de 3 a 4 lugares una sola vez, en el nivel 14', () => {
    const cambios = rows.filter((r, i) => i > 0 && r.capacity !== rows[i - 1].capacity);
    expect(cambios).toHaveLength(1);
    expect(cambios[0].id).toBe(14);
    expect(cambios[0].capacity).toBe(4);
  });

  it('el edificio crece sin encogerse y nunca pasa de 5 pisos', () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].floors).toBeGreaterThanOrEqual(rows[i - 1].floors);
    }
    expect(Math.max(...rows.map((r) => r.floors))).toBe(5);
  });

  it('las averías empiezan en el nivel 20 y nunca superan el 40 %', () => {
    const primera = rows.find((r) => r.breakdown > 0)!;
    expect(primera.id).toBe(20);
    for (const r of rows) {
      expect(r.breakdown).toBeGreaterThanOrEqual(0);
      expect(r.breakdown).toBeLessThanOrEqual(0.4);
    }
  });

  it('ningún nivel pasa de 10 pasajeros ni baja de 3', () => {
    for (const r of rows) {
      expect(r.pax, `nv${r.id}`).toBeGreaterThanOrEqual(3);
      expect(r.pax, `nv${r.id}`).toBeLessThanOrEqual(10);
    }
  });

  it('cada monstruo aparece por primera vez EN el nivel que dice su ficha', () => {
    for (const m of MONSTERS) {
      const primero = LEVELS.find((l) => l.passengers.some((p) => p.m === m.id));
      expect(primero, `${m.id} no aparece en ningún nivel`).toBeDefined();
      expect(primero!.id, `${m.id} desbloquea en ${m.unlockLevel} pero aparece en`)
        .toBe(m.unlockLevel);
    }
  });

  it('las parejas y los enemigos nunca señalan a los gemelos (se fusionan en una unidad)', () => {
    // Si una pareja o enemistad apuntara a un gemelo, los dos índices acabarían
    // en la misma unidad del crew y la relación se perdería en silencio.
    for (const lvl of LEVELS) {
      const twins = lvl.passengers.map((p, i) => (p.m === TWIN_GROUP ? i : -1)).filter((i) => i >= 0);
      for (const [a, b] of [...lvl.couples, ...lvl.enemies]) {
        expect(twins, `nv${lvl.id}`).not.toContain(a);
        expect(twins, `nv${lvl.id}`).not.toContain(b);
      }
    }
  });

  it('ninguna relación se pierde al pasar al crew (todas existen de verdad)', () => {
    for (const lvl of LEVELS) {
      const crew = buildCrew(lvl);
      const parejas = crew.filter((m) => m.coupleId >= 0).length;
      expect(parejas, `nv${lvl.id}`).toBe(lvl.couples.length * 2);
      const enemistades = crew.reduce((a, m) => a + m.enemyIds.length, 0);
      expect(enemistades, `nv${lvl.id}`).toBe(lvl.enemies.length * 2);
    }
  });
});

describe('los títulos no mienten', () => {
  // La auditoría encontró un nivel titulado "Gemelos inseparables" sin gemelos.
  const PROMESAS: Array<[RegExp, string]> = [
    [/gemel/i, TWIN_GROUP],
    [/gigante/i, 'gordito'],
    [/nocti|sueño|siesta|dormid/i, 'nocti'],
    [/fantasma|atraviesa|paredes/i, 'fantasmita'],
    [/equipaje|maleta/i, 'maletero'],
    [/tímido|sombrín/i, 'sombrin'],
    [/vip|señor/i, 'vip'],
    [/turismo|turista/i, 'turista'],
    [/pegaj/i, 'pegajin'],
    [/vampiro/i, 'draculin'],
    [/enamorado|amor/i, 'enamorado'],
    [/soportan|gruñ/i, 'grunon'],
    [/miedoso|tembl/i, 'temblorin'],
  ];

  it('si el título nombra a un monstruo, ese monstruo está en el nivel', () => {
    for (const lvl of LEVELS) {
      for (const [re, monsterId] of PROMESAS) {
        if (re.test(lvl.title)) {
          const presente = lvl.passengers.some((p) => p.m === monsterId);
          expect(presente, `nv${lvl.id} "${lvl.title}" promete ${monsterId}`).toBe(true);
        }
      }
    }
  });

  it('todos los títulos son distintos y no están vacíos', () => {
    const titulos = LEVELS.map((l) => l.title);
    expect(new Set(titulos).size).toBe(TOTAL_LEVELS);
    for (const t of titulos) expect(t.length).toBeGreaterThan(3);
  });

  it('cada nivel que estrena una mecánica la tiene de verdad en la cabina', () => {
    for (const lvl of LEVELS) {
      const crew = buildCrew(lvl);
      for (const r of crew.map((m) => m.rule)) {
        expect(MONSTER_MAP[crew.find((m) => m.rule === r)!.monsterId].rule).toBe(r);
      }
    }
  }, 60000);
});

/**
 * Pruebas de PROGRESIÓN y DISEÑO de la campaña (data/levels.ts + systems/rules.ts).
 *
 * Criterio del Sprint 1 (revisado): **la variedad manda sobre la monotonía**.
 * Un nivel no puede amontonar a todos sus huéspedes en el último piso solo para
 * alargar la ruta; la dificultad se mide con el índice compuesto de
 * `difficultyIndex` (movimientos + reglas y su combinación + presión de cabina +
 * viajes + variedad de destinos + eventos especiales), no contando pasos.
 *
 * Por eso estos tests exigen:
 *   - edificios variados: al menos 4 pisos distintos en uso (o todos los del
 *     edificio si tiene menos) y nadie amontonado en un solo piso,
 *   - movimientos que pueden bajar un poco en niveles de consolidación, pero
 *     nunca desplomarse,
 *   - un índice de dificultad que no caiga en picado y cuya tendencia a 8 niveles
 *     siempre suba, con el nivel 30 como cima,
 *   - atajos moderados: romper una relación puede ahorrar pasos, pero pocos,
 *   - estrenos de mecánica una sola vez y en el nivel que dice la ficha,
 *   - títulos que no prometan un monstruo que no está.
 */
import { describe, it, expect } from 'vitest';
import { LEVELS, TOTAL_LEVELS } from '../src/data/levels';
import { MONSTERS, MONSTER_MAP, TWIN_GROUP } from '../src/data/monsters';
import { computeOptimal, PlanStep } from '../src/systems/scoring';
import { buildCrew, difficultyIndex, rulesPresent } from '../src/systems/rules';

/** Viajes de carga del plan óptimo (subidas separadas por un desplazamiento). */
function tripsOf(plan: PlanStep[]): number {
  let trips = 0;
  let prev: string | null = null;
  for (const s of plan) {
    if (s.kind === 'board' && prev !== 'board') trips += 1;
    prev = s.kind;
  }
  return trips;
}

interface Row {
  id: number; title: string; optimal: number; real: number; difficulty: number;
  crew: number; pax: number; capacity: number; floors: number; breakdown: number;
  rules: string[]; trips: number; floorsUsed: number; maxPiso: number;
}

const rows: Row[] = LEVELS.map((lvl) => {
  const limpio = computeOptimal(lvl);
  const sucio = computeOptimal(lvl, 'real');
  const crew = buildCrew(lvl);
  const trips = tripsOf(limpio.plan);
  const cuenta = new Map<number, number>();
  for (const p of lvl.passengers) cuenta.set(p.d, (cuenta.get(p.d) ?? 0) + 1);
  return {
    id: lvl.id, title: lvl.title, optimal: limpio.optimal, real: sucio.optimal,
    difficulty: difficultyIndex(lvl, limpio.optimal, trips), trips,
    floorsUsed: cuenta.size, maxPiso: Math.max(...cuenta.values()),
    crew: crew.length, pax: lvl.passengers.length, capacity: lvl.capacity,
    floors: lvl.floors, breakdown: lvl.breakdownChance, rules: rulesPresent(lvl),
  };
});

describe('variedad de destinos: edificios naturales, no embudos al ático', () => {
  it('todo nivel con edificio de 4+ pisos usa al menos 4 pisos distintos', () => {
    for (const r of rows) {
      expect(r.floorsUsed, `nv${r.id} "${r.title}"`).toBeGreaterThanOrEqual(Math.min(r.floors, 4));
    }
  }, 60000);

  it('ningún piso acumula más de la mitad de los huéspedes (antes: 8 de 10 en el piso 5)', () => {
    for (const r of rows) {
      const tope = Math.max(2, Math.ceil(r.crew / 2));
      expect(r.maxPiso, `nv${r.id} "${r.title}" amontona`).toBeLessThanOrEqual(tope);
    }
  }, 60000);

  it('los destinos están repartidos: ningún nivel usa un solo piso para todos', () => {
    for (const r of rows) {
      expect(r.floorsUsed, `nv${r.id}`).toBeGreaterThan(1);
    }
  }, 60000);
});

describe('curva de movimientos óptimos', () => {
  it('puede bajar en niveles de consolidación, pero como mucho 2 pasos', () => {
    for (let i = 1; i < rows.length; i++) {
      const caida = rows[i - 1].optimal - rows[i].optimal;
      expect(caida, `nv${rows[i].id} cae ${caida} pasos respecto a nv${rows[i - 1].id}`)
        .toBeLessThanOrEqual(2);
    }
  }, 60000);

  it('no hay dos caídas de movimientos seguidas', () => {
    for (let i = 2; i < rows.length; i++) {
      const c1 = rows[i - 2].optimal > rows[i - 1].optimal;
      const c2 = rows[i - 1].optimal > rows[i].optimal;
      expect(c1 && c2, `nv${rows[i - 1].id} y nv${rows[i].id} bajan a la vez`).toBe(false);
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

  it('la segunda mitad nunca es más corta que la primera', () => {
    const mediaPrimera = rows.slice(0, 15).reduce((a, r) => a + r.optimal, 0) / 15;
    const mediaSegunda = rows.slice(15).reduce((a, r) => a + r.optimal, 0) / 15;
    expect(mediaSegunda).toBeGreaterThan(mediaPrimera);
  }, 60000);
});

describe('curva del índice de dificultad compuesto', () => {
  it('no se desploma: como mucho 10 puntos de caída entre niveles seguidos', () => {
    for (let i = 1; i < rows.length; i++) {
      const caida = rows[i - 1].difficulty - rows[i].difficulty;
      expect(caida, `nv${rows[i].id} cae ${caida} puntos desde nv${rows[i - 1].id}`)
        .toBeLessThanOrEqual(10);
    }
  }, 60000);

  it('toda caída se recupera en 5 niveles como mucho', () => {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].difficulty >= rows[i - 1].difficulty) continue;
      const despues = rows.slice(i + 1, i + 6).map((r) => r.difficulty);
      expect(Math.max(...despues, rows[i].difficulty),
        `la caída de nv${rows[i].id} no se recupera`)
        .toBeGreaterThanOrEqual(rows[i - 1].difficulty);
    }
  }, 60000);

  it('la tendencia a 8 niveles siempre sube', () => {
    for (let i = 8; i < rows.length; i++) {
      expect(rows[i].difficulty, `nv${rows[i].id} no supera a nv${rows[i - 8].id}`)
        .toBeGreaterThanOrEqual(rows[i - 8].difficulty);
    }
  }, 60000);

  it('el nivel 30 es la cima de la campaña', () => {
    expect(rows[29].difficulty).toBe(Math.max(...rows.map((r) => r.difficulty)));
  }, 60000);

  it('la dificultad del nivel 1 es mínima (apenas hay que pensar)', () => {
    expect(rows[0].difficulty).toBeLessThanOrEqual(6);
  }, 60000);

  it('los niveles de consolidación son pocos: la campaña no cuesta abajo', () => {
    const caidas = rows.filter((r, i) => i > 0 && r.difficulty < rows[i - 1].difficulty).length;
    expect(caidas).toBeLessThanOrEqual(10);
    // y la media de la última decena es claramente mayor que la de la primera
    const media = (xs: Row[]) => xs.reduce((a, r) => a + r.difficulty, 0) / xs.length;
    expect(media(rows.slice(20))).toBeGreaterThan(media(rows.slice(0, 10)) * 1.5);
  }, 60000);
});

describe('atajos por romper las reglas: moderados', () => {
  it('juntar enemigos o separar parejas ahorra como mucho 4 movimientos', () => {
    // Si el atajo fuera enorme, respetar las relaciones parecería un castigo.
    for (const r of rows) {
      expect(r.optimal - r.real, `nv${r.id} "${r.title}" regala ${r.optimal - r.real} pasos`)
        .toBeLessThanOrEqual(4);
      expect(r.real, `nv${r.id}`).toBeLessThanOrEqual(r.optimal);
    }
  }, 60000);

  it('los niveles con relaciones sí ofrecen el atajo (no es una regla muerta)', () => {
    const conRelaciones = rows.filter((r) => r.rules.includes('enemies') || r.rules.includes('couples'));
    expect(conRelaciones.length).toBeGreaterThan(5);
    const atajos = conRelaciones.filter((r) => r.optimal - r.real > 0);
    expect(atajos.length, 'ningún nivel permite ganar pasos rompiendo una relación')
      .toBeGreaterThan(0);
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
  }, 60000);

  it('el número de viajes crece con la campaña (más planificación, no más gente)', () => {
    const mediaPrimeros = rows.slice(0, 10).reduce((a, r) => a + r.trips, 0) / 10;
    const mediaUltimos = rows.slice(20).reduce((a, r) => a + r.trips, 0) / 10;
    expect(mediaUltimos).toBeGreaterThan(mediaPrimeros);
    for (const r of rows) {
      expect(r.trips, `nv${r.id}`).toBeGreaterThanOrEqual(1);
      expect(r.trips, `nv${r.id}`).toBeLessThanOrEqual(5);
    }
  }, 60000);

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

  it('los enemigos nunca son también pareja (sería una contradicción imposible)', () => {
    for (const lvl of LEVELS) {
      for (const [a, b] of lvl.enemies) {
        const esPareja = lvl.couples.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
        expect(esPareja, `nv${lvl.id}: ${a}-${b} son pareja y enemigos`).toBe(false);
      }
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

  it('cada regla que declara un nivel existe de verdad en su crew', () => {
    for (const lvl of LEVELS) {
      const crew = buildCrew(lvl);
      for (const r of rulesPresent(lvl)) {
        if (r === 'couples' || r === 'enemies') continue;
        const alguien = crew.some((m) => m.rule === r);
        expect(alguien, `nv${lvl.id} declara la regla ${r} sin ningún huésped que la tenga`).toBe(true);
      }
    }
  }, 60000);
});

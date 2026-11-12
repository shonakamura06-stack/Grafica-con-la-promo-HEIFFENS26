/**
 * Pruebas de las REGLAS COMPARTIDAS (systems/rules.ts).
 *
 * Este es el módulo que consultan a la vez el solver y GameScene, así que cada
 * regla social del juego se prueba aquí una sola vez y vale para los dos lados.
 * Antes las reglas estaban duplicadas (una copia en scoring.ts y otra en
 * GameScene.ts) y tres de ellas ya se habían separado.
 */
import { describe, it, expect } from 'vitest';
import {
  buildCrew, canBoard, canExit, creaturesOf, slotsOf, rulesPresent, newRulesIn,
  difficultyIndex, CrewMember,
} from '../src/systems/rules';
import { LevelDef } from '../src/data/levels';
import { LEVELS } from '../src/data/levels';
import { MONSTER_MAP } from '../src/data/monsters';

const L = (
  passengers: Array<[string, number]>,
  opts: Partial<LevelDef> = {},
): LevelDef => ({
  id: 99, title: 'test', floors: 3, capacity: 3, timeLimit: 120, breakdownChance: 0,
  couples: [], enemies: [],
  passengers: passengers.map(([m, d]) => ({ m, d })),
  ...opts,
});

/** Ids del crew que cumplen una regla (para leer los tests sin contar índices). */
const idOf = (crew: CrewMember[], monsterId: string, nth = 0): number =>
  crew.filter((m) => m.monsterId === monsterId)[nth].id;

const ok = (crew: CrewMember[], id: number, inCab: number[], cap: number, policy: 'clean' | 'real' = 'real', waiting?: number[]) =>
  canBoard(crew, id, inCab, cap, policy, waiting);

describe('buildCrew: la lista de unidades que ven el motor y el solver', () => {
  it('un monstruo normal es una unidad de 1 lugar y 1 criatura', () => {
    const crew = buildCrew(L([['bubu', 2]]));
    expect(crew).toHaveLength(1);
    expect(crew[0]).toMatchObject({ monsterId: 'bubu', dest: 2, slots: 1, creatures: 1, rule: 'none' });
  });

  it('los gemelos se fusionan en UNA unidad de 2 lugares y 2 criaturas', () => {
    const crew = buildCrew(L([['gemelos', 3], ['gemelos', 3]]));
    expect(crew).toHaveLength(1);
    expect(crew[0].slots).toBe(2);
    expect(crew[0].creatures).toBe(2);
    expect(crew[0].orig).toEqual([0, 1]);
  });

  it('el gigante y el maletero ocupan 2 lugares; el fantasma ninguno', () => {
    const crew = buildCrew(L([['gordito', 1], ['maletero', 2], ['fantasmita', 3]]));
    expect(slotsOf(crew, [0])).toBe(2);
    expect(slotsOf(crew, [1])).toBe(2);
    expect(slotsOf(crew, [2])).toBe(0);
    expect(creaturesOf(crew, [2])).toBe(1);
  });

  it('las parejas y los enemigos se mapean a ids del crew aunque haya gemelos delante', () => {
    // Los gemelos se mueven al FINAL del crew, así que los índices originales
    // 2 y 3 dejan de coincidir con los ids: este es el caso que rompía antes.
    const crew = buildCrew(L(
      [['gemelos', 1], ['gemelos', 1], ['enamorado', 2], ['enamorado', 2], ['grunon', 3], ['bubu', 3]],
      { couples: [[2, 3]], enemies: [[4, 5]] },
    ));
    const enam = crew.filter((m) => m.monsterId === 'enamorado').map((m) => m.id);
    expect(crew[enam[0]].coupleId).toBe(enam[1]);
    expect(crew[enam[1]].coupleId).toBe(enam[0]);
    const grunon = idOf(crew, 'grunon');
    const bubu = idOf(crew, 'bubu');
    expect(crew[grunon].enemyIds).toEqual([bubu]);
    expect(crew[bubu].enemyIds).toEqual([grunon]);
  });

  it('los mejores amigos (dúo) quedan emparejados entre sí', () => {
    const crew = buildCrew(L([['pegajin', 1], ['bubu', 2], ['pegajon', 3]]));
    const a = idOf(crew, 'pegajin');
    const b = idOf(crew, 'pegajon');
    expect(crew[a].partnerId).toBe(b);
    expect(crew[b].partnerId).toBe(a);
  });

  it('el sonámbulo marca needsWake (hay que tocarlo para que salga)', () => {
    const crew = buildCrew(L([['nocti', 2], ['bubu', 1]]));
    expect(crew[idOf(crew, 'nocti')].needsWake).toBe(true);
    expect(crew[idOf(crew, 'bubu')].needsWake).toBe(false);
  });

  it('en los 30 niveles el crew nunca deja a nadie fuera ni duplica índices', () => {
    for (const lvl of LEVELS) {
      const crew = buildCrew(lvl);
      const allOrig = crew.flatMap((m) => m.orig).sort((a, b) => a - b);
      expect(allOrig, `nivel ${lvl.id}`).toEqual(lvl.passengers.map((_, i) => i));
      expect(crew.map((m) => m.id), `nivel ${lvl.id}`).toEqual(crew.map((_, i) => i));
    }
  });
});

describe('regla: tímido (Sombrín)', () => {
  it('no sube si hay alguien dentro', () => {
    const crew = buildCrew(L([['sombrin', 2], ['bubu', 1]]));
    const shy = idOf(crew, 'sombrin');
    const v = ok(crew, shy, [idOf(crew, 'bubu')], 3);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('shyWaiting');
  });

  it('mientras él está dentro no sube nadie más', () => {
    const crew = buildCrew(L([['sombrin', 2], ['bubu', 1]]));
    const v = ok(crew, idOf(crew, 'bubu'), [idOf(crew, 'sombrin')], 3);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('shyInside');
  });

  it('sube solo con la cabina vacía', () => {
    const crew = buildCrew(L([['sombrin', 2], ['bubu', 1]]));
    expect(ok(crew, idOf(crew, 'sombrin'), [], 3).ok).toBe(true);
  });

  it('cuenta también a los que están SUBIENDO (dos toques rápidos no cuelan a nadie)', () => {
    // Este es el caso que el motor se saltaba: solo miraba state==='onboard' y la
    // animación de subida dura 420 ms, tiempo de sobra para un segundo toque.
    const crew = buildCrew(L([['bubu', 1], ['sombrin', 2]]));
    const boarding = [idOf(crew, 'bubu')]; // a bordo en la animación, no en 'onboard'
    const v = ok(crew, idOf(crew, 'sombrin'), boarding, 3);
    expect(v.ok).toBe(false);
  });
});

describe('regla: capacidad, gigante, maletas y fantasma', () => {
  it('no cabe si suma más lugares que la capacidad', () => {
    const crew = buildCrew(L([['bubu', 1], ['chispa', 1], ['moco', 1]], { capacity: 2 }));
    const inCab = [crew[0].id, crew[1].id];
    const v = ok(crew, crew[2].id, inCab, 2);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('full');
  });

  it('el gigante ocupa 2 lugares: con 2 ya ocupados no entra', () => {
    const crew = buildCrew(L([['bubu', 1], ['chispa', 1], ['gordito', 2]], { capacity: 3 }));
    const v = ok(crew, idOf(crew, 'gordito'), [crew[0].id, crew[1].id], 3);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('full');
  });

  it('el gigante sí entra con un solo lugar ocupado', () => {
    const crew = buildCrew(L([['bubu', 1], ['gordito', 2]], { capacity: 3 }));
    expect(ok(crew, idOf(crew, 'gordito'), [crew[0].id], 3).ok).toBe(true);
  });

  it('el fantasma ocupa 0 lugares: cabe con el ascensor lleno', () => {
    const crew = buildCrew(L([['bubu', 1], ['chispa', 1], ['moco', 1], ['fantasmita', 2]], { capacity: 3 }));
    const v = ok(crew, idOf(crew, 'fantasmita'), [crew[0].id, crew[1].id, crew[2].id], 3);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.board).toEqual([idOf(crew, 'fantasmita')]);
  });

  it('el maletero ocupa 2 lugares por sus maletas', () => {
    const crew = buildCrew(L([['maletero', 1], ['bubu', 2]], { capacity: 3 }));
    expect(ok(crew, idOf(crew, 'maletero'), [idOf(crew, 'bubu')], 3).ok).toBe(true);
    const crew2 = buildCrew(L([['maletero', 1], ['bubu', 2], ['chispa', 3]], { capacity: 3 }));
    expect(ok(crew2, idOf(crew2, 'maletero'), [crew2[1].id, crew2[2].id], 3).ok).toBe(false);
  });
});

describe('regla: miedoso (Temblorín)', () => {
  it('con él dentro solo viajan 2 criaturas', () => {
    const crew = buildCrew(L([['temblorin', 1], ['bubu', 2], ['chispa', 3]], { capacity: 4 }));
    const fear = idOf(crew, 'temblorin');
    expect(ok(crew, fear, [idOf(crew, 'bubu')], 4).ok).toBe(true);
    const v = ok(crew, fear, [idOf(crew, 'bubu'), idOf(crew, 'chispa')], 4);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('fear');
  });

  it('nadie más puede subir si Temblorín ya está dentro y son 2', () => {
    const crew = buildCrew(L([['temblorin', 1], ['bubu', 2], ['chispa', 3]], { capacity: 4 }));
    const v = ok(crew, idOf(crew, 'chispa'), [idOf(crew, 'temblorin'), idOf(crew, 'bubu')], 4);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('fear');
  });

  it('los GEMELOS cuentan como 2 criaturas (el motor los contaba como 1)', () => {
    // Divergencia real corregida: los gemelos son un solo pasajero-grupo pero son
    // dos monstruos, y Temblorín se asusta igual.
    const crew = buildCrew(L([['temblorin', 1], ['gemelos', 2], ['gemelos', 2]], { capacity: 4 }));
    const v = ok(crew, idOf(crew, 'temblorin'), [idOf(crew, 'gemelos')], 4);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('fear');
  });

  it('con sitio de sobra, Temblorín viaja con un acompañante', () => {
    const crew = buildCrew(L([['temblorin', 1], ['bubu', 2]], { capacity: 4 }));
    expect(ok(crew, idOf(crew, 'temblorin'), [idOf(crew, 'bubu')], 4).ok).toBe(true);
  });
});

describe('regla: dúo pegajoso (Pegajín y Pegajón)', () => {
  it('suben los dos con un solo toque', () => {
    const crew = buildCrew(L([['pegajin', 1], ['pegajon', 3], ['bubu', 2]]));
    const v = ok(crew, idOf(crew, 'pegajin'), [], 3);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.board.sort()).toEqual([idOf(crew, 'pegajin'), idOf(crew, 'pegajon')].sort());
  });

  it('si no caben los dos, no sube ninguno', () => {
    const crew = buildCrew(L([['pegajin', 1], ['pegajon', 3], ['bubu', 2]], { capacity: 2 }));
    const v = ok(crew, idOf(crew, 'pegajin'), [idOf(crew, 'bubu')], 2);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('partnerSpace');
  });

  it('si su amigo YA llegó a su piso, sube solo (no lo resucita)', () => {
    // El motor solo llama al amigo que sigue en la cola; el solver antiguo cargaba
    // siempre los 2 lugares aunque el amigo ya estuviera entregado.
    const crew = buildCrew(L([['pegajin', 1], ['pegajon', 3], ['bubu', 2]], { capacity: 2 }));
    const pegajin = idOf(crew, 'pegajin');
    const waiting = [pegajin, idOf(crew, 'bubu')]; // pegajon ya entregado
    const v = canBoard(crew, pegajin, [], 2, 'real', waiting);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.board).toEqual([pegajin]);
  });
});

describe('regla: enemigos (regla BLANDA)', () => {
  const crew = () => buildCrew(L([['grunon', 2], ['bubu', 2]], { enemies: [[0, 1]] }));

  it("en ruta 'real' SÍ pueden viajar juntos, con penalización", () => {
    const c = crew();
    const v = canBoard(c, idOf(c, 'grunon'), [idOf(c, 'bubu')], 3, 'real');
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.penalties).toContain('enemyRide');
  });

  it("en ruta 'clean' el solver los separa (es la ruta que se premia)", () => {
    const c = crew();
    const v = canBoard(c, idOf(c, 'grunon'), [idOf(c, 'bubu')], 3, 'clean');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('enemyOnboard');
  });

  it('sin enemigo a bordo no hay penalización', () => {
    const c = crew();
    const v = canBoard(c, idOf(c, 'grunon'), [], 3, 'real');
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.penalties).toEqual([]);
  });
});

describe('salida del ascensor (canExit)', () => {
  it('en un piso que no es el suyo no sale', () => {
    const crew = buildCrew(L([['bubu', 2]]));
    const v = canExit(crew, crew[0].id, 1, [crew[0].id], true, 'real');
    expect(v.exits).toBe(false);
    if (!v.exits) expect(v.reason).toBe('wrongFloor');
  });

  it('el sonámbulo dormido no sale: hay que despertarlo', () => {
    const crew = buildCrew(L([['nocti', 2]]));
    const asleep = canExit(crew, crew[0].id, 2, [crew[0].id], false, 'real');
    expect(asleep.exits).toBe(false);
    if (!asleep.exits) expect(asleep.reason).toBe('asleep');
    expect(canExit(crew, crew[0].id, 2, [crew[0].id], true, 'real').exits).toBe(true);
  });

  it("la pareja sale junta en ruta 'clean'; sola no sale", () => {
    const crew = buildCrew(L([['enamorado', 2], ['enamorado', 2], ['bubu', 1]], { couples: [[0, 1]] }));
    const a = crew[0].id;
    const only = [a]; // su pareja no está a bordo
    const clean = canExit(crew, a, 2, only, true, 'clean');
    expect(clean.exits).toBe(false);
    if (!clean.exits) expect(clean.reason).toBe('coupleAlone');
  });

  it("en ruta 'real' la pareja separada sale, pero cuesta 1 estrella", () => {
    const crew = buildCrew(L([['enamorado', 2], ['enamorado', 2], ['bubu', 1]], { couples: [[0, 1]] }));
    const v = canExit(crew, crew[0].id, 2, [crew[0].id], true, 'real');
    expect(v.exits).toBe(true);
    if (v.exits) expect(v.penalties).toContain('coupleSeparated');
  });

  it('la pareja junta sale sin penalización', () => {
    const crew = buildCrew(L([['enamorado', 2], ['enamorado', 2]], { couples: [[0, 1]] }));
    const both = [crew[0].id, crew[1].id];
    const v = canExit(crew, crew[0].id, 2, both, true, 'real');
    expect(v.exits).toBe(true);
    if (v.exits) expect(v.penalties).toEqual([]);
  });
});

describe('inventario de reglas de un nivel', () => {
  it('lista las reglas de monstruo y las relaciones', () => {
    const r = rulesPresent(L([['sombrin', 1], ['enamorado', 2], ['enamorado', 2], ['grunon', 3], ['bubu', 1]],
      { couples: [[1, 2]], enemies: [[3, 4]] }));
    expect(r.sort()).toEqual(['couples', 'enemies', 'shy'].sort());
  });

  it('un nivel sin reglas especiales no tiene ninguna', () => {
    expect(rulesPresent(L([['bubu', 1], ['chispa', 2]]))).toEqual([]);
  });

  it('detecta la mecánica nueva de un nivel respecto a los anteriores', () => {
    expect(newRulesIn(LEVELS[8], LEVELS)).toContain('shy');       // nv9: Sombrín
    expect(newRulesIn(LEVELS[11], LEVELS)).toContain('couples');  // nv12: enamorados
    expect(newRulesIn(LEVELS[0], LEVELS)).toEqual([]);            // nv1: nada nuevo
  });

  it('una mecánica se estrena UNA sola vez en toda la campaña', () => {
    const intros = new Map<string, number>();
    for (const lvl of LEVELS) {
      for (const r of newRulesIn(lvl, LEVELS)) {
        expect(intros.has(r), `${r} se estrena dos veces (nv${intros.get(r)} y nv${lvl.id})`).toBe(false);
        intros.set(r, lvl.id);
      }
    }
  });
});

describe('índice de dificultad', () => {
  it('sube con los movimientos, las reglas, la presión de cabina y las averías', () => {
    const base = L([['bubu', 1], ['chispa', 2], ['moco', 3]]);
    const d = (lvl: LevelDef, optimal: number, crew: number) => difficultyIndex(lvl, optimal, crew);
    expect(d(base, 10, 3)).toBeLessThan(d(base, 12, 3));                    // más movimientos
    expect(d(base, 10, 3)).toBeLessThan(d(base, 10, 6));                    // más presión
    const conShy = L([['sombrin', 1], ['chispa', 2], ['moco', 3]]);
    expect(d(base, 10, 3)).toBeLessThan(d(conShy, 10, 3));                  // más reglas
    const conAveria = L([['bubu', 1], ['chispa', 2], ['moco', 3]], { breakdownChance: 0.4 });
    expect(d(base, 10, 3)).toBeLessThan(d(conAveria, 10, 3));               // averías
  });

  it('la presión de cabina nunca es negativa', () => {
    const lvl = L([['bubu', 1]], { capacity: 4 });
    expect(difficultyIndex(lvl, 1, 1)).toBe(1);
  });
});

describe('cobertura de reglas: ninguna regla social se queda sin probar', () => {
  // Lista mantenida a mano con las reglas que ESTE archivo prueba. El test de abajo
  // la compara con las reglas que existen de verdad en el juego: si alguien añade un
  // monstruo con una regla nueva y no escribe su prueba, esto falla.
  const PROBADAS: string[] = [
    'shy',          // tímido: sube con la cabina vacía y nadie sube con él
    'giant',        // gigante: ocupa 2 lugares
    'luggage',      // maletero: ocupa 2 lugares
    'ghost',        // fantasma: ocupa 0 lugares
    'twins',        // gemelos: 1 unidad, 2 criaturas, mismo destino
    'duo',          // dúo pegajoso: suben juntos con un toque, bajan por separado
    'fear',         // miedoso: como mucho 2 criaturas con él dentro
    'sleepwalker',  // sonámbulo: se duerme y hay que tocarlo para que salga
    'couples',      // pareja enamorada: mismo destino, salen juntos
    'enemies',      // enemigos: blanda en el juego real, dura en la ruta limpia
  ];

  it('todas las reglas de monstruo del juego tienen su prueba aquí', () => {
    const delJuego = new Set<string>(Object.values(MONSTER_MAP).map((m) => m.rule));
    delJuego.delete('none');
    for (const r of ['couples', 'enemies']) delJuego.add(r);
    const sinProbar = [...delJuego].filter((r) => !PROBADAS.includes(r));
    expect(sinProbar, 'reglas sin prueba en tests/rules.test.ts').toEqual([]);
    // y al revés: ninguna prueba huérfana de una regla que ya no existe
    const inventadas = PROBADAS.filter((r) => !delJuego.has(r));
    expect(inventadas, 'pruebas de reglas que no existen').toEqual([]);
  });

  it('ninguna regla es código muerto: todas aparecen en algún nivel de la campaña', () => {
    const presentes = new Set<string>();
    for (const lvl of LEVELS) for (const r of rulesPresent(lvl)) presentes.add(r);
    for (const r of PROBADAS) {
      expect(presentes.has(r), `la regla ${r} no se juega en ningún nivel`).toBe(true);
    }
  });

  it('cada regla se estrena una sola vez y ese estreno está en la campaña', () => {
    // newRulesIn devuelve las mecánicas que no existían en ningún nivel anterior.
    const estrenos = LEVELS.flatMap((lvl) => newRulesIn(lvl, LEVELS));
    expect(new Set(estrenos).size, 'una mecánica se estrena dos veces').toBe(estrenos.length);
    for (const r of PROBADAS) expect(estrenos, `la regla ${r} no se estrena nunca`).toContain(r);
  });
});

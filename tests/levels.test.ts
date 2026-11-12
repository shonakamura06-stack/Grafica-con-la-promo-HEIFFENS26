/**
 * Pruebas de integridad de los 30 niveles y de los datos de monstruos.
 *
 * Además de comprobar los datos, este archivo REPRODUCE el plan óptimo paso a paso
 * usando las MISMAS reglas que consultan el motor y el solver (systems/rules.ts).
 * Antes tenía su propia copia de las reglas, con un `if (rule === 'shy' || true)`
 * que hacía que la comprobación de salida no filtrara nada, y un test de "vidas"
 * con el cuerpo vacío que pasaba sin comprobar nada. Los dos han desaparecido.
 */
import { describe, it, expect } from 'vitest';
import { LEVELS, TOTAL_LEVELS, LevelDef } from '../src/data/levels';
import { MONSTERS, MONSTER_MAP } from '../src/data/monsters';
import { computeOptimal, PlanStep } from '../src/systems/scoring';
import { buildCrew, canBoard, canExit, Penalty } from '../src/systems/rules';

/**
 * Reproduce un plan con las reglas reales del juego (policy 'real': lo que el
 * motor permite de verdad, penalizaciones incluidas). Devuelve lo entregado, la
 * distancia recorrida, los avisos de reglas blandas y cualquier violación dura.
 */
function replay(level: LevelDef, plan: PlanStep[], policy: 'clean' | 'real' = 'real') {
  const crew = buildCrew(level);
  const inCab: number[] = [];
  const delivered = new Set<number>();
  const penalties: Penalty[] = [];
  const violations: string[] = [];
  let pos = 0;
  let distance = 0;

  for (const step of plan) {
    if (step.kind === 'board') {
      if (pos !== 0) violations.push(`sube fuera de recepción (piso ${pos})`);
      if (delivered.has(step.pax)) violations.push(`vuelve a subir a alguien ya entregado`);
      if (inCab.includes(step.pax)) violations.push(`sube dos veces a la misma unidad`);
      const waiting = crew.map((m) => m.id).filter((id) => !delivered.has(id) && !inCab.includes(id));
      const v = canBoard(crew, step.pax, inCab, level.capacity, policy, waiting);
      if (!v.ok) { violations.push(`subida bloqueada: ${v.reason}`); continue; }
      penalties.push(...v.penalties);
      for (const id of v.board) {
        if (delivered.has(id)) violations.push(`el dúo resucita a alguien entregado`);
        inCab.push(id);
      }
      const slots = inCab.reduce((a, id) => a + crew[id].slots, 0);
      if (slots > level.capacity) violations.push(`capacidad excedida (${slots}/${level.capacity})`);
    } else {
      distance += Math.abs(step.floor - pos);
      pos = step.floor;
      if (step.floor < 0 || step.floor > level.floors) violations.push(`viaja a un piso inexistente (${step.floor})`);
      // Al llegar: el sonámbulo se duerme y hay que despertarlo (segundo intento).
      //
      // OJO: esto replica GameScene.arrive(), que hace una FOTO de la cabina
      // (`const inCab = this.cabIds()`) y decide con esa foto para TODOS los que
      // llegan. Si se fuera quitando a cada pasajero sobre la marcha, el segundo
      // miembro de una pareja vería que su pareja "ya no está" y canExit lo
      // rechazaría (coupleAlone) o lo contaría como separación (coupleSeparated):
      // un fallo de la réplica que parecería un fallo del solver.
      for (const pass of [false, true]) {
        const foto = [...inCab];
        const salen: number[] = [];
        for (const id of foto) {
          const v = canExit(crew, id, step.floor, foto, pass, policy);
          if (!v.exits) {
            if (pass && v.reason === 'asleep') violations.push('un sonámbulo no salió ni despierto');
            continue;
          }
          penalties.push(...v.penalties);
          salen.push(id);
        }
        for (const id of salen) {
          delivered.add(id);
          inCab.splice(inCab.indexOf(id), 1);
        }
      }
    }
  }
  return { delivered, distance, penalties, violations, inCab };
}

describe('datos de niveles', () => {
  it('hay exactamente 30 niveles con ids 1..30', () => {
    expect(TOTAL_LEVELS).toBe(30);
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('todos los pasajeros usan monstruos existentes y destinos válidos', () => {
    for (const lvl of LEVELS) {
      expect(lvl.passengers.length, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(3);
      expect(lvl.passengers.length, `nivel ${lvl.id}`).toBeLessThanOrEqual(10);
      expect(lvl.capacity).toBeGreaterThanOrEqual(3);
      expect(lvl.capacity).toBeLessThanOrEqual(4);
      expect(lvl.floors).toBeGreaterThanOrEqual(2);
      expect(lvl.floors).toBeLessThanOrEqual(5);
      for (const p of lvl.passengers) {
        expect(MONSTER_MAP[p.m], `nivel ${lvl.id}: monstruo ${p.m}`).toBeDefined();
        expect(p.d, `nivel ${lvl.id}: ${p.m}`).toBeGreaterThanOrEqual(1);
        expect(p.d, `nivel ${lvl.id}: ${p.m}`).toBeLessThanOrEqual(lvl.floors);
      }
    }
  });

  it('los gemelos siempre aparecen en pareja con el mismo destino', () => {
    for (const lvl of LEVELS) {
      const twins = lvl.passengers.filter((p) => p.m === 'gemelos');
      if (twins.length > 0) {
        expect(twins.length, `nivel ${lvl.id}`).toBe(2);
        expect(twins[0].d).toBe(twins[1].d);
      }
    }
  });

  it('las parejas enamoradas tienen el mismo destino y índices válidos', () => {
    for (const lvl of LEVELS) {
      for (const [a, b] of lvl.couples) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(lvl.passengers.length);
        expect(b).toBeLessThan(lvl.passengers.length);
        expect(a).not.toBe(b);
        expect(lvl.passengers[a].d, `nivel ${lvl.id}`).toBe(lvl.passengers[b].d);
        expect(lvl.passengers[a].m, `nivel ${lvl.id}`).toBe('enamorado');
      }
    }
  });

  it('los enemigos tienen índices válidos y distintos', () => {
    for (const lvl of LEVELS) {
      for (const [a, b] of lvl.enemies) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(lvl.passengers.length);
        expect(b).toBeLessThan(lvl.passengers.length);
        expect(a).not.toBe(b);
      }
    }
  });

  it('tiempo y averías tienen valores razonables', () => {
    // La calibración fina (margen para dos errores, coincidencia con el modelo)
    // se comprueba en tests/timing.test.ts; aquí solo los límites duros.
    for (const lvl of LEVELS) {
      expect(lvl.timeLimit, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(40);
      expect(lvl.timeLimit, `nivel ${lvl.id}`).toBeLessThanOrEqual(300);
      expect(lvl.breakdownChance, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(0);
      expect(lvl.breakdownChance, `nivel ${lvl.id}`).toBeLessThanOrEqual(0.5);
    }
  });

  it('la campaña no tiene vidas: ningún nivel guarda el campo "lives"', () => {
    // Sustituye al test decorativo que tenía el bucle vacío. La Economía V3 dejó
    // la campaña sin vidas y el Modo Desafío las pone en LevelSelectScene, no aquí.
    for (const lvl of LEVELS) {
      expect('lives' in lvl, `nivel ${lvl.id} vuelve a tener vidas`).toBe(false);
      expect((lvl as unknown as Record<string, unknown>).lives, `nivel ${lvl.id}`).toBeUndefined();
    }
  });

  it('la capacidad permite siempre subir a un gigante o a los gemelos', () => {
    for (const lvl of LEVELS) {
      const hasGiant = lvl.passengers.some((p) => p.m === 'gordito');
      const hasTwins = lvl.passengers.some((p) => p.m === 'gemelos');
      if (hasGiant || hasTwins) expect(lvl.capacity, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('todos los niveles son completables y el óptimo es finito y positivo', () => {
    for (const lvl of LEVELS) {
      const { optimal } = computeOptimal(lvl);
      expect(Number.isFinite(optimal), `nivel ${lvl.id}`).toBe(true);
      expect(optimal, `nivel ${lvl.id}`).toBeGreaterThan(0);
      expect(optimal, `nivel ${lvl.id}`).toBeLessThan(Number.MAX_SAFE_INTEGER);
    }
  }, 60000);

  it('la dificultad progresa: el nivel 30 tiene más pasajeros que el nivel 1', () => {
    expect(LEVELS[29].passengers.length).toBeGreaterThan(LEVELS[0].passengers.length);
    expect(LEVELS[29].floors).toBeGreaterThanOrEqual(LEVELS[0].floors);
  });

  it('los monstruos especiales aparecen solo a partir de su nivel de desbloqueo', () => {
    for (const m of MONSTERS) {
      if (m.rule === 'none' && m.kind === 'none') continue;
      const firstLevel = LEVELS.find((l) => l.passengers.some((p) => p.m === m.id));
      expect(firstLevel, m.id).toBeDefined();
      expect(firstLevel!.id, m.id).toBeGreaterThanOrEqual(m.unlockLevel);
    }
  });
});

describe('datos de monstruos', () => {
  it('hay al menos 8 monstruos con ids únicos', () => {
    expect(MONSTERS.length).toBeGreaterThanOrEqual(8);
    const ids = MONSTERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada monstruo tiene nombre, personalidad y escala válida', () => {
    for (const m of MONSTERS) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.personality.length).toBeGreaterThan(10);
      expect(m.scale).toBeGreaterThan(0);
      expect(m.slots).toBeGreaterThanOrEqual(0);
    }
  });

  it('los lugares que ocupa cada monstruo cuadran con su regla', () => {
    for (const m of MONSTERS) {
      if (m.rule === 'ghost') expect(m.slots, m.id).toBe(0);
      else if (m.rule === 'giant' || m.rule === 'luggage') expect(m.slots, m.id).toBe(2);
      else expect(m.slots, m.id).toBe(1);
    }
  });
});

describe('el plan óptimo se puede jugar de verdad (solver ↔ motor)', () => {
  it('el plan limpio entrega a TODOS sin violar ninguna regla dura', () => {
    for (const lvl of LEVELS) {
      const { optimal, plan } = computeOptimal(lvl);
      const r = replay(lvl, plan, 'real');
      expect(r.violations, `nivel ${lvl.id}`).toEqual([]);
      expect(r.delivered.size, `nivel ${lvl.id}`).toBe(buildCrew(lvl).length);
      expect(r.inCab, `nivel ${lvl.id}`).toEqual([]);
      expect(r.distance, `nivel ${lvl.id}`).toBe(optimal);
    }
  }, 60000);

  it('el plan limpio NO rompe reglas blandas: ni separa parejas ni junta enemigos', () => {
    // Esto es lo que se premia con el bonus de ruta óptima, así que tiene que ser
    // una ruta sin penalizaciones. Si no, el juego diría "perfecta" de una ruta
    // que el propio juego castiga con una estrella menos.
    for (const lvl of LEVELS) {
      const { plan } = computeOptimal(lvl);
      const r = replay(lvl, plan, 'real');
      expect(r.penalties, `nivel ${lvl.id}`).toEqual([]);
    }
  }, 60000);

  it('el plan tampoco se puede ejecutar de forma ilegal bajo la política limpia', () => {
    for (const lvl of LEVELS) {
      const { plan } = computeOptimal(lvl);
      const r = replay(lvl, plan, 'clean');
      expect(r.violations, `nivel ${lvl.id}`).toEqual([]);
    }
  }, 60000);

  it('la ruta limpia nunca es más corta que la ruta que sí rompe relaciones', () => {
    for (const lvl of LEVELS) {
      const clean = computeOptimal(lvl, 'clean').optimal;
      const real = computeOptimal(lvl, 'real').optimal;
      expect(clean, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(real);
    }
  }, 60000);

  it('cuando juntar enemigos ahorra pasos, la ruta real rompe al menos una regla', () => {
    // Nivel 26 y parecidos: el solver "real" encuentra un atajo que el limpio no
    // puede usar. Ese atajo tiene que venir con su penalización, no gratis.
    let alguno = 0;
    for (const lvl of LEVELS) {
      const clean = computeOptimal(lvl, 'clean');
      const real = computeOptimal(lvl, 'real');
      if (real.optimal < clean.optimal) {
        alguno += 1;
        const r = replay(lvl, real.plan, 'real');
        expect(r.penalties.length, `nivel ${lvl.id}`).toBeGreaterThan(0);
      }
    }
    expect(alguno).toBeGreaterThan(0); // si no, la comprobación de arriba sería vacía
  }, 60000);

  it('ningún plan se sube a un sonámbulo y lo entrega sin despertarlo', () => {
    // El solver da por hecho que se despierta (no cuesta movimientos) y
    // systems/timing.ts cobra ese tiempo. Aquí se comprueba que la suposición es
    // la única diferencia: el plan termina con todos entregados.
    for (const lvl of LEVELS) {
      const crew = buildCrew(lvl);
      if (!crew.some((m) => m.needsWake)) continue;
      const { plan } = computeOptimal(lvl);
      const r = replay(lvl, plan, 'real');
      expect(r.violations, `nivel ${lvl.id}`).toEqual([]);
      expect(r.delivered.size, `nivel ${lvl.id}`).toBe(crew.length);
    }
  }, 60000);
});

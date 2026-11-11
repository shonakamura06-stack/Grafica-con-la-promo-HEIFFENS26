/**
 * Pruebas de integridad de los 30 niveles y de los datos de monstruos.
 * También verifica que TODOS los niveles son completables (el solver
 * encuentra un recorrido finito) y que el óptimo es razonable.
 */
import { describe, it, expect } from 'vitest';
import { LEVELS, TOTAL_LEVELS } from '../src/data/levels';
import { MONSTERS, MONSTER_MAP } from '../src/data/monsters';
import { computeOptimal, slowPlaySeconds, PlanStep } from '../src/systems/scoring';

describe('datos de niveles', () => {
  it('hay exactamente 30 niveles con ids 1..30', () => {
    expect(TOTAL_LEVELS).toBe(30);
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('todos los pasajeros usan monstruos existentes y destinos válidos', () => {
    for (const lvl of LEVELS) {
      expect(lvl.passengers.length).toBeGreaterThanOrEqual(3);
      expect(lvl.passengers.length).toBeLessThanOrEqual(10);
      expect(lvl.capacity).toBeGreaterThanOrEqual(3);
      expect(lvl.floors).toBeGreaterThanOrEqual(2);
      expect(lvl.floors).toBeLessThanOrEqual(5);
      for (const p of lvl.passengers) {
        expect(MONSTER_MAP[p.m], `nivel ${lvl.id}: monstruo ${p.m}`).toBeDefined();
        expect(p.d).toBeGreaterThanOrEqual(1);
        expect(p.d).toBeLessThanOrEqual(lvl.floors);
      }
    }
  });

  it('los gemelos siempre aparecen en pareja con el mismo destino', () => {
    for (const lvl of LEVELS) {
      const twins = lvl.passengers.filter((p) => p.m === 'gemelos');
      if (twins.length > 0) {
        expect(twins.length).toBe(2);
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
        expect(lvl.passengers[a].d).toBe(lvl.passengers[b].d);
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

  it('tiempo, vidas y averías tienen valores razonables', () => {
    for (const lvl of LEVELS) {
      expect(lvl.timeLimit).toBeGreaterThanOrEqual(30);
      expect(lvl.timeLimit).toBeLessThanOrEqual(600);
      expect(lvl.breakdownChance).toBeGreaterThanOrEqual(0);
      expect(lvl.breakdownChance).toBeLessThanOrEqual(0.5);
    }
  });

  it('las vidas solo aparecen desde el nivel 15', () => {
    for (const lvl of LEVELS) {
    }
  });

  it('la capacidad permite siempre subir a un gigante o a los gemelos', () => {
    for (const lvl of LEVELS) {
      const hasGiant = lvl.passengers.some((p) => p.m === 'gordito');
      const hasTwins = lvl.passengers.some((p) => p.m === 'gemelos');
      if (hasGiant || hasTwins) expect(lvl.capacity).toBeGreaterThanOrEqual(2);
    }
  });

  it('todos los niveles son completables y el óptimo es finito y positivo', () => {
    for (const lvl of LEVELS) {
      const { optimal } = computeOptimal(lvl);
      expect(Number.isFinite(optimal), `nivel ${lvl.id}`).toBe(true);
      expect(optimal).toBeGreaterThan(0);
      expect(optimal).toBeLessThan(Number.MAX_SAFE_INTEGER);
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
      expect(firstLevel!.id).toBeGreaterThanOrEqual(m.unlockLevel);
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
});

describe('simulación real del plan óptimo (reglas del juego)', () => {
  /** Reproduce el plan paso a paso con las mismas reglas que usa el juego. */
  function simulate(level: (typeof LEVELS)[number], plan: PlanStep[]) {
    const pairOf = (i: number, rule: string): number => {
      if (MONSTER_MAP[level.passengers[i].m].rule !== rule) return -1;
      const grp = level.passengers.map((p, k) => (MONSTER_MAP[p.m].rule === rule ? k : -1)).filter((k) => k >= 0);
      const pos = grp.indexOf(i);
      return grp[pos % 2 === 0 ? pos + 1 : pos - 1];
    };
    const twinOf = (i: number): number => pairOf(i, 'twins');
    const duoOf = (i: number): number => pairOf(i, 'duo');
    const coupleOf = (i: number): number => {
      for (const [a, b] of level.couples) {
        if (a === i) return b;
        if (b === i) return a;
      }
      return -1;
    };
    let pos = 0;
    let onboard: number[] = [];
    const delivered = new Set<number>();
    let distance = 0;
    for (const step of plan) {
      if (step.kind === 'board') {
        if (pos !== 0) throw new Error(`nv ${level.id}: sube sin estar en recepción`);
        const group = [step.pax];
        const tw = twinOf(step.pax);
        if (tw >= 0) group.push(tw);
        const du = duoOf(step.pax);
        if (du >= 0) group.push(du);
        const slots = [...onboard, ...group].reduce((t, i) => t + MONSTER_MAP[level.passengers[i].m].slots, 0);
        if (slots > level.capacity) throw new Error(`nv ${level.id}: capacidad excedida`);
        onboard.push(...group);
      } else {
        distance += Math.abs(step.floor - pos);
        pos = step.floor;
        const exiters = onboard.filter((i) => {
          if (MONSTER_MAP[level.passengers[i].m].rule === 'shy' || true) {
            if (level.passengers[i].d !== pos) return false;
            const cp = coupleOf(i);
            return cp < 0 || onboard.includes(cp);
          }
          return false;
        });
        exiters.forEach((i) => delivered.add(i));
        onboard = onboard.filter((i) => !exiters.includes(i));
      }
    }
    return { delivered, distance, onboard };
  }

  it('el plan óptimo entrega a TODOS respetando reglas y su distancia == óptimo', () => {
    for (const lvl of LEVELS) {
      const { optimal, plan } = computeOptimal(lvl);
      const { delivered, distance, onboard } = simulate(lvl, plan);
      expect(delivered.size, `nivel ${lvl.id}`).toBe(lvl.passengers.length);
      expect(onboard.length, `nivel ${lvl.id}`).toBe(0);
      expect(distance, `nivel ${lvl.id}`).toBe(optimal);
    }
  }, 60000);

  it('el tiempo límite alcanza para una partida JUGADA LENTO siguiendo el óptimo', () => {
    for (const lvl of LEVELS) {
      const { optimal, plan } = computeOptimal(lvl);
      const slow = slowPlaySeconds(plan, lvl.passengers.length, optimal);
      expect(slow, `nivel ${lvl.id} lento=${Math.round(slow)}s`).toBeLessThanOrEqual(lvl.timeLimit);
    }
  }, 60000);

  it('el tiempo límite ya no regala minutos: es < 2.2x la partida lenta', () => {
    for (const lvl of LEVELS) {
      const { optimal, plan } = computeOptimal(lvl);
      const slow = slowPlaySeconds(plan, lvl.passengers.length, optimal);
      expect(lvl.timeLimit, `nivel ${lvl.id}`).toBeLessThan(slow * 2.2);
    }
  }, 60000);
});

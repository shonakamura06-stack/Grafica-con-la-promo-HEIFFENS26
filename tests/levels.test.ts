/**
 * Pruebas de integridad de los 30 niveles y de los datos de monstruos.
 * También verifica que TODOS los niveles son completables (el solver
 * encuentra un recorrido finito) y que el óptimo es razonable.
 */
import { describe, it, expect } from 'vitest';
import { LEVELS, TOTAL_LEVELS } from '../src/data/levels';
import { MONSTERS, MONSTER_MAP } from '../src/data/monsters';
import { computeOptimal } from '../src/systems/scoring';

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
      expect(lvl.timeLimit).toBeGreaterThanOrEqual(60);
      expect(lvl.timeLimit).toBeLessThanOrEqual(600);
      expect([0, 3]).toContain(lvl.lives);
      expect(lvl.breakdownChance).toBeGreaterThanOrEqual(0);
      expect(lvl.breakdownChance).toBeLessThanOrEqual(0.5);
    }
  });

  it('las vidas solo aparecen desde el nivel 15', () => {
    for (const lvl of LEVELS) {
      if (lvl.id < 15) expect(lvl.lives).toBe(0);
      else expect(lvl.lives).toBe(3);
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

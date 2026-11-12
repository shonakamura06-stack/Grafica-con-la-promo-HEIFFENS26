/**
 * Pruebas del MODELO DE TIEMPO (systems/timing.ts) y de los cronómetros de los
 * 30 niveles (data/levels.ts).
 *
 * El Sprint 1 existe por esto: los límites antiguos se calculaban sobre una
 * partida perfecta jugada lenta, y dejaban entre 0.1 y 4.6 segundos de margen.
 * Un solo piso equivocado cuesta ~7.5 s, así que EQUIVOCARSE UNA VEZ era perder.
 * Estas pruebas impiden que eso vuelva a pasar.
 */
import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { MONSTER_MAP } from '../src/data/monsters';
import {
  PACING, MISTAKES_ALLOWED, mistakeCostSeconds, levelTiming,
  recommendedTimeLimit, expectedSeconds, countTrips,
} from '../src/systems/timing';
import { computeOptimal } from '../src/systems/scoring';
import { buildCrew } from '../src/systems/rules';

describe('el coste de equivocarse', () => {
  it('un piso equivocado cuesta unos 7-9 segundos de reloj', () => {
    const c = mistakeCostSeconds();
    expect(c).toBeGreaterThan(6);
    expect(c).toBeLessThan(10);
  });

  it('el coste incluye darse cuenta, el drama, el viaje de más y volver a decidir', () => {
    expect(mistakeCostSeconds()).toBeCloseTo(
      PACING.mistakeRealize + PACING.mistakeDrama
      + PACING.mistakeExtraFloors * PACING.travelPerFloor
      + PACING.mistakePressAgain + PACING.doors, 6);
  });

  it('se toleran al menos 2 errores en cualquier nivel', () => {
    expect(MISTAKES_ALLOWED).toBeGreaterThanOrEqual(2);
  });
});

describe('los 30 cronómetros', () => {
  it('AGUANTAN AL MENOS DOS ERRORES NORMALES (el fallo que motivó el Sprint 1)', () => {
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      expect(t.errorsTolerated, `nivel ${lvl.id}: margen ${t.slack}s`).toBeGreaterThanOrEqual(MISTAKES_ALLOWED);
    }
  }, 60000);

  it('coinciden EXACTAMENTE con el modelo (nada de números puestos a ojo)', () => {
    for (const lvl of LEVELS) {
      expect(lvl.timeLimit, `nivel ${lvl.id}`).toBe(recommendedTimeLimit(lvl));
    }
  }, 60000);

  it('están redondeados a 5 segundos y son múltiplos de 5', () => {
    for (const lvl of LEVELS) expect(lvl.timeLimit % 5, `nivel ${lvl.id}`).toBe(0);
  });

  it('una partida limpia y lenta cabe holgada en el límite', () => {
    for (const lvl of LEVELS) {
      expect(expectedSeconds(lvl), `nivel ${lvl.id}`).toBeLessThan(lvl.timeLimit);
    }
  }, 60000);

  it('el margen real es de al menos 12 segundos sobre la partida limpia', () => {
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      expect(t.slack, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(12);
    }
  }, 60000);

  it('no regalan minutos: el límite queda por debajo de 2.2x la partida limpia', () => {
    for (const lvl of LEVELS) {
      expect(lvl.timeLimit, `nivel ${lvl.id}`).toBeLessThan(expectedSeconds(lvl) * 2.2);
    }
  }, 60000);

  it('el límite crece con el tamaño del nivel (el 30 tiene más tiempo que el 1)', () => {
    expect(LEVELS[29].timeLimit).toBeGreaterThan(LEVELS[0].timeLimit);
  });
});

describe('el modelo cuenta las interacciones REALES', () => {
  it('cada nivel presupuesta un toque por unidad del crew (los gemelos, uno)', () => {
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      const crew = buildCrew(lvl);
      expect(t.crew, `nivel ${lvl.id}`).toBe(crew.length);
      // Un toque por unidad, SALVO los dúos: Pegajín y Pegajón suben con un solo
      // toque (canBoard devuelve el grupo), igual que los gemelos son una unidad.
      const toques = crew.filter((m) => !(m.partnerId >= 0 && m.id > m.partnerId)).length;
      expect(t.boards, `nivel ${lvl.id}`).toBe(toques);
      expect(t.taps).toBeCloseTo(toques * PACING.tapMonster, 6);
    }
  }, 60000);

  it('los gemelos cuentan como 2 criaturas aunque sean 1 unidad', () => {
    const conGemelos = LEVELS.find((l) => l.passengers.some((p) => p.m === 'gemelos'))!;
    const t = levelTiming(conGemelos);
    expect(t.crew).toBe(conGemelos.passengers.length - 1);
    expect(t.monsters).toBe(conGemelos.passengers.length);
  });

  it('DESPERTAR A NOCTI cuesta tiempo (antes no se presupuestaba)', () => {
    for (const lvl of LEVELS) {
      const sleepers = buildCrew(lvl).filter((m) => m.needsWake).length;
      const t = levelTiming(lvl);
      expect(t.sleepers, `nivel ${lvl.id}`).toBe(sleepers);
      if (sleepers > 0) {
        expect(t.wakes, `nivel ${lvl.id}`).toBeCloseTo(sleepers * (PACING.wakeThink + PACING.wakeTap), 6);
        expect(t.wakes).toBeGreaterThan(0);
      } else {
        expect(t.wakes).toBe(0);
      }
    }
  }, 60000);

  it('los niveles con Nocti presupuestan más tiempo que uno igual sin él', () => {
    const conNocti = LEVELS.find((l) => l.passengers.some((p) => MONSTER_MAP[p.m].rule === 'sleepwalker'))!;
    const t = levelTiming(conNocti);
    expect(t.wakes).toBeGreaterThanOrEqual(PACING.wakeThink + PACING.wakeTap);
  });

  it('la avería NO cobra la reparación: el reloj está pausado (GameScene.ts:541)', () => {
    // Solo se presupuesta la reorientación al volver a jugar, y es poca cosa.
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      expect(t.breakdown, `nivel ${lvl.id}`).toBeLessThanOrEqual(PACING.reorientAfterRepair);
      if (lvl.breakdownChance === 0) expect(t.breakdown).toBe(0);
      else expect(t.breakdown).toBeGreaterThan(0);
    }
  });

  it('no se presupuesta leer el tutorial: los diálogos y tarjetas detienen el reloj', () => {
    // El modelo no tiene ninguna partida para "leer una tarjeta" o "leer a Rese":
    // esas pantallas ponen teaching/reseActive y el temporizador no descuenta.
    const claves = Object.keys(PACING);
    expect(claves.some((k) => /card|dialog|tutorial|rese/i.test(k))).toBe(false);
  });

  it('los primeros niveles tienen margen extra por aprendizaje de la interfaz', () => {
    expect(levelTiming(LEVELS[0]).learning).toBe(PACING.learningEarly);
    expect(levelTiming(LEVELS[5]).learning).toBe(PACING.learningMid);
    expect(levelTiming(LEVELS[20]).learning).toBe(0);
  });

  it('el presupuesto se descompone exactamente en sus partes', () => {
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      const suma = t.read + t.taps + t.buttons + t.travel + t.exits + t.wakes
        + t.thinking + t.learning + t.breakdown;
      expect(t.base, `nivel ${lvl.id}`).toBeCloseTo(suma, 1);
      // base, mistakes y total se publican redondeados a 1 decimal, así que la
      // suma de los redondeados puede diferir del total redondeado en hasta 0,1 s.
      expect(Math.abs(t.total - (t.base + t.mistakes)), `nivel ${lvl.id}`).toBeLessThanOrEqual(0.1 + 1e-9);
      expect(t.recommended).toBe(Math.ceil(t.total / 5) * 5);
    }
  }, 60000);

  it('los viajes de carga se cuentan bien a partir del plan del solver', () => {
    expect(countTrips([
      { kind: 'board', pax: 0 }, { kind: 'move', floor: 1 },
      { kind: 'move', floor: 0 }, { kind: 'board', pax: 1 }, { kind: 'move', floor: 2 },
    ])).toBe(2);
    expect(countTrips([{ kind: 'board', pax: 0 }, { kind: 'board', pax: 1 }, { kind: 'move', floor: 1 }])).toBe(1);
    expect(countTrips([])).toBe(0);
  });

  it('el tiempo de viaje usa la distancia óptima real del solver', () => {
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      const { optimal } = computeOptimal(lvl);
      expect(t.optimal, `nivel ${lvl.id}`).toBe(optimal);
      expect(t.travel).toBeCloseTo(optimal * PACING.travelPerFloor, 6);
    }
  }, 60000);
});

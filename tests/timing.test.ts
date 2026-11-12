/**
 * Pruebas del MODELO DE TIEMPO (systems/timing.ts) y de los cronómetros de los
 * 30 niveles (data/levels.ts).
 *
 * El Sprint 1 existe por esto: los límites antiguos se calculaban sobre una
 * partida perfecta jugada lenta, y dejaban entre 0.1 y 4.6 segundos de margen.
 * Un solo piso equivocado cuesta ~7.5 s, así que EQUIVOCARSE UNA VEZ era perder.
 * Estas pruebas impiden que eso vuelva a pasar.
 *
 * OPCIÓN B (decisión de producto, posterior al Sprint 1): el margen debe cubrir
 * DOS errores normales O UN error grave completo —tres pisos equivocados seguidos,
 * que devuelven a todos los monstruos a recepción— calculado con el PEOR caso
 * medido (45,42 s) más 2 s de seguridad, no con el promedio. Las pruebas de abajo
 * lo comprueban nivel a nivel, no con los totales de la campaña.
 */
import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { MONSTER_MAP } from '../src/data/monsters';
import {
  PACING, MISTAKES_ALLOWED, mistakeCostSeconds, levelTiming,
  recommendedTimeLimit, expectedSeconds, countTrips,
  GRUMPY, SAFETY_MARGIN, grumpyCostSeconds, grumpyWorstCaseSeconds,
  mistakesBudgetSeconds,
} from '../src/systems/timing';
import { computeOptimal, MAX_MISTAKES } from '../src/systems/scoring';
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

  it('no regalan minutos: el límite es la partida limpia + el presupuesto + el redondeo', () => {
    // La cota antigua era "2,2× la partida limpia", calibrada cuando el margen de
    // errores valía 15,5 s. Con la opción B el margen vale 47,4 s y esa cota la
    // rompe por diseño el nivel 1 (90 s sobre 41 s de partida limpia = 2,20×): un
    // ratio fijo penaliza a los niveles cortos. Se comprueba la suma real en vez
    // del ratio: nadie regala más de los 5 s del redondeo.
    for (const lvl of LEVELS) {
      const techo = expectedSeconds(lvl) + mistakesBudgetSeconds() + 5;
      expect(lvl.timeLimit, `nivel ${lvl.id}`).toBeLessThanOrEqual(techo);
      expect(lvl.timeLimit, `nivel ${lvl.id}`).toBeGreaterThan(expectedSeconds(lvl));
    }
  }, 60000);

  it('los niveles cortos no se llevan un ratio desproporado por culpa del margen fijo', () => {
    // El margen de errores es el mismo para todos (47,4 s), así que el ratio baja
    // cuanto más largo es el nivel. Se fija un techo holgado pero finito para que
    // nadie "regale minutos" y a la vez el nivel 1 siga siendo jugable.
    for (const lvl of LEVELS) {
      expect(lvl.timeLimit / expectedSeconds(lvl), `nivel ${lvl.id}`).toBeLessThan(2.5);
    }
    const ratios = LEVELS.map((l) => l.timeLimit / expectedSeconds(l));
    expect(ratios[29], 'el nivel 30 es el que menos margen relativo necesita').toBeLessThan(1.6);
  }, 60000);

  it('el límite crece con el tamaño del nivel (el 30 tiene más tiempo que el 1)', () => {
    expect(LEVELS[29].timeLimit).toBeGreaterThan(LEVELS[0].timeLimit);
  });
});

describe('OPCIÓN B: recuperarse de un error grave sin perder el nivel', () => {
  const peor = grumpyWorstCaseSeconds();
  const presupuesto = mistakesBudgetSeconds();

  it('el error grave se calcula con el PEOR caso medido, no con el promedio', () => {
    // Peor geometría real de la campaña: cabina llena (4) y piso medio 4,12.
    // Los 30 niveles dan entre 39,60 y 45,41 s; el promedio es 43,1 s y NO vale.
    expect(GRUMPY.worstCab).toBe(Math.max(...LEVELS.map((l) => l.capacity)));
    expect(peor).toBeCloseTo(45.42, 1);
    expect(peor).toBeGreaterThan(45);
    const propios = LEVELS.map((l) => grumpyCostSeconds(l));
    expect(Math.max(...propios)).toBeLessThanOrEqual(peor);   // el techo cubre todos
    expect(peor - Math.max(...propios)).toBeLessThan(0.5);    // y no se pasa de generoso
    const promedio = propios.reduce((a, b) => a + b, 0) / propios.length;
    expect(peor).toBeGreaterThan(promedio);                   // peor caso > promedio
  });

  it('el error grave incluye TODO lo que hace GameScene: 3 errores, bajar y recolocar', () => {
    expect(MAX_MISTAKES).toBe(3);
    const manual = MAX_MISTAKES * mistakeCostSeconds()          // los 3 errores seguidos
      + GRUMPY.bubbleWait                                       // delayedCall(1400)
      + 2 * GRUMPY.worstAvgFloor * PACING.travelPerFloor        // bajar y volver a subir
      + (GRUMPY.worstCab - 1) * GRUMPY.exitStagger              // salida escalonada 260 ms
      + GRUMPY.worstCab * PACING.tapMonster                     // volver a tocarlos a todos
      + PACING.thinkPerTrip;                                    // rehacer el plan
    expect(peor).toBeCloseTo(manual, 6);
    // Si alguien olvida la recolocación (el error que cometí en el primer estudio,
    // que dio 15,8 s), el coste se queda por debajo de 30 s y esta prueba falla.
    expect(peor).toBeGreaterThan(30);
  });

  it('el presupuesto es el MAYOR de las dos condiciones y lleva 2 s de seguridad', () => {
    expect(SAFETY_MARGIN).toBe(2);
    expect(presupuesto).toBeCloseTo(peor + SAFETY_MARGIN, 6);
    expect(presupuesto).toBeGreaterThan(MISTAKES_ALLOWED * mistakeCostSeconds());
  });

  it('CONDICIÓN 1 — los 30 niveles aguantan DOS ERRORES NORMALES', () => {
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      expect(t.slack, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(MISTAKES_ALLOWED * mistakeCostSeconds());
      expect(t.errorsTolerated, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(MISTAKES_ALLOWED);
    }
  }, 60000);

  it('CONDICIÓN 2 — los 30 niveles aguantan UN ERROR GRAVE COMPLETO (comprobación individual)', () => {
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      const suyo = grumpyCostSeconds(lvl);
      // El margen real de ESE nivel (con su cabina y su piso medio), no el techo uniforme.
      expect(t.slack, `nivel ${lvl.id}: margen ${t.slack}s vs error grave ${suyo.toFixed(2)}s`)
        .toBeGreaterThanOrEqual(suyo);
      expect(t.grumpyTolerated, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(1);
      expect(t.grumpyCost).toBeCloseTo(suyo, 1);
    }
  }, 60000);

  it('las dos condiciones caben a la vez en el límite guardado en levels.ts', () => {
    for (const lvl of LEVELS) {
      expect(lvl.timeLimit, `nivel ${lvl.id}`)
        .toBeGreaterThanOrEqual(expectedSeconds(lvl) + Math.max(
          MISTAKES_ALLOWED * mistakeCostSeconds(),
          grumpyCostSeconds(lvl),
        ));
    }
  }, 60000);

  it('no se presupuesta "1 grave + 1 normal" (opción C descartada: +32 % de campaña)', () => {
    // El MODELO no paga la opción C: el presupuesto se queda por debajo de
    // 1 grave + 1 normal. (En los niveles más cortos el redondeo a múltiplos de 5
    // puede regalar hasta 5 s y cubrir esa combinación por casualidad; lo que se
    // presupuesta a propósito es lo que importa, y eso se comprueba aquí.)
    expect(presupuesto).toBeLessThan(mistakeCostSeconds() + peor);
    expect(presupuesto - peor).toBe(SAFETY_MARGIN);
    for (const lvl of LEVELS) {
      const t = levelTiming(lvl);
      // La holgura real es el presupuesto más, como mucho, el redondeo a 5 s.
      expect(t.slack, `nivel ${lvl.id}`).toBeGreaterThanOrEqual(presupuesto - 0.05);
      expect(t.slack, `nivel ${lvl.id} regala más que el redondeo`).toBeLessThan(presupuesto + 5);
    }
  }, 60000);

  it('el margen sigue siendo el mismo en los 30 niveles (presupuesto uniforme de errores)', () => {
    const margenes = new Set(LEVELS.map((l) => levelTiming(l).mistakes));
    expect(margenes.size).toBe(1);
    expect([...margenes][0]).toBeCloseTo(presupuesto, 1);
  }, 60000);

  it('los reintentos siguen siendo ilimitados y gratis: el reloj no gasta vidas ni monedas', () => {
    // El cronómetro solo decide si la partida termina; no hay corazones ni energía.
    // (La economía se prueba en tests/economy.test.ts; aquí se fija que subir el
    // margen no ha introducido ningún coste nuevo.)
    expect(MISTAKES_ALLOWED).toBe(2);
    expect(SAFETY_MARGIN).toBe(2);
    const limites = LEVELS.map((l) => l.timeLimit);
    expect(Math.max(...limites)).toBeLessThanOrEqual(180);   // ningún nivel pasa de 3 min
    expect(limites.reduce((a, b) => a + b, 0)).toBeLessThan(4500); // campaña < 75 min de techo
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

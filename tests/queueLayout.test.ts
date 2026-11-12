/**
 * Pruebas de GEOMETRÍA DE LA COLA y de BOCADILLOS (Sprint 2).
 *
 * El fallo que se corrige aquí era geométrico y medible: `queuePositions()` separaba
 * a los monstruos 52 px fijos, pero las texturas miden 128 px y en la cola se dibujan
 * a 0,5 × `def.scale`. Un monstruo normal ocupa 64 px (solape de 12 px con su vecino)
 * y Gordito 86 px (solape de 34 px). Estos tests comprueban la cola REAL de los 30
 * niveles del juego con los monstruos reales, no casos inventados.
 *
 * Y los bocadillos: un solo globo en pantalla, cerca de quien habla, dentro del
 * marco, sin tapar caras y con turnos por prioridad.
 */
import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { MONSTER_MAP, MONSTERS } from '../src/data/monsters';
import { buildCrew } from '../src/systems/rules';
import {
  layoutQueue, QUEUE_AREA, spriteSize, slotsById, overlapsInRow, outOfArea, QueueItem,
} from '../src/systems/queueLayout';
import {
  BubbleDirector, PRIORITY, bubbleBox, wrapText, shorten, anchorBubble, BUBBLE_OPTIONS, Anchor, protectedRect } from '../src/systems/bubbles';
import { personalityOf, FX_LIMITS } from '../src/systems/personality';

const TEXTURA = 128;
/** Escala de la cola en el motor: 0,5 × `def.scale` (igual que GameScene.queueScale). */
function escalaCola(monsterId: string): number {
  return 0.5 * MONSTER_MAP[monsterId].scale;
}

/** Cola real de un nivel: los ítems que ve el motor, con su tamaño verdadero. */
function colaDe(nivel: number): QueueItem[] {
  const crew = buildCrew(LEVELS[nivel]);
  return crew.map((m, i) => {
    const { w, h } = spriteSize(TEXTURA, escalaCola(m.monsterId));
    return { id: i, w, h };
  });
}

/** El peor caso: los 20 monstruos a la vez (más de lo que trae cualquier nivel). */
function colaMaxima(): QueueItem[] {
  return MONSTERS.map((m, i) => {
    const { w, h } = spriteSize(TEXTURA, escalaCola(m.id));
    return { id: i, w, h };
  });
}

describe('spriteSize: el tamaño real que antes se ignoraba', () => {
  it('un monstruo normal ocupa 64 px y Gordito 86 px (la causa del solape)', () => {
    expect(spriteSize(TEXTURA, escalaCola('bubu'))).toEqual({ w: 64, h: 64 });
    expect(spriteSize(TEXTURA, escalaCola('gordito')).w).toBeCloseTo(86.4, 5);
    expect(spriteSize(TEXTURA, escalaCola('maletero')).w).toBeCloseTo(70.4, 5);
    // Con 52 px de separación TODOS se solapaban; ahora la separación sale del ancho.
    expect(spriteSize(TEXTURA, escalaCola('bubu')).w).toBeGreaterThan(52);
  });

  it('todos los monstruos miden lo suyo y ninguno es de tamaño 0', () => {
    for (const m of MONSTERS) {
      const { w, h } = spriteSize(TEXTURA, escalaCola(m.id));
      expect(w, m.id).toBeGreaterThan(40);
      expect(h, m.id).toBe(w);
      expect(w, m.id).toBeLessThanOrEqual(128);
    }
  });
});

describe('la cola de los 30 niveles: ni solapes ni salidas del área', () => {
  it('ningún monstruo se solapa con su vecino de fila en ningún nivel', () => {
    for (let n = 0; n < LEVELS.length; n += 1) {
      const items = colaDe(n);
      const layout = layoutQueue(items);
      const solapes = overlapsInRow(layout.slots);
      expect(solapes, `nivel ${n + 1} (${items.length} pasajeros): ${JSON.stringify(solapes)}`).toEqual([]);
    }
  });

  it('nadie se sale del área útil (ni por los lados ni por arriba ni por abajo)', () => {
    for (let n = 0; n < LEVELS.length; n += 1) {
      const layout = layoutQueue(colaDe(n));
      expect(outOfArea(layout.slots), `nivel ${n + 1}`).toEqual([]);
    }
  });

  it('tampoco con los 20 monstruos a la vez (peor caso imaginable)', () => {
    const items = colaMaxima();
    expect(items.length).toBe(20);
    const layout = layoutQueue(items);
    expect(layout.slots.length).toBe(20);
    expect(overlapsInRow(layout.slots)).toEqual([]);
    expect(outOfArea(layout.slots)).toEqual([]);
    expect(layout.rows).toBe(2);
  });

  it('todos los pasajeros reciben su hueco (nadie se queda sin sitio)', () => {
    for (let n = 0; n < LEVELS.length; n += 1) {
      const items = colaDe(n);
      const layout = layoutQueue(items);
      const ids = new Set(layout.slots.map((s) => s.id));
      expect(ids.size, `nivel ${n + 1}`).toBe(items.length);
      for (const it of items) expect(ids.has(it.id), `nivel ${n + 1} pierde a ${it.id}`).toBe(true);
      // Y el mapa por id coincide con la lista.
      expect(slotsById(layout).size).toBe(items.length);
    }
  });

  it('una fila mientras caben, dos cuando no (y la decisión es por ANCHO real)', () => {
    // 5 monstruos normales: 5 × 64 + 4 × 10 = 360 px < 512 px de área.
    const pocos = Array.from({ length: 5 }, (_, i) => ({ id: i, w: 64, h: 64 }));
    expect(layoutQueue(pocos).rows).toBe(1);
    // 9 normales: 9 × 64 + 8 × 10 = 656 px > 512 px.
    const muchos = Array.from({ length: 9 }, (_, i) => ({ id: i, w: 64, h: 64 }));
    expect(layoutQueue(muchos).rows).toBe(2);
    // El área mide 512 px: 7 caben justos (7 × 64 + 6 × 10 = 508) y 8 no (582).
    expect(layoutQueue(Array.from({ length: 7 }, (_, i) => ({ id: i, w: 64, h: 64 }))).rows).toBe(1);
    expect(layoutQueue(Array.from({ length: 8 }, (_, i) => ({ id: i, w: 64, h: 64 }))).rows).toBe(2);
  });

  it('los niveles grandes usan dos filas y reparten sin dejar una fila vacía', () => {
    for (let n = 0; n < LEVELS.length; n += 1) {
      const items = colaDe(n);
      const layout = layoutQueue(items);
      if (layout.rows !== 2) continue;
      const filas = [0, 1].map((r) => layout.slots.filter((s) => s.row === r).length);
      expect(filas[0], `nivel ${n + 1}`).toBeGreaterThan(0);
      expect(filas[1], `nivel ${n + 1}`).toBeGreaterThan(0);
      // Corte equilibrado: ninguna fila con el triple que la otra.
      expect(Math.max(...filas) - Math.min(...filas), `nivel ${n + 1} desequilibrado`).toBeLessThanOrEqual(2);
    }
  });

  it('los más altos van a la fila de delante (ninguna cabeza queda tapada)', () => {
    const items = [
      { id: 0, w: 64, h: 64 }, { id: 1, w: 86, h: 86 }, { id: 2, w: 64, h: 64 },
      { id: 3, w: 64, h: 64 }, { id: 4, w: 70, h: 70 }, { id: 5, w: 64, h: 64 },
      { id: 6, w: 64, h: 64 }, { id: 7, w: 64, h: 64 }, { id: 8, w: 64, h: 64 },
    ];
    const layout = layoutQueue(items);
    expect(layout.rows).toBe(2);
    const alturaMaxima = (r: number): number => Math.max(...layout.slots.filter((s) => s.row === r).map((s) => s.h));
    expect(alturaMaxima(1), 'el más alto se quedó atrás').toBeGreaterThanOrEqual(alturaMaxima(0));
  });

  it('las filas se colocan por su LÍNEA DE SUELO: la de atrás queda más arriba', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i, w: 64, h: 64 }));
    const layout = layoutQueue(items);
    const baseAtras = layout.slots.find((s) => s.row === 0)!.baseline;
    const baseFrente = layout.slots.find((s) => s.row === 1)!.baseline;
    expect(baseAtras, 'la fila de atrás debería estar más arriba (perspectiva)').toBeLessThan(baseFrente);
    expect(baseFrente).toBe(QUEUE_AREA.bottom);
    // La profundidad de dibujo acompaña: la fila delantera tapa a la trasera.
    expect(layout.slots.find((s) => s.row === 1)!.depth)
      .toBeGreaterThan(layout.slots.find((s) => s.row === 0)!.depth);
  });

  it('queda hueco libre por encima de las cabezas para los bocadillos', () => {
    for (let n = 0; n < LEVELS.length; n += 1) {
      const layout = layoutQueue(colaDe(n));
      // headRoom es la distancia entre la cabeza más alta y el techo útil.
      expect(layout.headRoom, `nivel ${n + 1}`).toBeGreaterThanOrEqual(0);
      const cabeza = Math.min(...layout.slots.map((s) => s.y - s.h / 2));
      expect(cabeza, `nivel ${n + 1}: cabeza por encima del techo`).toBeGreaterThanOrEqual(QUEUE_AREA.top - 0.001);
    }
  });

  it('la separación horizontal nunca es menor que el mínimo del área', () => {
    for (let n = 0; n < LEVELS.length; n += 1) {
      const layout = layoutQueue(colaDe(n));
      expect(layout.minGapUsed, `nivel ${n + 1}`).toBeGreaterThanOrEqual(QUEUE_AREA.gap);
    }
  });

  it('el área útil aprovecha la banda inferior y no invade el panel de pisos', () => {
    // El panel de botones ocupa x 410..526 y llega hasta y 782; la cola empieza en 792.
    expect(QUEUE_AREA.top).toBeGreaterThanOrEqual(782);
    expect(QUEUE_AREA.bottom).toBeLessThanOrEqual(960);
    expect(QUEUE_AREA.left).toBeGreaterThanOrEqual(0);
    expect(QUEUE_AREA.right).toBeLessThanOrEqual(540);
    expect(QUEUE_AREA.right - QUEUE_AREA.left).toBeGreaterThan(400);
  });

  it('la cola es determinista: el mismo reparto da siempre los mismos huecos', () => {
    const a = layoutQueue(colaDe(9));
    const b = layoutQueue(colaDe(9));
    expect(a.slots).toEqual(b.slots);
    expect(a.rows).toBe(b.rows);
  });

  it('una cola vacía no revienta', () => {
    const layout = layoutQueue([]);
    expect(layout.slots).toEqual([]);
    expect(layout.rows).toBe(0);
    expect(overlapsInRow([])).toEqual([]);
    expect(outOfArea([])).toEqual([]);
  });

  it('Gordito (el más ancho) nunca se solapa, ni siquiera rodeado de vecinos', () => {
    const gordito = spriteSize(TEXTURA, escalaCola('gordito'));
    const items = [
      { id: 0, w: 64, h: 64 }, { id: 1, w: gordito.w, h: gordito.h }, { id: 2, w: 64, h: 64 },
      { id: 3, w: 64, h: 64 }, { id: 4, w: 64, h: 64 }, { id: 5, w: 64, h: 64 },
    ];
    const layout = layoutQueue(items);
    expect(overlapsInRow(layout.slots)).toEqual([]);
    const g = slotsById(layout).get(1)!;
    expect(g.w).toBeCloseTo(gordito.w, 5);
  });
});

describe('bocadillos: un solo globo, con turnos y prioridad', () => {
  const anclas = (): Map<number, Anchor> => new Map([
    [-1, { x: 337, y: 300, w: 100, h: 90 }],
    [0, { x: 120, y: 880, w: 64, h: 64 }],
    [1, { x: 200, y: 880, w: 86, h: 86 }],
    [2, { x: 280, y: 880, w: 64, h: 64 }],
  ]);

  it('sólo hay UN bocadillo visible a la vez (el fallo que se pisa entre personajes)', () => {
    expect(FX_LIMITS.maxBubbles).toBe(1);
    const d = new BubbleDirector();
    d.say(0, 'Hola', PRIORITY.idle, 0);
    d.say(1, 'Yo también quiero hablar', PRIORITY.idle, 10);
    d.say(2, 'Y yo', PRIORITY.idle, 20);
    let visibles = 0;
    for (const ev of d.update(30, anclas())) if (ev.kind === 'show') visibles += 1;
    expect(visibles, 'deben turnarse, no hablarse encima').toBe(1);
    expect(d.pending()).toBeGreaterThan(0);
  });

  it('lo importante adelanta a lo decorativo (prioridad)', () => {
    const d = new BubbleDirector();
    d.say(0, 'Frase de espera cualquiera', PRIORITY.idle, 0);
    d.say(1, '¡PISO EQUIVOCADO!', PRIORITY.error, 5);
    const eventos = d.update(10, anclas());
    expect(eventos.length).toBe(1);
    expect(eventos[0].req.text).toContain('EQUIVOCADO');
  });

  it('una prioridad alta interrumpe a la que está en pantalla', () => {
    const d = new BubbleDirector();
    d.say(0, 'Conversación tranquila', PRIORITY.chat, 0, 4000);
    expect(d.update(10, anclas())[0].kind).toBe('show');
    d.say(1, '¡Se han enfadado!', PRIORITY.error, 20, 2000);
    // El globo viejo se retira enseguida (a los 220 ms de haber aparecido)...
    const interrupcion = d.update(260, anclas());
    expect(interrupcion.some((e) => e.kind === 'hide')).toBe(true);
    // ...y el urgente ocupa la pantalla en cuanto pasa el hueco mínimo entre globos.
    const siguientes = d.update(260 + BUBBLE_OPTIONS.minGap, anclas());
    expect(siguientes.some((e) => e.kind === 'show' && e.req.text.includes('enfadado'))).toBe(true);
    // La conversación tranquila no vuelve después: la ha perdido el turno.
    expect(d.visible?.text).toContain('enfadado');
  });

  it('una prioridad IGUAL no interrumpe (espera su turno, no se pisa)', () => {
    const d = new BubbleDirector();
    d.say(0, 'Primera frase', PRIORITY.idle, 0, 1600);
    d.update(10, anclas());
    d.say(1, 'Segunda frase', PRIORITY.idle, 500, 1600);
    const eventos = d.update(1200, anclas());
    expect(eventos.some((e) => e.kind === 'hide'), 'no debe interrumpir a la misma prioridad').toBe(false);
    expect(d.visible?.text).toBe('Primera frase');
  });

  it('el mismo personaje no encadena frases (turnos de verdad)', () => {
    const d = new BubbleDirector();
    expect(d.say(0, 'Primera', PRIORITY.idle, 0)).not.toBeNull();
    d.update(10, anclas());
    // La segunda llega 100 ms después: se descarta por enfriamiento del hablante.
    expect(d.say(0, 'Segunda seguida', PRIORITY.idle, 110)).toBeNull();
    // Un aviso importante no tiene enfriamiento: siempre sale.
    expect(d.say(0, '¡Aviso!', PRIORITY.error, 120)).not.toBeNull();
  });

  it('lo decorativo que se hace viejo se descarta (no se habla de lo que ya pasó)', () => {
    const d = new BubbleDirector();
    d.say(0, 'Frase vieja', PRIORITY.chat, 0, 1000);
    // El globo del sistema ocupa la pantalla un rato largo.
    d.say(-1, 'Aviso largo', PRIORITY.error, 1, 9000);
    d.update(2, anclas());
    const eventos = d.update(9000, anclas());
    // Cuando el aviso termina, la frase decorativa ya caducó: no se muestra.
    expect(eventos.some((e) => e.kind === 'show' && e.req.text === 'Frase vieja')).toBe(false);
  });

  it('la cola de bocadillos no crece sin límite', () => {
    const d = new BubbleDirector();
    for (let i = 0; i < 400; i += 1) d.say(i % 4, `Frase ${i}`, PRIORITY.chat, i);
    expect(d.pending()).toBeLessThanOrEqual(FX_LIMITS.maxBubbles * 8);
    expect(d.stats().dropped).toBeGreaterThan(0);
  });

  it('silence() vacía la cola y oculta lo visible (diálogo de Rese, pausa, avería)', () => {
    const d = new BubbleDirector();
    d.say(0, 'Hablando', PRIORITY.idle, 0);
    d.update(10, anclas());
    d.say(1, 'En cola', PRIORITY.idle, 20);
    const eventos = d.silence(30);
    expect(eventos.some((e) => e.kind === 'hide')).toBe(true);
    expect(d.pending()).toBe(0);
    expect(d.visible).toBeNull();
  });

  it('un hablante sin ancla no muestra nada (no se dibuja en 0,0)', () => {
    const d = new BubbleDirector();
    d.say(99, '¿Dónde estoy?', PRIORITY.idle, 0);
    const eventos = d.update(10, anclas());
    expect(eventos.some((e) => e.kind === 'show' && e.x === 0 && e.y === 0)).toBe(false);
  });
});

describe('posición del globo: cerca del personaje y dentro de la pantalla', () => {
  it('el globo sale encima de la cabeza de quien habla', () => {
    const caja = bubbleBox('¡Al piso 3!');
    const quien: Anchor = { x: 200, y: 880, w: 64, h: 64 };
    const { x, y } = anchorBubble(quien, caja, []);
    expect(x).toBeCloseTo(200, 5);
    expect(y + caja.h / 2, 'debe quedar por encima de la cabeza').toBeLessThan(quien.y - quien.h / 2);
  });

  it('ningún globo se sale de la pantalla (540×960), ni siquiera en los extremos', () => {
    const caja = bubbleBox('Frase larga que ocupa varias líneas del globo');
    for (const x of [8, 40, 120, 270, 420, 500, 532]) {
      for (const y of [140, 400, 700, 900, 950]) {
        const { x: gx, y: gy } = anchorBubble({ x, y, w: 64, h: 64 }, caja, []);
        expect(gx - caja.w / 2, `x=${x},y=${y}`).toBeGreaterThanOrEqual(BUBBLE_OPTIONS.margin - 0.001);
        expect(gx + caja.w / 2, `x=${x},y=${y}`).toBeLessThanOrEqual(BUBBLE_OPTIONS.screenW - BUBBLE_OPTIONS.margin + 0.001);
        expect(gy - caja.h / 2, `x=${x},y=${y}`).toBeGreaterThanOrEqual(BUBBLE_OPTIONS.topLimit - 0.001);
        expect(gy + caja.h / 2, `x=${x},y=${y}`).toBeLessThanOrEqual(BUBBLE_OPTIONS.screenH - BUBBLE_OPTIONS.margin + 0.001);
      }
    }
  });

  it('el globo no tapa la cara de otro pasajero: se sube por encima', () => {
    const caja = bubbleBox('¡Subo yo primero!');
    const quien: Anchor = { x: 200, y: 880, w: 64, h: 64 };
    const vecino: Anchor = { x: 205, y: 830, w: 64, h: 64 };   // justo delante, más arriba
    const esquivando = anchorBubble(quien, caja, [vecino]);
    // Ni la cara/etiqueta del vecino ni las del propio hablante quedan tapadas.
    for (const a of [quien, vecino]) {
      const r = protectedRect(a);
      const toca = esquivando.x + caja.w / 2 > r.x1 && esquivando.x - caja.w / 2 < r.x2
        && esquivando.y + caja.h / 2 > r.y1 && esquivando.y - caja.h / 2 < r.y2;
      expect(toca, `no debe tapar al pasajero de (${a.x},${a.y})`).toBe(false);
    }
    expect(esquivando.zone).toBe('cerca');
  });

  it('con la cola de dos filas, el de atrás no tapa al de delante', () => {
    // Fila de atrás (más alta en pantalla) y fila de delante (más baja y cercana).
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i, w: 64, h: 64 }));
    const layout = layoutQueue(items);
    const anclas = layout.slots.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
    const caja = bubbleBox('¡Al piso 5, por favor!');
    for (const s of layout.slots) {
      const otras = anclas.filter((a) => a.x !== s.x || a.y !== s.y);
      const { x, y } = anchorBubble({ x: s.x, y: s.y, w: s.w, h: s.h }, caja, otras);
      // Dentro de la pantalla siempre.
      expect(x - caja.w / 2).toBeGreaterThanOrEqual(BUBBLE_OPTIONS.margin - 0.001);
      expect(x + caja.w / 2).toBeLessThanOrEqual(BUBBLE_OPTIONS.screenW - BUBBLE_OPTIONS.margin + 0.001);
      // Y no sobre la cara de nadie.
      for (const o of otras) {
        const solapaX = Math.abs(o.x - x) < (o.w + caja.w) / 2;
        const caraArriba = o.y - o.h / 2;
        const caraAbajo = o.y - o.h * 0.1;
        const solapaY = y + caja.h / 2 > caraArriba && y - caja.h / 2 < caraAbajo;
        // Sólo se permite si no había forma de evitarlo (techo del HUD más alto).
        if (solapaX && solapaY) {
          expect(y - caja.h / 2, `el globo tapa a otro en ${JSON.stringify(s)}`)
            .toBeLessThanOrEqual(BUBBLE_OPTIONS.topLimit + 0.001);
        }
      }
    }
  });

  it('los textos se cortan por palabras y caben en el globo (breves y legibles)', () => {
    expect(shorten('Corto', 52)).toBe('Corto');
    const largo = 'Esta frase es mucho más larga de lo que cabe en un bocadillo de la cola';
    const cortado = shorten(largo, 40);
    expect(cortado.length).toBeLessThanOrEqual(41);   // 40 + el punto suspensivo
    expect(cortado.endsWith('…')).toBe(true);
    expect(cortado).not.toMatch(/\s…/);               // no corta dejando un espacio suelto
    // wrapText parte por palabras, nunca a mitad de una.
    for (const linea of wrapText(largo, 30)) expect(linea.length).toBeLessThanOrEqual(30);
    expect(wrapText(largo, 30).join(' ').replace(/\s+/g, ' ')).toBe(largo);
    expect(wrapText('', 30)).toEqual(['']);
  });

  it('el globo nunca mide más que su tope y nunca menos que una línea', () => {
    for (const texto of ['', 'Sí', 'Frase media del bocadillo', 'x'.repeat(300)]) {
      const caja = bubbleBox(texto);
      expect(caja.w).toBeGreaterThan(0);
      expect(caja.h).toBeGreaterThan(0);
      expect(caja.w).toBeLessThanOrEqual(BUBBLE_OPTIONS.maxBubbleW);
      expect(caja.h).toBeLessThanOrEqual(BUBBLE_OPTIONS.maxBubbleH);
    }
  });

  it('el director coloca el globo junto al personaje real de la cola', () => {
    const d = new BubbleDirector();
    const items = colaDe(4);
    const layout = layoutQueue(items);
    const anclas = new Map<number, Anchor>(layout.slots.map((s) => [s.id, { x: s.x, y: s.y, w: s.w, h: s.h }]));
    anclas.set(-1, { x: 337, y: 300, w: 100, h: 90 });
    d.say(layout.slots[0].id, '¡Hola!', PRIORITY.idle, 0);
    const ev = d.update(10, anclas)[0];
    expect(ev.kind).toBe('show');
    const caja = bubbleBox(ev.req.text);
    expect(Math.abs(ev.x - layout.slots[0].x)).toBeLessThanOrEqual(540);
    expect(ev.y + caja.h / 2).toBeLessThanOrEqual(960);
    expect(ev.y - caja.h / 2).toBeGreaterThanOrEqual(BUBBLE_OPTIONS.topLimit - 0.001);
  });
});

describe('coherencia entre cola, personalidad y bocadillos', () => {
  it('el área de la cola deja sitio para el bocadillo de un personaje', () => {
    const caja = bubbleBox('¡Al piso 3!');
    // Entre el techo útil y la cabeza más alta debe caber el globo.
    const items = colaMaxima();
    const layout = layoutQueue(items);
    const cabeza = Math.min(...layout.slots.map((s) => s.y - s.h / 2));
    expect(cabeza - QUEUE_AREA.top, 'no cabe el globo entre el techo y las cabezas')
      .toBeGreaterThanOrEqual(Math.min(caja.h, 40));
  });

  it('cada monstruo tiene amplitud de reposo menor que la separación mínima', () => {
    // Si el reposo moviera más que el hueco libre, volverían a solaparse bailando.
    const gap = QUEUE_AREA.gap;
    for (const m of MONSTERS) {
      const p = personalityOf(m.id);
      expect(p.amp, `${m.id} se movería más de ${gap}px`).toBeLessThanOrEqual(8);
      expect(p.amp).toBeGreaterThan(0);
    }
  });

  it('los límites del director de bocadillos son los de la pantalla del juego', () => {
    expect(BUBBLE_OPTIONS.screenW).toBe(540);
    expect(BUBBLE_OPTIONS.screenH).toBe(960);
    expect(BUBBLE_OPTIONS.maxChars).toBeLessThanOrEqual(60);
    expect(PRIORITY.error).toBeGreaterThan(PRIORITY.rule);
    expect(PRIORITY.rule).toBeGreaterThan(PRIORITY.hint);
    expect(PRIORITY.hint).toBeGreaterThan(PRIORITY.arrive);
    expect(PRIORITY.arrive).toBeGreaterThan(PRIORITY.idle);
    expect(PRIORITY.idle).toBeGreaterThan(PRIORITY.chat);
  });
});

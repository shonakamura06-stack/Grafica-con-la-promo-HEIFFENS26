/**
 * BOCADILLOS DEL SPRINT 2.2 — globo de cómic compacto que no tapa el puzle.
 *
 * Lo que se exige aquí es exactamente lo pedido en la revisión visual:
 *  - globo pequeño (máx 280×76, líneas de ≤26 caracteres, texto de ≤44);
 *  - NUNCA tapa caras, etiquetas de destino, símbolos de pareja/enemigo ni el
 *    ascensor, en los 30 niveles y para cualquier hablante;
 *  - si no hay hueco junto al hablante, usa la BANDA RESERVADA de diálogo,
 *    por encima de todas las cabezas;
 *  - se conservan las garantías del Sprint 2: un solo globo, prioridades y
 *    turnos (y el hablante sin ancla también va a la banda reservada).
 */
import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/data/levels';
import { MONSTER_MAP } from '../src/data/monsters';
import { buildCrew } from '../src/systems/rules';
import { layoutQueue, QUEUE_AREA, spriteSize } from '../src/systems/queueLayout';
import {
  anchorBubble, bubbleBox, protectedRect, wrapText, shorten,
  BUBBLE_OPTIONS, BubbleDirector, PRIORITY, Anchor,
} from '../src/systems/bubbles';
import GAME from '../src/scenes/GameScene.ts?raw';

const T = 128;
/** El ascensor, como lo protege GameScene (información del puzle). */
const CAB: Anchor = { x: 270, y: 430, w: 100, h: 130 };

/** Anclas reales de la cola de un nivel, con el tamaño EN PANTALLA por fila. */
function anclasDe(nivel: number): Array<Anchor & { id: number }> {
  const crew = buildCrew(LEVELS[nivel - 1]);
  const items = crew.map((m, i) => {
    const { w, h } = spriteSize(T, 0.5 * MONSTER_MAP[m.monsterId].scale);
    return { id: i, w, h };
  });
  const lay = layoutQueue(items, QUEUE_AREA);
  return lay.slots.map((s) => {
    const k = s.row === 0 ? 0.94 : 1;   // la fila de atrás se dibuja un 6 % menor
    return { id: s.id, x: s.x, y: s.y, w: s.w * k, h: s.h * k };
  });
}

const FRASES = [
  '¡Al 5, porfa! Prometo no moverme.',
  'Perdón por el bulto: es todo cariño.',
  'Atravieso paredes, pero el 2 pilla lejos.',
  'Subo yo y ya no cabe nadie. Piso 5.',
  '¿Hueles eso? Es mi primo el Pegajón.',
];

const toca = (
  pos: { x: number; y: number }, box: { w: number; h: number },
  r: { x1: number; y1: number; x2: number; y2: number },
): boolean => pos.x + box.w / 2 > r.x1 && pos.x - box.w / 2 < r.x2
  && pos.y + box.h / 2 > r.y1 && pos.y - box.h / 2 < r.y2;

describe('globo compacto de cómic (Sprint 2.2)', () => {
  it('cabe en 280×76 y parte el texto en líneas de ≤26 caracteres', () => {
    for (const f of FRASES) {
      const box = bubbleBox(f);
      expect(box.w, f).toBeLessThanOrEqual(BUBBLE_OPTIONS.maxBubbleW);
      expect(box.h, f).toBeLessThanOrEqual(BUBBLE_OPTIONS.maxBubbleH);
      for (const l of wrapText(f, 26)) expect(l.length, f).toBeLessThanOrEqual(26);
    }
    expect(bubbleBox('Hola').h).toBeLessThanOrEqual(44);
  });

  it('el texto se corta a 44 caracteres por palabras', () => {
    expect(BUBBLE_OPTIONS.maxChars).toBe(44);
    expect(shorten('palabra '.repeat(12), BUBBLE_OPTIONS.maxChars).length)
      .toBeLessThanOrEqual(44);
  });

  it('dibujado redondeado y con borde grueso, sin la estrella de 16 picos', () => {
    const trozo = GAME.slice(GAME.indexOf('private drawBubbleShape'), GAME.indexOf('private bubbleTail'));
    expect(trozo).toContain('fillRoundedRect');
    expect(trozo).toContain('strokeRoundedRect');
    expect(trozo).not.toContain('spikes = 16');
    expect(GAME).toContain('CREAM_BUBBLE');
  });

  it('la etiqueta de destino se apoya en la cabeza (r=11 a -30 px)', () => {
    expect(GAME).toContain('this.add.container(0, -30)');
    expect(GAME).toContain('fillCircle(0, 0, 11)');
  });
});

describe('el globo no tapa el puzle en los 30 niveles', () => {
  for (let nivel = 1; nivel <= 30; nivel += 1) {
    it(`nivel ${nivel}: caras, etiquetas, símbolos y ascensor libres`, () => {
      const anclas = anclasDe(nivel);
      for (const hablante of anclas) {
        for (const texto of [FRASES[nivel % FRASES.length], FRASES[(nivel + 2) % FRASES.length]]) {
          const box = bubbleBox(texto);
          const otras = anclas.filter((a) => a.id !== hablante.id);
          const pos = anchorBubble(hablante, box, otras, BUBBLE_OPTIONS, [CAB]);
          // Dentro de la pantalla y por debajo del HUD.
          expect(pos.x - box.w / 2).toBeGreaterThanOrEqual(BUBBLE_OPTIONS.margin - 0.001);
          expect(pos.x + box.w / 2).toBeLessThanOrEqual(BUBBLE_OPTIONS.screenW - BUBBLE_OPTIONS.margin + 0.001);
          expect(pos.y - box.h / 2).toBeGreaterThanOrEqual(BUBBLE_OPTIONS.topLimit - 0.001);
          // Ni una cara/etiqueta tapada, tampoco la del propio hablante.
          for (const a of anclas) {
            expect(toca(pos, box, protectedRect(a)), `taparía al pasajero ${a.id} (nv ${nivel})`).toBe(false);
          }
          expect(toca(pos, box, protectedRect(CAB)), 'taparía el ascensor').toBe(false);
          if (pos.zone === 'reserva') {
            // La banda reservada queda por encima de la etiqueta más alta.
            const techo = Math.min(...anclas.map((a) => a.y - a.h / 2 - 58));
            expect(pos.y + box.h / 2, 'la reserva debe quedar sobre todas las cabezas')
              .toBeLessThanOrEqual(techo);
          }
        }
      }
    });
  }
});

describe('zona reservada y turnos (garantías del Sprint 2 intactas)', () => {
  it('sin hueco junto al hablante, el globo va a la banda reservada', () => {
    // Fila apretada justo bajo el HUD: encima no cabe (techo) y a los lados
    // están las etiquetas de los vecinos → sólo queda la banda reservada.
    const anclas = Array.from({ length: 5 }, (_, i) => ({
      id: i, x: 60 + i * 100, y: 200, w: 64, h: 64,
    }));
    const box = bubbleBox('Perdón por el bulto: es todo cariño.');
    const pos = anchorBubble(anclas[2], box, anclas.filter((a) => a.id !== 2), BUBBLE_OPTIONS, []);
    expect(pos.zone).toBe('reserva');
    expect(pos.y).toBeCloseTo(BUBBLE_OPTIONS.topLimit + box.h / 2, 5);
  });

  it('un solo globo a la vez y la prioridad alta interrumpe', () => {
    const d = new BubbleDirector();
    const anclas = new Map<number, Anchor>([[1, { x: 100, y: 900, w: 64, h: 64 }]]);
    d.say(1, 'charla decorativa larga', PRIORITY.chat, 0);
    let ev = d.update(10, anclas);
    expect(ev.filter((e) => e.kind === 'show')).toHaveLength(1);
    d.say(2, '¡piso equivocado!', PRIORITY.error, 400);
    ev = d.update(400, anclas);
    expect(ev.some((e) => e.kind === 'hide')).toBe(true);
    // Pasado el hueco mínimo entre globos, entra el aviso sin ancla: reservada.
    ev = d.update(750, new Map());
    const show = ev.find((e) => e.kind === 'show');
    expect(show?.req.priority).toBe(PRIORITY.error);
    expect(show?.zone).toBe('reserva');
  });
});

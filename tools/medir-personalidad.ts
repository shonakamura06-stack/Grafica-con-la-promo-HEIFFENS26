/**
 * MEDICIÓN DEL COSTE DE LA PERSONALIDAD — ¡Piso Equivocado! (Sprint 2)
 *
 * No hay navegador en el entorno de pruebas, así que no se puede medir el juego
 * corriendo de verdad. Lo que sí se puede medir —y es lo que importa para un móvil
 * modesto— es el trabajo de CÁLCULO que el motor repite en cada fotograma: el reposo
 * de los monstruos, los temporizadores de cara, el director de bocadillos y el de
 * interacciones. Todo eso es CPU pura y no depende del navegador.
 *
 * Uso:  npx vite-node tools/medir-personalidad.ts
 *
 * Resultado en este entorno (Node, 10 pasajeros = el peor nivel del juego):
 *   reposo (idleFrame)            ~7 µs/fotograma
 *   caras (parpadeo/mirada/sfx)   ~1,3 µs
 *   bocadillos (director)         ~1,5 µs
 *   interacciones (director)      ~0,2 µs
 *   TOTAL                         ~10 µs = 0,06 % de los 16 667 µs de un fotograma
 *   geometría de la cola          ~13 µs, y sólo al entrar o salir alguien
 *
 * Para comparar: antes había UN tween infinito por pasajero (10 tweens repitiéndose
 * para siempre, con su callback y su interpolación en el bucle de tweens de Phaser)
 * más un temporizador global de parpadeos. Ahora el reposo es una fórmula sin
 * objetos y los tweens sólo existen para animaciones de menos de un segundo.
 */
import { LEVELS } from './src/data/levels';
import { MONSTERS, MONSTER_MAP } from './src/data/monsters';
import { buildCrew } from './src/systems/rules';
import { personalityOf, idlePhase, FX_LIMITS } from './src/systems/personality';
import { idleFrame, EventTimer } from './src/systems/animator';
import { layoutQueue, QUEUE_AREA, spriteSize } from './src/systems/queueLayout';
import { BubbleDirector, PRIORITY, bubbleBox, anchorBubble } from './src/systems/bubbles';
import { InteractionDirector } from './src/systems/interactions';

const NIVELES_CON_10 = LEVELS.map((l, i) => [i, buildCrew(l).length] as [number, number])
  .sort((a, b) => b[1] - a[1]).slice(0, 3);
console.log('niveles con más pasajeros:', NIVELES_CON_10.map(([i, n]) => `nv${i + 1}=${n}`).join(' '));
const peor = NIVELES_CON_10[0][1];

// ── 1. Reposo por cálculo: coste de animar a N pasajeros durante 1 s ─────────
function medirReposo(n: number, fotogramas = 60): number {
  const pax = Array.from({ length: n }, (_, i) => {
    const id = MONSTERS[i % MONSTERS.length].id;
    const p = personalityOf(id);
    return { p, phase: idlePhase(i, id) };
  });
  const t0 = process.hrtime.bigint();
  let suma = 0;
  for (let f = 0; f < fotogramas; f += 1) {
    const t = f / 60;
    for (const { p, phase } of pax) {
      const fr = idleFrame(p.idle, t, phase, p.amp, p.speed);
      suma += fr.dx + fr.dy + fr.sx + fr.sy + fr.angle;   // evita que el JIT lo optimice fuera
    }
  }
  const ns = Number(process.hrtime.bigint() - t0);
  return ns / fotogramas / 1000;                          // µs por fotograma
}

// ── 2. Geometría de la cola (sólo al entrar/salir alguien) ───────────────────
function medirCola(n: number): number {
  const items = MONSTERS.slice(0, n).map((m, i) => {
    const { w, h } = spriteSize(128, 0.5 * MONSTER_MAP[m.id].scale);
    return { id: i, w, h };
  });
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 100; k += 1) layoutQueue(items, QUEUE_AREA);
  return Number(process.hrtime.bigint() - t0) / 100 / 1000;
}

// ── 3. Bocadillos: una actualización completa con todos los anclajes ─────────
function medirBocadillos(n: number): number {
  const d = new BubbleDirector();
  const items = MONSTERS.slice(0, n).map((m, i) => {
    const { w, h } = spriteSize(128, 0.5 * MONSTER_MAP[m.id].scale);
    return { id: i, w, h };
  });
  const anclas = new Map(layoutQueue(items, QUEUE_AREA).slots.map((s) => [s.id, { x: s.x, y: s.y, w: s.w, h: s.h }]));
  anclas.set(-1, { x: 337, y: 300, w: 100, h: 90 });
  const t0 = process.hrtime.bigint();
  let mostrados = 0;
  for (let f = 0; f < 600; f += 1) {                        // 10 s de partida
    if (f % 60 === 0) for (let i = 0; i < n; i += 1) d.say(i, '¡Al piso 3, por favor!', PRIORITY.idle, f * 16);
    for (const ev of d.update(f * 16, anclas)) {
      if (ev.kind === 'show') { bubbleBox(ev.req.text); anchorBubble(anclas.get(ev.req.speaker)!, bubbleBox(ev.req.text), []); mostrados += 1; }
    }
  }
  const ns = Number(process.hrtime.bigint() - t0);
  return ns / 600 / 1000;
}

// ── 4. Director de interacciones con el peor reparto ─────────────────────────
function medirInteracciones(n: number): number {
  const dir = new InteractionDirector();
  const actores = MONSTERS.slice(0, n).map((m, i) => ({
    id: i, monsterId: m.id, rule: m.rule, place: 'queue' as const, asleep: false,
    coupleWith: m.kind === 'couple' ? (i + 1) % n : undefined,
    enemies: m.kind === 'enemy' ? [(i + 1) % n] : undefined,
    cabLoad: 2,
  }));
  const t0 = process.hrtime.bigint();
  let eventos = 0;
  for (let f = 0; f < 600; f += 1) {
    const ev = dir.update(f * 16, actores, { moving: false, dialogActive: false, liveParticles: eventos % FX_LIMITS.maxLiveParticles });
    if (ev) eventos += 1;
  }
  const ns = Number(process.hrtime.bigint() - t0);
  return ns / 600 / 1000;
}

// ── 5. Temporizadores de cara (parpadeo/mirada/sonido) ───────────────────────
function medirCaras(n: number): number {
  const pax = MONSTERS.slice(0, n).map((m) => {
    const p = personalityOf(m.id);
    return {
      p,
      b: new EventTimer(p.blink[0], p.blink[1], 0, Math.random),
      g: new EventTimer(p.gaze[0], p.gaze[1], 0, Math.random),
      s: new EventTimer(p.sfxEvery ?? 30, (p.sfxEvery ?? 30) * 1.6, 0, Math.random),
    };
  });
  const t0 = process.hrtime.bigint();
  let disparos = 0;
  for (let f = 0; f < 600; f += 1) {
    const now = f / 60;
    for (const x of pax) {
      if (x.b.due(now)) { disparos += 1; x.b.reset(now); }
      if (x.g.due(now)) { disparos += 1; x.g.reset(now); }
      if (x.s.due(now)) { disparos += 1; x.s.reset(now); }
    }
  }
  const ns = Number(process.hrtime.bigint() - t0);
  return ns / 600 / 1000;
}

console.log(`\nPeor caso del juego: ${peor} pasajeros a la vez\n`);
console.log('  coste por FOTOGRAMA (µs)     1 pasajero   ' + String(peor).padStart(2) + ' pasajeros');
const filas: Array<[string, number, number]> = [
  ['reposo (idleFrame)', medirReposo(1), medirReposo(peor)],
  ['caras (parpadeo/mirada/sfx)', medirCaras(1), medirCaras(peor)],
  ['bocadillos (director)', medirBocadillos(1), medirBocadillos(peor)],
  ['interacciones (director)', medirInteracciones(1), medirInteracciones(peor)],
];
let total = 0;
for (const [nombre, uno, muchos] of filas) {
  console.log('  ' + nombre.padEnd(30) + uno.toFixed(2).padStart(9) + muchos.toFixed(2).padStart(13));
  total += muchos;
}
console.log('  ' + 'TOTAL por fotograma'.padEnd(30) + ''.padStart(9) + total.toFixed(2).padStart(13));
const presupuesto = 16667;                                    // 60 fps = 16,67 ms
console.log(`\n  presupuesto de un fotograma a 60 fps: ${presupuesto} µs`);
console.log(`  la lógica nueva consume ${(total / presupuesto * 100).toFixed(3)} % del fotograma`);
console.log(`  geometría de la cola (${peor} sprites): ${medirCola(peor).toFixed(2)} µs, y sólo al entrar/salir alguien`);

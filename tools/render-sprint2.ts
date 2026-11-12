/**
 * RENDERIZADO FUERA DEL NAVEADOR — ¡Piso Equivocado! (Sprint 2)
 *
 * POR QUÉ EXISTE
 * --------------
 * En este entorno no hay navegador (ni se puede instalar: los binarios de Chromium
 * se descargan desde dominios fuera de la lista de hosts permitidos), así que NO se
 * puede hacer una captura de pantalla del juego corriendo ni grabar un vídeo.
 *
 * Lo que SÍ se puede hacer —y es lo que hace esta herramienta— es ejecutar el código
 * de dibujo REAL del juego fuera de Phaser:
 *
 *   - los 20 `DRAWERS` de `BootScene.ts`, con sus coordenadas y colores exactos,
 *     extraídos del fuente y transformados con esbuild (no redibujados a mano);
 *   - las texturas auxiliares reales (sombra, corazón, destello, estrella);
 *   - la geometría real de la cola (`systems/queueLayout.ts`) para el nivel que sea;
 *   - el reposo real (`systems/animator.ts::idleFrame`) fotograma a fotograma;
 *   - la forma real del bocadillo (copiada de `GameScene.drawBubbleShape`) colocada
 *     donde decide `systems/bubbles.ts::anchorBubble`.
 *
 * QUÉ NO ES
 * ---------
 * No es una captura del juego. El fondo es esquemático (no se reproduce el arte del
 * hotel, que depende de cosméticos y de decenas de primitivas de escena) y el
 * renderizador de Phaser (WebGL/Canvas con sus uniones de línea y filtrado de
 * texturas) se sustituye por un shim sobre `@napi-rs/canvas` cuya semántica se copió
 * de `node_modules/phaser/src/gameobjects/graphics/Graphics.js`. Los SPRITES y las
 * POSICIONES son exactos; el acabado final puede diferir en detalles de antialiasing.
 *
 * Uso:  npx vite-node tools/render-sprint2.ts [nivel]
 * Salida: docs/imagenes/*.png y *.gif
 */
// Los módulos NATIVOS (canvas de Skia) y esbuild no pueden pasar por el
// transformador de Vite: se cargan con el require de Node. Los módulos del juego
// sí van por Vite, que es quien entiende TypeScript y `?raw`.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require('@napi-rs/canvas') as typeof import('@napi-rs/canvas');
const { transformSync } = require('esbuild') as typeof import('esbuild');
const { GIFEncoder, quantize, applyPalette } = require('gifenc') as {
  GIFEncoder: () => {
    writeFrame: (i: Uint8Array, w: number, h: number, o: { palette: number[][]; delay: number }) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };
  quantize: (rgba: Uint8Array, n: number) => number[][];
  applyPalette: (rgba: Uint8Array, palette: number[][]) => Uint8Array;
};
type Canvas = ReturnType<typeof createCanvas>;
type SKRSContext2D = ReturnType<Canvas['getContext']>;

import BOOT_SRC from '../src/scenes/BootScene.ts?raw';
import { LEVELS } from '../src/data/levels';
import { MONSTERS, MONSTER_MAP, floorColor } from '../src/data/monsters';
import { buildCrew } from '../src/systems/rules';
import { layoutQueue, QUEUE_AREA, spriteSize } from '../src/systems/queueLayout';
import { bubbleBox, anchorBubble, wrapText, BUBBLE_OPTIONS } from '../src/systems/bubbles';
import { personalityOf, idlePhase, hasBlink, hasGaze } from '../src/systems/personality';
import { idleFrame } from '../src/systems/animator';
import { queueLineFor } from '../src/data/voices';

const T = 128;                    // tamaño de textura de monstruo (real, de BootScene)
const SALIDA = resolve(process.cwd(), 'docs/imagenes');
mkdirSync(SALIDA, { recursive: true });

// ── Shim de Phaser.GameObjects.Graphics sobre canvas 2D ──────────────────────
// La semántica de cada método se copió de Graphics.js de Phaser (relleno inmediato
// en fillCircle/fillEllipse/..., acumulación de path en beginPath/arc/fillPath).
const TAU = Math.PI * 2;

function color(n: number, a = 1): string {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

type Op = ['m' | 'l', number, number] | ['z'] | ['a', number, number, number, number, number, boolean];

class Graphics {
  private relleno = 'rgba(0,0,0,1)';
  private grosor = 0;
  private trazo = 'rgba(0,0,0,1)';
  private path: Op[] = [];
  constructor(private ctx: SKRSContext2D) {}

  fillStyle(c: number, a = 1): this { this.relleno = color(c, a); return this; }
  lineStyle(w: number, c: number, a = 1): this { this.grosor = w; this.trazo = color(c, a); return this; }
  beginPath(): this { this.path = []; return this; }
  moveTo(x: number, y: number): this { this.path.push(['m', x, y]); return this; }
  lineTo(x: number, y: number): this { this.path.push(['l', x, y]); return this; }
  closePath(): this { this.path.push(['z']); return this; }
  arc(x: number, y: number, r: number, sa: number, ea: number, ccw = false): this {
    this.path.push(['a', x, y, r, sa, ea, !!ccw]);
    return this;
  }
  /** Phaser: beginPath + moveTo(centro) + arc + closePath (hay que llamar a fillPath). */
  slice(x: number, y: number, r: number, sa: number, ea: number, ccw = false): this {
    return this.beginPath().moveTo(x, y).arc(x, y, r, sa, ea, ccw).closePath();
  }
  private trazar(): void {
    const c = this.ctx;
    c.beginPath();
    for (const op of this.path) {
      if (op[0] === 'm') c.moveTo(op[1], op[2]);
      else if (op[0] === 'l') c.lineTo(op[1], op[2]);
      else if (op[0] === 'z') c.closePath();
      else c.arc(op[1], op[2], op[3], op[4], op[5], op[6]);
    }
  }
  fillPath(): this { this.trazar(); this.ctx.fillStyle = this.relleno; this.ctx.fill(); return this; }
  strokePath(): this {
    this.trazar();
    this.ctx.lineWidth = this.grosor;
    this.ctx.strokeStyle = this.trazo;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
    return this;
  }
  fillCircle(x: number, y: number, r: number): this { return this.beginPath().arc(x, y, r, 0, TAU).fillPath(); }
  strokeCircle(x: number, y: number, r: number): this { return this.beginPath().arc(x, y, r, 0, TAU).strokePath(); }
  fillRect(x: number, y: number, w: number, h: number): this {
    this.ctx.fillStyle = this.relleno; this.ctx.fillRect(x, y, w, h); return this;
  }
  fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): this {
    return this.beginPath().moveTo(x1, y1).lineTo(x2, y2).lineTo(x3, y3).closePath().fillPath();
  }
  /** Phaser: Ellipse(x, y, width, height) → x,y es el CENTRO y width/height completos. */
  fillEllipse(x: number, y: number, w: number, h: number): this {
    this.ctx.beginPath(); this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, TAU);
    this.ctx.fillStyle = this.relleno; this.ctx.fill(); return this;
  }
  strokeEllipse(x: number, y: number, w: number, h: number): this {
    this.ctx.beginPath(); this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, TAU);
    this.ctx.lineWidth = this.grosor; this.ctx.strokeStyle = this.trazo; this.ctx.stroke(); return this;
  }
  private rutaRedondeada(x: number, y: number, w: number, h: number, r: number | Record<string, number>): void {
    const tl = typeof r === 'number' ? r : (r.tl ?? 20);
    const tr = typeof r === 'number' ? r : (r.tr ?? 20);
    const br = typeof r === 'number' ? r : (r.br ?? 20);
    const bl = typeof r === 'number' ? r : (r.bl ?? 20);
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + tl, y);
    c.lineTo(x + w - tr, y);
    c.arcTo(x + w, y, x + w, y + tr, tr);
    c.lineTo(x + w, y + h - br);
    c.arcTo(x + w, y + h, x + w - br, y + h, br);
    c.lineTo(x + bl, y + h);
    c.arcTo(x, y + h, x, y + h - bl, bl);
    c.lineTo(x, y + tl);
    c.arcTo(x, y, x + tl, y, tl);
    c.closePath();
  }
  fillRoundedRect(x: number, y: number, w: number, h: number, r: number | Record<string, number> = 20): this {
    this.rutaRedondeada(x, y, w, h, r); this.ctx.fillStyle = this.relleno; this.ctx.fill(); return this;
  }
  strokeRoundedRect(x: number, y: number, w: number, h: number, r: number | Record<string, number> = 20): this {
    this.rutaRedondeada(x, y, w, h, r);
    this.ctx.lineWidth = this.grosor; this.ctx.strokeStyle = this.trazo; this.ctx.stroke(); return this;
  }
  fillPoints(pts: Array<{ x: number; y: number }>, closeShape = false, closePath = false): this {
    this.beginPath();
    this.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) this.lineTo(pts[i].x, pts[i].y);
    if (closeShape) this.lineTo(pts[0].x, pts[0].y);
    if (closePath) this.closePath();
    return this.fillPath();
  }
  strokePoints(pts: Array<{ x: number; y: number }>, closeShape = false, closePath = false): this {
    this.beginPath();
    this.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) this.lineTo(pts[i].x, pts[i].y);
    if (closeShape) this.lineTo(pts[0].x, pts[0].y);
    if (closePath) this.closePath();
    return this.strokePath();
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number): this {
    return this.beginPath().moveTo(x1, y1).lineTo(x2, y2).strokePath();
  }
  clear(): this { this.ctx.clearRect(0, 0, 4096, 4096); return this; }
  generateTexture(): this { return this; }
  destroy(): void { /* nada */ }
}

/** Stub mínimo de Phaser para el código extraído (sólo usa Math.Vector2). */
const PhaserStub = {
  Math: { Vector2: class { constructor(public x = 0, public y = 0) {} } },
};

// ── Extracción del código de dibujo REAL de BootScene ────────────────────────
function extraerDibujantes(): {
  DRAWERS: Record<string, (g: unknown, mood: string) => void>;
  setFace: (blink: boolean, gaze: number) => void;
} {
  const inicio = BOOT_SRC.indexOf('const T = 128;');
  const fin = BOOT_SRC.indexOf('export default class BootScene');
  if (inicio < 0 || fin < 0 || fin < inicio) throw new Error('no se localizó el bloque de dibujantes');
  const fuente = BOOT_SRC.slice(inicio, fin);
  if (fuente.includes('export ')) throw new Error('el bloque extraído contiene un export inesperado');
  const codigo = `${fuente}
function setFace(b, gz) { BLINK = b; GAZE = gz; }
return { DRAWERS, T, C, OUT, setFace };`;
  const js = transformSync(codigo, { loader: 'ts', target: 'es2020' }).code;
  // eslint-disable-next-line no-new-func
  return new Function('Phaser', js)(PhaserStub);
}

/**
 * Texturas auxiliares REALES (sombra, corazón, destello) extraídas de `create()`.
 *
 * Sólo se buscan los bloques de estas tres texturas: la regex general también
 * atrapaba el bucle que genera los monstruos (que contiene llaves sueltas) y el
 * código extraído no compilaba. Cada bloque va entre `const g = this.add.graphics()`
 * y su `g.destroy()`, así que se recorta por esos dos bordes y se valida.
 */
const AUXILIARES: Array<[string, number, number]> = [['heart', 44, 44], ['sparkle', 24, 24], ['shadow', 64, 20]];

function extraerAuxiliares(): Record<string, Canvas> {
  const out: Record<string, Canvas> = {};
  for (const [nombre, w, h] of AUXILIARES) {
    const marca = `g.generateTexture('${nombre}', ${w}, ${h});`;
    const fin = BOOT_SRC.indexOf(marca);
    if (fin < 0) throw new Error(`no se encontró la textura auxiliar ${nombre}`);
    // El bloque empieza en el `this.add.graphics()` más cercano por encima.
    const inicio = BOOT_SRC.lastIndexOf('const g = this.add.graphics();', fin);
    if (inicio < 0) throw new Error(`bloque incompleto para ${nombre}`);
    const cuerpo = BOOT_SRC.slice(inicio + 'const g = this.add.graphics();'.length, fin);
    if (cuerpo.includes('this.add') || cuerpo.includes('DRAWERS')) {
      throw new Error(`el bloque de ${nombre} se ha recortado mal`);
    }
    const m = { 1: cuerpo, 2: nombre, 3: String(w), 4: String(h) } as unknown as RegExpExecArray;
    {
      const [, cuerpo2] = [null, cuerpo] as unknown as Array<string | null>;
      void cuerpo2;
    }
    out[nombre] = renderizar(Number(m[3]), Number(m[4]), (g) => {
      // Se envuelve el bloque en una función: el de `sparkle` y compañía son
      // sentencias sueltas que necesitan un cuerpo propio.
      const js = transformSync(`function __dibujar(g: any, Phaser: any): void {${m[1]}\n}`,
        { loader: 'ts', target: 'es2020' }).code;
      // eslint-disable-next-line no-new-func
      new Function(`${js}; return __dibujar;`)()(g, PhaserStub);
    });
  }
  return out;
}

function renderizar(w: number, h: number, dibujar: (g: Graphics) => void): Canvas {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  dibujar(new Graphics(ctx));
  return canvas;
}

const { DRAWERS, setFace } = extraerDibujantes();
const AUX = extraerAuxiliares();

// ── Sprites: los 20 monstruos con sus variantes de cara REALES ───────────────
type Cara = 'open' | 'blink' | 'left' | 'right';
const SPRITES = new Map<string, Canvas>();

/**
 * El mismo acabado 2.5D que `volumen25D` de BootScene (Sprint 2.2): luz cenital,
 * sombra en la base y especular, recortados con `source-atop` a la silueta.
 */
function aplicarVolumen(canvas: Canvas): void {
  const c2 = canvas.getContext('2d');
  c2.globalCompositeOperation = 'source-atop';
  let gr = c2.createRadialGradient(T * 0.38, T * 0.32, 6, T * 0.5, T * 0.58, T * 0.66);
  gr.addColorStop(0, 'rgba(255,255,255,0.28)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.06)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  c2.fillStyle = gr; c2.fillRect(0, 0, T, T);
  gr = c2.createRadialGradient(T * 0.5, T * 1.05, 10, T * 0.5, T * 0.78, T * 0.6);
  gr.addColorStop(0, 'rgba(43,20,64,0.20)');
  gr.addColorStop(1, 'rgba(43,20,64,0)');
  c2.fillStyle = gr; c2.fillRect(0, 0, T, T);
  c2.globalAlpha = 0.45; c2.fillStyle = '#ffffff';
  c2.beginPath(); c2.ellipse(T * 0.36, T * 0.28, 8, 5, -0.5, 0, TAU); c2.fill();
  c2.globalAlpha = 1;
  c2.globalCompositeOperation = 'source-over';
}

/** Tinta lavada de la fila de atrás (perspectiva atmosférica del juego). */
const TINTADOS = new Map<string, Canvas>();
function tintar(canvas: Canvas, hex: string): Canvas {
  const clave = `${hex}|${canvas.width}`;
  const cache = TINTADOS.get(clave + Object.prototype.toString.call(canvas));
  void cache;
  const c = createCanvas(canvas.width, canvas.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(canvas, 0, 0);
  return c;
}

function sprite(monsterId: string, cara: Cara = 'open', mood = 'happy'): Canvas {
  const clave = `${monsterId}|${mood}|${cara}`;
  const existente = SPRITES.get(clave);
  if (existente) return existente;
  setFace(cara === 'blink', cara === 'left' ? -1 : cara === 'right' ? 1 : 0);
  const canvas = renderizar(T, T, (g) => DRAWERS[monsterId](g, mood));
  setFace(false, 0);
  aplicarVolumen(canvas);
  SPRITES.set(clave, canvas);
  return canvas;
}

// ── Dibujo de un pasajero tal y como lo compone GameScene ────────────────────
interface PaxVisual {
  id: number;
  monsterId: string;
  dest: number;
  rule: string;
  escala: number;          // 0,5 × def.scale × fitScale (la real de la cola)
  couple: boolean;
  enemy: boolean;
  fase: number;
  pers: ReturnType<typeof personalityOf>;
}

function dibujarPasajero(
  ctx: SKRSContext2D, p: PaxVisual, x: number, y: number, t: number, cara: Cara = 'open',
  fila = 1,
): void {
  const f = idleFrame(p.pers.idle, t, p.fase, p.pers.amp, p.pers.speed,
    p.pers.idle === 'mirror' ? 0.42 * p.pers.speed * TAU : 0);
  // Sprint 2.2: la fila de atrás va un 6 % menor y lavada, como en el juego.
  const escala = p.escala * (fila === 0 ? 0.94 : 1);
  const ancho = T * escala;

  // Sombra individual bajo LOS PIES y del ancho de cada sprite (como GameScene).
  if (AUX.shadow) {
    const sw = 64 * 0.92 * (ancho / 64);
    const sh = 20 * 0.8 * (fila === 0 ? 0.85 : 1);
    ctx.save();
    ctx.globalAlpha = fila === 0 ? 0.75 : 0.9;
    ctx.drawImage(AUX.shadow, x - sw / 2, y + ancho / 2 - 4 - sh / 2, sw, sh);
    ctx.restore();
  }

  // Sprite con el transform del reposo (posición, escala y ángulo reales).
  // Los fantasmas viven con alpha 0,9 en el juego (GameScene: `setAlpha(0.9)`).
  ctx.save();
  ctx.globalAlpha = p.rule === 'ghost' ? 0.9 : 1;
  ctx.translate(x + f.dx, y + f.dy);
  ctx.rotate((f.angle * Math.PI) / 180);
  let img = sprite(p.monsterId, cara === 'open' && !hasBlink(p.monsterId) ? 'open' : cara);
  if (fila === 0) img = tintar(img, '#e4dfef');
  ctx.drawImage(img, (-T / 2) * escala * f.sx, (-T / 2) * escala * f.sy,
    T * escala * f.sx, T * escala * f.sy);
  ctx.restore();

  // Etiqueta de destino APOYADA en la cabeza (r=11, anillo 2,5, número 14 px).
  const badgeY = y - 30;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, badgeY, 11, 0, TAU);
  ctx.fillStyle = color(floorColor(p.dest));
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.stroke();
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillText(`${p.dest}`, x, badgeY + 1.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${p.dest}`, x, badgeY);
  ctx.restore();

  // Símbolos de relación pequeños y flanqueando la etiqueta (menos ruido).
  if (p.couple && AUX.heart) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(AUX.heart, x - 15 - 8.8, y - 45 - 8.8, 17.6, 17.6);
    ctx.restore();
  }
  if (p.enemy) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(destelloRojo(), x + 15 - 6.6, y - 45 - 6.6, 13.2, 13.2);
    ctx.restore();
  }
  void ancho;
}

/** El destello de enemigo con el tinte rojo del juego (0xef4444), sin tocar el fondo. */
let destelloTintado: Canvas | null = null;
function destelloRojo(): Canvas {
  if (destelloTintado) return destelloTintado;
  const base = AUX.sparkle;
  const c = createCanvas(base.width, base.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(base, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = 'rgba(239,68,68,1)';
  ctx.fillRect(0, 0, base.width, base.height);
  destelloTintado = c;
  return c;
}

// ── Bocadillo de cómic redondeado (réplica de GameScene.drawBubbleShape 2.2) ──
function dibujarGlobo(
  ctx: SKRSContext2D, x: number, y: number, texto: string,
  tail: { dx: number; dy: number; len: number } = { dx: -0.35, dy: 1, len: 14 },
): { w: number; h: number } {
  // Métricas del juego: redonda infantil de 16 px, ajuste a 236 px.
  ctx.font = 'bold 16px sans-serif';
  const lineas = wrapText(texto, 26);
  const anchoTexto = Math.max(...lineas.map((l) => ctx.measureText(l).width));
  const w = Math.min(280, anchoTexto + 36);
  const h = Math.max(44, lineas.length * 20 + 24);
  const r = Math.min(20, h / 2);
  const g = new Graphics(ctx);
  const { dx, dy, len } = tail;
  const punta = { x: dx * (h / 2 + len), y: dy * (h / 2 + len) };
  const base = { x: dx * (h / 2 - 8), y: dy * (h / 2 - 8) };
  const px = -dy * 8;
  const py = dx * 8;
  const cola = [
    { x: base.x + px, y: base.y + py },
    { x: punta.x, y: punta.y },
    { x: base.x - px, y: base.y - py },
  ];
  ctx.save();
  ctx.translate(x, y);
  g.fillStyle(0x8f96a8, 0.22);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 5, w, h, r);
  g.fillPoints(cola.map((c) => ({ x: c.x + 4, y: c.y + 5 })), true);
  g.fillStyle(0xfff6e8, 0.98);
  g.fillPoints(cola, true);
  g.lineStyle(4, 0x241640, 1);
  g.strokePoints(cola, true);
  g.fillStyle(0xfff6e8, 0.98);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.lineStyle(4, 0x241640, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  g.lineStyle(0, 0, 0);
  g.fillStyle(0xfff6e8, 1);
  g.fillPoints([
    { x: base.x + px * 0.9, y: base.y + py * 0.9 },
    { x: base.x - px * 0.9, y: base.y - py * 0.9 },
    { x: dx * (h / 2 + 4), y: dy * (h / 2 + 4) },
  ], true);
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4a2d18';
  lineas.forEach((l, i) => ctx.fillText(l, 0, (i - (lineas.length - 1) / 2) * 20));
  ctx.restore();
  return { w, h };
}

// ── Fondo esquemático (NO es el arte del hotel) ──────────────────────────────
function fondoEsquematico(ctx: SKRSContext2D, w: number, h: number, y0: number): void {
  // Pared con degradado cálido y molduras: ambiente de hotel de juguete.
  const pared = ctx.createLinearGradient(0, 0, 0, h);
  pared.addColorStop(0, '#ffe9c9');
  pared.addColorStop(0.55, '#ffd9b0');
  pared.addColorStop(1, '#f7c795');
  ctx.fillStyle = pared;
  ctx.fillRect(0, 0, w, h);
  // Molduras y paneles de la pared (rectángulos redondeados suaves).
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let i = 0; i < 4; i += 1) {
    const px = 24 + i * 130;
    ctx.beginPath();
    (ctx as unknown as { roundRect: (x: number, y: number, ww: number, hh: number, rr: number) => void })
      .roundRect(px, 712 - y0, 100, 58, 12);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(160,106,53,0.35)';
  ctx.fillRect(0, 776 - y0, w, 6);
  // Suelo de tablones con perspectiva suave y brillo central.
  const suelo = ctx.createLinearGradient(0, 782 - y0, 0, h);
  suelo.addColorStop(0, '#e8b078');
  suelo.addColorStop(1, '#c98b52');
  ctx.fillStyle = suelo;
  ctx.fillRect(0, 782 - y0, w, h - (782 - y0));
  ctx.strokeStyle = 'rgba(120,70,30,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * (w / 13), 782 - y0);
    ctx.lineTo(w / 2 + (i * (w / 13) - w / 2) * 1.5, h);
    ctx.stroke();
  }
  const brillo = ctx.createRadialGradient(w / 2, 860 - y0, 20, w / 2, 860 - y0, 300);
  brillo.addColorStop(0, 'rgba(255,240,200,0.35)');
  brillo.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 782 - y0, w, h - (782 - y0));
  // Guía del área de cola (solo para lectura técnica, no existe en el juego).
  ctx.strokeStyle = 'rgba(120,90,60,0.35)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(QUEUE_AREA.left, QUEUE_AREA.top - y0, QUEUE_AREA.right - QUEUE_AREA.left, QUEUE_AREA.bottom - QUEUE_AREA.top);
  ctx.setLineDash([]);
}

function rotulo(ctx: SKRSContext2D, texto: string, x: number, y: number, size = 13, fill = '#6b4423'): void {
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = fill;
  ctx.fillText(texto, x, y);
}

// ── Construcción del reparto visual de un nivel ──────────────────────────────
function reparto(nivel: number): { pax: PaxVisual[]; slots: ReturnType<typeof layoutQueue> } {
  const lvl = LEVELS[nivel - 1];
  const crew = buildCrew(lvl);
  const couples = new Set<number>();
  lvl.couples.forEach(([a, b]) => { couples.add(a); couples.add(b); });
  const enemies = new Set<number>();
  lvl.enemies.forEach(([a, b]) => { enemies.add(a); enemies.add(b); });

  // Escala real de la cola (0,5 × def.scale), igual que GameScene.queueScale.
  const previos = crew.map((m, i) => {
    const { w, h } = spriteSize(T, 0.5 * MONSTER_MAP[m.monsterId].scale);
    return { id: i, w, h };
  });
  const previa = layoutQueue(previos, QUEUE_AREA);
  const fit = previa.fitScale;

  const pax: PaxVisual[] = crew.map((m, i) => {
    const escala = 0.5 * MONSTER_MAP[m.monsterId].scale * fit;
    return {
      id: i, monsterId: m.monsterId, dest: m.dest, rule: m.rule, escala,
      couple: couples.has(i), enemy: enemies.has(i),
      fase: idlePhase(i, m.monsterId), pers: personalityOf(m.monsterId),
    };
  });
  const items = pax.map((p) => {
    const { w, h } = spriteSize(T, p.escala);
    return { id: p.id, w, h };
  });
  return { pax, slots: layoutQueue(items, QUEUE_AREA) };
}

// ═══════════════════════════════════════════════════════════════════════════
const nivel = Number(process.argv[2] ?? 30);
const { pax, slots } = reparto(nivel);

// ── 1. Zona de espera del nivel, a 2× ────────────────────────────────────────
function imagenCola(zoom: number, conMedidas: boolean, conGlobo: boolean, t: number): Canvas {
  const y0 = 700;
  const alto = 960 - y0;
  const canvas = createCanvas(540 * zoom, alto * zoom);
  const ctx = canvas.getContext('2d');
  ctx.scale(zoom, zoom);
  fondoEsquematico(ctx, 540, alto, y0);

  const porId = new Map(slots.slots.map((s) => [s.id, s]));
  // Orden de dibujo real: la fila de atrás primero (depth 10) y la delantera encima (12).
  const orden = [...pax].sort((a, b) => {
    const sa = porId.get(a.id)!; const sb = porId.get(b.id)!;
    return sa.depth - sb.depth || sa.x - sb.x;
  });

  // Líneas de suelo de cada fila.
  if (conMedidas) {
    const bases = [...new Set(slots.slots.map((s) => s.baseline))].sort((a, b) => a - b);
    bases.forEach((b) => {
      ctx.strokeStyle = 'rgba(37,99,235,0.55)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, b - y0); ctx.lineTo(540, b - y0); ctx.stroke();
      ctx.setLineDash([]);
      rotulo(ctx, `suelo y=${b.toFixed(0)}`, 4, b - y0 - 4, 11, '#1d4ed8');
    });
  }

  // Sprint 2.2: se elige como hablante al primero cuyo globo quepa JUNTO a él
  // (zona 'cerca'); si a nadie le cabe, se usa la zona reservada y el recorte
  // se extiende hacia arriba para que se vea.
  const vis0 = (q: typeof slots.slots[number]): { x: number; y: number; w: number; h: number } => {
    const k = q.row === 0 ? 0.94 : 1;
    return { x: q.x, y: q.y, w: q.w * k, h: q.h * k };
  };
  const cab0 = { x: 270, y: 430, w: 100, h: 130 };
  const fraseDe = (q: PaxVisual): string =>
    queueLineFor(q.monsterId, MONSTER_MAP[q.monsterId].kind, q.dest);
  let hablante: PaxVisual | null = null;
  let posGlobo: { x: number; y: number; zone: 'cerca' | 'reserva' } | null = null;
  let textoGlobo = '';
  if (conGlobo) {
    for (const cand of orden) {
      const sc = porId.get(cand.id)!;
      const otras = orden.filter((q) => q.id !== cand.id).map((q) => vis0(porId.get(q.id)!));
      const texto = fraseDe(cand);
      const pos = anchorBubble(vis0(sc), bubbleBox(texto), otras, BUBBLE_OPTIONS, [cab0]);
      if (pos.zone === 'cerca') { hablante = cand; posGlobo = pos; textoGlobo = texto; break; }
      if (!hablante) { hablante = cand; posGlobo = pos; textoGlobo = texto; }
    }
  }
  // Los pasajeros se dibujan sin el globo; el globo va después (depth 60 en el juego).
  for (const p of orden) {
    const s = porId.get(p.id)!;
    dibujarPasajero(ctx, p, s.x, s.y - y0, t, 'open', s.row);
    if (conMedidas) {
      ctx.strokeStyle = 'rgba(220,38,38,0.75)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x - s.w / 2, s.y - s.h / 2 - y0, s.w, s.h);
      rotulo(ctx, `${s.w.toFixed(0)}px`, s.x - s.w / 2, s.y + s.h / 2 - y0 + 12, 10, '#b91c1c');
    }
  }

  if (hablante && conGlobo && posGlobo) {
    const s = porId.get(hablante.id)!;
    const texto = textoGlobo;
    const ancla = vis0(s);
    const estimado = bubbleBox(texto);
    const pos = posGlobo;
    // Cola pequeña apuntando a la cabeza del hablante, como bubbleTail del juego.
    const vx = ancla.x - pos.x;
    const vy = ancla.y - ancla.h / 2 - 40 - pos.y;
    const d = Math.hypot(vx, vy) || 1;
    const real = dibujarGlobo(ctx, pos.x, pos.y - y0, texto,
      { dx: vx / d, dy: vy / d, len: Math.max(12, Math.min(90, d - 40)) });
    if (pos.zone === 'reserva') rotulo(ctx, 'zona reservada de diálogo', 6, 56, 11, '#15803d');
    if (conMedidas) {
      ctx.strokeStyle = 'rgba(22,163,74,0.9)';
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(pos.x - real.w / 2, pos.y - y0 - real.h / 2, real.w, real.h);
      ctx.setLineDash([]);
      rotulo(ctx, `globo ${real.w.toFixed(0)}×${real.h.toFixed(0)} (estimado ${estimado.w.toFixed(0)}×${estimado.h.toFixed(0)})`,
        6, 24, 11, '#15803d');
      rotulo(ctx, `«${texto}»`, 6, 40, 11, '#15803d');
    }
  }

  if (conMedidas) {
    // Separaciones horizontales reales entre sprites de la misma fila.
    for (const fila of [0, 1]) {
      const enFila = slots.slots.filter((s) => s.row === fila).sort((a, b) => a.x - b.x);
      for (let i = 1; i < enFila.length; i += 1) {
        const prev = enFila[i - 1]; const act = enFila[i];
        const hueco = act.x - act.w / 2 - (prev.x + prev.w / 2);
        const mx = prev.x + prev.w / 2;
        ctx.strokeStyle = hueco < 0 ? 'rgba(220,38,38,1)' : 'rgba(22,163,74,1)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(mx, act.baseline - y0 + 6); ctx.lineTo(mx + hueco, act.baseline - y0 + 6); ctx.stroke();
        rotulo(ctx, hueco.toFixed(1), mx + hueco / 2 - 8, act.baseline - y0 + 20, 10, hueco < 0 ? '#b91c1c' : '#15803d');
      }
    }
  }
  return canvas;
}

// ── 2. Hoja de caras: los 20 con ojos abiertos y parpadeo real ───────────────
function hojaCaras(): Canvas {
  const cols = 10;
  const celda = 150;
  const canvas = createCanvas(cols * celda, 2 * celda + 96);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fdf3e3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  rotulo(ctx, 'Cara de reposo (arriba) y parpadeo real (abajo) — texturas generadas por BootScene', 12, 26, 16);
  rotulo(ctx, 'Nube y Señor VIP no parpadean a propósito: duermen con los ojos cerrados y llevan gafas de sol.', 12, 48, 13, '#8a6a4a');
  MONSTERS.forEach((m, i) => {
    const col = i % cols;
    const fila = Math.floor(i / cols);
    const x = col * celda;
    const y = 64 + fila * celda;
    for (const [k, cara] of [['open', 'open'], ['blink', hasBlink(m.id) ? 'blink' : 'open']] as Array<[string, Cara]>) {
      const cx = x + (k === 'open' ? 38 : 112);
      ctx.drawImage(sprite(m.id, cara), cx - 32, y + 6, 64, 64);
      if (k === 'blink' && !hasBlink(m.id)) {
        rotulo(ctx, 'no aplica', cx - 26, y + 84, 10, '#a08060');
      }
    }
    rotulo(ctx, m.name, x + 8, y + 96, 12);
  });
  return canvas;
}

// ── 3. GIF del reposo real (idleFrame fotograma a fotograma) ─────────────────
function gifReposo(): { datos: Uint8Array; ancho: number; alto: number; fps: number } {
  const elegidos = ['sombrin', 'gordito', 'gemelos', 'nocti', 'fantasmita', 'grunon', 'moco', 'temblorin'];
  const celda = 118;
  const ancho = elegidos.length * celda;
  const alto = celda + 54;
  const fps = 20;
  const segundos = 3;
  const frames = fps * segundos;
  // Parpadeo forzado en un instante conocido, con la duración REAL del juego (130 ms).
  const blinkDesde = 1.2;
  const blinkHasta = blinkDesde + 0.13;

  const gif = GIFEncoder();
  const canvas = createCanvas(ancho, alto);
  const ctx = canvas.getContext('2d');
  for (let f = 0; f < frames; f += 1) {
    const t = f / fps;
    ctx.fillStyle = '#fdf3e3';
    ctx.fillRect(0, 0, ancho, alto);
    elegidos.forEach((id, i) => {
      const def = MONSTER_MAP[id];
      const x = i * celda + celda / 2;
      const y = 74;
      const p: PaxVisual = {
        id: i, monsterId: id, dest: 3, rule: def.rule,
        escala: 0.5 * def.scale, couple: false, enemy: false,
        fase: idlePhase(i, id), pers: personalityOf(id),
      };
      const cara: Cara = (t >= blinkDesde && t < blinkHasta && hasBlink(id)) ? 'blink' : 'open';
      // Sin insignia: aquí se juzga el movimiento del cuerpo, no el HUD.
      const f2 = idleFrame(p.pers.idle, t, p.fase, p.pers.amp, p.pers.speed,
        p.pers.idle === 'mirror' ? 0.42 * p.pers.speed * TAU : 0);
      if (AUX.shadow) ctx.drawImage(AUX.shadow, x - 28.8, y + 19, 57.6, 18);
      ctx.save();
      ctx.translate(x + f2.dx, y + f2.dy);
      ctx.rotate((f2.angle * Math.PI) / 180);
      const img = sprite(id, cara);
      const w = T * p.escala * f2.sx;
      const h = T * p.escala * f2.sy;
      if (def.rule === 'ghost') ctx.globalAlpha = 0.9;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
      rotulo(ctx, def.name, i * celda + 6, alto - 26, 12);
      rotulo(ctx, p.pers.idle, i * celda + 6, alto - 10, 10, '#8a6a4a');
    });
    rotulo(ctx, `t = ${t.toFixed(2)} s   (parpadeo real: 130 ms en t=1,20 s)`, 8, 18, 13);
    const rgba = new Uint8Array(ctx.getImageData(0, 0, ancho, alto).data);
    const palette = quantize(rgba, 256);
    const indexado = applyPalette(rgba, palette);
    gif.writeFrame(indexado, ancho, alto, { palette, delay: 1000 / fps });
  }
  gif.finish();
  return { datos: gif.bytes(), ancho, alto, fps };
}

// ── Guardado ────────────────────────────────────────────────────────────────
function guardar(canvas: Canvas, nombre: string): string {
  const ruta = resolve(SALIDA, nombre);
  writeFileSync(ruta, canvas.toBuffer('image/png'));
  return `${nombre} (${(canvas.width as number)}×${canvas.height as number})`;
}

const informes: string[] = [];
// La captura principal es la limpia; el globo y las cotas van en variantes aparte.
informes.push(guardar(imagenCola(2, false, false, 2.1), `nivel${nivel}-zona-espera.png`));
informes.push(guardar(imagenCola(2, false, true, 0.7), `nivel${nivel}-con-globo.png`));
informes.push(guardar(imagenCola(2, true, true, 0.7), `nivel${nivel}-medidas.png`));
informes.push(guardar(hojaCaras(), 'caras-20-monstruos.png'));

// ── Comparación ANTES (Sprint 2) / DESPUÉS (Sprint 2.2) ──────────────────────
const BANDA = 34;
async function comparacion(archivoAntes: string, ahora: Canvas, nombre: string): Promise<string> {
  const antes = await loadImage(resolve(SALIDA, 'antes', archivoAntes));
  const canvas = createCanvas(ahora.width, BANDA * 2 + antes.height + ahora.height + 6);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f7efe2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#8a4b00';
  ctx.fillText('ANTES · Sprint 2', 16, 24);
  ctx.drawImage(antes, 0, BANDA);
  const y2 = BANDA + antes.height + 6;
  ctx.fillStyle = '#15803d';
  ctx.fillText('DESPUÉS · Sprint 2.2', 16, y2 + 24);
  ctx.drawImage(ahora, 0, y2 + BANDA);
  writeFileSync(resolve(SALIDA, nombre), canvas.toBuffer('image/png'));
  return `${nombre} (${canvas.width}×${canvas.height})`;
}

const gif = gifReposo();
const rutaGif = resolve(SALIDA, 'animaciones-reposo.gif');
writeFileSync(rutaGif, gif.datos);
informes.push(`animaciones-reposo.gif (${gif.ancho}×${gif.alto}, ${gif.fps} fps, ${(gif.datos.length / 1024).toFixed(0)} kB)`);
informes.push(await comparacion('nivel30-zona-espera.png', imagenCola(2, false, false, 2.1), 'comparacion-zona-espera.png'));
informes.push(await comparacion('nivel30-con-globo.png', imagenCola(2, false, true, 0.7), 'comparacion-globo.png'));

// ── Informe numérico de lo que se ve ────────────────────────────────────────
const porId = new Map(slots.slots.map((s) => [s.id, s]));
const filas = [0, 1].map((r) => slots.slots.filter((s) => s.row === r).sort((a, b) => a.x - b.x));
console.log(`\nNIVEL ${nivel} — «${LEVELS[nivel - 1].title}» · ${pax.length} pasajeros · capacidad ${LEVELS[nivel - 1].capacity}`);
console.log(`filas: ${slots.rows} · fitScale: ${slots.fitScale.toFixed(3)} · separación mínima usada: ${slots.minGapUsed.toFixed(1)} px`);
console.log(`hueco libre sobre las cabezas: ${slots.headRoom.toFixed(1)} px (techo útil y=${QUEUE_AREA.top})\n`);
filas.forEach((f, i) => {
  if (!f.length) return;
  console.log(`FILA ${i === 0 ? 'de atrás' : 'delantera'} (${f.length}): suelo y=${f[0].baseline.toFixed(0)}`);
  f.forEach((s, k) => {
    const p = pax.find((q) => q.id === s.id)!;
    const prev = k > 0 ? f[k - 1] : null;
    const hueco = prev ? (s.x - s.w / 2 - (prev.x + prev.w / 2)).toFixed(1) : '—';
    console.log(`   ${MONSTER_MAP[p.monsterId].name.padEnd(12)} x=${s.x.toFixed(0).padStart(3)} sprite=${s.w.toFixed(0)}×${s.h.toFixed(0)}px`
      + ` altura en pantalla=${(s.h / 960 * 100).toFixed(1)}% hueco con el anterior=${hueco}px piso=${p.dest}`);
  });
});

// ¿Algún globo posible taparía una cara? Se prueban los 10 hablantes.
console.log('\nBOCADILLOS (colocación real de anchorBubble para cada hablante):');
let tapados = 0;
for (const p of pax) {
  const s = porId.get(p.id)!;
  const texto = queueLineFor(p.monsterId, MONSTER_MAP[p.monsterId].kind, p.dest);
  const ancla = { x: s.x, y: s.y, w: s.w, h: s.h };
  const otras = pax.filter((q) => q.id !== p.id).map((q) => {
    const r = porId.get(q.id)!;
    return { x: r.x, y: r.y, w: r.w, h: r.h };
  });
  const pos = anchorBubble(ancla, bubbleBox(texto), otras);
  const fuera = pos.x - bubbleBox(texto).w / 2 < 8 || pos.x + bubbleBox(texto).w / 2 > 532
    || pos.y - bubbleBox(texto).h / 2 < 108;
  let tapa = '';
  for (const o of otras) {
    const box = bubbleBox(texto);
    const solapaX = Math.abs(o.x - pos.x) < (o.w + box.w) / 2;
    const caraTop = o.y - o.h / 2;
    const caraBot = o.y - o.h * 0.1;
    const solapaY = pos.y + box.h / 2 > caraTop && pos.y - box.h / 2 < caraBot;
    if (solapaX && solapaY) tapa = ' TAPA UNA CARA';
  }
  if (fuera || tapa) tapados += 1;
  console.log(`   ${MONSTER_MAP[p.monsterId].name.padEnd(12)} globo en (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)})`
    + `${fuera ? ' FUERA DE PANTALLA' : ''}${tapa}`);
}
console.log(tapados === 0 ? '   → ningún globo se sale ni tapa una cara' : `   → ${tapados} problemas`);

console.log('\nImágenes generadas en docs/imagenes/:');
informes.forEach((i) => console.log('   ' + i));

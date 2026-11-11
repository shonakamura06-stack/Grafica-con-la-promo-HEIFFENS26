/**
 * Escena de arranque — genera TODAS las texturas del juego de forma
 * procedural (arte vectorial original, sin recursos externos).
 *
 * Los 12 monstruos son diseños 100 % originales creados para este juego:
 * cada uno tiene silueta, accesorios y personalidad propios (antenas de
 * estrella, rayo en la panza, gorro de fiesta, alas, lunares…). No se
 * copia ni se traza ninguna imagen de referencia.
 * Cada monstruo se dibuja en 3 ánimos: feliz, neutral y enojado.
 */

import Phaser from 'phaser';
import { MONSTERS, Mood } from '../data/monsters';

const T = 128; // tamaño de textura de monstruo
const C = T / 2;
const OUT = 0x3f2a1a; // contorno grueso oscuro estilo caricatura

type G = Phaser.GameObjects.Graphics;

function eye(g: G, x: number, y: number, r: number, pupilR: number, lookY = 0): void {
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x, y, r);
  g.fillStyle(0x241640, 1);
  g.fillCircle(x, y + lookY, pupilR);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x + pupilR * 0.35, y + lookY - pupilR * 0.35, pupilR * 0.4);
}

/** Boca según el ánimo: sonrisa, línea neutra o ceño fruncido. */
function mouth(g: G, mood: Mood, x: number, y: number, r: number, color = 0x6b4423): void {
  g.lineStyle(4, color, 1);
  g.beginPath();
  if (mood === 'happy') {
    g.arc(x, y, r, Math.PI * 0.15, Math.PI * 0.85, false);
  } else if (mood === 'neutral') {
    g.moveTo(x - r, y + r * 0.4);
    g.lineTo(x + r, y + r * 0.4);
  } else {
    g.arc(x, y + r * 1.7, r, Math.PI * 1.15, Math.PI * 1.85, false);
  }
  g.strokePath();
}

/** Cejas enojadas (solo en ánimo 'angry'). */
function angryBrows(g: G, x: number, y: number, spread: number): void {
  g.lineStyle(5, OUT, 1);
  g.beginPath();
  g.moveTo(x - spread - 9, y - 15);
  g.lineTo(x - 3, y - 7);
  g.moveTo(x + spread + 9, y - 15);
  g.lineTo(x + 3, y - 7);
  g.strokePath();
}

function cheeks(g: G, x: number, y: number, spread: number): void {
  g.fillStyle(0xf9a8d4, 0.65);
  g.fillCircle(x - spread, y, 8);
  g.fillCircle(x + spread, y, 8);
}

function feet(g: G, y: number, color: number): void {
  g.fillStyle(color, 1);
  g.fillEllipse(C - 18, y, 22, 12);
  g.fillEllipse(C + 18, y, 22, 12);
}

function outlineEllipse(g: G, x: number, y: number, w: number, h: number): void {
  g.lineStyle(5, OUT, 1);
  g.strokeEllipse(x, y, w, h);
}

function outlineCircle(g: G, x: number, y: number, r: number): void {
  g.lineStyle(5, OUT, 1);
  g.strokeCircle(x, y, r);
}

/** Estrella pequeña (para antenas, horquillas y decoración). */
function star(g: G, x: number, y: number, r: number, color: number): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  g.fillStyle(color, 1);
  g.fillPoints(pts, true);
}

const DRAWERS: Record<string, (g: G, mood: Mood) => void> = {
  // Bubu: morado de un ojo con antenas de estrella y estrella en la panza
  bubu(g, mood) {
    g.lineStyle(4, OUT, 1);
    g.lineBetween(C - 26, 36, C - 30, 14);
    g.lineBetween(C + 26, 36, C + 30, 14);
    star(g, C - 30, 11, 9, 0xffd678);
    star(g, C + 30, 11, 9, 0xffd678);
    g.fillStyle(0xa855f7, 1);
    g.fillEllipse(C, 72, 92, 84);
    outlineEllipse(g, C, 72, 92, 84);
    g.fillStyle(0xd8b4fe, 1);
    g.fillEllipse(C, 88, 58, 44);
    feet(g, 112, 0x7e22ce);
    eye(g, C, 60, 21, 11);
    if (mood === 'angry') angryBrows(g, C, 60, 14);
    mouth(g, mood, C, 80, 15);
    cheeks(g, C, 84, 30);
    star(g, C, 96, 7, 0xffd678);
    g.fillStyle(0xffffff, 0.4);
    g.fillEllipse(C - 26, 48, 18, 12);
  },
  // Chispa: amarilla eléctrica con mechón de rayo y rayo en la panza
  chispa(g, mood) {
    g.fillStyle(0xfacc15, 1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const x1 = C + Math.cos(a) * 34, y1 = 70 + Math.sin(a) * 34;
      const x2 = C + Math.cos(a + 0.35) * 34, y2 = 70 + Math.sin(a + 0.35) * 34;
      const xt = C + Math.cos(a + 0.17) * 56, yt = 70 + Math.sin(a + 0.17) * 56;
      g.fillTriangle(x1, y1, x2, y2, xt, yt);
    }
    g.fillStyle(0xfde047, 1);
    g.fillCircle(C, 70, 38);
    outlineCircle(g, C, 70, 38);
    g.fillStyle(0xfb923c, 1);
    g.fillPoints([
      new Phaser.Math.Vector2(C - 4, 22), new Phaser.Math.Vector2(C + 10, 34),
      new Phaser.Math.Vector2(C + 2, 40), new Phaser.Math.Vector2(C + 14, 46),
      new Phaser.Math.Vector2(C - 2, 52), new Phaser.Math.Vector2(C - 8, 38),
    ], true);
    eye(g, C - 13, 66, 11, 6);
    eye(g, C + 13, 66, 11, 6);
    if (mood === 'angry') angryBrows(g, C, 66, 13);
    if (mood === 'happy') {
      g.fillStyle(0x7f1d1d, 1);
      g.slice(C, 82, 13, 0, Math.PI, false);
      g.fillPath();
      g.fillStyle(0xf472b6, 1);
      g.slice(C, 88, 8, 0, Math.PI, false);
      g.fillPath();
    } else {
      mouth(g, mood, C, 80, 12);
    }
    // Rayo naranja en la panza (su marca)
    g.fillStyle(0xfb923c, 1);
    g.fillPoints([
      new Phaser.Math.Vector2(C + 4, 92), new Phaser.Math.Vector2(C - 5, 104),
      new Phaser.Math.Vector2(C - 1, 104), new Phaser.Math.Vector2(C - 4, 112),
      new Phaser.Math.Vector2(C + 6, 100), new Phaser.Math.Vector2(C + 2, 100),
    ], true);
    cheeks(g, C, 84, 24);
  },
  // Moco: verde gelatinoso con ojos en tallos, nariz gota y borde ondulado
  moco(g, mood) {
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(C, 66, 40);
    g.fillEllipse(C, 92, 70, 34);
    outlineCircle(g, C, 66, 40);
    g.fillStyle(0x86efac, 1);
    g.fillEllipse(C - 14, 52, 30, 20);
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(C - 16, 30, 9);
    g.fillCircle(C + 16, 30, 9);
    outlineCircle(g, C - 16, 30, 9);
    outlineCircle(g, C + 16, 30, 9);
    eye(g, C - 16, 30, 8, 4.5, 2);
    eye(g, C + 16, 30, 8, 4.5, 2);
    if (mood === 'angry') angryBrows(g, C, 30, 16);
    mouth(g, mood, C, 76, 12, 0x166534);
    // Nariz gota + borde ondulado inferior
    g.fillStyle(0x86efac, 1);
    g.fillCircle(C, 84, 5);
    g.fillTriangle(C - 4, 82, C + 4, 82, C, 72);
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(C - 22, 104, 8);
    g.fillCircle(C, 108, 8);
    g.fillCircle(C + 22, 104, 8);
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(C - 18, 58, 16, 26);
  },
  // Nube: azul nube con horquilla de estrella y gotitas
  nube(g, mood) {
    g.fillStyle(0x60a5fa, 1);
    g.fillCircle(C - 26, 74, 22);
    g.fillCircle(C, 62, 28);
    g.fillCircle(C + 26, 74, 22);
    g.fillEllipse(C, 82, 92, 34);
    outlineEllipse(g, C, 82, 92, 34);
    g.fillStyle(0x93c5fd, 1);
    g.fillEllipse(C, 76, 70, 26);
    g.lineStyle(4, 0x2563eb, 1);
    g.beginPath(); g.arc(C - 13, 72, 8, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
    g.beginPath(); g.arc(C + 13, 72, 8, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
    if (mood === 'angry') angryBrows(g, C, 72, 13);
    if (mood === 'happy') {
      g.fillStyle(0x2563eb, 1);
      g.fillEllipse(C, 88, 10, 12);
    } else {
      mouth(g, mood, C, 86, 9, 0x2563eb);
    }
    star(g, C + 22, 44, 8, 0xffd678);
    cheeks(g, C, 84, 26);
    g.fillStyle(0x60a5fa, 0.9);
    g.fillCircle(C + 40, 100, 5);
    g.fillCircle(C + 46, 110, 3.5);
  },
  // Draculín: vampiro con alas de murciélago y pajarita con gema
  draculin(g, mood) {
    g.fillStyle(0x7c3aed, 1);
    g.fillTriangle(C - 30, 108, C + 30, 108, C, 62);
    // Alas de murciélago
    g.fillTriangle(C - 34, 66, C - 56, 52, C - 50, 76);
    g.fillTriangle(C - 50, 76, C - 44, 66, C - 38, 78);
    g.fillTriangle(C + 34, 66, C + 56, 52, C + 50, 76);
    g.fillTriangle(C + 50, 76, C + 44, 66, C + 38, 78);
    g.fillStyle(0xfff1f2, 1);
    g.fillCircle(C, 62, 36);
    outlineCircle(g, C, 62, 36);
    g.fillStyle(0x7c3aed, 1);
    g.slice(C, 58, 37, Math.PI, Math.PI * 2, false);
    g.fillPath();
    g.fillTriangle(C - 36, 56, C - 50, 44, C - 34, 44);
    g.fillTriangle(C + 36, 56, C + 50, 44, C + 34, 44);
    eye(g, C - 13, 64, 10, 5.5);
    eye(g, C + 13, 64, 10, 5.5);
    if (mood === 'angry') angryBrows(g, C, 64, 13);
    if (mood === 'happy') {
      g.lineStyle(3, 0x9f1239, 1);
      g.beginPath(); g.arc(C, 78, 9, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(C - 7, 80, C - 3, 80, C - 5, 88);
      g.fillTriangle(C + 3, 80, C + 7, 80, C + 5, 88);
    } else {
      mouth(g, mood, C, 78, 9, 0x9f1239);
    }
    g.fillStyle(0xef4444, 1);
    g.fillTriangle(C - 2, 100, C - 14, 94, C - 14, 106);
    g.fillTriangle(C + 2, 100, C + 14, 94, C + 14, 106);
    g.fillCircle(C, 100, 4);
    g.fillStyle(0xffd678, 1);
    g.fillCircle(C, 100, 2.5);
  },
  // Rufi: naranja peludo con pecas, cola rizada y dientes de conejo
  rufi(g, mood) {
    g.fillStyle(0xfb923c, 1);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.fillCircle(C + Math.cos(a) * 36, 68 + Math.sin(a) * 36, 13);
    }
    g.fillCircle(C, 68, 38);
    outlineCircle(g, C, 68, 38);
    // Cola rizada
    g.fillStyle(0xfb923c, 1);
    g.fillCircle(C + 48, 92, 10);
    outlineCircle(g, C + 48, 92, 10);
    g.fillStyle(0xea580c, 1);
    g.fillCircle(C - 30, 34, 15);
    g.fillCircle(C + 30, 34, 15);
    outlineCircle(g, C - 30, 34, 15);
    outlineCircle(g, C + 30, 34, 15);
    g.fillStyle(0xfbcfe8, 1);
    g.fillCircle(C - 30, 34, 8);
    g.fillCircle(C + 30, 34, 8);
    eye(g, C - 14, 60, 11, 6);
    eye(g, C + 14, 60, 11, 6);
    if (mood === 'angry') angryBrows(g, C, 60, 14);
    g.fillStyle(0x7c2d12, 1);
    g.fillEllipse(C, 76, 18, 13);
    if (mood === 'happy') {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(C - 10, 84, 20, 13, 3);
      g.lineStyle(2, 0x7c2d12, 1);
      g.lineBetween(C, 84, C, 97);
    } else {
      mouth(g, mood, C, 86, 10, 0x7c2d12);
    }
    // Pecas
    g.fillStyle(0xc2410c, 1);
    g.fillCircle(C - 24, 74, 2.2);
    g.fillCircle(C - 19, 78, 2.2);
    g.fillCircle(C + 24, 74, 2.2);
    g.fillCircle(C + 19, 78, 2.2);
    cheeks(g, C, 78, 26);
  },
  // Glup: turquesa acuático con mechón de algas y aletas
  glup(g, mood) {
    g.fillStyle(0x2dd4bf, 1);
    g.fillEllipse(C, 72, 78, 88);
    outlineEllipse(g, C, 72, 78, 88);
    g.fillTriangle(C - 8, 30, C + 16, 30, C + 4, 8);
    g.fillTriangle(C - 38, 66, C - 56, 78, C - 36, 84);
    g.fillTriangle(C + 38, 66, C + 56, 78, C + 36, 84);
    g.fillStyle(0x99f6e4, 1);
    g.fillEllipse(C, 84, 48, 52);
    // Mechón de algas
    g.lineStyle(4, 0x16a34a, 1);
    g.beginPath(); g.moveTo(C - 6, 30); g.lineTo(C - 10, 16); g.strokePath();
    g.beginPath(); g.moveTo(C + 4, 30); g.lineTo(C + 8, 14); g.strokePath();
    eye(g, C - 14, 60, 12, 6.5);
    eye(g, C + 14, 60, 12, 6.5);
    if (mood === 'angry') angryBrows(g, C, 60, 14);
    if (mood === 'happy') {
      g.fillStyle(0x134e4a, 1);
      g.fillEllipse(C, 82, 13, 15);
    } else {
      mouth(g, mood, C, 82, 10, 0x134e4a);
    }
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(C + 34, 34, 8);
    g.strokeCircle(C + 44, 20, 5.5);
    g.strokeCircle(C + 28, 18, 4);
    cheeks(g, C, 80, 26);
  },
  // Sombrín: azul oscuro tímido con gorro de luna, manta y estrellitas
  sombrin(g, mood) {
    g.fillStyle(0x475569, 1);
    g.fillCircle(C, 70, 40);
    outlineCircle(g, C, 70, 40);
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(C + 6, 28, 15);
    g.fillStyle(0x475569, 1);
    g.fillCircle(C + 13, 24, 13);
    g.fillStyle(0x64748b, 1);
    g.fillEllipse(C, 88, 56, 36);
    eye(g, C - 13, 66, 10, 5, 4);
    eye(g, C + 13, 66, 10, 5, 4);
    if (mood === 'angry') angryBrows(g, C, 66, 13);
    mouth(g, mood, C, 82, 8, 0x1e293b);
    g.fillStyle(0xcbd5e1, 0.6);
    g.fillCircle(C - 24, 78, 6);
    g.fillCircle(C + 24, 78, 6);
    // Estrellitas flotantes
    star(g, C - 40, 40, 6, 0xfde68a);
    star(g, C + 42, 52, 5, 0xfde68a);
  },
  // Gordito: gigante rosa con corona, lunares y alitas
  gordito(g, mood) {
    g.fillStyle(0xffffff, 0.95);
    g.fillEllipse(C - 54, 66, 26, 14);
    g.fillEllipse(C + 54, 66, 26, 14);
    g.fillStyle(0xf472b6, 1);
    g.fillEllipse(C, 72, 104, 92);
    outlineEllipse(g, C, 72, 104, 92);
    g.fillStyle(0xf9a8d4, 1);
    g.fillEllipse(C, 88, 64, 48);
    // Lunares
    g.fillStyle(0xf472b6, 0.8);
    g.fillCircle(C - 30, 78, 6);
    g.fillCircle(C + 28, 88, 5);
    g.fillCircle(C + 12, 100, 4);
    g.fillStyle(0xffd678, 1);
    g.fillPoints([
      new Phaser.Math.Vector2(C - 20, 30), new Phaser.Math.Vector2(C - 20, 12),
      new Phaser.Math.Vector2(C - 10, 24), new Phaser.Math.Vector2(C, 8),
      new Phaser.Math.Vector2(C + 10, 24), new Phaser.Math.Vector2(C + 20, 12),
      new Phaser.Math.Vector2(C + 20, 30),
    ], true);
    eye(g, C - 16, 56, 10, 5.5);
    eye(g, C + 16, 56, 10, 5.5);
    if (mood === 'angry') angryBrows(g, C, 56, 16);
    mouth(g, mood, C, 70, 13);
    cheeks(g, C, 76, 34);
    g.fillStyle(0xf472b6, 1);
    g.fillCircle(C - 52, 80, 10);
    g.fillCircle(C + 52, 80, 10);
    g.fillStyle(0xffffff, 0.4);
    g.fillEllipse(C - 30, 44, 22, 14);
  },
  // Gemelos: pareja turquesa con antenas; uno lleva gorro de fiesta
  gemelos(g, mood) {
    const drawTwin = (cx: number, partyHat: boolean) => {
      g.fillStyle(0x2dd4bf, 1);
      g.fillCircle(cx, 78, 27);
      outlineCircle(g, cx, 78, 27);
      g.lineStyle(3, OUT, 1);
      g.lineBetween(cx, 52, cx, 40);
      g.fillStyle(0xffd678, 1);
      g.fillCircle(cx, 37, 6);
      if (partyHat) {
        g.fillStyle(0xf472b6, 1);
        g.fillTriangle(cx - 9, 54, cx + 9, 54, cx, 34);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx, 33, 4);
      }
      eye(g, cx - 9, 74, 8, 4.5);
      eye(g, cx + 9, 74, 8, 4.5);
      if (mood === 'angry') angryBrows(g, cx, 74, 9);
      mouth(g, mood, cx, 86, 8, 0x134e4a);
      g.fillStyle(0xef4444, 1);
      g.fillTriangle(cx - 1, 100, cx - 10, 95, cx - 10, 105);
      g.fillTriangle(cx + 1, 100, cx + 10, 95, cx + 10, 105);
    };
    drawTwin(38, false);
    drawTwin(90, true);
    g.fillStyle(0xf472b6, 1);
    g.fillCircle(C, 52, 6);
    g.fillTriangle(C - 6, 52, C + 6, 52, C, 62);
  },
  // Nocti: búho sonámbulo con gorro de dormir, plumas y pantuflas de luna
  nocti(g, mood) {
    g.fillStyle(0x818cf8, 1);
    g.fillCircle(C, 70, 40);
    outlineCircle(g, C, 70, 40);
    // Plumitas laterales
    g.fillTriangle(C - 38, 52, C - 50, 44, C - 46, 60);
    g.fillTriangle(C + 38, 52, C + 50, 44, C + 46, 60);
    g.fillStyle(0xc7d2fe, 1);
    g.fillCircle(C, 72, 29);
    g.fillStyle(0x4f46e5, 1);
    g.fillTriangle(C - 22, 40, C + 10, 34, C + 26, 52);
    g.fillCircle(C + 27, 53, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(C - 12, 68, 12);
    g.fillCircle(C + 12, 68, 12);
    g.fillStyle(0x1e1b4b, 1);
    g.fillCircle(C - 12, 71, 6);
    g.fillCircle(C + 12, 71, 6);
    g.fillStyle(0xc7d2fe, 1);
    g.fillRect(C - 25, 56, 26, 8);
    g.fillRect(C - 1, 56, 26, 8);
    if (mood === 'angry') angryBrows(g, C, 68, 12);
    g.fillStyle(0xfdba74, 1);
    g.fillTriangle(C - 5, 78, C + 5, 78, C, 86);
    // Pantuflas de luna
    g.fillStyle(0xfacc15, 1);
    g.fillEllipse(C - 16, 108, 18, 10);
    g.fillEllipse(C + 16, 108, 18, 10);
    g.lineStyle(3, 0x4f46e5, 1);
    g.lineBetween(C + 34, 30, C + 42, 30);
    g.lineBetween(C + 38, 34, C + 46, 34);
    g.lineBetween(C + 34, 38, C + 42, 38);
  },
  // Fantasmita: fantasma con moño rosa y mejillas grandes
  fantasmita(g, mood) {
    g.fillStyle(0xf8fafc, 0.97);
    g.fillCircle(C, 62, 36);
    g.fillRect(C - 36, 62, 72, 34);
    g.fillCircle(C - 24, 96, 10);
    g.fillCircle(C, 98, 10);
    g.fillCircle(C + 24, 96, 10);
    outlineCircle(g, C, 62, 36);
    g.lineStyle(4, 0x94a3b8, 1);
    g.beginPath(); g.arc(C - 13, 62, 8, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
    g.beginPath(); g.arc(C + 13, 62, 8, Math.PI * 1.05, Math.PI * 1.95, false); g.strokePath();
    if (mood === 'angry') angryBrows(g, C, 62, 13);
    if (mood === 'happy') {
      g.fillStyle(0x64748b, 1);
      g.fillEllipse(C, 78, 11, 13);
    } else {
      mouth(g, mood, C, 78, 9, 0x64748b);
    }
    cheeks(g, C, 76, 24);
    // Moño rosa
    g.fillStyle(0xf472b6, 1);
    g.fillTriangle(C + 18, 30, C + 32, 22, C + 34, 36);
    g.fillTriangle(C + 18, 30, C + 32, 38, C + 34, 24);
    g.fillCircle(C + 18, 30, 4);
    g.fillStyle(0xf8fafc, 0.97);
    g.fillEllipse(C - 40, 76, 16, 10);
    g.fillEllipse(C + 40, 76, 16, 10);
  },
  // Turista: monstruo azul con sombrero de sol y cámara
  turista(g, mood) {
    g.fillStyle(0x38bdf8, 1);
    g.fillEllipse(C, 72, 88, 84);
    outlineEllipse(g, C, 72, 88, 84);
    // Sombrero de sol
    g.fillStyle(0xfde68a, 1);
    g.fillEllipse(C, 40, 84, 20);
    g.fillStyle(0xf59e0b, 1);
    g.fillEllipse(C, 34, 48, 22);
    g.fillStyle(0xef4444, 1);
    g.fillRect(C - 24, 30, 48, 8);
    eye(g, C - 13, 62, 10, 5.5);
    eye(g, C + 13, 62, 10, 5.5);
    if (mood === 'angry') angryBrows(g, C, 62, 13);
    mouth(g, mood, C, 76, 12);
    cheeks(g, C, 78, 26);
    // Cámara colgando
    g.lineStyle(3, 0x7c4f24, 1);
    g.lineBetween(C - 20, 52, C - 8, 88);
    g.lineBetween(C + 20, 52, C + 8, 88);
    g.fillStyle(0x475569, 1);
    g.fillRoundedRect(C - 14, 86, 28, 20, 4);
    g.fillStyle(0x93c5fd, 1);
    g.fillCircle(C, 96, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(C, 96, 3);
  },
  // Señor VIP: monstruo dorado con gafas de sol y cadena de oro
  vip(g, mood) {
    g.fillStyle(0xf59e0b, 1);
    g.fillEllipse(C, 72, 92, 84);
    outlineEllipse(g, C, 72, 92, 84);
    // Cuernitos dorados
    g.fillStyle(0xfde68a, 1);
    g.fillTriangle(C - 30, 36, C - 40, 16, C - 20, 28);
    g.fillTriangle(C + 30, 36, C + 40, 16, C + 20, 28);
    // Gafas de sol
    g.fillStyle(0x1e293b, 1);
    g.fillRoundedRect(C - 28, 54, 24, 16, 6);
    g.fillRoundedRect(C + 4, 54, 24, 16, 6);
    g.fillRect(C - 4, 58, 8, 4);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(C - 24, 57, 8, 4);
    g.fillRect(C + 8, 57, 8, 4);
    mouth(g, mood, C, 82, 12);
    // Cadena de oro con medallón
    g.lineStyle(4, 0xffd678, 1);
    g.beginPath(); g.arc(C, 78, 22, Math.PI * 0.2, Math.PI * 0.8, false); g.strokePath();
    g.fillStyle(0xffd678, 1);
    g.fillCircle(C, 100, 7);
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(C, 100, 4);
    cheeks(g, C, 78, 30);
  },
  // Maletero: monstruo rojo fuerte con maletas
  maletero(g, mood) {
    g.fillStyle(0xef4444, 1);
    g.fillEllipse(C, 72, 96, 88);
    outlineEllipse(g, C, 72, 96, 88);
    // Brazos fuertes
    g.fillStyle(0xef4444, 1);
    g.fillCircle(C - 52, 78, 14);
    g.fillCircle(C + 52, 78, 14);
    outlineCircle(g, C - 52, 78, 14);
    outlineCircle(g, C + 52, 78, 14);
    eye(g, C - 14, 58, 11, 6);
    eye(g, C + 14, 58, 11, 6);
    if (mood === 'angry') angryBrows(g, C, 58, 14);
    mouth(g, mood, C, 74, 13);
    cheeks(g, C, 76, 30);
    // Maletas a los lados
    g.fillStyle(0x7c4f24, 1);
    g.fillRoundedRect(C - 62, 88, 20, 26, 4);
    g.fillRoundedRect(C + 42, 88, 20, 26, 4);
    g.fillStyle(0xa06a35, 1);
    g.fillRoundedRect(C - 62, 88, 20, 8, 4);
    g.fillRoundedRect(C + 42, 88, 20, 8, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(C - 56, 100, 8, 4);
    g.fillRect(C + 48, 100, 8, 4);
  },
  // Enamorado: monstruo rosa con ojos de corazón
  enamorado(g, mood) {
    g.fillStyle(0xf472b6, 1);
    g.fillEllipse(C, 72, 90, 86);
    outlineEllipse(g, C, 72, 90, 86);
    // Antenas con corazones
    g.lineStyle(3, 0xbe185d, 1);
    g.lineBetween(C - 24, 38, C - 30, 20);
    g.lineBetween(C + 24, 38, C + 30, 20);
    g.fillStyle(0xef4444, 1);
    g.fillCircle(C - 30, 16, 7);
    g.fillCircle(C - 25, 13, 5);
    g.fillCircle(C + 30, 16, 7);
    g.fillCircle(C + 25, 13, 5);
    g.fillTriangle(C - 36, 18, C - 24, 18, C - 30, 28);
    g.fillTriangle(C + 24, 18, C + 36, 18, C + 30, 28);
    // Ojos de corazón
    g.fillStyle(0xef4444, 1);
    g.fillCircle(C - 14, 58, 6);
    g.fillCircle(C - 9, 55, 4);
    g.fillCircle(C + 14, 58, 6);
    g.fillCircle(C + 9, 55, 4);
    g.fillTriangle(C - 20, 60, C - 8, 60, C - 14, 70);
    g.fillTriangle(C + 8, 60, C + 20, 60, C + 14, 70);
    if (mood === 'angry') angryBrows(g, C, 58, 14);
    mouth(g, mood, C, 78, 12, 0x9f1239);
    cheeks(g, C, 80, 28);
  },
  // Gruñón: monstruo gris con cejas gruesas y colmillos
  grunon(g, mood) {
    g.fillStyle(0x78716c, 1);
    g.fillEllipse(C, 72, 94, 86);
    outlineEllipse(g, C, 72, 94, 86);
    // Cuernos gruesos
    g.fillStyle(0x44403c, 1);
    g.fillTriangle(C - 34, 40, C - 46, 14, C - 22, 30);
    g.fillTriangle(C + 34, 40, C + 46, 14, C + 22, 30);
    eye(g, C - 14, 60, 11, 6);
    eye(g, C + 14, 60, 11, 6);
    // Cejas siempre fruncidas (gruñón)
    angryBrows(g, C, 60, 14);
    if (mood === 'happy') {
      g.lineStyle(3, 0x44403c, 1);
      g.beginPath(); g.arc(C, 76, 10, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
    } else {
      mouth(g, mood, C, 78, 11, 0x44403c);
    }
    // Colmillos
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(C - 10, 84, C - 4, 84, C - 7, 92);
    g.fillTriangle(C + 4, 84, C + 10, 84, C + 7, 92);
    cheeks(g, C, 80, 30);
  },
};

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    // Monstruos en 3 ánimos: feliz (base), neutral y enojado.
    const moods: Mood[] = ['happy', 'neutral', 'angry'];
    for (const m of MONSTERS) {
      for (const mood of moods) {
        const g = this.add.graphics();
        DRAWERS[m.id](g, mood);
        const key = mood === 'happy' ? `monster-${m.id}` : `monster-${m.id}-${mood}`;
        g.generateTexture(key, T, T);
        g.destroy();
      }
    }

    // Recepcionista Rese: monigote con uniforme, pajarita e identificación
    {
      const g = this.add.graphics();
      // Cuerpo con uniforme azul de recepcionista
      g.fillStyle(0x3b82f6, 1);
      g.fillRoundedRect(C - 26, 52, 52, 62, 12);
      outlineEllipse(g, C, 82, 52, 62);
      // Camisa blanca
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(C - 12, 54, C + 12, 54, C, 74);
      // Pajarita roja
      g.fillStyle(0xef4444, 1);
      g.fillTriangle(C - 2, 58, C - 14, 52, C - 14, 64);
      g.fillTriangle(C + 2, 58, C + 14, 52, C + 14, 64);
      g.fillCircle(C, 58, 4);
      // Identificación (placa dorada)
      g.fillStyle(0xffd678, 1);
      g.fillRoundedRect(C + 8, 76, 14, 10, 2);
      g.fillStyle(0x1e293b, 1);
      g.fillRect(C + 10, 79, 10, 2);
      // Cabeza
      g.fillStyle(0xfde68a, 1);
      g.fillCircle(C, 34, 24);
      outlineCircle(g, C, 34, 24);
      // Gorro de recepcionista
      g.fillStyle(0x1e3a8a, 1);
      g.fillEllipse(C, 16, 40, 14);
      g.fillStyle(0xffd678, 1);
      g.fillEllipse(C, 20, 42, 6);
      eye(g, C - 9, 36, 7, 4);
      eye(g, C + 9, 36, 7, 4);
      mouth(g, 'happy', C, 46, 8);
      cheeks(g, C, 46, 16);
      // Brazos saludando
      g.lineStyle(6, 0x3b82f6, 1);
      g.beginPath(); g.moveTo(C - 24, 62); g.lineTo(C - 36, 48); g.strokePath();
      g.beginPath(); g.moveTo(C + 24, 62); g.lineTo(C + 36, 48); g.strokePath();
      g.fillStyle(0xfde68a, 1);
      g.fillCircle(C - 37, 46, 6);
      g.fillCircle(C + 37, 46, 6);
      g.generateTexture('rese', T, T);
      g.destroy();
    }
    // Nube con carita (decoración del cielo)
    {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(30, 42, 18);
      g.fillCircle(58, 32, 24);
      g.fillCircle(86, 42, 18);
      g.fillEllipse(58, 48, 96, 30);
      g.fillStyle(0x6b4423, 1);
      g.fillCircle(48, 44, 3.5);
      g.fillCircle(68, 44, 3.5);
      g.lineStyle(3, 0x6b4423, 1);
      g.beginPath();
      g.arc(58, 48, 8, Math.PI * 0.2, Math.PI * 0.8, false);
      g.strokePath();
      g.fillStyle(0xf9a8d4, 0.7);
      g.fillCircle(40, 52, 5);
      g.fillCircle(76, 52, 5);
      g.generateTexture('cloud', 116, 70);
      g.destroy();
    }
    // Corazón
    {
      const g = this.add.graphics();
      g.fillStyle(0xf472b6, 1);
      g.fillCircle(14, 13, 9);
      g.fillCircle(30, 13, 9);
      g.fillTriangle(6, 18, 38, 18, 22, 40);
      g.generateTexture('heart', 44, 44);
      g.destroy();
    }
    // Estrella
    {
      const g = this.add.graphics();
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 26 : 11;
        pts.push(new Phaser.Math.Vector2(28 + Math.cos(a) * r, 28 + Math.sin(a) * r));
      }
      g.fillStyle(0xffc93c, 1);
      g.fillPoints(pts, true);
      g.lineStyle(3, 0xe09e00, 1);
      g.strokePoints(pts, true);
      g.generateTexture('star', 56, 56);
      g.destroy();
    }
    // Moneda
    {
      const g = this.add.graphics();
      g.fillStyle(0xe09e00, 1);
      g.fillCircle(22, 22, 20);
      g.fillStyle(0xffc93c, 1);
      g.fillCircle(22, 22, 16);
      g.fillStyle(0xffe08a, 1);
      g.fillCircle(22, 22, 10);
      g.generateTexture('coin', 44, 44);
      g.destroy();
    }
    // Destello
    {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.9);
      g.fillTriangle(12, 0, 15, 9, 24, 12);
      g.fillTriangle(12, 24, 15, 15, 24, 12);
      g.fillTriangle(12, 24, 9, 15, 0, 12);
      g.fillTriangle(12, 0, 9, 9, 0, 12);
      g.generateTexture('sparkle', 24, 24);
      g.destroy();
    }
    // Candado
    {
      const g = this.add.graphics();
      g.lineStyle(6, 0x94a3b8, 1);
      g.beginPath();
      g.arc(22, 18, 11, Math.PI, 0, false);
      g.strokePath();
      g.fillStyle(0x64748b, 1);
      g.fillRoundedRect(6, 18, 32, 24, 6);
      g.fillStyle(0x1e293b, 1);
      g.fillCircle(22, 29, 4);
      g.generateTexture('lock', 44, 44);
      g.destroy();
    }
    // Sombra suave
    {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.28);
      g.fillEllipse(32, 10, 60, 18);
      g.generateTexture('shadow', 64, 20);
      g.destroy();
    }

    this.scene.start('menu');
  }
}

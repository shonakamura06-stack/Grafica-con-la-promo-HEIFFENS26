/**
 * Helpers de interfaz — ¡Piso Equivocado!
 * Estilo kawaii pastel: botones caramelo con borde blanco y sombra 3D,
 * paneles crema con borde de madera, tipografía redondeada.
 */

import Phaser from 'phaser';
import { audio } from './audio';

export const FONT = 'Arial Black, Arial, sans-serif';
export const FONT_BODY = 'Arial, sans-serif';

export const COLORS = {
  sky: 0xffd9c0,
  cream: 0xfff3d6,
  wood: 0xa06a35,
  woodDark: 0x7c4f24,
  mint: 0x9fe8d8,
  mintDark: 0x5cc9b8,
  accent: 0xffa94d,
  accentDark: 0xe07b2a,
  purple: 0xb79ced,
  purpleDark: 0x8a6fd0,
  text: 0x6b4423,
  textLight: 0xffffff,
  green: 0x4ade80,
  red: 0xf87171,
  blue: 0x5aa8e8,
};

export interface ButtonOptions {
  bg?: number;
  textColor?: string;
  fontSize?: number;
  onClick: () => void;
  sound?: boolean;
}

/** Botón caramelo: sombra inferior oscura, borde blanco grueso y brillo. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  opts: ButtonOptions
): Phaser.GameObjects.Container {
  const bgColor = opts.bg ?? COLORS.accent;
  const g = scene.add.graphics();
  const r = Math.min(20, h / 2);
  // Sombra 3D inferior (versión oscura del color)
  const dark = Phaser.Display.Color.IntegerToColor(bgColor).darken(28).color;
  g.fillStyle(dark, 1);
  g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
  // Cuerpo principal
  g.fillStyle(bgColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  // Brillo superior
  g.fillStyle(0xffffff, 0.22);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h * 0.38, r * 0.7);
  // Borde blanco grueso
  g.lineStyle(3, 0xffffff, 0.9);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

  const text = scene.add
    .text(0, -2, label, {
      fontFamily: FONT,
      fontSize: `${opts.fontSize ?? 24}px`,
      color: opts.textColor ?? '#ffffff',
      align: 'center',
    })
    .setOrigin(0.5);
  text.setShadow(0, 2, 'rgba(0,0,0,0.25)', 3, true, true);

  const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [g, text, hit]);
  container.setSize(w, h);

  hit.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scale: 0.94, duration: 60, yoyo: true });
    if (opts.sound !== false) audio.click();
    opts.onClick();
  });
  return container;
}

/** Panel crema con borde de madera (estilo cartel). */
export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number = COLORS.cream,
  alpha: number = 1
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 8, w, h, 22);
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 22);
  g.lineStyle(6, COLORS.wood, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 22);
  g.lineStyle(2, 0xffffff, 0.6);
  g.strokeRoundedRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 12, 16);
  return g;
}

export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  size: number,
  color: string = '#6b4423',
  bold: boolean = true
): Phaser.GameObjects.Text {
  const t = scene.add
    .text(x, y, content, {
      fontFamily: bold ? FONT : FONT_BODY,
      fontSize: `${size}px`,
      color,
      align: 'center',
    })
    .setOrigin(0.5);
  return t;
}

/** Estrellas (1-3 encendidas de 3). Devuelve contenedor centrado en x,y. */
export function makeStars(
  scene: Phaser.Scene,
  x: number,
  y: number,
  filled: number,
  scale: number = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  for (let i = 0; i < 3; i++) {
    const s = scene.add.image((i - 1) * 52 * scale, 0, 'star').setScale(scale);
    if (i >= filled) s.setTint(0xb8a888);
    c.add(s);
  }
  return c;
}

/** Monedas: icono + cantidad. */
export function makeCoins(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const icon = scene.add.image(0, 0, 'coin').setScale(0.7);
  const t = scene.add
    .text(22, 0, `${amount}`, {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#a06a35',
    })
    .setOrigin(0, 0.5);
  t.setShadow(0, 2, '#ffffff', 3, true, true);
  c.add([icon, t]);
  return c;
}

/** Cartel de madera con borde de cuerda (para títulos y avisos). */
export function makeWoodSign(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 7, w, h, 16);
  g.fillStyle(COLORS.wood, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
  // Tablones de madera
  g.lineStyle(2, COLORS.woodDark, 0.7);
  const rows = Math.max(2, Math.round(h / 26));
  for (let i = 1; i < rows; i++) {
    g.lineBetween(x - w / 2 + 8, y - h / 2 + (h / rows) * i, x + w / 2 - 8, y - h / 2 + (h / rows) * i);
  }
  // Borde de cuerda (puntos)
  g.fillStyle(0xd8b078, 1);
  const step = 14;
  for (let px = x - w / 2 + 7; px <= x + w / 2 - 7; px += step) {
    g.fillCircle(px, y - h / 2 + 5, 2.4);
    g.fillCircle(px, y + h / 2 - 5, 2.4);
  }
  for (let py = y - h / 2 + 7; py <= y + h / 2 - 7; py += step) {
    g.fillCircle(x - w / 2 + 5, py, 2.4);
    g.fillCircle(x + w / 2 - 5, py, 2.4);
  }
  g.lineStyle(4, COLORS.woodDark, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
  return g;
}

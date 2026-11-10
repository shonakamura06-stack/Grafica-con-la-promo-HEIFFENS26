/**
 * Helpers de interfaz — ¡Piso Equivocado!
 * Botones, paneles y textos reutilizables con el estilo del juego.
 */

import Phaser from 'phaser';
import { audio } from './audio';

export const FONT = 'Arial Black, Arial, sans-serif';
export const FONT_BODY = 'Arial, sans-serif';

export const COLORS = {
  bg: 0x2b1b4d,
  bgDark: 0x1a1033,
  panel: 0x3d2a6b,
  panelLight: 0x5b4396,
  accent: 0xffc93c,
  accentDark: 0xe09e00,
  text: 0xffffff,
  textDim: 0xc9bdf0,
  green: 0x4ade80,
  red: 0xf87171,
  blue: 0x60a5fa,
};

export interface ButtonOptions {
  bg?: number;
  bgHover?: number;
  textColor?: string;
  fontSize?: number;
  onClick: () => void;
  sound?: boolean;
}

/** Botón redondeado con texto centrado. Devuelve el contenedor. */
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
  const r = Math.min(18, h / 2);
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, r);
  g.fillStyle(bgColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.lineStyle(3, 0xffffff, 0.35);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT,
      fontSize: `${opts.fontSize ?? 24}px`,
      color: opts.textColor ?? '#3a2400',
      align: 'center',
    })
    .setOrigin(0.5);

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

/** Panel redondeado semitransparente. */
export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number = COLORS.panel,
  alpha: number = 0.95
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(x - w / 2, y - h / 2 + 6, w, h, 22);
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 22);
  g.lineStyle(3, 0xffffff, 0.25);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 22);
  return g;
}

export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  size: number,
  color: string = '#ffffff',
  bold: boolean = true
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, content, {
      fontFamily: bold ? FONT : FONT_BODY,
      fontSize: `${size}px`,
      color,
      align: 'center',
    })
    .setOrigin(0.5);
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
    if (i >= filled) s.setTint(0x6b5a8a);
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
      color: '#ffd678',
    })
    .setOrigin(0, 0.5);
  c.add([icon, t]);
  return c;
}

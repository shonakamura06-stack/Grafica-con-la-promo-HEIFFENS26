/**
 * Aplicación visual de los cosméticos — Economía V3.
 *
 * Cada objeto del catálogo tiene un efecto REAL y visible en el juego:
 * fachada, papel tapiz, ascensor, uniforme/accesorio de Rese, accesorios de
 * monstruos, decoraciones del vestíbulo, temáticas completas y celebración.
 * Nada de esto afecta al puzle: son solo cosméticos.
 */

import Phaser from 'phaser';
import { SaveData, themePalette } from './save';
import { itemById, THEMES } from '../data/shop';

/** ¿El jugador tiene equipada una temática completa (no la clásica)? */
export function hasTheme(save: SaveData): boolean {
  return save.custom.theme !== 'clasico' && THEMES[save.custom.theme] !== undefined;
}

export function facadeColor(save: SaveData): number {
  if (hasTheme(save)) return themePalette(save).facade;
  return itemById(save.custom.facade)?.color ?? 0xf5e6c8;
}

export function facadeShade(save: SaveData): number {
  if (hasTheme(save)) return themePalette(save).facadeShade;
  return 0xf5d9a8;
}

export function skyColors(save: SaveData): { top: number; bottom: number } {
  if (save.custom.night) {
    return hasTheme(save)
      ? { top: 0x141a3a, bottom: 0x2b3468 }
      : { top: 0x1e293b, bottom: 0x334155 };
  }
  const p = themePalette(save);
  return hasTheme(save) ? { top: p.skyTop, bottom: p.skyBottom } : { top: 0xaee3f5, bottom: 0xd8f3fc };
}

export function cloudAlpha(save: SaveData): number {
  return hasTheme(save) ? themePalette(save).cloudAlpha : 0.5;
}

/** Textura de la pared: patrón del papel tapiz (o de la temática equipada). */
export function wallpaperPattern(save: SaveData): string {
  if (hasTheme(save)) return themePalette(save).pattern;
  return itemById(save.custom.wallpaper)?.pattern ?? 'solid';
}

export function wallpaperColor(save: SaveData): number {
  if (hasTheme(save)) return themePalette(save).wallpaper;
  return itemById(save.custom.wallpaper)?.color ?? 0xfff3d6;
}

/** Colores del ascensor (cabina, puertas y brillo). */
export function elevatorColors(save: SaveData): { base: number; door: number; glow: number } {
  const skin = itemById(save.custom.elevator);
  const base = skin?.color ?? 0xffa94d;
  const door = skin?.color2 ?? 0xeaf7ff;
  const glow = hasTheme(save) ? themePalette(save).accent : 0xffffff;
  return { base, door, glow };
}

/** Dibuja el patrón del papel tapiz sobre un rectángulo de fachada. */
export function drawWallpaperPattern(
  g: Phaser.GameObjects.Graphics,
  save: SaveData,
  x: number, y: number, w: number, h: number
): void {
  const pattern = wallpaperPattern(save);
  const c2 = itemById(save.custom.wallpaper)?.color2 ?? 0xffffff;
  const accent = hasTheme(save) ? themePalette(save).accent : c2;
  if (pattern === 'solid') return;

  g.save?.();
  if (pattern === 'stripes') {
    g.fillStyle(accent, 0.35);
    for (let sx = x; sx < x + w; sx += 34) g.fillRect(sx, y, 14, h);
  } else if (pattern === 'dots') {
    g.fillStyle(accent, 0.4);
    for (let dy = y + 18; dy < y + h; dy += 44) {
      for (let dx = x + 20; dx < x + w; dx += 44) g.fillCircle(dx, dy, 7);
    }
  } else if (pattern === 'stars') {
    g.fillStyle(0xfde68a, 0.75);
    for (let dy = y + 22; dy < y + h; dy += 52) {
      for (let dx = x + 24; dx < x + w; dx += 58) {
        g.fillCircle(dx, dy, 3.5);
        g.fillRect(dx - 7, dy - 1, 14, 2);
        g.fillRect(dx - 1, dy - 7, 2, 14);
      }
    }
  } else if (pattern === 'waves') {
    g.lineStyle(3, accent, 0.4);
    for (let dy = y + 26; dy < y + h; dy += 40) {
      g.beginPath();
      g.moveTo(x, dy);
      for (let dx = 0; dx <= w; dx += 16) g.lineTo(x + dx, dy + Math.sin(dx / 16) * 5);
      g.strokePath();
    }
  } else if (pattern === 'rainbow') {
    const colors = [0xf87171, 0xfbbf24, 0x4ade80, 0x38bdf8, 0xa78bfa];
    colors.forEach((col, i) => {
      g.fillStyle(col, 0.22);
      g.fillRect(x, y + (h / colors.length) * i, w, h / colors.length);
    });
  }
}

/**
 * Decoración ambiental de la temática (detrás del hotel, depth 0).
 * Nubes para el hotel clásico; estrellas, peces, fantasmas o arcoíris según el tema.
 */
export function addAmbient(
  scene: Phaser.Scene,
  save: SaveData,
  W: number,
  H: number
): Phaser.GameObjects.GameObject[] {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const decor = hasTheme(save) ? themePalette(save).decor : 'nubes';

  if (decor === 'estrellas') {
    for (let i = 0; i < 34; i++) {
      const s = scene.add.graphics().setDepth(0);
      const x = Math.random() * W;
      const y = Math.random() * H * 0.7;
      s.fillStyle(0xffffff, 0.55 + Math.random() * 0.4);
      s.fillCircle(x, y, 1.4 + Math.random() * 1.8);
      objs.push(s);
      scene.tweens.add({ targets: s, alpha: 0.25, duration: 900 + Math.random() * 1400, yoyo: true, repeat: -1 });
    }
    // Planeta con anillo
    const planet = scene.add.graphics().setDepth(0);
    planet.fillStyle(0xfca5a5, 0.9);
    planet.fillCircle(470, 130, 34);
    planet.lineStyle(5, 0xfde68a, 0.8);
    planet.beginPath();
    planet.moveTo(424, 140);
    planet.lineTo(516, 118);
    planet.strokePath();
    objs.push(planet);
    scene.tweens.add({ targets: planet, y: 142, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  } else if (decor === 'peces') {
    for (let i = 0; i < 7; i++) {
      const fish = scene.add.graphics().setDepth(0);
      const y = 90 + Math.random() * (H - 260);
      const col = [0xfcd34d, 0xfb7185, 0x93c5fd, 0x86efac][i % 4];
      fish.fillStyle(col, 0.85);
      fish.fillEllipse(0, 0, 30, 16);
      fish.fillTriangle(-14, 0, -26, -9, -26, 9);
      fish.fillStyle(0x111827, 0.9);
      fish.fillCircle(9, -3, 2.4);
      fish.setPosition(-40, y);
      objs.push(fish);
      scene.tweens.add({ targets: fish, x: W + 40, duration: 9000 + i * 1400, repeat: -1, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: fish, y: y + 18, duration: 1600 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    for (let i = 0; i < 16; i++) {
      const b = scene.add.circle(Math.random() * W, H + 20, 3 + Math.random() * 6, 0xffffff, 0.4).setDepth(0);
      objs.push(b);
      scene.tweens.add({ targets: b, y: -20, duration: 5000 + Math.random() * 5000, repeat: -1, delay: Math.random() * 4000 });
    }
  } else if (decor === 'fantasmas') {
    for (let i = 0; i < 5; i++) {
      const ghost = scene.add.graphics().setDepth(0);
      ghost.fillStyle(0xffffff, 0.32);
      ghost.fillCircle(0, 0, 20);
      ghost.fillRect(-20, 0, 40, 22);
      ghost.fillTriangle(-20, 22, -10, 22, -15, 32);
      ghost.fillTriangle(0, 22, 10, 22, 5, 32);
      ghost.fillTriangle(20, 22, 10, 22, 15, 32);
      ghost.fillStyle(0x2b1b3d, 0.8);
      ghost.fillCircle(-7, -3, 3.2);
      ghost.fillCircle(7, -3, 3.2);
      const x = 40 + i * 110;
      const y = 120 + (i % 3) * 160;
      ghost.setPosition(x, y);
      objs.push(ghost);
      scene.tweens.add({ targets: ghost, y: y - 26, duration: 2600 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: ghost, alpha: 0.55, duration: 1700, yoyo: true, repeat: -1 });
    }
    // Velas flotantes
    for (let i = 0; i < 4; i++) {
      const candle = scene.add.graphics().setDepth(0);
      candle.fillStyle(0xfef3c7, 0.85);
      candle.fillRoundedRect(-4, 0, 8, 18, 3);
      candle.fillStyle(0xfbbf24, 0.95);
      candle.fillEllipse(0, -4, 7, 12);
      candle.setPosition(70 + i * 130, 260 + (i % 2) * 200);
      objs.push(candle);
      scene.tweens.add({ targets: candle, y: candle.y - 14, duration: 2200 + i * 240, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  } else if (decor === 'arcoiris') {
    const rb = scene.add.graphics().setDepth(0);
    const cols = [0xf87171, 0xfbbf24, 0x4ade80, 0x38bdf8, 0xa78bfa];
    cols.forEach((col, i) => {
      rb.lineStyle(16, col, 0.4);
      const r = 300 - i * 17;
      rb.beginPath();
      for (let a = Math.PI; a <= Math.PI * 2; a += 0.08) {
        const x = 270 + Math.cos(a) * r;
        const y = 300 + Math.sin(a) * r;
        if (a === Math.PI) rb.moveTo(x, y);
        else rb.lineTo(x, y);
      }
      rb.strokePath();
    });
    objs.push(rb);
    scene.tweens.add({ targets: rb, alpha: 0.7, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return objs;
}

/** Uniforme/accesorio del recepcionista (Rese): tint + dibujo encima. */
export function decorateRese(
  scene: Phaser.Scene,
  img: Phaser.GameObjects.Image,
  save: SaveData
): Phaser.GameObjects.Graphics | undefined {
  const id = save.custom.accessory;
  const item = itemById(id);
  if (!item || id === 'a_azul') return undefined;

  // Uniformes básicos = solo tinte.
  if (['a_rojo', 'a_verde', 'a_morado'].includes(id)) {
    img.setTint(item.color);
    return undefined;
  }

  const k = img.displayWidth / 400;          // escala relativa al arte de Rese
  const cx = img.x;
  const headY = img.y - 96 * k;
  const g = scene.add.graphics().setDepth((img.depth ?? 0) + 1);

  if (id === 'a_lazo') {
    g.fillStyle(0xf472b6, 1);
    g.fillTriangle(cx - 58 * k, headY - 30 * k, cx - 14 * k, headY - 52 * k, cx - 14 * k, headY - 8 * k);
    g.fillTriangle(cx - 58 * k + 44 * k, headY - 30 * k, cx - 14 * k + 44 * k, headY - 52 * k, cx - 14 * k + 44 * k, headY - 8 * k);
    g.fillStyle(0xbe185d, 1);
    g.fillCircle(cx - 36 * k, headY - 30 * k, 9 * k);
    g.lineStyle(3 * k, 0x241640, 1);
    g.strokeCircle(cx - 36 * k, headY - 30 * k, 9 * k);
  } else if (id === 'a_gafas') {
    g.lineStyle(4 * k, 0x1e3a8a, 1);
    g.strokeCircle(cx - 30 * k, headY + 6 * k, 22 * k);
    g.strokeCircle(cx + 30 * k, headY + 6 * k, 22 * k);
    g.lineBetween(cx - 8 * k, headY + 6 * k, cx + 8 * k, headY + 6 * k);
    g.fillStyle(0xbfdbfe, 0.35);
    g.fillCircle(cx - 30 * k, headY + 6 * k, 20 * k);
    g.fillCircle(cx + 30 * k, headY + 6 * k, 20 * k);
  } else if (id === 'a_placa') {
    const by = img.y + 40 * k;
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(cx - 78 * k, by, 20 * k);
    g.lineStyle(3 * k, 0x92400e, 1);
    g.strokeCircle(cx - 78 * k, by, 20 * k);
    g.fillStyle(0xffe9a8, 1);
    g.fillCircle(cx - 78 * k, by, 11 * k);
  } else if (id === 'd_espacial') {
    img.setTint(0xe0e7ff);
    g.lineStyle(6 * k, 0x94a3b8, 0.95);
    g.strokeCircle(cx, headY, 62 * k);
    g.fillStyle(0xbae6fd, 0.35);
    g.fillCircle(cx, headY, 60 * k);
    g.fillStyle(0xffffff, 0.5);
    g.fillEllipse(cx - 22 * k, headY - 24 * k, 26 * k, 16 * k);
    g.fillStyle(0xef4444, 1);
    g.fillCircle(cx + 44 * k, headY - 44 * k, 8 * k);
  } else if (id === 'd_submarino') {
    img.setTint(0xa5f3fc);
    g.fillStyle(0xfbbf24, 0.85);
    g.fillCircle(cx, headY, 60 * k);
    g.lineStyle(7 * k, 0x92400e, 1);
    g.strokeCircle(cx, headY, 60 * k);
    g.fillStyle(0x67e8f9, 0.55);
    g.fillCircle(cx, headY, 44 * k);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillStyle(0x78350f, 1);
      g.fillCircle(cx + Math.cos(a) * 60 * k, headY + Math.sin(a) * 60 * k, 5 * k);
    }
  } else if (id === 'd_fantasma') {
    img.setTint(0xc7d2fe);
    img.setAlpha(0.92);
    g.fillStyle(0xffffff, 0.4);
    const baseY = img.y + 120 * k;
    g.fillTriangle(cx - 120 * k, baseY, cx - 60 * k, baseY, cx - 90 * k, baseY + 44 * k);
    g.fillTriangle(cx - 30 * k, baseY, cx + 30 * k, baseY, cx, baseY + 52 * k);
    g.fillTriangle(cx + 60 * k, baseY, cx + 120 * k, baseY, cx + 90 * k, baseY + 44 * k);
  } else if (id === 'd_gala') {
    img.setTint(0xfde68a);
    const by = img.y + 34 * k;
    g.fillStyle(0x1f2937, 1);
    g.fillTriangle(cx - 34 * k, by, cx - 6 * k, by - 14 * k, cx - 6 * k, by + 14 * k);
    g.fillTriangle(cx + 34 * k, by, cx + 6 * k, by - 14 * k, cx + 6 * k, by + 14 * k);
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(cx, by, 9 * k);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(0xfff7cc, 0.9);
      g.fillCircle(cx + Math.cos(a) * 150 * k, img.y + Math.sin(a) * 150 * k, 4 * k);
    }
  } else if (id === 'd_chef') {
    img.setTint(0xffffff);
    const hy = headY - 40 * k;
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - 52 * k, hy, 104 * k, 30 * k, 8 * k);
    g.fillCircle(cx - 32 * k, hy - 8 * k, 26 * k);
    g.fillCircle(cx, hy - 20 * k, 30 * k);
    g.fillCircle(cx + 32 * k, hy - 8 * k, 26 * k);
    g.lineStyle(3 * k, 0xcbd5e1, 1);
    g.strokeRoundedRect(cx - 52 * k, hy, 104 * k, 30 * k, 8 * k);
  }
  return g;
}

/** Accesorio de monstruo (exclusivo Deluxe) dibujado sobre el sprite. */
export function monsterAccessory(
  scene: Phaser.Scene,
  save: SaveData,
  displayWidth: number
): Phaser.GameObjects.Graphics | undefined {
  const id = save.custom.monsterAcc;
  if (id === 'ninguno') return undefined;
  const item = itemById(id);
  if (!item) return undefined;
  const k = displayWidth / 130;      // relativo al tamaño mostrado del monstruo
  const g = scene.add.graphics();
  // Se dibuja centrado en (0,0): quien llama lo coloca sobre la cabeza.
  if (id === 'dm_copa') {
    g.fillStyle(0x1f2937, 1);
    g.fillRoundedRect(-16 * k, -46 * k, 32 * k, 44 * k, 4 * k);
    g.fillEllipse(0, -2 * k, 58 * k, 12 * k);
    g.fillStyle(0xf87171, 1);
    g.fillRect(-16 * k, -14 * k, 32 * k, 8 * k);
    g.lineStyle(2.5 * k, 0x111827, 1);
    g.strokeRoundedRect(-16 * k, -46 * k, 32 * k, 44 * k, 4 * k);
  } else if (id === 'dm_lazo') {
    g.fillStyle(0xef4444, 1);
    g.fillTriangle(-34 * k, -14 * k, -4 * k, -30 * k, -4 * k, 2 * k);
    g.fillTriangle(34 * k, -14 * k, 4 * k, -30 * k, 4 * k, 2 * k);
    g.fillStyle(0xb91c1c, 1);
    g.fillCircle(0, -14 * k, 8 * k);
    g.lineStyle(2.5 * k, 0x241640, 1);
    g.strokeCircle(0, -14 * k, 8 * k);
  } else if (id === 'dm_gafas') {
    g.fillStyle(0x111827, 0.9);
    g.fillRoundedRect(-40 * k, -14 * k, 34 * k, 20 * k, 6 * k);
    g.fillRoundedRect(6 * k, -14 * k, 34 * k, 20 * k, 6 * k);
    g.fillRect(-6 * k, -8 * k, 12 * k, 5 * k);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(-36 * k, -12 * k, 12 * k, 6 * k, 3 * k);
  } else if (id === 'dm_corona') {
    g.fillStyle(0xfcd34d, 1);
    g.fillPoints([
      new Phaser.Math.Vector2(-30 * k, -6 * k),
      new Phaser.Math.Vector2(-30 * k, -30 * k),
      new Phaser.Math.Vector2(-15 * k, -16 * k),
      new Phaser.Math.Vector2(0, -38 * k),
      new Phaser.Math.Vector2(15 * k, -16 * k),
      new Phaser.Math.Vector2(30 * k, -30 * k),
      new Phaser.Math.Vector2(30 * k, -6 * k),
    ], true);
    g.lineStyle(2.5 * k, 0xb45309, 1);
    g.strokePoints([
      new Phaser.Math.Vector2(-30 * k, -6 * k),
      new Phaser.Math.Vector2(-30 * k, -30 * k),
      new Phaser.Math.Vector2(-15 * k, -16 * k),
      new Phaser.Math.Vector2(0, -38 * k),
      new Phaser.Math.Vector2(15 * k, -16 * k),
      new Phaser.Math.Vector2(30 * k, -30 * k),
      new Phaser.Math.Vector2(30 * k, -6 * k),
    ], true);
    g.fillStyle(0xef4444, 1);
    g.fillCircle(0, -14 * k, 4 * k);
  } else if (id === 'dm_bufanda') {
    g.fillStyle(0x38bdf8, 1);
    g.fillRoundedRect(-34 * k, 6 * k, 68 * k, 18 * k, 8 * k);
    g.fillStyle(0xffffff, 0.85);
    for (let i = -30; i < 30; i += 12) g.fillRect(i * k, 6 * k, 6 * k, 18 * k);
    g.fillStyle(0x0ea5e9, 1);
    g.fillRoundedRect(18 * k, 20 * k, 16 * k, 30 * k, 6 * k);
    g.lineStyle(2.5 * k, 0x241640, 1);
    g.strokeRoundedRect(-34 * k, 6 * k, 68 * k, 18 * k, 8 * k);
  }
  return g;
}

/** Decoración del vestíbulo (exclusiva Deluxe): fuente o araña de cristal. */
export function drawLobbyDecor(
  scene: Phaser.Scene,
  save: SaveData,
  x: number,
  y: number
): Phaser.GameObjects.Graphics | undefined {
  const id = save.custom.decor;
  if (id === 'ninguno') return undefined;
  const g = scene.add.graphics().setDepth(4);
  if (id === 'dd_fuente') {
    g.fillStyle(0x000000, 0.12);
    g.fillEllipse(x, y + 34, 92, 16);
    g.fillStyle(0xcbd5e1, 1);
    g.fillEllipse(x, y + 24, 86, 26);
    g.fillStyle(0x67e8f9, 0.9);
    g.fillEllipse(x, y + 20, 70, 18);
    g.fillStyle(0xe2e8f0, 1);
    g.fillRoundedRect(x - 7, y - 16, 14, 38, 5);
    g.fillStyle(0xa5f3fc, 0.95);
    for (let i = -1; i <= 1; i++) {
      g.fillEllipse(x + i * 12, y - 20, 8, 16);
    }
    g.fillStyle(0xffffff, 0.75);
    g.fillCircle(x, y - 28, 6);
    scene.tweens.add({
      targets: g, alpha: 0.82, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  } else if (id === 'dd_arana') {
    // Se dibuja en coordenadas relativas y se posiciona: así puede balancearse.
    g.lineStyle(2, 0x94a3b8, 1);
    g.lineBetween(0, -70, 0, -26);
    g.fillStyle(0xfde68a, 0.95);
    g.fillCircle(0, -18, 12);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + (i / 4) * 0.7);
      const px = Math.cos(a) * 44;
      const py = -18 + Math.sin(a) * 26;
      g.lineStyle(2, 0xfcd34d, 0.9);
      g.lineBetween(0, -18, px, py);
      g.fillStyle(0xfff7cc, 1);
      g.fillCircle(px, py, 6);
    }
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(-4, -22, 4);
    g.setPosition(x, y);
    scene.tweens.add({ targets: g, angle: 3, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return g;
}

/** ¿Celebración dorada (Pack Deluxe) activa? */
export function goldenCelebration(save: SaveData): boolean {
  return save.custom.celebration === 'd_celebracion' && save.owned['d_celebracion'] === true;
}

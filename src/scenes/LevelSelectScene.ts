/**
 * Selección de niveles — mapa del hotel con los 30 niveles,
 * estrellas obtenidas y niveles bloqueados. Estilo kawaii pastel.
 */

import Phaser from 'phaser';
import { LEVELS, TOTAL_LEVELS } from '../data/levels';
import { loadSave } from '../systems/save';
import { makeButton, makeCoins, makeText, makeWoodSign, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('levels');
  }

  create(): void {
    const save = loadSave();
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xffd9c0, 0xffd9c0, 0xffeef5, 0xffeef5, 1);
    bg.fillRect(0, 0, W, H);
    const cloudDefs: Array<[number, number, number, number]> = [
      [70, 150, 0.7, 10000], [470, 260, 0.6, 13000], [60, 700, 0.65, 12000],
    ];
    cloudDefs.forEach(([x, y, s, dur]) => {
      const c = this.add.image(x, y, 'cloud').setScale(s).setAlpha(0.9);
      this.tweens.add({ targets: c, x: x + 22, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    makeButton(this, 52, 40, 76, 48, '◀', {
      bg: COLORS.purple, fontSize: 24,
      onClick: () => this.scene.start('menu'),
    });
    makeWoodSign(this, W / 2, 40, 240, 56);
    makeText(this, W / 2, 40, 'NIVELES', 28, '#ffffff').setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);
    makeCoins(this, W - 70, 40, save.coins);

    const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
    makeText(this, W / 2, 84, `${Object.keys(save.stars).length}/${TOTAL_LEVELS} niveles · ${totalStars} estrellas`, 18, '#a06a35', false);

    // Rejilla 5 x 6 con botones caramelo
    const cols = 5;
    const cellW = 96;
    const cellH = 104;
    const startX = W / 2 - ((cols - 1) * cellW) / 2;
    const startY = 150;

    LEVELS.forEach((lvl, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;
      const locked = lvl.id > save.unlockedLevel;
      const stars = save.stars[lvl.id] ?? 0;

      const g = this.add.graphics();
      const w = 76, h = 84;
      const bgColor = locked ? 0xd8cdb4 : stars === 3 ? 0xffa94d : stars > 0 ? 0x9fe8d8 : 0xfff3d6;
      const dark = Phaser.Display.Color.IntegerToColor(bgColor).darken(28).color;
      g.fillStyle(dark, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2 + 5, w, h, 14);
      g.fillStyle(bgColor, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      g.fillStyle(0xffffff, 0.25);
      g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 2, w - 6, h * 0.34, 10);
      g.lineStyle(3, 0xffffff, 0.9);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);

      if (locked) {
        this.add.image(x, y - 6, 'lock').setScale(0.8);
        makeText(this, x, y + 24, `${lvl.id}`, 16, '#a06a35');
      } else {
        makeText(this, x, y - 18, `${lvl.id}`, 28, '#6b4423');
        for (let s = 0; s < 3; s++) {
          const star = this.add.image(x - 22 + s * 22, y + 18, 'star').setScale(0.38);
          if (s >= stars) star.setTint(0xb8a888);
        }
      }

      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: !locked });
      zone.on('pointerdown', () => {
        if (locked) {
          audio.error();
          this.tweens.add({ targets: g, x: 4, duration: 50, yoyo: true, repeat: 3 });
          return;
        }
        audio.select();
        this.scene.start('game', { levelId: lvl.id });
      });
    });

    makeText(this, W / 2, H - 30, 'Toca un nivel para jugar', 16, '#a06a35', false);
  }
}

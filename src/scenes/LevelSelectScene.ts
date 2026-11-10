/**
 * Selección de niveles — mapa del hotel con los 30 niveles,
 * estrellas obtenidas y niveles bloqueados.
 */

import Phaser from 'phaser';
import { LEVELS, TOTAL_LEVELS } from '../data/levels';
import { loadSave } from '../systems/save';
import { makeButton, makeCoins, makeText, COLORS } from '../systems/ui';
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
    bg.fillGradientStyle(0x2b1b4d, 0x2b1b4d, 0x17102e, 0x17102e, 1);
    bg.fillRect(0, 0, W, H);

    makeButton(this, 52, 40, 76, 48, '◀', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 24,
      onClick: () => this.scene.start('menu'),
    });
    makeText(this, W / 2, 40, 'NIVELES', 32, '#ffd678');
    makeCoins(this, W - 70, 40, save.coins);

    const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
    makeText(this, W / 2, 84, `${Object.keys(save.stars).length}/${TOTAL_LEVELS} niveles · ${totalStars} estrellas`, 18, '#c9bdf0', false);

    // Rejilla 5 x 6
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
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(x - w / 2, y - h / 2 + 4, w, h, 14);
      g.fillStyle(locked ? 0x3a2d5c : stars === 3 ? 0xf59e0b : 0x5b4396, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      g.lineStyle(3, 0xffffff, locked ? 0.1 : 0.35);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);

      if (locked) {
        this.add.image(x, y - 6, 'lock').setScale(0.8);
        makeText(this, x, y + 24, `${lvl.id}`, 16, '#8f7fc0');
      } else {
        makeText(this, x, y - 18, `${lvl.id}`, 28, '#ffffff');
        // mini estrellas
        for (let s = 0; s < 3; s++) {
          const star = this.add.image(x - 22 + s * 22, y + 18, 'star').setScale(0.38);
          if (s >= stars) star.setTint(0x6b5a8a);
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

    makeText(this, W / 2, H - 30, 'Toca un nivel para jugar', 16, '#8f7fc0', false);
  }
}

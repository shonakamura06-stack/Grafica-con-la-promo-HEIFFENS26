/**
 * Personalización del hotel — papel de pared, alfombra y puertas
 * del ascensor. Se compran con monedas (sin pagos reales).
 * Estilo kawaii pastel.
 */

import Phaser from 'phaser';
import { loadSave, writeSave, CUSTOM_OPTIONS, Customization, getCustomOption } from '../systems/save';
import { makeButton, makeCoins, makeText, makeWoodSign, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

const CATEGORIES: Array<{ key: keyof Customization; title: string }> = [
  { key: 'wallpaper', title: 'PAPEL DE PARED' },
  { key: 'carpet', title: 'ALFOMBRA' },
  { key: 'door', title: 'PUERTAS DEL ASCENSOR' },
];

export default class CustomizeScene extends Phaser.Scene {
  constructor() {
    super('customize');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xaee3f5, 0xaee3f5, 0xd8f3fc, 0xd8f3fc, 1);
    bg.fillRect(0, 0, W, H);
    const cloudDefs: Array<[number, number, number, number]> = [
      [70, 140, 0.7, 11000], [470, 240, 0.6, 13000],
    ];
    cloudDefs.forEach(([x, y, s, dur]) => {
      const c = this.add.image(x, y, 'cloud').setScale(s).setAlpha(0.9);
      this.tweens.add({ targets: c, x: x + 22, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    makeButton(this, 52, 40, 76, 48, '◀', {
      bg: COLORS.purple, fontSize: 24,
      onClick: () => this.scene.start('menu'),
    });
    makeWoodSign(this, W / 2, 40, 280, 56);
    makeText(this, W / 2, 40, 'MI HOTEL', 28, '#ffffff').setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);
    makeCoins(this, W - 70, 40, loadSave().coins);

    let y = 120;
    for (const cat of CATEGORIES) {
      makeText(this, W / 2, y, cat.title, 20, '#a06a35');
      y += 44;
      const options = CUSTOM_OPTIONS[cat.key];
      const rowW = 460;
      const startX = W / 2 - rowW / 2 + 55;
      options.forEach((opt, i) => {
        const x = startX + i * 115;
        this.renderOption(cat.key, opt.id, opt.name, opt.color, opt.price, x, y + 40);
      });
      y += 130;
    }

    makeText(this, W / 2, H - 40, 'Gana monedas completando niveles con estrellas', 15, '#a06a35', false);
  }

  private renderOption(
    category: keyof Customization,
    id: string,
    name: string,
    color: number,
    price: number,
    x: number,
    y: number
  ): void {
    const save = loadSave();
    const equipped = save.custom[category] === id;
    const owned = this.isOwned(category, id);

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(x - 48 + 3, y - 48 + 5, 96, 96, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - 48, y - 48, 96, 96, 14);
    g.lineStyle(equipped ? 5 : 3, equipped ? 0xffa94d : 0xa06a35, 1);
    g.strokeRoundedRect(x - 48, y - 48, 96, 96, 14);
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(x - 44, y - 44, 88, 30, 10);

    makeText(this, x, y + 62, name, 12, '#6b4423', false);
    if (equipped) {
      makeText(this, x, y, '✓', 34, '#2f9e44');
    } else if (!owned) {
      this.add.image(x, y, 'coin').setScale(0.55);
      makeText(this, x, y + 30, `${price}`, 15, '#6b4423');
    }

    const zone = this.add.zone(x, y, 96, 96).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      const s = loadSave();
      if (s.custom[category] === id) return;
      if (!this.isOwned(category, id)) {
        if (s.coins < price) {
          audio.error();
          this.tweens.add({ targets: g, x: 4, duration: 50, yoyo: true, repeat: 3 });
          return;
        }
        s.coins -= price;
        s.owned[`${category}_${id}`] = true;
        audio.coin();
      } else {
        audio.select();
      }
      s.custom[category] = id;
      writeSave(s);
      this.scene.restart();
    });
  }

  private isOwned(category: keyof Customization, id: string): boolean {
    const s = loadSave();
    const opt = getCustomOption(category, id);
    if (opt.price === 0) return true;
    return s.owned[`${category}_${id}`] === true;
  }
}

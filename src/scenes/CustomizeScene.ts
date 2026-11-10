/**
 * Personalización del hotel — papel de pared, alfombra y puertas
 * del ascensor. Se compran con monedas (sin pagos reales).
 */

import Phaser from 'phaser';
import { loadSave, writeSave, CUSTOM_OPTIONS, Customization, getCustomOption } from '../systems/save';
import { makeButton, makeCoins, makeText, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

const CATEGORIES: Array<{ key: keyof Customization; title: string }> = [
  { key: 'wallpaper', title: 'PAPEL DE PARED' },
  { key: 'carpet', title: 'ALFOMBRA' },
  { key: 'door', title: 'PUERTAS DEL ASCENSOR' },
];

export default class CustomizeScene extends Phaser.Scene {
  private coinsText?: Phaser.GameObjects.Text;

  constructor() {
    super('customize');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2b1b4d, 0x2b1b4d, 0x17102e, 0x17102e, 1);
    bg.fillRect(0, 0, W, H);

    makeButton(this, 52, 40, 76, 48, '◀', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 24,
      onClick: () => this.scene.start('menu'),
    });
    makeText(this, W / 2, 40, 'MI HOTEL', 32, '#ffd678');
    const coins = makeCoins(this, W - 70, 40, loadSave().coins);
    this.coinsText = coins.list[1] as Phaser.GameObjects.Text;

    let y = 120;
    for (const cat of CATEGORIES) {
      makeText(this, W / 2, y, cat.title, 20, '#c9bdf0');
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

    makeText(this, W / 2, H - 40, 'Gana monedas completando niveles con estrellas', 15, '#8f7fc0', false);
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
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x - 48, y - 48 + 4, 96, 96, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - 48, y - 48, 96, 96, 14);
    g.lineStyle(equipped ? 5 : 3, equipped ? 0xffc93c : 0xffffff, equipped ? 1 : 0.35);
    g.strokeRoundedRect(x - 48, y - 48, 96, 96, 14);

    makeText(this, x, y + 62, name, 12, '#ffffff', false);
    if (equipped) {
      makeText(this, x, y, '✓', 34, '#1a1033');
    } else if (!owned) {
      this.add.image(x, y, 'coin').setScale(0.55);
      makeText(this, x, y + 30, `${price}`, 15, '#1a1033');
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

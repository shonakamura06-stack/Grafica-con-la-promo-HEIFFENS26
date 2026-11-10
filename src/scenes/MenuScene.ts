/**
 * Pantalla de inicio — ¡Piso Equivocado! El Hotel de Monstruos.
 * Estilo kawaii pastel: cielo melocotón, nubes con carita, cartel de
 * madera, hotel crema y botones caramelo.
 */

import Phaser from 'phaser';
import { loadSave } from '../systems/save';
import { makeButton, makeCoins, makeText, makeWoodSign, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const save = loadSave();
    audio.ensure();
    this.input.once('pointerdown', () => {
      audio.ensure();
      if (loadSave().settings.music) audio.startMusic();
    });

    const W = this.scale.width;
    const H = this.scale.height;

    // Cielo pastel
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xaee3f5, 0xaee3f5, 0xd8f3fc, 0xd8f3fc, 1);
    bg.fillRect(0, 0, W, H);
    // Casitas lejanas
    const houses: Array<[number, number, number]> = [
      [10, 640, 0xfbcfe8], [60, 660, 0xbfdbfe], [420, 650, 0xbbf7d0], [470, 670, 0xfde68a],
    ];
    for (const [x, y, color] of houses) {
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(x, y, 50, 50, 6);
      bg.fillTriangle(x - 4, y, x + 54, y, x + 25, y - 22);
    }
    // Nubes a la deriva
    const cloudDefs: Array<[number, number, number, number]> = [
      [80, 120, 0.9, 9000], [460, 200, 0.7, 12000], [70, 330, 0.6, 14000], [470, 460, 0.75, 11000],
    ];
    cloudDefs.forEach(([x, y, s, dur]) => {
      const c = this.add.image(x, y, 'cloud').setScale(s).setAlpha(0.95);
      this.tweens.add({ targets: c, x: x + 24, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Hotel crema con hueco menta (silueta decorativa)
    const hotel = this.add.graphics();
    hotel.fillStyle(0xfff0d0, 1);
    hotel.fillRoundedRect(W / 2 - 120, 300, 240, H - 300, 16);
    hotel.fillStyle(0xf9a8d4, 1);
    hotel.fillRoundedRect(W / 2 - 124, 292, 248, 16, 8);
    hotel.fillStyle(0xbfe8ff, 0.8);
    hotel.fillRoundedRect(W / 2 - 45, 310, 90, H - 310, 10);
    hotel.lineStyle(3, 0xffffff, 0.9);
    hotel.strokeRoundedRect(W / 2 - 45, 310, 90, H - 310, 10);
    hotel.fillStyle(0xffffff, 0.9);
    for (let r = 0; r < 5; r++) {
      for (const side of [-1, 1]) {
        hotel.fillRoundedRect(W / 2 + side * 92 - 22, 330 + r * 62, 44, 40, 8);
      }
    }
    hotel.fillStyle(0xffa94d, 1);
    hotel.fillRoundedRect(W / 2 - 60, H - 120, 120, 30, 10);

    // Monstruos flotantes decorativos
    const floaters = ['chispa', 'nube', 'glup', 'moco'];
    floaters.forEach((id, i) => {
      const x = 60 + i * ((W - 120) / 3);
      const s = this.add.image(x, 210 + (i % 2) * 26, `monster-${id}`).setScale(0.55).setAlpha(0.95);
      this.tweens.add({
        targets: s, y: s.y + 14, duration: 1400 + i * 250,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    // Cartel de madera con el logotipo
    makeWoodSign(this, W / 2, 92, 420, 84);
    const title = makeText(this, W / 2, 80, '¡PISO EQUIVOCADO!', 40, '#ffffff');
    title.setShadow(0, 3, 'rgba(0,0,0,0.35)', 4, true, true);
    makeText(this, W / 2, 116, '— El Hotel de Monstruos —', 19, '#ffe8c2', false);

    // Bubu protagonista
    const bubu = this.add.image(W / 2, 252, 'monster-bubu').setScale(1.15);
    this.tweens.add({
      targets: bubu, y: 238, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: bubu, scaleX: 1.22, scaleY: 1.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    makeCoins(this, W - 70, 34, save.coins);

    // Botones caramelo
    const cx = W / 2;
    makeButton(this, cx, 560, 280, 68, '▶  JUGAR', {
      fontSize: 30,
      onClick: () => this.scene.start('levels'),
    });
    makeButton(this, cx, 640, 280, 56, 'NIVELES', {
      bg: COLORS.mintDark, fontSize: 22,
      onClick: () => this.scene.start('levels'),
    });
    makeButton(this, cx, 706, 280, 56, 'ÁLBUM DE MONSTRUOS', {
      bg: COLORS.purple, fontSize: 20,
      onClick: () => this.scene.start('album'),
    });
    makeButton(this, cx, 772, 280, 56, 'MI HOTEL', {
      bg: COLORS.blue, fontSize: 22,
      onClick: () => this.scene.start('customize'),
    });
    makeButton(this, cx, 838, 280, 56, 'AJUSTES', {
      bg: COLORS.green, fontSize: 22,
      onClick: () => this.scene.start('settings'),
    });

    makeText(this, W / 2, H - 26, 'Un juego de ascensor para toda la familia · v1.0', 14, '#a06a35', false);
  }
}

/**
 * Pantalla de inicio — ¡Piso Equivocado! El Hotel de Monstruos.
 * Estilo kawaii pastel: cielo melocotón, nubes con carita, cartel de
 * madera, hotel crema y botones caramelo.
 */

import Phaser from 'phaser';
import { loadSave } from '../systems/save';
import { claimableMissions } from '../systems/economy';
import { openParentalGate } from '../systems/parental';
import { makeButton, makeCoins, makeText, makeWoodSign, makePanel, COLORS } from '../systems/ui';
import qrcode from 'qrcode-generator';
import { audio } from '../systems/audio';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    this.cameras.main.fadeIn(320);
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
    const floaterX = [40, 130, 410, 500];
    floaters.forEach((id, i) => {
      const x = floaterX[i];
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

    // Botones caramelo (campaña gratis: sin corazones, sin esperas)
    const cx = W / 2;
    makeButton(this, cx, 540, 300, 66, '▶  JUGAR', {
      fontSize: 30,
      onClick: () => this.scene.start('levels'),
    });
    makeText(this, cx, 588, 'Reintentos ilimitados · sin anuncios · sin pagos para jugar', 12, '#2f9e44', false);

    const ready = claimableMissions(save).length;
    makeButton(this, cx - 135, 636, 250, 54, 'NIVELES', {
      bg: COLORS.mintDark, fontSize: 18,
      onClick: () => this.scene.start('levels'),
    });
    const missionsBtn = makeButton(this, cx + 135, 636, 250, 54, 'MISIONES', {
      bg: COLORS.accent, fontSize: 18,
      onClick: () => this.scene.start('missions'),
    });
    if (ready > 0) {
      const badge = this.add.circle(cx + 250, 612, 16, 0xef4444).setDepth(20);
      makeText(this, cx + 250, 612, `${ready}`, 15, '#ffffff').setDepth(21);
      this.tweens.add({ targets: [badge], scale: 1.25, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: missionsBtn, scale: 1.03, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    makeButton(this, cx - 135, 700, 250, 54, 'TIENDA', {
      bg: COLORS.blue, fontSize: 18,
      onClick: () => this.scene.start('shop'),
    });
    makeButton(this, cx + 135, 700, 250, 54, 'ÁLBUM', {
      bg: COLORS.purple, fontSize: 18,
      onClick: () => this.scene.start('album'),
    });
    makeButton(this, cx - 135, 764, 250, 54, 'AJUSTES', {
      bg: COLORS.green, fontSize: 18,
      onClick: () => this.scene.start('settings'),
    });
    makeButton(this, cx + 135, 764, 250, 54, 'DATOS (ADULTOS)', {
      bg: COLORS.purpleDark, fontSize: 13,
      onClick: () => openParentalGate(this, {
        title: 'Datos de juego y balance económico',
        onPass: () => this.scene.start('data'),
      }),
    });

    // Botón para llevar el juego al celular (solo cuando hay una URL pública).
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      makeButton(this, cx, 828, 320, 46, 'JUGAR EN TU CELULAR', {
        bg: COLORS.accent, fontSize: 18,
        onClick: () => this.showQrPanel(),
      });
    }

    makeText(this, W / 2, H - 14, 'Un juego de ascensor para toda la familia · v1.0', 13, '#a06a35', false);
  }

  /** Panel con código QR de la URL pública para abrir el juego en el celular. */
  private showQrPanel(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const url = `${window.location.origin}/`;
    const c = this.add.container(0, 0).setDepth(60);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 430, 580));
    c.add(makeText(this, W / 2, H / 2 - 250, 'JUGAR EN TU CELULAR', 26, '#a06a35'));
    c.add(makeText(this, W / 2, H / 2 - 214, 'Escanea este código con la cámara del cel', 16, '#6b4423', false));
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const size = 300;
    const cell = size / n;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(W / 2 - size / 2 - 14, H / 2 - 24 - size / 2 - 14, size + 28, size + 28, 12);
    g.fillStyle(0x17102e, 1);
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        if (qr.isDark(r, col)) {
          g.fillRect(W / 2 - size / 2 + col * cell, H / 2 - 24 - size / 2 + r * cell, Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
    c.add(g);
    c.add(makeText(this, W / 2, H / 2 + 152, url, 13, '#6b4423', false));
    c.add(makeText(this, W / 2, H / 2 + 182, 'Y en el cel: menú del navegador → «Instalar app»', 15, '#6b4423', false));
    c.add(makeButton(this, W / 2, H / 2 + 240, 200, 52, 'CERRAR', {
      bg: COLORS.purple, fontSize: 20, onClick: () => c.destroy(),
    }));
  }
}

/**
 * Pantalla de inicio — ¡Piso Equivocado! El Hotel de Monstruos.
 * Logotipo, monstruo protagonista animado y accesos a todas las secciones.
 */

import Phaser from 'phaser';
import { loadSave } from '../systems/save';
import { makeButton, makeCoins, makeText, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const save = loadSave();
    audio.ensure();
    // La música arranca tras el primer toque (política de audio móvil).
    this.input.once('pointerdown', () => {
      audio.ensure();
      if (loadSave().settings.music) audio.startMusic();
    });

    const W = this.scale.width;
    const H = this.scale.height;

    // Fondo: cielo nocturno del hotel
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2b1b4d, 0x2b1b4d, 0x17102e, 0x17102e, 1);
    bg.fillRect(0, 0, W, H);
    // Estrellas decorativas
    bg.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 40; i++) {
      bg.fillCircle(Math.random() * W, Math.random() * H * 0.5, Math.random() * 2 + 0.6);
    }
    // Silueta del hotel
    bg.fillStyle(0x241640, 1);
    bg.fillRoundedRect(W / 2 - 130, 300, 260, H - 300, 16);
    bg.fillStyle(0xffd678, 0.9);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        bg.fillRoundedRect(W / 2 - 100 + c * 80, 330 + r * 62, 48, 40, 8);
      }
    }

    // Monstruos flotantes decorativos
    const floaters = ['chispa', 'nube', 'glup', 'moco'];
    floaters.forEach((id, i) => {
      const x = 60 + i * ((W - 120) / 3);
      const s = this.add.image(x, 210 + (i % 2) * 26, `monster-${id}`).setScale(0.55).setAlpha(0.9);
      this.tweens.add({
        targets: s, y: s.y + 14, duration: 1400 + i * 250,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    // Logotipo
    const title = makeText(this, W / 2, 96, '¡PISO EQUIVOCADO!', 44, '#ffd678');
    title.setShadow(0, 4, '#000000', 6, true, true);
    makeText(this, W / 2, 140, '— El Hotel de Monstruos —', 22, '#c9bdf0');

    // Bubu protagonista
    const bubu = this.add.image(W / 2, 250, 'monster-bubu').setScale(1.15);
    this.tweens.add({
      targets: bubu, y: 236, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: bubu, scaleX: 1.22, scaleY: 1.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Monedas
    makeCoins(this, W - 70, 34, save.coins);

    // Botones
    const cx = W / 2;
    makeButton(this, cx, 560, 280, 68, '▶  JUGAR', {
      fontSize: 30,
      onClick: () => this.scene.start('levels'),
    });
    makeButton(this, cx, 640, 280, 56, 'NIVELES', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 22,
      onClick: () => this.scene.start('levels'),
    });
    makeButton(this, cx, 706, 280, 56, 'ÁLBUM DE MONSTRUOS', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 20,
      onClick: () => this.scene.start('album'),
    });
    makeButton(this, cx, 772, 280, 56, 'MI HOTEL', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 22,
      onClick: () => this.scene.start('customize'),
    });
    makeButton(this, cx, 838, 280, 56, 'AJUSTES', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 22,
      onClick: () => this.scene.start('settings'),
    });

    makeText(this, W / 2, H - 26, 'Un juego de ascensor para toda la familia · v1.0', 14, '#8f7fc0', false);
  }
}

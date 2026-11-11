/**
 * Selección de niveles — mapa del hotel con los 30 niveles.
 *
 * Economía V3:
 *  - La campaña es GRATIS y sin energía: se puede reintentar siempre, sin esperas.
 *  - El MODO DESAFÍO es opcional y aparte: 3 vidas por partida para quien quiera
 *    más dificultad. Perder ahí NO bloquea la campaña ni cuesta monedas.
 */

import Phaser from 'phaser';
import { LEVELS, TOTAL_LEVELS } from '../data/levels';
import { loadSave, writeSave } from '../systems/save';
import { makeButton, makeCoins, makeText, makeWoodSign, makePanel, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

export const CHALLENGE_LIVES = 3;

export default class LevelSelectScene extends Phaser.Scene {
  private challenge = false;

  constructor() {
    super('levels');
  }

  init(data: { challenge?: boolean }): void {
    this.challenge = data.challenge === true;
  }

  create(): void {
    this.cameras.main.fadeIn(320);
    const save = loadSave();
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xaee3f5, 0xaee3f5, 0xd8f3fc, 0xd8f3fc, 1);
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
    makeText(this, W / 2, 40, this.challenge ? 'MODO DESAFÍO' : 'NIVELES', 26, '#ffffff')
      .setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);
    makeCoins(this, W - 70, 40, save.coins);

    const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
    const done = Object.keys(save.completed).length;
    makeText(this, W / 2, 82, `${done}/${TOTAL_LEVELS} niveles · ${totalStars} estrellas`, 17, '#a06a35', false);
    makeText(this, W / 2, 104, 'Reintentos ilimitados y gratis: nadie te hace esperar', 12, '#2f9e44', false);

    // Interruptor del Modo Desafío (opcional, con vidas propias)
    makeButton(this, W / 2 - 118, 142, 216, 46, this.challenge ? 'DESAFÍO: ACTIVADO' : 'MODO DESAFÍO ♥×3', {
      bg: this.challenge ? COLORS.red ?? 0xf87171 : COLORS.mintDark,
      fontSize: 13,
      onClick: () => {
        audio.click();
        if (!this.challenge) this.showChallengeInfo();
        else this.scene.restart({ challenge: false });
      },
    });
    const badges = Object.keys(save.challengeCleared).length;
    makeButton(this, W / 2 + 122, 142, 200, 46, `INSIGNIAS: ${badges}/${TOTAL_LEVELS}`, {
      bg: COLORS.purple, fontSize: 13,
      onClick: () => this.showChallengeInfo(),
    });

    // Rejilla 5 x 6 con botones caramelo
    const cols = 5;
    const cellW = 96;
    const cellH = 104;
    const startX = W / 2 - ((cols - 1) * cellW) / 2;
    const startY = 212;

    LEVELS.forEach((lvl, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;
      const locked = lvl.id > save.unlockedLevel;
      const stars = save.stars[lvl.id] ?? 0;
      const badge = save.challengeCleared[lvl.id] === true;

      const g = this.add.graphics();
      const w = 76, h = 84;
      const bgColor = locked ? 0xd8cdb4
        : this.challenge ? (badge ? 0xfda4af : 0xffe0e6)
          : stars === 3 ? 0xffa94d : stars > 0 ? 0x9fe8d8 : 0xfff3d6;
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
        makeText(this, x, y - 20, `${lvl.id}`, 26, '#6b4423');
        if (this.challenge) {
          makeText(this, x, y + 14, badge ? '★ INSIGNIA' : '♥ ×3', 12, badge ? '#2f9e44' : '#ef4444', false);
        } else {
          for (let s = 0; s < 3; s++) {
            const star = this.add.image(x - 22 + s * 22, y + 16, 'star').setScale(0.36);
            if (s >= stars) star.setTint(0xb8a888);
          }
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
        this.scene.start('game', { levelId: lvl.id, challenge: this.challenge });
      });
    });

    makeText(this, W / 2, H - 26, this.challenge
      ? 'Desafío: 3 vidas por partida · si pierdes, reintentas gratis'
      : 'Toca un nivel para jugar', 14, '#a06a35', false);
  }

  /** Explicación del Modo Desafío (opcional, separado de la campaña). */
  private showChallengeInfo(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(60);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive());
    c.add(makePanel(this, W / 2, H / 2, 440, 470));
    c.add(makeText(this, W / 2, H / 2 - 190, 'MODO DESAFÍO', 27, '#ef4444'));
    const lines = [
      'Es OPCIONAL y está separado de la campaña.',
      'Tienes 3 vidas en la partida: cada piso equivocado',
      'gasta una. Si se acaban, vuelves a empezar gratis.',
      '',
      'La campaña normal NO tiene vidas ni esperas:',
      'puedes reintentar todas las veces que quieras.',
      '',
      'Cada nivel superado en Desafío da una insignia',
      'y 25 monedas una sola vez.',
    ];
    lines.forEach((l, i) => {
      c.add(makeText(this, W / 2, H / 2 - 138 + i * 24, l, 13, l === '' ? '#ffffff' : '#6b4423', false));
    });
    c.add(makeButton(this, W / 2, H / 2 + 122, 320, 58, '¡QUIERO PROBARLO!', {
      bg: COLORS.accent, fontSize: 18,
      onClick: () => {
        const s = loadSave();
        s.seenTutorials = [...new Set([...s.seenTutorials, 'challenge'])];
        writeSave(s);
        c.destroy();
        this.scene.restart({ challenge: true });
      },
    }));
    c.add(makeButton(this, W / 2, H / 2 + 186, 260, 52, 'SEGUIR EN CAMPAÑA', {
      bg: COLORS.purple, fontSize: 16, onClick: () => c.destroy(),
    }));
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}

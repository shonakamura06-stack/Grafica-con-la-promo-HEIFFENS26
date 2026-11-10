/**
 * Álbum de monstruos — galería coleccionable estilo kawaii pastel.
 */

import Phaser from 'phaser';
import { MONSTERS, MonsterDef } from '../data/monsters';
import { loadSave } from '../systems/save';
import { makeButton, makeCoins, makePanel, makeText, makeWoodSign, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

export default class AlbumScene extends Phaser.Scene {
  private detail?: Phaser.GameObjects.Container;

  constructor() {
    super('album');
  }

  create(): void {
    const save = loadSave();
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0xffd9c0, 0xffd9c0, 0xffeef5, 0xffeef5, 1);
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
    makeWoodSign(this, W / 2, 40, 240, 56);
    makeText(this, W / 2, 40, 'ÁLBUM', 28, '#ffffff').setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);
    makeCoins(this, W - 70, 40, save.coins);
    makeText(this, W / 2, 84, `${save.monstersUnlocked.length}/${MONSTERS.length} monstruos descubiertos`, 18, '#a06a35', false);

    const cols = 3;
    const cellW = 160;
    const cellH = 170;
    const startX = W / 2 - ((cols - 1) * cellW) / 2;
    const startY = 190;

    MONSTERS.forEach((m, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;
      const unlocked = save.monstersUnlocked.includes(m.id);

      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.1);
      g.fillRoundedRect(x - 66 + 3, y - 74 + 6, 132, 148, 16);
      g.fillStyle(unlocked ? 0xfff3d6 : 0xe8dcc0, 1);
      g.fillRoundedRect(x - 66, y - 74, 132, 148, 16);
      g.lineStyle(4, 0xa06a35, unlocked ? 1 : 0.5);
      g.strokeRoundedRect(x - 66, y - 74, 132, 148, 16);

      const img = this.add.image(x, y - 22, `monster-${m.id}`).setScale(0.72);
      if (!unlocked) img.setTint(0x8a7a5a).setAlpha(0.6);
      makeText(this, x, y + 44, unlocked ? m.name : '???', 17, unlocked ? '#6b4423' : '#a06a35');

      const zone = this.add.zone(x, y, 132, 148).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        audio.select();
        this.showDetail(m, unlocked);
      });
    });
  }

  private showDetail(m: MonsterDef, unlocked: boolean): void {
    this.detail?.destroy();
    const W = this.scale.width;
    const H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(50);

    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => c.destroy());
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 440, 480));

    const img = this.add.image(W / 2, H / 2 - 150, `monster-${m.id}`).setScale(1.1);
    if (!unlocked) img.setTint(0x8a7a5a).setAlpha(0.6);
    c.add(img);
    this.tweens.add({ targets: img, y: img.y - 10, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    c.add(makeText(this, W / 2, H / 2 - 40, unlocked ? m.name : 'Monstruo misterioso', 30, '#a06a35'));

    const desc = unlocked
      ? m.personality
      : `Todavía no lo conoces. Completa el nivel ${m.unlockLevel} para descubrirlo.`;
    const descText = this.add.text(W / 2, H / 2 + 20, desc, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#6b4423',
      align: 'center', wordWrap: { width: 380 },
    }).setOrigin(0.5, 0);
    c.add(descText);

    if (unlocked && m.ruleText) {
      const rule = this.add.text(W / 2, H / 2 + 120, `★ ${m.ruleText}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#e07b2a',
        align: 'center', wordWrap: { width: 380 },
      }).setOrigin(0.5, 0);
      c.add(rule);
    }

    const close = makeButton(this, W / 2, H / 2 + 190, 180, 52, 'CERRAR', {
      bg: COLORS.mintDark, fontSize: 20,
      onClick: () => c.destroy(),
    });
    c.add(close);
    this.detail = c;
  }
}

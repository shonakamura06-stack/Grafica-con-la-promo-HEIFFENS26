/**
 * Álbum de monstruos — galería coleccionable.
 * Muestra monstruos descubiertos (con personalidad y regla especial)
 * y siluetas bloqueadas con su condición de desbloqueo.
 */

import Phaser from 'phaser';
import { MONSTERS, MonsterDef } from '../data/monsters';
import { loadSave } from '../systems/save';
import { makeButton, makeCoins, makePanel, makeText, COLORS } from '../systems/ui';
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
    bg.fillGradientStyle(0x2b1b4d, 0x2b1b4d, 0x17102e, 0x17102e, 1);
    bg.fillRect(0, 0, W, H);

    makeButton(this, 52, 40, 76, 48, '◀', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 24,
      onClick: () => this.scene.start('menu'),
    });
    makeText(this, W / 2, 40, 'ÁLBUM', 32, '#ffd678');
    makeCoins(this, W - 70, 40, save.coins);
    makeText(this, W / 2, 84, `${save.monstersUnlocked.length}/${MONSTERS.length} monstruos descubiertos`, 18, '#c9bdf0', false);

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
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(x - 66, y - 74 + 4, 132, 148, 16);
      g.fillStyle(unlocked ? 0x5b4396 : 0x33255a, 1);
      g.fillRoundedRect(x - 66, y - 74, 132, 148, 16);
      g.lineStyle(3, 0xffffff, unlocked ? 0.3 : 0.12);
      g.strokeRoundedRect(x - 66, y - 74, 132, 148, 16);

      const img = this.add.image(x, y - 22, `monster-${m.id}`).setScale(0.72);
      if (!unlocked) img.setTint(0x120a28).setAlpha(0.85);
      makeText(this, x, y + 44, unlocked ? m.name : '???', 17, unlocked ? '#ffffff' : '#8f7fc0');

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

    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => c.destroy());
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 440, 480));

    const img = this.add.image(W / 2, H / 2 - 150, `monster-${m.id}`).setScale(1.1);
    if (!unlocked) img.setTint(0x120a28);
    c.add(img);
    this.tweens.add({ targets: img, y: img.y - 10, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    c.add(makeText(this, W / 2, H / 2 - 40, unlocked ? m.name : 'Monstruo misterioso', 30, '#ffd678'));

    const desc = unlocked
      ? m.personality
      : `Todavía no lo conoces. Completa el nivel ${m.unlockLevel} para descubrirlo.`;
    const descText = this.add.text(W / 2, H / 2 + 20, desc, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#e9e2ff',
      align: 'center', wordWrap: { width: 380 },
    }).setOrigin(0.5, 0);
    c.add(descText);

    if (unlocked && m.ruleText) {
      const rule = this.add.text(W / 2, H / 2 + 120, `★ ${m.ruleText}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#ffd678',
        align: 'center', wordWrap: { width: 380 },
      }).setOrigin(0.5, 0);
      c.add(rule);
    }

    const close = makeButton(this, W / 2, H / 2 + 190, 180, 52, 'CERRAR', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 20,
      onClick: () => c.destroy(),
    });
    c.add(close);
    this.detail = c;
  }
}

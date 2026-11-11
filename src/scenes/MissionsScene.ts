/**
 * MISIONES — Economía V3.
 *
 * Premian explorar las mecánicas (parejas, rutas óptimas, álbum, Modo Desafío).
 * NO hay rachas diarias ni castigo por ausencia: se pueden cobrar cuando sea.
 * Cada misión paga UNA SOLA VEZ (queda registrado el timestamp del cobro).
 */

import Phaser from 'phaser';
import { loadSave, writeSave, SaveData } from '../systems/save';
import { missionState, claimMission, claimableMissions } from '../systems/economy';
import { makeButton, makePanel, makeText, makeCoins, makeWoodSign, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

const W = 540;
const H = 960;

export default class MissionsScene extends Phaser.Scene {
  private save!: SaveData;

  constructor() {
    super('missions');
  }

  init(): void {
    this.save = loadSave();
  }

  create(): void {
    this.cameras.main.fadeIn(260);
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xe8f7e8, 0xe8f7e8, 0xfff2d6, 0xfff2d6, 1);
    bg.fillRect(0, 0, W, H);

    makeButton(this, 52, 44, 76, 48, '◀', {
      bg: COLORS.purple, fontSize: 24, onClick: () => this.scene.start('menu'),
    });
    makeWoodSign(this, W / 2, 44, 260, 58);
    makeText(this, W / 2, 44, 'MISIONES', 26, '#ffffff').setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);
    makeCoins(this, W - 74, 44, this.save.coins);

    const ready = claimableMissions(this.save).length;
    makeText(this, W / 2, 94, ready > 0
      ? `¡Tienes ${ready} recompensa(s) por cobrar!`
      : 'Juega a tu ritmo: las misiones no caducan nunca', 14, ready > 0 ? '#2f9e44' : '#a06a35', false);

    const states = missionState(this.save);
    states.forEach((m, i) => {
      const y = 168 + i * 72;
      const claimed = m.claimed;
      const g = this.add.graphics();
      g.fillStyle(claimed ? 0xf0f0f0 : m.done ? 0xfff6d8 : 0xfffaf0, 1);
      g.fillRoundedRect(24, y - 30, W - 48, 64, 14);
      g.lineStyle(3, claimed ? 0xcbd5e1 : m.done ? 0xfbbf24 : 0xd4b58c, 1);
      g.strokeRoundedRect(24, y - 30, W - 48, 64, 14);
      // Barra de progreso
      g.fillStyle(0x00000018, 1);
      g.fillRoundedRect(58, y + 14, 240, 10, 5);
      g.fillStyle(claimed ? 0x9ca3af : m.done ? 0x4ade80 : 0xfbbf24, 1);
      g.fillRoundedRect(58, y + 14, 240 * (m.progress / m.goal), 10, 5);

      const icon = this.add.image(42, y - 2, m.def.icon).setScale(0.44);
      if (claimed) icon.setTint(0x9ca3af);
      this.add.text(72, y - 16, m.def.name, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '15px', color: claimed ? '#9ca3af' : '#6b4423',
      }).setOrigin(0, 0.5);
      this.add.text(72, y + 2, `${m.def.desc}  ·  ${m.progress}/${m.goal}`, {
        fontFamily: 'Arial, sans-serif', fontSize: '12px', color: claimed ? '#9ca3af' : '#a06a35',
      }).setOrigin(0, 0.5);
      this.add.image(330, y + 2, 'coin').setScale(0.42);
      this.add.text(346, y + 2, `${m.def.reward}`, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '15px', color: '#6b4423',
      }).setOrigin(0, 0.5);

      if (claimed) {
        makeText(this, W - 74, y - 2, '✓ COBRADA', 13, '#2f9e44', false);
      } else if (m.done) {
        makeButton(this, W - 88, y - 2, 118, 44, 'COBRAR', {
          bg: COLORS.accent, fontSize: 15,
          onClick: () => {
            const coins = claimMission(this.save, m.def.id);
            writeSave(this.save);
            if (coins > 0) {
              audio.coin();
              this.claimAnimation(m.def.name, coins);
              this.time.delayedCall(1200, () => this.scene.restart());
            }
          },
        });
      } else {
        makeText(this, W - 74, y - 2, 'EN CURSO', 13, '#8a6fd0', false);
      }
    });

    makeText(this, W / 2, H - 28, 'Sin rachas diarias: puedes volver cuando quieras', 12, '#a06a35', false);
  }

  private claimAnimation(name: string, coins: number): void {
    const c = this.add.container(0, 0).setDepth(90);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.35).setOrigin(0));
    const t = makeText(this, W / 2, H / 2 - 20, `¡MISIÓN COMPLETADA!`, 30, '#2f9e44');
    const t2 = makeText(this, W / 2, H / 2 + 20, `${name} · +${coins} 🪙`, 18, '#6b4423', false);
    c.add([t, t2]);
    t.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    for (let i = 0; i < 10; i++) {
      const coin = this.add.image(W / 2, H / 2 + 20, 'coin').setScale(0.5).setDepth(91);
      this.tweens.add({
        targets: coin, x: W - 74, y: 44, angle: 360,
        duration: 700, delay: 300 + i * 40, ease: 'Cubic.easeIn', onComplete: () => coin.destroy(),
      });
    }
  }
}

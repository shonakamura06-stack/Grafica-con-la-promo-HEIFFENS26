/**
 * Ajustes — sonido, música, vibración, idioma y reinicio de progreso.
 * Estilo kawaii pastel.
 */

import Phaser from 'phaser';
import { loadSave, writeSave, clearSave, defaultSave } from '../systems/save';
import { makeButton, makeText, makeWoodSign, COLORS } from '../systems/ui';
import { audio, vibrate } from '../systems/audio';

export default class SettingsScene extends Phaser.Scene {
  private confirmReset = false;

  constructor() {
    super('settings');
  }

  create(): void {
    this.cameras.main.fadeIn(320);
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
    makeText(this, W / 2, 40, 'AJUSTES', 28, '#ffffff').setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);

    const save = loadSave();
    const rows: Array<{ label: string; key: 'sound' | 'music' | 'vibration' }> = [
      { label: 'SONIDO', key: 'sound' },
      { label: 'MÚSICA', key: 'music' },
      { label: 'VIBRACIÓN', key: 'vibration' },
    ];

    rows.forEach((row, i) => {
      const y = 150 + i * 90;
      makeText(this, W / 2 - 120, y, row.label, 22, '#6b4423');
      const on = save.settings[row.key];
      makeButton(this, W / 2 + 120, y, 140, 52, on ? 'SÍ' : 'NO', {
        bg: on ? COLORS.green : 0xb8a888,
        fontSize: 22,
        onClick: () => {
          const s = loadSave();
          s.settings[row.key] = !s.settings[row.key];
          writeSave(s);
          audio.soundEnabled = s.settings.sound;
          audio.musicEnabled = s.settings.music;
          if (row.key === 'music' && s.settings.music) audio.startMusic();
          if (row.key === 'vibration' && s.settings.vibration) vibrate(60);
          this.scene.restart();
        },
      });
    });

    makeText(this, W / 2 - 120, 420, 'IDIOMA', 22, '#6b4423');
    makeText(this, W / 2 + 120, 420, 'Español', 20, '#a06a35', false);

    const resetBtn = makeButton(this, W / 2, 520, 320, 56, 'REINICIAR PROGRESO', {
      bg: COLORS.red, fontSize: 20,
      onClick: () => {
        if (!this.confirmReset) {
          this.confirmReset = true;
          audio.error();
          this.scene.restart();
          return;
        }
        clearSave();
        const fresh = defaultSave();
        writeSave(fresh);
        audio.soundEnabled = fresh.settings.sound;
        audio.musicEnabled = fresh.settings.music;
        this.confirmReset = false;
        this.scene.restart();
      },
    });
    if (this.confirmReset) {
      const label = resetBtn.list[1] as Phaser.GameObjects.Text;
      label.setText('¿SEGURO? TOCA OTRA VEZ');
    }

    makeText(this, W / 2, H - 90, '¡Piso Equivocado! — El Hotel de Monstruos', 16, '#a06a35', false);
    makeText(this, W / 2, H - 60, 'Campaña gratis y completa · sin anuncios · compras opcionales de cosméticos.', 12, '#a06a35', false);
    makeText(this, W / 2, H - 34, 'Hecho con Phaser · v1.0', 14, '#a06a35', false);
  }
}

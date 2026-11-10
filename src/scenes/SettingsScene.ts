/**
 * Ajustes — sonido, música, vibración, idioma y reinicio de progreso.
 */

import Phaser from 'phaser';
import { loadSave, writeSave, clearSave, defaultSave } from '../systems/save';
import { makeButton, makeText, COLORS } from '../systems/ui';
import { audio, vibrate } from '../systems/audio';

export default class SettingsScene extends Phaser.Scene {
  private confirmReset = false;

  constructor() {
    super('settings');
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
    makeText(this, W / 2, 40, 'AJUSTES', 32, '#ffd678');

    const save = loadSave();
    const rows: Array<{ label: string; key: 'sound' | 'music' | 'vibration' }> = [
      { label: 'SONIDO', key: 'sound' },
      { label: 'MÚSICA', key: 'music' },
      { label: 'VIBRACIÓN', key: 'vibration' },
    ];

    rows.forEach((row, i) => {
      const y = 150 + i * 90;
      makeText(this, W / 2 - 120, y, row.label, 22, '#ffffff');
      const on = save.settings[row.key];
      makeButton(this, W / 2 + 120, y, 140, 52, on ? 'SÍ' : 'NO', {
        bg: on ? COLORS.green : 0x64748b,
        textColor: '#ffffff',
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

    makeText(this, W / 2 - 120, 420, 'IDIOMA', 22, '#ffffff');
    makeText(this, W / 2 + 120, 420, 'Español', 20, '#c9bdf0', false);

    // Reiniciar progreso (doble confirmación)
    const resetBtn = makeButton(this, W / 2, 520, 320, 56, 'REINICIAR PROGRESO', {
      bg: COLORS.red, textColor: '#ffffff', fontSize: 20,
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

    makeText(this, W / 2, H - 90, '¡Piso Equivocado! — El Hotel de Monstruos', 16, '#c9bdf0', false);
    makeText(this, W / 2, H - 60, 'Juego original sin anuncios ni compras reales.', 14, '#8f7fc0', false);
    makeText(this, W / 2, H - 34, 'Hecho con Phaser 3 · v1.0', 14, '#8f7fc0', false);
  }
}

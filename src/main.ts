/**
 * Punto de entrada — ¡Piso Equivocado! El Hotel de Monstruos.
 * Configuración de Phaser: formato vertical 9:16 (540x960), escalado
 * FIT para adaptarse a cualquier teléfono, 60 FPS objetivo.
 */

import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import LevelSelectScene from './scenes/LevelSelectScene';
import GameScene from './scenes/GameScene';
import AlbumScene from './scenes/AlbumScene';
import CustomizeScene from './scenes/CustomizeScene';
import SettingsScene from './scenes/SettingsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 540,
  height: 960,
  backgroundColor: '#17102e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: { target: 60 },
  render: { antialias: true },
  scene: [
    BootScene,
    MenuScene,
    LevelSelectScene,
    GameScene,
    AlbumScene,
    CustomizeScene,
    SettingsScene,
  ],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);

// PWA: registrar el Service Worker solo en producción (funciona sin conexión).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch(() => {
        // Sin Service Worker el juego sigue funcionando online.
      });
  });
}

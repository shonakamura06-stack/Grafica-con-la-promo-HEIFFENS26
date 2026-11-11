import Phaser from 'phaser';
import {
  SaveData, writeSave, refillHearts, isPremium, tickHearts, formatMs, REFILL_MS, PREMIUM_MS,
} from './save';
import { makeButton, makePanel, makeText, COLORS } from './ui';
import { audio } from './audio';

/**
 * Economía de vidas:
 *  - 3 corazones globales en niveles con vidas (15+).
 *  - Al quedarte en 0: esperas 25 min (temporizador real), ves un anuncio de
 *    recompensa (+3 ❤) o activas el premium de 19,99 Bs/mes (vidas infinitas).
 *  - El "anuncio" de esta versión web es un interstitial de promoción del
 *    propio juego (formato real de anuncio propio, seguro para niños y sin
 *    redes externas). En la versión de tienda ese slot se conecta a AdMob.
 */

export function openOutOfLives(
  scene: Phaser.Scene,
  save: SaveData,
  opts: { onExit: () => void; onRefilled?: () => void }
): Phaser.GameObjects.Container {
  const W = scene.scale.width;
  const H = scene.scale.height;
  tickHearts(save);
  const c = scene.add.container(0, 0).setDepth(120);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
  c.add(dim);
  const panel = makePanel(scene, W / 2, H / 2, 440, 620);
  c.add(panel);
  c.add(makeText(scene, W / 2, H / 2 - 268, '¡SIN CORAZONES!', 34, '#ef4444'));

  const rese = scene.add.image(W / 2, H / 2 - 170, 'rese').setDisplaySize(150, 150).setAngle(-8);
  rese.setTint(0x9db4ff);
  c.add(rese);
  scene.tweens.add({ targets: rese, angle: 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  c.add(makeText(scene, W / 2, H / 2 - 78, 'Los monstruos te esperan…', 18, '#6b4423', false));
  c.add(makeText(scene, W / 2, H / 2 - 52, 'Tus 3 corazones vuelven solos en:', 16, '#6b4423', false));
  const clock = makeText(scene, W / 2, H / 2 - 16, formatMs(save.heartsRefillAt - Date.now()), 40, '#e07b2a');
  c.add(clock);
  const tick = scene.time.addEvent({
    delay: 500, loop: true,
    callback: () => {
      tickHearts(save);
      if (save.hearts > 0) { clock.setText('¡LISTOS! ❤❤❤'); return; }
      clock.setText(formatMs(save.heartsRefillAt - Date.now()));
    },
  });

  const close = () => {
    tick.remove();
    c.destroy();
  };

  c.add(makeButton(scene, W / 2, H / 2 + 62, 340, 62, 'VER ANUNCIO  +3 ❤', {
    bg: COLORS.accent, fontSize: 22,
    onClick: () => {
      close();
      playRewardAd(scene, save, () => {
        opts.onRefilled?.();
      });
    },
  }));
  c.add(makeButton(scene, W / 2, H / 2 + 136, 340, 62, 'VIDAS INF. 19,99 Bs/mes', {
    bg: COLORS.purple, fontSize: 19,
    onClick: () => openPremiumPanel(scene, save, close, opts.onRefilled),
  }));
  c.add(makeButton(scene, W / 2, H / 2 + 208, 340, 56, 'ESPERAR EN EL MENÚ', {
    bg: COLORS.mintDark, fontSize: 20,
    onClick: () => { close(); opts.onExit(); },
  }));
  c.add(makeText(scene, W / 2, H / 2 + 262, 'Sin corazones no se puede jugar niveles con vidas.', 13, '#6b4423', false));

  // Entrada con rebote
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' });
  return c;
}

/** Panel informativo del premium (el cobro real vive en la versión de tienda). */
function openPremiumPanel(
  scene: Phaser.Scene,
  save: SaveData,
  closeParent: () => void,
  onRefilled?: () => void
): void {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const c = scene.add.container(0, 0).setDepth(130);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
  c.add(dim);
  c.add(makePanel(scene, W / 2, H / 2, 440, 560));
  c.add(makeText(scene, W / 2, H / 2 - 236, '❤ PASO PREMIUM ❤', 30, '#8a6fd0'));
  c.add(makeText(scene, W / 2, H / 2 - 190, 'Vidas infinitas por 1 mes', 22, '#6b4423'));
  c.add(makeText(scene, W / 2, H / 2 - 156, '19,99 Bs', 44, '#e07b2a'));
  const perks = [
    '• Corazones infinitos en todos los niveles',
    '• Sin anuncios de recompensa',
    '• Apoyas al equipo del hotel de monstruos',
  ];
  perks.forEach((p, i) => {
    c.add(makeText(scene, W / 2, H / 2 - 100 + i * 30, p, 16, '#6b4423', false));
  });
  c.add(makeText(scene, W / 2, H / 2 + 6, 'El cobro real se activa en la versión de tienda', 14, '#6b4423', false));
  c.add(makeText(scene, W / 2, H / 2 + 28, '(Play Store / APK). Aquí puedes probarlo en modo demo.', 14, '#6b4423', false));
  c.add(makeButton(scene, W / 2, H / 2 + 92, 340, 60, 'PROBAR DEMO (SIN COBRO)', {
    bg: COLORS.accent, fontSize: 18,
    onClick: () => {
      save.premiumUntil = Date.now() + PREMIUM_MS;
      refillHearts(save);
      writeSave(save);
      audio.unlock();
      c.destroy();
      closeParent();
      onRefilled?.();
    },
  }));
  c.add(makeButton(scene, W / 2, H / 2 + 164, 340, 54, 'VOLVER', {
    bg: COLORS.mintDark, fontSize: 20,
    onClick: () => c.destroy(),
  }));
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
}

/**
 * Interstitial de recompensa: promoción animada del propio juego (12 s).
 * Al terminar (o al saltarse cuando ya se puede), recarga los 3 corazones.
 */
export function playRewardAd(scene: Phaser.Scene, save: SaveData, onDone: () => void): void {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const TOTAL = 12;
  const c = scene.add.container(0, 0).setDepth(140);
  c.add(scene.add.rectangle(0, 0, W, H, 0x17102e, 1).setOrigin(0));
  c.add(makeText(scene, W / 2, 40, 'ANUNCIO · promoción del Hotel', 16, '#b79ced', false));
  const counter = makeText(scene, W / 2, 74, `Recompensa +3 ❤ en ${TOTAL}s`, 22, '#ffd678');
  c.add(counter);

  // Desfile de monstruos promocional
  const ids = ['bubu', 'chispa', 'moco', 'nube', 'draculin', 'rufi', 'glup', 'gordito'];
  const marchers: Phaser.GameObjects.Image[] = [];
  ids.forEach((id, i) => {
    const m = scene.add.image(-60 - i * 90, H / 2 + 40, id).setScale(1.05);
    c.add(m);
    marchers.push(m);
    scene.tweens.add({
      targets: m, x: W + 80, duration: 9000 + i * 350, ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: m, y: H / 2 + 10, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 90,
    });
  });
  const promo = makeText(scene, W / 2, H / 2 + 150, '¡Colecciona los 17 monstruos\nen el ÁLBUM del hotel!', 26, '#ffffff');
  promo.setOrigin(0.5);
  c.add(promo);
  scene.tweens.add({ targets: promo, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  c.add(makeText(scene, W / 2, H - 40, 'Anuncio de demostración: promoción del propio juego, sin redes externas.', 12, '#8a8aa0', false));

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    countdown.remove();
    refillHearts(save);
    save.adsWatched += 1;
    writeSave(save);
    audio.unlock();
    // Lluvia de corazones de recompensa
    for (let i = 0; i < 14; i++) {
      const h = scene.add.image(Math.random() * W, -30, 'heart').setScale(0.7).setDepth(150);
      scene.tweens.add({
        targets: h, y: H + 40, x: h.x + (Math.random() - 0.5) * 90, angle: 360,
        duration: 900 + Math.random() * 700, delay: i * 60, onComplete: () => h.destroy(),
      });
    }
    scene.time.delayedCall(900, () => {
      c.destroy();
      onDone();
    });
  };

  const countdown = scene.time.addEvent({
    delay: 1000, repeat: TOTAL - 1,
    callback: () => {
      const left = TOTAL - countdown.getRepeatCount() - 1;
      if (left >= TOTAL) { finish(); return; }
      counter.setText(left <= 5 ? `¡Ya casi! +3 ❤ en ${TOTAL - left}s` : `Recompensa +3 ❤ en ${TOTAL - left}s`);
      if (left === 5 && !skipBtn.visible) skipBtn.setVisible(true);
    },
  });
  const skipBtn = makeButton(scene, W / 2, H - 90, 260, 54, 'SALTAR Y RECIBIR ❤❤❤', {
    bg: COLORS.accent, fontSize: 17, onClick: () => finish(),
  }).setVisible(false).setDepth(145);
  c.add(skipBtn);
  // Al acabar los 12 s se cobra la recompensa automáticamente.
  scene.time.delayedCall(TOTAL * 1000 + 200, finish);
}

export const REFILL_INFO = { REFILL_MS };

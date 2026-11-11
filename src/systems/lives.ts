import Phaser from 'phaser';
import {
  SaveData, writeSave, addHeart, buyHeartWithCoins, isPremium, tickHearts,
  formatMs, REGEN_MS, PREMIUM_MS, HEART_COIN_COST,
} from './save';
import { makeButton, makePanel, makeText, COLORS } from './ui';
import { audio } from './audio';

/**
 * Economía de vidas v2 (corazones ESCASOS, pensada para monetizar):
 *  - 3 corazones globales en niveles con vidas (15+); cada piso equivocado gasta 1.
 *  - Regeneración LENTA: 1 corazón por hora (nada de recarga completa gratis).
 *  - Con 0 corazones: ver anuncio (+1 ❤), comprar 1 ❤ con 150 monedas ganadas
 *    jugando, o premium de 19,99 Bs/mes (vidas infinitas, sin anuncios).
 *  - El "anuncio" de esta versión web es un interstitial de promoción del propio
 *    juego (sin redes externas, seguro para niños); en la versión de tienda ese
 *    slot se conecta a AdMob/AdSense.
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
  c.add(makePanel(scene, W / 2, H / 2, 440, 660));
  c.add(makeText(scene, W / 2, H / 2 - 288, '¡SIN CORAZONES!', 34, '#ef4444'));

  const rese = scene.add.image(W / 2, H / 2 - 190, 'rese').setDisplaySize(140, 140).setAngle(-8);
  rese.setTint(0x9db4ff);
  c.add(rese);
  scene.tweens.add({ targets: rese, angle: 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  c.add(makeText(scene, W / 2, H / 2 - 100, 'Los monstruos te esperan…', 18, '#6b4423', false));
  c.add(makeText(scene, W / 2, H / 2 - 74, 'Tu siguiente corazón gratis llega en:', 15, '#6b4423', false));
  const clock = makeText(scene, W / 2, H / 2 - 40, formatMs(save.heartsRefillAt - Date.now()), 36, '#e07b2a');
  c.add(clock);
  const tick = scene.time.addEvent({
    delay: 500, loop: true,
    callback: () => {
      tickHearts(save);
      if (save.hearts > 0) { clock.setText('¡YA TIENES 1! ❤'); return; }
      clock.setText(formatMs(Math.max(0, save.heartsRefillAt - Date.now())));
    },
  });
  const note = makeText(scene, W / 2, H / 2 - 8, '(1 corazón por hora · o consigue uno ahora:)', 13, '#8a6fd0', false);
  c.add(note);

  const close = () => {
    tick.remove();
    c.destroy();
  };
  const feedback = makeText(scene, W / 2, H / 2 + 236, '', 15, '#ef4444', false);
  c.add(feedback);

  c.add(makeButton(scene, W / 2, H / 2 + 34, 340, 58, 'VER ANUNCIO  +1 ❤', {
    bg: COLORS.accent, fontSize: 21,
    onClick: () => {
      close();
      playRewardAd(scene, save, () => opts.onRefilled?.());
    },
  }));
  c.add(makeButton(scene, W / 2, H / 2 + 102, 340, 58, `COMPRAR 1 ❤ · ${HEART_COIN_COST} monedas`, {
    bg: COLORS.mintDark, fontSize: 18,
    onClick: () => {
      if (buyHeartWithCoins(save)) {
        writeSave(save);
        audio.unlock();
        close();
        opts.onRefilled?.();
      } else {
        audio.error();
        feedback.setText(save.hearts >= 3 ? 'Ya tienes los 3 corazones.' : `Te faltan monedas: gana en niveles o el regalo diario.`);
        scene.tweens.add({ targets: feedback, alpha: 0.4, duration: 200, yoyo: true, repeat: 2 });
      }
    },
  }));
  c.add(makeButton(scene, W / 2, H / 2 + 170, 340, 58, 'VIDAS INF. 19,99 Bs/mes', {
    bg: COLORS.purple, fontSize: 19,
    onClick: () => openPremiumPanel(scene, save, close, opts.onRefilled),
  }));
  c.add(makeButton(scene, W / 2, H / 2 + 208 + 30, 340, 52, 'ESPERAR EN EL MENÚ', {
    bg: COLORS.blue ?? COLORS.mintDark, fontSize: 18,
    onClick: () => { close(); opts.onExit(); },
  }));

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
    '• Regalo diario doble (monedas y corazón)',
    '• Apoyas al equipo del hotel de monstruos',
  ];
  perks.forEach((p, i) => {
    c.add(makeText(scene, W / 2, H / 2 - 100 + i * 30, p, 16, '#6b4423', false));
  });
  c.add(makeText(scene, W / 2, H / 2 + 34, 'El cobro real se activa en la versión de tienda', 14, '#6b4423', false));
  c.add(makeText(scene, W / 2, H / 2 + 56, '(Play Store / APK). Aquí puedes probarlo en modo demo.', 14, '#6b4423', false));
  c.add(makeButton(scene, W / 2, H / 2 + 118, 340, 60, 'PROBAR DEMO (SIN COBRO)', {
    bg: COLORS.accent, fontSize: 18,
    onClick: () => {
      save.premiumUntil = Date.now() + PREMIUM_MS;
      save.hearts = 3;
      save.heartsRefillAt = 0;
      writeSave(save);
      audio.unlock();
      c.destroy();
      closeParent();
      onRefilled?.();
    },
  }));
  c.add(makeButton(scene, W / 2, H / 2 + 190, 340, 54, 'VOLVER', {
    bg: COLORS.mintDark, fontSize: 20,
    onClick: () => c.destroy(),
  }));
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
}

/**
 * Interstitial de recompensa: promoción animada del propio juego (12 s).
 * Al terminarlo (o saltarlo cuando ya se puede) suma +1 corazón.
 */
export function playRewardAd(scene: Phaser.Scene, save: SaveData, onDone: () => void): void {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const TOTAL = 12;
  const c = scene.add.container(0, 0).setDepth(140);
  c.add(scene.add.rectangle(0, 0, W, H, 0x17102e, 1).setOrigin(0));
  c.add(makeText(scene, W / 2, 40, 'ANUNCIO · promoción del Hotel', 16, '#b79ced', false));
  const counter = makeText(scene, W / 2, 74, `Recompensa +1 ❤ en ${TOTAL}s`, 22, '#ffd678');
  c.add(counter);

  const ids = ['bubu', 'chispa', 'moco', 'nube', 'draculin', 'rufi', 'glup', 'gordito'];
  ids.forEach((id, i) => {
    const m = scene.add.image(-60 - i * 90, H / 2 + 40, id).setScale(1.05);
    c.add(m);
    scene.tweens.add({ targets: m, x: W + 80, duration: 9000 + i * 350, ease: 'Sine.easeInOut' });
    scene.tweens.add({
      targets: m, y: H / 2 + 10, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 90,
    });
  });
  const promo = scene.add.text(W / 2, H / 2 + 150, '¡Colecciona los 20 monstruos\nen el ÁLBUM del hotel!', {
    fontFamily: 'Arial, sans-serif', fontSize: '26px', color: '#ffffff', align: 'center',
  }).setOrigin(0.5);
  c.add(promo);
  scene.tweens.add({ targets: promo, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  c.add(makeText(scene, W / 2, H - 40, 'Anuncio de demostración: promoción del propio juego, sin redes externas.', 12, '#8a8aa0', false));

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    countdown.remove();
    addHeart(save);
    save.adsWatched += 1;
    writeSave(save);
    audio.unlock();
    for (let i = 0; i < 8; i++) {
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
      counter.setText(left <= 5 ? `¡Ya casi! +1 ❤ en ${TOTAL - left}s` : `Recompensa +1 ❤ en ${TOTAL - left}s`);
      if (left === 5 && !skipBtn.visible) skipBtn.setVisible(true);
    },
  });
  const skipBtn = makeButton(scene, W / 2, H - 90, 260, 54, 'SALTAR Y RECIBIR ❤', {
    bg: COLORS.accent, fontSize: 17, onClick: () => finish(),
  }).setVisible(false).setDepth(145);
  c.add(skipBtn);
  scene.time.delayedCall(TOTAL * 1000 + 200, finish);
}

export const REGEN_INFO = { REGEN_MS };

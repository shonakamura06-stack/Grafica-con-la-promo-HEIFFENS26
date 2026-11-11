/**
 * Barrera parental — Economía V3.
 *
 * Las tiendas de aplicaciones (Google Play y App Store) exigen que las secciones
 * de compra en apps dirigidas a niños estén protegidas por una puerta para adultos.
 * Aquí se implementa con una multiplicación de dos cifras (recomendación habitual)
 * y sin recopilar ningún dato: el resultado no se guarda ni se envía.
 */

import Phaser from 'phaser';
import { makeButton, makePanel, makeText, COLORS } from './ui';
import { audio } from './audio';
import { loadSave, writeSave } from './save';

export interface ParentalChallenge {
  a: number;
  b: number;
  answer: number;
  question: string;
  options: number[];
}

function defaultRng(): () => number {
  return Math.random;
}

/** Genera una multiplicación con 3 opciones (una correcta). Determinista si se pasa rng. */
export function makeParentalChallenge(rng: () => number = defaultRng()): ParentalChallenge {
  const a = 4 + Math.floor(rng() * 6);   // 4..9
  const b = 3 + Math.floor(rng() * 7);   // 3..9
  const answer = a * b;
  const options = new Set<number>([answer]);
  while (options.size < 3) {
    const delta = 1 + Math.floor(rng() * 12);
    const candidate = rng() < 0.5 ? answer + delta : Math.max(1, answer - delta);
    if (candidate !== answer) options.add(candidate);
  }
  // Orden estable pero no siempre con la correcta en la misma posición.
  const list = [...options];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return { a, b, answer, question: `¿Cuánto es ${a} × ${b}?`, options: list };
}

export function checkParentalAnswer(challenge: ParentalChallenge, pick: number): boolean {
  return pick === challenge.answer;
}

/**
 * Panel de barrera parental. Al superarla se llama a onPass.
 * Contabiliza aperturas e intentos superados en las métricas locales (agregadas).
 */
export function openParentalGate(
  scene: Phaser.Scene,
  opts: { title?: string; subtitle?: string; onPass: () => void; onCancel?: () => void }
): Phaser.GameObjects.Container {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const save = loadSave();
  save.metrics.adultGateOpens += 1;
  writeSave(save);

  const c = scene.add.container(0, 0).setDepth(200);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.66).setOrigin(0).setInteractive();
  c.add(dim);
  c.add(makePanel(scene, W / 2, H / 2, 440, 470));
  c.add(makeText(scene, W / 2, H / 2 - 190, 'ZONA PARA ADULTOS', 26, '#8a6fd0'));
  c.add(makeText(scene, W / 2, H / 2 - 154, opts.title ?? 'Sección de compras', 19, '#6b4423'));
  c.add(makeText(scene, W / 2, H / 2 - 122, opts.subtitle ?? 'Para continuar, resuelve esta cuenta:', 15, '#6b4423', false));

  const challenge = makeParentalChallenge();
  c.add(makeText(scene, W / 2, H / 2 - 70, challenge.question, 40, '#e07b2a'));
  const feedback = makeText(scene, W / 2, H / 2 + 118, '', 15, '#ef4444', false);
  c.add(feedback);

  challenge.options.forEach((value, i) => {
    const x = W / 2 + (i - 1) * 122;
    const btn = makeButton(scene, x, H / 2 + 8, 104, 76, `${value}`, {
      bg: COLORS.mintDark, fontSize: 26,
      onClick: () => {
        if (checkParentalAnswer(challenge, value)) {
          const s = loadSave();
          s.metrics.adultGatePasses += 1;
          writeSave(s);
          audio.unlock();
          c.destroy();
          opts.onPass();
        } else {
          audio.error();
          feedback.setText('Esa no es. Esta zona es para un adulto.');
          scene.tweens.add({ targets: btn, x: x + 6, duration: 45, yoyo: true, repeat: 3 });
        }
      },
    });
    c.add(btn);
  });

  c.add(makeText(scene, W / 2, H / 2 + 150, 'No se guarda ni se envía ninguna información personal.', 13, '#8a6fd0', false));
  c.add(makeButton(scene, W / 2, H / 2 + 196, 220, 52, 'VOLVER', {
    bg: COLORS.purple, fontSize: 19,
    onClick: () => { c.destroy(); opts.onCancel?.(); },
  }));

  c.setScale(0.7).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  return c;
}

/**
 * DATOS DE JUEGO — panel para adultos (Economía V3).
 *
 * Sirve para MEDIR la economía sin espiar a nadie:
 *  - Todo se guarda en este dispositivo (localStorage). No se envía nada a internet.
 *  - No hay identificadores, nombres, edades, ubicación ni datos personales.
 *  - Son contadores agregados del tipo "niveles completados" o "monedas gastadas",
 *    justo lo que se necesita para saber si la tienda interesa o si hay frustración.
 *
 * Incluye además la simulación de balance (src/systems/balance.ts) para comparar
 * lo que gana cada perfil de jugador con los precios de la tienda.
 */

import Phaser from 'phaser';
import { loadSave, SaveData, Metrics } from '../systems/save';
import { simulateAll, avgMinutesPerLevel, type BalanceResult } from '../systems/balance';
import { SHOP_ITEMS } from '../data/shop';
import { MISSIONS } from '../data/missions';
import { MAX_COINS, coinShopTotal, coinShopTotalWithBundle } from '../systems/economy';
import { makeButton, makePanel, makeText, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';

const W = 540;
const H = 960;

export default class DataScene extends Phaser.Scene {
  private save!: SaveData;

  constructor() {
    super('data');
  }

  init(): void {
    this.save = loadSave();
  }

  create(): void {
    this.cameras.main.fadeIn(240);
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1e2a4a, 0x1e2a4a, 0x2b3a63, 0x2b3a63, 1);
    bg.fillRect(0, 0, W, H);

    makeButton(this, 52, 40, 76, 46, '◀', {
      bg: COLORS.purple, fontSize: 22, onClick: () => this.scene.start('menu'),
    });
    makeText(this, W / 2, 40, 'DATOS DE JUEGO', 24, '#ffffff');
    makeText(this, W / 2, 72, 'Sección para adultos · todo se queda en este dispositivo', 12, '#b79ced', false);
    makeText(this, W / 2, 92, 'Sin identificadores, sin datos personales, sin envío a internet', 12, '#8fa2d8', false);

    const m: Metrics = this.save.metrics;
    const panel = makePanel(this, W / 2, 336, 496, 400);
    panel.setAlpha(0.96);
    makeText(this, W / 2, 152, 'INDICADORES DE ESTA PARTIDA GUARDADA', 14, '#6b4423', false);

    const rows: Array<[string, string]> = [
      ['Niveles completados', `${m.levelsCompleted}`],
      ['Niveles repetidos (¿quieren mejorar?)', `${m.levelReplays}`],
      ['Monedas obtenidas', `${m.coinsEarned}`],
      ['Monedas gastadas', `${m.coinsSpent}`],
      ['Objetos comprados', `${m.itemsBought}`],
      ['Objeto más comprado', this.topCategory(m)],
      ['Packs de contenido desbloqueados', `${m.packsUnlocked}`],
      ['Misiones cobradas', `${m.missionsClaimed} / ${MISSIONS.length}`],
      ['Abandonos a mitad de nivel', `${m.quitsMidLevel}`],
      ['Niveles perdidos por tiempo', `${m.timeouts}`],
      ['Pisos equivocados acumulados', `${m.mistakes}`],
      ['Modo Desafío (intentos / superados)', `${m.challengeAttempts} / ${m.challengeCleared}`],
      ['Zona adultos (abierta / superada)', `${m.adultGateOpens} / ${m.adultGatePasses}`],
    ];
    rows.forEach((r, i) => {
      const y = 186 + i * 26;
      makeText(this, 42, y, r[0], 12, '#6b4423', false).setOrigin(0, 0.5);
      makeText(this, W - 42, y, r[1], 13, '#e07b2a', false).setOrigin(1, 0.5);
    });

    // Derivados útiles para decidir precios
    const perLevel = m.levelsCompleted > 0 ? (m.coinsEarned / m.levelsCompleted).toFixed(1) : '0';
    const replayRate = m.levelsCompleted > 0 ? (m.levelReplays / m.levelsCompleted).toFixed(2) : '0';
    const threeStars = Object.values(this.save.stars).filter((s) => s >= 3).length;
    const starRate = m.levelsCompleted > 0 ? `${Math.round((threeStars / m.levelsCompleted) * 100)}%` : '0%';
    const quitRate = m.sessionsStarted > 0 ? `${Math.round((m.quitsMidLevel / m.sessionsStarted) * 100)}%` : '0%';
    const d1 = makePanel(this, W / 2, 596, 496, 108);
    d1.setAlpha(0.96);
    makeText(this, W / 2, 556, 'MONEDAS POR NIVEL · REPETICIONES POR NIVEL · 3 ESTRELLAS · ABANDONO', 11, '#8a6fd0', false);
    makeText(this, W / 2, 592, `${perLevel} 🪙   ·   ${replayRate}   ·   ${starRate}   ·   ${quitRate}`, 20, '#6b4423', false);

    // Simulación de balance (perfiles)
    const sim = simulateAll();
    const simPanel = makePanel(this, W / 2, 762, 496, 236);
    simPanel.setAlpha(0.96);
    makeText(this, W / 2, 658, 'SIMULACIÓN DE BALANCE (perfiles de jugador)', 14, '#6b4423', false);
    makeText(this, 60, 682, 'Perfil', 11, '#8a6fd0', false).setOrigin(0, 0.5);
    makeText(this, 330, 682, 'Monedas', 11, '#8a6fd0', false);
    makeText(this, 410, 682, 'Sesiones', 11, '#8a6fd0', false);
    makeText(this, 486, 682, 'Puede pagar', 11, '#8a6fd0', false);
    sim.forEach((r, i) => {
      const y = 708 + i * 26;
      makeText(this, 60, y, r.profile.name, 11, '#6b4423', false).setOrigin(0, 0.5);
      makeText(this, 330, y, `${r.coins}`, 12, '#e07b2a', false);
      makeText(this, 410, y, `${r.sessions}`, 12, '#6b4423', false);
      makeText(this, 486, y, `${r.itemsAffordable}/${r.itemsTotal}`, 12, '#2f9e44', false);
    });
    makeText(this, W / 2, 850,
      `Máximo ganable jugando: ${MAX_COINS} 🪙 · tienda individual: ${coinShopTotal()} 🪙 · con paquete: ${coinShopTotalWithBundle()} 🪙`,
      11, '#8a6fd0', false);
    makeText(this, W / 2, 872,
      'Los precios no se ajustan a ojo: se comparan con esta simulación (docs/ECONOMIA.md).',
      11, '#a06a35', false);

    makeButton(this, 145, H - 46, 240, 54, 'COPIAR INFORME', {
      bg: COLORS.mintDark, fontSize: 15, onClick: () => this.copyReport(sim),
    });
    makeButton(this, 398, H - 46, 240, 54, 'CERRAR', {
      bg: COLORS.purple, fontSize: 16, onClick: () => this.scene.start('menu'),
    });
  }

  private topCategory(m: Metrics): string {
    const entries = Object.entries(m.itemsByCategory ?? {});
    if (entries.length === 0) return '—';
    entries.sort((a, b) => b[1] - a[1]);
    const names: Record<string, string> = {
      facade: 'Colores del edificio', accessory: 'Recepcionista', elevator: 'Ascensor',
      wallpaper: 'Papel tapiz', theme: 'Temáticas', pack: 'Paquetes',
    };
    return `${names[entries[0][0]] ?? entries[0][0]} (${entries[0][1]})`;
  }

  private copyReport(sim: BalanceResult[]): void {
    const m = this.save.metrics;
    const lines = [
      'INFORME DE ECONOMÍA — ¡Piso Equivocado! (datos locales agregados, sin datos personales)',
      `nivelesCompletados=${m.levelsCompleted} repeticiones=${m.levelReplays} abandonos=${m.quitsMidLevel} tiemposAgotados=${m.timeouts}`,
      `monedasGanadas=${m.coinsEarned} monedasGastadas=${m.coinsSpent} objetosComprados=${m.itemsBought} packs=${m.packsUnlocked}`,
      `porCategoria=${JSON.stringify(m.itemsByCategory)}`,
      `misionesCobradas=${m.missionsClaimed} desafio=${m.challengeAttempts}/${m.challengeCleared}`,
      'SIMULACIÓN:',
      ...sim.map((r) => `${r.profile.id}: monedas=${r.coins} partidas=${r.levelsPlayed} sesiones=${r.sessions} minutos=${Math.round(r.minutes)} pagables=${r.itemsAffordable}/${r.itemsTotal} minPorNivel=${avgMinutesPerLevel(r.profile).toFixed(1)}`),
      `catalogoMonedas=${SHOP_ITEMS.length} maxGanable=${MAX_COINS}`,
    ];
    const text = lines.join('\n');
    try {
      const nav = globalThis.navigator as Navigator | undefined;
      if (nav?.clipboard?.writeText) {
        void nav.clipboard.writeText(text);
        this.toast('Informe copiado al portapapeles');
        return;
      }
    } catch {
      /* sin portapapeles: se muestra en pantalla */
    }
    this.toast('No hay portapapeles disponible; informe en consola');
    // eslint-disable-next-line no-console
    console.info(text);
    audio.click();
  }

  private toast(msg: string): void {
    const t = makeText(this, W / 2, H - 100, msg, 14, '#ffffff', false).setDepth(50);
    t.setBackgroundColor('#2f9e44');
    t.setPadding(10, 6, 10, 6);
    this.tweens.add({ targets: t, alpha: 0, duration: 2000, delay: 900, onComplete: () => t.destroy() });
  }
}

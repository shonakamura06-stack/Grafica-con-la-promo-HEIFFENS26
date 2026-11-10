/**
 * Escena de juego — ¡Piso Equivocado! El Hotel de Monstruos.
 *
 * Mecánica central:
 * - Toca monstruos en la cola para subirlos al ascensor (respeta capacidad
 *   y reglas especiales: gigante, gemelos, tímido, sonámbulo, fantasma).
 * - Toca un piso del panel para viajar. Los pasajeros salen solos en su piso.
 * - Si el ascensor queda vacío, vuelve solo a recepción.
 * - Gana cuando todos los monstruos llegan a su destino.
 * - Las estrellas dependen de la distancia recorrida vs. el óptimo.
 * - Pisos equivocados: los monstruos se ponen neutros, luego enojados,
 *   y al tercer error vuelven molestos a recepción.
 *
 * Dirección artística kawaii: cielo azul, hotel crema con barandillas y
 * banners de colores, torre de cristal para el ascensor, lobby con
 * ventanales y recepción con recepcionista, suelo de baldosas, bocadillos
 * de estrella y monstruos vivos con contorno grueso.
 */

import Phaser from 'phaser';
import { getLevel, LevelDef, TOTAL_LEVELS } from '../data/levels';
import { MONSTER_MAP, MonsterDef, TWIN_GROUP, Mood, floorColor } from '../data/monsters';
import { loadSave, writeSave, SaveData, getCustomOption } from '../systems/save';
import { computeOptimal, starsFor, starThresholds, coinsFor, moodForMistakes, MAX_MISTAKES } from '../systems/scoring';
import { makeButton, makePanel, makeText, makeStars, makeWoodSign, COLORS } from '../systems/ui';
import { audio, vibrate } from '../systems/audio';

type PaxState = 'queue' | 'boarding' | 'onboard' | 'exiting' | 'delivered';

interface Passenger {
  id: number;
  monsterId: string;
  def: MonsterDef;
  dest: number;
  slots: number;
  state: PaxState;
  asleep: boolean;
  mood: Mood;
  container: Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Container;
  bobTween?: Phaser.Tweens.Tween;
}

const W = 540;
const H = 960;
const BUILD_LEFT = 16;
const BUILD_RIGHT = 376;
const BUILD_TOP = 118;
const LOBBY_TOP = 640;
const BUILD_BOTTOM = 760;
const CAB_X = 210;
const CAB_W = 150;
const CAB_H = 96;
const SHAFT_LEFT = CAB_X - CAB_W / 2 - 8;
const SHAFT_RIGHT = CAB_X + CAB_W / 2 + 8;

export default class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private save!: SaveData;
  private passengers: Passenger[] = [];
  private elevatorFloor = 0;
  private moving = false;
  private doorsOpen = true;
  private distance = 0;
  private optimal = 0;
  private delivered = 0;
  private mistakes = 0;
  private grumpyReturn = false;
  private won = false;
  private paused = false;

  private cab!: Phaser.GameObjects.Container;
  private cable!: Phaser.GameObjects.Graphics;
  private doorL!: Phaser.GameObjects.Graphics;
  private doorR!: Phaser.GameObjects.Graphics;
  private indicator!: Phaser.GameObjects.Text;
  private indicatorBg!: Phaser.GameObjects.Graphics;
  private floorButtons = new Map<number, { g: Phaser.GameObjects.Graphics; badge: Phaser.GameObjects.Text; badgeBg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }>();
  private panelFloorText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private patienceStars: Phaser.GameObjects.Image[] = [];
  private bubble!: Phaser.GameObjects.Container;
  private bubbleText!: Phaser.GameObjects.Text;
  private bubbleBg!: Phaser.GameObjects.Graphics;
  private bubbleTimer?: Phaser.Time.TimerEvent;
  private vignette!: Phaser.GameObjects.Graphics;
  private wrongText!: Phaser.GameObjects.Container;

  constructor() {
    super('game');
  }

  init(data: { levelId?: number }): void {
    this.level = getLevel(data.levelId ?? 1);
    this.save = loadSave();
    this.passengers = [];
    this.elevatorFloor = 0;
    this.moving = false;
    this.doorsOpen = true;
    this.distance = 0;
    this.delivered = 0;
    this.mistakes = 0;
    this.grumpyReturn = false;
    this.won = false;
    this.paused = false;
    this.floorButtons.clear();
    this.patienceStars = [];
    this.optimal = computeOptimal(this.level).optimal;
  }

  // ── Geometría ────────────────────────────────────────────────────────────
  private fh(): number {
    return (LOBBY_TOP - BUILD_TOP) / this.level.floors;
  }
  private bandBottom(f: number): number {
    if (f === 0) return BUILD_BOTTOM;
    return LOBBY_TOP - (f - 1) * this.fh();
  }
  private cabY(f: number): number {
    return this.bandBottom(f) - CAB_H / 2 - 4;
  }
  private usedSlots(): number {
    return this.passengers
      .filter((p) => p.state === 'onboard' || p.state === 'boarding')
      .reduce((a, p) => a + p.slots, 0);
  }
  private onboard(): Passenger[] {
    return this.passengers.filter((p) => p.state === 'onboard');
  }
  private queueScale(p: Passenger): number {
    return 0.5 * p.def.scale;
  }
  private cabScale(p: Passenger): number {
    return 0.36 * p.def.scale;
  }

  create(): void {
    audio.ensure();
    if (this.save.settings.music) audio.startMusic();
    this.input.once('pointerdown', () => audio.ensure());

    this.drawSky();
    this.drawHotel();
    this.drawHud();
    this.drawFloorPanel();
    this.createCab();
    this.createPassengers();
    this.createBubble();
    this.createFx();
    this.layoutQueue(true);
    this.refreshHud();
    this.refreshFloorButtons();
    this.updateHint();
    this.showSpecialTutorialIfNeeded();

    // Parpadeos aleatorios de los monstruos en cola
    this.time.addEvent({
      delay: 2300, loop: true,
      callback: () => {
        const waiting = this.passengers.filter((p) => p.state === 'queue');
        if (waiting.length === 0) return;
        const p = waiting[Math.floor(Math.random() * waiting.length)];
        const s = this.queueScale(p);
        this.tweens.add({ targets: p.image, scaleY: s * 0.8, duration: 80, yoyo: true });
      },
    });

    // Pausa automática al cambiar de pestaña
    this.onVisibility = () => {
      if (document.hidden && !this.won && !this.paused) this.openPause();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.onVisibility);
    });
  }

  private onVisibility = (): void => {};

  /** Mantiene a los pasajeros a bordo pegados a la cabina y dibuja el cable. */
  update(time: number): void {
    const onboard = this.onboard();
    onboard.forEach((p, i) => {
      const pos = this.slotPosition(i);
      const bob = p.def.rule === 'ghost' ? Math.sin(time / 280 + p.id) * 4 : 0;
      const targetY = p.def.rule === 'ghost' ? -22 + bob : pos.y;
      p.container.setPosition(this.cab.x + pos.x, this.cab.y + targetY);
    });
    this.cable.clear();
    this.cable.lineStyle(3, 0x7c4f24, 0.9);
    this.cable.lineBetween(CAB_X, BUILD_TOP + 22, this.cab.x, this.cab.y - CAB_H / 2 - 6);
  }

  // ── Cielo y nubes ────────────────────────────────────────────────────────
  private drawSky(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0xaee3f5, 0xaee3f5, 0xd8f3fc, 0xd8f3fc, 1);
    g.fillRect(0, 0, W, H);
    const cloudDefs: Array<[number, number, number, number]> = [
      [70, 130, 0.8, 9000], [470, 190, 0.65, 12000], [60, 420, 0.55, 14000], [480, 560, 0.7, 11000],
    ];
    cloudDefs.forEach(([x, y, s, dur]) => {
      const c = this.add.image(x, y, 'cloud').setScale(s).setAlpha(0.95).setDepth(1);
      this.tweens.add({
        targets: c, x: x + 26, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });
  }

  // ── Hotel kawaii (2.5D) ──────────────────────────────────────────────────
  private drawHotel(): void {
    const carpet = getCustomOption('carpet', this.save.custom.carpet).color;
    const N = this.level.floors;
    const fh = this.fh();

    const g = this.add.graphics();
    // Sombra del edificio
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(BUILD_LEFT + 7, BUILD_TOP + 9, BUILD_RIGHT - BUILD_LEFT, BUILD_BOTTOM - BUILD_TOP, 16);
    // Fachada crema
    g.fillStyle(0xfff0d0, 1);
    g.fillRoundedRect(BUILD_LEFT, BUILD_TOP, BUILD_RIGHT - BUILD_LEFT, BUILD_BOTTOM - BUILD_TOP, 16);
    // Pared lateral derecha (efecto 3D) y zócalo
    g.fillStyle(0xe8cfa0, 1);
    g.fillRect(BUILD_RIGHT - 13, BUILD_TOP + 8, 13, BUILD_BOTTOM - BUILD_TOP - 8);
    g.fillStyle(0xf5d9a8, 1);
    g.fillRect(BUILD_LEFT, BUILD_BOTTOM - 14, BUILD_RIGHT - BUILD_LEFT, 14);
    // Techo con franja rosa
    g.fillStyle(0xf9a8d4, 1);
    g.fillRoundedRect(BUILD_LEFT - 2, BUILD_TOP - 10, BUILD_RIGHT - BUILD_LEFT + 4, 16, 8);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(BUILD_LEFT + 4, BUILD_TOP - 8, BUILD_RIGHT - BUILD_LEFT - 8, 4);

    // Torre de cristal del ascensor
    g.fillStyle(0xbfe8ff, 0.45);
    g.fillRect(SHAFT_LEFT, BUILD_TOP + 6, SHAFT_RIGHT - SHAFT_LEFT, BUILD_BOTTOM - BUILD_TOP - 6);
    g.lineStyle(3, 0xffffff, 0.75);
    for (let f = 1; f <= N; f++) {
      g.lineBetween(SHAFT_LEFT, this.bandBottom(f), SHAFT_RIGHT, this.bandBottom(f));
    }
    g.lineBetween(CAB_X, BUILD_TOP + 6, CAB_X, BUILD_BOTTOM);
    g.lineStyle(4, 0x8a7a5a, 1);
    g.strokeRect(SHAFT_LEFT, BUILD_TOP + 6, SHAFT_RIGHT - SHAFT_LEFT, BUILD_BOTTOM - BUILD_TOP - 6);
    g.fillStyle(0x8a7a5a, 1);
    g.fillRoundedRect(SHAFT_LEFT - 6, BUILD_TOP - 2, SHAFT_RIGHT - SHAFT_LEFT + 12, 12, 5);
    // Nube dentro de la torre
    const shaftCloud = this.add.image(CAB_X, BUILD_TOP + 40, 'cloud').setScale(0.5).setAlpha(0.9);
    this.tweens.add({ targets: shaftCloud, y: BUILD_TOP + 48, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Bandas de pisos: barandillas de colores, ventanas y banners
    for (let f = 1; f <= N; f++) {
      const top = this.bandBottom(f) - fh;
      const color = floorColor(f);
      g.fillStyle(0xffffff, 0.25);
      g.fillRect(BUILD_LEFT + 8, top, BUILD_RIGHT - BUILD_LEFT - 16, fh);
      g.fillStyle(0xf5d9a8, 1);
      g.fillRect(BUILD_LEFT + 8, top, BUILD_RIGHT - BUILD_LEFT - 16, 5);

      this.drawWindow(g, BUILD_LEFT + 30, top + fh * 0.22, (f * 3) % 4 === 0);
      this.drawWindow(g, BUILD_RIGHT - 74, top + fh * 0.22, (f * 3 + 1) % 4 === 0);
      this.drawRailing(g, BUILD_LEFT + 24, top + fh * 0.68, 96, color);
      this.drawRailing(g, BUILD_RIGHT - 94, top + fh * 0.68, 70, color);

      // Marco de puerta del piso en la torre
      g.fillStyle(0xffffff, 0.85);
      g.fillRoundedRect(SHAFT_LEFT - 4, top + 6, SHAFT_RIGHT - SHAFT_LEFT + 8, fh - 10, 6);
      // Banner con el número del piso colgado de la ventana
      this.drawBanner(g, BUILD_LEFT + 32, top + fh * 0.22 - 2, f, color);
    }
    // Ventanas redondas en el piso superior
    this.drawRoundWindow(g, BUILD_LEFT + 48, BUILD_TOP + 26);
    this.drawRoundWindow(g, BUILD_RIGHT - 48, BUILD_TOP + 26);
    // Nubecita asomada en una barandilla
    const midFloor = Math.max(1, Math.floor(N / 2));
    const peek = this.add.image(BUILD_LEFT + 72, this.bandBottom(midFloor) - fh * 0.68 - 4, 'cloud').setScale(0.42);
    this.tweens.add({ targets: peek, y: peek.y - 5, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Lobby: ventanales con vista al exterior ──
    const glassY = LOBBY_TOP + 8;
    const glassH = BUILD_BOTTOM - LOBBY_TOP - 16;
    g.fillStyle(0xbfe8ff, 0.85);
    g.fillRoundedRect(BUILD_LEFT + 8, glassY, BUILD_RIGHT - BUILD_LEFT - 16, glassH, 8);
    // Vista exterior: suelo verde, árboles y casitas
    g.fillStyle(0x9fe8b0, 1);
    g.fillRect(BUILD_LEFT + 8, glassY + glassH - 26, BUILD_RIGHT - BUILD_LEFT - 16, 26);
    const trees: Array<[number, number]> = [[70, glassY + glassH - 40], [150, glassY + glassH - 34], [300, glassY + glassH - 38]];
    for (const [tx, ty] of trees) {
      g.fillStyle(0x7c4f24, 1);
      g.fillRect(tx - 3, ty, 6, 16);
      g.fillStyle(0x4ade80, 1);
      g.fillCircle(tx, ty - 8, 12);
      g.fillCircle(tx - 9, ty - 2, 8);
      g.fillCircle(tx + 9, ty - 2, 8);
    }
    const houses: Array<[number, number, number]> = [[110, glassY + glassH - 30, 0xfbcfe8], [240, glassY + glassH - 26, 0xbfdbfe], [330, glassY + glassH - 30, 0xfde68a]];
    for (const [hx, hy, hc] of houses) {
      g.fillStyle(hc, 1);
      g.fillRoundedRect(hx, hy, 34, 26, 4);
      g.fillTriangle(hx - 3, hy, hx + 37, hy, hx + 17, hy - 14);
    }
    // Marcos de los ventanales
    g.lineStyle(4, 0xffffff, 0.95);
    g.strokeRoundedRect(BUILD_LEFT + 8, glassY, BUILD_RIGHT - BUILD_LEFT - 16, glassH, 8);
    g.lineStyle(3, 0xffffff, 0.8);
    for (let i = 1; i < 4; i++) {
      const vx = BUILD_LEFT + 8 + ((BUILD_RIGHT - BUILD_LEFT - 16) / 4) * i;
      g.lineBetween(vx, glassY, vx, glassY + glassH);
    }
    g.lineBetween(BUILD_LEFT + 8, glassY + glassH / 2, BUILD_RIGHT - 8, glassY + glassH / 2);
    // Suelo de baldosas del lobby
    g.fillStyle(carpet, 1);
    g.fillRect(BUILD_LEFT + 8, BUILD_BOTTOM - 14, BUILD_RIGHT - BUILD_LEFT - 16, 14);
    // Bancos del lobby a ambos lados de la torre
    this.drawBench(g, BUILD_LEFT + 12, BUILD_BOTTOM - 44, 88);
    this.drawBench(g, BUILD_RIGHT - 82, BUILD_BOTTOM - 44, 70);

    // ── Recepción (fuera del edificio, a la derecha) ──
    const deskX = 404, deskY = 692;
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(deskX + 3, deskY + 8, 112, 64, 8);
    g.fillStyle(0x7c4f24, 1);
    g.fillRoundedRect(deskX, deskY + 8, 112, 56, 8);
    g.fillStyle(0xa06a35, 1);
    g.fillRoundedRect(deskX - 4, deskY, 120, 14, 6);
    // Planta y monitor sobre el mostrador
    g.fillStyle(0xe07b2a, 1);
    g.fillRoundedRect(deskX + 8, deskY - 14, 14, 14, 3);
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(deskX + 15, deskY - 20, 8);
    g.fillStyle(0x241640, 1);
    g.fillRoundedRect(deskX + 88, deskY - 20, 20, 16, 3);
    g.fillStyle(0x9fd8ff, 1);
    g.fillRect(deskX + 91, deskY - 17, 14, 10);
    // Cartel de recepción
    g.fillStyle(0xa06a35, 1);
    g.fillRoundedRect(deskX + 6, deskY - 58, 100, 24, 8);
    g.lineStyle(2, 0x7c4f24, 1);
    g.strokeRoundedRect(deskX + 6, deskY - 58, 100, 24, 8);
    makeText(this, deskX + 56, deskY - 46, 'RECEPCIÓN', 13, '#ffffff');
    // Recepcionista (Moco) saludando tras el mostrador
    const receptionist = this.add.image(deskX + 56, deskY - 26, 'monster-moco').setScale(0.5);
    this.tweens.add({ targets: receptionist, y: deskY - 32, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Zona de cola: suelo de baldosas con bancos y flores ──
    g.fillStyle(0xfff3d6, 1);
    g.fillRoundedRect(8, 786, W - 16, 164, 16);
    g.lineStyle(2, 0xe8cfa0, 1);
    for (let tx = 62; tx < W - 8; tx += 54) {
      g.lineBetween(tx, 786, tx, 950);
    }
    for (let ty = 822; ty < 950; ty += 36) {
      g.lineBetween(8, ty, W - 8, ty);
    }
    this.drawBench(g, 18, 896, 100);
    this.drawBench(g, W - 118, 896, 100);
    const flowerColors = [0xf472b6, 0xffc93c, 0xffffff, 0xf87171, 0xc084fc];
    for (let i = 0; i < 8; i++) {
      const fx = 140 + i * 36;
      const fy = 936 + (i % 2) * 8;
      this.drawFlower(g, fx, fy, flowerColors[i % flowerColors.length]);
    }
  }

  private drawWindow(g: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean): void {
    const w = 44, h = 38;
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 6);
    if (lit) {
      g.fillGradientStyle(0xffe08a, 0xffe08a, 0xf5a623, 0xf5a623, 1);
    } else {
      g.fillGradientStyle(0xbfe8ff, 0xbfe8ff, 0x7cc4f0, 0x7cc4f0, 1);
    }
    g.fillRoundedRect(x, y, w, h, 4);
    g.fillStyle(0xffffff, 0.4);
    g.fillTriangle(x + 6, y + h, x + 16, y, x + 26, y);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(x + w / 2 - 1, y, 2, h);
  }

  private drawRoundWindow(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x, y, 20);
    g.fillStyle(0xbfe8ff, 1);
    g.fillCircle(x, y, 15);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(x - 5, y - 5, 5);
    g.lineStyle(2, 0xa06a35, 0.7);
    g.lineBetween(x - 15, y, x + 15, y);
    g.lineBetween(x, y - 15, x, y + 15);
  }

  private drawRailing(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, color: number): void {
    const h = 24;
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, w, 5, 2);
    g.fillRoundedRect(x, y + h - 5, w, 5, 2);
    const bars = Math.floor(w / 14);
    for (let i = 0; i <= bars; i++) {
      g.fillRect(x + 3 + i * 13, y + 4, 4, h - 8);
    }
  }

  /** Bandera colgante con el número del piso. */
  private drawBanner(g: Phaser.GameObjects.Graphics, x: number, y: number, f: number, color: number): void {
    const w = 26, h = 42;
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(x + 2, y + 3, w, h, 4);
    g.fillStyle(color, 1);
    g.fillPoints([
      new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2(x + w, y),
      new Phaser.Math.Vector2(x + w, y + h), new Phaser.Math.Vector2(x + w / 2, y + h - 10),
      new Phaser.Math.Vector2(x, y + h),
    ], true);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokePoints([
      new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2(x + w, y),
      new Phaser.Math.Vector2(x + w, y + h), new Phaser.Math.Vector2(x + w / 2, y + h - 10),
      new Phaser.Math.Vector2(x, y + h),
    ], true);
    makeText(this, x + w / 2, y + h / 2 - 3, `${f}`, 17, '#ffffff').setShadow(0, 2, 'rgba(0,0,0,0.3)', 2, true, true);
  }

  private drawBench(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number): void {
    g.fillStyle(0xa06a35, 1);
    g.fillRoundedRect(x, y, w, 10, 4);
    g.fillRoundedRect(x, y + 16, w, 10, 4);
    g.fillStyle(0x7c4f24, 1);
    g.fillRect(x + 8, y + 26, 8, 18);
    g.fillRect(x + w - 16, y + 26, 8, 18);
  }

  private drawFlower(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    g.fillStyle(color, 1);
    g.fillCircle(x, y - 5, 4);
    g.fillCircle(x - 5, y, 4);
    g.fillCircle(x + 5, y, 4);
    g.fillCircle(x, y + 5, 4);
    g.fillStyle(0xffc93c, 1);
    g.fillCircle(x, y, 3);
  }

  private drawHud(): void {
    // Botón de pausa morado con borde de madera
    const pg = this.add.graphics();
    pg.fillStyle(0x7c4f24, 1);
    pg.fillRoundedRect(8, 8, 62, 54, 14);
    pg.fillStyle(0xb79ced, 1);
    pg.fillRoundedRect(12, 12, 54, 46, 11);
    pg.fillStyle(0xffffff, 1);
    pg.fillRect(28, 26, 6, 18);
    pg.fillRect(38, 26, 6, 18);
    const pauseZone = this.add.zone(39, 35, 62, 54).setInteractive({ useHandCursor: true });
    pauseZone.on('pointerdown', () => {
      audio.click();
      this.openPause();
    });

    // Cartel de madera del nivel
    makeWoodSign(this, W / 2, 44, 330, 74);
    makeText(this, W / 2, 22, `Nivel ${this.level.id} · ${this.level.title}`, 19, '#ffffff').setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);
    this.progressText = makeText(this, W / 2, 46, '', 14, '#ffe8c2', false);
    this.distText = makeText(this, W / 2, 66, '', 14, '#ffffff', false);

    // Placa de paciencia con estrellas (arriba a la derecha)
    const sg = this.add.graphics();
    sg.fillStyle(0x7c4f24, 1);
    sg.fillRoundedRect(W - 118, 8, 110, 54, 12);
    sg.fillStyle(0xfff3d6, 1);
    sg.fillRoundedRect(W - 114, 12, 102, 46, 10);
    makeText(this, W - 63, 22, 'PACIENCIA', 10, '#a06a35', false);
    this.patienceStars = [];
    for (let i = 0; i < MAX_MISTAKES; i++) {
      const s = this.add.image(W - 96 + i * 34, 44, 'star').setScale(0.5);
      this.patienceStars.push(s);
    }
  }

  private refreshPatience(): void {
    this.patienceStars.forEach((s, i) => {
      s.setTint(i < this.mistakes ? 0xb8a888 : 0xffffff);
    });
  }

  private drawFloorPanel(): void {
    const N = this.level.floors;
    // Panel crema con borde de madera
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(396, 110, 128, 470, 16);
    g.fillStyle(0xfff3d6, 1);
    g.fillRoundedRect(392, 104, 128, 470, 16);
    g.lineStyle(5, 0xa06a35, 1);
    g.strokeRoundedRect(392, 104, 128, 470, 16);
    makeText(this, 456, 122, 'ASCENSOR', 15, '#a06a35');
    this.panelFloorText = makeText(this, 456, 142, 'Piso: R', 14, '#e07b2a', false);

    const floors: number[] = [];
    for (let f = N; f >= 1; f--) floors.push(f);
    floors.push(0);
    floors.forEach((f, i) => {
      const x = 456;
      const y = 176 + i * 56;
      const w = 104, h = 46;
      const bg = this.add.graphics();
      const badgeBg = this.add.graphics();
      const badge = makeText(this, x + w / 2 - 12, y - h / 2 + 10, '', 13, '#6b4423');
      const label = makeText(this, x, y, f === 0 ? 'R' : `${f}`, 24, '#ffffff');
      this.floorButtons.set(f, { g: bg, badge, badgeBg, label });
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.tweens.add({ targets: bg, scale: 0.92, duration: 60, yoyo: true });
        this.onFloorButton(f);
      });
    });
  }

  private createCab(): void {
    this.cab = this.add.container(CAB_X, this.cabY(0));

    // Sombra bajo la cabina
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.15);
    shadow.fillEllipse(0, CAB_H / 2 + 2, CAB_W - 20, 14);
    this.cab.add(shadow);

    // Cuerpo de cristal (cápsula casi transparente)
    const body = this.add.graphics();
    body.fillStyle(0xbfe8ff, 0.32);
    body.fillRoundedRect(-CAB_W / 2, -CAB_H / 2, CAB_W, CAB_H, 26);
    body.lineStyle(3, 0xffffff, 0.9);
    body.strokeRoundedRect(-CAB_W / 2, -CAB_H / 2, CAB_W, CAB_H, 26);
    body.fillStyle(0xffffff, 0.35);
    body.fillEllipse(-CAB_W / 2 + 34, -CAB_H / 2 + 22, 26, 44);
    this.cab.add(body);

    // Puertas de cristal correderas
    const drawDoor = (side: number): Phaser.GameObjects.Graphics => {
      const d = this.add.graphics();
      d.fillStyle(0xdff4ff, 0.45);
      d.fillRoundedRect(side * (CAB_W / 4) - CAB_W / 4, -CAB_H / 2, CAB_W / 2, CAB_H, 10);
      d.lineStyle(3, 0xffffff, 0.95);
      d.strokeRoundedRect(side * (CAB_W / 4) - CAB_W / 4, -CAB_H / 2, CAB_W / 2, CAB_H, 10);
      d.fillStyle(0xffffff, 0.4);
      d.fillEllipse(side * (CAB_W / 4) - 14, -CAB_H / 2 + 24, 12, 26);
      return d;
    };
    this.doorL = drawDoor(-1);
    this.doorR = drawDoor(1);
    this.cab.add([this.doorL, this.doorR]);

    // Base naranja con rejillas + parte inferior morada
    const base = this.add.graphics();
    base.fillStyle(0xffa94d, 1);
    base.fillRoundedRect(-CAB_W / 2, CAB_H / 2 - 24, CAB_W, 24, 10);
    base.lineStyle(3, 0xffffff, 0.9);
    base.strokeRoundedRect(-CAB_W / 2, CAB_H / 2 - 24, CAB_W, 24, 10);
    base.lineStyle(3, 0x7c4f24, 0.7);
    for (let i = 0; i < 3; i++) {
      base.lineBetween(-30 + i * 30, CAB_H / 2 - 16, -14 + i * 30, CAB_H / 2 - 16);
      base.lineBetween(-30 + i * 30, CAB_H / 2 - 9, -14 + i * 30, CAB_H / 2 - 9);
    }
    base.fillStyle(0xb79ced, 1);
    base.fillTriangle(-CAB_W / 2 + 14, CAB_H / 2, CAB_W / 2 - 14, CAB_H / 2, 0, CAB_H / 2 + 16);
    this.cab.add(base);

    // Tapa superior naranja + gancho del cable
    const cap = this.add.graphics();
    cap.fillStyle(0xffa94d, 1);
    cap.fillEllipse(0, -CAB_H / 2, 52, 18);
    cap.lineStyle(3, 0xffffff, 0.9);
    cap.strokeEllipse(0, -CAB_H / 2, 52, 18);
    cap.lineStyle(4, 0x7c4f24, 1);
    cap.strokeCircle(0, -CAB_H / 2 - 8, 6);
    this.cab.add(cap);

    // Indicador del piso (placa crema)
    this.indicatorBg = this.add.graphics();
    this.indicatorBg.fillStyle(0xfff3d6, 1);
    this.indicatorBg.fillRoundedRect(-24, -CAB_H / 2 - 30, 48, 24, 8);
    this.indicatorBg.lineStyle(3, 0xa06a35, 1);
    this.indicatorBg.strokeRoundedRect(-24, -CAB_H / 2 - 30, 48, 24, 8);
    this.cab.add(this.indicatorBg);
    this.indicator = makeText(this, 0, -CAB_H / 2 - 18, 'R', 16, '#a06a35');
    this.cab.add(this.indicator);
    this.setDoors(true, true);

    this.cable = this.add.graphics().setDepth(1);
  }

  private setDoors(open: boolean, instant = false): void {
    this.doorsOpen = open;
    const off = open ? CAB_W / 2 + 10 : 0;
    const dur = instant ? 0 : 220;
    this.tweens.add({ targets: this.doorL, x: -off, duration: dur, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.doorR, x: off, duration: dur, ease: 'Quad.easeOut' });
    if (!instant) {
      if (open) audio.doorOpen(); else audio.doorClose();
    }
  }

  // ── Pasajeros ────────────────────────────────────────────────────────────
  private createPassengers(): void {
    // Los gemelos se fusionan en un solo pasajero-grupo (suben juntos).
    const groups: Array<{ monsterId: string; dest: number; slots: number }> = [];
    const twinDest = this.level.passengers.filter((p) => p.m === TWIN_GROUP);
    for (const p of this.level.passengers) {
      if (p.m === TWIN_GROUP) continue;
      const def = MONSTER_MAP[p.m];
      groups.push({ monsterId: p.m, dest: p.d, slots: def.slots });
    }
    if (twinDest.length > 0) {
      const def = MONSTER_MAP[TWIN_GROUP];
      groups.push({ monsterId: TWIN_GROUP, dest: twinDest[0].d, slots: def.slots * twinDest.length });
    }

    groups.forEach((grp, i) => {
      const def = MONSTER_MAP[grp.monsterId];
      const container = this.add.container(0, 0).setDepth(10);
      const shadow = this.add.image(0, 28, 'shadow').setScale(0.9);
      const image = this.add
        .image(0, 0, `monster-${grp.monsterId}`)
        .setScale(this.queueScale({ def } as Passenger))
        .setInteractive({ useHandCursor: true });
      if (def.rule === 'ghost') image.setAlpha(0.9);
      container.add([shadow, image]);

      // Insignia de destino con el color del piso
      const badge = this.add.container(0, -38);
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(floorColor(grp.dest), 1);
      badgeBg.fillCircle(0, 0, 14);
      badgeBg.lineStyle(3, 0xffffff, 1);
      badgeBg.strokeCircle(0, 0, 14);
      const badgeText = makeText(this, 0, 0, `${grp.dest}`, 17, '#ffffff');
      badgeText.setShadow(0, 2, 'rgba(0,0,0,0.3)', 2, true, true);
      badge.add([badgeBg, badgeText]);
      container.add(badge);

      const pax: Passenger = {
        id: i, monsterId: grp.monsterId, def, dest: grp.dest, slots: grp.slots,
        state: 'queue', asleep: false, mood: 'happy', container, image, badge,
      };
      image.on('pointerdown', () => this.onPassengerTap(pax));
      this.passengers.push(pax);
    });
  }

  private setMood(p: Passenger, mood: Mood): void {
    p.mood = mood;
    p.image.setTexture(mood === 'happy' ? `monster-${p.monsterId}` : `monster-${p.monsterId}-${mood}`);
  }

  private queuePositions(): Array<{ x: number; y: number }> {
    const waiting = this.passengers.filter((p) => p.state === 'queue');
    const n = waiting.length;
    const rows = n <= 5 ? 1 : 2;
    const perRow = rows === 1 ? n : Math.ceil(n / 2);
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const row = rows === 1 ? 0 : Math.floor(i / perRow);
      const idxInRow = rows === 1 ? i : i % perRow;
      const countInRow = rows === 1 ? n : Math.min(perRow, n - row * perRow);
      const x = W / 2 + (idxInRow - (countInRow - 1) / 2) * 64;
      const y = rows === 1 ? 892 : 858 + row * 64;
      positions.push({ x, y });
    }
    return positions;
  }

  private layoutQueue(instant = false): void {
    const waiting = this.passengers.filter((p) => p.state === 'queue');
    const positions = this.queuePositions();
    waiting.forEach((p, i) => {
      const pos = positions[i];
      if (!pos) return;
      p.bobTween?.stop();
      if (instant) {
        p.container.setPosition(pos.x, pos.y);
      } else {
        this.tweens.add({ targets: p.container, x: pos.x, y: pos.y, duration: 300, ease: 'Quad.easeOut' });
      }
      p.bobTween = this.tweens.add({
        targets: p.image, y: -4, duration: 700 + Math.random() * 500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 400,
      });
    });
  }

  private slotPosition(index: number): { x: number; y: number } {
    const cap = this.level.capacity;
    const slotsX: Record<number, number[]> = {
      3: [-46, 0, 46],
      4: [-54, -18, 18, 54],
    };
    const xs = slotsX[cap] ?? [-46, 0, 46];
    return { x: xs[Math.min(index, xs.length - 1)], y: 14 };
  }

  // ── Interacción ──────────────────────────────────────────────────────────
  private onPassengerTap(p: Passenger): void {
    if (this.won || this.paused || this.moving) return;
    audio.ensure();

    if (p.state === 'queue') {
      if (this.elevatorFloor !== 0) {
        audio.error();
        this.showBubble('¡Primero vuelve a recepción!', CAB_X, 640);
        return;
      }
      if (!this.doorsOpen) return;
      const onboard = this.onboard();
      if (p.def.rule === 'shy' && onboard.length > 0) {
        audio.error();
        this.showBubble('Sombrín quiere viajar solo', CAB_X, 640);
        return;
      }
      if (onboard.some((o) => o.def.rule === 'shy')) {
        audio.error();
        this.showBubble('Sombrín quiere viajar solo', CAB_X, 640);
        return;
      }
      if (this.usedSlots() + p.slots > this.level.capacity) {
        audio.error();
        this.showBubble('¡Ascensor lleno!', CAB_X, 640);
        return;
      }
      this.board(p);
    } else if (p.state === 'onboard') {
      if (p.asleep) {
        this.wakeUp(p);
        return;
      }
      if (this.elevatorFloor !== 0 || !this.doorsOpen) return;
      this.leaveToQueue(p);
    }
  }

  /** Salto con arco hacia la cabina + squash al aterrizar. */
  private board(p: Passenger): void {
    p.state = 'boarding';
    p.bobTween?.stop();
    this.setMood(p, 'happy');
    audio.select();
    const idx = this.onboard().length;
    const slot = this.slotPosition(idx);
    const targetX = this.cab.x + slot.x;
    const targetY = this.cab.y + (p.def.rule === 'ghost' ? -22 : slot.y);
    const midY = Math.min(p.container.y, targetY) - 52;
    this.tweens.add({ targets: p.image, scale: this.cabScale(p), duration: 420 });
    this.tweens.add({ targets: p.container, x: targetX, duration: 420, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: p.container, y: midY, duration: 200, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: p.container, y: targetY, duration: 230, ease: 'Quad.easeIn', delay: 200,
      onComplete: () => {
        p.state = 'onboard';
        this.tweens.add({ targets: p.container, scaleY: 0.8, scaleX: 1.15, duration: 90, yoyo: true });
        this.refreshHud();
        this.refreshFloorButtons();
        this.updateHint();
      },
    });
    this.layoutQueue();
  }

  private leaveToQueue(p: Passenger): void {
    p.state = 'queue';
    audio.deselect();
    p.container.setDepth(10);
    p.badge.setScale(1);
    this.tweens.add({ targets: p.image, scale: this.queueScale(p), duration: 250 });
    this.layoutQueue();
    this.refreshHud();
    this.refreshFloorButtons();
    this.updateHint();
  }

  private onFloorButton(f: number): void {
    if (this.won || this.paused || this.moving) return;
    audio.ensure();
    if (f === this.elevatorFloor) return;
    const onboard = this.onboard();
    if (onboard.length === 0 && f !== 0) {
      audio.error();
      this.showBubble('¡Sube monstruos primero!', CAB_X, 640);
      return;
    }
    this.travelTo(f);
  }

  private travelTo(f: number): void {
    this.moving = true;
    this.setDoors(false);
    this.distance += Math.abs(f - this.elevatorFloor);
    this.refreshHud();
    audio.moveStart();
    const targetY = this.cabY(f);
    const dist = Math.abs(f - this.elevatorFloor);
    this.time.delayedCall(240, () => {
      this.tweens.add({
        targets: this.cab, y: targetY, duration: 380 * dist, ease: 'Quad.easeInOut',
        onUpdate: () => {
          this.cab.setX(CAB_X + Math.sin(this.cab.y / 18) * 1.4);
          let nearest = 0;
          let best = Infinity;
          for (let fl = 0; fl <= this.level.floors; fl++) {
            const d = Math.abs(this.cabY(fl) - this.cab.y);
            if (d < best) { best = d; nearest = fl; }
          }
          this.indicator.setText(nearest === 0 ? 'R' : `${nearest}`);
        },
        onComplete: () => {
          this.cab.setX(CAB_X);
          this.arrive(f);
        },
      });
    });
  }

  private arrive(f: number): void {
    this.elevatorFloor = f;
    this.indicator.setText(f === 0 ? 'R' : `${f}`);
    this.panelFloorText.setText(f === 0 ? 'Piso: R' : `Piso: ${f}`);
    this.setDoors(true);
    audio.ding();
    this.moving = false;
    this.refreshFloorButtons();

    if (f === 0) {
      if (this.grumpyReturn) {
        this.grumpyReturn = false;
        this.grumpyExit();
      }
      this.updateHint();
      return;
    }

    const arriving = this.onboard().filter((p) => p.dest === f);
    const sleepers = arriving.filter((p) => p.def.rule === 'sleepwalker');
    const exiters = arriving.filter((p) => p.def.rule !== 'sleepwalker');

    if (sleepers.length > 0) {
      sleepers.forEach((p) => {
        p.asleep = true;
        this.showBubble('¡Nocti se durmió! Tócalo para despertarlo', CAB_X, this.cab.y - 90, 2600);
      });
    }

    if (exiters.length === 0 && sleepers.length === 0) {
      this.wrongFloor();
      return;
    }

    exiters.forEach((p, i) => {
      this.time.delayedCall(i * 220, () => this.exitPassenger(p));
    });
    this.updateHint();
  }

  /**
   * Piso equivocado con drama: viñeta roja, texto gigante, sacudida,
   * ánimos que empeoran (neutral → enojado) y, al tercer error, los
   * monstruos vuelven molestos a recepción.
   */
  private wrongFloor(): void {
    this.mistakes++;
    audio.wrong();
    if (this.save.settings.vibration) vibrate([60, 40, 60]);
    this.cameras.main.shake(220, 0.006);
    this.flashVignette();
    this.showWrongText();

    const mood = moodForMistakes(this.mistakes);
    this.onboard().forEach((p) => {
      this.setMood(p, mood);
      this.tweens.add({ targets: p.image, x: 5, duration: 60, yoyo: true, repeat: 5 });
    });
    this.refreshHud();

    if (this.mistakes >= MAX_MISTAKES) {
      this.grumpyReturn = true;
      this.showBubble('¡Los monstruos están muy molestos! Vuelven a recepción…', CAB_X, this.cab.y - 90, 2400);
      audio.grumpy();
      this.time.delayedCall(1400, () => {
        if (!this.moving && this.elevatorFloor !== 0) this.travelTo(0);
      });
    }
    this.updateHint();
  }

  /** Los monstruos molestos se bajan en recepción y vuelven a la cola. */
  private grumpyExit(): void {
    audio.grumpy();
    this.showBubble('¡Se bajaron molestos! Sube a otros monstruos.', CAB_X, 640, 2200);
    this.onboard().slice().forEach((p, i) => {
      this.time.delayedCall(i * 260, () => {
        this.leaveToQueue(p);
        this.time.delayedCall(1200, () => this.setMood(p, 'happy'));
      });
    });
    this.mistakes = 0;
    this.refreshHud();
  }

  private exitPassenger(p: Passenger): void {
    p.state = 'exiting';
    p.asleep = false;
    audio.happy();
    p.container.setDepth(20);
    p.badge.setVisible(false);
    const exitX = BUILD_RIGHT - 58;
    const exitY = this.bandBottom(this.elevatorFloor) - 28;
    this.tweens.add({ targets: p.container, angle: 7, duration: 110, yoyo: true, repeat: 4 });
    this.tweens.add({ targets: p.container, scaleY: 0.9, duration: 110, yoyo: true, repeat: 4 });
    this.tweens.add({
      targets: p.container, x: exitX, y: exitY, duration: 620, ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: p.container, angle: 0, scaleY: 1, duration: 100 });
        this.tweens.add({
          targets: p.container, y: exitY - 20, duration: 170, yoyo: true, repeat: 1,
          onComplete: () => {
            this.spawnHearts(exitX, exitY - 32);
            this.tweens.add({
              targets: p.container, alpha: 0, duration: 300,
              onComplete: () => p.container.destroy(),
            });
          },
        });
      },
    });
    this.delivered++;
    this.mistakes = 0;
    this.onboard().forEach((o) => this.setMood(o, 'happy'));
    this.refreshHud();
    this.refreshFloorButtons();

    this.time.delayedCall(700, () => {
      if (this.won) return;
      if (this.delivered >= this.passengers.length) {
        this.win();
        return;
      }
      if (this.onboard().length === 0 && this.elevatorFloor !== 0 && !this.moving) {
        this.showBubble('¡De vuelta a recepción!', CAB_X, this.cab.y - 90, 1400);
        this.travelTo(0);
      }
      this.updateHint();
    });
  }

  private wakeUp(p: Passenger): void {
    p.asleep = false;
    audio.wake();
    this.showBubble('¡Despierto!', CAB_X, this.cab.y - 90, 1200);
    this.tweens.add({ targets: p.image, scale: this.cabScale(p) * 1.2, duration: 150, yoyo: true });
    this.time.delayedCall(350, () => {
      if (p.state === 'onboard' && p.dest === this.elevatorFloor) this.exitPassenger(p);
    });
  }

  private spawnHearts(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const h = this.add.image(x + (Math.random() - 0.5) * 30, y, 'heart')
        .setScale(0.5).setDepth(30);
      this.tweens.add({
        targets: h, y: y - 40 - Math.random() * 20, alpha: 0,
        duration: 700, ease: 'Quad.easeOut', onComplete: () => h.destroy(),
      });
    }
  }

  // ── HUD / pistas / burbujas / efectos ────────────────────────────────────
  private refreshHud(): void {
    const { three } = starThresholds(this.optimal);
    this.distText.setText(`Distancia ${this.distance} · Óptima ${this.optimal} · Meta ★★★ ≤ ${three}`);
    this.progressText.setText(`Entregados ${this.delivered}/${this.passengers.length} · Ascensor ${this.usedSlots()}/${this.level.capacity}`);
    this.refreshPatience();
  }

  private refreshFloorButtons(): void {
    const onboard = this.onboard();
    this.floorButtons.forEach((btn, f) => {
      const count = onboard.filter((p) => p.dest === f).length;
      const isCurrent = f === this.elevatorFloor;
      const x = 456;
      const y = 176 + this.floorIndex(f) * 56;
      const w = 104, h = 46;
      btn.g.clear();
      btn.g.fillStyle(0x000000, 0.12);
      btn.g.fillRoundedRect(x - w / 2, y - h / 2 + 3, w, h, 12);
      if (f === 0) {
        btn.g.fillStyle(0x4ade80, 1); // Recepción: verde con R (sin check)
      } else if (count > 0) {
        btn.g.fillStyle(floorColor(f), 1);
      } else if (isCurrent) {
        btn.g.fillStyle(0x4ade80, 1);
      } else {
        btn.g.fillStyle(0xeef7f2, 1);
      }
      btn.g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      btn.g.fillStyle(0xffffff, 0.25);
      btn.g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 2, w - 6, h * 0.36, 8);
      btn.g.lineStyle(isCurrent ? 4 : 3, isCurrent ? 0x2f9e44 : 0xa06a35, isCurrent ? 1 : 0.55);
      btn.g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      // Número: blanco sobre color, color del piso sobre fondo claro
      const colored = f === 0 || count > 0 || isCurrent;
      btn.label.setColor(colored ? '#ffffff' : Phaser.Display.Color.IntegerToColor(floorColor(f)).rgba);
      btn.label.setShadow(0, 2, 'rgba(0,0,0,0.25)', 2, true, true);
      btn.badgeBg.clear();
      if (count > 0) {
        btn.badgeBg.fillStyle(0xffffff, 1);
        btn.badgeBg.fillCircle(0, 0, 11);
      }
      btn.badgeBg.setPosition(x + w / 2 - 12, y - h / 2 + 10);
      btn.badge.setPosition(x + w / 2 - 12, y - h / 2 + 10);
      btn.badge.setText(count > 0 ? `${count}` : '');
    });
  }

  private floorIndex(f: number): number {
    const floors: number[] = [];
    for (let x = this.level.floors; x >= 1; x--) floors.push(x);
    floors.push(0);
    return floors.indexOf(f);
  }

  /** Pistas contextuales en bocadillo de estrella sobre la cola. */
  private updateHint(): void {
    if (this.won) return;
    const queueCount = this.passengers.filter((p) => p.state === 'queue').length;
    if (this.level.id === 1) {
      if (this.onboard().length === 0 && this.elevatorFloor === 0 && this.delivered === 0) {
        this.showBubble('¡Púlsalos para que entren!', 270, 802, 5000);
      } else if (this.onboard().length > 0 && this.elevatorFloor === 0) {
        this.showBubble('¡Ahora toca el piso del globo!', 270, 802, 4000);
      } else if (this.elevatorFloor !== 0 && this.onboard().length > 0) {
        this.showBubble('¡Buen viaje!', 270, 802, 3000);
      } else if (this.delivered > 0 && this.onboard().length === 0 && this.elevatorFloor === 0) {
        this.showBubble('¡Bien! Sube a los demás', 270, 802, 4000);
      }
      return;
    }
    if (this.elevatorFloor !== 0 && this.onboard().length === 0 && queueCount > 0) {
      this.showBubble('¡Vuelve a recepción!', 270, 802, 3000);
    } else if (this.elevatorFloor === 0 && queueCount > 0 && this.onboard().length === 0) {
      this.showBubble('¡Púlsalos para que entren!', 270, 802, 4000);
    } else if (this.onboard().length > 0) {
      this.showBubble('¡Toca el piso de los globos!', 270, 802, 3000);
    }
  }

  /** Bocadillo de estrella (estilo cómic) para avisos y pistas. */
  private showBubble(text: string, x: number, y: number, duration = 1600): void {
    this.bubbleText.setText(text);
    const w = Math.min(340, this.bubbleText.width + 56);
    const h = 66;
    this.bubbleBg.clear();
    const spikes = 14;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 1 : 0.8;
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * (w / 2) * r, Math.sin(a) * (h / 2) * r));
    }
    this.bubbleBg.fillStyle(0xffffff, 0.97);
    this.bubbleBg.fillPoints(pts, true);
    this.bubbleBg.lineStyle(3, 0x6b4423, 1);
    this.bubbleBg.strokePoints(pts, true);
    this.bubble.setPosition(x, y).setDepth(60).setVisible(true).setAlpha(1).setScale(0.6);
    this.bubbleText.setPosition(0, 0);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.bubbleTimer?.remove();
    this.bubbleTimer = this.time.delayedCall(duration, () => {
      this.tweens.add({ targets: this.bubble, alpha: 0, duration: 250, onComplete: () => this.bubble.setVisible(false) });
    });
  }

  private createBubble(): void {
    this.bubbleBg = this.add.graphics();
    this.bubbleText = makeText(this, 0, 0, '', 17, '#6b4423', false);
    this.bubble = this.add.container(0, 0, [this.bubbleBg, this.bubbleText]).setVisible(false);
  }

  /** Viñeta roja en los bordes + texto gigante de piso equivocado. */
  private createFx(): void {
    this.vignette = this.add.graphics().setDepth(55).setVisible(false);
    const bw = 46;
    this.vignette.fillGradientStyle(0xef4444, 0xef4444, 0xef4444, 0xef4444, 0.55);
    this.vignette.fillRect(0, 0, W, bw);
    this.vignette.fillRect(0, H - bw, W, bw);
    this.vignette.fillRect(0, 0, bw, H);
    this.vignette.fillRect(W - bw, 0, bw, H);
    this.vignette.fillStyle(0xef4444, 0.14);
    this.vignette.fillRect(0, 0, W, H);

    const t = this.add.text(0, 0, '¡PISO EQUIVOCADO!', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '40px',
      color: '#ff3b30',
      stroke: '#ffffff',
      strokeThickness: 8,
      align: 'center',
    }).setOrigin(0.5);
    t.setShadow(0, 4, '#000000', 6, true, true);
    this.wrongText = this.add.container(W / 2, 430, [t]).setDepth(65).setVisible(false);
  }

  private flashVignette(): void {
    this.vignette.setVisible(true).setAlpha(0.4);
    this.tweens.add({
      targets: this.vignette, alpha: 1, duration: 180, yoyo: true, repeat: 2,
      onComplete: () => this.vignette.setVisible(false),
    });
  }

  private showWrongText(): void {
    this.wrongText.setVisible(true).setAlpha(1).setScale(0.5).setX(W / 2);
    this.tweens.add({ targets: this.wrongText, scale: 1.08, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.wrongText, x: W / 2 + 6, duration: 50, yoyo: true, repeat: 5 });
    this.time.delayedCall(1100, () => {
      this.tweens.add({ targets: this.wrongText, alpha: 0, duration: 300, onComplete: () => this.wrongText.setVisible(false) });
    });
  }

  private showSpecialTutorialIfNeeded(): void {
    const specials = this.passengers.filter((p) => p.def.rule !== 'none');
    for (const p of specials) {
      const key = `rule_${p.def.rule}`;
      if (!this.save.seenTutorials.includes(key)) {
        this.save.seenTutorials.push(key);
        writeSave(this.save);
        this.time.delayedCall(600, () => this.showRuleToast(p));
        return;
      }
    }
  }

  private showRuleToast(p: Passenger): void {
    const c = this.add.container(0, 0).setDepth(80);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 420, 320));
    const img = this.add.image(W / 2, H / 2 - 90, `monster-${p.monsterId}`).setScale(0.9);
    c.add(img);
    c.add(makeText(this, W / 2, H / 2 - 10, p.def.name, 26, '#a06a35'));
    const t = this.add.text(W / 2, H / 2 + 30, p.def.ruleText, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#6b4423',
      align: 'center', wordWrap: { width: 360 },
    }).setOrigin(0.5, 0);
    c.add(t);
    const btn = makeButton(this, W / 2, H / 2 + 120, 200, 54, '¡ENTENDIDO!', {
      fontSize: 20, onClick: () => c.destroy(),
    });
    c.add(btn);
  }

  // ── Pausa y victoria ─────────────────────────────────────────────────────
  private openPause(): void {
    if (this.paused || this.won) return;
    this.paused = true;
    const c = this.add.container(0, 0).setDepth(90);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 380, 380));
    c.add(makeText(this, W / 2, H / 2 - 140, 'PAUSA', 34, '#a06a35'));
    const resume = makeButton(this, W / 2, H / 2 - 60, 260, 58, 'CONTINUAR', {
      fontSize: 22, onClick: () => { this.paused = false; c.destroy(); },
    });
    const restart = makeButton(this, W / 2, H / 2 + 20, 260, 58, 'REINICIAR', {
      bg: COLORS.mintDark, fontSize: 22,
      onClick: () => { this.paused = false; this.scene.restart({ levelId: this.level.id }); },
    });
    const exit = makeButton(this, W / 2, H / 2 + 100, 260, 58, 'SALIR', {
      bg: COLORS.purple, fontSize: 22,
      onClick: () => { this.paused = false; this.scene.start('levels'); },
    });
    c.add([resume, restart, exit]);
  }

  private win(): void {
    if (this.won) return;
    this.won = true;
    audio.victory();
    const stars = starsFor(this.distance, this.optimal);
    const prevStars = this.save.stars[this.level.id] ?? 0;
    const earned = stars > prevStars ? coinsFor(stars) : 2;

    this.save.stars[this.level.id] = Math.max(prevStars, stars);
    this.save.coins += earned;
    this.save.unlockedLevel = Math.min(
      Math.max(this.save.unlockedLevel, this.level.id + 1),
      TOTAL_LEVELS
    );
    const newMonsters: string[] = [];
    for (const p of this.level.passengers) {
      if (!this.save.monstersUnlocked.includes(p.m)) {
        this.save.monstersUnlocked.push(p.m);
        newMonsters.push(p.m);
      }
    }
    writeSave(this.save);
    if (newMonsters.length > 0) audio.unlock();

    for (let i = 0; i < 24; i++) {
      const s = this.add.image(Math.random() * W, -20, 'sparkle')
        .setDepth(95).setScale(0.6 + Math.random());
      this.tweens.add({
        targets: s, y: H + 30, x: s.x + (Math.random() - 0.5) * 80,
        duration: 1400 + Math.random() * 1200, onComplete: () => s.destroy(),
      });
    }

    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 440, 520));
    c.add(makeText(this, W / 2, H / 2 - 210, '¡NIVEL COMPLETADO!', 30, '#a06a35'));

    const starsRow = makeStars(this, W / 2, H / 2 - 150, 0, 1.3);
    c.add(starsRow);
    starsRow.list.forEach((s, i) => {
      const img = s as Phaser.GameObjects.Image;
      img.setScale(0.01);
      this.time.delayedCall(400 + i * 350, () => {
        if (i < stars) audio.star(i);
        this.tweens.add({ targets: img, scale: 1.3, duration: 300, ease: 'Back.easeOut' });
      });
    });

    c.add(makeText(this, W / 2, H / 2 - 80, `Recorrido: ${this.distance} · Óptimo: ${this.optimal}`, 18, '#6b4423', false));
    const coinRow = this.add.container(W / 2, H / 2 - 38);
    coinRow.add(this.add.image(0, 0, 'coin').setScale(0.7));
    coinRow.add(makeText(this, 24, 0, `+${earned}`, 24, '#a06a35'));
    c.add(coinRow);

    if (newMonsters.length > 0) {
      const names = newMonsters.map((id) => MONSTER_MAP[id].name).join(', ');
      c.add(makeText(this, W / 2, H / 2 + 6, `¡Nuevo monstruo en el álbum: ${names}!`, 16, '#2f9e44', false));
    }

    const isLast = this.level.id >= 30;
    const next = makeButton(this, W / 2, H / 2 + 80, 280, 60, isLast ? 'VER NIVELES' : 'SIGUIENTE ▶', {
      fontSize: 24,
      onClick: () => {
        if (isLast) this.scene.start('levels');
        else this.scene.restart({ levelId: this.level.id + 1 });
      },
    });
    const repeat = makeButton(this, W / 2, H / 2 + 152, 280, 54, 'REPETIR', {
      bg: COLORS.mintDark, fontSize: 20,
      onClick: () => this.scene.restart({ levelId: this.level.id }),
    });
    const menu = makeButton(this, W / 2, H / 2 + 220, 280, 54, 'NIVELES', {
      bg: COLORS.purple, fontSize: 20,
      onClick: () => this.scene.start('levels'),
    });
    c.add([next, repeat, menu]);
  }
}

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
 * Presentación 2.5D: fachada con profundidad, hueco de ascensor con
 * rieles y cable, cabina con luz e indicador digital, panel metálico
 * y animaciones con squash & stretch.
 */

import Phaser from 'phaser';
import { getLevel, LevelDef, TOTAL_LEVELS } from '../data/levels';
import { MONSTER_MAP, MonsterDef, TWIN_GROUP, Mood } from '../data/monsters';
import { loadSave, writeSave, SaveData, getCustomOption } from '../systems/save';
import { computeOptimal, starsFor, starThresholds, coinsFor, moodForMistakes, MAX_MISTAKES } from '../systems/scoring';
import { makeButton, makePanel, makeText, makeStars, COLORS } from '../systems/ui';
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
const BUILD_TOP = 110;
const LOBBY_TOP = 690;
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
  private lightCone!: Phaser.GameObjects.Graphics;
  private indicator!: Phaser.GameObjects.Text;
  private indicatorBg!: Phaser.GameObjects.Graphics;
  private floorButtons = new Map<number, { g: Phaser.GameObjects.Graphics; badge: Phaser.GameObjects.Text; badgeBg: Phaser.GameObjects.Graphics }>();
  private panelFloorText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private patienceG!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;
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
    // Cable del ascensor (del motor a la cabina)
    this.cable.clear();
    this.cable.lineStyle(3, 0x8f7fc0, 0.8);
    this.cable.lineBetween(CAB_X, BUILD_TOP + 14, this.cab.x, this.cab.y - CAB_H / 2);
  }

  // ── Dibujo del hotel (2.5D) ──────────────────────────────────────────────
  private drawHotel(): void {
    const wallpaper = getCustomOption('wallpaper', this.save.custom.wallpaper).color;
    const carpet = getCustomOption('carpet', this.save.custom.carpet).color;
    const N = this.level.floors;
    const fh = this.fh();

    const g = this.add.graphics();
    // Fondo general
    g.fillGradientStyle(0x2b1b4d, 0x2b1b4d, 0x17102e, 0x17102e, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xffffff, 0.35);
    for (let i = 0; i < 26; i++) {
      g.fillCircle(Math.random() * W, Math.random() * 90, Math.random() * 1.6 + 0.5);
    }

    // Sombra del edificio (profundidad)
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(BUILD_LEFT + 8, BUILD_TOP + 10, BUILD_RIGHT - BUILD_LEFT, BUILD_BOTTOM - BUILD_TOP, 14);
    // Fachada principal
    g.fillStyle(wallpaper, 1);
    g.fillRoundedRect(BUILD_LEFT, BUILD_TOP, BUILD_RIGHT - BUILD_LEFT, BUILD_BOTTOM - BUILD_TOP, 14);
    // Pared lateral derecha (efecto 3D) y zócalo inferior
    g.fillStyle(0x000000, 0.18);
    g.fillRect(BUILD_RIGHT - 14, BUILD_TOP + 8, 14, BUILD_BOTTOM - BUILD_TOP - 8);
    g.fillRect(BUILD_LEFT, BUILD_BOTTOM - 16, BUILD_RIGHT - BUILD_LEFT, 16);
    // Techo: franja clara + cornisa con sombra
    g.fillStyle(0xffffff, 0.18);
    g.fillRect(BUILD_LEFT + 6, BUILD_TOP + 4, BUILD_RIGHT - BUILD_LEFT - 12, 10);
    g.fillStyle(0x000000, 0.22);
    g.fillRect(BUILD_LEFT + 6, BUILD_TOP + 14, BUILD_RIGHT - BUILD_LEFT - 12, 5);

    // Hueco del ascensor: interior oscuro con rieles
    g.fillGradientStyle(0x17102e, 0x17102e, 0x241640, 0x241640, 1);
    g.fillRect(SHAFT_LEFT, BUILD_TOP + 18, SHAFT_RIGHT - SHAFT_LEFT, BUILD_BOTTOM - BUILD_TOP - 18);
    g.lineStyle(3, 0x8f7fc0, 0.45);
    g.lineBetween(CAB_X - 62, BUILD_TOP + 18, CAB_X - 62, BUILD_BOTTOM);
    g.lineBetween(CAB_X + 62, BUILD_TOP + 18, CAB_X + 62, BUILD_BOTTOM);
    g.lineStyle(1, 0xffffff, 0.08);
    for (let f = 1; f <= N; f++) {
      g.lineBetween(SHAFT_LEFT, this.bandBottom(f), SHAFT_RIGHT, this.bandBottom(f));
    }
    // Motor del ascensor en lo alto del hueco
    g.fillStyle(0x3a2d5c, 1);
    g.fillRoundedRect(CAB_X - 40, BUILD_TOP + 2, 80, 16, 5);
    g.fillStyle(0x5b4396, 1);
    g.fillCircle(CAB_X, BUILD_TOP + 10, 6);

    // Bandas de pisos: cornisa, ventanas con marco y marcos de puerta
    for (let f = 1; f <= N; f++) {
      const top = this.bandBottom(f) - fh;
      g.fillStyle(0xffffff, 0.06);
      g.fillRect(BUILD_LEFT + 8, top, BUILD_RIGHT - BUILD_LEFT - 16, fh);
      // Cornisa: línea de luz + sombra
      g.fillStyle(0xffffff, 0.22);
      g.fillRect(BUILD_LEFT + 8, top, BUILD_RIGHT - BUILD_LEFT - 16, 2);
      g.fillStyle(0x000000, 0.16);
      g.fillRect(BUILD_LEFT + 8, top + 2, BUILD_RIGHT - BUILD_LEFT - 16, 3);

      this.drawWindow(g, BUILD_LEFT + 26, top + fh * 0.28, (f * 3) % 4 === 0);
      this.drawWindow(g, BUILD_RIGHT - 70, top + fh * 0.28, (f * 3 + 1) % 4 === 0);

      // Marco de puerta del piso en el hueco
      g.fillStyle(0x6b5a8a, 1);
      g.fillRoundedRect(SHAFT_LEFT - 4, top + 6, SHAFT_RIGHT - SHAFT_LEFT + 8, fh - 10, 6);
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(SHAFT_LEFT, top + 10, SHAFT_RIGHT - SHAFT_LEFT, fh - 18, 4);
      // Placa con el número del piso
      g.fillStyle(0x1a1033, 1);
      g.fillRoundedRect(CAB_X - 16, top + 8, 32, 18, 4);
      g.lineStyle(1, 0xffc93c, 0.7);
      g.strokeRoundedRect(CAB_X - 16, top + 8, 32, 18, 4);
    }
    // Números de piso en la fachada
    for (let f = 1; f <= N; f++) {
      const top = this.bandBottom(f) - fh;
      makeText(this, CAB_X, top + 17, `${f}`, 13, '#ffc93c');
      makeText(this, BUILD_LEFT + 44, top + 16, `${f}`, 15, '#ffd678').setShadow(0, 2, '#000000', 4, true, true);
      makeText(this, BUILD_RIGHT - 44, top + 16, `${f}`, 15, '#ffd678').setShadow(0, 2, '#000000', 4, true, true);
    }

    // Recepción: alfombra con borde dorado
    g.fillStyle(carpet, 1);
    g.fillRect(BUILD_LEFT + 8, LOBBY_TOP, BUILD_RIGHT - BUILD_LEFT - 16, BUILD_BOTTOM - LOBBY_TOP);
    g.lineStyle(2, 0xffc93c, 0.5);
    g.strokeRect(BUILD_LEFT + 14, LOBBY_TOP + 6, BUILD_RIGHT - BUILD_LEFT - 28, BUILD_BOTTOM - LOBBY_TOP - 12);
    makeText(this, BUILD_LEFT + 44, LOBBY_TOP + 14, 'R', 15, '#ffffff').setShadow(0, 2, '#000000', 4, true, true);
    makeText(this, BUILD_RIGHT - 44, LOBBY_TOP + 14, 'R', 15, '#ffffff').setShadow(0, 2, '#000000', 4, true, true);

    // Mostrador de recepción con profundidad: frente + superficie + campana
    g.fillStyle(0x8b5a2b, 1);
    g.fillRoundedRect(BUILD_LEFT + 96, BUILD_BOTTOM - 30, 104, 30, 6);
    g.fillStyle(0xa06a35, 1);
    g.fillRoundedRect(BUILD_LEFT + 92, BUILD_BOTTOM - 38, 112, 12, 6);
    g.fillStyle(0xffc93c, 1);
    g.fillCircle(BUILD_LEFT + 148, BUILD_BOTTOM - 42, 6);
    g.fillRect(BUILD_LEFT + 141, BUILD_BOTTOM - 40, 14, 3);
    // Planta decorativa
    g.fillStyle(0xb45309, 1);
    g.fillRoundedRect(BUILD_LEFT + 24, BUILD_BOTTOM - 26, 18, 22, 4);
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(BUILD_LEFT + 33, BUILD_BOTTOM - 36, 10);
    g.fillCircle(BUILD_LEFT + 25, BUILD_BOTTOM - 30, 7);
    g.fillCircle(BUILD_LEFT + 41, BUILD_BOTTOM - 30, 7);
    // Cartel de recepción colgando
    g.lineStyle(2, 0x8f7fc0, 0.8);
    g.lineBetween(BUILD_LEFT + 110, LOBBY_TOP, BUILD_LEFT + 110, LOBBY_TOP + 12);
    g.lineBetween(BUILD_LEFT + 186, LOBBY_TOP, BUILD_LEFT + 186, LOBBY_TOP + 12);
    g.fillStyle(0x1a1033, 1);
    g.fillRoundedRect(BUILD_LEFT + 104, LOBBY_TOP + 12, 88, 20, 6);
    g.lineStyle(2, 0xffc93c, 0.8);
    g.strokeRoundedRect(BUILD_LEFT + 104, LOBBY_TOP + 12, 88, 20, 6);
    makeText(this, BUILD_LEFT + 148, LOBBY_TOP + 22, 'RECEPCIÓN', 12, '#ffc93c');

    // Zona de cola: pared con zócalo + suelo de alfombra con borde
    g.fillStyle(0x000000, 0.2);
    g.fillRect(8, 778, W - 16, 22);
    g.fillStyle(carpet, 0.95);
    g.fillRoundedRect(8, 800, W - 16, 150, 14);
    g.lineStyle(3, 0xffc93c, 0.45);
    g.strokeRoundedRect(14, 806, W - 28, 138, 10);
    makeText(this, W / 2, 792, 'RECEPCIÓN · toca monstruos para subirlos', 14, '#ffffff', false);

    // Pista de tutorial
    this.hintText = makeText(this, W / 2, 818, '', 16, '#ffd678');
  }

  /** Ventana con marco, cristal degradado, brillo diagonal y alféizar. */
  private drawWindow(g: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean): void {
    const w = 44, h = 40;
    g.fillStyle(0x241640, 1);
    g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 6);
    if (lit) {
      g.fillGradientStyle(0xffe08a, 0xffe08a, 0xf5a623, 0xf5a623, 1);
    } else {
      g.fillGradientStyle(0x9fd8ff, 0x9fd8ff, 0x5aa8e8, 0x5aa8e8, 1);
    }
    g.fillRoundedRect(x, y, w, h, 4);
    g.fillStyle(0xffffff, 0.35);
    g.fillTriangle(x + 6, y + h, x + 16, y, x + 26, y);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(x + w / 2 - 1, y, 2, h);
    g.fillStyle(0xd8cdb4, 1);
    g.fillRoundedRect(x - 4, y + h + 3, w + 8, 5, 2);
  }

  private drawHud(): void {
    const g = this.add.graphics();
    g.fillStyle(0x1a1033, 0.95);
    g.fillRect(0, 0, W, 98);

    makeButton(this, 34, 30, 56, 44, 'II', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 18,
      onClick: () => this.openPause(),
    });
    makeText(this, W / 2, 22, `Nivel ${this.level.id} · ${this.level.title}`, 19, '#ffd678');
    this.progressText = makeText(this, W / 2, 50, '', 15, '#c9bdf0', false);
    this.distText = makeText(this, W / 2, 74, '', 15, '#ffffff', false);
    // Indicador de paciencia (errores cometidos)
    makeText(this, W - 62, 14, 'PACIENCIA', 10, '#8f7fc0', false);
    this.patienceG = this.add.graphics();
  }

  private refreshPatience(): void {
    this.patienceG.clear();
    for (let i = 0; i < MAX_MISTAKES; i++) {
      const x = W - 92 + i * 26;
      const used = i < this.mistakes;
      this.patienceG.fillStyle(used ? 0xf87171 : 0x3a2d5c, 1);
      this.patienceG.fillCircle(x, 32, 9);
      this.patienceG.lineStyle(2, used ? 0xffc9c9 : 0x8f7fc0, 0.9);
      this.patienceG.strokeCircle(x, 32, 9);
    }
  }

  private drawFloorPanel(): void {
    const N = this.level.floors;
    // Panel metálico
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(396, 108, 128, 470, 14);
    g.fillGradientStyle(0x4a3a75, 0x4a3a75, 0x241640, 0x241640, 1);
    g.fillRoundedRect(392, 104, 128, 470, 14);
    g.lineStyle(3, 0xffc93c, 0.5);
    g.strokeRoundedRect(392, 104, 128, 470, 14);
    g.fillStyle(0xcbd5e1, 1);
    [[400, 112], [512, 112], [400, 566], [512, 566]].forEach(([x, y]) => g.fillCircle(x, y, 3));
    makeText(this, 456, 122, 'ASCENSOR', 14, '#c9bdf0');
    this.panelFloorText = makeText(this, 456, 142, 'Piso: R', 14, '#ffc93c', false);

    const floors: number[] = [];
    for (let f = N; f >= 1; f--) floors.push(f);
    floors.push(0);
    floors.forEach((f, i) => {
      const x = 456;
      const y = 176 + i * 56;
      const w = 104, h = 46;
      const bg = this.add.graphics();
      const badgeBg = this.add.graphics();
      const badge = makeText(this, x + w / 2 - 12, y - h / 2 + 10, '', 13, '#1a1033');
      this.floorButtons.set(f, { g: bg, badge, badgeBg });
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.tweens.add({ targets: bg, scale: 0.92, duration: 60, yoyo: true });
        this.onFloorButton(f);
      });
    });
  }

  private createCab(): void {
    const doorColor = getCustomOption('door', this.save.custom.door).color;
    this.cab = this.add.container(CAB_X, this.cabY(0));

    const back = this.add.graphics();
    // Pared interior con degradado y paneles verticales
    back.fillGradientStyle(0x4a3a75, 0x4a3a75, 0x241640, 0x241640, 1);
    back.fillRoundedRect(-CAB_W / 2, -CAB_H / 2, CAB_W, CAB_H, 8);
    back.lineStyle(1, 0xffffff, 0.08);
    for (let i = 1; i < 4; i++) {
      back.lineBetween(-CAB_W / 2 + (CAB_W / 4) * i, -CAB_H / 2 + 6, -CAB_W / 2 + (CAB_W / 4) * i, CAB_H / 2 - 6);
    }
    // Techo con luz + paredes laterales (perspectiva) + suelo metálico
    back.fillStyle(0x5b4396, 1);
    back.fillRect(-CAB_W / 2, -CAB_H / 2, CAB_W, 12);
    back.fillStyle(0xffd678, 1);
    back.fillRoundedRect(-22, -CAB_H / 2 + 2, 44, 7, 3);
    back.fillStyle(0x000000, 0.25);
    back.fillRect(-CAB_W / 2, -CAB_H / 2, 10, CAB_H);
    back.fillRect(CAB_W / 2 - 10, -CAB_H / 2, 10, CAB_H);
    back.fillStyle(0x8a7a5a, 1);
    back.fillRect(-CAB_W / 2, CAB_H / 2 - 10, CAB_W, 10);
    back.fillStyle(0xffffff, 0.25);
    back.fillRect(-CAB_W / 2, CAB_H / 2 - 10, CAB_W, 2);
    // Sombra del suelo de la cabina
    back.fillStyle(0x000000, 0.3);
    back.fillEllipse(0, CAB_H / 2 - 8, CAB_W - 30, 12);
    this.cab.add(back);

    // Cono de luz cuando las puertas están abiertas
    this.lightCone = this.add.graphics();
    this.lightCone.fillStyle(0xffd678, 0.13);
    this.lightCone.fillTriangle(-CAB_W / 2 + 8, -CAB_H / 2 + 10, CAB_W / 2 - 8, -CAB_H / 2 + 10, 0, CAB_H / 2);
    this.cab.add(this.lightCone);

    const drawDoor = (side: number): Phaser.GameObjects.Graphics => {
      const d = this.add.graphics();
      d.fillGradientStyle(doorColor, doorColor, 0x000000, 0x000000, 1);
      d.fillRoundedRect(side * (CAB_W / 4) - CAB_W / 4, -CAB_H / 2, CAB_W / 2, CAB_H, 5);
      d.lineStyle(2, 0x000000, 0.3);
      d.strokeRoundedRect(side * (CAB_W / 4) - CAB_W / 4, -CAB_H / 2, CAB_W / 2, CAB_H, 5);
      d.lineStyle(1, 0xffffff, 0.18);
      for (let i = 1; i < 4; i++) {
        const lx = side * (CAB_W / 4) - CAB_W / 4 + (CAB_W / 8) * i;
        d.lineBetween(lx, -CAB_H / 2 + 6, lx, CAB_H / 2 - 6);
      }
      // Ventanilla redonda de la puerta
      const wx = side * (CAB_W / 4);
      d.fillStyle(0x241640, 1);
      d.fillCircle(wx, -CAB_H / 2 + 20, 10);
      d.fillStyle(0x9fd8ff, 1);
      d.fillCircle(wx, -CAB_H / 2 + 20, 7);
      d.fillStyle(0xffffff, 0.5);
      d.fillCircle(wx - 2, -CAB_H / 2 + 17, 2.5);
      return d;
    };
    this.doorL = drawDoor(-1);
    this.doorR = drawDoor(1);
    this.cab.add([this.doorL, this.doorR]);

    const frame = this.add.graphics();
    frame.lineStyle(4, 0xffc93c, 0.9);
    frame.strokeRoundedRect(-CAB_W / 2, -CAB_H / 2, CAB_W, CAB_H, 8);
    this.cab.add(frame);

    // Indicador digital del piso
    this.indicatorBg = this.add.graphics();
    this.indicatorBg.fillStyle(0x0d0820, 1);
    this.indicatorBg.fillRoundedRect(-24, -CAB_H / 2 - 26, 48, 22, 5);
    this.indicatorBg.lineStyle(2, 0xffc93c, 0.8);
    this.indicatorBg.strokeRoundedRect(-24, -CAB_H / 2 - 26, 48, 22, 5);
    this.cab.add(this.indicatorBg);
    this.indicator = makeText(this, 0, -CAB_H / 2 - 15, 'R', 16, '#ffc93c');
    this.cab.add(this.indicator);
    this.setDoors(true, true);

    // Cable (se redibuja en update)
    this.cable = this.add.graphics().setDepth(1);
  }

  private setDoors(open: boolean, instant = false): void {
    this.doorsOpen = open;
    const off = open ? CAB_W / 2 + 10 : 0;
    const dur = instant ? 0 : 220;
    this.tweens.add({ targets: this.doorL, x: -off, duration: dur, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.doorR, x: off, duration: dur, ease: 'Quad.easeOut' });
    this.lightCone.setVisible(open);
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

      // Insignia de destino (siempre visible)
      const badge = this.add.container(0, -38);
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(0xffffff, 1);
      badgeBg.fillCircle(0, 0, 13);
      badgeBg.lineStyle(3, 0x1a1033, 1);
      badgeBg.strokeCircle(0, 0, 13);
      const badgeText = makeText(this, 0, 0, `${grp.dest}`, 17, '#1a1033');
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
        // Squash & stretch al aterrizar
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
          // Balanceo sutil + indicador que cuenta los pisos
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
    // Caminata tambaleante con balanceo y pasos (squash & stretch)
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
    // Entregar bien perdona los errores: ánimos y paciencia se reinician
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
      btn.g.fillStyle(0x000000, 0.25);
      btn.g.fillRoundedRect(x - w / 2, y - h / 2 + 3, w, h, 11);
      if (count > 0) {
        btn.g.fillStyle(0xffc93c, 1); // destino con pasajeros: ámbar brillante
      } else if (isCurrent) {
        btn.g.fillStyle(0x2f9e44, 1); // piso actual del ascensor: verde
      } else {
        btn.g.fillStyle(0x5b4396, 1);
      }
      btn.g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 11);
      btn.g.lineStyle(isCurrent ? 4 : 3, 0xffffff, isCurrent ? 0.9 : 0.3);
      btn.g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 11);
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

  private updateHint(): void {
    if (this.level.id > 1 || this.won) {
      this.hintText.setText('');
      return;
    }
    if (this.onboard().length === 0 && this.elevatorFloor === 0 && this.delivered === 0) {
      this.hintText.setText('1. Toca un monstruo para subirlo al ascensor');
    } else if (this.onboard().length > 0 && this.elevatorFloor === 0) {
      this.hintText.setText('2. Toca el piso del globo del monstruo');
    } else if (this.elevatorFloor !== 0 && this.onboard().length > 0) {
      this.hintText.setText('3. ¡Buen viaje! Toca otro piso si hace falta');
    } else if (this.delivered > 0 && this.onboard().length === 0 && this.elevatorFloor === 0) {
      this.hintText.setText('¡Bien! Sube a los demás monstruos');
    } else {
      this.hintText.setText('');
    }
  }

  private showBubble(text: string, x: number, y: number, duration = 1600): void {
    this.bubbleText.setText(text);
    const w = Math.min(360, this.bubbleText.width + 36);
    const h = 44;
    this.bubbleBg.clear();
    this.bubbleBg.fillStyle(0xffffff, 0.97);
    this.bubbleBg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.bubbleBg.lineStyle(3, 0x1a1033, 1);
    this.bubbleBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.bubble.setPosition(x, y).setDepth(60).setVisible(true).setAlpha(1);
    this.bubbleText.setPosition(0, 0);
    this.bubbleTimer?.remove();
    this.bubbleTimer = this.time.delayedCall(duration, () => {
      this.tweens.add({ targets: this.bubble, alpha: 0, duration: 250, onComplete: () => this.bubble.setVisible(false) });
    });
  }

  private createBubble(): void {
    this.bubbleBg = this.add.graphics();
    this.bubbleText = makeText(this, 0, 0, '', 17, '#1a1033', false);
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
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 420, 320));
    const img = this.add.image(W / 2, H / 2 - 90, `monster-${p.monsterId}`).setScale(0.9);
    c.add(img);
    c.add(makeText(this, W / 2, H / 2 - 10, p.def.name, 26, '#ffd678'));
    const t = this.add.text(W / 2, H / 2 + 30, p.def.ruleText, {
      fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#e9e2ff',
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
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 380, 380));
    c.add(makeText(this, W / 2, H / 2 - 140, 'PAUSA', 34, '#ffd678'));
    const resume = makeButton(this, W / 2, H / 2 - 60, 260, 58, 'CONTINUAR', {
      fontSize: 22, onClick: () => { this.paused = false; c.destroy(); },
    });
    const restart = makeButton(this, W / 2, H / 2 + 20, 260, 58, 'REINICIAR', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 22,
      onClick: () => { this.paused = false; this.scene.restart({ levelId: this.level.id }); },
    });
    const exit = makeButton(this, W / 2, H / 2 + 100, 260, 58, 'SALIR', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 22,
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
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 440, 520));
    c.add(makeText(this, W / 2, H / 2 - 210, '¡NIVEL COMPLETADO!', 30, '#ffd678'));

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

    c.add(makeText(this, W / 2, H / 2 - 80, `Recorrido: ${this.distance} · Óptimo: ${this.optimal}`, 18, '#ffffff', false));
    const coinRow = this.add.container(W / 2, H / 2 - 38);
    coinRow.add(this.add.image(0, 0, 'coin').setScale(0.7));
    coinRow.add(makeText(this, 24, 0, `+${earned}`, 24, '#ffd678'));
    c.add(coinRow);

    if (newMonsters.length > 0) {
      const names = newMonsters.map((id) => MONSTER_MAP[id].name).join(', ');
      c.add(makeText(this, W / 2, H / 2 + 6, `¡Nuevo monstruo en el álbum: ${names}!`, 16, '#4ade80', false));
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
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 20,
      onClick: () => this.scene.restart({ levelId: this.level.id }),
    });
    const menu = makeButton(this, W / 2, H / 2 + 220, 280, 54, 'NIVELES', {
      bg: COLORS.panelLight, textColor: '#ffffff', fontSize: 20,
      onClick: () => this.scene.start('levels'),
    });
    c.add([next, repeat, menu]);
  }
}

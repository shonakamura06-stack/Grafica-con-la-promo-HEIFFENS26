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
import { getLevel, LEVELS, LevelDef, TOTAL_LEVELS } from '../data/levels';
import { MONSTER_MAP, MonsterDef, TWIN_GROUP, Mood, floorColor } from '../data/monsters';
import { loadSave, writeSave, SaveData, getCustomOption } from '../systems/save';
import { computeOptimal, starsFor, coinsFor, isPerfect, isRecord, moodForMistakes, MAX_MISTAKES } from '../systems/scoring';
import { queueLine, arrivalLine, pickLine, SEPARATED_LINES, ENEMY_LINES, RECEPTIONIST_LINES } from '../data/dialogues';
import { makeButton, makePanel, makeText, makeStars, makeWoodSign, COLORS } from '../systems/ui';
import { audio, vibrate } from '../systems/audio';
import { RESE_VOICE } from '../data/reseVoice';
import { openOutOfLives } from '../systems/lives';
import { isPremium, tickHearts, spendHeart } from '../systems/save';

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
// Layout en 4 columnas de 135px:
// - Columnas 1-2 (x 0-270): edificio con ventanas y balcones
// - Columna 3 (x 270-405): ascensor de cristal
// - Columna 4 (x 405-540): tablero de pisos
const BUILD_LEFT = 12;
const BUILD_RIGHT = 258;
const FLOOR_H = 114; // altura FIJA de cada piso (la ideal de 5 pisos)
const LOBBY_TOP = 700; // la planta baja (piso 0) empieza aquí
const BUILD_BOTTOM = 780;
const CAB_X = 337; // centro de la columna 3
const CAB_W = 100;
const CAB_H = 90;
const SHAFT_LEFT = 284;
const SHAFT_RIGHT = 390;
const PANEL_X = 470; // centro de la columna 4
const QUEUE_CX = 135; // centro de la zona de cola (columnas 1-2)

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

  // ── Mecánicas nuevas ──
  private lives = 0;               // corazones (0 = sin sistema de vidas)
  private livesIcons: Phaser.GameObjects.Image[] = [];
  private timeLeft = 0;            // segundos restantes
  private timeText!: Phaser.GameObjects.Text;
  private timeBar!: Phaser.GameObjects.Graphics;
  private timerEvent?: Phaser.Time.TimerEvent;
  private separations = 0;         // parejas separadas (cada una resta 1 estrella)
  private ruleBreaks = 0;          // reglas rotas (enemigos juntos, etc.)
  private coupleOf = new Map<number, number>(); // pasajero -> su pareja
  private enemiesOf = new Map<number, number[]>(); // pasajero -> enemigos
  private breakdownDone = false;   // ya ocurrió la avería en este nivel
  private repairing = false;       // minijuego de reparación abierto
  private speechTimer?: Phaser.Time.TimerEvent;
  private receptionist!: Phaser.GameObjects.Container;
  private receptionistText!: Phaser.GameObjects.Text;
  private receptionistBg!: Phaser.GameObjects.Graphics;
  private reseImg!: Phaser.GameObjects.Image;
  private tutorialDone = false;    // ya se explicó este nivel
  private forgiven = false;        // Rese ya perdonó un error en este nivel
  private reseActive = false;
  private reseClipKey = '';
  private reseEvents: Phaser.Time.TimerEvent[] = [];
  private tutorialKey = 'tut1';
  private reseSkipBtn!: Phaser.GameObjects.Container;
  private reseOverlay!: Phaser.GameObjects.Rectangle;
  private reseHint!: Phaser.GameObjects.Text;
  private forgiveMoves = 0;        // movimientos que Rese perdona en la estrella
  private useHearts = false;       // este nivel usa corazones globales
  private reseBuf?: AudioBuffer;
  private reseSrc?: AudioBufferSourceNode;
  private reseGain?: GainNode;
  private typeEvent?: Phaser.Time.TimerEvent;
  private segEvent?: Phaser.Time.TimerEvent;
  private fullLine = '';
  private lineIdx = -1;
  private lineReady = true;

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
    this.useHearts = this.level.lives > 0;
    tickHearts(this.save);
    this.lives = this.useHearts ? (isPremium(this.save) ? 3 : this.save.hearts) : 0;
    this.livesIcons = [];
    this.timeLeft = this.level.timeLimit;
    this.separations = 0;
    this.ruleBreaks = 0;
    this.forgiven = false;
    this.forgiveMoves = 0;
    this.tutorialDone = false;
    this.reseActive = false;
    this.coupleOf.clear();
    this.enemiesOf.clear();
    this.breakdownDone = false;
    this.repairing = false;
    this.optimal = computeOptimal(this.level).optimal;
  }

  // ── Geometría ────────────────────────────────────────────────────────────
  /** Altura de piso FIJA: el edificio es más bajo con menos pisos. */
  private fh(): number {
    return FLOOR_H;
  }
  /** Parte superior del edificio según el número de pisos del nivel. */
  private buildTop(): number {
    return LOBBY_TOP - this.level.floors * FLOOR_H;
  }
  private bandBottom(f: number): number {
    if (f === 0) return BUILD_BOTTOM;
    return LOBBY_TOP - (f - 1) * this.fh();
  }
  private cabY(f: number): number {
    return this.bandBottom(f) - CAB_H / 2 - 2;
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
    this.cameras.main.fadeIn(320);
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
    this.createReceptionist();
    this.layoutQueue(true);
    this.refreshHud();
    this.refreshFloorButtons();
    this.updateHint();
    this.showSpecialTutorialIfNeeded();
    this.startTimer();
    this.startSpeech();
    this.maybeBreakdown();

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
    this.cable.lineBetween(CAB_X, this.buildTop() + 22, this.cab.x, this.cab.y - CAB_H / 2 - 6);
  }

  // ── Cielo y nubes ────────────────────────────────────────────────────────
  private drawSky(): void {
    const night = getCustomOption('night', this.save.custom.night).id === 'noche';
    const g = this.add.graphics();
    if (night) {
      g.fillGradientStyle(0x1e293b, 0x1e293b, 0x334155, 0x334155, 1);
    } else {
      g.fillGradientStyle(0xaee3f5, 0xaee3f5, 0xd8f3fc, 0xd8f3fc, 1);
    }
    g.fillRect(0, 0, W, H);
    // Nubes SOLO como fondo lejano, detrás de todo (depth 0, alpha baja).
    const cloudDefs: Array<[number, number, number, number]> = [
      [70, 130, 0.8, 9000], [470, 190, 0.65, 12000], [60, 420, 0.55, 14000], [480, 560, 0.7, 11000],
    ];
    cloudDefs.forEach(([x, y, s, dur]) => {
      const c = this.add.image(x, y, 'cloud').setScale(s).setAlpha(0.5).setDepth(0);
      this.tweens.add({
        targets: c, x: x + 26, duration: dur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });
  }

  // ── Hotel kawaii (2.5D) ──────────────────────────────────────────────────
  private drawHotel(): void {
    const wallpaper = getCustomOption('wallpaper', this.save.custom.wallpaper).color;
    const N = this.level.floors;
    const fh = this.fh();
    const top = this.buildTop();
    const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

    const g = this.add.graphics();
    // Sombra del edificio
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(BUILD_LEFT + 6, top + 8, BUILD_RIGHT - BUILD_LEFT, BUILD_BOTTOM - top, 14);
    // Techo en 3D: cara superior en perspectiva + franja frontal rosa
    g.fillStyle(0xfbcfe8, 1);
    g.fillPoints([V(BUILD_LEFT, top), V(BUILD_RIGHT, top), V(BUILD_RIGHT + 10, top - 12), V(BUILD_LEFT + 10, top - 12)], true);
    g.fillStyle(0xf9a8d4, 1);
    g.fillRoundedRect(BUILD_LEFT - 2, top - 9, BUILD_RIGHT - BUILD_LEFT + 4, 14, 7);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(BUILD_LEFT + 4, top - 7, BUILD_RIGHT - BUILD_LEFT - 8, 4);
    // Fachada crema
    g.fillStyle(wallpaper, 1);
    g.fillRoundedRect(BUILD_LEFT, top, BUILD_RIGHT - BUILD_LEFT, BUILD_BOTTOM - top, 14);
    // Pared lateral derecha (profundidad)
    g.fillStyle(0x000000, 0.08);
    g.fillPoints([V(BUILD_RIGHT - 14, top + 8), V(BUILD_RIGHT, top + 8), V(BUILD_RIGHT, BUILD_BOTTOM), V(BUILD_RIGHT - 14, BUILD_BOTTOM)], true);
    // Zócalo inferior
    g.fillStyle(0xf5d9a8, 1);
    g.fillRect(BUILD_LEFT, BUILD_BOTTOM - 12, BUILD_RIGHT - BUILD_LEFT, 12);

    // Bandas de pisos: dos ventanas con balcón por piso + banner numerado
    for (let f = 1; f <= N; f++) {
      const top = this.bandBottom(f) - fh;
      const color = floorColor(f);
      g.fillStyle(0xffffff, 0.22);
      g.fillRect(BUILD_LEFT + 6, top, BUILD_RIGHT - BUILD_LEFT - 12, fh);
      g.fillStyle(0xf5d9a8, 1);
      g.fillRect(BUILD_LEFT + 6, top, BUILD_RIGHT - BUILD_LEFT - 12, 5);
      g.fillStyle(0x000000, 0.05);
      g.fillRect(BUILD_LEFT + 6, top + 5, BUILD_RIGHT - BUILD_LEFT - 12, 6);

      this.drawWindowBalcony(g, BUILD_LEFT + 26, top + fh * 0.18, f % 2 === 1, color);
      this.drawWindowBalcony(g, BUILD_LEFT + 140, top + fh * 0.18, f % 2 === 1, color);
      this.drawBanner(g, BUILD_LEFT + 108, top + 6, f, color);
    }

    // ── Planta baja (piso 0): recepción ──
    const deskX = BUILD_LEFT + 18, deskY = LOBBY_TOP + 34;
    g.fillStyle(0x000000, 0.1);
    g.fillEllipse(deskX + 55, deskY + 44, 110, 12);
    g.fillStyle(0x7c4f24, 1);
    g.fillRoundedRect(deskX, deskY + 4, 110, 40, 8);
    g.fillStyle(0xa06a35, 1);
    g.fillRoundedRect(deskX - 4, deskY - 2, 118, 12, 6);
    // Cartel de recepción sobre el mostrador
    g.fillStyle(0xa06a35, 1);
    g.fillRoundedRect(deskX + 4, deskY - 26, 102, 20, 7);
    g.lineStyle(2, 0x7c4f24, 1);
    g.strokeRoundedRect(deskX + 4, deskY - 26, 102, 20, 7);
    makeText(this, deskX + 55, deskY - 16, 'RECEPCIÓN', 12, '#ffffff');
    // Recepcionista (Moco) asomando tras el mostrador
    const receptionist = this.add.image(deskX + 55, deskY - 18, 'monster-moco').setScale(0.4);
    this.tweens.add({ targets: receptionist, y: deskY - 24, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Planta decorativa
    g.fillStyle(0xe07b2a, 1);
    g.fillRoundedRect(deskX + 150, deskY - 8, 14, 14, 3);
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(deskX + 157, deskY - 14, 8);

    // ── Torre de cristal del ascensor (columna 3) ──
    g.fillGradientStyle(0xeaf7ff, 0xeaf7ff, 0xbfe8ff, 0xbfe8ff, 0.5, 0.5, 0.3, 0.3);
    g.fillRect(SHAFT_LEFT, top + 4, SHAFT_RIGHT - SHAFT_LEFT, BUILD_BOTTOM - top - 4);
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(SHAFT_LEFT + 8, top + 4, 10, BUILD_BOTTOM - top - 4);
    g.lineStyle(4, 0x5a7a8a, 0.8);
    for (let f = 1; f <= N; f++) {
      g.lineBetween(SHAFT_LEFT, this.bandBottom(f), SHAFT_RIGHT, this.bandBottom(f));
    }
    g.lineStyle(3, 0x5a7a8a, 0.5);
    g.lineBetween(CAB_X, top + 4, CAB_X, BUILD_BOTTOM);
    g.lineStyle(4, 0x5a7a8a, 1);
    g.strokeRect(SHAFT_LEFT, top + 4, SHAFT_RIGHT - SHAFT_LEFT, BUILD_BOTTOM - top - 4);
    g.fillStyle(0x8a7a5a, 1);
    g.fillRoundedRect(SHAFT_LEFT - 5, top - 2, SHAFT_RIGHT - SHAFT_LEFT + 10, 11, 5);
    // Nube dentro de la torre
    const shaftCloud = this.add.image(CAB_X, top + 34, 'cloud').setScale(0.42).setAlpha(0.9);
    this.tweens.add({ targets: shaftCloud, y: top + 42, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Zona de cola: suelo de baldosas a todo el ancho inferior ──
    g.fillStyle(0xfff3d6, 1);
    g.fillRoundedRect(8, 792, W - 16, 162, 14);
    g.lineStyle(2, 0xe8cfa0, 0.8);
    for (let i = -4; i <= 4; i++) {
      g.lineBetween(W / 2 + i * 68, 950, W / 2 + i * 44, 796);
    }
    for (const ty of [826, 864, 908]) {
      g.lineBetween(12, ty, W - 12, ty);
    }
    const flowerColors = [0xf472b6, 0xffc93c, 0xffffff, 0xf87171, 0xc084fc];
    for (let i = 0; i < 9; i++) {
      this.drawFlower(g, 60 + i * 52, 946, flowerColors[i % flowerColors.length]);
    }
  }

  /** Ventana con balcón (losa + barandilla del color del piso). */
  private drawWindowBalcony(g: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean, color: number): void {
    const w = 52, h = 44;
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
    // Balcón
    const by = y + h + 4;
    g.fillStyle(0xd8cdb4, 1);
    g.fillRoundedRect(x - 6, by, w + 12, 6, 3);
    this.drawRailing(g, x - 6, by + 6, w + 12, color);
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

    // Cartel de madera del nivel (izquierda, sin tocar la placa de paciencia)
    makeWoodSign(this, 228, 44, 296, 74);
    makeText(this, 228, 22, `Nivel ${this.level.id} · ${this.level.title}`, 18, '#ffffff').setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);
    this.progressText = makeText(this, 228, 46, '', 14, '#ffe8c2', false);
    this.distText = makeText(this, 228, 66, '', 14, '#ffffff', false);

    // Placa de paciencia con estrellas (arriba a la derecha)
    const sg = this.add.graphics();
    sg.fillStyle(0x7c4f24, 1);
    sg.fillRoundedRect(W - 150, 8, 142, 54, 12);
    sg.fillStyle(0xfff3d6, 1);
    sg.fillRoundedRect(W - 146, 12, 134, 46, 10);
    makeText(this, W - 79, 22, 'PACIENCIA', 10, '#a06a35', false);
    this.patienceStars = [];
    for (let i = 0; i < MAX_MISTAKES; i++) {
      const s = this.add.image(W - 116 + i * 36, 44, 'star').setScale(0.5);
      this.patienceStars.push(s);
    }

    // Corazones de vida (desde el nivel 15) y temporizador, DEBAJO del cartel.
    this.livesIcons = [];
    if (this.useHearts) {
      for (let i = 0; i < 3; i++) {
        const h = this.add.image(30 + i * 34, 96, 'heart').setScale(0.62);
        this.livesIcons.push(h);
      }
      if (isPremium(this.save)) makeText(this, 30 + 3 * 34 + 4, 96, '∞', 22, '#ef4444');
    }
    this.timeText = makeText(this, 210, 96, `${this.timeLeft}s`, 16, '#6b4423', false);
    this.timeBar = this.add.graphics();
    this.refreshTimerBar();
  }

  /** Temporizador: cuenta atrás, música tensa a los 10s, fin de tiempo. */
  private startTimer(): void {
    this.timerEvent?.remove();
    this.timerEvent = this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        if (this.won || this.paused || this.repairing || this.reseActive) return;
        this.timeLeft--;
        this.timeText.setText(`${Math.max(0, this.timeLeft)}s`);
        this.timeText.setColor(this.timeLeft <= 10 ? '#ef4444' : '#6b4423');
        this.refreshTimerBar();
        if (this.timeLeft === 10) {
          audio.tension();
          this.showBubble('¡Solo quedan 10 segundos!', CAB_X, 200, 1800);
        }
        if (this.timeLeft <= 0) this.timeOut();
      },
    });
  }

  private refreshTimerBar(): void {
    const total = this.level.timeLimit;
    const frac = Math.max(0, this.timeLeft / total);
    this.timeBar.clear();
    this.timeBar.fillStyle(0x000000, 0.12);
    this.timeBar.fillRoundedRect(150, 104, 120, 8, 4);
    this.timeBar.fillStyle(this.timeLeft <= 10 ? 0xef4444 : 0x4ade80, 1);
    this.timeBar.fillRoundedRect(150, 104, 120 * frac, 8, 4);
  }

  private timeOut(): void {
    if (this.won) return;
    this.timerEvent?.remove();
    audio.wrong();
    this.failLevel('¡Se acabó el tiempo!');
  }

  /** Gasta un corazón global; sin corazones, panel de espera/anuncio/premium. */
  private loseLife(reason: string): void {
    if (!this.useHearts) return;
    if (isPremium(this.save)) {
      this.showBubble(`${reason} (Premium: corazones infinitos)`, CAB_X, 300, 1800);
      return;
    }
    this.lives = spendHeart(this.save);
    writeSave(this.save);
    audio.wrong();
    if (this.save.settings.vibration) vibrate([80, 40, 80]);
    this.livesIcons.forEach((h) => this.tweens.add({ targets: h, scale: 1.0, duration: 80, yoyo: true, onStart: () => h.setScale(0.4) }));
    this.livesIcons.forEach((h, i) => h.setTint(i < this.lives ? 0xffffff : 0x555555));
    this.flashVignette();
    if (this.lives <= 0) {
      this.won = true; // bloquea la entrada mientras se decide qué hacer
      openOutOfLives(this, this.save, {
        onExit: () => this.scene.start('levels'),
        onRefilled: () => {
          this.won = false;
          this.lives = this.save.hearts;
          this.livesIcons.forEach((h, i) => h.setTint(i < this.lives ? 0xffffff : 0x555555));
          this.showBubble('¡Corazones recargados! Sigue jugando.', CAB_X, 300, 2000);
        },
      });
    } else {
      this.showBubble(`${reason} Te quedan ${this.lives} corazones.`, CAB_X, 300, 2200);
    }
  }

  private failLevel(reason = '¡Nivel fallado!'): void {
    if (this.won) return;
    this.won = true; // bloquea la entrada
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 420, 360));
    c.add(makeText(this, W / 2, H / 2 - 120, reason, 32, '#ef4444'));
    c.add(makeText(this, W / 2, H / 2 - 70, 'No te rindas, recepcionista.', 18, '#6b4423', false));
    c.add(makeText(this, W / 2, H / 2 - 40, 'Tus monedas y niveles se conservan.', 16, '#6b4423', false));
    const retry = makeButton(this, W / 2, H / 2 + 30, 260, 58, 'REINTENTAR', {
      fontSize: 22,
      onClick: () => this.scene.restart({ levelId: this.level.id }),
    });
    const menu = makeButton(this, W / 2, H / 2 + 104, 260, 54, 'NIVELES', {
      bg: COLORS.purple, fontSize: 20,
      onClick: () => this.scene.start('levels'),
    });
    c.add([retry, menu]);
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
    g.fillRoundedRect(414, 112, 116, 676, 16);
    g.fillStyle(0xfff3d6, 1);
    g.fillRoundedRect(410, 106, 116, 676, 16);
    g.lineStyle(5, 0xa06a35, 1);
    g.strokeRoundedRect(410, 106, 116, 676, 16);
    makeText(this, PANEL_X, 122, 'ASCENSOR', 15, '#a06a35');
    this.panelFloorText = makeText(this, PANEL_X, 142, 'Piso: 0', 14, '#e07b2a', false);

    const floors: number[] = [];
    for (let f = N; f >= 1; f--) floors.push(f);
    floors.push(0);
    floors.forEach((f) => {
      const x = PANEL_X;
      const y = this.panelButtonY(f);
      const w = 104, h = 58;
      const bg = this.add.graphics();
      const badgeBg = this.add.graphics();
      const badge = makeText(this, x + w / 2 - 12, y - h / 2 + 10, '', 13, '#6b4423');
      const label = makeText(this, x, y, f === 0 ? 'Piso 0' : `${f}`, f === 0 ? 18 : 24, '#ffffff');
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

    // Cuerpo de cristal estilo caricatura: marco grueso + reflejos
    const body = this.add.graphics();
    // Marco exterior (borde grueso blanco estilo dibujos animados)
    body.fillStyle(0xffffff, 1);
    body.fillRoundedRect(-CAB_W / 2 - 3, -CAB_H / 2 - 3, CAB_W + 6, CAB_H + 6, 28);
    // Cristal interior con degradado
    body.fillGradientStyle(0xdff4ff, 0xdff4ff, 0xa8dcf5, 0xa8dcf5, 0.85, 0.85, 0.7, 0.7);
    body.fillRoundedRect(-CAB_W / 2, -CAB_H / 2, CAB_W, CAB_H, 26);
    // Reflejo diagonal grande
    body.fillStyle(0xffffff, 0.45);
    body.fillTriangle(-CAB_W / 2 + 8, CAB_H / 2 - 10, -CAB_W / 2 + 30, -CAB_H / 2 + 8, -CAB_W / 2 + 44, -CAB_H / 2 + 8);
    body.fillTriangle(-CAB_W / 2 + 8, CAB_H / 2 - 10, -CAB_W / 2 + 44, -CAB_H / 2 + 8, -CAB_W / 2 + 44, CAB_H / 2 - 24);
    // Brillo pequeño en la esquina
    body.fillStyle(0xffffff, 0.7);
    body.fillCircle(CAB_W / 2 - 16, -CAB_H / 2 + 14, 5);
    body.fillCircle(CAB_W / 2 - 24, -CAB_H / 2 + 20, 3);
    this.cab.add(body);

    // Puertas de cristal correderas con marco
    const drawDoor = (side: number): Phaser.GameObjects.Graphics => {
      const d = this.add.graphics();
      const dx = side * (CAB_W / 4) - CAB_W / 4;
      // Marco de la puerta
      d.fillStyle(0xffffff, 0.95);
      d.fillRoundedRect(dx - 2, -CAB_H / 2 + 2, CAB_W / 2 + 4, CAB_H - 4, 12);
      // Cristal de la puerta
      d.fillGradientStyle(0xeaf7ff, 0xeaf7ff, 0xbfe8ff, 0xbfe8ff, 0.7, 0.7, 0.55, 0.55);
      d.fillRoundedRect(dx, -CAB_H / 2 + 4, CAB_W / 2, CAB_H - 8, 10);
      // Reflejo en la puerta
      d.fillStyle(0xffffff, 0.5);
      d.fillEllipse(dx + CAB_W / 4 - 6, -CAB_H / 2 + 20, 10, 22);
      // Tirador
      d.fillStyle(0x8a7a5a, 1);
      d.fillRoundedRect(side < 0 ? dx + CAB_W / 2 - 10 : dx + 4, -8, 6, 16, 3);
      return d;
    };
    this.doorL = drawDoor(-1);
    this.doorR = drawDoor(1);
    this.cab.add([this.doorL, this.doorR]);

    // Base con el color elegido (skin del ascensor)
    const elevColor = getCustomOption('elevator', this.save.custom.elevator).color;
    const base = this.add.graphics();
    base.fillStyle(elevColor, 1);
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

    // Tapa superior gris + gancho del cable
    const cap = this.add.graphics();
    cap.fillStyle(0x8a7a5a, 1);
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
    this.indicator = makeText(this, 0, -CAB_H / 2 - 18, '0', 16, '#a06a35');
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
    // Se guarda el índice original de cada grupo para mapear parejas/enemigos.
    const groups: Array<{ monsterId: string; dest: number; slots: number; orig: number[] }> = [];
    const twinDest = this.level.passengers.filter((p) => p.m === TWIN_GROUP);
    this.level.passengers.forEach((p, idx) => {
      if (p.m === TWIN_GROUP) return;
      const def = MONSTER_MAP[p.m];
      groups.push({ monsterId: p.m, dest: p.d, slots: def.slots, orig: [idx] });
    });
    if (twinDest.length > 0) {
      const def = MONSTER_MAP[TWIN_GROUP];
      const orig = this.level.passengers.map((p, i) => (p.m === TWIN_GROUP ? i : -1)).filter((i) => i >= 0);
      groups.push({ monsterId: TWIN_GROUP, dest: twinDest[0].d, slots: def.slots * twinDest.length, orig });
    }

    // Mapear índices originales -> id de pasajero (para parejas y enemigos).
    const origToId = new Map<number, number>();
    groups.forEach((grp, gi) => grp.orig.forEach((oi) => origToId.set(oi, gi)));
    for (const [a, b] of this.level.couples) {
      const ia = origToId.get(a), ib = origToId.get(b);
      if (ia !== undefined && ib !== undefined) {
        this.coupleOf.set(ia, ib);
        this.coupleOf.set(ib, ia);
      }
    }
    for (const [a, b] of this.level.enemies) {
      const ia = origToId.get(a), ib = origToId.get(b);
      if (ia !== undefined && ib !== undefined) {
        if (!this.enemiesOf.has(ia)) this.enemiesOf.set(ia, []);
        if (!this.enemiesOf.has(ib)) this.enemiesOf.set(ib, []);
        this.enemiesOf.get(ia)!.push(ib);
        this.enemiesOf.get(ib)!.push(ia);
      }
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

      // Indicador de pareja: corazón rosa junto a la insignia
      if (this.coupleOf.has(i)) {
        const heart = this.add.image(20, -38, 'heart').setScale(0.55);
        container.add(heart);
      }
      // Indicador de enemigo: rayo de enojo
      if (this.enemiesOf.has(i)) {
        const bolt = this.add.image(-20, -38, 'sparkle').setScale(0.7).setTint(0xef4444);
        container.add(bolt);
      }

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
      const x = W / 2 + (idxInRow - (countInRow - 1) / 2) * 52;
      const y = rows === 1 ? 872 : 842 + row * 56;
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
      3: [-28, 0, 28],
      4: [-33, -11, 11, 33],
    };
    const xs = slotsX[cap] ?? [-28, 0, 28];
    return { x: xs[Math.min(index, xs.length - 1)], y: 12 };
  }

  // ── Interacción ──────────────────────────────────────────────────────────
  private onPassengerTap(p: Passenger): void {
    if (this.won || this.paused || this.moving || this.reseActive) return;
    audio.ensure();

    if (p.state === 'queue') {
      if (this.elevatorFloor !== 0) {
        audio.error();
        this.showBubble('¡Primero vuelve a recepción!', CAB_X, this.cab.y - 90);
        return;
      }
      if (!this.doorsOpen) return;
      const onboard = this.onboard();
      if (p.def.rule === 'shy' && onboard.length > 0) {
        audio.error();
        this.showBubble('Sombrín quiere viajar solo', CAB_X, this.cab.y - 90);
        return;
      }
      if (onboard.some((o) => o.def.rule === 'shy')) {
        audio.error();
        this.showBubble('Sombrín quiere viajar solo', CAB_X, this.cab.y - 90);
        return;
      }
      // Enemigos: PUEDEN subir juntos, pero resta 1 estrella (para aprender).
      const myEnemies = this.enemiesOf.get(p.id) ?? [];
      if (myEnemies.some((e) => onboard.some((o) => o.id === e))) {
        const forgiveNow = !this.forgiven;
        if (forgiveNow) this.forgiven = true;
        else this.ruleBreaks++;
        audio.error();
        this.setMood(p, 'angry');
        this.showBubble(pickLine(ENEMY_LINES), p.container.x, p.container.y - 70, 2000);
        this.showBubble(forgiveNow ? '¡Esos dos se odian! Rese te perdona esta vez' : '¡Esos dos se odian! -1 estrella', CAB_X, this.cab.y - 90, 2000);
        this.tweens.add({ targets: p.image, x: 4, duration: 60, yoyo: true, repeat: 3 });
        this.time.delayedCall(1500, () => this.setMood(p, 'happy'));
        // No se bloquea: el jugador aprende con la consecuencia.
        if (forgiveNow) this.reseSay('forg_enemy');
      }
      if (this.usedSlots() + p.slots > this.level.capacity) {
        audio.error();
        this.showBubble('¡Ascensor lleno!', CAB_X, this.cab.y - 90);
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
    p.asleep = false;
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
    if (this.won || this.paused || this.moving || this.reseActive) return;
    audio.ensure();
    if (f === this.elevatorFloor) return;
    const onboard = this.onboard();
    if (onboard.length === 0 && f !== 0) {
      audio.error();
      this.showBubble('¡Sube monstruos primero!', CAB_X, this.cab.y - 90);
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
          this.indicator.setText(nearest === 0 ? '0' : `${nearest}`);
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
    this.indicator.setText(f === 0 ? '0' : `${f}`);
    this.panelFloorText.setText(f === 0 ? 'Piso: 0' : `Piso: ${f}`);
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
    // Parejas: si solo subió uno, se separa (pierde 1 estrella) y sale triste.
    const separated: Passenger[] = [];
    const exiters = arriving.filter((p) => {
      if (p.def.rule === 'sleepwalker') return false;
      const partnerId = this.coupleOf.get(p.id);
      if (partnerId !== undefined) {
        const partner = this.passengers.find((q) => q.id === partnerId);
        if (partner && partner.state !== 'onboard') {
          separated.push(p);
          return true; // sale, pero triste
        }
      }
      return true;
    });
    if (separated.length > 0) {
      const forgiveNow = !this.forgiven;
      if (forgiveNow) this.forgiven = true;
      else this.separations++;
      audio.wrong();
      separated.forEach((p) => {
        this.setMood(p, 'angry');
        this.showBubble(pickLine(SEPARATED_LINES, p.dest), p.container.x, p.container.y - 70, 2200);
      });
      this.showBubble(forgiveNow ? '¡Separaste una pareja! Rese te perdona esta vez' : '¡Separaste una pareja! -1 estrella', CAB_X, this.cab.y - 90, 2200);
      if (forgiveNow) this.reseSay('forg_couple');
    }

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
    const forgiveNow = !this.forgiven;
    if (forgiveNow) { this.forgiven = true; this.forgiveMoves = 2; }
    this.mistakes++;
    audio.wrong();
    if (this.save.settings.vibration) vibrate([60, 40, 60]);
    this.cameras.main.shake(220, 0.006);
    this.flashVignette();
    this.showWrongText();
    if (forgiveNow) this.reseSay('forg_wrong');

    const mood = moodForMistakes(this.mistakes);
    this.onboard().forEach((p) => {
      this.setMood(p, mood);
      this.tweens.add({ targets: p.image, x: 5, duration: 60, yoyo: true, repeat: 5 });
    });
    this.refreshHud();

    // Desde el nivel 15, cada piso equivocado cuesta un corazón.
    if (this.level.lives > 0) {
      this.loseLife('¡Piso equivocado!');
      if (this.lives <= 0) return; // nivel fallado
    }

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
    this.showBubble('¡Se bajaron molestos! Sube a otros monstruos.', CAB_X, this.cab.y - 90, 2200);
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
    // Mensaje de llegada personalizado según su categoría.
    const line = arrivalLine(p.def.kind, p.dest);
    this.showBubble(line, p.container.x, p.container.y - 70, 1800);
    const exitX = p.id % 2 === 0 ? BUILD_LEFT + 58 : BUILD_LEFT + 172;
    const exitY = this.bandBottom(this.elevatorFloor) - 30;
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
    this.distText.setText(`Distancia ${this.distance} · Óptima ${this.optimal}`);
    this.progressText.setText(`Entregados ${this.delivered}/${this.passengers.length} · Ascensor ${this.usedSlots()}/${this.level.capacity}`);
    this.refreshPatience();
  }

  private refreshFloorButtons(): void {
    const onboard = this.onboard();
    this.floorButtons.forEach((btn, f) => {
      const count = onboard.filter((p) => p.dest === f).length;
      const isCurrent = f === this.elevatorFloor;
      const x = PANEL_X;
      const y = this.panelButtonY(f);
      const w = 104, h = 58;
      btn.g.clear();
      btn.g.fillStyle(0x000000, 0.12);
      btn.g.fillRoundedRect(x - w / 2, y - h / 2 + 3, w, h, 12);
      if (f === 0) {
        btn.g.fillStyle(0xffffff, 1); // Piso 0: blanco como los demás
      } else if (count > 0) {
        btn.g.fillStyle(floorColor(f), 1);
      } else if (isCurrent) {
        btn.g.fillStyle(0x4ade80, 1);
      } else {
        btn.g.fillStyle(0xffffff, 1); // Blanco con borde del color del piso
      }
      btn.g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      btn.g.fillStyle(0xffffff, 0.25);
      btn.g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 2, w - 6, h * 0.36, 8);
      const borderColor = f === 0 ? 0x8a7a5a : floorColor(f);
      btn.g.lineStyle(isCurrent ? 4 : 3, isCurrent ? 0x2f9e44 : borderColor, isCurrent ? 1 : 0.9);
      btn.g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      // Número: blanco sobre color, color del piso (o negro en Piso 0) sobre blanco
      const colored = f !== 0 && (count > 0 || isCurrent);
      btn.label.setColor(colored ? '#ffffff' : f === 0 ? '#241640' : Phaser.Display.Color.IntegerToColor(floorColor(f)).rgba);
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

  /** Y del botón de un piso en el tablero (alineado con el edificio). */
  private panelButtonY(f: number): number {
    if (f === 0) return 740;
    return this.bandBottom(f) - this.fh() / 2;
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
        this.showBubble('¡Púlsalos para que entren!', 270, 600, 5000);
      } else if (this.onboard().length > 0 && this.elevatorFloor === 0) {
        this.showBubble('¡Ahora toca el piso del globo!', 270, 600, 4000);
      } else if (this.elevatorFloor !== 0 && this.onboard().length > 0) {
        this.showBubble('¡Buen viaje!', 270, 600, 3000);
      } else if (this.delivered > 0 && this.onboard().length === 0 && this.elevatorFloor === 0) {
        this.showBubble('¡Bien! Sube a los demás', 270, 600, 4000);
      }
      return;
    }
    if (this.elevatorFloor !== 0 && this.onboard().length === 0 && queueCount > 0) {
      this.showBubble('¡Vuelve a recepción!', 270, 600, 3000);
    } else if (this.elevatorFloor === 0 && queueCount > 0 && this.onboard().length === 0) {
      this.showBubble('¡Púlsalos para que entren!', 270, 600, 4000);
    } else if (this.onboard().length > 0) {
      this.showBubble('¡Toca el piso de los globos!', 270, 600, 3000);
    }
  }

  /** Bocadillo de estrella (estilo cómic) para avisos y pistas. */
  private showBubble(text: string, x: number, y: number, duration = 1600): void {
    this.bubbleText.setText(text);
    const w = Math.min(320, this.bubbleText.width + 48);
    const h = Math.max(56, this.bubbleText.height + 36);
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
    this.bubbleBg.lineStyle(3, 0x241640, 1);
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
    this.bubbleText = this.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      color: '#6b4423',
      align: 'center',
      wordWrap: { width: 250 },
    }).setOrigin(0.5);
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
    c.add(makePanel(this, W / 2, H / 2, 380, 450));
    c.add(makeText(this, W / 2, H / 2 - 170, 'PAUSA', 34, '#a06a35'));
    const resume = makeButton(this, W / 2, H / 2 - 85, 260, 56, 'CONTINUAR', {
      fontSize: 22, onClick: () => { this.paused = false; c.destroy(); },
    });
    const restart = makeButton(this, W / 2, H / 2 - 12, 260, 56, 'REINICIAR', {
      bg: COLORS.mintDark, fontSize: 22,
      onClick: () => { this.paused = false; this.scene.restart({ levelId: this.level.id }); },
    });
    const exit = makeButton(this, W / 2, H / 2 + 61, 260, 56, 'SALIR', {
      bg: COLORS.purple, fontSize: 22,
      onClick: () => { this.paused = false; this.scene.start('levels'); },
    });
    const rese = makeButton(this, W / 2, H / 2 + 134, 260, 56, 'RESE TE EXPLICA', {
      bg: COLORS.accent, fontSize: 20,
      onClick: () => { this.paused = false; c.destroy(); this.reseSay(this.tutorialKey); },
    });
    c.add([resume, restart, exit, rese]);
  }

  // ── Avería del ascensor + minijuego de reparación ──────────────────────
  private maybeBreakdown(): void {
    if (this.level.breakdownChance <= 0) return;
    // La avería ocurre tras el primer viaje (no al inicio).
    this.time.delayedCall(8000, () => {
      if (this.won || this.paused || this.breakdownDone) return;
      if (Math.random() < this.level.breakdownChance) this.triggerBreakdown();
    });
  }

  private triggerBreakdown(): void {
    this.breakdownDone = true;
    this.repairing = true;
    audio.breakdown();
    this.cameras.main.shake(200, 0.005);
    this.showBubble('¡El ascensor se averió! ¡Hay que repararlo!', CAB_X, 300, 2600);
    this.time.delayedCall(1200, () => this.openRepair());
  }

  /** Minijuego: gira los 3 engranajes hasta que todos los marcadores apunten arriba. */
  private openRepair(): void {
    const c = this.add.container(0, 0).setDepth(95);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    c.add(dim);
    c.add(makePanel(this, W / 2, H / 2, 440, 460));
    c.add(makeText(this, W / 2, H / 2 - 190, '¡REPARA EL ASCENSOR!', 26, '#ef4444'));
    c.add(makeText(this, W / 2, H / 2 - 150, 'Toca cada engranaje para girarlo.', 16, '#6b4423', false));
    c.add(makeText(this, W / 2, H / 2 - 124, 'Alinea los marcadores hacia arriba.', 16, '#6b4423', false));

    const gears: Array<{ g: Phaser.GameObjects.Graphics; rot: number; x: number; y: number }> = [];
    const gearPos = [
      { x: W / 2 - 110, y: H / 2 - 20 },
      { x: W / 2, y: H / 2 - 20 },
      { x: W / 2 + 110, y: H / 2 - 20 },
    ];
    const drawGear = (g: Phaser.GameObjects.Graphics, rot: number) => {
      g.clear();
      g.fillStyle(0x8a7a5a, 1);
      g.fillCircle(0, 0, 34);
      g.fillStyle(0xa06a35, 1);
      for (let i = 0; i < 8; i++) {
        const a = rot + (i / 8) * Math.PI * 2;
        g.fillRect(Math.cos(a) * 34 - 5, Math.sin(a) * 34 - 5, 10, 10);
      }
      g.fillStyle(0xfff3d6, 1);
      g.fillCircle(0, 0, 12);
      // Marcador que debe apuntar arriba (rotación 0 = arriba)
      g.fillStyle(0xef4444, 1);
      g.fillTriangle(-6, -20, 6, -20, 0, -34);
    };
    gearPos.forEach((pos, i) => {
      const g = this.add.graphics();
      g.setPosition(pos.x, pos.y);
      const rot = (Math.floor(Math.random() * 4)) * (Math.PI / 2);
      drawGear(g, rot);
      gears.push({ g, rot, x: pos.x, y: pos.y });
      c.add(g);
      const zone = this.add.zone(pos.x, pos.y, 90, 90).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        const gear = gears[i];
        gear.rot += Math.PI / 2;
        audio.gear();
        drawGear(gear.g, gear.rot);
        this.tweens.add({ targets: gear.g, angle: gear.g.angle + 90, duration: 150 });
        if (gears.every((gg) => Math.abs(((gg.rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) < 0.01)) {
          audio.repaired();
          this.repairing = false;
          c.destroy();
          this.showBubble('¡Ascensor reparado! ¡A seguir!', CAB_X, 300, 2000);
        }
      });
      c.add(zone);
    });
    c.add(makeText(this, W / 2, H / 2 + 90, 'El cronómetro está en pausa.', 14, '#a06a35', false));
  }

  // ── Burbujas de diálogo de los monstruos en cola ───────────────────────
  private startSpeech(): void {
    this.speechTimer?.remove();
    this.speechTimer = this.time.addEvent({
      delay: 3500, loop: true,
      callback: () => {
        if (this.won || this.paused || this.repairing) return;
        const waiting = this.passengers.filter((p) => p.state === 'queue');
        if (waiting.length === 0) return;
        // Mostrar hasta 2 globos a la vez, sin solaparse (turnos).
        const shuffled = [...waiting].sort(() => Math.random() - 0.5).slice(0, 2);
        shuffled.forEach((p, i) => {
          const line = queueLine(p.def.kind, p.dest);
          this.showBubble(line, p.container.x, p.container.y - 70, 3000);
        });
      },
    });
  }

  // ── Recepcionista Rese: personaje guía ─────────────────────────────────
  // ── Recepcionista Rese: diálogo abajo, letra a letra, clic para continuar ──
  private createReceptionist(): void {
    this.reseOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x1e2a4a, 0.45).setDepth(66).setVisible(false).setInteractive();
    this.reseOverlay.on('pointerdown', () => this.reseAdvance());
    this.reseImg = this.add.image(W / 2, H + 280, 'rese').setDepth(68).setVisible(false);
    this.reseImg.setDisplaySize(400, 400);
    const reseSkin = getCustomOption('rese', this.save.custom.rese);
    if (reseSkin.id !== 'azul') this.reseImg.setTint(reseSkin.color);
    // Caja de diálogo estilo novela visual, abajo.
    this.receptionistBg = this.add.graphics().setDepth(70);
    this.receptionistText = this.add.text(W / 2, 836, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '19px', color: '#1e3a8a',
      align: 'center', wordWrap: { width: 440 },
    }).setOrigin(0.5).setDepth(70);
    this.reseHint = makeText(this, 504, 928, 'haz clic para continuar ▶', 14, '#8a6fd0').setOrigin(1, 0.5).setDepth(71).setVisible(false);
    this.reseSkipBtn = makeButton(this, W - 88, 46, 152, 44, 'SALTAR ▶', {
      bg: COLORS.purple, fontSize: 16, onClick: () => this.hideRese(),
    }).setDepth(72).setVisible(false);
    this.receptionist = this.add.container(0, 0, [this.receptionistBg, this.receptionistText, this.reseHint]).setDepth(70).setVisible(false);
    this.time.delayedCall(800, () => this.showTutorialIfNeeded());
  }

  private drawDialogBox(): void {
    const g = this.receptionistBg;
    g.clear();
    g.fillStyle(0x1e2a4a, 0.3);
    g.fillRoundedRect(30, 744, 492, 208, 20);
    g.fillStyle(0xfff8ea, 0.98);
    g.fillRoundedRect(24, 736, 492, 208, 20);
    g.lineStyle(5, 0x1e3a8a, 1);
    g.strokeRoundedRect(24, 736, 492, 208, 20);
    g.lineStyle(2, 0xffffff, 0.7);
    g.strokeRoundedRect(31, 743, 478, 194, 15);
    // Chip con el nombre
    g.fillStyle(0x1e3a8a, 1);
    g.fillRoundedRect(40, 720, 86, 32, 10);
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeRoundedRect(40, 720, 86, 32, 10);
  }

  /** Explica paso a paso solo en nivel 1 o cuando aparece una mecánica nueva. */
  private showTutorialIfNeeded(): void {
    if (this.tutorialDone || this.won) return;
    const lvl = this.level.id;
    const first = (cond: (l: LevelDef) => boolean): number => LEVELS.find(cond)?.id ?? -1;
    let key: string | null = null;
    if (lvl === 1) key = 'tut1';
    else if (lvl === first((l) => l.couples.length > 0)) key = 'tut_couple';
    else if (lvl === first((l) => l.lives > 0)) key = 'tut_lives';
    else if (lvl === first((l) => l.enemies.length > 0)) key = 'tut_enemies';
    else if (lvl === first((l) => l.passengers.some((p) => MONSTER_MAP[p.m].rule === 'luggage'))) key = 'tut_luggage';
    else if (lvl === first((l) => l.breakdownChance > 0)) key = 'tut_break';
    if (key) {
      this.tutorialDone = true;
      this.tutorialKey = key;
      this.reseSay(key);
    }
  }

  /** Rese sube desde abajo y habla: texto letra a letra y clic para continuar. */
  private reseSay(key: string): void {
    if (this.reseActive || this.won) return;
    const clip = RESE_VOICE[key];
    if (!clip) return;
    this.reseClipKey = key;
    this.reseActive = true;
    this.lineIdx = -1;
    this.lineReady = true;
    this.reseOverlay.setAlpha(0.45).setVisible(true);
    this.receptionist.setVisible(true);
    this.drawDialogBox();
    this.reseImg.setVisible(true);
    this.reseSkipBtn.setVisible(true);
    this.tweens.killTweensOf(this.reseImg);
    this.tweens.add({
      targets: this.reseImg, y: 560, duration: 650, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: this.reseImg, y: 572, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
    // Voz de Rese con Web Audio directo (control exacto por línea).
    this.initReseAudio(key);
    this.reseAdvance();
  }

  /** Un clic: completa la línea actual; otro clic: pasa a la siguiente. */
  private reseAdvance(): void {
    if (!this.reseActive) return;
    if (!this.lineReady) {
      this.typeEvent?.remove();
      this.segEvent?.remove();
      this.receptionistText.setText(this.fullLine);
      this.stopReseAudio();
      this.lineReady = true;
      this.reseHint.setVisible(true);
      this.blinkHint();
      return;
    }
    this.lineIdx++;
    const clip = RESE_VOICE[this.reseClipKey];
    if (this.lineIdx >= clip.lines.length) { this.hideRese(); return; }
    this.showReseLine(this.lineIdx);
  }

  private showReseLine(i: number): void {
    const clip = RESE_VOICE[this.reseClipKey];
    this.fullLine = clip.lines[i];
    this.lineReady = false;
    this.tweens.killTweensOf(this.reseHint);
    this.reseHint.setAlpha(1).setVisible(false);
    this.typeEvent?.remove();
    this.receptionistText.setText('');
    let n = 0;
    this.typeEvent = this.time.addEvent({
      delay: 24, loop: true,
      callback: () => {
        n += 1;
        this.receptionistText.setText(this.fullLine.slice(0, n));
        if (n >= this.fullLine.length) this.typeEvent?.remove();
      },
    });
    // La voz salta a esta línea y se pausa al terminarla: espera el clic del niño.
    this.playReseFrom(clip.t[i]);
    const seg = (i + 1 < clip.t.length ? clip.t[i + 1] : clip.dur) - clip.t[i];
    this.segEvent?.remove();
    this.segEvent = this.time.delayedCall(Math.max(500, seg * 1000 - 120), () => {
      if (!this.reseActive || this.lineReady) return;
      this.typeEvent?.remove();
      this.receptionistText.setText(this.fullLine);
      this.stopReseAudio();
      this.lineReady = true;
      this.reseHint.setVisible(true);
      this.blinkHint();
    });
  }

  /** Prepara el buffer de voz de Rese y el volumen según ajustes. */
  private initReseAudio(key: string): void {
    const sm = this.sound as Phaser.Sound.WebAudioSoundManager;
    const ctx = sm.context;
    if (ctx.state === 'suspended') void ctx.resume();
    this.reseBuf = this.cache.audio.get(key) as AudioBuffer | undefined;
    if (!this.reseGain) {
      this.reseGain = ctx.createGain();
      this.reseGain.connect(ctx.destination);
    }
    this.reseGain.gain.value = this.save.settings.sound ? 0.9 : 0;
  }

  /** Reproduce la voz de Rese desde un segundo exacto del clip. */
  private playReseFrom(sec: number): void {
    this.stopReseAudio();
    if (!this.reseBuf || !this.reseGain) return;
    const sm = this.sound as Phaser.Sound.WebAudioSoundManager;
    const src = sm.context.createBufferSource();
    src.buffer = this.reseBuf;
    src.connect(this.reseGain);
    src.start(0, sec);
    this.reseSrc = src;
  }

  private stopReseAudio(): void {
    try { this.reseSrc?.stop(); } catch { /* ya detenido */ }
    this.reseSrc = undefined;
  }

  private blinkHint(): void {
    this.tweens.killTweensOf(this.reseHint);
    this.reseHint.setAlpha(1);
    this.tweens.add({ targets: this.reseHint, alpha: 0.35, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private hideRese(): void {
    if (!this.reseActive) return;
    this.reseActive = false;
    this.typeEvent?.remove();
    this.segEvent?.remove();
    this.stopReseAudio();
    this.tweens.killTweensOf(this.reseHint);
    this.reseHint.setAlpha(1).setVisible(false);
    this.receptionist.setVisible(false);
    this.reseSkipBtn.setVisible(false);
    this.tweens.killTweensOf(this.reseImg);
    this.tweens.add({ targets: this.reseImg, y: H + 280, duration: 500, ease: 'Back.easeIn', onComplete: () => this.reseImg.setVisible(false) });
    this.tweens.add({ targets: this.reseOverlay, alpha: 0, duration: 400, onComplete: () => this.reseOverlay.setVisible(false) });
  }

  private win(): void {
    if (this.won) return;
    this.won = true;
    audio.victory();
    const effDistance = Math.max(this.optimal, this.distance - this.forgiveMoves);
    let stars = starsFor(effDistance, this.optimal);
    // Cada regla rota (pareja separada, enemigos juntos) resta 1 estrella.
    const penalties = this.separations + this.ruleBreaks;
    stars = Math.max(1, stars - penalties);
    const perfect = isPerfect(effDistance, this.optimal) && penalties === 0;
    const record = isRecord(effDistance, this.optimal) && penalties === 0;
    const prevStars = this.save.stars[this.level.id] ?? 0;
    const earned = stars > prevStars ? coinsFor(stars, perfect, record) : 2;

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

    // ── Celebración excéntrica estilo cartel de feria ──
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0).setInteractive();
    c.add(dim);
    // Rayos de sol girando detrás del panel
    const rays = this.add.graphics();
    rays.fillStyle(0xffd678, 0.16);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.beginPath();
      rays.moveTo(W / 2, H / 2);
      rays.lineTo(W / 2 + Math.cos(a) * 900, H / 2 + Math.sin(a) * 900);
      rays.lineTo(W / 2 + Math.cos(a + 0.26) * 900, H / 2 + Math.sin(a + 0.26) * 900);
      rays.closePath();
      rays.fillPath();
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 26000, repeat: -1 });
    c.add(rays);
    // Panel beige con sombra y doble borde
    const panel = this.add.graphics();
    panel.fillStyle(0xd4b58c, 0.55);
    panel.fillRoundedRect(W / 2 - 185 + 7, H / 2 - 268 + 11, 380, 545, 26);
    panel.fillStyle(0xfcf5e3, 1);
    panel.fillRoundedRect(W / 2 - 185, H / 2 - 268, 380, 545, 26);
    panel.lineStyle(4, 0xd4b58c, 1);
    panel.strokeRoundedRect(W / 2 - 185, H / 2 - 268, 380, 545, 26);
    panel.lineStyle(3, 0xffffff, 0.85);
    panel.strokeRoundedRect(W / 2 - 176, H / 2 - 259, 362, 527, 20);
    c.add(panel);
    c.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });

    const title = this.add.text(W / 2, H / 2 - 226, '¡NIVEL COMPLETADO!', {
      fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '33px', color: '#FDBB2D',
      stroke: '#6D3A14', strokeThickness: 10,
    }).setOrigin(0.5);
    title.setShadow(0, 4, '#6D3A14', 0, true, true);
    c.add(title);
    this.tweens.add({ targets: title, scale: 1.06, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Estrellas gorditas que aparecen una a una con explosión de brillos
    for (let i = 0; i < 3; i++) {
      const filled = i < stars;
      const sx = W / 2 + (i - 1) * 95;
      const sy = H / 2 - 132 + (i === 1 ? -26 : 0);
      const star = this.add.graphics();
      drawChunkyStar(star, filled);
      star.setPosition(sx, sy);
      star.setAngle(i === 0 ? -15 : i === 2 ? 15 : 0);
      star.setScale(0.01);
      c.add(star);
      this.time.delayedCall(500 + i * 380, () => {
        if (filled) audio.star(i);
        this.tweens.add({ targets: star, scale: 1, duration: 420, ease: 'Back.easeOut' });
        if (filled) this.starBurst(sx, sy);
      });
    }

    // Paneles de estadísticas: pasos y monedas
    const stats = this.add.graphics();
    stats.fillStyle(0xece0d1, 1);
    stats.fillRoundedRect(W / 2 - 160, H / 2 - 54, 150, 70, 16);
    stats.fillRoundedRect(W / 2 + 10, H / 2 - 54, 150, 70, 16);
    c.add(stats);
    const elev = this.add.graphics();
    elev.fillStyle(0xba8b62, 1);
    elev.fillRoundedRect(W / 2 - 148, H / 2 - 44, 36, 46, 6);
    elev.lineStyle(3, 0x6d3a14, 1);
    elev.strokeRoundedRect(W / 2 - 148, H / 2 - 44, 36, 46, 6);
    elev.fillStyle(0x6d3a14, 1);
    elev.fillTriangle(W / 2 - 130, H / 2 - 36, W / 2 - 135, H / 2 - 29, W / 2 - 125, H / 2 - 29);
    elev.fillTriangle(W / 2 - 130, H / 2 - 2, W / 2 - 135, H / 2 - 9, W / 2 - 125, H / 2 - 9);
    elev.fillRect(W / 2 - 132, H / 2 - 29, 4, 20);
    c.add(elev);
    const coinIco = this.add.graphics();
    coinIco.fillStyle(0xe5a91a, 1);
    coinIco.fillCircle(W / 2 + 40, H / 2 - 19, 22);
    coinIco.fillStyle(0xffd700, 1);
    coinIco.fillCircle(W / 2 + 40, H / 2 - 19, 17);
    coinIco.fillStyle(0xffeca3, 0.8);
    coinIco.fillEllipse(W / 2 + 40, H / 2 - 26, 14, 6);
    c.add(coinIco);
    const stepsT = this.add.text(W / 2 - 102, H / 2 - 19, `PASOS: ${this.distance}`, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '19px', color: '#5C3A21',
    }).setOrigin(0, 0.5);
    const coinsT = this.add.text(W / 2 + 70, H / 2 - 19, `+${earned}`, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '24px', color: '#5C3A21',
    }).setOrigin(0, 0.5);
    c.add([stepsT, coinsT]);
    this.tweens.add({ targets: stepsT, x: W / 2 - 96, duration: 500, delay: 700, ease: 'Back.easeOut' });
    this.tweens.add({ targets: coinsT, x: W / 2 + 76, duration: 500, delay: 800, ease: 'Back.easeOut' });

    let banner = '';
    let bannerColor = '#2f9e44';
    if (record) banner = '¡RÉCORD! Superaste el óptimo: +150 monedas';
    else if (perfect) banner = '¡PERFECTO! Ruta óptima: +50 monedas';
    if (penalties > 0) { banner = `Reglas rotas: ${penalties} (-${penalties} estrella)`; bannerColor = '#ef4444'; }
    if (banner) c.add(makeText(this, W / 2, H / 2 + 34, banner, 16, bannerColor, false));
    if (newMonsters.length > 0) {
      const names = newMonsters.map((id) => MONSTER_MAP[id].name).join(', ');
      c.add(makeText(this, W / 2, H / 2 + 58, `¡Nuevo en el álbum: ${names}!`, 15, '#2f9e44', false));
    }

    // Botones 3D jugosos con iconos
    const isLast = this.level.id >= 30;
    this.juicyButton(c, W / 2, H / 2 + 116, 0xd66200, 0xff9500, isLast ? 'VER NIVELES' : 'SIGUIENTE', 'play', () => {
      if (isLast) this.scene.start('levels');
      else this.scene.restart({ levelId: this.level.id + 1 });
    });
    this.juicyButton(c, W / 2, H / 2 + 186, 0x1a9c9c, 0x45d1c9, 'REPETIR', 'redo', () => {
      this.scene.restart({ levelId: this.level.id });
    });
    this.juicyButton(c, W / 2, H / 2 + 250, 0x8c5ac8, 0xc495f0, 'NIVELES', 'home', () => {
      this.scene.start('levels');
    });

    // Confeti de iconos kawaii cayendo con giro
    for (let i = 0; i < 36; i++) {
      const tex = ['sparkle', 'heart', 'star', 'coin'][i % 4];
      const conf = this.add.image(Math.random() * W, -30 - Math.random() * 240, tex)
        .setDepth(101).setScale(0.4 + Math.random() * 0.7);
      this.tweens.add({
        targets: conf, y: H + 40, x: conf.x + (Math.random() - 0.5) * 140,
        angle: (Math.random() - 0.5) * 720, duration: 1600 + Math.random() * 1600,
        delay: Math.random() * 700, onComplete: () => conf.destroy(),
      });
    }
  }

  /** Explosión radial de brillos al ganar cada estrella. */
  private starBurst(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const p = this.add.image(x, y, 'sparkle').setDepth(102).setScale(0.5 + Math.random() * 0.6);
      const a = (i / 10) * Math.PI * 2;
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * 74, y: y + Math.sin(a) * 74, alpha: 0, scale: 0.2,
        duration: 520, onComplete: () => p.destroy(),
      });
    }
  }

  /** Botón 3D jugoso (base oscura, cara clara, brillo gelatina) con icono. */
  private juicyButton(
    c: Phaser.GameObjects.Container, x: number, y: number,
    dark: number, light: number, label: string,
    icon: 'play' | 'redo' | 'home', onClick: () => void
  ): void {
    const w = 280; const h = 56; const r = 28;
    const g = this.add.graphics();
    g.fillStyle(0x6d3a14, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2 + 5, w, h, r);
    g.fillStyle(dark, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    g.fillStyle(light, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h - 8, r);
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(x - w / 2 + 10, y - h / 2 + 4, w - 20, 12, 6);
    g.lineStyle(3, 0x6d3a14, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    if (icon === 'play') {
      g.fillStyle(0xffffff, 1);
      g.lineStyle(3, 0x6d3a14, 1);
      g.beginPath();
      g.moveTo(x - 96, y - 12); g.lineTo(x - 76, y); g.lineTo(x - 96, y + 12);
      g.closePath(); g.fillPath(); g.strokePath();
    } else if (icon === 'redo') {
      g.lineStyle(5, 0xffffff, 1);
      g.beginPath();
      g.arc(x - 86, y - 2, 10, Phaser.Math.DegToRad(45), Phaser.Math.DegToRad(315), false);
      g.strokePath();
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(x - 86, y - 17, x - 76, y - 12, x - 81, y - 2);
    } else {
      g.fillStyle(0xffffff, 1);
      g.lineStyle(3, 0x4a296d, 1);
      g.fillTriangle(x - 86, y - 14, x - 98, y - 3, x - 74, y - 3);
      g.fillRect(x - 94, y - 3, 15, 12);
    }
    const t = this.add.text(x + 12, y - 4, label, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '22px', color: '#ffffff',
      stroke: '#6D3A14', strokeThickness: 5,
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    const bc = this.add.container(0, 0, [g, t, zone]);
    zone.on('pointerdown', () => {
      audio.click();
      this.tweens.add({ targets: bc, y: 4, duration: 60 });
    });
    zone.on('pointerup', () => {
      this.tweens.add({ targets: bc, y: 0, duration: 180, ease: 'Back.easeOut' });
      onClick();
    });
    zone.on('pointerout', () => this.tweens.add({ targets: bc, y: 0, duration: 120 }));
    c.add(bc);
  }
}

/** Estrella gordita con contorno grueso y brillo interior. */
function drawChunkyStar(g: Phaser.GameObjects.Graphics, filled: boolean): void {
  g.lineStyle(10, 0x6d3a14, 1);
  g.fillStyle(filled ? 0xffd700 : 0xbdb2a1, 1);
  g.beginPath();
  g.moveTo(0, -35); g.lineTo(12, -12); g.lineTo(38, -10); g.lineTo(18, 8); g.lineTo(25, 33);
  g.lineTo(0, 18); g.lineTo(-25, 33); g.lineTo(-18, 8); g.lineTo(-38, -10); g.lineTo(-12, -12);
  g.closePath();
  g.fillPath();
  g.strokePath();
  if (filled) {
    g.lineStyle(4, 0xffeca3, 0.8);
    g.beginPath();
    g.moveTo(0, -25); g.lineTo(8, -8); g.lineTo(28, -6);
    g.strokePath();
  }
}

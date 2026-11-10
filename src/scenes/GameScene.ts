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
 */

import Phaser from 'phaser';
import { getLevel, LevelDef } from '../data/levels';
import { MONSTER_MAP, MonsterDef, TWIN_GROUP } from '../data/monsters';
import { loadSave, writeSave, SaveData, getCustomOption } from '../systems/save';
import { computeOptimal, starsFor, starThresholds, coinsFor } from '../systems/scoring';
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
const CAB_X = 220;
const CAB_W = 130;
const CAB_H = 96;

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
  private won = false;
  private paused = false;

  private cab!: Phaser.GameObjects.Container;
  private doorL!: Phaser.GameObjects.Graphics;
  private doorR!: Phaser.GameObjects.Graphics;
  private indicator!: Phaser.GameObjects.Text;
  private floorButtons = new Map<number, { g: Phaser.GameObjects.Graphics; badge: Phaser.GameObjects.Text; badgeBg: Phaser.GameObjects.Graphics }>();
  private distText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private capacityText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private bubble!: Phaser.GameObjects.Container;
  private bubbleText!: Phaser.GameObjects.Text;
  private bubbleBg!: Phaser.GameObjects.Graphics;
  private bubbleTimer?: Phaser.Time.TimerEvent;

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
    this.layoutQueue(true);
    this.refreshHud();
    this.refreshFloorButtons();
    this.showSpecialTutorialIfNeeded();

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

  // ── Dibujo del hotel ─────────────────────────────────────────────────────
  private drawHotel(): void {
    const wallpaper = getCustomOption('wallpaper', this.save.custom.wallpaper).color;
    const carpet = getCustomOption('carpet', this.save.custom.carpet).color;
    const N = this.level.floors;
    const fh = this.fh();

    const g = this.add.graphics();
    // Fondo general
    g.fillGradientStyle(0x2b1b4d, 0x2b1b4d, 0x17102e, 0x17102e, 1);
    g.fillRect(0, 0, W, H);

    // Fachada del edificio
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(BUILD_LEFT, BUILD_TOP + 6, BUILD_RIGHT - BUILD_LEFT, BUILD_BOTTOM - BUILD_TOP, 14);
    g.fillStyle(wallpaper, 1);
    g.fillRoundedRect(BUILD_LEFT, BUILD_TOP, BUILD_RIGHT - BUILD_LEFT, BUILD_BOTTOM - BUILD_TOP, 14);

    // Bandas de pisos + ventanas + puertas decorativas
    for (let f = 1; f <= N; f++) {
      const top = this.bandBottom(f) - fh;
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(BUILD_LEFT + 8, top, BUILD_RIGHT - BUILD_LEFT - 16, fh);
      g.lineStyle(2, 0x000000, 0.15);
      g.lineBetween(BUILD_LEFT + 8, top, BUILD_RIGHT - 8, top);
      // Ventanas laterales
      g.fillStyle(0x78c8ff, 0.85);
      g.fillRoundedRect(BUILD_LEFT + 22, top + fh * 0.25, 44, fh * 0.5, 8);
      g.fillRoundedRect(BUILD_RIGHT - 66, top + fh * 0.25, 44, fh * 0.5, 8);
      // Puerta del piso (hueco del ascensor)
      g.fillStyle(0x000000, 0.18);
      g.fillRoundedRect(CAB_X - CAB_W / 2 - 6, top + 4, CAB_W + 12, fh - 8, 8);
      // Número de piso
    }
    // Recepción
    g.fillStyle(carpet, 1);
    g.fillRect(BUILD_LEFT + 8, LOBBY_TOP, BUILD_RIGHT - BUILD_LEFT - 16, BUILD_BOTTOM - LOBBY_TOP);
    g.fillStyle(0x000000, 0.2);
    g.fillRoundedRect(CAB_X - CAB_W / 2 - 6, LOBBY_TOP + 4, CAB_W + 12, BUILD_BOTTOM - LOBBY_TOP - 8, 8);
    // Mostrador de recepción
    g.fillStyle(0x8b5a2b, 1);
    g.fillRoundedRect(BUILD_LEFT + 90, BUILD_BOTTOM - 34, 110, 34, 8);
    g.fillStyle(0xa06a35, 1);
    g.fillRoundedRect(BUILD_LEFT + 90, BUILD_BOTTOM - 34, 110, 10, 6);

    // Números de piso en la fachada
    for (let f = 1; f <= N; f++) {
      const top = this.bandBottom(f) - fh;
      makeText(this, BUILD_LEFT + 44, top + 16, `${f}`, 16, '#ffd678').setShadow(0, 2, '#000000', 4, true, true);
      makeText(this, BUILD_RIGHT - 44, top + 16, `${f}`, 16, '#ffd678').setShadow(0, 2, '#000000', 4, true, true);
    }
    makeText(this, BUILD_LEFT + 44, LOBBY_TOP + 14, 'R', 16, '#ffffff').setShadow(0, 2, '#000000', 4, true, true);
    makeText(this, BUILD_RIGHT - 44, LOBBY_TOP + 14, 'R', 16, '#ffffff').setShadow(0, 2, '#000000', 4, true, true);

    // Zona de cola (alfombra)
    g.fillStyle(carpet, 0.9);
    g.fillRoundedRect(8, 778, W - 16, 172, 14);
    g.lineStyle(3, 0xffffff, 0.2);
    g.strokeRoundedRect(8, 778, W - 16, 172, 14);
    makeText(this, W / 2, 792, 'RECEPCIÓN · toca monstruos para subirlos', 14, '#ffffff', false);

    // Pista de tutorial
    this.hintText = makeText(this, W / 2, 806, '', 16, '#ffd678');
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
    this.capacityText = makeText(this, W / 2, 50, '', 15, '#ffffff', false).setVisible(false);
  }

  private drawFloorPanel(): void {
    const N = this.level.floors;
    makeText(this, 458, 116, 'ASCENSOR', 15, '#c9bdf0');
    const floors: number[] = [];
    for (let f = N; f >= 1; f--) floors.push(f);
    floors.push(0);
    floors.forEach((f, i) => {
      const x = 458;
      const y = 150 + i * 64;
      const w = 118, h = 54;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(x - w / 2, y - h / 2 + 4, w, h, 12);
      g.fillStyle(0x5b4396, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      g.lineStyle(3, 0xffffff, 0.3);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      makeText(this, x, y, f === 0 ? 'R' : `${f}`, 26, '#ffffff');
      // Insignia con nº de pasajeros para ese piso
      const badgeBg = this.add.graphics();
      const badge = makeText(this, x + w / 2 - 14, y - h / 2 + 12, '', 14, '#1a1033');
      this.floorButtons.set(f, { g, badge, badgeBg });
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.onFloorButton(f));
    });
  }

  private createCab(): void {
    const doorColor = getCustomOption('door', this.save.custom.door).color;
    this.cab = this.add.container(CAB_X, this.cabY(0));

    const back = this.add.graphics();
    back.fillStyle(0x241640, 1);
    back.fillRoundedRect(-CAB_W / 2, -CAB_H / 2, CAB_W, CAB_H, 10);
    back.fillStyle(0x3d2a6b, 1);
    back.fillRoundedRect(-CAB_W / 2 + 6, -CAB_H / 2 + 6, CAB_W - 12, CAB_H - 12, 8);
    this.cab.add(back);

    const drawDoor = (side: number): Phaser.GameObjects.Graphics => {
      const d = this.add.graphics();
      d.fillStyle(doorColor, 1);
      d.fillRoundedRect(side * (CAB_W / 4) - CAB_W / 4, -CAB_H / 2, CAB_W / 2, CAB_H, 6);
      d.lineStyle(2, 0x000000, 0.25);
      d.strokeRoundedRect(side * (CAB_W / 4) - CAB_W / 4, -CAB_H / 2, CAB_W / 2, CAB_H, 6);
      d.fillStyle(0xffffff, 0.25);
      d.fillRect(side * (CAB_W / 4) - 3, -CAB_H / 2 + 8, 6, CAB_H - 16);
      return d;
    };
    this.doorL = drawDoor(-1);
    this.doorR = drawDoor(1);
    this.cab.add([this.doorL, this.doorR]);

    const frame = this.add.graphics();
    frame.lineStyle(4, 0xffc93c, 0.9);
    frame.strokeRoundedRect(-CAB_W / 2, -CAB_H / 2, CAB_W, CAB_H, 10);
    this.cab.add(frame);

    this.indicator = makeText(this, 0, -CAB_H / 2 - 14, 'R', 20, '#ffd678');
    this.cab.add(this.indicator);
    this.setDoors(true, true);
  }

  private setDoors(open: boolean, instant = false): void {
    this.doorsOpen = open;
    const off = open ? CAB_W / 2 + 8 : 0;
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
      const shadow = this.add.image(0, 26, 'shadow').setScale(0.8);
      const image = this.add
        .image(0, 0, `monster-${grp.monsterId}`)
        .setScale(0.44 * def.scale)
        .setInteractive({ useHandCursor: true });
      if (def.rule === 'ghost') image.setAlpha(0.9);
      container.add([shadow, image]);

      // Insignia de destino (siempre visible)
      const badge = this.add.container(0, -34);
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
        state: 'queue', asleep: false, container, image, badge,
      };
      image.on('pointerdown', () => this.onPassengerTap(pax));
      this.passengers.push(pax);
    });
  }

  private queuePositions(): Array<{ x: number; y: number }> {
    const waiting = this.passengers.filter((p) => p.state === 'queue' || p.state === 'boarding');
    const n = waiting.length;
    const rows = n <= 5 ? 1 : 2;
    const perRow = rows === 1 ? n : Math.ceil(n / 2);
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const row = rows === 1 ? 0 : Math.floor(i / perRow);
      const idxInRow = rows === 1 ? i : i % perRow;
      const countInRow = rows === 1 ? n : Math.min(perRow, n - row * perRow);
      const x = W / 2 + (idxInRow - (countInRow - 1) / 2) * 62;
      const y = rows === 1 ? 884 : 852 + row * 62;
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
      3: [-42, 0, 42],
      4: [-50, -17, 17, 50],
    };
    const xs = slotsX[cap] ?? [-42, 0, 42];
    return { x: xs[Math.min(index, xs.length - 1)], y: 12 };
  }

  /** Mantiene a los pasajeros a bordo pegados a la cabina (también al moverse). */
  update(time: number): void {
    const onboard = this.onboard();
    onboard.forEach((p, i) => {
      const pos = this.slotPosition(i);
      const bob = p.def.rule === 'ghost' ? Math.sin(time / 280 + p.id) * 4 : 0;
      const targetY = p.def.rule === 'ghost' ? -22 + bob : pos.y;
      p.container.setPosition(this.cab.x + pos.x, this.cab.y + targetY);
      p.badge.setScale(0.85);
    });
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
      // Regla tímido
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

  private board(p: Passenger): void {
    p.state = 'boarding';
    p.bobTween?.stop();
    audio.select();
    // Posición mundial del hueco en la cabina
    const idx = this.onboard().length;
    const slot = this.slotPosition(idx);
    const targetX = this.cab.x + slot.x;
    const targetY = this.cab.y + (p.def.rule === 'ghost' ? -22 : slot.y);
    this.tweens.add({
      targets: p.container, x: targetX, y: targetY, duration: 420, ease: 'Quad.easeOut',
      onComplete: () => {
        p.state = 'onboard';
        this.refreshHud();
        this.refreshFloorButtons();
        this.updateHint();
      },
    });
    this.tweens.add({ targets: p.container, scale: 1.15, duration: 180, yoyo: true });
    this.layoutQueue();
  }

  private leaveToQueue(p: Passenger): void {
    p.state = 'queue';
    audio.deselect();
    p.container.setDepth(10);
    p.badge.setScale(1);
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
        onComplete: () => this.arrive(f),
      });
    });
  }

  private arrive(f: number): void {
    this.elevatorFloor = f;
    this.indicator.setText(f === 0 ? 'R' : `${f}`);
    this.setDoors(true);
    audio.ding();
    this.moving = false;

    if (f === 0) {
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
      // Piso equivocado: reacción divertida, sin bloqueo
      audio.boing();
      if (this.save.settings.vibration) vibrate(80);
      this.showBubble('¡Piso equivocado!', CAB_X, this.cab.y - 90, 1800);
      this.onboard().forEach((p) => {
        this.tweens.add({ targets: p.image, x: 5, duration: 60, yoyo: true, repeat: 5 });
      });
      this.updateHint();
      return;
    }

    exiters.forEach((p, i) => {
      this.time.delayedCall(i * 220, () => this.exitPassenger(p));
    });
    this.updateHint();
  }

  private exitPassenger(p: Passenger): void {
    p.state = 'exiting';
    p.asleep = false;
    audio.happy();
    // Caminar fuera del ascensor
    p.container.setDepth(20);
    p.container.setPosition(this.cab.x, this.cab.y + 10);
    p.badge.setVisible(false);
    const exitX = BUILD_RIGHT - 60;
    const exitY = this.bandBottom(this.elevatorFloor) - 26;
    this.tweens.add({
      targets: p.container, x: exitX, y: exitY, duration: 600, ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: p.container, y: exitY - 18, duration: 160, yoyo: true, repeat: 1,
          onComplete: () => {
            this.spawnHearts(exitX, exitY - 30);
            this.tweens.add({
              targets: p.container, alpha: 0, duration: 300,
              onComplete: () => p.container.destroy(),
            });
          },
        });
      },
    });
    this.delivered++;
    this.refreshHud();
    this.refreshFloorButtons();

    // ¿Ascensor vacío? Vuelve solo a recepción (salvo si ya ganamos).
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
    this.tweens.add({ targets: p.image, scale: 0.55, duration: 150, yoyo: true });
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

  // ── HUD / pistas / burbujas ──────────────────────────────────────────────
  private refreshHud(): void {
    const { three } = starThresholds(this.optimal);
    this.distText.setText(`Distancia ${this.distance} · Óptima ${this.optimal} · Meta ★★★ ≤ ${three}`);
    this.progressText.setText(`Entregados ${this.delivered}/${this.passengers.length} · Ascensor ${this.usedSlots()}/${this.level.capacity}`);
  }

  private refreshFloorButtons(): void {
    const onboard = this.onboard();
    this.floorButtons.forEach((btn, f) => {
      const count = onboard.filter((p) => p.dest === f).length;
      btn.badge.setText(count > 0 ? `${count}` : '');
      btn.badgeBg.clear();
      if (count > 0) {
        btn.badgeBg.fillStyle(0xffc93c, 1);
        btn.badgeBg.fillCircle(0, 0, 11);
      }
      btn.badgeBg.setPosition(458 + 59 - 14, 150 + this.floorIndex(f) * 64 - 27 + 12);
      btn.badge.setPosition(458 + 59 - 14, 150 + this.floorIndex(f) * 64 - 27 + 12);
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

  private showSpecialTutorialIfNeeded(): void {
    const specials = this.passengers.filter((p) => p.def.rule !== 'none');
    for (const p of specials) {
      const key = `rule_${p.def.rule}`;
      if (!this.save.seenTutorials.includes(key)) {
        this.save.seenTutorials.push(key);
        writeSave(this.save);
        this.time.delayedCall(600, () => this.showRuleToast(p));
        return; // una regla cada vez
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
    this.won = true;
    audio.victory();
    const stars = starsFor(this.distance, this.optimal);
    const prevStars = this.save.stars[this.level.id] ?? 0;
    const earned = stars > prevStars ? coinsFor(stars) : 2;

    // Guardar progreso
    this.save.stars[this.level.id] = Math.max(prevStars, stars);
    this.save.coins += earned;
    this.save.unlockedLevel = Math.min(
      Math.max(this.save.unlockedLevel, this.level.id + 1),
      this.level.floors >= 0 ? 30 : 30
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

    // Confeti de destellos
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
      if (i < stars) {
        this.time.delayedCall(400 + i * 350, () => {
          audio.star(i);
          this.tweens.add({ targets: img, scale: 1.3, duration: 300, ease: 'Back.easeOut' });
        });
      } else {
        this.time.delayedCall(400 + i * 350, () => {
          this.tweens.add({ targets: img, scale: 1.3, duration: 300, ease: 'Back.easeOut' });
        });
      }
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

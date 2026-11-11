/**
 * TIENDA DEL HOTEL — Economía V3.
 *
 * - Se compra SOLO con monedas del juego (🪙), que se ganan jugando.
 * - Todo es cosmético: nada afecta al puzle, a las estrellas ni a la dificultad.
 * - Vistas previas reales (se dibuja el objeto tal como se verá en el juego),
 *   confirmación antes de gastar, animación de compra e inventario de adquiridos.
 * - La sección de productos con dinero real está separada y protegida con una
 *   barrera parental; muestra el contenido exacto antes que el precio.
 * - Sin cajas aleatorias, sin ofertas con cuenta atrás, sin presión al niño.
 */

import Phaser from 'phaser';
import { loadSave, writeSave, SaveData, ownsItem, isEquipped } from '../systems/save';
import {
  ALL_ITEMS, CATEGORY_INFO, PACKS, itemById, paletteOf,
  type ShopItem, type ShopCategory,
} from '../data/shop';
import { buyItem, equipItem, unequipSlot, unlockPack } from '../systems/economy';
import { makeButton, makePanel, makeText, makeCoins, makeWoodSign, COLORS } from '../systems/ui';
import { audio } from '../systems/audio';
import { openParentalGate } from '../systems/parental';
import {
  skyColors, drawWallpaperPattern, decorateRese, monsterAccessory,
} from '../systems/cosmetics';

const W = 540;
const H = 960;
const PER_PAGE = 6;

const TAB_LABEL: Record<ShopCategory, string> = {
  facade: 'EDIFICIO',
  accessory: 'RECEPCIÓN',
  elevator: 'ASCENSOR',
  wallpaper: 'TAPIZ',
  theme: 'TEMAS',
  pack: 'PAQUETE',
};

export default class ShopScene extends Phaser.Scene {
  private cat: ShopCategory = 'facade';
  private page = 0;
  private save!: SaveData;

  constructor() {
    super('shop');
  }

  init(data: { cat?: ShopCategory; page?: number }): void {
    this.cat = data.cat ?? 'facade';
    this.page = data.page ?? 0;
    this.save = loadSave();
  }

  create(): void {
    this.cameras.main.fadeIn(260);
    // Fondo suave
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xffe9c7, 0xffe9c7, 0xffd9e8, 0xffd9e8, 1);
    bg.fillRect(0, 0, W, H);

    makeButton(this, 52, 44, 76, 48, '◀', {
      bg: COLORS.purple, fontSize: 24, onClick: () => this.scene.start('menu'),
    });
    makeWoodSign(this, W / 2, 44, 300, 58);
    makeText(this, W / 2, 44, 'TIENDA DEL HOTEL', 25, '#ffffff')
      .setShadow(0, 2, 'rgba(0,0,0,0.35)', 3, true, true);
    makeCoins(this, W - 74, 44, this.save.coins);

    makeText(this, W / 2, 92, 'Las monedas se ganan jugando · todo es decorativo', 14, '#a06a35', false);

    // Pestañas de categoría
    const info = CATEGORY_INFO.find((c) => c.key === this.cat);
    CATEGORY_INFO.forEach((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 100 + col * 170;
      const y = 132 + row * 52;
      const active = c.key === this.cat;
      makeButton(this, x, y, 156, 44, TAB_LABEL[c.key], {
        bg: active ? COLORS.accent : COLORS.mintDark,
        fontSize: 14,
        onClick: () => this.scene.restart({ cat: c.key, page: 0 }),
      });
    });
    makeText(this, W / 2, 240, info?.blurb ?? '', 15, '#8a6fd0', false);

    this.renderGrid();

    // Barra inferior: inventario + zona para adultos
    makeButton(this, 145, H - 92, 240, 58, 'MI INVENTARIO', {
      bg: COLORS.blue, fontSize: 17, onClick: () => this.openInventory(),
    });
    makeButton(this, 398, H - 92, 250, 58, 'ZONA PARA ADULTOS', {
      bg: COLORS.purpleDark, fontSize: 15, onClick: () => this.openAdultZone(),
    });
    makeText(this, W / 2, H - 40, 'Sin cajas aleatorias · sin ofertas con tiempo límite · sin anuncios', 12, '#a06a35', false);
  }

  /** Items de la categoría actual (los de pago solo si ya se poseen). */
  private visibleItems(): ShopItem[] {
    return ALL_ITEMS.filter((i) => i.cat === this.cat
      && (i.source === 'coins' || ownsItem(this.save, i.id)));
  }

  private renderGrid(): void {
    const items = this.visibleItems();
    const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    if (this.page >= pages) this.page = pages - 1;
    const slice = items.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE);

    slice.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      this.renderCard(item, 145 + col * 250, 372 + row * 200);
    });

    if (pages > 1) {
      makeButton(this, 70, 292, 60, 40, '◀', {
        bg: COLORS.purple, fontSize: 18,
        onClick: () => this.scene.restart({ cat: this.cat, page: Math.max(0, this.page - 1) }),
      });
      makeText(this, W / 2, 292, `Página ${this.page + 1} de ${pages}`, 14, '#a06a35', false);
      makeButton(this, W - 70, 292, 60, 40, '▶', {
        bg: COLORS.purple, fontSize: 18,
        onClick: () => this.scene.restart({ cat: this.cat, page: Math.min(pages - 1, this.page + 1) }),
      });
    }
    if (slice.length === 0) {
      makeText(this, W / 2, 400, 'No hay objetos en esta sección.', 18, '#a06a35', false);
    }
  }

  private renderCard(item: ShopItem, x: number, y: number): void {
    const owned = ownsItem(this.save, item.id);
    const equipped = isEquipped(this.save, item.id);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(x - 108 + 4, y - 88 + 6, 220, 178, 18);
    g.fillStyle(0xfffaf0, 1);
    g.fillRoundedRect(x - 108, y - 88, 220, 178, 18);
    g.lineStyle(equipped ? 5 : 3, equipped ? 0xffa94d : 0xd4b58c, 1);
    g.strokeRoundedRect(x - 108, y - 88, 220, 178, 18);

    this.drawPreview(item, x, y - 26, 190, 100);
    makeText(this, x, y + 46, item.name, 15, '#6b4423', false);

    if (equipped) {
      makeText(this, x, y + 70, '✓ EQUIPADO', 14, '#2f9e44', false);
    } else if (owned) {
      makeText(this, x, y + 70, 'En tu inventario', 13, '#8a6fd0', false);
    } else if (item.cat === 'pack') {
      this.add.image(x - 26, y + 70, 'coin').setScale(0.5);
      makeText(this, x + 16, y + 70, `${item.price}`, 16, '#6b4423');
    } else {
      this.add.image(x - 26, y + 70, 'coin').setScale(0.5);
      makeText(this, x + 16, y + 70, item.price === 0 ? 'GRATIS' : `${item.price}`, 16, '#6b4423');
    }

    const zone = this.add.zone(x, y, 220, 178).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => { audio.click(); this.openDetail(item); });
  }

  /** Vista previa REAL del objeto (mismo dibujo que se aplica en el juego). */
  private drawPreview(item: ShopItem, x: number, y: number, w: number, h: number): void {
    const g = this.add.graphics();
    const left = x - w / 2;
    const top = y - h / 2;

    if (item.slot === 'facade' || item.slot === 'wallpaper' || item.slot === 'theme') {
      const themeId = item.slot === 'theme' ? (item.id === 't_arcoiris' ? 'arcoiris' : item.id.replace('t_', '')) : this.save.custom.theme;
      const pal = item.slot === 'theme' ? paletteOf(themeId) : undefined;
      const sky = pal ? { top: pal.skyTop, bottom: pal.skyBottom } : skyColors(this.save);
      g.fillGradientStyle(sky.top, sky.top, sky.bottom, sky.bottom, 1);
      g.fillRoundedRect(left, top, w, h, 12);
      const facade = pal ? pal.facade : item.slot === 'facade' ? item.color : itemById(this.save.custom.facade)?.color ?? 0xf5e6c8;
      g.fillStyle(facade, 1);
      g.fillRoundedRect(left + w * 0.18, top + h * 0.22, w * 0.64, h * 0.72, 8);
      if (pal?.facadeShade) {
        g.fillStyle(pal.facadeShade, 1);
        g.fillRect(left + w * 0.18, top + h * 0.86, w * 0.64, 6);
      }
      // Patrón del papel tapiz (real)
      const patternItem: ShopItem | undefined = item.slot === 'wallpaper' ? item
        : item.slot === 'theme' ? { ...item, pattern: pal?.pattern ?? 'solid', color2: pal?.accent } as ShopItem
          : itemById(this.save.custom.wallpaper);
      if (patternItem) {
        const fakeSave: SaveData = {
          ...this.save,
          custom: { ...this.save.custom, wallpaper: patternItem.id, theme: item.slot === 'theme' ? themeId : this.save.custom.theme },
        };
        drawWallpaperPattern(g, fakeSave, left + w * 0.18, top + h * 0.22, w * 0.64, h * 0.72);
      }
      // Ventanas y ascensor
      g.fillStyle(0xffffff, 0.55);
      for (let f = 0; f < 3; f++) {
        g.fillRoundedRect(left + w * 0.24, top + h * 0.3 + f * (h * 0.2), w * 0.16, h * 0.12, 3);
        g.fillRoundedRect(left + w * 0.6, top + h * 0.3 + f * (h * 0.2), w * 0.16, h * 0.12, 3);
      }
      const elev = itemById(this.save.custom.elevator);
      g.fillStyle(elev?.color ?? 0xffa94d, 1);
      g.fillRoundedRect(left + w * 0.44, top + h * 0.28, w * 0.12, h * 0.6, 4);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeRoundedRect(left + w * 0.44, top + h * 0.28, w * 0.12, h * 0.6, 4);
    } else if (item.slot === 'elevator') {
      g.fillStyle(0xdff3ff, 1);
      g.fillRoundedRect(left, top, w, h, 12);
      g.lineStyle(4, 0x5a7a8a, 1);
      g.strokeRoundedRect(left + w * 0.3, top + 8, w * 0.4, h - 16, 8);
      g.fillStyle(item.color, 1);
      g.fillRoundedRect(left + w * 0.3, top + h - 26, w * 0.4, 18, 6);
      g.fillStyle(item.color2 ?? 0xeaf7ff, 0.95);
      g.fillRoundedRect(left + w * 0.33, top + 12, w * 0.16, h - 40, 5);
      g.fillRoundedRect(left + w * 0.51, top + 12, w * 0.16, h - 40, 5);
      g.lineStyle(2, 0x7c4f24, 0.8);
      for (let i = 0; i < 3; i++) g.strokeRect(left + w * 0.34 + i * (w * 0.11), top + h - 32, w * 0.08, 5);
    } else if (item.slot === 'accessory') {
      g.fillStyle(0xe8f6ff, 1);
      g.fillRoundedRect(left, top, w, h, 12);
      const img = this.add.image(x, y + 6, 'rese').setDisplaySize(h * 0.92, h * 0.92).setDepth(1);
      const fake: SaveData = { ...this.save, custom: { ...this.save.custom, accessory: item.id } };
      const deco = decorateRese(this, img, fake);
      if (deco) deco.setDepth(2);
    } else if (item.slot === 'monsterAcc') {
      g.fillStyle(0xfde9f3, 1);
      g.fillRoundedRect(left, top, w, h, 12);
      const img = this.add.image(x, y + 12, 'monster-bubu').setDisplaySize(h * 0.7, h * 0.7).setDepth(1);
      const fake: SaveData = { ...this.save, custom: { ...this.save.custom, monsterAcc: item.id } };
      const acc = monsterAccessory(this, fake, img.displayWidth);
      if (acc) { acc.setPosition(x, y - img.displayHeight * 0.34).setDepth(2); }
    } else if (item.slot === 'decor') {
      g.fillStyle(0xfff4e0, 1);
      g.fillRoundedRect(left, top, w, h, 12);
      if (item.id === 'dd_fuente') {
        g.fillStyle(0xcbd5e1, 1);
        g.fillEllipse(x, y + 22, 78, 22);
        g.fillStyle(0x67e8f9, 0.95);
        g.fillEllipse(x, y + 18, 62, 15);
        g.fillStyle(0xe2e8f0, 1);
        g.fillRoundedRect(x - 6, y - 16, 12, 34, 4);
        g.fillStyle(0xa5f3fc, 1);
        g.fillCircle(x, y - 22, 7);
      } else {
        g.lineStyle(2, 0x94a3b8, 1);
        g.lineBetween(x, y - 40, x, y - 14);
        g.fillStyle(0xfde68a, 1);
        g.fillCircle(x, y - 6, 11);
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (0.15 + (i / 4) * 0.7);
          g.lineStyle(2, 0xfcd34d, 1);
          g.lineBetween(x, y - 6, x + Math.cos(a) * 38, y - 6 + Math.sin(a) * 22);
          g.fillStyle(0xfff7cc, 1);
          g.fillCircle(x + Math.cos(a) * 38, y - 6 + Math.sin(a) * 22, 5);
        }
      }
    } else if (item.slot === 'celebration') {
      g.fillStyle(0x2b1b3d, 1);
      g.fillRoundedRect(left, top, w, h, 12);
      for (let i = 0; i < 26; i++) {
        g.fillStyle([0xfbbf24, 0xffffff, 0xfde68a][i % 3], 0.9);
        g.fillCircle(left + 10 + Math.random() * (w - 20), top + 8 + Math.random() * (h - 16), 1.6 + Math.random() * 2.4);
      }
      makeText(this, x, y, '★', 40, '#fbbf24');
    } else {
      // Paquete: caja de regalo con todo el contenido
      g.fillStyle(0xf3e8ff, 1);
      g.fillRoundedRect(left, top, w, h, 12);
      g.fillStyle(item.color, 1);
      g.fillRoundedRect(x - 42, y - 26, 84, 62, 8);
      g.fillStyle(0xfde68a, 1);
      g.fillRect(x - 42, y - 6, 84, 12);
      g.fillRect(x - 7, y - 26, 14, 62);
      g.lineStyle(3, 0x6d3a14, 1);
      g.strokeRoundedRect(x - 42, y - 26, 84, 62, 8);
      g.fillStyle(0xfde68a, 1);
      g.fillTriangle(x - 22, y - 26, x, y - 46, x + 4, y - 26);
      g.fillTriangle(x + 22, y - 26, x, y - 46, x - 4, y - 26);
      makeText(this, x, y + 56, `${item.includes?.length ?? 0} objetos`, 13, '#8a6fd0', false);
    }
    g.lineStyle(2, 0x00000020, 1);
    g.strokeRoundedRect(left, top, w, h, 12);
  }

  /** Ficha del objeto: vista previa grande, descripción y acciones. */
  private openDetail(item: ShopItem): void {
    const s = loadSave();
    this.save = s;
    const owned = ownsItem(s, item.id);
    const equipped = isEquipped(s, item.id);
    const c = this.add.container(0, 0).setDepth(60);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive());
    c.add(makePanel(this, W / 2, H / 2, 460, 620));
    c.add(makeText(this, W / 2, H / 2 - 268, item.name, 25, '#6b4423'));
    c.add(makeText(this, W / 2, H / 2 - 236, item.desc, 14, '#8a6fd0', false));

    this.drawPreview(item, W / 2, H / 2 - 110, 380, 200);

    const status = equipped ? '✓ Equipado ahora mismo'
      : owned ? 'Ya es tuyo: puedes equiparlo cuando quieras'
        : item.source === 'coins' ? `Precio: ${item.price} monedas 🪙`
          : `Incluido en: ${PACKS.find((p) => p.id === item.packId)?.name ?? 'pack'}`;
    c.add(makeText(this, W / 2, H / 2 + 20, status, 16, '#a06a35', false));
    c.add(makeText(this, W / 2, H / 2 + 46, 'Es solo decoración: no cambia el puzle ni las estrellas.', 13, '#8a6fd0', false));

    const close = () => c.destroy();

    if (!owned && item.source === 'coins') {
      c.add(makeButton(this, W / 2, H / 2 + 104, 340, 62, item.price === 0 ? 'OBTENER GRATIS' : `COMPRAR · ${item.price} 🪙`, {
        bg: COLORS.accent, fontSize: 20,
        onClick: () => this.confirmPurchase(item, c),
      }));
    } else if (owned && !equipped) {
      c.add(makeButton(this, W / 2, H / 2 + 104, 340, 62, 'EQUIPAR', {
        bg: COLORS.mintDark, fontSize: 22,
        onClick: () => {
          equipItem(this.save, item.id);
          writeSave(this.save);
          audio.select();
          close();
          this.scene.restart({ cat: this.cat, page: this.page });
        },
      }));
      if (item.slot === 'monsterAcc' || item.slot === 'decor' || item.slot === 'celebration' || item.slot === 'accessory') {
        c.add(makeButton(this, W / 2, H / 2 + 172, 300, 52, 'QUITAR', {
          bg: COLORS.purple, fontSize: 17,
          onClick: () => {
            unequipSlot(this.save, item.slot as 'monsterAcc' | 'decor' | 'celebration' | 'accessory');
            writeSave(this.save);
            close();
            this.scene.restart({ cat: this.cat, page: this.page });
          },
        }));
      }
    } else if (!owned) {
      c.add(makeButton(this, W / 2, H / 2 + 104, 380, 62, 'VER EN LA ZONA PARA ADULTOS', {
        bg: COLORS.purpleDark, fontSize: 16,
        onClick: () => { close(); this.openAdultZone(); },
      }));
    } else {
      c.add(makeText(this, W / 2, H / 2 + 110, 'Lo estás usando ahora', 18, '#2f9e44', false));
    }
    c.add(makeButton(this, W / 2, H / 2 + 240, 220, 54, 'CERRAR', {
      bg: COLORS.purple, fontSize: 19, onClick: close,
    }));

    c.setScale(0.75).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  /** Confirmación explícita antes de gastar monedas. */
  private confirmPurchase(item: ShopItem, parent: Phaser.GameObjects.Container): void {
    if (item.price === 0) { this.doPurchase(item, parent); return; }
    const c = this.add.container(0, 0).setDepth(70);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0).setInteractive());
    c.add(makePanel(this, W / 2, H / 2, 420, 330));
    c.add(makeText(this, W / 2, H / 2 - 118, '¿CONFIRMAR COMPRA?', 24, '#6b4423'));
    c.add(makeText(this, W / 2, H / 2 - 74, item.name, 20, '#e07b2a'));
    c.add(makeText(this, W / 2, H / 2 - 40, `Gastarás ${item.price} monedas de tus ${this.save.coins}.`, 15, '#a06a35', false));
    c.add(makeText(this, W / 2, H / 2 - 14, 'Te quedarán ' + (this.save.coins - item.price) + ' monedas.', 15, '#a06a35', false));
    c.add(makeButton(this, W / 2 - 100, H / 2 + 52, 180, 58, 'SÍ, COMPRAR', {
      bg: COLORS.accent, fontSize: 17, onClick: () => { c.destroy(); this.doPurchase(item, parent); },
    }));
    c.add(makeButton(this, W / 2 + 100, H / 2 + 52, 180, 58, 'MEJOR NO', {
      bg: COLORS.purple, fontSize: 17, onClick: () => c.destroy(),
    }));
    c.add(makeText(this, W / 2, H / 2 + 118, 'Sin dinero real: son monedas del juego.', 13, '#8a6fd0', false));
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
  }

  private doPurchase(item: ShopItem, parent: Phaser.GameObjects.Container): void {
    const result = buyItem(this.save, item.id);
    if (!result.ok) {
      audio.error();
      const msg = result.reason === 'sin-monedas'
        ? 'Te faltan monedas: gana completando niveles y misiones.'
          : result.reason === 'ya-lo-tienes' ? 'Ya tienes este objeto.'
            : 'Este objeto no se compra con monedas.';
      const toast = makeText(this, W / 2, H / 2 + 176, msg, 14, '#ef4444', false).setDepth(80);
      this.tweens.add({ targets: toast, alpha: 0, duration: 2400, delay: 600, onComplete: () => toast.destroy() });
      return;
    }
    // Auto-equipar (menos pasos para un niño) salvo paquetes.
    if (item.slot !== 'pack') equipItem(this.save, item.id);
    writeSave(this.save);
    audio.coin();
    parent.destroy();
    this.purchaseAnimation(item, result.granted.length);
  }

  /** Animación de compra: monedas volando, sello y destellos. */
  private purchaseAnimation(item: ShopItem, grantedCount: number): void {
    const c = this.add.container(0, 0).setDepth(90);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setInteractive());
    for (let i = 0; i < 14; i++) {
      const coin = this.add.image(W - 74, 44, 'coin').setScale(0.5).setDepth(91);
      this.tweens.add({
        targets: coin, x: W / 2 + (Math.random() - 0.5) * 140, y: H / 2 - 40,
        angle: 360 * (Math.random() > 0.5 ? 1 : -1), scale: 0.9,
        duration: 620, delay: i * 45, ease: 'Cubic.easeIn', onComplete: () => coin.destroy(),
      });
    }
    const stamp = makeText(this, W / 2, H / 2 - 30, '¡COMPRADO!', 46, '#2f9e44');
    c.add(stamp);
    stamp.setScale(2.4).setAlpha(0);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 380, delay: 520, ease: 'Back.easeOut' });
    c.add(makeText(this, W / 2, H / 2 + 26, item.name, 22, '#6b4423', false).setAlpha(0));
    this.tweens.add({ targets: c.getAll()[c.getAll().length - 1], alpha: 1, duration: 300, delay: 700 });
    const extra = item.cat === 'pack'
      ? `Desbloqueaste ${grantedCount} objetos del paquete.`
        : 'Ya está equipado en tu hotel.';
    c.add(makeText(this, W / 2, H / 2 + 62, extra, 15, '#8a6fd0', false).setAlpha(0));
    this.tweens.add({ targets: c.getAll()[c.getAll().length - 1], alpha: 1, duration: 300, delay: 780 });
    for (let i = 0; i < 22; i++) {
      const sp = this.add.image(W / 2, H / 2 - 30, 'sparkle').setScale(0.5).setDepth(92);
      this.tweens.add({
        targets: sp, x: W / 2 + (Math.random() - 0.5) * 420, y: H / 2 + (Math.random() - 0.5) * 320,
        alpha: 0, angle: 360, duration: 800, delay: 560 + Math.random() * 260, onComplete: () => sp.destroy(),
      });
    }
    c.add(makeButton(this, W / 2, H / 2 + 150, 240, 58, 'SEGUIR VIENDO', {
      bg: COLORS.accent, fontSize: 18,
      onClick: () => { c.destroy(); this.scene.restart({ cat: this.cat, page: this.page }); },
    }).setAlpha(0));
    this.tweens.add({ targets: c.getAll()[c.getAll().length - 1], alpha: 1, duration: 300, delay: 900 });
  }

  /** Inventario: todo lo que ya es tuyo, con opción de equipar. */
  private openInventory(): void {
    const owned = ALL_ITEMS.filter((i) => i.slot !== 'pack' && ownsItem(this.save, i.id));
    const c = this.add.container(0, 0).setDepth(60);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    c.add(makePanel(this, W / 2, H / 2, 470, 780));
    c.add(makeText(this, W / 2, H / 2 - 350, 'MI INVENTARIO', 27, '#6b4423'));
    c.add(makeText(this, W / 2, H / 2 - 318, `${owned.length} objetos conseguidos jugando`, 14, '#8a6fd0', false));

    const rows = owned.slice(0, 9);
    rows.forEach((item, i) => {
      const y = H / 2 - 274 + i * 62;
      const g = this.add.graphics();
      g.fillStyle(isEquipped(this.save, item.id) ? 0xfff1d6 : 0xfaf5ec, 1);
      g.fillRoundedRect(W / 2 - 210, y - 24, 420, 52, 12);
      g.lineStyle(2, isEquipped(this.save, item.id) ? 0xffa94d : 0xd4b58c, 1);
      g.strokeRoundedRect(W / 2 - 210, y - 24, 420, 52, 12);
      g.fillStyle(item.color, 1);
      g.fillCircle(W / 2 - 182, y + 2, 15);
      g.lineStyle(2, 0x6b4423, 0.7);
      g.strokeCircle(W / 2 - 182, y + 2, 15);
      c.add(g);
      c.add(makeText(this, W / 2 - 150, y - 4, item.name, 15, '#6b4423', false).setOrigin(0, 0.5));
      c.add(makeText(this, W / 2 - 150, y + 16, TAB_LABEL[item.cat], 11, '#a06a35', false).setOrigin(0, 0.5));
      if (isEquipped(this.save, item.id)) {
        c.add(makeText(this, W / 2 + 168, y + 2, '✓', 24, '#2f9e44'));
      } else {
        c.add(makeButton(this, W / 2 + 158, y + 2, 96, 40, 'EQUIPAR', {
          bg: COLORS.mintDark, fontSize: 12,
          onClick: () => {
            equipItem(this.save, item.id);
            writeSave(this.save);
            audio.select();
            c.destroy();
            this.scene.restart({ cat: item.cat, page: 0 });
          },
        }));
      }
    });
    if (owned.length > rows.length) {
      c.add(makeText(this, W / 2, H / 2 + 300, `…y ${owned.length - rows.length} más (mira las pestañas)`, 13, '#a06a35', false));
    }
    c.add(makeButton(this, W / 2, H / 2 + 344, 220, 54, 'CERRAR', {
      bg: COLORS.purple, fontSize: 19, onClick: () => c.destroy(),
    }));
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }

  /** Zona para adultos: productos de pago único con barrera parental. */
  private openAdultZone(): void {
    openParentalGate(this, {
      title: 'Contenido con dinero real',
      subtitle: 'Esta sección es para un adulto. Para continuar, resuelve:',
      onPass: () => this.openPacks(),
    });
  }

  private openPacks(): void {
    const c = this.add.container(0, 0).setDepth(80);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.72).setOrigin(0).setInteractive());
    c.add(makePanel(this, W / 2, H / 2, 490, 860));
    c.add(makeText(this, W / 2, H / 2 - 392, 'CONTENIDO OPCIONAL', 25, '#8a6fd0'));
    c.add(makeText(this, W / 2, H / 2 - 362, 'Pago único · solo cosméticos · la campaña sigue gratis', 13, '#a06a35', false));

    let y = H / 2 - 316;
    PACKS.forEach((pack) => {
      const owned = this.save.paid[pack.id] === true;
      const g = this.add.graphics();
      g.fillStyle(owned ? 0xeafbea : 0xfaf5ec, 1);
      g.fillRoundedRect(W / 2 - 224, y - 8, 448, 200, 16);
      g.lineStyle(3, owned ? 0x4ade80 : 0xd4b58c, 1);
      g.strokeRoundedRect(W / 2 - 224, y - 8, 448, 200, 16);
      c.add(g);
      c.add(makeText(this, W / 2, y + 14, pack.name, 15, '#6b4423', false));
      c.add(makeText(this, W / 2, y + 34, pack.tagline, 12, '#8a6fd0', false));
      pack.contents.forEach((line, i) => {
        c.add(makeText(this, W / 2 - 210, y + 56 + i * 19, `• ${line}`, 11, '#a06a35', false).setOrigin(0, 0.5));
      });
      const priceY = y + 56 + pack.contents.length * 19 + 12;
      c.add(makeText(this, W / 2 - 100, priceY, pack.priceBs, 15, '#e07b2a', false));
      if (owned) {
        c.add(makeText(this, W / 2 + 150, priceY, '✓ ADQUIRIDO', 14, '#2f9e44', false));
      } else {
        c.add(makeButton(this, W / 2 + 132, priceY, 176, 42, 'PROBAR (DEMO)', {
          bg: COLORS.mintDark, fontSize: 12,
          onClick: () => {
            if (unlockPack(this.save, pack.id, 'demo')) {
              writeSave(this.save);
              audio.unlock();
              c.destroy();
              this.scene.restart({ cat: this.cat, page: this.page });
            }
          },
        }));
      }
      c.add(makeText(this, W / 2, priceY + 26, pack.note, 10, '#8a6fd0', false));
      y += 214;
    });

    c.add(makeText(this, W / 2, H / 2 + 336,
      'En esta versión web NO se cobra nada: «Probar (demo)» desbloquea el contenido\npara que un adulto lo evalúe. La compra real se activa en la versión de tienda\n(Google Play / APK) con estos mismos contenidos y precios.', 11, '#a06a35', false));
    c.add(makeText(this, W / 2, H / 2 + 380,
      'No vendemos pistas ni ventajas para resolver los puzles, ni cajas aleatorias,\nni monedas con dinero real, ni ofertas con cuenta atrás.', 11, '#8a6fd0', false));
    c.add(makeButton(this, W / 2, H / 2 + 412, 220, 50, 'CERRAR', {
      bg: COLORS.purple, fontSize: 18, onClick: () => c.destroy(),
    }));
    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  }
}

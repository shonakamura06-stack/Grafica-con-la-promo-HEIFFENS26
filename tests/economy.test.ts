/**
 * Pruebas de la Economía V3:
 *  - campaña sin energía (reintentos ilimitados)
 *  - monedas por logros ÚNICOS (sin duplicación)
 *  - misiones sin rachas diarias
 *  - tienda de cosméticos, paquete y packs de pago
 *  - migración desde la economía V2 sin perder datos
 *  - métricas agregadas locales
 */
import { describe, it, expect } from 'vitest';
import * as saveModule from '../src/systems/save';
import {
  defaultSave, migrateSave, ownsItem, isEquipped, KEY, SaveData,
} from '../src/systems/save';
import {
  settleLevel, settleChallenge, claimMission, missionState, claimableMissions,
  buyItem, equipItem, unequipSlot, unlockPack, COIN_REWARDS, MAX_COINS,
  coinShopTotal, coinShopTotalWithBundle,
} from '../src/systems/economy';
import { SHOP_ITEMS, ALL_ITEMS, PACKS, CATEGORY_PRICE, itemById, DELUXE_ITEMS, DELUXE_EXTRAS } from '../src/data/shop';
import { MISSIONS } from '../src/data/missions';

describe('campaña gratuita: sin energía ni esperas', () => {
  it('el guardado V3 ya no tiene corazones, premium ni anuncio', () => {
    const s = defaultSave() as unknown as Record<string, unknown>;
    expect(s.hearts).toBeUndefined();
    expect(s.heartsRefillAt).toBeUndefined();
    expect(s.premiumUntil).toBeUndefined();
    expect(s.lastDaily).toBeUndefined();
  });

  it('el módulo de guardado ya no exporta la economía de vidas', () => {
    const mod = saveModule as unknown as Record<string, unknown>;
    for (const gone of ['spendHeart', 'tickHearts', 'addHeart', 'buyHeartWithCoins', 'isPremium', 'claimDaily']) {
      expect(mod[gone], gone).toBeUndefined();
    }
  });

  it('se puede perder y volver a jugar el mismo nivel sin coste ni bloqueo', () => {
    const s = defaultSave();
    // Partida perdida: no se liquida nada (solo métricas de tiempo agotado).
    s.metrics.timeouts += 1;
    // Reintento inmediato: mismo nivel, mismas condiciones.
    const first = settleLevel(s, 7, 2, 12, 11, { mistakes: 1 });
    const again = settleLevel(s, 7, 2, 12, 11, { mistakes: 1 });
    expect(first.total).toBe(COIN_REWARDS.FIRST_WIN + COIN_REWARDS.PER_STAR * 2);
    expect(again.total).toBe(0); // repetir no paga
    expect(s.coins).toBe(first.total);
  });
});

describe('monedas por logros únicos', () => {
  it('primera victoria: 20 monedas, una sola vez', () => {
    const s = defaultSave();
    const r1 = settleLevel(s, 1, 3, 2, 2, {});
    expect(r1.firstWin).toBe(true);
    expect(r1.lines.some((l) => l.label === 'Primera victoria' && l.coins === 20)).toBe(true);
    const r2 = settleLevel(s, 1, 3, 2, 2, {});
    expect(r2.firstWin).toBe(false);
    expect(r2.lines.some((l) => l.label === 'Primera victoria')).toBe(false);
  });

  it('cada estrella nueva paga 5 y solo la diferencia', () => {
    const s = defaultSave();
    const r1 = settleLevel(s, 3, 1, 9, 7, { penalties: 2 });
    expect(r1.newStars).toBe(1);
    expect(s.coins).toBe(COIN_REWARDS.FIRST_WIN + 5);
    // Mejora a 3 estrellas: paga solo las 2 estrellas nuevas.
    const r2 = settleLevel(s, 3, 3, 7, 7, {});
    expect(r2.newStars).toBe(2);
    expect(s.coins).toBe(COIN_REWARDS.FIRST_WIN + 5 + 10 + COIN_REWARDS.OPTIMAL);
    // Otra vez 3 estrellas: nada.
    const r3 = settleLevel(s, 3, 3, 7, 7, {});
    expect(r3.newStars).toBe(0);
    expect(r3.total).toBe(0);
  });

  it('ruta óptima paga 10 una sola vez por nivel', () => {
    const s = defaultSave();
    const r1 = settleLevel(s, 5, 3, 8, 8, {});
    expect(r1.perfect).toBe(true);
    expect(r1.lines.some((l) => l.label === 'Ruta óptima')).toBe(true);
    const r2 = settleLevel(s, 5, 3, 8, 8, {});
    expect(r2.lines.some((l) => l.label === 'Ruta óptima')).toBe(false);
    expect(s.coins).toBe(20 + 15 + 10);
  });

  it('con penalizaciones no hay ruta óptima ni pago de óptimo', () => {
    const s = defaultSave();
    const r = settleLevel(s, 6, 3, 8, 8, { penalties: 1 });
    expect(r.perfect).toBe(false);
    expect(s.coins).toBe(20 + 15);
    // Si luego lo hace limpio en el óptimo, sí cobra los 10.
    const r2 = settleLevel(s, 6, 3, 8, 8, { penalties: 0 });
    expect(r2.perfect).toBe(true);
    expect(s.coins).toBe(20 + 15 + 10);
  });

  it('el récord personal da prestigio pero no monedas (no se puede granjear)', () => {
    const s = defaultSave();
    const r1 = settleLevel(s, 9, 3, 15, 14, {});
    expect(r1.record).toBe(false);            // no había marca anterior
    expect(s.bestDistance[9]).toBe(15);
    const r2 = settleLevel(s, 9, 3, 14, 14, {});
    expect(r2.record).toBe(true);             // mejoró su marca
    expect(r2.lines.some((l) => l.label === 'Ruta óptima')).toBe(true); // 14 == óptimo
    expect(s.bestDistance[9]).toBe(14);
    const coins = s.coins;
    expect(coins).toBe(20 + 15 + 10);
    // Mejora otra vez la marca: récord sí, monedas NO (ya se cobró todo).
    const r3 = settleLevel(s, 9, 3, 13, 16, {});
    expect(r3.record).toBe(true);
    expect(r3.total).toBe(0);
    // Y una partida peor que su marca: ni récord ni monedas.
    const r4 = settleLevel(s, 9, 3, 15, 16, {});
    expect(r4.record).toBe(false);
    expect(r4.total).toBe(0);
    expect(s.coins).toBe(coins);
    expect(s.bestDistance[9]).toBe(13);
  });

  it('jugar 50 veces el mismo nivel no duplica ninguna recompensa', () => {
    const s = defaultSave();
    let total = 0;
    for (let i = 0; i < 50; i++) total += settleLevel(s, 12, 3, 25, 25, {}).total;
    expect(total).toBe(20 + 15 + 10);
    expect(s.coins).toBe(45);
    expect(s.metrics.levelsCompleted).toBe(50);
    expect(s.metrics.coinsEarned).toBe(45);
  });

  it('modo desafío: insignia de 25 monedas una sola vez por nivel', () => {
    const s = defaultSave();
    const badge = settleChallenge(s, 4);
    expect(badge?.coins).toBe(COIN_REWARDS.CHALLENGE_BADGE);
    expect(settleChallenge(s, 4)).toBeNull();
    expect(s.metrics.challengeAttempts).toBe(2);
    expect(s.metrics.challengeCleared).toBe(1);
    expect(s.coins).toBe(25);
  });
});

describe('Modo Desafío separado de la campaña (Sprint 1)', () => {
  // El Modo Desafío es opcional, se desbloquea en el nivel 10 y usa 3 vidas por
  // partida. Nada de eso puede contaminar la campaña, que es gratis y sin vidas.
  it('superar un desafío NO completa el nivel en la campaña ni da estrellas ni desbloquea', () => {
    const s = defaultSave();
    const badge = settleChallenge(s, 10);
    expect(badge?.coins).toBe(COIN_REWARDS.CHALLENGE_BADGE);
    expect(s.challengeCleared[10]).toBe(true);
    // la campaña no se ha enterado
    expect(s.completed[10]).toBeUndefined();
    expect(s.stars[10] ?? 0).toBe(0);
    expect(s.perfectLevels[10]).toBeUndefined();
    expect(s.bestDistance[10]).toBeUndefined();
    expect(s.progress.levelsDone).toBe(0);
    expect(s.progress.threeStars).toBe(0);
    expect(s.progress.challengeCleared).toBe(1);   // contador propio, no compartido
    expect(s.unlockedLevel).toBe(1);               // no desbloquea el nivel 11
  });

  it('completar la campaña NO marca el desafío como superado', () => {
    const s = defaultSave();
    settleLevel(s, 10, 3, 17, 17);
    expect(s.completed[10]).toBe(true);
    expect(s.stars[10]).toBe(3);
    expect(s.challengeCleared[10]).toBeUndefined();
    expect(s.progress.challengeCleared).toBe(0);
    expect(s.metrics.challengeAttempts).toBe(0);
    // la insignia sigue intacta para cuando se juegue el desafío de verdad
    expect(settleChallenge(s, 10)?.coins).toBe(COIN_REWARDS.CHALLENGE_BADGE);
  });

  it('las partidas de desafío NO alimentan las misiones de la campaña', () => {
    const s = defaultSave();
    settleLevel(s, 12, 3, 19, 19, { challenge: true, couplesDelivered: 2 });
    expect(s.progress.couples ?? 0).toBe(0);
    expect(s.progress.cleanLevels ?? 0).toBe(0);
    // las mismas condiciones jugadas en campaña sí cuentan
    settleLevel(s, 13, 3, 19, 19, { couplesDelivered: 2 });
    expect(s.progress.couples).toBe(2);
    expect(s.progress.cleanLevels).toBe(1);
  });

  it('las dos bolsas de monedas no se pisan y ninguna paga dos veces', () => {
    const s = defaultSave();
    const antes = s.coins;
    settleLevel(s, 10, 2, 18, 17);
    const campana = s.coins - antes;
    expect(campana).toBe(COIN_REWARDS.FIRST_WIN + 2 * COIN_REWARDS.PER_STAR);
    settleChallenge(s, 10);
    expect(s.coins - antes).toBe(campana + COIN_REWARDS.CHALLENGE_BADGE);
    const trasAmbos = s.coins;
    expect(settleLevel(s, 10, 2, 18, 17).total).toBe(0);   // repetición de campaña: 0
    expect(settleChallenge(s, 10)).toBeNull();              // repetición de desafío: null
    expect(s.coins).toBe(trasAmbos);
  });

  it('la campaña no tiene vidas: 30 fracasos seguidos no bloquean ni cobran nada', () => {
    const s = defaultSave();
    const antes = s.coins;
    for (let i = 0; i < 30; i++) settleLevel(s, 7, 1, 30, 11, { mistakes: 3 });
    expect(s.metrics.levelsCompleted).toBe(30);
    // solo se cobra la primera victoria y su estrella: reintentar es gratis
    expect(s.coins - antes).toBe(COIN_REWARDS.FIRST_WIN + COIN_REWARDS.PER_STAR);
    expect(settleLevel(s, 7, 1, 30, 11, { mistakes: 3 }).total).toBe(0);
    // y no aparece ningún campo de vidas/corazones en el guardado
    expect((s as unknown as Record<string, unknown>).lives).toBeUndefined();
    expect((s as unknown as Record<string, unknown>).hearts).toBeUndefined();
  });
});

describe('misiones: sin rachas ni castigo por ausencia', () => {
  it('no se pueden cobrar antes de completarlas', () => {
    const s = defaultSave();
    expect(claimMission(s, 'm_3star')).toBe(0);
    expect(claimMission(s, 'inexistente')).toBe(0);
    expect(s.coins).toBe(0);
  });

  it('se cobran una sola vez aunque se intente muchas', () => {
    const s = defaultSave();
    for (let lvl = 1; lvl <= 3; lvl++) settleLevel(s, lvl, 3, 5, 5, {});
    expect(s.progress.threeStars).toBe(3);
    const first = claimMission(s, 'm_3star');
    expect(first).toBe(20);
    for (let i = 0; i < 10; i++) expect(claimMission(s, 'm_3star')).toBe(0);
    expect(s.coins).toBe(3 * (20 + 15 + 10) + 20);
    expect(s.metrics.missionsClaimed).toBe(1);
  });

  it('funcionan sin entrar cada día (timestamps arbitrarios)', () => {
    const s = defaultSave();
    for (let lvl = 1; lvl <= 5; lvl++) settleLevel(s, lvl, 3, 5, 5, {});
    const day1 = claimMission(s, 'h_cap1', Date.parse('2026-01-05T10:00:00Z'));
    const day90 = claimMission(s, 'm_perfect', Date.parse('2026-04-05T10:00:00Z'));
    expect(day1).toBe(50);
    expect(day90).toBe(30); // 90 días después sigue disponible, sin caducar
  });

  it('los contadores de parejas y niveles limpios avanzan cuando corresponde', () => {
    const s = defaultSave();
    settleLevel(s, 1, 3, 5, 5, { couplesDelivered: 2, mistakes: 0 });
    expect(s.progress.couples).toBe(2);
    expect(s.progress.cleanLevels).toBe(1);
    // Con reglas rotas (pareja separada) no suma parejas ni nivel limpio.
    settleLevel(s, 2, 3, 5, 5, { couplesDelivered: 1, penalties: 1 });
    expect(s.progress.couples).toBe(2);
    expect(s.progress.cleanLevels).toBe(1);
    // Con pisos equivocados tampoco cuenta como nivel limpio.
    settleLevel(s, 3, 3, 5, 5, { couplesDelivered: 1, mistakes: 2 });
    expect(s.progress.couples).toBe(3);
    expect(s.progress.cleanLevels).toBe(1);
  });

  it('el estado de las misiones refleja progreso y cobro', () => {
    const s = defaultSave();
    for (let lvl = 1; lvl <= 30; lvl++) settleLevel(s, lvl, 3, 5, 5, { couplesDelivered: 1 });
    s.monstersUnlocked = Array.from({ length: 20 }, (_, i) => `m${i}`);
    s.progress.album = 20;
    for (let lvl = 1; lvl <= 30; lvl++) settleChallenge(s, lvl);
    const states = missionState(s);
    expect(states.every((m) => m.done)).toBe(true);
    expect(claimableMissions(s).length).toBe(MISSIONS.length);
    const total = states.reduce((a, m) => a + claimMission(s, m.def.id), 0);
    expect(total).toBe(MISSIONS.reduce((a, m) => a + m.reward, 0));
    expect(claimableMissions(s).length).toBe(0);
  });

  it('las recompensas respetan las bandas acordadas (10-30 especiales, 50-100 hitos)', () => {
    for (const m of MISSIONS) {
      if (m.kind === 'special') {
        expect(m.reward).toBeGreaterThanOrEqual(10);
        expect(m.reward).toBeLessThanOrEqual(30);
      } else {
        expect(m.reward).toBeGreaterThanOrEqual(50);
        expect(m.reward).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('tienda de cosméticos', () => {
  it('los precios coinciden con las categorías acordadas', () => {
    for (const item of SHOP_ITEMS) {
      if (item.cat === 'pack') { expect(item.price).toBe(800); continue; }
      expect([0, CATEGORY_PRICE[item.cat]]).toContain(item.price);
    }
    expect(CATEGORY_PRICE).toMatchObject({ facade: 100, accessory: 150, elevator: 250, wallpaper: 300, theme: 500 });
  });

  it('comprar descuenta monedas, marca propiedad y equipa', () => {
    const s = defaultSave();
    s.coins = 500;
    const r = buyItem(s, 'f_menta');
    expect(r.ok).toBe(true);
    expect(r.spent).toBe(100);
    expect(s.coins).toBe(400);
    expect(ownsItem(s, 'f_menta')).toBe(true);
    expect(equipItem(s, 'f_menta')).toBe(true);
    expect(isEquipped(s, 'f_menta')).toBe(true);
    expect(s.metrics.coinsSpent).toBe(100);
    expect(s.metrics.itemsByCategory.facade).toBe(1);
  });

  it('sin monedas suficientes no se compra (y no se descuenta nada)', () => {
    const s = defaultSave();
    s.coins = 99;
    const r = buyItem(s, 'f_menta');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('sin-monedas');
    expect(s.coins).toBe(99);
    expect(ownsItem(s, 'f_menta')).toBe(false);
  });

  it('no se puede comprar dos veces el mismo objeto', () => {
    const s = defaultSave();
    s.coins = 1000;
    expect(buyItem(s, 'a_lazo').ok).toBe(true);
    const second = buyItem(s, 'a_lazo');
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('ya-lo-tienes');
    expect(s.coins).toBe(850);
  });

  it('el paquete entrega exactamente su contenido y bloquea recompras', () => {
    const s = defaultSave();
    s.coins = 800;
    const pack = itemById('p_hotel')!;
    const r = buyItem(s, 'p_hotel');
    expect(r.ok).toBe(true);
    expect(s.coins).toBe(0);
    for (const id of pack.includes!) {
      expect(ownsItem(s, id), id).toBe(true);
      expect(buyItem(s, id).reason).toBe('ya-lo-tienes');
    }
    expect(s.coins).toBe(0); // ninguna recompra descontó ni sumó
  });

  it('los objetos de pago NO se pueden comprar con monedas', () => {
    const s = defaultSave();
    s.coins = 99999;
    for (const id of ['d_espacial', 'dm_corona', 'dd_fuente', 't_espacial']) {
      const r = buyItem(s, id);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('solo-pago');
      expect(ownsItem(s, id)).toBe(false);
    }
    expect(s.coins).toBe(99999);
  });

  it('no se puede equipar lo que no se tiene', () => {
    const s = defaultSave();
    expect(equipItem(s, 't_arcoiris')).toBe(false);
    expect(s.custom.theme).toBe('clasico');
    s.coins = 500;
    buyItem(s, 't_arcoiris');
    expect(equipItem(s, 't_arcoiris')).toBe(true);
    expect(s.custom.theme).toBe('t_arcoiris');
  });

  it('quitar accesorios devuelve al estado base', () => {
    const s = defaultSave();
    unlockPack(s, 'deluxe', 'demo');
    equipItem(s, 'dm_corona');
    expect(s.custom.monsterAcc).toBe('dm_corona');
    unequipSlot(s, 'monsterAcc');
    expect(s.custom.monsterAcc).toBe('ninguno');
    unequipSlot(s, 'celebration');
    expect(s.custom.celebration).toBe('normal');
  });

  it('los objetos gratis vienen con el juego', () => {
    const s = defaultSave();
    expect(ownsItem(s, 'f_crema')).toBe(true);
    expect(ownsItem(s, 'a_azul')).toBe(true);
    expect(ownsItem(s, 'e_naranja')).toBe(true);
    expect(ownsItem(s, 'w_liso')).toBe(true);
  });
});

describe('packs de pago único (contenido real, nada ficticio)', () => {
  it('todo el contenido listado existe en el catálogo', () => {
    for (const pack of PACKS) {
      expect(pack.contents.length).toBeGreaterThan(0);
      expect(pack.priceBs).toMatch(/Bs/);
      for (const id of pack.items) {
        const item = itemById(id);
        expect(item, `${pack.id}:${id}`).toBeDefined();
        expect(item!.source).not.toBe('coins');
        expect(item!.packId).toBe(pack.id);
      }
    }
  });

  it('el Pack Deluxe incluye lo prometido (trajes, accesorios, decoraciones, celebración)', () => {
    const deluxe = PACKS.find((p) => p.id === 'deluxe')!;
    const suits = deluxe.items.filter((id) => id.startsWith('d_')
      && !id.startsWith('dm_') && !id.startsWith('dd_') && id !== 'd_celebracion');
    const monsterAcc = deluxe.items.filter((id) => id.startsWith('dm_'));
    const decor = deluxe.items.filter((id) => id.startsWith('dd_'));
    expect(suits.length).toBe(5);
    expect(monsterAcc.length).toBe(5);
    expect(decor.length).toBe(2);
    expect(deluxe.items).toContain('d_celebracion');
    expect(DELUXE_ITEMS.length).toBe(10);
    expect(DELUXE_EXTRAS.length).toBe(3);
  });

  it('desbloquear un pack entrega su contenido y no se repite', () => {
    const s = defaultSave();
    expect(unlockPack(s, 'tema_espacial', 'store')).toBe(true);
    expect(ownsItem(s, 't_espacial')).toBe(true);
    expect(unlockPack(s, 'tema_espacial', 'store')).toBe(false);
    expect(unlockPack(s, 'pack_inexistente', 'store')).toBe(false);
    expect(s.metrics.packsUnlocked).toBe(1);
  });

  it('la demo no cobra monedas ni otorga monedas', () => {
    const s = defaultSave();
    s.coins = 10;
    expect(unlockPack(s, 'deluxe', 'demo')).toBe(true);
    expect(s.coins).toBe(10);
    expect(s.metrics.demoUnlocks).toBe(1);
    expect(ownsItem(s, 'd_gala')).toBe(true);
  });

  it('no hay cajas aleatorias: comprar siempre entrega lo mismo', () => {
    const s = defaultSave();
    s.coins = 800;
    const r1 = buyItem(s, 'p_hotel');
    const s2 = defaultSave();
    s2.coins = 800;
    const r2 = buyItem(s2, 'p_hotel');
    expect(r1.granted).toEqual(r2.granted);
  });

  it('la economía es cerrable pero no inflacionaria', () => {
    const individual = coinShopTotal();
    const bundle = coinShopTotalWithBundle();
    expect(bundle).toBeLessThan(individual);           // el paquete ahorra monedas
    expect(MAX_COINS).toBeGreaterThanOrEqual(bundle);  // un jugador completo puede tenerlo todo
    expect(MAX_COINS).toBeLessThan(individual * 1.4);  // sin exceso de monedas
  });
});

describe('migración desde la economía V2 (sin perder datos)', () => {
  const v2 = {
    version: 1,
    unlockedLevel: 18,
    stars: { 1: 3, 2: 2, 15: 3 },
    coins: 320,
    monstersUnlocked: ['bubu', 'chispa', 'moco', 'nube'],
    custom: { wallpaper: 'rosa', carpet: 'dorada', door: 'cristal', rese: 'morado', elevator: 'dorado', night: 'noche' },
    owned: { wallpaper_rosa: true, carpet_dorada: true, door_cristal: true, rese_morado: true, night_noche: true, elevator_menta: true },
    settings: { sound: false, music: true, vibration: true },
    seenTutorials: ['tut1'],
    hearts: 0,
    heartsRefillAt: 123456,
    premiumUntil: 0,
    adsWatched: 4,
    bestDistance: { 1: 2, 2: 5 },
    lastDaily: '2026-11-01',
  };

  it('conserva monedas, progreso, estrellas, álbum y ajustes', () => {
    const s = migrateSave(v2 as unknown as Record<string, unknown>);
    expect(s.unlockedLevel).toBe(18);
    expect(s.stars[1]).toBe(3);
    expect(s.bestDistance[2]).toBe(5);
    expect(s.monstersUnlocked).toContain('nube');
    expect(s.settings.sound).toBe(false);
    expect(s.seenTutorials).toContain('tut1');
    expect(s.version).toBe(3);
  });

  it('devuelve en monedas lo de categorías retiradas y conserva lo mapeable', () => {
    const s = migrateSave(v2 as unknown as Record<string, unknown>);
    // Devoluciones: alfombra dorada 50 + modo noche 80 + ascensor menta 40 = 170
    expect(s.migration?.refund).toBe(170);
    expect(s.coins).toBe(320 + 170);
    expect(ownsItem(s, 'f_rosa')).toBe(true);      // papel rosa -> fachada rosa
    expect(ownsItem(s, 'e_cristal')).toBe(true);   // puerta cristal -> ascensor cristal
    expect(ownsItem(s, 'e_dorado')).toBe(true);    // ascensor dorado
    expect(ownsItem(s, 'a_morado')).toBe(true);    // uniforme morado
  });

  it('traduce los cosméticos equipados a los nuevos ids', () => {
    const s = migrateSave(v2 as unknown as Record<string, unknown>);
    expect(s.custom.facade).toBe('f_rosa');
    expect(s.custom.elevator).toBe('e_dorado');
    expect(s.custom.accessory).toBe('a_morado');
    expect(s.custom.night).toBe(true);   // el modo noche ahora es gratis para todos
    expect(s.custom.wallpaper).toBe('w_liso');
  });

  it('elimina corazones, esperas y premium del guardado migrado', () => {
    const s = migrateSave(v2 as unknown as Record<string, unknown>) as unknown as Record<string, unknown>;
    expect(s.hearts).toBeUndefined();
    expect(s.heartsRefillAt).toBeUndefined();
    expect(s.premiumUntil).toBeUndefined();
    expect(s.adsWatched).toBeUndefined();
    expect(s.lastDaily).toBeUndefined();
  });

  it('deduce primera victoria y contadores de misiones del progreso anterior', () => {
    const s = migrateSave(v2 as unknown as Record<string, unknown>);
    expect(s.completed[1]).toBe(true);
    expect(s.completed[15]).toBe(true);
    expect(s.completed[3]).toBeUndefined();
    expect(s.progress.levelsDone).toBe(3);
    expect(s.progress.threeStars).toBe(2);
    expect(s.progress.album).toBe(4);
  });

  it('quien tenía premium activo recibe el Pack Deluxe como agradecimiento', () => {
    const conPremium = { ...v2, premiumUntil: Date.now() + 86_400_000 };
    const s = migrateSave(conPremium as unknown as Record<string, unknown>);
    expect(s.migration?.premiumConverted).toBe(true);
    expect(s.paid.deluxe).toBe(true);
    expect(ownsItem(s, 'd_gala')).toBe(true);
    expect(ownsItem(s, 'dd_fuente')).toBe(true);
    const sinPremium = migrateSave(v2 as unknown as Record<string, unknown>);
    expect(sinPremium.paid.deluxe).toBeUndefined();
  });

  it('migrar dos veces no duplica las devoluciones', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, val: string) => { store.set(k, val); },
      removeItem: (k: string) => { store.delete(k); },
    };
    store.set(KEY, JSON.stringify(v2));
    const first = saveModule.loadSave();
    const coinsAfterFirst = first.coins;
    saveModule.writeSave(first);
    const second = saveModule.loadSave();
    expect(second.coins).toBe(coinsAfterFirst);
    expect(second.migration?.fromVersion).toBe(1);
  });

  it('un guardado V2 corrupto o parcial no rompe el juego', () => {
    expect(migrateSave({} as Record<string, unknown>).coins).toBe(0);
    expect(migrateSave({ coins: -50 } as Record<string, unknown>).coins).toBe(0);
    expect(migrateSave({ stars: null as unknown as Record<number, number> } as Record<string, unknown>).stars).toEqual({});
  });
});

describe('métricas agregadas (locales, sin datos personales)', () => {
  it('acumulan juego, monedas y compras sin identificar a nadie', () => {
    const s = defaultSave();
    settleLevel(s, 1, 3, 2, 2, { mistakes: 1 });
    settleLevel(s, 1, 3, 2, 2, { mistakes: 2 });
    s.coins += 500;
    buyItem(s, 'f_menta');
    buyItem(s, 'a_lazo');
    claimMission(s, 'h_cap1');
    expect(s.metrics.levelsCompleted).toBe(2);
    expect(s.metrics.coinsEarned).toBe(45);
    expect(s.metrics.coinsSpent).toBe(250);
    expect(s.metrics.itemsBought).toBe(2);
    expect(s.metrics.itemsByCategory).toEqual({ facade: 1, accessory: 1 });
    // Ningún campo de las métricas es texto libre ni dato personal.
    for (const [k, v] of Object.entries(s.metrics)) {
      if (k === 'itemsByCategory') continue;
      expect(typeof v, k).toBe('number');
    }
    const serializado = JSON.stringify(s);
    expect(serializado).not.toMatch(/@|nombre|email|telefono/i);
  });

  it('las repeticiones quedan registradas como indicador de mejora', () => {
    const s: SaveData = defaultSave();
    s.completed[4] = true;             // nivel ya completado antes
    s.metrics.sessionsStarted += 1;
    s.metrics.levelReplays += 1;       // lo hace GameScene al reintentar
    expect(s.metrics.levelReplays).toBe(1);
  });
});

describe('sin duplicación de monedas (auditoría combinada)', () => {
  it('ninguna ruta suma monedas de más', () => {
    const s = defaultSave();
    // 1) Jugar mucho el mismo nivel
    for (let i = 0; i < 20; i++) settleLevel(s, 20, 3, 15, 15, { couplesDelivered: 2 });
    // 2) Modo desafío repetido
    for (let i = 0; i < 10; i++) settleChallenge(s, 20);
    // 3) Misiones reclamadas muchas veces
    for (let i = 0; i < 10; i++) for (const m of claimableMissions(s)) claimMission(s, m.def.id);
    // 4) Compras repetidas
    s.coins += 5000;
    for (let i = 0; i < 5; i++) buyItem(s, 'f_menta');
    for (let i = 0; i < 5; i++) buyItem(s, 'p_hotel');
    for (let i = 0; i < 5; i++) unlockPack(s, 'deluxe', 'demo');

    // Nivel 20: primera victoria 20 + 3 estrellas 15 + ruta óptima 10 = 45 (una sola vez)
    // Insignia de desafío: 25 (una sola vez)
    // Misiones alcanzables con esa partida: sin errores 30 + parejas 20 + desafío 25 = 75
    const esperadoGanado = 45 + 25 + 75;
    expect(s.metrics.coinsEarned).toBe(esperadoGanado);
    expect(s.coins).toBe(5000 + esperadoGanado - 100 - 800);
    expect(s.metrics.itemsBought).toBe(2);
    expect(s.metrics.packsUnlocked).toBe(1);
  });

  it('el total ganable jugando coincide con la suma de logros únicos', () => {
    // 30 primeras victorias + 90 estrellas + 30 óptimos + misiones + 30 insignias
    expect(MAX_COINS).toBe(30 * 20 + 90 * 5 + 30 * 10
      + MISSIONS.reduce((a, m) => a + m.reward, 0) + 30 * 25);
    // Todo el catálogo de monedas es alcanzable por un jugador completo.
    expect(MAX_COINS).toBeGreaterThanOrEqual(coinShopTotalWithBundle());
    // 12 objetos de pago comprables con monedas (sin contar el paquete).
    expect(ALL_ITEMS.filter((i) => i.source === 'coins' && i.price > 0 && i.cat !== 'pack').length).toBe(12);
  });
});

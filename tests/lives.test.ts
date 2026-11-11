import { describe, expect, it } from 'vitest';
import {
  defaultSave, loadSave, spendHeart, tickHearts, isPremium, addHeart,
  buyHeartWithCoins, claimDaily, REGEN_MS, PREMIUM_MS, HEART_COIN_COST,
  DAILY_COINS, formatMs,
} from '../src/systems/save';

describe('economía de corazones v2 (escasos)', () => {
  it('gasta corazones y programa regeneración lenta', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    expect(spendHeart(s, t0)).toBe(2);
    expect(spendHeart(s, t0)).toBe(1);
    expect(spendHeart(s, t0)).toBe(0);
    expect(s.heartsRefillAt).toBe(t0 + REGEN_MS);
  });

  it('NO recarga los 3 de golpe: 1 corazón por hora', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    spendHeart(s, t0); spendHeart(s, t0); spendHeart(s, t0);
    tickHearts(s, t0 + REGEN_MS - 1);
    expect(s.hearts).toBe(0);
    tickHearts(s, t0 + REGEN_MS);
    expect(s.hearts).toBe(1);
    tickHearts(s, t0 + REGEN_MS * 2);
    expect(s.hearts).toBe(2);
    tickHearts(s, t0 + REGEN_MS * 3);
    expect(s.hearts).toBe(3);
    expect(s.heartsRefillAt).toBe(0);
  });

  it('anuncio/regalo suman de a 1 corazón', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    spendHeart(s, t0); spendHeart(s, t0); spendHeart(s, t0);
    expect(addHeart(s, t0)).toBe(1);
    expect(addHeart(s, t0)).toBe(2);
  });

  it('comprar corazón con monedas: descuenta y respeta saldo', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    s.coins = HEART_COIN_COST - 1;
    spendHeart(s, t0);
    expect(buyHeartWithCoins(s, t0)).toBe(false);
    s.coins = HEART_COIN_COST + 50;
    expect(buyHeartWithCoins(s, t0)).toBe(true);
    expect(s.coins).toBe(50);
    expect(s.hearts).toBe(3);
  });

  it('premium = vidas infinitas 1 mes y llena corazones', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    s.premiumUntil = t0 + PREMIUM_MS;
    expect(isPremium(s, t0)).toBe(true);
    tickHearts(s, t0);
    expect(s.hearts).toBe(3);
    expect(spendHeart(s, t0)).toBe(3);
  });

  it('regalo diario: una vez por día, monedas + corazón', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    s.hearts = 1;
    expect(claimDaily(s, '2026-11-10', t0)).toBe(true);
    expect(s.coins).toBe(DAILY_COINS);
    expect(s.hearts).toBe(2);
    expect(claimDaily(s, '2026-11-10', t0)).toBe(false);
    expect(claimDaily(s, '2026-11-11', t0)).toBe(true);
    expect(s.coins).toBe(DAILY_COINS * 2);
  });

  it('formatMs para el contador de regeneración', () => {
    expect(formatMs(150_000)).toBe('2:30');
    expect(formatMs(-5)).toBe('0:00');
  });

  it('guardado antiguo sin campos nuevos se repara al cargar', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    };
    store.set('piso-equivocado-save-v1', JSON.stringify({ version: 1, unlockedLevel: 5, coins: 10 }));
    const s = loadSave();
    expect(s.hearts).toBe(3);
    expect(s.lastDaily).toBe('');
    expect(s.bestDistance).toEqual({});
  });
});

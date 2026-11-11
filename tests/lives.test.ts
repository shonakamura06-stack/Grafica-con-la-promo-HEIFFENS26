import { describe, expect, it } from 'vitest';
import {
  defaultSave, loadSave, spendHeart, tickHearts, isPremium, refillHearts,
  REFILL_MS, PREMIUM_MS, formatMs,
} from '../src/systems/save';

describe('economía de corazones (vidas)', () => {
  it('gasta corazones uno a uno y programa la recarga a 25 min', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    expect(s.hearts).toBe(3);
    expect(spendHeart(s, t0)).toBe(2);
    expect(spendHeart(s, t0)).toBe(1);
    expect(spendHeart(s, t0)).toBe(0);
    expect(s.heartsRefillAt).toBe(t0 + REFILL_MS);
  });

  it('no recarga antes de tiempo y sí al cumplirse los 25 min', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    spendHeart(s, t0); spendHeart(s, t0); spendHeart(s, t0);
    tickHearts(s, t0 + REFILL_MS - 1);
    expect(s.hearts).toBe(0);
    tickHearts(s, t0 + REFILL_MS);
    expect(s.hearts).toBe(3);
    expect(s.heartsRefillAt).toBe(0);
  });

  it('premium = vidas infinitas durante 1 mes y no gasta corazones', () => {
    const s = defaultSave();
    const t0 = 1_000_000;
    s.premiumUntil = t0 + PREMIUM_MS;
    expect(isPremium(s, t0)).toBe(true);
    expect(isPremium(s, t0 + PREMIUM_MS)).toBe(false);
    expect(spendHeart(s, t0)).toBe(3);
    expect(s.hearts).toBe(3);
  });

  it('el anuncio de recompensa recarga y limpia el temporizador', () => {
    const s = defaultSave();
    spendHeart(s, 1); spendHeart(s, 1); spendHeart(s, 1);
    expect(s.hearts).toBe(0);
    refillHearts(s);
    expect(s.hearts).toBe(3);
    expect(s.heartsRefillAt).toBe(0);
  });

  it('formatMs muestra min:seg para el contador de espera', () => {
    expect(formatMs(150_000)).toBe('2:30');
    expect(formatMs(0)).toBe('0:00');
    expect(formatMs(-5)).toBe('0:00');
  });

  it('un guardado antiguo sin campos de vidas se repara al cargar', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    };
    // Guardado "viejo": JSON sin hearts/premium/ads
    store.set('piso-equivocado-save-v1', JSON.stringify({ version: 1, unlockedLevel: 5, coins: 10 }));
    const s = loadSave();
    expect(s.hearts).toBe(3);
    expect(s.heartsRefillAt).toBe(0);
    expect(s.premiumUntil).toBe(0);
    expect(s.adsWatched).toBe(0);
    expect(s.unlockedLevel).toBe(5);
  });
});

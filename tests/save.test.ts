/**
 * Pruebas del sistema de guardado (localStorage simulado).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSave, writeSave, clearSave, defaultSave, SAVE_VERSION } from '../src/systems/save';

// localStorage mínimo para el entorno de pruebas
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

beforeEach(() => store.clear());

describe('guardado', () => {
  it('sin guardado previo devuelve los valores por defecto', () => {
    const s = loadSave();
    expect(s.unlockedLevel).toBe(1);
    expect(s.coins).toBe(0);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.settings.sound).toBe(true);
  });

  it('el progreso persiste tras guardar y recargar', () => {
    const s = defaultSave();
    s.unlockedLevel = 7;
    s.coins = 123;
    s.stars = { 1: 3, 2: 2 };
    s.monstersUnlocked.push('moco');
    writeSave(s);
    const loaded = loadSave();
    expect(loaded.unlockedLevel).toBe(7);
    expect(loaded.coins).toBe(123);
    expect(loaded.stars[1]).toBe(3);
    expect(loaded.monstersUnlocked).toContain('moco');
  });

  it('un guardado corrupto no rompe el juego (devuelve defecto)', () => {
    store.set('piso-equivocado-save-v1', '{no es json');
    expect(loadSave().unlockedLevel).toBe(1);
  });

  it('un guardado parcial se fusiona con los valores por defecto', () => {
    store.set('piso-equivocado-save-v1', JSON.stringify({ coins: 50 }));
    const s = loadSave();
    expect(s.coins).toBe(50);
    expect(s.settings.music).toBe(true);
    expect(s.custom.wallpaper).toBe('w_liso');
    expect(s.custom.facade).toBe('f_crema');
    expect(s.metrics.levelsCompleted).toBe(0);
  });

  it('clearSave elimina el progreso', () => {
    writeSave({ ...defaultSave(), coins: 99 });
    clearSave();
    expect(loadSave().coins).toBe(0);
  });
});

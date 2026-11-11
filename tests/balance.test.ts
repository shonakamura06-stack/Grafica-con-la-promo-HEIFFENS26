/**
 * Pruebas de la SIMULACIÓN DE BALANCE económico.
 * Los precios no se ajustan a ojo: se comparan con lo que gana cada perfil.
 */
import { describe, it, expect } from 'vitest';
import { simulateAll, simulateProfile, balanceTable, PROFILES, avgMinutesPerLevel } from '../src/systems/balance';
import { MAX_COINS, coinShopTotal, coinShopTotalWithBundle, COIN_REWARDS } from '../src/systems/economy';
import { SHOP_ITEMS } from '../src/data/shop';
import { MISSIONS } from '../src/data/missions';

const results = simulateAll();
const byId = (id: string) => results.find((r) => r.profile.id === id)!;

describe('simulación de perfiles de jugador', () => {
  it('cubre los 5 perfiles pedidos', () => {
    expect(PROFILES.map((p) => p.id)).toEqual(['casual', 'habitual', 'perfeccionista', 'repetidor', 'sesion_corta']);
    expect(results.length).toBe(5);
  });

  it('repetir niveles NO genera monedas (no se puede granjear)', () => {
    for (const r of results) expect(r.breakdown.replays).toBe(0);
    const rep = byId('repetidor');
    // 8 niveles con 8 repeticiones cada uno = 64 repeticiones que pagan cero.
    expect(rep.levelsPlayed).toBeGreaterThan(60);
    expect(rep.coins).toBe(
      8 * COIN_REWARDS.FIRST_WIN                       // primeras victorias
      + Math.round(8 * 2.5) * COIN_REWARDS.PER_STAR    // estrellas
      + 2 * COIN_REWARDS.OPTIMAL                       // 2 rutas óptimas
      + 2 * COIN_REWARDS.CHALLENGE_BADGE               // 2 insignias
      + 115                                            // misiones alcanzables
    );
  });

  it('nadie gana más que el máximo teórico del juego', () => {
    for (const r of results) {
      expect(r.coins).toBeLessThanOrEqual(MAX_COINS);
      const suma = r.breakdown.firstWin + r.breakdown.stars + r.breakdown.optimal
        + r.breakdown.missions + r.breakdown.challenge + r.breakdown.replays;
      expect(suma).toBe(r.coins);
    }
  });

  it('el jugador perfeccionista puede comprar todo el catálogo (economía cerrable)', () => {
    const p = byId('perfeccionista');
    expect(p.canBuyEverything).toBe(true);
    expect(p.itemsAffordable).toBe(p.itemsTotal);
    expect(p.coinsLeft).toBeLessThan(100); // ajuste fino: sin monedas sobrantes absurdas
  });

  it('los demás perfiles consiguen una parte atractiva pero no todo', () => {
    expect(byId('casual').itemsAffordable).toBeGreaterThanOrEqual(4);
    expect(byId('casual').canBuyEverything).toBe(false);
    expect(byId('habitual').itemsAffordable).toBeGreaterThan(byId('casual').itemsAffordable);
    expect(byId('sesion_corta').itemsAffordable).toBeGreaterThanOrEqual(3);
    expect(byId('repetidor').itemsAffordable).toBeLessThan(byId('perfeccionista').itemsAffordable);
  });

  it('ningún cosmético exige una cantidad absurda de partidas', () => {
    for (const r of results) {
      const barato = r.affordability.filter((a) => a.price === 100)[0];
      expect(barato.sessionsNeeded).toBeLessThanOrEqual(8);
      expect(barato.minutesNeeded).toBeLessThan(120);
      // El objeto más caro debe quedar a una distancia razonable (no inalcanzable).
      const caro = r.affordability.find((a) => a.id === 'p_hotel')!;
      expect(caro.sessionsNeeded).toBeLessThanOrEqual(60);
    }
  });

  it('los tiempos por nivel salen del tiempo límite calibrado', () => {
    for (const p of PROFILES) {
      const min = avgMinutesPerLevel(p);
      expect(min).toBeGreaterThan(0.5);
      expect(min).toBeLessThan(2.5);
    }
    expect(avgMinutesPerLevel(byId('perfeccionista').profile))
      .toBeLessThan(avgMinutesPerLevel(byId('casual').profile));
  });

  it('la simulación es determinista (mismos datos, mismo resultado)', () => {
    const a = simulateProfile(PROFILES[0]);
    const b = simulateProfile(PROFILES[0]);
    expect(a.coins).toBe(b.coins);
    expect(a.affordability).toEqual(b.affordability);
  });

  it('la tabla del informe tiene una fila por perfil', () => {
    const tabla = balanceTable();
    expect(tabla.split('\n').length).toBe(2 + PROFILES.length);
    expect(tabla).toContain('Jugador casual');
    expect(tabla).toContain('Repeticiones pagan');
  });

  it('el paquete ahorra monedas frente a comprar por separado', () => {
    expect(coinShopTotalWithBundle()).toBeLessThan(coinShopTotal());
    const pack = SHOP_ITEMS.find((i) => i.cat === 'pack')!;
    const valorSeparado = pack.includes!.reduce((a, id) => a + (SHOP_ITEMS.find((i) => i.id === id)?.price ?? 0), 0);
    expect(pack.price).toBeLessThan(valorSeparado);
  });

  it('las misiones están dentro de las bandas y suman lo esperado', () => {
    const total = MISSIONS.reduce((a, m) => a + m.reward, 0);
    expect(total).toBe(395);
    expect(total).toBeLessThan(MAX_COINS * 0.25); // las misiones no dominan la economía
  });
});

# Cómo añadir niveles — ¡Piso Equivocado!

Los niveles son **datos** en `src/data/levels.ts`. No hace falta tocar el
motor del juego.

## Formato

Cada nivel es una entrada en el array `LEVELS`:

```ts
{
  id: 31,                    // identificador único (siguiente número libre)
  title: 'Mi nivel',         // nombre corto que se muestra en el HUD
  floors: 6,                 // pisos disponibles (1..floors); 0 = recepción
  capacity: 4,               // espacios del ascensor
  timeLimit: 0,              // ← NO se escribe a mano: ver «El cronómetro» abajo
  breakdownChance: 0,        // 0..1 (las averías empiezan en el nivel 20)
  couples: [],               // parejas de ÍNDICES que deben viajar juntas
  enemies: [],               // parejas de ÍNDICES que no deben viajar juntas
  passengers: [
    P('bubu', 2),             // monstruo 'bubu' quiere ir al piso 2
    P('chispa', 5),
    P('gemelos', 3),          // los gemelos SIEMPRE en pareja…
    P('gemelos', 3),          // …y con el MISMO destino
  ],
}
```

`P(monstruo, piso)` es un helper local. Los ids de monstruo están en
`src/data/monsters.ts` (`bubu`, `chispa`, `moco`, `nube`, `draculin`, `rufi`,
`glup`, `sombrin`, `gordito`, `gemelos`, `nocti`, `fantasmita`, `turista`, `vip`,
`maletero`, `enamorado`, `grunon`, `pegajin`, `pegajon`, `temblorin`). Un monstruo
solo puede aparecer **a partir del nivel de su ficha** (`unlockLevel`) y debe
aparecer **exactamente en ese nivel** la primera vez: `tests/progression.test.ts`
lo comprueba, igual que comprueba que el título no prometa un monstruo que no está.

## Reglas de diseño

1. **Destinos entre 1 y `floors`** (nunca 0: recepción no es destino).
2. **Entre 3 y 10 pasajeros** por nivel.
3. **Capacidad ≥ 3** (≥ 2 si hay gigante o gemelos; con 3+ todo cabe).
4. **Gemelos:** exactamente 2 entradas con el mismo destino, o ninguna.
5. **Sombrín** puede aparecer varias veces (viaja solo cada vez).
6. El nivel debe ser **completable**: con capacidad ≥ 1 siempre lo es,
   pero comprueba que los gemelos quepan juntos (2 espacios).
7. El recorrido óptimo y las estrellas se calculan solos (Dijkstra).

## El cronómetro no se escribe a mano

`timeLimit` es el resultado de `recommendedTimeLimit(nivel)` de
`src/systems/timing.ts`: un presupuesto individual que suma leer la tarjeta,
tocar a cada pasajero, pulsar el botón, puertas, viajes, salidas, despertar a
Nocti, pensar entre viajes, aprender una regla nueva y reencuadrarse tras una
avería, **más el margen para equivocarse dos veces**. Para obtenerlo:

```bash
npx vitest run tests/timing.test.ts   # falla y dice qué valor toca poner
```

`tests/timing.test.ts` exige que el campo coincida EXACTAMENTE con el modelo y
que ningún nivel baje de 2 errores tolerables. Si cambias el roster o los
destinos de un nivel, su `timeLimit` cambia solo: no lo "redondees a ojo".

## La variedad manda sobre la curva monótona

`tests/progression.test.ts` fija la forma de la campaña. **No se exige que cada nivel tenga
más movimientos que el anterior**: se exige que el edificio sea natural y que la dificultad
compuesta no se desplome.

1. **Variedad de destinos**: al menos 4 pisos distintos en uso (o todos los del edificio si
   tiene menos) y ningún piso con más de la mitad de la tripulación. Amontonar huéspedes en
   el ático para alargar la ruta es un atajo artificioso y el test lo rechaza.
2. **Movimientos**: pueden bajar hasta 2 pasos en un nivel de consolidación, pero nunca dos
   niveles seguidos a la baja. El nivel 1 es trivial (≤3) y el 30 es el más largo (≥24).
3. **Índice de dificultad compuesto** (`difficultyIndex` de `systems/rules.ts`): movimientos
   + reglas y su combinación + presión de cabina (en lugares, no en bultos) + viajes +
   variedad de destinos + sonámbulos + averías. No puede caer más de 10 puntos entre niveles
   seguidos, toda caída debe recuperarse en 5 niveles, la tendencia a 8 niveles siempre sube
   y el nivel 30 es la cima.
4. **Atajos moderados**: romper una relación (juntar enemigos, separar parejas) puede ahorrar
   pasos, pero como máximo 4; si fuera mucho más, respetar las reglas parecería un castigo.
5. Cada mecánica se estrena una sola vez y en el nivel que dice su ficha.

Si un nivel nuevo rompe alguna de estas reglas, el test falla diciendo cuál y con qué número.

## Verificación automática

Tras añadir niveles, ejecuta:

```bash
npm test
```

`tests/levels.test.ts` valida destinos, monstruos, parejas de gemelos, capacidad
mínima, que **todos los niveles son completables** con óptimo finito y —esto es lo
importante— **reproduce los 30 planes óptimos paso a paso con las reglas reales del
motor** (`canBoard`/`canExit`), igual que hace `GameScene`: así no puede colarse un
nivel cuyo "óptimo" el juego no permita ejecutar sin penalización.

## Desbloqueo y álbum

- Los niveles se desbloquean en orden: completar el nivel N desbloquea
  el N+1 (hasta el último de la lista).
- Los monstruos de un nivel completado entran en el álbum. Si quieres que
  un monstruo nuevo aparezca «descubierto» en un nivel concreto, basta con
  incluirlo en sus pasajeros.
- Para añadir un monstruo nuevo: crea su entrada en `src/data/monsters.ts`
  (id, nombre, colores, personalidad, regla, espacios, nivel de
  desbloqueo, escala) y su dibujo en `src/scenes/BootScene.ts`
  (`DRAWERS[tuId]`). Sin esto último, el juego fallará al generar la
  textura: los tests no cubren el dibujo, así que prueba el nivel en el
  navegador tras añadirlo.

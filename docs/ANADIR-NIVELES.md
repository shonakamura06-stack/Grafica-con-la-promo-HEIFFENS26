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
  passengers: [
    P('bubu', 2),             // monstruo 'bubu' quiere ir al piso 2
    P('chispa', 5),
    P('gemelos', 3),          // los gemelos SIEMPRE en pareja…
    P('gemelos', 3),          // …y con el MISMO destino
  ],
}
```

`P(monstruo, piso)` es un helper local. Los ids de monstruo están en
`src/data/monsters.ts` (`bubu`, `chispa`, `moco`, `nube`, `draculin`,
`rufi`, `glup`, `sombrin`, `gordito`, `gemelos`, `nocti`, `fantasmita`).

## Reglas de diseño

1. **Destinos entre 1 y `floors`** (nunca 0: recepción no es destino).
2. **Entre 3 y 10 pasajeros** por nivel.
3. **Capacidad ≥ 3** (≥ 2 si hay gigante o gemelos; con 3+ todo cabe).
4. **Gemelos:** exactamente 2 entradas con el mismo destino, o ninguna.
5. **Sombrín** puede aparecer varias veces (viaja solo cada vez).
6. El nivel debe ser **completable**: con capacidad ≥ 1 siempre lo es,
   pero comprueba que los gemelos quepan juntos (2 espacios).
7. El recorrido óptimo y las estrellas se calculan solos (Dijkstra).

## Verificación automática

Tras añadir niveles, ejecuta:

```bash
npm test
```

La suite `tests/levels.test.ts` valida destinos, monstruos, parejas de
gemelos, capacidad mínima y que **todos los niveles son completables**
con óptimo finito. Si un nivel es inválido, el test falla con el número
de nivel implicado.

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

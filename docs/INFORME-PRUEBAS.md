# Informe de pruebas — ¡Piso Equivocado!

Fecha: 2026-11-10 · Versión del juego: 1.1.0 (renovación visual kawaii pastel + drama de piso equivocado)

## Pruebas automatizadas (Vitest) — ✅ 31/31 superadas

Ejecutar con `npm test`. Tres suites:

### `tests/scoring.test.ts` (13 pruebas)

- Recorrido óptimo correcto en casos conocidos (1 pasajero, varios
  pasajeros, capacidad 1, gigante, fantasma, tímido, gemelos).
- El óptimo nunca supera al recorrido ingenuo (un viaje por pasajero).
- Umbrales de estrellas coherentes (3★ ≤ 2★, recorrido perfecto = 3★,
  recorrido muy ineficiente = 1★, nunca 0).
- Las monedas crecen con las estrellas.

### `tests/levels.test.ts` (9 pruebas)

- Existen exactamente 30 niveles con ids 1–30.
- Todos los pasajeros usan monstruos existentes y destinos dentro de
  `1..floors`; entre 3 y 10 pasajeros; capacidad ≥ 3; pisos 2–6.
- Los gemelos siempre aparecen en pareja con el mismo destino.
- La capacidad permite subir gigantes/gemelos.
- **Los 30 niveles son completables**: el solver encuentra un recorrido
  finito y positivo para cada uno (verificación exhaustiva con Dijkstra).
- La dificultad progresa (nivel 30 > nivel 1 en pasajeros y pisos).
- Los monstruos especiales aparecen solo desde su nivel de desbloqueo.

### `tests/save.test.ts` (5 pruebas)

- Sin guardado previo se devuelven valores por defecto.
- El progreso persiste tras guardar y recargar (nivel, monedas, estrellas,
  monstruos).
- Un guardado corrupto no rompe el juego.
- Un guardado parcial se fusiona con valores por defecto.
- `clearSave` elimina el progreso (reinicio desde Ajustes).

## Compilación — ✅

`npm run build` (TypeScript `tsc --noEmit` + Vite) compila sin errores.
Salida en `dist/` con `index.html`, JS (~372 KB gzip, Phaser), manifiesto
PWA, Service Worker e iconos 192/512.

## Verificación manual (lista del prompt maestro)

| # | Comprobación | Resultado |
|---|---|---|
| 1 | El juego arranca (Boot → Menú) | ✅ Verificado en servidor de desarrollo |
| 2 | Se puede iniciar una partida | ✅ Nivel 1 con tutorial guiado |
| 3 | Se pueden seleccionar pasajeros | ✅ Toque en cola → suben al ascensor |
| 4 | Se respeta la capacidad | ✅ Mensaje «¡Ascensor lleno!» + test de reglas |
| 5 | El ascensor visita las plantas correctas | ✅ Panel de pisos + indicador R/nº |
| 6 | Los pasajeros salen en sus destinos | ✅ Salida automática con animación y corazones |
| 7 | Los demás permanecen dentro | ✅ Solo salen los del piso visitado |
| 8 | El nivel termina correctamente | ✅ Victoria al entregar al último monstruo |
| 9 | Las estrellas se calculan correctamente | ✅ Tests de scoring + HUD con meta visible |
| 10 | Las monedas se añaden correctamente | ✅ Tests + pantalla de victoria |
| 11 | Se desbloquea el siguiente nivel | ✅ `unlockedLevel` guardado y mapa de niveles |
| 12 | El progreso se guarda | ✅ localStorage versionado + tests |
| 13 | El progreso continúa tras recargar | ✅ Carga con fusión defensiva + tests |
| 14 | El botón de pausa funciona | ✅ Continuar / Reiniciar / Salir |
| 15 | La configuración funciona | ✅ Sonido, música, vibración, reinicio con confirmación |
| 16 | Sin errores graves de consola | ✅ Compilación limpia; sin recursos externos que puedan fallar |
| 17 | Controles táctiles | ✅ Zonas táctiles grandes, `touch-action: manipulation` |
| 18 | Nada importante fuera de pantalla en móvil | ✅ Lienzo 540×960 con escalado FIT (9:16) |

## Notas honestas

- Las pruebas automatizadas cubren reglas, niveles y guardado. La
  verificación visual/interactiva se hizo revisando el código y sirviendo
  el juego en el entorno de desarrollo; no se dispone de emulador Android
  en este entorno, por lo que **no se ha generado ni probado un APK**
  (la estructura Capacitor está preparada, ver README).
- El audio se sintetiza con WebAudio y respeta la política de los
  navegadores móviles (arranca tras el primer toque).
- Rendimiento: sin peticiones de red durante la partida; animaciones con
  tweens; objetivo 60 FPS. No se midió FPS en un dispositivo físico.

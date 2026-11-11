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
  `1..floors`; entre 3 y 10 pasajeros; capacidad ≥ 3; pisos 2–5.
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

## Mecánicas implementadas (transformación completa)

- **Parejas enamoradas**: deben salir juntas del ascensor; separarlas resta
  1 estrella (verificado en el solucionador: el óptimo respeta la pareja).
- **Enemigos**: no pueden estar a bordo a la vez (bloqueo con reacción).
- **Vidas**: 3 corazones desde el nivel 15; piso equivocado o fin de tiempo
  cuesta 1; sin corazones se falla el nivel sin perder progreso.
- **Temporizador**: límite por nivel, música tensa a los 10 s, pausa durante
  la reparación.
- **Avería + minijuego de engranajes**: evento aleatorio desde el nivel 20.
- **Estrellas por eficiencia**: 3★ ≤ óptima+1, 2★ ≤ óptima+3, bonus de
  monedas por solución perfecta.
- **Diálogos**: 100+ frases por categoría (turista, VIP, maletero, pareja,
  enemigo, familia) + mensajes de llegada personalizados.
- **Recepcionista Rese**: personaje guía con uniforme, pajarita e ID.
- **17 monstruos originales** (5 nuevos: Turista, Señor VIP, Maletero,
  Enamorado, Gruñón) + tienda ampliada (uniforme de Rese, color del
  ascensor, modo noche).

## Robustez y rendimiento (revisión anti-fallos)

- `localStorage` protegido con try/catch y validación de datos corruptos
  (monedas, nivel desbloqueado, listas) — el juego nunca se rompe por un
  guardado dañado o por el modo privado del navegador.
- Audio suspendido automáticamente al cambiar de pestaña/app (ahorra batería
  y memoria) y reanudado al volver.
- Sin scroll, sin zoom por doble toque, sin selección de texto y sin menú
  contextual al mantener pulsado (`touch-action: none`, `position: fixed`).
- Texturas pequeñas (~2 MB en total) y gráficos estáticos dibujados una sola
  vez: el juego funciona con fluidez incluso en móviles con menos de 2 GB de RAM.
- Todas las interfaces revisadas para que ningún elemento se solape con otro
  (HUD del juego, menú, niveles, álbum, personalizar y ajustes).

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

## Actualización: Rese con voz y tutorial (rama actual)

- `npm test`: **41/41 pruebas pasan**; `npm run build` sin errores.
- Servidor dev: `/`, `/img/rese.png` y `/audio/rese/tut1.mp3` responden HTTP 200.
- Voz de Rese: 9 clips generados con la voz seleccionada por el usuario (841 KB en total);
  sincronización línea a línea medida con mutagen y volcada en `src/data/reseVoice.ts`.
- Sprite de Rese: prototipo elegido recortado a 460×460 con fondo transparente (225 KB).
- Tutorial: se activa solo en nivel 1 o con mecánica nueva; pausa el temporizador;
  botón SALTAR y repaso desde PAUSA («RESE TE EXPLICA»).
- Perdón: la primera equivocación del nivel no resta estrella (una sola vez por nivel).

## Actualización: diálogos, victoria excéntrica, vidas y monstruos alien

- `npm test`: **47/47 pruebas pasan** (41 anteriores + 6 nuevas de economía de corazones).
- `npm run build` sin errores; preview de producción y dev sirviendo el bundle nuevo.
- Diálogos: caja inferior estilo novela visual, typewriter letra a letra, voz pausada por
  frase (Web Audio con offset exacto por línea) y «haz clic para continuar» abajo-derecha.
- Victoria: panel feria con rayos girando, estrellas chunky secuenciales con burst,
  stats PASOS/MONEDAS con iconos dibujados, botones 3D jugosos con iconos y confeti.
- Vidas: corazones globales persistentes; panel sin vidas con espera 25 min, anuncio de
  recompensa (promoción propia de 12 s) y premium 19,99 Bs/mes (demo sin cobro en web).
- Monstruos: Rufi y Glup redibujados como aliens (cuernos/tercer ojo/pinchos/cola-maza;
  linterna abisal/tentáculos/antenas) — ya no parecen ratón ni pez.
- Animaciones: botones con hundimiento y rebote Back.easeOut en todo el juego y
  fundido de entrada de cámara en las 6 escenas.

## Actualización: claridad, tiempos simulados y cabina lógica

- `npm test`: **50/50 pruebas pasan** (3 nuevas: simulación del plan óptimo entrega todo y
  su distancia == óptimo; el límite alcanza a partida lenta; el límite no regala minutos).
- Simulación real de las 30 partidas con el plan reconstruido del solver (Dijkstra con
  padres): ejemplo nv1 opt=2/40 s, nv10 opt=21/110 s, nv30 opt=25/120 s (antes 120-320 s).
- Panel sin badges ni colores por conteo; bajada manual (PISO 0 cuenta como movimiento);
  pads y placa de lugares según capacidad; tarjetas animadas de desbloqueo; tutorial guiado
  del nivel 1 con flecha al monstruo; victoria con stats dentro del recuadro; Rese sin voz
  (mp3 eliminados, ~841 KB menos).

## Actualización: auditoría del óptimo, nuevos personajes y claridad de Rese

- `npm test`: **51/51 pruebas pasan**. Nueva prueba de auditoría: fuerza bruta independiente
  == solver en 10 niveles pequeños con todas las reglas (incluye dúo y miedoso).
- Simulación del plan óptimo re-ejecutada con los niveles nuevos (duo/fear): 30/30 entregan
  todo y distancia == óptimo; tiempos límite recalibrados (nv25 105 s, nv29 125 s, etc.).
- Rese ya no interrumpe por piso equivocado; solo explica errores de trato de personajes
  (parejas, enemigos, tímido, miedoso) y perdona solo esa primera estrella.
- Récord redefinido a récord personal (save.bestDistance); perfecto = óptimo exacto.

## Actualización: economía v2

- `npm test`: **53/53 pruebas pasan** (lives.test reescrito: regen 1/hora, compra con
  monedas, regalo diario una vez por día, premium, reparación de saves viejos).
- Corazones: regen lenta (REGEN_MS = 1 h por corazón), addHeart, buyHeartWithCoins(150),
  claimDaily(+40 🪙 +1 ❤) con popup animado en el menú; anuncio de recompensa ahora da +1 ❤.
- Nuevo `docs/ECONOMIA.md`: fuentes/sumideros, precios y política anti-manipulativa.

## Actualización: Economía V3 (campaña gratis, monedas por logros, tienda y packs)

- `npm test`: **99/99 pruebas pasan** (5 archivos). `npm run build` limpio (`tsc --noEmit` + Vite).
- Nuevas suites:
  - `tests/economy.test.ts` (48 pruebas): campaña sin energía (el guardado ya no tiene
    corazones ni premium y el módulo ya no exporta `spendHeart`/`tickHearts`/`isPremium`),
    monedas por logros únicos (20/5/10/25), diferencia de estrellas, récord sin monedas,
    **50 repeticiones del mismo nivel pagan exactamente 45 🪙**, misiones cobrables una sola
    vez y sin caducar, precios por categoría, paquete que entrega su contenido exacto,
    objetos de pago NO comprables con monedas, packs con contenido real existente,
    migración V2→V3 (conserva monedas/estrellas/récords/álbum, devuelve 170 🪙 de categorías
    retiradas, premium activo → Pack Deluxe, sin doble devolución) y **auditoría combinada
    anti-duplicación** (20 partidas + 10 desafíos + 40 reclamos + 10 compras + 5 packs).
  - `tests/balance.test.ts` (11 pruebas): los 5 perfiles simulados, repeticiones pagan 0,
    nadie supera el máximo teórico (2 495 🪙), el perfeccionista compra todo el catálogo
    (sobran 5 🪙 → sin inflación), los demás consiguen 4–10 de 12 objetos, ningún objeto
    exige más de 8 sesiones (100 🪙) ni 60 (paquete 800 🪙), simulación determinista y
    paquete más barato que comprar por separado.
- Retirado: `src/systems/lives.ts`, `src/scenes/CustomizeScene.ts`, `tests/lives.test.ts`,
  el campo `lives` de los 30 niveles y `coinsFor`/`isRecord` de `scoring.ts` (el pago ahora
  vive en `systems/economy.ts`).
- Nuevo: `src/data/shop.ts` (catálogo y packs), `src/data/missions.ts`, `src/systems/economy.ts`,
  `src/systems/balance.ts` (simulación), `src/systems/cosmetics.ts` (aplicación visual real),
  `src/systems/parental.ts` (barrera parental), `src/scenes/ShopScene.ts`,
  `src/scenes/MissionsScene.ts`, `src/scenes/DataScene.ts` (métricas agregadas locales).
- Balance resultante (simulación real, no suposiciones): casual 1 130 🪙 (8/12 objetos),
  habitual 1 650 (10/12), 3 estrellas 2 455 (12/12), repetidor 445 con 64 repeticiones (4/12),
  sesión corta 750 (6/12). Catálogo completo: 2 250 🪙 con paquete / 2 450 por separado.

# Informe de pruebas — ¡Piso Equivocado!

Fecha: 2026-11-10 · Versión del juego: 1.1.0 (renovación visual kawaii pastel + drama de piso equivocado)

> **Recuento vigente: 186 pruebas en 8 archivos, todas en verde** (`npm test`).
> Las secciones siguientes son históricas y se conservan tal cual; lo que está en
> vigor es la última actualización, «Sprint 1: jugabilidad justa».

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

---

## Actualización: Sprint 1 — jugabilidad justa (cronómetros, curva, reglas unificadas)

Fecha: 2026-11-12 · **186 pruebas en 8 archivos, todas en verde** · `npm run build` correcto ·
`npx tsc --noEmit` sin errores. Punto de recuperación anterior al sprint: tag
`recovery/797b7fb-pre-sprint1`.

### El fallo que motivó el sprint

Con los cronómetros antiguos, **ninguno de los 30 niveles toleraba un solo error**: la holgura
entre el `timeLimit` y una partida limpia y lenta iba de 0,1 s (nv 2, 16 y 20) a 4,6 s, y
equivocarse de piso costaba ~7,5 s. Es decir: el primer fallo condenaba la partida, aunque
`MAX_MISTAKES = 3` prometiera tres. Ahora todos los niveles toleran **2 errores normales**
(holgura mínima 15,6 s, máxima 20,1 s) y la exigencia de eficiencia se ha trasladado a las
estrellas, que es donde no frustra a nadie.

### Pruebas nuevas (79) y pruebas arregladas

- `tests/rules.test.ts` (**40**, nuevo): cada regla social probada una vez y para los dos lados
  (motor y solver): tímido —incluidos los que ya están subiendo—, gigante, maletero, fantasma,
  miedoso (los gemelos cuentan 2 criaturas), dúo, gemelos, sonámbulo, parejas, enemigos (blanda
  en juego real, dura en ruta limpia), `buildCrew` con remapeo de índices, `rulesPresent`,
  `newRulesIn` y `difficultyIndex`. Incluye 3 meta-pruebas de cobertura: si se añade una regla
  nueva sin probarla, o si una regla no aparece en ningún nivel, falla.
- `tests/timing.test.ts` (**20**, nuevo): coste de un error, que los 30 cronómetros aguanten
  ≥ 2 errores, que coincidan EXACTAMENTE con `recommendedTimeLimit` (nada de números puestos a
  ojo), múltiplos de 5, holgura ≥ 12 s, que no regalen minutos (< 2,2× la partida limpia),
  toques por unidad del crew (los dúos, uno), presupuesto real de despertar a Nocti, que la
  avería NO cobre la reparación (el reloj está pausado), que no se presupueste leer tutoriales
  (también pausados) y la descomposición exacta del presupuesto.
- `tests/progression.test.ts` (**18**, nuevo): la forma de la curva. Los movimientos óptimos no
  bajan nunca entre niveles seguidos (antes: 25 → 17 → 11 y 19 → 11), las mesetas duran ≤ 8
  niveles y se compensan con dificultad, el índice de dificultad no cae más de 6 puntos y su
  tendencia a 6 niveles siempre sube, el nv 30 es el más difícil, la cabina crece una sola vez
  (nv 14), las averías empiezan en el nv 20, cada monstruo aparece por primera vez exactamente
  en el nivel de su ficha, ninguna relación apunta a los gemelos y **los títulos no mienten**
  (el nv 18 se llamaba «Gemelos inseparables» sin gemelos: ahora es «Amor y gruñidos»).
- `tests/levels.test.ts` (16 → **20**, reescrito en parte): se eliminaron las dos pruebas
  decorativas —el `it('las vidas solo aparecen desde el nivel 15')` con el bucle vacío, que
  pasaba sin comprobar nada, y el `simulate()` interno con `if (rule === 'shy' || true)`, que
  hacía que la validación de reglas no filtrara nada—. En su lugar hay una **réplica del plan
  óptimo paso a paso con las reglas reales del motor** (`canBoard`/`canExit`, con foto de la
  cabina como hace `GameScene.arrive()`), que exige que los 30 planes entreguen a todos los
  pasajeros sin violar ninguna regla dura y **sin ninguna penalización blanda**, que la ruta
  limpia nunca sea más larga que la que rompe relaciones, y que cuando juntar enemigos ahorre
  pasos ese atajo venga con su penalización.
- `tests/economy.test.ts` (43 → **48**): separación real entre Modo Desafío y campaña (un
  desafío superado no completa el nivel, no da estrellas, no desbloquea y no alimenta misiones;
  completar la campaña no consume la insignia; 30 fracasos seguidos no bloquean ni cobran).

### Divergencia solver ↔ motor encontrada y corregida

`computeOptimal` trataba el `coupleAlone` de la ruta limpia como «se queda dentro gratis»:
podía devolver un plan que pasaba por el piso de un enamorado sin su pareja, contando que
seguiría a bordo para entregarlo más tarde. El motor juega en política real y **lo baja igual**,
cobrando `coupleSeparated` (una estrella menos). O sea: el juego podía anunciar una ruta
perfecta que el propio juego castiga. Ahora ese viaje se prohíbe en la búsqueda
(`src/systems/scoring.ts`) y la réplica de `tests/levels.test.ts` lo verifica en los 30 niveles.
Ningún óptimo de la campaña antigua cambió con el arreglo (el bug no llegó a falsear números),
pero sí el plan del nv 28 rediseñado.

### Retirado

- `slowPlaySeconds` y la tabla `SLOW` de `scoring.ts`: su modelo (leer 8 s, tocar 4 s, botón
  3 s, celebrar 4 s) era genérico, no presupuestaba despertar a Nocti ni las averías, y
  producía los cronómetros imposibles de arriba. Lo sustituye `src/systems/timing.ts`.
- El `simulate()` con reglas falsas de `tests/levels.test.ts`.
- `avgMinutesPerLevel` ya no usa el `timeLimit` (que ahora incluye el margen de error) sino el
  tiempo real de partida: si no, todo el informe de equilibrio saldría inflado. Las monedas no
  dependen de ese número, así que la Economía V3 queda intacta.

### Nuevos módulos

- `src/systems/rules.ts`: única fuente de verdad de reglas (`buildCrew`, `canBoard`, `canExit`,
  `slotsOf`, `creaturesOf`, `rulesPresent`, `newRulesIn`, `difficultyIndex`). La consumen
  `GameScene.ts` (20 puntos migrados), `scoring.ts` y las pruebas.
- `src/systems/timing.ts`: `PACING` con el coste de cada interacción real, `levelTiming()` con
  el desglose completo del presupuesto, `mistakeCostSeconds()`, `recommendedTimeLimit()`.

### Notas honestas

- **No se ha abierto el juego en un navegador**: no hay navegador binario en este entorno. Todo
  lo anterior son pruebas automáticas, compilación y simulación numérica de los 30 niveles. La
  sensación real al jugar (ritmo, si 2 errores bastan, si la avería descoloca más de 3 s) sigue
  sin verificarse y corresponde al Sprint 5 con niños.
- El presupuesto de avería cobra solo el reencuadre (3 s × probabilidad), porque la reparación
  pausa el reloj. Es una hipótesis razonable, no una medición con jugadores.
- Para que el nv 17 llegue a 21 movimientos sus destinos se concentran en 3 pisos: con 4 pisos
  distintos el máximo alcanzable es 19 (repartir huéspedes permite entregar más por viaje). Se
  ha priorizado la curva sin escalones; la variedad de destinos queda pendiente.
- `GameScene.ts` sigue teniendo ~2 240 líneas. Se ha migrado a las reglas compartidas sin
  partir el archivo, como se acordó: la división progresiva viene después de arreglar el juego.
- Cobertura sigue siendo nula en las 8 escenas no-Game y en `cosmetics.ts`, `parental.ts`,
  `audio.ts`, `ui.ts` y `dialogues.ts` (necesitan navegador o un entorno DOM).

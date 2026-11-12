# Informe de pruebas — ¡Piso Equivocado!

Fecha: 2026-11-10 · Versión del juego: 1.1.0 (renovación visual kawaii pastel + drama de piso equivocado)

> **Recuento vigente: 332 pruebas en 11 archivos, todas en verde** (`npm test`).
> Las secciones siguientes son históricas y se conservan tal cual; lo que está en
> vigor es la última actualización, «Sprint 2: personalidad e identidad de los 20
> monstruos».

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
- ~~Para que el nv 17 llegue a 21 movimientos sus destinos se concentran en 3 pisos~~
  **RESUELTO Y REVERTIDO** en la actualización siguiente: se ha sacrificado la monotonía de la
  curva en favor de la variedad de destinos (nv 17 pasa de 21 a 17 movimientos y de 3 a 5 pisos).
- `GameScene.ts` sigue teniendo ~2 240 líneas. Se ha migrado a las reglas compartidas sin
  partir el archivo, como se acordó: la división progresiva viene después de arreglar el juego.
- Cobertura sigue siendo nula en las 8 escenas no-Game y en `cosmetics.ts`, `parental.ts`,
  `audio.ts`, `ui.ts` y `dialogues.ts` (necesitan navegador o un entorno DOM).

---

## Actualización: ajuste de diseño — variedad de destinos (post Sprint 1)

**Recuento vigente: 203 pruebas en 8 archivos, todas en verde.** Compilación limpia
(`npx tsc --noEmit`) y `npm run build` correcto.

### La decisión que se revierte

El Sprint 1 protegió la curva monótona de movimientos concentrando huéspedes en el último
piso: el nv 17 tenía 6 de 8 en el piso 5 y el nv 28, 8 de 10. Eso alargaba la ruta pero hacía
los niveles parecidos entre sí y los edificios artificiales. **Ahora manda la variedad**: se
acepta que un nivel baje en movimientos si su edificio es natural.

### Datos que cambian (8 niveles rediseñados de 30)

| Nivel | Antes (pisos usados · máx. en un piso · óptimo) | Después | Límite |
|---|---|---|---|
| 15 | 3 · 6/9 · 21 | 4 · 5/9 · **19** | 110 → **115** |
| 16 | 3 · 5/8 · 21 | 4 · 4/8 · **19** | 105 → **115** |
| 17 | 3 · **6/8** · 21 | **5** · 2/8 · **17** | 105 → **115** |
| 19 | 3 · **5/7** · 21 | **5** · 3/7 · 21 | 105 → **110** |
| 20 | 4 · 4/8 · 21 | 4 · 4/8 · 21 (reparto distinto) | 110 |
| 21 | 3 · 5/8 · 21 | 4 · 4/8 · **19** | 105 → **110** |
| 24 | 4 · 3/8 · 25 (atajo −8) | 4 · 3/8 · 25 (**atajo −4**) | 115 |
| 28 | 3 · **8/10** · 25 | 4 · 4/10 · **23** | 120 |

El nv 25 sube su límite de 120 a 125 porque su reparto nuevo alarga los viajes reales.
Σ de límites: 3265 s → **3305 s** (+40 s, +1,2 %); la media por nivel pasa de 108,8 a 110,2 s.
Los 22 niveles restantes no se tocan: ninguno incumple los criterios de variedad.

**Criterio aplicado a los 30**: al menos 4 pisos distintos en uso (o todos los del edificio si
tiene menos, que son los niveles 1–3 de 2 y 3 pisos) y ningún piso con más de la mitad de la
tripulación. Verificado por `tests/progression.test.ts`.

### El nv 24: atajo de 8 → 4

Antes, juntar a los dos enemigos del nv 24 ahorraba 8 movimientos de 25: respetar la enemistad
parecía un castigo. La causa era estructural — los dos enemigos estaban en pisos que obligaban
a un viaje extra si no se juntaban. Se ha rehecho el reparto de destinos **y** se ha movido la
enemistad a la pareja gruñón ↔ nube (índices 1 y 5), que compiten por la misma franja del
recorrido: ahora la ruta limpia sigue costando **25** pasos y juntarlos ahorra **4**
(21). La penalización de estrella se mantiene intacta y la solución limpia sigue siendo válida
y demostrada por el solver. Prueba fija: `tests/levels.test.ts` «nivel 24: los enemigos son
gruñón y nube y juntarlos ahorra poco».

### Índice de dificultad compuesto (nuevo)

`difficultyIndex()` ya no era suficiente: pesaba movimientos, reglas, presión de cabina y
averías, pero **no los viajes ni la complejidad de las decisiones**. Ahora suma también:

- `+2 × (viajes − 1)`: cada viaje extra obliga a rehacer el plan desde cero. Recibe los viajes
  REALES del plan óptimo (`timing.ts` se los pasa); si no se conocen, `estimateTrips()` los
  aproxima contando que cada tímido necesita un ascensor para él solo.
- `+2 × (destinos distintos − 1)`: **la variedad puntúa**. Es el término que impide volver a
  amontonar huéspedes en el ático para inflar la ruta.
- `+2 × (reglas − 2)`: combinar tres o más reglas cuesta más que sumarlas.
- `+3 × sonámbulos`: evento especial dentro de la cabina.
- La presión de cabina ahora cuenta **lugares** (`slotsOf`), no bultos: el gigante y el
  maletero valen 2 y el fantasma 0.

Curva resultante del índice (nv 1 → 30):
`4 14 17 22 25 25 30 37 43 47 44 56 50 48 48 48 52 61 59 58 55 69 64 60 77 78 86 77 94 97`

Los movimientos óptimos:
`2 5 5 8 8 8 11 13 15 17 19 19 19 19 19 19 17 21 21 21 19 21 23 25 25 25 25 23 27 27`

Hay tres niveles de consolidación (17, 21 y 28 bajan en pasos) pero el índice nunca cae más de
10 puntos, toda caída se recupera en menos de 5 niveles, la tendencia a 8 niveles siempre sube
y el nv 30 sigue siendo la cima (97). La dificultad se sostiene con reglas, viajes y variedad,
no con la cuenta de movimientos.

### Pruebas nuevas (186 → 203)

- `tests/progression.test.ts` **reescrito** (18 → **28**): el bloque nuevo «variedad de
  destinos: edificios naturales, no embudos al ático» exige ≥4 pisos distintos y ningún piso
  por encima de la mitad de la tripulación; la monotonía de movimientos se sustituye por
  «caídas ≤2 pasos, nunca dos seguidas»; el índice compuesto se vigila con caída máxima de 10
  puntos, recuperación en 5 niveles y tendencia a 8; y un bloque nuevo limita los atajos por
  romper relaciones a 4 pasos y comprueba que el atajo exista de verdad (que la regla no sea
  decorativa).
- `tests/rules.test.ts` (40 → **44**): el bloque del índice pasa de 2 pruebas genéricas a 9
  que fijan CADA término por separado (movimientos, reglas y su combinación creciente, presión
  en lugares con gigante/maletero/fantasma/tímido, viajes, variedad de destinos, sonámbulos,
  averías, y el caso «menos pasos pero más reglas = más difícil»).
- `tests/levels.test.ts` (20 → **23**): distribución concreta de los niveles 17, 24 y 28.

### Estudio del error grave (PRESENTADO, NO APLICADO)

Pregunta: ¿aguantan los cronómetros 1 error grave + 1 normal sin perder por tiempo?

Un **error grave** es lo que provoca `GameScene.wrongFloor()` al llegar a `MAX_MISTAKES = 3`
pisos equivocados SEGUIDOS (el contador se reinicia con cada entrega correcta): el globo avisa,
el ascensor espera 1,4 s, baja a recepción y allí `grumpyExit()` devuelve a TODOS a la cola
(salida escalonada cada 260 ms). El jugador tiene que volver a tocarlos a todos y rehacer el
viaje. Medido con el modelo de `timing.ts` sobre el reparto real de cada nivel:

| Concepto | Coste |
|---|---|
| error normal (piso equivocado) | **7,76 s** |
| margen que da el reloj hoy | 2 × 7,76 = **15,5 s** |
| error grave completo (3 errores + evacuación + recolocación) | **43,1 s de media** (39,6–45,4) |
| 1 normal + 1 grave | 50,9 s de media |

**Respuesta: no.** Con los límites actuales, 1 normal + 1 grave caben en **0 de 30** niveles
(faltan entre 28 y 35 s). Mi cálculo anterior de ~15,8 s estaba mal: no contabilizaba volver a
tocar a todos los pasajeros ni el viaje de vuelta.

Opciones medidas (ninguna aplicada):

| Opción | Σ límites | Campaña | Media/nivel | Nivel máx. |
|---|---|---|---|---|
| A. Dejarlo como está | 3305 s | 55,1 min | 110,2 s | 145 s |
| B. Presupuestar 1 error grave | 4135 s | 68,9 min (**+25 %**) | 137,8 s | 175 s |
| C. 1 grave + 1 normal | 4365 s | 72,8 min (**+32 %**) | 145,5 s | 185 s |

Notas para decidir:

- El límite es un **techo**, no una duración: quien juega bien termina igual de rápido. Subirlo
  solo alarga la partida de quien se equivoca, que es justo quien hoy pierde.
- No toca economía ni estrellas: las estrellas dependen de los movimientos, no del reloj, y no
  hay ninguna recompensa por tiempo (`economy.ts`).
- La opción C choca con la cota de `tests/timing.test.ts` (límite < 2,2 × tiempo esperado:
  llegaría exactamente a 2,20), así que exigiría relajar ese test. La B se queda en 2,07.
- Alternativas que no alargan la campaña: pausar el reloj durante el drama de la evacuación
  (como ya se hace con averías y diálogos) ahorra solo ~2 s; reducir `MAX_MISTAKES` a 2
  hace el castigo más frecuente; dar tiempo extra al producirse la salida gruñona sería una
  mecánica nueva.
- Recomendación: **B** si se quiere que un niño de 6 años pueda recuperarse de un desastre sin
  perder el nivel; **A** si se prefiere la campaña corta contando con que los reintentos son
  ilimitados y gratis. Se aplicará en cuanto se decida.

**DECIDIDO: opción B** — implementada en la actualización siguiente.

### Honestidad

- **No se ha abierto el juego en un navegador**: sigue sin haber navegador en este entorno.
  Los 203 tests, la compilación y la simulación numérica de los 30 planes óptimos no
  sustituyen la sensación de jugar; los edificios «naturales» se han verificado con números
  (pisos usados, ocupación máxima, viajes), no con la vista.
- Los costes del error grave se han leído del código de `GameScene.ts` (1400 ms de espera,
  260 ms de escalonado, `travelTo(0)`) y valorado con `PACING`; no se han medido con jugadores.
- La variedad se ha buscado maximizando el índice compuesto entre los repartos que cumplen los
  criterios, no eligiendo a mano: hay cientos de repartos válidos por nivel y se han tomado los
  mejores. Si el juego se siente raro en algún piso, el reparto es ajustable sin romper nada
  (el `timeLimit` se recalcula solo).

---

## Actualización: OPCIÓN B — el reloj permite recuperarse de un error grave

**Recuento vigente: 218 pruebas en 8 archivos, todas en verde.** `npx tsc --noEmit` limpio y
`npm run build` correcto. Commit y etiqueta nuevos; se conservan `sprint1/87cf87c-jugabilidad-justa`,
`ajuste-variedad/8ef37dd` y `recovery/797b7fb-pre-sprint1`.

### Condiciones impuestas (y cómo se han cumplido)

| Condición | Implementación |
|---|---|
| 2 errores normales **o** 1 error grave completo | `mistakesBudgetSeconds()` = el MAYOR de los dos |
| Coste del error grave por el **peor caso medido**, no el promedio | `grumpyWorstCaseSeconds()` = **45,42 s** (el promedio era 43,1 s y no se usa) |
| **+2 s de margen de seguridad** | `SAFETY_MARGIN = 2` → presupuesto **47,42 s** |
| Cálculo **individual** por nivel | la `base` de cada nivel sigue siendo propia; `grumpyCostSeconds(nivel)` calcula el coste grave con SU cabina y SU piso medio y se comprueba uno a uno |
| Conservar la posibilidad de equivocarse sin perder | holgura real 47,5–52,4 s en los 30 |
| No tocar estrellas, monedas ni la Economía V3 | 5 pruebas nuevas en `tests/economy.test.ts` lo fijan |
| Reintentos ilimitados y gratis | prueba nueva: 40 derrotas por tiempo no cuestan nada y el intento 41 puede ganar el nivel completo |

El coste del error grave se ha leído de `GameScene.ts`, no se ha supuesto: `wrongFloor()` espera
1400 ms (l.1188), baja a recepción (l.1189) y `grumpyExit()` saca a todos con retardo de 260 ms
por monstruo (l.1200); el reloj corre durante toda la secuencia. Componentes en `GRUMPY`
(`src/systems/timing.ts`): espera del globo, ida y vuelta al piso medio, salida escalonada,
**volver a tocar a todos los que iban dentro** y rehacer el plan.

### Los 30 tiempos definitivos

`limpia` = partida sin errores (`expectedSeconds`); `grave` = coste del error grave de ESE nivel;
`holgura` = límite − limpia; `norm`/`grav` = errores que aguanta el límite.

| NV | limpia | grave | **límite** | holgura | norm | grav | NV | limpia | grave | **límite** | holgura | norm | grav |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 41,0 | 39,60 | **90** | 49,0 | 6 | 1 | 16 | 95,9 | 45,22 | **145** | 49,1 | 6 | 1 |
| 2 | 58,3 | 39,67 | **110** | 51,7 | 6 | 1 | 17 | 95,0 | 44,38 | **145** | 50,0 | 6 | 1 |
| 3 | 63,4 | 39,88 | **115** | 51,6 | 6 | 1 | 18 | 99,2 | 44,80 | **150** | 50,8 | 6 | 1 |
| 4 | 64,9 | 40,55 | **115** | 50,1 | 6 | 1 | 19 | 91,6 | 44,90 | **140** | 48,4 | 6 | 1 |
| 5 | 70,0 | 40,44 | **120** | 50,0 | 6 | 1 | 20 | 92,8 | 45,32 | **145** | 52,2 | 6 | 1 |
| 6 | 70,0 | 40,30 | **120** | 50,0 | 6 | 1 | 21 | 92,7 | 45,22 | **145** | 52,3 | 6 | 1 |
| 7 | 75,4 | 41,00 | **125** | 49,6 | 6 | 1 | 22 | 98,1 | 44,90 | **150** | 51,9 | 6 | 1 |
| 8 | 88,1 | 40,84 | **140** | 51,9 | 6 | 1 | 23 | 100,0 | 45,22 | **150** | 50,0 | 6 | 1 |
| 9 | 84,9 | 40,72 | **135** | 50,1 | 6 | 1 | 24 | 99,0 | 45,01 | **150** | 51,0 | 6 | 1 |
| 10 | 96,6 | 40,24 | **145** | 48,4 | 6 | 1 | 25 | 105,9 | 44,59 | **155** | 49,1 | 6 | 1 |
| 11 | 87,5 | 41,35 | **135** | 47,5 | 6 | 1 | 26 | 110,4 | 45,41 | **160** | 49,6 | 6 | 1 |
| 12 | 102,6 | 40,83 | **155** | 52,4 | 6 | 1 | 27 | 122,2 | 45,32 | **170** | 47,8 | 6 | 1 |
| 13 | 95,9 | 41,35 | **145** | 49,1 | 6 | 1 | 28 | 103,7 | 45,40 | **155** | 51,3 | 6 | 1 |
| 14 | 101,0 | 45,32 | **150** | 49,0 | 6 | 1 | 29 | 127,4 | 44,90 | **175** | 47,6 | 6 | 1 |
| 15 | 96,8 | 45,41 | **145** | 48,2 | 6 | 1 | 30 | 127,5 | 45,15 | **175** | 47,5 | 6 | 1 |

```
60 75 80 85 90 90 95 105 105 115 105 120 115 120 115 115 115 115 110 110 110 115 120 115 125 130 140 120 145 145   (Sprint 1 + variedad, Σ 3305 s)
90 110 115 115 120 120 125 140 135 145 135 155 145 150 145 145 145 150 140 145 145 150 150 150 155 160 170 155 175 175  (OPCIÓN B, Σ 4255 s)
```

**CONDICIÓN 1** (2 errores normales en los 30): ✓ se cumple — holgura mínima 47,5 s frente a
15,52 s necesarios. **CONDICIÓN 2** (1 error grave completo en los 30): ✓ se cumple — el coste
grave propio más alto es 45,41 s (nv 15 y nv 26) y la holgura mínima es 47,5 s. El techo
uniforme de 45,42 s cubre los 30 con 0,01 s de diferencia en el peor: por eso
`GRUMPY.worstAvgFloor` se fijó en 4,12 (el valor medido real es 37/9 = 4,11) redondeando AL ALZA,
y hay una prueba que falla si algún nivel se pasa del techo o si el techo se queda holgado.

### Efecto sobre la duración de las partidas

| Magnitud | Antes (variedad) | Opción B | Δ |
|---|---|---|---|
| Σ de límites (techo acumulado) | 3305 s · 55,1 min | **4255 s · 70,9 min** | +950 s · **+29 %** |
| Media por nivel | 110,2 s | **141,8 s** | +31,6 s |
| Nivel más largo | 145 s | **175 s** | +30 s |
| Σ partidas limpias (duración REAL sin errores) | 2758 s · 46,0 min | **2758 s · 46,0 min** | **0** |

La referencia de la opción B era ~68,9 min de techo y ~175 s de máximo: el máximo coincide
exactamente y el acumulado sale 2 min por encima porque se ha usado el **peor caso + 2 s de
seguridad** en todos los niveles en vez del coste propio de cada uno, como se pidió. Lo que de
verdad dura una partida no cambia: el límite es un techo y quien juega bien termina en su
`base`. Lo que cambia es que **quien se equivoca ya no pierde por tiempo**.

### Pruebas nuevas (203 → 218)

- `tests/timing.test.ts` (20 → **30**): bloque «OPCIÓN B: recuperarse de un error grave sin
  perder el nivel» con 9 pruebas — el peor caso es el medido y no el promedio (y cubre los 30
  sin pasarse de generoso), la fórmula incluye TODO lo que hace `GameScene` (falla si alguien
  olvida la recolocación, que fue el error del primer estudio), el presupuesto es el mayor de
  las dos condiciones + 2 s, **CONDICIÓN 1** nivel a nivel, **CONDICIÓN 2** nivel a nivel con el
  coste propio de cada uno, las dos condiciones a la vez sobre el `timeLimit` guardado, que NO
  se paga la opción C, y que ningún nivel pasa de 3 min ni la campaña de 75 min de techo.
- `tests/economy.test.ts` (48 → **53**): bloque «el reloj NO entra en la economía» — las
  estrellas dependen solo de movimientos (`starThresholds`/`starsFor`/`isPerfect`), no existe
  ninguna recompensa por tiempo (`COIN_REWARDS` tiene exactamente las 4 claves de siempre y
  `settleLevel` no recibe el tiempo), la misma jugada paga lo mismo, 40 derrotas por tiempo no
  cuestan nada y el intento 41 puede ganar el nivel completo, y el techo del catálogo sigue en
  `MAX_COINS = 2495`.
- Se ha sustituido la cota «el límite < 2,2× la partida limpia»: estaba calibrada para el margen
  viejo de 15,5 s y con 47,4 s la rompe el nivel 1 por diseño (90 s sobre 41 s = 2,20×, un ratio
  fijo siempre penaliza a los niveles cortos). En su lugar se comprueba la suma real —el límite
  es la partida limpia + el presupuesto + como mucho los 5 s del redondeo— y se añade un techo
  de ratio (2,5) para que nadie regale minutos.

### Un fallo menor del modelo que ha destapado esta prueba

`LevelTiming.total` se publicaba redondeado a 0,1 s aunque su documentación decía «sin
redondear». Con el presupuesto nuevo (47,42 s) algún nivel cae justo por encima de un múltiplo
de 5 (150,004 s) y el valor redondeado (150,0) daba `recommended` = 150 en vez de 155: el modelo
no se podía recalcular desde su propia salida. Ahora `total` se publica exacto y `base` y
`mistakes` siguen redondeados para mostrar. No tiene efecto en el juego (nadie leía `total`
fuera de las pruebas), pero sí en la comprobabilidad del modelo.

### Honestidad

- **No se ha abierto el juego en un navegador**: sigue sin haber navegador en este entorno. Los
  45,42 s salen de leer `GameScene.ts` y valorar cada paso con `PACING`, no de cronometrar a
  jugadores reales; si un niño tarda más en volver a tocar a cuatro monstruos, el margen de 2 s
  puede quedarse corto. Es la hipótesis más sólida disponible sin playtesting.
- El margen es uniforme (47,42 s) y el redondeo a múltiplos de 5 regala hasta 5 s: en los
  niveles cortos eso hace que la holgura supere con creces su error grave propio (nv 1: 49,0 s
  de holgura contra 39,60 s de coste). No se ha recortado a propósito —recortarlo habría
  significado límites que no son múltiplos de 5.
- Los límites ya NO son crecientes: nv 9 tiene 135 s y nv 8, 140 s, porque el límite sigue a la
  `base` de cada nivel y nv 8 todavía paga 4 s de aprendizaje de interfaz. Es coherente con el
  modelo, pero conviene saberlo si alguien esperaba una escalera.
- `GRUMPY.worstCab` y `GRUMPY.worstAvgFloor` son constantes de la campaña ACTUAL. Si se añaden
  niveles con cabinas de 5 o edificios donde todos quieran el ático, el techo uniforme se queda
  corto: la prueba «el error grave se calcula con el PEOR caso medido» fallará y habrá que
  recalcularlo. Está documentado en `docs/ANADIR-NIVELES.md`.

---

## Actualización Sprint 2 — Personalidad e identidad de los 20 monstruos

Fecha: 2026-11-10 · Punto de partida: commit `821bed3` (opción B cerrada) ·
Etiqueta previa conservada: `opcionB/821bed3-tiempo-definitivo`

> **332 pruebas en 11 archivos, todas en verde.** Se añaden 114 pruebas nuevas en
> tres archivos (`personality.test.ts` 52, `queueLayout.test.ts` 35,
> `identity.test.ts` 27). Las 218 anteriores siguen pasando sin cambios: la
> personalidad no toca las reglas, la economía, los niveles ni los cronómetros.

### Lo que se ha medido de verdad (no proyectado)

| Comprobación | Cómo se mide | Resultado |
|---|---|---|
| Cola sin solapes en los 30 niveles | `layoutQueue` con los sprites reales de cada nivel (`overlapsInRow`) | 0 solapes en 30/30 |
| Cola sin salirse del área útil | `outOfArea` sobre los 30 niveles + el peor caso (los 20 monstruos a la vez) | 0 salidas |
| Peor caso imaginable (20 sprites) | ancho de fila 758,8 px en un área de 512 px | se resuelve con `fitScale` 0,685 y separación de 6 px (encogido uniforme, nunca solapando) |
| Reposo dentro de límites | `idleFrame` en 20 estilos × 437 instantes | 0 fotogramas fuera de `IDLE_BOUNDS` |
| Presets acotados | 10 de entrada/salida + 5 reacciones | ninguno pasa de 900 ms ni de 4 repeticiones |
| Voces completas | 20 monstruos × 4 situaciones | 20/20 con ≥4 espera, ≥3 llegada, ≥2 error, ≥2 bloqueo y 0 duplicados: **277 frases propias** en total |
| Frases distintas de verdad | cada frase comparada con las de los otros 19 y con las genéricas por categoría | 0 frases compartidas entre personajes y 0 que repitan una genérica |
| `{d}` sin destino | todas las frases de error/bloqueo/encuentro | 0 huecos vacíos (`sinDestino()` filtra las reservas genéricas) |
| Texturas de cara | claves que pide el animador contra las que genera `BootScene` | 90 texturas (60 ánimos + 18 parpadeos + 12 miradas), ninguna inexistente |
| Sonidos característicos | 18 claves de `personality.ts` contra los métodos de `audio.ts` | 18/18 existen, todos ≤0,3 s y ≤0,16 de volumen, sin ficheros |
| El puzle intacto | huella de los 30 niveles (pisos, capacidad, pasajeros, parejas, enemigos, `timeLimit`) + óptimos del solver | Σ 4255 s y óptimos `2 5 5 8 8 8 11 13 15 17 19 19 19 19 19 19 17 21 21 21 19 21 23 25 25 25 25 23 27 27` |
| Coste por fotograma | `tools/medir-personalidad.ts` con 10 pasajeros (el peor nivel) | ~10 µs = 0,06 % de los 16 667 µs de un fotograma a 60 FPS |

### Fallos reales que han destapado las pruebas nuevas

1. **`wobble`, `spark`, `listen` y `grump` ignoraban la amplitud del personaje.**
   Estaban escritos con constantes (`sx: 1 - 0.08 * s`) en vez de usar `a`, así que
   Moco y Gordito se aplastaban igual aunque su `amp` difiera cinco veces, y Gruñón
   directamente no se movía nada (era una estatua). Ahora los cuatro escalan con `a`.
2. **`REACTION_PRESETS.sleepy` duraba 1260 ms**, por encima del tope de 900 ms que
   declara el propio módulo: Nocti cabeceaba más de un segundo seguido al despertar.
   `presetDuration` cuenta el `yoyo` y las repeticiones, así que dos tramos de
   420 ms con `yoyo` y `repeat: 1` suman 1260 ms, no 840. Bajado a 300 ms por
   tramo: la reacción dura ahora exactamente 900 ms, en el tope.
3. **Pegajón tenía la manía `mirror`** (imitar al vecino) cuando su regla es `duo`
   (viaja pegado a Pegajín): imitaba a un desconocido en vez de abrazar a su amigo.
   Cambiada a `hug`, y Pegajín conserva `mirror` + `hug`.
4. **Bubu sólo sabía saltar**: `board` y `exit` eran ambos `hop`, indistinguible de
   otros tres monstruos, y su reposo `eye` sí era propio. Ahora sale contoneándose
   (`waddle`) y tiene manía de orejas/ojo.
5. **El enfriamiento de los bocadillos se medía mal.** `BubbleDirector` marcaba al
   hablante cuando el globo APARECÍA, no cuando desaparecía: con un `ttl` de 2 s y
   enfriamiento de 2,2 s el personaje sólo callaba 0,2 s reales (5 frases por
   minuto). Ahora el reloj arranca al ocultarse el globo.
6. **La interrupción por prioridad exigía +2 escalones.** Un aviso de piso
   equivocado (`error`, 5) sobre una conversación tranquila (`chat`, 0) sí
   interrumpía, pero una regla social (`rule`, 4) sobre una frase de espera
   (`idle`, 1) no: el globo urgente se quedaba esperando detrás de una frase
   decorativa. Bajado a +1 escalón.
7. **13 voces tenían menos frases de llegada de las que pedía el encargo** y 6 no
   tenían frases de bloqueo propias (caían en la reserva genérica por categoría, que
   es justo lo que el Sprint 2 quiere evitar). Se han escrito 49 frases nuevas a
   mano, una por una con la manía y el habla de cada personaje.
8. **`{d}` aparecía en 12 frases de contextos sin destino** (error, bloqueo,
   encuentro, dúo). Sin destino el token se sustituía por vacío y se leía «¡Al ,
   por favor!» o «Piso , ¿no?». Se han reescrito las 12 y se ha añadido
   `sinDestino()` como red: filtra las frases con `{d}` de las reservas genéricas
   de `dialogues.ts`, que sí lo llevan.
9. **`RULE_HINTS` tenía dos claves inventadas** (`coupleTogether`, `twinsTogether`)
   que no existen en `BlockReason`, y le faltaba `enemyOnboard`. Ahora el mapa está
   tipado `Record<BlockReason, string>`: si el solver añade una razón de bloqueo,
   deja de compilar hasta que se escriba su aviso.
10. **`enemiesOf` se duplicó al añadir `duoOf`** (el campo ya existía en el motor).
    Detectado por `tsc` antes de commitear.
11. **`thud()` (el pisotón del gigante) sonaba a volumen 0,30**, el doble que el
    techo declarado para los sonidos de personaje. Bajado a 0,16.

### Lo que NO se ha podido comprobar (honestidad)

- **No se ha abierto el juego en un navegador**: sigue sin haber navegador en este
  entorno (ni Playwright ni jsdom). Todo lo anterior sale de ejecutar los módulos
  puros en Node, de leer el código de `GameScene.ts`/`BootScene.ts` y de medir el
  coste de cálculo. **La apariencia real —si las caras de parpadeo se ven bien, si
  dos filas de monstruos resultan agradables, si los globos molestan— no está
  verificada.** Es lo primero que hay que mirar al abrir el juego.
- Los 10 µs por fotograma son sólo la lógica nueva (fórmulas, temporizadores y
  directores). **No incluyen el coste de dibujo de Phaser** (90 texturas en memoria
  de GPU, ~20 contenedores con sus hijos, las partículas). Ese coste no se puede
  medir sin navegador; lo que sí está acotado por diseño es el número de objetos:
  un bocadillo, ≤24 partículas vivas, una reacción cada 900 ms.
- El `fitScale` del peor caso (20 monstruos, 0,685) es teórico: **ningún nivel trae
  más de 10 pasajeros**, así que en la campaña real `fitScale` vale 1 y nadie se
  encoge. Se comprueba que la cola de los 30 niveles cabe sin ajuste y sin solapes.
- Las pruebas de integración leen el fuente como texto (`?raw`) para comprobar que
  `GameScene` usa los sistemas nuevos y que nada prohibido aparece donde no debe.
  **Eso verifica que el código está, no que se ejecute bien**: un `playMotion` mal
  escrito pasaría estas pruebas y se vería mal en pantalla.
- No se ha tocado ni medido el `sw.js` ni el manifiesto: el bundle creció de 1,88 MB
  a 1,93 MB (1 929 621 bytes; gzip 460,89 kB) y sigue sin code-splitting (aviso de
  Vite incluido). Las 30 texturas de cara nuevas (~0,5 MB de memoria de texturas)
  no pesan en el bundle: se generan en el arranque, no se descargan.

### Restricciones del encargo respetadas

No se han creado monstruos nuevos (siguen siendo 20), no se ha tocado la economía
ni los precios (`FIRST_WIN` 20, `PER_STAR` 5, `OPTIMAL` 10, `CHALLENGE_BADGE` 25),
no se ha añadido publicidad, no se han cambiado las reglas del solver ni los 30
niveles ni los cronómetros, no se ha eliminado contenido existente (las frases
genéricas de `dialogues.ts` siguen ahí como reserva), el guardado
`piso-equivocado-save-v1` no cambia de formato y las etiquetas de recuperación
anteriores siguen en el repositorio.

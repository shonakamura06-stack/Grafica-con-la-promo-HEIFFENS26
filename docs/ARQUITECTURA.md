# Arquitectura — ¡Piso Equivocado!

## Visión general

Juego 2D para móvil construido con **TypeScript + Phaser + Vite**, formato
vertical 9:16 (540×960) con escalado `FIT` para adaptarse a cualquier
pantalla. **Layout en 4 columnas**: columnas 1–2 = edificio con ventanas y
balcones (recepción en la planta baja); columna 3 = ascensor de cristal;
columna 4 = tablero de pisos alineado con el edificio; la cola de monstruos
está frente al edificio, en la parte inferior. Sin servidor ni cuentas: todo
el estado vive en el dispositivo
(localStorage) y los recursos se generan en tiempo de ejecución (arte
vectorial procedural + audio sintetizado), por lo que el juego es ligero
y funciona sin conexión tras la primera carga (PWA).

## Organización del código

```
src/
  main.ts                  Punto de entrada: configuración de Phaser y PWA
  data/
    monsters.ts            Definición de los 20 monstruos (reglas, colores…)
    levels.ts              Los 30 niveles como datos (sin lógica)
    shop.ts / missions.ts / dialogues.ts / reseVoice.ts
                           Contenido: tienda cosmética, misiones, textos de Rese
    voices.ts              ★ Voz propia de los 20 monstruos (Sprint 2): frases de
                             espera, llegada, error, bloqueo, encuentros y dúos,
                             con reserva por categoría si falta la propia
  systems/
    rules.ts               ★ Única fuente de verdad de las reglas sociales y de
                             cabina: buildCrew, canBoard, canExit, rulesPresent,
                             estimateTrips, difficultyIndex (índice compuesto:
                             movimientos + reglas + cabina + viajes + variedad de
                             destinos + eventos). La usan EL MOTOR y EL SOLVER.
    timing.ts              ★ Presupuesto de tiempo por nivel (PACING): cuántos
                             segundos cuesta jugar un nivel y el margen de errores
                             (2 normales O 1 grave completo): grumpyCostSeconds,
                             grumpyWorstCaseSeconds, GRUMPY, SAFETY_MARGIN.
    scoring.ts             Recorrido óptimo (Dijkstra sobre rules.ts) y estrellas
    economy.ts             Economía V3: monedas, recompensas, packs de demo
    cosmetics.ts           Cosméticos comprables y aplicación en escena
    balance.ts             Simulador de perfiles de jugador para el informe
    parental.ts            Puerta parental para las compras de la demo
    save.ts                Guardado versionado en localStorage + personalización
    audio.ts               Motor de sonido WebAudio (efectos + música original)
                             + los 18 sonidos característicos de personaje
    personality.ts         ★ Personalidad de los 20: rasgo, estilo de reposo,
                             amplitud, ritmo, parpadeo, mirada, sonido propio,
                             animación de entrada/salida y manías. También las
                             texturas de cara que existen (BLINK_IDS, GAZE_IDS)
    animator.ts            ★ Animación por CÁLCULO: idleFrame() devuelve el
                             fotograma de reposo sin tweens, EventTimer para
                             parpadeo/mirada/sonido y presets declarativos
                             (MOTION_PRESETS, REACTION_PRESETS) acotados a 900 ms
    queueLayout.ts         ★ Geometría de la cola con el tamaño REAL de cada
                             sprite: una o dos filas, colocación por línea de
                             suelo, los más altos delante y fitScale para el
                             peor caso
    bubbles.ts             ★ Director de bocadillos: UN globo en pantalla, con
                             cola por prioridad, turnos, enfriamiento por
                             hablante y colocación que no tapa caras
    interactions.ts        ★ Director de reacciones entre personajes: parejas,
                             enemigos, dúos, gemelos, tímidos, gigantes,
                             fantasmas, sonámbulos y miedosos. Como mucho UN
                             evento por actualización; sólo OBSERVA el estado
    ui.ts                  Botones, paneles y textos reutilizables
  scenes/
    BootScene.ts           Genera todas las texturas (monstruos, iconos…),
                             incluidas las variantes de cara: parpadeo y mirada
    MenuScene.ts           Pantalla de inicio
    LevelSelectScene.ts    Mapa de 30 niveles con estrellas y bloqueos
    GameScene.ts           Escena de juego: ascensor, pasajeros, panel, HUD
    AlbumScene.ts          Galería coleccionable de monstruos
    ShopScene.ts           Tienda cosmética (sin energía ni vidas)
    MissionsScene.ts       Misiones y logros
    DataScene.ts           Métricas en el dispositivo
    SettingsScene.ts       Sonido, música, vibración, reinicio de progreso
tests/
  rules.test.ts            ★ Reglas sociales y de cabina, una por una
  timing.test.ts           ★ Presupuesto de los 30 cronómetros
  progression.test.ts      ★ Variedad de destinos y curva del índice compuesto
  personality.test.ts      ★ Identidad de los 20: voces distintas, reposo acotado,
                             texturas de cara, presets y reacciones
  queueLayout.test.ts      ★ Cola real de los 30 niveles sin solapes + bocadillos
                             dentro de la pantalla y con turnos
  identity.test.ts         ★ Integración: que las texturas y sonidos declarados
                             existan y que la personalidad no toque el puzle
  scoring.test.ts          Óptimo, estrellas y monedas (+ fuerza bruta)
  levels.test.ts           Integridad de niveles y reproducibilidad del plan
  balance.test.ts          Simulación de perfiles de jugador
  economy.test.ts / save.test.ts
tools/
  medir-personalidad.ts    Mide el coste por fotograma de la animación nueva
public/
  manifest.webmanifest     Manifiesto PWA (instalable)
  sw.js                    Service Worker (cache-first, offline)
  icons/                   Iconos PNG 192/512 (+ maskable) y SVG
```

## Decisiones técnicas

- **Datos separados del motor:** los niveles y monstruos son tablas de
  datos. Añadir contenido no toca la lógica de juego (ver
  [Añadir niveles](ANADIR-NIVELES.md)).
- **Arte procedural:** cada monstruo se dibuja con primitivas vectoriales
  de Phaser (`Graphics`) en `BootScene`. Siluetas, ojos, bocas y accesorios
  propios por especie; sin recursos externos ni licencias.
- **Dirección artística kawaii pastel 2.5D:** cielo celeste, hotel crema
  con barandillas y banners de colores por piso, torre de cristal para el
  ascensor, lobby en 3D (techo con luces, paredes en perspectiva,
  ventanales con vista al exterior, suelo de baldosas en perspectiva y
  bancos con volumen), recepción con recepcionista, carteles de madera
  con borde de cuerda, nubes con carita a la deriva y monstruos vivos
  con contorno grueso oscuro. Cada piso tiene un color caramelo propio
  (insignias, banners, botones y barandillas).
- **Audio 100 % sintetizado:** efectos y música ambiental original con
  WebAudio (osciladores). Sin archivos de audio ni canciones con licencia.
- **Recorrido óptimo real:** Dijkstra sobre el estado completo
  (entregados, a bordo, posición) con las reglas especiales. Las estrellas
  se comparan contra un óptimo calculado, nunca contra límites arbitrarios.
- **Guardado versionado:** `SaveData.version` permite migrar el formato en
  el futuro. La carga fusiona datos parciales con valores por defecto.
- **Personalidad por cálculo, no por tweens:** el reposo de un monstruo es una
  fórmula (`idleFrame`) evaluada en `update()`, no un tween infinito por
  pasajero. Con 10 pasajeros en cola antes había 10 tweens repitiéndose para
  siempre; ahora hay cero y los tweens sólo existen para animaciones puntuales
  de menos de un segundo (entrar, salir, reaccionar), que suspenden el reposo
  de ese sprite mientras duran (`busyUntil`). Medido en
  `tools/medir-personalidad.ts`: ~10 µs por fotograma (0,06 % del presupuesto
  de 60 FPS).
- **Expresión con texturas, no con huesos:** los monstruos son dibujos
  estáticos de 128 px, así que parpadear y mirar se hace cambiando de textura.
  Las variantes (`-blink`, `-look-l`, `-look-r`) se generan en `BootScene` una
  sola vez (90 texturas en total); durante la partida nunca se regenera nada.
  Nube y el Señor VIP no parpadean (duerme con los ojos cerrados y lleva gafas
  de sol): no se generan texturas inútiles.
- **Un solo bocadillo en pantalla:** `BubbleDirector` decide quién habla, con
  prioridad (error > regla > pista > llegada > espera > charla), enfriamiento
  por hablante y descarte de lo que se hizo viejo esperando. La posición se
  calcula al mostrar: cerca de quien habla, dentro del marco y sin tapar la
  cara de otro pasajero.
- **Las reacciones nunca tocan el puzle:** `interactions.ts` sólo OBSERVA un
  retrato del estado (quién espera, quién va dentro, quién duerme) y devuelve
  descripciones de efectos. Las reglas siguen decidiéndolas `rules.ts` y el
  solver. Lo comprueba `tests/identity.test.ts`.
- **Gemelos como grupo:** en la escena de juego, la pareja de gemelos es un
  único pasajero-grupo (ocupa 2 espacios, sube y baja junto). En el solver
  se modelan como dos pasajeros emparejados; ambas representaciones son
  equivalentes porque comparten destino.
- **Pausa automática:** al ocultar la pestaña/app, la escena de juego abre
  el menú de pausa.
- **Capacitor-ready:** `capacitor.config.json` apunta a `dist/` para una
  futura compilación Android. No se distribuye APK precompilado.

## Flujo de una partida

1. `LevelSelectScene` → `GameScene` con `levelId`.
2. `GameScene.init` carga el nivel y calcula el óptimo (Dijkstra).
3. El jugador sube pasajeros (toca monstruos en recepción) y elige pisos
   en el panel. La cabina se desplaza con tween; al llegar, los pasajeros
   del piso salen solos. Si el ascensor queda vacío, vuelve a recepción.
4. Al entregar a todos: estrellas según distancia vs. óptimo, monedas,
   desbloqueo de nivel/monstruos y guardado inmediato.

## Rendimiento

- Texturas pequeñas generadas una sola vez; pocos objetos en pantalla.
  Con las variantes de cara del Sprint 2 son 90 texturas de 128×128 (antes 60):
  ~2 MB extra de memoria de texturas, generadas en el arranque.
- Reposo por cálculo (una fórmula por pasajero y fotograma, O(n) con n ≤ 10)
  en vez de un tween infinito por pasajero. Medido: ~10 µs por fotograma en el
  peor nivel, un 0,06 % del presupuesto de 16 667 µs a 60 FPS.
- Límites duros de efectos (`FX_LIMITS`): un solo bocadillo, como mucho una
  reacción cada 900 ms, un sonido característico cada 700 ms y un tope de
  partículas vivas. Cuando se alcanza el tope, los efectos decorativos se
  pierden antes que los fotogramas.
- Con la escena oculta (pestaña en segundo plano, pausa del sistema, `SLEEP`)
  no se anima nada: ni reposo, ni bocadillos, ni reacciones.
- Sin peticiones de red durante la partida; objetivo 60 FPS en dispositivos
  modestos.

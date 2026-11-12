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
  systems/
    rules.ts               ★ Única fuente de verdad de las reglas sociales y de
                             cabina: buildCrew, canBoard, canExit, rulesPresent,
                             difficultyIndex. La usan EL MOTOR y EL SOLVER.
    timing.ts              ★ Presupuesto de tiempo por nivel (PACING): cuántos
                             segundos cuesta jugar un nivel y cuántos se dan de
                             margen para equivocarse dos veces.
    scoring.ts             Recorrido óptimo (Dijkstra sobre rules.ts) y estrellas
    economy.ts             Economía V3: monedas, recompensas, packs de demo
    cosmetics.ts           Cosméticos comprables y aplicación en escena
    balance.ts             Simulador de perfiles de jugador para el informe
    parental.ts            Puerta parental para las compras de la demo
    save.ts                Guardado versionado en localStorage + personalización
    audio.ts               Motor de sonido WebAudio (efectos + música original)
    ui.ts                  Botones, paneles y textos reutilizables
  scenes/
    BootScene.ts           Genera todas las texturas (monstruos, iconos…)
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
  progression.test.ts      ★ Forma de la curva de dificultad
  scoring.test.ts          Óptimo, estrellas y monedas (+ fuerza bruta)
  levels.test.ts           Integridad de niveles y reproducibilidad del plan
  balance.test.ts          Simulación de perfiles de jugador
  economy.test.ts / save.test.ts
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
- Animaciones con tweens de Phaser (sin bucles por frame salvo la
  sincronización de pasajeros a bordo, O(n) con n ≤ 10).
- Sin peticiones de red durante la partida; objetivo 60 FPS.

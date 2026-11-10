# Arquitectura — ¡Piso Equivocado!

## Visión general

Juego 2D para móvil construido con **TypeScript + Phaser + Vite**, formato
vertical 9:16 (540×960) con escalado `FIT` para adaptarse a cualquier
pantalla. Sin servidor ni cuentas: todo el estado vive en el dispositivo
(localStorage) y los recursos se generan en tiempo de ejecución (arte
vectorial procedural + audio sintetizado), por lo que el juego es ligero
y funciona sin conexión tras la primera carga (PWA).

## Organización del código

```
src/
  main.ts                  Punto de entrada: configuración de Phaser y PWA
  data/
    monsters.ts            Definición de los 12 monstruos (reglas, colores…)
    levels.ts              Los 30 niveles como datos (sin lógica)
  systems/
    save.ts                Guardado versionado en localStorage + personalización
    audio.ts               Motor de sonido WebAudio (efectos + música original)
    scoring.ts             Recorrido óptimo (Dijkstra) y cálculo de estrellas
    ui.ts                  Botones, paneles y textos reutilizables
  scenes/
    BootScene.ts           Genera todas las texturas (monstruos, iconos…)
    MenuScene.ts           Pantalla de inicio
    LevelSelectScene.ts    Mapa de 30 niveles con estrellas y bloqueos
    GameScene.ts           Escena de juego: ascensor, pasajeros, panel, HUD
    AlbumScene.ts          Galería coleccionable de monstruos
    CustomizeScene.ts      Personalización del hotel (monedas)
    SettingsScene.ts       Sonido, música, vibración, reinicio de progreso
tests/
  scoring.test.ts          Óptimo, estrellas y monedas
  levels.test.ts           Integridad de niveles y completabilidad
  save.test.ts             Persistencia y fusión de guardado
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

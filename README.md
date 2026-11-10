# ¡Piso Equivocado! — El Hotel de Monstruos

Videojuego móvil 2D de rompecabezas: administra el ascensor de un hotel
habitado por monstruos adorables y lleva a cada huésped a su piso.

- **Formato:** vertical 9:16, pensado para teléfonos Android (también funciona en navegador).
- **Tecnología:** TypeScript + Phaser 3/4 + Vite + PWA instalable.
- **Contenido:** 30 niveles, 12 monstruos originales, 5 reglas especiales,
  sistema de estrellas y monedas, álbum coleccionable, personalización del
  hotel y guardado local. Sin anuncios, sin compras reales, sin cuentas.

## Cómo jugar

1. Toca los monstruos de la cola (recepción) para subirlos al ascensor.
   Cada monstruo muestra el número de su piso en un globo.
2. Toca el piso en el panel del ascensor. El ascensor viaja hasta allí y
   los pasajeros de ese piso salen solos.
3. Cuando el ascensor queda vacío, vuelve automáticamente a recepción.
4. Entrega a todos los monstruos para completar el nivel.

La distancia recorrida decide las estrellas (1 a 3), comparada contra el
recorrido óptimo calculado por el juego. ¡Intenta conseguir las 3 estrellas!

### Monstruos especiales

| Monstruo | Regla |
|---|---|
| Gordito | Gigante: ocupa 2 espacios del ascensor |
| Tini y Toni | Gemelos: siempre suben juntos |
| Sombrín | Tímido: solo viaja solo en el ascensor |
| Nocti | Sonámbulo: se duerme; tócalo para despertarlo en su piso |
| Fantasmita | Fantasma: no ocupa espacio, sube aunque esté lleno |

## Ejecutar el juego

Requisitos: Node.js 18 o superior.

```bash
npm install     # instalar dependencias
npm run dev     # servidor de desarrollo (http://localhost:5173)
npm run build   # compilación de producción en dist/
npm run preview # servir la compilación de producción
npm test        # pruebas automatizadas (reglas, niveles, guardado)
```

### Instalar como app (PWA)

Abre el juego en el navegador del móvil y elige **«Añadir a pantalla de
inicio»**. Después de la primera carga funciona sin conexión.

### Compilar para Android (Capacitor, opcional)

El proyecto incluye `capacitor.config.json`. Para generar un APK:

```bash
npm run build
npx cap add android   # requiere @capacitor/cli y Android Studio
npx cap sync
npx cap open android  # compilar desde Android Studio
```

> Nota: este repositorio entrega el juego web/PWA. No incluye un APK
> precompilado; la estructura está preparada para generarlo con Capacitor.

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md) — organización del código y sistemas.
- [Reglas del juego](docs/REGLAS.md) — mecánica, puntuación y progresión.
- [Añadir niveles](docs/ANADIR-NIVELES.md) — cómo crear niveles nuevos.
- [Informe de pruebas](docs/INFORME-PRUEBAS.md) — pruebas realizadas y resultados.

## Estructura

```
src/
  data/      Monstruos y niveles (datos separados del motor)
  scenes/    Escenas: arranque, menú, niveles, juego, álbum, hotel, ajustes
  systems/   Guardado, audio sintetizado, puntuación (óptimo Dijkstra), UI
tests/       Pruebas automatizadas con Vitest
public/      Manifiesto PWA, Service Worker e iconos
docs/        Documentación del proyecto
```

## Seguridad y privacidad

Juego pensado para menores: sin chat, sin recopilación de datos, sin
anuncios, sin microtransacciones ni sistemas de recompensa aleatorios.
Todo el progreso se guarda localmente en el dispositivo.

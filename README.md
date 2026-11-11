# ¡Piso Equivocado! — El Hotel de Monstruos

Videojuego móvil 2D de rompecabezas: administra el ascensor de un hotel
habitado por monstruos adorables y lleva a cada huésped a su piso.

- **Formato:** vertical 9:16, pensado para teléfonos Android (también funciona en navegador).
- **Tecnología:** TypeScript + Phaser 3/4 + Vite + PWA instalable.
- **Contenido:** 30 niveles, 20 monstruos originales, 8 reglas especiales,
  sistema de estrellas y monedas, álbum coleccionable, tienda de cosméticos,
  misiones, Modo Desafío opcional y guardado local.
- **Modelo (Economía V3):** la campaña completa es **gratis y sin energía**:
  reintentos ilimitados, sin anuncios y sin esperas. Las monedas se ganan por
  logros únicos y solo compran cosméticos. Existe contenido opcional de
  **pago único** (packs cosméticos) en una sección para adultos con barrera
  parental. Sin cajas aleatorias, sin ofertas con cuenta atrás, sin suscripción.

## Cómo jugar

1. Toca los monstruos de la cola (recepción) para subirlos al ascensor.
   Cada monstruo muestra el número de su piso en un globo.
2. Toca el piso en el panel del ascensor. El ascensor viaja hasta allí y
   los pasajeros de ese piso salen solos.
3. Bajar a recepción también es una jugada: toca **PISO 0** cuando quieras
   (ese viaje cuenta en tu distancia, así que planifica).
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

Juego pensado para menores:

- Sin chat, sin cuentas y sin recopilación de datos personales.
- Sin anuncios en la campaña: nunca hace falta ver publicidad para jugar,
  continuar o recuperarse de un error.
- Sin cajas aleatorias ni ofertas con cuenta atrás; las monedas del juego no
  se compran con dinero real y no tienen valor fuera del juego.
- Las compras opcionales (cosméticos de pago único) viven en una sección
  separada y protegida con **barrera parental**, que muestra el contenido
  exacto antes que el precio. En esta versión web no se cobra nada: hay una
  demo para que un adulto evalúe el contenido.
- Todo el progreso y las métricas de balance se guardan **localmente** en el
  dispositivo (`localStorage`), como contadores agregados anónimos, y no se
  envían a ningún servidor.

Detalles del diseño económico, precios y la simulación de balance:
[`docs/ECONOMIA.md`](docs/ECONOMIA.md).

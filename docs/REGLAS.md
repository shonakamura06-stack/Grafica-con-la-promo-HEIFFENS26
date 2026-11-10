# Reglas del juego — ¡Piso Equivocado!

## Objetivo

Llevar a cada monstruo de la cola de recepción a su piso usando el
ascensor, respetando su capacidad y las reglas especiales de cada huésped.

## Mecánica básica

- **Subir pasajeros:** toca un monstruo en recepción para que entre en el
  ascensor. Tócalo de nuevo (con el ascensor en recepción) para que baje.
- **Capacidad:** el ascensor tiene espacios limitados (3 al principio, 4
  desde el nivel 14). No se puede subir a nadie si no cabe.
- **Viajar:** toca un piso del panel. El ascensor se desplaza y los
  pasajeros de ese piso salen automáticamente con una animación.
- **Recepción (R):** el ascensor puede volver a recepción en cualquier
  momento. Cuando queda vacío, vuelve solo automáticamente.
- **Piso equivocado:** si viajas a un piso sin pasajeros destinados, los
  monstruos reaccionan con humor («¡Piso equivocado!») y la distancia
  cuenta para la puntuación. Nunca bloquea el nivel.
- **Victoria:** el nivel termina cuando todos los monstruos han llegado a
  su destino. No hace falta volver a recepción tras la última entrega.

## Monstruos especiales

| Monstruo | Regla | Desde el nivel |
|---|---|---|
| Gordito | Gigante: ocupa 2 espacios | 16 |
| Tini y Toni | Gemelos: siempre suben juntos (2 espacios) | 18 |
| Sombrín | Tímido: solo viaja solo en el ascensor | 9 |
| Nocti | Sonámbulo: se duerme en el ascensor; tócalo para despertarlo cuando llegue a su piso | 22 |
| Fantasmita | Fantasma: no ocupa espacio; puede subir aunque esté lleno | 24 |

La primera vez que aparece una regla especial, el juego la explica con
una tarjeta visual. Después queda registrada en el álbum.

## Puntuación y estrellas

- La **distancia** es la suma de pisos recorridos por el ascensor
  (incluidos los regresos a recepción entre viajes).
- El juego calcula el **recorrido óptimo** del nivel (Dijkstra) teniendo
  en cuenta capacidad, gigantes, gemelos, tímidos y fantasmas.
- **3 estrellas:** distancia ≤ óptimo + margen generoso
  (`óptimo + máx(2, 20 % del óptimo)`).
- **2 estrellas:** distancia ≤ óptimo + margen amplio
  (`óptimo + máx(4, 60 % del óptimo)`).
- **1 estrella:** nivel completado con recorrido menos eficiente.
- El HUD muestra siempre distancia, óptimo y meta de 3 estrellas.

## Monedas y recompensas

- Al completar un nivel: `6 + 4 × estrellas` monedas (18 con 3 estrellas).
- Repetir un nivel ya superado da 2 monedas de consolación (sin farmeo
  infinito: la recompensa completa solo se paga al mejorar estrellas).
- Las monedas compran personalización del hotel (papel, alfombra,
  puertas). Nada afecta a la jugabilidad.
- Completar un nivel desbloquea sus monstruos en el álbum y el siguiente
  nivel. Sin cajas aleatorias ni pagos reales.

## Progresión de niveles

| Bloque | Niveles | Novedad |
|---|---|---|
| Aprendizaje | 1–5 | Mecánica básica, 2–4 pisos |
| Más pasajeros | 6–10 | Hasta 7 pasajeros, 5 pisos, Sombrín |
| Planificar viajes | 11–15 | 6 pisos, capacidad 4 (nivel 14) |
| Especiales I | 16–20 | Gordito, gemelos |
| Especiales II | 21–25 | Nocti, Fantasmita, combinaciones |
| Desafío final | 26–30 | Hasta 10 pasajeros con varias reglas |

## Controles

- Todo se juega con toques (o clic). Sin gestos complicados.
- Botón de pausa en la esquina superior izquierda.
- Reinicio de nivel desde el menú de pausa.
- Ajustes: sonido, música y vibración por separado.

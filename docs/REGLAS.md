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
- **Piso 0 (Recepción):** el ascensor puede volver a recepción en cualquier
  momento. Cuando queda vacío, vuelve solo automáticamente.
- **Piso equivocado:** si viajas a un piso sin pasajeros destinados, la
  pantalla muestra bordes rojos y «¡PISO EQUIVOCADO!» en grande, y la
  distancia cuenta para la puntuación. Los monstruos reaccionan según la
  **paciencia** (indicador arriba a la derecha):
  - 1er error: caras neutras.
  - 2º error: caras enojadas.
  - 3er error: los monstruos vuelven molestos a recepción y debes subirlos
    de nuevo (el ascensor regresa solo, contando distancia).
  - Entregar bien a un monstruo reinicia la paciencia. Nunca se bloquea
    el nivel.
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
| Planificar viajes | 11–15 | 5 pisos, capacidad 4 (nivel 14) |
| Especiales I | 16–20 | Gordito, gemelos |
| Especiales II | 21–25 | Nocti, Fantasmita, combinaciones |
| Desafío final | 26–30 | 5 pisos, hasta 10 pasajeros con varias reglas |

## Controles

- Todo se juega con toques (o clic). Sin gestos complicados.
- Botón de pausa en la esquina superior izquierda.
- Reinicio de nivel desde el menú de pausa.
- Ajustes: sonido, música y vibración por separado.

## Rese, el recepcionista (tutorial y perdón)

- **Diseño**: monstruo azul oscuro con traje y pajarita roja (sprite `public/img/rese.png`,
  prototipo elegido por el usuario entre varias opciones).
- **Voz**: clips reales en `public/audio/rese/*.mp3` (voz elegida por el usuario);
  el manifiesto `src/data/reseVoice.ts` sincroniza cada línea de texto con su segundo exacto.
- **Aparición**: sube desde abajo hasta ocupar media pantalla, con fondo oscurecido,
  globo de diálogo y botón SALTAR. El temporizador se pausa mientras explica.
- **Cuándo explica**: solo en el nivel 1 o la primera vez que aparece una mecánica nueva
  (parejas, corazones/vidas, enemigos, maletas de Maletero, averías).
- **Repaso**: en el menú de PAUSA, el botón «RESE TE EXPLICA» repite la explicación del nivel.
- **Perdón**: la primera equivocación del nivel (piso equivocado, enemigos juntos o pareja
  separada) hace reaparecer a Rese UNA sola vez y **no cuesta estrella**:
  - piso equivocado: se perdonan 2 movimientos en el cálculo de estrellas;
  - enemigos juntos o pareja separada: no suma `ruleBreaks`/`separations` esa vez.
  Las siguientes equivocaciones sí penalizan normal.

## Diálogos de Rese (lectura paso a paso)

- El texto aparece **letra a letra** (máquina de escribir) dentro de un **rectángulo de diálogo abajo**.
- La voz de Rese se **pausa al terminar cada frase** y aparece **«haz clic para continuar ▶»**
  abajo a la derecha: nada avanza sin el clic del niño (primera lectura completa garantizada).
- Un clic con la frase a medias la completa al instante; el siguiente clic pasa a la siguiente línea.
- Botón SALTAR ▶ arriba a la derecha para quien ya se sabe la lección.

## Economía de vidas y monetización

- Niveles 15+: **3 corazones globales** (compartidos entre niveles, no por intento).
- Cada piso equivocado gasta 1 corazón global.
- Con 0 corazones **no se reintenta el nivel**: aparece el panel «¡SIN CORAZONES!» con:
  1. **Espera de 25 min** (temporizador real en pantalla; al cumplirse vuelven los 3).
  2. **Ver anuncio (+3 ❤)**: interstitial de recompensa de 12 s. En esta versión web es una
     promoción animada del propio juego (sin redes externas, seguro para niños); en la
     versión de tienda ese slot se conecta a AdMob/AdSense.
  3. **Premium 19,99 Bs / mes**: corazones infinitos y sin anuncios. El cobro real se activa
     en la versión de tienda (Play Store/APK); aquí existe un botón demo sin cobro para probarlo.
- Recomendación de monetización del equipo: **sin anuncios obligatorios ni cajas de suerte**;
  ingreso principal = pack premium único o mensual barato (19,99 Bs) + anuncios *opt-in*
  (solo quien quiere vidas extra). Es el modelo aceptado por políticas de apps infantiles.
- El temporizador de espera y el premium se guardan en el save (resisten cerrar el juego).

## Reglas de claridad y tiempos (corrección de jugabilidad)

- **El panel NUNCA revela información**: los botones de piso no se iluminan ni muestran
  cuántos monstruos van a cada piso. La única pista es el globo-numero de cada monstruo.
- **Tutorial guiado (nivel 1)**: una flecha roja señala AL monstruo ("mira a X: su globo dice 2…")
  y el diálogo indica tocar el botón de su piso. Nunca se ilumina el botón ni se dan conteos.
- **Bajar es un movimiento**: el ascensor vacío NO vuelve solo a recepción; el jugador debe
  tocar PISO 0 y ese viaje suma al recorrido (y a las estrellas por eficiencia).
- **Tiempos calibrados por simulación lenta**: cada timeLimit es el tiempo de jugar el nivel
  siguiendo la ruta óptima a ritmo de niño lento (leer 8 s, tocar monstruo 4 s, tocar botón 3 s,
  puertas 0.24 s, 0.38 s por piso, reaccionar 1.5 s, ver bajar 1.5 s, leer final 4 s),
  redondeado a múltiplos de 5. Rangos nuevos: 40 s (nv 1) a 120 s (nv 30).
- **Cabina lógica**: el suelo de la cabina marca tantos pads como capacidad (2/3/4) y el techo
  lleva un punto dorado por lugar; con capacidad 4 los monstruos viajan algo más apretados.
- **Desbloqueos anunciados**: al empezar un nivel con novedad (ascensor más grande, parejas,
  corazones, enemigos, maletas, averías) aparece una tarjeta animada "¡NUEVO!" con icono,
  explicación y toque para continuar, antes del diálogo de Rese.
- **Rese sin voz**: los diálogos son solo texto (letra a letra, clic para continuar).
  Los clips de audio se eliminaron del juego y del repositorio.

## Rese: cuándo aparece y cuándo no

- Rese NO aparece si te equivocas de piso: la viñeta roja, el texto gigante y la sacudida
  ya lo dejan clarísimo. Tampoco perdona estrellas de piso equivocado.
- Rese SÍ aparece (una vez por nivel) si tratas mal a un personaje:
  parejas separadas, enemigos juntos, o intentar subir a un tímido/miedoso mal.
  En esos casos explica cómo tratarlos y perdona la estrella de ESA primera vez.

## Personajes que complican (nuevos)

- **Pegajín y Pegajón (dúo, nv 21+)**: suben SIEMPRE juntos (necesitan 2 lugares),
  pero cada uno baja en su propio piso.
- **Temblorín (miedoso, nv 24+)**: con él dentro, la cabina lleva como máximo 2 monstruos.
- Ambos entran en el solver óptimo, en las simulaciones de tiempo y en las pruebas.

## Récord y óptimo

- «¡PERFECTO!» (+50 monedas) = completar en la distancia óptima exacta sin penalizaciones.
- «¡NUEVO RÉCORD PERSONAL!» (+150) = superar tu propia mejor distancia del nivel
  (guardada en el save). La pantalla de victoria muestra «Ruta óptima: X pasos» para apuntar.
- El óptimo está auditado: una búsqueda por fuerza bruta independiente coincide con el
  solver en niveles pequeños con TODAS las reglas (capacidad, gemelos, dúo, tímido,
  miedoso, parejas, enemigos, salidas automáticas, bajadas que cuentan).

## Globos de diálogo

- Globos cartoon: picos irregulares, contorno grueso oscuro, sombra gris desplazada y
  cola que apunta al que habla (estilo grito de cómic).

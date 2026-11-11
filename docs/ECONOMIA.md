# Economía de ¡Piso Equivocado!

Diseño de economía libre de prácticas manipuladoras: sin cajas de suerte, sin energía
obligatoria para jugar los primeros niveles, sin ventajas pagadas que rompan el desafío
(el premium da comodidad, no poder). Todo ingreso tiene su sumidero.

## Monedas (🪙) — moneda blanda

| Fuente | Cantidad |
|---|---|
| Completar nivel (1–3 ★) | 2–20 según estrellas |
| Ruta óptima exacta («¡PERFECTO!») | +50 |
| Superar tu récord personal | +150 |
| Regalo diario (1 vez/día) | +40 |

| Sumidero | Precio |
|---|---|
| Cosméticos (papel, alfombra, puertas, skin de Rese, ascensor, noche) | 40–60 |
| **Comprar 1 corazón** | **150** |

Las monedas se ganan jugando bien, no esperando: la eficiencia es la fuente principal.

## Corazones (❤) — vidas escasas (niveles 15+)

- 3 corazones globales; cada **piso equivocado** gasta 1 (así se aprende).
- **Regeneración lenta: 1 corazón por hora** (antes: 3 en 25 min → demasiado fácil).
  Llenar los 3 gratis toma 3 h: suficiente para volver mañana, no para maratonear reintentos.
- Con 0 corazones el panel «¡SIN CORAZONES!» ofrece, en este orden:
  1. **Ver anuncio → +1 ❤** (interstitial de 12 s; en web es promoción del propio juego,
     en la versión de tienda ese slot se conecta a AdMob/AdSense con SDK real).
  2. **Comprar 1 ❤ por 150 monedas** (convierte habilidad en vidas sin dinero real).
  3. **Premium 19,99 Bs/mes**: corazones infinitos, sin anuncios y regalo diario doble.
  4. **Esperar**: volver al menú y dejar correr la hora.
- El premium es *comodidad*: no da pistas ni ventajas de puntuación; los récords y estrellas
  se ganan igual.

## Regalo diario

- Una vez por día calendario: **+40 monedas y +1 corazón** (doble con premium).
- Crea el hábito de volver sin castigar al que no vuelve (nada se pierde por ausencia).

## Anuncios

- Solo **opt-in** (el jugador elige verlos para ganar un corazón). Nunca intersticiales
  forzados entre niveles, nunca anuncios en partidas, nunca videos que interrumpan a niños.
- En esta versión web el "anuncio" es un interstitial de promoción propia (desfile de
  monstruos, 12 s, saltable al final) sin ninguna red externa: cumplible en PWA offline.
- En APK/Play Store: sustituir `playRewardAd` por un Rewarded Ad de AdMob manteniendo
  la misma recompensa (+1 ❤) y el mismo límite implícito (solo con 0 corazones).

## Por qué estos precios (Bolivia)

- 19,99 Bs/mes ≈ 2,9 USD: por debajo del umbral psicológico de 3 USD y comparable a
  suscripciones infantiles regionales; el mensual (no anual) baja el compromiso exigido
  a padres. Alternativa válida: pack único «Hotel Completo» 29,99 Bs (vida eterna del
  producto sin renovaciones) si se prefiere evitar suscripciones en apps infantiles.
- 150 monedas por corazón: ~2–3 niveles perfectos o 4 días de regalo diario: caro para
  spamear reintentos, alcanzable para un jugador hábil → empuja al anuncio opt-in,
  que es el ingreso publicitario real.

## Antitrampas y transparencia

- Temporizadores y premium viven en el save con timestamps: cerrar el juego no acelera nada.
- No se compra progreso: los niveles se desbloquean jugando; el premium no salta niveles.
- Sin datos personales, sin chat, sin compras dentro de la partida (todo desde menús).

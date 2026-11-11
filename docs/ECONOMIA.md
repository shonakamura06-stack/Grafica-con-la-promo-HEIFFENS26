# Economía V3 — ¡Piso Equivocado! El Hotel de Monstruos

Modelo sostenible y ético para un juego de puzles infantil. Sustituye por completo a la
Economía V2 (corazones escasos + anuncio de recompensa + premium mensual).

## Los tres pilares

1. **Juego gratuito**: la campaña completa (30 niveles) se puede terminar sin pagar nada
   y sin esperar nada. No hay energía, no hay vidas obligatorias, no hay anuncios.
2. **Progresión**: jugar bien (estrellas, rutas óptimas, misiones) genera monedas que
   desbloquean contenido cosmético.
3. **Compras opcionales**: contenido adicional de pago único, cosmético, con precio y
   contenido exactos, dentro de una sección protegida por barrera parental.

## Qué se eliminó de la V2 (y por qué)

| Elemento V2 | Estado en V3 | Motivo |
|---|---|---|
| 3 corazones obligatorios desde el nivel 15 | **Eliminado** | Un juego de puzles necesita experimentación: equivocarse y reintentar es parte del aprendizaje. |
| Regeneración de 1 corazón/hora | **Eliminada** | Ningún niño debe abandonar el juego horas por equivocarse. |
| Compra de corazón por 150 monedas | **Eliminada** | Convertía la frustración en sumidero de moneda. |
| Anuncio de 12 s para recuperar vidas | **Eliminado** | La publicidad nunca debe ser necesaria para jugar ni castigo por fallar. |
| Premium 19,99 Bs/mes | **Eliminado** | Se sustituye por compras únicas de contenido (más transparentes para familias). |
| Regalo diario (+40 🪙 y +1 ❤) | **Eliminado** | Las misiones premian logros, no la asistencia diaria. |
| Modo Desafío con vidas | **Nuevo y opcional** | Mantiene la tensión para quien la busque, separado de la campaña. |

Las 3 estrellas siguen siendo la evaluación del rendimiento. El Modo Desafío (3 vidas por
partida, insignia + 25 🪙 una sola vez por nivel) se desbloquea en el nivel 10 y nunca es
obligatorio: si pierdes, reintentas al instante y gratis.

## Monedas (🪙): se ganan por logros únicos

| Acción | Monedas | ¿Repetible? |
|---|---|---|
| Completar un nivel por primera vez | **20** | No |
| Cada estrella nueva conseguida | **+5** | Solo la diferencia (1★→3★ paga 10, no 15+15) |
| Resolverlo con movimientos óptimos | **+10** | No (una vez por nivel) |
| Misión especial | **10–30** | No (una vez por misión) |
| Hito de progreso | **50–100** | No (una vez por hito) |
| Insignia del Modo Desafío | **+25** | No (una vez por nivel) |
| Récord personal | 0 (solo prestigio) | — |

Ejemplo: nivel completado por primera vez con 3 estrellas y ruta óptima = **20 + 15 + 10 = 45 🪙**.

**Repetir un nivel no paga nada.** Solo se cobra la mejora (diferencia de estrellas) o un
logro todavía no conseguido. Esto está verificado por pruebas automáticas: jugar 50 veces
el mismo nivel produce exactamente 45 🪙 en total (`tests/economy.test.ts`).

**Máximo teórico ganable jugando todo**: 30×20 + 90×5 + 30×10 + 395 (misiones) + 30×25 =
**2 495 🪙**.

## Tienda de monedas (todo cosmético, precios uniformes por categoría)

| Categoría | Precio | Objetos de pago | Ejemplos |
|---|---|---|---|
| Colores del edificio | **100** | 4 | Menta fresca, Rosa chicle, Azul noche, Lavanda real |
| Accesorios del recepcionista | **150** | 3 | Lazo rosa, Gafas redondas, Placa dorada |
| Aspectos del ascensor | **250** | 2 | Cristal azul, Dorado real |
| Papeles tapiz | **300** | 2 | Rayas de caramelo, Lunares kawaii |
| Temática completa | **500** | 1 | Hotel Arcoíris (cielo, fachada, paredes y decoración) |
| Paquete especial | **800** | 1 | 4 fachadas + 2 papeles tapiz (valor por separado: 1 000) |

Además hay 7 objetos gratuitos (fachada crema, 4 uniformes de Rese, cabina naranja, pared
lisa) para que cualquier jugador personalice su hotel desde el primer día.

Todo objeto tiene **efecto visual real** en el juego (`src/systems/cosmetics.ts`): la
fachada y el papel tapiz se dibujan en el edificio, el aspecto cambia la cabina y las
puertas, los accesorios se dibujan sobre Rese, las temáticas cambian cielo, fachada,
paredes y añaden decoración ambiental animada. La tienda muestra **vista previa real**
(el mismo dibujo que se aplica), **confirmación antes de gastar**, **animación de compra**
e **inventario** con opción de equipar/quitar.

Ningún objeto afecta al puzle, a la capacidad del ascensor, al tiempo ni a las estrellas.

## Compras con dinero real (pago único)

Sección separada («ZONA PARA ADULTOS») protegida con **barrera parental** (multiplicación
de dos cifras con tres opciones, sin guardar ni enviar la respuesta). El contenido exacto
se lista **antes** que el precio. Solo se ofrecen productos cuyo contenido **ya existe**
en el juego: no hay compras ficticias ni «próximamente» a la venta.

| Producto | Contenido real implementado | Precio inicial |
|---|---|---|
| **PACK DELUXE** | 5 trajes de recepcionista (espacial, submarino, fantasma, gala, chef) · 5 accesorios de monstruo (copa, lazo, gafas, corona, bufanda) · 2 decoraciones (fuente kawaii, araña de cristal) · celebración de victoria dorada | **9,90 – 19,90 Bs** |
| **PACK TEMÁTICO: HOTEL ESPACIAL** | Cielo estrellado con planetas, fachada metálica, papel tapiz de estrellas, ascensor a juego | **4,90 Bs** |
| **PACK TEMÁTICO: HOTEL SUBMARINO** | Agua con peces y burbujas, fachada coral, papel tapiz de olas, ascensor a juego | **4,90 Bs** |
| **PACK TEMÁTICO: HOTEL EMBRUJADO** | Noche violeta con fantasmas y velas, fachada de piedra, lunares, ascensor a juego | **4,90 Bs** |

Reglas: pago único (sin suscripción), solo cosméticos, sin cajas aleatorias, sin ofertas
con cuenta atrás, sin mensajes que presionen al niño para convencer a sus padres, y sin
venta de monedas con dinero real (las monedas no se compran: se juegan).

**Estado en esta versión web**: no se realiza ningún cobro. El botón «PROBAR (DEMO)»
desbloquea el contenido para que un adulto lo evalúe; la compra real se conectará en la
versión de tienda (Google Play / APK) con estos mismos contenidos y precios. Los precios
son iniciales y quedan sujetos a pruebas de mercado y a las tarifas de distribución
(las tiendas retienen un porcentaje, así que el precio neto debe revisarse antes de fijarlo).

**Expansiones** (capítulos nuevos con niveles y monstruos): no se listan como producto
porque su contenido todavía no existe. Se publicarán cuando estén construidas.

## Publicidad

- **Primera versión comercial: sin publicidad externa.** Ningún anuncio es necesario para
  jugar, continuar o recuperar el progreso.
- Si más adelante se estudian anuncios voluntarios en Android: deben ser *rewarded* y
  opcionales, con proveedores y configuraciones aptos para público infantil
  (por ejemplo, la etiqueta de contenido familiar de AdMob y sus políticas para familias),
  claramente diferenciados del contenido del juego, y sin bloquear el progreso.
- Nunca publicidad como castigo por equivocarse.
- No se asume que una implementación de Android sirva tal cual para iOS: cada plataforma
  tiene sus propias políticas y requisitos de privacidad infantil que deben revisarse por
  separado antes de integrar nada.
- La promoción interna del juego que existía en la V2 se retiró: no se presenta como
  ingreso publicitario lo que no lo es.

## Misiones (sin presión diaria)

Premian explorar las mecánicas. No caducan, no exigen conectarse cada día y no castigan
la ausencia (no hay rachas ni contadores que se reinicien).

| Misión | Objetivo | Recompensa |
|---|---|---|
| Tres estrellas | 3 niveles con 3★ | 20 🪙 |
| Ruta perfecta | 5 niveles en ruta óptima | 30 🪙 |
| Amor en el aire | 10 parejas entregadas juntas | 20 🪙 |
| Sin equivocaciones | 5 niveles sin pisos equivocados | 30 🪙 |
| Coleccionista | 12 personajes descubiertos | 20 🪙 |
| Valiente | 1 nivel superado en Modo Desafío | 25 🪙 |
| Hito: Capítulo 1 | Niveles 1–5 | 50 🪙 |
| Hito: Capítulo 2 | Niveles 1–15 | 50 🪙 |
| Hito: Álbum completo | 20 monstruos | 50 🪙 |
| Hito: Hotel completo | 30 niveles | 100 🪙 |

Total: **395 🪙** (16 % del máximo ganable: las misiones orientan, no dominan).

## Medir la economía (indicadores)

Panel «DATOS (ADULTOS)» en el menú, detrás de la barrera parental. **Todo es local**: se
guarda en `localStorage`, no se envía a ningún servidor y no contiene identificadores,
nombres, edades, ubicación ni ningún dato personal. Son contadores agregados, que es lo
único que hace falta para equilibrar el juego y lo que permiten las políticas de
privacidad infantil de Google y Apple (ambas exigen revisar sus requisitos vigentes antes
de añadir cualquier analítica externa; si algún día se mide de verdad, debe ser con datos
agregados y sin perfilado de menores).

| Indicador | Qué responde |
|---|---|
| Niveles completados | ¿El juego engancha? |
| Niveles repetidos | ¿Quieren mejorar sus resultados? |
| Monedas obtenidas / gastadas | ¿Cuánto gana y en qué lo gasta? |
| Objetos comprados por categoría | ¿Qué contenido merece producirse? |
| Packs desbloqueados | ¿Hay disposición real a pagar? |
| Abandonos a mitad de nivel | ¿Hay frustración? |
| Niveles perdidos por tiempo | ¿Los tiempos son justos? |
| Pisos equivocados acumulados | ¿La dificultad es adecuada? |
| Modo Desafío (intentos / superados) | ¿Interesa la dificultad opcional? |
| Zona adultos (abierta / superada) | ¿Los padres llegan a la tienda? |

Derivados que muestra el panel: monedas por nivel, repeticiones por nivel, porcentaje de
niveles con 3★, tasa de abandono y objeto más comprado. Hay un botón «COPIAR INFORME»
que exporta el resumen en texto para analizarlo fuera del juego.

## Simulación de balance (números reales, no suposiciones)

Ejecutada con `src/systems/balance.ts` (verificada por `tests/balance.test.ts`). Los
minutos por nivel salen del `timeLimit` de cada nivel, que a su vez está calibrado con una
simulación de partida lenta de un niño (`docs/INFORME-PRUEBAS.md`).

| Perfil | Niveles | Partidas | Sesiones | Minutos | Monedas | Repeticiones pagan |
|---|---|---|---|---|---|---|
| Jugador casual | 30 | 48 | 16 | 70 | **1 130** | 0 |
| Jugador habitual | 30 | 70 | 18 | 86 | **1 650** | 0 |
| Jugador que consigue 3 estrellas | 30 | 102 | 21 | 94 | **2 455** | 0 |
| Jugador que repite niveles | 8 | 74 | 13 | 80 | **445** | 0 |
| Jugador de pocos minutos por sesión | 18 | 32 | 22 | 44 | **750** | 0 |

Cuánto tarda cada perfil en comprar (comprando lo más barato primero):

| Perfil | Objeto de 100 🪙 | Paquete de 800 🪙 | ¿Todo el catálogo (2 250)? |
|---|---|---|---|
| Casual | 2 sesiones / 6 min | 12 sesiones / 50 min | No (8 de 12 objetos) |
| Habitual | 2 sesiones / 5 min | 9 sesiones / 42 min | No (10 de 12) |
| 3 estrellas | 1 sesión / 4 min | 7 sesiones / 31 min | **Sí (12 de 12), sobran 5 🪙** |
| Repetidor | 3 sesiones / 18 min | 23 sesiones / 143 min | No (4 de 12) |
| Sesión corta | 3 sesiones / 6 min | 23 sesiones / 47 min | No (6 de 12) |

### Decisiones tomadas a partir de la simulación

- **El paquete no incluye todo el catálogo.** Si incluyera los 12 objetos, costaría 800 🪙
  y hasta el jugador casual (1 130 🪙) lo compraría: la tienda se vaciaría de sentido.
  Al incluir 6 objetos (4 fachadas + 2 papeles, valor 1 000), el paquete ahorra 200 🪙 y
  el catálogo completo cuesta **2 250 🪙**: solo lo alcanza quien juega la campaña entera
  con 3 estrellas, Modo Desafío incluido (2 455 🪙, sobran 5). Sin inflación y sin
  imposibles.
- **Ningún objeto queda fuera de alcance**: el más barato (100 🪙) se consigue en 1–3
  sesiones en todos los perfiles, incluso el que juega pocos minutos.
- **Repetir no paga** (0 🪙 en los cinco perfiles, con hasta 64 repeticiones): se elimina
  la granja de monedas sin castigar a quien quiere mejorar.
- **La insignia del Desafío (25 🪙)** aporta 750 🪙 al completista: es lo que permite
  cerrar el catálogo y a la vez da valor al modo opcional, sin tocar la campaña.
- El máximo ganable (2 495 🪙) es 1,02× el coste del catálogo con paquete: margen justo
  para que el último objeto se sienta como un logro, no como un trámite.

## Migración de datos V2 → V3 (sin borrar nada del jugador)

La clave de guardado sigue siendo `piso-equivocado-save-v1` y el contenido se migra al
cargar (`migrateSave`, probado en `tests/economy.test.ts`):

| Dato V2 | Qué pasa en V3 |
|---|---|
| Monedas | Se conservan íntegras |
| Estrellas, niveles desbloqueados, récords de distancia | Se conservan |
| Álbum de monstruos, ajustes, tutoriales vistos | Se conservan |
| Papel de pared comprado (menta/rosa/noche) | Se convierte en la **fachada** equivalente y sigue en propiedad |
| Ascensor dorado / puerta de cristal | Se convierten en los **aspectos de ascensor** equivalentes |
| Uniformes de Rese (rojo/verde/morado) | Se convierten en **accesorios de recepcionista** (ahora gratuitos) |
| Alfombras, puertas sin equivalente, ascensores retirados | **Se devuelven en monedas** (30–50 🪙 cada uno) |
| Modo noche (costaba 80 🪙) | Ahora es **gratis para todos** en Ajustes y se **devuelven 80 🪙** |
| Cosmético equipado pero no listado en `owned` | Se marca como propiedad (nadie pierde lo que usaba) |
| Premium mensual activo | Se convierte en el **Pack Deluxe** completo, como agradecimiento |
| Corazones, esperas, anuncios vistos, regalo diario | Desaparecen (mecánicas retiradas) |
| Primera victoria / contadores de misiones | Se deducen del progreso ya logrado |

La devolución se aplica **una sola vez** (queda registrada en `save.migration`): cargar el
guardado muchas veces no duplica monedas.

## Pendientes y riesgos

1. **Pagos reales**: integrar Play Billing (y StoreKit si algún día hay versión iOS) en la
   versión de tienda; aquí solo existe la demo sin cobro. Revisar tarifas de distribución
   antes de fijar el precio final del Pack Deluxe (9,90–19,90 Bs es un rango a probar).
2. **Expansiones**: construir el capítulo 2 (niveles 31–45 y monstruos nuevos) antes de
   ponerlo a la venta. No se muestra ningún producto cuyo contenido no exista.
3. **Analítica agregada**: si se quiere medir más allá del dispositivo, hace falta una
   solución sin identificadores y con revisión de las políticas familiares vigentes.
4. **Publicidad**: decisión pendiente; si se activa, solo *rewarded* voluntario y con
   configuración infantil. Nunca para continuar jugando.
5. **Precios de tienda**: los valores actuales (100/150/250/300/500/800) son iniciales y
   deben revisarse con los indicadores reales de las primeras partidas.

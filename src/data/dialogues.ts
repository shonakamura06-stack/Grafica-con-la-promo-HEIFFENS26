/**
 * Frases de los monstruos — ¡Piso Equivocado!
 * Más de 100 frases originales, organizadas por categoría y personalidad.
 * Se eligen al azar sin repetir las últimas usadas.
 */

import { MonsterKind } from './monsters';

/** Frases que dicen en la cola (pidiendo su piso). */
export const QUEUE_LINES: Record<MonsterKind, string[]> = {
  none: [
    '¡Yo quiero ir al piso {d}!',
    '¿Me llevas al {d}, porfa?',
    '¡Mi habitación es el {d}!',
    '¡Al piso {d}, rápido!',
    '¿Podemos subir ya?',
    '¡El {d} es mi piso!',
    '¡Vamos al {d}!',
    '¿Quién me lleva al {d}?',
    '¡Tengo ganas de llegar al {d}!',
    '¡Al {d}, por favor!',
  ],
  tourist: [
    '¡Quiero ver el piso {d}!',
    '¡Foto! ¡Al piso {d}!',
    '¿El {d} tiene vistas bonitas?',
    '¡Mi guía dice que el {d} es genial!',
    '¡Al {d} a hacer turismo!',
    '¡Qué hotel tan bonito! ¡Al {d}!',
    '¡Quiero conocer el piso {d}!',
    '¡El {d} debe ser precioso!',
  ],
  vip: [
    'Mi suite está en el {d}.',
    'Lléveme al {d}, sin demora.',
    'Espero que el {d} esté perfecto.',
    'El {d}, como siempre.',
    'Soy el huésped VIP: ¡al {d}!',
    'Mi habitación del {d} me espera.',
    '¡Al {d}! ¡Y sin esperas!',
  ],
  luggage: [
    '¡Cuidado con mis maletas! ¡Al {d}!',
    'Tengo muchas maletas... ¡al {d}!',
    '¡Mis maletas pesan! ¡Al {d}!',
    '¿Cabe mi equipaje? ¡Al {d}!',
    '¡Al {d} con todas mis maletas!',
    '¡No dejes mis maletas atrás! ¡Al {d}!',
  ],
  couple: [
    '¡Mi amor y yo vamos al {d}! ♥',
    '¿Podemos subir juntos al {d}? ♥',
    '¡El {d} es nuestro piso! ♥',
    '¡No me separes de mi amor! ♥',
    '¡Juntos al {d}, porfa! ♥',
    '¡Mi pareja y yo al {d}! ♥',
    '¡El {d} con mi amorcito! ♥',
  ],
  enemy: [
    '¡Yo voy al {d}! ¡Y sin ese de ahí!',
    '¡Al {d}! ¡Pero no con ESE!',
    '¡Mi piso es el {d}! ¡Lejos de ese!',
    '¡Al {d}! ¡No quiero verlo!',
    '¡El {d} es mi piso! ¡Sin rivales!',
  ],
  family: [
    '¡Toda la familia al {d}!',
    '¡Vamos juntos al {d}!',
    '¡El {d} es nuestro piso familiar!',
    '¡No dejen a nadie atrás! ¡Al {d}!',
    '¡Juntos al {d}, como siempre!',
  ],
  duo: [
    'Con mi mejor amigo a donde sea, al piso {d} también.',
    '¡Espera a Pegajón! Sin él no subo, al piso {d} tampoco.',
    'Juntitos en el ascensor, separaditos al bajar al {d}.',
    'Somos pegajosos pero cumplidos: piso {d}.',
  ],
  fear: [
    'Al piso {d}… pero con poquita gente, ¿sí?',
    'T-tiemblo si se llena el ascensor… piso {d}.',
    'Máximo dos dentro, por favor… voy al {d}.',
    '¿Podemos ir tranquilos al {d}?',
  ],
};

/** Frases al llegar a su piso (salida feliz). */
export const ARRIVAL_LINES: Record<MonsterKind, string[]> = {
  none: [
    '¡Llegué! ¡Gracias!',
    '¡Mi piso! ¡Qué bien!',
    '¡Por fin en el {d}!',
    '¡Gracias por el viaje!',
    '¡Llegué a mi piso!',
    '¡Qué rápido! ¡Gracias!',
    '¡Mi habitación! ¡Genial!',
    '¡Hasta luego!',
  ],
  tourist: [
    '¡Qué vistas! ¡Foto!',
    '¡El {d} es precioso!',
    '¡A explorar el {d}!',
    '¡Qué bonito piso!',
    '¡Mi guía tenía razón!',
    '¡A hacer turismo!',
  ],
  vip: [
    'Aceptable. Muy bien.',
    'Por fin, mi suite.',
    'Así se hace. Gracias.',
    'Perfecto. Hasta luego.',
    'Mi habitación me espera.',
  ],
  luggage: [
    '¡Por fin! ¡Mis maletas!',
    '¡Llegué con todo!',
    '¡Gracias! ¡Qué peso!',
    '¡Mi piso! ¡A descansar!',
  ],
  couple: [
    '¡Juntos por fin! ♥',
    '¡Nuestro piso, amor! ♥',
    '¡Te quiero! ¡Al {d}! ♥',
    '¡Juntos siempre! ♥',
    '¡Nuestro hogar! ♥',
  ],
  enemy: [
    '¡Por fin lejos de ese!',
    '¡Mi piso! ¡Al fin solo!',
    '¡Nadie me molesta aquí!',
    '¡Llegué! ¡Qué paz!',
  ],
  family: [
    '¡Toda la familia junta!',
    '¡Nuestro piso familiar!',
    '¡Juntos en casa!',
    '¡Por fin todos aquí!',
  ],
  duo: [
    '¡Gracias por el viaje juntos!',
    '¡Nos vemos en el lobby, amigo!',
    '¡Llegué! Pegajón anda por ahí.',
  ],
  fear: [
    '¡L-legué! Gracias por no llenar la cabina…',
    '¡Qué viaje más tranquilo! Estoy en el {d}.',
    'Sobreviví… digo, ¡llegué al {d}!',
  ],
};

/** Frases cuando se separan de su pareja (tristeza). */
export const SEPARATED_LINES = [
  '¡Me separaron de mi amor! ♥💔',
  '¡Quiero a mi pareja! ♥💔',
  '¡No sin mi amorcito! ♥💔',
  '¡Mi corazón está en el {d}! ♥💔',
];

/** Frases cuando no pueden subir con su enemigo. */
export const ENEMY_LINES = [
  '¡No pienso viajar con ESE!',
  '¡Con ese no subo!',
  '¡Ese y yo no cabemos juntos!',
  '¡Primero que se vaya ESE!',
];

/** Frases de impaciencia (cuando esperan mucho). */
export const IMPATIENT_LINES = [
  '¡Llevo esperando muchísimo!',
  '¿Falta mucho?',
  '¡Me estoy cansando de esperar!',
  '¡Vamos, vamos!',
  '¡Mi piso me espera!',
];

/** Frases del recepcionista (tutorial y reacciones). */
export const RECEPTIONIST_LINES = {
  welcome: [
    '¡Hola! Soy Rese, tu recepcionista.',
    '¡Bienvenido al Hotel de Monstruos!',
    '¡Yo te ayudo a organizar el ascensor!',
  ],
  teachTap: [
    'Toca un monstruo para que entre al ascensor.',
    '¡Toca un monstruo de la cola!',
  ],
  teachFloor: [
    'Ahora toca el piso al que quiere ir.',
    'Mira el número del monstruo y toca ese piso.',
  ],
  teachDestination: [
    'Cada monstruo lleva su número de piso.',
    'Fíjate en el número que lleva cada uno.',
  ],
  teachCouple: [
    '¡Mira! Esos dos están enamorados ♥',
    'Las parejas deben viajar juntas.',
  ],
  teachEnemy: [
    '¡Cuidado! Esos dos no se soportan.',
    'Los gruñones no viajan con su enemigo.',
  ],
  teachLives: [
    '¡Atención! Desde ahora los errores cuestan vidas.',
    'Tienes 3 corazones. ¡Cuídalos!',
  ],
  praise: [
    '¡Muy bien!',
    '¡Excelente!',
    '¡Lo estás haciendo genial!',
    '¡Qué buen recepcionista eres!',
  ],
  mistake: [
    '¡Ups! Ese no era su piso.',
    '¡Cuidado! Mira bien el número.',
    '¡Ese piso no era!',
  ],
  stuck: [
    'Piensa: ¿quién va a cada piso?',
    'Mira los números de cada monstruo.',
    '¿Quién puede viajar junto?',
  ],
};

/** Elige una frase al azar evitando repetir las últimas `avoid` usadas. */
const recent: string[] = [];
export function pickLine(lines: string[], dest?: number, avoid = 3): string {
  let pool = lines.filter((l) => !recent.includes(l));
  if (pool.length === 0) pool = lines;
  const line = pool[Math.floor(Math.random() * pool.length)];
  recent.push(line);
  if (recent.length > avoid) recent.shift();
  return dest !== undefined ? line.replace('{d}', `${dest}`) : line;
}

/** Frase de cola según la categoría del monstruo. */
export function queueLine(kind: MonsterKind, dest: number): string {
  return pickLine(QUEUE_LINES[kind] ?? QUEUE_LINES.none, dest);
}

/** Frase de llegada según la categoría del monstruo. */
export function arrivalLine(kind: MonsterKind, dest: number): string {
  return pickLine(ARRIVAL_LINES[kind] ?? ARRIVAL_LINES.none, dest);
}

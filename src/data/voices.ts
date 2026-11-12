/**
 * VOCES DE LOS 20 MONSTRUOS — ¡Piso Equivocado!
 *
 * Antes los diálogos iban por CATEGORÍA (`data/dialogues.ts`): Sombrín, Gordito,
 * Nocti y Fantasmita compartían la categoría `none` y decían exactamente las
 * mismas frases que Bubu o Chispa. Piezas de puzle con nombres distintos.
 *
 * Aquí cada monstruo tiene su propia voz, escrita a partir de su personalidad y
 * de SU REGLA SOCIAL: la frase tiene que recordarte cómo se juega con él.
 *   - Sombrín pide viajar solo (regla `shy`).
 *   - Gordito avisa de que ocupa dos sitios (regla `giant`).
 *   - Tini y Toni se pelean por hablar y exigen subir juntos (regla `twins`).
 *   - Nocti cabecea y se duerme a media frase (regla `sleepwalker`).
 *   - Fantasmita se pierde y recuerda que no ocupa sitio (regla `ghost`).
 *
 * La resolución es por capas: voz propia del monstruo → categoría (`dialogues.ts`)
 → genérica. No se borra nada de lo anterior: se añade identidad encima.
 *
 * `{d}` se sustituye por el piso de destino. Las líneas están escritas para leerse
 * de un vistazo (público infantil): frases cortas, una idea por bocadillo.
 */

import { MonsterKind, SpecialRule } from './monsters';
import { QUEUE_LINES, ARRIVAL_LINES } from './dialogues';

export interface MonsterVoice {
  /** Frases mientras espera en la cola. Todas llevan {d}: están pidiendo su piso. */
  queue: string[];
  /** Frases al llegar a su destino. */
  arrive: string[];
  /** Reacción cuando el jugador se equivoca de piso llevándolo dentro. */
  error: string[];
  /** Reacción cuando su regla le impide subir ahora mismo. */
  blocked: string[];
  /** Reacción al encontrarse con un monstruo CONCRETO (id → frases). */
  meetId: Record<string, string[]>;
  /** Reacción al encontrarse con alguien de una regla especial. */
  meetRule: Partial<Record<SpecialRule, string[]>>;
  /** Conversaciones de dos voces (id del otro → pares de réplicas). */
  duos: Record<string, Array<[string, string]>>;
  /** Cómo habla: para el álbum y la documentación, no se muestra en el juego. */
  voice: string;
}

const V = (v: Partial<MonsterVoice> & { queue: string[]; arrive: string[]; voice: string }): MonsterVoice => ({
  error: [], blocked: [], meetId: {}, meetRule: {}, duos: {}, ...v,
});

/** Los cinco que estaban completamente mudos: prioridad del Sprint 2. */
export const PRIORITY_IDS = ['sombrin', 'gordito', 'gemelos', 'nocti', 'fantasmita'] as const;

export const VOICES: Record<string, MonsterVoice> = {
  // ── LOS CINCO PRIORITARIOS (8 de cola + 6 de llegada) ─────────────────────
  sombrin: V({
    voice: 'Susurra, pide perdón y habla en frases cortas. Nunca levanta la voz.',
    queue: [
      '¿Podría viajar solo...? Voy al {d}.',
      'Perdón... ¿me dejas el ascensor vacío?',
      'Al {d}, por favor... sin nadie más.',
      'Si sube alguien más... yo espero aquí.',
      'No quiero molestar. Mi piso es el {d}.',
      '¿Se puede subir de uno en uno? Al {d}.',
      'Perdón por tardar... me da vergüenza.',
      'El {d}... flojito, que no me oigan.',
    ],
    arrive: [
      '¡Solo! ¡Gracias! ¡El {d} es perfecto!',
      'Qué alivio... nadie me ha mirado.',
      '¡Llegué al {d}! Perdón por todo.',
      'Aquí estoy bien. Gracias, de verdad.',
      '¡Mi piso! Ahora me escondo un ratito.',
      'Eres muy amable. Adiós... bajito.',
    ],
    error: [
      'Ay... ¿este no era? Perdón...',
      'Uy, me he puesto rojo... ¿este no era?',
      'No pasa nada... creo. ¿Otra vez arriba?',
    ],
    blocked: [
      'Ahí dentro hay gente... yo espero.',
      '¿Se baja alguien? Necesito ir solo.',
      'Perdón... no puedo con compañía.',
    ],
    meetRule: {
      giant: ['Tan grande... y tan cerca. Ay.', 'Perdón, señor gigante, no quería mirar.'],
      sleepwalker: ['Está dormido... mejor, no me ve.', 'Zzz... qué envidia de valentía.'],
    },
    meetId: {
      gordito: ['Ocupas mucho sitio... ¿y si subo después?', 'Perdón por pedirte el ascensor entero.'],
      fantasmita: ['¿Tú no ocupas sitio? Qué suerte...', 'Atravesarme sin querer, ¿verdad? Ay.'],
      grunon: ['No me mires así, por favor...', 'Me esconderé detrás de mi sombra.'],
    },
    duos: {
      gordito: [
        ['¿Podría viajar solo...?', '¡Claro! Yo cabré en el pasillo.'],
        ['Ocupas dos sitios...', '¡Y tú ninguno! Bueno, uno.'],
      ],
      fantasmita: [
        ['¿Me dejas el ascensor vacío?', '¡Ya me he ido! ¿Ves? No estoy.'],
        ['Atraviesas paredes...', 'Y colas. Perdón, perdón.'],
      ],
      nocti: [
        ['Está dormido... no me mira.', 'Zzz... ¿quién habla?'],
      ],
    },
  }),

  gordito: V({
    voice: 'Grave, campechano y un poco torpe. Se ríe de su propio tamaño.',
    queue: [
      '¡Espero que el ascensor sea resistente! Al {d}.',
      'Ocuparé dos sitios, lo siento. Piso {d}.',
      '¡Al {d}! Cuidadito con mis codos.',
      '¿Caben mis maletas? Ah, que soy yo. Al {d}.',
      'Subo yo y ya no cabe nadie. Piso {d}.',
      'Perdón por el bulto: es todo cariño. Al {d}.',
      'Si cruje el cable, soy yo. Piso {d}.',
      '¡Al {d}, porfa! Prometo no moverme.',
    ],
    arrive: [
      '¡El {d}! ¡Y sin abollar nada!',
      '¡Gracias! He cabido justo, justo.',
      '¡Mi piso! Aquí hay sitio para mí.',
      '¡Qué ascensor más fuerte! Ole.',
      '¡Llegué! A estirar las piernas.',
      '¡El {d}! Te debo una merienda.',
    ],
    error: [
      '¡Uy! ¿Este no era? Qué bochorno.',
      'Vaya, me he equivocado de puerta.',
      'Sin problema: bajo y vuelvo a subir.',
    ],
    blocked: [
      'No quepo: necesito dos sitios libres.',
      'Espera a que bajen un par, ¿vale?',
      'Soy grande, no mágico. Hueco doble.',
    ],
    meetRule: {
      shy: ['Perdón si te asusto, chiquitín.', 'Tranquilo: hoy no ocupo nada. Mentira.'],
      ghost: ['¿Que no ocupas sitio? ¡Qué envidia!', 'Yo sí ocupo. Dos. Lo siento.'],
      twins: ['¡Dos por el precio de uno! Como yo.', 'Cabemos tres, si no respiramos.'],
      luggage: ['¡Compañero de bultos! ¿Te ayudo con eso?', 'Dos bultos y un ascensor... qué aventura.'],
    },
    meetId: {
      sombrin: ['Perdón, ¿te aplasto? No era mi idea.', 'Tú primero, peque. Yo respiro hondo.'],
      maletero: ['¡Tú con maletas y yo con panza!', 'Entre los dos llenamos la cabina.'],
      temblorin: ['No tiembles, que no muerdo. Solo abulto.', 'Tranquilo: si subo yo, no sube nadie.'],
    },
    duos: {
      sombrin: [
        ['¿Podría viajar solo...?', '¡Claro! Yo subo en el viaje siguiente.'],
        ['Ocupas dos sitios...', '¡Dos sitios de puro cariño!'],
      ],
      maletero: [
        ['¡Cuidado con mis maletas!', '¡Cuidado con mi codo!'],
        ['¿Cabemos los dos?', 'No. Pero qué bien lo pasamos.'],
      ],
    },
  }),

  gemelos: V({
    voice: 'Dos voces que se pisan, se contradicen y terminan la frase del otro.',
    queue: [
      'Tini: «¡Al {d}!» Toni: «¡Yo lo dije antes!»',
      '¡Subimos juntos o no subimos! Piso {d}.',
      'Toni: «¿Al {d}?» Tini: «¡Eso iba a decir yo!»',
      'Dos gemelos, un billete: piso {d}.',
      'Tini: «¡Yo llegué primero!» Toni: «¡Yo elegí el {d}!»',
      'Si nos separas, lloramos a la vez. Al {d}.',
      'Toni: «¿Caben dos?» Tini: «¡Somos un pack!» Al {d}.',
      '¡Al {d}! Y los dos mirando al frente.',
    ],
    arrive: [
      'Tini: «¡Llegamos!» Toni: «¡Llegamos!»',
      '¡El {d}! ¡Y juntos, como siempre!',
      'Toni: «Gracias.» Tini: «¡Gracias doble!»',
      '¡Nuestro piso! A discutir el color.',
      '¡Los dos en el {d}! Misión cumplida.',
      'Tini: «Adiós.» Toni: «¡Yo me despido más!»',
    ],
    error: [
      'Tini: «No es aquí.» Toni: «¡Ni aquí!»',
      'Los dos: «¡Piso equivocado!» A la vez.',
      'Toni: «Te toca decidir.» Tini: «¡A ti!»',
    ],
    blocked: [
      'No sube uno sin el otro. Nunca.',
      'Si no cabemos los dos, esperamos.',
      'Tini: «¿Solo?» Toni: «¡Jamás!»',
    ],
    meetRule: {
      duo: ['¡Otros dos que van pegados!', 'Cuatro amigos, un ascensor pequeño.'],
      shy: ['Tini: «Le damos miedo.» Toni: «¡Shhh!»'],
      giant: ['Toni: «¡Qué grande!» Tini: «¡Yo también quiero!»'],
    },
    meetId: {
      pegajin: ['¡Sois como nosotros, pero verdes!', 'Pegajín y Pegajón, Tini y Toni.'],
      pegajon: ['Toni: «Ese es mi tipo.» Tini: «¿De pegajoso?»'],
      sombrin: ['Tini: «Hablamos flojito.» Toni: «Flojito.»'],
    },
    duos: {
      pegajin: [
        ['¡Subimos juntos!', '¡Nosotros también! Es nuestro lema.'],
        ['Tini: «¿Sois hermanos?»', 'Peores: somos pegamento.'],
      ],
      pegajon: [
        ['Toni: «¡Me imita!»', 'No imito: comparto la idea.'],
      ],
    },
  }),

  nocti: V({
    voice: 'Adormilado, con frases que se apagan en «zzz» y sobresaltos al despertar.',
    queue: [
      'Cinco minutitos más... zzz... ¿al {d}?',
      'Zzz... ¿que me toca? Sí, el {d}... zzz.',
      'No me duermo... no me duermo... zzz. Al {d}.',
      '¿Qué piso era? Ah, el {d}. Zzz.',
      'Despiértame en el {d}, ¿vale? Zzz.',
      'Anoche conté monstruos... zzz... al {d}.',
      'El ascensor me da sueño... zzz... {d}.',
      '¿Ya estamos? No... zzz. Avísame en el {d}.',
    ],
    arrive: [
      '¿Eh? ¿Ya? ¡El {d}! Zzz... ¡gracias!',
      'Me he dormido de pie. ¡Mi piso!',
      '¡Despierto!... creo. ¿Este es el {d}?',
      'Zzz... ¡oh! ¡Llegué! Buenas noches.',
      'Qué siesta más buena. ¡Gracias!',
      'Ahora sí... a la camita del {d}. Zzz.',
    ],
    error: [
      '¿Eh? ¿Otra vez? Zzz... vale.',
      'Soñaba que era mi piso... zzz.',
      'No me había enterado. ¿Cuál era?',
    ],
    blocked: [
      'Zzz... ¿que no puedo subir?',
      'Esperaré despierto... zzz... o no.',
      'Ah, ¿hay que estar despierto? Zzz.',
    ],
    meetRule: {
      shy: ['Zzz... ¿quién susurra?', 'Habla más fuerte... o no. Zzz.'],
      giant: ['Zzz... qué colchón más blandito.', 'Roncas más fuerte que yo. Zzz.'],
      ghost: ['Zzz... ¿floto o flotas tú?'],
    },
    meetId: {
      fantasmita: ['Zzz... ¿eres un sueño?', 'No me despiertes, que estoy a gusto.'],
      nube: ['Zzz... una nube con ronroneo.', 'Flotas como yo cuando duermo.'],
      sombrin: ['¿Susurras? Zzz... no te oigo.'],
    },
    duos: {
      fantasmita: [
        ['Cinco minutitos más... zzz.', '¡Yo llevo siglos! Y sin cama.'],
        ['Zzz... ¿me ves?', 'Yo tampoco me veo. Estamos iguales.'],
      ],
      gordito: [
        ['Zzz... qué colchón tan rosa.', '¡No soy un colchón! Bueno, casi.'],
      ],
    },
  }),

  fantasmita: V({
    voice: 'Atropellado y dramático: se pierde a media frase y presume de no ocupar sitio.',
    queue: [
      '¿Dónde estoy? ¡Aquí! No... Piso {d}.',
      'No ocupo sitio: ¡quepo hasta en el {d}!',
      'Atravieso paredes, pero el {d} pilla lejos.',
      '¿Me ves? A veces ni yo. Voy al {d}.',
      '¡Puedo subir lleno! Soy fantasma. Al {d}.',
      'Uy, he atravesado la cola. ¿Al {d}?',
      'Buuu... perdón, estornudo así. Piso {d}.',
      'Si me olvido de bajar: piso {d}.',
    ],
    arrive: [
      '¡El {d}! Y sin atravesar ni una pared.',
      '¡Llegué! Casi me paso otra vez.',
      '¡Buuu! Digo... ¡gracias! ¡El {d}!',
      'Aquí me quedo, flotando un ratito.',
      '¡Mi piso! Ahora, a por la puerta.',
      '¡Gracias! Nos vemos... o no. Buuu.',
    ],
    error: [
      '¡Uy! ¿Atravesé el piso correcto?',
      'Vaya, me he pasado de transparente.',
      'Buuu... de pena. ¿Cuál era mi piso?',
    ],
    blocked: [
      '¿Que no quepo? ¡Si no ocupo nada!',
      'Ah... es que hay alguien dormido, ¿no?',
      'Flotaré por aquí hasta que haya hueco.',
    ],
    meetRule: {
      shy: ['¡No te asustes! Soy de los buenos.', '¿Te atravieso? Perdón, perdón.'],
      sleepwalker: ['¡Duerme! Yo también estoy medio muerto.', 'Zzz... qué envidia de sólido.'],
      giant: ['¡Qué grande! Yo soy... nada.', 'Puedo cruzarte por dentro, ¿sabes?'],
    },
    meetId: {
      sombrin: ['¡Buuu! Perdón, era una broma.', 'No me ves, así que no te asusto.'],
      nocti: ['¿Duermes o estás como yo?', 'Yo no necesito cama. Ni suelo.'],
      draculin: ['¡Un vampiro! Nos llevamos bien.', 'Tú bebes zumo, yo atravieso muros.'],
    },
    duos: {
      sombrin: [
        ['¿Podría viajar solo...?', '¡Si yo no cuento! Soy aire.'],
        ['Me das miedo...', '¡Pero si no tengo cuerpo!'],
      ],
      nocti: [
        ['Zzz... ¿me ves?', 'Yo tampoco me veo. Genial.'],
      ],
      draculin: [
        ['¡Buuu!', 'Eso lo hago yo mejor. Mira.'],
      ],
    },
  }),

  // ── LOS OTRO 15: identidad propia sobre sus frases de categoría ───────────
  bubu: V({
    voice: 'Curioso y juguetón: habla de su único ojo y pregunta sin parar.',
    queue: [
      '¡Mi ojo ve el piso {d}! ¡Vamos!',
      '¿Y si el {d} tiene sorpresas? ¡Al {d}!',
      'Con un ojo me basta: piso {d}.',
      '¡Pregunta! ¿Mi piso es el {d}? ¡Sí!',
    ],
    arrive: [
      '¡El {d}! ¡Mi ojo acertó!',
      '¡Gracias! Aquí hay mucho que mirar.',
      '¡Guau! ¿Y este pasillo a dónde lleva? ¡Al {d}, claro!',
    ],
    error: ['¡Uy! Mi ojo vio otro número.', '¿Este no es? ¡Qué curioso!'],
    blocked: ['¡Oh! ¿No quepo? ¡Mi ojo sí!', 'Vale, espero... ¿puedo mirar mientras?'],
    meetRule: { ghost: ['¡Un fantasma! ¿Puedo tocarte?', '¿Atraviesas las cosas? ¡Prueba!'] },
  }),

  chispa: V({
    voice: 'Aceleradísima: repite palabras y mete prisa a todo el mundo.',
    queue: [
      '¡Rápido, rápido! ¡Al {d}!',
      '¡No puedo parar! ¡Piso {d} ya!',
      '¡El {d}, el {d}, el {d}! ¡Vamos!',
      '¡Chispas! ¡Que me voy solo al {d}!',
    ],
    arrive: [
      '¡El {d}! ¡Más rápido que tú!',
      '¡Llegué! ¿Otro viaje? ¡Otro!',
      '¡Ya! ¡Ya! ¡Ya estoy en el {d}!',
    ],
    error: ['¡No, no, no! ¡Otra vez!', '¡Qué lento va este ascensor!', '¡Venga, venga, venga!'],
    blocked: ['¡Que me dejes pasar! ¡Voy volando!', '¡No puedo esperar! ¡Bueno, espero!'],
    meetRule: { sleepwalker: ['¡Despierta! ¡Vamos, vamos!', '¿Cómo puedes dormir de pie?'] },
  }),

  moco: V({
    voice: 'Pegajoso y tranquilo: habla de gelatina y deja brillitos por donde pasa.',
    queue: [
      'Voy dejando brillitos... hasta el {d}.',
      'Gelatina en marcha: piso {d}.',
      'Si me derrito, avísame en el {d}.',
      '¡Plof, plof! Al {d}, por favor.',
    ],
    arrive: [
      '¡Plof! ¡El {d}! Qué bien sienta.',
      'Aquí dejo mi brillito de gracias.',
      '¡Plof! Aquí me quedo, pegadito.',
      'Llegué... ¿me despego yo o me despegas tú?',
    ],
    blocked: [
      'Me he quedado pegado al suelo. Otra vez.',
      'Si no quepo, me aplasto. ¿Puedo?',
    ],
    error: ['Uy, me he desparramado aquí.', '¿Este no era? Qué pringoso todo.'],
    meetRule: { duo: ['¡Sois pegajosos como yo!', 'Los tres haríamos un charco.'] },
  }),

  nube: V({
    voice: 'Suave y flotante: ronronea como un gato y habla despacio.',
    queue: [
      'Flotando hasta el {d}... mrrr.',
      'Mrrr... ¿me llevas al {d}?',
      'Subo como una brisa: piso {d}.',
      'Mrrr, qué mullido el {d}.',
    ],
    arrive: [
      'Mrrr... el {d}. Qué suave todo.',
      'Aquí me quedo flotando, gracias.',
      'Aquí es... mrrr, qué mullido.',
      'Bajito, como una brisa. ¡El {d}!',
    ],
    blocked: [
      'No floto más rápido, lo siento.',
      'Mrrr... esperaré aquí arriba.',
    ],
    error: ['Mrrr... ¿piso equivocado?', 'Uy, me he desinflado un poco.'],
    meetRule: { ghost: ['¿Flotas más que yo? Mrrr.', 'Dos cosas que no pesan...'] },
  }),

  draculin: V({
    voice: 'Vampirito presumido pero tierno: habla de noche, colmillos y cortinas.',
    queue: [
      'Al {d}... ¡que tenga cortinas!',
      'Un vampiro pequeñito con destino {d}.',
      '¿El {d} es oscuro? Me encanta.',
      'No muerdo. Solo voy al {d}.',
    ],
    arrive: [
      '¡El {d}! Qué sombra tan rica.',
      'Gracias, mortale. Digo... amigo.',
      'El {d}. Oscuro, espero.',
      '¡Llegué! Nadie me ha mordido. Bien.',
    ],
    blocked: [
      'No quepo... qué vergüenza de vampiro.',
      'Esperaré en la sombra, entonces.',
    ],
    error: ['¡Uy! Mi colmillo vio otro piso.', '¿De día? ¿Y este piso?'],
    meetRule: { ghost: ['¡Un fantasma! Somos colegas.', 'Buuu tú, buuu yo, ¿no?'] },
    meetId: { fantasmita: ['Tú atraviesas, yo me escondo.', '¡Enséñame a desaparecer!'] },
  }),

  rufi: V({
    voice: 'Orejas enormes: siempre ha "oído" algo y lo cuenta en voz alta.',
    queue: [
      'He oído que mi piso es el {d}.',
      'Con estas orejas sé que es el {d}.',
      '¡Silencio! Escucho... el {d}.',
      'Oigo el ascensor. ¡Y mi {d}!',
    ],
    arrive: [
      '¡El {d}! Lo oí desde abajo.',
      'Qué silencio tan bueno. Gracias.',
      '¡El {d}! Lo oí antes de llegar.',
      'Aquí es. Mis orejas no fallan.',
    ],
    blocked: [
      'He oído que no cabemos... ¿verdad?',
      'Espero, pero en silencio total.',
    ],
    error: ['¿Eh? Mis orejas dijeron otro.', '¡He oído mal! Pasa... a veces.'],
    meetRule: { shy: ['Perdón, hablo muy fuerte.', 'Susurro... ¿así mejor?'] },
  }),

  glup: V({
    voice: 'Acuático: mete "glup" en todas partes y suelta burbujas al hablar.',
    queue: [
      'Glup glup... ¡al {d}!',
      '¿Caben mis burbujas? Piso {d}.',
      'Glup... el agua del {d} me llama.',
      '¡Burbujas arriba! Al {d}, glup.',
    ],
    arrive: [
      '¡Glup! ¡El {d}! Qué seco todo.',
      'Gracias, glup glup. ¡Burbujas!',
      '¡Glup! Piso {d} conquistado.',
      'Llegué chorreando un poco. Perdón.',
    ],
    blocked: [
      'Glup... me he quedado seco esperando.',
      'Si no quepo, hago burbujas aquí.',
    ],
    error: ['Glup... ¿piso equivocado?', 'Me he tragado una burbuja mala.'],
    meetRule: { giant: ['Glup... qué onda tan grande.', 'Casi me trago tu reflejo.'] },
  }),

  turista: V({
    voice: 'Guía en mano y cámara al cuello: convierte todo en una excursión.',
    queue: [
      '¡Mi guía dice que el {d} es imprescindible!',
      '¡Foto del ascensor! Y luego al {d}.',
      '¿El {d} tiene mirador? ¡Pues al {d}!',
      'He leído que el {d} es el mejor piso.',
    ],
    arrive: [
      '¡El {d}! ¡Cinco estrellas en mi guía!',
      '¡Fotito y a explorar el {d}!',
      '¡El {d}! Lo pongo en la guía.',
      '¡Llegué! Foto de recuerdo, porfa.',
    ],
    blocked: [
      'La guía no avisaba de esta espera.',
      'Anotaré el retraso: dos estrellas menos.',
    ],
    error: ['¡Mi guía no dice esto!', '¿Piso equivocado? Lo anoto todo.'],
    meetRule: { ghost: ['¡Un fantasma auténtico! ¡Foto!', '¿Salen en las fotos? A ver...'] },
  }),

  vip: V({
    voice: 'Estirado pero educado: frases cortas, tono de huésped importante.',
    queue: [
      'El {d}. Y sin esperas, por favor.',
      'Mi suite está en el {d}. Vamos.',
      'Confío en que el {d} esté impecable.',
      'Soy VIP: el {d} es lo mínimo.',
    ],
    arrive: [
      'El {d}. Aceptable. Gracias.',
      'Por fin. Mi suite me espera.',
      'El {d}. Aceptable, al fin.',
      'He llegado. Que nadie lo dude.',
    ],
    blocked: [
      '¿Que no quepo? Inaceptable.',
      'Esperaré. Pero conste en acta.',
    ],
    error: ['Esto no es lo que pedí.', '¿Mi categoría viaja así?'],
    meetRule: { luggage: ['Menos maletas y más servicio.', 'Su equipaje tapa la puerta.'] },
  }),

  maletero: V({
    voice: 'Trabajador y fuerte: habla de maletas, peso y de aguantar lo que haga falta.',
    queue: [
      '¡Maletas arriba! Piso {d}. Yo aguanto.',
      'Ocuparé dos huecos: maletas y yo. Al {d}.',
      'Cinco maletas y un destino: el {d}.',
      '¡Cuidado con las ruedas! Vamos al {d}.',
    ],
    arrive: [
      '¡El {d}! Todo el equipaje entero.',
      'Descargado y listo. Buen trabajo.',
      '¡El {d}! Equipaje completo, revisado.',
    ],
    error: ['¿Eh? Mis maletas van donde yo.', 'Vaya viaje extra... y con peso.', 'Uf, tanto peso para nada.'],
    blocked: ['Necesito dos huecos libres.', 'Sin sitio para las maletas, no subo.'],
    meetRule: { giant: ['¡Al fin alguien que ayuda!', 'Entre tú y yo, llenamos esto.'] },
    meetId: { gordito: ['¡Compañero de bultos!', '¿Me echas una mano con esta?'] },
    duos: { gordito: [['¡Cuidado con mis maletas!', '¡Cuidado con mi codo!']] },
  }),

  enamorado: V({
    voice: 'Romántico total: todo lo convierte en una cita y habla con corazones.',
    queue: [
      'Con mi amor al {d}. Nada más.',
      'El {d} es nuestro rincón. Juntos.',
      '¿Subimos los dos? Piso {d}, porfa.',
      'Sin mi pareja no viajo ni al {d}.',
    ],
    arrive: [
      '¡El {d}! Juntos, como siempre.',
      'Nuestro piso. Qué bonito todo.',
      'El {d}... y mi corazón también.',
      'Llegué. ¿Viste a mi amor?',
    ],
    blocked: [
      'Sin mi amor no viajo. Ni un piso.',
      'Espera, que viene mi mitad.',
    ],
    error: ['Ay, mi amor se ha bajado solo.', '¿Sin mí? ¡Vuelvo a por los dos!'],
    meetId: { enamorado: ['¡Mi amor! ¡Qué cerca estás!', 'Contigo hasta el piso 100.'] },
    duos: {
      enamorado: [
        ['¿Subimos juntos?', 'Siempre juntos. Donde sea.'],
        ['Te he guardado sitio.', 'Yo te he guardado el corazón.'],
      ],
    },
  }),

  grunon: V({
    voice: 'Seco, quejica y gruñón: frases cortas y ninguna gana de conversar.',
    queue: [
      'Al {d}. Y que ESE no respire cerca.',
      'El {d}. Solo, rápido y en silencio.',
      'No me mires. Piso {d}. Ya.',
      'Si sube ESE, me bajo. Al {d}.',
    ],
    arrive: [
      'Por fin. Ni ruido ni vecinos.',
      'El {d}. Así sí. Adiós.',
      'Ya era hora. El {d}, por fin.',
      'Bajé. No me aplaudas.',
    ],
    blocked: [
      'Claro. Lleno. Siempre lleno.',
      'Esperaré. Gruñendo, eso sí.',
    ],
    error: ['¿Otra vez? Qué desastre.', '¡Mi paciencia tiene un límite!'],
    meetId: {
      nube: ['Tú y yo, ni en el mismo piso.', 'Ronroneas demasiado. Aléjate.'],
      chispa: ['Tanta energía me agota.', 'No corras tanto, que me mareas.'],
      bubu: ['¿Por qué me miras con ese ojo?', 'Un ojo es suficiente para molestarme.'],
    },
  }),

  pegajin: V({
    voice: 'Slime verde entusiasta: siempre llama a Pegajón y termina pegado a algo.',
    queue: [
      '¡Pegajón! ¡Que subimos! Piso {d}.',
      'Yo voy al {d}... pegado a mi amigo.',
      '¡No me separes de Pegajón! Al {d}.',
      'Pegajín y Pegajón, destino {d}.',
    ],
    arrive: [
      '¡El {d}! ¡Pegajón, ven!',
      'Aquí me quedo, pegadito. Gracias.',
      'Llegué pegado a mi amigo. ¡Los dos!',
    ],
    blocked: [
      '¡No podemos separarnos! Esperamos juntos.',
      'Si no cabemos los dos, no cabemos.',
    ],
    error: ['Uy, me he pegado al piso malo.', '¿Sin Pegajón? ¡Vuelvo!'],
    meetId: { pegajon: ['¡Amigo! ¡Subimos juntos!', 'Te he guardado medio hueco.'] },
    duos: {
      pegajon: [
        ['¡Subimos juntos!', 'Juntos y pegados, como siempre.'],
        ['¿Quién lo dice primero?', 'Los dos a la vez. Somos así.'],
      ],
      gemelos: [['¡Somos iguales!', 'Tú verde, yo morado. Casi.']],
    },
  }),

  pegajon: V({
    voice: 'Slime morado tranquilo: la mitad serena del dúo, siempre detrás de Pegajín.',
    queue: [
      'Voy pegado a Pegajín... al {d}.',
      'El {d}, sí. Los dos, por supuesto.',
      'Pegajín decide, yo pego. Piso {d}.',
      'Juntos al {d}: es nuestra norma.',
    ],
    arrive: [
      'El {d}. Pegajín ya está ahí.',
      'Llegamos enteros y pegados.',
      'Aquí. Detrás de Pegajín, como siempre.',
    ],
    blocked: [
      'Pegajín decide. Esperamos.',
      'Sin él no me muevo. Literal.',
    ],
    error: ['Uy... Pegajín, este no era.', 'Nos hemos pegado al piso malo.'],
    meetId: { pegajin: ['Aquí estoy, no corras.', 'Los dos. Apuntado.'] },
    duos: { pegajin: [['¡Que me esperes!', 'Siempre te espero. Soy pegajoso.']] },
  }),

  temblorin: V({
    voice: 'Tartamudea y tiembla: cuenta cuántos monstruos hay dentro de la cabina.',
    queue: [
      'A-al {d}... pero con poca gente.',
      'Si hay más de dos, tiemblo. Piso {d}.',
      '¿Viajamos tranquilos al {d}?',
      'Dos como máximo, porfa... al {d}.',
    ],
    arrive: [
      '¡L-legué! Y sin temblar casi.',
      'Qué viaje más tranquilo. Gracias.',
      '¿E-este es el {d}? ¡Gracias!',
      'Llegué... ¿puedo respirar ya?',
    ],
    blocked: [
      '¡Q-que no quepo! Mejor... mejor espero.',
      'S-solo, por favor... a-aunque tarde.',
    ],
    error: ['¡Aaah! ¡Y encima equivocado!', 'N-no pasa nada... tiemblo igual.'],
    meetRule: {
      giant: ['¡Qué grande! N-no lo toco.', 'Si sube él, yo me quedo aquí.'],
      luggage: ['Muchas maletas... mucho bulto.', 'Y-yo necesito espacio vacío.'],
    },
    meetId: { gordito: ['D-dos sitios... qué miedo.', 'N-no te me acerques, porfa.'] },
  }),
};

// ── Selección sin repeticiones ────────────────────────────────────────────────
/** Historial por clave: así un monstruo no repite SU frase, no la de otro. */
const reciente = new Map<string, string[]>();

export function pickFrom(pool: string[], key: string, avoid = 3, dest?: number): string {
  if (pool.length === 0) return '';
  const usado = reciente.get(key) ?? [];
  let libre = pool.filter((l) => !usado.includes(l));
  if (libre.length === 0) { libre = pool; usado.length = 0; }
  const linea = libre[Math.floor(Math.random() * libre.length)];
  usado.push(linea);
  while (usado.length > avoid) usado.shift();
  reciente.set(key, usado);
  return dest !== undefined ? linea.replace(/\{d\}/g, `${dest}`) : linea.replace(/\{d\}/g, '');
}

export function voiceOf(monsterId: string): MonsterVoice | null {
  return VOICES[monsterId] ?? null;
}

/** Frase de cola: voz propia del monstruo y, si no tiene, su categoría. */
export function queueLineFor(monsterId: string, kind: MonsterKind, dest: number): string {
  const v = VOICES[monsterId];
  if (v && v.queue.length) return pickFrom(v.queue, `${monsterId}.q`, 4, dest);
  return pickFrom(QUEUE_LINES[kind] ?? QUEUE_LINES.none, `${kind}.q`, 3, dest);
}

/** Frase de llegada: voz propia y, si no, categoría. */
export function arriveLineFor(monsterId: string, kind: MonsterKind, dest: number): string {
  const v = VOICES[monsterId];
  if (v && v.arrive.length) return pickFrom(v.arrive, `${monsterId}.a`, 3, dest);
  return pickFrom(ARRIVAL_LINES[kind] ?? ARRIVAL_LINES.none, `${kind}.a`, 3, dest);
}

/** Reacción al equivocarse de piso (con fallback por categoría). */
export function errorLineFor(monsterId: string, kind: MonsterKind): string {
  const v = VOICES[monsterId];
  if (v && v.error.length) return pickFrom(v.error, `${monsterId}.e`, 2);
  return pickFrom(sinDestino(QUEUE_LINES[kind] ?? QUEUE_LINES.none), `${kind}.e`, 2);
}

/** Reacción cuando su regla le impide subir. */
export function blockedLineFor(monsterId: string, kind: MonsterKind): string {
  const v = VOICES[monsterId];
  const pool = v && v.blocked.length ? v.blocked : sinDestino(QUEUE_LINES[kind] ?? QUEUE_LINES.none);
  return pickFrom(pool, `${monsterId}.b`, 2);
}

/** Reacción al encontrarse con otro monstruo concreto (id o regla). */
export function meetLineFor(monsterId: string, otherId: string, otherRule: SpecialRule): string | null {
  const v = VOICES[monsterId];
  if (!v) return null;
  const porId = sinDestino(v.meetId[otherId] ?? []);
  const porRegla = sinDestino(v.meetRule[otherRule] ?? []);
  const pool = porId.length && Math.random() < 0.6 ? porId : (porRegla.length ? porRegla : porId);
  if (!pool || !pool.length) return null;
  return pickFrom(pool, `${monsterId}>${otherId}`, 2);
}

/** Conversación de dos voces entre dos monstruos con relación. */
/**
 * Quita de un repertorio las frases que piden el piso de destino.
 *
 * Un error, un bloqueo o un encuentro ocurren SIN que el personaje sepa a dónde va:
 * si se dejara el token `{d}`, se leería «¡Al , por favor!» (un hueco vacío). Las
 * frases propias ya se escribieron sin `{d}`; esto protege las reservas genéricas de
 * `dialogues.ts`, que sí lo llevan.
 */
function sinDestino(pool: string[]): string[] {
  const limpio = pool.filter((l) => !l.includes('{d}'));
  return limpio.length ? limpio : pool.map((l) => l.replace(/\{d\}/g, 'mismo sitio'));
}

export function duoLineFor(aId: string, bId: string): { a: string; b: string } | null {
  const desdeA = VOICES[aId]?.duos?.[bId];
  if (desdeA && desdeA.length) {
    const par = desdeA[Math.floor(Math.random() * desdeA.length)];
    return { a: par[0], b: par[1] };
  }
  const desdeB = VOICES[bId]?.duos?.[aId];
  if (desdeB && desdeB.length) {
    const par = desdeB[Math.floor(Math.random() * desdeB.length)];
    return { a: par[1], b: par[0] };
  }
  return null;
}

/** ¿Este monstruo tiene voz propia escrita para el Sprint 2? */
export function hasOwnVoice(monsterId: string): boolean {
  const v = VOICES[monsterId];
  return !!v && v.queue.length > 0 && v.arrive.length > 0;
}

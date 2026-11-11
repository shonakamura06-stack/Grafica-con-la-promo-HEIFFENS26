// Manifiesto de voz de Rese (generado con la voz elegida por el usuario).
// t[i] = segundo en que empieza la línea i dentro del clip.
export interface ReseClip { file: string; lines: string[]; t: number[]; dur: number }
export const RESE_VOICE: Record<string, ReseClip> = {
  "tut1": {
    "file": "audio/rese/tut1.mp3",
    "lines": [
      "¡Hola! Soy Rese, el recepcionista del hotel.",
      "Paso 1: toca un monstruo de la fila para que suba al ascensor.",
      "Paso 2: toca en el panel el piso de su número.",
      "Paso 3: ¡bájalo en su piso y gana estrellas!"
    ],
    "t": [
      0.0,
      3.11,
      8.89,
      13.79
    ],
    "dur": 17.79
  },
  "tut_couple": {
    "file": "audio/rese/tut_couple.mp3",
    "lines": [
      "¡Mira! Esa pareja está enamorada.",
      "Paso 1: sube a los DOS al ascensor.",
      "Paso 2: deben bajar JUNTOS en su piso.",
      "Si los separas, pierdes 1 estrella. ¡Cuídalos!"
    ],
    "t": [
      0.0,
      2.21,
      5.74,
      9.27
    ],
    "dur": 12.36
  },
  "tut_lives": {
    "file": "audio/rese/tut_lives.mp3",
    "lines": [
      "¡Atención! Desde hoy tienes 3 corazones.",
      "Cada piso equivocado cuesta 1 corazón.",
      "Si pierdes los 3, reintentas el nivel.",
      "Mira bien los números… ¡y tú puedes!"
    ],
    "t": [
      0.0,
      2.66,
      5.32,
      8.42
    ],
    "dur": 11.52
  },
  "tut_enemies": {
    "file": "audio/rese/tut_enemies.mp3",
    "lines": [
      "¡Uy! Hay monstruos que se odian.",
      "Paso 1: fíjate bien quiénes son enemigos.",
      "Paso 2: NO los subas juntos al ascensor.",
      "Si viajan juntos, pierdes 1 estrella."
    ],
    "t": [
      0.0,
      2.8,
      6.07,
      9.81
    ],
    "dur": 12.62
  },
  "tut_luggage": {
    "file": "audio/rese/tut_luggage.mp3",
    "lines": [
      "¡Llegó Maletero, el monstruo de las maletas!",
      "Sus maletas ocupan 2 lugares del ascensor.",
      "Planifica bien tus viajes.",
      "¡Tú puedes!"
    ],
    "t": [
      0.0,
      3.47,
      6.95,
      8.93
    ],
    "dur": 9.93
  },
  "tut_break": {
    "file": "audio/rese/tut_break.mp3",
    "lines": [
      "El ascensor está viejito… ¡puede averiarse!",
      "Si se avería, el tiempo se pausa.",
      "Toca los engranajes para girarlos y repararlo.",
      "¡Rápido, que los monstruos esperan!"
    ],
    "t": [
      0.0,
      2.75,
      5.96,
      9.17
    ],
    "dur": 11.47
  },
  "forg_wrong": {
    "file": "audio/rese/forg_wrong.mp3",
    "lines": [
      "¡Uy! Ese no era el piso.",
      "Tranqui: esta vez NO pierdes estrella, te la perdono.",
      "Mira el número del monstruo y toca ese piso.",
      "¡Tú puedes!"
    ],
    "t": [
      0.0,
      2.83,
      7.07,
      11.31
    ],
    "dur": 12.25
  },
  "forg_enemy": {
    "file": "audio/rese/forg_enemy.mp3",
    "lines": [
      "¡Uy! Esos dos se odian y viajaron juntos.",
      "Esta vez te perdono la estrella.",
      "La próxima, sube a uno por viaje.",
      "¡Tú puedes!"
    ],
    "t": [
      0.0,
      3.43,
      6.01,
      9.02
    ],
    "dur": 9.87
  },
  "forg_couple": {
    "file": "audio/rese/forg_couple.mp3",
    "lines": [
      "¡Uy! Separaste a la pareja enamorada.",
      "Esta vez te perdono la estrella.",
      "Recuerda: deben bajar JUNTOS en su piso.",
      "¡Tú puedes!"
    ],
    "t": [
      0.0,
      2.74,
      5.48,
      8.67
    ],
    "dur": 9.59
  }
};

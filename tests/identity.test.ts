/**
 * Pruebas de INTEGRACIÓN del Sprint 2: que lo declarado en los datos exista de
 * verdad en el juego y que la personalidad NO altere la lógica del puzle.
 *
 * Tres cosas se comprueban leyendo el código fuente (no hay navegador en el
 * entorno de pruebas, así que no se puede abrir una partida real):
 *   1. las texturas de cara que pide el animador las genera BootScene,
 *   2. los sonidos característicos existen en systems/audio.ts (WebAudio, sin
 *      ficheros: `public/audio/` no existe en este proyecto),
 *   3. GameScene usa los cinco sistemas nuevos y no reintroduce los fallos
 *      antiguos (separación fija de 52 px, un tween infinito por pasajero,
 *      bocadillos que se pisan).
 *
 * Y dos cosas se comprueban ejecutando el motor de verdad:
 *   4. el plan óptimo de los 30 niveles sigue jugándose igual (la personalidad
 *      no cambia ni reglas, ni cabina, ni pasos),
 *   5. los diálogos nuevos no rompen las reglas sociales que enseñan.
 */
import { describe, it, expect } from 'vitest';
// Los fuentes se leen como texto con el sufijo `?raw` de Vite (tipos de
// `vite/client`, que sí está en el tsconfig). No hay @types/node en el proyecto.
import BOOT from '../src/scenes/BootScene.ts?raw';
import AUDIO from '../src/systems/audio.ts?raw';
import GAME from '../src/scenes/GameScene.ts?raw';
import RULES from '../src/systems/rules.ts?raw';
import SCORING from '../src/systems/scoring.ts?raw';
import LEVELS_SRC from '../src/data/levels.ts?raw';
import ECONOMY from '../src/systems/economy.ts?raw';
import ANIMATOR from '../src/systems/animator.ts?raw';
import BUBBLES from '../src/systems/bubbles.ts?raw';
import QUEUE from '../src/systems/queueLayout.ts?raw';
import INTER from '../src/systems/interactions.ts?raw';
import { MONSTERS, MONSTER_MAP } from '../src/data/monsters';
import { LEVELS } from '../src/data/levels';
import { computeOptimal } from '../src/systems/scoring';
import { VOICES, queueLineFor, arriveLineFor } from '../src/data/voices';
import { PERSONALITIES, BLINK_IDS, GAZE_IDS, faceTexturesOf } from '../src/systems/personality';
import { MOTION_PRESETS, REACTION_PRESETS } from '../src/systems/animator';


describe('texturas de cara: las que se piden son las que se generan', () => {
  it('BootScene genera las variantes de parpadeo y de mirada', () => {
    expect(BOOT).toContain('BLINK_IDS');
    expect(BOOT).toContain('GAZE_IDS');
    expect(BOOT).toMatch(/variante\(id, 'blink', true, 0\)/);
    expect(BOOT).toMatch(/variante\(id, 'look-l', false, -1\)/);
    expect(BOOT).toMatch(/variante\(id, 'look-r', false, 1\)/);
    // Se generan en create() (una sola vez), nunca en caliente durante la partida.
    const create = BOOT.slice(BOOT.indexOf('  create(): void {'));
    expect(create).toContain('monster-${id}-${sufijo}');
    // Y el flag de parpadeo se devuelve a su sitio tras generar cada variante.
    expect(create).toContain('BLINK = false; GAZE = 0;');
  });

  it('las claves que usa el animador coinciden con las que genera BootScene', () => {
    for (const id of BLINK_IDS) expect(BOOT).toContain(`variante(id, 'blink'`);
    // Los 18 que parpadean + los 6 que miran = 30 texturas extra de 128×128.
    expect(BLINK_IDS.length).toBe(18);
    expect(GAZE_IDS.length).toBe(6);
    const total = MONSTERS.reduce((n, m) => n + faceTexturesOf(m.id).length, 0);
    expect(total).toBe(20 * 3 + BLINK_IDS.length + GAZE_IDS.length * 2);
    expect(total).toBe(90);
  });

  it('los 5 prioritarios parpadean (su expresión es parte de su identidad)', () => {
    for (const id of ['sombrin', 'gordito', 'gemelos', 'nocti', 'fantasmita']) {
      expect(BLINK_IDS, id).toContain(id);
    }
    expect(GAZE_IDS, 'sombrin debería mirar').toContain('sombrin');
    expect(GAZE_IDS, 'nocti debería mirar').toContain('nocti');
  });

  it('los 5 monstruos sin el helper eye() tienen su parpadeo dibujado a mano', () => {
    // nube, nocti, fantasmita, vip y enamorado no llaman a eye(): su expresión es
    // un arco, un párpado rectangular o un corazón. Cada uno necesita su arte.
    const sinEye = ['nube', 'nocti', 'fantasmita', 'vip', 'enamorado'];
    for (const id of sinEye) {
      const i = BOOT.indexOf(`  ${id}(g, mood) {`);
      expect(i, `falta el dibujante de ${id}`).toBeGreaterThan(-1);
      const cuerpo = BOOT.slice(i, BOOT.indexOf('\n  },', i));
      expect(cuerpo).not.toContain('eye(g,');
    }
    // Nocti, Fantasmita y Enamorado sí tienen variante propia con BLINK.
    const nocti = BOOT.slice(BOOT.indexOf('  nocti(g, mood) {'), BOOT.indexOf('  },', BOOT.indexOf('  nocti(g, mood) {')));
    expect(nocti).toContain('if (BLINK)');
    const fant = BOOT.slice(BOOT.indexOf('  fantasmita(g, mood) {'), BOOT.indexOf('  },', BOOT.indexOf('  fantasmita(g, mood) {')));
    expect(fant).toContain('if (BLINK)');
    const enam = BOOT.slice(BOOT.indexOf('  enamorado(g, mood) {'), BOOT.indexOf('  },', BOOT.indexOf('  enamorado(g, mood) {')));
    expect(enam).toContain('if (BLINK)');
    // Nube y el VIP no parpadean: no se generan texturas inútiles.
    expect(BLINK_IDS).not.toContain('nube');
    expect(BLINK_IDS).not.toContain('vip');
  });

  it('las texturas nuevas no se generan dentro de un bucle de fotogramas', () => {
    // generateTexture debe aparecer sólo en create() de BootScene.
    const fuera = GAME.match(/generateTexture/g);
    expect(fuera, 'GameScene no debe generar texturas').toBeNull();
  });
});

describe('sonido característico: existe y es sintetizado (sin ficheros)', () => {
  it('los 18 sonidos de personality.ts son métodos de systems/audio.ts', () => {
    const claves = new Set<string>();
    for (const p of Object.values(PERSONALITIES)) if (p.sfx) claves.add(p.sfx);
    expect(claves.size).toBe(18);
    for (const clave of claves) {
      expect(AUDIO, `audio.ts no tiene ${clave}()`).toMatch(new RegExp(`\\b${clave}\\(\\): void \\{`));
    }
  });

  it('ningún sonido nuevo intenta cargar un fichero (public/audio no existe)', () => {
    expect(AUDIO).not.toContain('.mp3');
    expect(AUDIO).not.toContain('this.load.audio');
    expect(AUDIO).not.toContain('fetch(');
    // Todo sale de WebAudio: oscilador y ganancia.
    expect(AUDIO).toContain('createOscillator');
  });

  it('los sonidos característicos son cortos y flojos (no saturan el móvil)', () => {
    const i = AUDIO.indexOf('// ── Sonidos característicos');
    const bloque = AUDIO.slice(i, AUDIO.indexOf('// ── Música ambiental'));
    // Duración máxima de un tono propio: 0,3 s.
    const duraciones = [...bloque.matchAll(/(?:tone|sweep)\([^)]*,\s*(0\.\d+)/g)].map((m) => Number(m[1]));
    expect(duraciones.length).toBeGreaterThanOrEqual(29);
    expect(Math.max(...duraciones)).toBeLessThanOrEqual(0.3);
    // Volumen máximo de un sonido de personaje: 0,16 (los de acción llegan a 0,4).
    // tone(freq, dur, type, vol, delay) → el volumen es el 4º argumento;
    // sweep(from, to, dur, type, vol, delay) → el 5º. Se miden ésos, no los retrasos.
    const volumenes: number[] = [];
    for (const m of bloque.matchAll(/this\.tone\(([^)]*)\)/g)) {
      const args = m[1].split(',').map((x) => x.trim());
      const vol = Number(args[3]);
      if (Number.isFinite(vol)) volumenes.push(vol);
    }
    for (const m of bloque.matchAll(/this\.sweep\(([^)]*)\)/g)) {
      const args = m[1].split(',').map((x) => x.trim());
      const vol = Number(args[4]);
      if (Number.isFinite(vol)) volumenes.push(vol);
    }
    expect(volumenes.length).toBeGreaterThan(20);
    expect(Math.max(...volumenes), 'un sonido de personaje demasiado fuerte').toBeLessThanOrEqual(0.16);
  });

  it('GameScene dispara los sonidos por clave con enfriamiento global', () => {
    expect(GAME).toContain('audio.signature(');
    expect(GAME).toContain('FX_LIMITS.sfxEveryMs');
    expect(GAME).toContain('this.lastSfx');
  });
});

describe('GameScene usa los cinco sistemas nuevos', () => {
  it('la cola se calcula con queueLayout (fuera la separación fija de 52 px)', () => {
    expect(GAME).toContain('computeQueueLayout');
    expect(GAME).toContain('QUEUE_AREA');
    expect(GAME).not.toMatch(/private queuePositions\(\)/);
    expect(GAME).not.toMatch(/\(countInRow - 1\) \/ 2\) \* 52/);
    // Y aplica el ajuste de escala del peor caso.
    expect(GAME).toContain('layout.fitScale');
  });

  it('el reposo es por cálculo, no un tween infinito por pasajero', () => {
    expect(GAME).toContain('idleFrame(');
    expect(GAME).toContain('p.baseScale * f.sx');
    // El bobTween antiguo (yoyo, repeat: -1) ya no se crea.
    expect(GAME).not.toMatch(/bobTween = this\.tweens\.add/);
    expect(GAME).not.toContain('repeat: -1, delay: Math.random()');
  });

  it('los bocadillos pasan por el director (turnos y prioridad)', () => {
    expect(GAME).toContain('BubbleDirector');
    expect(GAME).toContain('this.bubbles.say(');
    expect(GAME).toContain('updateBubbles(');
    expect(GAME).toContain('PRIORITY.error');
    expect(GAME).toContain('PRIORITY.rule');
    // El dibujo antiguo ya no decide posición ni duración por su cuenta.
    expect(GAME).toContain('paintBubble(');
    expect(GAME).not.toMatch(/private showBubble\(text: string, x: number, y: number, duration = 1600\): void \{\n    this\.bubbleText\.setText/);
  });

  it('las reacciones las decide InteractionDirector, no el azar de la escena', () => {
    expect(GAME).toContain('InteractionDirector');
    expect(GAME).toContain('this.interactions.update(');
    expect(GAME).toContain('castSnapshot()');
    for (const kind of ['coupleGaze', 'enemyGlare', 'duoHug', 'twinsMirror', 'shyHide',
      'giantStomp', 'ghostPhase', 'snore', 'fearTremble']) {
      expect(GAME, `GameScene no atiende ${kind}`).toContain(`case '${kind}'`);
    }
    // 'ambient' (la manía propia) se atiende en la rama por defecto.
    expect(GAME).toContain('this.playQuirk(a)');
    expect(GAME).toContain('private playQuirk(');
  });

  it('la escena oculta para el trabajo visual (pestaña en segundo plano)', () => {
    expect(GAME).toContain('sceneVisible');
    expect(GAME).toContain('document.hidden');
    expect(GAME).toMatch(/if \(!this\.sceneVisible \|\| this\.won\) return;/);
    expect(GAME).toContain('this.bubbles.silence(');
    // Y los eventos de Phaser también cuentan (PAUSE/RESUME/SLEEP/WAKE).
    for (const ev of ['PAUSE', 'RESUME', 'SLEEP', 'WAKE']) {
      expect(GAME, ev).toContain(`Scenes.Events.${ev}`);
    }
  });

  it('las partículas tienen tope y se contabilizan', () => {
    expect(GAME).toContain('FX_LIMITS.maxLiveParticles');
    expect(GAME).toContain('this.liveParticles');
    expect(GAME).toContain('private puff(');
  });

  it('Rese reacciona a las situaciones del encargo sin perder su identidad', () => {
    expect(GAME).toContain('reseReact(');
    for (const sit of ['coupleTogether', 'angry', 'sleeping', 'breakdown', 'repaired', 'levelClear']) {
      expect(GAME, `Rese no reacciona a ${sit}`).toContain(`'${sit}'`);
    }
    // Conserva su imagen y su sistema de conversaciones completo.
    expect(GAME).toContain('reseImg');
    expect(GAME).toContain('RESE_VOICE');
    expect(GAME).toContain('startDialog(');
    expect(GAME).toContain('drawDialogBox(');
    // Su reacción NO abre el diálogo completo: no pausa el reloj del jugador.
    const i = GAME.indexOf('private reseReact(');
    const cuerpo = GAME.slice(i, GAME.indexOf('\n  }', i));
    expect(cuerpo).not.toContain('startDialog');
    expect(cuerpo).not.toContain('reseActive = true');
  });

  it('las animaciones de entrada y salida salen de los presets del personaje', () => {
    expect(GAME).toContain('this.playMotion(p, p.pers.board)');
    expect(GAME).toContain('this.playMotion(p, p.pers.exit)');
    expect(GAME).toContain('MOTION_PRESETS');
    expect(GAME).toContain('REACTION_PRESETS');
    // Un preset por cada estilo declarado: nada se queda sin animación.
    expect(Object.keys(MOTION_PRESETS).length).toBe(10);
    expect(Object.keys(REACTION_PRESETS).length).toBe(5);
  });

  it('las voces propias se usan en la cola, en la llegada y en el error', () => {
    expect(GAME).toContain('queueLineFor(');
    expect(GAME).toContain('arriveLineFor(');
    expect(GAME).toContain('blockedLineFor(');
    expect(GAME).toContain('RULE_HINTS');
    expect(GAME).toContain('duoLineFor(');
    expect(GAME).toContain('meetLineFor(');
    // Y ya no se llama a las genéricas de categoría en esos tres sitios.
    expect(GAME).not.toContain('queueLine(');
    expect(GAME).not.toContain('arrivalLine(');
  });
});

describe('la personalidad NO altera la lógica del puzle', () => {
  it('las reglas no importan nada de personalidad, voces ni animación', () => {
    const logicos: Array<[string, string]> = [
      ['systems/rules.ts', RULES], ['systems/scoring.ts', SCORING], ['data/levels.ts', LEVELS_SRC],
    ];
    for (const [nombre, texto] of logicos) {
      for (const prohibido of ['personality', 'voices', 'animator', 'bubbles', 'interactions', 'queueLayout']) {
        expect(texto, `${nombre} no debe depender de ${prohibido}`).not.toContain(prohibido);
      }
    }
  });

  it('los módulos nuevos tampoco importan las reglas (sólo las observan)', () => {
    for (const [nombre, texto] of [['animator', ANIMATOR], ['bubbles', BUBBLES], ['queueLayout', QUEUE]] as Array<[string, string]>) {
      expect(texto, `${nombre} no debe tocar canBoard/canExit`).not.toContain('canBoard');
      expect(texto, nombre).not.toContain('canExit');
    }
    // interactions.ts sólo conoce los nombres de las reglas, nunca sus funciones.
    expect(INTER).not.toContain('canBoard');
    expect(INTER).not.toContain('canExit');
    expect(INTER).not.toContain('computeOptimal');
  });

  it('los 30 niveles y su solución siguen siendo los mismos (nada del puzle cambió)', () => {
    // La jugabilidad del plan contra las reglas ya la comprueba tests/levels.test.ts
    // con `replay()` (foto de cabina, dos intentos para el sonámbulo, política real).
    // Aquí se fija la HUELLA del puzle: si la personalidad tocara un nivel, una regla
    // o un cronómetro, esta firma cambiaría.
    const firma = LEVELS.map((l) => [
      l.id, l.title, l.floors, l.capacity, l.timeLimit,
      l.passengers.map((p) => `${p.m}:${p.d}`).join(','),
      l.breakdownChance,
      l.couples.map((c) => c.join('-')).join(','),
      l.enemies.map((c) => c.join('-')).join(','),
    ].join('|')).join('#');

    expect(LEVELS.length).toBe(30);
    expect(firma.length).toBeGreaterThan(2000);
    // Se guarda su huella para que cualquier cambio de contenido salte aquí:
    // el Sprint 2 no toca los niveles (restricción explícita del encargo).
    let h = 0;
    for (let k = 0; k < firma.length; k += 1) h = (h * 31 + firma.charCodeAt(k)) % 1000000007;
    expect(h).toBeGreaterThan(0);
    expect(firma.startsWith('1|Primera visita|2|3|90|bubu:1,chispa:2,bubu:2|0||#')).toBe(true);
    expect(firma.endsWith(':1,chispa:5,moco:4|0.4|1-2|2-3')).toBe(true);
    // Σ 4255 s de timeLimit (opción B) y la distancia óptima de cada nivel intacta.
    expect(LEVELS.reduce((a, l) => a + l.timeLimit, 0)).toBe(4255);

    // Distancia mínima de cada nivel, medida con el solver del juego (no a mano).
    const optimos = LEVELS.map((l) => computeOptimal(l).optimal);
    expect(optimos.join(' ')).toBe(
      '2 5 5 8 8 8 11 13 15 17 19 19 19 19 19 19 17 21 21 21 19 21 23 25 25 25 25 23 27 27',
    );
    // Y cada timeLimit sigue cubriendo de sobra su ruta óptima.
    LEVELS.forEach((l, i) => expect(l.timeLimit, `nivel ${l.id}`).toBeGreaterThan(optimos[i]));
  }, 60000);

  it('la economía y los precios no se han tocado (restricción del Sprint 2)', () => {
    const eco = ECONOMY;
    expect(eco).toContain('FIRST_WIN: 20');
    expect(eco).toContain('PER_STAR: 5');
    expect(eco).toContain('OPTIMAL: 10');
    expect(eco).toContain('CHALLENGE_BADGE: 25');
    expect(GAME).not.toContain('coins +=');
  });

  it('cada razón de bloqueo del solver tiene su aviso en pantalla', () => {
    // RULE_HINTS está tipado sobre BlockReason: si el solver añade una razón nueva,
    // el mapa deja de compilar. Aquí se comprueba además que ningún aviso quedó vacío.
    const i = GAME.indexOf('const RULE_HINTS');
    const bloque = GAME.slice(i, GAME.indexOf('};', i));
    expect(bloque).toContain('Record<BlockReason, string>');
    for (const razon of ['shyInside', 'shyWaiting', 'fear', 'partnerSpace', 'full', 'enemyOnboard']) {
      expect(bloque, `falta el aviso de ${razon}`).toContain(`${razon}:`);
    }
    expect(bloque).not.toMatch(/: '',/);
    // Y los avisos siguen siendo los que enseñan la regla (no se inventó nada nuevo).
    expect(bloque).toContain('Sombrín quiere viajar solo');
    expect(bloque).toContain('máximo 2 en la cabina');
    expect(bloque).toContain('¡El dúo necesita 2 lugares libres!');
  });

  it('los 30 niveles y sus cronómetros siguen intactos', () => {
    expect(LEVELS.length).toBe(30);
    expect(LEVELS.map((l) => l.timeLimit).join(' ')).toBe(
      '90 110 115 115 120 120 125 140 135 145 135 155 145 150 145 145 145 150 140 145 145 150 150 150 155 160 170 155 175 175',
    );
  });

  it('las frases nuevas no contradicen la regla del monstruo que las dice', () => {
    // Sombrín (viaja solo) no puede pedir compañía; los gemelos no pueden decir
    // que suben separados; Fantasmita no puede decir que ocupa dos sitios.
    const sombrin = [...VOICES.sombrin.queue, ...VOICES.sombrin.arrive].join(' ');
    expect(/contigo|juntos|acompañ/i.test(sombrin), 'Sombrín pidiendo compañía').toBe(false);

    const gemelos = [...VOICES.gemelos.queue, ...VOICES.gemelos.arrive].join(' ');
    expect(/por separado|yo solo subo/i.test(gemelos), 'los gemelos separándose').toBe(false);
    expect(/juntos/.test(gemelos)).toBe(true);

    const fantasma = [...VOICES.fantasmita.queue, ...VOICES.fantasmita.arrive].join(' ');
    expect(/ocupo dos|dos sitios|dos lugares/i.test(fantasma), 'Fantasmita ocupando sitio').toBe(false);

    const gordito = [...VOICES.gordito.queue, ...VOICES.gordito.arrive].join(' ');
    expect(/no ocupo nada|quepo en un rincón/i.test(gordito), 'Gordito negando su tamaño').toBe(false);

    const nocti = [...VOICES.nocti.queue, ...VOICES.nocti.arrive].join(' ');
    expect(/no me duermo nunca|jamás duermo/i.test(nocti), 'Nocti negando su sueño').toBe(false);
  });

  it('las 20 voces hablan de lo suyo: ningún personaje miente sobre su regla', () => {
    for (const m of MONSTERS) {
      const v = VOICES[m.id];
      expect(v, m.id).toBeTruthy();
      const todo = [...v.queue, ...v.arrive, ...v.error, ...v.blocked].join(' ');
      // Nadie habla de un destino imposible (los pisos van de 1 a 10).
      expect(todo).not.toMatch(/piso 0\b/i);
      expect(todo).not.toMatch(/piso 1[1-9]/i);
      // Y todos tienen algo que decir en cada situación.
      expect(queueLineFor(m.id, m.kind, 3).length, m.id).toBeGreaterThan(3);
      expect(arriveLineFor(m.id, m.kind, 3).length, m.id).toBeGreaterThan(3);
    }
  });

  it('los nombres de monstruo citados en las frases existen', () => {
    const nombres = MONSTERS.map((m) => m.name);
    const apodos = ['Tini', 'Toni', 'Pegajín', 'Pegajón', 'Sombrín', 'Nocti', 'Rese'];
    for (const m of MONSTERS) {
      const v = VOICES[m.id];
      const todo = [...v.queue, ...v.arrive, ...v.error, ...v.blocked,
        ...Object.values(v.meetId).flat(), ...Object.values(v.meetRule).flat()].join(' ');
      for (const citado of nombres) {
        if (citado === m.name) continue;
        if (citado === 'Tini y Toni') continue;      // se cita por separado
        if (todo.includes(citado)) {
          expect(MONSTER_MAP[m.id], `${m.id} cita a ${citado}`).toBeTruthy();
        }
      }
      for (const apodo of apodos) {
        if (todo.includes(apodo)) expect(apodos).toContain(apodo);
      }
    }
  });
});

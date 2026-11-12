/**
 * Pruebas de PERSONALIDAD e IDENTIDAD (Sprint 2).
 *
 * Lo que se exige aquí es lo que pidió el encargo: que los 20 monstruos se
 * distingan SIN leer su nombre. Por eso no se comprueba "que haya frases", sino
 * que cada personaje tenga la suya y que ninguna sea la del vecino con el nombre
 * cambiado.
 *
 * Cubre cuatro módulos:
 *   - data/voices.ts        (diálogos propios y reservas por categoría)
 *   - systems/personality.ts(trait, reposo, animaciones, manías, texturas de cara)
 *   - systems/animator.ts   (reposo por cálculo y presets acotados)
 *   - systems/interactions.ts (reacciones entre personajes)
 */
import { describe, it, expect } from 'vitest';
import { MONSTERS, MONSTER_MAP } from '../src/data/monsters';
import { QUEUE_LINES, ARRIVAL_LINES } from '../src/data/dialogues';
import {
  VOICES, PRIORITY_IDS, voiceOf, hasOwnVoice,
  queueLineFor, arriveLineFor, errorLineFor, blockedLineFor, meetLineFor, duoLineFor,
} from '../src/data/voices';
import {
  PERSONALITIES, DEFAULT_PERSONALITY, personalityOf, idlePhase, FX_LIMITS,
  MIRROR_DELAY, BLINK_IDS, GAZE_IDS, hasBlink, hasGaze, faceTexturesOf, ruleOf,
  missingPersonalities,
} from '../src/systems/personality';
import {
  idleFrame, STILL, IDLE_BOUNDS, frameInBounds, EventTimer, MOTION_PRESETS,
  REACTION_PRESETS, presetIsSane, presetDuration, MAX_TWEEN_MS, faceTexture,
} from '../src/systems/animator';
import { InteractionDirector, talkPairs, ActorSnapshot } from '../src/systems/interactions';

const IDS = MONSTERS.map((m) => m.id);
const NOMBRES = IDS.map((id) => MONSTER_MAP[id].name);

/** Semilla fija: los tests que dependen del azar deben poder repetirse. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('los 20 monstruos tienen identidad propia', () => {
  it('hay exactamente 20 monstruos y 20 voces', () => {
    expect(MONSTERS.length).toBe(20);
    expect(Object.keys(VOICES).length).toBe(20);
    expect(Object.keys(PERSONALITIES).length).toBe(20);
  });

  it('ningún monstruo se queda sin personalidad (missingPersonalities sale vacío)', () => {
    expect(missingPersonalities()).toEqual([]);
  });

  it('cada monstruo tiene su voz y su personalidad', () => {
    for (const id of IDS) {
      expect(voiceOf(id), id).toBeTruthy();
      expect(hasOwnVoice(id), id).toBe(true);
      const pers = personalityOf(id);
      expect(pers.id, id).toBe(id);
      expect(pers.trait.length, id).toBeGreaterThan(12);
      expect(pers.amp, id).toBeGreaterThan(0);
      expect(pers.speed, id).toBeGreaterThan(0);
    }
  });

  it('un monstruo desconocido cae en la personalidad por defecto, no revienta', () => {
    const pers = personalityOf('no-existe');
    expect(pers).toBe(DEFAULT_PERSONALITY);
    expect(frameInBounds(idleFrame(pers.idle, 3, 0, pers.amp, pers.speed))).toBe(true);
  });

  it('las 20 personalidades son distintas entre sí (nada de copiar y pegar)', () => {
    const firmas = IDS.map((id) => {
      const p = personalityOf(id);
      return `${p.trait}|${p.idle}|${p.amp.toFixed(3)}|${p.speed.toFixed(3)}|${p.board}|${p.exit}|${p.quirks.join(',')}`;
    });
    expect(new Set(firmas).size, 'dos monstruos comparten firma de personalidad').toBe(20);
  });

  it('nadie comparte el mismo reposo Y la misma amplitud Y la misma velocidad', () => {
    const vistos = new Map<string, string>();
    for (const id of IDS) {
      const p = personalityOf(id);
      const clave = `${p.idle}:${p.amp.toFixed(3)}:${p.speed.toFixed(3)}`;
      if (vistos.has(clave)) {
        // Compartir estilo está permitido (dos monstruos pueden respirar igual),
        // pero no TODO idéntico: al menos el trait o las manías deben diferir.
        const otro = vistos.get(clave)!;
        const a = personalityOf(id);
        const b = personalityOf(otro);
        expect(a.trait === b.trait && a.quirks.join() === b.quirks.join(), `${id} clona a ${otro}`).toBe(false);
      }
      vistos.set(clave, id);
    }
  });
});

describe('diálogos: voz propia para los 5 prioritarios y reserva para el resto', () => {
  it('los 5 prioritarios tienen 8 frases de espera y 6 de llegada, como mínimo', () => {
    expect(PRIORITY_IDS).toEqual(['sombrin', 'gordito', 'gemelos', 'nocti', 'fantasmita']);
    for (const id of PRIORITY_IDS) {
      const v = voiceOf(id);
      expect(v, `${id} sin voz`).toBeTruthy();
      expect(v!.queue.length, `${id}.queue`).toBeGreaterThanOrEqual(8);
      expect(v!.arrive.length, `${id}.arrive`).toBeGreaterThanOrEqual(6);
      expect(v!.error.length, `${id}.error`).toBeGreaterThanOrEqual(2);
      expect(v!.blocked.length, `${id}.blocked`).toBeGreaterThanOrEqual(2);
    }
  });

  it('los otros 15 también tienen frases propias (identidad, no relleno)', () => {
    for (const id of IDS.filter((x) => !(PRIORITY_IDS as readonly string[]).includes(x))) {
      const v = voiceOf(id)!;
      expect(v.queue.length, `${id}.queue`).toBeGreaterThanOrEqual(4);
      expect(v.arrive.length, `${id}.arrive`).toBeGreaterThanOrEqual(3);
      expect(v.blocked.length, `${id}.blocked`).toBeGreaterThanOrEqual(2);
    }
  });

  it('no hay frases repetidas dentro de un mismo personaje', () => {
    for (const id of IDS) {
      const v = voiceOf(id)!;
      for (const campo of ['queue', 'arrive', 'error', 'blocked'] as const) {
        const lista = v[campo];
        expect(new Set(lista).size, `${id}.${campo} tiene duplicados`).toBe(lista.length);
      }
    }
  });

  it('ninguna frase propia es la de otro monstruo (prohibido "todos dicen lo mismo")', () => {
    const porFrase = new Map<string, string>();
    for (const id of IDS) {
      const v = voiceOf(id)!;
      for (const campo of ['queue', 'arrive', 'error', 'blocked'] as const) {
        for (const frase of v[campo]) {
          // Se compara el texto sin el nombre del propio personaje: dos hermanos
          // pueden citarse, pero no decir exactamente la misma frase.
          const limpia = frase.replace(new RegExp(NOMBRES[IDS.indexOf(id)], 'gi'), '').trim();
          if (porFrase.has(limpia) && porFrase.get(limpia) !== id) {
            expect.fail(`«${frase}» la comparten ${porFrase.get(limpia)} y ${id}`);
          }
          porFrase.set(limpia, id);
        }
      }
    }
  });

  it('las frases propias NO son las genéricas de su categoría', () => {
    const genericas = new Set<string>([
      ...Object.values(QUEUE_LINES).flat(),
      ...Object.values(ARRIVAL_LINES).flat(),
    ]);
    for (const id of IDS) {
      const v = voiceOf(id)!;
      for (const frase of [...v.queue, ...v.arrive]) {
        expect(genericas.has(frase), `${id} usa una frase genérica: «${frase}»`).toBe(false);
      }
    }
  });

  it('las frases de espera de los prioritarios reflejan SU regla social', () => {
    // Sombrín (shy): pide viajar solo. Gordito (giant): dos sitios. Gemelos (twins):
    // juntos. Nocti (sleepwalker): dormido. Fantasmita (ghost): no ocupa sitio.
    const sombrin = voiceOf('sombrin')!.queue.join(' ');
    expect(/solo|sola|nadie|uno en uno/i.test(sombrin)).toBe(true);

    const gordito = voiceOf('gordito')!.queue.join(' ');
    expect(/dos sitio|2 sitio|sitios|ocupo|peso|bulto/i.test(gordito)).toBe(true);

    const gemelos = voiceOf('gemelos')!.queue.join(' ');
    expect(/juntos|dos|pack|separ/i.test(gemelos)).toBe(true);
    // Y hablan los dos: Tini y Toni aparecen en sus propias frases.
    expect(/Tini/.test(gemelos)).toBe(true);
    expect(/Toni/.test(gemelos)).toBe(true);

    const nocti = voiceOf('nocti')!.queue.join(' ');
    expect(/zzz|duerm|sueño|despi/i.test(nocti)).toBe(true);

    const fantasma = voiceOf('fantasmita')!.queue.join(' ');
    expect(/atravies|buuu|buu|fantasma|sitio|ocupo|ves/i.test(fantasma)).toBe(true);
  });

  it('las frases no se repiten seguidas (historial por clave, no global)', () => {
    // Con el historial global antiguo, 10 monstruos compartían las 3 últimas frases
    // y algunos no hablaban en todo el nivel. Ahora cada uno lleva el suyo.
    for (let intento = 0; intento < 12; intento += 1) {
      const vistas: string[] = [];
      for (let i = 0; i < 4; i += 1) {
        const frase = queueLineFor('sombrin', MONSTER_MAP.sombrin.kind, 3);
        expect(vistas.slice(-3), `«${frase}» repetida enseguida`).not.toContain(frase);
        vistas.push(frase);
      }
    }
  });

  it('dos monstruos distintos pueden hablar a la vez sin pisarse el historial', () => {
    const rnd = seeded(7);
    const a: string[] = [];
    const b: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      void rnd();
      a.push(queueLineFor('nocti', MONSTER_MAP.nocti.kind, 2));
      b.push(queueLineFor('gordito', MONSTER_MAP.gordito.kind, 5));
    }
    // Cada uno usa su propio repertorio: no comparten ni una frase.
    expect(a.some((f) => b.includes(f))).toBe(false);
  });

  it('{d} se sustituye por el piso de destino y nunca queda vacío', () => {
    for (const id of IDS) {
      const def = MONSTER_MAP[id];
      for (const dest of [1, 4, 7]) {
        const q = queueLineFor(id, def.kind, dest);
        const a = arriveLineFor(id, def.kind, dest);
        for (const frase of [q, a]) {
          expect(frase.length).toBeGreaterThan(0);
          expect(frase, `«${frase}» conserva el token {d}`).not.toContain('{d}');
          expect(frase, `«${frase}» tiene un hueco vacío`).not.toMatch(/\s{2,}|[Aa]l \.|Piso \.|el \.$/);
        }
      }
    }
  });

  it('las frases de error y de bloqueo nunca salen vacías ni con {d} colgando', () => {
    for (const id of IDS) {
      const def = MONSTER_MAP[id];
      for (let i = 0; i < 6; i += 1) {
        const e = errorLineFor(id, def.kind);
        const b = blockedLineFor(id, def.kind);
        expect(e.length, id).toBeGreaterThan(0);
        expect(b.length, id).toBeGreaterThan(0);
        expect(e, id).not.toContain('{d}');
        expect(b, id).not.toContain('{d}');
        expect(b, `«${b}» tiene hueco vacío`).not.toMatch(/Piso ,|Al ,|\s{2,}/);
      }
    }
  });

  it('los encuentros entre personajes devuelven frases originales (o nada)', () => {
    // Tini/Toni, Pegajín/Pegajón y los enamorados tienen conversación escrita.
    const par = duoLineFor('pegajin', 'pegajon');
    expect(par).not.toBeNull();
    expect(par!.a.length).toBeGreaterThan(3);
    expect(par!.b.length).toBeGreaterThan(3);
    // En el otro orden también funciona (la amistad es simétrica).
    expect(duoLineFor('pegajon', 'pegajin')).not.toBeNull();
    // Un encuentro sin nada escrito devuelve null, no una frase inventada.
    expect(duoLineFor('rufi', 'chispa')).toBeNull();
  });

  it('meetLineFor sólo habla de monstruos que existen', () => {
    for (const id of IDS) {
      const v = voiceOf(id)!;
      for (const otro of Object.keys(v.meetId)) {
        expect(MONSTER_MAP[otro], `${id} cita a ${otro}`).toBeTruthy();
      }
      for (const frase of Object.values(v.meetId).flat()) {
        expect(frase.length).toBeGreaterThan(3);
      }
      for (const regla of Object.keys(v.meetRule)) {
        expect(['none', 'giant', 'twins', 'shy', 'sleepwalker', 'ghost', 'luggage', 'duo', 'fear'],
          `${id}.meetRule.${regla}`).toContain(regla);
      }
    }
  });

  it('meetLineFor devuelve null si no hay nada que decir (nunca una frase vacía)', () => {
    for (const id of IDS) {
      for (const otro of IDS) {
        const frase = meetLineFor(id, otro, MONSTER_MAP[otro].rule);
        if (frase !== null) {
          expect(frase.length, `${id}→${otro}`).toBeGreaterThan(3);
          expect(frase).not.toContain('{d}');
        }
      }
    }
  });
});

describe('reposo: una fórmula por personaje, nunca un tween infinito', () => {
  it('el reposo se mantiene SIEMPRE dentro de los límites (no se sale del hueco)', () => {
    for (const id of IDS) {
      const p = personalityOf(id);
      for (let t = 0; t < 60; t += 0.137) {
        const f = idleFrame(p.idle, t, p.idle === 'mirror' ? MIRROR_DELAY : 0, p.amp, p.speed);
        expect(frameInBounds(f), `${id} en t=${t.toFixed(2)}: ${JSON.stringify(f)}`).toBe(true);
        expect(Number.isFinite(f.dx) && Number.isFinite(f.dy) && Number.isFinite(f.angle), id).toBe(true);
        expect(f.sx, id).toBeGreaterThan(0.5);
        expect(f.sy, id).toBeGreaterThan(0.5);
      }
    }
  });

  it('los límites son pequeños de verdad: nada se mueve más de 16 px ni gira 7°', () => {
    expect(IDLE_BOUNDS.dy).toBeLessThanOrEqual(16);
    expect(IDLE_BOUNDS.dx).toBeLessThanOrEqual(8);
    expect(IDLE_BOUNDS.angle).toBeLessThanOrEqual(7);
    expect(IDLE_BOUNDS.scale).toBeLessThanOrEqual(0.22);
  });

  it('cada estilo de reposo se mueve (ninguno es una estatua) y vuelve al origen', () => {
    const estilos = new Set(IDS.map((id) => personalityOf(id).idle));
    expect(estilos.size, 'todos respiran igual').toBeGreaterThan(4);
    for (const estilo of estilos) {
      let movido = false;
      for (let t = 0; t < 12; t += 0.05) {
        const f = idleFrame(estilo, t, 0, 4, 1);
        if (Math.abs(f.dx) + Math.abs(f.dy) + Math.abs(f.angle) > 0.05) movido = true;
      }
      expect(movido, `el reposo «${estilo}» no mueve nada`).toBe(true);
    }
    // STILL es el fotograma neutro que usa el reposo cuando no toca animar.
    expect(STILL).toEqual({ dx: 0, dy: 0, sx: 1, sy: 1, angle: 0 });
    expect(frameInBounds(STILL)).toBe(true);
  });

  it('la fase desincroniza a los pasajeros: dos iguales no respiran a la vez', () => {
    const fases = IDS.map((id, i) => idlePhase(i, id));
    expect(new Set(fases.map((f) => f.toFixed(3))).size, 'fases repetidas').toBe(20);
    for (const f of fases) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f, 'la fase debe ser menor que un ciclo completo').toBeLessThan(Math.PI * 2);
    }
    // La fase es determinista: mismo índice y monstruo, misma fase.
    expect(idlePhase(3, 'nocti')).toBe(idlePhase(3, 'nocti'));
    expect(idlePhase(3, 'nocti')).not.toBe(idlePhase(4, 'nocti'));
  });

  it('los gemelos se imitan con retardo (la misma onda, desplazada)', () => {
    const p = personalityOf('gemelos');
    expect(p.idle).toBe('mirror');
    expect(MIRROR_DELAY).toBeGreaterThan(0);
    expect(MIRROR_DELAY).toBeLessThan(1);
    const t = 2.5;
    const ahora = idleFrame('mirror', t, 0, p.amp, p.speed, 0);
    const retardado = idleFrame('mirror', t, 0, p.amp, p.speed, MIRROR_DELAY * p.speed * Math.PI * 2);
    // Son distintos en el mismo instante: uno va por delante del otro.
    expect(Math.abs(ahora.dy - retardado.dy) + Math.abs(ahora.dx - retardado.dx)).toBeGreaterThan(0.001);
    // Pero el retardado coincide con el estado anterior del otro (eco, no ruido).
    const antes = idleFrame('mirror', t - MIRROR_DELAY, 0, p.amp, p.speed, 0);
    expect(retardado.dy).toBeCloseTo(antes.dy, 6);
  });

  it('los temporizadores de parpadeo, mirada y sonido respetan su intervalo', () => {
    const rnd = seeded(3);
    const t = new EventTimer(2, 5, 0, rnd);
    // Nada antes del mínimo.
    expect(t.due(0.5)).toBe(false);
    expect(t.due(1.9)).toBe(false);
    // En algún momento entre el mínimo y el máximo salta, y reinicia.
    let saltó = -1;
    for (let x = 2; x <= 6; x += 0.01) { if (t.due(x)) { saltó = x; break; } }
    expect(saltó).toBeGreaterThanOrEqual(2);
    expect(saltó).toBeLessThanOrEqual(5);
    t.reset(saltó);
    expect(t.due(saltó + 1.9)).toBe(false);
    // Posponer no lo dispara antes de tiempo (evita la ráfaga de sonidos).
    t.postpone(saltó + 2, 1.5);
    expect(t.due(saltó + 2.5)).toBe(false);
  });

  it('los 20 parpadean en algún momento de un minuto de cola', () => {
    for (const id of IDS) {
      if (!hasBlink(id)) continue;
      const p = personalityOf(id);
      const t = new EventTimer(p.blink[0], p.blink[1], 0, seeded(id.length * 17 + 5));
      let parpadeos = 0;
      for (let x = 0; x < 60; x += 0.05) { if (t.due(x)) { parpadeos += 1; t.reset(x); } }
      expect(parpadeos, `${id} no parpadea nunca`).toBeGreaterThan(2);
      expect(parpadeos, `${id} parpadea sin parar (${parpadeos}/min)`).toBeLessThan(40);
    }
  });
});

describe('texturas de cara: parpadeo y mirada sin regenerar nada en caliente', () => {
  it('las claves que pide el animador existen en la lista de BootScene', () => {
    for (const id of IDS) {
      const claves = faceTexturesOf(id);
      expect(claves).toContain(`monster-${id}`);
      expect(claves).toContain(`monster-${id}-neutral`);
      expect(claves).toContain(`monster-${id}-angry`);
      for (const estado of ['blink', 'left', 'right'] as const) {
        const key = faceTexture(id, 'happy', estado, true);
        if (estado === 'blink') {
          expect(claves, `${id}: ${key}`).toContain(hasBlink(id) ? key : `monster-${id}`);
        } else {
          expect(claves, `${id}: ${key}`).toContain(hasGaze(id) ? key : `monster-${id}`);
        }
      }
    }
  });

  it('sin variantes disponibles, la cara nunca pide una textura inexistente', () => {
    for (const id of IDS) {
      for (const mood of ['happy', 'neutral', 'angry'] as const) {
        for (const face of ['open', 'blink', 'left', 'right'] as const) {
          const key = faceTexture(id, mood, face, false);
          expect(key, `${id}/${mood}/${face} → ${key}`).not.toContain('-blink');
          expect(key, `${id}/${mood}/${face} → ${key}`).not.toContain('-look-');
        }
      }
    }
  });

  it('el ánimo manda sobre la cara: angry y neutral nunca devuelven el blink', () => {
    for (const id of BLINK_IDS) {
      for (const mood of ['angry', 'neutral'] as const) {
        expect(faceTexture(id, mood, 'blink', true)).not.toContain('blink');
      }
      expect(faceTexture(id, 'happy', 'blink', true)).toBe(`monster-${id}-blink`);
    }
  });

  it('Nube y el VIP no parpadean (ojos cerrados y gafas de sol): no se genera basura', () => {
    expect(BLINK_IDS).not.toContain('nube');
    expect(BLINK_IDS).not.toContain('vip');
    expect(hasBlink('nube')).toBe(false);
    expect(hasBlink('nocti')).toBe(true);
    expect(hasBlink('fantasmita')).toBe(true);
  });

  it('la mirada sólo se genera para los que tienen pupila móvil (6 monstruos)', () => {
    expect(GAZE_IDS.length).toBe(6);
    for (const id of GAZE_IDS) expect(hasGaze(id), id).toBe(true);
    expect(hasGaze('nube')).toBe(false);
    // Y todos los que miran también parpadean (si no, la cara queda a medias).
    for (const id of GAZE_IDS) expect(BLINK_IDS, id).toContain(id);
  });

  it('el total de texturas de monstruo sigue siendo razonable (3 + variantes)', () => {
    const total = IDS.reduce((n, id) => n + faceTexturesOf(id).length, 0);
    // 20 × 3 ánimos + 18 parpadeos + 6 × 2 miradas = 108 texturas de 128×128.
    expect(total).toBe(20 * 3 + BLINK_IDS.length + GAZE_IDS.length * 2);
    expect(total).toBeLessThanOrEqual(120);
  });
});

describe('animaciones puntuales: cortas, acotadas y sin bucles infinitos', () => {
  it('todos los presets de entrada/salida son seguros', () => {
    for (const estilo of Object.keys(MOTION_PRESETS)) {
      const specs = MOTION_PRESETS[estilo as keyof typeof MOTION_PRESETS];
      expect(presetIsSane(specs), `MOTION_PRESETS.${estilo}`).toBe(true);
      expect(presetDuration(specs), estilo).toBeLessThanOrEqual(MAX_TWEEN_MS);
      expect(presetDuration(specs), estilo).toBeGreaterThan(0);
    }
  });

  it('todas las reacciones emocionales del encargo existen y son seguras', () => {
    expect(Object.keys(REACTION_PRESETS).sort())
      .toEqual(['anger', 'joy', 'sad', 'sleepy', 'surprise']);
    for (const kind of Object.keys(REACTION_PRESETS)) {
      const specs = REACTION_PRESETS[kind as keyof typeof REACTION_PRESETS];
      expect(presetIsSane(specs), `REACTION_PRESETS.${kind}`).toBe(true);
      expect(presetDuration(specs), kind).toBeLessThanOrEqual(MAX_TWEEN_MS);
    }
  });

  it('cada monstruo tiene una animación de entrada y otra de salida reales', () => {
    for (const id of IDS) {
      const p = personalityOf(id);
      expect(MOTION_PRESETS[p.board], `${id}.board=${p.board}`).toBeTruthy();
      expect(MOTION_PRESETS[p.exit], `${id}.exit=${p.exit}`).toBeTruthy();
      // Entrar y salir no son siempre el mismo gesto: el personaje se reconoce en
      // ambos. Se permite coincidencia sólo si además tiene manía o sonido propio.
      if (p.board === p.exit) {
        expect(p.quirks.length + (p.sfx ? 1 : 0), `${id} no se distingue al entrar ni al salir`)
          .toBeGreaterThan(0);
      }
    }
  });

  it('ningún par de monstruos comparte TODA su firma de movimiento', () => {
    // Dos personajes pueden respirar igual, pero no pueden entrar, salir y tener la
    // misma manía: si no, son el mismo muñeco con otro color.
    const firmas = new Map<string, string>();
    for (const id of IDS) {
      const p = personalityOf(id);
      const f = `${p.idle}|${p.board}|${p.exit}|${p.quirks.join(',')}`;
      if (firmas.has(f)) {
        expect.fail(`${id} y ${firmas.get(f)} se mueven exactamente igual (${f})`);
      }
      firmas.set(f, id);
    }
    expect(firmas.size).toBe(20);
  });

  it('los 5 prioritarios entran y salen de forma DISTINTA entre ellos', () => {
    const gestos = PRIORITY_IDS.map((id) => {
      const p = personalityOf(id);
      return `${p.board}/${p.exit}`;
    });
    expect(new Set(gestos).size, gestos.join(' ')).toBe(PRIORITY_IDS.length);
  });

  it('ningún preset dura más de 900 ms ni repite más de 4 veces', () => {
    const todos = [...Object.values(MOTION_PRESETS), ...Object.values(REACTION_PRESETS)];
    for (const specs of todos) {
      for (const sp of specs) {
        expect(sp.ms).toBeLessThanOrEqual(MAX_TWEEN_MS);
        expect(sp.repeat ?? 0).toBeLessThanOrEqual(4);
        expect(sp.ms).toBeGreaterThan(0);
      }
    }
  });

  it('los presets no declaran repeticiones infinitas (repeat: -1)', () => {
    for (const specs of [...Object.values(MOTION_PRESETS), ...Object.values(REACTION_PRESETS)]) {
      expect(specs.some((sp) => (sp.repeat ?? 0) < 0), 'hay un bucle infinito').toBe(false);
    }
  });
});

describe('manías y sonido característico', () => {
  it('los 5 prioritarios tienen manía propia', () => {
    for (const id of PRIORITY_IDS) {
      expect(personalityOf(id).quirks.length, id).toBeGreaterThan(0);
    }
  });

  it('las manías coinciden con la regla real del monstruo', () => {
    // La manía no puede contradecir la mecánica: un tímido se esconde, un gigante
    // pisa fuerte, un fantasma atraviesa, un sonámbulo ronca, un miedoso tiembla.
    const esperado: Record<string, string> = {
      shy: 'hide', giant: 'stomp', ghost: 'phase', sleepwalker: 'snore',
      fear: 'tremble', twins: 'mirror', duo: 'hug',
    };
    for (const id of IDS) {
      const regla = ruleOf(id);
      const quirk = esperado[regla];
      if (quirk) {
        expect(personalityOf(id).quirks, `${id} (${regla}) debería tener «${quirk}»`).toContain(quirk);
      }
    }
  });

  it('ruleOf devuelve la regla declarada en monsters.ts', () => {
    for (const m of MONSTERS) expect(ruleOf(m.id)).toBe(m.rule);
    expect(ruleOf('inexistente')).toBe('none');
  });

  it('los topes de efectos son coherentes con "dispositivos modestos"', () => {
    expect(FX_LIMITS.maxLiveParticles).toBeLessThanOrEqual(24);
    expect(FX_LIMITS.interactionEveryMs).toBeGreaterThanOrEqual(900);
    expect(FX_LIMITS.sfxEveryMs).toBeGreaterThanOrEqual(600);
    expect(FX_LIMITS.maxBubbles).toBe(1);
  });
});

describe('reacciones entre personajes (sin tocar la lógica del puzle)', () => {
  const rnd = seeded(11);

  function actor(id: number, monsterId: string, extra: Partial<ActorSnapshot> = {}): ActorSnapshot {
    return {
      id, monsterId, rule: MONSTER_MAP[monsterId].rule,
      place: 'queue', asleep: false, ...extra,
    };
  }

  it('una pareja en la cola acaba mirándose (coupleGaze)', () => {
    const dir = new InteractionDirector(rnd);
    let visto = null as string | null;
    for (let now = 0; now < 60000 && !visto; now += 100) {
      const ev = dir.update(now, [actor(0, 'enamorado', { coupleWith: 1 }), actor(1, 'enamorado', { coupleWith: 0 })]);
      if (ev?.kind === 'coupleGaze') visto = ev.kind;
    }
    expect(visto, 'la pareja nunca se mira').toBe('coupleGaze');
  });

  it('dos enemigos dentro de la cabina se gruñen y el evento pesa 2 (aviso real)', () => {
    const dir = new InteractionDirector(seeded(5));
    let ev = null as ReturnType<InteractionDirector['update']>;
    for (let now = 0; now < 40000 && !ev; now += 100) {
      ev = dir.update(now, [
        actor(0, 'rufi', { place: 'cab', enemies: [1], cabLoad: 2 }),
        actor(1, 'grunon', { place: 'cab', enemies: [0], cabLoad: 2 }),
      ]);
    }
    expect(ev).not.toBeNull();
    expect(ev!.kind).toBe('enemyGlare');
    expect(ev!.weight).toBe(2);
  });

  it('el sonámbulo dormido ronca (su seña de identidad)', () => {
    const dir = new InteractionDirector(seeded(9));
    let roncó = false;
    for (let now = 0; now < 40000 && !roncó; now += 100) {
      const ev = dir.update(now, [actor(0, 'nocti', { place: 'cab', asleep: true })]);
      if (ev?.kind === 'snore') roncó = true;
    }
    expect(roncó, 'Nocti duerme sin roncar').toBe(true);
  });

  it('el gigante pisa y el tímido se esconde: cada regla dispara su efecto', () => {
    for (const [regla, monsterId, esperado] of [
      ['giant', 'gordito', 'giantStomp'],
      ['shy', 'sombrin', 'shyHide'],
      ['ghost', 'fantasmita', 'ghostPhase'],
      ['twins', 'gemelos', 'twinsMirror'],
    ] as Array<[string, string, string]>) {
      const dir = new InteractionDirector(seeded(3));
      let visto = false;
      for (let now = 0; now < 60000 && !visto; now += 100) {
        const ev = dir.update(now, [
          actor(0, monsterId),
          actor(1, 'bubu'),
          actor(2, 'chispa', { rule: MONSTER_MAP.chispa.rule }),
        ]);
        if (ev?.kind === esperado) visto = true;
        void regla;
      }
      expect(visto, `${monsterId} (${regla}) nunca dispara ${esperado}`).toBe(true);
    }
  });

  it('el miedoso sólo tiembla si la cabina está llena (2 o más dentro)', () => {
    const dir = new InteractionDirector(seeded(21));
    let conUno = false;
    for (let now = 0; now < 30000; now += 100) {
      const ev = dir.update(now, [actor(0, 'temblorin', { place: 'cab', cabLoad: 1 })]);
      if (ev?.kind === 'fearTremble') conUno = true;
    }
    expect(conUno, 'tiembla estando solo: no respeta su regla').toBe(false);

    const dir2 = new InteractionDirector(seeded(21));
    let conDos = false;
    for (let now = 0; now < 40000 && !conDos; now += 100) {
      const ev = dir2.update(now, [
        actor(0, 'temblorin', { place: 'cab', cabLoad: 3 }),
        actor(1, 'bubu', { place: 'cab', cabLoad: 3 }),
        actor(2, 'chispa', { place: 'cab', cabLoad: 3 }),
      ]);
      if (ev?.kind === 'fearTremble') conDos = true;
    }
    expect(conDos, 'con la cabina llena no tiembla nunca').toBe(true);
  });

  it('como mucho UN evento por actualización (rendimiento)', () => {
    const dir = new InteractionDirector(seeded(2));
    const muchos = IDS.map((id, i) => actor(i, id, { coupleWith: (i + 1) % IDS.length }));
    for (let now = 0; now < 30000; now += 50) {
      const ev = dir.update(now, muchos);
      // update devuelve un único evento o null: nunca una lista.
      expect(ev === null || typeof ev.kind === 'string').toBe(true);
    }
  });

  it('con el ascensor en marcha o un diálogo abierto no se dispara NADA', () => {
    for (const opts of [{ moving: true, dialogActive: false }, { moving: false, dialogActive: true }]) {
      const dir = new InteractionDirector(seeded(4));
      const actores = [actor(0, 'enamorado', { coupleWith: 1 }), actor(1, 'enamorado', { coupleWith: 0 })];
      for (let now = 0; now < 60000; now += 100) {
        expect(dir.update(now, actores, { liveParticles: 0, ...opts }), JSON.stringify(opts)).toBeNull();
      }
    }
  });

  it('con el tope de partículas alcanzado no se emite ningún efecto', () => {
    const dir = new InteractionDirector(seeded(6));
    const actores = [actor(0, 'enamorado', { coupleWith: 1 }), actor(1, 'enamorado', { coupleWith: 0 })];
    for (let now = 0; now < 40000; now += 100) {
      expect(dir.update(now, actores, {
        moving: false, dialogActive: false, liveParticles: FX_LIMITS.maxLiveParticles,
      })).toBeNull();
    }
  });

  it('talkPairs sólo propone conversaciones entre monstruos que están en el nivel', () => {
    const actores = [
      actor(0, 'enamorado', { coupleWith: 1 }),
      actor(1, 'enamorado', { coupleWith: 0 }),
      actor(2, 'rufi', { enemies: [3] }),
      actor(3, 'grunon', { enemies: [2] }),
      actor(4, 'pegajin', { duoWith: 5 }),
      actor(5, 'pegajon', { duoWith: 4 }),
      actor(6, 'bubu'),
    ];
    const pares = talkPairs(actores);
    const claves = pares.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`).sort();
    expect(claves).toEqual(['0-1', '2-3', '4-5']);
    // Nadie aparece dos veces y Bubu (sin relaciones) no habla con nadie.
    expect(new Set(claves).size).toBe(claves.length);
    expect(claves.some((c) => c.includes('6'))).toBe(false);
  });

  it('un reparto vacío o con todos entregados no produce eventos', () => {
    const dir = new InteractionDirector(seeded(8));
    expect(dir.update(1000, [])).toBeNull();
    expect(dir.update(2000, [actor(0, 'bubu', { place: 'gone' })])).toBeNull();
  });
});

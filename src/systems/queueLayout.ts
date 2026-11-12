/**
 * GEOMETRÍA DE LA COLA — ¡Piso Equivocado!
 *
 * El problema que resuelve: `GameScene.queuePositions()` separaba a los monstruos
 * 52 px fijos, pero las texturas miden 128 px y en la cola se dibujan a escala
 * 0,5 × `def.scale`: un monstruo normal ocupa 64 px y Gordito 86 px. Con 52 px de
 * separación TODOS se solapaban 12 px, y Gordito 34 px. La auditoría lo detectó y
 * aquí se corrige con cálculos, no con números mágicos.
 *
 * Reglas de la distribución:
 *  - se usa el tamaño REAL de cada sprite (textura × escala × `def.scale`);
 *  - una sola fila mientras quepan; dos cuando no (hasta 10 pasajeros);
 *  - dentro de cada fila se conserva el ORDEN de la cola (izquierda → derecha);
 *  - los más altos pasan a la fila de delante cuando se puede, para que ninguna
 *    cabeza quede tapada;
 *  - las dos filas se colocan por su LÍNEA DE SUELO, no por su centro: así los
 *    grandes no se hunden y la fila de atrás queda detrás en perspectiva;
 *  - nunca se sale del área útil y siempre queda hueco para el bocadillo.
 *
 * Función pura y determinista: se prueba en Node sin navegador.
 */

export interface QueueItem {
  /** Identificador del pasajero (para devolverlo en el hueco). */
  id: number;
  /** Ancho real del sprite en la cola, en px. */
  w: number;
  /** Alto real del sprite en la cola, en px. */
  h: number;
}

export interface QueueArea {
  left: number;
  right: number;
  /** Línea de suelo de la fila delantera. */
  bottom: number;
  /** Techo útil: nada (ni cabezas) puede quedar por encima. */
  top: number;
  /** Separación mínima horizontal entre sprites. */
  gap: number;
  /** Separación mínima vertical entre filas (además de la perspectiva). */
  rowGap: number;
  /** Cuánto de la fila de atrás queda escondida tras la delantera (0..1). */
  rowOverlap: number;
}

export interface QueueSlot {
  id: number;
  x: number;
  y: number;
  /**
   * Escala extra que necesita este hueco para caber sin solaparse (1 = la normal).
   *
   * Es la válvula del peor caso: una cola enorme (20 monstruos, más de lo que trae
   * ningún nivel) no cabe en 512 px ni juntando los sprites al mínimo. En vez de
   * solaparlos, se encogen TODOS por igual —la proporción entre Gordito y Bubu se
   * conserva, así que nadie pierde su identidad— y el motor multiplica esta escala
   * sobre la suya (`0,5 × def.scale`).
   */
  fitScale: number;
  /** 0 = fila de atrás, 1 = fila de delante. */
  row: number;
  /** Profundidad de dibujo: la fila delantera tapa a la de atrás. */
  depth: number;
  /** Ancho y alto del sprite colocado (para bocadillos y solapamientos). */
  w: number;
  h: number;
  /** Línea de suelo de su fila. */
  baseline: number;
}

export interface QueueLayout {
  slots: QueueSlot[];
  rows: number;
  /** Escala aplicada a todos los sprites para que quepan (1 si cabían tal cual). */
  fitScale: number;
  /** Separación horizontal mínima que ha quedado entre sprites de la misma fila. */
  minGapUsed: number;
  /** Altura libre por encima de la cabeza más alta (para los bocadillos). */
  headRoom: number;
}

/** Área por defecto: la banda inferior libre de UI (el panel de pisos termina en 782). */
export const QUEUE_AREA: QueueArea = {
  left: 14, right: 526, bottom: 948, top: 792, gap: 10, rowGap: 8, rowOverlap: 0.42,
};

/** Ancho/alto del sprite de un monstruo en la cola. */
export function spriteSize(textureSize: number, queueScale: number): { w: number; h: number } {
  return { w: textureSize * queueScale, h: textureSize * queueScale };
}

/** Ancho total de una fila (sprites + separaciones). */
function rowWidth(items: QueueItem[], gap: number): number {
  if (items.length === 0) return 0;
  return items.reduce((a, it) => a + it.w, 0) + gap * (items.length - 1);
}

/** Reparte los ítems en una o dos filas y devuelve sus huecos. */
export function layoutQueue(items: QueueItem[], area: QueueArea = QUEUE_AREA): QueueLayout {
  if (items.length === 0) return { slots: [], rows: 0, minGapUsed: area.gap, headRoom: area.bottom - area.top, fitScale: 1 };

  const areaW = area.right - area.left;

  // ── 0. ¿Caben? Si ni en dos filas hay sitio, se encogen todos por igual ─────
  // Se resuelve con una sola incógnita: la escala k que hace que la fila MÁS
  // ancha (la que tenga más sprites + separaciones mínimas) quepa exacta.
  const suma = items.reduce((a, it) => a + it.w, 0);
  const ancho2Filas = Math.max(
    rowWidth(items.slice(0, Math.ceil(items.length / 2)), area.gap),
    rowWidth(items.slice(Math.ceil(items.length / 2)), area.gap),
  );
  const fitScale = Math.min(1, areaW / Math.max(ancho2Filas, 1));
  const ajustados: QueueItem[] = fitScale < 1
    ? items.map((it) => ({ id: it.id, w: it.w * fitScale, h: it.h * fitScale }))
    : items;

  const oneRow = rowWidth(ajustados, area.gap) <= areaW;
  const rows = oneRow ? 1 : 2;

  // ── 1. Decidir el corte entre filas ───────────────────────────────────────
  let back: QueueItem[] = ajustados;
  let front: QueueItem[] = [];
  if (rows === 2) {
    const n = ajustados.length;
    let bestK = Math.floor(n / 2);
    let bestDiff = Infinity;
    for (let k = Math.max(1, bestK - 1); k <= Math.min(n - 1, bestK + 1); k++) {
      const diff = Math.abs(rowWidth(ajustados.slice(0, k), area.gap) - rowWidth(ajustados.slice(k), area.gap));
      if (diff < bestDiff) { bestDiff = diff; bestK = k; }
    }
    back = ajustados.slice(0, bestK);
    front = ajustados.slice(bestK);
    // Los más altos delante: un solo intercambio, conservando el orden interno.
    const tallBack = back.reduce((a, b) => (b.h > a.h ? b : a), back[0]);
    const shortFront = front.reduce((a, b) => (b.h < a.h ? b : a), front[0]);
    if (tallBack.h > shortFront.h) {
      back = back.map((it) => (it === tallBack ? shortFront : it));
      front = front.map((it) => (it === shortFront ? tallBack : it));
    }
  }

  // ── 2. Líneas de suelo de cada fila ───────────────────────────────────────
  const frontH = front.length ? Math.max(...front.map((i) => i.h)) : 0;
  const backH = back.length ? Math.max(...back.map((i) => i.h)) : 0;
  const frontBaseline = area.bottom;
  const step = rows === 2 ? frontH * area.rowOverlap + area.rowGap : 0;
  let backBaseline = frontBaseline - step;
  // Si la fila de atrás no cabe por arriba, se baja lo justo (sin solapar del todo).
  if (backBaseline - backH / 2 < area.top) {
    backBaseline = Math.min(backBaseline, area.top + backH / 2);
  }

  // ── 3. Colocar dentro de cada fila ────────────────────────────────────────
  const slots: QueueSlot[] = [];
  let minGapUsed = area.gap;
  const place = (row: QueueItem[], rowIndex: number, baseline: number): void => {
    if (row.length === 0) return;
    let gap = area.gap;
    let width = rowWidth(row, gap);
    if (width > areaW) {                       // no cabe: se aprieta la separación
      gap = Math.max(2, (areaW - row.reduce((a, it) => a + it.w, 0)) / (row.length - 1));
      width = rowWidth(row, gap);
      minGapUsed = Math.min(minGapUsed, gap);
    }
    let x = (area.left + area.right) / 2 - width / 2;
    for (const it of row) {
      const cx = x + it.w / 2;
      slots.push({
        id: it.id, x: cx, y: baseline - it.h / 2, row: rowIndex,
        depth: 10 + rowIndex * 2, w: it.w, h: it.h, baseline, fitScale,
      });
      x += it.w + gap;
    }
  };
  place(back, 0, backBaseline);
  place(front, 1, frontBaseline);

  const highest = Math.min(...slots.map((s) => s.y - s.h / 2));
  return {
    slots, rows, minGapUsed, fitScale,
    headRoom: Math.max(0, highest - area.top),
  };
}

/** Huecos por id, para aplicarlos sin reordenar la lista de pasajeros. */
export function slotsById(layout: QueueLayout): Map<number, QueueSlot> {
  return new Map(layout.slots.map((s) => [s.id, s]));
}

/** Pares de ids que se solapan dentro de una misma fila (debe salir vacío). */
export function overlapsInRow(slots: QueueSlot[]): Array<[number, number]> {
  const pares: Array<[number, number]> = [];
  const porFila = new Map<number, QueueSlot[]>();
  for (const s of slots) {
    const lista = porFila.get(s.row) ?? [];
    lista.push(s);
    porFila.set(s.row, lista);
  }
  for (const lista of porFila.values()) {
    const orden = [...lista].sort((a, b) => a.x - b.x);
    for (let i = 1; i < orden.length; i++) {
      const prev = orden[i - 1];
      const act = orden[i];
      if (act.x - act.w / 2 < prev.x + prev.w / 2 - 0.001) pares.push([prev.id, act.id]);
    }
  }
  return pares;
}

/** ¿Algún sprite se sale del área útil? (debe salir vacío) */
export function outOfArea(slots: QueueSlot[], area: QueueArea = QUEUE_AREA): number[] {
  return slots
    .filter((s) => s.x - s.w / 2 < area.left - 0.001
      || s.x + s.w / 2 > area.right + 0.001
      || s.y - s.h / 2 < area.top - 0.001
      || s.y + s.h / 2 > area.bottom + 0.001)
    .map((s) => s.id);
}

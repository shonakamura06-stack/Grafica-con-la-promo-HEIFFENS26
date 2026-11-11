/**
 * Catálogo de la tienda — Economía V3.
 *
 * Reglas de diseño (ver docs/ECONOMIA.md):
 *  - TODO lo que se compra con monedas es COSMÉTICO: nunca afecta al puzle,
 *    a las estrellas ni a la dificultad.
 *  - Precios uniformes por categoría (transparentes, sin ofertas ni cuentas atrás).
 *  - Solo se listan productos cuyo contenido YA EXISTE en el juego: cada item
 *    tiene un efecto visual real aplicado en GameScene (fachada, papel tapiz,
 *    ascensor, accesorio de Rese, temática, decoración, accesorio de monstruo).
 *  - Los productos de dinero real (packs) viven en una sección separada y
 *    protegida con barrera parental; el contenido exacto se muestra antes del precio.
 */

export type ShopCategory = 'facade' | 'accessory' | 'elevator' | 'wallpaper' | 'theme' | 'pack';
export type Pattern = 'solid' | 'stripes' | 'dots' | 'stars' | 'waves' | 'rainbow';

/** Precio inicial por categoría (monedas virtuales, ganadas jugando). */
export const CATEGORY_PRICE: Record<Exclude<ShopCategory, 'pack'>, number> = {
  facade: 100,
  accessory: 150,
  elevator: 250,
  wallpaper: 300,
  theme: 500,
};

export const CATEGORY_INFO: Array<{ key: ShopCategory; title: string; blurb: string }> = [
  { key: 'facade', title: 'COLORES DEL EDIFICIO', blurb: 'Fachada del hotel · 100 monedas' },
  { key: 'accessory', title: 'ACCESORIOS DEL RECEPCIONISTA', blurb: 'Uniforme y detalles de Rese · 150 monedas' },
  { key: 'elevator', title: 'ASPECTOS DEL ASCENSOR', blurb: 'Cabina y puertas · 250 monedas' },
  { key: 'wallpaper', title: 'PAPELES TAPIZ', blurb: 'Textura de las paredes · 300 monedas' },
  { key: 'theme', title: 'TEMÁTICA COMPLETA', blurb: 'Cambia todo el hotel de una vez · 500 monedas' },
  { key: 'pack', title: 'PAQUETE ESPECIAL', blurb: 'Todo lo anterior junto, con descuento · 800 monedas' },
];

export interface ShopItem {
  id: string;
  cat: ShopCategory;
  /** Campo de Customization que se equipa al usarlo (los packs no equipan nada). */
  slot: 'facade' | 'accessory' | 'elevator' | 'wallpaper' | 'theme' | 'monsterAcc' | 'decor' | 'celebration' | 'pack';
  name: string;
  desc: string;
  /** Precio en monedas. 0 = gratis (viene con el juego). */
  price: number;
  color: number;
  color2?: number;
  pattern?: Pattern;
  /** 'coins' = se compra jugando; 'deluxe'/'pack' = solo con producto de pago. */
  source: 'coins' | 'deluxe' | 'themePack';
  /** Para items de pago: pack que los entrega. */
  packId?: string;
  /** Para el paquete de monedas: items que entrega al comprarlo. */
  includes?: string[];
  /** Clave del guardado antiguo (economía V2) que migra a este item. */
  legacy?: string;
}

/** ── Catálogo comprable con MONEDAS (todo cosmético) ─────────────────────── */
export const SHOP_ITEMS: ShopItem[] = [
  // Colores del edificio (fachada) — 100
  { id: 'f_crema', cat: 'facade', slot: 'facade', name: 'Crema vainilla', desc: 'La fachada clásica del hotel.', price: 0, color: 0xf5e6c8, source: 'coins', legacy: 'wallpaper_crema' },
  { id: 'f_menta', cat: 'facade', slot: 'facade', name: 'Menta fresca', desc: 'Verde suave, muy monstruoso.', price: 100, color: 0xb8e6c9, source: 'coins', legacy: 'wallpaper_menta' },
  { id: 'f_rosa', cat: 'facade', slot: 'facade', name: 'Rosa chicle', desc: 'Para hoteles con mucho brillo.', price: 100, color: 0xfbcfe8, source: 'coins', legacy: 'wallpaper_rosa' },
  { id: 'f_noche', cat: 'facade', slot: 'facade', name: 'Azul noche', desc: 'Elegante y misterioso.', price: 100, color: 0x3b4a7a, source: 'coins', legacy: 'wallpaper_noche' },
  { id: 'f_lavanda', cat: 'facade', slot: 'facade', name: 'Lavanda real', desc: 'El color favorito de Pegajón.', price: 100, color: 0xc4b5fd, source: 'coins' },

  // Accesorios del recepcionista (Rese) — 150
  { id: 'a_azul', cat: 'accessory', slot: 'accessory', name: 'Uniforme azul', desc: 'El traje de siempre de Rese.', price: 0, color: 0x3b82f6, source: 'coins', legacy: 'rese_azul' },
  { id: 'a_rojo', cat: 'accessory', slot: 'accessory', name: 'Uniforme rojo', desc: 'Traje elegante color cereza.', price: 0, color: 0xef4444, source: 'coins', legacy: 'rese_rojo' },
  { id: 'a_verde', cat: 'accessory', slot: 'accessory', name: 'Uniforme verde', desc: 'Traje esmeralda de recepción.', price: 0, color: 0x10b981, source: 'coins', legacy: 'rese_verde' },
  { id: 'a_morado', cat: 'accessory', slot: 'accessory', name: 'Uniforme morado', desc: 'Traje real para ocasiones especiales.', price: 0, color: 0x8b5cf6, source: 'coins', legacy: 'rese_morado' },
  { id: 'a_lazo', cat: 'accessory', slot: 'accessory', name: 'Lazo rosa', desc: 'Un lazo enorme en la cabeza de Rese.', price: 150, color: 0xf472b6, source: 'coins' },
  { id: 'a_gafas', cat: 'accessory', slot: 'accessory', name: 'Gafas redondas', desc: 'Rese ve hasta el último piso.', price: 150, color: 0x1e3a8a, source: 'coins' },
  { id: 'a_placa', cat: 'accessory', slot: 'accessory', name: 'Placa dorada', desc: 'Insignia oficial del hotel.', price: 150, color: 0xf59e0b, source: 'coins' },

  // Aspectos del ascensor — 250
  { id: 'e_naranja', cat: 'elevator', slot: 'elevator', name: 'Naranja clásico', desc: 'La cabina de siempre.', price: 0, color: 0xffa94d, source: 'coins', legacy: 'elevator_naranja' },
  { id: 'e_cristal', cat: 'elevator', slot: 'elevator', name: 'Cristal azul', desc: 'Cabina y puertas de cristal.', price: 250, color: 0x38bdf8, color2: 0xe0f2fe, source: 'coins', legacy: 'door_cristal' },
  { id: 'e_dorado', cat: 'elevator', slot: 'elevator', name: 'Dorado real', desc: 'Para recibir a la realeza monstruosa.', price: 250, color: 0xf59e0b, color2: 0xffe9a8, source: 'coins', legacy: 'elevator_dorado' },

  // Papeles tapiz — 300
  { id: 'w_liso', cat: 'wallpaper', slot: 'wallpaper', name: 'Pared lisa', desc: 'Sin dibujos, todo limpio.', price: 0, color: 0xfff3d6, pattern: 'solid', source: 'coins' },
  { id: 'w_rayas', cat: 'wallpaper', slot: 'wallpaper', name: 'Rayas de caramelo', desc: 'Rayas suaves en la fachada.', price: 300, color: 0xfda4af, color2: 0xfff1f2, pattern: 'stripes', source: 'coins' },
  { id: 'w_lunares', cat: 'wallpaper', slot: 'wallpaper', name: 'Lunares kawaii', desc: 'Lunares por todas las paredes.', price: 300, color: 0x93c5fd, color2: 0xffffff, pattern: 'dots', source: 'coins' },

  // Temáticas completas — 500
  { id: 't_arcoiris', cat: 'theme', slot: 'theme', name: 'Hotel Arcoíris', desc: 'Cielo, fachada, paredes y decoración arcoíris.', price: 500, color: 0xf472b6, color2: 0xfde68a, pattern: 'rainbow', source: 'coins' },

  // Paquete especial — 800 (incluye TODO lo comprable con monedas)
  {
    id: 'p_hotel', cat: 'pack', slot: 'pack', name: 'Paquete Hotel a tu gusto',
    desc: 'Las 4 fachadas de colores y los 2 papeles tapiz juntos (valor por separado: 1000 monedas).',
    price: 800, color: 0x8a6fd0, source: 'coins',
    includes: ['f_menta', 'f_rosa', 'f_noche', 'f_lavanda', 'w_rayas', 'w_lunares'],
  },
];

/** ── Temáticas: paleta completa aplicada al escenario ────────────────────── */
export interface ThemePalette {
  label: string;
  skyTop: number;
  skyBottom: number;
  facade: number;
  facadeShade: number;
  wallpaper: number;
  pattern: Pattern;
  accent: number;
  /** Decoración ambiental dibujada detrás/delante del hotel. */
  decor: 'nubes' | 'estrellas' | 'peces' | 'fantasmas' | 'arcoiris';
  cloudAlpha: number;
}

export const THEMES: Record<string, ThemePalette> = {
  clasico: {
    label: 'Hotel Clásico', skyTop: 0xaee3f5, skyBottom: 0xd8f3fc, facade: 0xf5e6c8,
    facadeShade: 0xf5d9a8, wallpaper: 0xfff3d6, pattern: 'solid', accent: 0xf9a8d4,
    decor: 'nubes', cloudAlpha: 0.5,
  },
  arcoiris: {
    label: 'Hotel Arcoíris', skyTop: 0xbfe9ff, skyBottom: 0xfff0f7, facade: 0xfff6e0,
    facadeShade: 0xfde3c8, wallpaper: 0xfff1f2, pattern: 'rainbow', accent: 0xf472b6,
    decor: 'arcoiris', cloudAlpha: 0.45,
  },
  espacial: {
    label: 'Hotel Espacial', skyTop: 0x141a3a, skyBottom: 0x3b2f6b, facade: 0x5b6bb5,
    facadeShade: 0x3f4c8a, wallpaper: 0x2b3468, pattern: 'stars', accent: 0xfde68a,
    decor: 'estrellas', cloudAlpha: 0.18,
  },
  submarino: {
    label: 'Hotel Submarino', skyTop: 0x0e7490, skyBottom: 0x67e8f9, facade: 0x7fd8e8,
    facadeShade: 0x4fb9cf, wallpaper: 0x155e75, pattern: 'waves', accent: 0xfcd34d,
    decor: 'peces', cloudAlpha: 0.25,
  },
  embrujado: {
    label: 'Hotel Embrujado', skyTop: 0x2b1b3d, skyBottom: 0x6b4a8a, facade: 0x7c6a99,
    facadeShade: 0x574a70, wallpaper: 0x3d2f52, pattern: 'dots', accent: 0xa3e635,
    decor: 'fantasmas', cloudAlpha: 0.2,
  },
};

/** ── Productos de DINERO REAL (pago único, sección para adultos) ─────────── */
export interface PackDef {
  id: string;
  name: string;
  tagline: string;
  /** Contenido exacto: ids de items que YA existen en el juego. */
  items: string[];
  /** Contenido descrito en lenguaje humano (lo que ve el adulto). */
  contents: string[];
  /** Precio inicial para experimentar, en bolivianos. */
  priceBs: string;
  note: string;
}

/** Items exclusivos del Pack Deluxe (no se venden por monedas). */
export const DELUXE_ITEMS: ShopItem[] = [
  // 5 trajes del recepcionista (Rese)
  { id: 'd_espacial', cat: 'accessory', slot: 'accessory', name: 'Traje espacial', desc: 'Rese con casco de astronauta.', price: 0, color: 0xe0e7ff, source: 'deluxe', packId: 'deluxe' },
  { id: 'd_submarino', cat: 'accessory', slot: 'accessory', name: 'Traje submarino', desc: 'Rese con escafandra de buzo.', price: 0, color: 0x22d3ee, source: 'deluxe', packId: 'deluxe' },
  { id: 'd_fantasma', cat: 'accessory', slot: 'accessory', name: 'Traje fantasma', desc: 'Rese con capa fantasmal.', price: 0, color: 0xc7d2fe, source: 'deluxe', packId: 'deluxe' },
  { id: 'd_gala', cat: 'accessory', slot: 'accessory', name: 'Traje de gala', desc: 'Rese dorada con pajarita.', price: 0, color: 0xfbbf24, source: 'deluxe', packId: 'deluxe' },
  { id: 'd_chef', cat: 'accessory', slot: 'accessory', name: 'Traje de chef', desc: 'Rese con gorro de cocina.', price: 0, color: 0xffffff, source: 'deluxe', packId: 'deluxe' },
  // 5 accesorios exclusivos para monstruos
  { id: 'dm_copa', cat: 'accessory', slot: 'monsterAcc', name: 'Sombrero de copa', desc: 'Los monstruos de la cola llevan sombrero.', price: 0, color: 0x1f2937, source: 'deluxe', packId: 'deluxe' },
  { id: 'dm_lazo', cat: 'accessory', slot: 'monsterAcc', name: 'Lazo de monstruo', desc: 'Un lazo rojo para cada huésped.', price: 0, color: 0xef4444, source: 'deluxe', packId: 'deluxe' },
  { id: 'dm_gafas', cat: 'accessory', slot: 'monsterAcc', name: 'Gafas de sol', desc: 'Monstruos con estilo playero.', price: 0, color: 0x111827, source: 'deluxe', packId: 'deluxe' },
  { id: 'dm_corona', cat: 'accessory', slot: 'monsterAcc', name: 'Corona real', desc: 'Cada huésped es de la realeza.', price: 0, color: 0xfcd34d, source: 'deluxe', packId: 'deluxe' },
  { id: 'dm_bufanda', cat: 'accessory', slot: 'monsterAcc', name: 'Bufanda a rayas', desc: 'Abriga a los monstruos del frío.', price: 0, color: 0x38bdf8, source: 'deluxe', packId: 'deluxe' },
];

/** Decoraciones de hotel y celebración especial (exclusivas Deluxe). */
export const DELUXE_EXTRAS: ShopItem[] = [
  { id: 'dd_fuente', cat: 'theme', slot: 'decor', name: 'Fuente kawaii', desc: 'Una fuente con agua brillante en la recepción.', price: 0, color: 0x67e8f9, source: 'deluxe', packId: 'deluxe' },
  { id: 'dd_arana', cat: 'theme', slot: 'decor', name: 'Araña de cristal', desc: 'Lámpara de cristal colgando del techo.', price: 0, color: 0xfde68a, source: 'deluxe', packId: 'deluxe' },
  { id: 'd_celebracion', cat: 'theme', slot: 'celebration', name: 'Celebración dorada', desc: 'Fuegos artificiales dorados al completar niveles.', price: 0, color: 0xfbbf24, source: 'deluxe', packId: 'deluxe' },
];

export const PACKS: PackDef[] = [
  {
    id: 'deluxe',
    name: 'PISO EQUIVOCADO: PACK DELUXE',
    tagline: 'Personalización exclusiva y una celebración especial.',
    items: [...DELUXE_ITEMS.map((i) => i.id), ...DELUXE_EXTRAS.map((i) => i.id)],
    contents: [
      '5 trajes para el recepcionista (Rese): espacial, submarino, fantasma, gala y chef',
      '5 accesorios exclusivos para monstruos: copa, lazo, gafas, corona y bufanda',
      '2 decoraciones de hotel: fuente kawaii y araña de cristal',
      '1 celebración especial de victoria con fuegos dorados',
    ],
    priceBs: '9,90 – 19,90 Bs (pago único)',
    note: 'Precio inicial para experimentar, sujeto a pruebas de mercado y a las tarifas de distribución. Solo cosméticos: no incluye pistas ni ventajas para resolver los puzles.',
  },
  {
    id: 'tema_espacial',
    name: 'PACK TEMÁTICO: HOTEL ESPACIAL',
    tagline: 'Convierte el hotel en una estación orbital.',
    items: ['t_espacial'],
    contents: [
      'Temática completa: cielo estrellado con planetas, fachada metálica, papel tapiz de estrellas',
      'Aspecto de ascensor espacial incluido en la temática',
    ],
    priceBs: '4,90 Bs (pago único)',
    note: 'Cosmético. La campaña y los 30 niveles siguen siendo gratuitos.',
  },
  {
    id: 'tema_submarino',
    name: 'PACK TEMÁTICO: HOTEL SUBMARINO',
    tagline: 'El hotel se hunde (a propósito) bajo el mar.',
    items: ['t_submarino'],
    contents: [
      'Temática completa: agua con peces y burbujas, fachada coral, papel tapiz de olas',
      'Aspecto de ascensor submarino incluido en la temática',
    ],
    priceBs: '4,90 Bs (pago único)',
    note: 'Cosmético. La campaña y los 30 niveles siguen siendo gratuitos.',
  },
  {
    id: 'tema_embrujado',
    name: 'PACK TEMÁTICO: HOTEL EMBRUJADO',
    tagline: 'Fantasmas amables y velas flotantes.',
    items: ['t_embrujado'],
    contents: [
      'Temática completa: noche violeta con fantasmas y velas, fachada de piedra, papel tapiz de lunares',
      'Aspecto de ascensor embrujado incluido en la temática',
    ],
    priceBs: '4,90 Bs (pago único)',
    note: 'Cosmético. La campaña y los 30 niveles siguen siendo gratuitos.',
  },
];

/** Items de temáticas de pago (no se compran con monedas). */
export const THEME_PACK_ITEMS: ShopItem[] = [
  { id: 't_espacial', cat: 'theme', slot: 'theme', name: 'Hotel Espacial', desc: 'Cielo estrellado, planetas y fachada metálica.', price: 0, color: 0x5b6bb5, color2: 0x141a3a, pattern: 'stars', source: 'themePack', packId: 'tema_espacial' },
  { id: 't_submarino', cat: 'theme', slot: 'theme', name: 'Hotel Submarino', desc: 'Agua, peces y burbujas por todas partes.', price: 0, color: 0x7fd8e8, color2: 0x0e7490, pattern: 'waves', source: 'themePack', packId: 'tema_submarino' },
  { id: 't_embrujado', cat: 'theme', slot: 'theme', name: 'Hotel Embrujado', desc: 'Fantasmas amables y velas flotantes.', price: 0, color: 0x7c6a99, color2: 0x2b1b3d, pattern: 'dots', source: 'themePack', packId: 'tema_embrujado' },
];

/** Catálogo completo (monedas + exclusivos de pago). */
export const ALL_ITEMS: ShopItem[] = [...SHOP_ITEMS, ...DELUXE_ITEMS, ...DELUXE_EXTRAS, ...THEME_PACK_ITEMS];

const BY_ID = new Map<string, ShopItem>(ALL_ITEMS.map((i) => [i.id, i]));

export function itemById(id: string): ShopItem | undefined {
  return BY_ID.get(id);
}

/** Items de una categoría (para la tienda de monedas o el inventario). */
export function itemsOf(cat: ShopCategory, source?: ShopItem['source']): ShopItem[] {
  return SHOP_ITEMS.filter((i) => i.cat === cat && (source === undefined || i.source === source));
}

/** Suma del precio de todos los items comprables con monedas (excluye el paquete). */
export function totalCoinShopValue(): number {
  return SHOP_ITEMS.filter((i) => i.cat !== 'pack').reduce((a, i) => a + i.price, 0);
}

/** Paleta de la temática equipada (siempre existe: por defecto 'clasico'). */
export function paletteOf(themeId: string): ThemePalette {
  return THEMES[themeId] ?? THEMES.clasico;
}

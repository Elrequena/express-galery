/** Valores internos de la composición (pensados para exponerse en la UI más adelante). */
export const videoConfig = {
  /** Duración mínima/máxima del fragmento, en segundos. */
  clipMin: 5,
  clipMax: 12,
  /** Clips de video que se intentan mantener siempre en pantalla. */
  maxConcurrent: 5,
  /** Cupos extra solo para cargar el reemplazo mientras un clip se desvanece. */
  overlapSlots: 1,
  /** Probabilidad de que un espacio "no clip" sea un frame aunque sobren imágenes. */
  frameShare: 0.1,
  /** Segundos extra tras el fragmento, usados por la transición de salida. */
  fadeTail: 2,
  /** Un clip cuenta como "terminando" cuando le quedan menos segundos que esto (reemplazo anticipado). */
  endingLead: 3.5,
  /** Separación mínima deseada (s) entre inicios de clips/frames del mismo video. */
  startSeparation: 3,
  /** Lado máximo (px) de los frames extraídos. */
  frameMaxSide: 1600,
  /** Tiempo máximo de espera para metadatos / seek / buffer. */
  loadTimeoutMs: 20000,
  /** Cargas lentas fallidas antes de descartar un archivo (un error real lo descarta de inmediato). */
  maxFailures: 3,
}

export const densityConfig = {
  min: 5,
  max: 50,
  default: 10,
}

/** Tamaño de los elementos: lado mayor = azar entre min y max, por la fracción del lado menor de la ventana. */
export const sizeConfig = {
  min: 0.28,
  max: 0.6,
  /** Multiplicador de cada nivel del selector (5 niveles; el del medio es el valor por defecto). */
  scales: [0.55, 0.75, 1, 1.3, 1.6],
  /** Índice (desde 0) del nivel inicial: el medio. */
  default: 2,
}

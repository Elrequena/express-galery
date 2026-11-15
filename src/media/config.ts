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
  loadTimeoutMs: 10000,
}

export const densityConfig = {
  min: 5,
  max: 40,
  default: 8,
}

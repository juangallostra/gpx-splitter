import { TrackSegment } from './trackSegment';

export type SlopeDirection = 'up' | 'down';

/**
 * Categorización de puertos al estilo ciclista, orientativa (no hay un estándar único).
 * null = no llega al umbral mínimo para categorizarse.
 */
export type MountainCategory = 'HC' | '1' | '2' | '3' | null;

/**
 * Un tramo de pendiente detectado automáticamente (ascenso o descenso). Reutiliza la forma de
 * TrackSegment para poder pasar por writeGpx/downloadZip sin cambios, y añade las métricas
 * propias de la detección.
 */
export interface SlopeSegment extends TrackSegment {
  direction: SlopeDirection;
  distanceMeters: number;
  /** Metros de desnivel en el sentido del tramo: ganados si es ascenso, perdidos si es descenso. Siempre positivo. */
  elevationChangeMeters: number;
  /** Pendiente media en valor absoluto (%) */
  averageSlopePercent: number;
  /** Solo relevante para ascensos; null en descensos o si no llega al umbral mínimo */
  category: MountainCategory;
}

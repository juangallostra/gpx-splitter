import { TrackSegment } from './trackSegment';

/**
 * Un tramo de ascenso detectado automáticamente. Reutiliza la forma de TrackSegment
 * (mismo id/name/startKm/endKm/points) para poder pasar por writeGpx/downloadZip sin cambios,
 * y añade las métricas propias de la detección.
 */
export interface AscentSegment extends TrackSegment {
  distanceMeters: number;
  elevationGainMeters: number;
  averageSlopePercent: number;
}

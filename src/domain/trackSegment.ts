import type { TrackPoint } from './trackPoint';

export interface TrackSegment {
  id: string;
  /** Nombre visible en la UI y dentro del GPX. */
  name: string;
  /** Nombre de archivo sugerido para descarga. */
  filename: string;
  startKm: number;
  /** null indica que el segmento termina al final del track original. */
  endKm: number | null;
  points: TrackPoint[];
}

export function segmentFileName(segment: TrackSegment): string {
  return segment.filename;
}

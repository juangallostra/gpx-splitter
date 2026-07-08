import { TrackPoint } from './trackPoint';

export interface TrackSegment {
  id: string;
  name: string;
  /** km de inicio del segmento */
  startKm: number;
  /** km de fin del segmento, null si es "hasta el final" */
  endKm: number | null;
  points: TrackPoint[];
}

/**
 * Genera un nombre de archivo legible para un segmento.
 * Ej: track_km_000_005.gpx, track_km_021-1_final.gpx
 */
export function segmentFileName(segment: TrackSegment): string {
  const formatKm = (km: number): string => {
    // 3 dígitos enteros + decimal opcional con guion en vez de punto
    const rounded = Math.round(km * 10) / 10;
    const [intPart, decPart] = rounded.toFixed(1).split('.');
    const paddedInt = intPart.padStart(3, '0');
    return decPart === '0' ? paddedInt : `${paddedInt}-${decPart}`;
  };

  const start = formatKm(segment.startKm);
  const end = segment.endKm === null ? 'final' : formatKm(segment.endKm);

  return `track_km_${start}_${end}.gpx`;
}

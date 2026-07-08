import { TrackPoint } from '../domain/trackPoint';

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distancia en metros entre dos coordenadas usando la fórmula de Haversine.
 */
export function haversineDistance(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

/**
 * Devuelve una nueva lista de puntos con distanceFromStart calculada (en metros).
 */
export function calculateDistances(points: TrackPoint[]): TrackPoint[] {
  if (points.length === 0) return [];

  const result: TrackPoint[] = [{ ...points[0], distanceFromStart: 0 }];

  for (let i = 1; i < points.length; i++) {
    const prev = result[i - 1];
    const curr = points[i];
    const segmentDistance = haversineDistance(prev, curr);
    result.push({
      ...curr,
      distanceFromStart: prev.distanceFromStart + segmentDistance,
    });
  }

  return result;
}

export interface ElevationSummary {
  gainM: number;
  lossM: number;
}

/**
 * Calcula el desnivel positivo y negativo acumulado. Ignora puntos sin elevación.
 */
export function calculateElevation(points: TrackPoint[]): ElevationSummary | null {
  const withEle = points.filter((p) => p.ele !== undefined) as (TrackPoint & { ele: number })[];
  if (withEle.length < 2) return null;

  let gain = 0;
  let loss = 0;

  for (let i = 1; i < withEle.length; i++) {
    const diff = withEle[i].ele - withEle[i - 1].ele;
    if (diff > 0) gain += diff;
    else loss += Math.abs(diff);
  }

  return { gainM: gain, lossM: loss };
}

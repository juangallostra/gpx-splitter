import { TrackPoint } from '../domain/trackPoint';

export interface ElevationProfilePoint {
  distanceKm: number;
  ele: number;
}

/**
 * Convierte los puntos del track en una serie (distanciaKm, elevación) apta para un gráfico,
 * ignorando puntos sin elevación y reduciendo la cantidad de puntos si el track es muy largo
 * (para mantener el gráfico fluido sin perder la forma del perfil).
 */
export function buildElevationProfile(
  points: TrackPoint[],
  maxPoints = 400
): ElevationProfilePoint[] {
  const withEle = points.filter((p) => p.ele !== undefined) as (TrackPoint & { ele: number })[];
  if (withEle.length < 2) return [];

  const step = Math.max(1, Math.ceil(withEle.length / maxPoints));

  const sampled: ElevationProfilePoint[] = [];
  for (let i = 0; i < withEle.length; i += step) {
    sampled.push({ distanceKm: withEle[i].distanceFromStart / 1000, ele: withEle[i].ele });
  }

  // Aseguramos que el último punto real siempre esté presente, para no cortar el perfil
  const last = withEle[withEle.length - 1];
  const lastSampled = sampled[sampled.length - 1];
  if (lastSampled.distanceKm !== last.distanceFromStart / 1000) {
    sampled.push({ distanceKm: last.distanceFromStart / 1000, ele: last.ele });
  }

  return sampled;
}

import { TrackPoint } from '../domain/trackPoint';

/**
 * Busca el punto del track más cercano a una coordenada lat/lon dada (búsqueda lineal,
 * suficiente para el tamaño de un track típico y para eventos de hover/click puntuales).
 * Devuelve el km (distanceFromStart / 1000) de ese punto, o null si no hay puntos.
 */
export function findNearestKmToLatLng(points: TrackPoint[], lat: number, lon: number): number | null {
  if (points.length === 0) return null;

  let closest = points[0];
  let closestDist = squaredDistance(closest, lat, lon);

  for (const p of points) {
    const d = squaredDistance(p, lat, lon);
    if (d < closestDist) {
      closest = p;
      closestDist = d;
    }
  }

  return closest.distanceFromStart / 1000;
}

function squaredDistance(point: TrackPoint, lat: number, lon: number): number {
  const dLat = point.lat - lat;
  const dLon = point.lon - lon;
  return dLat * dLat + dLon * dLon;
}

/**
 * Devuelve el punto del track más cercano a un km dado (sin interpolar), útil para
 * posicionar un marcador de hover en el mapa a partir de un km del perfil de elevación.
 */
export function findPointAtKm(points: TrackPoint[], km: number): TrackPoint | null {
  if (points.length === 0) return null;

  const targetM = km * 1000;
  let closest = points[0];
  let closestDiff = Math.abs(closest.distanceFromStart - targetM);

  for (const p of points) {
    const diff = Math.abs(p.distanceFromStart - targetM);
    if (diff < closestDiff) {
      closest = p;
      closestDiff = diff;
    }
  }

  return closest;
}

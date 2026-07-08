import type { TrackPoint } from '../domain/trackPoint';

export interface ElevationProfilePoint {
  km: number;
  ele: number;
  lat: number;
  lon: number;
}

export function buildElevationProfile(points: TrackPoint[], maxPoints = 500): ElevationProfilePoint[] {
  const withElevation = points.filter((point) => point.ele !== undefined);

  if (withElevation.length < 2) {
    return [];
  }

  const step = Math.max(1, Math.ceil(withElevation.length / maxPoints));
  const sampled = withElevation.filter((_, index) => index % step === 0);
  const last = withElevation[withElevation.length - 1];

  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled.map((point) => ({
    km: point.distanceFromStart / 1000,
    ele: point.ele!,
    lat: point.lat,
    lon: point.lon,
  }));
}

export function findProfilePointByKm(points: TrackPoint[], km: number): TrackPoint | undefined {
  const targetMeters = km * 1000;
  let closest = points[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const delta = Math.abs(point.distanceFromStart - targetMeters);
    if (delta < closestDistance) {
      closest = point;
      closestDistance = delta;
    }
  }

  return closest;
}

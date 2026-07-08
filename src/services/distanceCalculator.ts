import type { ElevationStats, TrackPoint } from '../domain/trackPoint';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistanceMeters(pointA: TrackPoint, pointB: TrackPoint): number {
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLon = toRadians(pointB.lon - pointA.lon);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function calculateDistances(points: TrackPoint[]): TrackPoint[] {
  if (points.length === 0) {
    return [];
  }

  let accumulatedDistance = 0;

  return points.map((point, index) => {
    if (index > 0) {
      accumulatedDistance += calculateDistanceMeters(points[index - 1], point);
    }

    return {
      ...point,
      distanceFromStart: accumulatedDistance,
    };
  });
}

export function calculateElevationStats(points: TrackPoint[]): ElevationStats {
  return points.reduce<ElevationStats>(
    (stats, currentPoint, index) => {
      if (index === 0) {
        return stats;
      }

      const previousPoint = points[index - 1];
      if (previousPoint.ele === undefined || currentPoint.ele === undefined) {
        return stats;
      }

      const delta = currentPoint.ele - previousPoint.ele;
      if (delta > 0) {
        stats.positive += delta;
      } else if (delta < 0) {
        stats.negative += Math.abs(delta);
      }

      return stats;
    },
    { positive: 0, negative: 0 },
  );
}

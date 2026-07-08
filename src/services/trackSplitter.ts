import type { TrackPoint } from '../domain/trackPoint';
import type { TrackSegment } from '../domain/trackSegment';
import { buildRangeFilename, rangeId } from './idUtils';

function clonePointWithDistance(point: TrackPoint, distanceFromStart: number): TrackPoint {
  return {
    ...point,
    distanceFromStart,
  };
}

function interpolateIsoTime(timeA: string, timeB: string, ratio: number): string | undefined {
  const timestampA = Date.parse(timeA);
  const timestampB = Date.parse(timeB);

  if (!Number.isFinite(timestampA) || !Number.isFinite(timestampB)) {
    return undefined;
  }

  const interpolatedTimestamp = timestampA + (timestampB - timestampA) * ratio;
  return new Date(interpolatedTimestamp).toISOString();
}

export class TrackSplitError extends Error {}

export function interpolatePoint(
  pointA: TrackPoint,
  pointB: TrackPoint,
  targetDistance: number,
): TrackPoint {
  const segmentDistance = pointB.distanceFromStart - pointA.distanceFromStart;

  if (segmentDistance <= 0) {
    return clonePointWithDistance(pointA, targetDistance);
  }

  const ratio = (targetDistance - pointA.distanceFromStart) / segmentDistance;
  const hasElevation = pointA.ele !== undefined && pointB.ele !== undefined;
  const hasTime = pointA.time !== undefined && pointB.time !== undefined;

  return {
    lat: pointA.lat + (pointB.lat - pointA.lat) * ratio,
    lon: pointA.lon + (pointB.lon - pointA.lon) * ratio,
    ele: hasElevation ? pointA.ele! + (pointB.ele! - pointA.ele!) * ratio : undefined,
    time: hasTime ? interpolateIsoTime(pointA.time!, pointB.time!, ratio) : undefined,
    distanceFromStart: targetDistance,
  };
}

export function getPointAtDistance(points: TrackPoint[], targetDistance: number): TrackPoint {
  if (points.length === 0) {
    throw new TrackSplitError('No hay puntos de track para interpolar.');
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (targetDistance <= firstPoint.distanceFromStart) {
    return clonePointWithDistance(firstPoint, targetDistance);
  }

  if (targetDistance >= lastPoint.distanceFromStart) {
    return clonePointWithDistance(lastPoint, targetDistance);
  }

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const currentPoint = points[index];

    if (Math.abs(previousPoint.distanceFromStart - targetDistance) < 0.0001) {
      return clonePointWithDistance(previousPoint, targetDistance);
    }

    if (Math.abs(currentPoint.distanceFromStart - targetDistance) < 0.0001) {
      return clonePointWithDistance(currentPoint, targetDistance);
    }

    if (previousPoint.distanceFromStart < targetDistance && currentPoint.distanceFromStart > targetDistance) {
      return interpolatePoint(previousPoint, currentPoint, targetDistance);
    }
  }

  return clonePointWithDistance(lastPoint, targetDistance);
}

export function getClosestPoint(points: TrackPoint[], target: { lat: number; lon: number }): TrackPoint | undefined {
  if (points.length === 0) return undefined;

  let best = points[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const latDelta = point.lat - target.lat;
    const lonDelta = point.lon - target.lon;
    const score = latDelta * latDelta + lonDelta * lonDelta;

    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  }

  return best;
}

export function normalizeCutKms(cutKms: number[], totalKm: number): number[] {
  const sorted = [...cutKms]
    .filter((km) => Number.isFinite(km) && km > 0 && km < totalKm)
    .sort((a, b) => a - b);

  return sorted.filter((km, index) => index === 0 || Math.abs(km - sorted[index - 1]) > 0.001);
}

export function splitTrackByKilometers(points: TrackPoint[], cutKms: number[]): TrackSegment[] {
  if (points.length < 2) {
    throw new TrackSplitError('El track necesita al menos dos puntos para poder cortarse.');
  }

  const totalDistanceMeters = points[points.length - 1].distanceFromStart;
  const totalKm = totalDistanceMeters / 1000;
  const normalizedCuts = normalizeCutKms(cutKms, totalKm);
  const boundariesMeters = [0, ...normalizedCuts.map((km) => km * 1000), totalDistanceMeters];

  return boundariesMeters.slice(0, -1).map((startMeters, index): TrackSegment => {
    const endMeters = boundariesMeters[index + 1];
    const startPoint = getPointAtDistance(points, startMeters);
    const endPoint = getPointAtDistance(points, endMeters);
    const innerPoints = points.filter(
      (point) => point.distanceFromStart > startMeters && point.distanceFromStart < endMeters,
    );
    const startKm = startMeters / 1000;
    const isLastSegment = index === boundariesMeters.length - 2;
    const endKm = isLastSegment ? null : endMeters / 1000;

    return {
      id: rangeId('seg', startKm, endKm),
      name: `Segmento ${index + 1}`,
      filename: buildRangeFilename('track', startKm, endKm),
      startKm,
      endKm,
      points: [startPoint, ...innerPoints, endPoint],
    };
  });
}

import { TrackPoint } from '../domain/trackPoint';
import { TrackSegment, stableSegmentId } from '../domain/trackSegment';

export class TrackSplitError extends Error {}

/**
 * Interpola un punto entre A y B a una distancia objetivo (en metros desde el inicio del track).
 * Requiere que targetDistance esté entre pointA.distanceFromStart y pointB.distanceFromStart.
 */
export function interpolatePoint(
  pointA: TrackPoint,
  pointB: TrackPoint,
  targetDistance: number
): TrackPoint {
  const total = pointB.distanceFromStart - pointA.distanceFromStart;

  // Si los puntos coinciden en distancia, devolvemos A tal cual (evita división por 0)
  const ratio = total === 0 ? 0 : (targetDistance - pointA.distanceFromStart) / total;
  const clampedRatio = Math.min(1, Math.max(0, ratio));

  const lat = pointA.lat + (pointB.lat - pointA.lat) * clampedRatio;
  const lon = pointA.lon + (pointB.lon - pointA.lon) * clampedRatio;

  let ele: number | undefined;
  if (pointA.ele !== undefined && pointB.ele !== undefined) {
    ele = pointA.ele + (pointB.ele - pointA.ele) * clampedRatio;
  }

  let time: string | undefined;
  if (pointA.time && pointB.time) {
    const tA = new Date(pointA.time).getTime();
    const tB = new Date(pointB.time).getTime();
    if (!Number.isNaN(tA) && !Number.isNaN(tB)) {
      const interpolatedTime = tA + (tB - tA) * clampedRatio;
      time = new Date(interpolatedTime).toISOString();
    }
  }

  return {
    lat,
    lon,
    ele,
    time,
    distanceFromStart: targetDistance,
  };
}

/**
 * Divide el track en segmentos según los puntos kilométricos indicados (en km).
 * Los cutKms deben venir ya validados, ordenados y sin duplicados.
 */
export function splitTrackByKilometers(
  points: TrackPoint[],
  cutKms: number[]
): TrackSegment[] {
  if (points.length < 2) {
    throw new TrackSplitError('El track necesita al menos 2 puntos para poder cortarse.');
  }

  const totalDistanceM = points[points.length - 1].distanceFromStart;
  const totalDistanceKm = totalDistanceM / 1000;

  const invalidCut = cutKms.find((km) => km <= 0 || km >= totalDistanceKm);
  if (invalidCut !== undefined) {
    throw new TrackSplitError(
      `El punto kilométrico ${invalidCut} está fuera de rango (0 - ${totalDistanceKm.toFixed(2)} km).`
    );
  }

  // Límites del recorrido en metros: 0, corte1, corte2, ..., final
  const boundariesM = [0, ...cutKms.map((km) => km * 1000), totalDistanceM];

  const segments: TrackSegment[] = [];

  for (let i = 0; i < boundariesM.length - 1; i++) {
    const startM = boundariesM[i];
    const endM = boundariesM[i + 1];

    const segmentPoints: TrackPoint[] = [];

    // Punto inicial: exacto si coincide con un punto real, si no se interpola
    segmentPoints.push(getPointAtDistance(points, startM));

    // Puntos interiores estrictamente entre startM y endM
    for (const p of points) {
      if (p.distanceFromStart > startM && p.distanceFromStart < endM) {
        segmentPoints.push(p);
      }
    }

    // Punto final
    segmentPoints.push(getPointAtDistance(points, endM));

    const isLast = i === boundariesM.length - 2;
    const startKm = startM / 1000;
    const endKm = isLast ? null : endM / 1000;

    segments.push({
      id: stableSegmentId('seg', startKm, endKm),
      name: `Segmento ${i + 1}`,
      startKm,
      endKm,
      points: segmentPoints,
    });
  }

  return segments;
}

/**
 * Devuelve el punto del track en una distancia dada (en metros), interpolando si hace falta.
 */
function getPointAtDistance(points: TrackPoint[], targetDistanceM: number): TrackPoint {
  // Punto exacto (con tolerancia mínima de 1cm)
  const exact = points.find((p) => Math.abs(p.distanceFromStart - targetDistanceM) < 0.01);
  if (exact) return exact;

  // Buscar el par de puntos entre los que cae targetDistanceM
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a.distanceFromStart <= targetDistanceM && targetDistanceM <= b.distanceFromStart) {
      return interpolatePoint(a, b, targetDistanceM);
    }
  }

  // Caso límite: fuera de rango por redondeo, devolvemos el extremo más cercano
  return targetDistanceM <= 0 ? points[0] : points[points.length - 1];
}

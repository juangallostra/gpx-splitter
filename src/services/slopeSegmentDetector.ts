import type { TrackPoint } from '../domain/trackPoint';
import type { AscentSegment, DescentSegment, SlopeDirection, SlopeSegment } from '../domain/slopeSegment';
import { buildRangeFilename, rangeId } from './idUtils';
import { categorizeAscent } from './portCategorizer';

export class SlopeDetectionError extends Error {}

export interface SlopeDetectionParams {
  /** Pendiente media mínima dentro de la ventana para considerar tramo ascendente/descendente. Ej: 0.03 = 3%. */
  minSlope: number;
  /** Tamaño de la ventana deslizante usada para medir la pendiente, en metros. */
  windowMeters: number;
  /** Distancia mínima de un candidato para no descartarlo como ruido, en metros. */
  minSegmentDistanceM: number;
  /** Desnivel mínimo absoluto de un candidato para no descartarlo como ruido, en metros. */
  minElevationChangeM: number;
  /** Si el llano/hueco entre dos candidatos es menor o igual a esto, se fusionan. */
  mergeGapMeters: number;
}

export interface SlopeFilterParams {
  /** Distancia mínima del tramo final, en km. */
  minSegmentKm: number;
  /** Desnivel mínimo absoluto del tramo final, en metros. */
  minElevationChangeFilterM: number;
}

export type SlopeConfig = SlopeDetectionParams & SlopeFilterParams;

export const DEFAULT_SLOPE_DETECTION_PARAMS: SlopeDetectionParams = {
  minSlope: 0.03,
  windowMeters: 150,
  minSegmentDistanceM: 300,
  minElevationChangeM: 20,
  mergeGapMeters: 100,
};

export const DEFAULT_ASCENT_FILTER_PARAMS: SlopeFilterParams = {
  minSegmentKm: 1,
  minElevationChangeFilterM: 50,
};

export const DEFAULT_DESCENT_FILTER_PARAMS: SlopeFilterParams = {
  minSegmentKm: 1,
  minElevationChangeFilterM: 50,
};

export const DEFAULT_ASCENT_CONFIG: SlopeConfig = {
  ...DEFAULT_SLOPE_DETECTION_PARAMS,
  ...DEFAULT_ASCENT_FILTER_PARAMS,
};

export const DEFAULT_DESCENT_CONFIG: SlopeConfig = {
  ...DEFAULT_SLOPE_DETECTION_PARAMS,
  ...DEFAULT_DESCENT_FILTER_PARAMS,
};

interface IndexRange {
  startIdx: number;
  endIdx: number;
}

export function hasEnoughElevationData(points: TrackPoint[]): boolean {
  if (points.length === 0) return false;
  const withEle = points.filter((p) => p.ele !== undefined).length;
  return withEle / points.length >= 0.9;
}

export function detectSlopeSegments(points: TrackPoint[], config: SlopeConfig, direction: 'up'): AscentSegment[];
export function detectSlopeSegments(points: TrackPoint[], config: SlopeConfig, direction: 'down'): DescentSegment[];
export function detectSlopeSegments(
  points: TrackPoint[],
  config: SlopeConfig,
  direction: SlopeDirection,
): SlopeSegment[] {
  if (points.length < 2) return [];

  if (!hasEnoughElevationData(points)) {
    throw new SlopeDetectionError('El GPX no tiene suficientes datos de elevación para detectar tramos de pendiente.');
  }

  const mask = computeSlopeMask(points, config.minSlope, config.windowMeters, direction);
  const rawCandidates = groupContiguousRanges(mask);

  if (rawCandidates.length === 0) return [];

  const merged = mergeCloseRanges(rawCandidates, points, config.mergeGapMeters);
  const adjusted = merged.map((range) => adjustStart(range, points, direction));
  const denoised = adjusted.filter((range) => {
    const { distanceMeters, elevationChangeMeters } = computeRangeMetrics(range, points, direction);
    return distanceMeters >= config.minSegmentDistanceM && elevationChangeMeters >= config.minElevationChangeM;
  });

  const prefix = direction === 'up' ? 'asc' : 'desc';
  const autoName = direction === 'up' ? 'Ascenso' : 'Descenso';
  const filenamePrefix = direction === 'up' ? 'ascenso' : 'descenso';

  return denoised
    .map((range, index) => buildSlopeSegment(range, points, direction, prefix, autoName, filenamePrefix, index))
    .filter(
      (segment) =>
        segment.distanceMeters / 1000 >= config.minSegmentKm &&
        segment.elevationChangeMeters >= config.minElevationChangeFilterM,
    );
}

function computeSlopeMask(
  points: TrackPoint[],
  minSlope: number,
  windowMeters: number,
  direction: SlopeDirection,
): boolean[] {
  const n = points.length;
  const mask = new Array<boolean>(n).fill(false);
  let j = 0;

  for (let i = 0; i < n; i += 1) {
    const targetDistance = points[i].distanceFromStart + windowMeters;
    if (j < i) j = i;

    while (j < n - 1 && points[j].distanceFromStart < targetDistance) {
      j += 1;
    }

    const distanceCovered = points[j].distanceFromStart - points[i].distanceFromStart;
    if (distanceCovered < 10) continue;

    const eleA = points[i].ele;
    const eleB = points[j].ele;
    if (eleA === undefined || eleB === undefined) continue;

    const signedSlope = (eleB - eleA) / distanceCovered;
    const matchesDirection = direction === 'up' ? signedSlope >= minSlope : signedSlope <= -minSlope;

    if (matchesDirection) {
      for (let k = i; k <= j; k += 1) {
        mask[k] = true;
      }
    }
  }

  return mask;
}

function groupContiguousRanges(mask: boolean[]): IndexRange[] {
  const ranges: IndexRange[] = [];
  let start: number | null = null;

  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] && start === null) {
      start = i;
    } else if (!mask[i] && start !== null) {
      ranges.push({ startIdx: start, endIdx: i - 1 });
      start = null;
    }
  }

  if (start !== null) {
    ranges.push({ startIdx: start, endIdx: mask.length - 1 });
  }

  return ranges;
}

function mergeCloseRanges(ranges: IndexRange[], points: TrackPoint[], mergeGapMeters: number): IndexRange[] {
  if (ranges.length === 0) return [];

  const merged: IndexRange[] = [{ ...ranges[0] }];

  for (let i = 1; i < ranges.length; i += 1) {
    const previous = merged[merged.length - 1];
    const current = ranges[i];
    const gap = points[current.startIdx].distanceFromStart - points[previous.endIdx].distanceFromStart;

    if (gap <= mergeGapMeters) {
      previous.endIdx = current.endIdx;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function adjustStart(range: IndexRange, points: TrackPoint[], direction: SlopeDirection): IndexRange {
  let idx = range.startIdx;

  while (idx > 0) {
    const curr = points[idx].ele;
    const prev = points[idx - 1].ele;
    if (curr === undefined || prev === undefined) break;

    const shouldStepBack = direction === 'up' ? prev < curr : prev > curr;

    if (shouldStepBack) {
      idx -= 1;
    } else {
      break;
    }
  }

  return { startIdx: idx, endIdx: range.endIdx };
}

function computeRangeMetrics(
  range: IndexRange,
  points: TrackPoint[],
  direction: SlopeDirection,
): { distanceMeters: number; elevationChangeMeters: number } {
  const start = points[range.startIdx];
  const end = points[range.endIdx];
  const distanceMeters = end.distanceFromStart - start.distanceFromStart;
  let change = 0;

  for (let i = range.startIdx + 1; i <= range.endIdx; i += 1) {
    const a = points[i - 1].ele;
    const b = points[i].ele;

    if (a === undefined || b === undefined) continue;

    if (direction === 'up' && b > a) {
      change += b - a;
    }

    if (direction === 'down' && b < a) {
      change += a - b;
    }
  }

  return { distanceMeters, elevationChangeMeters: change };
}

function buildSlopeSegment(
  range: IndexRange,
  points: TrackPoint[],
  direction: SlopeDirection,
  idPrefix: string,
  autoName: string,
  filenamePrefix: string,
  index: number,
): SlopeSegment {
  const start = points[range.startIdx];
  const end = points[range.endIdx];
  const startKm = start.distanceFromStart / 1000;
  const endKm = end.distanceFromStart / 1000;
  const segmentPoints = points.slice(range.startIdx, range.endIdx + 1);
  const { distanceMeters, elevationChangeMeters } = computeRangeMetrics(range, points, direction);
  const averageSlopePercent = distanceMeters > 0 ? (elevationChangeMeters / distanceMeters) * 100 : 0;
  const category = direction === 'up' ? categorizeAscent(distanceMeters, averageSlopePercent) : undefined;

  return {
    id: rangeId(idPrefix, startKm, endKm),
    name: `${autoName} ${index + 1}`,
    filename: buildRangeFilename(filenamePrefix, startKm, endKm),
    direction,
    startKm,
    endKm,
    points: segmentPoints,
    distanceMeters,
    elevationChangeMeters,
    averageSlopePercent,
    category,
  };
}

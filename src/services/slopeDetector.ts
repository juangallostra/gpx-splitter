import { TrackPoint } from '../domain/trackPoint';
import { SlopeSegment, SlopeDirection, MountainCategory } from '../domain/slopeSegment';
import { stableSegmentId } from '../domain/trackSegment';

export class SlopeDetectionError extends Error {}

/**
 * Parámetros de detección "de bajo nivel": deciden qué se considera técnicamente un tramo de
 * pendiente (ventana de pendiente, ruido mínimo, fusión de tramos cercanos). Válidos tanto para
 * ascensos como para descensos (cada dirección tiene su propia instancia de estos parámetros).
 */
export interface SlopeDetectionParams {
  /** Pendiente media mínima dentro de la ventana para considerar el tramo "en pendiente" (ej: 0.03 = 3%) */
  minSlope: number;
  /** Tamaño de la ventana deslizante usada para medir la pendiente, en metros */
  windowMeters: number;
  /** Distancia mínima de un tramo candidato para no descartarlo como ruido, en metros */
  minSegmentDistanceM: number;
  /** Desnivel mínimo (ganado o perdido) de un tramo candidato para no descartarlo como ruido, en metros */
  minSegmentGainM: number;
  /** Si el hueco entre dos tramos candidatos es menor o igual a esto, se fusionan en uno solo */
  mergeGapMeters: number;
}

/**
 * Umbrales finales definidos por el usuario para quedarse solo con los tramos "interesantes"
 * de entre todos los detectados.
 */
export interface SlopeFilterParams {
  /** Distancia mínima del tramo final, en km */
  minDistanceKm: number;
  /** Desnivel mínimo (ganado o perdido) del tramo final, en metros */
  minGainFilterM: number;
}

export type SlopeConfig = SlopeDetectionParams & SlopeFilterParams;

interface IndexRange {
  startIdx: number;
  endIdx: number;
}

/**
 * Comprueba si el track tiene datos de elevación suficientes para poder detectar tramos de pendiente.
 * Tolera algún punto suelto sin elevación, pero no un track sin apenas datos de <ele>.
 */
export function hasEnoughElevationData(points: TrackPoint[]): boolean {
  if (points.length === 0) return false;
  const withEle = points.filter((p) => p.ele !== undefined).length;
  return withEle / points.length >= 0.9;
}

/**
 * Detecta los tramos de pendiente (ascenso o descenso) de un track siguiendo estos pasos:
 * 1. Marca qué puntos están "en pendiente" según la pendiente media de una ventana deslizante.
 * 2. Agrupa los puntos marcados en tramos contiguos (candidatos brutos).
 * 3. Fusiona tramos separados por un hueco corto.
 * 4. Descarta candidatos que no llegan a la distancia/desnivel mínimos (ruido).
 * 5. Ajusta el inicio real de cada tramo al último punto "base" (mínimo local en ascensos,
 *    máximo local en descensos) antes de que empiece la pendiente.
 * 6. Recalcula métricas y aplica los umbrales finales definidos por el usuario.
 */
export function detectSlopeSegments(
  points: TrackPoint[],
  config: SlopeConfig,
  direction: SlopeDirection,
  namePrefix: string
): SlopeSegment[] {
  if (points.length < 2) return [];

  if (!hasEnoughElevationData(points)) {
    throw new SlopeDetectionError(
      'El GPX no tiene suficientes datos de elevación para realizar esta detección.'
    );
  }

  const sign = direction === 'up' ? 1 : -1;

  const mask = computeSlopeMask(points, config.minSlope, config.windowMeters, sign);
  const rawCandidates = groupContiguousRanges(mask);
  if (rawCandidates.length === 0) return [];

  const merged = mergeCloseRanges(rawCandidates, points, config.mergeGapMeters);

  const adjusted = merged.map((range) => adjustStart(range, points, sign));

  const denoised = adjusted.filter((range) => {
    const { distanceMeters, changeMeters } = computeRangeMetrics(range, points, sign);
    return distanceMeters >= config.minSegmentDistanceM && changeMeters >= config.minSegmentGainM;
  });

  const segments: SlopeSegment[] = denoised.map((range, index) =>
    buildSlopeSegment(range, points, sign, direction, index, namePrefix)
  );

  return segments.filter(
    (s) => s.distanceMeters / 1000 >= config.minDistanceKm && s.elevationChangeMeters >= config.minGainFilterM
  );
}

/**
 * Para cada punto, mira hacia delante una ventana de `windowMeters` y calcula la pendiente
 * media hasta ahí (con signo, según la dirección buscada). Si supera `minSlope`, marca todo
 * ese rango como "en pendiente" (unión de ventanas).
 */
function computeSlopeMask(
  points: TrackPoint[],
  minSlope: number,
  windowMeters: number,
  sign: 1 | -1
): boolean[] {
  const n = points.length;
  const mask = new Array<boolean>(n).fill(false);

  let j = 0;
  for (let i = 0; i < n; i++) {
    const targetDistance = points[i].distanceFromStart + windowMeters;

    if (j < i) j = i;
    while (j < n - 1 && points[j].distanceFromStart < targetDistance) {
      j++;
    }

    const distanceCovered = points[j].distanceFromStart - points[i].distanceFromStart;
    // Ventana demasiado corta (final del track): no hay datos suficientes para evaluar, se ignora
    if (distanceCovered < 10) continue;

    const eleA = points[i].ele;
    const eleB = points[j].ele;
    if (eleA === undefined || eleB === undefined) continue;

    const slope = (sign * (eleB - eleA)) / distanceCovered;
    if (slope >= minSlope) {
      for (let k = i; k <= j; k++) mask[k] = true;
    }
  }

  return mask;
}

function groupContiguousRanges(mask: boolean[]): IndexRange[] {
  const ranges: IndexRange[] = [];
  let start: number | null = null;

  for (let i = 0; i < mask.length; i++) {
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

/**
 * Fusiona tramos consecutivos si el hueco (en distancia) entre el final de uno y el inicio
 * del siguiente es menor o igual a mergeGapMeters.
 */
function mergeCloseRanges(
  ranges: IndexRange[],
  points: TrackPoint[],
  mergeGapMeters: number
): IndexRange[] {
  if (ranges.length === 0) return [];

  const merged: IndexRange[] = [{ ...ranges[0] }];

  for (let i = 1; i < ranges.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = ranges[i];

    const gap = points[curr.startIdx].distanceFromStart - points[prev.endIdx].distanceFromStart;

    if (gap <= mergeGapMeters) {
      prev.endIdx = curr.endIdx;
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

/**
 * Retrocede desde el inicio del tramo mientras la elevación siga evolucionando estrictamente
 * en sentido contrario (bajando antes de un ascenso, subiendo antes de un descenso), para hacer
 * que el inicio real coincida con el último punto "base" (mínimo/máximo local) antes de la
 * pendiente. Se detiene en un tramo llano para no "tragarse" llanos largos previos.
 */
function adjustStart(range: IndexRange, points: TrackPoint[], sign: 1 | -1): IndexRange {
  let idx = range.startIdx;

  while (idx > 0) {
    const curr = points[idx].ele;
    const prev = points[idx - 1].ele;
    if (curr === undefined || prev === undefined) break;
    // Mientras el punto anterior esté "por debajo" (en el sentido de la subida) del actual,
    // seguimos retrocediendo.
    if (sign * prev < sign * curr) {
      idx--;
    } else {
      break;
    }
  }

  return { startIdx: idx, endIdx: range.endIdx };
}

function computeRangeMetrics(
  range: IndexRange,
  points: TrackPoint[],
  sign: 1 | -1
): { distanceMeters: number; changeMeters: number } {
  const start = points[range.startIdx];
  const end = points[range.endIdx];
  const distanceMeters = end.distanceFromStart - start.distanceFromStart;

  let change = 0;
  for (let i = range.startIdx + 1; i <= range.endIdx; i++) {
    const a = points[i - 1].ele;
    const b = points[i].ele;
    if (a !== undefined && b !== undefined) {
      const delta = sign * (b - a);
      if (delta > 0) change += delta;
    }
  }

  return { distanceMeters, changeMeters: change };
}

function buildSlopeSegment(
  range: IndexRange,
  points: TrackPoint[],
  sign: 1 | -1,
  direction: SlopeDirection,
  index: number,
  namePrefix: string
): SlopeSegment {
  const segmentPoints = points.slice(range.startIdx, range.endIdx + 1);
  const { distanceMeters, changeMeters } = computeRangeMetrics(range, points, sign);
  const start = points[range.startIdx];
  const startKm = start.distanceFromStart / 1000;
  const endKm = points[range.endIdx].distanceFromStart / 1000;
  const averageSlopePercent = distanceMeters > 0 ? (changeMeters / distanceMeters) * 100 : 0;

  return {
    id: stableSegmentId(direction === 'up' ? 'asc' : 'desc', startKm, endKm),
    name: `${namePrefix} ${index + 1}`,
    startKm,
    endKm,
    points: segmentPoints,
    direction,
    distanceMeters,
    elevationChangeMeters: changeMeters,
    averageSlopePercent,
    category: direction === 'up' ? categorizeClimb(distanceMeters / 1000, averageSlopePercent) : null,
  };
}

/**
 * Categorización de puertos orientativa, inspirada en las convenciones ciclistas habituales
 * (no es un estándar oficial: cada federación/organizador usa sus propios criterios).
 * Puntuación = distancia (km) x pendiente media (%).
 */
const CATEGORY_THRESHOLDS: { min: number; category: MountainCategory }[] = [
  { min: 40, category: 'HC' },
  { min: 20, category: '1' },
  { min: 8, category: '2' },
  { min: 3, category: '3' },
];

export function categorizeClimb(distanceKm: number, averageSlopePercent: number): MountainCategory {
  if (distanceKm <= 0 || averageSlopePercent <= 0) return null;
  const score = distanceKm * averageSlopePercent;
  for (const { min, category } of CATEGORY_THRESHOLDS) {
    if (score >= min) return category;
  }
  return null;
}

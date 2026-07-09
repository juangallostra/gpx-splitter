import { TrackPoint } from '../domain/trackPoint';

export type SlopeDirection = 'up' | 'down';

/**
 * Parámetros de detección "de bajo nivel", comunes a ascensos y descensos, pero con
 * instancias y valores por defecto independientes para cada dirección.
 */
export interface SlopeDetectionParams {
  /** Pendiente media mínima dentro de la ventana para considerar el tramo (ej: 0.03 = 3%) */
  minSlope: number;
  /** Tamaño de la ventana deslizante usada para medir la pendiente, en metros */
  windowMeters: number;
  /** Distancia mínima de un tramo candidato para no descartarlo como ruido, en metros */
  minDistanceM: number;
  /** Desnivel mínimo (en valor absoluto) de un tramo candidato para no descartarlo como ruido, en metros */
  minGainM: number;
  /** Si el hueco entre dos tramos candidatos es menor o igual a esto, se fusionan en uno solo */
  mergeGapMeters: number;
}

export interface IndexRange {
  startIdx: number;
  endIdx: number;
}

export interface RangeMetrics {
  distanceMeters: number;
  /** Desnivel en la dirección detectada, siempre positivo (gain para 'up', loss para 'down') */
  elevationChangeMeters: number;
}

/**
 * Detecta los rangos de índices de un track que cumplen los criterios de pendiente en la
 * dirección indicada ('up' para ascensos, 'down' para descensos), siguiendo estos pasos:
 * 1. Marca los puntos "en pendiente" según la pendiente media de una ventana deslizante.
 * 2. Agrupa los puntos marcados en tramos contiguos (candidatos brutos).
 * 3. Fusiona tramos separados por un hueco corto.
 * 4. Ajusta el inicio real de cada tramo al último punto "base" (mínimo local para ascensos,
 *    máximo local para descensos) antes de que empiece la pendiente.
 * 5. Descarta candidatos que no llegan a la distancia/desnivel mínimos (ruido).
 *
 * No aplica los umbrales finales del usuario (eso lo hace cada detector específico, que
 * también necesita las métricas para poder filtrar y construir el segmento final).
 */
export function detectSlopeRanges(
  points: TrackPoint[],
  params: SlopeDetectionParams,
  direction: SlopeDirection
): IndexRange[] {
  if (points.length < 2) return [];

  const sign = direction === 'up' ? 1 : -1;

  const mask = computeSlopeMask(points, params.minSlope, params.windowMeters, sign);
  const raw = groupContiguousRanges(mask);
  if (raw.length === 0) return [];

  const merged = mergeCloseRanges(raw, points, params.mergeGapMeters);
  const adjusted = merged.map((r) => adjustStart(r, points, sign));

  return adjusted.filter((r) => {
    const { distanceMeters, elevationChangeMeters } = computeRangeMetrics(r, points, sign);
    return distanceMeters >= params.minDistanceM && elevationChangeMeters >= params.minGainM;
  });
}

/**
 * Para cada punto, mira hacia delante una ventana de `windowMeters` y calcula la pendiente
 * media (con signo según `sign`) hasta ahí. Si supera `minSlope`, marca todo ese rango.
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

    const directionalSlope = (sign * (eleB - eleA)) / distanceCovered;
    if (directionalSlope >= minSlope) {
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
 * Retrocede desde el inicio del tramo mientras la tendencia (según `sign`) se mantenga
 * estrictamente, para hacer que el inicio real coincida con el último punto "base" (mínimo
 * local en ascensos, máximo local en descensos) antes de que empiece la pendiente. Se detiene
 * en un tramo llano o en cuanto la tendencia se invierte hacia atrás, para no "tragarse"
 * llanos largos previos.
 */
function adjustStart(range: IndexRange, points: TrackPoint[], sign: 1 | -1): IndexRange {
  let idx = range.startIdx;

  while (idx > 0) {
    const curr = points[idx].ele;
    const prev = points[idx - 1].ele;
    if (curr === undefined || prev === undefined) break;
    if (sign * (curr - prev) > 0) {
      idx--;
    } else {
      break;
    }
  }

  return { startIdx: idx, endIdx: range.endIdx };
}

export function computeRangeMetrics(
  range: IndexRange,
  points: TrackPoint[],
  sign: 1 | -1
): RangeMetrics {
  const start = points[range.startIdx];
  const end = points[range.endIdx];
  const distanceMeters = end.distanceFromStart - start.distanceFromStart;

  let change = 0;
  for (let i = range.startIdx + 1; i <= range.endIdx; i++) {
    const a = points[i - 1].ele;
    const b = points[i].ele;
    if (a !== undefined && b !== undefined) {
      const directional = sign * (b - a);
      if (directional > 0) change += directional;
    }
  }

  return { distanceMeters, elevationChangeMeters: change };
}

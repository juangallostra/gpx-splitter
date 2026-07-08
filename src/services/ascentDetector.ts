import { TrackPoint } from '../domain/trackPoint';
import { AscentSegment } from '../domain/ascentSegment';

export class AscentDetectionError extends Error {}

/**
 * Parámetros de detección "de bajo nivel": deciden qué se considera técnicamente una subida
 * (ventana de pendiente, ruido mínimo, fusión de tramos cercanos). Tienen valores por defecto
 * razonables pero son configurables por el usuario en un panel "avanzado".
 */
export interface AscentDetectionParams {
  /** Pendiente media mínima dentro de la ventana para considerar el tramo "en subida" (ej: 0.03 = 3%) */
  minSlope: number;
  /** Tamaño de la ventana deslizante usada para medir la pendiente, en metros */
  windowMeters: number;
  /** Distancia mínima de un tramo candidato para no descartarlo como ruido, en metros */
  minAscentDistanceM: number;
  /** Desnivel positivo mínimo de un tramo candidato para no descartarlo como ruido, en metros */
  minAscentGainM: number;
  /** Si el llano/hueco entre dos tramos candidatos es menor o igual a esto, se fusionan en uno solo */
  mergeGapMeters: number;
}

/**
 * Umbrales finales definidos por el usuario para quedarse solo con los ascensos "interesantes"
 * de entre todos los detectados.
 */
export interface AscentFilterParams {
  /** Distancia mínima del ascenso final, en km */
  minAscentKm: number;
  /** Desnivel positivo mínimo del ascenso final, en metros */
  minAscentGainFilterM: number;
}

export type AscentConfig = AscentDetectionParams & AscentFilterParams;

export const DEFAULT_ASCENT_DETECTION_PARAMS: AscentDetectionParams = {
  minSlope: 0.03, // 3%
  windowMeters: 150,
  minAscentDistanceM: 300,
  minAscentGainM: 20,
  mergeGapMeters: 100,
};

export const DEFAULT_ASCENT_FILTER_PARAMS: AscentFilterParams = {
  minAscentKm: 1,
  minAscentGainFilterM: 50,
};

export const DEFAULT_ASCENT_CONFIG: AscentConfig = {
  ...DEFAULT_ASCENT_DETECTION_PARAMS,
  ...DEFAULT_ASCENT_FILTER_PARAMS,
};

/**
 * Comprueba si el track tiene datos de elevación suficientes para poder detectar ascensos.
 * Tolera algún punto suelto sin elevación, pero no un track sin apenas datos de <ele>.
 */
export function hasEnoughElevationData(points: TrackPoint[]): boolean {
  if (points.length === 0) return false;
  const withEle = points.filter((p) => p.ele !== undefined).length;
  return withEle / points.length >= 0.9;
}

interface IndexRange {
  startIdx: number;
  endIdx: number;
}

/**
 * Detecta los tramos de ascenso de un track siguiendo estos pasos:
 * 1. Marca qué puntos están "en subida" según la pendiente media de una ventana deslizante.
 * 2. Agrupa los puntos marcados en tramos contiguos (candidatos brutos).
 * 3. Fusiona tramos separados por un hueco corto (llano/bajada breve).
 * 4. Descarta candidatos que no llegan a la distancia/desnivel mínimos (ruido).
 * 5. Ajusta el inicio real de cada tramo al último punto bajo antes de la subida.
 * 6. Recalcula métricas y aplica los umbrales finales definidos por el usuario.
 */
export function detectAscents(points: TrackPoint[], config: AscentConfig): AscentSegment[] {
  if (points.length < 2) return [];

  if (!hasEnoughElevationData(points)) {
    throw new AscentDetectionError(
      'El GPX no tiene suficientes datos de elevación para detectar ascensos.'
    );
  }

  const risingMask = computeRisingMask(points, config.minSlope, config.windowMeters);
  const rawCandidates = groupContiguousRanges(risingMask);
  if (rawCandidates.length === 0) return [];

  const merged = mergeCloseRanges(rawCandidates, points, config.mergeGapMeters);

  const adjusted = merged.map((range) => adjustStart(range, points));

  const denoised = adjusted.filter((range) => {
    const { distanceMeters, elevationGainMeters } = computeRangeMetrics(range, points);
    return (
      distanceMeters >= config.minAscentDistanceM && elevationGainMeters >= config.minAscentGainM
    );
  });

  const ascents: AscentSegment[] = denoised.map((range, index) =>
    buildAscentSegment(range, points, index)
  );

  return ascents.filter(
    (a) =>
      a.distanceMeters / 1000 >= config.minAscentKm &&
      a.elevationGainMeters >= config.minAscentGainFilterM
  );
}

/**
 * Para cada punto, mira hacia delante una ventana de `windowMeters` y calcula la pendiente
 * media hasta ahí. Si supera `minSlope`, marca todo ese rango como "en subida" (unión de ventanas).
 */
function computeRisingMask(points: TrackPoint[], minSlope: number, windowMeters: number): boolean[] {
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

    const slope = (eleB - eleA) / distanceCovered;
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
 * Retrocede desde el inicio del tramo mientras la elevación siga bajando estrictamente,
 * para hacer que el inicio real coincida con el último punto bajo (mínimo local) antes de
 * la subida. Se detiene en un tramo llano o en cuanto la elevación empieza a subir hacia
 * atrás, para no "tragarse" llanos largos previos a la subida.
 */
function adjustStart(range: IndexRange, points: TrackPoint[]): IndexRange {
  let idx = range.startIdx;

  while (idx > 0) {
    const curr = points[idx].ele;
    const prev = points[idx - 1].ele;
    if (curr === undefined || prev === undefined) break;
    if (prev < curr) {
      idx--;
    } else {
      break;
    }
  }

  return { startIdx: idx, endIdx: range.endIdx };
}

function computeRangeMetrics(
  range: IndexRange,
  points: TrackPoint[]
): { distanceMeters: number; elevationGainMeters: number } {
  const start = points[range.startIdx];
  const end = points[range.endIdx];
  const distanceMeters = end.distanceFromStart - start.distanceFromStart;

  let gain = 0;
  for (let i = range.startIdx + 1; i <= range.endIdx; i++) {
    const a = points[i - 1].ele;
    const b = points[i].ele;
    if (a !== undefined && b !== undefined && b > a) {
      gain += b - a;
    }
  }

  return { distanceMeters, elevationGainMeters: gain };
}

function buildAscentSegment(range: IndexRange, points: TrackPoint[], index: number): AscentSegment {
  const segmentPoints = points.slice(range.startIdx, range.endIdx + 1);
  const { distanceMeters, elevationGainMeters } = computeRangeMetrics(range, points);
  const start = points[range.startIdx];

  return {
    id: crypto.randomUUID(),
    name: `Ascenso ${index + 1}`,
    startKm: start.distanceFromStart / 1000,
    endKm: points[range.endIdx].distanceFromStart / 1000,
    points: segmentPoints,
    distanceMeters,
    elevationGainMeters,
    averageSlopePercent: distanceMeters > 0 ? (elevationGainMeters / distanceMeters) * 100 : 0,
  };
}

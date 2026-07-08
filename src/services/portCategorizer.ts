import type { PortCategory, SlopeSegment } from '../domain/slopeSegment';

export interface PortCategoryThreshold {
  label: string;
  minScore: number;
  description: string;
}

export const DEFAULT_PORT_CATEGORY_THRESHOLDS: PortCategoryThreshold[] = [
  { label: '3ª', minScore: 40, description: 'Ascenso moderado' },
  { label: '2ª', minScore: 80, description: 'Ascenso exigente' },
  { label: '1ª', minScore: 140, description: 'Puerto duro' },
  { label: 'HC', minScore: 220, description: 'Puerto especial' },
];

export function categorizeAscent(
  distanceMeters: number,
  averageSlopePercent: number,
  thresholds = DEFAULT_PORT_CATEGORY_THRESHOLDS,
): PortCategory | undefined {
  const score = (distanceMeters / 1000) * Math.max(0, averageSlopePercent);
  const sorted = [...thresholds].sort((a, b) => b.minScore - a.minScore);
  const threshold = sorted.find((item) => score >= item.minScore);

  if (!threshold) {
    return undefined;
  }

  return {
    label: threshold.label,
    score,
    description: threshold.description,
  };
}

export function categorizeAscents<T extends SlopeSegment>(segments: T[]): T[] {
  return segments.map((segment) => {
    if (segment.direction !== 'up') return segment;
    return {
      ...segment,
      category: categorizeAscent(segment.distanceMeters, segment.averageSlopePercent),
    };
  });
}

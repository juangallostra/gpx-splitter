import type { TrackSegment } from './trackSegment';

export type SlopeDirection = 'up' | 'down';

export interface PortCategory {
  label: string;
  score: number;
  description: string;
}

export interface SlopeSegment extends TrackSegment {
  direction: SlopeDirection;
  distanceMeters: number;
  /** Desnivel positivo para ascensos y desnivel negativo absoluto para descensos. */
  elevationChangeMeters: number;
  averageSlopePercent: number;
  category?: PortCategory;
}

export type AscentSegment = SlopeSegment & { direction: 'up' };
export type DescentSegment = SlopeSegment & { direction: 'down' };

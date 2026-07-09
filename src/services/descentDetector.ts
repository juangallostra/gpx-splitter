import { TrackPoint } from '../domain/trackPoint';
import { SlopeSegment } from '../domain/slopeSegment';
import {
  SlopeConfig,
  detectSlopeSegments,
  hasEnoughElevationData,
  SlopeDetectionError,
} from './slopeDetector';

export type DescentConfig = SlopeConfig;
export const DescentDetectionError = SlopeDetectionError;
export { hasEnoughElevationData };

export const DEFAULT_DESCENT_CONFIG: DescentConfig = {
  minSlope: 0.03, // 3%
  windowMeters: 150,
  minSegmentDistanceM: 300,
  minSegmentGainM: 20,
  mergeGapMeters: 100,
  minDistanceKm: 1,
  minGainFilterM: 50,
};

export function detectDescents(points: TrackPoint[], config: DescentConfig): SlopeSegment[] {
  return detectSlopeSegments(points, config, 'down', 'Descenso');
}

export {
  DEFAULT_ASCENT_CONFIG,
  DEFAULT_ASCENT_FILTER_PARAMS,
  DEFAULT_SLOPE_DETECTION_PARAMS,
  SlopeDetectionError as AscentDetectionError,
  hasEnoughElevationData,
} from './slopeSegmentDetector';

export type {
  SlopeConfig as AscentConfig,
  SlopeDetectionParams as AscentDetectionParams,
  SlopeFilterParams as AscentFilterParams,
} from './slopeSegmentDetector';

import type { TrackPoint } from '../domain/trackPoint';
import type { AscentSegment } from '../domain/slopeSegment';
import { detectSlopeSegments, type SlopeConfig } from './slopeSegmentDetector';

export function detectAscents(points: TrackPoint[], config: SlopeConfig): AscentSegment[] {
  return detectSlopeSegments(points, config, 'up');
}

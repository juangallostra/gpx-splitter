export {
  DEFAULT_DESCENT_CONFIG,
  DEFAULT_DESCENT_FILTER_PARAMS,
  DEFAULT_SLOPE_DETECTION_PARAMS,
  SlopeDetectionError as DescentDetectionError,
  hasEnoughElevationData,
} from './slopeSegmentDetector';

export type {
  SlopeConfig as DescentConfig,
  SlopeDetectionParams as DescentDetectionParams,
  SlopeFilterParams as DescentFilterParams,
} from './slopeSegmentDetector';

import type { TrackPoint } from '../domain/trackPoint';
import type { DescentSegment } from '../domain/slopeSegment';
import { detectSlopeSegments, type SlopeConfig } from './slopeSegmentDetector';

export function detectDescents(points: TrackPoint[], config: SlopeConfig): DescentSegment[] {
  return detectSlopeSegments(points, config, 'down');
}

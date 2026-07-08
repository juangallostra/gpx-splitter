import type { AscentConfig } from '../services/ascentDetector';
import { DEFAULT_DESCENT_CONFIG, type DescentConfig } from '../services/descentDetector';
import { DEFAULT_SLOPE_DETECTION_PARAMS } from '../services/slopeSegmentDetector';
import { DEFAULT_PORT_CATEGORY_THRESHOLDS } from '../services/portCategorizer';
import { SlopeDetectionPanel } from './SlopeDetectionPanel';

interface AscentDetectionPanelProps {
  config: AscentConfig;
  onChange: (config: AscentConfig) => void;
}

export function AscentDetectionPanel({ config, onChange }: AscentDetectionPanelProps) {
  const descentConfig: DescentConfig = { ...DEFAULT_DESCENT_CONFIG, ...DEFAULT_SLOPE_DETECTION_PARAMS };

  return (
    <SlopeDetectionPanel
      detectionParams={config}
      ascentConfig={config}
      descentConfig={descentConfig}
      onChangeDetectionParams={(params) => onChange({ ...config, ...params })}
      onChangeAscentConfig={onChange}
      onChangeDescentConfig={() => undefined}
      portThresholds={DEFAULT_PORT_CATEGORY_THRESHOLDS}
      onChangePortThresholds={() => undefined}
    />
  );
}

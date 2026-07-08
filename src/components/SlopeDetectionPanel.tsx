import type { SlopeConfig, SlopeDetectionParams } from '../services/slopeSegmentDetector';
import type { PortCategoryThreshold } from '../services/portCategorizer';

interface SlopeDetectionPanelProps {
  detectionParams: SlopeDetectionParams;
  ascentConfig: SlopeConfig;
  descentConfig: SlopeConfig;
  onChangeDetectionParams: (params: SlopeDetectionParams) => void;
  onChangeAscentConfig: (config: SlopeConfig) => void;
  onChangeDescentConfig: (config: SlopeConfig) => void;
  portThresholds: PortCategoryThreshold[];
  onChangePortThresholds: (thresholds: PortCategoryThreshold[]) => void;
}

function NumberField({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="config-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function SlopeDetectionPanel({
  detectionParams,
  ascentConfig,
  descentConfig,
  onChangeDetectionParams,
  onChangeAscentConfig,
  onChangeDescentConfig,
  portThresholds,
  onChangePortThresholds,
}: SlopeDetectionPanelProps) {
  function updateDetection<K extends keyof SlopeDetectionParams>(key: K, value: SlopeDetectionParams[K]) {
    const next = { ...detectionParams, [key]: value };
    onChangeDetectionParams(next);
    onChangeAscentConfig({ ...ascentConfig, [key]: value });
    onChangeDescentConfig({ ...descentConfig, [key]: value });
  }

  return (
    <section className="card">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Análisis automático</p>
          <h2>Ascensos y descensos</h2>
          <p className="muted">
            La pendiente, ventana, ruido y fusión son comunes. Los filtros finales de ascenso y descenso son independientes.
          </p>
        </div>
      </div>

      <div className="config-grid">
        <NumberField
          label="Pendiente mínima (%)"
          value={Number((detectionParams.minSlope * 100).toFixed(2))}
          min={0}
          step={0.1}
          onChange={(value) => updateDetection('minSlope', value / 100)}
        />
        <NumberField
          label="Ventana de cálculo (m)"
          value={detectionParams.windowMeters}
          min={20}
          step={10}
          onChange={(value) => updateDetection('windowMeters', value)}
        />
        <NumberField
          label="Distancia mínima ruido (m)"
          value={detectionParams.minSegmentDistanceM}
          min={0}
          step={10}
          onChange={(value) => updateDetection('minSegmentDistanceM', value)}
        />
        <NumberField
          label="Desnivel mínimo ruido (m)"
          value={detectionParams.minElevationChangeM}
          min={0}
          step={5}
          onChange={(value) => updateDetection('minElevationChangeM', value)}
        />
        <NumberField
          label="Fusionar huecos hasta (m)"
          value={detectionParams.mergeGapMeters}
          min={0}
          step={10}
          onChange={(value) => updateDetection('mergeGapMeters', value)}
        />
      </div>

      <div className="split-config-grid">
        <div className="config-group config-group--up">
          <h3>Filtro de ascensos</h3>
          <NumberField
            label="Km mínimos"
            value={ascentConfig.minSegmentKm}
            min={0}
            step={0.1}
            onChange={(value) => onChangeAscentConfig({ ...ascentConfig, minSegmentKm: value })}
          />
          <NumberField
            label="Desnivel mínimo +m"
            value={ascentConfig.minElevationChangeFilterM}
            min={0}
            step={5}
            onChange={(value) => onChangeAscentConfig({ ...ascentConfig, minElevationChangeFilterM: value })}
          />
        </div>

        <div className="config-group config-group--down">
          <h3>Filtro de descensos</h3>
          <NumberField
            label="Km mínimos"
            value={descentConfig.minSegmentKm}
            min={0}
            step={0.1}
            onChange={(value) => onChangeDescentConfig({ ...descentConfig, minSegmentKm: value })}
          />
          <NumberField
            label="Desnivel mínimo -m"
            value={descentConfig.minElevationChangeFilterM}
            min={0}
            step={5}
            onChange={(value) => onChangeDescentConfig({ ...descentConfig, minElevationChangeFilterM: value })}
          />
        </div>
      </div>

      <div className="config-group port-config">
        <h3>Categorías de puertos</h3>
        <p className="muted small-text">Puntuación = distancia_km × pendiente_media_%. Umbrales orientativos.</p>
        <div className="port-threshold-grid">
          {portThresholds.map((threshold, index) => (
            <label className="config-field" key={threshold.label}>
              <span>{threshold.label}</span>
              <input
                type="number"
                value={threshold.minScore}
                min={0}
                step={5}
                onChange={(event) => {
                  const next = [...portThresholds];
                  next[index] = { ...threshold, minScore: Number(event.target.value) };
                  onChangePortThresholds(next);
                }}
              />
            </label>
          ))}
        </div>
      </div>

    </section>
  );
}

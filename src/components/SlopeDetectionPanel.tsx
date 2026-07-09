import { useState } from 'react';
import { SlopeConfig } from '../services/slopeDetector';

interface SlopeDetectionPanelProps {
  title: string;
  config: SlopeConfig;
  onChange: (config: SlopeConfig) => void;
  distanceLabel?: string;
  gainLabel?: string;
}

export function SlopeDetectionPanel({
  title,
  config,
  onChange,
  distanceLabel = 'Km mínimos del tramo',
  gainLabel = 'Desnivel mínimo (m)',
}: SlopeDetectionPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateField = (field: keyof SlopeConfig, value: number) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="ascent-panel">
      <h3>{title}</h3>

      <div className="ascent-panel__main">
        <label>
          {distanceLabel}
          <input
            type="number"
            min={0}
            step={0.1}
            value={config.minDistanceKm}
            onChange={(e) => updateField('minDistanceKm', Number(e.target.value))}
          />
        </label>

        <label>
          {gainLabel}
          <input
            type="number"
            min={0}
            step={5}
            value={config.minGainFilterM}
            onChange={(e) => updateField('minGainFilterM', Number(e.target.value))}
          />
        </label>
      </div>

      <button
        type="button"
        className="ascent-panel__toggle"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? 'Ocultar opciones avanzadas' : 'Opciones avanzadas'}
      </button>

      {showAdvanced && (
        <div className="ascent-panel__advanced">
          <label>
            Pendiente mínima (%)
            <input
              type="number"
              min={0}
              step={0.5}
              value={config.minSlope * 100}
              onChange={(e) => updateField('minSlope', Number(e.target.value) / 100)}
            />
          </label>

          <label>
            Ventana de cálculo de pendiente (m)
            <input
              type="number"
              min={10}
              step={10}
              value={config.windowMeters}
              onChange={(e) => updateField('windowMeters', Number(e.target.value))}
            />
          </label>

          <label>
            Distancia mínima para no ser ruido (m)
            <input
              type="number"
              min={0}
              step={10}
              value={config.minSegmentDistanceM}
              onChange={(e) => updateField('minSegmentDistanceM', Number(e.target.value))}
            />
          </label>

          <label>
            Desnivel mínimo para no ser ruido (m)
            <input
              type="number"
              min={0}
              step={5}
              value={config.minSegmentGainM}
              onChange={(e) => updateField('minSegmentGainM', Number(e.target.value))}
            />
          </label>

          <label>
            Hueco máximo para fusionar tramos (m)
            <input
              type="number"
              min={0}
              step={10}
              value={config.mergeGapMeters}
              onChange={(e) => updateField('mergeGapMeters', Number(e.target.value))}
            />
          </label>
        </div>
      )}
    </div>
  );
}

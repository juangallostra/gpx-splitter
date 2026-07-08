import { useState } from 'react';
import { AscentConfig } from '../services/ascentDetector';

interface AscentDetectionPanelProps {
  config: AscentConfig;
  onChange: (config: AscentConfig) => void;
}

export function AscentDetectionPanel({ config, onChange }: AscentDetectionPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateField = (field: keyof AscentConfig, value: number) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="ascent-panel">
      <h3>Detección de tramos de ascenso</h3>

      <div className="ascent-panel__main">
        <label>
          Km mínimos del ascenso
          <input
            type="number"
            min={0}
            step={0.1}
            value={config.minAscentKm}
            onChange={(e) => updateField('minAscentKm', Number(e.target.value))}
          />
        </label>

        <label>
          Desnivel positivo mínimo (m)
          <input
            type="number"
            min={0}
            step={5}
            value={config.minAscentGainFilterM}
            onChange={(e) => updateField('minAscentGainFilterM', Number(e.target.value))}
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
              value={config.minAscentDistanceM}
              onChange={(e) => updateField('minAscentDistanceM', Number(e.target.value))}
            />
          </label>

          <label>
            Desnivel mínimo para no ser ruido (m)
            <input
              type="number"
              min={0}
              step={5}
              value={config.minAscentGainM}
              onChange={(e) => updateField('minAscentGainM', Number(e.target.value))}
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

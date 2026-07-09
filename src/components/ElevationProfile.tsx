import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { TrackPoint } from '../domain/trackPoint';
import { TrackSegment } from '../domain/trackSegment';
import { SlopeSegment } from '../domain/slopeSegment';
import { buildElevationProfile } from '../services/elevationProfile';

interface ElevationProfileProps {
  points: TrackPoint[];
  cutPointsKm?: number[];
  segments?: TrackSegment[];
  ascents?: SlopeSegment[];
  descents?: SlopeSegment[];
  highlightedSegmentId?: string | null;
  highlightedAscentId?: string | null;
  highlightedDescentId?: string | null;
  hoveredKm?: number | null;
  onHoverKm?: (km: number | null) => void;
  onAddCutPoint?: (km: number) => void;
  height?: number;
}

// Forma mínima de lo que recharts pasa a onMouseMove/onClick para un AreaChart tipo "number"
interface ChartMouseState {
  activeLabel?: number | string;
}

export function ElevationProfile({
  points,
  cutPointsKm = [],
  segments = [],
  ascents = [],
  descents = [],
  highlightedSegmentId,
  highlightedAscentId,
  highlightedDescentId,
  hoveredKm,
  onHoverKm,
  onAddCutPoint,
  height = 220,
}: ElevationProfileProps) {
  const data = buildElevationProfile(points);

  if (data.length === 0) {
    return (
      <div className="elevation-profile">
        <h3>Perfil de elevación</h3>
        <p>Este GPX no tiene suficientes datos de elevación para mostrar un perfil.</p>
      </div>
    );
  }

  const extractKm = (state: ChartMouseState): number | null => {
    if (state.activeLabel === undefined) return null;
    const km = Number(state.activeLabel);
    return Number.isNaN(km) ? null : km;
  };

  const handleMove = (state: ChartMouseState) => {
    if (!onHoverKm) return;
    onHoverKm(extractKm(state));
  };

  const handleLeave = () => {
    onHoverKm?.(null);
  };

  const handleClick = (state: ChartMouseState) => {
    if (!onAddCutPoint) return;
    const km = extractKm(state);
    if (km !== null) onAddCutPoint(km);
  };

  return (
    <div className="elevation-profile">
      <h3>Perfil de elevación</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onClick={handleClick}
          style={{ cursor: onAddCutPoint ? 'crosshair' : undefined }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="distanceKm"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
            unit=" km"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            width={50}
            tickFormatter={(v: number) => `${Math.round(v)}`}
            unit=" m"
            tick={{ fontSize: 12 }}
            domain={['dataMin - 20', 'dataMax + 20']}
          />
          <Tooltip
            formatter={(value) => [`${Math.round(Number(value))} m`, 'Elevación']}
            labelFormatter={(label) => `Km ${Number(label).toFixed(2)}`}
          />

          {/* Bandas alternas para los segmentos de corte por km */}
          {segments.map((segment, index) => {
            const isHighlighted = segment.id === highlightedSegmentId;
            return (
              <ReferenceArea
                key={segment.id}
                x1={segment.startKm}
                x2={segment.endKm ?? undefined}
                fill={isHighlighted ? '#f97316' : index % 2 === 0 ? '#94a3b8' : 'transparent'}
                fillOpacity={isHighlighted ? 0.25 : 0.08}
                stroke="none"
              />
            );
          })}

          {/* Bandas para los ascensos detectados */}
          {ascents.map((ascent) => {
            const isHighlighted = ascent.id === highlightedAscentId;
            return (
              <ReferenceArea
                key={ascent.id}
                x1={ascent.startKm}
                x2={ascent.endKm ?? undefined}
                fill="#16a34a"
                fillOpacity={isHighlighted ? 0.45 : 0.2}
                stroke="#16a34a"
                strokeOpacity={isHighlighted ? 0.8 : 0}
              />
            );
          })}

          {/* Bandas para los descensos detectados */}
          {descents.map((descent) => {
            const isHighlighted = descent.id === highlightedDescentId;
            return (
              <ReferenceArea
                key={descent.id}
                x1={descent.startKm}
                x2={descent.endKm ?? undefined}
                fill="#7c3aed"
                fillOpacity={isHighlighted ? 0.45 : 0.2}
                stroke="#7c3aed"
                strokeOpacity={isHighlighted ? 0.8 : 0}
              />
            );
          })}

          {/* Líneas de los puntos kilométricos de corte */}
          {cutPointsKm.map((km) => (
            <ReferenceLine key={km} x={km} stroke="#dc2626" strokeDasharray="4 4" />
          ))}

          {/* Línea de sincronización con el hover del mapa */}
          {hoveredKm != null && <ReferenceLine x={hoveredKm} stroke="#0f172a" strokeWidth={1.5} />}

          <Area
            type="monotone"
            dataKey="ele"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.15}
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {(segments.length > 0 || ascents.length > 0 || descents.length > 0) && (
        <div className="elevation-profile__legend">
          {segments.length > 0 && (
            <span>
              <i className="elevation-profile__swatch elevation-profile__swatch--segment" />
              Tramo seleccionado
            </span>
          )}
          {ascents.length > 0 && (
            <span>
              <i className="elevation-profile__swatch elevation-profile__swatch--ascent" />
              Ascenso detectado
            </span>
          )}
          {descents.length > 0 && (
            <span>
              <i className="elevation-profile__swatch elevation-profile__swatch--descent" />
              Descenso detectado
            </span>
          )}
          {cutPointsKm.length > 0 && (
            <span>
              <i className="elevation-profile__swatch elevation-profile__swatch--cut" />
              Punto de corte
            </span>
          )}
        </div>
      )}

      {onAddCutPoint && (
        <p className="elevation-profile__hint">Haz clic en el gráfico para añadir un punto de corte.</p>
      )}
    </div>
  );
}

import { useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { LatLngExpression, LeafletMouseEvent } from 'leaflet';
import { TrackPoint } from '../domain/trackPoint';
import { CutPoint } from '../domain/cutPoint';
import { TrackSegment } from '../domain/trackSegment';
import { SlopeSegment } from '../domain/slopeSegment';
import { findNearestKmToLatLng, findPointAtKm } from '../services/trackGeometry';

interface MapPreviewProps {
  points: TrackPoint[];
  cutPoints: CutPoint[];
  segments?: TrackSegment[];
  highlightedSegmentId?: string | null;
  ascents?: SlopeSegment[];
  highlightedAscentId?: string | null;
  descents?: SlopeSegment[];
  highlightedDescentId?: string | null;
  hoveredKm?: number | null;
  onHoverKm?: (km: number | null) => void;
  onAddCutPoint?: (km: number) => void;
}

export function MapPreview({
  points,
  cutPoints,
  segments,
  highlightedSegmentId,
  ascents,
  highlightedAscentId,
  descents,
  highlightedDescentId,
  hoveredKm,
  onHoverKm,
  onAddCutPoint,
}: MapPreviewProps) {
  if (points.length === 0) return null;

  const positions: LatLngExpression[] = points.map((p) => [p.lat, p.lon]);
  const center = positions[Math.floor(positions.length / 2)];

  // Para cada punto de corte, buscamos la coordenada aproximada en el track
  const cutMarkers = cutPoints.map((cp) => {
    const targetM = cp.km * 1000;
    let closest = points[0];
    let closestDiff = Math.abs(points[0].distanceFromStart - targetM);
    for (const p of points) {
      const diff = Math.abs(p.distanceFromStart - targetM);
      if (diff < closestDiff) {
        closest = p;
        closestDiff = diff;
      }
    }
    return { cutPoint: cp, position: [closest.lat, closest.lon] as LatLngExpression };
  });

  const hoverPoint = hoveredKm != null ? findPointAtKm(points, hoveredKm) : null;

  return (
    <div className="map-preview">
      <MapContainer center={center} zoom={12} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 4 }} />

        {segments?.map((segment) => {
          if (segment.id !== highlightedSegmentId) return null;
          const segPositions: LatLngExpression[] = segment.points.map((p) => [p.lat, p.lon]);
          return (
            <Polyline
              key={segment.id}
              positions={segPositions}
              pathOptions={{ color: '#f97316', weight: 6 }}
            />
          );
        })}

        {ascents?.map((ascent) => {
          const ascentPositions: LatLngExpression[] = ascent.points.map((p) => [p.lat, p.lon]);
          const isSelected = ascent.id === highlightedAscentId;
          return (
            <Polyline
              key={ascent.id}
              positions={ascentPositions}
              pathOptions={{
                color: '#16a34a',
                weight: isSelected ? 8 : 5,
                opacity: isSelected ? 1 : 0.85,
              }}
            >
              <Tooltip sticky>
                {ascent.name} — {(ascent.distanceMeters / 1000).toFixed(2)} km — +
                {Math.round(ascent.elevationChangeMeters)} m
                {ascent.category ? ` — Cat. ${ascent.category}` : ''}
              </Tooltip>
            </Polyline>
          );
        })}

        {descents?.map((descent) => {
          const descentPositions: LatLngExpression[] = descent.points.map((p) => [p.lat, p.lon]);
          const isSelected = descent.id === highlightedDescentId;
          return (
            <Polyline
              key={descent.id}
              positions={descentPositions}
              pathOptions={{
                color: '#7c3aed',
                weight: isSelected ? 8 : 5,
                opacity: isSelected ? 1 : 0.85,
              }}
            >
              <Tooltip sticky>
                {descent.name} — {(descent.distanceMeters / 1000).toFixed(2)} km — -
                {Math.round(descent.elevationChangeMeters)} m
              </Tooltip>
            </Polyline>
          );
        })}

        {cutMarkers.map(({ cutPoint, position }) => (
          <CircleMarker
            key={cutPoint.id}
            center={position}
            radius={7}
            pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1 }}
          >
            <Tooltip>Km {cutPoint.km.toFixed(2)}</Tooltip>
          </CircleMarker>
        ))}

        {hoverPoint && (
          <CircleMarker
            center={[hoverPoint.lat, hoverPoint.lon]}
            radius={6}
            pathOptions={{ color: '#0f172a', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}
            interactive={false}
          />
        )}

        {/* Capa invisible más ancha solo para detectar hover/click de forma fiable,
            por encima visualmente de las bandas de ascenso/descenso/segmento */}
        <TrackInteractionLayer
          points={points}
          positions={positions}
          onHoverKm={onHoverKm}
          onAddCutPoint={onAddCutPoint}
        />
      </MapContainer>
    </div>
  );
}

interface TrackInteractionLayerProps {
  points: TrackPoint[];
  positions: LatLngExpression[];
  onHoverKm?: (km: number | null) => void;
  onAddCutPoint?: (km: number) => void;
}

/**
 * Polilínea invisible pero más gruesa, colocada por encima del resto de capas, dedicada
 * exclusivamente a capturar hover/click sobre el track (evita pelearse con las bandas de
 * ascenso/descenso/segmento que se dibujan encima visualmente).
 */
function TrackInteractionLayer({ points, positions, onHoverKm, onAddCutPoint }: TrackInteractionLayerProps) {
  const rafRef = useRef<number | null>(null);

  const handleMove = (e: LeafletMouseEvent) => {
    if (!onHoverKm) return;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const km = findNearestKmToLatLng(points, e.latlng.lat, e.latlng.lng);
      onHoverKm(km);
    });
  };

  const handleClick = (e: LeafletMouseEvent) => {
    if (!onAddCutPoint) return;
    const km = findNearestKmToLatLng(points, e.latlng.lat, e.latlng.lng);
    if (km !== null) onAddCutPoint(km);
  };

  const handleOut = () => {
    onHoverKm?.(null);
  };

  return (
    <Polyline
      positions={positions}
      pathOptions={{ opacity: 0, weight: 24 }}
      eventHandlers={{
        mousemove: handleMove,
        click: handleClick,
        mouseout: handleOut,
      }}
    />
  );
}

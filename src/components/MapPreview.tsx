import { useEffect, useRef } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LeafletMouseEvent } from 'leaflet';
import type { CutPoint } from '../domain/cutPoint';
import type { TrackPoint } from '../domain/trackPoint';
import type { TrackSegment } from '../domain/trackSegment';
import type { SlopeSegment } from '../domain/slopeSegment';
import { getClosestPoint, getPointAtDistance } from '../services/trackSplitter';

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [32, 32] });
    }
  }, [map, positions]);

  return null;
}

interface MapPreviewProps {
  points: TrackPoint[];
  cutPoints: CutPoint[];
  selectedSegment?: TrackSegment;
  ascents?: SlopeSegment[];
  descents?: SlopeSegment[];
  highlightedAscentId?: string;
  highlightedDescentId?: string;
  hoveredKm?: number | null;
  onHoverKm?: (km: number | null) => void;
  onClickKm?: (km: number) => void;
}

function formatKm(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function positionsFromPoints(points: TrackPoint[]): [number, number][] {
  return points.map((point) => [point.lat, point.lon] as [number, number]);
}

export function MapPreview({
  points,
  cutPoints,
  selectedSegment,
  ascents = [],
  descents = [],
  highlightedAscentId,
  highlightedDescentId,
  hoveredKm,
  onHoverKm,
  onClickKm,
}: MapPreviewProps) {
  const animationFrameRef = useRef<number | null>(null);

  if (points.length === 0) {
    return (
      <section className="card map-card empty-map">
        <p className="eyebrow">Mapa</p>
        <h2>Mapa</h2>
        <p className="muted">Carga un GPX para visualizar el recorrido.</p>
      </section>
    );
  }

  const positions = positionsFromPoints(points);
  const selectedPositions = selectedSegment ? positionsFromPoints(selectedSegment.points) : undefined;
  const center = positions[Math.floor(positions.length / 2)];
  const cutMarkers = cutPoints.map((cutPoint) => ({
    cutPoint,
    point: getPointAtDistance(points, cutPoint.km * 1000),
  }));
  const hoveredPoint = hoveredKm !== null && hoveredKm !== undefined ? getPointAtDistance(points, hoveredKm * 1000) : undefined;

  function updateHoverFromEvent(event: LeafletMouseEvent) {
    if (!onHoverKm) return;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      const closest = getClosestPoint(points, { lat: event.latlng.lat, lon: event.latlng.lng });
      onHoverKm(closest ? closest.distanceFromStart / 1000 : null);
    });
  }

  function handleTrackClick(event: LeafletMouseEvent) {
    const closest = getClosestPoint(points, { lat: event.latlng.lat, lon: event.latlng.lng });
    if (closest) {
      onClickKm?.(closest.distanceFromStart / 1000);
    }
  }

  return (
    <section className="card map-card">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Mapa</p>
          <h2>Mapa</h2>
          <p className="muted">Mueve el ratón sobre el track para sincronizar el perfil. Haz clic para añadir un corte.</p>
        </div>
        {hoveredKm !== null && hoveredKm !== undefined && <span className="pill">Km {formatKm(hoveredKm)}</span>}
      </div>

      <div className="map-wrapper">
        <MapContainer center={center} zoom={13} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds positions={positions} />
          <Polyline
            positions={positions}
            pathOptions={{ weight: 4, color: '#334155' }}
            eventHandlers={{
              mousemove: updateHoverFromEvent,
              mouseout: () => onHoverKm?.(null),
              click: handleTrackClick,
            }}
          />

          {selectedPositions && <Polyline positions={selectedPositions} pathOptions={{ weight: 8, color: '#f97316' }} />}

          {ascents.map((ascent) => (
            <Polyline
              key={ascent.id}
              positions={positionsFromPoints(ascent.points)}
              pathOptions={{ weight: ascent.id === highlightedAscentId ? 8 : 5, color: '#16a34a', opacity: ascent.id === highlightedAscentId ? 0.95 : 0.65 }}
            />
          ))}

          {descents.map((descent) => (
            <Polyline
              key={descent.id}
              positions={positionsFromPoints(descent.points)}
              pathOptions={{ weight: descent.id === highlightedDescentId ? 8 : 5, color: '#0284c7', opacity: descent.id === highlightedDescentId ? 0.95 : 0.65 }}
            />
          ))}

          {hoveredPoint && (
            <CircleMarker center={[hoveredPoint.lat, hoveredPoint.lon]} radius={8} pathOptions={{ weight: 3, color: '#111827', fillOpacity: 0.9 }}>
              <Popup>Km {formatKm(hoveredKm ?? 0)}</Popup>
            </CircleMarker>
          )}

          {cutMarkers.map(({ cutPoint, point }) => (
            <CircleMarker key={cutPoint.id} center={[point.lat, point.lon]} radius={7} pathOptions={{ weight: 3, color: '#dc2626', fillOpacity: 0.85 }}>
              <Popup>Corte en km {formatKm(cutPoint.km)}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

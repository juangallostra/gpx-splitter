import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { TrackPoint } from '../domain/trackPoint';
import { CutPoint } from '../domain/cutPoint';
import { TrackSegment } from '../domain/trackSegment';
import { AscentSegment } from '../domain/ascentSegment';

interface MapPreviewProps {
  points: TrackPoint[];
  cutPoints: CutPoint[];
  segments?: TrackSegment[];
  highlightedSegmentId?: string | null;
  ascents?: AscentSegment[];
  highlightedAscentId?: string | null;
}

export function MapPreview({
  points,
  cutPoints,
  segments,
  highlightedSegmentId,
  ascents,
  highlightedAscentId,
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
                {Math.round(ascent.elevationGainMeters)} m
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
      </MapContainer>
    </div>
  );
}

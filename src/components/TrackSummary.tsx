import { TrackPoint } from '../domain/trackPoint';
import { calculateElevation } from '../services/distanceCalculator';

interface TrackSummaryProps {
  fileName: string;
  points: TrackPoint[];
}

export function TrackSummary({ fileName, points }: TrackSummaryProps) {
  if (points.length === 0) return null;

  const totalDistanceKm = points[points.length - 1].distanceFromStart / 1000;
  const elevation = calculateElevation(points);

  return (
    <div className="track-summary">
      <h2>{fileName}</h2>
      <ul>
        <li>
          <strong>Distancia total:</strong> {totalDistanceKm.toFixed(2)} km
        </li>
        <li>
          <strong>Número de puntos:</strong> {points.length}
        </li>
        {elevation && (
          <>
            <li>
              <strong>Desnivel positivo:</strong> {Math.round(elevation.gainM)} m
            </li>
            <li>
              <strong>Desnivel negativo:</strong> {Math.round(elevation.lossM)} m
            </li>
          </>
        )}
      </ul>
    </div>
  );
}

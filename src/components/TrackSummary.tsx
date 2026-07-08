import type { ElevationStats, TrackPoint } from '../domain/trackPoint';

interface TrackSummaryProps {
  fileName?: string;
  points: TrackPoint[];
  elevationStats: ElevationStats;
}

function formatKm(value: number): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMeters(value: number): string {
  return Math.round(value).toLocaleString('es-ES');
}

export function TrackSummary({ fileName, points, elevationStats }: TrackSummaryProps) {
  const totalKm = points.length > 0 ? points[points.length - 1].distanceFromStart / 1000 : 0;

  return (
    <section className="card">
      <p className="eyebrow">Resumen</p>
      <h2>Track cargado</h2>

      {points.length === 0 ? (
        <p className="muted">Carga un archivo GPX para ver el resumen.</p>
      ) : (
        <div className="summary-grid">
          <div>
            <span>Archivo</span>
            <strong>{fileName}</strong>
          </div>
          <div>
            <span>Distancia total</span>
            <strong>{formatKm(totalKm)} km</strong>
          </div>
          <div>
            <span>Puntos</span>
            <strong>{points.length.toLocaleString('es-ES')}</strong>
          </div>
          <div>
            <span>Desnivel +</span>
            <strong>{formatMeters(elevationStats.positive)} m</strong>
          </div>
          <div>
            <span>Desnivel -</span>
            <strong>{formatMeters(elevationStats.negative)} m</strong>
          </div>
        </div>
      )}
    </section>
  );
}

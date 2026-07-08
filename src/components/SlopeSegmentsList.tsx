import type { SlopeDirection, SlopeSegment } from '../domain/slopeSegment';
import { effectiveSegmentFilename, writeGpx, downloadGpx } from '../services/gpxWriter';
import { downloadZip } from '../services/zipExporter';

interface SlopeSegmentsListProps {
  direction: SlopeDirection;
  segments: SlopeSegment[];
  originalFileName?: string;
  selectedId?: string;
  hoveredKm?: number | null;
  customNames: Record<string, string>;
  onChangeName: (id: string, name: string) => void;
  onSelect: (id: string | undefined) => void;
}

function formatKm(value: number | null): string {
  if (value === null) return 'final';
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isKmInside(segment: SlopeSegment, km?: number | null): boolean {
  if (km === null || km === undefined) return false;
  const endKm = segment.endKm ?? Number.POSITIVE_INFINITY;
  return km >= segment.startKm && km <= endKm;
}

export function SlopeSegmentsList({
  direction,
  segments,
  originalFileName,
  selectedId,
  hoveredKm,
  customNames,
  onChangeName,
  onSelect,
}: SlopeSegmentsListProps) {
  const isUp = direction === 'up';
  const title = isUp ? 'Ascensos detectados' : 'Descensos detectados';
  const emptyText = isUp
    ? 'No se ha detectado ningún tramo de ascenso que cumpla los umbrales indicados.'
    : 'No se ha detectado ningún tramo de descenso que cumpla los umbrales indicados.';
  const zipName = isUp ? 'ascensos_gpx.zip' : 'descensos_gpx.zip';
  const sign = isUp ? '+' : '-';

  if (segments.length === 0) {
    return (
      <section className="card slope-list">
        <h2>{title}</h2>
        <p className="muted">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className={`card slope-list slope-list--${direction}`}>
      <div className="section-title-row">
        <div>
          <p className="eyebrow">{isUp ? 'Subidas' : 'Bajadas'}</p>
          <h2>{title} ({segments.length})</h2>
        </div>
        <button type="button" onClick={() => downloadZip(segments, originalFileName, zipName)}>
          Descargar ZIP
        </button>
      </div>

      <div className="segment-list">
        {segments.map((segment) => {
          const isSelected = segment.id === selectedId;
          const isHovered = isKmInside(segment, hoveredKm);

          return (
            <article
              key={segment.id}
              className={`segment-item ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
            >
              <div className="segment-item__main">
                <label className="inline-label">
                  Nombre
                  <input
                    type="text"
                    value={customNames[segment.id] ?? segment.name}
                    onChange={(event) => onChangeName(segment.id, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </label>
                <span>
                  km {formatKm(segment.startKm)} → km {formatKm(segment.endKm)} · {(segment.distanceMeters / 1000).toFixed(2)} km · {sign}{Math.round(segment.elevationChangeMeters)} m · {segment.averageSlopePercent.toFixed(1)}%
                </span>
                <span className="muted small-text">Archivo: {effectiveSegmentFilename(segment)}</span>
              </div>

              <div className="segment-actions segment-actions--stacked">
                {segment.category && (
                  <span className="category-badge" title={`${segment.category.description}. Puntuación ${segment.category.score.toFixed(0)}`}>
                    {segment.category.label}
                  </span>
                )}
                <button className="button-secondary" type="button" onClick={() => onSelect(isSelected ? undefined : segment.id)}>
                  {isSelected ? 'Quitar resaltado' : 'Resaltar'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadGpx(effectiveSegmentFilename(segment), writeGpx(segment, originalFileName))}
                >
                  Descargar GPX
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

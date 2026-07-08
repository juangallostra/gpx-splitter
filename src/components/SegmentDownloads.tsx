import type { TrackSegment } from '../domain/trackSegment';
import { downloadGpx, effectiveSegmentFilename, writeGpx } from '../services/gpxWriter';
import { downloadZip } from '../services/zipExporter';

interface SegmentDownloadsProps {
  segments: TrackSegment[];
  originalFileName?: string;
  selectedSegmentId?: string;
  hoveredKm?: number | null;
  customNames: Record<string, string>;
  onChangeName: (id: string, name: string) => void;
  onSelectSegment: (id: string | undefined) => void;
}

function formatKm(value: number | null): string {
  if (value === null) {
    return 'final';
  }

  return value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isKmInsideSegment(segment: TrackSegment, km?: number | null): boolean {
  if (km === null || km === undefined) return false;
  const endKm = segment.endKm ?? Number.POSITIVE_INFINITY;
  return km >= segment.startKm && km <= endKm;
}

export function SegmentDownloads({
  segments,
  originalFileName,
  selectedSegmentId,
  hoveredKm,
  customNames,
  onChangeName,
  onSelectSegment,
}: SegmentDownloadsProps) {
  async function handleZipDownload() {
    await downloadZip(segments, originalFileName);
  }

  if (segments.length === 0) {
    return (
      <section className="card">
        <p className="eyebrow">Paso 3</p>
        <h2>Segmentos</h2>
        <p className="muted">Carga un track para generar segmentos.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Paso 3</p>
          <h2>Segmentos generados</h2>
          <p className="muted">Edita el nombre visible; también se usará como prefijo del archivo GPX.</p>
        </div>
        <button type="button" onClick={handleZipDownload}>
          Descargar ZIP
        </button>
      </div>

      <div className="segment-list">
        {segments.map((segment) => {
          const isSelected = segment.id === selectedSegmentId;
          const isHovered = isKmInsideSegment(segment, hoveredKm);

          return (
            <article
              className={`segment-item ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
              key={segment.id}
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
                  km {formatKm(segment.startKm)} → km {formatKm(segment.endKm)} · {segment.points.length} puntos
                </span>
                <span className="muted small-text">Archivo: {effectiveSegmentFilename(segment)}</span>
              </div>
              <div className="segment-actions">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => onSelectSegment(isSelected ? undefined : segment.id)}
                >
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

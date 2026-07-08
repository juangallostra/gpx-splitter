import { AscentSegment } from '../domain/ascentSegment';
import { segmentFileName } from '../domain/trackSegment';
import { writeGpx, downloadGpx } from '../services/gpxWriter';
import { downloadZip } from '../services/zipExporter';

interface AscentSegmentsListProps {
  ascents: AscentSegment[];
  originalFileName?: string;
  selectedAscentId?: string | null;
  onSelectAscent?: (id: string | null) => void;
}

export function AscentSegmentsList({
  ascents,
  originalFileName,
  selectedAscentId,
  onSelectAscent,
}: AscentSegmentsListProps) {
  if (ascents.length === 0) {
    return (
      <div className="ascent-list">
        <h3>Ascensos detectados</h3>
        <p>No se ha detectado ningún tramo de ascenso que cumpla los umbrales indicados.</p>
      </div>
    );
  }

  const handleDownloadOne = (ascent: AscentSegment) => {
    const gpxContent = writeGpx(ascent, originalFileName);
    downloadGpx(`ascenso_${ascent.name.replace(/\s+/g, '_').toLowerCase()}_${segmentFileName(ascent)}`, gpxContent);
  };

  const handleDownloadAll = () => {
    downloadZip(ascents, originalFileName, 'ascensos_gpx.zip');
  };

  return (
    <div className="ascent-list">
      <div className="ascent-list__header">
        <h3>Ascensos detectados ({ascents.length})</h3>
        <button type="button" onClick={handleDownloadAll}>
          Descargar todo (.zip)
        </button>
      </div>

      <ul>
        {ascents.map((ascent) => (
          <li
            key={ascent.id}
            className={selectedAscentId === ascent.id ? 'ascent-list__item--active' : ''}
            onClick={() => onSelectAscent?.(ascent.id === selectedAscentId ? null : ascent.id)}
          >
            <div className="ascent-list__info">
              <strong>{ascent.name}</strong>
              <span>{(ascent.distanceMeters / 1000).toFixed(2)} km</span>
              <span>+{Math.round(ascent.elevationGainMeters)} m</span>
              <span>{ascent.averageSlopePercent.toFixed(1)}% pendiente media</span>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); handleDownloadOne(ascent); }}>
              Descargar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

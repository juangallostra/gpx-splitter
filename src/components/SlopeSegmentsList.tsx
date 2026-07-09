import { SlopeSegment } from '../domain/slopeSegment';
import { segmentFileName } from '../domain/trackSegment';
import { writeGpx, downloadGpx } from '../services/gpxWriter';
import { downloadZip } from '../services/zipExporter';
import { EditableName } from './EditableName';

interface SlopeSegmentsListProps {
  title: string;
  emptyMessage: string;
  segments: SlopeSegment[];
  originalFileName?: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onRename?: (id: string, newName: string) => void;
  colorClass: 'ascent-list' | 'descent-list';
  fileNamePrefix: string;
  showCategory?: boolean;
}

export function SlopeSegmentsList({
  title,
  emptyMessage,
  segments,
  originalFileName,
  selectedId,
  onSelect,
  onRename,
  colorClass,
  fileNamePrefix,
  showCategory = false,
}: SlopeSegmentsListProps) {
  if (segments.length === 0) {
    return (
      <div className={colorClass}>
        <h3>{title}</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const handleDownloadOne = (segment: SlopeSegment) => {
    const gpxContent = writeGpx(segment, originalFileName);
    downloadGpx(
      `${fileNamePrefix}_${segment.name.replace(/\s+/g, '_').toLowerCase()}_${segmentFileName(segment)}`,
      gpxContent
    );
  };

  const handleDownloadAll = () => {
    downloadZip(segments, originalFileName, `${fileNamePrefix}s_gpx.zip`);
  };

  return (
    <div className={colorClass}>
      <div className={`${colorClass}__header`}>
        <h3>
          {title} ({segments.length})
        </h3>
        <button type="button" onClick={handleDownloadAll}>
          Descargar todo (.zip)
        </button>
      </div>

      <ul>
        {segments.map((segment) => (
          <li
            key={segment.id}
            className={selectedId === segment.id ? `${colorClass}__item--active` : ''}
            onClick={() => onSelect?.(segment.id === selectedId ? null : segment.id)}
          >
            <div className={`${colorClass}__info`}>
              {onRename ? (
                <EditableName name={segment.name} onRename={(newName) => onRename(segment.id, newName)} />
              ) : (
                <strong>{segment.name}</strong>
              )}
              {showCategory && segment.category && (
                <span className={`category-badge category-badge--${segment.category}`}>
                  Cat. {segment.category}
                </span>
              )}
              <span>{(segment.distanceMeters / 1000).toFixed(2)} km</span>
              <span>
                {segment.direction === 'up' ? '+' : '-'}
                {Math.round(segment.elevationChangeMeters)} m
              </span>
              <span>{segment.averageSlopePercent.toFixed(1)}% pendiente media</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadOne(segment);
              }}
            >
              Descargar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

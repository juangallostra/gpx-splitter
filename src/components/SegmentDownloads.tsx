import { TrackSegment, segmentFileName } from '../domain/trackSegment';
import { writeGpx, downloadGpx } from '../services/gpxWriter';
import { downloadZip } from '../services/zipExporter';
import { EditableName } from './EditableName';

interface SegmentDownloadsProps {
  segments: TrackSegment[];
  originalFileName?: string;
  onSelectSegment?: (id: string | null) => void;
  selectedSegmentId?: string | null;
  onRenameSegment?: (id: string, newName: string) => void;
}

export function SegmentDownloads({
  segments,
  originalFileName,
  onSelectSegment,
  selectedSegmentId,
  onRenameSegment,
}: SegmentDownloadsProps) {
  if (segments.length === 0) return null;

  const handleDownloadOne = (segment: TrackSegment) => {
    const gpxContent = writeGpx(segment, originalFileName);
    downloadGpx(segmentFileName(segment), gpxContent);
  };

  const handleDownloadAll = () => {
    downloadZip(segments, originalFileName);
  };

  return (
    <div className="segment-downloads">
      <div className="segment-downloads__header">
        <h3>Segmentos generados ({segments.length})</h3>
        <button type="button" onClick={handleDownloadAll}>
          Descargar todo (.zip)
        </button>
      </div>

      <ul>
        {segments.map((segment) => (
          <li
            key={segment.id}
            className={selectedSegmentId === segment.id ? 'segment-downloads__item--active' : ''}
            onClick={() => onSelectSegment?.(segment.id === selectedSegmentId ? null : segment.id)}
          >
            <span className="segment-downloads__info">
              {onRenameSegment ? (
                <EditableName
                  name={segment.name}
                  onRename={(newName) => onRenameSegment(segment.id, newName)}
                />
              ) : (
                <strong>{segment.name}</strong>
              )}
              <span>
                {segmentFileName(segment)} — {segment.points.length} puntos —{' '}
                {(
                  (segment.points[segment.points.length - 1].distanceFromStart -
                    segment.points[0].distanceFromStart) /
                  1000
                ).toFixed(2)}{' '}
                km
              </span>
            </span>
            <button type="button" onClick={(e) => { e.stopPropagation(); handleDownloadOne(segment); }}>
              Descargar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

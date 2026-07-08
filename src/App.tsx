import { useMemo, useState } from 'react';
import { GpxUploader } from './components/GpxUploader';
import { TrackSummary } from './components/TrackSummary';
import { CutPointsTable } from './components/CutPointsTable';
import { MapPreview } from './components/MapPreview';
import { SegmentDownloads } from './components/SegmentDownloads';
import { TrackPoint } from './domain/trackPoint';
import { CutPoint } from './domain/cutPoint';
import { parseGpx, GpxParseError } from './services/gpxParser';
import { calculateDistances } from './services/distanceCalculator';
import { splitTrackByKilometers, TrackSplitError } from './services/trackSplitter';
import './styles.css';

export default function App() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [cutPoints, setCutPoints] = useState<CutPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const totalDistanceKm = points.length > 0 ? points[points.length - 1].distanceFromStart / 1000 : 0;

  const segments = useMemo(() => {
    if (points.length < 2 || cutPoints.length === 0) return [];
    try {
      const result = splitTrackByKilometers(
        points,
        cutPoints.map((cp) => cp.km)
      );
      setError(null);
      return result;
    } catch (e) {
      if (e instanceof TrackSplitError) {
        setError(e.message);
      }
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, cutPoints]);

  const handleFileLoaded = (name: string, content: string) => {
    try {
      const rawPoints = parseGpx(content);
      const withDistances = calculateDistances(rawPoints);
      setFileName(name);
      setPoints(withDistances);
      setCutPoints([]);
      setSelectedSegmentId(null);
      setError(null);
    } catch (e) {
      if (e instanceof GpxParseError) {
        setError(e.message);
      } else {
        setError('Ocurrió un error inesperado al procesar el archivo.');
      }
      setFileName(null);
      setPoints([]);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>GPX Splitter</h1>
        <p>Corta un track GPX en varios segmentos según puntos kilométricos.</p>
      </header>

      <GpxUploader onFileLoaded={handleFileLoaded} onError={setError} />

      {error && <p className="app__error">{error}</p>}

      {points.length > 0 && fileName && (
        <>
          <TrackSummary fileName={fileName} points={points} />

          <CutPointsTable
            cutPoints={cutPoints}
            totalDistanceKm={totalDistanceKm}
            onChange={setCutPoints}
          />

          <MapPreview
            points={points}
            cutPoints={cutPoints}
            segments={segments}
            highlightedSegmentId={selectedSegmentId}
          />

          <SegmentDownloads
            segments={segments}
            originalFileName={fileName}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={setSelectedSegmentId}
          />
        </>
      )}
    </div>
  );
}

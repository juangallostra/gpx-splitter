import { useMemo, useState } from 'react';
import { GpxUploader } from './components/GpxUploader';
import { TrackSummary } from './components/TrackSummary';
import { CutPointsTable } from './components/CutPointsTable';
import { MapPreview } from './components/MapPreview';
import { SegmentDownloads } from './components/SegmentDownloads';
import { SlopeDetectionPanel } from './components/SlopeDetectionPanel';
import { SlopeSegmentsList } from './components/SlopeSegmentsList';
import { ElevationProfile } from './components/ElevationProfile';
import { TrackPoint } from './domain/trackPoint';
import { CutPoint, validateCutPoint, createCutPoint, sortCutPoints } from './domain/cutPoint';
import { TrackSegment } from './domain/trackSegment';
import { SlopeSegment } from './domain/slopeSegment';
import { parseGpx, GpxParseError } from './services/gpxParser';
import { calculateDistances } from './services/distanceCalculator';
import { splitTrackByKilometers, TrackSplitError } from './services/trackSplitter';
import {
  detectAscents,
  hasEnoughElevationData,
  AscentDetectionError,
  DEFAULT_ASCENT_CONFIG,
  AscentConfig,
} from './services/ascentDetector';
import { detectDescents, DescentDetectionError, DEFAULT_DESCENT_CONFIG, DescentConfig } from './services/descentDetector';
import './styles.css';

function applyCustomNames<T extends { id: string; name: string }>(
  items: T[],
  customNames: Record<string, string>
): T[] {
  return items.map((item) => (customNames[item.id] ? { ...item, name: customNames[item.id] } : item));
}

export default function App() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [cutPoints, setCutPoints] = useState<CutPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const [ascentConfig, setAscentConfig] = useState<AscentConfig>(DEFAULT_ASCENT_CONFIG);
  const [ascentError, setAscentError] = useState<string | null>(null);
  const [selectedAscentId, setSelectedAscentId] = useState<string | null>(null);

  const [descentConfig, setDescentConfig] = useState<DescentConfig>(DEFAULT_DESCENT_CONFIG);
  const [descentError, setDescentError] = useState<string | null>(null);
  const [selectedDescentId, setSelectedDescentId] = useState<string | null>(null);

  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [hoveredKm, setHoveredKm] = useState<number | null>(null);
  const [lastCutAdd, setLastCutAdd] = useState<{ km: number; previousCutPoints: CutPoint[] } | null>(
    null
  );

  const totalDistanceKm = points.length > 0 ? points[points.length - 1].distanceFromStart / 1000 : 0;
  const elevationAvailable = useMemo(() => hasEnoughElevationData(points), [points]);

  const segments: TrackSegment[] = useMemo(() => {
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

  const ascents: SlopeSegment[] = useMemo(() => {
    if (points.length < 2 || !elevationAvailable) return [];
    try {
      const result = detectAscents(points, ascentConfig);
      setAscentError(null);
      return result;
    } catch (e) {
      if (e instanceof AscentDetectionError) {
        setAscentError(e.message);
      }
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, ascentConfig, elevationAvailable]);

  const descents: SlopeSegment[] = useMemo(() => {
    if (points.length < 2 || !elevationAvailable) return [];
    try {
      const result = detectDescents(points, descentConfig);
      setDescentError(null);
      return result;
    } catch (e) {
      if (e instanceof DescentDetectionError) {
        setDescentError(e.message);
      }
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, descentConfig, elevationAvailable]);

  const namedSegments = useMemo(() => applyCustomNames(segments, customNames), [segments, customNames]);
  const namedAscents = useMemo(() => applyCustomNames(ascents, customNames), [ascents, customNames]);
  const namedDescents = useMemo(() => applyCustomNames(descents, customNames), [descents, customNames]);

  const handleFileLoaded = (name: string, content: string) => {
    try {
      const rawPoints = parseGpx(content);
      const withDistances = calculateDistances(rawPoints);
      setFileName(name);
      setPoints(withDistances);
      setCutPoints([]);
      setSelectedSegmentId(null);
      setSelectedAscentId(null);
      setSelectedDescentId(null);
      setCustomNames({});
      setHoveredKm(null);
      setLastCutAdd(null);
      setError(null);
      setAscentError(null);
      setDescentError(null);
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

  const handleAddCutPoint = (km: number) => {
    const rounded = Math.round(km * 1000) / 1000;
    const validation = validateCutPoint(rounded, totalDistanceKm, cutPoints);
    if (!validation.valid) {
      setError(validation.error ?? 'No se pudo añadir el punto de corte.');
      return;
    }
    const previousCutPoints = cutPoints;
    const updated = sortCutPoints([...cutPoints, createCutPoint(rounded)]);
    setCutPoints(updated);
    setLastCutAdd({ km: rounded, previousCutPoints });
    setError(null);
  };

  const handleUndoAddCutPoint = () => {
    if (!lastCutAdd) return;
    setCutPoints(lastCutAdd.previousCutPoints);
    setLastCutAdd(null);
  };

  const handleRename = (id: string, newName: string) => {
    setCustomNames((prev) => ({ ...prev, [id]: newName }));
  };

  return (
    <div className="app">
      <header>
        <h1>GPX Splitter</h1>
        <p>Corta un track GPX en varios segmentos según puntos kilométricos.</p>
      </header>

      <GpxUploader onFileLoaded={handleFileLoaded} onError={setError} />

      {error && <p className="app__error">{error}</p>}

      {lastCutAdd && (
        <p className="app__notice">
          Punto de corte añadido en km {lastCutAdd.km.toFixed(2)}.{' '}
          <button type="button" className="app__notice-undo" onClick={handleUndoAddCutPoint}>
            Deshacer
          </button>
        </p>
      )}

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
            segments={namedSegments}
            highlightedSegmentId={selectedSegmentId}
            ascents={namedAscents}
            highlightedAscentId={selectedAscentId}
            descents={namedDescents}
            highlightedDescentId={selectedDescentId}
            hoveredKm={hoveredKm}
            onHoverKm={setHoveredKm}
            onAddCutPoint={handleAddCutPoint}
          />

          <SegmentDownloads
            segments={namedSegments}
            originalFileName={fileName}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={setSelectedSegmentId}
            onRenameSegment={handleRename}
          />

          {elevationAvailable ? (
            <>
              <SlopeDetectionPanel
                title="Detección de tramos de ascenso"
                config={ascentConfig}
                onChange={setAscentConfig}
                distanceLabel="Km mínimos del ascenso"
                gainLabel="Desnivel positivo mínimo (m)"
              />
              {ascentError && <p className="app__error">{ascentError}</p>}

              <SlopeDetectionPanel
                title="Detección de tramos de descenso"
                config={descentConfig}
                onChange={setDescentConfig}
                distanceLabel="Km mínimos del descenso"
                gainLabel="Desnivel negativo mínimo (m)"
              />
              {descentError && <p className="app__error">{descentError}</p>}

              <ElevationProfile
                points={points}
                cutPointsKm={cutPoints.map((cp) => cp.km)}
                segments={namedSegments}
                ascents={namedAscents}
                descents={namedDescents}
                highlightedSegmentId={selectedSegmentId}
                highlightedAscentId={selectedAscentId}
                highlightedDescentId={selectedDescentId}
                hoveredKm={hoveredKm}
                onHoverKm={setHoveredKm}
                onAddCutPoint={handleAddCutPoint}
              />

              <SlopeSegmentsList
                title="Ascensos detectados"
                emptyMessage="No se ha detectado ningún tramo de ascenso que cumpla los umbrales indicados."
                segments={namedAscents}
                originalFileName={fileName}
                selectedId={selectedAscentId}
                onSelect={setSelectedAscentId}
                onRename={handleRename}
                colorClass="ascent-list"
                fileNamePrefix="ascenso"
                showCategory
              />

              <SlopeSegmentsList
                title="Descensos detectados"
                emptyMessage="No se ha detectado ningún tramo de descenso que cumpla los umbrales indicados."
                segments={namedDescents}
                originalFileName={fileName}
                selectedId={selectedDescentId}
                onSelect={setSelectedDescentId}
                onRename={handleRename}
                colorClass="descent-list"
                fileNamePrefix="descenso"
              />
            </>
          ) : (
            <div className="ascent-list">
              <h3>Detección de tramos de ascenso/descenso</h3>
              <p>
                Este GPX no tiene suficientes datos de elevación (&lt;ele&gt;) como para detectar
                tramos de ascenso o descenso.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

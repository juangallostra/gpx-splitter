import { useMemo, useState } from 'react';
import { CutPointsTable } from './components/CutPointsTable';
import { ElevationProfile } from './components/ElevationProfile';
import { GpxUploader } from './components/GpxUploader';
import { MapPreview } from './components/MapPreview';
import { SegmentDownloads } from './components/SegmentDownloads';
import { SlopeDetectionPanel } from './components/SlopeDetectionPanel';
import { SlopeSegmentsList } from './components/SlopeSegmentsList';
import { TrackSummary } from './components/TrackSummary';
import type { CutPoint } from './domain/cutPoint';
import type { TrackPoint } from './domain/trackPoint';
import type { TrackSegment } from './domain/trackSegment';
import type { SlopeSegment } from './domain/slopeSegment';
import { calculateDistances, calculateElevationStats } from './services/distanceCalculator';
import { parseGpx } from './services/gpxParser';
import { stableCutPointId } from './services/idUtils';
import { DEFAULT_ASCENT_CONFIG, detectAscents } from './services/ascentDetector';
import { DEFAULT_DESCENT_CONFIG, detectDescents } from './services/descentDetector';
import {
  DEFAULT_SLOPE_DETECTION_PARAMS,
  hasEnoughElevationData,
  SlopeDetectionError,
  type SlopeConfig,
  type SlopeDetectionParams,
} from './services/slopeSegmentDetector';
import { DEFAULT_PORT_CATEGORY_THRESHOLDS, categorizeAscent, type PortCategoryThreshold } from './services/portCategorizer';
import { splitTrackByKilometers, TrackSplitError } from './services/trackSplitter';
import './styles.css';

function parseKmValue(value: string): number | undefined {
  const normalizedValue = value.trim().replace(',', '.');
  if (!normalizedValue) {
    return undefined;
  }

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildCutPointValidationError(
  km: number | undefined,
  totalKm: number,
  existingCutPoints: CutPoint[],
  currentId?: string,
): string | undefined {
  if (km === undefined) {
    return 'Introduce un valor numérico válido.';
  }

  if (km <= 0) {
    return 'El punto kilométrico debe ser mayor que 0.';
  }

  if (km >= totalKm) {
    return 'El punto kilométrico debe ser menor que la distancia total del track.';
  }

  const isDuplicate = existingCutPoints.some(
    (cutPoint) => cutPoint.id !== currentId && Math.abs(cutPoint.km - km) < 0.001,
  );

  if (isDuplicate) {
    return 'Ya existe un punto de corte con ese kilometraje.';
  }

  return undefined;
}

function sortCutPoints(cutPoints: CutPoint[]): CutPoint[] {
  return [...cutPoints].sort((a, b) => a.km - b.km);
}

function applyCustomNames<T extends TrackSegment>(items: T[], customNames: Record<string, string>): T[] {
  return items.map((item) => {
    const customName = customNames[item.id]?.trim();
    return customName ? { ...item, name: customName } : item;
  });
}

function ensureSharedDetectionParams(config: SlopeConfig, detectionParams: SlopeDetectionParams): SlopeConfig {
  return {
    ...config,
    minSlope: detectionParams.minSlope,
    windowMeters: detectionParams.windowMeters,
    minSegmentDistanceM: detectionParams.minSegmentDistanceM,
    minElevationChangeM: detectionParams.minElevationChangeM,
    mergeGapMeters: detectionParams.mergeGapMeters,
  };
}

export default function App() {
  const [fileName, setFileName] = useState<string | undefined>();
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [cutPoints, setCutPoints] = useState<CutPoint[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [analysisError, setAnalysisError] = useState<string | undefined>();
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | undefined>();
  const [selectedAscentId, setSelectedAscentId] = useState<string | undefined>();
  const [selectedDescentId, setSelectedDescentId] = useState<string | undefined>();
  const [hoveredKm, setHoveredKm] = useState<number | null>(null);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [lastAddedCutPoint, setLastAddedCutPoint] = useState<CutPoint | undefined>();
  const [detectionParams, setDetectionParams] = useState<SlopeDetectionParams>(DEFAULT_SLOPE_DETECTION_PARAMS);
  const [ascentConfig, setAscentConfig] = useState<SlopeConfig>(DEFAULT_ASCENT_CONFIG);
  const [descentConfig, setDescentConfig] = useState<SlopeConfig>(DEFAULT_DESCENT_CONFIG);
  const [portThresholds, setPortThresholds] = useState<PortCategoryThreshold[]>(DEFAULT_PORT_CATEGORY_THRESHOLDS);

  const totalKm = points.length > 0 ? points[points.length - 1].distanceFromStart / 1000 : 0;
  const elevationStats = useMemo(() => calculateElevationStats(points), [points]);
  const elevationAvailable = useMemo(() => hasEnoughElevationData(points), [points]);

  const rawSegments = useMemo(() => {
    if (points.length < 2) {
      return [];
    }

    try {
      return splitTrackByKilometers(
        points,
        cutPoints.map((cutPoint) => cutPoint.km),
      );
    } catch (caughtError) {
      setError(caughtError instanceof TrackSplitError ? caughtError.message : 'No se ha podido cortar el track.');
      return [];
    }
  }, [cutPoints, points]);

  const rawAscents = useMemo(() => {
    if (points.length < 2 || !elevationAvailable) return [];

    try {
      const result = detectAscents(points, ensureSharedDetectionParams(ascentConfig, detectionParams));
      setAnalysisError(undefined);
      return result;
    } catch (caughtError) {
      if (caughtError instanceof SlopeDetectionError) {
        setAnalysisError(caughtError.message);
      }
      return [];
    }
  }, [points, ascentConfig, detectionParams, elevationAvailable]);

  const rawDescents = useMemo(() => {
    if (points.length < 2 || !elevationAvailable) return [];

    try {
      const result = detectDescents(points, ensureSharedDetectionParams(descentConfig, detectionParams));
      setAnalysisError(undefined);
      return result;
    } catch (caughtError) {
      if (caughtError instanceof SlopeDetectionError) {
        setAnalysisError(caughtError.message);
      }
      return [];
    }
  }, [points, descentConfig, detectionParams, elevationAvailable]);

  const segments = useMemo(() => applyCustomNames(rawSegments, customNames), [rawSegments, customNames]);
  const ascentsWithCategories = useMemo(
    () =>
      rawAscents.map((ascent) => ({
        ...ascent,
        category: categorizeAscent(ascent.distanceMeters, ascent.averageSlopePercent, portThresholds),
      })),
    [rawAscents, portThresholds],
  );
  const ascents = useMemo(() => applyCustomNames(ascentsWithCategories, customNames), [ascentsWithCategories, customNames]);
  const descents = useMemo(() => applyCustomNames(rawDescents, customNames), [rawDescents, customNames]);

  const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId);

  function resetSelection() {
    setSelectedSegmentId(undefined);
    setSelectedAscentId(undefined);
    setSelectedDescentId(undefined);
  }

  function handleFileLoaded(nextFileName: string, xml: string) {
    try {
      const parsedPoints = parseGpx(xml);
      const pointsWithDistances = calculateDistances(parsedPoints);

      if (pointsWithDistances.length < 2) {
        throw new Error('El GPX necesita al menos dos puntos de track para poder calcular distancia.');
      }

      setFileName(nextFileName);
      setPoints(pointsWithDistances);
      setCutPoints([]);
      setCustomNames({});
      setHoveredKm(null);
      setLastAddedCutPoint(undefined);
      resetSelection();
      setError(undefined);
      setAnalysisError(undefined);
    } catch (caughtError) {
      setFileName(undefined);
      setPoints([]);
      setCutPoints([]);
      setCustomNames({});
      resetSelection();
      setError(caughtError instanceof Error ? caughtError.message : 'No se ha podido procesar el GPX.');
    }
  }

  function addCutPointByKm(km: number): string | undefined {
    const validationError = buildCutPointValidationError(km, totalKm, cutPoints);

    if (validationError) {
      setError(validationError);
      return validationError;
    }

    const nextCutPoint = { id: stableCutPointId(km), km };
    setCutPoints((current) => sortCutPoints([...current, nextCutPoint]));
    setLastAddedCutPoint(nextCutPoint);
    resetSelection();
    setError(undefined);
    return undefined;
  }

  function handleAddCutPoint(value: string): string | undefined {
    const km = parseKmValue(value);
    const validationError = buildCutPointValidationError(km, totalKm, cutPoints);

    if (validationError) {
      return validationError;
    }

    const nextCutPoint = { id: stableCutPointId(km!), km: km! };
    setCutPoints((current) => sortCutPoints([...current, nextCutPoint]));
    setLastAddedCutPoint(nextCutPoint);
    resetSelection();
    setError(undefined);
    return undefined;
  }

  function handleUpdateCutPoint(id: string, value: string): string | undefined {
    const km = parseKmValue(value);
    const validationError = buildCutPointValidationError(km, totalKm, cutPoints, id);

    if (validationError) {
      return validationError;
    }

    setCutPoints((current) =>
      sortCutPoints(current.map((cutPoint) => (cutPoint.id === id ? { ...cutPoint, km: km! } : cutPoint))),
    );
    setLastAddedCutPoint(undefined);
    resetSelection();
    return undefined;
  }

  function handleDeleteCutPoint(id: string) {
    setCutPoints((current) => current.filter((cutPoint) => cutPoint.id !== id));
    setLastAddedCutPoint(undefined);
    resetSelection();
  }

  function handleUndoLastCutPoint() {
    if (!lastAddedCutPoint) return;
    setCutPoints((current) => current.filter((cutPoint) => cutPoint.id !== lastAddedCutPoint.id));
    setLastAddedCutPoint(undefined);
    resetSelection();
  }

  function handleChangeCustomName(id: string, name: string) {
    setCustomNames((current) => {
      const next = { ...current };
      if (name.trim().length === 0) {
        delete next[id];
      } else {
        next[id] = name;
      }
      return next;
    });
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MVP · 100% cliente</p>
          <h1>GPX Splitter</h1>
          <p>
            Carga un GPX, define puntos kilométricos, analiza ascensos/descensos y descarga segmentos independientes.
          </p>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {lastAddedCutPoint && (
        <div className="success-banner" role="status">
          Corte añadido en km {lastAddedCutPoint.km.toFixed(3).replace('.', ',')}.
          <button className="button-link" type="button" onClick={handleUndoLastCutPoint}>
            Deshacer
          </button>
        </div>
      )}

      <div className="layout-grid">
        <div className="left-column">
          <GpxUploader onFileLoaded={handleFileLoaded} onError={setError} />
          <TrackSummary fileName={fileName} points={points} elevationStats={elevationStats} />
          <CutPointsTable
            cutPoints={cutPoints}
            totalKm={totalKm}
            disabled={points.length === 0}
            onAdd={handleAddCutPoint}
            onUpdate={handleUpdateCutPoint}
            onDelete={handleDeleteCutPoint}
          />
          <SegmentDownloads
            segments={segments}
            originalFileName={fileName}
            selectedSegmentId={selectedSegmentId}
            hoveredKm={hoveredKm}
            customNames={customNames}
            onChangeName={handleChangeCustomName}
            onSelectSegment={setSelectedSegmentId}
          />
        </div>

        <div className="right-column">
          <MapPreview
            points={points}
            cutPoints={cutPoints}
            selectedSegment={selectedSegment}
            ascents={ascents}
            descents={descents}
            highlightedAscentId={selectedAscentId}
            highlightedDescentId={selectedDescentId}
            hoveredKm={hoveredKm}
            onHoverKm={setHoveredKm}
            onClickKm={addCutPointByKm}
          />

          {points.length > 0 && elevationAvailable && (
            <>
              {analysisError && <div className="error-banner">{analysisError}</div>}
              <ElevationProfile
                points={points}
                cutPointsKm={cutPoints.map((cp) => cp.km)}
                segments={segments}
                ascents={ascents}
                descents={descents}
                highlightedSegmentId={selectedSegmentId}
                highlightedAscentId={selectedAscentId}
                highlightedDescentId={selectedDescentId}
                hoveredKm={hoveredKm}
                onHoverKm={setHoveredKm}
                onClickKm={addCutPointByKm}
              />
              <SlopeDetectionPanel
                detectionParams={detectionParams}
                ascentConfig={ascentConfig}
                descentConfig={descentConfig}
                onChangeDetectionParams={setDetectionParams}
                onChangeAscentConfig={setAscentConfig}
                onChangeDescentConfig={setDescentConfig}
                portThresholds={portThresholds}
                onChangePortThresholds={setPortThresholds}
              />
              <SlopeSegmentsList
                direction="up"
                segments={ascents}
                originalFileName={fileName}
                selectedId={selectedAscentId}
                hoveredKm={hoveredKm}
                customNames={customNames}
                onChangeName={handleChangeCustomName}
                onSelect={setSelectedAscentId}
              />
              <SlopeSegmentsList
                direction="down"
                segments={descents}
                originalFileName={fileName}
                selectedId={selectedDescentId}
                hoveredKm={hoveredKm}
                customNames={customNames}
                onChangeName={handleChangeCustomName}
                onSelect={setSelectedDescentId}
              />
            </>
          )}

          {points.length > 0 && !elevationAvailable && (
            <section className="card">
              <h2>Perfil y análisis de pendiente</h2>
              <p className="muted">
                Este GPX no tiene suficientes datos de elevación (&lt;ele&gt;) para mostrar perfil ni detectar ascensos/descensos.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

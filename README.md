# GPX Splitter

Aplicación web React + TypeScript + Vite para cortar un track GPX en segmentos por puntos kilométricos, detectar ascensos/descensos y descargar los resultados como GPX o ZIP. Todo el procesamiento se realiza en cliente.

## Funcionalidades incluidas

- Carga y parseo de archivos `.gpx`.
- Cálculo de distancia acumulada, distancia total, puntos y desnivel.
- Tabla editable de puntos de corte con validación y ordenación automática.
- Corte exacto con interpolación de latitud, longitud, elevación y tiempo.
- IDs deterministas para segmentos, ascensos y descensos:
  - `seg-<startKm>-<endKm>`
  - `asc-<startKm>-<endKm>`
  - `desc-<startKm>-<endKm>`
- Nombres personalizados para segmentos, ascensos y descensos, conservados aunque se recalculen los tramos.
- Descarga individual de GPX y descarga ZIP.
- Mapa Leaflet con track completo, puntos de corte, ascensos, descensos y segmento seleccionado.
- Perfil de elevación con Recharts.
- Sincronización de hover entre mapa, perfil y listas mediante `hoveredKm`.
- Añadir cortes haciendo clic directamente en el mapa o en el perfil.
- Aviso de “corte añadido” con acción de deshacer.
- Detección automática de ascensos y descensos mediante motor genérico `detectSlopeSegments`.
- Categorización orientativa de puertos para ascensos mediante `distancia_km × pendiente_media_%`.

## Instalación

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Estructura principal

```txt
src/
  components/
    CutPointsTable.tsx
    ElevationProfile.tsx
    GpxUploader.tsx
    MapPreview.tsx
    SegmentDownloads.tsx
    SlopeDetectionPanel.tsx
    SlopeSegmentsList.tsx
    TrackSummary.tsx
  domain/
    cutPoint.ts
    slopeSegment.ts
    trackPoint.ts
    trackSegment.ts
  services/
    ascentDetector.ts
    descentDetector.ts
    distanceCalculator.ts
    elevationProfile.ts
    gpxParser.ts
    gpxWriter.ts
    idUtils.ts
    portCategorizer.ts
    slopeSegmentDetector.ts
    trackSplitter.ts
    zipExporter.ts
```

## Decisiones aplicadas del plan

### Clic para añadir cortes

Se ha aplicado la opción directa + deshacer. Al hacer clic sobre el mapa o el perfil se añade el corte si pasa las validaciones existentes. Después aparece un aviso con botón **Deshacer**.

### Detección de descensos

Ascensos y descensos comparten los parámetros de bajo nivel: pendiente mínima, ventana, ruido mínimo y fusión de huecos. Los filtros finales de distancia y desnivel mínimo son independientes para ascensos y descensos.

### Categoría de puertos

La categoría se muestra como badge solo en ascensos. Es una heurística orientativa y configurable desde `src/services/portCategorizer.ts`.

## Notas

- No hay backend, login ni base de datos.
- Si el GPX no tiene elevación suficiente, el perfil y el análisis de ascensos/descensos se desactivan.
- Para tracks muy largos, el perfil se muestrea para mantener fluidez.

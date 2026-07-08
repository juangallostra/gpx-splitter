# GPX Splitter (MVP)

Aplicación web para cortar un track GPX en varios segmentos según puntos kilométricos definidos por el usuario. Procesamiento 100% en cliente, sin backend.

## Requisitos

- Node.js 18+
- npm

## Instalación y arranque

```bash
npm install
npm run dev
```

Abre la URL que muestre Vite (normalmente http://localhost:5173).

## Build de producción

```bash
npm run build
npm run preview
```

## Estructura

```
src/
  domain/      -> modelos de datos (TrackPoint, CutPoint, TrackSegment)
  services/     -> lógica pura: parseo GPX, cálculo de distancias, corte, escritura GPX, ZIP
  components/    -> componentes React (UI)
  App.tsx        -> orquesta el flujo completo
```

La lógica de cálculo (services/ y domain/) está desacoplada de React y se puede testear de forma aislada.

## Flujo de uso

1. Cargar un archivo `.gpx`.
2. Revisar el resumen (distancia total, nº de puntos, desnivel).
3. Añadir puntos kilométricos de corte (ej: 5, 10, 21.1).
4. La app genera automáticamente los segmentos, interpolando los puntos de corte que no coinciden exactamente con un punto real del GPX.
5. Descargar cada segmento individualmente o todos juntos en un `.zip`.

## Detección de tramos de ascenso

Además de cortar el track por puntos kilométricos, la app detecta automáticamente los tramos
de ascenso "significativos" a partir de la elevación del GPX.

Criterios de detección (`src/services/ascentDetector.ts`):

1. La pendiente media en una ventana deslizante (`windowMeters`) supera un umbral (`minSlope`).
2. Los tramos candidatos separados por un hueco corto (`mergeGapMeters`) se fusionan en uno.
3. Se descartan como ruido los tramos que no llegan a una distancia (`minAscentDistanceM`) o
   desnivel (`minAscentGainM`) mínimos.
4. El inicio real del ascenso se ajusta retrocediendo hasta el último punto bajo (mínimo local)
   antes de que empiece a subir.
5. Finalmente se filtran los ascensos según los umbrales del usuario: km mínimos y desnivel
   positivo mínimo.

Valores por defecto (configurables en el panel "Opciones avanzadas" de la UI):

```ts
minSlope = 0.03        // 3%
windowMeters = 150
minAscentDistanceM = 300
minAscentGainM = 20
mergeGapMeters = 100
```

Los ascensos detectados se muestran siempre superpuestos en el mapa (línea verde), en una
lista con sus métricas (distancia, desnivel, pendiente media) y se pueden descargar como GPX
individual o en ZIP, igual que los segmentos de corte por km.

Si el GPX no tiene suficientes datos de elevación (`<ele>`), esta funcionalidad se desactiva
y se muestra un aviso.

## Perfil de elevación

Debajo del resumen del track se muestra un gráfico de área (distancia vs. elevación,
`src/components/ElevationProfile.tsx`, con `recharts`) que incluye:

- Líneas verticales discontinuas rojas en cada punto kilométrico de corte.
- Bandas verdes sobre los tramos detectados como ascenso (más intensa si el ascenso está
  seleccionado en la lista).
- Banda naranja sobre el segmento de corte seleccionado en `SegmentDownloads`.
- Tooltip al pasar el ratón con la elevación exacta en cada punto.

Si el GPX no tiene datos de elevación, se muestra un aviso en vez del gráfico. Para tracks muy
largos, `services/elevationProfile.ts` reduce el número de puntos representados (máx. ~400)
para mantener el gráfico fluido sin perder la forma del perfil.

## Notas del MVP

- No hay backend, base de datos ni autenticación.
- No se soporta edición manual del track sobre el mapa.
- Si el GPX tiene varios `<trk>`, se procesan todos los `<trkpt>` como un único track continuo (no hay soporte de tracks/segmentos múltiples discontinuos en este MVP).

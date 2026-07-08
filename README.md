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

## Notas del MVP

- No hay backend, base de datos ni autenticación.
- No se soporta edición manual del track sobre el mapa.
- Si el GPX tiene varios `<trk>`, se procesan todos los `<trkpt>` como un único track continuo (no hay soporte de tracks/segmentos múltiples discontinuos en este MVP).

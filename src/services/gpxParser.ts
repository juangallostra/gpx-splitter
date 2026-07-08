import { TrackPoint } from '../domain/trackPoint';

export class GpxParseError extends Error {}

/**
 * Parsea el contenido XML de un archivo GPX y extrae los puntos de track (trkpt).
 * No calcula distancias: eso lo hace distanceCalculator.
 */
export function parseGpx(xml: string): TrackPoint[] {
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xml, 'application/xml');
  } catch {
    throw new GpxParseError('El archivo no se pudo interpretar como XML.');
  }

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new GpxParseError('El archivo no es un XML válido.');
  }

  const isGpx = doc.documentElement?.nodeName.toLowerCase() === 'gpx';
  if (!isGpx) {
    throw new GpxParseError('El archivo no parece ser un GPX válido (falta la etiqueta <gpx>).');
  }

  const trkptNodes = Array.from(doc.getElementsByTagName('trkpt'));

  if (trkptNodes.length === 0) {
    throw new GpxParseError('El GPX no contiene puntos de track (<trkpt>).');
  }

  const points: TrackPoint[] = trkptNodes.map((node, index) => {
    const latAttr = node.getAttribute('lat');
    const lonAttr = node.getAttribute('lon');

    if (latAttr === null || lonAttr === null) {
      throw new GpxParseError(`El punto ${index + 1} no tiene latitud/longitud.`);
    }

    const lat = parseFloat(latAttr);
    const lon = parseFloat(lonAttr);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      throw new GpxParseError(`El punto ${index + 1} tiene coordenadas inválidas.`);
    }

    const eleNode = node.getElementsByTagName('ele')[0];
    const timeNode = node.getElementsByTagName('time')[0];

    const ele = eleNode ? parseFloat(eleNode.textContent ?? '') : undefined;
    const time = timeNode?.textContent ?? undefined;

    return {
      lat,
      lon,
      ele: ele !== undefined && !Number.isNaN(ele) ? ele : undefined,
      time,
      distanceFromStart: 0,
    };
  });

  return points;
}

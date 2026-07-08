import type { TrackPoint } from '../domain/trackPoint';

const GPX_PARSE_ERROR = 'El archivo no parece ser un GPX válido.';

function getDirectChildText(element: Element, tagName: string): string | undefined {
  const children = Array.from(element.children);
  const child = children.find((item) => item.localName.toLowerCase() === tagName.toLowerCase());
  return child?.textContent?.trim() || undefined;
}

export function parseGpx(xml: string): TrackPoint[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const parserError = doc.querySelector('parsererror');

  if (parserError) {
    throw new Error(GPX_PARSE_ERROR);
  }

  const trkptElements = Array.from(doc.getElementsByTagNameNS('*', 'trkpt'));

  if (trkptElements.length === 0) {
    throw new Error('El GPX no contiene puntos de track (<trkpt>).');
  }

  const points = trkptElements.map((trkpt, index): TrackPoint => {
    const lat = Number(trkpt.getAttribute('lat'));
    const lon = Number(trkpt.getAttribute('lon'));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error(`El punto ${index + 1} no tiene latitud o longitud válida.`);
    }

    const eleText = getDirectChildText(trkpt, 'ele');
    const timeText = getDirectChildText(trkpt, 'time');
    const ele = eleText !== undefined ? Number(eleText) : undefined;

    return {
      lat,
      lon,
      ele: ele !== undefined && Number.isFinite(ele) ? ele : undefined,
      time: timeText,
      distanceFromStart: 0,
    };
  });

  return points;
}

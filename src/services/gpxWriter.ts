import { TrackSegment } from '../domain/trackSegment';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convierte un TrackSegment en un string GPX válido (GPX 1.1).
 */
export function writeGpx(segment: TrackSegment, originalName?: string): string {
  const trackName = originalName
    ? `${escapeXml(originalName)} - ${escapeXml(segment.name)}`
    : escapeXml(segment.name);

  const trkpts = segment.points
    .map((p) => {
      const eleTag = p.ele !== undefined ? `\n        <ele>${p.ele.toFixed(2)}</ele>` : '';
      const timeTag = p.time ? `\n        <time>${escapeXml(p.time)}</time>` : '';
      return `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">${eleTag}${timeTag}
      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gpx version="1.1" creator="GPX Splitter" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${trackName}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

/**
 * Dispara la descarga de un único archivo GPX en el navegador.
 */
export function downloadGpx(filename: string, gpxContent: string): void {
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

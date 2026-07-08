import type { TrackSegment } from '../domain/trackSegment';
import { sanitizeFilePart } from './idUtils';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatCoordinate(value: number): string {
  return value.toFixed(7);
}

function formatElevation(value: number): string {
  return value.toFixed(2);
}

export function effectiveSegmentFilename(segment: TrackSegment): string {
  if (!segment.name || segment.name.trim().length === 0) {
    return segment.filename;
  }

  return `${sanitizeFilePart(segment.name)}_${segment.filename}`;
}

export function writeGpx(segment: TrackSegment, originalName?: string): string {
  const sourceName = originalName ? `Segmento de ${originalName}` : 'Segmento GPX';
  const trackName = `${sourceName} · ${segment.name}`;

  const trkpts = segment.points
    .map((point) => {
      const children = [
        point.ele !== undefined ? `      <ele>${formatElevation(point.ele)}</ele>` : undefined,
        point.time ? `      <time>${escapeXml(point.time)}</time>` : undefined,
      ]
        .filter(Boolean)
        .join('\n');

      if (!children) {
        return `    <trkpt lat="${formatCoordinate(point.lat)}" lon="${formatCoordinate(point.lon)}" />`;
      }

      return `    <trkpt lat="${formatCoordinate(point.lat)}" lon="${formatCoordinate(point.lon)}">\n${children}\n    </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Splitter" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(trackName)}</name>
  </metadata>
  <trk>
    <name>${escapeXml(trackName)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadGpx(filename: string, gpxContent: string): void {
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

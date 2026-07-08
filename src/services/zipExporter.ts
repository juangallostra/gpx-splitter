import JSZip from 'jszip';
import { TrackSegment, segmentFileName } from '../domain/trackSegment';
import { writeGpx } from './gpxWriter';

/**
 * Genera un ZIP con todos los segmentos como archivos GPX y dispara su descarga.
 */
export async function downloadZip(
  segments: TrackSegment[],
  originalName?: string,
  zipName = 'segmentos_gpx.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const segment of segments) {
    const gpxContent = writeGpx(segment, originalName);
    zip.file(segmentFileName(segment), gpxContent);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

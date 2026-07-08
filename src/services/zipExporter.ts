import JSZip from 'jszip';
import type { TrackSegment } from '../domain/trackSegment';
import { downloadGpx, effectiveSegmentFilename, writeGpx } from './gpxWriter';

export async function downloadZip(
  segments: TrackSegment[],
  originalName?: string,
  zipFilename = 'gpx_segments.zip',
): Promise<void> {
  const zip = new JSZip();

  segments.forEach((segment) => {
    zip.file(effectiveSegmentFilename(segment), writeGpx(segment, originalName));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { downloadGpx };

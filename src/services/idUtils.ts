function normalizeKm(value: number | null): string {
  if (value === null) return 'final';
  return Number(value.toFixed(3)).toString().replace('-', 'm').replace('.', '-');
}

export function rangeId(prefix: string, startKm: number, endKm: number | null): string {
  return `${prefix}-${normalizeKm(startKm)}-${normalizeKm(endKm)}`;
}

export function stableCutPointId(km: number): string {
  return `cut-${normalizeKm(km)}`;
}

export function sanitizeFilePart(value: string): string {
  const sanitized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  return sanitized || 'track';
}

export function formatKmForFilename(km: number): string {
  const normalized = Number(km.toFixed(3));
  const [integerPart, decimalPart] = normalized.toString().split('.');
  const paddedInteger = integerPart.padStart(3, '0');
  return decimalPart ? `${paddedInteger}-${decimalPart}` : paddedInteger;
}

export function buildRangeFilename(prefix: string, startKm: number, endKm: number | null): string {
  const startLabel = formatKmForFilename(startKm);
  const endLabel = endKm === null ? 'final' : formatKmForFilename(endKm);
  return `${prefix}_km_${startLabel}_${endLabel}.gpx`;
}

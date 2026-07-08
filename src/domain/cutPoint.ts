export interface CutPoint {
  id: string;
  /** Kilómetro de corte, en km (no en metros) */
  km: number;
  name?: string;
}

export function createCutPoint(km: number, name?: string): CutPoint {
  return {
    id: crypto.randomUUID(),
    km,
    name,
  };
}

/**
 * Parsea un valor introducido por el usuario admitiendo coma o punto decimal.
 * Devuelve null si no es un número válido.
 */
export function parseKmInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isNaN(value) ? null : value;
}

export interface CutPointValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida un nuevo/editado punto kilométrico contra la distancia total y los puntos existentes.
 * excludeId permite excluir el propio punto al editar.
 */
export function validateCutPoint(
  km: number,
  totalDistanceKm: number,
  existing: CutPoint[],
  excludeId?: string
): CutPointValidationResult {
  if (km <= 0) {
    return { valid: false, error: 'El punto kilométrico debe ser mayor que 0.' };
  }
  if (km >= totalDistanceKm) {
    return {
      valid: false,
      error: `El punto kilométrico debe ser menor que la distancia total (${totalDistanceKm.toFixed(2)} km).`,
    };
  }

  const duplicate = existing.some(
    (cp) => cp.id !== excludeId && Math.abs(cp.km - km) < 0.001
  );
  if (duplicate) {
    return { valid: false, error: 'Ya existe un punto kilométrico con ese valor.' };
  }

  return { valid: true };
}

/**
 * Devuelve los puntos ordenados de menor a mayor.
 */
export function sortCutPoints(points: CutPoint[]): CutPoint[] {
  return [...points].sort((a, b) => a.km - b.km);
}

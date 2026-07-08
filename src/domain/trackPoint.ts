export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  /** Distancia acumulada desde el inicio del track, en metros. */
  distanceFromStart: number;
}

export interface ElevationStats {
  positive: number;
  negative: number;
}

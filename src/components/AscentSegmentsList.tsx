import type { AscentSegment } from '../domain/ascentSegment';
import { SlopeSegmentsList } from './SlopeSegmentsList';

interface AscentSegmentsListProps {
  ascents: AscentSegment[];
  originalFileName?: string;
  selectedAscentId?: string | null;
  hoveredKm?: number | null;
  customNames?: Record<string, string>;
  onChangeName?: (id: string, name: string) => void;
  onSelectAscent?: (id: string | null) => void;
}

export function AscentSegmentsList({
  ascents,
  originalFileName,
  selectedAscentId,
  hoveredKm,
  customNames = {},
  onChangeName = () => undefined,
  onSelectAscent,
}: AscentSegmentsListProps) {
  return (
    <SlopeSegmentsList
      direction="up"
      segments={ascents}
      originalFileName={originalFileName}
      selectedId={selectedAscentId ?? undefined}
      hoveredKm={hoveredKm}
      customNames={customNames}
      onChangeName={onChangeName}
      onSelect={(id) => onSelectAscent?.(id ?? null)}
    />
  );
}

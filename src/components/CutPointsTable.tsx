import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { CutPoint } from '../domain/cutPoint';

interface CutPointsTableProps {
  cutPoints: CutPoint[];
  totalKm: number;
  disabled: boolean;
  onAdd: (value: string) => string | undefined;
  onUpdate: (id: string, value: string) => string | undefined;
  onDelete: (id: string) => void;
}

function formatInputValue(km: number): string {
  return Number(km.toFixed(3)).toString().replace('.', ',');
}

export function CutPointsTable({
  cutPoints,
  totalKm,
  disabled,
  onAdd,
  onUpdate,
  onDelete,
}: CutPointsTableProps) {
  const [newValue, setNewValue] = useState('');
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | undefined>();

  useEffect(() => {
    setDraftValues(
      cutPoints.reduce<Record<string, string>>((accumulator, cutPoint) => {
        accumulator[cutPoint.id] = formatInputValue(cutPoint.km);
        return accumulator;
      }, {}),
    );
  }, [cutPoints]);

  function handleAdd() {
    const error = onAdd(newValue);
    setLocalError(error);
    if (!error) {
      setNewValue('');
    }
  }

  function handleCommit(id: string) {
    const error = onUpdate(id, draftValues[id] ?? '');
    setLocalError(error);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, callback: () => void) {
    if (event.key === 'Enter') {
      callback();
      event.currentTarget.blur();
    }
  }

  return (
    <section className="card">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Paso 2</p>
          <h2>Puntos kilométricos de corte</h2>
          <p className="muted">
            Introduce valores en kilómetros. Se aceptan decimales con punto o coma.
          </p>
        </div>
        {totalKm > 0 && <span className="pill">Máximo: {totalKm.toFixed(2).replace('.', ',')} km</span>}
      </div>

      <div className="add-cut-row">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Ej. 5 o 10,5 o 21.1"
          value={newValue}
          disabled={disabled}
          onChange={(event) => setNewValue(event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, handleAdd)}
        />
        <button type="button" disabled={disabled} onClick={handleAdd}>
          Añadir corte
        </button>
      </div>

      {localError && <p className="inline-error">{localError}</p>}

      {cutPoints.length === 0 ? (
        <p className="empty-state">Todavía no hay puntos de corte. Si no añades cortes, se generará un único segmento completo.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Punto kilométrico</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cutPoints.map((cutPoint, index) => (
                <tr key={cutPoint.id}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draftValues[cutPoint.id] ?? ''}
                      onChange={(event) =>
                        setDraftValues((current) => ({ ...current, [cutPoint.id]: event.target.value }))
                      }
                      onBlur={() => handleCommit(cutPoint.id)}
                      onKeyDown={(event) => handleKeyDown(event, () => handleCommit(cutPoint.id))}
                    />
                  </td>
                  <td>
                    <button className="button-secondary" type="button" onClick={() => onDelete(cutPoint.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

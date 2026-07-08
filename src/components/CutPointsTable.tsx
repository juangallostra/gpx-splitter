import { useState } from 'react';
import { CutPoint, createCutPoint, parseKmInput, sortCutPoints, validateCutPoint } from '../domain/cutPoint';

interface CutPointsTableProps {
  cutPoints: CutPoint[];
  totalDistanceKm: number;
  onChange: (cutPoints: CutPoint[]) => void;
}

export function CutPointsTable({ cutPoints, totalDistanceKm, onChange }: CutPointsTableProps) {
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const handleAdd = () => {
    const km = parseKmInput(newValue);
    if (km === null) {
      setError('Introduce un número válido (usa punto o coma para decimales).');
      return;
    }

    const result = validateCutPoint(km, totalDistanceKm, cutPoints);
    if (!result.valid) {
      setError(result.error ?? 'Valor inválido.');
      return;
    }

    const updated = sortCutPoints([...cutPoints, createCutPoint(km)]);
    onChange(updated);
    setNewValue('');
    setError(null);
  };

  const handleDelete = (id: string) => {
    onChange(cutPoints.filter((cp) => cp.id !== id));
  };

  const startEditing = (cp: CutPoint) => {
    setEditingId(cp.id);
    setEditingValue(String(cp.km).replace('.', ','));
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const confirmEditing = (id: string) => {
    const km = parseKmInput(editingValue);
    if (km === null) {
      setError('Introduce un número válido (usa punto o coma para decimales).');
      return;
    }

    const result = validateCutPoint(km, totalDistanceKm, cutPoints, id);
    if (!result.valid) {
      setError(result.error ?? 'Valor inválido.');
      return;
    }

    const updated = sortCutPoints(
      cutPoints.map((cp) => (cp.id === id ? { ...cp, km } : cp))
    );
    onChange(updated);
    setEditingId(null);
    setEditingValue('');
    setError(null);
  };

  return (
    <div className="cut-points-table">
      <h3>Puntos kilométricos de corte</h3>

      <div className="cut-points-table__add">
        <input
          type="text"
          placeholder={`Ej: 5 o 21,1 (máx ${totalDistanceKm.toFixed(2)} km)`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button type="button" onClick={handleAdd}>
          Añadir
        </button>
      </div>

      {error && <p className="cut-points-table__error">{error}</p>}

      {cutPoints.length === 0 ? (
        <p>No hay puntos kilométricos definidos todavía.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Km</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cutPoints.map((cp) => (
              <tr key={cp.id}>
                <td>
                  {editingId === cp.id ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && confirmEditing(cp.id)}
                      autoFocus
                    />
                  ) : (
                    cp.km.toFixed(2)
                  )}
                </td>
                <td>
                  {editingId === cp.id ? (
                    <>
                      <button type="button" onClick={() => confirmEditing(cp.id)}>
                        Guardar
                      </button>
                      <button type="button" onClick={cancelEditing}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEditing(cp)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDelete(cp.id)}>
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

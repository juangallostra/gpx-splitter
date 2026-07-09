import { useState } from 'react';

interface EditableNameProps {
  name: string;
  onRename: (newName: string) => void;
}

/**
 * Muestra un nombre con un botón de lápiz para editarlo inline. Usado en las listas de
 * segmentos/ascensos/descensos para poder personalizar el nombre antes de exportar.
 */
export function EditableName({ name, onRename }: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const confirm = () => {
    const trimmed = value.trim();
    if (trimmed !== '' && trimmed !== name) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setValue(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="editable-name editable-name--editing" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={confirm}
        />
      </span>
    );
  }

  return (
    <span className="editable-name">
      <strong>{name}</strong>
      <button
        type="button"
        className="editable-name__edit-btn"
        title="Renombrar"
        onClick={(e) => {
          e.stopPropagation();
          setValue(name);
          setEditing(true);
        }}
      >
        ✏️
      </button>
    </span>
  );
}

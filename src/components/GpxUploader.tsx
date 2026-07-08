import { ChangeEvent, useRef } from 'react';

interface GpxUploaderProps {
  onFileLoaded: (fileName: string, content: string) => void;
  onError: (message: string) => void;
}

export function GpxUploader({ onFileLoaded, onError }: GpxUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      onError('El archivo seleccionado no tiene extensión .gpx.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      onFileLoaded(file.name, content);
    };
    reader.onerror = () => {
      onError('No se pudo leer el archivo seleccionado.');
    };
    reader.readAsText(file);

    // Permite volver a cargar el mismo archivo si el usuario lo desea
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="gpx-uploader">
      <label htmlFor="gpx-input" className="gpx-uploader__label">
        Cargar archivo GPX
      </label>
      <input
        id="gpx-input"
        ref={inputRef}
        type="file"
        accept=".gpx"
        onChange={handleChange}
      />
    </div>
  );
}

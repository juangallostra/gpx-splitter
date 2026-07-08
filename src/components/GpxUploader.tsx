import type { ChangeEvent } from 'react';

interface GpxUploaderProps {
  onFileLoaded: (fileName: string, xml: string) => void;
  onError: (message: string) => void;
}

export function GpxUploader({ onFileLoaded, onError }: GpxUploaderProps) {
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      onError('El archivo seleccionado no tiene extensión .gpx.');
      event.target.value = '';
      return;
    }

    try {
      const xml = await file.text();
      onFileLoaded(file.name, xml);
    } catch {
      onError('No se ha podido leer el archivo GPX.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <section className="card uploader-card">
      <div>
        <p className="eyebrow">Paso 1</p>
        <h2>Cargar archivo GPX</h2>
        <p>Selecciona un track GPX. Todo el procesamiento se realiza en el navegador.</p>
      </div>

      <label className="file-input-label">
        <span>Seleccionar GPX</span>
        <input type="file" accept=".gpx,application/gpx+xml,text/xml,application/xml" onChange={handleFileChange} />
      </label>
    </section>
  );
}

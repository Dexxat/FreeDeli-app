/** Fotos que el rider sube en el alta y puede actualizar desde su perfil. */
export type TipoDocumento = 'seguro' | 'licencia';

export const TIPOS_DOCUMENTO: readonly { id: TipoDocumento; nombre: string }[] = [
  { id: 'seguro', nombre: 'Seguro de la moto' },
  { id: 'licencia', nombre: 'Licencia de conducir' },
];

/** Cada foto, como data URL (`data:image/jpeg;base64,...`); null si falta. */
export type DocumentosRider = Record<TipoDocumento, string | null>;

export const SIN_DOCUMENTOS: DocumentosRider = { seguro: null, licencia: null };

/** Tamaño máximo de cada foto ya decodificada. Las apps las comprimen antes de subirlas. */
export const MAX_BYTES_DOCUMENTO = 2_000_000;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export function esTipoDocumento(valor: string): valor is TipoDocumento {
  return TIPOS_DOCUMENTO.some((t) => t.id === valor);
}

/** Separa una data URL de imagen en tipo y contenido. null si no es JPEG, PNG o WebP en base64. */
export function partesDeImagen(dataUrl: string): { mime: string; base64: string } | null {
  const m = DATA_URL.exec(dataUrl);
  return m ? { mime: m[1], base64: m[2] } : null;
}

/** Bytes que ocupa el contenido en base64 una vez decodificado. */
export function bytesDeBase64(base64: string): number {
  const relleno = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length * 3) / 4 - relleno;
}

/** Foto aceptable: JPEG, PNG o WebP, no vacía y de hasta MAX_BYTES_DOCUMENTO. */
export function imagenValida(dataUrl: string): boolean {
  const partes = partesDeImagen(dataUrl);
  if (!partes) return false;
  const bytes = bytesDeBase64(partes.base64);
  return bytes > 0 && bytes <= MAX_BYTES_DOCUMENTO;
}

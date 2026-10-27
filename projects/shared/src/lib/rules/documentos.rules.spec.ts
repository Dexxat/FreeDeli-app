import { MAX_BYTES_DOCUMENTO, bytesDeBase64, esTipoDocumento, imagenValida, partesDeImagen } from './documentos.rules.js';

const PNG_1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('documentos del rider', () => {
  it('acepta JPEG, PNG y WebP en base64', () => {
    expect(imagenValida(PNG_1x1)).toBe(true);
    expect(imagenValida('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    expect(imagenValida('data:image/webp;base64,UklGRg==')).toBe(true);
  });

  it('rechaza otros formatos, texto suelto y vacíos', () => {
    expect(imagenValida('data:application/pdf;base64,JVBERi0=')).toBe(false);
    expect(imagenValida('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(imagenValida('data:image/png;base64,')).toBe(false);
    expect(imagenValida('hola')).toBe(false);
    expect(imagenValida('data:image/png;base64,abc$')).toBe(false);
  });

  it('rechaza fotos de más de 2 MB', () => {
    const grande = 'A'.repeat(Math.ceil(((MAX_BYTES_DOCUMENTO + 3) * 4) / 3 / 4) * 4);
    expect(imagenValida(`data:image/jpeg;base64,${grande}`)).toBe(false);
  });

  it('calcula los bytes y separa las partes', () => {
    expect(bytesDeBase64('QUJD')).toBe(3);
    expect(bytesDeBase64('QUI=')).toBe(2);
    expect(bytesDeBase64('QQ==')).toBe(1);
    expect(partesDeImagen(PNG_1x1)?.mime).toBe('image/png');
    expect(esTipoDocumento('seguro')).toBe(true);
    expect(esTipoDocumento('dni')).toBe(false);
  });
});

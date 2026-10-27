import { expect, ingresar, test } from './soporte/fixtures.js';
import { FOTO, archivoFoto } from './soporte/api.js';
import { DEV } from '../entorno/config.mjs';
import { urlApp } from './soporte/fixtures.js';

test('el rider actualiza la foto del seguro y Dev ve la nueva', async ({ api, abrir }) => {
  const r = await api.rider();
  const riderId = (await api.llamar('GET', '/rider', undefined, r.token)).id;
  const rider = await abrir('riders');
  await ingresar(rider, r.email, r.clave, /\/inicio$/);
  await rider.goto(`${urlApp('riders')}/perfil`);
  const documentos = rider.getByRole('region', { name: 'DOCUMENTOS' });
  await expect(documentos.getByRole('img', { name: 'Foto: Seguro de la moto' })).toHaveAttribute('src', FOTO);
  await documentos.getByLabel('Foto: Seguro de la moto').setInputFiles(archivoFoto('seguro-nuevo.png'));
  await expect(documentos.getByRole('img', { name: 'Foto: Seguro de la moto' })).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await expect.poll(async () => (await api.llamar('GET', '/rider/documentos', undefined, r.token)).seguro).toMatch(/^data:image\/jpeg;base64,/);

  const dev = await abrir('dev');
  await ingresar(dev, DEV.email, DEV.clave, /\/main$/);
  await dev.goto(`${urlApp('dev')}/riders/${riderId}`);
  const seguro = dev.getByRole('img', { name: 'Seguro de la moto' });
  await expect(seguro).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await dev.getByRole('button', { name: 'Ampliar Seguro de la moto' }).click();
  await expect(dev.getByRole('button', { name: 'Achicar Seguro de la moto' })).toBeVisible();
});

test('un archivo que no es una foto se rechaza con un aviso', async ({ api, abrir }) => {
  const r = await api.rider();
  const rider = await abrir('riders');
  await ingresar(rider, r.email, r.clave, /\/inicio$/);
  await rider.goto(`${urlApp('riders')}/perfil`);
  const documentos = rider.getByRole('region', { name: 'DOCUMENTOS' });
  await documentos.getByLabel('Foto: Licencia de conducir').setInputFiles({ name: 'licencia.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
  await expect(documentos.getByRole('alert')).toHaveText('Elegí una foto.');
  expect((await api.llamar('GET', '/rider/documentos', undefined, r.token)).licencia).toBe(FOTO);
});

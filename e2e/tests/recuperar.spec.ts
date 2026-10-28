import { createHmac } from 'node:crypto';
import { boton, expect, test, urlApp } from './soporte/fixtures.js';
import { sql } from './soporte/db.js';
import { JWT_SECRET } from '../entorno/config.mjs';

const base64url = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');

/**
 * El link que llegaría por mail. Se firma como lo hace la API (secreto + hash de la clave actual),
 * porque en las pruebas no hay servidor de mail.
 */
async function linkDelMail(email: string, vencidoHace = 0): Promise<string> {
  const [cuenta] = await sql<{ id: string; clave: string }>('SELECT id, clave FROM "Cuenta" WHERE email = $1', [email]);
  const ahora = Math.floor(Date.now() / 1000) - vencidoHace;
  const cuerpo = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: cuenta.id, iat: ahora, exp: ahora + 30 * 60 })}`;
  const firma = createHmac('sha256', `${JWT_SECRET}:${cuenta.clave}`).update(cuerpo).digest('base64url');
  return `/restablecer?token=${cuerpo}.${firma}`;
}

test.describe('recuperar la contraseña', () => {
  test('el usuario pide el link, elige una contraseña nueva y entra directo', async ({ api, abrir }) => {
    const u = await api.usuario();
    const usuario = await abrir('usuarios');
    await usuario.waitForURL(/\/ingresar$/);
    await usuario.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
    await usuario.waitForURL(/\/recuperar$/);
    await usuario.locator('input[name=email]').fill(u.email);
    await boton(usuario, 'MANDAR LINK').click();
    await expect(usuario.getByText('REVISÁ TU MAIL')).toBeVisible();

    const link = await linkDelMail(u.email);
    await usuario.goto(urlApp('usuarios') + link);
    await usuario.locator('input[name=clave]').fill('claveNueva22');
    await usuario.locator('input[name=repetida]').fill('otraCosa22');
    await boton(usuario, 'GUARDAR Y ENTRAR').click();
    await expect(usuario.getByRole('alert')).toHaveText('Las dos contraseñas no coinciden.');
    await usuario.locator('input[name=repetida]').fill('claveNueva22');
    await boton(usuario, 'GUARDAR Y ENTRAR').click();
    await usuario.waitForURL(/\/inicio$/);
    await expect(usuario.getByRole('heading', { name: 'Hola, Martina' })).toBeVisible();

    // El link sirve una sola vez, y la clave nueva es la que vale.
    await usuario.goto(urlApp('usuarios') + link);
    await usuario.locator('input[name=clave]').fill('terceraClave3');
    await usuario.locator('input[name=repetida]').fill('terceraClave3');
    await boton(usuario, 'GUARDAR Y ENTRAR').click();
    await expect(usuario.getByRole('alert')).toHaveText('El link venció o ya se usó. Pedí uno nuevo.');
    await expect(usuario.getByRole('link', { name: 'Pedir otro link' })).toBeVisible();
    expect(await api.ingresar(u.email, 'claveNueva22')).toEqual(expect.any(String));
  });

  test('un link vencido no sirve y Dev no tiene recuperación por mail', async ({ api, abrir }) => {
    const r = await api.rider();
    const rider = await abrir('riders');
    await rider.goto(urlApp('riders') + (await linkDelMail(r.email, 31 * 60)));
    await rider.locator('input[name=clave]').fill('claveNueva22');
    await rider.locator('input[name=repetida]').fill('claveNueva22');
    await boton(rider, 'GUARDAR Y ENTRAR').click();
    await expect(rider.getByRole('alert')).toHaveText('El link venció o ya se usó. Pedí uno nuevo.');
    expect(await api.ingresar(r.email, r.clave)).toEqual(expect.any(String));

    const dev = await abrir('dev');
    await dev.waitForURL(/\/ingresar$/);
    await expect(dev.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveCount(0);
  });
});

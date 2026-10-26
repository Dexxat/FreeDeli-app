import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (clave: string, sal: Buffer, largo: number) => Promise<Buffer>;
const LARGO = 64;

/** Devuelve "sal:hash" en hexadecimal. */
export async function hashearClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scryptAsync(clave, sal, LARGO);
  return `${sal.toString('hex')}:${hash.toString('hex')}`;
}

export async function verificarClave(clave: string, guardada: string): Promise<boolean> {
  const [salHex, hashHex] = guardada.split(':');
  if (!salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, 'hex');
  const hash = await scryptAsync(clave, Buffer.from(salHex, 'hex'), esperado.length);
  return hash.length === esperado.length && timingSafeEqual(hash, esperado);
}

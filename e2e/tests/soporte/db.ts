import { readFileSync } from 'node:fs';
import pg from 'pg';

const URL_DB = () => readFileSync(new URL('../../.entorno/db-url', import.meta.url), 'utf8').trim();

/** Acceso directo a la base de pruebas: solo para preparar casos que la API no permite y para limpiar. */
export async function sql<T extends pg.QueryResultRow = any>(texto: string, valores: unknown[] = []): Promise<T[]> {
  const cliente = new pg.Client({ connectionString: URL_DB() });
  await cliente.connect();
  try {
    return (await cliente.query<T>(texto, valores)).rows;
  } finally {
    await cliente.end();
  }
}

/**
 * Deja el sistema sin riders conectados ni pedidos abiertos, para que una prueba
 * no reciba ofertas de pedidos de otra.
 */
export async function limpiar(): Promise<void> {
  await sql(`UPDATE "Rider" SET disponible = false`);
  await sql(`UPDATE "Oferta" SET "expiraEn" = now() WHERE "expiraEn" > now()`);
  await sql(`UPDATE "Pedido" SET estado = 'CANCELADO' WHERE estado IN ('ESPERANDO', 'ACEPTADO', 'RETIRADO', 'EN_CAMINO')`);
}

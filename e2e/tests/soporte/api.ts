import { APIRequestContext, expect, request } from '@playwright/test';
import { APPS, DEV } from '../../entorno/config.mjs';

export const URL_API = `http://localhost:${APPS[0].puerto}/api`;

type Zona = 'san-miguel' | 'muniz' | 'bella-vista';
export interface Pedido {
  id: string;
  numero: number;
  pin: string;
  estado: string;
  fase?: string;
  costoEnvio: number;
  gananciaRider: number;
  comisionFreeDeli: number;
  aliasKiosco: string;
  items: { productoId: string; cantidad: number; precioUnitario: number; nombre: string }[];
}

/** Sufijo único por llamada, para emails y nombres que no choquen entre pruebas. */
export function unico(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

/** Cliente de la API para preparar escenarios rápido (lo que no se está probando en pantalla). */
export class Api {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async crear(): Promise<Api> {
    return new Api(await request.newContext());
  }

  async cerrar(): Promise<void> {
    await this.ctx.dispose();
  }

  /** Llama a la API y falla con el cuerpo de la respuesta si no es 2xx. */
  async llamar<T = any>(metodo: 'GET' | 'POST' | 'PATCH', ruta: string, cuerpo?: unknown, token?: string): Promise<T> {
    const r = await this.cruda(metodo, ruta, cuerpo, token);
    const texto = await r.text();
    expect(r.ok(), `${metodo} ${ruta} → ${r.status()} ${texto}`).toBe(true);
    return (texto ? JSON.parse(texto) : null) as T;
  }

  /** Como llamar, pero devuelve la respuesta sin verificarla (para probar rechazos). */
  cruda(metodo: 'GET' | 'POST' | 'PATCH', ruta: string, cuerpo?: unknown, token?: string) {
    return this.ctx.fetch(URL_API + ruta, {
      method: metodo,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data: cuerpo,
    });
  }

  async ingresar(email: string, clave: string): Promise<string> {
    return (await this.llamar<{ token: string }>('POST', '/auth/ingresar', { email, clave })).token;
  }

  async dev(): Promise<string> {
    return this.ingresar(DEV.email, DEV.clave);
  }

  async aprobar(email: string): Promise<void> {
    const dev = await this.dev();
    const pendientes = await this.llamar<{ id: string; email: string }[]>('GET', '/cuentas/pendientes', undefined, dev);
    const cuenta = pendientes.find((c) => c.email === email);
    expect(cuenta, `alta pendiente de ${email}`).toBeTruthy();
    await this.llamar('POST', `/cuentas/${cuenta!.id}/aprobar`, {}, dev);
  }

  /** Kiosco aprobado, con saldo y catálogo. */
  async kiosco(opciones: { zona?: Zona; saldo?: number; productos?: [string, number][]; direccion?: string; nombre?: string } = {}) {
    const id = unico();
    const email = `kiosco-${id}@e2e.local`;
    const clave = 'claveKiosco1';
    const nombre = opciones.nombre ?? `Kiosco ${id.slice(-5).toUpperCase()}`;
    await this.llamar('POST', '/auth/registro/kiosco', {
      email, clave, nombre, direccion: opciones.direccion ?? 'Paunero 1500', zona: opciones.zona ?? 'san-miguel', aliasCobro: `kiosco.${id}`,
    });
    await this.aprobar(email);
    const token = await this.ingresar(email, clave);
    const datos = await this.llamar<{ id: string; aliasCobro: string }>('GET', '/kiosco', undefined, token);
    if ((opciones.saldo ?? 20_000) > 0) {
      await this.llamar('POST', `/admin/kioscos/${datos.id}/saldo`, { monto: opciones.saldo ?? 20_000, referencia: 'Carga e2e' }, await this.dev());
    }
    const productos: { id: string; nombre: string; precio: number }[] = [];
    for (const [n, precio] of opciones.productos ?? [['Coca-Cola 1,5 L', 2800], ['Hielo 2 kg', 1500]]) {
      productos.push(await this.llamar('POST', '/kiosco/productos', { nombre: n, precio }, token));
    }
    return { id: datos.id, email, clave, nombre, token, alias: datos.aliasCobro, productos };
  }

  /** Rider aprobado; si se indica zona, queda conectado en ella. */
  async rider(opciones: { zona?: Zona; nombre?: string } = {}) {
    const id = unico();
    const email = `rider-${id}@e2e.local`;
    const clave = 'claveRider1';
    const nombre = opciones.nombre ?? `Rider ${id.slice(-5).toUpperCase()}`;
    await this.llamar('POST', '/auth/registro/rider', {
      email, clave, nombre, telefono: '11 5555-0100', dni: String(30_000_000 + Math.floor(Math.random() * 9_999_999)),
      vehiculoModelo: 'Honda Wave 110', patente: 'A123BCD', aliasCbu: `rider.${id}`,
    });
    await this.aprobar(email);
    const token = await this.ingresar(email, clave);
    if (opciones.zona) await this.llamar('PATCH', '/rider/estado', { disponible: true, zonas: [opciones.zona] }, token);
    return { email, clave, nombre, token };
  }

  async usuario(opciones: { zona?: Zona; direccion?: string } = {}) {
    const id = unico();
    const email = `usuario-${id}@e2e.local`;
    const clave = 'claveUsuario1';
    const { token } = await this.llamar<{ token: string }>('POST', '/auth/registro/usuario', {
      email, clave, nombre: 'Martina Rodríguez', dni: '40111222', telefono: '11 5555-0199', direccion: opciones.direccion ?? 'Belgrano 845', zona: opciones.zona ?? 'san-miguel',
    });
    return { email, clave, token };
  }

  /** Crea un pedido de 6 del primer producto (más extras) y lo lleva hasta la fase pedida. */
  async pedido(
    usuarioToken: string,
    k: { id: string; token: string; productos: { id: string }[] },
    hasta: 'stock' | 'transferencia' | 'rider' = 'stock',
    items?: { productoId: string; cantidad: number }[],
  ): Promise<Pedido> {
    let p = await this.llamar<Pedido>('POST', '/pedidos', { kioscoId: k.id, items: items ?? [{ productoId: k.productos[0].id, cantidad: 6 }] }, usuarioToken);
    if (hasta === 'stock') return p;
    p = await this.llamar<Pedido>('POST', `/kiosco/pedidos/${p.id}/stock`, { faltantes: [] }, k.token);
    if (hasta === 'transferencia') return p;
    return this.llamar<Pedido>('POST', `/kiosco/pedidos/${p.id}/transferencia`, {}, k.token);
  }

  /** Espera a que la API le ofrezca ese pedido al rider. */
  async esperarOferta(riderToken: string, pedidoId: string, segundos = 30): Promise<void> {
    await expect
      .poll(async () => (await this.llamar<{ pedidoId?: string } | null>('GET', '/rider/oferta', undefined, riderToken))?.pedidoId, {
        timeout: segundos * 1000,
        message: `oferta del pedido ${pedidoId}`,
      })
      .toBe(pedidoId);
  }
}

import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable, filter, from, map, mergeMap } from 'rxjs';
import { PermitirToken, SesionActual, type Sesion } from '../auth/sesion.js';
import { Rol } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventosService, type Evento } from './eventos.service.js';

/**
 * Tiempo real. EventSource no manda encabezados, así que el token va en ?token=.
 * Cada cuenta recibe solo lo suyo: el usuario sus pedidos, el kiosco los de su kiosco,
 * el rider sus pedidos y ofertas, y Dev todo.
 */
@Controller('eventos')
export class EventosController {
  constructor(
    private readonly eventos: EventosService,
    private readonly db: PrismaService,
  ) {}

  @PermitirToken()
  @Sse()
  flujo(@SesionActual() sesion: Sesion): Observable<MessageEvent> {
    return from(this.perfilId(sesion)).pipe(
      mergeMap((perfilId) => this.eventos.flujo$.pipe(filter((e) => this.leCorresponde(e, sesion.rol, perfilId)))),
      map((e) => ({ type: e.tipo, data: e })),
    );
  }

  private async perfilId(sesion: Sesion): Promise<string | null> {
    const where = { cuentaId: sesion.sub };
    if (sesion.rol === Rol.USUARIO) return (await this.db.usuario.findUnique({ where }))?.id ?? null;
    if (sesion.rol === Rol.KIOSCO) return (await this.db.kiosco.findUnique({ where }))?.id ?? null;
    if (sesion.rol === Rol.RIDER) return (await this.db.rider.findUnique({ where }))?.id ?? null;
    return null;
  }

  private leCorresponde(e: Evento, rol: Rol, perfilId: string | null): boolean {
    if (rol === Rol.DEV) return true;
    if (e.tipo === 'oferta') return rol === Rol.RIDER && e.riderId === perfilId;
    if (rol === Rol.USUARIO) return e.pedido.usuarioId === perfilId;
    if (rol === Rol.KIOSCO) return e.pedido.kioscoId === perfilId;
    return e.pedido.riderId === perfilId;
  }
}

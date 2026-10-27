import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { codigoPedido, nombreZona, primerNombre, type OfertaPedido, type Pedido } from '../dominio.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsappService } from './whatsapp.service.js';

/**
 * Plantillas que hay que crear y aprobar en WhatsApp Manager (categoría "Utilidad", idioma es_AR).
 * El texto de referencia de cada una está en deploy/README.md.
 */
export const PLANTILLAS = {
  pedidoNuevo: 'freedeli_pedido_nuevo',
  pedidoAprobado: 'freedeli_pedido_aprobado',
  pedidoRechazado: 'freedeli_pedido_rechazado',
  altaAprobada: 'freedeli_alta_aprobada',
  altaRechazada: 'freedeli_alta_rechazada',
} as const;

const pesos = (n: number) => `$${n.toLocaleString('es-AR')}`;

/** Todos los avisos a los riders salen por WhatsApp. Se mandan sin esperar: no frenan el pedido. */
@Injectable()
export class AvisosRiderService {
  constructor(
    private readonly db: PrismaService,
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  private get urlApp(): string {
    return this.config.get<string>('URL_APP_RIDERS') ?? 'https://riders.freedeli.com.ar';
  }

  /** Busca al rider y le manda la plantilla si tiene los avisos activados. */
  private async avisar(donde: { id: string } | { cuentaId: string }, plantilla: string, parametros: (nombre: string) => string[]): Promise<void> {
    const rider = await this.db.rider.findUnique({ where: donde, select: { nombre: true, telefono: true, notificaciones: true } });
    if (!rider?.notificaciones) return;
    await this.whatsapp.enviar(rider.telefono, plantilla, parametros(primerNombre(rider.nombre)));
  }

  /** Le llegó una oferta: tiene pocos segundos para aceptarla en la app. */
  pedidoNuevo(riderId: string, oferta: OfertaPedido, segundos: number): void {
    void this.avisar({ id: riderId }, PLANTILLAS.pedidoNuevo, () => [oferta.kioscoNombre, nombreZona(oferta.zona), pesos(oferta.gananciaRider), String(segundos), this.urlApp]);
  }

  pedidoAprobado(riderId: string, p: Pedido): void {
    void this.avisar({ id: riderId }, PLANTILLAS.pedidoAprobado, () => [p.kioscoNombre, codigoPedido(p), p.kioscoDireccion]);
  }

  pedidoRechazado(riderId: string, p: Pedido): void {
    void this.avisar({ id: riderId }, PLANTILLAS.pedidoRechazado, () => [codigoPedido(p)]);
  }

  alta(cuentaId: string, aprobada: boolean): void {
    if (aprobada) void this.avisar({ cuentaId }, PLANTILLAS.altaAprobada, (nombre) => [nombre, this.urlApp]);
    else void this.avisar({ cuentaId }, PLANTILLAS.altaRechazada, (nombre) => [nombre]);
  }
}
